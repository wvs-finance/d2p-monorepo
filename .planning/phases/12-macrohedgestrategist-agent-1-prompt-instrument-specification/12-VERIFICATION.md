---
phase: 12-macrohedgestrategist-agent-1-prompt-instrument-specification
verified: 2026-06-06T22:24:48Z
status: passed
score: 7/7 must-haves verified
re_verification: false
---

# Phase 12: MacroHedgeStrategist (Agent 1) — Prompt to HedgeMandate Verification Report

**Phase Goal:** Upgrade the Phase-11 v1 `MacroHedgeStrategist` OUTPUT from `HedgeDecision{action,sizeBps}` to a `HedgeMandate` — the economic school Agent 1 INFERS from the prompt (via a concrete `IMacroThesis` named-thesis registry), the direction (derived), and a target notional. Agent 1 expresses WHAT to hedge under WHICH school; it does NOT finalize the instrument geometry (Phase 14). Keep the v1 two-entrypoint/`decisionId`/decode-safety spine verbatim.

**Verified:** 2026-06-06T22:24:48Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Gate Commands (re-confirmed)

| Command | Result |
|---|---|
| `forge build` | Exit 0 — no errors; pre-existing benign notes only (MacroOracle named-struct-fields, asm-keccak256, AST source, unused-import in fork test) |
| `forge test --match-path 'test/instrument/MacroHedgeStrategist.t.sol' -vv` | **19 passed, 0 failed, 0 skipped** |
| `bulloak check test/instrument/MacroHedgeStrategist.tree` | Exit 0 — "All checks completed successfully! No issues found." |
| `forge test --no-match-path 'test/**/*{fork,invariants}*'` | **97 passed, 0 failed, 0 skipped** (13 suites, ~530ms — no sibling regressions) |

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|---|---|---|
| 1 | `HedgeMandate` value type exists with 5 intent-only fields (no geometry) | VERIFIED | `src/types/HedgeMandate.sol`: `economicTheory`, `underlyingMarket`, `targetNotional`, `chainId`, `isLong`; `grep -cE 'strikeWAD\|PayoffTerms'` == 0 |
| 2 | `IMacroThesis` is a concrete handle-resolving registry (`schoolLabels`/`thesisOf`/`promptBias`) | VERIFIED | `src/interfaces/IMacroThesis.sol`: `library MacroThesisRegistry` with all three functions; `thesisOf` returns `(IMacroThesis, bool ok)`, no-default-write on no-match |
| 3 | `MacroHedgeStrategist` school leg fires `inferString` over `MacroThesisRegistry.schoolLabels()` | VERIFIED | `requestSchoolDecision` wires `MacroThesisRegistry.schoolLabels()` as `allowedValues`; `MacroThesisRegistry.(schoolLabels\|thesisOf)` count == 4; school callback resolves handle via `thesisOf` |
| 4 | `MacroHedgeStrategist` notional leg fires `inferNumber` with `[MIN_NOTIONAL, MAX_NOTIONAL]` bounds and M2 floor-up clamp | VERIFIED | `requestNotionalDecision` fires `inferNumber([1_000, 100_000_000])`; clamp expression covers negatives + sub-floor positives + over-cap; unit-proven by 5 notional callback leaves (in-range/over-max/below-MIN/negative/non-32-byte) |
| 5 | Cross-block join assembles + emits `StrategistDecided(decisionId, school, HedgeMandate)` exactly once when both legs land | VERIFIED | `event StrategistDecided(bytes32 indexed decisionId, string school, HedgeMandate mandate)` declared and emitted at the join; `vm.roll+vm.warp` cross-block test passes (19th test leaf) |
| 6 | `getMandate` + `decisionState` return single structs (not tuples); v1 spine kept verbatim; old `MAX_SIZE_BPS`/`HedgeAction`/`HedgeDecisionMade`/`_mapAction` gone | VERIFIED | Single-struct getters confirmed by grep; spine verbatim (`decisionId = bytes32(requestId)` count 1; `try this.decodeString` count 1; `result.length != 32` count 1; `function handleResponse` count 0); old API grep count == 0 |
| 7 | Emitted `HedgeMandate` is well-formed and consumable by Phase 14: `underlyingMarket == POLYGON_WCOP_USDC_POOL_ID()`, `economicTheory` non-zero, `targetNotional in [1_000, 100_000_000]`, `chainId == 137`, `isLong == true`; four pass-through field types compile into `HedgeLegParams` scratch struct with zero translation | VERIFIED | `test_WhenAMandateIsAssembled` leaf asserts all 5 fields + performs compile-time `HedgeLegParams` scratch-copy; `POLYGON_WCOP_USDC_POOL_ID` wired at join (grep count 1); `HedgeLegParams` type alignment confirmed (same `PoolId`/`IMacroThesis`/`uint32`/`bool` types) |

**Score:** 7/7 truths verified

---

## Required Artifacts

| Artifact | Plan | Status | Evidence |
|---|---|---|---|
| `contracts/src/types/HedgeMandate.sol` | 12-01 | VERIFIED | Exists; 5 intent-only fields; no geometry (grep count 0); imports `IMacroThesis` and `PoolId`; commit `59dcc0d` |
| `contracts/src/interfaces/IMacroThesis.sol` | 12-01 | VERIFIED | Exists; empty `interface IMacroThesis {}` marker kept + `library MacroThesisRegistry` with `schoolLabels`/`thesisOf`/`promptBias`; commit `1d4387f` |
| `contracts/test/instrument/MacroHedgeStrategist.tree` | 12-02 | VERIFIED | Exists; contains all school/notional/mandate/auth leaves; `bulloak check` exit 0; commit `6fe4c32` (RED — Iron-Law first) |
| `contracts/test/instrument/MacroHedgeStrategist.t.sol` | 12-02 | VERIFIED | Exists; 19 tests, all PASS; includes `StrategistDecided`, cross-block join, mandate well-formedness, `HedgeLegParams` scratch-copy |
| `contracts/src/instrument/MacroHedgeStrategist.sol` | 12-02 | VERIFIED | Exists; `function getMandate` present; full school/notional two-leg flow; spine verbatim; old API removed; commit `7101acb` (GREEN — after RED) |
| `docs/UI-AGENT-HANDOFF.md` | 12-02 | VERIFIED | `HedgeMandate` appears 6 times; `StrategistDecided` reconciled to the HedgeMandate shape; dated 2026-06-06 note present; commit `68e34d0` |

---

## Key Link Verification

| From | To | Via | Status | Evidence |
|---|---|---|---|---|
| `HedgeMandate.sol` | `IMacroThesis.sol` | `import IMacroThesis` as `economicTheory` field type | WIRED | `grep -c 'import.*IMacroThesis' src/types/HedgeMandate.sol` == 1 |
| `HedgeMandate.sol` | `v4-core/types/PoolId.sol` | `import PoolId` as `underlyingMarket` field type | WIRED | `grep -c 'import.*PoolId' src/types/HedgeMandate.sol` == 1 |
| `MacroHedgeStrategist.sol` | `IMacroThesis.sol` | `MacroThesisRegistry.schoolLabels()` builds `allowedValues`; `thesisOf()` resolves school handle | WIRED | `grep -cE 'MacroThesisRegistry\.(schoolLabels\|thesisOf)'` == 4 |
| `MacroHedgeStrategist.sol` | `HedgeMandate.sol` | assembles + stores + emits a `HedgeMandate` at the join | WIRED | `grep -c 'HedgeMandate' src/instrument/MacroHedgeStrategist.sol` == 8 |
| `MacroHedgeStrategist.sol` | `PolygonPools.sol` | `underlyingMarket = PolygonPools.POLYGON_WCOP_USDC_POOL_ID()` | WIRED | `grep -c 'PolygonPools\.POLYGON_WCOP_USDC_POOL_ID' src/instrument/MacroHedgeStrategist.sol` == 1 |

---

## Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|---|---|---|---|---|
| STRAT-01 | 12-01, 12-02 | Upgrade v1 output to `HedgeMandate` via two `llm-inference` legs (`inferString` → school, `inferNumber` → notional); emits `StrategistDecided`; rejects non-`PLATFORM`/replay; decode-safety; live "different prompt → different mandate" DEFERRED | SATISFIED (with documented deferral) | 19/19 unit tests green against MockPlatform; full school/notional two-leg flow + auth/replay proven; live Somnia run explicitly deferred as Manual-Only `workflow_dispatch` per 12-02 §LIVE-PROOF DEFERRAL (M4) — honest scoping, not a gap |
| STRAT-02 | 12-01, 12-02 | Emitted `HedgeMandate` is well-formed + consumable: `underlyingMarket == POLYGON_WCOP_USDC_POOL_ID()`, school handle resolvable, `targetNotional in [1_000, 100_000_000]`, `chainId == 137`, `isLong`; compile-time `HedgeLegParams` scratch-copy type-alignment proof; NOT geometry derivation | SATISFIED | `test_WhenAMandateIsAssembled` asserts all 5 fields + performs scratch-copy; type alignment confirmed by grep on `HedgeLegParams`; no geometry fields in mandate (grep count 0) |

**Multi-plan convention:** STRAT-01/02 were marked `[x]` in REQUIREMENTS.md after 12-01 (substrate) per this repo's multi-plan convention. The substrate alone was not sufficient — it is 12-02's re-semantic + emitter that completes both requirements. The codebase now has both halves: the type/registry substrate (12-01) and the strategist that assembles + emits (12-02). Both requirements are now genuinely satisfied by the combined artifact set.

---

## Live-Run Deferral (honest fence — NOT a gap)

STRAT-01's live "different prompt → different mandate on Somnia testnet" sub-clause is **explicitly deferred** as a Manual-Only `workflow_dispatch` follow-up. The plan (12-02 §LIVE-PROOF DEFERRAL, M4) pre-approved this scope boundary. The mechanics are fully proven offline by the 19-test MockPlatform suite (school request/callback, notional request/callback including cross-block join, auth/replay, decode-safety). Adapting the e2e script (`script/macro-hedge-strategist-e2e.sh`) to the new `requestSchoolDecision`/`requestNotionalDecision`/`getMandate` API and running the STT-spending live proof remains a deferred but required follow-up before the Phase-15 E2E submission.

This deferral is gate-approved honest scoping. It does not block the Phase-14 dependency (which consumes `getMandate` from the codebase, not from a live Somnia run).

---

## Anti-Patterns Found

None. Scanned `src/types/HedgeMandate.sol`, `src/interfaces/IMacroThesis.sol`, and `src/instrument/MacroHedgeStrategist.sol` for TODO/FIXME/PLACEHOLDER, empty returns, and console-only handlers. All clean.

---

## Human Verification Required

None for the current phase scope. The deferred live Somnia run (see above) will need a human-triggered `workflow_dispatch` to confirm the live "different prompt → different mandate" behavior — but this is explicitly out-of-scope for Phase 12's CI gate, not an automated verification gap.

---

## Sibling Regression Confirmation

The full fork-free suite (`forge test --no-match-path 'test/**/*{fork,invariants}*'`) ran 13 suites / 97 tests: 97 passed, 0 failed, 0 skipped. Confirmed suites include:
- MacroHedgeStrategist: 19/19
- PolygonPools: 3/3
- OperationalCostManagement: 10/10 (including `invariant_costConserved`, 16 runs/0 reverts)
- LongGammaWrapper (non-fork, non-invariant): all passing

No sibling regressions introduced by Phase 12.

---

## Summary

Phase 12 goal is fully achieved. The two-wave plan delivered:

- **12-01 (Wave 0 substrate):** `HedgeMandate` (5 intent-only fields, zero geometry, four types mirror `HedgeLegParams` for zero-translation Phase-14 hand-off) + `MacroThesisRegistry` (handle-resolving, `schoolLabels`/`thesisOf`/`promptBias`, non-deployable sentinel handles). `forge build` green.

- **12-02 (Iron-Law TDD re-semantic):** `MacroHedgeStrategist` re-pointed to fire `inferString` over the registry labels (Leg 1) and `inferNumber` for target notional with M2 floor-up clamp (Leg 2); join assembles + emits `StrategistDecided(decisionId, school, HedgeMandate)`; `getMandate`/`decisionState` single-struct getters; v1 spine verbatim; old action/sizeBps API removed. 19/19 tests green; bulloak exit 0; 97/97 regression suite green; UI-HANDOFF reconciled.

Both STRAT-01 and STRAT-02 are genuinely satisfied by the combined codebase. The live Somnia "different prompt → different mandate" sub-clause is honestly deferred as a Manual-Only `workflow_dispatch` — a pre-approved gate boundary, not a hidden gap.

---

_Verified: 2026-06-06T22:24:48Z_
_Verifier: Claude (gsd-verifier)_
