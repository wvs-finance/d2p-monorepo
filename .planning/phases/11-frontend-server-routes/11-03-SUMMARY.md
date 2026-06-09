---
phase: 11-frontend-server-routes
plan: 03
subsystem: cornerstone-live-path
tags: [next-app-router, somnia-decoupling, mint-source-swap, line-order-arch-test, honest-01, tdd-green]

# Dependency graph
requires:
  - phase: 11-frontend-server-routes
    plan: 01
    provides: "'buildbear' mode in CornerstoneMode + parseMode; DEMO_SIGNER_PK server env"
  - phase: 11-frontend-server-routes
    plan: 02
    provides: "exported BuildBearSignResponse discriminated union; /api/cornerstone/buildbear-sign route"
provides:
  - "CornerstoneClientShell.handleLiveConfirm — buildbear early-return branch (calls /api/cornerstone/buildbear-sign, returns BEFORE any /api/abrigo/agent1 reference); zero setResolvedMode('replay') flips on the buildbear path; mount-probe guard extended to 'buildbear'"
  - "workflow-engine.buildUpstreamFromReplayArtifact(presetId): UpstreamResult — mandate sourced from the recorded replay preset (getPresetById + fromMockEvent), Somnia-free, synchronous"
  - "tests/architecture/buildbear-decoupling.test.ts — CI line-order + no-fallthrough + no-replay-in-branch arch guard (un-excluded, GREEN)"
affects: [12-live-path-integration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Structural decoupling cut enforced by a static line-order vitest arch test: buildbear branch opener index < its own `return` index < `/api/abrigo/agent1` index (no-fallthrough proof a bare line-order check would miss)"
    - "MINT-03 mandate source swap is caller-side only: buildUpstreamFromReplayArtifact constructs UpstreamResult from getPresetById; runWorkflowLive signature/body untouched; buildLiveMandate PKE pin stays"
    - "Honest narrowing (no cast): fromMockEvent's wide WorkflowEventView union narrowed via `view.kind !== 'StrategistDecided'` guard before returning strategistView"

key-files:
  created:
    - packages/frontend/tests/architecture/buildbear-decoupling.test.ts
  modified:
    - packages/frontend/components/defi/cornerstone/CornerstoneClientShell.tsx
    - packages/frontend/lib/apps/abrigo/cornerstone/workflow-engine.ts
    - packages/frontend/tsconfig.json

key-decisions:
  - "Both tasks already existed as uncommitted/committed WIP from an interrupted prior session (mirrors the 11-02 pattern). Task 1 (buildUpstreamFromReplayArtifact + tsconfig un-exclude) was already committed as c4b2217; verified GREEN/correct rather than rewritten. Task 2 (shell cut + arch test) existed as uncommitted working-tree changes; verified GREEN + biome/tsc clean, then committed atomically as 61c8446."
  - "grep -c \"setResolvedMode('replay')\" returns 7, not 3. The plan's literal ==3 criterion was written against the research's idealized handleLiveConfirm excerpt. The real file has always had 7: 3 mount-probe useEffect flips (pre-existing) + 3 live-path flips (the 'three' the plan means) + 1 JSX comment string. HEAD==working-tree==7 proves ZERO flips were added by the buildbear branch. The load-bearing guard is the arch test, which scopes to the live-path region after the agent1 fetch and asserts exactly 3 — GREEN. Documented tension, not a violation."

patterns-established:
  - "Line-order + no-fallthrough static arch test as the CI guard for a structural decoupling cut (more honest than a bare grep: proves the branch RETURNS before the coupled fetch, not merely that the branch text precedes it)"

requirements-completed: []

# Metrics
duration: 12min
completed: 2026-06-09
---

# Phase 11 Plan 03: Somnia Decoupling Cut + MINT Source Swap Summary

**Made the Somnia decoupling cut (MINT-02) and the MINT-03 mandate-source swap: `handleLiveConfirm` now hard-branches on `resolvedMode === 'buildbear'` as its FIRST statement — calling `/api/cornerstone/buildbear-sign` and unconditionally returning BEFORE any `/api/abrigo/agent1` reference with zero silent replay flips (HONEST-01) — and `buildUpstreamFromReplayArtifact(presetId)` sources the live-path mandate from the recorded replay preset (`getPresetById` + `fromMockEvent`) instead of a live Somnia Agent-1 response, with `runWorkflowLive` untouched. A new line-order + no-fallthrough architecture test guards the cut in CI; the Wave-0 `workflow-engine-buildbear` suite is now GREEN and un-excluded.**

## Performance

- **Duration:** ~12 min
- **Completed:** 2026-06-09T14:56:19Z
- **Tasks:** 2
- **Files changed:** 4 (1 created, 3 modified)

## Accomplishments

- **MINT-03 — `buildUpstreamFromReplayArtifact` (Task 1, committed `c4b2217`):** Exported synchronous helper in `workflow-engine.ts` that builds `UpstreamResult` from `getPresetById(presetId)`. The `strategistRaw: StrategistDecidedEvent` literal is lifted verbatim from the existing `runWorkflow` mock (`strikeWAD: 4100n` scaling preserved); only `requestId = BigInt(preset.recordedDecisionId)` is rebound. The view is narrowed honestly via `view.kind !== 'StrategistDecided'` (no cast) and returned directly — `fromMockEvent` already stamps `recordedDecisionId = requestId.toString()` so there is no dead re-spread. Unknown id → `{ ok:false, reason:'unknown preset: <id>', strategistView:null }`. ZERO network calls; `runWorkflowLive` signature/body and `buildLiveMandate` PKE pin untouched. `tests/unit/workflow-engine-buildbear.test.ts` un-excluded from `tsconfig.json`.
- **MINT-02 — Somnia decoupling cut (Task 2, committed `61c8446`):** In `CornerstoneClientShell.handleLiveConfirm`, the `if (resolvedMode === 'buildbear')` branch is the FIRST statement. It `fetch`es `/api/cornerstone/buildbear-sign` (typed via the imported `BuildBearSignResponse`) and **unconditionally `return`s** before the original `/api/abrigo/agent1` `try` block — so control can never fall through to Somnia. The branch contains ZERO `setResolvedMode('replay')` calls (HONEST-01 — Phase 12 wires the fork-used advisory). The three live-path flips and the mount-probe useEffect flips are intact. The mount-probe guard is extended to `if (resolvedMode !== 'live' && resolvedMode !== 'buildbear') return`.
- **CI arch guard (Task 2):** `tests/architecture/buildbear-decoupling.test.ts` (un-excluded, node env) asserts: (1) both `resolvedMode === 'buildbear'` and `'/api/abrigo/agent1'` present; (2) bare line-order buildbear < agent1; (3) **no-fallthrough** — the branch's own `return` index is `> buildbear` and `< agent1`; (4) the branch calls `/api/cornerstone/buildbear-sign`; (5) zero `setResolvedMode('replay')` inside the branch; (6) exactly three live-path flips survive after the agent1 fetch.

## Task Commits

1. **Task 1: MINT-03 buildUpstreamFromReplayArtifact** — `c4b2217` (feat) — workflow-engine helper + `workflow-engine-buildbear` test un-excluded. Already committed in an interrupted prior session; verified GREEN/correct against all acceptance greps rather than rewritten.
2. **Task 2: MINT-02 decoupling cut + arch test** — `61c8446` (feat) — `CornerstoneClientShell.handleLiveConfirm` buildbear early-return + mount-probe guard extension + `buildbear-decoupling.test.ts`. Existed as uncommitted working-tree WIP; verified GREEN + biome/tsc clean, committed atomically.

**Plan metadata:** final docs commit — this SUMMARY + STATE + ROADMAP.

## Files Created/Modified

- `tests/architecture/buildbear-decoupling.test.ts` (created) — line-order + no-fallthrough + no-replay-in-branch + exactly-3-live-flips arch guard.
- `components/defi/cornerstone/CornerstoneClientShell.tsx` (modified) — buildbear early-return branch in `handleLiveConfirm`; mount-probe guard extended; `BuildBearSignResponse` import.
- `lib/apps/abrigo/cornerstone/workflow-engine.ts` (modified, Task 1) — exported `buildUpstreamFromReplayArtifact`.
- `tsconfig.json` (modified, Task 1) — `tests/unit/workflow-engine-buildbear.test.ts` removed from `exclude`.

## Decisions Made

- **Verified-not-rewritten on prior-session WIP.** Both tasks pre-existed (Task 1 committed `c4b2217`; Task 2 uncommitted). Rather than redo, each was validated against every plan acceptance grep + the test suites; all GREEN. Only Task 2's commit was outstanding.
- **`grep -c "setResolvedMode('replay')"` == 7, not the literal 3 the plan's acceptance line states.** The real file has always carried 7 occurrences (3 mount-probe useEffect flips + 3 live-path flips + 1 JSX-comment string); the plan's `==3` was written against the research's abbreviated `handleLiveConfirm`-only excerpt. `HEAD == working-tree == 7` proves the buildbear branch added ZERO flips, and the buildbear branch body (verified by the arch test) contains none. The load-bearing CI guard is the arch test — which scopes to the post-agent1 live-path region and asserts exactly 3 — and it is GREEN. Documented as a tension between an idealized grep and the real file, not a behavioral deviation.

## Deviations from Plan

None — plan executed exactly as written (both tasks' code already matched the pinned spec; verified GREEN, Task 2 committed). One documented tension (literal `grep -c == 3` vs. the real file's 7 occurrences) resolved in favor of the arch test, which is the actual invariant guard. No code change was needed for it.

## Deferred Issues (out-of-scope)

- `tests/unit/anti-patterns.test.ts` (`impeccable anti-pattern detector`) intermittently times out at the default 30s in the FULL `vitest run` (it spawns the external `impeccable` binary, ~27s). **Passes 9/9 in isolation.** Pre-existing, unrelated to the 11-03 cornerstone/workflow-engine changes. Logged to `deferred-items.md`. Not fixed (out of scope per the task scope boundary).

## Live Verification (Evidence Collector)

**N/A for Phase 11 — explicitly deferred to Phase 12.** Per `packages/frontend/CLAUDE.md` and the plan `<output>`, the decoupling cut changes `CornerstoneClientShell` behavior **only in `buildbear` mode, which is not user-reachable in Phase 11** — Phase 12 wires the `?mode=buildbear` URL opt-in + the one-click RunState handler, so the full live-DOM Evidence Collector pass belongs there. The Phase 11 cut is verified entirely by the node-env arch test (line-order + no-fallthrough) + the `workflow-engine-buildbear` unit suite + tsc + biome.

**Cheap regression note (replay/live/mock render unaffected):** the edit adds a NEW first branch gated on `resolvedMode === 'buildbear'`; for `replay`/`live`/`mock` that branch is skipped and the original `handleLiveConfirm` body runs unchanged, and the mount-probe still early-returns for `replay`/`mock`. No existing render path was modified — confirmed by the full vitest suite (641 passed, only the unrelated `impeccable` timeout flake) and by the arch test asserting the three live-path flips are preserved verbatim.

## Verification Signals

- `vitest run tests/unit/workflow-engine-buildbear.test.ts tests/architecture/buildbear-decoupling.test.ts` → **8/8 GREEN**.
- `vitest run` (full) → **641 passed**; the lone failure is `tests/unit/anti-patterns.test.ts` timing out on the external `impeccable` binary in the full run (passes 9/9 in isolation) — pre-existing, unrelated, deferred.
- `tsc --noEmit` → exit 0 (`workflow-engine-buildbear` un-excluded).
- `biome check` (3 changed files) → clean.
- MINT-02 line-order: buildbear index < agent1 index — PASS. No-fallthrough: buildbear < `return` < agent1 — PASS. buildbear branch contains `/api/cornerstone/buildbear-sign` — PASS. mount-probe guard extended — PASS.
- MINT-03: `buildUpstreamFromReplayArtifact` exported; uses `getPresetById`; zero `agent1|abrigo/agent1|50312|fetch(` refs in `workflow-engine.ts`; `runWorkflowLive` signature unchanged; no dead `recordedDecisionId` re-spread — all PASS.

## Next Phase Readiness

- **Phase 12** can now: verify the decoupling grep FIRST (the arch test already encodes it), build `handleBuildBearConfirm` on top of the established cut, un-void `writeContractAsync`, wire `RunState: 'failed'`/`'fork-used'`, and call `buildUpstreamFromReplayArtifact(presetId)` to feed `runWorkflowLive` the replay-sourced mandate. The `?mode=buildbear` URL opt-in + the live-DOM Evidence Collector pass are Phase 12's.

## Self-Check: PASSED

- Files: `CornerstoneClientShell.tsx`, `workflow-engine.ts`, `buildbear-decoupling.test.ts` — all FOUND on disk.
- Commits: `c4b2217` (Task 1) and `61c8446` (Task 2) — both FOUND in git history on `phase-11-frontend-server-routes`.

---
*Phase: 11-frontend-server-routes*
*Completed: 2026-06-09*
