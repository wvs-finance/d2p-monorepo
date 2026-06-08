# Phase 4: Agent Surface (MCP) - Research

**Researched:** 2026-05-29
**Domain:** MCP route handler (mcp-handler v1.1.0), @modelcontextprotocol/sdk v1.29.0, OpenAPI 3.1 code generation from Zod, HuggingFace datasets-server API, JSON-LD structured data mirroring
**Confidence:** HIGH (core API verified from installed node_modules); MEDIUM (HF datasets-server); LOW (HF dataset publication status)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**MCP transport + Redis (AGENT-02)**
- streamable-http (`/api/mcp/mcp`) is the canonical transport — run it STATELESS with no Redis.
- `/api/mcp/sse` stays advertised in the descriptor but does NOT require Redis this phase: it should respond gracefully rather than throw. Pass `disableSse: true` in the mcp-handler config to make the SSE path return 404 (never crash).
- The `test.fixme('/api/mcp/sse …')` must be re-pointed at the streamable-http endpoint (`/api/mcp/mcp`) — assert no-404 / valid handshake there.

**Tool behavior when no contract is deployed (AGENT-06, AGENT-07-pool; CROSS-09 anti-fishing)**
- `get_instrument_terms` / `get_pool_state` succeed (not MCP `isError`) and return: `{ status: 'not_deployed', instrument_id, chain, terms: null, pool: null, note: '…' }`.
- MCP `isError: true` is reserved for genuine failures (bad args, RPC down), never for the normal pre-launch empty state.

**OpenAPI 3.1 spec (AGENT-08)**
- Generate `/.well-known/openapi.yaml` from Zod contracts (single source of truth).
- Extend the existing `lib/dashboard/contract.ts` `version:1` envelopes into Zod schemas.
- The spec must not be able to drift from actual route responses.

### Claude's Discretion
- `query_econometric_panel` (AGENT-07) data source: confirm whether the HuggingFace panel dataset exists/is published, choose the access path (HF datasets-server API), define paging, and the honest fallback when the dataset is unpublished (`status: 'unavailable'` envelope consistent with the not_deployed pattern).
- Exact Zod schema layout, tool input validation messages, and JSON-LD field mapping details.
- Whether `lib/mcp-tools/` tools call lib functions directly or fetch BFF routes (direct lib import preferred to avoid an internal HTTP hop and honor AGENT-01 no-duplication).

### Deferred Ideas (OUT OF SCOPE)
- Redis provisioning + full SSE transport — only if a target MCP client strictly requires SSE; revisit post-launch.
- `/chat` shell (CHAT-01) — grounded in `lib/mcp-tools/`; future phase.
- Notification webhooks for new verdicts (NOTIF-02) — future.
- `query_econometric_panel` real HuggingFace wiring — in scope as a tool, but its data-source path is a research item (may land as an `unavailable` envelope if the dataset is not published yet).
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AGENT-01 | `lib/mcp-tools/` exports all tool definitions; MCP route and future chat API import from this module — no duplication | Direct lib import pattern confirmed feasible; `createMcpHandler` callback receives `McpServer` instance; tools registered via `server.tool()` or `server.registerTool()` |
| AGENT-02 | MCP server at `/api/mcp/[transport]` via `mcp-handler`; streamable-http stateless, SSE graceful | `createMcpHandler` with `disableSse: true` + `basePath: '/api/mcp'` confirmed; SSE path returns 404 without Redis when `disableSse: true` |
| AGENT-03 | MCP tool `list_apps()` returns apps registry | Reads from `lib/apps/registry.ts` directly; no async required |
| AGENT-04 | MCP tool `list_iterations(app, filter?)` returns all iterations with status/slug/β/p-value | Reads from `@/.velite` research collection; IA change means only research (papers/memos/write-ups), not econometric exercise iterations |
| AGENT-05 | MCP tool `get_iteration_state(app, slug, version)` returns full iteration detail | Reads from `@/.velite` research collection via slug lookup |
| AGENT-06 | MCP tool `get_instrument_terms(app, instrument_id, chain)` returns instrument parameters | Reads from `ABRIGO_INSTRUMENTS` array; returns `not_deployed` envelope when empty |
| AGENT-07-pool | MCP tool `get_pool_state(app, chain, pool_address)` returns live pool state | Calls `aggregateAllChains()` or per-chain aggregation; returns `not_deployed` when registry empty |
| AGENT-07 | MCP tool `query_econometric_panel(app, panel, filters)` returns HF dataset rows | HF datasets-server `/rows` endpoint confirmed; `status: 'unavailable'` envelope when dataset not yet published |
| AGENT-08 | OpenAPI spec at `/.well-known/openapi.yaml` documents every public REST endpoint | `@asteasolutions/zod-to-openapi@7.3.4` (Zod v3 compatible); extend contract.ts; generate in route handler |
| AGENT-09 | `/llms.txt` lists primary entry URLs, licensing, MCP endpoint pointer | Stub already populated; needs Phase-4 completion of MCP + OpenAPI entries |
| AGENT-10 | Every iteration/instrument/dashboard page emits JSON-LD mirroring MCP tool output schema | Pattern established in `components/StructuredData.tsx`; `escapeJsonLd()` + `dangerouslySetInnerHTML` + biome suppression comment |
</phase_requirements>

---

## Summary

Phase 4 wires a stateless MCP server into the existing Next.js App Router route stub, registers six tools that wrap the Phase-3 data layer directly (no BFF hop), generates a drift-proof OpenAPI 3.1 spec from Zod contracts, and ensures every content page emits JSON-LD that mirrors tool output schemas.

The key constraints are fully resolvable with installed packages. `mcp-handler@1.1.0` (already installed) exposes `createMcpHandler` which wraps the MCP SDK's `McpServer`. Tools register via `server.tool(name, description, paramsSchema, callback)` or the preferred modern `server.registerTool(name, config, callback)`. Running stateless (no Redis) is achieved by passing `disableSse: true` to the handler config — this makes the SSE path return 404 instead of crashing. For OpenAPI generation, `@asteasolutions/zod-to-openapi@7.3.4` is the correct version (Zod v3 peer dependency); v8.x requires Zod v4 which is not installed. The HuggingFace datasets-server API is publicly documented; the honest fallback for an unpublished dataset is a `status: 'unavailable'` envelope consistent with the project's anti-fishing discipline.

**Primary recommendation:** Register tools in `lib/mcp-tools/` importing lib functions directly; wire `disableSse: true` in the route handler; generate OpenAPI in the `/.well-known/openapi.yaml` route from Zod schemas extended with `@asteasolutions/zod-to-openapi@7.3.4`.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `mcp-handler` | 1.1.0 (installed) | Next.js App Router MCP route handler | Already installed; wraps `@modelcontextprotocol/sdk`; stateless streamable-http works without Redis |
| `@modelcontextprotocol/sdk` | 1.29.0 (installed) | MCP protocol types and `McpServer` class | Peer dep of mcp-handler; `server.tool()` / `server.registerTool()` are the registration APIs |
| `zod` | 3.25.76 (installed) | Input validation for all tool parameters | Already used throughout the project; `server.tool()` accepts Zod raw shape directly |
| `@asteasolutions/zod-to-openapi` | 7.3.4 (NOT yet installed) | Generate OpenAPI 3.1 from Zod schemas | Only version compatible with Zod v3 that supports OpenAPI 3.1; v8+ requires Zod v4 |
| `openapi3-ts` | 4.1.2 (peer dep of above) | OpenAPI 3.1 TypeScript types | Peer dependency of @asteasolutions/zod-to-openapi@7.3.4 |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `schema-dts` | 2.0.0 (installed) | schema.org TypeScript types for JSON-LD | All structured data on content pages; already used in StructuredData.tsx and research reading page |
| `js-yaml` | (stdlib in Node) | Serialize OpenAPI object to YAML | Use `yaml` from the Node stdlib or `js-yaml` for YAML output in the openapi.yaml route |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@asteasolutions/zod-to-openapi@7.3.4` | `@asteasolutions/zod-to-openapi@8.x` | v8 requires Zod v4; project is on Zod v3.25.76 — incompatible |
| `@asteasolutions/zod-to-openapi@7.3.4` | `zod-to-openapi` (npm) | That package is v0.2.1 and unmaintained |
| Direct lib import in tools | Fetch BFF routes | Fetching BFF routes adds latency + requires absolute URLs + duplicates logic — direct import is the correct AGENT-01 pattern |
| `server.registerTool()` | `server.tool()` | `server.tool()` is marked deprecated in SDK v1.29; prefer `server.registerTool()` |

**Installation:**
```bash
pnpm add @asteasolutions/zod-to-openapi@7.3.4
```

**Version verification:** Confirmed via `npm view @asteasolutions/zod-to-openapi@7.3.4` — published 2025-10-xx; Zod peer `^3.20.2`; dependency: `openapi3-ts@^4.1.2`.

---

## Architecture Patterns

### Recommended Project Structure
```
lib/
├── mcp-tools/
│   ├── index.ts            # barrel: re-exports all registerXxx functions
│   ├── list-apps.ts        # AGENT-03
│   ├── list-iterations.ts  # AGENT-04
│   ├── get-iteration-state.ts # AGENT-05
│   ├── get-instrument-terms.ts # AGENT-06
│   ├── get-pool-state.ts   # AGENT-07-pool
│   └── query-econometric-panel.ts # AGENT-07
lib/
├── openapi/
│   ├── schemas.ts          # ExtendedZodSchema helpers + registry
│   └── generate.ts         # OpenApiGeneratorV31 → YAML string
app/api/mcp/
└── [transport]/route.ts    # registerTools(server) call
app/.well-known/
└── openapi.yaml/route.ts   # generateOpenApiYaml() call (replaces stub)
```

### Pattern 1: Tool Registration with registerTool (preferred API)
**What:** Each `lib/mcp-tools/*.ts` file exports a `registerXxx(server: McpServer): void` function that calls `server.registerTool()`. The route handler calls each register function in the `createMcpHandler` callback.
**When to use:** All Phase 4 tools.
**Example:**
```typescript
// Source: node_modules/@modelcontextprotocol/sdk/dist/cjs/server/mcp.d.ts lines 150-157
// lib/mcp-tools/list-apps.ts
import { apps } from '@/lib/apps/registry'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'

export function registerListApps(server: McpServer): void {
  server.registerTool(
    'list_apps',
    {
      description: 'Returns all published app families in the d2p Finance lab',
      inputSchema: z.object({}),  // zero-arg: empty shape
    },
    async () => ({
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            apps.map((a) => ({
              slug: a.slug,
              name: a.name,
              status: a.status,
              external_url: a.external_url ?? null,
            })),
          ),
        },
      ],
    }),
  )
}
```

### Pattern 2: not_deployed Honest Envelope (CROSS-09)
**What:** When ABRIGO_INSTRUMENTS is empty (no deployed contracts), instrument/pool tools return a structured `not_deployed` status rather than an MCP error or fabricated zeros. Consistent with the `status: 'empty'` pattern from the Phase-3 aggregator.
**When to use:** `get_instrument_terms`, `get_pool_state` whenever `ABRIGO_INSTRUMENTS.length === 0` or the requested instrument is not found.
**Example:**
```typescript
// lib/mcp-tools/get-instrument-terms.ts
const result = {
  status: 'not_deployed' as const,
  instrument_id: input.instrument_id,
  chain: input.chain,
  terms: null,
  pool: null,
  note: 'No Abrigo instruments are deployed on any chain at this time. Check again after contract launch.',
}
return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] }
```

### Pattern 3: MCP Route Handler with disableSse
**What:** Pass `disableSse: true` to the mcp-handler config. This causes the SSE path (`/api/mcp/sse`) to return HTTP 404 instead of attempting to initialize Redis. The `test.fixme` must be re-pointed at `/api/mcp/mcp`.
**When to use:** Mandatory for Phase 4 — no Redis provisioned.
**Example:**
```typescript
// app/api/mcp/[transport]/route.ts
import { createMcpHandler } from 'mcp-handler'
import { registerListApps } from '@/lib/mcp-tools/list-apps'
// ... other imports

const handler = createMcpHandler(
  (server) => {
    registerListApps(server)
    registerListIterations(server)
    registerGetIterationState(server)
    registerGetInstrumentTerms(server)
    registerGetPoolState(server)
    registerQueryEconometricPanel(server)
  },
  {
    serverInfo: { name: 'd2p Finance MCP Server', version: '1.0.0' },
  },
  {
    basePath: '/api/mcp',
    disableSse: true,  // SSE → 404; no Redis required
  },
)

export { handler as GET, handler as POST, handler as DELETE }
```

### Pattern 4: OpenAPI Generation from Zod
**What:** Use `@asteasolutions/zod-to-openapi@7.3.4` — `extendZodWithOpenApi(z)` once at module level, then use `z.string().openapi({ description: '...' })` on schema fields. `OpenApiGeneratorV31` builds the document; `stringify` from `yaml` (use Node's built-in or a tiny yaml package) serializes to YAML.
**When to use:** `lib/openapi/generate.ts` called from the `/.well-known/openapi.yaml` route.
**Example:**
```typescript
// Source: @asteasolutions/zod-to-openapi README (v7.x)
import { OpenApiGeneratorV31, OpenAPIRegistry, extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'
import { z } from 'zod'

extendZodWithOpenApi(z)

const registry = new OpenAPIRegistry()

// Register a schema
const ChainHealthSchema = registry.register(
  'ChainHealth',
  z.object({
    chainId: z.number().openapi({ description: 'EVM chain ID' }),
    name: z.string(),
    status: z.enum(['healthy', 'degraded']),
    blockNumber: z.string().optional(),
    latencyMs: z.number().optional(),
    error: z.string().optional(),
  })
)

// Register a path
registry.registerPath({
  method: 'get',
  path: '/api/status',
  summary: 'RPC health per chain + build hash',
  responses: {
    200: {
      description: 'Status response',
      content: { 'application/json': { schema: StatusResponseSchema } },
    },
  },
})

export function generateOpenApiYaml(): string {
  const generator = new OpenApiGeneratorV31(registry.definitions)
  const doc = generator.generateDocument({
    openapi: '3.1.0',
    info: { title: 'd2p Finance Public API', version: '0.1.0' },
    servers: [{ url: 'https://d2pfinance.xyz' }],
  })
  // Use JSON.stringify then a yaml lib, or a tiny YAML serializer
  return toYaml(doc)
}
```

### Pattern 5: JSON-LD Mirroring Tool Output (AGENT-10)
**What:** Existing pages already emit `ScholarlyArticle` JSON-LD in the research reading page. For the dashboard/instrument pages, add `Dataset` and `SoftwareApplication` structured data blocks that parallel the MCP tool output schema fields. The `escapeJsonLd()` pattern from `StructuredData.tsx` applies.
**When to use:** All dashboard and instrument pages that have corresponding MCP tools.
**Example:**
```typescript
// Follows the established pattern from app/(lab)/research/[slug]/page.tsx lines 118-129
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Abrigo',
  applicationCategory: 'FinanceApplication',
  // Fields that mirror get_instrument_terms tool output
  additionalProperty: [
    { '@type': 'PropertyValue', name: 'status', value: 'not_deployed' },
  ],
}
const jsonLdHtml = JSON.stringify(jsonLd).replace(/</g, '\\u003c')
// Pre-build html string as const BEFORE return (biome noDangerouslySetInnerHtml constraint)
```

### Pattern 6: bigint-Safe Tool Output
**What:** The `serializeBigints()` utility from `lib/chains/serialize.ts` must be applied to any tool output that touches viem response data. MCP tool `content[].text` is a JSON string — `JSON.stringify` throws on raw bigints.
**When to use:** `get_pool_state`, `get_instrument_terms` — any tool that calls into the aggregator or viem clients.
**Example:**
```typescript
// lib/chains/serialize.ts (already implemented — use as-is)
import { serializeBigints } from '@/lib/chains/serialize'
const safe = serializeBigints(rawViemResult)
return { content: [{ type: 'text' as const, text: JSON.stringify(safe) }] }
```

### Pattern 7: Iteration / Research Collection Tool Data Source
**What:** `list_iterations` and `get_iteration_state` query the `research` Velite collection from `@/.velite` — not the old per-iteration econometric exercise (which is descoped per the 2026-05-13 IA correction). The collection contains papers, decision memos, write-ups, and talks with fields: `slug`, `title_es`, `title_en`, `authors`, `date`, `type`, `track`, `summary_es`, `summary_en`.
**When to use:** AGENT-04, AGENT-05.
**Key insight:** The `list_iterations(app, filter?)` tool name is a misnomer for the current data model. The research collection does not have `β` or `p-value` fields (those were the old ITER-* econometric exercise). The tool either: (a) returns research entries filtered by track (`abrigo-hedge-design`) as "Abrigo's research outputs", or (b) returns an honest `{ status: 'unavailable', note: 'Iteration-level econometric results are published in abrigo-analytics repo, not on this site' }`. The planner must resolve this ambiguity — see Open Questions.

### Anti-Patterns to Avoid
- **Importing `@/.velite` in the MCP route module directly**: The Velite shim uses static `require('../.velite/X.json')` — this works in Node.js but must go through `lib/velite-shim.ts` to be webpack-bundled correctly. Import from `@/.velite` (via the tsconfig alias) as the research reading page does.
- **Using `server.tool()` (deprecated)**: Use `server.registerTool()` — the SDK marks `server.tool()` as deprecated in v1.29.0.
- **Fetching `/api/dashboard` from inside a tool**: Direct import of `aggregateAllChains()` avoids an internal HTTP hop and satisfies AGENT-01. The route handler runs in Node.js runtime — direct lib import is fully feasible.
- **Hand-rolling YAML serialization**: Use `openapi3-ts` types (already a dep of `@asteasolutions/zod-to-openapi`) and a standard YAML serializer. Do not concatenate YAML strings by hand (the current stub does this — it must be replaced).
- **`runtime = 'edge'` on the MCP route**: The tools import viem clients (`lib/chains/clients.ts`) which use Node.js APIs. The MCP route MUST use `runtime = 'nodejs'` (consistent with `/api/dashboard` and `/api/status`).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tool input validation | Custom schema validator | Zod (already installed) passed as `inputSchema` to `registerTool()` | The MCP SDK calls `z.safeParse()` on inputs automatically; custom validation duplicates this |
| JSON → YAML conversion | String concatenation / template literal YAML | `openapi3-ts` types + a YAML library | Structure drift is inevitable with manual YAML; the current stub is a good example of technical debt |
| OpenAPI 3.1 schema assembly | Manual path/schema object construction | `@asteasolutions/zod-to-openapi` registry + generator | OpenAPI 3.1 has many edge cases (nullable, discriminated unions, `$schema` references); the generator handles them correctly |
| MCP transport (HTTP/SSE plumbing) | Custom streaming handlers | `mcp-handler` (already installed) | The handler correctly implements the MCP streamable-http spec including session IDs and protocol handshake |
| bigint JSON serialization | `JSON.stringify` replacer | `serializeBigints()` from `lib/chains/serialize.ts` | Already implemented, tested, and integrated throughout the data layer — import it |

**Key insight:** The Phase-2 burn class (bigint crash, `toISOString is not a function`, Turbopack bundle misses) came from building custom boundary solutions. In Phase 4 the equivalent burn risk is: custom YAML generation drifting from actual response shapes, and MCP tool handlers throwing instead of returning honest envelopes.

---

## Common Pitfalls

### Pitfall 1: SSE Redis Crash (the Phase 3.1 unhandledRejection)
**What goes wrong:** Without `disableSse: true`, a GET request to `/api/mcp/sse` causes mcp-handler to call `initializeRedis()`, which throws `"redisUrl is required"`. This is an unhandledRejection that destabilizes the Node.js worker and cascades into timeouts for unrelated routes.
**Why it happens:** `initializeRedis()` is called lazily on the first SSE request, not at startup. The existing `test.fixme` comment correctly explains this.
**How to avoid:** Pass `disableSse: true` in the third argument to `createMcpHandler`. The SSE path returns 404 immediately. Verify this with the re-pointed e2e test.
**Warning signs:** Any `test.fixme` referencing Redis or SSE; any unhandledRejection in server logs after a GET to `/api/mcp/sse`.

### Pitfall 2: `runtime = 'nodejs'` Missing on MCP Route
**What goes wrong:** The MCP route without an explicit Node.js runtime declaration may get deployed to Vercel's Edge runtime, where `lib/chains/clients.ts` (which uses `node:` APIs internally via viem) fails.
**Why it happens:** Next.js defaults routes to Edge runtime in some configurations; mcp-handler itself does not set the runtime.
**How to avoid:** Add `export const runtime = 'nodejs'` to `app/api/mcp/[transport]/route.ts`. Pattern matches `/api/dashboard` and `/api/status`.
**Warning signs:** 500 errors on Vercel with "The edge runtime does not support Node.js apis".

### Pitfall 3: Zod v4 Incompatibility with @asteasolutions/zod-to-openapi@8
**What goes wrong:** Installing `@asteasolutions/zod-to-openapi` without pinning to `^7` pulls v8.5.0, which requires Zod v4 (`^4.0.0`). The project uses Zod v3.25.76. The install succeeds but `extendZodWithOpenApi(z)` throws at runtime.
**Why it happens:** The library released a major version for Zod v4 compatibility in March 2026. The npm `latest` tag now points to v8.5.0.
**How to avoid:** Install `@asteasolutions/zod-to-openapi@7.3.4` explicitly. Never run `pnpm add @asteasolutions/zod-to-openapi` without pinning the version.
**Warning signs:** TypeScript errors about `openapi()` method not existing on Zod schemas; runtime errors in the openapi.yaml route.

### Pitfall 4: `@/.velite` Import in Tool Files vs. Build Pipeline
**What goes wrong:** Importing `@/.velite` in a file that also imports viem or other server-only modules can cause Velite's build output (`.velite/*.json`) to be attempted at dev startup before `velite build` runs.
**Why it happens:** The `tsconfig.json` path alias `@/.velite` resolves to `lib/velite-shim.ts`, which uses static `require('../.velite/X.json')`. This works at runtime but if the JSON is missing (clean build) the require throws.
**How to avoid:** Ensure `prebuild` script runs `velite build` before `next build` (already in `package.json`). In dev, run `pnpm exec velite build` once before `pnpm dev`. Tools that import `@/.velite` (list-iterations, get-iteration-state) require Velite output to be present.
**Warning signs:** "Cannot find module '.velite/research.json'" at startup.

### Pitfall 5: AGENT-04/05 β/p-value Field Expectation vs. Actual Research Schema
**What goes wrong:** REQUIREMENTS.md AGENT-04 says `list_iterations` returns "status, slug, version, β, p-value". The actual Velite `research` collection does NOT have these fields — they belonged to the old ITER-* econometric exercise which was descoped per the 2026-05-13 IA correction.
**Why it happens:** The requirements were written before the IA change; AGENT-04 was not updated.
**How to avoid:** The planner must define what `list_iterations` actually returns given the current data model. The research collection fields are: `slug`, `title_es`, `title_en`, `authors`, `date`, `type`, `track`, `readable_on_site`, `summary_es`, `summary_en`, `arxiv_id?`, `pdf_url?`. See Open Questions section for the recommended resolution.
**Warning signs:** TypeScript errors trying to access `.beta` or `.pValue` on Velite `Research` type.

### Pitfall 6: OpenAPI YAML Route Must Not Use `force-static`
**What goes wrong:** The current `/.well-known/openapi.yaml` stub uses `export const dynamic = 'force-static'` with a hardcoded string. The replacement that calls `generateOpenApiYaml()` imports Zod schemas — if the generation is dynamic (uses runtime data), it cannot be static. If the schemas are fully static (no runtime data), `force-static` is fine and preferred.
**Why it happens:** Forgetting to decide static vs. dynamic for the generated YAML.
**How to avoid:** Since the OpenAPI spec describes static endpoint contracts (no runtime data needed), keep `force-static` and call `generateOpenApiYaml()` at module level (executed once at build time).

### Pitfall 7: Tool Output Must Be Text, Not JSON Objects
**What goes wrong:** Returning raw objects from MCP tool handlers. The MCP SDK's `CallToolResult` content items are typed as `TextContent | ImageContent | EmbeddedResource`. JSON data must be serialized to `text` content.
**Why it happens:** Confusion between the MCP SDK's tool result type and REST API response shapes.
**How to avoid:**
```typescript
// WRONG
return { result: { status: 'not_deployed' } }

// CORRECT
return {
  content: [{ type: 'text' as const, text: JSON.stringify(result) }]
}
```

---

## Code Examples

### createMcpHandler with disableSse and runtime declaration
```typescript
// Source: node_modules/mcp-handler/dist/index.d.ts + installed source inspection
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'  // REQUIRED — tools use viem/Node.js APIs

import { createMcpHandler } from 'mcp-handler'
import { registerGetInstrumentTerms } from '@/lib/mcp-tools/get-instrument-terms'
import { registerGetIterationState } from '@/lib/mcp-tools/get-iteration-state'
import { registerGetPoolState } from '@/lib/mcp-tools/get-pool-state'
import { registerListApps } from '@/lib/mcp-tools/list-apps'
import { registerListIterations } from '@/lib/mcp-tools/list-iterations'
import { registerQueryEconometricPanel } from '@/lib/mcp-tools/query-econometric-panel'

const handler = createMcpHandler(
  (server) => {
    registerListApps(server)
    registerListIterations(server)
    registerGetIterationState(server)
    registerGetInstrumentTerms(server)
    registerGetPoolState(server)
    registerQueryEconometricPanel(server)
  },
  {
    serverInfo: { name: 'd2p Finance MCP Server', version: '1.0.0' },
  },
  {
    basePath: '/api/mcp',
    disableSse: true,  // SSE → 404 without Redis crash
  },
)

export { handler as GET, handler as POST, handler as DELETE }
```

### server.registerTool() — preferred modern API
```typescript
// Source: node_modules/.pnpm/@modelcontextprotocol+sdk@1.29.0_zod@3.25.76/
//          .../sdk/dist/cjs/server/mcp.d.ts lines 150-157
server.registerTool(
  'get_pool_state',
  {
    title: 'Get Pool State',
    description: 'Returns live pool reserves, LP count, and recent settlement events for a deployed Abrigo instrument.',
    inputSchema: z.object({
      app: z.string().default('abrigo'),
      chain: z.enum(['celo', 'ethereum', 'base', 'arbitrum', 'optimism']),
      pool_address: z.string().optional(),
    }),
  },
  async (input) => {
    const results = await aggregateAllChains()
    // ... find chain results, return honest envelope
    return { content: [{ type: 'text' as const, text: JSON.stringify(serializeBigints(result)) }] }
  },
)
```

### HuggingFace datasets-server /rows endpoint
```typescript
// Source: https://huggingface.co/docs/dataset-viewer/en/quick_start (verified 2026-05-29)
// Base URL: https://datasets-server.huggingface.co
// Endpoint: GET /rows?dataset=<org/name>&config=default&split=train&offset=0&length=100
// Auth: Bearer token in Authorization header (optional for public datasets)
// Max rows per page: 100
// Availability check: GET /is-valid?dataset=<org/name>
//   returns: { preview: bool, viewer: bool, search: bool, filter: bool, statistics: bool }
// Error for unpublished dataset: { error: 'The dataset does not exist, or is not accessible...' }

async function fetchHFRows(dataset: string, offset: number, length: number) {
  const url = new URL('https://datasets-server.huggingface.co/rows')
  url.searchParams.set('dataset', dataset)
  url.searchParams.set('config', 'default')
  url.searchParams.set('split', 'train')
  url.searchParams.set('offset', String(offset))
  url.searchParams.set('length', String(Math.min(length, 100)))  // max 100

  const headers: Record<string, string> = {}
  if (process.env.HF_API_TOKEN) headers['Authorization'] = `Bearer ${process.env.HF_API_TOKEN}`

  const res = await fetch(url.toString(), { headers })
  if (!res.ok) return null  // dataset not published or unavailable
  return res.json()  // { features, rows, num_rows_total, num_rows_per_page, partial }
}
```

### @asteasolutions/zod-to-openapi v7 pattern
```typescript
// Source: npm view @asteasolutions/zod-to-openapi@7.3.4 — verified Zod v3 peer dep
import {
  OpenApiGeneratorV31,
  OpenAPIRegistry,
  extendZodWithOpenApi,
} from '@asteasolutions/zod-to-openapi'
import { z } from 'zod'

extendZodWithOpenApi(z)  // Call once at module load

const registry = new OpenAPIRegistry()

const StatusResponseSchema = registry.register(
  'StatusResponse',
  z.object({
    version: z.literal(1),
    status: z.enum(['ok', 'degraded']),
    build: z.string(),
    timestamp: z.string().datetime(),
    chains: z.array(ChainHealthSchema),
    apps: z.record(z.object({ status: z.string(), instrumentsDeployed: z.number() })),
  })
)

registry.registerPath({
  method: 'get',
  path: '/api/status',
  summary: 'RPC health per configured chain and build hash',
  responses: {
    200: {
      description: 'Current status',
      content: { 'application/json': { schema: StatusResponseSchema } },
    },
  },
})

export function generateOpenApiYaml(): string {
  const generator = new OpenApiGeneratorV31(registry.definitions)
  const doc = generator.generateDocument({
    openapi: '3.1.0',
    info: { title: 'd2p Finance Public API', version: '0.1.0' },
    servers: [{ url: 'https://d2pfinance.xyz', description: 'Production' }],
  })
  // openapi3-ts types; serialize to YAML
  return JSON.stringify(doc)  // planner: use a YAML serializer here
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `server.tool()` | `server.registerTool()` | MCP SDK v1.29.0 (installed) | `server.tool()` still works but is deprecated — prefer `registerTool` for Phase 4 |
| SSE as primary MCP transport | Streamable HTTP as primary | MCP spec 2025-03-26 | SSE is deprecated in the MCP spec; the mcp-handler config comment confirms "As of 2025-03-26, SSE is not supported by the MCP spec" |
| `@asteasolutions/zod-to-openapi` v7 (Zod v3) | v8 (Zod v4) | March 2026 | Must pin to v7.3.4; v8 is latest but requires Zod v4 |
| OpenAPI 2.0 (Swagger) | OpenAPI 3.1.0 | Industry standard as of 2021 | 3.1.0 aligns JSON Schema draft 2020-12; `@asteasolutions/zod-to-openapi` v7.3.4 supports `OpenApiGeneratorV31` |

**Deprecated/outdated:**
- SSE MCP transport: deprecated in MCP spec 2025-03-26; kept in `/.well-known/mcp.json` for legacy client advertising but disabled in the handler.
- `server.tool()`: deprecated in `@modelcontextprotocol/sdk` v1.29.0; use `server.registerTool()`.
- The `/api/mcp/[transport]/route.ts` stub uses `createMcpHandler` with an empty callback — this is correct scaffolding; Phase 4 fills the callback.

---

## Open Questions

1. **What should `list_iterations` / `get_iteration_state` actually return given the IA change?**
   - What we know: The Velite `research` collection contains papers/memos/write-ups with `slug`, `title_es`, `title_en`, `authors`, `date`, `type`, `track`, `summary_es`, `summary_en`. It does NOT have `β`, `p-value`, or `version` fields. The econometric exercise is in `wvs-finance/abrigo-analytics`, not this site.
   - What's unclear: The Phase 4 success criteria say an agent calling `list_iterations()` should receive "status, slug, version, β, and p-value." These fields do not exist in the current data model.
   - **Recommendation for planner:** Redefine `list_iterations` to return research publications filtered by `track: 'abrigo-hedge-design'` (the Abrigo-relevant research entries), returning `{ slug, title_es, title_en, type, track, date, summary_es, summary_en, external_url?, arxiv_id? }`. Version, β, and p-value fields are honest `null` or absent. The success criterion text in ROADMAP.md should be treated as aspirational prose written before the IA change — the actual data available is the research collection. If the planner disagrees, the tool can return `{ status: 'unavailable', note: 'Iteration-level econometric results live in wvs-finance/abrigo-analytics' }`.

2. **Does the HuggingFace panel dataset (for `query_econometric_panel`) exist and is it published?**
   - What we know: `DASH-02` (HuggingFace econometric pipeline) was descoped in Phase 3 per the 2026-05-13 IA correction. No HuggingFace dataset name/org is declared anywhere in the codebase.
   - What's unclear: Whether `wvs-finance` or a related org has published a panel dataset; what its name would be.
   - **Recommendation:** Implement `query_econometric_panel` to return `{ status: 'unavailable', app: 'abrigo', panel, note: 'Panel dataset not yet published to HuggingFace. Check https://huggingface.co/wvs-finance for future availability.' }` as the initial implementation. The HF datasets-server `/is-valid` endpoint can be called first; on 4xx/error, return the honest envelope. This is consistent with the `not_deployed` pattern.

3. **YAML serialization library for the OpenAPI route**
   - What we know: `@asteasolutions/zod-to-openapi@7.3.4` generates a JavaScript object. The route must serialize it to YAML. The project does not currently have a YAML library installed.
   - **Recommendation:** Install `js-yaml` (common, well-maintained, 5KB gzipped) or use `yaml` (the other major option). Both serialize JS objects to YAML 1.2 correctly. `js-yaml` has broader ecosystem adoption. The planner should add `pnpm add js-yaml` and `pnpm add -D @types/js-yaml` to the Wave 0 task.

---

## Validation Architecture

> `workflow.nyquist_validation` is `true` in `.planning/config.json` — this section is required.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest v4.1.6 (unit/integration) + Playwright v1.60.0 (e2e) |
| Config file | `vitest.config.ts` (unit); `playwright.config.ts` (e2e) |
| Quick run command | `pnpm test:quick` (biome + tsc + vitest run) |
| Full suite command | `pnpm test:all` (test:quick + playwright test + lhci autorun) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AGENT-01 | `lib/mcp-tools/` barrel exports all tools; no lib duplication | unit (architecture) | `vitest run tests/architecture/` | ❌ Wave 0 |
| AGENT-02 | `/api/mcp/mcp` returns 200/valid handshake; `/api/mcp/sse` returns 404 | e2e | `pnpm test:e2e -- agent-stubs` | ✅ (fixme needs re-pointing) |
| AGENT-03 | `list_apps` returns `[{ slug: 'abrigo', ... }]` | unit | `vitest run tests/unit/mcp-tools.test.ts` | ❌ Wave 0 |
| AGENT-04 | `list_iterations` returns research entries filtered by app | unit | `vitest run tests/unit/mcp-tools.test.ts` | ❌ Wave 0 |
| AGENT-05 | `get_iteration_state` returns entry for known slug | unit | `vitest run tests/unit/mcp-tools.test.ts` | ❌ Wave 0 |
| AGENT-06 | `get_instrument_terms` returns `not_deployed` envelope when registry empty | unit | `vitest run tests/unit/mcp-tools.test.ts` | ❌ Wave 0 |
| AGENT-07-pool | `get_pool_state` returns `not_deployed` envelope when registry empty | unit | `vitest run tests/unit/mcp-tools.test.ts` | ❌ Wave 0 |
| AGENT-07 | `query_econometric_panel` returns `unavailable` envelope when dataset not published | unit | `vitest run tests/unit/mcp-tools.test.ts` | ❌ Wave 0 |
| AGENT-08 | `/.well-known/openapi.yaml` returns valid YAML with `openapi: 3.1.0` + all endpoint paths | e2e | `pnpm test:e2e -- agent-stubs` | ✅ (passes today; must be extended for new paths) |
| AGENT-09 | `/llms.txt` contains MCP endpoint pointer | e2e | `pnpm test:e2e -- agent-stubs` | ✅ (stub passes; update for Phase 4 content) |
| AGENT-10 | Dashboard/instrument pages emit JSON-LD with tool-output-matching schema | e2e | `pnpm test:e2e -- agent-stubs` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm test:quick` (biome + tsc + vitest run — < 30s)
- **Per wave merge:** `pnpm test:e2e -- agent-stubs` + `pnpm test:quick`
- **Phase gate:** Full suite green before `/gsd:verify-work`; Evidence Collector live-verification on all affected routes after each task commit (per CLAUDE.md)

### Wave 0 Gaps
- [ ] `tests/unit/mcp-tools.test.ts` — covers AGENT-01 through AGENT-07-pool tool return shapes; uses `@vitest-environment node` (same pattern as `tests/api/dashboard.test.ts`)
- [ ] `tests/architecture/mcp-no-duplication.test.ts` — imports `lib/mcp-tools/index.ts` and asserts no BFF route fetches inside tool handlers
- [ ] `tests/e2e/agent-stubs.spec.ts` fixme re-pointed — existing `test.fixme('/api/mcp/sse …')` converted to `test('/api/mcp/mcp handshake …')`; SSE test converted to `test('/api/mcp/sse returns 404')`
- [ ] Install `@asteasolutions/zod-to-openapi@7.3.4` + `js-yaml` + `@types/js-yaml`: `pnpm add @asteasolutions/zod-to-openapi@7.3.4 js-yaml && pnpm add -D @types/js-yaml`

*(The existing `tests/e2e/agent-stubs.spec.ts` already covers AGENT-02 partially, AGENT-08, AGENT-09 — these pass today and must remain green throughout Phase 4.)*

---

## Sources

### Primary (HIGH confidence)
- `node_modules/mcp-handler/dist/index.d.ts` — `createMcpHandler` signature, `Config.disableSse`, `Config.basePath`, `Config.redisUrl` default, `disableSse: false` default
- `node_modules/mcp-handler/dist/index.js` — source inspection confirming SSE path calls `initializeRedis()` lazily at request time; `disableSse` guard returns 404 before Redis init
- `node_modules/.pnpm/@modelcontextprotocol+sdk@1.29.0_zod@3.25.76/.../server/mcp.d.ts` — `server.registerTool()` preferred API, `server.tool()` marked `@deprecated`; `ToolCallback` type; `CallToolResult` content structure
- `npm view @asteasolutions/zod-to-openapi@7.3.4` — Zod peer `^3.20.2`; confirmed Zod v3 compatible
- `npm view @asteasolutions/zod-to-openapi` — v8.5.0 latest requires Zod `^4.0.0`
- `npm view mcp-handler --json` — v1.1.0 is current; published 2026-03-24
- `https://huggingface.co/docs/dataset-viewer/en/quick_start` — `/rows` endpoint parameters, auth, max 100 rows/request, error shape for inaccessible datasets

### Secondary (MEDIUM confidence)
- `app/api/mcp/[transport]/route.ts` — existing stub confirms `createMcpHandler` import and `basePath: '/api/mcp'` config
- `tests/e2e/agent-stubs.spec.ts` — confirms the `test.fixme` for SSE Redis issue and what must be re-enabled
- `lib/chains/serialize.ts` — `serializeBigints()` is the established bigint boundary; confirmed used in aggregator and health
- `.planning/phases/04-agent-surface-mcp/04-CONTEXT.md` — locked decisions (disableSse, not_deployed envelope, Zod → OpenAPI, direct lib import)
- `/home/jmsbpp/.claude/projects/-home-jmsbpp-apps-d2p-frontend/memory/ci_e2e_architecture.md` — confirmed e2e runs against local prod build; SSE fixme follow-up documented

### Tertiary (LOW confidence)
- HuggingFace panel dataset existence for `wvs-finance` org: not verified — no dataset name found in codebase; `query_econometric_panel` should default to `status: 'unavailable'` envelope

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all core packages verified from installed node_modules and npm registry
- Architecture: HIGH — tool registration pattern, disableSse behavior, not_deployed envelope all verified from source
- OpenAPI library version: HIGH — Zod v3/v4 compatibility verified from npm registry metadata
- HuggingFace API: MEDIUM — endpoint shape verified from official docs; dataset existence is LOW (unverified)
- `list_iterations` data model: HIGH (current schema) / LOW (β/p-value requirement — requires planner decision)

**Research date:** 2026-05-29
**Valid until:** 2026-06-30 (mcp-handler and @asteasolutions/zod-to-openapi are stable; MCP spec transport decisions are recent but settled)
