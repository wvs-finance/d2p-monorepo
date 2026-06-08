# Planning-Review Pipeline Audit Trail — Phase 3 PLAN.md files (INDEX-01)

**Protocol:** `CLAUDE.md § Planning-review protocol (non-negotiable)`
**Artifacts:** `03-01-PLAN.md` … `03-04-PLAN.md` + `03-VALIDATION.md` (Subgraph Indexing / INDEX-01)
**Outcome:** PASS after **4 gate rounds** (the gate did its job — each round caught real, execution-expensive defects before any live spend). Final commit `9ec6f1e`. 2026-05-29.

## Pre-gate: GSD plan-checker
Iteration 1 → 1 blocker (stale ROADMAP SC#1 event list) + 4 warnings → fixed. Iteration 2 → PASS. (Separate from the CLAUDE.md three-step gate below.)

## Selector (Studio Producer) — stable across all 4 rounds
- **primary:** `Data Engineer` (×4), **fallback:** `Backend Architect`.
- **Rationale:** the load-bearing surface is data-pipeline correctness — deploy-and-detach 36.3M-block backfill, `eth_getBlockReceipts` parity, structural-floor completeness, polars uint256→Utf8 dtype discipline, off-chain batched `getRequest` fill. Solidity content is read-only. **Every prior NEEDS WORK originated in the data-engineering domain — the dynamic-reviewer selection working as designed (a generalist passed substance the domain reviewer caught).**

## Round-by-round (Reviewer A = Reality Checker [fixed]; Reviewer B = Data Engineer [selected])

| Round | Reality Checker | Data Engineer | Findings resolved |
|---|---|---|---|
| #1 | NEEDS WORK | NEEDS WORK | B: inverted topic0 labels in leg-b band + ROADMAP SC#6/7 + scout addendum (cross-artifact reconciliation); A: unquantified 36.3M-block backfill collapsed into one approval cycle → deploy-and-detach; GraphQL `COUNT(DISTINCT)` infeasible; lossy fold; sparse-contiguity; non-conservative overage; fixture cross-check |
| #2 | PASS | NEEDS WORK | M-1 lossy `blockNumber_gt` cursor → lossless `id_gt` pagination; M-2 `sum_execution_cost` → `pl.Utf8` (Decimal(38,0) panel-overflow); M-3 Wilson proportion band dimensionally mis-applied to a count ratio |
| #3 | NEEDS WORK | NEEDS WORK | BLOCKER strict `Σ>0` false-rejects zero-cost TimedOut/Failed finalized requests → two-fixture split; MAJOR leg-b auto-halt contradicts SC#6(b) + finalization-lag false-halt → ADVISORY+DIRECTIONAL; MAJOR stale `03-VALIDATION.md`; divide-by-zero guards; stall-detection |
| #4 | **PASS** | NEEDS WORK → **closed** | sole BLOCKER: the run-#3 "whitespace-tolerant" `blockNumber_gt` negative guard regex false-rejected the plan's own legitimate `blockNumber_gte:$lo` query (`blockNumber_gt` is a prefix of `blockNumber_gte`). Fixed to `! grep blockNumber_gt:` (commit `9ec6f1e`), **empirically verified** against all query forms; + dropped a bare `> 0` over-match. The run-#4 Data Engineer explicitly stated "once B1 lands … all sound and ready." |

## Verdict gate
- Reality Checker: **PASS** (run #4) — verified the leg-b advisory architecture, two-fixture split, deploy-and-detach restructure, and validation parity against the source-of-truth artifacts (`topic0_map_v1.json`, the corrected scout banner, ROADMAP SC#1/6/7, the interface `ResponseStatus`).
- Data Engineer: NEEDS WORK on **one** self-inflicted acceptance-criterion regex (B1), with an explicit "once B1 lands it's ready" pre-commitment. B1 fixed + independently empirically verified. **Gate cleared.**

## Confirmed-sound (no-regression, verified by both reviewers across rounds)
Architecture B (off-chain getRequest, no in-subgraph eth_call); ~165k-entity model under the 300k free cap via the non-lossy requestId-keyed `CommitteeDepositFailed` accumulator; anti-circularity (leg-b denominator = indexer's OWN id-paginated distinct-tx, never the external 234,999); leg-c cursor-contiguity over `_meta` processed ranges (not sparse event-block interval-fill); CI-vs-LIVE boundary (gate math CI-fixtured, network confined to `__main__`); the resolved topic0 roles; the $75/mo no-auto-spend human checkpoint.

## Final state
4 plans / 3 waves; INDEX-01 covered; Nyquist `03-VALIDATION.md` synced; all 4 plans `valid:true`, end cleanly at `</output>`, suite 56 green; LOCAL commits only (nothing pushed). **Execution-ready: `/gsd:execute-phase 3`** — first live actions are the Ormi deploy-probes + deploy-and-detach backfill; the $75/mo crossing is gated on explicit user confirmation (no auto-spend).
