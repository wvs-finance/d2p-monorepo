"""INDEX-01 parity-degradation logic — PURE (``get_logs_fn`` injected, no network).

Parity is LOCKED on ``eth_getBlockReceipts`` AVAILABLE (03-RESEARCH Pitfall 4;
confirmed available on the public RPC). If ``probes/somnia_rpc.get_block_receipts``
returns ``None`` (method-not-found), parity falls back to ``eth_getLogs`` over the
window AND flags completeness assurance weakened to the contiguity proof (Phase 3
SC#2 ``eth_getBlockReceipts``-absent fallback).
"""

from __future__ import annotations

from typing import Any, Callable


def parity_reference(
    receipts: list[dict[str, Any]] | None,
    get_logs_fn: Callable[[str, int, int], list[dict[str, Any]]],
    proxy: str,
    blk: int,
) -> dict[str, Any]:
    """Build the parity reference for ``blk``, degrading on a receipts-None return.

    If ``receipts is None`` (``eth_getBlockReceipts`` method-not-found): fall back to
    ``get_logs_fn`` over the single-block window and return a degraded result flagging
    assurance ``weakened_to_contiguity`` (the per-block-receipt cross-check is
    unavailable, so completeness leans on the contiguity proof). Otherwise extract the
    proxy logs from the receipts and return a full-assurance result.
    """
    proxy_lc = proxy.lower()
    if receipts is None:
        proxy_logs = get_logs_fn(proxy, blk, blk)
        return {
            "degraded": True,
            "mechanism": "eth_getLogs",
            "assurance": "weakened_to_contiguity",
            "proxy_logs": proxy_logs,
        }
    proxy_logs = [
        log
        for receipt in receipts
        for log in receipt.get("logs", [])
        if str(log.get("address", "")).lower() == proxy_lc
    ]
    return {
        "degraded": False,
        "mechanism": "eth_getBlockReceipts",
        "assurance": "full",
        "proxy_logs": proxy_logs,
    }
