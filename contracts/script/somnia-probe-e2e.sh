#!/usr/bin/env bash
# Somnia testnet end-to-end integration runner (Step 2 + Step 3).
#
#   contract (SomniaProbe) --createRequest--> Somnia platform --validators--> keeper-proxy
#       --> TE --> {value} --handleResponse callback--> stored on-chain
#
# Live-testnet integration test (NOT a forge unit test): the callback is async, executed
# off-chain by validators after consensus. We invoke, then poll on-chain state with a hard
# timeout and an explicit FAIL branch, and assert the stored value == the value the proxy
# returns RIGHT NOW (self-calibrated — TE revises, so never hardcode).
#
# Prereqs (all verified by this script before spending):
#   - Vercel Deployment Protection OFF (proxy returns 200 JSON, not an SSO page)   [DONE]
#   - contracts/.env has SOMNIA_TESTNET_PK + SOMNIA_TESTNET_ADDRESS                 [DONE]
#   - that address funded with STT from the faucet                                  [<-- gating step]
#
# Usage:  bash script/somnia-probe-e2e.sh [route] [mode]
#   route : keeper-proxy path (default: te/colombia/inflation — live now)
#   mode  : uint | string | both   (default: both — resolves the fetchUint-vs-fetchString question)
set -euo pipefail

ROUTE="${1:-te/colombia/inflation}"
MODE="${2:-both}"

PROXY_BASE="https://keeper-eta-pied.vercel.app"
RPC="https://api.infra.testnet.somnia.network"
PLATFORM="0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776"
TIMEOUT_S=120
POLL_S=3

cd "$(dirname "$0")/.."
set -a; . ./.env; set +a
: "${SOMNIA_TESTNET_PK:?missing in contracts/.env}"
: "${SOMNIA_TESTNET_ADDRESS:?missing in contracts/.env}"
PK="$SOMNIA_TESTNET_PK"; ADDR="$SOMNIA_TESTNET_ADDRESS"
URL="$PROXY_BASE/$ROUTE"

echo "== Step 0: gate (proxy public + self-calibrate expected) =="
PROXY_JSON=$(curl -fsS --max-time 20 "$URL") || { echo "FAIL: proxy not reachable / not public at $URL"; exit 1; }
echo "  proxy: $PROXY_JSON"
EXPECTED=$(printf '%s' "$PROXY_JSON" | grep -oE '"value":"-?[0-9]+"' | grep -oE -- '-?[0-9]+')
[ -n "$EXPECTED" ] || { echo "FAIL: could not parse {value} from proxy"; exit 1; }
echo "  expected value (live): $EXPECTED"

echo "== Step 0b: deployer balance vs deposit =="
# PRICE_TERM_WEI = p_i * subSize. Default is the JSON-FETCH class (0.03 * 3 = 0.09 STT) —
# SomniaProbe ONLY calls the json-fetch agent. A multi-class consumer (llm-inference 0.07,
# llm-parse-website 0.10) MUST override this from the price table, else perAgentBudget may be
# under the class floor and the request TimesOut (the regression this whole fix kills).
PRICE_TERM_WEI="${PRICE_TERM_WEI:-90000000000000000}"
FLOOR=$(cast call "$PLATFORM" "getRequestDeposit()(uint256)" --rpc-url "$RPC")
FLOOR=${FLOOR%% *}                        # strip any trailing unit annotation (e.g. "[3e16]")
DEPOSIT=$(( FLOOR + PRICE_TERM_WEI ))
BAL=$(cast balance "$ADDR" --rpc-url "$RPC")
NEED=$(( DEPOSIT * 2 ))                    # uint + string
echo "  floor=$FLOOR  deposit/call=$DEPOSIT  need=$NEED  balance=$BAL (wei)"
# Exact integer comparison (these fit in 64-bit; sort -g loses precision at 18 digits).
if [ "$BAL" -lt "$NEED" ]; then
  echo "FAIL: insufficient STT. Fund $ADDR at https://testnet.somnia.network/ (need >= $NEED wei)."
  exit 1
fi

echo "== Step 1: deploy SomniaProbe =="
if [ -z "${CONSUMER:-}" ]; then
  CREATE=$(forge create src/SomniaProbe.sol:SomniaProbe --rpc-url "$RPC" --private-key "$PK" \
             --broadcast --constructor-args "$PLATFORM" 2>&1)
  CONSUMER=$(printf '%s' "$CREATE" | grep -oE 'Deployed to: 0x[0-9a-fA-F]{40}' | grep -oE '0x[0-9a-fA-F]{40}')
  [ -n "$CONSUMER" ] || { echo "FAIL: deploy did not return an address: $CREATE"; exit 1; }
fi
echo "  CONSUMER=$CONSUMER"

# Success signal = the request's OWN success event since the block captured before the send
# (ProbeUintReceived / ProbeStringReceived), mirroring the ProbeFailed branch. Event identity
# is collision-free — no shared scalar (latestUint==0 or a tied lastUpdatedAt second) can
# mis-report. One request is in flight per leg, and each leg re-captures `fromblk`, so the
# first matching event in the window is this request's.
observe() { # $1=mode  $2=from_block
  local mode="$1" fromblk="$2" start deadline now sig
  [ "$mode" = uint ] && sig="ProbeUintReceived(uint256,uint256)" || sig="ProbeStringReceived(uint256,string)"
  start=$(date +%s); deadline=$(( start + TIMEOUT_S ))
  while :; do
    now=$(date +%s)
    if cast logs --rpc-url "$RPC" --address "$CONSUMER" "$sig" --from-block "$fromblk" 2>/dev/null | grep -q .; then
      if [ "$mode" = uint ]; then
        # `|| true`: success is already confirmed by the event; a transient RPC error on this
        # value read must not abort the script under `set -e` (degrades to ASSERT FAIL, not crash).
        local v; v=$(cast call "$CONSUMER" "latestUint()(uint256)" --rpc-url "$RPC" || true); v=${v%% *}
        echo "  SUCCESS uint=$v"
        [ "$v" = "$EXPECTED" ] && { echo "  ASSERT PASS (== $EXPECTED)"; return 0; } \
                               || { echo "  ASSERT FAIL (got '$v', expected $EXPECTED)"; return 1; }
      else
        local s; s=$(cast call "$CONSUMER" "latestString()(string)" --rpc-url "$RPC" || true)
        echo "  SUCCESS string=$s"; return 0
      fi
    fi
    if cast logs --rpc-url "$RPC" --address "$CONSUMER" "ProbeFailed(uint256,uint8)" \
         --from-block "$fromblk" 2>/dev/null | grep -q .; then
      echo "  FAIL: ProbeFailed emitted (validators returned Failed/TimedOut)"; return 1
    fi
    [ "$now" -ge "$deadline" ] && { echo "  FAIL: timeout ${TIMEOUT_S}s with no callback"; return 1; }
    sleep "$POLL_S"
  done
}

run() { # $1=fn $2=mode
  echo "== Step 2/3: invoke $1 + observe ($2) =="
  local fromblk
  fromblk=$(cast block-number --rpc-url "$RPC")   # capture BEFORE the send so no event is skipped
  # NB: a revert of the cast send itself (RPC/nonce) also returns non-zero here; for the
  # non-gating string leg that is reported the same as a failed callback (acceptable — fallback).
  cast send "$CONSUMER" "$1(string)" "$URL" --value "$DEPOSIT" \
    --private-key "$PK" --rpc-url "$RPC" >/dev/null
  observe "$2" "$fromblk"
}

RC=0
case "$MODE" in
  uint)   run requestUint uint   || RC=1 ;;
  string) run requestString string || RC=1 ;;
  both)   # uint is the primary assertion; string is the fallback probe (reported, not gating)
          run requestUint uint || RC=1
          if run requestString string; then echo "  string-leg: OK"; else echo "  string-leg: FAILED (fallback probe — non-gating)"; fi ;;
  *) echo "unknown mode: $MODE"; exit 2 ;;
esac
echo "== done (consumer=$CONSUMER, route=$ROUTE, rc=$RC) =="
exit $RC
