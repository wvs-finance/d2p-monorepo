// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {MockPlatform} from "../mocks/MockPlatform.sol";
import {SomniaAgentConsumer} from "../../src/SomniaAgentConsumer.sol";
import {MacroHedgeStrategist} from "../../src/instrument/MacroHedgeStrategist.sol";
import {ILLMAgent, Request, Response, ResponseStatus} from "../../src/interfaces/ISomniaAgents.sol";
import {MockMacroOracle} from "../mocks/MockMacroOracle.sol";
import {HedgeMandate} from "../../src/types/HedgeMandate.sol";
import {IMacroThesis, MacroThesisRegistry} from "../../src/interfaces/IMacroThesis.sol";
import {PolygonPools} from "../../src/libraries/PolygonPools.sol";
import {PoolId} from "v4-core/types/PoolId.sol";
import {HedgeLegParams} from "../../src/types/HedgeLegParams.sol";
import {PayoffTerms} from "../../src/types/PayoffTerms.sol";

/// @dev BTT spec: test/instrument/MacroHedgeStrategist.tree
/// @notice STRAT-01/02 unit suite — MockPlatform-driven (no live agent, no fork). Mirrors the
///         17/17-green v1 harness re-pointed to the HedgeMandate semantics: the two-entrypoint
///         request (school inferString over schoolLabels() + notional inferNumber), the explicit
///         block-independent decisionId hand-off, the cross-block join (vm.roll/vm.warp), the
///         school decode-to-handle (with no-default-write DecisionFailed fallback), the
///         int-blob/string-blob payload-type containment, the notional clamp (incl. the M2
///         positive-below-MIN floor-UP), the assembled-mandate well-formedness (STRAT-02), and
///         the inherited NotPlatform / UnknownRequest auth+replay guards.
contract MacroHedgeStrategistlifecycle is Test {
    MockPlatform internal platform;
    MockMacroOracle internal oracle;
    MacroHedgeStrategist internal strategist;

    uint256 internal constant FLOOR = 0.01 ether;
    uint256 internal constant SEND = 0.22 ether; // over-fund: floor + 0.07*subSize(3) for llm-inference
    uint256 internal constant AGENT_ID = 12847293847561029384;
    uint256 internal constant MIN_NOTIONAL = 1_000;
    uint256 internal constant MAX_NOTIONAL = 100_000_000;

    bytes32 internal constant KEY = keccak256("co/inflation-rate");
    bytes32 internal constant UNKNOWN_KEY = keccak256("does/not/exist");
    int256 internal constant ACTUAL = 568; // 5.68% scaled x100
    int256 internal constant CONSENSUS = 500; // 5.00% scaled x100

    string internal constant INTENT = "Hedge the COP depreciation risk on a peso cash flow I receive monthly.";

    event HedgeDecisionRequested(uint256 indexed requestId, bytes32 indexed decisionId, uint8 leg);
    event DecisionFailed(uint256 indexed requestId, ResponseStatus status);
    event StrategistDecided(bytes32 indexed decisionId, string school, HedgeMandate mandate);

    function setUp() public {
        platform = new MockPlatform(FLOOR);
        oracle = new MockMacroOracle();
        oracle.seed(KEY, ACTUAL);
        strategist = new MacroHedgeStrategist(address(platform), address(oracle));
        vm.deal(address(this), 1000 ether);
    }

    /*//////////////////////////////////////////////////////////////
                                HELPERS
    //////////////////////////////////////////////////////////////*/

    function _resp(bytes memory result, ResponseStatus status) internal view returns (Response[] memory) {
        return platform.oneResponse(result, status);
    }

    function _emptyReq() internal pure returns (Request memory r) {
        return r;
    }

    /// @notice Fire the school leg; returns (decisionId, schoolRequestId).
    function _fireSchool() internal returns (bytes32 decisionId, uint256 schoolId) {
        schoolId = platform.nextId(); // the id createRequest will allocate next
        decisionId = strategist.requestSchoolDecision{value: SEND}(INTENT, KEY, CONSENSUS);
    }

    /// @notice School leg + fulfill its callback with the given label so schoolSet==true.
    function _completeSchool(string memory label) internal returns (bytes32 decisionId, uint256 schoolId) {
        (decisionId, schoolId) = _fireSchool();
        platform.fulfill(
            address(strategist), schoolId, _resp(abi.encode(label), ResponseStatus.Success), ResponseStatus.Success
        );
    }

    /// @notice Fire the notional leg for an existing decision; returns the notional requestId.
    function _fireNotional(bytes32 decisionId) internal returns (uint256 notionalId) {
        notionalId = platform.nextId();
        strategist.requestNotionalDecision{value: SEND}(decisionId);
    }

    /*//////////////////////////////////////////////////////////////
                          requestSchoolDecision
    //////////////////////////////////////////////////////////////*/

    function test_WhenRequestSchoolDecisionIsCalledWithAKnownDataKey() external {
        uint256 expectedId = platform.nextId();
        vm.expectEmit(true, true, false, true, address(strategist));
        emit HedgeDecisionRequested(expectedId, bytes32(expectedId), uint8(1)); // Leg.School == 1

        bytes32 decisionId = strategist.requestSchoolDecision{value: SEND}(INTENT, KEY, CONSENSUS);

        // it allocates a fresh decisionId from the school requestId
        assertEq(decisionId, bytes32(expectedId), "decisionId == bytes32(school requestId)");

        // it sends an inferString school payload to the LLM agent id with the registry school labels
        assertEq(platform.lastAgentId(), AGENT_ID, "LLM agent id");
        assertEq(platform.lastSelector(), SomniaAgentConsumer.handleResponse.selector, "callback selector");
        bytes memory p = platform.lastPayload();
        assertEq(bytes4(p), ILLMAgent.inferString.selector, "payload begins with inferString selector");

        // it marks the school requestId pending; it reads the oracle scaledValue as actual
        assertTrue(strategist.pendingRequests(expectedId), "school request pending");
        // (the macroValue is internal; the school request having read the oracle is proven by the
        //  UnknownKey revert path below + the successful fire here on the seeded KEY.)
    }

    function test_WhenRequestSchoolDecisionIsCalledWithAnUnknownDataKey() external {
        vm.expectRevert(abi.encodeWithSelector(MacroHedgeStrategist.UnknownKey.selector, UNKNOWN_KEY));
        strategist.requestSchoolDecision{value: SEND}(INTENT, UNKNOWN_KEY, CONSENSUS);
    }

    /*//////////////////////////////////////////////////////////////
                         requestNotionalDecision
    //////////////////////////////////////////////////////////////*/

    function test_WhenRequestNotionalDecisionIsCalledWithAKnownDecisionIdWhoseSchoolCallbackHasCompleted() external {
        (bytes32 decisionId,) = _completeSchool("SHILLER_MACRO_RISK");

        uint256 notionalId = platform.nextId();
        vm.expectEmit(true, true, false, true, address(strategist));
        emit HedgeDecisionRequested(notionalId, decisionId, uint8(2)); // Leg.Notional == 2
        strategist.requestNotionalDecision{value: SEND}(decisionId);

        // it sends an inferNumber notional payload to the LLM agent id
        bytes memory p = platform.lastPayload();
        assertEq(bytes4(p), ILLMAgent.inferNumber.selector, "payload begins with inferNumber selector");
        assertEq(platform.lastAgentId(), AGENT_ID, "LLM agent id");

        // it binds the notional requestId to the same decisionId (pending + same struct)
        assertTrue(strategist.pendingRequests(notionalId), "notional request pending");
    }

    modifier whenRequestNotionalDecisionIsCalledAndTheDecisionIsNotReady() {
        _;
    }

    function test_GivenTheDecisionIdIsUnknown()
        external
        whenRequestNotionalDecisionIsCalledAndTheDecisionIsNotReady
    {
        bytes32 ghost = bytes32(uint256(0xDEAD));
        vm.expectRevert(abi.encodeWithSelector(MacroHedgeStrategist.UnknownDecision.selector, ghost));
        strategist.requestNotionalDecision{value: SEND}(ghost);
    }

    function test_GivenTheSchoolCallbackHasNotCompleted()
        external
        whenRequestNotionalDecisionIsCalledAndTheDecisionIsNotReady
    {
        // Fire the school leg but DO NOT fulfill it: schoolSet stays false => UnknownDecision.
        (bytes32 decisionId,) = _fireSchool();
        vm.expectRevert(abi.encodeWithSelector(MacroHedgeStrategist.UnknownDecision.selector, decisionId));
        strategist.requestNotionalDecision{value: SEND}(decisionId);
    }

    function test_GivenTheNotionalLegAlreadyCompleted()
        external
        whenRequestNotionalDecisionIsCalledAndTheDecisionIsNotReady
    {
        // Drive a full school + notional to notionalSet==true, then a second notional request must revert.
        (bytes32 decisionId,) = _completeSchool("SHILLER_MACRO_RISK");
        uint256 notionalId = _fireNotional(decisionId);
        platform.fulfill(
            address(strategist),
            notionalId,
            _resp(abi.encode(int256(50_000)), ResponseStatus.Success),
            ResponseStatus.Success
        );
        assertTrue(strategist.decisionState(decisionId).notionalSet, "notional set after fulfill");

        vm.expectRevert(abi.encodeWithSelector(MacroHedgeStrategist.UnknownDecision.selector, decisionId));
        strategist.requestNotionalDecision{value: SEND}(decisionId);
    }

    /*//////////////////////////////////////////////////////////////
                           school callback
    //////////////////////////////////////////////////////////////*/

    modifier whenTheSchoolCallbackArrivesFromThePlatform() {
        _;
    }

    function test_GivenTheSchoolStringMapsToARegistryLabel() external whenTheSchoolCallbackArrivesFromThePlatform {
        (bytes32 decisionId,) = _completeSchool("SHILLER_MACRO_RISK");
        // it stores the school handle and sets schoolSet true
        assertTrue(
            address(strategist.getMandate(decisionId).economicTheory) != address(0),
            "school handle stored (non-zero)"
        );
        assertTrue(strategist.decisionState(decisionId).schoolSet, "schoolSet true");
    }

    function test_GivenTheSchoolStringDoesNotMapToAnyRegistryLabel()
        external
        whenTheSchoolCallbackArrivesFromThePlatform
    {
        (bytes32 decisionId, uint256 schoolId) = _fireSchool();
        vm.expectEmit(true, false, false, true, address(strategist));
        emit DecisionFailed(schoolId, ResponseStatus.Success);
        platform.fulfill(
            address(strategist),
            schoolId,
            _resp(abi.encode(string("NONSENSE")), ResponseStatus.Success),
            ResponseStatus.Success
        );
        // no default write; no StrategistDecided
        assertFalse(strategist.decisionState(decisionId).schoolSet, "schoolSet stays false on unmapped string");
        assertEq(strategist.decisionState(decisionId).decidedAt, 0, "no decision recorded");
    }

    function test_GivenTheSchoolPayloadIsAnIntEncodedThirtyTwoByteBlob()
        external
        whenTheSchoolCallbackArrivesFromThePlatform
    {
        (bytes32 decisionId, uint256 schoolId) = _fireSchool();
        // a 32-byte int payload abi.decode-as-string into garbage -> thesisOf no match -> DecisionFailed.
        vm.expectEmit(true, false, false, true, address(strategist));
        emit DecisionFailed(schoolId, ResponseStatus.Success);
        platform.fulfill(
            address(strategist), schoolId, _resp(abi.encode(int256(7)), ResponseStatus.Success), ResponseStatus.Success
        );
        assertFalse(
            strategist.decisionState(decisionId).schoolSet, "schoolSet stays false on int-blob (payload-type containment)"
        );
    }

    /*//////////////////////////////////////////////////////////////
                          notional callback
    //////////////////////////////////////////////////////////////*/

    modifier whenTheNotionalCallbackArrivesFromThePlatformAfterTheSchoolLegCompleted() {
        _;
    }

    function test_GivenTheNotionalIsStrictlyWithinMIN_NOTIONALAndMAX_NOTIONAL()
        external
        whenTheNotionalCallbackArrivesFromThePlatformAfterTheSchoolLegCompleted
    {
        // B2: complete a school FIRST (else requestNotionalDecision reverts UnknownDecision).
        (bytes32 id,) = _completeSchool("SHILLER_MACRO_RISK");
        uint256 notionalId = _fireNotional(id);
        platform.fulfill(
            address(strategist),
            notionalId,
            _resp(abi.encode(int256(50_000)), ResponseStatus.Success),
            ResponseStatus.Success
        );
        // 50_000 is strictly inside the open interval (1_000, 100_000_000) -> stored unchanged.
        assertEq(strategist.getMandate(id).targetNotional, 50_000, "in-range notional stored unchanged");
        assertTrue(strategist.decisionState(id).notionalSet, "notionalSet true");
    }

    function test_GivenTheNotionalExceedsMAX_NOTIONAL()
        external
        whenTheNotionalCallbackArrivesFromThePlatformAfterTheSchoolLegCompleted
    {
        (bytes32 id,) = _completeSchool("SHILLER_MACRO_RISK");
        uint256 notionalId = _fireNotional(id);
        platform.fulfill(
            address(strategist),
            notionalId,
            _resp(abi.encode(int256(200_000_000)), ResponseStatus.Success),
            ResponseStatus.Success
        );
        assertEq(strategist.getMandate(id).targetNotional, MAX_NOTIONAL, "over-max clamped to MAX_NOTIONAL");
    }

    function test_GivenTheNotionalRawIsPositiveButBelowMIN_NOTIONAL()
        external
        whenTheNotionalCallbackArrivesFromThePlatformAfterTheSchoolLegCompleted
    {
        // M2 (NEW vs v1, which floored small positives to 0): a positive raw below MIN_NOTIONAL floors UP.
        (bytes32 id,) = _completeSchool("SHILLER_MACRO_RISK");
        uint256 notionalId = _fireNotional(id);
        platform.fulfill(
            address(strategist),
            notionalId,
            _resp(abi.encode(int256(500)), ResponseStatus.Success),
            ResponseStatus.Success
        );
        assertEq(
            strategist.getMandate(id).targetNotional, MIN_NOTIONAL, "positive raw below MIN floors UP to MIN_NOTIONAL"
        );
    }

    function test_GivenTheNotionalRawIntIsNegative()
        external
        whenTheNotionalCallbackArrivesFromThePlatformAfterTheSchoolLegCompleted
    {
        (bytes32 id,) = _completeSchool("SHILLER_MACRO_RISK");
        uint256 notionalId = _fireNotional(id);
        platform.fulfill(
            address(strategist),
            notionalId,
            _resp(abi.encode(int256(-5)), ResponseStatus.Success),
            ResponseStatus.Success
        );
        assertEq(strategist.getMandate(id).targetNotional, MIN_NOTIONAL, "negative raw floors to MIN_NOTIONAL");
    }

    function test_GivenTheNotionalPayloadIsNotThirtyTwoBytes()
        external
        whenTheNotionalCallbackArrivesFromThePlatformAfterTheSchoolLegCompleted
    {
        (bytes32 id,) = _completeSchool("SHILLER_MACRO_RISK");
        uint256 notionalId = _fireNotional(id);
        // a string-encoded (non-32-byte) payload -> length guard -> DecisionFailed, no notional stored.
        // This leaf does NOT join, so expectEmit(DecisionFailed) IS correct here.
        vm.expectEmit(true, false, false, true, address(strategist));
        emit DecisionFailed(notionalId, ResponseStatus.Success);
        platform.fulfill(
            address(strategist),
            notionalId,
            _resp(abi.encode(string("not a number")), ResponseStatus.Success),
            ResponseStatus.Success
        );
        assertFalse(strategist.decisionState(id).notionalSet, "notionalSet stays false on non-32-byte payload");
    }

    /*//////////////////////////////////////////////////////////////
                          both-arrived join
    //////////////////////////////////////////////////////////////*/

    modifier whenBothSchoolAndNotionalCallbacksHaveArrivedOnTheSameDecisionId() {
        _;
    }

    function test_WhenBothSchoolAndNotionalCallbacksHaveArrivedOnTheSameDecisionId()
        external
        whenBothSchoolAndNotionalCallbacksHaveArrivedOnTheSameDecisionId
    {
        (bytes32 id,) = _completeSchool("SHILLER_MACRO_RISK");
        uint256 notionalId = _fireNotional(id);

        // Build the expected mandate for the whole-struct expectEmit (M1 — the SOLE expectEmit site).
        (IMacroThesis shiller,) = MacroThesisRegistry.thesisOf("SHILLER_MACRO_RISK");
        HedgeMandate memory expectedMandate = HedgeMandate({
            economicTheory: shiller,
            underlyingMarket: PolygonPools.POLYGON_WCOP_USDC_POOL_ID(),
            targetNotional: 50_000,
            chainId: 137,
            isLong: true
        });
        vm.expectEmit(true, false, false, true, address(strategist));
        emit StrategistDecided(id, "SHILLER_MACRO_RISK", expectedMandate);
        platform.fulfill(
            address(strategist),
            notionalId,
            _resp(abi.encode(int256(50_000)), ResponseStatus.Success),
            ResponseStatus.Success
        );

        // Field-by-field fallback (the embedded PoolId UDVT whole-struct checkData sharp edge).
        HedgeMandate memory m = strategist.getMandate(id);
        assertEq(
            PoolId.unwrap(m.underlyingMarket),
            PoolId.unwrap(PolygonPools.POLYGON_WCOP_USDC_POOL_ID()),
            "underlyingMarket == POLYGON_WCOP_USDC_POOL_ID"
        );
        assertTrue(address(m.economicTheory) != address(0), "economicTheory resolvable (non-zero)");
        assertEq(m.targetNotional, 50_000, "targetNotional == fulfilled value");
        assertEq(m.chainId, 137, "chainId == 137");
        assertTrue(m.isLong, "isLong == true");
        assertGt(strategist.decisionState(id).decidedAt, 0, "decidedAt set on join");
    }

    /// @notice BLOCKER-1 proof: the two callbacks land in DIFFERENT blocks; the block-independent
    ///         decisionId means the join still completes and StrategistDecided still fires.
    function test_GivenTheTwoCallbacksLandInDifferentBlocks()
        external
        whenBothSchoolAndNotionalCallbacksHaveArrivedOnTheSameDecisionId
    {
        (bytes32 id,) = _completeSchool("SHILLER_MACRO_RISK");

        // advance blocks (and time) between the two legs — live keeper topology.
        vm.roll(block.number + 5);
        vm.warp(block.timestamp + 60);

        uint256 notionalId = _fireNotional(id);

        (IMacroThesis shiller,) = MacroThesisRegistry.thesisOf("SHILLER_MACRO_RISK");
        HedgeMandate memory expectedMandate = HedgeMandate({
            economicTheory: shiller,
            underlyingMarket: PolygonPools.POLYGON_WCOP_USDC_POOL_ID(),
            targetNotional: 50_000,
            chainId: 137,
            isLong: true
        });
        vm.expectEmit(true, false, false, true, address(strategist));
        emit StrategistDecided(id, "SHILLER_MACRO_RISK", expectedMandate);
        platform.fulfill(
            address(strategist),
            notionalId,
            _resp(abi.encode(int256(50_000)), ResponseStatus.Success),
            ResponseStatus.Success
        );

        // Same field-by-field fallback after the cross-block join.
        HedgeMandate memory m = strategist.getMandate(id);
        assertEq(
            PoolId.unwrap(m.underlyingMarket),
            PoolId.unwrap(PolygonPools.POLYGON_WCOP_USDC_POOL_ID()),
            "cross-block underlyingMarket anchored"
        );
        assertTrue(address(m.economicTheory) != address(0), "cross-block economicTheory resolvable");
        assertEq(m.targetNotional, 50_000, "cross-block targetNotional");
        assertGt(strategist.decisionState(id).decidedAt, 0, "cross-block join recorded decidedAt");
    }

    /*//////////////////////////////////////////////////////////////
                        assembled-mandate well-formedness
    //////////////////////////////////////////////////////////////*/

    function test_WhenAMandateIsAssembled() external {
        // Drive a full school + notional to the join.
        (bytes32 id,) = _completeSchool("SHILLER_MACRO_RISK");
        uint256 notionalId = _fireNotional(id);
        platform.fulfill(
            address(strategist),
            notionalId,
            _resp(abi.encode(int256(50_000)), ResponseStatus.Success),
            ResponseStatus.Success
        );

        HedgeMandate memory m = strategist.getMandate(id);
        // it anchors underlyingMarket to the polygon wcop usdc pool id
        assertEq(
            PoolId.unwrap(m.underlyingMarket),
            PoolId.unwrap(PolygonPools.POLYGON_WCOP_USDC_POOL_ID()),
            "underlyingMarket anchored"
        );
        // it resolves the school handle to a non zero thesis
        assertTrue(address(m.economicTheory) != address(0), "economicTheory resolvable");
        // it bounds the target notional in range
        assertTrue(
            m.targetNotional >= MIN_NOTIONAL && m.targetNotional <= MAX_NOTIONAL, "targetNotional in range"
        );
        // it sets chainId to 137 and isLong true
        assertEq(m.chainId, 137, "chainId == 137");
        assertTrue(m.isLong, "isLong == true");

        // it lines up the mandate field types with the hedge leg params hand off
        // (compile-time proof the four pass-through field types copy across zero-translation; NO Phase-14 geometry.)
        HedgeLegParams memory legs = HedgeLegParams({
            underlyingMarket: m.underlyingMarket,
            strikeWAD: 0,
            size: 0,
            economicTheory: m.economicTheory,
            chainId: m.chainId,
            isLong: m.isLong,
            payoffTerms: PayoffTerms(0, 0, int24(0), 0, 0)
        });
        assertEq(legs.chainId, m.chainId, "HedgeLegParams.chainId copies from the mandate (type compatibility)");
    }

    /*//////////////////////////////////////////////////////////////
                          auth / replay (inherited)
    //////////////////////////////////////////////////////////////*/

    modifier whenACallbackCallerIsNotThePlatform() {
        _;
    }

    function test_WhenACallbackCallerIsNotThePlatform() external whenACallbackCallerIsNotThePlatform {
        (, uint256 schoolId) = _fireSchool();
        Response[] memory rs = _resp(abi.encode(string("SHILLER_MACRO_RISK")), ResponseStatus.Success);
        address bad = address(0xBAD);
        vm.prank(bad);
        vm.expectRevert(abi.encodeWithSelector(SomniaAgentConsumer.NotPlatform.selector, bad));
        strategist.handleResponse(schoolId, rs, ResponseStatus.Success, _emptyReq());
    }

    function test_GivenAnUnknownOrReplayedRequestId() external whenACallbackCallerIsNotThePlatform {
        (, uint256 schoolId) = _fireSchool();
        Response[] memory rs = _resp(abi.encode(string("SHILLER_MACRO_RISK")), ResponseStatus.Success);
        // first delivery clears pending; second (replay) reverts UnknownRequest.
        platform.fulfill(address(strategist), schoolId, rs, ResponseStatus.Success);
        vm.expectRevert(abi.encodeWithSelector(SomniaAgentConsumer.UnknownRequest.selector, schoolId));
        platform.fulfill(address(strategist), schoolId, rs, ResponseStatus.Success);
    }
}
