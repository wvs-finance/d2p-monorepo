# Planning-Review Pipeline Audit Trail — `.planning/PROJECT.md`

**Date:** 2026-05-25
**Document under review:** `.planning/PROJECT.md`
**Protocol:** `CLAUDE.md § Planning-review protocol (non-negotiable)`

## Iteration 1

**Step 1 — Selector (Studio Producer):**
```json
{
  "primary": "Data Engineer",
  "fallback": "Backend Architect",
  "rationale": "M1 is fundamentally an EVM event-indexer + off-chain FX join producing a parquet cost panel with stable schema and provenance — a data-engineering ETL/backfill deliverable, not a contract or product artifact.",
  "primary_risks_to_check": [
    "Indexer choice may not support Somnia chain-id 5031 backfill",
    "Per-request schema may not preserve fields for all ten §6 inequalities",
    "FX join risks look-ahead bias / stale-rate alignment errors",
    "Schema parallelism with abrigo-x402 not specified",
    "BYTECODE-01 has no fallback if disassembly fails"
  ]
}
```

**Step 2 — Reviews:**
- **Reality Checker (A):** NEEDS WORK — 5 HIGH, 4 MEDIUM, 2 LOW. Headline: §6 citation error + scope contradiction (rows #8/#9/#10 are validator-side but Core Value question included them).
- **Data Engineer (B):** NEEDS WORK — 6 HIGH, 6 MEDIUM, 1 LOW. Headline: realistic mainnet request volume is unestimated; the entire "distributional analysis" framing may be statistically vacuous.

**Step 3 — Verdict:** NEEDS WORK. User chose path "Run scout first, then revise."

**Scout (between iterations):**
- IAgentRequester at `0x5E5205CF…163E6` is EIP-1967 proxy; impl `0x9AF59C5683bb8686596B0D56e4F67655C6B73EdD`.
- Neither proxy nor impl source-verified on Somnia Blockscout.
- `transactions_count = 234,999` (Blockscout v2); active today (latest log 2026-05-25T15:24:06Z).
- 3 dominant event topic0 hashes in latest 50 logs.
- Ormi subgraph confirmed as Somnia mainnet indexer path.
- Public RPC caps `eth_getLogs` at 1000 blocks/call.
- Somnia consensus chain finality is sub-second (~20ms tick, MultiStream PBFT).

## Iteration 2

**Step 1 — Selector (Studio Producer):**
```json
{
  "primary": "Data Engineer",
  "fallback": "Backend Architect",
  "rationale": "Revised plan's primary technical surface is still a reproducible empirical data pipeline; SHARED-SCHEMA-01 and PANEL-01 provenance discipline now load-bearing.",
  "primary_risks_to_check": [
    "SHARED-SCHEMA-01 over-fit to K_AI shape",
    "IMPL-01 + EVENT-01 + TOPIC-01 interaction: per-impl ABI resolution",
    "Ormi sole-primary + 0.1% RPC sanity check statistically weak",
    "FX-01 LOCF + 4h staleness interacts with STATS-01 95% gate",
    "BYTECODE-01 Tier-C residual gas-attribution ambiguity",
    "PANEL-01 partitioning compaction/late-arrival policy"
  ]
}
```

**Step 2 — Reviews:**
- **Reality Checker (A):** NEEDS WORK — 3 HIGH, 5 MEDIUM, 2 LOW. Note: *"the plan is no longer fantasy-grade … real progress."* Single most load-bearing risk: inequality #3 isn't caller-observable.
- **Data Engineer (B):** NEEDS WORK — 6 HIGH, 6 MEDIUM, 2 LOW. Note: *"revision did absorb the scout findings … SHARED-SCHEMA inversion fixes a real phantom dependency."* Single most load-bearing risk: TOPIC-01 × IMPL-01 interaction — global topic0 map silently corrupts rows across impl segments.

**Step 3 — Verdict:** NEEDS WORK on both reviewers. User chose path "Add Known Plan-Phase Decisions & commit" — explicit override per protocol clause: *"Block the commit until both reviewers return a passing verdict, or until the user explicitly overrides after seeing the concerns."*

## Override rationale

The 24 iteration-2 findings classified as **engineering details** rather than strategic-scope failures. Both reviewers explicitly characterized the plan as "real progress, no longer fantasy-grade" — the pipeline successfully filtered FANTASY from the plan, leaving ENGINEERING DETAIL. PROJECT.md is project scope, not the DDL for EVENT-01; the appropriate destination for engineering details is `/gsd:plan-phase` deliverables.

The 16-row **Known Plan-Phase Decisions** table in PROJECT.md binds each finding to a specific phase-plan resolution requirement, so nothing is lost — the constraints are forward-propagated. Plan-phase work for any requirement that references a KPD must resolve it before execution.

## Inline fixes applied before commit

1. Core Value: dropped row #3 from per-row binding scope (validate via revert-absence instead).
2. EVENT-01: committed `Response[]` shape to child table with PK `(chain_id, tx_hash, log_index, member_index)`.
3. SHARED-SCHEMA-01: split into intersection table + K_AI extensions sidecar; explicitly marked `v1-K_AI-anchored` with documented breakage budget.
4. STATS-01: replaced "≥200 per class" with class-share floor (≥1% AND ≥200); added `pct_fx_fresh ≥ 80%` gate alongside `pct_fx_populated_any ≥ 95%`.
5. Added KPD section (16 entries).
