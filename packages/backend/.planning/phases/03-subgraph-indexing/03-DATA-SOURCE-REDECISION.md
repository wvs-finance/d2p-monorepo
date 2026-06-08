# DATA-SOURCE-01 Re-decision — Direct-RPC Extract-Once Pipeline (supersedes the Ormi-subgraph free-tier pick)

**Status:** DRAFT — pending the three-step planning-review gate (CLAUDE.md §Planning-review protocol) before it amends 03-04 / INDEX-01.
**Date:** 2026-05-31. **Author:** orchestrator session.
**Supersedes:** the provisional free-tier selection recorded in `01-CONTEXT.md` / `01-03-SUMMARY.md` (Ormi free subgraph + public RPC + Blockscout), which was always **"provisional-pending-Phase-3-backfill-confirmation."** This note IS that confirmation step — and it overturns the host class, not just the vendor.
**Triggers:** (1) Ormi dashboard onboarding is broken (the "let's personalize" step hangs; the free-tier subgraph host cannot be provisioned). (2) A live empirical RPC capability probe + a Dune full-lifetime event census (2026-05-31) that together flip the cost/feasibility premise. (3) The original sufficiency bars rest on a scout *extrapolation* the census contradicts.

---

## 1. What changed empirically (the flip)

The Ormi-subgraph plan existed because we believed a 37.8M-block backfill needed a managed indexer and that the free public RPC could not carry the load. **Both beliefs are now falsified by direct measurement** against `https://api.infra.mainnet.somnia.network/` on 2026-05-31:

| Probe | Result | Source |
|---|---|---|
| Head block (live) | `0x1324b17d` = **321,232,765** | `eth_blockNumber` probe |
| Deploy block | 283,417,317 → **span 37,815,448 blocks** (~44 days @ ~100 ms) | scout / KPD-16 |
| `eth_getLogs` cap | **exactly 1000 blocks**, hard (999 ok / 1001 `block range exceeds 1000`) | probe |
| Event-sweep cost | 3 topic0s as one `topics[0]` OR-array → **37,816 windows** → ~25 min @ 25 req/s | probe-derived |
| Rate limiting | **No 429/503** across 100-parallel and 500-request bursts | probe |
| JSON-RPC batch | **batch-500 returned in 1.74s** (~287 eff. calls/s); batch-100 round ≈ 0.77s | probe |
| Archive depth | `eth_call` resolves state **at the deploy block (283.4M)** ✓ | probe |
| **71.7k archive `getRequest` eth_call** (selector `0xc58343ef`) | **~9 min** batch-100/single-stream (<2 min at P=10) | probe-derived |

**Conclusion:** the entire one-time backfill — both the ~213k-log event sweep and the ~71.7k archive state reads — completes in **under an hour on the free public endpoint, for $0.** Throughput-to-buy is effectively zero because batching works and there is no observed throttle. The "upgrade the RPC" instinct was directionally right (the binding data is the archive `eth_call` state layer, not the events) but the free endpoint already has the capacity.

---

## 2. Decentralized-provider verdict (bias resolution, evidence-based)

The user's stated preference is decentralized RPC. Three parallel research passes (2026-05-31) establish this **cannot be honored today and is structurally wrong for this specific workload**:

- **Lava Network** — Somnia is **"Available Soon," not live** (lavanet.xyz/lava-public-rpc). Carry as a "revisit when live" note.
- **Pocket/Grove, dRPC, Blast/Bware** — **no Somnia chain entry** (verified against each chainlist).
- **Structural correctness risk (the binding objection):** decentralized RPC routes each call to a different node/servicer from a permissionless pool with **no guarantee of consistent, unpruned historical state across sequential calls.** For `getRequest` replayed at 71.7k historical IDs, a fraction can silently return `0x`/stale state **with no error**, corrupting the `executionCost` panel — the exact variable the M1 cost function regresses on. Decentralized RPC optimizes liveness/censorship-resistance, not deterministic archive-state equality.

**Therefore:** for *maximizing data quality on the cost function* (the actual goal), a **single coherent archive source is strictly preferable** here. The decentralized bias is correct for most workloads; the archive-`eth_call`-over-71.7k-IDs workload is the exception. Lava is deferred, not adopted.

---

## 3. Decision

**Primary = the free public Somnia RPC** (`https://api.infra.mainnet.somnia.network/`), empirically proven sufficient for the whole job at $0.
**No-spend SLA fallback = Validation Cloud free tier** (50M CU/mo, no card; Somnia *genesis validator* + official mainnet RPC; deliberately near-uncapped rate policy) — engaged only if the public endpoint's unpublished fair-use policy ever bites mid-backfill.
**Deferred = Lava** (revisit when live, only after confirming sticky-session archive consistency).
**Eliminated = Alchemy / QuickNode / Infura** (verified do not support Somnia chain 5031).
**Paid-with-spend (not selected) = GetBlock $39/mo** — kept on the bench but UNVERIFIED whether Somnia archive is on the $39 shared tier (may force a $1,500/mo dedicated node); would require explicit spend sign-off, which this decision avoids.

**Spend impact: $0.** The ≤ $390/mo ceiling from `01-CONTEXT.md` is untouched and the evidence-before-spend / no-auto-spend rule is satisfied without exercise.

---

## 4. Architecture change — drop the subgraph host; INDEX-01 becomes extract-once direct-RPC

M1 is a **historical cost-function estimation over a finite ~71.7k-request panel**, not a live stream. A subgraph (Ormi *or* self-hosted graph-node) is a continuous-indexing tool — the wrong instrument. INDEX-01's host class changes from **Class A (subgraph-compatible)** to **Class B (non-subgraph archive)**, which `DATA-SOURCE-01` already pre-authorized as triggering an **INDEX-01 sub-plan re-author (not phase re-decomposition).** The re-author is *simpler* than the subgraph path.

**The extract-once pipeline (what 03-04 becomes):**
1. **Event panel** — `eth_getLogs`, proxy `0x5E52…163E6` + 3 topic0s (OR-array), 37,816 windows of ≤1000 blocks → ~213k logs → parquet arrival series; decode `agent_class` from raw `RequestCreated.data`.
2. **Cost/state panel** — batched `getRequest(uint256)` eth_call (`0xc58343ef`) over the ~71.7k finalized request IDs → `Σ executionCost` (Response idx 5) → parquet. This is the throughput-critical step, fully covered by the free endpoint (§1).
3. **Gas (GAS-01)** — per-block reads, same endpoint. **FX (FX-01)** — off-chain (unchanged, no native SOMI/USD oracle).

**Reuse (no re-author):** all Wave 0/1 artifacts survive — `indexing/decode.py`, the four validation engines (`completeness/ordering/parity/liveness.py`), `probes/somnia_rpc.py::get_request`, the 99-green CI suite, the structural-floor/cursor-contiguity/dtype-discipline gate logic (host-agnostic by construction). What is **retired:** `subgraphs/iagentrequester/*` as the *runtime* path (kept as a reference schema), the Ormi deploy recipe, the $75/mo Ormi-Production checkpoint, and the deploy-and-detach 36.3M-block backfill framing.

---

## 5. Completeness reconciliation (the load-bearing correction — do not skip)

The original sufficiency bars (`REQUIREMENTS.md` DATA-SOURCE-01 (a)) extrapolate from the n=116 scout addendum: `total ≈ 2.15 × txs`, `RequestCreated ≈ 0.7 × txs ≈ ~165k`, `total ≈ ~505k`. **The Dune full-lifetime census (2026-05-31) contradicts this:**

| topic0 | role | Dune count |
|---|---|---|
| `0xb623…26889` | RequestCreated | **71,662** |
| `0x65db…66af2` | RequestFinalized | **71,659** |
| `0x5c09…7a2cf` | CommitteeDepositFailed | 68,237 |
| `0xa5b0…85cc6` | NativeTransferFailed | 1,360 |
| Upgraded / other | — | ~5 |
| **Total** | | **~213k** |

**Resolution — the extrapolation was wrong, not the data, and the conflict actually dissolves:** with 71,662 RequestCreated against the 234,999 Blockscout **transaction** anchor, the true ratio is `RequestCreated ≈ 0.305 × txs`, i.e. ~3.3 txs per request (create + finalize + committee-deposit txs) — **not** the `0.7×` the n=116 sample produced. The scout's `2.15×` / `0.7×` ratios were unrepresentative of the full population; the `~505k` total was an artifact of that bad multiplier. Once corrected, Dune's ~213k and the 234,999-tx anchor are **mutually consistent** (~71.7k requests × ~3 events). There is no genuine 2.4× completeness gap — there was a bad extrapolation.

**New binding completeness oracle:** because the **full direct-RPC sweep is now empirically cheap/feasible (§1)**, the exact lifetime `RequestCreated` count is obtained **directly from the sweep**, not extrapolated. This finally closes the long-standing "no cheap EXACT independent event-count oracle exists pre-indexing" caveat in DATA-SOURCE-01. The three-leg gate is re-weighted:
- **Leg 1 (binding):** the RPC sweep's own exact distinct count over [deploy, head] = ground truth.
- **Leg 2 (cross-check, was binding):** the 234,999-tx anchor, now reconciled at the corrected `~0.305×` ratio.
- **Leg 3 (cross-check):** the Dune census (71,662) should bracket the RPC sweep within tens of events (Dune indexer lag is the only expected delta).
The structural-ratio *tolerance band* must be **re-derived against the census numbers**, not the retired n=116 ratios.

**Two corrections to carry downstream:** (a) the ~165k → **~71.7k** RequestCreated envelope (already reflected in the 03-03 inverted-label fix); (b) **NativeTransferFailed IS emitted** (1,360×) — revises the BYTECODE-01 prior that treated it as unobserved.

---

## 6. Coherence with x402 (SC#7(iv))

The `01-CONTEXT.md` "justified-departure" framing (paying for real on-chain data is a different category from x402's *modeled* cost leg) is **moot here — the selected path is $0**, so there is no departure to justify. No `abrigo-analytics` shared-schema assumption changes: the panel schema (PANEL-01 columns, 6-key provenance header, `Σ executionCost` as `pl.Utf8`) is identical regardless of whether the rows arrive via subgraph or direct-RPC. The cross-leg L5 copula contract (`residuals.parquet (leg, event_time, rescaled_dt)`) is unaffected.

---

## 7. Open items / risks carried

1. **Public-endpoint fair-use is unpublished** — no documented rate policy; the probe shows no throttle *today* but the foundation could tighten it. Mitigation: VC free-tier fallback (§3) + checkpoint the sweep cursor so a mid-run cutover is lossless.
2. **Per-result log-size cap UNVERIFIED** — only the 1000-block range cap is confirmed; at ~5.6 logs/window avg, result-pagination is unlikely to bind but the sweep must defensively page on any window that returns a truncation sentinel.
3. **`agent_class` decodability from raw `RequestCreated.data`** — assumed (indexed-dynamic-field recovery, KPD-18); confirm on a real log before the full sweep.
4. **VC fallback specifics UNVERIFIED** — archive depth + batch support on Somnia not in VC's public docs; confirm only *if* we actually need the fallback.
5. **Dune as a standing cross-check** has its own non-deterministic credit cost (2,500/mo free; per-query cost unpublished) — use it for one-shot census/cross-check only, never as a polled primary.

---

## 8. Downstream artifact deltas (apply only after gate PASS)

- `REQUIREMENTS.md` DATA-SOURCE-01 (a): replace the `0.7×`/`2.15×`/`~165k`/`~505k` extrapolated bars with the census-anchored numbers + the "RPC-sweep-is-the-exact-oracle" re-weighting.
- `INDEX-01`: re-author 03-04 as the §4 extract-once pipeline; retire the Ormi/subgraph runtime path + the $75/mo checkpoint.
- `03-VALIDATION.md`: re-derive the structural-ratio tolerance band against the census; keep cursor-contiguity (now over the RPC sweep's processed ranges).
- `BYTECODE-01`: note NativeTransferFailed is observed (1,360×).
- New decision pointer in `STATE.md`.

**Nothing above is applied until both gate reviewers (Reality Checker + selected domain reviewer) return PASS.**
