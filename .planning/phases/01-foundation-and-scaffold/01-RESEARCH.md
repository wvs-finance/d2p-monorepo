# Phase 1: Foundation and Scaffold — Research

**Researched:** 2026-05-11
**Domain:** Next.js 16.2 App Router project scaffold — CI gates, design tokens, i18n, route groups, agent stubs, wagmi config, Velite schema, test harness
**Confidence:** HIGH (core framework, shadcn/Tailwind integration, wagmi/viem, next-intl, Velite Next.js integration) / MEDIUM (Lighthouse device profile configuration, mcp-handler basePath quirk) / LOW (impeccable `--fail-on-error` flag exact name)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Package manager / repo layout:**
- pnpm, single app, no monorepo. Node 22 LTS via `.nvmrc`. All scripts via `pnpm <task>`.

**Lint / format / type-check:**
- Biome 1.9+ for lint + format. `tsc --noEmit` in CI as separate job. Both on pre-commit via lefthook.
- TypeScript `strict: true`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`.

**Design tokens:**
- Authored in `app/globals.css` via Tailwind v4 `@theme`. No JSON/codegen.
- Semantic names: `--color-bg-canvas`, `--color-text-primary`, `--color-accent-default`, `--color-status-pass`, `--color-status-fail`, `--color-status-parked`, `--color-status-in-progress`.
- All neutrals tinted toward lab accent — never pure black or pure gray.
- Light mode primary; dark mode parallel token set.

**i18n key strategy:**
- next-intl v4, locale files split by route segment (`messages/es-CO/lab.json`, etc.).
- Both `es-CO` and `en` authored side-by-side from day one.
- Cookie-based locale persistence (`NEXT_LOCALE`), not URL prefix. `localePrefix: 'never'`.
- `Intl.*` wrappers in `lib/format/` — never raw `Date.toLocaleString()`.

**Route group layout:**
- Three groups: `(lab)` (RSC, no wallet), `(dashboard)` (RSC + client islands), `(defi)` (RainbowKitProvider + WagmiProvider).
- Shared root `app/layout.tsx`: next-intl provider, theme provider, base HTML — no wallet provider.
- Architecture test in `tests/architecture/no-wallet-in-lab.spec.ts` enforces this.

**Stack versions (locked):**
- next@^16.2.6, react@^19, react-dom@^19, typescript@^5.8
- tailwindcss@^4.3, @tailwindcss/postcss@^4, tw-animate-css@^1.4
- shadcn/ui (Feb 2026, Tailwind v4 + React 19 compatible)
- wagmi@^2.14 (stay on v2 — wagmi v3 at 3.6.x exists but RainbowKit v2 compatibility unconfirmed at 2.14 level)
- viem@^2.21, @tanstack/react-query@^5
- @rainbow-me/rainbowkit@^2.2.11
- next-intl@^4.11
- velite@0.3.1+
- @vercel/mcp-handler (package name: `mcp-handler`) + @modelcontextprotocol/sdk@^1.26
- vitest@^4.1, @testing-library/react@^16, playwright@^1.59, msw@^2.14
- @axe-core/playwright@^4.11
- biome@^1.9 (use ^1.x — "biome" not "@biomejs/biome" for install; CLI is `biome`)
- lefthook@^2.1
- @lhci/cli@^0.15, @wagmi/cli@^2.10
- @t3-oss/env-nextjs@^0.13, zod@^3

**CI architecture:**
- GitHub Actions `.github/workflows/ci.yml` with parallel jobs: `lint`, `typecheck`, `test:unit`, `test:e2e`, `a11y`, `lighthouse`, `impeccable`.
- `test:e2e`, `a11y`, `lighthouse` wait for Vercel preview deploy (triggered on `deployment_status` event).
- All jobs required for merge — no warm-up period.

**Env var conventions:**
- `NEXT_PUBLIC_*` only for safe-to-leak values (chain IDs, public RPC URLs, WalletConnect project ID).
- Env schema validated via `@t3-oss/env-nextjs` (Zod, build-fails-on-missing).
- `.env.example` committed; `.env.local` git-ignored.

**Wallet + chains config:**
- Chains: `celo` (primary), `mainnet`, `base`, `arbitrum`, `optimism`.
- Multi-RPC fallback transport: `fallback([http(primary), http(secondary)])`.
- `@wagmi/cli` Foundry plugin points to `../abrigo/` artifacts (placeholder path for Phase 1).
- wagmi config NOT imported from any `(lab)` page.

**Velite schema (locked fields):**
- `status`: z.enum(['PASS', 'FAIL', 'PARKED', 'IN_PROGRESS'])
- `slug`: z.string().regex(/^[a-z0-9-]+$/)
- `version`: z.number().int().positive()
- `title_es`, `title_en`: z.string()
- `notebook_url`: z.string().url()
- `dataset_ref`: z.string()
- `analysis_date`: z.coerce.date()
- `replication_hash`: z.string().regex(/^[a-f0-9]{64}$/)
- Optional numerics: `beta`, `ci_lower`, `ci_upper`, `p_value`, `sample_size`
- `disposition_memo`: z.string().optional() — required when status === 'FAIL' via `.refine()`
- Content path: `content/iterations/<slug>/v<n>.mdx`

**Agent-accessibility stubs (all required in Phase 1):**
- `/llms.txt` via `app/llms.txt/route.ts` (plaintext, not static file)
- `/.well-known/mcp.json` via `app/.well-known/mcp.json/route.ts`
- `/.well-known/openapi.yaml` via `app/.well-known/openapi.yaml/route.ts`
- JSON-LD `WebSite` + `Organization` in root layout via `<StructuredData />` component.

**Test harness templates (one per surface):**
- `tests/e2e/homepage.spec.ts` — Playwright
- `tests/unit/format.test.ts` — Vitest
- `tests/api/health.test.ts` — API route
- `tests/architecture/no-wallet-in-lab.spec.ts` — bundle assertion
- `tests/a11y/homepage.spec.ts` — axe-core scan

**Pre-commit / Git hygiene:**
- lefthook pre-commit: `biome check --staged`, `tsc --noEmit` (incremental), Velite validation if MDX touched.
- commitlint v21 for Conventional Commits in `commit-msg` hook.
- `.editorconfig`, `.gitattributes` committed.

**Stub homepage:**
- Wordmark "WVS Finance", tagline in both locales, hardcoded iteration counts (3 PASS, 2 FAIL, 1 PARKED, 1 IN_PROGRESS), language switcher.
- Zero impeccable violations — no Inter, no gradients, no nested cards, no eyebrow chip, no oversized italic serif.

### Claude's Discretion
- Exact file/folder structure within `lib/` (names are suggestions).
- Specific Biome rule customizations beyond recommended preset.
- Exact lefthook.yml task ordering.
- Whether to start with `pnpm create next-app` and patch, or assemble from scratch.
- Stub homepage tagline copy (must be authored, both locales).
- Theme provider choice (`next-themes` is fine).
- Whether to wire `@t3-oss/env-nextjs` in Phase 1 or hand-roll Zod env parsing.

### Deferred Ideas (OUT OF SCOPE)
- Pagefind search index
- Sentry/Bugsnag observability
- PostHog/Plausible analytics
- Storybook / Chromatic
- Service worker / PWA install
- Real wagmi config for abrigo Foundry artifacts (placeholder only in Phase 1)
- Multi-region Vercel deployment
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FOUND-01 | Next.js 16.2 App Router scaffolded with TypeScript, deploys to Vercel preview-per-PR | pnpm create next-app@latest — exact flags documented below; Vercel project link is a manual prerequisite |
| FOUND-02 | Tailwind v4 + shadcn/ui (Feb 2026) with OKLCH design tokens in globals.css via @theme | shadcn/ui Tailwind v4 docs confirmed; @theme inline pattern + :root/:dark variables documented below |
| FOUND-03 | next-intl v4 i18n for es-CO + en, resolved at RSC render time | getRequestConfig + cookie-read pattern confirmed; localePrefix: 'never' for no URL prefix |
| FOUND-04 | Velite content pipeline with typed iteration schema | velite.config.ts pattern + Next.js integration via direct config method confirmed |
| FOUND-05 | wagmi v2 + viem v2 + @tanstack/react-query v5 with Celo + multi-RPC fallback | fallback([http(), http()]) transport pattern confirmed; Celo in viem/chains confirmed |
| FOUND-06 | @wagmi/cli codegen from ../abrigo/ Foundry artifacts | foundry plugin project: '../abrigo' confirmed; placeholder path for Phase 1 |
| FOUND-07 | impeccable detect --fail-on-error in CI on every PR | CLI npx invocation confirmed; exact flag name LOW confidence — may be --fail-on-issues; see Open Questions |
| FOUND-08 | Lighthouse CI LCP < 2.5s on Moto G Power 3G profile | @lhci/cli 0.15.1 confirmed; device profile config via formFactor + screenEmulation + throttling documented |
| FOUND-09 | axe-core WCAG 2.2 AA CI enforcement | @axe-core/playwright 4.11.3 confirmed; checkA11y pattern documented |
| FOUND-10 | Vercel env vars configured for Production/Preview/Development scopes | @t3-oss/env-nextjs 0.13.11 pattern documented; .env.example convention |
| FOUND-11 | Route group layout — (lab), (dashboard), (defi) — lab pages never hydrate wallet | Architecture pattern confirmed; bundle assertion test template documented |
| FOUND-12 | Agent-accessibility scaffold: /llms.txt, /.well-known/mcp.json, /.well-known/openapi.yaml, JSON-LD | Route handler patterns confirmed; JSON-LD via dangerouslySetInnerHTML + < escaping |
| FOUND-13 | Vitest + Playwright + MSW test infrastructure with anvil fork harness (scaffolded) | vitest 4.1.6, playwright 1.59.1, msw 2.14.6 confirmed; test structure documented |
| CROSS-01 | Every page passes WCAG 2.2 AA (axe-core CI) | axe-core + playwright integration pattern confirmed |
| CROSS-02 | Every page renders es-CO and en; language switcher keyboard-accessible, cookie-persisted | next-intl v4 localePrefix: 'never' + cookie approach confirmed |
| CROSS-03 | Every page LCP < 2.5s on Moto G Power 3G in Lighthouse CI | lhci config pattern documented; Moto G Power screen dimensions included |
| CROSS-04 | No nested cards, no purple gradients, no oversized italic serif, no eyebrow chip — impeccable in CI | impeccable CLI invocation confirmed |
| CROSS-05 | No pure black or pure gray — all neutrals tinted toward lab accent | Design token naming convention documented; enforced at globals.css level |
| CROSS-06 | Currency values in COP by default (es-CO), USD by default (en) | Intl.NumberFormat wrapper pattern documented in lib/format/ |
| CROSS-07 | Dates use locale-aware formatting | Intl.DateTimeFormat wrapper pattern documented |
| CROSS-08 | All numeric formatting locale-aware via Intl.NumberFormat | Wrapper utility pattern confirmed; unit test template covers this |
| CROSS-09 | Color + icon + text (never color-only) for charts, status, form errors | Design-token-level enforcement; StatusPill component pattern documented |
| CROSS-10 | All copy authored, not generated — no AI-slop phrasing | Stub homepage copy must be authored in both locales; impeccable detects slop |
</phase_requirements>

---

## Summary

Phase 1 wires every cross-cutting constraint into the project skeleton before any feature phase begins. The research confirms the entire locked stack is compatible at the verified versions. The three most technically complex integrations — Tailwind v4 + shadcn/ui, next-intl v4 cookie-only locale, and @vercel/mcp-handler stub — each have confirmed working patterns documented below.

The most significant finding is that `shadcn/ui` in Tailwind v4 mode uses an `@theme inline` block in globals.css that references CSS custom properties defined in `:root` and `.dark` — this is different from the v3 pattern where variables lived inside `@layer base`. Getting this right on the first commit prevents token-naming rework in every downstream phase.

The next-intl v4 "without routing" path (`localePrefix: 'never'` + cookie read in `i18n/request.ts`) is confirmed and avoids URL restructuring, but it requires a `[locale]` folder wrapping all pages — or the alternative "without i18n routing" setup where locale is passed to the provider without URL segments. The planner must choose one of these two sub-approaches (see Architecture Patterns below).

**Primary recommendation:** Start with `pnpm create next-app@latest` bootstrapped project, then install the full locked stack in a single wave, configure Biome + lefthook before any source file is written, wire design tokens and i18n next, and validate CI gates from PR #1.

---

## Standard Stack

### Core (verified against npm registry 2026-05-11)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 16.2.6 | App Router framework | Only framework with PPR stable + MCP route hosting + RSC on Vercel |
| react / react-dom | 19.x (bundled) | UI runtime | Locked by wagmi/RainbowKit React-only DeFi ecosystem |
| typescript | ^5.8 | Type safety | ABIType inference requires current TS; strict mode from day one |
| tailwindcss | 4.3.0 | Utility CSS + design tokens | CSS-first @theme, zero JS runtime, OKLCH color system |
| @tailwindcss/postcss | ^4 | PostCSS integration | Required for Tailwind v4 PostCSS pipeline |
| tw-animate-css | 1.4.0 | CSS animations | Replaces deprecated `tailwindcss-animate` in Tailwind v4 shadcn setup |
| biome | 1.9.x | Lint + format (single tool) | 25x faster than ESLint+Prettier; react-hooks rules included since 1.9+ |
| lefthook | 2.1.6 | Git hooks manager | Faster than husky; parallel execution; cross-platform binary |
| vitest | 4.1.6 | Unit tests | ESM-native, shares tsconfig, no build step |
| playwright | 1.59.1 | E2E + a11y tests | Page routing, RPC mocking, axe integration |
| msw | 2.14.6 | API mocking | Browser + Node handler; same mock for Vitest and Playwright |
| @axe-core/playwright | 4.11.3 | WCAG 2.2 AA automation | Deque axe-core integrated with Playwright page fixture |
| @lhci/cli | 0.15.1 | Lighthouse CI | Uses Lighthouse 12.6.1; lhci autorun with budget assertions |
| next-intl | 4.11.2 | i18n for App Router | First-class RSC server API; zero hydration cost for translations |
| velite | 0.3.1 | Typed MDX content | Zod schema at build time; spiritual successor to archived Contentlayer |
| wagmi | ^2.14 (stay on v2) | EVM React hooks | TanStack Query backed; multichain; EIP-6963; RainbowKit v2 peer |
| viem | ^2.21 | EVM client | ABIType inference; multicall; Celo in chain registry |
| @tanstack/react-query | ^5 | Async state | Required wagmi peer; caching/refetch for RPC calls |
| @rainbow-me/rainbowkit | 2.2.11 | Wallet connection UI | Best-in-class EVM wallet UX; mobile-first; Celo chain support |
| @wagmi/cli | 2.10.0 | ABI → TypeScript codegen | Foundry plugin reads `../abrigo/out/`; output to `lib/contracts/generated.ts` |
| mcp-handler | 1.1.0 | MCP server in Next.js | Vercel's adapter; `[transport]` dynamic route |
| @modelcontextprotocol/sdk | ^1.26 | MCP SDK | mcp-handler peer; versions < 1.26 have a security vulnerability |
| @t3-oss/env-nextjs | 0.13.11 | Env var validation | Zod-validated build-time env; fails build on missing required vars |
| zod | ^3 | Schema validation | Used by env-nextjs, Velite, wagmi, mcp-handler |
| schema-dts | 2.0.0 | TypeScript types for JSON-LD | Typed `Organization`, `WebSite`, `Dataset` schema authoring |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| commitlint | 21.0.0 | Conventional Commits enforcement | commit-msg hook via lefthook |
| @testing-library/react | 16.3.2 | React component testing utilities | Use with Vitest for component-level unit tests |
| @wagmi/test | ^2 | wagmi hook test utilities | Mock connectors in Vitest; no browser needed |
| next-themes | ^0.4 | Theme provider (light/dark) | Wrap in root layout; `data-theme` attribute; pairs with @theme tokens |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| mcp-handler 1.1.0 | @vercel/mcp-handler | The package is simply named `mcp-handler` — not scoped |
| tw-animate-css | tailwindcss-animate | tailwindcss-animate is deprecated for Tailwind v4; use tw-animate-css |
| biome@^1.9 (from `biome` package) | @biomejs/biome | Both are valid; `biome` is the standalone binary; both work the same way |
| next-intl "without routing" | next-intl with [locale] segments | Cookie-only is simpler URL structure but requires explicit locale in getRequestConfig |

**Installation:**
```bash
# Bootstrap
pnpm create next-app@latest . --typescript --tailwind --app --turbopack --import-alias "@/*"

# Wallet stack
pnpm add wagmi@^2 viem@^2 @tanstack/react-query@^5 @rainbow-me/rainbowkit@^2

# MCP (Phase 1 install; route scaffolded in Phase 4)
pnpm add mcp-handler @modelcontextprotocol/sdk@^1.26

# Content pipeline
pnpm add velite

# i18n
pnpm add next-intl

# Env validation
pnpm add @t3-oss/env-nextjs zod

# JSON-LD types
pnpm add schema-dts

# Theme provider
pnpm add next-themes

# Tailwind v4 animation
pnpm add tw-animate-css

# Dev dependencies
pnpm add -D @wagmi/cli biome lefthook @lhci/cli vitest @vitejs/plugin-react \
  playwright msw @axe-core/playwright @testing-library/react @wagmi/test \
  commitlint @commitlint/config-conventional

# shadcn CLI (inlines components, not a dependency)
pnpm dlx shadcn@latest init
```

**Version verification (confirmed 2026-05-11):**
```
next:                16.2.6
tailwindcss:         4.3.0
tw-animate-css:      1.4.0
velite:              0.3.1
next-intl:           4.11.2
@wagmi/cli:          2.10.0
wagmi:               3.6.13 (stay on v2; v3 not yet confirmed with RainbowKit v2)
@rainbow-me/rainbowkit: 2.2.11
mcp-handler:         1.1.0
@t3-oss/env-nextjs:  0.13.11
lefthook:            2.1.6
biome:               0.3.3 (verify: npm show biome version)
@lhci/cli:           0.15.1
@axe-core/playwright: 4.11.3
vitest:              4.1.6
playwright:          1.59.1
msw:                 2.14.6
commitlint:          21.0.0
schema-dts:          2.0.0
```

---

## Architecture Patterns

### Recommended Project Structure

```
frontend/
├── app/
│   ├── (lab)/
│   │   ├── layout.tsx          # Lab layout — next-intl NextIntlClientProvider if needed
│   │   └── page.tsx            # Stub homepage
│   ├── (dashboard)/
│   │   └── layout.tsx          # Dashboard layout — TanStack Query provider
│   ├── (defi)/
│   │   └── layout.tsx          # DeFi layout — WagmiProvider + RainbowKitProvider
│   ├── api/
│   │   ├── health/route.ts     # GET /api/health — Phase 1 alive endpoint
│   │   └── mcp/
│   │       └── [transport]/route.ts  # MCP stub — Phase 1 installs dep, Phase 4 fills tools
│   ├── .well-known/
│   │   ├── mcp.json/route.ts   # MCP discovery descriptor
│   │   └── openapi.yaml/route.ts  # OpenAPI 3.1 stub
│   ├── llms.txt/
│   │   └── route.ts            # /llms.txt agent index
│   ├── globals.css             # Tailwind @theme + design tokens
│   └── layout.tsx              # Root layout — intl provider, theme provider, JSON-LD
├── components/
│   └── ui/                     # shadcn/ui inlined primitives
├── lib/
│   ├── wagmi/
│   │   └── config.ts           # createConfig with chains + fallback transports
│   ├── format/
│   │   ├── currency.ts         # Intl.NumberFormat wrappers for COP / USD
│   │   ├── date.ts             # Intl.DateTimeFormat wrappers
│   │   └── number.ts           # Intl.NumberFormat for locale-aware numerics
│   └── contracts/
│       ├── abis/               # Placeholder ABI JSON files
│       └── generated.ts        # @wagmi/cli output (initially empty / placeholder)
├── messages/
│   ├── es-CO/
│   │   ├── lab.json            # Lab-section translations
│   │   └── common.json         # Shared strings (nav, footer, lang switcher)
│   └── en/
│       ├── lab.json
│       └── common.json
├── content/
│   └── iterations/             # MDX iteration write-ups (sourced from ../abrigo/ in Phase 2)
├── velite.config.ts            # Velite schema definitions (root of project)
├── i18n/
│   └── request.ts              # getRequestConfig — reads NEXT_LOCALE cookie
├── tests/
│   ├── e2e/homepage.spec.ts
│   ├── unit/format.test.ts
│   ├── api/health.test.ts
│   ├── architecture/no-wallet-in-lab.spec.ts
│   └── a11y/homepage.spec.ts
├── src/env.ts                  # @t3-oss/env-nextjs Zod schema
├── wagmi.config.ts             # @wagmi/cli config
├── .github/workflows/ci.yml
├── lefthook.yml
├── biome.json
├── lighthouserc.js
├── .nvmrc                      # 22
├── .editorconfig
├── .gitattributes
└── .env.example
```

### Pattern 1: Tailwind v4 + shadcn/ui Design Token Setup

**What:** Tailwind v4 uses `@theme` in CSS instead of a JS config file. shadcn/ui's Feb 2026 refresh uses `@theme inline` to bridge the CSS custom properties to Tailwind utility classes.

**When to use:** All design token authoring goes here. No component-level color literals.

**Example:**
```css
/* app/globals.css */
@import "tailwindcss";
@import "tw-animate-css";

/* Step 1: Define semantic CSS variables for light + dark modes */
:root {
  --bg-canvas:        oklch(0.98 0.005 250);
  --text-primary:     oklch(0.15 0.015 250);
  --accent-default:   oklch(0.55 0.18 165);   /* lab accent — teal-green, not violet */
  --status-pass:      oklch(0.55 0.17 145);
  --status-fail:      oklch(0.52 0.19 30);
  --status-parked:    oklch(0.60 0.12 60);
  --status-in-progress: oklch(0.55 0.16 230);
}

.dark {
  --bg-canvas:        oklch(0.10 0.015 250);
  --text-primary:     oklch(0.92 0.010 250);
  /* same semantic names, different OKLCH values */
}

/* Step 2: Expose to Tailwind utilities via @theme inline */
@theme inline {
  --color-bg-canvas:        var(--bg-canvas);
  --color-text-primary:     var(--text-primary);
  --color-accent-default:   var(--accent-default);
  --color-status-pass:      var(--status-pass);
  --color-status-fail:      var(--status-fail);
  --color-status-parked:    var(--status-parked);
  --color-status-in-progress: var(--status-in-progress);
}
```

After this setup, `bg-bg-canvas`, `text-text-primary`, `text-status-pass` etc. become valid Tailwind utility classes.

**Key difference from v3:** Variables are defined outside `@layer base`. The `@theme inline` block replaces the v3 `tailwind.config.js` `extend.colors` object. The `inline` keyword means Tailwind uses the CSS variable at runtime rather than resolving its value at build time — required for dark mode toggling to work.

### Pattern 2: next-intl v4 — Cookie-Only Locale (Without URL Routing)

**What:** Use next-intl's "without i18n routing" mode. Locale lives in a cookie (`NEXT_LOCALE`); no `[locale]` URL segment. Page structure is flat — no `app/[locale]/` directory. Locale is read in `i18n/request.ts` via Next.js cookies API.

**When to use:** This is the locked decision. Cookie-only, no URL prefix.

**Example:**
```typescript
// i18n/request.ts
import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'

export default getRequestConfig(async () => {
  const cookieStore = await cookies()
  const locale = cookieStore.get('NEXT_LOCALE')?.value ?? 'es-CO'

  return {
    locale,
    messages: (await import(`../messages/${locale}/common.json`)).default,
  }
})
```

```typescript
// next.config.ts — required plugin registration
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

export default withNextIntl(nextConfig)
```

```typescript
// RSC page usage
import { getTranslations } from 'next-intl/server'

export default async function Page() {
  const t = await getTranslations('lab')
  return <h1>{t('hero.title')}</h1>
}
```

**Important:** In "without routing" mode, you do NOT need `[locale]` in directory names. The `next-intl/plugin` handles the config registration. Message files are loaded per-request based on the cookie. This requires `i18n/request.ts` to be the config entry point and registered via `next.config.ts`.

**Language switcher:** A server action or client component sets the `NEXT_LOCALE` cookie to the new locale value, then reloads. Use `res.cookie('NEXT_LOCALE', locale, { maxAge: 365 * 24 * 60 * 60 })` pattern.

### Pattern 3: Velite Content Pipeline

**What:** Velite validates MDX frontmatter against a Zod schema at build time. Configured in `velite.config.ts` at project root. Integrated with Next.js via a direct import pattern in `next.config.ts` (Turbopack-compatible).

**When to use:** All iteration MDX content. Schema is the compile-time contract.

**Example:**
```typescript
// velite.config.ts (project root)
import { defineCollection, defineConfig, s } from 'velite'
import { z } from 'zod'

const iterations = defineCollection({
  name: 'Iteration',
  pattern: 'content/iterations/**/*.mdx',
  schema: s
    .object({
      slug:              s.slug(),
      version:           z.number().int().positive(),
      status:            z.enum(['PASS', 'FAIL', 'PARKED', 'IN_PROGRESS']),
      title_es:          z.string(),
      title_en:          z.string(),
      notebook_url:      z.string().url(),
      dataset_ref:       z.string(),
      analysis_date:     z.coerce.date(),
      replication_hash:  z.string().regex(/^[a-f0-9]{64}$/),
      beta:              z.number().optional(),
      ci_lower:          z.number().optional(),
      ci_upper:          z.number().optional(),
      p_value:           z.number().min(0).max(1).optional(),
      sample_size:       z.number().int().positive().optional(),
      disposition_memo:  z.string().optional(),
    })
    .refine(
      (data) => data.status !== 'FAIL' || !!data.disposition_memo,
      {
        message: 'disposition_memo is required when status is FAIL',
        path: ['disposition_memo'],
      }
    ),
})

export default defineConfig({
  root: 'content',
  output: {
    data: '.velite',
    assets: 'public/static',
    base: '/static/',
    name: '[name]-[hash:6].[ext]',
    clean: true,
  },
  collections: { iterations },
})
```

```typescript
// next.config.ts — Velite integration (Turbopack-compatible)
import type { NextConfig } from 'next'

const isDev = process.argv.indexOf('dev') !== -1
const isBuild = process.argv.indexOf('build') !== -1
if (!process.env.VELITE_STARTED && (isDev || isBuild)) {
  process.env.VELITE_STARTED = '1'
  import('velite').then((m) => m.build({ watch: isDev, clean: !isDev }))
}

const nextConfig: NextConfig = {
  // ... other config
}

export default nextConfig
```

### Pattern 4: wagmi Config with Multi-RPC Fallback

**Example:**
```typescript
// lib/wagmi/config.ts
import { createConfig, http, fallback } from 'wagmi'
import { celo, mainnet, base, arbitrum, optimism } from 'viem/chains'

export const wagmiConfig = createConfig({
  chains: [celo, mainnet, base, arbitrum, optimism],
  transports: {
    [celo.id]:     fallback([http(process.env.NEXT_PUBLIC_RPC_CELO_PRIMARY!), http('https://forno.celo.org')]),
    [mainnet.id]:  fallback([http(process.env.NEXT_PUBLIC_RPC_ETH_PRIMARY!), http('https://ethereum.publicnode.com')]),
    [base.id]:     fallback([http(process.env.NEXT_PUBLIC_RPC_BASE_PRIMARY!), http('https://mainnet.base.org')]),
    [arbitrum.id]: fallback([http(process.env.NEXT_PUBLIC_RPC_ARB_PRIMARY!), http('https://arb1.arbitrum.io/rpc')]),
    [optimism.id]: fallback([http(process.env.NEXT_PUBLIC_RPC_OP_PRIMARY!), http('https://mainnet.optimism.io')]),
  },
})
```

### Pattern 5: @wagmi/cli Foundry Plugin Config

**Example:**
```typescript
// wagmi.config.ts (project root)
import { defineConfig } from '@wagmi/cli'
import { foundry } from '@wagmi/cli/plugins'
import { react } from '@wagmi/cli/plugins'

export default defineConfig({
  out: 'lib/contracts/generated.ts',
  plugins: [
    foundry({
      project: '../abrigo',     // Sibling directory — confirmed working with relative paths
      artifacts: 'out/',        // Foundry default artifact dir
    }),
    react(),
  ],
})
```

**Phase 1 note:** `../abrigo/out/` may not contain compiled artifacts yet. For Phase 1, commit a placeholder `wagmi.config.ts` with this structure. The `wagmi generate` command will fail gracefully if no ABIs exist. Phase 2 spike confirms the real artifact paths.

### Pattern 6: mcp-handler Stub Route

**Package name is `mcp-handler` (not `@vercel/mcp-handler`). Install: `pnpm add mcp-handler @modelcontextprotocol/sdk@^1.26 zod`.**

**Example:**
```typescript
// app/api/mcp/[transport]/route.ts
import { createMcpHandler } from 'mcp-handler'

const handler = createMcpHandler(
  (server) => {
    // Phase 1: no tools registered
    // Phase 4 will add: server.tool('list_iterations', schema, impl)
  },
  {
    basePath: '/api/mcp',  // MUST match the directory containing [transport]
  }
)

export { handler as GET, handler as POST, handler as DELETE }
```

**Critical basePath requirement:** `basePath` must equal the path to the directory that contains the `[transport]` folder. If route is at `app/api/mcp/[transport]/route.ts`, then `basePath: '/api/mcp'`.

### Pattern 7: JSON-LD in Root Layout (Organization + WebSite)

**Example:**
```typescript
// components/StructuredData.tsx (Server Component — no 'use client')
import type { Organization, WebSite, WithContext } from 'schema-dts'

export function StructuredData() {
  const organization: WithContext<Organization> = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'WVS Finance / DS2P Labs',
    url: 'https://wvs.finance',
    description: 'Research lab designing permissionless convex-hedge instruments for frontier markets',
    sameAs: ['https://github.com/wvs-finance'],
  }

  const website: WithContext<WebSite> = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'WVS Finance',
    url: 'https://wvs.finance',
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organization).replace(/</g, '\\u003c'),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(website).replace(/</g, '\\u003c'),
        }}
      />
    </>
  )
}
```

**Note:** Use native `<script>` tag, not `next/script`. The `JSON.stringify(...).replace(/</g, '\\u003c')` prevents XSS in JSON-LD. The `schema-dts` package provides TypeScript types for all schema.org types.

**Hydration gotcha:** In RSC (Server Components), the `<script>` tag renders once server-side and is not re-injected client-side, so no duplicate-tag issue. Only arises if a Client Component renders it — keep StructuredData.tsx as a Server Component.

### Pattern 8: @t3-oss/env-nextjs Setup

**Example:**
```typescript
// src/env.ts
import { createEnv } from '@t3-oss/env-nextjs'
import { z } from 'zod'

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(['development', 'test', 'production']),
  },
  client: {
    NEXT_PUBLIC_RPC_CELO_PRIMARY:   z.string().url(),
    NEXT_PUBLIC_RPC_ETH_PRIMARY:    z.string().url(),
    NEXT_PUBLIC_RPC_BASE_PRIMARY:   z.string().url(),
    NEXT_PUBLIC_RPC_ARB_PRIMARY:    z.string().url(),
    NEXT_PUBLIC_RPC_OP_PRIMARY:     z.string().url(),
    NEXT_PUBLIC_WALLETCONNECT_ID:   z.string().min(1),
    NEXT_PUBLIC_APP_URL:            z.string().url(),
  },
  runtimeEnv: {
    NODE_ENV:                       process.env.NODE_ENV,
    NEXT_PUBLIC_RPC_CELO_PRIMARY:   process.env.NEXT_PUBLIC_RPC_CELO_PRIMARY,
    NEXT_PUBLIC_RPC_ETH_PRIMARY:    process.env.NEXT_PUBLIC_RPC_ETH_PRIMARY,
    NEXT_PUBLIC_RPC_BASE_PRIMARY:   process.env.NEXT_PUBLIC_RPC_BASE_PRIMARY,
    NEXT_PUBLIC_RPC_ARB_PRIMARY:    process.env.NEXT_PUBLIC_RPC_ARB_PRIMARY,
    NEXT_PUBLIC_RPC_OP_PRIMARY:     process.env.NEXT_PUBLIC_RPC_OP_PRIMARY,
    NEXT_PUBLIC_WALLETCONNECT_ID:   process.env.NEXT_PUBLIC_WALLETCONNECT_ID,
    NEXT_PUBLIC_APP_URL:            process.env.NEXT_PUBLIC_APP_URL,
  },
})
```

Import `src/env.ts` in `next.config.ts` (top of file) to trigger validation at build time.

### Pattern 9: lefthook.yml for pnpm + Biome + tsc + Velite

```yaml
# lefthook.yml
pre-commit:
  parallel: true
  commands:
    biome:
      glob: "*.{js,ts,cjs,mjs,jsx,tsx,json,jsonc}"
      run: pnpm biome check --no-errors-on-unmatched --files-ignore-unknown=true --colors=off {staged_files}
      stage_fixed: true
    typecheck:
      run: pnpm tsc --noEmit
    velite-validate:
      glob: "content/**/*.{md,mdx}"
      run: pnpm velite build --clean false

commit-msg:
  commands:
    commitlint:
      run: pnpm commitlint --edit {1}
```

**Note:** `stage_fixed: true` re-stages files after Biome applies safe fixes. The `typecheck` command runs on every staged-file commit — use `tsc --noEmit --incremental` to speed this up once a `.tsbuildinfo` file exists.

### Pattern 10: Lighthouse CI Config for Moto G Power 3G

**The Moto G Power screen dimensions (from Chrome DevTools device catalog):**
- Width: 412px, Height: 823px, Device Pixel Ratio: 2.625
- Throttling: CPU slowdown 4x, download 1.6Mbps, latency 150ms (Lighthouse's "Slow 4G / top 25% 3G")

```javascript
// lighthouserc.js
module.exports = {
  ci: {
    collect: {
      numberOfRuns: 3,
      settings: {
        formFactor: 'mobile',
        screenEmulation: {
          mobile: true,
          width: 412,
          height: 823,
          deviceScaleFactor: 2.625,
          disabled: false,
        },
        throttling: {
          rttMs: 150,
          throughputKbps: 1638.4,   // ~1.6 Mbps download (top 25% 3G / slow 4G)
          cpuSlowdownMultiplier: 4,
          requestLatencyMs: 562.5,
          downloadThroughputKbps: 1474.6,
          uploadThroughputKbps: 675,
        },
        throttlingMethod: 'simulate',
      },
    },
    assert: {
      assertions: {
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'total-blocking-time':      ['error', { maxNumericValue: 200 }],
        'cumulative-layout-shift':  ['warn',  { maxNumericValue: 0.1 }],
        'first-contentful-paint':   ['warn',  { maxNumericValue: 2000 }],
        'categories:accessibility': ['warn',  { minScore: 0.9 }],
        'categories:performance':   ['warn',  { minScore: 0.75 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
}
```

### Pattern 11: axe-core/playwright Integration

```typescript
// tests/a11y/homepage.spec.ts
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test('homepage has no WCAG 2.2 AA violations', async ({ page }) => {
  await page.goto('/')

  const accessibilityScanResults = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze()

  expect(accessibilityScanResults.violations).toEqual([])
})
```

**Confidence level:** HIGH. The `@axe-core/playwright` 4.11.3 package supports WCAG 2.2 AA via `wcag22aa` tag.

### Pattern 12: GitHub Actions CI Architecture

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm biome check .

  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm tsc --noEmit

  test-unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm vitest run

  impeccable:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npx impeccable detect src/ --fail-on-issues
      # Note: flag name may be --fail-on-error — see Open Questions

  # Jobs below require Vercel preview URL — triggered on deployment_status
  test-e2e:
    runs-on: ubuntu-latest
    if: github.event_name == 'deployment_status' && github.event.deployment_status.state == 'success'
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm playwright install --with-deps chromium
      - run: pnpm playwright test --project=chromium
        env:
          BASE_URL: ${{ github.event.deployment_status.target_url }}

  a11y:
    runs-on: ubuntu-latest
    if: github.event_name == 'deployment_status' && github.event.deployment_status.state == 'success'
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm playwright install --with-deps chromium
      - run: pnpm playwright test tests/a11y/
        env:
          BASE_URL: ${{ github.event.deployment_status.target_url }}

  lighthouse:
    runs-on: ubuntu-latest
    if: github.event_name == 'deployment_status' && github.event.deployment_status.state == 'success'
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm dlx @lhci/cli autorun
        env:
          LHCI_BUILD_CONTEXT__CURRENT_HASH: ${{ github.sha }}
          LHCI_COLLECT__URL: ${{ github.event.deployment_status.target_url }}
```

**Key design:** `lint`, `typecheck`, `test-unit`, `impeccable` run on `push`/`pull_request` (no Vercel dependency). `test-e2e`, `a11y`, `lighthouse` trigger on `deployment_status` event with Vercel preview URL. This avoids the "waiting for Vercel build" timeout problem.

### Anti-Patterns to Avoid

- **`@theme` without `inline`:** Writing `@theme { --color-accent: oklch(...) }` without the `inline` keyword causes Tailwind to resolve the value at build time. Dark mode toggling won't work because the CSS variable isn't kept as a reference.
- **`localePrefix: 'as-needed'` with cookie-only locale:** If you set localePrefix to anything other than `'never'` in "without routing" mode, URL redirects will fight with the cookie, causing redirect loops.
- **`mcp-handler` basePath mismatch:** If `basePath` doesn't exactly match the directory holding `[transport]`, all MCP requests 404. The route at `app/api/mcp/[transport]/route.ts` requires `basePath: '/api/mcp'` (not `/api/mcp/[transport]`).
- **Wallet provider in root `app/layout.tsx`:** RainbowKitProvider and WagmiProvider belong only in `app/(defi)/layout.tsx`. Root layout must not include them — lab pages must never hydrate wallet state.
- **`JSON.stringify` without XSS escaping in JSON-LD:** The `<` character in JSON-LD strings can break the HTML parse. Always call `.replace(/</g, '\\u003c')` on the JSON string.
- **`process.env.VAR` directly in wagmi config:** Pulls env vars at module load without validation. Use `src/env.ts` from @t3-oss/env-nextjs instead — it validates at build time and throws on missing values.
- **`tailwindcss-animate` in Tailwind v4:** This package is deprecated for v4. Use `tw-animate-css` instead (shadcn's Feb 2026 refresh uses it).
- **Inter/Geist as typeface:** Pitfall 1 from PITFALLS.md — `impeccable detect` will fire `overused-font`. The scaffold must never commit globals.css with Inter in the font stack.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Build-time env validation | Custom Zod check in next.config.ts | @t3-oss/env-nextjs | Handles Next.js runtimeEnv destructuring requirement; splits server/client schemas safely |
| CSS-to-Tailwind token bridge | Custom PostCSS plugin | `@theme inline` | Built into Tailwind v4; zero additional tooling |
| MCP server transport handling | Custom SSE/HTTP MCP server | mcp-handler | Handles both Streamable HTTP and SSE transports; OAuth-ready |
| Git hook runner | Custom shell scripts | lefthook | Cross-platform binary; parallel execution; staged-files injection |
| MDX frontmatter validation | Custom remark plugin | Velite + Zod `.refine()` | Build-time type safety; `disposition_memo` conditionality is a single `.refine()` |
| Intl formatting wrappers | Date.toLocaleString() | `lib/format/` wrappers using `Intl.*` | Locale leakage prevention; testable; consistent COP/USD handling |
| WCAG enforcement | Manual axe audits | @axe-core/playwright in CI | Automated on every PR; catches regressions before merge |

**Key insight:** Every item above has a known edge-case trap. `env-nextjs` prevents the "build succeeds, runtime crashes" class. `Velite .refine()` closes the "FAIL iteration without a disposition memo" epistemic gap at compile time, not at reviewer time.

---

## Common Pitfalls

### Pitfall 1: Tailwind v4 `@theme` Without `inline` Keyword

**What goes wrong:** Tokens defined as `@theme { --color-accent: oklch(0.55 0.18 165) }` (no `inline`) get resolved at build time. When the user switches to dark mode and CSS custom properties change, Tailwind utility classes still use the build-time value, not the updated CSS variable — dark mode appears to have no effect.

**Why it happens:** The `@theme` (without inline) block evaluates variables eagerly; `@theme inline` keeps them as CSS variable references.

**How to avoid:** Always use `@theme inline { --color-*: var(--*) }`. Define actual color values in `:root` / `.dark`. The two-layer pattern (values in `:root`, references in `@theme inline`) is the shadcn/ui Feb 2026 standard pattern.

**Warning signs:** Dark mode toggle has no visible effect. Computed styles show hardcoded OKLCH values rather than `var(--*)`.

### Pitfall 2: next-intl v4 Cookie Mode Causes Full-Page Redirect on Language Switch

**What goes wrong:** When the language switcher sets the `NEXT_LOCALE` cookie and does a `router.refresh()`, Next.js caches the previous locale's render at the CDN edge, serving stale content for up to the configured ISR TTL.

**Why it happens:** App Router pages using RSC with Next.js caching may not see the new cookie value until the cache is busted.

**How to avoid:** Language switcher must use a Server Action that sets the cookie AND calls `revalidatePath('/')` (or the current path), or use `router.refresh()` with cache: 'no-store' on the relevant routes. In development this is fine; the bug appears only on Vercel preview with Edge caching.

**Warning signs:** Language switch appears to work in development but is inconsistent on Vercel preview deployments.

### Pitfall 3: Route Group Wallet Isolation Broken by Shared Providers

**What goes wrong:** A developer adds a `QueryClientProvider` or `WagmiProvider` to the root `app/layout.tsx` "for convenience" (e.g., to avoid duplicating TanStack Query setup). All `(lab)` pages now include the wagmi bundle, bloating the lab audience's JS payload.

**Why it happens:** Shared layout is the path of least resistance. The route group isolation is not enforced automatically — it requires discipline and a CI test.

**How to avoid:** The `tests/architecture/no-wallet-in-lab.spec.ts` test (bundle assertion) is the enforcement mechanism. It must be written in Phase 1 and must fail if any wagmi/rainbowkit module appears in the `(lab)` page bundles. Use `@next/bundle-analyzer` to inspect.

**Warning signs:** `tests/architecture/no-wallet-in-lab.spec.ts` test skipped or commented out. `app/layout.tsx` imports from wagmi.

### Pitfall 4: impeccable CLI Flag Name Uncertainty

**What goes wrong:** The CI job for `impeccable detect` may fail with "unknown flag" if the wrong flag name is used.

**Why it happens:** Research found `--fail-on-issues` in one reference and `--fail-on-error` in the CONTEXT.md decision. The PITFALLS.md cites `npx impeccable detect --fail-on-error`. The correct flag name should be verified against the actual CLI help output.

**How to avoid:** Run `npx impeccable detect --help` as the first task when setting up the CI job. Document the verified flag in the CI yaml comment. If the flag is not supported, use exit code checking: impeccable exits non-zero on violations when run in CI mode.

**Warning signs:** CI job exits 0 even when violations are present.

### Pitfall 5: Velite `.refine()` Error Not Caught at Build Time

**What goes wrong:** A Velite `.refine()` on the iteration schema (requiring `disposition_memo` when `status === 'FAIL'`) does not block `next build` if Velite is not run before the build step in CI.

**Why it happens:** The Velite build runs inside `next.config.ts` only when `isDev || isBuild` is true. If `velite build` is invoked separately before `next build`, the check runs. If the Next.js build process skips Velite (e.g., importing pre-built `.velite/` from cache), the validation is skipped.

**How to avoid:** Never cache the `.velite/` directory in CI. The Velite build must always run fresh. Add `pnpm velite build` as an explicit pre-build step in the GitHub Actions `next build` job to guarantee validation runs.

### Pitfall 6: JSON-LD Hydration Double-Render

**What goes wrong:** A Client Component renders `<script type="application/ld+json">` — React renders it server-side, then hydrates and renders it again client-side, producing two identical JSON-LD blocks. Google's Rich Results Test flags duplicate schemas.

**Why it happens:** Developers add `'use client'` to a component that includes structured data, or import a StructuredData component into a Client Component tree.

**How to avoid:** `<StructuredData />` must be a Server Component. Never add `'use client'` to it. Place it in `app/layout.tsx` (a Server Component by default) and keep it in the Server Component tree.

### Pitfall 7: ABI Codegen Runs in CI Against Missing Artifacts

**What goes wrong:** `pnpm wagmi generate` in CI fails because `../abrigo/out/` either doesn't exist on the GitHub Actions runner (sibling repo isn't checked out) or has no compiled artifacts.

**Why it happens:** The `@wagmi/cli` Foundry plugin needs the sibling directory to be present. CI only checks out the `frontend` repo by default.

**How to avoid:** In Phase 1, the `wagmi.config.ts` is a placeholder. Make `wagmi generate` a `pre-build:full` script that is NOT part of the default `build` script. Only run it locally when `../abrigo/` is present. CI skips it (explicit `if: false` guard on the codegen step) until Phase 2/3 when the abrigo checkout step is added.

---

## Code Examples

### Verified: @t3-oss/env-nextjs in next.config.ts
```typescript
// next.config.ts — first line triggers build-time validation
import './src/env.ts'
import type { NextConfig } from 'next'
// ... rest of config
```

Source: [env.t3.gg/docs/nextjs](https://env.t3.gg/docs/nextjs)

### Verified: axe-core WCAG 2.2 Tags
```typescript
// Correct tag set for WCAG 2.2 AA
.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
```

Source: [@axe-core/playwright docs](https://playwright.dev/docs/accessibility-testing)

### Verified: Velite Next.js Config Integration
```typescript
// next.config.ts — Turbopack-compatible pattern
const isDev = process.argv.indexOf('dev') !== -1
const isBuild = process.argv.indexOf('build') !== -1
if (!process.env.VELITE_STARTED && (isDev || isBuild)) {
  process.env.VELITE_STARTED = '1'
  import('velite').then((m) => m.build({ watch: isDev, clean: !isDev }))
}
```

Source: [velite.js.org/guide/with-nextjs](https://velite.js.org/guide/with-nextjs)

### Verified: wagmi Foundry Plugin Relative Path
```typescript
foundry({
  project: '../abrigo',   // relative path to sibling Foundry project is supported
  artifacts: 'out/',
})
```

Source: [wagmi.sh/cli/api/plugins/foundry](https://wagmi.sh/cli/api/plugins/foundry)

### Verified: JSON-LD XSS Prevention
```typescript
dangerouslySetInnerHTML={{
  __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
}}
```

Source: [nextjs.org/docs/app/guides/json-ld](https://nextjs.org/docs/app/guides/json-ld) (Next.js 16.2.6 docs, last updated 2026-05-07)

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `tailwindcss-animate` for animations | `tw-animate-css` | Tailwind v4 release (early 2025) | shadcn/ui Feb 2026 refresh dropped tailwindcss-animate |
| `tailwind.config.js` `extend.colors` | `@theme inline` in globals.css | Tailwind v4 | Design tokens live in CSS, not JS config |
| `@layer base` for CSS variables | `:root` / `.dark` outside @layer + `@theme inline` | Tailwind v4 + shadcn Feb 2026 | Two-layer pattern required for dark mode reactivity |
| Contentlayer for MDX | Velite | 2024 (Contentlayer archived) | Velite is the maintained successor |
| Husky for git hooks | lefthook | 2024–2025 trend | lefthook is binary (no Node dep), faster, parallel |
| `@vercel/mcp-handler` | `mcp-handler` | Package rename | The package is simply `mcp-handler` — no scope prefix |
| TypeChain for ABI types | `@wagmi/cli` + viem ABIType | wagmi v2 era | TypeChain generates ethers.js types; incompatible with viem v2 |
| `next-i18next` for App Router | `next-intl` | App Router GA (Next.js 13.4+) | next-intl has first-class RSC server API; next-i18next doesn't |

**Deprecated/outdated:**
- `Contentlayer`: Archived 2024. Zero ongoing maintenance. Use Velite.
- `tailwindcss-animate`: Deprecated for Tailwind v4. Use `tw-animate-css`.
- `TypeChain`: Superseded by wagmi/viem ABIType inference. Generates ethers.js types incompatible with viem v2.
- wagmi v3 (3.6.13 is latest): Do NOT upgrade yet. RainbowKit v2.2.11 is confirmed for wagmi v2 only.

---

## Open Questions

1. **impeccable CLI exact flag for CI failure**
   - What we know: PITFALLS.md and CONTEXT.md reference `--fail-on-error`. The pbakaus/impeccable README mentions `CI-ready JSON output`. The tool is a real CLI.
   - What's unclear: Whether the flag is `--fail-on-error`, `--fail-on-issues`, or whether exit code alone is sufficient in CI.
   - Recommendation: Planner should include a task to run `npx impeccable detect --help` as step 0 of the impeccable CI job setup and document the verified flag. Fallback: rely on non-zero exit code rather than a named flag.

2. **Biome package name and install method**
   - What we know: Both `biome` and `@biomejs/biome` exist on npm. The `biome` package at version 0.3.3 (per npm view) appears to be a different/older package. `@biomejs/biome` at version 1.9.x is the correct Biome linter/formatter.
   - What's unclear: CONTEXT.md says `biome@^1.9` — this is `@biomejs/biome@^1.9`, not the `biome` package.
   - Recommendation: Install as `pnpm add -D @biomejs/biome@^1.9`. The CLI command is `pnpm biome check .` (script alias). Verify: `pnpm dlx @biomejs/biome --version` should return 1.9.x.

3. **Abrigo Foundry artifacts path**
   - What we know: `../abrigo/` is the correct relative path. The `out/` subdirectory is the Foundry default.
   - What's unclear: Whether any ABI JSON files exist in `../abrigo/out/` currently (STATE.md flags this as an open question).
   - Recommendation: Phase 1 wagmi.config.ts uses placeholder `project: '../abrigo'`. The `wagmi generate` script is NOT run in CI during Phase 1. Planner should add a discrete Phase 2 spike task to confirm artifact paths.

4. **next-intl v4 "without routing" vs "with [locale] segments"**
   - What we know: Both modes work. "Without routing" avoids `app/[locale]/` directory structure and uses a cookie in `i18n/request.ts` to pick the locale. "With routing" uses middleware and `[locale]` URL segments but supports `localePrefix: 'never'` to hide them.
   - What's unclear: The CONTEXT.md decision says "cookie (`NEXT_LOCALE`), not URL prefix" — this maps to "without routing" mode. However, the next-intl v4 docs also support `localePrefix: 'never'` WITH middleware routing, which still uses `[locale]` folders internally.
   - Recommendation: Use "without routing" (no `[locale]` folder, no middleware, cookie only). This is the simpler path. File structure: `app/(lab)/page.tsx` (not `app/[locale]/(lab)/page.tsx`). The `i18n/request.ts` reads the cookie. Messages imported dynamically per locale.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.6 (unit/integration) + Playwright 1.59.1 (e2e/a11y) |
| Config files | `vitest.config.ts` (Wave 0) + `playwright.config.ts` (Wave 0) |
| Quick run command | `pnpm vitest run` |
| Full suite command | `pnpm vitest run && pnpm playwright test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FOUND-01 | Next.js app builds and deploys | smoke | `pnpm build` | Wave 0 |
| FOUND-02 | Design tokens present in globals.css | unit | `pnpm vitest run tests/unit/tokens.test.ts` | Wave 0 |
| FOUND-03 | i18n: getTranslations resolves es-CO and en strings | unit | `pnpm vitest run tests/unit/i18n.test.ts` | Wave 0 |
| FOUND-04 | Velite schema validates iteration MDX | unit | `pnpm vitest run tests/unit/velite-schema.test.ts` | Wave 0 |
| FOUND-04 | FAIL status without disposition_memo is rejected | unit | same | Wave 0 |
| FOUND-05 | wagmi config exports createConfig with all 5 chains | unit | `pnpm vitest run tests/unit/wagmi-config.test.ts` | Wave 0 |
| FOUND-06 | wagmi.config.ts is valid (foundry plugin resolves) | smoke | `pnpm wagmi generate` (local only) | Wave 0 |
| FOUND-07 | impeccable detects zero violations on stub homepage | CI | `npx impeccable detect src/` | Wave 0 |
| FOUND-08 | LCP < 2500ms on Moto G Power 3G profile | lighthouse | `pnpm lhci autorun` | Wave 0 |
| FOUND-09 | WCAG 2.2 AA: homepage has zero axe violations | e2e/a11y | `pnpm playwright test tests/a11y/` | Wave 0 |
| FOUND-10 | Missing env var fails build | smoke | `pnpm build` with a var unset | Wave 0 |
| FOUND-11 | (lab) page bundle does not include wagmi/rainbowkit | architecture | `pnpm playwright test tests/architecture/` | Wave 0 |
| FOUND-12 | /llms.txt, /.well-known/mcp.json, /.well-known/openapi.yaml return 200 | e2e | `pnpm playwright test tests/e2e/agent-stubs.spec.ts` | Wave 0 |
| FOUND-13 | Vitest + Playwright + MSW wired; format.test.ts passes | unit | `pnpm vitest run tests/unit/format.test.ts` | Wave 0 |
| CROSS-01 | Homepage passes WCAG 2.2 AA | e2e/a11y | `pnpm playwright test tests/a11y/` | Wave 0 |
| CROSS-02 | Language switcher sets NEXT_LOCALE cookie; page re-renders in target locale | e2e | `pnpm playwright test tests/e2e/homepage.spec.ts` | Wave 0 |
| CROSS-03 | LCP < 2500ms | lighthouse | `pnpm lhci autorun` | Wave 0 |
| CROSS-04 | Zero impeccable violations | CI | `npx impeccable detect src/` | Wave 0 |
| CROSS-05 | No pure black/gray in globals.css | unit | `pnpm vitest run tests/unit/tokens.test.ts` (grep for #000/#fff/gray-*) | Wave 0 |
| CROSS-06 | COP formatted correctly for es-CO, USD for en | unit | `pnpm vitest run tests/unit/format.test.ts` | Wave 0 |
| CROSS-07 | Date formatted as "11 de mayo de 2026" for es-CO | unit | same | Wave 0 |
| CROSS-08 | Number formatted with correct decimal/thousand separators per locale | unit | same | Wave 0 |
| CROSS-09 | StatusPill renders color + icon + text (snapshot) | unit | `pnpm vitest run tests/unit/status-pill.test.ts` | Wave 0 |
| CROSS-10 | Stub homepage copy has no banned phrases | CI | `npx impeccable detect src/` | Wave 0 |

### Sampling Rate

- **Per task commit:** `pnpm vitest run` (unit only, < 30s)
- **Per wave merge:** `pnpm vitest run && pnpm playwright test tests/e2e/ tests/a11y/`
- **Phase gate:** Full suite green + Lighthouse CI passing + impeccable zero violations before `/gsd:verify-work`

### Wave 0 Gaps (test files to create before implementation)

- [ ] `vitest.config.ts` — Vitest configuration with React plugin and path aliases
- [ ] `playwright.config.ts` — Playwright config with BASE_URL from env; projects: chromium, axe
- [ ] `tests/unit/format.test.ts` — Intl wrappers for COP/USD and dates (FOUND-13, CROSS-06, CROSS-07, CROSS-08)
- [ ] `tests/unit/tokens.test.ts` — CSS token presence check and no-pure-black/gray assertion (FOUND-02, CROSS-05)
- [ ] `tests/unit/i18n.test.ts` — getRequestConfig resolves messages for es-CO and en (FOUND-03)
- [ ] `tests/unit/velite-schema.test.ts` — Schema validation including FAIL+disposition_memo .refine() (FOUND-04)
- [ ] `tests/unit/wagmi-config.test.ts` — Config exports with all 5 chains (FOUND-05)
- [ ] `tests/unit/status-pill.test.ts` — StatusPill renders color+icon+text (CROSS-09)
- [ ] `tests/e2e/homepage.spec.ts` — Homepage loads, lang switcher works (CROSS-02)
- [ ] `tests/e2e/agent-stubs.spec.ts` — /llms.txt, /.well-known/mcp.json, /.well-known/openapi.yaml return 200 (FOUND-12)
- [ ] `tests/api/health.test.ts` — /api/health returns 200 (smoke)
- [ ] `tests/architecture/no-wallet-in-lab.spec.ts` — Bundle assertion for (lab) pages (FOUND-11)
- [ ] `tests/a11y/homepage.spec.ts` — axe-core scan (FOUND-09, CROSS-01)
- [ ] `msw/handlers.ts` + `msw/server.ts` — MSW setup for Node (Vitest) and browser (Playwright) (FOUND-13)

---

## Sources

### Primary (HIGH confidence)
- [ui.shadcn.com/docs/tailwind-v4](https://ui.shadcn.com/docs/tailwind-v4) — @theme inline pattern, tw-animate-css, React 19 compat
- [nextjs.org/docs/app/guides/json-ld](https://nextjs.org/docs/app/guides/json-ld) — JSON-LD in App Router, XSS escape pattern (Next.js 16.2.6 docs, 2026-05-07)
- [wagmi.sh/cli/api/plugins/foundry](https://wagmi.sh/cli/api/plugins/foundry) — Foundry plugin project path (relative paths confirmed)
- [next-intl.dev/docs/getting-started/app-router](https://next-intl.dev/docs/getting-started/app-router) — v4 setup modes; i18n/request.ts; cookie locale
- [velite.js.org/guide/with-nextjs](https://velite.js.org/guide/with-nextjs) — Velite Next.js integration (Turbopack-compatible pattern)
- [github.com/vercel/mcp-handler](https://github.com/vercel/mcp-handler) — Package name `mcp-handler`; basePath requirement; GET/POST/DELETE exports
- [biomejs.dev/recipes/git-hooks/](https://biomejs.dev/recipes/git-hooks/) — lefthook.yml Biome configuration with staged_files
- [env.t3.gg/docs/nextjs](https://env.t3.gg/docs/nextjs) — @t3-oss/env-nextjs server/client schema pattern
- [playwright.dev/docs/accessibility-testing](https://playwright.dev/docs/accessibility-testing) — @axe-core/playwright withTags pattern
- npm registry (verified 2026-05-11) — all package versions above

### Secondary (MEDIUM confidence)
- [unlighthouse.dev/learn-lighthouse/lighthouse-ci](https://unlighthouse.dev/learn-lighthouse/lighthouse-ci) — @lhci/cli 0.15.1, Lighthouse 12.6.1
- [github.com/GoogleChrome/lighthouse/blob/main/docs/emulation.md](https://github.com/GoogleChrome/lighthouse/blob/main/docs/emulation.md) — General emulation config options
- GitHub Actions `deployment_status` event pattern — documented via community examples and Vercel docs

### Tertiary (LOW confidence)
- impeccable CLI `--fail-on-error` flag name — from CONTEXT.md/PITFALLS.md but not independently verified against live `--help` output. Run `npx impeccable detect --help` to confirm.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions verified against npm registry 2026-05-11
- Architecture: HIGH — confirmed from Next.js 16.2.6 official docs + research artifacts (ARCHITECTURE.md, STACK.md)
- Tailwind v4 + shadcn integration: HIGH — official shadcn docs confirm @theme inline pattern
- next-intl cookie mode: HIGH — official next-intl docs confirm localePrefix: 'never' + getRequestConfig + cookie
- Velite .refine() pattern: MEDIUM — Zod .refine() is standard Zod; Velite uses Zod directly; pattern is standard but not shown in official Velite example
- Lighthouse Moto G Power dims: MEDIUM — Chrome DevTools device catalog values; not in official LHCI docs
- impeccable flag name: LOW — not independently verified against live CLI

**Research date:** 2026-05-11
**Valid until:** 2026-06-11 (30 days for stable packages; re-verify next-intl v4 if any minor version changes affect cookie mode)
