// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {LongGammaWrapperBase} from "./LongGammaWrapperBase.sol";
import {LongGammaWrapper} from "../../src/instrument/LongGammaWrapper.sol";
import {IPanopticData} from "../../src/instrument/interfaces/IPanopticData.sol";
import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";
import {TokenId} from "@types/TokenId.sol";
import {PositionBalance} from "@types/PositionBalance.sol";

/// @dev BTT spec: test/instrument/LongGammaWrapper.open.fork.tree
/// @notice WRAP-01 (wrapper-owns-position custody) + WRAP-02 (long mint) proof on the Base fork.
///         A user deposits upfront collateral; the WRAPPER owns the 4626 shares (`balanceOf(wrapper)>0`)
///         and the user owns none (`balanceOf(user)==0`); a long-gamma `isLong=1` position is minted
///         through `IPanopticData` against the seeded same-chunk seller short; custody is proven via
///         `numberOfLegs(wrapper)>0` + a length-1 `PositionBalance[]` with `positionSize>0` (there is NO
///         `positionIdList(address)` getter — RESEARCH correction #1). SWAP SEAM: this file imports
///         NEITHER a borrowed-Panoptic concrete contract NOR the deploy helper (both live behind the
///         base); the pool is reached ONLY via `IPanopticData`, collateral ONLY via `IERC20`/`IERC4626`.
contract LongGammaWrapperOpen is LongGammaWrapperBase {
    // ------------------------------------------------------------------
    // bulloak branch fns (un-renamed) — each tree leaf delegates to the
    // shared open-flow proof so the BTT mapping stays 1:1, exactly as
    // PanopticDataSeam.fork.t.sol does.
    // ------------------------------------------------------------------

    function test_WhenAUserDepositsUpfrontCollateralAndTheWrapperOpensALong() external {
        test_open_wrapperOwnsCollateralAndPosition();
    }

    function test_WhenDepositIsCalledASecondTimeAfterThePositionIsOpen() external {
        test_open_secondDepositReverts();
    }

    // ------------------------------------------------------------------
    // Shared helpers
    // ------------------------------------------------------------------

    /// @dev Deploy the wrapper against the seam handles, fund + approve a depositor distinct from the
    ///      stored beneficiary, and open the long. Returns the wrapper and the two distinct addresses.
    function _openWrapper() internal returns (LongGammaWrapper wrapper, address depositor, address beneficiary) {
        depositor = makeAddr("depositor");
        beneficiary = makeAddr("beneficiary"); // the stored `user` (!= deployer, != depositor)

        wrapper = new LongGammaWrapper(IPanopticData(deployedPool), ct0, ct1);

        // over-funded collateral cap (P3): the long mint backs LONG_SIZE notional in BOTH tokens'
        // native decimals (cCOP 18dp, USDC 6dp), so the deposit must comfortably exceed the position
        // notional on the 18-dp side — mirror the base's `type(uint104).max` over-fund (NotEnoughTokens
        // otherwise: the 18-dp tracker needs >=1e18 collateral to back a 1-ether long, P3 cap).
        uint256 amt = uint256(type(uint104).max);
        deal(token0, depositor, type(uint104).max);
        deal(token1, depositor, type(uint104).max);

        vm.startPrank(depositor);
        IERC20(token0).approve(address(wrapper), type(uint256).max);
        IERC20(token1).approve(address(wrapper), type(uint256).max);
        int24[3] memory limits = [TICK_LIMIT_LOW, TICK_LIMIT_HIGH, EFF_LIQ_LIMIT];
        wrapper.deposit(beneficiary, amt, amt, _longTokenId(), LONG_SIZE, limits);
        vm.stopPrank();
    }

    // ------------------------------------------------------------------
    // WRAP-01 / WRAP-02 proofs
    // ------------------------------------------------------------------

    /// @notice WRAP-01: the wrapper owns the collateral shares + the Panoptic position; the user owns
    ///         nothing. Custody proven via numberOfLegs(wrapper)>0 + a length-1 PositionBalance[] with
    ///         positionSize>0 (no positionIdList getter exists).
    function test_open_wrapperOwnsCollateralAndPosition() public {
        (LongGammaWrapper wrapper,, address beneficiary) = _openWrapper();

        // --- WRAP-01 custody assertions ---
        assertGt(IERC20(address(ct0)).balanceOf(address(wrapper)), 0, "wrapper owns ct0 shares");
        assertGt(IERC20(address(ct1)).balanceOf(address(wrapper)), 0, "wrapper owns ct1 shares");
        assertEq(IERC20(address(ct0)).balanceOf(beneficiary), 0, "user owns no ct0 shares");
        assertEq(IERC20(address(ct1)).balanceOf(beneficiary), 0, "user owns no ct1 shares");

        assertGt(IPanopticData(deployedPool).numberOfLegs(address(wrapper)), 0, "wrapper has open legs");

        TokenId[] memory list = new TokenId[](1);
        list[0] = _longTokenId();
        (,, PositionBalance[] memory bals,,) =
            IPanopticData(deployedPool).getFullPositionsData(address(wrapper), true, list);
        assertEq(bals.length, 1, "exactly one wrapper position");
        assertGt(bals[0].positionSize(), 0, "the position is the wrapper's");

        // --- state + ledger ---
        assertEq(uint8(wrapper.state()), uint8(1), "wrapper is Open"); // State.Open
        assertEq(wrapper.user(), beneficiary, "stored user is the beneficiary");
    }

    /// @notice WRAP-02: the stored position is a LONG (isLong(0)==1). The long was minted through
    ///         IPanopticData against the seeded seller short (else NotEnoughLiquidityInChunk()).
    function test_open_mintsLongGamma() public {
        (LongGammaWrapper wrapper,,) = _openWrapper();
        assertEq(wrapper.positionTokenId().isLong(0), 1, "stored position is long (isLong=1)");
        assertGt(IPanopticData(deployedPool).numberOfLegs(address(wrapper)), 0, "long minted (legs open)");
    }

    /// @notice One-shot: a second deposit after the position is open reverts WrongState.
    function test_open_secondDepositReverts() public {
        (LongGammaWrapper wrapper, address depositor, address beneficiary) = _openWrapper();

        // one-shot: the WrongState revert fires on the state check BEFORE any transfer, so the amounts
        // here are immaterial — assert the wrapper refuses a second open.
        uint256 amt = uint256(type(uint104).max);
        int24[3] memory limits = [TICK_LIMIT_LOW, TICK_LIMIT_HIGH, EFF_LIQ_LIMIT];

        vm.prank(depositor);
        vm.expectRevert(LongGammaWrapper.WrongState.selector);
        wrapper.deposit(beneficiary, amt, amt, _longTokenId(), LONG_SIZE, limits);
    }
}
