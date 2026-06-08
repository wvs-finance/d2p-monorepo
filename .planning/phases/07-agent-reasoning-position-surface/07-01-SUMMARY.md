---
phase: 07-agent-reasoning-position-surface
plan: "01"
subsystem: trace-ui
tags: [somnia, rsc, tdd, vertical-stepper, pipeline-trace, bridge, i18n, copy-review]

requires:
  - phase: 07-agent-reasoning-position-surface
    plan: "00"
    provides: getDecisionTraceById, DecisionTraceView, buildPromptTrace, SYSTEM_PROMPT, bridge.ts

provides:
  - DecisionPipelineTrace RSC component (pipeline-trace, 6-stage vertical stepper)
  - PipelineStage RSC component (pipeline-stage, equal-weight stage node + 1px rail)
  - SystemPromptDisclosure RSC component (SYSTEM_PROMPT collapsible — ONLY sanctioned details)
  - TraceStrings interface (string-threading contract for RSC page)
  - somnia.trace.* i18n keys (17 keys, es-CO + en, BLOCKER-2 reworded illustrativeCaption)
  - copy-review.md somnia.trace row (native sign-off pending)

affects:
  - 07-03 (wires DecisionPipelineTrace on /apps/abrigo/agent/[id] route)

tech-stack:
  added: []
  patterns:
    - "TraceStrings interface: string-threading from RSC page (NO getTranslations inside component)"
    - "decisionToPositionDelta + formatFractionOfMax REUSED from bridge.ts for stage 6 (no recompute)"
    - "feed.consensusCaveat threaded — MAJOR-9: no trace.consensusCaveat minted"
    - "PipelineStage: equal-weight CARD_CLASS + 1px border-l rail + 2px accent-default marker ring"
    - "SystemPromptDisclosure: native details/summary RSC — the ONLY sanctioned collapse in the trace"
    - "TDD: RED stub (module not found) → GREEN all 14 tests (both routes verified)"

key-files:
  created:
    - components/defi/somnia/DecisionPipelineTrace.tsx
    - components/defi/somnia/PipelineStage.tsx
    - components/defi/somnia/SystemPromptDisclosure.tsx
    - tests/unit/decision-pipeline-trace.test.tsx
  modified:
    - messages/es-CO/somnia.json
    - messages/en/somnia.json
    - docs/copy-review.md

key-decisions:
  - "decisionToPositionDelta called with HedgeDecisionView-compatible shape (pending:false) because bridge.ts uses action+sizeBps only; DecisionTraceView carries both — no bridge changes needed"
  - "stage 6 fraction verified: formatFractionOfMax(6800n)='68%', formatFractionOfMax(568n)='6%' — matches plan's exact assertions"
  - "MAJOR-9 enforced structurally: TraceStrings.consensusCaveat is threaded from page (reusing feed.consensusCaveat); no trace.consensusCaveat key exists in either locale file"
  - "Comment text scrubbed of literal details/summary and 'use client' strings to satisfy negative grep acceptance criteria; comments describe the constraint without embedding the banned strings"
  - "live-verify deferred to 07-03: components not yet mounted on a route this plan"

requirements-completed: [MOD3-TRACE, CROSS-09, CROSS-10, CROSS-01]

duration: 9min
completed: "2026-06-02"
---

# Phase 7 Plan 01: DecisionPipelineTrace — 6-stage Vertical Stepper Summary

**Deterministic decision-pipeline trace as a 6-stage RSC vertical stepper with bridge.ts
fraction-of-max position, collapsible SYSTEM_PROMPT viewer, and es-CO-first i18n copy**

## Performance

- **Duration:** 9 min
- **Started:** 2026-06-02T23:17:20Z
- **Completed:** 2026-06-02T23:26:22Z
- **Tasks:** 2 (Task 1: TDD RED → GREEN components; Task 2: i18n copy)
- **Files created:** 4 (3 components + 1 test)
- **Files modified:** 3 (es-CO somnia.json, en somnia.json, copy-review.md)

## Accomplishments

- `DecisionPipelineTrace.tsx` — RSC vertical stepper with exactly 6 `PipelineStage` children
  under `data-testid="pipeline-trace"`, separated by `space-y-6`. Reuses bridge.ts
  `decisionToPositionDelta` + `formatFractionOfMax` for stage 6 illustrative position
  (verified: 6800n → "68%", 568n → "6%"). Never a dollar figure, never recomputed.
- `PipelineStage.tsx` — equal-weight stage node: 1px `border-l border-border-default` vertical
  rail + 2px `ring-accent-default` marker ring + `CARD_CLASS` identical for all 6 stages
  (CROSS-09 anti-fishing). `data-testid="pipeline-stage"`. No `details` element.
- `SystemPromptDisclosure.tsx` — native `details/summary` RSC with `data-testid="SYSTEM_PROMPT"`.
  The ONLY sanctioned collapse in the entire trace surface (MAJOR-10). Default collapsed;
  trigger `text-accent-text`; pre block `whitespace-pre-wrap bg-bg-canvas`.
- `TraceStrings` interface threaded from RSC page — no `getTranslations` inside component
  (mirrors Phase-6 string-threading pattern). Includes `consensusCaveat` field reusing
  `feed.consensusCaveat` (MAJOR-9: no `trace.consensusCaveat` minted in either locale).
- `somnia.trace.*` — 17 keys, full parity across es-CO and en. `illustrativeCaption`
  reworded per BLOCKER-2: "no es una posición real en cadena" / "not a real on-chain position"
  (NOT "ejecutada"/"executed"). `consensusCaveat` intentionally absent from the trace namespace.
- Unit test GREEN: 14 tests covering both routes (4083729 ADD_LONG_GAMMA and 4083997 REDUCE);
  asserts 6 pipeline-stage nodes, route-correct built-prompt consensus, bridge fraction strings,
  no dollar sign, real legActionRequestId, em-dash for null legActionTimestamp, no banned vocab.

## Task Commits

1. **Task 1: PipelineStage + SystemPromptDisclosure + DecisionPipelineTrace** — `0934625` (feat)
2. **Task 2: es-CO-first + en somnia.trace.* copy + copy-review row** — `a96bdc1` (feat)

## Files Created/Modified

- `components/defi/somnia/DecisionPipelineTrace.tsx` — RSC 6-stage vertical stepper
- `components/defi/somnia/PipelineStage.tsx` — equal-weight stage node + DataRow helper
- `components/defi/somnia/SystemPromptDisclosure.tsx` — collapsible SYSTEM_PROMPT (ONLY details)
- `tests/unit/decision-pipeline-trace.test.tsx` — 14 unit tests (both fixtures, TDD GREEN)
- `messages/es-CO/somnia.json` — somnia.trace.* 17 keys added
- `messages/en/somnia.json` — somnia.trace.* 17 keys added (full parity with es-CO)
- `docs/copy-review.md` — somnia.trace namespace row appended

## Decisions Made

- `decisionToPositionDelta` called with a `HedgeDecisionView`-compatible shape (`pending: false`)
  because bridge.ts only uses `action` + `sizeBps`. DecisionTraceView carries both — no changes
  to bridge.ts needed, no type casting needed.
- Negative grep acceptance criteria satisfied by removing literal `<details`, `'use client'`,
  and `Number(sizeBps)/10000` strings from comments (they appeared in documentation strings
  describing constraints). The JSX/code itself never contained those patterns.
- `feed.consensusCaveat` reused structurally via `TraceStrings.consensusCaveat` (MAJOR-9):
  the page threads it once; no duplicate key in the trace locale namespace.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] decisionToPositionDelta type mismatch at call site**
- **Found during:** Task 1 GREEN (tsc --noEmit check)
- **Issue:** `decisionToPositionDelta` expects `HedgeDecisionView` (which has `pending: boolean`);
  `DecisionTraceView` lacks `pending`. tsc error TS2345.
- **Fix:** Constructed a `HedgeDecisionView`-compatible shape inline at the call site with
  `pending: false` (no pending state on DecisionTraceView, which is always settled). Bridge.ts
  only reads `action` and `sizeBps` — structurally sound.
- **Files modified:** `DecisionPipelineTrace.tsx`, `decision-pipeline-trace.test.tsx`
- **Commit:** `0934625`

**2. [Rule 1 - Bug] Comment strings caused false-positive negative grep failures**
- **Found during:** Task 1 acceptance criteria verification
- **Issue:** Comments mentioning `<details`, `'use client'`, and `Number(sizeBps)/10000`
  caused the MAJOR-10 and MINOR-14 negative grep checks to report FAIL. The plan explicitly
  states "Negative greps target code identifiers, not comments."
- **Fix:** Rewrote comment text to describe the constraint without embedding the literal string.
  E.g. `// No 'use client'` → `// server component, no client directive`.
- **Files modified:** `DecisionPipelineTrace.tsx`, `PipelineStage.tsx`, `SystemPromptDisclosure.tsx`
- **Commit:** `0934625`

## Note: Live Verification Deferred to 07-03

Per CLAUDE.md, the Evidence Collector live-verification runs after plan tasks are committed
AND mounted on a rendered route. This plan builds the components but does NOT mount them on
the `/apps/abrigo/agent/[id]` route — that wiring is Plan 07-03.

**Verification completed this plan:** unit tests (14/14 GREEN), tsc (exit 0), biome (exit 0).
**Verification deferred to 07-03:** Evidence Collector live agent on the rendered route.

## Self-Check: PASSED

Files verified:
- components/defi/somnia/DecisionPipelineTrace.tsx: EXISTS
- components/defi/somnia/PipelineStage.tsx: EXISTS
- components/defi/somnia/SystemPromptDisclosure.tsx: EXISTS
- tests/unit/decision-pipeline-trace.test.tsx: EXISTS
- messages/es-CO/somnia.json (trace block): EXISTS
- messages/en/somnia.json (trace block): EXISTS

Commits verified:
- 0934625: feat(07-01) components — EXISTS
- a96bdc1: feat(07-01) copy — EXISTS

Test results: 14/14 plan tests GREEN
tsc --noEmit: EXIT 0
biome check: EXIT 0 (clean)
