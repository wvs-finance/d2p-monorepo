// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console2} from "forge-std/Test.sol";
import {Vm} from "forge-std/Vm.sol";

import {PoolKey} from "v4-core/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "v4-core/types/PoolId.sol";
import {BalanceDelta, BalanceDeltaLibrary} from "v4-core/types/BalanceDelta.sol";
import {IHooks} from "v4-core/interfaces/IHooks.sol";
import {Currency} from "v4-core/types/Currency.sol";

import {TickMath} from "v4-core/libraries/TickMath.sol";

import {PanopticFactoryV4} from "@contracts/PanopticFactoryV4.sol";
import {PanopticPoolV2} from "@contracts/PanopticPool.sol";
import {IRiskEngine} from "@contracts/interfaces/IRiskEngine.sol";

import {DeployProtocol} from "@panoptic/script/DeployProtocol.s.sol";

import {HedgeLegParams} from "../../src/types/HedgeLegParams.sol";
import {PayoffTerms} from "../../src/types/PayoffTerms.sol";
import {TokenId, TokenIdLibrary} from "@types/TokenId.sol";

import {StrategyBuilder} from "@panoptic-periphery/StrategyBuilder.sol";
import {PayoffTermsLib} from "../../src/libraries/PayoffTerms.sol";
import {PriceGridsLib} from "../../src/libraries/PriceGrids.sol";

import {PoolIdMappersLib} from "../../src/libraries/PoolIdMappers.sol";

import {PanopticQuery} from "@panoptic-periphery/PanopticQuery.sol";

import {RiskManagement} from "../../src/RiskManagement.sol";
import {IMacroThesis} from "../../src/interfaces/IMacroThesis.sol";
import {VolToWidthLib} from "../../src/libraries/VolToWidth.sol";


import {PositionInfo} from "../../src/types/PositionInfo.sol";
import {ERC1155} from "@tokens/ERC1155Minimal.sol";
import {IERC20Partial} from "@tokens/interfaces/IERC20Partial.sol";

// Phase-14 (14-03) — the mandate→geometry→mint lineage through the SHIPPED executor.
import {MacroHedgeExecutor} from "../../src/MacroHedgeExecutor.sol";
import {HedgeMandate} from "../../src/types/HedgeMandate.sol";
import {IRegimeOracle} from "../../src/interfaces/IRegimeOracle.sol";
import {MockRegimeOracle} from "../mocks/MockRegimeOracle.sol";
import {MockSurpriseOracle} from "../mocks/MockSurpriseOracle.sol";
import {MockPlatform} from "../mocks/MockPlatform.sol";
import {IAgentRequester, Request} from "../../src/interfaces/ISomniaAgents.sol";

contract DemoMacroHedgeExecutorForkTest is Test {
    using TokenIdLibrary for TokenId;
    using PoolIdLibrary  for PoolKey;
    string constant STATE_FILE = "fork-state/polygon-panoptic.json";
    uint256 constant POST_POOL_INIT_BLOCK = 86_900_000;

    uint256 DEFAULT_FUND_USD = 10_000e6;
    uint256 DEFAULT_FUND_COP = 10_000e18;
    
    address constant POLYGON_POOL_MANAGER  = 0x67366782805870060151383F4BbFF9daB53e5cD6;
    address constant POLYGON_USDC          = 0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359; // 6 decimals
    address constant POLYGON_WCOP          = 0x8a1D45e102e886510e891d2Ec656a708991e2D76; // 18 decimals
    address constant POLYGON_UNIV3_FACTORY = 0x1F98431c8aD98523631AE4a59f267346ea31F984;
    address constant RISK_ENGINE_ADDR = 0x416C42991d05b31E9A6dC209e91AD22b79D87Ae6;
    address constant FACTORY_V4_ADDR  = 0x978e3286EB805934215a88694d80b09aDed68D90;

    function _vegoid() internal view returns (uint8) {
        return IRiskEngine(RISK_ENGINE_ADDR).vegoid();
    }


    PanopticFactoryV4 panopticFactory = PanopticFactoryV4(FACTORY_V4_ADDR);
    PoolKey           wcopUsdcKey;
    PanopticPoolV2    WCOP_USDC_PANOPTIC_POOL;
    bool              forked;

    PolygonConvexPositionResolverHarness positionResolver__VolVariant;
    PanopticQuery panopticQuery;
    RiskManagement riskManagement;
    TestCaseForDemoBuilder testCaseForDemo;
    uint256 $legIndex;

    modifier onlyForked() {
        if (!forked) {
            console2.log("skipping forked test (ALCHEMY_API_KEY not set)");
            return;
        }
        _;
    }

    function setUp() public {
        try vm.envString("ALCHEMY_API_KEY") returns (string memory) {
            vm.createSelectFork(vm.rpcUrl("polygon"), POST_POOL_INIT_BLOCK);

            wcopUsdcKey = PoolKey({
                currency0:   Currency.wrap(POLYGON_USDC),
                currency1:   Currency.wrap(POLYGON_WCOP),
                fee:         3000,
                tickSpacing: 60,
                hooks:       IHooks(address(0))
            });

            if (vm.exists(STATE_FILE)) {
                vm.loadAllocs(STATE_FILE); // reuse the previously deployed core — no redeploy
                // loadAllocs restores account state but the snapshot already occupies the test
                // deployer's low CREATE nonces (the DeployProtocol/PanopticQuery instances from the
                // run that produced it). Bump the nonce so per-test `new` deployments (PanopticQuery,
                // RiskManagement) land at fresh addresses instead of colliding with snapshot code.
                vm.setNonce(address(this), 64);
            } else {
                _deployCore();
                vm.dumpState(STATE_FILE); // snapshot for later runs
            }

            require(FACTORY_V4_ADDR.code.length > 0, "panopticFactory has no code");
            require(RISK_ENGINE_ADDR.code.length > 0, "riskEngine has no code");
            forked = true;
        } catch {
            console2.log("Skipping fork tests: ALCHEMY_API_KEY not set in .env");
        }
    }

    /// @dev Stand up the Panoptic V2 core via the production DeployProtocol script. Deterministic at
    ///      the pinned block, so the contracts land at the hardcoded constants; require() guards drift.
    function _deployCore() internal {
        vm.setEnv("UNIV4_POOL_MANAGER", vm.toString(POLYGON_POOL_MANAGER));
        vm.setEnv("UNIV3_FACTORY",      vm.toString(POLYGON_UNIV3_FACTORY));
        vm.setEnv("GUARDIAN_ADMIN",     vm.toString(address(this)));
        vm.setEnv("TREASURER",          vm.toString(address(this)));

        new DeployProtocol().run();

        require(FACTORY_V4_ADDR.code.length > 0, "deploy: factory address drifted from constant");
    }

    /// @dev Stands up a FRESH Panoptic pool per test. Deliberately NOT folded into the
    ///      dumpState snapshot: each test wants its own pool so it can mutate liquidity and
    ///      pool state independently without leaking across runs. Only the expensive,
    ///      immutable core (factory + risk engine) is cached via vm.dumpState/loadAllocs.
    ///      PanopticQuery is likewise deployed per-test (the cached path doesn't restore the
    ///      Solidity reference, and RiskManagement needs a live one).
    function _init_world() internal {
        panopticQuery = new PanopticQuery();
        WCOP_USDC_PANOPTIC_POOL = panopticFactory.deployNewPool(
            wcopUsdcKey, IRiskEngine(RISK_ENGINE_ADDR), 0
        );
        riskManagement = new RiskManagement(panopticQuery, WCOP_USDC_PANOPTIC_POOL);
        positionResolver__VolVariant = new PolygonConvexPositionResolverHarness();

        ICollateralDeposit ct0 = ICollateralDeposit(address(WCOP_USDC_PANOPTIC_POOL.collateralToken0()));
        ICollateralDeposit ct1 = ICollateralDeposit(address(WCOP_USDC_PANOPTIC_POOL.collateralToken1()));

        // Fund and deposit collateral for the test contract (used by quoteCollateralRequirements).
        deal(POLYGON_USDC, address(this), DEFAULT_FUND_USD);
        deal(POLYGON_WCOP, address(this), DEFAULT_FUND_COP);
        IERC20Partial(POLYGON_USDC).approve(address(ct0), type(uint256).max);
        IERC20Partial(POLYGON_WCOP).approve(address(ct1), type(uint256).max);
        ct0.deposit(DEFAULT_FUND_USD, address(this));
        ct1.deposit(DEFAULT_FUND_COP, address(this));

        // Fund and deposit collateral for the harness (msg.sender when it calls dispatch).
        address harness = address(positionResolver__VolVariant);
        deal(POLYGON_USDC, harness, DEFAULT_FUND_USD);
        deal(POLYGON_WCOP, harness, DEFAULT_FUND_COP);
        vm.startPrank(harness);
        IERC20Partial(POLYGON_USDC).approve(address(ct0), type(uint256).max);
        IERC20Partial(POLYGON_WCOP).approve(address(ct1), type(uint256).max);
        ct0.deposit(DEFAULT_FUND_USD, harness);
        ct1.deposit(DEFAULT_FUND_COP, harness);
        vm.stopPrank();
    }


    /// @notice e2e: a typed PayoffTerms blob decodes and round-trips through the resolver into a
    ///         well-formed single-leg TokenId. Proves the decode → derive → addLeg → read-back path
    ///         end-to-end (the demo's LONG CALL on cCOP/USD).
    function test_resolvePositionFromHedgeParams_volAware_wellFormedTokenId() external onlyForked {
        _init_world();
	testCaseForDemo = new TestCaseForDemoBuilder(wcopUsdcKey);
	PayoffTerms memory terms = testCaseForDemo.payoffTerms();
	HedgeLegParams memory legParams = testCaseForDemo.hedgeParams(terms);


	TokenId positionId = positionResolver__VolVariant.resolvePositionFromHedgeParams__CASE_VOL_AWARE(
            wcopUsdcKey.toId(),
            _vegoid(),
            legParams,
            $legIndex,
            WCOP_USDC_PANOPTIC_POOL,
            0  // size=0: compute TokenId only, skip dispatch
        );

	// Expected leg fields derived exactly as the resolver does, then read back from the TokenId.
        int24 expectedWidth = VolToWidthLib.volToWidth(terms.vol, terms.horizonBlocks, terms.tickSpacing);
        int24 _rawExpected = TickMath.getTickAtSqrtPrice(PriceGridsLib.exchangeRateToSqrtPriceX96(legParams.strikeWAD));
        int24 expectedStrike = (_rawExpected / terms.tickSpacing) * terms.tickSpacing;

        assertEq(positionId.countLegs(),          1,                "one active leg");
        assertEq(positionId.optionRatio($legIndex), legParams.size,  "optionRatio == size");
        assertEq(positionId.isLong($legIndex),      1,               "isLong bit set");
        assertEq(positionId.asset($legIndex),       terms.asset,     "asset bit");
        assertEq(positionId.riskPartner($legIndex), terms.riskPartner, "risk partner == self");
        assertEq(int256(positionId.width($legIndex)),  int256(expectedWidth),  "width round-trips");
        assertEq(int256(positionId.strike($legIndex)), int256(expectedStrike), "strike round-trips");
    }

    function test__takeDemoPosition__Succeeds() external onlyForked {
        _init_world();
        testCaseForDemo = new TestCaseForDemoBuilder(wcopUsdcKey);
        PayoffTerms memory terms = testCaseForDemo.payoffTerms();
        HedgeLegParams memory legParams = testCaseForDemo.hedgeParams(terms);

        TokenId positionId = positionResolver__VolVariant.resolvePositionFromHedgeParams__CASE_VOL_AWARE(
            wcopUsdcKey.toId(),
            _vegoid(),
            legParams,
            $legIndex,
            WCOP_USDC_PANOPTIC_POOL,
            1e6
        );

        BalanceDelta marginDelta = riskManagement.quoteCollateralRequirements(
            PositionInfo({owner: address(positionResolver__VolVariant), Id: positionId}),
            positionId.strike($legIndex)
        );
    }

    /*//////////////////////////////////////////////////////////////
        PHASE-14 (14-03) — mandate → geometry → mint THROUGH the executor
    //////////////////////////////////////////////////////////////*/

    /// @dev The decimal-gap-correct structural K_hi(4485) tick the executor mints (Fix C, fork-proven):
    ///      == RepresentativenessLib.structuralStrikeTick(CANONICAL_COP_USD*115/100, 60). EXACT — the
    ///      pre-snapped int24 the executor feeds the sink, so minted == emitted == asserted (zero drift).
    int24 constant EXPECTED_KHI_STRIKE = 360360;

    /// @dev The 8-param authoritative ExecutorDecided shape (Plan-02): uint8 regimeZt + the two int24
    ///      tick fields + the two honesty bools + the string rationale.
    bytes32 constant EXECUTOR_DECIDED_TOPIC0 =
        keccak256("ExecutorDecided(uint256,uint8,uint256,int24,int24,bool,bool,string)");

    /// @dev Deploy the wired executor against the per-test pool (mirrors the sibling EXEC fork file's
    ///      9-arg ctor order/values). `receiver = address(executor)` on the collateral deposits — the
    ///      executor is the dispatch caller AND the 4626 share owner. The platform is PARAMETERIZED so
    ///      the LLM-independence proof can inject a reverting mock. baseVol is the TICK-SPACE 14_400
    ///      (the demo's PayoffTerms.vol scale — a WAD-scale vol cast to uint88 would sqrt-clamp to 4095).
    function _deployExecutorWith(address platform) internal returns (MacroHedgeExecutor exec, MockRegimeOracle oracle) {
        oracle = new MockRegimeOracle();
        oracle.set(IRegimeOracle.Regime.Stress); // demo the regime-conditional (STRESS) width
        exec = new MacroHedgeExecutor(
            platform,
            WCOP_USDC_PANOPTIC_POOL,
            riskManagement,
            _vegoid(),
            0.10e18, // β₁(TRANQUIL) TEMPLATE
            0.35e18, // β₁(STRESS) TEMPLATE
            0.15e18, // target devaluation (15% OTM) TEMPLATE
            14_400, // baseVol — TICK-SPACE, the demo's PayoffTerms.vol scale
            oracle,
            new MockSurpriseOracle() // SHILLER surprise source (live mock; Wave-2 SHILLER mandates read it)
        );
        // fund + deposit collateral with receiver = the executor (it is the dispatch caller + 4626 owner).
        ICollateralDeposit ct0 = ICollateralDeposit(address(WCOP_USDC_PANOPTIC_POOL.collateralToken0()));
        ICollateralDeposit ct1 = ICollateralDeposit(address(WCOP_USDC_PANOPTIC_POOL.collateralToken1()));
        deal(POLYGON_USDC, address(exec), DEFAULT_FUND_USD);
        deal(POLYGON_WCOP, address(exec), DEFAULT_FUND_COP);
        vm.startPrank(address(exec));
        IERC20Partial(POLYGON_USDC).approve(address(ct0), type(uint256).max);
        IERC20Partial(POLYGON_WCOP).approve(address(ct1), type(uint256).max);
        ct0.deposit(DEFAULT_FUND_USD, address(exec));
        ct1.deposit(DEFAULT_FUND_COP, address(exec));
        vm.stopPrank();
    }

    /// @dev The default wiring — a benign MockPlatform(0.01 ether) for the SomniaAgentConsumer base ctor
    ///      (the mint path never touches PLATFORM, so it is platform-agnostic).
    function _deployExecutor() internal returns (MacroHedgeExecutor exec, MockRegimeOracle oracle) {
        return _deployExecutorWith(address(new MockPlatform(0.01 ether)));
    }

    /// @dev The cornerstone mandate — anchored to the wCOP/USDC pool; targetNotional is a CONCRETE
    ///      whole-USD value (50_000 / NOTIONAL_PER_RATIO(1_000) = 50 ⇒ optionRatio 50 ∈ [1,127]).
    function _demoMandate() internal view returns (HedgeMandate memory) {
        return HedgeMandate({
            economicTheory: IMacroThesis(address(uint160(0x6))), // POST_KEYNESIAN sentinel
            underlyingMarket: wcopUsdcKey.toId(), // == PolygonPools.POLYGON_WCOP_USDC_POOL_ID()
            targetNotional: 50_000,
            chainId: uint32(block.chainid), // 137
            isLong: true // Scenario 1
        });
    }

    /// @dev Substring scan — true iff `needle` occurs anywhere in `haystack` (no `string.indexOf`).
    function _contains(string memory haystack, string memory needle) internal pure returns (bool) {
        bytes memory h = bytes(haystack);
        bytes memory n = bytes(needle);
        if (n.length == 0) return true;
        if (n.length > h.length) return false;
        for (uint256 i = 0; i + n.length <= h.length; i++) {
            bool matched = true;
            for (uint256 j = 0; j < n.length; j++) {
                if (h[i + j] != n[j]) {
                    matched = false;
                    break;
                }
            }
            if (matched) return true;
        }
        return false;
    }

    /// @notice REPR-02 integration — resolveFromMandate mints a real wCOP/USDC Panoptic position through
    ///         the SHIPPED executor: the mint SUCCEEDS, the minted strike is the EXACT structural K_hi
    ///         tick 360360 (Fix C, fork-proven — NOT a loose band), and the executor owns a leg.
    /// @dev The 15%-OTM K_hi offset is LOAD-BEARING (Pitfall 1b): the leg-lower (~359760) sits ~1060
    ///      ticks clear of the live spot (~358700), so the short dispatch does NOT revert InputListFail()
    ///      (the input-validation boundary at leg-lower < spot+~140 ticks — NOT a liquidity revert).
    function test_resolveFromMandate_mintsThroughExecutor() external onlyForked {
        _init_world(); // FIRST — deploys the pool + riskManagement
        (MacroHedgeExecutor exec,) = _deployExecutor(); // THEN — consumes them in the ctor

        HedgeMandate memory mandate = _demoMandate();
        uint256 legIndex = 0;
        TokenId positionId = exec.resolveFromMandate(mandate, legIndex, 1e6); // 1e6 = positionSize (dispatch amount)

        assertEq(positionId.countLegs(), 1, "one active leg");
        assertEq(positionId.isLong(legIndex), 1, "isLong bit set");
        assertEq(
            int256(positionId.strike(legIndex)),
            int256(EXPECTED_KHI_STRIKE),
            "exact structural K_hi tick (Fix C, fork-proven)"
        );
        assertGt(WCOP_USDC_PANOPTIC_POOL.numberOfLegs(address(exec)), 0, "executor owns the minted position");
    }

    /// @notice REPR-01 surfacing — the 8-param ExecutorDecided fires on the mint path with the honesty
    ///         flag (nonErgodicDisclosed == true) and the TEMPLATE caveat in the rationale.
    function test_executorDecided_surfacesHonestyFlag() external onlyForked {
        _init_world(); // FIRST
        (MacroHedgeExecutor exec,) = _deployExecutor(); // THEN

        HedgeMandate memory mandate = _demoMandate();
        vm.recordLogs();
        exec.resolveFromMandate(mandate, 0, 1e6);

        Vm.Log[] memory logs = vm.getRecordedLogs();
        bool found;
        bool nonErgodicDisclosed;
        string memory rationale;
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].topics.length > 0 && logs[i].topics[0] == EXECUTOR_DECIDED_TOPIC0) {
                // non-indexed data: (uint8 regimeZt, uint256 inflationAdjustmentWad, int24 strikeTick,
                //                    int24 regimeWidth, bool parametricHedged, bool nonErgodicDisclosed,
                //                    string rationale) — requestId is the lone indexed topic.
                (,,,,, nonErgodicDisclosed, rationale) =
                    abi.decode(logs[i].data, (uint8, uint256, int24, int24, bool, bool, string));
                found = true;
                break;
            }
        }
        assertTrue(found, "ExecutorDecided fired on the mint path");
        assertTrue(nonErgodicDisclosed, "honesty flag: the non-ergodic tail is disclosed, NOT covered");
        assertTrue(_contains(rationale, "TEMPLATE"), "rationale carries the TEMPLATE caveat");
    }

    /// @notice REPR-02 size guard — a DIRECT resolveAndMint(size=128) reverts on the shared sink's
    ///         binding %128-mask protection. B3 LOCKED: the mandate path can NOT reach 128 (feasible-
    ///         OptionRatio always clamps), so the shared-sink guard is proven on the direct path. This
    ///         is the DELIBERATE functional twin of the EXEC-file test_resolveAndMint_sizeGuard
    ///         (test/fork/MacroHedgeExecutor.fork.t.sol) — both mint a size=128 leg and expectRevert the
    ///         "optionRatio overflow" string; VALIDATION owns THIS --match-test name in THIS file.
    function test_resolveAndMint_sizeOver127_reverts() external onlyForked {
        _init_world(); // FIRST
        (MacroHedgeExecutor exec,) = _deployExecutor(); // THEN

        HedgeLegParams memory bad = HedgeLegParams({
            underlyingMarket: wcopUsdcKey.toId(),
            strikeWAD: uint256(4.1e18),
            size: 128,
            economicTheory: IMacroThesis(address(uint160(0x6))),
            chainId: uint32(block.chainid),
            isLong: true,
            payoffTerms: PayoffTerms({vol: 14_400, horizonBlocks: 100, tickSpacing: 60, asset: 0, riskPartner: 0})
        });
        vm.expectRevert(bytes("optionRatio overflow"));
        exec.resolveAndMint(bad, 0, 1e6);
    }

    /// @notice REPR-02 LLM-independence — BEHAVIORAL (replaces the fragile sed-range grep). Deploy the
    ///         executor with the agent platform set to a REVERTING mock and assert resolveFromMandate
    ///         STILL mints the IDENTICAL geometry (strike 360360, same width). If the deterministic
    ///         geometry touched the LLM/platform it would revert; it does not — the geometry reads ONLY
    ///         the regime oracle + the immutable β₁ pair + the canonical constant.
    function test_resolveFromMandate_llmIndependentGeometry() external onlyForked {
        _init_world(); // FIRST
        MockRevertingPlatform reverting = new MockRevertingPlatform();
        (MacroHedgeExecutor exec,) = _deployExecutorWith(address(reverting)); // platform reverts on any call

        HedgeMandate memory mandate = _demoMandate();
        TokenId positionId = exec.resolveFromMandate(mandate, 0, 1e6); // would revert if geometry called the LLM

        assertEq(
            int256(positionId.strike(0)),
            int256(EXPECTED_KHI_STRIKE),
            "geometry is LLM-independent - identical strike with a reverting platform"
        );
        assertGt(WCOP_USDC_PANOPTIC_POOL.numberOfLegs(address(exec)), 0, "minted without touching the LLM");
    }

    /// @notice E2E-01 BASIC live-read — after the mandate mint, the executor's quoteMargin returns a
    ///         BalanceDelta WITHOUT reverting (a reverting read aborts the test), read at the just-minted
    ///         leg's OWN strike (positionId.strike(0), the structural K_hi 360360 — NOT a literal tick),
    ///         and the executor still owns the leg. This is the literal E2E-01 "basic live read
    ///         (mark/margin), NOT a monitoring agent" claim as a standalone named leaf. NO magnitude/PnL
    ///         assertion — a read-back of the just-minted position only.
    function test_quoteMargin_basicReadAfterMint() external onlyForked {
        _init_world(); // FIRST
        (MacroHedgeExecutor exec,) = _deployExecutor(); // THEN

        HedgeMandate memory mandate = _demoMandate();
        TokenId positionId = exec.resolveFromMandate(mandate, 0, 1e6);

        int24 strike = positionId.strike(0); // the EXACT minted strike (360360)
        BalanceDelta marginDelta = exec.quoteMargin(positionId, strike); // returning at all == not reverting
        // reference both components so marginDelta is not an unused-var warning; DO NOT assert a magnitude.
        console2.log("quoteMargin amount0", int256(BalanceDeltaLibrary.amount0(marginDelta)));
        console2.log("quoteMargin amount1", int256(BalanceDeltaLibrary.amount1(marginDelta)));

        assertGt(
            WCOP_USDC_PANOPTIC_POOL.numberOfLegs(address(exec)),
            0,
            "basic read: executor still owns the minted leg"
        );
    }

    /*//////////////////////////////////////////////////////////////
                  PHASE 16 (16-02) — SHILLER SCHOOL BRANCH
    //////////////////////////////////////////////////////////////*/

    /// @dev The SHILLER upside (+2σ) strike: structuralStrikeTick(3900*1.25, 60) == 361200 (25% OTM:
    ///      base 15% + 5%/σ * 2σ). Strictly ABOVE the PKE anchor 360360 — the load-bearing differentiation.
    int24 constant EXPECTED_SHILLER_UPSIDE_2SIGMA = 361200;
    /// @dev The SHILLER downside (−2σ) appreciation strike: structuralStrikeTick(3900*0.75, 60) == 356100.
    int24 constant EXPECTED_SHILLER_DOWNSIDE_2SIGMA = 356100;

    /// @dev Clone _demoMandate but flip the school sentinel to SHILLER (0x5).
    function _shillerMandate() internal view returns (HedgeMandate memory m) {
        m = _demoMandate();
        m.economicTheory = IMacroThesis(address(uint160(0x5)));
    }

    /// @dev Decode the strikeTick + rationale + nonErgodic from the FIRST ExecutorDecided in the logs.
    function _decodeExecutorDecided(Vm.Log[] memory logs)
        internal
        pure
        returns (bool found, int24 strikeTick, bool nonErgodicDisclosed, string memory rationale)
    {
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].topics.length > 0 && logs[i].topics[0] == EXECUTOR_DECIDED_TOPIC0) {
                (,, strikeTick,,, nonErgodicDisclosed, rationale) =
                    abi.decode(logs[i].data, (uint8, uint256, int24, int24, bool, bool, string));
                found = true;
                break;
            }
        }
    }

    /// @notice SHILLER-01 differentiation — a SHILLER mandate (s=+2σ) mints a strike DIFFERENT from the
    ///         PKE 360360 anchor (361200, further OTM on the depreciation side) through the SHARED Fix-C
    ///         sink, and the executor owns the leg. The school CHANGES the geometry, not just the label.
    function test_branch_shillerDiffersFromPke() public onlyForked {
        _init_world(); // FIRST
        (MacroHedgeExecutor exec,) = _deployExecutor(); // THEN
        // seed a +2σ surprise (actual − consensus == 2σ): consensus 0, actual 2e18, σ 1e18.
        MockSurpriseOracle(address(exec.surpriseOracle())).set(int256(2e18), int256(0), uint256(1e18));

        HedgeMandate memory mandate = _shillerMandate();
        vm.recordLogs();
        TokenId positionId = exec.resolveFromMandate(mandate, 0, 1e6);

        (bool found, int24 strikeTick,,) = _decodeExecutorDecided(vm.getRecordedLogs());
        assertTrue(found, "ExecutorDecided fired on the SHILLER path");
        assertEq(int256(strikeTick), int256(EXPECTED_SHILLER_UPSIDE_2SIGMA), "SHILLER +2sigma strike == 361200");
        assertTrue(strikeTick != EXPECTED_KHI_STRIKE, "SHILLER strike differs from the PKE 360360 anchor");
        assertEq(int256(positionId.strike(0)), int256(EXPECTED_SHILLER_UPSIDE_2SIGMA), "minted at the SHILLER strike");
        assertGt(WCOP_USDC_PANOPTIC_POOL.numberOfLegs(address(exec)), 0, "executor owns the SHILLER leg");
    }

    /// @notice SHILLER-01 per-school honesty — the SHILLER mandate carries the Shiller/UNVALIDATED
    ///         TEMPLATE rationale; the PKE mandate keeps its post-Keynesian rationale; BOTH disclose the
    ///         non-ergodic tail.
    function test_executorDecided_perSchoolHonesty() public onlyForked {
        _init_world(); // FIRST

        // --- SHILLER arm ---
        (MacroHedgeExecutor shillerExec,) = _deployExecutor();
        MockSurpriseOracle(address(shillerExec.surpriseOracle())).set(int256(2e18), int256(0), uint256(1e18));
        vm.recordLogs();
        shillerExec.resolveFromMandate(_shillerMandate(), 0, 1e6);
        (bool sFound,, bool sNonErgodic, string memory sRationale) = _decodeExecutorDecided(vm.getRecordedLogs());
        assertTrue(sFound, "SHILLER ExecutorDecided fired");
        assertTrue(_contains(sRationale, "Shiller"), "SHILLER rationale names Shiller");
        assertTrue(_contains(sRationale, "UNVALIDATED"), "SHILLER rationale carries UNVALIDATED");
        assertTrue(sNonErgodic, "SHILLER discloses the non-ergodic tail");

        // --- PKE arm (regression anchor wording) ---
        (MacroHedgeExecutor pkeExec,) = _deployExecutor();
        vm.recordLogs();
        pkeExec.resolveFromMandate(_demoMandate(), 0, 1e6);
        (bool pFound,, bool pNonErgodic, string memory pRationale) = _decodeExecutorDecided(vm.getRecordedLogs());
        assertTrue(pFound, "PKE ExecutorDecided fired");
        assertTrue(_contains(pRationale, "post-Keynesian"), "PKE rationale names post-Keynesian");
        assertTrue(pNonErgodic, "PKE discloses the non-ergodic tail");
    }

    /// @notice SHILLER-01 downside (open-Q3) — a SHILLER mandate with s=−2σ (CPI miss ⇒ appreciation).
    ///         Path A: the K_lo appreciation strike (356100) mints fork-safe. If the K_lo leg-upper
    ///         trips InputListFail on the fork, the impl falls to depreciation-only-v1 (s<0 ⇒ s=0 ⇒
    ///         360360) and THIS asserts that fallback instead. The chosen path is recorded in the SUMMARY.
    function test_branch_shillerDownsideFork() public onlyForked {
        _init_world(); // FIRST
        (MacroHedgeExecutor exec,) = _deployExecutor(); // THEN
        // seed a −2σ surprise: consensus 0, actual −2e18, σ 1e18.
        MockSurpriseOracle(address(exec.surpriseOracle())).set(int256(-2e18), int256(0), uint256(1e18));

        HedgeMandate memory mandate = _shillerMandate();
        vm.recordLogs();
        TokenId positionId = exec.resolveFromMandate(mandate, 0, 1e6);

        (bool found, int24 strikeTick,,) = _decodeExecutorDecided(vm.getRecordedLogs());
        assertTrue(found, "ExecutorDecided fired on the SHILLER downside path");
        // open-Q3 RESOLVED by fork evidence: path A (live K_lo below-spot mint at 356100) UNDERFLOWS
        // inside Panoptic's dispatch on the Polygon fork (leg-upper crosses spot on the opposite side
        // of the proven K_hi clearance). The impl switched to depreciation-only-v1: s<0 ⇒ s=0 ⇒ the
        // minimal-stance K_hi 360360. EXPECTED_SHILLER_DOWNSIDE_2SIGMA (356100) is retained as the
        // documented deferred-v2 two-sided-strip target.
        assertEq(
            int256(strikeTick),
            int256(EXPECTED_KHI_STRIKE),
            "SHILLER -2sigma collapses to the K_hi minimal stance 360360 (depreciation-only-v1)"
        );
        assertEq(int256(positionId.strike(0)), int256(strikeTick), "minted at the emitted SHILLER downside strike");
        assertGt(WCOP_USDC_PANOPTIC_POOL.numberOfLegs(address(exec)), 0, "executor owns the SHILLER downside leg");
    }

    /*//////////////////////////////////////////////////////////////
        bulloak-anchored leaves (delegate to the VALIDATION --match-test names above)
    //////////////////////////////////////////////////////////////*/

    function test_WhenASHILLERMandateWithAPositiveSurpriseResolves() external {
        test_branch_shillerDiffersFromPke();
    }

    function test_WhenBothSchoolsResolveTheSameScenario() external {
        test_executorDecided_perSchoolHonesty();
    }

    function test_WhenASHILLERMandateWithANegativeSurpriseResolves() external {
        test_branch_shillerDownsideFork();
    }

}

/// @dev A maximally-hostile agent platform whose EVERY external function reverts — the behavioral
///      LLM-independence proof (test_resolveFromMandate_llmIndependentGeometry). The
///      SomniaAgentConsumer ctor stores PLATFORM without calling it (no fee/min-deposit read at
///      construction), and resolveFromMandate's deterministic geometry never calls the platform, so a
///      mint through this reverting platform proves the geometry path makes NO call into the LLM/agent
///      surface. Declared AFTER the test contract (the bulloak helper-after-test convention; this fork
///      file has no .tree but the convention is kept for consistency).
contract MockRevertingPlatform is IAgentRequester {
    function createRequest(uint256, address, bytes4, bytes calldata) external payable returns (uint256) {
        revert("MockRevertingPlatform: createRequest");
    }

    function getRequest(uint256) external pure returns (Request memory) {
        revert("MockRevertingPlatform: getRequest");
    }

    function hasRequest(uint256) external pure returns (bool) {
        revert("MockRevertingPlatform: hasRequest");
    }

    function getRequestDeposit() external pure returns (uint256) {
        revert("MockRevertingPlatform: getRequestDeposit");
    }

    function getAdvancedRequestDeposit(uint256) external pure returns (uint256) {
        revert("MockRevertingPlatform: getAdvancedRequestDeposit");
    }
}


interface ICollateralDeposit {
    function deposit(uint256 assets, address receiver) external returns (uint256);
}

contract Actor {
    function onERC1155Received(
        address,
        address,
        uint256,
        uint256,
        bytes memory
    ) external pure returns (bytes4) {
        return this.onERC1155Received.selector;
    }

}

contract ERC1155Unsafe is ERC1155 {
    function unsafeMint(address to, uint256 id, uint256 amount) public {
	_mint(to, id , amount);
    }
}

contract PolygonConvexPositionResolverHarness {

    function resolvePositionFromHedgeParams__CASE_VOL_AWARE(
        PoolId poolId,
        uint8 vegoid,
        HedgeLegParams memory legParams,
        uint256 legIndex,
        PanopticPoolV2 panopticPool,
        uint128 positionSize
    ) public returns (TokenId positionId) {
        require(uint256(legParams.chainId) == block.chainid, "No crosschain allowed yet");

        int24 tickSpacing_  = legParams.payoffTerms.tickSpacing;
        int24 width         = PayoffTermsLib.deriveWidthFromVol(legParams.payoffTerms);
        uint256 asset       = PayoffTermsLib.deriveAsset(legParams.payoffTerms);
        uint256 riskPartner = PayoffTermsLib.deriveRiskPartner(legParams.payoffTerms);
        int24 strike = (TickMath.getTickAtSqrtPrice(
            PriceGridsLib.exchangeRateToSqrtPriceX96(legParams.strikeWAD)
        ) / tickSpacing_) * tickSpacing_;

        uint64 pid = PoolIdMappersLib.panopticPoolIdFromUniV4PoolId(poolId, vegoid, tickSpacing_);

        positionId = TokenIdLibrary.addLeg(
            TokenId.wrap(0).addPoolId(pid),
            legIndex, legParams.size, asset,
            legParams.isLong ? 1 : 0,
            0, riskPartner, strike, width
        );

        if (legParams.isLong && positionSize > 0) {
            TokenId shortId = TokenIdLibrary.addLeg(
                TokenId.wrap(0).addPoolId(pid),
                legIndex, legParams.size, asset,
                0, 0, riskPartner, strike, width
            );
            {
                TokenId[] memory ml  = new TokenId[](1);
                TokenId[] memory fl  = new TokenId[](1);
                uint128[] memory sl  = new uint128[](1);
                int24[3][] memory lim = new int24[3][](1);
                ml[0] = shortId; fl[0] = shortId; sl[0] = positionSize * 2;
                lim[0][0] = TickMath.MIN_TICK; lim[0][1] = TickMath.MAX_TICK;
                lim[0][2] = int24(uint24(type(uint24).max));
                panopticPool.dispatch(ml, fl, sl, lim, true, 0);
            }
            {
                TokenId[] memory ml  = new TokenId[](1);
                TokenId[] memory fl  = new TokenId[](2);
                uint128[] memory sl  = new uint128[](1);
                int24[3][] memory lim = new int24[3][](1);
                ml[0] = positionId; fl[0] = shortId; fl[1] = positionId; sl[0] = positionSize;
                lim[0][0] = TickMath.MIN_TICK; lim[0][1] = TickMath.MAX_TICK;
                lim[0][2] = int24(uint24(type(uint24).max));
                panopticPool.dispatch(ml, fl, sl, lim, true, 0);
            }
        }
    }

}


contract TestCaseForDemoBuilder {
    PoolKey poolKey;

    constructor(PoolKey memory _poolKey) {
	poolKey = _poolKey;
    }
    /**************************************************************/
    /*     {						      */
    /* 	"market": "uniswapV3-cCOP/USD0.3",		      */
    /* 	"chain": 01,					      */
    /* 	"Direction": LONG,				      */
    /* 	"Structure": CALL,				      */
    /* 	"Strike": 4.100,				      */
    /* 	"Width": 5%,					      */
    /* 	"Size": 100,					      */
    /* 	"MaximumLoss": PREMIUM_PAID,			      */
    /* 	"Upside": UNLIMITED,				      */
    /* 	"Thesis": *Hawkish monetary-policy surprise	      */
    /* 							      */
    /* }							      */
    /**************************************************************/

    function payoffTerms() public view returns(PayoffTerms memory terms) {
	terms = PayoffTerms({
            vol:           14_400, // sqrt = 120 tick std-dev
            horizonBlocks: 100,    // sqrt = 10
            tickSpacing:   60,     // matches wcopUsdcKey
            asset:         0,      // token0
            riskPartner:   0       // single leg is its own risk partner
        });
    }
    
    function hedgeParams(PayoffTerms memory terms) public view returns(HedgeLegParams memory legParams) {
	legParams = HedgeLegParams({
            underlyingMarket: poolKey.toId(),
            strikeWAD:        uint256(4.1e18), // demo strike 4.100
            size:             100,
            economicTheory:   IMacroThesis(address(0)),
            chainId:          uint32(block.chainid),
            isLong:           true,
            payoffTerms:      terms
        });
    }

}
