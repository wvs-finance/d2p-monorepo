---
phase: 3
slug: subgraph-indexing
status: planned
nyquist_compliant: true
wave_0_complete: false
created: 2026-05-29
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Derived from `03-RESEARCH.md §Validation Architecture`. The defining constraint: the indexer **deploy + 36.3M-block backfill + multi-hour liveness/rollback observation** are inherently LIVE — they cannot be CI fixtures. CI validates the **logic** that processes their outputs (decode, structural-floor advisory, cursor-contiguity, ordering, liveness math) against synthetic fixtures + recorded constants (the established `probes/*.py` `__main__`-only convention); the live artifacts are produced by `__main__` probes and gate the phase at `/gsd:verify-work`.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest (uv-managed Python ≥ 3.12; polars 1.41.2) — Phase-1/2 harness, 56 green |
| **Config file** | `pyproject.toml` (`testpaths = ["tests"]`); `tests/conftest.py` (6 fixtures: scout_dir/schemas_dir/research_dir/load_yaml/load_json/read_text) |
| **Quick run command** | `uv run pytest tests/test_index01_*.py -x` |
| **Full suite command** | `uv run pytest tests/ -q` |
| **Subgraph build check** | `cd subgraphs/iagentrequester && graph codegen && graph build` (toolchain validity; LIVE/toolchain step, NOT a CI fixture unless graph-cli is vendored) |
| **Estimated runtime** | sub-second for the CI logic suite (no network); live probes are wall-clock-bound (backfill/observation) |

---

## Sampling Rate

- **After every task commit:** `uv run pytest tests/test_index01_*.py -x` (decode / structural-floor advisory / cursor-contiguity / ordering / liveness / constants logic)
- **After every plan wave:** full suite `uv run pytest tests/ -q` (56 + new INDEX-01 tests green)
- **Before `/gsd:verify-work`:** full suite green **AND** the four LIVE-ONLY artifacts produced + committed:
  - `indexing/completeness_proof.md` (three-leg gate against the REAL store; leg-b advisory+directional)
  - `indexing/ordering_verification.md` (tuple-for-tuple on real multi-log blocks)
  - `indexing/parity_report.md` (eth_getBlockReceipts parity over the stratified ≥300 windows + liveness window)
  - `.planning/scout/2026-05-29/rollback_observation.md` (≥1h safe_block_depth observation)
- **Max feedback latency:** < 1 task for CI logic (no 3-consecutive-task gap without an automated verify)

---

## Per-Task Verification Map

> Task IDs assigned by the planner; this maps the load-bearing behaviors to their CI module + Wave. CI-testable behaviors are Wave-0/Wave-1 gated; the LIVE-ONLY rows are phase-gate artifacts, not per-task CI.

| # | Behavior | Requirement | Test Type | Automated Command | CI? | Status |
|---|----------|-------------|-----------|-------------------|-----|--------|
| 1 | `getRequest` struct decode + Σ `responses[].executionCost` (selector `0xc58343ef`, Response field idx 5) against the SYNTHETIC-Success fixture (`tests/fixtures/getrequest_response.json`, NEVER re-frozen); the STRUCTURAL mis-slice guard is per-member executionCost ≤ per_agent_budget_native (element-wise) AND Σ == 200000000000000000 exactly — NOT a strict `0<Σ` (the REAL return is bound-checked NON-STRICT in 03-04 on the SEPARATE `tests/fixtures/getrequest_response_real.json`) | INDEX-01 | unit (synthetic RPC fixture) | `pytest tests/test_index01_decode.py::test_sum_execution_cost -x` | ✅ | ⬜ |
| 1b | STRUCTURAL mis-slice guard: a responses[3]=receipt-vs-responses[5]=executionCost mis-slice FAILS CI (per-member ≤ budget element-wise + exact-Σ match) WITHOUT conflating it with a legitimate zero-cost finalized request | INDEX-01 | unit | `pytest tests/test_index01_decode.py::test_structural_mis_slice_guard -x` | ✅ | ⬜ |
| 2 | uint256 ids → `pl.Utf8` round-trip (never Int64/Decimal(38,0)) | INDEX-01 | unit | `pytest tests/test_index01_decode.py::test_uint256_utf8 -x` | ✅ | ⬜ |
| 3 | wei amounts fit `pl.Decimal(38,0)` (≤38 digits) | INDEX-01 | unit | `pytest tests/test_index01_decode.py::test_wei_decimal_ok -x` | ✅ | ⬜ |
| 4 | leg-b structural-floor is ADVISORY + DIRECTIONAL — `structural_ratio_status` NEVER returns "halt"; flags "advisory_review" only when RequestCreated is materially BELOW RequestFinalized (rc < rf − TOL·max(rf,1)); the rc>rf in-flight finalization-lag tail is "ok" (never flagged); the descriptive count-ratio ÷ indexer's OWN distinct-tx is log-only (may exceed 1.0) and divide-by-zero guarded (max(·,1)) | INDEX-01 | unit | `pytest tests/test_index01_completeness.py::test_structural_floor_never_halts tests/test_index01_completeness.py::test_directional_advisory_fires_on_missing_request_created tests/test_index01_completeness.py::test_in_flight_tail_not_flagged -x` | ✅ | ⬜ |
| 5 | tx-anchor monotonicity floor: fresh `transactions_count` < 234999 FAILS, ≥ PASSES | INDEX-01 | unit | `pytest tests/test_index01_completeness.py::test_tx_anchor_floor -x` | ✅ | ⬜ |
| 6 | `cursor_contiguity` over the host's PROCESSED-block ranges (`_meta`) on `[deploy,head]` detects an injected skipped PROCESSED range (NOT a missing event-bearing block) | INDEX-01 | unit (synthetic ranges) | `pytest tests/test_index01_completeness.py::test_cursor_contiguity_detects_skipped_range -x` | ✅ | ⬜ |
| 7 | B3 invariant: every row `log_address == proxy`; foreign-address row rejected | INDEX-01 | unit | `pytest tests/test_index01_completeness.py::test_proxy_address_invariant -x` | ✅ | ⬜ |
| 8 | ordering: `(block_number, log_index)` tuple sequence matches recorded RPC on a synthetic multi-log block; ts is coarse-secondary (not sort key) | INDEX-01 | unit | `pytest tests/test_index01_ordering.py::test_tuple_ordering -x` | ✅ | ⬜ |
| 9 | parity-degradation: `get_block_receipts`→None falls back to `eth_getLogs` + flags weakened assurance | INDEX-01 | unit (mock) | `pytest tests/test_index01_parity.py::test_receipts_none_degrades -x` | ✅ | ⬜ |
| 10 | liveness gap math: gap>60 for 3 consecutive escalates; ≤60 does not | INDEX-01 | unit (pure logic) | `pytest tests/test_index01_liveness.py::test_gap_escalation -x` | ✅ | ⬜ |
| 11 | safe_block_depth rule: observed_max=0 → depth=1; observed>0 → max(1,observed+margin) | INDEX-01 | unit (pure logic) | `pytest tests/test_index01_liveness.py::test_safe_block_depth_rule -x` | ✅ | ⬜ |
| 12 | recorded constants present: deploy 283417317, selector 0xc58343ef, getLogs cap 1000, getBlockReceipts AVAILABLE | INDEX-01 | unit (fixture reads) | `pytest tests/test_index01_constants.py -x` | ✅ | ⬜ |
| 13 | manifest lint (03-03): proxy-pinned (never null, B3), startBlock 283417317, resolved-role handlers, non-lossy CommitteeDepositFailed fold under cap, README documents the LOSSLESS id_gt distinct-tx scan | INDEX-01 | unit (parse) | `pytest tests/test_index01_manifest.py -x` | ✅ | ⬜ |
| L1 | Subgraph deploys to Somnia mainnet + deploy-and-detach backfills 283417317→head (HARD STALL_DETECTED on hasIndexingErrors; ADVISORY STALL_ADVISORY on a no-progress compaction pause) | INDEX-01 | live deploy | `graph deploy …` then `_meta` query | ❌ LIVE | ⬜ |
| L2 | Three-leg completeness gate against the REAL indexed store (leg-b advisory+directional, never auto-halts) | INDEX-01 | live | `__main__` probe (subgraph + RPC + Blockscout) → `completeness_proof.md` | ❌ LIVE | ⬜ |
| L3 | Real liveness window (head-lag <60, ≥99% of polls, few hours) — run AFTER sync-complete | INDEX-01 | live observation | `__main__` poll loop → `parity_report.md` | ❌ LIVE | ⬜ |
| L4 | `safe_block_depth` rollback observation (≥1h) — run AFTER sync-complete | INDEX-01 | live observation | `__main__` head-watch → `rollback_observation.md` | ❌ LIVE | ⬜ |
| L5 | Per-chunk REALIZED-RAMP conservative projected-overage (small-denominator guarded); pause + surface if >300k (no auto-spend) | INDEX-01 | live | `__main__` GraphQL block-range count + realized-ramp re-projection | ❌ LIVE | ⬜ |
| L6 | REAL getRequest return re-frozen to the SEPARATE `tests/fixtures/getrequest_response_real.json` (decoded per-member displayed, sum recomputed, NON-STRICT `0 <= sum <= subSize × perAgentBudget` — a zero-cost Failed/TimedOut finalized request is legitimate) | INDEX-01 | live → frozen | `__main__` fill-cost re-freeze, then `pytest tests/ -q` | ❌ LIVE | ⬜ |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

All INDEX-01 CI logic is new — no existing module covers it. Wave 0 scaffolds:

- [ ] `tests/test_index01_decode.py` — `getRequest` tuple decode + Σ executionCost (SYNTHETIC-Success fixture) + the STRUCTURAL mis-slice guard (per-member executionCost ≤ per_agent_budget_native element-wise AND Σ == 200000000000000000 exactly — NOT a strict `0<Σ`, which would false-reject a legitimate zero-cost finalized request) + uint256→Utf8 + wei→Decimal(38,0) dtype discipline
- [ ] `tests/test_index01_completeness.py` — leg-b ADVISORY+DIRECTIONAL structural-floor (`structural_ratio_status` NEVER returns "halt"; "advisory_review" only on rc < rf − TOL·max(rf,1); rc>rf in-flight tail "ok"; descriptive count-ratio log-only + divide-by-zero guarded), tx-anchor monotonicity floor, `cursor_contiguity` over PROCESSED ranges (skipped-range detection), B3 proxy-address invariant
- [ ] `tests/test_index01_ordering.py` — `(block_number, log_index)` tuple ordering + coarse-secondary timestamp
- [ ] `tests/test_index01_parity.py` — receipts-None degradation fallback
- [ ] `tests/test_index01_liveness.py` — gap escalation + safe_block_depth rule
- [ ] `tests/test_index01_constants.py` — recorded-constant assertions (deploy block, selector, caps) against scout/matrix
- [ ] `tests/test_index01_manifest.py` (03-03) — static manifest lint (proxy-pinned B3, startBlock, resolved-role handlers, non-lossy fold, README id_gt scan)
- [ ] `tests/fixtures/getrequest_response.json` — SYNTHETIC-Success `getRequest` raw return (3 successful responses, Σ=0.2 SOMI); the structural mis-slice tripwire, NEVER re-frozen (the REAL return goes to the SEPARATE `tests/fixtures/getrequest_response_real.json` produced by the 03-04 live fill, bound-checked NON-STRICT)
- [ ] `probes/somnia_rpc.py` — add `get_request(request_id, block)` helper (selector `0xc58343ef`, `__main__`-only live call)
- [ ] graph-cli / graph-ts NOT vendored — `graph codegen && graph build` is a LIVE/toolchain step, documented as non-CI

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual / Live | Test Instructions |
|----------|-------------|-------------------|-------------------|
| Subgraph deploy + 36.3M-block deploy-and-detach backfill | INDEX-01 | Inherently a live deploy against Ormi/Somnia mainnet; no CI fixture can stand in | `graph deploy` to the Somnia-mainnet slug (deploy-probe), poll `_meta.block.number` to head; HARD STALL_DETECTED on hasIndexingErrors, ADVISORY STALL_ADVISORY on a compaction pause |
| Three-leg completeness gate (real store) | INDEX-01 | Requires the REAL backfilled store + live Blockscout `transactions_count` + RPC recount | `__main__` probe → `indexing/completeness_proof.md` (leg a/b/c; leg-b advisory+directional, never auto-halts) |
| Liveness window (few hours) | INDEX-01 | Wall-clock observation of head-lag over real chain head | `__main__` poll every 5 min → `indexing/parity_report.md` |
| `safe_block_depth` rollback (≥1h) | INDEX-01 / KPD-09-empirical | Wall-clock head-watch for reorg depth | `__main__` head-watch → `.planning/scout/2026-05-29/rollback_observation.md` |
| Per-chunk projected-overage entity check | INDEX-01 | Requires live entity counts from the deployed subgraph | `__main__` GraphQL block-range count + REALIZED-RAMP re-projection (small-denominator guarded) after each 1M-block chunk; pause + surface if projection > 300k (no auto-spend) |
| REAL getRequest re-freeze (NON-STRICT bound) | INDEX-01 | Requires a real finalized request from the live store | `__main__` fill-cost captures one real return → `tests/fixtures/getrequest_response_real.json` (separate from the synthetic fixture; decoded per-member displayed, sum recomputed, `0 <= sum <= subSize × perAgentBudget`) |

---

## Validation Sign-Off

- [x] All CI-testable tasks have an `<automated>` verify or a Wave-0 dependency
- [x] LIVE-only behaviors explicitly separated (deploy/backfill/observe cannot be CI fixtures) — logic that processes their output IS CI-tested
- [x] Sampling continuity: no 3 consecutive tasks without an automated verify
- [x] Wave 0 covers the 7 new test modules + the SYNTHETIC `getRequest` fixture + the `get_request` probe helper (the REAL fixture is a separate 03-04 live output)
- [x] No watch-mode flags
- [x] Two-fixture split recorded: synthetic (`getrequest_response.json`, strict structural guard, never re-frozen) vs real (`getrequest_response_real.json`, NON-STRICT bound, 03-04 live output)
- [x] leg-b recorded as ADVISORY + DIRECTIONAL (never auto-halts; ROADMAP SC#6(b)); the Wilson band is RETIRED
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** planner-input 2026-05-29; synced 2026-05-30 to the final test names (structural-floor advisory + `cursor_contiguity` + two-fixture split) per planning-review gate #3 (still pending the CLAUDE.md three-step plan-review gate before execution).
