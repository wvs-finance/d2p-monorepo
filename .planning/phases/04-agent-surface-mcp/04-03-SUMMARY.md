---
phase: 04-agent-surface-mcp
plan: 03
subsystem: mcp-tools
tags: [mcp, agent-surface, on-chain, econometric-panel, anti-fishing]
requires:
  - "lib/apps/abrigo/instruments.ts (ABRIGO_INSTRUMENTS — empty registry)"
  - "lib/dashboard/aggregator.ts (aggregateAllChains)"
  - "lib/chains/serialize.ts (serializeBigints)"
  - "lib/mcp-tools/contract.ts (NotDeployedEnvelope, UnavailableEnvelope)"
provides:
  - "registerGetInstrumentTerms(server) — AGENT-06"
  - "registerGetPoolState(server) — AGENT-07-pool"
  - "registerQueryEconometricPanel(server) — AGENT-07"
affects:
  - "MCP route handler (will register these three tools)"
tech-stack:
  added: []
  patterns:
    - "not_deployed / unavailable honest envelopes (CROSS-09 anti-fishing)"
    - "outputSchema = single ZodObject + content[text] + structuredContent (M1)"
    - "guarded network probe (.catch → null) so handler never throws"
    - "fake-server test harness now applies inputSchema defaults (mirrors real SDK)"
key-files:
  created:
    - "lib/mcp-tools/get-instrument-terms.ts"
    - "lib/mcp-tools/get-pool-state.ts"
    - "lib/mcp-tools/query-econometric-panel.ts"
    - "tests/unit/mcp-tools-onchain-panel.test.ts"
  modified: []
decisions:
  - "Fake-server test harness parses raw input through the registered inputSchema so Zod .default('abrigo') resolves exactly as the real SDK applies it before the handler"
  - "get_instrument_terms keeps a future-deployment branch returning not_deployed (term-reading not wired) so the registry-found path is honest, not fabricated"
metrics:
  duration_min: 8
  completed: 2026-05-29
---

# Phase 04 Plan 03: On-Chain + Panel MCP Tools Summary

Three Wave-2 MCP tools (`get_instrument_terms`, `get_pool_state`, `query_econometric_panel`) implemented as direct lib imports (no BFF hop, AGENT-01), each returning honest `not_deployed` / `unavailable` structured envelopes against the empty Abrigo registry and unpublished HuggingFace panel — never fabricated terms, reserves, or rows (CROSS-09).

## What Was Built

### Task 1 — get_instrument_terms + get_pool_state (commit 868a197)
- `registerGetInstrumentTerms` (AGENT-06): looks up `ABRIGO_INSTRUMENTS` by id; the empty registry always yields a `not_deployed` envelope (`terms:null, pool:null`) that passes `NotDeployedEnvelope.parse`. No MCP error, no fabricated terms. A future-deployment branch is present (returns not_deployed with a "term-reading not wired" note) so a registered instrument is never silently zero-filled.
- `registerGetPoolState` (AGENT-07-pool): calls `aggregateAllChains()` (short-circuits to `status:'empty'` on the empty registry, before any RPC). Returns `not_deployed` (`pool:null`). `instrument_id` uses the simple `input.pool_address ?? 'unknown'` form (M4); the malformed `=== null ?` form is absent. `serializeBigints` is imported and wired into the future-deployment branch only — defensive, not exercised today.
- Both register `outputSchema: NotDeployedEnvelope` (single ZodObject) and return BOTH `content[text]` and `structuredContent` (M1). Neither uses `server.tool(`.

### Task 2 — query_econometric_panel (commit ae6785c)
- `registerQueryEconometricPanel` (AGENT-07): a guarded `/is-valid` probe (`fetch(...).catch(() => null)`) — the handler never throws on network failure. Today it always returns an `unavailable` envelope passing `UnavailableEnvelope.parse`.
- `filters` is `z.record(z.union([z.string(), z.number(), z.boolean()]))` (B4) — numeric/range and boolean filters are accepted, not just strings. `length` is capped at `.max(100)`.
- The dataset name is exactly ONE constant `HF_PANEL_DATASET = 'wvs-finance/abrigo-panel' // UNVERIFIED`. The `note` points only at the org (`huggingface.co/wvs-finance`) and never asserts the dataset path (the substring `abrigo-panel` does not appear in the note). The future `/rows` paging wiring (offset/length, Bearer HF_API_TOKEN, max 100/page, "confirm HF_PANEL_DATASET first") is documented as an in-code TODO mapped to the 04-VALIDATION manual follow-up.

### Test scaffold — tests/unit/mcp-tools-onchain-panel.test.ts
Wave-0 scaffold owned by this plan, now GREEN with real assertions (6 tests):
- not_deployed / unavailable envelopes parse against their Zod schemas; `JSON.parse(content[0].text)` deep-equals `structuredContent`; `isError` falsy.
- `instrument_id:'unknown'` substitution when no `pool_address`; `instrument_id:'0xabc'` when present.
- get_pool_state text does NOT match `/"poolBalance":"?\d/` (no fabricated reserves).
- query note does NOT contain `abrigo-panel`; string|number|boolean filters accepted; handler resolves through the guarded probe regardless of network (MSW intercepts the real fetch → `.catch` resolves it).
- The fake server was upgraded to apply the registered `inputSchema` (Zod `.default('abrigo')`) before invoking the handler, mirroring the real SDK so `app:'abrigo'` resolves deterministically.

## Verification

- `pnpm vitest run tests/unit/mcp-tools-onchain-panel.test.ts` → 6 passed.
- `pnpm test:quick` (biome + tsc + vitest) → 167 passed | 5 skipped (baseline was 161 pass / 5 skip; +6 from this plan's scaffold flipping skip→green). Other waves' scaffolds remain skipped.
- Acceptance greps: all must-contain strings present; forbidden substrings absent (`=== null ?`, `server.tool(`, `abrigo-panel` in note).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Biome import-sort in get-pool-state.ts**
- **Found during:** Task 1 (test:quick gate)
- **Issue:** `@/lib/dashboard/aggregator` imported before `@/lib/chains/serialize`; biome organizeImports failed the gate.
- **Fix:** Reordered to alphabetical (`serialize` before `aggregator`).
- **Files modified:** lib/mcp-tools/get-pool-state.ts
- **Commit:** 868a197

**2. [Rule 3 - Blocking] Fake-server did not apply inputSchema defaults**
- **Found during:** Task 2 (query tests)
- **Issue:** The capture-the-callback fake server invoked handlers with raw input, so `app: z.string().default('abrigo')` was never applied and `input.app` was `undefined` → ZodError on `UnavailableEnvelope.parse`. The plan's `<behavior>` requires `{ panel:'pair-d' }` to yield `app:'abrigo'`.
- **Fix:** The fake server now parses raw input through the registered `inputSchema` before calling the handler, mirroring real SDK behavior. This is a test-harness-only change; it makes all default-bearing tools deterministic without weakening the output-envelope assertions.
- **Files modified:** tests/unit/mcp-tools-onchain-panel.test.ts
- **Commit:** ae6785c

### Scaffold note
The plan said "un-skip the Wave-0 scaffold this plan owns," but `tests/unit/mcp-tools-onchain-panel.test.ts` did not exist on disk (no skipped stub was present). Per the plan's `<action>` ("Write `tests/unit/mcp-tools-onchain-panel.test.ts`"), the file was created fresh with real assertions. Net effect matches intent: this plan's on-chain/panel tests are GREEN; other waves' scaffolds stay skipped.

## Live Verification

Skipped per project CLAUDE.md ("When to skip" — MCP tools have no rendered route). These three tools are an agent/API surface, not a browser surface; ground truth is the SDK output contract, verified by the unit suite (envelope shape, structuredContent parity, anti-fishing absence of fabricated numerics). The real-SDK validateToolOutput guard is exercised by the existing real-SDK suite once the route registers these tools (a later plan).

## Self-Check: PASSED
- lib/mcp-tools/get-instrument-terms.ts — FOUND
- lib/mcp-tools/get-pool-state.ts — FOUND
- lib/mcp-tools/query-econometric-panel.ts — FOUND
- tests/unit/mcp-tools-onchain-panel.test.ts — FOUND
- commit 868a197 — FOUND
- commit ae6785c — FOUND
