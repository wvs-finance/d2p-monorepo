# PLAN — Cornerstone live two-chain execution (Scenario-1 from a prompt)

**Status:** REVISED ×3 post-gate-3 (chainId handoff, view-type reshape, mandate serialization, 4-field DecisionState). Pending gate-4.
**Author:** drafted in `abrigo-somnia` session, 2026-06-07, for execution by the **frontend agent** in `d2p-frontend`.
**Repo of execution:** `/home/jmsbpp/apps/d2p/frontend` (branch `main` → cut a feature branch).
**Sibling contract repo:** `/home/jmsbpp/apps/d2p/abrigo/abrigo-somnia`.

---

## 1. Goal

Replace the cornerstone page's **timed-mock** workflow with a **live two-chain producer**: submitting a prompt fires the **real Agent-1 decision on Somnia testnet** and a **real Agent-2 mint on the hosted BuildBear Polygon fork (chain 31337)**, and the UI renders the real tx hashes + minted position + the (TEMPLATE) honesty rationale. Architecture: **Option B — two-chain fully live**, **operator-driven** (operator STT key; not judge-self-serve). Mint chain: **hosted BuildBear** (proven: live mint at strike 360360, tx `0xfce415a6…`). "Localhost" = the UI (`pnpm dev`); the chains are remote.

**Non-goals:** not judge-self-runnable (Somnia leg needs the operator STT key); not local-anvil (the provision script is BuildBear-specific). The safe submission artifact is a **recorded** live run; `replay` mode (real captured receipts) is the always-works fallback, frozen first (T0) and never broken by the live work.

---

## 2. Verified contract surface (exact — pinned against source 2026-06-07)

### Agent-1 (`MacroHedgeStrategist.sol`, Somnia testnet, chain 50312) — TWO requests, TWO callbacks, join-emit
1. `requestSchoolDecision(string userIntent, bytes32 dataKey, int256 consensus) payable returns (bytes32 decisionId)`. Reverts `UnknownKey` if `MacroOracle.latest(dataKey).deliveredAt == 0` (oracle must be fresh first). Internally `decisionId = bytes32(requestId)`.
   - **CAPTURE decisionId FROM THE EVENT, NOT THE RETURN VALUE.** A state-changing EOA tx cannot return its Solidity return value to the caller. The id is emitted as **`HedgeDecisionRequested(uint256 indexed requestId, bytes32 indexed decisionId, uint8 leg)`** — read `decisionId` from that log on the tx receipt. Do NOT reconstruct `bytes32(requestId)` client-side and do NOT read a return value.
2. *await* the async **school callback** → flips `schoolSet`. **It emits NO success event** — the only signal is the view **`decisionState(decisionId) → DecisionState { bool schoolSet; bool notionalSet; uint64 decidedAt; string schoolLabel; }`** (FOUR fields — decode the full tuple; `schoolLabel` carries the school string once set, an alternative to parsing it from the join log). Poll `decisionState(decisionId).schoolSet`. On failure it emits **`DecisionFailed(uint256 indexed requestId, ResponseStatus status)`** and clears state → **terminal**, otherwise indistinguishable from "still pending" by `decisionState` alone. The route MUST capture the **school `requestId` from its `HedgeDecisionRequested(…, leg=School)` log** and correlate `DecisionFailed` to it (terminal — don't hang).
3. `requestNotionalDecision(bytes32 decisionId) payable returns (uint256)` → reverts `UnknownDecision` unless `schoolSet`. Fires the second `inferString`. **Capture the notional `requestId` from ITS `HedgeDecisionRequested(…, leg=Notional)` log** (same EOA-can't-read-return constraint) to correlate a notional-leg `DecisionFailed`.
4. *await* the async **notional callback** (poll `decisionState().notionalSet`, or wait for the join event; `DecisionFailed` terminal here too, correlated via the notional requestId from step 3).
5. On the join (both legs landed) → **`StrategistDecided(bytes32 indexed decisionId, string school, HedgeMandate mandate)`** emits. **Parse `school` + the full `mandate` from THIS log** (single source of truth — do not race a `getMandate` read).

**Read-vs-log policy (explicit, per leg):** decisionId + per-leg requestIds = `HedgeDecisionRequested` logs · school/notional completion = poll `decisionState()` booleans (read) · final school+mandate = `StrategistDecided` log · failures = `DecisionFailed` log correlated by the captured per-leg requestId (terminal). Ignore `RepresentativenessAssessed` (a separate executor event) — use `ExecutorDecided`.

### Agent-2 (`MacroHedgeExecutor.sol`, BuildBear fork, chain 31337)
- `resolveFromMandate(HedgeMandate mandate, uint256 legIndex, uint128 positionSize) returns (TokenId)`.
  - **`legIndex` and `positionSize` are SEPARATE caller args, NOT mandate fields.** `HedgeMandate` = `{ IMacroThesis economicTheory; PoolId underlyingMarket; uint256 targetNotional; uint32 chainId; bool isLong; }` — no size/leg. The proven provision call is **`resolveFromMandate(mandate, 0, 1e6)`** → use **`legIndex = 0`, `positionSize = 1e6`** (the proven constants). Do not invent mandate-derived values.
  - **⚠ chainId guard (cross-chain handoff fix).** The mint sink enforces `require(uint256(legParams.chainId) == block.chainid, "No crosschain allowed yet")` (line 365). **Agent-1's join hardcodes `mandate.chainId = 137`** (Polygon mainnet), but the **BuildBear fork is re-chained to 31337** → a live Agent-1 mandate minted as-is on the fork **reverts**. The provision script avoids this only because it builds its own mandate with `chainId = block.chainid`. **Required fix in the live path:** before `resolveFromMandate`, **override `mandate.chainId = 31337`** (the connected fork's `block.chainid`) — a documented fork accommodation (the 137 is the real Polygon target; the fork merely re-chains it). *(Alternative, NOT chosen for deadline: re-provision BuildBear as chain 137 so the guard passes natively without mutating the mandate.)*
  - Pre-req: the executor must hold **deposited collateral** or the mint reverts `AccountInsolvent`; this is done by `provision-buildbear-demo.sh` (deposit-on-behalf) — a runbook step (T7), not a UI step.
  - Emits **`ExecutorDecided(uint256 indexed requestId, uint8 regimeZt, uint256 inflationAdjustmentWad, int24 strikeTick, int24 regimeWidth, bool parametricHedged, bool nonErgodicDisclosed, string rationale)`** — **no tokenId here**; carries the honesty flags + a **TEMPLATE rationale** (`requestId == 0` sentinel on this direct path).
  - Emits **`PositionMinted(address indexed owner, TokenId indexed positionId, uint128 positionSize)`** — **THIS is where the minted `tokenId` (`positionId`, decode as uint256) comes from**; `owner == the executor`.

**Honesty/geometry truth:** the rationale is a **TEMPLATE**. The UI sources it from the **`ExecutorDecided.rationale` event string** (do NOT reference the executor's `private` constants — `TEMPLATE_RATIONALE`/`SHILLER_RATIONALE` are not externally readable; the PKE and SHILLER arms simply emit different strings). In the **PKE arm the strike is CONSTANT** (`CANONICAL_COP_USD=3900` → strike 360360) regardless of prompt; only `targetNotional` varies the sizing. The demo narrative must NOT imply prompt-varying *geometry* — notional varies, geometry doesn't (PKE).

### Frontend reality — view-type changes REQUIRED (not "reuse unchanged")
The `fromChainEvent` adapter must output the **`WorkflowEventView`** types the page/store/`RunTranscript`→`HedgeDecisionCardV2` actually consume — and those view types are **missing fields** the live data needs. Two layers of change:
1. **Input event types** (`StrategistDecidedEvent`/`ExecutorDecidedEvent`/`PositionMintedEvent`) don't match the on-chain logs — `fromChainEvent` builds its view output directly from decoded logs, bypassing the mock input shapes.
2. **Output VIEW types must GAIN fields** (this is a real view-contract change, scoped in T5/T6 — NOT reuse-unchanged):
   - `StrategistDecidedView.recordedDecisionId: string` — in the mock this is enriched OUTSIDE `fromMockEvent` (workflow-engine.ts:90-93) as the snapshot join key. **Live provenance:** set it to the **bytes32 `decisionId` from the log, `.toString()`**.
   - `ExecutorDecidedView.hedgeLegParams: HedgeLegParamsView` has `rationale` but **NO `nonErgodicDisclosed`/`parametricHedged`/`regimeZt`**. AC#4/T6 require surfacing `nonErgodicDisclosed` + the TEMPLATE rationale → **add `nonErgodicDisclosed: boolean` (and `parametricHedged: boolean`) to `HedgeLegParamsView`, and render them in `HedgeDecisionCardV2.tsx`** — the ACTUAL cornerstone renderer of `HedgeLegParamsView` (imports it at line 17/49, rendered by `RunTranscript.tsx`). **NOT `DecisionPipelineTrace`** (that component consumes a different `DecisionTraceView` from `lib/apps/abrigo/somnia/` and is NOT on the cornerstone `WorkflowEventView` data path). Without the field there is nothing to carry the honesty flag.
   - `PositionMintedView` — source `positionId` from the on-chain `PositionMinted.positionId` (TokenId→uint256→string); the mock's `marginToken0/1` have no on-chain source (leave undefined/omit in live).

---

## 3. Target architecture

```
[UI prompt submit]  (browser wallet on BuildBear fork 31337 ONLY)
   │
   ▼  POST /api/abrigo/agent1   (Next route, runtime='nodejs', server STT key, shared-secret header)
   │     (a) ensure MacroOracle datum fresh for dataKey  (keeper TE refresh if deliveredAt==0)
   │     (b) requestSchoolDecision(userIntent, dataKey, consensus)
   │           → read decisionId from HedgeDecisionRequested log on the receipt
   │     (c) poll decisionState(decisionId).schoolSet until true | DecisionFailed(school requestId) | timeout
   │     (d) requestNotionalDecision(decisionId)
   │     (e) await StrategistDecided(decisionId) log  | DecisionFailed | timeout
   │           → parse { school, mandate } from the StrategistDecided log
   │     → returns { somniaSchoolTx, somniaNotionalTx, school, mandate(SERIALIZED) } | typed failure
   │
   ▼  browser re-hydrates the mandate tuple, renders the real Somnia decision (reshaped view types)
   ▼  (user confirm gate)
   ▼  Agent-2 LIVE on BuildBear fork (browser writeContract)
   │     mandate.chainId = 31337   ← OVERRIDE (fork re-chains 137→31337; else mint reverts)
   │     resolveFromMandate(mandate, /*legIndex*/ 0, /*positionSize*/ 1_000_000)
   │     await receipt; require status==success;
   │     tokenId   ← PositionMinted.positionId
   │     honesty   ← ExecutorDecided.{nonErgodicDisclosed, rationale(TEMPLATE)}
   │
   ▼  render: Somnia explorer txs + BuildBear explorer mint tx + tokenId + honesty flag
```

**Mandate serialization contract (server→browser).** `StrategistDecided.mandate` is a `HedgeMandate` tuple with non-JSON-native members (`PoolId underlyingMarket` = bytes32, `IMacroThesis economicTheory` = address, `uint256 targetNotional` = bigint). The route MUST serialize it as a plain object of hex/decimal **strings** (`{ economicTheory: '0x…', underlyingMarket: '0x…', targetNotional: '50000', chainId: 137, isLong: true }`); the browser **re-hydrates** to the viem tuple (bigint for `targetNotional`, the override of `chainId`) before `writeContract`. No bigint/bytes32 may cross the JSON boundary raw.

**Signer topology (resolves Q-1/Q-5):** browser wallet signs ONLY the 31337 fork mint; the ENTIRE Somnia leg is server-side (operator STT key never in the browser; RainbowKit `chains` = `[buildbearFork31337]` ONLY — Somnia is not a browser chain).

---

## 4. Work breakdown

**T0 — FREEZE the replay fallback FIRST.** `git tag cornerstone-replay-safe` on the current working build; add a smoke test that `replay` renders `snapshot.json` end-to-end. Guaranteed June-11 artifact; the live work must not break it.

**T1 — wagmi/chain config + ABIs.** Precondition: `forge build` in `abrigo-somnia/contracts` so `out/` exists. `wagmi.config.ts`: set `project: '../abrigo/abrigo-somnia/contracts'` (the foundry root with `foundry.toml`/`out`; current `'../abrigo'` is wrong) and an **`include` filter for `MacroHedgeStrategist` + `MacroHedgeExecutor` only** (else codegen pulls hundreds of artifacts). Commit generated ABIs. RainbowKit/wagmi `chains` = the BuildBear fork (31337, RPC = sandbox URL) ONLY; do NOT add Somnia as a browser chain/transport.

**T2 — Somnia leg: hardened server route** `app/api/abrigo/agent1/route.ts`: `export const runtime='nodejs'`; `SOMNIA_OPERATOR_PK` in the **t3 `server`** schema (never `NEXT_PUBLIC_`); shared-secret header auth; never imported by a client component. Implements §3 (a)-(e) with per-leg timeouts and **terminal `DecisionFailed` handling at BOTH legs**; returns the two tx hashes + parsed mandate or a typed failure.

**T3 — oracle freshness (O-1).** Before `requestSchoolDecision`, ensure `MacroOracle.latest(dataKey).deliveredAt != 0` (keeper TE refresh or pre-seed). Pin the exact `dataKey`, `consensus`, `userIntent` inputs from `abrigo-somnia` Phase-11/12 scripts.

**T4 — Agent-2 fork mint (browser).** Re-hydrate the serialized mandate; **override `mandate.chainId = 31337`** (the connected fork's `block.chainid`, else the mint reverts `"No crosschain allowed yet"`); `writeContract` `resolveFromMandate(mandate, 0, 1_000_000)` on the 31337 wallet; await receipt; assert `status==success`; parse **`PositionMinted.positionId`** (tokenId, TokenId→uint256) + `ExecutorDecided` (`nonErgodicDisclosed` + `rationale`). Pre-req (operator, runbook): BuildBear provisioned so the executor holds collateral.

**T5 — live producer + reshaped adapter + VIEW-TYPE changes.** `runWorkflowLive(prompt, emit, { confirm })` mirroring the mock's emit contract but emitting **real** events. `fromChainEvent` builds **`WorkflowEventView`** output directly from decoded logs (§2). **View-contract changes required:** add `nonErgodicDisclosed` (+ `parametricHedged`) to `HedgeLegParamsView`; set `StrategistDecidedView.recordedDecisionId` = the log's bytes32 `decisionId.toString()` **once, inside `fromChainEvent`** — the live producer must NOT wrap-enrich it afterward (the mock sets it OUTSIDE the adapter in `workflow-engine.ts:~90`; the live path does not have/keep that wrapper, so set-once in the adapter is the single source); `PositionMintedView.positionId` from `PositionMinted.positionId`. `fromBlock` log-range polling (not naive await); idempotent `DecisionFailed`/partial-mandate (`schoolSet && !notionalSet`) handling.

**T5b — render the honesty fields in `HedgeDecisionCardV2.tsx`** (the cornerstone `HedgeLegParamsView` renderer, via `RunTranscript`; NOT `DecisionPipelineTrace`). Add a `DataRow` for `nonErgodicDisclosed` + the TEMPLATE `rationale` and the matching label keys in `CardV2Strings`, so AC#4 actually displays in the cornerstone run.

**T6 — mode switch + honest labelling.** Page mode `live | replay | mock`. In `live`: "live · on-chain" indicator, both real tx hashes (Somnia + BuildBear explorers), TEMPLATE rationale + `nonErgodicDisclosed` surfaced honestly; narrative must not imply prompt-varying geometry (PKE). `replay`/`mock` unchanged (guarded by T0).

**T7 — operator runbook + env.** Exact steps: provision BuildBear (`provision-buildbear-demo.sh`), env (`SOMNIA_OPERATOR_PK`, `AGENT1_ROUTE_SECRET`, BuildBear RPC + addresses, `dataKey`/consensus), `pnpm dev`, browser steps, expected two-explorer tx links. Seeds the abrigo-somnia README "run it" section.

**T8 — tests (CI, no live chain).** Unit-test `fromChainEvent` reshaping + the producer's emit ordering against the **2-callback + 1-join-emit** reality (school-poll → notional → `StrategistDecided`; plus `DecisionFailed` at either leg) with a mocked viem client. T0 replay smoke test in CI. Live run is operator-verified + recorded, not CI.

---

## 5. Acceptance criteria (verifiable)

1. In `live` mode, an operator prompt yields a **`StrategistDecided` log** (NOT `DecisionFailed`) with non-empty `school` + decoded `mandate`, AND a **BuildBear mint with `receipt.status==success`** emitting **`PositionMinted` with a non-zero `positionId`** (and `ExecutorDecided` present).
2. School-leg failure path is handled: a forced/observed `DecisionFailed` at the school leg surfaces a terminal failure state in the pipeline trace within the timeout — it does NOT hang.
3. Rendered school/mandate/position come from **live logs/reads**, not `snapshot.json` (runtime `source:'chain'` assertion).
4. `nonErgodicDisclosed` surfaced from the real `ExecutorDecided`; rationale labelled TEMPLATE (note: PKE and SHILLER arms use different template constants).
5. `replay` + `mock` still pass the T0 smoke test (no regression).
6. CI: `fromChainEvent` reshape + ordering unit tests + replay smoke test green; no live chain.
7. T7 runbook reproduces a live run from the operator env (STT key + provisioned BuildBear) — evidenced by the two explorer tx links **OR an equivalent recorded run** (per §8; Somnia callback latency may preclude an on-demand live run).

---

## 6. Open items (non-blocking, documented)

- **O-1** exact `dataKey`/`consensus`/`userIntent` for `requestSchoolDecision` (T3) — on every live run's critical path; pin from Phase-11/12.
- **O-2** BuildBear 3-day TTL → runbook includes re-provision; anvil port is explicit future work.
- **O-3** Somnia validator-callback latency/reliability variable (memory: pruned `getRequest`) → T2 timeouts + recorded-run fallback (T0/§8) are the mitigations.
- **O-4** `targetNotional`→`optionRatio[1,127]` mapping (`feasibleOptionRatio`) — document so the UI can display the resolved size; ties to O-1.

---

## 7. Reuse / don't-rebuild

♻️ `workflow-store.ts`, `RunTranscript` → `HedgeDecisionCardV2` (the cornerstone `HedgeLegParamsView` renderer — extended in T5b, not reused unchanged), `deployments.json`, `provision-buildbear-demo.sh`, keeper TE proxy, RainbowKit/wagmi setup, the proven BuildBear deployment. (NOTE: `DecisionPipelineTrace` is a DIFFERENT somnia workflow — not on this data path.)
🔨 New/changed: `runWorkflowLive`, `fromChainEvent` (**reshapes view types** — not thin), the hardened Somnia server route, the browser fork-mint call, the mode switch, the runbook. NOTE: `events.ts` view types must be **reshaped** to match real events (§2) — NOT reused unchanged.

---

## 8. Risk note (honest)

Two payable inference round-trips + async callbacks on a known-flaky testnet make a *live* run unreliable on demand. T0 freezes the **replay** path (real captured receipts) as the guaranteed submission artifact; `live` is the operator-driven/recorded showcase on top. AC#7 accepts a recorded run for exactly this reason. Live work must never block or break replay.
