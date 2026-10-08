#!/usr/bin/env bash
# LND peer auto-reconnect watchdog (FiberSwap lnd-hub <-> CCH peer).
#
# Every INTERVAL seconds: checks that ONE peer is connected and ONE channel is
# active. If the peer is missing from `listpeers`, runs `lncli connect` for it.
#
# It only ever calls read RPCs (listpeers, listchannels) plus `connect` for the
# configured peer. It never disconnects, closes channels, updates channel
# policy, or restarts lnd.
#
# Usage: lnd-peer-watchdog.sh [ENV_FILE]
#   ENV_FILE (optional) is sourced first; see watchdog.env.example.
#
# Configuration (env vars; defaults are the values deployed on bear):
#   PEER_URI        <pubkey>@<host>:<port> of the peer to keep connected
#   CHANNEL_POINT   <funding_txid>:<output_index> of the channel to watch
#   LND_DIR         lnd data dir passed as --lnddir
#   NETWORK         lnd network (testnet|mainnet|...)
#   RPCSERVER       lnd gRPC host:port
#   LNCLI           absolute path to lncli
#   JQ              absolute path to jq
#   INTERVAL        seconds between checks (default 60, never below 30)
#   LOG_FILE        log path (rotated to LOG_FILE.1 at MAX_LOG_BYTES)
#   MAX_LOG_BYTES   rotation threshold (default 1 MiB)
#   DRY_RUN=1       log the connect command instead of running it
#   ONESHOT=1       run a single check and exit (testing)
#   FAKE_PEER_MISSING=1  pretend the peer is absent to exercise the reconnect
#                        branch without disconnecting anything (testing)
set -u
export PATH=/usr/local/bin:/usr/bin:/bin:${PATH:-}

if [ "$#" -ge 1 ] && [ -n "$1" ]; then
  if [ ! -r "$1" ]; then echo "env file not readable: $1" >&2; exit 2; fi
  set -a
  # shellcheck disable=SC1090
  . "$1"
  set +a
fi

PEER_URI="${PEER_URI:-027431fbdbbc67df1ed0cf30568fe8ab04ef2fbff296ebcc0c826dc01e923799f5@16.162.99.28:8973}"
CHANNEL_POINT="${CHANNEL_POINT:-70fdfd0dd7960b1b7ca1f562ae031b3a37925fa957eb97c97536f82ed5f37c35:1}"
LND_DIR="${LND_DIR:-/home/retric/.lnd}"
NETWORK="${NETWORK:-testnet}"
RPCSERVER="${RPCSERVER:-127.0.0.1:10009}"
LNCLI="${LNCLI:-/home/retric/.local/bin/lncli}"
JQ="${JQ:-/usr/bin/jq}"
LOG_FILE="${LOG_FILE:-${WATCHDOG_LOG:-/home/retric/lnd-watchdog/watchdog.log}}"
MAX_LOG_BYTES="${MAX_LOG_BYTES:-1048576}"
INTERVAL="${INTERVAL:-60}"
DRY_RUN="${DRY_RUN:-0}"
ONESHOT="${ONESHOT:-0}"
FAKE_PEER_MISSING="${FAKE_PEER_MISSING:-0}"

die() { echo "lnd-peer-watchdog: $*" >&2; exit 2; }
[[ "$PEER_URI" =~ ^(0[23][0-9a-fA-F]{64})@[^[:space:]]+:[0-9]+$ ]] || die "PEER_URI must be <33-byte hex pubkey>@<host>:<port>"
PEER_PUB="${BASH_REMATCH[1]}"
[[ "$CHANNEL_POINT" =~ ^[0-9a-fA-F]{64}:[0-9]+$ ]] || die "CHANNEL_POINT must be <txid>:<index>"
[[ "$INTERVAL" =~ ^[0-9]+$ ]] || die "INTERVAL must be an integer"
[[ "$MAX_LOG_BYTES" =~ ^[0-9]+$ ]] || die "MAX_LOG_BYTES must be an integer"
[ "$INTERVAL" -lt 30 ] && INTERVAL=30
[ -x "$LNCLI" ] || die "LNCLI not executable: $LNCLI"
[ -x "$JQ" ] || die "JQ not executable: $JQ"
mkdir -p "$(dirname "$LOG_FILE")"

log() {
  if [ -f "$LOG_FILE" ] && [ "$(stat -c %s "$LOG_FILE" 2>/dev/null || echo 0)" -ge "$MAX_LOG_BYTES" ]; then
    mv -f "$LOG_FILE" "$LOG_FILE.1"
  fi
  printf '%s %s\n' "$(date '+%Y-%m-%dT%H:%M:%S%z')" "$*" | tee -a "$LOG_FILE"
}

lncli() { timeout 20 "$LNCLI" --lnddir="$LND_DIR" --network="$NETWORK" --rpcserver="$RPCSERVER" "$@"; }

# Prints one of: OK | PEER_MISSING | CHAN_INACTIVE | CHAN_MISSING | LND_UNREACHABLE
# shellcheck disable=SC2016  # $p / $cp below are jq variables, not shell
check_state() {
  local peers chans peer_ok active
  if ! peers=$(lncli listpeers 2>&1); then echo "LND_UNREACHABLE"; return; fi
  peer_ok=$(printf '%s' "$peers" | "$JQ" -r --arg p "$PEER_PUB" '[.peers[] | select(.pub_key==$p)] | length' 2>/dev/null)
  [ "$FAKE_PEER_MISSING" = "1" ] && peer_ok=0
  if [ "${peer_ok:-0}" = "0" ]; then echo "PEER_MISSING"; return; fi
  if ! chans=$(lncli listchannels --peer "$PEER_PUB" 2>&1); then echo "LND_UNREACHABLE"; return; fi
  active=$(printf '%s' "$chans" | "$JQ" -r --arg cp "$CHANNEL_POINT" \
    '[.channels[] | select(.channel_point==$cp)] | if length==0 then "missing" else (.[0].active|tostring) end' 2>/dev/null)
  case "$active" in
    true) echo "OK" ;;
    missing) echo "CHAN_MISSING" ;;
    *) echo "CHAN_INACTIVE" ;;
  esac
}

try_connect() {
  if [ "$DRY_RUN" = "1" ]; then
    log "DRY_RUN would run: timeout 20 lncli connect --perm=false --timeout 15s $PEER_URI"
    return 0
  fi
  local out rc
  out=$(lncli connect --perm=false --timeout 15s "$PEER_URI" 2>&1); rc=$?
  out=$(printf '%s' "$out" | tr -s '\n ' ' ')
  if [ "$rc" -eq 0 ] || printf '%s' "$out" | grep -qi 'already connected'; then
    log "connect ok (rc=$rc): $out"
  else
    log "connect FAILED (rc=$rc): $out"
  fi
}

prev=""
log "watchdog start pid=$$ interval=${INTERVAL}s peer=$PEER_URI chan=$CHANNEL_POINT rpc=$RPCSERVER dry_run=$DRY_RUN fake_missing=$FAKE_PEER_MISSING"
trap 'log "watchdog stop (signal)"; exit 0' TERM INT
while :; do
  state=$(check_state)
  if [ "$state" != "$prev" ]; then
    log "state ${prev:-<startup>} -> $state"
    prev="$state"
  fi
  # Only PEER_MISSING triggers a connect. With the peer connected but the
  # channel inactive, `connect` is a no-op ("already connected") and forcing a
  # re-establish would require a disconnect, which this watchdog never does.
  if [ "$state" = "PEER_MISSING" ]; then
    log "peer missing -> reconnect attempt"
    try_connect
  fi
  [ "$ONESHOT" = "1" ] && break
  sleep "$INTERVAL" & wait $!
done
