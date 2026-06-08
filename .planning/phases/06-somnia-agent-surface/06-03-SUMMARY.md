---
phase: "06"
plan: "03"
subsystem: mcp-tools-somnia
tags: [somnia, mcp, agent-first, bigint, zod, conformance, tdd]
dependency_graph:
  requires:
    - lib/apps/abrigo/somnia/reader.ts
    - lib/apps/abrigo/somnia/surprise.ts
    - lib/mcp-tools/contract.ts (HedgeDecisionsEnvelope + LatestMacroPrintEnvelope)
  provides:
    - lib/mcp-tools/get-hedge-decisions.ts
    - lib/mcp-tools/get-latest-macro-print.ts
    - tests/api/somnia-mcp-conformance.test.ts
  affects:
    - lib/mcp-tools/index.ts
    - app/api/mcp/[transport]/route.ts
    - tests/unit/somnia-mcp-tools.test.ts
    - tsconfig.json
tech_stack:
  added: []
  patterns:
    - Single wrapping ZodObject outputSchema (normalizeObjectSchema blocker guard)
    - Dual return content[text]+structuredContent per MCP SDK contract
    - BigInt-to-string serialization at tool boundary (reader returns bigint)
    - Real McpServer+Client+InMemoryTransport conformance test pattern
    - Operator-supplied consensus caveat in every decision item (M4)
key_files:
  created:
    - lib/mcp-tools/get-hedge-decisions.ts
    - lib/mcp-tools/get-latest-macro-print.ts
    - tests/api/somnia-mcp-conformance.test.ts
  modified:
    - lib/mcp-tools/contract.ts
    - lib/mcp-tools/index.ts
    - app/api/mcp/[transport]/route.ts
    - tests/unit/somnia-mcp-tools.test.ts
    - tsconfig.json
decisions:
  - "HedgeDecisionsEnvelope + LatestMacroPrintEnvelope were pre-authored in contract.ts by Wave-0; no re-declaration needed"
  - "M4 comments reworded to avoid the literal string 'consensus-verified' (grep -ric returns 0 across all 3 mcp-tools files)"
  - "Non-CPI dataKey falls back to honest co/inflation-rate snapshot — never fabricates capacity-utilization or other unwired keys"
  - "surpriseFormatted uses formatSurprise(computeSurprise(macroValue, consensus), 2) from surprise.ts — sign preserved (+0.68/-3.32)"
metrics:
  duration_min: 5
  completed_date: "2026-06-02T19:58:54Z"
  tasks: 2
  files_created: 3
  files_modified: 5
---

# Phase 06 Plan 03: Somnia MCP Tools (Component C) Summary

**One-liner:** Agent-first MCP tools get_hedge_decisions + get_latest_macro_print — single ZodObject envelopes, dual content+structuredContent return, BigInt-as-string serialization, operator-supplied consensus caveat, real-SDK conformance guard.

---

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | New envelopes in contract.ts + two tool modules (single ZodObject, dual return, bigint→string) | 4e5aca8 | contract.ts, get-hedge-decisions.ts (new), get-latest-macro-print.ts (new), somnia-mcp-tools.test.ts, tsconfig.json |
| 2 | Register both tools (barrel + route) + real-SDK conformance test | f6fec7d | index.ts, route.ts, somnia-mcp-conformance.test.ts (new) |

---

## Success Criteria Verification

- get_hedge_decisions returns wrapping HedgeDecisionsEnvelope ZodObject with decisions array: PASS (13 unit + 4 conformance tests)
- get_latest_macro_print returns LatestMacroPrintEnvelope with scaledValue "568": PASS
- Both tools: outputSchema.shape defined (ZodObject guard for normalizeObjectSchema): PASS
- BigInt values serialized as strings (sizeBps "6800", macroValue "568", etc.): PASS
- consensusNote = operator-supplied POC input caveat on every decision item: PASS
- surpriseFormatted sign-preserved: ADD_LONG_GAMMA "+0.68", REDUCE "-3.32": PASS
- scale = 2 on every decision item: PASS
- Dual return: content[{type:'text', text: JSON.stringify(...)}] AND structuredContent: PASS (both unit + conformance)
- content[0].text deep-equals structuredContent (parity): PASS
- M4: grep -ric "consensus-verified" across all 3 mcp-tools files = 0: PASS
- Non-CPI dataKey returns honest co/inflation-rate, never fabricates: PASS
- Both tools registered in index.ts barrel: PASS
- Both tools registered in app/api/mcp/[transport]/route.ts: PASS
- somnia-mcp-tools.test.ts removed from tsconfig exclude: PASS (grep -c = 0)
- pnpm vitest run unit + conformance + mcp-real-sdk: 19/19 PASS
- pnpm tsc --noEmit: CLEAN
- pnpm biome check: CLEAN

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] M4 literal string 'consensus-verified' in comment text matched the grep**
- **Found during:** Task 1 acceptance criteria check
- **Issue:** Comments saying "NEVER claim 'consensus-verified'" contained the literal string "consensus-verified", causing grep -ric to return non-zero counts (6 across the 3 files)
- **Fix:** Reworded all comments to use "never asserts external consensus validation" / "do NOT assert that consensus was externally validated" — preserving the prohibition intent without triggering the grep
- **Files modified:** lib/mcp-tools/contract.ts, lib/mcp-tools/get-hedge-decisions.ts, lib/mcp-tools/get-latest-macro-print.ts
- **Commit:** 4e5aca8

**2. [Rule 1 - Bug] TypeScript exactOptionalPropertyTypes error in test's fakeServer type**
- **Found during:** Task 1 tsc --noEmit
- **Issue:** `{ outputSchema?: ZodLike }` with `exactOptionalPropertyTypes: true` rejected assigning `ZodLike | undefined` from `cfg.outputSchema`; TS2379 error
- **Fix:** Changed Map value type to `{ outputSchema: ZodLike | undefined }` (explicit union, not optional)
- **Files modified:** tests/unit/somnia-mcp-tools.test.ts
- **Commit:** 4e5aca8

**3. [Rule 1 - Bug] Biome formatting: multi-line describe()/test() and multi-line import in test file**
- **Found during:** Task 1 and Task 2 biome check
- **Issue:** Biome formatted multi-line `describe(`, `test(` calls to single-line; multi-line `import { HedgeDecisionsEnvelope, LatestMacroPrintEnvelope }` to single-line
- **Fix:** Applied biome format --write on the conformance test; manually inlined the import in the unit test
- **Files modified:** tests/unit/somnia-mcp-tools.test.ts, tests/api/somnia-mcp-conformance.test.ts
- **Commit:** 4e5aca8 + f6fec7d

---

## Pre-existing envelopes in contract.ts

The Wave-0 plan (06-00) pre-authored `HedgeDecisionsEnvelope` and `LatestMacroPrintEnvelope` in `lib/mcp-tools/contract.ts`. This plan consumed them directly — no re-declaration was needed. All M4 comment text was also already in place from Wave-0; only the literal string grep issue required the reword.

---

## Live Verification Skip

This plan exposes JSON-RPC endpoints, not a rendered route. Per CLAUDE.md "When to skip" — MCP tools have no rendered surface. Live Evidence Collector `browser_snapshot` is SKIPPED. Verification is via the in-memory conformance round-trip (real McpServer+Client+InMemoryTransport) which exercises the actual `validateToolOutput` path and would fail loudly on a non-ZodObject outputSchema.

---

## Self-Check

**Checking files:**
- lib/mcp-tools/get-hedge-decisions.ts: FOUND
- lib/mcp-tools/get-latest-macro-print.ts: FOUND
- tests/api/somnia-mcp-conformance.test.ts: FOUND
- lib/mcp-tools/index.ts (modified): FOUND
- app/api/mcp/[transport]/route.ts (modified): FOUND
- tests/unit/somnia-mcp-tools.test.ts (modified, un-skipped): FOUND
- tsconfig.json (modified, exclude removed): FOUND

**Checking commits:**
- 4e5aca8 (Task 1): FOUND
- f6fec7d (Task 2): FOUND

**Test results:**
- somnia-mcp-tools unit: 13/13 PASS
- somnia-mcp-conformance: 4/4 PASS (real-SDK round-trip)
- mcp-real-sdk (existing): 2/2 PASS (not regressed)
- tsc --noEmit: CLEAN
- biome check: CLEAN

## Self-Check: PASSED
