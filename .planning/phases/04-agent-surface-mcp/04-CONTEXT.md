# Phase 4: Agent Surface (MCP) - Context

**Gathered:** 2026-05-29
**Status:** Ready for planning

<domain>
## Phase Boundary

AI agents can discover, connect to, and query the full protocol and research state through (a) a live MCP server at `/api/mcp/[transport]`, (b) a machine-readable OpenAPI 3.1 spec, and (c) JSON-LD structured data that mirrors the tool output — **with no duplication between the MCP tool layer and the Phase-3 data layer** (tools wrap the existing BFF routes / lib functions).

In scope: AGENT-01–10 — `lib/mcp-tools/` shared definitions; the MCP route wired with tools (`list_apps`, `list_iterations`, `get_iteration_state`, `get_instrument_terms`, `get_pool_state`, `query_econometric_panel`); OpenAPI spec; `/llms.txt` entry URLs; JSON-LD mirroring.

Out of scope: the `/chat` shell (CHAT-01, future), wallet/DeFi surface (Phase 5), notification webhooks (NOTIF-02).
</domain>

<decisions>
## Implementation Decisions

### MCP transport + Redis (AGENT-02)
- **streamable-http (`/api/mcp/mcp`) is the canonical transport** — run it STATELESS so it needs **no Redis**. This is the modern MCP transport and works with Claude Desktop / Cursor / custom clients.
- `/api/mcp/sse` stays **advertised** in the descriptor but does NOT require Redis to be provisioned this phase: it should respond gracefully (point clients to streamable-http) rather than throw. The `mcp-handler` SSE transport's Redis dependency (`redisUrl is required`) is the reason — Redis provisioning is **deferred** (not adopted now).
- Consequence: the `test.fixme('/api/mcp/sse …')` left in Phase 3.1 should be re-pointed at the streamable-http endpoint (assert no-404 / valid handshake there), not the Redis-bound SSE one.

### Tool behavior when no contract is deployed (AGENT-06, AGENT-07-pool; CROSS-09 anti-fishing)
- `get_instrument_terms` / `get_pool_state` **succeed** (not an error) and return a structured envelope: `{ status: 'not_deployed', instrument_id, chain, terms: null, pool: null, note: '…' }`.
- Mirrors Phase-3's `status: 'empty'` aggregator pattern. **Never fabricate** reserves/terms. Agents branch on the `status` field. An MCP `isError` is reserved for genuine failures (bad args, RPC down), not the normal pre-launch empty state.

### OpenAPI 3.1 spec (AGENT-08)
- **Generate `/.well-known/openapi.yaml` from Zod contracts** (single source of truth) — extend the existing `lib/dashboard/contract.ts` `version:1` envelopes into Zod schemas and run them through `zod-to-openapi`. The spec must not be able to drift from actual route responses.
- Document every public REST endpoint (`/api/dashboard`, `/api/status`, `/api/health`, and the MCP route) with request/response examples.

### Claude's Discretion
- **`query_econometric_panel` (AGENT-07) data source** — user did not pin this; **research item**: confirm whether the HuggingFace panel dataset exists/is published, choose the access path (HF datasets-server API vs a thin proxy route), define paging, and the honest fallback when the dataset is unpublished (likely a `status: 'unavailable'` envelope consistent with the not_deployed pattern). Planner/researcher to resolve.
- Exact Zod schema layout, tool input validation messages, and JSON-LD field mapping details.
- Whether `lib/mcp-tools/` tools call the lib functions (`lib/dashboard/aggregator`, `lib/apps/abrigo/instruments`) directly or fetch the BFF routes — pick whichever best honors AGENT-01 "no duplication" (direct lib import preferred to avoid an internal HTTP hop).
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope + requirements
- `.planning/ROADMAP.md` § "Phase 4: Agent Surface (MCP)" — goal, depends-on (Phase 3 BFF + Phase 2 content), success criteria 1–4.
- `.planning/REQUIREMENTS.md` — **AGENT-01 … AGENT-10** (tool list, no-duplication, route handler, OpenAPI, llms.txt, JSON-LD mirroring). Also FOUND-12 (agent-accessibility scaffold) and ITER-09 (Dataset + ScholarlyArticle JSON-LD) for the mirroring contract.

### Existing data layer the tools wrap (no duplication)
- `lib/dashboard/contract.ts` — `DashboardResponse` / `StatusResponse` `version:1` envelopes (the Zod/OpenAPI source of truth).
- `lib/dashboard/aggregator.ts` — per-chain aggregation (`list`/pool state source).
- `lib/apps/abrigo/instruments.ts` — `AbrigoInstrument` type + empty `ABRIGO_INSTRUMENTS` registry + `ABRIGO_ABI` (drives `get_instrument_terms`/`get_pool_state`).
- `lib/status/health.ts`, `lib/chains/{clients,serialize}.ts` — health + bigint serialization.
- `app/api/mcp/[transport]/route.ts` — the `mcp-handler` stub (`createMcpHandler`, `basePath:'/api/mcp'`); Phase 4 registers tools here, importing from `lib/mcp-tools/`.
- `app/api/dashboard/route.ts`, `app/api/status/route.ts`, `app/api/health/route.ts` — REST endpoints to document in OpenAPI.
- `app/llms.txt/route.ts`, `app/.well-known/mcp.json/route.ts`, `app/.well-known/openapi.yaml/route.ts` — existing stubs to fill (AGENT-08/09).

### Project rules
- `./CLAUDE.md` — anti-fishing (status pills/honest empties), Evidence-Collector live-verification gate, es-CO-first copy, biome+tsc pre-commit.
- Memory `ci_e2e_architecture.md` — the `/api/mcp/sse` Redis `test.fixme` to re-enable; e2e runs local-build on PR.

### Library docs (fetch during research)
- `mcp-handler` (installed pkg; note: requirement text says `@vercel/mcp-handler`) — transport options (streamable-http stateless vs SSE/Redis), `server.tool()` registration.
- `zod-to-openapi` (or equivalent) — generating OpenAPI 3.1 from Zod.
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/dashboard/aggregator.ts` + `lib/apps/abrigo/instruments.ts` + `lib/status/health.ts`: the data functions the MCP tools wrap — import directly (avoid an internal HTTP hop) to honor AGENT-01 no-duplication.
- `lib/dashboard/contract.ts` `version:1` envelopes: the basis for the Zod schemas → OpenAPI generation.
- `lib/chains/serialize.ts`: bigint→string serializer (tool JSON output must be bigint-safe — a Phase-2 burn class).
- `app/api/mcp/[transport]/route.ts`: `createMcpHandler` stub ready for `server.tool(...)` calls.

### Established Patterns
- `status: 'empty' | 'ok' | 'degraded'` honest-state envelopes (Phase 3) — extend with `'not_deployed'` for instrument/pool tools.
- Velite research collection (`@/.velite`) is the corpus for `list_iterations` / `get_iteration_state` (Phase 2 content; iteration MDX). Note: the public IA change moved econometric iteration detail off-site — confirm what `get_iteration_state` should surface (research entries vs the abrigo-analytics source).
- `@t3-oss/env-nextjs` (`lib/env.ts`) for any new env (none expected since Redis is deferred).

### Integration Points
- MCP tools registered in `app/api/mcp/[transport]/route.ts` import from new `lib/mcp-tools/`.
- OpenAPI generation wired into the `/.well-known/openapi.yaml` route (or a build step) from the Zod contracts.
- JSON-LD on content pages must mirror the tool output schema (AGENT-10) — reuse `components/StructuredData.tsx`.
</code_context>

<specifics>
## Specific Ideas

- Transport decision is explicitly streamable-http-first to avoid the Redis dependency that destabilised the server in Phase-3.1 e2e (the `redisUrl is required` unhandledRejection). Do NOT adopt Redis to satisfy SSE this phase.
- OpenAPI must be drift-proof (generated), not hand-maintained prose.
- Tool empties must be honest (`not_deployed`), never zero-filled to look live.
</specifics>

<deferred>
## Deferred Ideas

- **Redis provisioning + full SSE transport** — only if a target MCP client strictly requires SSE; revisit post-launch.
- **`/chat` shell (CHAT-01)** — grounded in `lib/mcp-tools/`; future phase.
- **Notification webhooks for new verdicts (NOTIF-02)** — future.
- **`query_econometric_panel` real HuggingFace wiring** — in scope as a tool, but its data-source path is a research item (may land as an `unavailable` envelope if the dataset isn't published yet).
</deferred>

---

*Phase: 04-agent-surface-mcp*
*Context gathered: 2026-05-29*
