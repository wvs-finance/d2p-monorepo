---
phase: 03-data-layer-and-on-chain-dashboard
plan: 01
subsystem: api
tags: [viem, nuqs, next-intl, i18n, vitest, playwright]

requires:
  - phase: 01-foundation-and-scaffold
    provides: lib/env.ts typed env, lib/wagmi/config.ts chain+transport definitions, vitest+playwright test infrastructure
  - phase: 02-research-lab-presence-and-iteration-catalog
    provides: i18n/request.ts mergeMessages pattern, StatusPill component, nuqs 2.8.9 installed

provides:
  - lib/apps/abrigo/instruments.ts — AbrigoInstrument type + SupportedChainId + ABRIGO_ABI (3-fn real fragment) + empty ABRIGO_INSTRUMENTS registry (the empty/live seam)
  - lib/chains/clients.ts — publicClients factory (one viem PublicClient per chain, 5s timeout, multicall batch)
  - lib/chains/serialize.ts — serializeBigints<T> single shared bigint→string deep-walk
  - lib/dashboard/aggregator.ts — aggregateChain (empty-first short-circuit) + aggregateAllChains (Promise.allSettled)
  - lib/dashboard/search-params.ts — CHAIN_SLUGS + dashboardSearchParams + loadDashboardParams + CHAIN_SLUG_TO_ID (satisfies)
  - lib/dashboard/contract.ts — DashboardResponse + StatusResponse shared envelope interfaces (version:1)
  - lib/status/health.ts — ChainHealth + checkChainHealth (5s timeout) + checkAllChains (Promise.allSettled)
  - lib/env.ts — VERCEL_GIT_COMMIT_SHA added to server schema
  - i18n dashboard namespace (es-CO + en) with nested status.* keys
  - Wave 0 test scaffolds — 2 real unit specs + 2 route-handler stubs + 5 e2e fixme placeholders

affects:
  - 03-02 (dashboard page + BFF route — imports aggregateAllChains, loadDashboardParams, DashboardResponse)
  - 03-03 (status page + BFF route — imports checkAllChains, StatusResponse)
  - 04-* (MCP agent surface — consumes /api/dashboard + /api/status JSON routes)

tech-stack:
  added: []
  patterns:
    - "Empty registry seam: ABRIGO_INSTRUMENTS=[] produces deterministic skeleton via same code path as live reads"
    - "Shared viem client factory: publicClients imported by BOTH aggregator and health (no cross-module dependency)"
    - "Single bigint boundary: serializeBigints used at aggregator and health output — bigint never leaves either module"
    - "Promise.allSettled for per-chain isolation: one failed RPC probe never blanks the full response"
    - "noNonNullAssertion compliance: use optional chaining + ?? fallback pattern instead of ! for array index access"
    - "PublicClient TS2418 workaround: build clients as const then cast to Record<SupportedChainId, PublicClient>"

key-files:
  created:
    - lib/apps/abrigo/instruments.ts
    - lib/chains/clients.ts
    - lib/chains/serialize.ts
    - lib/dashboard/aggregator.ts
    - lib/dashboard/search-params.ts
    - lib/dashboard/contract.ts
    - lib/status/health.ts
    - messages/es-CO/dashboard.json
    - messages/en/dashboard.json
    - tests/unit/dashboard-aggregator.test.ts
    - tests/unit/status-health.test.ts
    - tests/api/dashboard.test.ts
    - tests/api/status.test.ts
    - tests/e2e/api-dashboard.spec.ts
    - tests/e2e/dashboard-page.spec.ts
    - tests/e2e/dashboard-chain-selector.spec.ts
    - tests/e2e/dashboard-no-js.spec.ts
    - tests/e2e/status-page.spec.ts
  modified:
    - lib/env.ts
    - i18n/request.ts
    - tests/unit/i18n-coverage.test.ts

key-decisions:
  - "PublicClient TS2418 — create clients as narrowly-typed const, cast to Record<SupportedChainId, PublicClient>; annotating the map directly causes type-narrowing failures across chain-specific getBlock() return types"
  - "noNonNullAssertion in allSettled map — biome forbids ! on array indices; use optional chaining + celo.id fallback instead (unreachable in practice but required for lint compliance)"
  - "cacheComponents deferred — not added to next.config.ts; no live reads to cache with empty registry, and enabling it globally would break all 4 existing force-static/force-dynamic routes"

patterns-established:
  - "Empty-first short-circuit: if (instruments.length === 0) return before touching publicClients — makes skeleton path fully deterministic and free of flaky RPC in tests"
  - "Shared factory import: both aggregator.ts and health.ts import publicClients from @/lib/chains/clients — health.ts does NOT import from aggregator.ts"
  - "serializeBigints at module output boundary: call serializeBigints on the return value of aggregateAllChains() and checkAllChains() as belt-and-braces bigint guard"

requirements-completed: [DASH-01, DASH-08]

duration: 8min
completed: 2026-05-29
---

# Phase 3 Plan 01: Data Layer Foundation Summary

**Empty instrument registry + viem client factory + bigint serializer + health prober + nuqs search-param contract as the Phase 3 data layer foundation, with Wave 0 test scaffolds asserting deterministic skeleton behavior**

## Performance

- **Duration:** 8 min
- **Started:** 2026-05-29T03:26:38Z
- **Completed:** 2026-05-29T03:34:42Z
- **Tasks:** 3
- **Files modified/created:** 18

## Accomplishments

- The empty/live seam is live: `ABRIGO_INSTRUMENTS = []` produces 5 chain results all with `status: 'empty'` through the same code path that will later return live multicall data — verified by real unit assertions
- A single shared `publicClients` factory (lib/chains/clients.ts) and a single `serializeBigints` boundary (lib/chains/serialize.ts) back both the aggregator and the health lib — no bigint can escape either module
- DASH-01 and DASH-08 have Wave 0 test files; DASH-03/04/07 e2e stubs exist for Plans 03-02/03-03 to fill; i18n dashboard namespace is wired with recursive parity test catching future key additions automatically

## Task Commits

1. **Task 1: Shared chain factory + serializer + instrument seam + aggregator + health + search-params + contract types** - `64dca55` (feat)
2. **Task 2: Config wiring — env var, dashboard i18n namespace, i18n parity test** - `800d0b6` (feat)
3. **Task 3: Wave 0 test scaffolds** - `1a70711` (test)

## Files Created/Modified

- `lib/apps/abrigo/instruments.ts` — AbrigoInstrument + SupportedChainId + ABRIGO_ABI + empty registry seam
- `lib/chains/clients.ts` — publicClients factory (5 chains, 5s timeout per-request, multicall batch)
- `lib/chains/serialize.ts` — serializeBigints<T> deep-walk bigint→string
- `lib/dashboard/aggregator.ts` — aggregateChain (empty-first short-circuit) + aggregateAllChains (Promise.allSettled)
- `lib/dashboard/search-params.ts` — CHAIN_SLUGS + dashboardSearchParams + loadDashboardParams + CHAIN_SLUG_TO_ID (satisfies)
- `lib/dashboard/contract.ts` — DashboardResponse + StatusResponse envelopes (version:1)
- `lib/status/health.ts` — checkChainHealth (5s timeout via Promise.race) + checkAllChains (Promise.allSettled)
- `lib/env.ts` — VERCEL_GIT_COMMIT_SHA added to server block + runtimeEnv
- `i18n/request.ts` — dashboardMessages import + mergeMessages arg
- `messages/es-CO/dashboard.json` — dashboard namespace (es-CO first) with nested status.* keys
- `messages/en/dashboard.json` — English parity
- `tests/unit/i18n-coverage.test.ts` — dashboard parity case added (recursive, catches nested status.*)
- `tests/unit/dashboard-aggregator.test.ts` — real assertions: 5 results all status exactly 'empty', no bigint
- `tests/unit/status-health.test.ts` — real assertions: probe isolation, blockNumber as string
- `tests/api/dashboard.test.ts` — it.todo stubs for 03-02
- `tests/api/status.test.ts` — it.todo stubs for 03-03
- `tests/e2e/{api-dashboard,dashboard-page,dashboard-chain-selector,dashboard-no-js,status-page}.spec.ts` — test.fixme() placeholders

## Decisions Made

- `PublicClient` TS2418: viem's chain-specific `PublicClient` types differ in `getBlock()` return type per chain (e.g., Optimism has `type: "deposit"` transactions). Annotating the map directly as `Record<SupportedChainId, PublicClient>` triggers TS2418. Fix: build `clients` as narrowly-typed const, then `as Record<SupportedChainId, PublicClient>` on export.
- `noNonNullAssertion` lint rule: biome forbids `!` even in positions where the value is guaranteed (e.g., `chains[i]!` inside a `.map()` over a fixed-length `as const` array). Fix: use optional chaining + `?? celo.id` / `?? celo.name` fallback.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `Record<SupportedChainId, PublicClient>` type annotation caused TS2418**
- **Found during:** Task 1 (lib/chains/clients.ts)
- **Issue:** TS2418 — each chain-specific `createPublicClient` infers a narrower `getBlock()` return type (chain-specific transaction union). Annotating the exported map as `Record<SupportedChainId, PublicClient>` failed because the inferred types are not mutually assignable.
- **Fix:** Build each `createPublicClient(...)` call in an unannotated const object; cast on export: `export const publicClients = clients as Record<SupportedChainId, PublicClient>`
- **Files modified:** lib/chains/clients.ts
- **Verification:** `pnpm tsc --noEmit` exits 0
- **Committed in:** 64dca55 (Task 1 commit)

**2. [Rule 1 - Bug] biome `noNonNullAssertion` on allSettled index access**
- **Found during:** Task 1 (lib/dashboard/aggregator.ts, lib/status/health.ts)
- **Issue:** `chains[i]!.id` in `Promise.allSettled` map callback triggers biome lint error even though `i` is bounded by the same array
- **Fix:** Replace with optional chaining + `?? celo.id` / `?? celo.name` (unreachable fallback, but lint-compliant)
- **Files modified:** lib/dashboard/aggregator.ts, lib/status/health.ts
- **Verification:** `pnpm biome check` passes
- **Committed in:** 64dca55 (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 — bugs caught at build/lint time)
**Impact on plan:** Both fixes required for typecheck and lint gate; no scope changes.

## Issues Encountered

None beyond the two auto-fixed deviations above.

## Live Verification

SKIPPED per plan `<live_verification>` clause and CLAUDE.md "When to skip": this plan produces no user-visible route or page surface (libs + config + i18n + test scaffolds only). Foundation verified via `pnpm tsc --noEmit` + `pnpm vitest run` + `pnpm biome check`. No user-visible route produced; foundation verified via tsc + vitest only.

## Next Phase Readiness

- Plan 03-02 (dashboard page + `/api/dashboard` BFF route) can build directly against `aggregateAllChains`, `loadDashboardParams`, `CHAIN_SLUG_TO_ID`, and `DashboardResponse`
- Plan 03-03 (status page + `/api/status` BFF route) can build against `checkAllChains`, `StatusResponse`, and the `dashboard.status.*` i18n keys
- The two `it.todo` stubs in `tests/api/dashboard.test.ts` and `tests/api/status.test.ts` are waiting to be filled by their respective plans
- The 5 `test.fixme()` e2e stubs appear in `playwright test --list` ready for Plans 03-02 and 03-03

## Self-Check: PASSED

All created files found on disk. All 3 task commits verified in git log.

| Item | Status |
|------|--------|
| lib/apps/abrigo/instruments.ts | FOUND |
| lib/chains/clients.ts | FOUND |
| lib/chains/serialize.ts | FOUND |
| lib/dashboard/aggregator.ts | FOUND |
| lib/dashboard/search-params.ts | FOUND |
| lib/dashboard/contract.ts | FOUND |
| lib/status/health.ts | FOUND |
| messages/es-CO/dashboard.json | FOUND |
| messages/en/dashboard.json | FOUND |
| Task 1 commit 64dca55 | FOUND |
| Task 2 commit 800d0b6 | FOUND |
| Task 3 commit 1a70711 | FOUND |

---
*Phase: 03-data-layer-and-on-chain-dashboard*
*Completed: 2026-05-29*
