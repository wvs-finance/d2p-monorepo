---
phase: 04-agent-surface-mcp
plan: 01
subsystem: agent-surface
tags: [mcp, openapi, zod, contract, wave-0]
requires:
  - "lib/dashboard/contract.ts (version:1 envelopes — promoted to Zod)"
  - "lib/dashboard/aggregator.ts, lib/status/health.ts (shapes)"
  - "@modelcontextprotocol/sdk@1.29.0, mcp-handler@1.1.0 (installed)"
provides:
  - "lib/dashboard/contract.ts — Zod-first canonical REST schemas + single extendZodWithOpenApi(z) call site"
  - "lib/mcp-tools/contract.ts — tool-only envelopes + dateToIso; re-exports canonical schemas (B3 no-duplication)"
  - "Wave-0 test scaffolds: tests/api/{mcp,openapi,openapi-conformance,mcp-real-sdk}.test.ts, tests/architecture/mcp-no-duplication.test.ts"
  - "@asteasolutions/zod-to-openapi@7.3.4 + js-yaml pins"
affects:
  - "Plan 02 (get_iteration_state — un-skips mcp-real-sdk + mcp tests)"
  - "Plan 04 (lib/openapi/* imports canonical schemas — un-skips openapi.test)"
  - "Plan 05 (route wiring + barrel — un-skips mcp/architecture/e2e tests)"
tech-stack:
  added:
    - "@asteasolutions/zod-to-openapi@7.3.4 (exact pin, Zod v3 compatible)"
    - "js-yaml@^4.1.1 + @types/js-yaml@^4.0.9"
  patterns:
    - "Zod-first single source of truth: schemas at natural home (dashboard/contract.ts), z.infer replaces hand-written interfaces, downstream re-exports never re-declare"
    - "extendZodWithOpenApi(z) called exactly once; architecture test enforces single-extend"
    - "Date boundary normalizer dateToIso at the tool wire boundary (B1)"
    - "vitest test.skip as red-pending scaffold (vitest has no test.fixme)"
key-files:
  created:
    - "lib/mcp-tools/contract.ts"
    - "tests/unit/mcp-tools-contract.test.ts"
    - "tests/api/mcp.test.ts"
    - "tests/api/openapi.test.ts"
    - "tests/api/openapi-conformance.test.ts"
    - "tests/api/mcp-real-sdk.test.ts"
    - "tests/architecture/mcp-no-duplication.test.ts"
  modified:
    - "lib/dashboard/contract.ts (interfaces → Zod schemas + z.infer)"
    - "package.json + pnpm-lock.yaml (pins)"
    - "tests/e2e/agent-stubs.spec.ts (SSE fixme re-pointed to streamable-http)"
decisions:
  - "zod-to-openapi pinned to EXACT 7.3.4 (no caret) — v8 requires Zod v4 and breaks extendZodWithOpenApi at runtime"
  - "lib/dashboard/contract.ts is the single Zod source of truth (B3); lib/mcp-tools/contract.ts re-exports, never re-declares"
  - "vitest scaffolds use test.skip (not test.fixme — that API is Playwright-only); only the e2e .spec.ts keeps test.fixme"
metrics:
  duration_min: 22
  completed: 2026-05-29
---

# Phase 4 Plan 01: Agent-Surface Foundation Summary

One-liner: Pinned zod-to-openapi@7.3.4 with a runtime smoke, promoted `lib/dashboard/contract.ts` to the single Zod-first source of truth (hand-written `DashboardResponse`/`StatusResponse` interfaces deleted, replaced by `z.infer`; `extendZodWithOpenApi(z)` called exactly once), added tool-only envelopes in `lib/mcp-tools/contract.ts` that re-export the canonical schemas, and laid six Wave-0 test scaffolds including a LIVE B3 contract-conformance proof and a real-SDK `get_iteration_state` round-trip guard.

## What Was Built

### Task 1 — OpenAPI + YAML pins + runtime smoke (`aa28bdc`)
- `@asteasolutions/zod-to-openapi` exact `7.3.4` (no caret; `openapi3-ts@^4.1.2` arrived as peer dep), `js-yaml@^4.1.1`, `@types/js-yaml@^4.0.9`.
- Verified BOTH version pin AND runtime smoke: `extendZodWithOpenApi(z); z.string().openapi({})` runs without throwing, `js-yaml` importable — exits 0.

### Task 2 — Zod-first canonical contract (B3) + tool envelopes (`6e2f0f4`)
- `lib/dashboard/contract.ts`: now the SOLE `extendZodWithOpenApi(z)` call site. Exports `DashboardResponseSchema`, `StatusResponseSchema`, `ChainAggregationResultSchema`, `ChainHealthSchema`, `InstrumentStateSchema`, `HealthResponseSchema` (all with `.openapi()` annotations) plus `type DashboardResponse = z.infer<...>` and `type StatusResponse = z.infer<...>`. The hand-written interfaces were DELETED; the two REST routes keep their `import type { … }` and still compile (inferred types are structurally identical — zero body changes).
- `lib/mcp-tools/contract.ts`: re-exports the canonical schemas/types (no re-declaration, no second extend), adds `dateToIso` boundary helper (B1) and the tool-only envelopes: `NotDeployedEnvelope` (terms/pool are `z.null()` literals — anti-fishing), `UnavailableEnvelope`, `AppEntryOut` (mirrors registry `description_key`, NO fabricated `description`), `ResearchEntryOut` / `IterationDetailOut` (NO econometric-exercise fields — IA-correction-honest; `date` is an ISO string).
- `tests/unit/mcp-tools-contract.test.ts`: 15 tests covering every `<behavior>` bullet, including the re-export referential-identity check (`mcp-tools.DashboardResponseSchema === dashboard/contract.DashboardResponseSchema`), the date round-trip via a real `new Date(...)`, raw-Date rejection, and AppEntryOut no-`description`.

### Task 3 — Six Wave-0 scaffolds + SSE fixme re-point (`3d27372`)
- `tests/api/mcp.test.ts` (skip): JSON-RPC initialize / tools-list (all six names) / SSE-404.
- `tests/api/openapi.test.ts` (skip): `generateOpenApiYaml()` 3.1.0 + four paths (Plan 04).
- `tests/api/openapi-conformance.test.ts` (LIVE, passes now): B3 single-source proof — `/api/dashboard` + `/api/status` responses round-trip through the canonical re-exported Zod schemas.
- `tests/api/mcp-real-sdk.test.ts` (skip): REAL `McpServer.registerTool` + `Client.callTool` round-trip for `get_iteration_state` (found + not_found) over `InMemoryTransport` — guards the union-outputSchema blocker (Plan 02).
- `tests/architecture/mcp-no-duplication.test.ts` (LIVE + one skip): asserts `extendZodWithOpenApi(` appears in exactly one file (dashboard/contract.ts), no internal `/api/` fetch in tool handlers, no re-declared `const DashboardResponseSchema =` in mcp-tools/contract.ts; barrel-export check skipped (Plan 05).
- `tests/e2e/agent-stubs.spec.ts`: SSE `test.fixme` replaced with two re-pointed fixmes — `/api/mcp/mcp` streamable-http handshake (not 404) and `/api/mcp/sse` returns 404 (disableSse, no Redis). "provision/mock Redis" wording removed.

## Verification Results
- `pnpm test:quick`: PASS — 26 passed + 3 skipped files, 153 passed + 7 skipped tests.
- `pnpm exec tsc --noEmit`: exits 0 (routes re-pointed to inferred types still compile).
- Version+runtime smoke: prints `ok` (installed `@asteasolutions/zod-to-openapi` = `7.3.4`).
- The 7 skipped tests are the Wave-0 scaffolds awaiting Plans 02/04/05 — intentionally red-pending per the plan.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] vitest has no `test.fixme` — used `test.skip` instead**
- **Found during:** Task 3 (tsc failed: `Property 'fixme' does not exist on type 'TestAPI'`).
- **Issue:** The plan instructs `test.fixme(...)` for the vitest scaffolds, but `.fixme` is a Playwright-only API; vitest's `test`/`it` have no `.fixme`.
- **Fix:** Used `test.skip(...)` (vitest's red-pending equivalent) for the four vitest scaffolds; kept `test.fixme(...)` in the Playwright `.spec.ts` (valid there). All required assertion strings and behaviors are preserved; downstream plans un-skip rather than un-fixme.
- **Files modified:** tests/api/mcp.test.ts, tests/api/openapi.test.ts, tests/api/mcp-real-sdk.test.ts, tests/architecture/mcp-no-duplication.test.ts.
- **Commit:** 3d27372

**2. [Rule 3 - Blocking] tsc cannot statically resolve not-yet-created modules in dynamic imports**
- **Found during:** Task 3 (`Cannot find module '@/lib/openapi/generate' / '@/lib/mcp-tools/get-iteration-state' / '@/lib/mcp-tools/index'`).
- **Issue:** Even inside skipped test bodies, tsc statically resolves literal `import('@/...')` paths, so referencing Plan-02/04/05 modules broke the build.
- **Fix:** Hoisted the module specifier into a `const X_MODULE = '@/...'` string variable and `await import(X_MODULE)` with a typed cast — tsc cannot statically resolve a variable specifier, so the build passes while the runtime path is exact for downstream un-skip.
- **Files modified:** tests/api/openapi.test.ts, tests/api/mcp-real-sdk.test.ts, tests/architecture/mcp-no-duplication.test.ts.
- **Commit:** 3d27372

**3. [Rule 3 - Blocking] `matches[0]` possibly-undefined under noUncheckedIndexedAccess**
- **Found during:** Task 3 (tsc TS2532).
- **Fix:** Optional-chained `matches[0]?.endsWith(...)`.
- **Commit:** 3d27372

### Process note (not a code deviation)
The repo's lefthook pre-commit performs partial-stage stashing; committing while a file was in an `AM` (staged + further-modified-in-worktree) state silently aborted after printing the hook summary. Resolved by ensuring `index == worktree` (full re-stage) before each commit. No `--no-verify` was used; every commit passed biome + tsc + commitlint. One commit subject was also reworded from `Zod-first` to `zod-first` to satisfy commitlint's `subject-case` rule.

## Live-Verification Note (CLAUDE.md gate)
Per CLAUDE.md "When to skip": this plan is type-only / config / test-scaffold work with NO rendered user-visible route and NO wired endpoint (the MCP route is still the empty stub until Plan 05). The Evidence Collector live-DOM gate is therefore SKIPPED for 04-01. The B3 contract-conformance test runs the live `/api/dashboard` + `/api/status` handlers in-process as the ground-truth check appropriate to this layer. Endpoint/handshake live verification is owned by Plans 02–05 when the MCP route and OpenAPI route are actually wired.

## Self-Check: PASSED
- All 8 created/modified files present on disk.
- All 3 commits (aa28bdc, 6e2f0f4, 3d27372) present in git history.
