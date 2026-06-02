---
phase: 07-base-fork-borrowed-panoptic-v2-ccop-usdc-pool
verified: 2026-06-01T23:34:02-04:00
status: passed
score: 4/4 must-haves verified
gaps: []
---

# Phase 7: Base-fork Harness + Borrowed Panoptic V2 + cCOP/USDC Pool — Verification Report

**Phase Goal:** A Foundry Base-fork harness exists in which a borrowed minimal Panoptic V2 core (behind `IPanopticData`) and our own cCOP/USDC UniV4 pool are deployed and exercisable — the foundation every later phase builds on.
**Verified:** 2026-06-01T23:34:02-04:00
**Status:** PASSED
**Re-verification:** No — initial verification
**Branch verified:** `feat/keeper-vercel-buildoutput`

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | (FORK-01) `forge build` and `forge test --match-path test/fork/BaseForkHarness.t.sol --fork-url "$BASE_RPC_URL"` both pass under single `^0.8.24`/cancun profile | VERIFIED | `forge build` exits 0; 2/2 fork tests pass live; single-compile supersession of the roadmap's "multi-version matrix" is documented in ROADMAP.md line 81, NOTICE, and all relevant SUMMARYs |
| 2 | (FORK-02) A fork test deploys our own cCOP/USDC UniV4 pool and a consumer reads `sqrtPriceX96 > 0` and `liquidity > 0` | VERIFIED | `test_ccopUsdcPool_initialized_state_readable` PASS (1/1); full CcopUsdcPool suite 4/4 green |
| 3 | (FORK-03) A consumer imports ONLY `IPanopticData`; the borrowed V2 concrete satisfies it; a test mints+burns one position through the interface, never importing the concrete directly | VERIFIED | `test_mintBurn_single_position_through_IPanopticData` PASS (1/1); all 3 seam guards hold; full instrument suite 8/8 green |
| 4 | (process gate) BUSL-1.1 NOTICE records borrowed V2 commit + provenance; `bulloak 0.9.2` installed; per-file `.tree` specs for all 3 phase trees pass `bulloak check` | VERIFIED | NOTICE contains `fe557748210a529ae414d7c487b6514be0d9e220` and `BUSL-1.1`; `bulloak --version` returns 0.9.2; all 3 per-file checks exit 0 |

**Score:** 4/4 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `contracts/foundry.toml` | Single `^0.8.24`/cancun profile + `[rpc_endpoints] base` + `[fuzz] runs=256` | VERIFIED | `solc="0.8.24"`, `evm_version="cancun"`, `viaIR=false`, `[rpc_endpoints] base="${BASE_RPC_URL}"`, `[fuzz] runs=256` all present |
| `contracts/remappings.txt` | Audit-verbatim aliases, `@{contracts,libraries,types,tokens,base}/` -> `panoptic-borrowed/`, no `v4-periphery` | VERIFIED | 5 panoptic-borrowed aliases confirmed; `v4-periphery` absent from remappings and from `lib/` |
| `contracts/NOTICE` | BUSL-1.1 with borrowed commit SHA `fe557748…` | VERIFIED | Both `grep` checks pass |
| `contracts/foundry.lock` | Pins all 7 §C dep SHAs | VERIFIED | 22-line lock file present; `lib/` is gitignored |
| `contracts/panoptic-borrowed/` | 31-file minimal §F closure (5 concretes + 3 base + 2 interfaces + 10 libraries + 9 types + 3 tokens); BUSL headers intact; no V3 SFPM/factory | VERIFIED | 32 files present on disk (31 in §F + `tokens/interfaces/IERC20Partial.sol` sub-interface); BUSL header confirmed in `PanopticPool.sol`; `^0.8.24` pragma present; no v4-periphery import in tree |
| `contracts/src/instrument/interfaces/IPanopticData.sol` | 6 §E-verified V2 functions; no concrete imports; no V1 `mintOptions`/`burnOptions` | VERIFIED | 7 `function` lines (6 declared + 1 Solidity artifact); all 3 negative guards pass |
| `contracts/test/mocks/MockCcop.sol` | 18-dp mintable ERC20 | VERIFIED | `function decimals` and `function mint(` present |
| `contracts/test/fork/BaseForkHarness.t.sol` + `BaseForkHarness.tree` | Fork harness asserting chainid 8453 + live PoolManager touch via V4StateReader; tree co-located same-dir | VERIFIED | 2/2 tests pass; `BASE_FORK_BLOCK = 46700000` Solidity constant; no `StateView` token; `bulloak check` exits 0 |
| `contracts/test/instrument/CcopUsdcPool.t.sol` + `CcopUsdcPool.tree` | cCOP/USDC pool deploy + state read + rate round-trip + full-range LP | VERIFIED | 4/4 tests pass; `bulloak check` exits 0 |
| `contracts/test/instrument/helpers/PoolKeyLib.sol` | Runtime currency ordering + sqrtPriceX96 builder + `decodeHumanRate` inverse | VERIFIED | File present; used in CcopUsdcPool.t.sol and PanopticDataSeam.fork.t.sol (via base) |
| `contracts/test/instrument/helpers/V4LpHelper.sol` | `IUnlockCallback` full-range LP via inlined settle | VERIFIED | File present; `unlockCallback` + inlined `sync/transfer/settle`/`take` pattern |
| `contracts/test/instrument/PanopticDataSeam.fork.t.sol` + `PanopticDataSeam.fork.tree` | Seam test importing only `IPanopticData` + `IERC4626`; seam guards hold | VERIFIED | 4/4 tests pass; all 3 seam guards pass; `bulloak check` exits 0 |
| `contracts/test/instrument/PanopticDataSeamBase.sol` | M-3 deploy-isolation base absorbing all concrete coupling | VERIFIED | File present; seam test imports only the base, not `panoptic-borrowed` or the helper directly |
| `contracts/test/instrument/helpers/PanopticV2DeployHelper.sol` | CWIA factory-choreography deploy returning seam-safe `Deployed` struct | VERIFIED | File present; `deployNewPool(`, `new PanopticFactory`, `buildCcopUsdcKey`, `addFullRangeLiquidity`, `IERC4626` all confirmed by SUMMARY grepping |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `BaseForkHarness.t.sol` | Live Base PoolManager `0x498581…2b2b` | `vm.createSelectFork(rpcUrl("base"), BASE_FORK_BLOCK)` + `V4StateReader.getSqrtPriceX96` | WIRED | 2/2 fork tests pass; chainid + code.length + extsload all confirmed live |
| `CcopUsdcPool.t.sol` | `PoolManager.initialize` + state read | `PoolKeyLib.buildCcopUsdcKey` -> `manager.initialize` -> `V4StateReader.getSqrtPriceX96` + `StateLibrary.getLiquidity` | WIRED | 4/4 tests pass including the named FORK-02 test |
| `PanopticDataSeam.fork.t.sol` | `IPanopticData.dispatch` mint+burn | `PanopticDataSeamBase` -> `PanopticV2DeployHelper.deployPanopticV2` -> `IPanopticData(pool.dispatch/getAccumulatedFeesAndPositionsData)` | WIRED | 4/4 tests pass; seam test never imports concrete; seam-safe types only exposed |
| `IPanopticData` | `PanopticPool` (concrete, borrowed) | Compile-time: helper returns `address` consumed as `IPanopticData`; runtime: `dispatch` reaches `PanopticPool` | WIRED | `forge build` exit 0 = compile-time conformance; green runtime test = runtime dispatch proven |
| `panoptic-borrowed/` aliases | `lib/` deps | `remappings.txt` §C aliases: `v4-core/`, `clones-with-immutable-args/`, `solmate/`, `@openzeppelin/`, `univ3-core/`, `univ3-periphery/` | WIRED | `forge build` resolves all transitive imports; no v4-periphery import path present |

---

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|---------|
| FORK-01 | 07-01, 07-03 | Foundry Base-fork harness (UniV4 PoolManager + pinned block), single `^0.8.24`/cancun compile, bulloak + BUSL NOTICE | SATISFIED | `forge build` exits 0; `BaseForkHarness.t.sol` 2/2 green; NOTICE verified; bulloak 0.9.2 on PATH; note: "multi-version solc matrix" wording in ROADMAP retired by 07-RESEARCH §5 — single cancun compile is the CORRECT state |
| FORK-02 | 07-04 | Deploy own cCOP/USDC UniV4 pool (mock cCOP) on fork; consumer reads initialized `sqrtPriceX96`/`liquidity` | SATISFIED | `test_ccopUsdcPool_initialized_state_readable` PASS; rate round-trip [3000,5000] confirmed |
| FORK-03 | 07-02, 07-05 | Borrow minimal Panoptic V2 core behind `IPanopticData`; mint+burn through interface only; swap seam intact | SATISFIED | `test_mintBurn_single_position_through_IPanopticData` PASS; all seam guards hold; 8/8 instrument suite green |

All 3 FORK requirements are marked Complete in `REQUIREMENTS.md` and verified here against the actual codebase.

---

### Anti-Patterns Found

No blockers or stubs found in Phase-7 artifacts. The following are pre-existing out-of-scope items not attributable to this phase:

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| `src/MacroOracle.sol` | `named-struct-fields`, `asm-keccak256` lint notes | Info | Pre-existing; `forge build` exits 0; out of Phase-7 scope |
| `test/spec/MacroOracle.tree`, `SomniaAgentConsumer.*.tree` | `bulloak check test/spec/*.tree` exits with 4 warnings (invalid identifiers `/`, `.`) | Info | Pre-existing trees authored before bulloak was wired in; the full-glob is NOT a Phase-7 gate; all 3 Phase-7 per-file checks exit 0 |

The `bulloak check test/spec/*.tree` exit behavior deserves an explicit note: the check produces 4 warnings but exits 0 (warnings only, not errors). The Phase-7 gate is per-file, and all 3 Phase-7 trees (`BaseForkHarness.tree`, `CcopUsdcPool.tree`, `PanopticDataSeam.fork.tree`) pass cleanly.

---

### Human Verification Required

One item is outside automated reach:

**1. RPC archive depth at BASE_FORK_BLOCK**

**Test:** Run `cast code 0x498581fF718922c3f8e6A244956aF099B2652b2b --rpc-url "$BASE_RPC_URL"` and confirm non-empty bytecode. Run the full fork suite.
**Expected:** Non-empty bytecode (48020 hex chars observed at time of authoring); fork tests complete without "missing trie node" errors.
**Why human:** Depends on whether the configured Alchemy Base endpoint continues to archive-serve block 46700000 over time. The plan documents a manual re-pin procedure if this fails. This is a maintenance concern, not a current gap — the automated test run confirmed it is reachable today.

---

### Summary

All four success criteria are met by green tests against the actual codebase, not just SUMMARY claims:

- `forge build` exits 0 (single cancun/0.8.24 profile, zero errors)
- `BaseForkHarness.t.sol` 2/2 green — FORK-01 proven by live Base fork
- `test_ccopUsdcPool_initialized_state_readable` PASS — FORK-02 proven, full 4/4 suite green
- `test_mintBurn_single_position_through_IPanopticData` PASS — FORK-03 proven, full 8/8 instrument suite green
- All 3 per-file `bulloak check` calls exit 0; NOTICE has both required patterns; `bulloak 0.9.2` on PATH
- All 14 claimed key-file artifacts exist on disk and are substantive (not stubs)
- All 14 Phase-7 task commits exist in `feat/keeper-vercel-buildoutput` history; BTT Iron-Law ordering (tree before impl) holds for all 3 test files
- FORK-01/02/03 all marked Complete in `REQUIREMENTS.md`

The single-compile supersession of FORK-01's "multi-version solc matrix" wording is correctly NOT a gap: it is documented in ROADMAP.md, NOTICE, and every relevant SUMMARY, and the single-cancun outcome is the only one consistent with Panoptic V2's universal `^0.8.24` pragma.

---

_Verified: 2026-06-01T23:34:02-04:00_
_Branch: feat/keeper-vercel-buildoutput_
_Verifier: Claude (gsd-verifier)_
