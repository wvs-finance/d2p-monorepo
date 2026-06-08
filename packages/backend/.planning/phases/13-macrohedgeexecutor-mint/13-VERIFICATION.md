---
phase: 13-macrohedgeexecutor-mint
verified: 2026-06-06T20:15:00Z
status: passed
score: 3/3 requirements verified
---

# Phase 13: MacroHedgeExecutor Mint — Verification Report

**Phase Goal:** A deployable `MacroHedgeExecutor is SomniaAgentConsumer` mints the cornerstone long-gamma wCOP/USDC position on the Polygon Panoptic-V2 fork THROUGH the contract (not the test harness) — Agent 2's execution core, contract-owned — with the HONEST collateral gate (the protocol-native atomic `AccountInsolvent` revert, NOT a pre-mint quote) and a conserved budgeted-SOMI cost ledger.
**Verified:** 2026-06-06T20:15:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A deployable `MacroHedgeExecutor is SomniaAgentConsumer` exists with `resolveAndMint(HedgeLegParams, legIndex, positionSize)` | VERIFIED | `contracts/src/MacroHedgeExecutor.sol` L41+L81; compiles; 7/7 fork tests pass |
| 2 | Mints through the CONTRACT (not the harness): `numberOfLegs(executor) > 0`, `PositionMinted` + `RepresentativenessAssessed` events fire | VERIFIED | `test__takeDemoPosition__Succeeds` PASS; `assertGt(WCOP_USDC_PANOPTIC_POOL.numberOfLegs(address(executor)), 0)` confirmed in fork test L192 |
| 3 | `_onResult` decodes `abi.decode(responses[0].result, (HedgeLegParams))` (NOT the Response wrapper) | VERIFIED | `MacroHedgeExecutor.sol` L105; grep confirms the pattern; 4/4 onResult unit tests pass (the decode probe records the correct struct) |
| 4 | The `require(legParams.size <= 127)` guard is the FIRST statement of the shared `_resolveAndMint` sink | VERIFIED | `MacroHedgeExecutor.sol` L123; `test_resolveAndMint_sizeGuard` PASS |
| 5 | EXEC-02 honest gate: under-funded executor reverts `AccountInsolvent` atomically; `numberOfLegs == 0` after; NO pre-mint quote | VERIFIED | `test_margin` PASS; `vm.expectPartialRevert(Errors.AccountInsolvent.selector)` with identical params, `DEFAULT_FUND_USD/1000` nonzero collateral; `numberOfLegs == 0` asserted after (L236, L276) |
| 6 | `POLYGON_WCOP_USDC_POOL_ID()` constant anchors the pool; `IMacroThesis` compiles | VERIFIED | `contracts/src/libraries/PolygonPools.sol` L38; 3/3 PolygonPools unit tests pass; `IMacroThesis.sol` confirmed compiling |
| 7 | `OperationalCostManagement` accrues `cummCostSomi`/`cummDataCost`, 3-arg `accrueAgentCost(bytes32,uint8,uint256)`, per-`(decisionId,leg)` idempotency | VERIFIED | `contracts/src/OperationalCostManagement.sol` L44, L67; 10/10 tests pass including `invariant_costConserved` (16 runs, 0 reverts) + `test_accrueSameLegTwice_cummCostSomiUnchanged` |

**Score:** 7/7 truths verified

---

## Required Artifacts

| Artifact | Status | Evidence |
|----------|--------|----------|
| `contracts/src/MacroHedgeExecutor.sol` | VERIFIED | 185 lines; `is SomniaAgentConsumer`; `resolveAndMint`; `_resolveAndMint` (virtual, shared sink); `_onResult` with corrected decode; `PositionMinted` + `RepresentativenessAssessed` events; `pool.dispatch` calls present |
| `contracts/src/OperationalCostManagement.sol` | VERIFIED | 96 lines; `cummCostSomi` + `cummDataCost`; `costOf` mapping; `agentLegAccrued` guard; 3-arg `accrueAgentCost`; `accrueDataCost`; `totalCost` read |
| `contracts/src/libraries/PolygonPools.sol` | VERIFIED | 41 lines; `wcopUsdcKey()` + `POLYGON_WCOP_USDC_POOL_ID()` matching the demo runtime key exactly |
| `contracts/src/interfaces/IMacroThesis.sol` | VERIFIED | Empty marker interface; confirmed compiling |
| `contracts/test/fork/MacroHedgeExecutor.fork.t.sol` | VERIFIED | 7/7 fork tests pass; `test__takeDemoPosition__Succeeds`, `test_margin`, `test_resolveAndMint_sizeGuard` present; collateral receiver = `address(executor)` |
| `contracts/test/instrument/MacroHedgeExecutor.onResult.t.sol` | VERIFIED | 4/4 unit tests pass; `MacroHedgeExecutorDecodeProbe` with `seedPending`; `_resolveAndMint` override skips dispatch + records struct |
| `contracts/test/instrument/OperationalCostManagement.t.sol` | VERIFIED | 10/10 tests pass; `invariant_costConserved`; `test_accrueSameLegTwice_cummCostSomiUnchanged`; bounded `OperationalCostHandler` |
| `contracts/test/fork/MacroHedgeExecutor.fork.tree` | VERIFIED | `bulloak check` exit 0 |
| `contracts/test/instrument/MacroHedgeExecutor.onResult.tree` | VERIFIED | `bulloak check` exit 0 |
| `contracts/test/instrument/OperationalCostManagement.tree` | VERIFIED | `bulloak check` exit 0 |
| `contracts/test/instrument/PolygonPools.tree` | VERIFIED | `bulloak check` exit 0 |
| `contracts/foundry.toml` | VERIFIED | `rpc_storage_caching = { chains = [8453, 137], endpoints = "all" }` confirmed |

---

## Key Link Verification

| From | To | Via | Status | Evidence |
|------|----|-----|--------|----------|
| `MacroHedgeExecutor.sol` | `panopticPool.dispatch` | `_resolveAndMint` runs short-then-long two-dispatch flow | WIRED | L163, L177: `pool.dispatch(ml, fl, sl, lim, true, 0)` present in both blocks |
| `MacroHedgeExecutor.sol` | `abi.decode(responses[0].result, (HedgeLegParams))` | `_onResult` decodes the consensus result bytes | WIRED | L105 confirmed; grep match verified |
| `MacroHedgeExecutor.fork.t.sol` | `ct.deposit(assets, address(executor))` | `_fundExecutor(address(executor), ...)` sends receiver = executor | WIRED | L150: `ct0.deposit(fundUsd, who)` with `who = address(executor)` |
| `OperationalCostManagement.sol` | `cummCostSomi` accumulator | `accrueAgentCost` moves line + global atomically under the guard | WIRED | L71-72: `costOf[decisionId].agentCostSomi += somi; cummCostSomi += somi;` |
| `OperationalCostManagement.sol` | `agentLegAccrued[decisionId][leg]` guard | Idempotency gate before any state mutation | WIRED | L68: `if (agentLegAccrued[decisionId][leg]) revert AlreadyAccrued();` |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| EXEC-01 | 13-01, 13-02 | Deployable `MacroHedgeExecutor is SomniaAgentConsumer` mints via `resolveAndMint`; the `test__takeDemoPosition__Succeeds` lineage green through the contract; `RepresentativenessAssessed` event fires; `_onResult` decode fixed | SATISFIED | `test__takeDemoPosition__Succeeds` PASS; `numberOfLegs(executor) > 0`; `PositionMinted` + `RepresentativenessAssessed(0,...)` emitted; `abi.decode(responses[0].result, (HedgeLegParams))` at L105; 4/4 onResult unit tests prove the decode; `POLYGON_WCOP_USDC_POOL_ID()` anchor committed |
| EXEC-02 | 13-02 | Collateral gate = protocol-native atomic `AccountInsolvent` revert (NOT a pre-mint quote); POST-mint `BalanceDelta` read is informational; under-funded executor: no position persists | SATISFIED | `test_margin` PASS: (a) `quoteCollateralRequirements` post-mint returns `BalanceDelta` without revert (L206-210); (b) `vm.expectPartialRevert(Errors.AccountInsolvent.selector)` on identical-params under-funded twin (nonzero `DEFAULT_FUND_*/1000` collateral — deposit succeeds, `_validateSolvency` is first collateral gate to fail); `numberOfLegs == 0` after (L236, L276); no pre-mint quote present in the contract |
| EXEC-03 | 13-03 | `OperationalCostManagement` accrues cumulative budgeted SOMI + data cost with conservation invariant and per-`(decisionId,leg)` idempotency, both mutation-proven non-vacuous by two distinct mutations | SATISFIED | 10/10 tests PASS; `invariant_costConserved` (16 runs/256 calls/0 reverts); conservation non-vacuity: Mutation 1 (add to `cummCostSomi` without `costOf`) FAILS `invariant_costConserved` with `882…3505 != 0`; idempotency non-vacuity: Mutation 2 (drop guard) PASSES `invariant_costConserved` (blind to symmetric double-count) but FAILS `test_accrueSameLegTwice_cummCostSomiUnchanged` with `14 != 7`; both recorded in 13-03-SUMMARY.md |

---

## Gate Results (all commands run fresh during verification)

| Command | Result |
|---------|--------|
| `forge test --match-path "test/fork/MacroHedgeExecutor.fork.t.sol" -vv` | 7/7 PASS (incl. `test__takeDemoPosition__Succeeds`, `test_margin`, `test_resolveAndMint_sizeGuard`, BTT under-funded twin) — Polygon fork cached, ~396ms |
| `forge test --match-path "test/instrument/OperationalCostManagement.t.sol" -vv` | 10/10 PASS (incl. `invariant_costConserved` 16 runs + `test_accrueSameLegTwice_cummCostSomiUnchanged`) |
| `forge test --match-path "test/instrument/PolygonPools.t.sol" -vv` | 3/3 PASS |
| `forge test --match-path "test/instrument/MacroHedgeExecutor.onResult.t.sol" -vv` | 4/4 PASS |
| `bulloak check test/fork/MacroHedgeExecutor.fork.tree` | exit 0 |
| `bulloak check test/instrument/MacroHedgeExecutor.onResult.tree` | exit 0 |
| `bulloak check test/instrument/OperationalCostManagement.tree` | exit 0 |
| `bulloak check test/instrument/PolygonPools.tree` | exit 0 |

---

## Anti-Patterns Scan

No TODO/FIXME/HACK/PLACEHOLDER comments found in any production source file. No empty `return null` / `return {}` / `return []` stubs. The MVP stub surfaces (`REPRESENTATIVENESS_RATIONALE` constant, `REPRESENTATIVE_STUB = true`) are documented as intentional Phase-14 STRETCH placeholders in NatSpec, not hidden gaps — the `RepresentativenessAssessed` event is the stable UI contract; only its SOURCE is stubbed, per the plan's explicit scope.

---

## Iron-Law Ancestry

All three plans verified: trees committed before impl, confirmed via `git merge-base --is-ancestor`:

- Plan 01: `3de3c5e` (PolygonPools.tree) is ancestor of `a91a708` (impl+test) — CONFIRMED
- Plan 02: `322cab4` (fork.tree + onResult.tree + RED fork test) is ancestor of `e85c2fc` (MacroHedgeExecutor impl) — CONFIRMED
- Plan 03: `e3b9dc4` (OperationalCostManagement.tree + RED suite) is ancestor of `ceb5057` (impl) — CONFIRMED

---

## Carried Limitation (Scoped, Not a Gap)

The following items were explicitly scoped out of Phase 13 by the plan and the gate-approved VALIDATION document. They are NOT gaps — they are honest boundaries documented in the plan, SUMMARY, and the executor's own NatSpec.

**1. Live `_onResult` to real mint join is NOT proven in Phase 13.**
The production `_onResult` edge COMPILES correctly (`abi.decode(responses[0].result, (HedgeLegParams))` routes to `_resolveAndMint`), but no Phase-13 test executes it end-to-end: the `MacroHedgeExecutorDecodeProbe` proves the decode in ISOLATION (overrides mint sink, skips `pool.dispatch`); the fork test proves the mint via the DIRECT `resolveAndMint` entrypoint. A single Foundry test cannot stage a live Somnia callback AND a Polygon fork simultaneously. The live join is the Phase-14 manual `workflow_dispatch` STRETCH.

**2. Representativeness SOURCE is a deterministic MVP stub.**
`RepresentativenessAssessed` fires on every mint with a constant `rationale` and `representative = true`. The event IS the stable UI contract. The live `llm-inference` representativeness round-trip is the Phase-14 STRETCH.

**3. `OperationalCostManagement` is not yet wired into `MacroHedgeExecutor` as a call-time side-effect.**
The ledger is a standalone contract with open entry points (no access control needed for the unit proof). Plan 02's design made it a settable/optional field (not a constructor requirement) so Plan 03 could run in parallel as Wave 1. The wiring (executor calling `accrueAgentCost` on each `resolveAndMint` / `_onResult` dispatch) is a Phase-14 integration task. The EXEC-03 requirement is satisfied: the ledger CONTRACT is built, conserved, and idempotent — the integration is deferred, not blocked.

---

## Summary

Phase 13's goal is achieved. All three requirements (EXEC-01, EXEC-02, EXEC-03) are satisfied by the actual codebase and confirmed by fresh gate runs:

- EXEC-01: `MacroHedgeExecutor is SomniaAgentConsumer` is deployable, mints the demo position through the contract on the Polygon fork (executor owns position + collateral shares), events fire, `_onResult` decode is correct and unit-proven.
- EXEC-02: The honest collateral gate is the protocol-native atomic `AccountInsolvent` revert (not a pre-mint quote). Proven non-vacuous and collateral-driven by the identical-params funded/under-funded twin pattern.
- EXEC-03: `OperationalCostManagement` accrues a conserved budgeted-SOMI ledger with per-`(decisionId,leg)` idempotency, with two distinct mutations proving the conservation invariant and the idempotency leaf are genuinely separate structural claims.

All four bulloak trees pass. Iron-Law ancestry confirmed for all three plans. No blocker anti-patterns. The carried limitations (live Somnia join, representativeness inference, cost-ledger wiring) are explicitly scoped to Phase-14 and were gate-approved as such.

---

_Verified: 2026-06-06T20:15:00Z_
_Verifier: Claude (gsd-verifier)_
