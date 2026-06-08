// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {SomniaAgentConsumer} from "../SomniaAgentConsumer.sol";
import {ILLMAgent, Response, ResponseStatus} from "../interfaces/ISomniaAgents.sol";
import {MacroDatum} from "../MacroOracle.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {HedgeMandate} from "../types/HedgeMandate.sol";
import {IMacroThesis, MacroThesisRegistry} from "../interfaces/IMacroThesis.sol";
import {PolygonPools} from "../libraries/PolygonPools.sol";
import {PoolId} from "v4-core/types/PoolId.sol";

/// @notice Minimal read seam over `MacroOracle.latest` — only the getter the strategist needs.
/// @dev The public-mapping-of-struct getter on MacroOracle returns the full `MacroDatum`
///      (value-typed, no nested arrays/mappings ⇒ returnable under ^0.8.24).
interface IMacroOracleLatest {
    function latest(bytes32 dataKey) external view returns (MacroDatum memory);
}

/// @title MacroHedgeStrategist
/// @notice Autonomous on-chain hedge-decision agent (Agentathon POC, AGENT-01). Reads a
///         `MacroOracle` datum, builds a deterministic macro-hedging prompt over the caller's
///         free-text intent + the live macro print, and fires TWO LLM-Inference requests across
///         TWO transactions:
///           - `requestSchoolDecision`   → `inferString` (the economic SCHOOL, constrained to
///                                          `MacroThesisRegistry.schoolLabels()`)
///           - `requestNotionalDecision` → `inferNumber`  (the target NOTIONAL, bounded
///                                          `[MIN_NOTIONAL, MAX_NOTIONAL]` in whole USD)
///         ONE infer per transaction — `_sendRequest` forwards the WHOLE `msg.value` (the over-fund
///         footgun), so two legs in one tx would starve the second. The keeper sequences both.
///
///         Agent 1 emits the hedge MANDATE (intent: school + direction + target notional), NOT the
///         leg geometry. The moneyness / strike / width / feasible-size GEOMETRY is Agent 2's
///         representativeness output (Phase 14). The two-type seam (HedgeMandate vs HedgeLegParams)
///         keeps that Agent-1/Agent-2 boundary honest.
///
/// @dev JOIN DESIGN (BLOCKER-1 fix): the two legs run in DIFFERENT blocks. The `decisionId` is
///      therefore derived from the SCHOOL leg's own monotonic `requestId` — never a block-varying
///      term — so it is STABLE across the two txs and the `schoolSet && notionalSet`
///      completion check lands on the SAME struct regardless of which block each callback arrives in.
///
///      AUTH: the inherited `handleResponse` already enforces `msg.sender == PLATFORM` +
///      `pendingRequests` binding + CEI delete-before-dispatch + replay-revert. This contract
///      implements ONLY `_onResult` and never re-declares `handleResponse` nor a bespoke
///      `require(msg.sender == PLATFORM)`.
///
///      DECODE-SAFETY: the school string is decoded behind a try/catch (`SomniaProbe` pattern) so a
///      malformed/wrong-type payload routes to `DecisionFailed` and leaves `schoolSet == false`
///      (no default write) instead of bricking the pending request; the notional int is 32-byte
///      length-guarded. The `allowedValues` / `[MIN_NOTIONAL, MAX_NOTIONAL]` bounds ARE the
///      structural guardrail.
contract MacroHedgeStrategist is SomniaAgentConsumer {
    using Strings for int256;

    /*//////////////////////////////////////////////////////////////
                                CONSTANTS
    //////////////////////////////////////////////////////////////*/

    /// @notice Somnia testnet LLM-Inference agent id (one-line fix point if the live id differs).
    uint256 public constant LLM_AGENT_ID = 12847293847561029384;

    /// @notice 1,000 USD floor — a non-degenerate minimum cash flow (whole USD notional, NOT bps).
    uint256 public constant MIN_NOTIONAL = 1_000;
    /// @notice 100,000,000 USD cap — wide enough that a different prompt -> a different notional is observable.
    uint256 public constant MAX_NOTIONAL = 100_000_000;
    /// @notice Polygon — matches HedgeMandate.chainId / HedgeLegParams.chainId width.
    uint32 public constant POLYGON_CHAIN_ID = 137;

    /// @notice Deterministic system prompt — temperature-0 on-chain Qwen3-30B.
    string internal constant SYSTEM_PROMPT =
        "You are a macro hedging strategist. Given a user hedging intent and the live macro print, (1) choose the economic school that best frames the hedge from the allowed set, and (2) propose a target notional in whole USD to hedge. Output only the constrained value for each leg.";

    /*//////////////////////////////////////////////////////////////
                              ENUMS / STORAGE
    //////////////////////////////////////////////////////////////*/

    /// @notice Which infer leg a given requestId belongs to.
    enum Leg {
        None,
        School,
        Notional
    }

    /// @notice The pending (or completed) hedge mandate, keyed by the stable decisionId. The
    ///         assembled `HedgeMandate` is filled field-by-field as the two legs land and emitted
    ///         WHOLE at the join (RESEARCH Pattern 3 — embedded shape, NOT freshly-assembled-in-memory).
    /// @dev `schoolSet`/`notionalSet` sequence the two-callback completion; the school callback is
    ///      the ONLY writer of `schoolSet` (and of `schoolLabel`), so an empty/unknown slot reads
    ///      `schoolSet == false`.
    struct PendingMandate {
        string userIntent; // the caller free-text intent (Fork A/4B) — rebuilds the notional prompt deterministically
        int256 macroValue; // oracle scaledValue at request time (`actual`)
        int256 consensus; // caller-supplied expectation (same scale as scaledValue)
        string schoolLabel; // the mapped school label (for promptBias + the StrategistDecided event) — WRITTEN BY THE SCHOOL CALLBACK
        uint64 decidedAt; // block.timestamp once BOTH legs land; 0 while pending
        bool schoolSet;
        bool notionalSet;
        HedgeMandate mandate; // fields filled as legs land; emitted whole at the join
    }

    /// @notice Flat read-shape for the test/UI: the join-progress flags + the mapped label. Returned
    ///         as a SINGLE struct in memory — member access (`.schoolSet`) compiles, the auto-getter
    ///         positional tuple does NOT (solc 0.8.24 Error 9582; the v1 `getDecision` lesson).
    struct DecisionState {
        bool schoolSet;
        bool notionalSet;
        uint64 decidedAt;
        string schoolLabel;
    }

    /// @notice MacroOracle datum source (immutable).
    address public immutable ORACLE;

    mapping(uint256 => Leg) internal _leg; // requestId → which leg
    mapping(uint256 => bytes32) internal _decisionKey; // requestId → decisionId
    mapping(bytes32 => PendingMandate) internal _mandates; // decisionId → mandate (typed getMandate is the accessor)

    /*//////////////////////////////////////////////////////////////
                              ERRORS / EVENTS
    //////////////////////////////////////////////////////////////*/

    error UnknownKey(bytes32 dataKey);
    error UnknownDecision(bytes32 decisionId);

    event HedgeDecisionRequested(uint256 indexed requestId, bytes32 indexed decisionId, uint8 leg);
    event DecisionFailed(uint256 indexed requestId, ResponseStatus status);
    event StrategistDecided(bytes32 indexed decisionId, string school, HedgeMandate mandate);

    /*//////////////////////////////////////////////////////////////
                               CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(address platform, address oracle) SomniaAgentConsumer(platform) {
        ORACLE = oracle;
    }

    /*//////////////////////////////////////////////////////////////
                               ENTRYPOINTS
    //////////////////////////////////////////////////////////////*/

    /// @notice School leg: read the oracle datum, fire ONE `inferString` over the registry school
    ///         labels, and allocate a fresh stable `decisionId` (from the school requestId) that the
    ///         notional leg references.
    /// @param userIntent the caller's free-text hedging intent (Fork A/4B — rides into the prompt).
    /// @param dataKey    the MacroOracle dataKey (keccak256(name)).
    /// @param consensus  the consensus expectation in the SAME scale as the oracle `scaledValue`.
    /// @return decisionId the stable id to pass to `requestNotionalDecision`.
    function requestSchoolDecision(string calldata userIntent, bytes32 dataKey, int256 consensus)
        external
        payable
        returns (bytes32 decisionId)
    {
        MacroDatum memory d = IMacroOracleLatest(ORACLE).latest(dataKey);
        if (d.deliveredAt == 0) revert UnknownKey(dataKey); // unset datum (keeper must refresh first)
        int256 actual = d.scaledValue;

        string memory prompt = _buildSchoolPrompt(userIntent, actual); // deterministic; intent + macro context
        string[] memory allowed = MacroThesisRegistry.schoolLabels(); // the STRUCTURAL guardrail — single source of truth

        bytes memory payload =
            abi.encodeWithSelector(ILLMAgent.inferString.selector, prompt, SYSTEM_PROMPT, false, allowed);

        // ONE infer per tx: _sendRequest forwards the WHOLE msg.value.
        uint256 requestId = _sendRequest(LLM_AGENT_ID, payload);

        // STABLE, block-independent decisionId from the monotonic school requestId.
        decisionId = bytes32(requestId);

        // One-shot guard: a fresh requestId guarantees a fresh slot, but assert it.
        PendingMandate storage slot = _mandates[decisionId];
        require(slot.decidedAt == 0 && !slot.schoolSet && !slot.notionalSet, "decision exists");

        slot.userIntent = userIntent;
        slot.macroValue = actual;
        slot.consensus = consensus;

        _leg[requestId] = Leg.School;
        _decisionKey[requestId] = decisionId;

        emit HedgeDecisionRequested(requestId, decisionId, uint8(Leg.School));
    }

    /// @notice Notional leg: bind to an EXISTING decision (school callback completed) and fire ONE
    ///         `inferNumber` (target notional). Takes the SAME decisionId explicitly.
    /// @dev GUARD (B2): existence ⇔ `schoolSet == true` (the school callback is the only writer of
    ///      it); `!notionalSet` ensures the notional leg has not already run. So the caller MUST
    ///      complete the school FIRST — a bare notional request on an un-school'd decision reverts
    ///      UnknownDecision before the clamp ever runs.
    function requestNotionalDecision(bytes32 decisionId) external payable returns (uint256 requestId) {
        PendingMandate storage m = _mandates[decisionId];
        if (!m.schoolSet || m.notionalSet) revert UnknownDecision(decisionId); // B2: complete the school FIRST

        // Rebuild the prompt deterministically from the stored (intent, macroValue, consensus) + the
        // chosen school's bias fragment.
        string memory prompt = _buildNotionalPrompt(m.userIntent, m.macroValue, m.consensus, m.schoolLabel);

        bytes memory payload = abi.encodeWithSelector(
            ILLMAgent.inferNumber.selector, prompt, SYSTEM_PROMPT, int256(MIN_NOTIONAL), int256(MAX_NOTIONAL), false
        );

        requestId = _sendRequest(LLM_AGENT_ID, payload);

        _leg[requestId] = Leg.Notional;
        _decisionKey[requestId] = decisionId;

        emit HedgeDecisionRequested(requestId, decisionId, uint8(Leg.Notional));
    }

    /*//////////////////////////////////////////////////////////////
                                CALLBACK
    //////////////////////////////////////////////////////////////*/

    /// @notice Subclass hook — the inherited `handleResponse` already authenticated + cleared pending.
    function _onResult(uint256 requestId, Response[] memory responses, ResponseStatus status) internal override {
        Leg leg = _leg[requestId];
        bytes32 dk = _decisionKey[requestId];
        delete _leg[requestId];
        delete _decisionKey[requestId];

        if (status != ResponseStatus.Success || responses.length == 0) {
            emit DecisionFailed(requestId, status);
            return;
        }

        bytes memory result = responses[0].result;

        if (leg == Leg.School) {
            // try/catch around the external self-decode so a malformed payload routes to DecisionFailed.
            try this.decodeString(result) returns (string memory s) {
                (IMacroThesis handle, bool ok) = MacroThesisRegistry.thesisOf(s);
                if (!ok) {
                    // No-match: leave schoolSet == false (NO default write).
                    emit DecisionFailed(requestId, status);
                    return;
                }
                _mandates[dk].mandate.economicTheory = handle;
                _mandates[dk].schoolLabel = s; // PROVENANCE: schoolLabel written HERE, in the callback
                _mandates[dk].schoolSet = true;
            } catch {
                emit DecisionFailed(requestId, status);
                return;
            }
        } else if (leg == Leg.Notional) {
            // 32-byte length guard: a string/non-int payload routes to DecisionFailed (no notional stored).
            if (result.length != 32) {
                emit DecisionFailed(requestId, status);
                return;
            }
            int256 raw = abi.decode(result, (int256));
            // raw <= MIN floors UP to MIN_NOTIONAL (covers negatives + positives below the floor);
            // over-cap clamps to MAX_NOTIONAL; otherwise stored unchanged.
            uint256 clamped =
                raw <= int256(MIN_NOTIONAL) ? MIN_NOTIONAL : (uint256(raw) > MAX_NOTIONAL ? MAX_NOTIONAL : uint256(raw));
            _mandates[dk].mandate.targetNotional = clamped;
            _mandates[dk].notionalSet = true;
        } else {
            // Defensive: unknown leg (should be unreachable — pendingRequests bound it).
            emit DecisionFailed(requestId, status);
            return;
        }

        // Join: assemble + emit only once BOTH legs have landed on the SAME (block-independent) decisionId.
        PendingMandate storage pm = _mandates[dk];
        if (pm.schoolSet && pm.notionalSet) {
            pm.mandate.underlyingMarket = PolygonPools.POLYGON_WCOP_USDC_POOL_ID(); // STRAT-02 anchor
            pm.mandate.chainId = POLYGON_CHAIN_ID; // 137
            pm.mandate.isLong = true; // Scenario 1 derived direction
            pm.decidedAt = uint64(block.timestamp);
            emit StrategistDecided(dk, pm.schoolLabel, pm.mandate);
        }
    }

    /// @dev External so `_onResult` can wrap it in try/catch (exact SomniaProbe pattern). NOTE: an
    ///      int-encoded 32-byte blob does NOT revert here — it decodes to a garbage string; the
    ///      `MacroThesisRegistry.thesisOf` keccak-compare is the second guard (garbage → no label →
    ///      DecisionFailed).
    function decodeString(bytes memory b) external pure returns (string memory) {
        return abi.decode(b, (string));
    }

    /*//////////////////////////////////////////////////////////////
                                  VIEW
    //////////////////////////////////////////////////////////////*/

    /// @notice Typed accessor returning the assembled `HedgeMandate` in memory.
    /// @dev `_mandates` is internal — this is the read accessor. Returns the embedded mandate
    ///      (fields filled as legs land; fully populated once both legs join).
    function getMandate(bytes32 decisionId) external view returns (HedgeMandate memory) {
        return _mandates[decisionId].mandate;
    }

    /// @notice The join-progress flags + the mapped label, as a SINGLE struct in memory.
    /// @dev REQUIRED for tests/UI: member access like `decisionState(id).schoolSet` compiles; a
    ///      positional-tuple auto-getter does NOT (solc 0.8.24 Error 9582 — the v1 `getDecision` lesson).
    function decisionState(bytes32 decisionId) external view returns (DecisionState memory) {
        PendingMandate storage m = _mandates[decisionId];
        return DecisionState({
            schoolSet: m.schoolSet,
            notionalSet: m.notionalSet,
            decidedAt: m.decidedAt,
            schoolLabel: m.schoolLabel
        });
    }

    /*//////////////////////////////////////////////////////////////
                                INTERNAL
    //////////////////////////////////////////////////////////////*/

    /// @dev Deterministic school prompt over the caller intent + the live macro print.
    function _buildSchoolPrompt(string memory userIntent, int256 actual) internal pure returns (string memory) {
        return string.concat(
            "User hedging intent: ",
            userIntent,
            ". Live macro print (scaled int): ",
            actual.toStringSigned(),
            ". Choose the economic school that best frames hedging this risk."
        );
    }

    /// @dev Deterministic notional prompt rebuilt from the stored (intent, actual, consensus) + the
    ///      chosen school's bias fragment.
    function _buildNotionalPrompt(string memory userIntent, int256 actual, int256 consensus, string memory schoolLabel)
        internal
        pure
        returns (string memory)
    {
        return string.concat(
            MacroThesisRegistry.promptBias(schoolLabel),
            " User intent: ",
            userIntent,
            ". Actual (scaled int): ",
            actual.toStringSigned(),
            ". Consensus (scaled int): ",
            consensus.toStringSigned(),
            ". Propose the target notional in whole USD to hedge."
        );
    }
}
