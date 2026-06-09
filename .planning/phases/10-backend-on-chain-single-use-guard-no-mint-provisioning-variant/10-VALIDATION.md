---
phase: 10
slug: backend-on-chain-single-use-guard-no-mint-provisioning-variant
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-08
---

# Phase 10 — Validation Strategy

> Per-phase validation contract. Phase 10 mixes **CI-checkable** signals (the EXEC-01 Foundry unit test, artifact file-greps, tsc) with **operator-manual** transcript signals (the live BuildBear-fork spike) — the latter are NOT CI-runnable by design (secret-gated, 3-day TTL) and must never be claimed on-rhythm (OPS-06).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Foundry forge 1.5.x (backend) + tsc/jq (artifact) |
| **Config file** | `packages/backend/contracts/foundry.toml` |
| **Quick run command** | `forge test --root packages/backend/contracts --no-match-path 'test/**/*[Ff]ork*' --match-path 'test/unit/MacroHedgeExecutor.guard.t.sol'` |
| **Full suite command** | `forge test --root packages/backend/contracts --no-match-path 'test/**/*[Ff]ork*'` |
| **Estimated runtime** | ~5s (guard unit test); ~40s (full secret-free suite) |

---

## Sampling Rate

- **After every task commit:** quick run command (guard unit test, <5s)
- **After every plan wave:** full secret-free suite + `tsc --noEmit` (frontend)
- **Before `/gsd:verify-work`:** full secret-free suite green **AND** `10-SPIKE-EVIDENCE.md` exists with all 4 sections (a–d) recorded
- **Max feedback latency:** ~40s (CI-checkable); operator-manual transcripts are out-of-band

---

## Per-Requirement Verification Map

*(Task IDs assigned by the planner; this is the requirement→signal contract the planner must honor.)*

| Requirement | Behavior | Type | Automated Command / Signal | CI-Checkable | Status |
|-------------|----------|------|----------------------------|--------------|--------|
| EXEC-01 | Shared sink reverts `"fork used"` on 2nd call (via `resolveFromMandate` AND `resolveAndMint`) | Foundry unit | `forge test … --match-path 'test/unit/MacroHedgeExecutor.guard.t.sol'` green; `test_WhenNumberOfLegsIsNonZero*` pass | ✅ YES (secret-free lane) | ⬜ pending |
| EXEC-01 | On-fork redeployed guarded executor reverts 2nd `cast send` | Live-fork transcript | `10-SPIKE-EVIDENCE.md` §(d) shows `"fork used"` revert | ❌ operator-manual | ⬜ pending |
| PROV-01 | `--no-mint` provision → `pool.numberOfLegs(executor) == 0` | Live-fork transcript | `10-SPIKE-EVIDENCE.md` §(a): `cast call` returns `0` | ❌ operator-manual | ⬜ pending |
| PROV-02 | Dedicated signer funded inside snapshot; `evm_revert` restores its gas | Live-fork transcript | `10-SPIKE-EVIDENCE.md` §(b): `cast balance $SIGNER` after revert == funded amount | ❌ operator-manual | ⬜ pending |
| PROV-03 | `evm_snapshot`→`evm_revert` round-trip; fresh `resolveFromMandate` succeeds after revert | Live-fork transcript | `10-SPIKE-EVIDENCE.md` §(b): post-revert mint succeeds | ❌ operator-manual | ⬜ pending |
| PROV-04 | Artifact written to frontend path, `mintTxHash: null` (JSON null, not `""`) | File grep | `jq '.mintTxHash' packages/frontend/lib/apps/abrigo/cornerstone/buildbear-deployments.json` == `null` | ✅ YES (file check) | ⬜ pending |
| PROV-04 | `snapshotId` field present | File grep | `jq '.snapshotId' …/buildbear-deployments.json` == hex string | ✅ YES (file check) | ⬜ pending |
| PROV-04 | `artifact-loader.ts` type accepts `mintTxHash: null` + `snapshotId?` | tsc | `pnpm --filter d2p-frontend tsc --noEmit` passes | ✅ YES (pre-commit + CI) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `packages/backend/contracts/test/unit/MacroHedgeExecutor.guard.t.sol` — EXEC-01 stubs (1st call succeeds; 2nd reverts `"fork used"` via both `resolveFromMandate` and `resolveAndMint`). Name MUST NOT contain `fork` (so it rides the secret-free CI lane). Follow the `MacroHedgeExecutor.onResult.t.sol` subclass/mock pattern.
- [ ] `artifact-loader.ts` TS type migration (`mintTxHash?: string | null`, `snapshotId?: string`) — lands BEFORE the `--no-mint` artifact is written (unblocks Phase 11 `buildbear-reset` `snapshotId` read).
- [ ] `10-SPIKE-EVIDENCE.md` scaffold — operator fills sections (a)–(d) from the live fork run.

*Open risk (from research, MEDIUM): `PanopticPoolV2` may need a fuller mock than a leg counter for the executor ctor — resolve in the Wave-1 guard-test task.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Pre-guard 2nd-mint baseline | EXEC-01 (spike) | Needs a live BuildBear sandbox (secret-gated, 3-day TTL); not CI-reproducible | Provision a throwaway `--no-mint` stack; `cast send resolveFromMandate` twice; record outcome in §(a) |
| Snapshot round-trip | PROV-02/03 | Hosted-fork `evm_snapshot`/`evm_revert` via `cast rpc` against live node | `cast rpc evm_snapshot` → mint → `cast rpc evm_revert` → assert legs==0 + signer gas + fresh mint succeeds; record §(b) |
| Server-sign dry-run | (Phase 11 dep) | viem WalletClient against live fork chain config | dry-run `resolveFromMandate` server-side; record §(c) |
| On-fork post-guard revert | EXEC-01 | Requires the redeployed guarded executor on the live fork | `cast send` 2nd mint → assert `"fork used"`; record §(d) |

---

## Validation Sign-Off

- [ ] Every CI-checkable requirement has an `<automated>` verify or a Wave 0 dependency
- [ ] Operator-manual requirements (PROV-01/02/03, EXEC-01 on-fork) are explicitly transcript-gated in `10-SPIKE-EVIDENCE.md` — never claimed CI-green (OPS-06)
- [ ] Sampling continuity: no 3 consecutive tasks without an automated verify
- [ ] Wave 0 covers the guard test + artifact-loader migration + spike-evidence scaffold
- [ ] No watch-mode flags
- [ ] `nyquist_compliant: true` set after planner wires the per-task `<automated>` fields

**Approval:** pending
