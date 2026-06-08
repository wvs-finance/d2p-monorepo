# Phase 12: `MacroHedgeStrategist` (Agent 1) — prompt → hedge mandate - Research

**Researched:** 2026-06-06
**Domain:** Solidity (^0.8.24) — Somnia agent-consumer upgrade; on-chain LLM-inference two-leg decision flow; new `HedgeMandate` value type; concrete `IMacroThesis` named-thesis registry
**Confidence:** HIGH (the agent integration is LIVE-PROVEN on Somnia testnet in Phase 11; the upgrade is a localized, well-bounded refactor of a working contract)

> **CRITICAL — this is a prescriptive, repo-local research doc.** Phase 12 is NOT greenfield. It upgrades a contract that is *already deployed and proven live on Somnia testnet*. Everything that matters is in this repo's existing code. The "Standard Stack" is therefore the repo's own libraries/patterns, not an ecosystem survey. Verification came from reading the live v1 contract, its 17/17-green unit suite, the proven Phase-11 testnet run, and the canonical Somnia example — not from training data.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**What Agent 1 emits — a HedgeMandate, NOT a HedgeLegParams (the corrected seam):**
- Agent 1 outputs a **mandate**: `{ economicTheory (the inferred school's address), direction/isLong, targetNotional, underlyingMarket = POLYGON_WCOP_USDC_POOL_ID, chainId = 137 }`. It carries the hedge INTENT, not the leg geometry.
- The **moneyness / strikeWAD / width(vol) / feasible size** are explicitly **Agent 2's** representativeness-driven outputs (the "inflation adjustment") — Agent 1 does NOT set them, and they are **not constant**.
- A new **`HedgeMandate`** type is introduced (distinct from `HedgeLegParams`). Exact field set/widths = Claude's discretion at planning; it MUST carry enough for Agent 2 to derive geometry (school, direction, target notional, the pool anchor, chainId).

**Field provenance — 2 inferred legs (reuse the v1 two-entrypoint `decisionId` join):**
- **Leg 1 — `inferString`** → the **economic school**, inferred from the prompt, constrained to `allowedValues` from the thesis registry (e.g. `["SHILLER_MACRO_RISK","POST_KEYNESIAN", ...]`). Repurposes the v1's `inferString` (action) leg into the *thesis* decision.
- **Leg 2 — `inferNumber`** → the **target notional** (the cash-flow amount / hedge-intent scalar). Bounds = Claude's discretion (a sane notional range; NOT `[0,10000]` bps and NOT the resolver's `[1,127]` — that size bound now lives in Agent 2's feasible-size derivation).
- **Direction (`isLong`)** is **derived** from the hedge mandate, not a separate leg: Scenario 1 (hedge COP depreciation/inflation on a received cash flow) → long cCOP/USD call → `isLong = true`. (Whether direction folds into the school-leg reasoning or is a fixed derivation = Claude's discretion.)

**`IMacroThesis` shape (STRAT-01) — named-thesis registry, AGENT-1-INFERRED:**
- `IMacroThesis` gets a concrete **registry** shape exposing selectable economic schools (`SHILLER_MACRO_RISK`, `POST_KEYNESIAN`, extensible); no longer an empty marker.
- **Agent 1 selects the school itself** (Leg 1 `inferString`) by reasoning over the prompt — the school is genuinely prompt-derived. The chosen school's address fills `mandate.economicTheory`, and the school **biases the prompt** + is the frame Agent 2 operates under.

**Emission (STRAT-01) — assemble + emit the mandate:**
- Once both legs land on the same `decisionId`, the contract assembles the `HedgeMandate`, stores it by `decisionId`, **emits `StrategistDecided(decisionId, school, HedgeMandate)`** (the UI event), and exposes `getMandate(decisionId)`. Agent 2 consumes this mandate.

**Carried forward from Phase 11 (LOCKED):**
- Two-entrypoint `decisionId` join; ONE infer per tx (`_sendRequest` forwards the WHOLE `msg.value`); block-independent `decisionId` from the action/first-leg `requestId`.
- `is SomniaAgentConsumer`; inherited `handleResponse` auth + `pendingRequests` + CEI + replay-revert; `_onResult`-only; try/catch decode-safety → `DecisionFailed` (never bricks the pending request); 32-byte length guard on the int leg.
- `inferString(…, chainOfThought=false, allowedValues)` / `inferNumber(…, min, max, false)`; `LLM_AGENT_ID = 12847293847561029384`; deterministic system-prompt constant. Keeper sequences; `llm-inference` 0.07 SOMI/leg. Somnia-native tests; evm-TDD Iron Law.

### Claude's Discretion
- The `HedgeMandate` field set/widths; the `inferNumber` target-notional bounds + units; whether direction is a derivation or part of the school-leg reasoning; the `IMacroThesis` registry concrete signature (enum-indexed vs address-mapped) + how the school string biases the prompt; prompt wording (deterministic); plan/wave/test organization.

### Deferred Ideas (OUT OF SCOPE)
- **REJECTED (pragmatic path):** Agent 1 emitting a full TARGET `HedgeLegParams` with the representativeness OVERRIDE deferred to a Phase-14 stretch. The user chose the vision-faithful split (Agent 2 derives geometry from real representativeness now).
- **Deferred:** `inferToolsChat` single-loop autonomy (the LLM pulls macro data itself); full 5-field agent-inferred geometry.
- **OUT OF SCOPE for Phase 12 (this is the hard scope guardrail):** the pool-representativeness analysis, the geometry derivation (moneyness/strike/width/feasible-size → `HedgeLegParams`), pool TVL/volume/liquidity sourcing, and `resolveFromMandate`. Those are **Agent 2 / Phase 14**. Agent 1 emits the mandate that FEEDS Phase 14; the hand-off *contract* (what the mandate must carry) is in scope, the *consumption* is not.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| **STRAT-01** | Upgrade v1's output to a **`HedgeMandate`**: `MacroHedgeStrategist` + concrete `IMacroThesis` **named-thesis registry**; via two `llm-inference` legs (`inferString` → economic school inferred from the prompt; `inferNumber` → target notional) it emits a mandate; a Somnia-testnet run proves a well-formed mandate, rejects non-`PLATFORM`/replayed, and a different prompt → a different mandate. | §"Standard Stack" (the v1 contract + base + ILLMAgent, all live-proven); §"Architecture Patterns" (the two-leg join repurposed school/notional); §"Code Examples" (the exact `inferString(allowedValues)`/`inferNumber(min,max)` encode + `Response.result` decode, copied from the live SentimentAnalyzer/v1); §"`IMacroThesis` registry" design; §"`HedgeMandate` type" design. The decision-moves-with-prompt live proof has a Phase-11 precedent (decision-moves-with-consensus, two tx hashes on chain). |
| **STRAT-02** | The emitted `HedgeMandate` is well-formed + **consumable by Agent 2's representativeness derivation** — `underlyingMarket` anchored to the committed `POLYGON_WCOP_USDC_POOL_ID` constant (Agent 1 can't produce a runtime PoolId), the school address resolvable, the target notional in-range — so Phase 14 can derive a `HedgeLegParams` from it. | §"`HedgeMandate` type" (the mandate carries `PoolId underlyingMarket` = `PolygonPools.POLYGON_WCOP_USDC_POOL_ID()`, `chainId=137`, a resolvable school handle, an in-range `targetNotional`); §"The Phase-14 hand-off contract" maps each `HedgeMandate` field to what `resolveFromMandate` will need. The `PolygonPools` library already ships the anchor (Phase 13, commit `a91a708`). The *consumption* (resolveFromMandate) is Phase 14 — NOT researched here. |
</phase_requirements>

## Summary

Phase 12 is a **surgical, low-risk upgrade of a working, live-on-testnet contract**. The Phase-11 `MacroHedgeStrategist` (`is SomniaAgentConsumer`) is deployed at `0xfA428171E1F5B56f92C67C002De1d8e90B053EE1` on Somnia testnet (chain 50312) and was proven on 2026-06-02 with two on-chain `HedgeDecisionMade` transactions where a changed input produced a *different* decision (genuine reasoning, not a constant). The two-entrypoint, one-infer-per-tx, block-independent-`decisionId`-join architecture is already correct and battle-tested at the unit level (17/17 green) and live. **Phase 12 keeps that entire skeleton and changes only WHAT is decided and WHAT is assembled at the join.**

The three concrete deliverables: (1) a new **`HedgeMandate`** value type in `contracts/src/types/HedgeMandate.sol` carrying `{ economicTheory, isLong, targetNotional, underlyingMarket, chainId }`; (2) a concrete **`IMacroThesis` named-thesis registry** (replacing today's empty `interface IMacroThesis {}`) that maps prompt-inferable school *labels* (`SHILLER_MACRO_RISK`, `POST_KEYNESIAN`, extensible) to a resolvable school *handle* and to the `allowedValues` array the `inferString` leg constrains over; (3) the contract refactor — Leg 1's `inferString` decides the *school* (over the registry's `allowedValues`), Leg 2's `inferNumber` decides the *target notional*, direction is derived (Scenario 1 → `isLong=true`), and once both legs land the contract assembles + stores a `HedgeMandate`, emits `StrategistDecided(decisionId, school, HedgeMandate)`, and exposes `getMandate(decisionId)`.

**Primary recommendation:** Treat this as a *rename-and-resemantic* of v1, not a rewrite. Reuse the v1 `_onResult` leg-routing, the `try/catch this.decodeString(...)` action-decode-safety (now the *school*-decode-safety), the 32-byte int guard (now the *target-notional* guard), the `_mapAction` keccak-compare pattern (now `_mapSchool`), the `decisionId = bytes32(actionRequestId)` cross-block join, the `HedgeDecision`-style storage struct with `actionSet`/`sizeSet` join flags, and the entire MockPlatform unit-test harness in `MacroHedgeStrategist.t.sol`. The agent integration (IDs, signatures, decode) is HIGH confidence — proven live; do **not** re-derive it, **confirm and reuse it**. The new surface area is the `HedgeMandate` struct, the `IMacroThesis` registry, the school labels, and the notional bounds — that is the whole intellectual content of the phase.

## Standard Stack

> "Stack" here = the **repo-local libraries, base contracts, and toolchain** the upgrade builds on. All are already present and version-pinned; nothing new is installed.

### Core (already in the repo — reuse verbatim)
| Component | Where | Purpose | Why Standard (repo-proven) |
|-----------|-------|---------|----------------------------|
| `SomniaAgentConsumer` (abstract base) | `contracts/src/SomniaAgentConsumer.sol` | `PLATFORM` immutable, `_sendRequest` (forwards WHOLE `msg.value`), `handleResponse` (auth + `pendingRequests` + CEI + replay-revert), `sweep`, `_onResult` hook | The auth/replay/CEI spine; inherited by `MacroOracle`, the v1 strategist, and `MacroHedgeExecutor`. Never re-declare `handleResponse`. |
| `ILLMAgent` interface | `contracts/src/interfaces/ISomniaAgents.sol:73-88` | `inferString(prompt, system, bool chainOfThought, string[] allowedValues) → string`; `inferNumber(prompt, system, int256 min, int256 max, bool chainOfThought) → int256` | Vendored from `emrestay/somnia-agents-examples`; **confirmed live on-chain** in Phase 11. The encode convention is `abi.encodeWithSelector(ILLMAgent.infer*.selector, …)`. |
| `Response` / `ResponseStatus` | `contracts/src/interfaces/ISomniaAgents.sol:9-24` | The callback envelope. `responses[0].result` is the consensus payload; `status` is the `enum {None,Pending,Success,Failed,TimedOut}`. | The decode target: `abi.decode(result, (string))` for a string leg, `abi.decode(result, (int256))` for a number leg. |
| `MacroOracle` + `MacroDatum` + `IMacroOracleLatest` | `contracts/src/MacroOracle.sol`; the read seam is declared inside `MacroHedgeStrategist.sol:12-14` | Live datum source. `latest(dataKey) → MacroDatum{ dataKey, int256 scaledValue, uint64 observedAt, uint64 deliveredAt }`. `deliveredAt == 0` ⇒ unset (revert `UnknownKey`). | The strategist reads `d.scaledValue` as the macro `actual`. Deployed live at `0xAcA75144f644220f1dEAD5F989C350D8e0Cc983f`; CPI=568 proven. Reuse the v1's `IMacroOracleLatest` seam unchanged. |
| `PolygonPools` library | `contracts/src/libraries/PolygonPools.sol` | `POLYGON_WCOP_USDC_POOL_ID() → PoolId` (a `pure` function, NOT a `constant` — `PoolKey`/`PoolId` aren't compile-time constant-expressible) and `wcopUsdcKey() → PoolKey` | The STRAT-02 anchor. Agent 1 (an LLM) cannot mint a runtime `PoolId`; the mandate references the cornerstone pool by this stable constant. Shipped Phase 13 (commit `a91a708`), 3/3 green. |
| OpenZeppelin `Strings` | remap `@openzeppelin/` → `lib/v4-core/lib/openzeppelin-contracts/`; file `…/contracts/utils/Strings.sol` | `toStringSigned(int256) → string` for deterministic prompt building | Used by v1 (`using Strings for int256;`). `toStringSigned` confirmed present at `Strings.sol:49`. |

### Supporting (consumed by the type / the hand-off, not by Agent-1 logic)
| Component | Where | Purpose | When to Use |
|-----------|-------|---------|-------------|
| `PoolId` value type | `v4-core/types/PoolId.sol` (remap `v4-core/=lib/v4-core/src`) | The `underlyingMarket` field type in both `HedgeLegParams` and the new `HedgeMandate` | Import as `import {PoolId} from "v4-core/types/PoolId.sol";`. The mandate stores `PoolId underlyingMarket`. |
| `IMacroThesis` | `contracts/src/interfaces/IMacroThesis.sol` | TODAY an empty marker; Phase 12 gives it a concrete registry shape (STRAT-01). It is *also* the typed `economicTheory` field in `HedgeLegParams.sol:12`. | See §"`IMacroThesis` named-thesis registry" — the central design decision. |
| `HedgeLegParams` + `PayoffTerms` | `contracts/src/types/{HedgeLegParams,PayoffTerms}.sol` | Agent 2's DERIVED geometry target — **context only**. The mandate must carry enough for Phase 14 to *produce* one of these. | Read to understand the hand-off contract (§"The Phase-14 hand-off contract"). **Do NOT have Agent 1 emit a `HedgeLegParams`.** |
| `MockPlatform` + `MockMacroOracle` | `contracts/test/mocks/{MockPlatform,MockMacroOracle}.sol` | The Somnia-native unit harness: records what `_sendRequest` forwarded; `fulfill(...)` replays the callback as the platform; `oneResponse(result, status)` builds the `Response[]`. | The entire test pattern. Mirror `MacroHedgeStrategist.t.sol`. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| New `src/types/HedgeMandate.sol` value type | Reuse/overload `HedgeLegParams` with geometry zeroed | REJECTED by CONTEXT — the two-type seam is explicit and load-bearing; a zeroed `HedgeLegParams` muddies the Agent-1/Agent-2 boundary and invites the "Agent 1 sets geometry" anti-pattern. A distinct type makes the hand-off honest. |
| `IMacroThesis` as an **address-mapped** registry (school label → `address`) | `IMacroThesis` as an **enum-indexed** registry (`enum School` + a pure label↔enum map) | Both are viable (Claude's discretion). Address-mapped keeps `HedgeLegParams.economicTheory`'s `IMacroThesis` field type natural (it's already a contract-handle field) and lets a school be a real deployed strategy contract later. Enum-indexed is lighter and avoids deploying school stubs. See §"`IMacroThesis` registry" for the recommendation. |
| Deriving direction in-contract (Scenario 1 → `isLong=true`) | Inferring direction as a third `inferString` leg | A third leg = a third tx + a third 0.07-SOMI spend + another join flag. For the cornerstone (one Scenario), a derived `isLong=true` is the pragmatic, deterministic choice. Folding direction into the school-leg's reasoning is the middle path. CONTEXT marks this Claude's discretion. |

**Installation:** None. Everything is vendored/pinned. Confirm the toolchain:
```bash
cd contracts && forge --version   # forge 1.5.1-stable (confirmed 2026-06-06)
bulloak --version                  # bulloak 0.9.2     (confirmed 2026-06-06)
```

**Version verification (performed 2026-06-06):**
- `forge 1.5.1-stable` — note the `vm.expectRevert(bytes4)` exact-match-rejects-args behavior (use `vm.expectPartialRevert(selector)` for custom-error-with-args gates; Phase-13 lesson — though Phase-12's gates are mostly bare custom errors).
- `bulloak 0.9.2` — trees MUST use the `when/it` keyword form; bare `invariant_*`/free-text leaf labels do not parse, and `/` or `.` in branch text breaks parsing (repo-wide precedent: 07-03/04, 08-01).
- `solc = 0.8.24`, `evm_version = cancun`, `optimizer = true / runs = 200`, non-viaIR. `[invariant]` profile = `runs=16, depth=16, fail_on_revert=false` (additive floor for any fuzz/invariant; not needed for Phase 12 unless invariants are added).
- `src/` compiles today (only pre-existing `named-struct-fields` lint *notes* from `MacroOracle.sol`, non-blocking).

## Architecture Patterns

### Recommended Project Structure (what Phase 12 adds/changes)
```
contracts/src/
├── types/
│   └── HedgeMandate.sol          # NEW — the Agent-1 output value type
├── interfaces/
│   └── IMacroThesis.sol          # CHANGE — empty marker → concrete named-thesis registry
└── instrument/
    └── MacroHedgeStrategist.sol  # CHANGE — re-semantic the two legs; assemble+emit a HedgeMandate

contracts/test/
├── instrument/
│   ├── MacroHedgeStrategist.tree     # CHANGE — re-label leaves (school / notional / mandate)
│   └── MacroHedgeStrategist.t.sol    # CHANGE — mirror v1 harness against the new semantics
└── mocks/
    └── {MockPlatform,MockMacroOracle}.sol  # REUSE unchanged
```
**Decision point:** Phase 12 may *replace* the v1 contract in place (same file, the live deployment is a throwaway testnet artifact) or *add* a v2 alongside it. The CONTEXT says "upgrade the live Phase-11 v1" — recommend **in-place upgrade of `MacroHedgeStrategist.sol`** (rename `HedgeDecision`→`HedgeMandate`-bearing storage, `HedgeAction`→school handling). The redeploy is a fresh testnet address; nothing depends on the old bytecode.

### Pattern 1: Two-entrypoint, one-infer-per-tx, block-independent `decisionId` join (CARRY FORWARD VERBATIM)
**What:** Two `payable` entrypoints fire one infer call each, in two different transactions/blocks; an explicit `bytes32 decisionId` (derived from the FIRST leg's `requestId`, never `block.number`) joins them.
**Why it must not change:** `SomniaAgentConsumer._sendRequest` forwards the **WHOLE `msg.value`** to the platform (`SomniaAgentConsumer.sol:68`). Two infers in one tx → the first consumes the whole deposit, the second is starved → `TimedOut`. And the two callbacks arrive in different blocks, so any `block.number` in the id would compute a different id per leg and the join would never complete. This is the BLOCKER-1 fix, proven live.
**Phase-12 mapping (the only change is semantics):**
- `requestActionDecision(dataKey, consensus)` → **`requestSchoolDecision(dataKey, consensus)`** (or keep the prompt as a parameter — see Pattern 4): fires `inferString` over the registry's school `allowedValues`, allocates `decisionId = bytes32(requestId)`, stores the read `actual`+`consensus`, returns/emits the `decisionId`.
- `requestSizeDecision(decisionId)` → **`requestNotionalDecision(decisionId)`**: requires the school leg landed (`schoolSet == true && !notionalSet`), fires `inferNumber(minNotional, maxNotional)`.
**Example (the live v1 entrypoint — the shape to preserve):**
```solidity
// Source: contracts/src/instrument/MacroHedgeStrategist.sol:121-158 (live v1)
function requestActionDecision(bytes32 dataKey, int256 consensus) external payable returns (bytes32 decisionId) {
    MacroDatum memory d = IMacroOracleLatest(ORACLE).latest(dataKey);
    if (d.deliveredAt == 0) revert UnknownKey(dataKey);
    string memory prompt = _buildPrompt(d.scaledValue, consensus);
    string[] memory allowed = /* ["HOLD","ADD_LONG_GAMMA","REDUCE","EXIT"]  →  Phase-12: the SCHOOL labels */ ;
    bytes memory payload = abi.encodeWithSelector(ILLMAgent.inferString.selector, prompt, SYSTEM_PROMPT, false, allowed);
    uint256 requestId = _sendRequest(LLM_AGENT_ID, payload);          // ONE infer; whole msg.value forwarded
    decisionId = bytes32(requestId);                                  // STABLE, block-independent
    HedgeDecision storage slot = decisions[decisionId];
    require(slot.decidedAt == 0 && !slot.actionSet && !slot.sizeSet, "decision exists");
    slot.macroValue = d.scaledValue; slot.consensus = consensus;
    _leg[requestId] = Leg.Action; _decisionKey[requestId] = decisionId;
    emit HedgeDecisionRequested(requestId, decisionId, uint8(Leg.Action));
}
```

### Pattern 2: `_onResult` leg-routing with decode-safety (CARRY FORWARD; re-point the two branches)
**What:** The single `_onResult` override dispatches on `_leg[requestId]`. The string leg decodes behind `try this.decodeString(result)` (external self-call so a malformed payload routes to `DecisionFailed` instead of reverting/bricking the pending request); the number leg is 32-byte-length-guarded. The keccak-compare maps the returned label to a known value; a no-match emits `DecisionFailed` and leaves the set-flag false (NO enum-zero write).
**Phase-12 mapping:**
- `Leg.Action` branch → **`Leg.School`**: `try this.decodeString(result) → s`; `(SchoolHandle h, bool ok) = _mapSchool(s)`; on `!ok` emit `DecisionFailed` and leave `schoolSet=false`; on `ok` store the school handle + set `schoolSet=true`.
- `Leg.Size` branch → **`Leg.Notional`**: `if (result.length != 32) → DecisionFailed`; `int256 raw = abi.decode(result,(int256))`; clamp to `[minNotional, maxNotional]`; store + `notionalSet=true`.
- Join: when `schoolSet && notionalSet`, derive `isLong` (Scenario 1 → `true`), assemble the `HedgeMandate`, set `decidedAt`, emit `StrategistDecided`.
**Example (the live decode-safety to preserve):**
```solidity
// Source: contracts/src/instrument/MacroHedgeStrategist.sol:202-231 (live v1) + :246-248
try this.decodeString(result) returns (string memory s) {
    (HedgeAction a, bool ok) = _mapAction(s);          // Phase-12: _mapSchool(s) → (SchoolHandle, bool)
    if (!ok) { emit DecisionFailed(requestId, status); return; }   // no enum-zero write
    decisions[dk].action = a; decisions[dk].actionSet = true;       // Phase-12: school + schoolSet
} catch { emit DecisionFailed(requestId, status); return; }
// ...
function decodeString(bytes memory b) external pure returns (string memory) { return abi.decode(b, (string)); }
```

### Pattern 3: Assemble + store + emit at the join (the new content)
**What:** Replace `HedgeDecisionMade` with `StrategistDecided(decisionId, school, HedgeMandate)`; replace `getDecision` with `getMandate(decisionId) → HedgeMandate memory`. The struct stored by `decisionId` now carries (or composes) a `HedgeMandate` plus the `schoolSet`/`notionalSet` join flags + `decidedAt`.
**Recommended storage shape:**
```solidity
struct PendingMandate {
    // join scratch + derived inputs
    int256  macroValue;      // oracle scaledValue at request time (kept for provenance/event parity)
    int256  consensus;       // caller-supplied (kept for provenance)
    uint64  decidedAt;       // block.timestamp once BOTH legs land; 0 while pending
    bool    schoolSet;
    bool    notionalSet;
    // the assembled output (fields filled as legs land; emitted whole at the join)
    HedgeMandate mandate;
}
mapping(bytes32 => PendingMandate) public mandates;   // decisionId → pending/complete
```
(Or keep the v1's flat layout and build the `HedgeMandate` in memory at the join. Either is fine; the flat-build-at-join form keeps the struct closest to v1.)

**`getMandate` MUST be a typed accessor**, not the auto-generated mapping getter — exactly the v1 `getDecision` lesson (`MacroHedgeStrategist.sol:254-260`): the auto getter returns a positional tuple, so `mandates(id).mandate` does not compile in tests; `getMandate(id).underlyingMarket` does.

### Pattern 4: Prompt provenance — keep it deterministic, decide where the user prompt comes from
**What:** The v1 builds the prompt in-contract from `(actual, consensus)` via `_buildPrompt` (deterministic, `temperature=0` Qwen3-30B → consensus). The system prompt is a `string internal constant`.
**Phase-12 consideration (a real design fork the planner must resolve):** STRAT-01 says the school is "inferred *from the prompt*" and the live proof is "*different prompt* → different mandate". There are two ways to honor this:
- **(A) Deterministic in-contract prompt over macro factors** (v1-faithful): the entrypoint still takes `(dataKey, consensus)` (or several factor keys) and `_buildPrompt` casts them into the question "which economic school best frames hedging this macro state, and what notional?". "Different prompt" is then realized as *different macro inputs*. Lowest risk; reuses the v1 determinism story; but "the user's free-text hedging-intent prompt" is only indirectly present.
- **(B) Caller-supplied intent string** (vision-faithful to the UI's free-text box): the entrypoint takes a `string calldata userIntent` and the deterministic system prompt + the registry's school `allowedValues` constrain the inference. "Different prompt" is literal. The determinism caveat: the *system* prompt + `chainOfThought=false` + `allowedValues` keep the output constrained, but a free user string is part of consensus input — still deterministic per fixed (input, seed), which is what consensus requires.
**Recommendation:** lean **(B)** for the cornerstone (it matches the UI-AGENT-HANDOFF free-text box and makes the "different prompt → different mandate" live proof literal and compelling for the "Autonomous performance" judging), but keep the system prompt a contract constant and pass `chainOfThought=false`. If time-boxed, (A) is the safe fallback and is closest to the proven v1. Mark in the plan which is chosen; the `.tree` leaves differ slightly.

### Anti-Patterns to Avoid
- **Firing both legs in one tx.** The whole-`msg.value` forward starves the second (→ `TimedOut`). One infer per tx, keeper-sequenced. (Live-proven constraint.)
- **`decisionId` that mixes in `block.number`/`block.timestamp`.** The two callbacks arrive in different blocks → the join never completes on testnet. Derive from the first leg's `requestId`.
- **Agent 1 emitting geometry.** No `strikeWAD`, no `width`, no feasible-`size`, no `PayoffTerms` in the mandate. Those are Phase-14's representativeness outputs. The mandate carries *intent* only.
- **Letting a malformed/wrong-type payload revert the callback.** That bricks the pending request on the platform. Route to `DecisionFailed` (try/catch on the string leg, 32-byte guard on the number leg) and leave the set-flag false.
- **Re-declaring `handleResponse` or a bespoke `require(msg.sender==PLATFORM)`.** The base already does auth + `pendingRequests` + CEI + replay-revert. Override ONLY `_onResult`.
- **Writing an enum-zero / a default school on a no-match.** Mirror the v1 `_mapAction` `(…, false)` contract: on no-match, do not store, emit `DecisionFailed`.
- **Re-deriving the agent ID / signatures from scratch.** They are LIVE-PROVEN (see §"State of the Art"). Confirm-and-reuse.
- **Over-claiming the live path in the plan/SUMMARY.** The strategist's own *unit* tests are MockPlatform (no live agent); the live decision-moves run is a manual `workflow_dispatch` that spends STT. Do not claim the production `_onResult`→real-mandate→Agent-2 join is exercised by CI.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Callback authentication / replay / CEI | A bespoke `require(msg.sender==PLATFORM)` + a hand-rolled replay nonce | Inherit `SomniaAgentConsumer.handleResponse` + override only `_onResult` | The base already deletes `pendingRequests[id]` before dispatch (CEI), reverts `NotPlatform`/`UnknownRequest`. Re-implementing invites a replay hole. (Live-proven.) |
| Deposit/over-fund forwarding | A custom `createRequest{value:…}` with manual floor math | `_sendRequest(agentId, payload)` (forwards whole `msg.value`) | Encodes the "floor is a reserve, over-fund for `perAgentBudget`" non-negotiable from CLAUDE.md. |
| Constraining the LLM's school output | Free-text parsing of an arbitrary model reply | `inferString(…, allowedValues = registry labels)` + a keccak `_mapSchool` second guard | `allowedValues` is the *structural* guardrail — the model cannot return out-of-set. The keccak compare is the defensive second line (garbage → `DecisionFailed`). |
| Constraining the target notional | Post-hoc clamping of an unbounded number | `inferNumber(…, minNotional, maxNotional, false)` + a 32-byte length guard + a final clamp | Bounds are free guardrails; the length guard contains a string/non-int payload. |
| The cornerstone `PoolId` | Recomputing `keccak256(abi.encode(PoolKey))` in Agent 1 | `PolygonPools.POLYGON_WCOP_USDC_POOL_ID()` | An LLM cannot produce a runtime `PoolId`; the constant is the STRAT-02 anchor and is already shipped + tested. |
| Signed-int → string for the prompt | A hand-rolled itoa | OZ `Strings.toStringSigned(int256)` | Already used by v1; handles the sign + edge cases. |
| The unit test platform | A live testnet call in unit tests | `MockPlatform.fulfill(...)` / `.oneResponse(...)` | Somnia-native, deterministic, free, fast; the live run is a separate manual gate. |

**Key insight:** Nearly every "hard" part of this contract — auth, replay, deposit semantics, cross-block join, decode-safety — is *already solved and live-proven* in the base + v1. The phase's genuine new work is three small, well-scoped artifacts (`HedgeMandate`, the `IMacroThesis` registry, the school labels + notional bounds). Resist re-engineering the proven spine.

## Common Pitfalls

### Pitfall 1: Firing both infer legs in one transaction (the over-fund footgun)
**What goes wrong:** Both legs share one tx; the first `_sendRequest` forwards the whole `msg.value`, the second sees `msg.value` already spent (or splits it and under-funds both) → `perAgentBudget = 0` → runners skip → `TimedOut`, no callback.
**Why it happens:** `SomniaAgentConsumer._sendRequest` forwards `msg.value` whole by design (deposit-reserve semantics).
**How to avoid:** Two entrypoints, two transactions, keeper-sequenced (school → await callback → notional). This is already the v1 architecture — *keep it*.
**Warning signs:** A single entrypoint that calls `_sendRequest` twice; a test that fulfills two requests without a second `requestX{value:…}` call.

### Pitfall 2: A block-dependent `decisionId` (the cross-block join silently never completes)
**What goes wrong:** `StrategistDecided` never fires on testnet even though both callbacks succeed.
**Why it happens:** The two callbacks land in different blocks; a `decisionId` containing `block.number`/`block.timestamp` computes a different key per leg, so `schoolSet && notionalSet` is never true on one struct.
**How to avoid:** `decisionId = bytes32(firstLegRequestId)` — monotonic, unique, block-independent. Prove with a `vm.roll`+`vm.warp` between the two fulfills in the unit suite (the v1 has exactly this leaf: `test_GivenTheTwoCallbacksLandInDifferentBlocks`).
**Warning signs:** Any `keccak256(abi.encode(..., block.number, ...))` in the id derivation.

### Pitfall 3: Malformed / wrong-type payload bricking the pending request
**What goes wrong:** A reverting decode in `_onResult` reverts the whole `handleResponse`, which strands the request `Pending` on the platform and can wedge the demo.
**Why it happens:** `abi.decode(result, (string))` on a non-string blob, or `abi.decode(result,(int256))` on a non-32-byte blob, reverts.
**How to avoid:** String leg → `try this.decodeString(result)` (external self-call so the revert is caught) + the keccak `_mapSchool` second guard (garbage string → no label → `DecisionFailed`). Number leg → `if (result.length != 32) → DecisionFailed` *before* decoding. On any failure: emit `DecisionFailed`, leave the set-flag false, do not write a default. (All three are v1-proven leaves: unmapped string, int-blob-as-string, non-32-byte size.)
**Warning signs:** A bare `abi.decode` in `_onResult` not wrapped/guarded; a no-match path that writes a default school.

### Pitfall 4: `inferNumber` notional bounds that collide with downstream size semantics
**What goes wrong:** Re-using `[0, MAX_SIZE_BPS]` (the v1 bps cap) or the resolver's `[1, 127]` (`optionRatio`) for the *target notional* conflates Agent-1 intent with Agent-2 geometry.
**Why it happens:** Copy-paste from v1 / from the executor's `require(size <= 127)`.
**How to avoid:** Choose a *notional* range that expresses "the cash-flow amount to hedge" in an explicit unit (Claude's discretion — e.g. a USD-denominated notional in whole units, or a token-amount range). Document the unit in NatSpec. It is NOT a bps and NOT the `optionRatio` bound. Phase 14 maps `targetNotional` → a feasible `optionRatio ≤ 127` during the representativeness/size derivation.
**Warning signs:** `MAX_SIZE_BPS` or `127` appearing as the `inferNumber` max in Agent 1; the mandate carrying a field already bounded to `[1,127]`.

### Pitfall 5: The `IMacroThesis` field-type mismatch between the registry and `HedgeLegParams`
**What goes wrong:** `HedgeLegParams.economicTheory` is typed `IMacroThesis` (a contract handle). If the `HedgeMandate` stores the school as an `enum` or a `string`, Phase 14 has to translate to an `IMacroThesis` to fill `HedgeLegParams` — a hidden seam.
**Why it happens:** Choosing an enum-indexed registry for ergonomics without checking the downstream field type.
**How to avoid:** Decide the registry's *resolved handle type* with the hand-off in mind. Two coherent options: (a) **address/`IMacroThesis`-handle registry** — the mandate's `economicTheory` is an `IMacroThesis` (or `address`) that drops straight into `HedgeLegParams.economicTheory`; the registry maps a label → handle; OR (b) **enum registry + a `thesisAddressOf(School) → IMacroThesis` resolver** so Phase 14 can still get a handle. Recommend (a) for a clean hand-off (it matches the existing field type and the UI's "address is opaque, render the label" model). Document the chosen resolved type in the mandate's NatSpec.
**Warning signs:** The mandate stores a `School` enum but nothing in the registry resolves it to the `IMacroThesis` type `HedgeLegParams` expects.

### Pitfall 6: `bulloak 0.9.2` tree-parse breakage on re-labeled leaves
**What goes wrong:** `bulloak check` fails or the CI loop skips the tree silently.
**Why it happens:** A `/` or `.` in branch text, or a non-`when/it` keyword form, doesn't parse in 0.9.2 (repo-wide precedent).
**How to avoid:** Keep the re-labeled leaves in the `when … / it should …` form, ASCII, no `/` or `.` in branch text; co-locate `MacroHedgeStrategist.tree` with `MacroHedgeStrategist.t.sol` in `test/instrument/` (same-dir, full-stem rule). The CI `build-and-spec` job already globs `test/instrument/*.tree`, so a correctly-formed tree is auto-checked — but the loop is best-effort (non-blocking), so the real gate is local `bulloak check`.
**Warning signs:** `bulloak check` exit non-zero; a leaf label containing `MAX_SIZE_BPS`-style `_` is fine, but `cCOP/USD` is not (slash).

### Pitfall 7: Stale UI/event-schema drift (`StrategistDecided` shape)
**What goes wrong:** `docs/UI-AGENT-HANDOFF.md:102` currently documents `event StrategistDecided(uint256 indexed requestId, string thesis, HedgeLegParams spec)` — the OLD `HedgeLegParams`-shaped Agent-1 output, pre-dating the 2026-06-06 mandate correction. If the contract emits this, it re-introduces the rejected "Agent 1 sets geometry" seam; if it emits the corrected `StrategistDecided(decisionId, school, HedgeMandate)`, the frontend mock is out of sync.
**Why it happens:** The handoff doc was written before the scope correction.
**How to avoid:** The contract MUST emit the **CONTEXT-specified** `StrategistDecided(decisionId, school, HedgeMandate)` (mandate, not `HedgeLegParams`). Flag in the plan that `docs/UI-AGENT-HANDOFF.md` §4/§5 needs a reconciling edit (the frontend is a separate repo; coordinate, do not silently diverge). This is a documentation-reconciliation task, not a contract compromise.
**Warning signs:** A plan that copies the handoff-doc event signature verbatim; a `HedgeLegParams` parameter on `StrategistDecided`.

## Code Examples

Verified patterns from the live v1 contract and the canonical Somnia example.

### The exact `inferString(allowedValues)` encode (school leg)
```solidity
// Source: agentathon/somnia-agents-examples/contracts/SentimentAnalyzer.sol:78-90 (canonical)
//         + contracts/src/instrument/MacroHedgeStrategist.sol:132-139 (live v1)
string[] memory allowed = new string[](N);          // Phase-12: N = registry school count
allowed[0] = "SHILLER_MACRO_RISK";
allowed[1] = "POST_KEYNESIAN";
// ... extensible
bytes memory payload = abi.encodeWithSelector(
    ILLMAgent.inferString.selector,
    prompt,              // deterministic; built in-contract or from a caller intent string
    SYSTEM_PROMPT,       // string internal constant
    false,               // chainOfThought = false (speed + tighter consensus)
    allowed              // the STRUCTURAL guardrail — model cannot return out-of-set
);
uint256 requestId = _sendRequest(LLM_AGENT_ID, payload);
```

### The exact `inferNumber(min,max)` encode (target-notional leg)
```solidity
// Source: contracts/src/instrument/MacroHedgeStrategist.sol:172-174 (live v1)
//         + SentimentAnalyzer.sol:129-136
bytes memory payload = abi.encodeWithSelector(
    ILLMAgent.inferNumber.selector,
    prompt,
    SYSTEM_PROMPT,
    int256(MIN_NOTIONAL),    // Phase-12: a NOTIONAL floor (NOT 0-bps, NOT 1-optionRatio)
    int256(MAX_NOTIONAL),    // Phase-12: a NOTIONAL cap   (document the unit)
    false
);
uint256 requestId = _sendRequest(LLM_AGENT_ID, payload);
```

### The exact `Response.result` decode + guards (callback)
```solidity
// Source: contracts/src/instrument/MacroHedgeStrategist.sol:200-226 (live v1)
//         + MacroOracle.sol:202-220 (the same 32-byte-guard idiom)
bytes memory result = responses[0].result;           // consensus value at index 0

// string leg (school): external self-call so a bad payload is CAUGHT, not reverted
try this.decodeString(result) returns (string memory s) {
    (SchoolHandle h, bool ok) = _mapSchool(s);       // keccak compare vs registry labels
    if (!ok) { emit DecisionFailed(requestId, status); return; }
    // store h; schoolSet = true;
} catch { emit DecisionFailed(requestId, status); return; }

// number leg (notional): 32-byte length guard BEFORE decode
if (result.length != 32) { emit DecisionFailed(requestId, status); return; }
int256 raw = abi.decode(result, (int256));
uint256 notional = raw <= int256(MIN_NOTIONAL)
    ? MIN_NOTIONAL
    : (uint256(raw) > MAX_NOTIONAL ? MAX_NOTIONAL : uint256(raw));
```

### The MockPlatform unit-test idiom (Somnia-native; mirror this exactly)
```solidity
// Source: contracts/test/instrument/MacroHedgeStrategist.t.sol:63-74, 91-111 (live v1 suite, 17/17 green)
function _fireSchool() internal returns (bytes32 decisionId, uint256 schoolId) {
    schoolId = platform.nextId();                                    // the id createRequest WILL allocate
    decisionId = strategist.requestSchoolDecision{value: SEND}(KEY, CONSENSUS);
}
function _completeSchool(string memory label) internal returns (bytes32 decisionId, uint256 schoolId) {
    (decisionId, schoolId) = _fireSchool();
    platform.fulfill(address(strategist), schoolId,
        platform.oneResponse(abi.encode(label), ResponseStatus.Success), ResponseStatus.Success);
}
// auth/replay leaves call strategist.handleResponse(...) directly with a pranked non-PLATFORM sender
// and a replayed requestId — inherited NotPlatform / UnknownRequest, no new code to test.
```

### The typed accessor (REQUIRED — auto getter returns a tuple)
```solidity
// Source: the v1 getDecision lesson — contracts/src/instrument/MacroHedgeStrategist.sol:254-260
function getMandate(bytes32 decisionId) external view returns (HedgeMandate memory) {
    return mandates[decisionId].mandate;   // or assemble-in-memory if using the flat layout
}
```

## The `HedgeMandate` type — concrete design (resolves Research Gate 1)

**Location:** `contracts/src/types/HedgeMandate.sol` (new), mirroring the `HedgeLegParams.sol` file style.

**Recommended struct** (fields the CONTEXT mandates + the STRAT-02 hand-off needs; widths follow `HedgeLegParams` conventions):
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {PoolId} from "v4-core/types/PoolId.sol";
import {IMacroThesis} from "../interfaces/IMacroThesis.sol";

/// @notice Agent 1's output: the hedge INTENT (school + direction + target notional), NOT the
///         leg geometry. Agent 2 (Phase 14) derives moneyness/strike/width/feasible-size from this
///         + a representativeness measure to produce a HedgeLegParams. This type carries ONLY what
///         Agent 2 needs to start that derivation.
struct HedgeMandate {
    IMacroThesis economicTheory;  // the prompt-inferred school's resolvable handle (drops into HedgeLegParams.economicTheory)
    PoolId       underlyingMarket; // = PolygonPools.POLYGON_WCOP_USDC_POOL_ID() — the cornerstone anchor (Agent 1 can't mint a runtime PoolId)
    uint256      targetNotional;   // the cash-flow risk to hedge, in a documented unit (NOT bps, NOT optionRatio)
    uint32       chainId;          // 137 (Polygon) — matches HedgeLegParams.chainId width
    bool         isLong;           // derived direction (Scenario 1 → true)
}
```
**Rationale & discretion notes:**
- The **field order/widths mirror `HedgeLegParams`** so the hand-off feels native: `PoolId underlyingMarket`, `IMacroThesis economicTheory`, `uint32 chainId`, `bool isLong` all match. `targetNotional` is `uint256` (a notional amount; tighten to `uint128` only if a unit is fixed — discretion).
- **`economicTheory` as `IMacroThesis`** (not an enum, not a string) is the recommended resolved type — it drops straight into `HedgeLegParams.economicTheory` with zero translation (Pitfall 5). The registry maps the inferred *label* → this handle. (If the planner prefers an enum-indexed registry, store the enum here AND keep the handle resolvable — but the clean path is the handle.)
- **No geometry fields.** No `strikeWAD`, no `size`, no `PayoffTerms`. That is the whole point of the two-type seam.
- **Optional provenance fields** (Claude's discretion): the inferred `macroValue`/`consensus` could ride along for the UI/audit, but they're already in the `StrategistDecided` event's reasoning context; keep the struct lean.

## The `IMacroThesis` named-thesis registry — concrete design (resolves Research Gate 2)

**Today:** `interface IMacroThesis {}` — an empty marker, used as the `economicTheory` field type in `HedgeLegParams`. The Phase-13 resolver never reads it (it's a pass-through), which is why the empty marker compiled.

**Phase 12 gives it a concrete registry.** Two viable shapes (Claude's discretion per CONTEXT); recommended is the **handle-resolving registry** so the hand-off is clean:

**Recommended — a library/registry that exposes (a) the label set for `allowedValues`, (b) a label→handle map, (c) a label→prompt-bias string:**
```solidity
// Concrete registry shape (illustrative — exact form is plan-time discretion)
library MacroThesisRegistry {
    // (a) the allowedValues for the inferString school leg — the STRUCTURAL guardrail
    function schoolLabels() internal pure returns (string[] memory labels) {
        labels = new string[](2);            // extensible
        labels[0] = "SHILLER_MACRO_RISK";
        labels[1] = "POST_KEYNESIAN";
    }
    // (b) label → resolvable handle (drops into HedgeMandate.economicTheory / HedgeLegParams.economicTheory)
    function thesisOf(string memory label) internal pure returns (IMacroThesis, bool ok) { /* keccak compare → handle */ }
    // (c) label → a deterministic prompt-bias fragment (how the chosen school frames Agent 2's job)
    function promptBias(string memory label) internal pure returns (string memory) { /* per-school framing */ }
}
```
**Design decisions for the planner:**
- **`allowedValues` is built from `schoolLabels()`** — the single source of truth for both the inference guardrail and the `_mapSchool` keccak compare. Adding a school = one array entry (the "extensible" requirement).
- **The school biases the prompt** (CONTEXT): the chosen label resolves to a `promptBias` fragment that frames the inference ("operate under the Shiller macro-risk school: …"). For a free-text-intent flow (Pattern 4B), the school is *inferred first* from the user intent, then its bias is woven into the notional leg's prompt and carried as the frame Agent 2 (Phase 14) operates under. For determinism keep these fragments contract constants.
- **Resolved handle type = `IMacroThesis`** (Pitfall 5). For the demo, the handle can be a sentinel/`address(0)`-style marker per the UI model ("address is opaque, render the label") OR a real deployed per-school stub if a school needs on-chain behavior later. The mandate carries the handle; the UI renders the human label from the school string in the event.
- **`enum`-indexed alternative:** `enum School { SHILLER_MACRO_RISK, POST_KEYNESIAN }` + `function labelOf(School)`/`schoolOf(string)` pure maps. Lighter, but then `HedgeMandate` must either store the enum (and Phase 14 resolves enum→`IMacroThesis`) or still resolve to a handle. Slightly more seam; choose only if you don't want a handle type at all.

## The Phase-14 hand-off contract (in scope: WHAT the mandate carries; out of scope: HOW Phase 14 consumes it)

Phase 14's `resolveFromMandate(HedgeMandate)` will derive a `HedgeLegParams`. Phase 12's only obligation is that the mandate **carries enough** for that derivation. Mapping:

| `HedgeMandate` field | Feeds `HedgeLegParams` field | Phase-14 transform (NOT Phase-12's job) |
|----------------------|------------------------------|------------------------------------------|
| `economicTheory` (IMacroThesis handle) | `economicTheory` (direct copy) | none — pass-through |
| `underlyingMarket` (PoolId anchor) | `underlyingMarket` (direct copy) | none — pass-through |
| `isLong` (derived direction) | `isLong` (direct copy) | none — pass-through |
| `chainId` (137) | `chainId` (direct copy) | none — pass-through |
| `targetNotional` (intent amount) | `size` (feasible `optionRatio ≤ 127`) | **Phase-14 representativeness/size derivation** — maps the notional to a feasible size given pool liquidity. |
| — (NOT in the mandate) | `strikeWAD`, `payoffTerms{vol,horizonBlocks,tickSpacing,asset,riskPartner}` | **Phase-14 representativeness/geometry derivation** (the "inflation adjustment"). |

**STRAT-02 acceptance reduces to:** the mandate is well-formed (`underlyingMarket == POLYGON_WCOP_USDC_POOL_ID()`, the school handle is resolvable, `targetNotional ∈ [MIN_NOTIONAL, MAX_NOTIONAL]`, `chainId == 137`, `isLong` set). That is fully testable in the Somnia-native unit suite without touching Phase 14.

## State of the Art

| Old Approach (v1, Phase 11) | Current Approach (Phase 12) | When Changed | Impact |
|------------------------------|------------------------------|--------------|--------|
| Leg 1 `inferString` → `HedgeAction` enum (HOLD/ADD_LONG_GAMMA/REDUCE/EXIT) | Leg 1 `inferString` → economic **school** over the registry `allowedValues` | This phase | Same mechanism, new semantics + new label set sourced from the registry. |
| Leg 2 `inferNumber` → `sizeBps ∈ [0,10000]` | Leg 2 `inferNumber` → **target notional** ∈ a notional range | This phase | New bounds + unit; the `[1,127]` size bound moves to Phase-14. |
| Stores `HedgeDecision`; emits `HedgeDecisionMade(requestId, action, sizeBps, …)` | Assembles `HedgeMandate`; emits `StrategistDecided(decisionId, school, HedgeMandate)`; `getMandate(decisionId)` | This phase | New output type + event + getter; the UI-handoff doc's `StrategistDecided(…, HedgeLegParams)` is STALE and must be reconciled (Pitfall 7). |
| `IMacroThesis` = empty marker | `IMacroThesis` = concrete named-thesis registry | This phase | The STRAT-01 deliverable. |

**LIVE-PROVEN (do NOT re-derive — confirm-and-reuse):**
- `LLM_AGENT_ID = 12847293847561029384` — **confirmed on-chain** in the Phase-11 live run (`AgentRequested` target `0xb24ac1afbcefc708…`). The design-spec's "PARTIALLY VERIFIED, single community source" caveat is **RESOLVED** as of 2026-06-02.
- `inferString(prompt, system, bool, string[]) → string` and `inferNumber(prompt, system, int256, int256, bool) → int256` — the exact signatures in `ISomniaAgents.sol:73-88`, exercised live.
- `Response.result` decode: `abi.decode(result,(string))` (string leg), `abi.decode(result,(int256))` (number leg); consensus value at `responses[0]`.
- The async `createRequest → handleResponse` round-trip on Somnia testnet (chain 50312), platform `0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776`, with class-correct deposits (llm-inference 0.07 SOMI/leg; e2e script used `LLM_DEPOSIT = FLOOR + 0.21 STT` per leg).
- **`llm-inference` needs NO keeper-proxy** — it is a pure on-chain `createRequest` with a prompt payload (unlike json-fetch which fetches a proxy URL). The keeper's only role for the strategist is *sequencing* (refresh oracle → fire school leg → await callback → fire notional leg). This resolves a Phase-11 research gate and carries forward.

**Deprecated/outdated for this phase:**
- `docs/UI-AGENT-HANDOFF.md` §4/§5 `StrategistDecided(uint256, string thesis, HedgeLegParams spec)` — pre-dates the mandate correction; reconcile (Pitfall 7).
- The design spec's single-`requestHedgeDecision` entrypoint — already superseded by the two-entrypoint flow in Phase 11; stays superseded.

## Open Questions

1. **Prompt provenance: caller-supplied free-text intent (4B) vs deterministic macro-factor prompt (4A)?**
   - What we know: STRAT-01 says school is "inferred from the prompt" and the live proof is "different prompt → different mandate"; the UI has a free-text box.
   - What's unclear: whether the entrypoint takes a `string userIntent` or keeps `(dataKey, consensus)`.
   - Recommendation: lean 4B (literal "different prompt" proof, UI-faithful) with a contract-constant system prompt + `chainOfThought=false`; fall back to 4A if time-boxed. Plan must pick one (the `.tree` leaves differ).

2. **`IMacroThesis` registry: handle-resolving vs enum-indexed?**
   - What we know: both are CONTEXT-sanctioned (Claude's discretion); `HedgeLegParams.economicTheory` is typed `IMacroThesis`.
   - What's unclear: whether a school needs real on-chain behavior (then a deployed handle) or is purely a label+bias (then a sentinel handle / enum is enough).
   - Recommendation: handle-resolving registry with an `IMacroThesis` resolved type for a clean hand-off; sentinel handles for the demo (matches the UI "address opaque, render label" model).

3. **`targetNotional` unit + bounds.**
   - What we know: NOT bps, NOT `[1,127]`; it's "the cash-flow amount to hedge".
   - What's unclear: the denomination (USD whole units? a token amount? scaled?).
   - Recommendation: pick an explicit USD-notional whole-unit range, document it in NatSpec; Phase 14 maps it to a feasible `optionRatio`. The exact numbers are discretion — just make them coherent and non-degenerate so "different prompt → different notional" is observable.

4. **In-place upgrade vs v2-alongside.**
   - What we know: CONTEXT says "upgrade the live v1"; the live deployment is a throwaway testnet address.
   - Recommendation: upgrade `MacroHedgeStrategist.sol` in place; redeploy fresh. No bytecode dependency exists on the old address.

5. **`docs/UI-AGENT-HANDOFF.md` reconciliation ownership.**
   - What we know: the doc's `StrategistDecided` shape is stale; the frontend is a separate repo (~98% built against mocks).
   - Recommendation: include a doc-reconciliation task in the Phase-12 plan (update §4/§5 to the `HedgeMandate` shape) and a coordination note for the frontend; do not silently diverge.

## Validation Architecture

> `workflow.nyquist_validation: true` in `.planning/config.json` — this section is REQUIRED.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Foundry `forge` 1.5.1-stable + `bulloak` 0.9.2 (BTT trees) |
| Config file | `contracts/foundry.toml` (solc 0.8.24, cancun, optimizer/200, non-viaIR); `[invariant]` floor runs=16/depth=16/fail_on_revert=false (not needed unless invariants added) |
| Quick run command | `cd contracts && forge test --match-path 'test/instrument/MacroHedgeStrategist.t.sol' -vv` |
| Full suite command | `cd contracts && forge build && forge test --no-match-path 'test/**/*fork*'` (Somnia-native units are fork-free; the fork suite is the separate Phase-7/8/13 Base/Polygon lineage) |
| Live gate (manual) | `cd contracts && bash script/macro-hedge-strategist-e2e.sh` via the `somnia-e2e` `workflow_dispatch` job (spends STT; NEVER on push/PR) — the Phase-11 e2e script, adapted to assert a well-formed mandate |

### Phase Requirements → Test Map
| Req ID | Behavior (observable signal) | Test Type | Automated Command | File Exists? |
|--------|------------------------------|-----------|-------------------|--------------|
| STRAT-01 | `requestSchoolDecision(dataKey/intent, …)` fires ONE `inferString` to `LLM_AGENT_ID` with `allowedValues == registry.schoolLabels()`; marks the request pending; allocates `decisionId = bytes32(requestId)` | unit | `forge test --match-test test_WhenSchoolDecisionRequested -vv` | ❌ Wave 0 (mirror v1 `test_WhenRequestActionDecisionIsCalledWithAKnownDataKey`) |
| STRAT-01 | `requestNotionalDecision(decisionId)` requires `schoolSet && !notionalSet`, fires ONE `inferNumber` with the notional bounds | unit | `forge test --match-test test_WhenNotionalDecisionRequested -vv` | ❌ Wave 0 (mirror `requestSizeDecision` leaves) |
| STRAT-01 | School callback: a registry label → school handle stored + `schoolSet=true`; an UNMAPPED string → `DecisionFailed`, `schoolSet` stays false (NO default write); an int-blob-as-string → `DecisionFailed` | unit | `forge test --match-test 'test_GivenTheSchool*' -vv` | ❌ Wave 0 (mirror the 3 v1 action-callback leaves) |
| STRAT-01 | Notional callback: in-range stored unchanged; over-max clamped; negative→floor; non-32-byte→`DecisionFailed`, `notionalSet` false | unit | `forge test --match-test 'test_GivenTheNotional*' -vv` | ❌ Wave 0 (mirror the 4 v1 size-callback leaves) |
| STRAT-01 | Both legs land → `StrategistDecided(decisionId, school, HedgeMandate)` emitted once; `decidedAt > 0`; **survives a `vm.roll`+`vm.warp` between the two callbacks** (cross-block join) | unit | `forge test --match-test 'test_WhenBoth*|test_GivenTheTwoCallbacksLandInDifferentBlocks' -vv` | ❌ Wave 0 (mirror the 2 v1 join leaves) |
| STRAT-01 | Inherited auth/replay: non-`PLATFORM` caller → `NotPlatform`; unknown/replayed `requestId` → `UnknownRequest` | unit | `forge test --match-test 'test_WhenACallbackCaller*|test_GivenAnUnknownOrReplayed*' -vv` | ❌ Wave 0 (mirror the 2 v1 auth leaves; no new contract code) |
| STRAT-01 | LIVE: a real prompt → well-formed mandate on Somnia testnet; a **different prompt → a different mandate** (school and/or notional differ) | manual e2e | `bash script/macro-hedge-strategist-e2e.sh` (workflow_dispatch) | 🟡 adapt the Phase-11 script (decision-moves precedent: two tx hashes proven) |
| STRAT-02 | `getMandate(decisionId)` returns a well-formed `HedgeMandate`: `underlyingMarket == PolygonPools.POLYGON_WCOP_USDC_POOL_ID()`, school handle resolvable via the registry, `targetNotional ∈ [MIN,MAX]`, `chainId == 137`, `isLong` set | unit | `forge test --match-test 'test_GivenAMandateIsAssembled_*' -vv` | ❌ Wave 0 (new — assert each field against the anchor + bounds) |
| STRAT-02 | The mandate's field TYPES line up with the `HedgeLegParams` hand-off (`economicTheory` is an `IMacroThesis`, `underlyingMarket` a `PoolId`, `chainId` a `uint32`, `isLong` a `bool`) | unit / compile | `forge build` (type-level) + a unit leaf copying mandate fields into a `HedgeLegParams` scratch struct | ❌ Wave 0 (a compile-time + assertion proof of hand-off readiness; NO Phase-14 logic) |

### Sampling Rate
- **Per task commit:** `forge build && forge test --match-path 'test/instrument/MacroHedgeStrategist.t.sol' -vv` (fork-free, sub-second; run after every task).
- **Per wave merge:** `forge build && forge test --no-match-path 'test/**/*fork*'` (full Somnia-native + spec suite green; no sibling regressions — PolygonPools 3/3, OperationalCostManagement 10/10, MacroHedgeExecutor units, the rest of the strategist suite).
- **Phase gate:** the full fork-free suite green + `bulloak check` exit 0 on the co-located tree, BEFORE `/gsd:verify-work`. The live `workflow_dispatch` decision-moves run is the manual cornerstone proof (not a CI gate).

### Wave 0 Gaps
- [ ] `contracts/src/types/HedgeMandate.sol` — the new Agent-1 output type (STRAT-01/02). MUST exist before the contract refactor.
- [ ] `contracts/src/interfaces/IMacroThesis.sol` — promote the empty marker to the concrete named-thesis registry (STRAT-01). MUST exist before the school leg.
- [ ] `contracts/test/instrument/MacroHedgeStrategist.tree` — re-labeled BTT tree (`when/it` form, ASCII, no `/`·`.`), committed FIRST (Iron Law), covering: school request, notional request, school callback (mapped / unmapped / int-blob), notional callback (in-range / over-max / negative / non-32-byte), both-legs join (+ cross-block), auth/replay, mandate well-formedness (STRAT-02 field asserts).
- [ ] `contracts/test/instrument/MacroHedgeStrategist.t.sol` — the failing test before impl; mirror the v1 harness (`MockPlatform`/`MockMacroOracle`, `_fireSchool`/`_completeSchool`/`_fireNotional`, the event-emit asserts).
- [ ] No framework install needed; no new mocks needed (reuse `MockPlatform`/`MockMacroOracle`).
- [ ] (Coordination, not a test) `docs/UI-AGENT-HANDOFF.md` §4/§5 reconciliation to the `HedgeMandate`-shaped `StrategistDecided`.

## Sources

### Primary (HIGH confidence — read directly this session)
- `contracts/src/instrument/MacroHedgeStrategist.sol` (live v1 — the upgrade target; two-entrypoint flow, `_onResult`, decode-safety, `decisionId`, `getDecision` lesson).
- `contracts/src/SomniaAgentConsumer.sol` (base — auth/replay/CEI/`_sendRequest` whole-`msg.value` forward).
- `contracts/src/interfaces/ISomniaAgents.sol` (`ILLMAgent` signatures + `Response`/`ResponseStatus`).
- `contracts/src/MacroOracle.sol` + `contracts/src/interfaces/IMacroThesis.sol` (datum source; the empty marker to promote).
- `contracts/src/types/{HedgeLegParams,PayoffTerms}.sol` (the Phase-14 derived target — hand-off context).
- `contracts/src/libraries/PolygonPools.sol` (the `POLYGON_WCOP_USDC_POOL_ID()` anchor — STRAT-02).
- `agentathon/somnia-agents-examples/contracts/SentimentAnalyzer.sol` (canonical `inferString(allowedValues)`/`inferNumber(min,max)` encode + decode).
- `contracts/test/instrument/MacroHedgeStrategist.t.sol` + `contracts/test/mocks/{MockPlatform,MockMacroOracle}.sol` (the unit-test pattern to mirror — 17/17 green).
- `contracts/test/instrument/MacroHedgeStrategist.tree` (the existing BTT tree to re-label).
- `.planning/STATE.md` (Phase-11 live e2e evidence: CONSUMER `0xfA428171…`, two `HedgeDecisionMade` tx hashes, `LLM_AGENT_ID` confirmed on-chain, decision-moves proven; Phase-13 lessons).
- `.planning/REQUIREMENTS.md` (STRAT-01/02 reframed) + `.planning/ROADMAP.md` (Phase 12/13/14 goals + the corrected Agent-1/Agent-2 seam).
- `.planning/phases/12-…/12-CONTEXT.md` (the authoritative user decisions + Research Gates) + `.planning/phases/11-…/11-CONTEXT.md` (the v1 LOCKED decisions).
- `docs/superpowers/specs/2026-06-02-macro-hedge-strategist-design.md` (the v1 calling convention).
- `docs/UI-AGENT-HANDOFF.md` (the event-schema contract — and its stale `StrategistDecided` shape, flagged).
- Toolchain probed live: `forge 1.5.1-stable`, `bulloak 0.9.2`, `foundry.toml`, OZ `Strings.toStringSigned` at `Strings.sol:49`, the `contracts-ci.yml` bulloak `test/instrument/*.tree` glob.

### Secondary (MEDIUM confidence)
- `research/agentathon-agents/POC-AVAILABILITY-LOG.md` (agent IDs/prices, `inferString`/`inferNumber`/`inferToolsChat` signatures, custom-agents-are-Phase-2 verdict) — corroborates the live findings.
- `CLAUDE.md` (project) — SOMI price classes (llm-inference 0.07), testnet posture, the three-step planning-review gate the PLAN must pass.

### Tertiary (LOW confidence)
- None. Everything load-bearing in this phase is verified against the live contract, the live testnet run, or the canonical example. No claim rests on training data alone.

## Metadata

**Confidence breakdown:**
- Agent integration (IDs, signatures, decode, async round-trip): **HIGH** — LIVE-PROVEN on Somnia testnet in Phase 11 (two on-chain tx hashes, agent ID confirmed on-chain). The design-spec's "single community source" caveat is resolved.
- Architecture (two-entrypoint join, decode-safety, one-infer-per-tx): **HIGH** — the v1 skeleton is unit-proven (17/17) and live-proven; Phase 12 reuses it verbatim with new semantics.
- `HedgeMandate` type + `IMacroThesis` registry + notional bounds: **MEDIUM-HIGH** — the field set and hand-off mapping are derived directly from the CONTEXT + the existing `HedgeLegParams`/`PolygonPools` types; the exact widths/labels/bounds are Claude's discretion at planning (intentionally open), so the *design space* is HIGH-confidence but the *specific picks* are deferred to the plan.
- Testing (MockPlatform unit pattern, evm-TDD Iron Law, Somnia-native): **HIGH** — the harness exists and is green; Phase 12 mirrors it.

**Research date:** 2026-06-06
**Valid until:** ~2026-07-06 for the repo-local stack (stable; pinned toolchain). The Somnia *testnet* surface (agent ID, platform address, deposit floors) is volatile per CLAUDE.md ("stop-gap", re-fetch each milestone) — re-confirm the `LLM_AGENT_ID` and platform address against the Agent Explorer before the live `workflow_dispatch` run, even though they were on-chain-confirmed 2026-06-02.
