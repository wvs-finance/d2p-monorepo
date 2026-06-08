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
# Phase-18 TWO-LEG footprint: each run = ONE json refresh (conditional, cold only) + TWO LLM legs
# (school infer + notional infer). The decision-moves proof fires RUNS=2 full runs, with MAX_RETRY=1
# of headroom. The Step-0b gate pre-reserves the FULL profile BEFORE the first irreversible send so an
# under-funded wallet FAILS the gate rather than stranding a half-open decision mid-flow.
RUNS="${RUNS:-2}"
MAX_RETRY="${MAX_RETRY:-1}"
NEED_PER_RUN=$(( JSON_DEPOSIT + LLM_DEPOSIT + LLM_DEPOSIT ))      # json refresh + 2 LLM legs (school + notional)
NEED_TOTAL=$(( (RUNS + MAX_RETRY) * NEED_PER_RUN ))              # full profile: (RUNS + MAX_RETRY) runs

echo "  floor=$FLOOR"
echo "  json_deposit=$JSON_DEPOSIT (refresh, json-fetch 0.09 — conditional, cold run only)"
echo "  llm_deposit=$LLM_DEPOSIT  (EACH infer leg: school + notional, llm-inference 0.21)"
echo "  need_per_run=$NEED_PER_RUN  (json refresh + 2 LLM legs)"
echo "  need_total=$NEED_TOTAL  ((RUNS=$RUNS + MAX_RETRY=$MAX_RETRY) x need_per_run — full reserve)"

echo "== Step 0b: deployer balance vs FULL-profile budget (NEED_TOTAL) =="
BAL=$(cast balance "$ADDR" --rpc-url "$RPC")
BAL=${BAL%% *}
echo "  balance=$BAL wei  (wallet $ADDR)"
# Big-int-safe comparison: wei balances exceed bash's signed 64-bit range (a 20-digit wei value
# overflows `[ -lt ]`). Compare by digit-count, then lexically for equal lengths (no leading zeros).
if [ "${#BAL}" -lt "${#NEED_TOTAL}" ] || { [ "${#BAL}" -eq "${#NEED_TOTAL}" ] && [[ "$BAL" < "$NEED_TOTAL" ]]; }; then
  echo "FAIL: insufficient STT for the FULL decision-moves profile. Fund $ADDR at https://testnet.somnia.network/"
  echo "      (faucet is browser-only; need >= $NEED_TOTAL wei (NEED_TOTAL), have $BAL)."
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

# tx-hash extractor (MINOR-3): reads `.transactionHash // .hash` from a `cast send/receipt --json` blob.
# A zero-cost literal self-test runs at Step 0d BELOW, BEFORE the first STT spend, so the three
# artifact hashes are guaranteed non-empty AFTER STT is irreversibly spent.
extract_txhash() {
  jq -r '.transactionHash // .hash // empty' 2>/dev/null
}

echo "== Step 0d: tx-hash extractor self-test (zero-cost — MUST pass BEFORE the first STT spend) =="
SELFTEST=$(printf '%s' '{"transactionHash":"0xabc"}' | extract_txhash)
[ "$SELFTEST" = "0xabc" ] || { echo "FAIL: extract_txhash self-test returned '$SELFTEST' != 0xabc — aborting 0-cost before any spend"; exit 1; }
SELFTEST2=$(printf '%s' '{"hash":"0xdef"}' | extract_txhash)
[ "$SELFTEST2" = "0xdef" ] || { echo "FAIL: extract_txhash .hash-fallback self-test returned '$SELFTEST2' != 0xdef — aborting 0-cost"; exit 1; }
echo "  extract_txhash self-test PASS (.transactionHash + .hash fallback) — safe to spend"

# parse_result PREFIX <line> : split a `RESULT decisionId=… school=… …` line into PREFIX_* vars.
# Sets <PREFIX>_DECISIONID/_SCHOOL/_NOTIONAL/_SCHOOLTX/_NOTIONALTX/_STRATEGISTTX in the caller's scope.
parse_result() {
  local prefix="$1" line="$2" kv k v
  for kv in $line; do
    case "$kv" in RESULT) continue;; *=*) : ;; *) continue;; esac
    k="${kv%%=*}"; v="${kv#*=}"
    case "$k" in
      decisionId)   printf -v "${prefix}_DECISIONID" '%s' "$v" ;;
      school)       printf -v "${prefix}_SCHOOL" '%s' "$v" ;;
      notional)     printf -v "${prefix}_NOTIONAL" '%s' "$v" ;;
      schoolTx)     printf -v "${prefix}_SCHOOLTX" '%s' "$v" ;;
      notionalTx)   printf -v "${prefix}_NOTIONALTX" '%s' "$v" ;;
      strategistTx) printf -v "${prefix}_STRATEGISTTX" '%s' "$v" ;;
    esac
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

echo "== Step 2: oracle refresh (json-fetch) — CONDITIONAL: only on a cold (undelivered) datum =="
echo "  DATA_KEY=$DATA_KEY"
# The refresh is the json-fetch leg's ONE STT spend and is "conditional, cold run only" (see Step 0).
# A datum ALREADY delivered on-chain (deliveredAt != 0) satisfies the strategist's latest(DATA_KEY)
# read — it will NOT revert UnknownKey. The keeper-proxy json-fetch source is intermittently flaky
# (MacroFailed/TimedOut, e.g. a 404 at the proxy root), so re-firing a refresh on an already-delivered
# datum needlessly risks burning the json deposit AND can hard-fail the whole proof for no benefit.
# Pre-check delivery; refresh ONLY if cold. Either way Step 2b is the load-bearing freshness gate.
PRE_FRESH=$(cast call "$MACRO_ORACLE" "latest(bytes32)((bytes32,int256,uint64,uint64))" "$DATA_KEY" --rpc-url "$RPC" 2>/dev/null)
PRE_DELIVERED=$(printf '%s' "$PRE_FRESH" | tr -d '()' | awk -F',' '{gsub(/ /,"",$4); print $4}'); PRE_DELIVERED=${PRE_DELIVERED%% *}
if [ -n "$PRE_DELIVERED" ] && [ "$PRE_DELIVERED" != "0" ]; then
  echo "  [conditional] datum ALREADY delivered (deliveredAt=$PRE_DELIVERED) — SKIP refresh (no json-fetch STT spend)"
else
  FROMBLK_O=$(cast block-number --rpc-url "$RPC")    # capture BEFORE the send so no event is skipped
  cast send "$MACRO_ORACLE" "requestMacro(bytes32)" "$DATA_KEY" \
    --value "$JSON_DEPOSIT" --private-key "$PK" --rpc-url "$RPC" >/dev/null
  echo "  requestMacro sent (--value $JSON_DEPOSIT, cold datum); awaiting MacroReceived..."
  if ! poll_log "$MACRO_ORACLE" "MacroReceived(bytes32,int256)" "MacroFailed(uint256,bytes32,uint8)" "$FROMBLK_O" "oracle refresh"; then
    echo "FAIL: oracle refresh did not land on a COLD datum — the strategist would revert UnknownKey on an unset datum."
    exit 1
  fi
  echo "  oracle refresh OK — latest($DATA_KEY) is populated."
fi

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

# =====================================================================================================
# run_two_leg INTENT CONSENSUS : drive ONE full school->notional->StrategistDecided flow against the
# live reused CONSUMER, every capture bound to THIS run's decisionId. On success echoes EXACTLY one
# parseable line on stdout:
#   RESULT decisionId=<id> school=<label> notional=<n> schoolTx=<h> notionalTx=<h> strategistTx=<h>
# On a documented BLOCK it prints "  BLOCK: …" to stderr and returns 1 (a missing notional callback is
# a BLOCK here — LIVEDEP-02 REQUIRES a full mandate, unlike the Phase-17 school-only probe).
# =====================================================================================================
run_two_leg() {
  local intent="$1" consensus="$2"
  local fromblk_s school_tx req_log decision_id school_set
  local fromblk_n notional_tx notional_req_id notional_set
  local mandate econ_theory target_notional school_label sd_log strategist_tx

  # ---- SCHOOL leg ------------------------------------------------------------------------------
  fromblk_s=$(cast block-number --rpc-url "$RPC")
  school_tx=$(cast send "$CONSUMER" "requestSchoolDecision(string,bytes32,int256)" "$intent" "$DATA_KEY" "$consensus" \
    --value "$LLM_DEPOSIT" --private-key "$PK" --rpc-url "$RPC" --json | extract_txhash)
  [ -n "$school_tx" ] || { echo "  BLOCK: requestSchoolDecision returned no tx hash (intent='$intent')" >&2; return 1; }
  # decisionId is topics[2] of THIS send's HedgeDecisionRequested log (binds the id to the run's send,
  # NOT address-only). topics[0]=sig, topics[1]=requestId, topics[2]=decisionId.
  #
  # BUGFIX (Phase 18 v2.1): the strategist tx emits TWO logs with >=3 topics on $CONSUMER:
  #   log#1  sig 0x9bb846491a984154…  topics[2] = LLM_AGENT_ID (0x…b24ac1afbcefc708) — NOT the decisionId
  #   log#2  HedgeDecisionRequested   topics[2] = the REAL decisionId (e.g. 0x…566afb)
  # The old pipeline (address + topics>=3 only, then head -n1) grabbed log#1 (the agent id), so the
  # poller read decisionState(agentId)=(false,false) → FALSE BLOCK while the real decision had landed.
  # FIX: filter topics[0] to the HedgeDecisionRequested signature BEFORE taking topics[2].
  local HDR_SIG="0x4a46430989d2486872dcb9df82504d48879adc86f33d1cd7c58c214b4526e96d"
  local AGENT_ID_TOPIC="0x000000000000000000000000000000000000000000000000b24ac1afbcefc708"
  req_log=$(cast receipt "$school_tx" --rpc-url "$RPC" --json 2>/dev/null)
  decision_id=$(printf '%s' "$req_log" | jq -r --arg a "$(printf '%s' "$CONSUMER" | tr 'A-Z' 'a-z')" --arg s "$HDR_SIG" \
    '.logs[] | select((.address|ascii_downcase)==$a) | select(.topics|length>=3) | select((.topics[0]|ascii_downcase)==$s) | .topics[2]' 2>/dev/null | head -n1)
  [ -n "$decision_id" ] && [ "$decision_id" != "null" ] || { echo "  BLOCK: could not bind decisionId from school tx $school_tx receipt (HedgeDecisionRequested sig $HDR_SIG)" >&2; return 1; }
  # ACCEPTANCE: the parsed decisionId MUST NOT be the agent-id constant — that was the v2.0 parse bug.
  [ "$(printf '%s' "$decision_id" | tr 'A-Z' 'a-z')" != "$AGENT_ID_TOPIC" ] || { echo "  BLOCK: parsed decisionId == LLM_AGENT_ID constant ($AGENT_ID_TOPIC) — the decisionId-parse bug regressed (wrong log selected)" >&2; return 1; }
  echo "  [run] school_tx=$school_tx decisionId=$decision_id (intent='$intent', consensus=$consensus)" >&2

  # Poll schoolSet==true (decisionState member-1), with a DecisionFailed poll BOUND to this decisionId
  # (school requestId == uint256(decisionId), so the indexed requestId topic == decision_id).
  local start_s deadline_s
  start_s=$(date +%s); deadline_s=$(( start_s + TIMEOUT_S )); school_set="false"
  while :; do
    if cast logs --rpc-url "$RPC" --address "$CONSUMER" "DecisionFailed(uint256,uint8)" "$decision_id" --from-block "$fromblk_s" 2>/dev/null | grep -q .; then
      echo "  BLOCK: DecisionFailed (school leg) for decisionId=$decision_id — validators returned Failed (deposit at risk)" >&2; return 1
    fi
    school_set=$(cast call "$CONSUMER" "decisionState(bytes32)((bool,bool,uint64,string))" "$decision_id" --rpc-url "$RPC" 2>/dev/null | tr -d '()' | awk -F',' 'NR==1{gsub(/ /,"",$1); print $1}')
    [ "$school_set" = "true" ] && break
    [ "$(date +%s)" -ge "$deadline_s" ] && break
    sleep "$POLL_S"
  done
  [ "$school_set" = "true" ] || { echo "  BLOCK: schoolSet never landed for decisionId=$decision_id (timeout ${TIMEOUT_S}s) — LLM_AGENT_ID/platform DEAD or WRONG" >&2; return 1; }

  # ---- NOTIONAL leg ----------------------------------------------------------------------------
  # GUARD: requestNotionalDecision reverts UnknownDecision unless schoolSet==true && notionalSet==false
  # (satisfied above). Capture FROMBLK_N BEFORE the send so the StrategistDecided log is in range.
  fromblk_n=$(cast block-number --rpc-url "$RPC")
  notional_tx=$(cast send "$CONSUMER" "requestNotionalDecision(bytes32)" "$decision_id" \
    --value "$LLM_DEPOSIT" --private-key "$PK" --rpc-url "$RPC" --json | extract_txhash)
  [ -n "$notional_tx" ] || { echo "  BLOCK: requestNotionalDecision returned no tx hash for decisionId=$decision_id" >&2; return 1; }
  # The notional leg's requestId = topics[1] of the HedgeDecisionRequested log whose topics[2]==decision_id.
  notional_req_id=$(cast receipt "$notional_tx" --rpc-url "$RPC" --json 2>/dev/null | jq -r --arg a "$(printf '%s' "$CONSUMER" | tr 'A-Z' 'a-z')" --arg d "$(printf '%s' "$decision_id" | tr 'A-Z' 'a-z')" --arg s "$HDR_SIG" \
    '.logs[] | select((.address|ascii_downcase)==$a) | select(.topics|length>=3) | select((.topics[0]|ascii_downcase)==$s) | select((.topics[2]|ascii_downcase)==$d) | .topics[1]' 2>/dev/null | head -n1)
  echo "  [run] notional_tx=$notional_tx notional_req_id=${notional_req_id:-<unresolved>}" >&2

  local start_n deadline_n
  start_n=$(date +%s); deadline_n=$(( start_n + TIMEOUT_S )); notional_set="false"
  while :; do
    if [ -n "$notional_req_id" ] && [ "$notional_req_id" != "null" ]; then
      if cast logs --rpc-url "$RPC" --address "$CONSUMER" "DecisionFailed(uint256,uint8)" "$notional_req_id" --from-block "$fromblk_n" 2>/dev/null | grep -q .; then
        echo "  BLOCK: DecisionFailed (notional leg) requestId=$notional_req_id for decisionId=$decision_id" >&2; return 1
      fi
    fi
    notional_set=$(cast call "$CONSUMER" "decisionState(bytes32)((bool,bool,uint64,string))" "$decision_id" --rpc-url "$RPC" 2>/dev/null | tr -d '()' | awk -F',' 'NR==1{gsub(/ /,"",$2); print $2}')
    [ "$notional_set" = "true" ] && break
    [ "$(date +%s)" -ge "$deadline_n" ] && break
    sleep "$POLL_S"
  done
  [ "$notional_set" = "true" ] || { echo "  BLOCK: notionalSet never landed for decisionId=$decision_id (timeout ${TIMEOUT_S}s) — full mandate REQUIRED for LIVEDEP-02 (documented BLOCK, not a pass)" >&2; return 1; }

  # ---- Full-mandate assertion (MINOR-4, positional awk) ----------------------------------------
  # getMandate returns (address economicTheory, bytes32 underlyingMarket, uint256 targetNotional,
  # uint32 chainId, bool isLong): economicTheory = field $1, targetNotional = field $3.
  # NOTE: cast appends a human-readable annotation to large ints, e.g. "58400000 [5.84e7]". The awk
  # field split on ',' keeps that bracketed suffix; strip it (everything from the first '[') AFTER the
  # space-strip so the numeric check sees a clean integer (Rule-1 fix: this was a false targetNotional BLOCK).
  mandate=$(cast call "$CONSUMER" "getMandate(bytes32)((address,bytes32,uint256,uint32,bool))" "$decision_id" --rpc-url "$RPC" 2>/dev/null)
  econ_theory=$(printf '%s' "$mandate" | tr -d '()' | awk -F',' '{gsub(/ /,"",$1); print $1}'); econ_theory=${econ_theory%% *}; econ_theory=${econ_theory%%\[*}
  target_notional=$(printf '%s' "$mandate" | tr -d '()' | awk -F',' '{gsub(/ /,"",$3); print $3}'); target_notional=${target_notional%% *}; target_notional=${target_notional%%\[*}
  [ -n "$econ_theory" ] && [ "$econ_theory" != "0x0000000000000000000000000000000000000000" ] || { echo "  BLOCK: getMandate economicTheory is 0x0 for decisionId=$decision_id" >&2; return 1; }
  case "$target_notional" in ''|*[!0-9]*) echo "  BLOCK: getMandate targetNotional non-numeric ('$target_notional') for decisionId=$decision_id" >&2; return 1;; esac
  { [ "$target_notional" -ge 1000 ] && [ "$target_notional" -le 100000000 ]; } || { echo "  BLOCK: targetNotional $target_notional out of [1000,100000000] for decisionId=$decision_id" >&2; return 1; }
  # schoolLabel = decisionState member-4 ($4); non-empty.
  school_label=$(cast call "$CONSUMER" "decisionState(bytes32)((bool,bool,uint64,string))" "$decision_id" --rpc-url "$RPC" 2>/dev/null | tr -d '()' | awk -F',' '{gsub(/^ +| +$/,"",$4); print $4}')
  school_label=$(printf '%s' "$school_label" | tr -d '"')
  [ -n "$school_label" ] || { echo "  BLOCK: schoolLabel empty for decisionId=$decision_id" >&2; return 1; }

  # ---- StrategistDecided capture, decisionId-BOUND (BLOCKER-1) ----------------------------------
  # Filtered by the indexed decisionId topic so run-2 can NEVER capture run-1's log on the reused CONSUMER.
  sd_log=$(cast logs --rpc-url "$RPC" --address "$CONSUMER" \
    "StrategistDecided(bytes32,string,(address,bytes32,uint256,uint32,bool))" "$decision_id" --from-block "$fromblk_n" 2>/dev/null)
  printf '%s' "$sd_log" | grep -q . || { echo "  BLOCK: no decisionId-bound StrategistDecided log for decisionId=$decision_id" >&2; return 1; }
  strategist_tx=$(printf '%s' "$sd_log" | awk '/transactionHash:/{print $2; exit}')
  [ -n "$strategist_tx" ] || { echo "  BLOCK: StrategistDecided log carried no transactionHash for decisionId=$decision_id" >&2; return 1; }

  echo "  [run] mandate: school='$school_label' economicTheory=$econ_theory targetNotional=$target_notional strategist_tx=$strategist_tx" >&2
  echo "RESULT decisionId=$decision_id school=$school_label notional=$target_notional schoolTx=$school_tx notionalTx=$notional_tx strategistTx=$strategist_tx"
  return 0
}

echo "== Step 4: TWO-LEG decision-moves proof (RUN 1 + a DIVERGENT-input RUN 2; bounded) =="
# Run-1 intent (SHILLER-leaning surprise) vs run-2 intent (POST_KEYNESIAN structural/regime risk) +
# distinct consensus, to MAXIMIZE divergence. school+notional are LLM outputs, so movement is NOT assumed.
USER_INTENT="${USER_INTENT:-Hedge COP depreciation from a rate-hike surprise}"
USER_INTENT2="${USER_INTENT2:-Hedge structural post-Keynesian regime risk: persistent fiscal-dominance COP devaluation under a non-ergodic balance-of-payments constraint}"
CONSENSUS2="${CONSENSUS2:-900}"

OUT_DIR="script/out"; mkdir -p "$OUT_DIR"
RUN1_STATE="$OUT_DIR/.run1-state.env"
RUNS_STATE="$OUT_DIR/.runs-state.env"

# ---- RUN 1 (idempotent: skip if already persisted) ----
if [ -f "$RUN1_STATE" ]; then
  echo "  [idempotent] $RUN1_STATE exists — SKIP run-1 (no re-spend, reuse its decisionId)"
  # shellcheck disable=SC1090
  . "$RUN1_STATE"
else
  echo "  -- RUN 1 (intent='$USER_INTENT', consensus=$CONSENSUS) --"
  RUN1_LINE=$(run_two_leg "$USER_INTENT" "$CONSENSUS") || { echo "FAIL: RUN 1 hit a documented BLOCK (above) — full mandate REQUIRED for LIVEDEP-02"; exit 1; }
  parse_result RUN1 "$RUN1_LINE"
  # Persist run-1 IMMEDIATELY, BEFORE run-2's first send (MAJOR-2 idempotency).
  {
    echo "RUN1_DECISIONID='$RUN1_DECISIONID'"
    echo "RUN1_SCHOOL='$RUN1_SCHOOL'"
    echo "RUN1_NOTIONAL='$RUN1_NOTIONAL'"
    echo "RUN1_SCHOOLTX='$RUN1_SCHOOLTX'"
    echo "RUN1_NOTIONALTX='$RUN1_NOTIONALTX'"
    echo "RUN1_STRATEGISTTX='$RUN1_STRATEGISTTX'"
    echo "RUN1_CONSENSUS='$CONSENSUS'"
    echo "RUN1_USERINTENT='$USER_INTENT'"
  } > "$RUN1_STATE"
  echo "  [persist] run-1 saved to $RUN1_STATE (re-invoke skips run-1)"
fi
echo "  RUN1: decisionId=$RUN1_DECISIONID school='$RUN1_SCHOOL' notional=$RUN1_NOTIONAL"

# ---- RUN 2 (genuinely divergent input) ----
echo "  -- RUN 2 (DIVERGENT intent='$USER_INTENT2', consensus=$CONSENSUS2) --"
DECISION_MOVED="false"; MOVE_NOTE=""
RUN2_DECISIONID=""; RUN2_SCHOOL=""; RUN2_NOTIONAL=""
RUN2_SCHOOLTX=""; RUN2_NOTIONALTX=""; RUN2_STRATEGISTTX=""
if RUN2_LINE=$(run_two_leg "$USER_INTENT2" "$CONSENSUS2"); then
  parse_result RUN2 "$RUN2_LINE"
  echo "  RUN2: decisionId=$RUN2_DECISIONID school='$RUN2_SCHOOL' notional=$RUN2_NOTIONAL"
  if [ "$RUN1_SCHOOL" != "$RUN2_SCHOOL" ] || [ "$RUN1_NOTIONAL" != "$RUN2_NOTIONAL" ]; then
    DECISION_MOVED="true"
    echo "== DECISION-MOVES PROVEN: run1(school='$RUN1_SCHOOL',notional=$RUN1_NOTIONAL) != run2(school='$RUN2_SCHOOL',notional=$RUN2_NOTIONAL) =="
  else
    MOVE_NOTE="decision did not move for these inputs — agent-sensitivity finding, NOT a silent pass"
    echo "== DOCUMENTED NO-MOVE: run1(school='$RUN1_SCHOOL',notional=$RUN1_NOTIONAL) == run2(school='$RUN2_SCHOOL',notional=$RUN2_NOTIONAL): $MOVE_NOTE =="
  fi
else
  MOVE_NOTE="run-2 BLOCK surfaced above — decision-moves unproven for these inputs, NOT a silent pass"
  echo "== DOCUMENTED NO-MOVE: $MOVE_NOTE (run-1 mandate stands; decisionIds: run1=$RUN1_DECISIONID run2=<no result>) =="
fi

# ---- Persist BOTH runs for Task 3's publish + the SUMMARY ----
{
  echo "CONSUMER='$CONSUMER'"
  echo "MACRO_ORACLE='$MACRO_ORACLE'"
  echo "DATA_KEY='$DATA_KEY'"
  echo "RPC='$RPC'"
  echo "PLATFORM='$PLATFORM'"
  echo "LLM_AGENT_ID='$LLM_AGENT_ID'"
  echo "LLM_DEPOSIT='$LLM_DEPOSIT'"
  echo "RUN1_DECISIONID='$RUN1_DECISIONID'"
  echo "RUN1_SCHOOL='$RUN1_SCHOOL'"
  echo "RUN1_NOTIONAL='$RUN1_NOTIONAL'"
  echo "RUN1_SCHOOLTX='$RUN1_SCHOOLTX'"
  echo "RUN1_NOTIONALTX='$RUN1_NOTIONALTX'"
  echo "RUN1_STRATEGISTTX='$RUN1_STRATEGISTTX'"
  echo "RUN1_CONSENSUS='$CONSENSUS'"
  echo "RUN1_USERINTENT='$USER_INTENT'"
  echo "RUN2_DECISIONID='$RUN2_DECISIONID'"
  echo "RUN2_SCHOOL='$RUN2_SCHOOL'"
  echo "RUN2_NOTIONAL='$RUN2_NOTIONAL'"
  echo "RUN2_SCHOOLTX='$RUN2_SCHOOLTX'"
  echo "RUN2_NOTIONALTX='$RUN2_NOTIONALTX'"
  echo "RUN2_STRATEGISTTX='$RUN2_STRATEGISTTX'"
  echo "RUN2_CONSENSUS='$CONSENSUS2'"
  echo "RUN2_USERINTENT='$USER_INTENT2'"
  echo "DECISION_MOVED='$DECISION_MOVED'"
  echo "MOVE_NOTE='$MOVE_NOTE'"
} > "$RUNS_STATE"
echo "  [persist] both runs saved to $RUNS_STATE"

echo "== Phase-18 done: CONSUMER=$CONSUMER run1=$RUN1_DECISIONID run2=${RUN2_DECISIONID:-<none>} decisionMoved=$DECISION_MOVED =="
# A no-move / run-2-BLOCK is a DOCUMENTED finding (exit 0). Run-1 with a full mandate is the LIVEDEP-02 floor.
exit 0
