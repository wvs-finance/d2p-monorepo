// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";

import {PoolKey} from "v4-core/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "v4-core/types/PoolId.sol";
import {Currency} from "v4-core/types/Currency.sol";
import {IHooks} from "v4-core/interfaces/IHooks.sol";

import {PolygonPools} from "../../src/libraries/PolygonPools.sol";
import {PoolIdMappersLib} from "../../src/libraries/PoolIdMappers.sol";

/// @dev BTT spec: test/instrument/PolygonPools.tree
/// @notice EXEC-01 substrate: prove the STRAT-02 anchor `POLYGON_WCOP_USDC_POOL_ID` round-trips the
///         demo's runtime `wcopUsdcKey.toId()` (DemoMacroHedgeExecutor.fork.t.sol:215-221) and that the
///         panoptic-pool-id mapping is deterministic. Pure unit — NO fork.
contract PolygonPoolsTestpoolIdAnchor is Test {
    using PoolIdLibrary for PoolKey;

    // The verbatim demo addresses (DemoMacroHedgeExecutor.fork.t.sol:181-182).
    address internal constant POLYGON_USDC = 0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359; // 6 decimals
    address internal constant POLYGON_WCOP = 0x8a1D45e102e886510e891d2Ec656a708991e2D76; // 18 decimals

    /// @dev Rebuilds the demo's runtime key inline from the SAME literal fields the demo uses.
    function _demoKey() internal pure returns (PoolKey memory) {
        return PoolKey({
            currency0: Currency.wrap(POLYGON_USDC),
            currency1: Currency.wrap(POLYGON_WCOP),
            fee: 3000,
            tickSpacing: 60,
            hooks: IHooks(address(0))
        });
    }

    function test_WhenTheCanonicalKeyIsBuilt() external pure {
        PoolKey memory key = PolygonPools.wcopUsdcKey();

        // it should order currency0 as USDC and currency1 as wCOP with USDC address strictly less than wCOP address
        assertEq(Currency.unwrap(key.currency0), POLYGON_USDC, "currency0 must be USDC");
        assertEq(Currency.unwrap(key.currency1), POLYGON_WCOP, "currency1 must be wCOP");
        assertLt(
            uint160(Currency.unwrap(key.currency0)),
            uint160(Currency.unwrap(key.currency1)),
            "USDC address must be strictly less than wCOP address"
        );

        // it should set fee three thousand tickSpacing sixty and the zero hooks address
        assertEq(key.fee, uint24(3000), "fee must be 3000");
        assertEq(key.tickSpacing, int24(60), "tickSpacing must be 60");
        assertEq(address(key.hooks), address(0), "hooks must be the zero address");
    }

    function test_WhenPOLYGON_WCOP_USDC_POOL_IDIsRead() external pure {
        // it should equal the demo wcopUsdcKey toId computed inline from the same fields
        PoolKey memory localKey = _demoKey();
        assertEq(
            PoolId.unwrap(PolygonPools.POLYGON_WCOP_USDC_POOL_ID()),
            PoolId.unwrap(localKey.toId()),
            "constant must equal the demo runtime key.toId()"
        );
    }

    function test_WhenThePanopticPoolIdIsMapped() external pure {
        // it should equal PoolIdMappersLib panopticPoolIdFromUniV4PoolId of the constant with a sample vegoid and tickSpacing sixty
        PoolKey memory localKey = _demoKey();
        uint8 sampleVegoid = 4; // the 07-05 §G RiskEngine.vegoid() constant; mapping is pure/deterministic

        uint64 fromConstant = PoolIdMappersLib.panopticPoolIdFromUniV4PoolId(
            PolygonPools.POLYGON_WCOP_USDC_POOL_ID(), sampleVegoid, int24(60)
        );
        uint64 fromDemoKey = PoolIdMappersLib.panopticPoolIdFromUniV4PoolId(
            localKey.toId(), sampleVegoid, int24(60)
        );

        assertEq(fromConstant, fromDemoKey, "panoptic pool id must match the demo-key derivation");
    }
}
