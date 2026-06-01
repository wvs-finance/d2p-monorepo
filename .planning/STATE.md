---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: convex-instrument
status: roadmap-complete
last_updated: "2026-06-01"
progress:
  total_phases: 4
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  first_phase: 7
  last_phase: 10
---

# Project State: abrigo-somnia v2.0 — Convex Instrument

> **Parallel-track note.** The M1 donor-transfer *econometrics* milestone is **PARKED mid-Phase-3**
> and preserved verbatim at `.planning/{STATE,ROADMAP,REQUIREMENTS}-M1-donor-transfer-2026-06-01.md`
> (resumable; M1 phase folders `phases/01..03/` untouched). This STATE now tracks the
> **convex-instrument engineering** milestone (phases 7–10; numbering starts at 7 to avoid
> collision with the existing `phases/01..03/` on disk). M1 later calibrates this instrument's
> params (K, k, σ_CPI, the CPI→FX coefficient). Do NOT edit the M1 snapshots.

## Project Reference

See: `.planning/PROJECT.md` (§ Current Milestone: v2.0, updated 2026-06-01)

**Core value (this milestone):** A TE-sized long-gamma cCOP/USD hedge on borrowed-Panoptic-V2-data-model
contracts (Base fork against our own cCOP/USDC UniV4 pool); premium = upfront collateral with
data-cost-weighted reimbursement; post-Keynesian/Shiller-grounded; strict evm-tdd.
**Current focus:** Roadmap complete — ready to plan Phase 7 (`/gsd:plan-phase 7`).

## Current Position

- **Milestone:** v2.0 — convex-instrument
- **Phase:** 7 — Base-fork harness + borrowed Panoptic V2 + cCOP/USDC pool (Not started)
- **Plan:** —
- **Status:** Roadmap written; awaiting phase planning (Phase 7 first)
- **Progress:** 0/4 phases complete `[░░░░] 0%`
- **Last activity:** 2026-06-01 — v2.0 roadmap created (phases 7–10); M1 roadmap snapshotted

## Roadmap Summary (v2.0)

| Phase | Goal | Requirements | Depends on |
|---|---|---|---|
| **7. Base-fork harness + borrowed Panoptic V2 + pool** | Foundry Base-fork (UniV4 PoolManager), borrowed Panoptic-V2-lite behind `IPanopticData`, our own cCOP/USDC UniV4 demo pool, BUSL NOTICE + bulloak | FORK-01, FORK-02, FORK-03 | — (first) |
| **8. LongGammaWrapper cash-flow** | Wrapper owns the position; deposit collateral → mint long-gamma → streamia accrues (read from contract) → burn → residual from surviving collateral, all involuntary-close branches | WRAP-01, WRAP-02, WRAP-03, WRAP-04 | Phase 7 |
| **9. Premium split + data-cost reimbursement** | `PremiumSplitter` (π_panoptic + μ_LP + φ_data) + ERC-4626 `CapitalRemunerationVault` (mutualized $199) + no-double-count conservation invariant + data-cost-weighted residual | FEE-01, FEE-02, FEE-03 | Phase 8 |
| **10. Oracle surprise route + position sizing** | `MacroOracle` CPI surprise (consensus + σ → `s_t`); `PositionBuilder` sizes notional/strike, `linkage_validated:false` | SIZE-01, SIZE-02 | Phase 8 (oracle modify can parallelize) |

**Deferred (no active phase):** PAY-01 (x402 entry), XCHAIN-01 (Reactive cross-chain), HEDGE-01 (live delta-hedge).
**Coverage:** 12/12 v1 requirements mapped, 0 orphans.

## Process Gates (carry into every phase)

- **evm-tdd `.tree`-before-impl** per phase; named fuzz invariants (`invariant_userClaimsBackedByCollateral`,
  `invariant_residualNeverExceedsHoldings`, `invariant_dataCostConserved`) with a fixed CI fuzz-run floor.
- **Three-step planning-review gate** (CLAUDE.md): every phase PLAN passes Studio-Producer selection →
  Reality Checker + selected domain reviewer → verdict gate, before execution.
- **BUSL NOTICE**: borrowed Panoptic V2 files retain their header; repo NOTICE documents provenance;
  v2 strictly fork/non-production.

## Accumulated Context

- **Built + proven (this session, on master):** `SomniaAgentConsumer` + `SomniaProbe` + `MacroOracle` —
  live on Somnia testnet (`fetchUint` 775 / `fetchInt` −84); keeper-proxy live on Vercel (key-hidden, via CI).
- **Research (v2.0):** `research/v2-convex-instrument/{SUMMARY,STACK,ARCHITECTURE,PITFALLS}.md`;
  earlier `research/macro-markets-colombia/{RESEARCH,FEASIBILITY-v1,INSTRUMENT-v1}.md`; `DRAFT.md`; `MATH.md`.
- **Decisive pivot (2026-06-01):** Panoptic V2 (UniV4), not V1 (EOL); Base fork (not Celo) with our own
  cCOP/USDC UniV4 demo pool; BUSL-1.1 non-blocker because demo/testnet only (NOTICE).
- **Honest constraints:** borrowed data model (own contracts behind `IPanopticData`, swap-to-canonical-V2
  later); streamia READ from the contract, never re-derived; deposit is upfront COLLATERAL (over-funded cap),
  residual from surviving collateral at actual close (forceExercise/settleLongPremium/liquidation branches);
  two disjoint data costs (mutualized φ_data vs per-position hedge metering) under a conservation invariant;
  CPI→FX linkage `linkage_validated:false` (M1 calibrates later); delta-hedge is a stubbed external keeper in v1.
- **Deployer wallet (testnet):** `0xF3c30FBe0D987116BE592E7c62626b5F4Df90a90` (key in gitignored `contracts/.env`).

## Session Continuity

- **Next action:** `/gsd:plan-phase 7` (PLAN must pass the three-step planning-review gate before execution).
- **Files:** `.planning/ROADMAP.md` (v2.0), `.planning/REQUIREMENTS.md` (v1 reqs + traceability),
  `.planning/PROJECT.md` (§ Current Milestone: v2.0).
- **Do not touch:** the `*-M1-donor-transfer-2026-06-01.md` snapshots, the `phases/01..03/` M1 folders.
