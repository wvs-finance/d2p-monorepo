# Phase 3: Subgraph Indexing - Context

**Gathered:** 2026-05-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Deploy a reproducible indexer on the **DATA-SOURCE-01-selected host (Ormi free Developer tier, provisional)** against the `IAgentRequester` proxy `0x5E5205CF…163E6`, backfill the full proxy event history from deploy block **283,417,317 → head**, with continuous correctness + liveness reconciliation against direct-RPC, the **binding three-leg completeness gate** (independent live-re-queried transaction-coverage anchor + scout-addendum structural event-ratio conformance + indexer-internal full-range contiguity proof) that re-confirms the provisional Phase-1 source selection, end-to-end `(block_number, log_index)` ordering/granularity verification, and an empirically-grounded `safe_block_depth` from observed rollback behavior. Owns subgraph authorship (`subgraphs/iagentrequester/`) per KPD-08.

**Out of scope (other phases):** the rebate decompilation/residual (BYTECODE-01, Phase 4), the gas panel (GAS-01, Phase 4), the FX series (FX-01, Phase 4), the panel join (PANEL-01, Phase 5), and all statistics / arrival-periodicity precursor (STATS-01, Phase 6). Phase 3 produces a correct, complete, ordered event store + the aggregate per-request `executionCost` — not the analysis.
</domain>

<decisions>
## Implementation Decisions

### `responses` / executionCost scope — AGGREGATE-ONLY (Σ executionCost), filled during backfill
- The `IAgentRequester` interface has **NO `ResponseReceived` event** (Phase-2 forward-note 1). Per-member `Response[]` (incl. each member's `executionCost`) is **state-only**, read via `getRequest(uint256) → Request` (**selector `0xc58343ef`**), keyed off the `requestId`s carried by `RequestFinalized`.
- **Decision:** during Phase-3 backfill, issue **one batched `getRequest(requestId)` eth_call per finalized request** and write a **single aggregate `Σ_i executionCost` field on the request row**. This is exactly what PANEL-01 (realized cost distribution vs the docs-quoted `{0.03, 0.07, 0.10}` SOMI prices) and BYTECODE-01 Tier-C (rebate residual) consume.
- **Do NOT populate the per-member `responses` child table for M1.** Per-member fill would be ≈3× entities (`subSize_default = 3` × ~165k requests ≈ 495k response rows) → blows past the **300k free-tier entity cap** → forces the $75/mo crossing for granularity M1 does not need.
- This closes the EVENT-01 `responses`-child-table open question for M1: child table **deferred (not populated)**; aggregate Σ executionCost is a request-row field. The per-member child table remains a *reserved schema shape* for a later milestone if per-validator detail is ever needed.

### Entity-cap notification threshold — PROJECTED-OVERAGE mid-backfill
- The payment protocol (Phase-2 forward-note 3) is fixed: **no auto-spend**; if the free 300k-entity cap is threatened I notify the user with entity-count evidence, the user pays **$75/mo Ormi Production** and **confirms before I provision**; **Ormi free-tier auto-upgrade disabled at signup** regardless (Pitfall 5).
- **Decision on WHEN to notify:** extrapolate the entity count from the **first chunk of backfill** against the 300k cap; if the **projection** would cross, **pause and surface entity-count evidence immediately** — maximum runway to decide before the backfill actually stalls. (Not a soft 80% threshold; not a hard cap-hit.)
- With the aggregate-only `responses` decision above, the expected M1 entity total is ≈ request + finalized + committee-event rows on the order of a few × 165k — **provisionally under 300k**, so the crossing is *not expected to fire*; this threshold is the tripwire if the projection says otherwise.

### Liveness + rollback observation window — REPRESENTATIVE, not full 24h
- **`safe_block_depth` (KPD-09-empirical):** ≥1h continuous chain-head observation → `safe_block_depth_observed_max`; if zero rollback observed, `safe_block_depth = 1` (consistent with the KPD-09-docs PBFT-determinism verdict in `.planning/scout/2026-05-29/somnia_finality_semantics.md`).
- **Liveness (SC#3 / PITFALLS B2):** a **few-hour representative window** evidencing `indexer_head_lag_blocks` < 60 for ≥99% of polls is sufficient to **close Phase 3** for M1's arrival-series goal. The literal "last 24 hours" figure is **reported as an ongoing/continuous metric, NOT a hard phase-completion gate** — Phase 3 does not block ≥1 wall-clock day on a production-SLA proof.
- Probe params unchanged: poll `_meta.block.number` vs `eth_blockNumber` every 5 min; escalate if gap > 60 blocks for 3 consecutive probes.

### Completeness-anomaly (leg-b) handling — PROCEED + LOG, halt only on GROSS deviation
- Leg (b) structural-ratio conformance (total ≈ 2.15 × txs; topic0s ≈ 1:1:1; `RequestCreated` ≈ 0.7 × txs ≈ ~165k) is a **non-blocking anomaly flag** per the roadmap — legs (a) tx-anchor + (c) contiguity carry the binding completeness assurance.
- **Decision:** default to **proceed + record the deviation as a retroactive input to the free-vs-paid verdict**; **add a safety-valve tripwire** — if the deviation exceeds a **stated hard band (e.g. > 2× the plan-phase tolerance)**, **halt and surface a paid-archive-swap decision** before continuing. The exact tolerance band + the gross-deviation multiplier are a **plan-phase deliverable** with a stated derivation basis (sample-CI-derived from the n=116 addendum sample, or a fixed ±X% justified against it).

### Claude's Discretion (delegated to KPDs + research + planner)
- Parity mechanism is **locked** to the per-block-receipt scan (`eth_getBlockReceipts` = AVAILABLE, live-probed 2026-05-29T20:07Z) over a **stratified ≥300-window** sample (deploy/mid/head thirds) — SC#2; the run-time `eth_getBlockReceipts`→capped-`eth_getLogs` degradation fallback is documented in SC#2.
- Subgraph authorship layout (`schema.graphql`, AssemblyScript mappings, `networks.yaml` chain 5031 + proxy pin), the GraphQL entity model, batching strategy for `getRequest` calls, the contiguity-proof query, and the parity/ordering report formats are planner/researcher decisions within the KPD-08 / SC envelope.
- Whether to sub-split into Phase 3a (manifest scaffold + admin handlers) / 3b (business-event handlers + parity + completeness gate) is a **plan-phase structuring call** — the MEDIUM-2 parallelism rationale is now moot (Phase 2 is complete), so the split is optional and organizational only.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope, success criteria & blocking decisions
- `.planning/ROADMAP.md` §"Phase 3: Subgraph Indexing" — goal, depends-on, KPD-04/08/09-empirical, PITFALLS B2/B3, SC#1–SC#7 (esp. the three-leg completeness gate SC#6 and the tx-granularity ordering surface SC#7).
- `.planning/ROADMAP.md` §"Phase Details" 2026-05-29 correction callout — deploy block 283,417,317; ~100.7ms / ~72ms cadence; `234,999` = TRANSACTION anchor (not event count); event-roles resolved in Phase 2.
- `.planning/REQUIREMENTS.md` — **INDEX-01** (full text) + **DATA-SOURCE-01** (the gating verdict INDEX-01 consumes).

### The gating data-source verdict (determines the implementation surface)
- `research/DATA_SOURCING.md` — PROVISIONAL pick **Ormi free Developer ($0)**; pre-costed paid fallback **Ormi Production $75/mo** (subgraph-compatible, zero re-author, under the $390 ceiling); the four sufficiency bars; the forced-paid-crossing caveat + sign-off requirement.
- `research/data_sourcing_matrix.yaml` — machine-checkable capability matrix: `eth_getBlockReceipts` = AVAILABLE (→ SC#2 per-block-receipt parity), `eth_getLogs` 1000-block cap, full-archive-at-deploy-block, cadence + `block.timestamp` granularity rows, `transactions_count` anchor row, deployment_block 283417317.

### Phase-2 forward hand-offs this phase MUST absorb
- `.planning/phases/02-topic-implementation-provenance/02-FORWARD-NOTES.md` — Note 1 (`responses` state-fill-only, `getRequest` selector `0xc58343ef`), Note 2 (`CommitteeDepositFailed` structural invariant → Phase 4, do not filter), Note 3 ($75/mo Ormi no-auto-spend payment protocol).

### Phase-1/2 schema + resolver inputs the mappings reference
- `schemas/event_schema_v1.md` — EVENT-01 DDL: arrival-timing fields first-class & non-nullable, ordering on `(block_number, log_index)`, dedup key `(chain_id, tx_hash, log_index)`, DTYPE SCOPE RULE (uint256/hash → `pl.Utf8`), the `responses` child-table reservation (now deferred per the decision above).
- `schemas/topic0_map_v1.json` — per-(impl, topic0) resolver the AssemblyScript mappings decode against (5 events; keccak-self-proven).
- `schemas/impl_history_v1.md` — IMPL-01 segmentation + the head-block bytecode backstop; PANEL-01 join semantics.
- `schemas/unresolved_topics_v1.md` — KPD-06 quarantine design + `<1%` ship gate the indexer feeds.
- `.planning/scout/2026-05-29/event_count_addendum.md` — the structural ratios leg (b) checks against.
- `.planning/scout/2026-05-29/somnia_finality_semantics.md` — KPD-09-docs verdict gating the provisional `safe_block_depth`.
- `.planning/scout/2026-05-29/rpc_capability_probe.md` — `eth_getBlockReceipts` / `eth_getLogs`-cap provenance.

### Cross-repo coherence
- `../abrigo-x402 research/SUMMARY.md` + `../abrigo-analytics/notes/somnia_cost_extraction.md` — the DATA-SOURCE-01 reconciliation INDEX-01 inherits (budget-vs-completeness; shared-schema assumptions).
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `probes/somnia_rpc.py` — Phase-1/2 RPC helpers (`eth_getCode`, `eth_getStorageAt`, `eth_getLogs`, `eth_getBlockReceipts`-capable); reuse for the SC#2 per-block-receipt parity scan, the `getRequest` aggregate-`executionCost` state-fill, the liveness probe (`eth_blockNumber`), and the contiguity recount. `__main__`-only network surface — keep live calls out of CI.
- `probes/blockscout.py` — Blockscout v2 helpers; reuse for the **live re-query** of `transactions_count` at the indexed head (completeness leg (a)). Blockscout rate-limits hard — budget for backoff.
- `tests/conftest.py` — six fixtures (`scout_dir`, `schemas_dir`, `research_dir`, `load_yaml`, `load_json`, `read_text`) consumed as params; the Phase-1/2 pytest harness (56 green) extends here.

### Established Patterns
- Provenance discipline: every external fact carries `source_url + utc_fetch_ts`; machine-checkable artifacts (YAML/JSON) over prose where assertable.
- uint256/hash columns → `pl.Utf8` only (never Int64/Decimal — Decimal128 overflows at 38 digits vs uint256's 78).
- No live network in CI — recorded constants asserted against fixtures; live probes are `__main__`-only / runnable but not in the suite.
- Public RPC `https://api.infra.mainnet.somnia.network/` is a full archive (works at the deploy block); `eth_getLogs` capped at 1000 blocks/window → windowed backfill.

### Integration Points
- New: `subgraphs/iagentrequester/` (schema.graphql + AssemblyScript mappings + networks.yaml) — KPD-08; plus indexing artifacts `indexing/completeness_proof.md`, `indexing/ordering_verification.md`, and `.planning/scout/2026-05-29/rollback_observation.md` (KPD-09-empirical).
- Outputs feed Phase 4 (4a-validate Tier-C executionCost residual), Phase 5 (PANEL-01 join on the event store + impl_history + aggregate executionCost), Phase 6 (STATS-01 arrival series + `pct_logs_unresolved`).
</code_context>

<specifics>
## Specific Ideas

- The user's standing priority (project memory): M1 exists to capture the `IAgentRequester` **arrival series** (per-event timing, ordering, completeness) robustly enough that M2's arrival-process estimation + convex-demand verdict is robust. Phase-3 decisions favor **completeness + correct ordering at $0** over production-grade SLA proof or per-validator fidelity.
- Cost posture: stay on the **free tier**; the $75/mo crossing is a *forced, user-confirmed* event, surfaced early via projected-overage, never auto-spent.
</specifics>

<deferred>
## Deferred Ideas

- **Per-member `responses` child table** (per-validator `{validator, result, status, receipt, timestamp, executionCost}`) — reserved schema shape; populate only in a later milestone that needs per-validator granularity. M1 uses aggregate Σ executionCost.
- **Full 24h+ production-SLA liveness proof** — reported as an ongoing metric; a hardened continuous-liveness gate is a post-M1 operational concern, not an M1 phase gate.
- **AdminChanged / governance-provenance tracking** — declined for M1 (Phase-2 Upgraded-only scope); admin handlers can be registered in a later milestone if governance provenance is needed.
</deferred>

---

*Phase: 03-subgraph-indexing*
*Context gathered: 2026-05-29*
