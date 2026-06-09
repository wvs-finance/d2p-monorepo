// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {PoolId} from "v4-core/types/PoolId.sol";
import {BalanceDelta} from "v4-core/types/BalanceDelta.sol";
import {TickMath} from "v4-core/libraries/TickMath.sol";

import {TokenId, TokenIdLibrary} from "@types/TokenId.sol";
import {PanopticPoolV2} from "@contracts/PanopticPool.sol";

import {Response, ResponseStatus} from "./interfaces/ISomniaAgents.sol";
import {SomniaAgentConsumer} from "./SomniaAgentConsumer.sol";
import {HedgeLegParams} from "./types/HedgeLegParams.sol";
import {PositionInfo} from "./types/PositionInfo.sol";
import {RiskManagement} from "./RiskManagement.sol";
import {PayoffTermsLib} from "./libraries/PayoffTerms.sol";
import {PriceGridsLib} from "./libraries/PriceGrids.sol";
import {PoolIdMappersLib} from "./libraries/PoolIdMappers.sol";
import {RepresentativenessLib} from "./libraries/Representativeness.sol";
import {IRegimeOracle} from "./interfaces/IRegimeOracle.sol";
import {ISurpriseOracle} from "./interfaces/ISurpriseOracle.sol";
import {HedgeMandate} from "./types/HedgeMandate.sol";
import {PayoffTerms} from "./types/PayoffTerms.sol";

/// @title MacroHedgeExecutor
/// @notice Agent 2's deployable execution core (EXEC-01 + EXEC-02). Promotes the proven
///         `PolygonConvexPositionResolverHarness` resolver (DemoMacroHedgeExecutor.fork.t.sol:64-120)
///         into a `SomniaAgentConsumer`: the EXECUTOR is the `dispatch` caller AND owns the
///         CollateralTracker shares (collateral deposited with `receiver = address(this)`), so
///         `s_positionBalance[address(this)]` holds the minted position.
///
/// @dev THREE entrypoints, ONE internal mint sink (`_resolveAndMintAtStrike(..., int24 strike)` — the
///      Fix-C split that takes a PRE-SNAPPED strike tick so the mandate path can hand the sink a
///      decimal-gap-correct structural tick with ZERO inversion):
///      - `resolveAndMint(...)` — the direct entrypoint the fork test exercises (MVP); computes the
///        strike from `strikeWAD` (Phase-13 byte-unchanged) and passes `requestId = 0` (the canonical
///        sentinel that lands in `RepresentativenessAssessed`).
///      - `resolveFromMandate(...)` — the ADDITIVE Agent-2 front-end (Phase 14, REPR-01/02): turns a
///        `HedgeMandate` into a `HedgeLegParams` via the regime-conditional representativeness model
///        and passes `RepresentativenessLib.structuralStrikeTick(...)` (== the minted tick) directly.
///      - `_onResult(...)` — the LIVE Somnia callback edge: decodes `responses[0].result` into a
///        `HedgeLegParams`, computes the strike from `strikeWAD`, and routes to the SAME sink with the
///        real `requestId`. This edge is COMPILED but UNEXECUTED — the decode is unit-proven (a probe
///        records the decoded params and skips `dispatch`) and the mint is fork-proven (direct
///        `resolveAndMint`); joining them on live Somnia is the Phase-14 STRETCH.
///
/// @dev EXEC-02 is HONEST: there is NO pre-mint solvency gate (quoting an unminted position reverts
///      `PositionNotOwned`, PanopticPool.sol:559). The real gate is the protocol-native atomic
///      `AccountInsolvent` inside `dispatch` (PanopticPool.sol:1142) that fires AFTER `_mintOptions`
///      writes state and unwinds the whole tx. The POST-mint `quoteCollateralRequirements` read is
///      informational (the margin BalanceDelta surplus/deficit).
contract MacroHedgeExecutor is SomniaAgentConsumer {
    using TokenIdLibrary for TokenId;

    /// @notice Somnia testnet LLM-Inference agent id (the representativeness inference, STRETCH).
    uint256 public constant LLM_AGENT_ID = 12847293847561029384;

    /// @notice The cornerstone wCOP/USDC Panoptic V2 pool — the dispatch target + position store.
    PanopticPoolV2 public immutable pool;
    /// @notice Post-mint margin read (EXEC-02 informational); never a pre-mint gate.
    RiskManagement public immutable riskManager;
    /// @notice vegoid read once from the RiskEngine at deploy (the harness reads `re.vegoid()`).
    uint8 public immutable vegoid;

    /// @notice The pre-computed econometric β₁(REGIME) pair (WAD). β₁ is an `abrigo-analytics`
    ///         OUTPUT, not a live feed ⇒ immutable (the Phase-13 `vegoid` precedent). Asymmetric:
    ///         β₁(STRESS) > β₁(TRANQUIL) — the load-bearing PKE distinctive (TEMPLATE vintage).
    uint256 public immutable beta1TranquilWad; // ~0.10e18 (TEMPLATE)
    uint256 public immutable beta1StressWad; // ~0.35e18 (TEMPLATE)
    /// @notice The target devaluation (WAD) the passthrough is applied to (~0.15e18 TEMPLATE = 15% OTM).
    uint256 public immutable targetDevaluationWad;
    /// @notice The stationary-baseline vol, TICK-SPACE (the demo's PayoffTerms.vol scale 14_400, NOT a
    ///         WAD). Feeds RepresentativenessLib.regimeVol/regimeWidth as the GBM baseline (W5).
    uint256 public immutable baseVol;
    /// @notice The Z_t regime source (read live with the staleness→STRESS fail-safe — Pattern 3).
    IRegimeOracle public immutable regimeOracle;
    /// @notice The CPI-surprise source for the SHILLER branch (Phase 16, SHILLER-01). Read ONLY in
    ///         the (future Wave-2) SHILLER arm with the staleness→s=0 minimal-stance fail-safe; the
    ///         PKE path never touches it.
    ISurpriseOracle public immutable surpriseOracle;

    /// @dev The canonical TEMPLATE COP/USD pin (~live spot 3778). K_hi = *115/100 = 4485 (15% OTM).
    ///      Safer than the live spot for the K_hi strike (it sits above spot, pushing strikes more OTM —
    ///      RESEARCH Pitfall 1b: keeps the leg-lower ~1060 ticks clear of spot so the short dispatch
    ///      does not revert InputListFail()).
    uint256 private constant CANONICAL_COP_USD = 3900;
    uint32 private constant HORIZON_BLOCKS = 100;
    int24 private constant TICK_SPACING = 60;
    /// @dev The TEMPLATE caveat the ExecutorDecided rationale carries (placeholder, not deployment-ready).
    string private constant TEMPLATE_RATIONALE =
        "TEMPLATE: placeholder beta1/Z_t (post-Keynesian regime-conditional passthrough); not deployment-ready. Parametric share hedged; non-ergodic tail disclosed, NOT covered.";
    /// @dev The SHILLER-arm TEMPLATE caveat (Phase 16, SHILLER-01): the CPI-surprise->FX linkage is an
    ///      UNVALIDATED empirical assumption, NOT a proven transfer function. Carries "Shiller" +
    ///      "UNVALIDATED" (the per-school honesty assertion on ExecutorDecided).
    string private constant SHILLER_RATIONALE =
        "TEMPLATE: Shiller surprise-driven convex (s=(actual-consensus)/sigma); consensus/sigma are placeholders; the CPI-surprise->FX-move linkage is an UNVALIDATED empirical assumption, NOT a proven transfer function. Single-leg approximation of the Carr-Madan digital strip; non-ergodic tail disclosed, NOT covered.";

    /// @notice The richer representativeness decision surfaced for the UI (REPR-01). Carries the
    ///         effective regime, the inflation adjustment (β₁(Z)·devaluation), the EXACT decimal-gap
    ///         structural strike tick (Fix C — == the minted tick), the regime-conditional width (the
    ///         ≥1-param-≠-GBM signal), the parametric-hedged + non-ergodic-disclosed honesty flags, and
    ///         the TEMPLATE rationale. The fork decode matches
    ///         keccak256("ExecutorDecided(uint256,uint8,uint256,int24,int24,bool,bool,string)").
    event ExecutorDecided(
        uint256 indexed requestId,
        uint8 regimeZt,
        uint256 inflationAdjustmentWad,
        int24 strikeTick,
        int24 regimeWidth,
        bool parametricHedged,
        bool nonErgodicDisclosed,
        string rationale
    );

    /// @notice The representativeness decision surfaced for the UI. In the MVP the SOURCE is a
    ///         deterministic stub (the live `llm-inference` round-trip is STRETCH); the EVENT is the
    ///         stable UI contract across BOTH entrypoints. On the direct `resolveAndMint` path
    ///         `requestId == 0` (the sentinel); the live `_onResult` path carries the real requestId.
    event RepresentativenessAssessed(uint256 indexed requestId, string rationale, bool representative);
    /// @notice Fired on a successful mint — the owner is the executor itself.
    event PositionMinted(address indexed owner, TokenId indexed positionId, uint128 positionSize);

    /// @dev MVP representativeness stub (the live inference is the Phase-14 STRETCH).
    string private constant REPRESENTATIVENESS_RATIONALE = "MVP: deterministic representativeness stub";
    bool private constant REPRESENTATIVE_STUB = true;

    constructor(
        address platform,
        PanopticPoolV2 _pool,
        RiskManagement _riskManager,
        uint8 _vegoid,
        uint256 _beta1Tranquil,
        uint256 _beta1Stress,
        uint256 _targetDev,
        uint256 _baseVol,
        IRegimeOracle _regimeOracle,
        ISurpriseOracle _surpriseOracle
    ) payable SomniaAgentConsumer(platform) {
        pool = _pool;
        riskManager = _riskManager;
        vegoid = _vegoid;
        beta1TranquilWad = _beta1Tranquil;
        beta1StressWad = _beta1Stress;
        targetDevaluationWad = _targetDev;
        baseVol = _baseVol;
        regimeOracle = _regimeOracle;
        surpriseOracle = _surpriseOracle;
    }

    /// @notice EXEC-01 deployable entrypoint — the fork test calls THIS (like the demo calls the
    ///         harness). Mints the demo position through the contract; the executor owns it.
    /// @param legParams the typed hedge-leg spec (the demo's LONG CALL on cCOP/USD)
    /// @param legIndex the leg slot in the TokenId
    /// @param positionSize the dispatch size (the long size; the short counterparty is 2x)
    /// @return positionId the minted long-leg TokenId
    function resolveAndMint(HedgeLegParams calldata legParams, uint256 legIndex, uint128 positionSize)
        external
        returns (TokenId positionId)
    {
        // Phase-13 strikeWAD→tick derivation, MOVED UP into the public entrypoint (Fix C): the demo/
        // direct path keeps its strikeWAD semantics byte-unchanged; the shared sink takes the snapped
        // strike as a param.
        int24 strike = (
            TickMath.getTickAtSqrtPrice(PriceGridsLib.exchangeRateToSqrtPriceX96(legParams.strikeWAD))
                / legParams.payoffTerms.tickSpacing
        ) * legParams.payoffTerms.tickSpacing;
        // direct path → requestId == 0 (the sentinel lands in RepresentativenessAssessed).
        return _resolveAndMintAtStrike(legParams, legIndex, positionSize, 0, strike);
    }

    /// @notice POST-mint margin read for the UI (EXEC-02 informational). Forwards to RiskManagement.
    /// @dev NOT a pre-mint gate — quoting an unminted position reverts PositionNotOwned.
    function quoteMargin(TokenId id, int24 strike) external view returns (BalanceDelta) {
        return riskManager.quoteCollateralRequirements(PositionInfo({owner: address(this), Id: id}), strike);
    }

    /// @notice Platform callback hook — the LIVE Somnia edge (compiled, UNEXECUTED in Phase 13).
    /// @dev Decodes the consensus RESULT bytes (NOT the Response wrapper) into a HedgeLegParams and
    ///      routes to the same internal mint sink with the live requestId. MUST NOT assume success.
    function _onResult(uint256 requestId, Response[] memory responses, ResponseStatus status) internal override {
        // guard consensus success first (base NatSpec: the hook MUST NOT assume success).
        if (status != ResponseStatus.Success) return;

        // decode the consensus payload from `responses[0].result` — the corrected decode (§3),
        // NOT abi.decode(abi.encode(response), ...). The uint128(legParams.size) cast targets
        // positionSize (a different field from optionRatio); the size guard runs in the sink.
        HedgeLegParams memory legParams = abi.decode(responses[0].result, (HedgeLegParams));
        // strikeWAD→tick derivation (Fix C: computed at the entrypoint, byte-equivalent to today). The
        // rerouted call MUST land on _resolveAndMintAtStrike — the symbol the onResult DecodeProbe
        // overrides — so the decode-isolation harness still records the decoded params + skips dispatch.
        int24 strike = (
            TickMath.getTickAtSqrtPrice(PriceGridsLib.exchangeRateToSqrtPriceX96(legParams.strikeWAD))
                / legParams.payoffTerms.tickSpacing
        ) * legParams.payoffTerms.tickSpacing;
        _resolveAndMintAtStrike(legParams, 0, uint128(legParams.size), requestId, strike);
    }

    /// @notice EXEC + REPR — the ADDITIVE mandate front-end (Pattern 1). Reads Z_t (staleness→STRESS
    ///         fail-safe), computes the regime-conditional width + the EXACT decimal-gap structural
    ///         K_hi tick (Fix C — pre-snapped, ZERO inversion: NO strikeWAD, NO converter on this
    ///         path), maps targetNotional→feasible optionRatio ∈ [1,127], surfaces the 8-param
    ///         ExecutorDecided (the honesty flag + TEMPLATE caveat), then mints through the SHARED
    ///         Fix-C sink. The geometry reads ONLY the oracle + the immutable β₁ pair + the canonical
    ///         constant — NO live LLM (the deterministic-geometry lock).
    /// @param mandate Agent 1's hedge INTENT (school + direction + target notional + the pool anchor)
    /// @param legIndex the leg slot in the TokenId
    /// @param positionSize the dispatch size (the long size; the short counterparty is 2x)
    /// @return positionId the minted long-leg TokenId
    function resolveFromMandate(HedgeMandate calldata mandate, uint256 legIndex, uint128 positionSize)
        external
        returns (TokenId positionId)
    {
        // BRANCH on the economic school sentinel (Phase 16, SHILLER-01): 0x5 ⇒ the SHILLER
        // surprise-driven convex arm; every other sentinel (incl. POST_KEYNESIAN 0x6) ⇒ the
        // EXISTING PKE body, moved VERBATIM into the else (the byte-identical regression anchor; a
        // malformed sentinel fails toward the proven PKE path).
        if (address(mandate.economicTheory) == address(uint160(0x5))) {
            // --- SHILLER arm (extracted to keep the PKE frame byte-identical + avoid stack-too-deep) ---
            return _resolveFromShillerMandate(mandate, legIndex, positionSize);
        }
        // --- PKE arm (the EXISTING body, byte-identical) ---
        // (a) read Z_t with the staleness→STRESS fail-safe (§3.6).
        (IRegimeOracle.Regime z, uint64 observedAt) = regimeOracle.latestRegime();
        IRegimeOracle.Regime eff = RepresentativenessLib.effectiveRegime(z, observedAt, block.timestamp);

        // (b) the inflation adjustment + the regime-conditional width (the ≥1-param-≠-GBM signal).
        uint256 beta1 = eff == IRegimeOracle.Regime.Stress ? beta1StressWad : beta1TranquilWad;
        uint256 infAdj = RepresentativenessLib.inflationAdjustment(beta1, targetDevaluationWad);
        int24 width = RepresentativenessLib.regimeWidth(
            eff, beta1TranquilWad, beta1StressWad, targetDevaluationWad, baseVol, HORIZON_BLOCKS, TICK_SPACING
        );

        // (c) FIX C — the decimal-gap-correct structural K_hi tick (15% OTM), pre-snapped, ZERO
        //     inversion. The 15%-OTM offset is LOAD-BEARING (Pitfall 1b): it keeps the leg-lower ~1060
        //     ticks clear of the live spot so the short dispatch does not revert InputListFail().
        //     Anchored to the canonical CANONICAL_COP_USD rate (a TEMPLATE constant) so the math is
        //     pure/deterministic and matches the unit canary anchored at the SAME 4485. (No live-tick
        //     read — the live pool tick is NOT emitted here, so reading it would be a dead read.)
        uint256 strikeRate = (CANONICAL_COP_USD * 115) / 100; // K_hi = S0*1.15 = 4485
        int24 strikeTick = RepresentativenessLib.structuralStrikeTick(strikeRate, TICK_SPACING); // == 360360, exact

        // (d) map targetNotional → feasible optionRatio ∈ [1,127] (Pitfall 2); positionSize is the
        //     SEPARATE dispatch size (Pitfall 3). The mandate path is ALWAYS in-bound by construction;
        //     the size>127 guard is proven on the DIRECT resolveAndMint path (B3), not via this clamp.
        uint256 size = RepresentativenessLib.feasibleOptionRatio(mandate.targetNotional);

        // (e) build the HedgeLegParams (pass-through + derived; strikeWAD UNUSED on this path → 0).
        HedgeLegParams memory legParams = HedgeLegParams({
            underlyingMarket: mandate.underlyingMarket,
            strikeWAD: 0, // UNUSED — strike is the int24 param
            size: size,
            economicTheory: mandate.economicTheory,
            chainId: mandate.chainId,
            isLong: mandate.isLong,
            payoffTerms: PayoffTerms({
                vol: uint88(
                    RepresentativenessLib.regimeVol(eff, beta1TranquilWad, beta1StressWad, targetDevaluationWad, baseVol)
                ),
                horizonBlocks: HORIZON_BLOCKS,
                tickSpacing: TICK_SPACING,
                asset: 0,
                riskPartner: 0
            })
        });

        // surface the representativeness decision + the honesty flag + the TEMPLATE caveat (REPR-01).
        emit ExecutorDecided(
            0,
            uint8(eff),
            infAdj,
            strikeTick,
            width,
            true,
            RepresentativenessLib.nonErgodicDisclosed(),
            TEMPLATE_RATIONALE
        );

        // (f) mint through the SHARED Fix-C sink — pass the pre-snapped int24 strike directly.
        return _resolveAndMintAtStrike(legParams, legIndex, positionSize, 0, strikeTick);
    }

    /// @notice The SHILLER arm (Phase 16, SHILLER-01) — reads the CPI surprise oracle (staleness→s=0
    ///         minimal-stance fail-safe, 35-day monthly-CPI window), derives the CONVEX size + the
    ///         SIGN-driven further-OTM strike + the |s|-scaled even-snapped width from the Wave-1 lib
    ///         fns (reusing structuralStrikeTick + volToWidth), emits the SHILLER TEMPLATE rationale
    ///         (Shiller/UNVALIDATED; regimeZt = 0 N/A on this path), then mints through the SHARED
    ///         Fix-C sink. Extracted from resolveFromMandate so the PKE frame stays byte-identical and
    ///         the SHILLER locals do not cause stack-too-deep.
    function _resolveFromShillerMandate(HedgeMandate calldata mandate, uint256 legIndex, uint128 positionSize)
        internal
        returns (TokenId positionId)
    {
        // when stale we NEVER call shillerSurprise (which requires σ>0), so s=0 is always safe.
        int256 s;
        {
            (int256 actual, int256 consensus, uint256 sigma, uint64 observedAt) = surpriseOracle.latestSurprise();
            s = RepresentativenessLib.shillerStale(observedAt, block.timestamp)
                ? int256(0)
                : RepresentativenessLib.shillerSurprise(actual, consensus, sigma);
        }
        // depreciation-only-v1 (open-Q3 RESOLVED by fork evidence): the s<0 K_lo appreciation strike
        // (e.g. 356100, BELOW spot) underflows inside Panoptic's dispatch on the live Polygon fork —
        // the leg-upper crosses spot on the opposite side of the proven K_hi clearance. v1 restricts
        // the SHILLER arm to the depreciation (K_hi) side: a CPI miss collapses to the minimal stance
        // (s=0 ⇒ 360360 K_hi). The two-sided strip is the deferred v2 stretch.
        if (s < 0) s = 0;

        int24 strikeTick = RepresentativenessLib.shillerStrikeTick(s, TICK_SPACING);

        HedgeLegParams memory legParams = HedgeLegParams({
            underlyingMarket: mandate.underlyingMarket,
            strikeWAD: 0, // UNUSED — strike is the int24 param
            size: RepresentativenessLib.shillerOptionRatio(s),
            economicTheory: mandate.economicTheory,
            chainId: mandate.chainId,
            isLong: mandate.isLong,
            payoffTerms: PayoffTerms({
                // the |s|-scaled vol the lib feeds volToWidth (== baseVol*(1+|s|)); shillerWidth
                // even-snaps the resulting width inside volToWidth.
                vol: uint88(baseVol * (1 + (s < 0 ? uint256(-s) : uint256(s)) / 1e18)),
                horizonBlocks: HORIZON_BLOCKS,
                tickSpacing: TICK_SPACING,
                asset: 0,
                riskPartner: 0
            })
        });

        // surface |s| in the inflationAdjustment slot for the UI; regimeZt = 0 (N/A — reads surprise,
        // not the regime).
        emit ExecutorDecided(
            0,
            uint8(0),
            s < 0 ? uint256(-s) : uint256(s),
            strikeTick,
            RepresentativenessLib.shillerWidth(s, baseVol, HORIZON_BLOCKS, TICK_SPACING),
            true,
            RepresentativenessLib.nonErgodicDisclosed(),
            SHILLER_RATIONALE
        );

        return _resolveAndMintAtStrike(legParams, legIndex, positionSize, 0, strikeTick);
    }

    /// @notice The SHARED internal mint sink — covers ALL THREE entrypoints (`resolveAndMint`,
    ///         `resolveFromMandate`, `_onResult`). The resolver body migrated VERBATIM from
    ///         `PolygonConvexPositionResolverHarness` (DemoMacroHedgeExecutor.fork.t.sol:74-119); the
    ///         executor itself is the `dispatch` caller (msg.sender), so
    ///         `s_positionBalance[address(this)]` holds the position. Fix C: the strike ARRIVES as a
    ///         pre-snapped `int24` param (the `strikeWAD→tick` derivation lives in the public
    ///         entrypoints), so the mandate path can pass a decimal-gap-correct structural tick with no
    ///         inversion while the demo/direct path keeps its `strikeWAD` semantics byte-unchanged.
    /// @dev The FIRST statement is the §Pitfall-4 size guard on the ORIGINAL uint256 legParams.size:
    ///      optionRatio is 7-bit and `addOptionRatio` masks the written value with `% 128`
    ///      (TokenId.sol:237; its _optionRatio param is uint256 at :346), so size >= 128 silently
    ///      wraps to a smaller/zero ratio (size == 128 → optionRatio 0, a malformed/inactive leg)
    ///      with NO revert. Guarding the un-masked value is the real protection.
    function _resolveAndMintAtStrike(
        HedgeLegParams memory legParams,
        uint256 legIndex,
        uint128 positionSize,
        uint256 requestId,
        int24 strike
    ) internal virtual returns (TokenId positionId) {
        require(legParams.size <= 127, "optionRatio overflow");
        require(uint256(legParams.chainId) == block.chainid, "No crosschain allowed yet");
        // EXEC-01: single-use guard. Reverts on ANY resolve attempt once this executor already
        // holds legs (numberOfLegs != 0) — it is NOT a "before mint" check; it fires on every
        // entry to the shared sink. Must precede pool.dispatch (the numberOfLegs view reverts
        // Reentrancy() if called while the pool's reentrancy guard is active during dispatch).
        require(pool.numberOfLegs(address(this)) == 0, "fork used");

        int24 tickSpacing_ = legParams.payoffTerms.tickSpacing;
        int24 width = PayoffTermsLib.deriveWidthFromVol(legParams.payoffTerms);
        uint256 asset = PayoffTermsLib.deriveAsset(legParams.payoffTerms);
        uint256 riskPartner = PayoffTermsLib.deriveRiskPartner(legParams.payoffTerms);

        uint64 pid = PoolIdMappersLib.panopticPoolIdFromUniV4PoolId(legParams.underlyingMarket, vegoid, tickSpacing_);

        positionId = TokenIdLibrary.addLeg(
            TokenId.wrap(0).addPoolId(pid),
            legIndex,
            legParams.size,
            asset,
            legParams.isLong ? 1 : 0,
            0,
            riskPartner,
            strike,
            width
        );

        if (legParams.isLong && positionSize > 0) {
            TokenId shortId = TokenIdLibrary.addLeg(
                TokenId.wrap(0).addPoolId(pid), legIndex, legParams.size, asset, 0, 0, riskPartner, strike, width
            );
            {
                TokenId[] memory ml = new TokenId[](1);
                TokenId[] memory fl = new TokenId[](1);
                uint128[] memory sl = new uint128[](1);
                int24[3][] memory lim = new int24[3][](1);
                ml[0] = shortId;
                fl[0] = shortId;
                sl[0] = positionSize * 2;
                lim[0][0] = TickMath.MIN_TICK;
                lim[0][1] = TickMath.MAX_TICK;
                lim[0][2] = int24(uint24(type(uint24).max));
                pool.dispatch(ml, fl, sl, lim, true, 0);
            }
            {
                TokenId[] memory ml = new TokenId[](1);
                TokenId[] memory fl = new TokenId[](2);
                uint128[] memory sl = new uint128[](1);
                int24[3][] memory lim = new int24[3][](1);
                ml[0] = positionId;
                fl[0] = shortId;
                fl[1] = positionId;
                sl[0] = positionSize;
                lim[0][0] = TickMath.MIN_TICK;
                lim[0][1] = TickMath.MAX_TICK;
                lim[0][2] = int24(uint24(type(uint24).max));
                pool.dispatch(ml, fl, sl, lim, true, 0);
            }
        }

        // the representativeness decision (MVP stub source) + the mint event — both UI contracts.
        emit RepresentativenessAssessed(requestId, REPRESENTATIVENESS_RATIONALE, REPRESENTATIVE_STUB);
        emit PositionMinted(address(this), positionId, positionSize);
    }
}
