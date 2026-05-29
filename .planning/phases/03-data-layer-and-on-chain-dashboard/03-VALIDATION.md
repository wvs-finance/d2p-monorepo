---
phase: 3
slug: data-layer-and-on-chain-dashboard
status: draft
nyquist_compliant: false
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
| **Config files** | Existing — `vitest.config.ts`, `playwright.config.ts`, `lighthouserc.cjs`, `biome.json`, `tsconfig.json` |
| **Quick run command** | `pnpm test:quick` (biome + tsc + vitest) |
| **Full suite command** | `pnpm test:all` |
| **Estimated quick runtime** | ~30 seconds |
| **Estimated full runtime** | ~6 minutes local |

> **Ground-truth gate (CLAUDE.md):** automated green is necessary but NOT sufficient. After each task commit, the Evidence Collector runs live against the affected route. Phase-2 burn history (BigInt-serialization-throws-at-runtime-but-passes-tsc, Turbopack route-config divergence) means `pnpm build && pnpm start` + live DOM/route check is mandatory, not optional.

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
| **DASH-01** | unit + e2e | `vitest run tests/unit/dashboard-aggregator.test.ts` (aggregator returns typed JSON, bigint fields are strings, empty registry → empty instruments array) + `playwright test tests/e2e/api-dashboard.spec.ts` (GET /api/dashboard?app=abrigo&chain=celo → 200, valid JSON shape) | `app/api/dashboard/route.ts`, `lib/apps/abrigo/instruments.ts`, aggregator lib | ⬜ pending |
| **DASH-03** | e2e | `playwright test tests/e2e/dashboard-page.spec.ts` (/apps/abrigo/dashboard → 200; renders per-chain metric tiles: pool balance, settlement events, LP positions, last block synced) | `app/(apps)/apps/abrigo/dashboard/page.tsx` | ⬜ pending |
| **DASH-04** | e2e | `playwright test tests/e2e/dashboard-chain-selector.spec.ts` (selecting a chain updates `?chain=` URL param; pasted URL returns same state) | chain selector component (nuqs) | ⬜ pending |
| **DASH-07** | e2e + structural | `playwright test tests/e2e/dashboard-no-js.spec.ts` with `javaScriptEnabled:false` (meaningful first-paint content, skeleton tiles present, no wallet) + grep page is RSC (no `'use client'` at page top) | dashboard page.tsx | ⬜ pending |
| **DASH-08** | e2e + unit | `playwright test tests/e2e/status-page.spec.ts` (/status → 200; per-chain RPC health rows for all 5 chains; build hash; freshness ts; degrades when one RPC mocked-down) + `vitest run tests/unit/status-health.test.ts` (per-chain isolation: one rejected probe doesn't fail the set) | `app/api/status/route.ts` and/or `app/(dashboard)/status/page.tsx` | ⬜ pending |

**Skeleton-state assertion (cross-cutting, anti-fishing):** a test MUST assert that with the empty `ABRIGO_INSTRUMENTS` registry the dashboard renders labelled dashed/empty tiles + a "live once contracts deploy" banner and shows **no fabricated numeric values**.

---

## Wave 0 Requirements

- [ ] `tests/unit/dashboard-aggregator.test.ts` stub (DASH-01) — assert empty-registry path + bigint→string boundary
- [ ] `tests/unit/status-health.test.ts` stub (DASH-08) — per-chain probe isolation
- [ ] `tests/e2e/api-dashboard.spec.ts` stub (DASH-01)
- [ ] `tests/e2e/dashboard-page.spec.ts` stub (DASH-03)
- [ ] `tests/e2e/dashboard-chain-selector.spec.ts` stub (DASH-04)
- [ ] `tests/e2e/dashboard-no-js.spec.ts` stub (DASH-07)
- [ ] `tests/e2e/status-page.spec.ts` stub (DASH-08)
- [ ] Placeholder `AbrigoInstrument` type + empty `ABRIGO_INSTRUMENTS` registry + placeholder ABI type (filled from Foundry artifact later — Wave 0 stub per research Open Question 1)

All stubs use `test.fixme()` / `it.todo()` and are filled with real assertions by feature plans.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Live on-chain reads return correct values | DASH-01, DASH-03 | No contracts deployed yet — cannot assert real values until an address exists in the registry | When the first Abrigo contract deploys, add its address + verify the dashboard reflects real pool balance / event counts against a block explorer. Record in a follow-up. |
| Real ABI shape matches inferred function names | DASH-01 | `poolBalance`/`settlementCount`/`lpPositionCount` inferred from DASH-03 text; real names come from Foundry artifact | Author cross-checks the registry ABI against the deployed contract's Foundry artifact when available. |
| Cross-browser dashboard render | DASH-03, DASH-07 | Playwright single-engine; skeleton tile layout + IBM Plex render across OS/browsers | Manual smoke on Chrome (Linux), Safari (macOS), Firefox; record screenshots. |

---

## Validation Sign-Off

- [ ] All in-scope tasks (DASH-01/03/04/07/08) have an `<automated>` verify path or a Wave 0 dependency
- [ ] No 3 consecutive tasks without an automated verify path
- [ ] Wave 0 stub tests + empty instrument registry created
- [ ] Skeleton/empty-state anti-fishing assertion present
- [ ] No watch-mode flags (CI uses `--run`)
- [ ] DASH-02/05/06 confirmed descoped (not in any plan, not validated)
- [ ] `nyquist_compliant: true` set once planner confirms every in-scope task references a row

**Approval:** pending
