// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {IERC4626} from "@openzeppelin/contracts/interfaces/IERC4626.sol";

/// @title PanopticDataSeamBase — the §M-3 deploy-isolation base for the FORK-03 seam test.
/// @notice This base is where ALL deploy coupling lives so the seam test file (`PanopticDataSeam.fork.t.sol`)
///         imports NEITHER `panoptic-borrowed` NOR `PanopticV2DeployHelper`. It runs the factory
///         choreography (via PanopticV2DeployHelper, wired in Task 3) and hands the seam test back
///         ONLY seam-safe types: the deployed pool as a plain `address` (consumed as `IPanopticData`),
///         ct0/ct1 as `IERC4626` (B-1), the token/ccop addresses as plain `address`, and the `poolId`
///         as a plain `uint64` (so the seam test can build a TokenId without importing the concrete pool).
/// @dev SPECIFY stage: state declared, `setUp` is a failing stub. Task 3 wires the real helper.
abstract contract PanopticDataSeamBase is Test {
    // --- seam-safe handles handed to the seam test (B-1 / M-3) ---
    address internal deployedPool; // consumed as IPanopticData
    IERC4626 internal ct0; // collateral for currency0 (never the concrete CollateralTracker)
    IERC4626 internal ct1; // collateral for currency1
    address internal token0;
    address internal token1;
    address internal ccop;
    uint64 internal poolId; // from the helper, for building the TokenId without a concrete import
    int24 internal tickSpacing;

    function setUp() public virtual {
        revert("PanopticDataSeamBase: setUp not implemented (SPECIFY stage)");
    }
}
