---
phase: 16-shiller-differentiated-representativeness
plan: 03
subsystem: agent-interaction-workflow
tags: [shiller, whole-workflow, agent1-agent2-join, anti-tautology, evm-tdd, fork-proven, SHILLER-02]
requires:
  - 16-02 (MacroHedgeExecutor.resolveFromMandate branched on economic school)
  - MacroHedgeStrategist (Agent-1 inferString/inferNumber -> HedgeMandate via getMandate)
  - the shared Fix-C _resolveAndMintAtStrike sink (Phase 14, byte-unchanged)
provides:
  - MacroWorkflow.fork.t.sol — the SHILLER-02 whole-workflow JOIN proof (Agent-1 in-VM -> getMandate -> Agent-2 fork mint)
  - fork-proven same-input-different-geometry across SHILLER/PKE, proven NON-trivially (intra-school monotonicity + flip-only-the-sentinel)
affects:
  - Phase 16 phase-goal verifier (this is the final wave; the agent-interaction-layer differentiation proof)
tech-stack:
  added: []
  patterns:
    - "Agent-1 in-VM (MockPlatform-driven, fork-free LLM legs) joined to Agent-2 fork mint in ONE foundry VM"
    - "_init_world() ONCE per test (shared per-test pool); each _runWorkflow run deploys its OWN funded executor against it"
    - "anti-tautology: intra-school SIZE monotonicity (62<90 share strike 361620) + flip-only-0x5<->0x6 with identical oracles"
key-files:
  created:
    - contracts/test/instrument/MacroWorkflow.tree
    - contracts/test/instrument/MacroWorkflow.fork.t.sol
  modified: []
decisions:
  - "the workflow JOIN bridges Agent-1's getMandate mandate (economicTheory = the resolved 0x5/0x6 sentinel from the school string) directly into Agent-2's resolveFromMandate — no re-encoding"
  - "_init_world() is hoisted to ONCE per test; calling it twice reverts AlreadyInitialized — each run reuses the shared pool with its own funded executor"
  - "the downside scenario honestly asserts the 16-02 depreciation-only-v1 outcome (s<0 -> s=0 -> 360360), NOT a two-sided strip"
  - "the anti-tautology proof is load-bearing: a stubbed school-keyed constant FAILS the intra-school 62<90 size monotonicity AND the flip-only-the-sentinel (identical oracles, geometry still differs)"
metrics:
  duration: ~14 min
  tasks: 2
  files: 2
  completed: "2026-06-07"
---

# Phase 16 Plan 03: Shiller-differentiated whole-workflow suite Summary

The agent-interaction-layer proof (the layer just below the UI): a single fork test contract runs Agent-1 (`MacroHedgeStrategist` + `MockPlatform`, in-VM — the LLM legs need no fork) to assemble a `HedgeMandate`, bridges it via `getMandate`, then drives Agent-2 (`MacroHedgeExecutor.resolveFromMandate`) to mint on the Polygon fork. Four Colombian macro-risk scenarios run under BOTH schools and the suite asserts the load-bearing claim — for the SAME macro-risk input, SHILLER vs PKE produce DIFFERENT geometry — proven NON-trivially so a stubbed school-keyed constant would FAIL.

## What shipped

- **Task 1 (`83f7fca`, RED):** `MacroWorkflow.tree` (the SHILLER-02 whole-workflow BTT spec, 3 when/it leaves) + `MacroWorkflow.fork.t.sol` (the `_assembleMandate` Agent-1 in-VM driver, `_runWorkflow`/`_flipSentinelRun` join helpers, the 3 VALIDATION tests + 3 bulloak-anchored delegating leaves). Committed FIRST per the evm-TDD Iron Law; compiled but unproven on the fork.
- **Task 2 (`2d83a5c`, GREEN):** the integration wiring — `_init_world()` hoisted to ONCE per test (it reverts `AlreadyInitialized` if called twice; each `_runWorkflow` run instead deploys its own funded executor against the shared per-test pool), ASCII-only assertion messages (solc 8936 on the non-ASCII sigma literals). 6/6 green on the live Polygon fork. Ancestry `git merge-base --is-ancestor 83f7fca 2d83a5c` -> true.

## Fork-proven differentiation evidence (per-scenario decoded geometry)

| Scenario | surprise s | SHILLER strike / size | PKE strike / size |
|----------|-----------|------------------------|--------------------|
| CPI upside | +2σ | 361200 / 22 | 360360 / 50 |
| CPI downside | −2σ | 360360 / 1 (depreciation-only-v1) | 360360 / 50 |
| fiscal-slippage tail | +3.5σ | 361620 / 90 | 360360 / 50 |
| carry-unwind | +3σ | 361620 / 62 | 360360 / 50 |

For every scenario the SHILLER strike OR size differs from PKE (`test_workflow_sameInputDifferentGeometry`), and both schools mint (`numberOfLegs(exec) > 0`).

## Anti-tautology assertions (the whole point — NOT trivially satisfiable)

- **(a) INTRA-SCHOOL monotonicity:** within SHILLER, +3σ and +3.5σ floor to the SAME strike tick 361620, so the proof uses SIZE: a larger |s| STRICTLY increases the convex size (`assertGt(sSize35, sSize3)` → 90 > 62). A school-keyed constant stub would fail this.
- **(b) FLIP-ONLY-THE-SENTINEL:** `_flipSentinelRun` assembles an otherwise byte-identical mandate, seeds IDENTICAL surprise (+2σ) + regime (Stress) oracles, and flips ONLY `economicTheory` (0x5↔0x6). The geometry STILL differs (SHILLER 361200/22 vs PKE 360360/50) — proving the SCHOOL branch drives it, not merely a different oracle seeding.

## Per-school TEMPLATE honesty (`test_workflow_perSchoolHonesty`)

The SHILLER rationale contains "Shiller" + "UNVALIDATED"; the PKE rationale contains "post-Keynesian"; both surface `nonErgodicDisclosed == true` on `ExecutorDecided`.

## Test results

- `MacroWorkflow` suite: **6/6 green** on the live Polygon fork (3 VALIDATION tests + 3 bulloak-anchored delegating leaves).
- PKE regression anchor `test_resolveFromMandate_mintsThroughExecutor`: STILL mints EXACT 360360.
- `Representativeness.t.sol`: **17/17 un-regressed**.
- `ShillerRepresentativeness` unit: **10/10 un-regressed** (5 bulloak leaves + 5 assertion fns — the plan's "5/5" refers to the leaf count).
- `MacroHedgeExecutor.onResult.t.sol`: **4/4** (decode-isolation intact).
- demo fork suite (`DemoMacroHedgeExecutor.fork.t.sol`): **13/13** (the 16-02 SHILLER tests + PKE anchor + Phase-13/14 demo — no regression).
- `forge build`: exit 0 project-wide.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `_init_world()` double-call reverted `AlreadyInitialized`**
- **Found during:** Task 2 (the first fork run RED'd at `collateralToken0()` on `0x0`, then `AlreadyInitialized()`).
- **Issue:** the prior-session draft never called `_init_world()` (pool stayed `0x0` → `collateralToken0()` on a non-contract). Adding it inside `_runWorkflow` then double-fired it per test → `AlreadyInitialized`.
- **Fix:** hoisted `_init_world()` to ONCE at the top of each VALIDATION test; each `_runWorkflow`/`_flipSentinelRun` reuses the shared pool and deploys its OWN funded executor (distinct dispatch caller + 4626 owner). This is the demo file's per-test pool-isolation pattern.
- **Files modified:** contracts/test/instrument/MacroWorkflow.fork.t.sol
- **Commit:** 2d83a5c (the GREEN commit).

**2. [Rule 3 - Blocking] non-ASCII sigma in string literals (solc 8936)**
- **Issue:** assertion messages carried a literal σ → "Invalid character in string" compile error.
- **Fix:** ASCII-only messages ("sigma", "abs s").
- **Commit:** 2d83a5c.

**3. [Rule 1 - Bug] dead tuple-assignment + wrong-typed sentinel cast (prior-session draft)**
- **Issue:** a nonsensical `(,, uint256 sSizeD,,,) = (int24(0), ...)` line and an `IMacroThesisLike` cast that could not assign to the `IMacroThesis economicTheory` field.
- **Fix:** replaced with a plain `uint256 sSizeD = 1` (s=0 ⇒ shillerOptionRatio == 1) and imported the real `IMacroThesis` for the flip-only-sentinel override; removed the dead `IMacroThesisLike` interface + `_asThesis` helper.
- **Files modified:** contracts/test/instrument/MacroWorkflow.fork.t.sol
- **Commit:** 83f7fca (folded into the RED commit before it was committed).

### Note (bulloak)

`bulloak check test/instrument/MacroWorkflow.tree` WARNS — bulloak matches the `.tree` to a `<stem>.t.sol` sibling, but the file is `MacroWorkflow.fork.t.sol` (the `.fork` suffix is LOAD-BEARING: the 15-02 CI `--match-path 'test/**/*fork*'` gate both excludes it from the keyless job and includes it in the secret-bearing polygon job; renaming it to `MacroWorkflow.t.sol` would break CI). The 3 bulloak-derived leaf names (`test_WhenTheSameMacro_riskScenarioIsResolvedAcrossBothSchools`, `test_WhenEachSchoolResolvesTheSameScenario`, `test_WhenTheFourColombianScenariosRunUnderBothSchools`) were verified by `bulloak scaffold` and all exist + run green. Same documented reality as the 16-02 `DemoMacroHedgeExecutor.fork.tree`.

## Self-Check: PASSED

- FOUND: contracts/test/instrument/MacroWorkflow.tree
- FOUND: contracts/test/instrument/MacroWorkflow.fork.t.sol (contains test_workflow_sameInputDifferentGeometry)
- FOUND commit: 83f7fca (Task 1 RED)
- FOUND commit: 2d83a5c (Task 2 GREEN)
- Iron Law ancestry: 83f7fca is an ancestor of 2d83a5c -> true
