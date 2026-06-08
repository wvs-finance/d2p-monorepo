---
phase: 13-macrohedgeexecutor-mint
plan: 03
subsystem: testing
tags: [solidity, foundry, bulloak, btt, invariant, fuzz, cost-ledger, somi, evm-tdd]

# Dependency graph
requires:
  - phase: 11-macrohedgestrategist
    provides: "the decisionId = bytes32(requestId) join key + the actionSet/sizeSet idempotency-flag precedent"
  - phase: 08-longgammawrapper-cashflow
    provides: "the Handler-drives-ledger + named invariant_* + mutation-proven-non-vacuous fuzz pattern (LongGammaWrapper.invariants.t.sol)"
provides:
  - "contracts/src/OperationalCostManagement.sol — the cummCost accumulator keyed by decisionId (budgeted agent SOMI + data cost across Agent 1 leg 0 + Agent 2 leg 1)"
  - "accrueAgentCost(bytes32 decisionId, uint8 leg, uint256 somi) + accrueDataCost(bytes32, uint256) + totalCost(bytes32) read"
  - "invariant_costConserved (cummCostSomi == Σ_d costOf[d].agentCostSomi) at the [invariant] floor, mutation-proven non-vacuous"
  - "per-(decisionId,leg) idempotency guard (agentLegAccrued) + per-decision dataAccrued guard"
affects: [13-02-macrohedgeexecutor-promotion, premium-split, data-cost-reimbursement, xchain-settlement]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "EXEC-03 cost ledger: cummCost accumulator keyed by decisionId, per-(decisionId,leg) idempotency, conservation invariant — mirrors Phase-9 invariant_dataCostConserved + Phase-8 mutation discipline"
    - "TWO-DISTINCT-MUTATION non-vacuity: conservation (asymmetric drift) and idempotency (dropped guard) are SEPARATE assertions broken by SEPARATE mutations — the conservation invariant is provably BLIND to symmetric double-counting"

key-files:
  created:
    - "contracts/src/OperationalCostManagement.sol"
    - "contracts/test/instrument/OperationalCostManagement.tree"
    - "contracts/test/instrument/OperationalCostManagement.t.sol"
  modified: []

key-decisions:
  - "Canonical 3-arg accrueAgentCost(bytes32 decisionId, uint8 leg, uint256 somi) — the §7 2-arg quote was the research starting point, REFINED to add `leg` so per-(decisionId,leg) idempotency is enforceable (Agent 1 = leg 0, Agent 2 = leg 1)"
  - "Idempotency enforced as revert AlreadyAccrued (the plan permitted revert OR no-op); tests wrap the 2nd accrue in try/catch so the unchanged-accumulator assertion holds either way"
  - "Conservation invariant reads Σ_d costOf[d] from the ACTUAL ledger lines (via totalCost) AND cross-checks an independent handler mirror — the global-vs-mirror-only form did NOT catch the asymmetric mutation"
  - "Non-vacuity asserted in a dedicated unit leaf, NOT inside the invariant body (a count-gate there false-fails the setup-time run-0 evaluation before any handler call)"

patterns-established:
  - "cummCost ledger: line + global move together under one guard (conservation holds); the guard is what makes idempotency hold (dropping it doubles BOTH sides symmetrically, which conservation cannot see)"
  - "M3 distinction codified: conservation ≠ idempotency — two assertions, two mutations, both recorded"

requirements-completed: [EXEC-03]

# Metrics
duration: 8min
completed: 2026-06-06
---

# Phase 13 Plan 03: OperationalCostManagement cummCost Ledger Summary

**`cummCost` accumulator keyed by `decisionId` accruing budgeted agent SOMI + data cost across Agent 1 (leg 0) + Agent 2 (leg 1), under a fuzz-proven `invariant_costConserved` and a per-`(decisionId,leg)` idempotency guard — both mutation-proven non-vacuous by TWO DISTINCT mutations.**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-06-06T19:20:00Z
- **Completed:** 2026-06-06T19:28:00Z
- **Tasks:** 2 (TDD: RED then GREEN)
- **Files modified:** 3 (all created)

## Accomplishments
- Promoted the empty `OperationalCostManagement` stub to a demo-scoped `cummCost` ledger: `CostLine` struct, `costOf` keyed by `decisionId`, `cummCostSomi` + `cummDataCost` global accumulators, the 3-arg `accrueAgentCost(bytes32,uint8,uint256)` + `accrueDataCost(bytes32,uint256)` entry points, and the `totalCost(bytes32)` exit read.
- `invariant_costConserved` (`cummCostSomi == Σ_d costOf[d].agentCostSomi` AND `cummDataCost == Σ_d costOf[d].dataCost`) passes at the additive `[invariant]` floor (runs=16/depth=16, fail_on_revert=false) — **16 runs / 256 calls / 0 reverts**, with the bounded `OperationalCostHandler` genuinely exercised (`act_accrueAgent` 121 / `act_accrueData` 135 calls).
- BOTH non-vacuity mutations proven (the M3 gate finding — see Deviations/Issues for the verbatim figures): conservation broken by asymmetric drift; idempotency broken by a dropped guard. The conservation invariant is demonstrably BLIND to symmetric double-counting.
- NatSpec documents the budgeted-not-realized SOMI boundary + the no-settlement (XCHAIN-01 deferred) boundary + the per-component units/source.
- Iron-Law ancestry preserved (tree+RED `e3b9dc4` is an ancestor of impl `ceb5057`); `bulloak check` exit 0; `forge build` green.

## Task Commits

Each task was committed atomically (evm-TDD Iron Law: tree + FAILING test BEFORE impl):

1. **Task 1: RED — BTT `.tree` + FAILING conservation/idempotency suite** - `e3b9dc4` (test)
2. **Task 2: GREEN — promote `OperationalCostManagement` (cummCost + per-leg idempotency + conservation), mutation-proven** - `ceb5057` (feat)

_Task 2 also re-staged the refined `.t.sol` (the conservation-invariant correctness fix below) alongside the impl, within the same GREEN commit._

## Files Created/Modified
- `contracts/src/OperationalCostManagement.sol` (96 lines) - the `cummCost` ledger: `costOf` keyed by `decisionId`, `cummCostSomi`/`cummDataCost` accumulators, 3-arg `accrueAgentCost` + `accrueDataCost` under per-leg/per-decision idempotency guards, `totalCost` read, budgeted-not-realized + no-settlement NatSpec boundaries.
- `contracts/test/instrument/OperationalCostManagement.tree` (23 lines) - co-located bulloak-0.9.2 `when/it` BTT: accrueAgentCost fresh/2nd-time/different-leg, accrueDataCost fresh/2nd-time, totalCost read, many-decisions conservation leaf.
- `contracts/test/instrument/OperationalCostManagement.t.sol` (262 lines) - 8 unit leaves + the named `invariant_costConserved` (Σ-actual-lines + independent mirror) + the bounded `OperationalCostHandler` + the SEPARATE `test_accrueSameLegTwice_cummCostSomiUnchanged` idempotency leaf + the dedicated non-vacuity leaf.

## Decisions Made
- **Canonical 3-arg signature** `accrueAgentCost(bytes32 decisionId, uint8 leg, uint256 somi)` used everywhere (the §7 2-arg quote was the research STARTING POINT; the plan REFINED it). The `leg` param makes "accrued once per `(decisionId, leg)`" enforceable so Agent 1 (leg 0) and Agent 2 (leg 1) each accrue exactly once under one `decisionId`.
- **Idempotency = `revert AlreadyAccrued`** (the plan allowed revert OR no-op). Tests wrap the 2nd accrue in `try/catch`, so the "unchanged-accumulator" assertion holds regardless of the revert/no-op choice.
- **Conservation reads the ACTUAL ledger lines** (`Σ_d costOf[d]` via `totalCost`) AND cross-checks the independent handler mirror — see Issue 1 (the mirror-only form was insufficient for the asymmetric mutation).
- **Demo-scoped, no access control** — the unit/fuzz proof needs none; the executor becomes the caller in the cornerstone (wiring is Plan 02's settable concern, not this plan's). The ledger ACCRUES + CONSERVES only; real SOMI transfer / escrow is the deferred XCHAIN-01 path.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Conservation invariant compared global-vs-mirror instead of global-vs-Σ-actual-lines**
- **Found during:** Task 2 (GREEN — first mutation-1 run)
- **Issue:** The initial `invariant_costConserved` asserted `cummCostSomi == handler.mirrorAgentSum()`. Because the handler builds its mirror by adding `somi` on first accrual (the global side), MUTATION 1 (zero the per-line `costOf` only) did NOT break the equality — the invariant was not actually watching the per-line conservation it claimed to.
- **Fix:** Rewrote the invariant to sum the ACTUAL ledger lines (`Σ_d costOf[d].agentCostSomi` read via `totalCost(bytes32(i))` over the handler's bounded `DECISION_SET`) and assert `cummCostSomi == Σlines`, PLUS retain the independent mirror cross-check (catches a lockstep global+line drift). Made `DECISION_SET` public so the invariant iterates the same id range.
- **Files modified:** `contracts/test/instrument/OperationalCostManagement.t.sol` (my own file — in scope)
- **Verification:** With the fix, MUTATION 1 now FAILS the invariant with a real positive figure (below); the GREEN baseline still passes (16 runs / 0 reverts).
- **Committed in:** `ceb5057` (Task 2 commit)

**2. [Rule 1 - Bug] Non-vacuity `assertGt` inside the invariant body false-failed the setup-time run-0 evaluation**
- **Found during:** Task 2 (GREEN — first full-suite run)
- **Issue:** An `assertGt(handler.agentCallCount() + handler.dataCallCount(), 0)` placed INSIDE `invariant_costConserved` failed at "failed to set up invariant testing environment" (runs: 0, calls: 0) — Foundry evaluates the invariant once before driving the handler, when counts are legitimately 0.
- **Fix:** Removed the in-body count-gate (matching the proven `LongGammaWrapper.invariants.t.sol`, which asserts only the ordering/equality). Added a dedicated `test_conservationInvariant_isNonVacuous_handlerActuallyAccrues` unit leaf that drives the handler directly and asserts the call-counts + mirror sums moved.
- **Files modified:** `contracts/test/instrument/OperationalCostManagement.t.sol` (my own file — in scope)
- **Verification:** Full suite GREEN (10/10); the invariant runs at the floor; the dedicated leaf proves non-vacuity explicitly.
- **Committed in:** `ceb5057` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 test-correctness bugs, both on my own test file — no `src` behavior change, no scope creep).
**Impact on plan:** Both fixes were necessary to make the conservation invariant a HONEST proof (Issue 1) and to let it run at all under Foundry's invariant lifecycle (Issue 2). The contract surface and the plan's behavior spec are unchanged.

## Issues Encountered

### The TWO DISTINCT non-vacuity mutations (the M3 gate finding — verbatim evidence)

Both mutations were applied to `src/OperationalCostManagement.sol` one at a time and restored between. They break TWO DISTINCT assertions — the conservation invariant CANNOT prove idempotency.

**MUTATION 1 — CONSERVATION (asymmetric drift):** comment out `costOf[decisionId].agentCostSomi += somi;` so the global `cummCostSomi` moves but the per-line does NOT.
- Result: `invariant_costConserved` **FAILS** —
  `[FAIL: cummCostSomi == Sigma costOf agentCostSomi: 882397197328767578143505 != 0]`.
- The global accumulator drifted from the (now-zero) Σ of per-decision lines. Proves the conservation invariant is non-vacuous and genuinely watches asymmetric global-vs-line drift. Restored to green.

**MUTATION 2 — IDEMPOTENCY (dropped guard):** comment out `if (agentLegAccrued[decisionId][leg]) revert AlreadyAccrued();` so a 2nd accrue of the SAME `(decisionId, leg)` re-adds.
- Result A (the idempotency leaf): `test_accrueSameLegTwice_cummCostSomiUnchanged` **FAILS** —
  `[FAIL: cummCostSomi unchanged on re-accrue of same (d, leg): 14 != 7]` (the re-accrue doubled 7 → 14).
- Result B (conservation STILL HOLDS — proven with a throwaway `MutationConservationProbe`, then deleted): under the SAME symmetric double-count, both `cummCostSomi` AND `costOf[d].agentCostSomi` doubled to 14, so `cummCostSomi == Σ costOf agentCostSomi` **STILL PASSED** (`14 == 14`).
- This is the load-bearing M3 distinction: conservation is BLIND to symmetric double-counting, so idempotency MUST be proven by the SEPARATE leaf, never by the invariant. Restored to green.

### bulloak root-contract naming
The tree root `OperationalCostManagementTest::ledger` made bulloak expect a contract named `OperationalCostManagementTestledger` (it concatenates the `::modifier` suffix, per the `MacroHedgeStrategistlifecycle` precedent). Dropped the `::ledger` modifier so the root identifier is exactly `OperationalCostManagementTest` (the conventional Foundry test name) → `bulloak check` exit 0.

## Coordination Note (Wave 1, parallel with 13-01)
Touched ONLY my `files_modified` (`OperationalCostManagement.{sol,tree,t.sol}`). Did NOT edit `foundry.toml` — reused the already-present additive `[invariant]` floor (runs=16/depth=16, fail_on_revert=false). Staged ONLY my specific files before each commit (never `git add -A`). The sibling 13-01 agent landed `PolygonPools` + a `polygon (137)` `rpc_storage_caching` entry + its SUMMARY (`a91a708`, `ebea287`, `eda74bf`) in parallel; my two commits interleave cleanly with zero file conflicts. This is a PURE in-memory unit/fuzz contract — NO fork, so it does NOT 429.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- EXEC-03 satisfied: the `cummCost` ledger is built, conserved, and idempotent, with both non-vacuity proofs recorded.
- Plan 02 (executor promotion) can wire `OperationalCostManagement` as a settable field (`costLedger`) and call `accrueAgentCost`/`accrueDataCost` — this plan deliberately did NOT make it a ctor requirement, so it does not block Plan 02.
- No blockers. The realized-vs-budgeted SOMI boundary is documented (realized `executionCost` is structurally absent on Somnia); the ledger accrues the budgeted forwarded figure as designed.

## Self-Check: PASSED

---
*Phase: 13-macrohedgeexecutor-mint*
*Completed: 2026-06-06*
