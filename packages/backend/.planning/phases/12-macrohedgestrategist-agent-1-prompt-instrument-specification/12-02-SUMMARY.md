---
phase: 12-macrohedgestrategist-agent-1-prompt-instrument-specification
plan: 02
subsystem: contracts
tags: [solidity, evm-tdd, hedge-mandate, macro-hedge-strategist, agent-1, somnia-llm-inference, two-type-seam, polygon]

# Dependency graph
requires:
  - phase: 12-01
    provides: "src/types/HedgeMandate.sol (the Agent-1 output type) + src/interfaces/IMacroThesis.sol (MacroThesisRegistry: schoolLabels/thesisOf/promptBias) — both imported by the re-semantic'd strategist"
  - phase: 13-macrohedgeexecutor-agent-2-mint
    provides: "PolygonPools.POLYGON_WCOP_USDC_POOL_ID() — the underlyingMarket anchor filled at the join"
provides:
  - "src/instrument/MacroHedgeStrategist.sol — re-semantic'd Agent 1: requestSchoolDecision (inferString over schoolLabels()) + requestNotionalDecision (inferNumber [MIN_NOTIONAL, MAX_NOTIONAL]); the join assembles a HedgeMandate, emits StrategistDecided(decisionId, school, mandate); getMandate + decisionState single-struct getters"
  - "test/instrument/MacroHedgeStrategist.{tree,t.sol} — the re-pointed BTT spec + 19/19-green MockPlatform unit suite (v1 17 + M2 below-MIN floor-UP + STRAT-02 well-formedness)"
  - "docs/UI-AGENT-HANDOFF.md — StrategistDecided reconciled to the HedgeMandate shape (Pitfall 7) with a dated frontend-coordination note"
affects: [13 (Agent 2 resolveFromMandate consumes getMandate), 15 (UI E2E subscribes to StrategistDecided)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "RESEARCH Pattern 3 (embedded mandate): the HedgeMandate lives INSIDE the PendingMandate slot, filled field-by-field as the two legs land and emitted WHOLE at the join — NOT freshly-assembled-in-memory"
    - "B1 single-struct getters: getMandate -> HedgeMandate memory, decisionState -> DecisionState memory; member access compiles, the auto-getter positional tuple does NOT (solc 0.8.24 Error 9582 — the v1 getDecision lesson)"
    - "Provenance discipline: schoolLabel + economicTheory written by the SCHOOL CALLBACK (when thesisOf resolves), never the entrypoint"
    - "Two-type Agent-1/Agent-2 seam: Agent 1 emits intent (HedgeMandate); the leg geometry is Agent 2's representativeness output (Phase 14)"

key-files:
  created: []
  modified:
    - "contracts/src/instrument/MacroHedgeStrategist.sol"
    - "contracts/test/instrument/MacroHedgeStrategist.tree"
    - "contracts/test/instrument/MacroHedgeStrategist.t.sol"
    - "docs/UI-AGENT-HANDOFF.md"

key-decisions:
  - "Fork A = caller-supplied free-text intent (4B): requestSchoolDecision takes string userIntent AND keeps bytes32 dataKey + int256 consensus, so the live macro datum + the e2e consensus knob still ride into the prompt; the notional leg rebuilds the prompt deterministically from the stored (userIntent, macroValue, consensus) + the school's promptBias fragment"
  - "Fork B = handle-resolving registry (decided in Plan 01): the school callback stores the resolved IMacroThesis handle from MacroThesisRegistry.thesisOf"
  - "Notional bounds = [1_000, 100_000_000] WHOLE USD (Pitfall 4 — NOT bps, NOT the [1,127] optionRatio)"
  - "M2 behavior change vs v1: a positive raw BELOW MIN_NOTIONAL floors UP to MIN_NOTIONAL (v1 floored small positives to 0). Clamp: raw <= int256(MIN_NOTIONAL) ? MIN_NOTIONAL : (uint256(raw) > MAX_NOTIONAL ? MAX_NOTIONAL : uint256(raw)) — so negatives AND sub-floor positives both land at MIN_NOTIONAL"
  - "B1: decisionState returns a SINGLE DecisionState struct (NOT a 4-value tuple); getMandate returns a HedgeMandate struct — member access compiles"
  - "B2: requestNotionalDecision reverts UnknownDecision unless schoolSet==true — every notional leaf must complete the school FIRST"

requirements-completed: [STRAT-01, STRAT-02]

# Metrics
duration: 6min
completed: 2026-06-06
---

# Phase 12 Plan 02: MacroHedgeStrategist re-semantic (prompt -> HedgeMandate) Summary

**Surgically re-semantic'd the live Phase-11 `MacroHedgeStrategist` (CONSUMER 0xfA428171… on Somnia testnet) to emit a `HedgeMandate` instead of an action/sizeBps decision — keeping the two-entrypoint / block-independent-`decisionId` cross-block join / inherited auth-CEI-replay / try-catch decode-safety / 32-byte-int-guard spine VERBATIM, and changing ONLY: Leg 1 `inferString` now decides the economic SCHOOL over `MacroThesisRegistry.schoolLabels()`, Leg 2 `inferNumber` decides the TARGET NOTIONAL, and the join assembles + stores + emits a `HedgeMandate` exposed via `getMandate`/`decisionState`. evm-TDD: tree+failing test (RED) committed BEFORE the impl (GREEN); 19/19 unit-green; full fork-free suite 97/97 with no sibling regressions; UI-handoff reconciled.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-06-06T22:09:48Z
- **Completed:** 2026-06-06T22:16:32Z
- **Tasks:** 3
- **Files modified:** 4 (0 created, 4 modified)

## Accomplishments

- **Task 1 (RED):** Re-labeled `test/instrument/MacroHedgeStrategist.tree` (bulloak 0.9.2 `when/it` keyword form, ASCII) to the school/notional/mandate leaves — including the STRAT-02 `when a mandate is assembled` branch and the M2 `below MIN_NOTIONAL` floor-up leaf — and mirrored the v1 17/17 harness re-pointed (`_fireSchool`/`_completeSchool`/`_fireNotional`) into the unit suite. `bulloak check` exit 0. The suite FAILS to compile against the old v1 API NAMING the missing `requestSchoolDecision` (M3 — RED for the right reason, a missing-API compile error, not a typo). Committed BEFORE any `src/` change (Iron Law).
- **Task 2 (GREEN):** Overwrote `src/instrument/MacroHedgeStrategist.sol` applying exactly the prescribed changes: `requestSchoolDecision(string userIntent, bytes32 dataKey, int256 consensus)` fires `inferString` over `schoolLabels()`; `requestNotionalDecision(decisionId)` fires `inferNumber([MIN_NOTIONAL, MAX_NOTIONAL])` behind the B2 `schoolSet` gate; the school callback resolves `thesisOf` to a handle (no default write) and writes `schoolLabel` + `economicTheory`; the notional callback clamps with the M2 floor-UP; the join fills the anchor/chainId/isLong, sets `decidedAt`, and emits `StrategistDecided`. `getMandate` + `decisionState` are SINGLE-struct getters (B1). `forge build` exit 0; the Task-1 suite turns 19/19 GREEN. Committed AFTER the RED commit (Iron-Law ancestry verified via `git merge-base --is-ancestor`).
- **Task 3 (regression + doc):** Full fork-free suite `forge test --no-match-path 'test/**/*{fork,invariants}*'` = **97 passed, 0 failed, 0 skipped** (13 suites, ~450ms — no Base fork touched). No sibling regressions: MacroHedgeStrategist 19/19, PolygonPools 3/3, OperationalCostManagement 10/10 (incl. the in-memory `invariant_costConserved`, 16 runs/256 calls/0 reverts). Reconciled `docs/UI-AGENT-HANDOFF.md` §4/§5 (and the §3 status row) to the HedgeMandate-shaped `StrategistDecided` with a dated 2026-06-06 frontend-coordination note. Documentation-only.

## Task Commits

Each task was committed atomically (Iron-Law ancestry: RED → GREEN → docs):

1. **Task 1: RED — tree + failing mandate suite** - `6fe4c32` (test)
2. **Task 2: GREEN — re-semantic MacroHedgeStrategist** - `7101acb` (feat)
3. **Task 3: docs — reconcile UI-AGENT-HANDOFF** - `68e34d0` (docs)

**Plan metadata:** (this docs commit)

## Files Modified

- `contracts/src/instrument/MacroHedgeStrategist.sol` — re-semantic'd: school leg + notional leg + HedgeMandate assembly/emit + getMandate/decisionState. Spine kept verbatim; old action/sizeBps API removed.
- `contracts/test/instrument/MacroHedgeStrategist.tree` — re-pointed BTT spec (school/notional/mandate leaves).
- `contracts/test/instrument/MacroHedgeStrategist.t.sol` — 19/19 MockPlatform unit suite mirroring the v1 pattern re-pointed.
- `docs/UI-AGENT-HANDOFF.md` — StrategistDecided event schema reconciled to the HedgeMandate shape (Pitfall 7).

## Decisions Made

### Fork A — Prompt provenance: CALLER-SUPPLIED FREE-TEXT INTENT (4B)

`requestSchoolDecision` takes `string calldata userIntent` AND keeps `bytes32 dataKey` + `int256 consensus`. The free-text intent matches the UI's free-text box and makes the (deferred) live "different prompt → different mandate" proof literal; determinism is preserved by the contract-constant `SYSTEM_PROMPT` + `chainOfThought=false` + the registry `allowedValues` (the model cannot return out-of-set). The live macro datum (`scaledValue`) and the e2e `consensus` knob still ride into the prompt (preserving the v1 oracle-read provenance). The notional leg rebuilds the prompt deterministically from the stored `(userIntent, macroValue, consensus)` + the chosen school's `promptBias` fragment.

### Fork B — Registry shape: HANDLE-RESOLVING (decided in Plan 01)

The school callback stores the resolved `IMacroThesis` handle from `MacroThesisRegistry.thesisOf` — zero translation into `HedgeMandate.economicTheory` / `HedgeLegParams.economicTheory` at the Phase-14 hand-off.

### Notional bounds + the M2 behavior change vs v1

`MIN_NOTIONAL = 1_000`, `MAX_NOTIONAL = 100_000_000` — **whole USD notional units**, NOT bps and NOT the resolver's `[1,127]` optionRatio (Pitfall 4). **Behavior change vs v1:** a positive raw BELOW the floor now floors UP to `MIN_NOTIONAL` (v1 floored small positives to 0). The single clamp expression `raw <= int256(MIN_NOTIONAL) ? MIN_NOTIONAL : (uint256(raw) > MAX_NOTIONAL ? MAX_NOTIONAL : uint256(raw))` lands BOTH negatives and sub-floor positives at `MIN_NOTIONAL`, and over-cap at `MAX_NOTIONAL`. Unit-proven by the in-range (50_000), over-max (200_000_000), positive-below-MIN (500), and negative (-5) leaves.

### B1 — single-struct getters (the getDecision-tuple lesson)

`decisionState(id)` returns a SINGLE `DecisionState { bool schoolSet; bool notionalSet; uint64 decidedAt; string schoolLabel; }` struct in memory, and `getMandate(id)` returns a `HedgeMandate memory`. Member access (`.schoolSet`, `.targetNotional`) compiles; a positional-tuple auto-getter does NOT (solc 0.8.24 Error 9582) — mirroring the v1 `getDecision` struct-return precedent (the old contract's `:254-260`).

### B2 — school-first precondition on the notional leg

`requestNotionalDecision` reverts `UnknownDecision` unless `schoolSet == true`. So every notional-callback leaf in the suite completes the school FIRST (`_completeSchool("SHILLER_MACRO_RISK")` → `_fireNotional` → fulfill) — mirroring the v1 size leaves doing `_completeAction` before `_fireSize`. A bare `_fireNotional` on an un-school'd decision reverts before the clamp ever runs.

### Spine kept VERBATIM vs re-pointed

- **Verbatim:** `decisionId = bytes32(requestId)` (block-independent join); the `try this.decodeString(result) { ... } catch { DecisionFailed }` decode-safety; the `result.length != 32` notional length guard; the inherited `handleResponse` (NOT re-declared — only `_onResult` overridden, count 0); the `IMacroOracleLatest` read seam; the constructor; the `HedgeDecisionRequested`/`DecisionFailed` events; the `UnknownKey`/`UnknownDecision` errors; the `delete _leg/_decisionKey` CEI.
- **Re-pointed:** Leg 1 `_mapAction` → `MacroThesisRegistry.thesisOf`; Leg 2 clamp bounds `[0, MAX_SIZE_BPS]` → `[MIN_NOTIONAL, MAX_NOTIONAL]` with the M2 floor-UP; `Leg { None, Action, Size }` → `Leg { None, School, Notional }`; `HedgeDecision` storage → `PendingMandate` (embedding the `HedgeMandate`); `HedgeDecisionMade` → `StrategistDecided`; `getDecision` → `getMandate` + `decisionState`; `_buildPrompt` → `_buildSchoolPrompt` + `_buildNotionalPrompt`.
- **Removed (count 0):** `MAX_SIZE_BPS`, `HedgeAction`, `HedgeDecisionMade`, `_mapAction`.

## Deviations from Plan

**Minor in-scope extension (documentation):** In addition to the plan's §4/§5 reconcile of `docs/UI-AGENT-HANDOFF.md`, I also updated the §3 status-table row for `MacroHedgeStrategist` (it still described the v1 `HedgeDecision{action,sizeBps}` and the pre-correction `HedgeLegParams` target, which the landed work directly contradicts and would mislead the frontend agent). This is the same Pitfall-7 documentation-coordination item, no contract change. No code deviation; no Rules 1-4 auto-fix triggered. The plan otherwise executed exactly as written.

## Issues Encountered

None affecting the result. One cosmetic note during the regression gate: forge printed `Warning: Failure from ".../OperationalCostManagementTest/invariant_costConserved" file was ignored because test contract bytecode has changed` — this is forge harmlessly discarding a stale cached invariant-failure replay after recompilation; the invariant then ran fresh and passed (16 runs / 256 calls / 0 reverts). No file change needed.

## Verification Results

The full plan `<verification>` block, all PASS:
- `forge test --match-path test/instrument/MacroHedgeStrategist.t.sol` → **19 passed, 0 failed, 0 skipped** (the full re-pointed leaf set: school request/callback, notional request/callback incl. the M2 below-MIN floor-up, cross-block join, mandate well-formedness, auth/replay).
- `forge test --no-match-path 'test/**/*{fork,invariants}*'` → **97 passed, 0 failed, 0 skipped** (13 suites). No sibling regressions; the Base-fork `LongGammaWrapper.invariants.t.sol` excluded by the path glob (empirically verified via `forge test --list` — the glob drops ONLY that Base-fork file by name and KEEPS the in-memory `OperationalCostManagement.invariant_costConserved`).
- `bulloak check test/instrument/MacroHedgeStrategist.tree` → exit 0.
- Spine verbatim (grep): `decisionId = bytes32(requestId)`, `try this.decodeString`, `result.length != 32`; `function handleResponse` count 0 (base not re-declared).
- B1 getters return SINGLE structs: `returns (DecisionState memory)` + `returns (HedgeMandate memory)` present.
- STRAT-02 anchor wired: `PolygonPools.POLYGON_WCOP_USDC_POOL_ID` present; the well-formedness + join leaves assert it field-by-field.
- Old API gone (count 0): `MAX_SIZE_BPS|HedgeAction|HedgeDecisionMade|_mapAction`.
- Iron-Law ancestry: `git merge-base --is-ancestor 6fe4c32 7101acb` → RED precedes GREEN.
- UI-AGENT-HANDOFF reconciled: the HedgeMandate-shaped `StrategistDecided` present; the stale `StrategistDecided(uint256 indexed requestId, string thesis, HedgeLegParams spec)` gone (count 0); dated `Reconciled 2026-06-06` note present.

## Requirements Completed

- **STRAT-01:** The contract emits a `HedgeMandate` via the two-leg flow (Leg 1 `inferString` → school over `schoolLabels()`; Leg 2 `inferNumber` → target notional), with the block-independent cross-block join, decode-safety, and inherited auth/replay all unit-proven against MockPlatform. (Live "different prompt → different mandate" clause DEFERRED — see below.)
- **STRAT-02:** `getMandate(decisionId)` returns a well-formed mandate — `underlyingMarket == POLYGON_WCOP_USDC_POOL_ID()`, `economicTheory` resolvable (non-zero handle), `targetNotional in [MIN_NOTIONAL, MAX_NOTIONAL]`, `chainId == 137`, `isLong == true` — and the field types copy into a `HedgeLegParams` scratch struct (compile-time hand-off-readiness proof; NO Phase-14 geometry).

## LIVE-PROOF DEFERRAL (M4) — stated explicitly, NOT delivered this phase

STRAT-01's live "different prompt → different mandate on Somnia testnet" clause is **DEFERRED**. Phase 12 proves the mechanics OFFLINE against MockPlatform only (19/19). Adapting `script/macro-hedge-strategist-e2e.sh` (it currently hard-codes the v1 `requestActionDecision`/`requestSizeDecision` flow + the v1 `getDecision(...)` tuple ABI; it must re-point to `requestSchoolDecision`/`requestNotionalDecision`/`getMandate`+`decisionState`) and running the live STT-spending proof is a **Manual-Only `workflow_dispatch` follow-up, NOT a Phase-12 CI gate**. Before that run, re-confirm `LLM_AGENT_ID` (`12847293847561029384`) AND the testnet platform `0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776` against the Agent Explorer (CLAUDE.md stop-gap caveat — the address is volatile). This mirrors the Phase-11 e2e script.

## User Setup Required

None — Somnia-native substrate, no fork, no secrets, no deployment this plan. (The deferred live e2e run, when undertaken manually, needs the STT-funded wallet `0xF3c3…0a90` key already in `contracts/.env`.)

## Next Phase Readiness

- `getMandate(decisionId)` is the typed accessor Phase-13 Agent-2 `resolveFromMandate` consumes (near pass-through of the four matching fields + the targetNotional feeding the feasible-sizing derivation).
- `StrategistDecided(bytes32 decisionId, string school, HedgeMandate mandate)` is the event the Phase-15 UI subscribes to — the UI doc is reconciled to this shape with the frontend-coordination note.
- No blockers.

## Self-Check: PASSED

- FOUND: contracts/src/instrument/MacroHedgeStrategist.sol
- FOUND: contracts/test/instrument/MacroHedgeStrategist.tree
- FOUND: contracts/test/instrument/MacroHedgeStrategist.t.sol
- FOUND: docs/UI-AGENT-HANDOFF.md
- FOUND: .planning/phases/12-macrohedgestrategist-agent-1-prompt-instrument-specification/12-02-SUMMARY.md
- FOUND commit: 6fe4c32 (Task 1 — RED)
- FOUND commit: 7101acb (Task 2 — GREEN)
- FOUND commit: 68e34d0 (Task 3 — docs)

---
*Phase: 12-macrohedgestrategist-agent-1-prompt-instrument-specification*
*Completed: 2026-06-06*
