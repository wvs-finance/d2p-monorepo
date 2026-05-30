"""Reusable Somnia public-RPC probe (KPD-16 tooling).

Hardened from the scout's ad-hoc ``/tmp`` JSON-RPC probing into a committed,
re-runnable module. Stdlib-only (``urllib``) so it carries no extra dependency
and runs anywhere ``uv run python`` runs.

Default endpoint is the public archive RPC confirmed full-archive this session
(2026-05-29T20:06Z-20:09Z, see ``.planning/scout/2026-05-29/``); a second
working endpoint is ``https://somnia.publicnode.com``.

NOT a test target: this module reaches the network when functions are called.
The CI suite (``tests/``) only verifies the *recorded* facts in the scout
archive. Run this module directly to re-confirm any archived fact::

    uv run python -m probes.somnia_rpc

Each capability function carries the canonical ``IAgentRequester`` proxy
address as a default so a re-run reproduces the archived reads.
"""

from __future__ import annotations

import json
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from typing import Any

# --- constants (provenance-bearing) ---------------------------------------- #

RPC = "https://api.infra.mainnet.somnia.network/"
RPC_FALLBACK = "https://somnia.publicnode.com"

# Canonical IAgentRequester proxy (mainnet) — SOMNIA_DRAFT / RESEARCH.md.
PROXY = "0x5E5205CF39E766118C01636bED000A54D93163E6"
IMPL = "0x9AF59C5683bb8686596B0D56e4F67655C6B73EdD"

# EIP-1967 / EIP-2535 storage slots (used by KPD-17 in Plan 02).
IMPLEMENTATION_SLOT = (
    "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc"
)
ADMIN_SLOT = "0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103"
BEACON_SLOT = "0xa3f0ad74e5423aebfd80d3ef4346578335a9a72aeaee59ff6cb3582b35133d50"
DIAMOND_STORAGE_SLOT = (
    "0xc8fcad8db84d3cc18b4c41d551ea0ee66dd599cde068d998e57d5e09332c131c"
)

# eth_getLogs hard cap on this endpoint (error "block range exceeds 1000" on 1001).
GETLOGS_MAX_WINDOW = 1000

# Resolved deployment block of the proxy (creation tx 0x36596e...e8b0a).
DEPLOYMENT_BLOCK = 283_417_317


def _utc_now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _rpc(method: str, params: list[Any], *, rpc: str = RPC, timeout: float = 30.0) -> Any:
    """Single JSON-RPC POST. Returns the ``result`` field, raises on RPC error."""
    payload = json.dumps(
        {"jsonrpc": "2.0", "id": 1, "method": method, "params": params}
    ).encode()
    req = urllib.request.Request(
        rpc, data=payload, headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        body = json.loads(resp.read().decode())
    if "error" in body and body["error"] is not None:
        raise RuntimeError(f"{method} RPC error: {body['error']}")
    return body.get("result")


def _hex_int(value: int) -> str:
    return hex(value)


# --- capability functions --------------------------------------------------- #


def chain_id(*, rpc: str = RPC) -> int:
    """Return the chain id as an int (expected 5031 = 0x13a7)."""
    return int(_rpc("eth_chainId", [], rpc=rpc), 16)


def client_version(*, rpc: str = RPC) -> str:
    """Return the node client version string."""
    return _rpc("web3_clientVersion", [], rpc=rpc)


def head_block(*, rpc: str = RPC) -> int:
    """Return the current head block number as an int."""
    return int(_rpc("eth_blockNumber", [], rpc=rpc), 16)


def get_logs(
    addr: str, from_blk: int, to_blk: int, *, rpc: str = RPC
) -> list[dict[str, Any]]:
    """Address-filtered ``eth_getLogs`` over an inclusive block window.

    Asserts the window is within the 1000-block endpoint cap so a caller never
    silently truncates a backfill scan.
    """
    span = to_blk - from_blk + 1
    if span > GETLOGS_MAX_WINDOW:
        raise ValueError(
            f"window {span} blocks exceeds the eth_getLogs cap "
            f"({GETLOGS_MAX_WINDOW}); split the scan into <=1000-block windows"
        )
    return _rpc(
        "eth_getLogs",
        [{"address": addr, "fromBlock": _hex_int(from_blk), "toBlock": _hex_int(to_blk)}],
        rpc=rpc,
    )


def get_block_receipts(blk: int | str, *, rpc: str = RPC) -> list[dict[str, Any]] | None:
    """``eth_getBlockReceipts`` for a block. Returns ``None`` if method-not-found.

    A ``None`` return is the Phase-3 parity-mechanism downgrade signal
    (per-block-receipt scan unavailable -> fall back to contiguity proof).
    Confirmed AVAILABLE on the public RPC this session.
    """
    tag = blk if isinstance(blk, str) else _hex_int(blk)
    try:
        return _rpc("eth_getBlockReceipts", [tag], rpc=rpc)
    except RuntimeError as exc:
        if "method" in str(exc).lower() and "not" in str(exc).lower():
            return None
        raise


def get_storage_at(addr: str, slot: str, blk: int | str = "latest", *, rpc: str = RPC) -> str:
    """``eth_getStorageAt`` — used for beacon/diamond/impl slot reads (KPD-17)."""
    tag = blk if isinstance(blk, str) else _hex_int(blk)
    return _rpc("eth_getStorageAt", [addr, slot, tag], rpc=rpc)


def get_request(request_id: int, block: int | str = "latest", *, rpc: str = RPC) -> str:
    """``eth_call`` of ``getRequest(uint256)`` (selector ``0xc58343ef``) on the proxy.

    Returns the raw hex ``result`` string (the ABI-encoded ``Request`` tuple) for
    the off-chain ``responses`` state-fill (Arch B, Plan 03-04). The aggregate
    ``Σ responses[].executionCost`` is decoded by ``indexing.decode``.

    READ AT THE RequestFinalized BLOCK (or any block ≥ finalization). Reading
    pre-finalization undercounts ``executionCost`` because members report their
    cost as they respond — RESEARCH Pitfall 3. Pass the finalization block (or
    ``"latest"`` only when the request is already known terminal).

    NETWORK-TOUCHING: invoked from the ``__main__`` block / Plan 03-04 live probe,
    NEVER from CI. The CI decode tests run against the frozen synthetic fixture.
    """
    data = "0xc58343ef" + f"{request_id:064x}"
    return _rpc(
        "eth_call",
        [
            {"to": PROXY, "data": data},
            (block if isinstance(block, str) else _hex_int(block)),
        ],
        rpc=rpc,
    )


def get_tx_by_hash(h: str, *, rpc: str = RPC) -> dict[str, Any] | None:
    """``eth_getTransactionByHash`` — used to resolve the proxy deployment block."""
    return _rpc("eth_getTransactionByHash", [h], rpc=rpc)


def get_block(blk: int | str, *, full: bool = False, rpc: str = RPC) -> dict[str, Any] | None:
    """``eth_getBlockByNumber`` — used for cadence + timestamp-granularity reads."""
    tag = blk if isinstance(blk, str) else _hex_int(blk)
    return _rpc("eth_getBlockByNumber", [tag, full], rpc=rpc)


def median_block_cadence_ms(deploy_blk: int, head_blk: int, *, rpc: str = RPC) -> float:
    """Median ms/block over the deploy->head span (endpoint-derived).

    Returns the simple span-average ((head_ts - deploy_ts) / spans * 1000).
    Recorded ~100.7 ms/block this session over the proxy window.
    """
    deploy = get_block(deploy_blk, rpc=rpc)
    head = get_block(head_blk, rpc=rpc)
    if deploy is None or head is None:
        raise RuntimeError("could not fetch deploy/head block for cadence calc")
    d_ts = int(deploy["timestamp"], 16)
    h_ts = int(head["timestamp"], 16)
    spans = head_blk - deploy_blk
    if spans <= 0:
        raise ValueError("head must be greater than deploy block")
    return (h_ts - d_ts) / spans * 1000.0


if __name__ == "__main__":  # pragma: no cover - network tooling, not a CI test
    src = RPC
    ts = _utc_now()
    print(f"# somnia_rpc probe — source_url={src} utc_fetch_ts={ts}")
    cid = chain_id()
    print(f"chain_id          = {cid} ({hex(cid)})")
    print(f"client_version    = {client_version()}")
    head = head_block()
    print(f"head_block        = {head:,}")
    br = get_block_receipts("latest")
    print(f"getBlockReceipts  = {'AVAILABLE' if br is not None else 'method-not-found'}")
    impl_slot = get_storage_at(PROXY, IMPLEMENTATION_SLOT)
    print(f"proxy IMPL slot   = {impl_slot}")
    print(f"deployment_block  = {DEPLOYMENT_BLOCK:,}")
    # getRequest(uint256) live demo — guarded so a non-existent / unfinalized id
    # does not crash the probe. Replace the id with a real finalized requestId.
    demo_request_id = 1
    try:
        raw = get_request(demo_request_id)
        print(f"getRequest({demo_request_id})    = {raw[:74]}… (len={len(raw)})")
    except Exception as exc:  # noqa: BLE001 - probe demo, never fatal
        print(f"getRequest({demo_request_id})    = <skipped: {exc}>")
    print(f"# re-confirm any fact above against the scout archive .md files; ts={ts}")
