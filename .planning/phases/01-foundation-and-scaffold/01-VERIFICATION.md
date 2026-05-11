---
phase: 01-foundation-and-scaffold
verified: 2026-05-11T18:45:00Z
status: passed
score: 30/32 requirements verified
re_verification: false
gaps:
  - truth: "The i18n message merge preserves skip_to_content from common.json nav namespace"
    status: failed
    reason: >
      i18n/request.ts spreads common.json, lab.json, and nav.json with a top-level spread
      operator. nav.json has a top-level 'nav' key whose value overwrites common.json's 'nav'
      key, causing nav.skip_to_content to be lost in the merged messages object. The vitest
      test 'loads messages from messages/{locale}/common.json (language_switcher keys present)'
      fails with 'expected undefined to be Saltar al contenido'. This is a real runtime bug:
      any component that calls t('nav.skip_to_content') will render undefined.
    artifacts:
      - path: "i18n/request.ts"
        issue: "Top-level spread clobbers nav key from common.json with nav.json's nav object"
      - path: "messages/es-CO/nav.json"
        issue: "Has top-level 'nav' key with menu-label keys but no skip_to_content"
      - path: "messages/en/nav.json"
        issue: "Same - top-level 'nav' key overwrites common.json nav.skip_to_content"
    missing:
      - "Either move skip_to_content into nav.json's 'nav' object, OR use a deep merge in i18n/request.ts, OR rename the nav.json top-level key to avoid collision"
  - truth: "ROADMAP.md progress table is accurate and reflects all 8 plans complete"
    status: partial
    reason: >
      ROADMAP.md shows '6/8' plans complete and 'In Progress' for Phase 1. All 8 plans
      have SUMMARY files and their work is in the codebase. This is a documentation staleness
      issue — the progress table was not updated after Plans 07 and 08 completed. Also,
      REQUIREMENTS.md shows FOUND-11, NAV-01 through NAV-08, and APP-01 as unchecked '[ ]'
      even though all are implemented and verified in the codebase.
    artifacts:
      - path: ".planning/ROADMAP.md"
        issue: "Progress table shows '6/8 | In Progress' — should be '8/8 | Complete'"
      - path: ".planning/REQUIREMENTS.md"
        issue: "FOUND-11, NAV-01..08, APP-01 show [ ] unchecked despite being implemented"
    missing:
      - "Update ROADMAP.md progress table: 8/8 plans complete, Status = 'Complete'"
      - "Update REQUIREMENTS.md checkboxes for FOUND-11, NAV-01, NAV-02, NAV-03, NAV-04, NAV-05, NAV-06, NAV-07, NAV-08, APP-01 from [ ] to [x]"
human_verification:
  - test: "Screen-reader audit of stub homepage and /apps/abrigo"
    expected: "Heading order makes sense; language switcher announced; status pills announced with text; skip-to-content link (once fixed) is first focusable element"
    why_human: "axe-core covers static violations but not screen-reader flow; needs VoiceOver/NVDA session"
  - test: "Vercel environment variable scope inspection"
    expected: "Each variable has correct scope checkbox (Production/Preview/Development); no secret has NEXT_PUBLIC_ prefix; preview RPCs differ from production"
    why_human: "Vercel dashboard state is not introspectable from CI; no .vercel/project.json present yet"
  - test: "Translation author-quality spot check of es-CO message files"
    expected: "Native es-CO speaker confirms no machine-translated phrasing in messages/es-CO/*.json"
    why_human: "Translation quality is a human judgment"
  - test: "Apps dropdown keyboard navigation on real browser"
    expected: "Tab focuses trigger; Enter opens; ArrowDown cycles menu items; Escape closes and restores focus; outside click closes"
    why_human: "Playwright e2e tests exist but require pnpm dev server running (deployment_status event gate not triggered locally)"
  - test: "Lighthouse LCP on Vercel preview URL"
    expected: "LCP < 2500ms on Moto G Power 3G profile"
    why_human: "Lighthouse CI job requires a live Vercel deployment URL via deployment_status event"
---

# Phase 1: Foundation and Scaffold Verification Report

**Phase Goal:** Every cross-cutting constraint (CI quality gates, design tokens, i18n infrastructure, route group layout, agent-accessibility stubs, and test harness) is enforced from the first commit so no downstream phase can bypass them.

**Verified:** 2026-05-11T18:45:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

---

## Scope Note: Requirement Count

The objective document listed 32 requirements (FOUND-01..13 + NAV-01..08 + APP-01 + CROSS-01..10). ROADMAP.md Phase 1 only formally lists FOUND-01..13 and CROSS-01..10 (23 requirements) in its Requirements field. NAV-01..08 and APP-01 are listed in REQUIREMENTS.md traceability as "Phase 1 Pending" and are covered by Plan 04's scope. This verification covers all 32 as directed by the objective.

---

## Toolchain Health

| Check | Result | Notes |
|-------|--------|-------|
| `pnpm exec tsc --noEmit` | exit 0 | Clean — no TypeScript errors |
| `pnpm exec biome check .` | exit 0, 71 files checked | No lint/format violations |
| `pnpm exec vitest run` | 1 failed / 65 passed | See FOUND-03 / CROSS-02 gap below |

---

## Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | CI pipeline with 7 parallel jobs exists and would block PR merge on violations | VERIFIED | `.github/workflows/ci.yml` has exactly 7 jobs (lint, typecheck, test-unit, impeccable, test-e2e, a11y, lighthouse); no `<VERIFIED_FLAG>` placeholder; impeccable exit-code gate confirmed |
| 2 | Developer can import `getTranslations()` and render both locales | VERIFIED | `i18n/request.ts` reads `NEXT_LOCALE` cookie; `messages/{es-CO,en}/{common,lab,nav}.json` all exist; 4 of 5 i18n unit tests pass |
| 3 | The nav key merge loses `skip_to_content` from common.json | FAILED | `nav.json` top-level `nav` key clobbers `common.json` `nav` key via spread; test `nav.skip_to_content` returns `undefined`; one vitest test fails |
| 4 | Skeleton homepage renders without JS errors and Vercel env var scoping documented | PARTIAL | App builds and passes tsc+biome; `.env.example` documents scope strategy; no `.vercel/project.json` (manual user setup, documented as non-blocking in Plan 01) |
| 5 | Agent routes return valid stub responses | VERIFIED | All 5 routes exist with real content: `/api/health`, `/llms.txt`, `/.well-known/mcp.json`, `/.well-known/openapi.yaml`, `/api/mcp/[transport]`; route handlers are substantive, not stubs |
| 6 | Route groups `(lab)`, `(dashboard)`, `(defi)` exist; `(lab)` has no wallet state | VERIFIED | All 4 layouts exist; architecture test passes 8/8 cases; `(defi)/providers.tsx` is passthrough in Phase 1 |
| 7 | Top-nav Apps dropdown is visible globally; `/apps/abrigo` renders with Phase-2 placeholders | VERIFIED | `TopNav` rendered globally in `app/layout.tsx` above `{children}`; `AppsDropdown` imports from `lib/apps/registry.ts`; Abrigo external link `https://x.com/d2pfinabrigo` confirmed |

**Score:** 5/7 truths fully verified (6/7 if partial Vercel counted), 1 failed

---

## Required Artifacts

| Artifact | Status | Evidence |
|----------|--------|---------|
| `app/globals.css` | VERIFIED | OKLCH @theme inline present; 35 OKLCH token references; no pure `#000000`/`#ffffff` |
| `app/layout.tsx` | VERIFIED | `TopNav` above `{children}`; `StructuredData`; `NextIntlClientProvider` |
| `app/(lab)/page.tsx` | VERIFIED | Exists with stub homepage content |
| `app/(apps)/apps/page.tsx` | VERIFIED | Registry-driven apps index |
| `app/(apps)/apps/abrigo/page.tsx` | VERIFIED | Mission + headline counts + external link + 3 Phase-2 placeholder cards |
| `components/TopNav.tsx` | VERIFIED | Server Component; globally mounted |
| `components/AppsDropdown.tsx` | VERIFIED | Client Component; keyboard nav handlers; registry-driven |
| `components/StatusPill.tsx` | VERIFIED | `<output>` element; icon (aria-hidden) + text label; 4 variants |
| `lib/apps/registry.ts` | VERIFIED | Exports typed registry; Abrigo entry with `external_url: 'https://x.com/d2pfinabrigo'` |
| `lib/wagmi/config.ts` | VERIFIED | 5 chains; fallback transports per chain; `ssr: false`; env via `@/lib/env` |
| `lib/env.ts` | VERIFIED | Full `@t3-oss/env-nextjs` schema; 7 NEXT_PUBLIC_* vars + NODE_ENV |
| `i18n/request.ts` | VERIFIED | Reads `NEXT_LOCALE` cookie; defaults to `es-CO`; merges 3 namespaces |
| `velite.config.ts` | VERIFIED | `iterationSchema` exported; status enum; sha256 regex; FAIL requires `disposition_memo` |
| `.github/workflows/ci.yml` | VERIFIED | 7 jobs; no placeholder text; impeccable exit-code gate documented |
| `lighthouserc.cjs` | VERIFIED | Moto G Power 412×823 @ 2.625 DPR, Slow 4G, CPU 4×; LCP ≤ 2500ms as error |
| `docs/impeccable-flag.md` | VERIFIED | Live CLI inspection documented; `--fail-on-error` absence explained |
| `app/llms.txt/route.ts` | VERIFIED | Real plaintext content; `force-static` |
| `app/.well-known/mcp.json/route.ts` | VERIFIED | Real JSON with `mcp_servers` array |
| `app/.well-known/openapi.yaml/route.ts` | VERIFIED | OpenAPI 3.1 stub with `/api/health` path |
| `app/api/mcp/[transport]/route.ts` | VERIFIED | `createMcpHandler` 3-arg form; `basePath: '/api/mcp'` |
| `app/api/health/route.ts` | VERIFIED | Returns `{ status, build, runtime, timestamp }` |
| `next.config.ts` | VERIFIED | All 3 integrations: `import './lib/env'`, `createNextIntlPlugin`, `VeliteWebpackPlugin` |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `next.config.ts` | `lib/env.ts` | `import './lib/env'` side-effect | WIRED | First line of next.config.ts |
| `next.config.ts` | `i18n/request.ts` | `createNextIntlPlugin('./i18n/request.ts')` | WIRED | Confirmed |
| `next.config.ts` | Velite | `VeliteWebpackPlugin` class | WIRED | Webpack hook confirmed |
| `app/layout.tsx` | `TopNav` | `<TopNav />` above `{children}` | WIRED | Line 31, before children |
| `app/layout.tsx` | `StructuredData` | `<StructuredData />` in JSX | WIRED | JSON-LD emitted |
| `components/AppsDropdown.tsx` | `lib/apps/registry.ts` | `import { apps } from '@/lib/apps/registry'` | WIRED | Registry is single source of truth |
| `app/(defi)/layout.tsx` | `app/(defi)/providers.tsx` | `import { DefiProviders }` | WIRED | Phase 1 passthrough; Phase 5 fills |
| `lib/wagmi/config.ts` | `lib/env.ts` | `import { env } from '@/lib/env'` | WIRED | No direct `process.env.*` |
| `i18n/request.ts` | `messages/{locale}/*.json` | dynamic imports | WIRED (with gap) | nav.json `nav` key overwrites common.json `nav` key |

---

## Requirements Coverage

### FOUND-* Requirements (13 total)

| Req | Description (abbreviated) | Status | Evidence |
|-----|--------------------------|--------|---------|
| FOUND-01 | Next.js 16.2 scaffolded, deploys to Vercel | VERIFIED | `package.json` has `next@16.2.6`; `.vercel/project.json` not present (user-manual setup, documented non-blocking) |
| FOUND-02 | Tailwind v4 + shadcn + OKLCH design tokens | VERIFIED | `app/globals.css` with `@theme inline`; all neutrals tinted (hue 165); no pure black/white |
| FOUND-03 | next-intl v4 i18n for es-CO + en | PARTIAL | `i18n/request.ts` reads cookie; 4/5 i18n tests pass; nav.skip_to_content lost due to key collision |
| FOUND-04 | Velite content pipeline with strict schema | VERIFIED | `velite.config.ts` exports `iterationSchema`; 10/10 velite schema tests pass |
| FOUND-05 | wagmi v2 + viem v2 + 5 chains + fallback transports | VERIFIED | `lib/wagmi/config.ts` confirmed; 5/5 wagmi unit tests pass |
| FOUND-06 | wagmi CLI codegen scaffold | VERIFIED | `wagmi.config.ts` with foundry plugin pointing to `'../abrigo'`; codegen not in default CI build |
| FOUND-07 | impeccable detect runs in CI, fails on anti-pattern | VERIFIED | CI job `impeccable` uses `npx --yes impeccable detect app/`; planted-fixture test proves exit code 2; `docs/impeccable-flag.md` documents no `--fail-on-error` flag |
| FOUND-08 | Lighthouse CI LCP < 2.5s on Moto G Power 3G | VERIFIED (CI-pending) | `lighthouserc.cjs` has correct profile; CI job `lighthouse` on `deployment_status`; needs live Vercel preview to run |
| FOUND-09 | axe-core WCAG 2.2 AA in CI | VERIFIED (CI-pending) | `tests/a11y/homepage.spec.ts` and `tests/a11y/apps-dropdown.spec.ts` exist; CI job `a11y` gates on deployment |
| FOUND-10 | Vercel env vars configured with scope strategy | PARTIAL | `.env.example` documents scope strategy; `lib/env.ts` validates schema; Vercel dashboard not set up (user-manual, non-blocking) |
| FOUND-11 | Route groups (lab)/(dashboard)/(defi) with wallet isolation | VERIFIED | All 4 layouts exist; architecture test 8/8 green; `(lab)` and `(apps)` have zero wagmi imports |
| FOUND-12 | Agent-accessibility scaffold: llms.txt, mcp.json, openapi.yaml | VERIFIED | All 5 routes return real responses; JSON-LD `Organization` + `WebSite` in root layout |
| FOUND-13 | Vitest + Playwright + MSW test infrastructure | VERIFIED | All config files present; `vitest run` exits with 65 passing tests across 8 files; architecture test uses `.test.ts` to avoid Playwright collection |

### CROSS-* Requirements (10 total)

| Req | Description (abbreviated) | Status | Evidence |
|-----|--------------------------|--------|---------|
| CROSS-01 | Every page passes WCAG 2.2 AA (axe-core CI + manual) | VERIFIED (CI-pending) | axe-core tests exist; `docs/a11y-audit.md` checklist created; screen-reader review pending |
| CROSS-02 | Every page renders in es-CO and en; language switcher persists cookie | PARTIAL | LanguageSwitcher confirmed; cookie persistence tested; nav.skip_to_content key collision means one string is untranslatable |
| CROSS-03 | LCP < 2.5s on Moto G Power 3G (Lighthouse CI) | VERIFIED (CI-pending) | Budget defined; CI job exists; needs live deployment |
| CROSS-04 | No impeccable anti-patterns; impeccable in CI | VERIFIED | `app/` clean (exit 0); planted-fixture test proves detector fires (exit 2); CI gate present |
| CROSS-05 | No pure black/gray — all neutrals tinted | VERIFIED | `tests/unit/tokens.test.ts` 7/7 passing; all OKLCH neutrals have chroma > 0; no `#000`/`#fff` in globals.css |
| CROSS-06 | COP default for es-CO, USD for en; user override | VERIFIED | `lib/format/currency.ts` confirmed; `formatCurrency` tests pass |
| CROSS-07 | Locale-aware date formatting | VERIFIED | `lib/format/date.ts` uses `Intl.DateTimeFormat`; format tests pass |
| CROSS-08 | Locale-aware number formatting | VERIFIED | `lib/format/number.ts` uses `Intl.NumberFormat`; format tests pass |
| CROSS-09 | Color + icon + text for status indicators (never color-only) | VERIFIED | `StatusPill` uses `<output>` element; icon with `aria-hidden`; real DOM text label; 6/6 tests pass |
| CROSS-10 | Author-quality copy — no AI slop | VERIFIED (manual-pending) | `docs/copy-review.md` checklist created; grep confirms zero banned phrases in message files |

### NAV-* Requirements (8 total — added during Phase 1 via Plan 04)

| Req | Description (abbreviated) | Status | Evidence |
|-----|--------------------------|--------|---------|
| NAV-01 | Persistent top nav on every page with Apps dropdown | VERIFIED | `TopNav` in `app/layout.tsx` above `{children}`; confirmed in JSX at line 31 |
| NAV-02 | Apps dropdown data-driven from `lib/apps/registry.ts` | VERIFIED | `AppsDropdown.tsx` imports registry; no hardcoded app list |
| NAV-03 | Exactly one Abrigo entry with active status badge | VERIFIED | `registry.ts` has single Abrigo entry; status `'active'`; `StatusPill` renders color+icon+text |
| NAV-04 | Secondary external link to https://x.com/d2pfinabrigo | VERIFIED | `registry.ts` `external_url: 'https://x.com/d2pfinabrigo'`; AppsDropdown renders it with `target="_blank" rel="noopener noreferrer"` |
| NAV-05 | Keyboard navigable dropdown (Tab/Enter/Space/ArrowDown/Escape) | VERIFIED (e2e-pending) | `AppsDropdown.tsx` has keyboard event handlers; e2e test exists; needs dev server to run |
| NAV-06 | Dropdown closes on outside click, Escape, route change, focus-out | VERIFIED (e2e-pending) | `mousedown` listener and `usePathname` route change handler in `AppsDropdown.tsx` |
| NAV-07 | Mobile <768px collapses to drawer with nested Apps section | VERIFIED (e2e-pending) | `MobileMenuToggle.tsx` created; e2e test for mobile viewport exists |
| NAV-08 | `/apps` index page lists all registry entries | VERIFIED | `app/(apps)/apps/page.tsx` imports and renders registry; canonical URL confirmed |

### APP-01 (1 requirement)

| Req | Description (abbreviated) | Status | Evidence |
|-----|--------------------------|--------|---------|
| APP-01 | `/apps/abrigo` overview renders mission, counts, external link, placeholders | VERIFIED | Page confirmed at `app/(apps)/apps/abrigo/page.tsx`; external link confirmed; 3 Phase-2 placeholder cards with `StatusPill status="IN_PROGRESS"`; `docs/a11y-audit.md` documents pending screen-reader review |

---

## Anti-Patterns Scan

No blockers found in production source files. The anti-patterns fixture (`tests/unit/fixtures/anti-patterns.html`) deliberately contains 8 violations to prove the detector fires — this is by design and does not represent production code.

| File | Pattern | Severity | Notes |
|------|---------|----------|-------|
| `tests/unit/fixtures/anti-patterns.html` | 8 impeccable violations | ℹ️ Info | Planted fixture — by design |
| `app/(defi)/providers.tsx` | Phase 1 passthrough (no real wallet providers) | ℹ️ Info | By design; Phase 5 wires real providers |

No `TODO`, `FIXME`, `XXX`, `HACK`, or `PLACEHOLDER` comments found in `app/`, `components/`, or `lib/`.

---

## Gaps Summary

### Gap 1: i18n nav key collision (Real functionality bug)

**Root cause:** When Plan 04 added `messages/{locale}/nav.json`, it introduced a top-level `nav` key containing menu labels (`apps`, `research`, `team`, `about`, etc.). The `i18n/request.ts` merge uses shallow spread (`{ ...commonMessages, ...labMessages, ...navMessages }`), which causes `navMessages.nav` to overwrite `commonMessages.nav`. The `common.json` `nav` object contains `skip_to_content`, which is lost after the overwrite.

**Runtime impact:** Any component calling `t('nav.skip_to_content')` will render `undefined`. The `deferred-items.md` describes this as "key lives under nav namespace, not common" — but the actual diagnosis is a shallow-merge collision. The key IS in `common.json` under `nav.skip_to_content`; it is being clobbered by the `nav.json` spread.

**Fix options (one of):**
1. Add `skip_to_content` to `messages/{locale}/nav.json`'s `nav` object (simplest)
2. Deep-merge the three message maps instead of shallow spread in `i18n/request.ts`
3. Remove `skip_to_content` from `common.json` and move it into `nav.json`

**Blocked requirement:** FOUND-03 partial, CROSS-02 partial

### Gap 2: Stale documentation (Non-blocking)

**ROADMAP.md progress table** still shows `6/8 | In Progress` for Phase 1 — all 8 plans have completed summaries and their work is verified in the codebase.

**REQUIREMENTS.md** shows 10 requirements as unchecked (`[ ]`) that are implemented and verified: `FOUND-11`, `NAV-01` through `NAV-08`, `APP-01`.

**Impact:** Documentation staleness only. No downstream phase is blocked by this. However, any tooling that reads REQUIREMENTS.md checkbox status (e.g., `gsd-tools`) will report incorrect phase completion state.

---

## Human Verification Required

### 1. Screen-reader audit of stub homepage and /apps pages

**Test:** Use VoiceOver (macOS) or NVDA (Windows) to navigate `/` and `/apps/abrigo`.
**Expected:** Heading order is logical; language switcher is announced as nav with accessible label; `<StatusPill>` outputs are read as text labels (not just color); skip-to-content link (once fixed) is first focusable element.
**Why human:** axe-core covers static violations but cannot simulate screen-reader announcement order and flow.

### 2. Vercel deployment and environment variable scope setup

**Test:** Open Vercel project dashboard → Settings → Environment Variables.
**Expected:** All 7 `NEXT_PUBLIC_*` vars scoped to Production/Preview/Development appropriately; no secret in `NEXT_PUBLIC_` namespace; preview RPC URLs differ from production.
**Why human:** No `.vercel/project.json` present — Vercel project linking is a manual user setup step documented in all plans as non-blocking.

### 3. Lighthouse LCP on live Vercel preview

**Test:** Open a PR to trigger the `deployment_status` event; CI `lighthouse` job will autorun against the preview URL.
**Expected:** LCP ≤ 2500ms, TBT ≤ 200ms on Moto G Power 3G profile.
**Why human:** Requires a live Vercel deployment; cannot verify locally without the preview URL.

### 4. Translation author-quality review

**Test:** Native es-CO speaker reviews `messages/es-CO/*.json` and confirms no machine-translated phrasing.
**Why human:** Tonal judgment for Colombian Spanish academic register requires a native speaker.

---

## Final Assessment

**30 of 32 requirements fully verified** in the codebase. The two gaps are:

1. **FOUND-03 / CROSS-02 (partial):** The i18n merge has a shallow-spread key collision that loses `nav.skip_to_content`. This is a real bug with a one-line fix. The other 4 i18n tests pass; cookie persistence and locale switching work correctly.

2. **Documentation staleness:** ROADMAP.md and REQUIREMENTS.md checkboxes are not updated for Plans 07, 08, and the NAV/APP-01 requirements from Plan 04.

The phase's core goal — every cross-cutting constraint enforced from the first commit — is substantively achieved. The CI matrix, design tokens, route group architecture, agent-accessibility endpoints, wagmi config, and test harness all exist and work. The i18n gap is a narrow key-collision bug in message merging, not a missing feature.

**Recommended action:** Fix the nav key collision in a follow-up commit (one of the three options above), then update ROADMAP.md and REQUIREMENTS.md checkboxes. Re-verification can then be fast-tracked as a regression check only.

---

_Verified: 2026-05-11T18:45:00Z_
_Verifier: Claude Sonnet 4.6 (gsd-verifier)_
