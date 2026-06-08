// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title ISurpriseOracle — the CPI-surprise + staleness interface (Phase 16, SHILLER-01).
/// @notice The deterministic source of the standardized CPI surprise inputs that drive the
///         Shiller branch (`s = (actual − consensus) / σ`). Mirrors the `IRegimeOracle`
///         staleness contract exactly: there a `observedAt == 0` means "unset/never pushed";
///         here the same convention holds. A consumer that reads a stale/unset surprise oracle
///         fails safe to a MINIMAL stance (`s = 0`: floor leg, base 15% OTM K_hi strike, base vol).
/// @dev `actualWad`/`consensusWad` are SIGNED WAD (the surprise sign drives the strike side);
///      `sigmaWad` is an unsigned WAD standard deviation (the div-by-zero guard lives in the lib).
interface ISurpriseOracle {
    /// @notice Read the latest pushed CPI-surprise inputs and their observation timestamp.
    /// @return actualWad realized CPI print, signed WAD.
    /// @return consensusWad consensus expectation, signed WAD.
    /// @return sigmaWad the surprise standard deviation σ, unsigned WAD.
    /// @return observedAt block.timestamp of the last push (0 => never set).
    function latestSurprise()
        external
        view
        returns (int256 actualWad, int256 consensusWad, uint256 sigmaWad, uint64 observedAt);
}
