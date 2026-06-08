"""INDEX-01 arrival-ordering verifier — PURE (no network).

The canonical arrival key is ``(block_number, log_index)`` (event_schema_v1.md
§"Arrival-ordering contract", ROADMAP SC#7). ``block_ts_utc`` is a DOCUMENTED COARSE
SECONDARY — the source is whole-second, so at ~100 ms/block up to ~10 blocks × N logs
share a single timestamp; a timestamp sort scrambles intra-second arrival order.
``block_ts_utc`` is therefore NEVER the sort key.
"""

from __future__ import annotations

from typing import Mapping


def arrival_sort_key(row: Mapping[str, int]) -> tuple[int, int]:
    """Return the arrival key ``(block_number, log_index)`` — NEVER includes block_ts_utc.

    A 2-tuple, by construction: the timestamp is coarse-secondary and is excluded so a
    timestamp-only sort cannot scramble intra-second arrival order.
    """
    return (row["block_number"], row["log_index"])


def verify_ordering(
    indexer_tuples: list[tuple[int, int]], rpc_tuples: list[tuple[int, int]]
) -> bool:
    """Tuple-for-tuple equality of the two ordered ``(block_number, log_index)`` sequences.

    True iff the indexer's emitted arrival order matches the recorded RPC tuple
    sequence exactly (multi-log-block ordering, SC#7).
    """
    return list(indexer_tuples) == list(rpc_tuples)
