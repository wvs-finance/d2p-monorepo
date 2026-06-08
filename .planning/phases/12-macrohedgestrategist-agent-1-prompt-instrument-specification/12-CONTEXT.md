# Phase 12: `MacroHedgeStrategist` (Agent 1) — prompt → hedge mandate - Context

**Gathered:** 2026-06-06
**Status:** Ready for planning
**⚠ Scope correction (2026-06-06):** during discussion the Agent-1/Agent-2 boundary was corrected — Agent 1 emits a **hedge MANDATE**, NOT a finalized `HedgeLegParams`. The moneyness / strike / width / feasible size are **Agent 2's representativeness-driven outputs**, not constants and not Agent 1's call. This realigns with the ROADMAP's own Phase-13 line ("Agent 2 … does the pool-state / representativeness analysis … the 'inflation adjustment' … sizes the position"). **This ripples into Phase 13 / 14 + STRAT-02 + the ROADMAP — see Cross-Phase Impact.**

<domain>
## Phase Boundary

Upgrade the **live Phase-11 v1 `MacroHedgeStrategist`** (Somnia testnet, CONSUMER `0xfA428171E1F5B56f92C67C002De1d8e90B053EE1`) so it turns the user's **hedging-intent prompt** into a **`HedgeMandate`** — the economic **thesis/school it infers from the prompt**, the **direction**, and a **target notional** (the cash-flow risk to hedge). Agent 1 is the *strategist*: it expresses WHAT to hedge and under WHICH economic school. It does **NOT** finalize the instrument geometry.

Delivers STRAT-01 (concrete `IMacroThesis` registry + a Somnia-testnet run: real prompt → well-formed mandate, rejects non-`PLATFORM`/replay, different prompt → different mandate). **STRAT-02 is REFRAMED** (see Cross-Phase Impact): the round-trip target shifts from "Agent-1 spec → resolver" to "Agent-1 mandate → Agent-2 representativeness derivation → `HedgeLegParams` → resolver."

**Out of scope for Phase 12 (Agent 2 / other phases):** the representativeness analysis + geometry derivation + mint (Agent 2 — Phase 13 extension); the UI E2E (Phase 14). Discussion clarified HOW Agent 1 produces the mandate.

</domain>

<decisions>
## Implementation Decisions

### What Agent 1 emits — a HedgeMandate, NOT a HedgeLegParams (the corrected seam)
- Agent 1 outputs a **mandate**: `{ economicTheory (the inferred school's address), direction/isLong, targetNotional, underlyingMarket = POLYGON_WCOP_USDC_POOL_ID, chainId = 137 }`. It carries the hedge INTENT, not the leg geometry.
- The **moneyness / strikeWAD / width(vol) / feasible size** are explicitly **Agent 2's** representativeness-driven outputs (the "inflation adjustment") — Agent 1 does NOT set them, and they are **not constant**.
- A new **`HedgeMandate`** type is introduced (distinct from `HedgeLegParams`). Exact field set/widths = Claude's discretion at planning; it MUST carry enough for Agent 2 to derive geometry (school, direction, target notional, the pool anchor, chainId).

### Field provenance — 2 inferred legs (reuse the v1 two-entrypoint `decisionId` join)
- **Leg 1 — `inferString`** → the **economic school**, inferred from the prompt, constrained to `allowedValues` from the thesis registry (e.g. `["SHILLER_MACRO_RISK","POST_KEYNESIAN", ...]`). This repurposes the v1's `inferString` (action) leg into the *thesis* decision — Agent 1's core job.
- **Leg 2 — `inferNumber`** → the **target notional** (the cash-flow amount / hedge-intent scalar to hedge). Bounds = Claude's discretion (a sane notional range; NOT the old `[0,10000]` bps and NOT the resolver's `[1,127]` — that size bound now lives in Agent 2's feasible-size derivation).
- **Direction (`isLong`)** is **derived** from the hedge mandate, not a separate leg: for Scenario 1 (hedge COP depreciation/inflation on a received cash flow) → long cCOP/USD call → `isLong = true`. (Whether direction folds into the school-leg reasoning or is a fixed derivation = Claude's discretion.)

### `IMacroThesis` shape (STRAT-01) — named-thesis registry, AGENT-1-INFERRED
- `IMacroThesis` gets a concrete **registry** shape exposing selectable economic schools (`SHILLER_MACRO_RISK`, `POST_KEYNESIAN`, extensible); no longer an empty marker.
- **Agent 1 selects the school itself** (Leg 1 `inferString`) by reasoning over the prompt — the school is genuinely prompt-derived. The chosen school's address fills `mandate.economicTheory`, and the school **biases the prompt** + is the frame Agent 2 operates under ("already-selected economic school").

### Emission (STRAT-01) — assemble + emit the mandate
- Once both legs land on the same `decisionId`, the contract assembles the `HedgeMandate`, stores it by `decisionId`, **emits `StrategistDecided(decisionId, school, HedgeMandate)`** (the UI event), and exposes `getMandate(decisionId)`. Agent 2 consumes this mandate.

### Carried forward from Phase 11 (LOCKED)
- Two-entrypoint `decisionId` join; ONE infer per tx (`_sendRequest` forwards the WHOLE `msg.value`); block-independent `decisionId` from the action/first-leg `requestId`.
- `is SomniaAgentConsumer`; inherited `handleResponse` auth + `pendingRequests` + CEI + replay-revert; `_onResult`-only; try/catch decode-safety → `DecisionFailed` (never bricks the pending request); 32-byte length guard on the int leg.
- `inferString(…, chainOfThought=false, allowedValues)` / `inferNumber(…, min, max, false)`; `LLM_AGENT_ID = 12847293847561029384`; deterministic system-prompt constant. Keeper sequences; `llm-inference` 0.07 SOMI/leg. Somnia-native tests; evm-TDD Iron Law.

### Claude's Discretion
- The `HedgeMandate` field set/widths; the `inferNumber` target-notional bounds + units; whether direction is a derivation or part of the school-leg reasoning; the `IMacroThesis` registry concrete signature (enum-indexed vs address-mapped) + how the school string biases the prompt; prompt wording (deterministic); plan/wave/test organization.

</decisions>

<cross_phase_impact>
## Cross-Phase Impact (MUST reconcile before/during planning)

The vision-faithful choice ripples beyond Phase 12 — flag for the ROADMAP/REQUIREMENTS reconciliation + the Phase-13/14 plans:

1. **New `HedgeMandate` type** (Agent-1 output) distinct from `HedgeLegParams` (Agent-2 derived geometry). Both phases reference it.
2. **Phase 13 gets an ADDITIVE representativeness front-end** (the shipped mint core is REUSED, not torn down): a `resolveFromMandate(HedgeMandate)` path on `MacroHedgeExecutor` that runs the **real** representativeness analysis (pool TVL / liquidity / volume / data via `llm-inference`) → derives moneyness/strike/width/feasible-size → builds `HedgeLegParams` → calls the existing internal mint sink. The committed `resolveAndMint(HedgeLegParams)` stays as the direct/test path.
3. **Representativeness becomes REAL** — the previously-STUBBED Agent-2 step (`RepresentativenessAssessed` source) is now first-class. This is the **biggest remaining build + the critical-path risk for June 11** (esp. volume/TVL data sourcing — on-chain pool liquidity is readable via `PanopticQuery`/PoolManager state, but volume/depth analysis likely needs off-chain data + the `llm-inference` reasoning step).
4. **STRAT-02 REFRAME** (REQUIREMENTS.md): from "the emitted spec round-trips into the exact `HedgeLegParams`" → "Agent 1 emits a well-formed `HedgeMandate`; Agent 2 derives a `HedgeLegParams` from it + representativeness → well-formed `TokenId`." The round-trip moves to the Agent-1→Agent-2→resolver chain.
5. **ROADMAP edits**: Phase 12 title/goal → "prompt → hedge mandate"; Phase 13 goal → explicitly the mandate→representativeness→geometry derivation (un-stub it); the `HedgeMandate`/`HedgeLegParams` two-type hand-off.

</cross_phase_impact>

<canonical_refs>
## Canonical References

### Phase authority / requirements
- `.planning/ROADMAP.md` § Phase 12 + Phase 13 — Goals + SC (note the corrections in Cross-Phase Impact).
- `.planning/REQUIREMENTS.md` — STRAT-01 / STRAT-02 (STRAT-02 to be reframed per above).
- `docs/superpowers/specs/2026-06-02-macro-hedge-strategist-design.md` — the v1 design spec (calling convention).
- `.planning/phases/11-macrohedgestrategist-hedge-decision-agent/11-CONTEXT.md` — the v1 LOCKED decisions carried forward.

### The contract being upgraded + types
- `contracts/src/instrument/MacroHedgeStrategist.sol` — the live v1 (reuse the two-entrypoint flow, `_onResult`, `_mapAction`/`decodeString` try/catch, `decisionId`).
- `contracts/src/interfaces/IMacroThesis.sol` — the empty marker → concrete named-thesis registry (STRAT-01).
- `contracts/src/types/HedgeLegParams.sol` + `PayoffTerms.sol` — Agent 2's DERIVED geometry (the target the mandate resolves into, not Agent 1's direct output).
- `contracts/src/libraries/PolygonPools.sol` — `POLYGON_WCOP_USDC_POOL_ID()` anchor.
- `contracts/src/MacroOracle.sol` — the live datum source the strategist reads (macro print + consensus, as v1).

### Agent-2 / representativeness targets (for the Cross-Phase work)
- `contracts/src/MacroHedgeExecutor.sol` (shipped Phase 13) — the additive `resolveFromMandate` front-end + the reused mint core.
- `contracts/test/fork/DemoMacroHedgeExecutor.fork.t.sol` — `resolvePositionFromHedgeParams` + the `PanopticQuery` pool-state reads (the representativeness data surface: liquidity/TVL).
- `contracts/src/interfaces/ISomniaAgents.sol` — `ILLMAgent`; `agentathon/somnia-agents-examples/contracts/SentimentAnalyzer.sol` — the infer template.
- `docs/UI-AGENT-HANDOFF.md` — `StrategistDecided` / `ExecutorDecided` event schema (keep consistent; `ExecutorDecided` is where representativeness surfaces).

### Project guardrails
- `CLAUDE.md` (project) — SOMI price classes (`llm-inference` 0.07), testnet posture, AND the three-step planning-review gate this PLAN must pass before execution.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- The v1 `MacroHedgeStrategist` two-entrypoint join, `_onResult` routing, decode-safety, `decisionId` — reused; Phase 12 changes WHAT is assembled at the join (a `HedgeMandate`) + the Leg-1 semantics (school, not action).
- `SomniaAgentConsumer` base (auth/CEI/replay); `PolygonPools` anchor; `MacroOracle.latest`.
- The shipped `MacroHedgeExecutor` mint core (reused by the future `resolveFromMandate`); `PanopticQuery` pool-state reads (representativeness data).

### Established Patterns
- Two-entrypoint, one-infer-per-tx, explicit `decisionId` cross-block join; `inferString(allowedValues)`/`inferNumber([min,max])` as structural guardrails; try/catch → `DecisionFailed`; evm-TDD Iron Law; Somnia-native strategist tests (no fork).

### Integration Points
- `StrategistDecided(decisionId, school, HedgeMandate)` → Agent 2's `resolveFromMandate` + the UI.
- Agent 1 infers the school → `IMacroThesis` registry; the mandate's `targetNotional` + school → Agent 2's representativeness-driven geometry derivation.

</code_context>

<specifics>
## Specific Ideas
- The prompt intent: *"hedge the inflation/depreciation risk on a COP cash flow I'm receiving."* Agent 1 = the strategist that frames this; Agent 2 = the executor that judges pool feasibility/representativeness and shapes the actual leg.
- Named-thesis registry: `SHILLER_MACRO_RISK`, `POST_KEYNESIAN` (extensible); Agent 1 infers the school from the prompt.
- Determinism (v1): Qwen3-30B `temperature=0` + fixed seed → consensus on the AI result.
- Deadline ~June 11, 2026; "Autonomous performance" judging — the vision-faithful split (Agent 2 derives geometry from real representativeness) is the strongest autonomy story but the heaviest remaining build.

## Research Gates (resolve in RESEARCH before planning)
- The `HedgeMandate` field set + the `inferNumber` target-notional bounds/units.
- (Agent-2 / cross-phase) the representativeness data surface: which pool metrics (TVL/liquidity via on-chain `PanopticQuery`/PoolManager vs volume/depth via off-chain) feed the moneyness/width/size derivation, and the `llm-inference` representativeness reasoning shape.
- Re-affirm (proven in v1): `LLM_AGENT_ID`, `inferString`/`inferNumber` signatures, `Response.result` decode.

</specifics>

<deferred>
## Deferred / Rejected Alternatives
- **REJECTED (pragmatic path):** Agent 1 emitting a full TARGET `HedgeLegParams` with the representativeness OVERRIDE deferred to a Phase-14 stretch. The user chose the vision-faithful split instead (Agent 2 derives geometry from real representativeness now).
- **Deferred:** `inferToolsChat` single-loop autonomy (the LLM pulls macro data itself); full 5-field agent-inferred geometry. Out of scope.

</deferred>

---

*Phase: 12-macrohedgestrategist-agent-1-prompt-instrument-specification*
*Context gathered: 2026-06-06*
