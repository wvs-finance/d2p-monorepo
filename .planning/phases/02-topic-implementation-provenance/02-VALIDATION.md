---
phase: 2
slug: topic-implementation-provenance
status: planned
nyquist_compliant: true
wave_0_complete: false
created: 2026-05-29
---

# Phase 2 — Validation Strategy

> Per-phase validation contract. Populated by the planner from `02-RESEARCH.md §Validation Architecture` + the two PLAN.md files. Every task carries an `<automated>` verify or depends on the Wave-0 keccak dependency. No network in CI.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest (uv-managed, Phase-1 harness already in place) |
| **Config file** | `pyproject.toml` (exists from Phase 1; Wave 0 adds `eth-hash[pycryptodome]` to the dev group via `uv add --group dev`) |
| **Quick run command** | `uv run pytest tests/test_topic_resolution.py tests/test_impl_history.py -x` |
| **Full suite command** | `uv run pytest tests/ -q` |
| **Estimated runtime** | sub-second (keccak/JSON/parquet-schema logic; no network in CI) |

---

## Sampling Rate

- **After every task commit:** `uv run pytest tests/test_topic_resolution.py tests/test_impl_history.py -x`
- **After every plan wave:** full suite `uv run pytest tests/ -q`
- **Before verify-work:** full suite green; `topic0_map_v1.json` keccak-resolves all 3 observed topic0s; the scout set-equality test still green (Phase 2 added no scout `.md`).
- **Max feedback latency:** < 1 task (no 3-consecutive-task gap without an automated verify).

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------|-------------------|--------|
| T1 keccak-dep + ABI provenance + harness | 02-01 | 1 | TOPIC-01 (Wave 0) | unit | `uv run pytest tests/test_topic_resolution.py::test_keccak_tooling_verified -x` | ⬜ pending |
| T2 topic0_map resolver + SC#5 + gate | 02-01 | 1 | TOPIC-01 | unit | `uv run pytest tests/test_topic_resolution.py -x` | ⬜ pending |
| T3 doc-accuracy blob-vs-commit fix | 02-01 | 1 | TOPIC-01 (doc) | grep | `! grep -q "commit \`e15d4e9\`" CLAUDE.md .planning/PROJECT.md` | ⬜ pending |
| T1 impl_history_v1.md design | 02-02 | 2 | IMPL-01 | grep | `grep -q "283417317" schemas/impl_history_v1.md && grep -q "0x13e721a6" schemas/impl_history_v1.md && grep -qi "never the proxy" schemas/impl_history_v1.md` | ⬜ pending |
| T2 test_impl_history.py | 02-02 | 2 | IMPL-01 | unit (fixture) | `uv run pytest tests/test_impl_history.py -x` | ⬜ pending |
| T3 02-FORWARD-NOTES.md | 02-02 | 2 | IMPL-01 (hand-off) | grep | `grep -qi "state-fill" …/02-FORWARD-NOTES.md && grep -q "CommitteeDepositFailed" …` | ⬜ pending |

**Behavior-level coverage (from RESEARCH §Validation Architecture, all in `tests/test_topic_resolution.py` unless noted):**
- `test_keccak_tooling_verified` — keccak reproduces the EIP-1967 `Upgraded(address)` constant `0xbc7cd75a…` (proves keccak-256, not NIST sha3_256).
- `test_observed_topic0s_resolve` — `0xb623…`→RequestCreated, `0x65db…`→RequestFinalized, `0x5c09…`→CommitteeDepositFailed; recompute `keccak(signature)==topic0` per resolved row.
- `test_enum_canonical_uint8` — RequestFinalized signature is `RequestFinalized(uint256,uint8)` (not `ResponseStatus`) → `0x65db…`.
- `test_field_layout_hash_determinism` — RequestCreated `field_layout_hash == 0x9b58ba75…`; reordered args → different hash.
- `test_no_indexed_dynamic_field` (SC#5) — zero indexed-dynamic fields across all 5 events → no `event_schema_v1.md → v2` bump.
- `test_decode_status_enum` — domain ⊆ {resolved, unresolved_abi, unresolved_impl_transition}; the 5 mapped events all `resolved`.
- `test_unresolved_gate` — `pct_logs_unresolved < 1%` on a synthetic counter; threshold flips at 1.0.
- `test_floor_row` (test_impl_history.py) — one row `[283417317, ∞)`, impl `0x9af5…3edd`, `set_by_event='upgraded'`.
- `test_bytecode_backstop` (test_impl_history.py) — latest-row hash `== 0x13e721a6…`; design states "never the proxy" (hash the IMPL, not the 130-byte proxy stub).
- `test_a1_quarantine_excludes_deploy_block` (test_impl_history.py) — deploy-block Upgraded quarantines nothing; a post-deploy Upgraded applies ±10.
- `test_upgraded_only_segmentation` (test_impl_history.py) — Supersedes-A2 note present; AdminChanged + BeaconUpgraded NOT registered.

---

## Wave 0 Requirements

Phase-1 pytest harness + `tests/conftest.py` fixtures already exist. Wave 0 here is minimal and lives inside **Plan 02-01 Task 1**:

- [ ] `uv add --group dev "eth-hash[pycryptodome]"` — the keccak dependency (verified against the EIP-1967 `Upgraded` constant in `test_keccak_tooling_verified`). NEVER `hashlib.sha3_256` (NIST SHA3, wrong padding).
- [ ] `tests/test_topic_resolution.py` scaffolded with the verified keccak harness as the first test + the `field_layout_hash` helper.
- [ ] `references/interfaces/PROVENANCE.sha256` — git blob SHA `e15d4e94…` row so the resolver's `abi_source.blob_sha` is checkable (`git hash-object references/interfaces/IAgentRequester.sol` reproduces it). The recovered ABI is already committed at `references/interfaces/IAgentRequester.sol`.

> Note: Phase 2 adds NO `.md` to `.planning/scout/2026-05-29/`, so the KPD-16 scout-archive set-equality test (`test_provenance_manifest_valid`) stays green untouched. The ABI provenance lives in a SEPARATE manifest at `references/interfaces/PROVENANCE.sha256`.

---

## Manual-Only Verifications

- Live-RPC re-confirmation (deploy-block `Upgraded`, `eth_getCode` at the IMPL `0x9af5…3edd`, absence of post-deploy `Upgraded` / `SubcommitteePaid` / `NativeTransferFailed`) — recorded with provenance in `02-RESEARCH.md`. The runnable probe (`probes/somnia_rpc.py`, `__main__`-only) re-confirms but the live call is NOT in the CI suite (would flake). The recorded constants (`0x13e721a6…`, block 283417317) are asserted against fixtures instead.

---

## Validation Sign-Off

- [x] All tasks have an `<automated>` verify or a Wave-0 dependency
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers keccak tooling + ABI/topic0 fixtures
- [x] No watch-mode flags
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** planner-approved 2026-05-29 (pending plan-review gate per CLAUDE.md three-step pipeline before execution).
