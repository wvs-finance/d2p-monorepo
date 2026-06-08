---
phase: 11-macrohedgestrategist-hedge-decision-agent
plan: 02
subsystem: agent
tags: [solidity, foundry, bulloak, btt, somnia, llm-inference, macro-hedge, somnia-agent-consumer]

# Dependency graph
requires:
  - phase: 11-01
    provides: "ILLMAgent (inferString/inferNumber) vendored into ISomniaAgents.sol"
  - phase: master (pre-Phase-11)
    provides: "SomniaAgentConsumer (auth+replay handleResponse), MacroOracle (latest/MacroDatum), MockPlatform, SomniaProbe decode-safety pattern"
provides:
  - "MacroHedgeStrategist.sol — is SomniaAgentConsumer; two-entrypoint (requestActionDecision / requestSizeDecision) hedge-decision agent with a block-independent decisionId join"
  - "MacroHedgeStrategist.tree — BTT spec (Iron Law: tree before impl), bulloak-clean"
  - "MacroHedgeStrategist.t.sol — 17-test MockPlatform unit suite (cross-block join, payload-type containment, both-end clamp, auth, replay)"
  - "MockMacroOracle.sol — standalone in-memory MacroOracle stand-in (seed/latest)"
affects: [11-03, 11-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Two-entrypoint LLM-agent flow (one infer per tx — msg.value-forwarding footgun) joined on an explicit block-independent decisionId = bytes32(actionRequestId)"
    - "DecisionFailed fallback (try/catch string decode + 32-byte int guard + _mapAction keccak compare) routes malformed/wrong-type payloads without enum-zero write or bricking the pending request"
    - "actionSet/sizeSet flags sequence the two-callback completion; HedgeDecisionMade fires only on both-set, cross-block"

key-files:
  created:
    - contracts/test/instrument/MacroHedgeStrategist.tree
    - contracts/src/instrument/MacroHedgeStrategist.sol
    - contracts/test/instrument/MacroHedgeStrategist.t.sol
    - contracts/test/mocks/MockMacroOracle.sol
  modified:
    - .planning/REQUIREMENTS.md
    - .planning/ROADMAP.md
    - .planning/STATE.md

key-decisions:
  - "decisionId = bytes32(actionRequestId) — NOT keccak(...block.number) — so the size leg in a later block joins the same struct (BLOCKER-1 fix)"
  - "requestSizeDecision guard uses actionSet==true && !sizeSet (NOT a macroValue==0 sentinel; zero is a legitimate signed macro value)"
  - "Decision state read through the typed getDecision(bytes32) view; the auto-generated decisions() tuple getter does not support member access in tests"
  - "MockMacroOracle imported from test/mocks (standalone) rather than inlined in the .t.sol — keeps the .t.sol single-contract so bulloak anchors on MacroHedgeStrategistlifecycle"

patterns-established:
  - "Pattern: bulloak BTT branch nodes with `given` children become no-op modifiers on the matching test_* leaves (mirrors CcopUsdcPool.t.sol) so `bulloak check` maps 1:1 while one real test body carries the assertions"
  - "Pattern: cross-block join proven with vm.roll + vm.warp between the two fulfillments"

requirements-completed: [AGENT-02]

# Metrics
duration: ~15min (continuation)
completed: 2026-06-02
---

# Phase 11 Plan 02: MacroHedgeStrategist MockPlatform Unit Suite Summary

**`MacroHedgeStrategist is SomniaAgentConsumer` — a two-entrypoint LLM-Inference hedge-decision agent joined on a block-independent `decisionId`, proven by a bulloak-clean 17-test MockPlatform suite (cross-block join, payload-type containment, both-end clamp, inherited auth/replay).**

## Performance

- **Duration:** ~15 min (continuation; tasks 1-2 pre-committed by the prior executor)
- **Completed:** 2026-06-02
- **Tasks:** 3 (Task 1 tree + Task 2 contract pre-committed; Task 3 unit suite finished here)
- **Files modified:** 4 source/test + 3 planning docs

## Accomplishments
- `MacroHedgeStrategist.tree` — BTT spec committed BEFORE impl (Iron Law); bulloak 0.9.2 clean.
- `MacroHedgeStrategist.sol` — `is SomniaAgentConsumer`; `requestActionDecision(bytes32,int256)` returns the `decisionId`, `requestSizeDecision(bytes32)` binds the size leg to the same struct; `_onResult` decodes string→enum (no enum-zero on failure) + int256→clamp; `HedgeDecisionMade` fires only when both legs land on the same `decisionId`. `forge build` green; no `block.number`; both `inferString`/`inferNumber` selectors encoded; agent ID `12847293847561029384`.
- `MacroHedgeStrategist.t.sol` — 17-test MockPlatform suite, all green. Proves: explicit decisionId hand-off, cross-block join via `vm.roll`, int-blob→action DecisionFailed (`actionSet==false`), string-blob→size DecisionFailed (`sizeSet==false`), size clamp 2500→2500 / 99999→10000 / −5→0, unmapped-action no-enum-zero guard, `UnknownKey`/`UnknownDecision`, inherited `NotPlatform`/`UnknownRequest`.
- `MockMacroOracle.sol` de-orphaned — imported from `test/mocks`, keeping the `.t.sol` single-contract so bulloak anchors on `MacroHedgeStrategistlifecycle`.

## Task Commits

1. **Task 1: MacroHedgeStrategist.tree (BTT spec)** — `71d3bec` (test) — *pre-committed by prior executor*
2. **Task 2: MacroHedgeStrategist.sol (is SomniaAgentConsumer)** — `0853bfc` (feat) — *pre-committed by prior executor*
3. **Task 3: MockPlatform unit suite + mock oracle** — `f778012` (test)

**Plan metadata:** (final docs commit below)

## Files Created/Modified
- `contracts/test/instrument/MacroHedgeStrategist.tree` - BTT spec, single root `MacroHedgeStrategist::lifecycle`
- `contracts/src/instrument/MacroHedgeStrategist.sol` - the agent contract; two entrypoints + block-independent decisionId join + DecisionFailed fallback
- `contracts/test/instrument/MacroHedgeStrategist.t.sol` - 17-test unit suite, `MacroHedgeStrategistlifecycle is Test`
- `contracts/test/mocks/MockMacroOracle.sol` - standalone seedable MacroOracle stand-in
- `.planning/REQUIREMENTS.md` - AGENT-01 + AGENT-02 marked Complete (checkbox + traceability)
- `.planning/ROADMAP.md` - 11-02 checklist row ticked, plan-progress refreshed
- `.planning/STATE.md` - Phase 11 side-track section updated

## Decisions Made
- **Block-independent `decisionId`**: derive from the action leg's monotonic `requestId` (`bytes32(requestId)`), never `keccak(...block.number)` — the size leg runs in a later block, so any block-varying term would break `actionSet && sizeSet` joining on one struct (the BLOCKER-1 fix the review gate flagged). Proven by the `vm.roll` cross-block leaf.
- **Existence ⇔ `actionSet==true`** for the size-entrypoint guard, not a `macroValue==0` sentinel: `macroValue` is the signed oracle `scaledValue` and zero is a legitimate macro print, so a zero-sentinel would both false-reject valid decisions and false-accept empty slots.
- **Typed `getDecision(bytes32)` view** for test reads: the auto-generated `decisions()` tuple getter does not support `.actionSet`/`.action` member access in Solidity tests.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] bulloak-anchoring + de-orphaned mock (continuation fix)**
- **Found during:** Task 3 (continuation — prior executor's socket died mid-task)
- **Issue:** For `bulloak check` to exit 0, the `.t.sol` must be single-contract so bulloak anchors on `MacroHedgeStrategistlifecycle` (the joined tree root). An inline `MockMacroOracle` ahead of the suite contract would cascade to all-missing. The standalone `test/mocks/MockMacroOracle.sol` was also orphaned/unused. bulloak additionally requires no-op `when*` modifiers on the branch nodes that have `given` children.
- **Fix:** Single-contract `.t.sol` importing `MockMacroOracle` from `../mocks/MockMacroOracle.sol` (de-orphaning it); added no-op `when*` branch modifiers on the matching `test_*` leaves (mirroring the clean `CcopUsdcPool.t.sol` layout) with no duplicate empty stubs.
- **Files modified:** `contracts/test/instrument/MacroHedgeStrategist.t.sol`, `contracts/test/mocks/MockMacroOracle.sol`
- **Verification:** `bulloak check test/instrument/MacroHedgeStrategist.tree` exits 0; `forge test --match-path test/instrument/MacroHedgeStrategist.t.sol` 17/17 green.
- **Committed in:** `f778012` (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking — continuation reconciliation).
**Impact on plan:** Necessary for the Task-3 acceptance gate (bulloak exit 0 + suite green). No scope creep; behaviors are exactly those the tree enumerates.

## Issues Encountered
None beyond the continuation reconciliation above. Both gates were already green on disk on resume (the prior executor had completed the fix uncommitted); verified before committing.

## Requirement Marks (rationale)
- **AGENT-01 → Complete.** Interface (11-01) + `MacroHedgeStrategist is SomniaAgentConsumer` now compiles (`forge build` green) and calls the LLM-Inference agent (ID `12847293847561029384`) via `abi.encodeWithSelector(ILLMAgent.inferString/inferNumber.selector, …)` through the inherited `_sendRequest`→`handleResponse` pattern. The 11-01 SUMMARY left it partial pending the contract half, which now exists.
- **AGENT-02 → Complete.** `requestActionDecision`/`requestSizeDecision` read `MacroOracle.latest(dataKey).scaledValue`, encode the two infer legs with the verbatim selectors, decode string→enum + int256→clamp, store `HedgeDecision`, and emit `HedgeDecisionMade`; the `allowedValues`/`[0,MAX_SIZE_BPS]` bounds are the structural guardrail. Forge-proven at the unit level (17/17).
- **AGENT-03 → left Pending.** Only the UNIT half lands here (inherited `NotPlatform`/`UnknownRequest` revert; DecisionFailed never bricks/pollutes; payload-type confusion contained). The required Somnia-testnet live run (in-enum action + in-range size + decision-moves-with-consensus over two real `consensus` values) is Plan 11-03.
- **AGENT-04 → left Pending** (CI gate is Plan 11-04).

## Next Phase Readiness
- 11-03 (live Somnia-testnet e2e) and 11-04 (contracts-ci.yml) are unblocked: the contract compiles, encodes both infer legs one-per-tx, and the BTT tree is bulloak-clean for the per-file CI check.
- The block-independent `decisionId` is the live-topology guarantee 11-03 depends on (the keeper sequences action → await callback → size across blocks).

## Self-Check: PASSED

All 5 created files present on disk; all 3 task commits (`71d3bec`, `0853bfc`, `f778012`) found in history.

---
*Phase: 11-macrohedgestrategist-hedge-decision-agent*
*Completed: 2026-06-02*
