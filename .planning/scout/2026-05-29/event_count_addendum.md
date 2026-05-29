# Scout Addendum — RequestCreated event count + events-per-tx (2026-05-29)

**Purpose:** Resolve the count-anchor unit mismatch flagged by both reviewers — the original scout's `234,999` is a **transaction** count (`/addresses/{addr}/counters → transactions_count`), which the roadmap mis-used as an **event** count anchor for the completeness gate.

**Method:** Public RPC `eth_getLogs` (address-filtered) over the 80 most-recent 1000-block windows from head, + `eth_getTransactionReceipt` on sampled txs. Blockscout `/logs` was rate-limited (429); RPC is the authoritative source here.

**Provenance:**
- RPC endpoint: `https://api.infra.mainnet.somnia.network/`
- Proxy: `0x5E5205CF39E766118C01636bED000A54D93163E6`
- Head block at fetch: `319,686,151`
- UTC fetch: 2026-05-29
- Sample: 249 proxy logs across 80,000 most-recent blocks; 116 unique txs.

## Findings

**Events-per-tx:** mean **2.15** (min 1, max 11).

**Three event topic0s in a 1:1:1 ratio** (sample: 83 / 83 / 83 — exactly balanced):
| topic0 | count | role (inferred — TOPIC-01 to confirm) |
|---|---|---|
| `0x65db1ef5b3bcd84fe4fb8dbbe1cadc9fe6643bb261ab2e01d65c281c3d466af2` | 83 | request-side (paired with 0x5c09) |
| `0x5c090ef48df2b4d8a01bd0639355d62c318b623aed749bdd12325f789e37a2cf` | 83 | request-side (paired with 0x65db) |
| `0xb62339927ed9948fd837358a55f5b9a824f7b047043faece66965593ed726889` | 83 | response-side (per-member; fires 1–5× per tx) |

**Per-tx event compositions** (116 txs):
- 66 txs: `{0x5c09:1, 0x65db:1}` — the request pair, alone
- 20 txs: `{0xb623:1}` — response event, alone
- 17 txs: `{0x5c09:1, 0x65db:1, 0xb623:1}` — all three
- 12 txs: `0xb623` ×2/×3/×5 — response event, multiple per tx (subcommittee responses batched)

**Interpretation:** `0x5c09`+`0x65db` are emitted together ~once per *request-creating* tx (request side); `0xb623` is a *response-side* event firing once per responding subcommittee member (multiplicity 1–5 matches `subSize`-ish). The clean 1:1:1 lifetime balance suggests a structural invariant (each request eventually generates one of each) but is observed only over a recent contiguous window — **lifetime ratio + exact counts are an INDEX-01 deliverable**, not settled by this sample.

## Resolution of the unit mismatch

- `234,999` = **transactions** to the proxy (exact, independent, not subject to the `eth_getLogs` 1000-block cap — Blockscout counter).
- The request pair appears in **~71.5%** of sampled txs (83/116) → `RequestCreated`-type events ≈ **0.7 × 234,999 ≈ ~165k** (order **10⁵**).
- Total proxy events ≈ **2.15 × tx ≈ ~505k**; with the 1:1:1 split, each event type ≈ **~168k**.
- **Both `RequestCreated` (~10⁵) and total events (~5×10⁵) are ≫ the STATS-01 floor (5,000) and ≫ ≥200/class — the distributional framing is safe by ~30×.**

## Anchor-design consequence (for the roadmapper)

There is **no cheap EXACT independent event-count oracle pre-indexing** — a full topic0 sweep is infeasible (capped `eth_getLogs` × sparsity), and Blockscout exposes only the *transaction* counter, not a per-topic log counter. Therefore the completeness gate should:
1. **Anchor TRANSACTION coverage** on `234,999` (exact, independent) — reconcile the indexer's distinct proxy-targeted `tx_hash` count against it.
2. **Bound EVENT completeness** via the measured structural relationship as a sanity check: total events ≈ 2.15 × txs; the three topic0s ≈ 1:1:1; `RequestCreated` ≈ 0.7 × txs. Flag material deviation from these ratios as a completeness anomaly.
3. Treat the exact `RequestCreated` lifetime count as an **INDEX-01 output**, cross-checked against (1)+(2) — not as a pre-known constant.

This makes the gate measure the right unit (events, via the tx anchor + structural ratio) instead of conflating transactions with events.
