# Handoff Notes

This file is for the next agent or operator taking over the hosted demo on `bear`.

## First Read

- Product and protocol overview: [`README.md`](../README.md)
- Hosted frontend: <https://fiber-swap.retric.uk>
- Hosted API: <https://fiber-swap-api.retric.uk>
- Bear repo path: `/home/retric/fiber-swap-demo`
- Current PR branch during this handoff: `upgrade-fiber-js-0.9.0-rc5`
- Current PR: <https://github.com/humble-little-bear/fiber-swap-demo/pull/15>

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
| `fnn` | Main Fiber/FNN CCH actor | Started through `/tmp/start-fnn.sh`; data dir `/home/retric/.fiber-pay`; RPC `127.0.0.1:8227`. |

Useful PM2 commands:

```bash
/home/retric/.npm-global/bin/pm2 status
/home/retric/.npm-global/bin/pm2 logs fiber-swap-demo-backend --lines 200
/home/retric/.npm-global/bin/pm2 logs fiber-swap-demo-frontend --lines 200
/home/retric/.npm-global/bin/pm2 logs fnn --lines 200
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
| CCH payer LND | Spends BTC liquidity for the FNN CCH actor | `/home/retric/.lnd` | REST `8080`, gRPC `10009` |
| Receiver LND | Generates and receives demo BTC invoices | `/home/retric/.lnd-receiver` | REST `18081`, gRPC `10010` |

Important distinction:

- `POST /api/btc-invoice` talks to the receiver LND.
- FNN/CCH settlement pays that invoice through the CCH payer LND.
- This keeps the demo end-to-end: cWBTC comes from the user/browser side, BTC arrives at a separate receiver LND.

Main Fiber/FNN node:

- Data dir: `/home/retric/.fiber-pay`
- FNN RPC: `http://127.0.0.1:8227`
- Runtime proxy: `127.0.0.1:8229`
- Public browser-node routing uses Bottle as trampoline.

Auxiliary processes have been observed:

- `cch-direct-payer` profile under `/home/retric/.fiber-pay/profiles/cch-direct-payer`, RPC `127.0.0.1:8327`.
- temporary test nodes under `/home/retric/multica_workspaces/.../.test-nodes/...`, with ports in the `87xx`/`88xx` range.

These auxiliary processes are not the public demo path unless configuration points to them. Verify before stopping them.

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
- FNN `fnn` PM2 logs
- CCH payer LND has a usable BTC testnet channel
- receiver LND invoice has not expired

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
- Do not use raw cWBTC units in user-facing text.
- Do not restart backend with `--update-env` unless the private env is loaded.
- Do not assume transient `multica_workspaces` test nodes are part of the public demo.
- Do not commit `.env`, macaroon files, TLS certs, private keys, local node data, or `.claude/`.
