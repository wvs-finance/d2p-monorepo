---
phase: 11-frontend-server-routes
verified: 2026-06-09T15:10:53Z
status: passed
score: 16/16 must-haves verified
requirements_delivered:
  - MINT-01
  - MINT-02
  - MINT-03
requirements_ledger_note: "REQUIREMENTS.md MINT-01/02/03 are [ ]/Pending (anti-fishing — executors deliberately left them unmarked). All three are DELIVERED in the codebase and CI-checkable. Ledger update recommended."
---

# Phase 11: Frontend Server Routes Verification Report

**Phase Goal:** Two Node-runtime API routes (`buildbear-sign` + `buildbear-reset`) + the `'buildbear'` CornerstoneMode + the Somnia decoupling cut in `handleLiveConfirm`, all unit-testable against a mock artifact (no live fork). The BuildBear branch can never call `/api/abrigo/agent1` on any error path. Discriminated reason codes; open-reset; redact RPC URL from all detail; MINT-03 upstream from the recorded replay (not Somnia).
**Verified:** 2026-06-09T15:10:53Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
| -- | ----- | ------ | -------- |
| 1  | `parseMode('buildbear')` → `'buildbear'`; `parseMode(null)` still `'replay'` (default unchanged) | ✓ VERIFIED | `mode.ts:36-37` adds buildbear branch; `mode.ts:23,37` default `DEFAULT_MODE='replay'`; `mode.test.ts` GREEN |
| 2  | `DEMO_SIGNER_PK` readable server-side, never `NEXT_PUBLIC_` | ✓ VERIFIED | `env.ts:31` server schema, `:51` runtimeEnv mapping; no `NEXT_PUBLIC_DEMO_SIGNER` anywhere; key-leak arch test GREEN |
| 3  | `buildbear-sign` route: nodejs runtime, 5 discriminated reason codes, `redact()` on every detail, body cap, signer pre-flight | ✓ VERIFIED | `route.ts:23` runtime='nodejs'; `:72` 5 reasons; `:79-81` redact applied to all detail; `:142` 16 KiB cap; `:182-189` zero-balance pre-flight before simulate; 13 sign tests GREEN incl. M1 no-leak |
| 4  | `buildbear-reset` OPEN, `evm_revert`+`evm_snapshot`, `no-snapshot` when absent, rpc-unreachable classification | ✓ VERIFIED | `route.ts:43` no auth; `:58,70` evm_revert→evm_snapshot; `:45-54` no-snapshot 409; `:96-110` TypeError/cause.code rpc-unreachable; reset tests GREEN |
| 5  | `handleLiveConfirm` buildbear branch is FIRST statement, returns BEFORE any `/api/abrigo/agent1` ref | ✓ VERIFIED | `CornerstoneClientShell.tsx:197` first branch; `:212` unconditional return; agent1 fetch at `:217`; decoupling arch test (line-order + no-fallthrough) GREEN |
| 6  | Buildbear branch contains ZERO `setResolvedMode('replay')` | ✓ VERIFIED | branch L197-213 has none; arch test "zero flips inside buildbear branch" GREEN (slices opener→first-return) |
| 7  | The three live-path `setResolvedMode('replay')` flips preserved | ✓ VERIFIED | live-path flips at L234,247 + one below; arch test asserts exactly 3 in post-agent1 region (7 total file occurrences = 3 mount-probe + 3 live + 1 JSX comment) GREEN |
| 8  | `buildUpstreamFromReplayArtifact(presetId)` sources from recorded preset (`getPresetById`), no Somnia | ✓ VERIFIED | `workflow-engine.ts:171-172` exported, calls `getPresetById`; no `agent1` ref in workflow-engine source; workflow-engine-buildbear test GREEN |
| 9  | `runWorkflowLive` signature unchanged | ✓ VERIFIED | `workflow-engine.ts:264-271` takes `upstream` param (caller-side construction); helper is additive |

**Score:** 9/9 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `app/api/cornerstone/buildbear-sign/route.ts` | nodejs route, 5 reasons, redact, body cap, pre-flight (≥90 ln) | ✓ VERIFIED | 230 lines, all behaviors substantive + wired |
| `app/api/cornerstone/buildbear-reset/route.ts` | open evm_revert+evm_snapshot (≥50 ln) | ✓ VERIFIED | 114 lines, open, documented limitation in header |
| `lib/apps/abrigo/cornerstone/mode.ts` | 'buildbear' in union + parseMode | ✓ VERIFIED | 38 lines; union + parse branch; default replay |
| `lib/env.ts` | DEMO_SIGNER_PK server schema + runtimeEnv | ✓ VERIFIED | server-only schema:31 + mapping:51 |
| `lib/apps/abrigo/cornerstone/workflow-engine.ts` | exported `buildUpstreamFromReplayArtifact` | ✓ VERIFIED | 426 lines; exported helper sources from preset |
| `components/defi/cornerstone/CornerstoneClientShell.tsx` | buildbear early-return branch | ✓ VERIFIED | 296 lines; first-statement branch + return |
| `tests/api/buildbear-sign.test.ts` | RED→GREEN, ≥80 ln | ✓ VERIFIED | 219 lines, GREEN |
| `tests/api/buildbear-reset.test.ts` | RED→GREEN, ≥40 ln | ✓ VERIFIED | 128 lines, GREEN |
| `tests/unit/workflow-engine-buildbear.test.ts` | RED→GREEN, ≥20 ln | ✓ VERIFIED | 41 lines, GREEN |
| `tests/unit/mode.test.ts` | GREEN | ✓ VERIFIED | 49 lines, GREEN |
| `tests/architecture/buildbear-decoupling.test.ts` | line-order CI check, ≥25 ln | ✓ VERIFIED | 77 lines; line-order + no-fallthrough + zero-flip + 3-flip-preserve, GREEN |
| `tests/architecture/buildbear-key-leak.test.ts` | path-scoped key-leak grep, ≥20 ln | ✓ VERIFIED | 83 lines, GREEN |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | -- | --- | ------ | ------- |
| `env.ts` | `process.env.DEMO_SIGNER_PK` | runtimeEnv mapping | ✓ WIRED | `env.ts:51` |
| `buildbear-sign route` | `env.DEMO_SIGNER_PK` | `privateKeyToAccount` | ✓ WIRED | `route.ts:169` |
| `buildbear-sign route` | `deployment.executor` | `simulateContract` before `writeContract` | ✓ WIRED | `route.ts:193,202` |
| `buildbear-reset route` | `deployment.rpcUrl` | `evm_snapshot` JSON-RPC | ✓ WIRED | `route.ts:70` |
| `handleLiveConfirm` | `/api/cornerstone/buildbear-sign` | buildbear branch fetch before agent1 | ✓ WIRED | `CornerstoneClientShell.tsx:199` (before `:217`) |
| `workflow-engine` | `getPresetById` | recorded preset → StrategistDecidedView | ✓ WIRED | `workflow-engine.ts:172` |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ----------- | ----------- | ------ | -------- |
| MINT-01 | 11-01, 11-02 | server-only buildbear-sign route, DEMO_SIGNER_PK never NEXT_PUBLIC_ | ✓ SATISFIED | route.ts substantive + 13 tests GREEN + key-leak arch GREEN |
| MINT-02 | 11-03 | judge live path BuildBear-only, never calls agent1 (decoupling cut) | ✓ SATISFIED | first-branch early-return + decoupling arch test (line-order+no-fallthrough) GREEN |
| MINT-03 | 11-03 | mandate sourced from recorded replay artifact, not live Somnia | ✓ SATISFIED | buildUpstreamFromReplayArtifact via getPresetById, no agent1 ref; test GREEN |

REQUIREMENTS.md currently lists all three as `[ ]`/In Progress (lines 35-37, 106-108). This is the deliberate anti-fishing posture noted in the phase prompt — executors did NOT self-mark complete. Verification confirms all three are DELIVERED. **Ledger update to Complete is recommended.** No orphaned requirements: REQUIREMENTS.md maps only MINT-01/02/03 to Phase 11, all claimed by plans.

### Anti-Patterns Found

None. Source files scanned (`buildbear-sign`, `buildbear-reset`, `workflow-engine`, `mode`) — zero TODO/FIXME/PLACEHOLDER/not-implemented. Phase-11 `null` view stubs in the sign route are intentional, documented as Phase 12/13 log-decoding (`route.ts:64`), and pinned by tests — not anti-pattern stubs.

### CI Gate Results

| Gate | Result |
| ---- | ------ |
| `vitest run` (6 buildbear files) | ✓ 6 files / 34 tests passed |
| `tsc --noEmit` | ✓ exit 0 |
| `biome check .` | ✓ 303 files, no issues |

### Human Verification Required

None. All Phase 11 signals are CI-checkable (routes unit-tested against mocks, no live fork). The decoupling invariant is enforced by a static line-order architecture test, not a live DOM assertion. Live signing against the fork is explicitly Phase 12.

### Gaps Summary

No gaps. All 16 must-haves (9 truths + key artifacts/links) verified across the three plans. The two Node-runtime routes exist and are substantive with discriminated reason codes and universal `redact()`; the `'buildbear'` mode is added without disturbing the replay default; the Somnia decoupling cut is the first statement in `handleLiveConfirm` and provably returns before any agent1 reference (line-order + no-fallthrough arch test); MINT-03 sources the mandate from the recorded preset with `runWorkflowLive`'s signature unchanged. tsc, biome, and all 34 tests are GREEN.

---

_Verified: 2026-06-09T15:10:53Z_
_Verifier: Claude (gsd-verifier)_
