---
phase: 01-data-sourcing-gate-pre-flight-addendum-schema-foundations
plan: 03
subsystem: infra
tags: [data-sourcing, ormi, subgraph, getblock, capability-matrix, sufficiency-bars, wilson-ci, pytest, yaml]

# Dependency graph
requires:
  - phase: 01 (plan 01-01)
    provides: uv/pytest harness + N2 conftest fixtures (research_dir, load_yaml); KPD-16 scout archive; INDEX-01 startBlock 283417317
provides:
  - "research/data_sourcing_matrix.yaml — fixed-schema (7-key) capability matrix, 18 provenance-stamped rows, four numeric sufficiency bars, provisional verdict, three deferred items pinned"
  - "research/DATA_SOURCING.md — recommendation memo: Supersedes corrections, provisional Ormi-free verdict, full cost-of-ownership table, real SC#7(iv) budget-vs-completeness reconciliation, sign-off section"
  - "tests/test_data_sourcing_matrix.py + tests/test_sufficiency_bars.py — schema-conformance + provenance + four-bar verdict logic (any single free-tier fail flips to paid)"
  - "DATA-SOURCE-01 provisional free-vs-paid verdict — UNBLOCKS Phase 3 INDEX-01"
affects: [INDEX-01, TOPIC-01, Phase-3-completeness-gate, FX-01, SHARED-SCHEMA-01]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Fixed-row-schema YAML matrix: every capability row carries exactly {source, capability, value, threshold, pass, source_url, utc_fetch_ts}; test enforces the exact key set"
    - "Sufficiency-bar verdict as a pure function free_tier_sufficient(bars)=all-pass, tested by flipping each bar individually"
    - "Leg-(b) tolerance band committed as the RAW Wilson 95% CI; cross-epoch widening kept as a separate deferred sibling key, never folded into the interval"

key-files:
  created:
    - research/data_sourcing_matrix.yaml
    - research/DATA_SOURCING.md
    - tests/test_data_sourcing_matrix.py
    - tests/test_sufficiency_bars.py
  modified: []

key-decisions:
  - "Provisional verdict ormi-free-developer ($0); free pick commits no spend -> no sign-off required (sign_off_required: false). A FORCED paid crossing (Ormi Production $75 if 300k-entity cap exceeded, or GetBlock $39 archive) is surfaced as a user_setup item requiring explicit sign-off before provisioning — no auto-spend."
  - "Leg-(b) band pinned EXACTLY to the raw round-half-up Wilson 95% CI [0.628, 0.790] (basis wilson_95ci_n116); cross_epoch_widening deferred_to_phase_3 as a separate sibling note, NOT applied to the interval."
  - "SC#7(iv) coherence is a REAL reconciliation: x402 free-tier discipline = paid-API BUDGET gate (modeled-not-paid) vs DATA-SOURCE-01 = COMPLETENESS-sufficiency gate; paying for real SOMI data is a JUSTIFIED DEPARTURE (real-or-nothing), not a violation; free-vs-paid does NOT change source-agnostic SHARED-SCHEMA-01 intersection columns."

patterns-established:
  - "Provenance discipline: every matrix row source_url + utc_fetch_ts (KPD-16 convention), test_provenance_complete enforces non-empty"
  - "Recommendation-memo shape for spend decisions: Supersedes -> Verdict -> bars -> cost-of-ownership -> reconciliation -> deferred -> sign-off"

requirements-completed: [DATA-SOURCE-01]

# Metrics
duration: 4min
completed: 2026-05-29
---

# Phase 1 Plan 03: DATA-SOURCE-01 Provisional Free-vs-Paid Verdict Summary

**Machine-checkable Somnia capability matrix + recommendation memo selecting Ormi free Developer ($0) as INDEX-01's provisional host, with four numeric sufficiency bars (leg-(b) raw Wilson CI [0.628, 0.790]), a full under-$390 cost-of-ownership table, and the real budget-vs-completeness reconciliation against abrigo-x402 — Phase 3 INDEX-01 unblocked.**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-05-29T21:25:44Z
- **Completed:** 2026-05-29T21:29:38Z
- **Tasks:** 3
- **Files created:** 4

## Accomplishments
- `research/data_sourcing_matrix.yaml` — fixed-schema (7-key) capability matrix, 18 live-probed/provenance-stamped rows (chain_id, eth_getLogs 1000-block cap, eth_getBlockReceipts AVAILABLE, full-archive depth, ~100.7ms cadence, whole-second timestamp, 36.3M backfill span, deploy block 283417317, 234999 tx anchor, scout structural-ratio provenance, all Ormi free-tier rows, CoinGecko candle-CLOSE), four numeric sufficiency bars, provisional verdict, three deferred items pinned.
- `research/DATA_SOURCING.md` — 184-line recommendation memo: Supersedes (3 overturned premises), provisional Ormi-free verdict with forced-paid-crossing sign-off path, cost-of-ownership table for all paid classes incl. INDEX-01 re-author cost, the real SC#7(iv) reconciliation (JUSTIFIED DEPARTURE / real-or-nothing), abrigo-analytics no-oracle + stop-gap cross-check, sign-off section.
- Two test modules (7 tests) enforcing fixed-schema/provenance/mandatory-rows/verdict and the four-bar logic (flipping any single bar to fail flips to the paid branch) + the leg-(b) Wilson-CI basis with deferred widening.
- Full suite green: 31 tests pass (`uv run pytest tests/ -q`).

## Task Commits

Each task committed atomically (local only; push deferred to user per CLAUDE.md fork/upstream workflow):

1. **Task 1: data_sourcing_matrix.yaml (fixed-schema capability matrix + sufficiency bars)** - `8c1dd94` (feat)
2. **Task 2: DATA_SOURCING.md (recommendation memo + coherence reconciliation + sign-off)** - `abb9f0f` (feat)
3. **Task 3: matrix schema-conformance + sufficiency-bar logic tests** - `d731e9f` (test)

**Plan metadata:** (this SUMMARY + STATE/ROADMAP/REQUIREMENTS) committed separately.

## Files Created/Modified
- `research/data_sourcing_matrix.yaml` - machine-checkable capability matrix (fixed 7-key schema, 18 rows), four sufficiency bars, provisional verdict, deferred items.
- `research/DATA_SOURCING.md` - prose recommendation memo (verdict, cost-of-ownership, real reconciliation, sign-off).
- `tests/test_data_sourcing_matrix.py` - fixed-schema + provenance + mandatory-rows + verdict tests.
- `tests/test_sufficiency_bars.py` - four-bar pass/fail logic + free-fail-flips-paid + leg-(b) Wilson-CI basis.

## Decisions Made
- **Verdict provisional Ormi-free, no sign-off for the free pick.** Per CONTEXT, only spend requires sign-off; $0 does not. The forced paid crossing (Ormi Production $75 at 300k-entity cap, or GetBlock $39 archive) is surfaced as the `user_setup` item and gated on explicit sign-off — no auto-decision of spend.
- **Leg-(b) band committed EXACTLY as the raw round-half-up Wilson 95% CI [0.628, 0.790]** (not [0.627, 0.791]); cross-epoch widening kept as a separate `cross_epoch_widening: deferred_to_phase_3` sibling, never folded into the interval (per plan-review B2 option-(a)).
- **SC#7(iv) reconciliation written as substantive prose** (BUDGET gate vs COMPLETENESS gate; JUSTIFIED DEPARTURE; source-agnostic intersection schema; analytics no-oracle/stop-gap cross-check), not a one-line citation.

## Deviations from Plan

None - plan executed exactly as written. All three task verification blocks passed on first run; no Rule 1-4 deviations were triggered.

## Issues Encountered
None. (Observed an untracked `01-02-SUMMARY.md` from a concurrent wave-sibling executor; left untouched — out of this plan's scope.)

## User Setup Required

**One forced-paid-crossing item is surfaced (no spend taken).** Per the plan frontmatter `user_setup`:
- **Service:** Ormi 0xGraph (INDEX-01 / Phase-3 subgraph host).
- **Why:** Provisional free Developer pick; sign-off needed ONLY if Phase-1 entity-count modeling shows the ~165k RequestCreated + responses-child rows exceed the 300k-entity free cap (→ Ormi Production $75/mo, still subgraph-compatible, under the $390 ceiling).
- **Dashboard config:** At signup, DISABLE free-tier auto-upgrade (Ormi auto-upgrades to Production $75/mo at 300k entities — would breach the no-spend-without-sign-off rule mid-backfill).
- No environment variables required at this stage.

## Next Phase Readiness
- **DATA-SOURCE-01 discharged** — the provisional free-vs-paid verdict, capability matrix, and binding-gate inputs are landed. **Phase 3 INDEX-01 is unblocked** (startBlock 283417317; parity mechanism may use eth_getBlockReceipts per the matrix row).
- Remaining Phase-1 plans: 01-02 (pre-flight addendum probe archive; concurrent wave sibling), 01-04, 01-05 (schema artifacts EVENT-01 / SHARED-SCHEMA-01 / KPD-11a).
- Carried-forward Phase-3 confirmations (not blockers): Ormi mainnet-deploy verify, deep-history deploy-and-observe probe, 300k-entity-cap fit modeling, TOPIC-01 keccak resolution of the three topic0s.

## Self-Check: PASSED

All 4 created artifacts present (matrix YAML, memo, 2 test modules) and all 3 task commits (`8c1dd94`, `abb9f0f`, `d731e9f`) verified in git history. Full suite green: 31 tests.

---
*Phase: 01-data-sourcing-gate-pre-flight-addendum-schema-foundations*
*Completed: 2026-05-29*
