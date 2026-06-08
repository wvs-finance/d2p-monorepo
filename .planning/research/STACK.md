# Stack Research

**Domain:** Agent-first DeFi research-lab frontend (multi-modal: research site + live dashboards + MCP/agent API + wallet-connected DeFi app)
**Researched:** 2026-05-11
**Confidence:** HIGH (core framework, wallet layer, styling) / MEDIUM (indexer, charting, monorepo cross-language)

---

## Decision Matrix: Why These Choices for This Use Case

Before the tables, the architecture constraint that drives everything:

> This app is 60% static/SSR content (research lab presence, iteration catalog, econometric results) and 40% client-only interactive state (wallet connection, on-chain reads, transact paths, MCP tool surface). That split means RSC + streaming for the static majority, and a clean "client island" boundary for wallet state. Next.js 16 App Router is the only framework that handles this split natively in 2026 without architectural gymnastics.

---

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Next.js | 16.2 (March 2026) | Full-stack React framework | Only framework with first-class RSC + MCP server hosting + Vercel PPR stable + Turbopack in one package. React 19 support. Partial Prerendering (PPR) graduated stable in Next.js 16, enabling static shell + dynamic streaming per route — exactly what the iteration catalog and dashboard pages need. Vercel's `mcp-handler` and the built-in `/_next/mcp` endpoint (Next.js 16+) make agent surface a zero-friction add. No other framework provides all four: RSC boundaries, streaming, edge runtime, and MCP endpoint support on the same Vercel deployment. |
| React | 19.x (bundled with Next.js 16) | UI runtime | wagmi/viem/RainbowKit are React-specific; Svelte/Solid would mean rebuilding the entire DeFi wallet ecosystem. React 19 Compiler removes memoization boilerplate and its concurrent features pair well with on-chain async reads. |
| TypeScript | 5.8.x | Type safety | End-to-end type inference from Solidity ABI → wagmi → component props. Not optional for this codebase given the complexity of ABI-derived types. |

**Why NOT SvelteKit or Remix:**
- SvelteKit: Svelte ecosystem has zero first-class wallet connectors (RainbowKit, wagmi, ConnectKit are all React-only). You would need to wrap everything or use framework-agnostic adapters that sacrifice type inference. The DeFi React ecosystem is non-negotiable.
- Remix (now React Router v7): Good routing model, but no RSC, no MCP endpoint, no PPR. The hybrid static+dynamic rendering model requires manual implementation. Not worth the migration friction for a hackathon timeline.
- Astro: Static-site-focused. On-chain hydration patterns are awkward. Not built for real-time dashboard data or wallet state as primary content.

**Why NOT pure client-side SPA (Vite + React):**
- No SSR means Google/agent crawlers see blank HTML. The research-lab presence and iteration catalog are the most important agent-consumable surfaces and require rendered HTML at the URL.

---

### Wallet Stack

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| wagmi | 2.x (2.14+, note: v3 exists at 3.6.11 but RainbowKit 2.x hasn't shipped v3 support yet) | React hooks for EVM | The standard. TanStack Query v5 under the hood; multichain config via `chains` array; EIP-6963 auto-detection. Stay on v2 until RainbowKit confirms v3 compatibility. |
| viem | 2.x | Low-level EVM client | wagmi v2 peer. Type-safe contract reads/writes via ABIType. Replaces ethers.js. multicall via `multicall` action. |
| @tanstack/react-query | 5.x | Async state for on-chain reads | Required peer of wagmi v2. Handles caching, background refetch, stale-while-revalidate for RPC calls without custom state management. |
| @rainbow-me/rainbowkit | 2.2.11 | Wallet connection UI | Best-in-class wallet connection UX for EVM; EIP-6963 auto-discovery; mobile-first UI; direct Celo chain support via `viem/chains`; customizable theme tokens that map to the design system. Celo is in viem's chain registry (`celo` from `viem/chains`) — no custom adapter needed. |

**RainbowKit vs. alternatives:**

- **Reown AppKit (formerly WalletConnect)**: Version ~1.8.x on `@reown/appkit-adapter-wagmi`. Better for multi-ecosystem (EVM + Solana + Bitcoin). For this project, pure EVM + Celo, the added complexity of AppKit's multi-adapter architecture is not justified. AppKit's UX customization is less mature than RainbowKit's. Use AppKit only if Solana support becomes a requirement.
- **ConnectKit (Family)**: Polished but locked to the Family ecosystem. Customization limited. Good for product studios that want out-of-the-box design; worse for a lab that controls its own design system.
- **Privy / Dynamic**: Account-abstraction / email-login focused. Out of scope — this protocol is permissionless, no custodial onboarding.

**Celo note:** `viem/chains` exports `celo` (Celo mainnet) and `celoAlfajores` (testnet). Pass them to the wagmi `createConfig` chains array. RainbowKit renders them without modification.

---

### On-Chain Data Layer

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| viem multicall | 2.x (via wagmi) | Batch on-chain reads | For live dashboard reads (pool state, positions, settlement status), batch all reads into a single RPC round trip via `multicall`. No external service needed for small contracts. Zero infra cost. Use as the primary data source for real-time reads. |
| wagmi `useReadContracts` | 2.x | React hook for batched reads | Thin wrapper over viem multicall with TanStack Query caching. Start here. |
| Ponder | 0.9+ (latest stable) | Local TypeScript EVM indexer | For the Abrigo iteration catalog (historical events, settlement logs, iteration state transitions), Ponder provides: type-safe event handlers in TypeScript, local dev with hot reload, SQLite → Postgres output, GraphQL + SQL over HTTP, Railway/Render deploy. **Use Ponder for any queries that require historical event aggregation** (e.g., "all PASS iterations since contract deploy"). Self-hosted on Railway next to the frontend. 10x faster than The Graph from cold start for targeted contracts. |
| Envio HyperIndex | latest | Managed high-throughput indexer | If historical sync speed becomes a bottleneck (157x faster than Ponder in benchmarks for Uniswap V2 scale). Not needed at launch for Abrigo scale. Evaluate in Phase 2 if Ponder hits RPC rate limits. |

**What NOT to use:**
- The Graph hosted service: deprecated; migrate path is messy. Use Ponder locally or Goldsky as managed Graph-compatible alternative.
- Goldsky: Good for event pipelines and backfills, but it offloads reorg handling to you. More infrastructure than needed for this scale.
- Custom tRPC + ethers.js BFF: The combination of wagmi multicall + Ponder eliminates the need for a custom BFF for on-chain data.

---

### Styling and Design System

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Tailwind CSS | v4.x (4.1+) | Utility CSS | CSS-first theming wins in 2026. `@theme` directive + OKLCH color system. No JS runtime. Pairs directly with the `impeccable` design discipline: you build design tokens in CSS, not in component props or a JS config file. Tailwind v4's `@import "tailwindcss"` and zero-config scanning removes the v3 config sprawl. |
| CSS custom properties (via Tailwind @theme) | native | Design tokens | Define the design system as CSS variables scoped via Tailwind's @theme block. `impeccable` outputs (spacing scale, type scale, color palette) map directly here. No JS-in-CSS runtime overhead. |

**CSS-in-JS / alternatives rejected:**
- `vanilla-extract` / `Panda CSS`: Add build complexity and type-gen steps. The `impeccable` design authoring tool produces spatial and color tokens that are trivially expressed as CSS variables — no need for a typed CSS-in-JS layer.
- `styled-components` / `emotion`: Runtime CSS injection is incompatible with RSC (server components cannot run JS). Hard no.
- Inline Tailwind without a design system: Violates `impeccable` anti-pattern #3 (utility sprawl without spatial system). Every spacing value must come from the token scale.

---

### Component Primitives

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| shadcn/ui | latest (Feb 2026 refresh, Tailwind v4 + React 19 compatible) | Copy-paste component primitives | Not a dependency — components are inlined into the codebase and owned. Tailwind v4 officially supported. Radix UI and Base UI are both available as primitive layers (shadcn switched to support both after Radix slowed post-WorkOS acquisition). Provides: Dialog, Dropdown, Select, Tooltip, Table, Tabs — all WCAG 2.2 AA compliant via Radix/Base UI semantics. Fully compatible with custom Tailwind v4 theme tokens. |
| Radix UI Primitives | 1.x (via shadcn) | Accessible headless primitives | Under the hood of shadcn's Radix track. Battle-tested keyboard navigation and ARIA — required for WCAG 2.2 AA. |

**What NOT to use:**
- **Material UI (MUI)**: Hard no. Opinionated visual system incompatible with `impeccable` discipline. Ships its own Emotion-based CSS-in-JS (RSC-incompatible). "SaaS template slop" as described in the brief.
- **Chakra UI**: Same RSC problem. Runtime theme resolution.
- **DaisyUI**: Good for rapid prototypes, but theme system conflicts with custom design tokens; the visual language is pre-opinionated.
- **Framer Motion (heavy use)**: Explicitly called out as an `impeccable` anti-pattern. Use CSS transitions and the `motion` package (Framer's micro-library, ~5KB) only for layout transitions. Zero hero animations, zero scroll-triggered entrances.
- **Park UI / Ark UI**: Built on Chakra Ark — interesting primitives but the Chakra lineage brings runtime CSS overhead. Radix via shadcn is the more stable path.

---

### Data Visualization (Econometric Charts)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Visx | 3.x (@visx/\*) | Statistical/econometric charts | For β estimates, confidence bands, time-series panels, and scatter plots with regression overlays — Visx provides D3-level control with React integration. Modular (~15KB per package imported). Used by Airbnb for production dashboards. Better for custom statistical chart types than Recharts (which is too opinionated about chart structure). **Confidence bands, CI shading, and custom axis formatting require low-level primitives — Visx is the right level of abstraction.** |
| Observable Plot | 0.6+ | Exploratory/supplementary charts | Mike Bostock's "shorthand for D3." Use for iteration-catalog summary charts where concise declarative code matters over pixel-perfect control. Integrates with React via `useEffect` + ref pattern. Not a replacement for Visx on the dashboard — use it for the research-paper embedded charts. |

**What NOT to use:**
- **Recharts**: Higher-level abstractions get in the way of confidence band rendering and custom axis formatting needed for econometric output. Fine for simple line/bar charts but wrong abstraction for β estimate panels.
- **ECharts**: ~1MB bundle. Overkill for this use case. The dual canvas/SVG engine matters at 100K+ data points, not for econometric panel data.
- **TradingView Lightweight Charts**: Optimized for OHLC/candlestick financial charts. Wrong domain — Abrigo outputs are regression coefficients, not tick data.
- **Chart.js / React-Chartjs-2**: Designed for business dashboards. No primitives for confidence intervals or regression overlays.
- **D3 directly**: Possible, but Visx eliminates 70% of the SVG scaffolding boilerplate while keeping D3-level control. Don't write raw D3 in a React RSC codebase.

---

### i18n

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| next-intl | 4.x (2026 current) | Spanish + English i18n | Purpose-built for Next.js App Router. Translations load in Server Components with zero hydration overhead. Middleware-based locale detection. Named message formatting (ICU). 1.8M weekly downloads. The only i18n library with first-class RSC support where translation lookups happen at server render time — critical for LCP on 3G. |

**Alternatives:**
- `react-i18next` / `i18next`: 8.9M weekly downloads but no native RSC wrapper. Requires manual wiring for App Router. Use only if you need the i18next plugin ecosystem (Crowdin, Phrase integrations). Overkill for a two-language launch.
- `Lingui`: Best bundle size (inline extraction workflow). Valid alternative if perf matters more than App Router DX. Would require more setup for the RSC pattern.

---

### Content Layer (Research Papers / Iteration Write-ups)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Velite | 0.3+ | Type-safe local content layer | MDX + YAML + JSON → typed TypeScript collections via Zod schema. Zero external CMS dependency. Iteration write-ups, paper abstracts, and team bios live as `.mdx` files in the repo — Velite validates at build time and generates typed collections. Next.js 16 native integration. No build-step complexity beyond `velite build`. The PASS/FAIL/PARKED status field on iterations becomes a typed enum in the Zod schema — compile-time enforcement of the epistemic-honesty constraint. |
| MDX | 3.x (via Velite) | Richer research content | Import React components (charts, interactive elements) inline in research write-ups. The econometric charts (`@visx/*`) can be embedded directly in MDX paper pages. |

**What NOT to use:**
- **Sanity / Contentful / Notion as CMS**: Adds an external service dependency, editor workflow complexity, and API latency on content that belongs in the repo. For a research lab with a technical team, Git-based content is the right model.
- **Contentlayer**: Archived in 2024. Use Velite (its spiritual successor with active maintenance).
- **Pandoc → static HTML**: Fine for PDF generation but wrong format for interactive React pages with embedded charts.

---

### Auth (SIWE — minimal, optional)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| siwe | 3.x | Sign-In With Ethereum (EIP-4361) | The protocol is permissionless — no auth needed for reading. Implement SIWE only if a "my positions" personalized view or MCP authentication becomes a Phase 2 requirement. Use `iron-session` for cookie-based session storage. Do NOT use NextAuth.js for this — SIWE + iron-session is 50 lines of App Router route handler with zero additional dependencies. |

**Defer auth entirely for Phase 1.** Read-only wallet state from wagmi (connected address, balance, positions) does not require a server-side session.

---

### Agent/MCP Surface

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `mcp-handler` (Vercel) | latest | MCP server in Next.js App Router | Vercel's official adapter. A single API route at `/api/mcp/route.ts` becomes a full Streamable HTTP MCP server. Zero additional infrastructure. Supports OAuth for secured endpoints. Fluid Compute handles bursty AI agent traffic patterns efficiently. Vercel docs (updated 2026-02-17) confirm production readiness. |
| Zod | 3.x | MCP tool input schema validation | Tool input schemas defined with Zod pass directly to `server.tool()`. Same Zod schemas used for content validation (Velite) and API input validation — single schema language across the codebase. |
| JSON-LD structured data | native | Semantic markup for crawlers + agents | Embed `application/ld+json` scripts on iteration pages with `schema.org/Dataset` or custom vocabulary for instrument terms. Enables LLM-based agents to extract structured iteration state without tool calls. |
| OpenAPI spec | 3.1 | Machine-readable API surface | Generate from route handlers using `zod-openapi` or `hono/zod-openapi`. Expose at `/.well-known/api.json`. Enables agent discovery of available endpoints. |

---

### Testing

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Vitest | 3.x | Unit + integration tests | Replaces Jest. ESM-native, runs in Node without a build step, shares tsconfig with the app. Used for: hook logic, Velite schema validation, utility functions, Zod schema shape tests. |
| Playwright | 1.50+ | E2E tests | Browser automation for the full user journey. Playwright's `page.route()` intercepts can mock RPC responses without a real chain. Critical path: landing page LCP measurement, wallet connection flow (mock), iteration catalog rendering. |
| MSW (Mock Service Worker) | 2.x | API mocking in tests | Intercept RPC/HTTP calls in both Vitest (Node handler) and Playwright (browser handler). Used to mock: on-chain read responses, Ponder GraphQL queries, econometric data from HuggingFace. |
| Anvil (Foundry) | latest | Local EVM fork for E2E | Fork Celo mainnet at a fixed block for integration tests of the transact path. Used with Playwright: spin up Anvil, point wagmi's transport at `http://127.0.0.1:8545`, simulate instrument interactions. Only needed for transact-path tests in Phase 2. |
| `@wagmi/test` | 2.x | wagmi hook testing utilities | Official test utilities for wagmi hooks. Provides mock connectors and simulated chain state. Use in Vitest for hook-level tests without a browser. |

---

### Hosting

**Recommendation: Vercel (Hobby tier at launch, Pro when preview-per-PR is needed)**

| Platform | Pros | Cons | Verdict for this project |
|----------|------|------|--------------------------|
| **Vercel** | Built Next.js; best-in-class RSC/PPR/Edge middleware support; `mcp-handler` is first-party; preview per PR is their core feature; Fluid Compute for MCP bursty traffic; Speed Insights built-in | Cost scales with traffic; Pro plan needed for team preview deployments | **Primary choice.** The MCP surface is first-party on Vercel. PPR stable only on Vercel at launch. Preview-per-PR is zero-config. |
| Cloudflare Pages | 300+ PoPs globally (better LatAm edge); much cheaper at scale; Workers V8 isolates <5ms cold start | OpenNext adapter still has edge cases with latest Next.js 16 App Router RSC patterns; less polished preview UX; MCP server requires custom Workers setup | **Evaluate in Phase 2** if Vercel costs become a constraint after launch. Cloudflare's LatAm edge density (Colombia specifically) is a real LCP advantage for the frontier-market target. |
| Netlify | Mature CI/CD; good edge functions | Lags Vercel on Next.js 16 support; MCP deployment requires custom setup; no Fluid Compute equivalent | Not recommended. |
| Railway | Good for Ponder indexer deployment | Not suited for Next.js edge SSR + MCP combination | Use Railway only for the Ponder sidecar indexer. |

**Architecture note:** Host the Next.js app on Vercel. Host the Ponder indexer as a separate Railway service. Pass the Ponder GraphQL endpoint as an env var to the Next.js app. This keeps the indexer stateful workload off Vercel's stateless functions.

---

### Monorepo Tooling

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| pnpm | 9.x | Package manager + workspace protocol | Strict dependency isolation; `workspace:*` protocol for cross-package references; 3x faster than npm installs; disk-efficient content-addressable store. Use for the `d2p` monorepo root. |
| Turborepo | 2.x | Build orchestration + caching | `^build` dependency notation ensures shared type packages build before consuming apps. Remote caching on Vercel CI. Minimal config for this scale. |

**Python ↔ TypeScript type sharing (`abrigo` ↔ `frontend`):**

The `abrigo` Python codebase produces econometric outputs (β estimates, p-values, confidence intervals) as JSON. The bridge:

1. Define a JSON Schema for the econometric output format in `abrigo` (Pydantic model → `model.schema()` export)
2. Generate TypeScript types from the JSON Schema using `json-schema-to-ts` or `quicktype`
3. Validate at runtime on the frontend with Zod (generate from JSON Schema using `zod-from-json-schema`)

This makes Python-to-TypeScript type sharing explicit and versioned without a live gRPC/Protobuf setup.

---

### Contract-to-TypeScript Type Generation

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `@wagmi/cli` | 2.x | ABI → TypeScript types + React hooks | The current standard for Solidity → TypeScript. Plugins: `foundry` (resolves ABIs from the `abrigo` sibling Foundry project), `react` (generates type-safe `useReadContract`/`useWriteContract` wrappers). Run `wagmi generate` in CI after contract compilation. Replaces TypeChain entirely. |
| ABIType (built into viem/wagmi) | bundled | Runtime ABI type inference | Zero-config — viem infers types from `as const` ABI arrays at compile time. No codegen needed for simple contracts. Use `@wagmi/cli` codegen for complex multi-contract ABIs. |

**TypeChain is deprecated for this stack.** It predates viem's ABIType-based inference and generates ethers.js types, which are incompatible with the viem/wagmi v2 API.

---

## Installation (scaffold commands)

```bash
# Core framework
pnpm create next-app@latest frontend --typescript --tailwind --app --turbopack

# Wallet stack
pnpm add wagmi@^2 viem@^2 @tanstack/react-query@^5 @rainbow-me/rainbowkit@^2

# MCP surface
pnpm add mcp-handler zod

# Content layer
pnpm add velite

# i18n
pnpm add next-intl

# Charts
pnpm add @visx/group @visx/shape @visx/scale @visx/axis @visx/grid @visx/tooltip

# Component primitives (shadcn CLI — inlines components, not a dep)
pnpm dlx shadcn@latest init

# Contract type generation
pnpm add -D @wagmi/cli

# Dev dependencies
pnpm add -D vitest @vitejs/plugin-react playwright msw @wagmi/test

# Monorepo (at d2p root)
pnpm add -D turbo
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Next.js 16 App Router | Remix / React Router v7 | If the product were purely a wallet-connected DApp with no static content or agent API surface. Remix's nested routes are excellent for the dashboard UX but you lose PPR, MCP endpoint, and RSC. |
| wagmi v2 + RainbowKit v2 | Reown AppKit | If multi-ecosystem (EVM + Solana + Bitcoin) is a requirement. AppKit's multichain support is superior but adds complexity not justified for Celo-first EVM. |
| Ponder (self-hosted) | Goldsky or The Graph | If you want fully managed indexing and are willing to pay. Goldsky is The Graph with better performance and SQL access — valid when team bandwidth for infra is zero. |
| Visx | Recharts | If charts are limited to standard line/bar/area with no custom statistical overlays. Recharts is faster to implement for simple charts. |
| Velite | Sanity | If non-technical team members need to author content via a CMS UI. For a research lab with a technical team, Git-based Velite is simpler and more auditable. |
| next-intl | Lingui | If bundle size is the absolute priority and you want inline translation extraction. Lingui produces smaller bundles but requires more App Router setup. |
| Vercel | Cloudflare Pages | After launch, if LatAm LCP benchmarks show meaningful advantage from Cloudflare's denser edge (300+ PoPs vs Vercel's ~20 edge regions). Migration to Cloudflare via OpenNext is straightforward once the Next.js 16 adapter stabilizes. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Material UI (MUI) | Emotion-based CSS-in-JS is RSC-incompatible; imposes Google Material visual language that conflicts with `impeccable` design system; "SaaS template slop" | shadcn/ui + Radix + Tailwind v4 |
| Framer Motion (heavy use) | Explicit `impeccable` anti-pattern: scroll-triggered entrances, hero animations, layout animations on first paint destroy LCP on 3G mid-range Android. The library itself is 50KB+ | CSS transitions; `motion` micro-library (5KB) only for deliberate layout transitions |
| Inter as default typeface | `impeccable` anti-pattern #1: Inter-for-everything signals template default, not design intent | Choose a type pairing via `impeccable` type-system commands during design phase |
| Purple-to-blue gradients | `impeccable` anti-pattern #7: crypto/SaaS visual cliché | Flat, system-color backgrounds; accent color from the OKLCH token palette |
| react-three-fiber / Three.js hero | `impeccable` anti-pattern: 3D hero animations are explicitly out-of-scope in PROJECT.md and violate mobile-first LCP constraint | Typography + data visualization as visual anchors |
| TypeChain | Superseded by wagmi/viem ABIType inference. Generates ethers.js types incompatible with viem v2. | `@wagmi/cli` with foundry plugin |
| ethers.js v5 | Incompatible with wagmi v2. Requires ethers v6 if mixing; better to stay entirely in viem. | viem v2 |
| Contentlayer | Archived 2024. No longer maintained. | Velite |
| react-i18next (for App Router) | No native RSC integration. Translations hydrate client-side, adding to LCP. | next-intl |
| NextAuth.js for SIWE | 500+ KB for a 50-line SIWE implementation. Overkill. Adds an auth database requirement to a permissionless protocol. | siwe + iron-session (Phase 2 only, when needed) |
| Card-nested-in-card layout patterns | Explicit `impeccable` anti-pattern. Spatial hierarchy must come from typography and white space, not nested shadow boxes. | Flat spatial hierarchy via Tailwind spacing scale |
| Gray text on colored backgrounds | `impeccable` anti-pattern: fails WCAG contrast ratios on colored surfaces | `text-foreground` / `text-muted-foreground` tokens on neutral backgrounds only |
| Zustand / Redux for wallet state | wagmi + TanStack Query already provides reactive on-chain state with caching. Adding a second state layer creates sync bugs. | wagmi hooks as the single source of truth for on-chain state |

---

## Version Compatibility Matrix

| Package | Version | Compatible With | Notes |
|---------|---------|-----------------|-------|
| `wagmi` | ^2.14 | `viem@^2`, `@tanstack/react-query@^5`, `react@^18\|^19` | Stay on v2; RainbowKit 2.x has not yet shipped wagmi v3 support (v3 at 3.6.11 exists but pairing is unconfirmed) |
| `@rainbow-me/rainbowkit` | ^2.2.11 | `wagmi@^2`, `viem@^2`, `react@^18\|^19` | Confirmed current stable |
| `next` | ^16.2 | `react@^19`, `react-dom@^19` | Turbopack enabled by default; PPR stable |
| `tailwindcss` | ^4.1 | `postcss@^8` (optional in v4) | v4 uses native CSS cascade; no `tailwind.config.js` required |
| `shadcn/ui` (CLI) | latest (Feb 2026) | `tailwindcss@^4`, `react@^19`, `radix-ui@^2` or `@base-ui-components/react` | Tailwind v4 + React 19 officially supported |
| `next-intl` | ^4 | `next@^16`, `react@^19` | App Router middleware locale detection |
| `velite` | ^0.3 | `next@^15\|^16`, `zod@^3` | Build-time content processing; works as a Next.js plugin |
| `mcp-handler` | latest | `next@^14\|^15\|^16` | Vercel's adapter; confirmed Next.js App Router compatible |
| `@visx/*` | ^3 | `react@^18\|^19`, `d3@^7` | Modular; import only needed sub-packages |
| `ponder` | ^0.9 | Node.js 20+, Postgres (prod) / SQLite (dev) | Deploy separately on Railway; expose GraphQL at env var URL |
| `@wagmi/cli` | ^2 | `wagmi@^2`, `foundry` (for ABI plugin) | Run `wagmi generate` post Foundry build |

---

## Stack Patterns by Scenario

**For the research-lab marketing pages (audience: external researchers, agents):**
- Use RSC (Server Components) exclusively. No `"use client"` on these pages.
- Embed JSON-LD `application/ld+json` for structured data (iteration status, paper metadata).
- Serve translated content server-side via next-intl's server API (`getTranslations()`).
- Target: Static generation with PPR revalidation for iteration status updates.

**For the Abrigo iteration catalog (audience: all four):**
- Generate pages from Velite collections at build time (`generateStaticParams`).
- Embed Visx charts as client islands (`"use client"`) within RSC page shells.
- Iteration state (PASS/FAIL/PARKED) is a Zod-validated enum in the Velite schema — render with equal visual weight.
- Expose each iteration URL as a structured MCP resource endpoint.

**For the live on-chain dashboard (audience: protocol participants + internal):**
- Client component boundary at the dashboard shell level.
- `useReadContracts` (wagmi) for batched multicall reads; refresh interval 12s (1 Celo block).
- Ponder GraphQL for historical event queries (settlement history, LP position changes).
- No SSR of wallet state — wallet is client-only.

**For the MCP/agent surface (audience: AI agents):**
- `app/api/mcp/route.ts` via `mcp-handler`.
- Tools: `get_iteration_status`, `get_instrument_terms`, `get_on_chain_positions`, `list_iterations`.
- Tool inputs validated with Zod (same schemas as content validation).
- `/.well-known/api.json` — OpenAPI 3.1 spec for HTTP tool discovery.
- JSON-LD on all iteration pages for zero-tool-call structured data access.

**For the wallet-connected transact path (audience: protocol participants):**
- `"use client"` component with `useAccount`, `useWriteContract` from wagmi.
- Transact path behind explicit safety review gate (Phase 2 only).
- SIWE session for "my positions" view if personalization becomes a requirement.

---

## Sources

- [Next.js 16.2 release blog — nextjs.org](https://nextjs.org/blog) — Next.js 16.2 confirmed current (March 2026); PPR stable in 16.0
- [Vercel MCP docs — vercel.com/docs/mcp](https://vercel.com/docs/mcp/deploy-mcp-servers-to-vercel) — MCP on Next.js App Router via `mcp-handler`, updated 2026-02-17
- [wagmi npm — npmjs.com/package/wagmi](https://www.npmjs.com/package/wagmi) — v3.6.11 current; v2.14+ also maintained
- [wagmi migrate v2→v3 — wagmi.sh](https://wagmi.sh/react/guides/migrate-from-v2-to-v3) — v3 migration guide exists; RainbowKit v2 compat unconfirmed
- [RainbowKit docs — rainbowkit.com](https://rainbowkit.com/en-US/docs/installation) — v2.2.11 confirmed current; wagmi v2 peer
- [Reown AppKit blog — reown.com](https://reown.com/blog/how-to-get-started-with-reown-appkit-on-celo) — Celo + AppKit confirmed
- [shadcn/ui Tailwind v4 docs — ui.shadcn.com](https://ui.shadcn.com/docs/tailwind-v4) — Tailwind v4 + React 19 officially supported
- [Ponder docs — ponder.sh](https://ponder.sh/docs/why-ponder) — TypeScript EVM indexer; hot reload; self-hosted
- [Envio blockchain indexer comparison 2026 — docs.envio.dev](https://docs.envio.dev/blog/blog/best-blockchain-indexers-2026) — Envio 15x faster than Subsquid, 158x faster than Ponder at Uniswap V2 scale
- [next-intl vs i18next 2026 — trybuildpilot.com](https://trybuildpilot.com/910-next-intl-vs-i18next-vs-lingui-2026) — next-intl for App Router; 1.8M weekly downloads
- [Vercel vs Cloudflare 2026 — contracollective.com](https://contracollective.com/blog/vercel-vs-cloudflare-pages-edge-deployment-2026) — Cloudflare better for LatAm/Asia edge; Vercel better for Next.js DX
- [wagmi CLI docs — wagmi.sh/cli](https://wagmi.sh/cli/getting-started) — Foundry plugin for ABI → TypeScript codegen
- [Velite MDX guide — velite.js.org](https://velite.js.org/guide/using-mdx) — type-safe MDX content collections
- [Visx GitHub — github.com/airbnb/visx](https://github.com/airbnb/visx) — modular D3+React viz primitives; Airbnb production use

---

*Stack research for: d2p Finance / DS2P Labs — d2p/frontend (agent-first DeFi research-lab frontend)*
*Researched: 2026-05-11*
