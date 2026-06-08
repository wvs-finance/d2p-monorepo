# Phase 1: Data-Sourcing Gate, Pre-flight Addendum & Schema Foundations - Context

**Gathered:** 2026-05-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Decide the IAgentRequester data source (free vs paid) via a **provisional, provenance-backed sufficiency verdict** so INDEX-01 (Phase 3) can be authored; run the pre-flight probes (beacon/diamond A3, indexed-dynamic-field B1, CoinGecko-timestamp C1, `eth_blockNumber` finality docs); and commit every machine-readable schema artifact (`event_schema_v1.md`, `_schema_v1.json`, `batch_manifest_v1.yaml`, intersection + K_AI-extension schemas) — with arrival-timing fields treated as first-class — before any indexer code is written.

Requirements: **DATA-SOURCE-01, EVENT-01, SHARED-SCHEMA-01**. Blocking decisions (ordered): KPD-16 (scout archive, FIRST) → DATA-SOURCE-01 → KPD-17/18/19/09-docs → KPD-03 → KPD-11a.

This discussion clarified the **economics and decision-posture of the free-vs-paid verdict** only. The schema artifacts, arrival-ordering key `(block_number, log_index)`, the three-leg completeness gate, the numeric sufficiency bars, and the probe mechanics are already locked in the ROADMAP KPDs — those are planner/builder mechanics, not re-litigated here.
</domain>

<decisions>
## Implementation Decisions

### Paid-data budget & spend authority
- **Cost ceiling: ≤ $390/mo** — adopt x402's Dune-Plus demand-window upper bound as the reference ceiling for any paid RPC / archive / subgraph.
- **Spend requires explicit user sign-off.** DATA-SOURCE-01 research *recommends* the cheapest sufficient paid option but does NOT commit spend — the user approves before any paid resource is provisioned. (Evidence-before-spend discipline.)
- Anything that would exceed $390/mo is not auto-purchased — it forces a documented re-scope / null-result conversation, not silent spend.

### In-scope paid alternatives to price
- **Price ALL classes and recommend the cheapest-sufficient one** that clears the four sufficiency bars: (a) managed subgraph tier (paid Ormi / Protofire), (b) paid RPC / dedicated archive (Alchemy / QuickNode-style, *if* they support Somnia chain 5031), (c) self-hosted archive node.
- Note the trade-off in the recommendation: a managed subgraph tier preserves the subgraph mapping surface (no INDEX-01 sub-plan re-author, per the reviewer's "subgraph-compatible host" constraint); a paid RPC/archive is a different INDEX-01 codebase (RPC-scan). Cheapest-sufficient wins, but the re-author cost must be included in each option's total cost-of-ownership.

### Free-tier-discipline coherence (the SC#7(iv) reconciliation framing)
- **Frame paid (if needed) as a JUSTIFIED DEPARTURE, recorded explicitly.** Rationale: SOMI on-chain data is *real-or-nothing* — unlike x402's data-cost leg which is *modeled, not paid*. Paying for a real on-chain data feed is a different category from x402's modeled cost-leg discipline, so it does not violate the project's free-tier/evidence-before-spend posture. The `DATA_SOURCING.md` record must state this reconciliation, not just cite the two summary docs.

### Source-selection risk posture
- **Provisional free-tier selection, confirmed in Phase 3.** Accept the provisional free-tier pick pre-INDEX; the pre-costed paid fallback + the Phase-3 binding three-leg completeness gate already de-risk a wrong call. Prefer speed-to-INDEX-01 over deeper pre-INDEX de-risking.
- Caveat retained: if a *cheap* capability probe (esp. the Ormi deep-history retention probe at the deployment block) surfaces an outright red flag, escalate to the paid-options recommendation immediately rather than authoring INDEX-01 on a source known to truncate.

### Claude's Discretion
- The leg-(b) structural-ratio **tolerance band** derivation (sample-CI-derived from the n=116 addendum vs fixed ±X%) — a DATA-SOURCE-01/Phase-3 plan deliverable; Claude/planner chooses the basis and states it.
- The exact probe-script implementation (the scout's `/tmp/scout_rpc.py`-style tooling can be hardened into committed reusable probes).
- Schema-artifact internal formatting beyond the locked column/ordering contracts.
- Which specific paid vendors to actually query for pricing (the *classes* are decided; the vendors are research detail).
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents (researcher, planner) MUST read these before planning or implementing.**

### Phase scope & locked decisions
- `.planning/ROADMAP.md` §"Phase 1" (lines ~45, 54–69) — phase goal, ordered blocking decisions, success criteria SC#1–SC#8, SC#7(ii) numeric sufficiency bars, SC#7(iv) coherence-check.
- `.planning/ROADMAP.md` §"Known Plan-Phase Decisions" — KPD-16, DATA-SOURCE-01, KPD-17, KPD-18, KPD-19, KPD-09-docs, KPD-03, KPD-11a (the decisions this phase must discharge).
- `.planning/PROJECT.md` — DATA-SOURCE-01 requirement text, Pre-flight Scout table (proxy/impl addresses, 234,999 txs, EIP-1967, native ~72 ms cadence), Constraints (provenance discipline).
- `.planning/REQUIREMENTS.md` — DATA-SOURCE-01, EVENT-01, SHARED-SCHEMA-01 acceptance text.

### Empirical evidence (the data this phase's verdict rests on)
- `.planning/scout/2026-05-25/` — original scout artifacts (KPD-16 archives these; beacon/diamond probe target `0x9AF5…3EdD`; the `eth_getLogs` 1000-block cap; finality notes).
- `.planning/scout/2026-05-29/event_count_addendum.md` — **load-bearing**: 234,999 = transactions (not events); events/tx ≈ 2.15; topic0s 1:1:1; RequestCreated ≈ 0.7×tx ≈ ~165k; total ≈ ~505k. The structural ratios the sufficiency bars + completeness gate use.

### Coherence-check targets (SC#7(iv) — the reconciliation must cite these)
- `../abrigo-x402/.planning/research/SUMMARY.md` — free-tier discipline, demand-window framing ($390/mo Dune-Plus upper bound), the "settlement-infra modeled-not-paid" caveat the "justified departure" framing reconciles against.
- `../abrigo-analytics/notes/somnia_cost_extraction.md` — documented Somnia data sources, "stop-gap" pricing caveat, no-native-SOMI/USD-oracle finding.

### ABI / probe references
- `emrestay/somnia-agents-skills@e15d4e9` `references/interfaces/IAgentRequester.sol` — event signatures for KPD-18 indexed-dynamic-field enumeration + the three observed topic0s (`0x65db1ef5…`, `0x5c090ef4…`, `0xb6233992…`).
- `docs.somnia.network/somnia-blockchain/multistream-consensus` — KPD-09-docs `eth_blockNumber` finality semantics.
- `docs.somnia.network/developer/partners/...` (Ormi subgraph) — DATA-SOURCE-01 Ormi free-tier capability rows (retention, throttle, deployment permission).

### Deferred plan-phase items (recorded in the review trail — DATA-SOURCE-01/Phase-3 must resolve, not new phases)
- `.planning/reviews/ROADMAP.md.review.2026-05-29.md` §"Deferred to plan-phase" — leg-(b) tolerance band; "RequestCreated event" per-request-vs-per-topic0 definition; cross-epoch ratio-drift width.
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Scout probe scripts** (`/tmp/scout_rpc.py`, `/tmp/scout_events.py`): working RPC + Blockscout probing patterns (eth_getLogs window-scan, eth_getTransactionReceipt structure decode, Blockscout v2 paginated logs). Seed for hardened, committed reusable probe tooling for DATA-SOURCE-01's capability matrix.
- **Provenance-note format** from `abrigo-analytics/notes/somnia_cost_extraction.md` (source_url + utc_fetch_ts per fact) — the established convention DATA_SOURCING.md + the matrix YAML must follow.

### Established Patterns
- Public Somnia RPC `https://api.infra.mainnet.somnia.network/` works for `eth_getLogs` (1000-block cap), `eth_getCode`, `eth_getStorageAt`, `eth_getTransactionReceipt`, `eth_getBlockByNumber`. `somnia.publicnode.com` is a second working endpoint. Alchemy's `somnia-mainnet` subdomain does NOT exist (the `ALCHEMY_API_KEY` is for Celo/ETH, not Somnia).
- Blockscout v2 REST (`explorer.somnia.network/api/v2/...`) is the only source of the exact transaction counter (234,999) but rate-limits aggressively (429 after ~2 rapid calls) — sequential, spaced requests required.

### Integration Points
- This is a **greenfield repo** — no implementation code yet (only `.planning/` + `CLAUDE.md`). Phase 1 produces the first committed artifacts: `research/DATA_SOURCING.md`, `research/data_sourcing_matrix.yaml`, `schemas/event_schema_v1.md`, `schemas/abrigo_cost_panel_intersection_v1.{md,json}`, `schemas/abrigo_cost_panel_k_ai_extensions_v1.md`, `schemas/batch_manifest_v1.yaml`, and the KPD-16 scout archive under `.planning/scout/`.
- Outputs feed Phase 2 (TOPIC-01/IMPL-01 consume the schema reservations + ABI refs) and Phase 3 (INDEX-01 consumes the data-source verdict + the binding-gate definitions).
</code_context>

<specifics>
## Specific Ideas

- **$390/mo** is explicitly the x402 Dune-Plus demand-window upper bound, reused as the budget ceiling reference — keep that lineage in the record.
- **"Real-or-nothing"** is the user's framing for why paid SOMI data is a justified departure from x402's modeled-not-paid discipline — use this phrasing in the SC#7(iv) reconciliation.
- The free-vs-paid verdict is a **recommendation the user signs off on**, not an auto-locked decision — structure `DATA_SOURCING.md` as a recommendation memo with the cheapest-sufficient option flagged, the cost-of-ownership table (incl. INDEX-01 re-author cost per class), and a sign-off line.
</specifics>

<deferred>
## Deferred Ideas

None new this discussion. The milestone arc beyond M1 (M2 = arrival-process estimation + convex-demand verdict; M3+ = composite hedge instrument) is already captured in PROJECT.md Out-of-Scope and `memory: project-somi-leg-arc-and-data-sourcing`. The three plan-phase-deferred technical items (leg-b tolerance, RequestCreated-event definition, cross-epoch drift) are DATA-SOURCE-01/Phase-3 deliverables within this milestone, recorded in the review trail — not separate phases.
</deferred>

---

*Phase: 01-data-sourcing-gate-pre-flight-addendum-schema-foundations*
*Context gathered: 2026-05-29*
