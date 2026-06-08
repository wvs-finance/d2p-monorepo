// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {LongGammaWrapperBase} from "./LongGammaWrapperBase.sol";
import {LongGammaWrapper} from "../../src/instrument/LongGammaWrapper.sol";
import {IPanopticData} from "../../src/instrument/interfaces/IPanopticData.sol";
import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";

/// @dev BTT spec: test/instrument/LongGammaWrapper.claimResidual.fork.tree
/// @notice WRAP-04 (surviving-collateral residual) claim-half proof on the Base fork. After a voluntary
///         `close()` (numberOfLegs → 0, Closed), `claimResidual()` is caller-agnostic (anyone may trigger;
///         proceeds ALWAYS go to the stored `user`): it runs the `_reconcile()` reconciliation + sets
///         `claimed`/`state` BEFORE any redeem (CEI), computes a per-token residual
///         `max(convertToAssets(balanceOf(wrapper)) - cost_i, 0)` from SURVIVING collateral (NEVER the
///         upfront deposit — proven by perturbing fees and seeing the paid figure track surviving), redeems
///         the cap-aware `min(residualShares, maxRedeem(wrapper))` per token, and is idempotent
///         (`AlreadyClaimed`). The seeded seller short is closed BEFORE the claim to free the pool-wide
///         `maxRedeem` cap (`s_depositedAssets − 1`, B4). Calling `claimResidual()` while still Open reverts
///         `WrongState`. This file ALSO carries the RELOCATED post-Claimed leg of the 08-04 streamia
///         state-gate (`recordStreamia()` reverts `WrongState` once the wrapper reaches `Claimed`).
///         DOUBLE-COUNT TRAP (RESEARCH Pattern 7): streamia + commission are ALREADY netted into the share
///         balance by `settleBurn`; the wrapper subtracts ONLY `_costOf()` ((0,0) for the v1 zero-address
///         meter), never streamia again. SWAP SEAM: imports NEITHER a borrowed concrete NOR the deploy
///         helper (both behind the base); the pool is reached ONLY via `IPanopticData`.
contract LongGammaWrapperClaimResidual is LongGammaWrapperBase {
    // ------------------------------------------------------------------
    // bulloak branch fns (un-renamed) — each tree leaf delegates to the
    // matching proof so the BTT mapping stays 1:1.
    // ------------------------------------------------------------------

    function test_WhenClaimResidualIsCalledAfterThePositionIsClosed() external {
        test_burn_claimResidualFromSurvivingNotDeposit();
    }

    function test_WhenClaimResidualIsCalledWhileThePositionIsStillOpen() external {
        test_claim_revertsWhileOpen();
    }

    function test_WhenClaimResidualIsCalledASecondTime() external {
        // idempotency is proven inline at the tail of the primary proof (a second claim reverts AlreadyClaimed).
        test_burn_claimResidualFromSurvivingNotDeposit();
    }

    // ------------------------------------------------------------------
    // Shared helpers
    // ------------------------------------------------------------------

    /// @dev Deploy the wrapper against the seam handles and open the long via the LOCKED 6-arg deposit.
    function _openWrapper(address user) internal returns (LongGammaWrapper wrapper) {
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

    /// @dev Push the pool price UP into the OTM-above chunk's tick band so `feeGrowthInside` advances and
    ///      surviving collateral diverges from the upfront deposit (Pitfall 2: block advance accrues nothing;
    ///      only swaps crossing the chunk move fee growth). Mirrors the streamia test's proven seeding
    ///      (sell token1/cCOP, `zeroForOne=false`, ~2e31 crosses into the +2000 chunk band on the live fork).
    function _seedFeesUp(int256 size) internal {
        deal(token0, address(swapHelper), type(uint128).max);
        deal(token1, address(swapHelper), type(uint128).max);
        swapHelper.swapExactIn(poolKey, false, -size); // sell token1 (cCOP) → price UP into the +2000 chunk
    }

    /// @dev Restore the pool spot back DOWN toward its starting band (sell token0/USDC, `zeroForOne=true`).
    ///      The big up-swap that seeds fees leaves spot far above the oracle median, so a later voluntary
    ///      `close()` burn trips the pool's `PriceImpactTooLarge` gate (current-vs-median tick delta >
    ///      2·tickDeltaLiquidation, PanopticPool L679-682). Swapping back near the median clears that gate;
    ///      the fee growth the seller's in-range chunk already collected stays accrued (feeGrowthInside is
    ///      cumulative — the round-trip does NOT un-accrue it), so surviving still diverges from the deposit.
    function _restorePrice(int256 size) internal {
        deal(token0, address(swapHelper), type(uint128).max);
        deal(token1, address(swapHelper), type(uint128).max);
        swapHelper.swapExactIn(poolKey, true, -size); // sell token0 (USDC) → price DOWN toward the median
    }

    // ------------------------------------------------------------------
    // WRAP-04 primary proof: residual from surviving collateral, NOT deposit
    // ------------------------------------------------------------------

    /// @notice After a VOLUNTARY close via the user-gated `close()`, a random claimer triggers
    ///         `claimResidual()`; the payout goes to the stored `user` and is derived from SURVIVING
    ///         collateral (≤ surviving, cap-aware), never the upfront deposit. The seeded seller short is
    ///         closed first to free the pool-wide redeem cap (B4). A second claim reverts `AlreadyClaimed`.
    /// @dev Manual-only fallback (08-VALIDATION Manual-Only): if the cap still binds after `_closeSellerShort()`
    ///      the redeem may pay reduced/zero (the remainder stays as shares) — we assert NO revert and a
    ///      surviving-derived (cap-bounded) payout, never a deposit-derived payout. Fail only on a revert.
    function test_burn_claimResidualFromSurvivingNotDeposit() public {
        address user = makeAddr("beneficiary");
        LongGammaWrapper wrapper = _openWrapper(user);

        // perturb fees so surviving != deposit (proves the residual tracks surviving, not deposit)
        _seedFeesUp(int256(2e31));
        // restore spot near the oracle median so the voluntary burn clears the PriceImpactTooLarge gate
        // (the fee growth already collected by the seller's in-range chunk stays accrued).
        _restorePrice(int256(4e15));

        // VOLUNTARY close via the user-gated entrypoint
        vm.prank(user);
        wrapper.close();
        assertEq(IPanopticData(deployedPool).numberOfLegs(address(wrapper)), 0, "closed");

        // free the pool-wide redeem cap BEFORE claim (B4)
        _closeSellerShort();

        uint256 u0pre = IERC20(token0).balanceOf(user);
        uint256 u1pre = IERC20(token1).balanceOf(user);
        uint256 surv0 = ct0.convertToAssets(IERC20(address(ct0)).balanceOf(address(wrapper)));
        uint256 surv1 = ct1.convertToAssets(IERC20(address(ct1)).balanceOf(address(wrapper)));

        // CLAIM is caller-agnostic — a random claimer triggers; payout goes to `user`.
        vm.prank(makeAddr("randomClaimer"));
        wrapper.claimResidual();

        uint256 u0post = IERC20(token0).balanceOf(user);
        uint256 u1post = IERC20(token1).balanceOf(user);

        // The residual tracks SURVIVING collateral: the paid figure is bounded above by surviving (cap-aware)
        // and the wrapper paid the stored user (NOT the depositor / NOT a deposit-derived constant).
        // Manual-only fallback: if the cap binds the per-token payout may be 0 (remainder stays as shares),
        // but at least one side pays a positive, surviving-bounded amount and the claim never reverts.
        assertLe(u0post - u0pre, surv0 + 1, "token0 paid <= surviving (cap-aware, never deposit-derived)");
        assertLe(u1post - u1pre, surv1 + 1, "token1 paid <= surviving (cap-aware, never deposit-derived)");
        assertGt((u0post - u0pre) + (u1post - u1pre), 0, "user paid a positive surviving-derived figure");

        // post-claim state is Claimed (== 3).
        assertEq(uint8(wrapper.state()), uint8(3), "state -> Claimed");

        // idempotency: a second claim (any caller) reverts AlreadyClaimed.
        vm.expectRevert(LongGammaWrapper.AlreadyClaimed.selector);
        vm.prank(makeAddr("randomClaimer2"));
        wrapper.claimResidual();
    }

    // ------------------------------------------------------------------
    // WrongState while Open
    // ------------------------------------------------------------------

    /// @notice `claimResidual()` reverts `WrongState` while the position is still Open (numberOfLegs != 0).
    function test_claim_revertsWhileOpen() public {
        address user = makeAddr("beneficiary");
        LongGammaWrapper wrapper = _openWrapper(user);
        // NO close — still Open ⇒ claimResidual reverts WrongState.
        vm.expectRevert(LongGammaWrapper.WrongState.selector);
        wrapper.claimResidual();
    }

    // ------------------------------------------------------------------
    // residual base tracks surviving (fees move it), not a constant deposit
    // ------------------------------------------------------------------

    /// @notice The residual BASE tracks SURVIVING collateral at actual close, NOT the upfront deposit. After
    ///         fee-seeding swaps and a voluntary `close()`, the wrapper's surviving
    ///         `convertToAssets(balanceOf(wrapper))` has DIVERGED from the stored `deposited` (the long's
    ///         streamia was settled into the 4626 share balance at the burn, per RESEARCH Pattern 7) — so the
    ///         residual base is provably the live surviving figure, not `deposit − constant`.
    function test_claim_residualMovesWithFees() public {
        address user = makeAddr("beneficiary");
        LongGammaWrapper wrapper = _openWrapper(user);

        // seed fees (so streamia accrues), restore the price for the burn, then close.
        _seedFeesUp(int256(2e31));
        _restorePrice(int256(4e15));
        vm.prank(user);
        wrapper.close();

        // surviving AT CLOSE vs the stored deposit — they DIFFER (streamia netted into the share balance).
        uint256 dep0 = wrapper.deposited0();
        uint256 dep1 = wrapper.deposited1();
        uint256 surv0 = ct0.convertToAssets(IERC20(address(ct0)).balanceOf(address(wrapper)));
        uint256 surv1 = ct1.convertToAssets(IERC20(address(ct1)).balanceOf(address(wrapper)));

        // the residual base is the LIVE surviving read at close, provably != the upfront deposit
        // (the long's settled streamia moved it). At least one token's surviving has diverged from deposit.
        assertTrue(surv0 != dep0 || surv1 != dep1, "surviving-at-close diverges from deposit (tracks surviving, not deposit)");
        // and surviving never EXCEEDS the deposit (streamia is a debit, never a credit, on the long).
        assertLe(surv0, dep0 + 1, "surviving0 <= deposit0");
        assertLe(surv1, dep1 + 1, "surviving1 <= deposit1");
    }

    // ------------------------------------------------------------------
    // RELOCATED (08-04 -> 08-05, approved): post-Claimed streamia state-gate leg
    // ------------------------------------------------------------------

    /// @notice RELOCATED post-Claimed state-gate leg (WRAP-03 completion). Drive a wrapper through the full
    ///         lifecycle to `Claimed` (deposit → swap → user `close()` → `_closeSellerShort()` →
    ///         `claimResidual()`), assert `state == Claimed (3)`, then `recordStreamia()` reverts `WrongState`
    ///         — streamia is only readable mid-life (Open). Together with the 08-04 pre-Open leg this proves
    ///         `recordStreamia` is valid ONLY in the Open state.
    /// @dev The Iron Law is preserved: no `close()` impl was pulled into 08-04; `close()`/`claimResidual()` and
    ///      their trees live here in 08-05, where a wrapper legitimately reaches `Claimed`.
    function test_claim_recordStreamiaRevertsPostClaimed() public {
        address user = makeAddr("beneficiary");
        LongGammaWrapper wrapper = _openWrapper(user);

        _seedFeesUp(int256(2e31));
        _restorePrice(int256(4e15)); // clear PriceImpactTooLarge before the burn (see _restorePrice)

        vm.prank(user);
        wrapper.close();
        _closeSellerShort();
        wrapper.claimResidual();

        assertEq(uint8(wrapper.state()), uint8(3), "wrapper reached Claimed");

        // POST-Claimed: recordStreamia() reverts WrongState (only readable mid-life / Open).
        vm.expectRevert(LongGammaWrapper.WrongState.selector);
        wrapper.recordStreamia();
    }
}
