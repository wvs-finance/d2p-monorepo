// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {IERC4626} from "@openzeppelin/contracts/interfaces/IERC4626.sol";

// v4-core
import {IPoolManager} from "v4-core/interfaces/IPoolManager.sol";
import {PoolKey} from "v4-core/types/PoolKey.sol";

// borrowed Panoptic V2 core (CWIA factory choreography — §A/§B). This IS the deploy seam, so
// importing the concretes here is correct/intended; the SEAM TEST never imports this file (M-3).
import {SemiFungiblePositionManager} from "@contracts/SemiFungiblePositionManagerV4.sol";
import {PanopticPool} from "@contracts/PanopticPool.sol";
import {CollateralTracker} from "@contracts/CollateralTracker.sol";
import {RiskEngine} from "@contracts/RiskEngine.sol";
import {PanopticFactory} from "@contracts/PanopticFactoryV4.sol";
import {ISemiFungiblePositionManager} from "@contracts/interfaces/ISemiFungiblePositionManager.sol";
import {IRiskEngine} from "@contracts/interfaces/IRiskEngine.sol";
import {Pointer} from "@types/Pointer.sol";

// shared pool builder (mn-C) + full-range LP seed (M-1) + mock cCOP
import {PoolKeyLib} from "./PoolKeyLib.sol";
import {V4LpHelper} from "./V4LpHelper.sol";
import {MockCcop} from "../../mocks/MockCcop.sol";

/// @title PanopticV2DeployHelper — REAL factory-choreography deploy of a borrowed Panoptic V2 pool.
/// @notice 07-RESEARCH-DEPLOY §A: `PanopticPool`/`CollateralTracker` are ClonesWithImmutableArgs proxies,
///         so a WORKING pool comes ONLY from `PanopticFactory.deployNewPool`. The only `new PanopticPool`
///         /`new CollateralTracker` here are the MASTER COPIES the factory clones. The helper deploys its
///         OWN `MockCcop`, builds a FRESH cCOP/USDC `PoolKey` via the shared `PoolKeyLib` (mn-C — identical
///         ordering to Plan 04), `PoolManager.initialize`s it, seeds full-range LP via `V4LpHelper` (M-1),
///         then calls `factory.deployNewPool`. It hands back seam-safe types (B-1): the pool as an `address`
///         (consumed as `IPanopticData`), ct0/ct1 as `IERC4626`, the token/ccop addresses, and the `poolId`.
/// @dev `vegoid` is a RiskEngine CONSTANT (=4, §G) read as `re.vegoid()` inside the factory — never a param.
contract PanopticV2DeployHelper is Test {
    // --- Verified Base mainnet (chainId 8453) addresses (07-RESEARCH §1; same as Plan 04) ---
    address internal constant BASE_POOL_MANAGER = 0x498581fF718922c3f8e6A244956aF099B2652b2b;
    address internal constant BASE_USDC = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913; // native USDC (6 dp)

    // --- §B demo constructor args (verbatim @fe55774) ---
    uint256 internal constant SFPM_MIN_TICKFILL = 10**13;
    uint256 internal constant SFPM_NATIVE_TICKFILL = 10**13;
    uint256 internal constant SFPM_SUPPLY_MULT = 0;
    uint256 internal constant CT_COMMISSION_FEE = 10;
    uint256 internal constant RE_CROSS_BUFFER0 = 10_000_000;
    uint256 internal constant RE_CROSS_BUFFER1 = 10_000_000;

    // --- Full-range LP seed (M-1; matches Plan 04's SEEDED_LIQUIDITY=1_000_000 ether so mints clear solvency) ---
    int128 internal constant SEEDED_LIQUIDITY = int128(int256(1_000_000 ether));
    uint256 internal constant FUND_AMOUNT = type(uint128).max;

    /// @notice Seam-safe handles handed back to the M-3 base (B-1: ct0/ct1 are IERC4626, pool is an address).
    struct Deployed {
        address pool; // consumed as IPanopticData
        IERC4626 ct0; // collateral for currency0 (never the concrete CollateralTracker)
        IERC4626 ct1; // collateral for currency1
        address token0;
        address token1;
        address ccop;
        uint64 poolId; // for building the TokenId without a concrete import
        int24 tickSpacing;
    }

    /// @dev Deploy the one-time infra (master copies + factory + RiskEngine) — split out to cap stack depth.
    function _deployInfra() internal returns (PanopticFactory factory, RiskEngine re) {
        IPoolManager manager = IPoolManager(BASE_POOL_MANAGER);
        SemiFungiblePositionManager sfpm =
            new SemiFungiblePositionManager(manager, SFPM_MIN_TICKFILL, SFPM_NATIVE_TICKFILL, SFPM_SUPPLY_MULT);
        // master-copy implementations the factory clones (the ONLY `new PanopticPool`/`new CollateralTracker`):
        address poolReference = address(new PanopticPool(ISemiFungiblePositionManager(address(sfpm))));
        address collateralReference = address(new CollateralTracker(CT_COMMISSION_FEE));
        factory = new PanopticFactory(
            sfpm, manager, poolReference, collateralReference, new bytes32[](0), new uint256[][](0), new Pointer[][](0)
        );
        re = new RiskEngine(RE_CROSS_BUFFER0, RE_CROSS_BUFFER1, address(0), address(0));
    }

    /// @notice Run the §B+§D factory choreography and return seam-safe handles.
    function deployPanopticV2() external returns (Deployed memory d) {
        IPoolManager manager = IPoolManager(BASE_POOL_MANAGER);
        (PanopticFactory factory, RiskEngine re) = _deployInfra();

        // ---- PER-POOL: helper builds its OWN pool (mn-C) ----
        MockCcop ccop = new MockCcop();
        (PoolKey memory poolKey, uint160 sqrtPriceX96,) = PoolKeyLib.buildCcopUsdcKey(address(ccop), BASE_USDC);

        // REQUIRED before deployNewPool — else it reverts PoolNotInitialized.
        manager.initialize(poolKey, sqrtPriceX96);

        // seed full-range UniV4 liquidity (M-1) so the later mint clears _validateSolvency.
        {
            V4LpHelper lp = new V4LpHelper(manager);
            deal(BASE_USDC, address(lp), FUND_AMOUNT);
            ccop.mint(address(lp), FUND_AMOUNT);
            lp.addFullRangeLiquidity(poolKey, SEEDED_LIQUIDITY);
        }

        // factory does SFPM.initializeAMMPool(key, re.vegoid()) → clone2 both CTs → clone3 the pool → init all three.
        PanopticPool pp = factory.deployNewPool(poolKey, IRiskEngine(address(re)), uint96(block.timestamp));

        // ---- return seam-safe handles (B-1) ----
        CollateralTracker c0 = pp.collateralToken0();
        d.pool = address(pp);
        d.ct0 = IERC4626(address(c0));
        d.ct1 = IERC4626(address(pp.collateralToken1()));
        d.token0 = c0.token0();
        d.token1 = c0.token1();
        d.ccop = address(ccop);
        d.poolId = pp.poolId();
        d.tickSpacing = poolKey.tickSpacing;
    }
}
