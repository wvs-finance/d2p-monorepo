---
phase: 01-data-sourcing-gate-pre-flight-addendum-schema-foundations
plan: 01
subsystem: testing
tags: [uv, pytest, python-3.12, jsonschema, polars, sha256, provenance, kpd-16, scout-archive, somnia-rpc, blockscout]

# Dependency graph
requires: []
provides:
  - "uv-managed Python 3.12 project + pytest harness (greenfield repo's first runnable test infra)"
  - "Six shared conftest fixtures (N2 contract: scout_dir/schemas_dir/research_dir return Path; load_yaml/load_json/read_text return callables) consumed as test params by all Phase-1 plans"
  - "Reusable Somnia chain-probe tooling (probes/somnia_rpc.py, probes/blockscout.py) — re-confirms any archived fact"
  - "KPD-16 scout archive consolidated under .planning/scout/2026-05-29/ with provenance-stamped RPC/event/deployment facts"
  - "sha256 PROVENANCE manifest + set-equality test making the archive tamper-evident and growth-pinned"
  - "INDEX-01 startBlock resolved to 283417317 in the archive (supersedes the ~320M / ~270-day error)"
affects: [01-02, 01-03, 01-04, 01-05, "Phase 2 TOPIC-01", "Phase 3 INDEX-01"]

# Tech tracking
tech-stack:
  added: [pytest>=8, jsonschema>=4.20, pyyaml>=6, polars>=1.20]
  patterns:
    - "N2 fixture-returning-callable contract: path fixtures return Path, loader fixtures return callables; tests consume as params (not module imports)"
    - "Scout-archive provenance discipline: every .md row carries source_url + utc_fetch_ts; PROVENANCE.sha256 pins every .md; set-equality test (.md-scoped) keeps manifest and dir in lockstep"
    - "Stdlib-only re-runnable probe tooling separate from CI (network probes never run in the test suite)"

key-files:
  created:
    - pyproject.toml
    - tests/conftest.py
    - tests/__init__.py
    - tests/test_scout_archive.py
    - probes/somnia_rpc.py
    - probes/blockscout.py
    - .planning/scout/2026-05-29/rpc_capability_probe.md
    - .planning/scout/2026-05-29/deployment_block.md
    - .planning/scout/2026-05-29/event_shapes_onchain.md
    - .planning/scout/2026-05-29/PROVENANCE.sha256
    - .planning/scout/README.md
  modified: []

key-decisions:
  - "requires-python = >=3.12 (this repo's floor, NOT parity with abrigo-analytics' >=3.13)"
  - "N2 contract locked for Plans 01-01..01-05: shared helpers are pytest fixtures returning values/callables, consumed as test parameters"
  - "PROVENANCE.sha256 manifest is .md-scoped with a set-equality test so Plan 02's three new .md files must be re-pinned (the manifest cannot silently drift)"
  - "Probe modules are tooling-only (stdlib urllib, network-touching __main__); the CI suite asserts only the recorded facts, never hits the network"

patterns-established:
  - "Pattern 1: shared-fixture contract (N2) — every Phase-1 test consumes scout_dir/schemas_dir/research_dir + load_yaml/load_json/read_text as params"
  - "Pattern 2: provenance-stamped scout archive — source_url+utc_fetch_ts per fact, sha256-pinned, set-equality enforced"

requirements-completed: [DATA-SOURCE-01]

# Metrics
duration: ~12min
completed: 2026-05-29
---

# Phase 1 Plan 01: Wave 0 Test Harness + KPD-16 Scout Archive Summary

**Greenfield uv/pytest harness with six N2-contract shared fixtures, reusable stdlib Somnia probe tooling, and a sha256-pinned scout archive that resolves INDEX-01 startBlock to 283417317 and records the three on-chain event shapes — KPD-16 discharged.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-05-29T (plan execution)
- **Completed:** 2026-05-29
- **Tasks:** 3
- **Files created:** 11 (12 incl. probes/__init__.py)

## Accomplishments
- Greenfield repo now has a runnable `uv run pytest tests/ -q` env (Python 3.12 floor; pytest/jsonschema/pyyaml/polars dev group) — the foundation every later Phase-1 wave imports.
- `tests/conftest.py` defines all six N2-contract shared fixtures (verified: 6 fixture defs, 6 `@pytest.fixture` decorators, 0 watch-mode flags).
- Hardened the scout's ad-hoc `/tmp` probe tooling into committed, re-runnable `probes/somnia_rpc.py` (getLogs 1000-cap assert, getBlockReceipts None-on-absent downgrade signal, storage/tx/block reads, cadence calc) and `probes/blockscout.py` (429-aware spaced tx-count probe).
- Consolidated the KPD-16 scout archive under `.planning/scout/2026-05-29/` with provenance-stamped RPC capability matrix, deployment-block resolution (283417317, supersedes ~320M error), and the three live on-chain event shapes (recorded as shapes, not roles — scout labels likely INVERTED).
- sha256 `PROVENANCE.sha256` manifest + `test_scout_archive.py` (6 tests) enforce presence + load-bearing values + manifest integrity with `.md`-scoped set-equality so Plan 02's future files must be re-pinned.

## Task Commits

Each task was committed atomically:

1. **Task 1: Wave 0 uv project + pytest harness + shared fixtures** - `6818fd8` (chore)
2. **Task 2: KPD-16 probe scripts + consolidated scout RPC/event/deployment archive** - `66e3dc9` (feat)
3. **Task 3: KPD-16 sha256 provenance manifest + scout-archive presence/value test** - `4991329` (test)

**Plan metadata:** (final docs commit)

## Files Created/Modified
- `pyproject.toml` - uv-managed project, requires-python >=3.12, dev group (pytest/jsonschema/pyyaml/polars), pytest testpaths/addopts, no watch-mode
- `tests/conftest.py` - six N2-contract shared fixtures (3 Path-returning, 3 callable-returning)
- `tests/__init__.py` - empty package marker
- `tests/test_scout_archive.py` - 6 KPD-16 presence/value/manifest-integrity tests (set-equality, hashlib)
- `probes/somnia_rpc.py` - reusable stdlib RPC probe (chain_id, head_block, get_logs[1000-cap assert], get_block_receipts, get_storage_at, get_tx_by_hash, get_block, median cadence)
- `probes/blockscout.py` - reusable Blockscout v2 tx-count probe with 429-aware spaced backoff
- `probes/__init__.py` - package marker + tooling-not-CI note
- `.planning/scout/2026-05-29/rpc_capability_probe.md` - RPC capability matrix with provenance (getLogs 1000-cap, getBlockReceipts AVAILABLE, full archive, ~100.7ms cadence, whole_second timestamp, baseFee, proxy IMPL slot)
- `.planning/scout/2026-05-29/deployment_block.md` - deployment_block 283417317, backfill 36.3M blocks, supersedes-note, INDEX-01 startBlock resolved
- `.planning/scout/2026-05-29/event_shapes_onchain.md` - three live on-chain event shapes; records shapes not roles (INVERTED note + no-ResponseReceived flag for Phase 2)
- `.planning/scout/2026-05-29/PROVENANCE.sha256` - sha256 of every .md in the archive
- `.planning/scout/README.md` - archive index + 2026-05-25 to 2026-05-29 canonical path reconciliation

## Decisions Made
- `requires-python = ">=3.12"` — this repo's floor, deliberately NOT abrigo-analytics' `>=3.13` (recorded in pyproject comments to prevent a future false-parity edit).
- N2 fixture contract locked for all of Plans 01-01..01-05: shared helpers are `@pytest.fixture`s returning values/callables, consumed as test parameters — pins one consumption pattern across the phase.
- `PROVENANCE.sha256` is `.md`-scoped with a set-equality assertion so the manifest itself never false-fails and Plan 02's three appended `.md` files (`beacon_diamond_probe.md`, `somnia_finality_semantics.md`, `coingecko_convention.md`) are forced to be re-pinned.
- Probe modules are tooling-only (network access confined to `__main__`); the CI suite asserts only the recorded archive facts to avoid flaking on network-dependent probes.

## Deviations from Plan

None - plan executed exactly as written.

Task 1 artifacts (pyproject.toml, tests/conftest.py, tests/__init__.py, uv.lock, .venv) were already present on disk from a prior partial run; they matched the plan's specification exactly (all six fixtures, correct dependency group, 3.12 floor, no watch-mode) and passed every Task-1 acceptance check unchanged, so they were verified and committed as-is rather than rewritten.

## Issues Encountered
None. The full suite (`uv run pytest tests/ -q`) is green (6 tests), `sha256sum -c .planning/scout/2026-05-29/PROVENANCE.sha256` reports OK for every line, and probe modules parse and are runnable.

## User Setup Required
None - no external service configuration required. (The probe modules can reach the public Somnia RPC + Blockscout when run manually, but require no credentials.)

## Next Phase Readiness
- Wave 0 test infra is live: Plans 01-02 (schema artifacts), 01-03 (data-sourcing matrix + sufficiency bars), 01-04, 01-05 can all write `<automated>` verifies against the six shared fixtures.
- KPD-16 is discharged: the scout archive is consolidated, provenance-stamped, sha256-pinned, and set-equality-tested. Plan 02 must append its three new probe `.md` files to `PROVENANCE.sha256` or `test_provenance_manifest_valid` will fail (by design).
- INDEX-01 startBlock (283417317) and the corrected 36.3M-block backfill span are now archive-citable facts — downstream tasks cite the archive rather than re-probing.
- Open carry-forward for Phase 2 (TOPIC-01): the on-chain event roles are recorded as SHAPES only; keccak-resolve against pinned commit e15d4e9, and confirm whether per-member response data is event-emitted before treating the `responses` child table as event-fillable.

## Self-Check: PASSED

All 13 created files verified present on disk; all three task commits (`6818fd8`, `66e3dc9`, `4991329`) verified in git history.

---
*Phase: 01-data-sourcing-gate-pre-flight-addendum-schema-foundations*
*Completed: 2026-05-29*
