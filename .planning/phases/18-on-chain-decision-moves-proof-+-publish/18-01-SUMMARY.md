---
phase: 18-on-chain-decision-moves-proof-+-publish
plan: 01
subsystem: infra
tags: [somnia, testnet, llm-inference, strategist, decision-moves, blocked, validator-callback]

# Dependency graph
requires:
  - phase: 17-live-deploy-pre-flight-surface-verification
    provides: the live two-leg MacroHedgeStrategist deploy (0xf0570CcB…7b1D) + the adapted runner
provides:
  - "An extended, fully-committed two-leg decision-moves runner (run_two_leg + divergent run-2 + idempotent persist + conditional oracle refresh)"
  - "A local-only extracted MacroHedgeStrategist ABI (script/out/MacroHedgeStrategist.abi.json) carrying StrategistDecided"
  - "A DOCUMENTED on-chain BLOCK: Somnia testnet validator LLM-inference callbacks are not landing (school-leg requests mine on-chain but no decision callback returns)"
affects: [frontend-live-agent-1, 18-02-retry-when-infra-recovers]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Conditional oracle refresh: skip the flaky json-fetch requestMacro when latest(DATA_KEY).deliveredAt != 0 (an already-delivered datum satisfies the strategist read)"
    - "decisionId-bound per-run log/state capture so run-2 can never re-read run-1's log on a reused CONSUMER"

key-files:
  created:
    - .planning/phases/18-on-chain-decision-moves-proof-+-publish/18-01-SUMMARY.md
    - contracts/script/out/MacroHedgeStrategist.abi.json  # local-only (gitignored out/), valid ABI w/ StrategistDecided
  modified:
    - contracts/script/macro-hedge-strategist-e2e.sh  # Task 1/2 runner + conditional-refresh fix

key-decisions:
  - "Did NOT fabricate a mandate / JSON artifact / handoff reversal because no StrategistDecided ever landed — an unverifiable claim is explicitly unacceptable per the plan guardrails"
  - "Made the oracle refresh conditional on a cold datum (Rule 3) — the flaky keeper-proxy json-fetch was hard-failing the whole proof even though the on-chain datum was already delivered"
  - "Used the budgeted MAX_RETRY headroom (one 180s + one 300s attempt) before declaring the BLOCK — bounded, no runaway spend"

patterns-established:
  - "Conditional-refresh guard pattern for intermittent off-chain data legs"

requirements-completed: []  # NONE — LIVEDEP-02/03/04/05 all blocked by external validator-callback unavailability

# Metrics
duration: ~35min
completed: 2026-06-08
attempts: 3  # attempt-1 + 2026-06-08 keeper-restored re-attempt + 2026-06-08T17:55Z "validators-recovered" re-attempt — ALL THREE BLOCKED by validator callback no-show
---

# Phase 18 Plan 01: On-chain decision-moves proof + publish — DOCUMENTED BLOCK

**The two-leg `StrategistDecided` runner is fully built and committed, but the live on-chain proof is BLOCKED: Somnia testnet validator LLM-inference callbacks are not landing — school-leg requests mine on-chain (real txs, `status 0x1`) yet `decisionState` stays `(false,false,0,"")` through 180s and 300s timeouts, so no full `HedgeMandate` was produced and no honest artifact could be published.**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-06-08T14:08:04Z
- **Completed:** 2026-06-08 (BLOCKED)
- **Tasks:** Task 1 + Task 2 runner code committed; Task 2 live-run + Task 3 publish BLOCKED by infra
- **Files modified:** 1 (runner) + 1 local-only ABI

## Accomplishments
- Task 1 runner extension (`run_two_leg()` notional leg + decisionId-bound `StrategistDecided` capture + full-mandate assertion + `NEED_TOTAL` full-profile budget + tx-hash extractor self-test) — committed `8190564` (pre-existing, re-verified).
- Task 2 runner code (divergent `USER_INTENT2`/`CONSENSUS2` run-2, `DECISION-MOVES`/`DOCUMENTED NO-MOVE` branches, `.run1-state.env` idempotency, `.runs-state.env` persist) — present in `8190564`, all grep ACs pass, `bash -n` clean.
- **Rule-3 fix** (`187e347`): made the oracle refresh conditional on a cold datum — the keeper-proxy json-fetch returned `MacroFailed` (proxy root 404) and was hard-failing the whole proof even though the on-chain inflation datum was already delivered (`deliveredAt=1780927644`, `scaledValue=584`). With the fix the freshness gate passes and the proof reaches the LLM legs.
- Extracted the strategist ABI to `contracts/script/out/MacroHedgeStrategist.abi.json` (valid, contains `StrategistDecided`) — local-only, NOT force-staged because the deployment JSON it pairs with cannot be honestly written.

## Task Commits

1. **Task 1: run_two_leg() + notional leg + decisionId-bound StrategistDecided** — `8190564` (feat) — pre-existing from a prior session, re-verified this run (all ACs pass).
2. **Rule-3 fix: conditional oracle refresh** — `187e347` (fix).

(Task 2's live execution and Task 3's publish did not complete — see BLOCK.)

## Files Created/Modified
- `contracts/script/macro-hedge-strategist-e2e.sh` — two-leg runner + conditional-refresh fix.
- `contracts/script/out/MacroHedgeStrategist.abi.json` — extracted ABI (local-only, gitignored `out/`).

## Decisions Made
- **No fabrication.** No `StrategistDecided` ever fired and no notional tx was ever sent (the school leg never completed), so `somnia-strategist-deployment.json` cannot carry the three real `schoolTx/notionalTx/strategistDecidedTx` it requires, and `docs/UI-AGENT-HANDOFF.md` cannot be honestly reversed to "✅ LIVE — proven on-chain". Publishing either with placeholder/false hashes would push an unverifiable claim to the frontend — explicitly forbidden by the plan's guardrails. Left both untouched.
- **chainId=137 untouched; no secret echoed or committed; CONSUMER reused (no `forge create`).**

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Conditional oracle refresh on a cold datum**
- **Found during:** Task 2 (first live run)
- **Issue:** The unconditional `requestMacro` json-fetch leg returned `MacroFailed`/`TimedOut` (keeper-proxy root 404), hard-failing the proof — even though the on-chain inflation datum was already delivered (`deliveredAt != 0`), which satisfies the strategist's `latest(DATA_KEY)` read (no `UnknownKey`).
- **Fix:** Pre-check `latest(DATA_KEY).deliveredAt`; skip the json-fetch send when `!= 0`. Step 2b freshness gate remains the load-bearing precondition.
- **Files modified:** contracts/script/macro-hedge-strategist-e2e.sh
- **Verification:** `bash -n` clean; re-run skipped the refresh and reached the LLM legs.
- **Committed in:** `187e347`

---

**Total deviations:** 1 auto-fixed (1 blocking).
**Impact on plan:** The fix was necessary to even reach the LLM legs; it did not change scope. It did not resolve the BLOCK (the LLM-inference callback layer, separate from json-fetch, is also down).

## Issues Encountered — THE BLOCK (LIVEDEP-02/03/04/05)

**Somnia testnet validator inference callbacks are not landing.**

### Re-attempt 3 (2026-06-08T17:55Z, "validators-recovered" directive) — STILL BLOCKED

Ran again on the v2.1 directive that a fresh school-leg probe had reportedly gotten a 30s callback (`decisionState=(true,false,0,"SHILLER_MACRO_RISK")`). The full runner re-fired the school leg against the reused CONSUMER. Outcome: **same silent validator no-show — NO callback landed for the actual request this runner sent.**

- Pre-flight ALL PASS: chain-id 50312 ✓; balance 95.879 STT ✓ vs NEED_TOTAL 1.8 STT; FREE surface gate (platform code, v1 reachable, immutables read back) ✓; oracle datum fresh (`deliveredAt=1780927644`, `scaledValue=584`) → json-fetch refresh correctly SKIPPED; tx-hash self-test ✓.
- School-leg request fired and MINED on-chain, `status 1 (success)`, block `403972162`:
  - `schoolTx = 0x63d0bd6791e6782b515ddb7e3acc8c2b8b5f7e4fab7ba02d6ffa328feed1ba24`
  - deterministic `decisionId = 0x000000000000000000000000000000000000000000000000b24ac1afbcefc708` — **IDENTICAL to attempts 1 & 2** (same request bytes → same hash; the request side is byte-stable, confirming the bottleneck is purely the off-chain validator inference layer, and likely that the platform deduplicates this already-stalled request id rather than re-queueing it).
  - The platform `RequestCreated` event (`0xb623…6889`, topics requestId `0x566afb` + decisionId `0xb24a…c708`) IS present in the receipt — the request reached the platform; only the validator callback never returned.
- Bounded poll ~480s total (180s in-runner + a ~300s extended poll): `decisionState(decisionId)` = `(false, false, 0, "")` throughout 12 extra checks; NO `DecisionFailed` (0 logs bound to the decisionId), NO `StrategistDecided` — a silent validator no-show, identical to attempts 1 & 2.
- **STT spent this re-attempt:** wallet 95.879 → 95.627 = **~0.252 STT** (one school-leg deposit 0.24 + gas; within the ~1.6 STT reserve, no runaway). Irreversible.
- No `.run1-state.env` / `.runs-state.env` persisted (the school leg never completed) — no half-open decision stranded; a future recovery re-run is clean.
- **No notional leg sent, no `StrategistDecided` landed → LIVEDEP-02/03/04/05 remain BLOCKED.** Per guardrails: NO JSON artifact written, handoff NOT reversed, nothing fabricated.
- **NOTE for the next attempt:** because the request id is deterministic and has now stalled 3×, a recovery run should FORCE A DISTINCT decisionId (vary `USER_INTENT` or `CONSENSUS`) so the platform cannot dedupe it against the dead `0xb24a…c708` request — re-firing the byte-identical request may be the reason no callback ever returns even when validators are nominally live.

### Re-attempt 2 (2026-06-08, keeper-restored / fresh-datum retry) — STILL BLOCKED

Re-ran the proof per the v2.1 retry directive (keeper-proxy reportedly restored, MacroOracle datum fresh). Outcome: **same silent validator no-show — the LLM-inference callback layer has NOT recovered.**

- Pre-flight: chain-id 50312 ✓; oracle datum fresh (`deliveredAt=1780927644`, `scaledValue=584`) → json-fetch refresh correctly SKIPPED (conditional guard); keeper-proxy root still HTTP 404 (irrelevant — refresh skipped). All FREE surface gates + tx-hash self-test PASS.
- School-leg request fired and MINED on-chain, `status 1 (success)`:
  - `schoolTx = 0x4df212740763d16cbce225117a4cb3834008107c94310cb273e657a13c2fc4b0`
  - deterministic `decisionId = 0x000000000000000000000000000000000000000000000000b24ac1afbcefc708` (same as attempt-1 — confirms the request side is byte-identical and the bottleneck is purely the off-chain validator inference layer).
- Bounded poll ~480s total (180s in-runner + a 300s extended poll on the mined request): `decisionState(decisionId)` = `(false, false, 0, "")` throughout; NO `DecisionFailed`, NO `StrategistDecided` — a silent validator no-show, identical to attempt-1.
- **STT spent this re-attempt:** wallet 96.634 → 96.382 = **~0.252 STT** (one school-leg deposit 0.24 + gas; within the ~1.6 STT reserve, no runaway). Irreversible.
- No `.run1-state.env` / `.runs-state.env` persisted (the school leg never completed) — no half-open decision stranded; a future recovery re-run is clean.
- **No notional leg was ever sent, no `StrategistDecided` ever landed → LIVEDEP-02/03/04/05 remain BLOCKED.** Per guardrails: NO JSON artifact written, handoff NOT reversed, nothing fabricated.

### Attempt 1 evidence (retained)

Evidence (all real, on-chain, this run, against reused CONSUMER `0xf0570CcB1271FFaFf4caCA628F3632257f177b1D`, Somnia 50312):
- All FREE surface gates PASS: chain-id 50312, platform code present, v1 reachable, immutables read back (`PLATFORM 0x037Bb9…6776`, `ORACLE 0xAcA751…983f`, `LLM_AGENT_ID 12847293847561029384`), tx-hash extractor self-test PASS.
- Oracle freshness gate PASS (datum already delivered: `deliveredAt=1780927644`, `scaledValue=584`).
- School-leg request fired TWICE (bounded retry), both mined `status 0x1`:
  - attempt 1: `0x2a8230ccb08b67066e42ffb48e6a78b95bc650e9920f219b2f9767bba2b1f558` (180s timeout)
  - attempt 2: `0xb1ff1d17bb47f6f406f95730db45fc02e62274e2016a7192615041133282df02` (300s timeout)
  - deterministic decisionId both: `0x000000000000000000000000000000000000000000000000b24ac1afbcefc708`
- After both attempts: `decisionState(decisionId)` = `(false, false, 0, "")`; `getMandate(decisionId)` = all-zero. **No `StrategistDecided`, no `DecisionFailed`, no callback — a silent validator no-show.** The earlier json-fetch leg also `MacroFailed` (keeper-proxy 404).
- The on-chain request side works; the off-chain validator LLM-inference layer is unresponsive for this agent right now. Consistent with the documented Somnia reality (pruned `getRequest`, `SubcommitteePaid` never fires chain-wide, ~76% committee/infra-funded — validator inference is intermittent).
- **STT spent:** wallet 97.51 → 96.89 = ~0.63 STT across both bounded attempts (within the ~1.6 STT reserve; no runaway). Irreversible (deposits at risk; rebate unconfirmed on Somnia).

**Why no artifact was published:** LIVEDEP-02 (full mandate), LIVEDEP-03 (decision-moves), LIVEDEP-04 (JSON with 3 real tx hashes), and LIVEDEP-05 (reverse the §6 prohibition to "✅ LIVE — proven on-chain") ALL require a landed `StrategistDecided`. None landed. Per the plan: "an unverifiable claim is NOT acceptable" and "a persistent callback no-show is a documented BLOCK (exit 1)".

## Next Phase Readiness
- **Runner is ready.** Re-invoke when the Somnia validator inference layer recovers:
  ```
  cd contracts && CONSUMER=0xf0570CcB1271FFaFf4caCA628F3632257f177b1D \
    MACRO_ORACLE=0xAcA75144f644220f1dEAD5F989C350D8e0Cc983f \
    bash script/macro-hedge-strategist-e2e.sh
  ```
  The conditional refresh + idempotent run-1 persist mean a recovery re-run is cheap and safe.
- **Pre-flight liveness check before re-spending:** confirm the agent returns a callback (e.g. a single cheap school-leg probe → `schoolSet==true`) and/or that the keeper-proxy json-fetch source is reachable (currently 404). Faucet/agent liveness is browser-only.
- **BLOCKER for the frontend live-Agent-1 path remains open** — the published artifact + handoff reversal are deferred to a follow-up plan (18-02) that runs once infra recovers.

## Self-Check: PASSED

- Commits exist: `8190564` (Task 1/2 runner), `187e347` (conditional-refresh fix) — both FOUND in git log.
- `contracts/script/out/MacroHedgeStrategist.abi.json` exists and contains `StrategistDecided`.
- Runner `bash -n` parses clean.
- SUMMARY exists.
- LIVEDEP-02/03/04/05 NOT claimed complete — honestly recorded as BLOCKED.

---
*Phase: 18-on-chain-decision-moves-proof-+-publish*
*Completed: 2026-06-08 (DOCUMENTED BLOCK — not a pass)*
