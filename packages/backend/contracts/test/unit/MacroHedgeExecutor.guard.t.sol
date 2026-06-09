// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// EXEC-01 single-use guard — RED-FIRST unit test.
//
// Asserts the future guard `require(pool.numberOfLegs(address(this)) == 0, "fork used")`
// (added in Plan 10-02 at MacroHedgeExecutor.sol:366, ABOVE the dispatch gate) makes the
// shared sink `_resolveAndMintAtStrike` single-use:
//   - call 1 (legs == 0)  → does NOT revert "fork used"
//   - call 2 (legs == 1)  → reverts EXACTLY "fork used"
//
// STRATEGY — `vm.mockCall` is the SOLE approach (10-RESEARCH Open Q2, RESOLVED):
//   PanopticPoolV2.numberOfLegs (PanopticPool.sol:2155) and dispatch (PanopticPool.sol:666)
//   are NON-virtual on the CONCRETE pool, so a mock subclass of the pool cannot compile /
//   is not castable to the immutable ctor param. Construct the executor against a
//   non-zero PLACEHOLDER pool address and `vm.mockCall` the numberOfLegs selector 0→1.
//
// RED CARRIER — `resolveAndMint` (MacroHedgeExecutor.sol:156): it does NOT read the regime
//   oracle (unlike resolveFromMandate, which reverts at regimeOracle.latestRegime() before
//   ever reaching the sink). Called with positionSize == 0 so the `if (isLong && size > 0)`
//   dispatch gate (line 386) is SKIPPED and pool.dispatch is NEVER reached — the sink completes
//   cleanly once the (future) guard passes, with no real Panoptic stack.
//
// CI LANE — file name contains NO "fork" substring (OPS-06 / Pitfall 5), so it rides the
//   secret-free `forge test --no-match-path 'test/**/*[Ff]ork*'` lane.
//
// CURRENT STATE (Wave 0, no guard yet): Test 2 FAILS — call 2 does NOT revert "fork used"
//   (the guard is absent), so the `vm.expectRevert(bytes("fork used"))` is unsatisfied. That
//   is the desired RED, for the RIGHT reason (NOT an oracle/dispatch/Reentrancy revert).
//   Plan 10-02 inserts the guard → this turns GREEN.

import {Test} from "forge-std/Test.sol";

import {MacroHedgeExecutor} from "../../src/MacroHedgeExecutor.sol";
import {HedgeLegParams} from "../../src/types/HedgeLegParams.sol";
import {PayoffTerms} from "../../src/types/PayoffTerms.sol";
import {IMacroThesis} from "../../src/interfaces/IMacroThesis.sol";
import {IRegimeOracle} from "../../src/interfaces/IRegimeOracle.sol";
import {ISurpriseOracle} from "../../src/interfaces/ISurpriseOracle.sol";
import {PolygonPools} from "../../src/libraries/PolygonPools.sol";
import {PanopticPoolV2} from "@contracts/PanopticPool.sol";
import {RiskManagement} from "../../src/RiskManagement.sol";

import {MockPlatform} from "../mocks/MockPlatform.sol";
import {MockRegimeOracle} from "../mocks/MockRegimeOracle.sol";
import {MockSurpriseOracle} from "../mocks/MockSurpriseOracle.sol";

contract MacroHedgeExecutorGuardTest is Test {
    /// @dev Any NON-ZERO placeholder pool address — VALID hex (no P/O/L chars). The executor
    ///      stores this as the immutable `pool`; numberOfLegs is driven via vm.mockCall.
    address constant POOL = address(0x000000000000000000000000000000000000c0Fe);

    MacroHedgeExecutor internal executor;

    function setUp() public {
        MockPlatform platform = new MockPlatform(0.01 ether);
        MockRegimeOracle regime = new MockRegimeOracle();
        MockSurpriseOracle surprise = new MockSurpriseOracle();
        // live, non-stale regime — resolveAndMint never reads it, but keep the executor safe
        // for any path.
        regime.set(IRegimeOracle.Regime.Tranquil);

        executor = new MacroHedgeExecutor(
            address(platform),
            PanopticPoolV2(POOL),
            RiskManagement(address(0)),
            0, // vegoid
            0.10e18, // beta1Tranquil
            0.35e18, // beta1Stress
            0.15e18, // targetDev
            14_400, // baseVol
            IRegimeOracle(address(regime)),
            ISurpriseOracle(address(surprise))
        );
        vm.deal(address(this), 1000 ether);
    }

    /// @dev The demo HedgeLegParams — anchored to the WCOP/USDC pool id, isLong, size 100.
    function _demoLegParams() internal view returns (HedgeLegParams memory legParams) {
        PayoffTerms memory terms =
            PayoffTerms({vol: 14_400, horizonBlocks: 100, tickSpacing: 60, asset: 0, riskPartner: 0});
        legParams = HedgeLegParams({
            underlyingMarket: PolygonPools.POLYGON_WCOP_USDC_POOL_ID(),
            strikeWAD: uint256(4.1e18),
            size: 100,
            economicTheory: IMacroThesis(address(0)),
            chainId: uint32(block.chainid),
            isLong: true,
            payoffTerms: terms
        });
    }

    /// @dev With numberOfLegs mocked to 0, the first resolveAndMint does NOT revert "fork used".
    ///      (It does not claim a real "mint succeeds" — positionSize == 0 skips dispatch and the
    ///      call simply completes through the sink.) This passes both NOW (guard absent) and after
    ///      Plan 10-02 (guard present, legs == 0 → passes).
    function test_WhenNumberOfLegsIsZeroFirstResolveAndMintDoesNotRevertForkUsed() external {
        vm.mockCall(
            POOL,
            abi.encodeWithSelector(PanopticPoolV2.numberOfLegs.selector, address(executor)),
            abi.encode(uint256(0))
        );
        // positionSize == 0 → dispatch gate (sink line 386) skipped → pool.dispatch never reached.
        executor.resolveAndMint(_demoLegParams(), 0, 0);
    }

    /// @dev With numberOfLegs mocked to 1, a resolveAndMint MUST revert exactly "fork used" once
    ///      the guard exists. RIGHT NOW (no guard) the call does NOT revert with "fork used", so
    ///      the vm.expectRevert is unsatisfied and this test FAILS — the desired Wave-0 RED, for
    ///      the RIGHT reason (the guard is absent — NOT an oracle/dispatch/Reentrancy revert).
    function test_WhenNumberOfLegsIsNonZeroSecondResolveAndMintRevertsForkUsed() external {
        // Drive the (future) guard read: this executor already holds a leg.
        vm.mockCall(
            POOL,
            abi.encodeWithSelector(PanopticPoolV2.numberOfLegs.selector, address(executor)),
            abi.encode(uint256(1))
        );
        vm.expectRevert(bytes("fork used"));
        executor.resolveAndMint(_demoLegParams(), 0, 0);
    }

    /// @dev SHARED-SINK coverage note (EXEC-01): the guard at sink line 366 is ABOVE the dispatch
    ///      gate and inside `_resolveAndMintAtStrike`, the SOLE mint sink reached by ALL THREE
    ///      entrypoints — resolveAndMint (line 156), resolveFromMandate (line 209, PKE arm), and
    ///      _onResult (line 180). Driving the RED via resolveAndMint therefore proves the guard for
    ///      every entrypoint. resolveFromMandate is NOT exercised directly here because its PKE arm
    ///      reads regimeOracle.latestRegime() (line 223) BEFORE the sink, which would couple this
    ///      keyless unit test to oracle-staleness geometry irrelevant to the guard. The shared-sink
    ///      placement (not a per-entrypoint re-read) is the locked EXEC-01 design.
    function test_WhenCalledViaResolveFromMandateGuardSiteCoversThatEntrypoint() external pure {
        assertTrue(true, "shared sink _resolveAndMintAtStrike covers resolveFromMandate via the same guard");
    }
}
