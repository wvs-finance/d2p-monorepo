# Phase 11: MacroHedgeStrategist — autonomous on-chain hedge-decision agent (Agentathon POC) - Context

**Gathered:** 2026-06-02
**Status:** Ready for planning
**Source:** PRD Express Path (`docs/superpowers/specs/2026-06-02-macro-hedge-strategist-design.md`)

<domain>
## Phase Boundary

This phase delivers a **`MacroHedgeStrategist`** contract on **Somnia testnet (chain 50312)** that reads a `MacroOracle` datum + a keeper-supplied `consensus` expectation and, via the Somnia **LLM-Inference** base agent, autonomously emits a **consensus-verified, structurally-bounded hedge decision** (action enum + clamped size in bps) through an **authenticated** callback. It also stands up a `contracts-ci.yml` GitHub Actions gate over the repo's Foundry build/tests.

**What this phase delivers (in scope):**
- `ILLMAgent` interface added to the vendored `contracts/src/interfaces/ISomniaAgents.sol`.
- `contracts/src/instrument/MacroHedgeStrategist.sol` — `is SomniaAgentConsumer`; a TWO-ENTRYPOINT decision flow `requestActionDecision(bytes32 dataKey, int256 consensus) → decisionId` + `requestSizeDecision(bytes32 decisionId)` (see the divergence note below — replaces the single `requestHedgeDecision` of the PRD); `inferString` (action enum) + `inferNumber` (bounded size) calls; `HedgeDecision` storage struct; `HedgeDecisionMade` event; authenticated `handleAction`/`handleSize` callbacks joined on an explicit `decisionId`.
- A Somnia-testnet integration test/run proving in-enum action, in-range size, auth rejection (non-PLATFORM sender + replayed/unknown requestId), and decision-moves-with-consensus.
- `.github/workflows/contracts-ci.yml` — `forge build` + per-file `bulloak check` (Phase-7/8/11 trees) + Base-fork tests (BASE_RPC_URL secret + Foundry RPC cache + sharding); Somnia agent e2e gated behind manual `workflow_dispatch`.
- evm-tdd `.tree` files per behavioral unit (request / handleAction / handleSize / auth), committed before implementation per the repo's Iron Law.

**What this phase explicitly does NOT deliver (out of scope):**
- `LongGammaWrapper` execution of the decision (Phase 8 — the decision is *emitted*, not executed).
- Somnia → Base cross-chain hop to act on the fork (deferred XCHAIN-01).
- `PremiumSplitter` / `CapitalRemunerationVault` (Phase 9).
- Native σ/consensus surprise route inside `MacroOracle` (deferred oracle-surprise phase; the POC passes `consensus` in rather than blocking on it).
- Production/mainnet deployment, real capital.

**Independence:** ships independently of Phases 8–10. Depends only on the already-built + merged `SomniaAgentConsumer` and the live `MacroOracle` (json-fetch).

</domain>

<decisions>
## Implementation Decisions

Everything in the PRD is a **locked decision**. Grouped by surface.

### DIVERGENCE FROM PRD — two-entrypoint decision flow with explicit decisionId (supersedes single `requestHedgeDecision`)

The PRD locked a single `requestHedgeDecision(bytes32 dataKey, int256 consensus)` entrypoint that fires BOTH infer legs. During the planning-review gate this was found to be **engineering-infeasible** and is replaced — documented here so artifact and plan agree:

- **Why the single entrypoint is broken:** inherited `SomniaAgentConsumer._sendRequest` forwards the **WHOLE `msg.value`** to the platform. Firing two infer calls inside one tx means the first `_sendRequest` consumes the entire deposit and the second is starved (under-funded → `TimedOut`). One infer per transaction is mandatory.
- **Replacement flow (LOCKED):** two entrypoints with an EXPLICIT `decisionId` hand-off:
  - `requestActionDecision(bytes32 dataKey, int256 consensus) external payable returns (bytes32 decisionId)` — fires the `inferString` (action) leg, allocates a fresh decision slot keyed by a unique, monotonic `decisionId` (`bytes32`, derived from the action request's own `requestId` or a contract-incremented nonce — NOT `keccak(...block.number)`), and returns/emits that `decisionId`.
  - `requestSizeDecision(bytes32 decisionId)` (or `(decisionId, dataKey, consensus)`) — takes the SAME `decisionId` EXPLICITLY as a parameter and binds the `inferNumber` (size) leg to the already-existing decision struct. NO recomputed key.
- **Cross-block join is the whole point:** the two legs run in DIFFERENT transactions (the keeper sequences action → await callback → size), therefore in DIFFERENT blocks. Any `decisionId` that mixes in `block.number` would compute a different id per leg, so `actionSet && sizeSet` would NEVER be true on the same struct and `HedgeDecisionMade` would NEVER fire on testnet. The explicit `decisionId` hand-off is what makes the cross-block join work.
- **One-shot guards (LOCKED):** the action entrypoint MUST `require` the decision slot is empty (`decidedAt == 0 && !actionSet && !sizeSet`); the size entrypoint MUST `require` the referenced decision exists, has `actionSet == true`, and `sizeSet == false`.

### Interface (AGENT-01)
- LOCKED: Add `ILLMAgent` to `contracts/src/interfaces/ISomniaAgents.sol` (which currently carries `IJsonApiAgent`), mirroring the agentathon example's signatures:
  - `inferString(prompt, system, chainOfThought, string[] allowedValues) → string` (constrained to `allowedValues`).
  - `inferNumber(prompt, system, int256 minValue, int256 maxValue, chainOfThought) → int256` (clamped to `[min,max]`).
- LOCKED: LLM-Inference agent ID is `12847293847561029384`.
- LOCKED: `MacroHedgeStrategist is SomniaAgentConsumer`; uses the proven `createRequest`→`handleResponse` pattern (same as `MacroOracle`), reusing inherited `PLATFORM` immutable, `_sendRequest`, the `handleResponse` auth guard + `pendingRequests` binding + CEI, and `sweep`.
- RESEARCH GATE (must resolve before authoring the interface): confirm `LLM_AGENT_ID 12847293847561029384` AND the exact `inferString`/`inferNumber` signatures AND the `Response.result` decode (string vs int256) against the live agent / Agent Explorer (`agents.testnet.somnia.network`) and the local `SentimentAnalyzer.sol`. The ID is currently from a single community source (PARTIALLY VERIFIED).

### Contract behavior (AGENT-02)
- LOCKED: the decision flow (see the DIVERGENCE note above — `requestActionDecision` + `requestSizeDecision`, NOT a single `requestHedgeDecision`) reads `MacroOracle.latest(dataKey)` (or the verified getter), builds a hedging-specialist prompt over `(actual, consensus)`, and fires:
  - `inferString(allowedValues = ["HOLD","ADD_LONG_GAMMA","REDUCE","EXIT"])` → action.
  - `inferNumber(0, MAX_SIZE_BPS)` → sizeBps.
- LOCKED: `enum HedgeAction { HOLD, ADD_LONG_GAMMA, REDUCE, EXIT }`; `allowedValues` array mirrors these labels verbatim; the callback maps returned label → enum, signalling `DecisionFailed` on an unmapped string (defensive — never bricks the pending request).
- LOCKED: `MAX_SIZE_BPS` is a contract constant; `sizeBps` clamped to `[0, MAX_SIZE_BPS]`.
- LOCKED: callback stores `HedgeDecision { HedgeAction action, uint256/int256 sizeBps, int256 macroValue, int256 consensus, uint256 decidedAt }` (plus `actionSet`/`sizeSet` join flags) and emits `HedgeDecisionMade(requestId, action, sizeBps, macroValue, consensus)` once BOTH legs have arrived.
- LOCKED: `chainOfThought = false` for the constrained calls (speed + tighter consensus); the system prompt is a contract constant (reproducible demo).
- LOCKED: the `allowedValues` / `[min,max]` bounds ARE the structural guardrail — the model structurally cannot return out-of-enum / out-of-range; full autonomy stays in-bounds.

### Security / autonomy (AGENT-03)
- LOCKED (NON-NEGOTIABLE): autonomy = decision freedom, NOT unauthenticated. `handleAction`/`handleSize` MUST require `msg.sender == PLATFORM`, match an outstanding `pendingRequests[requestId]`, delete the pending entry BEFORE state mutation (CEI), and carry a replay guard so a response cannot be re-applied.
- LOCKED: owner-only `sweep` for rebates (inherited), `ZeroRecipient`-guarded.
- LOCKED: testnet integration must prove — in-enum action, in-range size, rejection of non-`PLATFORM` sender, rejection of replayed/unknown `requestId`, and two runs with different `consensus` → different decisions (reasoning, not a constant).

### CI gate (AGENT-04)
- LOCKED: new `.github/workflows/contracts-ci.yml` gating the repo with: `forge build` + per-file `bulloak check` over Phase-7/8/11 `.tree` files + the Base-fork tests.
- LOCKED: Base-fork tests use a `BASE_RPC_URL` Actions secret + a Foundry RPC cache keyed on the pinned block (46700000) + sharding to dodge the Alchemy 429 rate limit.
- LOCKED: the Somnia-testnet agent e2e stays a **manual `workflow_dispatch`** (it spends STT) — never on push/PR.
- LOCKED (from the review gate): the no-secret `build-and-spec` job MUST exclude EVERY forking test, not just files whose name matches `*fork*`. `CcopUsdcPool.t.sol` forks via `vm.createSelectFork` but has no `fork` in its name — it is renamed `CcopUsdcPool.fork.t.sol` (with its `.tree` renamed in lockstep) so the `*fork*` convention is honest, OR the filter is otherwise corrected. The exclusion MUST be proven `.env`-INDEPENDENTLY: `forge test --list --no-match-path 'test/**/*fork*'` lists no `CcopUsdcPool` test. Do NOT use `env -u BASE_RPC_URL forge test … exits 0` as the proof — forge auto-loads `contracts/.env` from disk, so that command is a false PASS even without the rename.
- LOCKED (from the review gate): only THREE `test/spec/*.tree` files are un-parseable under bulloak 0.9.2 (`MacroOracle.tree`, `SomniaAgentConsumer.sendRequest.tree`, `SomniaAgentConsumer.sweep.tree`); `SomniaAgentConsumer.handleResponse.tree` PARSES cleanly and is parseable-but-orphaned (no matching `.t.sol`). The CI bulloak loop must NOT claim "all spec trees un-parseable" — it names the three failing trees and handles `handleResponse.tree` explicitly (deferred with a tracking note).
- RESEARCH GATE: confirm the `contracts-ci` RPC-rate-limit handling (Foundry RPC cache key + sharding/secret mechanics); model on the existing `keeper-ci.yml`.

### Keeper / sequencing
- LOCKED: keeper is on-demand for the demo (cadence-capable). Its role is sequencing: refresh `MacroOracle` → fire `requestActionDecision` → await action callback → fire `requestSizeDecision(decisionId)`.
- RESEARCH GATE: confirm whether `llm-inference` needs the keeper-proxy at all (likely a pure on-chain `createRequest`, unlike json-fetch which fetches a URL). If no proxy needed, the keeper only sequences.
- LOCKED: deposit sizing per CLAUDE.md price classes — json-fetch = 0.03 SOMI/agent (oracle refresh leg), llm-inference = 0.07 SOMI/agent (the two infer legs); over-fund per the proven floor+price rule per leg; confirm dedicated wallet STT balance covers the demo runs (= json-fetch deposit + 2 × llm-inference deposit per run).

### Testing methodology
- LOCKED: evm-tdd Iron Law — a `.tree` per behavioral unit (request / handleAction / handleSize / auth) committed BEFORE implementation; `bulloak check` enforces tree↔test correspondence.
- LOCKED: No Base fork needed for the strategist's own tests — it is Somnia-native. (Base-fork tests in CI are the repo's existing Phase-7/8 suite.)

### Claude's Discretion
- Exact Solidity field types/widths inside `HedgeDecision` (e.g. `uint256` vs `uint16` for `sizeBps`), provided clamping and event signatures hold.
- The exact `MAX_SIZE_BPS` constant value (a sane bps cap, e.g. 10_000) unless the spec/research dictates otherwise.
- The precise wording of the system/user prompt constants, provided they cast a macro-hedging strategist over `(actual, consensus)` and are deterministic.
- File/test organization under `contracts/test/` consistent with existing `spec/` + `fork/` layout.
- CI job matrix/shard count and cache key details, provided the 429-avoidance goal is met and the Somnia e2e stays `workflow_dispatch`.
- Whether to split the interface addition, contract, tests, and CI into separate plans/waves.
- The exact `decisionId` derivation (action `requestId` vs a contract-incremented nonce), provided it is unique, monotonic, collision-free, and STABLE across the two transactions (no `block.number`).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design authority
- `docs/superpowers/specs/2026-06-02-macro-hedge-strategist-design.md` — the approved design spec (this phase's PRD).
- `research/agentathon-agents/POC-AVAILABILITY-LOG.md` — Somnia agent availability, the 3 base-agent catalog (IDs/prices), `inferString`/`inferNumber`/`inferToolsChat` signatures, Agentathon rules & deadline, custom-agents-are-Phase-2 verdict.

### Reuse targets (read for patterns/signatures to replicate)
- `contracts/src/SomniaAgentConsumer.sol` — base contract: `PLATFORM` immutable, `_sendRequest`, `handleResponse` auth guard + `pendingRequests` binding + CEI, `sweep`.
- `contracts/src/interfaces/ISomniaAgents.sol` — vendored interface (currently `IJsonApiAgent`); add `ILLMAgent` here.
- `contracts/src/MacroOracle.sol` — the live datum source the strategist reads; confirm the getter (`latest(dataKey)` or equivalent) and the scaled-value type.
- `agentathon/somnia-agents-examples/contracts/SentimentAnalyzer.sol` — near-template ("on-chain AI for decision-making"): `inferString` w/ `allowedValues` + `inferNumber` w/ bounds, same callback shape; source of the exact `abi.encodeWithSelector(ILLMAgent.infer*.selector, …)` convention and `Response.result` decode.

### Test / CI patterns
- `contracts/test/spec/SomniaAgentConsumer.handleResponse.tree` (parseable-but-orphaned), `.../SomniaAgentConsumer.sendRequest.tree`, `.../SomniaAgentConsumer.sweep.tree`, `.../MacroOracle.tree` (these three un-parseable under bulloak 0.9.2) — existing `.tree` style to mirror for Phase-11 behavioral units.
- `contracts/test/MacroOracle.t.sol`, `contracts/test/SomniaAgentConsumer.t.sol` — existing test harness style for the Somnia-native + agent-callback tests.
- `contracts/test/fork/BaseForkHarness.tree`, `contracts/test/instrument/PanopticDataSeam.fork.tree`, `contracts/test/instrument/CcopUsdcPool.tree` (→ renamed `CcopUsdcPool.fork.tree` in this phase) — the Phase-7 Base-fork trees that `contracts-ci.yml` must `bulloak check`.
- `.github/workflows/keeper-ci.yml` — existing CI workflow to model `contracts-ci.yml` on (structure, secrets, caching conventions).

### Project guardrails
- `CLAUDE.md` (project) — domain non-negotiables (SOMI prices: json-fetch 0.03, llm-inference 0.07; IAgentRequester deposit floor; testnet posture) AND the three-step planning-review gate this plan must pass before execution.

</canonical_refs>

<specifics>
## Specific Ideas

- LLM-Inference agent ID: `12847293847561029384` (PARTIALLY VERIFIED — single community source; confirm at `agents.testnet.somnia.network`).
- json-fetch agent ID (for context): `13174292974160097713`; llm-parse-website: `12875401142070969085`.
- Somnia testnet chain ID: 50312. Dedicated wallet: `0xF3c3…0a90` (key in `contracts/.env`). Keeper-proxy: `keeper-eta-pied.vercel.app`.
- Base-fork pinned block: 46700000 (PoolManager + USDC have code there); RPC via Alchemy `BASE_RPC_URL`.
- Determinism basis: Qwen3-30B at `temperature=0` + fixed seed → byte-identical validator output → consensus on the AI result (the differentiator vs "one node's opinion").
- Agentathon hard deadline: **~June 11, 2026** (ENCODE × Somnia). Judging: Functionality / Agent-first design / Innovation / Autonomous performance. Deliverables: working demo + public GitHub + demo video.

</specifics>

<deferred>
## Deferred Ideas

- **Stretch (only if time before June 11):** replace the two `infer*` calls with one `inferToolsChat` loop where the LLM pulls the macro data itself (MacroOracle exposed as an on-chain tool) and emits the decision calldata — the maximal "Autonomous performance" angle. Not required for phase completion.
- `LongGammaWrapper` execution (Phase 8); Somnia→Base hop (XCHAIN-01); PremiumSplitter/vault (Phase 9); native σ/consensus surprise route inside MacroOracle (deferred oracle-surprise phase). All out of scope for this phase.

</deferred>

---

*Phase: 11-macrohedgestrategist-hedge-decision-agent*
*Context gathered: 2026-06-02 via PRD Express Path*
