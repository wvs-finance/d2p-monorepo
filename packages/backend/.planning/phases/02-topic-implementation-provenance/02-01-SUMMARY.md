---
phase: 02-topic-implementation-provenance
plan: 01
subsystem: schema
tags: [keccak, eth-hash, topic0, abi-resolution, eip-1967, provenance, polars-design]

# Dependency graph
requires:
  - phase: 01-data-sourcing-gate-schema-foundations
    provides: "EVENT-01 event_schema_v1.md (topic0 domain + KPD-18 agent_class reservations), conftest fixtures (schemas_dir/load_json/read_text), uv-managed pytest harness, PROVENANCE manifest discipline"
provides:
  - "schemas/topic0_map_v1.json — per-(impl, topic0) ABI resolver: 5 events (3 observed + 2 registered) each with keccak-self-proven topic0, field_layout_hash, decode_status, abi_source.blob_sha"
  - "schemas/unresolved_topics_v1.md — KPD-06 quarantine parquet design (columns, decode_status enum, <1% pct_logs_unresolved ship gate, SC#5 confirm-and-document block)"
  - "references/interfaces/PROVENANCE.sha256 — git blob-SHA pin (e15d4e94…) for the recovered IAgentRequester ABI"
  - "tests/test_topic_resolution.py — 12 pure-logic/fixture tests (keccak self-proof, 3-topic0 resolution, enum-uint8, field_layout_hash determinism, SC#5, decode_status enum, <1% gate)"
  - "eth-hash[pycryptodome] keccak tooling in the dev group"
  - "Doc-accuracy fix: e15d4e9 relabelled git blob SHA (not commit) in CLAUDE.md + PROJECT.md"
affects: [03-subgraph-indexing, 05-panel-materialization, 06-statistics, IMPL-01, INDEX-01, PANEL-01, STATS-01, BYTECODE-01]

# Tech tracking
tech-stack:
  added: ["eth-hash[pycryptodome] (keccak-256)"]
  patterns:
    - "Per-(implementation_address, topic0) resolver, never a global topic0 map (KPD-01)"
    - "field_layout_hash = keccak('Name(type:I|D,…)') in SOURCE order with :I/:D suffixes — independent key from topic0"
    - "keccak self-proof in tests: recompute keccak(signature)==topic0 for every row, never trust the committed file"
    - "Register defined-but-unobserved events (cost-zero) to prevent future unresolved_abi false positives"

key-files:
  created:
    - schemas/topic0_map_v1.json
    - schemas/unresolved_topics_v1.md
    - references/interfaces/PROVENANCE.sha256
    - tests/test_topic_resolution.py
  modified:
    - pyproject.toml
    - uv.lock
    - CLAUDE.md
    - .planning/PROJECT.md

key-decisions:
  - "All 3 observed topic0s resolved by exact keccak match — no quarantine path needed for M1 (expected pct_logs_unresolved = 0.0%)"
  - "RequestFinalized canonicalizes ResponseStatus enum -> uint8 (RequestFinalized(uint256,uint8) -> 0x65db…); the enum-name form is test-pinned to NOT collide"
  - "SC#5: zero indexed-dynamic fields across all 5 events (every indexed arg is uint256/address value type) -> no event_schema_v1.md -> v2 bump (confirm-and-document, not a migration)"
  - "field_layout_hash canonical string is SOURCE order with :I/:D suffixes (not indexed-first); RequestCreated -> 0x9b58ba75…"
  - "e15d4e9 is a git BLOB SHA (git hash-object reproduces it byte-for-byte), NOT a commit SHA — wording corrected in CLAUDE.md + PROJECT.md; pin value unchanged"

patterns-established:
  - "Per-(impl, topic0) ABI resolver shape (KPD-01) — forward-compatible for a future Upgraded"
  - "keccak-256 via eth_hash.auto, NEVER hashlib.sha3_256 (NIST SHA3 wrong padding — proven to diverge: sha3_256 yields 0x0e51260f…)"
  - "Test harness self-proves the keccak backend against the EIP-1967 Upgraded constant 0xbc7cd75a… as the first (non-negotiable) gate"

requirements-completed: [TOPIC-01]

# Metrics
duration: ~4min
completed: 2026-05-29
---

# Phase 2 Plan 01: Topic & Implementation Provenance (TOPIC-01) Summary

**Per-(impl, topic0) ABI resolver `topic0_map_v1.json` resolving all 3 observed IAgentRequester topic0s (+ 2 registered) by exact keccak-256 match against the blob-SHA-pinned ABI, with field_layout_hash, decode_status enum, SC#5 no-v2-bump confirmation, and the KPD-06 quarantine design — keccak tooling self-proven against the EIP-1967 Upgraded constant.**

## Performance

- **Duration:** ~4 min (task commits spanned 18:38:55 → 18:42:51 -0400)
- **Started:** 2026-05-29T22:38:55Z
- **Completed:** 2026-05-29T22:42:51Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments
- `schemas/topic0_map_v1.json`: 5 resolver rows (RequestCreated, RequestFinalized, CommitteeDepositFailed observed; SubcommitteePaid, NativeTransferFailed registered-but-unobserved). Every row keccak-self-proves `keccak(signature)==topic0` and carries `field_layout_hash`, `decode_status: "resolved"`, `implementation_address: 0x9af5…3edd`, `abi_source.blob_sha: e15d4e94…`.
- keccak tooling (`eth-hash[pycryptodome]`) added to the dev group; `test_keccak_tooling_verified` reproduces the EIP-1967 `Upgraded(address)` constant `0xbc7cd75a…` exactly, and `test_keccak_is_not_sha3_256` proves the NIST sha3_256 backend diverges (0x0e51260f…).
- `RequestFinalized` enum canonicalization pinned: signature contains `uint8` (not `ResponseStatus`) and hashes to `0x65db…`; the enum-name form is test-asserted to NOT collide.
- `field_layout_hash` determinism + order-sensitivity: RequestCreated recomputes to `0x9b58ba75…` from source-order `:I/:D` args; a reordered-args input yields a different hash; all 5 rows recompute from their own args.
- SC#5 confirmed-and-documented: `INDEXED_DYNAMIC_FIELD_COUNT == 0`, `SCHEMA_V2_BUMP_REQUIRED is False` — no `event_schema_v1.md → v2` bump (every indexed arg is uint256/address).
- `schemas/unresolved_topics_v1.md`: KPD-06 quarantine parquet design (columns + dtypes, decode_status enum domain, escalation order, `pct_logs_unresolved < 1%` ship gate computation expected 0.0% for M1, SC#5 block, DTYPE SCOPE RULE).
- Doc-accuracy fix: `e15d4e9` relabelled as a git blob SHA (with `git hash-object` reproduction note) in CLAUDE.md + PROJECT.md; pin value unchanged.

## Task Commits

Each task was committed atomically:

1. **Task 1: Wave 0 — keccak dep + ABI provenance + test harness** - `0c0d035` (chore)
2. **Task 2: topic0_map_v1.json resolver + unresolved_topics design + tests** - `393d457` (feat)
3. **Task 3: blob-vs-commit doc-accuracy fix** - `648c7e8` (docs)

**Plan metadata:** _this commit_ (docs: complete plan)

## Files Created/Modified
- `schemas/topic0_map_v1.json` - Per-(impl, topic0) resolver, 5 events, keccak-self-proven, field_layout_hash + decode_status + abi_source per row
- `schemas/unresolved_topics_v1.md` - KPD-06 quarantine parquet design + <1% gate + SC#5 confirm-and-document
- `references/interfaces/PROVENANCE.sha256` - git blob-SHA pin (e15d4e94…) for the recovered ABI
- `tests/test_topic_resolution.py` - 12 pure-logic/fixture tests (keccak self-proof first as the non-negotiable gate)
- `pyproject.toml` / `uv.lock` - eth-hash[pycryptodome] added to dev group
- `CLAUDE.md` / `.planning/PROJECT.md` - e15d4e9 relabelled git blob SHA (not commit)

## Decisions Made
- **All 3 observed topic0s resolved by exact keccak match** — no quarantine needed; M1 expected `pct_logs_unresolved = 0.0%`. The 2 defined-but-unobserved events (SubcommitteePaid, NativeTransferFailed) registered cost-zero per RESEARCH Open Question 2.
- **RequestFinalized enum → uint8** is the single most likely keccak mistake; pinned by `test_enum_canonical_uint8`.
- **field_layout_hash canonical string is SOURCE order** (not indexed-first) with `:I/:D` suffixes; the 4 non-RequestCreated hashes were derived from the ABI (RequestFinalized `0x74f8ce05…`, CommitteeDepositFailed `0x33997574…`, SubcommitteePaid `0x1ee9ac7d…`, NativeTransferFailed `0x7ff516fb…`) and are re-recomputed in `test_all_field_layout_hashes_match`.
- **SC#5 is confirm-and-document, not a migration** — zero indexed-dynamic fields → no schema v2 bump.
- **e15d4e9 is a git blob SHA, not a commit SHA** — `git hash-object references/interfaces/IAgentRequester.sol` = e15d4e94ef9a0c09c8971ac1061098b929325028.

## Deviations from Plan

None - plan executed exactly as written. The plan listed `eth-hash[pycryptodome]` as a Task-1 `uv add`; it was already present in the dev group from Phase 1 tooling, so Task 1 confirmed its presence (and `uv.lock` was updated) rather than re-adding — no behavior change.

## Issues Encountered
None during the planned work. (Execution note: all three task commits were created in the prior session 2026-05-29 18:38–18:42 -0400; this session verified the committed artifacts against the full success criteria, confirmed the full suite green, and completed the plan wrap-up — SUMMARY.md + STATE.md + ROADMAP plan progress + requirement marking.)

## User Setup Required
None - no external service configuration required. Phase 2 touches no paid infra (the Ormi Production payment protocol fires at Phase 3, per 02-CONTEXT.md).

## Next Phase Readiness
- TOPIC-01 discharged. The resolver is read-ready for downstream phases: Phase 3 INDEX-01 decodes events through `topic0_map_v1.json`; Phase 5 PANEL-01 joins on `(implementation_address, topic0)`; Phase 6 STATS-01 reports `pct_logs_unresolved < 1%` against the quarantine pipeline this plan defines.
- IMPL-01 (plan 02-02, Wave 2) is the remaining Phase 2 work: `impl_history.parquet` design + EIP-1967 Upgraded registration + bytecode-hash backstop.
- Cross-phase finding carried to Phase 3 / EVENT-01-v-next: the `responses` child table is **state-fill-only** (no `ResponseReceived` event; `getRequest().responses` only). `CommitteeDepositFailed` is a structural invariant (fires 1:1 on every finalization), relevant to BYTECODE-01's rebate residual.

## Self-Check: PASSED

All 4 created artifacts exist on disk (topic0_map_v1.json, unresolved_topics_v1.md, PROVENANCE.sha256, test_topic_resolution.py) and all 3 task commits (0c0d035, 393d457, 648c7e8) are present in git history. Full suite green (49 tests; test_topic_resolution.py: 12 passed). Resolver row count = 5. `grep -c 'commit \`e15d4e9\`'` = 0 in both CLAUDE.md and PROJECT.md. Blob-SHA pin reproduces via `git hash-object`.

---
*Phase: 02-topic-implementation-provenance*
*Completed: 2026-05-29*
