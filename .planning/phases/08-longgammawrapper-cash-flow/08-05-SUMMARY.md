---
phase: 08-longgammawrapper-cash-flow
plan: 05
subsystem: contracts
tags: [solidity, panoptic-v2, erc4626, residual, close, claimResidual, syncResidual, cei, cap-aware-redeem, bulloak, btt, foundry, base-fork]

# Dependency graph
requires:
  - phase: 08-longgammawrapper-cash-flow
    plan: 02
    provides: LongGammaWrapperBase (M-3 deploy isolation + seeded same-chunk seller short + _closeSellerShort), V4SwapHelper, _longTokenId/_oneLegArgs/LONG_SIZE/TICK_LIMIT_*/EFF_LIQ_LIMIT
  - phase: 08-longgammawrapper-cash-flow
    plan: 03
    provides: LongGammaWrapper.deposit(address,uint256,uint256,TokenId,uint128,int24[3]) LOCKED 6-arg open entrypoint; State machine; positionTokenId/deposited0-1/lastSurviving0-1 storage; _costOf() zero-address convention
  - phase: 08-longgammawrapper-cash-flow
    plan: 04
    provides: recordStreamia() Open-gated READ; the post-Claimed state-gate obligation inherited HERE
provides:
  - "LongGammaWrapper.close() IMPLEMENTED — user-gated (NotUser) voluntary burn via pool.dispatch(size 0, false, 0); requires numberOfLegs(wrapper)==0; Open->Closed (closes the trapped-funds path, ROADMAP SC-5 / review BLOCKER N1)"
  - "LongGammaWrapper._reconcile() internal + syncResidual() permissionless poke — re-reads surviving, emits ResidualEroded on per-interval drop, last-observation checkpoint, AND promotes Open->Closed on numberOfLegs==0 (the involuntary-close detection authored here, the shared enabler for the Plan-06 forceExercise/liquidation branches)"
  - "LongGammaWrapper.claimResidual() IMPLEMENTED — caller-agnostic, CEI (claimed+state+_reconcile BEFORE redeem), per-token residual = max(convertToAssets(balanceOf(wrapper)) - _costOf_i, 0), cap-aware + dust-guarded _redeemCapped to the stored user, idempotent (AlreadyClaimed checked BEFORE the state gate); NO streamia double-count (Pattern 7)"
  - "LongGammaWrapper.close.tree + claimResidual.tree — the WRAP-04 BTT specs, committed BEFORE the impl (Iron Law)"
  - "LongGammaWrapper.close.t.sol 6/6 + LongGammaWrapper.claimResidual.t.sol 7/7 green on the Base fork; the relocated 08-04 post-Claimed state-gate leg (recordStreamia reverts WrongState post-Claimed) lives + passes here"
affects: [08-06-involuntary-branches, 08-07-invariants, 09-premium-split]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "CEI claimResidual: effects (claimed=true, state=Claimed, _reconcile) run BEFORE the only interaction (redeem); idempotency guard `claimed` checked BEFORE the `state != Closed` gate so a second claim reverts AlreadyClaimed (not WrongState — the first claim already set Closed->Claimed)"
    - "Cap-aware + dust-guarded redeem (_redeemCapped): shares = min(previewWithdraw(residual), maxRedeem(wrapper)); guarded by `if (previewRedeem(shares)==0) return 0;` (BelowMinimumRedemption L833) and `if (shares==0) return 0;` (cap fully binding) so the claim NEVER reverts — any un-redeemable remainder stays as shares (B4)"
    - "Shared _reconcile() factored INTERNAL (no modifier) so both syncResidual() and claimResidual() (each nonReentrant) call it without tripping the guard twice; the Open->Closed promotion lives here as the involuntary-close detection enabler for Plan-06"
    - "Double-count avoided (Pattern 7): the ONLY wrapper-side deduction is _costOf() ((0,0) for the v1 zero-address meter); streamia + commission are already netted into the share balance by settleBurn"
    - "Price-impact gate clearance for the burn: a big fee-seeding up-swap (~2e31 cCOP) moves spot far above the oracle median, so the voluntary close() burn trips PriceImpactTooLarge (current-vs-median tick delta > 2*tickDeltaLiquidation, PanopticPool L679-682). A calibrated restore swap (4e15 USDC, zeroForOne=true) returns spot to ~+309 ticks of the start tick (359268) so the burn clears; feeGrowthInside stays accrued (cumulative — the round-trip does NOT un-accrue it)"

key-files:
  created:
    - contracts/test/instrument/LongGammaWrapper.close.tree
    - contracts/test/instrument/LongGammaWrapper.claimResidual.tree
    - contracts/test/instrument/LongGammaWrapper.close.t.sol
    - contracts/test/instrument/LongGammaWrapper.claimResidual.t.sol
  modified:
    - contracts/src/instrument/LongGammaWrapper.sol

key-decisions:
  - "claimResidual checks `claimed` BEFORE the `state != Closed` gate (deviation from the plan's literal snippet, Rule-1 correctness): the first claim sets state=Claimed, so a state-first ordering would make the second claim revert WrongState instead of the intended AlreadyClaimed. The tree leaf + behavior spec both mandate AlreadyClaimed on a second claim."
  - "WRAP-04 residual is proven to track surviving collateral NOT the deposit via TWO independent signals: (a) the primary proof perturbs fees, closes, and pays a surviving-derived figure bounded by surviving (assertLe(paid, surviving+1)); (b) test_claim_residualMovesWithFees asserts surviving-at-close DIVERGES from the stored `deposited` (streamia settled into the share balance at the burn, Pattern 7), and surviving <= deposit (streamia is a debit, never a credit on the long)."
  - "The seeded seller short is closed via _closeSellerShort() BEFORE the wrapper's claim to free the pool-wide maxRedeem cap (s_depositedAssets-1, B4); the cap-aware + dust-guarded redeem means even if the cap still binds the claim never reverts (remainder stays as shares — Manual-Only fallback honored but not needed: a positive surviving-derived payout landed)."

patterns-established:
  - "Tree-before-impl Iron Law: close.tree + claimResidual.tree (fb85a98) BEFORE the close()/syncResidual()/claimResidual() impl (e967f88) BEFORE the .t.sol files (8c4f422) — ancestry-verified via git merge-base --is-ancestor x2."
  - "Swap-seam grep-guard (panoptic-borrowed == 0) + P1 streamia-constant guard (SPREAD_MULTIPLIER/perBlock/streamiaPerBlock/VEGOID == 0) hold on BOTH new test files and the wrapper."
  - "bulloak 0.9.2 same-dir full-stem co-location clean for both trees (close.tree<->close.t.sol, claimResidual.tree<->claimResidual.t.sol); `bulloak check` reports no issues."

requirements-completed: [WRAP-04]

# Metrics
duration: 11min
completed: 2026-06-02
---

# Phase 8 Plan 05: LongGammaWrapper voluntary exit (close + claimResidual) Summary

**Implemented the voluntary-exit cash-flow — `close()` (user-gated voluntary burn via `pool.dispatch` size->0, the mandatory entrypoint closing the trapped-funds path / ROADMAP SC-5), `_reconcile()`/`syncResidual()` (permissionless erosion reconciliation + the Open->Closed involuntary-close-detection promotion that also enables Plan-06), and `claimResidual()` (caller-agnostic, CEI, cap-aware per-token residual from surviving collateral paid to the stored user, idempotent) — and fork-proved WRAP-04 on Base: residual tracks surviving collateral at actual close (never the deposit), 6/6 + 7/7 green, with the relocated 08-04 post-Claimed state-gate leg verified here.**

## Performance

- **Duration:** ~11 min
- **Started:** 2026-06-02T21:10Z
- **Completed:** 2026-06-02T21:21Z
- **Tasks:** 3
- **Files modified:** 5 (4 created, 1 modified)

## Accomplishments

- **Task 1 (`fb85a98`):** `close.tree` + `claimResidual.tree` — the WRAP-04 BTT specs (user-gated burn + CEI cap-aware surviving residual), both bulloak 0.9.2 PARSE_OK, committed as ONE commit BEFORE any impl (Iron Law).
- **Task 2 (`e967f88` + `44984e5`):** `close()`/`syncResidual()`/`_reconcile()`/`claimResidual()`/`_redeemCapped()` implemented. `close()` is user-gated (NotUser), reverts WrongState off Open, dispatches the size-0 burn (false/0 voluntary args), requires numberOfLegs->0, sets Closed. `_reconcile()` re-reads surviving, emits ResidualEroded on a per-interval drop, last-observation re-checkpoints, and promotes Open->Closed on numberOfLegs==0 (involuntary-close detection — the Plan-06 enabler). `claimResidual()` is CEI (claimed+state+_reconcile before redeem), computes per-token `max(surviving - _costOf, 0)`, redeems cap-aware + dust-guarded to the stored user, idempotent. All three nonReentrant; seam intact (panoptic-borrowed==0); forge build green. The follow-up `44984e5` reorders the idempotency check (`claimed` before the state gate) so a second claim reverts AlreadyClaimed.
- **Task 3 (`8c4f422`):** `close.t.sol` (6/6) + `claimResidual.t.sol` (7/7) green on the live Base fork. Primary WRAP-04 proof: open -> seed fees -> restore price -> user `close()` -> `_closeSellerShort()` (free the cap, B4) -> random-caller `claimResidual()` pays the stored user a surviving-bounded figure; second claim reverts AlreadyClaimed. Plus WrongState-while-Open, surviving-diverges-from-deposit, and the RELOCATED post-Claimed streamia state-gate leg (`recordStreamia()` reverts WrongState once Claimed). No regression on open (5/5) or streamia (6/6).

## Task Commits

1. **Task 1: close.tree + claimResidual.tree (tree-before-impl)** - `fb85a98` (test)
2. **Task 2: implement close() + syncResidual()/_reconcile() + claimResidual()** - `e967f88` (feat)
3. **Task 2 fix: claimed-before-state idempotency ordering** - `44984e5` (fix)
4. **Task 3: close.t.sol + claimResidual.t.sol (6/6 + 7/7 green)** - `8c4f422` (test)

## Files Created/Modified

- `contracts/test/instrument/LongGammaWrapper.close.tree` - BTT spec for the user-gated voluntary burn (created)
- `contracts/test/instrument/LongGammaWrapper.claimResidual.tree` - BTT spec for the surviving-collateral residual payout (created)
- `contracts/src/instrument/LongGammaWrapper.sol` - close()/syncResidual()/_reconcile()/claimResidual()/_redeemCapped() implemented (modified)
- `contracts/test/instrument/LongGammaWrapper.close.t.sol` - fork test, 6/6 green (created)
- `contracts/test/instrument/LongGammaWrapper.claimResidual.t.sol` - fork test, 7/7 green (created)

## Decisions Made

- **`claimed` is checked BEFORE the `state != Closed` gate in `claimResidual()`** (Rule-1 correctness deviation from the plan's literal snippet). The first claim sets `state = Claimed`, so a state-first ordering makes a second claim revert `WrongState`; the tree leaf and behavior spec both require `AlreadyClaimed`. Reordering surfaces the intended idempotency error without weakening the state gate (a non-claimed wrapper still must be Closed to claim).
- **WRAP-04 "tracks surviving not deposit" proven by two signals.** (a) The primary proof pays a surviving-bounded figure (`assertLe(paid, surviving+1)`) to the stored user after perturbing fees; (b) `test_claim_residualMovesWithFees` asserts surviving-at-close DIVERGES from the stored `deposited` (the long's streamia settled into the 4626 share balance at the burn, Pattern 7) and `surviving <= deposit`. The originally-planned "two swaps move surviving" signal was replaced because a swap alone does not move the wrapper's `convertToAssets(balanceOf)` — the divergence materializes at the burn/settle, which the new assertion captures directly.
- **Price-impact gate clearance for the burn.** The ~2e31 cCOP fee-seeding up-swap moves spot to tick 361250 (start 359268), but a later `close()` burn trips `PriceImpactTooLarge` because the cumulative current-vs-median tick delta exceeds `2*tickDeltaLiquidation` only after the price drifts far. A calibrated restore swap (`4e15` USDC, `zeroForOne=true`) returns spot to ~359577 (+309 of start), clearing the gate; the seller's in-range chunk keeps its accrued `feeGrowthInside` (cumulative — the round-trip does not un-accrue it), so surviving still diverges from the deposit.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Idempotency check ordering in `claimResidual()`**
- **Found during:** Task 3 (the second-claim tree leaf)
- **Issue:** The plan's literal snippet checks `state != State.Closed` BEFORE `claimed`. Because the first claim sets `state = Claimed`, a second claim reverted `WrongState` instead of the intended `AlreadyClaimed`.
- **Fix:** Moved the `if (claimed) revert AlreadyClaimed();` check ABOVE the `state != Closed` gate.
- **Files modified:** contracts/src/instrument/LongGammaWrapper.sol
- **Commit:** `44984e5`

**2. [Rule 3 - Blocking] `PriceImpactTooLarge` on the voluntary burn after the fee-seeding swap**
- **Found during:** Task 3 (the primary claim proof + the post-Claimed leg)
- **Issue:** The ~2e31 up-swap that seeds fees leaves spot far above the oracle median, so the `close()` burn's cumulative tick-delta check (`PanopticPool` L679-682) reverts `PriceImpactTooLarge`. The plan's suggested `swapExactIn(poolKey, true, -int256(1e9))` perturbation was both wrong-magnitude and did not address the gate.
- **Fix:** Added a calibrated `_restorePrice(4e15)` USDC down-swap (prototyped against the live fork: start tick 359268 -> restore lands 359577) before each `close()`, returning spot near the median so the burn clears. The accrued fee growth stays in the seller's chunk (cumulative), so surviving still diverges from the deposit.
- **Files modified:** contracts/test/instrument/LongGammaWrapper.claimResidual.t.sol
- **Commit:** `8c4f422`

**3. [Rule 1 - Bug] `residualMovesWithFees` premise corrected**
- **Found during:** Task 3
- **Issue:** The planned "open one wrapper, swap small then large, assert surviving CHANGES" did not hold — a swap alone does not move the wrapper's `convertToAssets(balanceOf)` (fees accrue to the seller's chunk; the wrapper's surviving only shifts at the burn/settle).
- **Fix:** Rewrote the test to assert surviving-AT-CLOSE diverges from the stored `deposited` (the substantive "tracks surviving not deposit" signal, Pattern 7) and `surviving <= deposit`.
- **Files modified:** contracts/test/instrument/LongGammaWrapper.claimResidual.t.sol
- **Commit:** `8c4f422`

No authentication gates occurred. The Manual-Only cap-binding fallback was honored in the assertions but did not trigger — a positive surviving-derived payout landed after `_closeSellerShort()`.

## Issues Encountered

- **`PriceImpactTooLarge` gate (resolved).** See Deviation 2 — the burn's cumulative tick-delta check required a calibrated price restore before `close()`. Bracketed against the live fork (1e16 USDC -> tick 353060; 4e15 -> 359577 near the 359268 start) to land inside the `2*tickDeltaLiquidation` window. Three throwaway diagnostic test files were used and deleted before any commit.

## User Setup Required

None - no external service configuration required. (`BASE_RPC_URL` already present in gitignored `contracts/.env`, resolved via `[rpc_endpoints] base`.)

## Next Phase Readiness

- WRAP-04 is fork-proven: `close()` closes the trapped-funds path (SC-5), `claimResidual()` pays a surviving-collateral-derived residual (never the deposit) to the stored user, CEI + nonReentrant + cap-aware + idempotent.
- **The `_reconcile()` Open->Closed promotion authored here is the shared enabler for 08-06's three `dispatchFrom` involuntary branches** (forceExercise/settleLongPremium/liquidation) — an involuntary close drops numberOfLegs without running wrapper code, and the promotion makes claimResidual reconcilable after it.
- The full WRAP-03 state-gate is now complete across 08-04 (pre-Open) + 08-05 (post-Claimed).
- 08-07 implements the named fuzz invariants (`invariant_userClaimsBackedByCollateral`, `invariant_residualNeverExceedsHoldings`).
- `forge build` green; close 6/6 + claimResidual 7/7 + open 5/5 + streamia 6/6 green on the live Base fork; swap-seam + P1 grep-guards hold; Iron-Law ancestry verified.

---
*Phase: 08-longgammawrapper-cash-flow*
*Completed: 2026-06-02*

## Self-Check: PASSED

All four artifact files (close.tree, claimResidual.tree, close.t.sol, claimResidual.t.sol) + the modified LongGammaWrapper.sol + the SUMMARY exist on disk; all four commit hashes (`fb85a98` trees, `e967f88` impl, `44984e5` idempotency fix, `8c4f422` tests) are present in git history. Iron-Law ancestry verified (trees -> impl -> tests via git merge-base --is-ancestor). close.t.sol 6/6 + claimResidual.t.sol 7/7 green on the live Base fork (incl. the relocated test_claim_recordStreamiaRevertsPostClaimed); open 5/5 + streamia 6/6 not regressed. Swap-seam grep-guard (panoptic-borrowed) == 0 + P1 streamia-constant guard == 0 on both new files and the wrapper. bulloak check co-location clean for both trees. forge build exit 0.
