---
phase: "06"
plan: "04"
subsystem: somnia-agent-surface
tags: [somnia, defi, rsc, i18n, tdd, bigint, bridge, anti-fishing, cross-09, m6, schematic]
dependency_graph:
  requires:
    - lib/apps/abrigo/somnia/reader.ts (getHedgeDecisions — Wave-0 reader seam)
    - lib/apps/abrigo/somnia/surprise.ts (computeSurprise / formatSurprise)
    - lib/apps/abrigo/somnia/types.ts (HedgeDecisionView / HedgeActionLabel)
    - components/defi/ProvenanceBadge.tsx (testnet-agent tier)
    - app/(defi)/apps/abrigo/instruments/[id]/[chain]/page.tsx (kind==='simulated' branch mount slot)
    - messages/{es-CO,en}/somnia.json (somnia namespace from 06-01/06-02)
    - components/defi/somnia/HedgeDecisionCard.tsx (equal-weight card shell idiom)
  provides:
    - lib/apps/abrigo/somnia/bridge.ts (decisionToPositionDelta + formatFractionOfMax)
    - components/defi/somnia/HedgeDecisionBridge.tsx
    - tests/unit/somnia-bridge.test.tsx (GREEN — 20/20)
    - tests/e2e/somnia-bridge.spec.ts
    - messages/{es-CO,en}/somnia.json (somnia.bridge.* keys)
  affects:
    - app/(defi)/apps/abrigo/instruments/[id]/[chain]/page.tsx (bridge mounted)
    - tsconfig.json (somnia-bridge.test.tsx removed from exclude)
    - docs/copy-review.md (Phase 06-04 row appended)
tech_stack:
  added: []
  patterns:
    - Pure BigInt mapping: sizeBps * 10000n / MAX_SIZE_BPS (no Number() before division)
    - BridgeStrings prop pattern mirrors DecisionCardStrings (RSC presentational with threaded strings)
    - schematic:true literal flag on PositionDeltaView enforces M6 illustrative label at compile time
    - getHedgeDecisions().find(d => d.action === 'ADD_LONG_GAMMA') — honest empty state when absent
    - Equal CARD_CLASS const (CROSS-09) shared with HedgeDecisionCard
key_files:
  created:
    - lib/apps/abrigo/somnia/bridge.ts
    - components/defi/somnia/HedgeDecisionBridge.tsx
    - tests/e2e/somnia-bridge.spec.ts
  modified:
    - tests/unit/somnia-bridge.test.tsx (Wave-0 RED stub un-skipped + implemented — 20/20 GREEN)
    - tsconfig.json (somnia-bridge.test.tsx removed from exclude; all somnia stubs now un-excluded)
    - app/(defi)/apps/abrigo/instruments/[id]/[chain]/page.tsx (bridge mounted in simulated branch)
    - messages/es-CO/somnia.json (somnia.bridge.* keys appended — es-CO first)
    - messages/en/somnia.json (somnia.bridge.* keys mirrored — en)
    - docs/copy-review.md (Phase 06-04 somnia.bridge review row appended)
decisions:
  - "decisionToPositionDelta fractionOfMaxBps = sizeBps * 10000n / MAX_SIZE_BPS (BigInt — no Number() before division)"
  - "schematic:true literal on PositionDeltaView is a compile-time M6 enforcement: components must branch on it to show the illustrative label"
  - "HedgeDecisionBridge finds ADD_LONG_GAMMA via array.find() — honest empty state when none exists (never fabricate)"
  - "Bridge mounts AFTER PayoffDiagram (narrative: payoff → 'and here is how a recorded agent decision moves a position on it')"
  - "CARD_CLASS const identical to HedgeDecisionCard — CROSS-09 structural equal-weight enforcement"
  - "illustrativeMarker key is 'ilustrativo — posición simulada' (two-part: M6 honesty + instrument context)"
metrics:
  duration_min: 10
  completed_date: "2026-06-02T20:36:50Z"
  tasks: 2
  files_created: 3
  files_modified: 6
---

# Phase 06 Plan 04: HedgeDecisionBridge (Component B) Summary

**HedgeDecisionBridge RSC closing the surprise→decision→instrument loop: operator-supplied surprise (+0.68) → ADD_LONG_GAMMA @ sizeBps 6800 → illustrative 68% fraction-of-max on the simulated cCOP/USD long-gamma position; BigInt-exact, testnet-agent neutral pill, M6-honest "ilustrativo" label, DEFI-08-safe (only in simulated branch).**

---

## Performance

- **Duration:** 10 min
- **Started:** 2026-06-02T20:26:39Z
- **Completed:** 2026-06-02T20:36:50Z
- **Tasks:** 2
- **Files modified:** 9 (3 created + 6 modified)

---

## Accomplishments

- `lib/apps/abrigo/somnia/bridge.ts`: pure BigInt mapping `decisionToPositionDelta` (ADD_LONG_GAMMA→increase, REDUCE/EXIT→decrease, HOLD→flat; `fractionOfMaxBps = sizeBps * 10000n / MAX_SIZE_BPS`); `formatFractionOfMax` edge formatter (6800n→"68%"); `schematic:true` literal flag; M6 honesty note documenting that this is illustrative, not a realized position
- `components/defi/somnia/HedgeDecisionBridge.tsx`: RSC card rendering surprise→action@sizeBps→schematic delta; operator-supplied consensus caveat inline (M4); gated surprise in same card subtree; testnet-agent neutral ProvenancePill (CROSS-09); em-dash for nulls; honest empty state when no ADD_LONG_GAMMA; no fabricated notional or current price
- Unit test 20/20 GREEN: BigInt exactness (above Number.MAX_SAFE_INTEGER), direction mappings, edge formatter, rendering assertions, operator-caveat gating, testnet-agent pill neutral token, honest empty state
- Bridge mounted in `kind==='simulated'` branch ONLY (line 269, before aggregateAllChains at 317); `getTranslations('somnia')` added; `BridgeStrings` object built from `tSomnia('bridge.*')`
- `somnia.bridge.*` keys added es-CO FIRST in both locales; `illustrativeMarker: "ilustrativo — posición simulada"` (en: "illustrative — simulated position") satisfies M6 visible marker requirement
- `docs/copy-review.md` Phase 06-04 row appended with sign-off checklist
- `tests/e2e/somnia-bridge.spec.ts`: 13 e2e tests across es-CO + en asserting bridge heading, ADD_LONG_GAMMA, sizeBps 6800, surprise +0.68, operator caveat, "ilustrativo" marker, 68% delta, testnet-agent pill (neutral class + aria), SIMULADO badge co-existence, no fabricated notional

---

## Task Commits

Each task was committed atomically:

1. **Task 1: bridge.ts + HedgeDecisionBridge RSC + RED stub GREEN** - `2e2efd5` (feat)
2. **Task 2: mount on simulated page + es-CO copy + e2e** - `671224c` (feat)

---

## Files Created/Modified

- `lib/apps/abrigo/somnia/bridge.ts` — pure BigInt mapping + edge formatter; M6 honesty note; MAX_SIZE_BPS = 10000n
- `components/defi/somnia/HedgeDecisionBridge.tsx` — RSC bridge card; BridgeStrings prop; CARD_CLASS shared const; honest empty state
- `tests/unit/somnia-bridge.test.tsx` — Wave-0 RED stub un-skipped; 20 tests covering BigInt exactness, direction mapping, rendering, gating, neutral pill, honest empty
- `tsconfig.json` — somnia-bridge.test.tsx removed from exclude (all 4 somnia stubs now un-excluded across 06-01..06-04)
- `app/(defi)/apps/abrigo/instruments/[id]/[chain]/page.tsx` — HedgeDecisionBridge + getTranslations('somnia') + bridgeStrings in simulated branch only
- `messages/es-CO/somnia.json` — somnia.bridge.* keys (14 keys, es-CO first)
- `messages/en/somnia.json` — somnia.bridge.* keys (en mirror)
- `docs/copy-review.md` — Phase 06-04 somnia.bridge review row appended
- `tests/e2e/somnia-bridge.spec.ts` — 13 e2e tests on /apps/abrigo/instruments/ccop-usd-long-gamma/8453

---

## Decisions Made

- **BigInt-only mapping (M5/M6):** `fractionOfMaxBps = sizeBps * 10000n / MAX_SIZE_BPS` stays in BigInt space; `Number()` coercion only inside `formatFractionOfMax` where `fractionOfMaxBps ≤ 10000n < Number.MAX_SAFE_INTEGER`.
- **schematic:true literal flag:** `PositionDeltaView.schematic` is typed as `true` (not `boolean`) so components must branch on it — compile-time proof the M6 label check can't be skipped.
- **Equal CARD_CLASS (CROSS-09):** Same string as HedgeDecisionCard — bridge card cannot be louder than the surrounding sections. Structural test in unit suite asserts className equality.
- **"ilustrativo — posición simulada" two-part marker:** "ilustrativo" satisfies M6 ("illustrative" marker must be visible); "posición simulada" gives the instrument context; parenthetical `(…)` in UI is the pattern used throughout the instrument detail page.
- **Bridge position in page (after PayoffDiagram):** The narrative reads: payoff → "and here is how a recorded agent decision maps onto a position on it" — the bridge extends the story, not interrupts it.

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] getByText(/ilustrativo/i) matched multiple DOM nodes**
- **Found during:** Task 1 TDD GREEN run (1/20 failing)
- **Issue:** The bridge renders "ilustrativo" in two places: the `deltaLabel` text and the `illustrativeMarker` span. `screen.getByText(/ilustrativo/i)` (strict match) threw "multiple elements found".
- **Fix:** Changed to `screen.getAllByText(/ilustrativo/i).length >= 1` — count assertion, not uniqueness assertion. The important assertion (M6 marker present) is preserved; the strict-match assumption was incorrect.
- **Files modified:** tests/unit/somnia-bridge.test.tsx
- **Committed in:** 2e2efd5 (Task 1)

**2. [Rule 3 - Blocking] biome formatting — 3 issues across 2 files before Task 1 commit**
- **Found during:** Task 1 pre-commit hook (biome exit 1)
- **Issue:** tsconfig.json exclude array inline formatting; test file import order (HedgeDecisionBridge before bridge); long `expect(screen.getByText(...)).toBeTruthy()` call spanning two lines.
- **Fix:** `pnpm biome check --fix` applied automatically. Tests re-ran and still 20/20.
- **Files modified:** tsconfig.json, tests/unit/somnia-bridge.test.tsx
- **Committed in:** 2e2efd5 (Task 1 — after biome fix)

**3. [Rule 3 - Blocking] biome formatting — 2 issues in page.tsx before Task 2 commit**
- **Found during:** Task 2 pre-commit hook (biome exit 1)
- **Issue:** Import order (BridgeStrings type import before HedgeDecisionBridge value import); JSX attribute formatting on `<HedgeDecisionBridge>`.
- **Fix:** `pnpm biome check --fix` applied automatically. tsc still clean.
- **Files modified:** app/(defi)/apps/abrigo/instruments/[id]/[chain]/page.tsx
- **Committed in:** 671224c (Task 2)

---

## Known Untested Branch (Accepted — per plan acceptance criteria)

The `DecisionFailed` / `actionSet==false` render path is NOT exercised by the snapshot. No failed transaction exists in the two recorded decisions. The bridge only selects the ADD_LONG_GAMMA decision by `action` field — no failed-tx variant to test. Recorded here per plan acceptance criteria. Do NOT fabricate a failed decision.

---

## M6 Honesty Invariants (Status)

| Invariant | Status |
|-----------|--------|
| fractionOfMaxBps is honest-real arithmetic on real on-chain sizeBps | PASS — BigInt division, no fabrication |
| delta labeled "illustrative"/"ilustrativo" (visible, not aria-only) | PASS — illustrativeMarker key rendered in UI |
| NO "executed"/"realized"/"ejecutada"/"realizada" | PASS — grep returns 0 in component + messages |
| NO fabricated dollar notional or current price | PASS — only macroValue, consensus, surprise, sizeBps, fraction-of-max |
| NO "consensus-verified" | PASS — grep returns 0 in component + messages |
| Honest empty state when no ADD_LONG_GAMMA | PASS — unit test + "No se registró decisión de gamma larga" copy |

---

## Live Verification

Per CLAUDE.md: the Evidence Collector agent should run against `/apps/abrigo/instruments/ccop-usd-long-gamma/8453` after this plan's commits, asserting:
- Bridge card visible with heading "De la sorpresa macro a la posición"
- Surprise +0.68 → ADD_LONG_GAMMA @ sizeBps 6800 → schematic "68%" delta visible
- Illustrative marker "ilustrativo — posición simulada" visible
- testnet-agent pill present (neutral className, aria-label containing "somnia"/"testnet"/"poc")
- SIMULADO badge still visible (co-existence)
- No dollar notional, no current price in bridge section

---

## Self-Check

**Checking files:**
- lib/apps/abrigo/somnia/bridge.ts: FOUND
- components/defi/somnia/HedgeDecisionBridge.tsx: FOUND
- tests/unit/somnia-bridge.test.tsx: FOUND
- tests/e2e/somnia-bridge.spec.ts: FOUND
- messages/es-CO/somnia.json (bridge keys): FOUND
- messages/en/somnia.json (bridge keys): FOUND

**Checking commits:**
- 2e2efd5 (Task 1 — bridge.ts + HedgeDecisionBridge + RED stub GREEN): FOUND
- 671224c (Task 2 — page mount + es-CO copy + e2e): FOUND

**Test results:**
- somnia-bridge unit: 20/20 PASS
- pnpm tsc --noEmit: PASS
- pnpm biome check components/defi/somnia/ lib/apps/abrigo/somnia/bridge.ts app/(defi)/apps/abrigo/instruments/: PASS

## Self-Check: PASSED
