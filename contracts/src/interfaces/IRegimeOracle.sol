// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IRegimeOracle — the Z_t regime + staleness interface (Phase 14, REPR-01).
/// @notice The deterministic source of the regime indicator `Z_t` that conditions the
///         PKE asymmetric passthrough core (`β₁(REGIME) × devaluation`). Mirrors the
///         `MacroOracle` staleness precedent (`src/MacroOracle.sol`): there a
///         `MacroDatum.deliveredAt == 0` means "unset/unknown"; here `observedAt == 0`
///         means the regime was never pushed. A consumer that reads a stale/unset oracle
///         fails safe to the STRESS regime (the wage-earner example §3.6 guardrail).
/// @dev    `Regime.Unknown` is the zero value so a default-initialised storage slot reads
///         as Unknown — the fail-safe (Unknown ⇒ Stress) then covers the never-set case too.
interface IRegimeOracle {
    /// @notice The Z_t classification.
    /// @dev Unknown == 0 (default), Tranquil == 1, Stress == 2.
    enum Regime {
        Unknown,
        Tranquil,
        Stress
    }

    /// @notice Read the latest pushed regime and its observation timestamp.
    /// @return regime the Z_t classification (Unknown when never pushed).
    /// @return observedAt block.timestamp of the last push (0 => never set).
    function latestRegime() external view returns (Regime regime, uint64 observedAt);
}
