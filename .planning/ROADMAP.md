# Roadmap: abrigo-somnia v2.0 — Convex Instrument (cCOP/USD long-gamma)

**Created:** 2026-06-01
**Milestone:** v2.0 — convex-instrument (NEW parallel-track engineering milestone)
**Granularity:** standard — original v1 demo loop (4 lean phases 7–10) + the Agentathon cornerstone (phases 11–15, appended 2026-06-02)
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
- Active phases: original instrument 7–10 (7–8 ✅ done; 9–10 deferred behind the cornerstone) + the **Agentathon cornerstone 11–15** (11 ✅, 12 ✅, 13 ✅, 14 ✅ done; MVP remaining = **15 E2E**). See the "Cornerstone milestone" section.
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

- [x] **Phase 7: Base-fork harness + borrowed Panoptic V2 + cCOP/USDC pool** — Foundry Base-fork (UniV4 PoolManager), borrowed Panoptic-V2-lite behind `IPanopticData`, our own cCOP/USDC UniV4 demo pool, BUSL NOTICE + bulloak. (completed 2026-06-02)
- [x] **Phase 8: LongGammaWrapper cash-flow** — Wrapper owns the position; deposit upfront collateral → mint long-gamma → streamia accrues (read from the contract) → burn closes → residual from surviving collateral, with all involuntary-close branches. (completed 2026-06-02)
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
**Plans**: 7 plans (7 waves — interface-first skeleton → test substrate → behavioral units dep-chained by the evm-tdd Iron Law, invariants last)
- [x] 08-01-PLAN.md — Interface-first surface: `ICostMeter`, `IPanopticData.getOracleTicks` (+L221→L431 fix), `LongGammaWrapper` skeleton (state machine + events + stubs), `invariants.tree` *(WRAP-01..04 surface)*
- [x] 08-02-PLAN.md — Test substrate: `V4SwapHelper` (deterministic fee gen) + `LongGammaWrapperBase` (M-3 isolation + seeded closeable seller short) *(WRAP-02/03 prerequisites)*
- [x] 08-03-PLAN.md — `open` tree+impl+test: deposit upfront collateral → wrapper-owns custody → mint `isLong=1` *(WRAP-01, WRAP-02)* — 5/5 green on Base fork
- [x] 08-04-PLAN.md — `streamia` tree+impl+test: READ `longPremium` (read-fidelity + non-zero + directional/monotonic + pre-Open WrongState) *(WRAP-03 — fork-proven 6/6; req stays pending until the 08-06 involuntary branches)*
- [x] 08-05-PLAN.md — `close` + `claimResidual` trees+impl+tests: user-gated voluntary burn (SC-5) + CEI cap-aware surviving-collateral residual *(WRAP-04)* — close 6/6 + claimResidual 7/7 green on Base fork
- [x] 08-06-PLAN.md — `settleLong` + `forceExercise` + `liquidation` trees+tests: the three `dispatchFrom` involuntary branches (settle stays Open; the other two close) *(WRAP-03 — fork-proven 2/2 each; WRAP-03 now complete)*
- [ ] 08-07-PLAN.md — `invariants` impl: `invariant_residualNeverExceedsHoldings` + `invariant_userClaimsBackedByCollateral` at the CI fuzz floor *(WRAP-03/04)*

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
**Plans**: 5 plans (3 waves — units/FX lock + splitter (W1) → {vault, meter} parallel (W2) → {conservation invariant, fork residual} parallel (W3))
- [ ] 09-01-PLAN.md — Units/FX lock (Option B per-token + Option A USD narrative) + `PremiumSplitter` (`Σ slices == premium`, remainder sink) *(FEE-01)*
- [ ] 09-02-PLAN.md — `CapitalRemunerationVault is ERC4626` (mutualized $199 once/epoch, donation-inflow recoupment, 4626 share fuzz invariants) *(FEE-02)*
- [ ] 09-03-PLAN.md — `IHedgeMeter is ICostMeter` (+`recordHedgeFill` HEDGE-01 drop-in) + `HedgeDataMeter` (per-position incremental, P5 `199`==0) *(FEE-03)*
- [ ] 09-04-PLAN.md — `invariant_dataCostConserved` (hand-named, per-token, non-vacuous mutation-proven; Handler drives both ledgers) *(FEE-02/FEE-03)*
- [ ] 09-05-PLAN.md — `LongGammaWrapper.meteredResidual` fork test: fresh wrapper + `setCostMeter` → residual nets the metered hedge cost (metered term BIT); wrapper unedited *(FEE-03)*

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

## Cornerstone milestone — Scenario 1 (UI → contracts), the Agentathon deliverable

> **The deliverable is ONE end-to-end test** (`CHECKPOINT.md`): user prompt on the UI → **Agent 1** picks the instrument → **Agent 2** sizes it to the pool and mints → a **monitoring agent** reports live performance — for **Scenario 1** ("rate-hike → COP/USD convexity → long cCOP/USD call"). Phases 11–15 are the **test-ribbon (evm-TDD per component)** decomposition; they take priority over Phases 9–10 (premium-split, oracle-surprise) for the ~**June 11, 2026** deadline. Delta-hedge management over the position's lifetime is a **later iteration** (deferred — `HEDGE-01`).
>
> **CHAIN PIVOT (confirmed 2026-06-02):** the cornerstone runs on a **Polygon fork** against the **real `wCOP/USDC` UniV4 pool** (PoolManager `0x6736…`, USDC 6dp `0x3c49…`, wCOP 18dp `0x8a1D…`, fee 3000 / tickSpacing 60), with Panoptic V2 stood up via the production `DeployProtocol.s.sol` + real periphery (`StrategyBuilder`, `PanopticQuery`). Phases 7–8 (Base fork / mock-cCOP) were the V2-mechanics proving ground; the Polygon demo realizes the mint with real tokens. **Agent 2's execution core is ALREADY BUILT + committed** in `contracts/test/fork/DemoMacroHedgeExecutor.fork.t.sol` (`HedgeLegParams`/`PayoffTerms` → `resolvePositionFromHedgeParams` vol→width→strike→`TokenId` → short-then-long `dispatch` mint; `RiskManagement.quoteCollateralRequirements`; two green ribbons). Phases 11–15 build the agents + monitoring + UI **around** that core; nothing there is planned over.

### Phase 11: `MacroHedgeStrategist` v1 (lean decision agent) — DONE ✅
**Goal**: A Somnia-testnet `MacroHedgeStrategist is SomniaAgentConsumer` turns a macro view into a **consensus-verified, authenticated** decision via the LLM-Inference agent. **Built + verified + run LIVE on Somnia testnet** — this is the v1; Phase 12 upgrades its OUTPUT shape (`HedgeDecision{action,sizeBps}` → the `HedgeLegParams` instrument-spec the Executor consumes).
**Requirements**: AGENT-01, AGENT-02, AGENT-03, AGENT-04 — **all Complete**.
**Plans (complete):**
- [x] 11-01-PLAN.md — Add `ILLMAgent` (inferString/inferNumber) to vendored `ISomniaAgents.sol` *(AGENT-01)* — `faffaec`, forge build green
- [x] 11-02-PLAN.md — `.tree` + `MacroHedgeStrategist.sol` (is SomniaAgentConsumer) + unit suite (encode/decode→enum/clamp/auth/replay/DecisionFailed) *(AGENT-02 + AGENT-03 unit)* — tree `71d3bec`, contract `0853bfc`, suite `f778012`; bulloak clean, 17/17 green
- [x] 11-03-PLAN.md — Somnia-testnet e2e runner; live in-enum/in-range + decision-moves-with-consensus *(AGENT-03)* — **APPROVED on Somnia testnet (50312)**: CONSUMER `0xfA428171E1F5B56f92C67C002De1d8e90B053EE1`; consensus=500→ADD_LONG_GAMMA/6800, consensus=900→REDUCE/568
- [x] 11-04-PLAN.md — `contracts-ci.yml` (forge build + parseable-tree bulloak + sharded/cached/secret fork; Somnia e2e on `workflow_dispatch`) *(AGENT-04)* — `0dc1587`, `c291305`
**Deferred out of the cornerstone MVP:** the `te-factor-modules` multi-factor data layer (DATA-01/02 — the live `MacroOracle` factors suffice for Scenario 1; `openspec/changes/te-factor-modules/` ships post-deadline) and the monitoring *agent* (MON-01 — Phase 15 uses a basic read instead).

### Phase 12: `MacroHedgeStrategist` (Agent 1) — prompt → hedge mandate — DONE ✅
**Goal**: **Upgrade the Phase-11 v1 Strategist's OUTPUT** from `HedgeDecision{action,sizeBps}` to a **`HedgeMandate`** — the hedging *intent* the Phase-14 representativeness brain consumes: the **economic school Agent 1 INFERS from the prompt** (via a concrete `IMacroThesis` named-thesis registry — Shiller macro-risk / post-Keynesian), the **direction** (Scenario 1: long cCOP/USD call → `isLong`), and a **target notional** (the cash-flow risk to hedge), reading the **live `MacroOracle` factors**. Agent 1 expresses WHAT to hedge under WHICH school; it does **NOT** finalize the instrument geometry (moneyness/strike/width/size are Phase-14's representativeness outputs). `underlyingMarket` anchored to the committed **`POLYGON_WCOP_USDC_POOL_ID`** constant (Agent 1 can't produce a runtime PoolId).
**Depends on**: Phase 11 (the v1 Strategist — DONE) + the live `MacroOracle`; the committed `docs/superpowers/specs/2026-06-02-macro-hedge-strategist-design.md` (its `inferString`/`inferNumber` calling convention) + `IMacroThesis` + `PolygonPools`. **Independent of the Phase-14 representativeness math** — the mandate is its *input*, so Phase 12 can build in parallel.
**Requirements**: STRAT-01, STRAT-02 — **all Complete** (2026-06-06; 12-VERIFICATION `status: passed`, 7/7 must-haves; strategist 19/19 + regression 97/0; live "different prompt → different mandate" run deferred to a Manual-Only `workflow_dispatch`)
**Success Criteria**: 1. `IMacroThesis` is given a concrete **named-thesis registry** shape, and `MacroHedgeStrategist is SomniaAgentConsumer` emits a **`HedgeMandate`** via the two-leg flow (Leg 1 `inferString` → the economic school inferred from the prompt; Leg 2 `inferNumber` → the target notional; `llm-inference` ID `12847293847561029384`, authenticated callback); a Somnia-testnet run proves a real prompt → well-formed mandate, rejects non-`PLATFORM`/replayed responses, and a different prompt yields a different mandate (reasoning, not a constant). *(STRAT-01)* 2. The emitted `HedgeMandate` is well-formed + **consumable by Agent 2's representativeness derivation** — `underlyingMarket` anchored to `POLYGON_WCOP_USDC_POOL_ID`, the school address resolvable, the target notional in-range — so Phase 14's `resolveFromMandate` can derive a `HedgeLegParams` from it (the geometry/`TokenId` round-trip moves to Phase 14). *(STRAT-02)*
**Notes**: autonomy = decision freedom, NOT unauthenticated. The geometry (moneyness/strike/width/size) is explicitly Phase-14's representativeness output — Agent 1 emits intent only. Stretch: `inferToolsChat` (the LLM pulls factors itself).
**Plans**: 2 plans (2 waves — Wave-0 type+registry substrate, then the Iron-Law TDD re-semantic of the live contract)
- [x] 12-01-PLAN.md — `HedgeMandate` value type (intent-only, no geometry) + promote `IMacroThesis` to a concrete handle-resolving `MacroThesisRegistry` (schoolLabels/thesisOf/promptBias) *(STRAT-01, STRAT-02)* ✅ 2026-06-06 (commits 59dcc0d/1d4387f; five intent-only fields, four types mirror HedgeLegParams byte-for-byte, no-geometry grep==0, handle-resolving Fork-B with non-deployable 0x5/0x6 sentinels; `forge build` exit 0; the STRAT-01/02 substrate half — the strategist re-semantic + Somnia-testnet run land in 12-02)
- [x] 12-02-PLAN.md — Iron-Law re-semantic of `MacroHedgeStrategist` (RED tree+test -> GREEN impl): Leg 1 inferString -> school, Leg 2 inferNumber -> target notional, assemble+emit `StrategistDecided(decisionId, school, HedgeMandate)` + `getMandate`; spine kept verbatim; reconcile the UI-handoff event schema *(STRAT-01, STRAT-02)* ✅ 2026-06-06 (commits 6fe4c32 RED → 7101acb GREEN → 68e34d0 docs; school/notional two-leg flow, block-independent cross-block join, B1 single-struct `getMandate`/`decisionState`, M2 below-MIN floor-UP, spine verbatim + old action/sizeBps API removed; **19/19** strategist + **97/97** fork-free suite, no sibling regressions; UI-handoff reconciled to the HedgeMandate shape; the live Somnia "different prompt → different mandate" run DEFERRED Manual-Only per M4)

### Phase 13: `MacroHedgeExecutor` (Agent 2) — pool-representativeness, sizing, mint — DONE ✅
**Goal**: Promote the committed `DemoMacroHedgeExecutor` resolver harness into the real **`MacroHedgeExecutor is SomniaAgentConsumer`**: it takes Agent 1's `HedgeLegParams`, does the **pool-state / representativeness analysis** (how representative the Polygon `wCOP/USDC` pool is of the FX risk — the "inflation adjustment", a `llm-inference` step whose decision is surfaced for the UI), sizes the position, and **mints it** via the short-then-long `dispatch` flow; with `RiskManagement.quoteCollateralRequirements` and `OperationalCostManagement` (cumulative agent+data cost) completed.
**Depends on**: Phase 12 (the `HedgeLegParams` hand-off); the **committed Polygon demo** (`resolvePositionFromHedgeParams`, `RiskManagement`, `PayoffTerms`/`VolToWidth`/`PriceGrids`, `StrategyBuilder`/`PanopticQuery`). Mints on the real Polygon wCOP/USDC V2 pool.
**Requirements**: EXEC-01, EXEC-02, EXEC-03 — **all Complete** (2026-06-06; 13-VERIFICATION `status: passed`, 24/24 tests green)
**Success Criteria**: 1. `MacroHedgeExecutor` (deployable) mints via `resolveAndMint` — the Polygon fork test (the `test__takeDemoPosition__Succeeds` lineage) is green through the real executor, not just the harness; a `RepresentativenessAssessed` event fires (live `llm-inference` representativeness round-trip = STRETCH; MVP stubs the source). *(EXEC-01)* 2. Collateral gating = the **protocol-native atomic `AccountInsolvent` revert** at `_validateSolvency` (under-funded executor → mint reverts, no position persists), proven by an under-funded negative fork test — NOT a pre-mint quote (which reverts `PositionNotOwned`, `PanopticPool.sol:559`); a POST-mint `quoteCollateralRequirements` `BalanceDelta` read is informational. *(EXEC-02)* 3. `OperationalCostManagement` accrues the cumulative agent-call + data cost (budgeted SOMI — realized executionCost is structurally unavailable on Somnia), with a mutation-proven no-double-count conservation invariant. *(EXEC-03)*
**Notes**: the heaviest ribbon, but the resolver/mint/risk-quote core is already committed + green — this wires it behind the agent + completes risk/cost. EXEC-02 is reframed HONESTLY (per 13-RESEARCH §2): a pre-mint solvency quote on the unminted position REVERTS `PositionNotOwned` (`PanopticPool.sol:559`), so the gate is the protocol-native atomic `AccountInsolvent` inside `dispatch` (post-mint margin read = informational); the live representativeness `llm-inference` is STRETCH (MVP ships the `RepresentativenessAssessed` event with a stubbed source) → the **REAL** representativeness model (the "inflation adjustment") is now the dedicated **Phase 14** (`resolveFromMandate`), which un-stubs this event's source.
**Plans**: 3 plans (2 waves — {PoolId-anchor, cost-ledger} parallel in W1 -> the executor mint in W2)
- [x] 13-01-PLAN.md — `POLYGON_WCOP_USDC_POOL_ID` constant (STRAT-02 anchor) + `IMacroThesis` compile-stub + polygon(137) fork-cache *(EXEC-01)* ✅ 2026-06-06 (commits 3de3c5e/a91a708/ebea287; EXEC-01 the anchor half — the deployable-mint half landed in 13-02, EXEC-01 now COMPLETE)
- [x] 13-02-PLAN.md — promote `MacroHedgeExecutor is SomniaAgentConsumer`: `resolveAndMint` (the `test__takeDemoPosition__Succeeds` lineage, contract-owned) + fixed `_onResult` decode + events + EXEC-02 post-mint read & `AccountInsolvent` atomic gate *(EXEC-01, EXEC-02)* ✅ 2026-06-06 (commits 322cab4/e85c2fc/de22865; 7/7 fork + 4/4 onResult unit green; numberOfLegs(executor)>0, PositionMinted+RepresentativenessAssessed(0) emitted; EXEC-02 under-funded AccountInsolvent gate via expectPartialRevert; EXEC-01+EXEC-02 done; live _onResult→mint join = Phase-14 STRETCH)
- [x] 13-03-PLAN.md — `OperationalCostManagement` `cummCost` ledger: per-`decisionId` agent+data accrual, per-leg idempotency, mutation-proven `invariant_costConserved` *(EXEC-03)* ✅ 2026-06-06 (commits e3b9dc4/ceb5057; 10/10 green, invariant 16 runs/0 reverts; BOTH non-vacuity mutations recorded — conservation 882…3505≠0, idempotency 14≠7; EXEC-03 done)

### Phase 14: Representativeness derivation (Agent 2 brain) — pool-mirrors-risk → geometry
**Goal**: The dedicated **mathematical** representativeness model that turns Agent-1's `HedgeMandate` into the actual option **geometry** (moneyness/strike/width/feasible-size = a `HedgeLegParams`). An agent **tool-calls** (RPC-node queries / on-chain + subgraph queries) over the **underlying wCOP/USDC pool's activity/behavior** and runs a **parameterized model of how representative** the pool is of the COP-inflation/depreciation risk the user wants to hedge (*can this pool hedge that risk, and with what basis risk?*) — the "inflation adjustment". The derived `HedgeLegParams` is minted via an **additive `resolveFromMandate`** front-end on the shipped `MacroHedgeExecutor` (the committed `resolveAndMint(HedgeLegParams)` mint core is REUSED, not rebuilt); the representativeness decision is surfaced for the UI (`ExecutorDecided`).
**Depends on**: Phase 12 (the `HedgeMandate`) + Phase 13 ✅ (the deployable mint core). Reuses `PanopticQuery` for on-chain pool state.
**Requirements**: REPR-01, REPR-02
**Success Criteria**: 1. A representativeness analysis reads the live wCOP/USDC pool activity (on-chain liquidity/TVL via `PanopticQuery`; volume/depth via the agent's tool-calls) and computes a **parameterized representativeness/basis-risk measure** of how well the pool mirrors the target COP-inflation risk; the measure + its parameters are surfaced (the "inflation adjustment" the UI shows). *(REPR-01)* 2. `resolveFromMandate(HedgeMandate)` derives a well-formed `HedgeLegParams` (moneyness/strike/width/feasible-size; size in the `optionRatio ≤127` bound) from the mandate + the representativeness measure and mints via the shipped core — the Polygon-fork mint is green through this path; the live `inferToolsChat` tool-calling round-trip = STRETCH (MVP may stage the on-chain-readable signal first). *(REPR-02)*
**Notes**: the **critical-path build** — it un-stubs the Phase-13 `RepresentativenessAssessed` source. Riskiest unknown = pool-activity data sourcing (volume/depth likely off-chain). The math model (correlation / cointegration / basis risk / liquidity-adjusted tracking error) is this phase's research core (ties to the econometrics / `abrigo-analytics` side). Likely `inferToolsChat` (the Phase-11 deferred stretch).
**Plans**: 3 plans (3 waves — the evm-TDD Iron Law dep-chains the build: pure-library substrate → executor wiring → fork mint)
- [x] 14-01-PLAN.md — `IRegimeOracle` + pure `RepresentativenessLib` (β₁(REGIME)×devaluation core + GBM-baseline comparator + decimal-gap strike anchoring + staleness→STRESS fail-safe) + `MockRegimeOracle`; Iron-Law tree+RED→GREEN unit suite (GBM-divergence, β₁ asymmetry, staleness→STRESS, the Pitfall-1 strike canary), mutation-proven non-vacuous *(REPR-01, REPR-02)*
- [x] 14-02-PLAN.md — additive `resolveFromMandate(HedgeMandate)` front-end + `ExecutorDecided` event on the shipped `MacroHedgeExecutor` (reads Z_t with the fail-safe, regime-conditional width + Fix-C decimal-gap-correct strike 360360, targetNotional→optionRatio≤127, honesty flag + TEMPLATE caveat); the mint body lifted verbatim into the Fix-C sink split `_resolveAndMintAtStrike(int24 strike)` (demo/direct path byte-unchanged), the onResult DecodeProbe + 3 fork ctor sites migrated in one compiling commit — `forge build` exit 0, onResult 4/4, fork EXEC 7/7 *(REPR-01, REPR-02)*
- [x] 14-03-PLAN.md — extend `DemoMacroHedgeExecutor.fork.t.sol` (reuse `_init_world`): mandate→geometry→mint on the Polygon fork (`numberOfLegs(executor)>0`), the EXACT structural K_hi strike `360360` (Fix-C, not a loose band), `ExecutorDecided` honesty-flag emit, the size=128 `optionRatio overflow` revert, behavioral LLM-independence via `MockRevertingPlatform` *(REPR-02, REPR-01)* ✅ 2026-06-07 — FORK-PROVEN on the live Polygon fork: `resolveFromMandate` mints a real wCOP/USDC position at strike `360360` EXACT + `numberOfLegs>0`, the 8-param `ExecutorDecided` decoded with `nonErgodicDisclosed==true` + TEMPLATE caveat, `MockRevertingPlatform` mints identical geometry. UNBLOCKED by a gate-passed `volToWidth` even-width invariant (odd→even snap so symmetric Panoptic leg bounds stay tickSpacing-aligned — the STRESS-width `21→22` `InvalidTickBound()` fix) landed as a real RED→GREEN evm-TDD split (`f92b0f7` test → `e686d4d` fix, per-file ancestry verified). demo fork 6/6, fork EXEC 7/7, Representativeness 17/17, onResult 4/4, fork-free 114/114, build exit 0 — **Phase 14 COMPLETE (3/3)**

### Phase 15: Cornerstone E2E (UI → contracts) + CI — the deliverable
**Goal**: The single **Scenario-1 cornerstone test** threading **frontend → Agent 1 (`HedgeMandate`) → Agent 2 (representativeness derivation + geometry, shown on the UI) → the Polygon wCOP/USDC mint → a basic live-performance read on the UI** — plus a `contracts-ci.yml` gate so the build/tests are confirmed for delivery.
**Depends on**: Phase 12 (mandate) + Phase 14 (representativeness geometry); Phase 13 ✅ (mint core); the frontend repo (`/home/jmsbpp/apps/d2p/frontend`, ~98%) consuming `docs/UI-AGENT-HANDOFF.md`.
**Requirements**: E2E-01, E2E-02
**Success Criteria**: 1. One end-to-end run reproduces Scenario 1 from the UI prompt to a minted position + a **basic** live-performance read (mark/margin via `PanopticQuery`/`RiskManagement` — NOT a separate monitoring agent), with Agent 2's decision surfaced to the user mid-flow — the artifact presented to the judges (demo + public repo + video). *(E2E-01)* 2. `contracts-ci.yml` gates the repo: `forge build` + per-file `bulloak check` + the fork tests (a **`polygon`** fork endpoint via an Actions secret + Foundry RPC cache keyed on the pinned block, sharded to dodge the 429); the Somnia-testnet + Polygon-mint live e2e stays a manual `workflow_dispatch`. *(E2E-02)*
**Notes**: the integrating ribbon — the deliverable. The monitoring **agent** (MON-01) and the delta-hedge agent (`HEDGE-01`) are DEFERRED; the demo shows a basic position read, not active management. **The contract mint leg is ALREADY shipped + fork-proven (Phases 13–14): `resolveFromMandate` mints at strike 360360.** Phase 15 is integration + packaging — NO new contracts. The frontend real-mint wiring is a clearly-labeled sibling-repo STRETCH (its own git at `/home/jmsbpp/apps/d2p/frontend`); the MVP deliverable is achievable entirely from the abrigo-somnia demo-node + the recorded video.
**Plans**: 3 plans (1 wave — disjoint files, all parallel; the green contract leg is the regression anchor)
- [ ] 15-01-PLAN.md — Contract-leg packaging: the explicit `quoteMargin` BASIC-read assertion + `serve-polygon-fork-demo.sh` (anvil fork+redeploy chain-137 demo node) + the human-verify video checkpoint *(E2E-01)*
- [x] 15-02-PLAN.md — `contracts-ci.yml` `polygon` fork job (gated on `ALCHEMY_API_KEY`, RPC-cached `foundry-rpc-polygon-86900000-v1`, retried; keyless job + `somnia-e2e` unchanged) *(E2E-02)*
- [x] 15-03-PLAN.md — `docs/UI-AGENT-HANDOFF.md` refresh (drop the stale 34-line-STUB claim; the 8-param `ExecutorDecided` + 3-field `PositionMinted`; flip §6 to the Phase-15 swap-to-real for the Agent-2 leg; the no-bridge honesty + the sibling-repo stretch boundary) *(E2E-01)*

> **MVP critical path:** Phase 11 ✅ → **Phase 12** (Agent 1 → `HedgeMandate`) → **Phase 14** (representativeness → geometry, reusing Phase 13 ✅ mint core) → **Phase 15** (UI E2E + CI). Each goes through the standard GSD loop — plan-phase → 2-way planning-review gate → execute → verify. **Deferred behind the cornerstone:** Phases 9–10 (premium-split, oracle-surprise), the `te-factor-modules` data polish (DATA-01/02), the monitoring agent (MON-01), delta-hedge (`HEDGE-01`).

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
| 7. Base-fork harness + borrowed Panoptic V2 + pool | 2/5 | Complete    | 2026-06-02 |
| 8. LongGammaWrapper cash-flow | 7/7 | Complete   | 2026-06-02 |
| 9. Premium split + data-cost reimbursement | 0/5 | Planned | - |
| 10. Oracle surprise route + position sizing | 0/0 | Not started | - |

## Traceability (v1 requirements → phases)

| Requirement | Phase | Status |
|---|---|---|
| FORK-01 | Phase 7 | Pending |
| FORK-02 | Phase 7 | Pending |
| FORK-03 | Phase 7 | Pending |
| WRAP-01 | Phase 8 | Complete (08-03: wrapper-owns custody fork-proven) |
| WRAP-02 | Phase 8 | Complete (08-03: isLong=1 mint fork-proven) |
| WRAP-03 | Phase 8 | Complete (08-04: streamia READ fork-proven 6/6; 08-06: three involuntary dispatchFrom branches fork-proven — settleLong/forceExercise/liquidation 2/2 each) |
| WRAP-04 | Phase 8 | Complete (08-05: close() SC-5 + claimResidual() surviving-collateral residual fork-proven — close 6/6 + claimResidual 7/7) |
| FEE-01 | Phase 9 | Pending |
| FEE-02 | Phase 9 | Pending |
| FEE-03 | Phase 9 | Pending |
| SIZE-01 | Phase 10 | Pending |
| SIZE-02 | Phase 10 | Pending |
| PAY-01 | Deferred | Future |
| XCHAIN-01 | Deferred | Future |
| HEDGE-01 | Deferred | Future |

### Phase 16: Shiller-differentiated representativeness (Agent-2 brain branches on economic school) — POST-MVP

**Goal:** Extend the Phase-14 representativeness brain so `resolveFromMandate`/`Representativeness` BRANCH on the mandate's economic school: `SHILLER_MACRO_RISK` gets a genuine narrative-driven-mispricing / tail-macro-risk geometry DISTINCT from the POST_KEYNESIAN regime/β₁ model (today the geometry is school-agnostic — regime-driven/TEMPLATE; the school is a label only). Grounded in the local `research/macro-markets-colombia/` (Shiller's Macro Markets framework for Colombia), analogous to how Phase 14 used `~/learning/post-keynesian/`. Then a whole-workflow integration test suite — prompt → Agent-1 selects school → `HedgeMandate` → Agent-2 school-specific geometry → mint — across multiple Colombian macro-risk scenarios under BOTH frameworks, at the agent-interaction layer just below the UI.
**Requirements**: SHILLER-01, SHILLER-02
**Depends on:** Phase 14 (the representativeness brain it extends) + Phase 13 (mint core); grounding in `research/macro-markets-colombia/`.
**Notes:** POST-cornerstone-MVP depth — does NOT gate the June-11 submission (the proven mint + the Phase-15 demo video are the deliverable). Surfaced by `/gsd:verify-work 15`: SHILLER is selected by Agent-1 but Agent-2's geometry is regime-driven/PKE/TEMPLATE (school-agnostic). All PLANs must pass the three-step planning-review gate before execution.
**Plans:** 3/3 plans complete

Plans:
- [x] 16-01-PLAN.md — ISurpriseOracle/MockSurpriseOracle + SHILLER lib fns (convex size, sign strike, |s|-width) + TEMPLATE constants (35-day staleness) + atomic 10-arg ctor migration; pure-lib RED->GREEN unit suite *(SHILLER-01)* ✅ 2026-06-07 (Shiller 10/10, PKE 17/17 un-regressed)
- [x] 16-02-PLAN.md — branch resolveFromMandate on economic school (SHILLER arm + verbatim PKE else); fork-prove SHILLER!=PKE 360360 + per-school honesty + downside K_lo resolution; PKE regression anchor *(SHILLER-01)* ✅ 2026-06-07 (SHILLER +2σ mints 361200 ≠ PKE 360360; demo fork 13/13, Representativeness 17/17, onResult 4/4; open-Q3 → depreciation-only-v1)
- [x] 16-03-PLAN.md — MacroWorkflow whole-workflow suite (Agent-1 in-VM -> HedgeMandate -> Agent-2 fork mint), 4 Colombian scenarios x 2 schools, same-input-different-geometry *(SHILLER-02)* ✅ 2026-06-07 (6/6 green on the Polygon fork; anti-tautology proven: intra-school SIZE 62<90 + flip-only-the-sentinel 0x5↔0x6 with identical oracles; PKE 360360 anchor + Representativeness 17/17 + ShillerRepresentativeness 10/10 + onResult 4/4 + demo fork 13/13 un-regressed)

---
*Roadmap created: 2026-06-01 — v2.0 convex-instrument; REPLACES the M1 roadmap (snapshotted at `.planning/ROADMAP-M1-donor-transfer-2026-06-01.md`). Phase numbering starts at 7. Build order from ARCHITECTURE/SUMMARY: (7) Base-fork harness + borrowed Panoptic V2 + cCOP/USDC pool → (8) LongGammaWrapper cash-flow → (9) PremiumSplitter + ERC-4626 vault + data-cost residual → (10) MacroOracle surprise route + PositionBuilder sizing. All phase PLANs must pass the three-step planning-review gate before execution.*

---

## v2.1 — Live Agent Integration (phase 17+)

**Created:** 2026-06-08
**Milestone:** v2.1 — Live Agent Integration (Somnia two-leg strategist live deploy)
**Granularity:** standard — a small, tightly-scoped deploy + prove + publish deliverable, split into **2 phases** for ONE genuine sequencing reason (re-confirm the volatile testnet surface BEFORE spending STT — §4).
**Source of truth:** `docs/FRONTEND-REQUEST-2026-06-07-strategist-live-deploy.md` (§2 deliverable, §3 acceptance, §4 constraints) + `.planning/PROJECT.md` (§ Current Milestone: v2.1) + `.planning/REQUIREMENTS.md` (§ v2.1 LIVEDEP-01..05).

> **Parallel-track note.** This APPENDS to the OPEN v2.0 roadmap (phases 7–16 above). v2.0 (Convex Instrument)
> remains **OPEN** — cornerstone E2E-01 demo video pending, phases 9–10 deferred. v2.1 runs alongside as a
> focused backend deploy serving the frontend live-Agent-1 path; it does NOT close, renumber, or supersede
> any v2.0 phase. Phase numbering continues at **17** (v2.0 ended at 16 on disk).
>
> **This is a DEPLOY + on-chain PROOF + PUBLISH, not new contract development.** The two-leg
> `MacroHedgeStrategist` (`StrategistDecided` API) already EXISTS in source and is **offline-proven**
> (Phase 12, 19/19 vs MockPlatform). The contract DEPLOYED on Somnia 50312 (`0xfA428171…`) is still the
> **v1** shape (`HedgeDecisionMade`/`getDecision`) and is **not upgradeable** → REDEPLOY to a new address.
> The runner to ADAPT (not author) is `contracts/script/macro-hedge-strategist-e2e.sh` (currently the v1 runner).

### Why two phases (the sequencing reason)

§4 mandates: *"Re-confirm the volatile `LLM_AGENT_ID 12847293847561029384` AND platform
`0x037Bb9…6776` against the Agent Explorer BEFORE spending STT (a `DecisionFailed`/no-callback ⇒ the
constant is wrong)."* A wrong constant burns STT on a dead run and produces no verifiable proof. So the
deploy + a single cheap school-leg probe (which doubles as the agent-ID/platform liveness probe) is its
own gate (**Phase 17**) that MUST pass before the full decision-moves prove + publish run (**Phase 18**)
commits STT and writes the published artifact. This is a genuine spend-gating dependency, not arbitrary
decomposition.

## v2.1 Coverage Summary

- v2.1 requirements: 5 (LIVEDEP-01..05)
- Mapped to active phases: 5 (100%)
- Orphans: 0
- v2.1 phases: 17 (deploy + pre-flight surface verification) → 18 (decision-moves proof + publish)
- Total v2.1 success criteria: 7 (all on-chain / grep / CLI-verifiable)

## v2.1 Phases

- [x] **Phase 17: Live deploy + pre-flight surface verification** — Redeploy the two-leg `StrategistDecided` strategist to Somnia 50312 (NEW address), wire it to the live platform / LLM agent / `MacroOracle`, and re-confirm the volatile `LLM_AGENT_ID` + platform via ONE cheap school-leg probe BEFORE the full STT-spending prove run. (completed 2026-06-08)
- [ ] **Phase 18: On-chain decision-moves proof + publish** — Run the adapted two-leg e2e on the live deploy to prove a well-formed `HedgeMandate` + decision-moves (different consensus → different mandate) with real tx hashes, then publish `somnia-strategist-deployment.json` + the committed ABI + the reversed §6 handoff guidance.

## v2.1 Phase Details

### Phase 17: Live deploy + pre-flight surface verification
**Goal**: The two-leg `MacroHedgeStrategist` (`StrategistDecided` API) is deployed live on Somnia testnet 50312 at a NEW address, wired to the live platform / LLM agent / `MacroOracle`, and the volatile testnet surface is re-confirmed correct — BEFORE any full STT-spending prove run.
**Depends on**: Nothing new (the contract source + offline proof exist from Phase 12; the funded STT key is in `contracts/.env`). First v2.1 phase.
**Requirements**: LIVEDEP-01
**Success Criteria** (what must be TRUE):
  1. `cast code <new-address> --rpc-url <somnia-50312>` returns non-empty bytecode at a NEW address (≠ the v1 `0xfA428171E1F5B56f92C67C002De1d8e90B053EE1`), and the deployed strategist's constructor-wired immutables read back as platform `0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776`, LLM agent `12847293847561029384`, and `MacroOracle` `0xAcA75144f644220f1dEAD5F989C350D8e0Cc983f`. *(LIVEDEP-01)*
  2. A single cheap `requestSchoolDecision` school-leg probe against the new address returns a real validator callback (NOT a `DecisionFailed` / no-callback) — proving the volatile `LLM_AGENT_ID` + platform constants are LIVE and correct before the full prove run spends more STT. *(LIVEDEP-01 / §4 constraint)*
  3. `cast code 0xfA428171E1F5B56f92C67C002De1d8e90B053EE1 --rpc-url <somnia-50312>` STILL returns the v1 bytecode — the v1 contract remains reachable (it backs the frontend replay fallback; not decommissioned). *(§4 constraint guardrail)*
**Constraint guardrails (from §4):** re-confirm volatile `LLM_AGENT_ID 12847293847561029384` + platform `0x037Bb9…6776` against the Agent Explorer FIRST (the school-leg probe doubles as the agent-ID liveness probe); keep v1 `0xfA428171…` reachable; do NOT alter the join's hardcoded `chainId = 137` (the 137→31337 override is a documented frontend accommodation, NOT a backend change); funded STT (>50 STT) key is in `contracts/.env` — a recorded run is acceptable, an unverifiable claim is not.
**Notes**: NO new contract development — the two-leg API is source-complete + offline-proven (Phase 12, 19/19). This phase REDEPLOYS the existing source (non-upgradeable → new address). The runner `contracts/script/macro-hedge-strategist-e2e.sh` (v1) is ADAPTED here: re-point `requestActionDecision`/`requestSizeDecision`/`getDecision` → `requestSchoolDecision`/`requestNotionalDecision`/`getMandate`+`decisionState`, and the polled log sig `HedgeDecisionMade(...)` → `StrategistDecided(bytes32,string,(address,bytes32,uint256,uint32,bool))`.
**Plans**: 1 plan (1 wave — deploy + cheap school-leg liveness probe are a strict spend-gated chain in ONE autonomous plan; the surface re-confirm gates the STT spend intra-plan per §4)
- [x] 17-01-PLAN.md — Adapt the v1 e2e runner to the two-leg `StrategistDecided` API + a pre-spend surface re-confirm gate, then deploy live to Somnia 50312 (NEW address), verify the three immutables, run ONE `requestSchoolDecision` liveness probe (`schoolSet==true`, NOT `DecisionFailed`), and re-confirm v1 `0xfA428171…` reachable *(LIVEDEP-01)* ✅ 2026-06-08 (NEW `0xf0570CcB…7b1D`, schoolSet==true label `SHILLER_MACRO_RISK`, v1 reachable; school-leg tx `0xdbc1e636…1d165b`)

### Phase 18: On-chain decision-moves proof + publish
**Goal**: The live deploy is PROVEN on-chain — a real prompt yields a well-formed `HedgeMandate` (with `schoolSet && notionalSet`), a different consensus yields a DIFFERENT mandate (decision-moves), all captured as real tx hashes — and the address + ABI + exact call inputs are PUBLISHED so the frontend can mirror them.
**Depends on**: Phase 17 (the live, surface-verified deploy + the adapted runner).
**Requirements**: LIVEDEP-02, LIVEDEP-03, LIVEDEP-04, LIVEDEP-05
**Success Criteria** (what must be TRUE):
  1. A `StrategistDecided` tx on Somnia 50312 from the NEW address has a non-empty `school` and a decoded `HedgeMandate` with `economicTheory != 0x0` and `targetNotional ∈ [1_000, 100_000_000]`; `cast call <new-address> "decisionState(bytes32)" <decisionId>` returns `schoolSet == true && notionalSet == true`. *(LIVEDEP-02)*
  2. A SECOND run with a different consensus (or userIntent) yields a DIFFERENT mandate — the school label and/or `targetNotional` differ from run 1 (the decision-moves-with-consensus proof, mirroring the Phase-11 precedent). *(LIVEDEP-03)*
  3. `contracts/script/out/somnia-strategist-deployment.json` exists, parses as JSON, and contains the NEW `strategist` address plus THREE real tx hashes (`schoolTx`, `notionalTx`, `strategistDecidedTx`) that resolve on the Somnia 50312 explorer; the generated ABI at `contracts/out/MacroHedgeStrategist.sol/…` is committed. *(LIVEDEP-04)*
  4. `docs/UI-AGENT-HANDOFF.md` marks the two-leg strategist ✅ LIVE with the new address, and its §6 "do NOT subscribe to a live `StrategistDecided` on Somnia" guidance is REVERSED (grep confirms the prohibition line is replaced with the LIVE-subscribe instruction + new address). *(LIVEDEP-05)*
**Constraint guardrails (from §4):** real tx hashes are MANDATORY (a recorded run is acceptable, an unverifiable claim is not); Somnia validator-callback latency is variable (the runner tolerates async per-leg polling + timeouts); do NOT alter the join's `chainId = 137`.
**Notes**: the decision-moves proof reuses the Phase-11 precedent (two consensus values → two distinct decisions). The published artifact mirrors the shape of `contracts/script/out/buildbear-deployments.json`. This phase spends STT — Phase 17's surface verification de-risks that spend.
**Plans**: TBD

## v2.1 Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 17. Live deploy + pre-flight surface verification | 1/1 | Complete   | 2026-06-08 |
| 18. On-chain decision-moves proof + publish | 0/0 | Not started | - |

## v2.1 Traceability (LIVEDEP requirements → phases)

| Requirement | Phase | Status |
|---|---|---|
| LIVEDEP-01 | Phase 17 | Complete |
| LIVEDEP-02 | Phase 18 | Pending |
| LIVEDEP-03 | Phase 18 | Pending |
| LIVEDEP-04 | Phase 18 | Pending |
| LIVEDEP-05 | Phase 18 | Pending |

---
*v2.1 roadmap appended: 2026-06-08 — Live Agent Integration (Somnia two-leg strategist live deploy). APPENDS to the OPEN v2.0 roadmap (phases 7–16 untouched). Phase numbering continues at 17. Split into 2 phases for the §4 spend-gating sequencing reason (verify volatile surface → THEN spend STT on the prove run). Source of truth: `docs/FRONTEND-REQUEST-2026-06-07-strategist-live-deploy.md`. All phase PLANs must pass the three-step planning-review gate (CLAUDE.md) before execution.*
