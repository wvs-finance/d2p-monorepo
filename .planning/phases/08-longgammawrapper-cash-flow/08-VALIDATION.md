---
phase: 8
slug: longgammawrapper-cash-flow
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-02
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Authority: `08-RESEARCH.md` §Validation Architecture (read-from-contract streamia; dispatchFrom involuntary-close branches).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Foundry `forge` (fork) + `bulloak` 0.9.2 (BTT scaffolding) |
| **Config file** | `contracts/foundry.toml` (single `cancun`/`0.8.24`, non-viaIR, optimizer 200) |
| **Quick run command** | `cd contracts && forge test --match-path "test/instrument/LongGammaWrapper*.t.sol" --fork-url "$BASE_RPC_URL"` |
| **Full suite command** | `cd contracts && forge test --fork-url "$BASE_RPC_URL"` |
| **BTT per-file check** | `cd contracts && bulloak check test/instrument/LongGammaWrapper.<unit>.tree` (per file; full-glob is a non-gate per 07-03/04/05) |
| **Estimated runtime** | ~30–120 s (fork + swaps) |

> Export the RPC first: `cd contracts && set -a; . .env; set +a`. Fork at `BASE_FORK_BLOCK = 46700000`, chain-id 8453. Co-locate each `.tree` with its `.t.sol` (bulloak 0.9.2 same-dir rule).

---

## Sampling Rate

- **After every task commit:** `forge test --match-path "test/instrument/LongGammaWrapper.<unit>.t.sol" --fork-url "$BASE_RPC_URL"` + `bulloak check` for that unit's tree
- **After every plan wave:** `forge test --match-path "test/instrument/LongGammaWrapper*.t.sol" --fork-url "$BASE_RPC_URL"`
- **Phase gate:** full `forge test --fork-url "$BASE_RPC_URL"` green (incl. Phase-7 8/8) + all per-file `bulloak check` exit 0 + the two named invariants pass at the CI fuzz floor
- **Max feedback latency:** ~120 seconds

---

## Per-Task Verification Map

| Req | Behavior | Test type | Automated command | Nyquist signal asserted | File |
|-----|----------|-----------|-------------------|--------------------------|------|
| WRAP-01 | Wrapper-owns custody | fork unit | `forge test --match-test test_open_wrapperOwnsCollateralAndPosition --fork-url "$BASE_RPC_URL"` | `ct0.balanceOf(wrapper)>0` && `ct0.balanceOf(user)==0` && `numberOfLegs(wrapper)>0` && fees-getter `balances.length==1` w/ `positionSize>0` | ❌ W0 |
| WRAP-02 | Long (`isLong=1`) mint via IPanopticData | fork unit | `forge test --match-test test_open_mintsLongGamma --fork-url "$BASE_RPC_URL"` | after a same-chunk seller seed, long `dispatch` succeeds; stored `TokenId.isLong(0)==1`; pool reached only via `IPanopticData` (grep guard) | ❌ W0 |
| WRAP-03 | Streamia READ == pool debit (wei) | fork unit | `forge test --match-test test_streamia_recordedEqualsPoolDebit --fork-url "$BASE_RPC_URL"` | swap-seed fees → `longPremium` read (=wrapperRecorded) → burn → `assertEq(wrapperRecorded, OptionBurnt.premiaByLeg longSlot)` wei-exact; grep: no `SPREAD_MULTIPLIER`/`perBlock` constant (never re-derived) | ❌ W0 |
| WRAP-03 | forceExercise branch | fork unit | `forge test --match-test test_forceExercise_residualFromSurviving --fork-url "$BASE_RPC_URL"` | `dispatchFrom` (finalLen==toLen-1) debits wrapper; `residual==max(convertToAssets(balanceOf(wrapper))-costs,0)`; `ResidualEroded` emitted; share-burn ≤ holdings | ❌ W0 |
| WRAP-03 | settleLongPremium branch | fork unit | `forge test --match-test test_settleLong_residualFromSurviving --fork-url "$BASE_RPC_URL"` | `dispatchFrom` (toLen==finalLen) settles long premium; surviving recomputed; `ResidualEroded` emitted | ❌ W0 |
| WRAP-03 | liquidation branch | fork unit | `forge test --match-test test_liquidation_residualFloorZero --fork-url "$BASE_RPC_URL"` | wrapper insolvent → `dispatchFrom` (finalLen==0) → `_liquidate`; `residual==max(surviving-costs,0)` (floors at 0); `AccountLiquidated`+`ResidualEroded`; never pays more than holdings | ❌ W0 |
| WRAP-04 | Voluntary burn → claimResidual from surviving | fork unit | `forge test --match-test test_burn_claimResidualFromSurvivingNotDeposit --fork-url "$BASE_RPC_URL"` | after `dispatch` burn, `numberOfLegs(wrapper)==0`; `claimResidual()` pays `convertToAssets(balanceOf(wrapper))`-derived assets; perturb fees → residual moves (proves not `deposit-const`) | ❌ W0 |
| invariant | residual never exceeds holdings | fuzz/invariant | `forge test --match-test invariant_residualNeverExceedsHoldings` | payout ≤ `convertToAssets(balanceOf(wrapper))` always | ❌ W0 |
| invariant | user claims backed by collateral | fuzz/invariant | `forge test --match-test invariant_userClaimsBackedByCollateral` | Σ user internal claims ≤ wrapper surviving collateral | ❌ W0 |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky — all ⬜ pending at plan time.*

**Proof semantics:**
- **WRAP-01 (custody):** ROADMAP wording "`positionIdList(wrapper)`" is SUPERSEDED — no public `positionIdList(address)` getter exists; prove via `numberOfLegs(wrapper)>0` + length-1 `PositionBalance[]` from `getAccumulatedFeesAndPositionsData`.
- **WRAP-02 (long mint):** a naked long reverts `NotEnoughLiquidityInChunk()` — a **seller short must be seeded at the identical chunk first** (SFPM-tracked, distinct from Phase-7's raw UniV4 LP).
- **WRAP-03 (streamia):** the make-or-break — assert read-vs-read (`wrapperRecorded` == `OptionBurnt.premiaByLeg`), NEVER read-vs-formula; streamia = `longPremium` from `getAccumulatedFeesAndPositionsData`. Fees generated by **swaps** (new `V4SwapHelper`), not block advance.
- **WRAP-04 (residual):** `convertToAssets(balanceOf(wrapper))` at actual close; streamia+commission already netted by `settleBurn` — do NOT double-subtract.

---

## Wave 0 Requirements

- [ ] `test/instrument/LongGammaWrapperBase.sol` — M-3 deploy isolation (extends 07-05 base) + **seeds a seller short** at the wrapper's target chunk (the long counterparty)
- [ ] `test/instrument/helpers/V4SwapHelper.sol` — `IUnlockCallback → PoolManager.swap` for deterministic observable pool fees (analogue of `V4LpHelper`); required for WRAP-03 accrual
- [ ] Seven `.tree` + `.t.sol` pairs (open, streamia, forceExercise, settleLong, liquidation, claimResidual, invariants) co-located under `test/instrument/`, `.tree` committed BEFORE impl (Iron Law)
- [ ] `src/instrument/LongGammaWrapper.sol` — the contract under test
- [ ] `IPanopticData` extension: add `getOracleTicks()` (import `OraclePack`); `forge build` green (compile-time conformance)
- [ ] Framework install: none — `forge` + `bulloak` 0.9.2 already pinned (Phase 7)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Driving the wrapper genuinely insolvent on a fork for the liquidation branch | WRAP-03 | Requires constructing an adverse price/fee path; may need `vm` price manipulation if organic insolvency is impractical | If `_liquidate` can't be reached organically, document the `vm`-assisted setup used and assert the residual-floor invariant still holds |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
