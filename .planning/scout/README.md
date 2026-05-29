# Scout archive index (KPD-16 provenance)

This directory holds the **scout provenance archive**: live-probed Somnia
chain facts, each recorded with `source_url` + `utc_fetch_ts`, sha256-pinned
for tamper-evidence. KPD-16 (provenance discipline) is ordered FIRST in Phase 1
so no downstream verdict rests on un-pinned data.

## Canonical archive: `2026-05-29/`

**`2026-05-29/` is the canonical archive.** The upstream `2026-05-25/` path
referenced in `ROADMAP.md` / `PROJECT.md` was **never committed** — only the
`2026-05-29/` re-probe survives. This README reconciles the
`2026-05-25 → 2026-05-29` path: any planning-doc reference to a
`.planning/scout/2026-05-25/` artifact resolves to its `2026-05-29/`
counterpart, re-probed live this session against
`https://api.infra.mainnet.somnia.network/` (2026-05-29T20:06Z–20:12Z).

## Files in `2026-05-29/`

| file | purpose |
|---|---|
| `event_count_addendum.md` | RequestCreated count + events-per-tx structural ratios (234,999 tx anchor, 1:1:1 topic0s, ~2.15 events/tx); role labels superseded — see below. |
| `rpc_capability_probe.md` | RPC capability matrix: chain_id, getLogs 1000-cap, getBlockReceipts AVAILABLE, full archive, ~100.7 ms cadence, whole-second timestamp, baseFee, proxy IMPL slot. |
| `deployment_block.md` | Proxy deployment block **283417317** + backfill span (36.3M blocks); supersedes the ~320M / ~270-day error. INDEX-01 startBlock resolved. |
| `event_shapes_onchain.md` | The three live on-chain event SHAPES (topic0 / #topics / data bytes); records shapes not roles — scout role labels likely INVERTED, TOPIC-01 resolves. |
| `PROVENANCE.sha256` | sha256 of every `.md` in this dir (tamper-evidence; set-equality enforced by `tests/test_scout_archive.py`). |

> Plan 02 (Wave 2) appends three more `.md` files to `2026-05-29/`
> (`beacon_diamond_probe.md`, `somnia_finality_semantics.md`,
> `coingecko_convention.md`) and updates `PROVENANCE.sha256` accordingly; the
> set-equality test keeps the manifest and the directory in lockstep.

## Provenance discipline

- Every archive `.md` row carries `source_url` + `utc_fetch_ts`.
- `PROVENANCE.sha256` pins every `.md`; `sha256sum -c` proves no tampering.
- Reusable probe tooling under `probes/` (`somnia_rpc.py`, `blockscout.py`)
  re-confirms any fact: `uv run python -m probes.somnia_rpc`.
