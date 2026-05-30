"""INDEX-01 liveness + safe_block_depth logic — PURE (no network).

Liveness (PITFALLS B2): poll ``_meta.block.number`` vs ``eth_blockNumber`` every
5 min; ``gap = rpc_head − indexer_head``. Escalate iff the gap exceeds 60 for 3
CONSECUTIVE polls.

``safe_block_depth`` (KPD-09-empirical, somnia_finality_semantics.md): Somnia asserts
sub-second PBFT finality but not irreversibility, so the working depth is shallow —
``observed_max == 0`` → 1 (PBFT provisional); ``observed > 0`` →
``max(1, observed_max + margin)`` (margin default 1).
"""

from __future__ import annotations

GAP_THRESHOLD = 60
CONSECUTIVE = 3


def should_escalate(gaps: list[int]) -> bool:
    """True iff there is a run of CONSECUTIVE polls each with ``gap > GAP_THRESHOLD``.

    A gap of exactly ``GAP_THRESHOLD`` (60) does NOT count (strict ``>``); a run shorter
    than ``CONSECUTIVE`` (broken by a ≤60 poll) does not escalate.
    """
    run = 0
    for gap in gaps:
        if gap > GAP_THRESHOLD:
            run += 1
            if run >= CONSECUTIVE:
                return True
        else:
            run = 0
    return False


def safe_block_depth(observed_max: int, margin: int = 1) -> int:
    """Conservative cursor depth.

    ``observed_max == 0`` → ``1`` (PBFT provisional shallow depth — no rollback observed);
    ``observed_max > 0`` → ``max(1, observed_max + margin)``.
    """
    if observed_max == 0:
        return 1
    return max(1, observed_max + margin)
