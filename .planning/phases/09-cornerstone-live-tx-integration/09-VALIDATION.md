---
phase: 9
slug: cornerstone-live-tx-integration
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-07
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derived from 09-RESEARCH.md "## Validation Architecture". Drives Nyquist Dimension-8 coverage.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (unit, jsdom) + Playwright (e2e) — both already configured |
| **Config file** | `vitest.config.ts`, `playwright.config.ts` (existing) |
| **Quick run command** | `pnpm vitest run` |
| **Full suite command** | `pnpm run test:impeccable && pnpm vitest run && pnpm exec playwright test` |
| **Estimated runtime** | unit ~15s; e2e ~60s (prod build webServer) |

---

## Sampling Rate

- **After every task commit:** Run `pnpm vitest run` (+ `pnpm run test:impeccable` for token/honesty checks)
- **After every plan wave:** Run the full suite (vitest + playwright)
- **Before `/gsd:verify-work`:** Full suite green LOCALLY (the Phase-8 CI lesson — never rely on build+unit alone; run e2e locally after any render change)
- **After each task commit with a rendered surface:** Evidence Collector live-verify per project CLAUDE.md (ground-truth DOM gate)
- **Max feedback latency:** ~15s (unit), ~75s (full)

---

## Per-Task Verification Map

*(Task IDs finalized by the planner; this maps requirement → test type → command. Filled per the 3-wave structure from research.)*

| Area | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|------|------|-------------|-----------|-------------------|-------------|--------|
| `BalanceDelta` decoder (amount0 sar + amount1 sign-extend low word) | 0 | MOD5-ABI | unit | `pnpm vitest run lib/apps/abrigo/cornerstone` | ❌ W0 | ⬜ pending |
| signed `int24` strike/width decode (negative tick) | 0 | MOD5-ABI | unit | `pnpm vitest run` | ❌ W0 | ⬜ pending |
| `extractStrike(positionId) === 360360` (TokenId.strike(0) bit offset) | 0 | MOD5-ABI | unit | `pnpm vitest run` | ❌ W0 | ⬜ pending |
| `fromChainLog` decoder (ExecutorDecided/PositionMinted, `strict:false`, requestId=0 not surfaced) | 0 | MOD5-ABI | unit | `pnpm vitest run` | ❌ W0 | ⬜ pending |
| artifact loader + `isExpired(capturedAt+3d)` | 0 | MOD5-CHAIN | unit | `pnpm vitest run` | ❌ W0 | ⬜ pending |
| isolated `buildbear.ts` chain NOT in `wagmiConfig`/`SupportedChainId` | 0 | MOD5-CHAIN | unit/grep | `pnpm vitest run` + grep guard | ❌ W0 | ⬜ pending |
| freshness gate: `numberOfLegs(executor)==0` → live; `>0` → fallback | 1 | MOD5-LIVE | unit (pure logic) | `pnpm vitest run` | ❌ W0 | ⬜ pending |
| `runWorkflowLive` producer selection vs `runWorkflow` mock through same workflow-store seam | 1 | MOD5-LIVE/FALLBACK | unit (store reducer) | `pnpm vitest run` | ❌ W0 | ⬜ pending |
| Route-Handler JSON-RPC proxy forwards `eth_chainId`/reads | 1 | MOD5-CHAIN/LIVE | integration | `browser_network_request` / vitest route test | ❌ W0 | ⬜ pending |
| live-vs-fallback branch + mode banner always visible | 2 | MOD5-FALLBACK | e2e | `pnpm exec playwright test cornerstone` | ✅ extend | ⬜ pending |
| honesty greps (no executed/realized, no `$` PnL, no raw 0x000…0, fork-verified never green, no `<details>` on decision card, mock fallback shows NO tx hash) | 2 | MOD5-SURFACE/FALLBACK | e2e | `pnpm exec playwright test cornerstone` | ✅ extend | ⬜ pending |
| verbatim no-bridge disclosure (es-CO+en) present in banner | 2 | MOD5-SURFACE | e2e | `pnpm exec playwright test` | ✅ extend | ⬜ pending |
| live mint end-to-end (real tx hash + ExecutorDecided + PositionMinted + quoteMargin) | 2 | MOD5-LIVE/SURFACE | live (manual/EC) | Evidence Collector vs freshly provisioned sandbox | n/a | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `lib/apps/abrigo/cornerstone/*.test.ts` — failing-first stubs for the decoders (`BalanceDelta`, int24, `extractStrike`, `fromChainLog`), the artifact loader (`isExpired`), and the freshness-gate logic
- [ ] Mirror compiled ABIs (`MacroHedgeExecutor`, `IPanopticData`) + `buildbear-deployments.json` into `lib/apps/abrigo/cornerstone/` (Turbopack-safe static import — recall the Phase-2/6 Velite/Turbopack JSON bundling lesson)
- [ ] Confirm `TokenId.strike(0)` bit offset against `abrigo-somnia` panoptic-sdk `generated.ts` and pin the `extractStrike` formula (research LOW-confidence item)
- [ ] Run the `eth_chainId` browser/probe against the BuildBear RPC to confirm CORS posture (research MEDIUM-confidence item) — proxy ships regardless

*Existing vitest + Playwright infrastructure covers the rest; no framework install needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Real live mint succeeds against a freshly provisioned sandbox | MOD5-LIVE | Requires a live, funded, fresh BuildBear sandbox (TTL-bound, re-provisioned per §4b runbook) + a connected wallet; not reproducible in CI | Run §4b runbook → load `/apps/abrigo/cornerstone` → connect wallet → switch to fork → Confirm → assert real tx hash + decoded evidence via Evidence Collector |
| `wallet_switchEthereumChain`/`addEthereumChain` UX across MetaMask-injected vs WalletConnect | MOD5-LIVE | Real wallet behavior differs by provider; cannot mock faithfully | Manual test both provider paths in Wave 1 freshness gate |

---

## Validation Sign-Off

- [ ] All tasks have an `<automated>` verify OR an explicit Wave 0 dependency / manual-only justification
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (mirrored ABIs/artifact, decoder stubs, strike-offset confirmation)
- [ ] No watch-mode flags (CI-safe `vitest run`, not `vitest`)
- [ ] Feedback latency < 75s (full)
- [ ] `nyquist_compliant: true` set in frontmatter (after planner maps every task)

**Approval:** pending
