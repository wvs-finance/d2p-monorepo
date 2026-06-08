---
phase: 03-subgraph-indexing
plan: 03
subsystem: infra
tags: [subgraph, the-graph, assemblyscript, graphql, somnia, iagentrequester, index-01, kpd-08]

# Dependency graph
requires:
  - phase: 03-subgraph-indexing (03-01)
    provides: getRequest decode surface (selector 0xc58343ef, Response[].executionCost idx 5) — the off-chain Arch-B fill the subgraph defers to
  - phase: 02-topic-implementation-provenance (02-01 TOPIC-01)
    provides: schemas/topic0_map_v1.json resolved roles (RequestCreated 0xb623, RequestFinalized(uint256,uint8) 0x65db, CommitteeDepositFailed 0x5c09) — the manifest's eventHandlers signatures
  - phase: 01 (DATA-SOURCE-01)
    provides: startBlock 283417317, proxy 0x5E5205CF…163E6, 300k free-tier entity cap, ~165k RequestCreated envelope
provides:
  - "subgraphs/iagentrequester/ — proxy-pinned (B3) Ormi/Somnia subgraph: manifest + schema.graphql + AssemblyScript mappings + networks.json + ABI + package.json"
  - "flat Request entity model (~165k, under 300k cap) with CommitteeDepositFailed folded as a NON-LOSSY requestId-keyed accumulator (counter + running total)"
  - "README distinct-tx full-scan idiom: LOSSLESS id_gt/orderBy:id pagination (NOT blockNumber_gt) — the leg-b denominator Plan 03-04 consumes"
  - "tests/test_index01_manifest.py — toolchain-free static manifest-lint CI gate"
affects: [03-04, INDEX-01, PANEL-01, leg-b indexer_distinct_tx]

# Tech tracking
tech-stack:
  added: ["@graphprotocol/graph-cli 0.98.1", "@graphprotocol/graph-ts 0.38.2 (deploy-time only; NOT vendored in CI)"]
  patterns:
    - "Non-lossy event fold: a retryable event (>1×/key) folds onto its parent entity as a counter + running-total accumulator (requestId-keyed) instead of a scalar overwrite or a per-occurrence child entity — keeps the entity count multiplicity-independent and under cap"
    - "Toolchain-free static manifest-lint: CI parses subgraph.yaml/schema.graphql/mapping.ts/README.md with pyyaml+json (no graph-cli); graph codegen && graph build is the deploy-time check"
    - "LOSSLESS subgraph full-scan: paginate distinct-key scans by the globally-unique monotone entity id (id_gt), never by a shared non-unique key (blockNumber_gt) that drops same-key boundary rows"

key-files:
  created:
    - subgraphs/iagentrequester/subgraph.yaml
    - subgraphs/iagentrequester/schema.graphql
    - subgraphs/iagentrequester/src/mapping.ts
    - subgraphs/iagentrequester/networks.json
    - subgraphs/iagentrequester/package.json
    - subgraphs/iagentrequester/abis/IAgentRequester.json
    - subgraphs/iagentrequester/README.md
    - tests/test_index01_manifest.py
  modified: []

key-decisions:
  - "CommitteeDepositFailed folded by requestId into a NON-LOSSY accumulator (committeeDepositFailedCount counter + committeeDepositFailedAttemptedTotal running sum + LastAmount reference), NOT a scalar overwrite (loses retries) and NOT a first-class CommitteeEvent entity (would push ≈330k, brushing the 300k cap)"
  - "Architecture B respected: NO in-subgraph getRequest eth_call; sumExecutionCost left NULL for the off-chain post-pass (Plan 03-04, selector 0xc58343ef)"
  - "Exactly the 3 OBSERVED events registered with topic0_map_v1.json resolved roles (RequestFinalized(uint256,uint8)); SubcommitteePaid/NativeTransferFailed are ABI-carried (completeness/getRequest) but never emitted → unregistered; no ResponseReceived (does not exist)"
  - "README documents the LOSSLESS id_gt distinct-tx full-scan over the lossy blockNumber_gt cursor (gate-review #2 M-1) — id is unique so no same-block drop"
  - "Manifest-lint test_sumExecutionCost_reserved asserts no .getRequest( CALL (not the bare substring) so a documentary 'no getRequest eth_call' comment in the mappings is permitted while a real binding call is still caught"

patterns-established:
  - "Non-lossy retryable-event fold onto a requestId-keyed accumulator (counter + running total)"
  - "Toolchain-free static subgraph manifest-lint as a CI gate (graph-cli deploy-time only)"
  - "id_gt / orderBy:id LOSSLESS distinct-key full scan vs bounded-range blockNumber windowing"

requirements-completed: []  # INDEX-01 spans 03-01..03-04 — kept IN PROGRESS; not closed on 03-03

# Metrics
duration: ~25min
completed: 2026-05-30
---

# Phase 3 Plan 03: IAgentRequester Subgraph (INDEX-01 KPD-08) Summary

**Proxy-pinned (B3) Ormi/Somnia subgraph authored OFFLINE — manifest + flat `Request` schema with a non-lossy requestId-keyed `CommitteeDepositFailed` fold + AssemblyScript mappings + ABI, plus a toolchain-free static manifest-lint CI gate (99 green); `sumExecutionCost` reserved for the off-chain Arch-B fill in 03-04.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-05-30T18:40:00Z (approx)
- **Completed:** 2026-05-30T18:47:14Z
- **Tasks:** 3
- **Files modified:** 8 created

## Accomplishments
- `subgraphs/iagentrequester/` authored end-to-end: `subgraph.yaml` (specVersion 1.2.0, proxy `0x5E5205CF…163E6` pinned never-null per B3, `startBlock 283417317`, 3 resolved-role event handlers), `networks.json`, `package.json` (graph-cli 0.98.1 / graph-ts 0.38.2), `abis/IAgentRequester.json` (5 events + `getRequest`→`Request` tuple with nested `Response[]`, `executionCost` at index 5).
- `schema.graphql`: one flat `type Request` per `requestId` (~165k, under the 300k free cap), `CommitteeDepositFailed` folded as a NON-LOSSY accumulator (`committeeDepositFailedCount` counter + `committeeDepositFailedAttemptedTotal` running sum + `committeeDepositFailedLastAmount`); NO per-member `Response` / first-class `CommitteeEvent` entity; `sumExecutionCost` reserved NULL.
- `src/mapping.ts`: `handleRequestCreated` / `handleRequestFinalized` / `handleCommitteeDepositFailed` — CommitteeDepositFailed increments (`+ 1`) and accumulates (`.plus(`), never overwrites; `loadOrCreateRequest` initialises accumulators; arrival key `(blockNumber, logIndex)`; NO in-subgraph `getRequest` call (Arch B).
- `README.md`: deploy-probe network-slug caveat (`somnia` vs `somnia-mainnet`), off-chain Arch-B fill (selector `0xc58343ef`), and the LOSSLESS `id_gt`/`orderBy:id` distinct-tx full scan vs the bounded-range `blockNumber` overage scan (gate-review #2 M-1).
- `tests/test_index01_manifest.py`: 8 toolchain-free static lint tests (B3 proxy pin, startBlock agreement, resolved-role handlers cross-checked vs `topic0_map_v1.json` `observed_on_chain`, entity-cap model, non-lossy fold, id_gt scan, sumExecutionCost reserved, ABI completeness). Full suite **99 green** (91 baseline + 8 new).

## Task Commits

Each task was committed atomically (LOCAL only — NOT pushed):

1. **Task 1: Manifest + networks.json + ABI + package.json** — `6221b76` (feat)
2. **Task 2: schema.graphql (non-lossy fold) + AS mappings + README** — `5a2e375` (feat)
3. **Task 3: Static manifest-lint CI test** — `bb5dd39` (test)

**Plan metadata:** (final docs commit below)

## Files Created/Modified
- `subgraphs/iagentrequester/subgraph.yaml` - Proxy-pinned manifest, 3 resolved-role event handlers
- `subgraphs/iagentrequester/schema.graphql` - Flat Request entity, non-lossy CommitteeDepositFailed fold
- `subgraphs/iagentrequester/src/mapping.ts` - 3 AssemblyScript handlers, accumulator fold, no eth_call
- `subgraphs/iagentrequester/networks.json` - chain-5031 address + startBlock pin
- `subgraphs/iagentrequester/package.json` - graph-cli/graph-ts pins, codegen/build/deploy scripts
- `subgraphs/iagentrequester/abis/IAgentRequester.json` - 5 events + getRequest tuple
- `subgraphs/iagentrequester/README.md` - deploy-probe, Arch-B fill, LOSSLESS id_gt distinct-tx scan
- `tests/test_index01_manifest.py` - toolchain-free static manifest-lint (8 tests)

## Decisions Made
See `key-decisions` frontmatter. Headline: CommitteeDepositFailed folded NON-LOSSY by requestId (counter + running total), Architecture B (no in-subgraph getRequest), exactly the 3 observed resolved-role events registered.

## Deviations from Plan

None — plan executed exactly as written. (The Task-3 `test_sumExecutionCost_reserved` assertion was authored to match `.getRequest(`/`try_getRequest(` CALL forms rather than the bare substring, because the mapping carries a legitimate documentary comment "NO in-subgraph getRequest eth_call". This is the test asserting the plan's intent — Arch B = no binding call — not a deviation from the plan's design.)

## Issues Encountered
None. The single test iteration (call-form vs bare-substring `getRequest` assertion) was a test-precision adjustment, resolved immediately; all `<verify><automated>` gates and `<acceptance_criteria>` greps passed.

## User Setup Required
None — OFFLINE plan. No deploy, no network, no graph-cli install. Live deploy + network-slug resolution + Ormi free-vs-paid checkpoint are Plan 03-04.

## Next Phase Readiness
- 03-04 (LIVE probes) can now `graph codegen && graph build` this manifest at deploy time and consume the README's LOSSLESS `id_gt` distinct-tx scan to compute leg-b `indexer_distinct_tx`, plus the off-chain Arch-B `sumExecutionCost` fill (selector `0xc58343ef`).
- INDEX-01 remains IN PROGRESS (Phase-3-wide, spans 03-01..03-04); 03-04 live probes close it.
- Deploy-probe item carried: network slug `somnia` vs `somnia-mainnet` resolves at deploy time.

## Self-Check: PASSED

- All 8 created files present on disk (subgraph tree + test + SUMMARY).
- All 3 task commits present: `6221b76`, `5a2e375`, `bb5dd39`.
- Full suite green: 99 passed.

---
*Phase: 03-subgraph-indexing*
*Completed: 2026-05-30*
