# Phase 7: Base-fork harness + borrowed Panoptic V2 + cCOP/USDC pool — Research

**Researched:** 2026-06-01
**Domain:** Foundry Base-mainnet-fork harness; Uniswap V4 pool deploy/read; borrowed Panoptic **V2** core (UniV4) behind `IPanopticData`; multi-version solc; BUSL-1.1 provenance; bulloak/evm-tdd
**Confidence:** HIGH (every load-bearing claim is verified against pinned GitHub commits, the Code4rena audit snapshot, official Uniswap deployments, and direct repo inspection)

> No CONTEXT.md exists for this phase. Constraints below are copied from the phase prompt + REQUIREMENTS.md + the v2 research SUMMARY (the decisive Base-fork/V2 pivot), which together act as the locked decision set.

---

## User Constraints (locked — from prompt + REQUIREMENTS.md + SUMMARY pivot)

### Locked Decisions
- **Panoptic V2 (Uniswap V4), not V1.** V1 is EOL (vuln, trading disabled). V2 is open-sourced, UniV4-based, audited Dec-2025 (Code4rena "Panoptic: Next Core").
- **Base fork, not Celo.** UniV4 + Reactive live on Base. The only real cCOP pool is UniV3/Celo (incompatible with V2's UniV4 surface). Resolution: **fork Base, deploy our OWN cCOP/USDC UniV4 demo pool**, borrow Panoptic V2 core behind `IPanopticData`.
- **Demo/testnet/fork only — never production.** This is what makes borrowing BUSL-1.1 Panoptic V2 code permitted (non-production use). Keep a NOTICE.
- **Borrow behind `IPanopticData`.** Consumers NEVER import the concrete (swap seam). Future: repoint to a canonical Panoptic V2 deployment, delete `panoptic-borrowed/`.
- **Streamia is READ from the contract, never re-derived.**
- **Fit the EXISTING `contracts/` Foundry project** — additive, not a greenfield. Do NOT disturb the parked M1 econometrics track (`phases/01..03/`, the `*-M1-donor-transfer-*.md` snapshots).
- **evm-tdd Iron Law:** `.tree` BTT spec + failing tests BEFORE implementation; `bulloak check` must pass; one tree per function. forge 1.5.1.

### Claude's Discretion
- Exact directory names under `contracts/` (`panoptic-borrowed/` vs `lib/panoptic-v2-borrowed/`), remapping aliases, fork-block selection, and how the borrowed core is vendored (git submodule vs copied subtree vs `forge install`) — recommendations below, planner picks.
- Whether to read pool state via Panoptic's own `V4StateReader` (`extsload`) or Uniswap's `StateView` periphery — both verified; recommendation below.

### Deferred Ideas (OUT OF SCOPE for Phase 7)
- The `LongGammaWrapper` cash-flow (Phase 8), `PremiumSplitter`/vault (Phase 9), `MacroOracle` surprise route + `PositionBuilder` (Phase 10).
- x402 entry (PAY-01), Reactive cross-chain (XCHAIN-01), live delta-hedge (HEDGE-01).
- The real Celo cCOP pool; canonical Panoptic V2 integration; CPI→FX calibration; real money.
- TWAP/liquidity-floor/depeg live gates (design only must be *anticipated* in the `IPanopticData` shape so Phase 8 isn't retrofitted; the live gates themselves are out of v1).

---

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| **FORK-01** | Foundry Base-fork harness (UniV4 PoolManager + a stable), `forge` + `bulloak`, BUSL NOTICE for borrowed Panoptic | §1 (Base addresses + RPC + fork-block), §5 (solc matrix — RETIRED: single `^0.8.24`/cancun compile), §6 (bulloak), §7 (BUSL NOTICE — exact license text + commit) |
| **FORK-02** | Deploy our own cCOP/USDC UniV4 pool (mock cCOP, realistic params); consumer reads initialized price/liquidity | §2 (PoolKey/initialize/sqrtPriceX96 for cCOP/USD ≈ 1/4000; hooks=address(0); read via StateView/extsload) |
| **FORK-03** | Borrow minimal Panoptic V2 core behind `IPanopticData`; mint+burn one position through the interface; swap seam intact | §3 (exact V2 contract set + commit), §4 (V2 lifecycle ABI: `dispatch`/`dispatchFrom` + premium getters), §3.4 (`IPanopticData` surface) |

---

## Summary

All six "hard unknowns" are **retired with primary-source evidence**; **no BLOCKERs remain.** The single most consequential finding overturns a planning assumption: **Panoptic V2's entire contract set pins `pragma solidity ^0.8.24`** — *identical to this repo* — so the dreaded "multi-version solc matrix" collapses to a **single `^0.8.24` + `evm_version="cancun"` compile**. Uniswap v4-core requires the same (`>=0.8.24` + cancun for transient storage). The only versioning discipline left is: do not *bump* the borrowed libs (keep their `^0.8.24` headers + BUSL SPDX), and set `evm_version="cancun"`.

The second consequential finding: **Panoptic V2's external ABI is fundamentally different from V1's.** There is no `mintOptions`/`burnOptions`. V2 exposes a single `dispatch(...)` for mint/burn/settle (disambiguated by position-size deltas) and a single `dispatchFrom(...)` for liquidation/forceExercise/settle-long-premium (disambiguated by list-length semantics). Premium ("streamia") is READ via `PanopticPool.getAccumulatedFeesAndPositionsData(user, includePendingPremium, positionIdList)` or, lower-level, `SFPM.getAccountPremium(...)`. `IPanopticData` MUST be authored against THESE signatures, not V1's, or the future swap to canonical V2 breaks (the whole point of FORK-03).

Both source repos are public at pinned commits: the **Code4rena audit snapshot** `code-423n4/2025-12-panoptic @ fe557748210a529ae414d7c487b6514be0d9e220` (frozen, audited, the recommended provenance pin) and the canonical **`panoptic-labs/panoptic-v2-core`** (live, `main`). Both are **BUSL-1.1** (Licensor: Axicon Labs Limited; Change Date ≤ 2027-09-07; Additional Use Grant at `v1-license-grants.panoptic.eth`), with interfaces/tokens/Multicall + selected libs/types under GPL. Base UniV4 `PoolManager`/`StateView`/`PositionManager` addresses are confirmed from the official Uniswap deployments page.

**Primary recommendation:** Single `^0.8.24` / `evm_version="cancun"` Foundry compile. Vendor the borrowed Panoptic V2 core from the **frozen Code4rena commit** into `contracts/panoptic-borrowed/` (BUSL headers + NOTICE intact). Author `IPanopticData` against V2's real `dispatch`/`dispatchFrom`/`getAccumulatedFeesAndPositionsData` ABI. Deploy a fresh UniV4 cCOP/USDC pool with `PoolManager.initialize` (hooks=`address(0)`), read state via Uniswap `StateView`. Install bulloak; `.tree`-before-impl per FORK criterion.

---

## Standard Stack

### Core
| Library | Version / Ref | Purpose | Why Standard |
|---------|---------------|---------|--------------|
| **Foundry (forge)** | `1.5.1-stable` (commit `b0a9dd9`, already installed) | Base-fork tests, multi-profile compile | Existing toolchain; supports `vm.createSelectFork`, cancun, fuzz/invariant. |
| **Solidity** | `^0.8.24` (single version — see §5) + `evm_version = "cancun"` | Contract language | **Panoptic V2 core is `^0.8.24` for every file; v4-core needs ≥0.8.24 + cancun (transient storage).** One compile satisfies both. |
| **Panoptic V2 core (borrowed)** | `code-423n4/2025-12-panoptic @ fe5577482…0d9e220` (audited, frozen) — canonical mirror `panoptic-labs/panoptic-v2-core @ d20b0aed127ab5d3e5ca17c5399782aad2f0ff4c` (`main`, live) | Source to BORROW behind `IPanopticData` (not a dependency to deploy unmodified) | The audited snapshot is a stable provenance pin; record SHA in NOTICE + per-file headers. |
| **Uniswap v4-core** | `forge install Uniswap/v4-core` (pin a tag/commit at build) | `IPoolManager`, `PoolKey`, `PoolId`, `Currency`, `BalanceDelta`, transient storage AMM | Panoptic V2's `SemiFungiblePositionManagerV4` + `V4StateReader` depend on it. |
| **Uniswap v4-periphery** | `forge install Uniswap/v4-periphery` (pin) | `StateView` (read sqrtPriceX96/liquidity), optionally `PositionManager` | Cleanest consumer-side pool-state read for FORK-02. |
| **solmate** | match what V2 imports (`TransientReentrancyGuard`) | SFPMV4 reentrancy guard + ERC20/4626 bases | Direct dependency of the borrowed V2 SFPMV4. |
| **bulloak** | `cargo install bulloak` (pin the version in a tooling note; e.g. record `bulloak --version`) | `.tree` → Solidity test scaffold; `bulloak check` gate | Repo authors `.tree` BTT specs by hand; not installed. Installing/pinning it is an explicit FORK-01 deliverable. |
| **forge-std** | vendored in `contracts/lib/forge-std` | `Test`, `vm.createSelectFork`, cheatcodes | Already present. |

### Supporting / vendoring note
- `contracts/lib/` is **gitignored** (`# Vendored deps — restore with forge install`). Borrowed Panoptic V2 must live in a **committed** path (e.g. `contracts/panoptic-borrowed/`), NOT under `lib/`, so the BUSL provenance + NOTICE travel with the repo and the swap seam is explicit. v4-core/v4-periphery/solmate are restorable `forge install` deps under `lib/`.

### Installation
```bash
# from contracts/
forge install Uniswap/v4-core            # pin a commit/tag
forge install Uniswap/v4-periphery       # pin a commit/tag (StateView)
forge install transmissions11/solmate    # pin (TransientReentrancyGuard etc.)
cargo install bulloak                     # record `bulloak --version` in a tooling note

# Borrowed Panoptic V2 core — copy the audited frozen snapshot into a COMMITTED dir
# (NOT lib/, which is gitignored). Keep BUSL headers; record commit in NOTICE.
#   source: code-423n4/2025-12-panoptic @ fe557748210a529ae414d7c487b6514be0d9e220
#   minimal set: see §3.2
```

**Version verification (done 2026-06-01):**
- forge `1.5.1-stable` (`forge --version`, local).
- Panoptic V2 every-file pragma `^0.8.24` (surveyed all `contracts/**/*.sol` at the pinned commit; SPDX `BUSL-1.1` on core, GPL on interfaces/tokens).
- v4-core requires `solc >= 0.8.24` + `evm_version = "cancun"` (transient storage) — Uniswap quickstart docs.
- Base UniV4 addresses from `developers.uniswap.org/contracts/v4/deployments`.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Vendor borrowed core from the **C4 audit commit** | Vendor from `panoptic-v2-core@main` | `main` is live/moving; the audit snapshot is frozen + audited → better provenance for the NOTICE. Use `main` only if a needed fix landed post-audit. |
| Read pool state via **`StateView`** (periphery) | Panoptic's own `V4StateReader.getSqrtPriceX96` (`extsload`) | Both verified. `StateView` is the canonical consumer read; `V4StateReader` proves the borrowed core's own read path. Use `StateView` for the FORK-02 consumer assertion; the harness can also assert via `extsload` for parity. |
| **Copy/subtree** the borrowed core into a committed dir | git submodule | Submodule keeps a clean SHA pin but complicates BUSL-header edits + the "delete `panoptic-borrowed/` on swap" story. Subtree/copy is simpler for a demo and keeps provenance in-tree. Planner's call. |

---

## Architecture Patterns

### Recommended Project Structure (additive to existing `contracts/`)
```
contracts/
├── foundry.toml                 # MODIFIED: + [rpc_endpoints] base, fork profile, evm_version=cancun, remappings
├── remappings.txt               # NEW: alias @contracts/@libraries/@types/@tokens/@base + v4-core/v4-periphery/solmate
├── NOTICE                       # NEW (FORK-01): BUSL-1.1 provenance for borrowed Panoptic V2
├── src/                         # UNCHANGED — SomniaAgentConsumer/MacroOracle/SomniaProbe (do not touch)
│   └── instrument/
│       └── interfaces/
│           └── IPanopticData.sol   # NEW (FORK-03): authored against the REAL V2 ABI (§3.4)
├── panoptic-borrowed/           # NEW (committed, NOT lib/): minimal V2 core, BUSL headers intact
│   ├── PanopticPool.sol
│   ├── CollateralTracker.sol
│   ├── SemiFungiblePositionManagerV4.sol
│   ├── RiskEngine.sol
│   ├── libraries/ (Math, PanopticMath, FeesCalc, V4StateReader, Constants, Errors, ...)
│   └── types/ (TokenId, LeftRight, LiquidityChunk, PositionBalance, MarketState, OraclePack, ...)
└── test/
    ├── fork/
    │   └── BaseForkHarness.t.sol   # NEW: vm.createSelectFork(base, BASE_FORK_BLOCK); pins addresses
    ├── instrument/
    │   ├── CcopUsdcPool.fork.t.sol # NEW (FORK-02): deploy+initialize pool, read state
    │   └── PanopticDataSeam.fork.t.sol # NEW (FORK-03): mint+burn via IPanopticData only
    ├── mocks/
    │   └── MockCcop.sol            # NEW: simple ERC20 (18 dp), mock cCOP
    └── spec/
        ├── BaseForkHarness.tree    # NEW (.tree-before-impl)
        ├── CcopUsdcPool.tree       # NEW
        └── PanopticDataSeam.tree   # NEW
```

### Pattern 1: Single-version cancun compile (NOT a multi-version matrix)
**What:** One `[profile.default]` with `solc = "0.8.24"` (or auto-detect within `^0.8.24`) and `evm_version = "cancun"`. Borrowed Panoptic V2 + our `^0.8.24` code + v4-core all compile together.
**When to use:** Always, here. The "multi-version matrix" the roadmap inherited from the V1 plan is **obsolete** — V1 pinned `=0.8.18`; V2 pins `^0.8.24`.
**Example (`foundry.toml`):**
```toml
# Source: Panoptic V2 every-file pragma ^0.8.24 (verified); Uniswap v4 quickstart (cancun)
[profile.default]
src = "src"
out = "out"
libs = ["lib"]
solc = "0.8.24"            # single version; do NOT bump borrowed libs (they are already ^0.8.24)
evm_version = "cancun"     # REQUIRED: UniV4 + Panoptic V2 use transient storage (tstore/tload)
optimizer = true
optimizer_runs = 200       # demo; raise if size-limited (V2 audit used 9_999_999 for prod sizes)
viaIR = false

[profile.ci]
fuzz = { runs = 256 }      # fixed fuzz-run floor (PITFALL 8)

[rpc_endpoints]
base = "${BASE_RPC_URL}"

[fuzz]
runs = 256
```
> If a vendored dep (e.g. some v4 file) ever needs a different exact version, Foundry's per-file pragma resolution handles it automatically as long as `evm_version=cancun` and no `=` exact-pin conflicts — but **none of the in-scope Panoptic V2 files use an exact pin**, so this should not arise.

### Pattern 2: Interface-pinned swap seam (`IPanopticData`)
**What:** `instrument/interfaces/IPanopticData.sol` declares the **subset of the real V2 ABI** consumers need. The borrowed concrete satisfies it; a future canonical V2 deployment satisfies the same ABI. Consumers import only the interface.
**When to use:** Every consumer of Panoptic in Phases 7–10.
**Trade-off:** Forces V2-ABI fidelity up front (good). Author against V2, never let the borrowed impl's convenience leak in. See §3.4 for the exact surface.

### Pattern 3: Read pool state, never derive it (FORK-02 + streamia foreshadow)
**What:** Read `sqrtPriceX96`/`tick`/`liquidity` from the live `PoolManager` (via `StateView` or `extsload`), and read premium via `getAccumulatedFeesAndPositionsData` — never recompute.
**When to use:** FORK-02 init-state read now; Phase 8 streamia read later. Establishing the read path here prevents the Phase 8 retrofit.

### Anti-Patterns to Avoid
- **Authoring `IPanopticData` against V1's `mintOptions`/`burnOptions`.** V2 has neither — it uses `dispatch`/`dispatchFrom`. Authoring against V1 breaks the swap seam (the exact failure FORK-03 guards against).
- **Bumping borrowed Panoptic libs' pragma "to match the repo."** They are already `^0.8.24`; touching them invalidates the audited provenance for zero benefit.
- **Putting borrowed BUSL code under `lib/`** (gitignored) — provenance + NOTICE would not travel with the repo.
- **Re-deriving premium/streamia** with a `SPREAD_MULTIPLIER` constant. V2's VEGOID is now a **per-pool `vegoid` parameter** (`getPoolId(id, vegoid)`, `getAccountPremium(..., vegoid)`), not the fixed `=2` of V1 — another reason to READ, never assume.
- **Importing the borrowed concrete in any consumer/test that's meant to prove the seam.** The FORK-03 test must touch Panoptic only through `IPanopticData`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Reading UniV4 pool price/liquidity | Custom storage-slot math | Uniswap `StateView` (periphery) or Panoptic `V4StateReader.getSqrtPriceX96` (`extsload`) | Both are verified, audited; slot layout is non-obvious (packed `Slot0`). |
| Streamia / premium accrual | A parallel fees×multiplier formula | `PanopticPool.getAccumulatedFeesAndPositionsData(...)` / `SFPM.getAccountPremium(...)` | V2 VEGOID is per-pool; any re-derivation drifts from the contract's own debit. |
| Option mint/burn/exercise lifecycle | Re-implement position accounting | Borrowed V2 `dispatch`/`dispatchFrom` behind `IPanopticData` | The whole point of borrowing; re-impl defeats the swap seam. |
| `.tree` → test scaffolding | Hand-copy test stubs | `bulloak scaffold` + `bulloak check` | The repo's evm-tdd Iron Law; mechanical scaffolding + the check gate. |
| Mock cCOP token | A bespoke token | Minimal OZ/solmate ERC20 (`MockCcop`, 18 dp) | A plain ERC20 is all FORK-02 needs; mirrors the existing `MockPlatform` mock pattern. |

**Key insight:** Phase 7 is *plumbing + provenance*, not economics. Every numeric quantity (price, liquidity, premium) is READ from a live or borrowed contract; the only thing we author is the *interface* and the *harness*.

---

## Common Pitfalls

### Pitfall 1: Authoring `IPanopticData` against the wrong (V1) ABI
**What goes wrong:** Interface declares `mintOptions(positionIdList, ...)` / `burnOptions(...)` (V1). The borrowed V2 concrete has `dispatch`/`dispatchFrom`; the interface can't be satisfied, or a shim is bolted on that breaks the canonical-V2 swap.
**Why it happens:** All four inherited research files (STACK/ARCHITECTURE/PITFALLS/FEASIBILITY) describe **V1** mechanics (they predate the V2 pivot). Their `mintOptions`/`CollateralTracker`/`VEGOID=2` references are V1.
**How to avoid:** Author `IPanopticData` strictly against §3.4 (V2 `dispatch`/`dispatchFrom`/`getAccumulatedFeesAndPositionsData`). Add a compile-time conformance test: the borrowed concrete is assignable to `IPanopticData` (`IPanopticData p = IPanopticData(address(borrowedPool));`).
**Warning signs:** The string `mintOptions` or `burnOptions` anywhere in `IPanopticData.sol`.

### Pitfall 2: `evm_version` not set to cancun → transient-storage opcodes fail
**What goes wrong:** Both UniV4 and Panoptic V2 use `tstore`/`tload`. Default EVM version may be below cancun; compile or runtime reverts.
**How to avoid:** `evm_version = "cancun"` in `foundry.toml` (Pattern 1). Verify with a fork test that touches `PoolManager` transient locks.
**Warning signs:** "invalid opcode" on a UniV4 call; `TransientReentrancyGuard` misbehaving.

### Pitfall 3: Base public-RPC archive depth / unpinned fork block
**What goes wrong:** A free public Base RPC prunes deep history; `vm.createSelectFork` at an old block fails or is non-deterministic; streamia-accrual tests (Phase 8) become flaky.
**How to avoid:** **Pin a recent finalized Base block** as `BASE_FORK_BLOCK` (resolve `cast block-number --rpc-url $BASE_RPC_URL` at build, lock a value a few hundred blocks back). Use an archive endpoint (Alchemy/dRPC/Dwellir free tier serve archive; the public `https://mainnet.base.org` is latest-state and rate-limited — fine for a *recent* pinned block, risky for deep history). Put the RPC in `[rpc_endpoints] base = "${BASE_RPC_URL}"` + `.env` (gitignored), never inline.
**Warning signs:** Fork test green locally, red in CI; "missing trie node"; "block not found".

### Pitfall 4: Borrowed BUSL code mis-licensed or provenance lost
**What goes wrong:** Stripping/relicensing BUSL headers, or vendoring under gitignored `lib/`, loses the legal NOTICE and the audited-commit provenance.
**How to avoid:** Keep every borrowed file's `// SPDX-License-Identifier: BUSL-1.1` header byte-identical; commit a `NOTICE` (§7) recording the source repo, commit SHA, Change Date, and non-production scoping; vendor into a committed dir.
**Warning signs:** A `panoptic-borrowed/*.sol` with MIT header; no `NOTICE`; borrowed code under `lib/`.

### Pitfall 5: bulloak drift / `.tree`-after-impl
**What goes wrong:** Impl written before `.tree`; `bulloak check` not run; the evm-tdd Iron Law silently broken.
**How to avoid:** `.tree` committed before the matching `.sol`; `bulloak check` in CI; one tree per function (the Iron Law). The existing `test/spec/*.tree` are the format template.
**Warning signs:** A `.sol` newer than its `.tree`; no `bulloak check` step.

---

## Code Examples

### (FORK-02) Deploy + initialize a cCOP/USDC UniV4 pool on the Base fork, then read state
```solidity
// Source: Uniswap v4 deployments (Base) + StateView guide; PoolKey/initialize ABI from v4-core
// Base addresses (chainId 8453), verified developers.uniswap.org/contracts/v4/deployments:
address constant BASE_POOL_MANAGER = 0x498581fF718922c3f8e6A244956aF099B2652b2b;
address constant BASE_STATE_VIEW   = 0xA3c0c9b65baD0b08107Aa264b0f3dB444b867A71;
address constant BASE_USDC         = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913; // native USDC on Base

// Mock cCOP: a plain 18-dp ERC20 we mint to ourselves.
MockCcop ccop = new MockCcop();

// PoolKey: order currencies ascending; hooks = address(0) (no hook for the demo).
(Currency c0, Currency c1) = address(ccop) < BASE_USDC
    ? (Currency.wrap(address(ccop)), Currency.wrap(BASE_USDC))
    : (Currency.wrap(BASE_USDC), Currency.wrap(address(ccop)));
PoolKey memory key = PoolKey({
    currency0: c0,
    currency1: c1,
    fee: 500,                 // 0.05% tier (demo-realistic; 3000/10000 also fine)
    tickSpacing: 10,          // must match fee tier convention
    hooks: IHooks(address(0)) // hookless demo pool
});

// sqrtPriceX96 for cCOP/USD ≈ 1/4000 (1 USDC ≈ 4000 cCOP). Compute with the standard
// encodeSqrtRatioX96(amount1, amount0); pick the ratio that matches currency ordering.
// (USDC is 6dp, cCOP 18dp — bake the decimal scale into the chosen ratio; document it.)
uint160 sqrtPriceX96 = /* TickMath/encodeSqrtRatioX96(...) — realistic ≈ 1/4000 */;

IPoolManager(BASE_POOL_MANAGER).initialize(key, sqrtPriceX96);

// Consumer reads initialized state (FORK-02 assertion):
PoolId id = key.toId();
(uint160 sqrtP, int24 tick, , ) = IStateView(BASE_STATE_VIEW).getSlot0(id);
uint128 liq = IStateView(BASE_STATE_VIEW).getLiquidity(id);
assertGt(sqrtP, 0);           // pool is initialized
// liquidity starts 0 until LP'd — the harness may add liquidity via PositionManager or
// via the borrowed SFPMV4 mint to make `liq > 0` observable.
```
> Decimal note: USDC on Base is **6 dp**, mock cCOP **18 dp**. The `sqrtPriceX96` must encode the *raw-unit* ratio (price = (sqrtP/2^96)^2 = amount1/amount0 in raw units). Document the chosen number and its human-readable rate in the test.

### (FORK-03) Mint + burn ONE position through `IPanopticData` only (swap seam)
```solidity
// Source: PanopticPool.dispatch / dispatchFrom @ code-423n4/2025-12-panoptic@fe55774
// Consumer touches Panoptic ONLY via IPanopticData (never the concrete).
IPanopticData pano = IPanopticData(address(borrowedPanopticPool)); // assignable == seam holds

// MINT one long-gamma leg: positionIdList has the new tokenId; positionBalance==0 ⇒ mint path.
TokenId[] memory ids = new TokenId[](1); ids[0] = builtTokenId;          // 1 long leg, isLong=1
TokenId[] memory finalIds = ids;                                          // post-state list
uint128[] memory sizes = new uint128[](1); sizes[0] = positionSize;
int24[3][] memory limits = new int24[3][](1); limits[0] = [tickLo, tickHi, spreadX10000];
pano.dispatch(ids, finalIds, sizes, limits, /*usePremiaAsCollateral*/ false, /*builderCode*/ 0);

// READ premium (streamia) — never re-derive:
(LeftRightUnsigned shortPrem, LeftRightUnsigned longPrem, PositionBalance[] memory bals) =
    pano.getAccumulatedFeesAndPositionsData(address(this), /*includePending*/ true, ids);

// BURN: same dispatch, but positionSize differs from the stored size ⇒ burn path.
// (size==stored ⇒ settle; size==0 in a final-empty list via dispatchFrom ⇒ liquidation — Phase 8.)
uint128[] memory burnSizes = new uint128[](1); burnSizes[0] = 0;          // 0 ⇒ full burn
TokenId[] memory emptyFinal = new TokenId[](0);
pano.dispatch(ids, emptyFinal, burnSizes, limits, false, 0);
```

---

## State of the Art

| Old (V1, in the inherited research) | Current (V2, this phase) | When changed | Impact |
|-------------------------------------|--------------------------|--------------|--------|
| `mintOptions(positionIdList,...)` / `burnOptions(...)` separate fns | Single `dispatch(...)`; `dispatchFrom(...)` for liq/forceExercise/settle | V2 (UniV4 redesign, audited Dec-2025) | `IPanopticData` MUST target `dispatch`/`dispatchFrom`. |
| `VEGOID = 2` fixed constant in SFPM | `vegoid` is a **per-pool parameter** (`getPoolId(id, vegoid)`, `getAccountPremium(...,vegoid)`) | V2 | Streamia read takes `vegoid`; never assume 2. |
| Premium via V1 `FeesCalc`/settleLongPremium | `getAccumulatedFeesAndPositionsData(user, includePending, ids)` → `(shortPrem, longPrem, PositionBalance[])`; low-level `SFPM.getAccountPremium(...)` | V2 | The exact getter to READ in Phases 7/8. |
| `CollateralTracker` ERC-4626 (V1) | `CollateralTracker` + **`RiskEngine`** (new central solvency/collateral calculator) | V2 | RiskEngine is part of the minimal set (collateral requirement + `getRiskParameters`). |
| UniV3 only (`slot0`) | `SemiFungiblePositionManagerV4` over UniV4 `PoolManager`; reads via `V4StateReader.extsload` | V2 | Use the V4 SFPM + UniV4 pool; read via StateView/extsload. |
| Solidity `=0.8.18` (V1) | **`^0.8.24`** (every V2 file) + cancun | V2 | Multi-version matrix is OBSOLETE — single `^0.8.24`/cancun compile. |

**Deprecated/outdated (do NOT use in Phase 7):**
- Panoptic **V1** (`panoptic-v1-core`, `=0.8.18`) — EOL, trading disabled, wrong ABI.
- The inherited STACK/ARCHITECTURE/PITFALLS Celo/UniV3/cCOP-USDT-pool addresses — superseded by the Base/UniV4 pivot (those docs predate it; SUMMARY.md is the authority).

---

## Open Questions

1. **Exact `sqrtPriceX96` literal for cCOP/USD ≈ 1/4000 across the 6dp/18dp decimal gap.**
   - What we know: price = (sqrtP/2^96)^2 = raw amount1/amount0; USDC 6dp, cCOP 18dp; rate ≈ 4000 cCOP/USD.
   - What's unclear: the final integer after currency ordering + decimal scaling.
   - Recommendation: compute with a `TickMath`/`encodeSqrtRatioX96` helper in the test; assert the round-trip human rate; document the literal. (Mechanical, not a blocker.)

2. **Which UniV4 LP path makes `liquidity > 0` observable for FORK-02** (Uniswap `PositionManager` vs minting through the borrowed `SFPMV4`).
   - Recommendation: for FORK-02's "read initialized state," asserting `sqrtPriceX96 > 0` after `initialize` is sufficient; add liquidity via `SFPMV4.mintTokenizedPosition` (which FORK-03 needs anyway) to also observe `liquidity > 0`. Planner sequences.

3. **Whether to pin v4-core/v4-periphery by tag or by the commit Panoptic V2 was audited against.**
   - Recommendation: pin v4-core/periphery to a recent stable tag; if the borrowed SFPMV4 fails to compile against it, fall back to the v4-core commit referenced in the C4 repo's `lib/`. (Verify at build.)

---

## Validation Architecture

> nyquist_validation is enabled (config.json: `workflow.nyquist_validation` absent → treated as enabled).

The minimal observable signals that prove FORK-01/02/03 are TRUE.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Foundry `forge` 1.5.1-stable (+ `bulloak` for `.tree` scaffolding/check) |
| Config file | `contracts/foundry.toml` (MODIFIED: + `[rpc_endpoints] base`, `evm_version="cancun"`, `solc="0.8.24"`) + `contracts/remappings.txt` (NEW) |
| Quick run command | `forge test --match-path 'test/instrument/*' -vvv` |
| Full suite command | `forge test --fork-url $BASE_RPC_URL` (fork tests) + `bulloak check test/spec/*.tree` |

### Phase Requirements → Test Map
| Req ID | Behavior (observable signal) | Test Type | Automated Command | File Exists? |
|--------|------------------------------|-----------|-------------------|--------------|
| FORK-01 | Whole project compiles under single `^0.8.24`/cancun and the fork-harness test runs green against a pinned Base block | fork compile+run | `forge build && forge test --match-path test/fork/BaseForkHarness.t.sol -x` | ❌ Wave 0 |
| FORK-01 | `bulloak check` passes for every `.tree` (evm-tdd loop operable) | static | `bulloak check test/spec/*.tree` | ❌ Wave 0 (bulloak install) |
| FORK-01 | `NOTICE` exists and names the borrowed commit SHA + BUSL Change Date | static | `grep -q "fe557748210a529ae414d7c487b6514be0d9e220" NOTICE && grep -q "BUSL-1.1" NOTICE` | ❌ Wave 0 |
| FORK-02 | After `PoolManager.initialize(key, sqrtP)`, a consumer reads `sqrtPriceX96 > 0` (and `liquidity > 0` once LP'd) via `StateView` | fork integration | `forge test --match-test test_ccopUsdcPool_initialized_state_readable --fork-url $BASE_RPC_URL -x` | ❌ Wave 0 |
| FORK-03 | The borrowed concrete is assignable to `IPanopticData` (seam compiles) and a test mints+burns ONE position through the interface only | fork integration | `forge test --match-test test_mintBurn_single_position_through_IPanopticData --fork-url $BASE_RPC_URL -x` | ❌ Wave 0 |
| FORK-03 | The seam test imports **no** borrowed concrete type | static | `! grep -E "import.*panoptic-borrowed" test/instrument/PanopticDataSeam.fork.t.sol` | ❌ Wave 0 |

**What each criterion's PROOF is:**
- **FORK-01 (compile+green):** a single `forge build` with no version-conflict error, plus a passing fork test that touches the live Base `PoolManager` (proves cancun/transient storage works on the fork). The *absence* of a multi-version matrix is itself the proof the unknown was retired.
- **FORK-02 (pool init):** `StateView.getSlot0(poolId).sqrtPriceX96 > 0` after our `initialize` call = our own cCOP/USDC pool exists and is initialized; `getLiquidity(poolId) > 0` after an LP mint = it is exercisable. (Cross-check with `V4StateReader.getSqrtPriceX96` for parity.)
- **FORK-03 (swap seam holds):** (a) the assignment `IPanopticData(address(borrowedPool))` compiles → the concrete satisfies the interface; (b) `getAccumulatedFeesAndPositionsData` returns a non-reverting `PositionBalance[]` of length 1 after `dispatch` → a position was minted through the interface; (c) `dispatch` with a differing size burns it; (d) the static grep proving no concrete import → the consumer truly depends on the interface only.

### Sampling Rate
- **Per task commit:** `forge test --match-path test/instrument/* -vvv` (+ `bulloak check` on any touched `.tree`).
- **Per wave merge:** `forge test --fork-url $BASE_RPC_URL` (full fork suite) + `forge build`.
- **Phase gate:** full fork suite green + `bulloak check` clean + `NOTICE` present, before `/gsd:verify-work`.

### Wave 0 Gaps
- [ ] `contracts/foundry.toml` — add `[rpc_endpoints] base`, `evm_version="cancun"`, `solc="0.8.24"`, fuzz floor.
- [ ] `contracts/remappings.txt` — `@contracts/`, `@libraries/`, `@types/`, `@tokens/`, `@base/`, `v4-core/`, `v4-periphery/`, `solmate/`.
- [ ] `contracts/NOTICE` — BUSL-1.1 provenance (commit `fe55774…`, Change Date ≤ 2027-09-07, non-production scope).
- [ ] `contracts/panoptic-borrowed/**` — minimal V2 core (§3.2), BUSL headers intact.
- [ ] `contracts/src/instrument/interfaces/IPanopticData.sol` — V2 ABI subset (§3.4).
- [ ] `contracts/test/mocks/MockCcop.sol` — 18-dp ERC20.
- [ ] `contracts/test/fork/BaseForkHarness.t.sol` + `test/spec/BaseForkHarness.tree`.
- [ ] `contracts/test/instrument/CcopUsdcPool.fork.t.sol` + `test/spec/CcopUsdcPool.tree`.
- [ ] `contracts/test/instrument/PanopticDataSeam.fork.t.sol` + `test/spec/PanopticDataSeam.tree`.
- [ ] Tool install: `cargo install bulloak`; v4-core/v4-periphery/solmate `forge install`.
- [ ] `.env` — `BASE_RPC_URL` (archive); `BASE_FORK_BLOCK` constant pinned.

---

## §1 Base fork: addresses, RPC, fork block (RETIRES unknown #5)

**Uniswap V4 on Base mainnet (chainId 8453)** — verified `developers.uniswap.org/contracts/v4/deployments`:

| Contract | Address |
|----------|---------|
| `PoolManager` | `0x498581fF718922c3f8e6A244956aF099B2652b2b` |
| `PositionManager` | `0x7C5f5A4bBd8fD63184577525326123B519429bDc` |
| `StateView` | `0xA3c0c9b65baD0b08107Aa264b0f3dB444b867A71` |
| `Quoter` | `0x0d5e0F971ED27FBfF6c2837bf31316121532048D` |
| `Universal Router` | `0xfDf682F51fE81AA4898f0Ae2163d8a55C127Fbc7` |
| `Permit2` | `0x000000000022D473030F116dDEE9F6B43aC78BA3` |
| USDC (native, Base) | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |

**RPC + fork block:**
- `[rpc_endpoints] base = "${BASE_RPC_URL}"`; set `BASE_RPC_URL` in gitignored `.env`.
- Public `https://mainnet.base.org` is latest-state + rate-limited (OK for a *recent* pinned block; risky for deep history). For determinism + archive depth, use a free-tier archive endpoint (Alchemy / dRPC / Dwellir / OnFinality all expose Base archive).
- **Pin `BASE_FORK_BLOCK`** to a recent finalized block (resolve `cast block-number --rpc-url $BASE_RPC_URL` at build; lock a few hundred blocks back). Reproducibility matters for Phase 8 streamia-accrual tests.

## §2 cCOP/USDC UniV4 pool deploy (RETIRES unknown #4)
- Deploy mock cCOP as a plain 18-dp ERC20. Build a `PoolKey` (currencies ascending; `fee=500`, `tickSpacing=10`; `hooks=address(0)`).
- `IPoolManager(PoolManager).initialize(key, sqrtPriceX96)` with `sqrtPriceX96` encoding cCOP/USD ≈ 1/4000 (account for 6dp USDC vs 18dp cCOP in the raw ratio).
- Read initialized state via `StateView.getSlot0(poolId)` / `getLiquidity(poolId)` (or Panoptic `V4StateReader.getSqrtPriceX96(manager, poolId)` via `extsload`). Make liquidity observable by LPing through `SFPMV4.mintTokenizedPosition` (FORK-03 needs it anyway) or the UniV4 `PositionManager`.

## §3 Borrowed Panoptic V2 core (RETIRES unknowns #1, #2, #3)

### §3.1 Provenance (pin these)
- **Audited frozen snapshot (recommended NOTICE pin):** `github.com/code-423n4/2025-12-panoptic` @ `fe557748210a529ae414d7c487b6514be0d9e220` (2025-12-23). Code4rena "Panoptic: Next Core", 19 Dec 2025 – 7 Jan 2026.
- **Canonical live mirror:** `github.com/panoptic-labs/panoptic-v2-core` @ `d20b0aed127ab5d3e5ca17c5399782aad2f0ff4c` (`main`, public). Use only if a post-audit fix is needed.
- **License:** **BUSL-1.1** (Licensor: Axicon Labs Limited; Licensed Work "Panoptic V1" per the LICENSE header text; Change Date = earlier of 2027-09-07 or `v1-license-date.panoptic.eth`; Additional Use Grant at `v1-license-grants.panoptic.eth`; Change License GPL v2.0+). Interfaces/tokens/`Multicall.sol` + selected libs/types are GPL; tests/scripts unlicensed. **Fork/non-production use is permitted — that is exactly our scope.**

### §3.2 Minimal V2 contract set to borrow (verified at the pinned commit)
**Core (concrete):** `PanopticPool.sol`, `CollateralTracker.sol`, `SemiFungiblePositionManagerV4.sol`, `RiskEngine.sol`.
**Interfaces:** `interfaces/IRiskEngine.sol`, `interfaces/ISemiFungiblePositionManager.sol`.
**Libraries:** `Math.sol`, `PanopticMath.sol`, `FeesCalc.sol`, `V4StateReader.sol`, `Constants.sol`, `Errors.sol`, `CallbackLib.sol`, `EfficientHash.sol`, `SafeTransferLib.sol`, `InteractionHelper.sol`.
**Types:** `TokenId.sol`, `LeftRight.sol`, `LiquidityChunk.sol`, `PositionBalance.sol`, `MarketState.sol`, `OraclePack.sol`, `PoolData.sol`, `RiskParameters.sol`, `Pointer.sol`.
**Tokens/base (as imported):** `tokens/ERC1155Minimal.sol`, `tokens/ERC20Minimal.sol`, `tokens/interfaces/IERC20Partial.sol`, `base/Multicall.sol`.
**NOT in the minimal set:** `PanopticFactory.sol` / `PanopticFactoryV4.sol` (deploy one pool directly, not a factory), `base/FactoryNFT.sol`, `base/MetadataStore.sol`, the non-V4 `SemiFungiblePositionManager.sol` (UniV3 — we use the **V4** SFPM).
> Pull exactly what the kept files import; the V2 import graph is `@contracts/@libraries/@types/@tokens/@base` aliases (set in `remappings.txt`) + `v4-core` + `solmate`.

### §3.3 V2 mechanics — how a consumer mints/burns and reads premium (RETIRES #2)
- **Mint / burn / settle:** `PanopticPool.dispatch(TokenId[] positionIdList, TokenId[] finalPositionIdList, uint128[] positionSizes, int24[3][] tickAndSpreadLimits, bool usePremiaAsCollateral, uint256 builderCode)`. Per tokenId: stored `PositionBalance==0` ⇒ **mint**; input size == stored size ⇒ **settle**; else ⇒ **burn**. (`tickAndSpreadLimits[i] = [tickLo, tickHi, spreadX10000]`.)
- **Liquidation / forceExercise / settleLongPremium:** `PanopticPool.dispatchFrom(TokenId[] positionIdListFrom, address account, TokenId[] positionIdListTo, TokenId[] positionIdListToFinal, LeftRightUnsigned usePremiaAsCollateral)`. Disambiguated by list lengths: same `To`/`ToFinal` length ⇒ settle long premium; `ToFinal` one shorter ⇒ force exercise; `ToFinal` empty ⇒ liquidation. (Phase 8 territory; surfaced now so `IPanopticData` reserves the shape.)
- **Streamia/premium READ (never derive):**
  - Pool-level: `getAccumulatedFeesAndPositionsData(address user, bool includePendingPremium, TokenId[] positionIdList) → (LeftRightUnsigned shortPremium, LeftRightUnsigned longPremium, PositionBalance[] balances)`.
  - SFPM-level: `getAccountPremium(bytes poolKey, address owner, uint256 tokenType, int24 tickLower, int24 tickUpper, int24 atTick, uint256 isLong, uint256 vegoid) → (uint128 premium0, uint128 premium1)`.
  - **VEGOID is now a per-pool `vegoid` parameter** (`getPoolId(bytes id, uint8 vegoid)`), NOT the fixed `=2` of V1.
- **Pool state READ:** `V4StateReader.getSqrtPriceX96(IPoolManager, PoolId)` / `getTick` / `getFeeGrowthInside` via `extsload` — or Uniswap `StateView`.
- **Collateral / solvency:** `CollateralTracker` (ERC-20/4626-style shares) + the new central **`RiskEngine`** (collateral requirements, solvency, `getRiskParameters`). The pool exposes `collateralToken0()/collateralToken1()/riskEngine()` as immutable-args getters.

### §3.4 `IPanopticData` (V2) surface to author (RETIRES #3)
Author against the REAL V2 ABI above. Minimal surface for FORK-03 (mint, burn, read premium, read pool state):
```solidity
// SPDX-License-Identifier: MIT  (our interface; the concrete keeps BUSL)
pragma solidity ^0.8.24;
import {TokenId} from "...types/TokenId.sol";
import {PositionBalance} from "...types/PositionBalance.sol";
import {LeftRightUnsigned} from "...types/LeftRight.sol";

interface IPanopticData {
    // mint / burn / settle (size-delta disambiguated)
    function dispatch(
        TokenId[] calldata positionIdList,
        TokenId[] calldata finalPositionIdList,
        uint128[] calldata positionSizes,
        int24[3][] calldata tickAndSpreadLimits,
        bool usePremiaAsCollateral,
        uint256 builderCode
    ) external;

    // liquidation / forceExercise / settleLongPremium (list-length disambiguated) — reserved for Phase 8
    function dispatchFrom(
        TokenId[] calldata positionIdListFrom,
        address account,
        TokenId[] calldata positionIdListTo,
        TokenId[] calldata positionIdListToFinal,
        LeftRightUnsigned usePremiaAsCollateral
    ) external payable;

    // streamia / premium READ
    function getAccumulatedFeesAndPositionsData(
        address user,
        bool includePendingPremium,
        TokenId[] calldata positionIdList
    ) external view returns (LeftRightUnsigned shortPremium, LeftRightUnsigned longPremium, PositionBalance[] memory balances);

    // pool-state reads (for sizing/health; thin in v1)
    function getCurrentTick() external view returns (int24);
    function getTWAP() external view returns (int24);
    function numberOfLegs(address user) external view returns (uint256);
}
```
> The `TokenId`/`PositionBalance`/`LeftRight` types come from the borrowed V2 `types/` — these are GPL/library types, importable by the interface without coupling to the BUSL concrete. The interface depends on V2 *value types*, never on `PanopticPool`/`SFPMV4` concrete contracts. This keeps the swap seam clean.

## §5 Multi-version solc (RETIRES unknown #6 — mostly a non-issue)
**Verified:** every in-scope Panoptic V2 file is `pragma solidity ^0.8.24;` (surveyed all `contracts/**/*.sol` at the pinned commit). The repo is `^0.8.24`. Uniswap v4-core needs `>=0.8.24` + cancun. **One compile satisfies all three** → `solc = "0.8.24"`, `evm_version = "cancun"`, `viaIR = false`, single profile (Pattern 1). The "matrix" was a V1-era concern (V1 was `=0.8.18`). Discipline that remains: do NOT bump the borrowed libs (already `^0.8.24`); set cancun.

## §7 BUSL NOTICE (FORK-01 deliverable)
A committed `contracts/NOTICE` (or repo-root `NOTICE`) must record:
- Source: `github.com/code-423n4/2025-12-panoptic` @ `fe557748210a529ae414d7c487b6514be0d9e220` (canonical mirror `panoptic-labs/panoptic-v2-core` @ `d20b0aed127ab5d3e5ca17c5399782aad2f0ff4c`).
- License: **BUSL-1.1**, Licensor Axicon Labs Limited; Change Date = earlier of 2027-09-07 or `v1-license-date.panoptic.eth`; Change License GPL v2.0+; Additional Use Grant at `v1-license-grants.panoptic.eth`.
- Scope statement: **non-production fork/demo use only** (the permitted BUSL mode); borrowed files retain their `// SPDX-License-Identifier: BUSL-1.1` headers; our wrapper/interface code is separately licensed.

---

## Sources

### Primary (HIGH confidence)
- `github.com/code-423n4/2025-12-panoptic` @ `fe557748210a529ae414d7c487b6514be0d9e220` — full `contracts/` tree, every-file `pragma ^0.8.24`, SPDX `BUSL-1.1`, `LICENSE` (Axicon Labs, Change Date ≤ 2027-09-07), `foundry.toml` (`evm_version=cancun`, `viaIR=false`), `PanopticPool.dispatch`/`dispatchFrom`/`getAccumulatedFeesAndPositionsData`, `ISemiFungiblePositionManager.{mintTokenizedPosition,burnTokenizedPosition,getAccountPremium,getAccountLiquidity,getPoolId}`, `V4StateReader.getSqrtPriceX96` (`extsload`), `SemiFungiblePositionManagerV4` imports (v4-core/solmate) — direct `gh api` inspection 2026-06-01.
- `github.com/panoptic-labs/panoptic-v2-core` — public, `main` @ `d20b0aed…` (2026-04-20), BUSL-1.1 + GPL split — `gh api` metadata.
- `developers.uniswap.org/contracts/v4/deployments` — Base (8453) addresses: PoolManager `0x4985…2b2b`, StateView `0xA3c0…7A71`, PositionManager `0x7C5f…9bDc`, Quoter, Universal Router, Permit2.
- Local: `forge --version` → 1.5.1-stable; `which bulloak` → absent; `contracts/foundry.toml`, `remappings` (none), `src/*.sol` all `^0.8.24`, `test/spec/*.tree`, `.gitignore` (`lib/` ignored) — direct inspection.

### Secondary (MEDIUM confidence)
- `code4rena.com/audits/2025-12-panoptic-next-core` + mitigation rounds — audit window, scope (PanopticPool/RiskEngine/SFPM/SFPMV4/CollateralTracker + types/libs), $56k pool.
- Uniswap v4 quickstart (`docs.uniswap.org/contracts/v4/quickstart/hooks/setup`) — `solc_version="0.8.26"`/`^0.8.24` + `evm_version="cancun"` (transient storage requirement).
- Base RPC providers (Chainstack/dRPC/Dwellir/Alchemy) — free-tier Base archive availability.

### Tertiary (LOW — verify at build)
- DeepWiki `panoptic-labs/panoptic-v2-core` — overview only; superseded by direct source reads above.

---

## Metadata

**Confidence breakdown:**
- Standard stack (versions/commits/addresses): **HIGH** — all from pinned commits + official deployments, inspected directly.
- Architecture (V2 ABI, `IPanopticData` surface, single-version compile): **HIGH** — read from the audited source.
- Pitfalls: **HIGH** — V1-vs-V2 ABI divergence, cancun, BUSL, fork-block all source-grounded.
- The exact `sqrtPriceX96` literal + which LP path makes liquidity observable: **MEDIUM** — mechanical, resolved in-test (Open Questions 1–2).

**Research date:** 2026-06-01
**Valid until:** ~2026-06-30 for the C4 frozen snapshot + Base addresses (stable); re-verify `panoptic-v2-core@main` HEAD and any v4-core tag pin at build (fast-moving).
