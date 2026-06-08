# Phase 3: Data Layer and On-Chain Dashboard - Research

**Researched:** 2026-05-28
**Domain:** viem multicall / Next.js 16 route handlers / nuqs server-side / caching primitives / RPC health checks
**Confidence:** HIGH (all critical claims verified against official docs or installed source)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **On-chain protocol state ONLY.** Pool balances, settlement-event counts, LP-position counts, last-block-synced — per chain, per deployed Abrigo instrument.
- **DASH-02 (HuggingFace econometrics BFF route), DASH-05 (visx econometric charts), DASH-06 (chart a11y) are DESCOPED.**
- **Net requirement set: DASH-01, DASH-03, DASH-04, DASH-07, DASH-08** (DASH-02/05/06 descoped).
- **No Abrigo contracts are deployed on-chain yet.** Dashboard must not invent numbers.
- **Instrument-address registry is the single seam:** empty today → skeleton state; populated later → live reads.
- **Dashboard URL: `/apps/abrigo/dashboard`** — app-scoped, under `(apps)` route group.
- **`/status` is umbrella-scoped at `/status`** (DASH-08).
- **Schema preview / skeleton.** Render real layout with dashed values + "Live once contracts deploy" banner; no fake numbers (anti-fishing).
- **All 5 wagmi chains** in selector: Celo (primary), Ethereum, Base, Arbitrum, Optimism.
- **nuqs URL params** (`?chain=celo`) for chain selector — shareable and agent-readable.
- **RSC + server-side multicall** for read-first / no-JS first paint (DASH-07).
- **`/status` degrades per-chain** — one RPC down must not blank the page.
- **HuggingFace dataset version line dropped** from `/status` (econometrics descoped).
- **Caching is a no-op until contracts deploy.** Vercel KV is deprecated; use `'use cache'` directive (Cache Components, stable in Next.js 16) or no-op until addresses exist.

### Claude's Discretion

- Exact skeleton-tile visual treatment (within locked tokens: muted ochre, IBM Plex, no anti-patterns).
- Multicall batching strategy and per-chain error isolation.
- Whether `/status` is an RSC page or a JSON route + thin page (serves both humans and agents).
- Caching approach — likely a no-op until contracts deploy.

### Deferred Ideas (OUT OF SCOPE)

- Econometric charts on the dashboard (visx β + 95% CI, replication overlays) — DASH-05/06.
- HuggingFace econometrics BFF route — DASH-02.
- Live caching layer (Vercel Runtime Cache / Marketplace Redis) — build when contracts deploy.
- Per-instrument deep pages (`/apps/abrigo/instruments/{id}/{chain}`) — DEFI-03, Phase 5.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DASH-01 | BFF API route `/api/dashboard?app=abrigo` aggregates deployed Abrigo contract state across configured chains using viem multicall | viem `createPublicClient` + `multicall` with `allowFailure:true` per chain; instrument registry as the seam; `force-dynamic` route segment config; `'use cache'` helper pattern for future TTL |
| DASH-03 | Dashboard page at `/apps/abrigo/dashboard` — pool balances, settlement events, LP positions, last block synced per chain | RSC page under `(apps)` route group; server-side read of BFF or direct multicall; skeleton tiles with dashed values when registry empty |
| DASH-04 | Chain selector uses URL search params via `nuqs` | `parseAsStringEnum` + `createSearchParamsCache` / `createLoader` from `nuqs/server`; NuqsAdapter already wired in `(apps)/layout.tsx` |
| DASH-07 | Dashboard renders correctly with no chain connection, no wallet, no JS hydration | Pure RSC page; chain selector is the only Client Component (nuqs hook); no wagmi wallet hooks imported; first paint meaningful with skeleton |
| DASH-08 | `/status` page — RPC health per chain, build hash, data freshness, per-app rollup | `eth_blockNumber` health check per chain via `getBlockNumber`; `VERCEL_GIT_COMMIT_SHA` pattern from `app/api/health/route.ts`; both RSC page + JSON route (`/api/status`) recommended; graceful per-chain degradation via `Promise.allSettled` |
</phase_requirements>

---

## Summary

Phase 3 builds three interlocking things: a BFF route (`/api/dashboard`) that aggregates on-chain state via viem multicall across five chains; a dashboard RSC page at `/apps/abrigo/dashboard` that renders that state (or a schema-preview skeleton when the instrument registry is empty); and an umbrella `/status` page reporting per-chain RPC health. The chain selector (nuqs) is the only hydrated client island on the dashboard — everything else renders as RSC on first paint with no wallet connection required.

The central design decision is the **instrument-address registry as the explicit seam**. When the registry array is empty (today), iterating over zero instruments produces zero multicall inputs, and the page renders only skeleton tiles. When addresses are added, the exact same code path produces live data. This eliminates any "coming soon" hardcode that would diverge from the real renderer.

The caching situation has a clear answer: `@vercel/kv` is dead. The current production-ready primitive is Next.js 16's `'use cache'` directive (stable since Next 16.0, requires `cacheComponents: true` in `next.config.ts`). Because there are no contracts and thus no live reads to cache at launch, the correct posture is to extract fetch logic into a `'use cache'`-annotated helper from day one, but leave `cacheLife` at its default profile (15-minute server revalidate). When contracts deploy, a `cacheLife('seconds')` call or a custom profile is a one-line change.

**Primary recommendation:** Use `export const dynamic = 'force-dynamic'` + `export const runtime = 'nodejs'` on both route handlers; create one `createPublicClient` per chain reusing the fallback transports from `lib/wagmi/config.ts`; use `Promise.allSettled` to isolate per-chain failures; extract read logic into `'use cache'` helpers for future TTL readiness; keep `/status` dual-surface (RSC page + `/api/status` JSON route).

---

## Standard Stack

### Core

| Library | Version (installed) | Purpose | Why Standard |
|---------|---------------------|---------|--------------|
| viem | 2.48.11 (installed) | createPublicClient, multicall, getBlockNumber | Already in project; all server-side reads use this |
| nuqs | 2.8.9 (installed) | Chain selector URL state; server-side parse | Already in project; NuqsAdapter already in (apps)/layout |
| next | 16.2.6 (installed) | 'use cache' directive, route handlers, RSC | Already in project |
| @t3-oss/env-nextjs | — (installed) | Typed env vars; lib/env.ts schema | Already in project; any new server env vars (e.g., VERCEL_GIT_COMMIT_SHA) added here |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | installed | Icons for skeleton states, health indicators | Already used in StatusPill; reuse for RPC health icons |
| next-intl | 4.11.2 (installed) | i18n copy in dashboard tiles and status labels | Already wired; all copy in es-CO first |

### No New Dependencies

Phase 3 requires **zero new npm packages**. All primitives (viem multicall, nuqs server-side, Next.js 'use cache', StatusPill, lucide icons) are already installed.

### Alternatives Considered (and rejected)

| Instead of | Could Use | Why Rejected |
|------------|-----------|--------------|
| viem createPublicClient (server) | wagmi hooks | wagmi hooks are client-only via React context; server route handlers have no React context |
| 'use cache' helper (Next 16) | @vercel/kv | @vercel/kv is deprecated and no longer offered on Vercel platform |
| 'use cache' helper (Next 16) | @upstash/redis + ioredis | Valid Vercel Marketplace option but adds a dependency and operational cost for a feature that has zero live reads at launch; defer until contracts deploy |
| nuqs parseAsStringEnum | raw searchParams string | parseAsStringEnum gives type-safe fallback to default; raw string requires manual validation |
| Promise.allSettled (per-chain) | Promise.all | Promise.all throws on first rejection; allSettled captures per-chain failures |

---

## Architecture Patterns

### Recommended Project Structure (Phase 3 additions)

```
lib/
├── apps/
│   └── abrigo/
│       └── instruments.ts       # typed registry (empty at launch — THE seam)
├── dashboard/
│   └── aggregator.ts            # server-only: createPublicClient per chain, multicall
└── status/
    └── health.ts                # server-only: getBlockNumber health checks

app/
├── api/
│   ├── dashboard/
│   │   └── route.ts             # DASH-01 BFF route
│   └── status/
│       └── route.ts             # DASH-08 JSON surface (agents consume this)
├── (apps)/
│   ├── layout.tsx               # NuqsAdapter already here — NO CHANGE
│   └── apps/
│       └── abrigo/
│           └── dashboard/
│               ├── page.tsx     # DASH-03 RSC page
│               └── ChainSelector.tsx  # 'use client' nuqs hook — only hydrated island
└── (dashboard)/                 # OR: repurpose for /status RSC page
    └── status/                  # DASH-08 human-readable surface
        └── page.tsx
```

### Pattern 1: Server-Side createPublicClient per Chain (reusing wagmi transports)

**What:** For server route handlers and RSC pages, create a `viem` `createPublicClient` per chain using the same transport URLs already in `lib/wagmi/config.ts`. Do NOT import the wagmi client — it has `ssr: false` and is wired to React context.

**When to use:** Any server-side on-chain read (BFF route, RSC page data fetch, health check).

```typescript
// Source: https://viem.sh/docs/clients/public (verified 2026-05-28)
// lib/dashboard/aggregator.ts
import { createPublicClient, http, fallback } from 'viem'
import { celo, mainnet, base, arbitrum, optimism } from 'viem/chains'
import { env } from '@/lib/env'

// One client per chain — reuse the same RPC URLs from lib/wagmi/config.ts
// but createPublicClient is independent of wagmi's React context.
export const publicClients = {
  [celo.id]: createPublicClient({
    chain: celo,
    transport: fallback([http(env.NEXT_PUBLIC_RPC_CELO_PRIMARY), http('https://forno.celo.org')]),
    batch: { multicall: true },
  }),
  [mainnet.id]: createPublicClient({
    chain: mainnet,
    transport: fallback([http(env.NEXT_PUBLIC_RPC_ETH_PRIMARY), http('https://ethereum.publicnode.com')]),
    batch: { multicall: true },
  }),
  // ... base, arbitrum, optimism same pattern
} as const
```

**Critical detail:** `batch: { multicall: true }` enables automatic batching of `Promise.all` reads into a single `eth_call` multicall RPC request. No manual `publicClient.multicall(...)` call is needed for the simple "read N fields from M contracts" case — `Promise.all` over contract reads suffices when batching is enabled.

### Pattern 2: Instrument Registry as the Empty/Live Seam

**What:** A typed constant array in `lib/apps/abrigo/instruments.ts`. Today it is empty. When contracts deploy, entries are added. The BFF route and dashboard page iterate over this array — zero entries = zero multicall inputs = skeleton render. Non-zero entries = live reads.

```typescript
// lib/apps/abrigo/instruments.ts
import type { Address } from 'viem'
import { celo, mainnet, base, arbitrum, optimism } from 'viem/chains'

export interface AbrigoInstrument {
  id: string
  name: string           // es-CO name for display
  nameEn: string         // en name
  chainId: typeof celo.id | typeof mainnet.id | typeof base.id | typeof arbitrum.id | typeof optimism.id
  address: Address
  deployedAt: string     // ISO date string for display
}

// EMPTY AT LAUNCH — populated when contracts deploy.
// Adding an entry here is the only change needed to light up live reads.
export const ABRIGO_INSTRUMENTS: AbrigoInstrument[] = []
```

**Skeleton render logic:** `if (ABRIGO_INSTRUMENTS.length === 0) → render skeleton tiles`. Same branch the live render will use, just with zero items. No separate "coming soon" page.

### Pattern 3: Per-Chain Aggregation with Failure Isolation

**What:** Use `Promise.allSettled` (not `Promise.all`) to gather per-chain reads. A chain whose RPC is degraded produces a `rejected` entry; the response still returns data for healthy chains.

```typescript
// Source: verified against viem multicall docs (https://viem.sh/docs/contract/multicall)
// lib/dashboard/aggregator.ts

export interface ChainAggregationResult {
  chainId: number
  chainName: string
  status: 'healthy' | 'degraded' | 'empty'
  instruments: InstrumentState[]
  error?: string
  fetchedAt: string
}

export async function aggregateAllChains(): Promise<ChainAggregationResult[]> {
  const chains = [celo, mainnet, base, arbitrum, optimism]
  
  const results = await Promise.allSettled(
    chains.map(chain => aggregateChain(chain.id))
  )

  return results.map((result, i) => {
    if (result.status === 'fulfilled') return result.value
    return {
      chainId: chains[i].id,
      chainName: chains[i].name,
      status: 'degraded' as const,
      instruments: [],
      error: result.reason?.message ?? 'RPC unavailable',
      fetchedAt: new Date().toISOString(),
    }
  })
}

async function aggregateChain(chainId: number): Promise<ChainAggregationResult> {
  const instruments = ABRIGO_INSTRUMENTS.filter(i => i.chainId === chainId)
  
  if (instruments.length === 0) {
    return { chainId, chainName: ..., status: 'empty', instruments: [], fetchedAt: new Date().toISOString() }
  }

  // With batch.multicall: true on the client, these reads auto-batch
  // allowFailure: true (default) means per-call reverts are captured, not thrown
  const reads = await publicClients[chainId].multicall({
    contracts: instruments.flatMap(inst => [
      { address: inst.address, abi: abrigoAbi, functionName: 'poolBalance' },
      { address: inst.address, abi: abrigoAbi, functionName: 'settlementCount' },
      { address: inst.address, abi: abrigoAbi, functionName: 'lpPositionCount' },
    ]),
    allowFailure: true, // per-call failures captured in result.status, not thrown
  })
  // ... map reads to InstrumentState[]
}
```

### Pattern 4: 'use cache' Helper for Future TTL Readiness

**What:** The BFF route handler calls a `'use cache'`-annotated helper function. Today this has no effect (Cache Components caches in-memory; serverless instances don't persist between requests). When contracts deploy and real reads need a 30s TTL, adding `cacheLife('seconds')` or a custom profile is a one-line change.

**Critical constraint verified from official docs:** `'use cache'` cannot be used directly inside a Route Handler body — it must be extracted to a helper function. (Source: `nextjs.org/docs/app/getting-started/route-handlers`, verified 2026-05-28.)

**Prerequisite:** `cacheComponents: true` in `next.config.ts` is required to enable the `'use cache'` directive. Without it, the directive is ignored.

```typescript
// app/api/dashboard/route.ts
import { cacheLife } from 'next/cache'
import { aggregateAllChains } from '@/lib/dashboard/aggregator'

export const dynamic = 'force-dynamic'   // live reads, never prerendered
export const runtime = 'nodejs'          // viem uses Node.js APIs — NEVER edge

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const app = searchParams.get('app') ?? 'abrigo'
  const data = await getDashboardData(app)
  return Response.json(data)
}

// Helper extracted from handler body — required for 'use cache' to work
async function getDashboardData(app: string) {
  'use cache'
  cacheLife('default')  // 15min server revalidate — no-op until live reads exist
  return aggregateAllChains()
}
```

### Pattern 5: nuqs Chain Selector (RSC read + Client write)

**What:** The dashboard page reads the chain URL param server-side using `createLoader` from `nuqs/server`. The chain selector component uses `useQueryState` client-side. No prop drilling needed.

```typescript
// lib/dashboard/search-params.ts
import { parseAsStringEnum, createLoader } from 'nuqs/server'

const CHAIN_SLUGS = ['celo', 'ethereum', 'base', 'arbitrum', 'optimism'] as const
type ChainSlug = typeof CHAIN_SLUGS[number]

export const dashboardSearchParams = {
  chain: parseAsStringEnum<ChainSlug>(Array.from(CHAIN_SLUGS)).withDefault('celo'),
}

export const loadDashboardParams = createLoader(dashboardSearchParams)
```

```typescript
// app/(apps)/apps/abrigo/dashboard/page.tsx  — RSC, no 'use client'
import type { SearchParams } from 'nuqs/server'
import { loadDashboardParams } from '@/lib/dashboard/search-params'

export default async function DashboardPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { chain } = await loadDashboardParams(searchParams)
  const data = await getDashboardData('abrigo')
  // filter data by chain for default view, show all for 'all' variant
  return <DashboardContent chain={chain} data={data} />
}
```

```typescript
// app/(apps)/apps/abrigo/dashboard/ChainSelector.tsx  — ONLY client island
'use client'
import { useQueryState } from 'nuqs'
import { parseAsStringEnum } from 'nuqs'

const CHAIN_SLUGS = ['celo', 'ethereum', 'base', 'arbitrum', 'optimism'] as const

export function ChainSelector() {
  const [chain, setChain] = useQueryState(
    'chain',
    parseAsStringEnum(Array.from(CHAIN_SLUGS)).withDefault('celo')
  )
  // ... render selector UI
}
```

**NuqsAdapter interplay:** `(apps)/layout.tsx` already has `<NuqsAdapter>`. The dashboard page is under `(apps)`, so it inherits the adapter. No layout change needed.

### Pattern 6: /status — Dual Surface (RSC page + JSON route)

**What:** A JSON route at `/api/status` (agents and CI health checks consume this) plus an RSC page at `/status` (humans) that fetches from `/api/status` or runs the same logic. The status page deliberately avoids the `(apps)` NuqsAdapter since it is umbrella-scoped.

**RPC health check:** Use `publicClient.getBlockNumber()` per chain with a timeout. A 5-second timeout is sufficient to distinguish healthy from degraded without stalling the response. Wrap each in `Promise.allSettled`.

```typescript
// lib/status/health.ts
import { getBlockNumber } from 'viem/actions'

export interface ChainHealth {
  chainId: number
  name: string
  status: 'healthy' | 'degraded'
  blockNumber?: string  // as string (BigInt serialization)
  latencyMs?: number
  error?: string
}

export async function checkChainHealth(chainId: number): Promise<ChainHealth> {
  const client = publicClients[chainId]
  const t0 = Date.now()
  try {
    const blockNumber = await client.getBlockNumber()
    return {
      chainId,
      name: ...,
      status: 'healthy',
      blockNumber: blockNumber.toString(), // bigint → string for JSON serialization
      latencyMs: Date.now() - t0,
    }
  } catch (err) {
    return { chainId, name: ..., status: 'degraded', error: String(err) }
  }
}
```

**CRITICAL BigInt serialization note:** `eth_blockNumber` returns a `bigint` in viem. `JSON.stringify` throws on `bigint`. Always call `.toString()` before returning in a `Response.json()`.

```typescript
// app/api/status/route.ts
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const chains = [celo, mainnet, base, arbitrum, optimism]
  const healthResults = await Promise.allSettled(
    chains.map(c => checkChainHealth(c.id))
  )
  const health: ChainHealth[] = healthResults.map((r, i) =>
    r.status === 'fulfilled'
      ? r.value
      : { chainId: chains[i].id, name: chains[i].name, status: 'degraded', error: 'check failed' }
  )

  return Response.json({
    status: health.every(h => h.status === 'healthy') ? 'ok' : 'degraded',
    build: process.env.VERCEL_GIT_COMMIT_SHA ?? 'local',
    timestamp: new Date().toISOString(),
    chains: health,
    apps: { abrigo: { status: 'pre-launch', instrumentsDeployed: 0 } },
  })
}
```

### Anti-Patterns to Avoid

- **Importing wagmi hooks in route handlers or RSC pages.** `useContractRead`, `useReadContract`, `useBalance` etc. are React hooks — they require client context. Route handlers and RSC pages have neither. Use `createPublicClient` from viem directly.
- **Using the edge runtime for viem.** The Edge Runtime prohibits `new Function(...)` and some Node.js APIs. Viem's HTTP transport relies on Node.js `fetch` but viem itself also uses `new Function` internally in some code paths. Always set `runtime = 'nodejs'` on route handlers and pages that call viem.
- **Calling 'use cache' directly in a Route Handler body.** This is explicitly disallowed by Next.js 16 — extract to a named async helper function.
- **Returning bigint values in Response.json() without conversion.** JSON serialization throws `TypeError: Do not know how to serialize a BigInt`. Convert all bigint return values from viem to strings or numbers before returning.
- **Using force-static on the dashboard or status route.** Both routes read live data (or will); `force-static` freezes the response at build time — a bug that is invisible to tsc and was the source of the Phase 2 `locale` regression.
- **Using Promise.all for per-chain reads.** One degraded RPC causes the entire response to fail. Use `Promise.allSettled`.
- **Fabricating numbers in the skeleton state.** The CONTEXT.md anti-fishing discipline requires dashed/empty values (`"—"`) not example numbers. The skeleton renders because the instrument registry is empty — no special code path or fake data.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSON serialization of BigInt | Custom serializer | `.toString()` at call site before Response.json | viem returns bigint for block numbers and balances; JSON.stringify throws; simple conversion is correct |
| Multicall batching | Custom batch accumulator | `createPublicClient({ batch: { multicall: true } })` + `Promise.all` | viem auto-batches when `batch.multicall: true` on the client; Promise.all over reads is sufficient |
| Per-chain failure isolation | Try/catch per chain | `Promise.allSettled` | Built-in; returns `{ status: 'fulfilled' | 'rejected', value/reason }` per entry |
| URL chain state parsing | `searchParams.get('chain') ?? 'celo'` raw | `parseAsStringEnum(...).withDefault('celo')` from nuqs | Handles malformed values, provides type safety, works in both RSC and client |
| RPC health timeout | `AbortController` manual | Timeout on individual `getBlockNumber` call | Wrap in a `Promise.race` with a `setTimeout` rejection if an explicit cutoff is needed; or rely on the viem transport timeout |
| Cache TTL management | Custom cache map | `'use cache'` + `cacheLife` | Built into Next.js 16; no external state, automatically handles revalidation |

**Key insight:** viem's public client with multicall batching and nuqs's `createLoader` already solve the two hardest problems in this phase (batched on-chain reads, type-safe URL state in RSC). Phase 3 is primarily wiring, not inventing.

---

## Common Pitfalls

### Pitfall 1: Edge Runtime Breaks viem
**What goes wrong:** Setting `export const runtime = 'edge'` on the dashboard or status route handler causes a build-time or runtime error because viem uses APIs not available in the Edge Runtime (`new Function`, certain Node.js crypto primitives).
**Why it happens:** Edge Runtime has a restricted API surface. viem was designed for Node.js.
**How to avoid:** Always export `export const runtime = 'nodejs'` (explicit) on any route handler or page that calls viem. The default is already Node.js, but be explicit to document the dependency.
**Warning signs:** Build error `Dynamic Code Evaluation (e. g. 'eval', 'new Function') not allowed in Edge Runtime`.

### Pitfall 2: BigInt in JSON responses
**What goes wrong:** `Response.json({ blockNumber: 19000000n })` throws `TypeError: Do not know how to serialize a BigInt` at runtime. TypeScript does not catch this.
**Why it happens:** `JSON.stringify` has no BigInt support. viem returns `bigint` for all block numbers, balances, and counts.
**How to avoid:** Define a `ChainHealth` / `InstrumentState` response type where numeric fields from viem are typed as `string` (post-conversion). Convert at the aggregator boundary: `blockNumber: result.toString()`.
**Warning signs:** HTTP 500 from the route handler in production but no TypeScript error during build.

### Pitfall 3: Importing wagmi config's createPublicClient — it doesn't exist
**What goes wrong:** Attempting to use `wagmiConfig` for server-side reads. `wagmiConfig` (from `lib/wagmi/config.ts`) is a wagmi config object — it does not expose a `createPublicClient` API. The project's `wagmiConfig` has `ssr: false`, meaning it will not work in server context.
**Why it happens:** Confusing wagmi's client config with viem's public client.
**How to avoid:** Create a separate `lib/dashboard/aggregator.ts` that instantiates `createPublicClient` from viem directly, reusing the same transport URL strings from `lib/env.ts`.
**Warning signs:** `wagmiConfig.readContract is not a function` at runtime.

### Pitfall 4: 'use cache' in next.config.ts not enabled
**What goes wrong:** The `'use cache'` directive silently does nothing if `cacheComponents: true` is not set in `next.config.ts`. No build error — the directive is treated as a no-op string.
**Why it happens:** Cache Components is an opt-in feature in Next.js 16.
**How to avoid:** Add `cacheComponents: true` to `next.config.ts` when the helper pattern is introduced (Wave 1 of Phase 3 planning).
**Warning signs:** `NEXT_PRIVATE_DEBUG_CACHE=1` logs show no cache hits for the helper function.

### Pitfall 5: Turbopack Ignoring Route Segment Config
**What goes wrong:** In Next.js 16 with Turbopack (used in `pnpm dev --turbopack`), `export const dynamic = 'force-dynamic'` may not prevent prerendering during `next build` if there is a stale cache or Turbopack build artifact confusion. This is analogous to the Phase 2 Turbopack webpack-alias bug.
**Why it happens:** Turbopack's static analysis of route segment config variables differs from webpack in edge cases.
**How to avoid:** Always test route handler behavior with `pnpm build && pnpm start` (webpack production build), not only `pnpm dev`. The Evidence Collector live-verification gate catches this.
**Warning signs:** `/api/dashboard` returns stale data that does not reflect the current instrument registry state.

### Pitfall 6: NuqsAdapter Scope
**What goes wrong:** If the dashboard page is placed outside the `(apps)` route group, `useQueryState` in the ChainSelector throws at runtime because no `NuqsAdapter` wraps it.
**Why it happens:** NuqsAdapter is a context provider; hooks without it throw.
**How to avoid:** Dashboard at `app/(apps)/apps/abrigo/dashboard/page.tsx` — already inside `(apps)`. Confirm the file path during planning. The umbrella `/status` page does NOT go under `(apps)` (it uses the `(dashboard)` group or a top-level route) and therefore does NOT use nuqs.
**Warning signs:** `Error: NuqsAdapter is not found in the component tree.`

### Pitfall 7: VERCEL_GIT_COMMIT_SHA is Server-Only
**What goes wrong:** Attempting to expose `VERCEL_GIT_COMMIT_SHA` as `NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA` or read it in a client component.
**Why it happens:** Vercel injects `VERCEL_GIT_COMMIT_SHA` as a server-only env var.
**How to avoid:** Read it only in route handlers or RSC pages. The existing `app/api/health/route.ts` pattern is correct: `process.env.VERCEL_GIT_COMMIT_SHA ?? 'local'`. Add `VERCEL_GIT_COMMIT_SHA: z.string().optional()` to the `server` block in `lib/env.ts`.
**Warning signs:** `undefined` value on the client; TypeScript warning about unvalidated env var.

### Pitfall 8: Skeleton vs Live Code Path Divergence
**What goes wrong:** Implementing a separate "coming soon" static page at `/apps/abrigo/dashboard` and the real dashboard elsewhere. Later they diverge in design, causing anti-fishing risk when live data arrives.
**Why it happens:** Temptation to ship quickly with a static placeholder.
**How to avoid:** The same `DashboardPage` component always runs the aggregation code. When `ABRIGO_INSTRUMENTS.length === 0`, it renders skeleton tiles. When instruments are populated, it renders live data. There is exactly one render path.

---

## Code Examples

Verified patterns from official sources and installed package versions:

### viem: createPublicClient with multicall batching
```typescript
// Source: https://viem.sh/docs/clients/public (verified 2026-05-28)
import { createPublicClient, http, fallback } from 'viem'
import { celo } from 'viem/chains'

const celoClient = createPublicClient({
  chain: celo,
  transport: fallback([
    http(process.env.NEXT_PUBLIC_RPC_CELO_PRIMARY!),
    http('https://forno.celo.org'),
  ]),
  batch: {
    multicall: true,  // auto-batches Promise.all reads into single eth_call
  },
})
```

### viem: multicall with allowFailure (per-call error isolation)
```typescript
// Source: https://viem.sh/docs/contract/multicall (verified 2026-05-28)
// Returns: ({ data: inferred, status: 'success' } | { error: string, status: 'reverted' })[]
const results = await celoClient.multicall({
  contracts: [
    { address: '0x...', abi, functionName: 'poolBalance' },
    { address: '0x...', abi, functionName: 'settlementCount' },
  ],
  allowFailure: true, // default; captures per-call reverts without throwing
})
// results[0].status === 'success' → results[0].result
// results[1].status === 'failure' → results[1].error
```

### nuqs: server-side parse with createLoader
```typescript
// Source: https://nuqs.dev/docs/server-side (verified 2026-05-28)
import { parseAsStringEnum, createLoader } from 'nuqs/server'

const CHAINS = ['celo', 'ethereum', 'base', 'arbitrum', 'optimism'] as const
type ChainSlug = typeof CHAINS[number]

export const dashboardSearchParams = {
  chain: parseAsStringEnum<ChainSlug>(Array.from(CHAINS)).withDefault('celo'),
}
export const loadDashboardParams = createLoader(dashboardSearchParams)

// In RSC page:
const { chain } = await loadDashboardParams(searchParams)
```

### Next.js 16: 'use cache' helper extracted from route handler
```typescript
// Source: https://nextjs.org/docs/app/getting-started/route-handlers (verified 2026-05-28)
// REQUIRED: cacheComponents: true in next.config.ts
import { cacheLife } from 'next/cache'

// Cannot use 'use cache' directly in GET() handler body — must extract
async function getCachedData() {
  'use cache'
  cacheLife('default')  // stale: 5min client, revalidate: 15min server
  return fetchData()
}

export async function GET() {
  const data = await getCachedData()
  return Response.json(data)
}
```

### Next.js 16: Route handler with force-dynamic and nodejs runtime
```typescript
// Prevents prerendering; forces live execution on every request
export const dynamic = 'force-dynamic'
// Explicitly Node.js — required for viem (edge runtime breaks viem)
export const runtime = 'nodejs'
```

### BigInt serialization safety
```typescript
// viem returns bigint for blockNumber, balances — must convert before Response.json
const blockNumber = await client.getBlockNumber() // bigint
return Response.json({
  blockNumber: blockNumber.toString(), // string — safe for JSON
})
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|---|---|---|---|
| @vercel/kv cache | 'use cache' directive (Next.js 16) + optional `'use cache: remote'` with Upstash | 2025 (KV deprecated) | No @vercel/kv install; caching is in-framework |
| unstable_cache | 'use cache' directive (stable in Next 16.0) | Next 16.0.0 | No `unstable_` prefix; production-ready |
| wagmi useContractRead in RSC | viem createPublicClient in server files | wagmi v2 design | Hooks are client-only; server reads use viem directly |
| Promise.all for multi-chain reads | Promise.allSettled | Always correct | Per-chain failure isolation — single RPC down no longer blanks response |
| edge runtime for API routes | nodejs runtime for viem-based routes | viem design | Edge runtime lacks Node.js APIs needed by viem |

**Deprecated/outdated:**
- `@vercel/kv`: No longer offered on Vercel. Do not install. The STATE.md note "BFF caching: Vercel KV" is stale.
- `unstable_cache` from `next/cache`: Still works but the stable `'use cache'` directive is the preferred approach in Next.js 16.
- Single-RPC transports: The existing `lib/wagmi/config.ts` correctly uses `fallback([primary, public])`. Server-side clients must replicate this pattern.

---

## Open Questions

1. **ABI availability for multicall contracts**
   - What we know: `FOUND-06` says wagmi CLI reads ABIs from `../abrigo/` Foundry artifacts. The instrument registry is empty so ABIs are not yet needed for multicall.
   - What's unclear: When contracts deploy, what ABI shape will the Abrigo instrument expose? (poolBalance, settlementCount, lpPositionCount function names are assumed — they match the DASH-03 description but the actual ABI needs to come from the Foundry artifacts.)
   - Recommendation: The planner should define a placeholder ABI type (`readonly []` initially) that the aggregator compiles against. When real ABIs land, the registry entry gains the correct ABI shape. This is a Wave 0 type stub.

2. **`(dashboard)` route group repurposing**
   - What we know: `app/(dashboard)/layout.tsx` exists as a Phase 1 scaffold with a comment "Phase 3 will wrap TanStack QueryClientProvider here." Phase 3 does not need TanStack Query for server-side reads.
   - What's unclear: Should `/status` go under `(dashboard)` or be a top-level route? The `(dashboard)` layout comment is now misleading.
   - Recommendation: Place the `/status` RSC page at `app/(dashboard)/status/page.tsx`. This fulfills the original scaffold intent without restructuring. Update the layout comment to reflect actual use. If TanStack Query is never needed server-side, the layout remains a pass-through.

3. **VERCEL_GIT_COMMIT_SHA in lib/env.ts**
   - What we know: `app/api/health/route.ts` reads `process.env.VERCEL_GIT_COMMIT_SHA` directly (unvalidated). The `/status` route needs the same.
   - What's unclear: Should it be added to `lib/env.ts`'s server schema, or is reading it directly (as health does) acceptable?
   - Recommendation: Add `VERCEL_GIT_COMMIT_SHA: z.string().optional()` to the `server` block in `lib/env.ts` for consistency. Keep the `?? 'local'` fallback.

---

## Validation Architecture

`workflow.nyquist_validation` is `true` in `.planning/config.json` — this section is mandatory.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest 4.1.6 (unit) + @playwright/test 1.60.0 (e2e) |
| Config file | `vitest.config.ts` (unit); `playwright.config.ts` (e2e) |
| Quick run command | `pnpm vitest run tests/api/ tests/unit/` |
| Full suite command | `pnpm vitest run && pnpm playwright test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| DASH-01 | `/api/dashboard?app=abrigo` returns typed JSON with `chains` array and `status` field | unit (route handler) | `pnpm vitest run tests/api/dashboard.test.ts` | ❌ Wave 0 |
| DASH-01 | Per-chain failure: one degraded RPC does not cause 500; response still has other chains | unit (route handler) | `pnpm vitest run tests/api/dashboard.test.ts` | ❌ Wave 0 |
| DASH-01 | Empty registry returns `chains` with all 5 entries, each `status: 'empty'` | unit (route handler) | `pnpm vitest run tests/api/dashboard.test.ts` | ❌ Wave 0 |
| DASH-03 | Dashboard page renders skeleton tiles (dashed `—` values) when registry empty | e2e (Playwright) | `pnpm playwright test tests/e2e/dashboard.spec.ts` | ❌ Wave 0 |
| DASH-03 | "Live once contracts deploy" banner is present in DOM | e2e (Playwright) | `pnpm playwright test tests/e2e/dashboard.spec.ts` | ❌ Wave 0 |
| DASH-04 | `?chain=base` URL param makes Base chain tiles visible/active | e2e (Playwright) | `pnpm playwright test tests/e2e/dashboard.spec.ts` | ❌ Wave 0 |
| DASH-07 | Dashboard page returns 200 and meaningful HTML with `curl` (no JS) | e2e (Playwright, `javaScriptEnabled: false`) | `pnpm playwright test tests/e2e/dashboard-no-js.spec.ts` | ❌ Wave 0 |
| DASH-08 | `/api/status` returns JSON with `status`, `build`, `timestamp`, `chains[5]` fields | unit (route handler) | `pnpm vitest run tests/api/status.test.ts` | ❌ Wave 0 |
| DASH-08 | `/api/status` `chains` — all 5 chain IDs present; each has `status` field | unit (route handler) | `pnpm vitest run tests/api/status.test.ts` | ❌ Wave 0 |
| DASH-08 | One chain's `checkChainHealth` throwing does not cause 500 response | unit | `pnpm vitest run tests/unit/health.test.ts` | ❌ Wave 0 |
| DASH-08 | `/status` RSC page renders per-chain status pills (color+icon+text — CROSS-09) | e2e | `pnpm playwright test tests/e2e/status-page.spec.ts` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `pnpm vitest run tests/api/ tests/unit/health.test.ts` (fast unit subset, < 30s)
- **Per wave merge:** `pnpm vitest run` (all unit tests)
- **Phase gate:** `pnpm vitest run && pnpm playwright test` (full suite green before `/gsd:verify-work`)

### Wave 0 Gaps

- [ ] `tests/api/dashboard.test.ts` — covers DASH-01 (typed JSON, per-chain degradation, empty registry)
- [ ] `tests/api/status.test.ts` — covers DASH-08 (JSON shape, all 5 chains, graceful degradation)
- [ ] `tests/unit/health.test.ts` — covers `lib/status/health.ts` `checkChainHealth` function
- [ ] `tests/e2e/dashboard.spec.ts` — covers DASH-03, DASH-04 skeleton render + chain selector
- [ ] `tests/e2e/dashboard-no-js.spec.ts` — covers DASH-07 no-JS first paint
- [ ] `tests/e2e/status-page.spec.ts` — covers DASH-08 RSC page, CROSS-09 status pills
- [ ] `lib/apps/abrigo/instruments.ts` — typed registry (empty); enables all test stubs to work without real contracts

Note: Unit tests for route handlers follow the pattern established in `tests/api/health.test.ts` — import the `GET` function directly and call it. MSW is available (already installed) for mocking viem transport fetch calls if needed.

---

## Sources

### Primary (HIGH confidence)

- `https://viem.sh/docs/clients/public` — createPublicClient, batch.multicall config (fetched 2026-05-28)
- `https://viem.sh/docs/contract/multicall` — multicall API, allowFailure, return type (fetched 2026-05-28)
- `https://nextjs.org/docs/app/api-reference/directives/use-cache` — 'use cache' directive, cacheLife, constraints (fetched 2026-05-28, docs version: 16.2.6, lastUpdated: 2026-05-28)
- `https://nextjs.org/docs/app/getting-started/route-handlers` — route handler caching, 'use cache' helper extraction requirement (fetched 2026-05-28, docs version: 16.2.6)
- `https://nextjs.org/docs/app/api-reference/edge` — Edge Runtime unsupported APIs (fetched 2026-05-28)
- `https://nuqs.dev/docs/server-side` — createLoader, createSearchParamsCache, parseAsStringEnum (fetched 2026-05-28)
- `lib/wagmi/config.ts` (project source) — 5 chains, fallback transports, ssr: false (read directly)
- `lib/env.ts` (project source) — NEXT_PUBLIC_RPC_* env vars schema (read directly)
- `app/api/health/route.ts` (project source) — force-dynamic pattern, VERCEL_GIT_COMMIT_SHA (read directly)
- `app/(apps)/layout.tsx` (project source) — NuqsAdapter already wired (read directly)
- `.planning/config.json` (project source) — nyquist_validation: true confirmed (read directly)

### Secondary (MEDIUM confidence)

- WebSearch: Vercel KV deprecated, Upstash Redis as Marketplace replacement — confirmed by Upstash docs reference on Vercel templates; not contradicted by any official source

### Tertiary (LOW confidence — flagged)

- WebSearch: Turbopack route segment config edge case in Next.js 16 — reported in community; not in official docs. Flag: verify with `pnpm build` during plan execution.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages already installed; versions read from package.json and npm registry
- Architecture: HIGH — viem and nuqs APIs verified against official docs fetched 2026-05-28; Next.js route handler constraints verified against Next.js 16.2.6 docs
- Pitfalls: HIGH (P1, P2, P4, P5, P6, P7, P8) / MEDIUM (P3 — wagmi config confusion: obvious from source read, not explicitly documented) — based on project burn history (Phase 2 STATE.md) and official constraint docs
- Caching: HIGH — official docs confirm @vercel/kv is gone; 'use cache' is stable in Next 16.0; cacheComponents opt-in requirement confirmed

**Research date:** 2026-05-28
**Valid until:** 2026-06-28 (stable APIs — viem, nuqs, Next.js 16 are stable; 30-day window reasonable)
