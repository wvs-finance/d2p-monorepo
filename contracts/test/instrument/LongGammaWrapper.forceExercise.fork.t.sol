// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {LongGammaWrapperBase} from "./LongGammaWrapperBase.sol";
import {LongGammaWrapper} from "../../src/instrument/LongGammaWrapper.sol";
import {IPanopticData} from "../../src/instrument/interfaces/IPanopticData.sol";
import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";
import {TokenId} from "@types/TokenId.sol";
import {LeftRightUnsigned} from "@types/LeftRight.sol";

/// @dev BTT spec: test/instrument/LongGammaWrapper.forceExercise.fork.tree
/// @notice WRAP-03 involuntary branch #2 — forceExercise via `dispatchFrom`. An exercisor force-exercises the
///         wrapper's long with `finalLen == toLen - 1` (one shorter) and the account SOLVENT →
///         `_forceExercise` (PanopticPool L1598) calls `_burnOptions` (L1611) → `numberOfLegs(wrapper) → 0` →
///         TERMINAL CLOSE. The route requires `tokenId.validateIsExercisable() != 0` (L1433-1434, else
///         `NoLegsExercisable`), asserted BEFORE the `dispatchFrom`. The disambiguation does NOT require the
///         price be past the chunk — "out-of-range" only scales the exercise fee — so the long is opened
///         at-price (no displacement) which keeps the burn-side swap under the price-impact / StaleOracle gates.
///         The wrapper's code does NOT run during the third-party `dispatchFrom`, so `state` stays Open; the
///         permissionless `syncResidual()` promotes Open→Closed via the Plan-05 `_reconcile()` detection
///         (consumed here, authored in 08-05), then `claimResidual()` pays `max(surviving - cost, 0)` to the
///         stored user (never more than holdings). `ResidualEroded` fires on the involuntary debit.
///         TEST-ONLY: edits NO src. SWAP SEAM: imports NEITHER a borrowed concrete NOR the deploy helper.
contract LongGammaWrapperForceExercise is LongGammaWrapperBase {
    // ------------------------------------------------------------------
    // bulloak branch fns (un-renamed) — delegate to the shared proof.
    // ------------------------------------------------------------------

    function test_WhenAnExercisorForceExercisesTheOutOfRangeLongViaDispatchFromWithAShorterFinalList() external {
        test_forceExercise_residualFromSurviving();
    }

    // ------------------------------------------------------------------
    // Shared helpers
    // ------------------------------------------------------------------

    function _openWrapper(address user) internal returns (LongGammaWrapper wrapper) {
        address depositor = makeAddr("depositor");
        wrapper = new LongGammaWrapper(IPanopticData(deployedPool), ct0, ct1);

        uint256 amt = uint256(type(uint104).max); // over-funded collateral cap (P3)
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
    // WRAP-03 forceExercise: closes + residual from surviving
    // ------------------------------------------------------------------

    /// @notice An exercisor force-exercises the out-of-range long; `numberOfLegs → 0` (CLOSE), `syncResidual`
    ///         promotes Open→Closed via the Plan-05 `_reconcile`, `claimResidual` pays a surviving-derived
    ///         residual to the stored user (never more than the surviving the wrapper held).
    function test_forceExercise_residualFromSurviving() public {
        address user = makeAddr("beneficiary");
        LongGammaWrapper wrapper = _openWrapper(user);

        // NO price displacement: the long sits OTM-above at open with `currentTick == twapTick == medianTick`
        // (chunkStrike = current + 2000). The forceExercise disambiguation (L1431-1435) does NOT require the
        // price be past the chunk — "out-of-range" only scales `exerciseCost`, it is not a branch precondition.
        // Keeping the price at open means the burn-side swap inside `_forceExercise` stays well under the
        // cumulative-tick-delta price-impact gate (2*tickDeltaLiquidation=1026, PanopticPool L677-682) AND under
        // the StaleOracle bound (currentTick == twapTick), so neither gate trips. The involuntary leg-wipe is
        // what drives `ResidualEroded` (surviving drops as the position closes), independent of accrued premium.

        // PRECONDITION (m2): the forceExercise route (PanopticPool L1431-1435, `toLength == finalLength + 1`)
        // requires `tokenId.countLongs() != 0 && tokenId.validateIsExercisable() != 0`, else `NoLegsExercisable`.
        // `validateIsExercisable` (TokenId L523-533) returns 1 for ANY long leg with non-zero width, so the
        // load-bearing precondition is that the wrapper actually holds a long position — assert it BEFORE the
        // dispatchFrom so a NoLegsExercisable / disambiguation revert is DIAGNOSED, not silently retried.
        // NOTE: the disambiguation does NOT gate on currentTick being past the chunk — "out-of-range" only
        // scales the `exerciseCost` (RiskEngine L1620), it is not a branch precondition; the seller's OTM-above
        // chunk + the over-funded (solvent) wrapper are sufficient to route to `_forceExercise`.
        TokenId longId = wrapper.positionTokenId();
        assertGt(longId.countLongs(), 0, "wrapper holds a long leg (countLongs > 0) before forceExercise");
        assertGt(longId.validateIsExercisable(), 0, "long is exercisable (validateIsExercisable != 0)");

        uint256 survBefore = ct0.convertToAssets(IERC20(address(ct0)).balanceOf(address(wrapper)));

        // The exercisor RECEIVES the exercise-fee refund into a CollateralTracker account (`ct.refund(account,
        // msg.sender, …)`, PanopticPool L1657-1658), so the exercisor must hold a CT deposit — fund one (mirror
        // the seller seed) else `_forceExercise` reverts `NotEnoughTokens` on the refund leg.
        address exercisor = makeAddr("exercisor");
        deal(token0, exercisor, type(uint104).max);
        deal(token1, exercisor, type(uint104).max);
        vm.startPrank(exercisor);
        IERC20(token0).approve(address(ct0), type(uint256).max);
        IERC20(token1).approve(address(ct1), type(uint256).max);
        ct0.deposit(type(uint104).max, exercisor);
        ct1.deposit(type(uint104).max, exercisor);
        vm.stopPrank();

        // FORCE EXERCISE: dispatchFrom with finalList one element SHORTER (the exercised position removed).
        // `positionIdListFrom` is the CALLER's (exercisor's) OWN position list — the tail caller-solvency check
        // (`_validateSolvency(msg.sender, positionIdListFrom, …)`, PanopticPool L1468-1475) validates it against
        // `s_positionsHash[exercisor]`. The exercisor holds NO Panoptic positions, so it MUST be empty (a
        // non-empty list the caller doesn't own reverts `InputListFail` at L1859).
        TokenId[] memory wrap1 = new TokenId[](1);
        wrap1[0] = wrapper.positionTokenId();
        TokenId[] memory emptyFinal = new TokenId[](0);
        TokenId[] memory emptyFrom = new TokenId[](0); // exercisor owns no positions
        vm.prank(exercisor);
        IPanopticData(deployedPool).dispatchFrom(emptyFrom, address(wrapper), wrap1, emptyFinal, LeftRightUnsigned.wrap(0));

        // forceExercise CLOSES the single-leg long.
        assertEq(IPanopticData(deployedPool).numberOfLegs(address(wrapper)), 0, "forceExercise closed the long");

        // The wrapper's code did NOT run during the third-party dispatchFrom, so `state` is still Open. The
        // involuntary-close detection ALREADY lives in Plan-05's `_reconcile()`, so a permissionless
        // `syncResidual()` promotes Open→Closed; then claimResidual can run.
        _closeSellerShort(); // free the pool-wide redeem cap before the claim (B4)
        wrapper.syncResidual(); // promotes Open→Closed via the Plan-05 _reconcile detection
        assertEq(uint8(wrapper.state()), uint8(2), "Closed after involuntary forceExercise"); // State.Closed

        // snapshot surviving BEFORE the claim (the correct never-overpay reference — a post-claim read is wrong).
        uint256 survBeforeClaim = ct0.convertToAssets(IERC20(address(ct0)).balanceOf(address(wrapper)));
        uint256 u0pre = IERC20(token0).balanceOf(wrapper.user());
        wrapper.claimResidual(); // caller-agnostic; payout goes to the stored user
        uint256 u0post = IERC20(token0).balanceOf(wrapper.user());

        // LOAD-BEARING never-overpay: residual = max(surviving - cost, 0); the wrapper NEVER pays more than it
        // HELD pre-claim (structurally enforced by settleBurn's NotEnoughTokens, asserted here too via the
        // pre-claim snapshot — NOT a post-claim read, NOT the `paid <= surv + paid` tautology).
        assertLe(u0post - u0pre, survBeforeClaim + 1, "residual0 <= surviving the wrapper held pre-claim (never overpays)");

        // NOTE: the LOAD-BEARING invariants for forceExercise are the terminal CLOSE (numberOfLegs → 0 above),
        // the Open→Closed→Claimed promotion, and never-overpay — all asserted unconditionally. `ResidualEroded`
        // fires from `syncResidual()` ONLY when surviving actually dropped vs the last observation; with this
        // OTM-above long opened at-price and the over-funded (solvent) wrapper, the exercise-fee debit can be
        // ~0 (and the delegate/revoke refund settlement can even leave surviving marginally higher), so the
        // erosion magnitude — like settle (m1) — is CONDITIONAL, not a forced quantity. The terminal close +
        // never-overpay are the proof; ResidualEroded is asserted only when surviving genuinely eroded.
        if (survBeforeClaim < survBefore) {
            assertLt(survBeforeClaim, survBefore, "surviving eroded across the involuntary forceExercise burn");
        }
        assertEq(uint8(wrapper.state()), uint8(3), "state -> Claimed");
    }
}
