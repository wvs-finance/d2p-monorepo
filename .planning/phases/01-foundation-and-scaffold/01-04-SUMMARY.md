# Plan 01-04 Summary

**Status:** Complete
**Plan:** 01-04 (Route Groups + Stub Homepage + Apps Dropdown + /apps/abrigo)
**Wave:** 3
**Tasks:** 4/4
**Agent:** Frontend Developer (bound via plan frontmatter)
**Duration:** ~30 minutes (initial run killed mid-Task-4; resumed by orchestrator with commit + summary)

## Commits

| Hash | Subject |
|------|---------|
| `a77f59e` | feat(01-04): structuredData component + root layout with theme provider |
| `6100557` | feat(01-04): three route group layouts + wallet isolation architecture test |
| `014253e` | feat(01-04): stub homepage + IterationCountTile + status token contrast fix |
| `393622d` | feat(01-04): apps registry + AppsDropdown + TopNav + /apps + /apps/abrigo overview |

## What Was Delivered

### Task 1 — Root layout + StructuredData
- `app/layout.tsx` extended with `ThemeProvider` + `NextIntlClientProvider` + `<StructuredData />` JSON-LD block
- `components/StructuredData.tsx` emits two `<script type="application/ld+json">` blocks: `Organization` (d2-π) and `WebSite` (sitelink search box ready)
- Root layout still has NO wallet provider (architecture invariant)

### Task 2 — Three route groups + architecture isolation test
- `app/(lab)/layout.tsx` — RSC layout, header with `<LanguageSwitcher>` and footer
- `app/(dashboard)/layout.tsx` — RSC shell, placeholder for TanStack Query provider (Phase 3)
- `app/(defi)/layout.tsx` — Server Component wrapping client `<Providers>` shell from Plan 01-05 (passthrough in Phase 1; Phase 5 wires real wallet UI)
- `tests/architecture/no-wallet-in-lab.test.ts` filled with real fs/grep assertions; passes with 8 cases verifying both `(lab)` and `(apps)` are wallet-free

### Task 3 — Stub homepage
- `app/(lab)/page.tsx` renders wordmark "WVS Finance" + tagline (cookie-resolved locale) + four `<IterationCountTile>` cards using `<StatusPill>` from Plan 02
- Hardcoded counts: 3 PASS / 2 FAIL / 1 PARKED / 1 IN_PROGRESS (sourced from PROJECT.md empirical state)
- Authored both locales (es-CO + en); zero impeccable anti-patterns; status token contrast fix applied during this task to satisfy WCAG AA against the cream canvas

### Task 4 — Apps registry + dropdown + TopNav + Apps pages
- `lib/apps/registry.ts` typed registry; one entry today: `{ slug: 'abrigo', name: 'Abrigo', description_key: 'apps.abrigo.description', status: 'active', internal_path: '/apps/abrigo', external_url: 'https://x.com/d2pfinabrigo' }`
- `components/AppsDropdown.tsx` — Client Component (`'use client'`) reading from registry; full keyboard navigation (Tab/Enter/Space opens; ArrowDown/Up cycles `<li role="menuitem">`; Escape closes + restores focus; outside-click closes via mousedown listener; closes on route change via `usePathname`)
- `components/TopNav.tsx` — Server Component rendered globally from `app/layout.tsx` above `{children}`; wordmark left, AppsDropdown + Research/Team/About links + LanguageSwitcher on desktop; collapses to drawer < 768px via `components/MobileMenuToggle.tsx`
- `components/MobileMenuToggle.tsx` — Client Component for hamburger toggle and drawer
- `app/(apps)/layout.tsx` + `app/(apps)/apps/page.tsx` (canonical agent-scrapeable apps index) + `app/(apps)/apps/abrigo/page.tsx` (mission + headline counts + prominent external @d2pfinabrigo link + 3 non-link Phase-2 placeholder cards using `<StatusPill status="IN_PROGRESS">`)
- `messages/{es-CO,en}/nav.json` authored side-by-side with `nav.*` and `apps.*` namespaces (status labels, Abrigo description, menu/external/keyboard labels)
- `tests/e2e/apps-dropdown.spec.ts` — 6 Playwright e2e tests (open + lists Abrigo + primary navigates + external link rel/target + keyboard navigable + outside-click closes + mobile drawer)
- `tests/a11y/apps-dropdown.spec.ts` — 4 axe-core scans (closed dropdown, open dropdown, `/apps`, `/apps/abrigo`)
- `i18n/request.ts` extended to merge `nav.json` into the message map

## Requirements Coverage

Every REQ-ID in the plan's frontmatter `requirements` field is satisfied:

| REQ-ID | Where |
|--------|-------|
| FOUND-11 | Three route groups present; architecture test enforces `(lab)` + `(apps)` wallet-free |
| NAV-01 | `<TopNav>` rendered globally |
| NAV-02 | Registry as single source of truth; both AppsDropdown + `/apps` page import from it |
| NAV-03 | Exactly one Abrigo entry, status `active`, status badge color+icon+text |
| NAV-04 | Secondary external link with `target="_blank" rel="noopener noreferrer"` to https://x.com/d2pfinabrigo |
| NAV-05 | Keyboard navigation handlers + ARIA roles + announcements |
| NAV-06 | Outside-click + Escape + route-change + focus-out closes; no focus trap |
| NAV-07 | Mobile <768px drawer via MobileMenuToggle |
| NAV-08 | `/apps` index renders registry entries; canonical URL |
| APP-01 | `/apps/abrigo` overview with mission, counts, external link, 3 non-link Phase-2 placeholders |

## Verification

- `pnpm exec tsc --noEmit` → exit 0
- `pnpm exec biome check .` → 71 files, no errors
- `pnpm vitest run tests/architecture/no-wallet-in-lab.test.ts` → 8 passing
- Playwright e2e + a11y tests: REQUIRE `pnpm dev` running; deferred to Wave 4 CI workflow execution

## Deviations

1. **Orchestrator commit recovery** — The original Wave 3 executor was killed mid-Task-4 after writing all Task 4 files but before committing. Orchestrator verified the staged work compiles + tests pass, then committed as `393622d` and wrote this SUMMARY.md. All work matches the plan; no scope deviations.
2. **Status pill contrast fix in Task 3** — Required adjusting the OKLCH lightness on `--color-status-*` tokens from Plan 02's initial values to satisfy WCAG AA against the cream canvas. Tracked separately in the contrast assertion in `tests/unit/tokens.test.ts`; no breaking change to Plan 02's token schema.

## What This Enables

- The Vercel preview URL now renders a real homepage with the umbrella nav. Visual feedback achievable in the browser per the user preference saved in `memory/feedback_visual_first.md`.
- Wave 4 (Plan 01-08) can now run the CI matrix against actual page content: impeccable detector on `app/`, Lighthouse on `/`, axe-core on the rendered homepage and Apps surface.
- The locked URL scheme `/apps/<family>/...` is established. Adding future hedge-instrument apps is a one-line change to `lib/apps/registry.ts` + a new route group.

## Self-Check: PASSED
