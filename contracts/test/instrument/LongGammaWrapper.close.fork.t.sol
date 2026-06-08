// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {LongGammaWrapperBase} from "./LongGammaWrapperBase.sol";
import {LongGammaWrapper} from "../../src/instrument/LongGammaWrapper.sol";
import {IPanopticData} from "../../src/instrument/interfaces/IPanopticData.sol";
import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";

/// @dev BTT spec: test/instrument/LongGammaWrapper.close.fork.tree
/// @notice WRAP-04 (voluntary exit) close-half proof on the Base fork. `close()` is the user-gated
///         voluntary burn — the ONLY voluntary exit (the position is `msg.sender`-keyed to the wrapper),
///         closing the trapped-funds path (review BLOCKER N1 / ROADMAP SC-5). It dispatches a size-0 burn
///         (`false`/`0` voluntary args), drives `numberOfLegs(wrapper) → 0`, and transitions Open → Closed.
///         A non-`user` caller reverts `NotUser`; calling `close()` off the Open state reverts `WrongState`.
///         SWAP SEAM: this file imports NEITHER a borrowed-Panoptic concrete NOR the deploy helper (both live
///         behind the base); the pool is reached ONLY via `IPanopticData`, collateral ONLY via `IERC20`.
contract LongGammaWrapperClose is LongGammaWrapperBase {
    // ------------------------------------------------------------------
    // bulloak branch fns (un-renamed) — each tree leaf delegates to the
    // matching proof so the BTT mapping stays 1:1.
    // ------------------------------------------------------------------

    function test_WhenTheStoredUserCallsCloseOnAnOpenPosition() external {
        test_close_userBurnsToClosed();
    }

    function test_WhenANonUserAddressCallsClose() external {
        test_close_nonUserReverts();
    }

    function test_WhenCloseIsCalledWhileNotOpen() external {
        test_close_preOpenReverts();
    }

    // ------------------------------------------------------------------
    // Shared open helper
    // ------------------------------------------------------------------

    /// @dev Deploy the wrapper against the seam handles and open the long via the LOCKED 6-arg deposit.
    ///      Returns the wrapper and the stored `user` (the beneficiary, distinct from the depositor).
    function _openWrapper() internal returns (LongGammaWrapper wrapper, address user) {
        user = makeAddr("beneficiary");
        address depositor = makeAddr("depositor");

        wrapper = new LongGammaWrapper(IPanopticData(deployedPool), ct0, ct1);

        // over-funded collateral cap (P3): the 18-dp tracker needs >=1e18 to back the 1-ether long.
        uint256 amt = uint256(type(uint104).max);
        deal(token0, depositor, type(uint104).max);
        deal(token1, depositor, type(uint104).max);

        vm.startPrank(depositor);
        IERC20(token0).approve(address(wrapper), type(uint256).max);
        IERC20(token1).approve(address(wrapper), type(uint256).max);
        int24[3] memory limits = [TICK_LIMIT_LOW, TICK_LIMIT_HIGH, EFF_LIQ_LIMIT];
        wrapper.deposit(user, amt, amt, _longTokenId(), LONG_SIZE, limits);
        vm.stopPrank();
    }

    // ------------------------------------------------------------------
    // Proofs
    // ------------------------------------------------------------------

    /// @notice The stored `user` voluntarily burns the long: dispatch size-0 (false/0), numberOfLegs → 0,
    ///         state Open → Closed (== 2).
    function test_close_userBurnsToClosed() public {
        (LongGammaWrapper wrapper, address user) = _openWrapper();
        assertGt(IPanopticData(deployedPool).numberOfLegs(address(wrapper)), 0, "open before close");

        vm.prank(user);
        wrapper.close();

        assertEq(IPanopticData(deployedPool).numberOfLegs(address(wrapper)), 0, "numberOfLegs -> 0 after burn");
        assertEq(uint8(wrapper.state()), uint8(2), "state Open -> Closed"); // State.Closed
    }

    /// @notice A non-`user` address calling `close()` reverts `NotUser` (close is user-gated).
    function test_close_nonUserReverts() public {
        (LongGammaWrapper wrapper,) = _openWrapper();
        vm.prank(makeAddr("intruder"));
        vm.expectRevert(LongGammaWrapper.NotUser.selector);
        wrapper.close();
    }

    /// @notice Calling `close()` on a fresh (Uninitialized, no deposit) wrapper reverts `WrongState`.
    /// @dev The user-gate (`NotUser`) is checked FIRST, so the caller must be the stored `user` to reach the
    ///      state check. A fresh wrapper has `user == address(0)`, so prank as `address(0)` to pass the gate
    ///      and surface the `WrongState` (state == Uninitialized != Open).
    function test_close_preOpenReverts() public {
        LongGammaWrapper fresh = new LongGammaWrapper(IPanopticData(deployedPool), ct0, ct1);
        vm.prank(address(0)); // stored user is address(0) on a fresh wrapper ⇒ passes the NotUser gate
        vm.expectRevert(LongGammaWrapper.WrongState.selector);
        fresh.close();
    }
}
