---
phase: 07-agent-reasoning-position-surface
plan: "02"
subsystem: position-execution-ui
tags: [somnia, position-panel, management-controls, liveness-pill, tdd, cross-09, a11y, i18n]

requires:
  - phase: 07-agent-reasoning-position-surface
    plan: "00"
    provides: WrapperPositionView + getWrapperPosition + LivenessSource + snapshotSource + pollingSource + fork-verified tier
  - phase: 07-agent-reasoning-position-surface
    plan: "01"
    provides: somnia.trace.* copy already landed in somnia.json (wave serialization)

provides:
  - PositionPanel RSC not-deployed empty state under neutral fork-verified tier
  - ManagementControls RSC 3 visible-but-disabled buttons with MAJOR-12 a11y wiring
  - LivenessPill 'use client' island (snapshot/polling only, MAJOR-8 hydration-stable)
  - somnia.position.* + somnia.manage.* + somnia.liveness.* in both locales
  - docs/copy-review.md Phase 07-02 row

affects:
  - 07-03-management (mounts PositionPanel + ManagementControls + LivenessPill on /apps/abrigo/agent/[id])

tech-stack:
  added: []
  patterns:
    - "PositionPanel RSC: pre-translated strings prop pattern (MacroDataPanel idiom); no data reads in Phase 7"
    - "ManagementControls RSC: stable CAPTION_ID const; buttons.map() over array for exactly-3 enforcement"
    - "LivenessPill client island: useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot) — third arg is the stable seed for MAJOR-8 hydration parity"
    - "Comment hygiene: stale-baseline identifiers use hyphenated forms in comments (MINOR-14) to avoid false grep hits"

key-files:
  created:
    - components/defi/somnia/PositionPanel.tsx
    - components/defi/somnia/ManagementControls.tsx
    - components/defi/somnia/LivenessPill.tsx
    - tests/unit/position-panel.test.tsx
    - tests/unit/management-controls.test.tsx
    - tests/unit/liveness-pill.test.tsx
  modified:
    - messages/es-CO/somnia.json
    - messages/en/somnia.json
    - docs/copy-review.md

key-decisions:
  - "Components committed atomically (RED + components in same commit) because tsc pre-commit gate required component files to exist when test files imported them — standard wave-0/tdd pattern"
  - "PositionPanel and ManagementControls comments use hyphenated identifiers (stale-baseline, realized-costs, last-surviving-*) per MINOR-14 to avoid false-positive source greps"
  - "LivenessPill source.liveness used directly (not snapshot value) to determine render branch — avoids reading the snapshot value in the branch condition, keeps live branch structurally absent"
  - "ManagementControls uses buttons.map() over a fixed 3-element array — EXACTLY 3 buttons guaranteed by the array length, not by counting"

requirements-completed: [MOD3-POS, MOD3-MANAGE, MOD3-LIVE, CROSS-09, CROSS-01, CROSS-10]

duration: 9min
completed: "2026-06-02"
---

# Phase 7 Plan 02: PositionPanel + ManagementControls + LivenessPill Summary

**Honest position-execution surface: not-deployed empty state panel under the neutral
fork-verified tier, exactly-3 perceivably-disabled management controls with MAJOR-12 a11y
wiring, and a hydration-stable liveness pill (snapshot/polling only, no live branch)**

## Performance

- **Duration:** 9 min
- **Started:** 2026-06-02T23:32:32Z
- **Completed:** 2026-06-02T23:41:00Z
- **Tasks:** 2 (TDD: red stubs → green implementations)
- **Files:** 6 created, 3 modified

## Accomplishments

- `PositionPanel` renders the not-deployed empty state under the neutral `fork-verified` tier:
  card shell matching `HedgeDecisionCard`, `ProvenancePill tier="fork-verified"`, 4 dl rows
  with em-dash for every value, empty-state heading + body — no dollar, no stale-baseline
  identifiers, no non-muted color token, no collapse disclosure
- `ManagementControls` renders EXACTLY 3 `<button disabled>` elements (close/claim/agent),
  each with `aria-disabled="true"` + its own `aria-describedby` pointing at the single
  stable caption id + a `Lock` icon (MAJOR-12 mechanical enforcement via `buttons.map()`);
  perceivably disabled beyond color (Lock icon + persistent inline caption)
- `LivenessPill` consumes `LivenessSource<T>` via `useSyncExternalStore(subscribe, getSnapshot,
  getServerSnapshot)` — third arg is the stable seed for MAJOR-8 first-paint parity; renders
  `snapshot` (CircleDashed) and `polling` (RefreshCw) only; no live branch exists in Phase 7
- `somnia.position.*` + `somnia.manage.*` + `somnia.liveness.*` keys in both locales with
  recursive parity verified by node script; es-CO authored first (no machine translation)
- `docs/copy-review.md` Phase 07-02 row appended; native sign-off pending

## Task Commits

1. **Task 1+2 RED stubs (combined with components due to tsc gate):** `84e6dc6` (test)
2. **Task 2 GREEN: liveness pill + i18n copy + copy-review:** `a80f80a` (feat)

## Files Created/Modified

- `components/defi/somnia/PositionPanel.tsx` — RSC not-deployed empty state panel
- `components/defi/somnia/ManagementControls.tsx` — RSC 3 disabled buttons, MAJOR-12 wired
- `components/defi/somnia/LivenessPill.tsx` — 'use client' island, snapshot/polling, MAJOR-8
- `tests/unit/position-panel.test.tsx` — 11 assertions (existing stub enhanced)
- `tests/unit/management-controls.test.tsx` — 10 assertions (NEW)
- `tests/unit/liveness-pill.test.tsx` — 9 assertions (NEW)
- `messages/es-CO/somnia.json` — position.* + manage.* + liveness.* keys added
- `messages/en/somnia.json` — position.* + manage.* + liveness.* keys added (parity)
- `docs/copy-review.md` — Phase 07-02 review row appended

## Decisions Made

- Components committed atomically with tests because the tsc pre-commit gate required the
  component files to exist when the test files imported them. This is the same wave-0 TDD
  pattern established in Plan 05.1-00 and used throughout Phase 7.
- `PositionPanel` comment hygiene: stale-baseline identifiers use hyphenated forms
  (last-surviving-*, realized-costs) per MINOR-14 to avoid false-positive source greps while
  still documenting the excluded fields.
- `LivenessPill` uses `source.liveness` as the render-branch discriminant — this reads the
  source's liveness tier (a plain string property, not the snapshot value) so the live branch
  is structurally absent (not just runtime-unreachable).

## Honesty Invariants Verified

| Invariant | Verification method | Status |
|-----------|---------------------|--------|
| PositionPanel: no dollar in rendered DOM | unit test textContent (MAJOR-13) | PASS |
| PositionPanel: no stale-baseline identifiers in source | grep -E (no match) | PASS |
| PositionPanel: no non-muted color token | grep -E + innerHTML unit test | PASS |
| ManagementControls: exactly 3 buttons | unit test getAllByRole length === 3 | PASS |
| ManagementControls: each with disabled + aria-disabled + aria-describedby | per-button DOM assertions | PASS |
| ManagementControls: Lock icon per button | unit test querySelector('svg') | PASS |
| ManagementControls: no executed/realized/placed in DOM | unit test textContent regex | PASS |
| LivenessPill: no live render branch | source grep -qE + DOM test | PASS |
| LivenessPill: first paint == server text | unit test (MAJOR-8) | PASS |
| LivenessPill: neutral CROSS-09 shell | innerHTML assertion | PASS |
| No collapse disclosure in any component | source grep -q + querySelector('details') | PASS |

## Note: Live Verification Deferred to 07-03

Per CLAUDE.md, the Evidence Collector live-verification agent runs in 07-03 against the
rendered `/apps/abrigo/agent/[id]` route where these components are mounted. This plan
verifies components by unit test + tsc + biome only:
- 31/31 unit tests GREEN
- tsc --noEmit exit 0
- biome check exit 0

The components render without runtime error (confirmed via unit tests with jsdom); no live
route exists yet (07-03 wires the page). Live-verify is deferred to 07-03 as planned.

## Deviations from Plan

None — plan executed exactly as written. All modules and test structures matched the plan's
specifications. Biome auto-format required JSX attribute collapsing (multi-line → single-line
for short elements) and comment rewording for MINOR-14 identifier hygiene. No architectural
changes.

---
*Phase: 07-agent-reasoning-position-surface*
*Completed: 2026-06-02*

## Self-Check: PASSED

Files verified:
- components/defi/somnia/PositionPanel.tsx: FOUND
- components/defi/somnia/ManagementControls.tsx: FOUND
- components/defi/somnia/LivenessPill.tsx: FOUND
- tests/unit/position-panel.test.tsx: FOUND
- tests/unit/management-controls.test.tsx: FOUND
- tests/unit/liveness-pill.test.tsx: FOUND

Commits verified:
- 84e6dc6: test(07-02) — FOUND
- a80f80a: feat(07-02) — FOUND

Test results: 31/31 plan tests GREEN
tsc --noEmit: EXIT 0
biome check: EXIT 0 (clean)
