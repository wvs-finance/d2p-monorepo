---
phase: 03-subgraph-indexing
plan: 02
subsystem: backend
tags: [index-01, completeness, ordering, parity, liveness, pure-logic, advisory-floor, cursor-contiguity, tdd]

# Dependency graph
requires:
  - phase: 02-01
    provides: "schemas/topic0_map_v1.json — RESOLVED topic0 roles (RequestCreated=0xb623, RequestFinalized=0x65db, CommitteeDepositFailed=0x5c09) used as leg-b's advisory-floor operands"
  - phase: 01
    provides: "probes/somnia_rpc.py (head_block, get_block_receipts→None signal, get_logs) + probes/blockscout.py (tx_count→234999 anchor) interface contracts; tests/conftest.py N2 fixtures; somnia_finality_semantics.md (safe_block_depth=1 provisional); event_count_addendum.md (234999 tx anchor, 1:1:1 in-sample-only, resolved-roles reconciliation)"
  - phase: 03-roadmap
    provides: "ROADMAP SC#6(b) — leg-b non-blocking; legs (a)+(c) bind; decision 4 (proceed+log)"
provides:
  - "indexing/completeness.py — 3-leg completeness: leg-b ADVISORY+DIRECTIONAL structural_ratio_status (NEVER halts) + descriptive_count_ratio (div-by-zero guarded) + count_balance + tx_anchor_ok + cursor_contiguity (over PROCESSED ranges) + is_proxy_row B3 invariant"
  - "indexing/ordering.py — arrival_sort_key((block_number, log_index)-only, ts coarse-secondary) + verify_ordering tuple-for-tuple verifier"
  - "indexing/parity.py — parity_reference receipts-None → eth_getLogs fallback flagging weakened_to_contiguity"
  - "indexing/liveness.py — should_escalate (gap>60 ×3 consecutive) + safe_block_depth (0→1; else max(1,observed+margin))"
  - "four tests/test_index01_{completeness,ordering,parity,liveness}.py CI modules (26 tests) — pure, network-free"
affects: [phase-3-03-subgraph-fold, phase-3-04-live-probes, panel-01]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure-logic validation engine — completeness/ordering/parity/liveness MATH tested independently of the live deploy (CI-vs-LIVE boundary, 03-VALIDATION.md); same functions called by the Plan 03-04 LIVE probes"
    - "ADVISORY + DIRECTIONAL anomaly floor — structural_ratio_status returns only {ok, advisory_review}, provably NEVER halt; one-directional rc<rf−TOL·max(rf,1) flag, the rc>rf in-flight tail expected and never flagged"
    - "Dependency injection for purity — get_logs_fn is injected into parity_reference so no logic module imports urllib/RPC; live network stays in probes/* __main__ only"
    - "Anti-circularity — leg-b's descriptive ratio denominator is the indexer's OWN distinct-tx (max(·,1)-guarded), NEVER the external 234999 anchor"

key-files:
  created:
    - indexing/completeness.py
    - indexing/ordering.py
    - indexing/parity.py
    - indexing/liveness.py
    - tests/test_index01_completeness.py
    - tests/test_index01_ordering.py
    - tests/test_index01_parity.py
    - tests/test_index01_liveness.py
  modified:
    - indexing/__init__.py

key-decisions:
  - "leg-b is ADVISORY + DIRECTIONAL and NEVER auto-halts (gate-review #3 MAJOR-1, faithful to ROADMAP SC#6(b)): structural_ratio_status returns 'advisory_review' for HUMAN REVIEW only when rc < rf − TOL·max(rf,1) (the missing-RequestCreated direction); the rc>rf in-flight finalization-lag tail is EXPECTED and never flagged; a symmetric abs() test was REJECTED because it false-flags the normal tail"
  - "the Wilson proportion band [0.628,0.790]/point 0.716 is RETIRED as the operative gate (0xb623 fires 1–5×/tx → its COUNT ÷ distinct-tx is a count ratio that can exceed 1.0, dimensionally not a Bernoulli proportion); kept only as the documented DESCRIPTIVE_RATIO_REFERENCE 'NOT a gate' figure"
  - "leg-c is cursor_contiguity over the host's PROCESSED-block ranges (_meta), NOT event-block interval-fill — at ~0.0005 RequestCreated/block most blocks carry no proxy log, so event-block contiguity would flood false gaps; completeness-bearing only conjoined with leg-a"
  - "the descriptive count-ratio denominator is the indexer's OWN distinct-tx count (max(indexer_distinct_tx,1) div-by-zero guard), NEVER the external 234999 (anti-circularity); the ratio is LOG-AND-EMIT only, never a gate"
  - "RESOLVED topic0 roles from topic0_map_v1.json (RequestCreated=0xb623, RequestFinalized=0x65db) — NOT the scout addendum's INVERTED labels; the 'request pair (0x65db+0x5c09)' was the finalization pair"
  - "the 1:1:1 / 83/83/83 balance is the addendum's IN-SAMPLE-ONLY disclaimed figure; the exact RequestCreated lifetime count is an INDEX-01 output, never a pre-known constant"

patterns-established:
  - "TDD RED→GREEN per task — each task pairs a failing-test commit then a minimal-implementation commit (six commits across three tasks)"
  - "Recorded-constant + synthetic-fixture CI — pure-Python logic tests need no fixtures; the conftest N2 fixtures remain available for any artifact read"

requirements-completed: [INDEX-01]

# Metrics
duration: 3min
completed: 2026-05-30
---

# Phase 3 Plan 02: INDEX-01 Pure-Logic Validation Engine Summary

**The network-free completeness/ordering/parity/liveness MATH for INDEX-01's correctness gates — leg-b is an ADVISORY + DIRECTIONAL structural floor that provably NEVER returns "halt" (flags "advisory_review" for human review only in the missing-RequestCreated direction rc < rf − TOL·max(rf,1)), the Wilson band is RETIRED, leg-c is cursor-contiguity over the host's PROCESSED ranges, and every function is the exact tested code path the Plan 03-04 LIVE probes call.**

## Performance

- **Duration:** ~3 min (six TDD commits 14:29–14:32 -0400)
- **Started:** 2026-05-30T18:29:17Z
- **Completed:** 2026-05-30T18:32:33Z
- **Tasks:** 3 (all TDD)
- **Files modified:** 9 (8 created, 1 package `__init__` modified)

## Accomplishments

- **Task 1 — `indexing/completeness.py` (195 lines):** the 3-leg completeness logic.
  - `structural_ratio_status(rc, rf, indexer_distinct_tx) -> str` — the leg-b ADVISORY+DIRECTIONAL floor. Returns `"advisory_review"` iff `rc < rf - STRUCTURAL_TOLERANCE·max(rf,1)` (missing-RequestCreated direction), else `"ok"`. There is no `"halt"` branch in the function body, so the never-halt invariant is structural, not just tested.
  - `descriptive_count_ratio(rc, indexer_distinct_tx) -> float` — `rc / max(indexer_distinct_tx, 1)` (MINOR-1 div-by-zero guard); LOG-AND-EMIT only, may exceed 1.0, never gates; denominator is the indexer's OWN distinct-tx (anti-circularity, never 234999).
  - `count_balance(rc, rf) -> float` — the SIGNED `(rc−rf)/max(rf,1)` INDEX-01 output.
  - `tx_anchor_ok(fresh_tx_count) -> bool` — leg-a monotonicity floor (`≥ TX_ANCHOR_FLOOR = 234999`).
  - `cursor_contiguity(processed_ranges, deploy, head) -> list[tuple]` — leg-c missing-PROCESSED-range detector over `[deploy, head]` (host-cursor advancement, NOT event-block presence).
  - `is_proxy_row(log_address) -> bool` — B3 invariant (lowercased `== PROXY`).
  - `STRUCTURAL_TOLERANCE = 0.15` (directional advisory threshold), `DESCRIPTIVE_RATIO_REFERENCE = 0.716` (retired-band reference, not a gate), resolved `REQUEST_CREATED_TOPIC0`/`REQUEST_FINALIZED_TOPIC0` constants. Module docstring cites "ROADMAP SC#6(b) correction 2026-05-29 / topic0_map_v1.json", records the inverted-label reconciliation, the in-sample-only 1:1:1 disclaimer, the Wilson-retirement, and the MINOR-5 CommitteeDepositFailed note.
- **Task 2 — `indexing/ordering.py` + `indexing/parity.py`:** `arrival_sort_key` returns `(block_number, log_index)` ONLY (never includes `block_ts_utc`); `verify_ordering` does tuple-for-tuple equality against a recorded RPC sequence; `parity_reference` returns `degraded=True, mechanism="eth_getLogs", assurance="weakened_to_contiguity"` on `receipts is None`, else `degraded=False, mechanism="eth_getBlockReceipts", assurance="full"` (`get_logs_fn` injected — no real network).
- **Task 3 — `indexing/liveness.py`:** `should_escalate(gaps)` — True iff a run of `CONSECUTIVE=3` consecutive polls each `> GAP_THRESHOLD=60`; `safe_block_depth(observed_max, margin=1)` — `observed_max==0 → 1` (PBFT provisional) else `max(1, observed_max + margin)`.
- **Tests:** four `tests/test_index01_*.py` modules, 26 tests, all green — including the critical-constraint tests `test_structural_floor_never_halts` (matrix of (rc,rf) pairs, verdict ∈ {ok, advisory_review}, never halt), `test_directional_advisory_fires_on_missing_request_created`, `test_in_flight_tail_not_flagged`, `test_count_ratio_over_1_does_not_flag`, `test_descriptive_ratio_zero_division_guard`, `test_cursor_contiguity_detects_skipped_range`, `test_proxy_address_invariant`.
- **Full suite green: 91 passed** (65 prior baseline + 26 new 03-02 tests), 0 failures, no live network in any new module.

## Validation-row coverage

Maps 03-VALIDATION.md rows #4 (leg-b advisory+directional structural floor), #5 (tx-anchor floor), #6 (cursor-contiguity), #7 (B3 invariant), #8 (ordering), #9 (parity degradation), #10 (liveness gap), #11 (safe_block_depth). These are the tested functions the Plan 03-04 LIVE probes call to emit the `indexing/*.md` artifacts.

## Deviations from Plan

None — plan executed exactly as written. All three tasks completed via TDD (RED→GREEN per task), every per-task `<verify><automated>` gate passed, and every `<acceptance_criteria>` grep gate passed. No deviation rules (1–4) triggered; no authentication gates encountered; no architectural changes needed.

## Commits (LOCAL only — NOT pushed)

| Task | Phase | Commit | Type | Message |
| ---- | ----- | ------ | ---- | ------- |
| 1 | RED | `84ed735` | test | add failing tests for 3-leg completeness logic (leg-b advisory+directional, never halts) |
| 1 | GREEN | `181e1c2` | feat | implement 3-leg completeness logic (leg-b advisory+directional, never halts) |
| 2 | RED | `ad1332f` | test | add failing tests for ordering tuple-verifier + parity degradation |
| 2 | GREEN | `dada16b` | feat | implement ordering tuple-verifier + parity-degradation logic |
| 3 | RED | `1e4d919` | test | add failing tests for liveness gap-escalation + safe_block_depth |
| 3 | GREEN | `c38111f` | feat | implement liveness gap-escalation + safe_block_depth logic |

## Self-Check: PASSED

- All 8 created files + SUMMARY.md present on disk.
- All 6 task commits (`84ed735`, `181e1c2`, `ad1332f`, `dada16b`, `1e4d919`, `c38111f`) present in `git log`.
- Full suite green: 91 passed, 0 failed.
- `structural_ratio_status` body has no `"halt"` return branch (never-halt invariant is structural, not just tested).
- All per-task `<verify><automated>` gates and `<acceptance_criteria>` grep gates re-verified PASS.
