# Phase 14: Representativeness derivation (Agent 2 brain) — pool-mirrors-risk → geometry - Context

**Gathered:** 2026-06-06
**Status:** Ready for planning
**Grounding:** the user's local Post-Keynesian (PKE) framework `~/learning/post-keynesian/` — explored + synthesized this session (see Canonical References). The macro-thesis interface + the representativeness model are PKE-grounded, NOT a neoclassical correlation/basis-ratio.

<domain>
## Phase Boundary

The **Agent-2 "representativeness brain"**: it takes Agent-1's `HedgeMandate` (`{economicTheory, underlyingMarket, targetNotional, chainId, isLong}`), runs a **PKE-grounded representativeness model** of how well the wCOP/USDC pool mirrors the COP/USD inflation/depreciation risk the mandate names, **derives the `HedgeLegParams` geometry** (strike/width/feasible-size = the "inflation adjustment"), and mints via an additive **`resolveFromMandate`** front-end on the **shipped Phase-13 `MacroHedgeExecutor` mint core** (the committed `resolveAndMint(HedgeLegParams)` stays the direct path; the mint core is REUSED, not rebuilt). Delivers REPR-01 (the representativeness measure + its surfacing) and REPR-02 (`resolveFromMandate` derives a well-formed `HedgeLegParams` and mints; the Polygon-fork mint is green through this path).

**Out of scope (deferred / other tracks):** the live econometric estimation pipeline (Bai-Perron / SVAR / SFC simulation — the off-chain `abrigo-analytics` track); the full composite representativeness (hierarchy-premium + full Davidson test battery); the SHILLER brain; the UI E2E (Phase 15). Discussion clarified HOW the brain computes representativeness + derives geometry.

</domain>

<decisions>
## Implementation Decisions

### IMacroThesis interface — thin registry + school-keyed brain strategy
- `IMacroThesis` STAYS the handle-resolving registry from Phase 12 (do NOT bloat it into a polymorphic per-method interface). The resolved `economicTheory` handle KEYS a **brain-side strategy** the Agent-2 brain runs. Schools are mechanically distinct via the *strategy* (different strategy → different geometry), satisfying the binding constraint without new contract surface.
- **POST_KEYNESIAN is the ONE implemented strategy** this phase (Scenario 1 IS the PKE wage-earner FX hedge). **SHILLER stays a documented reserved slot** (the registry already resolves the label; its strategy is a stub/deferred).

### Representativeness model — the regime-conditional passthrough CORE (NOT a correlation)
- Representativeness is the PKE composite, but the **demo computes the regime-conditional passthrough core**:
  - the **"inflation adjustment" = β₁(REGIME) × target-devaluation**, conditioned on a regime indicator **Z_t** — this drives the cap/width (the wage-earner example's `M = β₁·devaluation`). β₁(REGIME) is the load-bearing distinctive PKE piece: **asymmetric** (β₁(STRESS) > β₁(TRANQUIL)) and allowed to **break across regimes** (NOT a stationary covariance).
  - a **pool-liquidity-depth feasibility gate** (on-chain): can the pool absorb the sized position at the structural strikes?
  - a **Davidson honesty flag**: the *parametric* share is hedged; the *non-ergodic* remainder is **disclosed, not hedged** (surfaced, never silently implied as covered).
- The **"inflation adjustment" is the wage-share-specific passthrough applied to the target devaluation — NOT a CPI index level** (hedging a generic index is "incoherent" per `conflict-inflation-hein.md`).
- **The binding constraint (honesty test):** the derived geometry MUST show **≥1 parameter that quantitatively differs from a stationary-vol/GBM baseline** (the asymmetric β₁-driven cap and/or the regime-conditional width) — else the school label is rhetoric.

### Data + on/off-chain split — deterministic core + inferToolsChat narrative
- **The GEOMETRY is deterministic:** on-chain pool reads (liquidity depth, pool-derived realised vol) + a **regime oracle** feeding `Z_t` + a **pre-computed β₁(REGIME)** parameter (from the off-chain econometrics). **Fail-safe: default to the STRESS multiplier on oracle staleness** (the example's §3.6 guardrail).
- **`inferToolsChat` is the SURFACED reasoning/narrative layer** — it produces the `ExecutorDecided` representativeness rationale for the UI (the agent's "why this pool is/ isn't representative" explanation). It **explains; it does NOT drive the deterministic geometry math.** (Decouples reliability from the live LLM round-trip.)
- **On-chain / native:** pool liquidity + reserves, pool-derived realised vol, the geometry derivation, the regime-multiplier *application*, the resulting score + honesty flag.
- **Off-chain (oracle / attestation / pre-computed param):** EMBI Colombia, VIX, CIP residual, DANE CPI decomposition, the fitted β₁(REGIME), the Davidson decidable-procedure tests, the Z_t regime classification.

### Demo fidelity — faithful structure, stubbed numbers, TEMPLATE-labeled
- Keep the **PKE structure** (mechanism-membership framing + regime-conditional passthrough + honesty split) with **stubbed/oracle-fed numbers**, and carry an explicit **TEMPLATE banner** (as `wage-earner-fx-hedge-colombia.md` does: "placeholder numbers, not deployment-ready").
- Demonstrate the GBM-divergence (the ≥1-param-≠-GBM binding constraint) visibly.

### Claude's Discretion (planning/research may decide)
- The exact β₁(REGIME) values + the Z_t thresholds (illustrative-vintage from the wage-earner example: β₁≈0.10 tranquil / 0.35 stress; Z_t from EMBI>350bp / VIX>30 / 1m realised-vol>18% / TRM-intervention; treat as stubs to confirm).
- The **instrument-direction convention** (RESEARCH GATE): the wage-earner example is a capped **put-spread on COP-per-USD** (depreciation = S↑); our cornerstone is framed as a "long cCOP/USD call" minted via `PayoffTerms` `isLong`/`asset` on the wCOP/USDC pool. Reconcile the convention so the derived geometry actually pays on COP depreciation (the wage-earner's loss direction).
- The regime-oracle interface shape (an `IRegimeOracle` returning Z_t + staleness); how the honesty flag + the TEMPLATE caveat surface on-chain (event/field) AND on the UI.
- How β₁(REGIME) + Z_t are passed in (constructor immutable vs settable param vs oracle read) and the `resolveFromMandate` signature + its wiring to the shipped mint sink.
- Whether `inferToolsChat` is live this phase or its narrative is stubbed (the deterministic geometry must not depend on it either way).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### PKE economic grounding (the user's local framework — absolute paths, external to the repo)
- `/home/jmsbpp/learning/post-keynesian/applications/examples/wage-earner-fx-hedge-colombia.md` — **THE Scenario-1 worked example**: the capped instrument, `K_lo/K_hi/M` set by macro structure (not GBM), `M = β₁·devaluation`, the two-state mixture-of-normals S_T model, the regime-conditional fee off Z_t, the honesty statement (what's NOT hedged). NOTE its explicit TEMPLATE/placeholder-numbers banner.
- `/home/jmsbpp/learning/post-keynesian/applications/_workflow/{01-question-formulation,02-payoff-design,03-cfmm-derivation,04-econometric-validation,05-simulation-experiment}.md` — the question→payoff→CFMM→validation→simulation pipeline (the representativeness-derivation methodology; step-02 Davidson honesty filter; step-03 the binding constraint that ≥1 param must differ from GBM).
- `/home/jmsbpp/learning/post-keynesian/principles/finance/davidson-uncertainty-vs-risk.md` — uncertainty-vs-risk (the ontological reason representativeness ≠ stationary correlation; the 4-condition decidable procedure → the parametric/non-ergodic honesty split).
- `/home/jmsbpp/learning/post-keynesian/vs-neoclassical/black-scholes-vs-pke-finance.md` — what ports (convex-analytic/pathwise) vs what doesn't (measure-theoretic/ergodic/BS pricing); why convex; Panoptic ticks AS the on-chain strike-grid constructor.
- `/home/jmsbpp/learning/post-keynesian/principles/exchange-rates/{currency-hierarchy,kaltenbrunner-minskyan-fx,harvey-expectations-capital-flows}.md` — the FX risk structure (hierarchy liquidity premium; jump/asymmetric depreciation; convention-driven expectations).
- `/home/jmsbpp/learning/post-keynesian/principles/distribution/conflict-inflation-hein.md` — inflation as distributional conflict (the "inflation adjustment" must be wage-share passthrough, NOT a CPI index).
- `/home/jmsbpp/learning/post-keynesian/principles/colombia-context/peripheral-financialization.md` — the capital-account→FX→tradables-CPI→real-wage transmission (the structural mechanism membership).
- `/home/jmsbpp/learning/post-keynesian/{MANIFESTO.md,CLAUDE.md}` — framing; note CLAUDE.md scopes Solidity OUT (Phase 14 is the novel translation the framework declines) + the wage-led/profit-led tension (Manifesto §8, deferred).

### On-chain types + the mint core to wire into (this repo)
- `contracts/src/MacroHedgeExecutor.sol` (shipped Phase 13) — the mint core; add the additive `resolveFromMandate(HedgeMandate)` front-end; `resolveAndMint(HedgeLegParams)` stays the direct path.
- `contracts/test/fork/DemoMacroHedgeExecutor.fork.t.sol` — `resolvePositionFromHedgeParams` + the `PanopticQuery` pool-state reads (the on-chain liquidity/realised-vol surface for the feasibility gate).
- `contracts/src/types/{HedgeMandate,HedgeLegParams,PayoffTerms}.sol` — the input mandate + the output geometry (`PayoffTerms = {vol(uint88), horizonBlocks, tickSpacing, asset, riskPartner}` is where the regime-conditional width/vol lands).
- `contracts/src/interfaces/IMacroThesis.sol` + the `MacroThesisRegistry` (Phase 12) — the thin registry the POST_KEYNESIAN strategy is keyed off.
- `.planning/phases/12-macrohedgestrategist-agent-1-prompt-instrument-specification/12-CONTEXT.md` + `13-*` — the upstream mandate + the mint-core decisions.

### Project guardrails
- `CLAUDE.md` (project) — the domain non-negotiable: "Convex perpetual (Panoptic) strictly dominates linear hedge whenever vol-of-vol>0, positive skew/fat tails, Hawkes self-excitation, or stablecoin depeg" (exactly the PKE asymmetric/jump FX structure); SOMI price classes; testnet posture; the three-step planning-review gate this PLAN must pass.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- The shipped `MacroHedgeExecutor` mint core (`resolveAndMint` + the short-then-long `dispatch`) — `resolveFromMandate` derives `HedgeLegParams` then calls the SAME internal mint sink.
- `PanopticQuery` (used in the demo) — on-chain pool liquidity/state reads for the feasibility gate + pool-derived realised vol.
- `MacroThesisRegistry` (Phase 12) — the handle-resolving registry the POST_KEYNESIAN strategy keys off; `promptBias("POST_KEYNESIAN")` already says "fundamental uncertainty, liquidity preference, balance-of-payments pressure" (PKE-faithful at the slogan level).
- `HedgeMandate` / `HedgeLegParams` / `PayoffTerms` — the input/output types (Phase 12/13).

### Established Patterns
- `is SomniaAgentConsumer` two-entrypoint / `decisionId` / inherited auth-CEI-replay / try-catch decode-safety (Phase 11/12) — reuse for the `inferToolsChat` narrative leg if live.
- The Phase-13 atomic-`AccountInsolvent` solvency gate (the mint reverts if under-collateralized) — still the protective gate; the feasibility check is ADVISORY/pre-flight, the atomic gate is final.
- evm-TDD Iron Law; bulloak 0.9.2 `when/it`; Polygon-fork tests via `make test-demo` (cached chain-137 state); the `{fork,invariants}` path-glob regression gate.

### Integration Points
- `HedgeMandate` (Agent 1, Phase 12) → `resolveFromMandate` → derived `HedgeLegParams` → the shipped mint sink (Phase 13) → the Polygon wCOP/USDC Panoptic position.
- `Z_t` regime oracle + pre-computed β₁(REGIME) → the deterministic geometry; `inferToolsChat` → the `ExecutorDecided` UI narrative.
- `ExecutorDecided` event → the UI (the surfaced representativeness decision + the honesty flag + the TEMPLATE caveat).

</code_context>

<specifics>
## Specific Ideas
- **Representativeness ≠ correlation/basis-ratio** (it presupposes the ergodicity PKE denies). It is: structural-mechanism membership × regime-conditional asymmetric **β₁(REGIME)** × currency-hierarchy premium × a Davidson parametric/non-ergodic honesty split, conditioned on **Z_t**. The demo computes the **β₁(REGIME)×devaluation core** + liquidity gate + honesty flag.
- The wage-earner example's illustrative params (STUBS to confirm): `K_lo = S₀·1.05`, `K_hi = S₀·1.15` (95th pct tranquil-subsample), `M = 0.10·S₀` from β₁≈0.30–0.35 on a 15% devaluation; two-state mixture (tranquil σ≈0.08 / stress σ≈0.22, fat right tail); Z_t from EMBI>350bp / VIX>30 / realised-vol>18% / TRM-intervention; fee multiplier g=1 tranquil / 2–3 stress; **default-to-stress on oracle staleness**.
- **Panoptic V2 tick geometry IS the on-chain strike-grid constructor** — the framework flagged "no liquid COP/USD strike continuum" as an open problem; our tick geometry answers it. Make this a stated design strength.
- TEMPLATE discipline: stubbed numbers + an explicit caveat, exactly as the source example labels itself. Deadline ~June 11.

## Research Gates (resolve in RESEARCH before planning)
- The instrument-direction convention reconciliation (put-spread-on-COP/USD vs the wCOP/USDC `PayoffTerms` `isLong`/`asset` geometry → must pay on COP depreciation).
- The `resolveFromMandate` signature + how β₁(REGIME)/Z_t are supplied (oracle interface vs pre-computed param) + the fail-safe wiring.
- Which pool reads (`PanopticQuery`) give the liquidity-depth feasibility signal + pool realised vol; what's genuinely on-chain-derivable vs needs the oracle.
- Whether `inferToolsChat` is live this phase (narrative) or stubbed; its `ExecutorDecided` shape.

</specifics>

<deferred>
## Deferred Ideas
- **Full composite representativeness** — the currency-hierarchy liquidity-premium adjustment + the full Davidson test battery (BDS/ADF/Bai-Perron/pseudo-OOS). The demo computes the β₁(REGIME) core + honesty flag; the rest is disclosed-but-stubbed.
- **The SHILLER brain** — a mechanically-distinct second strategy; reserved registry slot, deferred (POST_KEYNESIAN-only this phase).
- **The live econometric estimation pipeline** — Bai-Perron breaks / SVAR / regime-switching estimation / SFC simulation (the off-chain `abrigo-analytics` track produces the β₁(REGIME) the brain consumes; not built here).
- **Wage-led/profit-led aggregate tension** (Manifesto §8) — a faithful thesis would surface that a wage-protective hedge may be contractionary if Colombia is profit-led; deferred / disclosed, not modeled in the demo geometry.

</deferred>

---

*Phase: 14-representativeness-derivation*
*Context gathered: 2026-06-06*
