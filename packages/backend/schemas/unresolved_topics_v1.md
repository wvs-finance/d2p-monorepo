# `unresolved_topics.parquet` — quarantine design (KPD-06 / TOPIC-01)

**Phase:** 02 — Topic & Implementation Provenance · **Plan:** 02-01 · **Requirement:** TOPIC-01 (SC#4)
**Status:** DESIGN ONLY. The table is **not materialized** in Phase 2 — Phase 3 (INDEX-01) fills it
during backfill. Phase 2 fixes the *numerator pipeline* (the resolver in
`schemas/topic0_map_v1.json` that decides `resolved` vs quarantined); the
*denominator* (total proxy log count over the indexed window) is an INDEX-01 output.

For M1 this table is **expected to be empty** — all three observed topic0s
(`0xb623…` RequestCreated, `0x65db…` RequestFinalized, `0x5c09…` CommitteeDepositFailed)
resolved by exact keccak match against the blob-SHA-pinned ABI
(`e15d4e94…`), and the two ABI-defined-but-unobserved events
(`SubcommitteePaid`, `NativeTransferFailed`) are pre-registered in the resolver, so
they too will resolve rather than quarantine if they ever fire. **Expected
`pct_logs_unresolved` for M1 = 0.0%.**

## Columns (KPD-06 minimum set)

| column | polars dtype | note |
|---|---|---|
| `topic0` | `pl.Utf8` | the unmatched hash (`0x`-prefixed, lowercased) |
| `implementation_address` | `pl.Utf8` | the impl under which the unmatched log was seen (EIP-1967 slot value, lowercased) |
| `first_seen_block` | `pl.UInt64` | block of first observation |
| `first_seen_tx` | `pl.Utf8` | tx hash of first observation |
| `observed_count` | `pl.UInt64` | running count across the indexed window |
| `raw_data_sample` | `pl.Utf8` | hex of one log's `data` + `topics`, for offline decode |
| `decode_status` | `pl.Enum(["unresolved_abi","unresolved_impl_transition"])` | resolution-failure reason |

**DTYPE SCOPE RULE (per `schemas/event_schema_v1.md`):** uint256 / hash / address
columns are `pl.Utf8` ONLY — never `Int64`/`UInt64`/`Decimal(38,0)` (a uint256 is up
to 78 digits, exceeds Decimal128's 38 and overflows Int64). Block numbers are bounded
counters and are `pl.UInt64`. `observed_count` is a bounded counter (`pl.UInt64`).

## `decode_status` enum — full domain

Used in **both** the resolver output (`topic0_map_v1.json`) and this quarantine table:

- **`resolved`** — keccak-matched against a known ABI. The only status the five
  registered topic0s take. (Appears in the resolver, never in this table.)
- **`unresolved_abi`** — topic0 has no keccak match in any known ABI; quarantined here.
- **`unresolved_impl_transition`** — log falls in the ±10-block quarantine band around a
  *post-deploy* `Upgraded` (PITFALLS A1) and the new impl's field layout is not yet
  independently verified. (The deploy-block Upgraded is the floor row, NOT a transition —
  it is not quarantined.)

### Escalation order for an `unresolved_abi` topic0 (KPD-06)

1. Prior blobs of `emrestay/somnia-agents-skills` (a newer/older ABI revision).
2. Newer Somnia DevRel repos / published ABIs.
3. `4byte.directory` topic0 reverse-lookup.
4. Tier-B decompiled event tables (BYTECODE-01 Heimdall/panoramix output).

## The `< 1%` ship gate (STATS-01 `pct_logs_unresolved`)

```
pct_logs_unresolved = (Σ observed_count in unresolved_topics.parquet)
                      / (total proxy log count over the indexed window) × 100
ship gate:  pct_logs_unresolved < 1.0
```

- The **numerator** (Σ `observed_count`) is produced by THIS resolver's quarantine
  pipeline — Phase 2's deliverable.
- The **denominator** (total proxy log count) is an INDEX-01 / Phase-3 output.
- **M1 expected value: 0.0%** — every observed topic0 resolved; no quarantine rows.
- Worked threshold check (see `tests/test_topic_resolution.py::test_unresolved_gate`):
  `50/10000 = 0.5%` PASSES (`< 1.0`); `150/10000 = 1.5%` FAILS — the threshold flips.

## SC#5 — indexed-dynamic-field enumeration (confirm-and-document, NOT a migration)

The resolved ABI (`e15d4e94…`) has **ZERO indexed-dynamic fields.** Every indexed arg
across all five events is a **value type**:

| event | indexed args (all value types) |
|---|---|
| `RequestCreated` | `requestId` (uint256), `agentId` (uint256) |
| `RequestFinalized` | `requestId` (uint256) |
| `CommitteeDepositFailed` | `requestId` (uint256) |
| `SubcommitteePaid` | `requestId` (uint256) |
| `NativeTransferFailed` | `recipient` (address) |

`RequestCreated`'s dynamic fields — `bytes payload`, `address[] subcommittee` — are
**non-indexed** (in the data section), so they are fully recoverable from log data and
are never hashed into a topic.

**Result:** `INDEXED_DYNAMIC_FIELD_COUNT == 0` ⇒ **no `event_schema_v1.md → v2` bump is
triggered.** This is the SC#5 enumeration outcome for the single M1 impl
(`0x9af5…3edd`), recorded as a confirm-and-document finding — there is no schema
migration. The graph-node indexed-dynamic keccak trap (PITFALLS B1) is real *in
general* but has no referent in this interface.

The KPD-18 column reservations `agent_class_keccak` / `agent_class_string` in
`event_schema_v1.md` are KEPT as cheap insurance, but there is **no `keccak → string`
referent here** — the likely real recovery of agent class is `agentId → class` via a
uint registry or a `bytes payload` decode (per `event_schema_v1.md` §KPD-18), NOT a
keccak-of-indexed-string lookup.
