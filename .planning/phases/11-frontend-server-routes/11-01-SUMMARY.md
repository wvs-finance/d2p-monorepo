---
phase: 11-frontend-server-routes
plan: 01
subsystem: testing
tags: [vitest, viem, next-app-router, env-schema, tdd, red-scaffold, architecture-test, buildbear]

# Dependency graph
requires:
  - phase: 10-backend-single-use-guard
    provides: "BuildBear deployment artifact with snapshotId + mintTxHash:null (--no-mint), EXEC-01 'fork used' string revert"
provides:
  - "'buildbear' CornerstoneMode (URL opt-in) with DEFAULT_MODE still 'replay'"
  - "DEMO_SIGNER_PK server-only env entry (lib/env.ts schema + runtimeEnv), never NEXT_PUBLIC_"
  - "RED test scaffolds pinning the full buildbear-sign reason-code contract (5 branches + not-configured + ok + M1 no-rpc-leak + M2 body-cap/malformed)"
  - "RED test scaffolds pinning the buildbear-reset scoped reason set (no-snapshot/revert-failed/rpc-unreachable + newSnapshotId + B1 undici fetch-failed shape + M1 leak)"
  - "RED test scaffold for buildUpstreamFromReplayArtifact (MINT-03 mandate from recorded preset)"
  - "GREEN architecture test enforcing DEMO_SIGNER_PK + privateKeyToAccount path-scope (CI-checkable, non-vacuous)"
  - "tests/fixtures/test-signer.ts — single gitleaks-allow Hardhat #0 key definition"
affects: [11-02-buildbear-routes, 11-03-decoupling-mandate-source, 12-live-path-integration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Wave-0 RED stub: import not-yet-created module → suite errors on import → tsconfig-excluded until the source lands (mirrors structured-data.test.tsx / cornerstone-presets.test.ts)"
    - "Two-client viem mock: createPublicClient (getBalance/simulateContract/waitForTransactionReceipt) + createWalletClient (writeContract) each as vi.fn() driven per-branch"
    - "Mutable env/artifact holder via getter in vi.mock factory to toggle DEMO_SIGNER_PK / snapshotId per test"
    - "Centralized test-signer fixture with one gitleaks:allow annotation; tests import the key, never re-inline"
    - "Architecture grep test excludes itself from its own scan + matches real code reads (env.X / process.env.X / fn-call) not comment mentions"

key-files:
  created:
    - packages/frontend/tests/unit/mode.test.ts
    - packages/frontend/tests/api/buildbear-sign.test.ts
    - packages/frontend/tests/api/buildbear-reset.test.ts
    - packages/frontend/tests/unit/workflow-engine-buildbear.test.ts
    - packages/frontend/tests/architecture/buildbear-key-leak.test.ts
    - packages/frontend/tests/fixtures/test-signer.ts
  modified:
    - packages/frontend/lib/apps/abrigo/cornerstone/mode.ts
    - packages/frontend/lib/env.ts
    - packages/frontend/tsconfig.json

key-decisions:
  - "Architecture test matches REAL code reads (env.DEMO_SIGNER_PK / process.env.DEMO_SIGNER_PK / privateKeyToAccount() ) not bare name mentions — so mode.ts's documentation comment about DEMO_SIGNER_PK does not false-positive"
  - "tsconfig.json kept comment-free (strict JSON) — the per-line Wave-0-stub note from the plan is recorded here instead, matching the existing exclude-list convention"

patterns-established:
  - "Two-client viem mock spec for server-signing route tests"
  - "Self-excluding non-vacuous architecture grep test"

requirements-completed: [MINT-01, MINT-02, MINT-03]

# Metrics
duration: 8min
completed: 2026-06-09
---

# Phase 11 Plan 01: Frontend Server Routes Wave-0 Scaffold Summary

**Shipped the `'buildbear'` mode + server-only `DEMO_SIGNER_PK` env entry and a full RED test scaffold pinning the cross-layer reason-code contract (buildbear-sign 5 branches + reset scoped reasons + buildUpstream), plus a GREEN, non-vacuous path-scope key-leak architecture test — all with tsc + biome gates green.**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-06-09T14:18:00Z
- **Completed:** 2026-06-09T14:26:22Z
- **Tasks:** 3
- **Files modified:** 9 (6 created, 3 modified)

## Accomplishments

- `CornerstoneMode` union + `parseMode` accept `'buildbear'`; `parseMode(null)` still returns `'replay'` (zero-secret default preserved) — proven by an 8-case GREEN `mode.test.ts`.
- `DEMO_SIGNER_PK` added to `lib/env.ts` server schema + `runtimeEnv` (mirrors `SOMNIA_OPERATOR_PK`); zero `NEXT_PUBLIC_` leak.
- Four RED test files capture the entire Phase 11 behavioral contract before any route exists, each machine-proven RED for the right reason (`Cannot find package '@/app/api/cornerstone/buildbear-sign/route'` etc.).
- A GREEN, non-vacuous architecture test enforces DEMO_SIGNER_PK + privateKeyToAccount path-scoping so the Wave-1 route stays honest.

## Task Commits

1. **Task 1: mode.ts + lib/env.ts (TDD)** — `6ce5b6b` (feat) — RED mode.test.ts written first (failed: `parseMode('buildbear')` returned `'replay'`), then source change made it GREEN.
2. **Task 2: RED scaffolds** — `81575d0` (test) — buildbear-sign/reset + workflow-engine-buildbear stubs + test-signer fixture + tsconfig excludes.
3. **Task 3: architecture key-leak test** — `6443eb9` (test) — GREEN-now path-scope arch test, proven non-vacuous.

**Plan metadata:** (final docs commit — this SUMMARY + STATE + ROADMAP)

## Files Created/Modified

- `lib/apps/abrigo/cornerstone/mode.ts` — added `'buildbear'` to the union + `parseMode` branch (default `'replay'` unchanged).
- `lib/env.ts` — `DEMO_SIGNER_PK` server-only schema entry + runtimeEnv mapping.
- `tsconfig.json` — excluded the 3 Wave-0 RED stubs (route/helper not yet created).
- `tests/unit/mode.test.ts` — GREEN; 8 cases incl. default-replay preserved + type-level assignability.
- `tests/api/buildbear-sign.test.ts` — RED; 9 cases (not-configured, signer-gas pre-flight, fork-used, reverted, rpc-unreachable, ok, M1 no-rpc-leak, M2 body-too-large, M2 malformed-body); two-client viem mock.
- `tests/api/buildbear-reset.test.ts` — RED; 6 cases (no-snapshot, revert→snapshot order, newSnapshotId, revert-failed-no-resnapshot, B1 undici `fetch failed`+`cause.code ECONNREFUSED`, M1 leak).
- `tests/unit/workflow-engine-buildbear.test.ts` — RED; preset-hit (recordedDecisionId `4083729`, kind `StrategistDecided`) + preset-miss (`{ok:false, strategistView:null, reason}`).
- `tests/architecture/buildbear-key-leak.test.ts` — GREEN; 3 invariants; non-vacuous.
- `tests/fixtures/test-signer.ts` — `HARDHAT_PK_0` single definition with `// gitleaks:allow`.

## Decisions Made

- **Arch test matches real code reads, not name mentions.** `mode.ts` legitimately documents `DEMO_SIGNER_PK` in a comment; matching the bare token would false-positive. The test keys on `env.DEMO_SIGNER_PK` / `process.env.DEMO_SIGNER_PK` / `privateKeyToAccount(` and excludes itself from its own scan. Necessary for the test to be both correct and green now.
- **tsconfig.json left comment-free.** The plan suggested a per-line `// Wave-0 RED stub` note above each added exclude, but tsconfig.json is parsed as strict JSON by the same pre-commit `tsc` gate and the existing excludes carry no comments. The note is recorded in this SUMMARY instead (deviation Rule 3 — avoid breaking the gate).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Architecture test self-matched and comment-matched on first run**
- **Found during:** Task 3 (key-leak arch test)
- **Issue:** Initial version scanned the arch test file itself (which names the banned tokens as regex/messages) and matched the `DEMO_SIGNER_PK` mention inside `mode.ts`'s documentation comment, producing 2 false failures.
- **Fix:** Excluded the arch test from its own scan (`SELF` filter) and switched rules 2/3 to match real code reads (`env.X` / `process.env.X` / `privateKeyToAccount(`) rather than any substring mention.
- **Files modified:** `tests/architecture/buildbear-key-leak.test.ts`
- **Verification:** 3/3 GREEN; injected a `NEXT_PUBLIC_DEMO_SIGNER_PK` line into a component → test failed (non-vacuous) → reverted → GREEN.
- **Committed in:** `6443eb9` (Task 3 commit)

**2. [Rule 3 - Blocking] tsconfig.json comment omitted (strict-JSON gate)**
- **Found during:** Task 2 (tsconfig excludes)
- **Issue:** Plan requested a `// Wave-0 RED stub` comment above each exclude line, but the pre-commit `tsc` gate parses tsconfig.json as strict JSON; comments would risk the gate.
- **Fix:** Added the three excludes without comments (matching the existing convention); documented the rationale here.
- **Files modified:** `packages/frontend/tsconfig.json`
- **Verification:** `tsc --noEmit` exit 0 with stubs excluded.
- **Committed in:** `81575d0` (Task 2 commit)

**Biome auto-formatting** (not a logic deviation): `biome check --write` reflowed import/call formatting in the new test files before each commit, mirroring the pre-commit hook's `stage_fixed: true`. The gate was never bypassed with `--no-verify`.

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking).
**Impact on plan:** Both essential for correctness and to keep the gate green. No scope creep — the behavioral contract is exactly as planned.

## Issues Encountered

None beyond the auto-fixed deviations above.

## Live Verification (Evidence Collector)

**N/A — skipped, recorded explicitly.** Per `packages/frontend/CLAUDE.md`, the live-DOM Evidence Collector is skipped for tasks that produce no user-visible route. This plan is a type/env + unit/architecture-test-only Wave-0 scaffold: `mode.ts` and `lib/env.ts` are non-rendering, and all six test files are CI artifacts with no rendered surface. The Wave-1 routes (11-02) and the UI decoupling (11-03/Phase 12) are where the live-verify rule applies.

## Verification Signals

- `vitest run tests/unit/mode.test.ts tests/architecture/buildbear-key-leak.test.ts` → 11/11 GREEN.
- `vitest run tests/api/buildbear-sign.test.ts` (and reset, and workflow-engine-buildbear) → RED_CONFIRMED (route/helper absent; `Cannot find package` import error).
- `tsc --noEmit` → exit 0 (3 RED stubs tsconfig-excluded).
- `biome check .` (300 files) → clean.
- No `fork` substring in any test file name (OPS-06).
- Hardhat key literal appears exactly once under `packages/frontend` (the fixture) with `gitleaks:allow`.
- `.env*` gitignored (frontend `.gitignore` `^\.env`).

## Next Phase Readiness

- **11-02** can now implement `buildbear-sign/route.ts` + `buildbear-reset/route.ts` to turn the RED suites GREEN, then un-exclude `tests/api/buildbear-sign.test.ts` + `tests/api/buildbear-reset.test.ts` from tsconfig.
- **11-03** can implement `buildUpstreamFromReplayArtifact` in `workflow-engine.ts` and un-exclude `tests/unit/workflow-engine-buildbear.test.ts`, plus the Somnia decoupling cut in `CornerstoneClientShell.tsx`.
- The reason-code strings, the redact() no-leak contract, the B1 undici shape, and the path-scope invariants are now executable, so Wave-1 implementations are fully test-pinned.

## Self-Check: PASSED

All 9 created/modified files verified present on disk; all 3 task commits (`6ce5b6b`, `81575d0`, `6443eb9`) present in git history.

---
*Phase: 11-frontend-server-routes*
*Completed: 2026-06-09*
