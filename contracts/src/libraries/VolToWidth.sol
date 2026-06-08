// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {TickMath} from "v4-core/libraries/TickMath.sol";
import {FixedPointMathLib} from "solady/utils/FixedPointMathLib.sol";
import {SqrtPriceMath} from "v4-core/libraries/SqrtPriceMath.sol";
import {PanopticMath} from "@libraries/PanopticMath.sol";

library VolToWidthLib {
    using FixedPointMathLib for uint256;

    function volToWidth(uint88 volatilityAverage, uint32 horizonBlocks, int24 tickSpacing)
        internal
        pure
        returns (int24 width)
    {
        uint256 tickStdDev = uint256(volatilityAverage).sqrt();
        uint256 sqrtHorizon = uint256(horizonBlocks).sqrt();
        uint256 deltaTick = tickStdDev * sqrtHorizon;

        uint256 spacing = uint256(uint24(tickSpacing));
        uint256 raw = (deltaTick + spacing - 1) / spacing;

        if (raw < 1) raw = 1;
        if (raw > 4095) raw = 4095;
        // Panoptic's getRangesFromStrike is asymmetric (rangeDown truncates, rangeUp rounds up), so
        // a leg bound falls off the tickSpacing grid -> InvalidTickBound() at mint -> exactly when
        // width*tickSpacing is odd, i.e. when width is odd (tickSpacing is even on real pools). An
        // even width collapses both ranges to (width/2)*tickSpacing, an exact multiple of tickSpacing,
        // so both bounds stay aligned. Snap odd widths up to the next even width, snapping DOWN only
        // at the 4095 ceiling so raw stays within [1, 4095].
        if ((raw & 1) == 1) raw = raw < 4095 ? raw + 1 : raw - 1;
        width = int24(uint24(raw));
    }

    function strikeFromVol(
        int24 currentTick,
        uint88 volatilityAverage,
        uint32 horizonBlocks,
        int24 tickSpacing,
        bool isCall
    ) internal pure returns (int24 strike) {
        uint256 tickStdDev = uint256(volatilityAverage).sqrt();
        uint256 sqrtHorizon = uint256(horizonBlocks).sqrt();
        int24 deltaTick = int24(int256(tickStdDev * sqrtHorizon));

        strike = !isCall
            ? currentTick + deltaTick  // short put: strike 1σ above
            : currentTick - deltaTick; // short call: strike 1σ below

        strike = (strike / tickSpacing) * tickSpacing;
    }

    function widthToVol(int24 width, int24 tickSpacing, uint32 horizonBlocks)
        internal
        pure
        returns (uint88 volatilityAverage)
    { 
        uint256 deltaTick = uint256(uint24(width)) * uint256(uint24(tickSpacing));
        volatilityAverage = uint88((deltaTick * deltaTick) / uint256(horizonBlocks));
    }

    function amount0OnSwapForOption(
        int24 strike,
        int24 width,
        int24 tickSpacing,
        uint160 currentSqrtPriceX96,
        uint128 liquidity
    ) internal pure returns (int256, int24, int24) {
        (int24 tickLower, int24 tickUpper) = PanopticMath.getTicks(strike, width, tickSpacing);
        uint160 sqrtLower = TickMath.getSqrtPriceAtTick(tickLower);
        uint160 sqrtUpper = TickMath.getSqrtPriceAtTick(tickUpper);
        int256 amount0Required = SqrtPriceMath.getAmount0Delta(
            currentSqrtPriceX96 < sqrtLower ? sqrtLower : currentSqrtPriceX96,
            sqrtUpper,
            int128(liquidity)
        );
        return (amount0Required, tickLower, tickUpper);
    }
}
