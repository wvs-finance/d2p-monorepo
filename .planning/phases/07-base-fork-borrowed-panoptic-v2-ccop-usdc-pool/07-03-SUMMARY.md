---
phase: 07-base-fork-borrowed-panoptic-v2-ccop-usdc-pool
plan: 03
subsystem: base-mainnet-fork-harness
tags: [base-fork, foundry, bulloak, btt, uniswap-v4, poolmanager, v4statereader, cancun, fork-01]

requires:
  - phase: 07-01
    provides: "single cancun/0.8.24 foundry profile + [rpc_endpoints] base=${BASE_RPC_URL} + v4-core/clones/solmate remappings + bulloak 0.9.2"
  - phase: 07-02
    provides: "borrowed panoptic-borrowed/libraries/V4StateReader.sol (getSqrtPriceX96(IPoolManager, PoolId) via StateLibrary extsload) under the v4-core/ alias"
provides:
  - "contracts/test/fork/BaseForkHarness.t.sol — vm.createSelectFork(rpcUrl(\"base\"), BASE_FORK_BLOCK) harness asserting chainid 8453, live PoolManager code.length>0, and a V4StateReader state read under cancun (the FORK-01 fork-run proof)"
  - "contracts/test/fork/BaseForkHarness.tree — committed BTT spec (one behavioral unit forkAndTouchPoolManager), bulloak-check clean"
  - "Solidity constant BASE_FORK_BLOCK = 46700000 (M-4: pinned in source, NOT env) — the deterministic fork-block pin Phase-8 streamia-accrual tests reuse"
affects:
  - "Plan 04 (cCOP/USDC pool): extends this harness — PoolManager.initialize + factory.deployNewPool at the same pinned block"
  - "Plan 05 (seam test): runs against the forked PoolManager this harness selects"

tech-stack:
  added: []
  patterns:
    - "Fork harness pins the block as a Solidity uint256 constant (M-4) so the run is reproducible without an env var; only BASE_RPC_URL comes from .env"
    - "PoolManager touch reads via the borrowed V4StateReader (extsload/StateLibrary) — NEVER v4-periphery StateView (B-2); the B-2 grep guard `! grep StateView` is kept green by avoiding the literal token even in comments"
    - "bulloak 0.9.2 infers the matching .t.sol same-dir as the .tree — tree + harness co-located in test/fork/ (the 0.9.2 reality; see deviation 1)"

key-files:
  created:
    - "contracts/test/fork/BaseForkHarness.tree"
    - "contracts/test/fork/BaseForkHarness.t.sol"
  modified: []

key-decisions:
  - "Co-located the .tree with the harness in test/fork/ (NOT test/spec/) because bulloak 0.9.2 infers the matching Solidity file strictly same-dir as the tree; the plan's test/spec/ tree location + test/fork/ impl location cannot both satisfy `bulloak check` in this bulloak version. Co-location makes `bulloak check test/fork/BaseForkHarness.tree` exit 0 while keeping the harness on the VALIDATION-verbatim `--match-path test/fork/...` path."
  - "BASE_FORK_BLOCK = 46700000 kept verbatim from the environment note; archive-verified live: `cast code <PoolManager>` returns 48020 hex chars at this height (current Base head 46789746, so it is comfortably finalized and archive-served by the Alchemy endpoint). No re-pin needed."
  - "The cancun/transient-storage proof is the V4StateReader.getSqrtPriceX96 read against the LIVE PoolManager (PoolId.wrap(bytes32(0)) → sqrtPriceX96==0 for the uninitialized id); the non-reverting extsload call exercising the live cancun bytecode is the proof, independent of any specific initialized Base pool id."
  - "Task 2 produced no new code commit: the bodies filled during the Task-1 scaffold (un-renamed per mn-B) were already green, so Task 2 is a pure verification gate (forge build + fork-test + cast-code preflight) recorded here, not a code delta."

requirements-completed: [FORK-01]

duration: ~20min
completed: 2026-06-02
---

# Phase 7 Plan 03: Base-Mainnet-Fork Harness Summary

**A `forge` fork harness behind a committed `.tree` BTT spec that `vm.createSelectFork`s the Solidity-pinned Base block 46700000, asserts chainid 8453, and touches the live UniV4 `PoolManager` (`0x498581…2b2b`) via the borrowed `V4StateReader` under the single cancun/0.8.24 profile — `forge test --match-path test/fork/BaseForkHarness.t.sol --fork-url "$BASE_RPC_URL"` is 2/2 GREEN, which IS the FORK-01 fork-run proof.**

## Performance

- **Duration:** ~20 min
- **Completed:** 2026-06-02
- **Tasks:** 2/2
- **Files created:** 2 (`BaseForkHarness.tree`, `BaseForkHarness.t.sol`)

## Accomplishments

**Task 1 — SPECIFY: `.tree` committed FIRST (mn-B / evm-tdd Iron Law)**
- `BaseForkHarness.tree`: one behavioral unit (`forkAndTouchPoolManager`) with two `given` branches — the pinned-block fork-select + chainid 8453, and the live-PoolManager code + V4StateReader read.
- Committed in a **separate commit (`078f7c8`) BEFORE** the harness impl commit (`6df19de`) — verifiable in git history (the Iron-Law ordering).
- Scaffolded the test via `bulloak scaffold` and kept the generated function names un-renamed (`test_GivenAPinnedBaseMainnetForkBlock…`, `test_GivenTheLiveUniV4PoolManagerAt0x498581`) so `bulloak check` validates the branch↔function mapping 1:1.
- Harness carries: the BTT-spec traceability tag, the three pinned Base addresses (PoolManager / PositionMgr / USDC verbatim from RESEARCH §1), and `uint256 internal constant BASE_FORK_BLOCK = 46700000` (M-4 Solidity-constant path). No StateView token anywhere (B-2).

**Task 2 — IMPLEMENT: live-address preflight + fork test GREEN**
- **RPC preflight (mn-2 / Reality-Checker MAJOR):** with `BASE_RPC_URL` exported from `contracts/.env`, `cast code 0x498581fF718922c3f8e6A244956aF099B2652b2b --rpc-url "$BASE_RPC_URL"` returned **non-empty bytecode (48020 hex chars)** — proving both the Base address and fork-RPC reachability at the pinned depth before any in-process test.
- `forge build` exits 0 under the single cancun/0.8.24 profile (only pre-existing out-of-scope `named-struct-fields` lint notes on `src/MacroOracle.sol`).
- `forge test --match-path test/fork/BaseForkHarness.t.sol --fork-url "$BASE_RPC_URL"` → **2 passed, 0 failed**: selects the pinned block (`block.number == 46700000`), confirms `block.chainid == 8453`, asserts `POOL_MANAGER.code.length > 0`, and reads `V4StateReader.getSqrtPriceX96(IPoolManager(POOL_MANAGER), PoolId.wrap(0)) == 0` without reverting (cancun/transient-storage opcodes execute on the live fork).
- `bulloak check test/fork/BaseForkHarness.tree` exits 0; `! grep StateView` holds; `BASE_FORK_BLOCK` is a real numeric constant (no TODO).

## Pinned-block + read-path record (plan-required)

- **BASE_FORK_BLOCK:** `46700000` (Solidity constant). Archive-verified: PoolManager has 48020 hex chars of code at this height; current Base head ≈ `46789746` (finalized, archive-served).
- **`cast code` preflight outcome:** non-empty (48020 hex chars) — PASS, no re-pin needed.
- **Chosen PoolManager-touch read path:** borrowed **`V4StateReader.getSqrtPriceX96(IPoolManager, PoolId)`** (extsload via v4-core `StateLibrary`, resolved through the `v4-core/` alias). NOT v4-periphery `StateView` (B-2 — not installed).

## Manual RPC-archive fallback (documented per success criteria)

If `cast code <PoolManager> --rpc-url "$BASE_RPC_URL"` (or the fork test's `createSelectFork`) ever errors `"missing trie node"` / `"block not found"` at `BASE_FORK_BLOCK`, the endpoint can no longer archive-serve that depth. Recovery: run `cast block-number --rpc-url "$BASE_RPC_URL"`, pick a recent **finalized** block a few hundred blocks back, update the `uint256 constant BASE_FORK_BLOCK` in `test/fork/BaseForkHarness.t.sol` to that value, re-run the preflight + fork test, and record the new pin. At 46700000 this did NOT occur (the Alchemy Base endpoint archive-serves it cleanly).

## Deviations from Plan

### Auto-fixed / blocking-resolution

**1. [Rule 3 — Blocking] `.tree` co-located in `test/fork/` instead of `test/spec/` (bulloak 0.9.2 same-dir inference)**
- **Found during:** Task 1, first `bulloak check`.
- **Issue:** The plan locates the tree at `test/spec/BaseForkHarness.tree` and the impl at `test/fork/BaseForkHarness.t.sol`. bulloak 0.9.2 infers the matching Solidity file **strictly in the same directory as the `.tree`** (no subtree search, no config/path flag). With the tree in `test/spec/` and the test in `test/fork/`, `bulloak check` reports "missing matching Solidity file" and **exits 1** — so the plan's `bulloak check ... exits 0` acceptance is unsatisfiable as-laid-out in this bulloak version.
- **Fix:** Co-located the `.tree` with the harness in `test/fork/` so bulloak's same-dir inference resolves the pair. `bulloak check test/fork/BaseForkHarness.tree` now exits 0, the harness stays on the VALIDATION-verbatim `--match-path test/fork/BaseForkHarness.t.sol` path, and the BTT tag was updated to `BTT spec: test/fork/BaseForkHarness.tree`.
- **Files:** `contracts/test/fork/BaseForkHarness.tree` (moved), `contracts/test/fork/BaseForkHarness.t.sol` (tag).
- **Commit:** `078f7c8` (tree), `6df19de` (harness).

**2. [Rule 1 — Bug] B-2 grep guard tripped by the literal token `StateView` in a comment**
- **Found during:** Task 1 verification.
- **Issue:** The harness doc-comment originally read "NO v4-periphery StateView" — the substring `StateView` made `! grep -q "StateView"` (the B-2 guard) fail even though there is no StateView *import or use*.
- **Fix:** Reworded the comment to "NO v4-periphery state-view path". The guard now holds; the read genuinely goes through `V4StateReader`.
- **Files:** `contracts/test/fork/BaseForkHarness.t.sol`.
- **Commit:** `6df19de`.

### Out-of-scope (NOT fixed — logged)
- `bulloak check test/spec/*.tree` (the full-glob phase-gate the plan's Task 1 wanted to run) **exits 1 independent of this plan**: the pre-existing `test/spec/{MacroOracle,SomniaAgentConsumer.*}.tree` files contain characters bulloak 0.9.2 rejects as identifiers (`/` in "Failed/TimedOut", `.` in headers, etc.) and were authored before bulloak was wired in — they have never been bulloak-parseable. Fixing those pre-existing trees is out of scope for FORK-01. My tree (`test/fork/BaseForkHarness.tree`) passes its per-file `bulloak check` cleanly.

### Notes / non-deviations
- `forge build` still emits pre-existing `named-struct-fields` lint **notes** on out-of-scope `src/MacroOracle.sol` (build exits 0) — carried over from 07-01/07-02, not fixed (scope boundary).
- Task 2 produced **no new code commit** (the scaffold-filled bodies were already green); its forge/cast proofs are recorded here rather than as a code delta.

## Authentication Gates
None.

## Verification

- `cast code 0x498581fF718922c3f8e6A244956aF099B2652b2b --rpc-url "$BASE_RPC_URL"` → non-empty (48020 hex chars). PASS (mn-2 preflight).
- `forge build` → exits 0 (single cancun/0.8.24 profile, FORK-01 compile proof). PASS.
- `forge test --match-path test/fork/BaseForkHarness.t.sol --fork-url "$BASE_RPC_URL"` → 2 passed / 0 failed (FORK-01 fork-run proof; live PoolManager touched under cancun via V4StateReader). PASS.
- `bulloak check test/fork/BaseForkHarness.tree` → exits 0. PASS.
- `! grep -q "StateView" test/fork/BaseForkHarness.t.sol` → PASS (B-2).
- `grep -qE "constant BASE_FORK_BLOCK *= *[0-9]"` → PASS (M-4 numeric constant, no TODO).
- `.tree` commit `078f7c8` precedes harness commit `6df19de` in history → PASS (mn-B / Iron-Law ordering).

## Self-Check: PASSED

- All 3 created files FOUND on disk.
- Both task commits FOUND in history: `078f7c8` (tree, Task 1a), `6df19de` (harness, Task 1b + Task 2 verification gate).
