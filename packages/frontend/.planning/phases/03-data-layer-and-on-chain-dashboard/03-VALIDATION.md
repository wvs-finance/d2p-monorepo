---
phase: 3
slug: data-layer-and-on-chain-dashboard
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-05-13
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. The planner MUST map every in-scope task to a row in the Per-Task Verification Map.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Frameworks** | Vitest 4.x (unit + RSC + route handlers), Playwright 1.49 (e2e + a11y), @axe-core/playwright, Lighthouse CI (perf budget), Biome 1.9 (lint/format), tsc (typecheck), impeccable v2.1.8 (anti-pattern CLI gate) |
| **Config files** | Existing — `vitest.config.ts`, `playwright.config.ts` (gets a deterministic `webServer` block in Plan 03-02), `lighthouserc.cjs`, `biome.json`, `tsconfig.json` |
| **Quick run command** | `pnpm test:quick` (biome + tsc + vitest) |
| **Full suite command** | `pnpm test:all` |
| **Estimated quick runtime** | ~30 seconds |
| **Estimated full runtime** | ~6 minutes local |

> **Ground-truth gate (CLAUDE.md):** automated green is necessary but NOT sufficient. After each task commit, the Evidence Collector runs live against the affected route. Phase-2 burn history (BigInt-serialization-throws-at-runtime-but-passes-tsc, Turbopack route-config divergence) means `pnpm build && pnpm start` + live DOM/route check is mandatory, not optional.
>
> **Caching deferred (B1):** `cacheComponents` is NOT enabled this phase — it is a global Next 16 flag that disallows `export const dynamic` and would break the existing force-static routes (`app/llms.txt`, `app/.well-known/mcp.json`, `app/.well-known/openapi.yaml`) and the force-dynamic `app/api/health`. Plan 03-02 Task 2 carries a `pnpm build` gate asserting those 3 force-static routes still render as ○ (Static).

---

## Sampling Rate

- **After every task commit:** `pnpm test:quick`
- **After every plan wave:** `pnpm test:all`
- **After each task (route/page surface):** Evidence Collector live-verification against the affected route (`/api/dashboard`, `/apps/abrigo/dashboard`, `/api/status`, `/status`)
- **Before `/gsd:verify-work`:** Full suite green on Vercel preview deploy
- **Max feedback latency:** 30s per task (quick); 10min per wave

---

## Per-Task Verification Map

> Planner fills Task IDs once plans exist. Requirement → test-type guidance below (DASH-02/05/06 are DESCOPED — not validated).

| Req ID | Test Type | Automated Command (guidance) | Evidence / File | Status |
|--------|-----------|------------------------------|-----------------|--------|
| **DASH-01** | unit + e2e | `vitest run tests/unit/dashboard-aggregator.test.ts` (aggregator returns typed JSON, bigint fields are strings, empty registry → all status EXACTLY 'empty') + `vitest run tests/api/dashboard.test.ts` (GET /api/dashboard?app=abrigo → 200 version:1, ?app=unknown → 404, degraded-not-500) + `playwright test tests/e2e/api-dashboard.spec.ts` | `app/api/dashboard/route.ts`, `lib/apps/abrigo/instruments.ts`, `lib/dashboard/aggregator.ts`, `lib/chains/clients.ts`, `lib/chains/serialize.ts`, `lib/dashboard/contract.ts` | ⬜ pending |
| **DASH-03** | e2e | `playwright test tests/e2e/dashboard-page.spec.ts` (/apps/abrigo/dashboard → 200; renders per-chain metric tiles: pool balance, settlement events, LP positions, last block synced) | `app/(apps)/apps/abrigo/dashboard/page.tsx` | ⬜ pending |
| **DASH-04** | e2e | `playwright test tests/e2e/dashboard-chain-selector.spec.ts` (selecting a chain updates `?chain=` URL param; pasted URL returns same state) | chain selector component (nuqs, shared `dashboardSearchParams.chain` parser) | ⬜ pending |
| **DASH-07** | e2e + structural | `playwright test tests/e2e/dashboard-no-js.spec.ts` with `javaScriptEnabled:false` (meaningful first-paint content, skeleton tiles present, no wallet) + grep page is RSC (no `'use client'` at page top) | dashboard page.tsx | ⬜ pending |
| **DASH-08** | e2e + unit | `playwright test tests/e2e/status-page.spec.ts` (/status → 200; per-chain RPC health rows for all 5 chains; build hash; freshness ts) + `vitest run tests/unit/status-health.test.ts` (per-chain isolation: one rejected probe doesn't fail the set) + `vitest run tests/api/status.test.ts` (route returns 200 version:1; degraded probe still resolves) | `app/api/status/route.ts`, `app/(dashboard)/status/page.tsx`, `lib/status/health.ts` | ⬜ pending |

**Skeleton-state assertion (cross-cutting, anti-fishing):** a test MUST assert that with the empty `ABRIGO_INSTRUMENTS` registry the dashboard renders labelled dashed/empty tiles + a "live once contracts deploy" banner and shows **no fabricated numeric values**.

---

## Wave 0 Requirements

> Final filenames (reconciled with 03-01 `files_modified`). Unit specs carry `// @vitest-environment node` (vitest global is jsdom; viem clients must not boot under jsdom). The two route-handler tests start as `it.todo` stubs in 03-01 and are filled by 03-02 / 03-03.

- [ ] `tests/unit/dashboard-aggregator.test.ts` (DASH-01) — REAL assertions: empty registry → 5 results all status EXACTLY 'empty' (deterministic; short-circuits before any client) + bigint→string deep-walk boundary
- [ ] `tests/unit/status-health.test.ts` (DASH-08) — REAL assertions: per-chain probe isolation (mock one `@/lib/chains/clients` client to reject)
- [ ] `tests/unit/i18n-coverage.test.ts` — ADD a `dashboard` namespace case (recursive `assertKeyParity` over nested `status.*`) — created in Phase 2, extended here in 03-01
- [ ] `tests/api/dashboard.test.ts` (DASH-01) — `it.todo` stub in 03-01; FILLED by 03-02 (200 version:1, chains[5], no bigint, ?app=unknown → 404, degraded-not-500)
- [ ] `tests/api/status.test.ts` (DASH-08) — `it.todo` stub in 03-01; FILLED by 03-03 (200 version:1, chains[5], single-failing-probe isolation)
- [ ] `tests/e2e/api-dashboard.spec.ts` (DASH-01) — `test.fixme` stub in 03-01; filled by 03-02
- [ ] `tests/e2e/dashboard-page.spec.ts` (DASH-03) — `test.fixme` stub in 03-01; filled by 03-02
- [ ] `tests/e2e/dashboard-chain-selector.spec.ts` (DASH-04) — `test.fixme` stub in 03-01; filled by 03-02
- [ ] `tests/e2e/dashboard-no-js.spec.ts` (DASH-07) — `test.fixme` stub in 03-01; filled by 03-02
- [ ] `tests/e2e/status-page.spec.ts` (DASH-08) — `test.fixme` stub in 03-01; filled by 03-03
- [ ] `lib/apps/abrigo/instruments.ts` — `AbrigoInstrument` type + empty `ABRIGO_INSTRUMENTS` registry + `ABRIGO_ABI` (a minimal REAL 3-view-fn `readonly satisfies Abi` fragment, NOT `[]`, marked provisional pending the Foundry artifact — research Open Question 1)
- [ ] `lib/chains/clients.ts` + `lib/chains/serialize.ts` — shared viem client factory (5s timeout) + single bigint serializer, both consumed by aggregator + health
- [ ] `lib/dashboard/contract.ts` — shared `DashboardResponse` / `StatusResponse` (version:1) envelopes

The two route-handler tests use `it.todo()` and the 5 e2e specs use `test.fixme()`; they are filled with real assertions by the feature plans (03-02 / 03-03). The two unit specs are REAL (green) from 03-01.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Live on-chain reads return correct values | DASH-01, DASH-03 | No contracts deployed yet — cannot assert real values until an address exists in the registry | When the first Abrigo contract deploys, add its address + verify the dashboard reflects real pool balance / event counts against a block explorer. Record in a follow-up. |
| Real ABI shape matches inferred function names | DASH-01 | `poolBalance`/`settlementCount`/`lpPositionCount` inferred from DASH-03 text; real names come from Foundry artifact | Author cross-checks the registry ABI against the deployed contract's Foundry artifact when available. |
| Cross-browser dashboard render | DASH-03, DASH-07 | Playwright single-engine; skeleton tile layout + IBM Plex render across OS/browsers | Manual smoke on Chrome (Linux), Safari (macOS), Firefox; record screenshots. |

---

## Validation Sign-Off

- [x] All in-scope tasks (DASH-01/03/04/07/08) have an `<automated>` verify path or a Wave 0 dependency
- [x] No 3 consecutive tasks without an automated verify path
- [ ] Wave 0 stub tests + empty instrument registry created
- [x] Skeleton/empty-state anti-fishing assertion present
- [x] No watch-mode flags (CI uses `--run`)
- [x] DASH-02/05/06 confirmed descoped (not in any plan, not validated)
- [x] `nyquist_compliant: true` set once planner confirms every in-scope task references a row

**Approval:** pending
