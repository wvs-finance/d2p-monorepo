// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {SomniaAgentConsumer} from "./SomniaAgentConsumer.sol";
import {IJsonApiAgent, Response, ResponseStatus} from "./interfaces/ISomniaAgents.sol";

/// @title SomniaProbe
/// @notice Minimal end-to-end probe: has the JSON API Request agent fetch our keyless keeper-proxy
///         URL and store the result via callback. Exposes BOTH `fetchUint` and `fetchString`
///         entrypoints so the live testnet run resolves the open question — whether the agent can
///         coerce our quoted-string `{"value":"775"}` to uint256 (`fetchUint`) or whether the
///         string path (`fetchString` + on-chain parse) is required.
///
/// @dev Selector is the bare key `"value"` (NO leading dot — a leading dot walks body[""][value]).
///      decimals = 0: the proxy already scaled (77.5% → 775); the agent MUST NOT re-scale.
contract SomniaProbe is SomniaAgentConsumer {
    /// @notice JSON API Request agent (Somnia testnet).
    uint256 public constant JSON_API_AGENT_ID = 13174292974160097713;

    /// @notice Bare selector into the proxy's normalized `{value,unit,ts}` body.
    string internal constant VALUE_SELECTOR = "value";

    enum Mode {
        Uint,
        String
    }

    mapping(uint256 => Mode) public requestMode;

    uint256 public latestUint;
    string public latestString;
    uint256 public lastUpdatedAt;

    event ProbeUintReceived(uint256 indexed requestId, uint256 value);
    event ProbeStringReceived(uint256 indexed requestId, string value);
    event ProbeFailed(uint256 indexed requestId, ResponseStatus status);

    constructor(address platform) SomniaAgentConsumer(platform) {}

    /// @notice Ask the agent for `fetchUint(url, "value", 0)`. Over-fund (floor + p_i*subSize).
    function requestUint(string calldata url) external payable returns (uint256 requestId) {
        bytes memory payload =
            abi.encodeWithSelector(IJsonApiAgent.fetchUint.selector, url, VALUE_SELECTOR, uint8(0));
        requestId = _sendRequest(JSON_API_AGENT_ID, payload);
        requestMode[requestId] = Mode.Uint;
    }

    /// @notice Ask the agent for `fetchString(url, "value")` (fallback if the uint coercion fails).
    function requestString(string calldata url) external payable returns (uint256 requestId) {
        bytes memory payload = abi.encodeWithSelector(IJsonApiAgent.fetchString.selector, url, VALUE_SELECTOR);
        requestId = _sendRequest(JSON_API_AGENT_ID, payload);
        requestMode[requestId] = Mode.String;
    }

    function _onResult(uint256 requestId, Response[] memory responses, ResponseStatus status) internal override {
        Mode mode = requestMode[requestId];
        delete requestMode[requestId]; // lifecycle parity with pendingRequests

        if (status != ResponseStatus.Success || responses.length == 0) {
            emit ProbeFailed(requestId, status);
            return;
        }
        // NB: trusts the consensus value at index 0 (subSize may deliver several Responses).
        bytes memory result = responses[0].result;

        if (mode == Mode.Uint) {
            // Defensive: a non-32-byte payload (e.g. the agent returned a string, not a uint)
            // would make abi.decode REVERT the platform callback and leave the request stuck
            // pending. Route it to ProbeFailed instead.
            if (result.length != 32) {
                emit ProbeFailed(requestId, status);
                return;
            }
            latestUint = abi.decode(result, (uint256));
            lastUpdatedAt = block.timestamp;
            emit ProbeUintReceived(requestId, latestUint);
        } else {
            // try/catch around the external self-decode so a malformed string payload is
            // caught (ProbeFailed) rather than reverting the callback.
            try this.decodeString(result) returns (string memory s) {
                latestString = s;
                lastUpdatedAt = block.timestamp;
                emit ProbeStringReceived(requestId, s);
            } catch {
                emit ProbeFailed(requestId, status);
            }
        }
    }

    /// @dev External so `_onResult` can wrap it in try/catch; pure decode helper only.
    function decodeString(bytes memory b) external pure returns (string memory) {
        return abi.decode(b, (string));
    }
}
