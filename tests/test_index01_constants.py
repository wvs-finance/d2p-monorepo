"""INDEX-01 Wave 0 — recorded-constant assertions (03-VALIDATION.md row #12).

The four load-bearing recorded constants must agree across the probe module, the
scout provenance archive, the decode module, and the machine-checkable capability
matrix. Pure fixture reads — NO network.

  1. deploy block 283417317     — probe constant + scout/deployment_block.md
  2. getRequest selector 0xc58343ef — probes/somnia_rpc.py + indexing/decode.py
  3. eth_getLogs cap 1000        — probe constant
  4. eth_getBlockReceipts AVAILABLE — scout/rpc_capability_probe.md + matrix row

Per CONTRACT DECISION N2, the shared helpers ``scout_dir`` / ``research_dir``
(Path) and ``load_yaml`` / ``read_text`` (callables) are consumed as TEST
PARAMETERS from conftest.py.
"""

from __future__ import annotations

from pathlib import Path

import probes.somnia_rpc as somnia_rpc


def test_deploy_block(scout_dir, read_text):
    """Deploy block 283417317 in the probe constant AND the scout artifact."""
    assert somnia_rpc.DEPLOYMENT_BLOCK == 283417317
    archive = read_text(scout_dir / "deployment_block.md")
    assert "283417317" in archive or "283,417,317" in archive


def test_getrequest_selector(read_text):
    """The getRequest selector 0xc58343ef appears in the probe + decode modules."""
    probe_src = read_text(Path("probes/somnia_rpc.py"))
    decode_src = read_text(Path("indexing/decode.py"))
    assert "0xc58343ef" in probe_src
    assert "0xc58343ef" in decode_src


def test_getlogs_cap():
    """The eth_getLogs endpoint window cap is the recorded 1000."""
    assert somnia_rpc.GETLOGS_MAX_WINDOW == 1000


def test_getblockreceipts_available(scout_dir, research_dir, read_text, load_yaml):
    """eth_getBlockReceipts is AVAILABLE per the scout archive AND the matrix yaml."""
    probe_md = read_text(scout_dir / "rpc_capability_probe.md")
    assert "AVAILABLE" in probe_md
    assert "eth_getBlockReceipts" in probe_md

    matrix = load_yaml(research_dir / "data_sourcing_matrix.yaml")
    rows = matrix["capability_rows"]
    receipts_rows = [
        r
        for r in rows
        if "getblockreceipts" in str(r.get("capability", "")).lower()
        or "get_block_receipts" in str(r.get("capability", "")).lower()
    ]
    assert receipts_rows, "no eth_getBlockReceipts row in the capability matrix"
    assert any(bool(r.get("pass")) for r in receipts_rows), (
        "the eth_getBlockReceipts matrix row must have a truthy pass"
    )
