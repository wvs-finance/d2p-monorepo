---
phase: 08-longgammawrapper-cash-flow
plan: 01
subsystem: contracts
tags: [solidity, panoptic-v2, erc4626, swap-seam, bulloak, btt, foundry]

# Dependency graph
requires:
  - phase: 07-base-fork-borrowed-panoptic-v2-ccop-usdc-pool
    provides: IPanopticData swap-seam interface, borrowed V2 value types (@types/*), PanopticDataSeam proven deposit→dispatch flow
provides:
  - "ICostMeter external-meter seam: cost(address)->(cost0,cost1), zero-address ⇒ (0,0) by caller convention"
  - "IPanopticData.getOracleTicks() extension (+OraclePack import) for involuntary-branch state monitoring"
  - "LongGammaWrapper.sol skeleton: State machine (Uninitialized→Open→Closed→Claimed), single-record ledger, 4 events, 4 errors, 5 locked entrypoints"
  - "setCostMeter (owner+Uninitialized-only) and _costOf (zero-address⇒(0,0)) fully implemented"
  - "LongGammaWrapper.invariants.tree — 8th canonical BTT tree naming both fuzz invariants (Iron Law)"
affects: [08-02-deposit-mint, 08-03-close-residual, 08-04-claim, 08-05-invariants-impl, 08-06, 08-07, 09-premium-split]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Swap seam: wrapper imports ONLY IPanopticData + ICostMeter (local) + OZ IERC4626/IERC20 + @types value types; NO borrowed concrete (grep-guarded)"
    - "Interface-first plan: contracts + stubs only; fork-dependent bodies revert UNIMPLEMENTED until later plans"
    - "External-meter seam mirrors swap-seam ethos: v1 zero-address ⇒ zero cost, Phase 9 plugs real meter at construction with no signature change"

key-files:
  created:
    - contracts/src/instrument/interfaces/ICostMeter.sol
    - contracts/src/instrument/LongGammaWrapper.sol
    - contracts/test/instrument/LongGammaWrapper.invariants.tree
  modified:
    - contracts/src/instrument/interfaces/IPanopticData.sol

key-decisions:
  - "Inline nonReentrant guard instead of OZ ReentrancyGuard to keep the swap-seam import set minimal"
  - "Owner's ONLY lever is setCostMeter, frozen at first deposit (state leaves Uninitialized); ownership not assumed transferable/renounceable in v1"
  - "lastSurviving is last-OBSERVATION (not high-water mark) — documented in storage NatSpec for the Plan-03 erosion semantics"
  - "invariants.tree uses bulloak-0.9.2 parseable when/it keyword form (the plan's bare invariant-name leaves do not parse under 0.9.2)"

patterns-established:
  - "Grep-guarded swap seam on the wrapper: grep -c panoptic-borrowed == 0"
  - "P1 grep-guard: no SPREAD_MULTIPLIER/perBlock/VEGOID streamia constants in the wrapper (read-from-contract, never re-derived)"
  - "Tree-before-impl Iron Law: invariants.tree committed before any invariant .t.sol (Plan 05)"

requirements-completed: [WRAP-01, WRAP-02, WRAP-03, WRAP-04]

# Metrics
duration: 35min
completed: 2026-06-02
---

# Phase 8 Plan 01: LongGammaWrapper Interface-First Contract Surface Summary

**Locked the Phase-8 contract surface: ICostMeter (zero-address⇒(0,0)) external-meter seam, IPanopticData.getOracleTicks extension, the LongGammaWrapper skeleton (state machine + 4 events + 5 entrypoints, setCostMeter/_costOf live), and the invariants.tree BTT spec — forge build green, swap seam intact.**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-06-02T19:40Z (approx)
- **Completed:** 2026-06-02T20:15Z
- **Tasks:** 3
- **Files modified:** 4 (3 created, 1 modified)

## Accomplishments
- `ICostMeter.cost(address)->(cost0,cost1)` external-meter seam locked with the v1 zero-address⇒(0,0) caller convention.
- `IPanopticData` extended with `getOracleTicks()` (+ `OraclePack` value-type import) for involuntary-branch state monitoring; stale `@L221` comment drive-by-fixed to `L431` on both the NatSpec and inline lines.
- `LongGammaWrapper.sol` skeleton compiles against the borrowed V2 value types with the swap seam intact (no borrowed concrete import): state machine, single-record ledger, 4 events, 4 errors, 5 locked entrypoints; `setCostMeter` (owner + Uninitialized-only) and `_costOf` (zero-address⇒(0,0)) fully implemented.
- `LongGammaWrapper.invariants.tree` — the 8th canonical phase tree — names both ROADMAP fuzz invariants and is bulloak-0.9.2 parseable, committed before any invariant `.t.sol` (Iron Law).

## Task Commits

Each task was committed atomically:

1. **Task 1: ICostMeter interface + IPanopticData getOracleTicks extension** - `ef0e5a2` (feat)
2. **Task 2: LongGammaWrapper skeleton** - `01fd897` (feat)
3. **Task 3: invariants.tree BTT spec** - `7ec4a1f` (test)

**Plan metadata:** (see final docs commit)

## Files Created/Modified
- `contracts/src/instrument/interfaces/ICostMeter.sol` - external per-position cost seam (created)
- `contracts/src/instrument/interfaces/IPanopticData.sol` - +getOracleTicks, +OraclePack import, L221→L431 fix (modified)
- `contracts/src/instrument/LongGammaWrapper.sol` - skeleton: state machine, storage, events, 5 entrypoint stubs, setCostMeter/_costOf live (created)
- `contracts/test/instrument/LongGammaWrapper.invariants.tree` - BTT spec naming the two fuzz invariants (created)

## Decisions Made
- **Inline reentrancy guard** over OZ ReentrancyGuard — keeps the wrapper's import set to exactly the swap-seam set, per the plan's explicit instruction.
- **Owner lever documented as inert post-Open** — the contract-level NatSpec states `setCostMeter` is the owner's only lever, frozen at first deposit, and ownership is not transferable/renounceable in v1; plus the N1 callable-`user` precondition.
- **invariants.tree keyword form** — the plan's literal tree used bare `invariant_*` names as branch labels, which bulloak 0.9.2 rejects (`unexpected token`); switched to the parseable `when invariant_* / it ...` form (same Phase-7 tree-deviation precedent: 07-03/07-04). Both AC gates (real scaffold parse gate + grep count==2) pass.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] invariants.tree restructured to bulloak-0.9.2 parseable form**
- **Found during:** Task 3 (invariants.tree)
- **Issue:** The plan's literal tree placed bare invariant function names (`invariant_residualNeverExceedsHoldings`) directly as `├──` branch labels. bulloak 0.9.2 rejects this with `bulloak error: unexpected token 'invariant_residualNeverExceedsHoldings'` — child nodes must lead with a recognized keyword (`when`/`given`/`it`), as every other parseable tree in the repo does.
- **Fix:** Used `when invariant_<name>` / `it <prose>` leaf form. Both invariant names remain present (grep count == 2) and the REAL parse gate (`bulloak scaffold … && echo PARSE_OK`) now prints PARSE_OK. The tree is a naming SPEC; Plan 05 writes the `.t.sol` with proper Foundry `invariant_*` function names (bulloak's auto-scaffold prefix is not load-bearing).
- **Files modified:** contracts/test/instrument/LongGammaWrapper.invariants.tree
- **Verification:** `bulloak scaffold test/instrument/LongGammaWrapper.invariants.tree >/dev/null 2>&1 && echo PARSE_OK` → PARSE_OK; grep count == 2.
- **Committed in:** `7ec4a1f` (Task 3 commit)

**2. [Rule 3 - Blocking] Removed `@types/`/`panoptic-borrowed` literals from wrapper NatSpec**
- **Found during:** Task 2 (LongGammaWrapper skeleton)
- **Issue:** (a) A `///` doc-comment containing `@types/TokenId.sol` made solc fail with `Error (6546): Documentation tag @types/TokenId.sol\` not valid for contracts`. (b) A NatSpec line literally containing the string `panoptic-borrowed` broke the swap-seam grep-guard (`grep -c panoptic-borrowed` returned 1 instead of 0).
- **Fix:** Rephrased the NatSpec to "borrowed VALUE type" / "borrowed concrete contract" — no `@`-prefixed path token, no `panoptic-borrowed` literal.
- **Files modified:** contracts/src/instrument/LongGammaWrapper.sol
- **Verification:** `forge build` exit 0; `grep -c panoptic-borrowed` == 0.
- **Committed in:** `01fd897` (Task 2 commit)

**3. [Rule 3 - Blocking] getOracleTicks/enum reformatted to single-line to satisfy literal grep ACs**
- **Found during:** Tasks 1 & 2
- **Issue:** The on-disk `getOracleTicks` (pre-existing uncommitted Task-1 work) was multi-line; the plan's AC greps the exact single-line signature. Likewise the `enum State { … }` AC greps a single-line form.
- **Fix:** Collapsed both to the single-line forms the ACs grep for. Semantically identical.
- **Files modified:** contracts/src/instrument/interfaces/IPanopticData.sol, contracts/src/instrument/LongGammaWrapper.sol
- **Verification:** Both literal-signature greps now match; `forge build` exit 0.
- **Committed in:** `ef0e5a2`, `01fd897`

---

**Total deviations:** 3 auto-fixed (all Rule 3 - blocking/formatting to satisfy the plan's own gates).
**Impact on plan:** No scope change. All fixes were required to make the plan's own `forge build` / grep / parse acceptance criteria pass against the real toolchain (bulloak 0.9.2 + solc NatSpec rules). No behavioral surface added or removed — still interface-first.

## Issues Encountered
- **Pre-existing uncommitted Task-1 work on disk.** `ICostMeter.sol` (untracked) and a modified `IPanopticData.sol` already matched the Task-1 spec from a prior session. Verified they satisfied every Task-1 acceptance criterion (after the single-line `getOracleTicks` reformat), then committed them as Task 1 rather than redoing — no duplication.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- The Phase-8 contract surface is LOCKED. Every downstream plan (02–07) now has the exact signatures: `deposit(address,uint256,uint256)`, `close()`, `syncResidual()`, `claimResidual()`, `setCostMeter(address)`, the 4 events, the `State` enum, and the `ICostMeter` shape.
- `forge build` green; swap-seam + P1 grep-guards pass; invariants.tree parses.
- Plan 02 fills `deposit` (custody + mint via `pool.dispatch`, `isLong=1`); Plans 03–04 fill close/sync/claim; Plan 05 implements `LongGammaWrapper.invariants.t.sol` against the committed tree.

---
*Phase: 08-longgammawrapper-cash-flow*
*Completed: 2026-06-02*

## Self-Check: PASSED

All created/modified files exist on disk; all three task commit hashes (`ef0e5a2`, `01fd897`, `7ec4a1f`) are present in git history.
