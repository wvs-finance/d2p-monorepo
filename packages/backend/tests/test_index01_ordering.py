"""INDEX-01 ordering-logic CI tests (Plan 03-02, Task 2).

Pure-logic, network-free. The arrival key is ``(block_number, log_index)``;
``block_ts_utc`` is a DOCUMENTED COARSE SECONDARY (whole-second source), never the
sort key (event_schema_v1.md §"Arrival-ordering contract", ROADMAP SC#7).
"""

from __future__ import annotations

from indexing.ordering import arrival_sort_key, verify_ordering


def test_tuple_ordering():
    """Tuple-for-tuple equality on a multi-log block → match; a differing tuple → mismatch."""
    indexer = [(283417317, 0), (283417317, 1), (283417317, 2)]
    rpc = [(283417317, 0), (283417317, 1), (283417317, 2)]
    assert verify_ordering(indexer, rpc) is True
    scrambled = [(283417317, 0), (283417317, 2), (283417317, 1)]
    assert verify_ordering(scrambled, rpc) is False


def test_timestamp_is_coarse_secondary():
    """Ordering uses (block_number, log_index) ONLY — ts is ignored by the sort key."""
    # Two rows in the same block, same coarse ts, different log_index. A
    # timestamp-only sort would not disambiguate; the sort key must be (bn, li).
    row_a = {"block_number": 283417317, "log_index": 5, "block_ts_utc": 1780085231}
    row_b = {"block_number": 283417317, "log_index": 2, "block_ts_utc": 1780085231}
    assert arrival_sort_key(row_a) == (283417317, 5)
    assert arrival_sort_key(row_b) == (283417317, 2)
    # Sorting by the key orders by log_index even though ts is identical.
    ordered = sorted([row_a, row_b], key=arrival_sort_key)
    assert [r["log_index"] for r in ordered] == [2, 5]
    # The key is a 2-tuple — it never includes the timestamp.
    assert len(arrival_sort_key(row_a)) == 2


def test_cross_block_ordering():
    """Across blocks, the lower block_number sorts first regardless of log_index."""
    rows = [
        {"block_number": 283417318, "log_index": 0, "block_ts_utc": 1780085232},
        {"block_number": 283417317, "log_index": 9, "block_ts_utc": 1780085231},
    ]
    ordered = sorted(rows, key=arrival_sort_key)
    assert [r["block_number"] for r in ordered] == [283417317, 283417318]
