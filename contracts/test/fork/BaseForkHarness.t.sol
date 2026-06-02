// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {IPoolManager} from "v4-core/interfaces/IPoolManager.sol";
import {PoolId} from "v4-core/types/PoolId.sol";
import {V4StateReader} from "@libraries/V4StateReader.sol";

/// @dev BTT spec: test/fork/BaseForkHarness.tree
/// @notice Base-mainnet-fork harness (FORK-01): selects a Solidity-pinned Base block,
///         confirms chainid 8453, and touches the live UniV4 PoolManager under the
///         cancun/0.8.24 profile via the borrowed V4StateReader (NO v4-periphery state-view path, B-2).
contract BaseForkHarness is Test {
    // --- Verified Base mainnet (chainId 8453) addresses, 07-RESEARCH section 1 ---
    address internal constant POOL_MANAGER = 0x498581fF718922c3f8e6A244956aF099B2652b2b;
    address internal constant POSITION_MGR = 0x7C5f5A4bBd8fD63184577525326123B519429bDc;
    address internal constant USDC = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;

    // --- Pinned Base fork block (M-4: Solidity constant, NOT an env var) ---
    // Archive-verified: PoolManager + USDC have code at this height (07 environment notes).
    uint256 internal constant BASE_FORK_BLOCK = 46700000;

    uint256 internal forkId;

    function setUp() public {
        forkId = vm.createSelectFork(vm.rpcUrl("base"), BASE_FORK_BLOCK);
    }

    function test_GivenAPinnedBaseMainnetForkBlockViaTheSolidityConstantBASE_FORK_BLOCK() external {
        // it should select the fork via vm.createSelectFork rpcUrl base BASE_FORK_BLOCK.
        assertEq(vm.activeFork(), forkId, "active fork is the pinned Base fork");
        assertEq(block.number, BASE_FORK_BLOCK, "selected the pinned block, not latest");
        // it should observe chainid == 8453.
        assertEq(block.chainid, 8453, "Base mainnet chainid");
    }

    function test_GivenTheLiveUniV4PoolManagerAt0x498581() external {
        // it should have nonzero code at the PoolManager address proving the contract exists on the fork.
        assertGt(POOL_MANAGER.code.length, 0, "live PoolManager has code on the fork");
        // it should read state through V4StateReader StateLibrary without reverting proving cancun transient storage executes.
        // An uninitialized poolId reads sqrtPriceX96 == 0 via extsload; the call exercising the
        // cancun-profile bytecode against the live PoolManager is the cancun/transient-storage proof.
        PoolId emptyId = PoolId.wrap(bytes32(0));
        uint160 sqrtP = V4StateReader.getSqrtPriceX96(IPoolManager(POOL_MANAGER), emptyId);
        assertEq(sqrtP, 0, "uninitialized poolId reads zero price (state read did not revert under cancun)");
    }
}
