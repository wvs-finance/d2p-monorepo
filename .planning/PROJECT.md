# abrigo-somnia: Empirical Somnia Cost Panel (M1)

## What This Is

The `K_AI` (agent-payment) leg substrate of the Abrigo cost model. M1 produces a **reliable empirical cost panel** for the Somnia agent-payment leg: an indexer over the `IAgentRequester` proxy on Somnia mainnet (proxy `0x5E5205CF…163E6` → impl `0x9AF5…3EdD`, EIP-1967), joined with base-gas telemetry and an off-chain SOMI/USDC cross-rate, materialized as a per-request Parquet dataset. Downstream milestones (parametric fit, contracts, Reactive bridge, agent UX) consume this panel — explicitly out of scope here.

## Core Value

**Which of the caller-side inequalities in `somnia_cost_extraction.md §6` (rows #1, #2, #4, #5, #6, #7) bind empirically, where are they slack, and what is the realized `executionCost_i` distribution per agent class versus the docs-quoted `{0.03, 0.07, 0.10}` SOMI prices — across all observed proxy implementation versions?**

Scope notes:
- **Validator-side rows (#8, #9, #10) are out of scope** — not caller-observable.
- **Row #3 (`subcommitteeSize ≤ operator_configured_max`) is excluded from per-row binding analysis** — `operator_configured_max` lives in impl storage with no exposed getter in the e15d4e9 NatSpec. #3 is validated structurally by the *absence* of `SubcommitteeSizeExceedsMax` reverts in the indexed window; per-row `pct_binding` is N/A. A future plan-phase decision (see STORAGE-01 in Known Plan-Phase Decisions) may recover the cap via storage probe if the slot can be identified — but M1 does not block on it.

## Pre-flight Scout (2026-05-25, completed)

Findings that constrain the rest of this plan:

| Finding | Source | Implication |
|---|---|---|
| `IAgentRequester` at `0x5E5205CF39E766118C01636bED000A54D93163E6` is an **EIP-1967 upgradeable proxy** (`proxy_type: "eip1967"` per Blockscout). Implementation: `0x9AF59C5683bb8686596B0D56e4F67655C6B73EdD` (18,507 bytes, Solidity 0.8.28). | `eth_getStorageAt` slot `0x36089…2bbc` + Blockscout v2 `/addresses` | Schema must carry `implementation_address` + `impl_first_seen_block` per row; impl is mutable across observations |
| **Neither proxy nor impl is source-verified** on Somnia Blockscout. | Blockscout `api?module=contract&action=getsourcecode` returns only address field for both | BYTECODE-01 Tier-A (verified source) is unavailable; Tier-C (empirical residual) becomes the primary path |
| **234,999 transactions** at the proxy as of head block 316,099,291 (2026-05-25T15:23Z); active today (latest log 2026-05-25T15:24:06Z) with 3 distinct event topic0 hashes dominating the latest 50 logs. | Blockscout v2 `/addresses/{addr}/counters` and `/logs` | Volume is decisive — STATS-01 distributional framing is statistically viable |
| Subgraph indexing IS supported on Somnia via **Ormi** (`subgraph.somnia.network`) and **Protofire**. | Somnia docs (`docs.somnia.network/developer/partners/...`) | INDEX-01 primary path is Ormi subgraph; direct-RPC is at most a cross-validation channel |
| **Public RPC caps `eth_getLogs` at 1000 blocks/call.** 9-month backfill ≈ 1.2M blocks/day × 270 days ≈ 320M blocks → ~320K RPC calls if direct. | `api.infra.mainnet.somnia.network` returned `block range exceeds 1000` | Direct-RPC backfill is infeasible; Ormi is mandatory |
| Somnia finality is sub-second; ~20ms consensus tick; MultiStream PBFT — deterministic finality on the consensus chain. | Somnia docs + Messari report | `safe_block_depth = 1` is sufficient |

All cited source URLs + fetch timestamps go into PANEL-01's per-batch provenance manifest (defined in EVENT-01).

## Requirements

### Validated

(None yet — ship to validate)

### Active (M1)

- [ ] **EVENT-01** — Event-schema spec for the `IAgentRequester` lifecycle, delivered as `schemas/event_schema_v1.md` (full DDL — column names, polars/parquet dtypes, nullability — committed in plan-phase). Must explicitly enumerate column list including: (a) every field decoded from `RequestCreated`, `ResponseReceived`, `NativeTransferFailed`, and any happy-path rebate event; (b) per-receipt fields (`gas_used`, `effective_gas_price`, `status`); (c) per-block fields (`base_fee_per_gas`, `timestamp`, `block_number`); (d) derived congestion-adjuster state column + documented inference rule; (e) the subcommittee `Response[]` array — **committed shape: child table `responses` with PK `(chain_id, tx_hash, log_index, member_index)` and FK `(chain_id, tx_hash) → requests`** (not a nested struct column). Includes the deduplication key (`(chain_id, tx_hash, log_index)`) and the implementation-version provenance contract.
- [ ] **TOPIC-01** — Resolve the three observed event topic0 hashes (`0x65db1ef5…66af2`, `0x5c090ef4…7a2cf`, `0xb6233992…26889`) to event signatures by keccak-matching against `IAgentRequester` NatSpec from `emrestay/somnia-agents-skills@e15d4e9`. Output: a topic0 → signature map committed to repo.
- [ ] **BYTECODE-01** — Recover the rebate equation by tiered fallback:
  - Tier-A: verified source on Somnia explorer — **UNAVAILABLE** (scout confirmed).
  - Tier-B: decompilation of the 18.5 KB impl at `0x9AF5…3EdD` via Heimdall and panoramix; hard timebox 1 day. **Success criterion is NOT "compiles cleanly"** — Heimdall has known nested-mapping limitations (issue #269) that produce uncompilable-but-plausible-looking output on `mapping(requestId => Request{Response[]})`-shaped state, which is exactly the rebate-path shape. Tier-B is considered successful only if the recovered rebate function reproduces Tier-C's empirical residual within **±2% on a holdout sample** of ≥500 requests; otherwise Tier-B is marked inconclusive and Tier-C remains primary.
  - Tier-C (primary): **empirical residual** — for each request, compute `rebate_observed = msg.value − Σ_i min(executionCost_i, perAgentBudget) − gas_charged_to_caller`, flag the row with `rebate_method = 'empirical_residual'`, and surface the residual distribution per agent class. M1 ships PANEL-01 + STATS-01 on Tier-C regardless of Tier-B outcome.
- [ ] **IMPL-01** — Track proxy implementation transitions. Index `Upgraded(address)` events at the proxy (EIP-1967 standard event topic0 `0xbc7cd75…`); produce a small `impl_history.parquet` mapping `block_range → implementation_address`. Joins to PANEL-01 by block.
- [ ] **INDEX-01** — Ormi subgraph deployed against the proxy address. Backfilled from contract deployment block (TBD via creator-EOA `0x320362C7…fdE88936` earliest tx — resolved in plan-phase) to present. Supports incremental refresh via Ormi's hosted Graph Node. Direct-RPC sanity-check sampled at 0.1% of blocks for cross-validation.
- [ ] **GAS-01** — Per-block base-gas panel: `gas_used`, `effective_gas_price`, `base_fee_per_gas`, inferred congestion-adjuster state. Confirm whether the docs-quoted `$6.16e-10 USD/gas` floor binds in practice (scout observation 2026-05-25T15:23Z: `baseFeePerGas = 6 gwei`, well above the floor — likely non-binding in M1's window, but verify empirically).
- [ ] **FX-01** — Off-chain SOMI/USDC time series. Specification:
  - Primary source: CoinGecko hourly OHLCV; fallback order: CoinMarketCap → Messari.
  - Join rule: **last-observation-carried-forward**, strictly `t_price < t_block_timestamp` (no look-ahead).
  - Stale threshold: row flagged with `fx_stale = true` if `block_ts − fx_ts > 4 hours`; not silently averaged.
  - Per-row provenance columns: `fx_source`, `fx_source_ts_utc`, `fx_block_ts_utc`, `fx_lag_seconds`, `fx_fallback_used`.
  - Whole FX series cached locally with snapshot hash, so downstream stats are reproducible from panel + cache.
- [ ] **PANEL-01** — Materialized cost panel as Parquet, partitioned by `block_date` (Hive-style), zstd compression. Explicit shared-key schema (see SHARED-SCHEMA-01) so a future `K_D` panel from `abrigo-x402` can join 1:1 without reshape. Schema version column. Per-batch provenance manifest written alongside (run-id, rpc/subgraph endpoint, indexer commit sha, from_block, to_block, observed impl_address, event-topic filters). **Explicit JSON-schema artifact at partition root** (`_schema_v1.json`) — required because `polars.scan_parquet` schema-inference from a single file silently drops null-type columns; early-window partitions with no `Upgraded` event would otherwise infer `implementation_address` as null-type and break later partitions. Consumers must read the schema artifact, not infer from data.
- [ ] **SHARED-SCHEMA-01** — Define the joint-analysis schema in this repo, **explicitly marked `v1-K_AI-anchored` with a documented breakage budget when `abrigo-x402` builds its K_D panel** (since K_D has no panel yet, true K_D field requirements are unknown). Two-table design:
  - **`schemas/abrigo_cost_panel_intersection_v1.md`** — strict intersection columns expected to survive K_D arrival: `request_id`, `tx_hash`, `block_number`, `block_ts_utc`, `chain_id`, `gross_cost_native`, `gross_cost_usd`, `net_cost_usd`, `fx_rate`, `fx_source_ts_utc`, `schema_version`.
  - **`schemas/abrigo_cost_panel_k_ai_extensions_v1.md`** — K_AI-only sidecar columns joined by `(chain_id, tx_hash)`: `agent_class`, `implementation_address`, `request_id_kai`, `subcommittee_size`, `per_agent_budget_native`, etc.
  - **Breakage policy**: when K_D ships, the intersection schema may bump to v2 if K_D introduces a column genuinely shared by both legs; the K_AI extension table version is independent and unaffected. Joint-analysis consumers in `abrigo-analytics` join on the intersection PK.
- [ ] **STATS-01** — Descriptive-stats + inequality-region notes report. Minimum-viable exit criteria:
  - PANEL-01 has ≥ 5,000 successful `RequestCreated` rows total across the indexed window (well under N=234,999 envelope — non-binding floor).
  - **Class-share floor**: each of the three agent classes has either ≥ 1% of indexed `RequestCreated` rows AND ≥ 200 rows in absolute terms, OR the report explicitly degrades to case-study mode for that class (see the Known Plan-Phase Decisions entry that pins the case-study deliverable shape). The class-share histogram is always published, even when the floor passes.
  - **End-to-end FX coverage**: `pct_fx_populated_any ≥ 95%` (includes `fx_stale=true` rows), AND `pct_fx_fresh ≥ 80%` (rows with FX bar published within 90 minutes of block timestamp).
  - For each of inequalities #1, #2, #4, #5, #6, #7 in `somnia_cost_extraction.md §6`: report `pct_binding`, `pct_slack`, slack distribution summary, and whether the inequality binds for at least one observed `implementation_address`. (Row #3 is reported as "structurally validated by revert-absence; per-row N/A" per the Core Value scope note.)
  - Output filename: `somnia_cost_panel_M1.md`. Consumer: M2 parametric-fit milestone (acceptance test: M2 must ingest PANEL-01 + STATS-01 with no further reshaping or off-panel data fetches).

### Out of Scope (this milestone)

- Parametric cost-function fit — deferred to M2
- LaTeX methods-paper section — deferred to deliverable-polish milestone
- Solidity wrappers over `IAgentRequester` — deferred to a contracts milestone
- Reactive Network bridge to `abrigo-x402` — deferred to a bridge milestone
- Agent-driven UX surface — deferred to a UX milestone
- On-chain SOMI/USD oracle adapter — deferred until either a native feed ships or contracts milestone requires it
- Convex perpetual (Panoptic) hedging execution — analytics-side concern
- Validator-side modeling and inequalities #8/#9/#10 — out of scope for caller-side extraction

## Inherited Open Questions

From `abrigo-analytics/notes/somnia_cost_extraction.md §7`:

| Q# | Closure status in M1 |
|---|---|
| #1 (`{30,70,10}` denominator reconciliation) | **Closed by deferral** — M1 uses canonical absolute prices `{0.03, 0.07, 0.10}` SOMI throughout; `{30,70,10}` is treated as a draft artifact |
| #2 (no agent-fee effective-date metadata) | **Mitigated** — every PANEL-01 batch records the fetch timestamp of the agent-fee schedule; per-row `implementation_address` lets M2 detect price-schedule shifts |
| #3 (rebate equation lives in bytecode) | **Addressed via BYTECODE-01 Tier-C** (empirical residual) — closed-form still open if Tier-B fails |
| #4 (slashing rates undocumented) | **Out of scope** (validator-side) |
| #5 (treasury validator-incentive equation undocumented) | **Out of scope** |
| #6 (10% validator-emission cap unverified on docs) | **Out of scope** |
| #7 (no on-chain SOMI/USD oracle) | **Inherited limitation** — FX-01 sources off-chain with documented identification weakness |
| #8 (URL drift on docs.somnia.network) | **Mitigated** — every external fetch records source URL + UTC timestamp per batch manifest |

## Context

- **`abrigo-analytics/notes/somnia_cost_extraction.md`** is the docs-side baseline (10-inequality table in §6, 8 open questions in §7). This milestone is the empirical-side complement.
- **`abrigo-x402`** is the parallel `K_D` (Celo) leg. Its analogue `x402_cost_extraction.md` is docs-only — no row-level dataset exists there yet. M1 therefore **owns** the shared schema definition (SHARED-SCHEMA-01) which `abrigo-x402` will mirror when its panel is built.
- The IAgentRequester reference interface (`emrestay/somnia-agents-skills`, commit `e15d4e9`) confirms a `NativeTransferFailed` event + a `Request.remainingBudget` field. Other event signatures must come from TOPIC-01's keccak match against NatSpec.
- Somnia agent-fee schedule is explicitly labelled **"stop-gap"** with no effective-date metadata. Snapshot the page per batch.
- Scout date: **2026-05-25**. Head block at scout: 316,099,291. TGE: 2025-09-02.

## Constraints

- **EVM read-only**: no deployment in M1. BYTECODE-01 Tier-B uses Heimdall and panoramix offline; failure is acceptable as long as Tier-C ships.
- **Indexer**: **Ormi subgraph as primary** (scout-confirmed Somnia mainnet support). Direct-RPC sanity-check at low sample rate. Subsquid / Ponder support for chain 5031 is **not confirmed by the scout** — not pursued in M1.
- **Reorg handling**: `safe_block_depth = 1` (Somnia consensus chain finality is deterministic + sub-second; document this in EVENT-01 alongside the consensus-doc source URL + fetch ts).
- **Analysis stack**: Python with `polars`/`pandas`, consistent with `abrigo-analytics`' `uv`-managed env.
- **Provenance discipline**: two-tier — (a) per-row for FX columns; (b) per-batch manifest joined by `_indexer_run_id` for chain events. Snapshot the agent-fee docs page + canonical interface file per batch.
- **Cross-rate identification weakness**: no native SOMI/USD on-chain oracle as of scout date. CoinGecko hourly with LOCF join + per-row staleness flags is the M1 fix; honest about its limits in STATS-01.
- **Implementation-version provenance**: every row carries `implementation_address`; an `Upgraded` event mid-window splits the panel by impl segment.
- **Git workflow**: fork/upstream — push to `JMSBPP/abrigo-somnia` (origin); PRs target `wvs-finance/abrigo-somnia:master` (upstream).

## Known Plan-Phase Decisions

The planning-review pipeline (Reality Checker + Data Engineer, two iterations) surfaced the following decisions that belong in `/gsd:plan-phase` rather than this project-scope document. Each is recorded here as a non-trivial decision the relevant phase plan **must** resolve before execution starts — they are not free-text TODOs, they are scoped technical commitments.

| # | Pending decision | Owning requirement | Constraint M1 has already committed to |
|---|---|---|---|
| KPD-01 | Per-impl ABI resolver vs. global topic0 map | TOPIC-01 + IMPL-01 | Resolver shape must be `(implementation_address, topic0) → (signature, field_layout_hash)`. A single global map is forbidden because IMPL-01 segments the panel by impl and same-name events across impls may have reordered fields. Unmatched `(impl, topic0)` pairs are quarantined with `decode_status = 'unresolved_abi'`, never silently typed as e15d4e9 schema. |
| KPD-02 | `gas_payment_bucket` inference rule for BYTECODE-01 Tier-C residual | BYTECODE-01 | Each row must carry `gas_payment_bucket ∈ {caller, ops_reserve, mixed}`. Tier-C residual is reported as two columns (`gross_residual`, `net_of_evm_gas_residual`). STATS-01 reports `pct_binding` for inequality #7 **per bucket, never pooled**. Inference rule (likely from `tx.from == msg.sender` + proxy balance-delta accounting) is plan-phase. |
| KPD-03 | EVENT-01 full DDL committed as `schemas/event_schema_v1.md` | EVENT-01 | Subcommittee `Response[]` shape is locked: child table `responses` with PK `(chain_id, tx_hash, log_index, member_index)`. Remaining column names and polars/parquet dtypes are plan-phase deliverable. |
| KPD-04 | Ormi vs. direct-RPC reconciliation protocol | INDEX-01 | Replace "0.1% sample" with structured per-window parity: bucket the indexed range into ≈1000 contiguous block windows; per `(window, topic0)` compare Ormi count to direct-RPC `eth_getLogs` count; fail the batch if any window's parity is off by >0.5% OR if any window has Ormi=0 ∧ RPC>0. Failure action: quarantine affected windows, escalate. |
| KPD-05 | FX-01 fallback adapter contract | FX-01 | Per-source adapter table `(base_url, auth_env_var, rate_limit_per_min, timeout_ms, max_retries)`. Local SQLite cache with snapshot hash. CMC/Messari adapters wired before milestone close, not deferred. `fx_stale` flag tightened to >90 min; `fx_very_stale` flag at >4 h; STATS-01 excludes `fx_very_stale` from headline numbers. |
| KPD-06 | TOPIC-01 unmatched-topic0 contingency | TOPIC-01 | Unresolved topic0s go to `unresolved_topics.parquet` with `(topic0, first_seen_block, first_seen_tx, observed_count, raw_data_sample)`. Escalation order: prior commits of `emrestay/somnia-agents-skills`, newer Somnia DevRel repos, 4byte.directory, decompiled event tables from Tier-B. STATS-01 reports `pct_logs_unresolved`; gated at <1% for M1 ship. Sample logs across the full window, not just latest-50. |
| KPD-07 | IMPL-01 no-upgrade edge case + post-upgrade re-run gates | IMPL-01 | `impl_history.parquet` is always written, minimum one row covering `[deployment_block, ∞)`. PANEL-01 join is left-join on `block_number BETWEEN impl_first_seen_block AND impl_last_seen_block`. If an `Upgraded` event is observed mid-window, TOPIC-01 and BYTECODE-01 Tier-B/C re-run against the new impl before STATS-01 is valid for blocks ≥ upgrade block; STATS-01 reports distributions per-impl-segment. |
| KPD-08 | Ormi subgraph authorship is in scope | INDEX-01 | M1 owns `subgraphs/iagentrequester/` (schema.graphql aligned to EVENT-01, AssemblyScript mappings per resolved topic0, `networks.yaml` pinning chain 5031 + proxy). Ormi is a hosting platform, not a black-box service. |
| KPD-09 | `safe_block_depth = 1` validation against Somnia data-chain dynamics | EVENT-01 / Constraints | Before adoption: confirm via docs or empirical poll whether `eth_blockNumber` returns consensus-finalized or data-chain-tentative heights. If the latter, raise `safe_block_depth` to an empirically-measured max rollback depth over a 1-hour observation window. |
| KPD-10 | PANEL-01 compaction + late-arrival policy | PANEL-01 | Partitions older than T days compacted weekly to row-group-targeted files. Incremental writes go to `_staging` sub-partition; promotion step merges with dedupe on `(chain_id, tx_hash, log_index)` and asserts `max_indexed_block - partition_max_block ≥ safe_block_depth`. |
| KPD-11 | Batch manifest schema | PANEL-01 | Committed as `schemas/batch_manifest_v1.yaml` with explicit field names + types + JSON-schema validator invoked at write-time. Required fields include `fx_cache_sha256`, `topic0_map_sha256`, `impl_history_sha256` so consumers pin to an exact panel snapshot. |
| KPD-12 | STATS-01 case-study mode deliverable shape | STATS-01 | When a class triggers degradation: (i) full row dump as `case_studies/<agent_class>_observations.parquet`; (ii) manifest `case_studies/<agent_class>_manifest.yaml` with `n_observations`, `window_start`, `window_end`, `inequalities_unverifiable`, `recommended_action`; (iii) STATS-01 markdown marks the class as `pct_binding = N/A (case-study, n=<N>)`, never a low-power point estimate. |
| KPD-13 | M2-ingest acceptance test in M1 | STATS-01 | Concrete deliverable: `tests/test_panel_ingest_contract.py` that loads PANEL-01 via the documented schema and computes mean `gross_cost_usd` per `agent_class`. Validates the schema is loadable and gives M2 a runnable contract to extend. |
| KPD-14 | Long-run volume distribution check | STATS-01 | Histogram of `RequestCreated` count per `block_date` over the full indexed window; STATS-01 reports min/median/max daily rate per agent class; flags continuous gaps > 7 days. Validates the scout's "active today" finding generalizes to the full window. |
| KPD-15 | Optional STORAGE-01 (operator-cap recovery) | (new, optional) | If the impl's storage slot for `operatorConfiguredMax` can be identified (via Tier-B decompilation or storage-pattern probing), recover it via `eth_getStorageAt` and re-elevate inequality #3 to per-row binding analysis. Not blocking — M1 ships with #3 as revert-absence-validated. |
| KPD-16 | Scout provenance archive | Pre-flight Scout | Move scout raw responses (or sha256 hashes) to `.planning/scout/2026-05-25/` with relative paths from the Pre-flight Scout table. Adheres to the same per-batch manifest standard M1 imposes on PANEL-01. |
| KPD-17 | Beacon-slot + diamond-cut probe on the impl (PITFALLS A3) | IMPL-01 | The scout confirmed the EIP-1967 `IMPLEMENTATION_SLOT` on the proxy but did **not** probe whether the impl `0x9AF5…3EdD` is itself a beacon proxy or a diamond. If beacon, real logic can change without an `Upgraded` event at the proxy — IMPL-01 would silently miss the transition. **Required pre-INDEX-01 probe**: read `BEACON_SLOT` (keccak256('eip1967.proxy.beacon')-1 = `0xa3f0…3d50`) on `0x9AF5…3EdD`; probe diamond standard storage (EIP-2535 facet table) at common slots. If either is non-empty, expand IMPL-01 to track beacon/diamond facet transitions instead of only the proxy slot. |
| KPD-18 | Indexed-dynamic-type event field enumeration (PITFALLS B1) | TOPIC-01 + EVENT-01 | EVM logs hash all indexed-dynamic fields (string, bytes, dynamic arrays) — `string indexed agentClass` returns `keccak256(agentClass)` not the string itself (graph-node #731/#913, longest-standing limitation). **Required during TOPIC-01**: enumerate every indexed-dynamic field in the resolved ABI for each impl. For each, decide whether to (a) precompute a `keccak → original` lookup from a known-finite domain (e.g. {`'json-fetch'`, `'llm-inference'`, `'llm-parse-website'`}) committed to repo, or (b) fall back to fetching transaction calldata to recover the original. EVENT-01 schema reserves columns `agent_class_keccak` AND `agent_class_string` so the recovery method is auditable per row. |
| KPD-19 | CoinGecko OHLCV timestamp convention verification (PITFALLS C1) | FX-01 | FX-01's join rule is `t_price < t_block_timestamp` (LOCF, no look-ahead). This is correct **only if** the OHLCV timestamp is candle-OPEN. CoinGecko's docs describe the timestamp as candle-CLOSE — if misread, every row inherits up to 1 hour of look-ahead bias, directly poisoning inequality #1 binding identification. **Required during FX-01 plan-phase**: fetch a CoinGecko hourly OHLCV sample for a known SOMI day (e.g. 2026-05-24), cross-check against an alternative source's intraday tick (Messari or CMC), confirm whether the published timestamp aligns with the opening or closing tick of the candle. Document the verdict in the FX adapter config (`timestamp_convention: 'open' | 'close'`); the LOCF join must subtract the candle-duration from the timestamp if convention is 'close'. |

These 19 plan-phase decisions consolidate two reviewer-pipeline iterations plus the PITFALLS research. They are **scoped engineering choices**, not strategic-scope questions — strategic scope is locked by the Requirements / Out of Scope / Inherited Open Questions sections above. Each KPD entry binds the relevant phase plan to a specific failure mode the reviewers identified; resolution is a phase-plan deliverable.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Scope M1 to indexer + cost panel + inequality-region notes; defer parametric fit to M2 | Parametric model choice depends on observed distribution shape (lognormal vs. Hawkes vs. piecewise); committing before data exists forces rework | — Pending |
| **Pre-flight scout completed before plan-finalization** | Two reviewers (Reality Checker + Data Engineer) flagged volume + indexer-support + bytecode-verification as load-bearing unknowns the original draft refused to test. The 30-minute scout converted all three to bounded findings (235K tx confirmed, Ormi subgraph confirmed, both proxy+impl unverified, EIP-1967 surprise discovered). | ✓ Good |
| Adopt Ormi subgraph as INDEX-01 primary; drop "if Somnia is supported" hedge | Scout confirmed Somnia docs canonical-document Ormi + Protofire subgraph services. Direct-RPC is infeasible (320K calls cap, 1000-block range limit). | — Pending |
| BYTECODE-01 ships on Tier-C (empirical residual); Tier-B decompilation is a stretch goal with a hard timebox | Neither proxy nor 18.5 KB impl is verified. PANEL-01 cannot block on closed-form rebate recovery — the milestone would die on a tooling question. Empirical residual is rigorous and reproducible. | — Pending |
| M1 OWNS the shared `(K_D, K_AI)` schema (SHARED-SCHEMA-01); `abrigo-x402` mirrors this one when it builds its panel | `abrigo-x402` has no row-level panel yet — the original "mirror x402's schema" claim had no referent to mirror. Inverting the dependency removes a phantom constraint. | — Pending |
| Add IMPL-01 (track proxy `Upgraded` events) as a load-bearing requirement | The contract is mutable. Without per-row `implementation_address`, the rebate-equation hypothesis cannot be tested across the window — confounded by silent impl swaps. Scout-discovered constraint. | — Pending |
| Treat docs-quoted `{0.03, 0.07, 0.10}` SOMI prices and "median executionCost" claims as hypotheses to falsify | Docs explicitly call the schedule "stop-gap"; runners will eventually price on observed consumption | — Pending |
| Backfill full deployment-block-to-now window in M1 | One-shot indexing on Ormi is cheap; truncating risks missing low-frequency regime shifts and impl upgrades | — Pending |
| TOPIC-01 (resolve event topic0 hashes by keccak match) is a separate first-class requirement, not a sub-bullet of EVENT-01 | Scout observed 3 distinct topic0s with no verified ABI to name them. Misidentifying an event would silently break the entire schema | — Pending |

---
*Last updated: 2026-05-25 after pre-flight scout + two reviewer-pipeline iterations + PITFALLS external-triangulation research. Strategic scope passes both reviewers' "no longer fantasy-grade" bar; 19 plan-phase engineering decisions enumerated as Known Plan-Phase Decisions; BYTECODE-01 Tier-B success criterion and PANEL-01 schema-artifact requirement absorbed inline from PITFALLS findings.*
