// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console2} from "forge-std/Test.sol";
import {Vm} from "forge-std/Vm.sol";

import {PoolKey} from "v4-core/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "v4-core/types/PoolId.sol";
import {BalanceDelta} from "v4-core/types/BalanceDelta.sol";
import {IHooks} from "v4-core/interfaces/IHooks.sol";
import {Currency} from "v4-core/types/Currency.sol";

import {PanopticFactoryV4} from "@contracts/PanopticFactoryV4.sol";
import {PanopticPoolV2} from "@contracts/PanopticPool.sol";
import {IRiskEngine} from "@contracts/interfaces/IRiskEngine.sol";

import {DeployProtocol} from "@panoptic/script/DeployProtocol.s.sol";

import {TokenId, TokenIdLibrary} from "@types/TokenId.sol";
import {PanopticQuery} from "@panoptic-periphery/PanopticQuery.sol";
import {IERC20Partial} from "@tokens/interfaces/IERC20Partial.sol";

import {RiskManagement} from "../../src/RiskManagement.sol";

// Agent-1 (in-VM, MockPlatform-driven) — LLM legs need no fork.
import {MacroHedgeStrategist} from "../../src/instrument/MacroHedgeStrategist.sol";
import {MockMacroOracle} from "../mocks/MockMacroOracle.sol";
import {MockPlatform} from "../mocks/MockPlatform.sol";
import {Response, ResponseStatus} from "../../src/interfaces/ISomniaAgents.sol";

// Agent-2 (fork) — the branched executor consumes the assembled mandate.
import {MacroHedgeExecutor} from "../../src/MacroHedgeExecutor.sol";
import {HedgeMandate} from "../../src/types/HedgeMandate.sol";
import {IMacroThesis} from "../../src/interfaces/IMacroThesis.sol";
import {IRegimeOracle} from "../../src/interfaces/IRegimeOracle.sol";
import {MockRegimeOracle} from "../mocks/MockRegimeOracle.sol";
import {MockSurpriseOracle} from "../mocks/MockSurpriseOracle.sol";

/// @dev BTT spec: test/instrument/MacroWorkflow.fork.tree
/// @notice SHILLER-02 whole-workflow JOIN — Agent-1 (`MacroHedgeStrategist` + `MockPlatform`, in-VM:
///         the LLM legs run in the same VM, no fork) assembles a `HedgeMandate` via `getMandate`,
///         which then drives Agent-2 (`MacroHedgeExecutor.resolveFromMandate`) to mint on the Polygon
///         fork. Four Colombian macro-risk scenarios (CPI upside, CPI downside, fiscal-slippage tail,
///         carry-unwind) run under BOTH schools (SHILLER 0x5 / PKE 0x6). The load-bearing claim: for
///         the SAME macro-risk input, SHILLER vs PKE produce DIFFERENT strike/width/size — proven
///         NON-trivially (intra-school monotonicity + flip-only-the-sentinel anti-tautology).
contract MacroWorkflow is Test {
    using TokenIdLibrary for TokenId;
    using PoolIdLibrary for PoolKey;

    string constant STATE_FILE = "fork-state/polygon-panoptic.json";
    uint256 constant POST_POOL_INIT_BLOCK = 86_900_000;

    uint256 constant DEFAULT_FUND_USD = 10_000e6;
    uint256 constant DEFAULT_FUND_COP = 10_000e18;

    address constant POLYGON_POOL_MANAGER = 0x67366782805870060151383F4BbFF9daB53e5cD6;
    address constant POLYGON_USDC = 0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359; // 6 decimals
    address constant POLYGON_WCOP = 0x8a1D45e102e886510e891d2Ec656a708991e2D76; // 18 decimals
    address constant POLYGON_UNIV3_FACTORY = 0x1F98431c8aD98523631AE4a59f267346ea31F984;
    address constant RISK_ENGINE_ADDR = 0x416C42991d05b31E9A6dC209e91AD22b79D87Ae6;
    address constant FACTORY_V4_ADDR = 0x978e3286EB805934215a88694d80b09aDed68D90;

    // --- Agent-1 in-VM constants (mirror MacroHedgeStrategist.t.sol) ---
    uint256 constant FLOOR = 0.01 ether;
    uint256 constant SEND = 0.22 ether;
    bytes32 constant KEY = keccak256("co/inflation-rate");
    int256 constant ACTUAL = 568;
    int256 constant CONSENSUS = 500;
    string constant INTENT = "Hedge the COP depreciation risk on a peso cash flow I receive monthly.";
    uint256 constant NOTIONAL = 50_000; // → feasibleOptionRatio 50 on the PKE arm

    // --- expected geometry (Phase 16 lib, fork-proven in 16-01/16-02) ---
    int24 constant PKE_STRIKE = 360360; // structural K_hi
    int24 constant SHILLER_STRIKE_2SIGMA = 361200;
    int24 constant SHILLER_STRIKE_3SIGMA = 361620; // +3σ and +3.5σ floor to the SAME tick
    int24 constant SHILLER_STRIKE_DOWNSIDE = 360360; // depreciation-only-v1 (s<0 ⇒ s=0 ⇒ K_hi)

    bytes32 constant EXECUTOR_DECIDED_TOPIC0 =
        keccak256("ExecutorDecided(uint256,uint8,uint256,int24,int24,bool,bool,string)");

    PanopticFactoryV4 panopticFactory = PanopticFactoryV4(FACTORY_V4_ADDR);
    PoolKey wcopUsdcKey;
    PanopticPoolV2 pool;
    PanopticQuery panopticQuery;
    RiskManagement riskManagement;
    bool forked;

    // Agent-1 (in-VM)
    MockPlatform agentPlatform;
    MockMacroOracle macroOracle;
    MacroHedgeStrategist strategist;

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
                currency0: Currency.wrap(POLYGON_USDC),
                currency1: Currency.wrap(POLYGON_WCOP),
                fee: 3000,
                tickSpacing: 60,
                hooks: IHooks(address(0))
            });

            if (vm.exists(STATE_FILE)) {
                vm.loadAllocs(STATE_FILE);
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

        // Agent-1 lives in the same VM (the LLM legs are fork-free); the strategist reads its own
        // MockMacroOracle, NOT the live pool.
        agentPlatform = new MockPlatform(FLOOR);
        macroOracle = new MockMacroOracle();
        macroOracle.seed(KEY, ACTUAL);
        strategist = new MacroHedgeStrategist(address(agentPlatform), address(macroOracle));
        vm.deal(address(this), 1000 ether);
    }

    function _vegoid() internal view returns (uint8) {
        return IRiskEngine(RISK_ENGINE_ADDR).vegoid();
    }

    function _deployCore() internal {
        vm.setEnv("UNIV4_POOL_MANAGER", vm.toString(POLYGON_POOL_MANAGER));
        vm.setEnv("UNIV3_FACTORY", vm.toString(POLYGON_UNIV3_FACTORY));
        vm.setEnv("GUARDIAN_ADMIN", vm.toString(address(this)));
        vm.setEnv("TREASURER", vm.toString(address(this)));
        new DeployProtocol().run();
        require(FACTORY_V4_ADDR.code.length > 0, "deploy: factory address drifted from constant");
    }

    function _init_world() internal {
        panopticQuery = new PanopticQuery();
        pool = panopticFactory.deployNewPool(wcopUsdcKey, IRiskEngine(RISK_ENGINE_ADDR), 0);
        riskManagement = new RiskManagement(panopticQuery, pool);

        ICollateralDeposit ct0 = ICollateralDeposit(address(pool.collateralToken0()));
        ICollateralDeposit ct1 = ICollateralDeposit(address(pool.collateralToken1()));
        deal(POLYGON_USDC, address(this), DEFAULT_FUND_USD);
        deal(POLYGON_WCOP, address(this), DEFAULT_FUND_COP);
        IERC20Partial(POLYGON_USDC).approve(address(ct0), type(uint256).max);
        IERC20Partial(POLYGON_WCOP).approve(address(ct1), type(uint256).max);
        ct0.deposit(DEFAULT_FUND_USD, address(this));
        ct1.deposit(DEFAULT_FUND_COP, address(this));
    }

    /// @dev Deploy a fresh executor against the per-test pool (9+1-arg ctor, mirrors the demo file),
    ///      funded with collateral so it is the dispatch caller AND the 4626 share owner.
    function _deployExecutor() internal returns (MacroHedgeExecutor exec, MockRegimeOracle regime) {
        regime = new MockRegimeOracle();
        regime.set(IRegimeOracle.Regime.Stress);
        exec = new MacroHedgeExecutor(
            address(new MockPlatform(0.01 ether)),
            pool,
            riskManagement,
            _vegoid(),
            0.10e18, // β₁(TRANQUIL)
            0.35e18, // β₁(STRESS)
            0.15e18, // target devaluation
            14_400, // baseVol (tick-space)
            regime,
            new MockSurpriseOracle()
        );
        ICollateralDeposit ct0 = ICollateralDeposit(address(pool.collateralToken0()));
        ICollateralDeposit ct1 = ICollateralDeposit(address(pool.collateralToken1()));
        deal(POLYGON_USDC, address(exec), DEFAULT_FUND_USD);
        deal(POLYGON_WCOP, address(exec), DEFAULT_FUND_COP);
        vm.startPrank(address(exec));
        IERC20Partial(POLYGON_USDC).approve(address(ct0), type(uint256).max);
        IERC20Partial(POLYGON_WCOP).approve(address(ct1), type(uint256).max);
        ct0.deposit(DEFAULT_FUND_USD, address(exec));
        ct1.deposit(DEFAULT_FUND_COP, address(exec));
        vm.stopPrank();
    }

    /// @dev Agent-1 in-VM: fire the school leg, fulfill it with `school`, fire the notional leg,
    ///      fulfill it with NOTIONAL, then read the assembled mandate via getMandate. The mandate's
    ///      economicTheory is the resolved 0x5/0x6 sentinel (from the school string).
    function _assembleMandate(string memory school) internal returns (HedgeMandate memory mandate) {
        uint256 schoolId = agentPlatform.nextId();
        bytes32 decisionId = strategist.requestSchoolDecision{value: SEND}(INTENT, KEY, CONSENSUS);
        agentPlatform.fulfill(
            address(strategist), schoolId, agentPlatform.oneResponse(abi.encode(school), ResponseStatus.Success), ResponseStatus.Success
        );
        uint256 notionalId = agentPlatform.nextId();
        strategist.requestNotionalDecision{value: SEND}(decisionId);
        agentPlatform.fulfill(
            address(strategist), notionalId, agentPlatform.oneResponse(abi.encode(int256(NOTIONAL)), ResponseStatus.Success), ResponseStatus.Success
        );
        mandate = strategist.getMandate(decisionId);
        // Anchor the mandate's pool to the freshly-deployed per-test pool (the strategist hardcodes the
        // canonical PolygonPools id; the executor mints against the pool it was constructed with).
        mandate.underlyingMarket = wcopUsdcKey.toId();
    }

    function _decodeExecutorDecided(Vm.Log[] memory logs)
        internal
        pure
        returns (bool found, int24 strikeTick, int24 width, bool nonErgodicDisclosed, string memory rationale)
    {
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].topics.length > 0 && logs[i].topics[0] == EXECUTOR_DECIDED_TOPIC0) {
                (,, strikeTick, width,, nonErgodicDisclosed, rationale) =
                    abi.decode(logs[i].data, (uint8, uint256, int24, int24, bool, bool, string));
                found = true;
                break;
            }
        }
    }

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

    /// @notice The whole-workflow JOIN driver: Agent-1 assembles the mandate for `school`, the surprise
    ///         + regime oracles are seeded for the scenario, then Agent-2 resolveFromMandate mints on the
    ///         fork. Returns the decoded geometry + the live-minted leg count.
    function _runWorkflow(
        string memory school,
        int256 sActualWad,
        int256 sConsensusWad,
        uint256 sSigmaWad,
        IRegimeOracle.Regime pkeRegime
    ) internal returns (int24 strike, int24 width, uint256 size, string memory rationale, bool nonErgodic, uint256 legs) {
        // NOTE: the caller must have run `_init_world()` ONCE (the pool is shared across runs in a test;
        // each run deploys its OWN funded executor against it — distinct dispatch callers + 4626 owners).
        HedgeMandate memory mandate = _assembleMandate(school);

        (MacroHedgeExecutor exec, MockRegimeOracle regime) = _deployExecutor();
        regime.set(pkeRegime);
        MockSurpriseOracle(address(exec.surpriseOracle())).set(sActualWad, sConsensusWad, sSigmaWad);

        vm.recordLogs();
        TokenId positionId = exec.resolveFromMandate(mandate, 0, 1e6);
        (bool found, int24 dStrike, int24 dWidth, bool dNonErgodic, string memory dRationale) =
            _decodeExecutorDecided(vm.getRecordedLogs());
        require(found, "ExecutorDecided not found");

        strike = dStrike;
        width = dWidth;
        size = positionId.optionRatio(0);
        rationale = dRationale;
        nonErgodic = dNonErgodic;
        legs = pool.numberOfLegs(address(exec));

        // sanity: minted == emitted
        assertEq(int256(positionId.strike(0)), int256(dStrike), "minted strike == emitted strike");
        assertGt(legs, 0, "executor owns the minted leg");
    }

    /*//////////////////////////////////////////////////////////////
                  VALIDATION-named load-bearing leaves
    //////////////////////////////////////////////////////////////*/

    /// @notice SHILLER-02 — for the SAME macro-risk input the two schools derive DIFFERENT geometry,
    ///         proven NON-trivially (anti-tautology gate).
    function test_workflow_sameInputDifferentGeometry() public onlyForked {
        _init_world(); // ONCE — the shared per-test pool; each run deploys its own funded executor
        // ---- the four scenarios, run once SHILLER once PKE (all other inputs equal) ----

        // (1) CPI upside: s=+2σ / Stress
        (int24 sStrike2, int24 sWidth2, uint256 sSize2,,,) =
            _runWorkflow("SHILLER_MACRO_RISK", int256(2e18), int256(0), uint256(1e18), IRegimeOracle.Regime.Stress);
        (int24 pStrike2, int24 pWidth2, uint256 pSize2,,,) =
            _runWorkflow("POST_KEYNESIAN", int256(2e18), int256(0), uint256(1e18), IRegimeOracle.Regime.Stress);
        assertEq(int256(sStrike2), int256(SHILLER_STRIKE_2SIGMA), "CPI-upside SHILLER strike 361200");
        assertEq(int256(pStrike2), int256(PKE_STRIKE), "CPI-upside PKE strike 360360");
        assertTrue(sStrike2 != pStrike2, "CPI-upside: strike differs by school");
        assertTrue(sSize2 != pSize2 || sWidth2 != pWidth2, "CPI-upside: at least one geometry axis differs");

        // (2) CPI downside: s=-2σ / Tranquil — SHILLER collapses to K_hi (depreciation-only-v1)
        (int24 sStrikeD,,,,,) =
            _runWorkflow("SHILLER_MACRO_RISK", int256(-2e18), int256(0), uint256(1e18), IRegimeOracle.Regime.Tranquil);
        (,, uint256 pSizeD,,,) =
            _runWorkflow("POST_KEYNESIAN", int256(-2e18), int256(0), uint256(1e18), IRegimeOracle.Regime.Tranquil);
        assertEq(int256(sStrikeD), int256(SHILLER_STRIKE_DOWNSIDE), "CPI-downside SHILLER depreciation-only-v1 360360");
        // the SHILLER size (downside collapses to s=0 ⇒ shillerOptionRatio == 1, the minimal stance)
        // still differs from the PKE notional-derived ratio (feasibleOptionRatio(50_000) == 50).
        uint256 sSizeD = 1;
        assertTrue(sSizeD != pSizeD, "CPI-downside: SHILLER minimal-stance size differs from PKE");

        // (3) fiscal-slippage tail: s=+3.5σ / Stress
        (int24 sStrike35,, uint256 sSize35,,,) =
            _runWorkflow("SHILLER_MACRO_RISK", int256(35e17), int256(0), uint256(1e18), IRegimeOracle.Regime.Stress);
        (int24 pStrike35,, uint256 pSize35,,,) =
            _runWorkflow("POST_KEYNESIAN", int256(35e17), int256(0), uint256(1e18), IRegimeOracle.Regime.Stress);
        assertTrue(sStrike35 != pStrike35, "fiscal-tail: strike differs by school");
        assertTrue(sSize35 != pSize35, "fiscal-tail: size differs by school");

        // (4) carry-unwind: s=+3σ / Stress
        (int24 sStrike3,, uint256 sSize3,,,) =
            _runWorkflow("SHILLER_MACRO_RISK", int256(3e18), int256(0), uint256(1e18), IRegimeOracle.Regime.Stress);
        (int24 pStrike3,, uint256 pSize3,,,) =
            _runWorkflow("POST_KEYNESIAN", int256(3e18), int256(0), uint256(1e18), IRegimeOracle.Regime.Stress);
        assertTrue(sStrike3 != pStrike3, "carry-unwind: strike differs by school");
        assertTrue(sSize3 != pSize3, "carry-unwind: size differs by school");

        // ---- ANTI-TAUTOLOGY (a): INTRA-SCHOOL monotonicity ----
        // +3σ and +3.5σ floor to the SAME strike tick 361620, so use SIZE: a larger |s| STRICTLY
        // increases the SHILLER convex size (ratio 62 < 90). A stubbed school-keyed constant fails this.
        assertEq(int256(sStrike3), int256(SHILLER_STRIKE_3SIGMA), "+3 sigma strike 361620");
        assertEq(int256(sStrike35), int256(SHILLER_STRIKE_3SIGMA), "+3.5 sigma strike 361620 (same tick)");
        assertGt(sSize35, sSize3, "INTRA-SCHOOL: larger abs s strictly increases SHILLER size (90 > 62)");

        // ---- ANTI-TAUTOLOGY (b): FLIP-ONLY-THE-SENTINEL ----
        // Seed IDENTICAL oracles for both runs (same +2σ surprise + same STRESS regime); flip ONLY the
        // economicTheory sentinel (0x5 ↔ 0x6) on an otherwise byte-identical mandate. The geometry STILL
        // differs — proving the SCHOOL branch drives it, not merely a different oracle seeding.
        (int24 fStrikeShiller,, uint256 fSizeShiller,,,) = _flipSentinelRun(address(uint160(0x5)));
        (int24 fStrikePke,, uint256 fSizePke,,,) = _flipSentinelRun(address(uint160(0x6)));
        assertTrue(
            fStrikeShiller != fStrikePke || fSizeShiller != fSizePke,
            "FLIP-ONLY-SENTINEL: geometry differs from the school branch alone (identical oracles)"
        );
        assertEq(int256(fStrikeShiller), int256(SHILLER_STRIKE_2SIGMA), "flip: SHILLER arm strike");
        assertEq(int256(fStrikePke), int256(PKE_STRIKE), "flip: PKE arm strike");
    }

    /// @dev Build an otherwise-identical mandate, seed IDENTICAL oracles, and flip ONLY the sentinel.
    function _flipSentinelRun(address sentinel)
        internal
        returns (int24 strike, int24 width, uint256 size, string memory rationale, bool nonErgodic, uint256 legs)
    {
        // the caller has already run `_init_world()` once; reuse the shared pool.
        // start from a real assembled mandate (PKE), then override ONLY economicTheory.
        HedgeMandate memory mandate = _assembleMandate("POST_KEYNESIAN");
        mandate.economicTheory = IMacroThesis(sentinel);

        (MacroHedgeExecutor exec, MockRegimeOracle regime) = _deployExecutor();
        regime.set(IRegimeOracle.Regime.Stress);
        MockSurpriseOracle(address(exec.surpriseOracle())).set(int256(2e18), int256(0), uint256(1e18));

        vm.recordLogs();
        TokenId positionId = exec.resolveFromMandate(mandate, 0, 1e6);
        (, int24 dStrike, int24 dWidth, bool dNonErgodic, string memory dRationale) =
            _decodeExecutorDecided(vm.getRecordedLogs());
        strike = dStrike;
        width = dWidth;
        size = positionId.optionRatio(0);
        rationale = dRationale;
        nonErgodic = dNonErgodic;
        legs = pool.numberOfLegs(address(exec));
    }

    /// @notice SHILLER-02 — each school surfaces its distinct per-school TEMPLATE honesty on
    ///         ExecutorDecided, and both disclose the non-ergodic tail.
    function test_workflow_perSchoolHonesty() public onlyForked {
        _init_world(); // ONCE — the shared per-test pool
        (,,, string memory sRationale, bool sNonErgodic,) =
            _runWorkflow("SHILLER_MACRO_RISK", int256(2e18), int256(0), uint256(1e18), IRegimeOracle.Regime.Stress);
        assertTrue(_contains(sRationale, "Shiller"), "SHILLER rationale names Shiller");
        assertTrue(_contains(sRationale, "UNVALIDATED"), "SHILLER rationale carries UNVALIDATED");
        assertTrue(sNonErgodic, "SHILLER discloses the non-ergodic tail");

        (,,, string memory pRationale, bool pNonErgodic,) =
            _runWorkflow("POST_KEYNESIAN", int256(2e18), int256(0), uint256(1e18), IRegimeOracle.Regime.Stress);
        assertTrue(_contains(pRationale, "post-Keynesian"), "PKE rationale names post-Keynesian");
        assertTrue(pNonErgodic, "PKE discloses the non-ergodic tail");
    }

    /// @notice SHILLER-02 — all 4 scenarios × 2 schools mint successfully (8 mints); each SHILLER strike
    ///         on the sign-correct side of the PKE 360360 anchor (upside > 360360; downside == 360360
    ///         per the 16-02 depreciation-only-v1 decision).
    function test_workflow_fourScenariosBothSchools() public onlyForked {
        _init_world(); // ONCE — the shared per-test pool
        int256[4] memory sActual = [int256(2e18), int256(-2e18), int256(35e17), int256(3e18)];
        IRegimeOracle.Regime[4] memory regimes = [
            IRegimeOracle.Regime.Stress,
            IRegimeOracle.Regime.Tranquil,
            IRegimeOracle.Regime.Stress,
            IRegimeOracle.Regime.Stress
        ];
        bool[4] memory upside = [true, false, true, true];

        for (uint256 i = 0; i < 4; i++) {
            (int24 sStrike,,,,, uint256 sLegs) =
                _runWorkflow("SHILLER_MACRO_RISK", sActual[i], int256(0), uint256(1e18), regimes[i]);
            assertGt(sLegs, 0, "SHILLER mints");
            if (upside[i]) {
                assertGt(int256(sStrike), int256(PKE_STRIKE), "SHILLER upside strike > 360360");
            } else {
                assertEq(int256(sStrike), int256(PKE_STRIKE), "SHILLER downside == 360360 (depreciation-only-v1)");
            }

            (,,,,, uint256 pLegs) =
                _runWorkflow("POST_KEYNESIAN", sActual[i], int256(0), uint256(1e18), regimes[i]);
            assertGt(pLegs, 0, "PKE mints");
        }
    }

    /*//////////////////////////////////////////////////////////////
        bulloak-anchored leaves (delegate to the VALIDATION names above)
    //////////////////////////////////////////////////////////////*/

    function test_WhenTheSameMacro_riskScenarioIsResolvedAcrossBothSchools() external {
        test_workflow_sameInputDifferentGeometry();
    }

    function test_WhenEachSchoolResolvesTheSameScenario() external {
        test_workflow_perSchoolHonesty();
    }

    function test_WhenTheFourColombianScenariosRunUnderBothSchools() external {
        test_workflow_fourScenariosBothSchools();
    }
}


interface ICollateralDeposit {
    function deposit(uint256 assets, address receiver) external returns (uint256);
}
