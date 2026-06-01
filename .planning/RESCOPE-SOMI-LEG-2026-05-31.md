# SOMI-Leg Re-scope — Trace-Based Caller-Cost Reconstruction (supersedes the subgraph/eth_call architecture)

**Status:** DRAFT — pending the three-step planning-review gate (CLAUDE.md §Planning-review protocol) before it cascades into PROJECT/REQUIREMENTS/ROADMAP/03-plans.
**Date:** 2026-05-31. **Supersedes:** `03-DATA-SOURCE-REDECISION.md` (NEEDS WORK; its Leg-2 `getRequest` premise is now void, not merely broken). **Evidence base:** `03-COST-RECONSTRUCTION-ASSESSMENT.md` (live probes + n=41 trace validation), the Somnia agent cost docs, and the full-lifetime Dune census.
**Spend:** $0. No subgraph host, no paid RPC, no decompilation. Honors the ≤$390/mo ceiling and no-auto-spend rule without exercise.

---

## 1. Why re-scope (the chain of empirical findings)
1. **`getRequest` eth_call pass is dead** — finalized requests are pruned from storage (`RequestNotFound`); there is no block at which a real id resolves. The 71.7k archive-eth_call cost-fill architecture cannot work.
2. **`Response.executionCost` / `SubcommitteePaid` are structurally absent** — `SubcommitteePaid` fired **0 times chain-wide, all history** (Dune). The validator-payment path never executes; ~95% of requests hit `CommitteeDepositFailed`.
3. **But the caller still pays ≈ the full price** — `debug_traceTransaction` (free RPC) shows that after `committee.deposit` reverts, the budget is **still distributed** via an internal CALL to the committee module `0xcefbce45` (e.g. 0.327 SOMI on a parse request), with only ~0.0017 rebated. The realized caller cost lives in the **internal transfers**, recoverable only by tracing.
4. **Validated** on n=41 finalals: 1 request/tx, caller pays ≈ deposit (realized ~0.23 llm / ~0.33 parse), `0xcefbce45` is the payment sink, rebate is tiny.

**Net:** the *validator-side* cost the milestone originally targeted is genuinely unmeasurable on-chain (defer it); the *caller-side* realized cost — the one we actually care about — **is fully recoverable from the free RPC via trace.**

## 2. Re-scoped M1 (what changes, what's preserved, what defers)
**Preserved (Core Value largely intact):**
- **Arrival series** (RequestCreated/Finalized timing + ordering) — M1's stated primary concern; feeds M2 NHPP/Hawkes unchanged.
- **Realized caller cost per agent class vs the docs `{0.03/0.07/0.10}` prices** — now answered via trace: realized ≈ `subSize × price − rebate` (≈ the reward pot), settled to the committee module.
- **Caller-side inequalities** (`somnia_cost_extraction.md §6` — deposit, rebate, gas buckets) — these are caller-side and trace-recoverable.

**Method change:** realized cost is reconstructed from **(a)** a full event sweep + **(b)** a `debug_traceTransaction` pass (CALL-only accounting) + **(c)** per-block gas — **not** from a subgraph + `getRequest`. No subgraph host, no eth_call cost-fill.

**Deferred (genuinely absent):** the validator-side `executionCost_i` distribution and `SubcommitteePaid` path — the on-chain validator-payment leg is degraded. Revisit if/when it activates.

**New first-class finding:** on-chain settlement is degraded (95% `CommitteeDepositFailed`, 0 `SubcommitteePaid`), yet payment still flows to the committee module `0xcefbce45` via a fallback — so realized caller cost ≈ full price, settled to the committee, **not** to validators. This is a headline empirical result about the protocol's current state, and a load-bearing input to the SOMNIA_DRAFT `K_AI` cost-model leg.

## 3. The reconstruction recipe (the new INDEX-01 / 03-04)
**Pipeline (all on the free public RPC, $0):**
1. **Event sweep** — `eth_getLogs`, proxy `0x5E52…163E6` + topic0s {RequestCreated, RequestFinalized, CommitteeDepositFailed, NativeTransferFailed} as an OR-array, 1000-block windows over [deploy 283,417,317, head ~321.2M] ≈ 37.8k windows → arrival panel; decode **agent_class via `perAgentBudget`** ∈ {0.03,0.07,0.10} (NOT the opaque `agentId`).
2. **Trace pass** — `debug_traceTransaction` (callTracer) over the ~71.7k finalize txs. **Accounting rule (load-bearing): sum only `type ∈ {CALL,CREATE}` frames with `value>0 && error==null`** — exclude DELEGATECALL/STATICCALL (they don't move value; counting them double-counts the committee module's internal cascade ~2×). Classify each transfer: **payment** (→ committee module `0xcefbce45`/`0xb2fc3991`/`0x5213c5b6`) vs **rebate** (→ requester = tx origin) vs **reverted** (the `committee.deposit` attempt). Per-request realized cost = `gross_deposit − rebate`.
3. **Gas (GAS-01)** — per finalize tx `gasUsed × effectiveGasPrice`; the second realized-cost component.
4. **FX** — off-chain SOMI/USD (unchanged; no native oracle).
5. **Panel** — `(requestId, agent_class, gross_deposit, committee_payment, rebate, realized_cost, gas, block_ts, status)` keyed on requestId, with the PANEL-01 columns + 6-key provenance header for `abrigo-analytics` parity.

**Reuse (honest):** `decode.py`, the event-decode surface, and the pure-logic validators that operate on plain counts/tuples survive. **Retired:** the subgraph runtime path (`subgraphs/iagentrequester/*` kept as reference schema only), the Ormi deploy + $75/mo checkpoint, the `getRequest` cost-fill, and `parity.py`'s indexer-vs-RPC cross-check (no second independent source exists once direct-RPC *is* the source — replaced by trace-vs-event consistency checks). `EVENT-01`'s `responses` child table is **deferred** (no Response rows are emitted).

## 4. Completeness gate (anti-circularity preserved — addressing the prior gate's BLOCKER)
The RPC sweep is **NOT** its own binding completeness oracle. Binding leg = the **independent transaction-coverage anchor** (Blockscout `transactions_count`) and/or the **Dune census** (independent indexer), reconciled against the sweep's own distinct count as a *descriptive* cross-check. The `cursor_contiguity` proof over the sweep's processed windows is *advancement-bearing only*, not completeness-bearing on its own — stated explicitly. **No post-hoc ratio swap:** reconcile against the **measured** census (RequestCreated 71,662; RequestFinalized 71,659; CommitteeDepositFailed 68,237; NativeTransferFailed 1,360; SubcommitteePaid 0) — not the retired n=116 `0.7×`/`2.15×` extrapolation; if a residual tx-vs-event gap remains it is logged as an open anomaly, not dissolved by a chosen multiplier.

## 5. Dtype & provenance discipline
Wei amounts (`gross_deposit`, `committee_payment`, `rebate`, `realized_cost`, `gas`) → `pl.Decimal(38,0)` (≤38 digits) or `pl.Utf8`; requestId/hashes → `pl.Utf8` (never Int64). Each artifact carries the 6-key provenance header `(chainId, contractAddress, blockRange, fetchTimestamp, dataHash, gitCommit)`.

## 6. Downstream artifact cascade (apply only after gate PASS)
- **PROJECT.md** Core Value: clarify "realized `executionCost_i`" → **realized CALLER cost** per class (trace-derived); note validator-side `executionCost` deferred (degraded leg).
- **REQUIREMENTS.md**: DATA-SOURCE-01 (free-RPC trace pipeline; drop subgraph/paid-host framing + the `0.7×`/`~165k` extrapolated bars → census numbers); INDEX-01 (event sweep + trace pass, no subgraph/eth_call); EVENT-01 (`responses` child table deferred); **BYTECODE-01 re-scoped** (Tier-C empirical residual is now the **trace** itself; decompilation is optional cross-check, tools per the assessment); GAS-01 elevated to a primary realized-cost component; SHARED-SCHEMA-01 K_AI cost term = realized caller cost (trace) + gas.
- **ROADMAP.md**: re-frame Phase 3 from "subgraph-indexing" to "agent-request arrival + trace-based caller-cost panel"; rewrite success criteria.
- **03-03 / 03-04 plans**: retire subgraph authorship runtime; 03-04 = event sweep + trace pass + gas + panel assembly.
- **STATE.md**: record the re-scope + supersession.
- **SOMNIA_DRAFT coherence note** (to `abrigo-analytics`): the `K_AI` realized cost ≈ full posted price settled to the committee module (degraded validator path); flag the degraded-settlement finding for the joint cost model.

## 7. Open items / risks carried (gated as pre-full-pass blockers where load-bearing)
1. **CALL-only de-cascade accounting** — load-bearing; baked into §3.2.
2. **~5% non-`CommitteeDepositFailed` path uncharacterized** (3,422 per Dune; absent from recent + earliest windows) → resolve via a **Dune anti-join** (RequestFinalized − CommitteeDepositFailed by requestId), then trace that subset, **before** declaring the cost panel complete.
3. **Over-deposit check** — read actual `RequestCreated` tx `value` rather than assuming the 0.12/0.24/0.33 minimum; deposit↔finalize linkage by requestId for the ~78% finalize-only txs.
4. **Sustained-rate trace probe** — confirm 71.7k-tx wall-clock (per-call trace latency > plain getLogs); checkpoint the cursor for a lossless cutover to the VC free-tier fallback if the public endpoint's unpublished fair-use policy bites.
5. **Recipient-role classification** — confirm `0xcefbce45`/`0xb2fc3991`/`0x5213c5b6` roles (committee module / treasury / burn split — the docs page did NOT show a 50/50 burn split; flag vs CLAUDE.md domain non-negotiables).

**Nothing above is applied until both gate reviewers (Reality Checker + selected domain reviewer) return PASS.**
