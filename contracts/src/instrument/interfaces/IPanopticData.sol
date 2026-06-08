// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {TokenId} from "@types/TokenId.sol";
import {PositionBalance} from "@types/PositionBalance.sol";
import {LeftRightUnsigned, LeftRightSigned} from "@types/LeftRight.sol";
import {OraclePack} from "@types/OraclePack.sol";

/// @title IPanopticData — the swap-seam interface onto borrowed Panoptic V2.
/// @notice ABI subset of the post-audit V2 `PanopticPoolV2`
///         (panoptic-v2-core @ d20b0aed127ab5d3e5ca17c5399782aad2f0ff4c, forge-installed `main`).
///         Every function below EXISTS verbatim on V2 PanopticPoolV2:
///         dispatch (L666), dispatchFrom (L1534, payable), getFullPositionsData (L484),
///         getCurrentTick (L2184), getTWAP (L2179), numberOfLegs (L2155), getOracleTicks (L2122).
/// @dev ABI DELTA vs audit snapshot fe55774: the audited `getAccumulatedFeesAndPositionsData`
///      (returned shortPremium, longPremium, PositionBalance[]) was renamed to `getFullPositionsData`
///      and EXTENDED with two trailing return values (collateralRequirements, netPremiaPerPosition).
///      The first three returns are byte-identical; the streamia seam consumes ONLY `longPremium`.
/// @dev Depends ONLY on V2 value types (TokenId / PositionBalance / LeftRightUnsigned),
///      never on the BUSL concrete contracts. The FORK-03 compile-time conformance proof is
///      that this interface COMPILES against the borrowed V2 type imports (`forge build`),
///      NOT an unchecked `IPanopticData(addr)` cast.
interface IPanopticData {
    // mint / burn / settle (size-delta disambiguated) — EXISTS @L572
    function dispatch(
        TokenId[] calldata positionIdList,
        TokenId[] calldata finalPositionIdList,
        uint128[] calldata positionSizes,
        int24[3][] calldata tickAndSpreadLimits,
        bool usePremiaAsCollateral,
        uint256 builderCode
    ) external;

    // liquidation / forceExercise / settleLongPremium — EXISTS @L1360, IS external payable
    function dispatchFrom(
        TokenId[] calldata positionIdListFrom,
        address account,
        TokenId[] calldata positionIdListTo,
        TokenId[] calldata positionIdListToFinal,
        LeftRightUnsigned usePremiaAsCollateral
    ) external payable;

    // streamia / premium READ — EXISTS @L484 (renamed+extended from audited getAccumulatedFeesAndPositionsData)
    function getFullPositionsData(
        address user,
        bool includePendingPremium,
        TokenId[] calldata positionIdList
    )
        external
        view
        returns (
            LeftRightUnsigned shortPremium,
            LeftRightUnsigned longPremium,
            PositionBalance[] memory positionBalances,
            LeftRightUnsigned[] memory collateralRequirements,
            LeftRightSigned[] memory netPremiaPerPosition
        );

    // pool-state reads — ALL EXIST: getCurrentTick @L1949, getTWAP @L1944, numberOfLegs @L1921
    function getCurrentTick() external view returns (int24);

    function getTWAP() external view returns (int24);

    function numberOfLegs(address user) external view returns (uint256);

    // oracle ticks for involuntary-branch health monitoring — EXISTS @L1899
    function getOracleTicks() external view returns (int24 currentTick, int24 spotTick, int24 medianTick, int24 latestTick, OraclePack oraclePack);
}
