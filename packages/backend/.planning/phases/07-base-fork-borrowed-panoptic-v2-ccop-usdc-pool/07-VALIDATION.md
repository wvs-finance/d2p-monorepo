---
phase: 7
slug: base-fork-borrowed-panoptic-v2-ccop-usdc-pool
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-01
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Authority: `07-RESEARCH.md` §Validation Architecture (supersedes the inherited V1/Celo/UniV3 docs).
> Read-path note (B-2): pool state is read via the borrowed `V4StateReader` + v4-core `StateLibrary` (under the `v4-core/` alias), NOT v4-periphery's `StateView` (v4-periphery is not installed — its imports pull the undefined `@uniswap/v4-core/` alias + permit2).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Foundry `forge` 1.5.1-stable + `bulloak` (`.tree` BTT scaffold/check) |
| **Config file** | `contracts/foundry.toml` (MODIFIED: `[rpc_endpoints] base`, `evm_version="cancun"`, `solc="0.8.24"`) + `contracts/remappings.txt` (NEW) |
| **Quick run command** | `forge test --match-path 'test/instrument/*' -vvv` |
| **Full suite command** | `forge test --fork-url "$BASE_RPC_URL"` + `bulloak check test/spec/*.tree` |
| **Estimated runtime** | ~30–90 s (fork tests dominate; local compile fast) |

> **Fork-URL convention (consistency contract):** all fork commands below use the explicit `--fork-url "$BASE_RPC_URL"` form, matching the plans verbatim. The executor MUST `export BASE_RPC_URL` (from `.env`) before running any fork test. (The bare `--fork-url $BASE_RPC_URL` form is NOT used here, to avoid an empty-expansion divergence when the var is unset.)

---

## Sampling Rate

- **After every task commit:** Run `forge test --match-path 'test/instrument/*' -vvv` (+ `bulloak check` on any touched `.tree`)
- **After every plan wave:** Run `forge test --fork-url "$BASE_RPC_URL"` + `forge build`
- **Before `/gsd:verify-work`:** Full fork suite green + `bulloak check` clean + `NOTICE` present
- **Max feedback latency:** ~90 seconds

---

## Per-Task Verification Map

| Req ID | Behavior (observable signal) | Test Type | Automated Command | File Exists |
|--------|------------------------------|-----------|-------------------|-------------|
| FORK-01 | Whole project compiles under single `^0.8.24`/cancun; fork-harness test green against pinned Base block | fork compile+run | `forge build && forge test --match-path test/fork/BaseForkHarness.t.sol --fork-url "$BASE_RPC_URL"` | ❌ W0 |
| FORK-01 | `bulloak check` passes for every `.tree` (evm-tdd loop operable) | static | `bulloak check test/spec/*.tree` | ❌ W0 |
| FORK-01 | `NOTICE` names borrowed commit SHA + BUSL Change Date | static | `grep -q "fe557748210a529ae414d7c487b6514be0d9e220" NOTICE && grep -q "BUSL-1.1" NOTICE` | ❌ W0 |
| FORK-02 | After `PoolManager.initialize(key, sqrtP)`, consumer reads `sqrtPriceX96 > 0` via `V4StateReader.getSqrtPriceX96` (and `liquidity > 0` via `StateLibrary.getLiquidity` once LP'd) — B-2, NOT v4-periphery `StateView` | fork integration | `forge test --match-test test_ccopUsdcPool_initialized_state_readable --fork-url "$BASE_RPC_URL"` | ❌ W0 |
| FORK-02 | Pool-state read path uses no v4-periphery `StateView` (B-2) | static | `! grep -rq "StateView" test/instrument/CcopUsdcPool.fork.t.sol` | ❌ W0 |
| FORK-03 | Borrowed concrete assignable to `IPanopticData`; test mints+burns ONE position through interface only | fork integration | `forge test --match-test test_mintBurn_single_position_through_IPanopticData --fork-url "$BASE_RPC_URL"` | ❌ W0 |
| FORK-03 | Seam test imports **no** borrowed concrete type | static | `! grep -E "import.*panoptic-borrowed" test/instrument/PanopticDataSeam.fork.t.sol` | ❌ W0 |
| FORK-03 | Seam test imports **no** deploy helper (no transitive coupling to the concrete) | static | `! grep -E "import.*PanopticV2DeployHelper" test/instrument/PanopticDataSeam.fork.t.sol` | ❌ W0 |
| FORK-03 | Seam test deposits collateral via `IERC4626` (ct0/ct1) — not the concrete `CollateralTracker` (B-1 seam-guard) | static | `grep -q "IERC4626" test/instrument/PanopticDataSeam.fork.t.sol` | ❌ W0 |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky — all ⬜ pending at plan time.*

**Proof semantics per criterion:**
- **FORK-01:** single `forge build` with no version-conflict + a passing fork test touching live Base `PoolManager` (proves cancun/transient storage on the fork; the touch reads via `V4StateReader`/`StateLibrary`, not `StateView` — B-2). The *absence* of a multi-version matrix is itself proof the unknown was retired.
- **FORK-02:** `V4StateReader.getSqrtPriceX96(poolId) > 0` after `initialize` = pool exists/initialized; `StateLibrary.getLiquidity(poolId) > 0` after the `V4LpHelper` full-range LP mint (M-1) = exercisable. The read path is the borrowed `V4StateReader` + v4-core `StateLibrary` under the `v4-core/` alias (B-2) — v4-periphery's `StateView` is NOT used. The `mn-3` round-trip asserts the decoded price maps (through the runtime currency ordering from the shared `PoolKeyLib`) to a human cCOP/USD rate in [3000,5000].
- **FORK-03:** (a) `forge build` exit 0 with the helper-returned `address` consumed as `IPanopticData` → compile-time conformance (an unchecked cast alone proves nothing); (b) `getAccumulatedFeesAndPositionsData` returns non-reverting `PositionBalance[]` len 1 after `dispatch` of a concrete one-leg short `TokenId` (M-2) → minted through interface at runtime; (c) `dispatch` with size 0 (≠ stored) burns it; (d) static guards → consumer depends on the interface only, with NO transitive coupling (neither `panoptic-borrowed` nor `PanopticV2DeployHelper` imported), and collateral is deposited via `IERC4626` ct0/ct1 (B-1) rather than the concrete `CollateralTracker`.

---

## Wave 0 Requirements

- [ ] `contracts/foundry.toml` — add `[rpc_endpoints] base`, `evm_version="cancun"`, `solc="0.8.24"`, fuzz floor
- [ ] `contracts/remappings.txt` — `@contracts/`, `@libraries/`, `@types/`, `@tokens/`, `@base/`, `v4-core/`, `clones-with-immutable-args/`, `univ3-core/`, `univ3-periphery/`, `@openzeppelin/` (into v4-core's vendored OZ), `solmate/` — NO `v4-periphery/` (B-2)
- [ ] `contracts/NOTICE` — BUSL-1.1 provenance (commit `fe55774…`, Change Date ≤ 2027-09-07, non-production scope)
- [ ] `contracts/panoptic-borrowed/**` — minimal V2 core + `PanopticFactoryV4` + CWIA bases + `FactoryNFT`/`MetadataStore`/`Pointer` + `libraries/V4StateReader` (RESEARCH-DEPLOY §F), BUSL headers intact
- [ ] `contracts/src/instrument/interfaces/IPanopticData.sol` — V2 ABI subset (RESEARCH-DEPLOY §E)
- [ ] `contracts/test/mocks/MockCcop.sol` — 18-dp ERC20
- [ ] `contracts/test/fork/BaseForkHarness.t.sol` + `test/spec/BaseForkHarness.tree`
- [ ] `contracts/test/instrument/helpers/PoolKeyLib.sol` — shared cCOP/USDC PoolKey + sqrtPriceX96 builder (runtime currency ordering; mn-C — reused by Plan 04 & 05)
- [ ] `contracts/test/instrument/helpers/V4LpHelper.sol` — minimal `IUnlockCallback` full-range LP (M-1)
- [ ] `contracts/test/instrument/CcopUsdcPool.fork.t.sol` + `test/spec/CcopUsdcPool.tree`
- [ ] `contracts/test/instrument/helpers/PanopticV2DeployHelper.sol` — factory-choreography V2 deploy (own MockCcop + PoolKeyLib + V4LpHelper → deployNewPool); returns pool `address` + ct0/ct1 as `IERC4626` + token addresses
- [ ] `contracts/test/instrument/PanopticDataSeam.fork.t.sol` + `test/spec/PanopticDataSeam.tree`
- [ ] Tool install: `cargo install bulloak`; `forge install` v4-core / 1inch clones-with-immutable-args / solmate / solady / v3-core / v3-periphery / openzeppelin-contracts (NO v4-periphery — B-2)
- [ ] `.env` — `BASE_RPC_URL` (archive); `BASE_FORK_BLOCK` Solidity constant pinned in the test source (M-4)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Free-tier Base archive RPC reaches the pinned `BASE_FORK_BLOCK` | FORK-01/02/03 | Depends on external RPC archive depth; not assertable in-process | Run the full fork suite once against `$BASE_RPC_URL`; if it errors "missing trie node"/"block not found", re-pin `BASE_FORK_BLOCK` to a more recent finalized block |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 90s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
