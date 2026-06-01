// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IAgentRequester, Request, Response, ResponseStatus} from "./interfaces/ISomniaAgents.sol";

/// @title SomniaAgentConsumer
/// @notice Reusable base for the Somnia async request→callback paradigm (DRAFT.md §3.5).
///         Every consumer (SomniaProbe, later AgentRouter/escrow) inherits this. It owns the
///         deposit/forward, the pending-request bookkeeping, and the authenticated callback;
///         subclasses implement only `_onResult`.
///
/// @dev DEPOSIT SEMANTICS (CLAUDE.md non-negotiable + live finding 2026-06-01):
///      `getRequestDeposit()` is an operations-reserve FLOOR, not the execution cost. Forwarding
///      ONLY the floor leaves perAgentBudget = 0 → runners skip → TimedOut. So the caller
///      over-funds (msg.value >= floor; in practice floor + p_i*subSize) and this base forwards
///      the WHOLE msg.value; unused budget is rebated to the contract via `receive()`. No refund.
abstract contract SomniaAgentConsumer {
    /// @notice The Somnia agent platform (testnet 0x037Bb9…6776). Set once at deploy.
    IAgentRequester public immutable PLATFORM;

    /// @notice Egress authority — can recover rebates/surplus held by the consumer.
    address public immutable owner;

    /// @notice requestId → is awaiting a callback.
    mapping(uint256 => bool) public pendingRequests;

    event AgentRequested(uint256 indexed requestId, uint256 indexed agentId);
    event Swept(address indexed to, uint256 amount);

    error InsufficientDeposit(uint256 sent, uint256 floor);
    error NotPlatform(address caller);
    error UnknownRequest(uint256 requestId);
    error NotOwner(address caller);
    error SweepFailed();
    error ZeroRecipient();

    constructor(address platform) {
        PLATFORM = IAgentRequester(platform);
        owner = msg.sender;
    }

    /// @notice Recover STT held by the consumer (platform rebates + over-fund surplus).
    /// @dev The reusable base MUST expose egress — `receive()` is an inflow with no other
    ///      outflow, so without this every inherited rebate would be permanently trapped.
    ///      Subclasses with real escrow accounting should govern egress themselves; this is
    ///      the base-level rescue. Owner-only; CEI-safe (no state mutated after the call).
    function sweep(address payable to) external returns (uint256 amount) {
        if (msg.sender != owner) revert NotOwner(msg.sender);
        if (to == address(0)) revert ZeroRecipient(); // a call to 0x0 succeeds and would burn the balance
        amount = address(this).balance;
        (bool ok,) = to.call{value: amount}("");
        if (!ok) revert SweepFailed();
        emit Swept(to, amount);
    }

    /// @notice Forward the whole msg.value to the platform and register the request.
    /// @param agentId The Somnia agent id (e.g. JSON API Request).
    /// @param payload abi-encoded agent call (e.g. `IJsonApiAgent.fetchUint(url, "value", 0)`).
    /// @dev Floor read from `getRequestDeposit()` assumes the default subcommittee size (3); a
    ///      consumer needing a different subSize must use `getAdvancedRequestDeposit(subSize)`.
    ///      The caller owns the price term: msg.value should be floor + p_i*subSize (p_i =
    ///      0.03/0.07/0.10 per class) so perAgentBudget > 0; under-funding → TimedOut, not revert.
    function _sendRequest(uint256 agentId, bytes memory payload) internal returns (uint256 requestId) {
        uint256 floor = PLATFORM.getRequestDeposit();
        if (msg.value < floor) revert InsufficientDeposit(msg.value, floor);

        // Forward the FULL over-funded msg.value: the surplus above the floor funds perAgentBudget.
        requestId = PLATFORM.createRequest{value: msg.value}(
            agentId, address(this), this.handleResponse.selector, payload
        );

        pendingRequests[requestId] = true;
        emit AgentRequested(requestId, agentId);
    }

    /// @notice Platform callback once validators reach consensus. Authenticated + replay-safe.
    /// @dev Signature/arg-order mirrors the canonical example exactly; it is the live-testnet gate.
    function handleResponse(
        uint256 requestId,
        Response[] memory responses,
        ResponseStatus status,
        Request memory /* details */
    ) external {
        if (msg.sender != address(PLATFORM)) revert NotPlatform(msg.sender);
        if (!pendingRequests[requestId]) revert UnknownRequest(requestId);

        // Effects before interaction (CEI): clearing pending first makes re-delivery revert.
        delete pendingRequests[requestId];

        _onResult(requestId, responses, status);
    }

    /// @notice Subclass hook — handle the consensus result. MUST NOT assume success.
    function _onResult(uint256 requestId, Response[] memory responses, ResponseStatus status) internal virtual;

    /// @notice Accept platform rebates (unused agent budget).
    receive() external payable {}
}
