---
phase: 14-representativeness-derivation
plan: 02
subsystem: api
tags: [solidity, foundry, panoptic-v2, tickmath, post-keynesian, representativeness, fix-c, evm-tdd]

# Dependency graph
requires:
  - phase: 14-representativeness-derivation
    provides: "Wave 1 (14-01) — the pure RepresentativenessLib (structuralStrikeTick/regimeWidth/regimeVol/effectiveRegime/inflationAdjustment/feasibleOptionRatio/nonErgodicDisclosed), IRegimeOracle, and MockRegimeOracle this wave imports and wires onto the executor"
  - phase: 13-macro-hedge-executor
    provides: "the shipped MacroHedgeExecutor _resolveAndMint sink (lifted verbatim into _resolveAndMintAtStrike) + the onResult DecodeProbe + the three fork EXEC ctor sites this wave migrates"
  - phase: 12-macro-hedge-strategist
    provides: "the HedgeMandate intent-only type resolveFromMandate consumes"
provides:
  - "MacroHedgeExecutor.resolveFromMandate(HedgeMandate) — the additive Agent-2 front-end: Z_t staleness->STRESS fail-safe, regime-conditional width, the EXACT decimal-gap structural K_hi tick 360360 via structuralStrikeTick (Fix C, zero inversion), feasibleOptionRatio<=127, 8-param ExecutorDecided with the honesty flag + TEMPLATE caveat, minting through the shared sink"
  - "The Fix-C sink split: _resolveAndMintAtStrike(HedgeLegParams,uint256,uint128,uint256,int24 strike) — the shared internal mint body (lifted verbatim) takes a PRE-SNAPPED strike; the strikeWAD->tick line moved up into the public resolveAndMint + _onResult so the Phase-13 demo/direct path is byte-unchanged"
  - "The ctor 4->9 extension (beta1 tranquil/stress immutable pair, targetDev, baseVol TICK-SPACE, IRegimeOracle) — the regime-input wiring (Pattern 3)"
  - "The migrated Phase-13 executor test files: the onResult DecodeProbe override (-> _resolveAndMintAtStrike, decode-isolation preserved) + its 9-arg ctor forward, and the three fork EXEC new MacroHedgeExecutor(...) sites (9-arg + MockRegimeOracle) — project COMPILES + the suites stay green"
affects: [14-03-fork-mint, representativeness, resolveFromMandate, ui-executor-decided]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pattern 1 (Phase-13 promote-don't-invent): resolveFromMandate is a SECOND external entrypoint that derives HedgeLegParams then calls the SAME shared mint sink — the mint core is REUSED (body lifted verbatim), not rebuilt"
    - "Fix C: the structural strike is a PRE-SNAPPED int24 fed to the sink as a param (the strikeWAD->tick derivation lives in the public entrypoints); the broken strikeWadForSink inversion is DELETED — emitted tick == minted tick == asserted tick, zero drift"
    - "Pattern 3: beta1(REGIME) is a constructor-immutable pair (pre-computed econometric output); Z_t is read live from IRegimeOracle with the staleness->STRESS fail-safe so the regime-switch is observable"

key-files:
  created: []
  modified:
    - contracts/src/MacroHedgeExecutor.sol
    - contracts/test/instrument/MacroHedgeExecutor.onResult.t.sol
    - contracts/test/fork/MacroHedgeExecutor.fork.t.sol

key-decisions:
  - "The mint BODY is lifted byte-for-byte verbatim into _resolveAndMintAtStrike; ONLY the strike DERIVATION moved out (up into the public resolveAndMint + _onResult). The Phase-13 demo/direct path is byte-unchanged: dispatch count stays 2, the optionRatio<=127 guard stays the sink's first statement, the direct path keeps exchangeRateToSqrtPriceX96(strikeWAD) semantics."
  - "resolveFromMandate consumes ONLY Plan-01's locked pure functions (structuralStrikeTick/regimeWidth/regimeVol/effectiveRegime/inflationAdjustment/feasibleOptionRatio/nonErgodicDisclosed) — no new lib helper, no inline feasibleOptionRatio, no strikeWAD/strikeWadForSink/converter on this path."
  - "The strike is anchored to the canonical CANONICAL_COP_USD=3900 constant (K_hi = *115/100 = 4485 -> tick 360360), NOT the live pool tick — the path stays pure/deterministic and matches the unit canary anchored at the SAME 4485 (RESEARCH Pitfall 1b: the 15%-OTM offset keeps the leg-lower ~1060 ticks clear of spot)."
  - "No dead live-tick read in resolveFromMandate (the gate's MINOR): getCurrentTick is NOT emitted on this path, so it is not read; the ExecutorDecided event is the authoritative 8-param shape (uint8 regimeZt + strikeTick + regimeWidth), NOT the RESEARCH 6-param illustrative snippet."
  - "The ATOMIC fan-out: the Fix-C rename + the ctor 4->9 extension break the onResult DecodeProbe (override + ctor forward) and the three fork EXEC ctor sites; ALL migrated in the SAME commit so forge build never goes red (the acceptance gate caught these as two prior-cycle BLOCKERs)."

patterns-established:
  - "Decode-isolation survives the sink rename: the onResult DecodeProbe override moves to _resolveAndMintAtStrike(...,int24) and the rerouted _onResult call lands on the overridden symbol (the probe records the decoded params + ignores the strike + skips dispatch) — onResult stays 4/4."
  - "MockRegimeOracle import path from test/fork/ is ../mocks/MockRegimeOracle.sol (the gate-corrected canonical test/mocks/ location); a shared contract-field oracle (set to Stress) feeds all three migrated fork ctor sites."

requirements-completed: [REPR-01, REPR-02]

# Metrics
duration: 13 min
completed: 2026-06-07
---

# Phase 14 Plan 02: Executor wiring (Fix-C sink split + resolveFromMandate front-end) Summary

**The additive `resolveFromMandate(HedgeMandate)` Agent-2 front-end + the 8-param `ExecutorDecided` event + the IRegimeOracle/beta1-immutable wiring + the Fix-C sink split (`_resolveAndMintAtStrike(int24 strike)`, mint body lifted verbatim) landed on the shipped `MacroHedgeExecutor`, with the onResult DecodeProbe override + the three fork EXEC ctor sites migrated to the renamed sink + the 9-arg ctor in ONE compiling commit — `forge build` exit 0 project-wide, onResult 4/4, Representativeness 17/17, the fork EXEC suite 7/7 on the live Polygon fork.**

## Performance

- **Duration:** ~13 min
- **Started:** 2026-06-07T02:31:23Z (continuation from 14-01 completion)
- **Completed:** 2026-06-07T02:44:00Z
- **Tasks:** 1 (type=auto, single atomic three-file commit)
- **Files modified:** 3 (all modified, none created)

## Accomplishments
- **Fix-C sink split landed with the Phase-13 demo/direct path byte-unchanged:** `_resolveAndMint` renamed to `_resolveAndMintAtStrike(HedgeLegParams,uint256,uint128,uint256,int24 strike)`; the `strikeWAD->tick` line (the three lines deriving `int24 strike` from `legParams.strikeWAD` via `exchangeRateToSqrtPriceX96`) moved UP verbatim into the public `resolveAndMint` AND `_onResult`; the mint body (the require guards, the width/asset/riskPartner derivations, the pid/addLeg, the short-then-long two-`pool.dispatch` block, the two emits) is byte-for-byte identical — the dispatch count stays 2 and the optionRatio<=127 guard stays the sink's first statement.
- **`resolveFromMandate` wired the representativeness model into the executor:** reads Z_t with the staleness->STRESS fail-safe (`effectiveRegime`), computes the inflation adjustment (`inflationAdjustment`) + the regime-conditional width (`regimeWidth`) + the regime-conditional TICK-SPACE vol (`regimeVol`), maps `targetNotional` -> feasible optionRatio<=127 (`feasibleOptionRatio`), builds a well-formed `HedgeLegParams` (pass-through + derived; `strikeWAD` UNUSED -> 0), surfaces the 8-param `ExecutorDecided` (the honesty flag `nonErgodicDisclosed==true` + the TEMPLATE caveat), and mints through the shared sink passing the EXACT pre-snapped K_hi tick `structuralStrikeTick(4485,60)==360360` directly (zero inversion; `strikeWadForSink` absent everywhere).
- **The ctor extended 4->9 (Pattern 3):** beta1 tranquil/stress immutable pair (TEMPLATE 0.10e18/0.35e18), targetDev (0.15e18), baseVol (TICK-SPACE 14_400, matching the demo scale — no `baseVolWad`), and the `IRegimeOracle` — the exact 9-arg order Plan-03's `_deployExecutorWith` already uses.
- **The breaking fan-out CLOSED in the SAME commit (the gate's two prior BLOCKERs):** the onResult `MacroHedgeExecutorDecodeProbe` override migrated to `_resolveAndMintAtStrike(...,int24) internal override` (decode-isolation preserved — the rerouted `_onResult` call lands on it, records the decoded params, ignores the strike, skips dispatch) + its ctor forwards the 9-arg base ctor; the three fork EXEC `new MacroHedgeExecutor(...)` sites (`_init_world`, the BTT-leaf under-funded twin, `test_margin`) migrated to the 9-arg ctor with a shared-field `MockRegimeOracle` (set to Stress).
- **Proven green:** `forge build` exit 0 project-wide (only the 3 edited files recompiled, no intermediate red build); the keyless onResult suite **4/4**; the keyless Representativeness unit suite **17/17**; the migrated fork EXEC suite **7/7 on the live Polygon fork** (block 86_900_000 — `test__takeDemoPosition__Succeeds`, the AccountInsolvent atomic gate, the size guard all pass through the 9-arg ctor sites); the full fork-free regression set **114/114** (no sibling regressions — PolygonPools 3/3, OperationalCostManagement 10/10, MacroHedgeStrategist 19/19).

## Task Commits

The single task was committed atomically (all three files together — the acceptance gate is project-wide `forge build` exit 0 with no intermediate red build):

1. **Task 1: Fix-C sink split + resolveFromMandate + ExecutorDecided + ctor 4->9 + migrate onResult DecodeProbe + the three fork ctor sites** - `135f378` (feat)

**Plan metadata:** committed separately (docs: complete plan)

## Files Created/Modified
- `contracts/src/MacroHedgeExecutor.sol` - Fix-C sink split (`_resolveAndMintAtStrike(int24 strike)` shared body, body lifted verbatim, strikeWAD->tick moved up into the public entrypoints); the additive `resolveFromMandate` front-end; the 8-param `ExecutorDecided` event; the IRegimeOracle/beta1-immutable/baseVol/targetDev wiring + the ctor 4->9 extension; the CANONICAL_COP_USD/HORIZON_BLOCKS/TICK_SPACING constants + the TEMPLATE_RATIONALE.
- `contracts/test/instrument/MacroHedgeExecutor.onResult.t.sol` - the migrated DecodeProbe: the override renamed to `_resolveAndMintAtStrike(...,int24)` (decode-isolation intact) + the probe ctor forwards the 9-arg base ctor (template beta1/dev/baseVol + a zero-address IRegimeOracle, never read on the decode path); added the `IRegimeOracle` import.
- `contracts/test/fork/MacroHedgeExecutor.fork.t.sol` - all three `new MacroHedgeExecutor(...)` sites migrated to the 9-arg ctor; a shared contract-field `MockRegimeOracle` (set to Stress) deployed in `_init_world` and reused by the two twin sites; added the `MockRegimeOracle` + `IRegimeOracle` imports.

## Decisions Made
- **The mint body is lifted verbatim; only the strike derivation moved.** This is the locked promote-don't-invent shape — the demo/direct path stays byte-unchanged (dispatch count 2, the optionRatio guard first, strikeWAD semantics on `resolveAndMint`), and `resolveFromMandate` hands the sink a pre-snapped tick so emitted == minted == asserted (no inversion drift).
- **The strike anchors to the canonical 3900 constant, not the live pool tick.** Keeps the path pure/deterministic and matches the unit canary at 4485; the 15%-OTM K_hi offset (Pitfall 1b) keeps the leg clear of the `InputListFail()` near-spot zone. No `getCurrentTick` read — the live tick is not emitted, so reading it would be a dead read.
- **The ExecutorDecided event is the authoritative 8-param shape** (`uint256 indexed requestId, uint8 regimeZt, uint256 inflationAdjustmentWad, int24 strikeTick, int24 regimeWidth, bool parametricHedged, bool nonErgodicDisclosed, string rationale`) — the RESEARCH 6-param illustrative snippet was stale; the fork decode topic-hash in Plan-03 matches this 8-param shape.
- **The whole fan-out is atomic.** The rename + the ctor extension are compile-breaking for the Phase-13 executor test files; migrating all four sites (the onResult override + the onResult ctor forward + the three fork ctor sites) in the same commit keeps `forge build` green project-wide — the gate caught these as two BLOCKERs across two prior review cycles, so the single-commit atomicity was honored.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Reworded the `resolveFromMandate` NatSpec comment to drop the literal `getCurrentTick` token**
- **Found during:** Task 1 (acceptance-criteria verification)
- **Issue:** The plan's acceptance gate is `! grep -q "getCurrentTick"` (the gate's MINOR — no dead live-tick read on the mandate path). There is NO `getCurrentTick` CODE in `resolveFromMandate`, but the NatSpec comment NAMED `getCurrentTick` to explain its deliberate absence ("No live-tick read — getCurrentTick is NOT emitted here"), which a naive literal `! grep -q` matched, false-failing the gate.
- **Fix:** reworded the comment to "No live-tick read — the live pool tick is NOT emitted here, so reading it would be a dead read" — meaning preserved, the literal token removed (the same NatSpec-vs-grep precedent Plan-01 hit with `strikeWadForSink`/`exchangeRateToSqrtPriceX96`, and 08-01/12-01 before it).
- **Files modified:** contracts/src/MacroHedgeExecutor.sol
- **Verification:** `! grep -q "getCurrentTick"` now passes; `forge build` exit 0; onResult 4/4 + Representativeness 17/17 + fork EXEC 7/7 unchanged (comment-only edit).
- **Committed in:** 135f378 (the atomic task commit)

---

**Total deviations:** 1 auto-fixed (1 blocking, a NatSpec-vs-grep reword to pass the plan's own gate)
**Impact on plan:** Comment-only; no behavior change, no scope creep. Only the three declared files were edited; the demo harness (`DemoMacroHedgeExecutor.fork.t.sol`, Plan-03's), PriceGridsLib, and RepresentativenessLib were untouched.

## Issues Encountered
None. The atomic three-file edit compiled and tested clean on the first build; the only adjustment was the NatSpec-vs-grep reword documented above. The three pre-existing untracked `contracts/src/types/{CalldataReader,OptionType,Underlying}.sol` files were present in the session-start git snapshot (separate macro-hedge work in progress, not generated by this build, not related to this plan) — left untouched per the scope boundary.

## User Setup Required
None - no external service configuration required. The migrated fork EXEC suite runs against the cached Polygon fork via the existing `ALCHEMY_API_KEY` in the gitignored `contracts/.env`; the keyless onResult + Representativeness suites need no RPC.

## Next Phase Readiness
- **`resolveFromMandate` + `ExecutorDecided` + the 9-arg ctor are committed and ready for Wave 3 (14-03)** to fork-prove the mandate->mint at strike 360360 (`test_resolveFromMandate_mintsThroughExecutor` asserts `numberOfLegs>0` AND `positionId.strike(leg)==360360`), the honesty-flag surfacing (`test_executorDecided_surfacesHonestyFlag`), the direct-path size guard (`test_resolveAndMint_sizeOver127_reverts`), and the BEHAVIORAL LLM-independence (`test_resolveFromMandate_llmIndependentGeometry` with a MockRevertingPlatform).
- **The project compiles green through the Fix-C fan-out** (build exit 0, the migrated onResult 4/4 + fork EXEC 7/7) — Wave 3 starts from a clean compile and can call `resolveFromMandate` on the fork through the shared sink.
- **No blockers.** The demo/direct path is byte-unchanged, so the Plan-03 wave gate's re-confirmation of the Phase-13 demo 2/2 (`DemoMacroHedgeExecutor.fork.t.sol`) is unaffected by this wave.

---
*Phase: 14-representativeness-derivation*
*Completed: 2026-06-07*

## Self-Check: PASSED
- Files modified all present on disk: MacroHedgeExecutor.sol, MacroHedgeExecutor.onResult.t.sol, MacroHedgeExecutor.fork.t.sol, 14-02-SUMMARY.md.
- Commit present: `135f378` (feat 14-02).
- Build/test re-verified: `forge build` exit 0 project-wide; onResult 4/4; Representativeness 17/17; fork EXEC 7/7 (live Polygon fork); fork-free regression 114/114.
