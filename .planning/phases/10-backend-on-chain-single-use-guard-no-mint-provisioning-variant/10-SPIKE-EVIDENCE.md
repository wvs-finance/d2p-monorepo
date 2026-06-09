# Phase 10 — Live-Fork Spike Evidence

> **OPERATOR-MANUAL. NOT CI-RUNNABLE. NEVER claimed on-rhythm/green (OPS-06).**
>
> This file is the phase completion gate — **transcript-based, not CI**. The live BuildBear
> spike is secret-gated (RPC + `DEMO_SIGNER_PK`) and bounded by a 3-day sandbox TTL, so it
> cannot run in the secret-free CI lane and must never be reported as a passing CI signal.
> Phase 10 is "done" only when all four sections (a)–(d) below carry a pasted, real transcript
> and the Sign-off checklist is satisfied.
>
> The operator fills these sections in **Plan 10-03** from a **LIVE** run against a
> **FRESHLY-PROVISIONED `--no-mint` throwaway stack**.

---

## ⚠ POISONED ARTIFACT — NEVER REUSE

The currently-committed `buildbear-deployments.json` names executor
**`0xa95Ffdf51f71fE9C8861Fdbb1cAA664FA78A5FE3`** — this executor ALREADY holds a minted
position (`numberOfLegs > 0`) and has NO EXEC-01 guard. It is **poisoned** (Pitfall 4):

- It must **NEVER** be redeployed or used for a live claim.
- The spike runs against a **fresh `--no-mint` stack** that deploys a NEW executor at a NEW
  address. Every section below MUST record the fresh executor address, and it MUST NOT equal
  `0xa95Ffdf51f71fE9C8861Fdbb1cAA664FA78A5FE3`.
- If any section logs an executor matching `0xa95Ffdf…`, the old artifact was used — STOP and
  re-provision.

---

## FORK-LIVENESS PRE-FLIGHT (run before EVERY section)

BuildBear sandboxes have a ~3-day TTL. Before each section, confirm the node is alive:

```bash
cast chain-id --rpc-url "$RPC"
```

- Responds with the chain id (e.g. `31337`) → sandbox is live, proceed.
- Errors / hangs / connection refused → the sandbox is **dead** (TTL expired or restarted) and
  MUST be re-provisioned with a fresh `--no-mint` run before any section can be recorded.

`$RPC` is the BuildBear sandbox RPC URL from the freshly-written
`packages/frontend/lib/apps/abrigo/cornerstone/buildbear-deployments.json` (`.rpcUrl`).

---

## (a) Pre-guard 2nd-mint baseline (EXEC-01 / PROV-01)

**Status:** [ ] recorded

Provision a throwaway `--no-mint` stack, confirm the fresh executor starts with zero legs,
then call `resolveFromMandate(...)` TWICE and record the 2nd (unguarded) outcome — the
pre-guard baseline that EXEC-01 will later turn into a `"fork used"` revert.

```bash
# Fork-liveness pre-flight
cast chain-id --rpc-url "$RPC"

# Fresh executor must start with numberOfLegs == 0 (PROV-01)
cast call <pool> "numberOfLegs(address)(uint256)" <executor> --rpc-url "$RPC"   # expect: 0

# First mint (baseline success)
cast send <executor> "resolveFromMandate((address,uint8,uint256,bytes32),uint256,uint128)" \
  <mandate...> 0 1000000 --rpc-url "$RPC" --private-key "$DEMO_SIGNER_PK"

# Second mint — pre-guard baseline (records the unguarded 2nd-mint behavior)
cast send <executor> "resolveFromMandate((address,uint8,uint256,bytes32),uint256,uint128)" \
  <mandate...> 0 1000000 --rpc-url "$RPC" --private-key "$DEMO_SIGNER_PK"
```

- Fresh executor address: `_______________________` (MUST NOT equal `0xa95Ffdf…`)

```text
<paste the live transcript here: numberOfLegs==0 result, 1st mint tx, 2nd mint outcome>
```

---

## (b) `evm_snapshot` → `evm_revert` round-trip (PROV-02 / PROV-03)

**Status:** [ ] recorded

Take a snapshot, mint, revert, then assert the revert restored a clean state: `numberOfLegs == 0`,
the dedicated signer's gas balance is back to the funded amount, and a fresh `resolveFromMandate`
succeeds after the revert (snapshot is one-use — re-snapshot after every revert).

```bash
# Fork-liveness pre-flight
cast chain-id --rpc-url "$RPC"

SNAP=$(cast rpc evm_snapshot --rpc-url "$RPC" | tr -d '"')   # e.g. 0x1
echo "SNAPSHOT_ID=$SNAP"

# mint (consumes the fresh executor's single use)
cast send <executor> "resolveFromMandate(...)" <mandate...> 0 1000000 \
  --rpc-url "$RPC" --private-key "$DEMO_SIGNER_PK"

# revert to the snapshot
cast rpc evm_revert "$SNAP" --rpc-url "$RPC"                 # expect: true

# assert clean post-revert state
cast call <pool> "numberOfLegs(address)(uint256)" <executor> --rpc-url "$RPC"  # expect: 0
cast balance <SIGNER_EOA> --rpc-url "$RPC"                   # expect: funded amount
# fresh mint succeeds after revert
cast send <executor> "resolveFromMandate(...)" <mandate...> 0 1000000 \
  --rpc-url "$RPC" --private-key "$DEMO_SIGNER_PK"
```

```text
<paste the live transcript here: snapshot id, revert==true, numberOfLegs==0, signer balance, post-revert mint>
```

---

## (c) viem server-side signing dry-run (Phase 11 dependency)

**Status:** [ ] recorded

Prove the server can sign and submit `resolveFromMandate` with `DEMO_SIGNER_PK` via viem
(`privateKeyToAccount` + `createWalletClient`) against the artifact's chain config — the
Phase-11 `buildbear-sign` route precondition. Reproduced via the type-checked
`packages/frontend/scripts/spike-viem-sign.ts` committed in Plan 10-02.

```bash
# Fork-liveness pre-flight
cast chain-id --rpc-url "$RPC"

# Server-side signing dry-run (reads rpcUrl + chainId from the artifact)
pnpm --filter d2p-frontend exec tsx scripts/spike-viem-sign.ts
```

```text
<paste the live transcript here: viem client built from artifact, dry-run resolveFromMandate result>
```

---

## (d) On-fork post-guard `"fork used"` revert (EXEC-01)

**Status:** [ ] recorded

AFTER redeploying the GUARDED executor (post Plan 10-02), call `resolveFromMandate` TWICE on the
fork. The 1st succeeds; the 2nd MUST revert with exactly `"fork used"` — the on-fork proof of the
EXEC-01 single-use guard.

```bash
# Fork-liveness pre-flight
cast chain-id --rpc-url "$RPC"

# 1st mint succeeds
cast send <guarded-executor> "resolveFromMandate(...)" <mandate...> 0 1000000 \
  --rpc-url "$RPC" --private-key "$DEMO_SIGNER_PK"

# 2nd mint MUST revert "fork used"
cast send <guarded-executor> "resolveFromMandate(...)" <mandate...> 0 1000000 \
  --rpc-url "$RPC" --private-key "$DEMO_SIGNER_PK"   # expect revert: "fork used"
```

- Guarded executor address: `_______________________` (MUST NOT equal `0xa95Ffdf…`)

```text
<paste the live transcript here: 1st mint tx, 2nd mint revert showing "fork used">
```

---

## Sign-off

Phase 10 is complete only when ALL of the following hold:

- [ ] (a) Pre-guard 2nd-mint baseline recorded
- [ ] (b) `evm_snapshot`→`evm_revert` round-trip recorded (legs==0 + signer gas + fresh mint)
- [ ] (c) viem server-sign dry-run recorded
- [ ] (d) On-fork post-guard `"fork used"` revert recorded
- [ ] The fresh executor address ≠ poisoned `0xa95Ffdf51f71fE9C8861Fdbb1cAA664FA78A5FE3`
- [ ] `git diff` shows the frontend artifact (`buildbear-deployments.json`) changed (no manual-copy drift)
- [ ] Fork-liveness pre-flight (`cast chain-id`) succeeded immediately before each recorded section
