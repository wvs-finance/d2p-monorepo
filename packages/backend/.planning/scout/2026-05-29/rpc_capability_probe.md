# Scout Archive — Somnia public-RPC capability probe (KPD-16)

> Canonical KPD-16 provenance record for the Somnia chain-capability facts that
> Phase-1 DATA-SOURCE-01 (capability matrix), the Phase-3 parity-mechanism
> selector, and the EVENT-01 arrival-ordering contract all rest on. Every row
> carries `source_url` + `utc_fetch_ts`. Re-confirm any row by running
> `uv run python -m probes.somnia_rpc`.

**Probe tooling:** `probes/somnia_rpc.py` (committed, re-runnable).
**Primary endpoint:** `https://api.infra.mainnet.somnia.network/`
(second working endpoint: `https://somnia.publicnode.com`)
**Proxy under probe:** `0x5E5205CF39E766118C01636bED000A54D93163E6`
**Probe session:** 2026-05-29T20:06Z–20:09Z (live re-run per `01-RESEARCH.md`).

## Capability matrix

| capability | value | source_url | utc_fetch_ts |
|---|---|---|---|
| chain_id | `0x13a7` = 5031 | https://api.infra.mainnet.somnia.network/ | 2026-05-29T20:06Z |
| client_version | `somnia-16638fbbd16be8b-release` | https://api.infra.mainnet.somnia.network/ | 2026-05-29T20:06Z |
| eth_getLogs cap | **1000** blocks (error `block range exceeds 1000` on 1001) | https://api.infra.mainnet.somnia.network/ | 2026-05-29T20:08Z |
| eth_getBlockReceipts | **AVAILABLE** (returns a populated receipt list, not method-not-found) | https://api.infra.mainnet.somnia.network/ | 2026-05-29T20:07Z |
| archive depth | **FULL ARCHIVE** — `eth_getLogs` AND `eth_getStorageAt` correct at deploy block 283417317 | https://api.infra.mainnet.somnia.network/ | 2026-05-29T20:09Z |
| median block cadence | **~100.7 ms/block** over the deploy→head span (refines scout's ~72 ms) | https://api.infra.mainnet.somnia.network/ | 2026-05-29T20:09Z |
| block.timestamp granularity | **whole_second** | https://api.infra.mainnet.somnia.network/ | 2026-05-29T20:07Z |
| baseFeePerGas | 6 gwei = 6000000000 wei (floor non-binding this window) | https://api.infra.mainnet.somnia.network/ | 2026-05-29T20:07Z |
| proxy IMPLEMENTATION_SLOT | `…9af59c5683…3edd` — confirms impl `0x9AF59C5683bb8686596B0D56e4F67655C6B73EdD` | https://api.infra.mainnet.somnia.network/ | 2026-05-29T20:07Z |

## Notes on the load-bearing rows

**`eth_getBlockReceipts` AVAILABLE.** Probed live (`{"result":[...]}`, not
method-not-found). This is the Phase-3 SC#2 parity-mechanism enabler: a
per-block-receipt scan is possible. If a future re-probe returns method-not-found,
`probes/somnia_rpc.get_block_receipts` returns `None`, which downgrades the
parity mechanism to the contiguity proof and feeds back to the free-vs-paid
verdict.

**`block.timestamp` granularity = `whole_second`.** Three consecutive blocks
carried timestamps `1780085231 / 1780085231 / 1780085232` — multiple blocks
share a single whole second. At ~100.7 ms/block, up to ~10 blocks (× N logs)
share one `block_ts_utc`. Therefore the EVENT-01 arrival-ordering key is
`(block_number, log_index)`; `block_ts_utc` is a **coarse secondary** that must
never be the sort primary. (Confirms HIGH-1.)

**`eth_getLogs` cap = 1000 blocks.** A 1001-block window returns
`block range exceeds 1000`. `probes/somnia_rpc.get_logs` asserts the window is
≤1000 so a backfill scan can never silently truncate.

**Archive depth = FULL.** `eth_getLogs` returned logs and `eth_getStorageAt`
returned the correct impl address *at* the deploy block 283417317 — the public
RPC is a full archive node. The deep-history retention worry therefore applies
only to a managed subgraph host (Ormi), not to the chain itself.

> The proxy/impl EIP-1967 ADMIN_SLOT / BEACON_SLOT empties and the EIP-2535
> diamond-storage empty read belong to **KPD-17 in Plan 02** and are recorded in
> `beacon_diamond_probe.md` there. This file records only the proxy
> IMPLEMENTATION_SLOT confirm plus the cap / receipts / archive / cadence /
> timestamp / baseFee facts.
