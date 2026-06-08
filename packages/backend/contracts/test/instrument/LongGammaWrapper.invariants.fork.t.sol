// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {LongGammaWrapperBase} from "./LongGammaWrapperBase.sol";
import {LongGammaWrapper} from "../../src/instrument/LongGammaWrapper.sol";
import {IPanopticData} from "../../src/instrument/interfaces/IPanopticData.sol";
import {IERC4626} from "@openzeppelin/contracts/interfaces/IERC4626.sol";
import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";
import {TokenId} from "@types/TokenId.sol";
import {PoolKey} from "v4-core/types/PoolKey.sol";
import {V4SwapHelper} from "./helpers/V4SwapHelper.sol";

/// @title LongGammaWrapperInvariants — the two ROADMAP-named fuzz invariants (full-stem co-located with the
///        Plan-01 `LongGammaWrapper.invariants.fork.tree`, root `LongGammaWrapperInvariants`).
/// @notice This is the phase's structural-soundness gate. A bounded `LongGammaWrapperHandler` (declared
///         AFTER this contract so bulloak 0.9.2 anchors the tree root HERE) drives the lifecycle on a Base
///         fork and the two named invariants hold across all fuzz runs:
///           - `invariant_residualNeverExceedsHoldings` — a SINGLE claim's realized payout vs the live
///             holdings snapshotted JUST BEFORE that redeem.
///           - `invariant_userClaimsBackedByCollateral` — the CUMULATIVE realized payouts vs the running
///             SUM of live collateral the wrapper actually HELD at each claim time (non-overpayment upper
///             bound). NEVER the gross deposit (B1), NEVER a surviving-minus-cost-vs-surviving tautology (W4).
/// @dev SWAP SEAM: imports NEITHER a borrowed concrete NOR the deploy helper (both behind the base).
contract LongGammaWrapperInvariants is LongGammaWrapperBase {
    LongGammaWrapperHandler internal handler;
    LongGammaWrapper internal wrapper;

    function setUp() public override {
        super.setUp(); // deploy + seed the seller short (the base does the fork + factory choreography)

        wrapper = new LongGammaWrapper(IPanopticData(deployedPool), ct0, ct1);

        int24[3] memory lim = [TICK_LIMIT_LOW, TICK_LIMIT_HIGH, EFF_LIQ_LIMIT];
        handler = new LongGammaWrapperHandler(
            wrapper,
            IPanopticData(deployedPool),
            ct0,
            ct1,
            token0,
            token1,
            poolKey,
            swapHelper,
            _longTokenId(),
            LONG_SIZE,
            lim
        );

        // The handler IS the wrapper's `user` (it deposits `address(this)`), so it needs over-funded
        // collateral (P3: the 18-dp tracker needs >=1e18 to back the 1-ether long) + swap-helper fuel.
        deal(token0, address(handler), type(uint104).max);
        deal(token1, address(handler), type(uint104).max);

        // The seller short is seeded + owned by THIS base contract; expose a hook the handler calls at
        // claim time to free the pool-wide redeem cap (B4) without importing the deploy helper.
        handler.setSellerShortCloser(address(this));

        // Drive ONLY the bounded handler actions.
        targetContract(address(handler));
        bytes4[] memory sels = new bytes4[](5);
        sels[0] = handler.act_open.selector;
        sels[1] = handler.act_swap.selector;
        sels[2] = handler.act_sync.selector;
        sels[3] = handler.act_close.selector;
        sels[4] = handler.act_claim.selector;
        targetSelector(FuzzSelector({addr: address(handler), selectors: sels}));
    }

    /// @dev Hook the handler calls (via low-level call) to free the pool-wide redeem cap before its claim.
    function closeSellerShortForHandler() external {
        _closeSellerShort();
    }

    // ------------------------------------------------------------------
    // The two ROADMAP-named invariants — DISTINCT (single-claim vs cumulative)
    // ------------------------------------------------------------------

    /// @notice SINGLE-CLAIM bound: the realized payout of the MOST-RECENT claim (handler.lastPaid_i, from the
    ///         user balance delta) vs the LIVE holding the handler snapshotted just before THAT redeem
    ///         (handler.preClaimSurviving_i = convertToAssets(...)). Two distinct reads — the redeem path
    ///         (maxRedeem-capped) must keep them ordered. NOT a re-derivation of owed from surviving.
    function invariant_residualNeverExceedsHoldings() public view {
        assertLe(handler.lastPaid0(), handler.preClaimSurviving0() + 1, "paid0 <= holdings snapshot at that claim");
        assertLe(handler.lastPaid1(), handler.preClaimSurviving1() + 1, "paid1 <= holdings snapshot at that claim");
    }

    /// @notice CUMULATIVE non-overpayment bound: the running total the wrapper has paid the user
    ///         (handler.totalPaid_i) never exceeds the running SUM of the live collateral it actually HELD at
    ///         each claim time (handler.cumPreClaimSurviving_i = sum of convertToAssets(balanceOf(wrapper))
    ///         snapshotted BEFORE each redeem). Both accumulators are tracked in the HANDLER from claim-time
    ///         live reads — NEVER from the gross deposit (which the mint commission burn erodes, B1) and NEVER
    ///         re-derived from `surviving` inside the assertion.
    ///           - TRUE on fuzz step 1: pre-claim both are 0, so 0 <= 0 + 1.
    ///           - NON-VACUOUS: fails a wrapper that pays from the deposit figure (payout > the live surviving
    ///             it held) or double-pays (totalPaid outruns the summed pre-claim snapshots).
    ///         The +1 absorbs convertToAssets rounding at the low fuzz floor; if a higher floor accumulates
    ///         rounding, widen to `+ handler.claimCount()` rather than re-introducing any deposit-referencing
    ///         form.
    function invariant_userClaimsBackedByCollateral() public view {
        assertLe(handler.totalPaid0(), handler.cumPreClaimSurviving0() + 1, "cumulative payout0 <= summed live holdings at claim times");
        assertLe(handler.totalPaid1(), handler.cumPreClaimSurviving1() + 1, "cumulative payout1 <= summed live holdings at claim times");
    }

    // ------------------------------------------------------------------
    // bulloak branch fns (un-renamed) — each tree leaf delegates to the matching named invariant so the
    // BTT mapping (Plan-01 tree) stays 1:1. These run as ordinary unit tests (the named invariant_* fns are
    // additionally picked up by the Foundry invariant runner per the [invariant] config).
    // ------------------------------------------------------------------

    function test_WhenInvariant_residualNeverExceedsHoldings() external view {
        invariant_residualNeverExceedsHoldings();
    }

    function test_WhenInvariant_userClaimsBackedByCollateral() external view {
        invariant_userClaimsBackedByCollateral();
    }
}

/// @title LongGammaWrapperHandler — bounded lifecycle driver for the LongGammaWrapper invariant fuzzer.
/// @notice The Foundry invariant target. Each `act_*` `bound()`s its inputs and NO-OPs on the wrong state
///         so the fuzzer never reverts a run, then drives one step of the real lifecycle against the live
///         Base fork (deposit -> swap -> syncResidual -> close -> claimResidual). It IS the wrapper's stored
///         `user` (`deposit(address(this), ...)`, m4) — load-bearing, because `close()` is gated by
///         `if (msg.sender != user) revert NotUser();`, so unless the handler IS the stored user the
///         `act_close()` path can never pass the gate and the close path is never fuzzed.
/// @dev The ONLY ledgers tracked here are REALIZED-PAYOUT-SIDE, all populated at CLAIM time from LIVE reads,
///      NEVER from the gross deposit `a0/a1` (the mint commission burn erodes surviving below the deposit by
///      far more than +1, CollateralTracker L1552-1559 — so the deposit is NOT what the wrapper backs, B1):
///        - `lastPaid_i`           : the realized payout of the MOST-RECENT claim (user balance delta).
///        - `preClaimSurviving_i`  : the LIVE `convertToAssets(balanceOf(wrapper))` snapshotted JUST BEFORE
///                                   that redeem (an independent read from the redeem path).
///        - `totalPaid_i`          : sum of lastPaid_i (cumulative realized payout).
///        - `cumPreClaimSurviving_i`: sum of preClaimSurviving_i (running sum of live holdings at claim time).
///      SWAP SEAM: imports NEITHER a borrowed concrete NOR the deploy helper — only `IPanopticData`,
///      `IERC4626`/`IERC20`, the borrowed TokenId value type, and the local `V4SwapHelper`.
contract LongGammaWrapperHandler {
    LongGammaWrapper public wrapper;

    // --- seam handles passed in by the invariant test's setUp ---
    IPanopticData internal pool;
    IERC4626 internal ct0;
    IERC4626 internal ct1;
    address internal token0;
    address internal token1;
    PoolKey internal poolKey;
    V4SwapHelper internal swapHelper;
    TokenId internal longId;
    uint128 internal longSize;
    int24[3] internal limits;

    // --- realized-payout-side ledgers (CLAIM-time live reads ONLY — never from the deposit a0/a1) ---
    uint256 public lastPaid0;
    uint256 public lastPaid1;
    uint256 public preClaimSurviving0;
    uint256 public preClaimSurviving1;
    uint256 public totalPaid0;
    uint256 public totalPaid1;
    uint256 public cumPreClaimSurviving0;
    uint256 public cumPreClaimSurviving1;
    uint256 public claimCount;

    // --- the base-owned seller-short closer hook (set post-construction) ---
    address internal sellerShortCloser;

    constructor(
        LongGammaWrapper _wrapper,
        IPanopticData _pool,
        IERC4626 _ct0,
        IERC4626 _ct1,
        address _token0,
        address _token1,
        PoolKey memory _poolKey,
        V4SwapHelper _swapHelper,
        TokenId _longId,
        uint128 _longSize,
        int24[3] memory _limits
    ) {
        wrapper = _wrapper;
        pool = _pool;
        ct0 = _ct0;
        ct1 = _ct1;
        token0 = _token0;
        token1 = _token1;
        poolKey = _poolKey;
        swapHelper = _swapHelper;
        longId = _longId;
        longSize = _longSize;
        limits = _limits;
    }

    function setSellerShortCloser(address closer) external {
        sellerShortCloser = closer;
    }

    // -- bound helper (no forge-std dependency in the handler) --
    function _bound(uint256 x, uint256 lo, uint256 hi) internal pure returns (uint256) {
        if (hi <= lo) return lo;
        return lo + (x % (hi - lo + 1));
    }

    /// @notice Open the long with the handler ITSELF as the stored `user` (so `act_close()` clears the
    ///         `NotUser` gate). NO-OP if already opened (one-shot wrapper).
    /// @dev DEVIATION (Rule-1) from the plan's `[1e6, 1e14]` bound: the demo long is 1 ether (1e18) and the
    ///      18-dp collateral tracker is OVER-funded (P3 — the same `type(uint104).max` cap the 08-03/05 tests
    ///      use). A deposit below ~1e18 makes `pool.dispatch` underflow (0x11) in the SFPM solvency math, so
    ///      `act_open` would ALWAYS revert and the open/close/claim paths would never fuzz (the invariant
    ///      would be VACUOUS — totalPaid always 0). Bound to the over-funded `[1e18, type(uint104).max]` so
    ///      the long mints and the lifecycle is genuinely exercised.
    function act_open(uint256 a0, uint256 a1) external {
        if (uint8(wrapper.state()) != uint8(0)) return; // only from Uninitialized
        a0 = _bound(a0, 1e18, uint256(type(uint104).max));
        a1 = _bound(a1, 1e18, uint256(type(uint104).max));
        // The deposit pulls from msg.sender == this handler; approve those amounts.
        IERC20(token0).approve(address(wrapper), a0);
        IERC20(token1).approve(address(wrapper), a1);
        // The stored `user` is `address(this)` (m4) — NOT an external user; load-bearing for act_close().
        wrapper.deposit(address(this), a0, a1, longId, longSize, limits);
    }

    /// @notice Move `feeGrowthInside` so surviving may erode. Bound amt to [1e6, 1e10]. NO-OP pre-open.
    function act_swap(uint256 amt, bool dir) external {
        if (uint8(wrapper.state()) == uint8(0)) return; // nothing to perturb before open
        amt = _bound(amt, 1e6, 1e10);
        // fund the swap helper from the handler's own balance, then swap exact-in in the chosen direction.
        _fundSwapHelper();
        try swapHelper.swapExactIn(poolKey, dir, -int256(amt)) {} catch {}
    }

    /// @notice Permissionless reconcile (always safe; may promote Open->Closed). NO-OP pre-open.
    function act_sync() external {
        if (uint8(wrapper.state()) == uint8(0)) return;
        try wrapper.syncResidual() {} catch {}
    }

    /// @notice Voluntary close (DIRECT call, no prank): the handler IS the stored `user`, so `msg.sender ==
    ///         user` and the `NotUser` gate passes. Only from Open.
    function act_close() external {
        if (uint8(wrapper.state()) != uint8(1)) return; // only from Open
        try wrapper.close() {} catch {}
    }

    /// @notice Claim: snapshot the LIVE pre-redeem holdings, free the redeem cap, snapshot the user (=this)
    ///         balances, claim, record the realized payout, and ACCUMULATE both independent ledgers — all
    ///         from CLAIM-time live reads, NEVER from the gross deposit. Only from Closed && !claimed.
    function act_claim() external {
        if (uint8(wrapper.state()) != uint8(2)) return; // only from Closed
        if (wrapper.claimed()) return;

        // 1. snapshot the LIVE holding the wrapper has JUST BEFORE this redeem (independent of the payout).
        uint256 surv0 = ct0.convertToAssets(IERC20(address(ct0)).balanceOf(address(wrapper)));
        uint256 surv1 = ct1.convertToAssets(IERC20(address(ct1)).balanceOf(address(wrapper)));
        preClaimSurviving0 = surv0;
        preClaimSurviving1 = surv1;

        // 2. free the pool-wide redeem cap (close the seeded seller short, B4) — best-effort.
        _closeSellerShortIfAny();

        // 3. snapshot the user (= this handler) balances.
        uint256 u0pre = IERC20(token0).balanceOf(address(this));
        uint256 u1pre = IERC20(token1).balanceOf(address(this));

        // 4. claim (caller-agnostic; proceeds go to the stored user == this handler).
        try wrapper.claimResidual() {} catch { return; }

        // 5. record the realized payout this claim (user balance delta).
        uint256 paid0 = IERC20(token0).balanceOf(address(this)) - u0pre;
        uint256 paid1 = IERC20(token1).balanceOf(address(this)) - u1pre;
        lastPaid0 = paid0;
        lastPaid1 = paid1;

        // 6. ACCUMULATE the two independent claim-time ledgers (NEVER from the deposit a0/a1).
        totalPaid0 += paid0;
        totalPaid1 += paid1;
        cumPreClaimSurviving0 += surv0;
        cumPreClaimSurviving1 += surv1;
        claimCount += 1;
    }

    /// @dev Move some of the handler's token balance to the swap helper so it can swap.
    function _fundSwapHelper() internal {
        uint256 b0 = IERC20(token0).balanceOf(address(this));
        uint256 b1 = IERC20(token1).balanceOf(address(this));
        if (b0 > 0) IERC20(token0).transfer(address(swapHelper), b0 / 4);
        if (b1 > 0) IERC20(token1).transfer(address(swapHelper), b1 / 4);
    }

    /// @dev The seller short is seeded + owned by the BASE (`seller`); the base's `_closeSellerShort()` is
    ///      internal, so the invariant test exposes a hook the handler calls to free the pool-wide cap.
    function _closeSellerShortIfAny() internal {
        if (sellerShortCloser == address(0)) return;
        (bool ok, ) = sellerShortCloser.call(abi.encodeWithSignature("closeSellerShortForHandler()"));
        ok; // best-effort: if the cap stays bound the redeem is dust-guarded and never reverts (B4)
    }
}
