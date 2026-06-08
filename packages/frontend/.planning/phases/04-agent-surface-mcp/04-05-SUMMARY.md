---
phase: 04-agent-surface-mcp
plan: "05"
subsystem: mcp-route-wiring
requirements: [AGENT-01, AGENT-02]
status: complete
---

# 04-05 — Wire the MCP route (Wave 3)

## What shipped
- `lib/mcp-tools/index.ts` — barrel re-exporting all six tool registrars.
- `app/api/mcp/[transport]/route.ts` — `createMcpHandler((server) => { register all six from the barrel }, {}, { basePath:'/api/mcp', disableSse:true })`; `runtime='nodejs'`, `dynamic='force-dynamic'`, `serverInfo {name:'d2p Finance MCP Server', version:'1.0.0'}`, exports GET/POST/DELETE. No inline tool logic (AGENT-01 no-duplication).
- Filled `tests/api/mcp.test.ts` (initialize 200, tools/list = 6, SSE→404), `tests/architecture/mcp-no-duplication.test.ts` (barrel re-exports the six registrars; single `extendZodWithOpenApi`), and un-fixme'd the `tests/e2e/agent-stubs.spec.ts` streamable-http + SSE handshake.

## Commits
- `c48d027` feat(04-05): barrel + wire MCP route (AGENT-01, AGENT-02)
- `8765f30` feat(04-05): un-fixme route + architecture + e2e handshake tests

## Verification
- `pnpm test:quick`: **174 passed / 0 skipped** (the route-handler, architecture, and e2e handshake scaffolds all flipped skip→green).
- **Live MCP handshake (orchestrator gate): APPROVED** — see `04-LIVE-VERIFICATION.md`. `initialize` (stateless, no Redis) ✓; `tools/list` 6 tools ✓; `get_pool_state` not_deployed/pool:null ✓; `get_iteration_state` found + not_found return RESULTS (no `_zod`/validation crash — the union-outputSchema blocker confirmed dead on the real transport) ✓; SSE→404 with 0 redis/unhandledRejection ✓.

## Notes
- commitlint `body-max-line-length:100` forced multi-`-m` bodies; biome reformatted the un-fixme'd e2e call (formatting only). No `--no-verify`.
- AGENT-01/AGENT-02 complete. Remaining in Phase 4: 04-06 (dashboard JSON-LD mirror, AGENT-10) — has its own Evidence-Collector checkpoint.
