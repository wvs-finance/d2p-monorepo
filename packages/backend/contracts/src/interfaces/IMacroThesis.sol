// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice The economic-school handle TYPE. Intentionally an empty marker: it is the type that
///         HedgeLegParams.economicTheory and HedgeMandate.economicTheory are declared against, and
///         the type MacroThesisRegistry.thesisOf resolves a label to. A school needs no on-chain
///         behavior this phase — the load-bearing property is solely that a resolved handle is
///         non-zero (well-formedness), so a real per-school strategy contract can be slotted in
///         later WITHOUT changing this field type.
interface IMacroThesis {

}

/// @notice The concrete named-thesis registry (STRAT-01). Single source of truth for BOTH the
///         inferString `allowedValues` guardrail and the `_mapSchool` keccak compare. Handle-
///         resolving (Pitfall 5): a label resolves to an IMacroThesis handle that drops straight
///         into HedgeMandate.economicTheory / HedgeLegParams.economicTheory with zero translation.
///         Demo handles are deterministic non-zero SENTINELS (the UI renders the human label from
///         the event string; the address is opaque to the UI).
///         NON-DEPLOYABLE: these sentinel addresses hold NO code — they satisfy only the
///         `!= address(0)` well-formedness check and MUST NEVER be call/delegatecall/staticcall'd.
library MacroThesisRegistry {
    // (a) the allowedValues for the inferString school leg — the STRUCTURAL guardrail.
    function schoolLabels() internal pure returns (string[] memory labels) {
        labels = new string[](2);          // extensible: add a label here + a branch in thesisOf/promptBias
        labels[0] = "SHILLER_MACRO_RISK";
        labels[1] = "POST_KEYNESIAN";
    }

    // (b) label -> resolvable IMacroThesis handle + ok flag. ok==false on no-match (the caller MUST
    //     honor false and NOT store — mirrors the v1 _mapAction(...,false) contract: no default write).
    //     Demo sentinels: distinct non-zero addresses so a resolved handle != address(0). NON-DEPLOYABLE.
    function thesisOf(string memory label) internal pure returns (IMacroThesis handle, bool ok) {
        bytes32 h = keccak256(bytes(label));
        if (h == keccak256("SHILLER_MACRO_RISK")) return (IMacroThesis(address(uint160(0x5)))/*SHILLER sentinel — non-deployable*/, true);
        if (h == keccak256("POST_KEYNESIAN"))     return (IMacroThesis(address(uint160(0x6)))/*PK sentinel — non-deployable*/, true);
        return (IMacroThesis(address(0)), false);
    }

    // (c) label -> a deterministic prompt-bias fragment (how the chosen school frames the hedge).
    //     Contract constants for determinism (temperature=0 consensus). Empty string on no-match.
    function promptBias(string memory label) internal pure returns (string memory) {
        bytes32 h = keccak256(bytes(label));
        if (h == keccak256("SHILLER_MACRO_RISK")) return "Operate under the Shiller macro-risk school: frame the hedge around narrative-driven asset mispricing and tail macro risk.";
        if (h == keccak256("POST_KEYNESIAN"))     return "Operate under the post-Keynesian school: frame the hedge around fundamental uncertainty, liquidity preference, and balance-of-payments pressure on the currency.";
        return "";
    }
}
