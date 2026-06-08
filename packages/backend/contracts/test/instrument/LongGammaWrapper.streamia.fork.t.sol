// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {LongGammaWrapperBase} from "./LongGammaWrapperBase.sol";
import {LongGammaWrapper} from "../../src/instrument/LongGammaWrapper.sol";
import {IPanopticData} from "../../src/instrument/interfaces/IPanopticData.sol";
import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";
import {TokenId} from "@types/TokenId.sol";
import {LeftRightUnsigned} from "@types/LeftRight.sol";

/// @dev BTT spec: test/instrument/LongGammaWrapper.streamia.fork.tree
/// @notice WRAP-03 (P1: streamia READ, never re-derived) proof on the Base fork. `recordStreamia()` is a
///         pure passthrough of `getFullPositionsData(...).longPremium`. The proof is FOUR-part:
///         (a) READ-FIDELITY (wei-exact, always true): `recordStreamia()` returns EXACTLY the getter's two
///             slots from the SAME call at the SAME tick — RHS pinned to the CORRECT-tokenId long slot, so
///             a wrong-leg / shortPremium-reading / multiplier wrapper diverges. This IS the "READ, never
///             re-derived" proof; the equality ALONE cannot discriminate, so the pinned-long RHS +
///             non-zero/monotonic + the P1 grep-guard carry the discrimination.
///         (b) STATE-GATE (PRE-OPEN leg here): `recordStreamia()` reverts `WrongState` before the position
///             is opened (Uninitialized) — it is only valid mid-life while the position is Open. The
///             post-Claimed leg is verified in 08-05 claimResidual.t.sol (approved relocation; close() lives
///             there, so pulling it forward would break the Iron Law) — full gate = 08-04 + 08-05.
///         (c) NON-ZERO FLOOR: after swap-seeded fees `recorded0>0 || recorded1>0`.
///         (d) DIRECTIONAL/MONOTONIC: more fee-generating swaps ⇒ recorded strictly increases.
///         There is deliberately NO cross-tick `assertEq(recorded, OptionBurnt.premiaByLeg)` gate:
///         `recordStreamia` reads `longPremium` at `currentTick` (PanopticPool L437/L445) while
///         `premiaByLeg` is emitted atTick=0 under COMMIT_LONG_SETTLED (L1159-1161), so they diverge in
///         general and a gating equality would revert; the available-premium cap is short-branch-only
///         (L1186-1235), NOT the cause. SWAP SEAM: imports NEITHER a borrowed concrete NOR the deploy
///         helper (both live behind the base); the pool is reached ONLY via `IPanopticData`.
contract LongGammaWrapperStreamia is LongGammaWrapperBase {
    // ------------------------------------------------------------------
    // bulloak branch fns (un-renamed) — each tree leaf delegates to the
    // matching proof so the BTT mapping stays 1:1.
    // ------------------------------------------------------------------

    function test_WhenSwapsGeneratePoolFeesAndTheLongPremiumIsRead() external {
        test_streamia_readFidelity();
    }

    function test_WhenAdditionalSwapsGenerateMoreFees() external {
        test_streamia_directionalMonotonic();
    }

    function test_WhenRecordStreamiaIsCalledOutsideTheOpenState() external {
        test_streamia_revertsWrongStateOffOpen();
    }

    // ------------------------------------------------------------------
    // Shared open helper
    // ------------------------------------------------------------------

    /// @dev Deploy the wrapper against the seam handles and open the long via the LOCKED 6-arg deposit.
    function _openWrapper() internal returns (LongGammaWrapper wrapper) {
        address beneficiary = makeAddr("beneficiary");
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
        wrapper.deposit(beneficiary, amt, amt, _longTokenId(), LONG_SIZE, limits);
        vm.stopPrank();
    }

    /// @dev Push the pool price UP into the OTM-above chunk's tick band so `feeGrowthInside` advances
    ///      across the seller's in-range liquidity, making the long's `longPremium` non-zero (Pitfall 2:
    ///      block advance accrues nothing — only swaps crossing the chunk's range move fee growth).
    ///      The seller short sits ~+2000 ticks above the open tick (token0=USDC 6dp, token1=cCOP 18dp);
    ///      selling token1 (`zeroForOne=false`) raises the price toward the chunk. The price-up direction
    ///      is DEEP (large cCOP reserves), so reaching the chunk needs a sizeable swap (prototyped on the
    ///      live fork: ~2e31 crosses into the band; smaller swaps inside the band accrue incrementally).
    /// @param size exact-input token1 (cCOP) amount; the sign is applied here (exact-in ⇒ negative).
    function _seedFeesUp(int256 size) internal {
        deal(token0, address(swapHelper), type(uint128).max);
        deal(token1, address(swapHelper), type(uint128).max);
        swapHelper.swapExactIn(poolKey, false, -size); // sell token1 (cCOP) → price UP into the +2000 chunk
    }

    /// @dev Read the getter's own long-premium slots for `wrapper` at the CURRENT tick — the pinned RHS.
    function _getterLongPremium(LongGammaWrapper wrapper) internal view returns (uint128 r, uint128 l) {
        TokenId[] memory list = new TokenId[](1);
        list[0] = wrapper.positionTokenId();
        (, LeftRightUnsigned lp, ,,) =
            IPanopticData(deployedPool).getFullPositionsData(address(wrapper), true, list);
        r = lp.rightSlot();
        l = lp.leftSlot();
    }

    // ------------------------------------------------------------------
    // (a) READ-FIDELITY + (c) NON-ZERO FLOOR
    // ------------------------------------------------------------------

    /// @notice PRIMARY P1 proof — `recordStreamia()` returns EXACTLY the getter's own long-premium slots
    ///         from the SAME call at the SAME tick (wei-exact read-fidelity), with the RHS pinned to the
    ///         CORRECT-tokenId long slot, plus the non-zero floor after swap-seeded fees.
    function test_streamia_readFidelity() public {
        LongGammaWrapper wrapper = _openWrapper();

        // swap the price UP into the OTM chunk so feeGrowthInside advances and streamia is observable
        // (Pitfall 2; the up-direction is deep, ~2e31 crosses into the band — prototyped on the fork).
        _seedFeesUp(int256(2e31));

        // READ-FIDELITY (wei-exact, always true): the wrapper stores EXACTLY the getter's return.
        // Call the SAME getter the wrapper calls, from the SAME tick, and assert slot-for-slot equality.
        // This proves READ-FROM-CONTRACT (not re-derivation). The equality ALONE cannot distinguish a
        // shortPremium-reading / wrong-leg wrapper — the discrimination is carried by PINNING the
        // CORRECT-tokenId longPremium on the RHS below + the non-zero floor + the P1 grep-guard.
        (uint128 rec0, uint128 rec1) = wrapper.recordStreamia();
        (uint128 lpR, uint128 lpL) = _getterLongPremium(wrapper);
        assertEq(rec0, lpR, "recorded0 == getter longPremium.rightSlot (read fidelity, same call/tick)");
        assertEq(rec1, lpL, "recorded1 == getter longPremium.leftSlot (read fidelity, same call/tick)");

        // NON-ZERO FLOOR (Pitfall 2 — proves swaps generated observable fees).
        assertTrue(rec0 > 0 || rec1 > 0, "streamia non-zero after swaps");
    }

    // ------------------------------------------------------------------
    // (b) STATE-GATE — reverts WrongState off the Open state
    // ------------------------------------------------------------------

    /// @notice STATE-GATE (PRE-OPEN leg): `recordStreamia()` reverts `WrongState` before the position is
    ///         opened — a freshly-deployed wrapper is `Uninitialized`, so the read is rejected. This proves
    ///         streamia cannot be read before the long exists; `recordStreamia` is Open-only.
    /// @dev The POST-Claimed leg of the state-gate (recordStreamia reverts `WrongState` once the wrapper has
    ///      reached `Claimed`) is verified in 08-05's `claimResidual.t.sol` — where `close()`/`claimResidual()`
    ///      and their trees properly live and a wrapper legitimately reaches `Claimed`. Pulling `close()`
    ///      (UNIMPLEMENTED at wave 4) into this file would break the evm-tdd Iron Law (impl ahead of its
    ///      08-05 tree); the full state-gate proof is delivered across 08-04 (pre-Open) + 08-05 (post-Claimed).
    ///      Approved relocation — see this task's DESIGN NOTE.
    function test_streamia_revertsWrongStateOffOpen() public {
        // PRE-OPEN — a freshly-deployed wrapper is Uninitialized ⇒ recordStreamia() reverts WrongState.
        // The off-Open revert is the `if (state != State.Open) revert WrongState();` line added in Task 2.
        LongGammaWrapper fresh = new LongGammaWrapper(IPanopticData(deployedPool), ct0, ct1);
        vm.expectRevert(LongGammaWrapper.WrongState.selector);
        fresh.recordStreamia();
    }

    // ------------------------------------------------------------------
    // (d) DIRECTIONAL / MONOTONIC
    // ------------------------------------------------------------------

    /// @notice DIRECTIONAL: more fee-generating swaps ⇒ recorded monotonic non-decreasing, and strictly
    ///         increases after a material swap. Proves "moved with fees" without any cross-tick equality.
    function test_streamia_directionalMonotonic() public {
        LongGammaWrapper wrapper = _openWrapper();

        // baseline: push price into the chunk band so the long earns its first observable fee growth.
        _seedFeesUp(int256(2e31));
        (uint128 before0, uint128 before1) = wrapper.recordStreamia();

        // MORE fee-generating swaps inside the band ⇒ feeGrowthInside advances further, recorded grows.
        _seedFeesUp(int256(5e30));
        _seedFeesUp(int256(5e30));
        (uint128 after0, uint128 after1) = wrapper.recordStreamia();

        assertGe(after0, before0, "recorded0 monotonic non-decreasing");
        assertGe(after1, before1, "recorded1 monotonic non-decreasing");
        assertGt(after0 + after1, before0 + before1, "recorded strictly increases after a material swap");
    }
}
