// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console2} from "forge-std/Test.sol";

import {PoolKey} from "v4-core/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "v4-core/types/PoolId.sol";
import {BalanceDelta} from "v4-core/types/BalanceDelta.sol";
import {IHooks} from "v4-core/interfaces/IHooks.sol";
import {Currency} from "v4-core/types/Currency.sol";
import {TickMath} from "v4-core/libraries/TickMath.sol";

import {PanopticFactoryV4} from "@contracts/PanopticFactoryV4.sol";
import {PanopticPoolV2} from "@contracts/PanopticPool.sol";
import {IRiskEngine} from "@contracts/interfaces/IRiskEngine.sol";
import {Errors} from "@libraries/Errors.sol";

import {DeployProtocol} from "@panoptic/script/DeployProtocol.s.sol";

import {HedgeLegParams} from "../../src/types/HedgeLegParams.sol";
import {PayoffTerms} from "../../src/types/PayoffTerms.sol";
import {TokenId, TokenIdLibrary} from "@types/TokenId.sol";

import {PanopticQuery} from "@panoptic-periphery/PanopticQuery.sol";
import {RiskManagement} from "../../src/RiskManagement.sol";
import {IMacroThesis} from "../../src/interfaces/IMacroThesis.sol";
import {PositionInfo} from "../../src/types/PositionInfo.sol";
import {IERC20Partial} from "@tokens/interfaces/IERC20Partial.sol";

import {PolygonPools} from "../../src/libraries/PolygonPools.sol";
import {MacroHedgeExecutor} from "../../src/MacroHedgeExecutor.sol";
import {MockPlatform} from "../mocks/MockPlatform.sol";
import {MockRegimeOracle} from "../mocks/MockRegimeOracle.sol";
import {IRegimeOracle} from "../../src/interfaces/IRegimeOracle.sol";
import {MockSurpriseOracle} from "../mocks/MockSurpriseOracle.sol";

/// @dev BTT spec: test/fork/MacroHedgeExecutor.fork.tree
/// @notice EXEC-01 + EXEC-02 fork proof, the `test__takeDemoPosition__Succeeds` lineage promoted to
///         run THROUGH the deployable `MacroHedgeExecutor` (the executor is the dispatch caller AND
///         owns the CollateralTracker shares). Clones the demo `setUp`/`_init_world` recipe; the only
///         shift is `receiver = address(executor)` on the collateral deposits, the demo's vestigial
///         `address(this)` deposit dropped, and a MockPlatform for the SomniaAgentConsumer base ctor
///         (the mint path never touches PLATFORM, so it is platform-agnostic).
contract MacroHedgeExecutorForkTestdeployableMint is Test {
    using TokenIdLibrary for TokenId;

    string constant STATE_FILE = "fork-state/polygon-panoptic.json";
    uint256 constant POST_POOL_INIT_BLOCK = 86_900_000;

    uint256 DEFAULT_FUND_USD = 10_000e6;
    uint256 DEFAULT_FUND_COP = 10_000e18;

    address constant POLYGON_POOL_MANAGER = 0x67366782805870060151383F4BbFF9daB53e5cD6;
    address constant POLYGON_USDC = 0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359; // 6 decimals
    address constant POLYGON_WCOP = 0x8a1D45e102e886510e891d2Ec656a708991e2D76; // 18 decimals
    address constant POLYGON_UNIV3_FACTORY = 0x1F98431c8aD98523631AE4a59f267346ea31F984;
    address constant RISK_ENGINE_ADDR = 0x416C42991d05b31E9A6dC209e91AD22b79D87Ae6;
    address constant FACTORY_V4_ADDR = 0x978e3286EB805934215a88694d80b09aDed68D90;

    PanopticFactoryV4 panopticFactory = PanopticFactoryV4(FACTORY_V4_ADDR);
    PoolKey wcopUsdcKey;
    PanopticPoolV2 WCOP_USDC_PANOPTIC_POOL;
    bool forked;

    PanopticQuery panopticQuery;
    RiskManagement riskManagement;
    MockPlatform platform;
    MockRegimeOracle regimeOracle;
    MockSurpriseOracle surpriseOracle;
    MacroHedgeExecutor executor;
    ICollateralDeposit ct0;
    ICollateralDeposit ct1;
    uint256 $legIndex;

    // event mirrors (must match the executor's surface)
    event PositionMinted(address indexed owner, TokenId indexed positionId, uint128 positionSize);
    event RepresentativenessAssessed(uint256 indexed requestId, string rationale, bool representative);

    modifier onlyForked() {
        if (!forked) {
            console2.log("skipping forked test (ALCHEMY_API_KEY not set)");
            return;
        }
        _;
    }

    function _vegoid() internal view returns (uint8) {
        return IRiskEngine(RISK_ENGINE_ADDR).vegoid();
    }

    function setUp() public {
        try vm.envString("ALCHEMY_API_KEY") returns (string memory) {
            vm.createSelectFork(vm.rpcUrl("polygon"), POST_POOL_INIT_BLOCK);

            wcopUsdcKey = PoolKey({
                currency0: Currency.wrap(POLYGON_USDC),
                currency1: Currency.wrap(POLYGON_WCOP),
                fee: 3000,
                tickSpacing: 60,
                hooks: IHooks(address(0))
            });

            if (vm.exists(STATE_FILE)) {
                vm.loadAllocs(STATE_FILE);
                // loadAllocs occupies the deployer's low CREATE nonces; bump so per-test `new`
                // deployments land at fresh addresses (Pitfall 5).
                vm.setNonce(address(this), 64);
            } else {
                _deployCore();
                vm.dumpState(STATE_FILE);
            }

            require(FACTORY_V4_ADDR.code.length > 0, "panopticFactory has no code");
            require(RISK_ENGINE_ADDR.code.length > 0, "riskEngine has no code");
            forked = true;
        } catch {
            console2.log("Skipping fork tests: ALCHEMY_API_KEY not set in .env");
        }
    }

    function _deployCore() internal {
        vm.setEnv("UNIV4_POOL_MANAGER", vm.toString(POLYGON_POOL_MANAGER));
        vm.setEnv("UNIV3_FACTORY", vm.toString(POLYGON_UNIV3_FACTORY));
        vm.setEnv("GUARDIAN_ADMIN", vm.toString(address(this)));
        vm.setEnv("TREASURER", vm.toString(address(this)));
        new DeployProtocol().run();
        require(FACTORY_V4_ADDR.code.length > 0, "deploy: factory address drifted from constant");
    }

    /// @dev Stands up a fresh pool + query + risk manager + the deployable executor, then funds and
    ///      deposits collateral with `receiver = address(executor)` — the §1 collateral-ownership
    ///      shift (the executor is the dispatch caller AND the 4626 share owner). The demo's
    ///      vestigial `address(this)` deposit is DROPPED: the executor is the sole collateral owner.
    function _init_world() internal {
        panopticQuery = new PanopticQuery();
        WCOP_USDC_PANOPTIC_POOL = panopticFactory.deployNewPool(wcopUsdcKey, IRiskEngine(RISK_ENGINE_ADDR), 0);
        riskManagement = new RiskManagement(panopticQuery, WCOP_USDC_PANOPTIC_POOL);

        platform = new MockPlatform(0.01 ether);
        // a settable Z_t double — Stress mirrors Plan-03's demo of the regime-conditional width. The
        // executor reads the oracle only on the resolveFromMandate path; the direct resolveAndMint fork
        // proofs below never read it, so the value is for compile-correctness + Wave-3 reuse.
        regimeOracle = new MockRegimeOracle();
        regimeOracle.set(IRegimeOracle.Regime.Stress);
        surpriseOracle = new MockSurpriseOracle();
        executor = new MacroHedgeExecutor(
            address(platform),
            WCOP_USDC_PANOPTIC_POOL,
            riskManagement,
            _vegoid(),
            0.10e18,
            0.35e18,
            0.15e18,
            14_400,
            regimeOracle,
            surpriseOracle
        );

        ct0 = ICollateralDeposit(address(WCOP_USDC_PANOPTIC_POOL.collateralToken0()));
        ct1 = ICollateralDeposit(address(WCOP_USDC_PANOPTIC_POOL.collateralToken1()));

        _fundExecutor(address(executor), DEFAULT_FUND_USD, DEFAULT_FUND_COP);
    }

    /// @dev Fund + deposit collateral for an executor as `receiver` (it is the dispatch caller).
    function _fundExecutor(address who, uint256 fundUsd, uint256 fundCop) internal {
        deal(POLYGON_USDC, who, fundUsd);
        deal(POLYGON_WCOP, who, fundCop);
        vm.startPrank(who);
        IERC20Partial(POLYGON_USDC).approve(address(ct0), type(uint256).max);
        IERC20Partial(POLYGON_WCOP).approve(address(ct1), type(uint256).max);
        ct0.deposit(fundUsd, who);
        ct1.deposit(fundCop, who);
        vm.stopPrank();
    }

    /// @dev The demo's LONG CALL on cCOP/USD — underlyingMarket anchored to the Plan-01 constant.
    function _demoLegParams() internal view returns (HedgeLegParams memory legParams) {
        PayoffTerms memory terms = PayoffTerms({
            vol: 14_400, // sqrt = 120 tick std-dev
            horizonBlocks: 100, // sqrt = 10
            tickSpacing: 60, // matches the cornerstone pool
            asset: 0, // token0
            riskPartner: 0 // single leg is its own risk partner
        });
        legParams = HedgeLegParams({
            underlyingMarket: PolygonPools.POLYGON_WCOP_USDC_POOL_ID(),
            strikeWAD: uint256(4.1e18), // demo strike 4.100
            size: 100,
            economicTheory: IMacroThesis(address(0)),
            chainId: uint32(block.chainid),
            isLong: true,
            payoffTerms: terms
        });
    }

    /*//////////////////////////////////////////////////////////////
                       SHARED HELPERS (alias + leaf reuse)
    //////////////////////////////////////////////////////////////*/

    /// @dev EXEC-01: mint the demo position THROUGH the executor; assert ownership + events.
    function _runFundedMint() internal returns (TokenId positionId) {
        _init_world();
        HedgeLegParams memory legParams = _demoLegParams();

        // emit-expectation: PositionMinted + RepresentativenessAssessed(requestId == 0) on the direct path.
        vm.expectEmit(true, false, false, false, address(executor));
        emit RepresentativenessAssessed(0, "", true);
        vm.expectEmit(true, false, false, false, address(executor));
        emit PositionMinted(address(executor), TokenId.wrap(0), 1e6);

        positionId = executor.resolveAndMint(legParams, $legIndex, 1e6);

        assertGt(WCOP_USDC_PANOPTIC_POOL.numberOfLegs(address(executor)), 0, "executor owns the minted position");
    }

    /*//////////////////////////////////////////////////////////////
            BTT LEAVES (bulloak-derived names satisfy the .tree)
    //////////////////////////////////////////////////////////////*/

    function test_WhenResolveAndMintIsCalledWithTheDemoLongCallParamsAndAPositiveSize() external onlyForked {
        _runFundedMint();
    }

    function test_WhenQuoteCollateralRequirementsIsReadAfterTheFundedMint() external onlyForked {
        TokenId positionId = _runFundedMint();
        // EXEC-02 (a) — POST-mint margin read returns a BalanceDelta WITHOUT reverting.
        BalanceDelta marginDelta = riskManagement.quoteCollateralRequirements(
            PositionInfo({owner: address(executor), Id: positionId}), positionId.strike($legIndex)
        );
        // touch the value so the read is not optimized away
        marginDelta;
    }

    function test_WhenASecondExecutorIsFundedWithNonzeroCollateralFarBelowThePositionRequirementAndCalledWithTheIdenticalParams(
    ) external onlyForked {
        // funded twin establishes the params mint successfully (numberOfLegs > 0) — the contrast that
        // makes the negative gate non-vacuous + provably collateral-driven.
        _runFundedMint();

        HedgeLegParams memory legParams = _demoLegParams();

        // SECOND executor, IDENTICAL params, nonzero-but-far-below-requirement collateral. The 9-arg
        // ctor reuses the _init_world oracle field (the AccountInsolvent gate is collateral-driven; the
        // regime/oracle values do not change that behavior).
        MacroHedgeExecutor underfundedExecutor = new MacroHedgeExecutor(
            address(platform),
            WCOP_USDC_PANOPTIC_POOL,
            riskManagement,
            _vegoid(),
            0.10e18,
            0.35e18,
            0.15e18,
            14_400,
            regimeOracle,
            surpriseOracle
        );
        // nonzero so the ERC20 transfer + 4626 share mint succeed (NOT BelowMinimumRedemption),
        // far below requirement so _validateSolvency is the first collateral-sensitive gate to fail.
        _fundExecutor(address(underfundedExecutor), DEFAULT_FUND_USD / 1000, DEFAULT_FUND_COP / 1000);

        // selector-only match (forge 1.5.1: expectPartialRevert matches the 4-byte selector and
        // tolerates ANY args, so it accepts whichever AccountInsolvent overload fires — (0,0)/(solvent,
        // numberOfTicks)/(solvent,4) all share one selector; expectRevert(bytes4) would require an
        // EXACT data match and reject the args, which is NOT what the plan wants).
        vm.expectPartialRevert(Errors.AccountInsolvent.selector);
        underfundedExecutor.resolveAndMint(legParams, $legIndex, 1e6);

        // AFTER the revert, outside the expectRevert: no position persists (atomic unwind).
        assertEq(WCOP_USDC_PANOPTIC_POOL.numberOfLegs(address(underfundedExecutor)), 0, "no position persisted");
    }

    function test_WhenResolveAndMintIsCalledWithLegParamsSizeExceedingOneHundredTwentySeven() external onlyForked {
        _init_world();
        HedgeLegParams memory legParamsWithSize128 = _demoLegParams();
        legParamsWithSize128.size = 128; // optionRatio is 7-bit; % 128 silently wraps to 0 — the guard catches it

        vm.expectRevert(bytes("optionRatio overflow"));
        executor.resolveAndMint(legParamsWithSize128, $legIndex, 128);
    }

    /*//////////////////////////////////////////////////////////////
        PLAN-NAMED ALIASES (the --match-test commands in the plan)
    //////////////////////////////////////////////////////////////*/

    /// @notice EXEC-01 — the demo lineage, green through the deployable executor.
    function test__takeDemoPosition__Succeeds() external onlyForked {
        _runFundedMint();
    }

    /// @notice EXEC-02 — (a) post-mint BalanceDelta read + (b) under-funded AccountInsolvent atomic gate.
    function test_margin() external onlyForked {
        // (a) post-mint margin read
        TokenId positionId = _runFundedMint();
        BalanceDelta marginDelta = riskManagement.quoteCollateralRequirements(
            PositionInfo({owner: address(executor), Id: positionId}), positionId.strike($legIndex)
        );
        marginDelta;

        // (b) under-funded twin, identical params, nonzero-but-insufficient collateral → AccountInsolvent
        HedgeLegParams memory legParams = _demoLegParams();
        MacroHedgeExecutor underfundedExecutor = new MacroHedgeExecutor(
            address(platform),
            WCOP_USDC_PANOPTIC_POOL,
            riskManagement,
            _vegoid(),
            0.10e18,
            0.35e18,
            0.15e18,
            14_400,
            regimeOracle,
            surpriseOracle
        );
        _fundExecutor(address(underfundedExecutor), DEFAULT_FUND_USD / 1000, DEFAULT_FUND_COP / 1000);

        // selector-only match (see the BTT-leaf twin: forge 1.5.1 expectPartialRevert, tolerates args).
        vm.expectPartialRevert(Errors.AccountInsolvent.selector);
        underfundedExecutor.resolveAndMint(legParams, $legIndex, 1e6);

        assertEq(WCOP_USDC_PANOPTIC_POOL.numberOfLegs(address(underfundedExecutor)), 0, "no position persisted");
    }

    /// @notice EDGE (Pitfall 4) — size == 128 reverts on the shared-sink optionRatio guard.
    function test_resolveAndMint_sizeGuard() external onlyForked {
        _init_world();
        HedgeLegParams memory legParamsWithSize128 = _demoLegParams();
        legParamsWithSize128.size = 128;
        vm.expectRevert(bytes("optionRatio overflow"));
        executor.resolveAndMint(legParamsWithSize128, $legIndex, 128);
    }
}

/// @dev Declared AFTER the test contract so bulloak anchors the tree root on
///      `MacroHedgeExecutorForkTestdeployableMint` (the 08-06/08-07 helper-after-test precedent).
interface ICollateralDeposit {
    function deposit(uint256 assets, address receiver) external returns (uint256);
}
