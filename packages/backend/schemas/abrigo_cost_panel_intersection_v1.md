# SHARED-SCHEMA-01 — Abrigo Cost Panel Intersection Schema (`abrigo_cost_panel_intersection_v1.md`)

> **schema_version:** `abrigo_cost_panel_intersection_v1`
> **schema anchor:** `v1-K_AI-anchored`
> **Requirement:** SHARED-SCHEMA-01.
> **Machine-loadable companion:** `schemas/abrigo_cost_panel_intersection_v1.json`
> (JSON-Schema draft 2020-12, with an `x-polars-dtype` annotation per column).
> **Source of truth:** `.planning/phases/01-…/01-RESEARCH.md §Schema Artifacts` +
> `schemas/event_schema_v1.md` (EVENT-01 — dtypes MUST be consistent).
> **Status:** the SHARED joint-analysis contract. Read by PANEL-01 (Phase 5) and by
> joint-analysis consumers in `abrigo-analytics`. Locked before PANEL-01 is written.

This is the **strict intersection** of the two Abrigo legs — the columns that are
identical in meaning, name, and dtype whether a row originates on the `K_AI`
(agent-payment, Somnia) leg or the `K_D` (data, Celo/x402) leg. Joint-analysis
consumers JOIN on the intersection PK. Leg-specific columns live in sidecar
extension schemas (`abrigo_cost_panel_k_ai_extensions_v1.md` for the K_AI leg).

A consumer must be able to load `abrigo_cost_panel_intersection_v1.json` as a valid
draft-2020-12 JSON-Schema and map each intersection column to its polars dtype
**without inferring from data** (PITFALLS E1 — never infer parquet schema; a
null-only early partition would otherwise infer a Null column type and break later
reads).

---

## Supersedes

**The free-vs-paid data-source choice does NOT change any intersection assumption.**
Per `01-RESEARCH.md §Coherence-Check Construction` and the DATA-SOURCE-01 verdict
(Plan 01-03), the intersection columns are **source-agnostic**: a request's
`gross_cost_native` / `block_ts_utc` / `block_number` are identical whether the row
is indexed by Ormi (free or paid), by a paid GetBlock archive, or by a raw
RPC `eth_getLogs` scan. A later source swap therefore does **NOT** trigger a
schema-version bump — only a change to the column set, dtypes, or PK does. This is
recorded explicitly so the Phase-3 INDEX-01 source decision (and any Phase-3
backfill-driven paid swap) leaves this schema untouched.

---

## Intersection columns

The strict intersection column set. Dtypes are consistent with
`schemas/event_schema_v1.md` (EVENT-01) for every shared column (`block_number`,
`block_ts_utc`, `chain_id`, `tx_hash`, `request_id`, `gross_cost_native`). All
column names are **snake_case**.

| column              | polars dtype                                       | parquet physical          | nullability | note                                                                                                                  |
|---------------------|----------------------------------------------------|---------------------------|-------------|-----------------------------------------------------------------------------------------------------------------------|
| `request_id`        | `pl.Utf8` (uint256 decimal string)                 | BYTE_ARRAY                | **NOT NULL**| **Utf8 ONLY** — NEVER `Int64` AND NEVER `Decimal(38,0)`: keccak-derived uint256 = up to **78** digits > Decimal128's 38 — PK part |
| `tx_hash`           | `pl.Utf8` (or `Binary(32)`)                        | BYTE_ARRAY                | **NOT NULL**| consistent with event_schema_v1.md — PK part                                                                          |
| `block_number`      | `pl.UInt64`                                        | INT64                     | **NOT NULL**| consistent with event_schema_v1.md (arrival-ordering PK part 1)                                                       |
| `block_ts_utc`      | `pl.Datetime("us","UTC")`                          | INT64 (logical TIMESTAMP) | **NOT NULL**| **COARSE SECONDARY** — whole-second source, never sort-primary; consistent with event_schema_v1.md                    |
| `chain_id`          | `pl.Int64`                                         | INT64                     | **NOT NULL**| 5031 on the K_AI/Somnia leg; wide for cross-leg join — PK part; consistent with event_schema_v1.md                    |
| `gross_cost_native` | `pl.Utf8` (wei decimal) **or** `pl.Decimal(38,0)`  | BYTE_ARRAY / FIXED        | **NOT NULL**| wei amount, SOMI wei ≈ 1e16–1e17 ≈ 17–18 digits, **provably ≤ 38** — Utf8 OR Decimal(38,0), never Int64               |
| `gross_cost_usd`    | `pl.Float64`                                       | DOUBLE                    | nullable    | FX may be stale (no native SOMI/USD on-chain oracle)                                                                   |
| `net_cost_usd`      | `pl.Float64`                                       | DOUBLE                    | nullable    | net of burn/validator rebate accounting                                                                               |
| `fx_rate`           | `pl.Float64`                                       | DOUBLE                    | nullable    | SOMI/USD cross-rate applied; off-chain source                                                                         |
| `fx_source_ts_utc`  | `pl.Datetime("us","UTC")`                          | INT64 (logical TIMESTAMP) | nullable    | timestamp of the FX observation applied                                                                               |
| `schema_version`    | `pl.Utf8`                                          | BYTE_ARRAY                | **NOT NULL**| `abrigo_cost_panel_intersection_v1`; required for the explicit cross-version read filter (PITFALLS E4)                 |

**DTYPE SCOPE RULE (B1, verbatim — load-bearing, consistent with EVENT-01):**
> Decimal(38,0) permitted ONLY for wei amounts provably ≤ 38 digits;
> requestId/agentId/topic-derived ids are Utf8-only (uint256 = up to 78 digits >
> Decimal128's 38).

In the JSON-Schema (`abrigo_cost_panel_intersection_v1.json`) the `request_id`
column's `x-polars-dtype` MUST be `Utf8` (never `Int64`, never `Decimal(38,0)`);
the `gross_cost_native` column's `x-polars-dtype` may be `Utf8` **or**
`Decimal(38,0)` (provably ≤ 38 digits).

---

## Intersection PK

**`(chain_id, tx_hash, request_id)`.**

Joint-analysis consumers in `abrigo-analytics` JOIN on this PK. `chain_id` is part
of the PK so a single joint panel can carry both legs (K_AI rows on Somnia
`chain_id = 5031`, K_D rows on Celo) without collision; `tx_hash` + `request_id`
disambiguate within a leg.

---

## v1-K_AI-anchored + breakage budget

This schema is **`v1-K_AI-anchored`**: its columns, dtypes, and PK are derived from
the `K_AI` (agent-payment, Somnia) leg, because the K_AI leg is the first to
materialize a panel (`abrigo-x402`'s `K_D` panel ships later). The anchor tag is
recorded in both this `.md` (`v1-K_AI-anchored`) and the JSON-Schema
(`x-schema-anchor: "v1-K_AI-anchored"`).

**Breakage budget — what a K_D-driven change costs:**

- **Stable contracts (will NOT change when K_D ships).** `chain_id`, `tx_hash`,
  `block_number`, `block_ts_utc`, `schema_version` and the PK
  `(chain_id, tx_hash, request_id)` are cross-leg invariants. `gross_cost_native`
  (wei, native to each leg), `gross_cost_usd`, `net_cost_usd`, `fx_rate`,
  `fx_source_ts_utc` carry leg-neutral USD-denominated meaning. A K_D row populates
  exactly these columns the same way.
- **What would version-bump.** A column rename, a dtype change to any shared
  column, a PK change, or the promotion of a K_AI-only column out of the sidecar
  into the strict intersection. If `K_D` requires a column the K_AI leg lacks (or a
  different identifier than `request_id`), that is a **`v2-joint-anchored`** bump —
  not an in-place edit of v1.
- **Cross-version reads require an explicit version filter (PITFALLS E4).** A
  consumer reading across `abrigo_cost_panel_intersection_v1` and a future
  `v2-joint-anchored` MUST filter on `schema_version` explicitly; mixed-version
  reads without a version filter are undefined. This is why `schema_version` is
  NOT NULL and part of the contract.
- **Budget statement.** The K_AI anchoring is a deliberate, time-boxed asymmetry:
  v1 lets the K_AI leg ship its panel and PANEL-01 (Phase 5) immediately, accepting
  that the K_D leg may force a single `v1 → v2` bump when it builds its panel. That
  one bump is the entire budgeted breakage; no further K_D-driven churn is
  anticipated because the stable-contract columns above already cover the leg-neutral
  surface.

---

## Relationship to the K_AI sidecar

K_AI-leg-specific columns (`agent_class`, `implementation_address`, `request_id_kai`,
`subcommittee_size`, `per_agent_budget_native`, `agent_class_keccak`,
`agent_class_string`, …) are NOT in this strict intersection. They live in
`schemas/abrigo_cost_panel_k_ai_extensions_v1.md`, a **sidecar** joined to the
intersection on `(chain_id, tx_hash)`. Keeping them out of the intersection is what
makes the intersection itself source-agnostic and cross-leg.
