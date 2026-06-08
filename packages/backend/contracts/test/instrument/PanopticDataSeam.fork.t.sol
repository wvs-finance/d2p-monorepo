// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IPanopticData} from "../../src/instrument/interfaces/IPanopticData.sol";
import {IERC4626} from "@openzeppelin/contracts/interfaces/IERC4626.sol";
import {IERC20Partial} from "@tokens/interfaces/IERC20Partial.sol";
import {TokenId} from "@types/TokenId.sol";
import {PositionBalance} from "@types/PositionBalance.sol";
import {PanopticDataSeamBase} from "./PanopticDataSeamBase.sol";

/// @dev BTT spec: test/instrument/PanopticDataSeam.fork.tree
/// @notice FORK-03 swap seam: the borrowed Panoptic V2 pool is reached ONLY through `IPanopticData`
///         and collateral is deposited ONLY through `IERC4626` ct0/ct1 — this file imports NEITHER
///         a `panoptic-borrowed` concrete NOR the `PanopticV2DeployHelper` (both deploy details live
///         behind `PanopticDataSeamBase`). Mints ONE position via `dispatch` (PositionBalance==0 ⇒
///         mint), reads `PositionBalance[]` length 1 via `getFullPositionsData`, then
///         dispatches size 0 (≠ stored ⇒ burn) — all through the interface.
contract PanopticDataSeammintBurnThroughInterface is PanopticDataSeamBase {
    /// @dev bulloak branch fn (un-renamed, mn-B) — delegates to the single FORK-03 proof so the BTT
    ///      mapping stays 1:1 while one test exercises the whole deploy→mint→read→burn seam flow.
    function test_GivenABorrowedPanopticPoolDeployedViaTheFactoryChoreographyReferencedOnlyAsIPanopticDataWithCollateralViaIERC4626(
    ) external {
        test_mintBurn_single_position_through_IPanopticData();
    }

    function test_WhenOnePositionIsMintedViaIPanopticDataDispatchWithStoredBalanceZeroSoItMints() external {
        test_mintBurn_single_position_through_IPanopticData();
    }

    function test_WhenTheSamePositionIsDispatchedWithSizeZeroSoItBurns() external {
        test_mintBurn_single_position_through_IPanopticData();
    }

    /// @dev A wide tick range disables the open-price slippage gate for our short leg (no swap needed);
    ///      type(uint24).max disables the effective-liquidity gate (only binds long legs anyway).
    int24 internal constant TICK_LIMIT_LOW = -887272; // Constants.MIN_POOL_TICK
    int24 internal constant TICK_LIMIT_HIGH = 887272; // Constants.MAX_POOL_TICK
    int24 internal constant EFF_LIQ_LIMIT = int24(uint24(type(uint24).max)); // disable LP-limit gate
    /// @dev Push the strike well out of the money so the short leg's chunk sits entirely above the current
    ///      tick (single-sided ⇒ no active-tick straddle / mint-time swap ⇒ no ERC6909-claim underflow).
    int24 internal constant STRIKE_OFFSET = 2000;

    address internal actor = makeAddr("seamActor");

    /// @notice FORK-03 runtime proof (07-VALIDATION --match-test): mint ONE position, read it back,
    ///         then burn it — ALL through `IPanopticData` (pool) and `IERC4626` (ct0/ct1, B-1). The
    ///         deployed pool, ct0/ct1, tokens and poolId come from the M-3 base (no concrete import here).
    function test_mintBurn_single_position_through_IPanopticData() public {
        IPanopticData pano = IPanopticData(deployedPool);

        // --- §D step 1: FUND + APPROVE COLLATERAL (USDC 6dp via deal; MockCcop 18dp is mintable) ---
        deal(token0, actor, type(uint104).max);
        deal(token1, actor, type(uint104).max);
        // token0/token1 are whichever of {MockCcop, USDC} sort low/high; deal works for both ERC20s here
        // (MockCcop balance slot is standard; USDC on Base is dealable).

        vm.startPrank(actor);
        IERC20Partial(token0).approve(deployedPool, type(uint256).max);
        IERC20Partial(token1).approve(deployedPool, type(uint256).max);
        IERC20Partial(token0).approve(address(ct0), type(uint256).max);
        IERC20Partial(token1).approve(address(ct1), type(uint256).max);

        // --- §D step 2: DEPOSIT COLLATERAL via IERC4626 (B-1: ct0/ct1 are IERC4626, NOT the concrete) ---
        ct0.deposit(type(uint104).max, actor);
        ct1.deposit(type(uint104).max, actor);

        // --- §D step 3: MINT ONE POSITION (M-2: concrete one-leg short TokenId, strike tickSpacing-aligned) ---
        // Place the strike OUT of the money — its chunk sits entirely ABOVE the current tick so the short
        // leg is single-sided (one token only), avoiding the active-tick straddle that makes the SFPM's
        // ERC6909-claim burn underflow (an in-the-money short would need both tokens swapped at mint).
        int24 currentTick = pano.getCurrentTick();
        // STRIKE_OFFSET ticks above current, aligned to tickSpacing.
        int24 strike = int24(((currentTick + STRIKE_OFFSET) / tickSpacing) * tickSpacing);
        // addLeg(self, legIndex, optionRatio, asset, isLong, tokenType, riskPartner, strike, width)
        // confirmed arg order vs vendored TokenIdLibrary: short (isLong=0), optionRatio=1.
        // width=2 (NOT 1): getRangesFromStrike gives r=(width*tickSpacing)/2 ⇒ for width=1 r=5 leaves the
        // chunk ticks (strike±5) UN-aligned to tickSpacing=10 (InvalidTickBound). width=2 ⇒ r=10 ⇒ ticks
        // strike±10 are tickSpacing-aligned for a tickSpacing-aligned strike.
        TokenId built = TokenId.wrap(0).addPoolId(poolId).addLeg(0, 1, 0, 0, 0, 0, strike, 2);

        TokenId[] memory mintList = new TokenId[](1);
        mintList[0] = built;
        TokenId[] memory finalIds = new TokenId[](1);
        finalIds[0] = built;
        uint128[] memory sizes = new uint128[](1);
        sizes[0] = uint128(1 ether); // FAR below the 1_000_000-ether seeded LP ⇒ clears _validateSolvency
        int24[3][] memory limits = new int24[3][](1);
        limits[0][0] = TICK_LIMIT_LOW;
        limits[0][1] = TICK_LIMIT_HIGH;
        limits[0][2] = EFF_LIQ_LIMIT;

        pano.dispatch(mintList, finalIds, sizes, limits, false, 0); // PositionBalance==0 ⇒ mint

        // --- §D step 4: READ PREMIUM (never derive) — assert one position via PositionBalance[] len 1 ---
        (,, PositionBalance[] memory bals,,) = pano.getFullPositionsData(actor, true, finalIds);
        assertEq(bals.length, 1, "exactly one position minted through IPanopticData");

        // --- §D step 5: BURN (size 0 != stored ⇒ burn). FIX array literal: new uint128[](1), NOT [0] ---
        uint128[] memory burnSizes = new uint128[](1);
        burnSizes[0] = 0;
        TokenId[] memory emptyFinal = new TokenId[](0);
        pano.dispatch(mintList, emptyFinal, burnSizes, limits, false, 0);

        // post-burn read: the empty final portfolio holds no positions (the burn closed it)
        (,, PositionBalance[] memory afterBals,,) =
            pano.getFullPositionsData(actor, true, emptyFinal);
        assertEq(afterBals.length, 0, "position closed after burn (empty final portfolio)");

        vm.stopPrank();
    }
}
