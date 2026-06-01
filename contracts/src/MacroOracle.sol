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

// TODO(import): replace with the canonical interface from the Somnia agent repo.
//   import {IAgentRequester, Request, Response, ResponseStatus} from ".../ISomniaAgents.sol";
// The consumer base (request→callback paradigm) is `SomniaAgentConsumer` (see DRAFT.md §3.5).

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
///         TE endpoint + extractor and returns `{value,unit,ts}` (selector = ".value").
struct Endpoint {
    string proxyPath; // keyless keeper-proxy route, e.g. "te/colombia/inflation"
    string selector; // scalar selector in the normalized proxy output: ".value"
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

    /// @notice Seed catalog. decimals preserve TE's native precision; Int = sign-capable.
    function seed() internal pure returns (bytes32[] memory keys, Endpoint[] memory eps) {
        keys = new bytes32[](10);
        eps = new Endpoint[](10);
        // name (TE Category)                  proxyPath                     sel       dec kind            class
        keys[0]=keyInflation();    eps[0]=Endpoint("te/colombia/inflation",       ".value",2,ValueKind.Uint,MacroClass.Prices);     // Inflation Rate 5.68% -> 568
        keys[1]=keyPolicyRate();   eps[1]=Endpoint("te/colombia/interest-rate",   ".value",2,ValueKind.Uint,MacroClass.Rates);      // Interest Rate 11.25% -> 1125
        keys[2]=keyGdpGrowth();    eps[2]=Endpoint("te/colombia/gdp-growth",      ".value",1,ValueKind.Int, MacroClass.Activity);   // GDP YoY 2.2% -> 22 (can be <0)
        keys[3]=keyUnemployment(); eps[3]=Endpoint("te/colombia/unemployment",    ".value",1,ValueKind.Uint,MacroClass.Labor);      // Unemployment 8.8% -> 88
        keys[4]=keyBond10y();      eps[4]=Endpoint("te/colombia/bond-10y",        ".value",1,ValueKind.Uint,MacroClass.Rates);      // 10Y 13.2% -> 132
        keys[5]=keyTradeBalance(); eps[5]=Endpoint("te/colombia/balance-of-trade",".value",2,ValueKind.Int, MacroClass.Trade);      // -0.84B -> -84 (USD Billion)
        keys[6]=keyUsdCop();       eps[6]=Endpoint("te/fx/usdcop",                ".value",2,ValueKind.Uint,MacroClass.Fx);         // 3568.74 -> 356874
        keys[7]=keyCrudeOil();     eps[7]=Endpoint("te/commodity/crude-oil",      ".value",3,ValueKind.Uint,MacroClass.Commodity);  // 93.5676 -> 93568
        keys[8]=keyNatGas();       eps[8]=Endpoint("te/commodity/natural-gas",    ".value",4,ValueKind.Uint,MacroClass.Commodity);  // 3.1739 -> 31739
        keys[9]=keyGold();         eps[9]=Endpoint("te/commodity/gold",           ".value",2,ValueKind.Uint,MacroClass.Commodity);  // 4474.7 -> 447470
    }
}

/*//////////////////////////////////////////////////////////////////////////////
   CONSUMER — request→callback flow (bodies TODO; land post-gate via /opsx:apply)
//////////////////////////////////////////////////////////////////////////////*/

/// @notice The on-chain macro oracle. Inherits the async request/callback paradigm
///         (`SomniaAgentConsumer`), looks an Endpoint up by name in `TECatalog`,
///         and asks the json-fetch agent to fetch the KEYLESS proxy URL. The proxy
///         injects the key off-chain; this contract never sees it.
abstract contract MacroOracleConsumer /* is SomniaAgentConsumer */ {
    /// @dev Keyless base URL of the off-chain keeper-proxy (e.g. "https://<proxy>/").
    ///      Set at deploy; the key lives only behind this endpoint, never here.
    // string public PROXY_BASE;

    /// @dev Registered endpoints + latest values.
    // mapping(bytes32 => Endpoint)  internal _catalog;
    // mapping(bytes32 => MacroDatum) public latest;
    // mapping(uint256 => bytes32)   internal _pendingKey; // requestId -> dataKey

    /// @notice Request a macro datum by catalog name. Builds
    ///         fetchUint(PROXY_BASE + ep.proxyPath, ep.selector, ep.decimals) and
    ///         sends it to the json-fetch agent via the platform.
    /// TODO(/opsx:apply): implement using SomniaAgentConsumer._sendRequest + JsonApi.fetchUint.
    // function requestMacro(bytes32 dataKey) external payable returns (uint256 requestId);

    /// @notice Callback target. Decodes the scaled integer, applies sign per
    ///         `ep.kind`, and stores a MacroDatum. MUST enforce: Uint endpoint with a
    ///         negative native value => revert/typed error; scaled value out of int256
    ///         range => revert (no silent wrap); rounding = half-away-from-zero
    ///         (NOT JS Math.round, which is sign-asymmetric). [gate fix M3]
    /// TODO(/opsx:apply): implement _onResult override.
    // function _onResult(uint256 requestId, Response[] memory responses, ResponseStatus status) internal /* override */;
}
