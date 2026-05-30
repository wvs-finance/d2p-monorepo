"""INDEX-01 static manifest-lint (Phase 3, Plan 03-03) — NO toolchain, NO network.

Pure file/parse assertions over the authored ``subgraphs/iagentrequester/`` tree.
graph-cli is NOT vendored in CI; ``graph codegen && graph build`` is the
deploy-time toolchain check (Plan 03-04). These tests lint the manifest, schema,
mappings, and README statically so CI gates the INDEX-01 invariants without it.

Consumes the Phase-1 conftest fixtures (``schemas_dir`` -> Path, ``load_json`` ->
callable, ``read_text`` -> callable) as TEST PARAMETERS (N2 contract).
"""

from __future__ import annotations

from pathlib import Path

import pytest
import yaml

# --- Pinned INDEX-01 constants (cross-checked against scout + topic0_map_v1) - #

PROXY = "0x5e5205cf39e766118c01636bed000a54d93163e6"  # B3, lowercased
START_BLOCK = 283417317

# The three OBSERVED topic0s (resolved roles, topic0_map_v1.json).
OBSERVED_TOPIC0S = {
    "0xb62339927ed9948fd837358a55f5b9a824f7b047043faece66965593ed726889",  # RequestCreated
    "0x65db1ef5b3bcd84fe4fb8dbbe1cadc9fe6643bb261ab2e01d65c281c3d466af2",  # RequestFinalized(uint256,uint8)
    "0x5c090ef48df2b4d8a01bd0639355d62c318b623aed749bdd12325f789e37a2cf",  # CommitteeDepositFailed
}
# Defined-but-never-emitted — NOT registered as handlers.
UNOBSERVED_TOPIC0S = {
    "0x15863241ef82702f42fe12b9bc93f3fbc82b50dbc2a3962c70f3249939db605e",  # SubcommitteePaid
    "0xa5b05eec8040da65485bf3ab248b47c42271aa50a9234ed8f116e568dc285cc6",  # NativeTransferFailed
}


# --- subgraph-tree path fixtures (local to this plan) ---------------------- #


@pytest.fixture
def subgraph_dir() -> Path:
    return Path("subgraphs/iagentrequester")


@pytest.fixture
def manifest(subgraph_dir):
    with open(subgraph_dir / "subgraph.yaml", encoding="utf-8") as fh:
        return yaml.safe_load(fh)


@pytest.fixture
def datasource(manifest):
    return manifest["dataSources"][0]


# --------------------------------------------------------------------------- #
# B3: proxy pinned, never null
# --------------------------------------------------------------------------- #


def test_proxy_pinned_never_null(subgraph_dir, datasource, read_text):
    assert datasource["source"]["address"].lower() == PROXY
    # The literal `address: null` must NOT appear anywhere in the manifest text.
    text = read_text(subgraph_dir / "subgraph.yaml")
    assert "address: null" not in text


# --------------------------------------------------------------------------- #
# startBlock resolved (manifest OR networks.json)
# --------------------------------------------------------------------------- #


def test_startblock_resolved(subgraph_dir, datasource, load_json):
    in_manifest = datasource["source"].get("startBlock") == START_BLOCK
    networks = load_json(subgraph_dir / "networks.json")
    in_networks = networks["somnia"]["IAgentRequester"]["startBlock"] == START_BLOCK
    assert in_manifest or in_networks
    # In this plan BOTH carry it; assert they agree.
    assert in_manifest and in_networks


# --------------------------------------------------------------------------- #
# Handlers match the resolved roles; unobserved events NOT registered
# --------------------------------------------------------------------------- #


def _registered_signatures(datasource) -> set[str]:
    return {h["event"] for h in datasource["mapping"]["eventHandlers"]}


def test_handlers_match_resolved_roles(datasource, schemas_dir, load_json):
    handlers = {h["handler"] for h in datasource["mapping"]["eventHandlers"]}
    assert handlers == {
        "handleRequestCreated",
        "handleRequestFinalized",
        "handleCommitteeDepositFailed",
    }

    sigs = _registered_signatures(datasource)
    # RequestFinalized uses the RESOLVED uint8 role (enum canonicalized), not enum-name.
    assert any("RequestFinalized(uint256 indexed,uint8)" == s for s in sigs)
    assert any(s.startswith("RequestCreated(uint256 indexed,uint256 indexed") for s in sigs)
    assert any(s.startswith("CommitteeDepositFailed(uint256 indexed,uint256)") for s in sigs)

    # The two unobserved events are ABI-carried but NOT registered as handlers.
    joined = " ".join(sigs)
    assert "SubcommitteePaid" not in joined
    assert "NativeTransferFailed" not in joined

    # Cross-check: the three registered roles are exactly the OBSERVED topic0 set
    # in topic0_map_v1.json (observed_on_chain == true), and the unobserved ones
    # are present-but-not-observed.
    resolver = load_json(schemas_dir / "topic0_map_v1.json")["resolver"]
    observed = {r["topic0"] for r in resolver if r.get("observed_on_chain")}
    unobserved = {r["topic0"] for r in resolver if not r.get("observed_on_chain")}
    assert observed == OBSERVED_TOPIC0S
    assert unobserved == UNOBSERVED_TOPIC0S


# --------------------------------------------------------------------------- #
# Entity-cap lever: flat Request, no per-member / first-class committee entity
# --------------------------------------------------------------------------- #


def test_entity_model_under_cap(subgraph_dir, read_text):
    schema = read_text(subgraph_dir / "schema.graphql")
    assert "type Request" in schema
    assert "committeeDepositFailedCount" in schema
    assert "committeeDepositFailedAttemptedTotal" in schema
    # The 300k-cap lever: NO first-class CommitteeEvent, NO per-member Response.
    lowered = schema.lower()
    assert "type committeeevent" not in lowered
    assert "type response" not in lowered


# --------------------------------------------------------------------------- #
# The fold is a NON-LOSSY accumulator, not a scalar overwrite
# --------------------------------------------------------------------------- #


def test_fold_is_non_lossy(subgraph_dir, read_text):
    schema = read_text(subgraph_dir / "schema.graphql")
    mapping = read_text(subgraph_dir / "src" / "mapping.ts")

    # schema carries a counter + a running total (not a single scalar amount).
    assert "committeeDepositFailedCount" in schema
    assert "committeeDepositFailedAttemptedTotal" in schema

    # mapping increments the counter (+ 1) and accumulates the total (.plus(),
    # never a bare overwrite) — the non_lossy invariant.
    assert "committeeDepositFailedCount = " in mapping
    assert "+ 1" in mapping  # counter increment
    assert ".plus(" in mapping  # running-total accumulation
    # An overwrite-only fold would assign attemptedAmount directly to a total
    # without .plus(); assert the accumulating form is present.
    assert "committeeDepositFailedAttemptedTotal" in mapping


# --------------------------------------------------------------------------- #
# README documents the LOSSLESS id_gt distinct-tx scan over the lossy cursor
# --------------------------------------------------------------------------- #


def test_distinct_tx_scan_is_id_paginated(subgraph_dir, read_text):
    readme = read_text(subgraph_dir / "README.md")
    # The LOSSLESS cursor is documented.
    assert "id_gt" in readme
    assert "orderBy: id" in readme or "orderBy:id" in readme
    # And the README explicitly warns AGAINST the lossy blockNumber-advanced
    # distinct-tx scan (the same-block drop hazard).
    assert "blockNumber_gt" in readme
    lowered = readme.lower()
    assert "same-block" in lowered or "same block" in lowered


# --------------------------------------------------------------------------- #
# Architecture B: sumExecutionCost reserved (filled off-chain)
# --------------------------------------------------------------------------- #


def test_sumExecutionCost_reserved(subgraph_dir, read_text):
    schema = read_text(subgraph_dir / "schema.graphql")
    assert "sumExecutionCost" in schema
    # Arch B: NO in-subgraph getRequest eth_call in the mappings. A documentary
    # comment naming getRequest is allowed; an actual binding CALL is not. Catch
    # the call forms (`.getRequest(` / `try_getRequest(`) but permit prose that
    # mentions "getRequest eth_call" in a comment.
    mapping = read_text(subgraph_dir / "src" / "mapping.ts")
    assert ".getRequest(" not in mapping
    assert "try_getRequest(" not in mapping
    assert ".try_getRequest(" not in mapping


# --------------------------------------------------------------------------- #
# ABI completeness: getRequest + the 5 events present (Arch-A binding surface)
# --------------------------------------------------------------------------- #


def test_abi_has_getrequest_and_five_events(subgraph_dir, load_json):
    abi = load_json(subgraph_dir / "abis" / "IAgentRequester.json")
    events = {e["name"] for e in abi if e.get("type") == "event"}
    assert events == {
        "RequestCreated",
        "RequestFinalized",
        "SubcommitteePaid",
        "CommitteeDepositFailed",
        "NativeTransferFailed",
    }
    fns = {e["name"] for e in abi if e.get("type") == "function"}
    assert "getRequest" in fns
