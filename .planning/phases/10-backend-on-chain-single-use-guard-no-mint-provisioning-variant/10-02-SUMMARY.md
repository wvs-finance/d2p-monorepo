---
phase: 10-backend-on-chain-single-use-guard-no-mint-provisioning-variant
plan: 02
subsystem: backend-contracts + provisioning + frontend-validation
tags: [solidity, exec-guard, foundry, mutation-check, buildbear, evm-snapshot, jq, viem, vitest, tsc]

# Dependency graph
requires:
  - phase: 10-backend-on-chain-single-use-guard-no-mint-provisioning-variant
    plan: 01
    provides: "EXEC-01 RED guard test (vm.mockCall numberOfLegs 0->1) + artifact-loader nullable/snapshotId migration + exported validateDeployment"
provides:
  - "EXEC-01 single-use guard inserted in _resolveAndMintAtStrike (require numberOfLegs(this)==0 'fork used') — RED test now GREEN, mutation-proven non-vacuous"
  - "SKIP_MINT gate in ProvisionBuildBearDemo.s.sol (mint extracted to _mint(), gated in run()) — --no-mint deploys a fresh executor with numberOfLegs==0"
  - "provision-buildbear-demo.sh --no-mint variant: signer-funded-before-snapshot, !NO_MINT-gated receipt parse, MONO_ROOT-asserted direct frontend artifact write with mintTxHash:null + snapshotId"
  - "artifact-null-roundtrip.test.ts — null-fixture round-trips the exported validateDeployment via vitest (replaces un-installed tsx)"
  - "spike-viem-sign.ts — type-checked frontend-resident viem simulate-only dry-run of resolveFromMandate with source-pinned HedgeMandate tuple (reproducible §(c), Phase 11 dep)"
affects: [10-03 (operator runs the live --no-mint + fills 10-SPIKE-EVIDENCE §(a)-(d) + runs spike-viem-sign live), 11 (buildbear-reset reads snapshotId), 12 (frontend string-matches 'fork used')]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Mutation check as non-vacuous-GREEN proof: remove the guard line -> RED for the right reason ('next call did not revert as expected') -> restore -> GREEN"
    - "Extract a broadcast step (the mint) into a separate internal fn so run() can gate it behind vm.envOr — keeps _provision() a pure deploy+deposit helper, ProvisionResult field set stays stable for the shell parse"
    - "Mutate a memory struct in place across an internal call (_mint(ProvisionResult memory r)) — memory structs pass by reference, so r.strike/r.legs persist back to run()"
    - "Runtime-assert a derived path anchor (MONO_ROOT must contain pnpm-workspace.yaml + packages/{frontend,backend}) before writing — fail loud on a wrong ../ count"
    - "vitest unit test against the exported validator replaces an un-installed tsx invocation for a CI-checkable artifact-shape round-trip"

key-files:
  created:
    - packages/frontend/tests/unit/cornerstone/artifact-null-roundtrip.test.ts
    - packages/frontend/scripts/spike-viem-sign.ts
  modified:
    - packages/backend/contracts/src/MacroHedgeExecutor.sol
    - packages/backend/contracts/script/ProvisionBuildBearDemo.s.sol
    - packages/backend/contracts/script/provision-buildbear-demo.sh

key-decisions:
  - "Guard placed at MacroHedgeExecutor.sol:370 (after the chainId require :365, before the first pool.dispatch ~:405) — above the dispatch gate so numberOfLegs is dereferenced on EVERY sink call; string revert 'fork used' (not a custom error) per the locked cross-layer contract"
  - "Mint extracted from _provision() into a new _mint(ProvisionResult memory r) helper called from run() under if (!skipMint) — cleaner than an inline if and keeps the require(r.legs>0) gate trivially scoped to the mint path"
  - "MacroHedgeExecutor(payable(r.executor)) cast required — the executor has a payable fallback, so a non-payable address cast is a compile error"
  - "spike-viem-sign.ts uses zeroHash as a self-contained underlyingMarket placeholder so tsc is green without a live pool id; the operator substitutes the real PoolId in Plan 10-03's live run"

requirements-completed: [EXEC-01, PROV-01, PROV-04]

# Metrics
duration: 9min
completed: 2026-06-08
---

# Phase 10 Plan 02: Guard Insertion + `--no-mint` Provisioning Variant Summary

**EXEC-01 single-use guard inserted (RED test now GREEN, mutation-proven non-vacuous) + SKIP_MINT gate + `--no-mint` shell variant (signer-funded-before-snapshot, MONO_ROOT-asserted frontend artifact write with `mintTxHash:null`) + null-fixture vitest round-trip + type-checked viem simulate-only spike**

## Performance

- **Duration:** ~9 min
- **Tasks:** 4
- **Files modified:** 5 (3 modified, 2 created)

## Accomplishments

- **Task 1 (EXEC-01 guard):** Inserted `require(pool.numberOfLegs(address(this)) == 0, "fork used")` at `MacroHedgeExecutor.sol:370` — after the chainId require (:365) and before the first `pool.dispatch` (~:405), above the `if (isLong && size>0)` dispatch gate so it fires on every sink entry. NatSpec states it "reverts on ANY resolve attempt once this executor already holds legs" (FIX 6 — not "before mint"). The Plan 10-01 guard test went fully GREEN (3/3). **Mutation check (non-vacuous GREEN proof):** removed only the guard line -> `test_WhenNumberOfLegsIsNonZeroSecondResolveAndMintRevertsForkUsed` went RED with `next call did not revert as expected` (the guard absence, not an incidental revert) -> restored the line -> GREEN again. Full secret-free suite: 97/97 pass, no regression.
- **Task 2 (SKIP_MINT gate):** Extracted the mint step from `_provision()` into a new `_mint(ProvisionResult memory r)` helper, called from `run()` under `if (!vm.envOr("SKIP_MINT", false))`. `_provision()` now returns `strike:0, legs:0` defaults; the `require(r.legs > 0, ...)` is gated inside the `!skipMint` branch. `forge build` clean. Default (mint) path unchanged.
- **Task 3 (`--no-mint` shell + null-fixture test):** Added the `--no-mint` flag (exports `SKIP_MINT=true`); funds the dedicated `DEMO_SIGNER_PK` address via `hardhat_setBalance` BEFORE `cast rpc evm_snapshot` (quote-stripped); gates the `resolveFromMandate` receipt-parse behind `[[ "$NO_MINT" != true ]]`; refuses to fall back to the deployer key when `DEMO_SIGNER_PK` is unset; runtime-asserts the `MONO_ROOT` anchor (pnpm-workspace.yaml + both packages); writes the artifact DIRECTLY to the frontend path with `jq --argjson mintTxHash null` + `snapshotId`. The default mint path now also writes to the frontend path (no drift). `artifact-null-roundtrip.test.ts` feeds a `mintTxHash:null` + `snapshotId` fixture through the exported `validateDeployment` (4/4 vitest pass).
- **Task 4 (viem spike):** Created `packages/frontend/scripts/spike-viem-sign.ts` — reads `DEMO_SIGNER_PK` from env (never hard-coded, never logged), builds a viem WalletClient against the artifact chain config, and SIMULATES `resolveFromMandate` (`simulateContract`, never broadcasts) with the source-pinned 5-field HedgeMandate tuple ABI. `pnpm --filter d2p-frontend exec tsc --noEmit` exits 0.

## Verification Results

| Signal | Command | Result |
|--------|---------|--------|
| Guard test GREEN | `forge test --match-path 'test/unit/MacroHedgeExecutor.guard.t.sol'` | 3/3 PASS |
| Mutation: guard removed | (same) with guard line deleted | RED — `next call did not revert as expected` |
| Mutation: guard restored | (same) restored | 3/3 PASS |
| Full secret-free suite | `forge test --no-match-path 'test/**/*[Ff]ork*'` | 97/97 PASS |
| Script compiles | `forge build` | exit 0 |
| Shell syntax | `bash -n provision-buildbear-demo.sh` | exit 0 |
| MONO_ROOT anchor | `cd .../../../.. && pwd` == repo root | match |
| Unset-signer branch | `unset DEMO_SIGNER_PK` dry-run | exits 1 with clear message |
| No key leaked | grep `echo .*$DEMO_SIGNER_PK` / deployer | none |
| Null-fixture round-trip | `vitest run artifact-null-roundtrip.test.ts` | 4/4 PASS |
| Spike type-check | `pnpm --filter d2p-frontend exec tsc --noEmit` | exit 0 |

## Task Commits

1. **Task 1: EXEC-01 guard insertion** - `19b5ff9` (feat)
2. **Task 2: SKIP_MINT gate** - `6a7eea7` (feat)
3. **Task 3: --no-mint shell variant + null-fixture test** - `7e52fef` (feat)
4. **Task 4: spike-viem-sign.ts** - `73cc271` (feat)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `payable` cast required for the executor handle in `_mint`**
- **Found during:** Task 2
- **Issue:** `MacroHedgeExecutor(r.executor)` failed `forge build` with error 7398 — the executor has a payable fallback, so a non-payable `address` cannot be cast to the contract type.
- **Fix:** `MacroHedgeExecutor(payable(r.executor))`. Same handle; compiles.
- **Files modified:** packages/backend/contracts/script/ProvisionBuildBearDemo.s.sol
- **Committed in:** `6a7eea7` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking). No scope or behavioral change — a mechanical cast required by the refactor.

## Issues Encountered

- A pre-existing forge-lint `unsafe-typecast` note (and the `unused-import StateLibrary` note recorded in the 10-01 summary) surfaces during `forge build`. Out of scope (not caused by this plan's changes); `forge build` still exits 0. Left untouched per the deviation scope boundary.

## Deferred / Operator-Manual (Plan 10-03)

This plan delivered and STATICALLY verified the code. The following are operator-manual (live BuildBear fork, secret-gated, 3-day TTL) and are NOT executed here:
- The live `--no-mint` run against a hosted sandbox + the `evm_snapshot` -> `evm_revert` round-trip proof (PROV-01/02/03 transcripts §(a)-(b)).
- The live `spike-viem-sign.ts` §(c) dry-run (operator substitutes the real PoolId).
- The on-fork post-guard `"fork used"` `cast send` transcript §(d).

## Self-Check: PASSED

All created/modified files present on disk; all four task commits (`19b5ff9`, `6a7eea7`, `7e52fef`, `73cc271`) present in git history on branch `phase-10-backend-single-use-guard`.

---
*Phase: 10-backend-on-chain-single-use-guard-no-mint-provisioning-variant*
*Completed: 2026-06-08*
