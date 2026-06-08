"""SHARED-SCHEMA-01 — intersection JSON-Schema validity + polars dtype map
(Plan 01-05, Task 3).

These tests enforce the machine-loadable contract of
``schemas/abrigo_cost_panel_intersection_v1.json``:

  * it is a valid draft-2020-12 JSON-Schema (``check_schema``),
  * every property carries an ``x-polars-dtype`` annotation, and the uint256 id
    column (``request_id``) maps to ``Utf8`` ONLY (NEVER Int64, NEVER Decimal) —
    asserted both as the documented annotation AND as an EMPIRICAL polars
    round-trip (B1), so the Utf8-only choice is proven against the library, not
    just stated,
  * ``required`` carries the seven NOT-NULL intersection columns.

Per CONTRACT DECISION N2, the shared helpers ``schemas_dir`` (Path) and
``load_json`` (callable) are consumed as TEST PARAMETERS from conftest.py.
"""

from __future__ import annotations

import jsonschema
import polars as pl
import pytest

_DRAFT_2020_12 = "https://json-schema.org/draft/2020-12/schema"
_INTERSECTION_JSON = "abrigo_cost_panel_intersection_v1.json"

# The seven NOT-NULL intersection columns.
_REQUIRED = {
    "request_id",
    "tx_hash",
    "block_number",
    "block_ts_utc",
    "chain_id",
    "gross_cost_native",
    "schema_version",
}


def test_valid_draft_2020_12(schemas_dir, load_json):
    """The intersection JSON is a valid draft-2020-12 JSON-Schema."""
    s = load_json(schemas_dir / _INTERSECTION_JSON)
    assert s["$schema"] == _DRAFT_2020_12, s.get("$schema")
    # Raises SchemaError if the schema document itself is malformed.
    jsonschema.Draft202012Validator.check_schema(s)
    assert s.get("x-schema-anchor") == "v1-K_AI-anchored"


def test_polars_dtype_map(schemas_dir, load_json):
    """B1 (RUNTIME, not grep-only) — every property carries x-polars-dtype, the
    id column is Utf8 ONLY, and a polars round-trip proves the choice empirically.
    """
    s = load_json(schemas_dir / _INTERSECTION_JSON)
    props = s["properties"]

    # (a) every property carries the dtype annotation.
    assert all("x-polars-dtype" in p for p in props.values()), (
        "every intersection property must carry x-polars-dtype (PITFALLS E1)"
    )

    # (b) the uint256 id column is Utf8 ONLY (never Int64, never Decimal).
    rid_dtype = props["request_id"]["x-polars-dtype"]
    assert rid_dtype == "Utf8", f"request_id x-polars-dtype must be Utf8, got {rid_dtype}"
    assert "Int64" not in rid_dtype
    assert "Decimal" not in rid_dtype

    # (c) the wei column may be Utf8 OR Decimal(38,0), never Int64.
    gcn_dtype = props["gross_cost_native"]["x-polars-dtype"]
    assert gcn_dtype in ("Utf8", "Decimal(38,0)"), (
        f"gross_cost_native x-polars-dtype must be Utf8 or Decimal(38,0), got {gcn_dtype}"
    )
    assert gcn_dtype != "Int64"

    # (d) RUNTIME proof — a 78-digit uint256 id survives Utf8 intact.
    big = str(2**256 - 1)
    assert len(big) == 78
    assert pl.Series([big], dtype=pl.Utf8).to_list()[0] == big, (
        "a 78-digit uint256 id must survive a Utf8 round-trip intact"
    )

    # (e) RUNTIME proof — Decimal(38,0) CANNOT hold the uint256 id (so the
    #     JSON-Schema choosing Utf8 for request_id is empirically correct).
    with pytest.raises(Exception):
        pl.Series([2**256 - 1], dtype=pl.Decimal(38, 0))

    # (f) sanity — a wei-sized amount (<= 38 digits) DOES construct in Decimal(38,0).
    wei = pl.Series([10**17], dtype=pl.Decimal(38, 0))
    assert wei.to_list()[0] == 10**17


def test_required_nonnullable(schemas_dir, load_json):
    """`required` contains the seven NOT-NULL intersection columns."""
    s = load_json(schemas_dir / _INTERSECTION_JSON)
    req = set(s["required"])
    assert _REQUIRED <= req, _REQUIRED - req
