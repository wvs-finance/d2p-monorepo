# Requirements: abrigo-somnia v2.0 — Convex Instrument (cCOP/USD long-gamma)

**Defined:** 2026-06-01
**Core Value:** A TE-sized long-gamma cCOP/USD hedge on borrowed-Panoptic-V2-data-model contracts (Base-fork demo), with a premium that carries a data-cost-weighted reimbursement.
**Scope:** Hackathon demo, testnet/fork only (never production). Panoptic **V2 (Uniswap V4) on a Base fork**; M1 econometrics parked (snapshots in `.planning/*-M1-donor-transfer-2026-06-01.md`).

## v1 Requirements (the demo loop)

### FORK — Base-fork + borrowed Panoptic V2
- [x] **FORK-01**: Foundry Base-fork harness (UniV4 PoolManager + a stable token), `forge` + `bulloak`, with a BUSL NOTICE for borrowed Panoptic code
- [x] **FORK-02**: Deploy our own cCOP/USDC UniV4 pool (mock cCOP, realistic params) on the fork
- [x] **FORK-03**: Borrow a minimal Panoptic V2 core behind an `IPanopticData` interface (demo-scoped)

### WRAP — long-gamma cash-flow
- [x] **WRAP-01**: User deposits upfront collateral into `LongGammaWrapper`, which owns the position on their behalf
- [x] **WRAP-02**: Wrapper mints a long-gamma (`isLong`) position on the cCOP/USDC pool
- [x] **WRAP-03**: Streamia accrues against collateral (read from the contract), including involuntary-close branches (`forceExercise`/`settleLongPremium`/liquidation)
- [x] **WRAP-04**: Burn closes the position and computes the residual from surviving collateral at actual close

### FEE — premium split + data-cost reimbursement
- [ ] **FEE-01**: `PremiumSplitter` decomposes a premium into `π_panoptic + μ_LP + φ_data`
- [ ] **FEE-02**: `CapitalRemunerationVault` (ERC-4626) receives `φ_data` (mutualized fixed $199) with a no-double-count conservation invariant vs the per-position hedge cost
- [ ] **FEE-03**: User reimbursement = surviving collateral − streamia − commission − metered hedge-data cost (data-cost-weighted residual)

### SIZE — oracle sizing
- [ ] **SIZE-01**: `MacroOracle` exposes a CPI surprise (adds EME consensus + σ so `s_t = (actual − consensus)/σ` is computable)
- [ ] **SIZE-02**: `PositionBuilder` sizes notional/strike from `s_t` + the cCOP/USD mark (`te/fx/usdcop`), with the CPI→FX linkage flagged `linkage_validated:false`

### CORNERSTONE — Scenario-1 two-agent slice, UI → contracts (Agentathon deliverable)
*ONE E2E test (`CHECKPOINT.md`): prompt → Agent 1 **hedge-mandate** → Agent 2 **representativeness derivation** + mint (shown on UI) → a basic live read. **Polygon fork / real wCOP/USDC** (pivot 2026-06-02); Panoptic V2 via `DeployProtocol`. Agent 2's resolver/mint/risk-quote core was committed in `contracts/test/fork/DemoMacroHedgeExecutor.fork.t.sol` and **promoted to the deployable `MacroHedgeExecutor` in Phase 13 ✅**. Composite over Somnia's 3 base classes (custom agents are Phase-2, not buildable). **MVP critical path = Phase 11 ✅ → 12 (mandate) → 14 (representativeness) → 15 (E2E), reusing Phase 13 ✅ (mint core)**; deferred behind the cornerstone = DATA-01/02, MON-01, `HEDGE-01`, Phases 9–10. Deadline ~June 11 2026.*
*Agent1/Agent2 boundary (corrected 2026-06-06): **Agent 1 emits only a `HedgeMandate`** (inferred economic school + direction + target notional); the **moneyness/strike/width/size geometry is Agent 2's representativeness-driven output** (a dedicated mathematical model — Phase 14), derived from the mandate via `resolveFromMandate` and minted through the shipped core.*
- [x] **AGENT-01..04**: `MacroHedgeStrategist` **v1** (lean decision agent) — `ILLMAgent` interface + the `is SomniaAgentConsumer` contract + unit suite + the Somnia-testnet live e2e (decision-moves-with-consensus, CONSUMER `0xfA428171E1F5B56f92C67C002De1d8e90B053EE1`) + `contracts-ci.yml`. **Complete** *(Phase 11)*
- [x] **STRAT-01**: upgrade v1's output to a **`HedgeMandate`**: `MacroHedgeStrategist` + concrete `IMacroThesis` **named-thesis registry**; via two `llm-inference` legs (`inferString` → the economic school **inferred from the prompt**; `inferNumber` → the target notional) it emits a mandate; a Somnia-testnet run proves a well-formed mandate, rejects non-`PLATFORM`/replayed, and a different prompt → a different mandate *(Phase 12)* ✅ 12-02 (commits 6fe4c32 RED → 7101acb GREEN; the two-leg school/notional flow + `StrategistDecided(decisionId, school, HedgeMandate)` unit-proven **19/19 offline against MockPlatform**, incl. non-PLATFORM/replay rejection + the cross-block join; the **live "different prompt → different mandate" on Somnia testnet is a DEFERRED Manual-Only `workflow_dispatch` follow-up per 12-VALIDATION §Manual-Only / 12-02 M4**, NOT a CI gate)
- [x] **STRAT-02**: the emitted `HedgeMandate` is well-formed + **consumable by Agent 2's representativeness derivation** — `underlyingMarket` anchored to the committed **`POLYGON_WCOP_USDC_POOL_ID`** constant (Agent 1 can't produce a runtime PoolId), the school address resolvable, the target notional in-range — so Phase 14 can derive a `HedgeLegParams` from it (the geometry/`TokenId` round-trip moves to Phase 14) *(Phase 12)* ✅ 12-02 (commit 7101acb; `getMandate(decisionId)` returns `underlyingMarket == POLYGON_WCOP_USDC_POOL_ID()`, `economicTheory` non-zero, `targetNotional ∈ [1_000, 100_000_000]`, `chainId == 137`, `isLong == true` — asserted field-by-field; the four pass-through field types copy into a `HedgeLegParams` scratch struct, a compile-time Phase-14 hand-off-readiness proof with NO geometry)
- [x] **EXEC-01**: promote the demo resolver → deployable `MacroHedgeExecutor is SomniaAgentConsumer`: consumes `HedgeLegParams` via `llm-inference`, runs the pool-representativeness analysis (decision surfaced on an event for the UI), mints on the Polygon wCOP/USDC V2 pool (the `test__takeDemoPosition__Succeeds` lineage, green through the real executor) *(Phase 13)*
- [x] **EXEC-02**: collateral gating is the **protocol-native atomic `AccountInsolvent` revert** at `_validateSolvency` (post-mint-state-write; an under-funded executor → the mint reverts, no position persists) — NOT a pre-mint quote (`quoteCollateralRequirements` on the unminted position reverts `PositionNotOwned`, `PanopticPool.sol:559` / commit `67acc91`). A POST-mint `quoteCollateralRequirements` `BalanceDelta` read is informational. *(Phase 13)*
- [x] **EXEC-03**: `OperationalCostManagement` accrues the cumulative agent-call + data cost across Agent 1 + Agent 2 (`cummCost`), with a no-double-count conservation check *(Phase 13)* ✅ 2026-06-06 (13-03) — `invariant_costConserved` (`cummCostSomi == Σ_d costOf[d].agentCostSomi`) + per-`(decisionId,leg)` idempotency, both mutation-proven non-vacuous by TWO DISTINCT mutations (conservation: asymmetric drift `882…3505≠0`; idempotency: dropped-guard `14≠7`, conservation blind to symmetric double-count)
- [x] **REPR-01**: a dedicated **representativeness** analysis — an agent **tool-calls** (RPC/queries) over the live wCOP/USDC pool activity (on-chain liquidity/TVL via `PanopticQuery`; volume/depth via tool-calls) and computes a **parameterized mathematical model** of how representative the pool is of the target COP-inflation risk (the "inflation adjustment"), with the measure + parameters surfaced for the UI (`ExecutorDecided`) *(Phase 14)* ✅ 14-01 (the pure `RepresentativenessLib` β₁(REGIME)×devaluation core + GBM comparator, unit 17/17) + 14-03 (commit `e686d4d`) — the 8-param `ExecutorDecided` fork-proven on the mint path (`test_executorDecided_surfacesHonestyFlag`: `nonErgodicDisclosed == true` + the TEMPLATE caveat decoded from the live Polygon-fork mint)
- [x] **REPR-02**: `resolveFromMandate(HedgeMandate)` derives a well-formed `HedgeLegParams` (moneyness/strike/width/feasible-size; size in the `optionRatio ≤127` bound) from the mandate + the representativeness measure and mints via the **shipped** `MacroHedgeExecutor` core (the Polygon-fork mint green through this path); the live `inferToolsChat` tool-calling round-trip = STRETCH *(Phase 14)* ✅ 14-02 (the additive `resolveFromMandate` front-end + Fix-C sink split) + 14-03 (commit `e686d4d`) — the mandate→geometry→mint is FORK-PROVEN: `test_resolveFromMandate_mintsThroughExecutor` mints a real wCOP/USDC position with `strike == 360360` EXACT + `numberOfLegs(exec) > 0`; the `volToWidth` even-snap fix (RED→GREEN, ancestry `f92b0f7`→`e686d4d`) resolved the STRESS-width `InvalidTickBound()`; size>127 guard + behavioral LLM-independence (MockRevertingPlatform) both green; live `inferToolsChat` stays STRETCH
- [ ] **E2E-01**: ONE end-to-end run reproduces Scenario 1 from the UI prompt → minted position + a **basic** live read (mark/margin via `PanopticQuery`/`RiskManagement`, NOT a monitoring agent), Agent 2's decision surfaced mid-flow — the judges' artifact *(Phase 15)*
- [x] **E2E-02**: `contracts-ci.yml` gates the repo (`forge build` + per-file `bulloak check` + fork tests with a `polygon` Actions secret + Foundry RPC cache + sharding); live e2e stays manual `workflow_dispatch` *(Phase 15)*
- [x] **SHILLER-01**: `resolveFromMandate`/`Representativeness` BRANCH on the mandate's economic school — `SHILLER_MACRO_RISK` derives a genuine narrative-driven-mispricing / tail-macro-risk geometry DISTINCT from the POST_KEYNESIAN regime/β₁ model (today the geometry is school-agnostic/regime-driven/TEMPLATE; the school is a label only). Grounded in `research/macro-markets-colombia/`. *(Phase 16, POST-MVP)* ✅ 2026-06-07 — 16-01 (lib substrate) + 16-02 (the branch): `resolveFromMandate` branches on `mandate.economicTheory`; SHILLER (0x5) surprise-driven convex arm fork-mints 361200 ≠ PKE 360360; per-school honesty (Shiller/UNVALIDATED vs post-Keynesian); PKE regression anchor un-regressed; open-Q3 resolved (depreciation-only-v1, s<0 K_lo underflows dispatch on fork)
- [x] **SHILLER-02**: a whole-workflow integration test suite at the agent-interaction layer (prompt → Agent-1 selects school → `HedgeMandate` → Agent-2 school-specific geometry → mint) across multiple Colombian macro-risk scenarios under BOTH frameworks (Shiller + post-Keynesian), proving the school selection drives differentiated geometry end-to-end. *(Phase 16, POST-MVP)* ✅ 2026-06-07 — 16-03 `MacroWorkflow.fork.t.sol`: Agent-1 (in-VM MockPlatform) → `getMandate` → Agent-2 `resolveFromMandate` fork-mint; 4 Colombian scenarios × 2 schools, 6/6 green on the Polygon fork; same-input-different-geometry proven NON-trivially (intra-school SIZE monotonicity 62<90 + flip-only-the-sentinel 0x5↔0x6 with identical oracles)

## Deferred (stretch — after the loop works)

### PAY — x402 entry
- **PAY-01**: Deposit via x402 on Base (keeper/off-chain entry)

### XCHAIN — Reactive cross-chain
- **XCHAIN-01**: Reactive callback dual-auth (CallbackProxy + RVM-id) + replay nonce; DATA_PAYMENT→vault, PREMIUM→PositionBuilder

### HEDGE — live delta-hedge
- **HEDGE-01**: External delta-hedge keeper trades the underlying (v1 meters the data cost with a stubbed hedge)

## Out of Scope

| Feature | Reason |
|---|---|
| Production / mainnet deployment | Hackathon demo only; keeps borrowed Panoptic V2 (BUSL-1.1) in permitted non-production use |
| Real Celo cCOP pool | cCOP pool is UniV3/Celo; V2 is UniV4/Base — incompatible; we deploy our own demo pool |
| Canonical Panoptic V2 integration | Borrow the data model now; swap to a canonical V2 deployment later (repoint `IPanopticData`) |
| CPI→FX transfer-function calibration | Belongs to the parked M1 donor-transfer econometrics track |
| Real money / real users | Demo |

## Traceability

Mapped by the roadmapper (2026-06-01). Coverage: 12/12 v1 requirements → exactly one active phase; 0 orphans. Deferred items carry no active phase. See `.planning/ROADMAP.md` (phases 7–10).

| Requirement | Phase | Status |
|---|---|---|
| FORK-01 | Phase 7 | Complete |
| FORK-02 | Phase 7 | Complete |
| FORK-03 | Phase 7 | Complete |
| WRAP-01 | Phase 8 | Complete (08-03: wrapper-owns custody fork-proven, 5/5 on Base fork) |
| WRAP-02 | Phase 8 | Complete (08-03: isLong=1 mint fork-proven, 5/5 on Base fork) |
| WRAP-03 | Phase 8 | Complete (surface 08-01; streamia READ fork-proven 08-04 6/6; three involuntary dispatchFrom branches fork-proven 08-06 — settleLong stays-Open / forceExercise / liquidation close, 2/2 each) |
| WRAP-04 | Phase 8 | Complete (08-05: close() voluntary burn SC-5 + claimResidual() surviving-collateral residual, CEI + cap-aware + idempotent; fork-proven close 6/6 + claimResidual 7/7 on Base) |
| FEE-01 | Phase 9 | Pending |
| FEE-02 | Phase 9 | Pending |
| FEE-03 | Phase 9 | Pending |
| SIZE-01 | Phase 10 | Pending |
| SIZE-02 | Phase 10 | Pending |
| AGENT-01 | Phase 11 | Complete |
| AGENT-02 | Phase 11 | Complete |
| AGENT-03 | Phase 11 | Complete |
| AGENT-04 | Phase 11 | Complete |
| STRAT-01 | Phase 12 | Complete |
| STRAT-02 | Phase 12 | Complete |
| EXEC-01 | Phase 13 | Complete |
| EXEC-02 | Phase 13 | Complete |
| EXEC-03 | Phase 13 | ✅ Complete (13-03) |
| REPR-01 | Phase 14 | Complete |
| REPR-02 | Phase 14 | Complete |
| E2E-01 | Phase 15 | Pending |
| E2E-02 | Phase 15 | Complete |
| SHILLER-01 | Phase 16 | Complete (16-01 + 16-02, fork-proven 2026-06-07) |
| SHILLER-02 | Phase 16 | Complete (16-03, fork-proven 2026-06-07) |
| DATA-01 | Deferred | Future (post-cornerstone) |
| DATA-02 | Deferred | Future (post-cornerstone) |
| MON-01 | Deferred | Future (monitoring agent — basic read in Phase 15) |
| PAY-01 | Deferred | Future (no active phase) |
| XCHAIN-01 | Deferred | Future (no active phase) |
| HEDGE-01 | Deferred | Future (no active phase) |
| LIVEDEP-01 | Phase 17 (v2.1) | Complete |
| LIVEDEP-02 | Phase 18 (v2.1) | Pending |
| LIVEDEP-03 | Phase 18 (v2.1) | Pending |
| LIVEDEP-04 | Phase 18 (v2.1) | Pending |
| LIVEDEP-05 | Phase 18 (v2.1) | Pending |

---

## v2.1 Requirements — Live Agent Integration (Somnia two-leg strategist deploy)

**Defined:** 2026-06-07. **Source:** `docs/FRONTEND-REQUEST-2026-06-07-strategist-live-deploy.md` (§2 deliverable, §3 acceptance, §4 constraints). Backend half of the frontend live-Agent-1 path; phases 17 (deploy + pre-flight surface verification) + 18 (decision-moves proof + publish).

### Live Deploy

- [x] **LIVEDEP-01**: The two-leg `MacroHedgeStrategist` (`StrategistDecided` API: `requestSchoolDecision` → `requestNotionalDecision` → `StrategistDecided`) is deployed to Somnia 50312 at a NEW address, wired to the live platform `0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776`, LLM agent `12847293847561029384`, and `MacroOracle` `0xAcA75144f644220f1dEAD5F989C350D8e0Cc983f`.
- [ ] **LIVEDEP-02**: An on-chain run produces a `StrategistDecided` tx from the new address with non-empty `school` + decoded `HedgeMandate` (`economicTheory != 0x0`, `targetNotional ∈ [1_000, 100_000_000]`), and `decisionState(decisionId)` returns `schoolSet == true && notionalSet == true`.
- [ ] **LIVEDEP-03**: A second run with a different consensus (or userIntent) yields a DIFFERENT mandate (school label and/or `targetNotional` differ) — the decision-moves-with-consensus proof.
- [ ] **LIVEDEP-04**: `contracts/script/out/somnia-strategist-deployment.json` exists with the new `strategist` address + the three real tx hashes (school / notional / strategistDecided), and the generated ABI (`contracts/out/MacroHedgeStrategist.sol/…`) is committed.
- [ ] **LIVEDEP-05**: `docs/UI-AGENT-HANDOFF.md` marks the two-leg strategist ✅ LIVE with the new address and reverses the §6 "do NOT subscribe to a live `StrategistDecided` on Somnia" guidance.

### Constraints (from request §4)
- Re-confirm the volatile `LLM_AGENT_ID` + platform against the Agent Explorer BEFORE spending STT (a `DecisionFailed`/no-callback ⇒ wrong constant).
- Keep the v1 contract (`0xfA428171…`) reachable — it backs the frontend replay fallback; do NOT decommission.
- Do NOT alter the join's hardcoded `chainId = 137` (the 137→31337 override is a documented frontend accommodation, not a backend change).
- Funded STT account (>50 STT) is in `contracts/.env`; a recorded run is acceptable, an unverifiable claim is not.

### Out of Scope (v2.1)
| Feature | Reason |
|---|---|
| Frontend live-wiring | tracked in the `d2p-frontend` repo's own GSD (its Phase 9) + `cornerstone-live-twochain-PLAN.md` |
| Upgradeable proxy for the strategist | v1 is non-upgradeable; v2.1 redeploys to a new address (proxy migration out of scope) |
| Decommissioning v1 | v1 backs the frontend replay fallback — must stay reachable |

---
*Requirements defined: 2026-06-01 (v2.0, phases 7–10). v2.1 LIVEDEP appended 2026-06-07 (roadmapped 2026-06-08 into phases 17–18).*
