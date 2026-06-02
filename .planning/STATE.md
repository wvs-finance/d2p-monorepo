---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: milestone
status: cCOP/USDC UniV4 pool LIVE on the Base fork (FORK-02 GREEN) — `PoolManager.initialize` at sqrtPriceX96 ~1/4000 + 1,000,000-ether full-range LP via a minimal IUnlockCallback helper; consumer reads `sqrtPriceX96>0` (V4StateReader) + `liquidity>0` (StateLibrary) and round-trips the rate to ~4000 ∈ [3000,5000]; `test_ccopUsdcPool_initialized_state_readable` passes; `.tree` committed before impl (mn-B)
last_updated: "2026-06-02T03:30:00.000Z"
last_activity: 2026-06-02 — completed 07-04-PLAN.md (cCOP/USDC pool deploy + state read)
progress:
  total_phases: 4
  completed_phases: 0
  total_plans: 5
  completed_plans: 4
  percent: 80
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
**Current focus:** Phase 7 executing — Plans 01 (toolchain), 02 (borrowed Panoptic V2 core + `IPanopticData` seam + MockCcop), 03 (Base-fork harness) and 04 (our own cCOP/USDC UniV4 pool: initialize + full-range LP + state read, FORK-02) complete; next is 07-05 (seam test: `factory.deployNewPool` against the initialized+seeded pool, then non-reverting `dispatch`/`getAccumulatedFeesAndPositionsData` via `IPanopticData`).

## Current Position

- **Milestone:** v2.0 — convex-instrument
- **Phase:** 7 — Base-fork harness + borrowed Panoptic V2 + cCOP/USDC pool (Executing)
- **Plan:** 07-04 complete (4/5); next 07-05
- **Status:** cCOP/USDC UniV4 pool LIVE on the Base fork (FORK-02 GREEN) — `PoolManager.initialize` at sqrtPriceX96 ~1/4000 + 1,000,000-ether full-range LP via a minimal `IUnlockCallback`→`modifyLiquidity` helper; consumer reads `sqrtPriceX96>0` (V4StateReader) + `liquidity>0` (StateLibrary) and round-trips the decoded rate to ~4000 ∈ [3000,5000]; `test_ccopUsdcPool_initialized_state_readable` passes; bulloak clean; `.tree` committed before impl (mn-B)
- **Progress:** [████████░░] 80%
- **Last activity:** 2026-06-02 — completed 07-04-PLAN.md

## Decisions Log (v2.0)

- **2026-06-02 (07-01):** Single `cancun`/`0.8.24` profile supersedes FORK-01's roadmap multi-version-solc-matrix wording (07-RESEARCH §5; Panoptic V2 is `^0.8.24` everywhere) — recorded in NOTICE + SUMMARY so the checker does not flag a false gap.
- **2026-06-02 (07-01):** v4-periphery NOT installed and NO v4-periphery remapping (B-2) — its StateView/IStateView pull the undefined `@uniswap/v4-core/` alias + permit2; pool-state reads go via the already-borrowed `V4StateReader` + v4-core `StateLibrary` under the `v4-core/` alias.
- **2026-06-02 (07-01):** `lib/` deps kept OUT of git (gitignored, restorable via `foundry.lock`); reverted a stray prior forge-install submodule registration to match the plan's restore model.
- **2026-06-02 (07-02):** Borrowed V2 internal imports already use the §C `@`-aliases (Plan 01 repointed them at `panoptic-borrowed/`) ⇒ ZERO import rewrites (mn-A confirmed); only third-party prefixes were checked, all matched the §C remapping RHS verbatim. Borrowed via `gh api .../contents?ref=fe55774` raw to keep BUSL/GPL bytes intact.
- **2026-06-02 (07-02):** `IPanopticData` kept to exactly the six §E-verified V2 functions (`dispatch`/`dispatchFrom`-payable/`getAccumulatedFeesAndPositionsData`/`getCurrentTick`/`getTWAP`/`numberOfLegs`); optional `getOracleTicks` deferred to Phase 8. FORK-03 compile-time conformance proof = `forge build` green (interface compiles vs borrowed V2 types), NOT an `IPanopticData(addr)` cast.
- **2026-06-02 (07-02):** Phase 7 lives on branch `feat/keeper-vercel-buildoutput` (07-01 commits reachable only there), not `rescope/somi-leg-donor-transfer` as the prompt/STATE implied; executed + committed 07-02 in place (branching=none).
- **2026-06-02 (07-03):** `BASE_FORK_BLOCK = 46700000` pinned as a Solidity `uint256 constant` in the harness source (M-4, NOT an env var) — archive-verified (`cast code <PoolManager>` = 48020 hex chars at that height; head ≈46789746). PoolManager touched via borrowed `V4StateReader.getSqrtPriceX96(IPoolManager, PoolId)` under cancun — NOT v4-periphery StateView (B-2, not installed). `forge test --fork-url "$BASE_RPC_URL"` 2/2 green = FORK-01 fork-run proof.
- **2026-06-02 (07-03):** bulloak 0.9.2 infers the matching `.t.sol` STRICTLY same-dir as the `.tree` (no subtree search / path flag) ⇒ co-located `BaseForkHarness.tree` + `.t.sol` in `test/fork/` (deviation from the plan's `test/spec/` tree dir) so `bulloak check` exits 0 while the harness stays on the VALIDATION-verbatim `--match-path test/fork/...` path. The pre-existing `test/spec/*.tree` (MacroOracle, SomniaAgentConsumer.*) are un-parseable in 0.9.2 (`/`/`.` in branch text) — out-of-scope for FORK-01, so the full-glob `bulloak check test/spec/*.tree` is NOT a passing gate in this repo.
- **2026-06-02 (07-04):** Our own cCOP/USDC UniV4 pool deployed on the Base fork via `PoolManager.initialize(key, sqrtPriceX96)` (FORK-02). `PoolKeyLib.buildCcopUsdcKey` is the SHARED PoolKey/sqrtPriceX96/ordering builder (mn-C, reused by Plan 05) — `ccopIsCurrency0 = ccop < usdc` decided at RUNTIME; sqrtPriceX96 bakes the 1e12 (18dp/6dp) gap for HUMAN_RATE=4000, and `decodeHumanRate` round-trips to [3000,5000] (mn-3, catches a 1e12 ordering error). **sqrtPriceX96 literals:** ccop=currency0 → `1252707241875239655932` (→4000); ccop=currency1 → `5010828967500958623728276031392126461` (→3999).
- **2026-06-02 (07-04):** Full-range LP (M-1) via a minimal `V4LpHelper` (`IUnlockCallback`→`PoolManager.modifyLiquidity`, ticks rounded to spacing). **Seeded `SEEDED_LIQUIDITY = 1_000_000 ether`** (helper funded `type(uint128).max` of BOTH tokens via `deal`/`mint` before `unlock`) so `StateLibrary.getLiquidity(id) > 0` — **Plan 05 must size its mint FAR below 1,000,000 ether to clear `_validateSolvency`** (07-RESEARCH-DEPLOY §D). NOT `PositionManager.modifyLiquidities` / `SFPMV4.mintTokenizedPosition` (SFPM.initializeAMMPool not run yet).
- **2026-06-02 (07-04):** Inlined the BalanceDelta settlement (`sync`→`transfer`→`settle` / `take`) in `V4LpHelper` instead of v4-core's `test/utils/CurrencySettler.sol` — the latter's `../../src/...` relative imports resolve to a DISTINCT compiler type from the `v4-core/`-remapped `Currency`/`IPoolManager` (Error 9553 invalid implicit conversion). Read path stays `V4StateReader.getSqrtPriceX96` + `StateLibrary.getLiquidity` — NO StateView (B-2). Tree+test co-located `test/instrument/CcopUsdcPool.{tree,t.sol}` (stem+same-dir bulloak rule; plan's `test/spec/` + `.fork.t.sol` would not match).

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
