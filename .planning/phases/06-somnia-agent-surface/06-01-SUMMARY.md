---
phase: "06"
plan: "01"
subsystem: somnia-macro-panel
tags: [somnia, defi, rsc, i18n, tdd, provenance, cpi]
dependency_graph:
  requires:
    - lib/apps/abrigo/somnia/reader.ts
    - lib/apps/abrigo/somnia/types.ts
    - components/defi/ProvenanceBadge.tsx (testnet-agent tier)
  provides:
    - components/defi/somnia/MacroDataPanel.tsx
    - app/(defi)/apps/abrigo/agent/page.tsx
    - messages/es-CO/somnia.json
    - messages/en/somnia.json
    - tests/unit/somnia-macro-panel.test.tsx (GREEN)
    - tests/e2e/somnia-macro-panel.spec.ts
  affects:
    - i18n/request.ts (somniaMessages namespace registered)
    - tsconfig.json (somnia-macro-panel.test.tsx un-excluded)
    - docs/copy-review.md (somnia namespace row appended)
tech_stack:
  added: []
  patterns:
    - RSC presentational component with strings prop (MacroPanelStrings pattern — mirrors InstrumentDetail)
    - Intl.NumberFormat percent at the format edge only (scaledValue bigint → Number → /100 → percent)
    - B3 unconditional em-dash for print timestamp (no observedAt on MacroPrintView by design)
    - testnet-agent ProvenancePill with neutral token (never green/emerald/status-pass)
key_files:
  created:
    - components/defi/somnia/MacroDataPanel.tsx
    - app/(defi)/apps/abrigo/agent/page.tsx
    - messages/es-CO/somnia.json
    - messages/en/somnia.json
    - tests/e2e/somnia-macro-panel.spec.ts
  modified:
    - tests/unit/somnia-macro-panel.test.tsx (Wave-0 RED stub un-skipped + implemented)
    - tsconfig.json (somnia-macro-panel.test.tsx removed from exclude)
    - i18n/request.ts (somniaMessages import + mergeMessages arg)
    - docs/copy-review.md (Phase 06-01 somnia namespace review row)
decisions:
  - "MacroDataPanel receives locale + strings props from RSC page (presentational pattern) — keeps component free of getTranslations, mirrors InstrumentDetail"
  - "formatScaledPercent: Number(scaledValue) / 100 then Intl percent (which multiplies by 100 internally) — 568n → 0.0568 → 5.68%"
  - "B3: print timestamp cell is unconditional em-dash in JSX literal — no conditional, no fallback, enforced by unit test data-testid=print-timestamp"
  - "/apps/abrigo/agent placed under (defi) route group for IA consistency with /apps/abrigo/instruments per Plan 05-03 decision"
  - "Component A mount slot comment left in MacroDataPanel for 06-02 HedgeDecisionFeed"
  - "somniaMessages in i18n/request.ts formatted as single-line import (biome formatter requirement)"
metrics:
  duration_min: 20
  completed_date: "2026-06-02T19:58:00Z"
  tasks: 2
  files_created: 5
  files_modified: 4
---

# Phase 06 Plan 01: MacroDataPanel RSC Summary

**One-liner:** MacroDataPanel RSC rendering live Somnia-testnet CPI (co/inflation-rate, 5.68%) with testnet-agent neutral provenance pill, unconditional em-dash print timestamp (B3), and MacroReceived history, mounted at /apps/abrigo/agent with es-CO-first i18n.

---

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Un-skip RED stub + build MacroDataPanel RSC (CPI-only, em-dash nulls, testnet-agent pill) | 9cb2eec | MacroDataPanel.tsx + somnia-macro-panel.test.tsx + tsconfig.json |
| 2 | Mount /apps/abrigo/agent route + es-CO-first somnia i18n + register namespace + copy-review row + e2e render | 7219374 | agent/page.tsx + somnia.json x2 + i18n/request.ts + copy-review.md + e2e spec |

---

## Success Criteria Verification

- A visitor at /apps/abrigo/agent sees the latest Somnia-testnet CPI print (5.68%): PASS (unit 7/7 + e2e spec present)
- testnet-agent provenance pill with neutral token (not green): PASS (unit asserts className no green/emerald/status-pass)
- MacroReceived history rows render from reader: PASS (unit data-testid=history-scaled-value, count=2)
- B3 — print timestamp is em-dash unconditionally: PASS (unit data-testid=print-timestamp textContent="—")
- B3 — no "observ" substring in rendered output: PASS (unit container.innerHTML assert)
- Capacity-utilization absent everywhere: PASS (unit + grep -i capacity MacroDataPanel.tsx returns no code match)
- CPI-only — co/inflation-rate label renders: PASS (unit getAllByText('co/inflation-rate').length > 0)
- es-CO-first copy authored; no "consensus-verified": PASS (grep returns 0)
- somnia namespace registered in i18n/request.ts (M1 — import + mergeMessages): PASS (grep -c somniaMessages >= 2)
- messages nested under top-level "somnia" key: PASS (node -e check exits 0 for both locales)
- pnpm tsc --noEmit: PASS
- pnpm biome check: PASS
- docs/copy-review.md row: PASS

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Biome format violation in i18n/request.ts**
- **Found during:** Task 2 first commit attempt (pre-commit hook)
- **Issue:** somniaMessages import was written as two-line continuation (`.default as MessageMap` on next line). Biome formatter requires single-line form for this pattern given the existing surrounding style.
- **Fix:** Collapsed to single-line: `(await import(`...`)).default as MessageMap`
- **Files modified:** i18n/request.ts
- **Commit:** 7219374 (re-staged after fix)

**2. [Rule 3 - Blocking] Biome lint noNonNullAssertion in e2e spec**
- **Found during:** Task 2 first commit attempt (pre-commit hook)
- **Issue:** `ariaLabel!.toLowerCase()` uses non-null assertion operator (biome lint/style/noNonNullAssertion). The `getAttribute` return type is `string | null`; biome requires optional chaining.
- **Fix:** Replaced `ariaLabel!.toLowerCase()` with `ariaLabel?.toLowerCase()` (two occurrences in the es-CO test block; en locale block was already using `?.`).
- **Files modified:** tests/e2e/somnia-macro-panel.spec.ts
- **Commit:** 7219374

### Pre-existing State Note

Task 1 work (MacroDataPanel.tsx, test stub un-skip, tsconfig edit) was already committed as `9cb2eec` before this execution session began. Task 2 artifacts existed in the working tree as unstaged files. This execution session: verified Task 1 correctness, confirmed Task 2 acceptance criteria, fixed biome issues, and committed Task 2.

---

## Self-Check

Checking files:
- components/defi/somnia/MacroDataPanel.tsx: FOUND
- app/(defi)/apps/abrigo/agent/page.tsx: FOUND
- messages/es-CO/somnia.json: FOUND
- messages/en/somnia.json: FOUND
- tests/unit/somnia-macro-panel.test.tsx: FOUND (GREEN — 7/7)
- tests/e2e/somnia-macro-panel.spec.ts: FOUND
- i18n/request.ts (somniaMessages): FOUND (grep -c >= 2)
- docs/copy-review.md (Phase 06-01 row): FOUND

Checking commits:
- 9cb2eec (Task 1 — MacroDataPanel + test GREEN + tsconfig): FOUND
- 7219374 (Task 2 — agent route + i18n + e2e + copy-review): FOUND

Test results:
- somnia-macro-panel unit: 7/7 PASS
- pnpm tsc --noEmit: PASS
- pnpm biome check: PASS

## Self-Check: PASSED
