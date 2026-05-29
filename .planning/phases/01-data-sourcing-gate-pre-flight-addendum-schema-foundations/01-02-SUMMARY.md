---
phase: 01-data-sourcing-gate-pre-flight-addendum-schema-foundations
plan: 02
subsystem: data-sourcing
tags: [scout-archive, provenance, eip-1967, eip-2535, finality, coingecko, fx, pytest, kpd-17, kpd-09-docs, kpd-19]

# Dependency graph
requires:
  - phase: 01-data-sourcing-gate-pre-flight-addendum-schema-foundations (Plan 01-01)
    provides: "uv/pytest harness, six N2 conftest fixtures (scout_dir etc.), KPD-16 scout archive + PROVENANCE.sha256 set-equality test"
provides:
  - "KPD-17 verdict: impl 0x9AF5…3EdD is plain EIP-1967 (beacon + diamond + impl slots all empty) — IMPL-01 tracks only the proxy EIP-1967 slot; SC#2a happy path, no re-scope"
  - "KPD-09-docs verdict: safe_block_depth=1 MEDIUM branch-(a) provisional (docs assert sub-second PBFT finality, not irreversibility); empirical confirm deferred to Phase 3"
  - "KPD-19 verdict: CoinGecko OHLC ts = candle-CLOSE; FX LOCF must subtract candle duration"
  - "adapters/fx/coingecko_config.yaml — FX-01 config stub (timestamp_convention=close, coin_id=somnia, fallback_chain)"
  - "tests/fixtures/fx_candle_convention.py — stdlib-only no-look-ahead candle-join helper for Phase 4c"
affects: [Phase 2 IMPL-01, Phase 3 INDEX-01 safe_block_depth + KPD-09-empirical, Phase 4c FX-01]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pre-flight verdict files in the KPD-16 scout archive, provenance-stamped (slot_hash + source_url + utc_fetch_ts), CI-asserted on the RECORDED verdict (never live network)"
    - "PROVENANCE.sha256 set-equality discipline: any new scout .md MUST be re-pinned (sha256sum append) or test_provenance_manifest_valid fails by design"
    - "Framework-agnostic (stdlib-only) test fixtures importable by downstream production adapters without pulling pytest"

key-files:
  created:
    - .planning/scout/2026-05-29/beacon_diamond_probe.md
    - .planning/scout/2026-05-29/somnia_finality_semantics.md
    - .planning/scout/2026-05-29/coingecko_convention.md
    - adapters/fx/coingecko_config.yaml
    - tests/fixtures/fx_candle_convention.py
    - tests/fixtures/test_fx_candle_convention.py
    - tests/test_preflight_verdicts.py
  modified:
    - .planning/scout/2026-05-29/PROVENANCE.sha256

key-decisions:
  - "KPD-17 HAPPY PATH locked: impl is plain EIP-1967 — IMPL-01 tracks only the proxy implementation slot; no beacon/diamond indirection; SC#2b re-scope trigger does not fire."
  - "KPD-09-docs is MEDIUM branch-(a) provisional (safe_block_depth=1) — Somnia docs assert sub-second finality but never irreversibility; KPD-09-empirical (≥1-hr rollback obs) deferred to Phase 3."
  - "KPD-19 candle-CLOSE: FX LOCF subtracts candle duration; free hourly via market_chart/range (OHLC hourly is paid-only)."

patterns-established:
  - "Pre-flight verdict + provenance + CI smoke test triad: verdict prose in scout archive, sha256-pinned, asserted on recorded values."
  - "Strict no-look-ahead candle join (t_price < t_block) with on-boundary blocks taking the previous candle."

requirements-completed: [DATA-SOURCE-01]

# Metrics
duration: 3min
completed: 2026-05-29
---

# Phase 1 Plan 02: Pre-flight Probe Verdicts (KPD-17 / KPD-09-docs / KPD-19) Summary

**Discharged the three pre-flight probe verdicts with primary-source provenance — KPD-17 beacon/diamond happy path (plain EIP-1967), KPD-09-docs MEDIUM finality (safe_block_depth=1 provisional), KPD-19 CoinGecko candle-CLOSE — plus the FX-01 config stub and a reusable no-look-ahead candle-join fixture, with all three new scout files re-pinned in PROVENANCE.sha256.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-05-29T21:25:08Z
- **Completed:** 2026-05-29T21:28:08Z
- **Tasks:** 3
- **Files modified:** 8 (7 created, 1 modified)

## Accomplishments
- **KPD-17 discharged (happy path):** recorded the three live impl-slot reads (BEACON_SLOT `0xa3f0…3d50`, IMPLEMENTATION_SLOT, EIP-2535 diamond `0xc8fc…c131c`) all `0x` empty → impl `0x9AF5…3EdD` is plain EIP-1967, not a beacon proxy, not a diamond. IMPL-01 tracks only the proxy EIP-1967 slot; ROADMAP SC#2a satisfied, SC#2b re-scope does not fire.
- **KPD-09-docs discharged (MEDIUM):** docs assert sub-second finality + deterministic PBFT merge but not irreversibility → `safe_block_depth = 1` branch-(a) provisional; KPD-09-empirical (≥1-hour rollback observation) deferred to Phase 3.
- **KPD-19 discharged (candle-CLOSE):** CoinGecko OHLC ts = candle-CLOSE; FX LOCF subtracts the candle duration to avoid up to one candle of look-ahead into inequality #1. `adapters/fx/coingecko_config.yaml` asserts `timestamp_convention: close`.
- **Phase-4c fixture committed:** `fx_candle_convention.py` (stdlib-only `CANDLE_CONVENTION` + `joined_candle_close_ts`) encodes ROADMAP Phase 4 SC#4 — a block at `XX:00:30Z` joins the just-closed `XX:00:00Z` candle, never the future one; strict `t_price < t_block`.
- **N3 provenance gap closed:** all three new scout `.md` files appended to `PROVENANCE.sha256`; `sha256sum -c` OK for all seven files; Plan-01's set-equality `test_provenance_manifest_valid` still passes with the dir now at seven `.md` files.

## Task Commits

Each task was committed atomically:

1. **Task 1: KPD-17 beacon/diamond + KPD-09-docs finality verdicts** - `54d3541` (feat)
2. **Task 2: KPD-19 CoinGecko convention + FX config stub** - `25dcc10` (feat)
3. **Task 3: Candle-convention fixture + pre-flight verdict tests + manifest re-pin** - `afbcb6a` (test)

_(Plan metadata commit recorded separately after STATE/ROADMAP updates.)_

## Files Created/Modified
- `.planning/scout/2026-05-29/beacon_diamond_probe.md` - KPD-17 three impl-slot reads (all `0x`) + HAPPY PATH verdict with provenance
- `.planning/scout/2026-05-29/somnia_finality_semantics.md` - KPD-09-docs finality finding + MEDIUM branch-(a) `safe_block_depth=1` verdict + docs.somnia.network citation
- `.planning/scout/2026-05-29/coingecko_convention.md` - KPD-19 candle-CLOSE verdict + inequality-#1 consequence + free-tier sourcing note
- `adapters/fx/coingecko_config.yaml` - FX-01 config stub (`timestamp_convention: close`, `coin_id: somnia`, OHLC + range endpoints, fallback chain), provenance comment block
- `tests/fixtures/fx_candle_convention.py` - stdlib-only `CANDLE_CONVENTION="close"` + `joined_candle_close_ts()` no-look-ahead helper + `EXAMPLE_HOURLY_CASES`
- `tests/fixtures/test_fx_candle_convention.py` - proves XX:00:30Z joins just-closed candle, strict `t_price<t_block`, on-boundary uses previous candle
- `tests/test_preflight_verdicts.py` - smoke-asserts all three verdict artifacts + FX config (consumes `scout_dir` fixture)
- `.planning/scout/2026-05-29/PROVENANCE.sha256` - appended the three Plan-02 scout files (now 7 lines)

## Decisions Made
None beyond the three plan-specified verdicts — all values were RESOLVED in 01-RESEARCH.md against primary sources and recorded verbatim. The IMPLEMENTATION_SLOT canonical hash (`0x360894…2bbc`) was added to `beacon_diamond_probe.md` for completeness alongside the plan-mandated BEACON and diamond slot hashes.

## Deviations from Plan

None - plan executed exactly as written. All three task verify blocks and the full suite (`uv run pytest tests/ -q`, 13 tests) passed on first run; `sha256sum -c` OK for all seven scout files.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required. (The live RPC/HTTP probes that produced the verdicts were already run at research time; this plan records and tests the recorded outputs only, never hitting the network in CI.)

## Next Phase Readiness
- **IMPL-01 (Phase 2):** unblocked — single EIP-1967 impl dimension, no beacon/diamond enumeration.
- **INDEX-01 (Phase 3):** `safe_block_depth=1` provisional assumption recorded; KPD-09-empirical rollback observation queued for Phase 3.
- **FX-01 (Phase 4c):** config stub + reusable no-look-ahead candle-join fixture ready; the empirical alternative-source cross-check (SC#3) is the remaining Phase-4c deliverable.
- Three Phase-1 plans remain (01-03, 01-04, 01-05).

## Self-Check: PASSED

All 7 created files + the SUMMARY exist on disk; all three task commits (`54d3541`, `25dcc10`, `afbcb6a`) present in git history. Full suite green (13 tests); `sha256sum -c PROVENANCE.sha256` OK for all seven scout `.md` files.

---
*Phase: 01-data-sourcing-gate-pre-flight-addendum-schema-foundations*
*Completed: 2026-05-29*
