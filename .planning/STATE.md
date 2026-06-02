---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: milestone
status: Base-fork harness GREEN — vm.createSelectFork(base, 46700000) touches the live UniV4 PoolManager via V4StateReader under cancun (FORK-01 fork-run proof); `.tree` BTT spec bulloak-clean
last_updated: "2026-06-02T03:05:00.000Z"
last_activity: 2026-06-02 — completed 07-03-PLAN.md (Base-fork harness)
progress:
  total_phases: 4
  completed_phases: 0
  total_plans: 5
  completed_plans: 3
  percent: 60
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
**Current focus:** Phase 7 executing — Plans 01 (toolchain), 02 (borrowed Panoptic V2 core + `IPanopticData` seam + MockCcop) and 03 (Base-fork harness: pinned-block fork + live PoolManager touch under cancun) complete; next is 07-04 (deploy the cCOP/USDC UniV4 pool, read `sqrtPriceX96`).

## Current Position

- **Milestone:** v2.0 — convex-instrument
- **Phase:** 7 — Base-fork harness + borrowed Panoptic V2 + cCOP/USDC pool (Executing)
- **Plan:** 07-03 complete (3/5); next 07-04
- **Status:** Base-fork harness GREEN — `forge test --match-path test/fork/BaseForkHarness.t.sol --fork-url "$BASE_RPC_URL"` 2/2 at pinned block 46700000; live PoolManager `0x498581…2b2b` touched under cancun via borrowed `V4StateReader` (no v4-periphery state-view path, B-2); `.tree` committed before impl (mn-B)
- **Progress:** [██████░░░░] 60%
- **Last activity:** 2026-06-02 — completed 07-03-PLAN.md

## Decisions Log (v2.0)

- **2026-06-02 (07-01):** Single `cancun`/`0.8.24` profile supersedes FORK-01's roadmap multi-version-solc-matrix wording (07-RESEARCH §5; Panoptic V2 is `^0.8.24` everywhere) — recorded in NOTICE + SUMMARY so the checker does not flag a false gap.
- **2026-06-02 (07-01):** v4-periphery NOT installed and NO v4-periphery remapping (B-2) — its StateView/IStateView pull the undefined `@uniswap/v4-core/` alias + permit2; pool-state reads go via the already-borrowed `V4StateReader` + v4-core `StateLibrary` under the `v4-core/` alias.
- **2026-06-02 (07-01):** `lib/` deps kept OUT of git (gitignored, restorable via `foundry.lock`); reverted a stray prior forge-install submodule registration to match the plan's restore model.
- **2026-06-02 (07-02):** Borrowed V2 internal imports already use the §C `@`-aliases (Plan 01 repointed them at `panoptic-borrowed/`) ⇒ ZERO import rewrites (mn-A confirmed); only third-party prefixes were checked, all matched the §C remapping RHS verbatim. Borrowed via `gh api .../contents?ref=fe55774` raw to keep BUSL/GPL bytes intact.
- **2026-06-02 (07-02):** `IPanopticData` kept to exactly the six §E-verified V2 functions (`dispatch`/`dispatchFrom`-payable/`getAccumulatedFeesAndPositionsData`/`getCurrentTick`/`getTWAP`/`numberOfLegs`); optional `getOracleTicks` deferred to Phase 8. FORK-03 compile-time conformance proof = `forge build` green (interface compiles vs borrowed V2 types), NOT an `IPanopticData(addr)` cast.
- **2026-06-02 (07-02):** Phase 7 lives on branch `feat/keeper-vercel-buildoutput` (07-01 commits reachable only there), not `rescope/somi-leg-donor-transfer` as the prompt/STATE implied; executed + committed 07-02 in place (branching=none).
- **2026-06-02 (07-03):** `BASE_FORK_BLOCK = 46700000` pinned as a Solidity `uint256 constant` in the harness source (M-4, NOT an env var) — archive-verified (`cast code <PoolManager>` = 48020 hex chars at that height; head ≈46789746). PoolManager touched via borrowed `V4StateReader.getSqrtPriceX96(IPoolManager, PoolId)` under cancun — NOT v4-periphery StateView (B-2, not installed). `forge test --fork-url "$BASE_RPC_URL"` 2/2 green = FORK-01 fork-run proof.
- **2026-06-02 (07-03):** bulloak 0.9.2 infers the matching `.t.sol` STRICTLY same-dir as the `.tree` (no subtree search / path flag) ⇒ co-located `BaseForkHarness.tree` + `.t.sol` in `test/fork/` (deviation from the plan's `test/spec/` tree dir) so `bulloak check` exits 0 while the harness stays on the VALIDATION-verbatim `--match-path test/fork/...` path. The pre-existing `test/spec/*.tree` (MacroOracle, SomniaAgentConsumer.*) are un-parseable in 0.9.2 (`/`/`.` in branch text) — out-of-scope for FORK-01, so the full-glob `bulloak check test/spec/*.tree` is NOT a passing gate in this repo.

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
