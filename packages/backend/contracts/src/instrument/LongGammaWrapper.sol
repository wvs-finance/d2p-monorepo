// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IPanopticData} from "./interfaces/IPanopticData.sol";
import {ICostMeter} from "./interfaces/ICostMeter.sol";
import {IERC4626} from "@openzeppelin/contracts/interfaces/IERC4626.sol";
import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";
import {TokenId} from "@types/TokenId.sol";
import {LeftRightUnsigned} from "@types/LeftRight.sol";

/// @title LongGammaWrapper — single-position custody wrapper over a borrowed-Panoptic-V2 long-gamma leg.
/// @notice One wrapper instance owns exactly ONE long-gamma position on behalf of one explicit `user`:
///         deposit upfront collateral → mint `isLong=1` → streamia is READ from the pool's own 4626
///         accounting → close (voluntary burn or any of the three involuntary branches) → residual is
///         computed from SURVIVING collateral at actual close. One-shot: after `claimResidual()` the
///         wrapper is spent. The beneficiary `user` is stored at deposit and is distinct from the
///         deployer/`owner`, so the custody story ("user holds nothing, wrapper holds everything") is
///         unambiguous (`ct.balanceOf(user) == 0` while `ct.balanceOf(wrapper) > 0`).
/// @dev SWAP SEAM (LOCKED): this contract reaches the pool ONLY through `IPanopticData` and collateral
///      ONLY through OZ `IERC4626`/`IERC20`. It imports NO borrowed concrete contract — a grep guard
///      enforces this. The TokenId value type is a borrowed VALUE type, not a concrete contract.
///
///      OWNER LEVER (LOCKED): the `owner`'s ONLY lever is `setCostMeter`, frozen at first deposit
///      (state leaves `Uninitialized`); ownership is NOT assumed transferable/renounceable in v1.
///
///      CALLABLE-`user` PRECONDITION (N1): v1 assumes `user` is a callable EOA (or a contract able to
///      originate the `close()` call) — `close()` is the user's only voluntary exit and `claimResidual`
///      requires `numberOfLegs(wrapper) == 0`, so a non-callable `user` whose position never
///      involuntarily closes would re-introduce the trapped-funds trap. Out of v1 scope to mitigate.
///
///      INTERFACE-FIRST: this is the Phase-8 Plan-01 skeleton. Only `setCostMeter` and `_costOf` are
///      implemented; the fork-dependent entrypoints (`deposit`/`close`/`syncResidual`/`claimResidual`)
///      revert "UNIMPLEMENTED" and are filled by Plans 02–04 against THESE locked signatures.
contract LongGammaWrapper {
    /// @notice Lifecycle. `settleLongPremium` is a mid-life EROSION (stays `Open`), NOT a transition;
    ///         `Open → Closed` fires on ANY event dropping `numberOfLegs(wrapper)` to 0 (voluntary
    ///         `close()`, single-leg `forceExercise`, or liquidation). `claimResidual` requires `Closed`.
    enum State { Uninitialized, Open, Closed, Claimed }

    // ---------------------------------------------------------------------
    // Immutables (constructor-set)
    // ---------------------------------------------------------------------

    /// @notice The pool, seen ONLY through the swap-seam interface.
    IPanopticData public immutable pool;
    /// @notice token0 collateral tracker (4626 seam).
    IERC4626 public immutable ct0;
    /// @notice token1 collateral tracker (4626 seam).
    IERC4626 public immutable ct1;
    /// @notice Deployer; whose ONLY lever is the pre-Open `setCostMeter`.
    address public immutable owner;

    // ---------------------------------------------------------------------
    // Single-record ledger (NOT a per-user mapping — one wrapper = one position)
    // ---------------------------------------------------------------------

    /// @notice The beneficiary, stored at deposit; distinct from `owner`/caller.
    address public user;
    /// @notice Lifecycle position.
    State public state;
    /// @notice The single long-gamma position id minted by this wrapper.
    TokenId public positionTokenId;
    /// @notice Upfront collateral recorded at deposit (native dp), token0.
    uint256 public deposited0;
    /// @notice Upfront collateral recorded at deposit (native dp), token1.
    uint256 public deposited1;
    /// @notice Last-OBSERVATION surviving collateral (NOT a high-water mark), token0.
    ///         `convertToAssets(balanceOf(wrapper))` is non-monotone, so this is updated to the
    ///         current reading on EVERY sync/claim, and `ResidualEroded` fires when current < stored.
    uint256 public lastSurviving0;
    /// @notice Last-OBSERVATION surviving collateral, token1.
    uint256 public lastSurviving1;
    /// @notice External per-token cost meter; zero address ⇒ (0,0) cost (v1 default).
    ICostMeter public costMeter;
    /// @notice Idempotency guard against double-payout.
    bool public claimed;

    // ---------------------------------------------------------------------
    // Reentrancy guard (inline; OZ ReentrancyGuard deliberately NOT imported to keep the seam minimal)
    // ---------------------------------------------------------------------

    bool private _locked;

    modifier nonReentrant() {
        require(!_locked, "REENTRANT");
        _locked = true;
        _;
        _locked = false;
    }

    // ---------------------------------------------------------------------
    // Events (the Phase-9 + demo integration seam)
    // ---------------------------------------------------------------------

    event PositionOpened(address indexed user, TokenId tokenId, uint256 deposited0, uint256 deposited1);
    event ResidualEroded(address indexed user, uint256 eroded0, uint256 eroded1, bytes32 cause);
    event ResidualClaimed(address indexed user, uint256 paid0, uint256 paid1);
    event CostMeterSet(address meter);

    // ---------------------------------------------------------------------
    // Errors
    // ---------------------------------------------------------------------

    error NotOwner();
    error NotUser();
    error WrongState();
    error AlreadyClaimed();

    // ---------------------------------------------------------------------
    // Constructor
    // ---------------------------------------------------------------------

    constructor(IPanopticData _pool, IERC4626 _ct0, IERC4626 _ct1) {
        pool = _pool;
        ct0 = _ct0;
        ct1 = _ct1;
        owner = msg.sender;
        // state defaults to State.Uninitialized (enum slot 0).
    }

    // ---------------------------------------------------------------------
    // Owner config — IMPLEMENTED now (no fork dependency)
    // ---------------------------------------------------------------------

    /// @notice Wire the external cost meter. Owner-gated AND only while `Uninitialized` (frozen at
    ///         first deposit) so the meter can never be swapped mid-position to cut a live user's payout.
    /// @param meter The cost meter; the zero address keeps the v1 off-by-default (0,0) cost path.
    function setCostMeter(address meter) external {
        if (msg.sender != owner) revert NotOwner();
        if (state != State.Uninitialized) revert WrongState();
        costMeter = ICostMeter(meter);
        emit CostMeterSet(meter);
    }

    // ---------------------------------------------------------------------
    // Stubbed entrypoints — LOCKED signatures, filled by Plans 02–04
    // ---------------------------------------------------------------------

    /// @notice Open: store `user`, pull the caller's collateral, deposit it to ct0/ct1 AS THE WRAPPER
    ///         (4626 shares to `address(this)`, never the user), and mint the `isLong=1` long-gamma leg
    ///         via `pool.dispatch` against the same-chunk seeded seller short. Transitions
    ///         `Uninitialized → Open`, records the ledger + last-observation checkpoints, emits
    ///         `PositionOpened`. One-shot (reverts `WrongState` if not `Uninitialized`). (Plan 03.)
    /// @dev The wrapper reaches collateral ONLY through `IERC4626`/`IERC20` and the pool ONLY through
    ///      `IPanopticData`, so it cannot read the seller's chunk on its own — the long-leg parameters
    ///      (`longId`, `longSize`, `limits`) are supplied by the caller (the test knows the seeded chunk).
    /// @param _user The beneficiary, stored as `user` (distinct from `msg.sender`/`owner`).
    /// @param assets0 token0 collateral to pull from `msg.sender` and deposit as the wrapper.
    /// @param assets1 token1 collateral to pull from `msg.sender` and deposit as the wrapper.
    /// @param longId The `isLong=1` TokenId at the same chunk as the seeded seller short.
    /// @param longSize The long position size (≤ the seller short size).
    /// @param limits The dispatch tick/spread limits for the single long leg.
    function deposit(
        address _user,
        uint256 assets0,
        uint256 assets1,
        TokenId longId,
        uint128 longSize,
        int24[3] calldata limits
    ) external nonReentrant {
        if (state != State.Uninitialized) revert WrongState();
        user = _user;

        // pull the user's collateral into the wrapper, then deposit AS THE WRAPPER (shares to address(this))
        IERC20 t0 = IERC20(ct0.asset());
        IERC20 t1 = IERC20(ct1.asset());
        if (assets0 > 0) {
            t0.transferFrom(msg.sender, address(this), assets0);
            t0.approve(address(ct0), assets0);
            ct0.deposit(assets0, address(this));
        }
        if (assets1 > 0) {
            t1.transferFrom(msg.sender, address(this), assets1);
            t1.approve(address(ct1), assets1);
            ct1.deposit(assets1, address(this));
        }

        // mint the long through IPanopticData (positionBalance==0 ⇒ mint); position keyed to msg.sender==wrapper
        TokenId[] memory list = new TokenId[](1);
        list[0] = longId;
        TokenId[] memory finalIds = new TokenId[](1);
        finalIds[0] = longId;
        uint128[] memory sizes = new uint128[](1);
        sizes[0] = longSize;
        int24[3][] memory lim = new int24[3][](1);
        lim[0] = limits;
        pool.dispatch(list, finalIds, sizes, lim, false, 0); // false + 0 = usePremiaAsCollateral / builderCode

        positionTokenId = longId;
        deposited0 = assets0;
        deposited1 = assets1;
        lastSurviving0 = ct0.convertToAssets(IERC20(address(ct0)).balanceOf(address(this)));
        lastSurviving1 = ct1.convertToAssets(IERC20(address(ct1)).balanceOf(address(this)));
        state = State.Open;
        emit PositionOpened(_user, longId, assets0, assets1);
    }

    /// @notice Voluntary close: user-gated burn of the long via `pool.dispatch` (size → 0). The ONLY
    ///         voluntary exit (the position is `msg.sender`-keyed to the wrapper, so only the wrapper can
    ///         burn it; the economic decision to unwind belongs to the beneficiary). Closes the
    ///         trapped-funds path (review BLOCKER N1 / ROADMAP SC-5) — without it a healthy long that no
    ///         third party ever force-exercises or liquidates would sit `Open` forever and the user's
    ///         surviving collateral would be unrecoverable. (Plan 05, WRAP-04.)
    /// @dev Voluntary-burn dispatch args are the plain `bool usePremiaAsCollateral = false` + `builderCode = 0`
    ///      (the Phase-7-proven values) — NOT the `LeftRightUnsigned` form used on `dispatchFrom`. This avoids
    ///      an accidental premia-as-collateral solvency path. `size → 0` (≠ stored) is what makes dispatch BURN.
    function close() external nonReentrant {
        if (msg.sender != user) revert NotUser();
        if (state != State.Open) revert WrongState();
        TokenId[] memory list = new TokenId[](1);
        list[0] = positionTokenId;
        TokenId[] memory emptyFinal = new TokenId[](0); // empty final ⇒ position removed
        uint128[] memory zero = new uint128[](1);
        zero[0] = 0; // size 0 != stored ⇒ burn
        int24[3][] memory lim = new int24[3][](1);
        lim[0] = [int24(-887272), int24(887272), int24(uint24(type(uint24).max))]; // wide limits (no slippage gate on burn)
        pool.dispatch(list, emptyFinal, zero, lim, false, 0); // false + 0 = the Phase-7-proven voluntary args
        require(pool.numberOfLegs(address(this)) == 0, "legs remain"); // single-leg demo ⇒ 0
        state = State.Closed;
    }

    /// @notice Permissionless erosion poke: re-read surviving collateral, emit `ResidualEroded` and
    ///         re-checkpoint `lastSurviving` (last-OBSERVATION) when current < stored, and promote
    ///         `Open → Closed` when `numberOfLegs(wrapper) == 0`. (Plan 05.)
    function syncResidual() external nonReentrant {
        _reconcile();
    }

    /// @dev Shared reconciliation, factored INTERNAL (NO modifier) so both `syncResidual()` (nonReentrant) and
    ///      `claimResidual()` (nonReentrant) can call it without tripping the guard twice. Re-reads surviving
    ///      collateral, fires `ResidualEroded` on a per-interval drop, re-checkpoints `lastSurviving` to the
    ///      CURRENT reading (NOT a high-water mark — `convertToAssets(balanceOf)` is non-monotone, CONTEXT N3),
    ///      and performs the INVOLUNTARY-CLOSE DETECTION promotion (the shared enabler for both the voluntary
    ///      `close()` and the Plan-06 forceExercise/liquidation branches).
    function _reconcile() internal {
        uint256 s0 = ct0.convertToAssets(IERC20(address(ct0)).balanceOf(address(this)));
        uint256 s1 = ct1.convertToAssets(IERC20(address(ct1)).balanceOf(address(this)));
        uint256 e0 = s0 < lastSurviving0 ? lastSurviving0 - s0 : 0;
        uint256 e1 = s1 < lastSurviving1 ? lastSurviving1 - s1 : 0;
        if (e0 > 0 || e1 > 0) emit ResidualEroded(user, e0, e1, bytes32(0)); // cause = coarse demo label
        lastSurviving0 = s0; // last-OBSERVATION (NOT a high-water mark) — update every call (CONTEXT N3)
        lastSurviving1 = s1;
        // INVOLUNTARY-CLOSE DETECTION (the shared enabler for BOTH the voluntary close() AND the Plan-06
        // forceExercise/liquidation branches): an involuntary close drops numberOfLegs to 0 WITHOUT running
        // wrapper code, so `state` would stay Open and claimResidual would wrongly revert WrongState.
        // Promote Open->Closed here so any close — voluntary or involuntary — is reconcilable.
        if (state == State.Open && pool.numberOfLegs(address(this)) == 0) state = State.Closed;
    }

    /// @notice Caller-agnostic payout (proceeds ALWAYS go to the stored `user`): requires `numberOfLegs == 0`
    ///         (state `Closed`), redeems surviving shares to assets cap-aware, transfers to `user`. CEI +
    ///         idempotent. (Plan 05, WRAP-04.)
    /// @dev EFFECTS-BEFORE-INTERACTIONS: run the `_reconcile()` reconciliation AND set `claimed`/`state`
    ///      BEFORE any `redeem` (the only external interaction). The residual deducts ONLY `_costOf()` —
    ///      streamia + commission are ALREADY netted into the share balance by `settleBurn`, so subtracting
    ///      them here would DOUBLE-COUNT (RESEARCH Pattern 7). The redeem is cap-aware + dust-guarded so the
    ///      claim NEVER reverts on a binding `maxRedeem` cap or a `BelowMinimumRedemption` dust case — any
    ///      un-redeemable remainder simply stays as shares.
    function claimResidual() external nonReentrant {
        // `claimed` is checked BEFORE the state gate so a second claim reverts `AlreadyClaimed` (idempotency),
        // not `WrongState` — the first claim sets `state = Claimed`, which would otherwise mask the intent.
        if (claimed) revert AlreadyClaimed();
        if (state != State.Closed) revert WrongState(); // requires numberOfLegs==0 (set in close / involuntary promote)
        // --- EFFECTS BEFORE INTERACTIONS ---
        _reconcile(); // reconcile surviving + emit ResidualEroded (last-observation re-checkpoint)
        claimed = true;
        state = State.Claimed;
        (uint256 cost0, uint256 cost1) = _costOf(); // (0,0) for zero-address meter (v1)
        uint256 surv0 = ct0.convertToAssets(IERC20(address(ct0)).balanceOf(address(this)));
        uint256 surv1 = ct1.convertToAssets(IERC20(address(ct1)).balanceOf(address(this)));
        uint256 residual0 = surv0 > cost0 ? surv0 - cost0 : 0; // per-token max(.,0); native decimals, never mixed
        uint256 residual1 = surv1 > cost1 ? surv1 - cost1 : 0;
        // --- INTERACTIONS --- cap-aware redeem (B4): remainder stays as shares, never reverts the claim
        uint256 paid0 = _redeemCapped(ct0, residual0);
        uint256 paid1 = _redeemCapped(ct1, residual1);
        emit ResidualClaimed(user, paid0, paid1);
    }

    /// @dev Cap-aware + dust-guarded redeem of `assetsResidual` worth of shares to the stored `user`. The
    ///      wrapper is `msg.sender == owner` of the shares so `redeem(shares, user, address(this))` is
    ///      authorized (no allowance branch). Caps the share count at `maxRedeem(wrapper)` (the pool-wide
    ///      `s_depositedAssets − 1` floor, B4) and dust-guards the `BelowMinimumRedemption` case
    ///      (`previewRedeem(shares) == 0`, CollateralTracker L833) so the claim NEVER reverts — any
    ///      un-redeemable remainder stays as shares.
    function _redeemCapped(IERC4626 ct, uint256 assetsResidual) internal returns (uint256 paidAssets) {
        if (assetsResidual == 0) return 0;
        uint256 wantShares = ct.previewWithdraw(assetsResidual); // shares for the residual assets
        uint256 cap = ct.maxRedeem(address(this)); // pool-wide s_depositedAssets-1 floor (B4)
        uint256 shares = wantShares < cap ? wantShares : cap;
        if (shares == 0) return 0; // cap fully binding ⇒ report nothing, no revert
        // CollateralTracker.redeem reverts `BelowMinimumRedemption()` when previewRedeem(shares)==0 with
        // shares>0 (CollateralTracker.sol L833). Guard the dust case so the claim NEVER reverts.
        if (ct.previewRedeem(shares) == 0) return 0;
        paidAssets = ct.redeem(shares, user, address(this)); // wrapper is owner ⇒ authorized; assets to user
    }

    // ---------------------------------------------------------------------
    // Streamia READ (WRAP-03, P1) — IMPLEMENTED (read longPremium, never re-derived)
    // ---------------------------------------------------------------------

    /// @notice WRAP-03: streamia owed by the long, READ from the pool's own accounting (never re-derived).
    /// @dev Pure passthrough of `getFullPositionsData(...).longPremium` — token0 in
    ///      `rightSlot()`, token1 in `leftSlot()`. There is NO arithmetic, multiplier, or per-block
    ///      constant (P1 hard non-negotiable). Reverts `WrongState` off the `Open` state — streamia is
    ///      only meaningful mid-life (the Task-3 STATE-GATE: nothing to read pre-open / post-claim).
    /// @return streamia0 token0 streamia (native dp), streamia1 token1 streamia (native dp)
    function recordStreamia() public view returns (uint128 streamia0, uint128 streamia1) {
        if (state != State.Open) revert WrongState();
        TokenId[] memory list = new TokenId[](1);
        list[0] = positionTokenId;
        (, LeftRightUnsigned longPremium, , , ) =
            pool.getFullPositionsData(address(this), true, list);
        streamia0 = longPremium.rightSlot(); // token0
        streamia1 = longPremium.leftSlot(); // token1
    }

    // ---------------------------------------------------------------------
    // Internal view helpers
    // ---------------------------------------------------------------------

    /// @notice Per-token external cost: zero-address meter ⇒ (0,0); otherwise delegate to the meter.
    function _costOf() internal view returns (uint256 c0, uint256 c1) {
        if (address(costMeter) == address(0)) return (0, 0);
        return costMeter.cost(address(this));
    }
}
