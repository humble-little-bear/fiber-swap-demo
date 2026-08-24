# Handoff Notes

This file is for the next agent or operator taking over the hosted demo on `bear`.

## First Read

- Product and protocol overview: [`README.md`](../README.md)
- DevRel/forum draft: [`nervos-talks-cch-demo.md`](./nervos-talks-cch-demo.md)
- Hosted frontend: <https://fiber-swap.retric.uk>
- Hosted API: <https://fiber-swap-api.retric.uk>
- Bear repo path: `/home/retric/fiber-swap-demo`
- Current branch on bear: `main`
- Last verified on bear: 2026-07-14 UTC

## Secret Handling

Do not print, paste, commit, or summarize secrets.

- Do not run `cat backend/.env`, `cat .env`, `pm2 env`, or broad `printenv` commands in chat.
- `FAUCET_PRIVATE_KEY` controls funded cWBTC faucet cells.
- LND macaroon files are auth tokens.
- `.env` files are gitignored and should stay out of the repo.
- If PM2 env must be changed, load values from a private file on the server and avoid echoing them.

Safe to document: service names, ports, paths, public URLs, non-secret env variable names.

## Bear Service Map

PM2-managed services observed on bear:

| PM2 name | Role | Notes |
| --- | --- | --- |
| `fiber-swap-demo-frontend` | Serves the built React app | Public site is proxied to this service. Observed local port: `4174`. |
| `fiber-swap-demo-backend` | Express API | Public API is proxied to this service. Observed local port: `3002`. |
| `fnn` | Main Fiber/FNN CCH actor | Started through `fiber-pay node start --quiet-fnn`; data dir `/home/retric/.fiber-pay`; RPC `127.0.0.1:8227`. |
| `lnd-hub` | CCH payer LND | Started as `/home/retric/.local/bin/lnd --lnddir=/home/retric/.lnd`. PM2 starts the process, but the wallet still needs unlock after restart. |
| `lnd-receiver` | Demo receiver LND | Started as `/home/retric/.local/bin/lnd --lnddir=/home/retric/.lnd-receiver`. PM2 starts the process, but the wallet still needs unlock after restart. |

Useful PM2 commands:

```bash
/home/retric/.npm-global/bin/pm2 status
/home/retric/.npm-global/bin/pm2 logs fiber-swap-demo-backend --lines 200
/home/retric/.npm-global/bin/pm2 logs fiber-swap-demo-frontend --lines 200
/home/retric/.npm-global/bin/pm2 logs fnn --lines 200
/home/retric/.npm-global/bin/pm2 logs lnd-hub --lines 200
/home/retric/.npm-global/bin/pm2 logs lnd-receiver --lines 200
```

PM2 is managed by systemd through `pm2-retric.service`. After adding or changing a PM2 service, run:

```bash
/home/retric/.npm-global/bin/pm2 save
systemctl status pm2-retric --no-pager
```

There is also a persistent tmux session named `ai`:

```bash
tmux list-sessions
tmux capture-pane -t ai -p -S -200
```

## LND and Fiber Nodes

The demo uses two LND nodes:

| Node | Purpose | Path | Observed ports |
| --- | --- | --- | --- |
| CCH payer LND | Spends BTC liquidity for the FNN CCH actor | `/home/retric/.lnd` | REST `8080`, gRPC `10009`, p2p `9735` |
| Receiver LND | Generates and receives demo BTC invoices | `/home/retric/.lnd-receiver` | REST `18081`, gRPC `10010`, p2p `9736` |

Important distinction:

- `POST /api/btc-invoice` talks to the receiver LND.
- FNN/CCH settlement pays that invoice through the CCH payer LND.
- This keeps the demo end-to-end: cWBTC comes from the user/browser side, BTC arrives at a separate receiver LND.

Main Fiber/FNN node:

- Data dir: `/home/retric/.fiber-pay`
- FNN RPC: `http://127.0.0.1:8227`
- Runtime proxy: `127.0.0.1:8229`
- Node id: `02ccc308fe1869eb0c5e4055ea05afe1d73a6d951d46895c911ccdf9a28e7fd5ac`
- Public browser-node routing uses Bottle as trampoline.
- CCH config lives in `/home/retric/.fiber-pay/config.yml`.
- CCH talks to the payer LND at `https://127.0.0.1:10009`.
- FNN does not have a separate wallet unlock password in this deployment. It is started through `fiber-pay`, and its key material is stored under `/home/retric/.fiber-pay/fiber/sk` and `/home/retric/.fiber-pay/ckb/key`. Do not print those files.

Auxiliary processes have been observed:

- `cch-direct-payer` profile under `/home/retric/.fiber-pay/profiles/cch-direct-payer`, RPC `127.0.0.1:8327`.
- temporary test nodes under `/home/retric/multica_workspaces/.../.test-nodes/...`, with ports in the `87xx`/`88xx` range.

These auxiliary processes are not the public demo path unless configuration points to them. Verify before stopping them.

## Restart and Recovery Runbook

PM2 can restart processes, but it cannot unlock LND wallets. After a reboot or LND restart:

```bash
/home/retric/.npm-global/bin/pm2 status
```

There is no FNN unlock step. If `fnn` is online but unhealthy, inspect `fiber-pay node status --json`, `/home/retric/.fiber-pay/config.yml`, and PM2 logs; do not look for an FNN wallet password.

Unlock the CCH payer LND:

```bash
/home/retric/.local/bin/lncli \
  --lnddir=/home/retric/.lnd \
  --network=testnet \
  unlock --stdin < /home/retric/.lnd/wallet-password.txt
```

Unlock the receiver LND:

```bash
/home/retric/.local/bin/lncli \
  --rpcserver=127.0.0.1:10010 \
  --tlscertpath=/home/retric/.lnd-receiver/tls.cert \
  --macaroonpath=/home/retric/.lnd-receiver/data/chain/bitcoin/testnet/admin.macaroon \
  --network=testnet \
  unlock --stdin < /home/retric/.lnd-receiver/wallet-password.txt
```

Then verify:

```bash
/home/retric/.local/bin/lncli --lnddir=/home/retric/.lnd --network=testnet getinfo

/home/retric/.local/bin/lncli \
  --rpcserver=127.0.0.1:10010 \
  --tlscertpath=/home/retric/.lnd-receiver/tls.cert \
  --macaroonpath=/home/retric/.lnd-receiver/data/chain/bitcoin/testnet/admin.macaroon \
  --network=testnet \
  getinfo

/home/retric/.npm-global/bin/fiber-pay node status --json
curl -sS http://127.0.0.1:3002/api/health
curl -sS -X POST http://127.0.0.1:3002/api/btc-invoice
```

If `lncli getinfo` says `waiting to start`, wait for LND logs to show `Waiting for wallet encryption password`, then run the unlock command again.

## Routing and Liquidity

Bottle is the public Fiber trampoline used by the hosted demo:

```text
02b6d4e3ab86a2ca2fad6fae0ecb2e1e559e0b911939872a90abdda6d20302be71
```

The backend FNN has a cWBTC channel to Bottle:

```text
0xf494dd93a70a947ba07bf678c69572563501ce93d4a67c9cfb7cb6a5c5ae9459
```

Check it:

```bash
/home/retric/.npm-global/bin/fiber-pay channel get \
  0xf494dd93a70a947ba07bf678c69572563501ce93d4a67c9cfb7cb6a5c5ae9459 \
  --json
```

For public multi-hop payments into the backend FNN, the Bottle side must have cWBTC balance on this channel. If all balance is local to the backend, users can see route-finding failures. Rebalance by keysend from the backend FNN to Bottle:

```bash
# 1 cWBTC = 100000000 raw units
/home/retric/.npm-global/bin/fiber-pay payment send \
  --to 02b6d4e3ab86a2ca2fad6fae0ecb2e1e559e0b911939872a90abdda6d20302be71 \
  --amount 100000000 \
  --udt-name cWBTC \
  --wait \
  --timeout 180 \
  --json
```

Browser-side payments still require the browser Fiber node to have its own outbound cWBTC channel liquidity, usually via Bottle.

## Deployment Commands

Frontend:

```bash
cd /home/retric/fiber-swap-demo
npm run build
/home/retric/.npm-global/bin/pm2 restart fiber-swap-demo-frontend
```

Backend code-only restart:

```bash
cd /home/retric/fiber-swap-demo/backend
npm run build
/home/retric/.npm-global/bin/pm2 restart fiber-swap-demo-backend
```

Backend env update:

```bash
cd /home/retric/fiber-swap-demo/backend
set -a
. /path/to/private/backend.env
set +a
/home/retric/.npm-global/bin/pm2 restart fiber-swap-demo-backend --update-env
```

Use the env-update flow only when you intentionally change env vars. For code-only deploys, prefer plain `pm2 restart` so existing secret env is not accidentally dropped.

## Backend Env Vars

Expected variables or defaults:

| Variable | Purpose |
| --- | --- |
| `PORT` | Backend port. Hosted demo uses `3002`. |
| `FNN_RPC_URL` | Main FNN RPC. Hosted demo uses `http://127.0.0.1:8227`. |
| `LND_REST_URL` | Receiver LND REST. Hosted demo uses `https://127.0.0.1:18081`. |
| `LND_MACAROON_PATH` | Receiver LND invoice macaroon path. |
| `LND_TLS_CERT_PATH` | Receiver LND TLS cert path. |
| `CORS_ORIGIN` | Comma-separated frontend origins. |
| `BTC_INVOICE_AMOUNT_SATS` | Amount used by generated demo BTC invoices. |
| `FAUCET_PRIVATE_KEY` | Enables the cWBTC faucet. Secret. |
| `CKB_RPC_URL` | CKB testnet RPC for faucet transactions. |
| `FAUCET_CLAIM_AMOUNT` | Raw cWBTC amount per claim. UI displays decimal cWBTC. |
| `FAUCET_COOLDOWN_SECONDS` | In-memory per-address faucet cooldown. |
| `CCH_BASE_FEE_SATS` | Quote base fee. Must match the FNN `cch.base_fee_sats`. Hosted demo uses `100`. |
| `CCH_FEE_RATE_PER_MILLION_SATS` | Quote proportional fee. Must match the FNN `cch.fee_rate_per_million_sats`. Hosted demo uses `3000`. |

### CCH fee config (FNN side)

`/home/retric/.fiber-pay/config.yml` must set explicit CCH fees under `cch:`:

```yaml
cch:
  base_fee_sats: 100
  fee_rate_per_million_sats: 3000
  max_outgoing_fee_percentage: 80
```

Without a base fee, small orders collect ~0 fee and CCH passes
`fee_limit_sat=0` to LND, which only allows zero-fee routes — any payee
behind a routed Lightning hop then fails (fiber-swap-demo#17, upstream
nervosnetwork/fiber#1593). The values above match fnn v0.9.0 stable defaults.
The backend quote env vars above must match, or the UI quote disagrees with
the Fiber invoice FNN actually issues.

## Smoke Tests

API health:

```bash
curl -sS https://fiber-swap-api.retric.uk/api/health
curl -sS https://fiber-swap-api.retric.uk/api/node-info
curl -sS https://fiber-swap-api.retric.uk/api/faucet/info
```

Generate a receiver-LND invoice:

```bash
curl -sS -X POST https://fiber-swap-api.retric.uk/api/btc-invoice
```

End-to-end UI test:

1. Open <https://fiber-swap.retric.uk>.
2. Generate a BTC invoice or paste an `lntb...` invoice.
3. Create the CCH order.
4. Pay the returned Fiber invoice with the browser Fiber node.
5. Confirm the order reaches `Success`.

If payment routing fails, check:

- browser node is connected and has cWBTC channel liquidity
- Bottle trampoline is reachable
- backend FNN has inbound cWBTC liquidity from Bottle
- FNN `fnn` PM2 logs
- CCH payer LND wallet is unlocked
- CCH payer LND has a usable BTC testnet channel
- receiver LND wallet is unlocked
- receiver LND invoice has not expired

CLI end-to-end test with the temporary payer profile:

```bash
/home/retric/.npm-global/bin/fiber-pay --profile cch-direct-payer node start \
  --daemon \
  --runtime-proxy-listen 127.0.0.1:8329 \
  --json

# Create a BTC invoice through the backend, create a CCH order, then pay the
# returned Fiber invoice from the temporary payer with --udt-name cWBTC.

/home/retric/.npm-global/bin/fiber-pay --profile cch-direct-payer node stop --json
```

## Faucet Operations

The faucet is a demo faucet, not a production-grade distribution service.

- User-facing amount is decimal cWBTC, for example `50 cWBTC`.
- Backend config stores `FAUCET_CLAIM_AMOUNT` as raw xUDT units.
- Same-address claims are guarded by an in-memory cooldown and in-flight set.
- Actual faucet transactions are serialized through a process-local queue.
- If the backend is scaled to multiple processes or hosts, move cooldown/in-flight state to Redis or a database.
- For higher volume, split cWBTC across multiple cells or use a worker queue.

## cWBTC Reference

Type script:

```json
{
  "code_hash": "0x25c29dc317811a6f6f3985a7a9ebc4838bd388d19d0feeecf0bcd60f6c0975bb",
  "hash_type": "type",
  "args": "0x9a1086531ed6dc69e0bd44cef5278e03faf3015b31aff60b08fb87663ce8507100000000"
}
```

Cell dep:

```json
{
  "out_point": {
    "tx_hash": "0xbf6fb538763efec2a70a6a3dcb7242787087e1030c4e7d86585bc63a9d337f5f",
    "index": "0x0"
  },
  "dep_type": "code"
}
```

Decimals: `8`.

## Known Footguns

- Do not confuse receiver LND with CCH payer LND.
- PM2 restarts LND processes, but it does not unlock LND wallets.
- Always run `pm2 save` after adding `fnn`, `lnd-hub`, `lnd-receiver`, or changing their PM2 launch commands.
- The CCH payer LND currently listens on `0.0.0.0` for gRPC/REST in `lnd.conf`; for a harder deployment, restrict RPC/REST to `127.0.0.1` and leave only p2p reachable as needed.
- Do not use raw cWBTC units in user-facing text.
- Do not restart backend with `--update-env` unless the private env is loaded.
- Do not assume transient `multica_workspaces` test nodes are part of the public demo.
- Do not commit `.env`, macaroon files, TLS certs, private keys, local node data, or `.claude/`.
