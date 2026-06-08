// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/*//////////////////////////////////////////////////////////////////////////////
  MacroOracle — on-chain architecture (DESIGN SKETCH).

  Status: pre-gate elaboration. Catalog entries are real (live-probed 2026-06-01);
  consumer bodies are TODO and land via /opsx:apply AFTER the review gate passes.

  ── The one non-negotiable: the TE API key NEVER comes on-chain ──────────────
  There is intentionally NO on-chain function that returns the key. The original
  `IZK_Keeper.complete() returns (string key)` sketch is REMOVED because a Solidity
  return value is public (calldata/returndata/events/storage are all world-readable),
  so it would publish the paid secret instantly. Verified boundary: the EVM cannot
  keep a secret AND cannot make the outbound HTTPS call, so the key is held + used
  ONLY by the off-chain keeper. Fhenix/FHE does not help: FHE performs no network I/O,
  and its decryption happens off-chain — the key would still be used in plaintext
   off-chain. FHE is the wrong tool for this problem.

  ── How the off-chain key bridges to on-chain (two honest forms) ─────────────
    (NOW, trusted)  The consumer embeds a KEYLESS proxy URL in the json-fetch
                    request. The off-chain keeper-proxy injects `?c=<key>` server-
                    side, calls TE, and returns a normalized `{value,unit,ts}`.
                    Trust = the proxy operator (demo-only; see blockers).
    (LATER, trust-min)  `IMacroProofVerifier` checks a zkTLS/attestation PROOF that
                    the value was genuinely fetched from TE — the contract VERIFIES
                    authenticity and NEVER receives the key. This is where ZK belongs.

  Pinned platform (gate fix): Somnia TESTNET JSON API Request agent.
    PLATFORM = 0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776
    AGENT_ID = 13174292974160097713
  (CLAUDE.md's mainnet IAgentRequester 0x5E5205CF… is a DIFFERENT deployment.)
//////////////////////////////////////////////////////////////////////////////*/


import {SomniaAgentConsumer} from "./SomniaAgentConsumer.sol";
import {IJsonApiAgent, Response, ResponseStatus} from "./interfaces/ISomniaAgents.sol";

/// @notice FUTURE trust-minimization seam. NOT a key retriever — a proof verifier.
///         The off-chain prover holds the key and proves the value is authentic;
///         this contract only verifies. Introduced in a later change, not now.
interface IMacroProofVerifier {
    function verify(bytes32 dataKey, bytes calldata proof)
        external
        view
        returns (bool ok, int256 scaledValue, uint64 observedAt);
}

/*//////////////////////////////////////////////////////////////////////////////
                                CATALOG TYPES
//////////////////////////////////////////////////////////////////////////////*/

enum ValueKind { Uint, Int, String }

/// @notice TE Category families ("span of all data" grouped in concordance with TE).
enum MacroClass { Prices, Rates, Labor, Activity, Trade, Fx, Commodity }

/// @notice One queryable TE data point. The contract builds a keyless json-fetch
///         request from this; the off-chain proxy resolves `proxyPath` to the real
///         TE endpoint + extractor and returns `{value,unit,ts}` (selector = "value").
struct Endpoint {
    string proxyPath; // keyless keeper-proxy route, e.g. "te/colombia/inflation"
    string selector; // scalar selector in the normalized proxy output: "value"
    uint8 decimals; // onchainInt = roundHalfAwayFromZero(native * 10**decimals)
    ValueKind kind; // Int where native can be negative; else Uint
    MacroClass class;
}

/// @notice Result envelope (the sketch's `Msg`, elaborated). Stored per dataKey.
struct MacroDatum {
    bytes32 dataKey; // keccak256(name)
    int256 scaledValue; // round(native * 10**decimals); sign per `kind`
    uint64 observedAt; // TE LatestValueDate (unix seconds)
    uint64 deliveredAt; // block.timestamp of the callback
}

/*//////////////////////////////////////////////////////////////////////////////
                          CATALOG — the span of TE data
            (live-probed 2026-06-01; pinned decimals = deterministic scale)
//////////////////////////////////////////////////////////////////////////////*/

library TECatalog {
    // keccak256(name) keys
    function keyInflation() internal pure returns (bytes32) { return keccak256("co/inflation-rate"); }
    function keyPolicyRate() internal pure returns (bytes32) { return keccak256("co/interest-rate"); }
    function keyGdpGrowth() internal pure returns (bytes32) { return keccak256("co/gdp-annual-growth"); }
    function keyUnemployment() internal pure returns (bytes32) { return keccak256("co/unemployment-rate"); }
    function keyBond10y() internal pure returns (bytes32) { return keccak256("co/govt-bond-10y"); }
    function keyTradeBalance() internal pure returns (bytes32) { return keccak256("co/balance-of-trade"); }
    function keyUsdCop() internal pure returns (bytes32) { return keccak256("fx/usdcop"); }
    function keyCrudeOil() internal pure returns (bytes32) { return keccak256("commodity/crude-oil"); }
    function keyNatGas() internal pure returns (bytes32) { return keccak256("commodity/natural-gas"); }
    function keyGold() internal pure returns (bytes32) { return keccak256("commodity/gold"); }
    function keyCapacityUtil() internal pure returns (bytes32) { return keccak256("co/capacity-utilization"); }

    /// @notice Seed catalog. decimals preserve TE's native precision; Int = sign-capable.
    function seed() internal pure returns (bytes32[] memory keys, Endpoint[] memory eps) {
        keys = new bytes32[](11);
        eps = new Endpoint[](11);
        // name (TE Category)                  proxyPath                     sel       dec kind            class
        keys[0]=keyInflation();    eps[0]=Endpoint("te/colombia/inflation",       "value",2,ValueKind.Uint,MacroClass.Prices);     // Inflation Rate 5.68% -> 568
        keys[1]=keyPolicyRate();   eps[1]=Endpoint("te/colombia/interest-rate",   "value",2,ValueKind.Uint,MacroClass.Rates);      // Interest Rate 11.25% -> 1125
        keys[2]=keyGdpGrowth();    eps[2]=Endpoint("te/colombia/gdp-growth",      "value",1,ValueKind.Int, MacroClass.Activity);   // GDP YoY 2.2% -> 22 (can be <0)
        keys[3]=keyUnemployment(); eps[3]=Endpoint("te/colombia/unemployment",    "value",1,ValueKind.Uint,MacroClass.Labor);      // Unemployment 8.8% -> 88
        keys[4]=keyBond10y();      eps[4]=Endpoint("te/colombia/bond-10y",        "value",1,ValueKind.Uint,MacroClass.Rates);      // 10Y 13.2% -> 132
        keys[5]=keyTradeBalance(); eps[5]=Endpoint("te/colombia/balance-of-trade","value",2,ValueKind.Int, MacroClass.Trade);      // -0.84B -> -84 (USD Billion)
        keys[6]=keyUsdCop();       eps[6]=Endpoint("te/fx/usdcop",                "value",2,ValueKind.Uint,MacroClass.Fx);         // 3568.74 -> 356874
        keys[7]=keyCrudeOil();     eps[7]=Endpoint("te/commodity/crude-oil",      "value",3,ValueKind.Uint,MacroClass.Commodity);  // 93.5676 -> 93568
        keys[8]=keyNatGas();       eps[8]=Endpoint("te/commodity/natural-gas",    "value",4,ValueKind.Uint,MacroClass.Commodity);  // 3.1739 -> 31739
        keys[9]=keyGold();         eps[9]=Endpoint("te/commodity/gold",           "value",2,ValueKind.Uint,MacroClass.Commodity);  // 4474.7 -> 447470
        // CategoryGroup "Business" has no MacroClass member -> mapped to Activity (closest existing).
        keys[10]=keyCapacityUtil(); eps[10]=Endpoint("te/colombia/capacity-utilization","value",1,ValueKind.Uint,MacroClass.Activity); // 77.5% -> 775 (COLOMBIACAPUTI)
    }
}

/*//////////////////////////////////////////////////////////////////////////////
   CONSUMER — request→callback flow (bodies TODO; land post-gate via /opsx:apply)
//////////////////////////////////////////////////////////////////////////////*/

/// @notice The on-chain macro oracle. Inherits the async request/callback paradigm
///         (`SomniaAgentConsumer`), looks an Endpoint up by `dataKey` in `TECatalog`,
///         and asks the json-fetch agent to fetch the KEYLESS keeper-proxy URL. The
///         proxy injects the paid key off-chain; this contract never sees it.
/// @dev    AGENT-CALL semantics (proven on testnet for fetchUint, 2026-06-01): selector is
///         the bare key "value" (the proxy normalizes every route to {value,unit,ts}); the
///         agent decimals arg is ALWAYS 0 because the proxy pre-scales — `Endpoint.decimals`
///         is the proxy's scale, kept ONLY for how a consumer should interpret `scaledValue`,
///         and is NOT passed to the agent. Int-kind endpoints use `fetchInt` (structurally
///         analogous to the proven fetchUint path, but not yet live-verified on-chain).
///         `MacroDatum.observedAt` stays 0: the agent fetches only the "value" field, not the
///         proxy's "ts" — populating it needs a second fetch (a later change).
contract MacroOracle is SomniaAgentConsumer {
    /// @notice Somnia testnet JSON API Request agent.
    uint256 public constant JSON_API_AGENT_ID = 13174292974160097713;

    /// @notice Keyless base URL of the off-chain keeper-proxy (e.g. "https://<proxy>/").
    ///         The key lives only behind this endpoint, never here.
    string public PROXY_BASE;

    mapping(bytes32 => Endpoint) internal _catalog;
    mapping(bytes32 => MacroDatum) public latest;
    mapping(uint256 => bytes32) internal _pendingKey; // requestId -> dataKey

    event MacroRequested(uint256 indexed requestId, bytes32 indexed dataKey);
    event MacroReceived(bytes32 indexed dataKey, int256 scaledValue);
    event MacroFailed(uint256 indexed requestId, bytes32 indexed dataKey, ResponseStatus status);

    error UnknownKey(bytes32 dataKey);
    error UnsupportedKind(bytes32 dataKey);
    error BadProxyBase();

    constructor(address platform, string memory proxyBase) SomniaAgentConsumer(platform) {
        // Must end with "/" so string.concat(PROXY_BASE, proxyPath) yields a single slash
        // (proxyPaths carry no leading slash). Guards the deploy-time URL-join footgun.
        bytes memory b = bytes(proxyBase);
        if (b.length == 0 || b[b.length - 1] != 0x2f) revert BadProxyBase();
        PROXY_BASE = proxyBase;
        (bytes32[] memory keys, Endpoint[] memory eps) = TECatalog.seed();
        for (uint256 i; i < keys.length; ++i) {
            _catalog[keys[i]] = eps[i];
        }
    }

    /// @notice Read the registered endpoint for a key (proxyPath, decimals, kind, class).
    function endpointOf(bytes32 dataKey) external view returns (Endpoint memory) {
        return _catalog[dataKey];
    }

    /// @notice Request a macro datum by catalog key. Builds the agent call against the
    ///         keyless proxy URL and forwards it via the platform. Over-fund per
    ///         SomniaAgentConsumer: msg.value >= floor (+ p_i*subSize for a live budget).
    function requestMacro(bytes32 dataKey) external payable returns (uint256 requestId) {
        Endpoint memory ep = _catalog[dataKey];
        if (bytes(ep.proxyPath).length == 0) revert UnknownKey(dataKey);
        string memory url = string.concat(PROXY_BASE, ep.proxyPath);

        bytes memory payload;
        if (ep.kind == ValueKind.Uint) {
            payload = abi.encodeWithSelector(IJsonApiAgent.fetchUint.selector, url, "value", uint8(0));
        } else if (ep.kind == ValueKind.Int) {
            payload = abi.encodeWithSelector(IJsonApiAgent.fetchInt.selector, url, "value", uint8(0));
        } else {
            revert UnsupportedKind(dataKey); // String kinds have no scalar MacroDatum slot
        }

        requestId = _sendRequest(JSON_API_AGENT_ID, payload);
        _pendingKey[requestId] = dataKey;
        emit MacroRequested(requestId, dataKey);
    }

    /// @notice Callback: decode the pre-scaled integer per `ep.kind` and store a MacroDatum.
    ///         Defensive — a malformed/out-of-range payload routes to MacroFailed instead of
    ///         reverting the platform callback (which would strand the request pending).
    function _onResult(uint256 requestId, Response[] memory responses, ResponseStatus status) internal override {
        bytes32 dataKey = _pendingKey[requestId];
        delete _pendingKey[requestId];

        if (status != ResponseStatus.Success || responses.length == 0) {
            emit MacroFailed(requestId, dataKey, status);
            return;
        }
        bytes memory result = responses[0].result; // consensus value at index 0
        if (result.length != 32) {
            emit MacroFailed(requestId, dataKey, status);
            return;
        }

        int256 scaled;
        if (_catalog[dataKey].kind == ValueKind.Int) {
            scaled = abi.decode(result, (int256));
        } else {
            uint256 u = abi.decode(result, (uint256));
            if (u > uint256(type(int256).max)) {
                // no silent wrap into a negative int256
                emit MacroFailed(requestId, dataKey, status);
                return;
            }
            // forge-lint: disable-next-line(unsafe-typecast) -- guarded by the range check above
            scaled = int256(u);
        }

        latest[dataKey] = MacroDatum({
            dataKey: dataKey,
            scaledValue: scaled,
            observedAt: 0, // agent fetches only "value", not the proxy "ts" (see contract @dev)
            deliveredAt: uint64(block.timestamp)
        });
        emit MacroReceived(dataKey, scaled);
    }
}
