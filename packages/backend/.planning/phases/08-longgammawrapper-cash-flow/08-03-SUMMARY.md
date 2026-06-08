---
phase: 08-longgammawrapper-cash-flow
plan: 03
subsystem: contracts
tags: [solidity, panoptic-v2, erc4626, custody, long-gamma, swap-seam, bulloak, btt, foundry, base-fork]

# Dependency graph
requires:
  - phase: 08-longgammawrapper-cash-flow
    plan: 01
    provides: LongGammaWrapper skeleton (state machine + deposit stub + events/errors), ICostMeter seam, IPanopticData.getOracleTicks
  - phase: 08-longgammawrapper-cash-flow
    plan: 02
    provides: LongGammaWrapperBase (M-3 deploy isolation + seeded same-chunk seller short), V4SwapHelper, _longTokenId/_oneLegArgs/_closeSellerShort/LONG_SIZE/TICK_LIMIT_LOW/HIGH/EFF_LIQ_LIMIT
provides:
  - "LongGammaWrapper.deposit(address,uint256,uint256,TokenId,uint128,int24[3]) IMPLEMENTED: pull collateral, ct.deposit AS THE WRAPPER (shares to address(this)), mint isLong=1 via pool.dispatch(false,0), record ledger + last-observation checkpoints, Uninitialized->Open, emit PositionOpened"
  - "WRAP-01 custody PROVEN on the Base fork: ct.balanceOf(wrapper)>0 && ct.balanceOf(user)==0 && numberOfLegs(wrapper)>0 && a length-1 PositionBalance[] with positionSize>0 (NO positionIdList getter)"
  - "WRAP-02 long mint PROVEN: stored positionTokenId.isLong(0)==1, minted against the seeded same-chunk seller short, pool reached only via IPanopticData"
  - "LongGammaWrapper.open.tree — the WRAP-01/02 BTT spec, committed BEFORE the impl (Iron Law)"
  - "LongGammaWrapper.open.t.sol — 5/5 green on the Base fork; one-shot second-deposit reverts WrongState"
affects: [08-04-streamia, 08-05-close-claim, 08-06-involuntary-branches, 08-07-invariants, 09-premium-split]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Wrapper-owns-everything custody (P2): ct.deposit(assets, address(this)) routes 4626 shares to the wrapper; dispatch keys s_positionBalance to msg.sender==wrapper; the user holds nothing"
    - "deposit() signature carries the long-leg params (longId, longSize, limits) so the swap seam holds — the wrapper cannot read the seller's chunk on its own; the caller (which knows the seeded chunk) supplies them"
    - "ct.asset() (OZ IERC4626) yields the underlying token without a concrete token0()/token1() call — seam-preserving collateral pull"
    - "bulloak-branch-fn delegation: each tree leaf fn delegates to one shared open-flow proof (1:1 BTT mapping, mirroring PanopticDataSeam.fork.t.sol)"

key-files:
  created:
    - contracts/test/instrument/LongGammaWrapper.open.tree
    - contracts/test/instrument/LongGammaWrapper.open.t.sol
  modified:
    - contracts/src/instrument/LongGammaWrapper.sol

key-decisions:
  - "deposit() signature SUPERSEDED the Plan-01 3-arg stub to deposit(address,uint256,uint256,TokenId,uint128,int24[3]) — the long-leg chunk params are caller-supplied to keep the swap seam intact (the wrapper has no view of the seller's chunk). This signature is now LOCKED for all downstream plans."
  - "Over-funded collateral cap (P3): the test deposits type(uint104).max of BOTH tokens so the 18-dp tracker can back a 1-ether long without NotEnoughTokens — deposit is an over-funded cap, never a precise quote."
  - "Custody proven via numberOfLegs(wrapper)>0 + a length-1 PositionBalance[] from getAccumulatedFeesAndPositionsData (positionSize>0), NOT the non-existent positionIdList(address) getter — the ROADMAP SC-1 wording is superseded by RESEARCH correction #1."

patterns-established:
  - "Tree-before-impl Iron Law: open.tree committed (ba0fc57) BEFORE the deposit() impl commit (afe9b75) BEFORE open.t.sol (a31f93e) — ancestry-verified."
  - "Swap seam intact on the wrapper AND the test: grep -c panoptic-borrowed == 0 on both; pool reached only via IPanopticData, collateral only via IERC4626/IERC20."
  - "P1 streamia-constant guard clear: no SPREAD_MULTIPLIER/perBlock/streamiaPerBlock/VEGOID in the wrapper."

requirements-completed: [WRAP-01, WRAP-02]

# Metrics
duration: 20min
completed: 2026-06-02
---

# Phase 8 Plan 03: LongGammaWrapper open lifecycle (deposit -> mint custody) Summary

**Implemented `LongGammaWrapper.deposit()` — pull the user's collateral, deposit it to ct0/ct1 AS THE WRAPPER (4626 shares to address(this)), and mint a long-gamma `isLong=1` position via `pool.dispatch(false,0)` against the seeded same-chunk seller short — then proved WRAP-01 (wrapper-owns custody) + WRAP-02 (long mint) on the Base fork with 5/5 green, custody read via `numberOfLegs` + a length-1 `PositionBalance[]` (no `positionIdList` getter), swap seam + P1 guards intact.**

## Performance

- **Duration:** ~20 min (incl. independent re-verification of a prior session's commits)
- **Started:** 2026-06-02T16:30Z (approx)
- **Completed:** 2026-06-02T16:50Z
- **Tasks:** 3
- **Files modified:** 3 (2 created, 1 modified)

## Accomplishments
- `LongGammaWrapper.deposit(address _user, uint256 assets0, uint256 assets1, TokenId longId, uint128 longSize, int24[3] limits)` IMPLEMENTED: one-shot `WrongState` guard, `transferFrom`+`approve`+`ct.deposit(assets, address(this))` so the wrapper owns the 4626 shares, `pool.dispatch(list, finalIds, sizes, lim, false, 0)` minting `isLong=1` against the same-chunk seller short, ledger + last-observation `lastSurviving0/1` checkpoints, `Uninitialized->Open`, `PositionOpened` emit.
- `LongGammaWrapper.open.tree` — the WRAP-01/02 BTT spec (deposit->mint custody + one-shot second-deposit revert), committed FIRST (Iron Law).
- `LongGammaWrapper.open.t.sol` — extends `LongGammaWrapperBase`, deploys the wrapper against the seam handles, opens the long, and asserts the full WRAP-01 custody surface + WRAP-02 long-mint surface; **5/5 green on the live Base fork**.
- Swap seam preserved end-to-end: `grep -c panoptic-borrowed == 0` on both the wrapper and the test; the wrapper reaches collateral only via `IERC4626`/`IERC20` (`ct.asset()` for the underlying) and the pool only via `IPanopticData`. P1 streamia-constant guard clear.

## Task Commits

Each task was committed atomically (executed in a prior session that died before docs; this run independently re-verified every gate before producing the docs):

1. **Task 1: LongGammaWrapper.open.tree — BTT spec (tree-before-impl)** - `ba0fc57` (test)
2. **Task 2: implement LongGammaWrapper.deposit() — wrapper-owns custody + long mint** - `afe9b75` (feat)
3. **Task 3: LongGammaWrapper.open.t.sol — fork test (WRAP-01 custody + WRAP-02 long mint)** - `a31f93e` (test)

**Plan metadata:** (see final docs commit)

## Files Created/Modified
- `contracts/test/instrument/LongGammaWrapper.open.tree` - BTT spec for deposit->mint custody (created)
- `contracts/src/instrument/LongGammaWrapper.sol` - deposit() implemented (3-arg stub -> 6-arg locked signature) (modified)
- `contracts/test/instrument/LongGammaWrapper.open.t.sol` - fork test asserting wrapper-owns custody + long mint (created)

## Decisions Made
- **deposit() signature extended (LOCKED going forward).** The Plan-01 3-arg stub `deposit(address,uint256,uint256)` was superseded by the 6-arg form carrying the long-leg chunk params (`longId`, `longSize`, `limits`). The wrapper reaches the pool only through `IPanopticData` and so cannot read the seller's seeded chunk on its own — the caller (the test, which knows the chunk) supplies them. This keeps the swap seam intact and is now the binding signature for Plans 04–07. The plan itself prescribed this signature change.
- **Custody read via `numberOfLegs` + length-1 `PositionBalance[]`** (positionSize>0), not the non-existent `positionIdList(address)` getter — RESEARCH correction #1; the ROADMAP SC-1 literal is superseded.
- **Over-funded collateral cap (P3):** the test deposits `type(uint104).max` of both tokens so the 18-dp cCOP tracker can back the 1-ether long without `NotEnoughTokens`.

## Deviations from Plan

None - plan executed exactly as written. All three tasks were implemented per the plan's literal `<action>` blocks (the prescribed 6-arg `deposit` signature, the exact `ct0.deposit(assets0, address(this))` / `pool.dispatch(..., false, 0)` calls, and the WRAP-01/02 assertion set), and every acceptance-criteria gate passes unmodified.

## Issues Encountered
- **Prior-session socket death before docs (continuation reconciliation).** The three task commits (`ba0fc57`/`afe9b75`/`a31f93e`) and all three on-disk artifacts already existed from a prior executor session that died before writing the SUMMARY or updating STATE/ROADMAP — the same pattern as the 11-02 continuation. Rather than redo the work, this run independently re-verified every acceptance gate against the live toolchain before producing the docs: Iron-Law commit ancestry (tree->impl->test, `git merge-base --is-ancestor` PASS x2), `bulloak scaffold ... PARSE_OK` + `bulloak check` co-location clean + tree grep-count==3, seam grep-guards==0 on both files, P1 streamia-constant guard clear, `forge build` exit 0, and `forge test --match-path test/instrument/LongGammaWrapper.open.t.sol --fork-url $BASE_RPC_URL` = **5 passed, 0 failed** (incl. `test_open_wrapperOwnsCollateralAndPosition` WRAP-01 and `test_open_mintsLongGamma` WRAP-02). Clean working tree confirmed (no uncommitted artifact changes).

## User Setup Required
None - no external service configuration required. (`BASE_RPC_URL` already present in gitignored `contracts/.env`, resolved via `[rpc_endpoints] base`.)

## Next Phase Readiness
- The wrapper's `open` leg is LOCKED and fork-proven. The 6-arg `deposit(address,uint256,uint256,TokenId,uint128,int24[3])` signature is the binding entrypoint for all downstream plans.
- Plan 04 (`streamia`) extends the same base, opens via this `deposit`, then drives the `V4SwapHelper` to land the OTM chunk in fee-range and READ `longPremium` (Pitfall 4: prototype the swap amount+direction that makes the premium non-zero/observable).
- Plans 05–06 fill `close`/`syncResidual`/`claimResidual` + the three `dispatchFrom` involuntary branches; Plan 07 implements the named fuzz invariants.
- `forge build` green; the Phase-7 + 08-03 fork tests green; swap-seam + P1 grep-guards hold.

---
*Phase: 08-longgammawrapper-cash-flow*
*Completed: 2026-06-02*

## Self-Check: PASSED

All three artifact files + the SUMMARY exist on disk; all three task commit hashes (`ba0fc57`, `afe9b75`, `a31f93e`) are present in git history. Iron-Law ancestry verified (tree->impl->test). `forge build` green; `open.t.sol` 5/5 green on the live Base fork; swap-seam + P1 grep-guards == 0.
