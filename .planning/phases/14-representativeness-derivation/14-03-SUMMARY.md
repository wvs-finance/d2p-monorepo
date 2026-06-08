---
phase: 14-representativeness-derivation
plan: 03
subsystem: testing
tags: [solidity, foundry, panoptic-v2, tickmath, voltowidth, tick-alignment, post-keynesian, representativeness, fix-c, evm-tdd, fork]

# Dependency graph
requires:
  - phase: 14-representativeness-derivation
    provides: "Wave 2 (14-02) — the additive resolveFromMandate front-end + the Fix-C sink split (_resolveAndMintAtStrike(int24 strike)) + the 8-param ExecutorDecided + the 9-arg ctor (β₁ immutable pair, targetDev, TICK-SPACE baseVol, IRegimeOracle) this wave fork-exercises"
  - phase: 14-representativeness-derivation
    provides: "Wave 1 (14-01) — the pure RepresentativenessLib (structuralStrikeTick/regimeVol/regimeWidth) + IRegimeOracle + MockRegimeOracle"
  - phase: 13-macro-hedge-executor
    provides: "the shipped MacroHedgeExecutor mint sink + the cached Polygon fork harness (_init_world) + VolToWidthLib (the lib the even-snap fix lands on)"
  - phase: 12-macro-hedge-strategist
    provides: "the HedgeMandate intent-only type the fork test constructs"
provides:
  - "The Wave-3 fork integration: resolveFromMandate mints a REAL wCOP/USDC Panoptic position through the SHIPPED executor on the live Polygon fork — the mint SUCCEEDS with the EXACT structural K_hi tick 360360 + numberOfLegs(exec) > 0 (not a loose band, not merely no-revert)"
  - "The volToWidth EVEN-WIDTH invariant: odd widths snap to even so every Panoptic leg's symmetric bounds (strike ± width*tickSpacing/2) stay tickSpacing-aligned — the single-chokepoint fix for the STRESS-regime InvalidTickBound() blocker"
  - "The 8-param ExecutorDecided honesty-flag surfacing fork-proven on the mint path (nonErgodicDisclosed == true + the TEMPLATE caveat decoded from the live mint)"
  - "The behavioral LLM-independence proof: resolveFromMandate mints the identical geometry through a MockRevertingPlatform (the deterministic geometry makes NO call into the agent/LLM surface)"
affects: [15-ui-e2e-ci, representativeness, resolveFromMandate, voltowidth, panoptic-tick-alignment]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Even-width invariant in volToWidthLib: a single ceil-snap (raw+1, raw-1 only at the 4095 ceiling) after the [1,4095] clamp keeps Panoptic's asymmetric getRangesFromStrike (rangeDown truncates, rangeUp rounds up) collapsed to (width/2)*tickSpacing — an exact tickSpacing multiple — so symmetric leg bounds never fall off the grid"
    - "RED→GREEN split with the fix already on disk: stash the src fix, commit the failing test FIRST (RED), restore + commit the fix SECOND (GREEN), verify per-file git merge-base --is-ancestor — the Iron Law honored at the commit level even when the GREEN-maker pre-exists the executor session"
    - "Fork exact-strike assertion (not a band): the executor feeds the sink a PRE-SNAPPED int24, so the minted strike == the emitted strike == the asserted strike (360360) with zero inversion drift — a 22-tickSpacing emitted-vs-minted lie is structurally impossible"

key-files:
  created:
    - .planning/phases/14-representativeness-derivation/14-03-SUMMARY.md
  modified:
    - contracts/test/fork/DemoMacroHedgeExecutor.fork.t.sol
    - contracts/src/libraries/VolToWidth.sol

key-decisions:
  - "Resolved the Rule-4 architectural checkpoint with alternative (a): snap odd widths to even in volToWidthLib (the single chokepoint every Panoptic leg flows through), NOT in RepresentativenessLib.regimeWidth (narrower but leaves raw volToWidth able to emit odd widths for other callers) — structurally correct for ALL callers, one line, zero Wave-1 unit regression. Gate-passed (Reality Checker PASS + Solidity Smart Contract Engineer PASS) before this continuation."
  - "The even-width invariant is now a DOCUMENTED property of volToWidthLib (the comment block at VolToWidth.sol:26-31), not an accident — even width is sufficient on every tickSpacing because (width/2)*tickSpacing is always an exact tickSpacing multiple."
  - "evm-TDD Iron Law honored with a REAL RED→GREEN split even though the gate-passed fix was already on disk: the failing fork test was committed FIRST (f92b0f7) with the fix stashed, the fix committed SECOND (e686d4d), per-file ancestry verified — RED proven for the RIGHT reason (3 mandate-path tests fail InvalidTickBound() at ~12M gas, not a compile error, not a different revert)."
  - "The exact-strike 360360 assertion (not a loose band) is the load-bearing Fix-C proof on the fork: minted == emitted == asserted, zero drift; the 15%-OTM K_hi offset keeps leg-lower ~1060 ticks clear of the live spot ~358700, off the InputListFail() near-spot boundary (Pitfall 1b)."

patterns-established:
  - "Even-width tick-alignment invariant: any vol→width carrier feeding a symmetric Panoptic leg must emit an even width or the leg's bounds fall off the tickSpacing grid → InvalidTickBound(); the snap belongs at the width chokepoint, not at each call site."
  - "Continuation-from-resolved-checkpoint sequencing: when a Rule-4 fix is gate-passed and on disk, the executor stashes the src fix to land the failing test as a genuine RED commit before the GREEN fix commit (ancestry-verified), preserving the Iron Law across the checkpoint boundary."

requirements-completed: [REPR-02, REPR-01]

# Metrics
duration: ~4 min (continuation; the Wave-3 test artifacts + the gate-passed fix pre-existed on disk)
completed: 2026-06-07
---

# Phase 14 Plan 03: Fork mint (mandate→geometry→mint at strike 360360) Summary

**The Wave-3 fork integration FORK-PROVEN on the live Polygon fork: `resolveFromMandate` mints a real wCOP/USDC Panoptic position through the SHIPPED `MacroHedgeExecutor` with the EXACT structural K_hi tick `360360` + `numberOfLegs(exec) > 0`, the 8-param `ExecutorDecided` honesty flag + TEMPLATE caveat surface on the mint path, and a `MockRevertingPlatform` proves the geometry is LLM-independent — unblocked by a gate-passed `volToWidth` even-width invariant fix, landed as a real RED→GREEN evm-TDD split (the failing fork test committed BEFORE the src fix, per-file ancestry verified).**

## Performance

- **Duration:** ~4 min (continuation — the Wave-3 fork suite + the gate-passed VolToWidth fix were already on disk from the prior socket-death/checkpoint session; this run sequenced the RED→GREEN commits, ran the full regression, and finalized docs)
- **Started:** 2026-06-07T03:14Z (continuation from the resolved Rule-4 checkpoint)
- **Completed:** 2026-06-07T03:21Z
- **Tasks:** 1 (type=auto, executed as a RED→GREEN evm-TDD split)
- **Files modified:** 2 (DemoMacroHedgeExecutor.fork.t.sol — the RED test; VolToWidth.sol — the GREEN fix)

## Accomplishments
- **REPR-02 integration FORK-PROVEN at the EXACT strike:** `test_resolveFromMandate_mintsThroughExecutor` mints a real wCOP/USDC Panoptic position through the shipped executor on the live Polygon fork (block 86_900_000) — the mint SUCCEEDS, `positionId.strike(leg) == 360360` (the EXACT structural K_hi tick, not a band), `positionId.countLegs() == 1`, `positionId.isLong(0) == 1`, and `WCOP_USDC_PANOPTIC_POOL.numberOfLegs(address(exec)) > 0` (executor-owned). This is the mandate→geometry→Fix-C-sink→mint lineage end-to-end.
- **The STRESS-regime `InvalidTickBound()` BLOCKER closed** via a gate-passed `volToWidth` even-width invariant (the resolved Rule-4 checkpoint): odd widths snap to even (`if ((raw & 1) == 1) raw = raw < 4095 ? raw + 1 : raw - 1;`) so Panoptic's asymmetric `getRangesFromStrike` collapses both ranges to `(width/2)*tickSpacing` — tickSpacing-aligned. STRESS width `21 → 22`, bounds `359700 / 361020` (both `%60 == 0`) → mints at `360360`.
- **REPR-01 honesty surfacing fork-proven on the mint path:** `test_executorDecided_surfacesHonestyFlag` decodes the 8-param `ExecutorDecided(uint256,uint8,uint256,int24,int24,bool,bool,string)` from `vm.getRecordedLogs()` and asserts `nonErgodicDisclosed == true` + `bytes(rationale)` contains `"TEMPLATE"` (the Davidson honesty split + the TEMPLATE caveat surface for the UI).
- **The deterministic geometry proven LLM-independent BEHAVIORALLY:** `test_resolveFromMandate_llmIndependentGeometry` deploys the executor with a `MockRevertingPlatform` (every external fn reverts) and `resolveFromMandate` STILL mints the identical geometry (`strike == 360360`, `numberOfLegs > 0`) — a geometry that touched the agent/LLM surface would revert; it does not.
- **The shared-sink size guard fork-proven on the direct path:** `test_resolveAndMint_sizeOver127_reverts` (the deliberate functional twin of the EXEC-file `test_resolveAndMint_sizeGuard`) mints a `size = 128` leg via the DIRECT `resolveAndMint` and `vm.expectRevert(bytes("optionRatio overflow"))` — the `%128`-mask protection is reachable through the same wired-executor lineage.
- **Zero collateral damage from the Wave-1 src edit:** the full demo fork suite **6/6**, the executor's own fork EXEC suite **7/7**, the Wave-1 `Representativeness` unit suite **17/17** (the `wStress != wGbm` divergence holds — the snap makes STRESS `22` vs GBM `20`, MORE divergent), `onResult` **4/4**, the fork-free regression tree **114/114**, `forge build` exit 0 project-wide.

## Task Commits

The task was executed as a real RED→GREEN evm-TDD split (the gate-passed fix was on disk, so the commits were sequenced so the failing test lands BEFORE the GREEN src fix):

1. **Task 1 (RED): the Wave-3 fork suite** — `f92b0f7` (test) — the 4 mandate-path tests + the `_deployExecutorWith`/`_demoMandate`/`_contains` helpers + `MockRevertingPlatform` + `EXPECTED_KHI_STRIKE = 360360`; committed with the VolToWidth fix STASHED. RED-verified: the 3 mandate-path tests fail `InvalidTickBound()` at ~12M gas (NOT a compile error, NOT a different revert).
2. **Task 1 (GREEN): the volToWidth even-snap fix** — `e686d4d` (fix) — the gate-passed single-chokepoint snap line + its explanatory comment; restored from stash, committed SEPARATELY. GREEN-verified: the 3 RED tests pass; the full demo suite 6/6 on the live fork.

**Per-file ancestry:** `git merge-base --is-ancestor f92b0f7 e686d4d` → true (the failing test landed BEFORE the fix — the Iron Law honored at the commit level).

**Plan metadata:** committed separately (docs: complete plan — this SUMMARY + STATE + ROADMAP + REQUIREMENTS + the resolved deferred-items.md).

## Files Created/Modified
- `contracts/test/fork/DemoMacroHedgeExecutor.fork.t.sol` — extended the demo fork suite (+219 lines) with the four Wave-3 tests (`test_resolveFromMandate_mintsThroughExecutor` exact-strike 360360, `test_executorDecided_surfacesHonestyFlag` 8-param decode, `test_resolveAndMint_sizeOver127_reverts` direct-path size guard, `test_resolveFromMandate_llmIndependentGeometry` MockRevertingPlatform), the `_deployExecutorWith`/`_deployExecutor`/`_demoMandate`/`_contains` helpers (9-arg ctor, `receiver = address(exec)`, TICK-SPACE baseVol 14_400), the `EXPECTED_KHI_STRIKE`/`EXECUTOR_DECIDED_TOPIC0` constants, and the `MockRevertingPlatform` helper after the test contract. Reuses `setUp()` + `_init_world()` verbatim; no src change in this file.
- `contracts/src/libraries/VolToWidth.sol` — the gate-passed even-width invariant: after the `[1,4095]` clamp, `if ((raw & 1) == 1) raw = raw < 4095 ? raw + 1 : raw - 1;` snaps odd widths to even (DOWN only at the ceiling so `raw` stays in `[1,4095]`), plus a 6-line comment documenting WHY (Panoptic's asymmetric `getRangesFromStrike` → an odd width × tickSpacing/2 falls off the grid → `InvalidTickBound()`). +7 lines total.

## Decisions Made
- **Resolved the Rule-4 checkpoint with the chokepoint fix, not the narrow one.** Alternative (a) (snap in `volToWidthLib`) over (b) (snap in `RepresentativenessLib.regimeWidth` only): `volToWidth` is the single function every Panoptic leg's width flows through, so the even-width invariant belongs there — it protects EVERY caller (the demo, the executor, any future width consumer), not just the mandate path. Alternatives (c) (tune TEMPLATE β₁ to an even-width accident) and (d) (demo under TRANQUIL to dodge the odd width) were rejected as fragile/dishonest in the checkpoint. The fix passed the CLAUDE.md two-reviewer gate (Reality Checker PASS + Solidity Smart Contract Engineer PASS) this session before this continuation began.
- **Even width is sufficient on EVERY tickSpacing, not just 60.** `(width/2)*tickSpacing` is always an exact multiple of `tickSpacing` for an even width, so both symmetric leg bounds (`strike ± (width/2)*tickSpacing`) stay aligned regardless of the pool's tickSpacing. The snap is cast-safe (`raw ∈ [2,4094]` after the snap, well within `int24`).
- **The RED→GREEN split was sequenced deliberately despite the fix being on disk.** Rather than commit the fix + test together (which would lose the Iron-Law ancestry), the src fix was stashed, the failing fork test committed first (RED, proven failing for the right reason), then the fix restored and committed (GREEN) — and the per-file ancestry verified. This preserves the evm-TDD discipline across the checkpoint boundary.
- **The exact-strike 360360 assertion (not a band) is the load-bearing Fix-C fork proof.** The executor hands the sink a pre-snapped `int24`, so minted == emitted == asserted with zero inversion drift — the old `strikeWadForSink` 22-tickSpacing lie is structurally impossible. The 15%-OTM K_hi offset keeps leg-lower ~1060 ticks clear of the live spot, off the `InputListFail()` near-spot boundary (Pitfall 1b).

## Deviations from Plan

None — plan executed exactly as written, as a continuation from the resolved Rule-4 checkpoint.

The plan's frontmatter declares `files_modified: [DemoMacroHedgeExecutor.fork.t.sol]` (TEST-ONLY) with an acceptance gate `! git diff --name-only HEAD~1 | grep "^src/"`. The src edit (`VolToWidth.sol`) is NOT a deviation from THIS continuation's mandate: the prior executor correctly escalated the `InvalidTickBound()` defect as a Rule-4 architectural checkpoint (it touches shipped Wave-1 src, a shared library every Panoptic leg flows through, warranting the two-reviewer gate). The user resolved the checkpoint by choosing fix "A + two-reviewer gate"; the gate passed; this continuation's explicit objective was to commit that resolved fix and finish the plan. The acceptance gate `! grep "^src/"` reflected the plan's PRE-checkpoint TEST-ONLY framing and is superseded by the resolved checkpoint — the one permitted src change (the gate-passed even-snap) is exactly what closed the blocker. No OTHER src file was touched; the three untracked `contracts/src/types/{CalldataReader,OptionType,Underlying}.sol` files (separate in-progress macro-hedge work in the session-start snapshot) were left untouched per the scope boundary.

## Issues Encountered

**The STRESS-regime `InvalidTickBound()` blocker (the Rule-4 checkpoint this continuation resolves).** Documented fully in `deferred-items.md` (now marked RESOLVED): under STRESS, `regimeVol = 14_940 → volToWidth(14_940, 100, 60) = 21` (ODD) → a symmetric leg `strike ± width*tickSpacing/2` is tick-misaligned (`360360 − 630 = 359730`, `% 60 = 30 ≠ 0`) → `InvalidTickBound()` at `SemiFungiblePositionManagerV4.sol:833`. The Phase-13 demo never hit it because it only ever used vol `14_400 → width 20` (EVEN). Root-caused fork-proven + source-confirmed by the prior executor; the even-snap makes width `22 → 359700/361020` (both `% 60 = 0`) → mints at the EXACT structural K_hi tick `360360`. Closed by `e686d4d`.

**RED verified for the right reason.** With the fix stashed, the 3 mandate-path tests fail `InvalidTickBound()` at ~12M gas (the full geometry+mint path executes — not a compile error, not a different revert), while `test_resolveAndMint_sizeOver127_reverts` (reverts on the size guard before the tick math) and the 2 Phase-13 demo tests (even width 20) pass. This matches the `deferred-items.md` evidence exactly.

**Fork-run hygiene.** All fork runs used the pinned block (86_900_000) + the cached fork-state (`fork-state/polygon-panoptic.json`) with the Alchemy RPC in the gitignored `contracts/.env`. No 429s this session; the demo suite ran in ~2s on cached state.

## User Setup Required
None — no external service configuration required. The fork suite runs against the cached Polygon fork via the existing `ALCHEMY_API_KEY` in the gitignored `contracts/.env`; the keyless `Representativeness` + `onResult` regression suites need no RPC. The live `inferToolsChat` representativeness round-trip stays a STRETCH / `workflow_dispatch` follow-up (not in the vendored `ILLMAgent`; the deterministic geometry never depends on it — proven behaviorally here).

## Next Phase Readiness
- **Phase 14 is COMPLETE (14-01 ✅, 14-02 ✅, 14-03 ✅ of 3 plans).** The Agent-2 representativeness brain is fork-proven end-to-end: a `HedgeMandate` flows through `resolveFromMandate` → the deterministic regime-conditional geometry → the Fix-C sink → a real wCOP/USDC Panoptic position at the EXACT structural K_hi tick 360360, with the honesty flag + TEMPLATE caveat surfaced on `ExecutorDecided` for the UI.
- **Ready for Phase 15 (UI E2E + CI — the MVP closer):** the deployable `MacroHedgeExecutor` mints through the mandate path on the fork; the `ExecutorDecided` 8-param event is the UI surface (decode shape proven); the `volToWidth` even-width invariant means the regime-conditional geometry mints under BOTH TRANQUIL and STRESS without tick-alignment surprises.
- **No blockers.** The even-width invariant is documented in-source; the full regression tree is green; the project compiles clean.

---
*Phase: 14-representativeness-derivation*
*Completed: 2026-06-07*

## Self-Check: PASSED
- Files modified all present on disk: `DemoMacroHedgeExecutor.fork.t.sol`, `VolToWidth.sol`, `14-03-SUMMARY.md`, `deferred-items.md` (resolved).
- Commits present: `f92b0f7` (test 14-03, RED) + `e686d4d` (fix 14-03, GREEN).
- Per-file ancestry: `git merge-base --is-ancestor f92b0f7 e686d4d` → true (the failing test landed BEFORE the fix).
- The volToWidth snap line is byte-identical to the gate-passed fix (`if ((raw & 1) == 1) raw = raw < 4095 ? raw + 1 : raw - 1;`) — NOT altered.
- Fork mint re-verified: `make test-demo` 6/6 (`test_resolveFromMandate_mintsThroughExecutor` strike == 360360 + numberOfLegs > 0); fork EXEC 7/7; Representativeness 17/17; onResult 4/4; fork-free tree 114/114; `forge build` exit 0.
