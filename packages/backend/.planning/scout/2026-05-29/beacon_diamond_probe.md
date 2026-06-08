# Scout Archive — KPD-17 beacon / diamond / impl-slot probe (PITFALLS A3)

> Canonical KPD-17 provenance record. Discharges the pre-flight question that
> gates IMPL-01 (Phase 2) and the Phase-3 data model: **is the agent-requester
> proxy a beacon proxy or an EIP-2535 diamond, or a plain EIP-1967 proxy?**
> All reads were run live this session against the public archive RPC; the
> *recorded* verdict (not a live call) is what the CI smoke test asserts.

**Probe tooling:** `probes/somnia_rpc.py` (committed, re-runnable via `eth_getStorageAt`).
**RPC endpoint:** `https://api.infra.mainnet.somnia.network/`
**Implementation under probe:** `0x9AF59C5683bb8686596B0D56e4F67655C6B73EdD`
**Proxy:** `0x5E5205CF39E766118C01636bED000A54D93163E6`
**Probe session:** 2026-05-29T20:06Z–20:08Z (live re-run per `01-RESEARCH.md` §Code Examples).

## Slot reads (the KPD-17 evidence)

All three reads on the **implementation** address returned `0x` (empty), proving
the impl is not itself a proxy, not a beacon, and not a diamond.

| slot name | slot_hash | value | source_url | utc_fetch_ts |
|---|---|---|---|---|
| BEACON_SLOT (`keccak256('eip1967.proxy.beacon')-1`) | `0xa3f0ad74e5423aebfd80d3ef4346578335a9a72aeaee59ff6cb3582b35133d50` | `0x` (EMPTY) | https://api.infra.mainnet.somnia.network/ | 2026-05-29T20:06Z |
| IMPLEMENTATION_SLOT (on the impl itself) | `0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc` | `0x` (EMPTY — impl is not itself a proxy) | https://api.infra.mainnet.somnia.network/ | 2026-05-29T20:06Z |
| EIP-2535 diamond storage (`diamond.standard.diamond.storage`) | `0xc8fcad8db84d3cc18b4c41d551ea0ee66dd599cde068d998e57d5e09332c131c` | `0x` (EMPTY) | https://api.infra.mainnet.somnia.network/ | 2026-05-29T20:08Z |

Cross-reference (recorded in `rpc_capability_probe.md`): the **proxy** ADMIN_SLOT
and BEACON_SLOT are both `0x` empty (UUPS-style, not transparent-admin, not
beacon), and the proxy IMPLEMENTATION_SLOT resolves to
`0x9AF59C5683bb8686596B0D56e4F67655C6B73EdD`.

## VERDICT

**KPD-17 HAPPY PATH** — impl `0x9AF59C5683bb8686596B0D56e4F67655C6B73EdD` is
plain EIP-1967, NOT a beacon proxy, NOT a diamond. IMPL-01 tracks ONLY the proxy
EIP-1967 implementation slot. ROADMAP SC#2a happy path satisfied; no PROJECT.md
re-scope trigger (SC#2b) fires.

## Consequences for downstream phases

- **IMPL-01 (Phase 2):** the impl-history resolver tracks a single EIP-1967
  implementation slot on the proxy. No beacon-address indirection, no diamond
  facet enumeration. The `implementation_address` column maps 1:1 to the
  EIP-1967 slot value at each block.
- **Phase-3 data model:** one impl dimension per block (read from the proxy
  EIP-1967 slot); `impl_segments_observed` is governed solely by `Upgraded`
  events on the proxy, not by beacon or facet changes.
- **No re-scope:** SC#2b (the beacon/diamond branch that would force a
  PROJECT.md re-decomposition) does not fire.
