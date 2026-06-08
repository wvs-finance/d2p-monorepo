#!/usr/bin/env bash
# MacroHedgeStrategist Somnia-testnet end-to-end integration runner (AGENT-03 live half).
#
#   keeper sequences, ONE infer per tx, across DIFFERENT blocks:
#     MacroOracle.requestMacro (json-fetch)  --> await MacroReceived  (datum populated)
#     Strategist.requestActionDecision       --> await action callback (actionSet, decisionId emitted)
#     Strategist.requestSizeDecision(id)      --> await HedgeDecisionMade (both legs joined)
#
# Live-testnet integration test (NOT a forge unit test): every callback is async, executed
# off-chain by validators after consensus. We invoke, then poll on-chain logs with a hard
# timeout and an explicit FAIL branch.
#
# PRICE CLASSES (CLAUDE.md, the budget source of truth — NEVER floor-only, that is the
# TimedOut regression). subSize = 3:
#   - oracle refresh        : json-fetch     0.03 SOMI -> JSON_DEPOSIT = FLOOR + 0.09 STT
#   - each of the two legs  : llm-inference  0.07 SOMI -> LLM_DEPOSIT  = FLOOR + 0.21 STT
#
# decisionId is read EXCLUSIVELY from the action leg's HedgeDecisionRequested log topic — the
# single source of truth, authoritative regardless of how the contract derives the id. We do
# NOT reconstruct it as bytes32(actionRequestId).
#
# Prereqs (the script verifies what it can before spending):
#   - contracts/.env has SOMNIA_TESTNET_PK + SOMNIA_TESTNET_ADDRESS                  [DONE]
#   - keeper-proxy public (Vercel Deployment Protection OFF) for the json-fetch leg  [gate via MacroReceived]
#   - the dedicated wallet funded with STT (>= 2 * NEED_PER_RUN for the 2-run demo)  [<-- gating step, faucet]
#
# Usage:
#   MACRO_ORACLE=<addr> CONSENSUS=500 bash script/macro-hedge-strategist-e2e.sh
#   (run twice with different CONSENSUS to prove decision-moves-with-consensus)
#
# Env knobs (all optional except the wallet creds in .env):
#   MACRO_ORACLE  reuse a deployed oracle (else the script deploys one)
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
LLM_DEPOSIT=$(( FLOOR + LLM_TERM_WEI ))     # each infer leg
NEED_PER_RUN=$(( JSON_DEPOSIT + 2 * LLM_DEPOSIT ))
NEED_DEMO=$(( 2 * NEED_PER_RUN ))           # >= 2 runs for the consensus-moves-decision proof

echo "  floor=$FLOOR"
echo "  json_deposit=$JSON_DEPOSIT (refresh, json-fetch 0.09)"
echo "  llm_deposit=$LLM_DEPOSIT  (each infer leg, llm-inference 0.21)"
echo "  need_per_run=$NEED_PER_RUN  need_demo(2 runs)=$NEED_DEMO"

echo "== Step 0b: deployer balance vs demo budget =="
BAL=$(cast balance "$ADDR" --rpc-url "$RPC")
BAL=${BAL%% *}
echo "  balance=$BAL wei  (wallet $ADDR)"
# Big-int-safe comparison: wei balances exceed bash's signed 64-bit range (a 20-digit wei value
# overflows `[ -lt ]`). Compare by digit-count, then lexically for equal lengths (no leading zeros).
if [ "${#BAL}" -lt "${#NEED_DEMO}" ] || { [ "${#BAL}" -eq "${#NEED_DEMO}" ] && [[ "$BAL" < "$NEED_DEMO" ]]; }; then
  echo "FAIL: insufficient STT for the 2-run demo. Fund $ADDR at https://testnet.somnia.network/"
  echo "      (faucet is browser-only; need >= $NEED_DEMO wei, have $BAL)."
  exit 1
fi

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

echo "== Step 3: deploy MacroHedgeStrategist (reads MACRO_ORACLE) =="
if [ -z "${CONSUMER:-}" ]; then
  CREATE_S=$(forge create src/instrument/MacroHedgeStrategist.sol:MacroHedgeStrategist --rpc-url "$RPC" \
               --private-key "$PK" --broadcast --constructor-args "$PLATFORM" "$MACRO_ORACLE" 2>&1)
  CONSUMER=$(printf '%s' "$CREATE_S" | grep -oE 'Deployed to: 0x[0-9a-fA-F]{40}' | grep -oE '0x[0-9a-fA-F]{40}')
  [ -n "$CONSUMER" ] || { echo "FAIL: MacroHedgeStrategist deploy did not return an address: $CREATE_S"; exit 1; }
fi
echo "  CONSUMER=$CONSUMER"

echo "== Step 4: ACTION leg + standalone ID-disambiguation probe =="
echo "  NOTE: this action leg DOUBLES as the LLM_AGENT_ID probe."
echo "        If the ACTION leg TimedOut here (no HedgeDecisionRequested action callback /"
echo "        a DecisionFailed), LLM_AGENT_ID $LLM_AGENT_ID is WRONG — flip the constant in"
echo "        src/instrument/MacroHedgeStrategist.sol and redeploy (benign — deposits rebate)."
echo "        A TimedOut at THIS step is the WRONG-ID signal — NOT the cross-leg join failure"
echo "        (the join failure mode instead shows actionSet WITHOUT a later HedgeDecisionMade)."
FROMBLK_A=$(cast block-number --rpc-url "$RPC")
cast send "$CONSUMER" "requestActionDecision(bytes32,int256)" "$DATA_KEY" "$CONSENSUS" \
  --value "$LLM_DEPOSIT" --private-key "$PK" --rpc-url "$RPC" >/dev/null
echo "  requestActionDecision sent (consensus=$CONSENSUS, --value $LLM_DEPOSIT); awaiting HedgeDecisionRequested (action leg)..."
# decisionId is the SECOND indexed topic of HedgeDecisionRequested(uint256,bytes32,uint8).
# This is emitted synchronously in requestActionDecision — it confirms the action leg was
# accepted and is the AUTHORITATIVE decisionId (single source of truth).
REQ_LOG=$(poll_log "$CONSUMER" "HedgeDecisionRequested(uint256,bytes32,uint8)" "" "$FROMBLK_A" "action request") || {
  echo "FAIL: HedgeDecisionRequested (action leg) never observed — action send likely reverted."; exit 1; }
# decisionId is topics[2] (topics[0]=event sig, topics[1]=requestId, topics[2]=decisionId).
# Parse the 3rd 64-hex value AFTER the "topics:" marker — NOT the 3rd in the whole log text
# (blockHash/data precede topics in cast's output, so a global match grabs topics[0]=the event sig).
DECISION_ID=$(printf '%s' "$REQ_LOG" | awk '/topics:/{t=1} t && match($0,/0x[0-9a-fA-F]{64}/){ if(++n==3){ print substr($0,RSTART,RLENGTH); exit } }')
[ -n "$DECISION_ID" ] || { echo "FAIL: could not parse decisionId topic from HedgeDecisionRequested log:"; printf '%s\n' "$REQ_LOG"; exit 1; }
echo "  decisionId (from the action leg's HedgeDecisionRequested topic) = $DECISION_ID"

echo "  awaiting the ACTION callback to land (actionSet) before firing the size leg..."
# The action callback sets actionSet; it does NOT itself emit HedgeDecisionMade (that needs both
# legs). We confirm actionSet via the typed getter rather than guessing on the async timing.
START_A=$(date +%s); DEADLINE_A=$(( START_A + TIMEOUT_S )); ACTION_OK=0
while :; do
  if cast logs --rpc-url "$RPC" --address "$CONSUMER" "DecisionFailed(uint256,uint8)" --from-block "$FROMBLK_A" 2>/dev/null | grep -q .; then
    echo "  FAIL: DecisionFailed emitted on the action leg (decode/no-match or validator Failed/TimedOut)."; exit 1
  fi
  ASET=$(cast call "$CONSUMER" "getDecision(bytes32)((uint8,uint256,int256,int256,uint64,bool,bool))" "$DECISION_ID" --rpc-url "$RPC" 2>/dev/null || true)
  # The 6th tuple member is actionSet (bool). A true reads as the literal 'true'.
  if printf '%s' "$ASET" | grep -qiE '\btrue\b'; then ACTION_OK=1; break; fi
  [ "$(date +%s)" -ge "$DEADLINE_A" ] && break
  sleep "$POLL_S"
done
[ "$ACTION_OK" -eq 1 ] || { echo "  FAIL: action callback did not land within ${TIMEOUT_S}s (actionSet stayed false) — wrong LLM_AGENT_ID is the prime suspect."; exit 1; }
echo "  ACTION callback landed (actionSet=true)."

echo "== Step 5: SIZE leg — fired with the SAME decisionId, ONLY after the action callback landed =="
FROMBLK_S=$(cast block-number --rpc-url "$RPC")
cast send "$CONSUMER" "requestSizeDecision(bytes32)" "$DECISION_ID" \
  --value "$LLM_DEPOSIT" --private-key "$PK" --rpc-url "$RPC" >/dev/null
echo "  requestSizeDecision sent (decisionId=$DECISION_ID, --value $LLM_DEPOSIT); awaiting HedgeDecisionMade..."
MADE_LOG=$(poll_log "$CONSUMER" "HedgeDecisionMade(uint256,uint8,uint256,int256,int256)" "DecisionFailed(uint256,uint8)" "$FROMBLK_S" "size leg / join") || {
  echo "FAIL: HedgeDecisionMade never observed. If actionSet was true but no HedgeDecisionMade,"
  echo "      that is the cross-leg JOIN failure mode (a more serious bug than a wrong ID)."; exit 1; }
echo "  HedgeDecisionMade observed:"
printf '%s\n' "$MADE_LOG"

echo "== Step 6: assert invariants from the stored decision (in-enum action, in-range size) =="
DEC=$(cast call "$CONSUMER" "getDecision(bytes32)((uint8,uint256,int256,int256,uint64,bool,bool))" "$DECISION_ID" --rpc-url "$RPC")
echo "  decision tuple (action,sizeBps,macroValue,consensus,decidedAt,actionSet,sizeSet):"
echo "    $DEC"
# Parse the first two tuple members: action (uint8 enum) and sizeBps (uint256).
ACTION=$(printf '%s' "$DEC" | tr -d '()' | cut -d',' -f1 | tr -d ' ')
SIZEBPS=$(printf '%s' "$DEC" | tr -d '()' | cut -d',' -f2 | tr -d ' '); SIZEBPS=${SIZEBPS%% *}
echo "  decoded -> action=$ACTION  sizeBps=$SIZEBPS"
case "$ACTION" in
  0|1|2|3) echo "  ASSERT PASS: action in-enum {0,1,2,3}" ;;
  *) echo "  ASSERT FAIL: action $ACTION not in {0,1,2,3}"; exit 1 ;;
esac
if [ "$SIZEBPS" -le 10000 ]; then
  echo "  ASSERT PASS: sizeBps $SIZEBPS <= 10000 (in-range)"
else
  echo "  ASSERT FAIL: sizeBps $SIZEBPS > 10000 (out of range)"; exit 1
fi

echo "== done: CONSUMER=$CONSUMER decisionId=$DECISION_ID consensus=$CONSENSUS action=$ACTION sizeBps=$SIZEBPS =="
echo "   (run again with a DIFFERENT CONSENSUS and confirm (action,sizeBps) DIFFERS — the consensus-moves-decision proof;"
echo "    capture both HedgeDecisionMade tx hashes for the Agentathon demo video.)"
