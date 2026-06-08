# IMPL-01 — `impl_history.parquet` Design (`impl_history_v1.md`)

> **schema_version:** `impl_history_v1`
> **Requirement:** IMPL-01 (KPD-07 floor row, KPD-17 plain-EIP-1967, PITFALLS A1 transition quarantine).
> **Status:** DESIGN ONLY. This table is **not materialized in Phase 2** — Phase 3
> (INDEX-01) fills it from chain data. This file is the LOCKED column/dtype/rule
> contract the indexer reads. Phase-2 tests build a synthetic in-Python frame
> against this design; they do NOT read a parquet file (none exists yet).
> **Source of truth:** `.planning/phases/02-…/02-RESEARCH.md §Pattern 3` (column
> design), `§Common Pitfalls 4` (deploy-block vs mid-life Upgraded),
> `§Anti-Patterns` (hashing the proxy = wrong); `02-CONTEXT.md §decisions`
> (Upgraded-only override of A2; the bytecode-backstop rationale);
> `.planning/scout/2026-05-29/beacon_diamond_probe.md` (KPD-17 plain-EIP-1967).

A consumer must be able to read this file and reproduce the exact polars/parquet
column types + nullability **without inferring from data** (PITFALLS E1 — never
infer a parquet schema; a null-only early partition would otherwise infer a Null
column type and break later reads). `implementation_address` is the join key into
the `requests` table (`event_schema_v1.md`): PANEL-01 left-joins every cost row
onto the impl segment that produced it.

---

## Purpose

IMPL-01 makes **every implementation transition observable from chain data** so
PANEL-01 can attribute each cost row to the logic version that produced it. The
attribution join is:

```
requests.block_number BETWEEN impl_history.impl_first_seen_block
                          AND COALESCE(impl_history.impl_last_seen_block, head)
```

The `Upgraded(address)`-only listener is a **deliberate user scoping** (see
`## Supersedes`); the head-row **bytecode backstop** is the load-bearing defense
that makes that scoping safe.

---

## 1. Column design (the 9-column contract)

`impl_history.parquet` columns. uint256/hash columns are `pl.Utf8` ONLY — never
`Int64`/`UInt64`/`Decimal` for ids or hashes (the DTYPE SCOPE RULE in
`event_schema_v1.md`: a uint256 is up to 78 decimal digits, > Decimal128's 38).
Block-number columns are bounded and use `pl.UInt64`.

| column                   | polars dtype                                                  | nullability  | note                                                                                              |
|--------------------------|---------------------------------------------------------------|--------------|---------------------------------------------------------------------------------------------------|
| `chain_id`               | `pl.Int64`                                                    | NOT NULL     | `5031` (Somnia mainnet); wide for cross-leg join                                                  |
| `implementation_address` | `pl.Utf8`                                                     | NOT NULL     | EIP-1967 slot value, lowercased; **NEVER null-type** (PITFALLS E1); join key into `requests`      |
| `impl_first_seen_block`  | `pl.UInt64`                                                   | NOT NULL     | inclusive lower bound of the segment                                                              |
| `impl_last_seen_block`   | `pl.UInt64`                                                   | **nullable** | exclusive upper bound; **NULL = open `∞` (head)** for the latest row                              |
| `set_by_event`           | `pl.Enum(["upgraded","deploy_floor","bytecode_backstop"])`    | NOT NULL     | provenance of the row boundary                                                                    |
| `set_by_tx_hash`         | `pl.Utf8`                                                     | nullable     | the `Upgraded` tx hash; **NULL for a synthetic `deploy_floor`** row                               |
| `impl_bytecode_keccak`   | `pl.Utf8`                                                     | NOT NULL     | `keccak(eth_getCode(impl, at_block))` — the backstop value (the IMPL code, never the proxy stub)  |
| `verified_at_head_block` | `pl.UInt64`                                                   | nullable     | head block at which the latest row's hash was checked; NULL for non-head rows                     |
| `schema_version`         | `pl.Utf8`                                                     | NOT NULL     | `impl_history_v1`                                                                                  |

**`impl_last_seen_block` NULL semantics:** NULL marks the **open head segment**.
There is at most ONE such row (the latest). The PANEL-01 join `COALESCE`s NULL to
the current head block, so the open segment covers `[impl_first_seen_block, head]`.

---

## 2. Floor-row rule (KPD-07)

`impl_history.parquet` **always has ≥1 row** — the floor row — even when zero
upgrades were observed. For THIS deployment (proxy
`0x5E5205CF39E766118C01636bED000A54D93163E6`, contract ~42 days old as of
2026-05-29) the floor row is:

| field                    | value                                                         |
|--------------------------|---------------------------------------------------------------|
| `chain_id`               | `5031`                                                        |
| `implementation_address` | `0x9af59c5683bb8686596b0d56e4f67655c6b73edd`                  |
| `impl_first_seen_block`  | `283417317`                                                   |
| `impl_last_seen_block`   | `NULL`  (open head — no post-deploy `Upgraded`)               |
| `set_by_event`           | `upgraded`  (**a REAL event — corroborated, not synthetic**)  |
| `set_by_tx_hash`         | the deploy-block `Upgraded` tx hash                           |
| `impl_bytecode_keccak`   | `0x13e721a63c4b1c87655c94a9765a602d4b55703a3cc313d07a7bc1a9fe7f3b44` |
| `verified_at_head_block` | head block at verification (2026-05-29 head)                 |
| `schema_version`         | `impl_history_v1`                                             |

**The floor row is corroborated by a REAL on-chain event.** An `Upgraded(address)`
fires **AT** the deploy block `283417317` → `newImplementation =
0x9af59c5683bb8686596b0d56e4f67655c6b73edd`. EIP-1967 proxies emit `Upgraded` at
construction (the initial impl set), so `set_by_event = 'upgraded'` here is a
genuine event provenance, NOT a synthetic floor.

**Synthetic-floor fallback (`deploy_floor`).** If a FUTURE deployment ever lacks a
deploy-time `Upgraded` (e.g. an impl wired by constructor without emitting the
event), the floor row is still written with `set_by_event = 'deploy_floor'`,
`set_by_tx_hash = NULL`, `impl_first_seen_block = deployment_block`, and
`implementation_address` read from the EIP-1967 slot at the deploy block. The
guarantee is "≥1 row spanning `[deployment_block, ∞)`" regardless of whether a
deploy-time event exists.

---

## 3. Upgraded-only segmentation

**Only `Upgraded(address)` splits a segment.** Each implementation occupies exactly
one row `[impl_first_seen_block, impl_last_seen_block)`:

- The first row's `impl_first_seen_block` = the deploy block (the floor row).
- Each subsequent `Upgraded(newImplementation)` at block `B` (`B > deploy_block`)
  closes the prior row (`impl_last_seen_block = B`) and opens a new row
  (`impl_first_seen_block = B`, `set_by_event = 'upgraded'`).
- The newest row has `impl_last_seen_block = NULL` (open head).

**No admin rows, no beacon rows.** `AdminChanged` and `BeaconUpgraded` do NOT
create segments (see `## Supersedes`). For M1 (expected case) there are **zero**
post-deploy `Upgraded` events, so the table is the single floor row.

---

## 4. Head-row bytecode backstop (the load-bearing safety net)

The latest (open-head) row's `impl_bytecode_keccak` **MUST equal**
`keccak(eth_getCode(impl_at_head, head))`. Resolution procedure at head block:

1. Read the EIP-1967 implementation slot
   `0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc`
   on the **proxy** `0x5E5205CF39E766118C01636bED000A54D93163E6` →
   `impl_at_head = 0x9af59c5683bb8686596b0d56e4f67655c6b73edd`.
2. `eth_getCode(impl_at_head, head)` → the 18,507-byte logic bytecode.
3. `impl_bytecode_keccak = "0x" + keccak(impl_code).hex()`.

Recorded value (live probe `https://api.infra.mainnet.somnia.network/`,
`utc_fetch_ts 2026-05-29T22:06Z`):

```
0x13e721a63c4b1c87655c94a9765a602d4b55703a3cc313d07a7bc1a9fe7f3b44
```

### Anti-pattern: HASH THE IMPL, NEVER THE PROXY

The **proxy** is a 130-byte immutable delegatecall stub — it never changes on
`Upgraded`, so hashing it would produce a constant that detects nothing. The
**impl** is the 18,507-byte logic that actually changes when the implementation
slot is reset. The backstop hashes `eth_getCode(impl)`, the resolved
implementation code — **hash the impl, never the proxy**. Hashing the 130-byte
proxy stub is the explicit anti-pattern this design forbids.

### Why this makes Upgraded-only safe

The head-block bytecode hash is an **INDEPENDENT logic-change detector**. If any
`Upgraded` event were ever missed (dropped log, listener gap), the latest
`impl_history` row's `implementation_address` / `impl_bytecode_keccak` would NOT
match `eth_getCode(impl_at_head, head)` — the check trips and surfaces the missed
transition. `Upgraded`-listening **plus** the head-block bytecode-hash
verification together fully cover logic-provenance even without `AdminChanged`.
The backstop is what turns "Upgraded-only" from a gap into a defended, minimal
scope.

---

## 5. PITFALLS A1 — the ±10-block transition quarantine

A **post-deploy** `Upgraded` (one fired strictly AFTER block `283417317`) marks its
±10-block neighborhood with `decode_status = 'unresolved_impl_transition'` (the
quarantine enum lives in `unresolved_topics_v1.md`) until the new impl's
field-layout hash is independently verified. The rule (encoded as a pure
predicate in `tests/test_impl_history.py`):

```
is_quarantined(upgrade_block, candidate_block, deploy_block=283417317) -> bool
  == (upgrade_block > deploy_block) AND (abs(candidate_block - upgrade_block) <= 10)
```

**The deploy-block `Upgraded` is NOT quarantined.** It establishes the floor row's
`impl_first_seen_block`; it is the genesis impl-set, not a mid-window logic
*transition*. Quarantining ±10 blocks around the deploy block would censor the
very first requests at `[283417317-10, 283417317+10]` — exactly the genesis
requests we need (PITFALLS A1 warning sign: zero indexed requests in
`[deploy, deploy+10]`). Hence the `upgrade_block > deploy_block` guard: the
deploy-block event has `upgrade_block == deploy_block`, so it quarantines nothing.

**For M1 (expected case) the quarantine band is empty** — there are zero
post-deploy `Upgraded` events. The rule is encoded so a future upgrade is handled
without revisiting the design: a post-deploy `Upgraded` at, e.g., block
`290000000` would quarantine `[289999990, 290000010]` until field-layout
verification clears it.

---

## Supersedes

**IMPL-01 registers `Upgraded(address)` ONLY. `AdminChanged` and `BeaconUpgraded`
are NOT registered.** This is a **deliberate user decision** that **SUPERSEDES
PITFALLS A2** (which recommended registering `Upgraded` + `AdminChanged` +
`BeaconUpgraded`). It is INTENTIONAL scoping — read it as such, not as a gap:

1. **Admin ≠ logic.** `AdminChanged` records governance/ownership changes, which
   do not alter the implementation logic and therefore do not affect the cost
   model. M1 needs logic-version provenance, not governance provenance.
2. **`BeaconUpgraded` is structurally impossible here.** KPD-17
   (`beacon_diamond_probe.md`) confirmed this is a plain EIP-1967 proxy: the
   BEACON_SLOT and the EIP-2535 diamond-storage slot are both `0x` empty. There is
   no beacon to upgrade, so `BeaconUpgraded` can never fire on this proxy.
3. **The bytecode backstop defends the scope.** Even if an `Upgraded` were missed,
   §4's head-block bytecode-hash check would trip — so logic-provenance is covered
   without `AdminChanged`/`BeaconUpgraded`.

**Trade-off accepted:** no on-chain record of admin/governance changes and no
beacon-migration tripwire. If a future milestone needs governance provenance, add
`AdminChanged` listening then (its own small scope). `BeaconUpgraded` stays out —
it has no referent on this proxy.

---

## Provenance & re-verification

- Live source: `https://api.infra.mainnet.somnia.network/` (full archive RPC),
  `utc_fetch_ts 2026-05-29T22:06Z`.
- Re-verification reuses `probes/somnia_rpc.py` (`eth_getStorageAt` for the slot,
  `eth_getCode` for the impl bytecode, `eth_getLogs` for the deploy-block
  `Upgraded`). The probe is **`__main__`-only and is NEVER run in CI** (a live
  call would flake). The recorded constants (`0x13e721a6…`, block `283417317`,
  impl `0x9af5…3edd`) are asserted against the synthetic fixture frame in
  `tests/test_impl_history.py` instead.
- All addresses lowercased for consistency with the resolver / join key.
- Re-confirm the head-block bytecode hash each milestone (the absence of a
  post-deploy `Upgraded` is a 30-day soft window; logic-change facts are live).
