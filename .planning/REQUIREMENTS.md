# Requirements: d2p Finance Frontend (d2p/frontend)

**Defined:** 2026-05-11
**Core Value:** Make the lab's research outputs and live hedging instruments accessible — to humans browsing, to participants transacting, and to AI agents consuming — through a single coherent surface that treats agent-first interaction as a primary design constraint.

## v1 Requirements

Requirements for the first shippable milestone — aligned to the Uniswap Hook Incubator Cohort 9 Hookathon demo window (~June 2, 2026, ~3 weeks).
Each maps to exactly one phase in the roadmap.

### Foundation

- [x] **FOUND-01**: Next.js 16.2 App Router project scaffolded with TypeScript, deploys to Vercel preview-per-PR
- [x] **FOUND-02**: Tailwind v4 + shadcn/ui (Feb 2026) installed with OKLCH-based design tokens; `impeccable` design tokens authored in `app/globals.css` via `@theme`
- [x] **FOUND-03**: next-intl v4 i18n infrastructure for `es-CO` (Colombian Spanish, primary) and `en` (secondary); translations resolved at RSC render time
- [x] **FOUND-04**: Velite content pipeline with typed iteration schema — `status` is a compile-time enum `'PASS' | 'FAIL' | 'PARKED' | 'IN_PROGRESS'`, `notebook_url`, `dataset_ref`, `analysis_date`, `replication_hash` are required fields
- [x] **FOUND-05**: wagmi v2 + viem v2 + @tanstack/react-query v5 configured with Celo mainnet (primary), Ethereum mainnet, Base, Arbitrum, Optimism; multi-RPC fallback transport per chain
- [x] **FOUND-06**: wagmi CLI codegen pipeline reads contract ABIs from `../abrigo/` Foundry artifacts and emits typed TS contract clients
- [x] **FOUND-07**: `impeccable detect --fail-on-error` runs in CI on every PR; build fails on any detected anti-pattern
- [x] **FOUND-08**: Lighthouse CI performance budget enforces LCP < 2.5s on Moto G Power simulated 3G profile; budget runs on every PR preview
- [x] **FOUND-09**: axe-core accessibility tests run in CI; build fails on any WCAG 2.2 AA violation
- [x] **FOUND-10**: Vercel environment variables configured for Production, Preview, Development scopes with explicit naming convention (`NEXT_PUBLIC_*` only for safe-to-leak values)
- [x] **FOUND-11**: Route group layout structure — `(lab)`, `(dashboard)`, `(defi)` — with RSC pages in `(lab)` never hydrating wallet state
- [x] **FOUND-12**: Agent-accessibility scaffold in place from day one: `/llms.txt`, `/.well-known/mcp.json`, `/.well-known/openapi.yaml` stub, JSON-LD `Article` and `Dataset` schemas on every content page
- [x] **FOUND-13**: Vitest + Playwright + MSW test infrastructure with hooks for chain mocking via anvil fork

### Umbrella Navigation (highest priority — establishes the labs/apps architecture)

- [x] **NAV-01**: Persistent top navigation bar present on every page (umbrella + every `/apps/<x>/...`) with a primary **Apps dropdown** menu item
- [x] **NAV-02**: Apps dropdown content is data-driven from a typed `lib/apps/registry.ts` file (array of `{ slug, name, description, status, internal_path, external_url }`); adding a new app is a one-line registry change with NO IA / nav restructuring
- [x] **NAV-03**: Apps dropdown today contains exactly one entry: **Abrigo** with name, one-line description ("Convex hedges for Colombian wage-earners — ∂²Π gamma"), status badge "Active" (color + icon + text per CROSS-09), primary link to `/apps/abrigo`
- [x] **NAV-04**: Each Apps dropdown entry shows a secondary external-link affordance (icon-only, opens in new tab); Abrigo's secondary points to https://x.com/d2pfinabrigo
- [x] **NAV-05**: Apps dropdown is keyboard-navigable (Tab focuses, Enter/Space opens, ArrowDown/ArrowUp cycle entries, Enter activates, Escape closes); announces "Apps menu, N entries" + per-entry "Abrigo, active, of N" to screen readers
- [x] **NAV-06**: Apps dropdown closes on outside click, Escape, route change, and focus-out; never traps focus
- [x] **NAV-07**: Top nav surfaces (in addition to Apps) the lab umbrella links: Research, Team, About, plus the language switcher; on mobile (<768px) the nav collapses to a single menu drawer that contains the Apps dropdown as a nested section
- [x] **NAV-08**: `/apps` index page lists all apps (today: Abrigo) with the same registry-driven content; serves as the canonical URL agents can scrape if they don't read the dropdown HTML

### Research Lab Presence (umbrella scope — NOT scoped to Abrigo)

- [x] **LAB-01**: Lab umbrella homepage at `/` renders mission statement, "What is d2-π" explainer, current Apps overview (today: Abrigo as the sole active app — preview card linking into `/apps/abrigo`), cross-app iteration headline counts (Pass / Fail / Parked / In Progress, aggregated across all apps — currently equals Abrigo's), and links to wvs-finance GitHub org + parent DS2P Labs
- [x] **LAB-02**: Team / contributors page at `/team` lists contributors with role, GitHub link, and current iteration ownership
- [x] **LAB-03**: Publications page at `/research` indexes papers, decision memos, and iteration write-ups synced from `../abrigo/` `scratch/` and `docs/`
- [x] **LAB-04**: Content pipeline CI step syncs `../abrigo/scratch/**/*.md` and `../abrigo/docs/**/*.md` into `frontend/content/iterations/` on every push to abrigo `main`
- [x] **LAB-05**: Lab "About" page explains the anti-fishing discipline, pre-committed-spec workflow, and trio-checkpoint method — in author's voice, no marketing slop
- [x] **LAB-06**: All lab pages render in es-CO and en with author-quality translations (not machine-translated)

### Abrigo App — Overview + Iteration Catalog (scoped under `/apps/abrigo/`)

> **IA correction (2026-05-13):** The per-iteration econometric exercise is no longer
> published on the public site. ∂²Π/DS2P Labs is the root research brand; Abrigo is a
> sub-brand app. The public site surfaces the APP (product + GitHub docs when contracts
> are live) and the lab's FINISHED research (papers on `/research` + X). The raw exercise
> lives in `wvs-finance/abrigo-analytics` and is not rendered here. As a result the
> iteration catalog + detail pages were removed and **ITER-01..09 are DESCOPED** from v1.
> APP-01 and LAB-01 were re-scoped: `/apps/abrigo` is now product + live-dashboard teaser
> (no iteration counts); `/` points to `/research` instead of showing iteration counts.
> `ITER-07` (StatusPill color+icon+text, CROSS-09) survives via the shared `StatusPill`
> still used on the Abrigo page.

- [x] **APP-01** *(re-scoped)*: Abrigo app overview page at `/apps/abrigo` renders the app's mission (∂²Π gamma — convex hedges for Colombian wage-earner macro exposure), a live-dashboard teaser (Phase 3), a GitHub-documentation "coming soon" affordance, and a prominent external link to https://x.com/d2pfinabrigo. (No iteration headline counts — descoped.)
- [~] **ITER-01** *(descoped — IA change)*: Iteration catalog at `/apps/abrigo/iterations` lists every Abrigo iteration regardless of status
- [~] **ITER-02** *(descoped — IA change)*: Catalog cards render status with equal visual weight — same dimensions, same typography hierarchy, same prominence for PASS / FAIL / PARKED / IN_PROGRESS
- [~] **ITER-03** *(descoped — IA change)*: Iteration detail page at `/apps/abrigo/iterations/{slug}/v{n}` shows spec → data → estimation → tests → disposition narrative with full evidence chain
- [~] **ITER-04** *(descoped — IA change)*: Each iteration detail displays β estimate, 95% confidence interval, p-value, sample size N, and replication hash with a working link to `make verify` instructions
- [~] **ITER-05** *(descoped — IA change)*: Pair D iteration detail page at `/apps/abrigo/iterations/pair-d/v1` (PASS, Colombian young-worker services × COP/USD lagged 6–12mo, β = +0.137) renders fully with chart, evidence chain, and notebook links
- [~] **ITER-06** *(descoped — IA change)*: FX-vol-on-CPI-surprise iteration detail page at `/apps/abrigo/iterations/fx-vol-on-cpi-surprise/v1` (CLOSED FAIL, β̂ = −0.000685, 90% CI ⊃ 0) renders with same visual weight as PASS pages, includes failure disposition memo
- [~] **ITER-07** *(descoped — IA change)*: Iteration status pill component (`<StatusPill status={...}>`) encodes state with color, icon, AND text label — no color-only state encoding
- [~] **ITER-08** *(descoped — IA change)*: Iteration URLs are content-addressable, human-readable slugs scoped under `/apps/abrigo/iterations/{slug}/v{n}`, never UUIDs or numeric IDs
- [~] **ITER-09** *(descoped — IA change)*: Each iteration page emits JSON-LD `Dataset` + `ScholarlyArticle` structured data (with `isPartOf` pointing to the Abrigo app and the d2-π umbrella) and an OpenGraph card

### Abrigo App — On-Chain Dashboard (scoped under `/apps/abrigo/`)

- [x] **DASH-01**: BFF API route `/api/dashboard?app=abrigo` aggregates deployed Abrigo contract state across configured chains using viem multicall + Vercel KV cache (30s TTL for chain reads, 5min for historical aggregations); `app` parameter scopes which app's contracts are queried (today only Abrigo)
- [ ] **DASH-02**: BFF API route `/api/econometrics?app=abrigo` reads from HuggingFace dataset, parses Parquet server-side, returns typed JSON to the client
- [x] **DASH-03**: Dashboard page at `/apps/abrigo/dashboard` shows live state for every deployed Abrigo instrument: pool balances, settlement events count, LP positions count, last block synced — per chain
- [x] **DASH-04**: Chain selector uses URL search params via `nuqs` so dashboard state is shareable and agent-readable
- [ ] **DASH-05**: Visx-based econometric charts render β estimate with 95% confidence band, time-series panels, and replication-evidence overlays
- [ ] **DASH-06**: Every chart has `aria-label` summarizing the core finding plus a `sr-only` data table for screen-reader users
- [x] **DASH-07**: Dashboard renders correctly with no chain connection (read-first), no wallet, and on first paint without JavaScript hydration
- [x] **DASH-08**: Status page at `/status` (umbrella-scoped) shows RPC health per chain, indexer freshness, HuggingFace dataset version, build hash, AND per-app health rollup (today: just Abrigo)

### Agent Surface

- [x] **AGENT-01**: `lib/mcp-tools/` directory exports all agent tool definitions; both the MCP route handler and the chat API import from this module — no duplication
- [ ] **AGENT-02**: MCP server hosted as Next.js App Router route at `/api/mcp/[transport]` via `@vercel/mcp-handler`
- [x] **AGENT-03**: MCP tool `list_apps()` returns the apps registry — today returns `[{ slug: "abrigo", name: "Abrigo", status: "active", description: "...", external_url: "https://x.com/d2pfinabrigo" }]`
- [x] **AGENT-04** *(re-scoped — IA correction 2026-05-13)*: ~~returns all iterations within the named app with status, slug, version, β, p-value~~ STRUCK. MCP tool `list_iterations(app, filter?)` returns the on-site **research collection** rows for the named app (slug, title_es/en, type, track, date, authors, summary_es/en, external_url, arxiv_id), track-filtered to `abrigo-hedge-design` by default; `app` defaults to `"abrigo"`. β/p-value/version do not exist in the on-site data model (the raw exercise lives in `wvs-finance/abrigo-analytics`) and are never fabricated — mirrors the ITER-01..09 descope.
- [x] **AGENT-05** *(re-scoped — IA correction 2026-05-13)*: ~~full iteration detail including replication hash + notebook URL~~ STRUCK. MCP tool `get_iteration_state(app, slug)` returns full **on-site research-entry** detail (the ResearchEntryOut fields + `body`); `external_url` carries the notebook/analytics link where present, `arxiv_id` the citable id. `version` is accepted for API-compat but ignored (no version dimension on-site). No replication_hash/notebook_url fields exist in the data model; honest `not_found` for unknown slugs — mirrors the ITER-01..09 descope.
- [x] **AGENT-06**: MCP tool `get_instrument_terms(app, instrument_id, chain)` returns instrument parameters, payoff function, and current pool state
- [x] **AGENT-07-pool**: MCP tool `get_pool_state(app, chain, pool_address)` returns live pool reserves, LP count, recent settlement events
- [x] **AGENT-07**: MCP tool `query_econometric_panel(app, panel, filters)` returns rows from HuggingFace panel dataset (scoped to the app's panels) with paging
- [x] **AGENT-08**: OpenAPI spec at `/.well-known/openapi.yaml` documents every public REST endpoint with examples
- [x] **AGENT-09**: `/llms.txt` at site root lists primary entry URLs, content licensing, and pointer to MCP endpoint
- [x] **AGENT-10**: Every iteration / instrument / dashboard page emits JSON-LD structured data that mirrors the MCP tool output schema

### Wallet and Read-First DeFi

- [x] **DEFI-01**: RainbowKit v2 wallet connect integrated; supports mobile wallets via WalletConnect v2 (MetaMask Mobile, Rainbow, Coinbase Wallet, Valora for Celo)
- [x] **DEFI-02**: Wallet state machine has 4 explicit states — DISCONNECTED / CONNECTED_WRONG_CHAIN / CONNECTED_READY / CONNECTING — each with distinct UI affordance
- [ ] **DEFI-03**: Per-instrument page at `/apps/abrigo/instruments/{id}/{chain}` shows parameters, payoff diagram, current pool state, recent participants — fully accessible without wallet connection
- [x] **DEFI-04**: Payoff diagram component renders CFMM payoff curve with axis labels in user's locale, showing strike, slope, current price marker
- [ ] **DEFI-05**: Risk disclosure surfaces explicitly label every Abrigo instrument as "hedging product, not leverage" in both es-CO and en, visible without scrolling at 360px viewport on `/apps/abrigo/instruments/{id}/{chain}` pages
- [ ] **DEFI-06**: Wallet connect modal is fully keyboard-navigable, has no focus trap on close, and announces state changes to screen readers
- [x] **DEFI-07**: Wallet UI distinguishes "wrong chain" from "unsupported chain" — user on Polygon sees a chain-switch CTA; user on a chain we don't deploy on sees an explanatory message

### Cross-cutting

- [x] **CROSS-01**: Every page passes WCAG 2.2 AA conformance (axe-core CI + manual screen-reader audit on top 5 templates)
- [x] **CROSS-02**: Every page renders in es-CO and en; the language switcher is keyboard accessible and persists choice via cookie
- [x] **CROSS-03**: Every page hits LCP < 2.5s on Moto G Power 3G profile in Lighthouse CI
- [x] **CROSS-04**: No page nests cards inside cards; no purple-to-blue gradients; no oversized italic-serif heroes; no eyebrow chips above h1 — `impeccable detect` confirms in CI
- [x] **CROSS-05**: No page uses pure black or pure gray — all neutrals are tinted toward the lab's accent
- [x] **CROSS-06**: All currency values display in COP by default for es-CO users, USD by default for en users; user can override via persisted preference
- [x] **CROSS-07**: All dates use locale-aware formatting (es-CO: `11 de mayo de 2026`; en: `May 11, 2026`); no `en-US` hardcoded
- [x] **CROSS-08**: All numeric formatting (decimals, thousand separators) is locale-aware via `Intl.NumberFormat`
- [x] **CROSS-09**: Every chart, status indicator, and form error uses color + icon + text (never color-only)
- [x] **CROSS-10**: All copy is authored, not generated — no "Empower your X with our Y" phrasing; tone matches the lab's anti-fishing discipline

## v2 Requirements

Deferred to post-hackathon milestone.

### Conversational Interface

- **CHAT-01**: Chat shell at `/chat` grounded in `lib/mcp-tools/` — system prompt mandates tool calls for every protocol-state question
- **CHAT-02**: RAG layer over lab corpus (papers, decision memos, iteration write-ups) via Cloudflare Vectorize
- **CHAT-03**: Grounding validation test set with known-correct answers; chat shell does not ship until pass rate validated
- **CHAT-04**: "I don't know" is always a valid answer when tool calls fail — no hallucinated state

### Transact Path

- **TXN-01**: Threat-model review completed and documented before any `writeContract` ships
- **TXN-02**: `simulateContract` runs before every `writeContract` with user-readable failure reasons
- **TXN-03**: Typed viem error unpacking (`EstimateGasExecutionError`, `ContractFunctionRevertedError`, `UserRejectedRequestError`) with distinct UI per error class
- **TXN-04**: Slippage tolerance UI with explicit `amountOutMin` + `deadline` parameters on every settle
- **TXN-05**: Transaction history per address with status (pending / confirmed / failed) and block explorer links
- **TXN-06**: LP position management UI (mint / burn / collect)
- **TXN-07**: Post-transaction query invalidation via `queryClient.invalidateQueries`

### Indexer + Historical

- **IDX-01**: Envio HyperIndex deployed for Abrigo contracts across configured chains
- **IDX-02**: Historical LP position panels backed by Envio GraphQL
- **IDX-03**: Cross-chain settlement aggregation view

### Notifications + Subscriptions

- **NOTIF-01**: RSS feed of iteration verdicts at `/iterations/feed.xml`
- **NOTIF-02**: Webhook endpoint for new iteration verdicts (for agents and partners)
- **NOTIF-03**: Email digest (opt-in) for iteration verdicts

### Search + Discovery

- **SEARCH-01**: Full-text search across iterations, papers, and decision memos via Pagefind (build-time index)
- **SEARCH-02**: Filter UI for iteration catalog (status, vintage, dataset, instrument family)

### Internationalization Expansion

- **I18N-01**: pt-BR (Brazilian Portuguese) for expansion to Brazil hedging instruments
- **I18N-02**: Translation memory + glossary for econometric terminology consistency

### Admin / Governance

- **ADMIN-01**: Multisig signer dashboard
- **ADMIN-02**: Parameter change proposal viewer

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Native mobile apps (iOS / Android) | Web-first is sufficient for frontier-market reach; PWA is the native bridge |
| DEX aggregator / general swap router | Wrong product category — Abrigo is hedging instruments, not trading |
| Leverage / margin / perpetuals UI | Explicit anti-feature; the lab targets hedging, not leverage seekers |
| KYC / fiat on-ramps / custody | Protocol is permissionless; off-ramp is out of band, handled by partner integrations |
| Marketing-style "$X TVL" hero | Credibility comes from structural evidence, not vanity metrics |
| WebGL / Three.js hero animations | Violates `impeccable` anti-patterns; mobile-data-cost penalty |
| Bounce / elastic easing animations | Violates `impeccable` anti-patterns |
| Purple-to-blue / pink-to-purple gradients | Violates `impeccable` anti-patterns |
| Push notifications / streak / engagement loops | Anti-pattern for a research lab; would betray epistemic-honesty tone |
| Server-side wallet state | Security and correctness — wallet is client-side only |
| Trending tokens / casino-feel UI | Wrong audience |
| AI slop chat unrelated to lab corpus | Chat must be RAG-grounded; no general-purpose LLM shell |
| Selecting only PASS iterations on homepage | Betrays anti-fishing discipline — non-negotiable |

## Traceability

Populated by gsd-roadmapper — 2026-05-11.

| Requirement | Phase | Status |
|-------------|-------|--------|
| FOUND-01 | Phase 1 | Complete |
| FOUND-02 | Phase 1 | Complete |
| FOUND-03 | Phase 1 | Complete |
| FOUND-04 | Phase 1 | Complete |
| FOUND-05 | Phase 1 | Complete |
| FOUND-06 | Phase 1 | Complete |
| FOUND-07 | Phase 1 | Complete |
| FOUND-08 | Phase 1 | Complete |
| FOUND-09 | Phase 1 | Complete |
| FOUND-10 | Phase 1 | Complete |
| FOUND-11 | Phase 1 | Pending |
| FOUND-12 | Phase 1 | Complete |
| FOUND-13 | Phase 1 | Complete |
| CROSS-01 | Phase 1 | Complete |
| CROSS-02 | Phase 1 | Complete |
| CROSS-03 | Phase 1 | Complete |
| CROSS-04 | Phase 1 | Complete |
| CROSS-05 | Phase 1 | Complete |
| CROSS-06 | Phase 1 | Complete |
| CROSS-07 | Phase 1 | Complete |
| CROSS-08 | Phase 1 | Complete |
| CROSS-09 | Phase 1 | Complete |
| CROSS-10 | Phase 1 | Complete |
| NAV-01 | Phase 1 | Pending |
| NAV-02 | Phase 1 | Pending |
| NAV-03 | Phase 1 | Pending |
| NAV-04 | Phase 1 | Pending |
| NAV-05 | Phase 1 | Pending |
| NAV-06 | Phase 1 | Pending |
| NAV-07 | Phase 1 | Pending |
| NAV-08 | Phase 1 | Pending |
| APP-01 | Phase 1 | Pending |
| LAB-01 | Phase 2 | Complete |
| LAB-02 | Phase 2 | Complete |
| LAB-03 | Phase 2 | Complete |
| LAB-04 | Phase 2 | Complete |
| LAB-05 | Phase 2 | Complete |
| LAB-06 | Phase 2 | Complete |
| ITER-01 | Phase 2 | Descoped |
| ITER-02 | Phase 2 | Descoped |
| ITER-03 | Phase 2 | Descoped |
| ITER-04 | Phase 2 | Descoped |
| ITER-05 | Phase 2 | Descoped |
| ITER-06 | Phase 2 | Descoped |
| ITER-07 | Phase 2 | Descoped |
| ITER-08 | Phase 2 | Descoped |
| ITER-09 | Phase 2 | Descoped |
| DASH-01 | Phase 3 | Complete |
| DASH-02 | Phase 3 | Descoped |
| DASH-03 | Phase 3 | Complete |
| DASH-04 | Phase 3 | Complete |
| DASH-05 | Phase 3 | Descoped |
| DASH-06 | Phase 3 | Descoped |
| DASH-07 | Phase 3 | Complete |
| DASH-08 | Phase 3 | Complete |
| AGENT-01 | Phase 4 | Complete |
| AGENT-02 | Phase 4 | Pending |
| AGENT-03 | Phase 4 | Complete |
| AGENT-04 | Phase 4 | Pending (re-scoped) |
| AGENT-05 | Phase 4 | Pending (re-scoped) |
| AGENT-06 | Phase 4 | Complete |
| AGENT-07 | Phase 4 | Complete |
| AGENT-08 | Phase 4 | Complete |
| AGENT-09 | Phase 4 | Complete |
| AGENT-10 | Phase 4 | Complete |
| DEFI-01 | Phase 5 | Complete |
| DEFI-02 | Phase 5 | Complete |
| DEFI-03 | Phase 5 | Pending |
| DEFI-04 | Phase 5 | Complete |
| DEFI-05 | Phase 5 | Pending |
| DEFI-06 | Phase 5 | Pending |
| DEFI-07 | Phase 5 | Complete |

**Coverage:**
- v1 requirements: 69 total (was 60; +8 NAV-* for umbrella nav + 1 APP-01 Abrigo overview page; renumbered AGENT-07 → AGENT-07-pool because `query_econometric_panel` re-used the slot)
- Mapped to phases: 69/69
- Unmapped: 0

| Phase | Requirements | Count |
|-------|-------------|-------|
| Phase 1: Foundation and Scaffold | FOUND-01–13, CROSS-01–10 | 23 |
| Phase 2: Research Lab Presence and Iteration Catalog | LAB-01–06, ITER-01–09 | 15 |
| Phase 3: Data Layer and On-Chain Dashboard | DASH-01–08 | 8 |
| Phase 4: Agent Surface (MCP) | AGENT-01–10 | 10 |
| Phase 5: Read-First Wallet and DeFi Surface | DEFI-01–07 | 7 |

---
*Requirements defined: 2026-05-11*
*Last updated: 2026-05-11 — traceability populated by gsd-roadmapper*
