// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {PayoffTerms} from "../types/PayoffTerms.sol";
import {VolToWidthLib} from "./VolToWidth.sol";

/// @notice Derives Panoptic leg parameters from typed payoff terms.
/// @dev Pure field reads now that PayoffTerms is a typed struct — the prior calldata-offset
///      decoding (which read the live calldata at absolute offsets instead of the memory blob)
///      is gone entirely.
library PayoffTermsLib {
    function deriveWidthFromVol(PayoffTerms memory terms) internal pure returns (int24 width) {
        width = VolToWidthLib.volToWidth(terms.vol, terms.horizonBlocks, terms.tickSpacing);
    }

    function deriveAsset(PayoffTerms memory terms) internal pure returns (uint256 asset) {
        asset = terms.asset;
    }

    function deriveRiskPartner(PayoffTerms memory terms) internal pure returns (uint256 riskPartner) {
        riskPartner = terms.riskPartner;
    }
}
