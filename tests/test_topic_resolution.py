"""TOPIC-01 + Wave-0 unit tests for the IAgentRequester topic0 resolver.

Phase 2, Plan 02-01. No network in CI — every assertion is either a pure-logic
keccak recomputation or reads the committed ``schemas/topic0_map_v1.json`` via the
Phase-1 conftest fixtures (``schemas_dir`` -> Path, ``load_json`` -> callable).

NON-NEGOTIABLE tooling gate: the resolver uses keccak-256 (eth_hash / pycryptodome
backend), NEVER ``hashlib.sha3_256`` (NIST SHA3 — wrong padding). The first test
pins the keccak backend against the EIP-1967 ``Upgraded(address)`` constant; a
sha3_256 backend would produce 0x0e51260f… and fail this gate.
"""

from __future__ import annotations

from eth_hash.auto import keccak

# EIP-1967 Upgraded(address) topic0 — the keccak self-proof constant.
UPGRADED_TOPIC0 = "0xbc7cd75a20ee27fd9adebab32041f755214dbc6bffa90cc0225b39da2e5c2d3b"

# Wrong-backend witness: NIST sha3_256("Upgraded(address)") diverges from keccak.
# (kept as documentation of the proven divergence; not asserted as a constant)
_SHA3_256_WITNESS_PREFIX = "0x0e51260f"

# The single observed M1 implementation (lowercased EIP-1967 slot value).
IMPL_ADDRESS = "0x9af59c5683bb8686596b0d56e4f67655c6b73edd"

# The recovered, blob-SHA-pinned ABI source of truth.
ABI_BLOB_SHA = "e15d4e94ef9a0c09c8971ac1061098b929325028"

# decode_status enum domain (used in BOTH the resolver output and the quarantine table).
DECODE_STATUS_DOMAIN = {"resolved", "unresolved_abi", "unresolved_impl_transition"}

# SC#5 result, computed below from the resolved ABI: zero indexed args is a
# dynamic type across all five events -> no event_schema_v1.md -> v2 bump.
DYNAMIC_TYPES = ("bytes", "string")


def topic0(sig: str) -> str:
    """Canonical event topic0 = '0x' + keccak(canonical_signature)."""
    return "0x" + keccak(sig.encode()).hex()


def field_layout_hash(name: str, args: list[tuple[str, bool]]) -> tuple[str, str]:
    """field_layout_hash per RESEARCH §Pattern 2.

    args: ordered list of (canonical_abi_type, indexed_bool). Returns the canonical
    string and its hash. The canonical string is SOURCE-ORDER (not indexed-first),
    each arg suffixed ':I' (indexed) or ':D' (data):
        '<EventName>(<type0>:<I|D>,<type1>:<I|D>,…)'
    """
    canon = name + "(" + ",".join(f"{t}:{'I' if idx else 'D'}" for t, idx in args) + ")"
    return canon, "0x" + keccak(canon.encode()).hex()


def _is_dynamic(abi_type: str) -> bool:
    """A type is dynamic if it is bytes/string or a dynamic array (ends with '[]')."""
    return abi_type in DYNAMIC_TYPES or abi_type.endswith("[]")


# --------------------------------------------------------------------------- #
# Wave 0 — keccak tooling gate (Task 1)
# --------------------------------------------------------------------------- #


def test_keccak_tooling_verified():
    """keccak reproduces the EIP-1967 Upgraded constant exactly (proves keccak-256,
    NOT NIST sha3_256 — the latter would yield 0x0e51260f…)."""
    assert topic0("Upgraded(address)") == UPGRADED_TOPIC0


def test_keccak_is_not_sha3_256():
    """Defensive: confirm the keccak backend is NOT NIST sha3_256 (which diverges)."""
    import hashlib

    sha3 = "0x" + hashlib.sha3_256(b"Upgraded(address)").hexdigest()
    assert sha3 != UPGRADED_TOPIC0
    assert sha3.startswith(_SHA3_256_WITNESS_PREFIX)


# --------------------------------------------------------------------------- #
# TOPIC-01 — resolver tests (Task 2): consume the committed topic0_map_v1.json
# --------------------------------------------------------------------------- #


def _load_resolver(schemas_dir, load_json):
    m = load_json(schemas_dir / "topic0_map_v1.json")
    assert m["schema_version"] == "topic0_map_v1"
    return m["resolver"]


def test_observed_topic0s_resolve(schemas_dir, load_json):
    """The 3 observed topic0s appear in the resolver with their exact signatures,
    decode_status 'resolved', and the single M1 impl address."""
    resolver = _load_resolver(schemas_dir, load_json)
    observed = {
        "0xb62339927ed9948fd837358a55f5b9a824f7b047043faece66965593ed726889": "RequestCreated(uint256,uint256,uint256,bytes,address[])",
        "0x65db1ef5b3bcd84fe4fb8dbbe1cadc9fe6643bb261ab2e01d65c281c3d466af2": "RequestFinalized(uint256,uint8)",
        "0x5c090ef48df2b4d8a01bd0639355d62c318b623aed749bdd12325f789e37a2cf": "CommitteeDepositFailed(uint256,uint256)",
    }
    by_topic0 = {r["topic0"]: r for r in resolver}
    for t0, sig in observed.items():
        assert t0 in by_topic0, f"observed topic0 {t0} missing from resolver"
        row = by_topic0[t0]
        assert row["signature"] == sig
        assert row["decode_status"] == "resolved"
        assert row["implementation_address"] == IMPL_ADDRESS


def test_keccak_resolution_self_proof(schemas_dir, load_json):
    """For EVERY resolved row, recompute keccak(signature) == topic0 (do not trust
    the file). Also pins abi_source.blob_sha to the recovered blob."""
    resolver = _load_resolver(schemas_dir, load_json)
    assert len(resolver) == 5
    for row in resolver:
        assert topic0(row["signature"]) == row["topic0"], (
            f"keccak({row['signature']}) != {row['topic0']}"
        )
        assert row["abi_source"]["blob_sha"] == ABI_BLOB_SHA


def test_enum_canonical_uint8(schemas_dir, load_json):
    """RequestFinalized canonicalizes ResponseStatus -> uint8 (the single most likely
    keccak mistake). Signature must contain 'uint8', NOT 'ResponseStatus', and hash
    to 0x65db…; the enum-name form would (wrongly) hash to 0x02eec8fd…."""
    resolver = _load_resolver(schemas_dir, load_json)
    rf = next(r for r in resolver if r["event_name"] == "RequestFinalized")
    assert "uint8" in rf["signature"]
    assert "ResponseStatus" not in rf["signature"]
    assert rf["topic0"] == "0x65db1ef5b3bcd84fe4fb8dbbe1cadc9fe6643bb261ab2e01d65c281c3d466af2"
    # the wrong (enum-name) form must NOT collide with the resolved topic0:
    assert topic0("RequestFinalized(uint256,ResponseStatus)") != rf["topic0"]


def test_field_layout_hash_determinism(schemas_dir, load_json):
    """RequestCreated's field_layout_hash == 0x9b58ba75…; recompute it from the row's
    indexed/data args (source order, :I/:D scheme). A reordered-args input yields a
    DIFFERENT hash (determinism + order sensitivity)."""
    resolver = _load_resolver(schemas_dir, load_json)
    rc = next(r for r in resolver if r["event_name"] == "RequestCreated")
    # build (type, indexed) in source order from indexed_args + data_args
    args = [(a["type"], True) for a in rc["indexed_args"]] + [
        (a["type"], False) for a in rc["data_args"]
    ]
    canon, h = field_layout_hash("RequestCreated", args)
    assert canon == "RequestCreated(uint256:I,uint256:I,uint256:D,bytes:D,address[]:D)"
    assert h == "0x9b58ba757cb55c0f041e54b88e3bfa0fe42457e16705c55bafb82c312fd39dd2"
    assert h == rc["field_layout_hash"]
    # order sensitivity: swap the first two args -> different hash
    _, h_reordered = field_layout_hash("RequestCreated", [args[1], args[0]] + args[2:])
    assert h_reordered != h


def test_all_field_layout_hashes_match(schemas_dir, load_json):
    """Every resolved row's field_layout_hash recomputes from its own args."""
    resolver = _load_resolver(schemas_dir, load_json)
    for row in resolver:
        args = [(a["type"], True) for a in row["indexed_args"]] + [
            (a["type"], False) for a in row["data_args"]
        ]
        _, h = field_layout_hash(row["event_name"], args)
        assert h == row["field_layout_hash"], (
            f"{row['event_name']} field_layout_hash mismatch"
        )


def test_no_indexed_dynamic_field(schemas_dir, load_json):
    """SC#5: across all 5 events, NO indexed arg is a dynamic type (string/bytes/
    dynamic array). => INDEXED_DYNAMIC_FIELD_COUNT == 0, SCHEMA_V2_BUMP_REQUIRED False
    (confirm-and-document, not a migration)."""
    resolver = _load_resolver(schemas_dir, load_json)
    indexed_dynamic_count = sum(
        1 for row in resolver for a in row["indexed_args"] if _is_dynamic(a["type"])
    )
    INDEXED_DYNAMIC_FIELD_COUNT = indexed_dynamic_count
    SCHEMA_V2_BUMP_REQUIRED = INDEXED_DYNAMIC_FIELD_COUNT > 0
    assert INDEXED_DYNAMIC_FIELD_COUNT == 0
    assert SCHEMA_V2_BUMP_REQUIRED is False


def test_decode_status_enum(schemas_dir, load_json):
    """decode_status across the map ⊆ {resolved, unresolved_abi, unresolved_impl_transition};
    the 3 observed + 2 registered are all 'resolved'."""
    resolver = _load_resolver(schemas_dir, load_json)
    statuses = {row["decode_status"] for row in resolver}
    assert statuses <= DECODE_STATUS_DOMAIN
    assert statuses == {"resolved"}


def test_two_registered_unobserved_events(schemas_dir, load_json):
    """SubcommitteePaid + NativeTransferFailed are registered (cost-zero) to prevent a
    future unresolved_abi false positive."""
    resolver = _load_resolver(schemas_dir, load_json)
    names = {row["event_name"] for row in resolver}
    assert {"SubcommitteePaid", "NativeTransferFailed"} <= names
    sp = next(r for r in resolver if r["event_name"] == "SubcommitteePaid")
    nt = next(r for r in resolver if r["event_name"] == "NativeTransferFailed")
    assert sp["topic0"] == "0x15863241ef82702f42fe12b9bc93f3fbc82b50dbc2a3962c70f3249939db605e"
    assert nt["topic0"] == "0xa5b05eec8040da65485bf3ab248b47c42271aa50a9234ed8f116e568dc285cc6"


def _pct_logs_unresolved(unresolved_count: int, total_logs: int) -> float:
    """STATS-01 ship gate numerator pipeline (Phase 2 fixes this; the total-log
    denominator is an INDEX-01/Phase-3 output)."""
    return unresolved_count / total_logs * 100.0


def test_unresolved_gate():
    """<1% gate: 50/10000 -> 0.5% PASSES (< 1.0); 150/10000 -> 1.5% FAILS. Prove the
    threshold flips."""
    pass_pct = _pct_logs_unresolved(50, 10_000)
    fail_pct = _pct_logs_unresolved(150, 10_000)
    assert pass_pct == 0.5
    assert pass_pct < 1.0  # ship gate passes
    assert fail_pct == 1.5
    assert not (fail_pct < 1.0)  # ship gate fails


def test_unresolved_topics_design_documented(schemas_dir, load_json, read_text):
    """unresolved_topics_v1.md documents the KPD-06 columns, decode_status enum, the
    <1% gate, and SC#5."""
    doc = read_text(schemas_dir / "unresolved_topics_v1.md")
    assert "pct_logs_unresolved" in doc
    for col in ("topic0", "implementation_address", "first_seen_block", "observed_count"):
        assert col in doc
    for status in DECODE_STATUS_DOMAIN:
        assert status in doc
    assert "SC#5" in doc
