---
phase: 11-frontend-server-routes
plan: 02
subsystem: api-routes
tags: [next-app-router, viem, server-signing, evm-snapshot, json-rpc, buildbear, discriminated-union, tdd-green]

# Dependency graph
requires:
  - phase: 11-frontend-server-routes
    plan: 01
    provides: "Wave-0 RED suites (buildbear-sign 9 cases, buildbear-reset 6 cases), 'buildbear' mode, DEMO_SIGNER_PK server env, non-vacuous key-leak arch test"
  - phase: 10-backend-single-use-guard
    provides: "BuildBear artifact (snapshotId + mintTxHash:null), EXEC-01 'fork used' string revert, pinned resolveFromMandate ABI tuple"
provides:
  - "app/api/cornerstone/buildbear-sign/route.ts — nodejs-runtime server-signing route; discriminated BuildBearSignResponse (not-configured | fork-used | rpc-unreachable | signer-gas | reverted | ok); signer-balance pre-flight; redact() on every detail; 16 KiB body cap"
  - "app/api/cornerstone/buildbear-reset/route.ts — OPEN nodejs-runtime evm_revert+evm_snapshot route; no-snapshot/revert-failed/rpc-unreachable scoped reasons; B1 undici classifier; m6 0x-string validation; documented shared-sandbox limitation"
  - "exported BuildBearSignResponse discriminated union (Phase 11-03 + Phase 12 import the same type)"
affects: [11-03-decoupling-mandate-source, 12-live-path-integration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Server-signing route: not-configured guard BEFORE any client construction; getBalance()===0n pre-flight BEFORE simulateContract; simulate-before-write revert pre-classification"
    - "classifyViemError keys off constructor.name / cause-chain traversal (no viem error-type imports → no dead-code biome flag)"
    - "redact(s) = s.replace(/https?:\\/\\/[^\\s\"')]+/g, '[rpc-redacted]') applied to every detail (RPC URL is a bearer credential)"
    - "OPEN reset route: POST(_req) never reads body/headers; reads only deployment.snapshotId; fixed evm_revert→evm_snapshot method set; B1 undici TypeError/cause.code classifier"
    - "Node-runtime route test fetch mocking MUST use vi.stubGlobal('fetch') — vi.spyOn loses to the MSW interceptor (onUnhandledRequest:'error') installed in tests/setup.ts"

key-files:
  created:
    - packages/frontend/app/api/cornerstone/buildbear-sign/route.ts
    - packages/frontend/app/api/cornerstone/buildbear-reset/route.ts
  modified:
    - packages/frontend/tsconfig.json
    - packages/frontend/tests/api/buildbear-reset.test.ts

key-decisions:
  - "Reset test fetch mock switched from vi.spyOn(globalThis,'fetch') to vi.stubGlobal('fetch', fn): the MSW server in tests/setup.ts installs a global fetch interceptor that defeats vi.spyOn, so the route's fetch calls were reported as 0 and the MSW 'unhandled request' throw mis-classified as revert-failed. stubGlobal replaces the binding MSW reads. Route was correct; the Wave-0 test scaffold used an MSW-incompatible mock strategy."
  - "buildbear-sign route was completed (uncommitted WIP) from an interrupted prior session and matched the pinned Pattern 1+2 exactly; verified GREEN + biome-formatted, then committed atomically as Task 1."

patterns-established:
  - "vi.stubGlobal('fetch') is the required raw-fetch mock for node-env route tests in this repo (MSW-everywhere setup)"
  - "Discriminated reason-code envelope + redact-every-detail for any server route that touches a credentialed RPC URL"

requirements-completed: [MINT-01]

# Metrics
duration: 10min
completed: 2026-06-09
---

# Phase 11 Plan 02: BuildBear Server Routes Summary

**Shipped the two Node-runtime cornerstone API routes that turn the Wave-0 RED suites GREEN: `buildbear-sign` (MINT-01 — server-signs `resolveFromMandate` with `DEMO_SIGNER_PK`, full discriminated reason set, signer-balance pre-flight, redacted details, 16 KiB body cap) and `buildbear-reset` (OPEN `evm_revert`+`evm_snapshot` with the shared-sandbox limitation documented in-header), with the exported `BuildBearSignResponse` union and both test files un-excluded from tsconfig.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-06-09T14:32:00Z
- **Completed:** 2026-06-09T14:42:22Z
- **Tasks:** 2
- **Files changed:** 4 (2 created, 2 modified)

## Accomplishments

- **buildbear-sign route (MINT-01):** `runtime='nodejs'`; `not-configured` (503) when `env.DEMO_SIGNER_PK` absent, before any viem client; 16 KiB `content-length` cap before `req.json()`; generic `invalid request body` detail (never echoes the raw parse error); `getBalance()===0n` pre-flight → `signer-gas` before `simulateContract`; `simulateContract` before `writeContract` so reverts are pre-classified; `classifyViemError` maps `fork used`→`fork-used`, other reverts→`reverted`, `InsufficientFundsError`→`signer-gas`, `HttpRequestError`→`rpc-unreachable`; success returns `{ ok:true, txHash, blockNumber, strategistView:null, executorView:null, positionMinted:null, margins:null }`. Every `detail` routed through `redact()` — the M1 no-rpc-url-leak test is GREEN (SECRET123 / buildbear.io leak NEITHER). Sign suite: **9/9 GREEN**.
- **buildbear-reset route (OPEN):** `runtime='nodejs'`; `POST(_req)` never reads the body/headers, reads only `deployment.snapshotId`; `no-snapshot` (409) when absent; `evm_revert(snapshotId)` then `evm_snapshot` in strict order; non-true `evm_revert`→`revert-failed` (no `evm_snapshot` call); m6 validates `newSnapshotId` is a `0x…` string before returning `{ ok:true, newSnapshotId }`; B1 catch classifies thrown fetch errors (`instanceof TypeError`, `cause.code` ECONNREFUSED/ENOTFOUND/ECONNRESET, legacy substrings) as `rpc-unreachable`, never `revert-failed`; `redact()` on every detail (M1 GREEN). Header documents the OPEN-route + OPS-05 no-rate-limit accepted limitation and the rejected auth gate. Reset suite: **6/6 GREEN**.
- **Type export + tsconfig:** `BuildBearSignResponse` exported for 11-03 + Phase 12; both `tests/api/buildbear-sign.test.ts` and `tests/api/buildbear-reset.test.ts` un-excluded from tsconfig (modules now resolve).

## Task Commits

1. **Task 1: buildbear-sign route (TDD GREEN)** — `14caf83` (feat) — sign route + sign-test un-exclude. The route was present as uncommitted WIP from an interrupted prior session, matched the pinned Pattern 1+2 verbatim, verified 9/9 GREEN + biome-formatted, then committed.
2. **Task 2: buildbear-reset route (TDD GREEN)** — `d3515c5` (feat) — reset route + Wave-0 reset-test fetch-mock fix (vi.stubGlobal) + reset-test un-exclude. 6/6 GREEN.

**Plan metadata:** final docs commit — this SUMMARY + STATE + ROADMAP + REQUIREMENTS.

## Files Created/Modified

- `app/api/cornerstone/buildbear-sign/route.ts` (created) — server-signing route; ABI tuple + `classifyViemError`/`findInCauseChain`/`redact` lifted from 11-RESEARCH §Pattern 1+2.
- `app/api/cornerstone/buildbear-reset/route.ts` (created) — OPEN reset route; `jsonRpc` helper + B1 classifier + `redact` lifted from 11-RESEARCH §Pattern 3.
- `tsconfig.json` (modified) — removed `tests/api/buildbear-sign.test.ts` and `tests/api/buildbear-reset.test.ts` from `exclude` (modules now resolve). `tests/unit/workflow-engine-buildbear.test.ts` stays excluded (11-03 scope).
- `tests/api/buildbear-reset.test.ts` (modified) — fetch mock changed from `vi.spyOn(globalThis,'fetch')` to `vi.fn` + `vi.stubGlobal('fetch', …)` in `beforeEach` / `vi.unstubAllGlobals()` in `afterEach`. Every assertion and the pinned contract are unchanged.

## Decisions Made

- **vi.stubGlobal over vi.spyOn for raw-fetch route tests (MSW interaction).** `tests/setup.ts` runs an MSW server with `onUnhandledRequest:'error'`, installing a global `fetch` interceptor. `vi.spyOn(globalThis,'fetch')` is wrapped beneath that interceptor, so the route's fetch was never the mock — calls reported as 0 and the MSW unhandled-request throw mis-classified as `revert-failed`. Empirically confirmed: switching to `vi.stubGlobal('fetch', fn)` makes the route's fetch the mock (`calls:2`, `newSnapshotId:'0x2'`, `ok:true`). The buildbear-sign suite was unaffected because it mocks the entire `viem` module, never raw fetch.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Wave-0 reset test used an MSW-incompatible fetch mock (route blocked from verification)**
- **Found during:** Task 2
- **Issue:** `tests/api/buildbear-reset.test.ts` (authored in 11-01) mocked fetch with `vi.spyOn(globalThis,'fetch')`. The repo's `tests/setup.ts` starts an MSW server (`onUnhandledRequest:'error'`) whose global fetch interceptor defeats `vi.spyOn`. Result: the route's `fetch` calls were reported as 0 and the MSW "Cannot bypass… error strategy" throw was caught and mis-classified as `revert-failed` — 4 of 6 reset tests failed against a correct route.
- **Fix:** Replaced the fetch mock with `vi.fn<typeof fetch>()` + `vi.stubGlobal('fetch', fetchSpy)` in `beforeEach` and `vi.unstubAllGlobals()` in `afterEach` (added `afterEach` to the vitest import). No assertion, fixture, or expected-contract change — the route is unmodified.
- **Files modified:** `tests/api/buildbear-reset.test.ts`
- **Verification:** reset suite 6/6 GREEN; targeted `-t "revert-failed"`, `-t "rpc-unreachable"`, `-t "no rpc url leak"` each GREEN; diagnostic proved the route already produced the pinned `{ ok:true, newSnapshotId:'0x2' }` under `vi.stubGlobal`.
- **Committed in:** `d3515c5` (Task 2 commit)

### Noted Tension (not a code change)

**Auth-keyword negative grep vs. mandated limitation header.** Task 2's acceptance criterion `! grep -ni "secret|authorization|x-api-key|bearer"` over the reset route returns 3 hits — all inside the **mandated** documentation header ("auth/shared-secret gate… REJECTED", "bearer credential", "sandbox-secret-id"). The plan/critical-instructions explicitly require those header words. The criterion's intent (no code-level auth gate) is fully satisfied: zero auth keywords on non-comment lines, and `POST(_req)` never reads request headers or body (`grep -nE "headers\.get|req\.headers"` → empty). Documented rather than silently dropping the mandated header.

**Biome auto-formatting** (not a logic deviation): `biome check --write` reflowed the `Response.json(not-configured, {status:503})` call in the sign route and confirmed the reset route/test clean, mirroring the pre-commit `stage_fixed:true` hook. No commit used `--no-verify`.

---

**Total deviations:** 1 auto-fixed (test-scaffold bug) + 1 documented tension (mandated-header vs. literal grep).
**Impact on plan:** Routes implemented exactly as pinned; only the Wave-0 test's mock mechanism was corrected so the correct route could be verified. No scope creep.

## Issues Encountered

- The buildbear-sign route existed as uncommitted WIP from an interrupted prior session (matched the pinned pattern); verified GREEN + formatted and committed as Task 1 rather than rewritten.

## Out-of-Scope (Expected RED)

- `tests/unit/workflow-engine-buildbear.test.ts` (2 cases) is the **11-03** RED scaffold for `buildUpstreamFromReplayArtifact` (MINT-03). It remains tsconfig-excluded and RED for the intended import-absence reason (`buildUpstreamFromReplayArtifact is not a function`). Not in 11-02 scope; not a regression. Full suite: **634 passed**, 2 failed (only this excluded 11-03 scaffold).

## Live Verification (Evidence Collector)

**N/A — API-only, recorded explicitly.** Per `packages/frontend/CLAUDE.md`, the live-DOM Evidence Collector is skipped for routes with no rendered surface. Both routes are server-only POST handlers with no UI; they are verified entirely by the node-env vitest suites (sign 9/9, reset 6/6) + the path-scoped key-leak arch test (3/3). Phase 12 owns the live integration verify (real mint end-to-end against the BuildBear fork) and the UI wiring.

## Verification Signals

- `vitest run tests/api/buildbear-sign.test.ts tests/api/buildbear-reset.test.ts tests/architecture/buildbear-key-leak.test.ts` → **18/18 GREEN**.
- `vitest run` (full) → 634 passed; 2 failed = only the tsconfig-excluded 11-03 `workflow-engine-buildbear` scaffold (expected RED).
- `tsc --noEmit` → exit 0 (both new test files un-excluded; 11-03 scaffold still excluded).
- `biome check .` (302 files) → clean.
- Key-leak: `NEXT_PUBLIC_DEMO_SIGNER` only inside the self-excluding arch test; zero real `env.DEMO_SIGNER_PK`/`process.env.DEMO_SIGNER_PK` code reads in `components`/`lib` (the lone `mode.ts` hit is a comment, by-design non-flagged); `privateKeyToAccount` only under `app/api/`.
- buildbear-sign: `runtime='nodejs'` first export; `env.DEMO_SIGNER_PK` (not `process.env`); `simulateContract` precedes `writeContract`; `content-length` cap; `invalid request body` (no `invalid JSON body`); OPS-05 header; `redact` ×10.
- buildbear-reset: `runtime='nodejs'`; `evm_revert` precedes `evm_snapshot`; `instanceof TypeError`; `ECONNREFUSED`; `startsWith('0x')`; griefable/OPEN-ROUTE/REJECTED header present; zero auth keywords on non-comment lines.

## Next Phase Readiness

- **11-03** can implement `buildUpstreamFromReplayArtifact` in `workflow-engine.ts` (un-excluding `tests/unit/workflow-engine-buildbear.test.ts`) and the Somnia decoupling cut in `CornerstoneClientShell.tsx` — both routes and the `BuildBearSignResponse` type are now available to import.
- **Phase 12** imports `BuildBearSignResponse` from the sign route and wires `handleBuildBearConfirm` → `/api/cornerstone/buildbear-sign`; the reset route is ready for the mount-probe reset guard.

## Self-Check: PASSED

Both route files verified present on disk; both task commits (`14caf83`, `d3515c5`) present in git history on `phase-11-frontend-server-routes`.

---
*Phase: 11-frontend-server-routes*
*Completed: 2026-06-09*
