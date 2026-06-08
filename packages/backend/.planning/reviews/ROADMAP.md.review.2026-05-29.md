# Planning-Review Pipeline Audit Trail — `.planning/ROADMAP.md`

**Protocol:** `CLAUDE.md § Planning-review protocol (non-negotiable)`
**Outcome:** PASS (both reviewers) after 4 review rounds. Committed 2026-05-29.

## Round 1 — initial 6-phase roadmap (2026-05-25)

- **Selector (Studio Producer):** primary `Senior Project Manager`, fallback `Sprint Prioritizer`.
- **Reality Checker:** NEEDS WORK (4 HIGH). **Senior Project Manager:** NEEDS WORK (5 HIGH).
- Convergent HIGH: Phase 4a false-parallelism (Tier-C residual needs Phase 3 indexed events); KPD-11 double-allocation; Phase 3 SC#2 depends on unresolved Open Question; Phase 1 SC#4 reverse-deps on Phase 2; KPD-09 mis-allocated to Phase 1; Phase 5 SC#5 + Phase 6 SLO reference out-of-scope artifacts.
- Resolution: roadmapper revised — 4a split (4a-pre ∥ Phase 3 / 4a-validate ⊃ Phase 3); KPD-09/11/18 split into disjoint sub-deliverables; Open Question #2 promoted to committed mechanism (new KPD-20); Phase 1 SC#4 → schema-side-only; local emulation fixture + M1 reference environment.

## Round 2 — DATA-SOURCE-01 amendment, iter 1 (2026-05-29)

Amendment: added DATA-SOURCE-01 (free-vs-paid data-sourcing gate, Phase 1, gating INDEX-01, absorbing KPD-20) + arrival-periodicity sharpening (Phase 1 SC#8 + Phase 6 SC#6).
- **Selector:** primary `Data Engineer`, fallback `Senior Project Manager`.
- **Reality Checker:** NEEDS WORK (3 HIGH). **Data Engineer:** NEEDS WORK (4 HIGH).
- Standout: "~1 s timing" criterion contradicts the chain's own physics (~72 ms/block from 1.2M blocks/day); completeness gate can't be objectively passed/failed (RPC parity shares the 1000-block cap, samples ~1%); no falsifiable free-vs-paid threshold; Ormi backfill-feasibility unprobed.
- Resolution: roadmapper revised — ~72 ms cadence + whole-second-timestamp/`(block_number, log_index)` ordering key; completeness gate relabeled PROVISIONAL with binding re-confirmation in Phase 3; four numeric sufficiency bars; Ormi probe rows; gap-censoring; machine-checkable matrix.

## Round 3 — DATA-SOURCE-01 amendment, iter 2 (2026-05-29)

- **Selector:** primary `Data Engineer`, fallback `Backend Architect`.
- **Reality Checker:** NEEDS WORK (3 HIGH). **Data Engineer:** NEEDS WORK (2 HIGH).
- Convergent (both, same evidence): **count-anchor unit mismatch** — `234,999` is a TRANSACTION count, mis-used as an event-completeness anchor; **block-presence ≠ event-completeness** at ~0.0007 events/block.
- Resolution: **scout addendum** (`.planning/scout/2026-05-29/event_count_addendum.md`) — measured 249 proxy logs / 116 tx via RPC: events/tx ≈ 2.15, three topic0s 1:1:1, RequestCreated ≈ 0.7×tx ≈ ~165k, total ≈ 505k (both ≫ the 5,000 floor by ~30×). Roadmapper rebuilt the gate as a three-leg structure (tx-anchor + structural-ratio event bound + contiguity proof), corrected STATS-01 envelope to ~165k.

## Round 4 — scout-grounded gate (2026-05-29) — PASS

- **Selector:** primary `Data Engineer`, fallback `Backend Architect`.
- **Reality Checker:** **PASS** — "both prior coupled HIGHs genuinely resolved, not relabeled; I'd execute this without re-decomposing phases." All residual findings MEDIUM/LOW, tagged `[defer-to-plan-phase]`.
- **Data Engineer:** **PASS** — "Single load-bearing roadmap-blocking item: none." Confirmed grep: zero residual "99.9% blocks present" active bar; STATS-01 envelope reads ~165k; three-leg gate honestly scoped; circularity not realized; 11/11 coverage, no regression.
- **Pre-commit edits (reviewer-requested one-line guards, applied verbatim):**
  1. Leg (a) tx-anchor: "re-query live at indexed head" (not "scaled from the 2026-05-25 value"); 234,999 retained as reference snapshot + monotonicity floor.
  2. Leg (b): structural ratios evaluated against the indexer's OWN distinct-tx count, never the external 234,999 (prevents re-introducing circularity); leg (b) is a non-blocking anomaly flag; legs (a)+(c) carry binding completeness.

## Deferred to DATA-SOURCE-01 / Phase-3 plan-phase (not roadmap-blocking)

- Leg-(b) ratio tolerance band numeric value (derivation basis committed; value is a plan-phase deliverable).
- Cross-epoch ratio-drift width (stratified deployment/mid/head sampling already mandated surfaces regime shifts).
- "RequestCreated event" definition (per-request vs per-topic0) before leg-(b) counts are computed.

## Final state

6 phases, 11/11 v1 requirements mapped, 22 active KPD line-items, 30 success criteria. All four prior-round HIGH-fix sets preserved across rounds. Both reviewers PASS round 4.
