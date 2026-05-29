# EVENT-01 — `IAgentRequester` Event-Schema DDL (`event_schema_v1.md`)

> **schema_version:** `event_schema_v1`
> **Requirement:** EVENT-01 (KPD-03 responses child table, KPD-18 column reservations).
> **Source of truth:** `.planning/phases/01-…/01-RESEARCH.md §Schema Artifacts` +
> `.planning/scout/2026-05-29/event_shapes_onchain.md` (live-probed shapes) +
> `.planning/scout/2026-05-29/deployment_block.md` (whole-second timestamp evidence).
> **Status:** foundational schema. Every later phase (INDEX-01 manifest authoring,
> PANEL-01 materialization, STATS-01 arrival-periodicity precursor) reads this DDL.
> It is LOCKED before any indexer code is written.

A consumer must be able to read this file and reproduce the exact polars/parquet
column types + nullability **without inferring from data** (PITFALLS E1 — never
infer parquet schema; a null-only early partition would otherwise infer a Null
column type and break later reads). The arrival-timing columns are first-class
non-nullable load-bearing columns (arrival-periodicity primacy): the M2
arrival-process estimation reads the inter-arrival series produced from this DDL
directly, so a dropped or mis-ordered event corrupts the inter-arrival
distribution.

---

## Supersedes

This DDL records three corrections that overturn assumptions baked into the
ROADMAP / REQUIREMENTS (resolved against live probes in `01-RESEARCH.md`):

1. **KPD-18 reframed — there is NO indexed-dynamic field.** The `main`-branch
   `IAgentRequester` interface emits
   `RequestCreated(uint256 indexed requestId, uint256 indexed agentId, uint256 perAgentBudget, bytes payload, address[] subcommittee)`.
   `agentId` is an **indexed `uint256`**, NOT `string indexed agentClass`. The
   "graph-node hashes indexed-dynamic fields" keccak-trap (PITFALLS B1) therefore
   does **not** apply to this interface as written. The two reserved columns
   `agent_class_keccak` + `agent_class_string` are KEPT as cheap insurance, but the
   **likely recovery mechanism is `agentId → class` mapping (a uint registry)** or
   a `bytes payload` decode, **NOT** `keccak → string`. Final per-`(impl, topic0)`
   enumeration is Phase 2 (TOPIC-01).

2. **There is NO `ResponseReceived` event in the interface.** The interface carries
   `RequestFinalized(uint256 indexed requestId, ResponseStatus status)` +
   `SubcommitteePaid(uint256 indexed requestId, uint256 totalPaid, uint256 perMember)`
   (both 2-topic). Per-member `Response[]` data lives in the `Request.responses`
   struct array. **OPEN QUESTION (Phase 2 / TOPIC-01):** confirm whether per-member
   response data is **event-derivable** (it may be carried in the 1120-byte payload
   of `0xb623…`) or only **state-readable** from `Request.responses` BEFORE Phase 3
   treats the `responses` child table as event-fillable. The child table is
   **reserved now**; its population path is flagged open below.

3. **Arrival key is `(block_number, log_index)`, not the timestamp.**
   `block.timestamp` is **whole_second** (live-confirmed consecutive blocks:
   `1780085231 / 1780085231 / 1780085232`). At the proxy-window cadence
   (~100.7 ms/block) up to ~10 blocks — each with N logs — share a single
   `block_ts_utc`. A timestamp sort scrambles intra-second arrival order, so
   `block_ts_utc` is a **documented coarse secondary**, never sort-primary.

---

## `requests` table

Parquet panel columns are **snake_case**. The ABI camelCase names
(`requestId`, `agentId`, `perAgentBudget`) are kept ONLY where describing the raw
on-chain event.

**Column-name mapping (N4):** event-ABI field `requestId` → panel column
`request_id` (snake_case for parquet columns); event-ABI field `agentId` →
panel column `agent_id`; event-ABI field `perAgentBudget` → panel column
`per_agent_budget_native`. Plan 05's intersection join uses the snake_case
`request_id` — this rename is intentional + traceable.

| column                   | polars dtype                                              | parquet physical         | nullability | note                                                                                              |
|--------------------------|-----------------------------------------------------------|--------------------------|-------------|---------------------------------------------------------------------------------------------------|
| `chain_id`               | `pl.Int64`                                                | INT64                    | NOT NULL    | 5031 constant; wide for cross-leg join                                                             |
| `block_number`           | `pl.UInt64`                                               | INT64                    | **NOT NULL**| **load-bearing (arrival-periodicity primacy)** — arrival-ordering PK part 1                       |
| `log_index`              | `pl.UInt32`                                               | INT32                    | **NOT NULL**| **load-bearing (arrival-periodicity primacy)** — arrival-ordering PK part 2                       |
| `tx_hash`                | `pl.Utf8` (or `Binary(32)`)                               | BYTE_ARRAY               | NOT NULL    | dedup key part                                                                                     |
| `block_ts_utc`           | `pl.Datetime("us","UTC")`                                 | INT64 (logical TIMESTAMP)| **NOT NULL**| **load-bearing (arrival-periodicity primacy)** — COARSE SECONDARY: whole-second source, store µs but NEVER sort-primary |
| `topic0`                 | `pl.Utf8` (or `Binary(32)`)                               | BYTE_ARRAY               | NOT NULL    | resolver join key (TOPIC-01)                                                                       |
| `request_id`             | `pl.Utf8` (uint256 decimal string)                        | BYTE_ARRAY               | NOT NULL    | **Utf8 ONLY** — NEVER `Int64`/`UInt64` AND NEVER `Decimal(38,0)`: keccak/topic-derived uint256 = up to **78** digits > Decimal128's 38-digit cap (ABI `requestId`) |
| `agent_id`               | `pl.Utf8` (uint256 decimal string)                        | BYTE_ARRAY               | NOT NULL    | **Utf8 ONLY** — same uint256-overflow rule as `request_id` (ABI `agentId`)                        |
| `per_agent_budget_native`| `pl.Utf8` (wei decimal) **or** `pl.Decimal(38,0)`         | BYTE_ARRAY / FIXED       | NOT NULL    | wei exceeds Int64; `Decimal(38,0)` PERMITTED — SOMI wei ≈ 1e16–1e17 ≈ 17–18 digits, provably ≤ 38 (ABI `perAgentBudget`) |
| `gross_cost_native`      | `pl.Utf8` (wei decimal) **or** `pl.Decimal(38,0)`         | BYTE_ARRAY / FIXED       | NOT NULL    | wei amount, provably ≤ 38 digits; same scope as `per_agent_budget_native`                          |
| `gross_cost_usd`         | `pl.Float64`                                              | DOUBLE                   | nullable    | FX may be stale                                                                                    |
| `fx_rate`                | `pl.Float64`                                              | DOUBLE                   | nullable    | FX may be stale (SOMI/USD off-chain; no native oracle)                                              |
| `implementation_address` | `pl.Utf8`                                                 | BYTE_ARRAY               | NOT NULL    | **NEVER null-type** (PITFALLS E1) — explicit dtype even when constant per partition                |
| `agent_class_keccak`     | `pl.Utf8` (or `Binary(32)`)                               | BYTE_ARRAY               | nullable    | KPD-18 reservation (see §KPD-18 reservations)                                                       |
| `agent_class_string`     | `pl.Utf8`                                                 | BYTE_ARRAY               | nullable    | KPD-18 reservation                                                                                  |
| `gap_status`             | `pl.Enum(["observed","indexer_gap_censored","source_gap"])` | BYTE_ARRAY            | NOT NULL    | gap-detection metadata; feeds STATS-01 `Var(N)/E[N]` censoring                                      |
| `schema_version`         | `pl.Utf8`                                                 | BYTE_ARRAY               | NOT NULL    | `event_schema_v1`                                                                                   |

---

## uint256 overflow (HARD constraint)

This is the single most common silent-corruption trap for EVM event panels.
Two sub-rules, both runtime-asserted in `tests/test_event_schema.py`:

**(i) uint256 id columns are `pl.Utf8` ONLY.**
`request_id` / `agent_id` and ANY unbounded / topic- or keccak-derived uint256
id column MUST be `pl.Utf8` ONLY — **NEVER `pl.Int64`/`pl.UInt64`** (overflows at
2^63 / 2^64) **AND NEVER `pl.Decimal(38,0)`**. A uint256 is up to **78** decimal
digits; Decimal128 maxes at 38, so `pl.Series([2**256 - 1], dtype=pl.Decimal(38, 0))`
raises (an `OverflowError` on polars ≥ 1.20).

**(ii) `pl.Decimal(38,0)` permitted ONLY for bounded wei amounts.**
`per_agent_budget_native` and `gross_cost_native` are SOMI wei ≈ 1e16–1e17 ≈
17–18 digits, **provably ≤ 38 digits**, so they may be `pl.Utf8` (wei decimal
string) **or** `pl.Decimal(38,0)`.

**DTYPE SCOPE RULE (verbatim, load-bearing):**
> Decimal(38,0) permitted ONLY for wei amounts provably ≤ 38 digits;
> requestId/agentId/topic-derived ids are Utf8-only (uint256 = up to 78 digits >
> Decimal128's 38).

---

## Arrival-ordering contract (EVENT-01 SC#8)

- **Sort key:** `(block_number, log_index)`. This is the canonical arrival order.
- **`block_ts_utc` is a DOCUMENTED coarse secondary.** The source is
  whole-second (live evidence: consecutive blocks `1780085231 / 1780085231 /
  1780085232`). At ~100.7 ms/block, up to ~10 blocks × N logs share a single
  `block_ts_utc`; a timestamp sort scrambles arrival order. Store µs precision,
  never sort-primary.
- **Dedup key:** `(chain_id, tx_hash, log_index)`.
- **M2 consumer note:** the M2 arrival-process estimation reads this inter-arrival
  series directly. A dropped or mis-ordered event corrupts the inter-arrival
  distribution → ordering on `(block_number, log_index)` is a correctness
  requirement, not a presentation choice.

---

## responses child table (KPD-03)

- **PK:** `(chain_id, tx_hash, log_index, member_index)`.
- **FK:** `(chain_id, tx_hash) → requests`.
- Reserved columns mirror the per-member response fields plus the `member_index`
  ordinal within a request's subcommittee (`subSize_default = 3`; 1–5 members).

**Caveat / OPEN QUESTION (Phase 2 / TOPIC-01) — population path:** there is NO
`ResponseReceived` event in the interface. Per-member `Response[]` data lives in
the `Request.responses` struct array and **may** be encoded in the 1120-byte
payload of `0xb623…` OR be only **state-readable**. Confirm per-member response
data is **event-derivable** BEFORE Phase 3 treats this child table as
event-fillable. The table is reserved now; its population strategy is deferred.

---

## KPD-18 reservations

`agent_class_keccak` + `agent_class_string` are reserved (nullable) for the three
canonical agent classes (absolute prices, SOMI/call):

| agent class         | price (SOMI/call) |
|---------------------|-------------------|
| `json-fetch`        | 0.03              |
| `llm-inference`     | 0.07              |
| `llm-parse-website` | 0.10              |

**Recovery mechanism is LIKELY `agentId → class` (a uint registry) or a
`bytes payload` decode, NOT `keccak → string`** — the `main` interface has no
indexed string field (`agentId` is an indexed `uint256`). The columns are cheap
insurance; the keccak-trap (PITFALLS B1) does not apply as written. Per-`(impl,
topic0)` enumeration in the resolved ABIs is Phase 2.

---

## topic0 domain

The three live on-chain topic0 hashes (probed against the proxy). **Roles are
UNASSIGNED** — TOPIC-01 (Phase 2) keccak-resolves against pinned commit
`e15d4e9`, matching keccak signature hash + on-chain topic-count + data-length to
each ABI shape. Do NOT hard-code role labels here.

| topic0                                                               | #topics | data bytes | shape note                                                          |
|----------------------------------------------------------------------|---------|------------|---------------------------------------------------------------------|
| `0xb62339927ed9948fd837358a55f5b9a824f7b047043faece66965593ed726889` | 3       | 1120       | 2 indexed args + large dynamic payload — **leading `RequestCreated` candidate** (do NOT hard-code) |
| `0x5c090ef48df2b4d8a01bd0639355d62c318b623aed749bdd12325f789e37a2cf` | 2       | 32         | 1 indexed arg + 1 word                                              |
| `0x65db1ef5b3bcd84fe4fb8dbbe1cadc9fe6643bb261ab2e01d65c281c3d466af2` | 2       | 32         | 1 indexed arg + 1 word                                              |

The scout addendum's role labels are likely **INVERTED** (it called the
`0x5c09`+`0x65db` 32-byte pair the "request side"); the on-chain shapes contradict
that. Only the shapes are settled; roles are Phase-2 work.

---

## gap-detection metadata

`gap_status` is a NOT NULL `pl.Enum(["observed","indexer_gap_censored","source_gap"])`:

- `observed` — event present in the source, no gap.
- `indexer_gap_censored` — a block range the indexer host could not confirm
  (cursor advanced over under-indexed blocks); censored for STATS-01.
- `source_gap` — the source (RPC / subgraph) itself returned a gap.

This column feeds the STATS-01 (Phase 6) `Var(N)/E[N]` overdispersion measure
with gap-censoring, gap-audited via the KPD-14 block-count threshold.
