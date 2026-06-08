# Phase 3: Subgraph Indexing (INDEX-01) — Research

**Researched:** 2026-05-30
**Domain:** Managed subgraph authorship + deployment (Ormi 0xGraph / Somnia mainnet chain 5031), EVM event backfill, RPC parity/completeness reconciliation, AssemblyScript `eth_call` state-fill
**Confidence:** HIGH on architecture + decode + completeness mechanics; MEDIUM on Ormi-mainnet deploy slug + free-tier entity-count read surface (vendor docs incomplete — flagged as live deploy-probe items, consistent with the provisional DATA-SOURCE-01 verdict)

<user_constraints>
## User Constraints (from 03-CONTEXT.md)

### Locked Decisions (research HOW, not WHETHER — do not re-open)

1. **`responses` scope = AGGREGATE-ONLY (Σ executionCost), filled during backfill.** The `IAgentRequester` interface has NO `ResponseReceived` event (Phase-2 forward-note 1). Per-member `Response[]` (incl. each member's `executionCost`) is state-only, read via `getRequest(uint256) → Request` (**selector `0xc58343ef`**), keyed off the `requestId`s carried by `RequestFinalized`. **Decision:** during backfill, issue ONE batched `getRequest(requestId)` per finalized request and write a single aggregate `Σ_i executionCost` field on the request row. **Do NOT populate the per-member `responses` child table for M1** — per-member fill would be ≈3× entities (`subSize_default = 3` × ~165k requests ≈ 495k response rows) → blows the 300k free-tier entity cap. Child table = reserved schema shape, deferred (not populated).

2. **Entity-cap notification = PROJECTED-OVERAGE mid-backfill.** Extrapolate the entity count from the FIRST chunk of backfill against the 300k cap; if the projection would cross, pause and surface entity-count evidence immediately (maximum runway). No auto-spend; user pays $75/mo Ormi Production + confirms before provisioning; disable Ormi free-tier auto-upgrade at signup regardless. Expected M1 entity total (aggregate-only) ≈ request + finalized + committee-event rows on the order of a few × 165k — provisionally under 300k; this is a tripwire, not an expected fire.

3. **Liveness + rollback observation window = REPRESENTATIVE, not full 24h.** `safe_block_depth` (KPD-09-empirical): ≥1h continuous chain-head observation → `safe_block_depth_observed_max`; if zero rollback observed, `safe_block_depth = 1` (consistent with the KPD-09-docs PBFT-determinism verdict). Liveness: a few-hour representative window evidencing `indexer_head_lag_blocks` < 60 for ≥99% of polls is sufficient to close Phase 3. The literal "last 24 hours" figure is reported as an ongoing/continuous metric, NOT a hard phase-completion gate. Probe params unchanged: poll `_meta.block.number` vs `eth_blockNumber` every 5 min; escalate if gap > 60 blocks for 3 consecutive probes.

4. **Completeness-anomaly (leg-b structural-ratio) = PROCEED + LOG, halt only on GROSS deviation.** Default: proceed + record the deviation as a retroactive input to the free-vs-paid verdict. Safety-valve tripwire: if the deviation exceeds a stated hard band (e.g. > 2× the plan-phase tolerance), halt and surface a paid-archive-swap decision before continuing. The exact tolerance band + gross-deviation multiplier are a **plan-phase deliverable** with a stated derivation basis (sample-CI from the n=116 addendum sample, or a fixed ±X% justified against it).

### Claude's Discretion (research options + recommend)
- Subgraph authorship layout (`schema.graphql`, AssemblyScript mappings, `networks.yaml`/`networks.json` chain 5031 + proxy pin), the GraphQL entity model, batching strategy for `getRequest` calls, the contiguity-proof query, the parity/ordering report formats.
- Whether to sub-split into Phase 3a (manifest scaffold + admin handlers) / 3b (business-event handlers + parity + completeness gate) — optional, organizational only (MEDIUM-2 parallelism rationale is moot, Phase 2 complete).

### Locked-by-prior-work (confirm, don't re-derive)
- Parity mechanism = per-block-receipt scan over a stratified ≥300-window sample (`eth_getBlockReceipts` AVAILABLE, live-probed 2026-05-29T20:07Z).
- Subgraph authorship `subgraphs/iagentrequester/` per KPD-08; `subgraph.yaml` pins the proxy `0x5E5205CF…163E6`, never `address: null` (B3).
- Liveness probe: poll `_meta.block.number` vs `eth_blockNumber` every 5min, escalate if gap>60 for 3 consecutive (B2).
- Resolver `topic0_map_v1.json` has 5 events (RequestCreated `0xb623…`, RequestFinalized `0x65db…`, CommitteeDepositFailed `0x5c09…`, + 2 registered-unobserved `SubcommitteePaid`/`NativeTransferFailed`).
- uint256/hash columns → `pl.Utf8` only.
- No live network in CI (probes `__main__`-only).

### Deferred Ideas (OUT OF SCOPE — ignore completely)
- Per-member `responses` child table (per-validator detail) — reserved schema shape; populate only in a later milestone.
- Full 24h+ production-SLA liveness proof — ongoing metric, not an M1 gate.
- AdminChanged / governance-provenance tracking — declined for M1 (Phase-2 Upgraded-only scope).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support (which findings enable implementation) |
|----|-------------|---------------------------------------------------------|
| **INDEX-01** | Indexer deployed against the proxy `0x5E5205CF…163E6` on the DATA-SOURCE-01-selected host (Ormi free Developer, provisional), backfilled from deploy block 283,417,317 → head, with per-window RPC parity reconciliation (KPD-04), the three-leg binding completeness gate (SC#6), `(block_number, log_index)` ordering verification (SC#7), liveness probe (B2), and empirical `safe_block_depth` (KPD-09-empirical). Owns `subgraphs/iagentrequester/` authorship (KPD-08). | **Standard Stack** (`@graphprotocol/graph-cli` + Ormi/Somnia deploy surface) + **Architecture Patterns** (manifest, schema.graphql entity model, AssemblyScript handlers) + **The executionCost decode fork** (declared eth_call vs off-chain post-pass) + **Completeness Proof Mechanics** (3-leg) + **Parity/Ordering Mechanics** (`eth_getBlockReceipts`) + **Validation Architecture** (CI-testable decode/ratio/contiguity logic vs live-only backfill/liveness/rollback). |
</phase_requirements>

## Summary

Phase 3 authors and deploys a managed subgraph (`subgraphs/iagentrequester/`) on Ormi 0xGraph for Somnia mainnet (chain 5031), backfills the full `IAgentRequester` proxy event history (deploy block 283,417,317 → head ≈ 36.3M blocks), state-fills the aggregate `Σ executionCost` per finalized request via `getRequest`, and proves correctness through three independent gates: per-block-receipt RPC **parity** (agreement), a three-leg **completeness** gate (Blockscout tx-anchor + scout structural-ratio + indexer contiguity), and `(block_number, log_index)` tuple-for-tuple **ordering** verification. It also empirically measures `safe_block_depth` and runs a representative liveness window.

The single load-bearing design fork is **how the aggregate `Σ executionCost` is filled**. The `getRequest(requestId)` call returns the full `Request` struct whose nested `Response[]` array carries each member's `executionCost`; summing them is server-side work. Two feasible architectures exist: (A) **inside the subgraph** — a `try_getRequest(event.params.requestId)` `eth_call` from the `RequestFinalized` handler (optionally manifest-declared for parallel/cached execution at specVersion ≥ 1.2.0); (B) **a separate off-chain post-pass** — a batched JSON-RPC `eth_call getRequest` keyed off finalized `requestId`s via `probes/somnia_rpc.py`, written into the panel during Phase 5 join. **Recommendation: Architecture B (off-chain post-pass) as primary, with A available as an optional in-subgraph enrichment.** Rationale below — B keeps the nested-struct decode in tested Python (where uint256→`pl.Utf8` discipline already lives), avoids ~165k indexing-time eth_calls that slow Ormi backfill and risk the 1 req/s free-tier throttle, keeps the subgraph entity model lean (helps the 300k cap), and is independently re-runnable/CI-fixturable. A is documented because it is genuinely feasible and may be preferred if the planner wants the aggregate materialized at index time.

**Primary recommendation:** Author `subgraphs/iagentrequester/` (spec ≥ 1.2.0, `network: somnia`, proxy pinned, `startBlock: 283417317`) with three event handlers (RequestCreated, RequestFinalized, CommitteeDepositFailed) mapping to a flat `Request` entity + a `CommitteeEvent` entity; deploy via `@graphprotocol/graph-cli` to the Somnia-mainnet Ormi endpoint; fill `Σ executionCost` via a batched off-chain `getRequest` post-pass; validate with three independent gates whose pure decode/ratio/contiguity logic is CI-fixtured and whose live deploy/backfill/liveness/rollback steps are `__main__`-only probes + recorded-constant assertions.

## Standard Stack

### Core
| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| `@graphprotocol/graph-cli` | latest (verify at plan-phase, `npm view @graphprotocol/graph-cli version`) | `graph init` / `codegen` / `build` / `deploy` — the universal subgraph toolchain | Ormi's own USDC walkthrough installs exactly `npm install -g @graphprotocol/graph-cli`; Somnia docs use the same CLI |
| `@graphprotocol/graph-ts` | latest (matched to graph-cli; verify) | AssemblyScript runtime types (`BigInt`, `Bytes`, `Address`, `ethereum.*`, generated `Contract.bind`/`try_*`) | The AssemblyScript mapping API; `try_getRequest` is generated from the ABI |
| Ormi 0xGraph (Somnia mainnet) | managed service | Subgraph host — deploy node + IPFS + GraphQL query endpoint | DATA-SOURCE-01 selected host; "works across 70+ chains"; Somnia mainnet served at `subgraph.somnia.network` |
| Somnia public archive RPC | `https://api.infra.mainnet.somnia.network/` | Direct-RPC parity reference (`eth_getBlockReceipts`, `eth_getLogs`, `eth_getBlockByNumber`, `eth_call`) + the off-chain `getRequest` state-fill | Full archive at deploy block; `eth_getBlockReceipts` AVAILABLE; `eth_getLogs` cap 1000 |
| Blockscout v2 | `https://explorer.somnia.network/api/v2` | Independent transaction-coverage anchor (`/addresses/{addr}/counters → transactions_count`) | The ONLY cheap EXACT independent oracle for completeness leg (a) |
| polars | ≥ 1.20 (repo floor; 1.41.2 in use) | Parity/ordering/contiguity reports + executionCost decode output (uint256→`pl.Utf8`) | Established repo discipline; `pl.Decimal(38,0)` overflows uint256 |

**Deploy surface (Somnia mainnet — VERIFY both at plan/deploy time):**
- **Somnia-hosted Ormi endpoint (canonical for Somnia mainnet):** deploy node `https://api.subgraph.somnia.network/deploy`, ipfs `https://api.subgraph.somnia.network/ipfs`, dashboard/query at `https://subgraph.somnia.network/` (Somnia docs + Ormi-on-Somnia).
- **Generic Ormi endpoint (from Ormi's own USDC blog):** deploy node `https://subgraph.api.ormilabs.com/deploy`, ipfs `https://subgraph.api.ormilabs.com/ipfs`.
- These are two faces of the same Ormi 0xGraph service. **The Somnia-hosted endpoint is the one the Somnia docs point at for chain 5031** — use it for the mainnet deploy unless a deploy-probe shows otherwise.

```bash
npm install -g @graphprotocol/graph-cli
# scaffold (network slug — see CAVEAT below; testnet docs show "somnia-testnet")
graph init --contract-name IAgentRequester \
  --from-contract 0x5E5205CF39E766118C01636bED000A54D93163E6 \
  --network somnia subgraphs/iagentrequester     # verify "somnia" vs "somnia-mainnet"
graph codegen && graph build
graph deploy iagentrequester \
  --node https://api.subgraph.somnia.network/deploy \
  --ipfs https://api.subgraph.somnia.network/ipfs \
  --deploy-key <ORMI_API_KEY>
```

### Supporting (paid fallbacks — pre-costed, sign-off-gated)
| Option | Price | When to use |
|--------|-------|-------------|
| Ormi Production | $75/mo | Forced if free 300k-entity cap projected-overage fires (decision 2) OR 1 req/s too slow — zero re-author, subgraph-compatible. **Requires sign-off before provisioning.** |
| GetBlock Somnia archive (Starter) | $39/mo | Only if the subgraph path fails entirely — triggers an INDEX-01 **sub-plan re-author** (RPC-scan, not AssemblyScript). |

### Alternatives Considered
| Instead of | Could use | Tradeoff |
|------------|-----------|----------|
| Ormi managed subgraph | Direct-RPC backfill via `probes/somnia_rpc.py` over ~36,287 capped `eth_getLogs` windows | Feasible (full archive at deploy block) and is in fact the parity reference, but loses the KPD-08 mapping surface + SC#2 parity-vs-subgraph contract; reserved as the GetBlock sub-plan re-author path, not the M1 primary |
| In-subgraph `try_getRequest` enrichment (Arch A) | Off-chain batched `getRequest` post-pass (Arch B) | See "executionCost decode fork" — B recommended |
| graph-cli `networks.json` | manifest-inline `network:` + per-network `subgraph.yaml` | graph-cli supports both; `networks.json` keeps chain/address/startBlock out of the manifest for multi-network reuse — recommended for the proxy pin + startBlock |

**Version verification (plan-phase):** run `npm view @graphprotocol/graph-cli version` and `npm view @graphprotocol/graph-ts version`; pin both in `subgraphs/iagentrequester/package.json`. Training-data versions are stale; the manifest `specVersion` MUST be **≥ 1.2.0** if any declared eth_call is used (Arch A).

## Architecture Patterns

### Recommended Project Structure
```
subgraphs/iagentrequester/
├── subgraph.yaml          # manifest: spec >=1.2.0, proxy pinned (B3, never address:null), startBlock 283417317
├── schema.graphql         # entity model (Request, CommitteeEvent) — flat, uint256→String (BigInt cap)
├── networks.json          # { "somnia": { "IAgentRequester": { "address": "0x5E52…163E6", "startBlock": 283417317 } } }
├── abis/IAgentRequester.json   # ABI incl. getRequest + the 3 observed events (from references/interfaces/)
├── src/mapping.ts         # AssemblyScript handlers: handleRequestCreated / handleRequestFinalized / handleCommitteeDepositFailed
├── package.json           # pins graph-cli/graph-ts
└── tests/                 # matchstick unit tests (optional) — OR pure-python decode tests in repo tests/

indexing/
├── completeness_proof.md      # SC#6 three-leg gate (tx-anchor + structural-ratio + contiguity)
├── ordering_verification.md   # SC#7 (block_number, log_index) tuple-for-tuple + block_ts_utc exact
└── parity_report.md           # SC#2 per-block-receipt agreement over stratified >=300 windows

.planning/scout/2026-05-29/
└── rollback_observation.md    # KPD-09-empirical safe_block_depth (NOTE: 2026-05-29 canonical, NOT 2026-05-25)
```

### Pattern 1: Manifest pins the proxy, never `address: null` (PITFALLS B3)
**What:** `subgraph.yaml` registers exactly one dataSource at the proxy address with `startBlock: 283417317`. Every indexed row's `log.address` MUST equal the proxy (write-time assertion).
**When:** always — this is the B3 non-negotiable.
```yaml
# subgraph.yaml (sketch; spec >=1.2.0 required only if declared calls used)
specVersion: 1.2.0
schema: { file: ./schema.graphql }
dataSources:
  - kind: ethereum
    name: IAgentRequester
    network: somnia                          # VERIFY slug (testnet docs show "somnia-testnet")
    source:
      address: "0x5E5205CF39E766118C01636bED000A54D93163E6"   # proxy — NEVER null (B3)
      abi: IAgentRequester
      startBlock: 283417317                  # resolved deploy block
    mapping:
      kind: ethereum/events
      apiVersion: 0.0.9
      language: wasm/assemblyscript
      entities: [Request, CommitteeEvent]
      abis:
        - name: IAgentRequester
          file: ./abis/IAgentRequester.json
      eventHandlers:
        - event: RequestCreated(uint256 indexed,uint256 indexed,uint256,bytes,address[])
          handler: handleRequestCreated
        - event: RequestFinalized(uint256 indexed,uint8)
          handler: handleRequestFinalized
          # OPTIONAL (Arch A only): declared eth_call — parallel + in-memory cached, spec>=1.2.0
          # calls:
          #   IAgentRequester.getRequest: IAgentRequester[event.address].getRequest(event.params.requestId)
        - event: CommitteeDepositFailed(uint256 indexed,uint256)
          handler: handleCommitteeDepositFailed
      file: ./src/mapping.ts
```
> Event signatures use the **resolved** `topic0_map_v1.json` roles: `RequestFinalized(uint256,uint8)` (ResponseStatus enum → uint8), `CommitteeDepositFailed(uint256,uint256)`. Do NOT hard-code the scout's likely-inverted labels. The two ABI-defined-but-unobserved events (`SubcommitteePaid`, `NativeTransferFailed`) need not be registered as handlers for M1 (they never fire); keep them in the ABI for `getRequest`/completeness only.

### Pattern 2: Flat entity model (uint256 → String) for the 300k cap
**What:** `schema.graphql` maps each request to one `Request` entity and each committee-deposit-failed log to one `CommitteeEvent`. uint256 ids/amounts are GraphQL `BigInt` on-chain but serialize as decimal strings → consume into polars as `pl.Utf8` (the DTYPE SCOPE RULE). NO per-member `responses` entity (decision 1).
**When:** always for M1.
```graphql
type Request @entity {
  id: ID!                       # requestId (uint256 decimal string)
  agentId: BigInt!
  perAgentBudget: BigInt!       # wei (<=38 digits — Decimal-safe downstream, but Utf8 in panel)
  subcommittee: [Bytes!]!
  blockNumber: BigInt!          # arrival-ordering PK part 1
  logIndex: BigInt!             # arrival-ordering PK part 2
  txHash: Bytes!
  blockTimestamp: BigInt!       # COARSE SECONDARY (whole-second source) — never sort-primary
  status: Int                   # ResponseStatus uint8, set on RequestFinalized
  finalizedBlock: BigInt
  finalizedLogIndex: BigInt
  sumExecutionCost: BigInt      # Σ_i executionCost — Arch A fills here; Arch B fills off-panel
}
type CommitteeEvent @entity {   # CommitteeDepositFailed — structural invariant (Phase-2 note 2), NOT an error
  id: ID!                       # txHash-logIndex
  requestId: BigInt!
  attemptedAmount: BigInt!
  blockNumber: BigInt!
  logIndex: BigInt!
}
```
> Entity-count model (decision 2 input): ~165k `Request` + ~165k `CommitteeEvent` ≈ 330k **if both are first-class entities** — that already brushes the 300k cap. **Plan-phase must model this carefully:** options are (i) fold `CommitteeDepositFailed` into a field/flag on the `Request` it shares a tx with (it fires 1:1 per finalization per Phase-2 note 2), collapsing to ~165k entities; or (ii) keep both and accept the projected-overage tripwire likely fires → $75/mo sign-off. **Recommend (i)** — a `committeeDepositFailedAmount: BigInt` field on `Request` keeps the entity total ≈ 165k, comfortably under 300k, and matches the 1:1 structural invariant. This is the concrete lever behind decision 2's "provisionally under 300k."

### Pattern 3: The executionCost decode fork (LOAD-BEARING — INDEX-01's central design choice)
`getRequest(uint256) → Request memory` returns the full struct incl. `Response[] responses`, each `Response.executionCost` (self-reported, capped at `perAgentBudget`). The aggregate is `Σ_i responses[i].executionCost`.

**Architecture A — in-subgraph `try_getRequest` from the RequestFinalized handler:**
```typescript
// src/mapping.ts (Arch A)
import { IAgentRequester } from "../generated/IAgentRequester/IAgentRequester"
export function handleRequestFinalized(event: RequestFinalizedEvent): void {
  let req = Request.load(event.params.requestId.toString())
  if (req == null) return
  let c = IAgentRequester.bind(event.address)
  let res = c.try_getRequest(event.params.requestId)   // CallResult<Request struct tuple>
  if (!res.reverted) {
    let responses = res.value.responses                // generated tuple-array accessor
    let sum = BigInt.zero()
    for (let i = 0; i < responses.length; i++) { sum = sum.plus(responses[i].executionCost) }
    req.sumExecutionCost = sum
  }
  req.status = event.params.status
  req.save()
}
```
- **Feasible:** `Contract.bind(address)` + `try_getRequest` is the standard generated pattern; `try_` exposes `.reverted` / `.value` so a revert never aborts indexing.
- **Optional declared call (spec ≥ 1.2.0):** `getRequest(event.params.requestId)` references only `event.params.<name>` and `event.address` — within the declared-calls constraint — so it MAY be manifest-declared for parallel + in-memory-cached execution. (Struct/tuple return decoding via declared calls is **undocumented**; treat as MEDIUM-confidence and fall back to the handler-side `try_` call if codegen for the nested `Response[]` tuple is not produced.)
- **Costs:** ~165k indexing-time `eth_calls` against the host's node; slows backfill and stresses the 1 req/s free-tier throttle; the nested-struct decode lives in AssemblyScript (harder to unit-test than Python; matchstick mocking of struct returns is fiddly).

**Architecture B — off-chain batched `getRequest` post-pass (RECOMMENDED PRIMARY):**
- After the subgraph backfills `Request` rows (with `requestId` + `finalizedBlock`), enumerate finalized `requestId`s and issue batched `eth_call getRequest(requestId)` via `probes/somnia_rpc.py` (add a `get_request(request_id, block)` helper + ABI-encode selector `0xc58343ef`).
- Decode the returned `Request` tuple in Python (`eth_abi`), sum `responses[].executionCost`, write `sum_execution_cost` keyed by `request_id` (uint256→`pl.Utf8`; the per-member detail is summed and discarded — no child rows).
- This `sum_execution_cost` lands in Phase 5 PANEL-01 as a request-row field (the K_AI extension), exactly as BYTECODE-01 Tier-C / PANEL-01 consume it.
- **Why recommended:** (1) keeps the nested-struct decode + uint256 discipline in already-tested Python where `pl.Utf8`/`Decimal(38,0)` rules are enforced; (2) zero indexing-time eth_calls → faster, throttle-safe backfill, leaner entity model (helps the 300k cap); (3) independently re-runnable and **CI-fixturable** (a recorded `getRequest` JSON response → decode → expected sum, no live network); (4) decouples the executionCost fill from indexing correctness — a state-fill bug never corrupts the arrival series.
- **Cost:** a second pass + state reads at finalized blocks (full archive supports historical `eth_call` at the finalized block — REQUIRED, since `responses` is mutable state and must be read at/after finalization). Pin the block tag to `finalizedBlock` (or head if state is terminal post-finalization).

> **DECISION FOR THE PLANNER:** default to **B**. Only choose A if the planner wants `sumExecutionCost` materialized inside the subgraph at index time AND accepts the throttle/entity-model cost. Both satisfy decision 1 (aggregate-only, no child table).

### Pattern 4: `safe_block_depth` cursor guard
**What:** the indexer's promotable head = `head − safe_block_depth`. With the KPD-09-docs PBFT verdict + KPD-09-empirical observation, `safe_block_depth = max(1, observed_max + margin)`.
**When:** the contiguity proof + PANEL-01 promotion guard consume it.

### Anti-Patterns to Avoid
- **`address: null` data source (B3):** indexing every contract's logs, then filtering — wastes the backfill and admits foreign logs. Pin the proxy.
- **Timestamp-primary arrival ordering:** `block.timestamp` is whole-second (live-confirmed `1780085231/1780085231/1780085232`); at ~100.7 ms/block up to ~10 blocks share a second. Sort on `(block_number, log_index)` ONLY; `blockTimestamp` is coarse secondary.
- **uint256 in `BigInt`-then-`Int64`:** GraphQL `BigInt` serializes as a decimal string; loading it into `pl.Int64`/`pl.Decimal(38,0)` silently overflows (uint256 = up to 78 digits). `pl.Utf8` only for ids.
- **Treating `CommitteeDepositFailed` as an error:** it is a structural invariant firing 1:1 per finalization (Phase-2 note 2); never filter/quarantine it.
- **Indexing-time eth_calls at scale without declaration:** ~165k sequential undeclared `getRequest` calls will throttle the free tier — another reason to prefer Arch B.

## Don't Hand-Roll

| Problem | Don't build | Use instead | Why |
|---------|-------------|-------------|-----|
| EVM event indexing + reorg handling + sync | A bespoke `eth_getLogs` loop as the *product* | Ormi 0xGraph managed subgraph (KPD-08) | Handles reorg management, sync, GraphQL surface; the bespoke loop is reserved as the parity *reference* + fallback only |
| Block-cursor / head tracking | A custom cursor table | subgraph `_meta { block { number hash timestamp } hasIndexingErrors }` | Canonical indexed-head read; powers liveness (B2) + contiguity (SC#6c) |
| Transaction-coverage oracle | A full topic0 sweep over 36M blocks | Blockscout `/addresses/{addr}/counters → transactions_count` (`probes/blockscout.py`) | Capped `eth_getLogs` × sparsity makes a full sweep infeasible; Blockscout is the only cheap EXACT independent count |
| Per-block parity reference | Re-deriving logs from receipts by hand | `eth_getBlockReceipts` (AVAILABLE) via `probes/somnia_rpc.get_block_receipts` | Returns the full receipt+log set per block in one call; the SC#2 mechanism |
| uint256 / wei handling | Int64 / float math | `pl.Utf8` ids, `pl.Decimal(38,0)` for bounded wei (≤38 digits), Python `int` for the executionCost sum | Decimal128 overflows uint256; established repo rule |
| Struct `eth_call` ABI decode | Hand-rolled byte slicing | `eth_abi` (off-chain, Arch B) or graph-cli-generated `try_getRequest` tuple (Arch A) | The `Request` struct has nested `Response[]`; hand-decoding the dynamic-array offsets is error-prone |

**Key insight:** The subgraph is the *product* indexer; direct-RPC (`probes/somnia_rpc.py`) is the *independent reference*. The whole completeness/parity argument rests on these being two different code paths — never collapse them.

## Common Pitfalls

### Pitfall 1: Ormi-mainnet network slug + deploy endpoint unverified
**What goes wrong:** Somnia docs document `graph init --network somnia-testnet` and the testnet deploy node `https://api.subgraph.somnia.network/deploy`; the **mainnet slug** (`somnia` vs `somnia-mainnet`) and whether mainnet deploy is fully enabled on the free tier are NOT confirmed in vendor docs (one capability-matrix row even noted "0xGraph network-list showed only somnia-testnet — VERIFY at deploy").
**Why:** vendor docs lead with testnet; mainnet chain 5031 support is asserted ("70+ chains", `subgraph.somnia.network` is the mainnet dashboard) but the exact manifest slug is not pinned in docs.
**How to avoid:** make "resolve the mainnet network slug + deploy endpoint" the FIRST live step of the deploy plan (a deploy-probe, consistent with the provisional DATA-SOURCE-01 verdict and the Ormi retention/mainnet `provisional` matrix rows). If mainnet deploy is unavailable on free tier → forced-paid-crossing decision (decision 2 protocol) or GetBlock sub-plan re-author.
**Warning signs:** `graph init` rejects the network; `graph deploy` 404s the node URL; the dashboard lists only testnet.

### Pitfall 2: Free-tier entity-count read surface is not doc-pinned
**What goes wrong:** decision 2's projected-overage check needs a programmatic entity count after the first backfill chunk, but Ormi's docs describe "status in the Subgraphs tab" / a "Status API" without a documented entity-count field.
**How to avoid:** plan-phase resolves the entity-count read mechanism at deploy time (dashboard Status tab, Status API endpoint, or `_meta`/indexing-status GraphQL). Fallback projection: **count entities from the subgraph's own GraphQL** (`Request` totalCount via pagination or an aggregate query) over the first-chunk block range and extrapolate linearly to the full 36.3M-block span vs 300k. This is robust even if no vendor entity counter exists.
**Warning signs:** no entity metric in the dashboard; Status API returns only sync %.

### Pitfall 3: `getRequest` read at the wrong block (state-fill correctness)
**What goes wrong:** `Request.responses` is mutable; reading `getRequest` at the wrong block returns pre-finalization (empty/partial) `executionCost`s → undercounts the sum.
**How to avoid:** read at the `RequestFinalized` block (or any block ≥ finalization where the struct is terminal). Arch A's handler runs AT the finalized block (correct by construction); Arch B must pass the finalized block tag. Full-archive RPC supports historical `eth_call`.
**Warning signs:** `sumExecutionCost == 0` for finalized requests; sums below `Σ min(executionCost, perAgentBudget)` floor.

### Pitfall 4: `eth_getBlockReceipts` run-time degradation
**What goes wrong:** the matrix recorded `AVAILABLE`, but a host change / re-probe could return method-not-found mid-run; the parity reference silently weakens.
**How to avoid:** `probes/somnia_rpc.get_block_receipts` already returns `None` on method-not-found. On `None`, record the fallback to capped `eth_getLogs` and that completeness assurance weakens to the contiguity proof (SC#2 documents this), flag it as a retroactive input to the free-vs-paid verdict.
**Warning signs:** `get_block_receipts` returns `None`; parity report notes the degradation.

### Pitfall 5: Silent free-tier auto-upgrade to paid
**What goes wrong:** Ormi auto-upgrades to Production ($75/mo) at 300k entities — a backfill could silently cross into spend mid-run, breaching no-auto-spend.
**How to avoid:** disable free-tier auto-upgrade at signup (decision 2 + Phase-2 note 3); the projected-overage tripwire fires BEFORE the cap, surfacing entity evidence for explicit sign-off.
**Warning signs:** an unexpected billing email; entity count nearing 300k without a pause.

### Pitfall 6: Cross-epoch structural-ratio drift mistaken for a completeness anomaly
**What goes wrong:** the 1:1:1 / 2.15×/0.7× ratios come from ONE recent 80k-block window (n=116 txs); applying that band naively across the full 36.3M-block range could false-positive on natural drift.
**How to avoid:** leg (b) is a NON-BLOCKING anomaly flag (decision 4); the tolerance band is plan-phase-derived from the Wilson 95% CI `[0.628, 0.790]` (basis `wilson_95ci_n116`), re-measured per stratum (deploy/mid/head). Halt only on GROSS deviation (> 2× band, multiplier is a plan-phase deliverable). Evaluate ratios against the indexer's OWN distinct-tx count, never the external 234,999 (else leg b collapses into leg a — circular).
**Warning signs:** ratio drift within band treated as failure; leg (b) computed against the external anchor.

## Code Examples

### Read the indexed head + indexing health (liveness B2 + contiguity SC#6c)
```graphql
# Against the Ormi GraphQL endpoint (Authorization: <ORMI_API_KEY>)
{ _meta { block { number hash timestamp } deployment hasIndexingErrors } }
```
```python
# liveness gap (probes/somnia_rpc.py supplies eth_blockNumber)
indexer_head = graphql_meta_block_number()          # _meta.block.number
rpc_head     = somnia_rpc.head_block()              # eth_blockNumber
gap = rpc_head - indexer_head                        # escalate if >60 for 3 consecutive 5-min polls
```

### Per-block-receipt parity (SC#2 — stratified ≥300 windows)
```python
# Source: probes/somnia_rpc.py (eth_getBlockReceipts AVAILABLE 2026-05-29T20:07Z)
receipts = somnia_rpc.get_block_receipts(blk)        # None => degrade to capped eth_getLogs
if receipts is None:
    logs = somnia_rpc.get_logs(PROXY, blk, blk)      # fallback; weakens completeness to contiguity
else:
    proxy_logs = [l for r in receipts for l in r["logs"] if l["address"].lower() == PROXY.lower()]
# tuple-for-tuple compare (block_number, log_index) vs indexer rows on each sampled window
```

### Off-chain `getRequest` state-fill (Arch B)
```python
# Add to probes/somnia_rpc.py: getRequest(uint256) selector 0xc58343ef, read at finalized block.
# data = 0xc58343ef + abi_encode(["uint256"], [request_id])
raw = somnia_rpc._rpc("eth_call",
        [{"to": PROXY, "data": "0xc58343ef" + f"{request_id:064x}"}, hex(finalized_block)])
req = eth_abi.decode([REQUEST_TUPLE_TYPE], bytes.fromhex(raw[2:]))   # nested Response[] tuple
sum_execution_cost = sum(r[5] for r in req[0][5])   # responses[].executionCost (index 5 in Response)
# write as pl.Utf8 (decimal string); per-member detail summed + discarded (decision 1)
```
> `REQUEST_TUPLE_TYPE` is built from `references/interfaces/IAgentRequester.sol` `struct Request` (15 fields; `responses` is field index 5, a `Response[]`; `Response.executionCost` is field index 5). Encode `Response` as `(address,bytes,uint8,uint256,uint256,uint256)`.

### Transaction-coverage anchor (SC#6 leg a — re-queried live at head)
```python
# Source: probes/blockscout.py
fresh = blockscout.tx_count(PROXY)        # MUST be >= 234999 (monotonicity floor)
indexer_distinct_tx = count_distinct(indexer_rows.tx_hash)  # reconcile within tolerance
```

## State of the Art

| Old approach | Current approach | When changed | Impact |
|--------------|------------------|--------------|--------|
| Hosted Service (thegraph.com hosted) | Managed providers (Ormi 0xGraph, etc.) + decentralized network | 2023–2024 (Hosted Service sunset) | Ormi is the chosen managed host; same graph-cli toolchain |
| Sequential indexing-time `eth_calls` | Declared eth_calls (manifest `calls:`, parallel + cached) | graph-node specVersion **1.2.0** | Arch A may use it; restricted to event handlers + `event.address`/`event.params.*` |
| `apiVersion 0.0.7/0.0.8` mappings | `apiVersion 0.0.9` + `specVersion 1.2.0+` | graph-node ≥ 2024 | pin current spec/api versions; declared calls need ≥ 1.2.0 |

**Deprecated/outdated:**
- The Graph Hosted Service — gone; do not target it.
- The scout's `event_count_addendum.md` topic0 ROLE labels — superseded by `topic0_map_v1.json` (use resolver roles).
- "~320M-block / Ormi-mandatory" framing — superseded: 36.3M-block span, Ormi preferred-not-mandatory, public RPC is full archive.

## Open Questions

1. **Ormi Somnia-mainnet network slug + deploy endpoint + free-tier mainnet-deploy permission.**
   - Known: testnet slug `somnia-testnet`; mainnet dashboard `subgraph.somnia.network`; "70+ chains"; deploy node `https://api.subgraph.somnia.network/deploy`.
   - Unclear: exact mainnet slug (`somnia` vs `somnia-mainnet`); whether free tier deploys to mainnet.
   - Recommendation: first live deploy-probe step; on failure invoke decision 2 (sign-off) or GetBlock sub-plan re-author. (MEDIUM)

2. **Programmatic entity-count read for the projected-overage check (decision 2).**
   - Known: dashboard Subgraphs tab + Status API exist.
   - Unclear: a documented entity-count field.
   - Recommendation: count `Request` totalCount via the subgraph's own GraphQL over the first-chunk range and extrapolate; robust without a vendor counter. (MEDIUM)

3. **Declared-eth_call struct/tuple return support (Arch A only).**
   - Known: declared calls work for `event.params.*` args; in-memory cached.
   - Unclear: whether the codegen decodes a `getRequest` nested `Response[]` tuple for a declared call.
   - Recommendation: if Arch A is chosen, prefer the handler-side `try_getRequest` (documented) over a declared call for the struct return; or just use Arch B. (LOW for declared-struct; HIGH that handler-side `try_` works.)

## Validation Architecture

> nyquist_validation = true (`.planning/config.json`). This section is the source for the derived VALIDATION.md.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pytest (uv-managed Python ≥ 3.12; polars 1.41.2) — repo harness, 56 green |
| Config file | `pyproject.toml` (`testpaths = ["tests"]`), `tests/conftest.py` (6 fixtures: `scout_dir`/`schemas_dir`/`research_dir`/`load_yaml`/`load_json`/`read_text`) |
| Quick run command | `uv run pytest tests/test_index01_decode.py -x` (new module) |
| Full suite command | `uv run pytest tests/ -q` |
| Subgraph build check | `cd subgraphs/iagentrequester && graph codegen && graph build` (toolchain validity; LIVE-tolerant, not a CI fixture unless graph-cli is vendored) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test type | Automated command | CI-testable? |
|--------|----------|-----------|-------------------|--------------|
| INDEX-01 | `Σ executionCost` decode: a recorded `getRequest` JSON response decodes + sums `responses[].executionCost` correctly (selector `0xc58343ef`, Response field index 5) | unit (synthetic fixture) | `pytest tests/test_index01_decode.py::test_sum_execution_cost -x` | ✅ (recorded RPC fixture, no live net) |
| INDEX-01 | uint256 ids written as `pl.Utf8`, never Int64/Decimal(38,0) (round-trip) | unit | `pytest tests/test_index01_decode.py::test_uint256_utf8 -x` | ✅ |
| INDEX-01 | wei amounts (`perAgentBudget`, sum) fit `pl.Decimal(38,0)` (bounded ≤38 digits) | unit | `pytest tests/test_index01_decode.py::test_wei_decimal_ok -x` | ✅ |
| INDEX-01 | structural-ratio conformance logic: synthetic counts inside `[0.628,0.790]` PASS; gross (>2× band) HALTS; against indexer's own tx count not the external anchor | unit | `pytest tests/test_index01_completeness.py::test_structural_ratio_band -x` | ✅ |
| INDEX-01 | tx-anchor monotonicity floor: fresh `transactions_count` < 234999 FAILS, ≥ PASSES | unit | `pytest tests/test_index01_completeness.py::test_tx_anchor_floor -x` | ✅ (recorded/synthetic) |
| INDEX-01 | contiguity logic: `COUNT(DISTINCT block_number)` over `[deploy,head]` detects an injected skipped range | unit | `pytest tests/test_index01_completeness.py::test_contiguity_detects_gap -x` | ✅ (synthetic frame) |
| INDEX-01 | ordering: `(block_number, log_index)` tuple sequence matches a recorded RPC tuple sequence on a synthetic multi-log block; timestamp is coarse-secondary (not sort key) | unit | `pytest tests/test_index01_ordering.py::test_tuple_ordering -x` | ✅ (synthetic) |
| INDEX-01 | parity-degradation: `get_block_receipts` returning None falls back to `eth_getLogs` + flags weakened assurance | unit | `pytest tests/test_index01_parity.py::test_receipts_none_degrades -x` | ✅ (mock) |
| INDEX-01 | B3 invariant: every row's `log_address == proxy` (reject foreign-address row) | unit | `pytest tests/test_index01_completeness.py::test_proxy_address_invariant -x` | ✅ (synthetic) |
| INDEX-01 | liveness gap math: gap>60 for 3 consecutive escalates; ≤60 does not | unit | `pytest tests/test_index01_liveness.py::test_gap_escalation -x` | ✅ (pure logic) |
| INDEX-01 | safe_block_depth rule: observed_max=0 → depth=1; observed>0 → max(1,observed+margin) | unit | `pytest tests/test_index01_liveness.py::test_safe_block_depth_rule -x` | ✅ (pure logic) |
| INDEX-01 | recorded-constant assertions: deploy block 283417317, selector 0xc58343ef, getLogs cap 1000, getBlockReceipts AVAILABLE present in scout/matrix | unit | `pytest tests/test_index01_constants.py -x` | ✅ (fixture reads) |
| INDEX-01 | **Subgraph deploys to Somnia mainnet + backfills 283417317→head** | live deploy | manual: `graph deploy …` then `_meta` query | ❌ LIVE-ONLY (deploy/backfill) |
| INDEX-01 | **Full backfill completeness gate (3-leg) against the REAL indexed store** | live | `__main__` probe over the real subgraph + RPC + Blockscout | ❌ LIVE-ONLY |
| INDEX-01 | **Real liveness window (head-lag <60, ≥99% of polls, few hours)** | live observation | `__main__` poll loop → `indexing/parity_report.md` | ❌ LIVE-ONLY |
| INDEX-01 | **`safe_block_depth` rollback observation (≥1h)** | live observation | `__main__` head-watch → `.planning/scout/2026-05-29/rollback_observation.md` | ❌ LIVE-ONLY |
| INDEX-01 | **Projected-overage entity-count check after first chunk** | live | `__main__` GraphQL totalCount + extrapolation; pause+surface if >300k | ❌ LIVE-ONLY |

### Sampling Rate
- **Per task commit:** `uv run pytest tests/test_index01_*.py -x` (the new decode/ratio/contiguity/ordering/liveness logic).
- **Per wave merge:** `uv run pytest tests/ -q` (full 56+ suite green).
- **Phase gate:** full suite green + the four LIVE-ONLY artifacts produced and committed (`indexing/completeness_proof.md`, `indexing/ordering_verification.md`, `indexing/parity_report.md`, `.planning/scout/2026-05-29/rollback_observation.md`) before `/gsd:verify-work`.

### CI-testable vs LIVE-only boundary (the repo convention)
- **CI-testable (synthetic fixtures + recorded constants, NO live network):** the `getRequest` struct decode + sum; uint256/wei dtype discipline; structural-ratio band + gross-deviation halt; tx-anchor monotonicity floor; contiguity gap detection; `(block_number, log_index)` ordering vs a recorded tuple sequence; parity-degradation fallback; B3 proxy-address invariant; liveness gap + safe_block_depth rules; recorded-constant assertions.
- **LIVE-only (cannot be CI fixtures — inherently deploy/backfill/observe):** the actual subgraph deploy + 36.3M-block backfill; the three-leg gate run against the REAL indexed store; the multi-hour liveness window; the ≥1h rollback observation; the projected-overage entity count. These run as `__main__`-only probes (per the established `probes/*.py` convention) and emit the `indexing/*.md` + `rollback_observation.md` artifacts; CI asserts the *logic* that processes their outputs against synthetic fixtures, plus the recorded constants the probes confirmed.

### Wave 0 Gaps
- [ ] `tests/test_index01_decode.py` — `getRequest` tuple decode + Σ executionCost (recorded RPC fixture) + uint256/wei dtype.
- [ ] `tests/test_index01_completeness.py` — structural-ratio band, tx-anchor floor, contiguity gap detection, B3 proxy-address invariant.
- [ ] `tests/test_index01_ordering.py` — `(block_number, log_index)` tuple ordering + coarse-secondary timestamp.
- [ ] `tests/test_index01_parity.py` — receipts-None degradation fallback.
- [ ] `tests/test_index01_liveness.py` — gap escalation + safe_block_depth rule.
- [ ] `tests/test_index01_constants.py` — recorded-constant assertions (deploy block, selector, caps).
- [ ] `tests/fixtures/getrequest_response.json` — one recorded `getRequest` raw return for the decode fixture (captured via `__main__` probe at deploy time, then frozen).
- [ ] `probes/somnia_rpc.py` — add `get_request(request_id, block)` helper (selector `0xc58343ef`, `__main__`-only live call).
- [ ] graph-cli/graph-ts not yet vendored — `graph codegen && graph build` is a LIVE/toolchain step, not a CI fixture (document as such).

*(No existing test module covers INDEX-01; all of the above are new Wave 0 work.)*

## Sources

### Primary (HIGH confidence)
- `references/interfaces/IAgentRequester.sol` (repo) — `getRequest(uint256) → Request memory`, `struct Request` (15 fields, `responses` = `Response[]` at index 5), `struct Response` (`executionCost` at index 5), the 5 events, `RequestFinalized(uint256 indexed requestId, ResponseStatus status)`.
- `schemas/topic0_map_v1.json` (repo) — resolved topic0 roles + signatures (selector/field-layout); `0xb623…`=RequestCreated, `0x65db…`=RequestFinalized(uint256,uint8), `0x5c09…`=CommitteeDepositFailed.
- `schemas/event_schema_v1.md` (repo) — arrival key `(block_number, log_index)`, whole-second `block_ts_utc` coarse secondary, uint256→`pl.Utf8` / `Decimal(38,0)`-bounded-wei DTYPE SCOPE RULE, responses-child reservation.
- `research/data_sourcing_matrix.yaml` + `research/DATA_SOURCING.md` (repo) — Ormi free Developer pick, `eth_getBlockReceipts` AVAILABLE, `eth_getLogs` cap 1000, full archive at 283417317, 300k entity cap + auto-upgrade, leg-(b) Wilson band `[0.628,0.790]`.
- `.planning/scout/2026-05-29/*` (repo) — deploy block 283417317, ~100.7 ms cadence, whole-second timestamp, getBlockReceipts AVAILABLE, structural ratios (2.15×/1:1:1/0.7×, 234,999 tx anchor), PBFT finality → safe_block_depth=1 provisional.
- `probes/somnia_rpc.py` / `probes/blockscout.py` / `tests/conftest.py` (repo) — reusable RPC/Blockscout helpers + fixture contract (`__main__`-only network).
- The Graph — AssemblyScript API (`thegraph.com/docs/.../graph-ts/api/`): `Contract.bind(address)`, `try_*` → `CallResult{.reverted,.value}`.
- The Graph — declared eth_calls best practice (`thegraph.com/docs/en/subgraphs/best-practices/avoid-eth-calls/`) + graph-node manifest doc: `calls:` syntax, specVersion ≥ 1.2.0, event-handler-only, `event.address`/`event.params.*`, parallel + in-memory cached.
- The Graph — GraphQL `_meta` field (`thegraph.com/docs/en/subgraphs/querying/graphql-api/`): `block{number,hash,timestamp}`, `deployment`, `hasIndexingErrors`.

### Secondary (MEDIUM confidence)
- Ormi USDC deploy walkthrough (`blog.ormilabs.com/how-to-deploy-a-usdc-subgraph-with-ormi-0xgraph/`) — `npm install -g @graphprotocol/graph-cli`; `graph init`/`codegen`/`build`/`deploy --node …/deploy --ipfs …/ipfs --deploy-key <API key>`; "completely free."
- Somnia docs — Ormi subgraph (`docs.somnia.network/.../ormi-subgraph`) — testnet slug `somnia-testnet`; deploy node `https://api.subgraph.somnia.network/deploy` + ipfs; mainnet dashboard `subgraph.somnia.network`.
- Ormi 0xGraph features (`ormilabs.com/docs/subgraphs/features`) — "70+ chains", monitoring/observability, Status API.

### Tertiary (LOW confidence — needs deploy-time verification)
- Exact Somnia-**mainnet** network slug (`somnia` vs `somnia-mainnet`) and free-tier mainnet-deploy permission — vendor docs lead with testnet (Open Q1).
- Programmatic entity-count field on the free tier (Open Q2).
- Declared-eth_call decoding of a nested struct/tuple return (Open Q3).

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — graph-cli + Ormi/Somnia deploy surface confirmed against vendor + Somnia docs; mainnet slug MEDIUM (deploy-probe).
- Architecture (manifest/schema/handlers/decode fork): HIGH — `try_getRequest` + declared-calls + `_meta` confirmed against The Graph docs; struct decode confirmed against the repo interface.
- Completeness/parity/ordering mechanics: HIGH — all three legs map to confirmed repo capabilities (`eth_getBlockReceipts`, Blockscout counter, `_meta` cursor) and the scout structural ratios.
- Pitfalls: HIGH — drawn from repo PITFALLS (B2/B3), Phase-1/2 corrections, and confirmed throttle/entity-cap facts; Ormi-mainnet/entity-count pitfalls are MEDIUM (the two known doc gaps).
- Validation architecture: HIGH — the CI-vs-live boundary follows the established `probes/*.py __main__`-only convention and the existing pytest fixture harness.

**Research date:** 2026-05-30
**Valid until:** ~2026-06-13 (14 days — Ormi/Somnia subgraph surface is fast-moving + the mainnet-deploy facts are deploy-probe-pending; the gas-pricing "stop-gap" volatility caveat applies). Re-verify the deploy slug/endpoint + graph-cli versions at plan/deploy time.
