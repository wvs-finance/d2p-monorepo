---
phase: 02-topic-implementation-provenance
plan: 02
subsystem: database
tags: [eip-1967, proxy, impl-history, parquet, polars, keccak, bytecode-backstop, provenance]

# Dependency graph
requires:
  - phase: 02-01
    provides: "keccak harness (eth-hash[pycryptodome] dev dep) pinning the Upgraded(address) topic0 0xbc7cd75a…; full suite 49 tests green baseline"
  - phase: 01
    provides: "tests/conftest.py fixtures (schemas_dir, read_text); event_schema_v1.md DTYPE SCOPE RULE; KPD-17 plain-EIP-1967 scout verdict"
provides:
  - "schemas/impl_history_v1.md — 9-column impl_history.parquet design (DESIGN-only; Phase 3 materializes)"
  - "Floor-row rule [283417317, ∞) corroborated by the deploy-block Upgraded (set_by_event='upgraded')"
  - "Head-row bytecode backstop hashing the IMPL (0x13e721a6…), 'hash the impl, never the proxy'"
  - "PITFALLS A1 ±10-block quarantine encoded as is_quarantined() excluding the deploy block"
  - "Supersedes-A2 note: Upgraded-only listener (AdminChanged/BeaconUpgraded NOT registered)"
  - "02-FORWARD-NOTES.md — three cross-phase hand-offs (responses state-only, CommitteeDepositFailed invariant, payment protocol)"
affects: [phase-3-index-01, phase-4-bytecode-01, panel-01]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "DESIGN-only parquet artifact (columns/dtypes/rules) tested via a synthetic in-Python frame, never a parquet read, until the materializing phase"
    - "Recorded-constant fixtures (backstop hash, deploy block) asserted against the synthetic frame + design-doc substrings; live RPC stays __main__-only / out of CI"
    - "PITFALLS rule encoded as a module-level pure predicate (is_quarantined) so the test asserts the rule directly"

key-files:
  created:
    - schemas/impl_history_v1.md
    - tests/test_impl_history.py
    - .planning/phases/02-topic-implementation-provenance/02-FORWARD-NOTES.md
  modified: []

key-decisions:
  - "Upgraded-only listener is a DELIBERATE override of PITFALLS A2, defended by the head-block bytecode backstop (independent logic-change detector) — recorded as intentional scoping, not a gap"
  - "Bytecode backstop hashes the 18,507-byte IMPL, never the 130-byte proxy delegatecall stub ('hash the impl, never the proxy')"
  - "Deploy-block Upgraded establishes the floor row and is NOT quarantined; only a strictly-post-deploy Upgraded triggers the ±10-block unresolved_impl_transition quarantine (PITFALLS A1)"
  - "uint256/hash columns are pl.Utf8 only (event_schema_v1.md DTYPE SCOPE RULE); block-number columns are pl.UInt64"

patterns-established:
  - "Design-doc-as-contract: the schema .md is the LOCKED source of truth; tests pin its load-bearing phrases via read_text so a doc regression fails CI"
  - "Synthetic floor-only frame stands in for the eventual Phase-3 impl_history.parquet head segment"

requirements-completed: [IMPL-01]

# Metrics
duration: 4min
completed: 2026-05-29
---

# Phase 2 Plan 02: IMPL-01 implementation-history provenance Summary

**`impl_history.parquet` 9-column design with a deploy-block-corroborated floor row [283417317, ∞), an IMPL-bytecode backstop (0x13e721a6…, "hash the impl, never the proxy"), and a PITFALLS-A1 ±10-block quarantine that excludes the genesis Upgraded — Upgraded-only listening recorded as a deliberate A2 override defended by the backstop.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-05-29T22:51:51Z
- **Completed:** 2026-05-29T22:55:14Z
- **Tasks:** 3
- **Files modified:** 3 (all created)

## Accomplishments
- `schemas/impl_history_v1.md` documents the full 9-column contract (dtypes + nullability), the KPD-07 floor row corroborated by the real deploy-block `Upgraded`, the synthetic `deploy_floor` fallback, Upgraded-only segmentation, the head-row IMPL-bytecode backstop with the "hash the impl, never the proxy" anti-pattern, and the PITFALLS A1 ±10-block quarantine that excludes the deploy block.
- `tests/test_impl_history.py` (211 lines, 7 tests) pins the floor row, the backstop hash + "never the proxy" doc phrase + 130-byte/18,507-byte sizes, the `is_quarantined()` A1 predicate (deploy block quarantines nothing, post-deploy applies ±10), and the Supersedes-A2 Upgraded-only note. Reuses the Plan 02-01 keccak harness for the `Upgraded` topic0 with no new dependency.
- `02-FORWARD-NOTES.md` records the three cross-phase hand-offs: `responses` is state-fill-only via `getRequest` selector `0xc58343ef` (closes the EVENT-01 open question → Phase-3 INDEX-01), `CommitteeDepositFailed` is a structural invariant → BYTECODE-01/Phase-4, and the $75/mo Ormi Production no-auto-spend payment protocol → Phase-3 INDEX-01.
- Full suite green: 56 passed (49 Phase-1/02-01 baseline + 7 new IMPL-01 tests).

## Task Commits

Each task was committed atomically:

1. **Task 1: impl_history_v1.md design** - `db52d50` (feat)
2. **Task 2: tests/test_impl_history.py** - `a321c52` (test)
3. **Task 3: 02-FORWARD-NOTES.md** - `f465753` (docs)

_Note: Task 2 was a TDD task; the design doc from Task 1 already supplied every asserted constant, so RED and GREEN coincided in a single test-add commit (no implementation code to write — the parquet is design-only)._

## Files Created/Modified
- `schemas/impl_history_v1.md` - 9-column impl_history.parquet design contract (floor row, Upgraded-only segmentation, IMPL bytecode backstop, A1 quarantine, Supersedes-A2 note)
- `tests/test_impl_history.py` - IMPL-01 fixture tests (floor row, backstop, A1 quarantine, Upgraded-only segmentation; synthetic in-Python frame, no parquet read)
- `.planning/phases/02-topic-implementation-provenance/02-FORWARD-NOTES.md` - three cross-phase hand-offs

## Decisions Made
- None beyond the plan — all four load-bearing correctness points (IMPL-not-proxy backstop, Upgraded-only intentional A2 override, A1 deploy-block exclusion, Utf8-only id/hash dtypes) were specified in the plan and implemented exactly as written.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None. The Task-2 TDD RED step did not produce a transient failure because Task 1's design doc had already been committed with every constant the tests assert; this is expected for a design-doc-pinning test suite (the "implementation" is the doc, written in Task 1).

## User Setup Required
None - no external service configuration required. Phase 2 touches no paid infra; the $75/mo Ormi Production payment protocol is recorded in 02-FORWARD-NOTES.md and fires only at Phase 3 (INDEX-01) with explicit user confirmation.

## Next Phase Readiness
- IMPL-01 design contract is locked and test-pinned; Phase 3 (INDEX-01) can materialize `impl_history.parquet` directly against `schemas/impl_history_v1.md`.
- Three forward hand-offs are recorded for Phase 3 (responses state-fill-only; payment protocol) and Phase 4 (CommitteeDepositFailed rebate-residual prior).
- No blockers. Live re-verification (head-block bytecode hash, absence of post-deploy Upgraded) carries a 30-day soft window via `probes/somnia_rpc.py` (__main__-only).

## Self-Check: PASSED

- Files on disk: `schemas/impl_history_v1.md`, `tests/test_impl_history.py`, `.planning/phases/02-topic-implementation-provenance/02-FORWARD-NOTES.md`, `.planning/phases/02-topic-implementation-provenance/02-02-SUMMARY.md` — all FOUND.
- Commits present: `db52d50` (feat Task 1), `a321c52` (test Task 2), `f465753` (docs Task 3) — all FOUND.
- Full suite: `uv run pytest tests/` → 56 passed (49 baseline + 7 IMPL-01).
- Per-task verify gates: Task 1 four greps PASS; Task 2 `pytest tests/test_impl_history.py -x` 7 passed; Task 3 four greps PASS.

---
*Phase: 02-topic-implementation-provenance*
*Completed: 2026-05-29*
