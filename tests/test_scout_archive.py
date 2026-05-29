"""KPD-16 scout-archive presence + value + provenance-integrity tests.

These are smoke tests over the *recorded* live-probe facts in the canonical
scout archive (`.planning/scout/2026-05-29/`). The live RPC probes themselves
are network-dependent and run manually (`probes/somnia_rpc.py`); the suite never
hits the network. It asserts:

  - the Plan-01 archive files + the sha256 manifest are present,
  - the load-bearing values (deployment block, getBlockReceipts availability,
    whole-second timestamp, the three on-chain event shapes) are recorded,
  - the sha256 manifest is internally valid AND set-equal to the `.md` files
    actually present (so any future unlisted `.md` fails — Plan 02 appends three
    more and must re-pin them).

Consumes the ``scout_dir`` conftest fixture (returns a repo-root-relative Path).
"""

from __future__ import annotations

import hashlib
from pathlib import Path

# The three topic0 hashes recorded as live on-chain event shapes (KPD-16).
EVENT_TOPIC0S = (
    "0xb62339927ed9948fd837358a55f5b9a824f7b047043faece66965593ed726889",
    "0x5c090ef48df2b4d8a01bd0639355d62c318b623aed749bdd12325f789e37a2cf",
    "0x65db1ef5b3bcd84fe4fb8dbbe1cadc9fe6643bb261ab2e01d65c281c3d466af2",
)

# The four Plan-01 archive .md files (Plan 02 appends three more).
PLAN01_MD_FILES = (
    "event_count_addendum.md",
    "rpc_capability_probe.md",
    "deployment_block.md",
    "event_shapes_onchain.md",
)

MANIFEST = "PROVENANCE.sha256"


def test_archive_files_present(scout_dir: Path) -> None:
    """All four Plan-01 .md files + the sha256 manifest exist."""
    for name in PLAN01_MD_FILES:
        assert (scout_dir / name).is_file(), f"missing archive file: {name}"
    assert (scout_dir / MANIFEST).is_file(), f"missing manifest: {MANIFEST}"


def test_deployment_block_recorded(scout_dir: Path) -> None:
    """deployment_block.md records the resolved proxy deploy block 283417317."""
    text = (scout_dir / "deployment_block.md").read_text(encoding="utf-8")
    assert "283417317" in text


def test_getblockreceipts_recorded(scout_dir: Path) -> None:
    """rpc_capability_probe.md records eth_getBlockReceipts AVAILABLE."""
    text = (scout_dir / "rpc_capability_probe.md").read_text(encoding="utf-8")
    assert "AVAILABLE" in text


def test_whole_second_timestamp(scout_dir: Path) -> None:
    """rpc_capability_probe.md records whole-second block.timestamp granularity."""
    text = (scout_dir / "rpc_capability_probe.md").read_text(encoding="utf-8")
    assert "whole_second" in text


def test_event_shapes_present(scout_dir: Path) -> None:
    """event_shapes_onchain.md records all three live on-chain topic0 hashes."""
    text = (scout_dir / "event_shapes_onchain.md").read_text(encoding="utf-8")
    for topic0 in EVENT_TOPIC0S:
        assert topic0 in text, f"missing topic0 in event_shapes_onchain.md: {topic0}"


def _parse_manifest(manifest_path: Path) -> dict[str, str]:
    """Parse a sha256sum-format manifest -> {relative_path: expected_hash}."""
    entries: dict[str, str] = {}
    for line in manifest_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        # sha256sum format: "<hash>  <path>" (two spaces; path may contain spaces).
        digest, _, rel = line.partition("  ")
        assert rel, f"malformed manifest line: {line!r}"
        entries[rel.strip()] = digest.strip()
    return entries


def test_provenance_manifest_valid(scout_dir: Path) -> None:
    """The sha256 manifest is internally valid AND set-equal to the .md files.

    Two assertions, both KPD-16-bearing:
      1. every file listed in PROVENANCE.sha256 exists and its recomputed
         sha256 matches the recorded digest (tamper-evidence);
      2. SET-EQUALITY — the set of `.md` files listed in the manifest equals the
         set of `.md` files actually present in scout_dir, so an unlisted future
         `.md` fails (forces Plan 02's three new files to be re-pinned).
    Scoped to `.md` files so PROVENANCE.sha256 itself does not false-fail.
    """
    manifest = _parse_manifest(scout_dir / MANIFEST)

    # (1) every listed file exists and its hash matches.
    for rel, expected in manifest.items():
        target = scout_dir / rel
        assert target.is_file(), f"manifest lists missing file: {rel}"
        actual = hashlib.sha256(target.read_bytes()).hexdigest()
        assert actual == expected, (
            f"sha256 mismatch for {rel}: manifest={expected} actual={actual}"
        )

    # (2) set-equality, scoped to .md files only.
    listed_md = {rel for rel in manifest if rel.endswith(".md")}
    present_md = {p.name for p in scout_dir.glob("*.md")}
    assert listed_md == present_md, (
        "manifest .md set != present .md set; "
        f"unlisted={present_md - listed_md} stale={listed_md - present_md}"
    )
