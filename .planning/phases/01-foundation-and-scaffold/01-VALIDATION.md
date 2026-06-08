---
phase: 1
slug: foundation-and-scaffold
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-11
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Frameworks** | Vitest 2.x (unit), Playwright 1.49 (e2e + a11y), @axe-core/playwright (a11y), Lighthouse CI (performance), Biome 1.9 (lint/format), tsc (typecheck), impeccable CLI (anti-pattern detection) |
| **Config files** | `vitest.config.ts`, `playwright.config.ts`, `lighthouserc.cjs`, `biome.json`, `tsconfig.json` (Wave 0 installs all) |
| **Quick run command** | `pnpm test:quick` (alias for `biome check . && tsc --noEmit && vitest run`) |
| **Full suite command** | `pnpm test:all` (lint + typecheck + unit + e2e + a11y + lighthouse + impeccable) |
| **Estimated quick runtime** | ~30 seconds |
| **Estimated full runtime** | ~6 minutes (locally), ~8 minutes (CI parallel jobs) |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test:quick` (lint + typecheck + unit)
- **After every plan wave:** Run `pnpm test:all` (full matrix)
- **Before `/gsd:verify-work`:** Full suite must be green on Vercel preview
- **Max feedback latency:** 30 seconds per task; 8 minutes per wave

---

## Per-Task Verification Map

| Req ID | Test Type | Automated Command | File / Evidence | Status |
|--------|-----------|-------------------|-----------------|--------|
| FOUND-01 | structural | `test -f next.config.ts && test -f package.json && grep -q '"next":' package.json` | `package.json`, `next.config.ts`, Vercel deploy URL responds 200 | ⬜ pending |
| FOUND-02 | unit + visual | `grep -q '@theme' app/globals.css && vitest run tests/unit/tokens.test.ts` | `app/globals.css` has `@theme inline`; `tests/unit/tokens.test.ts` enforces WCAG AA contrast for every token pair AND neutral-tint chroma > 0 | ⬜ pending |
| FOUND-03 | unit + e2e | `vitest run tests/unit/i18n.test.ts && playwright test tests/e2e/locale-switch.spec.ts` | `i18n/request.ts`, `messages/es-CO/*.json`, `messages/en/*.json`, language switcher persists cookie across reload | ⬜ pending |
| FOUND-04 | unit | `vitest run tests/unit/velite-schema.test.ts` | `velite.config.ts` schema rejects iteration MDX missing `replication_hash`; refines FAIL→requires `disposition_memo` | ⬜ pending |
| FOUND-05 | unit | `vitest run tests/unit/wagmi-config.test.ts` | `lib/wagmi/config.ts` exports `celo`, `mainnet`, `base`, `arbitrum`, `optimism`; each chain has fallback transport | ⬜ pending |
| FOUND-06 | structural | `test -f wagmi.config.ts && grep -q 'foundry' wagmi.config.ts` | `wagmi.config.ts` configured with foundry plugin pointing to placeholder `../abrigo/` path | ⬜ pending |
| FOUND-07 | CI gate | GitHub Actions job `impeccable`: `npx impeccable detect --fail-on-error .` (flag verified live via `--help`) | `.github/workflows/ci.yml` contains job `impeccable`; sample PR with planted anti-pattern fails CI | ⬜ pending |
| FOUND-08 | CI gate | GitHub Actions job `lighthouse`: `lhci autorun --collect.url=<preview> --assert.preset=lighthouse:recommended` with Moto G Power 3G profile | `lighthouserc.cjs` enforces LCP ≤ 2500ms, TBT ≤ 200ms; CI fails on regression | ⬜ pending |
| FOUND-09 | CI gate | GitHub Actions job `a11y`: `playwright test --project=axe` | `tests/a11y/*.spec.ts` runs axe-core scan; all WCAG 2.2 AA violations fail build | ⬜ pending |
| FOUND-10 | structural + manual | `test -f .env.example && grep -q -E 'NEXT_PUBLIC_' .env.example` + Vercel dashboard inspection | `.env.example` documents Production/Preview/Development scopes; `lib/env.ts` validates with `@t3-oss/env-nextjs` Zod schema; build fails on missing required vars | ⬜ pending |
| FOUND-11 | architecture test | `vitest run tests/architecture/no-wallet-in-lab.test.ts` | Test reads route group source tree via fs/grep; asserts BOTH `(lab)/**/*.{ts,tsx}` AND `(apps)/**/*.{ts,tsx}` do not import `wagmi` or `@rainbow-me/rainbowkit` | ⬜ pending |
| NAV-01 | structural + e2e | `test -f components/TopNav.tsx && grep -q "TopNav" app/layout.tsx && playwright test tests/e2e/apps-dropdown.spec.ts` | TopNav rendered globally; visible on /, /apps, /apps/abrigo | ⬜ pending |
| NAV-02 | structural | `test -f lib/apps/registry.ts && grep -q "export const apps" lib/apps/registry.ts && grep -q "import.*registry" components/AppsDropdown.tsx` | Registry is single source of truth; AppsDropdown imports from it; no hardcoded app list elsewhere | ⬜ pending |
| NAV-03 | e2e | `playwright test tests/e2e/apps-dropdown.spec.ts -g "lists Abrigo with active status badge"` | Exactly 1 menuitem visible labeled "Abrigo" with status pill text matching active/Activa | ⬜ pending |
| NAV-04 | e2e | `playwright test tests/e2e/apps-dropdown.spec.ts -g "secondary external link"` | External-link icon present; href = https://x.com/d2pfinabrigo; target = _blank; rel includes noopener | ⬜ pending |
| NAV-05 | e2e | `playwright test tests/e2e/apps-dropdown.spec.ts -g "keyboard navigable"` | Tab focuses trigger; Enter opens; ArrowDown moves to first menuitem; Escape closes and restores focus | ⬜ pending |
| NAV-06 | e2e | `playwright test tests/e2e/apps-dropdown.spec.ts -g "outside click"` | Click outside menu closes it; no focus trap | ⬜ pending |
| NAV-07 | e2e | `playwright test tests/e2e/apps-dropdown.spec.ts -g "Mobile drawer"` | At viewport 360x800, hamburger reveals drawer containing nested Apps section with same Abrigo entry | ⬜ pending |
| NAV-08 | structural + e2e | `test -f app/\(apps\)/apps/page.tsx && playwright test tests/e2e/apps-dropdown.spec.ts -g "primary link navigates"` | `/apps` index renders one card per registry entry; URL is canonical and scrapeable | ⬜ pending |
| APP-01 | structural + e2e + a11y | `test -f app/\(apps\)/apps/abrigo/page.tsx && grep -q "d2pfinabrigo" app/\(apps\)/apps/abrigo/page.tsx && playwright test tests/a11y/apps-dropdown.spec.ts` | `/apps/abrigo` overview page renders mission, headline counts, external Twitter link, 3 Phase-2 placeholder cards; zero a11y violations | ⬜ pending |
| FOUND-12 | e2e | `playwright test tests/e2e/agent-stubs.spec.ts` | GET `/llms.txt`, `/.well-known/mcp.json`, `/.well-known/openapi.yaml` all return 200 with valid content; root layout HTML contains JSON-LD `<script type="application/ld+json">` for WebSite + Organization | ⬜ pending |
| FOUND-13 | structural + smoke | `test -f vitest.config.ts && test -f playwright.config.ts && pnpm test:quick` | Vitest + Playwright + MSW installed; example tests pass: `tests/unit/format.test.ts`, `tests/e2e/homepage.spec.ts`, `tests/api/health.test.ts`, `tests/architecture/no-wallet-in-lab.spec.ts`, `tests/a11y/homepage.spec.ts` | ⬜ pending |
| CROSS-01 | CI gate | Re-uses FOUND-09 axe-core gate; top-5-template manual audit checklist for screen reader recorded in `docs/a11y-audit.md` | All scaffolded pages pass axe-core; checklist file exists | ⬜ pending |
| CROSS-02 | e2e | `playwright test tests/e2e/locale-switch.spec.ts` | Stub homepage renders in es-CO and en; switcher persists choice via `NEXT_LOCALE` cookie; keyboard-navigable | ⬜ pending |
| CROSS-03 | CI gate | Re-uses FOUND-08 Lighthouse gate | LCP < 2.5s on Moto G Power 3G profile against Vercel preview | ⬜ pending |
| CROSS-04 | CI gate | Re-uses FOUND-07 impeccable gate plus a `tests/visual/anti-patterns.spec.ts` planted-pattern smoke that asserts impeccable would flag | impeccable detects every anti-pattern in test fixtures: nested cards, purple-to-blue gradient, oversized italic serif h1, eyebrow chip above h1, dark glow halo | ⬜ pending |
| CROSS-05 | unit | `vitest run tests/unit/tokens.test.ts -t "neutral tint"` | Test inspects token values: every neutral has nonzero chroma (`oklch` C > 0); pure black `#000` and pure white `#fff` rejected | ⬜ pending |
| CROSS-06 | unit + e2e | `vitest run tests/unit/format.test.ts -t "currency"` (no separate e2e — assertion is in unit) | `lib/format/currency.ts` defaults to COP for es-CO, USD for en; user preference cookie overrides | ⬜ pending |
| CROSS-07 | unit | `vitest run tests/unit/format.test.ts -t "date"` | `formatDate(new Date('2026-05-11'), 'es-CO')` returns `11 de mayo de 2026`; `'en'` returns `May 11, 2026`; no hardcoded `en-US` | ⬜ pending |
| CROSS-08 | unit | `vitest run tests/unit/format.test.ts -t "number"` | `Intl.NumberFormat` wrapper handles locale-aware thousand separators and decimal marks; es-CO uses `.` thousands `,` decimal; en uses `,` thousands `.` decimal | ⬜ pending |
| CROSS-09 | unit + visual | `vitest run tests/unit/status-pill.test.ts` | `<StatusPill status="PASS">` renders icon + color + text label; the text label is present even when CSS strips color | ⬜ pending |
| CROSS-10 | manual | Copy review checklist; impeccable copy-quality detector run | `docs/copy-review.md` checklist completed; no "Empower your X with our Y" phrasing detected by impeccable copy detector | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Wave 0 sets up the testing infrastructure that every subsequent task depends on:

- [ ] `vitest.config.ts` — Vitest 2.x with React 19 + JSDOM env; `tests/setup.ts` with MSW + `@testing-library/jest-dom`
- [ ] `playwright.config.ts` — Playwright 1.49 with `chromium` + `axe` projects; uses Vercel preview URL via `PLAYWRIGHT_TEST_BASE_URL` env
- [ ] `lighthouserc.cjs` — LHCI config with Moto G Power 3G throttling preset; `--assert.preset=lighthouse:recommended` + custom budget for LCP < 2500ms, TBT < 200ms
- [ ] `biome.json` — Biome 1.9 config extending recommended preset; rules customized for React 19 + Next.js 16
- [ ] `tsconfig.json` — strict + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`
- [ ] `.github/workflows/ci.yml` — parallel jobs: lint, typecheck, test:unit, test:e2e, a11y, lighthouse, impeccable
- [ ] `lefthook.yml` — pre-commit: biome check (staged), tsc --noEmit (incremental), velite content validation; commit-msg: commitlint conventional preset
- [ ] `package.json` test scripts: `test:quick`, `test:all`, `test:unit`, `test:e2e`, `test:a11y`, `test:lighthouse`, `test:impeccable`
- [ ] `tests/setup.ts` — shared test fixtures, MSW server, React Testing Library config
- [ ] Stub test files (these are the templates for later phases). Flat structure under tests/{unit,e2e,api,architecture,a11y,visual}/:
  - [ ] `tests/unit/format.test.ts` (currency + date + number assertions in one file)
  - [ ] `tests/unit/tokens.test.ts` (contrast + neutral-tint assertions in one file)
  - [ ] `tests/unit/i18n.test.ts`
  - [ ] `tests/unit/velite-schema.test.ts`
  - [ ] `tests/unit/wagmi-config.test.ts`
  - [ ] `tests/unit/status-pill.test.ts`
  - [ ] `tests/e2e/homepage.spec.ts`
  - [ ] `tests/e2e/locale-switch.spec.ts`
  - [ ] `tests/e2e/agent-stubs.spec.ts`
  - [ ] `tests/api/health.test.ts`
  - [ ] `tests/architecture/no-wallet-in-lab.test.ts` (renamed from .spec.ts — Vitest runs it; Playwright excludes tests/architecture/)
  - [ ] `tests/a11y/homepage.spec.ts`
  - [ ] `tests/unit/anti-patterns.test.ts` (planted-fixture impeccable detector test; lives in unit/ to avoid Playwright/Vitest collection conflict; fixture HTML at `tests/unit/fixtures/anti-patterns.html`)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Screen-reader audit of stub homepage | CROSS-01 | Manual screen-reader navigation cannot be fully automated; axe-core covers static violations but not flow | Use VoiceOver (macOS) or NVDA (Windows) to navigate stub homepage. Confirm: heading order makes sense, language switcher is announced, status pills are announced with status text, links have meaningful names. Record findings in `docs/a11y-audit.md`. |
| Vercel environment variable scope inspection | FOUND-10 | Vercel dashboard state is not introspectable from CI | Vercel project dashboard → Settings → Environment Variables. Confirm: each variable has explicit scope checkbox (Production / Preview / Development); no secret has `NEXT_PUBLIC_` prefix; preview RPC URLs differ from production. Record screenshot in `docs/env-vars.md`. |
| Translation author-quality spot check | CROSS-02, LAB-06 (overlap) | Translation quality requires human judgment | Native es-CO speaker reviews `messages/es-CO/*.json`; rejects any phrase that reads as machine-translated. Phase 1 only needs the stub homepage strings reviewed. |
| Copy review for "AI slop" tone | CROSS-10 | Tonal judgment requires human reader; impeccable detector catches surface patterns only | Author reviews `messages/en/*.json` and `messages/es-CO/*.json` for "Empower your X with our Y", marketing superlatives, or generic SaaS phrasing. Stub homepage scope only. |
| Initial Vercel project + GitHub repo creation | FOUND-01, FOUND-10 | One-time manual setup that precedes any CI run | Create GitHub repo `wvs-finance/frontend` (or chosen name); create Vercel project linked to the repo; configure env scopes; record the project's Vercel project ID in `.vercel/project.json`. |

---

## Validation Sign-Off

- [ ] All 23 phase requirements have automated verification OR a manual-only entry above
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify (Wave 0 ensures this — every requirement has either an automated check or an explicit manual entry)
- [ ] Wave 0 covers all infrastructure dependencies referenced above
- [ ] No watch-mode flags in CI (all runs are `--run` / non-watch)
- [ ] Feedback latency: quick suite < 30s, full suite < 8min
- [ ] `nyquist_compliant: true` set in frontmatter once planner confirms every PLAN.md task references a row in this table

**Approval:** pending
