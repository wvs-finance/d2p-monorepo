// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {MockPlatform} from "./mocks/MockPlatform.sol";
import {SomniaAgentConsumer} from "../src/SomniaAgentConsumer.sol";
import {SomniaProbe} from "../src/SomniaProbe.sol";
import {Request, Response, ResponseStatus} from "../src/interfaces/ISomniaAgents.sol";

/// @dev BTT spec: test/spec/SomniaAgentConsumer.sendRequest.tree
///                test/spec/SomniaAgentConsumer.handleResponse.tree
///                test/spec/SomniaAgentConsumer.invariants.md
/// SUT: SomniaProbe — the minimal concrete consumer (dual fetchUint/fetchString entrypoints).
contract SomniaAgentConsumerTest is Test {
    MockPlatform internal platform;
    SomniaProbe internal probe;

    uint256 internal constant FLOOR = 0.03 ether;
    uint256 internal constant AGENT_ID = 13174292974160097713;
    string internal constant URL = "https://proxy.example/te/colombia/capacity-utilization";

    event AgentRequested(uint256 indexed requestId, uint256 indexed agentId);
    event ProbeUintReceived(uint256 indexed requestId, uint256 value);
    event ProbeStringReceived(uint256 indexed requestId, string value);
    event ProbeFailed(uint256 indexed requestId, ResponseStatus status);

    function setUp() public {
        platform = new MockPlatform(FLOOR);
        probe = new SomniaProbe(address(platform));
    }

    // ── helpers ────────────────────────────────────────────────────────────
    function _pending() internal returns (uint256 requestId) {
        requestId = probe.requestUint{value: FLOOR}(URL);
    }

    function _resp(bytes memory result, ResponseStatus status) internal view returns (Response[] memory) {
        return platform.oneResponse(result, status);
    }

    // ── modifiers (BTT) ──────────────────────────────────────────────────────
    modifier whenValueAtOrAboveFloor() {
        _;
    }

    /*//////////////////////////////////////////////////////////////
                              sendRequest
    //////////////////////////////////////////////////////////////*/

    function test_RevertWhen_ValueBelowFloor() public {
        vm.expectRevert(
            abi.encodeWithSelector(SomniaAgentConsumer.InsufficientDeposit.selector, FLOOR - 1, FLOOR)
        );
        probe.requestUint{value: FLOOR - 1}(URL);
    }

    function test_WhenValueAtFloor_ForwardsFullValue() public whenValueAtOrAboveFloor {
        probe.requestUint{value: FLOOR}(URL);
        assertEq(platform.lastForwardedValue(), FLOOR, "forwards exactly msg.value at floor");
    }

    function test_WhenValueAboveFloor_ForwardsFullValue() public whenValueAtOrAboveFloor {
        uint256 sent = FLOOR + 0.09 ether; // over-fund: floor + p_i*subSize
        probe.requestUint{value: sent}(URL);
        assertEq(platform.lastForwardedValue(), sent, "forwards the WHOLE over-funded msg.value");
        assertEq(address(probe).balance, 0, "consumer retains nothing from the send");
    }

    function test_WhenValueAtOrAboveFloor_MarksPending() public whenValueAtOrAboveFloor {
        uint256 id = probe.requestUint{value: FLOOR}(URL);
        assertTrue(probe.pendingRequests(id), "request marked pending");
    }

    function test_WhenValueAtOrAboveFloor_EmitsAgentRequested() public whenValueAtOrAboveFloor {
        vm.expectEmit(true, true, false, false, address(probe));
        emit AgentRequested(1, AGENT_ID);
        probe.requestUint{value: FLOOR}(URL);
    }

    function test_WhenValueAtOrAboveFloor_ForwardsAgentAndCallback() public whenValueAtOrAboveFloor {
        probe.requestUint{value: FLOOR}(URL);
        assertEq(platform.lastAgentId(), AGENT_ID, "JSON API agent id");
        assertEq(platform.lastCallback(), address(probe), "callback is the consumer");
        assertEq(platform.lastSelector(), SomniaAgentConsumer.handleResponse.selector, "callback selector");
    }

    /*//////////////////////////////////////////////////////////////
                             handleResponse
    //////////////////////////////////////////////////////////////*/

    function test_RevertWhen_CallerNotPlatform() public {
        uint256 id = _pending();
        Response[] memory rs = _resp(abi.encode(uint256(775)), ResponseStatus.Success);
        vm.expectRevert(abi.encodeWithSelector(SomniaAgentConsumer.NotPlatform.selector, address(this)));
        probe.handleResponse(id, rs, ResponseStatus.Success, _emptyReq());
    }

    function test_RevertGiven_RequestNotPending() public {
        Response[] memory rs = _resp(abi.encode(uint256(775)), ResponseStatus.Success);
        vm.expectRevert(abi.encodeWithSelector(SomniaAgentConsumer.UnknownRequest.selector, uint256(999)));
        platform.fulfill(address(probe), 999, rs, ResponseStatus.Success);
    }

    function test_GivenSuccessUint_StoresScaledValue() public {
        uint256 id = _pending();
        platform.fulfill(address(probe), id, _resp(abi.encode(uint256(775)), ResponseStatus.Success), ResponseStatus.Success);
        assertEq(probe.latestUint(), 775, "decoded uint stored");
        assertGt(probe.lastUpdatedAt(), 0, "lastUpdatedAt set on success");
        assertFalse(probe.pendingRequests(id), "pending cleared after dispatch");
    }

    function test_GivenSuccessString_StoresString() public {
        uint256 id = probe.requestString{value: FLOOR}(URL);
        platform.fulfill(address(probe), id, _resp(abi.encode(string("775")), ResponseStatus.Success), ResponseStatus.Success);
        assertEq(probe.latestString(), "775", "decoded string stored");
        assertFalse(probe.pendingRequests(id), "pending cleared");
    }

    function test_GivenFailed_DispatchesFailureNoRevert() public {
        uint256 id = _pending();
        Response[] memory rs = _resp("", ResponseStatus.Failed);
        vm.expectEmit(true, false, false, true, address(probe));
        emit ProbeFailed(id, ResponseStatus.Failed);
        platform.fulfill(address(probe), id, rs, ResponseStatus.Failed);
        assertEq(probe.latestUint(), 0, "no value stored on failure");
        assertFalse(probe.pendingRequests(id), "pending cleared even on failure");
    }

    function test_GivenTimedOut_DispatchesFailureNoRevert() public {
        uint256 id = _pending();
        platform.fulfill(address(probe), id, _resp("", ResponseStatus.TimedOut), ResponseStatus.TimedOut);
        assertFalse(probe.pendingRequests(id), "pending cleared on timeout");
    }

    function test_RevertGiven_SameRequestIdDeliveredTwice() public {
        uint256 id = _pending();
        Response[] memory rs = _resp(abi.encode(uint256(775)), ResponseStatus.Success);
        platform.fulfill(address(probe), id, rs, ResponseStatus.Success);
        // second delivery: pending already cleared -> revert (no replay)
        vm.expectRevert(abi.encodeWithSelector(SomniaAgentConsumer.UnknownRequest.selector, id));
        platform.fulfill(address(probe), id, rs, ResponseStatus.Success);
    }

    /*//////////////////////////////////////////////////////////////
                          INVARIANTS (fuzz)
    //////////////////////////////////////////////////////////////*/

    /// INV-4 — forwards the whole msg.value, retains nothing.
    function testFuzz_ForwardsFullValue(uint96 extra) public {
        uint256 sent = FLOOR + uint256(extra);
        vm.deal(address(this), sent);
        probe.requestUint{value: sent}(URL);
        assertEq(platform.lastForwardedValue(), sent);
        assertEq(address(probe).balance, 0);
    }

    /// INV-1 — only PLATFORM can fulfill; any other caller reverts and changes no state.
    function testFuzz_OnlyPlatformCanFulfill(address caller) public {
        vm.assume(caller != address(platform));
        uint256 id = _pending();
        Response[] memory rs = _resp(abi.encode(uint256(775)), ResponseStatus.Success);
        vm.prank(caller);
        vm.expectRevert(abi.encodeWithSelector(SomniaAgentConsumer.NotPlatform.selector, caller));
        probe.handleResponse(id, rs, ResponseStatus.Success, _emptyReq());
        assertTrue(probe.pendingRequests(id), "state unchanged after rejected callback");
        assertEq(probe.latestUint(), 0);
    }

    /*//////////////////////////////////////////////////////////////
                  sweep (egress — B-1 fix) + decode safety
    //////////////////////////////////////////////////////////////*/

    function test_Sweep_RevertWhen_NotOwner() public {
        vm.deal(address(probe), 1 ether);
        address bad = address(0xBAD);
        vm.prank(bad);
        vm.expectRevert(abi.encodeWithSelector(SomniaAgentConsumer.NotOwner.selector, bad));
        probe.sweep(payable(bad));
    }

    function test_Sweep_OwnerRecoversFullBalance() public {
        // setUp deploys the probe from this test contract → owner == address(this).
        vm.deal(address(probe), 1.5 ether);
        address payable rcpt = payable(address(0xC0FFEE));
        uint256 before = rcpt.balance;
        uint256 amount = probe.sweep(rcpt);
        assertEq(amount, 1.5 ether, "returns swept amount");
        assertEq(rcpt.balance - before, 1.5 ether, "rebate recovered (not trapped)");
        assertEq(address(probe).balance, 0, "consumer drained");
    }

    function test_Sweep_RevertWhen_ZeroRecipient() public {
        vm.deal(address(probe), 1 ether);
        vm.expectRevert(SomniaAgentConsumer.ZeroRecipient.selector);
        probe.sweep(payable(address(0)));
    }

    /// M-1 (uint): a non-32-byte payload on a uint request must NOT revert the callback.
    function test_GivenSuccessUint_MalformedPayload_RoutesToFailed() public {
        uint256 id = _pending();
        // Success status but the agent returned a STRING encoding (length != 32).
        Response[] memory rs = _resp(abi.encode(string("not-a-uint")), ResponseStatus.Success);
        vm.expectEmit(true, false, false, true, address(probe));
        emit ProbeFailed(id, ResponseStatus.Success);
        platform.fulfill(address(probe), id, rs, ResponseStatus.Success);
        assertEq(probe.latestUint(), 0, "no value stored from malformed payload");
        assertFalse(probe.pendingRequests(id), "pending cleared (request not bricked)");
    }

    /// M-1 (string): an undecodable-as-string payload must hit the try/catch -> ProbeFailed,
    /// not revert the callback. (abi.encode(uint) sets a bogus string offset -> decode reverts.)
    function test_GivenSuccessString_MalformedPayload_RoutesToFailed() public {
        uint256 id = probe.requestString{value: FLOOR}(URL);
        Response[] memory rs = _resp(abi.encode(uint256(123)), ResponseStatus.Success);
        vm.expectEmit(true, false, false, true, address(probe));
        emit ProbeFailed(id, ResponseStatus.Success);
        platform.fulfill(address(probe), id, rs, ResponseStatus.Success);
        assertEq(bytes(probe.latestString()).length, 0, "no string stored from malformed payload");
        assertFalse(probe.pendingRequests(id), "pending cleared (callback did not revert)");
    }

    function _emptyReq() internal pure returns (Request memory r) {
        return r; // default/empty Request (4th callback arg, unused by the consumer)
    }
}
