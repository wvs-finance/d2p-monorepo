# Module 5 — Cornerstone live-tx integration (Scenario-1 E2E demo)

**Status:** REVISED v5 — REFRAME (user decision 2026-06-08). The two-leg strategist is now LIVE on Somnia (`0xf0570CcB1271FFaFf4caCA628F3632257f177b1D`, backend Phase 17), BUT Somnia validator LLM-inference callbacks are not landing (backend Phase 18 documented BLOCK — external infra, no ETA). So Phase 9 ships **`replay` (real captured receipts) as the GUARANTEED demo artifact** + the **live two-chain path BUILT and unit/integration-proven against the live address+ABI**, auto-lighting-up when Somnia recovers. The live on-chain RUN is NOT in-phase acceptance (gated ⊘ on external recovery). v2 passed 2-way review; v3 folded handoff deltas; v4 = Option-B live pivot; v5 = reframe + the 3-way-review blocker fixes. See the v5 block below; the §0.1/§2-M5/§3 "Agent-1 NOT live / never decode" lines are STRUCK (superseded by v4/v5 — Agent-1 IS wired live, gated on infra).

## Reframe v4 → v5 (2026-06-08): live built+wired, replay guaranteed, gated on Somnia recovery
Backend recheck (first-hand): milestone v2.1 deployed the two-leg `StrategistDecided` strategist LIVE on Somnia 50312 at **`0xf0570CcB1271FFaFf4caCA628F3632257f177b1D`** (LIVEDEP-01 ✓), with an adapted e2e runner + the oracle datum already delivered on-chain (`deliveredAt≠0`, scaledValue=584). This RESOLVES the v4 deploy precondition (my `FRONTEND-REQUEST-…` is superseded). BUT the live proof is BLOCKED: validator inference callbacks silently no-show (school-leg mines `status 0x1`, deterministic `decisionId 0x…b24ac1afbcefc708`, but `decisionState`=`(false,false,0,"")` through 480s; no `StrategistDecided`, no `DecisionFailed`; ~0.9 STT spent for zero decisions across 2 attempts). Root cause = Somnia testnet infra (pruned `getRequest`, `SubcommitteePaid` never fires, ~76% infra-funded). v1 uses the SAME layer → equally blocked. No owner/ETA.
**Therefore Phase-9 in-phase acceptance =**
- `replay` mode (captured receipts, TTL- and RPC-independent) is the GUARANTEED demo artifact, frozen FIRST (T0).
- The live two-chain path is BUILT + wired against the live address `0xf0570C…7b1D` + the codegen ABI, and unit/integration-proven (mocked viem). It includes the backend's re-invoke trigger so it works with NO code change the moment Somnia recovers.
- The live on-chain RUN is **⊘ DEFERRED** (gated on external Somnia validator recovery — backend's "18-02"); NOT a Phase-9 completion gate.
**v5 blocker fixes (from the 3-way review — all three NEEDS WORK; EVM layer verified correct):**
1. Strike §0.1/§2-M5/§3 recorded-Agent-1 "NON-NEGOTIABLE" lines (they contradict the live build) + update RESEARCH.md locked-decisions to Option-B.
2. **PIN `economicTheory = 0x…06` (PKE) on the MINT side** — a live SHILLER (`0x5`) mandate routes a different/possibly-reverting strike and breaks the 360360 anchor. Rule per mode: live mint pins PKE 0x6 (matches the fork-proven mint + the extractStrike===360360 anchor); the live `school` LABEL still renders from the event string. (If a true live SHILLER mint is ever wanted, branch the UI/strike + prove the SHILLER fork mint first.)
3. Add the **CORS Route-Handler JSON-RPC proxy** task (in VALIDATION W0 but missing from all plans) — ships regardless; `eth_chainId` probe decides direct-vs-proxy.
4. Verify the **`useWriteContract({chainId:31337})` + `useSwitchChain`** page wiring (grep + e2e: switch to 0x7a69 before write).
5. **Pin O-1** (`dataKey`/`consensus`/`userIntent`) from the live on-chain datum + the v1 trace (decisions 4083729/4083997, MacroOracle `0xAcA75144…`) — NOT a "best-known TODO"; the datum is already delivered so the read won't revert.
6. **Harden the STT route**: rate-limit + replay/nonce note + a runbook warning that `/api/abrigo/agent1` MUST be unconfigured (503) on any non-operator deploy (it auto-spends operator STT per call behind a single static secret).
7. Prove **replay survives an expired/unreachable fork RPC** (assert it renders with the RPC down — replay must not read the live RPC at render) + add route-level **`DecisionFailed` / `schoolSet&&!notionalSet` partial-mandate / timeout** unit tests (the silent-no-show is now the EXPECTED live state — the route must terminate gracefully, never hang, and surface the already-spent school STT).
EVM layer VALIDATED unchanged by all three reviewers: event shapes, `decisionId`-from-`HedgeDecisionRequested`-log, `decisionState` 4-tuple, `:365` chainId→31337 override, `legIndex 0`/`size 1e6`, BalanceDelta low-word sign-extend, TokenId strike offset 76, `quoteMargin` ordering, `requestId=0` sentinel, `decodeEventLog strict:false`.

## Governance v3 → v4 (2026-06-07): Option B — both agents live every iteration
User reversed the earlier "recorded Agent-1" call. Phase 9 now implements the FULLY-LIVE two-chain flow from `docs/cornerstone-live-twochain-PLAN.md`:
- **Agent-1 LIVE on Somnia 50312** via a server route (`POST /api/abrigo/agent1`, runtime nodejs, operator STT key server-side, shared-secret): `requestSchoolDecision` → poll `decisionState` → `requestNotionalDecision` → parse `StrategistDecided(decisionId, school, HedgeMandate)`; `DecisionFailed` terminal per leg; oracle freshness pre-check. Funded test account (>50 STT) pays per-run deposits. (Somnia is server-side only — NOT a browser chain; browser holds no STT key.)
- **Agent-2 LIVE mint** on the BuildBear fork (31337) — unchanged from v3 (D4 chainId override, legIndex 0, size 1e6, 8-field ExecutorDecided, PositionMinted, quoteMargin).
- **Three modes: `live | replay | mock`.** `replay` (real captured receipts from `snapshot.json`) is FROZEN FIRST (T0, `git tag cornerstone-replay-safe`) as the guaranteed demo artifact; `live` is the operator-driven/recorded showcase on top; `mock` (`fromMockEvent`) remains the always-works degradation. The live path NEVER blocks or breaks replay (Somnia validator-callback latency is real — plan §8 risk).
- **HARD CROSS-REPO PRECONDITION (non-blocking for FE build, blocking for live-verify):** the two-leg `StrategistDecided` strategist is implemented + 19/19 offline-proven but NOT deployed on Somnia (Phase-12 live deploy deferred; on-chain at `0xfA428171…` is still v1 emitting `HedgeDecisionMade`). The backend must REDEPLOY the two-leg version (new address) + run the adapted live proof + publish the new address/ABI/inputs. Requirement filed (Software Architect): `abrigo-somnia/docs/FRONTEND-REQUEST-2026-06-07-strategist-live-deploy.md`. The FE builds the live path against the KNOWN two-leg ABI now; live Evidence-Collector verification waits on the deploy (degrade to `replay`/`mock` until then).
- **Mandate serialization (server→browser):** the route serializes `HedgeMandate` as hex/decimal STRINGS (`economicTheory`/`underlyingMarket` hex, `targetNotional` decimal, `chainId` 137, `isLong`); the browser re-hydrates to the viem tuple (bigint targetNotional) and overrides `chainId = 31337` before `resolveFromMandate`. No raw bigint/bytes32 crosses JSON.
- **View-type reshape (per the plan §2):** `fromChainEvent` builds `WorkflowEventView` directly from decoded logs; `StrategistDecidedView.recordedDecisionId` = the log's bytes32 `decisionId.toString()` set ONCE inside the adapter (live has no outside-enrich wrapper); `HedgeLegParamsView` gains `nonErgodicDisclosed`/`parametricHedged` (D1); `PositionMintedView.positionId` from `PositionMinted.positionId`.
- **Honesty (unchanged + additions):** the live Agent-1 decision is REAL (consensus-verified, real STT tx) — render its real Somnia explorer tx; the mandate it produces is the real on-chain `HedgeMandate` (no longer "intent derived for this demo" — it's genuinely the agent's output once the two-leg strategist is live). Agent-2 stays `fork-verified` (never green) + the verbatim no-bridge disclosure. Per-run cost (STT on 2 inference legs + fork gas) is operator-borne. `replay`/`mock` never show a fake tx hash.
**Date:** 2026-06-07

## Review-resolution log (v1 → v2)
- **B1 (both reviewers): a fresh `resolveFromMandate` reverts against an already-used sandbox** — collateral is single-shot, owned by the *executor*, consumed by the provisioned mint → 2nd mint hits `AccountInsolvent` in `pool.dispatch`. **Resolved:** re-provision-per-run model (§4a) — each live run requires a FRESHLY provisioned sandbox (executor collateral unspent, `pool.numberOfLegs(executor)==0`); a mount-time **freshness gate** enables live-submit only when the executor has no open position, else falls back to mock. Concrete re-provision + re-mirror runbook with owner/timing (§4b).
- **B2 (both): signer model was a red herring** — `resolveFromMandate` has NO access control; success depends on the *executor's* collateral, not the caller's; the signer only pays gas. **Resolved:** §4a corrected — drop the server-key-vs-wallet auth debate; the enabling action is re-provision (fresh executor collateral), and the browser wallet needs only fork gas. Server-key path retained ONLY as an optional gas-convenience, explicitly not an auth/funding requirement.
- **B3 / M4 (both): agent cost ledger is not deployed, has no address, `totalCost` uncallable.** **Resolved:** per user decision, cost ledger becomes a STATIC labelled placeholder (§5.3) — no `totalCost` call, no address, no fake numbers.
- **M3 (both): pin demo constants.** `economicTheory = address(0x6)` (POST_KEYNESIAN — the only sentinel reproducing strike 360360; `0x5`/SHILLER mints a different/possibly-reverting position), `legIndex = 0`, `positionSize = 1e6`. These are demo CONSTANTS, not a mandate-derived mapping (§2, §4a).
- **M1: `BalanceDelta` decoder rigor.** Explicit sign-extension spec + amount1-negative fixture (§2).
- **M2: `quoteMargin` ordering.** `strike` arg comes from the minted TokenId's leg-0 (`positionId.strike(0)`), read STRICTLY after a confirmed `PositionMinted` (reverts `PositionNotOwned` otherwise) (§2, §4a).
- ~~**M5: `StrategistDecided` is never decoded from a live log**~~ STRUCK by v4/v5 — the two-leg shape is deployed live (`0xf0570C…7b1D`); decoded server-side in `live` mode, captured in `replay`, mocked in `mock` (§2, §3, v5 block).
- **Minors:** `ExecutorDecided.requestId`/`RepresentativenessAssessed.requestId` are sentinel `0` on the direct path → not surfaced as meaningful; `PositionMinted` has 2 indexed topics (owner, positionId) + positionSize in data; decoder tolerates the extra `RepresentativenessAssessed` log; `address(0)` economicTheory → em-dash (never raw zero).
- **Validated unchanged by both reviewers:** the entire §0 honesty contract, the §2 ABI field order/types, and the §0.6 `_onResult`-unexecuted framing.

## Backend-handoff reconciliation (v2 → v3, 2026-06-07)
Re-read the refreshed `abrigo-somnia/docs/UI-AGENT-HANDOFF.md` (Phase-15, 2026-06-07) — the authoritative frontend handoff. Our v2 was ~90% aligned; the following VERIFIED deltas are folded in. (An Explore agent fabricated a non-existent `docs/cornerstone-live-twochain-PLAN.md` with fake citations incl. a live `/api/abrigo/agent1` Somnia route — DISCARDED; the handoff line 120 explicitly forbids subscribing to a live `StrategistDecided`. Every item below was verified first-hand against the handoff or the contract source.)

- **D4 [NEW — CRITICAL, verified at `MacroHedgeExecutor.sol:365`]:** `require(uint256(legParams.chainId) == block.chainid, "No crosschain allowed yet")`. The mandate carries `chainId = 137` (Polygon; handoff §4 line 65), but the BuildBear fork's `block.chainid` is `31337`. The frontend MUST override `mandate.chainId = 31337` (the connected fork's `block.chainid`) before `resolveFromMandate`, else the live mint reverts. Folded into §2 + §4a.
- **D1 [CHANGES — handoff line 102, "the Davidson honesty split"]:** render `ExecutorDecided.nonErgodicDisclosed` (the honesty flag, value `true`) + the `rationale` string (which carries `"TEMPLATE: …"`, sourced from the EVENT — never from the executor's `private` constants) ON the Agent-2 decision card at FULL weight (not collapsed), explicitly marked "(TEMPLATE)". The OTHER `ExecutorDecided` fields (`regimeZt`, `inflationAdjustmentWad`, `strikeTick`, `regimeWidth`, `parametricHedged`) stay in the expandable post-mint evidence panel (§5.2). Updates §5 + the UI-SPEC.
- **D2 [DECISION — user 2026-06-07, handoff line 122]:** add `defineChain({ id: 31337 })` to `lib/wagmi/config.ts` as a 6th chain (the handoff's recommended way), NOT isolated. Writes use wagmi `useWriteContract({ chainId: 31337 })` + `useSwitchChain`. This SUPERSEDES the v2/research "isolate buildbear out of wagmiConfig" stance for the WRITE path. Reads may still use a dedicated viem public client. `SupportedChainId` widening is accepted for the demo. Rewrites §3 (architecture) + MOD5-CHAIN.
- **D3 [NEW — handoff line 122]:** generate the executor/strategist/pool ABIs via wagmi codegen — repoint `wagmi.config.ts` at the foundry `contracts/out/` and run `pnpm contracts:gen` (preferred over hand-mirrored static JSON). The `buildbear-deployments.json` artifact is still mirrored into the frontend for addresses/RPC (`isExpired` honored). Folds into MOD5-ABI/MOD5-CHAIN.
- **D5 [CONFIRMS]:** `economicTheory` sentinel `0x…06` = POST_KEYNESIAN (the only one reproducing strike 360360); render the human `school` label from the `StrategistDecided` event STRING, treat `economicTheory`/`underlyingMarket` as opaque pass-throughs; `targetNotional` is whole-USD `[1000, 100000000]`. Already in v2.
- **D6 [CONFIRMS — handoff §7]:** monitoring stays DEFERRED (MON-01); the demo's only position read is `quoteMargin(positionId, strike)` + `numberOfLegs(executor)`. No `PerformanceUpdated`. Already in v2.
- **Reference [handoff line 138]:** `agentathon/somnia-agents-examples/contracts/SentimentAnalyzer.sol` is the canonical llm-inference consumer pattern — relevant only as reference; NOT used, since Agent-1 is the recorded trace (no live agent call from the FE).
**Supersedes scope of:** the deferred mock-only swap implied by Module 4's `fromMockEvent` seam.
**Builds on:** Phase 8 (`/apps/abrigo/cornerstone`, `workflow-store`, `WorkflowEvent`/`fromMockEvent`, RunTranscript, HedgeDecisionCardV2, MintCard), Phase 6 (recorded Somnia decision + reader), Phase 7 (`fork-verified` tier, DecisionPipelineTrace, LivenessPill, useSyncExternalStore pattern).

---

## §0 — Binding honesty contract (NON-NEGOTIABLE, overrides all else below)

These are derived verbatim from `abrigo-somnia/docs/UI-AGENT-HANDOFF.md` (Phase-15 refresh) and CLAUDE.md (CROSS-09 / LAB-05). Any plan task that violates one is a BLOCKER.

1. ~~**Agent-1 is NOT live.**~~ **STRUCK by v4/v5.** The two-leg `StrategistDecided(decisionId, school, HedgeMandate)` IS now deployed live on Somnia 50312 (`0xf0570C…7b1D`). Agent-1 is **wired live** (server route, two-leg) AND `replay` carries the recorded trace (decisions 4083729 / 4083997) as the guaranteed artifact while Somnia validator callbacks are down. The live decision, when it lands, is real/consensus-verified; in `replay` it is honestly labelled "grabación" / "recorded run". (The original recorded-only prohibition here is superseded — see the v4/v5 blocks above.)

2. **Agent-2 mint is a Polygon FORK, not mainnet.** The live tx is submitted to a **BuildBear hosted Polygon fork (chainId 31337)** — NOT public Polygon, NOT a bridge. Provenance stays **`fork-verified`** (neutral, never green). The verbatim on-screen disclosure (es-CO first, en second) MUST be present whenever a live tx path is shown:
   > "El Agente 1 corre en vivo sobre la testnet de Somnia; el Agente 2 acuña sobre un fork de Polygon alojado (BuildBear) — el mandato lo transporta esta app entre ellos; en esta demo NO hay puente entre cadenas."
   > "Agent 1 runs live on Somnia testnet; Agent 2 mints on a hosted Polygon fork (BuildBear) — the hedge mandate is carried between them by this app; there is NO cross-chain bridge in this demo."

3. **No hardcoded fork addresses.** `executor`, `pool`, `riskManagement`, `rpcUrl`, `mintTxHash`, `mintedStrike`, `chainId` come from a mirrored `buildbear-deployments.json` artifact committed under `lib/apps/abrigo/cornerstone/`. The artifact carries `capturedAt`; the UI MUST treat the sandbox as **expirable** (3-day TTL) and degrade gracefully when the RPC is unreachable (see §4 fallback).

4. **The mandate is carried by the app, not bridged.** Agent-1's recorded decision is mapped (in-app) to a `HedgeMandate` that Agent-2 consumes on the fork. This is an honest "the app relays" affordance, never presented as on-chain interop.

5. **Never imply "executed/realized" on mainnet.** No `executed`/`realized`/`ejecutad`/`realizad` in rendered DOM. No `$`-prefixed value presented as realized PnL. Status pills always color+icon+text. The decision card never collapses under `<details>` (FAIL/PASS equal weight).

6. **`_onResult` (Somnia→Polygon live callback) is unexecuted.** We do NOT simulate or claim the live cross-chain callback. The frontend submits `resolveFromMandate` directly on the fork — that is the honest, working path.

7. **Mock fallback is honest, not a downgrade.** When the live path is unavailable (sandbox expired, no signer, RPC/CORS failure), the existing `fromMockEvent` path renders the same transcript under an explicit "modo demostración (sin cadena)" / "demo mode (no chain)" label. The fallback MUST be visually distinct from a real on-chain run (no real tx hash, no block link).

---

## §1 — Goal & scope

A judge at `/apps/abrigo/cornerstone` picks a preset (or free-text → nearest preset). The workflow streams chatbot-style:

1. **Agent-1 step** — REAL recorded Somnia decision (unchanged from Phase 8): single factor `co/inflation-rate` → consensus → mandate. Under `testnet-agent`/consensus-verified.
2. **Agent-2 decision card** — the recorded decision is mapped to a `HedgeMandate`; user **Confirms**.
3. **Live mint** — on Confirm, the browser wallet submits `resolveFromMandate(mandate, legIndex, positionSize)` to the BuildBear executor; the UI waits for `ExecutorDecided` + `PositionMinted`, then reads `quoteMargin` and the cost ledger.
4. **Evidence** — real mint **tx hash** + **strike** + **TokenId** + **ExecutorDecided rationale fields** + **agent cost ledger** rendered under `fork-verified` provenance with the §0.2 disclosure.

**In scope (per user decision 2026-06-07):** live tx submission; agent cost ledger; real mint tx hash + strike; ExecutorDecided rationale fields.
**Out of scope:** school-branch UI (SHILLER vs PKE selector); live Somnia StrategistDecided; cross-chain bridge; monitoring agent; idb run history (still deferred from 08-03).

---

## §2 — ABI reconciliation (the stale-contract fix)

The current `lib/apps/abrigo/cornerstone/events.ts` `WorkflowEvent` union predates the final ABIs. It MUST be reconciled. Confirmed real shapes (from compiled ABIs in `abrigo-somnia/contracts/out/`):

```solidity
// MacroHedgeStrategist
event StrategistDecided(bytes32 indexed decisionId, string school, HedgeMandate mandate);
struct HedgeMandate { address economicTheory; bytes32 underlyingMarket; uint256 targetNotional; uint32 chainId; bool isLong; }

// MacroHedgeExecutor
event ExecutorDecided(uint256 indexed requestId, uint8 regimeZt, uint256 inflationAdjustmentWad,
                      int24 strikeTick, int24 regimeWidth, bool parametricHedged,
                      bool nonErgodicDisclosed, string rationale);
event PositionMinted(address indexed owner, TokenId indexed positionId, uint128 positionSize);
function resolveFromMandate(HedgeMandate calldata mandate, uint256 legIndex, uint128 positionSize) external returns (TokenId);
function quoteMargin(TokenId id, int24 strike) external view returns (BalanceDelta);

// OperationalCostManagement (NOT access-controlled / NOT wired to executor — standalone read)
event AgentCostAccrued(bytes32 indexed decisionId, uint256 somi, uint256 cummSomi);
event DataCostAccrued(bytes32 indexed decisionId, uint256 dataCost, uint256 cummData);
function totalCost(bytes32 decisionId) external view returns (uint256 somi, uint256 data);
```

**Reconciliation rules:**
- `PositionMintedEvent.marginToken0/1` are NOT on the `PositionMinted` event. Margins come from `quoteMargin(TokenId, strikeTick)` (a `BalanceDelta` = packed `int128,int128`). The view model keeps `marginToken0/1: bigint` but they are sourced from `quoteMargin`, decoded at the edge (sign preserved).
- `ExecutorDecidedView` gains: `regimeZt: number`, `inflationAdjustment: string` (WAD→percent at edge), `strikeTick: number` (SIGNED int24), `regimeWidth: number` (SIGNED int24), `parametricHedged: boolean`, `nonErgodicDisclosed: boolean`, `rationale: string` (verbatim free-text).
- Cost ledger is NOT read on-chain (B3/M4: `OperationalCostManagement` is not deployed, has no address in the artifact, `totalCost` uncallable). It is a STATIC labelled placeholder only (§5.3) — no `totalCost` call, no `AgentCostView`, no fake numbers.
- `BalanceDelta` decode (M1): a single 256-bit value packing two `int128` — **upper 128 bits = amount0, lower 128 bits = amount1** (`v4-core/src/types/BalanceDelta.sol:6-8`). Decoder at the edge: `amount0 = asIntN(128, value >> 128n)` (arithmetic), `amount1 = asIntN(128, value & ((1n<<128n)-1n))` — the low word MUST be sign-extended (BalanceDelta.sol:61-71 uses `signextend(15, …)` = sign-extend from bit 127). Unit-tested with an **amount1-negative** fixture specifically (the masked low word is the easy sign-extension bug). `quoteMargin` returns this as ABI `int256`.
- `economicTheory` is a real sentinel address (`0x5`=SHILLER / `0x6`=POST_KEYNESIAN; `IMacroThesis.sol:35-36`), NOT `address(0)`. The demo mint pins `0x…06` (the only sentinel reproducing strike 360360). `schoolLabelFromAddress`: `0x6`→"POST_KEYNESIAN", `0x5`→"SHILLER_MACRO_RISK", `address(0)`→em-dash, unknown→em-dash (never raw hex).
- ~~`StrategistDecided` is NEVER decoded from a live log (M5)~~ **STRUCK by v4/v5:** the two-leg shape IS deployed live (`0xf0570C…7b1D`); the server route DOES `decodeEventLog` it from the live Somnia receipt (server-side). In `replay` mode it is sourced from captured receipts; in `mock` from `fromMockEvent`. (Live decode is gated only by the external Somnia validator-callback outage, not by deployment.)
- `ExecutorDecided.requestId` and `RepresentativenessAssessed.requestId` are sentinel `0` on the direct `resolveFromMandate` path — do not surface `requestId` as a meaningful field. `PositionMinted` has 2 indexed topics (`owner`, `positionId`) + `positionSize` in data. The decoder tolerates the extra `RepresentativenessAssessed` log (emitted on every mint) rather than erroring on an unrecognized topic (viem `decodeEventLog` with `strict: false`).
- **D4 — `mandate.chainId` override (CRITICAL, `MacroHedgeExecutor.sol:365`):** the executor enforces `require(uint256(legParams.chainId) == block.chainid, "No crosschain allowed yet")`, and the mandate carries `chainId = 137` (Polygon). Before `resolveFromMandate`, the FE MUST set `mandate.chainId = 31337` (the connected fork's `block.chainid`) — else the live mint reverts. Do this in the mandate re-hydration step, sourcing the value from the connected chain, not a constant.
- **D3 — ABI source via wagmi codegen:** repoint `wagmi.config.ts` at the foundry `contracts/out/` (`MacroHedgeExecutor`, `MacroHedgeStrategist`, `IPanopticData` for `numberOfLegs`) and run `pnpm contracts:gen` to generate typed ABIs — preferred over hand-mirrored static JSON. The `buildbear-deployments.json` artifact is still mirrored for addresses/RPC.

---

## §3 — Architecture (the live producer behind the existing seam)

The `workflow-store` and `RunTranscript` are UNCHANGED. Only the **event producer** swaps: `workflow-engine.ts` gains a `runWorkflowLive()` alongside the existing timed mock `runWorkflow()`.

```
RunTranscript (useSyncExternalStore — unchanged)
  └─ workflow-store (reducer, stable ref — unchanged)
       └─ producer (selected at runtime):
            ├─ runWorkflowLive(signer, deployment)   ← NEW
            │     1. emit StrategistDecided (LIVE: decoded from the Somnia server-route receipt; REPLAY: captured; MOCK: fromMockEvent)
            │     2. await user Confirm
            │     3. writeContract resolveFromMandate(mandate, legIndex, positionSize)
            │     4. waitForTransactionReceipt → parse logs (ExecutorDecided, PositionMinted)
            │     5. read quoteMargin + totalCost
            │     6. emit ExecutorDecided / PositionMinted / AgentCost (decoded via fromChainLog)
            └─ runWorkflow()  (mock, unchanged — fallback)
```

- **New chain config (D2 — user decision: handoff's way):** `defineChain({ id: 31337, rpcUrls: <from artifact> })` for the BuildBear Polygon fork, added to `lib/wagmi/config.ts` as a 6th chain ALONGSIDE the existing five. `SupportedChainId` is widened to include 31337 (accepted for the demo). The write path uses wagmi `useSwitchChain` (switch to 31337) + `useWriteContract({ chainId: 31337 })` — NOT raw EIP-1193, NOT an isolated standalone walletClient (this SUPERSEDES the v2/research isolation stance). Reads may use a dedicated viem public client built from the artifact RPC (the freshness-gate `numberOfLegs` read + `quoteMargin` need no wallet). The RPC URL comes from the mirrored artifact at runtime — `defineChain` is constructed with the artifact's `rpcUrl`, never a hardcoded endpoint.
- **New decoder:** `fromChainLog(log) → WorkflowEventView` — the real-ABI sibling of `fromMockEvent`, using `decodeEventLog` (`strict: false`) from viem with the wagmi-generated ABI. Same output view types (downstream stable). This is where BigInt/int24/BalanceDelta/WAD are formatted (the burn-class edge).
- **Artifact mirror:** `lib/apps/abrigo/cornerstone/buildbear-deployments.json` (committed) + a typed loader that validates required fields and exposes `isExpired(nowMs)` (capturedAt + 3 days).
- **Server proxy:** if BuildBear RPC is CORS-blocked from the browser (verify with one `eth_chainId` fetch on mount), reads/writes route through a Next.js Route Handler (`app/api/cornerstone/rpc/route.ts`) that forwards JSON-RPC (mirrors the existing Somnia keeper-proxy pattern). The spec REQUIRES the reachability probe on mount that decides live-vs-fallback BEFORE the user clicks Confirm.

---

## §4a — Live-tx flow, the freshness gate, and failure handling

**Why a freshness gate (the B1 fix).** Collateral on the fork is deposited ONCE (by the provisioning broadcast) into the *executor*, and a single `resolveFromMandate(mandate, 0, 1e6)` consumes it to mint the position recorded in the artifact. A second mint against the same sandbox reverts `AccountInsolvent` inside `pool.dispatch` (`MacroHedgeExecutor.sol:386-417`). Therefore **live-submit is only valid against a FRESHLY provisioned sandbox whose executor has no open position yet.** The UI must detect this, never assume it.

Preconditions probed on mount (all must pass to OFFER live-submit):
1. Mirrored artifact present AND not expired (`capturedAt + 3d > now`).
2. `eth_chainId` probe to the fork RPC returns `0x7a69` (31337).
3. **Freshness:** `pool.numberOfLegs(executor) == 0` — the executor holds no position, so its collateral is unspent and the mint will succeed. (If `> 0`, the recorded mint already consumed collateral → live-submit would revert.)
4. A wallet connector is available (existing RainbowKit) AND, after wagmi `useSwitchChain` to `31337`, the connected EOA has fork gas. (Auth is NOT required — `resolveFromMandate` is permissionless; the signer only pays gas. Collateral belongs to the executor, not the signer — B2.)

Branch on the probe:
- **Fresh sandbox (3 passes + wallet):** offer live-submit. Confirm submits `resolveFromMandate(mandate, 0n, 1_000_000n)` with `mandate.economicTheory = 0x…06` **and `mandate.chainId` overridden to `31337` (the connected fork's `block.chainid`) — D4, else `MacroHedgeExecutor.sol:365` reverts "No crosschain allowed yet"**. Transcript states (each an append-only `aria-live` polite announcement): `submitting` (wallet prompt) → `pending` (tx broadcast, real hash shown immediately; fork-explorer link only if BuildBear exposes one, else monospace hash, NO fake link) → `confirmed` (receipt status 1; decode `ExecutorDecided` + `PositionMinted` from the receipt logs; then read `quoteMargin(positionId, positionId.strike(0))`) → render evidence.
- **Used sandbox (freshness fails) OR expired/unreachable OR no wallet:** live-submit is NOT offered. Run the mock path under the explicit "modo demostración (sin cadena)" / "demo mode (no chain)" label — NO real tx hash, NO block link, visually distinct from a live run. The mode is ALWAYS visible; never a silent substitution.
- **`reverted` (receipt status 0):** honest error state, no partial "minted" claim; offer the mock fallback.
- **`error`** (user rejected / chain-switch refused / RPC down mid-flight): graceful message + mock fallback.

**Read-after-mint ordering (M2):** `quoteMargin` reverts `PositionNotOwned` if the position was never minted — call it STRICTLY after a confirmed `PositionMinted`, with `strike` extracted from the minted TokenId's leg 0 (`positionId.strike(0)`), NOT from the artifact's `mintedStrike` (which only happens to equal it). Margins (`BalanceDelta`) decoded at the edge with sign extension (§2).

**Signer model (B2 corrected).** The auth/funding debate from v1 was misdiagnosed: the executor's collateral is what mints, the caller only pays gas, and `resolveFromMandate` is permissionless. So the browser wallet calling directly is fine provided it has fork gas. A server-held key is retained ONLY as an optional gas convenience for the demo (so the judge needn't hold fork ETH) — it is explicitly NOT an auth or funding requirement. If used, the Route Handler MUST: server-fix the payload (`mandate`/`legIndex`/`positionSize` constants, never client-supplied), be sandbox-only/disposable key, rate-limited, and the key never reaches the browser.

## §4b — Re-provision-per-run runbook (the B1/B3-timing fix; backend-owned, in-spec contract)

Because each live run needs a fresh executor, and the sandbox TTL (~3 days) likely lapses by demo day (~Jun 11), the team commits to this runbook BEFORE each live demo run. This is a backend action (script lives in `abrigo-somnia`), but the spec pins the FE-facing contract:

1. **Provision** (backend owner): run `abrigo-somnia/contracts/script/provision-buildbear-demo.sh` → fresh sandbox, fresh executor + deposited collateral, one recorded mint. Produces a new `buildbear-deployments.json` (new addresses, RPC, mintTxHash, capturedAt).
   - NOTE: the provisioning script's own mint consumes the collateral. For a *live in-demo* mint, provision a sandbox WITHOUT the inline mint (or with a second funded executor) so `numberOfLegs(executor)==0` at demo time. **Open item for backend (§7.4): provide a `--no-mint` / fresh-executor provisioning variant so the freshness gate passes.** Until that exists, the live path degrades to read-back+mock; this is the honest default.
2. **Mirror** (FE owner): copy the new artifact to `lib/apps/abrigo/cornerstone/buildbear-deployments.json`, commit. The typed loader validates required fields + `isExpired(nowMs)`.
3. **Timing buffer:** provision morning-of with TTL covering the demo window; if the gate fails at showtime, the mock fallback carries the demo honestly.
4. **Owner + when:** named in the phase plan's checkpoint; not left implicit (resolves review M2/B3).

---

## §5 — Surfaces to add (per user selection)

1. **Real mint tx hash + strike + TokenId** — under `fork-verified`, with §0.2 disclosure. Hash monospace, copyable; strike via existing `formatScaledPercent`/tick formatter; TokenId as string.
2. **ExecutorDecided fields — split across two surfaces (D1, the "Davidson honesty split", handoff line 102):**
   - **ON the Agent-2 decision card, FULL weight (never collapsed):** `nonErgodicDisclosed` (the honesty flag, rendered as a labelled color+icon+text row — never hidden) + the `rationale` string, **explicitly marked "(TEMPLATE)"** and sourced from the `ExecutorDecided` EVENT string (never from the executor's `private` constants). In mock/fallback mode these render from the mock event; in live mode from the decoded log.
   - **In the expandable post-mint evidence panel (NOT the decision card):** the remaining fields — `regimeZt` label, `inflationAdjustment` %, `strikeTick`, `regimeWidth`, `parametricHedged` — as color+icon+text rows. This panel may use the disclosure/expand pattern (non-dispositional evidence); the decision card never does.
3. **Agent cost — STATIC placeholder panel** (B3/user decision): no on-chain read. Renders a clearly-labelled capability note (es-CO+en): "Contabilidad de costos del agente: implementada on-chain (`OperationalCostManagement`) — no desplegada para esta demo." / "Agent cost accounting: implemented on-chain — not deployed for this demo." No `totalCost` call, no numbers, no address. Shows the capability exists without faking data.

---

## §6 — Acceptance (what must be TRUE)

- `events.ts` reconciled to real ABIs; `fromChainLog` decoder unit-tested incl. negative `BalanceDelta` and negative int24 strike; `fromMockEvent` kept for fallback.
- Freshness gate works: when `pool.numberOfLegs(executor)==0` (freshly provisioned), clicking Confirm submits a real `resolveFromMandate(mandate, 0n, 1_000_000n)` (economicTheory=`0x…06`) on chainId 31337 and the UI renders the REAL resulting tx hash + decoded ExecutorDecided + PositionMinted + `quoteMargin(positionId, strike(0))`. When the executor already has a position (used sandbox), live-submit is NOT offered and the mock fallback runs under the demo-mode label. (Verified by Evidence Collector against a freshly provisioned sandbox via the §4b runbook.)
- Cost panel is static "not deployed for this demo"; no `totalCost` call anywhere.
- Fork addresses/RPC sourced ONLY from the mirrored artifact; `isExpired` honored; no hardcoded addresses anywhere; demo constants `legIndex=0`, `positionSize=1e6`, `economicTheory=0x…06` pinned.
- §0.2 disclosure present on every live-path view; provenance never green.
- D4: the live `resolveFromMandate` call overrides `mandate.chainId` to the connected fork's `block.chainid` (31337); a unit test asserts the override happens before the call (regression guard against the `:365` revert).
- D2: the BuildBear fork is registered in `lib/wagmi/config.ts` (6 chains); the write path uses `useSwitchChain`+`useWriteContract({chainId:31337})`; the `defineChain` RPC is sourced from the mirrored artifact (no hardcoded endpoint).
- D3: ABIs are wagmi-generated from `contracts/out/` via `pnpm contracts:gen` (not hand-typed).
- D1: `nonErgodicDisclosed` + the "(TEMPLATE)"-marked `rationale` render on the Agent-2 decision card at full weight (e2e grep asserts both present + not inside a `<details>`); the other ExecutorDecided fields live in the expandable evidence panel.
- Fallback path renders under an explicit demo-mode label with NO fake tx hash/link.
- No `executed/realized/ejecutad/realizad`, no `$` PnL, no raw `0x000…0` in rendered DOM; decision card has no `<details>`; status pills color+icon+text.
- es-CO-first copy + en; native sign-off appended to `docs/copy-review.md`.
- `pnpm run test:impeccable` + token tests green; e2e green LOCALLY before commit (the Phase-8 CI lesson); Evidence Collector live-verify gate per task.

---

## §7 — Open items carried into planning (review-resolved where possible)

1. ~~Signer model~~ — RESOLVED (§4a B2): permissionless call, executor holds collateral, signer pays gas only; server-key optional gas convenience, not auth.
2. **CORS/RPC reachability** (carry to research-phase): does BuildBear RPC allow browser-origin JSON-RPC, or is a Next.js Route-Handler proxy mandatory? Decide via an `eth_chainId` browser probe in the research/spike task.
3. ~~Re-mirror workflow~~ — RESOLVED into §4b runbook (owner + timing named at plan checkpoint).
4. **Backend dependency (the one true external blocker):** the provisioning script's inline mint consumes the executor's collateral, so the freshness gate fails immediately after provisioning. **Backend must provide a fresh-executor / `--no-mint` provisioning variant** so `numberOfLegs(executor)==0` at demo time and the live mint succeeds. Until delivered, the live path honestly degrades to mock fallback. This is tracked as a cross-repo dependency in the phase plan; the FRONTEND phase does not block on it (the gate + fallback ship regardless).
5. ~~legIndex/positionSize/economicTheory~~ — RESOLVED (M3): pinned demo constants `0`, `1e6`, `0x…06`.
