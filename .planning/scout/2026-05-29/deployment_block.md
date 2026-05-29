# Scout Archive — Proxy deployment block (KPD-16 / INDEX-01 startBlock)

> Canonical KPD-16 record resolving the `IAgentRequester` proxy deployment block
> from its on-chain creation transaction. This fixes INDEX-01's `startBlock` and
> the backfill span. Re-confirm via `probes/somnia_rpc.get_tx_by_hash` on the
> creation tx.

**Probe tooling:** `probes/somnia_rpc.py`
**Endpoint (source_url):** `https://api.infra.mainnet.somnia.network/`
**Proxy:** `0x5E5205CF39E766118C01636bED000A54D93163E6`
**utc_fetch_ts:** 2026-05-29T20:09Z

## Resolved facts

| fact | value | source_url | utc_fetch_ts |
|---|---|---|---|
| deployment_block | **283417317** | https://api.infra.mainnet.somnia.network/ | 2026-05-29T20:09Z |
| creation tx | `0x36596e1854e413681992166d5d55552d999f820eafdf6f8fe07afef1e66e8b0a` | https://api.infra.mainnet.somnia.network/ | 2026-05-29T20:09Z |
| creation timestamp | 2026-04-17T13:18:10Z (proxy ~42 days old at probe time) | https://api.infra.mainnet.somnia.network/ | 2026-05-29T20:09Z |
| creator EOA | `0x320362C7…fdE88936` | https://api.infra.mainnet.somnia.network/ + Blockscout | 2026-05-29T20:08Z |
| backfill_span | **36,286,846 blocks ≈ 36,287 `eth_getLogs` windows** | derived (head − deploy, 1000-block windows) | 2026-05-29T20:09Z |

## INDEX-01 consequence

**INDEX-01 `startBlock` = 283417317 — RESOLVED** (not TBD-via-creator-EOA-earliest-tx).
The deployment block is read directly from the proxy's creation tx
`blockNumber`, so no creator-EOA tx-history walk is needed.

**Supersedes** the ROADMAP/PROJECT references to "~320M blocks / ~270 days back
to deployment." That figure conflated **chain-age-since-TGE** (2025-09-02) with
**proxy-age**: the proxy is only ~42 days old (deployed 2026-04-17). The true
backfill is **36,286,846 blocks ≈ 36,287 capped `eth_getLogs` windows**, ~9×
smaller than the ~320M assumption.

Downstream effects of the correction:
- INDEX-01 sizing divides by ~9; a direct-RPC archive backfill (~36K sequential
  1000-block calls) is genuinely feasible, so a paid-RPC archive becomes a viable
  fallback rather than infeasible. Ormi stays the *preferred* host (it preserves
  the subgraph mapping surface + the parity mechanism), not the *mandatory* one.
- The chain-side deep-history retention worry collapses (the public RPC is full
  archive at the deploy block); the only remaining retention question is Ormi's,
  resolved by a deploy-and-observe probe in Phase 3.
- KPD-14 gap threshold + STATS-01 cadence use **~100.7 ms/block** (proxy window),
  not ~72 ms.
