---
phase: 07-base-fork-borrowed-panoptic-v2-ccop-usdc-pool
plan: 04
subsystem: ccop-usdc-univ4-pool-deploy-and-read
tags: [base-fork, uniswap-v4, poolmanager, initialize, modifyliquidity, unlockcallback, v4statereader, statelibrary, sqrtpricex96, bulloak, btt, fork-02]

requires:
  - phase: 07-02
    provides: "panoptic-borrowed/libraries/V4StateReader.sol (getSqrtPriceX96(IPoolManager, PoolId)) + test/mocks/MockCcop.sol (18-dp mintable mock cCOP)"
  - phase: 07-03
    provides: "Base-fork pattern: vm.createSelectFork(rpcUrl(\"base\"), BASE_FORK_BLOCK=46700000) under cancun/0.8.24; live PoolManager 0x498581…2b2b; bulloak 0.9.2 same-dir .tree↔.t.sol rule"
provides:
  - "contracts/test/instrument/CcopUsdcPool.t.sol — deploys MockCcop, builds a hookless cCOP/USDC PoolKey, PoolManager.initialize, LPs full-range liquidity, reads sqrtPriceX96>0 (V4StateReader) + liquidity>0 (StateLibrary), asserts the decoded human rate in [3000,5000] (FORK-02 proof)"
  - "contracts/test/instrument/helpers/PoolKeyLib.sol — shared buildCcopUsdcKey(ccop, usdc) → (PoolKey, sqrtPriceX96, ccopIsCurrency0) with RUNTIME currency ordering (mn-C; reused by Plan 05) + decodeHumanRate inverse"
  - "contracts/test/instrument/helpers/V4LpHelper.sol — minimal IUnlockCallback → PoolManager.modifyLiquidity full-range LP, settling the BalanceDelta via inlined sync/transfer/settle + take (M-1)"
  - "contracts/test/instrument/CcopUsdcPool.tree — committed BTT spec (one behavioral unit), per-file bulloak-clean"
affects:
  - "Plan 05 (seam test): reuses PoolKeyLib.buildCcopUsdcKey for an IDENTICAL PoolKey + ordering; factory.deployNewPool requires the UniV4 pool initialized + seeded (this plan does both)"
  - "Phase 8 (LongGammaWrapper streamia): reads pool state via the same V4StateReader/StateLibrary path; needs the seeded full-range liquidity (1_000_000 ether) to exist"

tech-stack:
  added: []
  patterns:
    - "Shared PoolKey + sqrtPriceX96 builder (PoolKeyLib) determines currency0/currency1 SOLELY by runtime address comparison so two Solidity files (Plan 04, Plan 05) get byte-identical ordering — there is no cross-file constant import in Solidity (mn-C)"
    - "sqrtPriceX96 bakes the 6dp-USDC vs 18dp-cCOP decimal gap (1e12) into the RAW-unit price branching on ccopIsCurrency0; a decodeHumanRate inverse round-trips it to [3000,5000], catching a 1e12 ordering error that assertGt(sqrtP,0) silently misses (mn-3)"
    - "Full-range LP via a minimal IUnlockCallback helper (modifyLiquidity inside unlock, settle the owed BalanceDelta) — NOT PositionManager Actions-encoding, NOT SFPMV4.mintTokenizedPosition (needs SFPM.initializeAMMPool, not run yet) (M-1)"
    - "BalanceDelta settled with INLINED sync→transfer→settle / take instead of v4-core's test-util CurrencySettler, because CurrencySettler's relative imports (../../src/...) produce a DISTINCT compiler type from the v4-core/ remapped Currency/IPoolManager (type-identity clash) — inlining sidesteps it entirely"

key-files:
  created:
    - "contracts/test/instrument/CcopUsdcPool.tree"
    - "contracts/test/instrument/CcopUsdcPool.t.sol"
    - "contracts/test/instrument/helpers/PoolKeyLib.sol"
    - "contracts/test/instrument/helpers/V4LpHelper.sol"
  modified: []

key-decisions:
  - "Tree + test co-located in test/instrument/ as CcopUsdcPool.tree ↔ CcopUsdcPool.t.sol (NOT test/spec/ + CcopUsdcPool.fork.t.sol as the plan's files_modified listed): bulloak 0.9.2 matches the .t.sol STRICTLY same-dir as the .tree AND by stem (<stem>.tree ↔ <stem>.t.sol — the .fork. infix breaks the match). This is the documented same-dir rule from 07-03; co-location makes per-file bulloak check exit 0. The required FORK-02 test name test_ccopUsdcPool_initialized_state_readable is kept verbatim inside the bulloak-matched contract."
  - "sqrtPriceX96 encodes HUMAN_RATE = 4000 cCOP per 1 USD (mid-band of [3000,5000]); the bulloak branch fns delegate to the single test_ccopUsdcPool_initialized_state_readable proof so the BTT mapping stays 1:1 while one test exercises the whole deploy→read→round-trip→LP flow."
  - "Inlined the BalanceDelta settlement (sync/transfer/settle + take) in V4LpHelper rather than importing v4-core/test/utils/CurrencySettler.sol — the latter's ../../src/ relative imports resolve to a different compiler type than the v4-core/-remapped Currency/IPoolManager, yielding 'invalid implicit conversion from Currency to Currency' errors; inlining is faithful (same sync→transfer→settle sequence) and dependency-free."

patterns-established:
  - "PoolKeyLib is the single source of truth for the cCOP/USDC PoolKey + sqrtPriceX96 + currency ordering across Plans 04/05"
  - "V4LpHelper is the reusable full-range LP primitive for fork tests until SFPM-mediated LP is available"

requirements-completed: [FORK-02]

duration: ~40min
completed: 2026-06-02
---

# Phase 7 Plan 04: cCOP/USDC UniV4 Pool Deploy + State Read Summary

**Deployed our OWN hookless cCOP/USDC UniV4 pool on the Base fork (`PoolManager.initialize` at ~1/4000), seeded 1,000,000-ether full-range liquidity via a minimal `IUnlockCallback`→`modifyLiquidity` helper, and proved a consumer reads `sqrtPriceX96 > 0` (borrowed `V4StateReader`) + `liquidity > 0` (v4-core `StateLibrary`) AND round-trips the decoded price through the runtime currency ordering + 6dp/18dp scale to a human cCOP/USD rate of ~4000 ∈ [3000,5000] — `test_ccopUsdcPool_initialized_state_readable` is GREEN against the Base fork (FORK-02).**

## Performance

- **Duration:** ~40 min
- **Completed:** 2026-06-02
- **Tasks:** 2/2
- **Files created:** 4 (`CcopUsdcPool.tree`, `CcopUsdcPool.t.sol`, `helpers/PoolKeyLib.sol`, `helpers/V4LpHelper.sol`)

## Accomplishments

**Task 1 — SPECIFY: `.tree` committed FIRST (mn-B / evm-tdd Iron Law)**
- `CcopUsdcPool.tree`: one behavioral unit (`initializeAndReadState`) — initialize the hookless PoolKey at sqrtPriceX96 ~ cCOP/USD 1/4000, read `sqrtPriceX96 > 0`, round-trip to a human rate in [3000,5000], and LP full-range so `liquidity > 0`. Branch text stripped of `/`, `(`, and mid-text `.` (bulloak 0.9.2 rejects those as identifiers).
- Committed in a **separate commit (`b593c0f`) BEFORE** the scaffolded test (`51e0e31`) — Iron-Law ordering, verifiable in git history.
- `bulloak scaffold` → `CcopUsdcPool.t.sol` (un-renamed branch fns), then added the verbatim FORK-02 test name `test_ccopUsdcPool_initialized_state_readable`, the BTT spec tag, the Base address constants (no StateView — B-2), and the pinned `BASE_FORK_BLOCK`. At SPECIFY the bodies were `revert(...)` stubs that FAIL.

**Task 2 — IMPLEMENT: PoolKeyLib + V4LpHelper + green fork test (`b49269c`)**
- `PoolKeyLib.buildCcopUsdcKey(ccop, usdc)` determines `ccopIsCurrency0 = ccop < usdc` at RUNTIME, orders `(currency0, currency1)` ascending, builds the hookless `PoolKey{fee:500, tickSpacing:10, hooks:address(0)}`, and computes `sqrtPriceX96 = floor(sqrt(price·2^192))` with `price = amount1/amount0` baking the 1e12 decimal gap, branching on the ordering. `decodeHumanRate` is the exact inverse used by the round-trip assertion.
- `V4LpHelper` (M-1): `addFullRangeLiquidity` → `manager.unlock(...)`; `unlockCallback` rounds full-range ticks to `tickSpacing`, calls `manager.modifyLiquidity`, and settles the owed `BalanceDelta` per currency via inlined `sync → IERC20Minimal.transfer → settle` (debt) / `take` (credit).
- `CcopUsdcPool.t.sol`: forks Base at 46700000, deploys `MockCcop`, builds the key via `PoolKeyLib`, `PoolManager.initialize`, reads `sqrtPriceX96 > 0` via `V4StateReader.getSqrtPriceX96`, asserts the decoded rate ∈ [3000,5000], deploys+funds `V4LpHelper`, LPs `1_000_000 ether` full-range liquidity, and asserts `StateLibrary.getLiquidity(id) > 0`. All 4 tests in the suite pass against the fork.

## sqrtPriceX96 + seeded-liquidity record (plan-required — Plan 05 sizes against this)

- **Target human rate:** `HUMAN_RATE = 4000` cCOP per 1 USD (`PoolKeyLib.HUMAN_RATE`), decimal gap `DECIMAL_GAP = 1e12` (18dp cCOP vs 6dp USDC).
- **sqrtPriceX96 literals (runtime-selected by ordering):**
  - cCOP is **currency0** (`address(ccop) < BASE_USDC`): `sqrtPriceX96 = 1252707241875239655932` → decodes to **4000**.
  - cCOP is **currency1** (`address(ccop) > BASE_USDC`): `sqrtPriceX96 = 5010828967500958623728276031392126461` → decodes to **3999**.
  - Both are within v4 valid sqrtPrice bounds; both land inside [3000,5000].
- **Seeded full-range liquidity:** `SEEDED_LIQUIDITY = 1_000_000 ether` (`= 1_000_000 * 1e18 = 1000000000000000000000000`), minted full-range (ticks `MIN/MAX_TICK` rounded to `tickSpacing=10`).
- **Helper funding (per token, both currencies):** `FUND_AMOUNT = type(uint128).max` (`340282366920938463463374607431768211455`) — `deal(BASE_USDC, lp, FUND_AMOUNT)` + `ccop.mint(lp, FUND_AMOUNT)` before `unlock`. Ample for the full-range delta in either ordering.

> **Plan 05 sizing guidance:** size its single mint's required liquidity FAR below `1_000_000 ether` so `_validateSolvency` clears against this seed (per 07-RESEARCH-DEPLOY §D).

## Deviations from Plan

### Auto-fixed / blocking-resolution

**1. [Rule 3 — Blocking] Tree + test co-located in `test/instrument/` as `CcopUsdcPool.tree` ↔ `CcopUsdcPool.t.sol` (bulloak 0.9.2 stem + same-dir rule)**
- **Found during:** Task 1, first `bulloak check`.
- **Issue:** The plan's `files_modified` lists `test/spec/CcopUsdcPool.tree` + `test/instrument/CcopUsdcPool.fork.t.sol`. bulloak 0.9.2 matches the `.t.sol` STRICTLY same-dir as the `.tree` AND by stem (`<stem>.tree` ↔ `<stem>.t.sol`); both a different directory AND the `.fork.` infix break the match → `bulloak check` exits 1. The plan's `bulloak check ... exits 0` acceptance is unsatisfiable as-laid-out.
- **Fix:** Co-located both under `test/instrument/` and named the test `CcopUsdcPool.t.sol` (stem-match). This is the documented same-dir reality from 07-03's SUMMARY (environment note: "Co-locate the `.tree` with its test file (e.g. both under `test/instrument/`)"). Per-file `bulloak check test/instrument/CcopUsdcPool.tree` now exits 0; the required FORK-02 test name and spec tag are preserved.
- **Files:** `contracts/test/instrument/CcopUsdcPool.tree`, `contracts/test/instrument/CcopUsdcPool.t.sol`.
- **Commit:** `b593c0f` (tree), `51e0e31` (scaffold).

**2. [Rule 3 — Blocking] Inlined BalanceDelta settlement instead of v4-core `CurrencySettler` (type-identity clash)**
- **Found during:** Task 2 first `forge build`.
- **Issue:** Importing `v4-core/../test/utils/CurrencySettler.sol` and using its `settle`/`take` produced `Error (9553): Invalid implicit conversion from Currency to Currency` / `from IPoolManager to IPoolManager`. CurrencySettler imports `Currency`/`IPoolManager` via relative `../../src/...` paths; forge resolves those to a DISTINCT compiler type from the `v4-core/`-remapped types my helper uses, even though they are the same file on disk.
- **Fix:** Removed the CurrencySettler dependency and inlined the identical settlement sequence in `V4LpHelper._settleOrTake`: for a debt, `manager.sync(currency)` → `IERC20Minimal(currency).transfer(address(manager), owed)` → `manager.settle()`; for a credit, `manager.take(currency, this, amount)`. Faithful to CurrencySettler's logic, dependency-free.
- **Files:** `contracts/test/instrument/helpers/V4LpHelper.sol`.
- **Commit:** `b49269c`.

### Out-of-scope (NOT fixed — logged)
- The plan's Task-1 full-glob acceptance `bulloak check test/spec/*.tree` is N/A here: my tree lives in `test/instrument/`, and the pre-existing `test/spec/*.tree` (MacroOracle, SomniaAgentConsumer.*) remain bulloak-unparseable (`/`, `.` in branch text) exactly as documented in 07-03 — out of scope for FORK-02. My per-file check passes.
- `forge build` still emits pre-existing `named-struct-fields` / `unused-import` lint **notes** on out-of-scope `src/MacroOracle.sol` (build exits 0) — carried over, not fixed (scope boundary).
- An unrelated `../DRAFT.md` working-tree modification (repo root) was present before this plan and was NOT staged/committed (out of scope).

## Authentication Gates
None.

## Verification

- `forge build` → exits 0 (single cancun/0.8.24 profile). PASS.
- `forge test --match-test test_ccopUsdcPool_initialized_state_readable --fork-url "$BASE_RPC_URL"` → 1 passed / 0 failed (FORK-02 proof). PASS. Full file: 4/4 pass.
- `bulloak check test/instrument/CcopUsdcPool.tree` → exits 0 (per-file). PASS.
- `! grep -rq "StateView" test/instrument/CcopUsdcPool.t.sol` → PASS (B-2; read via V4StateReader + StateLibrary only).
- Greps: `initialize(`, `getSqrtPriceX96`, `assertGt`, `assertGe`+`assertLe`+`3000`+`5000`, `getLiquidity`, `modifyLiquidity`+`unlockCallback` (V4LpHelper), `function buildCcopUsdcKey`+runtime ordering (PoolKeyLib) → all PASS.
- `.tree` commit `b593c0f` precedes the scaffold/impl commits `51e0e31`/`b49269c` → PASS (mn-B / Iron-Law ordering).

## Self-Check: PASSED

- All 4 created files FOUND on disk.
- All 3 task commits FOUND in history: `b593c0f` (tree, Task 1a), `51e0e31` (scaffold, Task 1b), `b49269c` (impl, Task 2).
