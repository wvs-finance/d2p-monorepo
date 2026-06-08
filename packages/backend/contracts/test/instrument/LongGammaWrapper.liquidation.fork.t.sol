// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {LongGammaWrapperBase} from "./LongGammaWrapperBase.sol";
import {LongGammaWrapper} from "../../src/instrument/LongGammaWrapper.sol";
import {IPanopticData} from "../../src/instrument/interfaces/IPanopticData.sol";
import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";
import {TokenId} from "@types/TokenId.sol";
import {LeftRightUnsigned} from "@types/LeftRight.sol";

/// @dev BTT spec: test/instrument/LongGammaWrapper.liquidation.fork.tree
/// @notice WRAP-03 involuntary branch #3 — liquidation via `dispatchFrom`. A liquidator liquidates the wrapper
///         with an EMPTY final list (`finalLen == 0`) while the account is INSOLVENT at all 4 oracle ticks →
///         `_liquidate` (PanopticPool L1482) burns ALL positions → `numberOfLegs(wrapper) → 0` → TERMINAL
///         CLOSE. The residual FLOORS at zero when the surviving collateral is wiped, and the wrapper NEVER
///         pays more than it HELD pre-claim (structurally enforced by settleBurn's NotEnoughTokens).
///
///         INSOLVENCY MECHANISM (highest-risk fork task; 08-VALIDATION Manual-Only permits a vm-assisted
///         setup): a SINGLE large adverse swap does NOT work — it trips `StaleOracle` (PanopticPool L1388,
///         `|currentTick - twapTick| > tickDeltaLiquidation`) BEFORE liquidation is reachable. This test uses
///         the PREFERRED first-class mechanism: `vm.store` shrinks the wrapper's CollateralTracker SHARE
///         balance on BOTH ct0 AND ct1 (a one-sided shrink may not flip solvent==0 at all 4 ticks), at the
///         DERIVED `balanceOf` mapping slot — slot 1, NOT slot 0 which is `_internalSupply` (ERC20Minimal
///         storage layout, confirmed via `forge inspect CollateralTracker storage-layout` + probe-and-verify).
///         No price moves, so no tick moves, so no StaleOracle — `_checkSolvencyAtTicks` returns 0 at all 4
///         ticks because `convertToAssets(balanceOf(wrapper)) ≈ 0`.
///         TEST-ONLY: consumes the Plan-05 `_reconcile()` involuntary-close detection; edits NO src.
contract LongGammaWrapperLiquidation is LongGammaWrapperBase {
    /// @dev `balanceOf` mapping storage index on the CollateralTracker (ERC20Minimal). DERIVED, not guessed:
    ///      `forge inspect CollateralTracker storage-layout` reports `_internalSupply` at slot 0 and `balanceOf`
    ///      at slot 1 — so BAL_SLOT = 1 (slot 0 would corrupt total-supply accounting, NOT the wrapper's
    ///      balance). The derivation is re-confirmed at runtime by probe-and-verify (read back balanceOf after
    ///      the store) in `_shrinkCollateral` below.
    uint256 internal constant BAL_SLOT = 1;

    // ------------------------------------------------------------------
    // bulloak branch fns (un-renamed) — delegate to the shared proof.
    // ------------------------------------------------------------------

    function test_WhenTheWrapperIsInsolventAtAllFourTicksAndALiquidatorCallsDispatchFromWithAnEmptyFinalList()
        external
    {
        test_liquidation_residualFloorZero();
    }

    // ------------------------------------------------------------------
    // Shared helpers
    // ------------------------------------------------------------------

    function _openWrapper(address user, uint256 deposit0, uint256 deposit1)
        internal
        returns (LongGammaWrapper wrapper)
    {
        address depositor = makeAddr("depositor");
        wrapper = new LongGammaWrapper(IPanopticData(deployedPool), ct0, ct1);

        deal(token0, depositor, type(uint104).max);
        deal(token1, depositor, type(uint104).max);

        vm.startPrank(depositor);
        IERC20(token0).approve(address(wrapper), type(uint256).max);
        IERC20(token1).approve(address(wrapper), type(uint256).max);
        int24[3] memory limits = [TICK_LIMIT_LOW, TICK_LIMIT_HIGH, EFF_LIQ_LIMIT];
        wrapper.deposit(user, deposit0, deposit1, _longTokenId(), LONG_SIZE, limits);
        vm.stopPrank();
    }

    /// @dev Shrink the wrapper's CollateralTracker SHARE balance on BOTH ct0 AND ct1 to a near-zero target via
    ///      `vm.store` at the DERIVED `balanceOf` slot (slot 1 = keccak(wrapper, BAL_SLOT)), so
    ///      `_checkSolvencyAtTicks` → isAccountSolvent → assetsAndInterest → convertToAssets(balanceOf) returns
    ///      ~0 at ALL 4 ticks WITHOUT moving price (no tick moves → no StaleOracle bound, PanopticPool L1388).
    ///      `balanceOf` holds SHARES, so the target is computed via `convertToShares(1)`. The writes are
    ///      probe-and-verified (read back balanceOf) which also guards the slot derivation.
    function _shrinkCollateral(address wrapper) internal {
        uint256 tinyShares0 = ct0.convertToShares(1); // near-zero SHARE balance (balanceOf holds shares)
        uint256 tinyShares1 = ct1.convertToShares(1);
        bytes32 slot = keccak256(abi.encode(wrapper, BAL_SLOT)); // mapping(address=>uint256) at BAL_SLOT
        vm.store(address(ct0), slot, bytes32(tinyShares0)); // shrink ct0 holdings
        vm.store(address(ct1), slot, bytes32(tinyShares1)); // shrink ct1 holdings — BOTH (one-sided may not
            // flip solvent==0 at all 4 ticks)

        // probe-and-verify the writes landed at the DERIVED slot (also guards the slot-0 _internalSupply hazard).
        assertLe(IERC20(address(ct0)).balanceOf(wrapper), tinyShares0, "ct0 balance shrunk via vm.store");
        assertLe(IERC20(address(ct1)).balanceOf(wrapper), tinyShares1, "ct1 balance shrunk via vm.store");
    }

    // ------------------------------------------------------------------
    // WRAP-03 liquidation: closes + residual floors at zero
    // ------------------------------------------------------------------

    /// @notice Drive the wrapper insolvent (vm.store collateral-shrink on BOTH CTs at the derived balanceOf
    ///         slot), liquidate via `dispatchFrom` with an empty final list (numberOfLegs → 0), reconcile
    ///         (Open→Closed via the Plan-05 `_reconcile`), and claim a FLOORED (>=0) residual without
    ///         reverting — the wrapper never pays more than it HELD pre-claim.
    function test_liquidation_residualFloorZero() public {
        address user = makeAddr("beneficiary");
        // Thin-ish but minting deposit (the over-funded cap still mints the 1-ether long); the vm.store shrink
        // below is what flips solvency, not the deposit size.
        LongGammaWrapper wrapper = _openWrapper(user, uint256(type(uint104).max), uint256(type(uint104).max));
        assertGt(IPanopticData(deployedPool).numberOfLegs(address(wrapper)), 0, "wrapper opened with legs");

        // DRIVE INSOLVENCY — concrete first-class vm.store mechanism (no price move → no StaleOracle).
        _shrinkCollateral(address(wrapper));

        // LIQUIDATE: dispatchFrom with finalList length 0 (and the account insolvent at all ticks). The
        // liquidator's `positionIdListFrom` is its OWN list — empty (it owns no positions).
        TokenId[] memory wrap1 = new TokenId[](1);
        wrap1[0] = wrapper.positionTokenId();
        TokenId[] memory emptyFinal = new TokenId[](0);
        TokenId[] memory emptyFrom = new TokenId[](0); // liquidator owns no positions
        vm.prank(makeAddr("liquidator"));
        IPanopticData(deployedPool).dispatchFrom(emptyFrom, address(wrapper), wrap1, emptyFinal, LeftRightUnsigned.wrap(0));

        // liquidation CLOSES all positions.
        assertEq(IPanopticData(deployedPool).numberOfLegs(address(wrapper)), 0, "liquidation closed all legs");

        // reconcile (promotes Open→Closed via the involuntary-close detection from 08-05) + claim.
        _closeSellerShort();
        wrapper.syncResidual();
        assertEq(uint8(wrapper.state()), uint8(2), "Closed after involuntary liquidation"); // State.Closed

        // snapshot surviving BEFORE the claim (the correct never-overpay reference — a post-claim read is wrong
        // and `paid <= surv + paid` is a tautology).
        uint256 survBeforeClaim0 = ct0.convertToAssets(IERC20(address(ct0)).balanceOf(address(wrapper)));
        uint256 survBeforeClaim1 = ct1.convertToAssets(IERC20(address(ct1)).balanceOf(address(wrapper)));
        uint256 u0pre = IERC20(token0).balanceOf(user);
        uint256 u1pre = IERC20(token1).balanceOf(user);
        wrapper.claimResidual(); // does NOT revert even when surviving is wiped (cap-aware + dust-guarded)
        uint256 u0post = IERC20(token0).balanceOf(user);
        uint256 u1post = IERC20(token1).balanceOf(user);

        // residual FLOORS at zero when surviving is wiped — and the wrapper NEVER pays more than it HELD.
        assertLe(u0post - u0pre, survBeforeClaim0 + 1, "paid0 <= surviving the wrapper held pre-claim (never overpays)");
        assertLe(u1post - u1pre, survBeforeClaim1 + 1, "paid1 <= surviving the wrapper held pre-claim (never overpays)");
        // the load-bearing assertions: numberOfLegs==0 (above), state==Closed (above), claimResidual did NOT
        // revert (reached here), and residual_i == max(surviving_i - cost_i, 0) >= 0 (floors at 0 under loss).
        assertEq(uint8(wrapper.state()), uint8(3), "state -> Claimed (claimResidual did not revert)");
    }
}
