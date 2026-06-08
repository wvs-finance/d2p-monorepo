---
phase: 01-data-sourcing-gate-pre-flight-addendum-schema-foundations
plan: 05
subsystem: shared-schema
tags: [SHARED-SCHEMA-01, json-schema, polars-dtype, joint-analysis, v1-K_AI-anchored]
requires:
  - EVENT-01 (schemas/event_schema_v1.md — dtype source of truth)
provides:
  - SHARED-SCHEMA-01
  - schemas/abrigo_cost_panel_intersection_v1.json (machine-loadable draft-2020-12)
  - schemas/abrigo_cost_panel_intersection_v1.md (prose, v1-K_AI-anchored + breakage budget)
  - schemas/abrigo_cost_panel_k_ai_extensions_v1.md (K_AI sidecar, joined on (chain_id, tx_hash))
affects:
  - PANEL-01 (Phase 5 — reads these schemas)
  - abrigo-analytics joint-analysis consumers (join on the intersection PK)
tech-stack:
  added: []
  patterns:
    - "x-polars-dtype JSON-Schema annotation (explicit dtype map, never infer — PITFALLS E1)"
    - "uint256 ids Utf8-only (B1); wei Utf8-or-Decimal(38,0)"
    - "fixture-returning-callable test contract (N2)"
key-files:
  created:
    - schemas/abrigo_cost_panel_intersection_v1.json
    - schemas/abrigo_cost_panel_intersection_v1.md
    - schemas/abrigo_cost_panel_k_ai_extensions_v1.md
    - tests/test_shared_schema_json.py
    - tests/test_schema_consistency.py
  modified: []
decisions:
  - "Intersection is v1-K_AI-anchored: K_AI columns anchor v1; a K_D-driven change is a budgeted single v1->v2 bump, not in-place edit."
  - "Free-vs-paid source swap does NOT bump the schema (intersection columns are source-agnostic — recorded in Supersedes)."
  - "request_id / request_id_kai are Utf8 ONLY (78-digit uint256 > Decimal128's 38); wei amounts may be Utf8 or Decimal(38,0)."
metrics:
  duration_min: 2
  tasks: 3
  files: 5
  tests_total: 37
  completed: "2026-05-29"
---

# Phase 1 Plan 05: Shared Joint-Analysis Schema (SHARED-SCHEMA-01) Summary

SHARED-SCHEMA-01 discharged: the `v1-K_AI-anchored` intersection schema (prose +
machine-loadable draft-2020-12 JSON-Schema with a per-column `x-polars-dtype` map)
and the K_AI sidecar extension are committed, dtype-consistent with EVENT-01, with
a documented K_D breakage budget — read-ready for PANEL-01 (Phase 5). This is the
last plan of Phase 1.

## What was built

- **`schemas/abrigo_cost_panel_intersection_v1.json`** — JSON-Schema draft 2020-12
  (`check_schema`-valid). Eleven intersection columns, each carrying an
  `x-polars-dtype` annotation so a consumer maps every column to its polars dtype
  without inferring from data (PITFALLS E1). `required` lists the seven NOT-NULL
  columns. `x-schema-anchor: "v1-K_AI-anchored"` and `x-intersection-pk` pin the
  anchor + PK machine-readably. `request_id`'s `x-polars-dtype` is `Utf8` (never
  Int64, never Decimal); `gross_cost_native` is `Utf8` (wei).
- **`schemas/abrigo_cost_panel_intersection_v1.md`** — prose contract: source-agnostic
  Supersedes note (a free-vs-paid source swap does NOT bump the schema), the column
  table (dtypes consistent with EVENT-01), the verbatim DTYPE SCOPE RULE, the PK
  `(chain_id, tx_hash, request_id)`, and the `v1-K_AI-anchored` breakage budget
  (stable contracts vs what version-bumps vs the explicit cross-version read filter,
  PITFALLS E4).
- **`schemas/abrigo_cost_panel_k_ai_extensions_v1.md`** — K_AI sidecar joined on
  `(chain_id, tx_hash)`: `agent_class`, `implementation_address`, `subcommittee_size`,
  `per_agent_budget_native` (wei, Utf8/Decimal(38,0)), `request_id_kai` (Utf8-only),
  `agent_class_keccak`, `agent_class_string`. Declares SIDECAR + that responses stay
  a separate child table (KPD-03 / KPD-PANEL-JOIN). Three agent classes with absolute
  prices (json-fetch 0.03 / llm-inference 0.07 / llm-parse-website 0.10).
- **`tests/test_shared_schema_json.py`** (3 tests) — draft-2020-12 validity,
  `x-polars-dtype` map with a RUNTIME polars round-trip (78-digit Utf8 survives,
  `pl.Series([2**256-1], dtype=pl.Decimal(38,0))` raises, `10**17` constructs in
  Decimal(38,0)), required-non-nullable.
- **`tests/test_schema_consistency.py`** (3 tests) — intersection PK consistency
  (.md + JSON required), extension join-key, and dtype consistency with EVENT-01
  (block_number UInt64 NOT NULL, block_ts_utc coarse-secondary, uint256-not-Int64 in
  both files — the N-drift fix).

## How it works

The intersection is the strict cross-leg column set (identical name/meaning/dtype on
both the K_AI Somnia leg and the future K_D Celo leg); joint-analysis consumers join
on `(chain_id, tx_hash, request_id)`. K_AI-only columns live in the sidecar, joined
back on `(chain_id, tx_hash)` — that separation is what keeps the intersection
source-agnostic and cross-leg. The `x-polars-dtype` annotations let
`pl.scan_parquet(..., schema=...)` read explicitly. uint256 ids are Utf8-only because
a 78-digit value overflows Decimal128's 38-digit cap (proven empirically in the test,
not just asserted).

## Deviations from Plan

None — plan executed exactly as written. All three automated verify blocks passed on
first run; the full Phase-1 suite is green (37 tests).

## Verification

- Task 1: intersection JSON `check_schema` valid; `required` >= the 7 NOT-NULL columns;
  every property carries `x-polars-dtype`; `.md` carries `v1-K_AI-anchored` + breakage
  budget. PASS.
- Task 2: extension `.md` carries `(chain_id, tx_hash)`, `agent_class_keccak`,
  `per_agent_budget_native`, `json-fetch`, `v1-K_AI-anchored`. PASS.
- Task 3: `uv run pytest tests/test_shared_schema_json.py tests/test_schema_consistency.py -x -q`
  exits 0; full `uv run pytest tests/ -q` green (37 passed). PASS.

## Commits

- `564ebcd` feat(01-05): intersection schema + machine-loadable JSON-Schema
- `9d7fe57` feat(01-05): K_AI sidecar extension schema
- `0917233` test(01-05): JSON-Schema validity + cross-artifact consistency

## Self-Check: PASSED

All 5 created artifacts + the SUMMARY exist on disk; all 3 task commits
(`564ebcd`, `9d7fe57`, `0917233`) are present in the git log.
