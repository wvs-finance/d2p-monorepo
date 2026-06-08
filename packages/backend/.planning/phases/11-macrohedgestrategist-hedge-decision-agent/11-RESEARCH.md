# Phase 11: MacroHedgeStrategist — autonomous on-chain hedge-decision agent (Agentathon POC) - Research

**Researched:** 2026-06-02
**Domain:** Solidity / Somnia agent-platform integration (LLM-Inference base agent), Foundry BTT (bulloak), GitHub Actions CI over a Base-fork suite
**Confidence:** HIGH on every load-bearing interface/signature claim (grounded in real repo code); MEDIUM on the live `LLM_AGENT_ID` (official examples repo, not the live Explorer REST API — which has none)

<user_constraints>
## User Constraints (from CONTEXT.md)

Everything in `11-CONTEXT.md` is a **locked decision** (PRD Express Path). This research CONFIRMS the open items and extracts exact signatures; it does NOT re-open locked choices.

### Locked Decisions (verbatim from CONTEXT.md)

**Interface (AGENT-01)**
- Add `ILLMAgent` to `contracts/src/interfaces/ISomniaAgents.sol` (which currently carries `IJsonApiAgent`), mirroring the agentathon example's signatures:
  - `inferString(prompt, system, chainOfThought, string[] allowedValues) → string` (constrained to `allowedValues`).
  - `inferNumber(prompt, system, int256 minValue, int256 maxValue, chainOfThought) → int256` (clamped to `[min,max]`).
- LLM-Inference agent ID is `12847293847561029384`.
- `MacroHedgeStrategist is SomniaAgentConsumer`; uses the proven `createRequest`→`handleResponse` pattern (same as `MacroOracle`), reusing inherited `PLATFORM` immutable, `_sendRequest`, the `handleResponse` auth guard + `pendingRequests` binding + CEI, and `sweep`.

**Contract behavior (AGENT-02)**
- `requestHedgeDecision(bytes32 dataKey, int256 consensus)` reads `MacroOracle.latest(dataKey)` (or the verified getter), builds a hedging-specialist prompt over `(actual, consensus)`, and fires:
  - `inferString(allowedValues = ["HOLD","ADD_LONG_GAMMA","REDUCE","EXIT"])` → action.
  - `inferNumber(0, MAX_SIZE_BPS)` → sizeBps.
- `enum HedgeAction { HOLD, ADD_LONG_GAMMA, REDUCE, EXIT }`; `allowedValues` array mirrors these labels verbatim; the callback maps returned label → enum, reverting (`DecisionFailed`) on an unmapped string (defensive).
- `MAX_SIZE_BPS` is a contract constant; `sizeBps` clamped to `[0, MAX_SIZE_BPS]`.
- callback stores `HedgeDecision { HedgeAction action, uint256/int256 sizeBps, int256 macroValue, int256 consensus, uint256 decidedAt }` and emits `HedgeDecisionMade(requestId, action, sizeBps, macroValue, consensus)`.
- `chainOfThought = false` for the constrained calls; the system prompt is a contract constant.
- the `allowedValues` / `[min,max]` bounds ARE the structural guardrail.

**Security / autonomy (AGENT-03)** — NON-NEGOTIABLE
- autonomy = decision freedom, NOT unauthenticated. `handleAction`/`handleSize` MUST require `msg.sender == PLATFORM`, match an outstanding `pendingRequests[requestId]`, delete the pending entry BEFORE state mutation (CEI), and carry a replay guard.
- owner-only `sweep` for rebates (inherited), `ZeroRecipient`-guarded.
- testnet integration must prove: in-enum action, in-range size, rejection of non-`PLATFORM` sender, rejection of replayed/unknown `requestId`, two runs with different `consensus` → different decisions.

**CI gate (AGENT-04)**
- new `.github/workflows/contracts-ci.yml`: `forge build` + per-file `bulloak check` over Phase-7/8/11 `.tree` files + the Base-fork tests.
- Base-fork tests use a `BASE_RPC_URL` Actions secret + a Foundry RPC cache keyed on the pinned block (46700000) + sharding to dodge the Alchemy 429 rate limit.
- the Somnia-testnet agent e2e stays a **manual `workflow_dispatch`** (it spends STT) — never on push/PR.

**Keeper / sequencing**
- keeper is on-demand for the demo (cadence-capable). Its role is sequencing: refresh `MacroOracle` → fire `requestHedgeDecision`.
- deposit sizing for llm-inference = 0.07 SOMI/agent × subSize; over-fund per the proven floor+price rule.

**Testing methodology**
- evm-tdd Iron Law — a `.tree` per behavioral unit (request / handleAction / handleSize / auth) committed BEFORE implementation; `bulloak check` enforces tree↔test correspondence.
- No Base fork needed for the strategist's own tests — it is Somnia-native.

### Claude's Discretion (verbatim from CONTEXT.md)
- Exact Solidity field types/widths inside `HedgeDecision` (e.g. `uint256` vs `uint16` for `sizeBps`), provided clamping and event signatures hold.
- The exact `MAX_SIZE_BPS` constant value (a sane bps cap, e.g. 10_000) unless the spec/research dictates otherwise.
- The precise wording of the system/user prompt constants, provided they cast a macro-hedging strategist over `(actual, consensus)` and are deterministic.
- File/test organization under `contracts/test/` consistent with existing `spec/` + `fork/` layout.
- CI job matrix/shard count and cache key details, provided the 429-avoidance goal is met and the Somnia e2e stays `workflow_dispatch`.
- Whether to split the interface addition, contract, tests, and CI into separate plans/waves.

### Deferred Ideas (OUT OF SCOPE — verbatim from CONTEXT.md)
- **Stretch (only if time before June 11):** replace the two `infer*` calls with one `inferToolsChat` loop where the LLM pulls the macro data itself (MacroOracle as an on-chain tool) and emits the decision calldata. Not required for phase completion.
- `LongGammaWrapper` execution (Phase 8); Somnia→Base hop (XCHAIN-01); PremiumSplitter/vault (Phase 9); native σ/consensus surprise route inside MacroOracle (deferred oracle-surprise phase). All out of scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AGENT-01 | `ILLMAgent` added to vendored interface; `MacroHedgeStrategist is SomniaAgentConsumer` calls LLM-Inference agent `12847293847561029384` via `createRequest`→`handleResponse` | Canonical `ILLMAgent` signatures extracted verbatim (§Standard Stack / Q1). Agent ID corroborated by two sources in the official examples repo (Q2). Base-contract reuse surface (`_sendRequest`, `handleResponse`, `pendingRequests`, CEI, `sweep`) read line-by-line from `SomniaAgentConsumer.sol`. |
| AGENT-02 | `requestHedgeDecision(dataKey, consensus)` reads `MacroOracle`, fires `inferString`(enum)+`inferNumber`(bounds), stores+emits `HedgeDecision`/`HedgeDecisionMade`; bounds = guardrail | Exact `MacroOracle.latest(bytes32) → MacroDatum` getter + `scaledValue` (int256) located (Q4). `abi.encodeWithSelector(ILLMAgent.infer*.selector, …)` payload convention + `Response.result` decode (`abi.decode(…, (string))` / `(int256)`) quoted from `SentimentAnalyzer.sol` (Q1). |
| AGENT-03 | Testnet run proves in-enum action + in-range size; authenticated callback (`msg.sender==PLATFORM` + request-binding + replay nonce) rejects spoofed/replayed responses; decision moves with consensus | The inherited `handleResponse` auth guard already enforces `msg.sender==PLATFORM` + `pendingRequests` binding + CEI delete-before-dispatch + replay-revert (`SomniaAgentConsumer.sol:78-91`). Validation Architecture maps each clause to a forge/spec or testnet signal. |
| AGENT-04 | `contracts-ci.yml` gates repo (`forge build` + per-file `bulloak check` + Base-fork tests w/ secret + RPC cache + sharding); Somnia e2e stays `workflow_dispatch` | `keeper-ci.yml` + `foundry.toml` read; `rpc_storage_caching` is currently ABSENT and must be added (Q5). Copyable workflow shape + cache key on pinned block 46700000 provided. |
</phase_requirements>

## Summary

Phase 11 is **almost entirely an assembly job over proven repo primitives**, not new research. The `SomniaAgentConsumer` base already owns the authenticated async callback, the `pendingRequests` replay guard, CEI, deposit-floor handling, and `sweep`. `MacroOracle` already proves the `createRequest`→`handleResponse` pattern end-to-end on Somnia testnet. The only genuinely new on-chain code is (a) one `ILLMAgent` interface block added to the vendored `ISomniaAgents.sol`, and (b) `MacroHedgeStrategist.sol`, which is structurally a two-method clone of the official `SentimentAnalyzer.sol` example wired to read `MacroOracle.latest(dataKey)` and store a richer decision struct.

All four research-gate questions resolve cleanly with repo-grounded evidence: the `ILLMAgent` signatures are present verbatim in the official examples interface; the `Response.result` decode is `abi.decode(result, (string))` for the action and `abi.decode(result, (int256))` for the size; the `MacroOracle` getter is the public mapping `latest(bytes32) → MacroDatum` whose `scaledValue` field is the `int256` macro print; LLM-Inference is **pure on-chain** (no keeper-proxy URL — confirmed by official Somnia docs), so the keeper's only role is sequencing; and the CI 429-avoidance comes from adding `rpc_storage_caching = "remote"` to `foundry.toml` plus caching `~/.foundry/cache` keyed on the pinned block, with `forge build` + per-file `bulloak check` + a `workflow_dispatch`-gated Somnia e2e.

**Primary recommendation:** Author `ILLMAgent` (copy the verbatim block from §Standard Stack), then write `MacroHedgeStrategist.sol` as `is SomniaAgentConsumer` using the `SentimentAnalyzer` calling convention but routing the auth/replay through the inherited `handleResponse` (do NOT reimplement the `require(msg.sender==PLATFORM)` from the example — the base already does it better, with the `pendingRequests` replay guard the example lacks). Commit one `.tree` per behavioral unit before impl; add `rpc_storage_caching` to `foundry.toml` and a `contracts-ci.yml` that caches the Foundry RPC cache on the pinned block.

---

## Priority Research Questions — Answered

### Q1. ILLMAgent signatures + Response decode — RESOLVED (HIGH)

**The canonical `ILLMAgent` interface** is present verbatim in the official examples repo at `agentathon/somnia-agents-examples/contracts/interfaces/ISomniaAgents.sol:92-113`:

```solidity
interface ILLMAgent {
    function inferString(
        string calldata prompt,
        string calldata system,
        bool chainOfThought,
        string[] calldata allowedValues
    ) external returns (string memory);

    function inferNumber(
        string calldata prompt,
        string calldata system,
        int256 minValue,
        int256 maxValue,
        bool chainOfThought
    ) external returns (int256);

    function inferChat(
        string[] calldata roles,
        string[] calldata messages,
        bool chainOfThought
    ) external returns (string memory);
}
```

For Phase 11 the vendored `contracts/src/interfaces/ISomniaAgents.sol` only needs `inferString` + `inferNumber` (drop `inferChat`/`inferToolsChat` unless the stretch goal is taken). **Note on data location:** the vendored repo's existing `IJsonApiAgent` already uses `calldata` for its string params (`ISomniaAgents.sol:62-67`), so copying `calldata` is consistent. Either `calldata` or `memory` works for ABI-encoding-only interfaces (the selector is identical); match the vendored file's existing `calldata` convention.

**The createRequest payload convention** — from `SentimentAnalyzer.sol:84-90` (action) and `:129-136` (size):

```solidity
// inferString (action enum) — SentimentAnalyzer.sol:84-90
bytes memory payload = abi.encodeWithSelector(
    ILLMAgent.inferString.selector,
    prompt,
    "You are a crypto market sentiment analyst. Classify the sentiment.",
    false,           // chainOfThought — false for speed
    allowedValues    // constrain to bullish/bearish/neutral
);

// inferNumber (bounded size) — SentimentAnalyzer.sol:129-136
bytes memory payload = abi.encodeWithSelector(
    ILLMAgent.inferNumber.selector,
    prompt,
    "You are a crypto market sentiment analyst. Return only a number.",
    int256(1),    // minValue
    int256(100),  // maxValue
    false         // chainOfThought
);
```

**The `Response.result` decode** — THE load-bearing detail. From `SentimentAnalyzer.sol:177` (string/action) and `:196` (int256/size):

```solidity
// action (inferString) callback — SentimentAnalyzer.sol:176-181
if (status == ResponseStatus.Success && responses.length > 0) {
    string memory result = abi.decode(responses[0].result, (string));
    ...
}

// size (inferNumber) callback — SentimentAnalyzer.sol:195-200
if (status == ResponseStatus.Success && responses.length > 0) {
    int256 result = abi.decode(responses[0].result, (int256));
    ...
}
```

So: **action = `abi.decode(responses[0].result, (string))`** then map label → `HedgeAction` enum (revert `DecisionFailed` on no match); **size = `abi.decode(responses[0].result, (int256))`** then clamp to `[0, MAX_SIZE_BPS]`. This exactly mirrors `MacroOracle._onResult`'s `abi.decode(result, (int256))` path (`MacroOracle.sol:209`) — the repo already does the int256 decode for json-fetch.

> **Hardening note the planner MUST carry:** `SentimentAnalyzer` decodes the string with a bare `abi.decode` that would REVERT the callback on a malformed payload (stranding the request). The repo's own `SomniaProbe` solved this with a try/catch around an external `decodeString` helper (`SomniaProbe.sol` `_onResult` → `try this.decodeString(result)`). **Use the `SomniaProbe` try/catch pattern, not the raw `SentimentAnalyzer` decode**, so a malformed action payload routes to a `DecisionFailed`/failure event instead of bricking the pending request. (`inferNumber`'s int256 decode needs the 32-byte length guard already used in `MacroOracle.sol:202-205`.)

### Q2. LLM_AGENT_ID confirmation — MEDIUM (corroborated, not Explorer-verified)

`12847293847561029384` is **corroborated by two independent sources inside the official `emrestay/somnia-agents-examples` repo** vendored in this codebase:
- `agentathon/somnia-agents-examples/contracts/SentimentAnalyzer.sol:27` — `uint256 public constant LLM_AGENT_ID = 12847293847561029384;`
- `agentathon/somnia-agents-examples/README.md` catalog table — `| LLM Inference | 12847293847561029384 | 4 (inferString, inferNumber, inferChat, inferToolsChat) | … |`

This is stronger than the spec's "single community source" framing (which referenced a dev.to article). **It is NOT independently verified against the live Agent Explorer** (`agents.testnet.somnia.network`): the Explorer is a client-rendered JS app with no public REST API (`/api/agents` and `/api/agents/<id>` both return HTTP 404; the page does not render via WebFetch). Official Somnia docs name the three base agents but only publish the `json-fetch` ID (`13174292974160097713`) inline — the LLM ID is not in the docs prose.

**Recommendation (do NOT block the plan):** treat the ID as MEDIUM-confidence and add a single **runtime-verify step** to the Somnia e2e: before the first STT-spending `requestHedgeDecision`, do a zero-cost sanity check — either query `PLATFORM`/registry for agent `12847293847561029384` existence, or run one tiny `inferString` and confirm a non-`TimedOut` callback. If the ID is wrong the request simply `TimedOut`s (no funds lost beyond the deposit rebate), so the failure mode is benign. Wire the ID as a contract constant so a one-line fix re-deploys.

### Q3. Keeper-proxy for llm-inference? — RESOLVED: NO PROXY (HIGH)

**LLM-Inference is pure on-chain inference — no off-chain proxy/keeper URL.** Evidence:
- Official Somnia developer blog (`blog.somnia.network/p/building-on-the-agentic-l1-a-developers`): *"Runs deterministic inference against an on-chain Qwen3-30B model"* — `inferString` is "single-turn classification", `inferNumber` is "single-turn integer output, clamped to a range." No URL argument; nothing fetches an external endpoint.
- Contrast with `json-fetch`: `MacroOracle.requestMacro` builds a `string url = string.concat(PROXY_BASE, ep.proxyPath)` and passes it to `fetchUint(url, "value", 0)` (`MacroOracle.sol:174-178`). The keeper-proxy exists ONLY because json-fetch must hit a URL and inject the paid TE key off-chain.
- `ILLMAgent.inferString`/`inferNumber` take **no URL parameter** — only `prompt`/`system`/bounds. There is nothing for a proxy to mediate.

**Conclusion:** the keeper-proxy (`keeper-eta-pied.vercel.app`) is **not involved** in the strategist's `inferString`/`inferNumber` calls. The keeper's role for this phase is **sequencing only**: (1) call `MacroOracle.requestMacro(dataKey)` to refresh the json-fetch datum (this still uses the proxy), wait for the `MacroReceived` callback, then (2) call `MacroHedgeStrategist.requestHedgeDecision(dataKey, consensus)` (pure on-chain to the LLM agent). No new proxy route, no proxy code change.

### Q4. MacroOracle getter — RESOLVED (HIGH)

The getter is the **auto-generated accessor of the public mapping** `latest`:

```solidity
// MacroOracle.sol:140
mapping(bytes32 => MacroDatum) public latest;
```

So the strategist calls **`MacroOracle.latest(bytes32 dataKey) returns (MacroDatum memory)`**, and the macro print is the **`scaledValue` field (`int256`)**:

```solidity
// MacroOracle.sol:69-74
struct MacroDatum {
    bytes32 dataKey;     // keccak256(name)
    int256 scaledValue;  // round(native * 10**decimals); sign per `kind`  ← THIS is `actual`
    uint64 observedAt;   // currently always 0 (agent fetches only "value")
    uint64 deliveredAt;  // block.timestamp of the callback
}
```

**Caveats the planner must carry:**
- A public mapping getter returning a struct destructures the tuple — from another contract, prefer importing the `MacroDatum` struct and calling `MacroOracle(addr).latest(dataKey).scaledValue`. Confirm the Solidity public-mapping-of-struct getter returns the full struct (it does in ^0.8.24; the struct has no nested arrays/mappings, so it is returnable).
- `observedAt` is currently always `0` (documented at `MacroOracle.sol:224`) — don't gate the strategist on freshness via `observedAt`. If staleness matters, use `deliveredAt` instead, or read it but don't require it.
- `scaledValue` scale is **per-dataKey** (the `Endpoint.decimals` in `TECatalog.seed()`, e.g. inflation is ×100 → 5.68% = 568). The prompt should pass the raw scaled int and state the scale, OR the strategist documents that `consensus` must be supplied in the same scale as `scaledValue`. Keep the prompt deterministic by passing both `actual` and `consensus` as same-scale ints.
- The strategist needs the `MacroOracle` address (immutable constructor arg) and must import the `MacroDatum` struct from `MacroOracle.sol`.

### Q5. contracts-ci.yml rate-limit mechanics — RESOLVED (HIGH; one config gap to add)

**Current state:** `foundry.toml` defines `[rpc_endpoints] base = "${BASE_RPC_URL}"` and a `[profile.ci]` with `fuzz.runs = 256` — but it has **NO `rpc_storage_caching` / `[profile.*] rpc_storage_caching` key** (read `foundry.toml:1-20` — absent). Foundry's RPC cache for forked state lives at `~/.foundry/cache/rpc/<chain>/<block>` and is keyed on the **pinned block** (the Phase-7 trees pin `BASE_FORK_BLOCK = 46700000`, `BaseForkHarness.tree:2`). For a pinned block the fork state is immutable, so a warm cache means **zero RPC calls on re-run** — the cleanest 429 defense.

**Three mechanisms, layered:**

1. **Enable + persist the Foundry RPC cache (primary).** Add to `foundry.toml`:
   ```toml
   [profile.default]
   # ... existing ...
   rpc_storage_caching = { chains = [8453], endpoints = "all" }   # cache Base mainnet fork state
   ```
   Then in CI, `actions/cache` the `~/.foundry/cache` dir keyed on the pinned block so warm runs make ~0 Alchemy calls:
   ```yaml
   - uses: actions/cache@v4
     with:
       path: ~/.foundry/cache/rpc
       key: foundry-rpc-base-46700000-v1
       restore-keys: foundry-rpc-base-
   ```
   The key includes the block number so a block bump busts the cache deterministically.

2. **Sharding (secondary — spreads the cold-cache call burst).** `forge test` supports `--shard <i>/<n>` (Foundry 1.5.1 confirmed installed; `forge --version` → `1.5.1-stable`). Run the fork suite in a matrix of N shards so each job makes a fraction of the RPC calls within Alchemy's rate window:
   ```yaml
   strategy:
     fail-fast: false
     matrix: { shard: [1, 2] }
   # step: forge test --match-path 'test/**/*fork*' --shard ${{ matrix.shard }}/2
   ```
   Keep the unit/spec suite (Somnia-native, no RPC) in a separate non-sharded job.

3. **Secret wiring.** `BASE_RPC_URL` is a repo Actions secret (already the convention — `keeper-ci.yml` uses keyless mocked tests precisely so fork PRs can't read secrets; the contracts fork job is the secret-bearing one). Pass it as `env: BASE_RPC_URL: ${{ secrets.BASE_RPC_URL }}` on the fork job only. **Fork PRs from untrusted forks cannot read this secret** (GitHub platform guarantee, same reasoning as `keeper-ci.yml:3-5`) — that's acceptable; the fork tests gate `push: master` and same-repo PRs.

**Copyable `contracts-ci.yml` shape:**
```yaml
name: contracts-ci
on:
  pull_request:
    paths: ["contracts/**", ".github/workflows/contracts-ci.yml"]
  push:
    branches: [master]
    paths: ["contracts/**", ".github/workflows/contracts-ci.yml"]
permissions:
  contents: read
jobs:
  build-and-spec:                       # fast, no RPC, no secret
    runs-on: ubuntu-latest
    defaults: { run: { working-directory: contracts } }
    steps:
      - uses: actions/checkout@v4
        with: { submodules: recursive }
      - uses: foundry-rs/foundry-toolchain@v1
      - run: forge build
      - name: bulloak check (per-file)
        run: |
          for t in test/spec/*.tree test/fork/*.tree test/instrument/*.tree; do
            bulloak check "$t"
          done
      - run: forge test --no-match-path 'test/**/*fork*'   # Somnia-native + spec
  fork:                                 # secret-bearing, cached, sharded
    runs-on: ubuntu-latest
    defaults: { run: { working-directory: contracts } }
    strategy: { fail-fast: false, matrix: { shard: [1, 2] } }
    env: { BASE_RPC_URL: "${{ secrets.BASE_RPC_URL }}" }
    steps:
      - uses: actions/checkout@v4
        with: { submodules: recursive }
      - uses: foundry-rs/foundry-toolchain@v1
      - uses: actions/cache@v4
        with:
          path: ~/.foundry/cache/rpc
          key: foundry-rpc-base-46700000-v1
          restore-keys: foundry-rpc-base-
      - run: forge test --match-path 'test/**/*fork*' --shard ${{ matrix.shard }}/2 -vvv
  somnia-e2e:                           # NEVER on push/PR — spends STT
    if: github.event_name == 'workflow_dispatch'
    runs-on: ubuntu-latest
    # ... wired only under a top-level `on: workflow_dispatch:` trigger ...
```
> Add `workflow_dispatch:` to the `on:` block and guard the e2e job with `if: github.event_name == 'workflow_dispatch'` so it never runs on push/PR. **`bulloak check` must be installed in CI** — add a step (`cargo install bulloak` or a release download); confirm the exact install in the plan (the repo uses it locally via the evm-tdd skill).

---

## Standard Stack

### Core
| Component | Version | Purpose | Why Standard |
|-----------|---------|---------|--------------|
| Foundry (`forge`) | 1.5.1-stable (installed, verified `forge --version`) | build/test/fork; `--shard` support | repo's existing toolchain; all trees + tests are forge BTT |
| `bulloak` | (repo evm-tdd skill) | `bulloak check` tree↔test correspondence (Iron Law) | enforces the repo's mandatory `.tree`-before-impl gate |
| Solidity | `0.8.24`, `evm_version = cancun` | contract compilation | pinned in `foundry.toml:4-5`; cancun transient-storage used by Phase-7 fork tests |
| `SomniaAgentConsumer` (in-repo base) | merged | inherited async callback + auth + replay + deposit + sweep | the proven base every consumer extends |
| `ILLMAgent` (new, vendored) | n/a | ABI-encode `inferString`/`inferNumber` payloads | copied verbatim from official examples interface |

### Supporting
| Component | Purpose | When to Use |
|-----------|---------|-------------|
| `MockPlatform` (`test/mocks/MockPlatform.sol`) | in-memory platform stub; records forwarded value/agentId/callback/selector; `fulfill()` replays callback as `msg.sender==PLATFORM` | ALL forge unit/spec tests for the strategist (no live agent) |
| `cast` (Foundry) | testnet send/poll/logs in the e2e shell script | Somnia-testnet integration run (model on `somnia-probe-e2e.sh`) |
| `actions/cache@v4` | persist `~/.foundry/cache/rpc` keyed on pinned block | CI fork job 429-avoidance |

### Don't Add
| Don't add | Why |
|-----------|-----|
| `inferChat` / `inferToolsChat` to the vendored interface | out of scope; `inferToolsChat` is the deferred stretch goal only |
| A new keeper-proxy route for llm-inference | llm-inference is pure on-chain (Q3) — no URL to proxy |
| A custom Somnia agent registration | Phase-2 feature, not buildable (POC log §1) |
| `lib`/external LLM SDK | the agent IS the LLM; the contract only encodes a payload |

**Installation:** No new package installs for contracts. CI needs the foundry toolchain action + a `bulloak` install step.

---

## Architecture Patterns

### Recommended File Layout
```
contracts/src/interfaces/ISomniaAgents.sol     # ADD `interface ILLMAgent { inferString; inferNumber; }`
contracts/src/instrument/MacroHedgeStrategist.sol   # NEW — is SomniaAgentConsumer
contracts/test/spec/MacroHedgeStrategist.requestHedgeDecision.tree   # NEW (committed before impl)
contracts/test/spec/MacroHedgeStrategist.handleAction.tree          # NEW
contracts/test/spec/MacroHedgeStrategist.handleSize.tree            # NEW
contracts/test/spec/MacroHedgeStrategist.auth.tree                  # NEW (or fold into handleAction/handleSize)
contracts/test/instrument/MacroHedgeStrategist.t.sol                # NEW — mirrors SomniaAgentConsumer.t.sol style w/ MockPlatform
contracts/script/macro-hedge-strategist-e2e.sh                      # NEW — model on somnia-probe-e2e.sh
.github/workflows/contracts-ci.yml                                  # NEW
contracts/foundry.toml                                              # EDIT — add rpc_storage_caching
```

### Pattern 1: Two-request decision via inherited base (AGENT-01/02)
**What:** `requestHedgeDecision` reads `MacroOracle.latest(dataKey).scaledValue`, builds a deterministic prompt over `(actual, consensus)`, and fires TWO `_sendRequest` calls — one `inferString` (action), one `inferNumber` (size). Each gets its own `requestId`; track which is which.
**When to use:** the locked AGENT-02 design (two infer* calls, not the stretch `inferToolsChat`).
**Example (composed from `SentimentAnalyzer.sol` + the repo's `_sendRequest`):**
```solidity
// Source: SentimentAnalyzer.sol:84-90 (encoding) + SomniaAgentConsumer.sol:63-74 (_sendRequest)
function requestHedgeDecision(bytes32 dataKey, int256 consensus)
    external payable returns (uint256 actionId, uint256 sizeId)
{
    int256 actual = ORACLE.latest(dataKey).scaledValue;   // MacroOracle.sol:140 getter
    string memory prompt = _buildPrompt(actual, consensus); // deterministic constant system prompt

    string[] memory allowed = new string[](4);
    allowed[0]="HOLD"; allowed[1]="ADD_LONG_GAMMA"; allowed[2]="REDUCE"; allowed[3]="EXIT";

    bytes memory actionPayload = abi.encodeWithSelector(
        ILLMAgent.inferString.selector, prompt, SYSTEM_PROMPT, false, allowed);
    bytes memory sizePayload = abi.encodeWithSelector(
        ILLMAgent.inferNumber.selector, prompt, SYSTEM_PROMPT, int256(0), int256(MAX_SIZE_BPS), false);

    // split msg.value across the two LLM requests; each over-funds floor + 0.07*subSize
    actionId = _sendRequest(LLM_AGENT_ID, actionPayload);   // pendingRequests[actionId]=true (base)
    sizeId   = _sendRequest(LLM_AGENT_ID, sizePayload);
    // bind requestId -> (kind, dataKey, actual, consensus) in a per-request mapping (like _pendingKey)
}
```
> **Deposit/`msg.value` footgun:** `_sendRequest` forwards the WHOLE `msg.value` (`SomniaAgentConsumer.sol:68`). Two calls in one tx means `msg.value` is consumed by the FIRST `_sendRequest` (it forwards everything). The planner MUST split the funding — either two separate transactions (cleaner; matches keeper sequencing), or compute and forward a per-request slice. The official `SentimentAnalyzer` does ONE infer per tx; following that (two keeper txs) is the lowest-risk path and matches `somnia-probe-e2e.sh`'s one-leg-per-`cast-send` shape. **Recommend: one infer call per transaction.**

### Pattern 2: Authenticated replay-safe callback via inherited `_onResult` (AGENT-03)
**What:** Do NOT write a bespoke `require(msg.sender==PLATFORM)` like `SentimentAnalyzer`. Implement only the `_onResult(requestId, responses, status)` hook; the base `handleResponse` already enforces auth + binding + CEI + replay.
**Evidence (`SomniaAgentConsumer.sol:78-91`):**
```solidity
function handleResponse(uint256 requestId, Response[] memory responses, ResponseStatus status, Request memory) external {
    if (msg.sender != address(PLATFORM)) revert NotPlatform(msg.sender);   // AGENT-03 auth
    if (!pendingRequests[requestId]) revert UnknownRequest(requestId);     // AGENT-03 binding + replay
    delete pendingRequests[requestId];                                     // CEI: clear BEFORE dispatch
    _onResult(requestId, responses, status);
}
```
The strategist's `_onResult` branches on the per-request kind: action → `abi.decode(...,(string))` → map to enum (try/catch per Q1) → store partial `HedgeDecision`; size → `abi.decode(...,(int256))` → clamp `[0,MAX_SIZE_BPS]`. When BOTH legs land, emit `HedgeDecisionMade`. Decide whether action+size complete independently or whether one emits and the other patches (Claude's discretion on struct/event sequencing — keep the event signature locked).

### Pattern 3: BTT `.tree` per behavioral unit (Iron Law)
**What:** One `.tree` per unit, committed before impl; `bulloak check` enforces correspondence. Mirror the existing `when … / given … / it should …` prose style.
**Reference style** (`SomniaAgentConsumer.handleResponse.tree`, `MacroOracle.tree`): top-level `Contract::method`, `when`/`given` branches, leaf `it should …`. The strategist needs trees for: `requestHedgeDecision` (unknown-key revert, oracle read, two payloads, pending+events), `handleAction` (decode+map+store, unmapped-string→DecisionFailed), `handleSize` (decode+clamp+store), and auth (non-PLATFORM revert, unknown/replayed requestId revert — may inherit from the base's existing tree, so a Phase-11 tree can focus on the strategist-specific decode/clamp/map).

### Anti-Patterns to Avoid
- **Reimplementing the auth guard in the callback** (as `SentimentAnalyzer` does) — the base does it better and adds the replay guard the example LACKS. Inherit, don't copy.
- **Raw `abi.decode((string))` in the callback** — reverts the platform callback on a malformed payload and STRANDS the pending request. Use `SomniaProbe`'s try/catch helper.
- **Forwarding `msg.value` to two `_sendRequest` calls in one tx** — the first forwards everything; the second under-funds. One infer per tx.
- **Gating on `MacroDatum.observedAt`** — it is structurally `0` today (`MacroOracle.sol:224`). Use `deliveredAt` for freshness if needed.
- **Floor-only deposit** (`value: deposit` as the official `invoke.ts` does) — that's the exact `TimedOut` regression the repo's over-fund doctrine fixes. Over-fund `floor + 0.07*subSize` for llm-inference.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Callback authentication | bespoke `require(msg.sender==PLATFORM)` | inherited `SomniaAgentConsumer.handleResponse` | base already enforces auth + `pendingRequests` binding + CEI + replay-revert (`:78-91`) |
| Replay protection | a new nonce mapping | inherited `pendingRequests` + `delete`-before-dispatch | already replay-safe; second delivery reverts `UnknownRequest` (proven `SomniaAgentConsumer.t.sol:135-142`) |
| Deposit forwarding / rebate egress | refund math, `receive()` | inherited `_sendRequest` + `receive()` + owner-only `sweep` | over-fund doctrine + `ZeroRecipient` guard already correct (`:42-74`) |
| Test platform stub | a new mock | `test/mocks/MockPlatform.sol` (`fulfill`, `oneResponse`, last-call recorders) | already replays callbacks from the platform address and records forwarded args |
| Action enum guardrail | post-hoc validation of arbitrary LLM text | `inferString(allowedValues=[…])` | the agent structurally cannot return out-of-set (free guardrail) |
| Size bound guardrail | clamping arbitrary numbers defensively | `inferNumber(0, MAX_SIZE_BPS)` + a belt-and-suspenders clamp | agent clamps to range; contract re-clamps for defense in depth |
| Forked-state RPC calls per CI run | re-fetching Base state | Foundry RPC cache keyed on pinned block 46700000 | immutable pinned-block state → warm cache → ~0 Alchemy calls |

**Key insight:** Phase 11 is ~80% inheritance. The novel surface is one interface block + one decode/clamp/map callback + prompt constants. The biggest risk is *reimplementing* something the base already does correctly (and worse — e.g. dropping the replay guard).

---

## Common Pitfalls

### Pitfall 1: Two infer* calls fighting over a single `msg.value`
**What goes wrong:** `_sendRequest` forwards the FULL `msg.value` to the platform (`:68`). Calling it twice in one tx leaves the second call with `msg.value` already spent (or, if you slice manually and miscompute, under the floor → `InsufficientDeposit` revert, or under the price term → `TimedOut`).
**Why:** the over-fund-everything doctrine is single-request-shaped.
**How to avoid:** one infer per transaction (two keeper txs), each over-funded `floor + 0.07*subSize`. Matches `somnia-probe-e2e.sh` (one leg per `cast send`).
**Warning sign:** a `TimedOut` callback on the size leg while the action leg succeeds.

### Pitfall 2: Raw string decode bricking the pending request
**What goes wrong:** `abi.decode(result, (string))` on a non-string payload REVERTS `handleResponse`; because the revert happens after `delete pendingRequests`, the request is consumed but un-handled, or (if before) it strands forever.
**Why:** `SentimentAnalyzer` decodes raw; the repo's base deletes pending before dispatch.
**How to avoid:** wrap the string decode in the `SomniaProbe` try/catch (`try this.decodeString(result)`), route failures to a `DecisionFailed` event. Guard the int256 decode with the 32-byte length check (`MacroOracle.sol:202`).
**Warning sign:** a real callback reverts on-chain instead of emitting a failure event.

### Pitfall 3: Wrong / unverified LLM agent ID → silent TimedOut
**What goes wrong:** if `12847293847561029384` is stale, the request `TimedOut`s with no clear signal (deposit rebates back).
**Why:** ID is MEDIUM-confidence (examples repo, not live Explorer; Q2).
**How to avoid:** keep the ID a contract constant; add the runtime-verify step (one tiny infer) at the top of the e2e before the gated demo runs.
**Warning sign:** every llm-inference request `TimedOut` while `MacroOracle` json-fetch works.

### Pitfall 4: CI `bulloak check` not installed / fork job leaks secret to PR forks
**What goes wrong:** `bulloak` missing in the runner → CI red on a tooling gap, not a real failure. Or putting `BASE_RPC_URL` on a job reachable by untrusted fork PRs.
**How to avoid:** add an explicit `bulloak` install step; keep the secret on the fork job and rely on GitHub's fork-secret guarantee (same posture as `keeper-ci.yml:3-5`). Gate the Somnia e2e behind `workflow_dispatch` only.
**Warning sign:** `bulloak: command not found`; secret-dependent fork tests "passing" on an external PR.

### Pitfall 5: `MacroOracle.latest` returns a stale/zero datum
**What goes wrong:** strategist reads `latest(dataKey)` before the keeper refreshed it → `scaledValue == 0` → garbage prompt.
**How to avoid:** keeper sequencing MUST refresh `MacroOracle` and await `MacroReceived` BEFORE calling `requestHedgeDecision` (the architecture diagram's step 1 → step 2). Optionally require `deliveredAt != 0` in `requestHedgeDecision`.
**Warning sign:** decisions that don't move with the macro print.

---

## Code Examples

### Verified ILLMAgent block to add to the vendored interface
```solidity
// Source: agentathon/somnia-agents-examples/contracts/interfaces/ISomniaAgents.sol:92-106 (verbatim, inferChat dropped)
interface ILLMAgent {
    function inferString(
        string calldata prompt,
        string calldata system,
        bool chainOfThought,
        string[] calldata allowedValues
    ) external returns (string memory);

    function inferNumber(
        string calldata prompt,
        string calldata system,
        int256 minValue,
        int256 maxValue,
        bool chainOfThought
    ) external returns (int256);
}
```

### Verified decode (the load-bearing detail)
```solidity
// Source: SentimentAnalyzer.sol:177 (action) and :196 (size)
string memory action = abi.decode(responses[0].result, (string));   // → map to HedgeAction enum
int256  sizeBps      = abi.decode(responses[0].result, (int256));    // → clamp to [0, MAX_SIZE_BPS]
```

### Verified MockPlatform-driven unit test shape
```solidity
// Source: SomniaAgentConsumer.t.sol:135-142 (replay), :91-96 (non-platform auth)
function test_RevertWhen_CallerNotPlatform() public {
    uint256 id = _pending();
    Response[] memory rs = platform.oneResponse(abi.encode(string("HOLD")), ResponseStatus.Success);
    vm.expectRevert(abi.encodeWithSelector(SomniaAgentConsumer.NotPlatform.selector, address(this)));
    strategist.handleResponse(id, rs, ResponseStatus.Success, _emptyReq());
}
function test_RevertGiven_SameRequestIdDeliveredTwice() public {
    uint256 id = _pending();
    Response[] memory rs = platform.oneResponse(abi.encode(string("HOLD")), ResponseStatus.Success);
    platform.fulfill(address(strategist), id, rs, ResponseStatus.Success);
    vm.expectRevert(abi.encodeWithSelector(SomniaAgentConsumer.UnknownRequest.selector, id));
    platform.fulfill(address(strategist), id, rs, ResponseStatus.Success); // replay → revert
}
```

---

## State of the Art

| Old Approach | Current Approach | When/Why | Impact |
|--------------|------------------|----------|--------|
| `SentimentAnalyzer` raw `require(msg.sender==PLATFORM)` in each callback | inherited `SomniaAgentConsumer.handleResponse` guard + `pendingRequests` replay | repo base (merged) | strategist must inherit, not copy — gains the replay guard the example lacks |
| `invoke.ts` `value: deposit` (floor only) | over-fund `floor + p_i*subSize`, forward whole `msg.value` | live finding 2026-06-01 (`sendRequest.tree` note) | floor-only `TimedOut`s; over-fund is mandatory |
| Custom Somnia agents | orchestrate the 3 base classes | Phase-2 feature not shipped (POC log §1) | use `12847293847561029384` LLM-Inference, not a registered agent |
| `foundry.toml` with no RPC caching | add `rpc_storage_caching` + cache `~/.foundry/cache/rpc` | this phase (Q5) | pinned-block warm cache defeats Alchemy 429 |

**Deprecated/outdated:**
- The spec's "single community source" framing for the LLM ID — upgraded to MEDIUM (two sources in the official examples repo), still not live-Explorer-verified.

---

## Open Questions

1. **LLM_AGENT_ID live verification**
   - What we know: `12847293847561029384` appears in the official examples `SentimentAnalyzer.sol` + README catalog.
   - What's unclear: not confirmed against the live Agent Explorer (no public REST API; client-rendered).
   - Recommendation: ship as a contract constant; add a one-shot runtime-verify infer at the top of the e2e. Benign failure mode (`TimedOut`, deposit rebates).

2. **Public-mapping-of-struct getter return from another contract**
   - What we know: `latest` is `mapping(bytes32 => MacroDatum) public`; `MacroDatum` has no nested arrays/mappings → returnable.
   - What's unclear: confirm `MacroOracle(addr).latest(key).scaledValue` compiles cleanly under 0.8.24 (it should; struct is fully value-typed).
   - Recommendation: import the `MacroDatum` struct; the planner's first task should `forge build` against a stub to confirm, else add a thin `latestScaled(bytes32) view returns (int256)` getter to `MacroOracle` (small, additive).

3. **`bulloak` install method in CI**
   - What we know: repo uses it locally via the evm-tdd skill.
   - What's unclear: exact CI install (cargo vs release binary).
   - Recommendation: pin a `bulloak` release download in `contracts-ci.yml`; the plan specifies the version.

4. **subSize for the deposit term**
   - What we know: default subSize is 3 (`getRequestDeposit()` floor); price term for llm-inference = 0.07 × subSize = 0.21 STT/call.
   - What's unclear: whether the demo uses default subSize 3 or a different one (`getAdvancedRequestDeposit`).
   - Recommendation: default subSize 3 (matches `MacroOracle`); over-fund `floor + 0.21` STT per infer; two infers + the oracle refresh ⇒ budget ~0.75–1.0 STT per full demo run; confirm wallet `0xF3c3…0a90` balance covers ≥3 runs before the gated demo.

---

## Validation Architecture

> nyquist_validation = true (`.planning/config.json`) — section included.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Foundry `forge` 1.5.1-stable (BTT via `bulloak`) + Somnia-testnet shell e2e (`cast`) |
| Config file | `contracts/foundry.toml` (add `rpc_storage_caching`) |
| Quick run command | `forge test --no-match-path 'test/**/*fork*'` (Somnia-native + spec; no RPC) |
| Full suite command | `forge build && forge test` (unit/spec + Base-fork) + per-file `bulloak check` |
| Live integration (manual) | `bash contracts/script/macro-hedge-strategist-e2e.sh` (spends STT — `workflow_dispatch` only) |

### Phase Requirements → Test Map
| Req ID | Behavior (observable signal) | Test Type | Automated Command | File Exists? |
|--------|------------------------------|-----------|-------------------|-------------|
| AGENT-01 | `ILLMAgent` compiles; strategist encodes `inferString`/`inferNumber` payloads to `LLM_AGENT_ID`; `MockPlatform.lastAgentId()==12847293847561029384`, `lastSelector()==handleResponse.selector` | unit (build + spec) | `forge build && forge test --mp test/instrument/MacroHedgeStrategist.t.sol` | ❌ Wave 0 |
| AGENT-01 | `.tree`↔test correspondence for every behavioral unit | bulloak | `bulloak check test/spec/MacroHedgeStrategist.*.tree` | ❌ Wave 0 |
| AGENT-02 | `requestHedgeDecision` reads `latest(dataKey).scaledValue`, sends action(allowedValues) + size(0,MAX) payloads; callback decodes string→enum + int256→clamp; stores `HedgeDecision`; emits `HedgeDecisionMade(requestId, action∈enum, sizeBps∈[0,MAX], macroValue, consensus)` | unit (MockPlatform.fulfill + vm.expectEmit) | `forge test --mp test/instrument/MacroHedgeStrategist.t.sol` | ❌ Wave 0 |
| AGENT-02 | unmapped action string → `DecisionFailed` (no brick); out-of-range size re-clamped | unit | same | ❌ Wave 0 |
| AGENT-03 | non-PLATFORM caller → `NotPlatform` revert, state unchanged | unit (`vm.prank` + `vm.expectRevert`) | same (mirror `SomniaAgentConsumer.t.sol:91`,`:158`) | ❌ Wave 0 |
| AGENT-03 | unknown/replayed `requestId` → `UnknownRequest` revert | unit | same (mirror `:98`,`:135`) | ❌ Wave 0 |
| AGENT-03 | LIVE: in-enum action + in-range size stored; two runs with different `consensus` → different decisions | Somnia-testnet integration | `bash script/macro-hedge-strategist-e2e.sh` (manual) | ❌ Wave 0 |
| AGENT-04 | `forge build` green; per-file `bulloak check` passes; Base-fork tests green under cache+shard; Somnia e2e NOT triggered on push/PR | CI workflow run | `.github/workflows/contracts-ci.yml` (push/PR) | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `forge build && forge test --no-match-path 'test/**/*fork*'` + `bulloak check` on the touched tree.
- **Per wave merge:** full `forge test` (incl. fork) + all-tree `bulloak check`.
- **Phase gate:** full suite green + one manual `workflow_dispatch` Somnia e2e showing `HedgeDecisionMade` on-chain (the demo-video evidence) before `/gsd:verify-work`.

### Wave 0 Gaps
- [ ] `contracts/test/spec/MacroHedgeStrategist.requestHedgeDecision.tree` — covers AGENT-02 (oracle read + dual payload)
- [ ] `contracts/test/spec/MacroHedgeStrategist.handleAction.tree` — AGENT-02/03 (decode→enum, DecisionFailed, auth/replay)
- [ ] `contracts/test/spec/MacroHedgeStrategist.handleSize.tree` — AGENT-02/03 (decode→clamp, auth/replay)
- [ ] `contracts/test/instrument/MacroHedgeStrategist.t.sol` — forge harness reusing `MockPlatform` (no new mock needed)
- [ ] `contracts/script/macro-hedge-strategist-e2e.sh` — Somnia-testnet runner (model on `somnia-probe-e2e.sh`; PRICE_TERM_WEI for the 0.07 class)
- [ ] `.github/workflows/contracts-ci.yml` — build + per-file bulloak + sharded/cached fork + workflow_dispatch e2e
- [ ] `contracts/foundry.toml` edit — add `rpc_storage_caching = { chains = [8453], endpoints = "all" }`
- [ ] `bulloak` install step in CI (no local install needed for runners)

*(MockPlatform already covers the agent-callback harness — no new mock required.)*

---

## Sources

### Primary (HIGH confidence — repo code, read line-by-line)
- `contracts/src/SomniaAgentConsumer.sol` — base auth guard `:78-91`, `_sendRequest` `:63-74`, `sweep` `:47-54`
- `contracts/src/interfaces/ISomniaAgents.sol` — `Request`/`Response`/`ResponseStatus` structs, `IJsonApiAgent`, `IAgentRequester`
- `contracts/src/MacroOracle.sol` — `latest` getter `:140`, `MacroDatum` `:69-74`, `_onResult` decode `:193-228`, json-fetch URL build `:174-178`
- `agentathon/somnia-agents-examples/contracts/interfaces/ISomniaAgents.sol:92-113` — canonical `ILLMAgent`
- `agentathon/somnia-agents-examples/contracts/SentimentAnalyzer.sol` — encode `:84-90`/`:129-136`, decode `:177`/`:196`, agent ID `:27`
- `agentathon/somnia-agents-examples/README.md` — agents catalog (LLM ID corroboration), network info
- `contracts/test/SomniaAgentConsumer.t.sol` — MockPlatform-driven test shape (auth/replay/sweep/decode-safety)
- `contracts/test/mocks/MockPlatform.sol` — `fulfill`/`oneResponse`/last-call recorders
- `contracts/src/SomniaProbe.sol` — try/catch decode-safety pattern; over-fund doctrine
- `contracts/script/somnia-probe-e2e.sh` — testnet runner template + PRICE_TERM_WEI deposit math
- `contracts/foundry.toml` — solc/evm/rpc_endpoints (NO rpc_storage_caching yet); `forge --version` → 1.5.1-stable
- `.github/workflows/keeper-ci.yml` — CI structure + fork-secret posture
- `contracts/test/spec/*.tree`, `contracts/test/fork/BaseForkHarness.tree` (pinned block 46700000), `contracts/test/instrument/*.tree` — BTT style + bulloak targets
- `.planning/REQUIREMENTS.md` — AGENT-01..04 verbatim

### Secondary (MEDIUM confidence — official docs/blog, verified)
- `blog.somnia.network/p/building-on-the-agentic-l1-a-developers` — "on-chain Qwen3-30B", inferString/inferNumber semantics, **llm-inference is pure on-chain (no URL)** [Q3]
- `docs.somnia.network/agents/invoking-agents/from-solidity` — createRequest pattern, json-fetch ID inline (LLM ID not in docs prose)

### Tertiary (LOW confidence — flagged for runtime verify)
- Live LLM agent ID `12847293847561029384` against `agents.testnet.somnia.network` — **UNVERIFIED via REST** (Explorer has no public API; `/api/agents*` → 404; client-rendered). Corroborated only by the examples repo. Runtime-verify in e2e.

## Metadata

**Confidence breakdown:**
- Standard stack / interface signatures: HIGH — `ILLMAgent` + decode quoted verbatim from official examples repo present in this codebase.
- Architecture / base reuse: HIGH — every inherited surface read line-by-line in `SomniaAgentConsumer.sol`.
- `MacroOracle` getter: HIGH — public mapping `latest(bytes32)→MacroDatum`, `scaledValue` is the int256 print.
- Keeper-proxy not needed for llm-inference: HIGH — official docs/blog confirm pure on-chain inference (no URL arg).
- CI 429 mechanics: HIGH on the approach (Foundry RPC cache + sharding + secret); `rpc_storage_caching` is an additive config gap, not a blocker.
- LLM agent ID liveness: MEDIUM — two official-examples sources, not live-Explorer-verified.
- Pitfalls: HIGH — each derived from a concrete repo line (over-fund doctrine, try/catch decode, single-msg.value footgun).

**Research date:** 2026-06-02
**Valid until:** 2026-06-11 (Agentathon deadline; the Somnia "stop-gap" gas/agent surface is volatile per CLAUDE.md — re-fetch the agent ID + deposit floor at the live demo). 7-day window given the fast-moving testnet surface.
