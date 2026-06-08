---
phase: 9
slug: premium-split-data-cost-reimbursement
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-02
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Source: `09-RESEARCH.md` § Validation Architecture (Foundry fuzz + fork + BTT).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Foundry `forge` (fuzz + invariant + fork) + `bulloak` 0.9.2 (BTT scaffolding) |
| **Config file** | `contracts/foundry.toml` — `cancun` / `0.8.24`, non-viaIR, optimizer 200; `[invariant]` runs=16, depth=16, fail_on_revert=false (L25-28) |
| **Quick run command** | `cd contracts && forge test --match-path "test/instrument/{PremiumSplitter,CapitalRemunerationVault,DataCostConservation}*.t.sol"` (FEE-01/02 + conservation are local — NO fork) |
| **Full suite command** | `cd contracts && forge test --fork-url "$BASE_RPC_URL"` (incl. Phase-7/8 unregressed) |
| **Estimated runtime** | ~30–60s local (fuzz/invariant); fork test adds ~20–40s (Alchemy-bound, 429-flaky) |

---

## Sampling Rate

- **After every task commit:** Run that unit's `forge test --match-path` + `bulloak check test/instrument/<unit>.tree` + the P5 grep-guard (`grep -c '199' src/instrument/HedgeDataMeter.sol` and the wrapper → `== 0`)
- **After every plan wave:** Run quick command (local FEE-01/02 + conservation) + the FEE-03 fork test
- **Before `/gsd:verify-work`:** Full suite green (incl. Phase-7/8 unregressed) + every per-file `bulloak check` exit 0 + `invariant_dataCostConserved` passing + FEE-01/02 fuzz invariants at CI fuzz floor + P5 grep-guard == 0
- **Max feedback latency:** ~60s local; fork test run with backoff (RPC 429 caution, STATE 08-07)

---

## Per-Task Verification Map

> Task IDs are provisional (planner finalizes plan/wave split). Test files are committed BEFORE their impl (Iron Law / BTT).

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 09-01-* | 01 | 0/1 | (units/FX) | decision | units/FX option locked in plan text before any cost line | ❌ W0 | ⬜ pending |
| 09-02-* | 02 | 1 | FEE-01 | fuzz (local) | `forge test --match-test invariant_premiumSplitConserved` (or `testFuzz_split_sumEqualsPremium`) | ❌ W0 | ⬜ pending |
| 09-03-* | 03 | 1 | FEE-02 | fuzz (local) | `forge test --match-test "testFuzz_vault_*"` | ❌ W0 | ⬜ pending |
| 09-04-* | 04 | 2 | FEE-02/03 | invariant (local) | `forge test --match-test invariant_dataCostConserved` | ❌ W0 | ⬜ pending |
| 09-05-* | 05 | 2 | FEE-03 | fork unit | `forge test --match-test test_meteredResidual_* --fork-url "$BASE_RPC_URL"` | ❌ W0 | ⬜ pending |
| 09-06-* | (any meter/wrapper) | 1–2 | P5 process | grep-guard | `grep -c '199' src/instrument/HedgeDataMeter.sol` → `0` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/instrument/PremiumSplitter.sol` — FEE-01 decomposition (`π_panoptic + μ_LP + φ_data`) with `mulDiv` remainder sink (no dust)
- [ ] `src/instrument/CapitalRemunerationVault.sol` — `is ERC4626`, the mutualized $199 line + per-premium φ_data donation-inflow recoupment
- [ ] `src/instrument/HedgeDataMeter.sol` — `is IHedgeMeter` (implements the FROZEN `ICostMeter`); per-position incremental ONLY; `199` constant must NOT appear
- [ ] `src/instrument/interfaces/IHedgeMeter.sol` — the HEDGE-01 drop-in write-side (`recordHedgeFill(position, incr0, incr1)`)
- [ ] Four `.tree` + `.t.sol` pairs — `PremiumSplitter`, `CapitalRemunerationVault`, `DataCostConservation`, `LongGammaWrapper.meteredResidual` — each committed BEFORE its impl; the conservation file names `invariant_dataCostConserved` BY HAND
- [ ] A conservation `Handler` driving BOTH ledgers (mutualized vault + per-position meter), non-vacuous (mutation: zeroing either accumulator ⇒ fail)
- [ ] Units/FX decision locked (Open Question 1) — Option A (USD-scalar) or B (per-token, recommended) — BEFORE any cost line is written
- [ ] Framework install: **none** — `forge` + `bulloak` 0.9.2 + OZ 5.0.2 (vendored, reachable via `@openzeppelin/`) already present

*Phase-9 deploys a concrete meter on a FRESH wrapper — `LongGammaWrapper.sol` is NOT edited, so the 30/30 + 2/2 Phase-8 fork suite stays green.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Units/FX narrative coherence ($199 USD vs two-token native dp) | FEE-02/03 | Choice is a design decision, not a machine-checkable property | Reviewer confirms the locked option (A or B) is applied consistently and every cost line carries a `{value, unit, fx}` column (ROADMAP SC-3) |

*All conservation, split, vault, and residual behaviors have automated verification.*

---

## Validation Sign-Off

- [ ] All tasks have an automated `forge`/`bulloak`/`grep` verify or a Wave 0 dependency
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (4 source files + 4 test pairs + handler + interface)
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s local
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
