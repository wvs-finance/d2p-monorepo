"""KPD-19 unit tests for the candle-CLOSE convention helper.

Proves the no-look-ahead LOCF rule that gates Phase-4c FX-01 (ROADMAP Phase 4
SC#4): a block at ``XX:00:30Z`` joins the candle that just CLOSED at
``XX:00:00Z``, never the future candle closing at ``(XX+1):00:00Z``. The helper
is imported directly (it is framework-agnostic, stdlib-only).
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from tests.fixtures.fx_candle_convention import (
    CANDLE_CONVENTION,
    EXAMPLE_HOURLY_CASES,
    joined_candle_close_ts,
)


def test_convention_is_close() -> None:
    """The module-level convention constant matches the KPD-19 verdict."""
    assert CANDLE_CONVENTION == "close"


def test_block_at_xx0030_joins_just_closed_candle() -> None:
    """A block at XX:00:30Z joins the candle closed at XX:00:00Z, not the future one."""
    block = datetime(2026, 5, 29, 14, 0, 30, tzinfo=timezone.utc)
    joined = joined_candle_close_ts(block, candle_duration_s=3600)
    assert joined == datetime(2026, 5, 29, 14, 0, 0, tzinfo=timezone.utc)
    # Explicitly: NOT the candle closing at the next boundary (look-ahead).
    future = datetime(2026, 5, 29, 15, 0, 0, tzinfo=timezone.utc)
    assert joined != future


def test_strict_no_look_ahead_for_all_example_cases() -> None:
    """Every example pair: joined candle close ts is STRICTLY before the block ts."""
    for block_ts, expected in EXAMPLE_HOURLY_CASES:
        joined = joined_candle_close_ts(block_ts, candle_duration_s=3600)
        assert joined == expected, (block_ts, joined, expected)
        # strict t_price < t_block — the load-bearing no-look-ahead guarantee.
        assert joined < block_ts


def test_on_boundary_block_uses_previous_candle() -> None:
    """A block exactly on a boundary must NOT join the candle closing at that boundary."""
    block = datetime(2026, 5, 29, 14, 0, 0, tzinfo=timezone.utc)
    joined = joined_candle_close_ts(block, candle_duration_s=3600)
    assert joined == datetime(2026, 5, 29, 13, 0, 0, tzinfo=timezone.utc)
    assert joined < block


def test_joined_candle_is_within_one_duration() -> None:
    """The joined candle is the MOST-recent eligible one (within one duration)."""
    block = datetime(2026, 5, 29, 14, 45, 0, tzinfo=timezone.utc)
    joined = joined_candle_close_ts(block, candle_duration_s=3600)
    assert block - joined <= timedelta(seconds=3600)
    assert joined < block
