// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {IPoolManager} from "v4-core/interfaces/IPoolManager.sol";
import {PoolKey} from "v4-core/types/PoolKey.sol";
import {PoolId} from "v4-core/types/PoolId.sol";
import {StateLibrary} from "v4-core/libraries/StateLibrary.sol";
import {V4StateReader} from "@libraries/V4StateReader.sol";
import {MockCcop} from "../mocks/MockCcop.sol";
import {PoolKeyLib} from "./helpers/PoolKeyLib.sol";
import {V4LpHelper} from "./helpers/V4LpHelper.sol";

/// @dev BTT spec: test/instrument/CcopUsdcPool.fork.tree
/// @notice FORK-02: deploy our OWN cCOP-USDC UniV4 pool on the Base fork and prove a consumer
///         can read its initialized state via the borrowed V4StateReader getSqrtPriceX96 +
///         v4-core StateLibrary getLiquidity (NO v4-periphery state-view path, B-2).
contract CcopUsdcPoolinitializeAndReadState is Test {
    using StateLibrary for IPoolManager;

    // --- Verified Base mainnet (chainId 8453) addresses, 07-RESEARCH section 1 ---
    address internal constant BASE_POOL_MANAGER = 0x498581fF718922c3f8e6A244956aF099B2652b2b;
    address internal constant BASE_USDC = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913; // native USDC (6 dp)
    // NO BASE_STATE_VIEW constant — v4-periphery state-view path is dropped (B-2).

    // --- Pinned Base fork block (M-4: Solidity constant, reused from the Plan-03 harness) ---
    uint256 internal constant BASE_FORK_BLOCK = 46700000;

    // --- Full-range LP seed (M-1): STATED concrete amount so Plan 05 sizes its mint against it ---
    // SEEDED_LIQUIDITY is the full-range liquidityDelta minted via V4LpHelper. The helper is funded
    // with FUND_AMOUNT of BOTH tokens (deal USDC 6dp + MockCcop.mint 18dp) before unlock. This mirrors
    // the audited V4 test's ~1_000_000-ether-scale full-range seed.
    int128 internal constant SEEDED_LIQUIDITY = int128(int256(1_000_000 ether));
    uint256 internal constant FUND_AMOUNT = type(uint128).max; // ample for both legs at full range

    MockCcop internal ccop;

    function setUp() public {
        vm.createSelectFork(vm.rpcUrl("base"), BASE_FORK_BLOCK);
        ccop = new MockCcop();
    }

    /// @dev bulloak BTT ancestor `given` branch — kept as a no-op modifier so `bulloak check` maps
    ///      the tree's top `given` 1:1; the actual setup runs in setUp()/the proof fn.
    modifier givenMockCcopDeployedAndAHooklessCCOP_USDCPoolKeyBuiltViaPoolKeyLibWithCurrenciesAscendingByRuntimeAddressFee500TickSpacing10(
    ) {
        _;
    }

    /// @notice The bulloak branch fns delegate to the single end-to-end FORK-02 proof so the BTT
    ///         mapping stays 1:1 while one test exercises the whole deploy→read→round-trip→LP flow.
    function test_WhenPoolManagerInitializeIsCalledWithSqrtPriceX96EncodingCCOPPerUSDNear4000()
        external
        givenMockCcopDeployedAndAHooklessCCOP_USDCPoolKeyBuiltViaPoolKeyLibWithCurrenciesAscendingByRuntimeAddressFee500TickSpacing10
    {
        test_ccopUsdcPool_initialized_state_readable();
    }

    function test_GivenThePoolIsInitialized()
        external
        givenMockCcopDeployedAndAHooklessCCOP_USDCPoolKeyBuiltViaPoolKeyLibWithCurrenciesAscendingByRuntimeAddressFee500TickSpacing10
    {
        test_ccopUsdcPool_initialized_state_readable();
    }

    function test_GivenFull_rangeLiquidityIsLPdViaV4LpHelper() external {
        test_ccopUsdcPool_initialized_state_readable();
    }

    /// @notice FORK-02 proof (07-VALIDATION --match-test): deploy MockCcop, build a hookless cCOP/USDC
    ///         PoolKey via the shared PoolKeyLib (runtime currency ordering), initialize at ~1/4000,
    ///         LP full-range liquidity via V4LpHelper, then read sqrtPriceX96>0 (V4StateReader) +
    ///         liquidity>0 (StateLibrary) AND assert the decoded human rate is in [3000,5000].
    function test_ccopUsdcPool_initialized_state_readable() public {
        // --- build the PoolKey + sqrtPriceX96 via the shared builder (mn-C, runtime ordering) ---
        (PoolKey memory key, uint160 sqrtPriceX96, bool ccopIsCurrency0) =
            PoolKeyLib.buildCcopUsdcKey(address(ccop), BASE_USDC);

        // --- initialize our own cCOP/USDC pool on the live Base PoolManager ---
        IPoolManager(BASE_POOL_MANAGER).initialize(key, sqrtPriceX96);

        PoolId id = key.toId();

        // --- B-2 read path: V4StateReader.getSqrtPriceX96 (NOT v4-periphery state-view) ---
        uint160 sqrtP = V4StateReader.getSqrtPriceX96(IPoolManager(BASE_POOL_MANAGER), id);
        assertGt(sqrtP, 0, "pool initialized: sqrtPriceX96 > 0");

        // --- mn-3 round-trip: decode through the runtime ordering + 6dp/18dp scale to a human rate ---
        uint256 humanRate = PoolKeyLib.decodeHumanRate(sqrtP, ccopIsCurrency0);
        assertGe(humanRate, 3000, "decoded cCOP/USD rate >= 3000 (catches a 1e12 ordering error)");
        assertLe(humanRate, 5000, "decoded cCOP/USD rate <= 5000");

        // --- M-1 full-range LP via the minimal V4LpHelper (prescribed; Plan 05 / Phase 8 depend on liquidity>0) ---
        V4LpHelper lp = new V4LpHelper(IPoolManager(BASE_POOL_MANAGER));
        deal(BASE_USDC, address(lp), FUND_AMOUNT);
        ccop.mint(address(lp), FUND_AMOUNT);
        lp.addFullRangeLiquidity(key, SEEDED_LIQUIDITY);

        // --- read liquidity via v4-core StateLibrary (resolves through the v4-core/ alias) ---
        uint128 liq = IPoolManager(BASE_POOL_MANAGER).getLiquidity(id);
        assertGt(liq, 0, "full-range LP seeded: liquidity > 0");
    }
}
