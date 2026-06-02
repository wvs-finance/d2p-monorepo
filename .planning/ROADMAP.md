# Roadmap: abrigo-somnia v2.0 — Convex Instrument (cCOP/USD long-gamma)

**Created:** 2026-06-01
**Milestone:** v2.0 — convex-instrument (NEW parallel-track engineering milestone)
**Granularity:** standard (4 lean phases for the v1 demo loop)
**Parallelization:** enabled (Phase 7 fork-stack and Phase 10's `MacroOracle` modify are independent; first true join is `PositionBuilder`)
**Mode:** interactive
**Source of truth:** `.planning/PROJECT.md` (§ Current Milestone: v2.0) + `.planning/REQUIREMENTS.md` (v1 reqs) + `.planning/research/v2-convex-instrument/{SUMMARY,STACK,ARCHITECTURE,PITFALLS}.md`

> **Parallel-track note.** The M1 donor-transfer *econometrics* milestone is **PARKED mid-Phase-3**
> and preserved verbatim at `.planning/{STATE,ROADMAP,REQUIREMENTS}-M1-donor-transfer-2026-06-01.md`
> (resumable; M1 phase folders `phases/01..03/` untouched). This roadmap REPLACES the live
> M1 roadmap. **Phase numbering starts at 7** (M1 used 1–6; `phases/01..03/` already exist on disk —
> starting at 07 avoids collision). M1 later **calibrates this instrument's params** (K, k, σ_CPI,
> the CPI→FX coefficient). Do NOT edit the M1 snapshots.

## Core Value (from PROJECT.md)

> A TE-sized **long-gamma cCOP/USD hedge** on **borrowed-Panoptic-V2-data-model** contracts (our own
> implementation; **Base fork against our own cCOP/USDC UniV4 pool**; clean future swap to a canonical
> Panoptic V2 deployment via `IPanopticData` repoint). Premium = **upfront collateral** → streamed
> accrual → **data-cost-weighted reimbursement** (`surviving collateral − streamia − commission −
> metered hedge-data cost`). Post-Keynesian/Shiller-grounded; **feature-by-feature, strict evm-tdd**.

## Decisive pivot (research SUMMARY, 2026-06-01)

- **Hackathon, demo/testnet only, never production** → borrowed Panoptic code (BUSL-1.1) is permitted
  in non-production fork use; ship a NOTICE only.
- **Panoptic V2 (Uniswap V4), not V1.** V1 is EOL (vuln, trading disabled). V2 is open-sourced,
  UniV4-based, audited Dec-2025.
- **Base fork (not Celo).** The only real cCOP pool is UniV3/Celo — incompatible with V2's UniV4
  surface. Resolution: **fork Base, deploy our OWN cCOP/USDC UniV4 pool for the demo**, borrow
  Panoptic V2 core behind `IPanopticData`. Unifies instrument + (deferred) x402 + Reactive on one chain.

## Coverage Summary

- v1 requirements: 12 (FORK ×3, WRAP ×4, FEE ×3, SIZE ×2)
- Mapped to active phases: 12 (100%)
- Orphans: 0
- Deferred (clearly out of active phases): PAY-01, XCHAIN-01, HEDGE-01
- Active phases: 4 (Phase 7–10)
- Total success criteria: 16 (observable, testable)

## Process Gates (every phase — from PITFALLS)

- **evm-tdd `.tree`-before-impl** is a per-phase entry gate (PITFALL 8). The `.tree` for each new
  contract's open/close/claim/health paths is committed and reviewed before the corresponding `.sol`.
  Named fuzz/invariant tests (`invariant_userClaimsBackedByCollateral`,
  `invariant_residualNeverExceedsHoldings`, `invariant_dataCostConserved`) with a fixed CI fuzz-run floor.
- **Three-step planning-review gate** (CLAUDE.md): every phase PLAN passes Studio-Producer selection →
  Reality Checker + selected domain reviewer → verdict gate, BEFORE execution.
- **BUSL NOTICE discipline** (PITFALL 9): ported Panoptic V2 files retain their license header; a
  repo NOTICE documents provenance + source commit + Change Date; v2 is scoped fork/non-production only.

## Phases

- [ ] **Phase 7: Base-fork harness + borrowed Panoptic V2 + cCOP/USDC pool** — Foundry Base-fork (UniV4 PoolManager), borrowed Panoptic-V2-lite behind `IPanopticData`, our own cCOP/USDC UniV4 demo pool, BUSL NOTICE + bulloak.
- [ ] **Phase 8: LongGammaWrapper cash-flow** — Wrapper owns the position; deposit upfront collateral → mint long-gamma → streamia accrues (read from the contract) → burn closes → residual from surviving collateral, with all involuntary-close branches.
- [ ] **Phase 9: Premium split + data-cost reimbursement** — `PremiumSplitter` (π_panoptic + μ_LP + φ_data); `CapitalRemunerationVault` (ERC-4626) receives mutualized φ_data ($199 fixed) under a no-double-count conservation invariant; data-cost-weighted user residual.
- [ ] **Phase 10: Oracle surprise route + position sizing** — `MacroOracle` exposes a CPI surprise (consensus + σ → `s_t`); `PositionBuilder` sizes notional/strike from `s_t` + the cCOP/USD mark, linkage flagged `linkage_validated:false`.

## Phase Details

### Phase 7: Base-fork harness + borrowed Panoptic V2 + cCOP/USDC pool
**Goal**: A Foundry Base-fork harness exists in which a borrowed minimal Panoptic V2 core (behind `IPanopticData`) and our own cCOP/USDC UniV4 pool are deployed and exercisable — the foundation every later phase builds on.
**Depends on**: Nothing (first phase of this milestone). Reuses the already-built `SomniaAgentConsumer`/`MacroOracle` layer only at Phase 10.
**Requirements**: FORK-01, FORK-02, FORK-03
**Plan-phase research (carried from SUMMARY "Open → plan-phase"):** exact Panoptic **V2** contract set + license terms at a pinned commit; V2 streamia/premium mechanics (V2 differs from V1's `SFPM`/`FeesCalc`/`VEGOID=2`); cCOP/USDC UniV4 pool deploy specifics on a Base fork; Base public-fork-RPC archive depth.
**Success Criteria** (what must be TRUE):
  1. A `forge test` against the Base fork (UniV4 `PoolManager` + a stable token, pinned fork block) compiles under the multi-version solc matrix (borrowed Panoptic pins vs repo `^0.8.24`, no borrowed-library version bump) and runs green. *(FORK-01)*
  2. A fork test deploys our own cCOP/USDC UniV4 pool (mock cCOP, realistic params) and a consumer can read its initialized state (price/liquidity) from the harness. *(FORK-02)*
  3. A consumer imports only `IPanopticData` (interface authored against the real Panoptic V2 ABI) and the borrowed Panoptic-V2-lite concrete satisfies it; a test mints and burns a single position through the interface, never importing the concrete directly (swap seam intact). *(FORK-03)*
  4. The repo carries a BUSL-1.1 NOTICE recording the borrowed Panoptic V2 source commit + provenance, and `bulloak` is installed/pinned so `.tree` specs scaffold tests (the milestone's strict evm-tdd loop is operable). *(FORK-01 / process gate)*
**Notes (PITFALLS):** P9-license — keep v2 strictly non-production (fork = permitted BUSL use); the NOTICE + non-production scoping is established here before any code is ported. P4-design — TWAP-vs-spot mark + liquidity-floor design settled in the wrapper interface here so the wrapper is not retrofitted later (the live real-cCOP-pool gates themselves are out of v1 scope; our demo pool is the v1 target).
**Plans**: 5 plans (5 waves — fork-stack is dep-chained, not parallel)
- [x] 07-01-PLAN.md — Toolchain + provenance: single cancun `foundry.toml`/`remappings.txt`/`.env.example`, install v4-core/v4-periphery/solmate + bulloak, BUSL `NOTICE` *(FORK-01)*
- [x] 07-02-PLAN.md — Vendor minimal borrowed Panoptic V2 core (BUSL headers) + author `IPanopticData` (real V2 ABI) + `MockCcop` *(FORK-03)*
- [x] 07-03-PLAN.md — Base-fork harness `.tree`+test: pin block 46700000 (Solidity constant), touch live UniV4 PoolManager under cancun via V4StateReader (2/2 fork test green) *(FORK-01)*
- [ ] 07-04-PLAN.md — Deploy our cCOP/USDC UniV4 pool, read initialized `sqrtPriceX96` via StateView *(FORK-02)*
- [ ] 07-05-PLAN.md — Mint+burn ONE position through `IPanopticData` only (swap seam intact) *(FORK-03)*
> Note: 07-RESEARCH §5 retired the FORK-01 "multi-version solc matrix" — V2 is `^0.8.24`, a single cancun compile. Intentional supersession, not a gap.

### Phase 8: LongGammaWrapper cash-flow
**Goal**: A `LongGammaWrapper` owns a long-gamma position on the user's behalf — deposit upfront collateral → mint → streamia accrues (read from the contract) → burn closes → residual computed from *surviving* collateral at actual close, tolerating every involuntary-close branch.
**Depends on**: Phase 7 (needs the borrowed-Panoptic skeleton + pool to mint/burn against).
**Requirements**: WRAP-01, WRAP-02, WRAP-03, WRAP-04
**Success Criteria** (what must be TRUE):
  1. A user deposits **upfront collateral** (not a premium quote) into `LongGammaWrapper`; a fork test asserts `positionIdList(wrapper)` holds the new position and the ERC-4626 collateral shares are `balanceOf(wrapper) > 0` while `balanceOf(user) == 0` — the wrapper is the unambiguous owner. *(WRAP-01)*
  2. The wrapper mints a long-gamma (`isLong=1`) position on the cCOP/USDC pool through `IPanopticData`. *(WRAP-02)*
  3. Streamia is **read from the borrowed contract's own accounting** (never re-derived): a fork test advances N blocks generating known pool fees, then asserts the wrapper's recorded streamia equals the pool's own debit to the wei. *(WRAP-03)*
  4. The wrapper handles every involuntary-close branch — `forceExercise`, `settleLongPremium`, and liquidation — each with a committed `.tree` branch and a fork test; in each, `residual = max(survivingCollateral − realizedCosts, 0)`, the wrapper never pays more than it holds, and a `ResidualEroded` event fires on involuntary debit. *(WRAP-03)*
  5. A voluntary `burn` closes the position and `claimResidual()` computes the residual from **surviving collateral at actual close** — never a figure derived from the upfront deposit. *(WRAP-04)*
**Notes (PITFALLS):** P1 — streamia read-from-contract, never a `SPREAD_MULTIPLIER`/`streamiaPerBlock` constant. P2 — wrapper-owns-position custody is the foundational invariant; the user's claim is internal accounting, not a 4626 share/Panoptic position. P3 — the no-upfront-premium reframe; the deposit is an over-funded cap, residual is post-settlement. P8 — `.tree` for open/close/claim/health committed before `.sol`.
**Plans**: TBD

### Phase 9: Premium split + data-cost reimbursement
**Goal**: A premium is decomposed into its three economic slices, the mutualized data cost is recouped through an ERC-4626 vault, and the user's reimbursement is data-cost-weighted — all under a conservation invariant that no data cost is double-counted.
**Depends on**: Phase 8 (needs a deposit/residual to split and a wrapper whose residual formula the metered hedge-data cost feeds into).
**Requirements**: FEE-01, FEE-02, FEE-03
**Success Criteria** (what must be TRUE):
  1. `PremiumSplitter` decomposes a premium into `π_panoptic + μ_LP + φ_data` with a fuzz-tested split invariant (`Σ slices == premium`). *(FEE-01)*
  2. `CapitalRemunerationVault` (ERC-4626) receives the **mutualized fixed $199** φ_data slice and recoups it across the epoch's premiums; standard 4626 deposit/withdraw share invariants hold under fuzz. *(FEE-02)*
  3. A named conservation invariant test (`invariant_dataCostConserved`) asserts `Σ φ_data (vault, mutualized) + Σ hedgeMeteredCost (per-position, incremental) == totalDataSpend` — the fixed $199 is charged once to the vault, never N times to N positions; every cost line carries a units/FX column. *(FEE-02 / FEE-03)*
  4. User reimbursement = **surviving collateral − streamia − commission − metered hedge-data cost** (the per-position *incremental* metered cost only, in the v1 stubbed-hedge metering); a fork test asserts the full residual formula with `Σ hedge cost` wired into the wrapper from Phase 8. *(FEE-03)*
**Notes (PITFALLS):** P5 — the two data costs are disjoint ledger line items: mutualized φ_data (fixed $199 → vault, decreasing per-position as volume grows) vs per-position incremental hedge metering. The `199` constant never appears in a per-position deduction; the conservation test is the phase exit criterion. v1 meters a **stubbed** hedge (live delta-hedge is HEDGE-01, deferred) — the metering interface is built so the live keeper drops in later.
**Plans**: TBD

### Phase 10: Oracle surprise route + position sizing
**Goal**: The CPI surprise `s_t` is computable from the already-live `MacroOracle`, and `PositionBuilder` sizes the long-gamma notional/strike from `s_t` + the cCOP/USD mark — with the CPI→FX linkage honestly flagged unvalidated.
**Depends on**: Phase 8 (mint target). The `MacroOracle` modify (SIZE-01) has **no dependency on Phases 7–9** and may proceed in parallel from the start; the first true join is `PositionBuilder` (SIZE-02), which needs both the mint target and `s_t`.
**Requirements**: SIZE-01, SIZE-02
**Plan-phase research (carried from SUMMARY/ARCHITECTURE):** σ_CPI + the `k` convexity threshold (candidate calibration input from the parked M1 donor-transfer track); whether `s_t` arithmetic lives on `MacroOracle` (Somnia) or `PositionBuilder` (recommendation: keep raw CPI level + a separately-fetched consensus on the oracle, compute `s_t` in `PositionBuilder`).
**Success Criteria** (what must be TRUE):
  1. `MacroOracle` exposes a CPI surprise route — it carries the EME consensus input + σ alongside the live CPI level (proven at 568) so `s_t = (actual − consensus)/σ` is computable; the new consensus route lands via the existing `fetchUint` callback (over-funded per agent class, never the floor) and the `SomniaProbe` regression stays green. *(SIZE-01)*
  2. `PositionBuilder` sizes notional + strike width from `s_t` + the cCOP/USD mark (`te/fx/usdcop`); fuzz tests assert monotone sizing in `|s_t|`, strike-width bounds, and that `mintOptions` is called with the correct `isLong=1` leg. *(SIZE-02)*
  3. The CPI→FX coefficient (`β_{s→FX}`) is a **config/oracle-supplied parameter, never a hard-coded constant**, and the instrument metadata carries `linkage_validated: false`; the success criteria and demo narrative state the sizing is *illustrative assuming the linkage*, not a validated CPI hedge. *(SIZE-02)*
**Notes (PITFALLS):** P7 — the CPI→FX linkage is an unvalidated assumption; the coefficient stays config-backed for later M1/M2 recalibration; `linkage_validated:false` is a hard requirement and the milestone must not claim production-readiness while false. v1 may inject `s_t` directly (the MacroOracle→instrument cross-chain scalar bridge is XCHAIN-01, deferred).
**Plans**: TBD

## Deferred / Future (NOT active phases this milestone)

These v1-requirements-doc "stretch" items are mapped to no active phase. They follow once the core
deposit → mint → accrue → burn → data-weighted-residual loop is green (SUMMARY build order: x402/Reactive
are LAST; delta-hedge is an external keeper add-on, not a Panoptic primitive).

| Deferred req | What it is | Why deferred | Likely future phase |
|---|---|---|---|
| **PAY-01** | Deposit via x402 on Base (keeper/off-chain entry) | Payment entry is off-chain/TS, co-located with the keeper; does not gate the on-chain cash-flow loop. | Post-loop payment-entry phase |
| **XCHAIN-01** | Reactive callback dual-auth (CallbackProxy + RVM-id) + replay nonce; DATA_PAYMENT→vault, PREMIUM→PositionBuilder | The single genuinely cross-chain edge (MacroOracle Somnia → instrument Base). v1 mocks/injects `s_t`. PITFALL 6: needs a dedicated security review; BOTH auth checks + the nonce from day one when built. | M3+ composite-bridge milestone |
| **HEDGE-01** | External delta-hedge keeper trades the underlying | Delta-hedging is not a Panoptic primitive; v1 meters the data cost with a **stubbed** hedge. The metering interface (Phase 9) is built so the live keeper drops in later. | Post-loop delta-hedge phase |

**Also out of scope (REQUIREMENTS.md):** production/mainnet deployment; real Celo cCOP pool (UniV3/Celo, incompatible with UniV4/Base); canonical Panoptic V2 integration (swap `IPanopticData` later); CPI→FX transfer-function calibration (parked M1 track); real money / real users.

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 7. Base-fork harness + borrowed Panoptic V2 + pool | 2/5 | In Progress | - |
| 8. LongGammaWrapper cash-flow | 0/0 | Not started | - |
| 9. Premium split + data-cost reimbursement | 0/0 | Not started | - |
| 10. Oracle surprise route + position sizing | 0/0 | Not started | - |

## Traceability (v1 requirements → phases)

| Requirement | Phase | Status |
|---|---|---|
| FORK-01 | Phase 7 | Pending |
| FORK-02 | Phase 7 | Pending |
| FORK-03 | Phase 7 | Pending |
| WRAP-01 | Phase 8 | Pending |
| WRAP-02 | Phase 8 | Pending |
| WRAP-03 | Phase 8 | Pending |
| WRAP-04 | Phase 8 | Pending |
| FEE-01 | Phase 9 | Pending |
| FEE-02 | Phase 9 | Pending |
| FEE-03 | Phase 9 | Pending |
| SIZE-01 | Phase 10 | Pending |
| SIZE-02 | Phase 10 | Pending |
| PAY-01 | Deferred | Future |
| XCHAIN-01 | Deferred | Future |
| HEDGE-01 | Deferred | Future |

---
*Roadmap created: 2026-06-01 — v2.0 convex-instrument; REPLACES the M1 roadmap (snapshotted at `.planning/ROADMAP-M1-donor-transfer-2026-06-01.md`). Phase numbering starts at 7. Build order from ARCHITECTURE/SUMMARY: (7) Base-fork harness + borrowed Panoptic V2 + cCOP/USDC pool → (8) LongGammaWrapper cash-flow → (9) PremiumSplitter + ERC-4626 vault + data-cost residual → (10) MacroOracle surprise route + PositionBuilder sizing. All phase PLANs must pass the three-step planning-review gate before execution.*
