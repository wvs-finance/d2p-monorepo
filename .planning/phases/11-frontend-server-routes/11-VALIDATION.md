---
phase: 11
slug: frontend-server-routes
status: approved
nyquist_compliant: true
wave_0_complete: false
created: 2026-06-09
---

# Phase 11 — Validation Strategy

> Unlike Phase 10, **every** Phase 11 signal is CI-checkable (vitest + greps) — no live BuildBear fork, no operator-manual transcripts. The routes are unit-tested against a mocked artifact + mocked RPC transport. (Note: the workspace filter is `d2p-frontend`, not `frontend`.)

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.6 (configured) |
| **Config file** | `packages/frontend/vitest.config.ts` |
| **Quick run command** | `pnpm --filter d2p-frontend exec vitest run tests/api/buildbear-sign.test.ts tests/api/buildbear-reset.test.ts tests/unit/mode.test.ts tests/unit/workflow-engine-buildbear.test.ts` |
| **Full suite command** | `pnpm --filter d2p-frontend exec vitest run` |
| **Estimated runtime** | ~3–8s (unit/route, no fork) |

All new route/transport tests use `// @vitest-environment node` (pattern from `tests/api/status.test.ts`) — viem transport needs Node crypto/fetch. Test files must NOT contain `fork` in the name (OPS-06 CI lane).

---

## Sampling Rate

- **After every task commit:** quick run command
- **After every plan wave:** full suite + `tsc --noEmit` + `biome check .`
- **Before `/gsd:verify-work`:** full suite green
- **Max feedback latency:** ~8s

---

## Per-Requirement Verification Map

| Requirement | Behavior | Type | Automated Command / Signal | Status |
|-------------|----------|------|----------------------------|--------|
| MINT-01 | `not-configured` when `DEMO_SIGNER_PK` absent | route unit | `vitest … buildbear-sign -t "not-configured"` | ⬜ |
| MINT-01 | `fork-used` when simulate throws `ContractFunctionRevertedError.reason === "fork used"` | route unit | `vitest … buildbear-sign -t "fork-used"` | ⬜ |
| MINT-01 | `rpc-unreachable` on `HttpRequestError` | route unit | `vitest … buildbear-sign -t "rpc-unreachable"` | ⬜ |
| MINT-01 | `signer-gas` when `getBalance() === 0n` (pre-flight) / `InsufficientFundsError` | route unit | `vitest … buildbear-sign -t "signer-gas"` | ⬜ |
| MINT-01 | `reverted` for non-"fork used" reverts | route unit | `vitest … buildbear-sign -t "reverted"` | ⬜ |
| MINT-01 | success `{ok:true, txHash, views, margins, blockNumber}` | route unit | `vitest … buildbear-sign -t "ok"` | ⬜ |
| MINT-01 | key never `NEXT_PUBLIC_`; `DEMO_SIGNER_PK`/`privateKeyToAccount` only under `app/api/` | arch grep (path-scoped) | `! grep -rn 'NEXT_PUBLIC_DEMO_SIGNER\|DEMO_SIGNER_PK' packages/frontend/{app,components,lib} --include='*.ts*' \| grep -v '/app/api/'` | ⬜ |
| MINT-02 | buildbear branch returns BEFORE any agent1 fetch (decoupling) | arch grep (line-order) | python line-order check: `resolvedMode === 'buildbear'` position < `'/api/abrigo/agent1'` position in `CornerstoneClientShell.tsx` | ⬜ |
| MINT-02 | `runWorkflowLive`/buildbear path has zero reachable agent1 call | grep | `! grep -nE "agent1\|abrigo/agent1\|50312" packages/frontend/lib/apps/abrigo/cornerstone/workflow-engine.ts` | ⬜ |
| MINT-03 | `buildUpstreamFromReplayArtifact(presetId)` returns `{ok:true, strategistView}` from the recorded preset (no Somnia call) | unit | `vitest run tests/unit/workflow-engine-buildbear.test.ts` | ⬜ |
| (reset) | `buildbear-reset` open (no auth) → `{ok:false}` when artifact has no `snapshotId` | route unit | `vitest … buildbear-reset -t "no-snapshot"` | ⬜ |
| (reset) | calls `evm_revert(snapshotId)` then `evm_snapshot` in sequence; returns `newSnapshotId` | route unit | `vitest … buildbear-reset -t "reset sequence"` / `-t "newSnapshotId"` | ⬜ |
| (mode) | `parseMode('buildbear') === 'buildbear'`; `parseMode(null) === 'replay'` (default unchanged) | unit | `vitest run tests/unit/mode.test.ts` | ⬜ |

---

## Wave 0 Requirements

- [ ] `tests/api/buildbear-sign.test.ts` — all reason-code branches (mock artifact + viem transport throwing the specific error classes)
- [ ] `tests/api/buildbear-reset.test.ts` — no-snapshot, reset sequence, newSnapshotId (mock RPC fetch)
- [ ] `tests/unit/mode.test.ts` — extend for `'buildbear'` (default-replay preserved)
- [ ] `tests/unit/workflow-engine-buildbear.test.ts` — `buildUpstreamFromReplayArtifact` from preset
- [ ] An architecture/grep test (or a documented CI step) for the path-scoped key-leak grep + the decoupling line-order check

---

## Manual-Only Verifications

**None — every Phase 11 behavior has an automated (vitest/grep) signal.** The live signing against a real fork is exercised in Phase 12 (and was already proven in the Phase 10 spike); Phase 11 routes are validated entirely against mocks.

---

## Validation Sign-Off

- [ ] Every requirement has an `<automated>` vitest test or a grep arch-test
- [ ] No live-fork dependency in any Phase 11 test (all run in the secret-free CI lane)
- [ ] Test files contain no `fork` substring
- [ ] `not-configured` path proven (zero-secret clone stays replay)
- [ ] Decoupling line-order + key-leak greps wired as CI-checkable steps
- [ ] `nyquist_compliant: true` set after the planner wires per-task `<automated>` fields

**Approval:** approved 2026-06-09 (plan-checker PASS + two-step gate: Reality Checker + Security Engineer both PASS)
