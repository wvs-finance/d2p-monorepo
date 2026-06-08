// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @notice How responses are aggregated to reach finality.
enum ConsensusType {
    Majority,   // Finalizes when `threshold` validators return byte-identical results
    Threshold   // Finalizes when `threshold` validators return *any* successful result
}

/// @notice Lifecycle status of a request or individual response.
enum ResponseStatus {
    None,       // 0 - Default zero value (uninitialized storage)
    Pending,    // 1 - Awaiting responses
    Success,    // 2 - Consensus reached normally
    Failed,     // 3 - Validators reported failure (success became impossible)
    TimedOut    // 4 - Request timed out
}

/// @notice A single validator's response to a request.
struct Response {
    address validator;
    bytes result;
    ResponseStatus status;
    uint256 receipt;        // Off-chain receipt ID (currently always 0 on-chain)
    uint256 timestamp;
    uint256 executionCost;  // Self-reported, capped at perAgentBudget
}

/// @notice On-chain representation of an agent execution request.
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
    uint256 remainingBudget;   // Escrow remaining at any point in the lifecycle
    uint256 perAgentBudget;    // Cap each elected member can claim — set at creation
}

/// @title IAgentRequester
/// @notice Consumer interface for invoking agents on Somnia.
/// @dev Deployed at:
///      - Mainnet: 0x5E5205CF39E766118C01636bED000A54D93163E6 (chain id 5031)
///      - Testnet: 0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776 (chain id 50312)
interface IAgentRequester {
    // ──────────────────────────────────────────────
    // Events
    // ──────────────────────────────────────────────

    /// @notice Emitted when a new agent execution request is created.
    /// @param requestId The unique request identifier.
    /// @param agentId The agent being executed.
    /// @param perAgentBudget Cap on what each subcommittee member can claim (= rewardPot / subSize).
    /// @param payload ABI-encoded function call forwarded to the agent.
    /// @param subcommittee Elected validator addresses.
    event RequestCreated(
        uint256 indexed requestId,
        uint256 indexed agentId,
        uint256 perAgentBudget,
        bytes payload,
        address[] subcommittee
    );

    /// @notice Emitted when a request reaches a terminal status.
    event RequestFinalized(uint256 indexed requestId, ResponseStatus status);

    /// @notice Emitted when the elected subcommittee is paid via the committee on finalization.
    event SubcommitteePaid(uint256 indexed requestId, uint256 totalPaid, uint256 perMember);

    /// @notice Emitted when the committee deposit call reverts and the budget is restored.
    event CommitteeDepositFailed(uint256 indexed requestId, uint256 attemptedAmount);

    /// @notice Emitted when a native-token transfer (e.g. a rebate) fails and remains in-contract.
    event NativeTransferFailed(address indexed recipient, uint256 amount);

    // ──────────────────────────────────────────────
    // Errors
    // ──────────────────────────────────────────────

    error AgentNotFound(uint256 agentId);
    error RequestNotFound(uint256 requestId);
    error NotSubcommitteeMember();
    error RequestTimedOut(uint256 requestId);
    error AlreadyResponded();
    error RequestAlreadyFinalized(uint256 requestId);
    error SubcommitteeSizeExceedsMax(uint256 size, uint256 max);
    error InvalidThreshold(uint256 threshold, uint256 subcommitteeSize);
    error InvalidTimeout();
    /// @notice Thrown when msg.value is below the operations-reserve floor. NOTE: meeting the floor only is *not* enough to get the request executed — see `getRequestDeposit` notes.
    error InsufficientDeposit(uint256 sent, uint256 required);
    error NotEnoughActiveMembers(uint256 available, uint256 required);

    // ──────────────────────────────────────────────
    // Request creation (payable — sends budget upfront)
    // ──────────────────────────────────────────────

    /// @notice Create an agent execution request with default consensus parameters
    ///         (subcommittee size + threshold + timeout configured by the operator;
    ///         current defaults: subSize=3, threshold=2, timeout=15 minutes, Majority consensus).
    /// @param agentId The agent to execute (lookup via the Agent Explorer or AgentRegistry).
    /// @param callbackAddress The contract to call back when the request finalizes (zero = no callback).
    /// @param callbackSelector The 4-byte selector of the callback function.
    /// @param payload ABI-encoded function call (selector + args) forwarded to the agent.
    /// @return requestId The newly created request's identifier.
    function createRequest(
        uint256 agentId,
        address callbackAddress,
        bytes4 callbackSelector,
        bytes calldata payload
    ) external payable returns (uint256 requestId);

    /// @notice Create an agent execution request with custom consensus parameters.
    /// @param subcommitteeSize Number of validators to elect (≤ operator-configured max).
    /// @param threshold Successful responses needed for consensus (≤ subcommitteeSize).
    /// @param consensusType Majority for byte-identical results, Threshold for any successful result (median/XOR aggregation).
    /// @param timeout Deadline duration in seconds.
    function createAdvancedRequest(
        uint256 agentId,
        address callbackAddress,
        bytes4 callbackSelector,
        bytes calldata payload,
        uint256 subcommitteeSize,
        uint256 threshold,
        ConsensusType consensusType,
        uint256 timeout
    ) external payable returns (uint256 requestId);

    // ──────────────────────────────────────────────
    // Queries
    // ──────────────────────────────────────────────

    function getRequest(uint256 requestId) external view returns (Request memory);

    function hasRequest(uint256 requestId) external view returns (bool);

    /// @notice Operations-reserve floor for a default request (= minPerAgentDeposit × defaultSubSize).
    /// @dev This is *not* the practical deposit. msg.value must additionally cover the per-agent
    ///      execution price runners expect, otherwise the request will be skipped and time out.
    ///      Use `getRequestDeposit() + pricePerAgent * subcommitteeSize` for the actual deposit.
    function getRequestDeposit() external view returns (uint256);

    /// @notice Operations-reserve floor for a custom subcommittee size. Same caveat as `getRequestDeposit`.
    function getAdvancedRequestDeposit(uint256 subcommitteeSize) external view returns (uint256);
}

/// @title IAgentRequesterHandler
/// @notice Implement this interface on the contract you pass as `callbackAddress`.
interface IAgentRequesterHandler {
    /// @notice Called by the AgentRequester contract when a request reaches a terminal status.
    /// @dev MUST validate `msg.sender == address(somniaAgents)` and look up the request in your own
    ///      pending-requests mapping before acting on the response.
    /// @param requestId The finalized request identifier.
    /// @param responses Array of all responses submitted up to finalization. For Majority consensus,
    ///                  at least `threshold` of these will share the same `.result`. For Threshold
    ///                  consensus, results may differ — iterate and aggregate as appropriate.
    /// @param status The terminal status: Success (2), Failed (3), or TimedOut (4).
    /// @param details The full Request struct (subcommittee, threshold, deadline, etc.).
    function handleResponse(
        uint256 requestId,
        Response[] memory responses,
        ResponseStatus status,
        Request memory details
    ) external;
}
