---
phase: 16-shiller-differentiated-representativeness
plan: 01
subsystem: representativeness-geometry
tags: [shiller, cpi-surprise, convex-size, oracle, evm-tdd, ctor-migration]
requires:
  - RepresentativenessLib (PKE fns + structuralStrikeTick + feasibleOptionRatio clamp)
  - VolToWidthLib.volToWidth (even-snap)
  - IRegimeOracle / MockRegimeOracle (the staleness pattern mirrored)
provides:
  - ISurpriseOracle + MockSurpriseOracle (CPI-surprise staleness contract)
  - RepresentativenessLib.shiller{Surprise,OptionRatio,StrikeTick,Width,Stale} + TEMPLATE constants
  - MacroHedgeExecutor 10-arg ctor wiring ISurpriseOracle surpriseOracle (immutable)
affects:
  - 16-02 (resolveFromMandate SHILLER branch consumes these lib fns + the wired oracle)
tech-stack:
  added: []
  patterns:
    - "convex max(|s|-k)^2 option-ratio (WAD^2 -> /WAD/WAD plain-int clamp [1,127])"
    - "sign-driven OTM strike via structuralStrikeTick reuse (no hand-rolled snap)"
    - "monthly-CPI 35-day staleness window distinct from PKE 1h"
key-files:
  created:
    - contracts/src/interfaces/ISurpriseOracle.sol
    - contracts/test/mocks/MockSurpriseOracle.sol
    - contracts/test/instrument/ShillerRepresentativeness.tree
    - contracts/test/instrument/ShillerRepresentativeness.t.sol
  modified:
    - contracts/src/libraries/Representativeness.sol
    - contracts/src/MacroHedgeExecutor.sol
    - contracts/test/fork/DemoMacroHedgeExecutor.fork.t.sol
    - contracts/test/fork/MacroHedgeExecutor.fork.t.sol
    - contracts/test/instrument/MacroHedgeExecutor.onResult.t.sol
    - contracts/script/ProvisionBuildBearDemo.s.sol
decisions:
  - "SHILLER_MAX_STALENESS = 35 days (monthly CPI cadence) — resolves open-Q2, distinct from PKE 1h"
  - "stale/unset surprise -> s=0 minimal stance (honest no-signal reading)"
  - "CPI->FX magnitude asserted STRUCTURE-only (open-Q1); all constants TEMPLATE-labeled"
metrics:
  duration: ~9 min
  tasks: 3
  files: 10
  completed: "2026-06-07"
---

# Phase 16 Plan 01: Shiller-differentiated representativeness substrate Summary

The pure, fork-free half of SHILLER-01: a new `ISurpriseOracle`/`MockSurpriseOracle` (mirroring the proven `IRegimeOracle` staleness contract), four ADDITIVE pure SHILLER fns on `RepresentativenessLib` (standardized CPI surprise, the CONVEX `max(|s|−k,0)²` option-ratio, the SIGN-driven further-OTM structural strike, the `|s|`-scaled even-snapped width) plus a `shillerStale` predicate and six TEMPLATE constants, and the atomic 10-arg ctor migration wiring `ISurpriseOracle surpriseOracle` into `MacroHedgeExecutor` across all ctor sites. PKE path byte-unchanged; the Wave-2 branch (16-02) consumes this substrate.

## What shipped

- **Task 1 (`1856921`):** `ISurpriseOracle.latestSurprise() -> (actualWad, consensusWad, sigmaWad, observedAt)` mirroring `IRegimeOracle`; `MockSurpriseOracle.set(...)` (fresh observedAt) + `setStaleAt(...,ts)` (0=unset, old=stale); unseeded reads (0,0,0,0).
- **Task 2 RED (`0b89a1f`):** `ShillerRepresentativeness.tree` (bulloak 0.9.2 when/it, 5 leaves; staleness has the unset + aged sub-leaves) + the failing unit suite asserting EXACT template outputs. Committed BEFORE impl per the evm-TDD Iron Law; impl-absent compile failure confirmed RED.
- **Task 3 GREEN (`e1b1ab5`):** the 4 SHILLER fns + `shillerStale` + the 6 TEMPLATE constants on `RepresentativenessLib` (reusing `structuralStrikeTick` and `VolToWidthLib.volToWidth` — no hand-rolled snap, no hand-rolled clamp), and the 10-arg ctor migration.

## Verified outputs (exact, asserted)

- Convex ratios: s=1σ→2, 1.5σ→10, 2σ→22, 2.5σ→40, 3σ→62, 3.5σ→90, 4σ→122; ≤0.5σ→1; monotone; ≤127.
- Sign-driven strikes (×60-aligned): +1σ→360780, +2σ→361200, +3σ→361620, −1σ→356760, −2σ→356100; upside > PKE anchor 360360, downside < anchor.
- Width: even-snapped, non-decreasing, STRICT `width(2σ) > width(0)`; s=0 floor == `gbmBaselineWidth(14400,…)`.
- Staleness: BOTH unset (observedAt==0) AND aged (ts < now−35d) → s=0 minimal stance (ratio 1, strike 360360, baseVol width).

## Test results

- `ShillerRepresentativeness` unit suite: **10/10 green** (5 bulloak-anchored leaves + 5 assertion-carrying fns).
- `Representativeness.t.sol` (PKE): **17/17 un-regressed**.
- `MacroHedgeExecutor.onResult.t.sol`: **4/4** (decode-isolation intact through the 10-arg DecodeProbe ctor).
- `forge build`: exit 0 project-wide.
- Iron Law: `git merge-base --is-ancestor 0b89a1f e1b1ab5` → true.

## Executor cosmetic notes (from the gate)

- **Strike σ-quantization:** `shillerStrikeTick` floors `|s|/WAD` to whole σ, so +3σ and +3.5σ share tick 361620 (and +3.0..+3.999σ all map to the 30%-OTM rate). The convex SIZE (`shillerOptionRatio`, 62 vs 90) differentiates them, not the strike. Documented in the fn NatSpec.
- **regimeZt=0 on the SHILLER path is N/A:** the SHILLER branch does not read the regime; `0 == IRegimeOracle.Regime.Unknown` is a documented N/A sentinel for `ExecutorDecided.regimeZt` when the future SHILLER arm emits (Wave-2 concern, not exercised here).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] 6th ctor site in script/ProvisionBuildBearDemo.s.sol**
- **Found during:** Task 3 (the 10-arg ctor migration build)
- **Issue:** The plan enumerated 5 ctor call sites (grep-verified at planning time), but a 6th `new MacroHedgeExecutor(` exists in `contracts/script/ProvisionBuildBearDemo.s.sol:204` — added by the later Phase-15 (15-01) BuildBear provisioning work, after this plan was written. `forge build` failed "9 arguments given but expected 10."
- **Fix:** Added `import {MockSurpriseOracle}` and passed `new MockSurpriseOracle()` as the 10th arg (the script provisions a live demo, so a real mock is correct — not address(0)).
- **Files modified:** contracts/script/ProvisionBuildBearDemo.s.sol
- **Commit:** e1b1ab5 (folded into the atomic GREEN migration commit)

### Note (not a deviation)

The fork-file grep shows ONE `new MockSurpriseOracle` because the two under-funded ctor sites correctly REUSE the shared `surpriseOracle` contract field (set once in `_init_world`/`setUp`), mirroring the existing `regimeOracle` field-reuse pattern — the same precedent the Phase-14 regime-oracle migration established.

## Self-Check: PASSED

- FOUND: contracts/src/interfaces/ISurpriseOracle.sol
- FOUND: contracts/test/mocks/MockSurpriseOracle.sol
- FOUND: contracts/test/instrument/ShillerRepresentativeness.tree
- FOUND: contracts/test/instrument/ShillerRepresentativeness.t.sol
- FOUND commit: 1856921 (Task 1)
- FOUND commit: 0b89a1f (Task 2 RED)
- FOUND commit: e1b1ab5 (Task 3 GREEN)
