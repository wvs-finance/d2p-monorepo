# Phase 13: MacroHedgeExecutor (Agent 2) — pool-representativeness, sizing, mint — Research

**Researched:** 2026-06-06
**Domain:** Panoptic V2 (UniV4) position minting + Somnia agent callback + collateral-ownership promotion (Solidity, Foundry, Polygon fork)
**Confidence:** HIGH (every load-bearing claim is cited to committed source — fork-state cached, demo test re-run green this session)

## Summary

The Agent-2 execution core is **already built and green** in `contracts/test/fork/DemoMacroHedgeExecutor.fork.t.sol`. `test__takeDemoPosition__Succeeds` was re-run this session: **1 passed** in 419ms against the cached Polygon fork-state. The math (vol→width→strike→TokenId), the short-then-long `dispatch` mint, and the `RiskManagement.quoteCollateralRequirements` call are all proven. Phase 13 is **promotion + gap-filling, not invention**: lift the resolver out of `PolygonConvexPositionResolverHarness` (a test contract, lines 64-122) into a deployable `MacroHedgeExecutor is SomniaAgentConsumer`, shift collateral ownership onto that contract, wire `_onResult` correctly, design `OperationalCostManagement`, and state the honest margin-gate semantics.

The single biggest reality to internalize for EXEC-02: **a true pre-mint solvency gate on the not-yet-minted position is IMPOSSIBLE.** The margin path (`RiskManagement.quoteCollateralRequirements` → `PanopticQuery.checkCollateral` → `_getMargin` → `PanopticPool.getFullPositionsData` → `_calculateAccumulatedPremia`) hits `if (positionBalanceData.positionSize() == 0) revert Errors.PositionNotOwned();` at `PanopticPool.sol:559`. So quoting a position that has not been minted **reverts**, it does not return zeros. This is exactly what commit `67acc91` documents. The protocol's *real* solvency gate is `_validateSolvency(msg.sender, ...)` at `PanopticPool.sol:788-796`, which runs at the **end of `dispatch`, AFTER** `_mintOptions` writes `s_positionBalance` (`PanopticPool.sol:862`) — i.e. mint-then-revert-if-insolvent (`AccountInsolvent`, `PanopticPool.sol:1142`), atomically unwinding. EXEC-02 must be reframed accordingly.

**Primary recommendation:** Promote the harness verbatim into `MacroHedgeExecutor.resolveAndMint(...)` (executor is the `dispatch` caller AND the CollateralTracker-share owner); make EXEC-02 honest by quoting margin **post-mint** as a read (`quoteCollateralRequirements` returns the `BalanceDelta` margin surplus/deficit AFTER the position exists) and proving the **negative gate** via the protocol-native atomic `AccountInsolvent` revert on an under-funded executor; ship a minimal `OperationalCostManagement` accumulator (`cummCost`) with a no-double-count check; keep the live `llm-inference` representativeness step as the **seam/stretch** (test constructs `HedgeLegParams` directly like the demo, `_onResult` wired for the live path).

---

<user_constraints>
## User Constraints

No `CONTEXT.md` exists for Phase 13 (`.planning/phases/13-macrohedgeexecutor-mint/` contains no `*-CONTEXT.md`). Constraints are inherited from CLAUDE.md domain non-negotiables + ROADMAP/REQUIREMENTS:

### Locked (from ROADMAP Phase 13 + CLAUDE.md)
- **Demo/testnet/fork-only — never production.** Borrowed Panoptic V2 (BUSL-1.1) is permitted in non-production fork use only.
- **Cornerstone is Polygon / real wCOP/USDC.** Mint on the real Polygon `wCOP/USDC` UniV4 pool (PoolManager `0x6736…`, USDC 6dp `0x3c49…`, wCOP 18dp `0x8a1D…`, fee 3000 / tickSpacing 60); Panoptic V2 stood up via the production `DeployProtocol.s.sol` + real periphery (`StrategyBuilder`, `PanopticQuery`). (`ROADMAP.md:132-136`, `DemoMacroHedgeExecutor.fork.t.sol:180-221`)
- **The resolver/mint/risk-quote core is ALREADY COMMITTED + green.** Do NOT re-plan or re-derive it. Phase 13 wires it behind the agent + completes risk/cost. (`ROADMAP.md:136,161`)
- **evm-tdd Iron Law:** `.tree` BTT + FAILING tests before impl; `bulloak check` per-file (bulloak 0.9.2); co-locate `.tree` with `.t.sol`. (project skill `evm-tdd`)
- **Three-step planning-review gate** before the PLAN executes (CLAUDE.md).

### Claude's Discretion
- Exact deployable method signature(s) on `MacroHedgeExecutor` (recommendation below).
- The `OperationalCostManagement` storage shape (recommendation below — demo-scoped).
- Whether the representativeness `llm-inference` is MVP or stretch (recommendation: STRETCH/seam — see §5).

### Deferred (OUT OF SCOPE for Phase 13)
- The live cross-chain SOMI→Polygon settlement (XCHAIN-01).
- Delta-hedge keeper (HEDGE-01).
- Real money / real users / mainnet.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description (from REQUIREMENTS.md:34-36) | Research Support |
|----|------------------------------------------|------------------|
| **EXEC-01** | Promote demo resolver → deployable `MacroHedgeExecutor is SomniaAgentConsumer`: consumes `HedgeLegParams` via `llm-inference`, runs pool-representativeness (decision on an event for UI), mints on Polygon wCOP/USDC V2 pool (`test__takeDemoPosition__Succeeds` lineage, green through the real executor). | §1 (promotion mechanics — what migrates, signature, collateral-ownership shift), §3 (`_onResult` decode + seam), §4 (PoolId constant), §5 (representativeness MVP-vs-stretch), §6 (contract set + imports) |
| **EXEC-02** | `RiskManagement.quoteCollateralRequirements` returns the margin `BalanceDelta` and gates the mint (insufficient collateral → no mint). | §2 — the honest semantics: pre-mint quote on the *position* reverts (`PanopticPool.sol:559`); real gate is the protocol-native atomic `AccountInsolvent` (`PanopticPool.sol:1142`) at `_validateSolvency` (`PanopticPool.sol:788-796`); the `BalanceDelta` margin read is meaningful POST-mint |
| **EXEC-03** | `OperationalCostManagement` accrues cumulative agent-call + data cost across Agent 1 + Agent 2 (`cummCost`), with a no-double-count conservation check. | §7 — minimal accumulator shape, entry/exit points, conservation invariant |
</phase_requirements>

---

## 1. Harness → deployable promotion (EXEC-01)

### What is in the harness today (the proven recipe)
`PolygonConvexPositionResolverHarness` (`DemoMacroHedgeExecutor.fork.t.sol:64-122`) is a **test contract** with one method:
`resolvePositionFromHedgeParams__CASE_VOL_AWARE(PoolId poolId, uint8 vegoid, HedgeLegParams legParams, uint256 legIndex, PanopticPoolV2 panopticPool, uint128 positionSize)` → `TokenId`.

It does the full pipeline (all line-cited):
1. Cross-chain guard `require(legParams.chainId == block.chainid)` (`:74`).
2. `width = PayoffTermsLib.deriveWidthFromVol(legParams.payoffTerms)` (`:77`; lib `PayoffTerms.sol:12-14` → `VolToWidthLib.volToWidth`).
3. `asset`/`riskPartner` pure reads (`:78-79`).
4. `strike = (getTickAtSqrtPrice(exchangeRateToSqrtPriceX96(strikeWAD)) / tickSpacing) * tickSpacing` (`:80-82`; `PriceGrids.sol:12-27`).
5. `pid = PoolIdMappersLib.panopticPoolIdFromUniV4PoolId(poolId, vegoid, tickSpacing)` (`:84`; lib `PoolIdMappers.sol:8-11`).
6. `positionId = TokenIdLibrary.addLeg(TokenId.wrap(0).addPoolId(pid), legIndex, size, asset, isLong?1:0, 0, riskPartner, strike, width)` (`:86-91`; arg order verified verbatim vs `TokenId.sol:343-361`).
7. **The mint** (only when `isLong && positionSize > 0`, `:93-119`): a **short-then-long two-`dispatch` flow**. First mints the SHORT counterparty leg (`shortId`, size `positionSize*2`, `:99-108`); then mints the LONG leg against it (`positionId`, size `positionSize`, with `fl=[shortId, positionId]`, `:109-118`). Both via `panopticPool.dispatch(ml, fl, sl, lim, true, 0)` with `lim = [MIN_TICK, MAX_TICK, type(uint24).max]`.

> **The harness IS the position owner + collateral holder.** It calls `panopticPool.dispatch` directly (`:107`, `:117`), so `dispatch` keys `s_positionBalance[msg.sender]` to the harness (`PanopticPool.sol:712,862`), and `_validateSolvency(msg.sender,...)` checks the harness (`PanopticPool.sol:790-791`). The test funds + deposits collateral FOR the harness at `:281-290`: `deal` USDC+wCOP to `address(positionResolver__VolVariant)`, then `vm.startPrank(harness)` → `ct0.deposit(DEFAULT_FUND_USD, harness)` / `ct1.deposit(DEFAULT_FUND_COP, harness)`. This is the load-bearing custody fact for the promotion.

### The collateral-ownership / `msg.sender` shift (the crux of EXEC-01)
`CollateralTracker.deposit(assets, receiver)` does `_mint(receiver, shares)` (`CollateralTracker.sol:580`) — shares go to `receiver`. The position owner is whoever calls `dispatch` (`s_positionBalance[msg.sender]`, `PanopticPool.sol:862`). For solvency to pass, **the share-owner and the `dispatch`-caller must be the same address** (`_validateSolvency` checks `msg.sender`'s collateral balances, `PanopticPool.sol:790`, `1131-1142`).

Therefore, when the deployable `MacroHedgeExecutor` becomes the `dispatch` caller:
- **The executor MUST hold the CollateralTracker shares** → the collateral deposit must name the executor as `receiver`: `ct0.deposit(assets0, address(executor))`, `ct1.deposit(assets1, address(executor))`.
- **The executor IS the position owner.** `s_positionBalance[address(executor)][tokenId]` holds the minted position.
- This is the same pattern Phase 8's `LongGammaWrapper` already uses (`STATE.md:48` 08-03: "the WRAPPER owns the 4626 shares … `ct.deposit(assets, address(this))`"). The executor is the wrapper-shaped owner for the cornerstone.

### What migrates from the harness into `MacroHedgeExecutor.sol`
| Harness element | Migrates to executor as |
|---|---|
| `resolvePositionFromHedgeParams__CASE_VOL_AWARE` body (`:66-120`) | An internal `_resolveTokenId(...)` (pure-ish, no state) + the dispatch block as the executor's mint |
| The two `panopticPool.dispatch` calls (`:107,:117`) | `IPanopticData(pool).dispatch(...)` or the concrete `PanopticPoolV2.dispatch(...)` called by the executor itself |
| Cross-chain guard (`:74`) | Kept verbatim |
| The test's collateral funding (`:281-290`) | **Stays in the TEST** (`deal` is a cheatcode), but `receiver` becomes `address(executor)` |

### Recommended deployable surface (Claude's discretion)
```solidity
contract MacroHedgeExecutor is SomniaAgentConsumer {
    PanopticPoolV2 public immutable pool;       // the wCOP/USDC V2 pool (or IPanopticData seam)
    RiskManagement public immutable riskManager;
    OperationalCostManagement public costLedger;
    uint8 public immutable vegoid;              // read once from RiskEngine at deploy (see note)

    event RepresentativenessAssessed(uint256 indexed requestId, string rationale, bool representative); // UI seam (§5)
    event PositionMinted(address indexed owner, TokenId indexed positionId, uint128 positionSize);

    // EXEC-01 deployable entrypoint (the test calls THIS, like the demo calls the harness):
    function resolveAndMint(HedgeLegParams calldata legParams, uint256 legIndex, uint128 positionSize)
        external returns (TokenId positionId);

    // Optional pure view for the UI / pre-flight (compute TokenId only, positionSize=0 path):
    function resolve(HedgeLegParams calldata legParams, uint256 legIndex)
        external view returns (TokenId positionId);
}
```
- The fork test mints through `executor.resolveAndMint(legParams, 0, 1e6)` — exactly mirroring the demo's `positionResolver__VolVariant.resolvePositionFromHedgeParams__CASE_VOL_AWARE(..., 1e6)` at `:333-340`, but now the **contract** is the owner. This is the `test__takeDemoPosition__Succeeds` lineage "green through the real executor."
- **vegoid note:** the harness reads `_vegoid()` = `IRiskEngine(RISK_ENGINE_ADDR).vegoid()` (`:187-189`). The executor should read it the same way at deploy (immutable) — do NOT hard-code; the 07-05 decision (`STATE.md:78`) confirms vegoid is read as `re.vegoid()`, not a per-pool param.

**Confidence: HIGH** — every element line-cited; the demo test is green this session.

---

## 2. The `checkCollateral` / margin reality (EXEC-02) — THE HONEST SEMANTICS

### The full call chain (line-cited)
`RiskManagement.quoteCollateralRequirements(PositionInfo, strike)` (`RiskManagement.sol:34-47`)
→ calls `riskLens.checkCollateral(clearingHouse, owner, [Id], strike)` — this resolves to the **4-arg public overload** `PanopticQuery.checkCollateral(pool, account, positionIdList, atTick)` (`PanopticQuery.sol:48-127`), NOT the 3-arg external one (`:243-278`).
→ `_getMargin(pool, atTick, account, positionIdList)` (`PanopticQuery.sol:189-227`)
→ `pool.getFullPositionsData(account, false, positionIdList)` (`PanopticPool.sol:484-521`)
→ `_calculateAccumulatedPremia(...)` (`PanopticPool.sol:531-...`)
→ **`if (positionBalanceData.positionSize() == 0) revert Errors.PositionNotOwned();`** (`PanopticPool.sol:559`).

### The verdict: a true PRE-MINT solvency gate on the position is IMPOSSIBLE
- Quoting margin for a `tokenId` that has not been minted **reverts with `PositionNotOwned()`** — it does NOT read zero balances. So "quote first, mint only if solvent" on the *actual position* cannot work.
- This is precisely commit `67acc91`'s documented limitation (verbatim from the diff): *"quoteCollateralRequirements requires a fully minted position in both PanopticPool.s_positionBalance AND the SFPM (for leg chunk data). Stubbing s_positionBalance alone is not enough — getFullPositionsData reverts inside the SFPM when the leg has no liquidity."* (The SFPM-liquidity revert is the deeper layer: `_calculateAccumulatedPremia` calls `_getPremia` → `_getLiquidities` at `PanopticPool.sol:566,582` for short legs, which reads SFPM chunk data.)

### Where the margin quote IS meaningful
**POST-mint.** Once the position exists (`s_positionBalance[owner][tokenId].positionSize() > 0`), `quoteCollateralRequirements` returns a real `BalanceDelta`. The committed demo proves this: `test__takeDemoPosition__Succeeds` mints with `positionSize=1e6` (`:339`) and THEN calls `quoteCollateralRequirements(PositionInfo({owner: harness, Id: positionId}), strike)` at `:342-345` — it does not revert because the position is minted. The returned `BalanceDelta` is computed by `FundingDeltaLib.fromCollateralRequirements` (`FundingDelta.sol`): `delta0 = balance0 − required0`, `delta1 = balance1 − required1` — i.e. **the per-token collateral surplus (positive) or deficit (negative)** at the quoted tick. This is the meaningful "margin" number: a negative slot = under-collateralized.

### The REAL gate, and what EXEC-02 can honestly assert
The protocol's native solvency gate is **inside `dispatch`**, at the end, AFTER the mint writes state:
- `_mintOptions` writes `s_positionBalance[owner][tokenId]` at `PanopticPool.sol:862`.
- Then `_validateSolvency(msg.sender, finalPositionIdList, ...)` runs at `PanopticPool.sol:788-796`.
- `_validateSolvency` → `_checkSolvencyAtTicks` → `if (solvent != numberOfTicks) revert Errors.AccountInsolvent(...)` (`PanopticPool.sol:1142`).
- The whole `dispatch` is `nonReentrant` and reverts atomically — so an insolvent mint **unwinds completely; no position persists**.

**EXEC-02 honest claim set (what the plan can prove):**
1. **POSITIVE / informational:** `quoteCollateralRequirements` returns the margin `BalanceDelta` for a **minted** position (the demo already does this) — the surplus/deficit per token. Surface it on an event / view for the UI.
2. **NEGATIVE / the actual gate:** "insufficient collateral → no mint" is enforced **by the protocol atomically**: an executor funded below the position's requirement → `dispatch` reverts `AccountInsolvent` → `resolveAndMint` reverts → **no position minted, no state change**. The fork test proves this by funding the executor with too little collateral and asserting the mint reverts (`vm.expectRevert(Errors.AccountInsolvent.selector)` or a wrapper revert) and `numberOfLegs(executor) == 0` after.
3. **OPTIONAL pre-flight (honest framing):** A pre-mint *advisory* can quote the COUNTERPARTY/account collateral state (the executor's deposited shares vs a heuristic requirement) — but it is NOT a guarantee, because the true requirement is only computable post-mint. Frame any pre-check as advisory, never as the gate.

> **Do NOT claim** a pre-mint solvency gate that quotes the position-to-be-minted. It reverts. The honest gate is mint-and-atomic-revert. (This directly answers the prompt's "if a true pre-mint solvency gate is impossible, say so.")

**Confidence: HIGH** — `PanopticPool.sol:559`, `:788-796`, `:862`, `:1142` all read directly; `FundingDelta.sol` read; demo's post-mint quote is green.

---

## 3. The `_onResult` decode + the seam (EXEC-01)

### The stub is type-confusion pseudo-code
`MacroHedgeExecutor._onResult` (`MacroHedgeExecutor.sol:22-32`) does `abi.decode(abi.encode(responses[index]), (HedgeLegParams))` — this re-encodes the whole `Response` struct and tries to decode it as `HedgeLegParams`. That is a type error (a `Response` is `{address validator, bytes result, ResponseStatus status, uint256 receipt, uint256 timestamp, uint256 executionCost}` per `ISomniaAgents.sol:17-24`; it is NOT layout-compatible with `HedgeLegParams`). The author flagged it `// TODO: This is all pseudo-code, must be fixed` (`:23`).

### The REAL decode
The consensus payload rides in **`Response.result` (a `bytes`)**, not in the `Response` wrapper. `_onResult` receives `Response[] memory responses` (`SomniaAgentConsumer.sol:94`). The correct decode is:
```solidity
// pick the consensus response (validators agree; result is identical) — e.g. responses[0]
bytes memory raw = responses[0].result;
HedgeLegParams memory legParams = abi.decode(raw, (HedgeLegParams));
```
i.e. `abi.decode(responses[i].result, (HedgeLegParams))`, NOT `abi.decode(abi.encode(responses[i]), ...)`.

**Caveat (verify at plan time):** the live `llm-inference` agent (`ILLMAgent.inferString`, `ISomniaAgents.sol:73-80`) returns a `string` (consensus-verified). It does NOT natively emit abi-encoded structs. Phase 11/12's `MacroHedgeStrategist` decodes the LLM string → enum/clamped-int by hand (`STATE.md:63`: "`_onResult` decodes string→enum behind try/catch … int256→clamp"). So the real live path is: Agent 1 (Strategist) produces the `HedgeLegParams`-shaped spec (Phase 12, STRAT-02), and the **hand-off to the executor is the `HedgeLegParams` struct passed in-process / cross-call**, not an LLM string the executor re-parses. The executor's own `llm-inference` call (if any) is the *representativeness* step (§5), whose result is a decision/rationale string, not the `HedgeLegParams`.

### The seam (MVP)
For the MVP fork test, **construct `HedgeLegParams` directly and call `resolveAndMint`** — exactly the demo pattern: `TestCaseForDemoBuilder.hedgeParams(terms)` (`:157-167`) hand-codes the struct, and the test feeds it to the resolver (`:333-340`). The executor's `_onResult` is wired correctly (decode `responses[i].result` → route to the same internal `_resolveTokenId` + mint) for the live path, but the deadline-MVP proof goes through `resolveAndMint` directly. This is the prompt-confirmed seam: "the fork test may construct `HedgeLegParams` directly + call `resolveAndMint` — like the demo — while `_onResult` is wired correctly for the live path."

**Recommendation:** Make `resolveAndMint` the shared internal sink that BOTH `_onResult` (live) and the fork test (direct) call. `_onResult` decodes → calls the internal mint; the test calls the external `resolveAndMint`. One mint path, two entrypoints. MVP proves the direct path; the live `_onResult` decode is unit-tested (encode a `HedgeLegParams`, wrap as `responses[0].result`, assert it routes) without needing a live Somnia round-trip.

**Confidence: HIGH** for the decode mechanics; **MEDIUM** for the exact live-payload shape (depends on Phase 12's emitted spec format — flag as a Phase-12/13 hand-off contract to confirm).

---

## 4. `POLYGON_WCOP_USDC_POOL_ID` constant (STRAT-02 anchor, delivered here)

Today the demo derives the pool id at runtime: `wcopUsdcKey.toId()` (`:305,334`, a `PoolId` = `keccak(abi.encode(PoolKey))`), then `PoolIdMappersLib.panopticPoolIdFromUniV4PoolId(poolId, vegoid, tickSpacing)` (`:84`) maps it to the `uint64` Panoptic pool id used in `addPoolId`.

**Where to commit the constant:** a canonical PoolKey getter + its `.toId()` in a shared lib (e.g. `contracts/src/libraries/PolygonPools.sol` or a constants file), so both Agent 1 (Phase 12, STRAT-02) and Agent 2 reference the pool by a **stable constant**, not a recomputed hash. Recommended shape:
```solidity
library PolygonPools {
    // wCOP/USDC, fee 3000, tickSpacing 60, hookless — the cornerstone pool.
    function wcopUsdcKey() internal pure returns (PoolKey memory) {
        return PoolKey({
            currency0: Currency.wrap(0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359), // USDC 6dp
            currency1: Currency.wrap(0x8a1D45e102e886510e891d2Ec656a708991e2D76), // wCOP 18dp
            fee: 3000, tickSpacing: 60, hooks: IHooks(address(0))
        });
    }
    function POLYGON_WCOP_USDC_POOL_ID() internal pure returns (PoolId) {
        return wcopUsdcKey().toId();
    }
}
```
- This `PoolId` is what feeds `PoolIdMappersLib.panopticPoolIdFromUniV4PoolId(POLYGON_WCOP_USDC_POOL_ID(), vegoid, 60)` to get the `uint64` Panoptic pool id (`PoolIdMappers.sol:8-11` reads the low 40 bits of the `PoolId` + vegoid<<40 + tickSpacing<<48).
- **Currency ordering is load-bearing:** the demo's `wcopUsdcKey` has `currency0 = USDC`, `currency1 = wCOP` (`:215-221`). UniV4 requires `currency0 < currency1` by address; `0x3c49… (USDC) < 0x8a1D… (wCOP)` holds, so this ordering is correct and `asset:0` = token0 = USDC. The constant must reproduce this exact ordering or the whole TokenId derivation drifts.
- **STRAT-02 dissolution:** Agent 1 cannot produce a runtime `PoolId` (it's an LLM); anchoring `HedgeLegParams.underlyingMarket` to `POLYGON_WCOP_USDC_POOL_ID()` is the hand-off (`ROADMAP.md:149`, `REQUIREMENTS.md:33`). Phase 13 should deliver this constant (the ROADMAP allows "or here — whichever lands first," `ROADMAP.md:150`).

**Confidence: HIGH** — addresses + ordering verified against the live demo key.

---

## 5. The representativeness `llm-inference` step — MVP vs STRETCH

DRAFT.md (`:174-177`) wants Agent 2 to "infer (fetch-tools, infer tools) the pool state relative to how representative it is of the FX market" — the "inflation adjustment" — with the decision surfaced for the UI. ROADMAP/REQUIREMENTS phrase it as "decision surfaced on an event for the UI" (`REQUIREMENTS.md:34`).

**Verdict: the live inference is STRETCH; the EVENT is MVP.** The honest minimal version:
- **MVP (must-have):** emit a `RepresentativenessAssessed(requestId, rationale, representative)` event so the UI has a decision to render. For the MVP fork test, the rationale/flag can be **passed in or set by a deterministic stub** (e.g. a constructor-set default or a param to `resolveAndMint`), exactly as the demo hand-codes `HedgeLegParams`. The event is the UI contract; the *source* of the decision is the seam.
- **STRETCH (deadline-permitting):** the actual `llm-inference` round-trip — `MacroHedgeExecutor` calls `_sendRequest(LLM_AGENT_ID, inferStringPayload)` (the inherited `SomniaAgentConsumer._sendRequest`, `SomniaAgentConsumer.sol:63-74`), and `_onResult` decodes the consensus string → the representativeness flag → emits the event → proceeds to mint. This is a live Somnia testnet step (like Phase 11's proven `MacroHedgeStrategist` e2e), and gated by STT-faucet UX + the keeper-proxy (memory: `project-somnia-testnet-integration-state`).

**Why split this way:** the cornerstone deadline (~June 11) prioritizes the DEPLOYABLE MINT (EXEC-01 core) + the honest margin (EXEC-02) + the cost ledger (EXEC-03). A live inference round-trip inside the mint path adds Somnia-testnet flakiness and STT spend to the critical mint test. The event gives the UI its decision; the inference can be a follow-on without blocking the mint proof. `MON-01` (monitoring agent) is already deferred to "a basic read" (`ROADMAP.md:146,169`) — same spirit.

**Recommendation:** Plan EXEC-01 with the event in the MVP and the live inference behind a clearly-flagged stretch task. The mint test does NOT depend on a live inference.

**Confidence: HIGH** (scoping judgment, grounded in the deadline + the demo's direct-construct precedent).

---

## 6. Contract set + the periphery (EXEC-01)

### Deployable set
| File | Status | Phase-13 action |
|---|---|---|
| `contracts/src/MacroHedgeExecutor.sol` | stub (`:1-34`), `_onResult` pseudo-code | **Promote** — add `resolveAndMint`, fix `_onResult`, wire RiskManagement + cost ledger |
| `contracts/src/OperationalCostManagement.sol` | empty (`:1-8`) | **Design** (§7) |
| `contracts/src/interfaces/IMacroThesis.sol` | empty interface (`:1-6`) | **Document or give a concrete-minimal shape.** `HedgeLegParams.economicTheory` is typed `IMacroThesis` (`HedgeLegParams.sol:11`), but the resolver NEVER reads it (`:66-120` reads only chainId/strikeWAD/size/isLong/payoffTerms). For Phase 13 it can stay a marker interface (the demo passes `IMacroThesis(address(0))`, `:162`); its concrete shape is Phase 12's STRAT-01 concern (`ROADMAP.md:152`). Phase 13 just needs it to compile. |
| `contracts/src/libraries/PolygonPools.sol` (new) | — | **Create** the `POLYGON_WCOP_USDC_POOL_ID` constant (§4) |
| `RiskManagement.sol` | complete (`:23-48`) | Use as-is; the margin read is POST-mint (§2) |

### Imports (confirmed from the green demo — `DemoMacroHedgeExecutor.fork.t.sol:6-39`)
The forge-installed Panoptic V2 + periphery, via the remappings in `contracts/remappings.txt`:
- `@contracts/` = `lib/panoptic-v2-core/contracts/` → `PanopticFactoryV4`, `PanopticPool` (as `PanopticPoolV2`), `interfaces/IRiskEngine`.
- `@panoptic/` = `lib/panoptic-v2-core/` → `script/DeployProtocol.s.sol` (test-only deploy).
- `@panoptic-periphery/` = `lib/panoptic-helper/src/` → `StrategyBuilder`, `PanopticQuery`.
- `@types/` = `lib/panoptic-v2-core/contracts/types/` → `TokenId`, `TokenIdLibrary`.
- `@tokens/` = `lib/panoptic-v2-core/contracts/tokens/` → `ERC1155Minimal`, `interfaces/IERC20Partial`.
- `v4-core/` = `lib/v4-core/src` → `PoolKey`, `PoolId`, `BalanceDelta`, `IHooks`, `Currency`, `TickMath`.
- Local `src/` → `HedgeLegParams`, `PayoffTerms`, `PositionInfo`, the libs (`PayoffTerms`, `PriceGrids`, `VolToWidth`, `PoolIdMappers`), `RiskManagement`, `interfaces/IMacroThesis`.

> **`StrategyBuilder` is imported but UNUSED in the resolver** (`:24` is the only reference; grep confirmed no `strategyBuilder` usage). The mint builds the `TokenId` manually via `TokenIdLibrary.addLeg` and calls `dispatch` directly. So `StrategyBuilder` is NOT a load-bearing dependency for EXEC-01 — the executor does not need it. (`PanopticQuery` IS load-bearing — `RiskManagement` holds one, `RiskManagement.sol:25,28`.)

> **`IPanopticData` seam (`contracts/src/instrument/interfaces/IPanopticData.sol`) is NOT used by the Polygon demo.** That seam is the Phase-7/8 Base-fork abstraction (`STATE.md:86`). The Polygon demo imports the **concrete** `PanopticPoolV2` directly (`:15`). Phase 13 can keep importing the concrete pool (simplest, matches the green demo) OR route through `IPanopticData` for the swap-seam — recommendation: **match the demo (concrete `PanopticPoolV2`)** for the MVP, since the cornerstone is fixed to this real pool and the seam adds nothing for a single committed deployment. Flag the seam as an optional cleanliness task, not MVP.

**Confidence: HIGH** — imports copied from the compiling, green demo.

---

## 7. `OperationalCostManagement` design (EXEC-03)

### What it must capture
DRAFT.md (`:64-65`): "*The user has not been charged for the agent and for the data (cummCost …)*". The `cummCost` is the **cumulative SOMI agent-call cost + the data cost** across Agent 1 (Strategist) + Agent 2 (Executor) that the user is ultimately charged for. The note in the stub: `// note: SOMI measured, this needs to have entry/exit points to pay Somnia` (`OperationalCostManagement.sol:5`).

### The two cost components (from CLAUDE.md domain non-negotiables + DRAFT)
1. **Agent-call cost (SOMI):** each `llm-inference` / `json-fetch` call costs `p_i · subSize` SOMI (class prices 0.03 / 0.07 / 0.10 SOMI per call; `minPerAgentDeposit = 0.01`; `subSize_default = 3` — CLAUDE.md). The real per-call cost is the deposit forwarded (`SomniaAgentConsumer._sendRequest` forwards the whole `msg.value`, `SomniaAgentConsumer.sol:63-74`). NOTE (memory `project-realized-executioncost-structurally-absent`): the *realized* `executionCost` is structurally unavailable on Somnia — so the ledger accrues the **forwarded/budgeted cost** (the over-funded `msg.value`), not a realized figure. Be explicit about that in the units column.
2. **Data cost:** the metered hedge-data cost (Phase 9's `φ_data` lineage — the per-position incremental data cost). For Phase 13's demo scope, this can be a fixed/stubbed input.

### Minimal demo-scoped shape (Claude's discretion)
```solidity
contract OperationalCostManagement {
    // cumulative cost the user is charged for, per "decision" (a decisionId or a positionId)
    struct CostLine { uint256 agentCostSomi; uint256 dataCost; bool minted; }
    mapping(bytes32 => CostLine) public costOf;   // keyed by decisionId (Agent-1's bytes32(requestId))
    uint256 public cummCostSomi;                  // global running total (the cummCost)
    uint256 public cummDataCost;

    event AgentCostAccrued(bytes32 indexed decisionId, uint256 somi, uint256 cummSomi);
    event DataCostAccrued(bytes32 indexed decisionId, uint256 dataCost, uint256 cummData);
    event CostFinalized(bytes32 indexed decisionId, uint256 totalSomi, uint256 totalData);

    // ENTRY points (called once per agent call — Agent 1 leg + Agent 2 leg):
    function accrueAgentCost(bytes32 decisionId, uint256 somi) external; // adds to costOf + cummCostSomi
    function accrueDataCost(bytes32 decisionId, uint256 dataCost) external;

    // EXIT / conservation read:
    function totalCost(bytes32 decisionId) external view returns (uint256 somi, uint256 data);
}
```

### Entry/exit points
- **Per agent call** (NOT per mint): accrue when each `llm-inference`/`json-fetch` request is *sent* (the cost is incurred at request time — the deposit is forwarded then). Agent 1 accrues its inference cost; Agent 2 accrues its representativeness-inference cost (if the stretch path runs) + the mint's data cost. Keying by `decisionId` (Agent 1's `bytes32(requestId)`, the same join key Phase 11 uses — `STATE.md:63`) lets both agents' costs aggregate under one user decision.
- **Exit:** `totalCost(decisionId)` is read at settlement / by the UI to show the user the `cummCost`.

### No-double-count conservation check (the EXEC-03 gate)
The conservation invariant must assert **each agent-call cost is accrued exactly once** and the global accumulator equals the sum of the per-decision lines:
```
invariant: cummCostSomi == Σ_decision costOf[decision].agentCostSomi
invariant: cummDataCost == Σ_decision costOf[decision].dataCost
```
- The double-count failure mode mirrors Phase 9's `invariant_dataCostConserved` (`ROADMAP.md:110`, `REQUIREMENTS.md:22`): a fixed cost charged once must NOT be re-added N times. For Phase 13, the analogue is: **an agent call accrued once per `(decisionId, leg)`** — guard with the same idempotency the Strategist uses (`actionSet`/`sizeSet`-style flags, `STATE.md:63`) so a re-delivered callback or a re-sent request does not double-accrue.
- A unit/fuzz test drives N decisions × M legs, accrues, and asserts the global accumulator equals the independent sum (the non-vacuous, mutation-proven form Phase 8/9 use, `STATE.md:53`).

**Keep it demo-scoped:** no real SOMI transfer logic in Phase 13 (that's the K_AI escrow / IAgentRequester path, out of this fork's scope — the mint is on Polygon, the agent calls are on Somnia). The ledger ACCRUES and CONSERVES; actual payment/settlement is the cross-chain deferred path (XCHAIN-01). State this boundary explicitly.

**Confidence: HIGH** for the shape + conservation pattern (mirrors the committed Phase-8/9 invariant discipline); **MEDIUM** for the exact SOMI cost figures (use the budgeted/forwarded `msg.value`, not realized, per memory).

---

## Don't Hand-Roll

| Problem | Don't build | Use instead | Why |
|---|---|---|---|
| vol→width→strike→TokenId | A new resolver | The committed `PolygonConvexPositionResolverHarness` body (`:66-120`) + the libs (`PayoffTerms`/`PriceGrids`/`VolToWidth`/`PoolIdMappers`) | Proven + green; the prompt forbids re-deriving it |
| The mint flow | A custom dispatch sequence | The committed short-then-long two-`dispatch` block (`:93-119`) | Proven against the real pool; the short counterparty + `fl=[shortId,positionId]` ordering is load-bearing |
| Margin computation | A custom collateral calc | `RiskManagement.quoteCollateralRequirements` → `PanopticQuery.checkCollateral` (`:34-47`) | Already wired; do not reimplement the cross-buffer/utilization math |
| The solvency GATE | A pre-mint check | The protocol-native `_validateSolvency`/`AccountInsolvent` inside `dispatch` (`:788-796,1142`) | A pre-mint check on the position REVERTS (`:559`); the atomic post-mint revert IS the gate |
| Agent callback auth/replay | New auth | The inherited `SomniaAgentConsumer.handleResponse` (`:78-91`) | NotPlatform + pendingRequests replay-guard already CEI-safe |
| Pool-id derivation | Runtime `keccak` everywhere | The `POLYGON_WCOP_USDC_POOL_ID` constant (§4) | Stable anchor for Agent 1 + Agent 2 (STRAT-02) |

---

## Common Pitfalls

### Pitfall 1: Quoting a not-yet-minted position
**What goes wrong:** Calling `quoteCollateralRequirements` before the mint → `PositionNotOwned()` revert (`PanopticPool.sol:559`).
**Avoid:** Quote POST-mint (informational), gate via the atomic `dispatch` revert (§2).

### Pitfall 2: Collateral-ownership mismatch
**What goes wrong:** Funding `address(this)` (the test) but having the executor call `dispatch` → executor has zero collateral shares → `AccountInsolvent`. The harness funds BOTH the test contract AND the harness (`:273-290`) precisely because the harness is the dispatch caller.
**Avoid:** Deposit collateral with `receiver = address(executor)`; the executor must own the shares it mints against.

### Pitfall 3: `_onResult` type-confusion
**What goes wrong:** `abi.decode(abi.encode(responses[i]), (HedgeLegParams))` (`MacroHedgeExecutor.sol:29`) is a layout error.
**Avoid:** `abi.decode(responses[i].result, (HedgeLegParams))` — decode the `result` bytes, not the wrapper (§3).

### Pitfall 4: optionRatio overflow (the silent `% 128` wrap — NOT a uint128 cast)
**What goes wrong:** `optionRatio` is 7 bits (max 127, `TokenId.sol:29`); `HedgeLegParams.size` is `uint256`. The demo uses `size=100` (fits). The truncation is **NOT** a `uint128(legParams.size)` cast — trace the mechanism: `addLeg`'s `_optionRatio` parameter is itself `uint256` (`TokenId.sol:346`), and `addOptionRatio` masks the written value with `% 128` (`TokenId.sol:237`: `TokenId.unwrap(self) + (uint256(_optionRatio % 128) << ...)`). So `size >= 128` silently wraps to a SMALLER/zero ratio — `size == 128` writes optionRatio `0`, a malformed/inactive leg — with **NO revert** (there is no overflow check anywhere on the `addLeg` path). The `uint128(legParams.size)` cast that appears in the `_onResult` line casts into `positionSize` (the *dispatch size*) — a DIFFERENT field from `optionRatio` — and is incidental, NOT the truncation mechanism.
**Avoid:** `require(legParams.size <= 127, "optionRatio overflow")` on the ORIGINAL `uint256 legParams.size`, placed as the FIRST statement of the shared `_resolveAndMint` sink (covering BOTH the `resolveAndMint` and the `_onResult` entrypoints). The check is on the original `uint256` because the `% 128` mask is the corruption mechanism — guarding the un-masked value is the real protection; the `uint128(...)` cast on `positionSize` is irrelevant to it. (`test_resolveAndMint_sizeGuard`: `size = 128` → revert.)

### Pitfall 5: fork-state nonce collision
**What goes wrong:** `vm.loadAllocs` restores the snapshot but occupies low CREATE nonces; per-test `new` deployments collide (`:223-229`). The demo bumps `vm.setNonce(address(this), 64)`.
**Avoid:** Keep the `setNonce(64)` pattern when adding the executor `new`-deployment to `_init_world`.

### Pitfall 6: RPC 429 on rapid fork runs
**What goes wrong:** Alchemy rate-limits rapid successive Polygon fork runs (same Base-fork pattern, `STATE.md:53,136`).
**Avoid:** The fork-state cache (`fork-state/polygon-panoptic.json`) is present; reuse it. Run the mint test isolated with short backoff. Add a `polygon` `rpc_storage_caching` entry to foundry.toml (currently only chain 8453/Base is cached, `foundry.toml`).

---

## Validation Architecture (Nyquist)

`workflow.nyquist_validation: true` (`.planning/config.json`) — this section is REQUIRED.

### Test Framework
| Property | Value |
|---|---|
| Framework | Foundry `forge-std` Test + bulloak 0.9.2 BTT (`.tree` before impl, co-located) |
| Config | `contracts/foundry.toml` (solc 0.8.24, cancun, `[rpc_endpoints] polygon = "https://polygon-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}"`, line 26) |
| Env | `contracts/.env` has `ALCHEMY_API_KEY` set (verified); fork via `vm.rpcUrl("polygon")` + `vm.createSelectFork(..., 86_900_000)` in `setUp()` (`:212-213`); state cache `fork-state/polygon-panoptic.json` (present) |
| Quick run | `cd contracts && make test-demo` → `forge test --match-path "test/fork/DemoMacroHedgeExecutor.fork.t.sol" -vv` (NO `--fork-url` flag — fork is selected INSIDE `setUp`) |
| Re-run-from-scratch | `make test-demo-fresh` (`clean-state` → re-deploys core, re-snapshots) |

### Phase Requirements → Test Map (the minimal observable signals)
| Req | Behavior to prove | Test type | Command | Signal |
|---|---|---|---|---|
| **EXEC-01** | Mint through the REAL deployable `MacroHedgeExecutor` (not the harness): `executor.resolveAndMint(legParams, 0, 1e6)` succeeds; `s_positionBalance[executor]` holds the position; `PositionMinted` + `RepresentativenessAssessed` events fire | fork | `forge test --match-path "test/fork/MacroHedgeExecutor.fork.t.sol" --match-test "test__takeDemoPosition__Succeeds" -vv` | PASS + `numberOfLegs(executor) > 0` + position-balance positionSize > 0 (the `test__takeDemoPosition__Succeeds` lineage, now contract-owned) |
| **EXEC-02** | (a) POST-mint `quoteCollateralRequirements` returns a `BalanceDelta` (no revert) for the minted position; (b) NEGATIVE gate: an under-funded executor → mint reverts `AccountInsolvent`, no position persists | fork | `forge test --match-path "test/fork/MacroHedgeExecutor.fork.t.sol" --match-test "test_margin" -vv` | (a) `BalanceDelta` returned; (b) `vm.expectRevert` catches `AccountInsolvent`, `numberOfLegs(executor) == 0` after |
| **EXEC-03** | `cummCost` accrues agent + data cost across both agents; global accumulator == Σ per-decision lines; re-delivery does NOT double-accrue | unit + fuzz | `forge test --match-path "test/instrument/OperationalCostManagement.t.sol" -vv` | conservation invariant green, mutation-proven non-vacuous (zero one line → assertion fails) |

> **Note on the fork command:** the committed demo is invoked WITHOUT `--fork-url` (the Makefile `test-demo` target, and `setUp` does `vm.createSelectFork(vm.rpcUrl("polygon"), …)`). A `--fork-url` flag is NOT needed and would be ignored by the in-`setUp` fork. If a plan author prefers an explicit flag for CI, it is `--fork-url "$(echo https://polygon-mainnet.g.alchemy.com/v2/$ALCHEMY_API_KEY)"` but the in-test fork is the proven path.

### Sampling Rate
- **Per task commit:** the relevant `--match-test` (e.g. the mint test alone) — fast (~420ms on cached state).
- **Per wave merge:** the full `make test-demo` (all executor fork tests) + the `OperationalCostManagement` unit suite + `bulloak check` on every new `.tree`.
- **Phase gate:** `cd contracts && make test-demo` green (the `test__takeDemoPosition__Succeeds` lineage through the executor) + the EXEC-02 negative-gate test + the EXEC-03 conservation invariant + every per-file `bulloak check` exit 0, before `/gsd:verify-work`.

### Wave 0 Gaps (must exist before impl, per evm-tdd Iron Law)
- [ ] `contracts/test/fork/MacroHedgeExecutor.fork.tree` — BTT for resolveAndMint / margin-gate / events (mirror `MacroHedgeStrategist.tree` style, `test/instrument/MacroHedgeStrategist.tree`)
- [ ] `contracts/test/fork/MacroHedgeExecutor.fork.t.sol` — FAILING first; promotes `_init_world` to deploy + fund `MacroHedgeExecutor` (collateral `receiver = address(executor)`)
- [ ] `contracts/test/instrument/OperationalCostManagement.tree` + `.t.sol` — conservation/no-double-count BTT + FAILING test
- [ ] `contracts/test/instrument/MacroHedgeExecutor.onResult.t.sol` (unit) — `abi.decode(responses[0].result, (HedgeLegParams))` routes correctly + inherited NotPlatform/replay guards (no live Somnia)
- [ ] Framework: none to install (Foundry + bulloak 0.9.2 already present); add `polygon` to `rpc_storage_caching` chains in foundry.toml (cache currently Base-only)

*(No new test framework needed — the infra is the committed Polygon-fork harness + bulloak.)*

---

## State of the Art

| Old (stub/harness) | Current (Phase-13 target) | Why |
|---|---|---|
| Resolver lives in a test harness (`PolygonConvexPositionResolverHarness`), harness owns collateral + position | Resolver promoted into `MacroHedgeExecutor`; the **contract** owns collateral (deposit `receiver = executor`) + position | Deployable, agent-driven (EXEC-01) |
| `_onResult` = `abi.decode(abi.encode(responses[i]),(HedgeLegParams))` (type error) | `abi.decode(responses[i].result, (HedgeLegParams))` | Correct decode of the consensus `result` bytes (§3) |
| Implicit "pre-mint margin gate" assumption | POST-mint margin read (informational) + protocol-native atomic `AccountInsolvent` gate | Pre-mint quote on the position reverts (`:559`) — §2 |
| `OperationalCostManagement` empty | `cummCost` accumulator + conservation invariant | EXEC-03 |
| Pool id recomputed at runtime | `POLYGON_WCOP_USDC_POOL_ID` constant | STRAT-02 anchor (§4) |

**Deprecated/avoid:** the `IPanopticData` Base-fork seam (`src/instrument/interfaces/IPanopticData.sol`) for the Polygon demo — the demo uses the concrete `PanopticPoolV2`; the seam adds nothing for this fixed cornerstone pool.

---

## Open Questions

1. **Exact Phase-12 → Phase-13 hand-off payload format.** Phase 12 (STRAT-02) emits "a structured instrument spec that decodes into a `HedgeLegParams`." Whether that is an abi-encoded `HedgeLegParams` in `Response.result`, or a string the executor re-parses, determines `_onResult`'s decode. **Recommendation:** lock the hand-off as an abi-encoded `HedgeLegParams` (so `abi.decode(result, (HedgeLegParams))` is exact); confirm with the Phase-12 plan. For the MVP fork test it's moot (direct `resolveAndMint`).
2. **`IMacroThesis` concrete shape.** Empty today; the resolver never reads `economicTheory`. Phase 13 only needs it to compile (pass `IMacroThesis(address(0))` like the demo, `:162`). The concrete economic-school shape is Phase 12's STRAT-01 (`ROADMAP.md:152`). **Recommendation:** do NOT design it in Phase 13 beyond what compiles.
3. **Realized SOMI cost vs budgeted.** Memory `project-realized-executioncost-structurally-absent`: the realized `executionCost` is unavailable on Somnia. The `cummCost` ledger must accrue the **forwarded/budgeted** `msg.value` (deposit), not a realized figure. Document the units/source column explicitly.

---

## Sources

### Primary (HIGH confidence — committed source, read this session)
- `contracts/test/fork/DemoMacroHedgeExecutor.fork.t.sol` — the proven recipe: resolver (`:64-122`), short-then-long mint (`:93-119`), `_init_world` collateral funding (`:262-291`), post-mint margin quote (`:342-345`), fork setup (`:211-241`). Re-run green: `test__takeDemoPosition__Succeeds` 1 passed (419ms).
- `contracts/src/MacroHedgeExecutor.sol` (`:1-34`) — the stub to promote; `_onResult` pseudo-code (`:22-32`).
- `contracts/src/SomniaAgentConsumer.sol` (`:63-97`) — `_sendRequest` forwards full `msg.value`; `handleResponse` auth/replay; `_onResult` hook.
- `contracts/src/RiskManagement.sol` (`:34-47`) — `quoteCollateralRequirements` → 4-arg `checkCollateral`.
- `contracts/src/libraries/FundingDelta.sol` — `BalanceDelta` = `balance − required` per token.
- `contracts/src/types/{HedgeLegParams,PayoffTerms,PositionInfo}.sol`; `contracts/src/libraries/{PayoffTerms,PriceGrids,VolToWidth,PoolIdMappers}.sol`.
- `contracts/lib/panoptic-v2-core/contracts/PanopticPool.sol` — `getFullPositionsData` (`:484-521`), `_calculateAccumulatedPremia` `PositionNotOwned` (`:559`), `dispatch` (`:666-799`), `_mintOptions` state write (`:824-866`), `_validateSolvency`/`AccountInsolvent` (`:1113-1145`, `:1142`), `s_positionBalance` (`:862`).
- `contracts/lib/panoptic-v2-core/contracts/CollateralTracker.sol` — `deposit(assets, receiver)` `_mint(receiver, shares)` (`:557-592`); `if (assets == 0) revert Errors.BelowMinimumRedemption()` (`:563` — a ZERO deposit reverts a DIFFERENT error than `AccountInsolvent`; the under-funded gate must deposit a NONZERO amount far below requirement).
- `contracts/lib/panoptic-v2-core/contracts/types/TokenId.sol` — `addLeg` arg order (`:343-361`), `_optionRatio` is `uint256` (`:346`), `addOptionRatio` masks `% 128` (`:237`), optionRatio 7-bit (`:29`).
- `contracts/lib/panoptic-helper/src/PanopticQuery.sol` — 4-arg `checkCollateral` (`:48-127`), `_getMargin` (`:189-227`).
- `git show 67acc91` — the documented `checkCollateral` / minting-flow limitation.
- `contracts/foundry.toml`, `contracts/remappings.txt`, `contracts/Makefile`, `contracts/.env` (keys), `fork-state/polygon-panoptic.json` (present), bulloak 0.9.2 (verified).
- `.planning/ROADMAP.md` (Phase 13 `:156-162`, cornerstone `:132-136`), `.planning/REQUIREMENTS.md` (EXEC-01/02/03 `:34-36`), `.planning/STATE.md` (Phase-8 custody/invariant discipline), `DRAFT.md` (Agent-2 `:174-251`, `cummCost` `:64-65`, `PositionNotOwned` `:237`).

### Secondary (MEDIUM confidence — project memory)
- `project-realized-executioncost-structurally-absent` (SOMI realized cost unavailable → accrue budgeted).
- `project-somnia-testnet-integration-state` (testnet PLATFORM, LLM agent id proven live; STT-faucet gating for the stretch inference).
- `project-cornerstone-polygon-pivot` / `project-somi-leg-arc-and-data-sourcing` (cornerstone is Polygon wCOP/USDC).

### Tertiary (LOW confidence)
- None. All load-bearing claims are sourced to committed code.

---

## Metadata

**Confidence breakdown:**
- Promotion mechanics + collateral shift (EXEC-01): HIGH — line-cited; demo green this session.
- `checkCollateral` / margin reality (EXEC-02): HIGH — `PanopticPool.sol:559,788-796,862,1142` read directly + `67acc91` confirms.
- `OperationalCostManagement` shape (EXEC-03): HIGH for the conservation pattern (mirrors committed Phase-8/9 invariants); MEDIUM for exact SOMI figures (budgeted, not realized).
- `_onResult` decode: HIGH for mechanics; MEDIUM for the live payload format (Phase-12 hand-off — flagged open).
- Representativeness MVP-vs-stretch: HIGH (scoping grounded in deadline + the demo's direct-construct precedent).

**Research date:** 2026-06-06
**Valid until:** ~2026-07-06 for the local source (stable, committed); the Phase-12 hand-off payload (Open Q1) should be re-confirmed when Phase 12 lands.

## RESEARCH COMPLETE

1. **Promotion mechanics:** Lift the resolver out of `PolygonConvexPositionResolverHarness` (`:64-122`) into `MacroHedgeExecutor.resolveAndMint(HedgeLegParams, legIndex, positionSize)`; the executor becomes the `dispatch` caller AND must own the CollateralTracker shares (`ct.deposit(assets, address(executor))`, because `dispatch` keys `s_positionBalance[msg.sender]` and `_validateSolvency` checks `msg.sender`); the test funds the executor (not just itself), preserving the `test__takeDemoPosition__Succeeds` lineage now contract-owned.
2. **checkCollateral / margin reality (EXEC-02):** A true pre-mint solvency gate on the position is IMPOSSIBLE — `quoteCollateralRequirements` on a not-yet-minted position reverts `PositionNotOwned()` (`PanopticPool.sol:559`, exactly what `67acc91` documents). The margin `BalanceDelta` is meaningful only POST-mint; the REAL "insufficient collateral → no mint" gate is the protocol-native atomic `AccountInsolvent` revert inside `dispatch` (`:788-796,1142`), which unwinds the mint. EXEC-02 asserts the post-mint margin read + the negative atomic gate, NOT a pre-mint quote.
3. **OperationalCostManagement shape (EXEC-03):** A `cummCost` accumulator keyed by `decisionId`, with per-leg agent-cost + data-cost entry points (per agent call, not per mint), accruing the budgeted (not realized — Somnia constraint) SOMI, under a conservation invariant `cummCost == Σ per-decision lines` with idempotent (no-double-count) accrual mirroring Phase-9's `invariant_dataCostConserved`.
4. **MVP vs stretch:** MVP = the deployable mint (EXEC-01 core) + post-mint margin + atomic gate (EXEC-02) + cost ledger (EXEC-03) + the `RepresentativenessAssessed` event (decision surfaced for the UI, source stubbed) + the `POLYGON_WCOP_USDC_POOL_ID` constant. STRETCH = the live `llm-inference` representativeness round-trip on Somnia testnet (the fork test constructs `HedgeLegParams` directly, like the demo; `_onResult` wired + unit-tested for the live path). `StrategyBuilder` and the `IPanopticData` seam are NOT needed for the MVP.
5. **Honest blocker:** none — the core is committed and green; the one impossibility (pre-mint position quote) has a clean honest alternative (post-mint read + atomic gate).
6. **Iron Law:** `.tree` + FAILING tests before impl, co-located, `bulloak check` per-file; the mint test runs via `make test-demo` (fork selected in `setUp`, no `--fork-url` flag), cached fork-state, RPC-429-aware.
