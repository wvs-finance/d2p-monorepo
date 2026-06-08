---
phase: 08-scenario1-agent-cornerstone
plan: "00"
subsystem: cornerstone-data-layer
tags: [tdd, workflow-store, events, presets, mock-engine, bigint, provisional-contract]
dependency_graph:
  requires: []
  provides:
    - lib/apps/abrigo/cornerstone/events.ts
    - lib/apps/abrigo/cornerstone/presets.ts
    - lib/apps/abrigo/cornerstone/workflow-store.ts
    - lib/apps/abrigo/cornerstone/workflow-engine.ts
  affects:
    - 08-01 (HedgeDecisionCardV2 consumes HedgeLegParamsView from events.ts)
    - 08-02 (CornerStone route uses createWorkflowStore + runWorkflow)
    - 08-03 (if-time RunHistory uses createWorkflowStore)
tech_stack:
  added: []
  patterns:
    - useSyncExternalStore-shaped store (pattern from liveness.ts, NOT a reuse)
    - immutable RunState with stable-ref invariant per emit
    - BigInt burn class — format at adapter boundary (fromMockEvent)
    - per-call factory (no module singleton) — server-leak guard
key_files:
  created:
    - lib/apps/abrigo/cornerstone/events.ts
    - lib/apps/abrigo/cornerstone/presets.ts
    - lib/apps/abrigo/cornerstone/workflow-store.ts
    - lib/apps/abrigo/cornerstone/workflow-engine.ts
    - tests/unit/cornerstone-events.test.ts
    - tests/unit/cornerstone-store.test.ts
    - tests/unit/cornerstone-engine.test.ts
    - tests/unit/cornerstone-presets.test.ts
  modified:
    - tsconfig.json (RED stubs excluded then un-excluded in atomic GREEN commit)
decisions:
  - "strikeWAD display format: int24 tick / 1000 → 3dp decimal string with sign (4100 → '4.100', -887272 → '-887.272')"
  - "IDLE is module-level frozen constant; createWorkflowStore closure-local state only — no module singleton"
  - "runWorkflow emits enriched view objects (fromMockEvent applied), not raw WorkflowEvent structs"
  - "Fake-timer tests: split advanceTimersByTimeAsync calls to drain each sleep independently"
metrics:
  duration_min: 10
  completed: 2026-06-06
  tasks_completed: 2
  files_changed: 9
---

# Phase 8 Plan 0: Cornerstone Data Layer (TDD) Summary

Froze the Phase-8 data layer: the PROVISIONAL WorkflowEvent contract + fromMockEvent adapter (signed int256/int24, free-text thesis/rationale), the preset→recordedDecisionId map pinned to the two real Somnia decisions, the useSyncExternalStore-shaped workflow-store owning the reducer with stable-ref invariant, and the deterministic timed mock WorkflowEngine — all TDD failing-first.

## What Was Built

**events.ts** — PROVISIONAL (comment at top-of-file per plan) WorkflowEvent discriminated union (4 variants: StrategistDecided/ExecutorDecided/PositionMinted/PerformanceUpdated) with the real §5 signed field types. `fromMockEvent` adapter at the BigInt burn class boundary: SIGNED int256 preserved with sign, int24 ticks → decimal string with sign preserved, free-text thesis/rationale exposed verbatim.

**presets.ts** — `PRESETS` const array with exactly 2 entries: `infl-surprise-add → 4083729`, `infl-cooling-reduce → 4083997`. Comment documents that recordedDecisionId is the snapshot decisionId join key (= size-leg requestId), not a surrogate. `resolveNearestPreset(text)` keyword heuristic never returns null.

**workflow-store.ts** — `createWorkflowStore()` per-call factory (NEVER exported singleton). Closure-local state: `RunState` + `Set<listener>`. `IDLE` is the only module-level constant (frozen). `reduce()` owns all state transitions. Stable-ref: `Object.is(before, before) === true`, `Object.is(before, after) === false`. `getServerSnapshot()` always returns `IDLE` (same ref, React #418 guard).

**workflow-engine.ts** — `runWorkflow(presetId, emit, { confirm })` emits 3 events: StrategistDecided after 600ms, ExecutorDecided after 1800ms, PositionMinted after 1200ms post-confirm. User-gated: `await confirm` (no auto-delay). `fromMockEvent` applied before emit.

## Test Coverage

36/36 tests GREEN across 4 suites. TDD: RED commit (59ad042) → GREEN commit (45d7718).

Key acceptance criteria verified:
- SIGNED-EDGE AC (RC-B1): `-1234567890123456789n` pnl preserved; `-887272` strike → `'-887.272'` (sign in string, not abs-coerced)
- PER-REQUEST AC (FD-M1): two `createWorkflowStore()` instances are independent
- PRESET-MAPPING AC (RC-M4): pinned fixtures `"alza inflación"` → `infl-surprise-add`, `"se reduce la inflación"` → `infl-cooling-reduce`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Engine test fake-timer cleanup: split advanceTimersByTimeAsync calls**
- **Found during:** Task 2 GREEN verification
- **Issue:** Tests 1 and 5 of cornerstone-engine.test.ts timed out (5000ms) because after advancing 650ms (past sleep(600)), calling `await vi.advanceTimersByTimeAsync(2000)` wasn't enough — the engine had sleep(1800) + sleep(1200) still pending after `confirm` resolved.
- **Fix:** Split into two sequential `advanceTimersByTimeAsync` calls per remaining sleep, matching the exact delay chain.
- **Files modified:** `tests/unit/cornerstone-engine.test.ts`
- **Commit:** 45d7718

**2. [Rule 2 - Missing check] biome format issues in RED test files**
- **Found during:** Task 1 RED commit attempt
- **Issue:** Biome flagged string concatenation + line-length formatting in 3 test files
- **Fix:** Applied `pnpm biome check --write` + manual fix for template literal
- **Files modified:** cornerstone-{engine,events,presets}.test.ts

## Live Verification

Skipped per CLAUDE.md "When to skip": this is a pure-lib plan (no rendered route, no URL surface). No `lib/apps/abrigo/cornerstone/` code is rendered by any Next.js route in this plan. Verification is unit tests only (36/36 GREEN).

## Self-Check: PASSED

All 8 created files confirmed on disk. Both commits (59ad042 RED, 45d7718 GREEN) confirmed in git log.
