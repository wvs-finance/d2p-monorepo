---
phase: 07-agent-reasoning-position-surface
plan: "00"
subsystem: data-layer
tags: [somnia, viem, bigint, tdd, liveness, abi, provenance, snapshot]

requires:
  - phase: 06-somnia-agent-surface
    provides: reader.ts seam, HedgeDecisionView, snapshot.json, abi.ts, chain.ts, bridge.ts

provides:
  - HedgeDecisionRequested event + LongGammaWrapperAbi verbatim in abi.ts
  - WrapperPositionView + adaptWrapper §2 chokepoint in wrapper-adapter.ts
  - getWrapperPosition WRAPPER_DEPLOYED-gated reader (default not-deployed)
  - LivenessSource<T> + snapshotSource + pollingSource in liveness.ts
  - buildPromptTrace + SYSTEM_PROMPT deterministic reconstruction in prompt-trace.ts
  - getDecisionTraceById join in reader.ts (DecisionTraceView, additive)
  - DecisionTraceView type in types.ts (additive — HedgeDecisionView unchanged)
  - snapshot.json legs block with FULL-FIDELITY verified leg events
  - capture-snapshot.ts getLogs recipe for leg capture
  - fork-verified neutral provenance tier in ProvenanceBadge.tsx
  - WRAPPER_DEPLOYED server gate in lib/env.ts

affects:
  - 07-01-trace-ui (consumes getDecisionTraceById + buildPromptTrace + LivenessSource)
  - 07-02-position-panel (consumes WrapperPositionView + getWrapperPosition)
  - 07-03-management (consumes fork-verified tier)

tech-stack:
  added: []
  patterns:
    - "LivenessSource<T>: useSyncExternalStore-shaped contract; snapshotSource/pollingSource realizations only (no live)"
    - "adaptWrapper chokepoint: all §2 rules encoded in one function; JSX imports WrapperPositionView only"
    - "WRAPPER_DEPLOYED lazy gate: mirroring SOMNIA_LIVE pattern (reader.ts:139)"
    - "DecisionTraceView additive: never touches HedgeDecisionView.decisionId (Phase-6 consumers stable)"
    - "TDD failing-first: stubs excluded from tsconfig until modules land (Wave-0 pattern from 05.1-00)"

key-files:
  created:
    - lib/apps/abrigo/somnia/prompt-trace.ts
    - lib/apps/abrigo/somnia/wrapper-adapter.ts
    - lib/apps/abrigo/somnia/liveness.ts
    - tests/unit/somnia-prompt-trace.test.ts
    - tests/unit/wrapper-adapter.test.ts
    - tests/unit/somnia-liveness.test.ts
    - tests/unit/somnia-decision-trace-reader.test.ts
    - tests/unit/provenance-fork-verified.test.tsx
  modified:
    - lib/apps/abrigo/somnia/abi.ts
    - lib/apps/abrigo/somnia/types.ts
    - lib/apps/abrigo/somnia/reader.ts
    - lib/apps/abrigo/somnia/snapshot.json
    - lib/apps/abrigo/somnia/capture-snapshot.ts
    - lib/env.ts
    - components/defi/ProvenanceBadge.tsx
    - tsconfig.json

key-decisions:
  - "getDecisionTraceById joins snapshot by decisionId (= size-leg requestId / route key); additive — HedgeDecisionView.decisionId unchanged"
  - "LivenessSource<T> ships snapshot+polling only; liveness='live' structurally absent; honker-node never in package.json"
  - "adaptWrapper is the single §2 chokepoint: stale baselines (lastSurviving*/deposited*) and realized-costs are structurally unreachable"
  - "WRAPPER_DEPLOYED gate default false; no live RPC read executes in Phase 7; adaptWrapper unreachable until flag flips"
  - "Action-leg timestamp em-dash for decision 4083729 (log outside 1000-block window) is the honest fallback, not a missing feature"
  - "buildPromptTrace takes consensus as parameter (route-correct: 500 for 4083729, 900 for 4083997)"

requirements-completed: [MOD3-TRACE, MOD3-POS, MOD3-MANAGE, MOD3-LIVE, CROSS-09]

duration: 8min
completed: "2026-06-02"
---

# Phase 7 Plan 00: Data Layer Foundation Summary

**Typed Somnia data layer foundation: deterministic prompt-trace reconstruction + adaptWrapper
§2 chokepoint + LivenessSource contract + FULL-FIDELITY leg events via verified getLogs recipe
+ fork-verified neutral provenance tier (5 TDD tests GREEN, Phase-6 regression GREEN)**

## Performance

- **Duration:** 8 min
- **Started:** 2026-06-02T23:03:31Z
- **Completed:** 2026-06-02T23:11:00Z
- **Tasks:** 2 (TDD: red stubs → green implementations)
- **Files modified:** 10 modified, 3 created (modules) + 5 test files

## Accomplishments

- `getDecisionTraceById` joins snapshot by size-leg requestId with BigInt/Date rehydration at
  the boundary; DecisionTraceView carries FULL-FIDELITY leg data (real actionRequestId DERIVED
  from decisionId topic; actionTimestamp null for 4083729 — honest em-dash)
- `adaptWrapper` encodes all §2 honesty rules: stale baselines (lastSurviving*/deposited*) and
  realized-costs are structurally unreachable; `getWrapperPosition` returns `{deployed:false}`
  by default (WRAPPER_DEPLOYED unset)
- `LivenessSource<T>` contract ships snapshot+polling only; `getServerSnapshot` returns the
  stable seed so first paint matches server text (no React hydration mismatch #418)
- `buildPromptTrace(actual, consensus)` reconstructs the verbatim on-chain `_buildPrompt`
  template deterministically; SYSTEM_PROMPT is the byte-identical on-chain constant
- `fork-verified` neutral provenance tier added with ShieldCheck icon; NEVER status-pass/green

## Task Commits

1. **Task 1: Failing-first stubs + ABI + types + env gate + provenance tier** - `1194f22` (test)
2. **Task 2: Implement all modules + extend snapshot capture** - `a6865da` (feat)

## Files Created/Modified

- `lib/apps/abrigo/somnia/prompt-trace.ts` — SYSTEM_PROMPT + buildPromptTrace (deterministic)
- `lib/apps/abrigo/somnia/wrapper-adapter.ts` — WrapperPositionView + adaptWrapper + getWrapperPosition
- `lib/apps/abrigo/somnia/liveness.ts` — LivenessSource<T> + snapshotSource + pollingSource
- `lib/apps/abrigo/somnia/reader.ts` — getDecisionTraceById added (imports, types, implementation)
- `lib/apps/abrigo/somnia/types.ts` — DecisionTraceView added (additive; HedgeDecisionView unchanged)
- `lib/apps/abrigo/somnia/snapshot.json` — legs block added with verified leg values
- `lib/apps/abrigo/somnia/capture-snapshot.ts` — getLogs recipe for leg capture added
- `lib/apps/abrigo/somnia/abi.ts` — HedgeDecisionRequested + LongGammaWrapperAbi (already present)
- `lib/env.ts` — WRAPPER_DEPLOYED server gate (already present)
- `components/defi/ProvenanceBadge.tsx` — fork-verified tier + ShieldCheck (already present)
- `tsconfig.json` — 4 stubs un-excluded (atomic with module landing)

## Decisions Made

- `DecisionTraceView` is purely additive: `HedgeDecisionView.decisionId` stays as the requestId
  string so `HedgeDecisionFeed` (`key={decision.decisionId}`), `HedgeDecisionCard`, and Phase-6
  unit tests compile and pass unchanged.
- `buildPromptTrace` takes `consensus` as a parameter (not hardcoded) so route-correct consensus
  renders: 500 for decision 4083729, 900 for decision 4083997.
- Action-leg timestamp is `null` (not fabricated) for 4083729 because its log falls outside the
  1000-block getLogs window — renders as em-dash, which is the honest fallback.

## Deviations from Plan

None — plan executed exactly as written. All modules were present as partial implementations
from prior partial work; `getDecisionTraceById` was the only missing piece for Task 2 GREEN.
Biome auto-format fixes applied (import ordering, literal keys, template literal style) before
committing — these are linter-enforced style, not plan deviations.

## Issues Encountered

- Biome required `prompt-trace.ts` to collapse the multi-line string concatenation into a single
  template literal (lint/style/useTemplate). Fixed and verified — output is byte-identical.
- `capture-snapshot.ts` ABI lookup used `!` non-null assertion (biome: noNonNullAssertion).
  Fixed by caching the ABI entry with an explicit null guard before use.

## Note: Live Verification Skipped (Data-Layer Only)

Per CLAUDE.md, the Evidence Collector live agent is skipped for this plan. This plan produces
NO user-visible route — it is a pure data-layer/type-layer foundation consumed by downstream
Phase-7 UI plans. Verification is unit tests + tsc + biome (all GREEN).

## Next Phase Readiness

- `getDecisionTraceById` ready for 07-01 trace UI component
- `WrapperPositionView` + `getWrapperPosition` ready for 07-02 position panel
- `LivenessSource<T>` seam ready for 07-03 liveness pill
- `fork-verified` tier ready for 07-03 management panel
- Phase-6 consumers (`HedgeDecisionFeed`, `HedgeDecisionCard`, somnia-reader tests) unchanged

---
*Phase: 07-agent-reasoning-position-surface*
*Completed: 2026-06-02*

## Self-Check: PASSED

Files verified:
- lib/apps/abrigo/somnia/prompt-trace.ts: EXISTS
- lib/apps/abrigo/somnia/wrapper-adapter.ts: EXISTS
- lib/apps/abrigo/somnia/liveness.ts: EXISTS
- lib/apps/abrigo/somnia/reader.ts (getDecisionTraceById): EXISTS
- lib/apps/abrigo/somnia/types.ts (DecisionTraceView): EXISTS
- snapshot.json legs block: EXISTS (4079637, 4083984)

Commits verified:
- 1194f22: test(07-00) — EXISTS
- a6865da: feat(07-00) — EXISTS

Test results: 49/49 plan tests + 24/24 Phase-6 regression = 73/73 GREEN
tsc --noEmit: EXIT 0
biome check: EXIT 0 (clean)
