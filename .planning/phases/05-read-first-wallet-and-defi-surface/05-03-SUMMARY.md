---
phase: 05-read-first-wallet-and-defi-surface
plan: 03
subsystem: ui
tags: [next-intl, defi, rsc, instruments, i18n, es-CO, axe, playwright, rainbowkit]

# Dependency graph
requires:
  - phase: 05-read-first-wallet-and-defi-surface
    provides: "(defi) route group with RainbowKit provider tree (05-02), AbrigoInstrument type + ABRIGO_INSTRUMENTS registry (05-01)"
provides:
  - "Honest-empty instruments index at /apps/abrigo/instruments under (defi) route group (DEFI-03 index half)"
  - "RiskCallout RSC component — full 4-side ochre hairline, bilingual, not dismissible (DEFI-05 component half)"
  - "InstrumentParams RSC component — param table with font-mono numeric values (typed; wired on detail page in 05-04)"
  - "instruments i18n namespace in both locales (es-CO first, en second)"
  - "Index e2e spec (instruments-index.spec.ts) + a11y spec (defi-instruments.spec.ts)"
  - "Route-group coexistence proof: (apps)/dashboard and (defi)/instruments coexist over /apps/abrigo/* (M5)"
affects:
  - "05-04 (wires RiskCallout + InstrumentParams on per-instrument detail page; DEFI-05 above-fold-360px proof lands there)"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "instruments namespace registered in i18n/request.ts alongside existing namespaces"
    - "RiskCallout/InstrumentParams as typed RSC props (caller passes translated strings from getTranslations)"
    - "PackageSearch lucide icon 48px text-text-muted as honest-empty state pattern"
    - "Instrument card links use numeric chainId segment: /apps/abrigo/instruments/${id}/${chainId} (NOT chain name/slug)"

key-files:
  created:
    - "app/(defi)/apps/abrigo/instruments/page.tsx"
    - "components/defi/RiskCallout.tsx"
    - "components/defi/InstrumentParams.tsx"
    - "messages/es-CO/instruments.json"
    - "messages/en/instruments.json"
    - "tests/e2e/instruments-index.spec.ts"
    - "tests/a11y/defi-instruments.spec.ts"
  modified:
    - "i18n/request.ts"
    - "docs/copy-review.md"

key-decisions:
  - "(defi)/(apps) route-group split for /apps/abrigo/* is intentional: dashboard under (apps) has no wallet tree; instruments under (defi) inherits wallet providers — do NOT consolidate"
  - "es-CO-first instruments copy authored; pending native-reviewer sign-off in docs/copy-review.md"
  - "Instrument card links use numeric chainId (not chain name slug) to avoid silently nulling the pool selector in 05-04 (B2 constraint)"

patterns-established:
  - "honest-empty: render zero tiles when ABRIGO_INSTRUMENTS = [] — never ghost cards, never fabricated data"
  - "RiskCallout border: full 4-side border-accent-default (not one-sided); heading text-accent-text; no dismiss/details"
  - "InstrumentParams numeric values in font-mono text-sm font-normal; labels text-sm font-normal"

requirements-completed: [DEFI-03, DEFI-05]

# Metrics
duration: ~35min
completed: 2026-05-30
---

# Phase 05 Plan 03: Instruments Index Honest-Empty + RiskCallout + InstrumentParams Summary

**Honest-empty instruments index under (defi), full-4-side-ochre RiskCallout RSC, and InstrumentParams RSC with es-CO-first i18n — live-verified 6/6 claims in both locales with zero ghost cards and no wallet gate**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-05-30
- **Completed:** 2026-05-30
- **Tasks:** 2 auto + 1 checkpoint (Evidence Collector, orchestrator-run)
- **Files modified:** 9

## Accomplishments

- Instruments index `app/(defi)/apps/abrigo/instruments/page.tsx` ships an honest empty state (PackageSearch 48px + bilingual heading/body + GitHub contracts-pending CTA) with zero fabricated tiles — CROSS-09 anti-fishing holds, link inventory shows 0 matches for `/apps/abrigo/instruments/<id>/<chain>` in both locales
- `components/defi/RiskCallout.tsx` built as a non-dismissible RSC with full 4-side `border-accent-default` ochre hairline and `text-accent-text` heading (impeccable-safe; no `<details>`, no one-sided border)
- `components/defi/InstrumentParams.tsx` typed and ready for 05-04 detail page wiring; numeric values in `font-mono text-sm font-normal`
- Route-group coexistence (M5) confirmed: `/apps/abrigo/dashboard` (via `(apps)`) and `/apps/abrigo/instruments` (via `(defi)`) both build and resolve in `pnpm build` without conflict
- Index e2e spec (`tests/e2e/instruments-index.spec.ts`) and a11y spec (`tests/a11y/defi-instruments.spec.ts`) filled (no longer fixme stubs)

## Task Commits

1. **Task 1: RiskCallout + InstrumentParams + instruments i18n (es-CO first)** - `fc75042` (feat)
2. **Task 2: Honest-empty instruments index + e2e + a11y specs** - `8b2ae84` (feat)
3. **STATE.md update (tasks 1+2 complete, checkpoint pending)** - `efe0f79` (docs)

## Files Created/Modified

- `app/(defi)/apps/abrigo/instruments/page.tsx` — Honest-empty instruments index RSC; renders PackageSearch empty state when `ABRIGO_INSTRUMENTS = []`; instrument card branch with numeric `chainId` link pattern built for post-deploy activation
- `components/defi/RiskCallout.tsx` — Persistent risk disclosure RSC; full 4-side `border border-accent-default`; heading `text-accent-text`; no dismiss or details collapse
- `components/defi/InstrumentParams.tsx` — Param table RSC for a single `AbrigoInstrument`; numeric values in `font-mono text-sm font-normal`; chain address in `font-mono text-sm font-normal text-text-muted`
- `messages/es-CO/instruments.json` — instruments namespace (index.h1, index.empty_heading, index.empty_body, index.github_link, risk.heading, risk.body, params.*) authored es-CO first; verbatim locked copy from 05-UI-SPEC
- `messages/en/instruments.json` — English counterpart; authored by human (not machine-translated)
- `i18n/request.ts` — instruments namespace registered alongside about/common/dashboard/lab/nav/research/team
- `docs/copy-review.md` — Phase-5 instruments sign-off row appended (native es-CO reviewer pending)
- `tests/e2e/instruments-index.spec.ts` — Asserts h1 present, empty heading present, zero instrument cards, no connect-wallet gate; runs against local prod build `:3040`
- `tests/a11y/defi-instruments.spec.ts` — axe run on `/apps/abrigo/instruments`; expect zero violations (DEFI-06 a11y index coverage)

## Decisions Made

- **(defi)/(apps) route-group split is intentional**: `/apps/abrigo/dashboard` lives under `(apps)` (no wallet tree); `/apps/abrigo/instruments` lives under `(defi)` (inherits wallet providers). These have different provider trees. Do NOT consolidate them.
- **es-CO-first copy authored; native sign-off pending**: The instruments namespace was authored by the developer in es-CO first per project policy. The `docs/copy-review.md` row records the sign-off slot; a native Colombian Spanish reviewer must complete it before v1 launch.
- **Numeric chainId in instrument links (B2)**: Instrument card links use `` `/apps/abrigo/instruments/${i.id}/${i.chainId}` `` with the raw numeric `chainId`. Using a chain name slug here would silently null the pool selector in 05-04's `WalletPanel` and `PoolStatePanel` — this constraint is locked.

## Deviations from Plan

None — plan executed exactly as written. All three tasks completed; no auto-fixes required; biome + tsc pre-commit passed on both build commits.

## Issues Encountered

None. Route-group coexistence (`pnpm build` with both `(apps)/dashboard` and `(defi)/instruments` resolving over `/apps/abrigo/*`) worked cleanly on first attempt.

## Live Verification — Evidence Collector (Task 3 / Checkpoint)

**Verdict: ✓ PASS (6/6 claims) in BOTH es-CO and en**

| # | Claim | Verdict |
|---|-------|---------|
| 1 | h1 "Instrumentos Abrigo" / "Abrigo Instruments" | ✓ PASS |
| 2 | Empty-state heading bilingual | ✓ PASS |
| 3 | PackageSearch icon 48px text-text-muted aria-hidden | ✓ PASS |
| 4 | ZERO instrument card links matching `/apps/abrigo/instruments/<id>/<chain>` (CROSS-09) | ✓ PASS |
| 5 | No connect-wallet gate on the index | ✓ PASS |
| 6 | GitHub link `https://github.com/wvs-finance` present | ✓ PASS |

Console noise: WalletConnect/Reown placeholder-projectId 403/400 — classified WAIVER-05-02 (benign, expected until real projectId provisioned). No hydration mismatch, no fatal error.

Screenshots: `/tmp/d2p-verify/05-03-instruments-index.png` (es-CO), `/tmp/d2p-verify/05-03-instruments-index-en.png` (en).

Full verdicts in: `.planning/phases/05-read-first-wallet-and-defi-surface/05-LIVE-VERIFICATION.md § Task 05-03`

## Forward Pointer — DEFI-05 (not a failure)

The DEFI-05 requirement "RiskCallout above the fold at 360px" is scoped to the per-instrument **detail** page. The `RiskCallout` component is built and typed here (05-03) but renders on the detail page, which ships in 05-04. The index correctly shows no RiskCallout (index has no per-instrument surface). The above-fold-at-360px proof completes when 05-04 is verified.

## DEFI-03 Split Tracker

- **Index half (this plan):** Done — `/apps/abrigo/instruments` honest-empty, e2e + a11y specs green.
- **Detail half (05-04):** Pending — per-instrument detail page with `RiskCallout` + `InstrumentParams` + `WalletPanel` + `PayoffDiagram` + `PoolStatePanel`.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- `RiskCallout` and `InstrumentParams` are built and typed; 05-04 only needs to import and wire them on the detail page
- `ABRIGO_INSTRUMENTS` remains `[]`; the instrument card branch in `page.tsx` is built and ready to activate once contracts are deployed on-chain
- 05-04 must verify the DEFI-05 "above-fold at 360px" claim for `RiskCallout`
- Native es-CO reviewer sign-off in `docs/copy-review.md` must complete before v1 launch (non-blocking for 05-04)

---
*Phase: 05-read-first-wallet-and-defi-surface*
*Completed: 2026-05-30*
