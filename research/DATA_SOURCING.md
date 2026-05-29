# DATA_SOURCING.md — IAgentRequester data-source recommendation memo (DATA-SOURCE-01)

**Status:** PROVISIONAL recommendation for user sign-off (free pick → no spend → no strict sign-off; this memo records the acknowledgement and pre-costs every paid crossing).
**Requirement:** DATA-SOURCE-01 — the Phase-1 headline deliverable that GATES Phase 3 INDEX-01.
**Companion artifact:** `research/data_sourcing_matrix.yaml` (machine-checkable capability matrix + four numeric sufficiency bars; this memo narrates it).
**Evidence base:** `.planning/phases/01-data-sourcing-gate-pre-flight-addendum-schema-foundations/01-RESEARCH.md` (live RPC/vendor probes 2026-05-29T20:06Z–20:12Z) + `.planning/scout/2026-05-29/` archive (KPD-16).
**Budget ceiling:** ≤ **$390/mo** (x402's Dune-Plus demand-window upper bound, reused as the reference ceiling — lineage preserved deliberately).

---

## Supersedes

`01-RESEARCH.md` (live-probed this session) **OVERTURNS three premises** baked into the
ROADMAP / PROJECT / REQUIREMENTS. The planner MUST treat the corrected facts as authoritative.

1. **Backfill is 36.3M blocks / ~42 days, NOT ~320M / ~270 days.** The proxy
   `0x5E5205CF39E766118C01636bED000A54D93163E6` was deployed at block **283417317**
   (2026-04-17, creation tx `0x36596e…e8b0a`). The "~320M" figure conflated *chain
   age since TGE* with *proxy age*. Backfill span = **36,286,846 blocks ≈ 36,287
   `eth_getLogs` windows** (`research/data_sourcing_matrix.yaml::capability_rows[backfill_span]`).
   Consequence: the "direct-RPC backfill infeasible → Ormi MANDATORY" premise is **FALSE** —
   the public RPC is a full archive node serving `eth_getLogs` + `eth_getStorageAt`
   correctly *at* the deploy block. Direct-RPC backfill is ~36k capped windows (feasible).
   **Ormi is therefore PREFERRED (mapping surface + parity), not MANDATORY.**

2. **The free tier is amply sufficient and ALL paid fallbacks are under $390/mo.**
   Provisional pick: **Ormi free Developer ($0)**. Pre-costed fallbacks: Ormi Production
   $75/mo (zero re-author), GetBlock Somnia archive RPC Starter $39/mo (INDEX-01 sub-plan
   re-author). Alchemy / QuickNode do **not** confirm chain 5031 → recorded
   `unavailable_unverified`.

3. **The deep-history retention worry collapses for the CHAIN.** The public RPC is a full
   archive at the deploy block (no truncation). Retention is now a question about **Ormi
   specifically** — a Phase-3 *deploy-and-observe* probe at `startBlock 283417317`, not a
   320M-block-back deep-history query.

(Source: `01-RESEARCH.md` §"The Backfill-Span Correction", §"Deep-History Retention
Findings"; scout archive `.planning/scout/2026-05-29/deployment_block.md`.)

---

## Verdict (PROVISIONAL)

**Recommend: Ormi free Developer tier ($0/mo) as INDEX-01's PROVISIONAL host**, confirmed in
Phase 3 by the binding three-leg completeness gate (tx-anchor + structural-ratio + contiguity).

- **Why cheapest-sufficient:** all four numeric sufficiency bars provisionally pass (below);
  the free tier preserves the INDEX-01 AssemblyScript mapping surface and the Phase-3 SC#2
  parity mechanism at **zero re-author cost**. A free pick commits **no spend**, so per
  CONTEXT (spend requires explicit sign-off) it needs **no strict sign-off** — this memo's
  sign-off line records acknowledgement, not authorization to spend.
- **The one caveat (forced paid crossing → sign-off required BEFORE backfill):** if Phase-1
  entity-count modeling (RESEARCH Open Q #1) shows the ~165k `RequestCreated`-type events
  plus their `responses`-child rows exceed the **300,000-entity free cap**, the provisional
  pick becomes **Ormi Production $75/mo** (still subgraph-compatible, **zero re-author**,
  under the $390 ceiling). This is a *forced paid crossing*: it is surfaced as the
  `user_setup` item in the plan frontmatter and **must be signed off before any
  provisioning** — no auto-spend.
- **Disable free-tier auto-upgrade at signup regardless** (RESEARCH Pitfall 5): Ormi
  auto-upgrades to Production $75/mo at 300k entities. Left enabled, a backfill would
  silently cross into paid spend mid-run, breaching the no-spend-without-sign-off rule.

---

## Four Numeric Sufficiency Bars

ROADMAP SC#7(ii). Free tier is **SUFFICIENT iff ALL FOUR pass**; **any single free-tier bar
failing flips the verdict to the paid branch (mandatory)** — encoded testably in
`tests/test_sufficiency_bars.py::test_free_sufficient_iff_all_pass`. Provisional pass values
are sample-bounded (the ~1% Ormi-vs-RPC sample bounds AGREEMENT, not completeness; binding
completeness is Phase 3). Bar keys live in
`research/data_sourcing_matrix.yaml::sufficiency_bars`.

| Bar | Definition (matrix key) | Provisional status |
|---|---|---|
| **bar_1** tx-coverage + structural ratio | distinct proxy-targeted `tx_hash` reconciles vs the 234,999 anchor AND per-topic counts track 2.15× / 1:1:1 / 0.7× within the leg-(b) band | **pass** (sample-bounded) |
| **bar_2** timestamp granularity | granularity ≤ native cadence; `whole_second` acceptable because `(block_number, log_index)` carries arrival ordering | **pass** |
| **bar_3** log_index ordering | every multi-log block preserves ascending `log_index` | **pass** (sample) |
| **bar_4** no `indexer=0 ∧ RPC>0` | zero dropped-log windows in the agreement sample | **pass** (sample) |

**Leg-(b) tolerance band (the matrix is authoritative):** `basis: wilson_95ci_n116`. The
n=116 addendum sample gives request-pair-per-tx 83/116 ≈ 0.716; the Wilson 95% CI
(z = 1.95996) computes to lo = 0.62754, hi = 0.78968; round-half-up at 3 dp →
**[0.628, 0.790]** (committed as the RAW unwidened CI). Cross-epoch widening is **NOT
applied in M1** — it is a separate deferred note (`cross_epoch_widening: deferred_to_phase_3`).
Leg-(b) is a NON-BLOCKING anomaly flag; legs (a)+(c) carry binding completeness in Phase 3.

---

## Cost-of-Ownership Table

All paid classes priced; cheapest-sufficient recommended. INDEX-01 re-author cost is part of
total cost-of-ownership. **All options are < $390/mo except the explicitly-flagged GetBlock
Pro ($399).**

| Option | Price (USD/mo) | Class | INDEX-01 re-author | When to use |
|---|---|---|---|---|
| **Ormi free Developer** | **$0** | (a) managed subgraph | — | **PROVISIONAL pick.** Within 300k-entity cap + 1 req/s OK |
| Ormi Production | $75 | (a) managed subgraph | **zero** (preserves mapping surface + SC#2 parity) | Forced if free 300k cap exceeded OR 1 req/s too slow — **sign-off required** |
| Ormi High Performance | $150 | (a) managed subgraph | zero | Only if 5 req/s (Production) insufficient — unlikely for M1 |
| GetBlock Starter | $39 | (b) paid RPC/archive | **INDEX-01 sub-plan re-author** (RPC-scan, not AssemblyScript) | Cheapest paid; only if the subgraph path fails entirely |
| GetBlock Advanced / Pro | $159 / **$399** | (b) paid RPC/archive | sub-plan re-author | Pro $399 is **at/above the $390 ceiling → forces a re-scope conversation** |
| Self-hosted archive | infra (VPS + storage) | (c) self-hosted | sub-plan re-author + ops burden | Last resort; 42-day/36M span makes it unnecessary |
| Alchemy / QuickNode | n/a | (b) | — | **unavailable / unverified** for chain 5031 — do NOT assume support |
| Protofire subgraph | not retrieved | (a) managed subgraph | zero | Subgraph-compatible alternative to Ormi; price TBD if Ormi rejected |

(Source: `01-RESEARCH.md` §"Standard Stack" / §"Supporting (paid fallbacks)".)

---

## Coherence Reconciliation (SC#7(iv) — a REAL reconciliation, not a citation)

The free-vs-paid posture here must be reconciled against the sibling repos. This is a
substantive reconciliation, not a one-line "consistent ✓".

- **x402's "free-tier discipline" is a paid-API BUDGET gate.** In
  `../abrigo-x402/.planning/research/SUMMARY.md`, the TS-04 demand-window gate and the
  90k-call cost-ledger guard *modeled* spend on indexer-backed analytics queries; x402
  explicitly states "the cost leg is **modeled, not paid**" and that
  `@graphprotocol/client-x402` "settles on Base, not Celo." The gate there asks: *are we
  under budget on a cost leg we are only modeling?*

- **DATA-SOURCE-01 here is a COMPLETENESS-sufficiency gate.** The question is *does the
  source capture the full `IAgentRequester` arrival series* (every event, ordered on
  `(block_number, log_index)`, contiguous to the deploy block) — **not** *are we under
  budget*. The $390/mo ceiling is a **secondary** constraint, not the gate itself. The four
  numeric sufficiency bars measure COMPLETENESS, not cost.

- **x402's "settlement-infra modeled-not-paid" caveat has NO analogue here — paying is a
  JUSTIFIED DEPARTURE, not a violation.** SOMI on-chain data is **real-or-nothing**: there is
  no modeled substitute for `IAgentRequester` events the way x402 can model a settlement cost
  leg it never pays. If the Ormi free tier fails the completeness bars (e.g. 300k cap
  exceeded or mainnet-deploy unsupported), paying $39–$75/mo for a *real* feed is a **JUSTIFIED
  DEPARTURE** from x402's modeled-cost discipline — a *different category* of spend (acquiring
  irreplaceable raw data vs. modeling a hypothetical cost leg), not a breach of the
  evidence-before-spend posture. The departure is still gated by explicit user sign-off and
  the $390 ceiling.

- **The free-vs-paid choice does NOT change any SHARED-SCHEMA-01 intersection assumption.**
  The intersection columns (`gross_cost_native`, `block_ts_utc`, `request_id`, `tx_hash`,
  `chain_id`, …) are **source-agnostic**: a request's on-chain facts are identical whether
  indexed by Ormi's AssemblyScript mappings or by a GetBlock RPC-scan. Selecting a paid source
  is an INDEX-01 *population-path* decision, not a schema change — abrigo-analytics consumes
  the same intersection schema either way.

- **Cross-check against abrigo-analytics.** `../abrigo-analytics/notes/somnia_cost_extraction.md`
  records (§5) **"No native Somnia oracle publishes SOMI/USD on-chain"** and (§"stop-gap")
  that the docs-quoted per-type pricing is an explicit **"stop-gap."** Both findings **stand**
  and are consistent with this memo: FX-01's off-chain CoinGecko SOMI/USD sourcing is the
  documented consequence of the no-on-chain-oracle limitation, and the capability matrix
  re-fetches volatile vendor figures each milestone per the stop-gap caveat.

---

## Deferred Items Pinned

The three review-deferred items (`.planning/reviews/ROADMAP.md.review.2026-05-29.md`) are
pinned here and in `research/data_sourcing_matrix.yaml::deferred_items_pinned`.

1. **Leg-(b) structural-ratio tolerance band.** Basis = `wilson_95ci_n116`; raw unwidened
   Wilson 95% CI on request-pair-per-tx (83/116) = **[0.628, 0.790]** (round-half-up at 3 dp).
   **NOT widened in M1** — `cross_epoch_widening: deferred_to_phase_3`.
2. **`RequestCreated` event — column definition.** Column semantics fixed now: a
   `RequestCreated` row = the request-lifecycle event keyed by `requestId`. The
   topic0→event-name MAPPING is deferred to TOPIC-01 / Phase 2 (keccak + on-chain shape match
   against pinned commit `e15d4e9`; the 3-topic/1120-byte `0xb623…` is the LEADING candidate).
   The scout's likely-INVERTED role labels are NOT hard-coded.
3. **Cross-epoch ratio drift.** The 1:1:1 / 2.15× ratios come from ONE recent 80k-block
   window; the proxy is ~42 days old (one impl epoch so far, low drift risk). The leg-(b)
   band is **NOT widened** for this in M1; flagged for a Phase-3 stratified
   (deploy/mid/head) re-measure per stratum — that widening is the deferred action.

---

## Sign-Off

- [ ] **User acknowledges the PROVISIONAL Ormi-free-Developer selection.** Free → no spend →
  no strict sign-off required per CONTEXT; this line records acknowledgement.
- [ ] **Forced paid crossing requires explicit sign-off BEFORE provisioning.** If Phase-1
  entity modeling shows the 300k-entity free cap is exceeded, the pick becomes **Ormi
  Production $75/mo** (subgraph-compatible, zero re-author, under the $390 ceiling) and is
  surfaced for sign-off before any backfill. A non-subgraph crossing (GetBlock Starter
  $39/mo) additionally triggers an INDEX-01 sub-plan re-author. **Disable Ormi free-tier
  auto-upgrade at signup regardless** (no silent mid-backfill spend).
