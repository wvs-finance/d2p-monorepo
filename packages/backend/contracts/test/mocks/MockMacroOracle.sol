// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IMacroOracleLatest} from "../../src/instrument/MacroHedgeStrategist.sol";
import {MacroDatum} from "../../src/MacroOracle.sol";

/// @notice Minimal in-memory MacroOracle stand-in for the MacroHedgeStrategist unit suite.
///         Returns a seeded MacroDatum (deliveredAt != 0) for a known key, and a zero datum
///         (deliveredAt == 0 ⇒ "unknown") for any unseeded key.
contract MockMacroOracle is IMacroOracleLatest {
    mapping(bytes32 => MacroDatum) internal _store;

    function seed(bytes32 dataKey, int256 scaledValue) external {
        _store[dataKey] = MacroDatum({
            dataKey: dataKey,
            scaledValue: scaledValue,
            observedAt: 0,
            deliveredAt: uint64(block.timestamp == 0 ? 1 : block.timestamp) // non-zero => "delivered"
        });
    }

    function latest(bytes32 dataKey) external view returns (MacroDatum memory) {
        return _store[dataKey];
    }
}
