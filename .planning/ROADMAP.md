# Roadmap: d2p Finance Frontend (d2p/frontend)

**Milestone:** v1 — Uniswap Hook Incubator Cohort 9 Hookathon demo (~June 2, 2026)
**Created:** 2026-05-11
**Granularity:** Coarse (5 phases derived from requirement dependency chain)
**Coverage:** 60/60 v1 requirements mapped

---

## Phases

- [ ] **Phase 1: Foundation and Scaffold** — Wires every cross-cutting constraint into the project skeleton so all downstream phases build on a compliant base
- [ ] **Phase 2: Research Lab Presence and Iteration Catalog** — Delivers the hackathon demo critical path: lab homepage, full iteration catalog, Pair D detail (PASS), and FX-vol-fail detail (FAIL)
- [x] **Phase 3: Data Layer and On-Chain Dashboard** — Builds the BFF API routes, HuggingFace econometric pipeline, and live dashboard page; gates Phase 4 (completed 2026-05-29)
- [ ] **Phase 3.1: Research Reading Surface** *(INSERTED)* — Paper-grade `/research`: track filter + locale-aware math reading pages (build-time KaTeX) + arXiv/PDF paper-bridge
- [ ] **Phase 4: Agent Surface (MCP)** — Exposes all protocol and research state to AI agents via MCP tools, OpenAPI spec, and JSON-LD structured data
- [ ] **Phase 5: Read-First Wallet and DeFi Surface** — Adds RainbowKit wallet connection and per-instrument read-only views with payoff diagrams and risk disclosures
- [x] **Phase 05.1: abrigo-somnia convex instrument frontend surface** *(INSERTED)* — Read-first SIMULATED cCOP/USD long-gamma instrument surface; three-tier provenance, SIMULADO badge, read-only wallet, no fabricated numbers (completed 2026-06-02)
- [x] **Phase 05.2: DEFI-06 wallet connect-modal accessibility** *(INSERTED)* — scoped role=status live region, focus restoration (incl. connect-success), durable e2e; real-SR speech deferred to manual pass (completed 2026-06-02)
- [x] **Phase 6: Somnia agent surface (MacroHedgeStrategist)** — Module 2: surface the live Somnia-testnet hedge-decision agent — live CPI panel + decision feed + agent-first MCP tools + surprise→decision→instrument bridge; testnet-agent provenance tier; reads an already-deployed contract (no new deploy) (completed 2026-06-02)
- [ ] **Phase 7: Agent reasoning + position-execution surface** — Module 3: per-decision deterministic decision-pipeline trace + fork-verified/not-live LongGammaWrapper position panel (not-deployed empty state) with disabled management; frontend-only, read-first, no deploy (honker live-stream DEFERRED to 7.x, gated on a continuous keeper cadence)
- [ ] **Phase 8: Scenario-1 Agentathon cornerstone** — Module 4: mock-driven chatbot-style run flow at /apps/abrigo/cornerstone — prompt → Agent-1 (REAL recorded consensus-verified decision, revealed) → Agent-2 mock decision card → confirm → mock mint; live-streamed workflow steps; honest (fork-verified+mock sub-label, single real factor, no fabricated CoT/PnL); frontend-only, no deploy; reuse + `motion`; monitor/history (idb) = if-time. Deadline ~June 11

---

## Phase Details

### Phase 1: Foundation and Scaffold

**Goal**: Every cross-cutting constraint (CI quality gates, design tokens, i18n infrastructure, route group layout, agent-accessibility stubs, and test harness) is enforced from the first commit so no downstream phase can bypass them.

**Depends on**: Nothing — this is the root phase.

**Requirements**: FOUND-01, FOUND-02, FOUND-03, FOUND-04, FOUND-05, FOUND-06, FOUND-07, FOUND-08, FOUND-09, FOUND-10, FOUND-11, FOUND-12, FOUND-13, CROSS-01, CROSS-02, CROSS-03, CROSS-04, CROSS-05, CROSS-06, CROSS-07, CROSS-08, CROSS-09, CROSS-10

**Success Criteria** (what must be TRUE when this phase completes):
  1. A developer can open a PR and the CI pipeline automatically fails the build if any `impeccable detect` anti-pattern, axe-core WCAG 2.2 AA violation, or Lighthouse LCP > 2.5s is detected — before merge, not after.
  2. A developer adding a new page can import `getTranslations()` from next-intl and immediately render both `es-CO` and `en` strings from the translation files, with the language switcher persisting the user's choice via cookie.
  3. The deployed preview URL renders a skeleton homepage with no JavaScript errors, no hydration mismatches, and Vercel environment variable scoping working correctly for Production / Preview / Development.
  4. An AI agent or crawler hitting `/.well-known/mcp.json`, `/.well-known/openapi.yaml`, and `/llms.txt` on the preview deployment receives valid (stub) responses — confirming agent-accessibility scaffolding is live from day one.
  5. The `(lab)`, `(dashboard)`, and `(defi)` route group layouts exist; a page added to `(lab)` provably does not hydrate wallet state (no RainbowKit provider in its layout tree).

**Plans**: 8 plans

- [ ] 01-01-PLAN.md — Bootstrap Next.js 16.2 + TS + Vercel project + Wave 0 test harness (FOUND-01, FOUND-13) [wave 1]
- [ ] 01-02-PLAN.md — Design tokens (Tailwind v4 @theme + shadcn) + StatusPill (FOUND-02, CROSS-05, CROSS-09) [wave 2]
- [ ] 01-03-PLAN.md — next-intl v4 cookie-only i18n + lib/format wrappers + LanguageSwitcher (FOUND-03, CROSS-02, CROSS-06, CROSS-07, CROSS-08, CROSS-10) [wave 2]
- [ ] 01-04-PLAN.md — Route groups (lab)/(dashboard)/(defi) + stub homepage + StructuredData JSON-LD (FOUND-11) [wave 3]
- [ ] 01-05-PLAN.md — wagmi v2 config with 5 chains + Providers shell + wagmi.config.ts placeholder (FOUND-05, FOUND-06) [wave 2]
- [ ] 01-06-PLAN.md — Velite schema + Next.js integration + sync-abrigo-content workflow scaffold (FOUND-04) [wave 2]
- [ ] 01-07-PLAN.md — @t3-oss/env-nextjs + .env.example + agent-accessibility endpoints (llms.txt, mcp.json, openapi.yaml, /api/mcp stub, /api/health) (FOUND-10, FOUND-12) [wave 2]
- [ ] 01-08-PLAN.md — CI workflow (7 parallel jobs) + Lighthouse Moto G + impeccable planted-pattern test + manual audit checklists (FOUND-07, FOUND-08, FOUND-09, CROSS-01, CROSS-03, CROSS-04) [wave 4]

---

### Phase 2: Research Lab Presence and Iteration Catalog

**Goal**: An external visitor — human or AI agent — can land on the site, understand what DS2P Labs and Abrigo are, browse every iteration regardless of status, and read the full evidence chain for Pair D (PASS) and FX-vol-on-CPI-surprise (FAIL) — the exact demo path required for the Hookathon.

**Depends on**: Phase 1 (all CI gates, design tokens, i18n infra, route groups, and agent stubs must be live)

**Requirements**: LAB-01, LAB-02, LAB-03, LAB-04, LAB-05, LAB-06, ITER-01, ITER-02, ITER-03, ITER-04, ITER-05, ITER-06, ITER-07, ITER-08, ITER-09

**Success Criteria** (what must be TRUE when this phase completes):
  1. A first-time visitor landing on `/` reads the lab mission and "What is Abrigo" explainer, sees iteration headline counts (Pass / Fail / Parked / In Progress), and finds links to the wvs-finance GitHub org — without connecting a wallet or enabling JavaScript beyond the initial page load.
  2. A visitor browsing `/iterations` sees all iterations rendered in the same card dimensions and typography hierarchy regardless of status — PASS, FAIL, PARKED, and IN_PROGRESS cards are visually indistinguishable in weight; status is communicated by the `<StatusPill>` component using color + icon + text label together.
  3. A visitor navigating to `/iterations/pair-d/v1` reads the full spec → data → estimation → tests → disposition narrative including β = +0.137, 95% CI, p ≈ 1.5×10⁻⁸, sample size N, and a working replication hash link — in both `es-CO` and `en`.
  4. A visitor navigating to the FX-vol-on-CPI-surprise iteration detail page reads the failure disposition memo with the same visual weight and page depth as the Pair D PASS page — there is no truncation, no de-emphasis, and no design asymmetry between the two.
  5. An AI agent or web crawler fetching any iteration detail page receives JSON-LD `Dataset` + `ScholarlyArticle` structured data and an OpenGraph card in the HTML — no tool call required to extract structured iteration state.

**Plans**: 8 plans

- [x] 02-01-PLAN.md — Phase 2 foundation: token migration to muted ochre, nuqs install, Velite research collection, IBM Plex fonts, i18n namespace stubs, Wave 0 test scaffolds [wave 1]
- [x] 02-02-PLAN.md — Reusable Phase 2 components: IterationCatalogCard, IterationDetailHeader, EvidenceChain, BetaCIChart, ReplicationHash, DispositionMemo, PublicationCard, ContributorCard, NumberedStep, CheckmarkList [wave 2]
- [x] 02-03-PLAN.md — Lab homepage (/) + /about methodology page (LAB-01, LAB-05) [wave 3]
- [x] 02-04-PLAN.md — Iteration content authoring: Pair D PASS + FX-vol FAIL + 2 placeholder iterations from abrigo source files (ITER-05, ITER-06, ITER-08) [wave 2]
- [x] 02-05-PLAN.md — Iteration catalog page /apps/abrigo/iterations with nuqs filter (ITER-01, ITER-02) [wave 3]
- [x] 02-06-PLAN.md — Iteration detail page /apps/abrigo/iterations/[slug]/v[version] with Dataset + ScholarlyArticle JSON-LD (ITER-03, ITER-04, ITER-07, ITER-09) [wave 3]
- [x] 02-07-PLAN.md — /team + /research pages + locale-coverage e2e (LAB-02, LAB-03, LAB-06) [wave 3]
- [x] 02-08-PLAN.md — Content sync workflow expansion + manual-review docs (LAB-04) [wave 4]

---

### Phase 3: Data Layer and On-Chain Dashboard

**Goal**: The BFF API routes aggregate live on-chain state across configured chains and serve econometric data from HuggingFace, enabling the dashboard page and unblocking the agent tool layer in Phase 4.

**Depends on**: Phase 1 (project scaffold, wagmi config, env var setup, test harness)

**Requirements**: DASH-01, DASH-03, DASH-04, DASH-07, DASH-08 (in scope) — DASH-02, DASH-05, DASH-06 DESCOPED per the 2026-05-13 IA correction (HuggingFace econometrics route + visx β/CI charts + chart a11y re-introduce the per-iteration econometric exercise removed from the public site; econometrics reach the public only as finished papers on /research).

**Success Criteria** (what must be TRUE when this phase completes):
  1. A visitor navigating to `/apps/abrigo/dashboard` with no wallet connected and no JavaScript wallet extension installed sees per-chain metric tiles (pool balances, settlement event counts, LP position counts, last-block-synced) for every deployed Abrigo instrument — and, while no contracts are deployed, a labelled schema-preview/skeleton state with no fabricated numbers — rendered meaningfully on first paint without hydration.
  2. A visitor switching chains via the chain selector sees the URL update (e.g., `?chain=celo`) so the dashboard state is shareable and returns the same data when pasted into a new browser tab or an agent's fetch call.
  3. ~~Econometric charts render β estimates with 95% confidence bands…~~ **DESCOPED per the 2026-05-13 IA correction** — DASH-05/06 econometric charts are removed; the econometric exercise is not published on the public site (econometrics reach the public only as finished papers on `/research`). See `03-CONTEXT.md`.
  4. A developer or agent hitting `/status` reads RPC health per chain, indexer freshness timestamp, and build hash — the page responds even when one chain's RPC is degraded, showing which chain is healthy and which is not. (HuggingFace dataset-version line dropped — econometrics descoped.)

**Scope note (2026-05-13 IA correction):** The dashboard renders on-chain protocol state ONLY and lives at `/apps/abrigo/dashboard` (app-scoped, not root `/dashboard`); `/status` is umbrella-scoped. No Abrigo contracts are deployed yet, so the dashboard ships an honest schema-preview skeleton (dashed `—` values + "live once contracts deploy" banner) driven by an empty instrument registry — no fabricated numbers. DASH-02/05/06 are descoped.

**Plans**: 3 plans

Plans:
- [ ] 03-01-PLAN.md — Data-layer foundation: empty instrument registry seam, viem multicall aggregator, per-chain RPC health lib, nuqs chain search-params, cacheComponents + env + dashboard i18n, Wave 0 test stubs (DASH-01, DASH-08) [wave 1]
- [ ] 03-02-PLAN.md — Abrigo on-chain dashboard slice: /api/dashboard BFF route, /apps/abrigo/dashboard RSC page, nuqs chain selector, no-JS read-first first paint, overview teaser link (DASH-01, DASH-03, DASH-04, DASH-07) [wave 2]
- [ ] 03-03-PLAN.md — Umbrella /status surface: /api/status JSON route + /status RSC page with per-chain RPC health pills, build hash, freshness, per-app rollup (DASH-08) [wave 2]

---

### Phase 03.1: Research Reading Surface (INSERTED)

**Goal**: `/research` becomes a paper-grade public reading surface — a reverse-chron list with a server-rendered track filter (CFMM Microstructure · Abrigo Hedge-Design · Notes), and locale-aware reading pages that render build-time KaTeX math, numbered display equations, figures, theorem/definition blocks, footnotes/sidenotes, and an arXiv/PDF paper-bridge. Hybrid: on-site MDX bodies for write-ups/memos; arXiv landing pages for formal papers.

**Depends on**: Phase 2 (the `/research` index + Velite `research` collection + `PublicationCard` baseline; the locked design system; the i18n + Evidence-Collector gates)

**Canonical spec**: `docs/superpowers/specs/2026-05-29-research-reading-surface-design.md` (brainstormed → two-reviewer-verified → tooling-researched; the PRD for `/gsd:plan-phase 03.1 --prd`)

**Requirements**: extends LAB-03 (publications/research surface). Net-new acceptance lives in the spec §3–§8; no new top-level REQ-IDs — a depth pass on the existing research requirement.

**Scope note**: full citation rendering (rehype-citation/@citation-js) is **deferred to v2** per spec §0; v1 paper-bridge = arXiv + PDF + static BibTeX.

**Plans**: 4 (per spec §2; Plan C split into C1+C2 after the 3-reviewer gate) — A: math-pipeline + render-path gating spike; B: index + content migration + i18n; C1: reading page + components + paper-bridge; C2: reading i18n superset + a11y + perf/Lighthouse gates.

Plans:
- [ ] 03.1-01-PLAN.md — Plan A: math-pipeline + render-path GATING spike — install/pin katex+remark-math+rehype-katex, compiled body via s.mdx() with the §0 plugin chain, resurrect MDXRenderer, route-scoped KaTeX CSS, locale-split glob, spike fixture, e2e .katex/NOT-.katex-error under prod build (LAB-03) [wave 1]
- [ ] 03.1-02-PLAN.md — Plan B: index + content migration + index i18n — server <Link> track filter (no nuqs), atomic schema+3-file per-locale migration with required track, extended PublicationCard, honest empty-per-track, es-CO-first index i18n (LAB-03) [wave 2]
- [ ] 03.1-03-PLAN.md — Plan C1: reading page + components + paper-bridge — /research/[slug] Mode A/B/notFound (await params), 64ch+TOC(from s.toc())+footnotes+theorem+figures, MDX component map via the components prop, PaperBridge (sole client island, arXiv/PDF/DOI/BibTeX), Mode-B fixture, ScholarlyArticle JSON-LD, reading e2e, spike retired (LAB-03) [wave 3]
- [ ] 03.1-04-PLAN.md — Plan C2: reading i18n superset + a11y + perf gates — es-CO-first reading.* superset + recursive parity, axe + manual MathML entry/waiver, font-display:swap + KaTeX preload (no Python subsetting), Lighthouse LCP gate in the existing lighthouserc.cjs run via Evidence Collector (LAB-03) [wave 4]

### Phase 4: Agent Surface (MCP)

**Goal**: AI agents can discover, connect to, and query the full protocol and research state through a live MCP server, a machine-readable OpenAPI spec, and JSON-LD structured data — with no duplication between the MCP tool layer and the data layer built in Phase 3.

**Depends on**: Phase 3 (BFF data routes must exist; tool definitions wrap them); Phase 2 content (iteration MDX provides the corpus for `list_iterations` and `get_iteration_state`)

**Parallelization**: Phase 4 and Phase 5 can run in parallel once Phase 3 is complete.

**Requirements**: AGENT-01, AGENT-02, AGENT-03, AGENT-04, AGENT-05, AGENT-06, AGENT-07, AGENT-08, AGENT-09, AGENT-10

**Success Criteria** (what must be TRUE when this phase completes):
  1. *(DESCOPED per 2026-05-13 IA correction — mirrors ITER-01..09 / DASH-05/06 strike)* ~~connect to `/api/mcp/sse`, call `list_iterations()`, receive all iterations with status, slug, version, β, and p-value~~. AMENDED: An AI agent connects to `https://<preview-url>/api/mcp/mcp` (streamable-http; SSE returns a clean 404 via `disableSse:true`), calls `list_iterations()`, and receives a structured list of the on-site **research-collection** rows for the app (slug, title_es/en, type, track, date, authors, summary_es/en, external_url, arxiv_id), track-filtered to `abrigo-hedge-design` by default — no authentication. β/p-value/version are NOT on-site (raw exercise lives in `wvs-finance/abrigo-analytics`) and are never fabricated.
  2. *(DESCOPED per 2026-05-13 IA correction)* ~~`get_iteration_state("pair-d", 1)` returns full iteration detail including replication hash and notebook URL~~. AMENDED: An AI agent calling `get_iteration_state({ app:"abrigo", slug:"pair-d-dispatch-brief" })` receives the full **on-site research-entry** detail (ResearchEntryOut fields + `body`) in one tool response — the same data visible on `/research/{slug}`. `external_url` carries the notebook/analytics link where present; `arxiv_id` the citable id. No replication_hash/notebook_url fields exist on-site; `version` is accepted but ignored; unknown slugs return an honest `not_found`.
  3. An AI agent calling `get_instrument_terms` and `get_pool_state` receives instrument parameters and live pool reserves for the deployed Celo instrument — sourced from the same BFF route that powers the human dashboard, with no duplicated logic.
  4. An agent or developer fetching `/.well-known/openapi.yaml` receives a valid OpenAPI 3.1 spec documenting every public REST endpoint with request/response examples — sufficient for a developer to write a client without reading source code.

**Plans**: 6 plans

Plans:
- [ ] 04-01-PLAN.md — Foundation: pin @asteasolutions/zod-to-openapi@7.3.4 + js-yaml, shared Zod contract module (single source of truth), Wave 0 test scaffolds, re-point SSE fixme (AGENT-01) [wave 1]
- [ ] 04-02-PLAN.md — Registry + research tools: list_apps, list_iterations, get_iteration_state mapped to on-site Velite research collection (IA-correction-honest, no β/p-value) (AGENT-03, AGENT-04, AGENT-05) [wave 2]
- [ ] 04-03-PLAN.md — On-chain + panel tools: get_instrument_terms, get_pool_state (not_deployed envelopes, bigint-safe), query_econometric_panel (unavailable envelope) (AGENT-06, AGENT-07-pool, AGENT-07) [wave 2]
- [ ] 04-04-PLAN.md — Drift-proof OpenAPI 3.1 generated from Zod + llms.txt refresh (AGENT-08, AGENT-09) [wave 2]
- [ ] 04-05-PLAN.md — Wire MCP route: lib/mcp-tools barrel + createMcpHandler(disableSse:true, runtime nodejs) + live handshake checkpoint (AGENT-01, AGENT-02) [wave 3]
- [ ] 04-06-PLAN.md — JSON-LD mirroring on dashboard (honest not_deployed) + Evidence-Collector route gate (AGENT-10) [wave 3]

---

### Phase 5: Read-First Wallet and DeFi Surface

**Goal**: A protocol participant can browse every deployed Abrigo instrument — including payoff diagram, current pool state, and risk disclosures — and optionally connect a mobile or desktop wallet to see their own on-chain state, all without any transact path being exposed.

**Depends on**: Phase 1 (wagmi config, `(defi)` route group layout with wallet providers); Phase 3 (BFF data routes for instrument state)

**Parallelization**: Can run in parallel with Phase 4 once Phase 3 is complete.

**Requirements**: DEFI-01, DEFI-02, DEFI-03, DEFI-04, DEFI-05, DEFI-06, DEFI-07

**Success Criteria** (what must be TRUE when this phase completes):
  1. A visitor navigating to `/instruments/{id}/celo` with no wallet connected sees the instrument parameters, payoff diagram (CFMM curve with strike, slope, and current price marker), current pool state, and recent participant count — no "connect wallet to view" gate exists for any read-only information.
  2. A visitor on a mobile device using MetaMask Mobile or Valora (Celo) can complete the wallet connect flow — modal opens, deeplink fires, wallet approves — and after connection the UI shows their on-chain state without a page reload.
  3. A connected wallet user on the wrong chain (e.g., Polygon) sees a chain-switch call-to-action distinct from a user on an entirely unsupported chain (e.g., Solana) who sees an explanatory message — the two states are never conflated.
  4. Every instrument page explicitly labels the instrument as "hedging product, not leverage" in both `es-CO` and `en`, and this risk disclosure is present without scrolling on any viewport from 360px wide upward.

**Plans**: 4 plans

Plans:
- [ ] 05-01-PLAN.md — Foundation: install recharts@3.8.1, extend AbrigoInstrument with strike/slope, payoff + wallet-state pure libs, Wave 0 tests + bundle-isolation arch test (DEFI-02, DEFI-04, DEFI-07) [wave 1]
- [ ] 05-02-PLAN.md — Provider activation: getDefaultConfig migration + WalletConnect connectors + ochre HEX RainbowKit theme + (defi)/providers.tsx swap + live modal checkpoint (DEFI-01) [wave 2]
- [ ] 05-03-PLAN.md — Instruments index (honest empty) + RiskCallout + InstrumentParams + es-CO-first i18n + index e2e/axe + live verify (DEFI-03, DEFI-05) [wave 2]
- [ ] 05-04-PLAN.md — Per-instrument detail: WalletPanel 4-state + WalletStatusPill + recharts PayoffDiagram island + PoolStatePanel + detail page + wallet/instrument e2e + live verify (DEFI-02, DEFI-03, DEFI-04, DEFI-05, DEFI-06, DEFI-07) [wave 3]

---

## Progress Table

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation and Scaffold | 6/8 | In Progress|  |
| 2. Research Lab Presence and Iteration Catalog | 5/8 | In Progress|  |
| 3. Data Layer and On-Chain Dashboard | 3/3 | Complete   | 2026-05-29 |
| 4. Agent Surface (MCP) | 0/? | Not started | - |
| 5. Read-First Wallet and DeFi Surface | 3/4 | In Progress|  |

---

## Dependency Graph

```
Phase 1: Foundation and Scaffold
    └──gates──> Phase 2 (all CI, tokens, i18n, route groups required)
    └──gates──> Phase 3 (wagmi config, env vars, test harness required)
    └──gates──> Phase 5 (wagmi config, (defi) layout required)

Phase 2: Research Lab Presence and Iteration Catalog
    └──feeds──> Phase 4 (iteration MDX content is the MCP tool corpus)

Phase 3: Data Layer and On-Chain Dashboard
    └──gates──> Phase 4 (BFF routes wrap tool definitions)
    └──gates──> Phase 5 (instrument state from BFF)

Phase 4 and Phase 5: Parallel after Phase 3 completes
```

---

## Coverage Validation

| Category | Requirements | Phase |
|----------|-------------|-------|
| Foundation | FOUND-01 through FOUND-13 (13 reqs) | Phase 1 |
| Cross-cutting | CROSS-01 through CROSS-10 (10 reqs) | Phase 1 |
| Research Lab | LAB-01 through LAB-06 (6 reqs) | Phase 2 |
| Iteration Catalog | ITER-01 through ITER-09 (9 reqs) | Phase 2 |
| On-Chain Dashboard | DASH-01 through DASH-08 (8 reqs) | Phase 3 |
| Agent Surface | AGENT-01 through AGENT-10 (10 reqs) | Phase 4 |
| Wallet / DeFi | DEFI-01 through DEFI-07 (7 reqs) | Phase 5 |

**Total mapped: 60/60 v1 requirements. No orphans.**

---

## Design Notes

**Hackathon Demo Critical Path (must ship by end of Phase 2):**
- `/` — lab homepage with mission and iteration headline counts
- `/iterations` — full catalog with all statuses at equal visual weight
- `/iterations/pair-d/v1` — Pair D PASS detail with full evidence chain
- `/iterations/fx-vol-on-cpi-surprise/v1` — FAIL detail with failure disposition memo

**Cross-cutting constraint assignment rationale:**
CROSS-01 through CROSS-10 are assigned to Phase 1 because they represent infrastructure and CI enforcement that must be in place before any feature phase begins. They are not a separate "polish" phase — they are the scaffold. Each subsequent phase re-verifies them via the same CI pipeline established in Phase 1.

**Phase 4 and Phase 5 parallelization:**
Both phases depend on Phase 3 BFF routes. They share no other dependencies between themselves. A single developer works them sequentially; if bandwidth exists (second session or time-boxed parallel work), Phase 4 and Phase 5 can begin simultaneously after Phase 3 merges.

**DEFI-* scope constraint:**
All DEFI-* requirements are read-first only in v1. The transact path (writeContract, simulateContract, LP management) is v2 scope per the requirements document. No DEFI-* requirement in v1 exposes a write path.

### Phase 05.2: DEFI-06 wallet connect-modal accessibility (keyboard nav, focus restoration on close, SR state announcements) (INSERTED) — ✓ COMPLETE 2026-06-02

**Goal:** Wallet connect modal is fully keyboard-navigable, has no focus trap on close, and announces state changes to screen readers.
**Requirements**: DEFI-06
**Depends on:** Phase 5
**Plans:** 1 plan (05.2-01 complete)
**Deferred:** Real SR speech transcript (NVDA/VoiceOver) — no SR installable in CI; deferred to manual pre-production pass.

Plans:
- [x] 05.2-01: DEFI-06 a11y — scoped live region + focus restoration + guarded audit route + durable e2e

### Phase 05.1: abrigo-somnia convex instrument frontend surface (cCOP/USD long-gamma, read-first simulated) (INSERTED) — ✓ COMPLETE 2026-06-02

**Goal:** A visitor or agent can open the cCOP/USD long-gamma instrument page and read an honestly-labeled, read-first, simulated surface — schematic convex payoff, backend-correct cash-flow waterfall, and Panoptic fork-fixture params — under a three-tier provenance model (fork-fixture / spec / schematic) with a SIMULADO badge, a read-only wallet, and no transact path or fabricated numbers.
**Requirements**: Extends DEFI-02, DEFI-03, DEFI-04, DEFI-05, CROSS-01, CROSS-09, CROSS-10, AGENT-10. New: DEFI-08 (simulated/read-only instrument variant — three-tier provenance, SIMULADO badge, CashFlowWaterfall, SnapshotPoolPanel, read-only wallet, never passed to multicall), DEFI-09 (GitBook module page from docs/book/, excluded from Velite globbing).
**Depends on:** Phase 5
**Canonical spec:** `docs/superpowers/specs/2026-06-02-ccop-usd-long-gamma-instrument-frontend-design.md` (passed two-step review)
**Verification:** passed 12/12 (`05.1-VERIFICATION.md`); full suite green on production build; Evidence Collector live-DOM gate passed.

Plans:
- [x] 05.1-00-PLAN.md — Wave 0: fix the 05-04 PayoffDiagram BLOCKER (0-height/contrast/#418) + 4 failing test stubs + resolve chunk-strike; Evidence Collector re-verify existing fixture route (DEFI-04, CROSS-01, CROSS-09, DEFI-08) [wave 0]
- [x] 05.1-01-PLAN.md — Wave 1: data layer freeze — fixture.ts + payoff.ts schematic + cashflow.ts + instruments.ts discriminated union + 5 consumer narrowings; remove temp fixture (DEFI-08, DEFI-04, AGENT-10, CROSS-09) [wave 1]
- [x] 05.1-02-PLAN.md — Wave 2: components — ProvenanceBadge/SimuladoBadge + SnapshotPoolPanel + CashFlowWaterfall + PayoffDiagram props extension + read-only wallet path (DEFI-08, DEFI-02, DEFI-04, CROSS-09, CROSS-01) [wave 2]
- [x] 05.1-03-PLAN.md — Wave 3: detail-page simulated branch (before aggregator) + es-CO/en i18n keys + GitBook page + copy-review sign-off (DEFI-08, DEFI-03, DEFI-05, DEFI-09, CROSS-10, CROSS-09, AGENT-10) [wave 3]
- [x] 05.1-04-PLAN.md — Wave 4: real e2e/a11y on the simulated route + full suite green + Evidence Collector live-DOM gate (DEFI-08, DEFI-03, DEFI-05, DEFI-02, CROSS-01, CROSS-09) [wave 4]

### Phase 6: Somnia agent surface (MacroHedgeStrategist) — Module 2

**Goal:** A visitor or agent can see the live Somnia-testnet macro-hedge agent in the d2p frontend — the latest CPI macro print, the stream of consensus(operator-supplied)→surprise→action hedge decisions, a bridge tying a decision to the module-1 cCOP/USD instrument, and agent-first MCP tools — all under a `testnet-agent` provenance tier, reading an ALREADY-DEPLOYED contract (no new deploy), with no fabricated data.

**Requirements**: SOMNIA-00 (Wave-0 data layer), SOMNIA-D (live CPI panel), SOMNIA-A (hedge-decision feed), SOMNIA-C (agent-first MCP tools), SOMNIA-B (surprise→decision→instrument bridge); reuses CROSS-01/09/10, AGENT-01/02, DEFI-08. (New SOMNIA-* IDs introduced at planning; honesty acceptance lives in the spec §0 + each plan's must_haves.)
**Depends on:** Phase 5.1 (module-1 instrument, for the component-B bridge); abrigo-somnia Phase-11 (deployed MacroHedgeStrategist — DONE).
**Canonical spec:** `docs/superpowers/specs/2026-06-02-somnia-agent-surface-phase6-design.md` (passed 2-way review; §0 = binding corrections)

**Success Criteria** (what must be TRUE when this phase completes):
  1. A visitor at `/apps/abrigo/agent` sees the latest Somnia-testnet CPI print (`co/inflation-rate`, 5.68%) + recorded `MacroReceived` history, each with a `testnet-agent` provenance pill; capacity-utilization is absent (not fabricated); null fields are em-dash; data comes through the Wave-0 reader (snapshot, no network).
  2. The same surface shows the recorded hedge decisions as equal-weight cards (print → operator-supplied consensus → surprise → action + sizeBps); consensus is honestly labeled operator-supplied (not market); surprise is gated behind that caveat; all four actions render at identical visual weight.
  3. On the module-1 cCOP/USD simulated instrument page, a bridge ties a recorded decision to the convex position (operator-supplied surprise → ADD_LONG_GAMMA @ sizeBps → schematic position delta), mounted only in the `kind==='simulated'` branch (never on the multicall path).
  4. An AI agent calls `get_hedge_decisions(dataKey)` and `get_latest_macro_print(dataKey)` on the Phase-4 MCP server and receives the recorded decisions / latest CPI — each a single wrapping ZodObject with both content[text] and structuredContent, consensus labeled operator-supplied, bigint serialized as string, no fabricated numerics.

**Honesty invariants (spec §0):** no green provenance token (neutral `testnet-agent` tier); consensus = operator-supplied (not market); CPI-only (capacity-utilization unwired); snapshot captured from the real tx hashes (hand-authored decision data is a CROSS-09 violation); Somnia chain 50312 is a SEPARATE defineChain/client (no SupportedChainId widening); static `import x from './x.json'` + BigInt/Date rehydration; surprise computed in BigInt; live read server-side behind `SOMNIA_LIVE` (not NEXT_PUBLIC_), kept OUT of default CI.

**Plans**: 5 plans (Wave 0 data layer → D/A/C reader-parallel → B bridge)

Plans:
- [ ] 06-00-PLAN.md — Wave 0 data layer: deployments.json (no deploy) + real-tx-sourced snapshot.json + separate Somnia chain/client (50312) + ABIs + types + reader.ts seam (snapshot default / live flagged) + BigInt surprise + testnet-agent provenance tier + 7 failing-first test stubs (SOMNIA-00, CROSS-09) [wave 0]
- [ ] 06-01-PLAN.md — D: live macro-data panel — MacroDataPanel RSC (CPI-only, em-dash nulls, testnet-agent pill) + /apps/abrigo/agent route + es-CO-first somnia i18n + e2e (SOMNIA-D, CROSS-09, CROSS-10, CROSS-01) [wave 1]
- [ ] 06-02-PLAN.md — A: hedge-decision feed — HedgeDecisionFeed + HedgeDecisionCard (equal-weight, consensus=operator, surprise gated, em-dash pending) mounted on the agent page + equal-weight e2e (SOMNIA-A, CROSS-09, CROSS-10, CROSS-01) [wave 1]
- [ ] 06-03-PLAN.md — C: agent-first MCP tools — get_hedge_decisions + get_latest_macro_print (single ZodObject, dual return, new envelopes in contract.ts, barrel + route edits) + real-SDK conformance test (SOMNIA-C, AGENT-01, AGENT-02, CROSS-09) [wave 1]
- [ ] 06-04-PLAN.md — B: surprise→decision→instrument bridge — decisionToPositionDelta (BigInt) + HedgeDecisionBridge RSC mounted in the kind==='simulated' branch of the instrument page (never on the multicall path) + es-CO-first copy + e2e (SOMNIA-B, CROSS-09, CROSS-10, CROSS-01, DEFI-08) [wave 2]

---

### Phase 7: Agent reasoning + position-execution surface — Module 3

**Goal:** A visitor or agent can see the DETERMINISTIC DECISION PIPELINE of the Somnia macro-hedge agent — a per-decision trace (macro print → deterministic built prompt → two-leg Qwen3-30B temp-0 inference: action then size → decision → illustrative position, with the real SYSTEM_PROMPT viewable) — and an honest `fork-verified / not-live` view of the `LongGammaWrapper` position it would open (not-deployed empty state) with disabled management. Honest split between live-on-testnet decisions (`testnet-agent` tier, real tx) and the fork-verified-but-not-deployed position (new `fork-verified / not-live` tier). Frontend-only; read-first; no Solidity; no deploy; no fabricated data. (honker live-stream DEFERRED — see Deferred.)

**Requirements**: MOD3-TRACE (deterministic decision-pipeline trace), MOD3-POS (fork-verified/not-live position panel: typed `WrapperPositionView` + `adaptWrapper` adapter, gated on `WRAPPER_DEPLOYED`, renders not-deployed state), MOD3-MANAGE (disabled management affordances), MOD3-LIVE (liveness `refresh()` seam as a `useSyncExternalStore` contract: snapshot + flagged-poll realizations, honest pill); reuses CROSS-01/09/10, AGENT-01/02. **Deferred to Phase 7.x:** MOD3-HONKER (bespoke honker live-stream sidecar — gated on a continuous keeper cadence). (New MOD3-* IDs introduced at planning; honesty acceptance lives in the spec §0 + each plan's must_haves.)
**Depends on:** Phase 6 (the `/apps/abrigo/agent` overview + reader seam + `testnet-agent` tier this extends); abrigo-somnia milestone v2.0 Phase 8 `LongGammaWrapper` (fork-verified, NOT deployed — read-only ABI, consumed via a typed adapter behind `WRAPPER_DEPLOYED=false`).
**Canonical spec:** `docs/superpowers/specs/2026-06-02-module3-agent-reasoning-position-surface-design.md` (v2; passed 2-way review — Reality Checker + Backend Architect; §0 = binding honesty corrections)

**Success Criteria** (what must be TRUE when this phase completes):
  1. At `/apps/abrigo/agent/[id]` a visitor sees the deterministic decision-pipeline trace for a real decision (requestId 4083729/4083997): macro print → built prompt (from actual+consensus) → Qwen3-30B temp-0 action leg → size leg → decision → illustrative position (sizeBps→fraction-of-max, never a `$` figure), with the real SYSTEM_PROMPT viewable; decision data carries the `testnet-agent` pill (real tx); no fabricated chain-of-thought; `consensus` labeled operator-supplied. (`HedgeDecisionRequested` added to `abi.ts`; the `decisionId→requestId[]` join is implemented.)
  2. The same page shows a position-execution panel under a new neutral `fork-verified / not-live` provenance tier rendering the NOT-DEPLOYED empty state ("—"); a typed `WrapperPositionView` + single `adaptWrapper` chokepoint encode the real-ABI mapping rules (composed reads through `pool()/ct0()/ct1()`; never the `lastSurviving*`/`deposited*` baselines as "current"; `ResidualEroded.cause` typed `bytes32`, not a 3-way enum; no `realizedCosts`), gated behind `WRAPPER_DEPLOYED=false` (lazy server read); no live read executes and no number is fabricated in Phase 7.
  3. Management controls (close/claim/agent) render visible-but-disabled with an honest "not live — fork-verified, not deployed" state; no wallet write, no transact; rendered DOM contains no "executed/realized/ejecutad/realizad" and no fabricated `$` notional.
  4. A liveness `refresh()` seam (a `useSyncExternalStore`-shaped `LivenessSource<T>` contract) drives the UI with an honest pill (color+icon+text); Phase 7 ships the `snapshot` (default) + `polling` (`SOMNIA_LIVE`) realizations only (`live` ships with the deferred honker phase); the native `honker-node` addon never enters the frontend `package.json`.

**Honesty invariants (spec §0):** wrapper NOT deployed → `fork-verified / not-live` neutral tier, position panel renders empty state, never imply executed/realized; no fabricated CoT (LLM output enum/clamped-int, `_buildPrompt` deterministic); disabled management (no transact); typed `adaptWrapper` adapter (NOT verbatim import) contains a moving ABI, re-derived before `WRAPPER_DEPLOYED` flips; es-CO-first; locked tokens; `impeccable` + token tests enforced; live RPC reads behind `SOMNIA_LIVE` (lazy), out of CI; honker DEFERRED (embedded in-process lib, no Dockerfile/SSE; no continuous keeper → nothing live to stream yet).

**Plans**: 4 plans (Wave 0 data-layer foundation → Wave 1 trace + position-panel parallel slices → Wave 2 detail-route wire + e2e + live-verify)

Plans:
- [ ] 07-00-PLAN.md — Wave 0 data layer (TDD): add HedgeDecisionRequested + LongGammaWrapper read-only ABI; typed WrapperPositionView + single adaptWrapper chokepoint gated behind WRAPPER_DEPLOYED=false; deterministic prompt-trace reconstruction; LivenessSource<T> snapshot/polling-only contract; extend snapshot capture with real leg events (route key = requestId, field renamed honestly); fork-verified neutral provenance tier; 5 failing-first stubs (MOD3-TRACE, MOD3-POS, MOD3-MANAGE, MOD3-LIVE, CROSS-09) [wave 0]
- [ ] 07-01-PLAN.md — Wave 1 trace: DecisionPipelineTrace vertical-stepper (6 equal-weight stages) + collapsible real SYSTEM_PROMPT + illustrative position as sizeBps→fraction-of-max (never $) + es-CO-first/en trace.* copy; no fabricated CoT (MOD3-TRACE, CROSS-09, CROSS-10, CROSS-01) [wave 1]
- [ ] 07-02-PLAN.md — Wave 1 position: not-deployed PositionPanel under the neutral fork-verified tier (em-dash values, no stale baselines) + disabled ManagementControls (perceivable beyond color: aria-disabled + aria-describedby + Lock + caption) + LivenessPill useSyncExternalStore (snapshot/polling only, no live) + position/manage/liveness copy (MOD3-POS, MOD3-MANAGE, MOD3-LIVE, CROSS-09, CROSS-01, CROSS-10) [wave 1]
- [ ] 07-03-PLAN.md — Wave 2 wire: /apps/abrigo/agent/[id] detail route assembling trace + position panel + disabled management + liveness pill + master→detail link (accent + ChevronRight + underline) + unknown-id error state + e2e honesty greps (no executed/realized, no $, no green, no live) + Evidence Collector live-verification gate (MOD3-TRACE, MOD3-POS, MOD3-MANAGE, MOD3-LIVE, CROSS-01, CROSS-09, CROSS-10) [wave 2]

**Deferred to Phase 7.x:** MOD3-HONKER (bespoke honker live-stream sidecar) — gated on a continuous keeper cadence.

---

### Phase 8: Scenario-1 Agentathon cornerstone — Module 4

**Goal:** A visitor/judge at `/apps/abrigo/cornerstone` types a macro-view prompt and watches the agent workflow run live, chatbot-style — the workflow STEPS stream progressively: Agent 1 reveals the REAL recorded consensus-verified Somnia decision (the autonomous-agent differentiator), Agent 2 presents a MOCK pool-representativeness decision card the user CONFIRMS, then a MOCK mint. Mock-driven (nothing live-callable; real wiring = backend Phase 15); honest throughout (real Agent-1 under `testnet-agent`/consensus-verified; Agent-2/mint under `fork-verified` + "mock · no en vivo" sub-label; single real factor `co/inflation-rate`, no fabricated chain-of-thought, no `$` PnL presented as real; reasoning collapses, the decision stays full-weight). Frontend-only; no Solidity; no deploy; no wallet-to-live-chain.

**Requirements**: MOD4-FLOW (route + chatbot run transcript + workflow-store seam), MOD4-A1 (Agent-1 real-decision reveal reusing DecisionPipelineTrace, single-factor), MOD4-A2 (Agent-2 mock decision card from HedgeLegParamsView + confirm gate, focus-managed), MOD4-MINT (mock mint card); reuses CROSS-01/09/10, AGENT-01/02, the Phase-7 `fork-verified` tier + stepper + disclosure + `useSyncExternalStore` pattern. **If-time (NOT committed):** MOD4-MONITOR (basic read) + MOD4-HISTORY (idb run history). (New MOD4-* IDs introduced at planning; honesty acceptance lives in the spec §0 + each plan's must_haves.)
**Depends on:** Phase 6 (real Somnia decision snapshot + reader) + Phase 7 (DecisionPipelineTrace, SystemPromptDisclosure, stepper, fork-verified tier, LivenessPill, the useSyncExternalStore pattern). Backend Scenario-1 (MacroHedgeExecutor/mint/monitor) is UNBUILT → mock only.
**Canonical spec:** `docs/superpowers/specs/2026-06-06-module4-scenario1-cornerstone-design.md` (v2; passed 2-way review — Reality Checker + Frontend Developer; §0 = binding honesty)

**Success Criteria** (what must be TRUE when this phase completes):
  1. At `/apps/abrigo/cornerstone` a visitor picks a curated preset (or free-text → nearest preset) and the workflow STEPS stream progressively into a chatbot transcript (`aria-live` announces each once); the Agent-1 step reveals the server-rendered `DecisionPipelineTrace` for the REAL recorded decision (single factor `co/inflation-rate`=5.68% → consensus → action+sizeBps) under the `testnet-agent` tier, labeled "recorded run · consensus-verified"; no fabricated chain-of-thought; `testnet-agent`+"consensus-verified" appear ONLY here.
  2. Agent 2 presents a MOCK decision card from `HedgeLegParamsView` (market, strike 4.100, size, isLong, school label, vol→width, max-loss=premium, upside=unlimited, mock margin) under the `fork-verified` tier + a "mock · no en vivo"/"mock · not live" sub-label (never green); every mock numeric carries an adjacent mock/ilustrativo label; no `$` presented as real PnL; the card has no `<details>` and stays full visual weight; a Confirm button gates the mint and receives focus on entering the confirm state.
  3. On confirm, a MOCK MintCard renders (TokenId, mock margin BalanceDelta, leg fields) under the mock label; rendered DOM contains no executed/realized/ejecutad/realizad and no raw `0x000…0`; no viem/wagmi client is constructed against the Polygon addresses.
  4. The run is driven by a dedicated `workflow-store` (useSyncExternalStore-shaped, owns the reducer, stable RunState ref per emit, getServerSnapshot=idle so first paint is the idle prompt); the mock `WorkflowEngine` producer emits the provisional `WorkflowEvent`s behind a `fromMockEvent` adapter; `motion` entrance is mounted-gated + honors prefers-reduced-motion; the native `honker-node`/AI-SDK are absent and `idb` is absent unless the if-time history scope ships.

**Honesty invariants (spec §0):** mock-driven (no live chain call, no wallet-to-live-Polygon); Agent-1 REAL/consensus-verified only; single real factor (no fabricated multi-factor CoT); Agent-2/mint MOCK under fork-verified+sub-label (never imply executed/realized, no real `$` PnL); reasoning collapses but the decision card does not; provisional event contract behind an adapter (Phase-15 reshape expected); es-CO-first; locked tokens; `impeccable`+token tests; no `--no-verify`. Phase 8 ships the MOCK UI; real wiring is a separate future phase.

**Plans**: 3 committed + 1 if-time (Wave 0 data layer → Wave 1 cards → Wave 2 route-wire + e2e + live-verify; Wave 3 if-time monitor/history)

Plans:
- [ ] 08-00-PLAN.md — Wave 0 data layer (TDD): provisional WorkflowEvent contract + fromMockEvent adapter + HedgeLegParamsView + presets(→4083729/4083997) + dedicated workflow-store (owns reducer, stable-ref, getServerSnapshot=idle) + timed mock WorkflowEngine; failing-first (MOD4-FLOW) [wave 0]
- [ ] 08-01-PLAN.md — Wave 1 cards (TDD): HedgeDecisionCardV2 (fork-verified + FlaskConical "mock · no en vivo", full weight, no <details>, adjacent ilustrativo labels, Confirm+confirmRef) + MintCard + es-CO-first somnia.cornerstone.* copy (MOD4-A2, MOD4-MINT) [wave 1]
- [ ] 08-02-PLAN.md — Wave 2 wire: /apps/abrigo/cornerstone RSC shell (pre-renders DecisionPipelineTrace as children) + PromptBox + RunTranscript (useSyncExternalStore, aria-live, motion mounted-gate, focus-to-Confirm) + motion dep + e2e honesty greps + Evidence Collector live-verify (MOD4-FLOW, MOD4-A1, MOD4-A2, MOD4-MINT) [wave 2]
- [ ] 08-03-PLAN.md — Wave 3 IF-TIME (NOT required for phase completion): MonitorPanel (basic mock read) + RunHistory (idb, lazy openDB, client-only) — adds idb ONLY here, off the critical path (MOD4-MONITOR, MOD4-HISTORY) [wave 3]

---
*Roadmap created: 2026-05-11*
*Last updated: 2026-06-02 — Phase 7 (agent reasoning + position-execution surface, Module 3) planned: 4 plans (07-00 data layer → 07-01/02 trace+position parallel → 07-03 detail-route wire + live-verify); MOD3-HONKER deferred to 7.x*
