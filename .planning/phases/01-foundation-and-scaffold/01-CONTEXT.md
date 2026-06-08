# Phase 1: Foundation and Scaffold — Context

**Gathered:** 2026-05-11
**Status:** Ready for planning
**Mode:** Auto — all decisions resolved with recommended defaults from research synthesis

<domain>
## Phase Boundary

Wire every cross-cutting constraint (CI quality gates, design tokens, i18n infrastructure, route group layout, agent-accessibility stubs, wallet config, content pipeline schema, test harness) into the project skeleton so no downstream phase can bypass them.

**In scope:** Project scaffold; tooling configuration; CI pipeline; design tokens; i18n infrastructure; route group layout; agent-accessibility stub files; wagmi/viem config; Velite schema; test harness; environment variable conventions; minimal "scaffold proven" homepage stub.

**Out of scope (belongs to later phases):** Lab homepage content (Phase 2), iteration content (Phase 2), dashboard pages (Phase 3), MCP tool implementations (Phase 4), wallet UI flows (Phase 5).

The scaffold homepage in this phase is a *placeholder* proving infrastructure works — it shows wordmark + tagline + hardcoded iteration counts. Phase 2 replaces this content.

</domain>

<decisions>
## Implementation Decisions

### Package manager and repository layout
- **pnpm** as package manager. First-class Vercel support, fastest install, makes future workspace extraction frictionless.
- **Single app, no monorepo.** Confirmed by research synthesis (ARCHITECTURE.md). Premature workspace extraction costs more than it saves at this team size. Re-evaluate only when a second deployable service needs an independent release cadence.
- Node version pinned via `.nvmrc` to Node 22 LTS.
- All scripts run via `pnpm <task>`; no `npx` in package.json scripts.

### Lint, format, and type-check
- **Biome** for lint + format (single tool, single config, native TS, ~25× faster than ESLint+Prettier). 2024 plugin gaps that previously blocked Biome adoption (e.g., react-hooks lint) are closed in Biome 1.9+.
- TypeScript `strict: true` plus `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` from day one. Retrofitting strictness later is order-of-magnitude more expensive.
- `tsc --noEmit` runs in CI as a separate job from Biome.
- Formatter, linter, and type-checker all run on pre-commit via `lefthook` (faster than husky).

### Design tokens — source of truth
- **Tokens authored directly in `app/globals.css`** via Tailwind v4 `@theme` directive. No JSON source-of-truth or codegen layer.
- Naming is **semantic, not raw**: `--color-bg-canvas`, `--color-text-primary`, `--color-accent-default`, `--color-status-pass`, `--color-status-fail`, `--color-status-parked`, `--color-status-in-progress` — never `--color-stone-50`.
- All neutrals **tinted toward the lab accent**, never pure black or pure gray (impeccable anti-pattern; CROSS-05).
- Status colors paired with shape (icon) and text in every component — color is never the only encoding (CROSS-09).
- Light mode primary; dark mode is a parallel token set with the same semantic names. Both pass WCAG 2.2 AA contrast in CI.
- Token authoring follows `impeccable` 7-reference doctrine: typography, color-and-contrast (OKLCH), spatial-design, motion-design, interaction-design, responsive-design, ux-writing.

### i18n key strategy
- **next-intl v4** with `next-intl/server` for RSC and `next-intl/client` only in client components that need locale (rare).
- **Locale files split by route segment**, not flat: `messages/es-CO/lab.json`, `messages/es-CO/iterations.json`, etc. Matches next-intl best practice and makes orphan keys detectable.
- **Both `es-CO` and `en` authored side-by-side from day one** (CROSS-02, LAB-06). No "English first then translate" workflow — translations are an authoring concern, not a localization-pipeline concern.
- Key naming: `dot.case` nested under route namespace, e.g., `lab.hero.title`, `iterations.status.pass.label`.
- Language switcher persists via cookie (`NEXT_LOCALE`), not URL prefix. URL prefix optional, controlled by config.
- `Intl.NumberFormat`, `Intl.DateTimeFormat`, `Intl.RelativeTimeFormat` wrappers in `lib/format/` — never raw `Date.toLocaleString()` (locale leakage risk).

### Route group layout
- Three route groups under `app/`:
  - `(lab)` — pure RSC, no wallet provider, used for landing, research, team, iterations
  - `(dashboard)` — RSC shell + client islands; no wallet by default
  - `(defi)` — wraps RainbowKitProvider + WagmiProvider; only routes that need wallet state hydrate here
- A test in `tests/architecture/no-wallet-in-lab.spec.ts` enforces that no `(lab)` page bundle includes wagmi or rainbowkit modules. Build fails if violated.
- Shared `app/layout.tsx` provides next-intl provider, theme provider, base HTML structure — but no wallet provider.

### Stack versions (locked at scaffold time)
- next@^16.2 (App Router + PPR)
- react@^19 + react-dom@^19
- typescript@^5.6
- tailwindcss@^4
- @tailwindcss/postcss@^4
- shadcn/ui (Feb 2026 refresh — Tailwind v4 + React 19 compatible)
- wagmi@^2.14, viem@^2.21, @tanstack/react-query@^5
- @rainbow-me/rainbowkit@^2.2.11 (stay on v2 — RainbowKit v3 (for wagmi v3) not yet confirmed)
- next-intl@^4
- velite@latest (typed MDX content with Zod schemas)
- visx packages (Phase 3 install; Phase 1 reserves dependency slot)
- @vercel/mcp-handler@latest + @modelcontextprotocol/sdk@^1.26 (Phase 1 install; route handler scaffolded in Phase 4)
- vitest@^2 + @testing-library/react + playwright@^1.49 + msw@^2
- @axe-core/playwright
- @biomejs/biome@^1.9 (the official npm package; the older standalone `biome` package at v0.3.x is unrelated)
- lefthook@latest

### CI architecture
- **GitHub Actions** for the quality matrix; **Vercel** for build + deploy + preview URLs.
- Workflow `.github/workflows/ci.yml` with parallel jobs:
  - `lint` — `biome check .`
  - `typecheck` — `tsc --noEmit`
  - `test:unit` — `vitest run`
  - `test:e2e` — `playwright test --project=chromium` against Vercel preview URL (after Vercel deploy job completes)
  - `a11y` — `playwright test --project=axe`
  - `lighthouse` — `lhci autorun --collect.url=<preview-url> --assert.preset=lighthouse:recommended` with `Moto G Power` profile; LCP budget < 2.5s, TBT < 200ms
  - `impeccable` — `npx impeccable detect --fail-on-error`
- All jobs are **required for merge** to `main` from PR #1. No "warn-only" warm-up period.
- `vercel.json` configured for preview-per-PR with separate env scopes (Production / Preview / Development).
- Lighthouse runs against the Vercel preview, not local — captures real CDN behavior.

### Environment variable conventions
- `NEXT_PUBLIC_*` reserved exclusively for values safe to leak (chain IDs, public RPC URLs, WalletConnect project ID).
- RPC keys, AI provider API keys, HuggingFace tokens — **never** prefixed `NEXT_PUBLIC_`. All such reads go through server-side API routes.
- Env schema validated at build time via `@t3-oss/env-nextjs` (Zod-validated, build-fails-on-missing).
- `.env.example` committed; `.env.local` git-ignored.
- Vercel env vars set per scope (Production / Preview / Development); preview RPC URLs distinct from production.

### Wallet + chains config
- Chains configured in `lib/wagmi/chains.ts`: `celo` (primary), `mainnet`, `base`, `arbitrum`, `optimism`.
- **Multi-RPC fallback transport** per chain via viem `fallback([http(primary), http(secondary)])` to avoid single-RPC failure modes.
- ABI codegen via `@wagmi/cli` reading from `../abrigo/` Foundry artifacts. Output to `lib/contracts/generated.ts`. Codegen runs pre-build and pre-commit (lefthook hook).
- **wagmi config NOT imported from any `(lab)` page** — enforced by route group separation.
- WalletConnect project ID is `NEXT_PUBLIC_*` (safe to leak per WalletConnect docs).

### Velite content schema
- Iteration schema (strict, fail-build-on-missing):
  ```typescript
  status: z.enum(['PASS', 'FAIL', 'PARKED', 'IN_PROGRESS'])
  slug: z.string().regex(/^[a-z0-9-]+$/)
  version: z.number().int().positive()
  title_es: z.string()
  title_en: z.string()
  notebook_url: z.string().url()
  dataset_ref: z.string()
  analysis_date: z.coerce.date()
  replication_hash: z.string().regex(/^[a-f0-9]{64}$/)  // sha256
  beta: z.number().optional()
  ci_lower: z.number().optional()
  ci_upper: z.number().optional()
  p_value: z.number().min(0).max(1).optional()
  sample_size: z.number().int().positive().optional()
  disposition_memo: z.string().optional()  // required if status === 'FAIL' (refined)
  ```
- Schema enforces `disposition_memo` is required when `status === 'FAIL'` via `.refine()`.
- Content directory: `content/iterations/<slug>/v<n>.mdx`.
- Content pipeline CI sync (`abrigo` → `frontend/content/`) is scaffolded in Phase 1 but exercised in Phase 2 (just the GitHub Actions workflow file + sample iteration MDX).

### Agent-accessibility stubs (FOUND-12)
- `/llms.txt` (App Router route at `app/llms.txt/route.ts`) — returns plaintext: site title, license (MIT for content, copy from PROJECT.md), URL inventory of public entry points (`/`, `/iterations`, `/dashboard`, `/research`), pointer to MCP endpoint.
- `/.well-known/mcp.json` — minimal MCP discovery descriptor: server name, endpoint URL (`/api/mcp/sse`), declared `tools: []` (Phase 4 fills in).
- `/.well-known/openapi.yaml` — OpenAPI 3.1 stub describing `/api/health` (Phase 1 endpoint) and a placeholder for `/api/dashboard` / `/api/econometrics` / `/api/mcp` that Phase 3-4 populate.
- All three return real (not 404) responses by end of Phase 1 — proving infrastructure exists.
- JSON-LD `WebSite` + `Organization` schemas in the root layout via a `<StructuredData />` component.

### Test harness — initial coverage pattern
- Phase 1 ships **one example test per major surface** as templates for later phases:
  - `tests/e2e/homepage.spec.ts` — Playwright: homepage loads, language switcher works, a11y pass
  - `tests/unit/format.test.ts` — Vitest: `Intl` wrappers format COP and USD correctly
  - `tests/api/health.test.ts` — API route test for `/api/health`
  - `tests/architecture/no-wallet-in-lab.spec.ts` — Bundle assertion: `(lab)` pages do not include wagmi/rainbowkit
  - `tests/a11y/homepage.spec.ts` — axe-core scan of homepage
- MSW configured for fetch mocking in unit tests.
- Anvil fork-test harness is **scaffolded but not exercised** in Phase 1 (no contract reads yet). The pattern is in place for Phase 3.

### Phase 1 stub homepage (proves scaffold)
- Minimal content: site wordmark "d2p Finance" (no logo image yet — design Phase 2), one-line tagline pulled from PROJECT.md Core Value (translated both locales), iteration headline counts (hardcoded: 3 PASS, 2 FAIL, 1 PARKED, 1 IN_PROGRESS — sourced from PROJECT.md empirical-state snapshot), language switcher in header.
- No hero animation, no marketing CTA, no testimonials. **The placeholder must already obey impeccable** — no Inter, no purple gradients, no eyebrow chip, no oversized italic serif, no cards-in-cards.
- This page is deleted/replaced in Phase 2. Its job in Phase 1 is to prove the infrastructure.

### Pre-commit and Git hygiene
- `lefthook.yml` pre-commit: `biome check --staged`, `tsc --noEmit` (incremental), Velite content validation if MDX touched.
- Conventional Commits enforced via `commitlint` in lefthook `commit-msg` hook.
- `pnpm-lock.yaml` committed.
- `.editorconfig`, `.gitattributes` (LF line endings, binary handling) committed.

### Claude's Discretion
The planner has latitude on:
- Exact file/folder structure within `lib/` (e.g., `lib/wagmi/`, `lib/format/`, `lib/contracts/`, `lib/mcp-tools/` — names are suggestions, not requirements).
- Specific Biome rule customizations beyond the recommended preset.
- Exact `lefthook.yml` task ordering.
- Whether to start with `pnpm create next-app` and patch, or assemble from scratch — both yield the same outcome.
- Choice of stub homepage tagline copy (must still be authored, both locales).
- Exact theme provider choice (`next-themes` is fine, but a custom one is also fine).
- Whether to wire `@t3-oss/env-nextjs` in Phase 1 or just hand-roll Zod env parsing.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents (researcher + planner) MUST read these before planning or implementing.**

### Project-level specs
- `/home/jmsbpp/apps/d2p/frontend/.planning/PROJECT.md` — Vision, audiences, core value, constraints, key decisions
- `/home/jmsbpp/apps/d2p/frontend/.planning/REQUIREMENTS.md` §Foundation — FOUND-01 through FOUND-13
- `/home/jmsbpp/apps/d2p/frontend/.planning/REQUIREMENTS.md` §Cross-cutting — CROSS-01 through CROSS-10
- `/home/jmsbpp/apps/d2p/frontend/.planning/ROADMAP.md` §Phase 1 — Goal, success criteria, dependency graph

### Research artifacts
- `/home/jmsbpp/apps/d2p/frontend/.planning/research/STACK.md` — Locked stack choices with versions and rationale
- `/home/jmsbpp/apps/d2p/frontend/.planning/research/ARCHITECTURE.md` — Single-app layout, route groups, BFF placement, MCP route placement, build order
- `/home/jmsbpp/apps/d2p/frontend/.planning/research/FEATURES.md` — Feature taxonomy by audience; informs which scaffolds need stubs vs full impl
- `/home/jmsbpp/apps/d2p/frontend/.planning/research/PITFALLS.md` — 46 pitfalls including 15 impeccable anti-patterns, env var leakage, Edge+wagmi incompat, ISR cross-deploy cache — Phase 1 CI gates close every Phase-1-scoped pitfall
- `/home/jmsbpp/apps/d2p/frontend/.planning/research/SUMMARY.md` — Executive synthesis; the "audience-four split" framing and "agent-accessibility is a scaffold-phase decision" principle

### External skill / tool references (informative, not authored docs)
- `pbakaus/impeccable` GitHub repo — 7 reference docs (typography, color, spatial, motion, interaction, responsive, ux-writing) + 27 anti-pattern detector rules + CLI (`npx impeccable detect`)
- `buildermethods/design-os` GitHub repo — guided design process (used as authoring tool, not vendored)
- Vercel `mcp-handler` docs: https://vercel.com/docs/mcp (referenced for Phase 4 MCP server hosting; Phase 1 installs the dependency)
- next-intl v4 App Router docs: https://next-intl-docs.vercel.app/
- Tailwind v4 `@theme` reference: https://tailwindcss.com/docs/theme
- shadcn/ui Tailwind v4 install: https://ui.shadcn.com/docs/tailwind-v4
- viem chains reference (Celo `feeCurrency` notes for Phase 5 — informational for Phase 1)

### Sibling repo references (read-only consumption)
- `/home/jmsbpp/apps/d2p/abrigo/` — Python + notebooks (read-only from frontend perspective). Foundry artifacts path TBD — research synthesis flagged this as a spike for Phase 2; Phase 1 scaffolds the `@wagmi/cli` config with placeholder paths.
- GitHub: `https://github.com/wvs-finance` — org metadata for `/team` and `/research` pages in Phase 2

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **None.** Greenfield directory. `/home/jmsbpp/apps/d2p/frontend/` contains only `.git/`, `.claude/`, and `.planning/`.
- No prior frontend code in the org to import patterns from (verified via wvs-finance org scan — no other frontend repos).

### Established Patterns
- **From sibling `abrigo/`:** Uses `uv` for Python deps, `make data`/`make publish` for HuggingFace operations, anti-fishing discipline (decision-citation blocks, trio checkpoints). The frontend mirrors the discipline in CI (impeccable + axe + Lighthouse gates as the frontend's "anti-fishing" enforcement).
- **From wvs-finance org broadly:** Conventional Commits used in `ThetaSwap-core`, `reactive-hooks`. Frontend adopts the same.

### Integration Points
- **`@wagmi/cli` Foundry plugin** points to `../abrigo/` once contract artifacts location is confirmed (open question per research synthesis).
- **GitHub Actions workflow** for content sync (`abrigo/scratch/**` → `frontend/content/iterations/`) is scaffolded in Phase 1 with a placeholder source path; Phase 2 exercises it for real iterations.
- **Vercel project** must be created and linked before first PR — manual one-time step. The planner should call this out as a prerequisite.
- **GitHub repo** for `wvs-finance/frontend` (or similar) must exist; manual one-time step.

</code_context>

<specifics>
## Specific Ideas

- The user explicitly cited **`pbakaus/impeccable`** as the design discipline and **`buildermethods/design-os`** as the design process. Both are tools, not libraries — the frontend does not vendor them. Phase 1 installs the impeccable CLI for CI use only.
- Frontier-market audience priority: every Phase 1 CI gate (LCP budget, a11y, i18n keys) is calibrated for Colombian mobile reality, not US desktop. The Lighthouse profile is `Moto G Power` on simulated 3G, not desktop high-end.
- User's "agent-first" observation locks `/llms.txt`, `/.well-known/mcp.json`, `/.well-known/openapi.yaml`, and root-level JSON-LD as Phase 1 deliverables — they cost almost nothing at scaffold time and are extremely expensive to retrofit (PITFALLS.md item 7).
- Epistemic-honesty discipline carries from `abrigo-analytics` into the frontend: status colors get equal contrast, no de-emphasis of FAIL — enforced at the design-token layer (Phase 1) AND the data-model layer (Velite schema, Phase 1) so Phase 2 cannot bypass it.

</specifics>

<deferred>
## Deferred Ideas

- **Pagefind full-text search index** — Phase 1 installs nothing; Phase 2+ may add it once iteration content exists. Noted in v2 requirements (SEARCH-01).
- **Sentry / Bugsnag observability** — Not in v1 requirements; consider after first real traffic data lands.
- **PostHog / Plausible analytics** — Not in v1 requirements; consumer-style analytics conflicts with epistemic-honesty tone. Defer to post-hackathon discussion.
- **Storybook for component isolation** — Useful but premature given the 3-week timeline. Re-evaluate after Phase 2 ships and component library has shape.
- **Chromatic visual regression** — Same as Storybook; defer.
- **Service worker / PWA install** — Mentioned in PROJECT.md as a possible web-bridge-to-native path; defer until v2 milestone.
- **Real wagmi config for `../abrigo/` Foundry artifacts** — Path/artifact format needs confirmation per research synthesis open question. Phase 1 scaffolds with placeholder; Phase 2 spike resolves it before Phase 3 codegen runs for real.
- **Multi-region Vercel deployment** — Defer until traffic data justifies it.

</deferred>

---

*Phase: 01-foundation-and-scaffold*
*Context gathered: 2026-05-11*
