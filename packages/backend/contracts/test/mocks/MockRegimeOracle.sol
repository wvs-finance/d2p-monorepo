// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IRegimeOracle} from "../../src/interfaces/IRegimeOracle.sol";

/// @notice Minimal in-memory IRegimeOracle stand-in for the Representativeness unit suite.
///         Mirrors MockMacroOracle: `set` seeds a NON-ZERO observation timestamp (a fresh,
///         live regime), while `setStaleAt` lets a test pin an explicit `observedAt` — 0 to
///         emulate an unset oracle, or a small/old timestamp to emulate one beyond the
///         consumer's MAX_STALENESS window. An unseeded mock reads (Unknown, 0).
/// @dev Declared in test/mocks/ alongside the sibling MockMacroOracle/MockPlatform/MockCcop.
contract MockRegimeOracle is IRegimeOracle {
    IRegimeOracle.Regime internal _z;
    uint64 internal _observedAt;

    /// @notice Seed a FRESH regime — `observedAt` is set to the current block (non-zero).
    function set(IRegimeOracle.Regime z) external {
        _z = z;
        _observedAt = uint64(block.timestamp == 0 ? 1 : block.timestamp);
    }

    /// @notice Seed a regime at an EXPLICIT observation timestamp.
    /// @param ts 0 => unset (never pushed); a small/old value => beyond MAX_STALENESS.
    function setStaleAt(IRegimeOracle.Regime z, uint64 ts) external {
        _z = z;
        _observedAt = ts;
    }

    function latestRegime() external view returns (IRegimeOracle.Regime, uint64) {
        return (_z, _observedAt);
    }
}
