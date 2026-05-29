"""EVENT-01 DDL-lint + uint256-overflow runtime guard (Plan 01-04, Task 3).

These tests enforce the load-bearing invariants of ``schemas/event_schema_v1.md``:

  * arrival-timing columns are first-class NOT NULL,
  * the arrival-ordering key is ``(block_number, log_index)`` and the dedup key
    is ``(chain_id, tx_hash, log_index)``,
  * uint256 id columns are ``pl.Utf8`` ONLY (NEVER Int64, NEVER Decimal(38,0)) —
    asserted both as a documented constraint (DDL-lint) AND as an EMPIRICAL
    polars round-trip (runtime), so the rule is proven against the library, not
    just asserted in prose,
  * the responses child table + KPD-18 reservations are present,
  * ``block_ts_utc`` is documented as a coarse secondary.

Per CONTRACT DECISION N2, the shared helpers ``schemas_dir`` (Path) and
``read_text`` (callable) are consumed as TEST PARAMETERS from conftest.py.
"""

from __future__ import annotations

import polars as pl
import pytest


def test_arrival_fields_nonnullable(schemas_dir, read_text):
    """block_number, log_index, block_ts_utc are marked NOT NULL in the DDL."""
    ddl = read_text(schemas_dir / "event_schema_v1.md")
    for col in ("block_number", "log_index", "block_ts_utc"):
        assert col in ddl, f"{col} missing from DDL"
    # Each arrival column row carries the bold NOT NULL marker.
    assert ddl.count("**NOT NULL**") >= 3, (
        "expected >=3 bold NOT NULL markers for the arrival-timing columns"
    )
    assert "load-bearing (arrival-periodicity primacy)" in ddl


def test_ordering_and_dedup_keys(schemas_dir, read_text):
    """Both the (block_number, log_index) ordering key and the
    (chain_id, tx_hash, log_index) dedup key are documented."""
    ddl = read_text(schemas_dir / "event_schema_v1.md")
    assert "(block_number, log_index)" in ddl, "arrival-ordering key missing"
    assert "(chain_id, tx_hash, log_index)" in ddl, "dedup key missing"


def test_uint256_not_int64(schemas_dir, read_text):
    """B1 — the single most common silent-corruption trap, enforced THREE ways.

    (a) DDL-lint: the doc states the id columns are pl.Utf8 ONLY and explicitly
        NOT Int64 AND NOT Decimal(38,0).
    (b) RUNTIME polars round-trip: a 78-digit uint256 id string survives a Utf8
        round-trip intact, AND Decimal(38,0) REJECTS the same id (proves the
        Utf8-only rule empirically, not just in prose).
    (c) sanity: a SOMI-wei-sized value (<= 38 digits) DOES construct in
        Decimal(38,0) (proves the wei-amount Decimal scope is valid).
    """
    # (a) DDL-lint — documented constraint.
    ddl = read_text(schemas_dir / "event_schema_v1.md")
    assert "Utf8 ONLY" in ddl
    assert "NEVER `pl.Int64`/`pl.UInt64`" in ddl
    assert "NEVER `pl.Decimal(38,0)`" in ddl
    assert "78" in ddl  # uint256 = up to 78 decimal digits

    # (b) RUNTIME round-trip — empirical proof.
    big = str(2**256 - 1)
    assert len(big) == 78
    assert pl.Series([big], dtype=pl.Utf8).to_list()[0] == big, (
        "78-digit uint256 id must survive a Utf8 round-trip intact"
    )
    with pytest.raises(Exception):
        # uint256 max has 78 digits > Decimal128's 38 -> OverflowError on polars >=1.20.
        pl.Series([2**256 - 1], dtype=pl.Decimal(38, 0))

    # (c) sanity — wei-sized amount fits Decimal(38,0).
    wei = pl.Series([10**17], dtype=pl.Decimal(38, 0))
    assert wei.to_list()[0] == 10**17, (
        "a SOMI-wei-sized amount (<=38 digits) must construct in Decimal(38,0)"
    )


def test_responses_child_table(schemas_dir, read_text):
    """The responses child table carries member_index + the FK (chain_id, tx_hash)."""
    ddl = read_text(schemas_dir / "event_schema_v1.md")
    assert "member_index" in ddl
    assert "(chain_id, tx_hash) → requests" in ddl


def test_kpd18_reservations(schemas_dir, read_text):
    """agent_class_keccak + agent_class_string are reserved (KPD-18)."""
    ddl = read_text(schemas_dir / "event_schema_v1.md")
    assert "agent_class_keccak" in ddl
    assert "agent_class_string" in ddl


def test_block_ts_secondary(schemas_dir, read_text):
    """block_ts_utc is documented as a coarse secondary, never sort-primary."""
    ddl = read_text(schemas_dir / "event_schema_v1.md")
    assert "coarse secondary" in ddl.lower()
