// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {PoolKey} from "v4-core/types/PoolKey.sol";
import {Currency} from "v4-core/types/Currency.sol";
import {IHooks} from "v4-core/interfaces/IHooks.sol";
import {FixedPointMathLib} from "solady/utils/FixedPointMathLib.sol";

/// @title PoolKeyLib — shared cCOP/USDC UniV4 PoolKey + sqrtPriceX96 builder (mn-C).
/// @notice Re-used by Plan 04 (this plan) AND Plan 05 so the PoolKey, currency ordering, and
///         sqrtPriceX96 are byte-identical across both — deployNewPool (Plan 05) never sees a
///         currency0 > currency1 ordering, because ordering is determined SOLELY at runtime here.
/// @dev Encodes a human rate of HUMAN_RATE cCOP per 1 USD (cCOP/USD ~ 1/HUMAN_RATE), baking the
///      6dp-USDC vs 18dp-cCOP decimal asymmetry into the RAW-unit price (price = amount1/amount0),
///      branching on which token sorts as currency0. The round-trip assertion in CcopUsdcPool.t.sol
///      decodes (sqrtP/2^96)^2 back through this same ordering+scale and checks it lands in [3000,5000].
library PoolKeyLib {
    /// @notice Target human cCOP-per-USD rate baked into sqrtPriceX96 (mid-band of the [3000,5000] check).
    uint256 internal constant HUMAN_RATE = 4000;

    /// @dev USDC has 6 decimals, MockCcop has 18 ⇒ the raw decimal gap is 1e12.
    uint256 internal constant DECIMAL_GAP = 1e12; // 1e18 / 1e6

    uint24 internal constant FEE = 500;
    int24 internal constant TICK_SPACING = 10;

    uint256 internal constant Q192 = 1 << 192;

    /// @notice Build the hookless cCOP/USDC PoolKey + the matching sqrtPriceX96.
    /// @param ccop The MockCcop address (18 dp).
    /// @param usdc The native USDC address (6 dp).
    /// @return key The hookless PoolKey (currencies ascending by address, fee 500, tickSpacing 10).
    /// @return sqrtPriceX96 sqrt(amount1/amount0) * 2^96 encoding ~HUMAN_RATE cCOP per USD.
    /// @return ccopIsCurrency0 True iff address(ccop) < usdc (runtime ordering, NOT assumed).
    function buildCcopUsdcKey(address ccop, address usdc)
        internal
        pure
        returns (PoolKey memory key, uint160 sqrtPriceX96, bool ccopIsCurrency0)
    {
        ccopIsCurrency0 = ccop < usdc;

        (address c0, address c1) = ccopIsCurrency0 ? (ccop, usdc) : (usdc, ccop);

        key = PoolKey({
            currency0: Currency.wrap(c0),
            currency1: Currency.wrap(c1),
            fee: FEE,
            tickSpacing: TICK_SPACING,
            hooks: IHooks(address(0))
        });

        // price = amount1 / amount0 in RAW units.
        //  HUMAN_RATE cCOP == 1 USD  ⇒  raw cCOP = HUMAN_RATE * 1e18 , raw USDC = 1e6.
        //  - cCOP is currency0: price = rawUSDC / rawCcop = 1e6 / (HUMAN_RATE * 1e18) = 1 / (HUMAN_RATE * 1e12)
        //  - cCOP is currency1: price = rawCcop / rawUSDC = (HUMAN_RATE * 1e18) / 1e6 = HUMAN_RATE * 1e12
        // sqrtPriceX96 = floor( sqrt( price * 2^192 ) ).
        uint256 sp;
        if (ccopIsCurrency0) {
            // sqrt( 2^192 / (HUMAN_RATE * 1e12) )
            sp = FixedPointMathLib.sqrt(Q192 / (HUMAN_RATE * DECIMAL_GAP));
        } else {
            // sqrt( 2^192 * HUMAN_RATE * 1e12 )
            sp = FixedPointMathLib.sqrt(Q192 * HUMAN_RATE * DECIMAL_GAP);
        }
        sqrtPriceX96 = uint160(sp);
    }

    /// @notice Decode a sqrtPriceX96 back to a human cCOP-per-USD rate through the runtime ordering.
    /// @dev Inverse of buildCcopUsdcKey's encoding; used by the round-trip assertion (mn-3).
    /// @param sqrtPriceX96 The pool's current sqrtPriceX96.
    /// @param ccopIsCurrency0 The ordering flag from buildCcopUsdcKey.
    /// @return humanRate Approximate cCOP per 1 USD.
    function decodeHumanRate(uint160 sqrtPriceX96, bool ccopIsCurrency0)
        internal
        pure
        returns (uint256 humanRate)
    {
        uint256 sp2 = uint256(sqrtPriceX96) * uint256(sqrtPriceX96); // sqrtP^2 (fits: < 2^256)
        if (ccopIsCurrency0) {
            // price = sp2 / 2^192 = 1 / (HUMAN_RATE * 1e12)  ⇒  HUMAN_RATE = 2^192 / (sp2 * 1e12)
            humanRate = Q192 / (sp2 * DECIMAL_GAP);
        } else {
            // price = sp2 / 2^192 = HUMAN_RATE * 1e12        ⇒  HUMAN_RATE = sp2 / (2^192 * 1e12)
            humanRate = sp2 / (Q192 * DECIMAL_GAP);
        }
    }
}
