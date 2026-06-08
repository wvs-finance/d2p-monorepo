---
phase: 14-representativeness-derivation
verified: 2026-06-07T00:00:00Z
status: passed
score: 14/14 must-haves verified
re_verification: false
---

# Phase 14: Representativeness Derivation Verification Report

**Phase Goal:** The dedicated mathematical representativeness model that turns Agent-1's `HedgeMandate` into the actual option geometry (moneyness/strike/width/feasible-size = a `HedgeLegParams`). Derived `HedgeLegParams` is minted via an additive `resolveFromMandate` front-end on the shipped `MacroHedgeExecutor`; the representativeness decision is surfaced for the UI (`ExecutorDecided`).

**Verified:** 2026-06-07
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | STRESS vol strictly exceeds the GBM baseline (continuous load-bearing constraint); quantized STRESS width also differs from GBM width | VERIFIED | `test_regimeVol_stressExceedsBaseline` + `test_regimeWidth_differsFromGbmBaseline` both PASS in the 17/17 unit suite. `regimeVol` returns `baseVol * (WAD + excess) / WAD` where excess > 0 when β₁(STRESS) > β₁(TRANQUIL). Width snapping through `VolToWidthLib.volToWidth` (even-snap fix at line 32) means STRESS width diverges from GBM baseline. |
| 2 | β₁(STRESS) > β₁(TRANQUIL) produces strictly larger inflation adjustment | VERIFIED | `test_beta1_stressExceedsTranquil` PASSES. `inflationAdjustment(BETA1_STRESS_WAD, TARGET_DEVALUATION_WAD) > inflationAdjustment(BETA1_TRANQUIL_WAD, TARGET_DEVALUATION_WAD)` with BETA1_STRESS_WAD=0.35e18 > BETA1_TRANQUIL_WAD=0.10e18. |
| 3 | Stale or unset IRegimeOracle (observedAt==0 or beyond MAX_STALENESS) defaults to STRESS | VERIFIED | `test_staleOracle_defaultsToStress` PASSES both sub-cases: `observedAt==0` path and `nowTs - observedAt > MAX_STALENESS` path. Control case (fresh Tranquil) resolves to Tranquil, confirming non-vacuity. |
| 4 | `structuralStrikeTick(4485,60)==360360` AND `structuralStrikeTick(3900,60)==358980` EXACTLY — no band, no round-trip drift | VERIFIED | `test_structuralStrike_exactAt4485` PASSES with `assertEq` (not `assertApprox`). Fix-C implementation at `Representativeness.sol:136-138` uses `FixedPointMathLib.sqrt(humanRate * DECIMAL_GAP * Q192)` then `TickMath.getTickAtSqrtPrice` then snapped — zero inversion. The deleted WAD-path gave 361680 (off by 1320 ticks). |
| 5 | Mutation non-vacuity: collapsing β₁(STRESS) → β₁(TRANQUIL) makes both the continuous and quantized assertions vacuous | VERIFIED | `test_mutation_collapseBeta1_breaksNonVacuity` PASSES. With collapsed β₁ pair: `regimeVol(STRESS) == BASE_VOL` (continuous vacuity) and `regimeWidth(STRESS) == gbmBaselineWidth` (quantized vacuity). |
| 6 | `feasibleOptionRatio(notional)` is a DEFINED monotone map clamp(notional/NOTIONAL_PER_RATIO, 1, 127) | VERIFIED | `test_feasibleOptionRatio_monotoneFromNotional` PASSES: floor (returns 1 at notional 0), cap (saturates at 127), monotone non-decreasing loop, mid-band strict increase all verified. |
| 7 | Honesty output (nonErgodicDisclosed + TEMPLATE rationale) is a deterministic function of inputs | VERIFIED | `nonErgodicDisclosed()` is a pure function returning `true` (line 155). `TEMPLATE_RATIONALE` is a compile-time constant string. Both surface on `ExecutorDecided` confirmed by `test_executorDecided_surfacesHonestyFlag` PASSING on live fork. |
| 8 | `resolveFromMandate(HedgeMandate)` builds `HedgeLegParams` + mints via shared `_resolveAndMintAtStrike` with the Fix-C pre-snapped structural strike (zero inversion) | VERIFIED | `resolveFromMandate` at MacroHedgeExecutor.sol:197-259 calls `RepresentativenessLib.structuralStrikeTick(strikeRate, TICK_SPACING)` then passes the `int24` directly to `_resolveAndMintAtStrike`. No `strikeWadForSink` reference anywhere. |
| 9 | Structural strike is `360360` (K_hi = CANONICAL_COP_USD*115/100 = 4485 → exact tick) | VERIFIED | `CANONICAL_COP_USD=3900`, `strikeRate = 3900*115/100 = 4485`, `structuralStrikeTick(4485, 60) == 360360`. Confirmed by unit test AND fork test `test_resolveFromMandate_mintsThroughExecutor` with `assertEq(positionId.strike(legIndex), EXPECTED_KHI_STRIKE)` where `EXPECTED_KHI_STRIKE=360360`. |
| 10 | Phase-13 demo/direct path is byte-unchanged: `resolveAndMint(HedgeLegParams)` keeps strikeWAD→tick semantics; two `pool.dispatch` calls remain | VERIFIED | `resolveAndMint` at lines 144-157 computes strike via `TickMath.getTickAtSqrtPrice(PriceGridsLib.exchangeRateToSqrtPriceX96(legParams.strikeWAD))` and passes to `_resolveAndMintAtStrike`. Both dispatch blocks remain verbatim in `_resolveAndMintAtStrike` (lines 311-333). `test__takeDemoPosition__Succeeds` PASSES 6/6 in fork suite. |
| 11 | `ExecutorDecided` fires with `nonErgodicDisclosed==true` + TEMPLATE caveat before the mint | VERIFIED | `test_executorDecided_surfacesHonestyFlag` PASSES on live fork: `nonErgodicDisclosed==true` and `_contains(rationale, "TEMPLATE")==true`, decoded from `keccak256("ExecutorDecided(uint256,uint8,uint256,int24,int24,bool,bool,string)")` log. |
| 12 | `resolveAndMint(size=128)` reverts "optionRatio overflow" (shared sink's binding guard) | VERIFIED | `test_resolveAndMint_sizeOver127_reverts` PASSES. `require(legParams.size <= 127, "optionRatio overflow")` at `_resolveAndMintAtStrike` line 281. Mandate path cannot reach 128 (feasibleOptionRatio clamps to [1,127]). |
| 13 | LLM-independence is BEHAVIORAL: geometry mints identical strike 360360 with a reverting platform | VERIFIED | `test_resolveFromMandate_llmIndependentGeometry` PASSES. `MockRevertingPlatform` reverts on every call; `resolveFromMandate` still mints at `strike==360360` with `numberOfLegs(exec)>0`. Proves the geometry reads ONLY the regime oracle + β₁ immutables + CANONICAL_COP_USD constant. |
| 14 | `VolToWidthLib.volToWidth` snaps odd widths to even (`(raw & 1) == 1` line), enabling tick-aligned STRESS-regime mints | VERIFIED | Line 32 of `VolToWidth.sol`: `if ((raw & 1) == 1) raw = raw < 4095 ? raw + 1 : raw - 1;`. Without this fix the STRESS-width minted `InvalidTickBound()` (Panoptic's asymmetric `getRangesFromStrike` desynchronizes bounds when width*tickSpacing is odd). Fix passed a two-reviewer gate and RED→GREEN ancestry `f92b0f7`→`e686d4d`. |

**Score:** 14/14 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `contracts/src/interfaces/IRegimeOracle.sol` | Z_t regime + staleness interface (mirrors MacroOracle deliveredAt==0 precedent) | VERIFIED | 27 lines, `interface IRegimeOracle` with `Regime` enum (Unknown=0, Tranquil=1, Stress=2) + `latestRegime()` returning `(Regime, uint64 observedAt)`. |
| `contracts/src/libraries/Representativeness.sol` | Pure β₁(REGIME)×devaluation core + GBM-baseline width comparator + Fix-C structuralStrikeTick + fail-safe + monotone feasibleOptionRatio + honesty output | VERIFIED | 158 lines, `library RepresentativenessLib`. Contains: `inflationAdjustment`, `effectiveRegime`, `regimeVol`, `regimeWidth`, `gbmBaselineWidth`, `structuralStrikeTick`, `feasibleOptionRatio`, `nonErgodicDisclosed`, `TEMPLATE_RATIONALE`. |
| `contracts/test/mocks/MockRegimeOracle.sol` | Settable IRegimeOracle test double with `set` (fresh timestamp) + `setStaleAt` (explicit timestamp) | VERIFIED | 33 lines, `contract MockRegimeOracle is IRegimeOracle`. Both `set` and `setStaleAt` present. |
| `contracts/test/instrument/Representativeness.t.sol` | Fork-free unit suite: GBM-divergence (continuous+quantized), β₁ asymmetry, staleness→STRESS, exact-4485 strike, mutation non-vacuity, monotone feasibleOptionRatio, honesty output | VERIFIED | 297 lines, `contract RepresentativenessTestrepresentativenessCore`. **17/17 pass** (confirmed by live `forge test` run). Named tests: `test_structuralStrike_exactAt4485`, `test_mutation_collapseBeta1_breaksNonVacuity`, `test_beta1_stressExceedsTranquil`, `test_staleOracle_defaultsToStress`, all others. |
| `contracts/src/MacroHedgeExecutor.sol` | Additive `resolveFromMandate` + `ExecutorDecided` event + IRegimeOracle/β₁ immutable wiring + Fix-C sink split `_resolveAndMintAtStrike(int24 strike)` | VERIFIED | 341 lines. 9-arg constructor, `resolveFromMandate` at line 197, `_resolveAndMintAtStrike` at line 274 (virtual, override-able). `ExecutorDecided` 8-param event at line 94. All `RepresentativenessLib.*` calls present. |
| `contracts/test/instrument/MacroHedgeExecutor.onResult.t.sol` | Migrated DecodeProbe with override to `_resolveAndMintAtStrike` + 9-arg probe ctor | VERIFIED | 183 lines. `MacroHedgeExecutorDecodeProbe` overrides `_resolveAndMintAtStrike` (line 173) skipping dispatch. Probe ctor forwards to `MacroHedgeExecutor(..., IRegimeOracle(address(0)))` (9-arg). **4/4 pass** (confirmed by live `forge test` run). |
| `contracts/test/fork/DemoMacroHedgeExecutor.fork.t.sol` | Fork integration: `test_resolveFromMandate_mintsThroughExecutor` (exact strike 360360 + numberOfLegs>0) + `ExecutorDecided` honesty emit + size-over-127 revert + reverting-mock LLM-independence proof | VERIFIED | 568 lines. `EXPECTED_KHI_STRIKE=360360` constant at line 364. All four Phase-14 tests present and **6/6 fork suite PASSES** on live Polygon fork. |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `Representativeness.sol` | `VolToWidth.sol` | `VolToWidthLib.volToWidth` call in `regimeWidth` + `gbmBaselineWidth` | WIRED | Lines 108 and 119 of `Representativeness.sol`. Import at line 7. |
| `MockRegimeOracle.sol` | `IRegimeOracle.sol` | `is IRegimeOracle` | WIRED | `contract MockRegimeOracle is IRegimeOracle` at line 12. |
| `MacroHedgeExecutor.sol` | `Representativeness.sol` | `RepresentativenessLib.effectiveRegime / inflationAdjustment / regimeWidth / structuralStrikeTick / feasibleOptionRatio / regimeVol / nonErgodicDisclosed` | WIRED | 7 separate `RepresentativenessLib.*` call sites in `resolveFromMandate` (lines 203, 207, 208, 219, 224, 236, 253). |
| `MacroHedgeExecutor.sol` | `_resolveAndMintAtStrike` | `resolveFromMandate` terminates with `_resolveAndMintAtStrike(legParams, legIndex, positionSize, 0, strikeTick)` | WIRED | Line 258. |
| `MacroHedgeExecutor.sol` | `IRegimeOracle.sol` | `regimeOracle.latestRegime()` with staleness fail-safe | WIRED | Line 202. `IRegimeOracle public immutable regimeOracle` at line 75. |
| `MacroHedgeExecutor.onResult.t.sol` | `MacroHedgeExecutor.sol#_resolveAndMintAtStrike` | `function _resolveAndMintAtStrike(...) internal override` in `MacroHedgeExecutorDecodeProbe` | WIRED | Line 173. The override symbol matches the base's virtual; decode-isolation confirmed by 4/4 passing onResult suite. |
| `DemoMacroHedgeExecutor.fork.t.sol` | `MacroHedgeExecutor.sol#resolveFromMandate` | `exec.resolveFromMandate(mandate, legIndex, 1e6)` | WIRED | Lines 452, 472, 528. Three call sites in three distinct fork tests. |
| `DemoMacroHedgeExecutor.fork.t.sol` | `MacroHedgeExecutor.sol#ExecutorDecided` | `vm.recordLogs / vm.getRecordedLogs` matched against `EXECUTOR_DECIDED_TOPIC0` | WIRED | Lines 471-491. Topic hash correct: `keccak256("ExecutorDecided(uint256,uint8,uint256,int24,int24,bool,bool,string)")`. |

---

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| REPR-01 | 14-01, 14-02, 14-03 | Dedicated representativeness analysis: parameterized mathematical model of how representative the wCOP/USDC pool is of target COP-inflation risk; measure + parameters surfaced for the UI (`ExecutorDecided`) | SATISFIED | `RepresentativenessLib` implements the β₁(REGIME)×devaluation core (the "inflation adjustment") + GBM comparator + staleness→STRESS fail-safe; 17/17 unit tests green; `ExecutorDecided` (8-param) fork-proven on the mint path — `test_executorDecided_surfacesHonestyFlag` decodes `nonErgodicDisclosed==true` + TEMPLATE caveat from a live Polygon-fork mint. Note: the live `inferToolsChat` tool-calling round-trip remains STRETCH per ROADMAP. |
| REPR-02 | 14-01, 14-02, 14-03 | `resolveFromMandate(HedgeMandate)` derives a well-formed `HedgeLegParams` (moneyness/strike/width/feasible-size; optionRatio ≤ 127 bound) and mints via the shipped core; Polygon-fork mint green through this path | SATISFIED | `resolveFromMandate` present and fully wired; fork test `test_resolveFromMandate_mintsThroughExecutor` PASSES with `strike==360360` EXACT + `numberOfLegs(exec)>0`; size-guard (>127 reverts) proven; behavioral LLM-independence proven via `MockRevertingPlatform`; `volToWidth` even-snap fix enables the STRESS-width mint. Live `inferToolsChat` stays STRETCH. |

**Orphaned requirements check:** REPR-01 and REPR-02 are the only requirements mapped to Phase 14 in REQUIREMENTS.md (lines 91-92). All three plans (14-01, 14-02, 14-03) declare exactly these two IDs. No orphans.

---

### Anti-Patterns Found

| File | Pattern | Severity | Assessment |
|------|---------|----------|------------|
| `Representativeness.sol:41`, `MacroHedgeExecutor.sol:86` | `"TEMPLATE: placeholder beta1/Z_t..."` in string constants | INFO | By design — this is the TEMPLATE_RATIONALE honesty disclosure string that REPR-01 requires to surface on `ExecutorDecided`. These are not stub implementations; they are intentional dishonesty-signaling strings the verifier must emit. Their presence is a correctness requirement. |

No blockers. No implementation stubs. No empty handlers. No TODO/FIXME in load-bearing paths.

---

### Human Verification Required

None. All REPR-01 and REPR-02 success criteria are programmatically verifiable. The fork suite ran live (6/6 Polygon fork tests pass) — no fallback to static verification was needed.

---

### Gaps Summary

No gaps. All 14 must-have truths are verified. All 7 artifacts exist and are substantive. All 8 key links are wired. Both requirement IDs are satisfied with evidence. The build exits 0. The unit suite is 17/17. The onResult suite is 4/4. The fork suite is 6/6 including the load-bearing `strike==360360` exact equality assertion.

---

## Test Execution Summary

| Suite | Command | Result |
|-------|---------|--------|
| Build | `forge build` | EXIT 0 (compilation skipped — no changes) |
| Representativeness unit (REPR-01) | `forge test --match-path test/instrument/Representativeness.t.sol` | 17/17 PASS |
| onResult decode/auth unit (EXEC-01 regression) | `forge test --match-path test/instrument/MacroHedgeExecutor.onResult.t.sol` | 4/4 PASS |
| Demo fork + Phase-14 mandate path (REPR-02) | `forge test --match-path test/fork/DemoMacroHedgeExecutor.fork.t.sol` | 6/6 PASS |

---

_Verified: 2026-06-07_
_Verifier: Claude (gsd-verifier)_
