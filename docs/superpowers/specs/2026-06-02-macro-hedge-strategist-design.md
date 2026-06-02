# MacroHedgeStrategist — Design Spec

**Date:** 2026-06-02
**Status:** Approved (brainstorm), pending implementation plan
**Author:** brainstorm session (abrigo-somnia)
**Scope:** ENCODE × Somnia Agentathon POC — an on-chain, autonomous, consensus-verified macro-hedge **decision agent**.
**Grounding research:** `research/agentathon-agents/POC-AVAILABILITY-LOG.md` (Somnia agent availability + Agentathon rules, cited).

---

## 1. Purpose

Turn a macro print into a **consensus-verified hedge decision**, on-chain, with no human in the loop. `MacroHedgeStrategist` reads a `MacroOracle` datum (live Trading-Economics data via the Somnia **json-fetch** agent), reasons over the macro **surprise** through the Somnia **LLM Inference** agent, and emits a structured hedge **decision** (action + bounded size). It sits *beside* `MacroOracle` (does not replace it) and **emits** a decision that a future `PositionBuilder` / `LongGammaWrapper` consumes — so it ships **independently of Phase 8** (the wrapper).

This is the "add-on: investment decisions made by on-chain agents for the macro instruments, leveraging the other agents" item from `MATH.md`, realized as a **keeper/contract-orchestrated composite over Somnia's 3 base agent classes** (custom agents are a Somnia Phase-2 feature, not buildable for this Agentathon).

## 2. Non-negotiable facts this design rests on

- **Custom Somnia agents are NOT available** (Phase 2, 2026). The agent must be **our orchestration over the 3 fixed base classes**, never a registered custom agent.
- **LLM Inference agent** (ID `12847293847561029384` — *PARTIALLY VERIFIED, single community source; confirm against the Agent Explorer `agents.testnet.somnia.network` before relying*) is a first-class on-chain decision primitive, called with the **same `createRequest`→`handleResponse` pattern** as our `MacroOracle`. Qwen3-30B at `temperature=0` + fixed seed → byte-identical validator output → **consensus on the AI result**.
  - `inferString(prompt, system, chainOfThought, string[] allowedValues) → string` (constrained to `allowedValues`).
  - `inferNumber(prompt, system, int256 minValue, int256 maxValue, chainOfThought) → int256` (clamped to range).
- **Demo/testnet only.** Somnia testnet, chain 50312. No mainnet, no real capital.
- **Deadline ≈ June 11, 2026.** Deliverables: working demo + public GitHub + demo video. Judging: Functionality / Agent-first design / Innovation / **Autonomous performance**.

## 3. Architecture

```
keeper (on-demand for the demo; cadence-capable)
   │  1. refresh MacroOracle  ── json-fetch ──▶ TE print (e.g. CPI=568)            [LIVE today]
   │  2. requestHedgeDecision(dataKey, consensus)
   ▼
MacroHedgeStrategist  (is SomniaAgentConsumer)
   │     reads MacroOracle.latest(dataKey) + builds prompt(actual, consensus)
   │     ├─ createRequest → llm-inference  inferString(allowedValues = HedgeAction labels)  → action
   │     └─ createRequest → llm-inference  inferNumber(0, MAX_SIZE_BPS)                       → sizeBps
   ▼  handleAction() / handleSize()   [msg.sender == PLATFORM + pendingRequests + CEI — INHERITED]
   store HedgeDecision{action, sizeBps, macroValue, consensus, decidedAt}
   emit  HedgeDecisionMade(requestId, action, sizeBps, macroValue, consensus)
```

- **Reuses:** `SomniaAgentConsumer` base (immutable `PLATFORM`, `_sendRequest`, the `handleResponse` auth guard + `pendingRequests` binding + CEI, `sweep`); the live keeper-proxy; the `SentimentAnalyzer.sol` calling convention (`abi.encodeWithSelector(ILLMAgent.infer*.selector, …)`).
- **New code:** `contracts/src/instrument/MacroHedgeStrategist.sol`; an `ILLMAgent` interface addition to `contracts/src/interfaces/ISomniaAgents.sol` (our vendored interface currently carries `IJsonApiAgent`; add `ILLMAgent` mirroring the agentathon example's `inferString`/`inferNumber` signatures).
- **Reads:** `MacroOracle` (already built + live; emits the raw scaled macro value for a `dataKey`).

## 4. Decision schema & reasoning

- **Action** — `enum HedgeAction { HOLD, ADD_LONG_GAMMA, REDUCE, EXIT }`. The `inferString` `allowedValues` array mirrors these labels verbatim (e.g. `["HOLD","ADD_LONG_GAMMA","REDUCE","EXIT"]`); the callback maps the returned label → enum (revert/`DecisionFailed` on an unmapped string — defensive, though `allowedValues` should preclude it).
- **Size / conviction** — `inferNumber(…, 0, MAX_SIZE_BPS, …) → int256 sizeBps`, clamped to `[0, MAX_SIZE_BPS]` (a hedge size in basis points; `MAX_SIZE_BPS` a contract constant). Interpreted as "how much long-gamma to add/hold" scaled to the action.
- **Reasoning inputs** — the `MacroOracle` print (`actual`) + a `consensus` expectation **supplied by the keeper** for the POC. The system prompt casts the model as a macro-hedging strategist; the user prompt provides `actual` + `consensus` and asks for the surprise's hedge implication. (A native σ/consensus *surprise route* inside `MacroOracle` is the deferred "oracle-surprise" phase; the POC passes `consensus` in rather than blocking on it.)
- **Prompt determinism** — `chainOfThought=false` for the constrained calls (speed + tighter consensus); the system prompt is a contract constant so the demo is reproducible.

## 5. Autonomy & security

- **Autonomy** = no human between data and decision; the strategist reads, reasons, and records/emits the decision unattended.
- **Structural guardrails are free:** the model cannot return an action outside the `HedgeAction` enum (`allowedValues`) nor a size outside `[0, MAX_SIZE_BPS]` (`inferNumber` clamp). This is what keeps "fully autonomous" structurally safe on testnet.
- **Channel hardening (NON-NEGOTIABLE, inherited + enforced):** `handleAction`/`handleSize` require `msg.sender == PLATFORM`, match an outstanding `pendingRequests[requestId]`, delete the pending entry BEFORE state mutation (CEI), and carry a replay-guard so a response cannot be re-applied. Autonomy never means unauthenticated.
- **Egress:** owner-only `sweep` for rebates (inherited), `ZeroRecipient` guarded.

## 6. Demo (what the video shows)

1. Keeper refreshes `MacroOracle` → a live TE macro print lands on-chain (e.g. CPI 568).
2. Keeper calls `requestHedgeDecision(dataKey, consensus)`.
3. The strategist fires the llm-inference request(s); on consensus, `HedgeDecisionMade(action, sizeBps, macroValue, consensus)` is emitted on Somnia testnet — **consensus-verified, not one node's opinion**.
4. (Optional second run) a different `consensus` → the decision **moves**, demonstrating genuine reasoning over the surprise.

## 7. Scope boundaries

**In scope (POC, by June 11):**
- `MacroHedgeStrategist.sol` + `ILLMAgent` interface addition.
- Live Somnia-testnet path: MacroOracle → llm-inference → stored/emitted decision.
- Somnia-testnet integration test + the demo script.

**Out of scope (deadline):**
- `LongGammaWrapper` execution of the decision (Phase 8; the decision is *emitted*, not executed).
- Somnia → Base cross-chain hop to act on the fork (deferred XCHAIN-01).
- `PremiumSplitter` / `CapitalRemunerationVault`.
- Native σ/consensus surprise route inside `MacroOracle` (deferred oracle-surprise phase).

**Stretch (only if time before the deadline):**
- Replace the two `infer*` calls with one **`inferToolsChat`** loop in which the LLM pulls the macro data itself (MacroOracle as an on-chain tool) and emits the decision calldata — the maximal "Autonomous performance" angle.

## 8. Testing

- **Somnia-testnet integration** (same harness style as the proven MacroOracle e2e): a real `requestHedgeDecision` → callback yields a stored `HedgeDecision` whose `action` is in-enum and `sizeBps ∈ [0, MAX_SIZE_BPS]`; `HedgeDecisionMade` emitted.
- **Auth:** `handleAction`/`handleSize` revert when `msg.sender != PLATFORM`; an unknown/duplicate `requestId` is rejected (replay guard).
- **Decision-moves:** two runs with different `consensus` inputs produce different decisions (proves reasoning, not a constant).
- No Base fork needed — this is Somnia-native. evm-tdd: a `.tree` per behavioral unit (request / handleAction / handleSize / auth) committed before impl, per the repo's Iron Law.

## 9. Open items to resolve at plan/research time

1. **Confirm `LLM_AGENT_ID`** against the Agent Explorer (`agents.testnet.somnia.network`) — current ID is from a single community source.
2. **Confirm the exact `ILLMAgent.inferString`/`inferNumber` signatures + the response decode** (string vs int256 in `Response.result`) against the live agent / the agentathon example before authoring the interface.
3. **Keeper-proxy reuse:** llm-inference takes a prompt payload (not a URL fetch) — confirm whether the existing keeper-proxy is involved at all for llm-inference (it may be a pure on-chain `createRequest` with no off-chain proxy, unlike json-fetch). If no proxy is needed for llm-inference, the keeper's only role is sequencing (refresh oracle → fire strategist).
4. **Deposit sizing** for llm-inference (0.07 SOMI/agent × subSize) — over-fund per the proven floor+price rule; confirm wallet STT balance covers the demo runs.

## 10. Process note

Per `CLAUDE.md`, the implementation **plan** derived from this spec must pass the repo's three-step planning-review gate (Studio Producer selector → Reality Checker + domain reviewer) before any build. This spec is the brainstorm artifact, not yet that plan.
