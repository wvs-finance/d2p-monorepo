# Phase 14: Representativeness derivation (Agent 2 brain) — pool-mirrors-risk → geometry - Research

**Researched:** 2026-06-06
**Domain:** PKE representativeness model → deterministic on-chain Panoptic-V2 TokenId geometry (additive `resolveFromMandate` on the shipped Phase-13 mint core)
**Confidence:** HIGH (on-chain pipeline + tooling), HIGH (PKE grounding — read verbatim), HIGH (the strike-derivation fix — RE-RESEARCHED 2026-06-06: the planned `strikeWadForSink` inversion FALSIFIED with the real libraries, Fix C decided + 0-error verified, the near-spot mint FORK-PROVEN to succeed). See Pitfall 1 + 1b + Open Q1.

<user_constraints>
## User Constraints (from 14-CONTEXT.md)

### Locked Decisions

**IMacroThesis stays a thin registry + school-keyed brain strategy.**
- `IMacroThesis` STAYS the handle-resolving registry from Phase 12 (do NOT bloat it into a polymorphic per-method interface). The resolved `economicTheory` handle KEYS a brain-side strategy the Agent-2 brain runs. Different strategy → different geometry (satisfies the binding constraint without new contract surface).
- **POST_KEYNESIAN is the ONE implemented strategy** this phase (Scenario 1 IS the PKE wage-earner FX hedge). **SHILLER stays a documented reserved slot** (registry resolves the label; its strategy is a stub/deferred).

**Representativeness = the regime-conditional passthrough CORE (NOT a correlation).**
- The **"inflation adjustment" = β₁(REGIME) × target-devaluation**, conditioned on a regime indicator **Z_t** — drives the cap/width (the wage-earner example's `M = β₁·devaluation`). β₁(REGIME) is the load-bearing distinctive PKE piece: **asymmetric** (β₁(STRESS) > β₁(TRANQUIL)) and allowed to **break across regimes** (NOT a stationary covariance).
- a **pool-liquidity-depth feasibility gate** (on-chain): can the pool absorb the sized position at the structural strikes?
- a **Davidson honesty flag**: the *parametric* share is hedged; the *non-ergodic* remainder is **disclosed, not hedged** (surfaced, never silently implied as covered).
- The "inflation adjustment" is the **wage-share-specific passthrough applied to the target devaluation — NOT a CPI index level**.
- **The binding constraint (honesty test):** the derived geometry MUST show **≥1 parameter that quantitatively differs from a stationary-vol/GBM baseline** (the asymmetric β₁-driven cap and/or the regime-conditional width) — else the school label is rhetoric.

**Data + on/off-chain split — deterministic core + inferToolsChat narrative.**
- **The GEOMETRY is deterministic:** on-chain pool reads (liquidity depth, pool-derived realised vol) + a **regime oracle** feeding `Z_t` + a **pre-computed β₁(REGIME)** parameter. **Fail-safe: default to the STRESS multiplier on oracle staleness** (§3.6 guardrail).
- **`inferToolsChat` is the SURFACED reasoning/narrative layer** — produces the `ExecutorDecided` representativeness rationale for the UI. It **explains; it does NOT drive the deterministic geometry math.**
- **On-chain / native:** pool liquidity + reserves, pool-derived realised vol, the geometry derivation, the regime-multiplier *application*, the resulting score + honesty flag.
- **Off-chain (oracle / attestation / pre-computed param):** EMBI Colombia, VIX, CIP residual, DANE CPI decomposition, the fitted β₁(REGIME), the Davidson decidable-procedure tests, the Z_t regime classification.

**Demo fidelity — faithful structure, stubbed numbers, TEMPLATE-labeled.**
- Keep the PKE structure (mechanism-membership framing + regime-conditional passthrough + honesty split) with stubbed/oracle-fed numbers, and carry an explicit **TEMPLATE banner** ("placeholder numbers, not deployment-ready").
- Demonstrate the GBM-divergence (the ≥1-param-≠-GBM binding constraint) visibly.

### Claude's Discretion

- The exact β₁(REGIME) values + the Z_t thresholds (illustrative-vintage from the wage-earner example: β₁≈0.10 tranquil / 0.35 stress; Z_t from EMBI>350bp / VIX>30 / 1m realised-vol>18% / TRM-intervention; treat as stubs to confirm).
- The **instrument-direction convention** (RESEARCH GATE) — reconcile so the derived geometry actually pays on COP depreciation (the wage-earner's loss direction).
- The regime-oracle interface shape (`IRegimeOracle` returning Z_t + staleness); how the honesty flag + the TEMPLATE caveat surface on-chain (event/field) AND on the UI.
- How β₁(REGIME) + Z_t are passed in (constructor immutable vs settable param vs oracle read) and the `resolveFromMandate` signature + its wiring to the shipped mint sink.
- Whether `inferToolsChat` is live this phase or its narrative is stubbed (the deterministic geometry must not depend on it either way).

### Deferred Ideas (OUT OF SCOPE)

- **Full composite representativeness** — the currency-hierarchy liquidity-premium adjustment + the full Davidson test battery (BDS/ADF/Bai-Perron/pseudo-OOS). The demo computes the β₁(REGIME) core + honesty flag; the rest is disclosed-but-stubbed.
- **The SHILLER brain** — a mechanically-distinct second strategy; reserved registry slot, deferred (POST_KEYNESIAN-only this phase).
- **The live econometric estimation pipeline** — Bai-Perron breaks / SVAR / regime-switching estimation / SFC simulation (the off-chain `abrigo-analytics` track produces the β₁(REGIME) the brain consumes; not built here).
- **Wage-led/profit-led aggregate tension** (Manifesto §8) — deferred / disclosed, not modeled in the demo geometry.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| REPR-01 | A dedicated **representativeness** analysis: agent tool-calls over the live wCOP/USDC pool activity (on-chain liquidity/TVL via `PanopticQuery`; volume/depth via tool-calls) and computes a **parameterized mathematical model** of how representative the pool is of the target COP-inflation risk (the "inflation adjustment"), with the measure + parameters surfaced for the UI (`ExecutorDecided`). | §"On-chain feasibility signal" (the `PanopticQuery.getTickNets` liquidity-depth scan + the `getOracleTicks` spot/median dispersion as the pool-derived realised-vol proxy); §"The representativeness model" (the deterministic β₁(REGIME)×devaluation core + liquidity gate + honesty flag); §"Code Examples" (the `RepresentativenessAssessed`/`ExecutorDecided` event shape — the executor already emits `RepresentativenessAssessed(requestId, rationale, representative)`). |
| REPR-02 | `resolveFromMandate(HedgeMandate)` derives a well-formed `HedgeLegParams` (moneyness/strike/width/feasible-size; size in the `optionRatio ≤127` bound) from the mandate + the representativeness measure and mints via the **shipped** `MacroHedgeExecutor` core (the Polygon-fork mint green through this path); the live `inferToolsChat` tool-calling round-trip = STRETCH. | §"The representativeness→geometry derivation" (the field-by-field mandate→`HedgeLegParams` map onto the committed PriceGrids/VolToWidth/TokenId pipeline); §"`resolveFromMandate` design" (signature + wiring to the shipped `_resolveAndMint` sink); §"Common Pitfalls" (the `optionRatio % 128` mask, the strike-WAD direction bug, do-not-rebuild-the-mint); §"Validation Architecture" (the test map). |
</phase_requirements>

## Summary

Phase 14 is a **deterministic translation layer**, not new financial machinery. The shipped Phase-13 `MacroHedgeExecutor` (`contracts/src/MacroHedgeExecutor.sol`) already owns a complete, fork-proven mint sink — `_resolveAndMint(HedgeLegParams memory, legIndex, positionSize, requestId)` — that derives width (VolToWidthLib), asset/riskPartner (PayoffTermsLib), strike (PriceGridsLib → TickMath), the `addPoolId`/`addLeg` TokenId, and dispatches the short-then-long pair. Phase 14 adds ONE additive external function, `resolveFromMandate(HedgeMandate, ...)`, that fills the geometry fields the mandate omits (strikeWAD, vol→width, size, asset, isLong) from a **PKE-grounded representativeness model**, then calls the SAME `_resolveAndMint` sink. The mint core is REUSED verbatim; the novel content is the mandate→geometry math.

The representativeness model is **not a correlation** (a correlation presupposes the ergodicity Davidson denies for COP/USD). It is the **regime-conditional asymmetric passthrough core**: `inflationAdjustment = β₁(REGIME_t) × targetDevaluation`, where `REGIME_t` is read from an `IRegimeOracle` returning a regime indicator `Z_t` + a staleness timestamp (default-to-STRESS on staleness, per the source example §3.6), and `β₁(REGIME)` is a pre-computed parameter (asymmetric: `β₁(STRESS) > β₁(TRANQUIL)`). This adjustment sets the cap/width of the minted leg, which becomes the **≥1-param-≠-GBM binding-constraint demonstration**: a stationary-vol baseline produces ONE width; the regime-conditional model produces a DIFFERENT width when `Z_t = STRESS`. The wage-earner example's `K_lo = S₀·1.05 / K_hi = S₀·1.15 / M = β₁·devaluation` maps onto Panoptic tick geometry — Panoptic V2 ticks ARE the on-chain strike-grid constructor the PKE framework flagged as missing for COP/USD (a stated design strength).

**Primary recommendation:** Build `resolveFromMandate` as a thin deterministic front-end that (1) reads `Z_t` from an `IRegimeOracle` (staleness → STRESS), (2) computes `β₁(Z_t) × devaluation` to set the regime-conditional width via `VolToWidthLib`, (3) sets a structural strike by passing a **pre-snapped `int24` tick** (`RepresentativenessLib.structuralStrikeTick(CANONICAL_COP_USD*115/100, tickSpacing)`) to a Fix-C sink overload — **the planned `strikeWadForSink` inversion is REJECTED (mathematically broken, see Pitfall 1); the committed `exchangeRateToSqrtPriceX96` is NOT used on the mandate path**, (4) gates feasible size against `PanopticQuery.getTickNets` liquidity depth (advisory; the atomic `AccountInsolvent` stays the final gate), (5) emits the representativeness measure + honesty flag + TEMPLATE caveat on an `ExecutorDecided`-style event, then (6) calls the Fix-C sink overload `_resolveAndMintAtStrike(..., int24 strike)` — the shared mint BODY (the short-then-long two-dispatch block) is byte-unchanged; only the strikeWAD->tick derivation is lifted out so the mandate path can pass a pre-snapped tick (Pitfall 1, Code Examples §Fix-C change). Keep `inferToolsChat` STUBBED this phase (it is not even in the vendored `ILLMAgent` interface) — the geometry must not depend on it.

## Standard Stack

This phase adds NO new external libraries. It composes the already-installed, fork-proven repo stack. "Version" = the pinned in-repo state (verified this session).

### Core (already in-repo — REUSE, do not add)
| Library / Module | Version (pinned) | Purpose | Why Standard |
|---|---|---|---|
| Foundry `forge` | 1.5.1-stable (commit b0a9dd9) | build + test runner | repo toolchain; `expectPartialRevert` semantics load-bearing (Phase 13) |
| `bulloak` | 0.9.2 | BTT `.tree` → `.t.sol` scaffold + `check` | evm-TDD Iron Law; `when/it` keyword form mandatory (bare `invariant_*`/`test_*` leaf labels do not parse — every prior phase hit this) |
| solc | 0.8.24, evm `cancun`, viaIR=false, optimizer 200 | compiler profile | Panoptic V2 is `^0.8.24` everywhere; single profile (07-01) |
| `MacroHedgeExecutor.sol` | shipped Phase 13 | the mint sink (`_resolveAndMint`) + `SomniaAgentConsumer` base | the cornerstone Agent-2 core; REUSED, never rebuilt |
| `VolToWidthLib` | in-repo `src/libraries/VolToWidth.sol` | `volToWidth(vol, horizonBlocks, tickSpacing) → int24 width` | the regime-conditional width carrier |
| `PriceGridsLib` | in-repo `src/libraries/PriceGrids.sol` | `fractionToSqrtPriceX96(num,den) → sqrtPriceX96` (the decimal-gap-safe entry; `exchangeRateToSqrtPriceX96` is NOT usable for this pool) | strike-grid constructor — but the MANDATE path uses `RepresentativenessLib.structuralStrikeTick`, not this lib directly (Pitfall 1) |
| `PayoffTermsLib` | in-repo `src/libraries/PayoffTerms.sol` | `deriveWidthFromVol`/`deriveAsset`/`deriveRiskPartner` | typed field reads from `PayoffTerms` |
| `PoolIdMappersLib` | in-repo `src/libraries/PoolIdMappers.sol` | `panopticPoolIdFromUniV4PoolId(PoolId, vegoid, tickSpacing) → uint64` | the `addPoolId` input |
| `PolygonPools` | in-repo `src/libraries/PolygonPools.sol` | `POLYGON_WCOP_USDC_POOL_ID()` (pure fn) + `wcopUsdcKey()` | the cornerstone pool anchor; ordering load-bearing |
| `TokenIdLibrary` | `@types/TokenId.sol` (panoptic-v2-core) | `addPoolId`/`addLeg` | the leg encoder; `addOptionRatio` masks `% 128` (Pitfall 4) |
| `PanopticQuery` | `@panoptic-periphery/PanopticQuery.sol` (panoptic-helper) | `getTickNets`/`checkCollateral` | the on-chain liquidity-depth + collateral reads |
| `PanopticPoolV2` | `@contracts/PanopticPool.sol` (panoptic-v2-core) | `getOracleTicks`/`getCurrentTick`/`getTWAP`/`numberOfLegs` | the on-chain oracle/tick surface |

### Supporting (new in-repo surface this phase will author)
| Module | Purpose | When to Use |
|---|---|---|
| `IRegimeOracle` (new interface) | returns `Z_t` (a regime enum/uint) + `observedAt` (staleness) | the deterministic `Z_t` source; mirror the `MacroOracle.latest` + `deliveredAt == 0 ⇒ unset` precedent (`src/MacroOracle.sol`) |
| `RepresentativenessLib` (new pure library) — recommended | the deterministic β₁(REGIME)×devaluation core + the GBM-baseline-width comparator | keep the math pure + unit-testable in isolation (the proven `PolygonPools`/`PayoffTermsLib` pattern), so the GBM-divergence test does not need a fork |
| `ExecutorDecided` event (extend the executor) | surface the representativeness measure + β₁/Z_t + honesty flag + TEMPLATE caveat | the UI contract; the executor ALREADY emits `RepresentativenessAssessed(requestId, string rationale, bool representative)` — extend or add a richer sibling |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|---|---|---|
| pure `RepresentativenessLib` | inline math in `resolveFromMandate` | inline is simpler but the GBM-divergence + the β₁-asymmetry unit tests then require constructing the whole executor; a pure library is fork-free and mutation-testable (matches the 13-03 `OperationalCostManagement` invariant discipline) |
| `IRegimeOracle` read | constructor-immutable `β₁(REGIME)` + a settable `Z_t` | immutable β₁ is fine (it is a pre-computed econometric output, not live); but `Z_t` MUST be settable/oracle-read to demo the regime-switch (STRESS vs TRANQUIL → different width). Recommend: β₁ constructor-immutable pair `(β₁Tranquil, β₁Stress)`, `Z_t` from `IRegimeOracle` with staleness→STRESS |
| live `inferToolsChat` | stubbed narrative + the deterministic event | live is a STRETCH (`inferToolsChat` is NOT in the vendored `ILLMAgent` — would need interface extension + a keeper round-trip); stub keeps the demo green and the geometry independent |

**Installation:** none. `forge build` against the existing `lib/` (restored via `foundry.lock`).

**Version verification:** the stack is the pinned in-repo state, verified this session: `forge --version` → 1.5.1-stable (b0a9dd9); `bulloak --version` → 0.9.2; `foundry.toml` → solc 0.8.24 / cancun / viaIR=false / optimizer 200 / `rpc_storage_caching` chains `[8453, 137]`. These are NOT training-data guesses — they are the live repo toolchain. (No npm registry lookup applies; this is a Foundry/Solidity repo with git-submodule deps restored via `foundry.lock`.)

## Architecture Patterns

### Recommended file layout (additive)
```
contracts/
├── src/
│   ├── MacroHedgeExecutor.sol           # EXTEND: + resolveFromMandate(...) external; + ExecutorDecided event
│   ├── interfaces/
│   │   ├── IMacroThesis.sol              # UNCHANGED (thin registry stays)
│   │   └── IRegimeOracle.sol            # NEW: Z_t + observedAt (staleness)
│   └── libraries/
│       └── Representativeness.sol        # NEW (recommended): pure β₁(REGIME)×devaluation core + GBM comparator
└── test/
    ├── instrument/
    │   ├── Representativeness.tree/.t.sol   # NEW: unit — deterministic geometry + GBM-divergence + β₁ asymmetry + staleness→STRESS
    │   └── (MockRegimeOracle.sol)            # NEW: test double for Z_t (mirror MockMacroOracle)
    └── fork/
        └── DemoMacroHedgeExecutor.fork.t.sol # EXTEND: + test_resolveFromMandate_mintsThroughExecutor (the test__takeDemoPosition lineage, now mandate→geometry→mint)
```

### Pattern 1: Additive front-end onto a shared sink (the Phase-13 promote-don't-invent shape)
**What:** `resolveFromMandate` is a SECOND external entrypoint; it derives `HedgeLegParams` then calls the existing internal `_resolveAndMint`. The mint logic is authored ONCE.
**When to use:** always — the CONTEXT locks "the mint core is REUSED, not rebuilt."
**Example (the shipped Phase-13 sink — Fix C SPLITS this: the strikeWAD->tick line moves up into the public entrypoints, the body below becomes `_resolveAndMintAtStrike(..., int24 strike)`; DO NOT duplicate this body):**
```solidity
// Source: contracts/src/MacroHedgeExecutor.sol:118-184 (shipped Phase 13)
function _resolveAndMint(HedgeLegParams memory legParams, uint256 legIndex, uint128 positionSize, uint256 requestId)
    internal virtual returns (TokenId positionId)
{
    require(legParams.size <= 127, "optionRatio overflow");           // the %128 guard (Pitfall 4)
    require(uint256(legParams.chainId) == block.chainid, "No crosschain allowed yet");
    int24 width  = PayoffTermsLib.deriveWidthFromVol(legParams.payoffTerms);
    uint256 asset = PayoffTermsLib.deriveAsset(legParams.payoffTerms);
    int24 strike = (TickMath.getTickAtSqrtPrice(
        PriceGridsLib.exchangeRateToSqrtPriceX96(legParams.strikeWAD)) / tickSpacing_) * tickSpacing_;
    uint64 pid = PoolIdMappersLib.panopticPoolIdFromUniV4PoolId(legParams.underlyingMarket, vegoid, tickSpacing_);
    positionId = TokenIdLibrary.addLeg(TokenId.wrap(0).addPoolId(pid), legIndex, legParams.size, asset, isLong, ...);
    // short-then-long two-dispatch block (verbatim from the demo harness) ...
    emit RepresentativenessAssessed(requestId, REPRESENTATIVENESS_RATIONALE, REPRESENTATIVE_STUB);
    emit PositionMinted(address(this), positionId, positionSize);
}
```
`resolveFromMandate` builds a `HedgeLegParams memory` (filling payoffTerms.vol/size/asset/isLong from the representativeness model + the mandate's `underlyingMarket`/`economicTheory`/`chainId`/`isLong`; `strikeWAD` is UNUSED on this path), computes `int24 strike = RepresentativenessLib.structuralStrikeTick(CANONICAL_COP_USD*115/100, tickSpacing)` (Fix C — Pitfall 1), emits the richer `ExecutorDecided`, then `return _resolveAndMintAtStrike(legParams, legIndex, positionSize, requestId, strike)`.

### Pattern 2: Deterministic geometry, narrative-decoupled (the Phase-11/12 consumer split)
**What:** The geometry math (`resolveFromMandate`) is a synchronous pure-ish derivation; the LLM narrative (`inferToolsChat`) is a SEPARATE async `SomniaAgentConsumer` leg that only fills the event's human-readable rationale.
**When to use:** always — the CONTEXT locks "it explains; it does NOT drive the deterministic geometry math."
**Example shape (reuse the `MacroHedgeStrategist` two-entrypoint / `_onResult` / try-catch decode pattern — `src/instrument/MacroHedgeStrategist.sol`):** the geometry runs and mints regardless of whether the narrative leg ever lands. If `inferToolsChat` is stubbed this phase, the event carries a constant `TEMPLATE: ...` rationale string (exactly as the executor's current `REPRESENTATIVENESS_RATIONALE` constant does).

### Pattern 3: β₁(REGIME) immutable pair + Z_t oracle read (the regime-switch enabler)
**What:** `(β₁Tranquil, β₁Stress)` are constructor immutables (pre-computed econometric outputs); `Z_t` is read live from `IRegimeOracle`. The width then DIFFERS between a TRANQUIL and a STRESS `Z_t` — that difference IS the GBM-divergence demonstration.
**When to use:** to make the regime-conditional asymmetry observable + testable.
**Why immutable β₁:** β₁ is the off-chain `abrigo-analytics` output, not a live feed — immutable is honest (and matches the Phase-13 `vegoid` immutable pattern). `Z_t` must be oracle-read so the demo can flip regimes.

### Anti-Patterns to Avoid
- **Rebuilding the mint inside `resolveFromMandate`.** Duplicating the short-then-long dispatch block diverges the two paths. Call `_resolveAndMint`.
- **Making the strike/width depend on the LLM result.** The geometry must be deterministic; the LLM only narrates.
- **Trusting `strikeWAD` / `exchangeRateToSqrtPriceX96` to carry the mandate strike.** It CANNOT — see Pitfall 1: the `strikeWadForSink` inversion that would feed `exchangeRateToSqrtPriceX96` collapses `R` to ~200 wei and mis-snaps by up to 1380 ticks (22 tickSpacings) at the K_hi strike. The mandate path computes a pre-snapped `int24` tick via `RepresentativenessLib.structuralStrikeTick` (decimal-gap-correct, `sqrt(humanRate*1e12*Q192)`) and hands it to the sink directly (Fix C). The `strikeWAD` field stays only for the demo/direct `resolveAndMint` path (untouched).
- **Treating representativeness as a correlation/basis-ratio.** Davidson: COP/USD is non-ergodic; a stationary covariance is exactly the inadmissible object. The measure is structural-membership × regime-conditional β₁ × honesty-split, NOT `corr(pool, risk)`.
- **Silently implying the non-ergodic tail is covered.** The honesty flag must be a first-class field/event, never an omission.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---|---|---|---|
| vol → chunk width | a bespoke width formula | `VolToWidthLib.volToWidth` | already fork-proven round-trip (demo asserts `width round-trips`); handles the `√vol·√horizon / tickSpacing`, the `[1,4095]` clamp |
| strike tick from a rate | manual `log_{1.0001}` OR the `strikeWadForSink` inversion | `RepresentativenessLib.structuralStrikeTick(humanRate, ts)` = `snap(getTickAtSqrtPrice(sqrt(humanRate*1e12*Q192)))` | the decimal-gap-correct, 0-error path (Fix C). Do NOT use `exchangeRateToSqrtPriceX96` on the mandate path — its inversion is structurally broken for this pool (Pitfall 1) |
| UniV4 PoolId → Panoptic uint64 | re-deriving the bit layout | `PoolIdMappersLib.panopticPoolIdFromUniV4PoolId` | the `vegoid<<40 | tickSpacing<<48` packing is proven (PolygonPools 3/3) |
| leg encoding | manual bit-shifts | `TokenIdLibrary.addLeg` / `addPoolId` | the `% 128` optionRatio mask + `% 4096` width mask + `int24 & BITMASK_INT24` strike are easy to get wrong |
| liquidity-depth read | scanning ticks by hand | `PanopticQuery.getTickNets(pool, startTick, nTicks)` | returns rescaled cumulative `liquidityNets[]` around a tick — the feasibility signal |
| collateral requirement | re-implementing margin | `RiskManagement.quoteCollateralRequirements` (POST-mint) + the atomic `AccountInsolvent` gate | the pre-mint quote reverts `PositionNotOwned`; the atomic revert is the real gate (EXEC-02) |
| pool realised-vol proxy | an external vol oracle | `PanopticPoolV2.getOracleTicks()` spot/median/latest tick dispersion | the fast 10-min EMA `spotTick` vs slow 8-point-median `medianTick` gap is an on-chain dispersion proxy — no external feed |
| async LLM plumbing | a new request/callback | the `SomniaAgentConsumer` base (`_sendRequest`/`handleResponse`/`_onResult`) | auth + replay + CEI + rebate already proven (Phase 11/12) |
| oracle staleness pattern | a new freshness scheme | the `MacroOracle.latest[key].deliveredAt == 0 ⇒ unset` precedent | `IRegimeOracle` should mirror this; staleness → default-to-STRESS |

**Key insight:** Phase 14 is ~90% wiring of proven primitives + ~10% genuinely new (the β₁(REGIME)×devaluation math, the `IRegimeOracle`, the honesty-flag surfacing, and the strike-direction FIX). Resist re-deriving anything in the first column.

## Common Pitfalls

### Pitfall 1: The `strikeWAD` decimal gap — the `strikeWadForSink` inversion is MATHEMATICALLY BROKEN; feed the sink a pre-computed TICK (Fix C) — RE-RESEARCHED, DECIDED, FORK-PROVEN
> This pitfall was re-researched after the planning-review gate falsified the planned fix. Every number below is computed with the REAL on-chain `PriceGridsLib` + `TickMath` + `FixedPointMathLib` (a throwaway forge harness) and a live Polygon fork at block `86_900_000`. **The earlier "compute a `strikeWadForSink(humanRate)` inversion and feed it through the SHIPPED `exchangeRateToSqrtPriceX96`" plan is REJECTED.** The decision is **Fix C** (the sink accepts a pre-snapped `int24 strike`).

**What goes wrong (TWO distinct bugs):**

1. **The demo's `strikeWAD = 4.1e18` is off-range** (the original finding, still true): `exchangeRateToSqrtPriceX96(R) = sqrt(1e18/R)*Q96` is a raw 1:1-decimal converter that does NOT bake the wCOP(18dp)/USDC(6dp) `1e12` gap. `4.1e18 -> tick -14160`; the live spot is `+358700` (verified on the fork this session — the exact live `getCurrentTick()` at block 86_900_000, ~3778 COP/USD; NOT the ~359015 estimate). ~373k ticks off, in dead tick-space.

2. **The PLANNED FIX (`strikeWadForSink`) does NOT round-trip — structurally impossible, not tunable.** The plan computed `strikeWadForSink(humanRate) = 1e18*Q96^2/targetSqrtP^2` (with `targetSqrtP = sqrt(humanRate*1e12*Q192)`) and fed `R` back through the SHIPPED `exchangeRateToSqrtPriceX96(R) -> getTickAtSqrtPrice -> snap`. **Reproduced numerically (intended `structuralStrikeTick` vs reproduced-from-sink, tickSpacing 60):**

   | humanRate | `R` (wei) | intended tick | reproduced tick | error (ticks) | error / tickSpacing |
   |---|---|---|---|---|---|
   | 3900 (the plan's hand-picked canary) | 256 | 358980 | 358980 | **0** | 0 |
   | **4485 (= 3900*1.15, the K_hi strike the executor actually mints)** | **222** | **360360** | **361680** | **1320** | **22** |
   | 4095 (= 3900*1.05, K_lo) | 244 | 359460 | 360300 | 840 | 14 |
   | 4000 | 250 | 359220 | 360300 | 1080 | 18 |
   | 4450 (sweep max) | 224 | 360300 | 361680 | **1380** | 23 |

   Swept 3000-5000 step 50: error ranges **0 -> 1380 ticks, NON-MONOTONE** (a sawtooth — error is 0 only at the discrete rates where the truncated integer `R` happens to land, e.g. 3450, 3900; the plan's "canary at 3900" sits exactly on a zero of the sawtooth — a TAUTOLOGY). **`R` collapses to a 3-digit integer (200-333 wei) across the whole band** (`R = 1e18*Q96^2/(humanRate*1e12*Q192) = 1e6/humanRate`), so 1 wei of `R` ~ 40 ticks and distinct rates alias to the SAME reproduced sqrtP (4485 and 5000 both -> `R ~ 200-222` -> identical tick 361680). The 5*tickSpacing (=300) band the plan asserts is violated at almost every rate except the hand-picked 3900.

**Why it happens (structural, confirmed):** `exchangeRateToSqrtPriceX96` was designed for `R ~ 1e18` (1:1-decimal pools). The wCOP-currency1 pool needs a price ratio `humanRate*1e12 ~ 3.9e21`, which would require `R = 1e18/(humanRate*1e12) < 1` — **un-representable in integer wei**. So "fix lives in the inversion, sink/`PriceGridsLib`/`exchangeRateToSqrtPriceX96` frozen" is mathematically impossible for this pool. The two reviewers computed this independently; this re-research confirms it to the wei.

**How to avoid — THE DECISION: Fix C (sink accepts a pre-snapped `int24 strike`). PROVEN 0-error + fork-mints.**
- The pure helper computes the strike tick ONCE, decimal-gap-correct, in `RepresentativenessLib.structuralStrikeTick(humanRate, tickSpacing)`:
  ```solidity
  // wCOP is currency1 => price = rawCcop/rawUSDC = humanRate*1e12 (the PoolKeyLib reference, lines 55-63).
  function structuralStrikeTick(uint256 humanRate, int24 ts) internal pure returns (int24) {
      uint160 sp = uint160(FixedPointMathLib.sqrt(humanRate * 1e12 * Q192)); // Q192 = 2**192
      return (TickMath.getTickAtSqrtPrice(sp) / ts) * ts;
  }
  ```
  Verified: `tick -> getSqrtPriceAtTick -> getTickAtSqrtPrice -> snap` is an EXACT fixed point (0-error at 3900/4485/4095) — the snapped tick the helper returns IS the tick that gets minted, with NO inversion in between.
- **The sink stops deriving `strike` from `strikeWAD`.** Add an internal overload that takes the strike as a parameter (the `strikeWAD`/`exchangeRateToSqrtPriceX96` line is REMOVED from the funnel both paths share). See §"`_resolveAndMint` Fix-C change" below for the exact diff — the demo + direct `resolveAndMint(HedgeLegParams)` path keeps `strikeWAD` semantics (the public `resolveAndMint` computes the strike from `strikeWAD` once and passes it down, UNTOUCHED for Phase-13); `resolveFromMandate` passes `structuralStrikeTick(...)` directly.
- **Anchor: the canonical TEMPLATE constant `CANONICAL_COP_USD = 3900` is SAFER than the live spot here** (see Pitfall 1b). The mint strike is `K_hi = CANONICAL_COP_USD*115/100 = 4485 -> tick 360360`.
- **Fix B (`fractionToSqrtPriceX96(humanRate*1e12, 1)`) is also 0-error** (the SHIPPED `PriceGridsLib.fractionToSqrtPriceX96` already exists; verified 0-error at 3900/4485/4095/4450) but is REJECTED as primary because it (1) silently redefines what `strikeWAD` carries (`humanRate*1e12`, not a WAD rate — the demo's `4.1e18` then means nonsense and the demo BREAKS) and (2) keeps a converter in the funnel, so the emitted tick still derives indirectly. Fix C keeps `strikeWAD` semantics intact for the demo/direct path AND guarantees emitted-tick == minted-tick == asserted-tick. **Keep Fix B as the documented fallback** if touching the sink signature proves undesirable — it is a one-line converter swap (`exchangeRateToSqrtPriceX96(R)` -> `fractionToSqrtPriceX96(R, 1)` with `R = humanRate*1e12`).

**Warning signs / the REAL canary:** the unit + fork round-trip MUST drive the EXECUTOR's actual strike rate (**4485**, not 3900) and assert a TIGHT band. The plan's 3900 canary is a tautology and the plan's fork `BAND = 50_000` is 167x too loose to see the 1320-tick error. With Fix C the band collapses to **exact equality** (`positionId.strike(leg) == structuralStrikeTick(4485, 60) == 360360`), because there is no inversion left to drift — assert equality, not a band. The old `strikeWadForSink` approach REDs this; Fix C GREENs it.

### Pitfall 1b: Near-spot self-provisioning — the corrected strike MINTS, but the OTM offset is LOAD-BEARING (fork-proven; revert boundary mapped)
**What goes wrong (the gate's separate BLOCKER, now RESOLVED):** the corrected K_hi tick (360360) is only ~1660 ticks above the live spot (358700) — the leg now sits NEAR live liquidity, unlike the demo's dead-space -14160. The fear was the short-then-long self-provisioning would revert. **Fork result (block 86_900_000): it MINTS.**
- Live `getCurrentTick() = 358700` (~3778 COP/USD). `structuralStrikeTick(4485) = 360360`; leg width = 20 chunks (demo vol 14400) => half-range `(20*60)/2 = 600` ticks => **K_hi leg = [359760, 360960]**, lower edge **1060 ticks clear of spot**.
- **`test_fixC_shape_mints_Khi` (the Fix-C sink shape, real `HedgeLegParams`, real `_init_world` funding): MINT OK, `numberOfLegs(executor) == 2` (long + self-provisioned short, both caller-owned), and `positionId.strike(0) == 360360` asserted exactly.** K_hi mints under BOTH the canonical (360360) and live-spot (4345->360060) anchors. K_lo(4095->359460) also mints.
- **The revert boundary (mapped on the fork):** the FIRST (short) dispatch reverts `InputListFail()` (selector `0x99e877ce` — a TokenId/position-list input-validation guard, NOT `NotEnoughLiquidityInChunk`/`AccountInsolvent`/`PriceBoundFail`) when the leg's LOWER edge gets within ~140 ticks of spot. Observed: leg-lower `358860` (strike 359460) = OK; leg-lower `358740` (strike 359340) = REVERT. **Safe rule: `strike - (width*tickSpacing)/2 >= spot + ~3*tickSpacing`.**
**Why it matters (the anchor decision):** with `CANONICAL_COP_USD = 3900`, K_lo(4095) leg-lower = 358860 sits at margin **+160 ticks** (right at the safe edge — mints, but thin); K_hi(4485) at **+1060** (comfortable). If the strike were anchored to the LIVE spot 3778 instead, K_lo(3778*1.05~3967) leg-lower = 358560 => margin **-140 ticks => REVERTS**. So (a) **mint the K_hi (15% OTM) leg**, robust to both anchors and width, and (b) **prefer the canonical 3900 constant** (it sits above live spot, pushing strikes further OTM = more margin). The single long-call demo leg is K_hi.
**How to avoid:** the fork test asserts the mint SUCCEEDS (the demo's `test__takeDemoPosition__Succeeds` asserts NOTHING — it "passes" by not reverting). Assert `numberOfLegs(executor) > 0` AND `positionId.strike(leg) == structuralStrikeTick(4485,60)` after the mint. Keep `isLong`/`asset` so the leg pays on COP depreciation (S up) — a single long call struck 15% OTM above spot.
**Warning signs:** `InputListFail()` on the short dispatch => the leg's lower edge crossed into the ~140-tick near-spot zone; widen the OTM offset or shrink the width.

### Pitfall 2: `optionRatio` (the `size` field) silently wraps at `% 128`
**What goes wrong:** `HedgeLegParams.size` maps to `optionRatio`, and `TokenIdLibrary.addOptionRatio` writes `_optionRatio % 128` (TokenId.sol:237). `size = 128 → optionRatio 0` (a malformed/inactive leg) with NO revert.
**Why it happens:** 7-bit slot; the mask is silent.
**How to avoid:** The shipped sink ALREADY guards `require(legParams.size <= 127, "optionRatio overflow")` as its first statement — `resolveFromMandate` must derive a `size ≤ 127` from `targetNotional` (the mandate carries whole-USD notional, not an optionRatio). Map `targetNotional → feasible optionRatio ∈ [1,127]` (clamp), and keep `positionSize` (the uint128 dispatch amount) as a SEPARATE quantity. Do NOT conflate the two sizes (the Phase-13 lesson: `uint128(legParams.size)` targets `positionSize`, a different field).
**Warning signs:** a leg that reads back `optionRatio == 0` or `countLegs() == 0` after `addLeg`.

### Pitfall 3: The dual `size` distinction (`optionRatio` vs `positionSize`)
**What goes wrong:** There are TWO sizes. `legParams.size` → `optionRatio` (the leg's relative ratio, ≤127). `positionSize` (the `_resolveAndMint` 3rd arg) → the `dispatch` `sl[]` amount (uint128, the actual minted size; the short counterparty is `positionSize * 2`). Confusing them mis-sizes the mint or the feasibility gate.
**How to avoid:** Treat `optionRatio` as the structural leg shape and `positionSize` as the feasibility-gated notional. The representativeness feasibility gate sizes `positionSize` against pool liquidity depth; `optionRatio` is the (small) structural ratio.

### Pitfall 4: The deterministic geometry must NOT depend on the live LLM
**What goes wrong:** Wiring the strike/width/size off an `inferToolsChat` result makes the demo flaky (live consensus round-trip) and breaks the "deterministic geometry" lock.
**How to avoid:** Geometry from `IRegimeOracle` `Z_t` + immutable β₁ + pool reads ONLY. `inferToolsChat` (if live at all) fills the event rationale via a separate `_onResult` leg. Note: `inferToolsChat` is NOT in the vendored `ILLMAgent` interface (`src/interfaces/ISomniaAgents.sol` has only `inferString` + `inferNumber` — `inferChat`/`inferToolsChat` were explicitly dropped in Phase 11). So a live path needs interface extension + a keeper round-trip — confirming STRETCH/stub.

### Pitfall 5: The Polygon-fork infra (cached state, default funds, RPC 429)
**What goes wrong:** The fork test depends on `fork-state/polygon-panoptic.json` (cached chain-137 core), `vm.setNonce(address(this), 64)` (to dodge snapshot-address collisions), `DEFAULT_FUND_USD = 10_000e6` / `DEFAULT_FUND_COP = 10_000e18`, and the executor must be BOTH the dispatch caller AND the ERC4626 share owner (`ct.deposit(assets, address(executor))`). Rapid reruns 429 on the Alchemy Polygon RPC.
**How to avoid:** Reuse `_init_world()` verbatim (it funds + deposits collateral with `receiver = harness/executor`). The new fork test extends the `test__takeDemoPosition__Succeeds` lineage: build a `HedgeMandate`, call `resolveFromMandate`, assert a leg minted. Run isolated (`make test-demo`) with short backoff; the cached state + `rpc_storage_caching` chains `[8453,137]` already defend.
**Warning signs:** `AccountInsolvent` (under-funded executor), `NotEnoughLiquidityInChunk` (no seeded counterparty for a naked long — but the sink mints a short-then-long pair so it self-provisions), or `429` (rate limit).

### Pitfall 6: bulloak `when/it` keyword form + co-location
**What goes wrong:** Every prior phase hit this — bare `invariant_*`/`test_*` leaf labels in a `.tree` throw `unexpected token`; bulloak anchors the tree root on the FIRST contract in the file (helper interfaces/probes declared before the test contract break `check`).
**How to avoid:** Write `.tree` files in `when/it` keyword form; co-locate `.tree` + `.t.sol` same-dir, full-stem; declare any helper interface/mock AFTER the root test contract. The `MockRegimeOracle` goes after the test contract (the 08-06/13-02 precedent).

### Pitfall 7: Over-claiming the live `inferToolsChat` / representativeness path
**What goes wrong:** Claiming the live Somnia→Polygon tool-calling round-trip works end-to-end when only the deterministic geometry + a stubbed event are proven.
**How to avoid:** Mark the live `inferToolsChat` narrative as STRETCH / `workflow_dispatch` Manual-Only (the Phase-12/13 deferral discipline). The CI gate is the fork mint + the unit geometry, NOT a live LLM call.

## Code Examples

### The mandate → HedgeLegParams field map (the core of `resolveFromMandate`)
```solidity
// Source: synthesized from HedgeMandate (src/types/HedgeMandate.sol), HedgeLegParams
//         (src/types/HedgeLegParams.sol), PayoffTerms (src/types/PayoffTerms.sol),
//         and the shipped _resolveAndMint sink.
// HedgeMandate{economicTheory, underlyingMarket, targetNotional, chainId, isLong}
//   -> HedgeLegParams{underlyingMarket, strikeWAD, size, economicTheory, chainId, isLong, payoffTerms}
//
// PASS-THROUGH (verbatim — the types were aligned in Phase 12 for this):
//   underlyingMarket, economicTheory, chainId, isLong
// DERIVED by the representativeness model:
//   strikeWAD     <- structural K from the LIVE pool spot S0 (+ the decimal-gap fix, Pitfall 1)
//   payoffTerms.vol <- regime-conditional: a vol that encodes β1(Z_t)*devaluation so volToWidth
//                       yields the regime-conditional WIDTH (the ≥1-param-≠-GBM signal)
//   size          <- feasible optionRatio in [1,127] mapped from targetNotional (Pitfall 2)
//   payoffTerms.{horizonBlocks, tickSpacing, asset, riskPartner} <- structural constants
//                       (tickSpacing 60 from the cornerstone pool; asset 0 = token0 = USDC)
```

### `_resolveAndMint` Fix-C change (the EXACT sink edit — additive on the demo/direct path, BREAKING for the executor's own Phase-13 tests) — the decided strike fix
```solidity
// Source: contracts/src/MacroHedgeExecutor.sol:118-184 (shipped). Fix C splits the strikeWAD->tick
// derivation OUT of the shared internal body so the mandate path can pass a pre-snapped int24 strike
// (decimal-gap-correct, zero inversion) while the demo / direct resolveAndMint path is byte-unchanged.
// PROVEN this session: test_fixC_shape_mints_Khi mints the structural K_hi(4485)=360360 leg on the
// Polygon fork (block 86_900_000), numberOfLegs(caller)==2, positionId.strike(0)==360360 asserted.

// (1) Direct entrypoint — UNCHANGED behavior: compute strike from strikeWAD HERE, then funnel.
function resolveAndMint(HedgeLegParams calldata lp, uint256 legIndex, uint128 size)
    external returns (TokenId)
{
    int24 strike = (TickMath.getTickAtSqrtPrice(
        PriceGridsLib.exchangeRateToSqrtPriceX96(lp.strikeWAD)) / lp.payoffTerms.tickSpacing)
        * lp.payoffTerms.tickSpacing;                                   // Phase-13 line, MOVED up
    return _resolveAndMintAtStrike(lp, legIndex, size, 0, strike);
}

// (2) NEW shared internal body — takes the snapped strike as a PARAM (no strikeWAD, no converter).
function _resolveAndMintAtStrike(
    HedgeLegParams memory lp, uint256 legIndex, uint128 positionSize, uint256 requestId, int24 strike
) internal virtual returns (TokenId positionId) {
    require(lp.size <= 127, "optionRatio overflow");                    // the %128 guard (Pitfall 2)
    require(uint256(lp.chainId) == block.chainid, "No crosschain allowed yet");
    int24 width       = PayoffTermsLib.deriveWidthFromVol(lp.payoffTerms);
    uint256 asset     = PayoffTermsLib.deriveAsset(lp.payoffTerms);
    uint256 riskPart  = PayoffTermsLib.deriveRiskPartner(lp.payoffTerms);
    uint64 pid = PoolIdMappersLib.panopticPoolIdFromUniV4PoolId(lp.underlyingMarket, vegoid, lp.payoffTerms.tickSpacing);
    positionId = TokenIdLibrary.addLeg(TokenId.wrap(0).addPoolId(pid), legIndex, lp.size, asset,
        lp.isLong ? 1 : 0, 0, riskPart, strike, width);
    // ... the IDENTICAL short-then-long two-dispatch block from Phase 13 (verbatim) ...
    emit RepresentativenessAssessed(requestId, REPRESENTATIVENESS_RATIONALE, REPRESENTATIVE_STUB);
    emit PositionMinted(address(this), positionId, positionSize);
}

// (3) The NEW mandate entrypoint — passes a structuralStrikeTick directly (Fix C, zero inversion).
uint256 private constant CANONICAL_COP_USD = 3900;                      // TEMPLATE pin (~live spot 3778)
function resolveFromMandate(HedgeMandate calldata m, uint256 legIndex, uint128 positionSize)
    external returns (TokenId)
{
    // ... read Z_t (staleness->STRESS), compute regime width into PayoffTerms.vol, feasibleOptionRatio ...
    uint256 strikeRate = CANONICAL_COP_USD * 115 / 100;                 // K_hi = S0*1.15 = 4485 (15% OTM)
    int24 strike = RepresentativenessLib.structuralStrikeTick(strikeRate, TICK_SPACING);  // == 360360, exact
    HedgeLegParams memory lp = /* build from m + the regime-derived geometry; strikeWAD UNUSED (set 0) */;
    emit ExecutorDecided(/* requestId, uint8 regimeZt, inflationAdjustmentWad, strikeTick, regimeWidth, parametricHedged, nonErgodicDisclosed, rationale — the 8-param shape */);
    return _resolveAndMintAtStrike(lp, legIndex, positionSize, requestId, strike);
}
```
**Phase-13 test impact (CORRECTED — the split is NOT "purely additive / non-breaking"; the planning-review gate caught two project-wide compile breaks the earlier framing missed):** the change is additive ONLY for the DEMO HARNESS tests — `test__takeDemoPosition__Succeeds` and `test_resolvePositionFromHedgeParams_volAware_wellFormedTokenId` call the test-only `PolygonConvexPositionResolverHarness`, NOT the executor, so they are genuinely UNAFFECTED (both still pass, 2/2). BUT the rename + the ctor 4→9 extension are COMPILE-BREAKING for the executor's OWN Phase-13 test files and REQUIRE migrating them in the same commit:
- `test/instrument/MacroHedgeExecutor.onResult.t.sol` — the `MacroHedgeExecutorDecodeProbe` (a) OVERRIDES the base sink `function _resolveAndMint(HedgeLegParams, uint256, uint128, uint256) internal override` (~:168 — the decode-isolation mechanism) and (b) FORWARDS the 4-arg base ctor (~:154-157). After the rename the `override` references a nonexistent virtual (`override specifies nothing`); after the ctor extension the forward is `Wrong argument count` — either FAILS `forge build` PROJECT-WIDE. The override MUST be renamed to `_resolveAndMintAtStrike(HedgeLegParams, uint256, uint128, uint256, int24) internal override` (so `_onResult`'s rerouted call still lands on it — decode-isolation preserved) and the probe ctor extended to forward the 9-arg base ctor.
- `test/fork/MacroHedgeExecutor.fork.t.sol` — THREE `new MacroHedgeExecutor(address(platform), WCOP_USDC_PANOPTIC_POOL, riskManagement, _vegoid())` 4-arg sites (`_init_world` ~:135, the BTT-leaf under-funded twin ~:223, `test_margin` ~:269) all become `Wrong argument count` — MUST be migrated to the 9-arg ctor (template β₁/dev/baseVol + a `MockRegimeOracle`).
The executor's direct `resolveAndMint(HedgeLegParams)` keeps identical RUNTIME behavior (strike still from `strikeWAD`); the break is purely at the COMPILE surface (the renamed virtual + the wider ctor). The migration is owned by Plan-02 (atomic with the ctor/sink change); Plan-03's wave gate RE-RUNS the onResult 4/4 + the fork EXEC suite to confirm no regression.

### `IRegimeOracle` shape (mirror the MacroOracle staleness precedent)
```solidity
// Source: modeled on src/MacroOracle.sol (MacroDatum{scaledValue, deliveredAt}; latest[key];
//         deliveredAt == 0 => unset) — the proven staleness pattern.
interface IRegimeOracle {
    enum Regime { Unknown, Tranquil, Stress }
    /// @return regime  the Z_t classification (Stress on no data, per §3.6 fail-safe)
    /// @return observedAt  block.timestamp of the last push (0 => never set)
    function latestRegime() external view returns (Regime regime, uint64 observedAt);
}
// Consumer-side fail-safe (the wage-earner §3.6 guardrail):
//   (Regime z, uint64 ts) = oracle.latestRegime();
//   bool stale = ts == 0 || block.timestamp - ts > MAX_STALENESS;
//   Regime effective = (stale || z == Regime.Unknown) ? Regime.Stress : z;  // default-to-STRESS
```

### The β₁(REGIME) × devaluation core + the GBM-divergence demonstrator (pure library)
```solidity
// Source: the wage-earner example M = β1·devaluation (§2.1, §2.3) + the step-03 binding
//         constraint (≥1 param must differ from a stationary-vol GBM baseline).
library RepresentativenessLib {
    // β1 immutables passed in (illustrative stubs: ~0.10 tranquil / ~0.35 stress — TEMPLATE).
    // inflationAdjustment (the cap M, in WAD) = β1(regime) * targetDevaluationWad
    function inflationAdjustment(uint256 beta1Wad, uint256 targetDevaluationWad)
        internal pure returns (uint256 capWad)
    { return (beta1Wad * targetDevaluationWad) / 1e18; }

    // The regime-conditional vol that feeds VolToWidthLib. STRESS β1 => larger cap => wider chunk.
    // A stationary-GBM baseline uses a SINGLE σ regardless of regime; this differs when Z=STRESS.
    // The unit test asserts widthStress != widthGbmBaseline (the binding-constraint demonstration).
}
```

### The `ExecutorDecided` / `RepresentativenessAssessed` event (REPR-01 UI surface)
```solidity
// Source: the executor ALREADY emits this (MacroHedgeExecutor.sol:58) — extend it or add a sibling.
// event RepresentativenessAssessed(uint256 indexed requestId, string rationale, bool representative);
// Recommended richer sibling for the honesty split + TEMPLATE caveat + the measure:
// AUTHORITATIVE 8-param shape (reconciled with the PLAN + the fork decode topic-hash; the earlier
// 6-param illustrative draft — int24 regimeZt, no strikeTick/regimeWidth — was STALE):
event ExecutorDecided(
    uint256 indexed requestId,
    uint8   regimeZt,                // IRegimeOracle.Regime cast to uint8 (effective, post-fail-safe)
    uint256 inflationAdjustmentWad,  // β1(Z)*devaluation — the "inflation adjustment"
    int24   strikeTick,              // the decimal-gap-correct structural strike tick (Fix C — == the minted tick)
    int24   regimeWidth,             // the regime-conditional width (the ≥1-param-≠-GBM signal)
    bool    parametricHedged,        // the parametric share IS hedged
    bool    nonErgodicDisclosed,     // the honesty flag — the tail is disclosed, NOT covered
    string  rationale                // "TEMPLATE: placeholder β1/Z_t; not deployment-ready" + (stubbed) narrative
);
// The fork decode matches keccak256("ExecutorDecided(uint256,uint8,uint256,int24,int24,bool,bool,string)").
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|---|---|---|---|
| Demo harness `PolygonConvexPositionResolverHarness` (test-only resolver) | shipped `MacroHedgeExecutor._resolveAndMint` (contract-owned) | Phase 13 (2026-06-06) | Phase 14 wires onto the CONTRACT, not the test harness; the harness stays as the fork-test driver lineage |
| Agent 1 emits a finalized `HedgeLegParams` | Agent 1 emits a `HedgeMandate` (intent only); Agent 2 derives geometry | Phase 12 (2026-06-06) | the geometry derivation is THIS phase's reason to exist |
| `getAccumulatedFeesAndPositionsData` | `getFullPositionsData` (post-audit panoptic main @ d20b0aed) | substrate move (memory: panoptic-substrate-d20b0aed) | if the feasibility gate reads position data, use the CURRENT getter; the demo's `getAccumulatedFeesAndPositionsData` references may be stale on the forge-installed core |
| `vm.expectRevert(bytes4)` for custom errors | `vm.expectPartialRevert(selector)` | forge 1.5.1 (Phase 13) | any negative-gate test for `AccountInsolvent`/`optionRatio overflow` with args must use partial-revert |

**Deprecated/outdated:**
- The demo's hardcoded `strikeWAD = 4.1e18` "4.100" comment — economically meaningless in the pool tick space (Pitfall 1; lands at tick -14160, 373k off live spot 358700); do NOT carry it forward as a real strike.
- **The planned `strikeWadForSink(humanRate)` inversion fed through `exchangeRateToSqrtPriceX96` — DELETED. Mathematically broken (mis-snaps by up to 1380 ticks; `R` un-representable below 1 wei for this pool). Replaced by `structuralStrikeTick` + the Fix-C sink overload (Pitfall 1, Open Q1).**
- `IMacroThesis` as anything other than a thin marker — the CONTEXT locks it stays thin; the strategy lives brain-side.

## Open Questions

1. **The decimal-gap strike fix — RESOLVED (re-research + fork spike, 2026-06-06). Decision: Fix C.**
   - **REJECTED:** the planned `strikeWadForSink(humanRate) = 1e18*Q96^2/targetSqrtP^2` fed through the SHIPPED `exchangeRateToSqrtPriceX96`. Reproduced with the real libraries: `R` collapses to ~200-256 wei and the reproduced tick mis-snaps by **1320 ticks (22 tickSpacings) at 4485** (the actual K_hi strike), 0->1380 ticks non-monotone across 3000-5000. Structurally impossible to fix in the inversion: the wCOP-currency1 ratio `humanRate*1e12 ~ 3.9e21` needs `R < 1`, un-representable in integer wei.
   - **DECIDED: Fix C** — `RepresentativenessLib.structuralStrikeTick(humanRate, ts) = snap(getTickAtSqrtPrice(sqrt(humanRate*1e12*Q192)))` computes the snapped tick ONCE (0-error, EXACT fixed point), and the executor hands that `int24` to a Fix-C sink overload `_resolveAndMintAtStrike(..., int24 strike)`. The `strikeWadForSink` helper is DELETED from the plan. `PriceGridsLib.exchangeRateToSqrtPriceX96` is NOT used on the mandate path; the demo/direct `resolveAndMint(HedgeLegParams)` path keeps it (the public `resolveAndMint` computes strike from `strikeWAD` once and funnels into the same overload — Phase-13 strike derivation untouched).
   - **The `_resolveAndMint` change (exact):** see §"`_resolveAndMint` Fix-C change" in Code Examples. It is additive for the demo/direct RUNTIME path (the strikeWAD->tick line moves up one level into the two PUBLIC entrypoints; the shared internal body takes `int24 strike` as a param) but COMPILE-BREAKING for the executor's own Phase-13 test files — the rename + the ctor 4→9 extension force migrating the onResult DecodeProbe override + the four pre-existing ctor sites (onResult probe ctor + the three fork EXEC ctor sites) in the same commit (see §"`_resolveAndMint` Fix-C change" — Phase-13 test impact). Only the DEMO HARNESS tests are unaffected.
   - **Fallback (documented, not chosen):** Fix B — swap the sink's converter to `fractionToSqrtPriceX96(humanRate*1e12, 1)` (0-error, the function already ships). Rejected as primary because it redefines `strikeWAD` semantics and breaks the demo's `4.1e18`.
   - Pinned by: a unit round-trip at **4485** asserting `structuralStrikeTick(4485,60) == 360360` (exact, REDs on `strikeWadForSink`); a fork test asserting the minted `positionId.strike(leg) == 360360` AND `numberOfLegs(executor) > 0`.

2. **β₁(REGIME) + Z_t numeric stubs — which exact values.**
   - What we know: illustrative β₁≈0.10 tranquil / 0.35 stress; Z_t from EMBI>350bp / VIX>30 / 1m-realised-vol>18% / TRM-intervention; devaluation target ~15% (the example's `K_hi = S₀·1.15`).
   - What's unclear: the precise WAD encodings + the demo's chosen `targetDevaluation`.
   - Recommendation: pick the example's vintage as labeled stubs (TEMPLATE banner), pass β₁ as constructor immutables, document them as `abrigo-analytics`-pending. The TEST asserts the STRUCTURE (stress width ≠ tranquil width ≠ GBM width), not the magnitudes.

3. **Does the feasibility gate read live pool data via `getTickNets`, or is depth stubbed for the demo?**
   - What we know: `PanopticQuery.getTickNets(pool, startTick, nTicks)` returns rescaled cumulative liquidity around a tick (on-chain, fork-readable).
   - What's unclear: whether the fork-cached pool has enough seeded liquidity at the (corrected) structural strike for a non-trivial depth read, or whether the gate is advisory-only (the atomic `AccountInsolvent` being the real gate per EXEC-02).
   - Recommendation: make the feasibility gate ADVISORY (emit the depth signal in `ExecutorDecided`); keep the atomic `AccountInsolvent` as the binding gate. This matches the locked EXEC-02 honesty.

4. **Is `RepresentativenessLib` a separate library or inline?**
   - Recommendation: separate pure library (fork-free unit + mutation testing of the GBM-divergence + β₁-asymmetry), per the 13-03 invariant-discipline precedent.

5. **The geometry-vs-LLM independence check must be ROBUST (carry-over MAJOR).**
   - What we know: the deterministic geometry MUST NOT read any `inferToolsChat`/LLM result (CONTEXT lock). The grep-style proof that the strike/width/size derivation never touches the LLM path must not early-terminate on a `sed`/`grep -m1` false-positive.
   - Recommendation: prove independence by a TEST, not only a grep — a unit leaf that derives the full geometry with the LLM narrative leg STUBBED/absent and asserts the `HedgeLegParams` is byte-identical to the geometry derived with a populated narrative (i.e. the narrative is dropped from the geometry inputs). If a static check is also used, scan the WHOLE `resolveFromMandate` body (`grep -c`, not `grep -m1`/`sed`-with-early-exit) and assert ZERO references to `inferToolsChat`/`responses[`/the LLM agent id inside the geometry-deriving lines.

## Validation Architecture

> nyquist_validation is enabled (config.json `workflow.nyquist_validation: true`). This section is the Nyquist contract source for VALIDATION.md.

### Test Framework
| Property | Value |
|---|---|
| Framework | Foundry `forge` 1.5.1-stable + `bulloak` 0.9.2 (BTT `.tree` → `.t.sol`); evm-TDD Iron Law (`.tree` + failing test committed BEFORE impl) |
| Config file | `contracts/foundry.toml` (solc 0.8.24, cancun, viaIR=false, optimizer 200, `rpc_storage_caching` chains `[8453,137]`, `[invariant]` runs=16/depth=16/fail_on_revert=false) |
| Quick run command | `cd contracts && forge test --match-path "test/instrument/Representativeness.t.sol" -vv` (fork-free unit — fast, no RPC) |
| Full suite command | `cd contracts && make test-demo` (the Polygon-fork mint) + `forge test --no-match-path 'test/**/*{fork,invariants}*'` (the fork-free regression set) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|---|---|---|---|---|
| REPR-02 | `resolveFromMandate(HedgeMandate)` mints the near-spot K_hi(4485) leg through the SHIPPED executor on the Polygon fork (FORK-PROVEN this session: MINT OK at block 86_900_000, `numberOfLegs==2`). Assert the mint SUCCEEDS (NOT just "doesn't revert" — the demo's flaw): `numberOfLegs(executor) > 0` AND **`positionId.strike(leg) == 360360`** (the EXACT structural K_hi tick; live spot is 358700, leg-lower 359760 is 1060 ticks clear of spot). This is the near-spot self-provisioning proof. | fork (integration) | `cd contracts && forge test --match-path "test/fork/DemoMacroHedgeExecutor.fork.t.sol" --match-test test_resolveFromMandate_mintsThroughExecutor -vv` | ❌ Wave 0 (extend the existing fork file) |
| REPR-02 | Deterministic geometry: given (mandate + Z_t + β₁) → EXPECTED `HedgeLegParams` (regimeVol/feasibleOptionRatio/asset/isLong field-by-field). NO `strikeWadForSink` (DELETED — broken). | unit | `cd contracts && forge test --match-path "test/instrument/Representativeness.t.sol" --match-test test_resolveFromMandate_derivesExpectedGeometry -x` | ❌ Wave 0 |
| REPR-02 | **The REAL strike round-trip (Fix-C canary, at the EXECUTOR's strike 4485, EXACT — not 3900, not a band):** `RepresentativenessLib.structuralStrikeTick(4485, 60) == 360360` (the decimal-gap-correct K_hi tick). This REDs on the old `strikeWadForSink` (which gives 361680, off by 1320) and GREENs on Fix C (exact). ALSO assert `structuralStrikeTick(3900,60)==358980` so a regression in the gap factor is caught. | unit | `cd contracts && forge test --match-path "test/instrument/Representativeness.t.sol" --match-test test_structuralStrike_exactAt4485 -x` | ❌ Wave 0 |
| REPR-01 | The ≥1-param-≠-GBM binding constraint — robust at BOTH the continuous AND the quantized layer: `assertGt(regimeVol(STRESS), baseVol)` (the CONTINUOUS vol strictly exceeds the GBM baseline — this is the load-bearing assertion, since `volToWidth` ceil-snaps and a one-ceil-unit width margin can vanish under tuning) AND `assertTrue(widthStress != widthGbm)` (the quantized width differs). Note `TRANQUIL==GBM` by construction, so assert STRESS-vs-baseline, never TRANQUIL-vs-baseline. | unit | `cd contracts && forge test --match-path "test/instrument/Representativeness.t.sol" --match-test "test_regimeWidth_differsFromGbmBaseline\|test_regimeVol_stressExceedsBaseline" -x` | ❌ Wave 0 |
| REPR-01 | β₁ asymmetry: `β₁(STRESS) > β₁(TRANQUIL)` ⇒ the STRESS inflationAdjustment/width strictly exceeds the TRANQUIL one (`assertGt`) | unit | `cd contracts && forge test --match-path "test/instrument/Representativeness.t.sol" --match-test test_beta1_stressExceedsTranquil -x` | ❌ Wave 0 |
| REPR-01 | Oracle staleness → default-to-STRESS: a stale/unset `IRegimeOracle` (`observedAt == 0` or beyond `MAX_STALENESS`) ⇒ the derivation uses the STRESS multiplier | unit | `cd contracts && forge test --match-path "test/instrument/Representativeness.t.sol" --match-test test_staleOracle_defaultsToStress -x` | ❌ Wave 0 (needs MockRegimeOracle) |
| REPR-01 | The honesty flag + TEMPLATE caveat surface on `ExecutorDecided` (`nonErgodicDisclosed == true`; rationale contains the TEMPLATE marker); `vm.expectEmit` the event from the mint path | unit/fork | `cd contracts && forge test --match-path "test/instrument/Representativeness.t.sol" --match-test test_executorDecided_surfacesHonestyFlag -x` | ❌ Wave 0 |
| REPR-02 | `feasibleOptionRatio(targetNotional)` is a DEFINED monotone map (NOT "clamp to [1,127]"): `clamp(targetNotional / NOTIONAL_PER_RATIO, 1, 127)` with a concrete `NOTIONAL_PER_RATIO` constant — assert it is monotone non-decreasing in notional, hits 1 at/below the floor and 127 at/above the cap, and that `targetNotional` ACTUALLY changes the ratio across the mid-band (a regression where notional is ignored must RED). | unit | `cd contracts && forge test --match-path "test/instrument/Representativeness.t.sol" --match-test test_feasibleOptionRatio_monotoneFromNotional -x` | ❌ Wave 0 |
| REPR-02 | The `optionRatio ≤ 127` guard: because `feasibleOptionRatio` always clamps to ≤127 the mandate path CANNOT reach 128, so the guard is proven on the DIRECT path — `resolveAndMint(HedgeLegParams{size:128})` reverts `optionRatio overflow` (the sink's shared first guard) | fork | `forge test --match-path "test/fork/DemoMacroHedgeExecutor.fork.t.sol" --match-test test_resolveAndMint_sizeOver127_reverts -vv` (`vm.expectRevert`, string error) | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `forge test --match-path "test/instrument/Representativeness.t.sol"` (the fork-free unit set — sub-second, no RPC; the Nyquist quick signal).
- **Per wave merge:** `make test-demo` (the fork mint) + `forge test --no-match-path 'test/**/*{fork,invariants}*'` (the full fork-free regression — confirm PolygonPools 3/3, OperationalCostManagement 10/10, MacroHedgeStrategist 19/19, MacroHedgeExecutor onResult 4/4 un-regressed).
- **Phase gate:** the unit suite + the fork mint both green; every new `.tree` `bulloak check` exit 0; the GBM-divergence + staleness-defaults-to-stress + honesty-flag tests green; THEN `/gsd:verify-work`.

### Wave 0 Gaps
- [ ] `test/instrument/Representativeness.tree` + `Representativeness.t.sol` — covers REPR-01 (GBM-divergence, β₁ asymmetry, staleness→STRESS, honesty flag) + REPR-02 (deterministic geometry, size guard). Write the `.tree` FIRST (Iron Law), `when/it` keyword form.
- [ ] `test/mocks/MockRegimeOracle.sol` — a settable `IRegimeOracle` test double mirroring `MockMacroOracle`; declare AFTER the root test contract for bulloak anchoring.
- [ ] `src/interfaces/IRegimeOracle.sol` — the `Z_t + observedAt` interface (mirror the `MacroOracle` staleness precedent).
- [ ] `src/libraries/Representativeness.sol` — the pure β₁(REGIME)×devaluation core + GBM comparator + **`structuralStrikeTick(humanRate, ts)` (the Fix-C decimal-gap-correct snapped tick — NO `strikeWadForSink`)** + a DEFINED `feasibleOptionRatio(notional)=clamp(notional/NOTIONAL_PER_RATIO,1,127)`.
- [ ] `MacroHedgeExecutor.sol` — add `resolveFromMandate(...)` external + the `ExecutorDecided` event + **the Fix-C sink split: rename the shared body to `_resolveAndMintAtStrike(..., int24 strike)`, move the `strikeWAD->tick` line up into the public `resolveAndMint` (Phase-13 behavior preserved), and have `resolveFromMandate` pass `structuralStrikeTick(CANONICAL_COP_USD*115/100, ts)` directly** (Code Examples §"`_resolveAndMint` Fix-C change").
- [ ] Extend `test/fork/DemoMacroHedgeExecutor.fork.t.sol` with `test_resolveFromMandate_mintsThroughExecutor` (assert `strike==360360` + `numberOfLegs>0`) + `test_resolveAndMint_sizeOver127_reverts` (reuse `_init_world`).
- [ ] Framework install: none — `forge` + `bulloak` already present.

## Sources

### Primary (HIGH confidence — read verbatim this session)
- `contracts/src/MacroHedgeExecutor.sol` — the shipped `_resolveAndMint` sink + the two entrypoints + `RepresentativenessAssessed`/`PositionMinted` events (the additive target).
- `contracts/test/fork/DemoMacroHedgeExecutor.fork.t.sol` — the `PolygonConvexPositionResolverHarness` pipeline (vol→width, strike, addLeg, short-then-long dispatch), `_init_world` funding, the cached-state/`setNonce(64)` infra, `test__takeDemoPosition__Succeeds` lineage.
- `contracts/src/types/{HedgeMandate,HedgeLegParams,PayoffTerms,PositionInfo}.sol` — the input/output type alignment (the pass-through fields).
- `contracts/src/libraries/{VolToWidth,PriceGrids,PayoffTerms,PolygonPools,PoolIdMappers}.sol` — the geometry derivation primitives.
- `contracts/src/interfaces/{IMacroThesis,ISomniaAgents}.sol` — the thin registry + `MacroThesisRegistry`; the vendored `ILLMAgent` (only `inferString`/`inferNumber` — `inferToolsChat` absent).
- `contracts/src/{SomniaAgentConsumer,RiskManagement,MacroOracle}.sol` + `src/instrument/MacroHedgeStrategist.sol` — the async-consumer base, the post-mint margin read, the `MacroOracle` staleness precedent, the two-leg `_onResult` pattern.
- `lib/panoptic-v2-core/contracts/PanopticPool.sol` (getOracleTicks/getTWAP/getCurrentTick/numberOfLegs L2122-2186) + `types/TokenId.sol` (addOptionRatio `%128` L237, addStrike/addWidth, addLeg L343); `lib/panoptic-helper/src/PanopticQuery.sol` (checkCollateral L48/243, getTickNets/getTickNetsV4 L1200-1293).
- `/home/jmsbpp/learning/post-keynesian/applications/examples/wage-earner-fx-hedge-colombia.md` — THE Scenario-1 worked example (TEMPLATE banner; `K_lo/K_hi/M`; `M = β₁·devaluation`; two-state mixture; regime fee off Z_t; §3.6 default-to-stress; the honesty statement §2.3).
- `/home/jmsbpp/learning/post-keynesian/applications/_workflow/{02-payoff-design,03-cfmm-derivation,04-econometric-validation}.md` — the payoff→CFMM→validation pipeline; the step-03 binding constraint (≥1 param ≠ GBM); the Davidson honesty filter.
- `/home/jmsbpp/learning/post-keynesian/principles/finance/davidson-uncertainty-vs-risk.md` + `vs-neoclassical/black-scholes-vs-pke-finance.md` — why representativeness ≠ stationary correlation (non-ergodicity); the convex-analytic/pathwise ports vs measure-theoretic doesn't; Panoptic ticks = the strike-grid constructor.
- `.planning/phases/14-representativeness-derivation/14-CONTEXT.md` + `.planning/REQUIREMENTS.md` (REPR-01/02) + `.planning/STATE.md` (Phase 11/12/13 decisions).
- Tooling verified live: `forge --version` 1.5.1-stable (b0a9dd9); `bulloak --version` 0.9.2; `contracts/foundry.toml`; `contracts/Makefile` (`make test-demo`).

### Secondary (MEDIUM confidence — verified)
- **Strike-derivation re-research (this session, REAL on-chain `PriceGridsLib`+`TickMath`+`FixedPointMathLib` via a throwaway forge harness):** `strikeWadForSink(4485)` reproduces tick 361680 vs intended 360360 (error 1320 = 22 tickSpacings); sweep 3000-5000 error 0->1380 non-monotone; `R` collapses to 200-333 wei. Fix B (`fractionToSqrtPriceX96(hr*1e12,1)`) and Fix C (`structuralStrikeTick`) both 0-error. (Throwaway tests removed post-measurement.)
- **Near-spot mint FORK SPIKE (this session, live Polygon fork @ block 86_900_000):** live `getCurrentTick()=358700` (~3778 COP/USD); the Fix-C K_hi(4485)=360360 leg MINTS (`numberOfLegs==2`, strike asserted exact); K_lo(4095)=359460 mints; revert boundary is `InputListFail()` (0x99e877ce) when leg-lower < ~spot+140 ticks. Canonical-3900 anchor safer than live-spot anchor for K_lo. (Throwaway fork tests removed post-measurement.)

### Tertiary (LOW confidence — flagged)
- bulloak currency/pre-1.0 status (WebSearch) — consistent with the in-repo 0.9.2 pin; no 2026 breaking release found. Pin to `=0.9.2`.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every primitive read verbatim from in-repo source; no new deps; tooling versions verified live.
- Architecture (additive front-end + deterministic/narrative split + β₁-immutable/Z_t-oracle): HIGH — directly follows the locked CONTEXT + the shipped Phase-13 shape + the Phase-11/12 consumer pattern.
- The strike-derivation fix (Pitfall 1 + 1b): **HIGH (re-researched + fork-proven this session)** — the `strikeWadForSink` inversion is FALSIFIED to the wei (1320-tick error at the real strike, structurally un-fixable); the decision is Fix C (`structuralStrikeTick` → a sink overload taking a pre-snapped `int24`, 0-error EXACT); the near-spot K_hi(4485)=360360 leg is FORK-PROVEN to mint (`numberOfLegs==2`, strike asserted exact, leg-lower 1060 ticks clear of live spot 358700); the `InputListFail()` near-spot revert boundary is mapped and the canonical-3900 anchor keeps the leg clear of it. The only residual judgement is the β₁/Z_t magnitudes (TEMPLATE stubs, Open Q2) — the geometry MACHINERY is now unambiguous.
- PKE grounding (representativeness = regime-conditional β₁ × devaluation, NOT correlation; the honesty split; ≥1-param-≠-GBM): HIGH — read verbatim from the user's framework; the math the on-chain model approximates is unambiguous.
- Pitfalls: HIGH — the `%128` mask, the dual-size distinction, the fork infra, the bulloak form, the `inferToolsChat` absence are all evidenced in source/STATE.

**Research date:** 2026-06-06
**Valid until:** 2026-07-06 for the in-repo stack (stable, pinned via foundry.lock); 2026-06-13 for the live-Somnia `inferToolsChat`/testnet posture (volatile, re-confirm `LLM_AGENT_ID`/platform per CLAUDE.md stop-gap caveat before any live run).
