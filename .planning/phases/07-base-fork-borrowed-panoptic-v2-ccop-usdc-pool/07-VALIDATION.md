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

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Foundry `forge` 1.5.1-stable + `bulloak` (`.tree` BTT scaffold/check) |
| **Config file** | `contracts/foundry.toml` (MODIFIED: `[rpc_endpoints] base`, `evm_version="cancun"`, `solc="0.8.24"`) + `contracts/remappings.txt` (NEW) |
| **Quick run command** | `forge test --match-path 'test/instrument/*' -vvv` |
| **Full suite command** | `forge test --fork-url $BASE_RPC_URL` + `bulloak check test/spec/*.tree` |
| **Estimated runtime** | ~30–90 s (fork tests dominate; local compile fast) |

---

## Sampling Rate

- **After every task commit:** Run `forge test --match-path 'test/instrument/*' -vvv` (+ `bulloak check` on any touched `.tree`)
- **After every plan wave:** Run `forge test --fork-url $BASE_RPC_URL` + `forge build`
- **Before `/gsd:verify-work`:** Full fork suite green + `bulloak check` clean + `NOTICE` present
- **Max feedback latency:** ~90 seconds

---

## Per-Task Verification Map

| Req ID | Behavior (observable signal) | Test Type | Automated Command | File Exists |
|--------|------------------------------|-----------|-------------------|-------------|
| FORK-01 | Whole project compiles under single `^0.8.24`/cancun; fork-harness test green against pinned Base block | fork compile+run | `forge build && forge test --match-path test/fork/BaseForkHarness.t.sol` | ❌ W0 |
| FORK-01 | `bulloak check` passes for every `.tree` (evm-tdd loop operable) | static | `bulloak check test/spec/*.tree` | ❌ W0 |
| FORK-01 | `NOTICE` names borrowed commit SHA + BUSL Change Date | static | `grep -q "fe557748210a529ae414d7c487b6514be0d9e220" NOTICE && grep -q "BUSL-1.1" NOTICE` | ❌ W0 |
| FORK-02 | After `PoolManager.initialize(key, sqrtP)`, consumer reads `sqrtPriceX96 > 0` (and `liquidity > 0` once LP'd) via `StateView` | fork integration | `forge test --match-test test_ccopUsdcPool_initialized_state_readable --fork-url $BASE_RPC_URL` | ❌ W0 |
| FORK-03 | Borrowed concrete assignable to `IPanopticData`; test mints+burns ONE position through interface only | fork integration | `forge test --match-test test_mintBurn_single_position_through_IPanopticData --fork-url $BASE_RPC_URL` | ❌ W0 |
| FORK-03 | Seam test imports **no** borrowed concrete type | static | `! grep -E "import.*panoptic-borrowed" test/instrument/PanopticDataSeam.fork.t.sol` | ❌ W0 |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky — all ⬜ pending at plan time.*

**Proof semantics per criterion:**
- **FORK-01:** single `forge build` with no version-conflict + a passing fork test touching live Base `PoolManager` (proves cancun/transient storage on the fork). The *absence* of a multi-version matrix is itself proof the unknown was retired.
- **FORK-02:** `StateView.getSlot0(poolId).sqrtPriceX96 > 0` after `initialize` = pool exists/initialized; `getLiquidity(poolId) > 0` after LP mint = exercisable. Cross-check `V4StateReader.getSqrtPriceX96` for parity.
- **FORK-03:** (a) `IPanopticData(address(borrowedPool))` compiles → concrete satisfies interface; (b) `getAccumulatedFeesAndPositionsData` returns non-reverting `PositionBalance[]` len 1 after `dispatch` → minted through interface; (c) `dispatch` with differing size burns it; (d) static grep → consumer depends on interface only.

---

## Wave 0 Requirements

- [ ] `contracts/foundry.toml` — add `[rpc_endpoints] base`, `evm_version="cancun"`, `solc="0.8.24"`, fuzz floor
- [ ] `contracts/remappings.txt` — `@contracts/`, `@libraries/`, `@types/`, `@tokens/`, `@base/`, `v4-core/`, `v4-periphery/`, `solmate/`
- [ ] `contracts/NOTICE` — BUSL-1.1 provenance (commit `fe55774…`, Change Date ≤ 2027-09-07, non-production scope)
- [ ] `contracts/panoptic-borrowed/**` — minimal V2 core (RESEARCH §3.2), BUSL headers intact
- [ ] `contracts/src/instrument/interfaces/IPanopticData.sol` — V2 ABI subset (RESEARCH §3.4)
- [ ] `contracts/test/mocks/MockCcop.sol` — 18-dp ERC20
- [ ] `contracts/test/fork/BaseForkHarness.t.sol` + `test/spec/BaseForkHarness.tree`
- [ ] `contracts/test/instrument/CcopUsdcPool.fork.t.sol` + `test/spec/CcopUsdcPool.tree`
- [ ] `contracts/test/instrument/PanopticDataSeam.fork.t.sol` + `test/spec/PanopticDataSeam.tree`
- [ ] Tool install: `cargo install bulloak`; `forge install` v4-core / v4-periphery / solmate
- [ ] `.env` — `BASE_RPC_URL` (archive); `BASE_FORK_BLOCK` constant pinned

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
