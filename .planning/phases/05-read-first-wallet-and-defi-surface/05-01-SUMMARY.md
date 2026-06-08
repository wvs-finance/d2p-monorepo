---
phase: 05
plan: 01
subsystem: defi-foundation
tags: [recharts, payoff-math, wallet-state, test-scaffolds, architecture-guard]
dependency_graph:
  requires: []
  provides:
    - lib/apps/abrigo/payoff.ts (generatePayoffData pure function)
    - lib/wallet/state.ts (deriveWalletState pure function)
    - lib/apps/abrigo/instruments.ts extended with strike/slope
    - recharts@3.8.1 in dependencies
    - tests/unit/payoff-curve.test.ts
    - tests/unit/wallet-state.test.ts
    - tests/unit/instruments-index.test.ts
    - tests/architecture/defi-bundle-isolation.test.ts
    - tests/e2e/instrument-page.spec.ts (wave 0 fixme stubs)
    - tests/e2e/wallet-states.spec.ts (wave 0 fixme stubs)
    - tests/a11y/defi-instruments.spec.ts (wave 0 fixme stub)
  affects:
    - 05-02 (provider activation imports deriveWalletState contract)
    - 05-03 (instruments index; architecture guard active)
    - 05-04 (PayoffDiagramClient uses generatePayoffData; WalletPanel uses deriveWalletState)
tech_stack:
  added:
    - recharts@3.8.1 (React 19 explicit peerDep; NOT visx per WAIVER-05-05)
  patterns:
    - Pure function module (no React, no side effects) for payoff math
    - Pure function module for wallet state derivation (4-state machine)
    - noUncheckedIndexedAccess-safe test patterns (optional chaining in assertions)
    - test.fixme for wave 0 stubs (visible in playwright --list, not silenced)
key_files:
  created:
    - lib/apps/abrigo/payoff.ts
    - lib/wallet/state.ts
    - tests/unit/payoff-curve.test.ts
    - tests/unit/wallet-state.test.ts
    - tests/unit/instruments-index.test.ts
    - tests/architecture/defi-bundle-isolation.test.ts
    - tests/e2e/instrument-page.spec.ts
    - tests/e2e/wallet-states.spec.ts
    - tests/a11y/defi-instruments.spec.ts
  modified:
    - lib/apps/abrigo/instruments.ts (added strike/slope fields)
    - package.json (added recharts)
    - pnpm-lock.yaml
decisions:
  - id: WAIVER-05-05
    summary: recharts@3.8.1 chosen over visx; bundle isolation verified at 05-04
  - id: WAIVER-05-03
    summary: no 5th wallet state for non-EVM Solana (unreachable via EVM connectors)
  - id: strike-slope-static
    summary: strike/slope are static registry fields (provisional) — not on-chain ABI reads
metrics:
  duration_min: 5
  completed_date: "2026-05-30"
  tasks_completed: 3
  tasks_total: 3
  files_created: 9
  files_modified: 3
---

# Phase 05 Plan 01: Wave 0 Foundation — recharts, payoff math, wallet state deriver, test scaffolds

Pure-function CFMM payoff + 4-state wallet deriver with recharts@3.8.1 installed and all wave 0 test scaffolds (32 unit/arch assertions green + 6 e2e/a11y test.fixme stubs list-visible).

## What Was Built

### Task 1: recharts install + AbrigoInstrument extension + pure libs

- **recharts@3.8.1** installed via `pnpm add recharts`. React 19 explicitly supported in peerDependencies. No visx (WAIVER-05-05: visx 3.12 lacks React 19 peerDep).
- **`lib/apps/abrigo/instruments.ts`**: `AbrigoInstrument` extended with `strike: number` and `slope: number` as static registry fields. Marked with comment noting these are provisional, pending Foundry artifact ABI getters. `ABRIGO_INSTRUMENTS` stays `[]` (strict anti-fishing).
- **`lib/apps/abrigo/payoff.ts`**: Pure CFMM convex-hedge payoff function `generatePayoffData(strike, slope, points=100)`. Returns 100 `PayoffPoint` objects across `[0.3*strike, 1.7*strike]`. Payoff formula: `slope * Math.max(strike - price, 0)`. No React import, no side effects.
- **`lib/wallet/state.ts`**: Pure 4-state deriver `deriveWalletState({status, chain})`. Maps connecting/reconnecting→CONNECTING, disconnected→DISCONNECTED, connected+chain=undefined→CONNECTED_WRONG_CHAIN, connected+chain→CONNECTED_READY. No 5th state (WAIVER-05-03).

### Task 2: Wave 0 unit + architecture tests (TDD, 32 assertions green)

- **`tests/unit/payoff-curve.test.ts`** (DEFI-04): 12 assertions — shape (100 points, first=0.3K, last=1.7K), payoff values (>=strike→0, <strike→slope*(K-P)), formula check, edge cases (strike=0, slope=0, custom points).
- **`tests/unit/wallet-state.test.ts`** (DEFI-02/07): 8 assertions — all 4 branches, exhaustive cross-product check that every output is one of the 4 known literals.
- **`tests/unit/instruments-index.test.ts`** (DEFI-03): 7 assertions — empty registry, B2 chainId selector fixture covering match/no-match/wrong-id/empty-results cases. Inline predicate pinned until 05-04 ships `lib/dashboard/instrument-pool.ts`.
- **`tests/architecture/defi-bundle-isolation.test.ts`** (FOUND-11): 8 assertions — walks `app/(lab)` and `app/(apps)`, greps 4 banned wallet modules. `app/(defi)` intentionally omitted (allowed).

### Task 3: Wave 0 e2e + a11y stubs (6 test.fixme entries, list-visible)

- **`tests/e2e/instrument-page.spec.ts`**: 2 fixme stubs (per-instrument read-only render, risk-disclosure-above-fold-at-360px). Tagged TODO(05-04) and TODO(05-03).
- **`tests/e2e/wallet-states.spec.ts`**: 3 fixme stubs (DISCONNECTED, WRONG_CHAIN CTA, aria-live region). Tagged TODO(05-04).
- **`tests/a11y/defi-instruments.spec.ts`**: 1 fixme stub (axe on instruments index + risk callout). Tagged TODO(05-03).
- All 6 entries confirmed visible via `pnpm playwright test --list`.

## No Rendered Surface

This plan produces no user-visible route. The Evidence-Collector live agent is explicitly skipped per the plan's `<output>` directive: "no user-visible surface; type-only + lib + tests".

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Biome formatting: package.json + payoff.ts**
- **Found during:** Task 1 commit
- **Issue:** Biome formatted `ignoredBuiltDependencies` to single-line JSON and collapsed function signature to single line
- **Fix:** `pnpm biome format --write` on both files
- **Files modified:** `package.json`, `lib/apps/abrigo/payoff.ts`
- **Commit:** integrated into bdb018c

**2. [Rule 3 - Blocking] Biome import ordering: 3 test files**
- **Found during:** Task 2 commit
- **Issue:** Biome requires alphabetical import ordering; test files had `vitest` imports before `@/lib/*` imports
- **Fix:** `pnpm biome check --fix --unsafe` on affected test files
- **Files modified:** `tests/unit/payoff-curve.test.ts`, `tests/unit/wallet-state.test.ts`, `tests/unit/instruments-index.test.ts`
- **Commit:** integrated into 08e4770

**3. [Rule 1 - Bug] TypeScript `noUncheckedIndexedAccess` errors in payoff test**
- **Found during:** Task 2 commit (pre-commit hook tsc check)
- **Issue:** `tsconfig.json` has `noUncheckedIndexedAccess: true`; `data[0].price` and `data[99].price` caused TS errors. Biome also forbids `!` non-null assertions (lint/style/noNonNullAssertion).
- **Fix:** Used optional chaining (`data[0]?.price`, `data[0]?.payoff`) for test assertions. Semantically correct since test verifies behavior and optional access produces `undefined` which fails numeric matchers appropriately.
- **Files modified:** `tests/unit/payoff-curve.test.ts`
- **Commit:** integrated into 08e4770

**4. [Rule 3 - Blocking] Biome formatting: wallet-states spec single-line test.fixme**
- **Found during:** Task 3 commit
- **Issue:** One `test.fixme(` call was too long for Biome's line-width limit
- **Fix:** `pnpm biome format --write` on the file
- **Files modified:** `tests/e2e/wallet-states.spec.ts`
- **Commit:** integrated into df1b4c6

## Success Criteria Verification

- [x] recharts@3.8.1 installed (NOT visx) — verified `grep '"recharts"' package.json`
- [x] AbrigoInstrument gains static `strike`/`slope` (provisional registry fields)
- [x] Pure payoff + wallet-state libs exist with all-branch unit coverage (32/32 green)
- [x] FOUND-11 guarded by `defi-bundle-isolation.test.ts`
- [x] WAIVER-05-03 honored: NO 5th unreachable wallet state built
- [x] ABRIGO_INSTRUMENTS still `[]` (strict anti-fishing)
- [x] `pnpm tsc --noEmit` exits 0
- [x] `pnpm vitest run` on all 4 test files: 32/32 pass
- [x] `pnpm playwright test --list` shows 6 entries across the 3 new spec files

## Commits

| Hash | Type | Description |
|------|------|-------------|
| bdb018c | feat(05-01) | install recharts, extend AbrigoInstrument, add payoff+wallet libs |
| 08e4770 | test(05-01) | wave 0 unit + architecture tests (32 assertions, green) |
| df1b4c6 | test(05-01) | wave 0 e2e + a11y stubs (test.fixme, list-visible) |

## Self-Check

### Files Exist
- `lib/apps/abrigo/payoff.ts`: FOUND
- `lib/wallet/state.ts`: FOUND
- `tests/unit/payoff-curve.test.ts`: FOUND
- `tests/unit/wallet-state.test.ts`: FOUND
- `tests/unit/instruments-index.test.ts`: FOUND
- `tests/architecture/defi-bundle-isolation.test.ts`: FOUND
- `tests/e2e/instrument-page.spec.ts`: FOUND
- `tests/e2e/wallet-states.spec.ts`: FOUND
- `tests/a11y/defi-instruments.spec.ts`: FOUND

### Commits Exist
- bdb018c: FOUND
- 08e4770: FOUND
- df1b4c6: FOUND
