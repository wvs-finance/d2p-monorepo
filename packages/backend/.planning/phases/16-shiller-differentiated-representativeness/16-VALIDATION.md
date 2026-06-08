---
phase: 16
slug: shiller-differentiated-representativeness
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-07
---

# Phase 16 — Validation Strategy

> Derived from `16-RESEARCH.md` § Validation Architecture. SHILLER-01 = the Agent-2 brain branches on the economic school (a Shiller surprise-convex geometry distinct from PKE); SHILLER-02 = a whole-workflow integration suite. **POST_KEYNESIAN behavior is a REGRESSION ANCHOR — it must stay byte-identical (the Phase-14 fork mint at strike 360360 still green).** POST-cornerstone-MVP.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Foundry `forge-std` Test + `bulloak 0.9.2` BTT (`.tree` specs) |
| **Config file** | `contracts/foundry.toml` |
| **Quick run (pure-lib SHILLER fns, no fork)** | `cd contracts && forge test --match-path 'test/instrument/ShillerRepresentativeness*' -vvv` |
| **Whole-workflow suite** | `cd contracts && forge test --match-path 'test/instrument/MacroWorkflow*' -vvv` |
| **Full suite** | `cd contracts && forge test` (fork leaves need `ALCHEMY_API_KEY` in gitignored `contracts/.env`; `onlyForked`-gated) |
| **Estimated runtime** | pure-lib < 1s · fork leaves ~60–120s (RPC-cached) |

---

## Sampling Rate
- **Per task commit:** the relevant `--match-test` quick run (pure SHILLER lib fns are sub-second, no fork) + `forge build`.
- **Per wave merge:** `forge test` full suite (with `ALCHEMY_API_KEY` for the fork leaves).
- **Before `/gsd:verify-work`:** full suite green — the PKE 360360 mint UNCHANGED (regression anchor) AND the SHILLER differentiation proven.
- **Max feedback latency:** ~120s (the fork leaves); the pure-lib SHILLER unit leaves are the per-commit signal.

---

## Per-Task Verification Map

> Every plan task maps to a row (zero orphans both directions). "✅" = an existing green test the wave must not regress; "❌ W0" = a Wave-0 gap.

| Req | Behavior (testable claim) | Test Type | Automated Command | Status |
|-----|---------------------------|-----------|-------------------|--------|
| SHILLER-01 | `shillerSurprise` computes `(actual−consensus)/σ` in WAD | unit | `forge test --match-test test_shillerSurprise_wadMath` | ⬜ |
| SHILLER-01 | convex size monotone in `\|s\|`, exact integer outputs, clamped `[1,127]` (TEMPLATE SCALE=10,k=0.5 → [1,122] over ±4σ) | unit | `forge test --match-test test_shillerOptionRatio_convexMonotone` | ⬜ |
| SHILLER-01 | sign-driven strike: s>0 → tick > 360360 (depreciation); s<0 → tick < 360360; ALL ×60-aligned | unit | `forge test --match-test test_shillerStrike_signDrivenAligned` | ⬜ |
| SHILLER-01 | width grows with `\|s\|`, EVEN-snapped (the even-width invariant) | unit | `forge test --match-test test_shillerWidth_evenMonotone` | ⬜ |
| SHILLER-01 | surprise oracle stale/unset → s=0 minimal stance (fail-safe; SHILLER-specific staleness window, NOT PKE's 1h) | unit | `forge test --match-test test_shillerStaleness_minimalStance` | ⬜ |
| SHILLER-01 | branch: SHILLER mandate mints a DIFFERENT strike than PKE for the same input | fork | `forge test --match-test test_branch_shillerDiffersFromPke` | ⬜ |
| SHILLER-01 | per-school TEMPLATE honesty on `ExecutorDecided` (Shiller=UNVALIDATED-empirical vs PKE; both nonErgodicDisclosed) | fork | `forge test --match-test test_executorDecided_perSchoolHonesty` | ⬜ |
| SHILLER-01 (regression) | PKE mandate STILL mints exact **360360**, rationale unchanged | fork | `forge test --match-test test_resolveFromMandate_mintsThroughExecutor` | ✅ `DemoMacroHedgeExecutor.fork.t.sol:446` |
| SHILLER-01 (regression) | Phase-14 unit suite un-regressed | unit | `forge test --match-path 'test/instrument/Representativeness.t.sol'` (17/17) | ✅ |
| SHILLER-02 | whole-workflow: Agent-1 school → mandate → Agent-2 mint, 4 scenarios × 2 schools | fork+VM | `forge test --match-path 'test/instrument/MacroWorkflow*'` | ⬜ |
| SHILLER-02 | same scenario → DIFFERENT strike/width/size by school | fork | `forge test --match-test test_workflow_sameInputDifferentGeometry` | ⬜ |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements
- [ ] `contracts/src/interfaces/ISurpriseOracle.sol` — NEW (mirror `IRegimeOracle`: actual/consensus/σ + observedAt + staleness).
- [ ] `contracts/test/mocks/MockSurpriseOracle.sol` — NEW (mirror `MockRegimeOracle`; settable).
- [ ] `RepresentativenessLib` SHILLER fns (`shillerSurprise`, convex size, sign-driven strike, width∝|s|) + TEMPLATE constants (`SHILLER_RATIO_SCALE`, `k`, σ-multiple OTM, SHILLER staleness window) — added to `Representativeness.sol`; PKE fns untouched.
- [ ] `MacroHedgeExecutor` ctor 10-arg migration (add `ISurpriseOracle`) — the SAME 5 ctor sites the Phase-14 regime-oracle add touched (enumerated in 16-RESEARCH); ONE compiling commit.
- [ ] `resolveFromMandate` branch on `mandate.economicTheory` (SHILLER arm / PKE `else` byte-identical).
- [ ] `contracts/test/instrument/ShillerRepresentativeness.tree` + `.t.sol` — BTT spec + the SHILLER-01 unit suite.
- [ ] `contracts/test/instrument/MacroWorkflow.tree` + `.fork.t.sol` — the SHILLER-02 whole-workflow suite (Agent-1 in-VM + Agent-2 fork).
- [ ] Framework install: none — Foundry + bulloak already in use.

*Iron Law: each new `.tree` + its failing test committed FIRST (separate commit), ancestry-verified.*

---

## Manual-Only / Documented Caveats
| Behavior | Requirement | Why not automated | Handling |
|----------|-------------|-------------------|----------|
| CPI-surprise → FX-move magnitude | SHILLER-01 | An UNVALIDATED empirical assumption (FEASIBILITY-v1) — the phase proves STRUCTURE, not magnitude | All constants TEMPLATE-labeled; `ExecutorDecided` rationale states it; no test asserts a real magnitude |
| Live CPI/consensus/σ feed | (deferred) | No live DANE/BanRep-EME oracle wired (XCHAIN-01 deferred) | v1 = `MockSurpriseOracle`; live feed is a future phase |
| Downside (appreciation, K_lo) strike fork-mint safety | SHILLER-01 | The existing `InputListFail` proof covers only the K_hi side | **Planner must resolve:** add a fork-mint check for the s<0 (K_lo) side, OR scope v1 to depreciation-only (s≤0 → minimal stance) with downside documented as a stretch |

---

## Validation Sign-Off
- [ ] Every plan task maps to a row (zero orphans, both directions)
- [ ] Sampling continuity: no 3 consecutive tasks without an automated verify (the pure-lib SHILLER leaves cover this)
- [ ] Wave 0 covers all MISSING references (ISurpriseOracle, MockSurpriseOracle, the SHILLER fns, the ctor migration, the two new suites)
- [ ] The PKE regression anchor (360360 mint + 17/17 unit) is asserted un-regressed
- [ ] No watch-mode flags
- [ ] `nyquist_compliant: true` set after planner alignment

**Approval:** pending
