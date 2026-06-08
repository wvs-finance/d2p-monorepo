---
phase: 08-longgammawrapper-cash-flow
plan: 02
subsystem: contracts
tags: [solidity, panoptic-v2, uniswap-v4, swap-helper, test-harness, base-fork, foundry, m-3-isolation]

# Dependency graph
requires:
  - phase: 07-base-fork-borrowed-panoptic-v2-ccop-usdc-pool
    provides: PanopticV2DeployHelper.deployPanopticV2() Deployed struct, V4LpHelper unlock/settle shape, PanopticDataSeamBase M-3 pattern, IPanopticData seam, @types/TokenId builder
  - phase: 08-longgammawrapper-cash-flow
    plan: 01
    provides: IPanopticData.getOracleTicks extension, LongGammaWrapper surface (the contract these units will test)
provides:
  - "V4SwapHelper.sol: IUnlockCallback->PoolManager.swap deterministic fee generator (swapExactIn moves feeGrowthInside; the WRAP-03 streamia source)"
  - "LongGammaWrapperBase.sol: M-3 deploy-isolation base that deploys the borrowed V2 stack + cCOP/USDC pool, seeds a CLOSEABLE seller short (isLong=0, size>=long) at the wrapper's target chunk (the WRAP-02 prerequisite), and owns a V4SwapHelper"
  - "_longTokenId() / _oneLegArgs() / _closeSellerShort() shared helpers so Plans 03-06 re-derive no deploy or seed logic"
  - "Exposed seller tokenId + address so the claim test (Plan 04) can free the pool-wide maxRedeem cap (B4)"
affects: [08-03-streamia, 08-04-claim, 08-05-invariants, 08-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Swap-based fee generation: block advance does NOT accrue streamia (Pitfall 2); only PoolManager.swap moving feeGrowthInside does"
    - "M-3 deploy isolation extended with a behavioral seed: the BASE instantiates the deploy helper + seeds the seller short, so units that EXTEND it import no borrowed concrete (grep-guard panoptic-borrowed==0)"
    - "Inlined sync->transfer->settle / take settlement (no v4-core test settler util) — 07-04 type-identity decision, reused verbatim from V4LpHelper"

key-files:
  created:
    - contracts/test/instrument/helpers/V4SwapHelper.sol
    - contracts/test/instrument/LongGammaWrapperBase.sol
  modified: []

key-decisions:
  - "V4SwapHelper mirrors V4LpHelper's import set + unlock/settle shape exactly; only the mutation differs (manager.swap vs manager.modifyLiquidity). SwapParams is IPoolManager.SwapParams; price limits are TickMath MIN/MAX_SQRT_PRICE +/- 1 so the full amountSpecified executes"
  - "addLeg's _width param is int24, not the uint8 CHUNK_WIDTH constant — cast int24(uint24(CHUNK_WIDTH)) at both call sites (the seam test passed an untyped literal 2 which converts implicitly; a uint8 constant does not)"
  - "Seller seeded with isLong=0 at STRIKE_OFFSET=2000 OTM, width=2 (tickSpacing-aligned), SELLER_SIZE=10 ether >= LONG_SIZE=1 ether, both far below the 1,000,000-ether full-range seed so _validateSolvency clears"
  - "Smoke-verified the base on the live Base fork via a throwaway test (deleted post-gate): deploy + seed + numberOfLegs(seller)>0 + ct shares>0 + _closeSellerShort -> numberOfLegs==0 all green"

requirements-completed: [WRAP-02, WRAP-03]

# Metrics
duration: 5min
completed: 2026-06-02
---

# Phase 8 Plan 02: LongGammaWrapper Wave-0 Test Harness Summary

**Shipped the two Wave-0 harness files every behavioral unit depends on: `V4SwapHelper` (the swap-based deterministic fee generator that moves `feeGrowthInside` so streamia is observable) and `LongGammaWrapperBase` (the M-3 base that deploys the borrowed V2 stack + cCOP/USDC pool and seeds a closeable same-chunk seller short — the WRAP-02 hard prerequisite) — forge build green, smoke-verified live on the Base fork, swap seam intact (panoptic-borrowed==0).**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-06-02T20:22Z
- **Completed:** 2026-06-02T20:26Z
- **Tasks:** 2
- **Files modified:** 2 (2 created, 0 modified)

## Accomplishments
- `V4SwapHelper.sol` — an `IUnlockCallback -> PoolManager.swap` helper (swap analogue of the Phase-7 `V4LpHelper`). `swapExactIn(key, zeroForOne, amountSpecified)` moves `feeGrowthInside` so an in-range chunk earns LP fees: the WRAP-03 streamia source, since block advance alone accrues nothing (Pitfall 2). Inlined sync->transfer->settle / take settlement (no v4-core test settler util — 07-04 type-identity). `SwapParams` resolved as `IPoolManager.SwapParams`; price limits `TickMath.MIN_SQRT_PRICE+1` / `MAX_SQRT_PRICE-1`.
- `LongGammaWrapperBase.sol` — the M-3 deploy-isolation base. Forks Base @46700000, runs `PanopticV2DeployHelper.deployPanopticV2()` behind the base (so units that EXTEND it import no borrowed concrete and no helper — grep-guard `panoptic-borrowed==0`), rebuilds the swap `PoolKey` (fee 500, hookless), wires a `V4SwapHelper`, and **seeds a SELLER SHORT** (isLong=0, size 10 ether >= the 1-ether long) at the OTM tickSpacing-aligned chunk via `pool.dispatch` — the WRAP-02 prerequisite that prevents `NotEnoughLiquidityInChunk()`.
- Shared helpers for Plans 03-06: `_longTokenId()` (the wrapper's long at the SAME chunk as the seller short), `_oneLegArgs(id, size)` (length-1 dispatch arrays), and `_closeSellerShort()` (burns the short to free the pool-wide `maxRedeem` cap before the wrapper's claim, B4). Seller tokenId + address exposed for that close.
- Smoke-verified the base on the live Base fork (throwaway test, deleted post-gate): deploy handles populated, `numberOfLegs(seller) > 0`, seller holds ct0/ct1 4626 shares, and `_closeSellerShort()` drops `numberOfLegs(seller)` to 0 — proving the seed + B4 close path end-to-end.

## Task Commits

1. **Task 1: V4SwapHelper deterministic fee generator** - `5dfc838` (feat)
2. **Task 2: LongGammaWrapperBase M-3 base + seeded closeable seller short** - `501fb78` (feat)

## Files Created/Modified
- `contracts/test/instrument/helpers/V4SwapHelper.sol` - IUnlockCallback->PoolManager.swap fee generator (created)
- `contracts/test/instrument/LongGammaWrapperBase.sol` - M-3 base, seller-short seed, swap-helper wiring, shared one-leg/long/close helpers (created)

## Decisions Made
- **`addLeg` width cast.** `addLeg`'s `_width` parameter is `int24`; the plan's `CHUNK_WIDTH` is a `uint8` constant, and Solidity allows no implicit `uint8 -> int24` conversion (the seam test got away with an untyped literal `2`). Cast `int24(uint24(CHUNK_WIDTH))` at both `addLeg` call sites — semantically identical, build-clean.
- **`SwapParams` / TickMath names confirmed against the installed v4-core.** `SwapParams` is a member struct of `IPoolManager` (so `IPoolManager.SwapParams`), `swap(PoolKey, SwapParams, bytes)` returns a single `BalanceDelta`, and the constants are `MIN_SQRT_PRICE`/`MAX_SQRT_PRICE` (not the older `*_RATIO`). The plan flagged both as build-time conformance checks; both matched.
- **Smoke test as the gate, then removed.** Since the base is `abstract`, a throwaway concrete drove `setUp()` against the fork to prove the seed; it was deleted before commit because Plans 03-06 supply the real behavioral units. The base itself carries no test assertions (shared substrate only).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `int24(uint24(CHUNK_WIDTH))` cast at both addLeg sites**
- **Found during:** Task 2
- **Issue:** `forge build` failed `Error (9553): Invalid implicit conversion from uint8 to int24` because `addLeg(..., int24 _width)` was passed the `uint8 CHUNK_WIDTH` constant. The seam test passes a bare literal `2` (an untyped rational that converts); a typed `uint8` does not.
- **Fix:** Cast `int24(uint24(CHUNK_WIDTH))` at the `_seedSellerShort` and `_longTokenId` call sites.
- **Files modified:** contracts/test/instrument/LongGammaWrapperBase.sol
- **Verification:** `forge build` exit 0.
- **Committed in:** `501fb78` (Task 2 commit)

**2. [Rule 3 - Blocking] Reworded NatSpec to drop the literal `panoptic-borrowed` token (grep-guard)**
- **Found during:** Task 2
- **Issue:** A NatSpec line literally containing `panoptic-borrowed` (describing the seam) made `grep -c panoptic-borrowed` return 1 instead of the AC-required 0 — the same swap-seam grep-guard trap resolved in 08-01.
- **Fix:** Rephrased to "borrowed-Panoptic concrete contract" — no `panoptic-borrowed` literal. The seam is genuinely intact (the base reaches the pool only via `IPanopticData`; deploy coupling goes through the helper, exactly as `PanopticDataSeamBase`).
- **Files modified:** contracts/test/instrument/LongGammaWrapperBase.sol
- **Verification:** `grep -c panoptic-borrowed` == 0; `forge build` exit 0.
- **Committed in:** `501fb78` (Task 2 commit)

**3. [Rule 3 - Formatting] Single-lined the V4SwapHelper `swapExactIn` signature + reworded settler comments**
- **Found during:** Task 1
- **Issue:** (a) The plan's literal `swapExactIn(...)` grep AC requires the full signature on one line; my initial version wrapped it across lines. (b) The `grep -c CurrencySettler == 0` AC failed because three NatSpec comments mentioned `CurrencySettler` by name (the intent of the AC is "no settler-util dependency", not "the word never appears").
- **Fix:** Collapsed the signature to one line; reworded the three comments to "v4-core test settler util" so the literal token is absent.
- **Files modified:** contracts/test/instrument/helpers/V4SwapHelper.sol
- **Verification:** the literal-signature grep matches; `grep -c CurrencySettler` == 0; `forge build` exit 0.
- **Committed in:** `5dfc838` (Task 1 commit)

---

**Total deviations:** 3 auto-fixed (all Rule 3 — one genuine compile fix, two formatting/grep-guard fixes to satisfy the plan's own literal acceptance criteria). No scope change; no behavioral surface added — still pure Wave-0 harness substrate.

## Issues Encountered
- None beyond the three auto-fixed deviations. The Base fork RPC (`BASE_RPC_URL` in `contracts/.env`, resolved via `[rpc_endpoints] base`) was reachable; the smoke run finished in ~2 s.

## User Setup Required
None — no external service configuration required.

## Next Phase Readiness
- Plans 03-06 now extend `LongGammaWrapperBase`: the borrowed V2 stack + cCOP/USDC pool is deployed, the long counterparty (seller short) is seeded at the wrapper's target chunk, the `V4SwapHelper` generates observable fees, and `_longTokenId`/`_oneLegArgs`/`_closeSellerShort` are shared — no unit re-derives deploy or seed logic.
- Open item carried for the behavioral plans (per CONTEXT/RESEARCH, not this plan's scope): the exact swap amount + direction that lands the OTM chunk in fee-range so `longPremium` is non-zero (Pitfall 4 tension — mint OTM then swap into range) is to be prototyped against the fork in the streamia unit (Plan 03).

---
*Phase: 08-longgammawrapper-cash-flow*
*Completed: 2026-06-02*

## Self-Check: PASSED

Both created files exist on disk (`V4SwapHelper.sol`, `LongGammaWrapperBase.sol`); both task commit hashes (`5dfc838`, `501fb78`) are present in git history. `forge build` green; smoke test green on the live Base fork; swap seam intact (`panoptic-borrowed==0`).
