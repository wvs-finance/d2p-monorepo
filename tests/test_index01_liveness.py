"""INDEX-01 liveness-logic CI tests (Plan 03-02, Task 3).

Pure-logic, network-free. Gap-escalation (PITFALLS B2: gap>60 for 3 CONSECUTIVE
polls) + ``safe_block_depth`` (KPD-09-empirical / somnia_finality_semantics.md:
observed_max=0 → 1 (PBFT provisional); observed>0 → max(1, observed+margin)).
"""

from __future__ import annotations

from indexing.liveness import (
    CONSECUTIVE,
    GAP_THRESHOLD,
    safe_block_depth,
    should_escalate,
)


def test_gap_escalation():
    """Three consecutive gaps >60 → escalate; a broken run or all ≤60 → no escalate."""
    assert should_escalate([61, 61, 61]) is True
    assert should_escalate([10, 61, 70, 80, 5]) is True  # run of 3 in the middle
    # Run broken before reaching 3 consecutive.
    assert should_escalate([61, 61, 40, 61]) is False
    # All gaps at-or-below threshold.
    assert should_escalate([60, 60, 60, 60]) is False
    assert should_escalate([1, 2, 3]) is False
    # Boundary: exactly 60 is NOT > 60.
    assert should_escalate([60, 61, 61]) is False
    assert GAP_THRESHOLD == 60
    assert CONSECUTIVE == 3


def test_safe_block_depth_rule():
    """observed_max=0 → 1; observed>0 → max(1, observed+margin)."""
    assert safe_block_depth(0) == 1                      # PBFT provisional
    assert safe_block_depth(3, margin=1) == 4
    assert safe_block_depth(0, margin=5) == 1            # zero-observed special case holds
    assert safe_block_depth(2) == 3                      # default margin 1
    assert safe_block_depth(1, margin=0) == 1            # max(1, ...) floor
