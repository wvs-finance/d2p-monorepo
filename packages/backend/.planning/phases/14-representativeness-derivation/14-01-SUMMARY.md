---
phase: 14-representativeness-derivation
plan: 01
subsystem: testing
tags: [solidity, foundry, bulloak, panoptic-v2, tickmath, solady, post-keynesian, evm-tdd]

# Dependency graph
requires:
  - phase: 13-macro-hedge-executor
    provides: "the shipped MacroHedgeExecutor _resolveAndMint sink + VolToWidthLib + PolygonPools anchor that Plan 02 wires this lib onto"
  - phase: 12-macro-hedge-strategist
    provides: "the HedgeMandate intent-only type + IMacroThesis thin registry the resolveFromMandate path (Plan 02) consumes"
provides:
  - "IRegimeOracle.sol — the Z_t regime + observedAt staleness interface (mirrors the MacroOracle deliveredAt==0 unset precedent)"
  - "RepresentativenessLib — pure beta1(REGIME)x devaluation core + GBM-baseline width comparator + Fix-C structuralStrikeTick (decimal-gap-correct pre-snapped int24, ZERO inversion) + fail-safe effectiveRegime + DEFINED monotone feasibleOptionRatio + honesty output"
  - "MockRegimeOracle.sol — a settable IRegimeOracle test double (set / setStaleAt) mirroring MockMacroOracle"
  - "Representativeness.tree + .t.sol — the fork-free unit suite proving the >=1-param-!=-GBM binding constraint (continuous + quantized), beta1 asymmetry, staleness->STRESS, the exact-4485 Fix-C strike canary, monotone feasibleOptionRatio, and mutation non-vacuity"
affects: [14-02-executor-wiring, 14-03-fork-mint, representativeness, resolveFromMandate]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "bulloak-anchored leaf delegates to a VALIDATION-map-named test_ function (both real/runnable; bulloak check pins the BTT structure, the --match-test name carries the assertions)"
    - "Fix C: the structural strike is a pre-snapped int24 from sqrt(humanRate*1e12*Q192) -> getTickAtSqrtPrice -> snap (0-error fixed point), NOT a WAD inversion"
    - "regime-conditional vol asymmetry: regimeVol(STRESS) = baseVol*(WAD + (M(beta1_stress) - M(beta1_tranquil)))/WAD; TRANQUIL == GBM baseline by construction"

key-files:
  created:
    - contracts/src/interfaces/IRegimeOracle.sol
    - contracts/src/libraries/Representativeness.sol
    - contracts/test/mocks/MockRegimeOracle.sol
    - contracts/test/instrument/Representativeness.tree
    - contracts/test/instrument/Representativeness.t.sol
  modified: []

key-decisions:
  - "Fix C localized to RepresentativenessLib.structuralStrikeTick (the decimal-gap-correct pre-snapped int24); the broken WAD-to-sink inversion is DELETED (absent from every file this plan touches); PriceGridsLib/sink/demo untouched"
  - "The CONTINUOUS regimeVol(STRESS) > baseVol is the load-bearing tuning-invariant binding constraint; the QUANTIZED width divergence is secondary (one ceil-unit at the TEMPLATE vintage); TRANQUIL is NEVER asserted vs baseline (TRANQUIL == GBM)"
  - "feasibleOptionRatio is a DEFINED monotone clamp(notional/NOTIONAL_PER_RATIO, 1, 127) with NOTIONAL_PER_RATIO=1_000 (TEMPLATE) so a mid-band notional actually changes the ratio across [1,127]"
  - "base vol is TICK-SPACE throughout (the demo's 14_400 PayoffTerms.vol scale, NOT a WAD that sqrt-clamps to 4095)"

patterns-established:
  - "Mutation non-vacuity proven by collapsing beta1_stress -> beta1_tranquil inside regimeVol (excess->0): the CONTINUOUS regimeVol(STRESS)==baseVol and QUANTIZED width==gbmBaselineWidth go vacuous, then restored (the 13-03 dedicated-leaf discipline)"

requirements-completed: [REPR-01, REPR-02]

# Metrics
duration: 4min
completed: 2026-06-07
---

# Phase 14 Plan 01: Representativeness derivation substrate Summary

**Pure RepresentativenessLib (regime-conditional asymmetric beta1xdevaluation core + GBM-baseline comparator + Fix-C decimal-gap structuralStrikeTick + staleness->STRESS fail-safe + monotone feasibleOptionRatio), IRegimeOracle + MockRegimeOracle, and a fork-free unit suite proving the >=1-param-!=-GBM binding constraint mutation-non-vacuously and the exact-4485 strike to the tick.**

## Performance

- **Duration:** 4 min (continuation session wall-clock; the tree + RED commits landed in a prior session that died before the GREEN/docs step)
- **Started:** 2026-06-07T02:25:15Z
- **Completed:** 2026-06-07T02:29:16Z
- **Tasks:** 2 (TDD: RED already committed, GREEN this session)
- **Files modified:** 5 (all created)

## Accomplishments
- **RepresentativenessLib GREENs all 8 unit leaves** (17/17 including bulloak-anchored leaves) at TICK-SPACE vol scale: exact-4485 Fix-C strike, GBM-divergence continuous + quantized, beta1 asymmetry, staleness->STRESS, monotone feasibleOptionRatio, pure geometry round-trip, mutation non-vacuity.
- **Fix C proven to the tick before any assertion was baked** (throwaway forge probe): structuralStrikeTick(4485,60)==360360, (3900,60)==358980, (4095,60)==359460 with the real TickMath + FixedPointMathLib — the broken strikeWadForSink inversion is absent from every file this plan touches.
- **The beta1-collapse mutation was proven non-vacuous then restored** (the prior session left the mutant active, which is exactly why the suite was 13/17 on resume): continuous regimeVol(STRESS) 14400<=14400 and quantized width 20==20 both go vacuous under the mutant.
- **Whole fork-free test tree green** (114/114 across 14 suites) — Wave 1's responsibility met; no sibling regressions (PolygonPools 3/3, MacroHedgeExecutor onResult 4/4, OperationalCostManagement 10/10, MacroHedgeStrategist 19/19).

## Task Commits

Each task was committed atomically (TDD: tree -> RED test -> GREEN impl):

1. **Task 1: Representativeness.tree (BTT spec)** - `ac1a6e1` (test) — prior session
2. **Task 1: failing Representativeness unit suite (RED)** - `e5254cb` (test) — prior session; lists the tree + .t.sol + IRegimeOracle + MockRegimeOracle, NOT the impl (Iron Law)
3. **Task 2: RepresentativenessLib pure core (GREEN)** - `04471fa` (feat) — this session

**Plan metadata:** committed separately (docs: complete plan)

_Note: the gate-corrected MockRegimeOracle location (test/mocks/, not test/instrument/) was set in `12e48d9` (prior fix commit)._

## Files Created/Modified
- `contracts/src/interfaces/IRegimeOracle.sol` - the Z_t Regime{Unknown,Tranquil,Stress} + observedAt staleness interface (Unknown==0 default; mirrors MacroOracle deliveredAt==0 unset)
- `contracts/src/libraries/Representativeness.sol` - the pure PKE core: inflationAdjustment, effectiveRegime (fail-safe), regimeVol, regimeWidth, gbmBaselineWidth, structuralStrikeTick (Fix C), feasibleOptionRatio (DEFINED clamp), nonErgodicDisclosed + TEMPLATE_RATIONALE
- `contracts/test/mocks/MockRegimeOracle.sol` - settable IRegimeOracle double (set seeds a non-zero observedAt; setStaleAt pins an explicit ts)
- `contracts/test/instrument/Representativeness.tree` - the 8-leaf BTT spec (when/it keyword form, root RepresentativenessTest::representativenessCore)
- `contracts/test/instrument/Representativeness.t.sol` - the fork-free unit suite; each bulloak leaf delegates to a VALIDATION --match-test named function

## Decisions Made
- **Fix C is the ONLY strike path in this lib** — structuralStrikeTick returns the decimal-gap-correct snapped int24 directly; no strikeWadForSink, no exchangeRateToSqrtPriceX96 (both absent from all 5 files). Verified the ticks against the real libraries with a throwaway probe before writing the equality assertions, so the RED->GREEN transition could not chase a wrong constant.
- **The bulloak-vs-VALIDATION naming conflict was resolved by delegation** (a verified, in-repo-precedented pattern): bulloak 0.9.2 `check` derives the required test function name from the `when`/`given` clause (PascalCase) and tolerates ADDITIONAL functions, so each `test_When*/test_Given*` leaf delegates to the VALIDATION-map-named `test_*` carrying the assertions. Both are real, runnable, green functions; `bulloak check` exits 0 AND every `--match-test` string resolves.
- **Captured the mutation deltas before restoring** so the non-vacuity proof is recorded, not just asserted (see Issues Encountered).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Restored the beta1-collapse mutant that the prior session left active in regimeVol**
- **Found during:** Task 2 (resume) — the on-disk RepresentativenessLib was untracked and compiled, but the suite was 13 passed / 4 failed.
- **Issue:** line 90 of `regimeVol` read `inflationAdjustment(beta1TranquilWad, ...)` for BOTH `stressCap` and `tranquilCap` (the `// MUTANT: stress->tranquil` line) — the deliberate non-vacuity mutation, left un-restored when the prior session died. With excess==0, `regimeVol(STRESS)==baseVol`, failing the CONTINUOUS (`test_regimeVol_stressExceedsBaseline`) and QUANTIZED (`test_regimeWidth_differsFromGbmBaseline`) leaves (and their bulloak twins).
- **Fix:** `stressCap = inflationAdjustment(beta1StressWad, targetDevaluationWad)`. This IS the GREEN step Task 2 requires (write impl -> GREEN -> mutate to prove non-vacuity -> restore); the mutation was already proven (deltas captured below), only the restore was missing.
- **Files modified:** contracts/src/libraries/Representativeness.sol
- **Verification:** suite 17/17 (0 failed); all 8 VALIDATION leaves [PASS].
- **Committed in:** 04471fa (Task 2 GREEN commit)

**2. [Rule 3 - Blocking] Reworded two NatSpec comments to drop the literal deleted-name tokens**
- **Found during:** Task 2 — the Fix-C acceptance gates `! grep -q "strikeWadForSink"` and `! grep -q "exchangeRateToSqrtPriceX96"` against the impl.
- **Issue:** the impl's NatSpec explained what Fix C deleted by NAMING `strikeWadForSink` and `exchangeRateToSqrtPriceX96` in comments (lines 14, 129) — naive `grep -q` matched the comments, false-failing the gates even though no such CODE exists.
- **Fix:** reworded to "the broken WAD-to-sink inversion is deleted" and "feeding a re-derived R through the raw 1:1-decimal converter" — meaning preserved, literal tokens removed (the 08-01/08-02/12-01 NatSpec-vs-grep-AC precedent).
- **Files modified:** contracts/src/libraries/Representativeness.sol
- **Verification:** both tokens 0 occurrences; suite still 17/17; forge build exit 0.
- **Committed in:** 04471fa (Task 2 GREEN commit)

---

**Total deviations:** 2 auto-fixed (1 bug-restore, 1 blocking NatSpec-vs-grep)
**Impact on plan:** Both essential to land the plan's own gates. No scope creep — only the declared Representativeness.sol was edited; PriceGridsLib/MacroHedgeExecutor/demo untouched.

## Issues Encountered

**Continuation from a dead session (the documented 08-03/11-02/12-01 socket-death pattern).** On resume, the two RED commits (`ac1a6e1`, `e5254cb`) and an UNTRACKED `src/libraries/Representativeness.sol` already existed on disk. Iron Law was preserved at the commit level (the RED commit does NOT contain the impl). I independently re-verified EVERY Task-1 acceptance gate (bulloak check, all grep ACs, RED proof, tree-before-test ancestry) before touching the impl, then completed Task 2 (restore -> GREEN -> commit) — no rework, no faked-green.

**Mutation non-vacuity deltas (captured before restoring — the proof, not just the claim):**
- CONTINUOUS `test_regimeVol_stressExceedsBaseline`: `assertGt(14400, 14400)` -> FAIL `stress vol must strictly exceed the baseline vol: 14400 <= 14400` (STRESS vol collapsed to the baseline).
- QUANTIZED `test_regimeWidth_differsFromGbmBaseline`: `assertTrue(false, "stress width must diverge from the GBM baseline")` -> FAIL (wStress == wGbm == 20).
- The beta1 asymmetry leaf (`test_beta1_stressExceedsTranquil`) stays GREEN under this mutant because it calls `inflationAdjustment` directly (not via the mutated `regimeVol`) — correct: the mutation contract per the plan targets the CONTINUOUS regimeVol + QUANTIZED width divergence, which both went vacuous.
- After restoring `beta1StressWad`: regimeVol(STRESS)=15156 > 14400; wStress=21 != wGbm=20; suite 17/17.

## User Setup Required
None - no external service configuration required. Pure Solidity library + test double; no RPC, no secrets, no fork (the unit suite is sub-second, fork-free).

## Next Phase Readiness
- **IRegimeOracle + RepresentativenessLib + MockRegimeOracle are committed and importable by Plan 02** (executor wiring) and Plan 03 (fork mint). Signatures are EXACTLY as the coordination note locks: `structuralStrikeTick(uint256 humanRate, int24 ts)`, `feasibleOptionRatio(uint256 notional)`, `Regime{Unknown,Tranquil,Stress}`, `MockRegimeOracle.set/setStaleAt`.
- **No MacroHedgeExecutor file was touched this wave** (per the coordination note). Plan 02 owns the Fix-C sink split (`_resolveAndMintAtStrike(int24 strike)`) + the ctor 4->9 extension + migrating the Phase-13 onResult probe + the three fork ctor sites.
- The whole fork-free tree is green (114/114), so the Wave-2 importer starts from a clean compile.

---
*Phase: 14-representativeness-derivation*
*Completed: 2026-06-07*

## Self-Check: PASSED
- Created files all present: IRegimeOracle.sol, Representativeness.sol, MockRegimeOracle.sol, Representativeness.tree, Representativeness.t.sol, 14-01-SUMMARY.md.
- Commits all present: `ac1a6e1` (tree), `e5254cb` (RED), `04471fa` (GREEN).
