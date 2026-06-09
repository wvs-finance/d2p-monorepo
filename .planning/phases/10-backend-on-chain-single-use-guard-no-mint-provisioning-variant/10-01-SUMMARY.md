---
phase: 10-backend-on-chain-single-use-guard-no-mint-provisioning-variant
plan: 01
subsystem: testing
tags: [foundry, vm.mockcall, solidity, typescript, buildbear, tdd, evm-snapshot]

# Dependency graph
requires:
  - phase: 09-cornerstone-live-tx-integration
    provides: artifact-loader.ts BuildBearDeployment type + buildbear-deployments.json artifact contract
provides:
  - "artifact-loader.ts BuildBearDeployment widened to mintTxHash/mintedStrike nullable + optional snapshotId; validateDeployment exported"
  - "EXEC-01 RED guard test (test/unit/MacroHedgeExecutor.guard.t.sol) — vm.mockCall numberOfLegs 0->1, resolveAndMint carrier, fork-free name, secret-free CI lane"
  - "10-SPIKE-EVIDENCE.md operator-manual transcript scaffold (sections a-d + fork-liveness pre-flight + OPS-06 honesty header)"
affects: [10-02 (guard insertion turns test GREEN + writes --no-mint artifact + null-fixture round-trip test imports validateDeployment), 10-03 (operator fills spike evidence), 11 (buildbear-reset reads snapshotId)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "vm.mockCall against a non-zero placeholder pool to drive a non-virtual concrete-contract view (numberOfLegs) — the only viable mock strategy when the immutable ctor param is the concrete PanopticPoolV2"
    - "RED-before-green TDD discipline: failing guard test committed in Wave 0, guard inserted in next plan"
    - "Cross-layer contract locked early: the exact 'fork used' string + nullable artifact shape + exported validator before any production code"

key-files:
  created:
    - packages/backend/contracts/test/unit/MacroHedgeExecutor.guard.t.sol
    - .planning/phases/10-backend-on-chain-single-use-guard-no-mint-provisioning-variant/10-SPIKE-EVIDENCE.md
  modified:
    - packages/frontend/lib/apps/abrigo/cornerstone/artifact-loader.ts

key-decisions:
  - "Placeholder pool literal must be EIP-55 checksummed (0x...c0Fe, not C0FE) — Solidity rejects non-checksummed address literals at compile time"
  - "resolveAndMint with positionSize==0 is the RED carrier: no oracle read, dispatch gate skipped, sink completes cleanly once the future guard passes — no real Panoptic stack needed"
  - "Shared-sink coverage asserted via a documenting test rather than wiring resolveFromMandate (which reads the regime oracle before the sink), keeping the unit test keyless and decoupled from oracle-staleness geometry"

patterns-established:
  - "Pattern: drive a non-virtual concrete-contract view via vm.mockCall on a placeholder address rather than a mock subclass (non-virtual methods cannot be overridden, standalone mocks not castable to the concrete immutable param)"
  - "Pattern: operator-manual transcript gate with a per-section fork-liveness pre-flight (cast chain-id) guarding the 3-day BuildBear TTL"

requirements-completed: [EXEC-01, PROV-04]

# Metrics
duration: 4min
completed: 2026-06-09
---

# Phase 10 Plan 01: Test-First + Type-Migration Foundation Summary

**EXEC-01 RED guard test via vm.mockCall (numberOfLegs 0->1, fork-free CI lane) + artifact-loader nullable/snapshotId migration with exported validateDeployment + operator-manual 10-SPIKE-EVIDENCE scaffold**

## Performance

- **Duration:** 4 min
- **Started:** 2026-06-09T02:47:17Z
- **Completed:** 2026-06-09T02:51:34Z
- **Tasks:** 3
- **Files modified:** 3 (1 modified, 2 created)

## Accomplishments
- Widened `BuildBearDeployment` to `mintTxHash: string | null`, `mintedStrike: number | null`, added optional `snapshotId?: string`, and exported `validateDeployment` — unblocks the Plan 10-02 `--no-mint` artifact and its null-fixture round-trip test, and the Phase 11 `buildbear-reset` `snapshotId` read. tsc green; static JSON import + validator body untouched.
- Authored the EXEC-01 RED guard test: keyless, fork-free name (rides the secret-free `forge test --no-match-path 'test/**/*[Ff]ork*'` lane), `vm.mockCall` on `numberOfLegs` 0->1 against a checksummed placeholder pool, `resolveAndMint`/`positionSize==0` carrier. Compiles and is RED for the RIGHT reason — call 2 fails `vm.expectRevert(bytes("fork used"))` with `next call did not revert as expected` (guard absent), NOT an unrelated oracle/dispatch/Reentrancy revert.
- Scaffolded `10-SPIKE-EVIDENCE.md` with sections (a)-(d), a per-section fork-liveness pre-flight, the OPS-06 not-CI honesty header, and the poisoned-executor warning — ready for the operator to fill from the live BuildBear run in Plan 10-03.

## Task Commits

Each task was committed atomically:

1. **Task 1: artifact-loader.ts nullable + snapshotId + export validateDeployment** - `a02e444` (feat)
2. **Task 2: EXEC-01 guard test (RED)** - `e58e1ce` (test)
3. **Task 3: 10-SPIKE-EVIDENCE.md scaffold** - `2cf5f45` (docs)

## Files Created/Modified
- `packages/frontend/lib/apps/abrigo/cornerstone/artifact-loader.ts` - `BuildBearDeployment` nullable mint fields + optional `snapshotId`; `validateDeployment` exported (body unchanged)
- `packages/backend/contracts/test/unit/MacroHedgeExecutor.guard.t.sol` - EXEC-01 RED guard test (vm.mockCall numberOfLegs 0->1, resolveAndMint carrier, fork-free name)
- `.planning/phases/10-.../10-SPIKE-EVIDENCE.md` - operator-manual live-fork transcript scaffold (sections a-d)

## Decisions Made
- **Checksummed placeholder pool literal:** `address(0x...c0Fe)` not `C0FE`. The plan specified the all-caps form, but Solidity 0.8.24 rejects non-EIP-55-checksummed address literals at compile time (`invalid checksum`). The checksummed hex is still valid (no non-hex digits) and satisfies the acceptance grep.
- **Shared-sink coverage as a documenting assertion:** Test 3 documents that the guard at sink line 366 covers `resolveFromMandate` (the shared `_resolveAndMintAtStrike` is the sole mint path for all three entrypoints) rather than wiring `resolveFromMandate` directly, which would couple the keyless unit test to the regime-oracle staleness read at line 223. This matches the plan's OPTIONAL note and the locked shared-sink design.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Checksummed the placeholder pool address literal**
- **Found during:** Task 2 (guard test)
- **Issue:** The plan's literal `address(0x...C0FE)` failed `forge build` with Solidity error 9429 (`invalid checksum`) — Solidity requires EIP-55 mixed-case checksums on address literals, blocking compilation.
- **Fix:** Changed `0x000000000000000000000000000000000000C0FE` to the checksummed `0x000000000000000000000000000000000000c0Fe`. Same non-zero placeholder address, valid hex (no non-hex P-Z digits), compiles.
- **Files modified:** packages/backend/contracts/test/unit/MacroHedgeExecutor.guard.t.sol
- **Verification:** `forge build` succeeds; the POOL-literal acceptance grep still matches valid hex.
- **Committed in:** e58e1ce (Task 2 commit)

**2. [Rule 3 - Blocking] Reworded a comment to satisfy the `is PanopticPoolV2` == 0 grep**
- **Found during:** Task 2 (guard test)
- **Issue:** An explanatory comment said "a `is PanopticPoolV2` mock subclass cannot compile", which tripped the acceptance criterion `grep -c 'is PanopticPoolV2' == 0` (the guard against the non-compilable subclass approach being present).
- **Fix:** Reworded to "a mock subclass of the pool cannot compile" — same documentation, no `is PanopticPoolV2` substring.
- **Files modified:** packages/backend/contracts/test/unit/MacroHedgeExecutor.guard.t.sol
- **Verification:** `grep -c 'is PanopticPoolV2'` returns 0; test still RED for the right reason.
- **Committed in:** e58e1ce (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both were minor literal/comment corrections required to compile and to satisfy the plan's own acceptance greps. No behavioral or scope change — the test logic, RED outcome, and strategy are exactly as planned.

## Issues Encountered
- A pre-existing `unused-import` forge-lint note in `src/libraries/PoolIdMappers.sol` (`StateLibrary`) surfaced during `forge build`. Out of scope (not caused by this plan's changes) — left untouched per the deviation scope boundary.

## User Setup Required
None - no external service configuration required in this plan. (The live BuildBear spike + `DEMO_SIGNER_PK`/RPC secrets are an operator-manual step recorded in Plan 10-03, NOT this plan.)

## Next Phase Readiness
- Plan 10-02 can now: insert the `require(pool.numberOfLegs(address(this)) == 0, "fork used")` guard at `MacroHedgeExecutor.sol:366` (turns `test_WhenNumberOfLegsIsNonZeroSecondResolveAndMintRevertsForkUsed` GREEN), write the `--no-mint` artifact with `mintTxHash: null` + `snapshotId` (type accepts it), and import the exported `validateDeployment` in the null-fixture round-trip vitest test.
- Plan 10-03 operator fills `10-SPIKE-EVIDENCE.md` sections (a)-(d) from a fresh `--no-mint` stack.
- No blockers. Red-before-green discipline preserved (no production contract or shell changes in this wave).

## Self-Check: PASSED

All created/modified files present on disk; all three task commits (`a02e444`, `e58e1ce`, `2cf5f45`) present in git history on branch `phase-10-backend-single-use-guard`.

---
*Phase: 10-backend-on-chain-single-use-guard-no-mint-provisioning-variant*
*Completed: 2026-06-09*
