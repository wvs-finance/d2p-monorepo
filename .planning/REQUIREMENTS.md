# Requirements: abrigo-somnia M1 — Empirical Somnia Cost Panel

**Defined:** 2026-05-25
**Core Value (from PROJECT.md):** Which of the caller-side inequalities in `somnia_cost_extraction.md §6` (rows #1, #2, #4, #5, #6, #7) bind empirically, where are they slack, and what is the realized `executionCost_i` distribution per agent class versus the docs-quoted `{0.03, 0.07, 0.10}` SOMI prices — across all observed proxy implementation versions?

**Provenance:** This document is a derived artifact of `.planning/PROJECT.md` (committed at `28e1d54` after pre-flight scout + two reviewer-pipeline iterations + PITFALLS research; amended 2026-05-29 with DATA-SOURCE-01 + arrival-periodicity sharpening). Requirement IDs match PROJECT.md verbatim — semantic prefixes are retained rather than re-categorized into `IDX-NN` form because they are already established and externally referenced (e.g. `BYTECODE-01` is named in `somnia_cost_extraction.md §7-Q3`). Out-of-scope exclusions and Known Plan-Phase Decisions live in PROJECT.md and are not duplicated here.

## v1 Requirements

> **M1 primary concern — arrival periodicity.** M1 is the SOMI-leg parallel of the `abrigo-x402` ingestion+panel stage (L1–L3): ingest `IAgentRequester` cost events and capture the arrival series robustly enough that M2's arrival-process estimation (NHPP vs Hawkes) + four-condition convex-demand verdict on SOMI/USD is robust. M1 runs no estimation and no convex-demand verdict. See `memory: project-somi-leg-arc-and-data-sourcing`.

### Data Sourcing

- [x] **DATA-SOURCE-01** — Free-tier-first data-sourcing sufficiency research, **gating INDEX-01**. Verify whether the free tier (Ormi free subgraph + public Somnia RPC + Blockscout) is **sufficient** to capture the full `IAgentRequester` arrival series for robust arrival-process estimation, where **"sufficient" is the conjunction of four numeric bars** (any single free-tier failure ⇒ paid branch mandatory): (a) **event-level completeness via the transaction-coverage anchor + structural ratios** (HIGH-1/HIGH-2 — replaces the former "≥99.9% block-presence" bar that measured the wrong population at ~0.0016 events/block): sampled distinct proxy-targeted `tx_hash` counts reconcile against the `234,999` **transaction** anchor (exact, getLogs-cap-free), and per-topic event counts track the 2026-05-29 scout-addendum ratios (total ≈ 2.15 × txs; topic0s ≈ 1:1:1; `RequestCreated` ≈ 0.7 × txs ≈ ~165k); the "no contiguous skip > N blocks" check is demoted to the Phase-3 full-range contiguity proof (the ~1% sample cannot observe most windows); (b) timestamp granularity ≤ **native block cadence** (~72 ms/block scout-measured median; record whether `block.timestamp` is whole-second or sub-second — if whole-second, ~14 events share a timestamp so **`(block_number, log_index)` is the arrival-ordering key, not `block_ts_utc`**); (c) every tx-level multi-log block's `log_index` ordering preserved (the testable surface: a single request tx emits the request pair + 1–5 response events with distinct ascending `log_index` in one block); (d) zero `indexer=0 ∧ RPC>0` windows in the sample. The pre-INDEX verdict is a **PROVISIONAL source selection** (count-parity over a ~1% sample bounds **agreement, not completeness** — on a ~320M-block / 1000-block-cap chain there is no independent complete oracle); the **binding completeness gate** is a three-leg gate: the independent **transaction-coverage anchor** (Blockscout `transactions_count = 234,999`, a TRANSACTION count NOT an event count) + **structural event-ratio conformance** (total ≈ 2.15 × txs; topic0s ≈ 1:1:1; `RequestCreated` ≈ 0.7 × txs ≈ ~165k events, per the 2026-05-29 scout addendum) + the Phase-3 indexer-internal full-range **contiguity proof** (which proves only host cursor advancement and is completeness-bearing only when conjoined with the tx-anchor) — not the pre-INDEX sample, and not block-presence. No cheap EXACT independent event-count oracle exists pre-indexing; the exact `RequestCreated` lifetime count is an INDEX-01 output. Probe Ormi free-tier limits explicitly with **distinct probe methods per row**: retention/history depth via an **explicit deep-history probe at the deployment block** (~320M blocks back — confirm a non-empty correct response, NOT a recent-range throughput probe); backfill throttle / rate cap via the bounded recent-range backfill-rate probe (throughput only); subgraph-deployment permission vs read-only. The pre-costed paid fallback is **constrained to a subgraph-compatible host (paid Ormi/Protofire)** to preserve the SC#2 parity mechanism + KPD-08 mapping surface; a non-subgraph paid archive instead triggers an INDEX-01 sub-plan re-author (not phase re-decomposition). Record free-tier selection as **provisional-pending-Phase-3-backfill-confirmation with the (subgraph-compatible) paid alternative pre-costed**. Coherence check is a **real budget-vs-completeness reconciliation** (x402's free-tier discipline is a paid-API BUDGET gate; this is a COMPLETENESS gate; x402's "settlement-infra modeled-not-paid" caveat has no analogue here; state whether the verdict changes any `abrigo-analytics` shared-schema assumption) — a one-line "consistent ✓" is a FAIL. Every claim verified against a primary source with `source_url + utc_fetch_ts`. Deliverables: `research/DATA_SOURCING.md` (prose) **and** `research/data_sourcing_matrix.yaml` (machine-checkable, fixed schema; rows include the transaction-coverage anchor `transactions_count = 234,999` and a scout-addendum event-structure provenance row citing `.planning/scout/2026-05-29/event_count_addendum.md` + endpoint `https://api.infra.mainnet.somnia.network/` + head 319,686,151 + UTC 2026-05-29, per KPD-16 provenance discipline). Absorbs the former RPC-capability probe (KPD-20) — `eth_getBlockReceipts` availability is a matrix row, not a separate KPD.

### Indexing & Schema

- [x] **EVENT-01** — Event-schema spec for `IAgentRequester` lifecycle. Deliverable: `schemas/event_schema_v1.md` with full DDL (column names, polars/parquet dtypes, nullability). **Arrival-timing fields (`block_ts_utc`, `block_number`, `log_index` ordering, gap-detection metadata) are load-bearing, first-class, non-nullable** — the M2 arrival-process estimation consumes this inter-arrival series directly, so a dropped or mis-ordered event corrupts the inter-arrival distribution. The arrival series is **ordered on `(block_number, log_index)`** with `block_ts_utc` as a **coarse secondary** (Somnia ~72 ms/block; whole-second `block.timestamp` would otherwise scramble intra-second order — see HIGH-1). Subcommittee `Response[]` shape committed: child table `responses` with PK `(chain_id, tx_hash, log_index, member_index)` and FK `(chain_id, tx_hash) → requests`. Includes derived congestion-adjuster column with documented inference rule, the dedup key `(chain_id, tx_hash, log_index)`, and the intra-block ordering guarantee. Reserves `agent_class_keccak` + `agent_class_string` columns per KPD-18 (indexed-dynamic-field recovery).

- [ ] **TOPIC-01** — Resolve the three observed event topic0 hashes (`0x65db1ef5…`, `0x5c090ef4…`, `0xb6233992…`) to event signatures by keccak-matching against `IAgentRequester` NatSpec from `emrestay/somnia-agents-skills@e15d4e9`. Output: per-impl ABI resolver map `(implementation_address, topic0) → (signature, field_layout_hash)` committed to repo (NOT a single global map — see KPD-01). Unmatched topic0s quarantined to `unresolved_topics.parquet` per KPD-06; STATS-01 reports `pct_logs_unresolved` gated <1%.

- [ ] **IMPL-01** — Track proxy implementation transitions. Index `Upgraded(address)` events at the proxy (EIP-1967 topic0). Produce `impl_history.parquet` mapping `block_range → implementation_address`. PANEL-01 join: left-join on `block_number BETWEEN impl_first_seen_block AND impl_last_seen_block`. No-upgrade edge case handled per KPD-07: minimum one row from `[deployment_block, ∞)`. Pre-INDEX-01 beacon/diamond probe required per KPD-17.

- [ ] **INDEX-01** — Indexer deployed against the proxy address `0x5E5205CF…163E6`, **on the data source DATA-SOURCE-01 selects** (Ormi free tier if it cleared the sufficiency bar; the costed paid alternative otherwise). **Blocked by DATA-SOURCE-01 — not authored until the free-vs-paid verdict lands.** Owns subgraph authorship (`subgraphs/iagentrequester/`: schema.graphql, AssemblyScript mappings, networks.yaml for chain 5031) per KPD-08. Backfilled from contract deployment block (resolved in plan-phase from creator EOA `0x320362C7…fdE88936`) to present. Reconciliation against direct-RPC per KPD-04 (per-window parity, not random row sample); the parity mechanism is conditional on the DATA-SOURCE-01 capability-matrix `eth_getBlockReceipts` row.

- [ ] **SHARED-SCHEMA-01** — Joint-analysis schema, explicitly marked `v1-K_AI-anchored` with documented breakage budget when K_D ships. Two-table design: `schemas/abrigo_cost_panel_intersection_v1.md` (strict intersection columns) + `schemas/abrigo_cost_panel_k_ai_extensions_v1.md` (K_AI sidecar). Joint-analysis consumers in `abrigo-analytics` join on intersection PK.

### Cost Extraction

- [ ] **BYTECODE-01** — Recover the rebate equation by tiered fallback:
  - Tier-A (verified source): **unavailable** per scout.
  - Tier-B (decompilation via Heimdall + panoramix on the 18.5 KB impl at `0x9AF5…3EdD`): hard 1-day timebox. Success criterion is **±2% reproduction of Tier-C empirical residual on a holdout of ≥500 requests**, not "compiles cleanly" (PITFALLS D2: Heimdall's nested-mapping limitation produces plausible-looking but misindexed output).
  - Tier-C (primary, load-bearing): empirical residual `rebate_observed = msg.value − Σ_i min(executionCost_i, perAgentBudget) − gas_charged_to_caller`, with `gas_payment_bucket ∈ {caller, ops_reserve, mixed}` per row (KPD-02). STATS-01 reports inequality #7 binding per-bucket, never pooled.

- [ ] **GAS-01** — Per-block base-gas panel: `gas_used`, `effective_gas_price`, `base_fee_per_gas`, inferred congestion-adjuster state. Empirically verify whether the docs-quoted `$6.16e-10 USD/gas` floor binds (scout 2026-05-25T15:23Z observed `baseFeePerGas = 6 gwei`, suggesting non-binding in current window).

- [ ] **FX-01** — Off-chain SOMI/USDC time series:
  - Primary: CoinGecko hourly OHLCV; fallback: CoinMarketCap → Messari, with per-source adapter contract per KPD-05.
  - Join rule: LOCF, strictly `t_price < t_block_timestamp`; **subtract candle duration if CoinGecko timestamp is candle-CLOSE per KPD-19**.
  - Staleness: `fx_stale=true` if lag > 90 min; `fx_very_stale=true` if lag > 4 h; STATS-01 excludes `fx_very_stale` from headline numbers.
  - Per-row provenance: `fx_source`, `fx_source_ts_utc`, `fx_block_ts_utc`, `fx_lag_seconds`, `fx_fallback_used`, `fx_stale`, `fx_very_stale`.

### Output & Analysis

- [ ] **PANEL-01** — Materialized cost panel as Parquet, partitioned by `block_date` (Hive-style), zstd compression. Explicit `_schema_v1.json` artifact at partition root per KPD/PITFALLS-E1 (consumers MUST read schema artifact, not infer from data). Per-batch provenance manifest written alongside (schema spec'd via KPD-11 as `schemas/batch_manifest_v1.yaml`). Compaction + late-arrival policy per KPD-10. Schema version column.

- [ ] **STATS-01** — Descriptive-stats + inequality-region notes report at `somnia_cost_panel_M1.md`. Minimum-viable exit criteria:
  - ≥5,000 successful `RequestCreated` rows total — a non-binding floor well under the **~165k `RequestCreated`-event envelope** (`0.7 × 234,999 transactions`; `234,999` is a transaction count, not an event count, per the 2026-05-29 scout addendum). Clears the floor by ~30×.
  - Class-share floor: each agent class ≥1% AND ≥200 rows OR case-study mode per KPD-12; class-share histogram always published.
  - `pct_fx_populated_any ≥ 95%` (includes stale); `pct_fx_fresh ≥ 80%` (within 90 min).
  - For inequalities #1, #2, #4, #5, #6, #7 in `somnia_cost_extraction.md §6`: report `pct_binding`, `pct_slack`, slack distribution summary, per-`implementation_address` segmentation. Row #3 reported as "structurally validated by revert-absence; per-row N/A".
  - Includes long-run volume histogram per `block_date` per agent class per KPD-14, with the gap threshold set in **blocks** (matched to arrival density), not days.
  - **Arrival-periodicity precursor (feeds M2):** empirical inter-arrival series **ordered on `(block_number, log_index)`** + descriptive shape per agent class — inter-arrival summary, intensity-over-time, overdispersion indicator (`Var(N)/E[N]`, the Poisson-vs-Hawkes smell test), periodicity/seasonality. The series carries a per-interval **`gap_status ∈ {observed, indexer_gap_censored, source_gap}`** column; inter-arrival times spanning a known gap are flagged and **excluded / right-censored from the `Var(N)/E[N]` computation** so M2 does not read a gap as a quiescent period. Gap detection uses KPD-14's **block-count-based** threshold (a "≥7 day" rule is far too coarse for a ~1.2M-blocks/day chain — a multi-hour gap is already millions of missing blocks). Descriptive only — no NHPP/Hawkes fit, no convex-demand verdict (those are M2) — but hands M2 a gap-audited arrival series with the dispersion signal pre-computed.
  - Consumer contract: M2 (arrival-process estimation + convex-demand verdict). Acceptance test: `tests/test_panel_ingest_contract.py` (KPD-13) must load PANEL-01 + the arrival series via the documented schema and compute mean `gross_cost_usd` per agent class without further reshape.

## v2 Requirements

Deferred to future milestones — tracked but not in M1 scope. These map to the "Out of Scope" section of PROJECT.md; here they are recorded as forward-looking commitments rather than permanent exclusions.

### Modeling (M2 — Arrival-Process Estimation + Convex-Demand Verdict)

- **MODEL-01** — Arrival-process estimation on the M1 arrival series: fit NHPP (Kirchner INAR(p)) vs multivariate Hawkes per agent class; selection driven by M1 STATS-01 dispersion findings, not pre-committed.
- **MODEL-02** — Four-condition convex-dominance verdict on the SOMI/USD cost cashflow + joint K_D + K_AI cost-model estimation in `abrigo-analytics`, consuming PANEL-01 + the M1 arrival series + the (future) `abrigo-x402` K_D panel.

### Contracts (later milestone)

- **CONTRACT-01** — Solidity wrappers over `IAgentRequester` for the three agent classes, deployed on Somnia mainnet.
- **CONTRACT-02** — On-chain SOMI/USD oracle adapter (when a native feed ships or this leg's contracts need it).

### Cross-Chain (later milestone)

- **BRIDGE-01** — Reactive Network event-driven bridge linking Celo (`abrigo-x402`, K_D) settlements to Somnia (`abrigo-somnia`, K_AI) for joint Abrigo positions.

### UX (later milestone)

- **UX-01** — Agent-driven UX surface from Somnia agent layer to Abrigo (the open question from `SOMNIA_DRAFT §OPEN`).

### Deliverable Polish (later milestone)

- **PAPER-01** — LaTeX methods-paper section integrating M1 cost panel + M2 arrival-process estimation + convex-demand verdict + identification discussion.

## Out of Scope

Explicit exclusions from M1. Full reasoning in `PROJECT.md → Out of Scope`. Recorded here for traceability:

| Feature | Reason (one-line; see PROJECT.md for full) |
|---|---|
| Arrival-process estimation (NHPP/Hawkes fit) | Functional form depends on M1 empirical dispersion findings — deferred to M2 |
| Convex-demand verdict (four-condition convex-dominance check) | Requires the fitted arrival process — deferred to M2 |
| LaTeX paper section | Needs both M1 panel + M2 estimation |
| Solidity wrappers / on-chain settlement | Caller-side cost extraction only in M1 |
| Reactive Network bridge | Both legs need stable panels first |
| Agent-driven UX | Empirical foundation first; UX informed by what data reveals |
| On-chain SOMI/USD oracle adapter | No native feed exists; off-chain sufficient for M1 |
| Convex perpetual (Panoptic) hedging | Composite (M3+) concern; gated on both legs demonstrating convex-hedge demand |
| Validator-side modeling (inequalities #8, #9, #10) | Not caller-observable |
| Inequality #3 per-row binding analysis | `operator_configured_max` not caller-observable from NatSpec; validated by revert-absence only — see KPD-15 for optional STORAGE-01 recovery path |

## Traceability

Populated by the roadmapper on 2026-05-25 from `.planning/ROADMAP.md`; updated 2026-05-29 to add DATA-SOURCE-01. Each v1 requirement maps to exactly one phase. Unmapped v1 requirements = roadmap gap.

| Requirement | Phase | Status |
|---|---|---|
| DATA-SOURCE-01 | Phase 1: Data-Sourcing Gate, Pre-flight Addendum & Schema Foundations | In Progress (01-01 KPD-16/startBlock done; matrix + verdict in 01-03/01-04) |
| EVENT-01 | Phase 1: Data-Sourcing Gate, Pre-flight Addendum & Schema Foundations | Complete |
| SHARED-SCHEMA-01 | Phase 1: Data-Sourcing Gate, Pre-flight Addendum & Schema Foundations | Pending |
| TOPIC-01 | Phase 2: Topic & Implementation Provenance | Pending |
| IMPL-01 | Phase 2: Topic & Implementation Provenance | Pending |
| INDEX-01 | Phase 3: Subgraph Indexing (blocked by DATA-SOURCE-01) | Pending |
| BYTECODE-01 | Phase 4: Parallel Cost Inputs (4a-pre + 4a-validate, split across Phase 3 boundary) | Pending |
| GAS-01 | Phase 4: Parallel Cost Inputs (4b) | Pending |
| FX-01 | Phase 4: Parallel Cost Inputs (4c) | Pending |
| PANEL-01 | Phase 5: Panel Materialization | Pending |
| STATS-01 | Phase 6: Statistics, Arrival-Periodicity Precursor & M2 Ingest Contract | Pending |

**Coverage:**
- v1 requirements: 11 total
- Mapped to phases: 11 ✓
- Unmapped: 0
- Distinct phases used: 6 / 6 (every phase carries ≥ 1 v1 requirement)

---
*Requirements defined: 2026-05-25 (derived from PROJECT.md @ `28e1d54`)*
*Last updated: 2026-05-29 #3 — scout-addendum fold-in: `234,999` re-labelled as the transaction-coverage anchor (NOT an event bound); DATA-SOURCE-01 bar (a) switched from block-presence to distinct-tx-coverage + scout structural event-ratio conformance (total ≈ 2.15 × txs; topic0s 1:1:1; `RequestCreated` ≈ 0.7 × txs ≈ ~165k); binding gate = three-leg (tx-anchor + structural-ratio + contiguity proof, the last completeness-bearing only with the tx-anchor); deep-history retention probe split from throttle probe; subgraph-compatible paid swap; STATS-01 ~165k event envelope. Coverage 11/11; all prior fixes intact.*
*Last updated: 2026-05-29 #2 — DATA-SOURCE-01 rigor hardening (Reality Checker + Data Engineer NEEDS WORK): corrected timing to native ~72 ms/block cadence + whole-second `block.timestamp` handling with `(block_number, log_index)` arrival-ordering key (HIGH-1); reframed verdict as PROVISIONAL source selection with four numeric sufficiency bars + Phase-3 contiguity-proof + Blockscout count-anchor binding completeness gate (HIGH-2/3); added Ormi free-tier probe rows + pre-costed-paid framing (HIGH-4); machine-checkable `data_sourcing_matrix.yaml`; STATS-01 arrival series gains `gap_status` column + `Var(N)/E[N]` gap-censoring + block-count-based KPD-14 gap threshold. Prior 2026-05-29 #1 — added DATA-SOURCE-01 + arrival-periodicity sharpening; M1→M2 = arrival-process estimation + convex-demand verdict. Coverage 11/11.*
