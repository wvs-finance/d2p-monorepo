---
phase: 9
slug: cornerstone-live-tx-integration
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-06-07
updated: 2026-06-08
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derived from 09-RESEARCH.md "## Validation Architecture". Drives Nyquist Dimension-8 coverage.
> **v5 reframe (2026-06-08):** in-phase acceptance = `replay` (the GUARANTEED artifact, verified now) + the live two-chain path BUILT/wired/unit-proven. The live on-chain RUN is ⊘ DEFERRED (external Somnia validator-callback outage) — NOT a Phase-9 gate.

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
| `BalanceDelta` decoder (amount0 sar + amount1 sign-extend low word) | 0 | MOD5-ABI | unit | `pnpm vitest run tests/unit/cornerstone/balance-delta.test.ts` | ❌ W0 | ⬜ pending |
| signed `int24` strike/width decode (negative tick) | 0 | MOD5-ABI | unit | `pnpm vitest run` | ❌ W0 | ⬜ pending |
| `extractStrike(positionId) === 360360` (TokenId.strike(0) bit offset 76, sdk-cross-checked not reverse-fit) | 0 | MOD5-ABI | unit | `pnpm vitest run tests/unit/cornerstone/token-id.test.ts` | ❌ W0 | ⬜ pending |
| `fromChainEvent` reshape (8-field ExecutorDecided/PositionMinted.positionId, `strict:false`, recordedDecisionId once, requestId=0 not surfaced) | 1 | MOD5-ABI | unit | `pnpm vitest run tests/unit/cornerstone/from-chain-event.test.ts` | ❌ W1 | ⬜ pending |
| artifact loader + `isExpired(capturedAt+3d)` | 0 | MOD5-CHAIN | unit | `pnpm vitest run tests/unit/cornerstone/artifact-loader.test.ts` | ❌ W0 | ⬜ pending |
| fork registered as 6th wagmi chain (D2; rpcUrl from artifact, no hardcoded endpoint) | 0 | MOD5-CHAIN | grep | `grep -qE '31337\|BuildBearChainId' lib/wagmi/config.ts` | ❌ W0 | ⬜ pending |
| MacroOracle `latest` read available (codegen or documented inline ABI) for the oracle-freshness pre-check | 0 | MOD5-ABI/LIVE | grep | `grep -q 'latest' lib/contracts/generated.ts` (or the inline-ABI comment) | ❌ W0 | ⬜ pending |
| Route-Handler JSON-RPC CORS proxy forwards `eth_chainId` to `deployment.rpcUrl` + typed error (ships regardless; probe decides direct-vs-proxy) | 0 | MOD5-CHAIN/LIVE | unit (route) | `pnpm vitest run tests/unit/cornerstone/rpc-proxy.test.ts` | ❌ W0 | ⬜ pending |
| T0 replay smoke — RPC-INDEPENDENT (fork RPC aborted via `page.route`; snapshot+360360 still render) — the CI gate | 0 | MOD5-MODES/FALLBACK | e2e | `pnpm exec playwright test tests/e2e/cornerstone-replay-smoke.spec.ts` | ❌ W0 | ⬜ pending |
| mode parse: DEFAULT_MODE==='replay'; garbage/null → replay | 0 | MOD5-MODES | unit | `pnpm vitest run tests/unit/cornerstone/mode.test.ts` | ❌ W0 | ⬜ pending |
| `runWorkflowLive` producer selection vs `runWorkflow` mock through same workflow-store seam; ok:false upstream → no mint | 1 | MOD5-LIVE/FALLBACK | unit | `pnpm vitest run tests/unit/cornerstone/producer-ordering.test.ts` | ❌ W1 | ⬜ pending |
| Agent-1 two-leg orchestration: parseStrategistDecided + serializeMandate (strings, no raw bigint/bytes32) + correlateDecisionFailed per leg | 1 | MOD5-AGENT1LIVE | unit | `pnpm vitest run tests/unit/cornerstone/agent1-route-logic.test.ts` | ❌ W1 | ⬜ pending |
| Agent-1 route-level terminals: silent no-show → bounded LEG_TIMEOUT_MS → terminal {ok:false, spentSchoolStt}; DecisionFailed terminal; `schoolSet&&!notionalSet` partial-mandate (never hang) | 1 | MOD5-AGENT1LIVE/LIVE | unit | `pnpm vitest run tests/unit/cornerstone/agent1-route-logic.test.ts` | ❌ W1 | ⬜ pending |
| /api/abrigo/agent1 server-only (runtime nodejs, shared-secret 401, 503 unconfigured, 429 rate-limit); SOMNIA_OPERATOR_PK not NEXT_PUBLIC_; AGENT1_INPUTS pinned (no TODO(O-1)); targets 0xf0570C…7b1D | 1 | MOD5-AGENT1LIVE | integration/grep | `curl`/`browser_network_request` + `grep` guard | ❌ W1 | ⬜ pending |
| D4 mandate.chainId→31337 override + economicTheory PKE 0x06 pinned before resolveFromMandate; args [mandate,0n,1_000_000n] | 1 | MOD5-LIVE | unit | `pnpm vitest run tests/unit/cornerstone/mandate-override.test.ts` | ❌ W1 | ⬜ pending |
| producer emit ordering + reverted path (no quoteMargin, no minted claim) | 1 | MOD5-LIVE | unit | `pnpm vitest run tests/unit/cornerstone/producer-ordering.test.ts` | ❌ W1 | ⬜ pending |
| live|replay|mock mode switch + banner always visible (replay not broken) | 2 | MOD5-MODES/FALLBACK | e2e | `pnpm exec playwright test tests/e2e/cornerstone-modes.spec.ts tests/e2e/cornerstone-replay-smoke.spec.ts` | ❌ W2 | ⬜ pending |
| wagmi write wiring: `useSwitchChain` to 0x7a69 (31337) BEFORE the resolveFromMandate write + `useWriteContract({chainId:31337})` | 2 | MOD5-LIVE/SURFACE | e2e + grep | `grep -qE 'useWriteContract.*31337\|chainId.*31337' "app/(defi)/apps/abrigo/cornerstone/page.tsx"` + `cornerstone-modes.spec.ts` ordering assert | ❌ W2 | ⬜ pending |
| live→replay degradation: mock /api/abrigo/agent1 ok:false → banner flips to replay + aria-live fires + NO tx-hash element | 2 | MOD5-FALLBACK/SURFACE | e2e (mocked) | `pnpm exec playwright test tests/e2e/cornerstone-modes.spec.ts` | ❌ W2 | ⬜ pending |
| live mode shows BOTH explorer txs (Somnia Agent-1 + BuildBear Agent-2); narrative strike CONSTANT 360360 (only targetNotional varies) | 2 | MOD5-SURFACE | e2e (mocked) | `pnpm exec playwright test tests/e2e/cornerstone-modes.spec.ts` | ❌ W2 | ⬜ pending |
| honesty greps (no executed/realized, no `$` PnL, no raw 0x000…0, fork-verified never green, no `<details>` on decision card, mock fallback shows NO tx hash) | 2 | MOD5-SURFACE/FALLBACK | e2e | `pnpm exec playwright test cornerstone` | ✅ extend | ⬜ pending |
| verbatim no-bridge disclosure (es-CO+en) present in banner | 2 | MOD5-SURFACE | e2e | `pnpm exec playwright test` | ✅ extend | ⬜ pending |
| Evidence Collector replay + mock DOM (the guaranteed artifact verified) | 2 | MOD5-SURFACE/FALLBACK | live (EC) | Evidence Collector live-verify per CLAUDE.md | n/a | ⬜ pending |
| live two-chain end-to-end ON-CHAIN RUN (real Somnia Agent-1 tx + BuildBear Agent-2 tx + ExecutorDecided + PositionMinted + quoteMargin) | 2 | MOD5-LIVE/AGENT1LIVE/SURFACE | live (manual/EC) | Evidence Collector — ⊘ DEFERRED on external Somnia validator-callback recovery (deploy precondition RESOLVED); replay is the in-phase gate; NOT a Phase-9 completion gate | n/a | ⊘ deferred |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky · ⊘ deferred*

---

## Wave 0 Requirements

- [ ] `tests/unit/cornerstone/*.test.ts` — failing-first stubs for the decoders (`BalanceDelta`, int24, `extractStrike`), the artifact loader (`isExpired`), the CORS RPC proxy (`rpc-proxy.test.ts`), and the mode parser
- [ ] Mirror compiled ABIs via wagmi codegen (`MacroHedgeStrategist`, `MacroHedgeExecutor`, `IPanopticData`, + the MacroOracle `latest` read) + mirror `buildbear-deployments.json` into `lib/apps/abrigo/cornerstone/` (Turbopack-safe static import — recall the Phase-2/6 Velite/Turbopack JSON bundling lesson)
- [ ] Cross-check `TokenId.strike(0)` bit offset = 76 against `abrigo-somnia` panoptic-sdk `generated.ts` (do NOT reverse-fit from the fixture) and pin the `extractStrike` formula
- [ ] Run the `eth_chainId` browser/probe against the BuildBear RPC to confirm CORS posture; ship `app/api/cornerstone/rpc/route.ts` JSON-RPC proxy REGARDLESS (the probe decides direct-vs-proxy)
- [ ] T0 replay smoke asserts RPC-independence (fork RPC aborted at the network layer; replay still renders snapshot + 360360)

*Existing vitest + Playwright infrastructure covers the rest; no framework install needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Real live mint succeeds against a freshly provisioned sandbox (post Somnia recovery) | MOD5-LIVE | Requires a live, funded, fresh BuildBear sandbox (TTL-bound) + a connected wallet + Somnia validator callbacks landing; not reproducible in CI; ⊘ DEFERRED in-phase | Run §4b runbook → load `/apps/abrigo/cornerstone` → connect wallet → switch to fork → Confirm → assert real tx hash + decoded evidence via Evidence Collector (post-phase) |
| `wallet_switchEthereumChain`/`addEthereumChain` UX across MetaMask-injected vs WalletConnect | MOD5-LIVE | Real wallet behavior differs by provider; cannot mock faithfully (the switch-chain ORDERING is e2e-asserted via a mocked provider in Wave 2) | Manual test both provider paths in Wave 2 freshness gate |

---

## Validation Sign-Off

- [ ] All tasks have an `<automated>` verify OR an explicit Wave 0 dependency / manual-only justification
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (wagmi-codegen ABIs + MacroOracle latest, mirrored artifact, decoder stubs, offset-76 cross-check, CORS proxy, RPC-independent replay smoke)
- [ ] No watch-mode flags (CI-safe `vitest run`, not `vitest`)
- [ ] Feedback latency < 75s (full)
- [ ] `nyquist_compliant: true` set in frontmatter (after planner maps every task)
- [ ] The live on-chain RUN row is ⊘ DEFERRED (external Somnia recovery) and is NOT a Phase-9 completion gate; replay is the verified in-phase gate

**Approval:** pending
</content>
