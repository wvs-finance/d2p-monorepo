# Phase 04 — Live MCP Verification

## Task 04-05 — MCP route live handshake (streamable-http) — 2026-05-29

Run by the orchestrator against a clean prod build (`pnpm build && pnpm start -p 3040`), JSON-RPC over `POST /api/mcp/mcp` (CLAUDE.md: agent surface verified via JSON-RPC/curl, not browser_snapshot).

| # | Claim | Verdict | Evidence |
|---|-------|---------|----------|
| 1 | `initialize` handshake | ✓ PASS | `serverInfo {name:"d2p Finance MCP Server", version:"1.0.0"}`, protocol 2024-11-05, **stateless** (no session id, no Redis) |
| 2 | `tools/list` returns all 6 tools | ✓ PASS | `list_apps, list_iterations, get_iteration_state, get_instrument_terms, get_pool_state, query_econometric_panel` |
| 3 | `get_pool_state` honest-empty | ✓ PASS | `{ status:'not_deployed', pool:null }`; no fabricated reserves (no `"poolBalance":<digit>`) |
| 3b | `get_iteration_state` FOUND | ✓ PASS | RESULT with `structuredContent {status:'found', detail:{slug:'pair-d-dispatch-brief'}}`; **NO `_zod` / Output-validation error, no isError** — the union-outputSchema NEW-BLOCKER is dead on the live transport |
| 3c | `get_iteration_state` UNKNOWN | ✓ PASS | RESULT `{status:'not_found', detail:null}` — not an error |
| 4 | SSE `GET /api/mcp/sse` → 404, no Redis crash | ✓ PASS | HTTP 404; `grep redisUrl\|unhandledRejection` server log = 0 (the `disableSse:true` 404-before-`initializeRedis()` path) |

**Verdict: APPROVED.** All AGENT-01/AGENT-02 live claims hold. The streamable-http transport is the canonical path; SSE is a clean Redis-free 404. The single-ZodObject `get_iteration_state` fix is confirmed on the real SDK transport (not just the in-memory test).

**Deferred to manual (per 04-VALIDATION):** a full external MCP client (Claude Desktop/Cursor) handshake post-deploy — the scripted JSON-RPC round-trip above is the CI/local proxy for it.

## Task 04-06 — dashboard JSON-LD mirror (AGENT-10) — 2026-05-29

Orchestrator live verification against a clean local prod build (`/apps/abrigo/dashboard`; JSON-LD is server-rendered, asserted from SSR HTML + a browser screenshot/console pass).

| # | Claim | Verdict | Evidence |
|---|-------|---------|----------|
| 1 | Route renders 200 | ✓ PASS | `/apps/abrigo/dashboard` → 200 |
| 2 | `<script type="application/ld+json">` `@type:SoftwareApplication`, `name:Abrigo` | ✓ PASS | parsed from SSR HTML |
| 3 | Mirrors MCP tool output (honest status) | ✓ PASS | `status=not_deployed`, `chainsConfigured=5`, per-chain `= empty` |
| 4 | No fabricated numeric values (anti-fishing) | ✓ PASS | no `"poolBalance/balance/reserves":<digit>` |
| 5 | No console errors | ✓ PASS | 0 errors / 0 warnings |
| — | Screenshot | `/tmp/d2p-verify/04-06-dashboard.png` |

**Verdict: APPROVED.** AGENT-10 live-confirmed (dashboard-only this phase per the recorded waiver). Dashboard JSON-LD ≡ MCP tool output schema; honest empties; no fabrication.
