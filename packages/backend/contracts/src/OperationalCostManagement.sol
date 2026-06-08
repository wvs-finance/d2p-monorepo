// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title OperationalCostManagement — the EXEC-03 `cummCost` ledger.
/// @notice Accrues the cumulative operational cost the user is ultimately charged for across BOTH agents of a
///         single hedge decision (DRAFT.md:64-65): Agent 1 (Strategist, `leg = 0`) and Agent 2 (Executor,
///         `leg = 1`). Two cost components per `decisionId`:
///           - `agentCostSomi` — the per-agent-call SOMI cost (the `llm-inference` / `json-fetch` deposit).
///           - `dataCost`      — the metered hedge-data cost (Phase-9 `φ_data` lineage; demo-stubbed here).
///         The global accumulators `cummCostSomi` / `cummDataCost` are the running `cummCost` totals.
///
/// @dev UNITS / SOURCE (the budgeted-not-realized boundary — RESEARCH §7 / Open Q3):
///        - `agentCostSomi` accrues the BUDGETED forwarded SOMI (the over-funded `msg.value` per agent call
///          that `SomniaAgentConsumer._sendRequest` forwards), NOT a realized `executionCost`. The realized
///          `executionCost` is structurally UNAVAILABLE on Somnia (getRequest reverts on pruned storage,
///          executionCost is not in events) — so the ledger conserves the budgeted figure. Measured in SOMI.
///        - `dataCost` is the per-position data cost (a fixed/stubbed input in this demo). Unit is whatever the
///          K_D data leg denominates (USDC-equivalent on the x402 leg); the ledger only sums + conserves it.
///
/// @dev SETTLEMENT BOUNDARY (state explicitly): this ledger ACCRUES and CONSERVES only. It does NO real SOMI
///      transfer / no escrow settlement. The mint is on Polygon; the agent calls are on Somnia; the actual
///      cross-chain SOMI payment / IAgentRequester escrow is the DEFERRED XCHAIN-01 path, out of this fork's
///      scope. Demo-scoped: open entry points, no access control (the unit/fuzz proof needs none; the executor
///      becomes the caller in the cornerstone — wiring is Plan 02's optional/settable concern, not this plan's).
///
/// @dev IDEMPOTENCY / CONSERVATION (the EXEC-03 gate — TWO DISTINCT structural properties):
///        - CONSERVATION: `cummCostSomi == Σ_d costOf[d].agentCostSomi` AND `cummDataCost == Σ_d
///          costOf[d].dataCost`. Holds because every accrual moves the line AND the global accumulator together
///          by the SAME amount under the SAME guard. (This equality is BLIND to symmetric double-counting.)
///        - IDEMPOTENCY: each `(decisionId, leg)` agent line and each `decisionId` data line accrues EXACTLY
///          ONCE — a re-delivered callback / re-sent request reverts `AlreadyAccrued` and does NOT double-count.
contract OperationalCostManagement {
    /// @notice The per-decision cost line. `agentCostSomi` is the summed budgeted SOMI across this decision's
    ///         legs; `dataCost` is the decision's data cost.
    struct CostLine {
        uint256 agentCostSomi; // budgeted forwarded SOMI (Agent 1 leg 0 + Agent 2 leg 1), NOT realized
        uint256 dataCost; // metered hedge-data cost (demo-stubbed)
    }

    /// @notice Per-decision cost lines, keyed by `decisionId` (Agent 1's `bytes32(requestId)` join key).
    mapping(bytes32 => CostLine) public costOf;

    /// @notice Global running total of budgeted agent-call SOMI across all decisions (the SOMI `cummCost`).
    uint256 public cummCostSomi;

    /// @notice Global running total of data cost across all decisions (the data `cummCost`).
    uint256 public cummDataCost;

    /// @notice Per-`(decisionId, leg)` idempotency guard — each agent line accrues at most once.
    mapping(bytes32 => mapping(uint8 => bool)) public agentLegAccrued;

    /// @notice Per-`decisionId` idempotency guard for the single data line.
    mapping(bytes32 => bool) public dataAccrued;

    /// @dev Re-accruing an already-accrued `(decisionId, leg)` agent line or `decisionId` data line.
    error AlreadyAccrued();

    event AgentCostAccrued(bytes32 indexed decisionId, uint256 somi, uint256 cummSomi);
    event DataCostAccrued(bytes32 indexed decisionId, uint256 dataCost, uint256 cummData);

    /// @notice Accrue the budgeted agent-call SOMI for one `(decisionId, leg)`. Agent 1 = leg 0, Agent 2 =
    ///         leg 1 each accrue EXACTLY ONCE under one `decisionId`. Reverts `AlreadyAccrued` on a re-accrue of
    ///         the same `(decisionId, leg)` so a re-delivered callback / re-sent request does NOT double-count.
    /// @dev Moves the line `costOf[decisionId].agentCostSomi` AND the global `cummCostSomi` together by the SAME
    ///      `somi` under the SAME guard — this is what keeps CONSERVATION holding. The guard is what makes
    ///      IDEMPOTENCY hold (dropping it would double BOTH sides, which conservation would NOT catch).
    function accrueAgentCost(bytes32 decisionId, uint8 leg, uint256 somi) external {
        if (agentLegAccrued[decisionId][leg]) revert AlreadyAccrued();
        agentLegAccrued[decisionId][leg] = true;

        costOf[decisionId].agentCostSomi += somi;
        cummCostSomi += somi;

        emit AgentCostAccrued(decisionId, somi, cummCostSomi);
    }

    /// @notice Accrue the data cost for one `decisionId` (the single data line). Idempotent per decision.
    /// @dev Moves `costOf[decisionId].dataCost` AND `cummDataCost` together by the SAME `dataCost`.
    function accrueDataCost(bytes32 decisionId, uint256 dataCost) external {
        if (dataAccrued[decisionId]) revert AlreadyAccrued();
        dataAccrued[decisionId] = true;

        costOf[decisionId].dataCost += dataCost;
        cummDataCost += dataCost;

        emit DataCostAccrued(decisionId, dataCost, cummDataCost);
    }

    /// @notice The EXIT read the UI uses to show the user this decision's `cummCost` components.
    /// @return somi The accrued budgeted agent SOMI for `decisionId`.
    /// @return data The accrued data cost for `decisionId`.
    function totalCost(bytes32 decisionId) external view returns (uint256 somi, uint256 data) {
        CostLine storage line = costOf[decisionId];
        return (line.agentCostSomi, line.dataCost);
    }
}
