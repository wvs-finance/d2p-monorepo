# Agentathon POC — Somnia Agent Availability & Options Log

*What is available and possible for the ENCODE × Somnia "Agentathon", for the on-chain decision-making add-on to the macro instrument. Compiled 2026-06-02. Every load-bearing claim cited; "UNVERIFIED" where no source was found.*

---

## TL;DR (the question: do they encourage USING their agents, or LAUNCHING custom ones?)

- **Custom agents are NOT available now.** Somnia docs: *"Phase 2 (2026): Support for fully custom, user-defined Agents will launch."* — and *"Currently, a curated set of core Agents is available."* There is no developer-facing registry to add a new agent *class* into the validator execution environment on testnet or mainnet today. → **A custom Somnia agent cannot be built for this Agentathon.**
- The "custom agent" surface in community SDKs (`somnia-agent-kit`'s `registerAgent(...)`) is **metadata registration for discoverability**, NOT a new execution class. Do not conflate.
- **They reward USING the existing agents well.** Agentathon judging = *Functionality · Agent-first design · Innovation · Autonomous performance.* "Agent-first design" + "Autonomous performance" reward **depth + autonomy of integrating the 3 base classes**, not new agent types.
- **∴ Our path: a keeper/contract-orchestrated COMPOSITE over the 3 base classes** (json-fetch → llm-inference decision). Exactly the pattern we already proved for `MacroOracle`. The "composite macro-hedging agent" is **our orchestration**, not a registered agent.

---

## §1 Custom agents — VERDICT: not in Phase 1 (Phase 2, 2026, date TBD)
- No registry call / skill manifest / endpoint registration for a new agent class today (testnet or mainnet).
- `AgentRegistry` (community `somnia-agent-kit`, NOT the official platform) exposes `registerAgent(name, desc, ipfsMetadata, capabilities[])` — **discoverability metadata only**.
- "Custom Consensus" = a finalization-rule knob for *your consumer contract* (majority vs threshold), not custom agent logic.
- Sources: docs.somnia.network/agents (Phase 1/2 roadmap); .../invoking-agents/custom-consensus; somnia-agent-kit GitBook (registerAgent).

## §2 Catalog (3 base agents; same agentId on testnet 50312 + mainnet 5031)
| Agent | ID | Price/agent | Total (subSize 3) | Live? |
|---|---|---|---|---|
| JSON API Request (`json-fetch`) | `13174292974160097713` | 0.03 SOMI | 0.12 | ✅ proven e2e in this repo |
| **LLM Inference** | `12847293847561029384` | 0.07 SOMI | 0.24 | documented live; not yet independently called by us |
| LLM Parse Website | `12875401142070969085` | 0.10 SOMI | 0.33 | documented live; not called by us |
- Docs also name "Idempotent Request" + "JSON API Selector" as base agents — **UNVERIFIED** (no IDs/prices found).
- Authoritative catalog browser: `agents.testnet.somnia.network` (did not render via WebFetch).
- Sources: gas-fees page; llm-parse-website docs; LLM-inference ID from a community dev.to article (PARTIALLY VERIFIED — single source); json-fetch ID from this repo's `ISomniaAgents.sol`.

## §3 LLM Inference = a first-class on-chain DECISION primitive
Same `createRequest(agentId, consumer, callbackSelector, abi.encodeWithSelector(ILLMAgent.<m>.selector, ...))` → `handleResponse` pattern as our `MacroOracle`. Four methods:
```solidity
inferString(prompt, system, chainOfThought, string[] allowedValues) → string   // CONSTRAINED to allowedValues
inferNumber(prompt, system, int256 minValue, int256 maxValue, chainOfThought) → int256  // CLAMPED to [min,max]
inferChat(string[] roles, string[] messages, chainOfThought) → string           // multi-turn
inferToolsChat(roles, messages, mcpServerUrls, OnchainTool[] onchainTools, maxIterations, chainOfThought)
   → (finishReason, response, updatedRoles, updatedMessages, pendingToolCallIds, bytes[] pendingToolCalls)
```
- **Determinism:** Qwen3-30B at `temperature=0` + fixed seed on every validator → byte-identical output → consensus on the AI result (*"not just one node's opinion"*). This is the differentiator.
- **For hedging decisions:** `inferString(allowedValues=["LONG_GAMMA","SHORT_GAMMA","HOLD"])` = constrained action; `inferNumber(min,max)` = bounded hedge delta/size. **These bounds ARE the on-chain guardrail** even under "fully autonomous" — the agent structurally cannot return out-of-set/out-of-range.
- **`inferToolsChat`** = LLM-as-orchestrator: define our Solidity fns (incl. a `createRequest` to another agent) as `OnchainTool[]`; `finishReason=="tool_calls"` → `pendingToolCalls` is ABI calldata our consumer executes, then loops. The closest thing to agent-to-agent + the strongest "Autonomous performance" angle.
- Local proof: `agentathon/somnia-agents-examples/contracts/SentimentAnalyzer.sol` (titled *"how to use on-chain AI for decision-making"*) is a near-template (inferString w/ allowedValues + inferNumber w/ bounds, same callback shape).
- Sources: docs .../base-agents/llm-inference; Somnia dev blog (inferToolsChat DeFi pattern); local `SentimentAnalyzer.sol`.

## §4 Agentathon — what's rewarded
- **ENCODE × Somnia Agentathon**, **May 18 – June 11, 2026** (3 weeks). **Prize $5,000.** Top performers considered for Somnia employment.
- **Deliverables:** working prototype/demo + **public GitHub repo** + short **demo video**.
- **Judging:** (1) Functionality (2) Agent-first design (3) Innovation & technical creativity (4) **Autonomous performance**.
- Framing: *"experiment with agent-powered products, explore new onchain use cases"* — i.e. USE the base agents creatively/autonomously. No documented separate tracks (full rules page didn't render — UNVERIFIED on tracks).
- ⚠️ **Deadline ≈ June 11, 2026 — ~9 days out as of this log.** Scope the decision-agent to what is demoable by then.
- Sources: CompeteHub listing; Somnia + Encode LinkedIn posts; encodeclub.com/programmes/agentathon.

## §5 Composite / agent-to-agent
- **No native single-call agent-to-agent** API. Platform handles contract→agent only.
- On-chain composite = **`inferToolsChat` two-hop** (LLM returns calldata → consumer fires a 2nd `createRequest` to another agent → loops). Sequential across async cycles, not synchronous.
- **Keeper-mediated composite** (what we already run): off-chain keeper sequences requests across classes, aggregates, drives the consumer state machine. Most battle-tested.
- Community `Psianturi/somnia-agents-showcase` shows many agent-consumer contracts but no inter-agent coordination.

## §6 Bottom line for our POC
1. **Custom agent = off the table** for this Agentathon (Phase 2 feature). Don't plan around it.
2. **Build a keeper/contract-orchestrated composite over the 3 base classes**: `json-fetch` (TE macro via `MacroOracle`) → `llm-inference` decision (`inferString` action enum / `inferNumber` bounded size, hedging system-prompt over the CPI surprise + position greeks) → drive the (testnet) hedge action. Reuses our `SomniaAgentConsumer` + keeper.
3. **Differentiator for the judging criteria:** `inferToolsChat` — let Qwen3-30B decide *which* data to pull next and emit the hedge calldata → genuinely autonomous, not scripted (max "Autonomous performance" + "Innovation").
4. **Guardrails come free** via `allowedValues`/`[min,max]`, so "fully autonomous" stays structurally safe on testnet.
5. **Constraint:** ~9-day deadline + Phase 8 (the wrapper) not yet built → the demoable POC must be tightly scoped.
