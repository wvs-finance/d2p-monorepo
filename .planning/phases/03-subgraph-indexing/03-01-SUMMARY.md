---
phase: 03-subgraph-indexing
plan: 01
subsystem: indexing
tags: [eth-abi, polars, getRequest, executionCost, dtype-discipline, uint256, decimal38]

# Dependency graph
requires:
  - phase: 01-data-sourcing
    provides: "EVENT-01 DTYPE SCOPE RULE (uint256→Utf8, wei≤38→Decimal(38,0)); probes/somnia_rpc.py (_rpc/_hex_int/PROXY/DEPLOYMENT_BLOCK/GETLOGS_MAX_WINDOW); conftest N2 fixture contract; scout archive (deployment_block.md, rpc_capability_probe.md); research/data_sourcing_matrix.yaml"
  - phase: 02-topic-provenance
    provides: "02-FORWARD-NOTES responses-are-state-fill-only via getRequest(uint256) selector 0xc58343ef (no ResponseReceived event)"
provides:
  - "indexing/decode.py — pure, network-free getRequest tuple-decode + Σ responses[].executionCost (aggregate-only, decision 1) + uint256→Utf8 + wei→Decimal(38,0) helpers"
  - "probes/somnia_rpc.py::get_request(request_id, block) — live eth_call helper (selector 0xc58343ef), __main__/probe-only, read-at-finalized-block documented (Pitfall 3)"
  - "tests/fixtures/getrequest_response.json — FROZEN SYNTHETIC-Success getRequest fixture (3-member SUCCESS, Σ=0.2 SOMI), the structural mis-slice tripwire; NEVER re-frozen"
  - "STRUCTURAL mis-slice guard (per-member executionCost ≤ per_agent_budget element-wise AND Σ == 200000000000000000 exactly) — strict 0<Σ deliberately dropped"
  - "recorded-constant assertions (deploy block 283417317, selector 0xc58343ef, getLogs cap 1000, getBlockReceipts AVAILABLE) vs scout + matrix + probe"
affects: [03-04-live-state-fill, 04-bytecode-rebate, 05-panel-materialization]

# Tech tracking
tech-stack:
  added: []   # eth-abi 5.2.0 + polars 1.41.2 already dev deps from prior phases
  patterns:
    - "Network-free CI decode against a FROZEN synthetic fixture; live network confined to probe __main__ blocks"
    - "STRUCTURAL guard (per-member≤budget + exact-Σ) instead of strict aggregate 0<Σ to avoid false-rejecting legitimate zero-cost Failed/TimedOut finalized requests"
    - "Named index constants (RESPONSE_EXECUTION_COST_INDEX=5, RESPONSE_RECEIPT_INDEX=3) pin the Pitfall-3 receipt-vs-cost trap at the decode site"

key-files:
  created:
    - indexing/__init__.py
    - indexing/decode.py
    - tests/fixtures/getrequest_response.json
    - tests/test_index01_decode.py
    - tests/test_index01_constants.py
  modified:
    - probes/somnia_rpc.py

key-decisions:
  - "Aggregate-only Σ executionCost (03-CONTEXT decision 1) made executable as a pure decode path; per-member costs exposed solely for the structural guard"
  - "Strict aggregate 0<Σ bound DROPPED — a legitimate Failed/TimedOut finalized request has Σ=0; its non-strict real-return bound is a SEPARATE 03-04 fixture (getrequest_response_real.json)"
  - "uint256/hash ids → pl.Utf8 ONLY (78 digits > Decimal128's 38, proven empirically); bounded wei ≤38 digits → pl.Decimal(38,0)"
  - "Synthetic fixture carries DISTINCT large receipts (>budget) so a responses[3]-vs-responses[5] mis-slice trips BOTH guard legs and is detectable"

patterns-established:
  - "Two-fixture rule: synthetic fixture (this plan) is the structural tripwire and is NEVER re-frozen; the REAL recorded return is a distinct 03-04 file"
  - "TDD for the decode module (RED test commit → GREEN feat commit)"

requirements-completed: [INDEX-01]

# Metrics
duration: ~15min (verification + wrap-up; task commits authored 14:29–14:32)
completed: 2026-05-30
---

# Phase 3 Plan 01: INDEX-01 Wave 0 — getRequest Decode Surface Summary

**Pure, network-free `getRequest`→`Σ responses[].executionCost` decode (eth-abi) with uint256→Utf8 / wei→Decimal(38,0) dtype discipline, a FROZEN synthetic-Success fixture as the structural mis-slice tripwire, the live `get_request` probe helper (selector `0xc58343ef`), and recorded-constant assertions — all CI-fixtured, no live network.**

## Performance

- **Duration:** ~15 min (verification + wrap-up this session; the four task commits were authored 2026-05-30 14:29–14:32)
- **Started:** 2026-05-30 (verification session)
- **Completed:** 2026-05-30
- **Tasks:** 3 (Task 2 is TDD: RED + GREEN)
- **Files modified:** 6 (5 created + 1 modified)

## Accomplishments

- `indexing/decode.py` (new `indexing/` package): `decode_get_request`, `sum_execution_cost`, `per_member_execution_costs`, `to_uint256_utf8`, `wei_to_decimal_str` — all pure (no network, no file IO); `REQUEST_TUPLE_TYPE` eth_abi string + named index constants pin the receipt(idx3)-vs-executionCost(idx5) Pitfall-3 trap.
- `probes/somnia_rpc.py::get_request(request_id, block)` — `eth_call` of `getRequest(uint256)` selector `0xc58343ef` on the proxy, returns the raw ABI-encoded `Request` tuple hex; read-at-finalized-block (Pitfall 3) documented; network-touching only from `__main__`/Plan 03-04, plus a guarded `__main__` demo line.
- `tests/fixtures/getrequest_response.json` — FROZEN SYNTHETIC-Success object (3-member SUCCESS `Response[]`, per-member executionCosts 0.03/0.07/0.10 SOMI → Σ=0.2 SOMI = `200000000000000000`, each ≤ `per_agent_budget_native`=0.1 SOMI; DISTINCT large receipts each > budget so the mis-slice is detectable); documents the NEVER-re-frozen / synthetic-only contract and points the real return at 03-04's separate file.
- `tests/test_index01_decode.py` (5 tests): Σ executionCost, uint256→Utf8 round-trip + empirical `pl.Decimal(38,0)` rejection of the 78-digit value, wei→Decimal(38,0) construction, the STRUCTURAL mis-slice guard (per-member≤budget element-wise AND exact-Σ match, with strict `0<Σ` intentionally dropped), and the selector/index constants.
- `tests/test_index01_constants.py` (4 tests): deploy block 283417317 (probe + scout), getRequest selector `0xc58343ef` (probe + decode), getLogs cap 1000, getBlockReceipts AVAILABLE (scout + matrix truthy-pass row).

## Task Commits

Each task was committed atomically (LOCAL only — per CLAUDE.md fork/upstream workflow, push deferred to the user):

1. **Task 1: get_request probe helper + frozen SYNTHETIC-Success fixture** — `e39be84` (feat)
2. **Task 2: pure decode + dtype-discipline module (TDD)** — `400c485` (test, RED) → `476cec7` (feat, GREEN)
3. **Task 3: recorded-constant assertions** — `b57e71c` (test)

**Plan metadata:** committed with this SUMMARY + STATE.md + ROADMAP.md (docs: complete 03-01).

_Note: Task 2 is TDD (RED test commit → GREEN feat commit), per the plan's `tdd="true"`._

## Files Created/Modified

- `indexing/__init__.py` — new top-level `indexing/` package marker.
- `indexing/decode.py` — pure getRequest tuple-decode + Σ executionCost + per-member + dtype-discipline helpers; `GETREQUEST_SELECTOR`, `REQUEST_TUPLE_TYPE`, the three index constants.
- `probes/somnia_rpc.py` — added `get_request(request_id, block)` (selector `0xc58343ef`) + guarded `__main__` demo line.
- `tests/fixtures/getrequest_response.json` — FROZEN synthetic-Success getRequest return + the structural-guard metadata.
- `tests/test_index01_decode.py` — decode/dtype/structural-guard CI tests (synthetic fixture only; never reads the 03-04 real fixture).
- `tests/test_index01_constants.py` — recorded-constant assertions vs scout + matrix + probe.

## Decisions Made

- Aggregate-only Σ executionCost (03-CONTEXT decision 1) implemented as a pure decode path; `per_member_execution_costs` exists only to power the structural guard.
- The strict aggregate `0<Σ` bound is deliberately NOT asserted — a legitimate Failed/TimedOut finalized request legitimately has Σ=0; its non-strict real-return bound is a 03-04 concern on the SEPARATE `getrequest_response_real.json`. The mis-slice is caught STRUCTURALLY instead (per-member≤budget element-wise AND exact-Σ match), which a responses[3]=receipt mis-slice violates without conflating with a legitimate zero.
- uint256/hash ids are `pl.Utf8` ONLY (proven empirically: `pl.Series([2**256-1], dtype=pl.Decimal(38,0))` raises); bounded wei ≤38 digits may use `pl.Decimal(38,0)`.

## Deviations from Plan

None - plan executed exactly as written. All four task commits match the plan's actions, the probe `get_request` helper was already present in the form the plan specifies (selector `0xc58343ef`, `__main__`-only, Pitfall-3 docstring), and every `<verify><automated>` gate and acceptance-criteria grep passes.

## Issues Encountered

- The four 03-01 task commits (`e39be84`, `400c485`, `476cec7`, `b57e71c`) were authored in a prior session alongside Phase 03-02 work; this session VERIFIED them against the full success criteria (every automated gate + acceptance grep + the cross-file selector grep), confirmed the suite green, confirmed the 03-04 real fixture is correctly absent, and completed the wrap-up (SUMMARY + STATE + ROADMAP + requirement marking). Same verify-then-wrap-up pattern recorded for Phases 1/2.
- `gsd-tools` `state`/`roadmap` subcommands do not parse this STATE.md heading format (documented in prior phases) — Current Position / progress bars / Roadmap-Summary row / decision / session were edited by hand; `requirements mark-complete INDEX-01` and `state update-progress` attempted via tooling.

## User Setup Required

None - no external service configuration required by 03-01. (The $75/mo Ormi no-auto-spend payment protocol from 02-FORWARD-NOTES is a later-in-Phase-3 / 03-04 live-source concern, not triggered by this CI-fixtured plan.)

## Next Phase Readiness

- The CI-fixtured decode path is ready for Plan 03-04's LIVE state-fill: 03-04 calls `probes.somnia_rpc.get_request` at the finalized block, feeds the raw return through `indexing.decode.decode_get_request` + `sum_execution_cost`, and bound-checks the REAL return NON-STRICT against the SEPARATE `tests/fixtures/getrequest_response_real.json` (which must NOT be created in this plan — confirmed absent).
- No blockers. Full suite green (91 tests; 9 of them INDEX-01 decode/constants).

## Self-Check: PASSED

- All 6 created/modified files present on disk (indexing/__init__.py, indexing/decode.py, probes/somnia_rpc.py, tests/fixtures/getrequest_response.json, tests/test_index01_decode.py, tests/test_index01_constants.py) + this SUMMARY.
- All 4 task commits present in history: `e39be84`, `400c485`, `476cec7`, `b57e71c`.
- Full suite green: 91 passed (9 of them INDEX-01 decode/constants).
- 03-04 real fixture `tests/fixtures/getrequest_response_real.json` correctly ABSENT (not this plan's job).

---
*Phase: 03-subgraph-indexing*
*Completed: 2026-05-30*
