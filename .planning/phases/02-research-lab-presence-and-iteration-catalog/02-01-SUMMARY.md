---
phase: 02-research-lab-presence-and-iteration-catalog
plan: 01
subsystem: ui
tags: [tailwind, velite, i18n, next-font, nuqs, vitest, playwright, css-tokens]

requires:
  - phase: 01-foundation-and-scaffold
    provides: "globals.css @theme inline pattern, velite iterations schema, i18n deep-merge, biome + tsc + lefthook pipeline"

provides:
  - "Muted-ochre (hue 70-80) token set in :root and .dark — hue 165 fully removed"
  - "--spacing-5xl: 120px in @theme inline"
  - "--color-accent-subtle alias in @theme inline"
  - "IBM Plex Sans + IBM Plex Mono via next/font/google with font variable injection"
  - "velite.config.ts: research collection + exported researchSchema"
  - "nuqs@2.8.9 installed"
  - "i18n/request.ts deep-merges 7 namespaces per locale"
  - "8 namespace stub files (iterations, research, team, about × es-CO + en)"
  - "16 Wave 0 test stubs covering LAB-01..06 and ITER-01..09"

affects:
  - "02-02 through 02-08 — all downstream plans depend on these tokens, fonts, and namespaces"

tech-stack:
  added:
    - "nuqs@2.8.9 (URL state management for iteration catalog filter)"
    - "IBM_Plex_Sans + IBM_Plex_Mono from next/font/google"
  patterns:
    - "Biome normalizes trailing zeros in OKLCH values (0.10 → 0.1); test regexes must handle both"
    - "Token test reads globals.css + layout.tsx as plain text via readFileSync; no DOM required"
    - "researchSchema exported from velite.config.ts for unit test isolation (same pattern as iterationSchema)"
    - "i18n namespace files use nested JSON objects, not flat dot-notation keys"
    - "Wave 0 stubs: test.fixme (Playwright) and it.todo (Vitest); no real assertions until feature plans"

key-files:
  created:
    - "messages/es-CO/iterations.json"
    - "messages/es-CO/research.json"
    - "messages/es-CO/team.json"
    - "messages/es-CO/about.json"
    - "messages/en/iterations.json"
    - "messages/en/research.json"
    - "messages/en/team.json"
    - "messages/en/about.json"
    - "tests/unit/velite-research-schema.test.ts"
    - "tests/unit/i18n-coverage.test.ts"
    - "tests/unit/homepage-counts.test.ts"
    - "tests/e2e/homepage-content.spec.ts"
    - "tests/e2e/team-page.spec.ts"
    - "tests/e2e/research-page.spec.ts"
    - "tests/e2e/about-page.spec.ts"
    - "tests/e2e/locale-coverage.spec.ts"
    - "tests/e2e/iteration-catalog.spec.ts"
    - "tests/e2e/iteration-detail.spec.ts"
    - "tests/e2e/iteration-evidence.spec.ts"
    - "tests/e2e/iteration-pair-d.spec.ts"
    - "tests/e2e/iteration-fx-vol-fail.spec.ts"
    - "tests/e2e/iteration-jsonld.spec.ts"
    - "tests/visual/iteration-catalog-equal-weight.spec.ts"
    - "tests/visual/fail-equal-weight.spec.ts"
    - "tests/a11y/iteration-catalog.spec.ts"
    - "tests/a11y/iteration-detail.spec.ts"
  modified:
    - "app/globals.css — full token migration :root + .dark hue 165→70-80 + --spacing-5xl + font aliases"
    - "app/layout.tsx — IBM Plex Sans + Mono next/font loading + html className injection"
    - "velite.config.ts — research collection + researchSchema export"
    - "i18n/request.ts — 4 additional namespace imports + 7-way mergeMessages call"
    - "tests/unit/tokens.test.ts — 8 new Phase 2 assertions added (15 total)"
    - "tsconfig.json — added baseUrl + @/.velite path alias"
    - "package.json — nuqs@2.8.9 dependency"

key-decisions:
  - "Biome normalizes trailing zeros in CSS numeric values (0.10 → 0.1, 0.40 → 0.4); test regexes use 0\\.1[0]? pattern to handle both forms"
  - "tsconfig baseUrl set to '.' to resolve @/.velite alias warning from velite build"
  - "Status colors (hue 145/30/60/230) carried forward unchanged from Phase 1 — they are hue-independent"
  - "Wave 0 test stubs use test.fixme (not test.skip) so they appear in Playwright test list as planned work"

requirements-completed: []

duration: 9min
completed: 2026-05-12
---

# Phase 2 Plan 01: Phase 2 Foundation Summary

**Muted-ochre token migration (hue 165→70-80), IBM Plex fonts via next/font, Velite research collection with researchSchema, nuqs install, 7-namespace i18n deep-merge, and 16 Wave 0 test stubs covering all Phase 2 requirements**

## Performance

- **Duration:** 9 min
- **Started:** 2026-05-12T22:11:16Z
- **Completed:** 2026-05-12T22:20:52Z
- **Tasks:** 3
- **Files modified:** 30

## Accomplishments

- Migrated `app/globals.css` from Phase 1 hue-165 teal-green placeholder to locked muted-ochre (hue 70-80) in both `:root` and `.dark` blocks; zero hue-165 remnants remain
- Loaded IBM Plex Sans + IBM Plex Mono via `next/font/google` with `--font-plex-sans` / `--font-plex-mono` CSS variables injected via `<html>` className; `--font-sans` / `--font-mono` aliases added to `@theme inline`
- Extended `velite.config.ts` with `research` collection + exported `researchSchema` for unit test isolation; installed `nuqs@2.8.9`; extended `i18n/request.ts` to deep-merge 7 namespaces per locale
- Authored 8 namespace files (es-CO + en for iterations, research, team, about) with copy verbatim from UI-SPEC §Copywriting Contract; no machine-translated stubs
- Scaffolded 16 Wave 0 test stubs — all downstream Phase 2 feature plans can fill assertions without rediscovering infrastructure

## Task Commits

1. **Task 1: Migrate globals.css tokens + IBM Plex fonts** - `1577794` (feat)
2. **Task 2: Velite research collection + nuqs + i18n namespaces** - `5f3b479` (feat)
3. **Task 3: Wave 0 test scaffolds** - `e4e8091` (test)

## Token Values Committed

**Light mode (`:root`):**
```
--bg-canvas:   oklch(0.97 0.005 80)
--bg-surface:  oklch(0.94 0.008 75)
--bg-elevated: oklch(0.99 0.003 80)
--text-primary:   oklch(0.2 0.01 80)
--text-secondary: oklch(0.4 0.01 75)
--text-muted:     oklch(0.58 0.008 70)
--border-default: oklch(0.86 0.012 75)
--accent-default: oklch(0.6 0.08 70)
--accent-hover:   oklch(0.54 0.09 70)
--accent-subtle:  oklch(0.6 0.08 70 / 0.12)
--ring:           oklch(0.6 0.08 70)
--spacing-5xl: 120px  (in @theme inline)
--color-accent-subtle: var(--accent-subtle)  (in @theme inline)
```

**Dark mode (`.dark`):**
```
--bg-canvas:   oklch(0.13 0.015 70)
--bg-surface:  oklch(0.17 0.013 70)
--bg-elevated: oklch(0.18 0.013 70)
--text-primary:   oklch(0.93 0.005 80)
--text-secondary: oklch(0.78 0.008 75)
--text-muted:     oklch(0.68 0.01 75)
--border-default: oklch(0.3 0.01 75)
--accent-default: oklch(0.7 0.1 70)
--accent-hover:   oklch(0.76 0.11 70)
--accent-subtle:  oklch(0.7 0.1 70 / 0.18)
--ring:           oklch(0.7 0.1 70)
```

Status colors unchanged from Phase 1: pass `oklch(0.38 0.17 145)`, fail `oklch(0.4 0.19 30)`, parked `oklch(0.42 0.13 60)`, in-progress `oklch(0.38 0.16 230)`.

## nuqs Version

`nuqs@2.8.9` — peer warning about React 16/17/18 is false positive; nuqs 2.x fully supports React 19.

## i18n Namespace Files

| File | Keys (top-level) |
|------|-----------------|
| `messages/es-CO/iterations.json` | `iterations.catalog`, `iterations.filter`, `iterations.detail`, `iterations.status` |
| `messages/en/iterations.json` | same structure |
| `messages/es-CO/research.json` | `research.h1`, `.subheading`, `.empty_state`, `.cta`, `.type_label` |
| `messages/en/research.json` | same structure |
| `messages/es-CO/team.json` | `team.h1`, `.subheading`, `.github_link_label`, `.current_iteration_label`, `.no_assignment_label` |
| `messages/en/team.json` | same structure |
| `messages/es-CO/about.json` | `about.h1`, `.subheading`, `.intro`, `.steps` (5), `.commitments`, `.reference_link_label` |
| `messages/en/about.json` | same structure |

## Wave 0 Stub File Inventory

| File | REQ-IDs | Type |
|------|---------|------|
| `tests/unit/homepage-counts.test.ts` | LAB-01 | Vitest it.todo |
| `tests/e2e/homepage-content.spec.ts` | LAB-01 | Playwright test.fixme |
| `tests/e2e/team-page.spec.ts` | LAB-02 | Playwright test.fixme |
| `tests/e2e/research-page.spec.ts` | LAB-03 | Playwright test.fixme |
| `tests/e2e/about-page.spec.ts` | LAB-05 | Playwright test.fixme |
| `tests/e2e/locale-coverage.spec.ts` | LAB-06 | Playwright test.fixme |
| `tests/e2e/iteration-catalog.spec.ts` | ITER-01, ITER-02 | Playwright test.fixme |
| `tests/e2e/iteration-detail.spec.ts` | ITER-03 | Playwright test.fixme |
| `tests/e2e/iteration-evidence.spec.ts` | ITER-04 | Playwright test.fixme |
| `tests/e2e/iteration-pair-d.spec.ts` | ITER-05 | Playwright test.fixme |
| `tests/e2e/iteration-fx-vol-fail.spec.ts` | ITER-06 | Playwright test.fixme |
| `tests/e2e/iteration-jsonld.spec.ts` | ITER-09 | Playwright test.fixme |
| `tests/visual/iteration-catalog-equal-weight.spec.ts` | ITER-02 | Playwright test.fixme |
| `tests/visual/fail-equal-weight.spec.ts` | ITER-06 | Playwright test.fixme |
| `tests/a11y/iteration-catalog.spec.ts` | ITER-02 | Playwright test.fixme |
| `tests/a11y/iteration-detail.spec.ts` | ITER-06 | Playwright test.fixme |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Biome normalizes trailing zeros in CSS numeric values**
- **Found during:** Task 1 (token migration)
- **Issue:** The plan specified `oklch(0.7 0.10 70)` but biome auto-formats `0.10` to `0.1`. Test assertion `0\.10` would fail after biome check --write.
- **Fix:** Updated test regex to `0\.1[0]?` to match both `0.10` and `0.1` forms.
- **Files modified:** `tests/unit/tokens.test.ts`
- **Verification:** All 15 token tests pass after biome format run.
- **Committed in:** `1577794` (part of Task 1 commit)

**2. [Rule 3 - Blocking] tsconfig baseUrl missing caused @/.velite alias warning**
- **Found during:** Task 2 (velite build after tsconfig edit)
- **Issue:** `"@/.velite": [".velite/index.ts"]` emits `Non-relative path warning` without `baseUrl`.
- **Fix:** Added `"baseUrl": "."` to tsconfig.json and changed path to `./.velite/index.ts`.
- **Files modified:** `tsconfig.json`
- **Verification:** `pnpm velite build` exits 0 without warning; `pnpm tsc --noEmit` exits 0.
- **Committed in:** `5f3b479` (part of Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 Bug, 1 Blocking)
**Impact on plan:** Both necessary for correct behavior. No scope creep.

## Validation Results

- `pnpm vitest run tests/unit/tokens.test.ts` — 15/15 passed
- `pnpm vitest run tests/unit/velite-research-schema.test.ts` — 8/8 passed
- `pnpm vitest run tests/unit/i18n-coverage.test.ts` — 4/4 passed (es-CO ↔ en parity)
- `pnpm velite build` — exits 0; `.velite/research.json` emitted
- `npx impeccable detect app/` — exits 0 (no anti-patterns)
- `pnpm biome check .` — 97 files, no errors
- `pnpm tsc --noEmit` — exits 0
- Playwright: 57 fixme/skipped (all Wave 0 stubs), 0 new failures from plan

## Next Phase Readiness

- **02-02** (Homepage content): IBM Plex fonts wired, `lab.*` + new namespace keys available, Velite iterations collection accessible, token set migrated
- **02-03** (Iteration catalog): `iterations.*` namespace ready, nuqs installed, stub tests awaiting assertions
- **02-04 through 02-07** (Detail pages, Publications, Team, About): all namespace files + researchSchema ready
- **02-08** (i18n coverage): `i18n-coverage.test.ts` infrastructure ready to add remaining namespace checks

---
*Phase: 02-research-lab-presence-and-iteration-catalog*
*Completed: 2026-05-12*
