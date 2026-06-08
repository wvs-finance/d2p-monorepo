# UI Agent Handoff — Macro-Hedge Cornerstone (Scenario 1)

*A self-contained brief for the frontend agent. Read this top-to-bottom and you can start building the UI for the Agentathon cornerstone on your own. Authored from the contract repo `abrigo-somnia`; the frontend lives in a separate repo (`/home/jmsbpp/apps/d2p/frontend`, ~98% built). Demo/testnet only. Deadline ≈ **June 11, 2026**.*

> **STATUS LEGEND** — ✅ LIVE/BUILT · 🟡 CORE COMMITTED (as a fork test, not deployed) · ⛔ PENDING (being built Phases 12–15). Build the UX + an integration layer against the shapes below; wire to mocks where ⛔, swap to real as each lands. **Do not assume an agent is callable on a live chain unless it's marked ✅.**

---

## 1. What you're building (the one deliverable)

ONE end-to-end screen flow — the cornerstone test the judges see — for **Scenario 1**:

> User: *"I think the central bank will raise rates, and I want protection **if** that macro shock transmits into COP/USD volatility."*

The UI drives a **two-agent → mint → monitor** pipeline and shows each step's reasoning to the user.

## 2. The flow (the UX you implement)

```
[1] PROMPT          User types the macro view (free text).
        │
        ▼
[2] AGENT 1  ── MacroHedgeStrategist (Somnia, llm-inference) ⛔
        │     Show "reasoning": reading CPI / inflation expectations / policy rate / terms-of-trade.
        │     Output: a TEXTUAL THESIS  +  a structured INSTRUMENT SPEC (which instrument — here: long cCOP/USD call).
        ▼
[3] AGENT 2  ── MacroHedgeExecutor (Polygon, Panoptic V2) 🟡
        │     Show "reasoning": checking the wCOP/USDC pool state + how representative it is of the FX risk
        │     (the "inflation adjustment"). Output: a concrete POSITION (strike/width/size/maxloss/upside).
        │     ► THIS DECISION IS SURFACED TO THE USER — a review/confirm step before minting.
        ▼
[4] MINT            The position is minted on the Polygon wCOP/USDC Panoptic V2 pool. Show tx + the minted position card.
        │
        ▼
[5] MONITOR  ── Monitoring agent ⛔   Live position performance (mark, premium accrued, margin health),
                                      updated over the position's lifetime. (Delta-hedge management = NOT in this demo.)
```

Each agent step has three UI states: **idle → reasoning (spinner + the data it's pulling) → result (the reasoning/decision rendered)**. Step [3]'s result is an explicit **user-facing decision card** (the differentiator: an autonomous agent's decision, shown, then executed).

## 3. Systems you integrate with

| System | Status | Where | What it gives the UI |
|---|---|---|---|
| **Somnia AI-agents platform** | ✅ | `0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776`, chain **50312**, RPC `https://api.infra.testnet.somnia.network` | the async `createRequest → handleResponse` agent calls |
| **LLM-Inference agent** | ✅ (agent live) | id `12847293847561029384` | Agent 1 & Agent 2 reasoning (`inferString`/`inferNumber`); consensus-verified |
| **keeper-proxy** (TE data, key hidden) | ✅ | `https://keeper-eta-pied.vercel.app` (re-verify host) | the macro data feed behind `MacroOracle` |
| **MacroOracle** | ✅ | Somnia testnet (deployed) | live TE macro factors (CPI=568 proven, etc.) |
| **MacroHedgeStrategist** (Agent 1) | 🟡 Phase 12 — re-semantic'd to emit the `HedgeMandate` (school + direction + target notional) via the two-leg `inferString`/`inferNumber` flow; **unit-proven offline (19/19) against a MockPlatform**, NOT yet deployed for this flow (the live "different prompt → different mandate" Somnia-testnet run is a deferred manual follow-up) | Somnia testnet (not deployed for this flow) | prompt → hedge MANDATE (§4) + the school label |
| **MacroHedgeExecutor** (Agent 2) | 🟡 Phase 13/14 done — the SHIPPED deployable `MacroHedgeExecutor` (`resolveFromMandate` / `resolveAndMint` / `_onResult` / `quoteMargin` all implemented + fork-proven on a Polygon fork; mints the real wCOP/USDC position at strike 360360). Fork-verified, NOT deployed to a public mainnet chain (BUSL-1.1, fork-only) | hosted Polygon fork (Phase 15) | pool-representativeness decision + the mint |
| **Monitoring** | ⛔ DEFERRED (MON-01) — the demo shows a BASIC position READ (mark/margin via `quoteMargin` + `numberOfLegs`), NOT a monitoring agent. Phase 14 became the representativeness brain | not built | basic position read (no live monitoring agent) |
| **Polygon wCOP/USDC pool + Panoptic V2** | ⛔ **fork-only** — the tokens/PoolManager below are REAL Polygon addresses, but **Panoptic V2 is only deployed inside the Foundry fork test** (`DeployProtocol`), NOT on live Polygon | PoolManager `0x67366782805870060151383F4BbFF9daB53e5cD6`; USDC(6dp) `0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359`; wCOP(18dp) `0x8a1D45e102e886510e891d2Ec656a708991e2D76`; factoryV4 `0x978e3286EB805934215a88694d80b09aDed68D90`; riskEngine `0x416C42991d05b31E9A6dC209e91AD22b79D87Ae6`; fee 3000, tickSpacing 60 | the option pool the position is minted on |

> **Two chains, but NOTHING for this flow is callable on a live chain yet.** Agents would run on **Somnia testnet (50312)** (testnet platform `0x037Bb9…6776` — **testnet-only; the mainnet address differs**); the mint/pool is on **Polygon** but Panoptic V2 + the executor exist only inside a fork test. **For now the UI builds entirely against MOCKS** (see §6).

## 4. Data shapes (what you send / render)

**Agent 1 output — hedge MANDATE** (decodes to the on-chain `HedgeMandate`; render the school label + direction + target notional). **Reconciled 2026-06-06**: Agent 1 emits the hedge INTENT (school + direction + target notional), NOT the leg geometry. The moneyness / strike / width / feasible-size GEOMETRY is now **Agent 2's** representativeness output (Phase 14, surfaced in `ExecutorDecided` — §5), NOT Agent 1's:
```jsonc
// HedgeMandate (src/types/HedgeMandate.sol) — Solidity types in (parens)
{
  "economicTheory":   "0x0000000000000000000000000000000000000005", // (IMacroThesis) the prompt-inferred school's resolvable handle — a non-zero SENTINEL (0x5 = SHILLER_MACRO_RISK, 0x6 = POST_KEYNESIAN) for the demo. The UI renders the HUMAN-READABLE school label from the event's `school` string, NOT this address (it is opaque, non-deployable).
  "underlyingMarket": "0x<bytes32>",                                  // (PoolId) keccak256(abi.encode(PoolKey)) of the wCOP/USDC pool — a 32-byte HASH, contract-supplied (PolygonPools.POLYGON_WCOP_USDC_POOL_ID()); the UI does NOT construct it, just passes it through. Treat as opaque bytes32.
  "targetNotional":   50000,                                          // (uint256) the cash-flow risk to hedge, in WHOLE USD notional units, clamped to [1000, 100000000]. NOT bps, NOT an optionRatio — Phase-14 maps it to a feasible leg size.
  "chainId":          137,                                            // (uint32) Polygon
  "isLong":           true                                            // (bool) derived direction (Scenario 1: hedge COP depreciation -> long cCOP/USD -> true)
}
```
> The UI renders the **`school` label** (from the `StrategistDecided` event string) + the human fields (direction `isLong`, `targetNotional`); it treats `underlyingMarket`/`economicTheory` as opaque pass-throughs. The leg geometry (strike/width/size) comes LATER, from Agent 2's `ExecutorDecided` (§5). Exact ABI: `src/types/HedgeMandate.sol`.

**Agent 2 output — the decision card to show the user** (from `DRAFT.md` Scenario 1):
```jsonc
{
  "market":      "wCOP/USDC (UniV4, Polygon)",
  "direction":   "LONG",
  "structure":   "CALL",
  "strike":      4.100,
  "width":       "5%",
  "size":        100,
  "maximumLoss": "PREMIUM_PAID",
  "upside":      "UNLIMITED",
  "thesis":      "Hawkish monetary-policy surprise → COP appreciation"
}
```

**Mint result / position card:** the minted Panoptic `TokenId`, the collateral/margin requirement (a `BalanceDelta` from `RiskManagement.quoteCollateralRequirements`), and the leg fields (strike, width, isLong).

**Monitoring feed:** `{ mark, premiumAccrued, marginHealth, pnl }` over time.

## 5. Events / reads — build a MOCK subscriber to THIS schema
Agent calls are async: you fire a request, the platform calls a `handleResponse` callback on the consumer, which **emits an event**. Build a mock that emits these (names/fields are the **intended contract**, finalized in Phases 12–14 — code your subscriber to this shape, swap the real ABI in at Phase 15):
```solidity
// MOCK schema (TypeScript-ize for the subscriber)
event StrategistDecided(bytes32 indexed decisionId, string school, HedgeMandate mandate);          // Agent 1 — the §4 MANDATE (intent), keyed by the block-independent decisionId, + the school label
// Agent 2 — the SHIPPED 8-param decision to SHOW the user (MacroHedgeExecutor.sol:94):
event ExecutorDecided(uint256 indexed requestId, uint8 regimeZt, uint256 inflationAdjustmentWad,
                      int24 strikeTick, int24 regimeWidth, bool parametricHedged, bool nonErgodicDisclosed, string rationale);
// the SHIPPED mint event (MacroHedgeExecutor.sol:111):
event PositionMinted(address indexed owner, TokenId indexed positionId, uint128 positionSize);
event PerformanceUpdated(TokenId indexed positionId, int256 mark, int256 premiumAccrued, uint256 marginHealthBps, int256 pnl); // DEFERRED (MON-01)
```
> **`ExecutorDecided` (8-param) render note:** render `nonErgodicDisclosed` (`true`) + the `rationale` (carries `"TEMPLATE: …"`) on the Agent-2 decision card — the Davidson honesty split.
> **`PositionMinted` margins note:** margins are NOT in this event — read them via `quoteMargin(positionId, strike) -> BalanceDelta`.
> **`PerformanceUpdated` is DEFERRED (MON-01):** the type stays documented, but the demo does NOT emit it; the basic position read (`quoteMargin` + `numberOfLegs`) replaces it.
> **Reconciled 2026-06-06 to the Agent-1 HedgeMandate correction; the frontend (separate repo) must swap its `StrategistDecided` subscriber to this shape at Phase 15.** Agent 1 now emits the hedge MANDATE (intent), NOT the leg geometry — the key is a `bytes32 decisionId` (block-independent, stable across the school/notional legs), the payload is the `HedgeMandate` struct (§4), and the second field is the human `school` label string. The moneyness/strike/width/size GEOMETRY moves to Agent 2's `ExecutorDecided` (Phase 14), so render the school + direction + target notional from `StrategistDecided`, and the leg geometry from `ExecutorDecided`.
- Drive the demo timeline off these four events (prompt → `StrategistDecided` → `ExecutorDecided` [user review/confirm] → `PositionMinted` → repeated `PerformanceUpdated`).
- Monitor reads (when real): Panoptic periphery `PanopticQuery` + `RiskManagement` margin getters — exact signatures land in Phases 13–14.

## 6. Phase 15 — the swap-to-real for the Agent-2 leg (hosted BuildBear fork)
Phase 15 IS the swap-to-real moment for the Agent-2 mint leg. The executor is SHIPPED and fork-proven; Phase 15 hosts the fork so the Vercel UI can reach it.

**The Agent-2 real path.** The frontend submits `resolveFromMandate(mandate, legIndex, positionSize)` against a HOSTED **BuildBear Sandbox** — a Polygon fork at **chainId 31337** (BuildBear re-chains the fork) reachable from the Vercel-deployed UI. The deployed executor/pool addresses + the sandbox RPC URL come from the deployments artifact `contracts/script/out/buildbear-deployments.json` (written by `contracts/script/provision-buildbear-demo.sh`, the provisioning runner that funds via `buildbear_ERC20Faucet`, deploys + reads back, and writes the artifact carrying `executor`/`pool`/`rpcUrl`/`mintTxHash`) — NOT a hardcoded constant. The artifact also carries the verifiable `mintTxHash` (a per-sandbox BuildBear explorer renders it). After the mint, read back `numberOfLegs(executor)` + `quoteMargin(positionId, strike)` for the basic position read.

**Single-RPC model + CORS.** BuildBear's sandbox has a SINGLE RPC that carries both standard JSON-RPC and the `buildbear_*` cheats; the browser uses that same RPC for reads/writes, while funding (`buildbear_ERC20Faucet`) stays server-side in the provisioning runner — never in client code. CORS caveat: if browser→BuildBear CORS is blocked (verify with one `eth_chainId` fetch), proxy the RPC through a Next.js route handler (the existing Somnia keeper-proxy pattern).

**Keep the mock alongside.** Keep the real-chain path ALONGSIDE the existing mock (the documented `fromMockEvent` isolation seam) so the demo degrades gracefully to the mock if the sandbox is down.

**On-screen honesty label (verbatim):** *"Agent 1 runs live on Somnia testnet; Agent 2 mints on a hosted Polygon fork (BuildBear) — the hedge mandate is carried between them by this app; there is NO cross-chain bridge in this demo (deferred)."*

**Agent-1 reality (do NOT subscribe to a live `StrategistDecided` on Somnia).** The deployed Somnia strategist is still the v1 (`HedgeDecisionMade(action, sizeBps)`); the Phase-12 `StrategistDecided(decisionId, school, HedgeMandate)` is source-only / unit-proven and is NOT deployed for this flow. So Agent-1-live in the demo = the real RECORDED v1 trace the frontend already renders, LIVE on real Somnia testnet **50312** (Somnia is NEVER forked — its consensus-validated inference + the keeper-proxy do not survive a fork). The `HedgeMandate` is carried as the Agent-1→Agent-2 hand-off VALUE OBJECT, labeled *"intent derived for this demo"*. Do NOT instruct the frontend to subscribe to a live `StrategistDecided` on Somnia or to deploy the Phase-12 strategist.

**CROSS-REPO BOUNDARY.** The frontend is a SEPARATE git repo at `/home/jmsbpp/apps/d2p/frontend` with its own commit discipline. The real-mint wiring is a deliverable committed in the FRONTEND repo, NOT in abrigo-somnia: a `defineChain({ id: 31337, rpc: BUILDBEAR_RPC_URL })` for the BuildBear Polygon-fork chain added to `lib/wagmi/config.ts` alongside the live Somnia chain; a mint panel calling `resolveFromMandate` + reading the position back; addresses/RPC sourced from `buildbear-deployments.json` mirrored into the frontend; a real `ExecutorDecided`/`PositionMinted` reader/writer added alongside `fromMockEvent`; repointing `wagmi.config.ts` at `contracts/out/` + `pnpm contracts:gen`. The abrigo-somnia MVP deliverable is the BuildBear provisioning script + the deployments artifact + this refreshed doc + the in-VM `quoteMargin` assertion + the CI — achievable + verifiable (the mint tx hash) even before the frontend wiring lands.

## 7. Scope guardrails (don't build these)
- **MON-01** — no monitoring agent; the demo is a BASIC position READ (mark/margin via `quoteMargin` + `numberOfLegs`) only.
- **HEDGE-01** — no delta-hedge / active position management; explicitly a later iteration.
- **XCHAIN-01** — no cross-chain bridge; the hedge mandate is carried by the app (the §6 no-bridge label).
- No **public / mainnet** Panoptic deploy — hosted fork (BuildBear) only; demo/testnet only.
- Don't invent agent contract addresses; use the ✅ ones, read the Agent-2 addresses from `buildbear-deployments.json`, and check source as they land.

## 8. Ground-truth source files (read these for exact ABIs as they land)
- `DRAFT.md` — the architecture + Scenario 1 + the JSON examples (the source of §2/§4).
- `contracts/test/fork/DemoMacroHedgeExecutor.fork.t.sol` — the **real** position-resolution + mint + addresses (the source of §3/§4).
- `contracts/src/types/{HedgeLegParams,PayoffTerms,PositionInfo,OptionType}.sol` — the exact structs.
- `contracts/src/{MacroHedgeExecutor,RiskManagement,OperationalCostManagement}.sol` + `interfaces/IMacroThesis.sol` — Agent 2 + risk/cost (being filled in Phase 13).
- `docs/superpowers/specs/2026-06-02-macro-hedge-strategist-design.md` — Agent 1 calling convention (`inferString`/`inferNumber`).
- `.planning/ROADMAP.md` (Phases 11–15) — the build order; the UI E2E is Phase 15.
- `agentathon/somnia-agents-examples/contracts/SentimentAnalyzer.sol` — the canonical llm-inference consumer pattern (how an agent call + callback looks).

---
*Maintained in `abrigo-somnia/docs/`. As Phases 12–15 land, the ⛔/🟡 rows flip to ✅ and the event/ABI sections get exact signatures — re-read before final wiring.*

> **Refreshed 2026-06-07 (Phase 15)** — executor shipped + fork-proven; Agent-2 leg mints on a hosted BuildBear Polygon-fork sandbox at chainId 31337 (addresses from `buildbear-deployments.json`); Agent-1 stays the recorded v1 trace live on Somnia; no bridge.
