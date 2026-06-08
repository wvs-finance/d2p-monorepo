---
phase: 09-cornerstone-live-tx-integration
verified: 2026-06-08T00:00:00Z
status: passed
score: 7/7 must-haves verified
re_verification: false
---

# Phase 9: Cornerstone Live-TX Integration (Module 5) Verification Report

**Phase Goal:** Ship the cornerstone with `replay` (real captured receipts) as the GUARANTEED in-phase artifact + the live two-chain path BUILT and wired against the now-LIVE two-leg strategist (`0xf0570CcB1271FFaFf4caCA628F3632257f177b1D`, Somnia 50312) and the BuildBear fork mint, unit/integration-proven. The live on-chain RUN is ⊘ DEFERRED (external Somnia validator-callback outage — backend "18-02"), NOT a completion gate.

**Verified:** 2026-06-08
**Status:** PASSED
**Re-verification:** No — initial verification.

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `replay` is the GUARANTEED in-phase artifact — renders snapshot end-to-end with fork RPC unreachable; `git tag cornerstone-replay-safe` marks the frozen build | ✓ VERIFIED | `git tag` returns `cornerstone-replay-safe`; `tests/e2e/cornerstone-replay-smoke.spec.ts` (107 lines) uses `page.route` + `abort` to kill the fork RPC before navigation and asserts snapshot + "360360" anchor; EC live-verify confirms replay ✓ PASS with real DOM screenshots |
| 2 | ABIs for MacroHedgeStrategist, MacroHedgeExecutor, IPanopticData, and MacroOracle `latest` are wagmi-generated in `lib/contracts/generated.ts` | ✓ VERIFIED | `generated.ts` exports `macroHedgeStrategistAbi` (with `StrategistDecided`, `decisionState`), `macroHedgeExecutorAbi` (with `ExecutorDecided`), `iPanopticDataAbi` (with `numberOfLegs`), `macroOracleAbi` (with `latest`); grep confirms all 4 named exports present (145 matches for the targeted symbols) |
| 3 | BuildBear fork (31337) registered as 6th wagmi chain via `createBuildBearChain(deployment.rpcUrl)` — no hardcoded endpoint; Somnia NOT in browser chains | ✓ VERIFIED | `lib/wagmi/config.ts` imports `BuildBearChainId`, `createBuildBearChain`; `chains` array has 6 entries including `buildBearFork`; transports has `[BuildBearChainId]: http(deployment.rpcUrl)`; grep for `rpc.buildbear.io` in `buildbear.ts` and `config.ts` both return clean; Somnia 50312 absent from `config.ts` chains |
| 4 | Decoders: `decodeBalanceDelta` sign-extends the low word via `BigInt.asIntN(128, ...)`; `extractStrike(positionId) === 360360` at sdk-cross-checked offset 76 | ✓ VERIFIED | `balance-delta.ts` uses `BigInt.asIntN(128, rawInt256 >> 128n)` for amount0 and `BigInt.asIntN(128, low128)` for amount1; `token-id.ts` pins `STRIKE_OFFSET = 76n` with citation `POOL_ID_SIZE(64) + getLegOffsetByIndex(0)(0) + STRIKE_STARTING_BIT(12) = 76` from panoptic-sdk; anchor comment `extractStrike(0x16057fa8064003c085e69280422n) === 360360` present |
| 5 | CORS proxy `app/api/cornerstone/rpc/route.ts` ships with `runtime='nodejs'`; forwards to `deployment.rpcUrl`; typed error handling | ✓ VERIFIED | File exists; grep confirms `export const runtime = 'nodejs'` and `fetch(deployment.rpcUrl, ...)` as forward target; no hardcoded `rpc.buildbear.io` literal; `rpc-proxy.test.ts` unit test covers the forward + error path |
| 6 | Live two-chain Agent-1 route (`/api/abrigo/agent1`) is BUILT + wired: server-only `runtime='nodejs'`; `SOMNIA_OPERATOR_PK` in t3 server schema only; two-leg sequence (oracle-freshness → school → poll → notional → StrategistDecided); `LEG_TIMEOUT_MS=120_000`; `serializeMandate` (no raw bigint across JSON); `DecisionFailed` + bounded timeout + partial-mandate terminals; rate-limited; 503 when unconfigured; targets `0xf0570CcB1271FFaFf4caCA628F3632257f177b1D`; O-1 inputs pinned (decisions 4083729/4083997); unit-tested in `agent1-route-logic.test.ts` | ✓ VERIFIED | `app/api/abrigo/agent1/route.ts` has `export const runtime = 'nodejs'`; `SOMNIA_OPERATOR_PK` appears only in `lib/env.ts` server block (never `NEXT_PUBLIC_`); `STRATEGIST_ADDRESS = '0xf0570CcB1271FFaFf4caCA628F3632257f177b1D'`; grep confirms `deliveredAt`, `requestSchoolDecision`, `LEG_TIMEOUT_MS`, `serializeMandate`; `agent1-inputs.ts` exports `AGENT1_INPUTS` with concrete `dataKey` (keccak256("co/inflation-rate")), citing decisions 4083729/4083997; 9 unit test files exist covering all four terminal paths |
| 7 | 6 UI-SPEC surfaces wired in the cornerstone page + `CornerstoneClientShell` (`useSwitchChain→31337` BEFORE `useWriteContract({chainId:31337})`); live/replay/mock mode switch; `runWorkflowLive` with `buildLiveMandate` (PKE-pinned `MINT_ECONOMIC_THEORY=0x…06` + D4 chainId→31337 override); `fromChainEvent` (strict:false, `recordedDecisionId` once); D1 Davidson split on `HedgeDecisionCardV2` (`nonErgodicDisclosed` pill + `(TEMPLATE)` rationale full weight, no `<details>`); es-CO/en copy + `docs/copy-review.md` sign-off | ✓ VERIFIED | `CornerstoneClientShell.tsx` imports `useSwitchChain`, `useWriteContract`, `parseMode`, `ModeBanner`, `FreshnessGate`; 6 surface components all exist and substantive (ModeBanner 178 lines, FreshnessGate 112, OnChainEvidencePanel 152, ExecutorRationalePanel 170, LiveTxStateRow 184, AgentCostPlaceholder 70); `workflow-engine.ts` exports `MINT_ECONOMIC_THEORY='0x0000000000000000000000000000000000000006'`, `buildLiveMandate`, `runWorkflowLive`; `HedgeDecisionCardV2.tsx` references `nonErgodicDisclosed`, `(TEMPLATE)` marker, and has zero `<details>` tags; `copy-review.md` has Phase 09-04 `somnia.cornerstone.live.*` namespace row; EC live-verify confirms replay ✓ PASS, mock ✓ PASS, degradation ✓ PASS |

**Score:** 7/7 truths verified

---

### Live On-Chain RUN: ⊘ DEFERRED (NOT a gap)

The live Somnia Agent-1 + BuildBear Agent-2 on-chain RUN is explicitly ⊘ DEFERRED per the v5 reframe. The deploy precondition is RESOLVED (strategist live at `0xf0570CcB1271FFaFf4caCA628F3632257f177b1D`). The deferral is caused by an external Somnia validator-callback outage (silent no-show on the school-leg inference callback; backend ref "18-02"; no owner ETA). This is documented in `09-LIVE-VERIFICATION.md` with the ⊘ DEFERRED verdict and gating reason. Per spec v5 and plan 09-05, the live RUN is NOT a Phase-9 completion gate. The route handles this gracefully: a bounded `LEG_TIMEOUT_MS` terminates the call and degrades to `replay` with an aria-live announce. This deferred row is scored as satisfied (not a gap) per the explicit v5 reframe.

---

### Required Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `tests/e2e/cornerstone-replay-smoke.spec.ts` | ✓ VERIFIED | 107 lines; `page.route` + `abort` for RPC; asserts snapshot decision + "360360" |
| `lib/apps/abrigo/cornerstone/mode.ts` | ✓ VERIFIED | Exports `CornerstoneMode`, `DEFAULT_MODE='replay'`, `parseMode` |
| `lib/contracts/generated.ts` | ✓ VERIFIED | `macroHedgeStrategistAbi`, `macroHedgeExecutorAbi`, `iPanopticDataAbi`, `macroOracleAbi` all present |
| `lib/apps/abrigo/cornerstone/buildbear-deployments.json` | ✓ VERIFIED | Contains `rpcUrl`, `chainId: 31337` |
| `app/api/cornerstone/rpc/route.ts` | ✓ VERIFIED | `runtime='nodejs'`; forwards to `deployment.rpcUrl` |
| `lib/apps/abrigo/cornerstone/balance-delta.ts` | ✓ VERIFIED | `BigInt.asIntN(128, ...)` sign-extension on both words |
| `lib/apps/abrigo/cornerstone/token-id.ts` | ✓ VERIFIED | `STRIKE_OFFSET=76n` with sdk citation; `extractStrike` exported |
| `lib/apps/abrigo/cornerstone/artifact-loader.ts` | ✓ VERIFIED | Static `import` from JSON; exports `deployment`, `isExpired` |
| `lib/apps/abrigo/cornerstone/buildbear.ts` | ✓ VERIFIED | Exports `BuildBearChainId`, `createBuildBearChain`, `createBuildBearPublicClient`; no hardcoded endpoint |
| `app/api/abrigo/agent1/route.ts` | ✓ VERIFIED | `runtime='nodejs'`; operator key; two-leg; bounded timeout; 503/401/429 |
| `lib/apps/abrigo/cornerstone/agent1-route-logic.ts` | ✓ VERIFIED | `serializeMandate`, `parseStrategistDecided`, `correlateDecisionFailed`, `evaluateLegOutcome`, `LEG_TIMEOUT_MS` exported |
| `lib/apps/abrigo/somnia/agent1-inputs.ts` | ✓ VERIFIED | `AGENT1_INPUTS` with concrete `dataKey`/`consensus`/`userIntent`; citations to decisions 4083729/4083997 |
| `lib/apps/abrigo/cornerstone/events.ts` | ✓ VERIFIED | `fromChainEvent` + `formatWadToPercent` exported; `recordedDecisionId` set once; `strict:false`; `nonErgodicDisclosed` in types |
| `lib/apps/abrigo/cornerstone/workflow-engine.ts` | ✓ VERIFIED | `MINT_ECONOMIC_THEORY='0x…06'`, `buildLiveMandate`, `runWorkflowLive` exported; `runWorkflow` retained |
| `components/defi/cornerstone/HedgeDecisionCardV2.tsx` | ✓ VERIFIED | `nonErgodicDisclosed` pill + `(TEMPLATE)` marker; zero `<details>` tags |
| `components/defi/cornerstone/ModeBanner.tsx` | ✓ VERIFIED | 178 lines; `aria-live="polite"`; live/replay/mock labels; dual explorer links in live; verbatim §0.2 disclosure gated to `isLive` (accepted by EC waiver 2026-06-08) |
| `components/defi/cornerstone/OnChainEvidencePanel.tsx` | ✓ VERIFIED | 152 lines; fork-verified pill; tx hash + strike + TokenId |
| `components/defi/cornerstone/ExecutorRationalePanel.tsx` | ✓ VERIFIED | 170 lines; expandable geometry fields; `nonErgodicDisclosed`/`rationale` absent (those are on the card per D1) |
| `components/defi/cornerstone/AgentCostPlaceholder.tsx` | ✓ VERIFIED | 70 lines; static; `OperationalCostManagement` present; no numbers |
| `components/defi/cornerstone/FreshnessGate.tsx` | ✓ VERIFIED | 112 lines; switch-chain CTA; gate states per UI-SPEC |
| `components/defi/cornerstone/LiveTxStateRow.tsx` | ✓ VERIFIED | 184 lines; state-machine rows; no fake explorer link |
| `tests/e2e/cornerstone-modes.spec.ts` | ✓ VERIFIED | 305 lines; mode-switch + honesty-grep + switch-chain-before-write + degradation |
| `docs/cornerstone-operator-runbook.md` | ✓ VERIFIED | 187 lines; STT/503 warning; ⊘ DEFERRED reframe; two-explorer expectation; provision steps |
| `.planning/phases/09-cornerstone-live-tx-integration/09-LIVE-VERIFICATION.md` | ✓ VERIFIED | Replay ✓ / Mock ✓ / Degradation ✓ / Live ⊘ DEFERRED with reason; waiver for §0.2 claim 4 accepted |

---

### Key Link Verification

| From | To | Via | Status |
|------|----|-----|--------|
| `buildbear.ts` | `artifact-loader.ts deployment.rpcUrl` | `rpcUrl` passed into `createBuildBearChain` — never a literal | ✓ WIRED |
| `cornerstone-replay-smoke.spec.ts` | `page.tsx` (replay mode) | Navigate in replay, fork RPC aborted via `page.route`; assert snapshot + "360360" | ✓ WIRED |
| `app/api/cornerstone/rpc/route.ts` | `deployment.rpcUrl` | `fetch(deployment.rpcUrl, ...)` as forward target | ✓ WIRED |
| `app/api/abrigo/agent1/route.ts` | `macroHedgeStrategistAbi` (live addr `0xf0570C…7b1D`) | `requestSchoolDecision`/`requestNotionalDecision`/`decisionState`/`StrategistDecided` against codegen ABI | ✓ WIRED |
| `app/api/abrigo/agent1/route.ts` | `MacroOracle.latest(dataKey).deliveredAt` | Oracle-freshness pre-check before school request | ✓ WIRED |
| `agent1-route-logic.ts` | `HedgeDecisionRequested` per-leg requestId | `correlateDecisionFailed` + `evaluateLegOutcome` terminal handling | ✓ WIRED |
| `workflow-engine.ts` | `resolveFromMandate` | `buildLiveMandate` → `writeContract({chainId:31337})` with PKE-pinned economicTheory | ✓ WIRED |
| `events.ts fromChainEvent` | `StrategistDecidedView.recordedDecisionId` | `decisionId.toString()` set once inside the adapter | ✓ WIRED |
| `HedgeDecisionCardV2.tsx` | `ExecutorDecidedView.nonErgodicDisclosed + rationale` | Full-weight rows; no `<details>` | ✓ WIRED |
| `CornerstoneClientShell.tsx` | `useSwitchChain(31337) → useWriteContract({chainId:31337})` | Switch to 0x7a69 BEFORE the resolveFromMandate write (v5 fix-4) | ✓ WIRED |
| `page.tsx` | `ModeBanner` + `FreshnessGate` | Mounted via `CornerstoneClientShell`; mode resolved via `parseMode` | ✓ WIRED |

---

### Requirements Coverage

| Requirement | Covered by Plans | Description | Status |
|-------------|-----------------|-------------|--------|
| MOD5-ABI | 09-01, 09-03 | wagmi-codegen ABIs; BalanceDelta sign-extend; extractStrike offset-76; 8-field ExecutorDecided + fromChainEvent reshape | ✓ SATISFIED |
| MOD5-CHAIN | 09-01 | Fork as 6th wagmi chain (rpcUrl from artifact); isExpired; typed artifact loader; CORS proxy | ✓ SATISFIED |
| MOD5-LIVE | 09-02, 09-03, 09-04, 09-05 | Live two-chain path BUILT + wired: oracle-freshness → school → poll → notional → StrategistDecided; buildLiveMandate (D4 + PKE); runWorkflowLive; bounded timeout; partial-mandate; serialized mandate. On-chain RUN ⊘ DEFERRED (external outage, not a gate) | ✓ SATISFIED (live path built + unit-proven; RUN ⊘ DEFERRED by explicit v5 reframe) |
| MOD5-FALLBACK | 09-01, 09-03, 09-04 | Honest replay degradation with aria-live announce; mock path intact; live→replay on Agent-1 ok:false; replay smoke RPC-independent CI gate | ✓ SATISFIED |
| MOD5-SURFACE | 09-04 | 6 UI-SPEC surfaces; mode banner always visible; verbatim §0.2 disclosure; dual explorer links (live); D1 card; geometry in expandable panel; cost placeholder static | ✓ SATISFIED |
| MOD5-AGENT1LIVE | 09-02, 09-05 | Server-only route; operator key in server schema; shared-secret 401; 503 unconfigured; 429 rate-limited; O-1 inputs pinned; two-leg sequence against live strategist; operator runbook | ✓ SATISFIED |
| MOD5-MODES | 09-01, 09-04 | `live|replay|mock` type; `DEFAULT_MODE='replay'`; mode always visible; replay frozen first via git tag; smoke test is the CI gate | ✓ SATISFIED |

---

### Anti-Patterns Found

| File | Pattern | Severity | Assessment |
|------|---------|----------|------------|
| `lib/apps/abrigo/cornerstone/buildbear-deployments.json` | `rpcUrl: "https://rpc.buildbear.io/..."` (literal in the artifact JSON) | INFO | Not a code anti-pattern. The artifact IS the source-of-truth; `buildbear.ts` and `lib/wagmi/config.ts` read from it dynamically, never hardcode it. Clean per spec. |

No TODOs, stubs, placeholder returns, or empty handlers found in Phase-9 production files.

---

### Human Verification Required

The following items require human observation but do not block the `passed` verdict (they are correctly deferred or waived):

1. **Live on-chain RUN (⊘ DEFERRED)**
   Test: Set `SOMNIA_OPERATOR_PK` + `AGENT1_ROUTE_SECRET`, provision fresh BuildBear fork (numberOfLegs(executor)==0), open `/apps/abrigo/cornerstone` in live mode, connect wallet, confirm.
   Expected: Two explorer links — Somnia tx (Agent-1 school+notional) + BuildBear tx (Agent-2 mint) + decoded ExecutorDecided rows + PositionMinted + OnChainEvidencePanel (strike 360360 + TokenId) + quoteMargin margins.
   Why human: Requires external Somnia validator-callback recovery (currently outage "18-02") + funded operator account + live wallet. Not a Phase-9 gate per v5 reframe. Documented in operator runbook.

2. **wallet_switchEthereumChain UX across MetaMask-injected vs WalletConnect**
   Test: Connect both provider types; trigger the live path; observe switch-chain modal behavior.
   Expected: Both providers surface the switch-chain dialog; wallet switches to fork 31337 before the write.
   Why human: Real wallet behavior differs by provider; mock-provider ordering is already e2e-asserted in `cornerstone-modes.spec.ts`.

3. **§0.2 no-bridge disclosure in live mode (production URL)**
   Test: Navigate to production `https://www.d2pfinance.xyz/apps/abrigo/cornerstone?mode=live` once Phase-9 code is deployed.
   Expected: Both verbatim disclosure lines (es-CO + en) visible in the ModeBanner in `isLive` state.
   Why human: EC ran against local prod build (production URL does not yet carry Phase-9 code). The waiver for claim-4 (§0.2 correctly absent from replay/mock) is accepted. Live-mode DOM verification on the production URL is post-deploy.

---

### Evidence Collector Verdicts (from 09-LIVE-VERIFICATION.md)

- Replay mode: **✓ PASS** — recorded run renders end-to-end, strike 360360, neutral fork pill, honesty greps clean, no tx-hash/explorer links, mode banner correct, nonErgodicDisclosed + (TEMPLATE) at full weight.
- Mock mode: **✓ PASS** — "modo demostración (sin cadena)" + FlaskConical, honesty greps clean.
- Live → replay degradation: **✓ PASS** — `setResolvedMode('replay')` on mount-probe failure, aria-live `<output>` announces flip, no tx-hash post-degradation.
- Live on-chain RUN: **⊘ DEFERRED** — Somnia validator inference callbacks silently not landing (external infra, no ETA; backend ref "18-02").
- §0.2 claim 4 (⚠ PARTIAL → waived 2026-06-08): §0.2 disclosure correctly absent from replay/mock; it is `isLive`-gated. Accepted per user approval.

---

## Summary

Phase 9 goal is achieved. All 7 must-have truths are VERIFIED against the codebase:

- Replay is frozen first with `git tag cornerstone-replay-safe` and an RPC-independent CI gate (`cornerstone-replay-smoke.spec.ts`).
- The complete ABI layer is wagmi-generated (MacroHedgeStrategist, MacroHedgeExecutor, IPanopticData, MacroOracle `latest`).
- The BuildBear fork is a registered 6th wagmi chain sourced from the artifact `rpcUrl` (no hardcoded endpoints).
- Both decoders (`decodeBalanceDelta` sign-extend, `extractStrike` at sdk-verified offset 76) are correct and unit-tested.
- The CORS RPC proxy ships and forwards to `deployment.rpcUrl`.
- The live two-chain Agent-1 route is server-only, hardened (401/429/503), O-1 inputs pinned, two-leg sequence built against the live strategist ABI, and unit-proven including the expected silent-no-show terminal path.
- All 6 UI-SPEC surfaces are wired, the mode switch operates correctly, `useSwitchChain→31337` precedes `useWriteContract({chainId:31337})`, and the live→replay degradation is announced via aria-live.

The live on-chain RUN is ⊘ DEFERRED due to the external Somnia validator-callback outage (backend "18-02"). This is explicitly NOT a Phase-9 completion gate per spec v5 reframe. The operator runbook documents the two-explorer reproduction path and the ⊘ deferred status. Phase 9 completes on replay+mock ✓ + built-and-wired live path + the ⊘ deferred row.

---

_Verified: 2026-06-08_
_Verifier: Claude (gsd-verifier)_
