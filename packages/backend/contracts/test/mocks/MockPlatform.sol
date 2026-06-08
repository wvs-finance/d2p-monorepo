// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {
    IAgentRequester,
    Request,
    Response,
    ResponseStatus,
    ConsensusType
} from "../../src/interfaces/ISomniaAgents.sol";
import {SomniaAgentConsumer} from "../../src/SomniaAgentConsumer.sol";

/// @notice Minimal in-memory stand-in for the Somnia agent platform, for unit tests.
///         Records what `_sendRequest` forwarded, and replays the callback as if it
///         were the real platform (so `msg.sender == PLATFORM` holds in handleResponse).
///
/// @dev This mock REPLAYS the consumer's own callback selector — it does NOT prove the
///      real platform's `handleResponse` arg-order/signature. That is a live-testnet gate
///      (see SomniaAgentConsumer.invariants.md). Here it only exercises consumer logic.
contract MockPlatform is IAgentRequester {
    uint256 public floor;
    uint256 public nextId = 1;

    // Last-call recorders (assertions).
    uint256 public lastForwardedValue;
    uint256 public lastAgentId;
    address public lastCallback;
    bytes4 public lastSelector;
    bytes public lastPayload;

    constructor(uint256 floor_) {
        floor = floor_;
    }

    function setFloor(uint256 floor_) external {
        floor = floor_;
    }

    function getRequestDeposit() external view returns (uint256) {
        return floor;
    }

    function getAdvancedRequestDeposit(uint256) external view returns (uint256) {
        return floor;
    }

    function createRequest(uint256 agentId, address callbackAddress, bytes4 callbackSelector, bytes calldata payload)
        external
        payable
        returns (uint256 requestId)
    {
        lastForwardedValue = msg.value;
        lastAgentId = agentId;
        lastCallback = callbackAddress;
        lastSelector = callbackSelector;
        lastPayload = payload;
        requestId = nextId++;
    }

    function getRequest(uint256) external pure returns (Request memory r) {
        return r; // default/empty
    }

    function hasRequest(uint256) external pure returns (bool) {
        return false;
    }

    /// @notice Replay the callback from the platform address (== this mock).
    ///         Typed call: the compiler encodes the Request/Response tuples correctly,
    ///         and any consumer revert propagates for `vm.expectRevert`.
    function fulfill(address consumer, uint256 requestId, Response[] memory responses, ResponseStatus status)
        external
    {
        Request memory empty;
        SomniaAgentConsumer(payable(consumer)).handleResponse(requestId, responses, status, empty);
    }

    /// @notice Convenience: build a one-element Response array.
    function oneResponse(bytes memory result, ResponseStatus status) external view returns (Response[] memory rs) {
        rs = new Response[](1);
        rs[0] = Response({
            validator: address(this),
            result: result,
            status: status,
            receipt: 0,
            timestamp: block.timestamp,
            executionCost: 0
        });
    }
}
