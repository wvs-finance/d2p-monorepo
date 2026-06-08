# IAgentRequester subgraph (INDEX-01, KPD-08)

The arrival-series indexer for the Somnia `IAgentRequester` proxy
`0x5E5205CF39E766118C01636bED000A54D93163E6` (chain 5031), pinned at
`startBlock 283417317` (B3: the proxy address is **never** null in the manifest).

It registers the **three observed** events using the `schemas/topic0_map_v1.json`
**resolved** roles (NOT the scout's inverted labels):

| Event | topic0 | Handler |
|---|---|---|
| `RequestCreated(uint256,uint256,uint256,bytes,address[])` | `0xb623…` | `handleRequestCreated` |
| `RequestFinalized(uint256,uint8)` | `0x65db…` | `handleRequestFinalized` |
| `CommitteeDepositFailed(uint256,uint256)` | `0x5c09…` | `handleCommitteeDepositFailed` |

`SubcommitteePaid` and `NativeTransferFailed` are carried in `abis/IAgentRequester.json`
(for `getRequest` decoding + completeness) but are **never emitted on-chain**, so
they are intentionally NOT registered as handlers.

## Entity model — flat `Request`, non-lossy `CommitteeDepositFailed` fold

One `type Request` per `requestId` (~165k entities → under the 300k free cap).
`CommitteeDepositFailed` is a **structural invariant** (not an error) and is
**retryable** — per the NatSpec it fires whenever the committee-deposit call
reverts, so it can fire **>1× per requestId**. We therefore fold it onto its
`Request` as a **non-lossy accumulator**, never a scalar overwrite:

- `committeeDepositFailedCount: Int!` — incremented (`+ 1`) on every occurrence,
- `committeeDepositFailedAttemptedTotal: BigInt!` — `.plus(attemptedAmount)` each occurrence,
- `committeeDepositFailedLastAmount: BigInt` — last-attempted (reference only).

The fold key is `requestId` (1:1 with `Request`), so the entity count is
**multiplicity-independent**: the counter is a field, not a new entity. A
per-occurrence first-class `CommitteeEvent` entity would push ≈330k+ entities,
brushing the cap — **REJECTED**. There is likewise **no per-member `Response`
entity** (deferred).

## Architecture B — off-chain `sumExecutionCost` fill (Plan 03-04)

The subgraph indexes the **arrival series**; the aggregate `Σ executionCost` is
**not** computed in-subgraph (no `eth_call` / no `try_getRequest` in the mappings).
`Request.sumExecutionCost` is left **NULL** and filled by the off-chain post-pass
in Plan 03-04: call `getRequest(uint256)` (selector **`0xc58343ef`**) at the
request's finalized block, then sum `responses[].executionCost` (the 6th Response
tuple field, index 5 — NOT `receipt` at index 3).

## DEPLOY-PROBE: network slug

The manifest uses `network: somnia`. The mainnet slug `somnia` vs `somnia-mainnet`
is **UNVERIFIED** (testnet docs show `somnia-testnet`); resolve it at deploy time
(Plan 03-04). `networks.json` carries the chain-5031 address + startBlock for
`graph deploy --network` reuse.

## Toolchain validity (deploy-time, NOT CI)

`graph codegen && graph build` is the toolchain validity check, run at deploy
time (Plan 03-04). graph-cli is **not vendored in CI** — the static manifest-lint
`tests/test_index01_manifest.py` validates this tree (proxy pin, startBlock,
resolved-role handlers, entity model, README idioms) **without** a toolchain.

## Reading the indexed store — TWO distinct paginated scans

GraphQL has **no `COUNT(DISTINCT)`** (03-RESEARCH Pitfall 2). The two reads below
use **different cursors on purpose** — do not conflate them.

### (a) leg-b distinct-tx FULL SCAN — page by the unique monotone `id` (LOSSLESS)

To compute the leg-b `indexer_distinct_tx` (the indexer's OWN distinct proxy-tx
count, the denominator Plan 03-04 consumes), paginate by the globally-unique
monotone entity `id`:

```graphql
query($last_id: ID!) {
  requests(first: 1000, where: { id_gt: $last_id }, orderBy: id, orderDirection: asc) {
    id
    txHash
  }
}
```

Advance `$last_id` to the **last** entity's `id` each page; collect every `txHash`
into a Python set → `indexer_distinct_tx = len(set)`. Paging by a globally-unique
monotone key has **no same-key boundary ambiguity** → a lossless full scan.

**CRITICAL (gate-review #2 M-1): do NOT page this distinct-tx scan by
`blockNumber_gt`.** Multiple `Request` entities share a `blockNumber` (1–5× per tx
at ~100 ms blocks), so a strictly-greater `blockNumber` cursor advancing by the
last page's max `blockNumber` **silently drops** the same-block Requests that fell
on the next page. Set-dedup on `txHash` **cannot recover never-fetched rows** → it
**under-counts** `indexer_distinct_tx` and **inflates** the leg-b ratio. `id` is
unique per entity, so `id_gt` pagination has no such hazard.

### (b) projected-overage ENTITY-COUNT scan — page by `blockNumber` (bounded range)

The conservative entity-count re-projection (Plan 03-04) IS a genuine block-RANGE
query over a single ~1M-block chunk, so it MAY page by `blockNumber`:

```graphql
query($lo: BigInt!, $hi: BigInt!) {
  requests(first: 1000, where: { blockNumber_gte: $lo, blockNumber_lt: $hi }, orderBy: blockNumber) {
    id
  }
}
```

It counts entities in a **bounded window** (not a distinct-key full scan), and the
per-chunk total feeds the conservative re-projection. Keep `blockNumber`-windowing
**ONLY** here, where it is genuinely a block-range query — **never** for the
distinct-tx full scan in (a).
