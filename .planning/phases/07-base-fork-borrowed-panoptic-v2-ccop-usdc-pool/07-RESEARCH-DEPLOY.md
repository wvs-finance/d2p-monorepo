# Phase 7: Panoptic V2 DEPLOY MECHANICS — Ground-Truth Re-Research

**Researched:** 2026-06-01
**Domain:** Real deploy/clone/init path of audited Panoptic V2 core (CWIA proxies + UniV4)
**Confidence:** HIGH — every load-bearing claim is a verbatim read of `code-423n4/2025-12-panoptic @ fe557748210a529ae414d7c487b6514be0d9e220` (the audit snapshot) via authenticated `gh api`.
**Supersedes:** the deploy-mechanics gaps in `07-RESEARCH.md` §3.2 / §3.3 / §3.4 / Installation. The Base addresses (§1), fork-block discipline (§1/Pitfall 3), BUSL provenance (§3.1/§7), and single-`^0.8.24`/cancun compile (§5) findings in `07-RESEARCH.md` remain CORRECT and are NOT restated here.

> **Headline correction:** Panoptic V2 core contracts (`PanopticPool`, `CollateralTracker`) are **ClonesWithImmutableArgs (CWIA) clones, NOT plain `new`-constructed contracts.** `collateralToken0()/collateralToken1()/riskEngine()/poolManager()/poolId()/poolKey()` are `pure` getters that read **clone-immutable args** off calldata via `_getArgAddress(...)`. A working pool therefore CANNOT be obtained by `new PanopticPool(...)` alone — it requires the factory's clone+init choreography (or a faithful replication of it). `07-RESEARCH.md` never established this; it is the reason the plans failed the gate.

---

## §A — CWIA verdict + the REAL deploy path

### A.1 CWIA is mandatory (verified)

`contracts/PanopticPool.sol@fe55774` line 27:
```solidity
contract PanopticPool is Clone, Multicall {
```
import line 8: `import {Clone} from "clones-with-immutable-args/Clone.sol";`

Its association getters are `pure` and read clone-immutable args (PanopticPool.sol lines 234-248):
```solidity
function collateralToken0() public pure returns (CollateralTracker) {
    return CollateralTracker(_getArgAddress(0));
}
function collateralToken1() public pure returns (CollateralTracker) {
    return CollateralTracker(_getArgAddress(20));
}
function riskEngine() public pure returns (IRiskEngine) {
    return IRiskEngine(_getArgAddress(40));
}
function poolManager() public pure returns (address) {
    return address(_getArgAddress(60));
}
function poolId() public pure returns (uint64) { return uint64(_getArgUint64(80)); }
function poolKey() public pure returns (bytes calldata key) { /* tail bytes from offset 88 */ }
```
The immutable-arg layout (PanopticPool.sol lines 224-230 comment):
`abi.encodePacked(collateralToken0, collateralToken1, riskEngine, poolManager, uint64 poolId, abi.encode(PoolKey))`.

`contracts/CollateralTracker.sol@fe55774` line 38:
```solidity
contract CollateralTracker is Clone, ERC20Minimal, Multicall {
```
Its getters are also `_getArgAddress`-based (CollateralTracker.sol lines 157-198): `panopticPool()=_getArgAddress(0)`, a `bool` flag at 20, `underlyingToken()=_getArgAddress(21)`, `token0()=_getArgAddress(41)`, `token1()=_getArgAddress(61)`, `riskEngine()=_getArgAddress(81)`, `poolManager()=_getArgAddress(101)`.

`RiskEngine` and `SemiFungiblePositionManager` (V4) are **NOT** clones — both are plain contracts deployed with `new` (RiskEngine.sol line 34 `contract RiskEngine {`; SFPMV4 line 75 `contract SemiFungiblePositionManager is ERC1155, Multicall, TransientReentrancyGuard {`).

### A.2 `initialize()` has NO `onlyFactory` guard (verified — this is the escape hatch)

`PanopticPool.initialize()` (PanopticPool.sol line 282) guards only on already-initialized state, not on caller:
```solidity
function initialize() external {
    if (OraclePack.unwrap(s_oraclePack) != 0) revert Errors.PoolAlreadyInitialized();
    int24 currentTick = getCurrentTick();           // reads SFPM.getCurrentTick(poolKey())
    ... s_oraclePack = OraclePackLibrary.storeOraclePack(...);
    InteractionHelper.doApprovals(SFPM, collateralToken0(), collateralToken1(),
        collateralToken0().token0(), collateralToken0().token1(), poolManager());
}
```
`CollateralTracker.initialize()` (CollateralTracker.sol line 285) guards only on `s_initialized`:
```solidity
function initialize() external {
    if (s_initialized) revert Errors.CollateralTokenAlreadyInitialized();
    s_initialized = true; ...
}
```
There is **no `onlyFactory`/`onlyOwner` modifier on either `initialize()`.** The only factory-coupling is the CWIA arg-packing (you must clone with the exact packed args) and `SFPM.initializeAMMPool` (permissionless — see below). The comment on `initialize` says "Must be called first (by the factory contract)", but that is a doc convention, not an on-chain guard.

### A.3 VERDICT — use the REAL factory `PanopticFactoryV4` (recipe (a)), do NOT replicate

The audit ships the V4 factory and the audit's own V4 test setup uses it. The CWIA arg-packing (especially the `clone3` CREATE3 self-reference where `PanopticPool` must be linked into both `CollateralTracker`s **before** its own address is known) is intricate and exactly the kind of thing a hand-replication gets subtly wrong. The factory already solves the chicken-and-egg via `addressOfClone3`. **Calling the real factory is both more faithful AND less code than replicating it.** This matches how the audited test (`test/foundry/core/PanopticPool.t.sol`) deploys.

### A.4 The REAL deploy path (copy-pasteable, lifted from the audited V4 test `_deployPanopticPool()` + `setUp()`)

Source: `test/foundry/core/PanopticPool.t.sol@fe55774`, lines 750-790 (`setUp`) and 631-672 (`_deployPanopticPool`). The factory import there is `import {PanopticFactory} from "@contracts/PanopticFactoryV4.sol";` (line 31) and the SFPM import is `import {SemiFungiblePositionManager} from "@contracts/SemiFungiblePositionManagerV4.sol";` (line 26).

```solidity
// ---- ONE-TIME INFRASTRUCTURE (setUp) ----
IPoolManager manager = new PoolManager(address(0));            // or the live Base PoolManager on a fork
SemiFungiblePositionManager sfpm =
    new SemiFungiblePositionManager(manager, 10**13, 10**13, 0);   // 4 args (see §B)

// reference (master-copy) implementations the factory clones:
address poolReference       = address(new PanopticPool(ISemiFungiblePositionManager(address(sfpm)))); // 1 arg
address collateralReference = address(new CollateralTracker(10));                                      // 1 arg (commissionFee)

PanopticFactory factory = new PanopticFactory(            // PanopticFactoryV4
    sfpm,
    manager,
    poolReference,
    collateralReference,
    new bytes32[](0),          // metadata properties (empty OK for demo)
    new uint256[][](0),        // metadata indices   (empty OK)
    new Pointer[][](0)         // metadata pointers  (empty OK)
);

RiskEngine re = new RiskEngine(10_000_000, 10_000_000, address(0), address(0)); // 4 args; guardian & builderFactory = 0 OK

// ---- PER-POOL ----
// 1. The UniV4 pool MUST already be initialized in the PoolManager (sqrtPriceX96 != 0),
//    otherwise factory.deployNewPool reverts Errors.PoolNotInitialized().
manager.initialize(poolKey, sqrtPriceX96);                 // our cCOP/USDC PoolKey (hooks = address(0))

// 2. (Optional but needed for a usable pool) seed UniV4 liquidity so mints can be matched.
//    The audited test adds 1_000_000 ether full-range liquidity via a V4 router helper.

// 3. The factory does EVERYTHING else (SFPM init, clone CTs, clone3 pool, init all three):
PanopticPool pp = factory.deployNewPool(poolKey, re, uint96(block.timestamp /* salt */));

CollateralTracker ct0 = pp.collateralToken0();             // CWIA getter, valid post-deploy
CollateralTracker ct1 = pp.collateralToken1();
```

What `factory.deployNewPool` does internally (verified, `PanopticFactoryV4.sol@fe55774` lines 112-220):
1. `if (address(riskEngine) == address(0)) revert ZeroAddress();`
2. `if (V4StateReader.getSqrtPriceX96(POOL_MANAGER_V4, idV4) == 0) revert PoolNotInitialized();` → the UniV4 pool MUST be initialized first.
3. `if (s_getPanopticPool[panopticPoolKey] != 0) revert PoolAlreadyInitialized();`
4. `uint64 poolId = SFPM.initializeAMMPool(key, riskEngine.vegoid());` — registers the pool in the SFPM (idempotent; permissionless).
5. Computes the CREATE3 `salt32` (deployer/poolId/riskEngine prefix + user `uint96` salt) and `addressOfClone3(salt32)` to KNOW the pool address in advance.
6. `COLLATERAL_REFERENCE.clone2(abi.encodePacked(newPoolContract, true,  currency0, currency0, currency1, riskEngine, POOL_MANAGER_V4, fee))` → `collateralTracker0`.
7. `COLLATERAL_REFERENCE.clone2(abi.encodePacked(newPoolContract, false, currency1, currency0, currency1, riskEngine, POOL_MANAGER_V4, fee))` → `collateralTracker1`.
8. `POOL_REFERENCE.clone3(abi.encodePacked(collateralTracker0, collateralTracker1, riskEngine, POOL_MANAGER_V4, poolId, abi.encode(key)), salt32)` → the pool.
9. `newPoolContract.initialize(); collateralTracker0.initialize(); collateralTracker1.initialize();`
10. Stores mapping; `_mint(msg.sender, tokenId)` (FactoryNFT reward — needs the metadata machinery, but empty arrays compile/run fine for a demo).

> **Demo simplification that is faithful:** pass empty `properties/indices/pointers` to the factory constructor (the audited V4 test does exactly this). The `metadata/` JSON + `DeployProtocol.s.sol` pointer-deploy dance is ONLY for on-chain SVG NFT metadata — irrelevant to a fork demo. Do NOT model the `DeployProtocol.s.sol` script: it deploys the **UniV3** `SemiFungiblePositionManager` + `PanopticFactory` (V3) flavor, not V4.

---

## §B — Exact constructor signatures (verbatim @fe55774)

| Contract | File | Constructor (verbatim) | Demo args used by audited V4 test |
|----------|------|------------------------|-----------------------------------|
| **SemiFungiblePositionManager** (V4) | `contracts/SemiFungiblePositionManagerV4.sol` L307 | `constructor(IPoolManager poolManager, uint256 _minEnforcedTickFillCost, uint256 _nativeEnforcedTickFillCost, uint256 _supplyMultiplierTickFill)` | `new SemiFungiblePositionManager(manager, 10**13, 10**13, 0)` |
| **CollateralTracker** | `contracts/CollateralTracker.sol` L280 | `constructor(uint256 _commissionFee)` | `new CollateralTracker(10)` (master copy; cloned per pool) |
| **RiskEngine** | `contracts/RiskEngine.sol` L192 | `constructor(uint256 _crossBuffer0, uint256 _crossBuffer1, address _guardian, address _builderFactory)` | `new RiskEngine(10_000_000, 10_000_000, address(0), address(0))` |
| **PanopticPool** | `contracts/PanopticPool.sol` L280 | `constructor(ISemiFungiblePositionManager _sfpm)` | `new PanopticPool(ISemiFungiblePositionManager(address(sfpm)))` (master copy; cloned per pool) |
| **PanopticFactory** (V4) | `contracts/PanopticFactoryV4.sol` L86 | `constructor(SemiFungiblePositionManager _SFPM, IPoolManager _manager, address _poolReference, address _collateralReference, bytes32[] memory properties, uint256[][] memory indices, Pointer[][] memory pointers)` | `new PanopticFactory(sfpm, manager, poolRef, collatRef, new bytes32[](0), new uint256[][](0), new Pointer[][](0))` |

**Corrections vs prior review notes:**
- SFPMV4 takes **4** args — **CONFIRMED** (`IPoolManager`, then three `uint256`: `_minEnforcedTickFillCost`, `_nativeEnforcedTickFillCost`, `_supplyMultiplierTickFill`). The audited test passes `(manager, 10**13, 10**13, 0)`.
- RiskEngine takes **4** args — **CONFIRMED**: `(_crossBuffer0, _crossBuffer1, _guardian, _builderFactory)`. (The 5-arg `new RiskEngine(500_000, 250_000, 128, 5_000_000, 9_000_000)` shapes in the commented `DeployProtocol.s.sol` are a STALE/different RiskEngine variant — ignore; the live V4 RiskEngine is 4-arg.)
- `_guardian = address(0)` is **fine for a demo** (used verbatim in the audited test; the guardian only gates `onlyGuardian` safe-mode escalation functions, RiskEngine.sol L213-226 — not needed to mint).
- `_builderFactory = address(0)` is **fine for a demo**. `BUILDER_FACTORY` (RiskEngine.sol L152) is only consulted in `_computeBuilderWallet(builderCode)` (L253) to route a fee split when `builderCode != 0`. The demo calls `dispatch(..., builderCode = 0)`, so the builder path is never exercised. `RiskEngine` does NOT itself deploy `BuilderWallet`s in the constructor — it only precomputes `BUILDER_INIT_CODE_HASH = keccak256(type(BuilderWallet).creationCode, abi.encode(BUILDER_FACTORY))` (L202-204) for CREATE2 address prediction. (`BuilderWallet`/`BuilderFactory` are helper contracts at the bottom of `RiskEngine.sol`, L2307/L2346.)
- **`vegoid` is a CONSTANT, not a per-pool parameter.** `RiskEngine.sol` L105: `uint8 internal constant VEGOID = 4;`, exposed via `function vegoid() external view returns (uint8) { return uint8(VEGOID); }` (L2292). The factory reads `riskEngine.vegoid()` to pass into `SFPM.initializeAMMPool`. This **corrects** `07-RESEARCH.md`'s claim that "vegoid is now a per-pool `vegoid` parameter". It is a per-RiskEngine **constant** (=4). The audited test uses `uint256 vegoid = 4;` to match.

---

## §C — Full dependency set + remappings (resolved SHAs @fe55774)

The audit snapshot vendors deps under `lib/` as git submodules (gitlinks). Resolved pins (read from the `fe55774` root tree — `type=commit` entries under `lib/`):

| Dep | Repo | Pinned SHA @fe55774 | `forge install` command | `remappings.txt` line (from the audit's real `remappings.txt`) |
|-----|------|---------------------|--------------------------|----------------------------------------------------------------|
| **v4-core** | `Uniswap/v4-core` | `e50237c43811bd9b526eff40f26772152a42daba` (2025-01-21, verified upstream) | `forge install Uniswap/v4-core@e50237c43811bd9b526eff40f26772152a42daba` | `v4-core/=lib/v4-core/src` |
| **clones-with-immutable-args** | `1inch/clones-with-immutable-args` (the 1inch fork — has `clone2`/`clone3`/`addressOfClone3`, verified) | `196f1ecc6485c1bf2d41677fa01d3df4927ff9ce` (2024-05-30) | `forge install 1inch/clones-with-immutable-args@196f1ecc6485c1bf2d41677fa01d3df4927ff9ce` | `clones-with-immutable-args/=lib/clones-with-immutable-args/src/` |
| **solmate** | `transmissions11/solmate` | `eaa7041378f9a6c12f943de08a6c41b31a9870fc` | `forge install transmissions11/solmate@eaa7041378f9a6c12f943de08a6c41b31a9870fc` | `solmate/=lib/solmate/` |
| **solady** | `vectorized/solady` | `adfad66656a6ef8c65b2a412d849bbf7f7a59842` | `forge install vectorized/solady@adfad66656a6ef8c65b2a412d849bbf7f7a59842` | (no top-level alias in audit's remappings — only used transitively if at all; install for safety) |
| **v3-core** | `Uniswap/v3-core` | `6562c52e8f75f0c10f9deaf44861847585fc8129` | `forge install Uniswap/v3-core@6562c52e8f75f0c10f9deaf44861847585fc8129` | `univ3-core/=lib/v3-core/contracts` |
| **v3-periphery** | `Uniswap/v3-periphery` | `b325bb0905d922ae61fcc7df85ee802e8df5e96c` | `forge install Uniswap/v3-periphery@b325bb0905d922ae61fcc7df85ee802e8df5e96c` | `univ3-periphery/=lib/v3-periphery/contracts` |
| **openzeppelin-contracts** | `openzeppelin/openzeppelin-contracts` | `0a25c1940ca220686588c4af3ec526f725fe2582` | `forge install openzeppelin/openzeppelin-contracts@0a25c1940ca220686588c4af3ec526f725fe2582` | `@openzeppelin/=lib/v4-core/lib/openzeppelin-contracts/` (NOTE: points INTO v4-core's vendored OZ) |
| **forge-std** | `foundry-rs/forge-std` | `1eea5bae12ae557d589f9f0f0edae2faa47cb262` (already present in our repo) | (already vendored) | `forge-std/=lib/forge-std/src/` |

**`remappings.txt` (the audit's verbatim file — adopt as-is, adjust only the `@contracts`/`@types`/etc. left-hand aliases to point at our `panoptic-borrowed/` dir):**
```
forge-std/=lib/forge-std/src/
@openzeppelin/=lib/v4-core/lib/openzeppelin-contracts/
solmate/=lib/solmate/
clones-with-immutable-args/=lib/clones-with-immutable-args/src/
univ3-core/=lib/v3-core/contracts
univ3-periphery/=lib/v3-periphery/contracts
v4-core/=lib/v4-core/src
@contracts/=contracts            # → point at panoptic-borrowed/ in our layout
@libraries/=contracts/libraries  # → panoptic-borrowed/libraries
@base/=contracts/base            # → panoptic-borrowed/base
@tokens/=contracts/tokens        # → panoptic-borrowed/tokens
@types/=contracts/types          # → panoptic-borrowed/types
```

**Critical facts:**
- v4-core layout is `src/` (verified: `PoolManager.sol`, `interfaces/`, `libraries/`, `types/` all under `src/`), so `v4-core/=lib/v4-core/src` is correct.
- The `@openzeppelin/` remapping points at **v4-core's vendored OZ** (`lib/v4-core/lib/openzeppelin-contracts/`), verified to exist. If you `forge install` OZ at top level instead, you must repoint OZ-importing files — easier to keep the audit's path.
- **v3-core/v3-periphery ARE required** even for the V4 path: `PanopticPool.t.sol` imports `TickMath`/`FullMath`/`SqrtPriceMath`/`LiquidityAmounts` from `univ3-core`/`univ3-periphery`, and the V4 contracts' math libraries (`Math.sol`, `PanopticMath.sol`) transitively use v3-core TickMath. Install both.
- **solmate** is a direct import: `SemiFungiblePositionManagerV4.sol` L9 `import {TransientReentrancyGuard} from "solmate/src/utils/TransientReentrancyGuard.sol";` — note the `solmate/src/...` path under the `solmate/=lib/solmate/` alias.
- Our repo already has `evm_version="cancun"`; v4-core `e50237c` needs `>=0.8.24` + cancun (transient storage). Audit `foundry.toml` uses `optimizer_runs = 9_999_999`, `viaIR = false`.

---

## §D — Mint-ONE-position init + collateral call sequence (ordered, verified)

Pre-reqs from §A.4 already done (pool initialized in PoolManager, factory.deployNewPool returned `pp`, `ct0`/`ct1` resolved). Then, lifted from the audited `_initAccounts()` (`PanopticPool.t.sol` L674-748) + `mintOptions`/`burnOptions` helpers (L438-490):

```solidity
// ---- 1. FUND + APPROVE COLLATERAL (per actor, e.g. the seller AND the minter) ----
// On a Base fork, give the actor underlying tokens. USDC is 6dp on Base; use deal():
deal(BASE_USDC, actor, type(uint104).max);            // forge cheatcode writes balanceOf slot
ccop.mint(actor, type(uint104).max);                  // our MockCcop (18dp) is mintable directly

vm.startPrank(actor);
IERC20Partial(token0).approve(address(pp),  type(uint256).max);
IERC20Partial(token1).approve(address(pp),  type(uint256).max);
IERC20Partial(token0).approve(address(ct0), type(uint256).max);
IERC20Partial(token1).approve(address(ct1), type(uint256).max);

// ---- 2. DEPOSIT COLLATERAL (ERC-4626; signature verified CollateralTracker.sol L557) ----
//        function deposit(uint256 assets, address receiver) external payable returns (uint256 shares)
//        assets must be <= type(uint104).max (reverts Errors.DepositTooLarge otherwise).
ct0.deposit(type(uint104).max, actor);
ct1.deposit(type(uint104).max, actor);
// (Audited test additionally does `deal(address(ct0), actor, type(uint104).max, true)` to push the
//  share exchange-rate back to ~1 after the large deposit — optional; only affects share math, not solvency.)

// ---- 3. MINT ONE POSITION via dispatch (signature verified PanopticPool.sol L572) ----
TokenId[]   memory mintList = new TokenId[](1);  mintList[0]  = builtTokenId;   // 1 leg
TokenId[]   memory finalIds = new TokenId[](1);  finalIds[0]  = builtTokenId;   // post-state portfolio
uint128[]   memory sizes    = new uint128[](1);  sizes[0]     = positionSize;
int24[3][]  memory limits   = new int24[3][](1);
limits[0][0] = tickLimitLow;                        // slippage low
limits[0][1] = tickLimitHigh;                       // slippage high  (low>high ⇒ no-swap sentinel path)
limits[0][2] = int24(uint24(effectiveLiquidityLimitX32)); // e.g. type(uint24).max/2 to disable the LP-limit gate
pp.dispatch(mintList, finalIds, sizes, limits, /*usePremiaAsCollateral*/ false, /*builderCode*/ 0);

// ---- 4. READ PREMIUM (never derive; signature verified PanopticPool.sol L221) ----
(LeftRightUnsigned shortPrem, LeftRightUnsigned longPrem, PositionBalance[] memory bals) =
    pp.getAccumulatedFeesAndPositionsData(actor, /*includePendingPremium*/ true, finalIds);

// ---- 5. BURN THE POSITION (same dispatch; size 0 != stored size ⇒ burn path) ----
uint128[] memory burnSizes = new uint128[](1); burnSizes[0] = 0;        // 0 ⇒ full burn
TokenId[] memory emptyFinal = new TokenId[](0);                          // empty post-state
pp.dispatch(mintList, emptyFinal, burnSizes, limits, false, 0);
```

**Verified dispatch disambiguation** (`PanopticPool.sol` L627-660): per tokenId, `s_positionBalance[msg.sender][tokenId] == 0` ⇒ `_mintOptions`; else if stored `positionSize == positionSizes[i]` ⇒ `_settleOptions`; else ⇒ `_burnOptions`. So **size 0 (≠ stored) burns**; the audited `burnOptions` helper passes `sizeList[0] = 0`.

**Solvency sizing (`positionSize`):** after `dispatch`, the pool runs `_validateSolvency(msg.sender, finalPositionIdList, ...)` (L690+). To pass on the first try, follow the audited test's `populatePositionData` (L498-535): bound `positionSizeSeed` to `[10**15, 10**20]` and derive contracts via `getContractsForAmountAtTick`. For a single tiny demo position, deposit `type(uint104).max` collateral (as above) and choose a small `positionSize` relative to seeded UniV4 liquidity — the test seeds `1_000_000 ether` full-range liquidity, so any `positionSize` whose required liquidity is far below that clears solvency.

**Collateral token identity:** `ct0` is the CollateralTracker for `currency0`, `ct1` for `currency1` (factory clone args at §A.4 step 6/7). For the cCOP/USDC pool, whichever of {mockCcop, USDC} sorts lower is `currency0`. Fund/deposit BOTH (`ct0` and `ct1`) — the audited test deposits both for every actor.

---

## §E — `IPanopticData` correction (real V2 functions that EXIST @fe55774)

**GOOD NEWS — `07-RESEARCH.md` §3.4 was actually correct on the read functions.** All three thin reads exist verbatim on V2 `PanopticPool`:

| Function in `07-RESEARCH.md` §3.4 | Real V2 signature @fe55774 | Verdict |
|-----------------------------------|----------------------------|---------|
| `getCurrentTick() returns (int24)` | `function getCurrentTick() public view returns (int24 currentTick)` (PanopticPool.sol **L1949**; body: `SFPM.getCurrentTick(poolKey())`) | EXISTS — keep |
| `getTWAP() returns (int24)` | `function getTWAP() public view returns (int24 twapTick)` (PanopticPool.sol **L1944**; body: `riskEngine().twapEMA(s_oraclePack)`) | EXISTS — keep |
| `numberOfLegs(address) returns (uint256)` | `function numberOfLegs(address user) external view returns (uint256)` (PanopticPool.sol **L1921**; `s_positionsHash[user] >> 248`) | EXISTS — keep (note: legs, not positions) |
| `getAccumulatedFeesAndPositionsData(address,bool,TokenId[]) → (LeftRightUnsigned, LeftRightUnsigned, PositionBalance[])` | EXACT match (PanopticPool.sol **L221**, returns `(LeftRightUnsigned shortPremium, LeftRightUnsigned longPremium, PositionBalance[] memory balances)`) | EXISTS — keep |
| `dispatch(TokenId[], TokenId[], uint128[], int24[3][], bool, uint256)` | EXACT match (PanopticPool.sol **L572**) | EXISTS — keep byte-for-byte |
| `dispatchFrom(TokenId[], address, TokenId[], TokenId[], LeftRightUnsigned)` | EXACT match (PanopticPool.sol **L1360**), and it IS `external payable` | EXISTS — keep |

**Two refinements (not corrections, additions available if the planner wants richer reads):**
- A richer oracle read exists: `getOracleTicks() external view returns (int24 currentTick, int24 spotTick, int24 medianTick, int24 latestTick, OraclePack oraclePack)` (PanopticPool.sol L1899). Useful for the Phase-8 TWAP/median gates the prior research wanted to "anticipate" — `IPanopticData` MAY declare it now to reserve the shape.
- `numberOfLegs` returns **legs** (`>>248`), there is **no `numberOfPositions`** function — so `07-RESEARCH.md`'s `numberOfLegs` name is the right one (do NOT rename to `numberOfPositions`).

`IPanopticData.sol` as authored in `07-RESEARCH.md` §3.4 is **ABI-faithful** and needs no signature change. The only thing the planner must ensure is that the imported value types (`TokenId`, `PositionBalance`, `LeftRightUnsigned`) resolve to the borrowed `types/` files (which are also imported by the concrete) so the assignability `IPanopticData(address(pp))` compiles.

---

## §F — Updated minimal `panoptic-borrowed/` file set (real paths @fe55774)

Because the deploy path is **CWIA + factory**, the minimal set MUST now include the factory, the CWIA `Clone` base usage, the metadata/NFT base contracts the factory inherits, and the `Pointer` type. Borrow these real files (all under `contracts/` @fe55774):

| File @fe55774 | Why in the set | Notably pulls |
|---------------|----------------|---------------|
| `PanopticPool.sol` | core (cloned) | `Clone`, `Multicall`, `CollateralTracker`, `ISemiFungiblePositionManager`, `IRiskEngine`, libs `Constants/EfficientHash/Errors/InteractionHelper/Math/PanopticMath`, types `LeftRight/LiquidityChunk/PositionBalance/RiskParameters/TokenId/OraclePack` |
| `CollateralTracker.sol` | core (cloned) | `Clone`, `ERC20Minimal`, `Multicall`, `PanopticPool`, `IRiskEngine`, `IPoolManager`, `SafeTransferLib`, `Math`, `InteractionHelper`, types `Currency(v4)/LeftRight/TokenId/RiskParameters/MarketState` |
| `SemiFungiblePositionManagerV4.sol` (contract name `SemiFungiblePositionManager`) | engine (deployed via `new`) | `ERC1155`(@tokens), `Multicall`, `TransientReentrancyGuard`(solmate), `V4StateReader`, v4-core `IPoolManager/BalanceDelta/Currency/PoolId/PoolKey`, libs, types incl. `PoolData` |
| `RiskEngine.sol` | solvency (deployed via `new`); also defines `BuilderWallet`/`BuilderFactory` | `CollateralTracker`, `PanopticPool`, libs `Constants/Errors/Math/PanopticMath/SafeTransferLib`, types `LeftRight/LiquidityChunk/PositionBalance/RiskParameters/TokenId/OraclePack/MarketState` |
| `PanopticFactoryV4.sol` (contract name `PanopticFactory`) | **NOW REQUIRED** — the deploy path | `CollateralTracker`, `PanopticPool`, `IRiskEngine`, v4-core `IPoolManager/PoolId/PoolKey`, `SemiFungiblePositionManager`, `Multicall`, `FactoryNFT`, `ClonesWithImmutableArgs`, `Errors`, `PanopticMath`, `V4StateReader`, `Pointer` |
| `interfaces/IRiskEngine.sol` | typed `riskEngine()` | types |
| `interfaces/ISemiFungiblePositionManager.sol` | typed SFPM | types |
| `base/Multicall.sol` | inherited by Pool/CT/SFPM/Factory | — |
| `base/FactoryNFT.sol` | inherited by `PanopticFactory` | `MetadataStore`, `Pointer`, ERC721-ish; needs `MetadataStore` |
| `base/MetadataStore.sol` | inherited by `FactoryNFT` | `Pointer` |
| `tokens/ERC1155Minimal.sol` | SFPM base | — |
| `tokens/ERC20Minimal.sol` | CollateralTracker base | — |
| `tokens/interfaces/IERC20Partial.sol` | token I/O | — |
| `libraries/*` | `Constants, EfficientHash, Errors, InteractionHelper, Math, PanopticMath, SafeTransferLib, V4StateReader, CallbackLib, FeesCalc` | v3-core/v4-core math |
| `types/*` | `TokenId, LeftRight, LiquidityChunk, PositionBalance, MarketState, OraclePack, PoolData, RiskParameters, Pointer` | — |

**Added vs `07-RESEARCH.md` §3.2 (which said factory & FactoryNFT & MetadataStore are NOT in the set):**
- `PanopticFactoryV4.sol` — **NOW REQUIRED** (the deploy path; §A verdict).
- `base/FactoryNFT.sol` + `base/MetadataStore.sol` — **NOW REQUIRED** (inherited by the factory; the factory `_mint`s a reward NFT on deploy). Empty metadata arrays make these inert but they must compile/link.
- `types/Pointer.sol` — **NOW REQUIRED** (factory + metadata).
- `clones-with-immutable-args` (the **1inch** fork, pin `196f1ec…`) — **NOW REQUIRED** as a `forge install` dep (Pool/CT inherit `Clone`; factory uses `ClonesWithImmutableArgs.clone2/clone3/addressOfClone3`). `07-RESEARCH.md` omitted CWIA entirely.

> **NOT needed** (confirm-stay-out): `SemiFungiblePositionManager.sol` (the UniV3 one), `PanopticFactory.sol` (V3), `coreV3/` tests, `script/DeployProtocol.s.sol` (V3-flavored + metadata-package machinery). For a fork demo, keep the factory's metadata args empty.

---

## §G — Supersedes map (per-correction)

| Correction | Supersedes |
|------------|-----------|
| **CWIA clones, not `new`** — Pool & CT are `Clone`s; getters are `_getArgAddress` pure; a working pool needs the factory. | `07-RESEARCH.md` §3.2 (which listed only `new`-able core and explicitly EXCLUDED the factory) and the "deploy one pool directly, not a factory" note. **REVERSED.** |
| **Real deploy path = call `PanopticFactoryV4.deployNewPool(key, riskEngine, salt)`** after `PoolManager.initialize(key, sqrtP)`; factory does SFPM-init + clone CTs + clone3 pool + init-all-three. | `07-RESEARCH.md` had no deploy choreography at all. **ADDS** the missing recipe. |
| **Constructor signatures** (SFPMV4=4 args, CT=1, RE=4, Pool=1, FactoryV4=7). | `07-RESEARCH.md` did not record any constructor signatures. **ADDS.** Confirms reviewer's SFPMV4=4 / RE=4 note. |
| **`vegoid` is a CONSTANT (=4) in RiskEngine**, exposed via `vegoid()`, NOT a per-pool parameter. | `07-RESEARCH.md` §3.3 + Anti-Patterns ("VEGOID is now a per-pool `vegoid` parameter"). **CORRECTED.** |
| **Full dep set + resolved SHAs** incl. v4-core `e50237c…`, 1inch CWIA `196f1ec…`, solmate/solady/v3-core/v3-periphery/OZ pins, and the audit's exact `remappings.txt`. | `07-RESEARCH.md` Installation (which said "pin a tag/commit at build" without resolving) and omitted CWIA. **RESOLVED + ADDS CWIA.** |
| **Mint+collateral sequence**: `deal`/mint → approve(pp & ct) → `ct.deposit(uint104, actor)` (≤uint104) → `dispatch(...)` → read → `dispatch(size 0)` burn. | `07-RESEARCH.md` §3.4 code example (which showed `dispatch` but no collateral funding / 4626 deposit / approvals / solvency sizing). **ADDS the prerequisite collateral choreography.** |
| **`IPanopticData` read fns all EXIST** (`getCurrentTick`@L1949, `getTWAP`@L1944, `numberOfLegs`@L1921, `getAccumulatedFeesAndPositionsData`@L221, `dispatch`@L572, `dispatchFrom`@L1360 payable). Optional `getOracleTicks`@L1899. | `07-RESEARCH.md` §3.4 — **CONFIRMED correct**; this re-research verifies it byte-for-byte (the blocker is retired, not changed). |

---

## RESEARCH COMPLETE

1. **CWIA verdict** — `PanopticPool` & `CollateralTracker` are `clones-with-immutable-args` `Clone`s; `collateralToken0/1()`, `riskEngine()`, `poolManager()` are `pure` `_getArgAddress(...)` getters; `initialize()` has NO `onlyFactory` guard (only already-init guards) — so the real deploy MUST go through the factory's clone+pack choreography (verified PanopticPool.sol L27/L234-248/L282, CollateralTracker.sol L38/L157-198/L285).
2. **Real deploy path** — use `PanopticFactoryV4.deployNewPool(poolKey, riskEngine, uint96 salt)` AFTER `PoolManager.initialize(poolKey, sqrtP)`; the factory runs `SFPM.initializeAMMPool` → `clone2` both CollateralTrackers → `clone3` the pool (CREATE3) → `initialize()` all three; for a fork it is more faithful (and less code) to call the real V4 factory than to replicate (verified PanopticFactoryV4.sol L112-220 + the audited V4 test `_deployPanopticPool`).
3. **Constructors** — SFPMV4 `(IPoolManager, uint256, uint256, uint256)`; CollateralTracker `(uint256 commissionFee)`; RiskEngine `(uint256, uint256, address guardian, address builderFactory)` with both addresses `address(0)` OK for demo (RiskEngine does NOT deploy BuilderWallets; only precomputes a CREATE2 init-code hash, unused when `builderCode==0`); PanopticPool `(ISemiFungiblePositionManager)`; FactoryV4 `(SFPM, IPoolManager, poolRef, collatRef, bytes32[], uint256[][], Pointer[][])` (empty metadata arrays OK).
4. **Deps + remappings** — resolved pins: v4-core `e50237c43811bd9b526eff40f26772152a42daba` (`v4-core/=lib/v4-core/src`), 1inch CWIA `196f1ecc…` (`clones-with-immutable-args/=lib/clones-with-immutable-args/src/`), solmate `eaa70413…`, solady `adfad666…`, v3-core `6562c52e…`, v3-periphery `b325bb09…`, OZ `0a25c194…` (remapped INTO v4-core's vendored OZ); v3-core/periphery + solmate are required, cancun + `^0.8.24` already satisfied.
5. **Mint-one sequence** — fund (`deal` USDC 6dp / mint MockCcop 18dp) → `approve(pp)` + `approve(ct0/ct1)` → `ct0.deposit(uint104, actor)` + `ct1.deposit(...)` (ERC-4626 `deposit(uint256 assets,address receiver) payable`, assets ≤ uint104) → `pp.dispatch(mintList, finalIds, sizes, limits, false, 0)` (PositionBalance==0 ⇒ mint) → `getAccumulatedFeesAndPositionsData` read → `pp.dispatch(mintList, emptyFinal, [0], limits, false, 0)` (size≠stored ⇒ burn); size against seeded UniV4 liquidity to clear `_validateSolvency`.
6. **IPanopticData** — all prior-research read functions EXIST verbatim on V2 `PanopticPool` (`getCurrentTick`@L1949, `getTWAP`@L1944, `numberOfLegs`@L1921, `getAccumulatedFeesAndPositionsData`@L221, `dispatch`@L572, `dispatchFrom`@L1360 payable); no `numberOfPositions` (use `numberOfLegs`); optional `getOracleTicks`@L1899 available to reserve the Phase-8 oracle shape — `07-RESEARCH.md` §3.4 needs no signature change.
