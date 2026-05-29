# Planning-Review Pipeline Audit Trail — Phase 1 PLAN.md files

**Protocol:** `CLAUDE.md § Planning-review protocol (non-negotiable)`
**Artifacts:** `01-01-PLAN.md` … `01-05-PLAN.md` (5 plans, 3 waves, 15 tasks) + `01-VALIDATION.md`
**Outcome:** PASS (Reality Checker + Data Engineer) after 1 revision. 2026-05-29.

## Pre-gate: GSD plan-checker (Sonnet)

VERIFICATION PASSED (1 warning). All 3 requirement IDs covered, all 15 tasks complete (read_first + grep/command acceptance_criteria + concrete action), Nyquist dim-8 pass, waves disjoint, corrected facts propagated with `## Supersedes` notes, 3 review-deferred items pinned. Warning: ROADMAP SC paths cite `2026-05-25/` while plans produce `2026-05-29/` → folded into the doc-reconciliation commit.

## CLAUDE.md gate — Round 1

- **Selector (Studio Producer):** primary `Data Engineer`, fallback `Backend Architect`. Rationale: dominant surface is data-engineering/schema-contract (Parquet/polars dtypes, JSON-Schema, capability-matrix YAML, sufficiency-bar stats, PK/FK design); EVM-probe is recordkeeping not Solidity.
- **Reality Checker:** **PASS** (3 LOW/nice-to-fix). Verified live: `\$schema` shell-escaping resolves, EIP-1967 beacon `0xa3f0…3d50` + EIP-2535 diamond `0xc8fc…131c` slots are canonical keccak constants, sha256 chain sound, Wave-0 ordering works greenfield, Wilson CI test-asserted, provisionality honest, no stale residue in tests, CONTEXT.md honored, scope inside M1.
- **Data Engineer:** **NEEDS WORK** — 3 execution-blocking (verified empirically via polars round-trips + recomputed stats):
  1. [HIGH] `pl.Decimal(38,0)` cannot hold uint256 (38-digit ceiling vs 78-digit ids) — offered as interchangeable with Utf8 for `requestId`/`agentId`; silent overflow. `BindingsError`/`OverflowError` on `2**256-1`.
  2. [HIGH] Cross-epoch widening contradiction — "widen the band" prose vs pinned/tested raw Wilson CI (mutually exclusive).
  3. [MEDIUM] Wilson upper bound off by one in 3rd decimal — `0.791` should be `0.790` (hi=0.78968).
  Plus 3 nice-to-fix (conftest sha256 gap, helper-vs-fixture ambiguity, PK naming drift).

## Revision (gsd-planner, Opus)

- **B1:** id columns → `pl.Utf8` ONLY (NEVER Decimal) in 01-04 + 01-05; `Decimal(38,0)` scoped to provably-≤38-digit wei; `test_uint256_not_int64` / `test_polars_dtype_map` upgraded to runtime polars round-trip (78-digit Utf8 survives; `Decimal(38,0)` raises; `10**17` wei constructs).
- **B2:** raw Wilson CI committed as the band (`basis: wilson_95ci_n116`); `cross_epoch_widening: deferred_to_phase_3` as a separate sibling key the test asserts. No contradiction.
- **B3:** band corrected to `[0.628, 0.790]` (round-half-up at 3 dp, rule stated) across §facts / Task1 / `test_leg_b_tolerance_basis` / VALIDATION.
- **N1–N5:** six-fixture grep, `@pytest.fixture`-as-param contract, set-equality sha256 manifest covering all 7 archive `.md` files, `requestId→request_id` mapping note, dropped the analytics-py-version parity claim.

## CLAUDE.md gate — Round 2 (targeted Data Engineer re-check)

- **Data Engineer:** **PASS.** Re-confirmed empirically on polars 1.41.2: 78-digit Utf8 round-trip survives, `pl.Series([2**256-1], dtype=pl.Decimal(38,0))` raises `OverflowError` (so `pytest.raises` catches it), `10**17` constructs; Wilson CI `[0.628, 0.790]` consistent across §facts/Task1/test/VALIDATION; B2 sibling-key resolution holds; N1–N5 all landed. One MINOR nice-to-fix: `01-RESEARCH.md:299` still carried stale `[0.627, 0.791]` + "widen" → fixed in the doc-reconciliation pass (correction stub pointing to `01-03-PLAN.md` as authoritative).
- **Reality Checker:** PASS stands from Round 1 (fixes are all in the DE's lane — dtypes, arithmetic, provenance coverage — and don't touch what RC verified). Per the proportionate-re-gate decision the user approved, RC was not re-run.

## Doc-reconciliation (committed alongside)

Corrected the stale assumptions the research overturned, in the upstream strategic docs (the plans were already self-superseding via `## Supersedes` notes):
- `PROJECT.md` scout table — correction callout: deploy block 283,417,317 / 42-day / 36.3M-block backfill / archive-feasible / Ormi-preferred-not-mandatory / ~100.7ms cadence / event-roles-likely-inverted.
- `ROADMAP.md` Phase Details — correction callout: same facts + the `2026-05-25→2026-05-29` scout-path redirect + "Ormi mandatory superseded".
- `scout/2026-05-29/event_count_addendum.md` — superseded-labeling note (counts valid, topic0→name assignment unsettled, TOPIC-01 resolves).
- `01-RESEARCH.md:299` — correction stub.

## Final state

5 plans / 3 waves / 15 tasks, all 3 requirement IDs covered, Nyquist-compliant, both gate reviewers PASS. Execution-ready: `/gsd:execute-phase 1`.
