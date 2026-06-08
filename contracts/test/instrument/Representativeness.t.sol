// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";

import {RepresentativenessLib} from "../../src/libraries/Representativeness.sol";
import {IRegimeOracle} from "../../src/interfaces/IRegimeOracle.sol";
import {VolToWidthLib} from "../../src/libraries/VolToWidth.sol";
import {MockRegimeOracle} from "../mocks/MockRegimeOracle.sol";

import {TickMath} from "v4-core/libraries/TickMath.sol";
import {FixedPointMathLib} from "solady/utils/FixedPointMathLib.sol";

/// @dev BTT spec: test/instrument/Representativeness.tree
/// @notice REPR-01 + REPR-02 (unit half). Fork-free proof of the deterministic representativeness
///         substrate: the PKE regime-conditional asymmetric passthrough core (β₁(REGIME)×devaluation),
///         the GBM-baseline divergence (CONTINUOUS load-bearing + QUANTIZED), the staleness→STRESS
///         fail-safe, the DEFINED monotone feasibleOptionRatio, the Fix-C decimal-gap strike
///         (`structuralStrikeTick`, asserted by EXACT equality at the executor's K_hi rate 4485),
///         and the mutation non-vacuity contract. NO fork, sub-second, no RPC.
///
///         Each bulloak-anchored `test_When*/test_Given*` leaf (the BTT structure bulloak `check`
///         pins) delegates to a VALIDATION-map-named `test_*` function that carries the assertions
///         (the `--match-test` strings the Nyquist map routes to this file). Both are real, runnable,
///         green test functions.
///
///         TEMPLATE inputs (illustrative β₁/Z_t vintage from the wage-earner example; label TEMPLATE):
///         the tests assert STRUCTURE not magnitude. BASE_VOL is TICK-SPACE (the demo's PayoffTerms.vol
///         scale 14_400 — NOT a WAD; a WAD ~1e16 sqrt-clamps to 4095).
contract RepresentativenessTestrepresentativenessCore is Test {
    // --- PKE passthrough stubs (WAD-scaled, TEMPLATE vintage) ---
    uint256 internal constant BETA1_TRANQUIL_WAD = 0.10e18; // β₁ tranquil (illustrative)
    uint256 internal constant BETA1_STRESS_WAD = 0.35e18; // β₁ stress  (illustrative, > tranquil)
    uint256 internal constant TARGET_DEVALUATION_WAD = 0.15e18; // target devaluation (K_hi = S₀·1.15)

    // --- geometry scale (the SAME as the demo's PayoffTerms; TICK-SPACE vol) ---
    uint256 internal constant BASE_VOL = 14_400; // sqrt = 120 tick std-dev (NOT a WAD)
    int24 internal constant TICK_SPACING = 60; // matches wcopUsdcKey
    uint32 internal constant HORIZON_BLOCKS = 100; // sqrt = 10

    /*//////////////////////////////////////////////////////////////
                  BTT-ANCHORED LEAVES (bulloak structure)
    //////////////////////////////////////////////////////////////*/

    function test_WhenAStructuralStrikeTickIsDerivedForAHumanRate() external pure {
        // it equals the decimal-gap-correct snapped tick exactly at the K_hi strike
        test_structuralStrike_exactAt4485();
    }

    function test_WhenTheRegime_conditionalWidthIsDerived() external pure {
        // it differs from the stationary GBM baseline width when the regime is stress
        test_regimeWidth_differsFromGbmBaseline();
    }

    function test_WhenTheRegime_conditionalVolIsDerived() external pure {
        // it strictly exceeds the stationary baseline vol when the regime is stress
        test_regimeVol_stressExceedsBaseline();
    }

    function test_WhenBetaOneIsAppliedAcrossRegimes() external pure {
        // it makes the stress inflation adjustment strictly exceed the tranquil one
        test_beta1_stressExceedsTranquil();
    }

    modifier whenTheRegimeOracleIsStaleOrUnset() {
        _;
    }

    function test_GivenObservedAtIsZero() external whenTheRegimeOracleIsStaleOrUnset {
        // it resolves the effective regime to stress
        test_staleOracle_defaultsToStress();
    }

    function test_GivenObservedAtIsBeyondTheMaxStalenessWindow() external whenTheRegimeOracleIsStaleOrUnset {
        // it resolves the effective regime to stress
        test_staleOracle_defaultsToStress();
    }

    function test_WhenAWhole_usdNotionalIsMappedToAFeasibleOptionRatio() external pure {
        // it is a monotone non-decreasing map clamped between one and one hundred twenty seven
        test_feasibleOptionRatio_monotoneFromNotional();
    }

    function test_WhenTheFullGeometryIsResolvedFromAMandate_likeInput() external pure {
        // it derives the expected hedge-leg fields field by field
        test_resolveFromMandate_derivesExpectedGeometry();
    }

    function test_WhenTheGeometryDerivationIsMutatedToCollapseStressBetaOneOntoTranquil() external pure {
        // it makes the gbm divergence and asymmetry assertions vacuous
        test_mutation_collapseBeta1_breaksNonVacuity();
    }

    /*//////////////////////////////////////////////////////////////
            VALIDATION-MAP LEAVES (the --match-test assertions)
    //////////////////////////////////////////////////////////////*/

    function test_structuralStrike_exactAt4485() public pure {
        // EXACT equality (not a band): 4485 = the K_hi strike the executor mints; 3900 catches a
        // 1e12-gap-factor regression. The deleted WAD-inversion path gave 361680 at 4485 (off by 1320).
        assertEq(int256(RepresentativenessLib.structuralStrikeTick(4485, 60)), int256(360360), "K_hi tick");
        assertEq(int256(RepresentativenessLib.structuralStrikeTick(3900, 60)), int256(358980), "spot tick");
    }

    function test_regimeWidth_differsFromGbmBaseline() public pure {
        int24 wStress = RepresentativenessLib.regimeWidth(
            IRegimeOracle.Regime.Stress,
            BETA1_TRANQUIL_WAD,
            BETA1_STRESS_WAD,
            TARGET_DEVALUATION_WAD,
            BASE_VOL,
            HORIZON_BLOCKS,
            TICK_SPACING
        );
        int24 wGbm = RepresentativenessLib.gbmBaselineWidth(BASE_VOL, HORIZON_BLOCKS, TICK_SPACING);
        assertTrue(wStress != wGbm, "stress width must diverge from the GBM baseline");
        // The GBM baseline IS the raw tick-space width of BASE_VOL — proving the unit scale (not a
        // WAD that clamps to 4095). NEVER assert TRANQUIL-vs-baseline (TRANQUIL == GBM by construction).
        assertEq(
            int256(wGbm),
            int256(VolToWidthLib.volToWidth(uint88(BASE_VOL), HORIZON_BLOCKS, TICK_SPACING)),
            "GBM baseline must equal volToWidth(BASE_VOL)"
        );
    }

    function test_regimeVol_stressExceedsBaseline() public pure {
        // The CONTINUOUS load-bearing assertion — tuning-invariant (volToWidth ceil-snaps so a
        // one-unit width margin can vanish, but the underlying STRESS vol > baseline vol does not).
        assertGt(
            RepresentativenessLib.regimeVol(
                IRegimeOracle.Regime.Stress, BETA1_TRANQUIL_WAD, BETA1_STRESS_WAD, TARGET_DEVALUATION_WAD, BASE_VOL
            ),
            BASE_VOL,
            "stress vol must strictly exceed the baseline vol"
        );
    }

    function test_beta1_stressExceedsTranquil() public pure {
        assertGt(
            RepresentativenessLib.inflationAdjustment(BETA1_STRESS_WAD, TARGET_DEVALUATION_WAD),
            RepresentativenessLib.inflationAdjustment(BETA1_TRANQUIL_WAD, TARGET_DEVALUATION_WAD),
            "stress inflation adjustment must exceed tranquil"
        );
    }

    function test_staleOracle_defaultsToStress() public {
        MockRegimeOracle oracle = new MockRegimeOracle();

        // given observedAt is zero (unset) -> a Tranquil push at ts 0 still resolves to Stress
        oracle.setStaleAt(IRegimeOracle.Regime.Tranquil, 0);
        (IRegimeOracle.Regime z0, uint64 ts0) = oracle.latestRegime();
        assertEq(
            uint256(RepresentativenessLib.effectiveRegime(z0, ts0, block.timestamp)),
            uint256(IRegimeOracle.Regime.Stress),
            "observedAt==0 must fail safe to Stress"
        );

        // given observedAt is beyond the max staleness window -> resolves to Stress
        vm.warp(1 + uint256(RepresentativenessLib.MAX_STALENESS) + 1);
        oracle.setStaleAt(IRegimeOracle.Regime.Tranquil, 1); // pushed at ts 1, now far past MAX_STALENESS
        (IRegimeOracle.Regime z1, uint64 ts1) = oracle.latestRegime();
        assertEq(
            uint256(RepresentativenessLib.effectiveRegime(z1, ts1, block.timestamp)),
            uint256(IRegimeOracle.Regime.Stress),
            "beyond MAX_STALENESS must fail safe to Stress"
        );

        // the non-vacuous control: a FRESH Tranquil push resolves to Tranquil
        oracle.set(IRegimeOracle.Regime.Tranquil);
        (IRegimeOracle.Regime z2, uint64 ts2) = oracle.latestRegime();
        assertEq(
            uint256(RepresentativenessLib.effectiveRegime(z2, ts2, block.timestamp)),
            uint256(IRegimeOracle.Regime.Tranquil),
            "a fresh Tranquil must resolve to Tranquil"
        );
    }

    function test_feasibleOptionRatio_monotoneFromNotional() public pure {
        uint256 unit = RepresentativenessLib.NOTIONAL_PER_RATIO;

        // (i) 1 at/below the floor (incl. notional 0 — a leg must carry a non-zero ratio)
        assertEq(RepresentativenessLib.feasibleOptionRatio(0), 1, "floor ratio must be 1 at notional 0");
        assertEq(RepresentativenessLib.feasibleOptionRatio(unit - 1), 1, "below-floor notional must clamp to 1");

        // (ii) 127 at/above the cap
        assertEq(RepresentativenessLib.feasibleOptionRatio(127 * unit), 127, "ratio must saturate at 127");
        assertEq(
            RepresentativenessLib.feasibleOptionRatio(1_000 * unit), 127, "above-cap notional must clamp to 127"
        );

        // (iii) monotone non-decreasing across several samples
        uint256 prev = RepresentativenessLib.feasibleOptionRatio(0);
        for (uint256 mult = 1; mult <= 200; mult += 13) {
            uint256 r = RepresentativenessLib.feasibleOptionRatio(mult * unit);
            assertGe(r, prev, "feasibleOptionRatio must be monotone non-decreasing");
            prev = r;
        }

        // (iv) a mid-band step STRICTLY raises the ratio (a notional-ignored regression REDs here)
        assertGt(
            RepresentativenessLib.feasibleOptionRatio(unit * 10),
            RepresentativenessLib.feasibleOptionRatio(unit * 5),
            "mid-band notional must change the ratio"
        );
    }

    function test_resolveFromMandate_derivesExpectedGeometry() public pure {
        // A PURE round-trip on the lib: a mandate-like input set → the EXPECTED geometry, field by field.
        // humanRate 3900 → strikeRate = 3900*115/100 = 4485 (the K_hi strike). NO WAD inversion.
        uint256 humanRate = 3900;
        uint256 strikeRate = (humanRate * 115) / 100;
        assertEq(strikeRate, 4485, "K_hi strike rate");

        // strike: the EXACT K_hi tick from the decimal-gap-correct snap.
        assertEq(
            int256(RepresentativenessLib.structuralStrikeTick(strikeRate, TICK_SPACING)),
            int256(360360),
            "structural strike tick must be the exact K_hi tick"
        );

        // width: the stress regime width equals the recomputed stress width (deterministic).
        int24 wStress = RepresentativenessLib.regimeWidth(
            IRegimeOracle.Regime.Stress,
            BETA1_TRANQUIL_WAD,
            BETA1_STRESS_WAD,
            TARGET_DEVALUATION_WAD,
            BASE_VOL,
            HORIZON_BLOCKS,
            TICK_SPACING
        );
        assertEq(
            int256(wStress),
            int256(
                VolToWidthLib.volToWidth(
                    uint88(
                        RepresentativenessLib.regimeVol(
                            IRegimeOracle.Regime.Stress,
                            BETA1_TRANQUIL_WAD,
                            BETA1_STRESS_WAD,
                            TARGET_DEVALUATION_WAD,
                            BASE_VOL
                        )
                    ),
                    HORIZON_BLOCKS,
                    TICK_SPACING
                )
            ),
            "regime width must equal volToWidth(regimeVol(STRESS))"
        );

        // size: feasibleOptionRatio of a concrete targetNotional lands in [1,127] and equals the clamp.
        uint256 targetNotional = RepresentativenessLib.NOTIONAL_PER_RATIO * 12; // expect ratio 12
        uint256 ratio = RepresentativenessLib.feasibleOptionRatio(targetNotional);
        assertEq(ratio, 12, "feasibleOptionRatio must equal the expected clamp");
        assertGe(ratio, uint256(1), "ratio floor");
        assertLe(ratio, uint256(127), "ratio cap");

        // pass-through bits (asset/isLong) are caller inputs — proven equal to themselves here
        // (the executor in Plan 02 copies them verbatim from the mandate).
        uint256 asset = 0; // token0
        bool isLong = true;
        assertEq(asset, uint256(0), "asset pass-through");
        assertTrue(isLong, "isLong pass-through");
    }

    function test_mutation_collapseBeta1_breaksNonVacuity() public pure {
        // The mutation contract (13-03 dedicated-leaf shape): collapse β₁stress → β₁tranquil ⇒ the
        // CONTINUOUS regimeVol(STRESS) == baseVol AND the QUANTIZED regimeWidth(STRESS) ==
        // gbmBaselineWidth. With the equal pair (TRANQUIL, TRANQUIL) the binding assertions go vacuous.
        assertEq(
            RepresentativenessLib.regimeVol(
                IRegimeOracle.Regime.Stress,
                BETA1_TRANQUIL_WAD,
                BETA1_TRANQUIL_WAD, // collapsed stress β₁ onto tranquil
                TARGET_DEVALUATION_WAD,
                BASE_VOL
            ),
            BASE_VOL,
            "collapsed-beta1 stress vol must equal baseline (continuous vacuity)"
        );
        assertEq(
            int256(
                RepresentativenessLib.regimeWidth(
                    IRegimeOracle.Regime.Stress,
                    BETA1_TRANQUIL_WAD,
                    BETA1_TRANQUIL_WAD, // collapsed
                    TARGET_DEVALUATION_WAD,
                    BASE_VOL,
                    HORIZON_BLOCKS,
                    TICK_SPACING
                )
            ),
            int256(RepresentativenessLib.gbmBaselineWidth(BASE_VOL, HORIZON_BLOCKS, TICK_SPACING)),
            "collapsed-beta1 stress width must equal the GBM baseline (quantized vacuity)"
        );
    }
}
