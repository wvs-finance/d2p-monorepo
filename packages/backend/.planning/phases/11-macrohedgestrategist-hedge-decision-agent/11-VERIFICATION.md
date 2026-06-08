---
phase: 11-macrohedgestrategist-hedge-decision-agent
verified: 2026-06-02T00:00:00Z
status: passed
score: 4/4 must-haves verified (AGENT-01..04)
re_verification: null
gaps: []
human_verification: []
notes:
  - "AGENT-03 live half is human-verified testnet evidence (STT-spending, non-reproducible by automated re-run). Verifier independently corroborated it READ-ONLY: both HedgeDecisionMade tx receipts return status 1 and the decoded event payloads match the SUMMARY byte-for-byte."
  - "on-chain getDecision(decisionId) returns zeros for both run ids — this is the documented Somnia-testnet storage-pruning characteristic (project memory: 'getRequest reverts, storage pruned'), NOT a gap. The authoritative evidence is the immutable HedgeDecisionMade event in the tx receipt logs, which is intact and decodes correctly."
---

# Phase 11: MacroHedgeStrategist Hedge-Decision Agent Verification Report

**Phase Goal:** A `MacroHedgeStrategist` (Somnia testnet) reads a `MacroOracle` datum + a consensus expectation and, via the Somnia LLM-Inference agent, autonomously emits a consensus-verified, structurally-bounded hedge decision (action enum + clamped size) through an authenticated callback — and a `contracts-ci.yml` gate confirms the repo's contract build/tests.

**Verified:** 2026-06-02
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #   | Truth | Status | Evidence |
| --- | ----- | ------ | -------- |
| 1   | `ILLMAgent` (inferString + inferNumber, NO inferChat/inferToolsChat) exists in the vendored interface and compiles | ✓ VERIFIED | `ISomniaAgents.sol:73-88`; `forge build` exit 0; `grep -E 'inferChat\|inferToolsChat'` returns nothing |
| 2   | `MacroHedgeStrategist is SomniaAgentConsumer`, references `LLM_AGENT_ID = 12847293847561029384`, builds green | ✓ VERIFIED | `MacroHedgeStrategist.sol:39,47`; `forge build` exit 0 |
| 3   | Two-entrypoint flow (`requestActionDecision`/`requestSizeDecision`) with explicit stable decisionId join | ✓ VERIFIED | `MacroHedgeStrategist.sol:120,164`; `decisionId = bytes32(requestId)` (block-independent); cross-block-join unit test passes |
| 4   | `enum HedgeAction { HOLD, ADD_LONG_GAMMA, REDUCE, EXIT }` + `allowedValues`-constrained inferString + `inferNumber(0, MAX_SIZE_BPS)` | ✓ VERIFIED | `MacroHedgeStrategist.sol:61,131-138,172`; `MAX_SIZE_BPS = 10_000` |
| 5   | Stores `HedgeDecision`, emits `HedgeDecisionMade` | ✓ VERIFIED | struct `:73-81`, event `:99-101`, emit `:236` |
| 6   | Authenticated callback inherited from `SomniaAgentConsumer` — no bespoke `require(msg.sender==PLATFORM)`, no redeclared `handleResponse` | ✓ VERIFIED | only `_onResult` overridden (`:188`); the sole `require(msg.sender` match is inside a doc comment (`:33`); auth unit tests `NotPlatform`/`UnknownRequest` pass |
| 7   | Unit suite passes + bulloak check exits 0 | ✓ VERIFIED | `forge test --match-path test/instrument/MacroHedgeStrategist.t.sol` → 17/17 passed; `bulloak check ...MacroHedgeStrategist.tree` exit 0 |
| 8   | LIVE Somnia-testnet run: in-enum action, in-range size, decision-moves-with-consensus | ✓ VERIFIED | Read-only RPC corroboration of both tx receipts (status 1) + decoded event payloads match SUMMARY exactly (see below) |
| 9   | `contracts-ci.yml` exists (valid YAML), Somnia e2e is `workflow_dispatch`-only, fork job has BASE_RPC_URL + RPC cache (`foundry-rpc-base-46700000-v1`) + shard + retries | ✓ VERIFIED | YAML parses; `somnia-e2e` gated `if: github.event_name == 'workflow_dispatch'`; fork job `:80-99` |
| 10  | `foundry.toml` has `rpc_storage_caching` for chain 8453; `CcopUsdcPool` renamed `.fork.*`; `.env`-independent exclusion proof passes | ✓ VERIFIED | `foundry.toml:10`; `CcopUsdcPool.fork.tree/.fork.t.sol`; `forge test --list --no-match-path 'test/**/*fork*'` lists NO `CcopUsdcPool` |

**Score:** 10/10 supporting truths verified → 4/4 requirements satisfied

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `contracts/src/interfaces/ISomniaAgents.sol` | `interface ILLMAgent` (inferString+inferNumber only) | ✓ VERIFIED | Lines 73-88; verbatim signatures; no inferChat/inferToolsChat; existing IJsonApiAgent/IAgentRequester untouched |
| `contracts/src/instrument/MacroHedgeStrategist.sol` | `is SomniaAgentConsumer`, two-entrypoint, enum, bounds, storage, event | ✓ VERIFIED | 287 lines, substantive; wired to ILLMAgent selectors + MacroOracle.latest + inherited handleResponse |
| `contracts/test/instrument/MacroHedgeStrategist.tree` | BTT spec (Iron Law, committed first) | ✓ VERIFIED | bulloak check exit 0; commit `71d3bec` |
| `contracts/test/instrument/MacroHedgeStrategist.t.sol` | MockPlatform unit suite | ✓ VERIFIED | 17/17 pass: encode/decode→enum/clamp/cross-block-join/payload-confusion/enum-zero-guard/negative-clamp/auth/replay/DecisionFailed |
| `contracts/script/macro-hedge-strategist-e2e.sh` | cast-driven live runner, class-correct deposits | ✓ VERIFIED | 13.6 KB, executable; LLM_DEPOSIT/JSON_DEPOSIT, requestActionDecision/requestSizeDecision, HedgeDecisionMade poll, PROXY_BASE/MacroReceived all present |
| `.github/workflows/contracts-ci.yml` | 3-job gate (build-and-spec / fork / somnia-e2e) | ✓ VERIFIED | Valid YAML; secret-free fork-excluded test green (48 tests); fork job cached/sharded/retried; e2e workflow_dispatch-only |
| `contracts/foundry.toml` | `rpc_storage_caching` chain 8453 | ✓ VERIFIED | Line 10 |
| `CcopUsdcPool.fork.{tree,t.sol}` | renamed for honest `*fork*` exclusion | ✓ VERIFIED | bulloak check exit 0; still `vm.createSelectFork(...46700000)`; excluded from keyless run |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | -- | --- | ------ | ------- |
| `MacroHedgeStrategist.sol` | `ILLMAgent.inferString/inferNumber.selector` | `abi.encodeWithSelector` | WIRED | Lines 138, 172 |
| `MacroHedgeStrategist.sol` | `MacroOracle.latest(dataKey).scaledValue` | immutable ORACLE read | WIRED | Lines 125-127 via `IMacroOracleLatest` |
| `MacroHedgeStrategist.sol` | `SomniaAgentConsumer.handleResponse` auth+replay | inheritance; only `_onResult` | WIRED | Line 188; no bespoke require |
| size leg | existing action decision struct | explicit `decisionId` param | WIRED | `requestSizeDecision(bytes32)` `:164`; guards `actionSet && !sizeSet` |
| `contracts-ci.yml` | Foundry RPC cache (pinned block) | `actions/cache@v4` | WIRED | key `foundry-rpc-base-46700000-v1` `:91` |
| `contracts-ci.yml` build-and-spec | secret-free fork-excluded run | `forge test --no-match-path 'test/**/*fork*'` | WIRED | `:68`; proven `.env`-independently via `--list` |
| `contracts-ci.yml` | Base fork tests | `secrets.BASE_RPC_URL` + `--shard` | WIRED | `:81,99` |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ----------- | ----------- | ------ | -------- |
| AGENT-01 | 11-01, 11-02 | `ILLMAgent` vendored; `MacroHedgeStrategist is SomniaAgentConsumer` calls LLM-Inference agent `12847293847561029384` | ✓ SATISFIED | Interface lines 73-88; contract line 47; forge build green |
| AGENT-02 | 11-02 | reads MacroOracle, inferString(allowedValues=HedgeAction) + inferNumber(0,MAX_SIZE_BPS), stores HedgeDecision + emits HedgeDecisionMade; bounds = guardrail | ✓ SATISFIED | Contract `:120-240`; 17/17 unit tests; bulloak clean |
| AGENT-03 | 11-02 (unit), 11-03 (live) | testnet run proves in-enum action + in-range size; authenticated/replay-safe callback; decision moves with consensus | ✓ SATISFIED | Unit auth/replay (11-02); LIVE corroborated read-only — both tx receipts status 1, payloads match (see below) |
| AGENT-04 | 11-04 | `contracts-ci.yml` gate (build + bulloak + fork w/ secret+cache+shard); Somnia e2e workflow_dispatch | ✓ SATISFIED | Workflow verified; foundry.toml caching; `.env`-independent exclusion proof passes |

All 4 declared requirement IDs (AGENT-01..04) are claimed by phase plans, mapped to "Phase 11 / Complete" in REQUIREMENTS.md, and verified against the codebase. No ORPHANED requirements (no AGENT-* IDs map to Phase 11 without a plan claiming them).

### Live On-Chain Corroboration (read-only, no STT spent)

RPC `https://api.infra.testnet.somnia.network`, CONSUMER `0xfA428171E1F5B56f92C67C002De1d8e90B053EE1` (has bytecode — deployed).

Decoded directly from the immutable `HedgeDecisionMade` event logs in the tx receipts (event topic `0xa04988c0…`, emitter = CONSUMER):

- **Run #1** tx `0x2a8ec994…3c36a5` — `status 1`; decoded: action=`1` (ADD_LONG_GAMMA), sizeBps=`0x1a90`=**6800**, macroValue=`0x238`=**568**, consensus=`0x1f4`=**500**. Matches SUMMARY.
- **Run #2** tx `0x5057f803…dc3575` — `status 1`; decoded: action=`2` (REDUCE), sizeBps=`0x238`=**568**, macroValue=`0x238`=**568**, consensus=`0x384`=**900**. Matches SUMMARY.

Both actions ∈ enum `{0,1,2,3}`; both sizes ≤ 10000; decision moves with consensus (fixed CPI 568: 500→ADD_LONG_GAMMA/6800 vs 900→REDUCE/568). Domain non-negotiables honored: testnet-only (chain 50312), authenticated callback inherited.

`getDecision()` for both ids returns zeros — this is the documented Somnia-testnet storage-pruning behavior (project memory: getRequest reverts / storage pruned), NOT a gap: the event log is the authoritative, immutable evidence and is intact.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| `.github/workflows/contracts-ci.yml` | 120-122 | "documented placeholder" in somnia-e2e job body | ℹ️ Info | BY DESIGN — AGENT-04 mandates the STT-spending e2e stay manual and NOT auto-run; the real runner is the committed `macro-hedge-strategist-e2e.sh`. Not a gap. |

No TODO/FIXME/stub/empty-return anti-patterns in any core artifact (contract, interface, e2e script).

### Human Verification Required

None. The AGENT-03 live half is human-verified testnet evidence (STT-spending, not reproducible by an automated re-run per the instructions), and the verifier independently corroborated it READ-ONLY from the on-chain tx receipts — the decoded `HedgeDecisionMade` payloads match the SUMMARY byte-for-byte. No remaining items need human action.

### Gaps Summary

No gaps. All four requirements (AGENT-01..04) are delivered by the codebase, not merely marked done:
- The `ILLMAgent` interface and `MacroHedgeStrategist` contract are substantive, build green, and are correctly wired to the LLM-Inference agent, the MacroOracle, and the inherited authenticated callback.
- The unit suite (17/17) and bulloak check pass.
- The live AGENT-03 evidence is independently corroborated on-chain (read-only): two successful `HedgeDecisionMade` events with in-enum actions, in-range sizes, and consensus-sensitive reasoning.
- The `contracts-ci.yml` gate is valid, the `.env`-independent fork-exclusion proof passes, and the keyless fork-excluded forge run is green (48 tests).

Note on goal framing: ROADMAP/REQUIREMENTS describe a single `requestHedgeDecision(dataKey, consensus)`; the PLAN-02 frontmatter deliberately supersedes this with the two-entrypoint `requestActionDecision`/`requestSizeDecision` flow (the documented BLOCKER-1 fix for the cross-block join — a single tx would starve the second infer via whole-`msg.value` forwarding). The verification brief and the phase plans both endorse the two-entrypoint design, so this is an intentional, documented divergence, not a gap.

---

_Verified: 2026-06-02_
_Verifier: Claude (gsd-verifier)_
