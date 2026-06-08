---
phase: "06"
plan: "00"
subsystem: somnia-data-layer
tags: [somnia, defi, data-layer, bigint, provenance, tdd, rpc]
dependency_graph:
  requires: []
  provides:
    - lib/apps/abrigo/somnia/deployments.json
    - lib/apps/abrigo/somnia/snapshot.json
    - lib/apps/abrigo/somnia/chain.ts
    - lib/apps/abrigo/somnia/abi.ts
    - lib/apps/abrigo/somnia/types.ts
    - lib/apps/abrigo/somnia/reader.ts
    - lib/apps/abrigo/somnia/surprise.ts
    - lib/apps/abrigo/somnia/capture-snapshot.ts
    - components/defi/ProvenanceBadge.tsx (testnet-agent tier)
    - tests/unit/somnia-*.test.ts* (7 stubs)
  affects:
    - lib/env.ts
    - tsconfig.json
    - package.json
tech_stack:
  added:
    - viem defineChain + createPublicClient (somniaClient, chain 50312)
    - BigInt-as-string JSON serialization pattern (snapshot.json)
  patterns:
    - Static JSON import + explicit BigInt/Date rehydration at boundary (Turbopack-safe)
    - Lazy process.env read inside function body (never at module scope)
    - Indirected dynamic import for not-yet-created modules in test stubs
    - tsconfig exclude + downstream plan removes (Wave-0 RED stub pattern)
key_files:
  created:
    - lib/apps/abrigo/somnia/deployments.json
    - lib/apps/abrigo/somnia/snapshot.json
    - lib/apps/abrigo/somnia/chain.ts
    - lib/apps/abrigo/somnia/abi.ts
    - lib/apps/abrigo/somnia/types.ts
    - lib/apps/abrigo/somnia/reader.ts
    - lib/apps/abrigo/somnia/surprise.ts
    - lib/apps/abrigo/somnia/capture-snapshot.ts
    - tests/unit/somnia-reader.test.ts
    - tests/unit/somnia-surprise.test.ts
    - tests/unit/somnia-provenance-testnet-agent.test.tsx
    - tests/unit/somnia-macro-panel.test.tsx
    - tests/unit/somnia-decision-feed.test.tsx
    - tests/unit/somnia-mcp-tools.test.ts
    - tests/unit/somnia-bridge.test.tsx
  modified:
    - components/defi/ProvenanceBadge.tsx
    - lib/env.ts
    - tsconfig.json
    - package.json
decisions:
  - "snapshot.json uses captureMethod: rpc — real tx hashes captured from Somnia testnet 50312 via live RPC"
  - "HEDGE_ACTION enum decoded from string labels in snapshot (not uint8) since snapshot stores human-readable strings"
  - "observedAt omitted from MacroPrintView per B3 — contract hard-sets it 0 by design"
  - "testnet-agent tier uses identical neutral className to schematic (text-text-muted ring-border-default bg-bg-surface)"
  - "7 test stubs all initially excluded from tsconfig; reader/surprise/provenance un-excluded in Task 2 commit when modules landed"
metrics:
  duration_min: 16
  completed_date: "2026-06-02T19:33:12Z"
  tasks: 3
  files_created: 19
  files_modified: 4
---

# Phase 06 Plan 00: Somnia Data Layer Summary

**One-liner:** Somnia Wave-0 data layer — real-tx-sourced snapshot (chain 50312, RPC), BigInt-exact reader seam, verbatim Foundry ABI, and testnet-agent neutral provenance tier with live/recorded icon sub-state.

---

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 0 | 7 failing-first test stubs (RED, tsconfig-excluded) | 9c17fb7 | 7 test files + tsconfig.json |
| 1 | Real snapshot + deployments + chain/ABI/types/surprise | 57bdc13 | 9 files created, lib/env.ts + package.json modified |
| 2 | reader.ts seam + testnet-agent provenance tier | a68109d | reader.ts + ProvenanceBadge.tsx + tsconfig.json |

---

## Success Criteria Verification

- reader returns the two real recorded decisions (ADD_LONG_GAMMA/6800 + REDUCE/568) from snapshot: PASS (13 tests green)
- every on-chain integer (macroValue, consensus, sizeBps) is a string in snapshot.json and bigint in reader output: PASS (M5 one-liner + vitest)
- testnet-agent provenance tier is neutral (non-green) with live/recorded icon sub-state: PASS (9 tests green)
- Somnia chain 50312 is a SEPARATE defineChain + somniaClient; 5-chain union unchanged: PASS (git diff --exit-code lib/wagmi/config.ts)
- SOMNIA_LIVE is server-only; process.env read inside function bodies only: PASS
- 4 downstream RED stubs exist (skipped + excluded) ready for 06-01/02/03/04: PASS
- pnpm tsc --noEmit clean: PASS
- pnpm biome check all somnia/* and ProvenanceBadge.tsx: PASS
- snapshot carries both canonical tx hashes; all ints are strings: PASS (M5 one-liner)
- B3: no observedAt field in snapshot.json or MacroPrintView: PASS

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Reader needed string-to-label fallback for action field**
- **Found during:** Task 2 (first test run)
- **Issue:** snapshot.json stores action as string label ("ADD_LONG_GAMMA"), not uint8 numeric. `HEDGE_ACTION[Number("ADD_LONG_GAMMA")]` = `HEDGE_ACTION[NaN]` = undefined → threw "Unknown action label" error.
- **Fix:** Added `VALID_ACTIONS` set in reader.ts; rehydrateDecision checks string label first (snapshot path), falls back to `HEDGE_ACTION[N]` (live log-decode path).
- **Files modified:** lib/apps/abrigo/somnia/reader.ts
- **Commit:** a68109d

**2. [Rule 1 - Bug] MacroPrintView.dataKeyLabel literal type incompatible with JSON string**
- **Found during:** Task 2 (tsc --noEmit)
- **Issue:** `dataKeyLabel: 'co/inflation-rate'` (literal type) vs JSON-imported `string` type. TypeScript 5.9 + exactOptionalPropertyTypes rejected the assignment.
- **Fix:** Added `as 'co/inflation-rate'` cast at rehydration boundary in reader.ts.
- **Files modified:** lib/apps/abrigo/somnia/reader.ts
- **Commit:** a68109d

**3. [Rule 2 - Missing] Test stubs needed tsconfig exclusion for 3 GREEN stubs too**
- **Found during:** Task 0 commit (pre-commit tsc gate)
- **Issue:** reader.ts, surprise.ts, and ProvenanceBadge testnet-agent didn't exist at Task 0 commit time. tsc failed on module-not-found and type errors.
- **Fix:** Added reader/surprise/provenance stubs to tsconfig exclude at Task 0; removed them in Task 2 commit when modules landed. Applied indirected dynamic import pattern to reader + surprise tests.
- **Files modified:** tsconfig.json, somnia-reader.test.ts, somnia-surprise.test.ts
- **Commit:** 9c17fb7

---

## Live Verification Skip

This plan produces NO new user-visible route — all output is data layer (JSON, TypeScript modules) and test infrastructure. Live Evidence Collector verification is SKIPPED per CLAUDE.md "When to skip" (pure data layer / no rendered surface).

---

## Self-Check

**Checking files:**
- lib/apps/abrigo/somnia/deployments.json: FOUND
- lib/apps/abrigo/somnia/snapshot.json: FOUND
- lib/apps/abrigo/somnia/chain.ts: FOUND
- lib/apps/abrigo/somnia/abi.ts: FOUND
- lib/apps/abrigo/somnia/types.ts: FOUND
- lib/apps/abrigo/somnia/reader.ts: FOUND
- lib/apps/abrigo/somnia/surprise.ts: FOUND
- lib/apps/abrigo/somnia/capture-snapshot.ts: FOUND
- components/defi/ProvenanceBadge.tsx (testnet-agent): FOUND
- tests/unit/somnia-reader.test.ts: FOUND
- tests/unit/somnia-surprise.test.ts: FOUND
- tests/unit/somnia-provenance-testnet-agent.test.tsx: FOUND
- tests/unit/somnia-macro-panel.test.tsx: FOUND
- tests/unit/somnia-decision-feed.test.tsx: FOUND
- tests/unit/somnia-mcp-tools.test.ts: FOUND
- tests/unit/somnia-bridge.test.tsx: FOUND

**Checking commits:**
- 9c17fb7 (Task 0): FOUND
- 57bdc13 (Task 1): FOUND
- a68109d (Task 2): FOUND

**Test results:**
- somnia-reader: 13/13 PASS
- somnia-surprise: 5/5 PASS
- somnia-provenance-testnet-agent: 9/9 PASS
- tsc --noEmit: PASS
- biome check: PASS

## Self-Check: PASSED
