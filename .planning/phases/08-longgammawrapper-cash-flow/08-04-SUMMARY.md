---
phase: 08-longgammawrapper-cash-flow
plan: 04
subsystem: contracts
tags: [solidity, panoptic-v2, streamia, long-premium, swap-seam, bulloak, btt, foundry, base-fork, read-fidelity]

# Dependency graph
requires:
  - phase: 08-longgammawrapper-cash-flow
    plan: 02
    provides: LongGammaWrapperBase (M-3 deploy isolation + seeded same-chunk seller short), V4SwapHelper, _longTokenId/_oneLegArgs/LONG_SIZE/TICK_LIMIT_*/EFF_LIQ_LIMIT
  - phase: 08-longgammawrapper-cash-flow
    plan: 03
    provides: LongGammaWrapper.deposit(address,uint256,uint256,TokenId,uint128,int24[3]) LOCKED 6-arg open entrypoint; State machine + WrongState error; positionTokenId stored
provides:
  - "LongGammaWrapper.recordStreamia() public view returns (uint128 streamia0, uint128 streamia1) — PURE PASSTHROUGH READ of getAccumulatedFeesAndPositionsData(address(this),true,[positionTokenId]).longPremium (rightSlot=token0, leftSlot=token1); ZERO arithmetic; reverts WrongState off the Open state"
  - "WRAP-03 read-from-contract streamia PROVEN on the Base fork (6/6 green): READ-FIDELITY (recordStreamia()==getter longPremium slots, same call/same tick, RHS pinned to the long slot) + NON-ZERO FLOOR (rec0>0||rec1>0 after a ~2e31 price-up swap into the +2000 OTM chunk) + DIRECTIONAL/MONOTONIC (more fee-generating swaps => recorded strictly increases) + STATE-GATE PRE-OPEN (Uninitialized wrapper => recordStreamia() reverts WrongState)"
  - "LongGammaWrapper.streamia.tree — the WRAP-03 BTT spec (read-fidelity + non-zero + directional/monotonic + WrongState gate; NO cross-tick assertEq-vs-OptionBurnt leaf), committed BEFORE the recordStreamia() impl (Iron Law)"
  - "LongGammaWrapper.streamia.t.sol — 6/6 green on the Base fork; the post-Claimed state-gate leg is RELOCATED to 08-05 claimResidual.t.sol (close() UNIMPLEMENTED at wave 4 — Iron Law preserved)"
affects: [08-05-close-claim, 08-06-involuntary-branches, 08-07-invariants, 09-premium-split]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Streamia READ-FIDELITY proof (P1, never read-vs-formula): the test calls the SAME getter the wrapper calls, from the SAME tick, and asserts recordStreamia() == longPremium.rightSlot()/leftSlot() slot-for-slot (wei-exact, always true) — this IS the 'READ, never re-derived' proof; the discrimination against a shortPremium/wrong-leg/multiplier wrapper is carried by PINNING the correct-tokenId long slot on the RHS + the non-zero/monotonic checks + the P1 grep-guard, NOT by the equality alone"
    - "No cross-tick gate: recordStreamia reads longPremium at currentTick (PanopticPool L437/L445) while OptionBurnt.premiaByLeg is emitted atTick=0 under COMMIT_LONG_SETTLED (L1159-1161) — they diverge in general, so a gating assertEq(recorded, premiaByLeg) would REVERT and is deliberately absent (available-premium cap is short-branch-only L1186-1235, NOT the cause)"
    - "Swap-seeded streamia (Pitfall 2): block advance accrues nothing; price-UP swaps (zeroForOne=false, sell token1/cCOP) move feeGrowthInside across the seller's +2000 OTM chunk band — the up-direction is deep, ~2e31 crosses into the band (prototyped on the live fork)"
    - "Iron-Law relocation: the post-Claimed state-gate leg moved to 08-05 claimResidual.t.sol rather than pulling close() (UNIMPLEMENTED at wave 4) forward — full state-gate = 08-04 (pre-Open) + 08-05 (post-Claimed); no // TODO marker left behind"

key-files:
  created:
    - contracts/test/instrument/LongGammaWrapper.streamia.t.sol
  modified:
    - contracts/test/instrument/LongGammaWrapper.streamia.tree
    - contracts/src/instrument/LongGammaWrapper.sol

key-decisions:
  - "Post-Claimed state-gate leg RELOCATED to 08-05 (approved orchestrator decision). streamia.t.sol asserts ONLY the PRE-OPEN WrongState revert (Uninitialized wrapper); the post-Claimed leg depends on close()/claimResidual() which are UNIMPLEMENTED at wave 4 and whose trees live in 08-05 — pulling close() forward would break the evm-tdd Iron Law. Acceptance now enforces grep -c expectRevert == 1."
  - "READ-FIDELITY (recorded == getter's own slots, same call/tick) is the PRIMARY P1 'READ, never re-derived' proof — NOT a read-vs-formula and NOT a cross-tick read-vs-OptionBurnt.premiaByLeg comparison (which diverges: currentTick vs tick=0)."
  - "Streamia is non-zero only after price-UP swaps (sell token1/cCOP, zeroForOne=false) cross into the +2000 OTM chunk band; the up-direction is deep so ~2e31 is the prototyped crossing amount (Pitfall 2/4)."

patterns-established:
  - "Tree-before-impl Iron Law: streamia.tree (891c4e6) BEFORE recordStreamia() impl (c233b01) BEFORE streamia.t.sol (2d239a0) — ancestry-verified via git merge-base --is-ancestor x2."
  - "P1 streamia-constant grep-guard clear (SPREAD_MULTIPLIER/perBlock/streamiaPerBlock/VEGOID == 0) in BOTH the wrapper and the test; swap-seam grep-guard (panoptic-borrowed == 0) on both."
  - "OK_NO_BAD_GATE: no wei-exact assertEq-vs-settled/OptionBurnt gate; the lone OptionBurnt reference is a NatSpec note explaining why such a gate is invalid (non-gating)."

requirements-completed: [WRAP-03]

# Metrics
duration: 12min
completed: 2026-06-02
---

# Phase 8 Plan 04: LongGammaWrapper streamia READ (WRAP-03) Summary

**Implemented `LongGammaWrapper.recordStreamia()` — a zero-arithmetic passthrough READ of `getAccumulatedFeesAndPositionsData(...).longPremium` (rightSlot=token0, leftSlot=token1) gated to the Open state — and proved WRAP-03's read-from-contract streamia on the Base fork (6/6 green): READ-FIDELITY (recordStreamia() == the getter's own long slots, same call/same tick, RHS pinned to the long slot), NON-ZERO FLOOR after a ~2e31 price-up swap into the +2000 OTM chunk, DIRECTIONAL/MONOTONIC (more swaps => recorded strictly increases), and the PRE-OPEN WrongState state-gate — with NO cross-tick `assertEq`-vs-`OptionBurnt` gate and the P1 streamia-constant grep-guard clear in both the wrapper and the test.**

## Performance

- **Duration:** ~12 min (continuation: Tasks 1-2 pre-committed in a prior session; this run resolved the approved relocation in Task 3, re-ran every gate, and produced the docs)
- **Started:** 2026-06-02T20:55Z (approx, resume)
- **Completed:** 2026-06-02T21:04Z
- **Tasks:** 3 (Tasks 1-2 pre-existing + verified; Task 3 executed this run)
- **Files modified:** 3 (1 created this run, 2 modified across the plan)

## Accomplishments

- **Task 1 (verified — `891c4e6`):** `LongGammaWrapper.streamia.tree` — the WRAP-03 BTT spec naming read-fidelity + non-zero + directional/monotonic + the WrongState state-gate, with NO wei-exact-vs-OptionBurnt leaf. Committed BEFORE the impl (Iron Law).
- **Task 2 (verified — `c233b01`):** `recordStreamia() public view returns (uint128 streamia0, uint128 streamia1)` added to `LongGammaWrapper.sol` — reads `pool.getAccumulatedFeesAndPositionsData(address(this), true, [positionTokenId]).longPremium`, returns `rightSlot()`/`leftSlot()` with ZERO arithmetic, and reverts `WrongState` off the Open state (`if (state != State.Open) revert WrongState();` — the load-bearing state-gate line).
- **Task 3 (this run — `2d239a0`):** `LongGammaWrapper.streamia.t.sol` — `contract LongGammaWrapperStreamia is LongGammaWrapperBase`, three proofs delegated 1:1 from the bulloak branch fns: `test_streamia_readFidelity` (recordStreamia() == getter long slots same call/tick + non-zero floor after a ~2e31 price-up swap), `test_streamia_directionalMonotonic` (monotonic non-decreasing; strictly up after material swaps), `test_streamia_revertsWrongStateOffOpen` (PRE-OPEN Uninitialized => WrongState). **6/6 green on the live Base fork.**
- Read-fidelity RHS is pinned to the CORRECT-tokenId `longPremium` slot (`_getterLongPremium` re-reads via `IPanopticData` for `wrapper.positionTokenId()`), so a shortPremium/wrong-leg/multiplier wrapper diverges. Swap-seam grep-guard (`panoptic-borrowed`==0) and P1 streamia-constant guard (`SPREAD_MULTIPLIER`/`perBlock`/`streamiaPerBlock`==0) hold on both the wrapper and the test; `OK_NO_BAD_GATE` (no cross-tick assertEq-vs-settled).

## Task Commits

1. **Task 1: streamia.tree — BTT spec (tree-before-impl)** - `891c4e6` (test)
2. **Task 2: implement recordStreamia() — READ longPremium via IPanopticData** - `c233b01` (feat)
3. **Task 3: streamia.t.sol — fork test (read-fidelity + non-zero + directional + pre-Open WrongState), 6/6 green** - `2d239a0` (test)

Plan-revision commits between Task 2 and Task 3 (the approved relocation): `2980118` (relocate post-Claimed leg 08-04->08-05), `2fe37cd` (relocation-precision clarification).

## Files Created/Modified

- `contracts/test/instrument/LongGammaWrapper.streamia.tree` - WRAP-03 BTT spec (modified during plan-revision relocation; committed first as `891c4e6`)
- `contracts/src/instrument/LongGammaWrapper.sol` - `recordStreamia()` view added (`c233b01`)
- `contracts/test/instrument/LongGammaWrapper.streamia.t.sol` - fork test, 6/6 green (created this run, `2d239a0`)

## Decisions Made

- **Post-Claimed state-gate leg RELOCATED to 08-05 (approved orchestrator/user decision: "Relocate per DESIGN NOTE").** The on-disk test from the prior session still drove a `spent.close()` POST-OPEN-WINDOW leg — but `close()` reverts `"UNIMPLEMENTED"` at wave 4, so that leg was broken and pulling a real `close()` forward would break the evm-tdd Iron Law (impl ahead of its 08-05 tree). The leg was removed; `streamia.t.sol` now asserts ONLY the PRE-OPEN `WrongState` revert (a freshly-deployed Uninitialized wrapper). The full state-gate proof is delivered across 08-04 (pre-Open) + 08-05 (post-Claimed, in `claimResidual.t.sol` where `close()`/`claimResidual()` legitimately reach `Claimed`). Acceptance enforces `grep -c "expectRevert(LongGammaWrapper.WrongState.selector)" == 1`. No `// TODO(plan-05)` marker left behind.
- **READ-FIDELITY is the PRIMARY P1 proof, NOT read-vs-formula and NOT cross-tick read-vs-OptionBurnt.** `recordStreamia()` is compared slot-for-slot against the SAME getter at the SAME tick — wei-exact and always true, proving READ-FROM-CONTRACT. The previously-contemplated `assertEq(recorded, OptionBurnt.premiaByLeg)` is deliberately absent: `recordStreamia` reads `longPremium` at `currentTick` (PanopticPool L437/L445) while `premiaByLeg` is emitted atTick=0 under `COMMIT_LONG_SETTLED` (L1159-1161), so a gating equality would revert (the available-premium cap at L1186-1235 is short-branch-only — NOT the cause).
- **Streamia is non-zero only after price-UP swaps into the OTM chunk (Pitfall 2/4).** Block advance accrues nothing; selling token1/cCOP (`zeroForOne=false`) raises the price toward the seller's +2000 OTM chunk band, moving `feeGrowthInside`. The up-direction is deep (large cCOP reserves), so ~2e31 is the prototyped crossing amount.

## Deviations from Plan

None - plan executed exactly as written (post-relocation). Task 3's `<action>` and acceptance criteria were already edited by the approved relocation (`2980118`/`2fe37cd`) to require ONLY the pre-Open WrongState leg; this run implemented Task 3 to that edited spec. The only on-disk reconciliation was removing the stale POST-OPEN-WINDOW (`spent.close()`) block left over from the prior session — that removal is what the edited plan prescribes, not a deviation from it.

## Issues Encountered

- **Prior-session continuation reconciliation.** Tasks 1-2 commits (`891c4e6`/`c233b01`) and an on-disk-but-uncommitted `streamia.t.sol` already existed from a prior executor session. The uncommitted test still contained the POST-OPEN-WINDOW `close()` leg (the relocation blocker). This run verified the Task 1-2 commits, confirmed `close()` reverts `"UNIMPLEMENTED"` at wave 4, removed the broken leg per the approved relocation, re-ran every acceptance gate (grep guards + bulloak co-location + the fork suite), and committed Task 3. No rework of Tasks 1-2.

## User Setup Required

None - no external service configuration required. (`BASE_RPC_URL` already present in gitignored `contracts/.env`, resolved via `[rpc_endpoints] base`.)

## Next Phase Readiness

- WRAP-03's read-from-contract streamia is LOCKED and fork-proven. `recordStreamia()` is the binding streamia surface for Plans 05-07 and Phase 9's premium split.
- **08-05 inherits the post-Claimed state-gate obligation:** `claimResidual.t.sol` must add `test_claim_recordStreamiaRevertsPostClaimed` (recordStreamia() reverts `WrongState` once the wrapper reaches `Claimed`), completing the full state-gate across 08-04 + 08-05. 08-05 implements `close()`/`syncResidual()`/`claimResidual()` (all UNIMPLEMENTED at wave 4).
- 08-06 fills the three `dispatchFrom` involuntary branches; 08-07 implements the named fuzz invariants.
- `forge build` green; the streamia fork suite 6/6 green on the live Base fork; swap-seam + P1 grep-guards hold on both files; Iron-Law ancestry verified.

---
*Phase: 08-longgammawrapper-cash-flow*
*Completed: 2026-06-02*

## Self-Check: PASSED

All three artifact files (streamia.tree, streamia.t.sol, 08-04-SUMMARY.md) exist on disk; all three task commit hashes (`891c4e6` tree, `c233b01` impl, `2d239a0` test) are present in git history. Iron-Law ancestry verified (tree -> impl -> test via `git merge-base --is-ancestor`). `recordStreamia()` present in `LongGammaWrapper.sol`. Streamia fork suite 6/6 green on the live Base fork; `grep -c expectRevert == 1` (pre-Open only); no cross-tick assertEq-vs-OptionBurnt gate (`OK_NO_BAD_GATE`); P1 streamia-constant grep-guard == 0 in both src and test; swap-seam grep-guard (`panoptic-borrowed`) == 0 on both.
