"""IMPL-01 fixture tests for the impl_history.parquet design (Plan 02-02).

Phase 2, Wave 2. No live RPC in CI — every assertion is either a pure-logic check
against a synthetic in-Python impl_history frame (the M1 floor-only case), a
recorded constant (the bytecode-backstop hash, the deploy block), or a substring
check against the committed schemas/impl_history_v1.md design via the Phase-1
conftest fixtures (schemas_dir -> Path, read_text -> callable).

impl_history.parquet is DESIGN-only in Phase 2 (Phase 3 / INDEX-01 materializes
it), so these tests build a synthetic frame inline and do NOT read a parquet file.

Constant provenance: live probe https://api.infra.mainnet.somnia.network/
(utc_fetch_ts 2026-05-29T22:06Z), re-runnable via probes/somnia_rpc.py
(__main__-only, never in CI). See schemas/impl_history_v1.md.
"""

from __future__ import annotations

# --------------------------------------------------------------------------- #
# Recorded IMPL-01 constants (asserted against the synthetic frame + design doc)
# --------------------------------------------------------------------------- #

# Proxy deploy block; an Upgraded(address) fires AT this block (the floor row's
# impl_first_seen_block) -> NOT a synthetic floor, and NOT quarantined.
DEPLOY_BLOCK = 283417317

# The single observed M1 implementation (lowercased EIP-1967 slot value).
IMPL_ADDRESS = "0x9af59c5683bb8686596b0d56e4f67655c6b73edd"

# Head-row bytecode backstop = keccak(eth_getCode(impl@head)) — the IMPL code
# (18,507 bytes), NEVER the 130-byte proxy stub.
BACKSTOP_KECCAK = "0x13e721a63c4b1c87655c94a9765a602d4b55703a3cc313d07a7bc1a9fe7f3b44"

# EIP-1967 Upgraded(address) topic0 (pinned by the keccak harness in Plan 02-01's
# tests/test_topic_resolution.py — reused here, NOT re-deriving the dependency).
UPGRADED_TOPIC0 = "0xbc7cd75a20ee27fd9adebab32041f755214dbc6bffa90cc0225b39da2e5c2d3b"

# set_by_event enum domain (impl_history_v1.md column contract).
SET_BY_EVENT_DOMAIN = {"upgraded", "deploy_floor", "bytecode_backstop"}


# --------------------------------------------------------------------------- #
# PITFALLS A1 quarantine rule — a module-level pure predicate so the test asserts
# the rule directly (it is the encoded form of §5 of impl_history_v1.md).
# --------------------------------------------------------------------------- #


def is_quarantined(
    upgrade_block: int, candidate_block: int, deploy_block: int = DEPLOY_BLOCK
) -> bool:
    """PITFALLS A1 +/-10-block unresolved_impl_transition quarantine.

    Returns True ONLY when the Upgraded is a POST-deploy logic transition
    (strictly after the deploy block) AND the candidate block is within +/-10
    blocks of it. The deploy-block Upgraded (upgrade_block == deploy_block)
    establishes the floor row and quarantines NOTHING — else the genesis
    impl-set at the deploy block would censor the very first requests.
    """
    return (upgrade_block > deploy_block) and (abs(candidate_block - upgrade_block) <= 10)


def _synthetic_floor_frame() -> list[dict]:
    """The M1 expected case: a single floor row spanning [DEPLOY_BLOCK, inf).

    Built inline (in-Python list of dicts) — Phase 2 materializes no parquet, so
    this stands in for the eventual Phase-3 impl_history.parquet head segment.
    """
    return [
        {
            "chain_id": 5031,
            "implementation_address": IMPL_ADDRESS,
            "impl_first_seen_block": DEPLOY_BLOCK,
            "impl_last_seen_block": None,  # NULL = open infinity / head
            "set_by_event": "upgraded",  # REAL deploy-block Upgraded, not synthetic
            "set_by_tx_hash": "0x" + "ab" * 32,  # the deploy-block Upgraded tx
            "impl_bytecode_keccak": BACKSTOP_KECCAK,
            "verified_at_head_block": DEPLOY_BLOCK + 5_000_000,
            "schema_version": "impl_history_v1",
        }
    ]


def _design_doc(schemas_dir, read_text) -> str:
    return read_text(schemas_dir / "impl_history_v1.md")


# --------------------------------------------------------------------------- #
# test_floor_row — KPD-07: always >=1 row; the floor row spans [283417317, inf)
# --------------------------------------------------------------------------- #


def test_floor_row():
    """The M1 impl_history has >=1 row; the floor row spans [283417317, inf) with
    the single observed impl and set_by_event='upgraded' (a real deploy-block
    Upgraded corroborates it — not a synthetic floor)."""
    frame = _synthetic_floor_frame()
    assert len(frame) >= 1  # KPD-07: never empty
    floor = frame[0]
    assert floor["impl_first_seen_block"] == DEPLOY_BLOCK
    assert floor["impl_last_seen_block"] is None  # open head (infinity)
    assert floor["implementation_address"] == IMPL_ADDRESS
    assert floor["set_by_event"] == "upgraded"
    assert floor["set_by_event"] in SET_BY_EVENT_DOMAIN
    # a real Upgraded => a non-null tx hash (synthetic deploy_floor would be NULL)
    assert floor["set_by_tx_hash"] is not None


def test_floor_row_design_documented(schemas_dir, read_text):
    """The design doc records the floor-row bounds + the deploy block + the
    deploy_floor synthetic fallback."""
    doc = _design_doc(schemas_dir, read_text)
    assert str(DEPLOY_BLOCK) in doc
    assert IMPL_ADDRESS in doc
    assert "deploy_floor" in doc  # synthetic fallback documented
    # COALESCE join semantics on the open-head segment
    assert "COALESCE" in doc


# --------------------------------------------------------------------------- #
# test_bytecode_backstop — latest-row hash == recorded value; design says
# "hash the impl, never the proxy" (the 130-byte proxy-stub anti-pattern).
# --------------------------------------------------------------------------- #


def test_bytecode_backstop(schemas_dir, read_text):
    """The latest (open-head) row's impl_bytecode_keccak == the recorded backstop
    hash; the design states the backstop hashes the IMPL not the proxy, pinning
    the 'hash impl, not proxy' decision so a regression to hashing the 130-byte
    proxy stub fails this test."""
    frame = _synthetic_floor_frame()
    head_row = frame[-1]  # latest = open-head row (impl_last_seen_block is None)
    assert head_row["impl_last_seen_block"] is None
    assert head_row["impl_bytecode_keccak"] == BACKSTOP_KECCAK

    doc = _design_doc(schemas_dir, read_text)
    # the load-bearing anti-pattern phrase
    assert "never the proxy" in doc.lower()
    # the proxy-stub size is documented as the thing NOT to hash
    assert "130-byte" in doc
    # the IMPL size (the thing we DO hash)
    assert "18,507" in doc or "18507" in doc
    # the recorded hash appears in the design
    assert BACKSTOP_KECCAK in doc


# --------------------------------------------------------------------------- #
# test_a1_quarantine_excludes_deploy_block — the PITFALLS A1 rule, asserted on
# the pure predicate.
# --------------------------------------------------------------------------- #


def test_a1_quarantine_excludes_deploy_block():
    """Deploy-block Upgraded quarantines NOTHING (it sets the floor row); a
    post-deploy Upgraded applies the +/-10-block band."""
    # deploy-block Upgraded: upgrade_block == DEPLOY_BLOCK -> never quarantines,
    # not even its own +/-5 neighborhood (the genesis requests must survive).
    assert is_quarantined(DEPLOY_BLOCK, DEPLOY_BLOCK) is False
    assert is_quarantined(DEPLOY_BLOCK, DEPLOY_BLOCK + 5) is False
    assert is_quarantined(DEPLOY_BLOCK, DEPLOY_BLOCK - 5) is False
    assert is_quarantined(DEPLOY_BLOCK, DEPLOY_BLOCK + 10) is False

    # a synthetic POST-deploy Upgraded at 290000000 DOES quarantine its +/-10 band
    post = 290_000_000
    assert post > DEPLOY_BLOCK
    assert is_quarantined(post, 290_000_005) is True  # within +/-10
    assert is_quarantined(post, 290_000_010) is True  # boundary inclusive
    assert is_quarantined(post, 290_000_050) is False  # outside +/-10
    assert is_quarantined(post, 289_999_990) is True  # symmetric lower edge
    assert is_quarantined(post, 289_999_989) is False  # just past lower edge


def test_a1_quarantine_design_documented(schemas_dir, read_text):
    """The design doc encodes the A1 rule: post-deploy => +/-10 quarantine; the
    deploy-block Upgraded establishes the floor and is NOT quarantined."""
    doc = _design_doc(schemas_dir, read_text)
    assert "unresolved_impl_transition" in doc
    assert "is_quarantined" in doc  # the predicate is pinned in the design
    # strictly-after-deploy guard wording
    assert "> deploy_block" in doc or "strictly AFTER" in doc or "strictly after" in doc


# --------------------------------------------------------------------------- #
# test_upgraded_only_segmentation — Supersedes-A2: Upgraded registered;
# AdminChanged + BeaconUpgraded NOT registered.
# --------------------------------------------------------------------------- #


def test_upgraded_only_segmentation(schemas_dir, read_text):
    """The design carries the Supersedes note: Upgraded(address) is the ONLY
    registered transition event; AdminChanged + BeaconUpgraded are NOT registered
    (deliberate PITFALLS-A2 override defended by the bytecode backstop)."""
    doc = _design_doc(schemas_dir, read_text)
    lower = doc.lower()
    assert "## supersedes" in lower
    assert "upgraded(address)" in lower  # the registered event
    # both NOT-registered events are named in the not-registered context
    assert "AdminChanged" in doc
    assert "BeaconUpgraded" in doc
    assert "not registered" in lower or "NOT registered" in doc
    # the override target is explicit
    assert "A2" in doc
    # the backstop is named as the defense
    assert "backstop" in lower


def test_upgraded_topic0_matches_plan_01_harness():
    """The Upgraded(address) topic0 pinned here equals the keccak harness constant
    from Plan 02-01 (reuse, do NOT re-add the dependency)."""
    from eth_hash.auto import keccak

    assert "0x" + keccak(b"Upgraded(address)").hex() == UPGRADED_TOPIC0
