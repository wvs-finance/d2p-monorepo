# Phase 8: LongGammaWrapper cash-flow — Research

**Researched:** 2026-06-02
**Domain:** Borrowed Panoptic V2 long-gamma cash-flow — wrapper custody, streamia READ, involuntary-close branches, surviving-collateral residual
**Confidence:** HIGH — every load-bearing claim is a verbatim read of the vendored `contracts/panoptic-borrowed/` tree (provenance `code-423n4/2025-12-panoptic @ fe557748210a529ae414d7c487b6514be0d9e220`, BUSL headers intact) and the Phase-7 artifacts. Line numbers below are the **vendored file** lines (the audit commit re-numbers some; the vendored tree is the build target).

## Summary

Phase 7 proved the full deploy→mint→burn→read seam through `IPanopticData` against a factory-deployed borrowed Panoptic V2 pool on a Base fork, using a **short** OTM leg. Phase 8 turns that seam into a `LongGammaWrapper` that owns a **long** (`isLong=1`) position, reads streamia from the borrowed contract's own accounting, and computes a residual from *surviving* collateral at actual close — tolerating `forceExercise`, `settleLongPremium`, and liquidation.

All five concrete unknowns are retired against source. The streamia READ is `getAccumulatedFeesAndPositionsData(...)`'s **`longPremium`** return (token0=rightSlot, token1=leftSlot), which the pool derives from SFPM `getAccountPremium(...)` = Uniswap V4 `feeGrowthInside` deltas × the long's removed liquidity / 2^64 — never a per-block constant (`PanopticPool.sol` L431/L1998/L2025; `SemiFungiblePositionManagerV4.sol` L1216-1304). The actual collateral debit is `CollateralTracker.settleBurn(...)` → `_updateBalancesAndSettle(...)`, which **burns the owner's 4626 shares** for the realized premium and **reverts `NotEnoughTokens` if `balanceOf[owner] < sharesToBurn`** (`CollateralTracker.sol` L1595/L1474-1488) — so the wrapper structurally never pays more than it holds. The three involuntary branches are all routed through **`dispatchFrom`**, disambiguated by `(toLength, finalLength)` (`PanopticPool.sol` L1360-1476). Surviving collateral is read with `convertToAssets(balanceOf(wrapper))` and redeemed via `redeem`/`withdraw` once `numberOfLegs(wrapper)==0`.

**Two corrections vs the success criteria as worded** (both load-bearing — the planner MUST account for them):
1. **There is NO public `positionIdList(address)` getter on the borrowed V2 `PanopticPool`.** Custody (WRAP-01) must be proven via `numberOfLegs(wrapper) > 0` + the wrapper's own stored `TokenId` (re-read through `getAccumulatedFeesAndPositionsData(wrapper, …, [storedTokenId])` returning a length-1 `PositionBalance[]` with `positionSize > 0`). `positionIdList` is `s_positionsHash` (internal) only.
2. **A naked long mint reverts `NotEnoughLiquidityInChunk()`** unless the *same pool* has prior SFPM-sold (short) liquidity at the **identical chunk** (same tokenType/tickLower/tickUpper). The Phase-7 full-range `V4LpHelper` seed is NOT SFPM-tracked. WRAP-02 therefore requires a **seller leg minted through the pool at the wrapper's target chunk first** (verified `SemiFungiblePositionManagerV4.sol` L965-988).

**Primary recommendation:** Build `LongGammaWrapper` on top of the Phase-7 `PanopticV2DeployHelper` + `PoolKeyLib` + `V4LpHelper`. The wrapper deposits to `ct0`/`ct1` as itself, the test seeds a seller-short at chunk X, the wrapper mints a long at chunk X, streamia is read as `longPremium`, and the residual = `convertToAssets(balanceOf(wrapper))` net of realized costs. `IPanopticData` needs **two additions** (`getOracleTicks`, optional; and no streamia getter is needed — `getAccumulatedFeesAndPositionsData` already returns `longPremium`). Collateral reads (`convertToAssets`, `balanceOf`, `redeem`, `maxRedeem`) come through OZ `IERC4626`/`IERC20` exactly as Phase 7 already wired them.

<user_constraints>
## User Constraints (from project authority — no CONTEXT.md exists for Phase 8)

No `*-CONTEXT.md` exists in the phase folder. The binding constraints come from `CLAUDE.md` (domain non-negotiables), `REQUIREMENTS.md`, `ROADMAP.md` Phase 8 Notes (PITFALLS), and `FEASIBILITY-v1.md` (the design authority). They are reproduced verbatim where they constrain Phase 8 scope.

### Locked Decisions (hard non-negotiables)
- **P1 — Streamia is READ from the contract, NEVER re-derived.** No `SPREAD_MULTIPLIER`/`streamiaPerBlock`/`VEGOID` constant in wrapper code. (ROADMAP Phase 8 Notes; CLAUDE.md "streamia READ-from-contract is a hard non-negotiable".)
- **P2 — Wrapper-owns-position custody is the foundational invariant.** A contract (not the EOA) deposits to the `CollateralTracker` (ERC-4626) and mints, so it owns the long. The user's claim is *internal accounting*, not a 4626 share or a Panoptic position. (ROADMAP Phase 8 Notes; FEASIBILITY-v1 change #1.)
- **P3 — No upfront premium / no per-block draw.** The deposit is an **over-funded collateral cap**, not a precise quote; premium settles lazily at burn / settleLongPremium / forceExercise / liquidation. Residual is post-settlement. (FEASIBILITY-v1 change #2; ROADMAP Phase 8 Notes.)
- **P8 — evm-tdd Iron Law.** `.tree` for open/close/claim/health committed and reviewed BEFORE the `.sol`. bulloak 0.9.2 same-dir + full-stem rule (`X.tree ↔ X.t.sol`), co-located. (skill `evm-tdd`; STATE 07-03/04/05.)
- **Scope:** hackathon demo, testnet/fork ONLY, never production (BUSL borrow permitted). Base fork at `BASE_FORK_BLOCK = 46700000`, `--fork-url "$BASE_RPC_URL"`. Branch `feat/keeper-vercel-buildoutput`. (REQUIREMENTS; CLAUDE.md.)
- **Swap seam intact:** the wrapper reaches the pool ONLY through `IPanopticData`; collateral ONLY through `IERC4626`. No `panoptic-borrowed` import in the wrapper or its tests (the M-3 base pattern absorbs deploy coupling). (07-05 SUMMARY; FORK-03.)

### Claude's Discretion
- Wrapper internal-accounting shape (`claimResidual()` signature, `ResidualEroded` event payload, per-user vs single-user demo).
- How realizedCosts is composed in v1 (streamia + commission now; the metered hedge-data cost is **Phase 9** — Phase 8 only needs the residual hook to exist).
- Choice of the seller-short seeding mechanism for the long counterparty (seller EOA via the pool vs a helper).
- Strike/width/size of the long leg, subject to the tickSpacing-alignment + solvency constraints below.

### Deferred Ideas (OUT OF SCOPE for Phase 8)
- `PremiumSplitter` / `CapitalRemunerationVault` / `φ_data` (Phase 9, FEE-01..03).
- Metered hedge-data cost *value* (Phase 9; v1 hedge is stubbed, HEDGE-01 deferred). Phase 8 builds only the *hook* so the deduction line exists.
- `MacroOracle` surprise / `PositionBuilder` sizing (Phase 10).
- x402 entry (PAY-01), Reactive cross-chain (XCHAIN-01).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description (REQUIREMENTS.md) | Research Support (what enables it) |
|----|------------------------------|------------------------------------|
| **WRAP-01** | User deposits upfront collateral into `LongGammaWrapper`, which owns the position on their behalf | `CollateralTracker.deposit(uint256,address)` mints 4626 shares to the depositor (`CollateralTracker.sol` L557-588). The wrapper calls `ct0.deposit(assets, address(this))` + `ct1.deposit(...)` so `ct.balanceOf(wrapper) > 0`, `ct.balanceOf(user) == 0`. Position ownership keyed by `msg.sender` to `dispatch` (`PanopticPool.sol` L616/L763) = the wrapper. **No public `positionIdList(address)`** — prove ownership via `numberOfLegs(wrapper) > 0` + a length-1 `PositionBalance[]` from `getAccumulatedFeesAndPositionsData(wrapper, true, [storedTokenId])`. |
| **WRAP-02** | Wrapper mints a long-gamma (`isLong=1`) position on the cCOP/USDC pool through `IPanopticData` | `dispatch(positionIdList, finalIdList, sizes, limits, false, 0)` with a `TokenId` whose leg has `isLong=1` (`PanopticPool.sol` L572/L633 `_mintOptions`). **Hard prerequisite:** a seller short must already hold SFPM liquidity at the identical chunk, else `NotEnoughLiquidityInChunk()` (`SemiFungiblePositionManagerV4.sol` L969-974). |
| **WRAP-03** | Streamia accrues against collateral (read from the contract), incl. `forceExercise`/`settleLongPremium`/liquidation | Streamia READ = `longPremium` from `getAccumulatedFeesAndPositionsData` (`PanopticPool.sol` L431, returns `(shortPremium, longPremium, balances)`; long path L524-534). The wei-exact pool debit at close = `realizedPremia` in `_updateSettlementPostBurn` → `CollateralTracker.settleBurn` burns that many shares (`PanopticPool.sol` L1174-1185; `CollateralTracker.sol` L1595/L1474-1488). Involuntary branches all via `dispatchFrom` (L1360). |
| **WRAP-04** | Burn closes the position; residual computed from surviving collateral at actual close | Voluntary close = `dispatch` with `size != stored` (`PanopticPool.sol` L650-658 `_burnOptions`). Surviving collateral = `convertToAssets(balanceOf(wrapper))` (`CollateralTracker.sol` L527/L535 `assetsOf`); redeemable once `numberOfLegs(wrapper)==0` (`maxWithdraw`/`maxRedeem` gate, L656). |
</phase_requirements>

## Standard Stack

All borrowed concretes are already vendored and proven in Phase 7. No new on-chain libraries.

### Reused from Phase 7 (the substrate to build ON)
| Artifact | Path | Role in Phase 8 |
|----------|------|-----------------|
| Deploy helper | `contracts/test/instrument/helpers/PanopticV2DeployHelper.sol` | Factory-choreography deploy of the borrowed V2 stack + cCOP/USDC pool; returns the `Deployed` struct (`pool`, `ct0`/`ct1` as `IERC4626`, `token0`/`token1`/`ccop`, `poolId`, `tickSpacing`). The wrapper's test deploys identically. |
| M-3 isolation base | `contracts/test/instrument/PanopticDataSeamBase.sol` | Absorbs all deploy coupling; the wrapper test extends a base like this so it imports NEITHER `panoptic-borrowed` NOR the helper. |
| Pool key builder | `contracts/test/instrument/helpers/PoolKeyLib.sol` | `buildCcopUsdcKey` runtime ordering + `sqrtPriceX96`. |
| Full-range LP | `contracts/test/instrument/helpers/V4LpHelper.sol` | `addFullRangeLiquidity(1_000_000 ether)` — the UniV4 pool's *raw* liquidity (so swaps move price/fees); NOT the SFPM short-side liquidity a long needs. |
| Seam interface | `contracts/src/instrument/interfaces/IPanopticData.sol` | The wrapper's ONLY view of the pool. **Needs extending — see "Don't Hand-Roll / Interface gaps".** |
| Mint/burn pattern | `contracts/test/instrument/PanopticDataSeam.fork.t.sol` | The verbatim `deal`→approve→`ct.deposit`→build `TokenId`→`dispatch` flow; Phase 8 reuses it with `isLong=1` + a seller seed. |

### Collateral reads — via OZ interfaces (already remapped, Phase 7)
| Call | Interface | Notes |
|------|-----------|-------|
| `convertToAssets(uint256) → uint256` | `@openzeppelin/contracts/interfaces/IERC4626.sol` | Surviving-collateral read (WRAP-04). |
| `balanceOf(address) → uint256` | OZ `IERC20` (IERC4626 extends it) | 4626 share custody (WRAP-01). `balanceOf` is a public mapping on `ERC20Minimal` (L35) — callable through the interface. |
| `redeem(uint256,address,address)` / `maxRedeem` / `previewRedeem` | OZ `IERC4626` | Withdraw surviving assets after close. |
| `deposit(uint256,address)` | OZ `IERC4626` | Upfront collateral in (WRAP-01). |

> **`assetsOf(owner)` and `convertToAssets` both exist on the concrete `CollateralTracker` (L527/L535) but `assetsOf` is NOT on OZ `IERC4626`.** Use `convertToAssets(balanceOf(wrapper))` through the interface (both ARE on IERC4626/IERC20) to keep the seam intact.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Reading `longPremium` from `getAccumulatedFeesAndPositionsData` | SFPM `getAccountPremium` directly | The pool already aggregates per-leg long premium and applies the `isLong` negation + `s_options` last-accumulator delta (`PanopticPool.sol` L2038-2063). Reading the pool getter is higher-level and is the same number the pool will debit. Prefer the pool getter; reserve SFPM `getAccountPremium` only if a per-chunk breakdown is needed. |
| Seller-short seed via a separate EOA | Wrapper mints its own offsetting short first | A separate seller is cleaner (the wrapper stays purely long). Both satisfy the chunk-liquidity precondition. Discretion. |

**Installation:** none. `forge build` / `forge test --fork-url "$BASE_RPC_URL"` from `contracts/`.

## Architecture Patterns

### Recommended layout
```
contracts/
├── src/instrument/
│   ├── LongGammaWrapper.sol            # owns the long; deposit→mint→read→close→claimResidual
│   └── interfaces/IPanopticData.sol    # EXTEND: add getOracleTicks (optional health read)
└── test/instrument/
    ├── LongGammaWrapper.open.tree/.t.sol      # WRAP-01/02 custody + long mint
    ├── LongGammaWrapper.streamia.tree/.t.sol  # WRAP-03 streamia READ == pool debit (wei)
    ├── LongGammaWrapper.forceExercise.tree/.t.sol  # WRAP-03 involuntary branch
    ├── LongGammaWrapper.settleLong.tree/.t.sol     # WRAP-03 involuntary branch
    ├── LongGammaWrapper.liquidation.tree/.t.sol    # WRAP-03 involuntary branch
    ├── LongGammaWrapper.claimResidual.tree/.t.sol  # WRAP-04 surviving-collateral residual
    └── LongGammaWrapperBase.sol         # M-3 deploy isolation (extends the Phase-7 pattern); also seeds the seller short
```
> bulloak co-location rule (STATE 07-05): each `.tree` lives same-dir as its `<stem>.t.sol`; one tree per function/behavioral unit (evm-tdd Iron Law). The five involuntary/voluntary close paths are five behavioral units → five trees, satisfying WRAP-03's "each with a committed `.tree` branch".

### Pattern 1: Wrapper-owns-everything custody (WRAP-01, P2)
**What:** The wrapper contract is the `msg.sender` for `ct.deposit(...)` and `pp.dispatch(...)`, so it owns both the 4626 shares and the Panoptic position. The user's stake is an internal ledger in the wrapper.
**Source:** `CollateralTracker.sol` L557 (`deposit` mints to `receiver`; wrapper passes `address(this)`); `PanopticPool.sol` L616 (`s_positionBalance[msg.sender][tokenId]`) + L763 (set at mint).
```solidity
// inside LongGammaWrapper.deposit(...), called by the user:
//   user transfers `assets` of token0/token1 to the wrapper first (or wrapper pulls via transferFrom)
ct0.deposit(assets0, address(this));   // shares to the WRAPPER, not the user  → ct0.balanceOf(wrapper) > 0
ct1.deposit(assets1, address(this));
// later, wrapper mints as itself:
pp.dispatch(mintList, finalIds, sizes, limits, false, 0);  // s_positionBalance[wrapper][tokenId] set
```
**WRAP-01 assertions (no positionIdList getter exists):**
```solidity
assertGt(IERC20(address(ct0)).balanceOf(wrapper), 0);        // wrapper owns shares
assertEq(IERC20(address(ct0)).balanceOf(user), 0);           // user owns none
assertGt(pano.numberOfLegs(wrapper), 0);                     // wrapper has open legs
(,, PositionBalance[] memory b) =
    pano.getAccumulatedFeesAndPositionsData(wrapper, true, wrapperPositionList);
assertEq(b.length, 1);  assertGt(b[0].positionSize(), 0);    // the position is the wrapper's
```

### Pattern 2: Long mint requires a same-chunk seller (WRAP-02 — make-or-break)
**What:** Panoptic longs are created by **removing** liquidity a short seller previously sold via the SFPM. The SFPM keys liquidity by `positionKey = keccak(poolId, account, tokenType, tickLower, tickUpper)` where `account` = the **PanopticPool** (the pool is `msg.sender` to the SFPM). So the long's chunk must already hold pool-attributed sold liquidity.
**Source:** `SemiFungiblePositionManagerV4.sol` L515 (`msg.sender` packed as account into unlock), L942-988 (long branch: `if (startingLiquidity < chunkLiquidity) revert NotEnoughLiquidityInChunk()`); `PanopticPool.sol` L728 (pool calls `SFPM.mintTokenizedPosition`).
**When to use:** ALWAYS for a long. The demo flow:
```
1. Seller (EOA or wrapper-pre-step) deposits collateral and mints a SHORT (isLong=0) at chunk X
   (strike S, width W, tokenType T) through pp.dispatch → SFPM now has sold liquidity at X.
2. Wrapper mints a LONG (isLong=1) at the SAME chunk X (same S, W, T, smaller-or-equal size)
   → SFPM removes liquidity; long opens cleanly.
```
**Anti-pattern:** Minting a long against only the `V4LpHelper` 1,000,000-ether full-range seed → `NotEnoughLiquidityInChunk()` (that liquidity is raw UniV4 LP, not SFPM-account-tracked under the pool's positionKey).

### Pattern 3: Streamia READ — `longPremium`, never re-derived (WRAP-03, P1)
**What:** The accrued streamia owed BY the long = the `longPremium` return of `getAccumulatedFeesAndPositionsData`. Token0 in `rightSlot()`, token1 in `leftSlot()`.
**Source:** `PanopticPool.sol` L431-447 (getter) → `_calculateAccumulatedPremia` L458 → long branch L524-534 (`longPremium = longPremium - premiaByLeg[leg]`) → `_getPremia` L1998 computes per-leg premium from SFPM `getAccountPremium` (L2025) × `liquidityChunk.liquidity()` / 2^64, negated for longs (L2061-2063).
**Units/decimals:** raw token units (token0 = cCOP 18dp or USDC 6dp depending on ordering; token1 = the other). `LeftRightUnsigned.rightSlot()/leftSlot()` return `uint128` (`types/LeftRight.sol` L38/L100).
```solidity
(, LeftRightUnsigned longPremium, ) =
    pano.getAccumulatedFeesAndPositionsData(wrapper, /*includePendingPremium*/ true, list);
uint128 streamia0 = longPremium.rightSlot();   // token0 streamia owed by the long
uint128 streamia1 = longPremium.leftSlot();    // token1 streamia owed by the long
// the wrapper RECORDS these (never computes from blocks/multipliers)
```
> The streamia source is Uniswap V4 fee growth: `getAccountPremium` reads `feeGrowthInside{0,1}X128 − feeGrowthInside{0,1}LastX128` × `netLiquidity` (`SemiFungiblePositionManagerV4.sol` L1247-1276), then applies the vegoid spread multiplier in `_getPremiaDeltas`. This is exactly "borrowed-LP Uniswap fees × multiplier" — and it is READ, not modeled.

### Pattern 4: The pool's own debit "to the wei" (WRAP-03 assertion)
**What:** At a voluntary burn, the long's settled premium is `realizedPremia` (per token), which `settleBurn` converts to `sharesToBurn` and burns from the wrapper. The "pool debit to the wei" the test asserts against = the **drop in `convertToAssets(balanceOf(wrapper))` attributable to premium** OR, more directly, the `OptionBurnt` event's `premiaByLeg` (the actually-settled long premium per leg).
**Source:** `PanopticPool.sol` L901-939 (`_burnOptions`: `realizedPremia` → `settleBurn(owner, …, realizedPremia.rightSlot()/leftSlot(), …)`); L914 `emit OptionBurnt(owner, positionSize, tokenId, premiaByLeg)`; `CollateralTracker.sol` L1602-1610 (`settleBurn` → `_updateBalancesAndSettle` with `realizedPremium`), L1474-1488 (burns `sharesToBurn`).
**Assertion strategy for "wrapperRecorded == poolDebit to the wei":**
```
preStreamia  = longPremium read BEFORE burn (Pattern 3)         // wrapperRecorded
preShares    = ct0.balanceOf(wrapper); preAssets = convertToAssets(preShares)
... pp.dispatch(burn) ...   // capture OptionBurnt.premiaByLeg via vm.recordLogs / expectEmit
postShares   = ct0.balanceOf(wrapper); postAssets = convertToAssets(postShares)
// poolDebit (premium portion) == OptionBurnt premiaByLeg long-leg slot
assertEq(wrapperRecordedStreamia0, uint128(premiaByLeg[longLeg].rightSlot()));  // wei-exact
```
> Note: the *available* long premium settled at burn can be ≤ the *owed* `longPremium` because `_getAvailablePremium` caps it by settled-token ratio (`PanopticPool.sol` L1216-1235, L2084-2122). For a clean demo where the seller's short has collected enough fees, available == owed. The test should generate enough fees (Pattern 5) that the cap does not bind, OR assert against `OptionBurnt.premiaByLeg` (the realized figure) rather than the pre-burn `longPremium` (the owed figure). **Recommend asserting against `OptionBurnt.premiaByLeg` — that is the pool's own debit to the wei.**

### Pattern 5: Generating known pool fees on the fork (WRAP-03 "advance N blocks generating known pool fees")
**What:** Streamia accrues only as the UniV4 pool's `feeGrowthInside` advances, which happens on **swaps**, not on block advance alone. The test must execute swaps through the `PoolManager` so fees accrue to the seller's in-range liquidity, then the long's `longPremium` reflects a share of them.
**Source:** `SemiFungiblePositionManagerV4.sol` L1247-1276 (premium = feeGrowthInside delta × netLiquidity); fee growth advances only on swaps within the chunk's tick range.
**Mechanism (deterministic fee):**
```
1. Build a tiny swap helper (IUnlockCallback → PoolManager.swap) analogous to V4LpHelper.
2. Swap an amount A through the pool at fee tier feePips (the cCOP/USDC pool uses fee=500 = 0.05%, PoolKeyLib).
   LP fee generated ≈ A * feePips / 1e6 (the swap-side fee), distributed to in-range liquidity by feeGrowthInside.
3. The chunk MUST be in range for the swap (so the seller's sold liquidity earns the fee) — i.e. the
   long/short chunk straddles or sits at the swapped price band. (Phase-7 used an OTM single-sided chunk to
   dodge a mint-time underflow; for streamia to accrue, the chunk must see fee growth → place it so swaps cross it.)
4. Read longPremium AFTER the swaps; assert it equals the SFPM-derived figure (Pattern 3/4).
```
> **Determinism caveat (flag for the plan):** the exact wei of `longPremium` after a swap is a function of feeGrowthInside math + the vegoid (=4) spread multiplier + the available-premium cap. The test should NOT hand-derive the wei from `A*feePips` (that would violate P1 "never re-derive"). Instead: (a) swap, (b) READ `longPremium` (=wrapperRecorded), (c) close, (d) assert wrapperRecorded == `OptionBurnt.premiaByLeg` (=poolDebit). The swap's role is only to make the premium **non-zero and observable**; the wei-exact assertion is read-vs-read, not read-vs-formula.

### Pattern 6: The three involuntary-close branches — all via `dispatchFrom`
**What:** `PanopticPool` has NO standalone `forceExercise`/`settleLongPremium`/`liquidate` external functions. All three are routed through `dispatchFrom(positionIdListFrom, account, positionIdListTo, positionIdListToFinal, usePremiaAsCollateral)` and disambiguated by list lengths + solvency.
**Source:** `PanopticPool.sol` L1360-1476 (dispatchFrom), L1482 (`_liquidate`), L1598 (`_forceExercise`), L1671 (`_settlePremium`).

| Branch | Caller / who | Disambiguation (verified L1410-1465) | Collateral debit mechanic | Wrapper residual + event |
|--------|--------------|--------------------------------------|---------------------------|--------------------------|
| **settleLongPremium** | a seller of the wrapper's chunk (anyone solvent), `account = wrapper` | `account` solvent at all 4 ticks **AND** `toLength == finalLength` (hashes equal) → `_settlePremium` (L1430) | `_settleOptions` → `_updateSettlementPostBurn` → `settleBurn(wrapper,0,0,0,realizedPremia,…)` burns wrapper shares for the long premium (`PanopticPool.sol` L1688/L1010-1011) | residual recomputed from `convertToAssets(balanceOf(wrapper))`; `ResidualEroded` fires |
| **forceExercise** | any exercisor, `account = wrapper` | `account` solvent **AND** `toLength == finalLength + 1` (one shorter) **AND** the leg is exercisable/out-of-range long (L1431-1435) | `_forceExercise`: delegates virtual shares, `_burnOptions(wrapper,…)`, then `ct.refund(wrapper, exercisor, refundAmounts)` + `revoke` — fees come out of the wrapper's collateral (`PanopticPool.sol` L1598-1664, L1657-1658) | residual from surviving shares post-burn-and-refund; `ResidualEroded` fires; `ForcedExercised` is the pool's own event |
| **liquidation** | any liquidator, `account = wrapper` | `account` **insolvent at all 4 ticks** (`solvent == 0`) **AND** `finalLength == 0` (L1453-1461) → `_liquidate` | `_liquidate` burns ALL positions, pays a liquidator bonus out of the wrapper's collateral (`PanopticPool.sol` L1482+); `AccountLiquidated` event | residual = `max(survivingShares→assets − costs, 0)`; with severe loss surviving may be ~0; `ResidualEroded` fires |

**Calldata shapes (per branch, verified):**
```solidity
// settleLongPremium: toList == finalList (same positions, hashes equal)
pp.dispatchFrom(callerList, wrapper, [wrapperTokenId], [wrapperTokenId], usePremiaLR);
// forceExercise: finalList one element shorter (the exercised position removed)
pp.dispatchFrom(callerList, wrapper, [wrapperTokenId], /*final*/ new TokenId[](0) /* or shorter */, usePremiaLR);
// liquidation: finalList length 0, and account must be insolvent at all ticks
pp.dispatchFrom(callerList, wrapper, [wrapperTokenId], new TokenId[](0), usePremiaLR);
```
> `usePremiaAsCollateral` is a `LeftRightUnsigned` here (rightSlot = callee flag, leftSlot = caller flag), NOT a bool — `PanopticPool.sol` L1365/L1444/L1473. `IPanopticData.dispatchFrom` already declares it correctly (`LeftRightUnsigned`, payable). To DRIVE a liquidation on the fork, push the wrapper insolvent (advance price via swaps / shrink collateral) so `_checkSolvencyAtTicks` returns 0 at all 4 ticks.

### Pattern 7: Surviving-collateral residual at actual close (WRAP-04, P3)
**What:** After ANY close (voluntary burn or involuntary), the residual is read from what the wrapper *actually still holds*, never the deposit.
**Source:** `CollateralTracker.sol` L527 (`convertToAssets`), L535 (`assetsOf`), L651-657 (`maxWithdraw` returns 0 with open legs, full balance once `numberOfLegs==0`), L817 (`redeem`).
```solidity
// AFTER close (numberOfLegs(wrapper) == 0):
uint256 surviving0 = ct0.convertToAssets(IERC20(address(ct0)).balanceOf(wrapper));
uint256 surviving1 = ct1.convertToAssets(IERC20(address(ct1)).balanceOf(wrapper));
uint256 residual0 = surviving0 > realizedCosts0 ? surviving0 - realizedCosts0 : 0;  // max(.,0)
// realizedCosts = accrued streamia (already netted into surviving by settleBurn) + commission
//                 + (Phase 9) metered hedge-data cost. In v1 streamia+commission are ALREADY
//                 reflected in the share burn, so residual ≈ surviving minus any wrapper-side fee hook.
ct0.redeem(IERC20(address(ct0)).balanceOf(wrapper), user, address(wrapper));  // pay user the surviving assets
```
> **Critical subtlety:** streamia + commission are debited by the pool *into* the share balance (Pattern 4). So `convertToAssets(balanceOf(wrapper))` after close is ALREADY net of streamia+commission — the wrapper must NOT subtract them again. `realizedCosts` in the wrapper's `claimResidual()` is the **wrapper-side** ledger (the Phase-9 metered hedge-data cost), not the pool's premium. WRAP-04's "never a figure derived from the upfront deposit" is satisfied because the read is `convertToAssets(balanceOf)` at actual close.

### Anti-Patterns to Avoid
- **Re-deriving streamia** from a per-block constant / VEGOID / SPREAD_MULTIPLIER → violates P1. READ `longPremium`.
- **Computing residual as `deposit − promisedStreamia`** → violates P3/WRAP-04. Read `convertToAssets(balanceOf(wrapper))` at close.
- **Naked long with no seller** → `NotEnoughLiquidityInChunk()`. Seed a same-chunk short first.
- **Subtracting streamia twice** (once in the pool's share-burn, once in `claimResidual`) → double-counts. The pool already netted it.
- **Asserting `positionIdList(wrapper)`** → no such getter. Use `numberOfLegs` + `getAccumulatedFeesAndPositionsData`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Accrued long premium / streamia | A block-counter × rate | `getAccumulatedFeesAndPositionsData(...).longPremium` | The pool's figure is the one it will debit; P1 hard constraint. |
| Collateral share math / solvency | Custom share accounting | `CollateralTracker` 4626 (`deposit`/`convertToAssets`/`redeem`) + pool `_validateSolvency` | Audited; the pool reverts `NotEnoughTokens` if the wrapper can't cover (the "never pays more than it holds" invariant is built in). |
| Force-exercise / settle / liquidate entry | Three separate calls | one `dispatchFrom` (list-length disambiguated) | That's the only V2 entry; no standalone functions exist. |
| TokenId construction | Bit-packing by hand | `@types/TokenId.sol` value-type builder (`addPoolId().addLeg(...)`) | Phase 7 proved the arg order; reuse verbatim. |
| Deploy / pool / seed | New harness | `PanopticV2DeployHelper` + `PoolKeyLib` + `V4LpHelper` | Proven green on the fork (07-04/05). |

**Interface gaps — what `IPanopticData` must add for Phase 8:**
- **`getOracleTicks()`** (`PanopticPool.sol` L1899, returns `(int24 currentTick, int24 spotTick, int24 medianTick, int24 latestTick, OraclePack)`) — OPTIONAL but recommended for the wrapper's health/involuntary-close monitoring. 07-02 deferred it to Phase 8 explicitly. Adding it requires importing `OraclePack` from `@types/OraclePack.sol`.
- **No new streamia getter is needed** — `getAccumulatedFeesAndPositionsData` already returns `longPremium`. Confirmed it is the right field (Pattern 3).
- **No new close getter is needed** — `dispatch` (voluntary) and `dispatchFrom` (involuntary) are both already on `IPanopticData`.
- **`numberOfLegs(address)`** — already on `IPanopticData` (used for the custody assertion + the maxWithdraw gate). Keep.
- `convertToAssets`/`balanceOf`/`redeem`/`maxRedeem` — come through OZ `IERC4626`/`IERC20`, no `IPanopticData` change.

**Key insight:** the borrowed V2 source already exposes every read and entry the wrapper needs; the only interface addition is the optional `getOracleTicks` health read. Do NOT invent a `streamiaOf`/`getStreamia` getter — it does not exist and `longPremium` is the canonical source.

## Common Pitfalls

### Pitfall 1: Naked long reverts (the WRAP-02 blocker)
**What goes wrong:** `dispatch` with an `isLong=1` leg reverts `NotEnoughLiquidityInChunk()`.
**Why:** No same-chunk seller liquidity exists in the SFPM under the pool's positionKey (`SemiFungiblePositionManagerV4.sol` L969-974).
**How to avoid:** Seed a seller short at the identical chunk (same tokenType/strike/width) through the pool *before* the long mint. The seller's size ≥ the long's size.
**Warning signs:** revert selector for `NotEnoughLiquidityInChunk`.

### Pitfall 2: Streamia is zero (no fees generated)
**What goes wrong:** `longPremium` reads 0 after "advancing blocks."
**Why:** Premium accrues from UniV4 `feeGrowthInside`, which advances only on **swaps crossing the chunk's range** — block advance alone does nothing (`SemiFungiblePositionManagerV4.sol` L1247-1276).
**How to avoid:** Execute swaps (Pattern 5) through the chunk's tick band; ensure the seller's liquidity is in range when swapping.
**Warning signs:** `longPremium.rightSlot() == 0 && leftSlot() == 0` after the "fee-generating" step.

### Pitfall 3: Owed vs available premium mismatch
**What goes wrong:** pre-burn `longPremium` (owed) != settled `premiaByLeg` (available) → a wei-exact assertion fails.
**Why:** `_getAvailablePremium` caps settled long premium by the settled-token ratio (`PanopticPool.sol` L2084-2122); if the seller hasn't collected enough, available < owed.
**How to avoid:** Assert `wrapperRecorded == OptionBurnt.premiaByLeg` (read-vs-read, both the pool's numbers), OR generate enough seller fees that the cap doesn't bind.

### Pitfall 4: ITM mint underflow (carried from Phase 7)
**What goes wrong:** an at-the-money chunk straddling the active tick underflows the SFPM ERC6909-claim burn (07-05 deviation #3).
**Why:** ITM needs both tokens swapped at mint, overdrawing the claim balance.
**How to avoid:** keep chunks tickSpacing-aligned (width=2 → r=10 with tickSpacing=10) and either single-sided OTM (mint cleanly) OR ensure adequate seller liquidity + swap seeding when the chunk must be in-range for fees. **Tension to resolve in the plan:** streamia needs an in-range chunk (Pitfall 2) but ITM mint can underflow (Pitfall 4) — resolve by minting the chunk slightly OTM and then swapping the price *into* the chunk to generate fees, or by seeding ample seller liquidity so the mint-time swap doesn't overdraw.

### Pitfall 5: `dispatchFrom` solvency gating blocks the branch you want
**What goes wrong:** liquidation reverts `NotMarginCalled`, or forceExercise reverts `NoLegsExercisable`/`AccountInsolvent`.
**Why:** Each branch asserts a specific solvency state at all 4 oracle ticks (`PanopticPool.sol` L1399-1465) and forceExercise needs an out-of-range exercisable long (L1433 `validateIsExercisable`).
**How to avoid:** drive the fork state to match the branch (insolvent-at-all-ticks for liquidation via adverse swaps/collateral; price moved so the long is out-of-range-exercisable for forceExercise). Use `getOracleTicks` to confirm the state before calling.

## Code Examples

### Streamia READ (WRAP-03)
```solidity
// Source: contracts/panoptic-borrowed/PanopticPool.sol L431-447, L524-534; types/LeftRight.sol L38/L100
(, LeftRightUnsigned longPremium, ) =
    IPanopticData(pool).getAccumulatedFeesAndPositionsData(address(this), true, positionList);
uint128 streamiaToken0 = longPremium.rightSlot();
uint128 streamiaToken1 = longPremium.leftSlot();
```

### Long mint after seller seed (WRAP-02)
```solidity
// Source: PanopticPool.sol L572/L633; SFPM L965-988; TokenId @types builder (07-05 arg order)
// 1) seller short at chunk X:
TokenId shortId = TokenId.wrap(0).addPoolId(poolId).addLeg(0,1,0,/*isLong*/0,/*tokenType*/0,0,strike,2);
vm.prank(seller); pp.dispatch(_one(shortId), _one(shortId), _size(sellerSize), limits, false, 0);
// 2) wrapper long at the SAME chunk X (isLong=1):
TokenId longId  = TokenId.wrap(0).addPoolId(poolId).addLeg(0,1,0,/*isLong*/1,/*tokenType*/0,0,strike,2);
pp.dispatch(_one(longId), _one(longId), _size(longSize), limits, false, 0);  // longSize <= sellerSize
```

### Involuntary liquidation (WRAP-03)
```solidity
// Source: PanopticPool.sol L1360-1476, L1453-1461 (insolvent + finalLength==0 ⇒ _liquidate)
// precondition: wrapper insolvent at all 4 oracle ticks (drive via adverse swaps)
vm.prank(liquidator);
pp.dispatchFrom(_one(liquidatorList), address(wrapper), _one(longId), new TokenId[](0), usePremiaLR);
// then wrapper.claimResidual(): residual = max(convertToAssets(balanceOf(wrapper)) - costs, 0); emit ResidualEroded
```

### Surviving-collateral residual (WRAP-04)
```solidity
// Source: CollateralTracker.sol L527 (convertToAssets), L651-657 (maxWithdraw gate), L817 (redeem)
require(IPanopticData(pool).numberOfLegs(address(this)) == 0, "open legs");
uint256 surviving = ct0.convertToAssets(IERC20(address(ct0)).balanceOf(address(this)));
uint256 residual  = surviving > wrapperSideCosts ? surviving - wrapperSideCosts : 0;  // never from deposit
```

## State of the Art

| Old (Phase-7 seam) | Phase-8 long-gamma | Why changed |
|--------------------|--------------------|-------------|
| Short OTM single-sided leg (`isLong=0`) to dodge ATM underflow | Long leg (`isLong=1`) + a seeded same-chunk seller short | WRAP-02 needs a long; a long requires a counterparty seller (SFPM removal semantics). |
| Mint/burn only, no premium read asserted | `longPremium` read asserted wei-exact vs `OptionBurnt.premiaByLeg` | WRAP-03's read-from-contract proof. |
| No close-branch coverage | `dispatch` (voluntary) + `dispatchFrom` ×3 (involuntary) | WRAP-03/04. |

**Deprecated/outdated:** the FEASIBILITY-v1 references to `panoptic-v1-core`/`SFPM`/`FeesCalc`/`VEGOID=2` are V1; V2 vegoid is a RiskEngine constant `=4` (07-RESEARCH-DEPLOY §B/§G) and the streamia path is SFPM `getAccountPremium` on UniV4 feeGrowth — use V2.

## Open Questions

1. **Wei-exact determinism of the streamia assertion under the available-premium cap.**
   - What we know: `longPremium` (owed) and `OptionBurnt.premiaByLeg` (available) can differ when the seller hasn't collected enough (Pitfall 3).
   - What's unclear: the exact fee-seeding amount that makes available == owed for a clean equality.
   - Recommendation: assert `wrapperRecorded == OptionBurnt.premiaByLeg` (read-vs-read, both the pool's), not against a hand-derived figure. Plan a fee-seeding swap large enough to make the cap non-binding for a strict-equality demo.

2. **Driving the wrapper insolvent for the liquidation branch on a fork.**
   - What we know: liquidation needs insolvency at all 4 oracle ticks (`PanopticPool.sol` L1453).
   - What's unclear: the cleanest fork manipulation (large adverse swap to move price vs. shrinking collateral via repeated forceExercise) to reach `solvent==0` deterministically.
   - Recommendation: prototype with `getOracleTicks` reads between swaps; the plan should reserve a swap helper + a tick-target. May need a sizeable position relative to collateral so an adverse move flips solvency.

3. **`ResidualEroded` event payload and `claimResidual()` signature** — Claude's discretion; not constrained by source. Recommend `ResidualEroded(address indexed user, uint256 erodedAmount0, uint256 erodedAmount1, bytes32 cause)` fired on any involuntary debit detected (surviving < lastRecordedSurviving).

## Validation Architecture

`workflow.nyquist_validation: true` (`.planning/config.json`) → this section is REQUIRED.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Foundry `forge` (fork) + `bulloak` 0.9.2 (BTT scaffolding) |
| Config file | `contracts/foundry.toml` (single `cancun`/`0.8.24` profile, non-viaIR, optimizer 200) |
| Quick run command | `cd contracts && forge test --match-path "test/instrument/LongGammaWrapper*.t.sol" --fork-url "$BASE_RPC_URL"` |
| Full suite command | `cd contracts && forge test --fork-url "$BASE_RPC_URL"` |
| BTT per-file check | `cd contracts && bulloak check test/instrument/LongGammaWrapper.<unit>.tree` (per file; full-glob is a non-gate per 07-03/04/05) |

### Phase Requirements → Test Map (minimal observable signals)
| Req | Behavior | Test type | Automated command | Asserts (the Nyquist signal) | File exists? |
|-----|----------|-----------|-------------------|-------------------------------|--------------|
| WRAP-01 | Wrapper-owns custody | fork unit | `forge test --match-test test_open_wrapperOwnsCollateralAndPosition --fork-url "$BASE_RPC_URL"` | `ct0.balanceOf(wrapper)>0` && `ct0.balanceOf(user)==0` && `numberOfLegs(wrapper)>0` && `getAccumulatedFeesAndPositionsData(wrapper,…).balances.length==1` with `positionSize>0` | ❌ Wave 0 |
| WRAP-02 | Long (`isLong=1`) mint via IPanopticData | fork unit | `forge test --match-test test_open_mintsLongGamma --fork-url "$BASE_RPC_URL"` | after a same-chunk seller seed, `dispatch` long succeeds; the stored `TokenId.isLong(0)==1`; pool reached only via `IPanopticData` (grep guard) | ❌ Wave 0 |
| WRAP-03 | Streamia READ (read-fidelity + non-zero + directional) | fork unit | `forge test --match-test test_streamia --fork-url "$BASE_RPC_URL"` | **Read-fidelity (wei-exact, same call/tick):** wrapper stores EXACTLY `getAccumulatedFeesAndPositionsData(wrapper,true,list).longPremium.rightSlot()/leftSlot()`; **non-zero floor:** after swap-seed fees `recorded0>0 \|\| recorded1>0`; **directional:** more fees ⇒ recorded strictly increases. Proves "never re-derived" (grep: no `SPREAD_MULTIPLIER`/`perBlock`/`VEGOID`). NOTE: the cross-tick `assertEq(recorded, OptionBurnt.premiaByLeg)` is NOT a valid gate — `recordStreamia` reads at `currentTick` (PanopticPool L437) but `premiaByLeg` is emitted atTick=0 under `COMMIT_LONG_SETTLED` (L1159-1161); the available-premium cap is short-branch only (L1186-1235), so it is not the cause. Any `premiaByLeg` comparison is non-gating only. | ❌ Wave 0 |
| WRAP-03 | forceExercise branch | fork unit | `forge test --match-test test_forceExercise_residualFromSurviving --fork-url "$BASE_RPC_URL"` | `dispatchFrom` (final one shorter) debits wrapper; `residual==max(convertToAssets(balanceOf(wrapper))-costs,0)`; `ResidualEroded` emitted; wrapper share-burn never exceeds holdings (no `NotEnoughTokens` swallowed) | ❌ Wave 0 |
| WRAP-03 | settleLongPremium branch | fork unit | `forge test --match-test test_settleLong_residualFromSurviving --fork-url "$BASE_RPC_URL"` | `dispatchFrom` (toLen==finalLen) settles long premium; surviving recomputed; `ResidualEroded` emitted | ❌ Wave 0 |
| WRAP-03 | liquidation branch | fork unit | `forge test --match-test test_liquidation_residualFloorZero --fork-url "$BASE_RPC_URL"` | wrapper insolvent → `dispatchFrom` (finalLen==0) → `_liquidate`; `residual==max(surviving-costs,0)` (can floor at 0); `AccountLiquidated` + `ResidualEroded`; wrapper never pays more than holdings | ❌ Wave 0 |
| WRAP-04 | Voluntary burn → claimResidual from surviving | fork unit | `forge test --match-test test_burn_claimResidualFromSurvivingNotDeposit --fork-url "$BASE_RPC_URL"` | after `dispatch` burn, `numberOfLegs(wrapper)==0`; `claimResidual()` pays `convertToAssets(balanceOf(wrapper))`-derived assets; assert the paid figure `!=` `deposit - someConstant` (prove it tracks actual surviving by perturbing fees and seeing residual move) | ❌ Wave 0 |
| invariant | residual never exceeds holdings | fuzz/invariant | `forge test --match-test invariant_residualNeverExceedsHoldings` | `claimResidual` payout ≤ `convertToAssets(balanceOf(wrapper))` at all times (ROADMAP named invariant) | ❌ Wave 0 |
| invariant | user claims backed by collateral | fuzz/invariant | `forge test --match-test invariant_userClaimsBackedByCollateral` | Σ user internal claims ≤ wrapper surviving collateral (ROADMAP named invariant) | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `forge test --match-path "test/instrument/LongGammaWrapper.<unit>.t.sol" --fork-url "$BASE_RPC_URL"` + `bulloak check` for that unit's tree.
- **Per wave merge:** `forge test --match-path "test/instrument/LongGammaWrapper*.t.sol" --fork-url "$BASE_RPC_URL"`.
- **Phase gate:** full `forge test --fork-url "$BASE_RPC_URL"` green (incl. the Phase-7 8/8) + all per-file `bulloak check` exit 0 + the two named invariants pass at the CI fuzz-run floor, before `/gsd:verify-work`.

### Wave 0 Gaps
- [ ] `test/instrument/LongGammaWrapperBase.sol` — M-3 deploy isolation (extends the 07-05 base pattern) + **seeds a seller short** at the wrapper's target chunk (the long counterparty).
- [ ] `test/instrument/helpers/V4SwapHelper.sol` — `IUnlockCallback → PoolManager.swap` to generate deterministic, observable pool fees (analogue of `V4LpHelper`). Required for WRAP-03 streamia accrual.
- [ ] Seven `.tree` + `.t.sol` pairs (open, streamia, forceExercise, settleLong, liquidation, claimResidual, + invariants) co-located under `test/instrument/`, each committed BEFORE its impl (Iron Law).
- [ ] `src/instrument/LongGammaWrapper.sol` — the contract under test.
- [ ] `IPanopticData` extension: add `getOracleTicks()` (import `OraclePack`); confirm `forge build` green (compile-time conformance).
- [ ] Framework install: none — `forge` + `bulloak` 0.9.2 already pinned (Phase 7).

## Sources

### Primary (HIGH confidence) — vendored source, read verbatim
- `contracts/panoptic-borrowed/PanopticPool.sol` — getAccumulatedFeesAndPositionsData L431-447, _calculateAccumulatedPremia L458-545 (long branch L524-534), dispatch L572-703, _mintOptions L717-767, _burnOptions L876-940, _settleOptions L988-1012, _updateSettlementPostBurn L1143-1262 (long L1174-1185), dispatchFrom L1360-1476, _liquidate L1482+, _forceExercise L1598-1664, _settlePremium L1671-1703, _getPremia L1998-2069, _getAvailablePremium L2084-2122, getOracleTicks L1899, numberOfLegs L1921, getTWAP L1944, getCurrentTick L1949, events L37-88.
- `contracts/panoptic-borrowed/CollateralTracker.sol` — convertToAssets L527, assetsOf L535, deposit L557-588, maxWithdraw L651-658, redeem L817-858, settleBurn L1595-1663, _updateBalancesAndSettle L1395-1513 (share-burn + NotEnoughTokens L1474-1488).
- `contracts/panoptic-borrowed/SemiFungiblePositionManagerV4.sol` — mintTokenizedPosition L603-627, _unlockAndCreatePositionInAMM L503-526 (account=msg.sender L515), _createLegInAMM L918-994 (long branch + NotEnoughLiquidityInChunk L965-988), getAccountPremium L1216-1304 (feeGrowthInside delta × netLiquidity L1247-1276).
- `contracts/panoptic-borrowed/tokens/ERC20Minimal.sol` — `balanceOf` public mapping L35.
- `contracts/panoptic-borrowed/types/LeftRight.sol` — rightSlot/leftSlot L38/L45/L100/L107.
- `contracts/panoptic-borrowed/types/PositionBalance.sol` — positionSize L175.
- `contracts/src/instrument/interfaces/IPanopticData.sol` — current seam (the six V2 fns).
- `contracts/test/instrument/PanopticDataSeam.fork.t.sol`, `helpers/PanopticV2DeployHelper.sol`, `helpers/PoolKeyLib.sol`, `helpers/V4LpHelper.sol`, `PanopticDataSeamBase.sol` — Phase-7 reusable substrate.

### Secondary (HIGH confidence) — planning artifacts
- `.planning/phases/07-base-fork-borrowed-panoptic-v2-ccop-usdc-pool/07-RESEARCH-DEPLOY.md` §D (mint sequence), §E (IPanopticData), §A (CWIA).
- `07-05-SUMMARY.md` (OTM/width deviations, M-3 base), `07-04-SUMMARY.md` (SEEDED_LIQUIDITY=1,000,000 ether, sqrtPriceX96 literals).
- `research/macro-markets-colombia/FEASIBILITY-v1.md` (cash-flow design authority), `INSTRUMENT-v1.md` (φ_data hook for Phase 9).
- `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md` Phase 8, `.planning/STATE.md`.

## Metadata

**Confidence breakdown:**
- Streamia READ getter + units: HIGH — read the getter, the long branch, and the SFPM source bodies.
- Three involuntary signatures + disambiguation: HIGH — read `dispatchFrom` + all three internal bodies verbatim.
- Custody / 4626 semantics: HIGH — read deposit/convertToAssets/maxWithdraw/settleBurn bodies; confirmed no `positionIdList` getter.
- Long-mint counterparty requirement: HIGH — read `_createLegInAMM` long branch + the `account=msg.sender=pool` keying.
- Fee-seeding determinism for the wei-exact assertion: MEDIUM — mechanism verified (swap → feeGrowth → premium); exact swap sizing to make available==owed is an Open Question for the plan to prototype.

**Research date:** 2026-06-02
**Valid until:** stable (vendored source is pinned @fe55774; ~30 days for the planning artifacts).

## RESEARCH COMPLETE

1. **Streamia READ getter** — `getAccumulatedFeesAndPositionsData(wrapper, true, list)` return field **`longPremium`** (token0=`rightSlot()`, token1=`leftSlot()`, raw token units uint128); the pool derives it from SFPM `getAccountPremium` = UniV4 `feeGrowthInside` deltas × removed liquidity / 2^64 (negated for longs) — READ, never modeled (PanopticPool.sol L431/L524-534/L1998-2063; SFPM L1216-1304). Assert wei-exact against `OptionBurnt.premiaByLeg`.
2. **Generating known fees** — streamia accrues from **swaps** crossing the chunk's tick band, not block advance; build a `V4SwapHelper` (IUnlockCallback→PoolManager.swap) to move `feeGrowthInside`; assert read-vs-read (wrapperRecorded == pool's `OptionBurnt.premiaByLeg`), not read-vs-formula (SFPM L1247-1276).
3. **Three involuntary signatures** — ALL via `dispatchFrom(listFrom, account, listTo, listToFinal, LeftRightUnsigned)` (payable), disambiguated: settle = solvent & `toLen==finalLen`; forceExercise = solvent & `toLen==finalLen+1`; liquidation = insolvent-at-all-ticks & `finalLen==0` (PanopticPool.sol L1360-1476, _liquidate L1482, _forceExercise L1598, _settlePremium L1671). Each debits the wrapper's collateral via `settleBurn`/`refund`.
4. **ERC-4626 custody** — wrapper calls `ct.deposit(assets, address(this))` → `ct.balanceOf(wrapper)>0`, `ct.balanceOf(user)==0`; `dispatch` keys the position to `msg.sender`=wrapper. **NO `positionIdList(address)` getter exists** — prove custody via `numberOfLegs(wrapper)>0` + a length-1 `PositionBalance[]` from the fees getter (CollateralTracker.sol L557; PanopticPool.sol L616/L763/L1921).
5. **Surviving-collateral read** — `ct.convertToAssets(ct.balanceOf(wrapper))` at actual close (CollateralTracker.sol L527/L535), redeemable once `numberOfLegs(wrapper)==0` (maxWithdraw L656); streamia+commission are ALREADY netted into the share balance by `settleBurn`, so `claimResidual` must NOT subtract them again — `realizedCosts` is only the wrapper-side (Phase-9) hedge-data cost; `max(surviving−costs,0)` is structurally enforced because `settleBurn` reverts `NotEnoughTokens` when shares < debit (CollateralTracker.sol L1474-1488).
6. **Build-on + the WRAP-02 blocker** — reuse `PanopticV2DeployHelper`/`PoolKeyLib`/`V4LpHelper`/M-3 base; a long (`isLong=1`) reverts `NotEnoughLiquidityInChunk()` unless the SAME pool already holds SFPM-sold liquidity at the identical chunk (SFPM L515/L965-988), so the test must seed a **seller short at the wrapper's target chunk first**; `IPanopticData` needs only the optional `getOracleTicks` addition (no new streamia getter).
