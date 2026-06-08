// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title ICostMeter — external per-position cost seam for the LongGammaWrapper residual.
/// @notice The wrapper deducts a per-token data/hedge cost from surviving collateral at claim.
///         In v1 the cost path is OFF by default: the wrapper wires the zero address, and a
///         zero-address meter is treated by callers as `(0, 0)` (residual == surviving collateral).
/// @dev Phase 9 deploys the real metered-hedge-data meter and wires it at construction — no
///      wrapper signature change. The meter is frozen before the wrapper leaves `Uninitialized`
///      (anti-griefing: it can never be swapped mid-position to retroactively cut a user's payout).
interface ICostMeter {
    /// @notice Per-token realized cost for a position, in each token's NATIVE decimals.
    /// @dev v1 wires the zero address ⇒ callers treat a zero-address meter as (0,0); Phase 9 deploys the real meter.
    /// @return cost0 token0 cost (native dp), cost1 token1 cost (native dp)
    function cost(address position) external view returns (uint256 cost0, uint256 cost1);
}
