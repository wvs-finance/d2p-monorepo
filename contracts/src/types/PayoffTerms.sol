// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Typed payoff terms for a single macro-hedge leg.
/// @dev Replaces the prior opaque `bytes` blob — abi-encodable, so it still rides inside
///      HedgeLegParams through `abi.decode(abi.encode(response), (HedgeLegParams))`.
///      Only fields actually consumed by the resolver are kept; maxLoss/upside are implied
///      by the leg structure (a long call risks premium paid for unlimited upside) rather
///      than stored.
struct PayoffTerms {
    uint88 vol;            // tick-space volatility average — fed to VolToWidthLib.volToWidth
    uint32 horizonBlocks;  // hedge horizon, in blocks
    int24  tickSpacing;    // pool tick spacing
    uint8  asset;          // addLeg asset bit: 0 = token0 (ASSET), 1 = token1 (NUMERAIRE)
    uint8  riskPartner;    // leg index of the risk partner (== own leg index for a single leg)
}
