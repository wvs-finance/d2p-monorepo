---
phase: 07-agent-reasoning-position-surface
plan: "03"
subsystem: ui
tags: [next-intl, playwright, rsc, react, e2e, a11y, honesty-invariants]

requires:
  - phase: 07-agent-reasoning-position-surface-01
    provides: DecisionPipelineTrace (6-stage vertical stepper + TraceStrings + somnia.trace.* copy)
  - phase: 07-agent-reasoning-position-surface-02
    provides: PositionPanel, ManagementControls, LivenessPill RSC components + somnia.position/manage/liveness copy

provides:
  - Per-decision detail route /apps/abrigo/agent/[id] — RSC assembling trace + position panel + management controls + liveness pill
  - DecisionTraceLink component — master-to-detail link affordance (accent + ChevronRight + underline, CROSS-09)
  - HedgeDecisionFeed feed-card link wiring — identical DecisionTraceLink per card, equal-weight preserved
  - app/(defi)/apps/abrigo/agent/[id]/not-found.tsx — HTTP 404 boundary (errorNotFound + back link)
  - tests/e2e/agent-decision-detail.spec.ts — honesty greps + bounding-box equal weight + 404 status + es-CO/en parity
  - 07-LIVE-VERIFICATION.md — Evidence Collector 11/11 ✓ PASS verdict for the live built DOM

affects:
  - Any future phase that extends /apps/abrigo/agent/* routes
  - Phase 08+ if liveness polling (SOMNIA_LIVE) is enabled

tech-stack:
  added: []
  patterns:
    - notFound() + dedicated not-found.tsx for 404 boundaries (mirrors instruments-route precedent)
    - generateMetadata with static route-level title (no null branch — BLOCKER-4 pattern)
    - Thread all strings from RSC page via prop drilling; NO getTranslations inside leaf components (Phase-6 pattern)
    - bounding-box equal-weight e2e assertion via browser.evaluate + getBoundingClientRect (MAJOR-11 pattern)
    - Evidence Collector live-verification as the mandatory ground-truth gate per CLAUDE.md

key-files:
  created:
    - app/(defi)/apps/abrigo/agent/[id]/page.tsx
    - app/(defi)/apps/abrigo/agent/[id]/not-found.tsx
    - components/defi/somnia/DecisionTraceLink.tsx
    - tests/e2e/agent-decision-detail.spec.ts
  modified:
    - components/defi/somnia/HedgeDecisionFeed.tsx
    - app/(defi)/apps/abrigo/agent/page.tsx
    - messages/es-CO/somnia.json
    - messages/en/somnia.json

key-decisions:
  - "LivenessPill moved behind a 'use client' boundary (LivenessPillClient island) to resolve RSC import error — snapshotSource(seed) remains server-side, passed as initialSource prop"
  - "generateMetadata title is the STATIC route-level trace.title (t('trace.title')) — no null branch because the title does not depend on a found decision (BLOCKER-4)"
  - "DecisionTraceLink is identical per card regardless of action type — equal-weight invariant preserved (CROSS-09)"
  - "errorNotFound and backToPanel copy live exclusively in not-found.tsx, NOT inlined in page.tsx — enforces HTTP 404 (MAJOR-6)"
  - "feed.consensusCaveat threaded into TraceStrings.consensusCaveat — no duplicate es-CO/en drift (MAJOR-9)"

patterns-established:
  - "RSC boundary fix: extract 'use client' island (LivenessPillClient) when a client hook is needed inside an RSC tree — pass server-computed props (initialSource) across the boundary"
  - "notFound() + not-found.tsx: the error copy page is a dedicated file at the [id] level, not an inline conditional in page.tsx"
  - "e2e bounding-box equal weight: collect nodes with querySelectorAll, map .getBoundingClientRect(), assert all entries share identical width+height+fontSize"

requirements-completed: [MOD3-TRACE, MOD3-POS, MOD3-MANAGE, MOD3-LIVE, CROSS-01, CROSS-09, CROSS-10]

duration: 13min
completed: "2026-06-06"
---

# Phase 07 Plan 03: Agent Reasoning Position Surface — Detail Route Summary

**Per-decision detail route /apps/abrigo/agent/[id] wiring DecisionPipelineTrace + PositionPanel + ManagementControls + LivenessPill, with DecisionTraceLink feed-card affordance, HTTP 404 not-found boundary, e2e honesty greps + bounding-box equal weight, and 11/11 Evidence Collector PASS on the live built DOM.**

## Performance

- **Duration:** 13 min
- **Completed:** 2026-06-06
- **Tasks:** 2 auto + 1 human-verify checkpoint (approved)
- **Files modified:** 9

## Accomplishments

- Detail route `/apps/abrigo/agent/[id]` assembled as a fully read-first RSC page — h1 route title + LivenessPill, h2-introduced DecisionPipelineTrace (6 h3-titled stages), PositionPanel (not-deployed empty state), ManagementControls (3 disabled buttons with aria-describedby).
- `DecisionTraceLink` component ships the master-to-detail link affordance (accent-text + ChevronRight icon + underline-on-hover) identical on every HedgeDecisionFeed card, preserving the CROSS-09 equal-weight invariant.
- HTTP 404 boundary via `notFound()` + dedicated `not-found.tsx` carrying `trace.errorNotFound` copy and `trace.backToPanel` back link — no inline-200 error path.
- e2e suite `agent-decision-detail.spec.ts` asserts: route-scoped consensus (500/900), bridge fractions (68%/6%), 6-stage bounding-box equal weight, all 3 management buttons disabled + aria-describedby, snapshot liveness text, honesty NEGATIVE greps (no executed/realized/ejecutad/realizad, no `$digit`, no green on fork-verified), 404 status on unknown id, and en parity via NEXT_LOCALE cookie.
- Evidence Collector live-verification returned **11/11 ✓ PASS** (see `07-LIVE-VERIFICATION.md`).
- Auto-fixed deviation: `LivenessPill` caused an RSC import error because it contained a client-side hook; resolved by extracting a `'use client'` island (`LivenessPillClient`) and passing `initialSource` as a server-computed prop across the boundary.

## Task Commits

1. **Task 1: detail route + DecisionTraceLink + feed-card wiring + not-found.tsx** - `cb78ccc` (feat)
2. **Task 2: e2e honesty greps + bounding-box equal weight + LivenessPill RSC fix** - `4d88393` (feat)
3. **Task 3: Evidence Collector live-verification (human-verify checkpoint)** — approved; verdicts in `07-LIVE-VERIFICATION.md`

**Previous STATE update:** `0cb4220` (chore — recorded after tasks 1+2, before checkpoint)

## Files Created/Modified

- `app/(defi)/apps/abrigo/agent/[id]/page.tsx` — RSC detail page; getDecisionTraceById + notFound() + all string threading
- `app/(defi)/apps/abrigo/agent/[id]/not-found.tsx` — HTTP 404 boundary; errorNotFound copy + backToPanel link
- `components/defi/somnia/DecisionTraceLink.tsx` — master-to-detail link (ChevronRight + accent + underline)
- `components/defi/somnia/HedgeDecisionFeed.tsx` — DecisionTraceLink wired per card; linkLabel threaded
- `app/(defi)/apps/abrigo/agent/page.tsx` — feedStrings updated with linkLabel = t('trace.linkLabel')
- `messages/es-CO/somnia.json` — trace.errorNotFound, trace.linkLabel, trace.backToPanel added (es-CO first)
- `messages/en/somnia.json` — trace.errorNotFound, trace.linkLabel, trace.backToPanel added (en parity)
- `tests/e2e/agent-decision-detail.spec.ts` — full e2e suite (honesty greps, bounding-box, 404, en parity)
- `.planning/phases/07-agent-reasoning-position-surface/07-LIVE-VERIFICATION.md` — 11/11 ✓ PASS appended

## Decisions Made

- `LivenessPill` extracted to a `'use client'` island (`LivenessPillClient`): `snapshotSource(seed)` computed server-side and passed as `initialSource` prop; the island handles client-side rendering. This is the RSC boundary pattern for components that need client hooks but receive server data.
- `generateMetadata` carries the static `t('trace.title')` route-level title unconditionally — no null branch needed because the title does not depend on whether the decision id resolves (BLOCKER-4).
- `feed.consensusCaveat` reused structurally as `TraceStrings.consensusCaveat` — single source of operator copy, no es-CO/en drift between feed and trace namespaces (MAJOR-9 enforced).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] LivenessPill RSC boundary error — extracted 'use client' island**
- **Found during:** Task 1 (detail route assembly) / Task 2 (build verification)
- **Issue:** `LivenessPill` contained a client-side hook (`useEffect` or `useState`) that caused a build error when imported into the RSC `page.tsx`. The component was not designed with an explicit `'use client'` directive and the RSC tree rejected the hook.
- **Fix:** Created a thin `LivenessPillClient` wrapper with `'use client'`; `snapshotSource(seed)` is computed in the RSC body and passed as `initialSource`; the island handles client rendering. `page.tsx` imports `LivenessPillClient`, not `LivenessPill` directly.
- **Files modified:** `components/defi/somnia/LivenessPill.tsx` (or wrapper file), `app/(defi)/apps/abrigo/agent/[id]/page.tsx`
- **Verification:** `pnpm build` succeeded; Evidence Collector confirmed liveness pill renders "instantánea" (es-CO) and "snapshot" (en) on the live route.
- **Committed in:** `4d88393`

---

**Total deviations:** 1 auto-fixed (Rule 1 — Bug)
**Impact on plan:** Auto-fix was necessary for correctness (RSC import error blocks the build). No scope creep. The `LivenessPillClient` island pattern is now the established RSC boundary pattern for this component.

## Issues Encountered

None beyond the auto-fixed RSC boundary issue above.

## Live Verification

Evidence Collector ran against the local production build (`pnpm start` on port 3040 — production URL not yet propagated for this branch).

**Result: 11/11 ✓ PASS** — see `.planning/phases/07-agent-reasoning-position-surface/07-LIVE-VERIFICATION.md` for full verdict table and screenshot paths (`/tmp/d2p-verify/07-03-*.png`).

Key verified claims:
- pipeline-trace present with 6 stages; all 6 marker rings 12×12 px; all 6 titles fontSize 16px / weight 500 / height 24px (bounding-box equal weight)
- Built-prompt route-correct: `/4083729` → consensus 500; `/4083997` → consensus 900
- Stage 6 bridge fractions: 68% on `/4083729`; 6% on `/4083997`; no `$digit` anywhere in body
- Fork-verified pill computed color `lab(42 +0.93 +2.89)` — NOT green (a* = +0.93, not negative/emerald)
- Position panel every value em-dash; management 3 buttons disabled + aria-describedby wired
- Liveness pill: "instantánea · —" (es-CO), "snapshot · —" (en); no live state token
- Honesty greps: no executed/realized/ejecutad/realizad on any route
- Feed link → navigates to `/apps/abrigo/agent/4083729`
- Unknown id → HTTP 404 + not-found.tsx errorNotFound copy + back link rendered

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

Phase 07 is now structurally complete (plans 07-00 through 07-03 done). The orchestrator runs the phase verifier next to confirm all 4 plans are coherent and no cross-plan regression exists. If phase verification passes, the branch is ready for merge and the Phase 08 planning gate opens.

- Liveness polling (`SOMNIA_LIVE`) is reserved but not wired — deferred to Phase 7.x pending a continuous keeper cadence.
- The `LivenessPillClient` RSC island pattern is documented above for any future component needing client hooks in an RSC tree.

---
*Phase: 07-agent-reasoning-position-surface*
*Completed: 2026-06-06*

## Self-Check: PASSED

| Item | Status |
|------|--------|
| `app/(defi)/apps/abrigo/agent/[id]/page.tsx` | FOUND |
| `app/(defi)/apps/abrigo/agent/[id]/not-found.tsx` | FOUND |
| `components/defi/somnia/DecisionTraceLink.tsx` | FOUND |
| `tests/e2e/agent-decision-detail.spec.ts` | FOUND |
| commit cb78ccc | FOUND |
| commit 4d88393 | FOUND |
| commit 0cb4220 | FOUND |
