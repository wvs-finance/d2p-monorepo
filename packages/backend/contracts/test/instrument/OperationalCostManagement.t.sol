// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {OperationalCostManagement} from "../../src/OperationalCostManagement.sol";

/// @dev BTT spec: test/instrument/OperationalCostManagement.tree
/// @title OperationalCostManagementTest — the EXEC-03 cummCost ledger proof.
/// @notice Proves the `cummCost` accumulator (budgeted agent SOMI + data cost, keyed by `decisionId`) under
///         TWO DISTINCT structural claims that CANNOT be conflated (the M3 gate finding):
///           1. CONSERVATION (`invariant_costConserved`): the global accumulators equal the running SUM of the
///              per-decision lines (`cummCostSomi == Σ costOf[d].agentCostSomi`, `cummDataCost == Σ ...`),
///              fuzz-driven by a bounded handler that maintains an INDEPENDENT mirror sum. This invariant is
///              BLIND to symmetric double-counting — if the per-leg guard is dropped, a 2nd accrue re-adds to
///              BOTH sides and conservation STILL HOLDS. So it can ONLY prove the asymmetric global-vs-line
///              drift, NOT idempotency.
///           2. IDEMPOTENCY (the SEPARATE `test_accrueSameLegTwice_cummCostSomiUnchanged` leaf): re-accruing the
///              SAME `(decisionId, leg)` leaves `cummCostSomi` AND `costOf[d].agentCostSomi` UNCHANGED. This is
///              the ONLY assertion that catches the dropped-guard mutation (which conservation passes).
/// @dev Pure in-memory unit/fuzz contract — NO fork (will NOT 429). Reuses the additive `[invariant]` floor
///      (runs=16/depth=16, fail_on_revert=false) already in foundry.toml.
contract OperationalCostManagementTest is Test {
    OperationalCostManagement internal ledger;
    OperationalCostHandler internal handler;

    event AgentCostAccrued(bytes32 indexed decisionId, uint256 somi, uint256 cummSomi);
    event DataCostAccrued(bytes32 indexed decisionId, uint256 dataCost, uint256 cummData);

    bytes32 internal constant D = bytes32(uint256(0xABCD));
    uint8 internal constant LEG0 = 0; // Agent 1
    uint8 internal constant LEG1 = 1; // Agent 2

    function setUp() public {
        ledger = new OperationalCostManagement();

        // The bounded handler drives the CONSERVATION invariant against an INDEPENDENT mirror sum.
        handler = new OperationalCostHandler(ledger);
        targetContract(address(handler));
        bytes4[] memory sels = new bytes4[](2);
        sels[0] = handler.act_accrueAgent.selector;
        sels[1] = handler.act_accrueData.selector;
        targetSelector(FuzzSelector({addr: address(handler), selectors: sels}));
    }

    // ------------------------------------------------------------------
    // The CONSERVATION invariant — mutation-proven non-vacuous by the ASYMMETRIC
    // "add to cummCostSomi WITHOUT costOf" mutation (NOT by the idempotency mutation).
    // ------------------------------------------------------------------

    /// @notice CONSERVATION: the global accumulator equals the SUM of the actual per-decision LINES held in the
    ///         ledger — `cummCostSomi == Σ_d costOf[d].agentCostSomi` and `cummDataCost == Σ_d costOf[d].dataCost`
    ///         — summed over the bounded decision id set the handler accrues into (read straight from the ledger
    ///         via `totalCost(d)`, NOT from any mirror). A wrapper that adds to `cummCostSomi` WITHOUT moving
    ///         `costOf[d].agentCostSomi` (asymmetric drift) makes the global outrun Σlines and FAILS this.
    ///         It is BLIND to SYMMETRIC double-counting: dropping the per-leg guard doubles BOTH the global AND
    ///         the line, so global == Σlines STILL HOLDS — which is precisely why idempotency CANNOT be proven
    ///         here and lives in the SEPARATE `test_accrueSameLegTwice_*` leaf below.
    /// @dev The INDEPENDENT handler mirror (which never reads the ledger's storage) is cross-checked too, so a
    ///      mutant that drifts BOTH the global and every line in lockstep (keeping global == Σlines) is still
    ///      caught by the mirror. Non-vacuity is NOT a count-gate inside the body (that false-fails the
    ///      setup-time run-0 evaluation before any handler call); it is proven by the dedicated
    ///      `test_conservationInvariant_isNonVacuous_handlerActuallyAccrues` leaf + the SUMMARY-recorded mutation.
    function invariant_costConserved() public view {
        uint256 sigmaAgent;
        uint256 sigmaData;
        uint256 n = handler.DECISION_SET();
        for (uint256 i = 0; i < n; i++) {
            (uint256 lineSomi, uint256 lineData) = ledger.totalCost(bytes32(i));
            sigmaAgent += lineSomi;
            sigmaData += lineData;
        }
        // global == Σ actual ledger lines (the asymmetric-drift mutation breaks THIS).
        assertEq(ledger.cummCostSomi(), sigmaAgent, "cummCostSomi == Sigma costOf agentCostSomi");
        assertEq(ledger.cummDataCost(), sigmaData, "cummDataCost == Sigma costOf dataCost");
        // and == the independent mirror (catches a lockstep global+line drift the Σ check would miss).
        assertEq(ledger.cummCostSomi(), handler.mirrorAgentSum(), "cummCostSomi == independent mirror agent sum");
        assertEq(ledger.cummDataCost(), handler.mirrorDataSum(), "cummDataCost == independent mirror data sum");
    }

    /// @notice Non-vacuity guard for `invariant_costConserved`: drive the handler directly and assert it
    ///         genuinely accrued (mirror sums + call-counts move). If the handler were inert, the conservation
    ///         equality would be the vacuous `0 == 0`; this proves the fuzz target actually exercises accrual.
    function test_conservationInvariant_isNonVacuous_handlerActuallyAccrues() external {
        handler.act_accrueAgent(0, 0, 50);
        handler.act_accrueAgent(1, 1, 60);
        handler.act_accrueData(2, 70);

        assertGt(handler.agentCallCount(), 0, "handler accrued at least one agent line");
        assertGt(handler.dataCallCount(), 0, "handler accrued at least one data line");
        assertGt(handler.mirrorAgentSum(), 0, "mirror agent sum is non-zero (not vacuous)");
        assertGt(handler.mirrorDataSum(), 0, "mirror data sum is non-zero (not vacuous)");
        // and the conservation equality the invariant asserts holds on this driven state:
        assertEq(ledger.cummCostSomi(), handler.mirrorAgentSum(), "cummCostSomi == mirror agent sum");
        assertEq(ledger.cummDataCost(), handler.mirrorDataSum(), "cummDataCost == mirror data sum");
    }

    // ------------------------------------------------------------------
    // The SEPARATE IDEMPOTENCY leaf — the ONLY assertion the dropped-guard mutation breaks
    // (conservation STILL PASSES under that mutation; this leaf does NOT go through it).
    // ------------------------------------------------------------------

    /// @notice IDEMPOTENCY (distinct from conservation): accrue `(D, LEG0)` once, snapshot `cummCostSomi`,
    ///         accrue the SAME `(D, LEG0)` a 2nd time, assert `cummCostSomi` AND `costOf[D].agentCostSomi` are
    ///         UNCHANGED. Dropping the `(decisionId, leg)` guard doubles BOTH sides (conservation holds), so
    ///         ONLY this leaf catches it. This is why the conservation invariant CANNOT prove idempotency.
    function test_accrueSameLegTwice_cummCostSomiUnchanged() external {
        ledger.accrueAgentCost(D, LEG0, 7);

        uint256 cummBefore = ledger.cummCostSomi();
        (uint256 lineBefore,) = ledger.totalCost(D);

        // re-accrue the SAME (decisionId, leg) — must NOT double-count.
        try ledger.accrueAgentCost(D, LEG0, 7) {} catch {}

        assertEq(ledger.cummCostSomi(), cummBefore, "cummCostSomi unchanged on re-accrue of same (d, leg)");
        (uint256 lineAfter,) = ledger.totalCost(D);
        assertEq(lineAfter, lineBefore, "costOf agentCostSomi unchanged on re-accrue of same (d, leg)");
    }

    // ------------------------------------------------------------------
    // bulloak branch fns (un-renamed) — 1:1 with OperationalCostManagement.tree
    // ------------------------------------------------------------------

    function test_WhenAccrueAgentCostIsCalledOnAFreshDecisionAndLeg() external {
        vm.expectEmit(true, false, false, true, address(ledger));
        emit AgentCostAccrued(D, 5, 5);
        ledger.accrueAgentCost(D, LEG0, 5);

        (uint256 somi,) = ledger.totalCost(D);
        assertEq(somi, 5, "costOf agentCostSomi increased by the amount");
        assertEq(ledger.cummCostSomi(), 5, "cummCostSomi increased by the amount");
    }

    function test_WhenAccrueAgentCostIsCalledASecondTimeForTheSameDecisionAndLeg() external {
        ledger.accrueAgentCost(D, LEG0, 9);
        uint256 cummBefore = ledger.cummCostSomi();
        (uint256 lineBefore,) = ledger.totalCost(D);

        try ledger.accrueAgentCost(D, LEG0, 9) {} catch {}

        assertEq(ledger.cummCostSomi(), cummBefore, "cummCostSomi unchanged after the second call");
        (uint256 lineAfter,) = ledger.totalCost(D);
        assertEq(lineAfter, lineBefore, "costOf agentCostSomi unchanged after the second call");
    }

    function test_WhenAccrueAgentCostIsCalledForTheSameDecisionButADifferentLeg() external {
        ledger.accrueAgentCost(D, LEG0, 3); // Agent 1
        ledger.accrueAgentCost(D, LEG1, 7); // Agent 2 — same decision, different leg

        (uint256 somi,) = ledger.totalCost(D);
        assertEq(somi, 10, "both legs accrue under the same decision");
        assertEq(ledger.cummCostSomi(), 10, "both legs added into cummCostSomi");
    }

    function test_WhenAccrueDataCostIsCalledOnAFreshDecision() external {
        vm.expectEmit(true, false, false, true, address(ledger));
        emit DataCostAccrued(D, 11, 11);
        ledger.accrueDataCost(D, 11);

        (, uint256 data) = ledger.totalCost(D);
        assertEq(data, 11, "costOf dataCost increased by the amount");
        assertEq(ledger.cummDataCost(), 11, "cummDataCost increased by the amount");
    }

    function test_WhenAccrueDataCostIsCalledASecondTimeForTheSameDecision() external {
        ledger.accrueDataCost(D, 13);
        uint256 cummBefore = ledger.cummDataCost();
        (, uint256 lineBefore) = ledger.totalCost(D);

        try ledger.accrueDataCost(D, 13) {} catch {}

        assertEq(ledger.cummDataCost(), cummBefore, "cummDataCost unchanged after the second call");
        (, uint256 lineAfter) = ledger.totalCost(D);
        assertEq(lineAfter, lineBefore, "costOf dataCost unchanged after the second call");
    }

    function test_WhenTotalCostIsReadForADecision() external {
        ledger.accrueAgentCost(D, LEG0, 4);
        ledger.accrueDataCost(D, 6);

        (uint256 somi, uint256 data) = ledger.totalCost(D);
        assertEq(somi, 4, "totalCost returns the accrued agent SOMI");
        assertEq(data, 6, "totalCost returns the accrued data cost");
    }

    /// @dev The conservation leaf delegates to the named invariant after driving a few accruals directly, so
    ///      the BTT mapping stays 1:1 while the real fuzz proof lives in `invariant_costConserved`.
    function test_WhenManyDecisionsAndLegsHaveBeenAccrued() external {
        // Drive the handler manually for the unit-leaf form (the fuzzer drives it for the invariant run).
        handler.act_accrueAgent(0, 0, 100);
        handler.act_accrueAgent(0, 1, 200);
        handler.act_accrueAgent(1, 0, 300);
        handler.act_accrueData(2, 400);

        assertEq(ledger.cummCostSomi(), handler.mirrorAgentSum(), "cummCostSomi == Sigma agent lines");
        assertEq(ledger.cummDataCost(), handler.mirrorDataSum(), "cummDataCost == Sigma data lines");
    }
}

/// @title OperationalCostHandler — bounded fuzz driver maintaining an INDEPENDENT mirror sum.
/// @notice The Foundry invariant target. Each `act_*` `bound()`s the decision to a small id set and the leg to
///         {0,1}, accrues against the ledger, and updates an INDEPENDENT mirror sum (never read from the
///         ledger's own accumulator). The mirror only adds when the accrual is the FIRST for that
///         `(decisionId, leg)` / data line — mirroring the contract's idempotency so the conservation equality
///         holds for a CORRECT contract and FAILS for an asymmetric-drift mutant. Tracks call-counts so the
///         invariant is provably non-vacuous (the Phase-8 discipline).
/// @dev Declared AFTER the test contract so bulloak 0.9.2 anchors the tree root on `OperationalCostManagementTest`
///      (the 08-06/08-07 IPokeOracle/Handler precedent).
contract OperationalCostHandler {
    OperationalCostManagement internal ledger;

    uint256 public mirrorAgentSum;
    uint256 public mirrorDataSum;
    uint256 public agentCallCount;
    uint256 public dataCallCount;

    // Independent mirror of the idempotency guard (never reads the ledger's storage).
    mapping(bytes32 => mapping(uint8 => bool)) internal mirrorAgentAccrued;
    mapping(bytes32 => bool) internal mirrorDataAccrued;

    uint256 public constant DECISION_SET = 4; // a small id set so collisions exercise the guard

    constructor(OperationalCostManagement _ledger) {
        ledger = _ledger;
    }

    function _bound(uint256 x, uint256 lo, uint256 hi) internal pure returns (uint256) {
        if (hi <= lo) return lo;
        return lo + (x % (hi - lo + 1));
    }

    /// @notice Accrue an agent cost for a bounded (decision, leg). The mirror adds the amount ONLY on the first
    ///         accrual of that (decision, leg) — exactly mirroring the contract's per-leg idempotency.
    function act_accrueAgent(uint256 seedDecision, uint256 seedLeg, uint256 somi) public {
        bytes32 d = bytes32(_bound(seedDecision, 0, DECISION_SET - 1));
        uint8 leg = uint8(_bound(seedLeg, 0, 1)); // {0, 1}
        somi = _bound(somi, 0, 1e24);

        try ledger.accrueAgentCost(d, leg, somi) {
            // The call succeeded; mirror the FIRST-accrual-only semantics.
            if (!mirrorAgentAccrued[d][leg]) {
                mirrorAgentAccrued[d][leg] = true;
                mirrorAgentSum += somi;
                agentCallCount += 1;
            }
        } catch {}
    }

    /// @notice Accrue a data cost for a bounded decision. Mirror adds ONLY on the first accrual of that decision.
    function act_accrueData(uint256 seedDecision, uint256 data) public {
        bytes32 d = bytes32(_bound(seedDecision, 0, DECISION_SET - 1));
        data = _bound(data, 0, 1e24);

        try ledger.accrueDataCost(d, data) {
            if (!mirrorDataAccrued[d]) {
                mirrorDataAccrued[d] = true;
                mirrorDataSum += data;
                dataCallCount += 1;
            }
        } catch {}
    }
}
