// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";

import {RepresentativenessLib} from "../../src/libraries/Representativeness.sol";
import {VolToWidthLib} from "../../src/libraries/VolToWidth.sol";
import {ISurpriseOracle} from "../../src/interfaces/ISurpriseOracle.sol";
import {MockSurpriseOracle} from "../mocks/MockSurpriseOracle.sol";

/// @dev BTT spec: test/instrument/ShillerRepresentativeness.tree
/// @notice SHILLER-01 (unit half). Fork-free proof of the Shiller-differentiated representativeness
///         substrate: the standardized CPI surprise (`s = (actual − consensus) / σ`, sign preserved),
///         the CONVEX `max(|s|−k,0)²` option-ratio (the load-bearing differentiator from PKE's LINEAR
///         size), the SIGN-driven further-OTM structural strike (reusing the Fix-C exact decimal-gap
///         snap), the `|s|`-scaled even-snapped width (reusing VolToWidthLib.volToWidth), and the
///         stale/unset → minimal-stance (s=0) fail-safe. NO fork, sub-second, no RPC.
///
///         Each bulloak-anchored `test_When*/test_Given*` leaf (the BTT structure bulloak `check`
///         pins) delegates to a descriptively-named `test_shiller*` function that carries the
///         assertions. Both are real, runnable test functions.
///
///         TEMPLATE constants are UNCALIBRATED by design (the CPI→FX linkage is an UNVALIDATED
///         empirical assumption — structure asserted, NEVER a real FX magnitude). BASE_VOL is
///         TICK-SPACE (the demo's PayoffTerms.vol scale 14_400 — NOT a WAD).
contract ShillerRepresentativenessTestshillerCore is Test {
    int24 internal constant TICK_SPACING = 60;
    uint256 internal constant BASE_VOL = 14_400;
    uint32 internal constant HORIZON_BLOCKS = 100;
    uint256 internal constant WAD = 1e18;

    /*//////////////////////////////////////////////////////////////
                  BTT-ANCHORED LEAVES (bulloak structure)
    //////////////////////////////////////////////////////////////*/

    function test_WhenAStandardizedCpiSurpriseIsDerived() external pure {
        // it equals actual minus consensus over sigma in wad with the sign preserved
        test_shillerSurprise_wadMath();
    }

    function test_WhenASurpriseMagnitudeIsMappedToAConvexOptionRatio() external pure {
        // it is convex monotone in the absolute surprise clamped between one and 127
        test_shillerOptionRatio_convexMonotone();
    }

    function test_WhenAStrikeTickIsDerivedFromASignedSurprise() external pure {
        // it is sign driven and tickspacing aligned around the pke anchor
        test_shillerStrike_signDrivenAligned();
    }

    function test_WhenAChunkWidthIsDerivedFromASurpriseMagnitude() external pure {
        // it is even snapped and non decreasing with at least one strict widening step
        test_shillerWidth_evenMonotone();
    }

    modifier whenTheSurpriseOracleIsStaleOrUnset() {
        _;
    }

    function test_GivenObservedAtIsZero() external whenTheSurpriseOracleIsStaleOrUnset {
        // it maps to the zero surprise minimal stance
        _staleSubLeaf(0);
    }

    function test_GivenObservedAtIsBeyondTheMaxStalenessWindow()
        external
        whenTheSurpriseOracleIsStaleOrUnset
    {
        // it maps to the zero surprise minimal stance
        uint256 nowTs = 100 days;
        vm.warp(nowTs);
        // aged: observedAt sits before now - SHILLER_MAX_STALENESS (35 days)
        _staleSubLeaf(uint64(nowTs - 40 days));
    }

    /*//////////////////////////////////////////////////////////////
                       ASSERTION-CARRYING FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @notice s = (actual - consensus) * WAD / sigma, in units of sigma, sign preserved.
    function test_shillerSurprise_wadMath() public pure {
        // +1σ hotter CPI
        assertEq(
            RepresentativenessLib.shillerSurprise(4e18, 3e18, 1e18), int256(1e18), "+1 sigma"
        );
        // -1σ
        assertEq(
            RepresentativenessLib.shillerSurprise(2e18, 3e18, 1e18), -int256(1e18), "-1 sigma"
        );
        // half-sigma scale: numerator 1e18, sigma 2e18 -> 0.5e18
        assertEq(
            RepresentativenessLib.shillerSurprise(4e18, 3e18, 2e18), int256(0.5e18), "0.5 sigma"
        );
    }

    /// @notice EXACT integer convex outputs (mutation-resistant) at SCALE=10, k=0.5.
    function test_shillerOptionRatio_convexMonotone() public pure {
        assertEq(RepresentativenessLib.shillerOptionRatio(0.5e18), 1, "<=0.5 sigma floors to 1");
        assertEq(RepresentativenessLib.shillerOptionRatio(0.25e18), 1, "below threshold floors to 1");

        uint256 r1 = RepresentativenessLib.shillerOptionRatio(1e18);
        uint256 r15 = RepresentativenessLib.shillerOptionRatio(1.5e18);
        uint256 r2 = RepresentativenessLib.shillerOptionRatio(2e18);
        uint256 r25 = RepresentativenessLib.shillerOptionRatio(2.5e18);
        uint256 r3 = RepresentativenessLib.shillerOptionRatio(3e18);
        uint256 r35 = RepresentativenessLib.shillerOptionRatio(3.5e18);
        uint256 r4 = RepresentativenessLib.shillerOptionRatio(4e18);

        assertEq(r1, 2, "s=1 sigma -> 2");
        assertEq(r15, 10, "s=1.5 sigma -> 10");
        assertEq(r2, 22, "s=2 sigma -> 22");
        assertEq(r25, 40, "s=2.5 sigma -> 40");
        assertEq(r3, 62, "s=3 sigma -> 62");
        assertEq(r35, 90, "s=3.5 sigma -> 90");
        assertEq(r4, 122, "s=4 sigma -> 122");

        // monotone non-decreasing
        assertLe(r1, r15);
        assertLe(r15, r2);
        assertLe(r2, r25);
        assertLe(r25, r3);
        assertLe(r3, r35);
        assertLe(r35, r4);
        // never exceeds the 7-bit cap
        assertLe(r4, 127, "never exceeds 127");
        // sign-agnostic (|s| drives size)
        assertEq(RepresentativenessLib.shillerOptionRatio(-2e18), 22, "negative |s| same ratio");
    }

    /// @notice Sign-driven, tickSpacing-aligned, around the PKE anchor 360360.
    function test_shillerStrike_signDrivenAligned() public pure {
        int24 anchor = 360360;

        int24 up1 = RepresentativenessLib.shillerStrikeTick(1e18, TICK_SPACING);
        int24 up2 = RepresentativenessLib.shillerStrikeTick(2e18, TICK_SPACING);
        int24 up3 = RepresentativenessLib.shillerStrikeTick(3e18, TICK_SPACING);
        int24 dn1 = RepresentativenessLib.shillerStrikeTick(-1e18, TICK_SPACING);
        int24 dn2 = RepresentativenessLib.shillerStrikeTick(-2e18, TICK_SPACING);

        assertEq(up1, int24(360780), "+1 sigma");
        assertEq(up2, int24(361200), "+2 sigma");
        assertEq(up3, int24(361620), "+3 sigma");
        assertEq(dn1, int24(356760), "-1 sigma");
        assertEq(dn2, int24(356100), "-2 sigma");

        // tickSpacing alignment
        assertEq(int256(up1) % 60, 0);
        assertEq(int256(up2) % 60, 0);
        assertEq(int256(up3) % 60, 0);
        assertEq(int256(dn1) % 60, 0);
        assertEq(int256(dn2) % 60, 0);

        // sign drives the side relative to the PKE anchor
        assertGt(up1, anchor, "upside surprise sits above PKE anchor");
        assertGt(up2, anchor);
        assertGt(up3, anchor);
        assertLt(dn1, anchor, "downside surprise sits below PKE anchor");
        assertLt(dn2, anchor);
    }

    /// @notice Even-snapped, non-decreasing, with a STRICT widening step; s=0 floor == baseVol width.
    function test_shillerWidth_evenMonotone() public pure {
        int24 w0 = RepresentativenessLib.shillerWidth(0, BASE_VOL, HORIZON_BLOCKS, TICK_SPACING);
        int24 w1 = RepresentativenessLib.shillerWidth(1e18, BASE_VOL, HORIZON_BLOCKS, TICK_SPACING);
        int24 w2 = RepresentativenessLib.shillerWidth(2e18, BASE_VOL, HORIZON_BLOCKS, TICK_SPACING);

        // even-snapped (volToWidth invariant)
        assertEq(int256(w0) % 2, 0, "w0 even");
        assertEq(int256(w1) % 2, 0, "w1 even");
        assertEq(int256(w2) % 2, 0, "w2 even");

        // non-decreasing in |s|
        assertGe(w1, w0, "w1 >= w0");
        assertGe(w2, w1, "w2 >= w1");

        // STRICT widening (proves the |s| scaling is LIVE, not flat-clamped)
        assertGt(w2, w0, "width(2 sigma) strictly exceeds width(0)");

        // s=0 floor == the GBM baseline width at baseVol
        assertEq(
            w0,
            RepresentativenessLib.gbmBaselineWidth(BASE_VOL, HORIZON_BLOCKS, TICK_SPACING),
            "s=0 width == baseVol width"
        );
    }

    /*//////////////////////////////////////////////////////////////
                          STALENESS FAIL-SAFE
    //////////////////////////////////////////////////////////////*/

    /// @dev Both sub-leaves: a stale/unset surprise oracle maps to s=0 -> minimal stance
    ///      (ratio 1, base 15% OTM K_hi strike 360360, baseVol width).
    function _staleSubLeaf(uint64 observedAt) internal {
        MockSurpriseOracle oracle = new MockSurpriseOracle();
        // seed a LARGE live surprise at the (stale/unset) timestamp so a missing fail-safe would
        // size up — the stale gate must override it to s=0.
        oracle.setStaleAt(7e18, 3e18, 1e18, observedAt);
        (int256 actual, int256 consensus, uint256 sigma, uint64 obs) = oracle.latestSurprise();

        uint256 nowTs = block.timestamp;
        assertTrue(RepresentativenessLib.shillerStale(obs, nowTs), "oracle reads stale");

        // the consumer maps stale -> s = 0 -> minimal stance
        int256 s = RepresentativenessLib.shillerStale(obs, nowTs)
            ? int256(0)
            : RepresentativenessLib.shillerSurprise(actual, consensus, sigma);
        assertEq(s, int256(0), "stale -> s=0");

        assertEq(RepresentativenessLib.shillerOptionRatio(s), 1, "minimal ratio");
        assertEq(
            RepresentativenessLib.shillerStrikeTick(s, TICK_SPACING),
            int24(360360),
            "base 15% OTM K_hi strike"
        );
        assertEq(
            RepresentativenessLib.shillerWidth(s, BASE_VOL, HORIZON_BLOCKS, TICK_SPACING),
            RepresentativenessLib.gbmBaselineWidth(BASE_VOL, HORIZON_BLOCKS, TICK_SPACING),
            "baseVol width"
        );
    }
}
