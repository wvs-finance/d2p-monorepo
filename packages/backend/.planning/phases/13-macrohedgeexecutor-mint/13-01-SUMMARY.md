---
phase: 13-macrohedgeexecutor-mint
plan: 01
subsystem: infra
tags: [foundry, panoptic-v2, uniswap-v4, poolid, polygon, wcop-usdc, bulloak, evm-tdd]

# Dependency graph
requires:
  - phase: 07-base-fork-harness
    provides: PoolIdMappersLib.panopticPoolIdFromUniV4PoolId + the vegoid=4 RiskEngine constant (07-05 §G)
  - phase: 13-macrohedgeexecutor-mint (demo)
    provides: DemoMacroHedgeExecutor.fork.t.sol runtime wcopUsdcKey (the key this constant must reproduce)
provides:
  - "PolygonPools.wcopUsdcKey() — the canonical wCOP/USDC PoolKey getter (currency0=USDC 6dp, currency1=wCOP 18dp, fee 3000, tickSpacing 60, hookless)"
  - "PolygonPools.POLYGON_WCOP_USDC_POOL_ID() — the STRAT-02 anchor PoolId, proven == the demo's runtime wcopUsdcKey.toId()"
  - "IMacroThesis confirmed compiling as a marker interface (HedgeLegParams.economicTheory types against it; demo passes IMacroThesis(address(0)))"
  - "foundry.toml caches polygon (chain 137) fork-state so rapid Plan-02 executor fork runs do not 429 (Pitfall 6)"
affects: [13-02-executor-promotion, 12-strategist-strat-02, macrohedgeexecutor-mint]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Function-returning PoolKey/PoolId anchor (not a constant state var — PoolKey/PoolId are not compile-time constant-expressible)"
    - "Stable pool-id constant anchors both agents to the cornerstone pool by value, never a recomputed keccak"

key-files:
  created:
    - contracts/src/libraries/PolygonPools.sol
    - contracts/test/instrument/PolygonPools.tree
    - contracts/test/instrument/PolygonPools.t.sol
    - contracts/src/interfaces/IMacroThesis.sol
  modified:
    - contracts/foundry.toml

key-decisions:
  - "POLYGON_WCOP_USDC_POOL_ID is a pure function returning wcopUsdcKey().toId(), not a constant state var (PoolKey/PoolId not constant-expressible) — matches RESEARCH §4"
  - "IMacroThesis stays an empty marker interface (resolver never reads economicTheory; concrete shape is Phase-12 STRAT-01) — no edit needed, confirmed compiling"
  - "Currency ordering currency0=USDC (0x3c49…) < currency1=wCOP (0x8a1D…) reproduced verbatim from the demo — any drift breaks the whole TokenId derivation"

patterns-established:
  - "Pool-id anchor: a shared library function returns the cornerstone PoolKey + its PoolId so Agent 1 and Agent 2 reference a stable value (STRAT-02 dissolution)"

requirements-completed: [EXEC-01]

# Metrics
duration: 4min
completed: 2026-06-06
---

# Phase 13 Plan 01: PolygonPools wCOP/USDC pool-id anchor Summary

**The STRAT-02 anchor shipped: `POLYGON_WCOP_USDC_POOL_ID()` returns a PoolId proven equal to the demo's runtime `wcopUsdcKey.toId()` (currency0=USDC 6dp, currency1=wCOP 18dp, fee 3000, tickSpacing 60, hookless), `IMacroThesis` confirmed compiling as a marker, and foundry.toml now caches Polygon (137) against 429s.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-06-06T19:20:51Z
- **Completed:** 2026-06-06T19:24:12Z
- **Tasks:** 3
- **Files modified:** 5 (4 created, 1 modified)

## Accomplishments
- `PolygonPools.sol`: `wcopUsdcKey()` reproduces the demo key EXACTLY and `POLYGON_WCOP_USDC_POOL_ID()` returns its `.toId()` — the stable anchor Plan 02's executor (and Agent 1, STRAT-02) reference instead of a runtime keccak.
- Co-located BTT unit test (`PolygonPools.tree` → `PolygonPools.t.sol`) proves all four observable claims: currency ordering USDC<wCOP, fee/tickSpacing/hooks, `constant == demo localKey.toId()`, and `panopticPoolIdFromUniV4PoolId(constant, 4, 60) == panopticPoolIdFromUniV4PoolId(localKey.toId(), 4, 60)`. 3/3 PASS.
- `IMacroThesis` confirmed compiling as an empty marker interface — `forge build` exit 0, no edit needed.
- `foundry.toml` `rpc_storage_caching` now caches chain 137 (additive; Base/8453 retained) so Plan 02's Polygon fork test reruns cheaply (Pitfall 6).

## Task Commits

Each task was committed atomically (Iron-Law ancestry: tree before impl):

1. **Task 1: BTT .tree for the PoolId constant** - `3de3c5e` (test)
2. **Task 2: PolygonPools library + IMacroThesis compile-stub + unit test** - `a91a708` (feat)
3. **Task 3: Add polygon (137) to foundry.toml rpc_storage_caching** - `ebea287` (chore)

**Plan metadata:** _final docs commit below_

_Iron-Law ancestry verified: `3de3c5e` (tree) is an ancestor of `a91a708` (impl+test). The sibling 13-03 commit `e3b9dc4` (OperationalCostManagement.tree) landed between them — parallel Wave-1 execution, not this plan's work._

## Files Created/Modified
- `contracts/src/libraries/PolygonPools.sol` - `wcopUsdcKey()` canonical PoolKey getter + `POLYGON_WCOP_USDC_POOL_ID()` PoolId anchor (STRAT-02)
- `contracts/test/instrument/PolygonPools.tree` - BTT spec (bulloak 0.9.2 when/it keyword form, root `PolygonPoolsTest`)
- `contracts/test/instrument/PolygonPools.t.sol` - co-located unit proof; constant round-trips the demo key, mapping matches, currency ordering correct
- `contracts/src/interfaces/IMacroThesis.sol` - empty marker interface, confirmed compiling (committed with the substrate so Plan 02 can import it)
- `contracts/foundry.toml` - `rpc_storage_caching` chains `[8453, 137]` (added Polygon)

## Decisions Made
- **`POLYGON_WCOP_USDC_POOL_ID` is a `pure function`, not a `constant` state var.** `PoolKey`/`PoolId` are not compile-time constant-expressible in Solidity, so the anchor is a function returning `wcopUsdcKey().toId()` — exactly the RESEARCH §4 recommendation.
- **`IMacroThesis` left as an empty marker.** The resolver never reads `economicTheory`; the concrete economic-school shape is Phase-12's STRAT-01. Phase 13 only needs it to compile (the demo passes `IMacroThesis(address(0))`). No edit was made.
- **Sample vegoid = 4 in the unit test.** The mapping is pure/deterministic, so the round-trip is proven by feeding the SAME vegoid to both the constant and the inline-rebuilt `localKey.toId()`; 4 is the 07-05 §G `RiskEngine.vegoid()` constant.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `assertLt` had no `address` overload for the currency-ordering assertion**
- **Found during:** Task 2 (writing `PolygonPools.t.sol`)
- **Issue:** `Currency.unwrap(...)` returns an `address`; `forge-std`'s `assertLt` only has `uint256`/`int256` overloads, so the first `forge build` failed with Error 9322 (no matching declaration after ADL).
- **Fix:** Cast both unwrapped currencies to `uint160` before `assertLt` (`assertLt(uint160(Currency.unwrap(key.currency0)), uint160(Currency.unwrap(key.currency1)), …)`).
- **Files modified:** contracts/test/instrument/PolygonPools.t.sol
- **Verification:** `forge build` exit 0; the test then PASSED (the USDC<wCOP ordering holds numerically).
- **Committed in:** `a91a708` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** A standard forge-std type-overload fix in my own new test. No scope creep, no architectural change.

## Issues Encountered

- **Parallel-wave shared-compile blocker (coordination artifact, NOT a defect in this plan).** A full `forge test` / `forge build` over the whole `test/` tree fails to COMPILE because the sibling Wave-1 agent (plan 13-03) has an in-flight, not-yet-passing `test/instrument/OperationalCostManagement.t.sol` (untracked `??`, references `cummCostSomi()` on an `OperationalCostManagement.sol` that does not yet expose it). `--no-match-path` only filters execution, not compilation. **Resolution:** proved this plan's gates in isolation by scoping the compile with `FOUNDRY_TEST=test/instrument/PolygonPools.t.sol` (a test-selection env var, not a code change), which compiles only this test's source closure. All four of THIS plan's gates are genuinely green: `forge build` exit 0, `bulloak check` exit 0, the 3 PolygonPools tests PASS, and foundry.toml caches 137. The whole-tree compile will go green again once 13-03 finishes its impl — out of scope for this plan (the coordination note forbids touching the sibling's files).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- **Plan 02 (executor promotion) is unblocked:** the `POLYGON_WCOP_USDC_POOL_ID()` anchor is committed, `IMacroThesis` compiles, and the Polygon fork-state cache is in place for cheap fork reruns.
- **No blockers.** The only open item is the cross-agent whole-tree compile, which resolves when the parallel 13-03 plan lands its `OperationalCostManagement.sol` impl.

## Self-Check: PASSED

All claimed artifacts verified on disk + in git history:
- Files: `PolygonPools.sol`, `PolygonPools.tree`, `PolygonPools.t.sol`, `IMacroThesis.sol`, `foundry.toml`, `13-01-SUMMARY.md` — all FOUND.
- Commits: `3de3c5e` (tree), `a91a708` (impl+test), `ebea287` (foundry.toml) — all FOUND.
- Gates re-run green: `forge build` exit 0, `bulloak check test/instrument/PolygonPools.tree` exit 0, 3/3 PolygonPools tests PASS, `grep 137 foundry.toml` matches.

---
*Phase: 13-macrohedgeexecutor-mint*
*Completed: 2026-06-06*
