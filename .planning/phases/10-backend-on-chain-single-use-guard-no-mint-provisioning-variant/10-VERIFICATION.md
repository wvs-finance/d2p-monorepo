---
phase: 10-backend-on-chain-single-use-guard-no-mint-provisioning-variant
verified: 2026-06-09T12:47:09Z
status: human_needed
score: 5/5 must-haves verified (CI-checkable code GREEN; PROV-02/03/EXEC-01-on-fork rest on operator transcripts that need human confirmation)
re_verification:
  previous_status: none
  note: initial verification
human_verification:
  - test: "Confirm the live BuildBear §(b) snapshot round-trip transcript in 10-SPIKE-EVIDENCE.md (lines 197-204) was a real on-chain run, not a hand-typed paste"
    expected: "legs before revert: 2; evm_revert 0x1 -> true; legs after revert: 0; signer balance 1e24 restored; post-revert mint succeeds"
    why_human: "PROV-02/PROV-03 are operator-manual, secret-gated (DEMO_SIGNER_PK + BuildBear RPC), 3-day-TTL live-fork signals — excluded from CI by design (OPS-06). Cannot be re-run in the secret-free verifier lane; only a human/operator can attest the transcript is genuine."
  - test: "Confirm the EXEC-01 §(d) on-fork 'fork used' revert transcript (lines 191-195) came from the redeployed GUARDED executor 0xE1903A4c… on the live fork"
    expected: "1st resolveFromMandate succeeds (MINT_1_OK); 2nd reverts exactly 'fork used' (MINT_2_REVERT_REASON: fork used)"
    why_human: "On-fork live-tx evidence is transcript-gated, not CI-runnable. The keyless mutation test proves the guard is non-vacuous in-suite, but the ON-CHAIN proof can only be human-attested."
  - test: "Update REQUIREMENTS.md checkbox + coverage state for PROV-02 / PROV-03 to reflect the recorded live evidence"
    expected: "PROV-02 and PROV-03 flipped from [ ]/Pending to [x]/Complete (their §(b) transcript is recorded), OR an explicit note that they remain Pending until the pre-judge re-provision (snapshot 0x1 was consumed)"
    why_human: "Bookkeeping drift: the live transcript exists but the requirement checkboxes/table still read Pending. A human must decide whether 'recorded-but-snapshot-consumed' counts as Complete for the milestone ledger."
---

# Phase 10: Backend On-Chain Single-Use Guard + `--no-mint` Provisioning Variant — Verification Report

**Phase Goal:** Backend foundation for the judge-runnable live demo — (1) EXEC-01 on-chain single-use guard in the shared sink `_resolveAndMintAtStrike` (reverts `"fork used"` before any dispatch); (2) a `--no-mint` provisioning variant (fresh executor `numberOfLegs==0`, dedicated `DEMO_SIGNER_PK` funded inside an `evm_snapshot`, artifact written to the frontend path with `mintTxHash:null` + `snapshotId`); (3) an operator-manual live-fork spike proving it on-chain. NOT CI-verifiable end-to-end — live parts are transcript-gated.

**Verified:** 2026-06-09T12:47:09Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #   | Truth | Status | Evidence |
| --- | ----- | ------ | -------- |
| 1   | EXEC-01 guard reverts `"fork used"` when `numberOfLegs != 0`, in the shared sink, before any `pool.dispatch` | ✓ VERIFIED | `MacroHedgeExecutor.sol:370` `require(pool.numberOfLegs(address(this)) == 0, "fork used")` inside `_resolveAndMintAtStrike` (fn opens :357), above first `pool.dispatch` (:406). Guard test 3/3 PASS; full secret-free suite 97/97 PASS. |
| 2   | A `--no-mint`/`SKIP_MINT` provisioning variant deploys a fresh executor with `numberOfLegs==0` | ✓ VERIFIED | `ProvisionBuildBearDemo.s.sol:129-147` gates `_mint(r)` behind `vm.envOr("SKIP_MINT", false)`; shell `--no-mint` exports `SKIP_MINT=true` (:117-118). Live: fresh executor `0xE1903A4c…`, `numberOfLegs==0` (SPIKE §AUTOMATED). |
| 3   | Dedicated `DEMO_SIGNER_PK` (≠ deployer) funded INSIDE the captured snapshot | ⚠ HUMAN | Shell funds `SIGNER_EOA` via `hardhat_setBalance` BEFORE `evm_snapshot` (sh:142-152); refuses deployer fallback (:70-71). Live balance `1e24` restored after revert — but this is a transcript signal (PROV-02), not CI-runnable. |
| 4   | `evm_snapshot` captured before mint; `evm_revert` round-trip restores clean state | ⚠ HUMAN | Snapshot captured after deploy/fund, before mint (sh:152). Live §(b): `evm_revert 0x1 -> true`, `legs 2→0`, signer gas restored, post-revert mint succeeds — transcript signal (PROV-03), not CI-runnable. |
| 5   | Artifact written to frontend path with `mintTxHash:null` + `snapshotId`, retiring the poisoned executor | ✓ VERIFIED | `jq` on `buildbear-deployments.json`: `mintTxHash=null`, `snapshotId="0x1"`, executor `0xE1903A4c…` ≠ poisoned `0xa95Ffdf…`. Shell writes via MONO_ROOT anchor (:174-204) with `--argjson mintTxHash null`. |
| 6   | On-fork live proof that the GUARDED executor reverts `"fork used"` on 2nd resolve | ⚠ HUMAN | SPIKE §(d) transcript: `MINT_1_OK` / `MINT_2_REVERT_REASON: fork used` on `0xE1903A4c…`. Transcript-gated (EXEC-01 on-fork), not CI-runnable. |

**Score:** 5/5 CI-checkable must-haves VERIFIED. 3 truths (3, 4, 6) additionally rest on operator-manual live-fork transcripts that are excluded from CI by design and need human attestation.

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `packages/backend/contracts/src/MacroHedgeExecutor.sol` | EXEC-01 guard in shared sink before dispatch | ✓ VERIFIED | Guard at :370 in `_resolveAndMintAtStrike`, before `pool.dispatch` :406. No anti-patterns. |
| `packages/backend/contracts/test/unit/MacroHedgeExecutor.guard.t.sol` | RED→GREEN guard test, fork-free name, secret-free lane | ✓ VERIFIED | Exists; no `fork` in name; 3/3 PASS; rides `--no-match-path '*[Ff]ork*'` lane. |
| `packages/backend/contracts/script/ProvisionBuildBearDemo.s.sol` | `SKIP_MINT` gate, `_mint()` extracted | ✓ VERIFIED | `_mint(ProvisionResult)` gated by `vm.envOr("SKIP_MINT")` at :129-147. `forge build` clean (suite compiles). |
| `packages/backend/contracts/script/provision-buildbear-demo.sh` | `--no-mint` variant: fund-before-snapshot, receipt-gated, frontend write | ✓ VERIFIED | `--no-mint` flag, signer funded before snapshot (:142-152), receipt parse gated (:162), MONO_ROOT-asserted frontend write with null mintTxHash (:174-204). |
| `packages/frontend/lib/apps/abrigo/cornerstone/artifact-loader.ts` | nullable mint fields + optional snapshotId + exported `validateDeployment` | ✓ VERIFIED | `mintTxHash: string\|null` (:26), `mintedStrike: number\|null` (:27), `snapshotId?: string` (:33), `export function validateDeployment` (:40). tsc 0. |
| `packages/frontend/lib/apps/abrigo/cornerstone/buildbear-deployments.json` | null mint, hex snapshotId, fresh executor | ✓ VERIFIED | `mintTxHash:null`, `snapshotId:"0x1"`, executor `0xE1903A4c…` ≠ poisoned. |
| `packages/frontend/tests/unit/cornerstone/artifact-null-roundtrip.test.ts` | null-fixture round-trips exported validator | ✓ VERIFIED | 4/4 vitest PASS. |
| `packages/frontend/scripts/spike-viem-sign.ts` | type-checked viem simulate-only dry-run (Phase 11 dep) | ✓ VERIFIED | Present; tsc 0. Live standalone run is a Phase 11 dependency (§(c)). No anti-patterns. |
| `10-SPIKE-EVIDENCE.md` | operator-manual transcripts §(a)-(d) | ⚠ PARTIAL | Consolidated "AUTOMATED LIVE-RUN EVIDENCE" section (lines 182-206) carries the real on-chain results + Sign-off (b)/(d) `[x]`. The per-section scaffold `**Status:** [ ]` boxes (lines 50/82/118/141) were left unchecked — cosmetic; the evidence lives in the consolidated block. |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | -- | --- | ------ | ------- |
| `_resolveAndMintAtStrike` | `pool.numberOfLegs` | `require(...=="fork used")` before dispatch | ✓ WIRED | Guard at :370 dereferences the pool view on every sink entry, ahead of :406 dispatch. |
| `run()` | `_mint()` | `if (!vm.envOr("SKIP_MINT", false))` | ✓ WIRED | Mint extracted and gated; default path unchanged. |
| `provision…sh --no-mint` | `evm_snapshot` | signer funded via `hardhat_setBalance` BEFORE snapshot | ✓ WIRED (code) / ⚠ live=human | Ordering correct in shell; in-snapshot funding proven only by PROV-02 transcript. |
| `provision…sh` | frontend `buildbear-deployments.json` | MONO_ROOT anchor + `jq --argjson mintTxHash null` | ✓ WIRED | Direct write to frontend path; anchor runtime-asserted. |
| `buildbear-deployments.json` | `validateDeployment` | static import + validator at module load | ✓ WIRED | `deployment = validateDeployment(rawDeployment)` (:67); null-fixture round-trip 4/4. |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ----------- | ----------- | ------ | -------- |
| EXEC-01 | 10-01 (RED), 10-02 (insert) | `"fork used"` guard in shared sink before dispatch | ✓ SATISFIED (code) / ⚠ on-fork=human | Guard :370; 3/3 + 97/97 GREEN; mutation-proven non-vacuous; on-fork §(d) transcript needs human attestation. REQUIREMENTS.md `[x]`. |
| PROV-01 | 10-02 | `--no-mint`/`SKIP_MINT` deploys fresh executor `numberOfLegs==0` | ✓ SATISFIED | Gate in script+shell; live fresh executor `numberOfLegs==0`. REQUIREMENTS.md `[x]`. |
| PROV-02 | 10-02 (code), 10-03 (live) | dedicated signer funded inside snapshot | ⚠ NEEDS HUMAN | Shell ordering correct; live in-snapshot funding is transcript-gated. **REQUIREMENTS.md still `[ ]` / table "Pending".** |
| PROV-03 | 10-02 (code), 10-03 (live) | snapshot before mint; `evm_revert` round-trip restores state | ⚠ NEEDS HUMAN | Snapshot capture correct; round-trip is §(b) transcript. **REQUIREMENTS.md still `[ ]` / table "Pending".** |
| PROV-04 | 10-01 (types), 10-02 (write) | frontend artifact `mintTxHash:null` (not `""`) | ✓ SATISFIED | `jq` confirms null + snapshotId + fresh executor. REQUIREMENTS.md `[x]`. |

No orphaned requirements: REQUIREMENTS.md maps exactly EXEC-01 + PROV-01..04 to Phase 10, all claimed by plans 10-01/02/03.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| (none) | — | — | — | No TODO/FIXME/placeholder/stub patterns in any phase-modified source file. |
| `10-SPIKE-EVIDENCE.md` | 50/82/118/141 | per-section `Status: [ ]` scaffold boxes left unchecked | ℹ Info | Cosmetic — the real transcripts are in the consolidated "AUTOMATED LIVE-RUN EVIDENCE" block and the Sign-off checklist marks (b)/(d) `[x]`. |
| `REQUIREMENTS.md` | 29/30/103/104 | PROV-02/03 still `[ ]` / "Pending" despite recorded live evidence | ⚠ Warning | Ledger drift — bookkeeping, not a code gap. Flagged for human reconciliation. |

### Human Verification Required

The three live-fork signals are excluded from CI by design (OPS-06 governance: live BuildBear spike is operator-manual, secret-gated, never claimed on-rhythm). They are transcript-recorded in `10-SPIKE-EVIDENCE.md` but cannot be re-executed in the secret-free verifier lane:

1. **§(b) snapshot round-trip (PROV-02/PROV-03)** — confirm the recorded `legs 2→0`, `evm_revert 0x1 -> true`, signer balance `1e24` restored, and post-revert mint were a genuine on-chain run.
2. **§(d) on-fork `"fork used"` revert (EXEC-01)** — confirm `MINT_1_OK` / `MINT_2_REVERT_REASON: fork used` on the redeployed guarded executor `0xE1903A4c…`.
3. **REQUIREMENTS.md ledger** — reconcile PROV-02/03 checkbox + coverage table against the recorded evidence (note: snapshot `0x1` was consumed by the round-trip; a pre-judge `--no-mint` re-provision is required per OPS-03/04).

### Gaps Summary

No code gaps. Every CI-checkable must-have is GREEN and substantive:
- EXEC-01 guard is present in the shared sink, before dispatch, mutation-proven non-vacuous; guard test 3/3 and full secret-free suite 97/97 PASS.
- The `--no-mint` provisioning variant (SKIP_MINT gate, fund-before-snapshot ordering, MONO_ROOT-anchored frontend write) is correct in code.
- The frontend artifact carries `mintTxHash:null` + `snapshotId:"0x1"` + a fresh executor (≠ poisoned `0xa95Ffdf…`); nullable types and `validateDeployment` export are tsc-green and round-trip 4/4.
- All Phase 10 commits (`a02e444`, `e58e1ce`, `2cf5f45`, `19b5ff9`, `6a7eea7`, `7e52fef`, `73cc271`, `5a25cd0`) are present in git history.

The only items not closeable by the verifier are the **operator-manual live-fork transcripts** (PROV-02/03 and EXEC-01 on-fork), which are transcript-gated by design and recorded — these need human attestation, not new work. A minor ledger drift (PROV-02/03 still `[ ]`/Pending in REQUIREMENTS.md despite recorded evidence) should be reconciled by the operator.

---

_Verified: 2026-06-09T12:47:09Z_
_Verifier: Claude (gsd-verifier)_
