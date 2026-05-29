"""Plan 01-02 pre-flight verdict smoke tests (KPD-17 / KPD-09-docs / KPD-19).

Asserts the three recorded pre-flight verdict artifacts contain their
load-bearing conclusions. These are content smoke tests over committed scout
files + the FX config — they never hit the network (the live RPC/HTTP probes
that produced the verdicts ran manually at execution; only their recorded
outputs are tested here, matching the test_scout_archive.py pattern).

Consumes the ``scout_dir`` conftest fixture (returns a repo-root-relative Path).
"""

from __future__ import annotations

from pathlib import Path

import yaml

FX_CONFIG = Path("adapters/fx/coingecko_config.yaml")


def test_kpd17_beacon_diamond_happy_path(scout_dir: Path) -> None:
    """beacon_diamond_probe.md records the KPD-17 happy-path verdict + slot hashes."""
    text = (scout_dir / "beacon_diamond_probe.md").read_text(encoding="utf-8")
    assert "HAPPY PATH" in text
    # BEACON_SLOT hash (so a downstream consumer can grep the exact slot probed).
    assert "0xa3f0ad74e5423aebfd80d3ef4346578335a9a72aeaee59ff6cb3582b35133d50" in text
    # EIP-2535 diamond storage slot.
    assert "0xc8fcad8db84d3cc18b4c41d551ea0ee66dd599cde068d998e57d5e09332c131c" in text
    # IMPL-01 scope conclusion.
    assert "0x9AF59C5683bb8686596B0D56e4F67655C6B73EdD" in text


def test_kpd09_docs_finality_provisional(scout_dir: Path) -> None:
    """somnia_finality_semantics.md records safe_block_depth=1, MEDIUM, branch (a)."""
    text = (scout_dir / "somnia_finality_semantics.md").read_text(encoding="utf-8")
    assert "safe_block_depth = 1" in text
    assert "MEDIUM" in text
    assert "Branch (a)" in text
    assert "docs.somnia.network" in text


def test_kpd19_coingecko_candle_close(scout_dir: Path) -> None:
    """coingecko_convention.md records candle-CLOSE + the inequality-#1 consequence."""
    text = (scout_dir / "coingecko_convention.md").read_text(encoding="utf-8")
    lower = text.lower()
    assert "candle-close" in lower
    assert "inequality #1" in text


def test_kpd19_fx_config_timestamp_convention_close() -> None:
    """adapters/fx/coingecko_config.yaml loads with timestamp_convention == 'close'."""
    cfg = yaml.safe_load(FX_CONFIG.read_text(encoding="utf-8"))
    assert cfg["timestamp_convention"] == "close"
    assert cfg["coin_id"] == "somnia"
