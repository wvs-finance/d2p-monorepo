---
phase: 2
slug: research-lab-presence-and-iteration-catalog
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-12
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. The planner MUST map every task to a row in this table.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Frameworks** | Vitest 4.x (unit + RSC), Playwright 1.49 (e2e + a11y), @axe-core/playwright (a11y), Lighthouse CI (perf budget), Biome 1.9 (lint/format), tsc (typecheck), impeccable v2.1.8 (anti-pattern CLI gate) |
| **Config files** | Existing — `vitest.config.ts`, `playwright.config.ts`, `lighthouserc.cjs`, `biome.json`, `tsconfig.json` (Phase 1 Wave 0 installed all) |
| **Quick run command** | `pnpm test:quick` (biome + tsc + vitest) |
| **Full suite command** | `pnpm test:all` |
| **Estimated quick runtime** | ~30 seconds |
| **Estimated full runtime** | ~6 minutes local, ~10 minutes CI (matrix) |

---

## Sampling Rate

- **After every task commit:** `pnpm test:quick`
- **After every plan wave:** `pnpm test:all`
- **Before `/gsd:verify-work`:** Full suite green on Vercel preview deploy
- **Max feedback latency:** 30s per task; 10min per wave (Phase 2 has heavier Playwright due to iteration pages)

---

## Per-Requirement Verification Map

| Req ID | Test Type | Automated Command | File / Evidence | Status |
|--------|-----------|-------------------|-----------------|--------|
| **LAB-01** | unit + e2e | `vitest run tests/unit/homepage-counts.test.ts && playwright test tests/e2e/homepage-content.spec.ts` | `app/(lab)/page.tsx` renders mission, "What is d2-π" explainer, Apps overview card linking to `/apps/abrigo`, headline counts derived from Velite iterations collection, footer links to `https://github.com/wvs-finance` | ⬜ pending |
| **LAB-02** | structural + e2e | `test -f lib/team/contributors.ts && grep -q 'github_handle' lib/team/contributors.ts && playwright test tests/e2e/team-page.spec.ts` | `/team` renders ContributorCard for each entry in `lib/team/contributors.ts`; cards show name + role + GitHub link + focus iteration slug | ⬜ pending |
| **LAB-03** | structural + e2e | `velite build && ls .velite/research.json && playwright test tests/e2e/research-page.spec.ts` | `/research` renders PublicationCard for each entry in Velite `research` collection; ≥3 seed entries from abrigo `scratch/` and `docs/` | ⬜ pending |
| **LAB-04** | structural + workflow | `test -f .github/workflows/sync-abrigo-content.yml && grep -q 'repository_dispatch' .github/workflows/sync-abrigo-content.yml && grep -q 'peter-evans/create-pull-request@v6' .github/workflows/sync-abrigo-content.yml` | Sync workflow triggers on `repository_dispatch: abrigo-content-updated`; path filters `scratch/**` and `docs/**`; creates PR via peter-evans action | ⬜ pending |
| **LAB-05** | e2e | `playwright test tests/e2e/about-page.spec.ts` | `/about` renders 5 NumberedSteps (the anti-fishing discipline pipeline) + 4 CheckmarkList items (the lab invariants); both locales authored; no marketing slop (impeccable copy detector) | ⬜ pending |
| **LAB-06** | unit + e2e | `vitest run tests/unit/i18n-coverage.test.ts && playwright test tests/e2e/locale-coverage.spec.ts` | Every Phase 2 page renders in es-CO and en; no missing translation keys; no machine-translation tells (manual copy review checklist in `docs/copy-review.md`) | ⬜ pending |
| **ITER-01** | e2e | `playwright test tests/e2e/iteration-catalog.spec.ts -g "all statuses visible"` | `/apps/abrigo/iterations` default state shows ALL statuses — no filter excludes FAIL or PARKED by default | ⬜ pending |
| **ITER-02** | visual + a11y | `playwright test tests/visual/iteration-catalog-equal-weight.spec.ts && playwright test tests/a11y/iteration-catalog.spec.ts` | Cards have IDENTICAL dimensions (height, width, padding, font sizes, shadow) regardless of status; `IterationCatalogCard` `min-h-[120px]` enforced; visual regression test passes | ⬜ pending |
| **ITER-03** | structural + e2e | `test -f app/\(apps\)/apps/abrigo/iterations/\[slug\]/v\[n\]/page.tsx && playwright test tests/e2e/iteration-detail.spec.ts` | `/apps/abrigo/iterations/{slug}/v{n}` renders spec → data → estimation → tests → disposition narrative for any iteration in Velite collection | ⬜ pending |
| **ITER-04** | e2e | `playwright test tests/e2e/iteration-evidence.spec.ts` | Iteration detail page renders β estimate + 95% CI (inline SVG range-bar with `aria-label`) + p-value + sample size N + replication_hash (with `<details>` "How to verify" containing `make verify` instructions) | ⬜ pending |
| **ITER-05** | e2e | `playwright test tests/e2e/iteration-pair-d.spec.ts` | `/apps/abrigo/iterations/pair-d/v1` HTTP 200; renders β = 0.13670985, p ≈ 1.5×10⁻⁸; status pill PASS visible; links to abrigo notebook URL | ⬜ pending |
| **ITER-06** | e2e + visual | `playwright test tests/e2e/iteration-fx-vol-fail.spec.ts && playwright test tests/visual/fail-equal-weight.spec.ts` | `/apps/abrigo/iterations/fx-vol-on-cpi-surprise/v1` HTTP 200; renders β̂ = -0.000685, 90% CI = [-0.003635, 0.002265], n = 947; status pill FAIL; `<DispositionMemo>` section visible at SAME visual weight as PASS pages (no collapse, no muted color) | ⬜ pending |
| **ITER-07** | unit | `vitest run tests/unit/status-pill-color-icon-text.test.ts` | `<StatusPill status={X}>` renders DOM containing color class + lucide icon node + visible text label for all 4 status values; text node present even when CSS stripped | ⬜ pending |
| **ITER-08** | structural | `test -f app/\(apps\)/apps/abrigo/iterations/pair-d/ -type d 2>/dev/null || find content/iterations -name "v1.mdx" \| grep -E "pair-d\|fx-vol-on-cpi-surprise"` | Iteration slugs are content-addressable; URL pattern `/apps/abrigo/iterations/[slug]/v[n]/`; no UUIDs in routing | ⬜ pending |
| **ITER-09** | e2e | `playwright test tests/e2e/iteration-jsonld.spec.ts` | Every iteration detail page emits 2 JSON-LD blocks (Dataset + ScholarlyArticle) with `isPartOf` chains to Abrigo App and d2-π Labs; valid JSON parses; passes Google Rich Results structured-data test format | ⬜ pending |

---

## Wave 0 Requirements

Wave 0 sets up test infrastructure NEW to Phase 2 (most was scaffolded in Phase 1):

- [ ] Extend `velite.config.ts` with `research` collection (LAB-03)
- [ ] Add `tests/unit/homepage-counts.test.ts` stub (LAB-01)
- [ ] Add `tests/unit/i18n-coverage.test.ts` stub (LAB-06)
- [ ] Add `tests/unit/status-pill-color-icon-text.test.ts` stub (ITER-07; extends Phase 1 test)
- [ ] Add `tests/e2e/homepage-content.spec.ts` stub (LAB-01)
- [ ] Add `tests/e2e/team-page.spec.ts` stub (LAB-02)
- [ ] Add `tests/e2e/research-page.spec.ts` stub (LAB-03)
- [ ] Add `tests/e2e/about-page.spec.ts` stub (LAB-05)
- [ ] Add `tests/e2e/locale-coverage.spec.ts` stub (LAB-06)
- [ ] Add `tests/e2e/iteration-catalog.spec.ts` stub (ITER-01, ITER-02)
- [ ] Add `tests/e2e/iteration-detail.spec.ts` stub (ITER-03)
- [ ] Add `tests/e2e/iteration-evidence.spec.ts` stub (ITER-04)
- [ ] Add `tests/e2e/iteration-pair-d.spec.ts` stub (ITER-05)
- [ ] Add `tests/e2e/iteration-fx-vol-fail.spec.ts` stub (ITER-06)
- [ ] Add `tests/e2e/iteration-jsonld.spec.ts` stub (ITER-09)
- [ ] Add `tests/visual/iteration-catalog-equal-weight.spec.ts` stub (ITER-02)
- [ ] Add `tests/visual/fail-equal-weight.spec.ts` stub (ITER-06)
- [ ] Add `tests/a11y/iteration-catalog.spec.ts` stub (ITER-02)

All stubs use `test.fixme()` or `it.todo()` and are filled with real assertions by feature plans.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Real-content quality (Pair D / FX-vol narrative) | ITER-05, ITER-06 | LLM cannot verify scientific accuracy of synthesis; requires author or domain reviewer | Author reads `/home/jmsbpp/apps/d2p/abrigo/abrigo-analytics/scratch/2026-04-30-stage-2-m-sketch-dispatch-brief-pair-d.md` + notebook outputs, confirms iteration MDX prose accurately summarizes the disposition. Record review in `docs/iteration-content-review.md`. |
| es-CO translation quality | LAB-06 | Requires native Colombian Spanish speaker; machine translation tells are subtle | Native es-CO reviewer scans every `messages/es-CO/*.json` Phase 2 file + iteration MDX `title_es` / body content. Rejects any phrase that reads machine-translated. Logs in `docs/copy-review.md`. |
| Anti-fishing tone | LAB-05, ITER-06 | Tonal judgment; impeccable copy detector catches surface patterns only | Author reviews `/about` page copy + FAIL iteration disposition memo for "Empower your X with our Y" register, marketing superlatives, generic SaaS phrasing. Logs in `docs/copy-review.md`. |
| Cross-browser visual fidelity | ITER-02, ITER-06 | Playwright visual snapshots may not catch font-rendering differences across OS | Manual smoke on Chrome (Linux), Safari (macOS), Firefox; record screenshots in `docs/cross-browser-audit.md`. |

---

## Validation Sign-Off

- [ ] All 15 phase requirements have automated verification OR a manual-only entry
- [ ] No 3 consecutive tasks without an automated verify path
- [ ] Wave 0 stub tests created
- [ ] Per-requirement evidence file exists (test file or grep target)
- [ ] No watch-mode flags (CI uses `--run`)
- [ ] `nyquist_compliant: true` set in frontmatter once planner confirms every PLAN.md task references a row

**Approval:** pending
