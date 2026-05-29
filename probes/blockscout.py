"""Reusable Blockscout v2 REST probe (KPD-16 tooling).

Blockscout v2 at ``explorer.somnia.network/api/v2`` is the *only* cheap EXACT
independent transaction-count oracle for the proxy (the 234,999
transaction-coverage anchor). It rate-limits hard: ~429 after ~2 rapid calls,
so every call is spaced and the 429 path is retried with backoff.

Stdlib-only (``urllib``). NOT a CI test target (network-dependent). Run::

    uv run python -m probes.blockscout
"""

from __future__ import annotations

import json
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from typing import Any

BLOCKSCOUT_V2 = "https://explorer.somnia.network/api/v2"
PROXY = "0x5E5205CF39E766118C01636bED000A54D93163E6"

# Blockscout 429s after ~2 rapid calls — space requests by at least this much.
MIN_REQUEST_SPACING_S = 1.5


def _utc_now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _get(
    path: str,
    *,
    base: str = BLOCKSCOUT_V2,
    max_retries: int = 5,
    spacing_s: float = MIN_REQUEST_SPACING_S,
    timeout: float = 30.0,
) -> Any:
    """GET ``{base}{path}`` with spaced, 429-aware exponential backoff."""
    url = f"{base}{path}"
    delay = spacing_s
    last_exc: Exception | None = None
    for attempt in range(max_retries):
        # Pre-space every call (Blockscout 429s on rapid bursts).
        time.sleep(delay)
        try:
            req = urllib.request.Request(url, headers={"Accept": "application/json"})
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                return json.loads(resp.read().decode())
        except urllib.error.HTTPError as exc:
            last_exc = exc
            if exc.code == 429:
                delay = min(delay * 2, 30.0)  # back off on rate limit
                continue
            raise
    raise RuntimeError(
        f"GET {url} failed after {max_retries} retries (last={last_exc})"
    )


def tx_count(addr: str = PROXY) -> int:
    """Distinct transaction count for ``addr`` via the address counters endpoint.

    Reads ``/addresses/{addr}/counters -> transactions_count``. This is the
    exact, getLogs-cap-free transaction-coverage anchor (234,999 reference
    snapshot 2026-05-25; re-query live at the indexed head per Phase 3).
    """
    data = _get(f"/addresses/{addr}/counters")
    return int(data["transactions_count"])


def address_logs_page(addr: str = PROXY, *, params: str = "") -> dict[str, Any]:
    """One page of ``/addresses/{addr}/logs`` (paginated; sequential + spaced)."""
    return _get(f"/addresses/{addr}/logs{('?' + params) if params else ''}")


if __name__ == "__main__":  # pragma: no cover - network tooling, not a CI test
    ts = _utc_now()
    print(f"# blockscout probe — source_url={BLOCKSCOUT_V2} utc_fetch_ts={ts}")
    try:
        n = tx_count()
        print(f"proxy transactions_count = {n:,}")
    except Exception as exc:  # noqa: BLE001 - tooling, surface any failure
        print(f"tx_count failed (rate-limit or network): {exc}")
    print(f"# anchor reference snapshot 234,999 (2026-05-25); re-query at Phase-3 head; ts={ts}")
