# Fiber Swap Demo — 后端部署与运行指南

> 本文档记录了在本地机器上部署 Fiber Swap Demo 后端（LND + FNN/CCH）的完整过程，供后续团队成员参考。
>
> 最后更新：2026-06-04

---

## 一、整体架构

```
┌─────────────────┐      ┌──────────────────┐      ┌─────────────────┐
│   前端 Demo     │      │   FNN + CCH      │      │   LND Testnet   │
│  (React/Vite)   │◄────►│  (Fiber 节点)    │◄────►│ (BTC Lightning) │
│                 │      │  127.0.0.1:8227  │      │ 127.0.0.1:10009 │
└─────────────────┘      └──────────────────┘      └─────────────────┘
                                │
                                ▼
                       CKB Fiber Testnet
```

**各组件职责：**
- **FNN (Fiber Network Node)**：CKB Fiber Network 的节点，负责 CKB 侧的状态通道和支付
- **CCH (Cross-Chain Hub)**：内嵌在 FNN 中的跨链服务，充当 Ingrid 角色，桥接 CKB Fiber ↔ BTC Lightning
- **LND (Lightning Network Daemon)**：Bitcoin Lightning Network 节点，testnet 环境

---

## 二、已部署服务清单

| 服务 | 版本 | 网络 | RPC/端口 | 数据目录 | 状态 |
|------|------|------|----------|----------|------|
| FNN | 0.8.0 | testnet | `127.0.0.1:8227` (RPC), `8228` (P2P) | `~/.fiber-pay` | ✅ 运行中 |
| LND | 0.20.1-beta | testnet | `127.0.0.1:10009` (gRPC), `9735` (P2P) | `~/.lnd` | ✅ 运行中 |
| CCH | (内嵌) | testnet | 通过 FNN RPC 调用 | — | ✅ 运行中 |

---

## 三、LND (Bitcoin Lightning) 部署

### 3.1 安装

从 [Lightning Labs  releases](https://github.com/lightningnetwork/lnd/releases) 下载对应平台的二进制文件，解压到 `~/.local/bin/` 并确保在 `$PATH` 中。

当前安装路径：
```bash
/home/retric/.local/bin/lnd
/home/retric/.local/bin/lncli
```

### 3.2 配置文件

配置文件位置：`~/.lnd/lnd.conf`

```ini
[Application Options]
nolisten=false
listen=0.0.0.0:9735
rpclisten=0.0.0.0:10009
restlisten=0.0.0.0:8080
tlsautorefresh=true
tlsdisableautofill=true
tlsextraip=127.0.0.1

[Bitcoin]
bitcoin.active=true
bitcoin.testnet=true
bitcoin.node=neutrino

[Neutrino]
neutrino.addpeer=66.183.0.205:18333
neutrino.addpeer=204.16.241.8:18333
neutrino.addpeer=65.108.101.79:18333
# ... (完整列表见实际配置文件)
neutrino.maxpeers=10

[fee]
fee.url=https://nodes.lightning.computer/fees/v1/btctestnet-fee-estimates.json

[autopilot]
autopilot.active=true
autopilot.maxchannels=5
autopilot.allocation=0.6
```

> **注意**：`neutrino.addpeer` 中硬编码了 35 个 testnet 节点 IP。这是因为本机网络环境使用 mihomo（Clash Meta）代理，DNS 被劫持到 `198.18.0.0/16` 假 IP，无法通过 DNS seed 正常解析。

### 3.3 启动与停止

**启动：**
```bash
lnd --configfile=/home/retric/.lnd/lnd.conf >> /home/retric/.lnd/lnd.log 2>&1 &
echo $! > /tmp/lnd.pid
```

**停止：**
```bash
kill $(cat /tmp/lnd.pid)
# 或
pkill -f "lnd --configfile"
```

**查看日志：**
```bash
tail -f ~/.lnd/lnd.log
```

### 3.4 钱包操作

**创建钱包（首次）：**
```bash
lncli --network=testnet create
# 按提示输入密码，保存好 24 个助记词 seed
```

**解锁钱包（每次重启后）：**
```bash
lncli --network=testnet unlock
# 输入密码
```

**查看节点信息：**
```bash
lncli --network=testnet getinfo
```

**查看余额：**
```bash
lncli --network=testnet walletbalance
```

**生成收款地址：**
```bash
lncli --network=testnet newaddress p2wkh
```

### 3.5 当前 LND 状态

- **Identity Pubkey**：`03c7796e27b079b25ea5c9f02dbb289ab1720248ecdd25dceed7cd489f2fe6290d`
- **Synced to chain**：`true`
- **Block height**：`~4,968,035`（实时变化）
- **Channels**：1 active（CoinGate 节点）
- **Peers**：3
- **Wallet balance**：`32,311 sats`

### 3.6 开启 Lightning 通道

**连接 peer：**
```bash
lncli --network=testnet connect <node_id>@<ip>:9735
```

**开启通道（示例）：**
```bash
lncli --network=testnet openchannel 03fea840ee807cc68ee2359669d3f00b638ba521a8f269a6ad7e618776af55010f --local_amt=300000
```

**查看通道：**
```bash
lncli --network=testnet listchannels
```

当前已有通道：
- **Peer**：CoinGate (`03fea840...`)
- **Capacity**：300,000 sats
- **Local balance**：299,056 sats
- **Channel point**：`9adaabad50d5c06e6bf3656bf7485ab50705a6318dde9afef9277d3ba02790a9:1`

---

## 四、FNN + CCH (Fiber Network Node) 部署

### 4.1 安装

FNN 通过 `fiber-pay` CLI 管理。安装方式参考 [Fiber 官方文档](https://github.com/nervosnetwork/fiber)。

当前安装路径：
```bash
~/.fiber-pay/bin/fnn
```

### 4.2 配置文件

配置文件位置：`~/.fiber-pay/config.yml`

```yaml
fiber:
  listening_addr: "/ip4/0.0.0.0/tcp/8228"
  bootnode_addrs:
    - "/ip4/54.179.226.154/tcp/8228/p2p/Qmes1EBD4yNo9Ywkfe6eRw9tG1nVNGLDmMud1xJMsoYFKy"
    - "/ip4/16.163.7.105/tcp/8228/p2p/QmdyQWjPtbK4NWWsvy8s69NGJaQULwgeQDT5ZpNDrTNaeV"
  announce_listening_addr: true
  chain: testnet
  scripts:
    # ... (FundingLock / CommitmentLock 配置，见实际文件)

rpc:
  listening_addr: "127.0.0.1:8227"

ckb:
  rpc_url: "https://testnet.ckbapp.dev/"
  udt_whitelist:
    - name: RUSD
      # ... (UDT 合约配置)

services:
  - fiber
  - rpc
  - ckb
  - cch   # ← 跨链服务

cch:
  lnd_rpc_url: "https://127.0.0.1:10009"
  lnd_cert_path: "/home/retric/.lnd/tls.cert"
  lnd_macaroon_path: "/home/retric/.lnd/data/chain/bitcoin/testnet/admin.macaroon"
  order_expiry_delta_seconds: 129600
  btc_final_tlc_expiry_delta_blocks: 360
  ckb_final_tlc_expiry_delta_seconds: 216000
```

### 4.3 启动与停止

**启动：**
```bash
fiber-pay node start --daemon
# 或直接用 fnn
/home/retric/.fiber-pay/bin/fnn -c /home/retric/.fiber-pay/config.yml -d /home/retric/.fiber-pay
```

**停止：**
```bash
fiber-pay node stop
# 或
kill $(cat ~/.fiber-pay/fiber.pid)
```

**查看日志：**
```bash
tail -f ~/.fiber-pay/logs/fnn.log
```

### 4.4 FNN 常用操作

**查看节点信息：**
```bash
curl -X POST http://127.0.0.1:8227 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"node_info","params":[]}'
```

**查看通道：**
```bash
curl -X POST http://127.0.0.1:8227 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"list_channels","params":[]}'
```

### 4.5 当前 FNN 状态

- **版本**：0.8.0
- **网络**：testnet
- **通道**：1 个 open channel，4 个 peers
- **CCH 模块**：已启用并正常运行

---

## 五、CCH 跨链 RPC 调用

CCH 的方法名**不带前缀**，直接通过 FNN 的 JSON-RPC 调用。

### 5.1 查询跨链订单

```bash
curl -X POST http://127.0.0.1:8227 \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0","id":1,
    "method":"get_cch_order",
    "params":[{"payment_hash":"0x..."}]
  }'
```

### 5.2 CKB → BTC (send_btc)

```bash
# 1. LND 生成 BTC invoice
lncli --network=testnet addinvoice --amt=1000

# 2. 调用 CCH send_btc
curl -X POST http://127.0.0.1:8227 \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0","id":1,
    "method":"send_btc",
    "params":{"btc_pay_req":"lntb10u1...","currency":"BTC"}
  }'
```

### 5.3 BTC → CKB (receive_btc)

```bash
# 1. FNN 生成 Fiber invoice
curl -X POST http://127.0.0.1:8227 \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0","id":1,
    "method":"new_invoice",
    "params":{"amount":"100000","description":"test"}
  }'

# 2. 调用 CCH receive_btc
curl -X POST http://127.0.0.1:8227 \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0","id":1,
    "method":"receive_btc",
    "params":{"fiber_pay_req":"fibt100..."}
  }'
```

---

## 六、网络环境处理（mihomo/Clash Meta）

### 6.1 问题描述

本机运行 **mihomo**（Clash Meta）代理，开启 TUN + fake-ip 模式，导致：
1. DNS 被劫持到 `198.18.0.0/16` 假 IP
2. 所有出站流量被导到代理节点
3. 代理节点不支持 Bitcoin P2P 协议，导致 LND neutrino 无法同步

### 6.2 解决方案

**永久修复**：在 mihomo 配置文件的 `rules:` 段添加直连规则：

```yaml
rules:
  - DOMAIN-SUFFIX,argotunnel.com,🚀 Proxy
  - DOMAIN-SUFFIX,trycloudflare.com,🚀 Proxy
  - DST-PORT,18333,DIRECT    # Bitcoin testnet P2P
  - DST-PORT,9735,DIRECT     # Lightning P2P
  - GEOIP,CN,DIRECT
  - MATCH,🚀 Proxy
```

配置文件位置（需要 sudo）：`/etc/mihomo/config.yaml`

**LND 配置配合**：在 `lnd.conf` 的 `[Neutrino]` 段硬编码真实节点 IP（绕过 DNS 劫持）。

---

## 七、常见问题与排查

### Q1: LND 钱包被锁定

现象：`[lncli] wallet is encrypted - please unlock using 'lncli unlock'`

解决：
```bash
lncli --network=testnet unlock
```

### Q2: CCH 调用返回 "Unauthorized"

**原因**：之前错误地使用了带前缀的方法名（如 `cch.get_cch_order`）。

**解决**：使用不带前缀的方法名：`get_cch_order`、`send_btc`、`receive_btc`。

### Q3: macaroon 验证失败（signature mismatch）

**原因**：LND 钱包恢复后，macaroon 文件和数据库不同步。

**解决**：
```bash
# 1. 停止 LND
pkill -f lnd

# 2. 删除旧 macaroon 文件
rm ~/.lnd/data/chain/bitcoin/testnet/*.macaroon
rm ~/.lnd/data/chain/bitcoin/testnet/macaroons.db

# 3. 重启 LND 并解锁
lnd --configfile=~/.lnd/lnd.conf
lncli --network=testnet unlock

# 4. 重启 FNN
fiber-pay node stop
fiber-pay node start --daemon
```

### Q4: LND neutrino 同步缓慢

**正常现象**。Testnet3 累积了近 500 万个区块，neutrino 需要验证所有 compact filter headers。

当前速度约 150 headers/秒，从 0 同步到当前链头（~496 万）约需 3–4 小时。

---

## 八、前端项目

### 8.1 项目结构

```
fiber-swap-demo/
├── src/              # React 源码
├── public/           # 静态资源
├── package.json      # 依赖（含 @fiber-pay/react, @nervosnetwork/fiber-js）
├── vite.config.ts    # Vite 配置
└── BACKEND_SETUP.md  # 本文档
```

### 8.2 启动前端

```bash
cd fiber-swap-demo
npm install
npm run dev
# 默认运行在 http://localhost:5173
```

> **注意**：当前前端所有数据（余额、价格、币种列表）都是写死的 mock 数据，尚未接入后端 API。

---

## 九、下一步验证建议

后端基础设施已全部就绪，建议按以下顺序验证 CCH 跨链功能：

### 步骤 1：验证 `send_btc`（CKB → BTC）

1. 用 LND 生成一个 testnet invoice：`lncli --network=testnet addinvoice --amt=1000`
2. 调用 `send_btc` RPC，传入 invoice
3. 用 `get_cch_order` 查询订单状态，应看到 `Pending → IncomingAccepted → OutgoingInFlight → Success`

### 步骤 2：验证 `receive_btc`（BTC → CKB）

1. 用 FNN 生成一个 Fiber invoice：`new_invoice`
2. 调用 `receive_btc` RPC，传入 Fiber invoice
3. 获取返回的 BTC invoice，用外部 testnet 钱包支付
4. 轮询 `get_cch_order` 确认订单完成

### 步骤 3：前端接入（可选）

如果需要前端展示真实数据，可以：
1. 新建 `backend/` 目录，搭一个 Express/TypeScript 服务
2. 封装 FNN JSON-RPC 调用为 REST API
3. 前端从 mock 数据改为调后端 API

---

## 十、关键文件速查

| 文件/目录 | 说明 |
|-----------|------|
| `~/.lnd/lnd.conf` | LND 配置文件 |
| `~/.lnd/lnd.log` | LND 运行日志 |
| `~/.lnd/create-wallet.log` | 钱包 seed 备份（**敏感，勿泄露**） |
| `~/.lnd/wallet-password.txt` | 钱包密码（**敏感，勿泄露**） |
| `~/.fiber-pay/config.yml` | FNN 配置文件 |
| `~/.fiber-pay/logs/` | FNN 日志目录 |
| `/etc/mihomo/config.yaml` | mihomo 代理配置（如需修改网络规则） |

---

## 十一、资源占用参考

| 服务 | 磁盘占用 | 内存占用 | 备注 |
|------|----------|----------|------|
| LND (neutrino) | ~1.1 GB | ~200–400 MB | 轻节点，无需全量区块 |
| FNN | ~800 MB | ~100–200 MB | 状态通道节点 |
| 总计 | ~2 GB | ~300–600 MB | — |

系统磁盘 `/` 总量 232 GB，当前已用约 60 GB（28%），空间充裕。
