---
phase: 04-agent-surface-mcp
verified: 2026-05-29T23:35:00Z
status: passed
score: 10/10 AGENT requirements verified (goal met with tracked post-deploy residuals)
re_verification: null
overall_verdict: GOAL MET-WITH-TRACKED-RESIDUALS
gaps: []
human_verification:
  - test: "External MCP client (Claude Desktop / Cursor) connects to https://<preview>/api/mcp/mcp, lists + calls tools"
    expected: "list_apps / list_iterations callable; same payloads as the scripted JSON-RPC round-trip"
    why_human: "Full client handshake cannot run in CI; the scripted JSON-RPC POST in 04-LIVE-VERIFICATION is the local/CI proxy. Manual post-deploy (recorded waiver #5)."
  - test: "get_instrument_terms / get_pool_state return real reserves after first Abrigo contract deploys"
    expected: "Live reserves match a block explorer; status flips not_deployed → live"
    why_human: "No contracts deployed yet (registry empty). Recorded waivers #2 — manual post-deploy follow-up."
  - test: "query_econometric_panel returns real rows once the HuggingFace panel dataset is published"
    expected: "Paged rows; status flips unavailable → ok; HF_PANEL_DATASET confirmed against huggingface.co/wvs-finance"
    why_human: "HF dataset unpublished / name UNVERIFIED. Recorded waiver #3 — manual follow-up."
---

# Phase 4: Agent Surface (MCP) Verification Report

**Phase Goal:** AI agents can discover, connect to, and query the full protocol and research state through a live MCP server, a machine-readable OpenAPI 3.1 spec, and JSON-LD structured data — with **no duplication** between the MCP tool layer and the Phase-3 data layer.

**Verified:** 2026-05-29T23:35:00Z
**Status:** passed
**Overall verdict:** **GOAL MET — WITH TRACKED RESIDUALS**
**Re-verification:** No — initial verification.

This verification asserts code ground-truth (Read of every cited file + structural greps + a green run of all 9 phase-4 test files), cross-referenced against the orchestrator's two live checkpoints in `04-LIVE-VERIFICATION.md` (MCP handshake + dashboard JSON-LD, both APPROVED). Per the run constraints, no Playwright/long-lived server was launched.

---

## Goal Achievement

### Observable Truths (ROADMAP success criteria, AMENDED per 2026-05-13 IA correction)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Agent connects to `/api/mcp/mcp` (streamable-http; SSE→404), calls `list_iterations()`, gets on-site research-collection rows (slug/title_es/en/type/track/date/authors/summary/external_url/arxiv_id), track-filtered to `abrigo-hedge-design` by default; β/p-value never fabricated | ✓ VERIFIED | `lib/mcp-tools/list-iterations.ts` reads `@/.velite research` directly, dedupes es-CO, defaults to `abrigo-hedge-design`, field-by-field `ResearchEntryOut.parse` (no econometric keys). Live: 04-LIVE-VERIFICATION rows #1/#2 — `initialize` stateless + `tools/list` 6 tools APPROVED |
| 2 | Agent calls `get_iteration_state({app,slug})`, gets full on-site research-entry detail (ResearchEntryOut + body) in one response; `version` accepted-but-ignored; unknown slug → honest `not_found`; no replication_hash/notebook_url | ✓ VERIFIED | `lib/mcp-tools/get-iteration-state.ts` single ZodObject `{status,detail,app,slug,note?}`; found→IterationDetailOut+body, unknown→`not_found`/detail:null. Live: 04-LIVE-VERIFICATION rows #3b (FOUND, no `_zod` crash) + #3c (UNKNOWN = result, not error) APPROVED |
| 3 | Agent calls `get_instrument_terms` + `get_pool_state`, gets terms + pool reserves from the SAME BFF lib that powers the human dashboard, no duplicated logic | ✓ VERIFIED (honest not_deployed; live values = post-deploy) | `get-instrument-terms.ts` imports `ABRIGO_INSTRUMENTS`; `get-pool-state.ts` imports `aggregateAllChains` (same lib as dashboard). Both return `NotDeployedEnvelope` (terms/pool null). No `/api/` fetch in any tool (grep=NONE). Live: 04-LIVE row #3 `get_pool_state` not_deployed/pool:null, no fabricated reserves |
| 4 | Agent/dev fetches `/.well-known/openapi.yaml`, gets valid OpenAPI 3.1 documenting every public REST endpoint with examples — client-writable without source | ✓ VERIFIED | `lib/openapi/generate.ts` `OpenApiGeneratorV31 … {openapi:'3.1.0'}`; `schemas.ts` registers canonical schemas + 4 paths (`/api/health`,`/api/dashboard`,`/api/status`,`/api/mcp/mcp`) with examples; route serves it. `tests/api/openapi.test.ts` green (3.1.0 header, 4 paths, runtime:node, YAML round-trip) |

**Score:** 4/4 amended ROADMAP truths verified (truth #3 live-values are a recorded post-deploy residual, not a gap).

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `lib/mcp-tools/index.ts` | Barrel re-exporting all 6 registrars | ✓ VERIFIED | 6 `export { register… }` lines; imported by route |
| `lib/mcp-tools/contract.ts` | Tool envelopes; re-exports canonical Zod, never re-declares | ✓ VERIFIED | Re-exports 6 canonical schemas from `@/lib/dashboard/contract`; NO `extendZodWithOpenApi` here; `NotDeployed`/`Unavailable`/`AppEntryOut`(no `description`)/`ResearchEntryOut`/`IterationDetailOut`(no econ keys); `dateToIso` |
| `lib/mcp-tools/list-apps.ts` | `list_apps` → registry, `description_key` not prose | ✓ VERIFIED | Maps `apps` registry; emits `description_key`; no fabricated `description` row field |
| `lib/mcp-tools/list-iterations.ts` | `list_iterations` → Velite research, track-filtered | ✓ VERIFIED | Direct `@/.velite`; es-CO dedupe; default track; `dateToIso`; field-by-field parse |
| `lib/mcp-tools/get-iteration-state.ts` | Single-object outputSchema, found/not_found | ✓ VERIFIED | Single ZodObject (NOT union); both branches return matching structuredContent + body |
| `lib/mcp-tools/get-instrument-terms.ts` | `not_deployed` envelope, no fabrication | ✓ VERIFIED | Empty `ABRIGO_INSTRUMENTS` → NotDeployedEnvelope; future branch also honest |
| `lib/mcp-tools/get-pool-state.ts` | `not_deployed`, bigint-safe | ✓ VERIFIED | `aggregateAllChains` short-circuits empty; `serializeBigints` imported for future path; no fabricated `poolBalance` |
| `lib/mcp-tools/query-econometric-panel.ts` | `unavailable` envelope, guarded probe, paging typed | ✓ VERIFIED | Guarded `fetch(...).catch(()=>null)`; one `HF_PANEL_DATASET // UNVERIFIED`; offset/length(max 100) typed; org-only note |
| `app/api/mcp/[transport]/route.ts` | `createMcpHandler` w/ `disableSse:true`, registers 6 from barrel, no inline logic | ✓ VERIFIED | Imports all 6 from barrel; `disableSse:true`; `runtime='nodejs'`; serverInfo `d2p Finance MCP Server` v1.0.0; GET/POST/DELETE |
| `lib/dashboard/contract.ts` | Sole `extendZodWithOpenApi(z)`; canonical Zod source; `z.infer` types | ✓ VERIFIED | Exactly ONE `extendZodWithOpenApi(z)` call site repo-wide (grep); `DashboardResponseSchema`/`StatusResponseSchema` + `z.infer` types |
| `lib/openapi/{schemas,generate}.ts` | Registry imports canonical schemas; OpenApiGeneratorV31 3.1.0 + js-yaml | ✓ VERIFIED | `schemas.ts` imports (never re-declares); `generate.ts` `OpenApiGeneratorV31 … 3.1.0` + `yaml.dump` |
| `app/.well-known/openapi.yaml/route.ts` | Serves generated spec | ✓ VERIFIED | `force-static`, `application/yaml`, body from `generateOpenApiYaml()` |
| `app/llms.txt/route.ts` | Entry URLs + license + MCP pointer | ✓ VERIFIED | Primary/agent/machine URLs; MCP canonical `/api/mcp/mcp` + SSE disabled note; license; org |
| `components/AgentStateJsonLd.tsx` | JSON-LD mirroring tool output (honest not_deployed) | ✓ VERIFIED | RSC `SoftwareApplication` `Abrigo`; `status`/`chainsConfigured`/per-chain status; XSS-escaped; no fabricated numbers |

All 14 artifacts: exist + substantive + wired. Zero MISSING, zero STUB, zero ORPHANED.

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `route.ts` | `lib/mcp-tools` barrel | `import { register… }` + 6 calls in handler | ✓ WIRED | All 6 registrars imported and invoked; no inline tool logic |
| MCP tools | Phase-3 data layer | direct lib import (no BFF HTTP hop) | ✓ WIRED | `list-iterations`→`@/.velite`; `list-apps`→`apps` registry; `get-pool-state`→`aggregateAllChains`; `get-instrument-terms`→`ABRIGO_INSTRUMENTS`. grep for `/api/` fetch in tools = NONE |
| `lib/openapi/schemas.ts` | `lib/dashboard/contract` (via mcp-tools re-export) | `import { …Schema }` | ✓ WIRED | Same Zod objects the live routes type against; conformance test proves equality |
| `openapi.yaml` route | `lib/openapi/generate` | `generateOpenApiYaml()` | ✓ WIRED | Served body computed at module load |
| dashboard page | `AgentStateJsonLd` | `<AgentStateJsonLd chains={data} />` | ✓ WIRED | Reuses the SINGLE `const data = await aggregateAllChains()` (one RPC; no second call — the grep `2` counted the import line + comment) |
| all OpenAPI schemas | single Zod source | `extendZodWithOpenApi(z)` | ✓ WIRED | Exactly 1 call site (`lib/dashboard/contract.ts`); architecture test enforces |

### Requirements Coverage

| Requirement | Source Plan | Description (amended) | Status | Evidence |
|-------------|-------------|-----------------------|--------|----------|
| AGENT-01 | 04-01, 04-05 | `lib/mcp-tools/` shared defs; route imports — no duplication | ✓ SATISFIED | Barrel + route import; no `/api/` fetch in tools; single `extendZodWithOpenApi`; architecture test green |
| AGENT-02 | 04-05 | MCP server at `/api/mcp/[transport]` | ✓ SATISFIED | `createMcpHandler` `disableSse:true`; Live: `initialize` + `tools/list`(6) + SSE→404 no-Redis APPROVED |
| AGENT-03 | 04-02 | `list_apps()` → registry | ✓ SATISFIED | `list-apps.ts`; `description_key` not prose; unit + real-transport tools/list |
| AGENT-04 | 04-02 | `list_iterations` → on-site research rows (IA-honest, no β/p) | ✓ SATISFIED (re-scoped per waiver #1) | `list-iterations.ts`; track default; no econometric keys; never fabricated |
| AGENT-05 | 04-02 | `get_iteration_state` → research-entry detail; single-object schema | ✓ SATISFIED (re-scoped per waiver #1) | `get-iteration-state.ts` single ZodObject; Live 3b/3c found+not_found = results, no validateToolOutput crash |
| AGENT-06 | 04-03 | `get_instrument_terms` | ✓ SATISFIED (honest not_deployed; live = waiver #2) | `get-instrument-terms.ts` NotDeployedEnvelope; no fabrication |
| AGENT-07-pool | 04-03 | `get_pool_state` | ✓ SATISFIED (honest not_deployed; live = waiver #2) | `get-pool-state.ts` `aggregateAllChains`; bigint-safe future path; Live #3 not_deployed |
| AGENT-07 | 04-03 | `query_econometric_panel` | ✓ SATISFIED (unavailable; live = waiver #3) | `query-econometric-panel.ts` guarded probe; UNVERIFIED dataset; paging typed |
| AGENT-08 | 04-04 | OpenAPI 3.1 at `/.well-known/openapi.yaml` w/ examples | ✓ SATISFIED | Generated 3.1.0 from canonical Zod; 4 paths + examples; conformance test (spec ≡ live route) green |
| AGENT-09 | 04-04 | `/llms.txt` entry URLs + license + MCP pointer | ✓ SATISFIED | `llms.txt/route.ts` full URL set, MCP canonical pointer, license |
| AGENT-10 | 04-06 | JSON-LD mirroring tool output schema | ✓ SATISFIED (dashboard-only per waiver #4) | `AgentStateJsonLd.tsx`; Live 04-06 `SoftwareApplication`/`Abrigo`/not_deployed/5 chains empty/no fabricated numbers/0 console errors APPROVED |

**No orphaned requirements** — REQUIREMENTS.md maps AGENT-01..AGENT-10 to Phase 4; all 10 appear in plan `requirements`/SUMMARY frontmatter and are verified.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `query-econometric-panel.ts` | 21 | `HF_PANEL_DATASET // UNVERIFIED` constant | ℹ️ Info | Intentional, honest, single-source; never asserted in shipped note; mapped to manual follow-up (waiver #3). Not a stub — the `unavailable` envelope is the correct pre-publish behavior |
| `get-instrument-terms.ts` / `get-pool-state.ts` | future branches | "term-reading not wired" / "envelope not yet wired" | ℹ️ Info | Honest pre-deploy placeholders that STILL return `not_deployed` (never fabricate). Acceptable given empty registry (waiver #2) |

No `TODO`/`FIXME` that blocks the goal; no `return null`/empty-handler stubs; no fabricated numerics (anti-fishing grep clean, confirmed by live checkpoints). The two `Info` items are recorded post-deploy follow-ups, not gaps.

### Human Verification Required (recorded waivers — tracked follow-ups, NOT gaps)

1. **External MCP client handshake** (waiver #5) — point Claude Desktop/Cursor at `https://<preview>/api/mcp/mcp` post-deploy; confirm tools callable. The scripted JSON-RPC round-trip in 04-LIVE-VERIFICATION is the CI/local proxy and is APPROVED.
2. **Live pool/instrument values** (waiver #2, AGENT-06/07-pool) — when the first Abrigo contract deploys, verify real reserves vs a block explorer; `status` flips `not_deployed`→`live`.
3. **HuggingFace panel rows** (waiver #3, AGENT-07) — confirm `HF_PANEL_DATASET` against `huggingface.co/wvs-finance`, wire `/rows` paging, verify; `status` flips `unavailable`→`ok`.

### Gaps Summary

**No gaps.** All 10 AGENT requirements are satisfied in committed code and confirmed against the two APPROVED live checkpoints. Test ground-truth: all 9 phase-4 test files pass (48/48), including the REAL-SDK `validateToolOutput` round-trip (the union-outputSchema NEW-BLOCKER is dead) and the B3 OpenAPI-conformance anti-drift gate.

The phase goal — discover/connect/query via live MCP + OpenAPI 3.1 + JSON-LD with **no duplication** — is achieved:
- **No duplication:** tools import the Phase-3 lib directly (zero internal `/api/` fetch); a single `extendZodWithOpenApi(z)` call site feeds both the live routes and the generated OpenAPI; the contract re-exports never re-declare; JSON-LD reuses the dashboard's single `aggregateAllChains()` result.
- **Honest empties:** `not_deployed` / `unavailable` envelopes with null fields, no fabricated numerics (CROSS-09), live-confirmed.
- **`disableSse:true`:** SSE returns a clean Redis-free 404 (live-confirmed, 0 unhandledRejection).

The three remaining items are **recorded, non-silent waivers** (IA descope #1 already struck in ROADMAP/REQUIREMENTS; empty-registry #2; unpublished-dataset #3; dashboard-only JSON-LD #4; external-client manual #5). Given those waivers, the goal is **MET**; the residuals are tracked post-deploy follow-ups, not under-delivery.

---

_Verified: 2026-05-29T23:35:00Z_
_Verifier: Claude (gsd-verifier)_
