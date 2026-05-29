"""KPD-19 candle-convention helper — framework-agnostic, consumed by Phase 4c.

CoinGecko OHLC timestamps mark the candle **CLOSE** (KPD-19, recorded in
``.planning/scout/2026-05-29/coingecko_convention.md`` and asserted by
``adapters/fx/coingecko_config.yaml::timestamp_convention``). A candle whose
CLOSE timestamp is ``T`` summarizes the interval ``(T - candle_duration, T]``,
so under a strict no-look-ahead LOCF join an FX candle may only be attached to a
block whose timestamp is **strictly greater** than the candle's close ts.

This module is intentionally dependency-free (stdlib ``datetime`` only) so the
Phase-4c FX adapter (FX-01) can import it directly without pulling in pytest.

The single load-bearing rule it encodes (ROADMAP Phase 4 SC#4):

    For a block at ``XX:00:30Z`` with hourly candles, the candle to LOCF-join is
    the one that CLOSED at ``XX:00:00Z`` (the candle that just closed), NEVER the
    candle closing at ``(XX+1):00:00Z`` (not yet closed at block time).
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

# The CoinGecko OHLC timestamp convention (KPD-19). Mirrors
# adapters/fx/coingecko_config.yaml::timestamp_convention.
CANDLE_CONVENTION = "close"


def joined_candle_close_ts(
    block_ts_utc: datetime,
    candle_duration_s: int = 3600,
) -> datetime:
    """Return the close-ts of the candle to LOCF-join for ``block_ts_utc``.

    Under the candle-CLOSE convention, the joinable candle is the most-recent
    candle whose CLOSE timestamp is **strictly before** the block timestamp
    (a candle is only usable once it has closed; joining a candle whose close
    ts equals or exceeds the block ts injects look-ahead).

    Candles close on the grid ``{..., k * candle_duration_s, ...}`` (epoch
    seconds). For a block at ``XX:00:30Z`` with hourly candles this returns the
    candle that closed at ``XX:00:00Z`` (just closed), never ``(XX+1):00:00Z``
    (not yet closed). For a block exactly on a candle boundary (``XX:00:00Z``)
    the candle closing at ``XX:00:00Z`` has only just closed *at* the block ts,
    not strictly before it, so the previous candle (``(XX-1):00:00Z``) is
    returned — preserving the strict ``t_price < t_block`` guarantee.

    Args:
        block_ts_utc: the block timestamp (tz-aware UTC ``datetime``).
        candle_duration_s: candle duration in seconds (default hourly = 3600).

    Returns:
        A tz-aware UTC ``datetime`` for the close ts of the joinable candle.
    """
    if block_ts_utc.tzinfo is None:
        raise ValueError("block_ts_utc must be timezone-aware (UTC)")

    block_epoch = block_ts_utc.timestamp()
    # Greatest candle-close grid point strictly less than the block ts.
    # Using floor((t - 1e-9)/d) handles the on-boundary case (strict <).
    k = -(-int(block_epoch) // candle_duration_s)  # ceil(block_epoch/d)
    candidate = k * candle_duration_s
    # candidate is the smallest grid point >= block_epoch; step back to the
    # greatest grid point strictly < block_epoch.
    while candidate >= block_epoch:
        candidate -= candle_duration_s
    return datetime.fromtimestamp(candidate, tz=timezone.utc)


# A small in-memory example dataset (block_ts, expected joined candle-close ts),
# hourly candles. Consumed by the unit test and reusable as a Phase-4c sanity
# vector. Each pair encodes "join the just-closed candle, never the future one."
_H = 3600
EXAMPLE_HOURLY_CASES = [
    # block at XX:00:30Z -> joins the candle that closed at XX:00:00Z (just closed),
    # NOT the one closing at (XX+1):00:00Z.
    (
        datetime(2026, 5, 29, 14, 0, 30, tzinfo=timezone.utc),
        datetime(2026, 5, 29, 14, 0, 0, tzinfo=timezone.utc),
    ),
    # block mid-hour at XX:30:00Z -> same just-closed candle at XX:00:00Z.
    (
        datetime(2026, 5, 29, 14, 30, 0, tzinfo=timezone.utc),
        datetime(2026, 5, 29, 14, 0, 0, tzinfo=timezone.utc),
    ),
    # block exactly on a boundary XX:00:00Z -> strict < forces the PREVIOUS candle.
    (
        datetime(2026, 5, 29, 14, 0, 0, tzinfo=timezone.utc),
        datetime(2026, 5, 29, 13, 0, 0, tzinfo=timezone.utc),
    ),
    # block one second after a boundary -> the candle that just closed.
    (
        datetime(2026, 5, 29, 14, 0, 1, tzinfo=timezone.utc),
        datetime(2026, 5, 29, 14, 0, 0, tzinfo=timezone.utc),
    ),
]
