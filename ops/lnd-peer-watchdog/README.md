# LND peer auto-reconnect watchdog

A small bash loop that keeps **lnd-hub** (the CCH payer LND) connected to the
FiberSwap peer so its channel doesn't sit inactive after a network flap.

## Why

On bear, outbound LN traffic goes through mihomo (TUN). When the proxy or the
link flaps, lnd-hub's connection to the FiberSwap peer
(`027431fb…@16.162.99.28:8973`) can drop on ping/pong timeouts. lnd retries
persistent peers itself, but its reconnect backoff grows quickly. Until the
peer is back, channel `70fdfd0d…7c35:1` stays `active=false` and CCH payments
over it fail. This watchdog re-dials the peer within about a minute.

## What it does

Every `INTERVAL` seconds (default 60, never less than 30) it runs
`lncli listpeers` and `lncli listchannels --peer <pubkey>` and reports one of
these states:

| State | Meaning | Action |
|---|---|---|
| `OK` | peer connected, channel active | none |
| `PEER_MISSING` | peer not in `listpeers` | `timeout 20 lncli connect --perm=false --timeout 15s <PEER_URI>` ("already connected" counts as success) |
| `CHAN_INACTIVE` | peer connected, channel inactive | log only (`connect` would be a no-op) |
| `CHAN_MISSING` | channel point not found for that peer | log only |
| `LND_UNREACHABLE` | lncli failed (lnd down or locked) | log only |

The log (`LOG_FILE`) only gets a line at start/stop, when the state changes,
and for each reconnect attempt and its result. It rotates to `LOG_FILE.1` at
`MAX_LOG_BYTES` (1 MiB).

## What it never does

- never runs `disconnect`, `closechannel`, `updatechanpolicy`, or any other write RPC besides `connect` for the one configured peer
- never restarts or unlocks lnd
- never reads or prints macaroons or other secrets (lncli finds them in `LND_DIR` itself)

## Configuration

All settings are env vars. The defaults in the script match bear (see
`watchdog.env.example`): `PEER_URI`, `CHANNEL_POINT`, `LND_DIR`, `NETWORK`,
`RPCSERVER`, `LNCLI`, `JQ`, `INTERVAL`, `LOG_FILE`, `MAX_LOG_BYTES`, `DRY_RUN`.
An env file can also be passed as the first argument:
`lnd-peer-watchdog.sh /path/to/watchdog.env`.

Requires `bash`, `jq`, and coreutils `timeout`/`stat`.

## Install (PM2)

```bash
mkdir -p ~/lnd-watchdog
cp ops/lnd-peer-watchdog/lnd-peer-watchdog.sh ~/lnd-watchdog/
# either plain pm2 start (uses the script's defaults / your env):
pm2 start ~/lnd-watchdog/lnd-peer-watchdog.sh --name lnd-peer-watchdog --interpreter bash --cwd ~/lnd-watchdog
# or via the example ecosystem file:
#   cp ops/lnd-peer-watchdog/ecosystem.config.example.cjs ~/lnd-watchdog/ecosystem.config.cjs
#   pm2 start ~/lnd-watchdog/ecosystem.config.cjs
pm2 save
```

## Test without touching the real peer

```bash
# one check against the real node, real state:
ONESHOT=1 LOG_FILE=/tmp/wd-test.log ./lnd-peer-watchdog.sh
# exercise the reconnect branch without running connect:
ONESHOT=1 FAKE_PEER_MISSING=1 DRY_RUN=1 LOG_FILE=/tmp/wd-test.log ./lnd-peer-watchdog.sh
```

## Stop / remove

```bash
pm2 stop lnd-peer-watchdog                    # pause
pm2 delete lnd-peer-watchdog && pm2 save      # remove permanently
```
