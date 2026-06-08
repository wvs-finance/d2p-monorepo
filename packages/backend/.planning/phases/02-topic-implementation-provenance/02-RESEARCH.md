# Phase 2: Topic & Implementation Provenance - Research

**Researched:** 2026-05-29
**Domain:** EVM event-signature resolution (keccak topic0 matching), EIP-1967 proxy implementation-history tracking, Solidity ABI provenance
**Confidence:** HIGH

All on-chain claims below carry `source_url + utc_fetch_ts`. The load-bearing ABI was recovered content-addressed (immutable blob SHA), and all three observed topic0s were resolved by exact keccak match with tooling verified against the EIP-1967 `Upgraded` constant. No quarantine path is needed for the three known topic0s.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **Transition-listener scope — Upgraded ONLY (minimal).** IMPL-01 registers **only `Upgraded(address)`**. AdminChanged and BeaconUpgraded are NOT registered. This is a deliberate user decision that **SUPERSEDES PITFALLS A2** (which recommended Upgraded + AdminChanged + BeaconUpgraded). Recorded as intentional scoping, not an oversight — the plan-review gate must read it as such.
- **Why it's safe (the backstop):** KPD-07 / Phase-2 SC#2 require the latest `impl_history.parquet` row's bytecode hash to match `keccak256(eth_getCode(proxy → impl, head_block))`. That head-block bytecode-hash check is an **independent logic-change detector** — if any `Upgraded` were ever missed, the latest-row hash would not match `eth_getCode` at head, tripping the check. Upgraded-listening + bytecode-hash verification together fully cover logic-provenance even without AdminChanged.
- **impl_history segmentation — only Upgraded splits a segment.** Each impl = one row `[first_seen_block, last_seen_block)`. No admin/beacon rows. Per KPD-07: always written with a minimum one row `[deployment_block (283,417,317), ∞)` even with zero *post-deploy* upgrades (the expected case — contract is ~42 days old). Latest-row bytecode-hash verified against `eth_getCode(proxy→impl, head)`.
- **Cross-phase payment protocol (FIRES at Phase 3, not Phase 2).** Ormi free-tier pick needs no spend. If during Phase 3 the free 300k-entity cap looks likely to be exceeded → notify user with entity-count evidence; user makes the $75/mo Ormi Production payment and confirms before provisioning. **No auto-spend.** Disable Ormi free-tier auto-upgrade at signup regardless (Pitfall 5). **Phase 2 itself touches NO paid infra** — recorded only so it propagates to the Phase-3 plan.

### Claude's Discretion

- **ABI-resolution method (TOPIC-01):** canonical-then-shape per KPD-01/KPD-06 — keccak-match the 3 topic0s against the `emrestay/somnia-agents-skills` ABI (re-pin `e15d4e9`); if no clean match, fall back to on-chain-shape-based provisional naming flagged `decode_status='unresolved_abi'`, quarantine unmatched to `unresolved_topics.parquet`, gate <1% of log volume for M1 ship. The researcher/planner choose the resolution path within the KPD envelope. **(This research resolved all three definitively — no quarantine needed; see §Standard Stack / §Code Examples.)**
- Note the strong prior: the 3-topic/1120-byte `0xb623…` is the leading `RequestCreated` candidate (scout pair-labeling likely inverted); do NOT hard-code — let keccak/shape resolution decide. **(Confirmed by keccak: `0xb623…` = `RequestCreated`.)**
- `field_layout_hash` derivation method; `topic0_map_v1.json` structure; `unresolved_topics.parquet` columns (KPD-06 specifies the minimum set).

### Deferred Ideas (OUT OF SCOPE)

- AdminChanged / governance-provenance tracking — out of scope for M1 (Upgraded-only); add in a later milestone if needed.
- BeaconUpgraded migration tripwire — declined for M1 (structurally impossible on this plain EIP-1967 proxy per KPD-17).
- The $75/mo Ormi Production payment protocol is NOT deferred — captured and routed to Phase 3 (INDEX-01).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| TOPIC-01 | Resolve the three observed event topic0 hashes to event signatures by keccak-matching against `IAgentRequester` from `emrestay/somnia-agents-skills@e15d4e9`. Output: per-impl ABI resolver `(implementation_address, topic0) → (signature, field_layout_hash)`; unmatched → `unresolved_topics.parquet`; `pct_logs_unresolved < 1%`. | **Fully resolved.** ABI recovered (§Standard Stack), all 3 topic0s keccak-matched to exact signatures with shape consistency (§Code Examples). `field_layout_hash` canonical form defined (§Architecture Patterns). KPD-18 indexed-dynamic enumeration: NO indexed-dynamic field exists (§Common Pitfalls / SC#5). `unresolved_topics.parquet` + decode_status enum specified (§Don't Hand-Roll / §Code Examples). |
| IMPL-01 | Track proxy implementation transitions. Index `Upgraded(address)` at the proxy (EIP-1967 topic0). Produce `impl_history.parquet` mapping `block_range → implementation_address`. KPD-07 floor row `[deployment_block, ∞)`. KPD-17 plain-EIP-1967 verified. | **Fully resolved.** `Upgraded(address)` topic0 confirmed `0xbc7cd75a…`; an initial Upgraded fires **at the deploy block** 283,417,317 → `newImpl = 0x9af5…3edd` (the floor row is corroborated by a real event, not only synthetic). Bytecode-hash backstop computed live: `keccak(impl_code@head) = 0x13e721a6…` (§Code Examples). `impl_history.parquet` design (§Architecture Patterns). PITFALLS A1 ±10-block quarantine design (§Common Pitfalls). |
</phase_requirements>

## Summary

Phase 2 is an **ABI-resolution and provenance** phase, not an indexing phase: read-only chain/ABI work producing three committed design artifacts (`topic0_map_v1.json`, `impl_history.parquet` design, `unresolved_topics.parquet` design) that unblock Phase 3 INDEX-01. The dominant risk was the failed `e15d4e9` ABI fetch and the unresolved topic0 roles. **Both are now resolved with HIGH confidence.**

**The `e15d4e9` pin is a git BLOB SHA, not a commit SHA.** PROJECT.md and CLAUDE.md label it "commit `e15d4e9`," but `GET /commits/e15d4e9` returns `No commit found for SHA: e15d4e9` (HTTP 422). The repo's `HEAD` tree shows `references/interfaces/IAgentRequester.sol` has **blob SHA `e15d4e94ef9a0c09c8971ac1061098b929325028`** (prefix `e15d4e9`). The file was fetched content-addressed via the Git blobs API — this is immutable and drift-proof (a blob SHA is `keccak`-like over the file content, so it cannot point at a different file). The plan should correct the "commit" wording to "blob SHA" but the pin itself is sound.

**All three observed topic0s resolved by exact keccak match** (tooling verified against `keccak256("Upgraded(address)") = 0xbc7cd75a20ee27fd9adebab32041f755214dbc6bffa90cc0225b39da2e5c2d3b`): `0xb623…` = `RequestCreated`, `0x65db…` = `RequestFinalized`, `0x5c09…` = `CommitteeDepositFailed`. **The scout/addendum role-labeling was doubly inverted:** the `0x5c09`+`0x65db` pair is the *finalization* pair (not a "request side" pair), and it is `RequestCreated` (`0xb623`) — not a response event — that fires 1–5× per tx (batched `createRequest` calls). The interface has **5 events** (RequestCreated, RequestFinalized, SubcommitteePaid, CommitteeDepositFailed, NativeTransferFailed) and **no `ResponseReceived`**. Per-member `Response[]` data is **only state-readable** via `getRequest(uint256) → Request.responses`, never event-emitted — this settles the EVENT-01 `responses` open question for Phase 3.

**Primary recommendation:** Commit `topic0_map_v1.json` keyed by `(implementation_address, topic0)` with the five resolved signatures + `field_layout_hash`; build `impl_history.parquet` with the floor row anchored by the deploy-block Upgraded event and the head-row `keccak(eth_getCode(impl@head))` backstop; flag in EVENT-01→Phase 3 that the `responses` child table is **state-fill-only, not event-fillable**, and that `CommitteeDepositFailed` fires on every finalization (a structural invariant of this deployment, relevant to BYTECODE-01's rebate residual).

## Standard Stack

### Recovered ABI (the source of truth for TOPIC-01)

| Artifact | Identifier | Provenance |
|---|---|---|
| `IAgentRequester.sol` | repo `emrestay/somnia-agents-skills`, path `references/interfaces/IAgentRequester.sol`, **blob SHA `e15d4e94ef9a0c09c8971ac1061098b929325028`** | `https://api.github.com/repos/emrestay/somnia-agents-skills/git/blobs/e15d4e94ef9a0c09c8971ac1061098b929325028` — `utc_fetch_ts: 2026-05-29T22:04Z` |

**The five events in the interface** (canonical signatures + computed topic0):

| topic0 | event signature (canonical) | indexed args | data words |
|---|---|---|---|
| `0xb62339927ed9948fd837358a55f5b9a824f7b047043faece66965593ed726889` | `RequestCreated(uint256,uint256,uint256,bytes,address[])` | `requestId`, `agentId` (2) | `perAgentBudget` + `bytes payload` + `address[] subcommittee` (variable, 896–5920 bytes observed) |
| `0x65db1ef5b3bcd84fe4fb8dbbe1cadc9fe6643bb261ab2e01d65c281c3d466af2` | `RequestFinalized(uint256,uint8)` | `requestId` (1) | `ResponseStatus status` (1 word) |
| `0x5c090ef48df2b4d8a01bd0639355d62c318b623aed749bdd12325f789e37a2cf` | `CommitteeDepositFailed(uint256,uint256)` | `requestId` (1) | `attemptedAmount` (1 word) |
| `0x15863241ef82702f42fe12b9bc93f3fbc82b50dbc2a3962c70f3249939db605e` | `SubcommitteePaid(uint256,uint256,uint256)` | `requestId` (1) | `totalPaid`, `perMember` (2 words) — **NOT observed on-chain** |
| `0xa5b05eec8040da65485bf3ab248b47c42271aa50a9234ed8f116e568dc285cc6` | `NativeTransferFailed(address,uint256)` | `recipient` (1) | `amount` (1 word) — **NOT observed on-chain** |

> **Enum canonicalization note (load-bearing for keccak):** `RequestFinalized(uint256 indexed requestId, ResponseStatus status)` canonicalizes the `ResponseStatus` enum to **`uint8`** → signature `RequestFinalized(uint256,uint8)`. Using the enum name (`RequestFinalized(uint256,ResponseStatus)`) yields the WRONG topic0 and would have failed to match. This is the single most likely keccak mistake in the plan; the unit test in §Validation Architecture pins the `uint8` form.

### Keccak tooling (modern-python / uv convention)

| Tool | Install | Why |
|---|---|---|
| `eth-hash[pycryptodome]` | `uv run --with "eth-hash[pycryptodome]" python …` (ephemeral) or `uv add "eth-hash[pycryptodome]"` | Canonical keccak-256. Verified: `keccak256("Upgraded(address)")` reproduces the EIP-1967 constant `0xbc7cd75a…2d3b` exactly. |
| `eth-utils` | optional, `uv add eth-utils` | `eth_utils.keccak` / `event_abi_to_log_topic` convenience if preferred. |

**CRITICAL anti-tool:** Python stdlib `hashlib.sha3_256` is **NOT keccak-256** (NIST SHA3 padding differs). Verified divergence: `sha3_256("Upgraded(address)") = 0x0e51260f…` ≠ the EIP-1967 constant. Never use `hashlib.sha3_256` for topic0.

**Verification harness (run once, assert in CI):**
```python
from eth_hash.auto import keccak
assert "0x"+keccak(b"Upgraded(address)").hex() == \
    "0xbc7cd75a20ee27fd9adebab32041f755214dbc6bffa90cc0225b39da2e5c2d3b"
```

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|---|---|---|
| Git blobs API (content-addressed) | `git clone` + `git cat-file blob e15d4e9` | Clone works but is heavier; blobs API is one HTTPS call and equally immutable. raw.githubusercontent.com/<commit>/path FAILS here because `e15d4e9` is not a commit ref. |
| keccak-match (chosen) | 4byte.directory topic0 reverse-lookup | Only a fallback for *truly* unresolvable topic0s (KPD-06 escalation). Not needed — all 3 matched. |

**Installation (probe + resolver tooling):**
```bash
uv add "eth-hash[pycryptodome]"   # in pyproject (dev or main group, matches Phase-1 conventions)
# probes/somnia_rpc.py already provides eth_getCode / eth_getStorageAt / eth_getLogs (Phase 1, reuse)
```

## Architecture Patterns

### Recommended artifact layout (Phase 2 deliverables)
```
schemas/
└── topic0_map_v1.json          # per-impl resolver: {(impl, topic0) -> (signature, field_layout_hash, ...)}
.planning/phases/02-…/
├── 02-RESEARCH.md              # this file
└── (plan + summary land here)
references/interfaces/
└── IAgentRequester.sol         # COMMIT the recovered blob for provenance (blob SHA in manifest)
# parquet DESIGNS (columns/dtypes; not materialized until Phase 3):
#   impl_history.parquet  (design doc + schema)
#   unresolved_topics.parquet  (design doc + schema)
```

### Pattern 1: Per-impl resolver, never a global map (KPD-01)

`topic0_map_v1.json` is keyed on `(implementation_address, topic0)`, NOT topic0 alone. For M1's single observed impl (`0x9af5…3edd`) there is one impl block; the structure is forward-compatible for a future `Upgraded`. Same-name events across impls may reorder fields → `field_layout_hash` disambiguates.

**Proposed structure:**
```json
{
  "schema_version": "topic0_map_v1",
  "resolver": [
    {
      "implementation_address": "0x9af59c5683bb8686596b0d56e4f67655c6b73edd",
      "topic0": "0xb62339927ed9948fd837358a55f5b9a824f7b047043faece66965593ed726889",
      "signature": "RequestCreated(uint256,uint256,uint256,bytes,address[])",
      "event_name": "RequestCreated",
      "indexed_args": ["requestId", "agentId"],
      "data_args": ["perAgentBudget", "payload", "subcommittee"],
      "field_layout_hash": "0x9b58ba757cb55c0f041e54b88e3bfa0fe42457e16705c55bafb82c312fd39dd2",
      "decode_status": "resolved",
      "abi_source": {"blob_sha": "e15d4e94ef9a0c09c8971ac1061098b929325028", "path": "references/interfaces/IAgentRequester.sol"}
    }
  ]
}
```

### Pattern 2: `field_layout_hash` canonical string (Claude's discretion — RECOMMENDED definition)

**Goal:** detect a same-name-but-reordered event across impls. Hash the **ordered (canonical-type, indexed-flag) sequence** plus the event name.

**Canonical string (the exact bytes hashed):**
```
<EventName>(<type0>:<I|D>,<type1>:<I|D>,…,<typeN>:<I|D>)
```
where each type is the **canonical ABI type** (enums → `uint8`, structs → their tuple form), `I` = indexed, `D` = non-indexed (data). Then `field_layout_hash = "0x" + keccak(canonical_string.encode()).hex()`.

**Worked example (RequestCreated):**
```
RequestCreated(uint256:I,uint256:I,uint256:D,bytes:D,address[]:D)
field_layout_hash = 0x9b58ba757cb55c0f041e54b88e3bfa0fe42457e16705c55bafb82c312fd39dd2
```

**Why this exact form:**
- Includes the **indexed flag** — reordering an arg between indexed/data changes the log shape (topic count) even at identical types, so it must be in the hash.
- Includes **order** — `(a,b)` vs `(b,a)` at identical types is a real layout change a same-topic0 collision could not catch.
- Uses **canonical types** (`uint8` for enums) so it is reproducible from the ABI alone, deterministically, in any language.
- Distinct from topic0: topic0 hashes the canonical *signature* (no indexed info, no `:I/:D`); `field_layout_hash` adds the indexed dimension and a delimiter that can't appear in a type name. The two are independent keys.

### Pattern 3: `impl_history.parquet` design (IMPL-01 / KPD-07)

| column | polars dtype | nullability | note |
|---|---|---|---|
| `chain_id` | `pl.Int64` | NOT NULL | 5031 |
| `implementation_address` | `pl.Utf8` | NOT NULL | EIP-1967 slot value; never null-type (PITFALLS E1) |
| `impl_first_seen_block` | `pl.UInt64` | NOT NULL | inclusive lower bound |
| `impl_last_seen_block` | `pl.UInt64` | **nullable** | exclusive upper bound; **NULL = open `∞` (head)** for the latest row |
| `set_by_event` | `pl.Enum(["upgraded","deploy_floor","bytecode_backstop"])` | NOT NULL | provenance of the row boundary |
| `set_by_tx_hash` | `pl.Utf8` | nullable | the `Upgraded` tx; null for synthetic floor |
| `impl_bytecode_keccak` | `pl.Utf8` | NOT NULL | `keccak(eth_getCode(impl, at_block))` — the backstop value |
| `verified_at_head_block` | `pl.UInt64` | nullable | head block at which the latest row's hash was checked |
| `schema_version` | `pl.Utf8` | NOT NULL | `impl_history_v1` |

**Floor-row rule (KPD-07):** always ≥1 row. For this deployment the floor row is `[283417317, NULL)` with `implementation_address = 0x9af5…3edd`, `set_by_event = 'upgraded'` (a real Upgraded fires AT the deploy block — see §Code Examples; the synthetic-floor case still applies if a deployment ever lacked the deploy-time event). `PANEL-01` left-joins on `block_number BETWEEN impl_first_seen_block AND COALESCE(impl_last_seen_block, head)`.

**Head-row bytecode backstop (the load-bearing safety net):** the latest row's `impl_bytecode_keccak` MUST equal `keccak(eth_getCode(impl_at_head, head))`. Resolve `impl_at_head` by reading the EIP-1967 slot `0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc` on the proxy at head, then `eth_getCode(that_impl, head)`. **Hash the IMPL code, not the proxy code** — the proxy is a 130-byte immutable delegatecall stub; the impl is the 18,507-byte logic. Verified value at head (2026-05-29T22:06Z): `0x13e721a63c4b1c87655c94a9765a602d4b55703a3cc313d07a7bc1a9fe7f3b44`.

### Anti-Patterns to Avoid
- **Hashing the proxy bytecode for the backstop.** Proxy code is a constant stub; it never changes on `Upgraded`. Hash `eth_getCode(impl)`.
- **Canonicalizing enums by name in topic0.** `ResponseStatus` → `uint8`, not `ResponseStatus`. Wrong canonicalization = silent no-match → false quarantine.
- **A single global topic0 map.** Forbidden by KPD-01; the resolver is keyed on `(impl, topic0)`.
- **Hard-coding the scout's role labels.** They were inverted; only keccak resolution is authoritative.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---|---|---|---|
| keccak-256 of event signatures | custom Keccak / `hashlib.sha3_256` | `eth_hash.auto.keccak` (pycryptodome backend) | stdlib `sha3_256` is NIST-SHA3, wrong padding — silently produces non-keccak digests |
| canonical event signature string | regex over Solidity source | enum→`uint8`, struct→tuple canonicalization rules (ABI canonical types) | hand parsing misses enum/struct canonicalization and produces wrong topic0 |
| topic0 reverse lookup (fallback only) | guessing | 4byte.directory (KPD-06 escalation) | only if an unknown topic0 ever appears; not needed for the 3 known |
| fetching a pinned file from GitHub | scraping the web UI | Git blobs API by blob SHA | content-addressed, immutable, drift-proof |

**Key insight:** topic0 resolution is a 3-line keccak match once you have the canonical signature; the *entire* difficulty is (a) recovering the exact ABI and (b) canonicalizing types correctly. Both are now done and pinned.

## `unresolved_topics.parquet` design (KPD-06)

For M1 this table is **expected to be empty** (all 3 observed topic0s resolved). It exists to quarantine any *future* unknown topic0 (e.g. after an `Upgraded` introduces a new event).

| column | polars dtype | note (KPD-06 minimum set) |
|---|---|---|
| `topic0` | `pl.Utf8` | the unmatched hash |
| `implementation_address` | `pl.Utf8` | impl under which it was seen |
| `first_seen_block` | `pl.UInt64` | |
| `first_seen_tx` | `pl.Utf8` | |
| `observed_count` | `pl.UInt64` | running count across the indexed window |
| `raw_data_sample` | `pl.Utf8` | hex of one log's `data` + `topics` for offline decode |
| `decode_status` | `pl.Enum(["unresolved_abi","unresolved_impl_transition"])` | resolution-failure reason |

**`decode_status` enum (full domain, used in BOTH the resolver output and this table):**
- `resolved` — keccak-matched against a known ABI (the only status the three known topic0s take).
- `unresolved_abi` — topic0 has no keccak match in any known ABI; quarantined here. Escalation order (KPD-06): prior blobs of `emrestay/somnia-agents-skills`, newer Somnia DevRel repos, 4byte.directory, Tier-B decompiled event tables.
- `unresolved_impl_transition` — log falls in the ±10-block quarantine band around an `Upgraded` (PITFALLS A1) and the new impl's field-layout is not yet independently verified.

**The <1% gate computation (STATS-01 `pct_logs_unresolved`):**
```
pct_logs_unresolved = (Σ observed_count in unresolved_topics.parquet) / (total proxy log count over the indexed window) × 100
ship gate: pct_logs_unresolved < 1.0
```
For M1, expected `= 0.0%` (all topic0s resolved). The total-log denominator is an INDEX-01 output (Phase 3). Phase 2 fixes the *numerator pipeline* (the resolver that decides resolved vs quarantined).

## Common Pitfalls

### Pitfall 1: Treating `e15d4e9` as a commit SHA
**What goes wrong:** `raw.githubusercontent.com/emrestay/somnia-agents-skills/e15d4e9/…` → 404; `GET /commits/e15d4e9` → 422 `No commit found`.
**Why it happens:** PROJECT.md/CLAUDE.md wording says "commit `e15d4e9`," but it is the **git blob SHA** of `IAgentRequester.sol`.
**How to avoid:** Fetch via the blobs API `…/git/blobs/e15d4e94ef9a0c09c8971ac1061098b929325028`. Correct the wording in the plan; keep the (sound) pin.
**Warning signs:** any "commit not found" 422 on a 7-hex ref that the docs call a commit.

### Pitfall 2: Enum canonicalization in the keccak signature
**What goes wrong:** `RequestFinalized(uint256,ResponseStatus)` hashes to a topic0 that matches nothing; the event gets wrongly quarantined as `unresolved_abi`.
**Why it happens:** Solidity canonicalizes enums to their underlying `uint8` for the event selector; the NatSpec/struct shows the enum *name*.
**How to avoid:** Canonicalize enums → `uint8` (verified: `RequestFinalized(uint256,uint8)` = `0x65db…`, matches on-chain).
**Warning signs:** a 2-topic/32-byte event failing to match while RequestCreated matches.

### Pitfall 3 (SC#5 / KPD-18): Looking for an indexed-dynamic field that isn't there
**What goes wrong:** Plan reserves a `keccak→string` recovery for `string indexed agentClass`; there is no such field.
**Why it happens:** The graph-node indexed-dynamic keccak trap (PITFALLS B1) is real *in general*, but this interface has **zero indexed dynamic-type fields.** The only indexed args across all five events are `uint256 requestId`, `uint256 agentId`, `address recipient` — all value types. `RequestCreated`'s dynamic fields (`bytes payload`, `address[] subcommittee`) are **non-indexed** (in the data section), so they are fully recoverable from log data, not hashed.
**How to avoid:** SC#5 enumeration result for this single impl = **"no indexed-dynamic field; no `event_schema_v1.md → v2` bump triggered."** The `agent_class_keccak`/`agent_class_string` reservations stay as cheap insurance; the likely real recovery is `agentId → class` via a uint registry or `bytes payload` decode (confirmed by the EVENT-01 note), NOT `keccak → string`.
**Warning signs:** a plan task that builds a `keccak(agentClass)` lookup table — delete it; it has no referent here.

### Pitfall 4 (PITFALLS A1): The deploy-block Upgraded vs a mid-life Upgraded
**What goes wrong:** Naively quarantining ±10 blocks around *every* Upgraded would quarantine the genesis impl-set at block 283,417,317, censoring the very first requests.
**Why it happens:** EIP-1967 proxies emit `Upgraded(newImplementation)` at construction (the initial impl set). Live-confirmed: 1 Upgraded at block 283,417,317 → `0x9af5…3edd`.
**How to avoid:** The deploy-block Upgraded establishes the **floor row's `impl_first_seen_block`**, it is NOT a logic *transition* mid-window. Apply the ±10-block `unresolved_impl_transition` quarantine only to Upgraded events **strictly after** the deploy block. For M1 (expected case) there are no post-deploy Upgraded events, so the quarantine band is empty — but the design must encode the rule so a future upgrade is handled.
**Warning signs:** zero indexed requests in `[deploy, deploy+10]` after applying a blanket quarantine.

### Pitfall 5: Assuming `responses` is event-fillable
**What goes wrong:** Phase 3 tries to populate the EVENT-01 `responses` child table from an event; there is no response event.
**Why it happens:** The interface has no `ResponseReceived`. `SubcommitteePaid` and `NativeTransferFailed` are never emitted on-chain (not in any sample). Per-member `Response[]` lives only in `Request.responses` state.
**How to avoid:** See §Open Questions — the `responses` table is **state-fill-only** (`eth_call getRequest(requestId)`), or deferred. Flag this to the Phase 3 / EVENT-01-v-next plan now.

### Pitfall 6: Reading `CommitteeDepositFailed` as an error/anomaly
**What goes wrong:** Treating `CommitteeDepositFailed` (fires on **every** finalization, 1:1 with RequestCreated and RequestFinalized) as a fault to filter out.
**Why it happens:** the name implies an error path, but live data shows it is a **structural invariant** of this deployment — the committee-deposit call reverts and the budget is restored every time (the interface NatSpec: "budget is restored").
**How to avoid:** Treat it as a normal lifecycle event. It is relevant to **BYTECODE-01**: the rebate/budget-restoration residual is tied to this path. Record it in the resolver as `resolved`, not quarantined.

## Code Examples

Verified resolution (run 2026-05-29T22:00Z; tooling verified against the EIP-1967 constant):

### Resolving all three topic0s (the TOPIC-01 core)
```python
# Source: emrestay/somnia-agents-skills IAgentRequester.sol blob e15d4e94ef… (fetched 2026-05-29T22:04Z)
# Tooling: eth_hash via `uv run --with "eth-hash[pycryptodome]"`
from eth_hash.auto import keccak
def topic0(sig: str) -> str:
    return "0x" + keccak(sig.encode()).hex()

# verify tooling first (NON-NEGOTIABLE):
assert topic0("Upgraded(address)") == \
    "0xbc7cd75a20ee27fd9adebab32041f755214dbc6bffa90cc0225b39da2e5c2d3b"

SIGS = {
    "RequestCreated":         "RequestCreated(uint256,uint256,uint256,bytes,address[])",
    "RequestFinalized":       "RequestFinalized(uint256,uint8)",     # enum -> uint8
    "SubcommitteePaid":       "SubcommitteePaid(uint256,uint256,uint256)",
    "CommitteeDepositFailed": "CommitteeDepositFailed(uint256,uint256)",
    "NativeTransferFailed":   "NativeTransferFailed(address,uint256)",
}
# computed -> observed match (all exact):
#   0xb623… RequestCreated          [observed: 3-topic, 896–5920B data]
#   0x65db… RequestFinalized        [observed: 2-topic, 32B]
#   0x5c09… CommitteeDepositFailed  [observed: 2-topic, 32B]
#   0x1586… SubcommitteePaid        [NOT observed on-chain]
#   0xa5b0… NativeTransferFailed    [NOT observed on-chain]
```

### `field_layout_hash`
```python
def field_layout_hash(name, args):  # args: list of (canonical_type, indexed_bool)
    canon = name + "(" + ",".join(f"{t}:{'I' if idx else 'D'}" for t, idx in args) + ")"
    return canon, "0x" + keccak(canon.encode()).hex()

# RequestCreated -> "RequestCreated(uint256:I,uint256:I,uint256:D,bytes:D,address[]:D)"
#                -> 0x9b58ba757cb55c0f041e54b88e3bfa0fe42457e16705c55bafb82c312fd39dd2
```

### IMPL-01 bytecode-hash backstop (reuse `probes/somnia_rpc.py`)
```python
# Source: live probe https://api.infra.mainnet.somnia.network/  utc_fetch_ts 2026-05-29T22:06Z
PROXY = "0x5E5205CF39E766118C01636bED000A54D93163E6"
IMPL_SLOT = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc"  # EIP-1967

impl = "0x" + eth_getStorageAt(PROXY, IMPL_SLOT, head)[-40:]     # 0x9af5…3edd
impl_code = eth_getCode(impl, head)                              # 18507 bytes
backstop = "0x" + keccak(bytes.fromhex(impl_code[2:])).hex()
# == 0x13e721a63c4b1c87655c94a9765a602d4b55703a3cc313d07a7bc1a9fe7f3b44  (latest impl_history row hash)

# initial Upgraded confirmed at deploy block:
#   eth_getLogs(addr=PROXY, topics=[keccak("Upgraded(address)")], from=283417317, to=283418317)
#   -> 1 event @ block 283417317, newImplementation = 0x9af59c5683bb8686596b0d56e4f67655c6b73edd
```

## State of the Art

| Old (scout/addendum belief) | Current (keccak-resolved) | When Changed | Impact |
|---|---|---|---|
| `0x5c09`+`0x65db` = "request side" pair | = `CommitteeDepositFailed` + `RequestFinalized` (finalization pair) | This research 2026-05-29 | Schema role labels finalized; addendum labels were inverted |
| `0xb623` = "response side, per-member, 1–5×" | = `RequestCreated`; the 1–5× multiplicity is **batched `createRequest`**, not responses | This research | The arrival series IS RequestCreated; `0xb623` is the arrival event |
| `responses` child table is event-fillable (maybe in `0xb623` payload) | `responses` is **state-readable only** (`getRequest().responses`); no response event exists | This research | EVENT-01 open question closed; Phase 3 must state-fill or defer |
| `e15d4e9` = commit | `e15d4e9` = git **blob SHA** of the .sol file | This research | Fetch via blobs API; correct the wording |

**Deprecated/outdated:**
- The scout-addendum topic0→role table (`event_count_addendum.md`) — counts/ratios valid, role NAMES superseded by this keccak resolution.

## Open Questions

1. **`responses` child-table population path (EVENT-01 open question) — RESOLVED to "state-only."**
   - What we know: no `ResponseReceived` event; `SubcommitteePaid`/`NativeTransferFailed` never observed; `Request.responses` (a `Response[]` of `{validator, result, status, receipt, timestamp, executionCost}`) is returned by `getRequest(uint256)`.
   - What's unclear: whether Phase 3 wants per-member rows at all for M1's caller-side cost goal — `executionCost` per member lives here and feeds BYTECODE-01's `Σ_i min(executionCost_i, perAgentBudget)` residual.
   - Recommendation: **Phase 2 deliverable note** → the `responses` table is event-unfillable; populate it in Phase 3 via batched `eth_call getRequest(requestId)` per finalized request (`getRequest` selector `0xc58343ef`), keyed off `RequestFinalized` requestIds. If M1 BYTECODE-01 Tier-C only needs aggregate `Σ executionCost` it can read it from the same call. Flag to Phase 3 plan now; do not let EVENT-01 assume event-fill.

2. **`SubcommitteePaid` / `NativeTransferFailed` truly never emitted, or just not in-sample?**
   - What we know: absent in all sampled windows (60 windows × 1000 blocks; deploy-window scan too).
   - What's unclear: whether they fire in rarer code paths over the full lifetime.
   - Recommendation: register their topic0s in `topic0_map_v1.json` anyway (cost zero, prevents an `unresolved_abi` false-positive if one ever appears). Phase 3's full backfill confirms presence/absence.

3. **`CommitteeDepositFailed` firing 1:1 on every finalization — is the rebate path always the failed-transfer path?**
   - What we know: it fires on every finalization in-sample; NatSpec says budget is restored on this revert.
   - Recommendation: hand this to **BYTECODE-01 (Phase 4)** as a strong prior — the rebate residual likely flows through the budget-restoration branch, not `NativeTransferFailed`. Out of Phase 2 scope; record as a cross-phase finding.

## Validation Architecture

> `workflow.nyquist_validation` is enabled (config.json: not false). Section included. Pure-logic + fixture-based, no network in CI (consistent with Phase-1 `probes/*` __main__-only network access).

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pytest (Phase-1 harness; `tests/conftest.py` fixtures `scout_dir`/`schemas_dir`/`research_dir`/`load_yaml`/`load_json`/`read_text`) |
| Config file | `pyproject.toml` (uv-managed, Python ≥3.12; dev group pytest + jsonschema + pyyaml + polars) — add `eth-hash[pycryptodome]` |
| Quick run command | `uv run pytest tests/test_topic_resolution.py tests/test_impl_history.py -x` |
| Full suite command | `uv run pytest tests/ -q` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TOPIC-01 | each of the 3 observed topic0s maps to its resolved signature | unit | `pytest tests/test_topic_resolution.py::test_observed_topic0s_resolve -x` | ❌ Wave 0 |
| TOPIC-01 | keccak tooling reproduces EIP-1967 `Upgraded` constant | unit | `pytest tests/test_topic_resolution.py::test_keccak_tooling_verified -x` | ❌ Wave 0 |
| TOPIC-01 | enum canonicalizes to `uint8` (RequestFinalized topic0) | unit | `pytest tests/test_topic_resolution.py::test_enum_canonical_uint8 -x` | ❌ Wave 0 |
| TOPIC-01 | `field_layout_hash` is deterministic + matches the committed map | unit | `pytest tests/test_topic_resolution.py::test_field_layout_hash_determinism -x` | ❌ Wave 0 |
| TOPIC-01 | SC#5 — no indexed-dynamic field in resolved ABI (no v2 bump) | unit | `pytest tests/test_topic_resolution.py::test_no_indexed_dynamic_field -x` | ❌ Wave 0 |
| TOPIC-01 | `decode_status` enum domain = {resolved, unresolved_abi, unresolved_impl_transition} | unit | `pytest tests/test_topic_resolution.py::test_decode_status_enum -x` | ❌ Wave 0 |
| IMPL-01 | `impl_history` has ≥1 floor row spanning `[283417317, ∞)` | unit (fixture) | `pytest tests/test_impl_history.py::test_floor_row -x` | ❌ Wave 0 |
| IMPL-01 | latest-row `impl_bytecode_keccak` matches the recorded backstop hash | unit (fixture) | `pytest tests/test_impl_history.py::test_bytecode_backstop -x` | ❌ Wave 0 |
| IMPL-01 | post-deploy Upgraded → ±10-block quarantine; deploy-block Upgraded → floor (not quarantine) | unit (fixture) | `pytest tests/test_impl_history.py::test_a1_quarantine_excludes_deploy_block -x` | ❌ Wave 0 |
| TOPIC-01 | unresolved-gate computation: `pct_logs_unresolved < 1%` on a synthetic mix | unit (fixture) | `pytest tests/test_topic_resolution.py::test_unresolved_gate -x` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `uv run pytest tests/test_topic_resolution.py tests/test_impl_history.py -x`
- **Per wave merge:** `uv run pytest tests/ -q` (full Phase-1 + Phase-2 suite)
- **Phase gate:** full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/test_topic_resolution.py` — covers TOPIC-01 (keccak verify, 3 topic0 resolution, enum-uint8, field_layout_hash determinism, no-indexed-dynamic SC#5, decode_status enum, unresolved gate). Fixtures: the committed `schemas/topic0_map_v1.json` + a synthetic log-count fixture.
- [ ] `tests/test_impl_history.py` — covers IMPL-01 (floor row, bytecode backstop, A1 quarantine). Fixture: a synthetic `impl_history` frame + a recorded `impl_bytecode_keccak` constant (no live RPC in CI).
- [ ] Framework install: `uv add "eth-hash[pycryptodome]"` — keccak dependency (verified against EIP-1967 constant in `test_keccak_tooling_verified`).
- [ ] Commit `references/interfaces/IAgentRequester.sol` (recovered blob) + record its blob SHA in a provenance manifest row, so the resolver's `abi_source.blob_sha` is checkable.

*(Existing `tests/conftest.py` fixtures are reused as test params; the two new modules are the only Wave-0 additions.)*

## Sources

### Primary (HIGH confidence)
- `IAgentRequester.sol` — GitHub blobs API `https://api.github.com/repos/emrestay/somnia-agents-skills/git/blobs/e15d4e94ef9a0c09c8971ac1061098b929325028` (blob SHA prefix `e15d4e9`, content-addressed/immutable) — utc_fetch_ts 2026-05-29T22:04Z. Recovered all 5 event signatures + `Request`/`Response` structs.
- Live Somnia archive RPC `https://api.infra.mainnet.somnia.network/` — `eth_getLogs` topic0 census (60 windows, 83 txs, 1:1:1 RequestCreated/RequestFinalized/CommitteeDepositFailed), `eth_getStorageAt` EIP-1967 impl slot, `eth_getCode` impl bytecode hash, deploy-block Upgraded — utc_fetch_ts 2026-05-29T22:06–22:09Z.
- EIP-1967 `Upgraded(address)` constant `0xbc7cd75a20ee27fd9adebab32041f755214dbc6bffa90cc0225b39da2e5c2d3b` — reproduced exactly by `eth_hash` (tooling verification).
- `eth-hash[pycryptodome]` (keccak-256) — verified against the EIP-1967 constant; stdlib `sha3_256` shown to diverge.

### Secondary (MEDIUM confidence)
- `.planning/scout/2026-05-29/event_shapes_onchain.md`, `event_count_addendum.md` — topic0 SHAPES + counts/ratios (valid); role NAMES superseded by this keccak resolution.
- `.planning/scout/2026-05-29/beacon_diamond_probe.md` — KPD-17 plain-EIP-1967 verdict (corroborated: proxy code = 130-byte stub, impl = 18,507 bytes).
- `schemas/event_schema_v1.md` — EVENT-01 reservations; this research closes its flagged `responses` + KPD-18 open questions.

### Tertiary (LOW confidence)
- None required — no claim rests on unverified single sources.

## Metadata

**Confidence breakdown:**
- ABI recovery / topic0 resolution: **HIGH** — content-addressed blob + exact keccak match + on-chain shape + topic-count consistency, tooling verified against a known constant.
- IMPL-01 / bytecode backstop: **HIGH** — live `eth_getStorageAt` + `eth_getCode` + keccak, deploy-block Upgraded confirmed.
- `responses` state-only finding: **HIGH** — interface has no response event; `getRequest` returns `Request.responses` by signature; `SubcommitteePaid`/`NativeTransferFailed` absent in all samples.
- SC#5 no-indexed-dynamic: **HIGH** — all indexed args are value types in the recovered ABI.
- `field_layout_hash` definition: **HIGH** (design recommendation; deterministic and reproducible) — it is a chosen convention, not an external fact.

**Research date:** 2026-05-29
**Valid until:** ABI/topic0 facts are immutable (content-addressed) — no expiry. Live RPC facts (head bytecode hash, absence of post-deploy Upgraded) re-verify each milestone per the "stop-gap"/volatility discipline; 30-day soft window.
