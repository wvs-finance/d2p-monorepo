---
phase: 16-shiller-differentiated-representativeness
plan: 02
subsystem: representativeness-geometry
tags: [shiller, school-branch, resolveFromMandate, evm-tdd, fork-proven, open-q3-resolved]
requires:
  - 16-01 (SHILLER lib fns + ISurpriseOracle wired immutable + 10-arg ctor)
  - RepresentativenessLib.shiller{Surprise,OptionRatio,StrikeTick,Width,Stale}
  - the shared Fix-C _resolveAndMintAtStrike sink (Phase 14, byte-unchanged)
provides:
  - MacroHedgeExecutor.resolveFromMandate BRANCHED on mandate.economicTheory (0x5 SHILLER / else PKE)
  - _resolveFromShillerMandate internal arm + SHILLER_RATIONALE TEMPLATE constant
  - fork proofs: SHILLER differentiation + per-school honesty + PKE regression anchor + downside resolution
affects:
  - 16-03 (the whole-workflow suite consumes the branched executor)
tech-stack:
  added: []
  patterns:
    - "school-branch via address(mandate.economicTheory) == address(uint160(0x5)); else = verbatim PKE"
    - "SHILLER arm extracted to an internal fn to keep the PKE frame byte-identical + dodge stack-too-deep"
    - "depreciation-only-v1: s<0 K_lo underflows dispatch on the fork -> s=0 -> 360360 minimal stance"
key-files:
  created: []
  modified:
    - contracts/src/MacroHedgeExecutor.sol
    - contracts/test/fork/DemoMacroHedgeExecutor.fork.t.sol
    - contracts/test/fork/DemoMacroHedgeExecutor.fork.tree
decisions:
  - "open-Q3 RESOLVED by LIVE FORK EVIDENCE: the s<0 K_lo appreciation strike (356100, below spot) UNDERFLOWS (0x11) inside Panoptic dispatch -> v1 is depreciation-only (s<0 -> s=0 -> 360360 K_hi); two-sided strip deferred to v2"
  - "SHILLER arm extracted to _resolveFromShillerMandate (internal) — keeps the PKE body byte-identical AND avoids stack-too-deep in resolveFromMandate"
  - "regimeZt=0 (N/A) on the SHILLER ExecutorDecided — the SHILLER arm reads the surprise oracle, not the regime"
metrics:
  duration: ~12 min
  tasks: 3
  files: 3
  completed: "2026-06-07"
---

# Phase 16 Plan 02: Shiller-differentiated representativeness branch Summary

The load-bearing differentiation: `resolveFromMandate` now BRANCHES on `mandate.economicTheory`. The SHILLER sentinel (`0x5`) takes a new arm that reads the Wave-1 `surpriseOracle` (staleness fail-safe -> s=0), derives the convex size + sign-driven further-OTM strike + |s|-scaled even-snapped width from the Wave-1 SHILLER lib fns, and emits a Shiller/UNVALIDATED TEMPLATE rationale; every other sentinel (incl. PKE `0x6`) falls through to the EXISTING body, byte-identical. The school CHANGES the geometry, not just the label — fork-proven: a +2σ SHILLER mandate mints at 361200 (≠ the PKE 360360 anchor), and the PKE mandate still mints exactly 360360.

## What shipped

- **Task 1 (`2d5ffe0`, RED):** the three SHILLER fork tests (`test_branch_shillerDiffersFromPke`, `test_executorDecided_perSchoolHonesty`, `test_branch_shillerDownsideFork`) + the `_shillerMandate`/`_decodeExecutorDecided` helpers + the three bulloak-anchored `test_When*` delegating leaves + the `.tree`. Committed FIRST per the evm-TDD Iron Law; all three RED-verified failing on the LIVE fork (SHILLER mandate hit the PKE path -> minted 360360 instead of the SHILLER strikes).
- **Task 2 (`2e42f12`, GREEN):** `SHILLER_RATIONALE` TEMPLATE constant + the `if (0x5) return _resolveFromShillerMandate(...);` branch in `resolveFromMandate` (the PKE body unwrapped right after, byte-identical — the if-arm returns, so no else braces touch the PKE lines). `_resolveFromShillerMandate` extracted as an internal fn (stack-too-deep + byte-identity). Ancestry `git merge-base --is-ancestor 2d5ffe0 2e42f12` -> true.

## Verified outputs (fork-proven, exact)

- `test_branch_shillerDiffersFromPke`: SHILLER +2σ strike == 361200, != 360360, minted at 361200, `numberOfLegs(exec) > 0`.
- `test_executorDecided_perSchoolHonesty`: SHILLER rationale contains "Shiller" + "UNVALIDATED"; PKE rationale contains "post-Keynesian"; BOTH `nonErgodicDisclosed == true`.
- `test_branch_shillerDownsideFork`: s=-2σ collapses to the K_hi minimal stance 360360 (depreciation-only-v1), mints, executor owns the leg.
- `test_resolveFromMandate_mintsThroughExecutor` (regression anchor): PKE STILL mints EXACT 360360, rationale unchanged.

## open-Q3 — downside (K_lo) resolution (the live-fork decision)

Path A (live K_lo below-spot mint at 356100) was tried FIRST per the plan. On the live Polygon fork the s=-2σ K_lo strike (356100, BELOW spot) **panicked with arithmetic underflow (0x11) inside Panoptic's `dispatch`** — the appreciation leg-upper crosses spot on the OPPOSITE side of the proven K_hi clearance (RESEARCH Pitfall 8). The fork evidence therefore chose the **depreciation-only-v1 fallback**: `if (s < 0) s = 0;` at the top of the SHILLER arm, so a CPI miss collapses to the minimal-stance K_hi (360360). The two-sided Carr-Madan strip (live K_lo appreciation leg) is the documented deferred-v2 stretch; `EXPECTED_SHILLER_DOWNSIDE_2SIGMA = 356100` is retained in the test file as the v2 target constant.

## Test results

- demo fork suite: **13/13 green** on the live Polygon fork (the 4 SHILLER/PKE-anchor tests + the 3 bulloak `test_When*` leaves + the 6 Phase-13/14 demo tests — no regression).
- `Representativeness.t.sol`: **17/17 un-regressed** (PKE lib byte-identical).
- `MacroHedgeExecutor.onResult.t.sol`: **4/4** (decode-isolation intact).
- `forge build`: exit 0 project-wide.
- Iron Law: RED `2d5ffe0` is an ancestor of GREEN `2e42f12` -> true.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `_decodeExecutorDecided` tuple-destructure arity mismatch**
- **Found during:** Task 1 build (the RED commit's helper, on disk from a prior session).
- **Issue:** the skip-pattern `(,, strikeTick,, nonErgodicDisclosed, rationale)` had 6 slots but `ExecutorDecided` is an 8-param event whose non-indexed tail decodes to a 7-tuple -> solc 7407 "not implicitly convertible".
- **Fix:** added the missing skip slot for the `width` int24 -> `(,, strikeTick,,, nonErgodicDisclosed, rationale)`.
- **Files modified:** contracts/test/fork/DemoMacroHedgeExecutor.fork.t.sol
- **Commit:** 2d5ffe0 (folded into the RED commit before it was committed).

**2. [Rule 3 - Blocking] Stack-too-deep when the SHILLER arm was inlined**
- **Found during:** Task 2 GREEN build.
- **Issue:** inlining the SHILLER locals into `resolveFromMandate` overflowed the stack (Compiler error LValue.cpp:51).
- **Fix:** extracted the SHILLER arm into `_resolveFromShillerMandate` (internal) — a cleaner separation that ALSO keeps the PKE frame byte-identical.
- **Files modified:** contracts/src/MacroHedgeExecutor.sol
- **Commit:** 2e42f12 (the GREEN commit).

**3. [open-Q3, plan-prescribed] downside test expectation flipped to 360360**
- The plan explicitly instructed: try path A first; if the K_lo leg trips on the fork, switch to depreciation-only-v1 and assert that. The fork proved the underflow, so the impl + the downside test both landed on the 360360 fallback (not a deviation — the planned branch).

### Note (bulloak)

`bulloak check` on `DemoMacroHedgeExecutor.fork.tree` still WARNS (it anchors the tree root on the FIRST contract in the file, which is the `ICollateralDeposit` helper — this fork file has 5 helper contracts that MUST precede the test contract by Solidity ordering, so the root cannot anchor on `DemoMacroHedgeExecutorForkTest` without an invasive whole-file reorder). The plan's Task-1 verify gate pipes bulloak through `tail -2` (exit 0 regardless) and gates on the three `--match-test` name greps, which all pass; the three bulloak-named `test_When*` leaves exist and run green. This matches the documented 14-03 "this fork file has no .tree" reality — the tree is best-effort BTT documentation here, not a hard anchor.

## Self-Check: PASSED

- FOUND commit: 2d5ffe0 (Task 1 RED)
- FOUND commit: 2e42f12 (Task 2 GREEN)
- FOUND: contracts/src/MacroHedgeExecutor.sol contains SHILLER_RATIONALE + address(uint160(0x5)) + surpriseOracle.latestSurprise
- FOUND: contracts/test/fork/DemoMacroHedgeExecutor.fork.t.sol contains test_branch_shillerDiffersFromPke
- Iron Law ancestry: true
