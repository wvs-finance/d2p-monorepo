"""SHARED-SCHEMA-01 — cross-artifact PK / join-key / dtype consistency
(Plan 01-05, Task 3).

These tests enforce that the intersection schema, the K_AI sidecar extension, and
EVENT-01 (``event_schema_v1.md``) agree on:

  * the intersection PK ``(chain_id, tx_hash, request_id)`` — documented in the
    intersection .md AND reflected in the JSON ``required``,
  * the K_AI extension join key ``(chain_id, tx_hash)``,
  * the dtype/nullability framing for the columns SHARED with EVENT-01
    (``block_number`` UInt64 NOT NULL, ``block_ts_utc`` coarse-secondary,
    uint256-ids-not-Int64) — i.e. the N-drift fix: the same column names + dtype
    framing across both schema files.

Per CONTRACT DECISION N2, the shared helpers ``schemas_dir`` (Path), ``load_json``
and ``read_text`` (callables) are consumed as TEST PARAMETERS from conftest.py.
"""

from __future__ import annotations

_INTERSECTION_MD = "abrigo_cost_panel_intersection_v1.md"
_INTERSECTION_JSON = "abrigo_cost_panel_intersection_v1.json"
_EXTENSION_MD = "abrigo_cost_panel_k_ai_extensions_v1.md"
_EVENT_MD = "event_schema_v1.md"

_PK = "(chain_id, tx_hash, request_id)"
_JOIN_KEY = "(chain_id, tx_hash)"


def test_intersection_pk_consistent(schemas_dir, read_text, load_json):
    """The PK (chain_id, tx_hash, request_id) is in the .md AND its three parts
    are all in the JSON `required`."""
    md = read_text(schemas_dir / _INTERSECTION_MD)
    assert _PK in md, "intersection PK missing from the .md"

    s = load_json(schemas_dir / _INTERSECTION_JSON)
    req = set(s["required"])
    for part in ("chain_id", "tx_hash", "request_id"):
        assert part in req, f"PK part {part} not in JSON required"
    # The JSON also pins the PK explicitly as an annotation.
    assert s.get("x-intersection-pk") == ["chain_id", "tx_hash", "request_id"]


def test_extension_join_key(schemas_dir, read_text):
    """(chain_id, tx_hash) is the documented K_AI extension join key."""
    ext = read_text(schemas_dir / _EXTENSION_MD)
    assert _JOIN_KEY in ext, "K_AI extension join key missing"
    assert "SIDECAR" in ext, "the extension must declare itself a SIDECAR"


def test_dtype_consistency_with_event_schema(schemas_dir, read_text):
    """Columns shared between EVENT-01 and the intersection carry the SAME dtype /
    nullability framing across both files (N-drift fix)."""
    event = read_text(schemas_dir / _EVENT_MD)
    inter = read_text(schemas_dir / _INTERSECTION_MD)

    # block_number: UInt64 + NOT NULL in BOTH files.
    for txt, where in ((event, "event_schema"), (inter, "intersection")):
        assert "`pl.UInt64`" in txt, f"block_number UInt64 missing in {where}"
        assert "**NOT NULL**" in txt, f"NOT NULL marker missing in {where}"

    # block_ts_utc: documented as a coarse secondary in BOTH files.
    for txt, where in ((event, "event_schema"), (inter, "intersection")):
        assert "coarse secondary" in txt.lower(), (
            f"block_ts_utc coarse-secondary framing missing in {where}"
        )

    # uint256 id columns: Utf8-only, NEVER Decimal(38,0), in BOTH files.
    for txt, where in ((event, "event_schema"), (inter, "intersection")):
        assert "Utf8 ONLY" in txt, f"Utf8-ONLY rule missing in {where}"
        assert "78" in txt, f"uint256 78-digit rationale missing in {where}"
        assert "Decimal128's 38" in txt, f"Decimal128-cap rationale missing in {where}"

    # shared snake_case column names present in the intersection.
    for col in ("chain_id", "tx_hash", "block_number", "block_ts_utc"):
        assert col in inter, f"shared column {col} missing from intersection"
        assert col in event, f"shared column {col} missing from event_schema"
