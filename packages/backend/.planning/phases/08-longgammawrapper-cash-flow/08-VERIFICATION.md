---
phase: 08-longgammawrapper-cash-flow
verified: 2026-06-02T22:40:00Z
status: passed
score: 5/5 must-haves verified
re_verification: null
gaps: []
human_verification: []
---

# Phase 8: LongGammaWrapper cash-flow Verification Report

**Phase Goal:** A `LongGammaWrapper` owns a long-gamma position on the user's behalf — deposit upfront collateral → mint → streamia accrues (read from the contract) → burn closes → residual computed from *surviving* collateral at actual close, tolerating every involuntary-close branch (`forceExercise`, `settleLongPremium`, liquidation).
**Verified:** 2026-06-02T22:40Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (the 5 ROADMAP Success Criteria + the invariant gate)

| # | Truth | Status | Evidence |
| - | ----- | ------ | -------- |
| 1 | WRAP-01 — wrapper owns custody: `ct.balanceOf(wrapper)>0 && balanceOf(user)==0 && numberOfLegs(wrapper)>0`; superseding assertion (NO `positionIdList` getter) | ✓ VERIFIED | `open.t.sol` 5/5 green on live Base fork. Asserts `assertGt(ct0/1.balanceOf(wrapper),0)`, `assertEq(ct0/1.balanceOf(beneficiary),0)`, `numberOfLegs(wrapper)>0`, length-1 `PositionBalance[]` `positionSize>0` (open.t.sol L74-86). `positionIdList` appears ONLY in NatSpec NOTEs documenting it does NOT exist + the unrelated `positionIdListFrom` dispatchFrom caller-list param. |
| 2 | WRAP-02 — `isLong=1` mint via `IPanopticData` after a same-chunk seller seed | ✓ VERIFIED | `open.t.sol` `test_open_mintsLongGamma`: `assertEq(wrapper.positionTokenId().isLong(0),1)` (L97). Seller short seeded same-chunk (08-02 `LongGammaWrapperBase`, isLong=0 size≥long at STRIKE_OFFSET=2000). Pool reached only via `IPanopticData` (`pool.dispatch`, LongGammaWrapper.sol L187). |
| 3 | WRAP-03 — streamia READ (`longPremium`, never a constant; P1 grep-guard holds) + all THREE involuntary branches via `dispatchFrom` | ✓ VERIFIED | `recordStreamia()` is a pure passthrough of `getAccumulatedFeesAndPositionsData(...).longPremium` rightSlot/leftSlot, ZERO arithmetic (LongGammaWrapper.sol L307-315). `streamia.t.sol` 6/6 (read-fidelity + non-zero + monotonic + pre-Open WrongState). settleLong 2/2 (stays Open), forceExercise 2/2 (closes), liquidation 2/2 (closes) — all via `dispatchFrom`. P1 guard (SPREAD_MULTIPLIER/perBlock/VEGOID/streamiaPerBlock) == 0 in src + tests. |
| 4 | WRAP-04 — `close()` voluntary burn (SC-5) + `claimResidual()` residual from SURVIVING collateral, CEI + cap-aware + idempotent | ✓ VERIFIED | `close.t.sol` 6/6 (user-gated burn, NotUser, WrongState-off-Open). `claimResidual.t.sol` 7/7 incl. `test_burn_claimResidualFromSurvivingNotDeposit` + `test_claim_residualMovesWithFees`. CEI confirmed: `claimed` checked first (L262), then state/`_reconcile` BEFORE `_redeemCapped` (L264-275). Cap-aware + dust-guarded `_redeemCapped` (L285-295). Idempotent (`AlreadyClaimed` before state gate). Residual = `max(convertToAssets(balanceOf(wrapper)) − cost, 0)` (L269-272), never the deposit. |
| 5 | Two ROADMAP-named fuzz invariants exist, DISTINCT (single vs cumulative), NON-INVERTED + NON-TAUTOLOGICAL, and pass | ✓ VERIFIED | `invariant_residualNeverExceedsHoldings` (single `lastPaid` ≤ `preClaimSurviving`) + `invariant_userClaimsBackedByCollateral` (cumulative `totalPaid` ≤ `cumPreClaimSurviving`). Both pass under the Foundry fuzz runner on the Base fork, 0 reverts, lifecycle genuinely exercised (act_open/close/claim all fire). Compare two INDEPENDENT handler ledgers (payout-side vs pre-claim live snapshot) — never the deposit, never `max(surv-cost,0)≤surv`. Inverted-backing guard == 0; tautology guard == 0. |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `src/instrument/LongGammaWrapper.sol` | Full lifecycle impl (deposit/recordStreamia/close/syncResidual/_reconcile/claimResidual/_redeemCapped) | ✓ VERIFIED | 326 lines, all entrypoints substantive (no UNIMPLEMENTED reverts remain); imports only IPanopticData + ICostMeter + OZ IERC4626/IERC20 + @types value types (swap seam intact). |
| `src/instrument/interfaces/ICostMeter.sol` | External-meter seam | ✓ VERIFIED | Exists; `_costOf` zero-address⇒(0,0) wired (L322-325). |
| `src/instrument/interfaces/IPanopticData.sol` | +getOracleTicks extension | ✓ VERIFIED | Exists; panoptic-borrowed guard == 0. |
| `test/instrument/LongGammaWrapperBase.sol` + `helpers/V4SwapHelper.sol` | M-3 substrate + fee generator + same-chunk seller seed | ✓ VERIFIED | Both exist; seam-clean. |
| 8 `.tree` + matching `.t.sol` (open/streamia/close/claimResidual/settleLong/forceExercise/liquidation/invariants) | BTT specs + fork tests | ✓ VERIFIED | All 16 files present; 8-canonical-tree set complete. |
| `foundry.toml [invariant]` | CI fuzz floor | ✓ VERIFIED | runs=16, depth=16, fail_on_revert=false present. |

### Key Link Verification (wiring)

| From | To | Via | Status | Details |
| ---- | -- | --- | ------ | ------- |
| `deposit` | pool mint | `pool.dispatch(...,false,0)` | WIRED | isLong=1 minted, wrapper holds 4626 shares (`ct.deposit(assets, address(this))`). |
| `recordStreamia` | pool accounting | `getAccumulatedFeesAndPositionsData(...).longPremium` | WIRED | Pure READ, no constant. |
| `close` | pool burn | `pool.dispatch(size 0)` + `numberOfLegs==0` require | WIRED | User-gated; SC-5 trapped-funds path closed. |
| `_reconcile` | involuntary-close detection | `state==Open && numberOfLegs==0 ⇒ Closed` | WIRED | Shared enabler consumed by all 3 involuntary branches (forceExercise/liquidation promote; settle stays Open). |
| `claimResidual` | user payout | `_redeemCapped → ct.redeem(shares, user, address(this))` | WIRED | CEI; surviving-derived; cap-aware; idempotent. |
| invariants | live state | handler ledgers vs `convertToAssets(balanceOf(wrapper))` | WIRED | Independent reads; non-vacuous (mutation-proven per 08-07). |

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
| ----------- | -------------- | ----------- | ------ | -------- |
| WRAP-01 | 08-01, 08-03 | User deposits upfront collateral; wrapper owns position | ✓ SATISFIED | open.t.sol 5/5; superseding custody form fork-proven. |
| WRAP-02 | 08-01, 08-02, 08-03 | Wrapper mints long-gamma (`isLong`) on cCOP/USDC | ✓ SATISFIED | isLong(0)==1 fork-proven against same-chunk seller seed. |
| WRAP-03 | 08-01, 08-02, 08-04, 08-06, 08-07 | Streamia accrues (read from contract) incl. 3 involuntary branches | ✓ SATISFIED | streamia 6/6 (READ) + settleLong/forceExercise/liquidation 2/2 each. |
| WRAP-04 | 08-01, 08-05, 08-07 | Burn closes + residual from surviving collateral at actual close | ✓ SATISFIED | close 6/6 + claimResidual 7/7; residual from surviving not deposit. |

All four WRAP IDs declared across plan frontmatter are accounted for and their REQUIREMENTS.md "Complete" status matches the fork-proven reality. No orphaned requirements (REQUIREMENTS.md maps only WRAP-01..04 to Phase 8).

### Domain Non-Negotiables (CLAUDE.md)

| Non-negotiable | Status | Evidence |
| -------------- | ------ | -------- |
| Streamia READ-from-contract (P1, never a constant) | ✓ HONORED | `recordStreamia` pure passthrough; SPREAD_MULTIPLIER/perBlock/VEGOID/streamiaPerBlock grep == 0 in src + tests. |
| Swap seam intact (no borrowed concrete) | ✓ HONORED | `panoptic-borrowed` grep == 0 across all src/instrument + test/instrument wrapper files; pool only via IPanopticData, collateral only via IERC4626/IERC20. |
| BUSL fork-only | ✓ HONORED | All wrapper tests run `--fork-url $BASE_RPC_URL`; no mocked pool. |
| evm-tdd Iron Law (tree-before-impl) | ✓ HONORED | `git merge-base --is-ancestor` PASS for all 6 units: open (ba0fc57→afe9b75), streamia (891c4e6→c233b01), close+claim (fb85a98→e967f88), involuntary (2c0ef11→cfea71a/53adf7d), invariants (7ec4a1f→2c5b5ef). |

### Fork Suite Results (live Base fork, run separately with backoff)

| Suite | Result |
| ----- | ------ |
| open | 5 passed, 0 failed |
| streamia | 6 passed, 0 failed |
| close | 6 passed, 0 failed |
| claimResidual | 7 passed, 0 failed |
| settleLong | 2 passed, 0 failed |
| forceExercise | 2 passed, 0 failed |
| liquidation | 2 passed, 0 failed |
| invariant_userClaimsBackedByCollateral (fuzz) | 1 passed, 0 reverts (act_open 36 / act_close 53 / act_claim 50) |
| invariant_residualNeverExceedsHoldings (fuzz) | 1 passed, 0 reverts (act_open 62 / act_close 50 / act_claim 47) |

**Total: 30/30 unit fork tests + 2/2 fuzz invariants green.** No fabricated greens — re-run live this verification.

### Anti-Patterns Found

None. No UNIMPLEMENTED reverts remain in the wrapper; no placeholder returns; all entrypoints substantive and wired. `forge build` exit 0 (one ERC20-unchecked-transfer lint info only, non-blocking).

### Human Verification Required

None — every must-have is programmatically fork-proven.

### Gaps Summary

No gaps. The codebase DELIVERS the Phase-8 goal end-to-end: wrapper-owns custody (superseding form), isLong=1 mint, streamia READ, all three involuntary-close branches, voluntary close + surviving-collateral residual (CEI/cap-aware/idempotent), and both distinct non-inverted non-tautological fuzz invariants — all green on the live Base fork, with the swap seam, P1, inverted-backing, and tautology grep-guards all == 0 and the evm-tdd Iron Law ancestry intact for every unit.

---

_Verified: 2026-06-02T22:40Z_
_Verifier: Claude (gsd-verifier)_
