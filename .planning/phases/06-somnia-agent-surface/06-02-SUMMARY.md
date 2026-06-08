---
phase: "06"
plan: "02"
subsystem: somnia-agent-surface
tags: [somnia, defi, rsc, i18n, tdd, equal-weight, anti-fishing, cross-09, bigint, surprise]
dependency_graph:
  requires:
    - lib/apps/abrigo/somnia/reader.ts (getHedgeDecisions)
    - lib/apps/abrigo/somnia/surprise.ts (computeSurprise / formatSurprise)
    - lib/apps/abrigo/somnia/types.ts (HedgeDecisionView / HedgeActionLabel)
    - components/defi/ProvenanceBadge.tsx (testnet-agent tier)
    - app/(defi)/apps/abrigo/agent/page.tsx (Component-A mount slot from 06-01)
    - messages/{es-CO,en}/somnia.json (somnia namespace from 06-01)
  provides:
    - components/defi/somnia/HedgeDecisionCard.tsx
    - components/defi/somnia/HedgeDecisionFeed.tsx
    - tests/unit/somnia-decision-feed.test.tsx (GREEN — 11/11)
    - tests/e2e/somnia-decision-feed.spec.ts
    - messages/{es-CO,en}/somnia.json (somnia.feed.* keys)
  affects:
    - app/(defi)/apps/abrigo/agent/page.tsx (mounts HedgeDecisionFeed)
    - 06-04 (surprise bridge depends on HedgeDecisionCard shape)
tech_stack:
  added: []
  patterns:
    - Equal-weight card shell via shared CARD_CLASS const (CROSS-09 structural enforcement)
    - DecisionCardStrings prop pattern mirrors MacroPanelStrings (RSC presentational with threaded strings)
    - computeSurprise in BigInt space; formatSurprise at the render edge only (no Number coercion)
    - Operator-supplied consensus caveat inline with the consensus row (M4 gating: surprise within same card subtree)
    - ACTION_ICON char map (text-only single char) keeps badge weight structurally equal for all 4 actions
key_files:
  created:
    - components/defi/somnia/HedgeDecisionCard.tsx
    - components/defi/somnia/HedgeDecisionFeed.tsx
    - tests/e2e/somnia-decision-feed.spec.ts
  modified:
    - tests/unit/somnia-decision-feed.test.tsx (Wave-0 RED stub un-skipped + implemented — 11/11 GREEN)
    - tsconfig.json (somnia-decision-feed.test.tsx removed from exclude; somnia-bridge stays for 06-04)
    - app/(defi)/apps/abrigo/agent/page.tsx (HedgeDecisionFeed mounted below MacroDataPanel)
    - messages/es-CO/somnia.json (somnia.feed.* keys appended — es-CO first)
    - messages/en/somnia.json (somnia.feed.* keys mirrored — en)
    - docs/copy-review.md (Phase 06-02 somnia.feed review row appended)
key-decisions:
  - "CARD_CLASS const is single source of truth for equal visual weight — no conditional className per action (CROSS-09)"
  - "ACTION_ICON uses text characters (≡/↑/↓/✕) not Lucide icons to make structural equal-weight trivial"
  - "DecisionCardStrings extends to feedHeading/feedEmptyState in the feed prop (not a separate type)"
  - "surpriseValue computed in BigInt at render edge; never Number-coerced before subtraction (M5 / BigInt discipline)"
  - "pending===true renders pendingLabel badge + emptyState ('—') for all data fields — never 0"
  - "HedgeDecisionFeed passes feedStrings from RSC page (no getTranslations inside component — mirrors MacroDataPanel)"
requirements-completed: [SOMNIA-A, CROSS-09, CROSS-10, CROSS-01]
duration: 8min
completed: "2026-06-02"
---

# Phase 06 Plan 02: Hedge Decision Feed Summary

**HedgeDecisionFeed RSC rendering 2 equal-weight HedgeDecisionMade cards (macro→operator-consensus+caveat→BigInt surprise→action+sizeBps) with testnet-agent provenance pills, M4 honesty enforcement, and CROSS-09 anti-fishing structural invariant.**

---

## Performance

- **Duration:** 8 min
- **Started:** 2026-06-02T20:02:41Z
- **Completed:** 2026-06-02T20:11:24Z
- **Tasks:** 2
- **Files modified:** 8

---

## Accomplishments

- HedgeDecisionCard RSC: macro print → operator-consensus (with caveat inline) → BigInt surprise (formatted at edge) → action badge + sizeBps; pending===true renders pendingLabel + em-dash, never 0
- Equal visual weight enforced structurally: CARD_CLASS is a single shared const; ActionBadge className is identical for all 4 actions (HOLD/ADD_LONG_GAMMA/REDUCE/EXIT) — no conditional emphasis (CROSS-09)
- HedgeDecisionFeed RSC: calls getHedgeDecisions(), maps to equal-weight HedgeDecisionCard list; honest empty-state copy
- Unit test 11/11 GREEN: M5 snapshot tuples verified (ADD_LONG_GAMMA/6800/+68, REDUCE/568/-332), equal className asserted, pending em-dash tested
- Feed mounted on /apps/abrigo/agent below MacroDataPanel; somnia.feed.* keys added es-CO-first in both locales; e2e spec with getBoundingClientRect + computed font equal-weight assertions

---

## Task Commits

Each task was committed atomically:

1. **Task 1: add hedge decision card and feed (TDD — un-skip RED → GREEN)** - `0e48ca4` (feat)
2. **Task 2: mount feed on agent page + es-CO copy + equal-weight e2e** - `c087361` (feat)

---

## Files Created/Modified

- `components/defi/somnia/HedgeDecisionCard.tsx` — RSC per-decision card with CARD_CLASS equal-weight enforcement, operator caveat, BigInt surprise, pending em-dash path
- `components/defi/somnia/HedgeDecisionFeed.tsx` — RSC feed mapping getHedgeDecisions() to equal-weight cards
- `tests/unit/somnia-decision-feed.test.tsx` — Wave-0 RED stub un-skipped; 11 tests covering M5 tuples, equal className, operator caveat, surprise gating, pending em-dash
- `tsconfig.json` — removed somnia-decision-feed.test.tsx from exclude (somnia-bridge stays for 06-04)
- `app/(defi)/apps/abrigo/agent/page.tsx` — HedgeDecisionFeed mounted below MacroDataPanel with feedStrings from getTranslations
- `messages/es-CO/somnia.json` — somnia.feed.* keys (4 action labels, caveat, surprise, pending, provenance)
- `messages/en/somnia.json` — en mirror of all somnia.feed.* keys
- `tests/e2e/somnia-decision-feed.spec.ts` — e2e: both decision cards, M5 surprises, operator caveat, equal bounding-box width + font assertions
- `docs/copy-review.md` — Phase 06-02 somnia.feed review row appended

---

## Decisions Made

- **CARD_CLASS const as single source of truth (CROSS-09):** Moved the card root className to a module-level `const CARD_CLASS = '...'` so both the ADD_LONG_GAMMA and REDUCE cards structurally share the identical string. The unit test asserts `cardAdd?.className === cardRed?.className` — a structural test that tsc cannot lie about.
- **ACTION_ICON text chars over Lucide icons:** Using text characters (≡/↑/↓/✕) inside the action badge rather than separate Lucide icon components. Keeps badge DOM structure identical across all 4 actions and avoids any risk of icon-size variance.
- **surpriseValue computed in BigInt at render edge:** `computeSurprise(decision.macroValue, decision.consensus)` is called inside the render function body with pure BigInt inputs; `formatSurprise` converts to string only for display. No `Number()` coercion before the subtraction (M5 BigInt discipline).
- **Pending path renders emptyState for all data fields:** When `pending===true`, macro/consensus/surprise/sizeBps all render `strings.emptyState` ('—'). The action field renders the `pendingLabel` badge. This is the correct anti-fishing pending behavior — never render 0.

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Unit test `/568/` regex matched both macroValue and sizeBps on REDUCE card**
- **Found during:** Task 1 (TDD GREEN run — 10/11 passed)
- **Issue:** REDUCE decision has macroValue=568 AND sizeBps=568. `screen.getByText(/568/)` matched multiple elements and threw "multiple elements found" error.
- **Fix:** Changed to `screen.getAllByText(/^568$/)` to get all exact matches and assert `length >= 1`; the uniqueness assertion was replaced by a count assertion. The important assertion (surprise=-3.32) remained unchanged.
- **Files modified:** tests/unit/somnia-decision-feed.test.tsx
- **Committed in:** 0e48ca4 (Task 1 commit)

**2. [Rule 3 - Blocking] biome import-ordering required on agent page.tsx**
- **Found during:** Task 2 biome check (pre-stage)
- **Issue:** `import type { MacroPanelStrings }` was written on the same `import { MacroDataPanel }` line; biome formatted this as separate type import that needed to precede the value import.
- **Fix:** `pnpm biome check --fix` applied automatically (collapsed imports; reordered type imports first).
- **Files modified:** app/(defi)/apps/abrigo/agent/page.tsx
- **Committed in:** c087361 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 Rule 1 test assertion fix, 1 Rule 3 biome format)
**Impact on plan:** Both auto-fixes necessary for correctness. No scope creep.

---

## Known Untested Branch (Accepted — per plan acceptance criteria)

The `DecisionFailed` / `actionSet==false` render path is NOT exercised by the snapshot. No failed transaction exists in the two recorded decisions. Recorded in this SUMMARY per plan acceptance criteria. Do NOT fabricate a failed decision to test it.

---

## Issues Encountered

None — pre-commit hooks passed on both task commits without retry.

---

## User Setup Required

None — no external service configuration required.

---

## Next Phase Readiness

- HedgeDecisionFeed + HedgeDecisionCard available for 06-04 (surprise→decision→instrument bridge)
- /apps/abrigo/agent renders Components D + A — ready for Evidence Collector live verification
- somnia.feed.* keys in both locales — ready for e2e locale-switching tests
- somnia-bridge.test.tsx still excluded from tsconfig (06-04 owns that stub)

---

---

## Self-Check: PASSED

**Files verified:**
- components/defi/somnia/HedgeDecisionCard.tsx: FOUND
- components/defi/somnia/HedgeDecisionFeed.tsx: FOUND
- tests/e2e/somnia-decision-feed.spec.ts: FOUND
- .planning/phases/06-somnia-agent-surface/06-02-SUMMARY.md: FOUND

**Commits verified:**
- 0e48ca4 (Task 1 — HedgeDecisionCard + HedgeDecisionFeed + RED→GREEN): FOUND
- c087361 (Task 2 — agent page mount + es-CO copy + e2e): FOUND
- 1390a98 (docs — SUMMARY.md + STATE.md): FOUND

**Test results:**
- somnia-decision-feed unit: 11/11 PASS
- pnpm tsc --noEmit: PASS
- pnpm biome check components/defi/somnia/: PASS
- next build emits /apps/abrigo/agent: PASS

*Phase: 06-somnia-agent-surface*
*Completed: 2026-06-02*
