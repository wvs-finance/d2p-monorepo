---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: convex-instrument
status: defining-requirements
last_updated: "2026-06-01"
progress:
  total_phases: 0
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
---

# Project State: abrigo-somnia v2.0 — Convex Instrument

> **Parallel-track note.** The M1 donor-transfer *econometrics* milestone is **PARKED mid-Phase-3**
> and preserved verbatim at `.planning/STATE-M1-donor-transfer-2026-06-01.md` (resumable). This
> STATE now tracks the **convex-instrument engineering** milestone. M1 calibrates this
> instrument's params (K, k, pricing) later.

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-06-01)

**Core value (this milestone):** A TE-sized long-gamma cCOP/USD hedge on borrowed-Panoptic-data-model contracts, premium with data-cost-weighted reimbursement; post-Keynesian/Shiller-grounded; strict evm-tdd.
**Current focus:** Defining requirements (research-first, scoped to the build).

## Current Position

- **Milestone:** v2.0 — convex-instrument
- **Phase:** Not started (defining requirements)
- **Plan:** —
- **Status:** Researching the build (Stack / Architecture / Pitfalls), then requirements
- **Last activity:** 2026-06-01 — milestone started; M1 snapshotted

## Accumulated Context

- **Built + proven (this session, on master):** `SomniaAgentConsumer` + `SomniaProbe` + `MacroOracle` — live on Somnia testnet (`fetchUint` 775 / `fetchInt` −84); keeper-proxy live on Vercel (key-hidden, deployed via CI).
- **Research:** `research/macro-markets-colombia/{RESEARCH,FEASIBILITY-v1,INSTRUMENT-v1}.md`; `DRAFT.md`; `MATH.md`.
- **Feasibility verdict (FEASIBLE-WITH-CHANGES):** Panoptic has no upfront premium → upfront collateral; streamia settles lazily at burn (not per-block); delta-hedge is an external keeper; no Celo Panoptic pool → borrow the data model into our own contracts.
- **Deployer wallet (testnet):** `0xF3c30FBe0D987116BE592E7c62626b5F4Df90a90` (~99 STT; key in gitignored `contracts/.env`).
