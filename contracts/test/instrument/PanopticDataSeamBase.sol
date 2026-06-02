// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {IERC4626} from "@openzeppelin/contracts/interfaces/IERC4626.sol";
import {PanopticV2DeployHelper} from "./helpers/PanopticV2DeployHelper.sol";

/// @title PanopticDataSeamBase — the §M-3 deploy-isolation base for the FORK-03 seam test.
/// @notice This base is where ALL deploy coupling lives so the seam test file (`PanopticDataSeam.fork.t.sol`)
///         imports NEITHER `panoptic-borrowed` NOR `PanopticV2DeployHelper`. It forks Base, runs the
///         factory choreography via `PanopticV2DeployHelper`, and hands the seam test back ONLY seam-safe
///         types: the deployed pool as a plain `address` (consumed as `IPanopticData`), ct0/ct1 as
///         `IERC4626` (B-1), the token/ccop addresses as plain `address`, and the `poolId` as a plain
///         `uint64` (so the seam test can build a TokenId without importing the concrete pool).
abstract contract PanopticDataSeamBase is Test {
    // --- Pinned Base fork block (M-4: reused from the Plan 03/04 harness) ---
    uint256 internal constant BASE_FORK_BLOCK = 46700000;

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
        // Fork Base FIRST — the helper deploys against the live PoolManager (0x498581…2b2b).
        vm.createSelectFork(vm.rpcUrl("base"), BASE_FORK_BLOCK);

        // Run the §B+§D factory choreography behind the helper; capture ONLY seam-safe handles.
        PanopticV2DeployHelper helper = new PanopticV2DeployHelper();
        PanopticV2DeployHelper.Deployed memory d = helper.deployPanopticV2();

        deployedPool = d.pool;
        ct0 = d.ct0;
        ct1 = d.ct1;
        token0 = d.token0;
        token1 = d.token1;
        ccop = d.ccop;
        poolId = d.poolId;
        tickSpacing = d.tickSpacing;
    }
}
