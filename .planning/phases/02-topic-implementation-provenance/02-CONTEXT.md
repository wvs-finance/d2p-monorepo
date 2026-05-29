# Phase 2: Topic & Implementation Provenance - Context

**Gathered:** 2026-05-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Resolve every observed `IAgentRequester` event log to a unique `(implementation_address, topic0, signature, field_layout_hash)` tuple (TOPIC-01), and make every implementation transition observable from chain data (IMPL-01). Read-only chain/ABI work — **no indexer deployment, no paid infra, no schema materialization**. Deliverables: `topic0_map_v1.json` (per-impl ABI resolver), `unresolved_topics.parquet` design, `impl_history.parquet` design. Consumes Phase 1's EVENT-01 schema reservations; unblocks Phase 3 INDEX-01.

Most of the "how" is locked by KPDs/PITFALLS (see Canonical References). This discussion settled the transition-listener scope and captured a cross-phase payment protocol.
</domain>

<decisions>
## Implementation Decisions

### Transition-listener scope — Upgraded ONLY (minimal)
- IMPL-01 registers **only the `Upgraded(address)` event** — the single event that carries impl-logic provenance.
- **AdminChanged and BeaconUpgraded are NOT registered.** Rationale: admin ≠ logic (governance changes don't affect the cost model); BeaconUpgraded is structurally impossible on this plain-EIP-1967 proxy (KPD-17 confirmed beacon/diamond slots empty).
- **⚠ This is a deliberate user decision that SUPERSEDES PITFALLS A2** (which recommended registering Upgraded + AdminChanged + BeaconUpgraded). Recorded as intentional scoping, not an oversight — the plan-review gate should read it as such.
- **Why it's safe (the backstop):** KPD-07 / Phase-2 SC#2 require the latest `impl_history.parquet` row's bytecode hash to match `keccak256(eth_getCode(proxy, head_block))`. That head-block bytecode-hash check is an **independent logic-change detector** — if any `Upgraded` event were ever missed, the latest-row hash would NOT match `eth_getCode` at head, tripping the check. So Upgraded-listening + bytecode-hash verification together fully cover logic-provenance even without AdminChanged.
- Trade-off accepted: no on-chain record of admin/governance changes, and no beacon-migration tripwire. If a future milestone needs governance provenance, add AdminChanged listening then (its own small scope).

### impl_history segmentation — only Upgraded splits a segment
- `impl_history.parquet` segments are keyed on `Upgraded` (logic change): each impl = one row spanning `[first_seen_block, last_seen_block)`.
- Consistent with the Upgraded-only listener choice. No admin/beacon rows.
- Per KPD-07: always written with a minimum one row `[deployment_block (283,417,317), ∞)` even with zero upgrades observed (the expected case — contract is ~42 days old). Latest-row bytecode-hash verified against `eth_getCode(proxy, head)`.

### Cross-phase payment protocol (captured here; FIRES at Phase 3, not Phase 2)
- The Ormi free-tier pick (DATA-SOURCE-01) needs no spend. **If, during Phase 3 (INDEX-01), the free 300k-entity cap looks likely to be exceeded** → I notify the user mid-process with the entity-count evidence; the user makes the **$75/mo Ormi Production** payment and **confirms with me before I provision**. **No auto-spend.** Disable Ormi free-tier auto-upgrade at signup regardless (Pitfall 5).
- Phase 2 itself touches NO paid infra — this protocol is recorded so it propagates to the Phase-3 plan, per the user's explicit instruction ("include that on the plan").

### Claude's Discretion (delegated to KPDs + research, per user's selection)
- **ABI-resolution method (TOPIC-01):** canonical-then-shape per KPD-01/KPD-06 — keccak-match the 3 topic0s against the `emrestay/somnia-agents-skills` ABI (re-pin `e15d4e9` by SHA since this session's fetch failed; `main` may have drifted); if no clean match, fall back to on-chain-shape-based provisional naming flagged `decode_status='unresolved_abi'`, quarantine unmatched to `unresolved_topics.parquet`, gate <1% of log volume for M1 ship. The user opted not to constrain this — Claude/researcher/planner choose the resolution path within the KPD envelope.
- Note the strong prior: the 3-topic/1120-byte `0xb623…` is the leading `RequestCreated` candidate (the scout's pair-labeling is likely inverted); do NOT hard-code — let the keccak/shape resolution decide.
- `field_layout_hash` derivation method; `topic0_map_v1.json` structure; `unresolved_topics.parquet` columns (KPD-06 specifies the minimum set).
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope & locked decisions
- `.planning/ROADMAP.md` §"Phase 2: Topic & Implementation Provenance" — goal, blocking decisions (KPD-01/06/07, PITFALLS A1/A2), SC#1–SC#5.
- `.planning/ROADMAP.md` §"Known Plan-Phase Decisions" — KPD-01 (per-impl resolver), KPD-06 (unmatched contingency + <1% gate), KPD-07 (no-upgrade floor + post-upgrade re-run), KPD-18 (indexed-dynamic-field enumeration, relocated to Phase 2 SC#5).
- `.planning/ROADMAP.md` §"Phase Details" correction callout (2026-05-29) — deploy block 283,417,317, ~100.7ms cadence, event-roles-likely-inverted; **supersedes PITFALLS A2 for the listener scope per this CONTEXT's decision.**

### Phase 1 outputs this phase consumes
- `schemas/event_schema_v1.md` — EVENT-01 schema reservations (agent_class_keccak/agent_class_string, responses child table, topic0 roles UNASSIGNED). Phase-2 SC#5 enumerates per-(impl,topic0) indexed-dynamic fields against these; an unanticipated indexed-dynamic field triggers `event_schema_v1.md → v2` before Phase 3.
- `.planning/scout/2026-05-29/event_shapes_onchain.md` — the 3 observed topic0 shapes (recorded as shapes, roles UNASSIGNED): `0x65db1ef5…`, `0x5c090ef4…`, `0xb6233992…`.
- `.planning/scout/2026-05-29/event_count_addendum.md` — structural ratios (with the superseded-labeling note: roles likely inverted).
- `.planning/scout/2026-05-29/beacon_diamond_probe.md` — KPD-17 happy-path (plain EIP-1967), the basis for IMPL-01 tracking the proxy slot only.

### ABI source of truth
- `emrestay/somnia-agents-skills@e15d4e9` `references/interfaces/IAgentRequester.sol` — the keccak-match target (re-pin by SHA; note no `ResponseReceived` event; `agentId` is `uint256`).

### Carried-forward payment protocol
- `.planning/phases/01-…/01-03-SUMMARY.md` "User Setup Required" + `research/DATA_SOURCING.md` sign-off section — the $75/mo Ormi Production crossing this CONTEXT's payment protocol refines (fires at Phase 3).
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `probes/somnia_rpc.py`, `probes/blockscout.py` (Phase 1) — RPC `eth_getCode`/`eth_getStorageAt`/`eth_getLogs` + Blockscout helpers; reuse for the head-block bytecode-hash check and any topic0-log sampling.
- `tests/conftest.py` (Phase 1) — six `@pytest.fixture`s (scout_dir, schemas_dir, research_dir, load_yaml, load_json, read_text) consumed as test params.
- `pyproject.toml` — uv-managed Python 3.12, pytest + jsonschema + pyyaml + polars dev deps. Match these conventions.

### Established Patterns
- Provenance discipline: every external fact carries `source_url + utc_fetch_ts`; structured artifacts (YAML/JSON) over prose where machine-checkable.
- Public RPC `https://api.infra.mainnet.somnia.network/` is a full archive (works at the deploy block); Blockscout v2 rate-limits hard.
- uint256 → `pl.Utf8` only (the DTYPE SCOPE RULE in `event_schema_v1.md`) — any new id/hash columns in Phase 2 parquet designs follow this.

### Integration Points
- Outputs (`topic0_map_v1.json`, `impl_history.parquet` design, `unresolved_topics.parquet` design) feed Phase 3 INDEX-01 (the subgraph/indexer decodes events using the resolver and segments by impl_history).
</code_context>

<specifics>
## Specific Ideas

- BeaconUpgraded-as-tripwire was offered and **declined** in favor of minimal (Upgraded-only) — recorded so it's not silently re-added.
- The bytecode-hash backstop (`keccak256(eth_getCode(proxy, head))` vs latest impl_history row) is the load-bearing safety net that makes Upgraded-only sufficient — call it out in the plan so reviewers see the Upgraded-only choice is defended, not a gap.
</specifics>

<deferred>
## Deferred Ideas

- AdminChanged / governance-provenance tracking — out of scope for M1 (user chose Upgraded-only); add in a later milestone if governance provenance is needed.
- BeaconUpgraded migration tripwire — declined for M1.
- The $75/mo Ormi Production payment protocol is NOT deferred — it's captured and routed to Phase 3 (INDEX-01), where it fires.
</deferred>

---

*Phase: 02-topic-implementation-provenance*
*Context gathered: 2026-05-29*
