"""INDEX-01 parity-degradation CI tests (Plan 03-02, Task 2).

Pure-logic, network-free (``get_logs_fn`` is injected — no real network). Parity is
locked on ``eth_getBlockReceipts`` AVAILABLE (03-RESEARCH Pitfall 4); a receipts-None
return degrades to ``eth_getLogs`` and FLAGS completeness assurance weakened to
contiguity.
"""

from __future__ import annotations

from indexing.parity import parity_reference

PROXY = "0x5e5205cf39e766118c01636bed000a54d93163e6"


def _fake_get_logs(addr, from_blk, to_blk):
    return [{"address": PROXY, "logIndex": "0x0"}]


def test_receipts_none_degrades():
    """receipts=None → degraded fallback to eth_getLogs, weakened assurance."""
    result = parity_reference(
        receipts=None, get_logs_fn=_fake_get_logs, proxy=PROXY, blk=283417317
    )
    assert result["degraded"] is True
    assert result["mechanism"] == "eth_getLogs"
    assert result["assurance"] == "weakened_to_contiguity"


def test_receipts_present_full_assurance():
    """receipts=[...] → not degraded, eth_getBlockReceipts, full assurance."""
    receipts = [
        {"logs": [{"address": PROXY, "logIndex": "0x0"}]},
        {"logs": [{"address": "0xdead", "logIndex": "0x0"}]},
    ]
    result = parity_reference(
        receipts=receipts, get_logs_fn=_fake_get_logs, proxy=PROXY, blk=283417317
    )
    assert result["degraded"] is False
    assert result["mechanism"] == "eth_getBlockReceipts"
    assert result["assurance"] == "full"
