---
phase: 01-data-sourcing-gate-pre-flight-addendum-schema-foundations
plan: 04
subsystem: database
tags: [polars, parquet, json-schema, event-schema, uint256, ddl, jsonschema, pyyaml]

# Dependency graph
requires:
  - phase: 01-data-sourcing-gate-pre-flight-addendum-schema-foundations (Plan 01-01)
    provides: uv/pytest harness + N2 conftest fixtures (schemas_dir, read_text, load_yaml, load_json)
provides:
  - "schemas/event_schema_v1.md — EVENT-01 IAgentRequester event-schema DDL (arrival-timing first-class, uint256-safe, responses child table, KPD-18 reservations, topic0 domain)"
  - "schemas/batch_manifest_v1.yaml + .schema.json — KPD-11a batch-manifest schema artifact + draft-2020-12 validator"
  - "tests/test_event_schema.py — DDL-lint + runtime uint256-overflow guard"
  - "tests/test_batch_manifest_schema.py — manifest validation + completeness-enforcement tests"
affects: [INDEX-01, PANEL-01, STATS-01, TOPIC-01, SHARED-SCHEMA-01, KPD-11b]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "uint256 id columns are pl.Utf8 ONLY (NEVER Int64, NEVER Decimal(38,0)); Decimal(38,0) reserved for bounded wei ≤ 38 digits"
    - "arrival ordering on (block_number, log_index); block_ts_utc coarse secondary (whole-second source); dedup (chain_id, tx_hash, log_index)"
    - "schema invariants enforced by RUNTIME polars round-trip, not grep-only"
    - "JSON-Schema draft 2020-12 validator authored in Phase 1, invoked at write time in Phase 5 (KPD-11b)"

key-files:
  created:
    - schemas/event_schema_v1.md
    - schemas/batch_manifest_v1.yaml
    - schemas/batch_manifest_v1.schema.json
    - tests/test_event_schema.py
    - tests/test_batch_manifest_schema.py
  modified: []

key-decisions:
  - "uint256 id columns (request_id/agent_id) are pl.Utf8 ONLY — uint256 = up to 78 digits > Decimal128's 38; Decimal(38,0) raises OverflowError on uint256 max (verified empirically on polars 1.41.2)"
  - "Decimal(38,0) PERMITTED only for bounded wei amounts (per_agent_budget_native, gross_cost_native ≈ 17-18 digits)"
  - "Arrival key (block_number, log_index); block_ts_utc coarse secondary because block.timestamp is whole-second"
  - "responses child table reserved with PK (chain_id, tx_hash, log_index, member_index); population path (event-derivable vs state-readable) flagged OPEN for Phase 2 — no ResponseReceived event in interface"
  - "topic0 roles UNASSIGNED — three live hashes recorded as domain only; TOPIC-01/Phase 2 keccak-resolves against pinned commit e15d4e9"

patterns-established:
  - "Schema-artifact discipline: every column has explicit polars dtype + parquet physical + nullability so consumers never infer (PITFALLS E1)"
  - "N4 ABI→panel naming: requestId→request_id, agentId→agent_id, perAgentBudget→per_agent_budget_native (snake_case parquet columns; ABI camelCase only for raw event)"

requirements-completed: [EVENT-01, DATA-SOURCE-01]

# Metrics
duration: 9min
completed: 2026-05-29
---

# Phase 1 Plan 04: EVENT-01 Event-Schema DDL + KPD-11a Batch-Manifest Schema Summary

**Locked the foundational `IAgentRequester` event-schema DDL (arrival-periodicity primacy, uint256-overflow-safe dtypes, responses child table, KPD-18 reservations) plus the KPD-11a batch-manifest JSON-Schema validator — all test-enforced before any INDEX-01 authoring.**

## Performance

- **Duration:** 9 min
- **Started:** 2026-05-29T21:20:04Z
- **Completed:** 2026-05-29T21:29:04Z
- **Tasks:** 3
- **Files modified:** 5 (all created)

## Accomplishments
- `schemas/event_schema_v1.md`: full DDL with arrival-timing columns first-class NOT NULL, the verbatim DTYPE SCOPE RULE, the responses child table, KPD-18 reservations, the three live topic0 hashes (roles UNASSIGNED), gap-detection enum, and a `## Supersedes` section recording the KPD-18 reframe + no-ResponseReceived population-path open question + the whole-second arrival-key correction.
- `schemas/batch_manifest_v1.yaml` + `.schema.json`: KPD-11a schema artifact with all 11 required fields; example manifest validates against the draft-2020-12 schema; scope note states write-time enforcement is Phase 5 / KPD-11b.
- `test_uint256_not_int64` is a RUNTIME polars round-trip (not grep-only): a 78-digit uint256 string survives `pl.Utf8` intact, `pl.Series([2**256-1], dtype=pl.Decimal(38,0))` RAISES (OverflowError), and `10**17` wei constructs cleanly in `pl.Decimal(38,0)`.
- Full suite green: `uv run pytest tests/ -q` = 24 passed (9 new from this plan).

## Task Commits

Each task was committed atomically:

1. **Task 1: event_schema_v1.md EVENT-01 DDL** - `37eea32` (feat)
2. **Task 2: KPD-11a batch manifest schema + validator** - `d20e204` (feat)
3. **Task 3: EVENT-01 DDL-lint + manifest schema tests** - `13700d2` (test)

**Plan metadata:** see final docs commit.

## Files Created/Modified
- `schemas/event_schema_v1.md` - EVENT-01 IAgentRequester event-schema DDL
- `schemas/batch_manifest_v1.yaml` - KPD-11a example/template batch manifest
- `schemas/batch_manifest_v1.schema.json` - draft-2020-12 manifest validator (Phase 5 KPD-11b invokes this)
- `tests/test_event_schema.py` - DDL-lint (6 tests) incl. runtime uint256-overflow guard
- `tests/test_batch_manifest_schema.py` - manifest validation (3 tests) incl. missing-field rejection

## Decisions Made
- **uint256 id columns are `pl.Utf8` ONLY.** Empirically confirmed on polars 1.41.2: a 78-digit string round-trips through `pl.Utf8` intact while `pl.Decimal(38,0)` raises `OverflowError` on the uint256 max. `Decimal(38,0)` is reserved for bounded wei amounts (≈17–18 digits).
- **Arrival key `(block_number, log_index)`; `block_ts_utc` coarse secondary.** `block.timestamp` is whole-second, so a timestamp sort scrambles intra-second arrival order.
- **responses child table reserved, population path OPEN.** No `ResponseReceived` event exists in the `main` interface; per-member data lives in `Request.responses`. Phase 2/TOPIC-01 must confirm event-derivable vs state-readable before Phase 3 treats it as event-fillable.
- **topic0 roles deferred.** Three live hashes recorded as domain only; the 3-topic/1120-byte `0xb623…` is the leading RequestCreated candidate but is NOT hard-coded — TOPIC-01 keccak-resolves against pinned commit `e15d4e9`.

## Deviations from Plan

None - plan executed exactly as written. The three plan tasks, their `<automated>` verify blocks, and the load-bearing review-gate specifics (uint256 Utf8-only rule, runtime Decimal-overflow assertion, arrival ordering, N4 naming, topic0 roles unassigned, KPD-11a required fields) were all implemented as specified.

## Issues Encountered
None. Verified the polars Decimal-overflow behavior empirically (`OverflowError` on polars 1.41.2) before writing the runtime assertion, so the `pytest.raises(Exception)` guard is grounded in observed library behavior.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- EVENT-01 + KPD-11a discharged; the foundational schema is locked and test-enforced before INDEX-01 manifest authoring.
- Open items carried forward (by design): TOPIC-01 (Phase 2) keccak-resolves the three topic0 roles and confirms the responses-population path; KPD-11b (Phase 5) wires `batch_manifest_v1.schema.json` into write-time validation.
- SHARED-SCHEMA-01 (intersection/extension `.md` + `.json`) remains for the sibling Phase-1 plan; it consumes the `request_id` / `(chain_id, tx_hash)` keys this DDL fixes.

## Self-Check: PASSED

- FOUND: schemas/event_schema_v1.md
- FOUND: schemas/batch_manifest_v1.yaml
- FOUND: schemas/batch_manifest_v1.schema.json
- FOUND: tests/test_event_schema.py
- FOUND: tests/test_batch_manifest_schema.py
- FOUND commit: 37eea32 (Task 1)
- FOUND commit: d20e204 (Task 2)
- FOUND commit: 13700d2 (Task 3)

---
*Phase: 01-data-sourcing-gate-pre-flight-addendum-schema-foundations*
*Completed: 2026-05-29*
