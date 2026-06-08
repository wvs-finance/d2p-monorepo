// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {IERC4626} from "@openzeppelin/contracts/interfaces/IERC4626.sol";
import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";
import {TokenId} from "@types/TokenId.sol";
import {IPanopticData} from "../../src/instrument/interfaces/IPanopticData.sol";
import {PanopticV2DeployHelper} from "./helpers/PanopticV2DeployHelper.sol";
import {V4SwapHelper} from "./helpers/V4SwapHelper.sol";
import {IPoolManager} from "v4-core/interfaces/IPoolManager.sol";
import {PoolKey} from "v4-core/types/PoolKey.sol";
import {Currency} from "v4-core/types/Currency.sol";
import {IHooks} from "v4-core/interfaces/IHooks.sol";

/// @title LongGammaWrapperBase — M-3 deploy-isolation base for the Phase-8 LongGammaWrapper test units.
/// @notice This base absorbs ALL deploy coupling (it instantiates `PanopticV2DeployHelper`, exactly as
///         `PanopticDataSeamBase` does) so the test files that EXTEND it import NEITHER a borrowed-Panoptic
///         concrete contract NOR the deploy helper directly — the swap seam stays intact in the units (grep guard).
///         Beyond the Phase-7 base pattern it ALSO:
///         1. Seeds a SELLER SHORT (isLong=0) at the wrapper's target chunk BEFORE any wrapper long mint —
///            the WRAP-02 hard prerequisite (a naked long reverts NotEnoughLiquidityInChunk(), SFPM L965-988).
///         2. Owns a `V4SwapHelper` so units can move `feeGrowthInside` to make streamia observable (WRAP-03;
///            block advance alone does NOT accrue premium, 08-RESEARCH Pitfall 2).
///         3. Exposes the seller's `tokenId` + address and a `_closeSellerShort()` so the claim test (Plan 04)
///            can burn the short BEFORE the wrapper's claim to free the pool-wide `maxRedeem` cap
///            (`s_depositedAssets − 1`, B4 / CollateralTracker L795-802).
/// @dev Downstream units `is LongGammaWrapperBase` and call `_longTokenId()` / `_oneLegArgs(...)` /
///      `swapHelper.swapExactIn(...)` / `_closeSellerShort()` — no unit re-derives deploy or seed logic.
abstract contract LongGammaWrapperBase is Test {
    // --- Pinned Base fork block (M-4; reused from the Phase-7 harness) ---
    uint256 internal constant BASE_FORK_BLOCK = 46700000;

    // --- Base PoolManager (live on the fork; the swap helper swaps against it) ---
    address internal constant BASE_POOL_MANAGER = 0x498581fF718922c3f8e6A244956aF099B2652b2b;

    // --- dispatch tick/spread limits (mirror PanopticDataSeam.fork.t.sol) ---
    int24 internal constant TICK_LIMIT_LOW = -887272; // Constants.MIN_POOL_TICK
    int24 internal constant TICK_LIMIT_HIGH = 887272; // Constants.MAX_POOL_TICK
    int24 internal constant EFF_LIQ_LIMIT = int24(uint24(type(uint24).max)); // disable LP-limit gate

    // --- chunk geometry (mint OTM then swap into range per Pitfall 4; width=2 ⇒ r=10 tickSpacing-aligned) ---
    int24 internal constant STRIKE_OFFSET = 2000;
    uint8 internal constant CHUNK_WIDTH = 2;

    // --- sizes: seller >= long; both FAR below the 1,000,000-ether full-range seed so _validateSolvency clears (07-04) ---
    uint128 internal constant SELLER_SIZE = 10 ether;
    uint128 internal constant LONG_SIZE = 1 ether;

    // --- seam-safe handles (mirror PanopticDataSeamBase; pool consumed as IPanopticData) ---
    address internal deployedPool;
    IERC4626 internal ct0;
    IERC4626 internal ct1;
    address internal token0;
    address internal token1;
    address internal ccop;
    uint64 internal poolId;
    int24 internal tickSpacing;

    // --- exposed seller state (so the claim test can close the short to free maxRedeem, B4) ---
    address internal seller;
    TokenId internal sellerShortId;
    int24 internal chunkStrike;

    // --- fee generation + the rebuilt swap key ---
    V4SwapHelper internal swapHelper;
    PoolKey internal poolKey;

    function setUp() public virtual {
        // 1. Fork Base FIRST — the helper deploys against the live PoolManager.
        vm.createSelectFork(vm.rpcUrl("base"), BASE_FORK_BLOCK);

        // 2. Run the factory choreography behind the helper; capture ONLY seam-safe handles (M-3).
        PanopticV2DeployHelper helper = new PanopticV2DeployHelper();
        PanopticV2DeployHelper.Deployed memory d = helper.deployPanopticV2();
        deployedPool = d.pool;
        ct0 = d.ct0;
        ct1 = d.ct1;
        token0 = d.token0;
        token1 = d.token1;
        ccop = d.ccop;
        poolId = d.poolId;
        tickSpacing = d.tickSpacing;

        // 3. Rebuild the swap key (ordering already settled: token0 < token1) and the fee helper.
        poolKey = PoolKey({
            currency0: Currency.wrap(token0),
            currency1: Currency.wrap(token1),
            fee: 500,
            tickSpacing: tickSpacing,
            hooks: IHooks(address(0))
        });
        swapHelper = new V4SwapHelper(IPoolManager(BASE_POOL_MANAGER));

        // 4. Seed the seller short (the WRAP-02 prerequisite) at the wrapper's target chunk.
        _seedSellerShort();
    }

    /// @dev Mint a SELLER SHORT (isLong=0) at the OTM tickSpacing-aligned chunk so a later same-chunk long
    ///      can remove its SFPM-sold liquidity (Pattern 2). Without this the long reverts
    ///      NotEnoughLiquidityInChunk() (Pitfall 1). The seller + its tokenId are exposed for B4 close.
    function _seedSellerShort() internal {
        seller = makeAddr("longGammaSeller");
        int24 currentTick = IPanopticData(deployedPool).getCurrentTick();
        // STRIKE_OFFSET ticks above current, aligned to tickSpacing (OTM ⇒ single-sided, no mint-time underflow).
        chunkStrike = int24(((currentTick + STRIKE_OFFSET) / tickSpacing) * tickSpacing);

        // addLeg(self, legIndex, optionRatio, asset, isLong, tokenType, riskPartner, strike, width)
        // isLong=0 ⇒ SHORT (the long counterparty), optionRatio=1, asset=0, tokenType=0, riskPartner=0.
        sellerShortId =
            TokenId.wrap(0).addPoolId(poolId).addLeg(0, 1, 0, 0, /*isLong*/ 0, 0, chunkStrike, int24(uint24(CHUNK_WIDTH)));

        deal(token0, seller, type(uint104).max);
        deal(token1, seller, type(uint104).max);

        vm.startPrank(seller);
        IERC20(token0).approve(deployedPool, type(uint256).max);
        IERC20(token1).approve(deployedPool, type(uint256).max);
        IERC20(token0).approve(address(ct0), type(uint256).max);
        IERC20(token1).approve(address(ct1), type(uint256).max);
        ct0.deposit(type(uint104).max, seller);
        ct1.deposit(type(uint104).max, seller);

        (TokenId[] memory list, TokenId[] memory finalIds, uint128[] memory sizes, int24[3][] memory limits) =
            _oneLegArgs(sellerShortId, SELLER_SIZE);
        // PositionBalance==0 ⇒ mint.
        IPanopticData(deployedPool).dispatch(list, finalIds, sizes, limits, false, 0);
        vm.stopPrank();
    }

    /// @dev Build the length-1 dispatch arrays for a single-leg mint: list==finalIds==[id], size, wide limits.
    function _oneLegArgs(TokenId id, uint128 size)
        internal
        pure
        returns (TokenId[] memory list, TokenId[] memory finalIds, uint128[] memory sizes, int24[3][] memory limits)
    {
        list = new TokenId[](1);
        list[0] = id;
        finalIds = new TokenId[](1);
        finalIds[0] = id;
        sizes = new uint128[](1);
        sizes[0] = size;
        limits = new int24[3][](1);
        limits[0][0] = TICK_LIMIT_LOW;
        limits[0][1] = TICK_LIMIT_HIGH;
        limits[0][2] = EFF_LIQ_LIMIT;
    }

    /// @dev The wrapper's LONG (isLong=1) tokenId at the SAME chunk as the seller short (identical
    ///      strike/width/tokenType) so the long removes the seller's liquidity cleanly (Pattern 2).
    function _longTokenId() internal view returns (TokenId) {
        // addLeg(self, legIndex, optionRatio, asset, isLong, tokenType, riskPartner, strike, width)
        // isLong is the 4th explicit arg (index 4 below) — set it to 1 for the LONG; all other middle
        // fields match the seller short (asset=0, tokenType=0, riskPartner=0) so it is the SAME chunk.
        return TokenId.wrap(0).addPoolId(poolId).addLeg(
            0, 1, 0, /*isLong*/ 1, /*tokenType*/ 0, /*riskPartner*/ 0, chunkStrike, int24(uint24(CHUNK_WIDTH))
        );
    }

    /// @dev Close the seeded seller short (size→0 ⇒ burn) so `s_depositedAssets` is freed before the
    ///      wrapper's redeem, lifting the pool-wide `maxRedeem` cap (B4). Empty final list ⇒ position closed.
    function _closeSellerShort() internal {
        uint128[] memory burnSizes = new uint128[](1);
        burnSizes[0] = 0;
        TokenId[] memory toList = new TokenId[](1);
        toList[0] = sellerShortId;
        TokenId[] memory emptyFinal = new TokenId[](0);
        int24[3][] memory limits = new int24[3][](1);
        limits[0][0] = TICK_LIMIT_LOW;
        limits[0][1] = TICK_LIMIT_HIGH;
        limits[0][2] = EFF_LIQ_LIMIT;

        vm.prank(seller);
        IPanopticData(deployedPool).dispatch(toList, emptyFinal, burnSizes, limits, false, 0);
    }
}
