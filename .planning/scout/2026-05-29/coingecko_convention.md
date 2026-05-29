# Scout Archive — KPD-19 CoinGecko OHLC timestamp convention (PITFALLS C1)

> Canonical KPD-19 provenance record. Discharges the pre-flight question that
> gates the Phase-4c FX adapter (FX-01): **does the CoinGecko OHLC timestamp
> mark the candle OPEN or the candle CLOSE?** Getting this wrong injects up to
> one candle-duration of look-ahead into the FX LOCF join and silently poisons
> inequality #1 of `somnia_cost_extraction.md §6`.

**Source:** `https://docs.coingecko.com/reference/coins-id-ohlc`
**utc_fetch_ts:** 2026-05-29T20:10Z
**SOMI coin id:** `somnia` (price ~$0.151, ATL $0.1466 May-2026, full history).

## VERDICT

**CoinGecko OHLC timestamp = candle-CLOSE**
(`docs.coingecko.com/reference/coins-id-ohlc`, fetched 2026-05-29T20:10Z).

**Consequence:** the FX LOCF MUST subtract the candle duration before the strict
`t_price < t_block` join, else up to one candle-duration of look-ahead poisons
**inequality #1**. A candle whose CLOSE timestamp is `XX:00:00Z` summarizes the
interval `(XX-1):00:00Z → XX:00:00Z`; it must only be joined to blocks at
`t_block > XX:00:00Z`, never to blocks inside the interval it summarizes.

## Empirical cross-check intent (deferred to Phase 4c, SC#3)

Phase 4c (FX-01) validates this convention against an **alternative source**
(CoinMarketCap / Messari) for a named SOMI trading day — confirming the joined
FX series agrees within tolerance and that no look-ahead survives the LOCF join.
This file records only the *doc-side* convention; the empirical agreement check
is a Phase-4c deliverable per ROADMAP SC#3.

## Free-tier sourcing note (load-bearing for FX-01 endpoint choice)

- CoinGecko **OHLC hourly granularity is PAID-ONLY** on the OHLC endpoint.
- For FREE hourly data use `coins/{id}/market_chart/range`, which returns hourly
  auto-granularity for 1–90 day windows on the free Demo tier. These are
  **instant price points** (not OHLC candles), so the candle-CLOSE look-ahead
  correction does not apply to the `market_chart/range` path — but the endpoint
  is recorded in `adapters/fx/coingecko_config.yaml` as the free fallback, and
  the candle-CLOSE rule governs the OHLC endpoint whenever it is used.
- SOMI id confirmed `somnia` (~$0.151); full history available.
