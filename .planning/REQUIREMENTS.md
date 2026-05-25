# Requirements: abrigo-somnia M1 — Empirical Somnia Cost Panel

**Defined:** 2026-05-25
**Core Value (from PROJECT.md):** Which of the caller-side inequalities in `somnia_cost_extraction.md §6` (rows #1, #2, #4, #5, #6, #7) bind empirically, where are they slack, and what is the realized `executionCost_i` distribution per agent class versus the docs-quoted `{0.03, 0.07, 0.10}` SOMI prices — across all observed proxy implementation versions?

**Provenance:** This document is a derived artifact of `.planning/PROJECT.md` (committed at `28e1d54` after pre-flight scout + two reviewer-pipeline iterations + PITFALLS research). Requirement IDs match PROJECT.md verbatim — semantic prefixes are retained rather than re-categorized into `IDX-NN` form because they are already established and externally referenced (e.g. `BYTECODE-01` is named in `somnia_cost_extraction.md §7-Q3`). Out-of-scope exclusions and Known Plan-Phase Decisions live in PROJECT.md and are not duplicated here.

## v1 Requirements

### Indexing & Schema

- [ ] **EVENT-01** — Event-schema spec for `IAgentRequester` lifecycle. Deliverable: `schemas/event_schema_v1.md` with full DDL (column names, polars/parquet dtypes, nullability). Subcommittee `Response[]` shape committed: child table `responses` with PK `(chain_id, tx_hash, log_index, member_index)` and FK `(chain_id, tx_hash) → requests`. Includes derived congestion-adjuster column with documented inference rule. Reserves `agent_class_keccak` + `agent_class_string` columns per KPD-18 (indexed-dynamic-field recovery).

- [ ] **TOPIC-01** — Resolve the three observed event topic0 hashes (`0x65db1ef5…`, `0x5c090ef4…`, `0xb6233992…`) to event signatures by keccak-matching against `IAgentRequester` NatSpec from `emrestay/somnia-agents-skills@e15d4e9`. Output: per-impl ABI resolver map `(implementation_address, topic0) → (signature, field_layout_hash)` committed to repo (NOT a single global map — see KPD-01). Unmatched topic0s quarantined to `unresolved_topics.parquet` per KPD-06; STATS-01 reports `pct_logs_unresolved` gated <1%.

- [ ] **IMPL-01** — Track proxy implementation transitions. Index `Upgraded(address)` events at the proxy (EIP-1967 topic0). Produce `impl_history.parquet` mapping `block_range → implementation_address`. PANEL-01 join: left-join on `block_number BETWEEN impl_first_seen_block AND impl_last_seen_block`. No-upgrade edge case handled per KPD-07: minimum one row from `[deployment_block, ∞)`. Pre-INDEX-01 beacon/diamond probe required per KPD-17.

- [ ] **INDEX-01** — Ormi subgraph deployed against the proxy address `0x5E5205CF…163E6`. Owns subgraph authorship (`subgraphs/iagentrequester/`: schema.graphql, AssemblyScript mappings, networks.yaml for chain 5031) per KPD-08. Backfilled from contract deployment block (resolved in plan-phase from creator EOA `0x320362C7…fdE88936`) to present. Reconciliation against direct-RPC per KPD-04 (per-window parity, not random row sample).

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
  - ≥5,000 successful `RequestCreated` rows total.
  - Class-share floor: each agent class ≥1% AND ≥200 rows OR case-study mode per KPD-12; class-share histogram always published.
  - `pct_fx_populated_any ≥ 95%` (includes stale); `pct_fx_fresh ≥ 80%` (within 90 min).
  - For inequalities #1, #2, #4, #5, #6, #7 in `somnia_cost_extraction.md §6`: report `pct_binding`, `pct_slack`, slack distribution summary, per-`implementation_address` segmentation. Row #3 reported as "structurally validated by revert-absence; per-row N/A".
  - Includes long-run volume histogram per `block_date` per agent class per KPD-14.
  - Consumer contract: M2 parametric-fit milestone. Acceptance test: `tests/test_panel_ingest_contract.py` (KPD-13) must load PANEL-01 via the documented schema and compute mean `gross_cost_usd` per agent class without further reshape.

## v2 Requirements

Deferred to future milestones — tracked but not in M1 scope. These map to the "Out of Scope" section of PROJECT.md; here they are recorded as forward-looking commitments rather than permanent exclusions.

### Modeling (M2 — Parametric Cost Fit)

- **MODEL-01** — Parametric fit of `executionCost_i` distribution per agent class (candidate forms: lognormal, mixture, Hawkes; selection driven by M1 STATS-01 findings, not pre-committed).
- **MODEL-02** — Joint K_D + K_AI cost-model estimation in `abrigo-analytics`, consuming PANEL-01 + the (future) `abrigo-x402` K_D panel.

### Contracts (later milestone)

- **CONTRACT-01** — Solidity wrappers over `IAgentRequester` for the three agent classes, deployed on Somnia mainnet.
- **CONTRACT-02** — On-chain SOMI/USD oracle adapter (when a native feed ships or this leg's contracts need it).

### Cross-Chain (later milestone)

- **BRIDGE-01** — Reactive Network event-driven bridge linking Celo (`abrigo-x402`, K_D) settlements to Somnia (`abrigo-somnia`, K_AI) for joint Abrigo positions.

### UX (later milestone)

- **UX-01** — Agent-driven UX surface from Somnia agent layer to Abrigo (the open question from `SOMNIA_DRAFT §OPEN`).

### Deliverable Polish (later milestone)

- **PAPER-01** — LaTeX methods-paper section integrating M1 cost panel + M2 parametric fit + identification discussion.

## Out of Scope

Explicit exclusions from M1. Full reasoning in `PROJECT.md → Out of Scope`. Recorded here for traceability:

| Feature | Reason (one-line; see PROJECT.md for full) |
|---|---|
| Parametric cost-function fit | Functional form depends on M1 empirical findings |
| LaTeX paper section | Needs both M1 panel + M2 fit |
| Solidity wrappers / on-chain settlement | Caller-side cost extraction only in M1 |
| Reactive Network bridge | Both legs need stable panels first |
| Agent-driven UX | Empirical foundation first; UX informed by what data reveals |
| On-chain SOMI/USD oracle adapter | No native feed exists; off-chain sufficient for M1 |
| Convex perpetual (Panoptic) hedging | Analytics-side concern, not cost-extraction |
| Validator-side modeling (inequalities #8, #9, #10) | Not caller-observable |
| Inequality #3 per-row binding analysis | `operator_configured_max` not caller-observable from NatSpec; validated by revert-absence only — see KPD-15 for optional STORAGE-01 recovery path |

## Traceability

Empty until roadmap creation. The roadmapper populates this table mapping each v1 requirement to exactly one phase. Unmapped v1 requirements = roadmap gap.

| Requirement | Phase | Status |
|---|---|---|
| EVENT-01 | TBD | Pending |
| TOPIC-01 | TBD | Pending |
| IMPL-01 | TBD | Pending |
| INDEX-01 | TBD | Pending |
| SHARED-SCHEMA-01 | TBD | Pending |
| BYTECODE-01 | TBD | Pending |
| GAS-01 | TBD | Pending |
| FX-01 | TBD | Pending |
| PANEL-01 | TBD | Pending |
| STATS-01 | TBD | Pending |

**Coverage:**
- v1 requirements: 10 total
- Mapped to phases: 0 (pending roadmap)
- Unmapped: 10 ⚠️ (pre-roadmap state)

---
*Requirements defined: 2026-05-25 (derived from PROJECT.md @ `28e1d54`)*
*Last updated: 2026-05-25 after initial extraction*
