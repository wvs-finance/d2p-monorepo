// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Somnia Agents Platform Interface (vendored from emrestay/somnia-agents-examples)
/// @dev Testnet platform: 0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776 ; JSON API agent id 13174292974160097713

enum ConsensusType { Majority, Threshold }

enum ResponseStatus {
    None, // 0
    Pending, // 1
    Success, // 2
    Failed, // 3
    TimedOut // 4
}

struct Response {
    address validator;
    bytes result;
    ResponseStatus status;
    uint256 receipt;
    uint256 timestamp;
    uint256 executionCost;
}

struct Request {
    uint256 id;
    address requester;
    address callbackAddress;
    bytes4 callbackSelector;
    address[] subcommittee;
    Response[] responses;
    uint256 responseCount;
    uint256 failureCount;
    uint256 threshold;
    uint256 createdAt;
    uint256 deadline;
    ResponseStatus status;
    ConsensusType consensusType;
    uint256 remainingBudget;
}

interface IAgentRequester {
    event RequestCreated(
        uint256 indexed requestId, uint256 indexed agentId, uint256 perAgentBudget, bytes payload, address[] subcommittee
    );
    event RequestFinalized(uint256 indexed requestId, ResponseStatus status);

    function createRequest(uint256 agentId, address callbackAddress, bytes4 callbackSelector, bytes calldata payload)
        external
        payable
        returns (uint256 requestId);

    function getRequest(uint256 requestId) external view returns (Request memory);
    function hasRequest(uint256 requestId) external view returns (bool);
    function getRequestDeposit() external view returns (uint256);
    function getAdvancedRequestDeposit(uint256 subcommitteeSize) external view returns (uint256);
}

/// @notice JSON API Request agent ABI — encode the payload for createRequest.
/// @dev Selector for our keeper-proxy responses is the bare key "value" (NO leading dot).
interface IJsonApiAgent {
    function fetchString(string calldata url, string calldata selector) external returns (string memory);
    function fetchUint(string calldata url, string calldata selector, uint8 decimals) external returns (uint256);
    function fetchInt(string calldata url, string calldata selector, uint8 decimals) external returns (int256);
    function fetchBool(string calldata url, string calldata selector) external returns (bool);
}
