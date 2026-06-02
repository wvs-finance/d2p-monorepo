// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {TokenId} from "@types/TokenId.sol";
import {PositionBalance} from "@types/PositionBalance.sol";
import {LeftRightUnsigned} from "@types/LeftRight.sol";

/// @title IPanopticData — the swap-seam interface onto borrowed Panoptic V2.
/// @notice ABI subset of the audited V2 `PanopticPool`
///         (code-423n4/2025-12-panoptic @ fe557748210a529ae414d7c487b6514be0d9e220).
///         Every function below EXISTS verbatim on V2 PanopticPool (07-RESEARCH-DEPLOY section E):
///         dispatch (L572), dispatchFrom (L1360, payable), getAccumulatedFeesAndPositionsData (L221),
///         getCurrentTick (L1949), getTWAP (L1944), numberOfLegs (L1921).
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

    // streamia / premium READ — EXISTS @L221
    function getAccumulatedFeesAndPositionsData(
        address user,
        bool includePendingPremium,
        TokenId[] calldata positionIdList
    )
        external
        view
        returns (
            LeftRightUnsigned shortPremium,
            LeftRightUnsigned longPremium,
            PositionBalance[] memory balances
        );

    // pool-state reads — ALL EXIST: getCurrentTick @L1949, getTWAP @L1944, numberOfLegs @L1921
    function getCurrentTick() external view returns (int24);

    function getTWAP() external view returns (int24);

    function numberOfLegs(address user) external view returns (uint256);
}
