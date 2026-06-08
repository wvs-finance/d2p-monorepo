#!/usr/bin/env bash
# MacroHedgeStrategist Somnia-testnet PHASE-17 live deploy + school-leg liveness probe runner.
#
#   FREE surface gate (chain-id 50312 + platform code + v1 reachable) BEFORE any STT spend, then:
#     MacroOracle.requestMacro (json-fetch, conditional)  --> await MacroReceived (datum populated)
#     oracle-freshness gate (deliveredAt != 0)
#     forge create MacroHedgeStrategist (platform, oracle)  --> guard mined + read back 3 immutables
#     Strategist.requestSchoolDecision (the ONE cheap LLM liveness probe)  --> await schoolSet==true
#
# Phase 18 adapts this further: requestNotionalDecision + StrategistDecided join + artifact publish.
#
# Live-testnet integration runner (NOT a forge unit test): every callback is async, executed
# off-chain by validators after consensus. We invoke, then poll on-chain logs with a hard
# timeout and an explicit FAIL branch.
#
# PRICE CLASSES (CLAUDE.md, the budget source of truth — NEVER floor-only, that is the
# TimedOut regression). subSize = 3:
#   - oracle refresh   : json-fetch     0.03 SOMI -> JSON_DEPOSIT = FLOOR + 0.09 STT (conditional)
#   - school-leg infer : llm-inference  0.07 SOMI -> LLM_DEPOSIT  = FLOOR + 0.21 STT (the probe)
#
# decisionId is read EXCLUSIVELY from the school leg's HedgeDecisionRequested log topic — the
# single source of truth, authoritative regardless of how the contract derives the id. We do
# NOT reconstruct it as bytes32(requestId).
#
# Prereqs (the script verifies what it can before spending):
#   - contracts/.env has SOMNIA_TESTNET_PK + SOMNIA_TESTNET_ADDRESS                  [DONE]
#   - keeper-proxy public (Vercel Deployment Protection OFF) for the json-fetch leg  [gate via MacroReceived]
#   - the dedicated wallet funded with STT (>= NEED_PER_RUN for the single probe)    [<-- gating step, faucet]
#
# Usage:
#   MACRO_ORACLE=<addr> CONSENSUS=500 bash script/macro-hedge-strategist-e2e.sh
#   (single deploy + ONE school-leg probe; idempotent re-run: pass CONSUMER + MACRO_ORACLE to re-fire
#    the probe only — no double-deploy, no second oracle refresh)
#
# Env knobs (all optional except the wallet creds in .env):
#   MACRO_ORACLE  reuse a deployed oracle (defaults to the live 0xAcA751…983f — never redeployed)
#   CONSUMER      reuse a deployed strategist (else the script deploys one)
#   DATA_KEY      catalog key (default keccak256("co/inflation-rate"))
#   CONSENSUS     consensus expectation, scaled int (default 500)
#   PROXY_BASE    keyless proxy base, MUST end in "/" (default keeper-eta-pied)
#   JSON_TERM_WEI / LLM_TERM_WEI / TIMEOUT_S / POLL_S  overrides
set -euo pipefail

RPC="https://api.infra.testnet.somnia.network"
PLATFORM="0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776"
LLM_AGENT_ID=12847293847561029384
PROXY_BASE="${PROXY_BASE:-https://keeper-eta-pied.vercel.app/}"   # MUST end in "/" (MacroOracle BadProxyBase guard)
SUBSIZE=3

# REUSE the live MacroOracle (do NOT redeploy it) — overridable for the idempotent re-run path.
MACRO_ORACLE="${MACRO_ORACLE:-0xAcA75144f644220f1dEAD5F989C350D8e0Cc983f}"
# v1 strategist — the §4 keep-reachable guardrail target (must STILL hold bytecode; never decommission).
V1_STRATEGIST="0xfA428171E1F5B56f92C67C002De1d8e90B053EE1"

# Per-class price TERMS (p_i * subSize). NOT one conflated PRICE_TERM_WEI.
JSON_TERM_WEI="${JSON_TERM_WEI:-90000000000000000}"    # 0.03 SOMI * 3 = 0.09 STT (oracle refresh ONLY)
LLM_TERM_WEI="${LLM_TERM_WEI:-210000000000000000}"     # 0.07 SOMI * 3 = 0.21 STT (EACH infer leg)

TIMEOUT_S="${TIMEOUT_S:-180}"   # LLM inference is slower than json-fetch
POLL_S="${POLL_S:-3}"

CONSENSUS="${CONSENSUS:-500}"

cd "$(dirname "$0")/.."
set -a; . ./.env; set +a
: "${SOMNIA_TESTNET_PK:?missing in contracts/.env}"
: "${SOMNIA_TESTNET_ADDRESS:?missing in contracts/.env}"
PK="$SOMNIA_TESTNET_PK"; ADDR="$SOMNIA_TESTNET_ADDRESS"

# DATA_KEY default = the inflation catalog key (keccak256 of the catalog name, NOT the proxyPath).
DATA_KEY="${DATA_KEY:-$(cast keccak "co/inflation-rate")}"

echo "== Step 0: deposits (class-correct, computed once from the live floor) =="
# PROXY_BASE trailing-slash guard mirrors MacroOracle.sol:155 (BadProxyBase) — assert BEFORE any deploy.
case "$PROXY_BASE" in
  */) : ;;
  *)  echo "FAIL: PROXY_BASE must end in '/' (MacroOracle BadProxyBase guard): $PROXY_BASE"; exit 1 ;;
esac

FLOOR=$(cast call "$PLATFORM" "getRequestDeposit()(uint256)" --rpc-url "$RPC")
FLOOR=${FLOOR%% *}                         # strip any trailing unit annotation (e.g. "[3e16]")
JSON_DEPOSIT=$(( FLOOR + JSON_TERM_WEI ))   # the oracle refresh leg
LLM_DEPOSIT=$(( FLOOR + LLM_TERM_WEI ))     # the ONE school-leg infer probe
# Phase-17 single-probe footprint: ONE json refresh + ONE school-leg infer (NOT the v1 2-run demo).
# CONSERVATIVE OVER-RESERVE (spend-honesty): JSON_DEPOSIT covers the cold/first run where the oracle
# datum is stale and Step 2 fires a json-fetch refresh. On the idempotent fresh-retry path
# (MACRO_ORACLE reused + datum already fresh, deliveredAt != 0) NO json-fetch fires, so the actual
# probe spends LESS than NEED_PER_RUN — the over-reserve only leaves headroom, never strands funds;
# the conditional refresh is honestly the only json spend.
NEED_PER_RUN=$(( JSON_DEPOSIT + LLM_DEPOSIT ))

echo "  floor=$FLOOR"
echo "  json_deposit=$JSON_DEPOSIT (refresh, json-fetch 0.09 — conditional, cold run only)"
echo "  llm_deposit=$LLM_DEPOSIT  (the ONE school-leg infer probe, llm-inference 0.21)"
echo "  need_per_run=$NEED_PER_RUN  (single probe: json refresh + one school-leg infer)"

echo "== Step 0b: deployer balance vs single-probe budget =="
BAL=$(cast balance "$ADDR" --rpc-url "$RPC")
BAL=${BAL%% *}
echo "  balance=$BAL wei  (wallet $ADDR)"
# Big-int-safe comparison: wei balances exceed bash's signed 64-bit range (a 20-digit wei value
# overflows `[ -lt ]`). Compare by digit-count, then lexically for equal lengths (no leading zeros).
if [ "${#BAL}" -lt "${#NEED_PER_RUN}" ] || { [ "${#BAL}" -eq "${#NEED_PER_RUN}" ] && [[ "$BAL" < "$NEED_PER_RUN" ]]; }; then
  echo "FAIL: insufficient STT for the single probe. Fund $ADDR at https://testnet.somnia.network/"
  echo "      (faucet is browser-only; need >= $NEED_PER_RUN wei, have $BAL)."
  exit 1
fi

echo "== Step 0c: FREE pre-spend surface gate (read-only — MUST pass before the FIRST STT spend) =="
# §4 ordering guarantee: this gate runs before requestMacro / cast send / forge create. All free reads.
[ "$(cast chain-id --rpc-url "$RPC")" = "50312" ] || { echo "FAIL: deploy-network chain-id != 50312 (Somnia testnet) — wrong RPC"; exit 1; }
PLATFORM_CODE=$(cast code "$PLATFORM" --rpc-url "$RPC")
[ "${#PLATFORM_CODE}" -gt 2 ] || { echo "FAIL: platform $PLATFORM has no code — volatile platform constant is wrong"; exit 1; }
V1_CODE=$(cast code "$V1_STRATEGIST" --rpc-url "$RPC")
[ "${#V1_CODE}" -gt 2 ] || { echo "FAIL: v1 $V1_STRATEGIST unreachable (must stay reachable — §4 guardrail)"; exit 1; }
echo "  REMINDER: LLM_AGENT_ID $LLM_AGENT_ID liveness is NOT free-provable — it is proven BY the cheap"
echo "  school-leg probe at Step 4 (which spends STT by design). A wrong id surfaces there as"
echo "  DecisionFailed/no-callback (deposit at risk; rebate unconfirmed on Somnia)."
echo "== surface gate PASS (chain-id 50312 + platform code + v1 reachable) — proceeding to spend =="

# Generic log-poll helper: poll a signature on an address from a block until present, or a
# failure-signature appears, or TIMEOUT_S elapses. Echoes the matching log line on success.
# $1=address  $2=success-sig  $3=fail-sig (may be empty)  $4=from-block  $5=label
poll_log() {
  local addr="$1" okSig="$2" failSig="$3" fromblk="$4" label="$5"
  local start deadline now hit
  start=$(date +%s); deadline=$(( start + TIMEOUT_S ))
  while :; do
    now=$(date +%s)
    hit=$(cast logs --rpc-url "$RPC" --address "$addr" "$okSig" --from-block "$fromblk" 2>/dev/null || true)
    if printf '%s' "$hit" | grep -q .; then
      echo "$hit"
      return 0
    fi
    if [ -n "$failSig" ]; then
      if cast logs --rpc-url "$RPC" --address "$addr" "$failSig" --from-block "$fromblk" 2>/dev/null | grep -q .; then
        echo "  FAIL: $label — failure event ($failSig) emitted (validators returned Failed/TimedOut)"
        return 1
      fi
    fi
    [ "$now" -ge "$deadline" ] && { echo "  FAIL: $label — timeout ${TIMEOUT_S}s with no callback"; return 1; }
    sleep "$POLL_S"
  done
}

echo "== Step 1: MacroOracle precondition (deploy-or-reuse, PROXY_BASE ends in '/') =="
if [ -z "${MACRO_ORACLE:-}" ]; then
  echo "  no MACRO_ORACLE set — deploying one with PROXY_BASE=$PROXY_BASE"
  CREATE_O=$(forge create src/MacroOracle.sol:MacroOracle --rpc-url "$RPC" --private-key "$PK" \
               --broadcast --constructor-args "$PLATFORM" "$PROXY_BASE" 2>&1)
  MACRO_ORACLE=$(printf '%s' "$CREATE_O" | grep -oE 'Deployed to: 0x[0-9a-fA-F]{40}' | grep -oE '0x[0-9a-fA-F]{40}')
  [ -n "$MACRO_ORACLE" ] || { echo "FAIL: MacroOracle deploy did not return an address: $CREATE_O"; exit 1; }
fi
echo "  MACRO_ORACLE=$MACRO_ORACLE  (PROXY_BASE=$PROXY_BASE)   <-- record both in the run log"

echo "== Step 2: oracle refresh (json-fetch) — populate latest(DATA_KEY) BEFORE the strategist reads it =="
echo "  DATA_KEY=$DATA_KEY"
FROMBLK_O=$(cast block-number --rpc-url "$RPC")    # capture BEFORE the send so no event is skipped
cast send "$MACRO_ORACLE" "requestMacro(bytes32)" "$DATA_KEY" \
  --value "$JSON_DEPOSIT" --private-key "$PK" --rpc-url "$RPC" >/dev/null
echo "  requestMacro sent (--value $JSON_DEPOSIT); awaiting MacroReceived..."
if ! poll_log "$MACRO_ORACLE" "MacroReceived(bytes32,int256)" "MacroFailed(uint256,bytes32,uint8)" "$FROMBLK_O" "oracle refresh"; then
  echo "FAIL: oracle refresh did not land — the strategist would revert UnknownKey on an unset datum."
  exit 1
fi
echo "  oracle refresh OK — latest($DATA_KEY) is populated."

echo "== Step 2b: oracle-freshness gate (read-only — before any LLM-deposit spend) =="
# The MacroDatum struct is 4 members: (bytes32 dataKey, int256 scaledValue, uint64 observedAt,
# uint64 deliveredAt). deliveredAt is the 4TH member (index 3): != 0 ⇔ the datum has been delivered.
# A stale datum would burn the LLM deposit via UnknownKey at requestSchoolDecision.
FRESH=$(cast call "$MACRO_ORACLE" "latest(bytes32)((bytes32,int256,uint64,uint64))" "$DATA_KEY" --rpc-url "$RPC")
DELIVERED_AT=$(printf '%s' "$FRESH" | tr -d '()' | awk -F',' '{gsub(/ /,"",$4); print $4}'); DELIVERED_AT=${DELIVERED_AT%% *}
[ -n "$DELIVERED_AT" ] && [ "$DELIVERED_AT" != "0" ] || { echo "FAIL: oracle datum stale (deliveredAt==0) for $DATA_KEY — refusing to spend the LLM deposit"; exit 1; }
echo "== oracle-freshness gate PASS (deliveredAt != 0) =="

echo "== Step 3: deploy MacroHedgeStrategist (constructor-args ORDER: platform THEN oracle) =="
if [ -z "${CONSUMER:-}" ]; then
  CREATE_S=$(forge create src/instrument/MacroHedgeStrategist.sol:MacroHedgeStrategist --rpc-url "$RPC" \
               --private-key "$PK" --broadcast --constructor-args "$PLATFORM" "$MACRO_ORACLE" 2>&1)
  CONSUMER=$(printf '%s' "$CREATE_S" | grep -oE 'Deployed to: 0x[0-9a-fA-F]{40}' | grep -oE '0x[0-9a-fA-F]{40}')
  [ -n "$CONSUMER" ] || { echo "FAIL: MacroHedgeStrategist deploy did not return an address: $CREATE_S"; exit 1; }
fi
echo "  CONSUMER=$CONSUMER"

# Guard the deploy actually mined before any read-back.
CONSUMER_CODE=$(cast code "$CONSUMER" --rpc-url "$RPC")
[ "${#CONSUMER_CODE}" -gt 2 ] || { echo "FAIL: deploy not mined — $CONSUMER has no code"; exit 1; }

# Immutable read-backs (SC-1): the constructor-wired surface must read the live platform/oracle/agent.
lc() { printf '%s' "$1" | tr 'A-Z' 'a-z'; }
RB_PLATFORM=$(cast call "$CONSUMER" "PLATFORM()(address)" --rpc-url "$RPC"); RB_PLATFORM=${RB_PLATFORM%% *}
[ "$(lc "$RB_PLATFORM")" = "$(lc "$PLATFORM")" ] || { echo "FAIL: PLATFORM() read-back $RB_PLATFORM != $PLATFORM"; exit 1; }
RB_ORACLE=$(cast call "$CONSUMER" "ORACLE()(address)" --rpc-url "$RPC"); RB_ORACLE=${RB_ORACLE%% *}
[ "$(lc "$RB_ORACLE")" = "$(lc "$MACRO_ORACLE")" ] || { echo "FAIL: ORACLE() read-back $RB_ORACLE != $MACRO_ORACLE"; exit 1; }
RB_AGENT=$(cast call "$CONSUMER" "LLM_AGENT_ID()(uint256)" --rpc-url "$RPC"); RB_AGENT=${RB_AGENT%% *}
[ "$RB_AGENT" = "$LLM_AGENT_ID" ] || { echo "FAIL: LLM_AGENT_ID() read-back $RB_AGENT != $LLM_AGENT_ID"; exit 1; }
[ "$(lc "$CONSUMER")" != "0xfa428171e1f5b56f92c67c002de1d8e90b053ee1" ] || { echo "FAIL: deployed at the v1 address — expected a NEW address"; exit 1; }
echo "  immutables OK: PLATFORM=$RB_PLATFORM ORACLE=$RB_ORACLE LLM_AGENT_ID=$RB_AGENT (NEW address, != v1)"

echo "== Step 4: SCHOOL leg — the cheap LLM_AGENT_ID liveness probe (Phase 18 does notional + join) =="
USER_INTENT="${USER_INTENT:-Hedge COP depreciation from a rate-hike surprise}"
FROMBLK_A=$(cast block-number --rpc-url "$RPC")
cast send "$CONSUMER" "requestSchoolDecision(string,bytes32,int256)" "$USER_INTENT" "$DATA_KEY" "$CONSENSUS" \
  --value "$LLM_DEPOSIT" --private-key "$PK" --rpc-url "$RPC" >/dev/null
echo "  requestSchoolDecision sent (intent='$USER_INTENT', consensus=$CONSENSUS, --value $LLM_DEPOSIT);"
echo "  awaiting HedgeDecisionRequested (school leg, emitted synchronously)..."
# decisionId is topics[2] of HedgeDecisionRequested(uint256,bytes32,uint8): topics[0]=sig,
# topics[1]=requestId, topics[2]=decisionId. Parse the 3rd 64-hex value AFTER the "topics:" marker.
REQ_LOG=$(poll_log "$CONSUMER" "HedgeDecisionRequested(uint256,bytes32,uint8)" "" "$FROMBLK_A" "school request") || {
  echo "FAIL: HedgeDecisionRequested (school leg) never observed — school send likely reverted."; exit 1; }
DECISION_ID=$(printf '%s' "$REQ_LOG" | awk '/topics:/{t=1} t && match($0,/0x[0-9a-fA-F]{64}/){ if(++n==3){ print substr($0,RSTART,RLENGTH); exit } }')
[ -n "$DECISION_ID" ] || { echo "FAIL: could not parse decisionId topic from HedgeDecisionRequested log:"; printf '%s\n' "$REQ_LOG"; exit 1; }
echo "  decisionId (from the school leg's HedgeDecisionRequested topic) = $DECISION_ID"

echo "  awaiting the SCHOOL callback to land (schoolSet) — the affirmative liveness proof..."
# decisionState(bytes32) returns (bool schoolSet, bool notionalSet, uint64 decidedAt, string schoolLabel).
# POSITION-EXPLICIT: decode the FIRST member only (schoolSet) — a positional-blind grep would also
# match notionalSet (also a bool). This school-only probe leaves notionalSet false, but the read is
# pinned to member 1 regardless.
START_A=$(date +%s); DEADLINE_A=$(( START_A + TIMEOUT_S )); SCHOOL_SET="false"
while :; do
  if cast logs --rpc-url "$RPC" --address "$CONSUMER" "DecisionFailed(uint256,uint8)" --from-block "$FROMBLK_A" 2>/dev/null | grep -q .; then
    echo "  DecisionFailed — agent ANSWERED but the school label is UNMAPPED in MacroThesisRegistry"
    echo "  (agent LIVE; re-run with an adjusted USER_INTENT). NOT a wrong-constant signal."
    exit 1
  fi
  SCHOOL_SET=$(cast call "$CONSUMER" "decisionState(bytes32)((bool,bool,uint64,string))" "$DECISION_ID" --rpc-url "$RPC" 2>/dev/null | tr -d '()' | awk -F',' 'NR==1{gsub(/ /,"",$1); print $1}')
  [ "$SCHOOL_SET" = "true" ] && break
  [ "$(date +%s)" -ge "$DEADLINE_A" ] && break
  sleep "$POLL_S"
done
if [ "$SCHOOL_SET" != "true" ]; then
  echo "  FAIL: no callback / timeout ${TIMEOUT_S}s — LLM_AGENT_ID $LLM_AGENT_ID / platform likely DEAD or WRONG (§4)."
  echo "        (deposit at risk; rebate unconfirmed on Somnia.)"
  exit 1
fi
echo "== probe PASS: requestSchoolDecision callback landed (schoolSet=true) — volatile surface LIVE =="

echo "== Phase-17 done: CONSUMER=$CONSUMER decisionId=$DECISION_ID schoolSet=true =="
# Phase 18 adapts THIS runner further: add requestNotionalDecision + StrategistDecided join + the somnia-strategist-deployment.json publish.
