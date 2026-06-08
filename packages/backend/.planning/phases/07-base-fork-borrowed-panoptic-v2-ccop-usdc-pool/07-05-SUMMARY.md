---
phase: 07-base-fork-borrowed-panoptic-v2-ccop-usdc-pool
plan: 05
subsystem: panoptic-v2-factory-deploy-and-ipanopticdata-mint-burn-seam
tags: [base-fork, panoptic-v2, cwia, clones-with-immutable-args, factory, deploynewpool, ipanopticdata, ierc4626, tokenid, dispatch, mint-burn, fork-03, bulloak, btt]

requires:
  - phase: 07-02
    provides: "panoptic-borrowed/ (PanopticPool, CollateralTracker, SemiFungiblePositionManagerV4, RiskEngine, PanopticFactoryV4 + base/tokens/libraries/types) + src/instrument/interfaces/IPanopticData.sol + test/mocks/MockCcop.sol"
  - phase: 07-04
    provides: "test/instrument/helpers/PoolKeyLib.sol (buildCcopUsdcKey runtime ordering, mn-C) + helpers/V4LpHelper.sol (full-range LP, M-1) + SEEDED_LIQUIDITY=1_000_000 ether + sqrtPriceX96 literals"
provides:
  - "contracts/test/instrument/helpers/PanopticV2DeployHelper.sol — REAL CWIA factory-choreography deploy: master copies (new PanopticPool/CollateralTracker) + RiskEngine + PanopticFactoryV4 (§B verbatim ctors) → own MockCcop + FRESH PoolKey via PoolKeyLib → PoolManager.initialize → V4LpHelper full-range seed → factory.deployNewPool; returns a seam-safe Deployed struct (pool address + ct0/ct1 as IERC4626 + token0/token1/ccop + poolId + tickSpacing)"
  - "contracts/test/instrument/PanopticDataSeamBase.sol — M-3 deploy-isolation base: forks Base, runs the helper, hands the seam test ONLY seam-safe types (address pool, IERC4626 ct0/ct1, plain-address tokens, uint64 poolId)"
  - "contracts/test/instrument/PanopticDataSeam.fork.t.sol — FORK-03 seam test: mint+burn ONE position through IPanopticData only; ct0/ct1 deposited via IERC4626 (B-1); imports NEITHER panoptic-borrowed NOR PanopticV2DeployHelper"
  - "contracts/test/instrument/PanopticDataSeam.fork.tree — committed BTT spec (one behavioral unit), per-file bulloak-clean"
affects:
  - "Phase 8 (LongGammaWrapper): the wrapper owns a position deployed exactly like this helper does; mint/burn flow + IERC4626 collateral deposit + concrete OTM TokenId construction are the reusable substrate"
  - "Phase 8/9: the IPanopticData swap seam is now proven at RUNTIME (not just compile-time) — a future canonical V2 deployment drops in by repointing the IPanopticData address; ct0/ct1 stay IERC4626"

tech-stack:
  added: []
  patterns:
    - "Panoptic V2 working pool comes EXCLUSIVELY from PanopticFactory.deployNewPool (the contracts are ClonesWithImmutableArgs proxies); the only `new PanopticPool`/`new CollateralTracker` are the master copies the factory clones (poolReference/collateralReference)"
    - "M-3 deploy isolation: a base contract (PanopticDataSeamBase) absorbs ALL deploy coupling (imports the helper + concretes transitively) and hands the seam test ONLY seam-safe types, so the seam test imports NEITHER panoptic-borrowed NOR the helper — both static grep guards hold while the pool is still really deployed"
    - "B-1 collateral seam: ct0/ct1 are typed IERC4626 (from @openzeppelin/contracts/interfaces/IERC4626.sol, which HAS deposit(uint256,address)) so .deposit() is reachable WITHOUT importing the concrete CollateralTracker (which would pull panoptic-borrowed and break the seam)"
    - "A single-sided OUT-OF-THE-MONEY short leg (strike pushed +2000 ticks above the current tick, tickSpacing-aligned, width=2) mints cleanly on a full-range-seeded pool: it avoids the active-tick straddle whose mint-time swap underflows the SFPM's ERC6909-claim burn"
    - "poolId handed across the seam as a plain uint64 (IPanopticData deliberately omits poolId()) lets the seam test build a concrete TokenId via the @types/TokenId.sol value-type builder without importing the concrete pool"

key-files:
  created:
    - "contracts/test/instrument/PanopticDataSeam.fork.tree"
    - "contracts/test/instrument/PanopticDataSeam.fork.t.sol"
    - "contracts/test/instrument/PanopticDataSeamBase.sol"
    - "contracts/test/instrument/helpers/PanopticV2DeployHelper.sol"
  modified: []

key-decisions:
  - "Tree co-located in test/instrument/ as PanopticDataSeam.fork.tree ↔ PanopticDataSeam.fork.t.sol (NOT the plan's test/spec/PanopticDataSeam.tree). bulloak 0.9.2 matches the .t.sol STRICTLY same-dir AND by full stem (PanopticDataSeam.fork.tree → PanopticDataSeam.fork.t.sol, verified by probe), so the plan's split (tree in test/spec/, .fork.t.sol in test/instrument/) is unsatisfiable — identical to the 07-04 deviation. Per-file `bulloak check` exits 0. The full-glob `bulloak check test/spec/*.tree` stays a non-gate here (pre-existing un-parseable MacroOracle/SomniaAgentConsumer trees, documented out-of-scope in STATE/07-03/07-04)."
  - "M-3 implemented as a SEPARATE base file (PanopticDataSeamBase.sol) that the seam test extends. The base imports PanopticV2DeployHelper; the seam test imports only the base (`import {PanopticDataSeamBase} from \"./PanopticDataSeamBase.sol\"` matches NEITHER forbidden grep pattern). This keeps the pool genuinely deployed while both seam guards hold on the seam test file."
  - "Short leg made OUT OF THE MONEY (STRIKE_OFFSET=+2000 ticks, width=2). The at-the-money strike (the plan's literal `getCurrentTick/tickSpacing*tickSpacing`) straddled the active tick and reverted the mint with arithmetic underflow (0x11) inside the SFPM's PoolManager.burn of ERC6909 claims — the in-the-money short needs both tokens swapped at mint and overdrew the claim balance. An OTM single-sided short mints/burns cleanly against the full-range seed."
  - "addLeg width changed from the plan's `1` to `2`. getRangesFromStrike returns r=(width*tickSpacing)/2; with width=1, tickSpacing=10 ⇒ r=5 ⇒ chunk ticks strike±5 are NOT multiples of tickSpacing ⇒ Errors.InvalidTickBound(). width=2 ⇒ r=10 ⇒ ticks strike±10 are tickSpacing-aligned. addLeg arg order (self, legIndex, optionRatio, asset, isLong, tokenType, riskPartner, strike, width) confirmed verbatim against the vendored TokenIdLibrary @fe55774."
  - "deployPanopticV2 returns a single Deployed struct (not 8 named returns) and splits infra deploy into _deployInfra(); the flat 8-return form hit Stack-too-deep under the non-viaIR cancun/200-runs profile. Struct return + a {}-scoped V4LpHelper block keeps the stack within bounds without enabling viaIR."

patterns-established:
  - "PanopticV2DeployHelper is the reusable factory-choreography deploy primitive for Phase 8+ (the LongGammaWrapper deploys its pool the same way)"
  - "PanopticDataSeamBase is the reusable M-3 deploy-isolation pattern: keep deploy coupling in a base, expose only seam-safe types to interface-only consumers"

requirements-completed: [FORK-03]

duration: ~35min
completed: 2026-06-01
---

# Phase 7 Plan 05: Panoptic V2 Factory Deploy + IPanopticData Mint/Burn Seam Summary

**Factory-deployed the borrowed Panoptic V2 stack on the Base fork (CWIA master copies + RiskEngine + `PanopticFactoryV4` with §B-verbatim constructors → own MockCcop + a fresh `PoolKeyLib` cCOP/USDC `PoolKey` → `PoolManager.initialize` → `V4LpHelper` 1,000,000-ether full-range seed → `factory.deployNewPool`), then minted and burned ONE position through `IPanopticData` only — `dispatch` mint (PositionBalance==0), `getAccumulatedFeesAndPositionsData` reads a `PositionBalance[]` of length 1, `dispatch` size-0 burn drops it back to length 0 — with collateral deposited via `IERC4626` ct0/ct1 (B-1) and the seam test importing NEITHER `panoptic-borrowed` NOR the deploy helper. `test_mintBurn_single_position_through_IPanopticData` is GREEN on the Base fork (FORK-03).**

## Performance

- **Duration:** ~35 min
- **Completed:** 2026-06-01
- **Tasks:** 3/3
- **Files created:** 4 (`PanopticDataSeam.fork.tree`, `PanopticDataSeam.fork.t.sol`, `PanopticDataSeamBase.sol`, `helpers/PanopticV2DeployHelper.sol`)

## Accomplishments

**Task 1 — SPECIFY: `.tree` committed FIRST (mn-B / evm-tdd Iron Law) — `b7d26e1` then `88d6832`**
- `PanopticDataSeam.fork.tree`: one behavioral unit (`mintBurnThroughInterface`) — compile-time proof branch (helper-returned address consumed as `IPanopticData`), mint branch (dispatch with stored balance 0 ⇒ mint; read `PositionBalance[]` length 1), burn branch (dispatch size 0 ⇒ close). Branch text stripped of `/`/`(`/mid-text `.` (bulloak 0.9.2 identifier rules).
- Committed in a **separate commit (`b7d26e1`) BEFORE** the scaffolded test (`88d6832`) — Iron-Law ordering, verifiable in git history.
- `bulloak scaffold` → `PanopticDataSeam.fork.t.sol` (un-renamed branch fns), then added the verbatim required name `test_mintBurn_single_position_through_IPanopticData`, the BTT spec tag, and interface-only imports (`IPanopticData` + `IERC4626` + `IERC20Partial` + `@types` value types + the M-3 base — NO `panoptic-borrowed`, NO `PanopticV2DeployHelper`). At SPECIFY the proof reverted (RED, confirmed by `[FAIL: ... setUp not implemented (SPECIFY stage)]`).

**Task 2 — IMPLEMENT: factory-choreography deploy helper — `98c348b`**
- `PanopticV2DeployHelper.sol` runs the §B+§D choreography VERBATIM: `new SemiFungiblePositionManager(manager, 10**13, 10**13, 0)`; master copies `new PanopticPool(ISemiFungiblePositionManager(sfpm))` / `new CollateralTracker(10)`; `new PanopticFactory(sfpm, manager, poolReference, collateralReference, new bytes32[](0), new uint256[][](0), new Pointer[][](0))`; `new RiskEngine(10_000_000, 10_000_000, address(0), address(0))`.
- Per-pool (mn-C): own `MockCcop` → `PoolKeyLib.buildCcopUsdcKey` → `manager.initialize` → `V4LpHelper.addFullRangeLiquidity(1_000_000 ether)` → `factory.deployNewPool(poolKey, IRiskEngine(re), uint96(block.timestamp))`. The WORKING pool is EXCLUSIVELY `deployNewPool`'s return; the only `new PanopticPool` is `poolReference`. `vegoid` is read inside the factory as `re.vegoid()` (constant 4, §G).
- Returns a seam-safe `Deployed` struct: `pool` (address, consumed as `IPanopticData`), `ct0`/`ct1` (`IERC4626`, B-1), `token0`/`token1`/`ccop`, `poolId` (uint64), `tickSpacing`. `forge build` green = compile-time `IPanopticData` conformance.

**Task 3 — IMPLEMENT: mint+burn ONE position through IPanopticData — `5d73b2d`**
- `PanopticDataSeamBase` forks Base at `46700000`, runs the helper, captures only the seam-safe handles.
- `PanopticDataSeam.fork.t.sol` follows the §D sequence: `deal`/mint `type(uint104).max` of both tokens → `approve(pp + ct0 + ct1)` → `ct0.deposit(...)`/`ct1.deposit(...)` via `IERC4626` (B-1) → build a concrete one-leg short `TokenId` (`addPoolId(poolId).addLeg(0,1,0,0,0,0,strike,2)`, OTM strike) → `dispatch` mint → `getAccumulatedFeesAndPositionsData` asserts `bals.length == 1` → `dispatch` with `new uint128[](1)` size-0 burn → post-burn read asserts length 0.
- `test_mintBurn_single_position_through_IPanopticData` PASS on the Base fork; full instrument suite 8/8 green; bulloak per-file clean.

## Deviations from Plan

### Auto-fixed / blocking-resolution

**1. [Rule 3 — Blocking] Tree co-located in `test/instrument/` as `PanopticDataSeam.fork.tree` ↔ `PanopticDataSeam.fork.t.sol` (bulloak 0.9.2 stem + same-dir rule)**
- **Found during:** Task 1, tree placement.
- **Issue:** The plan's `files_modified`/acceptance reference `test/spec/PanopticDataSeam.tree` + `test/instrument/PanopticDataSeam.fork.t.sol`. bulloak 0.9.2 matches the `.t.sol` STRICTLY same-dir AND by full stem; a probe confirmed `PanopticDataSeam.fork.tree → PanopticDataSeam.fork.t.sol`. The split dir + the `.tree` (no `.fork`) stem mismatch are both unsatisfiable for `bulloak check` — identical to the documented 07-04 reality.
- **Fix:** Co-located both under `test/instrument/`. Per-file `bulloak check test/instrument/PanopticDataSeam.fork.tree` exits 0. The required test name and a path-accurate spec tag (`BTT spec: test/instrument/PanopticDataSeam.fork.tree`) are preserved.
- **Files:** `contracts/test/instrument/PanopticDataSeam.fork.tree`.
- **Commit:** `b7d26e1`.

**2. [Rule 1 — Bug] `addLeg` width 1 → 2 (InvalidTickBound)**
- **Found during:** Task 3 first fork run (`[FAIL: InvalidTickBound()]`).
- **Issue:** The plan's `width=1` leg, via `getRangesFromStrike` (`r=(width*tickSpacing)/2`), yields chunk ticks `strike±5` — NOT multiples of `tickSpacing=10` — so the SFPM mint reverts `Errors.InvalidTickBound()` (ticks not tickSpacing-aligned).
- **Fix:** `width=2` ⇒ `r=10` ⇒ chunk ticks `strike±10`, both tickSpacing-aligned for a tickSpacing-aligned strike. `addLeg` arg order re-confirmed verbatim against the vendored `TokenIdLibrary` @fe55774.
- **Files:** `contracts/test/instrument/PanopticDataSeam.fork.t.sol`.
- **Commit:** `5d73b2d`.

**3. [Rule 1 — Bug] Strike pushed OUT of the money (arithmetic underflow on an at-the-money short)**
- **Found during:** Task 3 second fork run (`[FAIL: panic: arithmetic underflow or overflow (0x11)]`).
- **Issue:** With the plan's at-the-money strike (`getCurrentTick/tickSpacing*tickSpacing`), the leg's chunk straddled the active tick. The trace showed the mint reaching `SFPM.mintTokenizedPosition` → `PoolManager.modifyLiquidity` (added liquidity) → a second `PoolManager.burn` of ERC6909 claim tokens that underflowed: an in-the-money short needs BOTH tokens swapped at mint and overdrew the SFPM's claim balance against the seeded full-range LP.
- **Fix:** `STRIKE_OFFSET = +2000` ticks (tickSpacing-aligned) so the short leg's chunk sits entirely above the current tick — single-sided (one token) — eliminating the straddle/mint-swap. Mint and burn then clear against the 1,000,000-ether full-range seed.
- **Files:** `contracts/test/instrument/PanopticDataSeam.fork.t.sol`.
- **Commit:** `5d73b2d`.

**4. [Rule 3 — Blocking] `deployPanopticV2` Stack-too-deep → struct return + `_deployInfra` split**
- **Found during:** Task 2 first `forge build` (`Stack too deep ... Try compiling with --via-ir`).
- **Issue:** The flat 8 named-return signature plus the infra + per-pool locals overflowed the EVM stack under the repo's non-viaIR cancun / `optimizer_runs=200` profile.
- **Fix:** Collapsed the 8 returns into a single `Deployed` struct, split the one-time infra deploy into `_deployInfra()`, and `{}`-scoped the `V4LpHelper` block. No viaIR / profile change needed (kept faithful to 07-01's single profile).
- **Files:** `contracts/test/instrument/helpers/PanopticV2DeployHelper.sol`.
- **Commit:** `98c348b`.

### Out-of-scope (NOT fixed — logged)
- `bulloak check test/spec/*.tree` (the plan's Task-1 full-glob) is N/A here for the same reason as 07-04: my tree lives in `test/instrument/`, and the pre-existing `test/spec/*.tree` (MacroOracle, SomniaAgentConsumer.*) remain bulloak-unparseable (`/`, `.` in branch text) — documented out-of-scope in STATE/07-03/07-04. My per-file check passes.
- `forge build` still emits pre-existing `named-struct-fields` lint **notes** on out-of-scope `src/MacroOracle.sol` (build exits 0); RiskEngine `view`-mutability warnings are in borrowed BUSL code (byte-intact, not touched). Carried over, not fixed (scope boundary).
- Repo-root working-tree artifacts (`../DRAFT.md`, `../MATH.md`, `../research/`, `../openspec/`, etc.) pre-existed and were NOT staged (out of scope).

## Authentication Gates
None.

## Verification

- `forge test --match-test test_mintBurn_single_position_through_IPanopticData --fork-url "$BASE_RPC_URL"` → 1 passed / 0 failed (FORK-03 runtime proof). PASS. Full instrument suite: 8/8 pass.
- `grep -q "deployNewPool("` + `"new PanopticFactory"` + `"poolReference"` + `"buildCcopUsdcKey"` + `"addFullRangeLiquidity"` + `"IERC4626"` + `"10**13"` + `"address(0)"` on `PanopticV2DeployHelper.sol` → all PASS. Only `new PanopticPool` is the master copy (`poolReference`).
- `grep -q "IERC4626"`, `"\.dispatch("`, `"getAccumulatedFeesAndPositionsData"`, `"addLeg"`, `"new uint128\[\](1)"`, `"\.deposit("` on the seam test → all PASS.
- `! grep -E "import.*panoptic-borrowed"` AND `! grep -E "import.*PanopticV2DeployHelper"` on the seam test → both PASS (only imports: IPanopticData, IERC4626, IERC20Partial, @types value types, the M-3 base).
- `bulloak check test/instrument/PanopticDataSeam.fork.tree` → exits 0 (per-file). PASS.
- `forge build` → exits 0 (compile-time `IPanopticData` conformance: the helper-returned address is consumed as `IPanopticData`). PASS.
- `.tree` commit `b7d26e1` precedes scaffold `88d6832` and impl `98c348b`/`5d73b2d` → PASS (mn-B / Iron-Law ordering).

## Self-Check: PASSED

- All 4 created files FOUND on disk.
- All 4 task commits FOUND in history: `b7d26e1` (tree), `88d6832` (scaffold), `98c348b` (helper), `5d73b2d` (seam mint/burn).
