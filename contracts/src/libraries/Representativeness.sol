// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {TickMath} from "v4-core/libraries/TickMath.sol";
import {FixedPointMathLib} from "solady/utils/FixedPointMathLib.sol";

import {VolToWidthLib} from "./VolToWidth.sol";
import {IRegimeOracle} from "../interfaces/IRegimeOracle.sol";

/// @title RepresentativenessLib — the deterministic PKE representativeness core (Phase 14).
/// @notice The genuinely-new ~10% of Phase 14: the regime-conditional ASYMMETRIC passthrough
///         (`β₁(REGIME) × devaluation`, conditioned on Z_t), the stationary-GBM-baseline width
///         comparator (the ≥1-param-≠-GBM binding constraint), the staleness→STRESS fail-safe,
///         the Fix-C decimal-gap structural strike (ZERO inversion — the broken WAD-to-sink
///         inversion is deleted), the DEFINED monotone notional→optionRatio map, and the Davidson honesty
///         output the executor surfaces. PURE — no storage, no live LLM; the geometry is independent
///         of `inferToolsChat`.
///
///         Representativeness is NOT a correlation (a correlation presupposes the ergodicity
///         Davidson denies for COP/USD). It is the structural-membership × regime-conditional β₁ ×
///         honesty-split. β₁ is asymmetric (β₁(STRESS) > β₁(TRANQUIL)) and breaks across regimes.
///
///         TEMPLATE numbers (β₁/Z_t/NOTIONAL_PER_RATIO) are illustrative placeholders — the demo
///         asserts STRUCTURE not magnitude. TRANQUIL == the GBM baseline by construction.
library RepresentativenessLib {
    uint256 internal constant WAD = 1e18;
    uint256 internal constant DECIMAL_GAP = 1e12; // wCOP 18dp / USDC 6dp (the cornerstone pool)
    uint256 internal constant Q192 = 1 << 192;

    /// @notice The fail-safe staleness window (§3.6 guardrail). TEMPLATE demo vintage.
    uint64 internal constant MAX_STALENESS = 1 hours;

    /// @notice The DEFINED monotone notional→optionRatio scale: 1 ratio per this many whole-USD
    ///         notional. Concrete TEMPLATE value so a mid-band notional ACTUALLY changes the ratio
    ///         across [1,127] (127 * 1_000 = 127_000 USD saturates the 7-bit optionRatio cap).
    uint256 internal constant NOTIONAL_PER_RATIO = 1_000;

    /// @notice The honesty disclosure SOURCE the executor surfaces on ExecutorDecided (REPR-01):
    ///         the parametric share is hedged; the non-ergodic tail is disclosed, NOT covered.
    string internal constant TEMPLATE_RATIONALE =
        "TEMPLATE: placeholder beta1/Z_t (post-Keynesian regime-conditional passthrough); not deployment-ready. Parametric share hedged; non-ergodic tail disclosed, NOT covered.";

    /// @notice The "inflation adjustment" passthrough M (WAD) = β₁(regime) · targetDevaluation (WAD).
    ///         The wage-earner example's `M = β₁·devaluation` (§2.1). Used standalone for the β₁
    ///         asymmetry assertion (STRESS adjustment strictly exceeds TRANQUIL since β₁(STRESS) >
    ///         β₁(TRANQUIL)).
    function inflationAdjustment(uint256 beta1Wad, uint256 targetDevaluationWad)
        internal
        pure
        returns (uint256 capWad)
    {
        return (beta1Wad * targetDevaluationWad) / WAD;
    }

    /// @notice Fail-safe regime resolution (§3.6): a stale (beyond MAX_STALENESS), unset
    ///         (observedAt == 0), or Unknown oracle ⇒ default to STRESS. Otherwise pass the
    ///         oracle's Z_t through.
    function effectiveRegime(IRegimeOracle.Regime z, uint64 observedAt, uint256 nowTs)
        internal
        pure
        returns (IRegimeOracle.Regime)
    {
        bool stale = observedAt == 0 || nowTs - observedAt > MAX_STALENESS;
        return (stale || z == IRegimeOracle.Regime.Unknown) ? IRegimeOracle.Regime.Stress : z;
    }

    /// @notice The regime-conditional TICK-SPACE vol that feeds VolToWidthLib. `baseVol` is
    ///         TICK-SPACE (the demo's PayoffTerms.vol scale, e.g. 14_400 — NOT a WAD; a WAD ~1e16
    ///         sqrt-clamps to 4095).
    ///
    ///         TRANQUIL == the GBM baseline by construction ⇒ returns `baseVol` unchanged.
    ///         STRESS scales `baseVol` up by the ASYMMETRIC excess of the stress passthrough over
    ///         the tranquil one: regimeVol = baseVol · (WAD + (M(β₁stress) − M(β₁tranquil))) / WAD.
    ///         With β₁(STRESS) > β₁(TRANQUIL) the excess is strictly positive ⇒ STRESS vol strictly
    ///         exceeds the baseline vol (the CONTINUOUS, tuning-invariant binding constraint).
    ///         Collapsing β₁stress → β₁tranquil zeroes the excess ⇒ STRESS vol == baseVol (the
    ///         mutation goes vacuous, by design).
    function regimeVol(
        IRegimeOracle.Regime regime,
        uint256 beta1TranquilWad,
        uint256 beta1StressWad,
        uint256 targetDevaluationWad,
        uint256 baseVol
    ) internal pure returns (uint256) {
        if (regime == IRegimeOracle.Regime.Tranquil) {
            return baseVol; // the GBM baseline
        }
        // STRESS (and the Unknown fail-safe, though effectiveRegime maps Unknown→Stress upstream):
        // the asymmetric excess over the tranquil baseline.
        uint256 stressCap = inflationAdjustment(beta1StressWad, targetDevaluationWad);
        uint256 tranquilCap = inflationAdjustment(beta1TranquilWad, targetDevaluationWad);
        uint256 excessWad = stressCap > tranquilCap ? stressCap - tranquilCap : 0;
        return (baseVol * (WAD + excessWad)) / WAD;
    }

    /// @notice The regime-conditional WIDTH: regimeVol → uint88 → VolToWidthLib.volToWidth.
    ///         STRESS ⇒ wider chunk than the GBM baseline (the QUANTIZED ≥1-param-≠-GBM signal).
    function regimeWidth(
        IRegimeOracle.Regime regime,
        uint256 beta1TranquilWad,
        uint256 beta1StressWad,
        uint256 targetDevaluationWad,
        uint256 baseVol,
        uint32 horizonBlocks,
        int24 tickSpacing
    ) internal pure returns (int24 width) {
        uint256 vol = regimeVol(regime, beta1TranquilWad, beta1StressWad, targetDevaluationWad, baseVol);
        return VolToWidthLib.volToWidth(uint88(vol), horizonBlocks, tickSpacing);
    }

    /// @notice The stationary-GBM baseline width: the SINGLE base vol, regime-independent (the
    ///         ≠-GBM comparator). `baseVol` is TICK-SPACE ⇒ this is exactly
    ///         VolToWidthLib.volToWidth(uint88(baseVol), …), proving the unit scale (not a WAD).
    function gbmBaselineWidth(uint256 baseVol, uint32 horizonBlocks, int24 tickSpacing)
        internal
        pure
        returns (int24 width)
    {
        return VolToWidthLib.volToWidth(uint88(baseVol), horizonBlocks, tickSpacing);
    }

    /// @notice FIX C — the decimal-gap-correct structural strike TICK (Pitfall 1 fix; ZERO inversion).
    ///         `humanRateCopPerUsd` is a PLAIN integer COP-per-USD (e.g. 4485 = the K_hi strike). wCOP
    ///         is currency1 in the cornerstone pool ⇒ price(token1/token0) = humanRate · 1e12; the
    ///         strike is `snap(getTickAtSqrtPrice(floor(sqrt(humanRate · DECIMAL_GAP · Q192))))`.
    ///         This is an EXACT fixed point (snap → getSqrtPriceAtTick → getTickAtSqrtPrice → snap is
    ///         0-error): the returned tick IS the tick that gets minted, with NO inversion in between.
    ///         Verified: structuralStrikeTick(4485,60)==360360, (3900,60)==358980, (4095,60)==359460.
    ///         The WAD-inversion path (feeding a re-derived R through the raw 1:1-decimal converter) is
    ///         deleted — it mis-snaps by up to 1380 ticks for this pool (R collapses below 1 wei).
    function structuralStrikeTick(uint256 humanRateCopPerUsd, int24 tickSpacing)
        internal
        pure
        returns (int24 strikeTick)
    {
        uint256 sp = FixedPointMathLib.sqrt(humanRateCopPerUsd * DECIMAL_GAP * Q192);
        int24 raw = TickMath.getTickAtSqrtPrice(uint160(sp));
        return (raw / tickSpacing) * tickSpacing;
    }

    /// @notice Map a whole-USD notional to a feasible optionRatio ∈ [1,127] (Pitfall 2 — the 7-bit
    ///         `optionRatio % 128` ceiling). A DEFINED monotone map: clamp(notional /
    ///         NOTIONAL_PER_RATIO, 1, 127). Pure; the executor reuses it. Returns ≥ 1 even for
    ///         notional 0 (a leg must carry a non-zero ratio), and saturates at 127.
    function feasibleOptionRatio(uint256 targetNotional) internal pure returns (uint256 ratio) {
        uint256 raw = targetNotional / NOTIONAL_PER_RATIO;
        if (raw < 1) return 1;
        if (raw > 127) return 127;
        return raw;
    }

    /// @notice The honesty disclosure (REPR-01) — deterministic, surfaced by the executor. The
    ///         non-ergodic tail is always DISCLOSED (true), never silently implied as covered.
    function nonErgodicDisclosed() internal pure returns (bool) {
        return true;
    }

    /*//////////////////////////////////////////////////////////////
            SHILLER BRANCH (Phase 16, SHILLER-01) — ADDITIVE
    //////////////////////////////////////////////////////////////*/

    /// @notice TEMPLATE: the surprise must exceed this many sigma (0.5σ) before the position grows.
    uint256 internal constant SHILLER_K = 0.5e18;
    /// @notice TEMPLATE: the convex size scale (raw = SCALE * (|s|-k)^2).
    uint256 internal constant SHILLER_RATIO_SCALE = 10;
    /// @notice TEMPLATE: +5% (500 bps) OTM per whole sigma of surprise.
    uint256 internal constant SHILLER_OTM_SIGMA_BPS = 500;
    /// @notice The base OTM in bps (15% == the PKE K_hi anchor at CANONICAL_COP_USD·1.15).
    uint256 internal constant SHILLER_BASE_OTM_BPS = 1500;
    /// @notice TEMPLATE: mirror the executor's CANONICAL_COP_USD pin (~live spot 3778; K_hi at 1.15).
    uint256 internal constant SHILLER_CANONICAL_COP_USD = 3900;
    /// @notice TEMPLATE: the Shiller staleness window. CPI prints MONTHLY (RESEARCH §4), so a 35-day
    ///         window (one monthly cadence + slack) is the HONEST fail-safe horizon — distinct from
    ///         PKE's 1h MAX_STALENESS (which tracks a fast regime indicator). A stale/unset surprise
    ///         oracle maps to s=0 (minimal stance), NOT a tail-sized bet.
    uint64 internal constant SHILLER_MAX_STALENESS = 35 days;

    /// @notice The honesty SOURCE the executor surfaces on the SHILLER ExecutorDecided: the CPI→FX
    ///         linkage is an UNVALIDATED empirical assumption, NOT a proven transfer function.
    string internal constant SHILLER_TEMPLATE_RATIONALE =
        "TEMPLATE: Shiller surprise-driven convex (s=(actual-consensus)/sigma); consensus/sigma are placeholders; the CPI-surprise->FX-move linkage is an UNVALIDATED empirical assumption, NOT a proven transfer function. Single-leg approximation of the Carr-Madan digital strip; non-ergodic tail disclosed, NOT covered.";

    /// @notice The standardized CPI surprise `s = (actual − consensus) / σ`, signed WAD (units of σ).
    ///         The SIGN drives the strike side; `|s|` drives size + width. `require(σ>0)` guards
    ///         div-by-zero (the mock seeds a non-zero σ).
    function shillerSurprise(int256 actualWad, int256 consensusWad, uint256 sigmaWad)
        internal
        pure
        returns (int256 sWad)
    {
        require(sigmaWad > 0, "sigma>0");
        sWad = ((actualWad - consensusWad) * int256(WAD)) / int256(sigmaWad);
    }

    /// @notice The CONVEX `max(|s|−k,0)²` option-ratio (the load-bearing differentiator from PKE's
    ///         LINEAR notional size). Clamped to [1,127] (the 7-bit `optionRatio % 128` ceiling),
    ///         reusing the same clamp discipline as `feasibleOptionRatio`. UNIT CARE: `excess²` is
    ///         WAD² ⇒ divide by WAD*WAD to land in a plain integer ratio.
    function shillerOptionRatio(int256 sWad) internal pure returns (uint256 ratio) {
        uint256 absS = sWad < 0 ? uint256(-sWad) : uint256(sWad);
        if (absS <= SHILLER_K) return 1; // below threshold -> floor leg (a leg must carry >=1)
        uint256 excessWad = absS - SHILLER_K;
        uint256 raw = (SHILLER_RATIO_SCALE * excessWad * excessWad) / (WAD * WAD);
        if (raw < 1) return 1;
        if (raw > 127) return 127;
        return raw;
    }

    /// @notice The SIGN-driven, further-OTM-than-PKE structural strike TICK. Base 15% OTM (== PKE)
    ///         + SHILLER_OTM_SIGMA_BPS per whole |sigma|, on the SIGN-correct side: upside CPI ⇒ COP
    ///         depreciation ⇒ HIGHER COP/USD (K_hi); downside ⇒ appreciation ⇒ LOWER COP/USD. REUSES
    ///         the Fix-C exact decimal-gap snap `structuralStrikeTick` (do NOT hand-roll). At s=0:
    ///         pctBps=1500 ⇒ rate 4485 ⇒ tick 360360 (the PKE anchor — the minimal-stance strike).
    ///         NOTE the σ-quantization: `|s|/WAD` floors to whole σ, so e.g. +3σ and +3.5σ share the
    ///         same strike tick (361620) — the convex SIZE differentiates them.
    function shillerStrikeTick(int256 sWad, int24 tickSpacing) internal pure returns (int24) {
        uint256 absSigmas = (sWad < 0 ? uint256(-sWad) : uint256(sWad)) / WAD;
        uint256 pctBps = SHILLER_BASE_OTM_BPS + SHILLER_OTM_SIGMA_BPS * absSigmas;
        uint256 rate = sWad >= 0
            ? (SHILLER_CANONICAL_COP_USD * (10000 + pctBps)) / 10000
            : (SHILLER_CANONICAL_COP_USD * (10000 - pctBps)) / 10000;
        return structuralStrikeTick(rate, tickSpacing);
    }

    /// @notice The `|s|`-scaled, even-snapped width: a bigger surprise ⇒ wider band; ≥ baseVol always.
    ///         Feeds the `|s|`-scaled TICK-SPACE vol into the PROVEN `VolToWidthLib.volToWidth` (which
    ///         already even-snaps — do NOT hand-roll a snap). At s=0 ⇒ vol == baseVol ⇒ the GBM
    ///         baseline width.
    function shillerWidth(int256 sWad, uint256 baseVol, uint32 horizonBlocks, int24 tickSpacing)
        internal
        pure
        returns (int24)
    {
        uint256 absSigmas = (sWad < 0 ? uint256(-sWad) : uint256(sWad)) / WAD;
        uint256 vol = baseVol * (1 + absSigmas);
        return VolToWidthLib.volToWidth(uint88(vol), horizonBlocks, tickSpacing);
    }

    /// @notice The Shiller staleness fail-safe predicate: an unset (observedAt==0) or aged
    ///         (nowTs−observedAt > SHILLER_MAX_STALENESS, the monthly-CPI window) oracle is stale.
    ///         The consumer maps a stale read to s=0 (minimal stance) — the honest "no signal ⇒
    ///         don't size up" reading. (The Wave-2 SHILLER arm calls this.)
    function shillerStale(uint64 observedAt, uint256 nowTs) internal pure returns (bool) {
        return observedAt == 0 || nowTs - observedAt > SHILLER_MAX_STALENESS;
    }
}
