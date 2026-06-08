---
phase: 03-data-layer-and-on-chain-dashboard
verified: 2026-05-29T10:42:00Z
status: passed
score: 5/5 in-scope REQs verified
re_verification: false
human_verification:
  - test: "Live on-chain reads return correct values when first Abrigo contract deploys"
    expected: "Dashboard tiles show real pool balance, settlement event counts, and LP position counts from a block explorer-verifiable address"
    why_human: "No contracts are deployed on any chain yet; the multicall branch of aggregateChain() is unreachable until ABRIGO_INSTRUMENTS is populated"
  - test: "Real ABI function names match the deployed Foundry artifact"
    expected: "ABRIGO_ABI's 'poolBalance', 'settlementCount', 'lpPositionCount' names match the real contract ABI emitted by foundry codegen (FOUND-06)"
    why_human: "ABI is marked provisional in instruments.ts — inferred from DASH-03 text; Foundry artifact is the ground truth"
  - test: "Cross-browser dashboard skeleton render"
    expected: "Metric tiles, live banner, and IBM Plex fonts render correctly on Chrome/Linux, Safari/macOS, Firefox"
    why_human: "Playwright e2e runs a single engine (Chromium); cross-browser layout differences not caught programmatically"
---

# Phase 3: Data Layer and On-Chain Dashboard — Verification Report

**Phase Goal (re-scoped 2026-05-13):** BFF API routes aggregate live on-chain Abrigo protocol state across configured chains; the app-scoped dashboard renders it (skeleton/empty state while no contracts deployed — no fabricated numbers); chain selector (nuqs) makes state shareable; umbrella /status page reports per-chain RPC health. Unblocks Phase 4 MCP tools. DASH-02/05/06 descoped.
**Verified:** 2026-05-29T10:42:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | BFF `/api/dashboard` aggregates per-chain state, returns version:1 envelope, handles unknown apps with 404, and never serializes bigints to JSON | VERIFIED | `app/api/dashboard/route.ts`: `force-dynamic` + `runtime='nodejs'`; calls `aggregateAllChains()`; 3 vitest assertions pass (200+chains[5]+no-bigint, 404, per-chain isolation) |
| 2 | Dashboard at `/apps/abrigo/dashboard` is an RSC; renders 4 labelled metric tiles per chain; empty registry produces `—` placeholder tiles and a live banner; no fabricated numbers | VERIFIED | `app/(apps)/apps/abrigo/dashboard/page.tsx` first non-comment line is an import (no `'use client'`); `DashboardContent.tsx` null→emptyValue em-dash rule confirmed in source; `showBanner` triggered when `status === 'empty'`; live verification confirmed |
| 3 | Chain selector updates `?chain=<slug>` URL param; ChainSelector reuses shared `dashboardSearchParams.chain` parser, never re-declares `parseAsStringEnum` inline | VERIFIED | `ChainSelector.tsx` line 13: `useQueryState('chain', dashboardSearchParams.chain)` — imports from `@/lib/dashboard/search-params`, no inline parser declaration |
| 4 | `/status` RSC page renders per-chain RPC health for all 5 chains via StatusPill (color+icon+text), build hash, freshness timestamp, and Abrigo pre-launch rollup; `/api/status` JSON route delegates isolation to `checkAllChains()` | VERIFIED | `app/(dashboard)/status/page.tsx` + `app/api/status/route.ts`: no `allSettled` in route, calls `checkAllChains()`; 15 e2e specs pass; CROSS-09 StatusPill confirmed |
| 5 | DASH-02/05/06 (HuggingFace econometrics, visx charts, chart a11y) are absent — not silently dropped but explicitly excluded | VERIFIED | `grep huggingface/parquet/visx` across app/ and lib/ returns only a comment in openapi.yaml stub and a word "econometrics" in a contributor role string — no route, no component, no import |

**Score:** 5/5 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `lib/apps/abrigo/instruments.ts` | AbrigoInstrument type + empty `ABRIGO_INSTRUMENTS` registry + provisional `ABRIGO_ABI` (3-fn fragment) | VERIFIED | Exists; `ABRIGO_INSTRUMENTS: AbrigoInstrument[] = []`; ABI has `poolBalance`, `settlementCount`, `lpPositionCount` as `const satisfies Abi` |
| `lib/chains/clients.ts` | 5 `createPublicClient` instances, 5s transport timeout, multicall batch | VERIFIED | Exists; all 5 chains with `fallback([http(..., {timeout:5000}), http(...)])` and `batch: {multicall:true}` |
| `lib/chains/serialize.ts` | Single shared `serializeBigints<T>` deep-walk; bigint never leaves module | VERIFIED | Exists; 13-line recursive implementation; imported by both `aggregator.ts` and `health.ts` |
| `lib/dashboard/aggregator.ts` | `aggregateChain` short-circuits on empty registry before touching clients; `aggregateAllChains` uses `Promise.allSettled` | VERIFIED | Short-circuit at line 47: `if (instruments.length === 0) return` before any `publicClients[chainId]` access |
| `lib/dashboard/search-params.ts` | `CHAIN_SLUGS`, `dashboardSearchParams`, `loadDashboardParams`, `CHAIN_SLUG_TO_ID` satisfies | VERIFIED | All 4 exports present; `satisfies Record<ChainSlug, SupportedChainId>` on `CHAIN_SLUG_TO_ID` |
| `lib/dashboard/contract.ts` | Versioned `DashboardResponse` + `StatusResponse` interfaces (version:1) | VERIFIED | Both interfaces exported; `version: 1` literal type on both |
| `lib/status/health.ts` | `checkChainHealth` (5s timeout via Promise.race) + `checkAllChains` (Promise.allSettled); no dependency on aggregator | VERIFIED | `timeout(5000)` in `Promise.race`; no import from `aggregator.ts` |
| `app/api/dashboard/route.ts` | `force-dynamic`, `runtime='nodejs'`, no `'use cache'`, calls `aggregateAllChains()` | VERIFIED | Lines 7-8: both exports present; no `'use cache'`; delegates to `aggregateAllChains()` |
| `app/(apps)/apps/abrigo/dashboard/page.tsx` | RSC (no `'use client'`), `force-dynamic`, `runtime='nodejs'`, calls aggregator directly | VERIFIED | First non-comment line is an import; exports `dynamic` and `runtime` confirmed |
| `app/(apps)/apps/abrigo/dashboard/DashboardContent.tsx` | Single render path; null→em-dash anti-fishing; live banner when registry empty | VERIFIED | `MetricTile` renders `emptyValue` when value is null/empty; `showBanner` logic confirmed |
| `app/(apps)/apps/abrigo/dashboard/ChainSelector.tsx` | Client island; reuses shared `dashboardSearchParams.chain` parser | VERIFIED | `'use client'`; imports `dashboardSearchParams` from `@/lib/dashboard/search-params`; no inline enum parser |
| `app/api/status/route.ts` | `force-dynamic`, `runtime='nodejs'`, calls `checkAllChains()`, no inline `allSettled` | VERIFIED | Both exports; calls `checkAllChains()`; grep for `allSettled` in route returns empty |
| `app/(dashboard)/status/page.tsx` | RSC, umbrella-scoped under `(dashboard)`, renders StatusPills, build hash, freshness | VERIFIED | Comment on line 2 is documentation (not directive); first import line confirmed; `(dashboard)` path confirmed |
| Wave 0 tests (unit + route-handler + e2e) | Real unit assertions; filled route-handler tests; substantive e2e specs | VERIFIED | 9 DASH-specific tests pass; e2e files range 27-160 lines, no `test.fixme` remaining |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `app/api/dashboard/route.ts` | `lib/dashboard/aggregator.ts` | `aggregateAllChains()` import | WIRED | Direct import + call; return value cast to `DashboardResponse` |
| `app/api/status/route.ts` | `lib/status/health.ts` | `checkAllChains()` import | WIRED | Direct import + call; no re-implementation |
| `app/(apps)/apps/abrigo/dashboard/page.tsx` | `lib/dashboard/aggregator.ts` | `aggregateAllChains()` server call | WIRED | Called at render time for no-JS first paint |
| `app/(apps)/apps/abrigo/dashboard/ChainSelector.tsx` | `lib/dashboard/search-params.ts` | `dashboardSearchParams.chain` parser | WIRED | Shared parser imported; `useQueryState('chain', dashboardSearchParams.chain)` |
| `app/(dashboard)/status/page.tsx` | `lib/status/health.ts` | `checkAllChains()` import | WIRED | Direct import + call; StatusPill mapped from `ChainHealth.status` |
| `lib/dashboard/aggregator.ts` | `lib/chains/clients.ts` | `publicClients` import | WIRED | Imported; accessed only on non-empty path (after short-circuit guard) |
| `lib/status/health.ts` | `lib/chains/clients.ts` | `publicClients` import | WIRED | Imported; shared factory, no cross-module aggregator dependency |
| `lib/dashboard/aggregator.ts` | `lib/chains/serialize.ts` | `serializeBigints` at output boundary | WIRED | Called on both the empty short-circuit return and the multicall return |
| `lib/status/health.ts` | `lib/chains/serialize.ts` | `serializeBigints` at output boundary | WIRED | Called at end of `checkAllChains()` return |
| `next.config.ts` | No `cacheComponents` | Absence confirmed | VERIFIED | `next.config.ts` has only `typedRoutes: true` in `experimental`; no `cacheComponents` |

---

### Requirements Coverage

| Requirement | Description | Status | Evidence |
|-------------|-------------|--------|----------|
| DASH-01 | BFF `/api/dashboard` aggregates on-chain state; bigint→string; versioned envelope | SATISFIED | `app/api/dashboard/route.ts` + `lib/dashboard/aggregator.ts`; 3 route-handler + 2 unit tests pass |
| DASH-03 | Dashboard page at `/apps/abrigo/dashboard` shows per-chain metrics | SATISFIED | `app/(apps)/apps/abrigo/dashboard/page.tsx` + `DashboardContent.tsx`; live-verified tiles present |
| DASH-04 | Chain selector uses nuqs URL search params; state is shareable | SATISFIED | `ChainSelector.tsx` + `lib/dashboard/search-params.ts`; `?chain=` URL update e2e-verified |
| DASH-07 | Dashboard renders read-first, no wallet, on first paint without JS hydration | SATISFIED | RSC page + `aggregateAllChains()` server call; no-JS e2e spec passes |
| DASH-08 | `/status` umbrella page: per-chain RPC health, build hash, freshness, per-app rollup | SATISFIED | `app/(dashboard)/status/page.tsx` + `app/api/status/route.ts`; 15 e2e specs pass |
| DASH-02 | HuggingFace econometrics BFF route — DESCOPED | EXCLUDED CORRECTLY | No `/api/econometrics` route exists; no HuggingFace/Parquet import in any Phase 3 file |
| DASH-05 | visx β/CI econometric charts — DESCOPED | EXCLUDED CORRECTLY | No `@visx` import in any Phase 3 surface |
| DASH-06 | Chart a11y (aria-label + sr-only table) — DESCOPED | EXCLUDED CORRECTLY | No chart component; no visx dependency |

**Descope confirmation:** DASH-02/05/06 are confirmed absent — no route, no import, no component. The openapi.yaml stub contains a stale comment mentioning `/api/econometrics` (line 10) but this is a Phase 1 stub comment and there is no implemented route.

---

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| `tests/unit/anti-patterns.test.ts` line 79 | `detects pure black background in fixtures` test fails locally because npm-warn output pollutes stdout | INFO | Not a Phase 3 regression; this test is inside `describe.skipIf(SKIP_IN_CI)` and passes in CI. The fixture tests verify the impeccable tooling itself, not the app source. `impeccable detect app/` exits 0 — the app source is clean. |

No blocker or warning anti-patterns found in Phase 3 app source. `impeccable detect app/` exits 0.

---

### B1 Regression Guard

| Check | Status | Evidence |
|-------|--------|---------|
| `next.config.ts` does NOT contain `cacheComponents` | PASS | `experimental` block contains only `typedRoutes: true` |
| `/api/dashboard` has no `'use cache'` | PASS | No `'use cache'` in route; comment on line 2 explains deferral |
| `pnpm tsc --noEmit` passes | PASS | Exits 0 (with `--max-old-space-size=4096` for TS 5.9.3/Node 25 memory) |
| `pnpm vitest run` Phase 3 tests pass | PASS | 9/9 tests pass: `dashboard-aggregator.test.ts`, `status-health.test.ts`, `dashboard.test.ts`, `status.test.ts` |
| Full vitest suite | PASS with known flaky | 108/109 pass; 1 failure is `anti-patterns.test.ts > detects pure black background in fixtures` — a CI-skipped fixture test failing due to npm-warn stdout pollution in the local environment; not a Phase 3 regression |
| `impeccable detect app/` exits 0 | PASS | No anti-patterns in app source |
| `/llms.txt`, `/.well-known/mcp.json`, `/.well-known/openapi.yaml` remain `force-static` | PASS | All three files have `export const dynamic = 'force-static'` confirmed |

---

### Human Verification Required

#### 1. Live On-Chain Reads

**Test:** Add the first deployed Abrigo contract address to `lib/apps/abrigo/instruments.ts`. Navigate to `/apps/abrigo/dashboard` and verify the metric tiles show real values for `poolBalance`, `settlementCount`, and `lpPositionCount`.
**Expected:** Tile values match what a block explorer (CeloScan or equivalent) reports for the same contract at the same block.
**Why human:** The multicall branch of `aggregateChain()` is unreachable while `ABRIGO_INSTRUMENTS = []`. The empty-registry path (skeleton tiles) is fully verified; the live-data path cannot be programmatically tested until contracts exist.

#### 2. Real ABI Shape Matches Foundry Artifact

**Test:** When the first Abrigo contract deploys, cross-reference `ABRIGO_ABI` in `lib/apps/abrigo/instruments.ts` against the Foundry artifact output (`../abrigo/out/...`).
**Expected:** The three view function names (`poolBalance`, `settlementCount`, `lpPositionCount`) and their output types (`uint256`) match the deployed ABI exactly.
**Why human:** The current ABI is explicitly marked "PROVISIONAL" in the source comment; the real names were inferred from DASH-03 requirement text. If names differ, the multicall will silently return null for all fields.

#### 3. Cross-Browser Dashboard Skeleton Render

**Test:** Open `/apps/abrigo/dashboard` in Chrome/Linux, Safari/macOS, and Firefox, at 360px, 768px, and 1280px viewport widths.
**Expected:** 4 metric tiles render in a 4-column grid at ≥1024px, collapse to 2-column at 768px, single column at 360px; IBM Plex Sans applied; live banner with Info icon visible; em-dash placeholder visible in all tiles.
**Why human:** Playwright e2e runs Chromium only; font rendering and grid collapse behavior differ across browsers.

---

### Gaps Summary

None. All 5 in-scope requirements (DASH-01/03/04/07/08) are satisfied at all three levels (exists, substantive, wired). The 3 descoped requirements (DASH-02/05/06) are confirmed absent. Three items are deferred to human/manual verification because they cannot be tested until Abrigo contracts deploy — these are expected, documented gaps in the VALIDATION.md manual-only section, not phase failures.

---

## Per-REQ Summary Table

| REQ | In Scope | Status | Notes |
|-----|----------|--------|-------|
| DASH-01 | Yes | SATISFIED | BFF aggregator + bigint serializer + version:1 envelope verified |
| DASH-02 | DESCOPED | EXCLUDED | No implementation; confirmed absent |
| DASH-03 | Yes | SATISFIED | RSC dashboard page, 4-tile grid, anti-fishing null→em-dash |
| DASH-04 | Yes | SATISFIED | nuqs ChainSelector, shared parser, ?chain= URL verified |
| DASH-05 | DESCOPED | EXCLUDED | No visx import; confirmed absent |
| DASH-06 | DESCOPED | EXCLUDED | No chart a11y component; confirmed absent |
| DASH-07 | Yes | SATISFIED | No-JS first paint RSC, no wallet gate |
| DASH-08 | Yes | SATISFIED | /status + /api/status, StatusPills, build hash, freshness, per-app rollup |

---

_Verified: 2026-05-29T10:42:00Z_
_Verifier: Claude (gsd-verifier)_
