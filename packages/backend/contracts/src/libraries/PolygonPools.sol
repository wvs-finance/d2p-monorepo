// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {PoolKey} from "v4-core/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "v4-core/types/PoolId.sol";
import {Currency} from "v4-core/types/Currency.sol";
import {IHooks} from "v4-core/interfaces/IHooks.sol";

/// @title PolygonPools
/// @notice Canonical cornerstone-pool anchors for the Polygon wCOP/USDC UniV4 pool (fee 3000,
///         tickSpacing 60, hookless). The STRAT-02 anchor: Agent 1 (an LLM) cannot produce a
///         runtime PoolId, so both agents reference the cornerstone pool by this stable constant
///         instead of recomputing the keccak hash. The key reproduces the demo's runtime
///         `wcopUsdcKey` (DemoMacroHedgeExecutor.fork.t.sol:215-221) EXACTLY — the currency
///         ordering (currency0=USDC 6dp < currency1=wCOP 18dp) is load-bearing: any drift breaks
///         the whole TokenId derivation.
library PolygonPools {
    using PoolIdLibrary for PoolKey;

    /// @notice The canonical wCOP/USDC PoolKey on Polygon. currency0=USDC (6dp), currency1=wCOP (18dp),
    ///         fee 3000, tickSpacing 60, hookless. USDC address (0x3c49…) < wCOP address (0x8a1D…) so the
    ///         UniV4 currency0<currency1 ordering holds and asset:0 == token0 == USDC.
    /// @dev A function-returning value rather than a `constant` state var because PoolKey/PoolId are not
    ///      compile-time constant-expressible.
    function wcopUsdcKey() internal pure returns (PoolKey memory) {
        return PoolKey({
            currency0: Currency.wrap(0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359), // USDC 6dp
            currency1: Currency.wrap(0x8a1D45e102e886510e891d2Ec656a708991e2D76), // wCOP 18dp
            fee: 3000,
            tickSpacing: 60,
            hooks: IHooks(address(0))
        });
    }

    /// @notice The PoolId of the canonical wCOP/USDC pool — equals the demo's runtime `wcopUsdcKey.toId()`.
    ///         Feeds `PoolIdMappersLib.panopticPoolIdFromUniV4PoolId(POLYGON_WCOP_USDC_POOL_ID(), vegoid, 60)`
    ///         to derive the uint64 Panoptic pool id consumed by `addPoolId`.
    function POLYGON_WCOP_USDC_POOL_ID() internal pure returns (PoolId) {
        return wcopUsdcKey().toId();
    }
}
