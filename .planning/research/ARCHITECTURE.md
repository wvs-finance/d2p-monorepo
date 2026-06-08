# Architecture Research

**Domain:** Agent-first DeFi research-lab frontend (multi-audience: researcher / participant / agent / internal)
**Researched:** 2026-05-11
**Confidence:** HIGH (core decisions), MEDIUM (RAG layer, content pipeline), LOW (indexer path before chain selection confirmed)

---

## Standard Architecture

### System Overview

```
┌───────────────────────────────────────────────────────────────────────────────┐
│                         EXTERNAL DATA SOURCES                                  │
│  ┌────────────┐  ┌─────────────┐  ┌──────────────┐  ┌───────────────────┐    │
│  │  EVM RPCs  │  │ HuggingFace │  │  GitHub API  │  │  AI Provider API  │    │
│  │ (Celo/L2s) │  │  Datasets   │  │  (org repos) │  │ (Anthropic/OpenAI)│    │
│  └─────┬──────┘  └──────┬──────┘  └──────┬───────┘  └────────┬──────────┘    │
└────────┼────────────────┼────────────────┼───────────────────┼───────────────┘
         │                │                │                   │
┌────────▼────────────────▼────────────────▼───────────────────▼───────────────┐
│                         VERCEL DEPLOYMENT BOUNDARY                             │
│                                                                                │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │                      Next.js 15 App (Single App)                        │  │
│  │                                                                         │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  ┌───────────┐  │  │
│  │  │  RSC Pages   │  │  Client      │  │  API Routes   │  │  MCP      │  │  │
│  │  │  (research   │  │  Components  │  │  (BFF + cache │  │  Handler  │  │  │
│  │  │   lab, dash) │  │  (wallet,    │  │   layer)      │  │  /api/mcp │  │  │
│  │  │              │  │   chat UI,   │  │               │  │  /[trans] │  │  │
│  │  │              │  │   charts)    │  │               │  │           │  │  │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬────────┘  └─────┬─────┘  │  │
│  │         │                 │                  │                 │        │  │
│  │  ┌──────▼─────────────────▼──────────────────▼─────────────────▼──────┐ │  │
│  │  │                     Shared Tool Definitions                         │ │  │
│  │  │              (lib/mcp-tools/ — single source of truth)              │ │  │
│  │  └─────────────────────────────────────────────────────────────────────┘ │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                                                                │
│  ┌──────────────┐  ┌────────────────┐  ┌──────────────────────────────────┐  │
│  │ Vercel Edge  │  │ Node Functions │  │ Background Jobs (Inngest)        │  │
│  │ (chat route, │  │ (heavy agg,    │  │ - RAG re-indexing                │  │
│  │  MCP stream) │  │  ABI codegen)  │  │ - HuggingFace dataset sync       │  │
│  └──────────────┘  └────────────────┘  │ - Chain state snapshots          │  │
│                                         └──────────────────────────────────┘  │
│                                                                                │
│  ┌──────────────────────────────────────────────────────────────────────────┐ │
│  │                     Vercel KV (Redis) — Hot Cache                        │ │
│  │  chain reads (30s TTL) │ HF dataset (1h TTL) │ GitHub meta (6h TTL)     │ │
│  └──────────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────────┘
         │
         │  (external to Vercel)
┌────────▼───────────────────────────────────────────────────────────────────────┐
│  Cloudflare Vectorize (RAG vector store — accessed via fetch from Node fn)      │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## Key Architecture Decisions

These are explicit decisions, not implicit assumptions. Each has consequences.

### Decision 1: Single Next.js App, No Monorepo

**Chosen:** Single Next.js 15 app at `frontend/` root, organized by feature directories.

**Rationale:** The project is early-stage with one team. A Turborepo monorepo (apps/web, apps/mcp, packages/ui, packages/contracts) would pay dividends with three teams and deployed-separately services. At this stage it introduces:
- Three package.json files to keep in sync
- Cross-package TypeScript path aliasing overhead
- Vercel project scoping complexity (`--filter` in pnpm)
- No actual runtime isolation (MCP and web are co-hosted anyway)

The MCP server runs as an API route within the Next.js app. The contract types and UI components are never deployed independently. If the MCP server later needs independent scaling or a separate OAuth boundary, extract it then. Do not pre-optimize.

**Implication for roadmap:** All phases operate on one repo. No workspace bootstrap phase needed.

---

### Decision 2: MCP Server Co-hosted as a Next.js API Route

**Chosen:** `app/api/mcp/[transport]/route.ts` using `@vercel/mcp-handler` (mcp-handler v1+, requires `@modelcontextprotocol/sdk >= 1.26.0`).

**Rationale:** Vercel provides first-class MCP deployment. The `mcp-handler` package handles Streamable HTTP and SSE transports from a single dynamic route segment. Deployment is automatic — no separate Cloudflare Worker, no separate Node service to manage. The `basePath: "/api/mcp"` config maps correctly to the route.

**What this gives:**
- MCP endpoint at `https://d2p.finance/api/mcp/sse` (SSE transport) and `/api/mcp` (Streamable HTTP)
- Zero-config preview URLs per PR — agent clients can hit the preview MCP endpoint
- Runs on Vercel Edge runtime (suitable for streaming SSE), or Node runtime for tools that need heavier computation

**Constraint:** MCP tools that need > 30s execution (e.g., full chain re-sync) cannot run within the Vercel function timeout. Those are delegated to Inngest background jobs instead (see Decision 6).

**Implication for roadmap:** MCP server phase is not separate infrastructure — it is an API route addition in Phase 2 or 3, after core data endpoints exist.

---

### Decision 3: Chat Engine Lives in an Edge API Route Using Vercel AI SDK

**Chosen:** `app/api/chat/route.ts` with `runtime = 'edge'`, using Vercel AI SDK v6 (`ai` package).

**Rationale:** AI SDK v6 (released Dec 2025) provides a unified provider interface (Anthropic, OpenAI, others — swap by changing two lines). Edge runtime minimizes TTFB for streaming tokens. The `useChat` hook on the client manages conversation state, avoids manual SSE parsing, and integrates with RSC for generative UI if needed later.

**Tool-sharing pattern:** The chat route imports tool definitions from `lib/mcp-tools/`. The MCP route imports the same definitions. Single source of truth. No duplication of tool schemas.

**Implication for roadmap:** Chat shell requires MCP tool definitions to exist. MCP tool definitions require data API endpoints to exist. Build order: data APIs → tool definitions → MCP route + chat route (these can be added together).

---

### Decision 4: Server-Rendered (Next.js App Router), Not Static Export

**Chosen:** Next.js 15 App Router with RSC. Not Astro static export. Not Next.js `output: "export"`.

**Rationale:**
- The live protocol dashboard (chain reads, LP positions, settlement status) cannot be static — it needs fresh data on every request or via streaming
- The MCP server requires a running server — incompatible with static export
- The chat engine requires server-side streaming
- RSC handles the research lab pages (marketing, iteration catalog) as zero-bundle server components — no performance penalty vs static for those sections
- Astro Island architecture was considered but it cannot serve the MCP endpoint or chat API without a separate Node process anyway

**Performance strategy for mobile-first / LCP < 2.5s on 3G:**
- Research lab pages: RSC, no client JS for static content, streamed via Suspense boundaries
- Dashboard: skeleton UI rendered server-side, chart data fetched client-side after hydration
- Fonts: variable fonts, `font-display: optional`, self-hosted (not Google Fonts CDN)
- Images: `next/image` with `sizes` and WebP/AVIF

---

### Decision 5: Direct RPC via viem/wagmi as Primary Chain Read Path; Envio for Historical Aggregations

**Chosen:** viem `publicClient` for real-time reads (balances, pool state, settlement status). Envio HyperIndex for historical/aggregated queries (LP position history, settlement volume over time).

**Rationale for direct RPC (real-time):**
- Pool state, connected wallet balance, current settlement status change block-by-block
- No indexer can match freshness of a direct eth_call or eth_getLogs on a short range
- wagmi v2 + viem provides 100+ chain support including Celo with `feeCurrency` specifics handled natively
- Chain config: `createConfig({ chains: [celo, mainnet, base, arbitrum, optimism], transports: { [celo.id]: http(RPC_URL), ... } })`

**Rationale for Envio (historical):**
- Envio HyperIndex benchmarked at 143x faster than The Graph for comparable queries (May 2025 benchmarks)
- The Graph Hosted Service fully deprecated 2026 — GRT-based decentralized network or migrate
- Ponder requires self-hosted infrastructure and operational overhead — wrong for a 3-week hackathon timeline
- Envio provides GraphQL API out of the box; team's Solidity contracts (reactive-hooks, ThetaSwap-core) become indexable with standard event schema declarations
- Fallback for pre-Envio state: direct RPC with limited block range

**Multi-chain strategy:**
1. **Celo first** — where deployed instruments live; configure as primary chain in wagmi
2. **Add Base, Arbitrum, Optimism** — add chain objects to the wagmi config; Envio supports all EVM chains with the same indexer schema
3. **Ethereum mainnet** — read-only reference (price feeds, USDC liquidity); no transact surface on mainnet at MVP
4. Cross-chain data is aggregated in the BFF API route (`app/api/dashboard/route.ts`) which fans out to each chain's viem client and merges results before responding — client receives unified JSON, not per-chain responses

---

### Decision 6: Inngest for Long-Running Background Tasks

**Chosen:** Inngest (Vercel-integrated, first-class) for tasks that exceed serverless timeout limits.

**Tasks delegated to Inngest:**
- RAG corpus re-indexing (embed new iteration docs → Cloudflare Vectorize)
- HuggingFace dataset sync (pull fresh parquet/CSV, parse, cache)
- Chain state snapshots for dashboard history

**Why not Trigger.dev:** Trigger.dev runs jobs on Trigger's infrastructure (not Vercel functions). Inngest calls your own Vercel API routes as steps — simpler operational model, same codebase, no second deployment target at MVP stage.

**Why not Vercel Cron alone:** Cron triggers work but have no retry logic, no step-based execution, and no observability. Inngest wraps cron-triggered functions with all of those.

---

### Decision 7: RAG Vector Store on Cloudflare Vectorize

**Chosen:** Cloudflare Vectorize, accessed from Next.js Node runtime API routes (not edge runtime — Vectorize requires Workers binding, so we use fetch() to a Cloudflare Worker shim or the Vectorize REST API).

**Corpus for RAG:**
- Iteration write-ups (MDX from `abrigo/scratch/`, `abrigo/docs/`)
- Notebook summaries (auto-generated markdown from `abrigo-analytics`)
- Protocol README files and ABI documentation

**Alternative considered (pgvector):** Requires a Postgres instance (Vercel Postgres, Neon, Supabase). Adds a database dependency for what is essentially a read-heavy search corpus. Vectorize is purpose-built, free tier is adequate for this corpus size, and integrates with Cloudflare's AI stack if embedding generation moves to Workers AI. Use pgvector if the project already has a Postgres instance for other reasons — it does not.

**Embedding model:** `text-embedding-3-small` (OpenAI) or `sentence-transformers/all-MiniLM-L6-v2` via Cloudflare Workers AI. Decision: default to OpenAI (already a provider dependency for chat), switch to Workers AI if cost becomes an issue.

---

## Component Boundaries

| Component | Responsibility | Runtime | Communicates With |
|-----------|---------------|---------|-------------------|
| RSC Pages (`app/(lab)/`) | Research lab marketing, iteration catalog, notebook embeds | Node / Edge RSC | GitHub API, HF Dataset API (build-time or RSC cache) |
| RSC Pages (`app/(dashboard)/`) | Live protocol state, LP positions, settlement status | Node RSC + client hydration | BFF API routes |
| Client Components (`components/wallet/`) | Wallet connection, tx flow | Browser | wagmi config, RainbowKit |
| Client Components (`components/charts/`) | Econometric charts, β estimates, confidence bands | Browser | API routes (pre-fetched data) |
| Client Components (`components/chat/`) | Conversational shell | Browser | `/api/chat` Edge route |
| API Route: `/api/mcp/[transport]` | MCP server endpoint for external agents | Edge (SSE) / Node (Streamable HTTP) | `lib/mcp-tools/` |
| API Route: `/api/chat` | Streaming AI chat | Edge | AI SDK, `lib/mcp-tools/` |
| API Route: `/api/dashboard` | Multi-chain data aggregation | Node | viem publicClients (per chain), Vercel KV |
| API Route: `/api/econometrics` | HF dataset proxy + cache | Node | HuggingFace Datasets API, Vercel KV |
| `lib/mcp-tools/` | Tool definitions (shared) | N/A — pure TS | Consumed by `/api/mcp` and `/api/chat` |
| `lib/contracts/` | ABI types + wagmi-CLI codegen output | N/A — pure TS | Consumed by wallet components and BFF |
| `lib/chains/` | viem chain configs + transport factories | N/A — pure TS | wagmi config, API routes |
| Content (`content/iterations/`) | MDX iteration write-ups + YAML frontmatter | Build time (Velite) | RSC pages |
| Inngest Functions (`inngest/`) | RAG indexing, HF sync, chain snapshots | Inngest (calls Vercel routes as steps) | Cloudflare Vectorize, HF API, viem |

---

## Data Flow

### Flow 1: Chain Read → Dashboard Page

```
Browser requests /dashboard
    ↓ (RSC, Node runtime)
app/(dashboard)/page.tsx
    → fetch("/api/dashboard") with no-store (fresh on every RSC render)
        ↓ (Node function)
        app/api/dashboard/route.ts
            → check Vercel KV for cached result (TTL: 30s)
            → CACHE HIT: return cached JSON
            → CACHE MISS:
                → fan out to viem publicClients:
                    celo.readContract(poolState)
                    arbitrum.readContract(poolState)
                    base.readContract(poolState)
                → merge results, write to Vercel KV with 30s TTL
                → return JSON
    ↓
RSC renders skeleton + data props
    ↓ (hydration)
Client chart components animate in
    ↓ (React Query, staleTime: 30s)
Background refetch every 30s from client
```

### Flow 2: abrigo-analytics → HuggingFace → Site

```
abrigo/ Python pipeline runs (CI or manual)
    → exports parquet to HuggingFace dataset repo (public)
        ↓ (triggered by Inngest scheduled function, or build-time RSC fetch)

Build-time path (for static econometric charts):
    Inngest fn or Next.js build
        → fetch HuggingFace Dataset API (JSON/parquet rows)
        → write to Vercel KV (TTL: 1h)
        → RSC pages read from KV, render charts as static SVG

Runtime path (for live updates without rebuild):
    Client requests /econometrics page
        → RSC fetches /api/econometrics
            → /api/econometrics checks Vercel KV (TTL: 1h)
            → CACHE MISS: fetches HF Dataset API, parses, caches, returns
        → RSC renders econometric charts server-side

Freshness guarantee: HF dataset is updated infrequently (per iteration pass)
1h TTL is appropriate; no need for < 60s freshness on research outputs.
```

### Flow 3: MDX Content → Iteration Catalog

```
abrigo/scratch/*.md + abrigo/docs/*.md (source of truth)
    ↓ (CI: copy to frontend/content/ or symlink — see content pipeline section)
frontend/content/iterations/*.mdx
    ↓ (Velite build transform)
.velite/iterations.json (typed, Zod-validated)
    ↓ (RSC import)
app/(lab)/iterations/[slug]/page.tsx
    → renders iteration detail: status badge, β estimate, evidence summary, notebook link
```

### Flow 4: User → Wallet → Contract

```
User connects wallet (RainbowKit modal)
    ↓ (wagmi connector, WalletConnect projectId required)
wagmi account state (client-only, never server-side)
    ↓
User initiates position (hedge instrument)
    ↓ (writeContract via wagmi)
Celo chain via configured viem walletClient
    ↓ (tx hash)
Client polls tx receipt (wagmi useWaitForTransactionReceipt)
    ↓ (confirmed)
Dashboard re-fetches position state
```

### Flow 5: External Agent → MCP Tools

```
Agent (Claude Desktop, Cursor, custom)
    → GET/POST https://d2p.finance/api/mcp/sse
        ↓ (mcp-handler routes to tool)
        lib/mcp-tools/iterations.ts  → query .velite cache or KV
        lib/mcp-tools/chain-state.ts → query /api/dashboard (via internal fetch)
        lib/mcp-tools/econometrics.ts → query /api/econometrics
        ↓ (JSON-RPC response)
    Agent receives structured data
```

### Flow 6: Human → Chat Shell → RAG → AI Response

```
User types question in chat UI
    ↓ (useChat hook, POST /api/chat)
app/api/chat/route.ts (Edge runtime)
    → embed user query (OpenAI text-embedding-3-small)
    → fetch Cloudflare Vectorize: top-K similar chunks from corpus
    → build augmented system prompt with retrieved chunks
    → streamText() via Vercel AI SDK → Anthropic claude-sonnet-4-5
        ↓ (with tool_use enabled)
        tools imported from lib/mcp-tools/ (same definitions as MCP server)
    ↓ (streamed SSE to client)
useChat hook updates UI token-by-token
```

### State Management Summary

```
Wallet state:    wagmi v2 (client-only, never SSR)
                 ↓ useAccount, useBalance, useWriteContract
                 stored in wagmi QueryClient (TanStack Query backed)

Server state:    TanStack Query (client) + RSC cache (server)
                 chain reads: staleTime 30s, refetchInterval 30s
                 econometrics: staleTime 3600s (1h)
                 GitHub/lab meta: staleTime 21600s (6h)

URL state:       nuqs (useQueryState) for:
                 - iteration filter (status: PASS | FAIL | PARKED | IN_PROGRESS)
                 - chain selector (celo | base | arbitrum)
                 - dashboard time range
                 nuqs is 6kB gzipped, RSC-compatible, used by Vercel/Sentry

Local UI state:  React useState / useReducer (modal open, tab selection)
                 Zustand only if cross-component wallet-flow state becomes complex
                 (defer Zustand unless needed — not in initial phases)
```

---

## Recommended Project Structure

```
frontend/
├── app/
│   ├── (lab)/                    # Research lab audience (RSC-heavy, no wallet)
│   │   ├── page.tsx              # Homepage / lab story
│   │   ├── iterations/
│   │   │   ├── page.tsx          # Iteration catalog (all statuses)
│   │   │   └── [slug]/page.tsx   # Iteration detail
│   │   └── papers/               # External paper links, org repos
│   ├── (dashboard)/              # Protocol dashboard (mixed RSC + client)
│   │   ├── page.tsx              # Multi-chain overview
│   │   └── [chain]/page.tsx      # Per-chain pool state
│   ├── (defi)/                   # Wallet-connected DeFi surface
│   │   └── hedge/page.tsx        # Instrument interaction (gated)
│   ├── api/
│   │   ├── mcp/
│   │   │   └── [transport]/route.ts   # MCP server (Decision 2)
│   │   ├── chat/route.ts              # AI chat endpoint (Decision 3)
│   │   ├── dashboard/route.ts         # Multi-chain BFF aggregation
│   │   └── econometrics/route.ts      # HF dataset proxy
│   ├── .well-known/
│   │   └── mcp/route.ts               # MCP discovery endpoint
│   ├── llms.txt/route.ts              # llms.txt (agent-readable site index)
│   ├── layout.tsx                     # Root layout (i18n, wallet providers)
│   └── globals.css
├── components/
│   ├── lab/                       # Research lab UI components (RSC-safe)
│   │   ├── IterationCard.tsx      # Status badge, β estimate display
│   │   └── ReplicationHash.tsx    # Epistemic honesty: replication hashes
│   ├── dashboard/                 # Dashboard components (client)
│   │   ├── PoolStateChart.tsx
│   │   └── ChainSelector.tsx
│   ├── chat/                      # Chat shell (client)
│   │   └── ChatShell.tsx
│   ├── wallet/                    # Wallet UI (client-only)
│   │   └── ConnectButton.tsx
│   └── ui/                        # Design system primitives
│       ├── Button.tsx
│       ├── Badge.tsx              # PASS / FAIL / PARKED / IN_PROGRESS
│       └── Typography.tsx
├── lib/
│   ├── mcp-tools/                 # SINGLE SOURCE OF TRUTH for tool definitions
│   │   ├── iterations.ts          # get_iteration, list_iterations
│   │   ├── chain-state.ts         # get_pool_state, get_settlement_status
│   │   └── econometrics.ts        # get_beta_estimate, get_confidence_interval
│   ├── contracts/                 # ABI types (wagmi CLI codegen output)
│   │   ├── abis/                  # Raw ABI JSON files (from wvs-finance repos)
│   │   └── generated.ts           # wagmi CLI generated hooks + types
│   ├── chains/                    # viem chain configs
│   │   ├── config.ts              # wagmi createConfig (celo first + others)
│   │   └── transports.ts          # HTTP transport factory per chain
│   ├── hf/                        # HuggingFace dataset client
│   │   └── client.ts
│   └── vectorize/                 # Cloudflare Vectorize client
│       └── client.ts
├── content/
│   ├── iterations/                # MDX write-ups (sourced from abrigo/)
│   │   ├── pair-d.mdx
│   │   └── dev-ai-stage-1.mdx
│   └── velite.config.ts           # Velite schema definitions
├── inngest/
│   ├── client.ts                  # Inngest client init
│   ├── rag-index.ts               # RAG re-indexing function
│   └── hf-sync.ts                 # HuggingFace dataset sync
├── i18n/
│   ├── es-CO/                     # Spanish (Colombian) strings
│   └── en/                        # English strings
├── public/
│   └── llms.txt                   # Agent-readable site index (static file)
└── velite.config.ts               # Root Velite config
```

### Structure Rationale

- **Route groups `(lab)`, `(dashboard)`, `(defi)`:** Separate layout concerns without affecting URL paths. Lab pages get no wallet provider in their layout (faster RSC). Dashboard pages get Suspense boundaries. DeFi pages get WagmiProvider + RainbowKitProvider.
- **`lib/mcp-tools/`:** This is the critical shared boundary. Both the MCP API route and the chat API route import from here. Adding a new tool means editing one file, not two.
- **`lib/contracts/`:** ABI files are pulled from `wvs-finance` GitHub repos or the sibling `abrigo/` directory. wagmi CLI runs at codegen time: `wagmi generate` produces typed hooks and `readContract`/`writeContract` wrappers. ABIType handles the TypeScript inference — no TypeChain.
- **`content/`:** Velite processes this at build time. MDX iteration files live here; the source of truth is `abrigo/scratch/` and `abrigo/docs/`, copied or symlinked by a CI step before `next build`.
- **`inngest/`:** Co-located with the app but operates on a separate execution model. Inngest calls back into the app's `/api/inngest` endpoint.

---

## Content Pipeline

### MDX Iteration Write-ups (Velite)

**Chosen:** Velite (over Contentlayer — unmaintained/abandoned; over `@next/mdx` — no type safety for frontmatter).

Velite validates frontmatter with Zod schemas at build time:

```typescript
// content/velite.config.ts
const iterations = defineCollection({
  name: 'Iteration',
  pattern: 'iterations/**/*.mdx',
  schema: z.object({
    title: z.string(),
    status: z.enum(['PASS', 'FAIL', 'PARKED', 'IN_PROGRESS']),
    beta: z.number().optional(),
    pValue: z.number().optional(),
    replicationHash: z.string().optional(),
    lang: z.enum(['en', 'es-CO']).default('en'),
    publishedAt: z.string(),
  }),
});
```

The `status` field is required and typed — the UI cannot accidentally omit FAIL iterations. The `replicationHash` field surfaces the epistemic-honesty constraint in the data model itself.

**Sync from abrigo/:** A CI step (GitHub Action) copies `../abrigo/scratch/*.md` and `../abrigo/docs/*.md` into `frontend/content/iterations/` before `next build`. No runtime fetch from GitHub — content is static at build time. Re-synced on every PR that touches `abrigo/`.

**Versioning:** Iteration versions (Pair D v1, v2) are separate MDX files with a `version` frontmatter field and a `iterationId` field that links them. The catalog page groups by `iterationId` and shows all versions — both are visible, neither is hidden.

---

## Agent-Surface Architecture

### llms.txt

A static `public/llms.txt` file is committed to the repo. It is not generated at runtime. It lists:
- What d2p Finance / DS2P Labs is
- All iteration slugs with their current status
- Links to MCP endpoint, API documentation routes
- Links to key RSC pages

Updated manually when new iterations ship. This is appropriate — it is a curated index, not a sitemap.

### .well-known/mcp

A Next.js route at `app/.well-known/mcp/route.ts` returns JSON describing the MCP server endpoint:

```json
{
  "mcp_servers": [
    {
      "url": "https://d2p.finance/api/mcp",
      "transport": ["streamable-http", "sse"],
      "description": "d2p Finance protocol and research state"
    }
  ]
}
```

This is the emerging agent-discovery standard. MCP adoption has hit 97M monthly SDK downloads as of 2026; agent clients increasingly check `.well-known/mcp` before manual configuration.

### JSON-LD

RSC pages for iterations include JSON-LD `SchemaApp` structured data:
- `ResearchProject` type for the lab homepage
- `ScholarlyArticle` for iteration write-ups with `status` as custom property
- `FinancialProduct` for deployed instruments

Pages with valid structured data are 2.3x more likely to appear in AI-generated summaries (LLM citation research, 2025). This is low-effort, high-value for an agent-first site.

### Auth Model for Agents

- **Anonymous read:** All MCP tools that read public on-chain data or published iteration results are unauthenticated. No API key required.
- **Write / private ops:** Not in scope at MVP. The MCP server is read-only at launch.
- **Rate limiting:** Vercel rate limiting (Edge Middleware) applies per IP. Sufficient for MVP; if agent traffic spikes, add token-bucket middleware.

---

## Caching Strategy by Data Class

| Data Class | Source | TTL | Cache Layer | Notes |
|------------|--------|-----|-------------|-------|
| Chain reads (pool state, balances) | EVM RPC | 30s | Vercel KV | Stale-while-revalidate; 30s is 2 Celo blocks |
| Settlement status | EVM RPC | 60s | Vercel KV | Slower-moving than pool state |
| HuggingFace dataset (econometrics) | HF Datasets API | 1h | Vercel KV | Research outputs update per iteration, not per block |
| GitHub org metadata (repos, READMEs) | GitHub REST API | 6h | Vercel KV | Rarely changes; avoids GitHub rate limiting |
| MDX content (iterations catalog) | Velite build output | Build-time | CDN edge | Re-built on every deploy; instant delivery |
| RAG corpus embeddings | Cloudflare Vectorize | Persistent | Vectorize | Re-indexed by Inngest on new content push |
| AI chat responses | None (streamed) | N/A | N/A | Stateless per session |
| Wallet state | wagmi/browser | Session | Browser memory | Never server-cached — client-only |

---

## ABI Codegen Pipeline

**Chosen:** wagmi CLI (`@wagmi/cli`) with ABIType inference. No TypeChain.

Workflow:
1. ABI JSON files from `wvs-finance` org repos (ThetaSwap-core, reactive-hooks, clamm-squared) are stored in `lib/contracts/abis/`
2. `wagmi.config.ts` points to these files
3. `pnpm wagmi generate` outputs `lib/contracts/generated.ts` — typed hooks and viem action wrappers
4. Committed to repo; re-run when ABIs change

This provides:
- `useReadThetaSwapPoolState()` — typed React hook
- `readThetaSwapPoolState(config, { address, ... })` — typed viem action for server-side use
- Full TypeScript inference for ABI function params and return types via ABIType — no code generation artifacts that can go stale if TypeChain's templates change

---

## Architectural Patterns

### Pattern 1: BFF Aggregation Route (Backend-For-Frontend)

**What:** Each complex data need has a dedicated API route that aggregates, normalizes, and caches data from multiple upstream sources before returning a single response to the client.

**When to use:** Dashboard data (multi-chain reads), econometrics (HF parse + transform), any case where the client would otherwise make 3+ upstream calls.

**Trade-offs:** Slight additional latency hop vs. client-direct fetching. Eliminates CORS issues with RPC providers. Enables server-side caching (Vercel KV). Allows rate-limit management in one place.

### Pattern 2: Shared Tool Definition Module

**What:** `lib/mcp-tools/` contains pure TypeScript functions that are imported by both the MCP API route and the chat API route. Tools are defined once with full Zod schemas.

**When to use:** Every time a new data-fetching capability is added that should be accessible to both agents and the chat interface.

**Trade-offs:** Requires discipline — resist the temptation to put tool logic directly in the route handler. The payoff is that every new MCP tool is automatically available in the chat shell without additional wiring.

### Pattern 3: Route Group Layout Isolation

**What:** Next.js route groups `(lab)`, `(dashboard)`, `(defi)` each have their own `layout.tsx`. Only `(defi)` gets the wallet provider context. Only `(dashboard)` gets the TanStack Query provider for live chain data.

**When to use:** When different site sections have fundamentally different runtime requirements (wallet, live data, static).

**Trade-offs:** Slightly more layout files. The benefit: RSC pages in `(lab)` never hydrate wallet state, eliminating an entire class of hydration errors and reducing bundle size for the research audience.

---

## Anti-Patterns

### Anti-Pattern 1: Wallet State in RSC or API Routes

**What people do:** Try to read wagmi account state in a Server Component or API route.

**Why it's wrong:** Wallet state is browser-only. It is not knowable at render time on the server. Attempting to access it server-side causes hydration mismatches and crashes.

**Do this instead:** Keep all wallet-aware components under a `'use client'` boundary inside the `(defi)` route group. RSC pages for the dashboard read public chain state via API routes (no wallet required for reads).

### Anti-Pattern 2: Duplicating Tool Definitions

**What people do:** Define an MCP tool in `app/api/mcp/[transport]/route.ts` and then write similar logic in `app/api/chat/route.ts` to make the chat shell do the same thing.

**Why it's wrong:** Two sources of truth diverge. The chat shell says the pool is in state X. The MCP tool says Y. Both are calling the same chain differently.

**Do this instead:** `lib/mcp-tools/` is the only place tool logic lives. Both routes import it.

### Anti-Pattern 3: Fetching HuggingFace at Every Client Request

**What people do:** Call the HuggingFace Datasets API directly from client-side React Query with no server cache.

**Why it's wrong:** HuggingFace is not an RPC — it does not expect 30-second polling. Rate limits apply. CORS headers on HF APIs are not guaranteed. Parquet parsing is expensive in the browser.

**Do this instead:** The `/api/econometrics` BFF route fetches HF once, parses to JSON, caches in Vercel KV for 1h, and returns clean structured data. Clients poll the BFF, not HF directly.

### Anti-Pattern 4: Monorepo Without the Teams to Justify It

**What people do:** Create `apps/web`, `apps/mcp`, `packages/ui` at project start "to keep things clean."

**Why it's wrong:** Cross-package TypeScript references, workspace-aware builds, and Vercel multi-project config add weeks of overhead at MVP stage. The MCP server is three files. The UI components are owned by one person. There is nothing to isolate.

**Do this instead:** Single Next.js app with clear directory boundaries. Extract to monorepo when (a) a second deployable service genuinely has different release cadence, or (b) a second team owns a package.

---

## Integration Points

### External Services

| Service | Integration Pattern | Runtime | Cache TTL | Notes |
|---------|---------------------|---------|-----------|-------|
| Celo RPC | viem publicClient, http() transport | Node (API route) + Browser (wagmi) | 30s KV | Use Infura/Alchemy Celo endpoint; public Celo RPC is rate-limited |
| Base / Arbitrum / Optimism RPC | Same as Celo | Node + Browser | 30s KV | Configure in `lib/chains/transports.ts` |
| Ethereum mainnet | viem publicClient, read-only | Node (API route) | 60s KV | Price feeds only; no wallet tx on mainnet at MVP |
| HuggingFace Datasets API | fetch() with Bearer token (public dataset = no token needed) | Node (API route + Inngest) | 1h KV | Dataset is public; token only needed for private datasets |
| GitHub REST API | fetch() with PAT in env | Node (API route, RSC) | 6h KV | Avoid unauthenticated rate limit (60 req/hr) — use PAT |
| Anthropic / OpenAI | Vercel AI SDK | Edge (chat route) | N/A | API key in env; AI SDK provider abstraction |
| Cloudflare Vectorize | REST API or Workers binding via fetch | Node (Inngest, chat route) | Persistent | Not available on Vercel Edge runtime natively; use REST API |
| WalletConnect Cloud | RainbowKit projectId | Browser | N/A | Free; required for WalletConnect v2 |
| Inngest | SDK + /api/inngest endpoint | Node | N/A | Register functions at startup; Vercel integration handles deploy webhook |

### Internal Boundaries

| Boundary | Communication | Direction | Notes |
|----------|---------------|-----------|-------|
| `lib/mcp-tools/` ↔ `/api/mcp` | Direct TypeScript import | `mcp-tools` → route | Tools are pure functions; route wraps them in MCP transport |
| `lib/mcp-tools/` ↔ `/api/chat` | Direct TypeScript import | `mcp-tools` → route | Same import, different consumer |
| `lib/contracts/` ↔ wallet components | Direct TypeScript import | `contracts/generated.ts` → component | Generated hooks typed to specific ABIs |
| `lib/contracts/` ↔ `/api/dashboard` | Direct TypeScript import | `contracts/generated.ts` → route | Server-side `readContract` wrappers |
| `content/iterations/` ↔ RSC pages | Velite build output | `.velite/*.json` → RSC import | Type-safe; validated at build not runtime |
| `inngest/` ↔ `/api/inngest` | Inngest SDK runtime | Inngest cloud → Next.js route | Inngest calls the route; route runs the step function |

---

## Suggested Build Order (Phase Dependencies)

This is the dependency-driven sequence that should inform roadmap phase structure.

### Phase 0: Foundation (blocks everything else)
- Next.js 15 app scaffold with App Router
- Route group layout structure `(lab)`, `(dashboard)`, `(defi)`
- `lib/chains/config.ts` — wagmi config with Celo as primary chain
- i18n setup (`next-intl` or `next-i18next`) — retrofitting i18n is painful; do it first
- Design system primitives (`components/ui/`) — typography, color tokens, Badge (PASS/FAIL/PARKED), Button
- Velite setup with iteration schema — even with no content, the schema is the contract
- Environment variable schema (Zod-validated at startup, fail fast on missing keys)

**Why first:** Every other component needs the design system. Every page needs i18n. Every data fetch needs chain config. The iteration schema defines the data model for the entire research lab surface.

### Phase 1: Research Lab Surface (parallelizable after Phase 0)
- MDX content pipeline (copy from abrigo/, Velite transform)
- Iteration catalog page (RSC, all statuses rendered)
- Iteration detail page (β estimate, evidence, replication hash, notebook link)
- Lab homepage (mission, team, org repos)
- `public/llms.txt` (static, hand-written at launch)
- JSON-LD on iteration pages

**Dependency:** Phase 0 complete. Does NOT require wallet, chain reads, or MCP.

### Phase 2: Data Layer + BFF (gates dashboard and MCP)
- `/api/dashboard` route with multi-chain viem reads and Vercel KV caching
- `/api/econometrics` route with HuggingFace fetch and caching
- `/api/github` route for org metadata
- wagmi CLI codegen pipeline (`lib/contracts/generated.ts`)
- `lib/mcp-tools/` initial tool definitions (iterations, chain-state, econometrics)

**Dependency:** Phase 0 + ABI files from wvs-finance repos. This phase must complete before Phase 3 and Phase 4 can start.

### Phase 3: Dashboard (can start in parallel with Phase 2, needs it to complete)
- Dashboard page (RSC skeleton + client chart hydration)
- Per-chain page
- ChainSelector (nuqs URL state)
- Wallet connection (RainbowKit + wagmi, `(defi)` layout only)

**Dependency:** Phase 2 BFF routes must exist for chart data. Wallet connection is independent of chain reads.

### Phase 4: MCP Server + Chat Shell (gates agent-surface)
- `/api/mcp/[transport]/route.ts` (mcp-handler, imports from `lib/mcp-tools/`)
- `.well-known/mcp` route
- `/api/chat/route.ts` (Vercel AI SDK Edge, imports from `lib/mcp-tools/`)
- `components/chat/ChatShell.tsx` (useChat hook)
- Inngest setup: RAG indexing function, HF sync function
- Cloudflare Vectorize corpus load (initial embedding of iteration write-ups)

**Dependency:** Phase 2 tool definitions. Phase 1 content (for RAG corpus). MCP and chat can be built together since they share the tool module.

### Phase 5: DeFi Transaction Surface (last, gated by security review)
- Instrument interaction page under `(defi)/hedge/`
- `writeContract` flows (Celo first)
- Transaction confirmation UX
- Safety review gate (explicit threat model before shipping)

**Dependency:** Phase 3 wallet connection. Protocol contracts deployed on Celo.

---

## Scalability Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0–1k users / hackathon demo | Current architecture is correct. Vercel KV free tier. Vectorize free tier. Inngest free tier (1k runs/month). |
| 1k–50k users | Increase Vercel KV TTLs for expensive chain reads. Add Envio historical indexer (removes repeated eth_getLogs). Consider Vercel Pro for longer function timeouts. |
| 50k+ users | Extract MCP server to Cloudflare Workers (native Vectorize binding, no REST API hop). Add CDN-level caching for econometrics endpoint. Consider Ponder or dedicated Postgres for LP position history if Envio GraphQL becomes a bottleneck. |

**First bottleneck:** EVM RPC rate limits. Free-tier Infura/Alchemy caps are hit fast with multiple concurrent users polling `/api/dashboard`. Fix: increase Vercel KV TTL from 30s → 60s for non-critical reads, or add a dedicated RPC endpoint (Infura paid tier).

**Second bottleneck:** Vercel KV write amplification under concurrent cache misses. The same cache miss fires multiple simultaneous HF fetches. Fix: add a distributed lock pattern (Vercel KV `SET NX`) before the cache miss fetch.

---

## Sources

- [Next.js MCP Guide (official, 2026-05-07)](https://nextjs.org/docs/app/guides/mcp)
- [vercel/mcp-handler GitHub](https://github.com/vercel/mcp-handler)
- [Deploy MCP servers to Vercel](https://vercel.com/docs/mcp/deploy-mcp-servers-to-vercel)
- [Vercel AI SDK Documentation](https://ai-sdk.dev/docs/introduction)
- [Envio Best Blockchain Indexers 2026 benchmark](https://docs.envio.dev/blog/best-blockchain-indexers-2026)
- [wagmi v2 multichain guide](https://wagmi.sh/core/guides/chain-properties)
- [Celo + viem official docs](https://docs.celo.org/developer/viem)
- [Velite with Next.js](https://velite.js.org/guide/with-nextjs)
- [nuqs URL state (Next.js Conf 2025)](https://nextjs.org/conf/session/type-safe-url-state-in-nextjs-with-nuqs)
- [Cloudflare Vectorize RAG](https://developers.cloudflare.com/vectorize/)
- [Inngest + Vercel integration](https://www.inngest.com/blog/vercel-long-running-background-functions)
- [llms.txt adoption analysis 2026](https://codersera.com/blog/llms-txt-complete-guide-2026/)
- [ABIType strict TypeScript for ABIs](https://abitype.dev/)
- [RainbowKit wagmi v2 migration](https://rainbowkit.com/docs/installation)

---

*Architecture research for: agent-first DeFi research-lab frontend (d2p Finance / DS2P Labs)*
*Researched: 2026-05-11*
