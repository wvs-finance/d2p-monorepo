// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ISurpriseOracle} from "../../src/interfaces/ISurpriseOracle.sol";

/// @notice Minimal in-memory ISurpriseOracle stand-in for the ShillerRepresentativeness unit suite.
///         Mirrors MockRegimeOracle: `set` seeds a NON-ZERO observation timestamp (a fresh, live
///         surprise), while `setStaleAt` lets a test pin an explicit `observedAt` — 0 to emulate an
///         unset oracle, or a small/old timestamp to emulate one beyond the consumer's
///         MAX_STALENESS window. An unseeded mock reads (0, 0, 0, 0).
/// @dev Declared in test/mocks/ alongside the sibling MockRegimeOracle/MockMacroOracle/MockPlatform.
contract MockSurpriseOracle is ISurpriseOracle {
    int256 internal _actual;
    int256 internal _consensus;
    uint256 internal _sigma;
    uint64 internal _observedAt;

    /// @notice Seed a FRESH surprise — `observedAt` is set to the current block (non-zero).
    function set(int256 actual, int256 consensus, uint256 sigma) external {
        _actual = actual;
        _consensus = consensus;
        _sigma = sigma;
        _observedAt = uint64(block.timestamp == 0 ? 1 : block.timestamp);
    }

    /// @notice Seed a surprise at an EXPLICIT observation timestamp.
    /// @param ts 0 => unset (never pushed); a small/old value => beyond MAX_STALENESS.
    function setStaleAt(int256 actual, int256 consensus, uint256 sigma, uint64 ts) external {
        _actual = actual;
        _consensus = consensus;
        _sigma = sigma;
        _observedAt = ts;
    }

    function latestSurprise() external view returns (int256, int256, uint256, uint64) {
        return (_actual, _consensus, _sigma, _observedAt);
    }
}
