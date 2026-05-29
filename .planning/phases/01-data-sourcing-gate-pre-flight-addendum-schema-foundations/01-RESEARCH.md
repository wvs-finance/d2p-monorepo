# Phase 1: Data-Sourcing Gate, Pre-flight Addendum & Schema Foundations - Research

**Researched:** 2026-05-29 (UTC fetches 2026-05-29T20:06Z–20:12Z)
**Domain:** Somnia L1 (chain 5031) event-data sourcing; EVM proxy/event probing; subgraph vs RPC vs archive sourcing economics; polars/parquet + JSON-schema artifact conventions; off-chain FX OHLCV semantics
**Confidence:** HIGH on live-chain probes (all re-run against `api.infra.mainnet.somnia.network` this session) and Ormi/CoinGecko/GetBlock pricing (vendor docs with URL+ts); MEDIUM on Somnia finality wording (docs assert "sub-second finality" but never explicitly state irreversibility); MEDIUM on the on-chain-vs-interface event mismatch (interface read from `main`, on-chain shapes probed live — they do NOT line up and TOPIC-01 must resolve by keccak, not by assuming the interface).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Cost ceiling: ≤ $390/mo** — adopt x402's Dune-Plus demand-window upper bound as the reference ceiling for any paid RPC / archive / subgraph.
- **Spend requires explicit user sign-off.** DATA-SOURCE-01 research *recommends* the cheapest sufficient paid option but does NOT commit spend — the user approves before any paid resource is provisioned (evidence-before-spend discipline). Anything that would exceed $390/mo forces a documented re-scope / null-result conversation, not silent spend.
- **Price ALL classes and recommend the cheapest-sufficient one** that clears the four sufficiency bars: (a) managed subgraph tier (paid Ormi / Protofire), (b) paid RPC / dedicated archive (Alchemy / QuickNode-style, *if* they support Somnia chain 5031), (c) self-hosted archive node. Note the trade-off per class: managed subgraph preserves the INDEX-01 mapping surface (no sub-plan re-author); a paid RPC/archive is a different INDEX-01 codebase (RPC-scan). Cheapest-sufficient wins, but re-author cost is in each option's total cost-of-ownership.
- **Frame paid (if needed) as a JUSTIFIED DEPARTURE, recorded explicitly.** Rationale: SOMI on-chain data is *real-or-nothing* — unlike x402's data-cost leg which is *modeled, not paid*. The `DATA_SOURCING.md` record must state this reconciliation, not just cite the two summary docs.
- **Provisional free-tier selection, confirmed in Phase 3.** Accept the provisional free-tier pick pre-INDEX; the pre-costed paid fallback + the Phase-3 binding three-leg completeness gate de-risk a wrong call. Prefer speed-to-INDEX-01 over deeper pre-INDEX de-risking. Caveat: a *cheap* capability probe surfacing an outright red flag (esp. Ormi deep-history retention at the deployment block) escalates to the paid-options recommendation immediately.

### Claude's Discretion
- The leg-(b) structural-ratio **tolerance band** derivation (sample-CI from n=116 vs fixed ±X%) — planner chooses the basis and states it.
- The exact probe-script implementation (harden the scout's `/tmp/scout_rpc.py`-style tooling into committed reusable probes).
- Schema-artifact internal formatting beyond the locked column/ordering contracts.
- Which specific paid vendors to query for pricing (classes decided; vendors are research detail).

### Deferred Ideas (OUT OF SCOPE)
None new this discussion. The milestone arc beyond M1 (M2 arrival-process estimation + convex-demand verdict; M3+ composite hedge) is in PROJECT.md Out-of-Scope. The three plan-phase-deferred technical items (leg-b tolerance, RequestCreated-event definition, cross-epoch drift) are DATA-SOURCE-01/Phase-3 deliverables within M1, not separate phases.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DATA-SOURCE-01 | Free-tier-first data-sourcing sufficiency research gating INDEX-01; four numeric bars; capability matrix + provisional free-vs-paid verdict | §"Data-Sourcing Capability Matrix" (live-probed rows + vendor pricing for all 3 paid classes), §"The Backfill-Span Correction" (load-bearing: 36.3M not ~320M blocks), §"Deep-History Retention Findings", §"Coherence-Check Construction" |
| EVENT-01 | `IAgentRequester` event-schema DDL; arrival-timing fields first-class; `(block_number, log_index)` ordering; `responses` child table; reserve `agent_class_keccak`+`agent_class_string` | §"Schema Artifacts" (polars/parquet dtype table + nullability), §"Whole-Second Timestamp Confirmed", §"On-Chain Event Shapes vs Interface" (which event IS RequestCreated) |
| SHARED-SCHEMA-01 | Intersection + K_AI-extension schemas, `.md` AND machine-loadable `.json` | §"Schema Artifacts" (JSON-Schema pattern + intersection/extension split + breakage budget) |

Pre-flight addendum decisions discharged here: KPD-16 (scout archive), KPD-17 (beacon/diamond probe — **resolved happy-path live**), KPD-18 (indexed-dynamic field — **reframed**: no indexed string; `agentId` is `uint256`), KPD-19 (CoinGecko convention — **resolved: candle-CLOSE**), KPD-09-docs (finality — **MEDIUM, documented**), KPD-03 (EVENT-01 DDL), KPD-11a (batch manifest schema).
</phase_requirements>

## Summary

Every load-bearing unknown this phase was chartered to probe has been resolved against a primary source this session, and three of them **overturn assumptions baked into the ROADMAP/REQUIREMENTS** — which is exactly what the planning-review gate exists to catch before execution.

1. **The backfill is ~9× smaller than the planning docs assume.** The proxy `0x5E52…163E6` was deployed at block **283,417,317 on 2026-04-17 (~42 days ago)**, not "~270 days / ~320M blocks." The deployment-to-head span is **36.3M blocks ≈ 36,287 `eth_getLogs` windows**, and the **public RPC is a full archive node** that serves both `eth_getLogs` and `eth_getStorageAt` correctly *at* the deployment block. The "direct-RPC backfill is infeasible (~320K calls)" premise that made Ormi "mandatory" is wrong by an order of magnitude — direct-RPC backfill is ~36K capped calls, a few hours of sequential probing. This does not remove Ormi as the recommended primary (it preserves the subgraph mapping surface + parity mechanism), but it makes a paid-RPC archive a genuinely viable fallback and removes the "retention truncation at ~320M blocks back" worry entirely.

2. **The free tier is sufficient and within budget; paid options across all three classes are all under the $390/mo ceiling.** Ormi's free Developer plan ($0, 300k entities, 1 subgraph, 1 req/s, **deployment allowed with a credit-card on file**) is the recommended provisional pick. The ~165k `RequestCreated` envelope must be checked against the 300k-entity cap (see Open Questions — the `responses` child rows likely push total entities past 300k, which would auto-upgrade to Production $75/mo). Paid fallbacks: Ormi Production **$75/mo** (subgraph-compatible, zero re-author), GetBlock Somnia-mainnet archive RPC **Starter $39/mo** (non-subgraph → INDEX-01 sub-plan re-author). Alchemy/QuickNode do **not** publicly confirm chain-5031 support.

3. **The on-chain event shapes do NOT match the `main`-branch interface, and the scout's topic0 role labels are likely inverted.** TOPIC-01 cannot assume the interface; it must keccak-resolve. The 3-topic + large-dynamic-payload on-chain event `0xb623…` matches `RequestCreated`'s shape (2 indexed + `bytes`/`address[]`), while the 2-topic/32-byte `0x5c09`+`0x65db` "request pair" matches the 2-topic 32-byte event family (RequestFinalized / SubcommitteePaid / …). This directly resolves the review-deferred "which IS RequestCreated" question and reframes KPD-18 (there is **no indexed string `agentClass`** in the interface — `agentId` is an indexed `uint256`).

Confirmed-as-expected: chain id 5031 (`0x13a7`), `eth_getLogs` 1000-block cap, **`eth_getBlockReceipts` AVAILABLE** (Phase-3 parity can use per-block-receipt scan), **whole-second `block.timestamp`** (so `(block_number, log_index)` is the arrival key, as HIGH-1 mandated), **beacon slot + diamond storage both empty** (KPD-17 happy path — plain EIP-1967, IMPL-01 tracks only the proxy slot), baseFee = 6 gwei (GAS-01 floor non-binding in current window), CoinGecko OHLC timestamp = candle-CLOSE.

**Primary recommendation:** Provisionally select **Ormi free Developer tier** for INDEX-01, pre-cost **Ormi Production ($75/mo)** as the subgraph-compatible paid fallback (forced if the 300k-entity cap is exceeded) and **GetBlock Starter ($39/mo archive RPC)** as the non-subgraph fallback (cheaper but triggers an INDEX-01 RPC-scan sub-plan re-author). Correct the backfill-span figure to 36.3M blocks / deployment block 283,417,317 everywhere it appears, and instruct TOPIC-01 to keccak-resolve the three live topic0s rather than trusting the interface.

## Standard Stack

The analysis/tooling stack is locked by the project (match `abrigo-analytics`): **uv-managed Python 3.12, polars ≥ 1.20, parquet (zstd), Hive partitioning**. This phase writes no indexer code — it commits schema artifacts and the capability matrix. The relevant "stack" here is the data-source toolchain and the schema-artifact formats.

### Core (data-source candidates)
| Component | Version / Tier | Purpose | Why Standard |
|-----------|----------------|---------|--------------|
| Public Somnia RPC | `somnia-16638fbbd16be8b-release` (live) | `eth_getLogs`/`eth_getBlockReceipts`/`eth_getStorageAt` — probe + cross-validation + archive backfill fallback | Canonical free endpoint; confirmed full-archive this session |
| Ormi 0xGraph subgraph (free Developer) | post-2026-04-01 model | INDEX-01 primary host; AssemblyScript mappings, GraphQL query | Somnia-docs-canonical indexer; Somnia mainnet env referenced in Ormi docs |
| Blockscout v2 REST | `explorer.somnia.network/api/v2` | The only source of the exact `transactions_count` anchor (234,999) | Sole cheap EXACT independent tx oracle (rate-limits hard) |
| CoinGecko API (free Demo) | current | FX-01 SOMI/USD series (`somnia` id, ~$0.151 live) | SOMI listed, 1yr hourly history via `market_chart/range` on free tier |

### Supporting (paid fallbacks to pre-cost, all < $390/mo ceiling)
| Option | Price | Class | Re-author cost | When to Use |
|--------|-------|-------|----------------|-------------|
| Ormi Production | **$75/mo** | (a) managed subgraph | **Zero** — preserves mapping surface + parity | If free 300k-entity cap exceeded, or 1 req/s too slow |
| Ormi High Performance | $150/mo | (a) managed subgraph | Zero | Only if 5 req/s (Production) insufficient — unlikely for M1 |
| GetBlock Starter (Somnia mainnet, archive) | **$39/mo** | (b) paid RPC/archive | **INDEX-01 sub-plan re-author** (RPC-scan, not AssemblyScript) | Cheapest paid; only if subgraph path fails entirely |
| GetBlock Advanced / Pro | $159 / $399/mo | (b) paid RPC/archive | sub-plan re-author | $399 Pro is at/above the $390 ceiling → forces re-scope conversation |
| Self-hosted archive node | infra cost (VPS + storage); not vendor-metered | (c) self-hosted | sub-plan re-author + ops burden | Last resort; 42-day / 36M-block span makes this unnecessary |

### Alternatives Considered / Ruled Out
| Instead of | Could Use | Tradeoff / Verdict |
|------------|-----------|--------------------|
| Ormi | Protofire subgraph | Docs name both Ormi + Protofire; Protofire pricing not retrieved this session — pre-cost row left for plan-phase if Ormi is rejected. Same subgraph-compatible class (zero re-author). |
| GetBlock | Alchemy / QuickNode | **Neither publicly confirms chain 5031** (Alchemy has no somnia subdomain per scout; QuickNode marketplace lists no Somnia add-on). Do not assume support — flag "unavailable / unverified." GetBlock is the only confirmed paid-RPC archive for Somnia mainnet. |

**Installation (this phase commits configs, not code):** no `npm install` step. Plan-phase commits `research/data_sourcing_matrix.yaml`, `research/DATA_SOURCING.md`, the schema artifacts, and probe scripts under a probes dir.

**Version verification performed this session:** chain id `0x13a7`=5031 (live), client `somnia-16638fbbd16be8b-release` (live), Ormi pricing (vendor pricing page 2026-05-29), CoinGecko SOMI id `somnia` (vendor page 2026-05-29), GetBlock pricing (vendor page 2026-05-29).

## Data-Sourcing Capability Matrix (live-probed; the DATA-SOURCE-01 core)

Every row below was re-run this session against `https://api.infra.mainnet.somnia.network/` unless marked vendor-doc. This is the seed for `research/data_sourcing_matrix.yaml` (fixed schema `source, capability, value, threshold, pass, source_url, utc_fetch_ts`).

| source | capability | value (live/doc) | source_url | utc_fetch_ts |
|--------|-----------|------------------|------------|--------------|
| public-rpc | chain_id | `0x13a7` = 5031 | api.infra.mainnet.somnia.network | 2026-05-29T20:06Z |
| public-rpc | client_version | `somnia-16638fbbd16be8b-release` | ″ | 2026-05-29T20:06Z |
| public-rpc | head_block | 319,964,896 (rising; ~9.9 blk/s) | ″ | 2026-05-29T20:06Z |
| public-rpc | eth_getLogs cap | **1000 blocks** (`block range exceeds 1000` on 1001) | ″ | 2026-05-29T20:08Z |
| public-rpc | eth_getBlockReceipts | **AVAILABLE** (returns populated receipt list) | ″ | 2026-05-29T20:07Z |
| public-rpc | archive depth (deep-history) | **FULL ARCHIVE** — `eth_getLogs` AND `eth_getStorageAt` correct at deploy block 283,417,317 | ″ | 2026-05-29T20:09Z |
| public-rpc | median block cadence | **~100.7 ms/block** over full deploy→head span (refines scout ~72ms) | ″ | 2026-05-29T20:09Z |
| public-rpc | block.timestamp granularity | **whole_second** (consecutive blocks: 1780085231, 1780085231, 1780085232) | ″ | 2026-05-29T20:07Z |
| public-rpc | baseFeePerGas | 6 gwei = 6,000,000,000 wei (floor non-binding) | ″ | 2026-05-29T20:07Z |
| proxy `0x5E52…163E6` | deployment_block | **283,417,317** (creation tx `0x36596e…e8b0a`, 2026-04-17T13:18:10Z) | ″ | 2026-05-29T20:09Z |
| proxy | creator EOA | `0x320362C7…fdE88936` (matches PROJECT.md) | ″ + Blockscout | 2026-05-29T20:08Z |
| proxy | backfill_span | **36,286,846 blocks ≈ 36,287 getLogs windows** (NOT ~320M) | derived | 2026-05-29T20:09Z |
| proxy | IMPLEMENTATION_SLOT | `…9af59c5683…3edd` (confirms impl) | api.infra | 2026-05-29T20:07Z |
| proxy | ADMIN_SLOT | `0x` empty (UUPS-style, not transparent admin) | ″ | 2026-05-29T20:08Z |
| proxy | BEACON_SLOT | `0x` empty | ″ | 2026-05-29T20:08Z |
| impl `0x9AF5…3EdD` | BEACON_SLOT | **`0x` empty** (KPD-17: not a beacon proxy) | ″ | 2026-05-29T20:06Z |
| impl | IMPLEMENTATION_SLOT | **`0x` empty** (impl is not itself a proxy) | ″ | 2026-05-29T20:06Z |
| impl | EIP-2535 diamond storage | **`0x` empty** (KPD-17: not a diamond) | ″ | 2026-05-29T20:08Z |
| impl | code size | 18,507 bytes (matches scout) | ″ | 2026-05-29T20:06Z |
| Blockscout | transactions_count anchor | 234,999 (reference snapshot; re-query live at indexed head per Phase-3) | explorer.somnia.network/api/v2 | scout 2026-05-25 |
| ormi-free | plan / cost | Developer **$0** | ormilabs.com/docs/billing-and-pricing/pricing | 2026-05-29T20:11Z |
| ormi-free | entity cap | **300,000** entities; auto-upgrades to Production at 300k | ″ | 2026-05-29T20:11Z |
| ormi-free | subgraphs | 1 | ″ | 2026-05-29T20:11Z |
| ormi-free | sustained rps | 1 req/s (requests unlimited) | ″ | 2026-05-29T20:11Z |
| ormi-free | deployment permission | **DEPLOY allowed** (credit card on file required) | ″ | 2026-05-29T20:11Z |
| ormi-free | Somnia mainnet support | mainnet + testnet environments referenced (docs llms.txt); **0xGraph network-list page showed only `somnia-testnet`** — VERIFY at deploy (see Open Q) | ormilabs.com/docs | 2026-05-29T20:10Z |
| ormi-paid | Production / High-Perf | $75/mo (5 rps) / $150/mo (60 rps), unlimited entities | ormilabs.com pricing | 2026-05-29T20:11Z |
| getblock | Somnia mainnet RPC + archive | Starter $39, Advanced $159, Pro $399 (all archive); free 50k CU/day no archive; **eth_getBlockReceipts supported** | docs.getblock.io/api-reference/somnia; getblock.io/pricing | 2026-05-29T20:12Z |
| coingecko | SOMI availability | id `somnia`, ~$0.151, ATL $0.1466 May-2026, full history | coingecko.com/en/coins/somnia | 2026-05-29T20:11Z |
| coingecko | OHLC timestamp convention | **candle-CLOSE** (KPD-19) | docs.coingecko.com/reference/coins-id-ohlc | 2026-05-29T20:10Z |
| coingecko | free hourly availability | OHLC hourly = paid-only; `market_chart/range` gives hourly auto-granularity (1–90d) on free Demo | docs.coingecko.com + support | 2026-05-29T20:11Z |

### The Backfill-Span Correction (load-bearing — feeds DATA_SOURCING.md + INDEX-01 + STATS-01)
ROADMAP/PROJECT/REQUIREMENTS repeatedly state "~320M blocks / ~270 days back to deployment." **This is wrong.** The proxy was deployed **2026-04-17** (block 283,417,317), making it **~42 days old**. The "~320M" figure conflated *total chain age since TGE 2025-09-02* with *proxy age*. Consequences the planner MUST propagate:
- INDEX-01 `startBlock = 283,417,317` (resolved, not "TBD via creator EOA").
- Backfill = **36.3M blocks ≈ 36,287 getLogs windows**, not ~320K.
- The "direct-RPC is infeasible" justification for Ormi-as-mandatory weakens to "Ormi-as-preferred-for-mapping-surface." Direct-RPC archive backfill is now a feasible paid-RPC fallback (~36K sequential 1000-block calls; at 1 req/s that is ~10 hours, at GetBlock's 100 RPS far less).
- Retention worry collapses: the public RPC already serves correctly at the deploy block, so the deep-history concern is about **Ormi's** retention specifically, not the chain's.
- The block-cadence figure used for the KPD-14 gap threshold and STATS-01 should be **~100.7 ms/block** (measured over the proxy's own window), not ~72 ms.

### Deep-History Retention Findings (the MEDIUM probe DATA-SOURCE-01 mandated)
- **Public RPC:** PASS — full archive confirmed (`eth_getLogs` returned 5 logs and `eth_getStorageAt` returned the correct impl address at block 283,417,317). No retention truncation.
- **Ormi free tier:** retention/history depth is **not stated in vendor docs**. Recommended probe at execution: deploy a minimal subgraph with `startBlock = 283,417,317` and confirm it backfills to the deploy block (the 42-day / 36M-block span is small — Ormi's flat-rate post-2026-04 model removed query metering, so a one-shot backfill should complete; the binding question is the 300k-entity cap, not retention). This is now a *deploy-and-observe* probe, not a deep-history-query probe, because the chain itself is only 42 days deep at the proxy.

## On-Chain Event Shapes vs Interface (TOPIC-01 / KPD-18 — resolves a review-deferred item)

**Live on-chain event shapes** (probed against proxy logs this session):
| topic0 (live) | #topics | data bytes | shape interpretation |
|---------------|---------|-----------|----------------------|
| `0xb62339927ed9948fd837358a55f5b9a824f7b047043faece66965593ed726889` | 3 (topic0 + 2 indexed) | 1120 | 2 indexed args + large dynamic payload |
| `0x5c090ef48df2b4d8a01bd0639355d62c318b623aed749bdd12325f789e37a2cf` | 2 (topic0 + 1 indexed) | 32 | 1 indexed arg + 1 word |
| `0x65db1ef5b3bcd84fe4fb8dbbe1cadc9fe6643bb261ab2e01d65c281c3d466af2` | 2 (topic0 + 1 indexed) | 32 | 1 indexed arg + 1 word |

**`main`-branch interface event shapes** (`emrestay/somnia-agents-skills` raw `main`, fetched 2026-05-29):
| event | #topics | data | indexed |
|-------|---------|------|---------|
| `RequestCreated(uint256 indexed requestId, uint256 indexed agentId, uint256 perAgentBudget, bytes payload, address[] subcommittee)` | **3** | large dynamic | requestId, agentId |
| `RequestFinalized(uint256 indexed requestId, ResponseStatus status)` | 2 | 32 | requestId |
| `SubcommitteePaid(uint256 indexed requestId, uint256 totalPaid, uint256 perMember)` | 2 | 64 | requestId |
| `CommitteeDepositFailed(uint256 indexed requestId, uint256 attemptedAmount)` | 2 | 32 | requestId |
| `NativeTransferFailed(address indexed recipient, uint256 amount)` | 2 | 32 | recipient |

**Conclusions for the planner:**
1. **The scout's role labels are almost certainly INVERTED.** The 3-topic + large-payload on-chain `0xb623…` matches `RequestCreated`'s shape — it is the likely **RequestCreated**, NOT a "response" event. The 2-topic/32-byte `0x5c09`+`0x65db` pair match the 2-topic 32-byte event family. The scout addendum's "RequestCreated ≈ 0.7×tx" mapping was built on the inverted label.
2. **"Which IS RequestCreated" (review-deferred item) — recommended resolution:** TOPIC-01 keccak-resolves all three topic0s against the **pinned-commit (`e15d4e9`)** ABI (the `main` branch may have drifted — note the pinned-commit raw fetch failed this session; plan-phase MUST re-pin and confirm the exact commit's event list). Define `RequestCreated` = the topic0 whose keccak signature hash matches `RequestCreated(...)` **and** whose on-chain topic-count + data-length match the ABI shape (the 3-topic/large-payload event). Do NOT assume the request-pair is RequestCreated. The 1:1:1 ratio + the per-tx compositions in the scout addendum should be re-interpreted once roles are correct.
3. **KPD-18 reframed: there is NO indexed `string`/`bytes`/dynamic-array field in the `main` interface.** `agentId` is an indexed `uint256`, not `string indexed agentClass`. The "graph-node hashes indexed-dynamic fields" pitfall (B1) does **not** apply to this interface as written. Two possibilities the planner must resolve: (a) the on-chain impl genuinely has no indexed-dynamic field → KPD-18's keccak-lookup table is unnecessary and the `agent_class_keccak`/`agent_class_string` reservation maps to recovering the class from `agentId` (a uint registry) or from `bytes payload`; (b) the on-chain impl differs from `main` and DOES carry an indexed string → only the pinned-commit ABI + a calldata decode of a real tx will tell. **Keep the two reserved columns** (cheap insurance) but document that the recovery mechanism is likely `agentId → class` mapping, not `keccak → string`.
4. There is **no `ResponseReceived` event** in the interface — EVENT-01/REQUIREMENTS reference it, but the interface has `RequestFinalized` + `SubcommitteePaid`. The `Response[]` data lives in the `Request.responses` struct array (read via call/state, or carried in `RequestCreated`'s/Finalized's payload), not a dedicated per-response event. **This materially affects the `responses` child-table population strategy** — the planner must confirm whether per-member response data is event-emitted at all or only state-readable. (The 1120-byte payload on `0xb623…` may encode the `address[] subcommittee` + response data.)

## Schema Artifacts (EVENT-01 / SHARED-SCHEMA-01 — KPD-03, KPD-11a)

### polars/parquet dtype conventions (match abrigo-analytics: polars ≥ 1.20, parquet+zstd, Hive)
| Logical type | polars dtype | parquet physical | nullability | note |
|--------------|-------------|------------------|-------------|------|
| chain_id | `pl.Int64` (or `UInt32`) | INT64 | NOT NULL | 5031 constant; keep wide for cross-leg join |
| block_number | `pl.UInt64` | INT64 | **NOT NULL** | arrival-ordering primary key part 1 |
| log_index | `pl.UInt32` | INT32 | **NOT NULL** | arrival-ordering primary key part 2 |
| tx_hash | `pl.Utf8` (or `Binary(32)`) | BYTE_ARRAY | NOT NULL | dedup key part |
| block_ts_utc | `pl.Datetime("us", "UTC")` | INT64 (logical TIMESTAMP) | NOT NULL | **coarse secondary** — whole-second source, store µs but never sort-primary |
| topic0 | `pl.Utf8`/`Binary(32)` | BYTE_ARRAY | NOT NULL | for resolver join |
| requestId / agentId | `pl.Utf8` (uint256 → decimal string) or `pl.Binary` | BYTE_ARRAY | NOT NULL | **never `Int64`** — uint256 overflows; use string/binary |
| perAgentBudget / gross_cost_native | `pl.Utf8` (wei decimal string) or `pl.Decimal` | BYTE_ARRAY/FIXED | NOT NULL | wei values exceed Int64 |
| gross_cost_usd / fx_rate | `pl.Float64` | DOUBLE | nullable (FX may be stale) | |
| implementation_address | `pl.Utf8` | BYTE_ARRAY | NOT NULL | **never null-type** — PITFALLS E1 |
| agent_class_keccak | `pl.Utf8`/`Binary(32)` | BYTE_ARRAY | nullable | KPD-18 reservation |
| agent_class_string | `pl.Utf8` | BYTE_ARRAY | nullable | KPD-18 reservation |
| gap_status (enum) | `pl.Enum(["observed","indexer_gap_censored","source_gap"])` or `pl.Categorical` | BYTE_ARRAY | NOT NULL | feeds STATS-01 |
| schema_version | `pl.Utf8` | BYTE_ARRAY | NOT NULL | |

**Critical dtype pitfall (HIGH):** uint256 fields (`requestId`, `agentId`, `perAgentBudget`, all wei amounts) **MUST NOT** be polars `Int64`/`UInt64` — they overflow at 2^63/2^64. Store as decimal `Utf8` (lossless, sortable lexicographically only with zero-padding — prefer numeric ops in `pl.Decimal(38,0)` where range allows, else string + explicit big-int handling). This is the single most common silent-corruption trap for EVM event panels.

**Arrival-ordering contract (EVENT-01 SC#8, HIGH-1 — confirmed by live whole-second probe):** sort key is `(block_number, log_index)`; `block_ts_utc` is documented coarse secondary. Live evidence: three consecutive blocks had timestamps 1780085231/1780085231/1780085232 — multiple blocks share a whole second, and at ~100ms/block up to ~10 blocks (×N logs) share a `block_ts_utc`. A timestamp sort scrambles arrival order; the dedup key is `(chain_id, tx_hash, log_index)`.

**`responses` child table (KPD-03 locked):** PK `(chain_id, tx_hash, log_index, member_index)`, FK `(chain_id, tx_hash) → requests`. Caveat from the event analysis above: confirm per-member response data is event-derivable before committing the population path (it may be state-read from `Request.responses`).

### SHARED-SCHEMA-01 (intersection + extension, `.md` + `.json`)
- **Intersection** (`abrigo_cost_panel_intersection_v1.{md,json}`): `request_id, tx_hash, block_number, block_ts_utc, chain_id, gross_cost_native, gross_cost_usd, net_cost_usd, fx_rate, fx_source_ts_utc, schema_version`. Mark `v1-K_AI-anchored`.
- **Extension** (`abrigo_cost_panel_k_ai_extensions_v1.md`): `agent_class, implementation_address, request_id_kai, subcommittee_size, per_agent_budget_native, agent_class_keccak, agent_class_string, …` joined on `(chain_id, tx_hash)`.
- **Machine-loadable JSON:** use **JSON Schema draft 2020-12** (`$schema`, `type: object`, `properties` with `type`/`format`, `required` array enumerating non-nullable columns). The `_schema_v1.json` at the parquet partition root maps each column to its polars dtype string so `pl.scan_parquet(..., schema=...)` reads explicitly (PITFALLS E1 — never infer; a null-only early-partition `implementation_address` would otherwise infer as Null-type and break later partitions).
- **batch_manifest_v1.yaml (KPD-11a):** YAML schema artifact + a JSON-Schema validator (write-time enforcement is Phase 5 / KPD-11b). Required fields: `run_id, rpc_endpoint, subgraph_endpoint, indexer_commit_sha, from_block, to_block, observed_impl_address, fx_cache_sha256, topic0_map_sha256, impl_history_sha256, schema_version_sha256`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| uint256 arithmetic on event amounts | Custom int parsing into Int64 | `pl.Decimal(38,0)` or string + Python `int` | Int64 overflow silently corrupts perAgentBudget/wei |
| Parquet schema inference | `pl.scan_parquet` without `schema=` | Explicit `_schema_v1.json` artifact | Null-only early partitions infer Null-type, break reads (E1) |
| Subgraph host | Self-hosted graph-node | Ormi free Developer | Somnia-canonical, deploy-allowed, $0, removes ops burden |
| topic0 → signature | Hardcoding from `main` interface | keccak-resolve against pinned commit + on-chain shape match | Interface drift; on-chain shapes already mismatch `main` |
| FX candle alignment | Assuming OHLC timestamp = open | Subtract candle duration (CLOSE convention) OR use `market_chart/range` price series | KPD-19: CoinGecko OHLC ts is CLOSE → 1-candle look-ahead poisons inequality #1 |
| Hourly FX on free tier | OHLC endpoint hourly param | `coins/{id}/market_chart/range` (free hourly 1–90d) | OHLC hourly is paid-only; market_chart hourly is free |

**Key insight:** the chain itself (full archive, 1000-block getLogs cap, getBlockReceipts available) plus Ormi's free deploy-allowed tier means M1 needs **no paid resource** unless the 300k-entity cap bites — and even then the cheapest sufficient option ($39–$75/mo) is far under the $390 ceiling. The expensive failure mode is not budget; it is mis-resolving the topic0 roles or overflowing uint256.

## Common Pitfalls

### Pitfall 1: Trusting the scout's topic0 role labels
**What goes wrong:** Building leg-(b) structural ratios and the `responses` child table on "RequestCreated = the request pair `0x5c09`+`0x65db`."
**Why it happens:** The scout addendum inferred roles from per-tx composition, not from ABI keccak + shape match. The on-chain shapes contradict it (the 3-topic/large-payload `0xb623` matches RequestCreated).
**How to avoid:** TOPIC-01 keccak-resolves first; leg-(b) ratios and the ~165k envelope are recomputed *after* roles are confirmed.
**Warning signs:** A "request" event carrying 1120 bytes of dynamic data; a "response" event with only 32 bytes.

### Pitfall 2: The ~320M-block / ~270-day backfill assumption
**What goes wrong:** INDEX-01 sized for ~320K windows; "direct-RPC infeasible" used to justify Ormi-mandatory; deep-history retention treated as the gating risk.
**Why it happens:** Conflating chain-age-since-TGE with proxy-age.
**How to avoid:** Use deployment block 283,417,317; backfill = 36.3M blocks; Ormi is *preferred* (mapping surface), not *mandatory* (RPC is now feasible).
**Warning signs:** Any plan text citing "~320M blocks back" or "~270 days."

### Pitfall 3: uint256 → Int64 overflow
**What goes wrong:** perAgentBudget, requestId, wei amounts silently wrap.
**How to avoid:** `pl.Decimal(38,0)` / string; never Int64 for on-chain big-ints.
**Warning signs:** Negative or absurdly-small budget values in the panel.

### Pitfall 4: FX look-ahead from candle-CLOSE timestamp (KPD-19)
**What goes wrong:** Joining an OHLC candle whose CLOSE ts ≤ block ts injects up to one candle-duration of look-ahead.
**How to avoid:** Subtract candle duration, or use `market_chart/range` instant prices; LOCF strictly `t_price < t_block`.
**Warning signs:** Inequality #1 binding rate suspiciously clean.

### Pitfall 5: Ormi free 300k-entity auto-upgrade surprise
**What goes wrong:** Backfill silently auto-upgrades to Production ($75/mo) at 300k entities, breaching the "no spend without sign-off" rule mid-backfill.
**Why it happens:** Ormi free tier auto-upgrades unless disabled at signup; ~165k RequestCreated + responses child rows likely exceed 300k entities.
**How to avoid:** Disable auto-upgrade at signup; treat "exceeds 300k" as a *forced paid-branch* per the four-bar rule and surface for sign-off BEFORE backfill.
**Warning signs:** Entity count climbing past ~250k during a test backfill.

## Code Examples (verified patterns from this session's probes)

### Confirm getBlockReceipts availability (Phase-3 parity selector)
```bash
# Source: live probe api.infra.mainnet.somnia.network 2026-05-29T20:07Z
curl -s -X POST "$RPC" -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"eth_getBlockReceipts","params":["latest"]}'
# -> {"result":[...]}  (NOT method-not-found) => Phase-3 SC#2 may use per-block-receipt scan
```

### Resolve deployment block (INDEX-01 startBlock)
```bash
# Source: live probe 2026-05-29T20:09Z — creation tx of proxy
curl -s -X POST "$RPC" -d '{"jsonrpc":"2.0","id":1,"method":"eth_getTransactionByHash",
  "params":["0x36596e1854e413681992166d5d55552d999f820eafdf6f8fe07afef1e66e8b0a"]}'
# -> blockNumber 0x10e... => 283417317
```

### Beacon/diamond probe (KPD-17 happy path)
```bash
# BEACON_SLOT = keccak256('eip1967.proxy.beacon')-1
curl ... eth_getStorageAt impl 0xa3f0ad74e5423aebfd80d3ef4346578335a9a72aeaee59ff6cb3582b35133d50  # -> 0x (empty)
# EIP-2535 diamond.standard.diamond.storage
curl ... eth_getStorageAt impl 0xc8fcad8db84d3cc18b4c41d551ea0ee66dd599cde068d998e57d5e09332c131c  # -> 0x (empty)
```

## State of the Art

| Old Approach (planning docs assume) | Current Reality (probed) | Impact |
|-------------------------------------|--------------------------|--------|
| ~320M-block / ~270-day backfill | 36.3M blocks / 42 days (deploy 283,417,317) | INDEX-01 sizing ÷9; direct-RPC feasible |
| Direct-RPC backfill infeasible → Ormi mandatory | Public RPC full archive; ~36K capped calls | Ormi preferred (mapping surface), not mandatory |
| Block cadence ~72 ms | ~100.7 ms/block (proxy window) | KPD-14 gap threshold + STATS-01 use 100.7ms |
| RequestCreated = request pair `0x5c09`+`0x65db` | Likely `0xb623` (3-topic/large-payload) | TOPIC-01 must keccak-resolve; ratios recomputed |
| `string indexed agentClass` (KPD-18 keccak trap) | No indexed-dynamic field; `agentId` is uint256 | KPD-18 reframed to agentId→class mapping |
| CoinGecko OHLC ts = open (unverified) | candle-CLOSE (confirmed) | FX LOCF subtracts candle duration |

**Deprecated/outdated:**
- The "deep-history retention at ~320M blocks back" probe design — superseded by the 42-day reality; the retention question now applies only to Ormi (deploy-and-observe), not the chain.

## Open Questions

1. **Does the ~165k RequestCreated + responses fit under Ormi free 300k-entity cap?**
   - Known: free cap 300k entities; auto-upgrade to $75/mo Production at 300k.
   - Unclear: total entity count = RequestCreated rows + responses child rows + impl_history; ~165k requests alone is under 300k, but each request's `Response[]` (subSize≈3, 1–5 members) as separate entities could push total to 300k–800k.
   - Recommendation: plan-phase models the entity count; if > 300k, the provisional pick becomes **Ormi Production $75/mo** (still subgraph-compatible, zero re-author, under ceiling) and is surfaced for sign-off. Disable free-tier auto-upgrade regardless.

2. **Which exact topic0 is RequestCreated, and is per-member response data event-emitted?**
   - Known: on-chain shapes; `main` interface has no `ResponseReceived` and a 3-topic RequestCreated.
   - Unclear: the **pinned commit `e15d4e9`** ABI (this session's pinned-SHA fetch failed; `main` may have drifted) and whether `Request.responses` is reconstructable from logs alone or needs state reads.
   - Recommendation: TOPIC-01 re-fetches the pinned commit (gh blob API or git clone at SHA), keccak-resolves all three, and confirms the responses-population path before EVENT-01's `responses` child table is treated as event-fillable.

3. **Ormi Somnia-MAINNET subgraph deploy (vs testnet-only).**
   - Known: Ormi llms.txt references Somnia mainnet+testnet; the 0xGraph network-list page showed only `somnia-testnet`.
   - Recommendation: the cheapest decisive probe is to attempt a minimal mainnet (chain 5031) subgraph deploy on the free tier at execution; if mainnet is unsupported, fall back to GetBlock $39 archive RPC (sub-plan re-author) — both under ceiling.

## Coherence-Check Construction (SC#7(iv) — the reconciliation, NOT a citation)

The DATA_SOURCING.md coherence section must state, explicitly:
- **x402's "free-tier discipline" is a paid-API BUDGET gate** (a 90k-call cost-ledger guarding modeled spend) — see `abrigo-x402/.planning/research/SUMMARY.md` (TS-04 demand-window gate, 90k-cap budget gate, "cost leg is modeled, not paid" / "@graphprotocol/client-x402 settles on Base, not Celo").
- **somnia's DATA-SOURCE-01 is a COMPLETENESS-sufficiency gate** — the question is "does the source capture the full arrival series," not "are we under budget." Budget ($390/mo) is a secondary constraint, not the gate.
- **x402's "settlement-infra modeled-not-paid" caveat has NO analogue here.** SOMI on-chain data is *real-or-nothing*: there is no modeled substitute for `IAgentRequester` events. Paying for a real on-chain feed (if Ormi free fails) is therefore a **justified departure** from x402's modeled-cost discipline — a different category, not a violation.
- **Shared-schema impact on abrigo-analytics:** state whether the free-vs-paid choice changes any SHARED-SCHEMA-01 intersection assumption. It does **not** — the intersection columns are source-agnostic (a request's `gross_cost_native`/`block_ts_utc` are identical whether indexed by Ormi or RPC-scan). Record this explicitly. Cross-check against `abrigo-analytics/notes/somnia_cost_extraction.md`'s "stop-gap pricing" + "no native SOMI/USD oracle" findings — both stand; FX-01 off-chain CoinGecko sourcing is consistent with the documented no-oracle limitation.
- A one-line "consistent ✓" is a FAIL.

### Review-deferred items — recommended resolutions
1. **Leg-(b) tolerance band (Claude's discretion):** recommend a **sample-CI basis** over a fixed ±X%. The n=116 addendum sample gives a binomial CI on the request-pair-per-tx rate (83/116 ≈ 0.716; Wilson 95% CI ≈ [0.627, 0.791]); derive the ratio band from that CI rather than an arbitrary ±X%, and widen for the cross-epoch caveat (item 3). State the basis in the matrix.
2. **"RequestCreated event" definition:** resolved above — keccak-match + shape-match against the pinned commit; the 3-topic/large-payload `0xb623…` is the leading candidate, NOT the `0x5c09`+`0x65db` pair. Define per-topic0 explicitly in `topic0_map_v1.json`.
3. **Cross-epoch ratio drift:** the 1:1:1 / 2.15 ratios come from one recent 80k-block window. With the proxy only 42 days old (not 270), early-epoch drift risk is smaller than feared but still real (impl behavior at deploy vs now). Recommend the Phase-3 stratified sampling (deploy-third / mid / head-third already mandated by SC#2) carry the ratio check per stratum; treat leg-(b) as a non-blocking anomaly flag (per round-4 pre-commit edit), with legs (a)+(c) binding.

## Validation Architecture

> nyquist_validation is enabled (config.json workflow.nyquist_validation = true).

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pytest (uv-managed Python 3.12, matching abrigo-analytics) |
| Config file | none yet — greenfield repo; **Wave 0** creates `pyproject.toml`/`pytest` config + `tests/` |
| Quick run command | `uv run pytest tests/ -x -q` |
| Full suite command | `uv run pytest tests/ -v` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| EVENT-01 | `event_schema_v1.md` DDL parses; arrival fields non-nullable; `(block_number, log_index)` ordering + `(chain_id,tx_hash,log_index)` dedup documented | unit (schema-lint) | `uv run pytest tests/test_event_schema.py -x` | ❌ Wave 0 |
| SHARED-SCHEMA-01 | `abrigo_cost_panel_intersection_v1.json` is valid JSON-Schema (draft 2020-12) and loads via polars dtype map | unit | `uv run pytest tests/test_shared_schema_json.py -x` | ❌ Wave 0 |
| SHARED-SCHEMA-01 | intersection PK + K_AI extension join key `(chain_id,tx_hash)` consistent across `.md` and `.json` | unit | `uv run pytest tests/test_schema_consistency.py -x` | ❌ Wave 0 |
| DATA-SOURCE-01 | `data_sourcing_matrix.yaml` conforms to fixed schema (`source,capability,value,threshold,pass,source_url,utc_fetch_ts`); every row has source_url+utc_fetch_ts | unit (yaml-schema) | `uv run pytest tests/test_data_sourcing_matrix.py -x` | ❌ Wave 0 |
| DATA-SOURCE-01 | four sufficiency bars each have a pass/fail value; any free-tier fail flips verdict to paid | unit (logic) | `uv run pytest tests/test_sufficiency_bars.py -x` | ❌ Wave 0 |
| KPD-11a | `batch_manifest_v1.yaml` validates against its JSON-Schema validator | unit | `uv run pytest tests/test_batch_manifest_schema.py -x` | ❌ Wave 0 |
| KPD-17/KPD-09-docs | scout-archive probe-result files exist with the recorded slot reads + finality verdict citation | smoke (file+content) | `uv run pytest tests/test_scout_archive.py -x` | ❌ Wave 0 |
| KPD-19 | `coingecko_config.yaml::timestamp_convention == 'close'`; candle-convention fixture present | unit | `uv run pytest tests/fixtures/test_fx_candle_convention.py -x` | ❌ Wave 0 |

Live-RPC probes (deployment block, getBlockReceipts, beacon slots) are **manual-only at execution** with results committed to the scout archive — not in the automated suite (network-dependent, would flake CI). Their *recorded outputs* are smoke-tested for presence + expected values.

### Sampling Rate
- **Per task commit:** `uv run pytest tests/ -x -q` (schema-lint + matrix-schema; sub-second).
- **Per wave merge:** `uv run pytest tests/ -v` (full schema + fixture suite).
- **Phase gate:** full suite green + every `data_sourcing_matrix.yaml` row carries source_url+utc_fetch_ts before `/gsd:verify-work`.

### Wave 0 Gaps
- [ ] `pyproject.toml` + pytest config (uv env) — no test infra exists (greenfield)
- [ ] `tests/conftest.py` — shared fixtures (schema loaders, yaml validators)
- [ ] `tests/test_event_schema.py`, `tests/test_shared_schema_json.py`, `tests/test_schema_consistency.py`
- [ ] `tests/test_data_sourcing_matrix.py`, `tests/test_sufficiency_bars.py`, `tests/test_batch_manifest_schema.py`
- [ ] `tests/test_scout_archive.py` (KPD-16/17/09-docs presence+value checks)
- [ ] `tests/fixtures/fx_candle_convention.py` + its test (KPD-19, consumed by Phase 4c)
- [ ] Framework install: `uv add --dev pytest jsonschema pyyaml polars` (or project equivalent)

## Sources

### Primary (HIGH confidence — live probes + vendor docs with URL+ts)
- Live Somnia RPC `https://api.infra.mainnet.somnia.network/` — chainId, head, getLogs cap, getBlockReceipts, archive depth, block cadence, whole-second timestamps, baseFee, beacon/diamond/impl/proxy slots, deployment block 283,417,317, creation tx (all fetched 2026-05-29T20:06Z–20:09Z).
- Ormi pricing `https://ormilabs.com/docs/billing-and-pricing/pricing` + `https://ormilabs.com/docs/llms.txt` — free Developer $0/300k/1sg/1rps/deploy-allowed; Production $75; High-Perf $150; Somnia mainnet+testnet referenced (2026-05-29T20:10Z–20:11Z).
- GetBlock `https://docs.getblock.io/api-reference/somnia` + `https://getblock.io/pricing/` — Somnia mainnet RPC + eth_getBlockReceipts; Starter $39 / Advanced $159 / Pro $399 (all archive); free 50k CU/day no archive (2026-05-29T20:12Z).
- CoinGecko `https://docs.coingecko.com/reference/coins-id-ohlc` + `https://www.coingecko.com/en/coins/somnia` — OHLC ts = candle-CLOSE; SOMI id `somnia`, ~$0.151; hourly OHLC paid-only, market_chart hourly free 1–90d (2026-05-29T20:10Z–20:11Z).
- IAgentRequester interface (`emrestay/somnia-agents-skills` raw `main`) — event list + structs (2026-05-29T20:11Z). NOTE: `main` may have drifted from pinned `e15d4e9`; pinned-SHA fetch failed this session and must be re-confirmed in plan-phase.

### Secondary (MEDIUM confidence — verified-with-official-source)
- Somnia finality: `docs.somnia.network/llms-full.txt` + codex MultiStream page + GetBlock docs — "sub-second finality," deterministic PBFT merge, no explicit reorg/irreversibility statement (KPD-09-docs: branch (a) provisionally, confirm empirically in Phase 3).
- `abrigo-x402/.planning/research/SUMMARY.md` (budget-gate framing) + `abrigo-analytics/notes/somnia_cost_extraction.md` (stop-gap pricing, no oracle) — coherence-check inputs.

### Tertiary (LOW confidence — needs validation)
- Alchemy/QuickNode Somnia support: **absence of evidence** — neither confirms chain 5031; treat as "unavailable/unverified," not "impossible." GetBlock is the confirmed paid-RPC archive.
- Ormi Somnia-mainnet deploy permission specifically (vs testnet) — docs reference mainnet but network-list page showed testnet-only; resolve by deploy-probe.

## Metadata

**Confidence breakdown:**
- Data-sourcing capability matrix: HIGH — every chain capability re-probed live this session; all three paid classes priced from vendor docs.
- Backfill-span / deployment-block correction: HIGH — derived from live creation-tx + block-timestamp reads.
- Event-shape vs interface mismatch: MEDIUM — on-chain shapes HIGH (probed), interface from `main` (pinned commit unverified this session); the *inversion conclusion* is well-supported but TOPIC-01 must re-pin.
- Schema dtype conventions: HIGH — standard polars/parquet + JSON-Schema draft 2020-12; uint256 overflow is a known hard constraint.
- Finality (KPD-09-docs): MEDIUM — docs assert sub-second finality but never explicitly state irreversibility.
- Ormi free-tier sufficiency (300k cap vs entity count): MEDIUM — pricing HIGH, but entity-count fit is an unmodeled open question.

**Research date:** 2026-05-29
**Valid until:** 2026-06-12 (~14 days — Somnia docs labelled "stop-gap"; Ormi pricing changed 2026-04-01; chain is young and fast-moving — re-probe deployment-relative figures and Ormi cap each milestone).
