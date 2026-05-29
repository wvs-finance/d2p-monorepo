"""KPD-11a batch-manifest schema validation tests (Plan 01-04, Task 3).

Enforces that the example manifest validates against its JSON-Schema, that the
schema's ``required`` array enumerates all 11 fields, and that the validator
actually REJECTS an incomplete manifest (proving it enforces, not just parses).

Per CONTRACT DECISION N2, ``schemas_dir`` (Path), ``load_yaml`` and ``load_json``
(callables) are consumed as TEST PARAMETERS from conftest.py.
"""

from __future__ import annotations

import copy

import jsonschema
import pytest

REQUIRED_FIELDS = {
    "run_id",
    "rpc_endpoint",
    "subgraph_endpoint",
    "indexer_commit_sha",
    "from_block",
    "to_block",
    "observed_impl_address",
    "fx_cache_sha256",
    "topic0_map_sha256",
    "impl_history_sha256",
    "schema_version_sha256",
}


def test_manifest_validates(schemas_dir, load_yaml, load_json):
    """The example manifest validates against its JSON-Schema."""
    schema = load_json(schemas_dir / "batch_manifest_v1.schema.json")
    manifest = load_yaml(schemas_dir / "batch_manifest_v1.yaml")
    jsonschema.validate(manifest, schema)  # raises on failure


def test_required_fields(schemas_dir, load_json):
    """The schema's required array contains all 11 fields."""
    schema = load_json(schemas_dir / "batch_manifest_v1.schema.json")
    required = set(schema["required"])
    missing = REQUIRED_FIELDS - required
    assert not missing, f"schema required[] missing fields: {missing}"


def test_missing_field_rejected(schemas_dir, load_yaml, load_json):
    """Deleting schema_version_sha256 makes jsonschema.validate raise —
    proving the validator enforces completeness (the KPD-11b write-time gate)."""
    schema = load_json(schemas_dir / "batch_manifest_v1.schema.json")
    manifest = copy.deepcopy(load_yaml(schemas_dir / "batch_manifest_v1.yaml"))
    del manifest["schema_version_sha256"]
    with pytest.raises(jsonschema.ValidationError):
        jsonschema.validate(manifest, schema)
