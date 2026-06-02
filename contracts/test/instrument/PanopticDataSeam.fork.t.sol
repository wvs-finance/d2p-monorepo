// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IPanopticData} from "../../src/instrument/interfaces/IPanopticData.sol";
import {IERC4626} from "@openzeppelin/contracts/interfaces/IERC4626.sol";
import {IERC20Partial} from "@tokens/interfaces/IERC20Partial.sol";
import {TokenId} from "@types/TokenId.sol";
import {PositionBalance} from "@types/PositionBalance.sol";
import {PanopticDataSeamBase} from "./PanopticDataSeamBase.sol";

/// @dev BTT spec: test/instrument/PanopticDataSeam.fork.tree
/// @notice FORK-03 swap seam: the borrowed Panoptic V2 pool is reached ONLY through `IPanopticData`
///         and collateral is deposited ONLY through `IERC4626` ct0/ct1 — this file imports NEITHER
///         a `panoptic-borrowed` concrete NOR the `PanopticV2DeployHelper` (both deploy details live
///         behind `PanopticDataSeamBase`). Mints ONE position via `dispatch` (PositionBalance==0 ⇒
///         mint), reads `PositionBalance[]` length 1 via `getAccumulatedFeesAndPositionsData`, then
///         dispatches size 0 (≠ stored ⇒ burn) — all through the interface.
contract PanopticDataSeammintBurnThroughInterface is PanopticDataSeamBase {
    /// @dev bulloak branch fn (un-renamed, mn-B) — delegates to the single FORK-03 proof so the BTT
    ///      mapping stays 1:1 while one test exercises the whole deploy→mint→read→burn seam flow.
    function test_GivenABorrowedPanopticPoolDeployedViaTheFactoryChoreographyReferencedOnlyAsIPanopticDataWithCollateralViaIERC4626(
    ) external {
        test_mintBurn_single_position_through_IPanopticData();
    }

    function test_WhenOnePositionIsMintedViaIPanopticDataDispatchWithStoredBalanceZeroSoItMints() external {
        test_mintBurn_single_position_through_IPanopticData();
    }

    function test_WhenTheSamePositionIsDispatchedWithSizeZeroSoItBurns() external {
        test_mintBurn_single_position_through_IPanopticData();
    }

    /// @notice FORK-03 runtime proof (07-VALIDATION --match-test). SPECIFY stage: failing stub.
    function test_mintBurn_single_position_through_IPanopticData() public {
        // ct0/ct1 are IERC4626 (B-1: never the concrete CollateralTracker). Filled in Task 3.
        IPanopticData pano = IPanopticData(deployedPool);
        IERC4626 ct0_ = ct0;
        IERC4626 ct1_ = ct1;
        IERC20Partial t0 = IERC20Partial(token0);
        IERC20Partial t1 = IERC20Partial(token1);
        TokenId[] memory _l = new TokenId[](1);
        PositionBalance[] memory _b;
        pano; ct0_; ct1_; t0; t1; _l; _b; // silence unused at SPECIFY
        revert("not implemented (SPECIFY stage)");
    }
}
