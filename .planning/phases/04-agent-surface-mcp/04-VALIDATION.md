---
phase: 4
slug: agent-surface-mcp
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-29
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. The planner MUST map every AGENT-01..AGENT-10 requirement to a row in the Per-Task Verification Map.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Frameworks** | Vitest 4.x (unit + route handlers), Playwright (e2e), Biome (lint/format), tsc (typecheck), impeccable@2.1.8 (anti-pattern CLI gate) |
| **Config files** | Existing — `vitest.config.ts`, `playwright.config.ts`, `biome.json`, `tsconfig.json` |
| **Quick run command** | `pnpm test:quick` (biome + tsc + vitest) |
| **Full suite command** | `pnpm test:all` |
| **Estimated quick runtime** | ~40 seconds |

> **Ground-truth gate (CLAUDE.md):** automated green is necessary but NOT sufficient. After each route task commit, the Evidence Collector / a live check runs against the affected endpoint. The MCP tools + OpenAPI are agent-facing (no rendered DOM) — verify with `curl` / `browser_network_request` / a real MCP client handshake rather than `browser_snapshot`.
>
> **CI e2e runs LOCAL-build (memory `ci_e2e_architecture.md`):** e2e/a11y run on PR against a local prod build. The existing `/api/mcp/sse` `test.fixme` is re-pointed at streamable-http (`/api/mcp/mcp`) this phase (research: `disableSse:true` makes SSE 404 cleanly, no Redis).

---

## Sampling Rate

- **After every task commit:** `pnpm test:quick`
- **After every plan wave:** `pnpm test:all`
- **After each route/tool task:** live check — MCP `initialize` + `tools/list` over streamable-http; `curl /.well-known/openapi.yaml`; `curl /llms.txt`
- **Before `/gsd:verify-work`:** Full suite green + a real MCP client (or scripted JSON-RPC) lists all tools
- **Max feedback latency:** 40s per task (quick)

---

## Per-Task Verification Map

> Planner fills Task IDs once plans exist. Requirement → test-type guidance below. Every AGENT-0X requirement MUST appear.

| Req ID | Test Type | Automated Command (guidance) | Evidence / File | Status |
|--------|-----------|------------------------------|-----------------|--------|
| **AGENT-01** | unit + structural | grep both `app/api/mcp/[transport]/route.ts` AND the chat/tool consumers import from `lib/mcp-tools/` (no duplicated tool logic) + `vitest run tests/unit/mcp-tools*.test.ts` | `lib/mcp-tools/` | ⬜ pending |
| **AGENT-02** | route + e2e | `vitest run tests/api/mcp.test.ts` (POST `/api/mcp/mcp` JSON-RPC `initialize` → 200; SSE GET `/api/mcp/sse` → 404 via `disableSse:true`, NOT a crash) + e2e handshake | `app/api/mcp/[transport]/route.ts` | ⬜ pending |
| **AGENT-03** | unit | `list_apps()` returns the abrigo registry entry `{ slug, name, status, external_url }` (registry exposes `description_key`, NOT `description` — no raw i18n key emitted as prose, no fabricated description) | `lib/mcp-tools/list-apps.ts` | ⬜ pending |
| **AGENT-04** | unit | `list_iterations(app, filter?)` returns research-collection rows (track-filtered); `app` defaults to `"abrigo"`; β/p-value omitted/null where absent post-IA (never fabricated) | `lib/mcp-tools/list-iterations.ts` | ⬜ pending |
| **AGENT-05** | unit | `get_iteration_state(app, slug, version)` returns full on-site detail (replication hash + notebook URL where present); honest `not_found` for unknown slug | `lib/mcp-tools/get-iteration-state.ts` | ⬜ pending |
| **AGENT-06** | unit | `get_instrument_terms(app, instrument_id, chain)` → `{status:'not_deployed', terms:null, …}` against the empty registry (anti-fishing); never fabricated | `lib/mcp-tools/get-instrument-terms.ts` | ⬜ pending |
| **AGENT-07-pool** | unit | `get_pool_state(app, chain, pool_address)` → `{status:'not_deployed', pool:null, …}`; bigint fields serialize as strings (`lib/chains/serialize.ts`) | `lib/mcp-tools/get-pool-state.ts` | ⬜ pending |
| **AGENT-07** | unit | `query_econometric_panel(app, panel, filters)` → `{status:'unavailable', note:…}` (no HF dataset published); paging contract typed | `lib/mcp-tools/query-econometric-panel.ts` | ⬜ pending |
| **AGENT-08** | route + unit + contract-conformance | `curl /.well-known/openapi.yaml` → valid OpenAPI 3.1 (`openapi: 3.1.0`); generated from the SAME shared Zod schemas the OpenAPI generator imports (`@asteasolutions/zod-to-openapi@7.3.4`, single-source per B3); documents `/api/dashboard`,`/api/status`,`/api/health` (example `runtime:'node'`),`/api/mcp` with examples; Wave-0 **contract-conformance test** round-trips a real `/api/dashboard` + `/api/status` response through the OpenAPI-registered Zod schema so spec ≡ live route in CI | `app/.well-known/openapi.yaml/route.ts`, `lib/mcp-tools/contract.ts`, `lib/openapi/schemas.ts` | ⬜ pending |
| **AGENT-09** | route | `curl /llms.txt` → lists primary entry URLs + content licensing + MCP endpoint pointer | `app/llms.txt/route.ts` | ⬜ pending |
| **AGENT-10** | unit + structural | JSON-LD emitted on the **dashboard page only this phase** (no instrument/iteration pages exist pre-launch — waiver below) mirrors the tool output schema (`not_deployed`/empty status fields, no fabricated numbers) | `components/AgentStateJsonLd.tsx`, `lib/mcp-tools/contract.ts` | ⬜ pending |

**Anti-fishing cross-cut:** a test MUST assert the no-contract tools return `status:'not_deployed'`/`'unavailable'` with null fields and **no fabricated numeric values**.

---

## Wave 0 Requirements

- [ ] `tests/api/mcp.test.ts` — JSON-RPC `initialize` + `tools/list` over streamable-http; SSE 404 assertion
- [ ] `tests/unit/mcp-tools-*.test.ts` — one per tool (real assertions; empty-registry honest envelopes)
- [ ] `tests/api/openapi.test.ts` — OpenAPI 3.1 validity + documented-shape-matches-live-route
- [ ] re-point `tests/e2e/agent-stubs.spec.ts` `test.fixme('/api/mcp/sse …')` → assert streamable-http `/api/mcp/mcp` handshake (no-404)
- [ ] install pins: `@asteasolutions/zod-to-openapi@7.3.4` (Zod v3 — NOT v8), confirm `mcp-handler` + `@modelcontextprotocol/sdk` versions
- [ ] **contract-conformance test** (B3): round-trip a real `/api/dashboard` + `/api/status` response through the OpenAPI-registered Zod schema (single-source proof in CI)
- [ ] **runtime smoke** (M6): assert `extendZodWithOpenApi(z); z.string().openapi({})` runs at install-verify time (version-pin ≠ runtime-compat — project burn pattern)
- [ ] **date-boundary fixture** (B1): research test fixtures use real `new Date(...)` (shim emits `Date`, not string); tools normalize `date` to an ISO string and a test asserts the round-trip

*If existing infra covers a requirement, the planner notes it instead of a Wave 0 stub.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Real MCP client connects + lists tools | AGENT-02 | Full client handshake (Claude Desktop/Cursor) can't run in CI | After deploy, point a client at `https://<url>/api/mcp/mcp`, confirm `list_apps`/`list_iterations` callable. Record in LIVE-VERIFICATION. |
| Live pool/instrument values correct | AGENT-06, AGENT-07-pool | No contracts deployed yet (registry empty) | When the first Abrigo contract deploys, verify tools return real reserves vs a block explorer. Follow-up. |
| HuggingFace panel rows | AGENT-07 | Dataset not published / name unknown | When the abrigo panel dataset is published, wire the real name + verify paging. Until then `status:'unavailable'`. |
| **AGENT-04/05 reinterpretation** | AGENT-04, AGENT-05 | β/p-value/version/replication-hash/notebook-url do not exist in the on-site data model (IA correction 2026-05-13) | **WAIVER:** ROADMAP success criteria #1/#2 + REQUIREMENTS AGENT-04/05 struck and amended to the on-site research-collection contract (mirrors ITER-01..09 / DASH-05/06). Tools return the fields that EXIST (slug/title/type/track/date/authors/summary/external_url/arxiv_id + body); never fabricate econometric fields. Signed-off as re-scoped, not under-delivered. |
| **AGENT-10 dashboard-only** | AGENT-10 | No instrument/iteration pages exist pre-launch | **WAIVER:** Only the Abrigo dashboard page emits the mirrored JSON-LD this phase. Instrument/iteration-page JSON-LD is deferred until those routes exist (post-launch). |

---

## Validation Sign-Off

- [ ] Every AGENT-0X requirement has an automated verify or a recorded manual waiver
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING test references
- [ ] No watch-mode flags
- [ ] Feedback latency < 40s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
