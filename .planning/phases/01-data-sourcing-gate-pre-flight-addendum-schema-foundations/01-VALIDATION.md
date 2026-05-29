---
phase: 1
slug: data-sourcing-gate-pre-flight-addendum-schema-foundations
status: planned
nyquist_compliant: true
wave_0_complete: false
created: 2026-05-29
populated: 2026-05-29
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Populated by the planner from `01-RESEARCH.md` §Validation Architecture and the 5 PLAN.md files.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest (uv-managed Python 3.12, matching abrigo-analytics) |
| **Config file** | none yet — **Wave 0 (Plan 01 Task 1) creates `pyproject.toml` + `[tool.pytest.ini_options]`** (greenfield repo) |
| **Quick run command** | `uv run pytest tests/ -x -q` |
| **Full suite command** | `uv run pytest tests/ -v` |
| **Estimated runtime** | sub-second to a few seconds (schema-lint, YAML/JSON-Schema validation, pure-logic tests; no network) |

---

## Sampling Rate

- **After every task commit:** `uv run pytest tests/ -x -q` (schema-lint + matrix-schema; sub-second)
- **After every plan wave:** `uv run pytest tests/ -v` (full schema + fixture suite)
- **Before `/gsd:verify-work`:** full suite green + every `data_sourcing_matrix.yaml` row carries source_url + utc_fetch_ts
- **Max feedback latency:** < 1 task (every code/schema-producing task has an automated verify in the SAME task)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| P01-T1 Wave 0 infra | 01 | 1 | DATA-SOURCE-01 (infra) | smoke | `uv run pytest tests/ -q --collect-only` + dep-import check | created in task | ⬜ pending |
| P01-T2 scout archive + probes | 01 | 1 | DATA-SOURCE-01 | smoke (file+content) | `grep` deploy block/whole_second/topic0 + `ast.parse` probes | created in task | ⬜ pending |
| P01-T3 sha256 manifest + test | 01 | 1 | DATA-SOURCE-01 | smoke (file+sha256) | `uv run pytest tests/test_scout_archive.py -x -q` + `sha256sum -c` | created in task | ⬜ pending |
| P02-T1 KPD-17 + KPD-09-docs | 02 | 2 | DATA-SOURCE-01 | smoke (content) | `grep` HAPPY PATH / safe_block_depth=1 / MEDIUM | created in task | ⬜ pending |
| P02-T2 KPD-19 + FX config | 02 | 2 | DATA-SOURCE-01 | unit (yaml) | `python -c` yaml load `timestamp_convention=='close'` + grep | created in task | ⬜ pending |
| P02-T3 candle fixture + verdict tests | 02 | 2 | DATA-SOURCE-01 | unit | `uv run pytest tests/fixtures/test_fx_candle_convention.py tests/test_preflight_verdicts.py -x -q` | created in task | ⬜ pending |
| P03-T1 data_sourcing_matrix.yaml | 03 | 2 | DATA-SOURCE-01 | unit (yaml-schema) | `python -c` fixed-schema + verdict assertions | created in task | ⬜ pending |
| P03-T2 DATA_SOURCING.md memo | 03 | 2 | DATA-SOURCE-01 | smoke (content) | `grep` JUSTIFIED DEPARTURE / Supersedes / COMPLETENESS / BUDGET / sign-off + line-count | created in task | ⬜ pending |
| P03-T3 matrix + sufficiency-bar tests | 03 | 2 | DATA-SOURCE-01 | unit (logic) | `uv run pytest tests/test_data_sourcing_matrix.py tests/test_sufficiency_bars.py -x -q` | created in task | ⬜ pending |
| P04-T1 event_schema_v1.md | 04 | 2 | EVENT-01 | smoke (DDL-lint) | `grep` log_index / dedup key / uint256 / member_index / coarse secondary / topic0 | created in task | ⬜ pending |
| P04-T2 batch_manifest schema + validator | 04 | 2 | EVENT-01 | unit (jsonschema) | `python -c` jsonschema.validate(manifest, schema) + required-fields | created in task | ⬜ pending |
| P04-T3 event-schema + manifest tests | 04 | 2 | EVENT-01 | unit | `uv run pytest tests/test_event_schema.py tests/test_batch_manifest_schema.py -x -q` | created in task | ⬜ pending |
| P05-T1 intersection .md/.json | 05 | 3 | SHARED-SCHEMA-01 | unit (jsonschema) | `python -c` Draft202012 check_schema + required + x-polars-dtype + grep anchored/breakage | created in task | ⬜ pending |
| P05-T2 k_ai_extensions.md | 05 | 3 | SHARED-SCHEMA-01 | smoke (content) | `grep` (chain_id, tx_hash) / agent_class_keccak / per_agent_budget_native / classes / anchored | created in task | ⬜ pending |
| P05-T3 JSON-Schema + consistency tests | 05 | 3 | SHARED-SCHEMA-01 | unit | `uv run pytest tests/test_shared_schema_json.py tests/test_schema_consistency.py -x -q` + full suite | created in task | ⬜ pending |

**Sampling continuity check:** no 3 consecutive tasks lack an automated verify — every task above carries an `<automated>` command in its plan. ✓

---

## Wave 0 Requirements

Wave 0 = **Plan 01 Task 1** (the first task of the first wave). It MUST land before any other task's `<automated>` verify can run:

- [ ] `pyproject.toml` — uv-managed Python 3.12 project + `[dependency-groups] dev = [pytest>=8, jsonschema>=4.20, pyyaml>=6, polars>=1.20]` + `[tool.pytest.ini_options] testpaths=["tests"]`
- [ ] `tests/conftest.py` — shared fixtures: `scout_dir`, `schemas_dir`, `research_dir`, `load_yaml`, `load_json`, `read_text`
- [ ] `tests/__init__.py`
- [ ] Framework install: `uv sync` (or `uv add --dev pytest jsonschema pyyaml polars`)
- [ ] No watch-mode flags (VALIDATION forbids `--watch` / `pytest-watch`)

All per-task test files (test_scout_archive, test_preflight_verdicts, test_data_sourcing_matrix, test_sufficiency_bars, test_event_schema, test_batch_manifest_schema, test_shared_schema_json, test_schema_consistency, fixtures/test_fx_candle_convention) are created INSIDE their owning task, not in Wave 0 — Wave 0 provides only the harness + fixtures they import.

---

## Manual-Only Verifications

Some Phase-1 deliverables are research verdicts / prose that are reviewed, not unit-tested. Their *recorded outputs* are smoke-tested for presence + expected values (above), but the substantive judgment is human/review-gated:

- **`research/DATA_SOURCING.md` coherence reconciliation (SC#7(iv))** — the "real reconciliation, not a citation" quality is a review judgment; the test only asserts both `COMPLETENESS` and `BUDGET` framings + the JUSTIFIED-DEPARTURE language are present (a one-line "consistent ✓" would pass grep but fail review — the CLAUDE.md two-step review gate catches this).
- **Live-RPC probe re-confirmation** (deployment block, getBlockReceipts, beacon/diamond slots) — network-dependent; the recorded outputs in `.planning/scout/2026-05-29/*.md` are smoke-tested for presence + expected values, and `probes/somnia_rpc.py` is runnable to re-confirm, but the live probe itself is NOT in the automated CI suite (would flake).
- **DATA-SOURCE-01 sign-off** — the provisional Ormi-free pick needs no spend → no strict sign-off; a forced paid crossing (Ormi Production $75/mo if the 300k-entity cap is exceeded) requires explicit user sign-off before provisioning (execute-phase surfaces the `user_setup` item).

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (pytest infra + fixtures in Plan 01 Task 1)
- [x] No watch-mode flags
- [x] Feedback latency target set (< 1 task)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** planner-approved 2026-05-29 (pending CLAUDE.md three-step plan-review gate).
