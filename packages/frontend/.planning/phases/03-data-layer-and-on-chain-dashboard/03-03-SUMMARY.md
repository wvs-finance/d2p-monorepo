---
phase: 03-data-layer-and-on-chain-dashboard
plan: 03
subsystem: api
tags: [nextjs, viem, rpc-health, status-page, playwright, i18n]

requires:
  - phase: 03-01
    provides: checkAllChains() + ChainHealth interface in lib/status/health.ts; StatusResponse envelope in lib/dashboard/contract.ts; per-chain viem publicClients

provides:
  - /api/status: version:1 StatusResponse JSON route (DASH-08 agent/CI health surface) — runtime=nodejs, force-dynamic, delegates per-chain isolation to checkAllChains
  - /status: umbrella-scoped RSC page rendering 5 per-chain health rows with StatusPills (CROSS-09), build hash, freshness timestamp, Abrigo pre-launch rollup
  - tests/api/status.test.ts: unit test (version:1 envelope, chains[5], isolated-failure case via vi.mock)
  - tests/e2e/status-page.spec.ts: 15 e2e specs covering /status + /api/status (no test.fixme)

affects:
  - Phase 4 agent surface (can wrap /api/status for health-check tool)
  - Phase 5 DeFi surface (pattern for umbrella-scoped RSC pages under (dashboard))

tech-stack:
  added: []
  patterns:
    - umbrella-scoped RSC page under (dashboard) route group with runtime=nodejs + force-dynamic
    - StatusPill mapped from ChainHealth.status: healthy->PASS, degraded->FAIL (color+icon+text)
    - /api/status delegates per-chain isolation to checkAllChains(); no inline allSettled in route
    - data-testid attributes on chain rows and metric fields for reliable e2e targeting

key-files:
  created:
    - app/(dashboard)/status/page.tsx
    - (Task 1, prior executor) app/api/status/route.ts
    - (Task 1, prior executor) tests/api/status.test.ts
    - tests/e2e/status-page.spec.ts
  modified:
    - app/(dashboard)/layout.tsx

key-decisions:
  - "StatusPill mapped from RPC health: healthy->PASS (green CheckCircle2), degraded->FAIL (red XCircle) — CROSS-09 compliant (color+icon+text, not color alone)"
  - "data-testid chain row names derived from viem chain.name.toLowerCase(): 'celo', 'ethereum', 'base', 'arbitrum one' → 'arbitrum-one', 'op mainnet' → 'op-mainnet'"
  - "/status page comment on line 2 contains 'use client' as a docstring note — grep for first non-comment line, not full-file grep, for RSC purity check"

patterns-established:
  - "Umbrella-scoped RSC page pattern: app/(dashboard)/status/page.tsx — no nuqs, no wagmi, pure server reads via lib functions, runtime=nodejs + force-dynamic"
  - "StatusPill data-testid assertion: locator('output') inside row to assert CROSS-09 pill presence with textContent check"

requirements-completed: [DASH-08]

duration: 25min
completed: 2026-05-29
---

# Phase 03 Plan 03: Status Surface Summary

**Dual status surface (DASH-08): version:1 /api/status JSON route with per-chain RPC health via checkAllChains and umbrella-scoped /status RSC page rendering StatusPills with live block numbers and latency**

## Performance

- **Duration:** ~25 min (continuation — Task 1 committed by prior executor, Task 2 completed here)
- **Started:** 2026-05-29T14:10:00Z (continuation start)
- **Completed:** 2026-05-29T14:35:00Z
- **Tasks:** 2 (Task 1: prior executor; Task 2: this executor)
- **Files modified:** 4

## Accomplishments

- Created `/status` umbrella-scoped RSC page rendering 5 per-chain health rows, each with a CROSS-09 StatusPill (color+icon+text), live block numbers, latency ms, build hash, freshness timestamp, and Abrigo pre-launch rollup — no nuqs/wallet/HuggingFace
- Task 1 (prior executor): `/api/status` JSON route returning version:1 StatusResponse envelope with `checkAllChains()` (no inline allSettled), VERCEL_GIT_COMMIT_SHA build hash, and `apps.abrigo` pre-launch rollup
- Filled `tests/e2e/status-page.spec.ts` — 15 real e2e tests (zero test.fixme stubs), all green against production build
- Corrected stale (dashboard)/layout.tsx comment (removed TanStack QueryClientProvider claim)

## Task Commits

1. **Task 1: JSON status route /api/status (DASH-08)** - `816c6c7` (feat)
2. **Task 2: /status RSC page + layout comment fix + e2e spec** - `6aa0eb3` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `app/api/status/route.ts` — version:1 StatusResponse JSON route; runtime=nodejs, force-dynamic, calls checkAllChains, no inline allSettled
- `app/(dashboard)/status/page.tsx` — RSC status page; 5 chain rows with StatusPills, build hash, freshness, Abrigo pre-launch rollup
- `tests/api/status.test.ts` — unit test for version:1 envelope + chains[5] + isolated-failure case via vi.mock
- `tests/e2e/status-page.spec.ts` — 15 e2e specs; /status page assertions + /api/status JSON assertions
- `app/(dashboard)/layout.tsx` — stale TanStack comment corrected

## Decisions Made

- StatusPill mapping from RPC health: `healthy->PASS` (green CheckCircle2), `degraded->FAIL` (red XCircle). IN_PROGRESS used for the Abrigo pre-launch rollup row. This follows the existing CROSS-09 pattern from StatusPill.tsx.
- `data-testid` attributes on chain rows use `chain.name.toLowerCase().replace(/\s+/g, '-')` — viem names "OP Mainnet" becomes `chain-row-op-mainnet`, "Arbitrum One" becomes `chain-row-arbitrum-one`.
- Page comment on line 2 documents the no-`'use client'` constraint as explanatory text; RSC purity check must match the first non-comment line, not full-file grep.
- Playwright webServer reconciliation: the production-build block (`pnpm build && pnpm start -p 3040`) was already in place from 03-02; no changes needed to playwright.config.ts.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None. Biome formatting required minor line-length adjustments (two JSX attributes reformatted by biome); corrected in-place before commit.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- DASH-08 is complete: both `/api/status` and `/status` are production-ready and live-verified
- Phase 4 agent surface can wrap `/api/status` for a health-check MCP tool without additional plumbing
- Pattern established for umbrella-scoped RSC pages under `(dashboard)` with no nuqs/wallet dependencies

---
*Phase: 03-data-layer-and-on-chain-dashboard*
*Completed: 2026-05-29*
