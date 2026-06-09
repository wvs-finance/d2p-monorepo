# Phase 10: Backend — On-Chain Single-Use Guard + `--no-mint` Provisioning — Research

**Researched:** 2026-06-08
**Domain:** Solidity single-use guard + Foundry fork provisioning + BuildBear snapshot lifecycle
**Confidence:** HIGH (all findings grounded in file:line source code inspection; BuildBear RPC methods LIVE-VERIFIED in existing provision script)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **EXEC-01 guard placement:** `require(pool.numberOfLegs(address(this)) == 0, "fork used")` placed in `_resolveAndMintAtStrike`, BEFORE any `pool.dispatch`. String revert, not custom error. Frontend string-matches `"fork used"`. Covers all 3 entrypoints.
- **Operator invocation:** `--no-mint` shell flag exports `SKIP_MINT=true`; `.s.sol` reads `vm.envOr("SKIP_MINT", false)`.
- **Dedicated `DEMO_SIGNER_PK`** (distinct from `BUILDBEAR_DEPLOYER_PK`), funded via `hardhat_setBalance` INSIDE the captured snapshot; collateral/approvals deposited on behalf of the executor as part of deploy.
- **Snapshot timing:** taken AFTER deploy + collateral + signer-funding, BEFORE mint. `evm_snapshot` id recorded in artifact. One-use semantics (re-snapshot after revert).
- **Artifact write path:** directly to `packages/frontend/lib/apps/abrigo/cornerstone/buildbear-deployments.json` (stable anchor, `mkdir -p`). `mintTxHash` serialized as JSON `null` via `jq --argjson`.
- **Empirical spike FIRST** on a freshly-provisioned `--no-mint` throwaway stack (NOT the dirty committed pool). Records (a) pre-guard 2nd-mint behavior, (b) `evm_snapshot`→`evm_revert` round-trip, (c) viem server-sign dry-run of `resolveFromMandate`, (d) on-fork post-guard `cast` transcript showing `"fork used"`.
- **Evidence committed to** `.planning/phases/10-.../10-SPIKE-EVIDENCE.md`. Phase completion is transcript-based, NOT CI.
- **CI governance (OPS-06):** EXEC-01 Foundry guard test rides existing `forge test --no-match-path 'test/**/*[Ff]ork*'` lane. Test file MUST NOT match `*[Ff]ork*`. All code lands via PR. Live-fork spike is operator-manual.

### Claude's Discretion

- **Demo signer key lifecycle:** `DEMO_SIGNER_PK` is a fixed key generated once, stored in gitignored `contracts/.env` + frontend server env (Vercel, non-`NEXT_PUBLIC_`). Reused across provisions. Script prints funded address only.
- **Exact `--no-mint` shell arg-parsing mechanism** (simple `$1`/`case`).
- **Collateral funding amounts:** reuse existing `DEFAULT_FUND_USD`/`DEFAULT_FUND_COP` unless spike shows under-margining.
- **Precise `jq` reshaping** for `mintTxHash: null` (`--argjson`).
- **Whether EXEC-01 also warrants re-read guard on other paths** beyond the shared sink (sink placement already covers them).

### Deferred Ideas (OUT OF SCOPE)

- KV-backed (Upstash) automatic snapshot-id persistence / auto-reset for concurrent judges (RESET-01 Future).
- Per-judge fork provisioning (RESET-02 Future).
- Custom `error ForkUsed()` migration (deferred; string revert chosen for v3.0 frontend simplicity).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| EXEC-01 | `MacroHedgeExecutor` reverts `"fork used"` when `pool.numberOfLegs(address(this)) != 0`. Guard in `_resolveAndMintAtStrike` before any `pool.dispatch`. Verified by Foundry test + on-fork `cast` transcript. | Edit site pinned to `MacroHedgeExecutor.sol:357-363` (before existing `require` statements). Test pattern is a MockPool subclass (no live fork). |
| PROV-01 | Operator can run `--no-mint` / `SKIP_MINT=true` variant deploying fresh executor with `numberOfLegs == 0`. | `ProvisionBuildBearDemo.s.sol:125-138` `run()` + `_provision()`. `SKIP_MINT` gate added via `vm.envOr`. The final mint step (`_provision()` lines 173-184) is the only section gated. |
| PROV-02 | Dedicated `DEMO_SIGNER_PK` address funded with native gas via `hardhat_setBalance` INSIDE the captured snapshot. Collateral for executor deposited as part of deploy. | `provision-buildbear-demo.sh:65` already uses `hardhat_setBalance` for the deployer EOA — same RPC method, new target address. Collateral deposit is at `_provision()` lines 164-171. |
| PROV-03 | Provisioning captures `evm_snapshot` id AFTER deploy + collateral + signer funding but BEFORE any mint. Verified by round-trip: `evm_revert` → fresh `resolveFromMandate` succeeds. | `evm_snapshot` is a no-params JSON-RPC call returning a hex string. Must be called from shell (not Foundry VM cheat) against the hosted BuildBear node. `cast rpc evm_snapshot --rpc-url "$RPC"` is the correct invocation. |
| PROV-04 | Provisioning writes `buildbear-deployments.json` directly to the frontend artifact path with `mintTxHash` as JSON `null`. | Shell currently writes to `script/out/buildbear-deployments.json` (line 115). Redirect needed + `--argjson mintTxHash null` on the `--no-mint` path. Frontend `artifact-loader.ts` type migration: add `snapshotId?: string; mintTxHash?: string \| null`. |
</phase_requirements>

---

## Summary

Phase 10 is entirely within `packages/backend` plus a Wave-0 type migration in `packages/frontend/lib/apps/abrigo/cornerstone/artifact-loader.ts`. It has five atomic deliverables that must be produced in a specific order: (1) the empirical spike on a fresh `--no-mint` stack (de-risking gate), (2) the EXEC-01 Foundry guard test (CI-verifiable, no fork), (3) the `_resolveAndMintAtStrike` edit in `MacroHedgeExecutor.sol`, (4) the `ProvisionBuildBearDemo.s.sol` `SKIP_MINT` gate + `run()` structure, and (5) the `provision-buildbear-demo.sh` `--no-mint` variant that automates snapshot capture and writes the artifact directly to the frontend path.

The EXEC-01 guard is a three-line insertion into `MacroHedgeExecutor.sol:362` (after the existing `require` statements in `_resolveAndMintAtStrike`). The guard uses the `pool` immutable already in scope. The `numberOfLegs` view on `PanopticPoolV2` is NOT reentrancy-guarded on a READ path — the reentrancy concern applies only when the pool's own guard is active (i.e., inside `pool.dispatch`), which is why the check must precede `pool.dispatch` at line 401+.

**Primary recommendation:** Implement deliverables in wave order: Wave 0 (spike + type migration) → Wave 1 (EXEC-01 guard + Foundry test) → Wave 2 (`--no-mint` script variant + artifact write). Each wave is PR-gated. The spike is not a PR step — it is an operator-manual prerequisite recorded in `10-SPIKE-EVIDENCE.md`.

---

## Standard Stack

### Core

| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| Foundry (`forge`) | 1.5.x (already in repo) | Solidity compilation, unit tests, broadcast scripts | Already locked in CI; `vm.envOr` is a stable cheatcode since Forge 0.2.x |
| `cast rpc` | Foundry 1.5.x | Invoke `evm_snapshot` / `evm_revert` against hosted BuildBear node from shell | Only safe way to call hosted-node JSON-RPC methods from outside a Foundry script (scripts cannot use `vm.snapshot` for a remote node) |
| `jq` | system (already in shell) | Construct the artifact JSON with `mintTxHash: null` via `--argjson` | Already used in `provision-buildbear-demo.sh:117-131` |
| `curl` | system | Call `buildbear_ERC20Faucet` / `hardhat_setBalance` from shell | Pattern already established in `erc20_faucet()` at line 77-83 |

### Supporting

| Tool | Version | Purpose | When to Use |
|------|---------|---------|-------------|
| `vm.envOr("SKIP_MINT", false)` | Foundry cheatcode | Gate the final mint step in `ProvisionBuildBearDemo.s.sol` | In `run()` after `_provision()`'s deposit step and before `exec.resolveFromMandate(...)` |
| `cast wallet address --private-key` | Foundry | Derive signer address from `DEMO_SIGNER_PK` without exposing the key | In shell, same pattern as line 58: `SIGNER_EOA="$(cast wallet address --private-key "$DEMO_SIGNER_PK")"` |
| viem `privateKeyToAccount` + `createWalletClient` | viem ≥2.x (already in repo) | Spike only: server-side dry-run of `resolveFromMandate` from a Node script | Spike evidence item (c) only; no new viem dep needed |

**Installation:** No new dependencies. All tools already present.

---

## Architecture Patterns

### Recommended Project Structure (new / modified files only)

```
packages/backend/contracts/
├── src/
│   └── MacroHedgeExecutor.sol         MODIFIED — add 3-line guard in _resolveAndMintAtStrike
├── script/
│   ├── ProvisionBuildBearDemo.s.sol   MODIFIED — vm.envOr("SKIP_MINT") gate + evm_snapshot console log
│   └── provision-buildbear-demo.sh    MODIFIED — --no-mint flag + DEMO_SIGNER_PK funding + direct frontend artifact write
└── test/
    └── unit/
        └── MacroHedgeExecutor.guard.t.sol  NEW — keyless Foundry unit test for EXEC-01

packages/frontend/lib/apps/abrigo/cornerstone/
├── artifact-loader.ts                 MODIFIED — snapshotId?: string; mintTxHash?: string | null
└── buildbear-deployments.json         REPLACED — --no-mint artifact (poisoned version retired)

.planning/phases/10-.../
└── 10-SPIKE-EVIDENCE.md               NEW — operator-recorded live-fork transcripts (4 sections)
```

### Pattern 1: EXEC-01 Guard — Three-Line Insertion in `_resolveAndMintAtStrike`

**What:** A `require` that reads `pool.numberOfLegs(address(this))` before the first `pool.dispatch` call.

**Edit site:** `packages/backend/contracts/src/MacroHedgeExecutor.sol`, function `_resolveAndMintAtStrike`, immediately after the existing `require(uint256(legParams.chainId) == block.chainid, "No crosschain allowed yet")` at line 365 and BEFORE the `pool.dispatch` at line 401.

**Exact insertion:**
```solidity
// EXEC-01: single-use guard — reverts if this executor already holds a position.
// Must precede pool.dispatch (numberOfLegs view reverts Reentrancy() when the
// pool's reentrancy guard is active during dispatch).
require(pool.numberOfLegs(address(this)) == 0, "fork used");
```

**Why BEFORE dispatch:** `PanopticPoolV2.numberOfLegs` is a view function. Calling it while inside `pool.dispatch` triggers the pool's reentrancy guard and reverts with `Reentrancy()`. The guard must be placed before line 401 (first `pool.dispatch` call).

**Coverage:** Because all three public entrypoints (`resolveFromMandate` line 279, `resolveAndMint` line 168, `_onResult` line 195) call `_resolveAndMintAtStrike` as their ONLY mint path, placing the guard here makes single-use unbypassable.

**What `numberOfLegs` returns:** The count of positions (legs) the executor holds in the pool. On a freshly-provisioned `--no-mint` stack, `pool.numberOfLegs(address(this)) == 0`. After one successful mint via `resolveFromMandate`, `numberOfLegs == 1` (the long leg) or `2` (short + long). Either `> 0` triggers the guard.

**String revert "fork used":** This is a cross-layer contract. The frontend `HONEST-01` path (Phase 12) string-matches on `"fork used"`. Do NOT change this string. Do NOT use a custom error. ABI-decode of custom errors across chains/abis is fragile; string matching is trivially reliable.

### Pattern 2: Foundry Unit Test — Keyless, Non-Fork, CI-Safe

**File name convention:** The CI lane filters `test/**/*[Ff]ork*`. Name the test file so it does NOT match: `MacroHedgeExecutor.guard.t.sol` (no "fork" substring). Place in `test/unit/` or `test/instrument/`.

**Test strategy:** Deploy a `MockPool` that increments a `legs` counter when `dispatch` is called. Deploy `MacroHedgeExecutor` pointing at this mock pool. Call `resolveAndMint` once (succeeds). Call again (reverts `"fork used"`). Also call `resolveFromMandate` on the second attempt to verify coverage via that entrypoint.

**Pattern from existing test:** `MacroHedgeExecutor.onResult.t.sol` demonstrates the `MacroHedgeExecutorDecodeProbe` subclass pattern: override `_resolveAndMintAtStrike` to isolate behavior. For the guard test, the override is NOT needed — the guard fires BEFORE the mint logic, so the real `_resolveAndMintAtStrike` executes up to the `require` and reverts. The mock pool just needs to answer `numberOfLegs(address)` correctly.

**Exact test name shape (bulloak-compatible):**
```solidity
// test/unit/MacroHedgeExecutor.guard.t.sol
contract MacroHedgeExecutorGuardTest is Test {
    function test_WhenNumberOfLegsIsZeroFirstMintSucceeds() external { ... }
    function test_WhenNumberOfLegsIsNonZeroSecondMintRevertsForkedUsed() external { ... }
    function test_WhenCalledViaResolveAndMintSecondCallRevertsForkedUsed() external { ... }
}
```

**CI-lane membership:** `forge test --no-match-path 'test/**/*[Ff]ork*'` at `.github/workflows/ci.yml:50` — the file `test/unit/MacroHedgeExecutor.guard.t.sol` does NOT match `*[Ff]ork*` and will be picked up by this lane automatically. No CI workflow change required.

### Pattern 3: `vm.envOr` Gate in `ProvisionBuildBearDemo.s.sol`

**Where to add:** In `run()` at `ProvisionBuildBearDemo.s.sol:125-138`, AFTER `_provision()` returns the `ProvisionResult` struct. The `_provision()` function body (lines 143-195) performs steps (1) core deploy, (2) pool, (3) executor, (4) deposit-on-behalf. Step (5) mint is currently at lines 173-184 of `_provision()`.

**Restructure option:** Extract the mint step out of `_provision()` into `run()` itself, gated by `vm.envOr`. This keeps `_provision()` responsible only for deploy + deposit (the always-run part) and `run()` responsible for the conditional mint:

```solidity
function run() external {
    vm.startBroadcast();
    ProvisionResult memory r = _provision();         // deploy + deposit only
    bool skipMint = vm.envOr("SKIP_MINT", false);
    if (!skipMint) {
        HedgeMandate memory mandate = _demoMandate(r.pool);
        TokenId positionId = MacroHedgeExecutor(r.executor).resolveFromMandate(mandate, 0, 1e6);
        r.strike = positionId.strike(0);
        r.legs = PanopticPoolV2(r.pool).numberOfLegs(r.executor);
    }
    vm.stopBroadcast();
    // log block...
    if (!skipMint) {
        require(r.legs > 0, "mint failed: executor owns no leg");
    }
}
```

**Alternative (inline gate inside `_provision()`):** Add `if (!vm.envOr("SKIP_MINT", false)) { /* mint step */ }` directly in `_provision()`. Either approach is valid; extraction to `run()` is cleaner because `_provision()` becomes a pure deploy+deposit helper.

**`SKIP_MINT` invocation from shell:**
```bash
SKIP_MINT=true forge script script/ProvisionBuildBearDemo.s.sol \
  --rpc-url "$RPC" --broadcast --slow \
  --private-key "$BUILDBEAR_DEPLOYER_PK"
```

### Pattern 4: Shell `--no-mint` Flag and Artifact Write

**Arg parsing (minimal):**
```bash
NO_MINT=false
for arg in "$@"; do
  case "$arg" in
    --no-mint) NO_MINT=true ;;
  esac
done
```

**DEMO_SIGNER_PK funding sequence** (inside the `--no-mint` path, after B2 broadcast):
```bash
# Derive signer address from the dedicated key (never print the key)
SIGNER_EOA="$(cast wallet address --private-key "$DEMO_SIGNER_PK")"
echo "DEMO_SIGNER_EOA=$SIGNER_EOA"

# Fund native gas for the signer — same hardhat_setBalance pattern as deployer (line 65)
cast rpc hardhat_setBalance "$SIGNER_EOA" 0xd3c21bcecceda1000000 --rpc-url "$RPC" >/dev/null 2>&1 || true
```

This funding must happen BEFORE `evm_snapshot` so it is captured in the snapshot state.

**Snapshot capture** (after funding, before any mint):
```bash
SNAPSHOT_ID="$(cast rpc evm_snapshot --rpc-url "$RPC")"
# cast rpc returns the result with quotes; strip them
SNAPSHOT_ID="$(echo "$SNAPSHOT_ID" | tr -d '"')"
echo "SNAPSHOT_ID=$SNAPSHOT_ID"
```

**Why `cast rpc` not `vm.rpc` in Solidity:** `vm.rpc` in Foundry scripts calls JSON-RPC methods on the fork's in-memory Anvil node. For a HOSTED BuildBear sandbox, `vm.rpc("evm_snapshot", "[]")` would call snapshot on the in-process Foundry fork node (if using `--fork-url`), not on the hosted BuildBear RPC. The correct approach is `cast rpc evm_snapshot --rpc-url "$RPC"` from the shell AFTER the broadcast completes. This is confirmed by the existing script pattern: all BuildBear-specific JSON-RPC methods (`hardhat_setBalance`, `buildbear_ERC20Faucet`, `evm_mine`) are called via `cast rpc` and `curl` from the shell, not from inside the Solidity script.

**Artifact write — direct to frontend path:**

The `--no-mint` variant must compute the frontend path from a stable anchor. The stable anchor is the script's own location:

```bash
# Stable anchor: script location → contracts dir → monorepo root → frontend path
MONO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
FRONTEND_ART="$MONO_ROOT/packages/frontend/lib/apps/abrigo/cornerstone/buildbear-deployments.json"
mkdir -p "$(dirname "$FRONTEND_ART")"
```

**`jq` `mintTxHash: null` serialization:**

The existing script at line 125 uses `--arg mintTxHash "$MINT_TX_HASH"` (a string value). For `--no-mint`, use `--argjson` to produce a JSON `null`:

```bash
# --no-mint path: mintTxHash is JSON null, not a string
jq -n \
  --argjson chainId "$CHAIN_ID" \
  --arg executor "$EXECUTOR" \
  --arg pool "$POOL" \
  --arg riskManagement "$RISK_MGMT" \
  --arg factory "$FACTORY" \
  --arg riskEngine "$RISK_ENGINE" \
  --arg rpcUrl "$RPC" \
  --argjson mintTxHash null \
  --argjson mintedStrike null \
  --arg capturedAt "$CAPTURED_AT" \
  --arg snapshotId "$SNAPSHOT_ID" \
  '{chainId:$chainId, executor:$executor, pool:$pool, riskManagement:$riskManagement,
    factory:$factory, riskEngine:$riskEngine, rpcUrl:$rpcUrl, mintTxHash:$mintTxHash,
    mintedStrike:$mintedStrike, capturedAt:$capturedAt, snapshotId:$snapshotId,
    source:"abrigo-somnia --no-mint provision-buildbear-demo.sh"}' > "$FRONTEND_ART"
```

Note: `--argjson mintTxHash null` produces `"mintTxHash": null` in the JSON output. `--arg mintTxHash ""` would produce `"mintTxHash": ""` (a string), which the artifact-loader validator would reject.

### Pattern 5: `artifact-loader.ts` Type Migration (Wave 0, shared with Phase 11)

**File:** `packages/frontend/lib/apps/abrigo/cornerstone/artifact-loader.ts`

**Current type** (`BuildBearDeployment` at line 20-33):
- `mintTxHash: string` — required, non-nullable
- `mintedStrike: number` — required
- No `snapshotId` field

**Required migration:**
```typescript
export type BuildBearDeployment = {
  chainId: number
  executor: string
  pool: string
  riskManagement: string
  rpcUrl: string
  mintTxHash: string | null   // null on --no-mint artifact
  mintedStrike: number | null // null on --no-mint artifact
  capturedAt: string
  source: string
  // Optional fields
  factory?: string
  riskEngine?: string
  snapshotId?: string         // NEW — hex string, e.g. "0x1"; absent on legacy artifacts
}
```

**`validateDeployment` change:** The `required` array at line 41-47 already does NOT include `mintTxHash` or `mintedStrike` (correct — they are optional/nullable). The only change needed is:
1. Update the TS type to allow `string | null` for `mintTxHash` and `mintedStrike`.
2. Add `snapshotId?: string` to the type.
3. The validator at line 48-53 checks `=== null || === ''` for required fields. Since `mintTxHash` is NOT in the `required` array, no validator change is needed — the null value will pass through.

**Confirmed safe:** The `validateDeployment` function's `required` array (line 41-47) already lists only `['chainId', 'executor', 'pool', 'rpcUrl', 'capturedAt']`. `mintTxHash` is NOT in this list. The type change is purely additive; no runtime behavior changes.

### Anti-Patterns to Avoid

- **`vm.snapshot` / `vm.rpc("evm_snapshot", ...)` inside a Foundry script targeting a hosted node:** These call the in-process Anvil node, not the BuildBear sandbox RPC. Use `cast rpc evm_snapshot --rpc-url "$RPC"` from the shell instead.
- **`anvil_setBalance` on BuildBear:** LIVE-VERIFIED rejection in `provision-buildbear-demo.sh:65` (`|| true` guard present). Always use `hardhat_setBalance`.
- **`--arg mintTxHash ""` for the null case:** `jq --arg` always produces a JSON string. Use `--argjson mintTxHash null` to produce JSON `null`.
- **Writing the artifact to `script/out/` and relying on a manual copy:** This is the root cause of Pitfall 6 (artifact drift). The `--no-mint` variant must write directly to `$FRONTEND_ART` as computed above.
- **Funding the deployer EOA for `DEMO_SIGNER_PK`:** The deployer (`BUILDBEAR_DEPLOYER_PK`) is already funded at the top of the script. The `DEMO_SIGNER_PK` is a DISTINCT key. Funding must target `SIGNER_EOA`, not `EOA`.
- **Taking the snapshot before signer funding:** If `hardhat_setBalance` for the signer runs AFTER `evm_snapshot`, the signer's funded balance will NOT be restored by `evm_revert`. The order is: deploy → deposit-on-behalf → fund signer → `evm_snapshot`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Snapshot/revert of hosted fork state | Custom state serialization or re-deploy on reset | `evm_snapshot` / `evm_revert` via `cast rpc` | BuildBear supports both; already LIVE-VERIFIED for related methods |
| Native-gas funding on BuildBear | ETH transfer from a whale account | `hardhat_setBalance` via `cast rpc` | LIVE-VERIFIED; `anvil_setBalance` is rejected on BuildBear |
| Conditional Solidity script step | A second `.s.sol` script | `vm.envOr("SKIP_MINT", false)` | Idiomatic Foundry pattern; avoids maintaining two scripts that differ by one `if` |
| JSON null field in shell | `echo '{"mintTxHash":null}'` | `jq --argjson mintTxHash null` | `jq` handles JSON type safety; manual echo risks quoting errors |
| EXEC-01 test without a live fork | Custom in-VM fork setup requiring `BASE_RPC_URL` | MockPool + `MacroHedgeExecutorGuardTest` — no fork | Matches `MacroHedgeExecutor.onResult.t.sol` pattern; runs in the secret-free CI lane |

---

## Common Pitfalls

### Pitfall 1: `numberOfLegs` View Called Inside `pool.dispatch` (Reentrancy Reverts)

**What goes wrong:** `PanopticPoolV2.numberOfLegs` is a public view, but PanopticPool uses a reentrancy guard. If `numberOfLegs` is called AFTER `pool.dispatch` has started (e.g., in a callback), the guard fires and reverts `Reentrancy()`.

**Why it happens:** In `_resolveAndMintAtStrike`, there are TWO `pool.dispatch` calls (lines 401 and 415). If the guard is placed between them (after the first dispatch returns), the pool guard is no longer active — this would be safe, but it would allow the first dispatch to succeed, which changes pool state and breaks the atomicity we want. The guard must be before BOTH dispatches, i.e., before line 401.

**How to avoid:** Place `require(pool.numberOfLegs(address(this)) == 0, "fork used")` immediately after the existing `require` statements (lines 364-365) and BEFORE the first `pool.dispatch` block (line 401). This is the locked decision and is the only safe placement.

**Warning signs:** Test reverts with `Reentrancy()` instead of `"fork used"` → the guard was placed after dispatch entry.

### Pitfall 2: Snapshot Taken Before Signer Funding

**What goes wrong:** `evm_revert(snapshotId)` restores ALL state to the snapshot point. If the signer's `hardhat_setBalance` runs AFTER the snapshot was taken, the restored state has the signer at 0 balance. The signer's first `resolveFromMandate` call fails with `insufficient funds for gas`.

**How to avoid:** The sequence MUST be: `_provision()` (deploy + deposit-on-behalf) → `hardhat_setBalance` for signer → `evm_snapshot` → (skip mint). Never take the snapshot before the signer is funded.

**Warning signs:** PROV-03 round-trip test — `evm_revert` → fresh `resolveFromMandate` reverts with gas error, not contract error.

### Pitfall 3: Snapshot ID Not Stripped of Quotes from `cast rpc`

**What goes wrong:** `cast rpc evm_snapshot --rpc-url "$RPC"` returns the JSON-RPC result including quotes, e.g., `"0x1"`. If stored verbatim, the artifact contains `"snapshotId": "\"0x1\""` (double-escaped), which `evm_revert` rejects.

**How to avoid:** Strip quotes: `SNAPSHOT_ID="$(cast rpc evm_snapshot --rpc-url "$RPC" | tr -d '"')"`. Produces `0x1`.

**Warning signs:** `evm_revert` returns `false` or an error when called with the stored snapshot ID.

### Pitfall 4: Poisoned Committed Artifact Used for the Spike

**What goes wrong:** The currently-committed `buildbear-deployments.json` has `executor: "0xa95Ffdf51f71fE9C8861Fdbb1cAA664FA78A5FE3"` and `mintTxHash: "0xfce415a6..."` — this executor already holds a minted position (`numberOfLegs > 0`). Using this as the spike baseline produces misleading results (the 2nd-mint behavior recorded is against a guard-less executor that already has legs, not the pre-guard baseline we need).

**How to avoid:** The empirical spike MUST run against a FRESHLY-PROVISIONED `--no-mint` stack. Create a new BuildBear sandbox for the spike. The spike's first `resolveFromMandate` succeeds (baseline), the second is the pre-guard 2nd-mint outcome. The old executor address must never be redeployed; `--no-mint` deploys a new executor at a new address.

**Warning signs:** The spike script logs an `EXECUTOR_ADDRESS` that matches the committed `"0xa95Ffdf51f71..."` — this means the old artifact was used, not a fresh provision.

### Pitfall 5: Foundry Guard Test Named with "fork" Substring

**What goes wrong:** The CI lane `forge test --no-match-path 'test/**/*[Ff]ork*'` excludes any file matching `*[Ff]ork*`. If the guard test is named `MacroHedgeExecutorFork.guard.t.sol` or placed in `test/fork/`, it is EXCLUDED from the CI lane and OPS-06 is violated.

**How to avoid:** Name the file without any "fork" substring. `MacroHedgeExecutor.guard.t.sol` in `test/unit/` is safe. The existing non-fork tests (e.g., `MacroHedgeExecutor.onResult.t.sol` in `test/instrument/`) confirm the pattern.

---

## Code Examples

### Guard Insertion in `_resolveAndMintAtStrike`

```solidity
// Source: packages/backend/contracts/src/MacroHedgeExecutor.sol:357
function _resolveAndMintAtStrike(
    HedgeLegParams memory legParams,
    uint256 legIndex,
    uint128 positionSize,
    uint256 requestId,
    int24 strike
) internal virtual returns (TokenId positionId) {
    require(legParams.size <= 127, "optionRatio overflow");
    require(uint256(legParams.chainId) == block.chainid, "No crosschain allowed yet");
    // EXEC-01: single-use guard. Must precede pool.dispatch (numberOfLegs reverts
    // Reentrancy() if called while pool guard is active inside dispatch).
    require(pool.numberOfLegs(address(this)) == 0, "fork used");

    int24 tickSpacing_ = legParams.payoffTerms.tickSpacing;
    // ... rest of existing body unchanged ...
```

### Foundry Guard Test Skeleton

```solidity
// Source: new file test/unit/MacroHedgeExecutor.guard.t.sol
// NOT named *fork* — runs in the secret-free CI lane
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {MacroHedgeExecutor} from "../../src/MacroHedgeExecutor.sol";
import {PanopticPoolV2} from "@contracts/PanopticPool.sol";
import {RiskManagement} from "../../src/RiskManagement.sol";
import {IRegimeOracle} from "../../src/interfaces/IRegimeOracle.sol";
import {ISurpriseOracle} from "../../src/interfaces/ISurpriseOracle.sol";
import {HedgeMandate} from "../../src/types/HedgeMandate.sol";
import {IMacroThesis} from "../../src/interfaces/IMacroThesis.sol";
import {MockPlatform} from "../mocks/MockPlatform.sol";
import {MockRegimeOracle} from "../mocks/MockRegimeOracle.sol";
import {MockSurpriseOracle} from "../mocks/MockSurpriseOracle.sol";
import {PoolKey} from "v4-core/types/PoolKey.sol";
import {PoolIdLibrary} from "v4-core/types/PoolId.sol";
import {IHooks} from "v4-core/interfaces/IHooks.sol";
import {Currency} from "v4-core/types/Currency.sol";

/// @dev MockPool that tracks numberOfLegs per address for EXEC-01 guard testing.
/// Increments legs on dispatch (simulating a successful mint). No real pool logic.
contract MockPoolForGuard {
    mapping(address => uint256) public _legs;

    function numberOfLegs(address owner) external view returns (uint256) {
        return _legs[owner];
    }

    function dispatch(...) external {
        _legs[msg.sender]++;
    }

    // stub other methods PanopticPoolV2 interface requires...
    function collateralToken0() external view returns (address) { return address(0); }
    function collateralToken1() external view returns (address) { return address(0); }
}

contract MacroHedgeExecutorGuardTest is Test {
    // ...setUp deploys executor with MockPoolForGuard...
    // first resolveFromMandate succeeds (legs==0 → passes guard, mock increments legs)
    // second resolveFromMandate reverts "fork used" (legs==1 → fails guard)
    // resolveAndMint second call also reverts "fork used"
}
```

### `cast rpc evm_snapshot` Shell Invocation

```bash
# From provision-buildbear-demo.sh --no-mint variant, after signer funding:
SNAPSHOT_RAW="$(cast rpc evm_snapshot --rpc-url "$RPC")"
SNAPSHOT_ID="$(echo "$SNAPSHOT_RAW" | tr -d '"')"
echo "SNAPSHOT_ID=$SNAPSHOT_ID"
# Verify it looks like a hex string
[[ "$SNAPSHOT_ID" =~ ^0x[0-9a-fA-F]+$ ]] || { echo "FAIL: evm_snapshot returned unexpected value: $SNAPSHOT_RAW"; exit 1; }
```

### `jq --argjson mintTxHash null` Artifact Write

```bash
# --no-mint path: mintTxHash and mintedStrike are JSON null (not empty strings)
jq -n \
  --argjson chainId "$CHAIN_ID" \
  --arg executor "$EXECUTOR" \
  --arg pool "$POOL" \
  --arg riskManagement "$RISK_MGMT" \
  --arg factory "$FACTORY" \
  --arg riskEngine "$RISK_ENGINE" \
  --arg rpcUrl "$RPC" \
  --argjson mintTxHash null \
  --argjson mintedStrike null \
  --arg capturedAt "$CAPTURED_AT" \
  --arg snapshotId "$SNAPSHOT_ID" \
  '{chainId:$chainId, executor:$executor, pool:$pool, riskManagement:$riskManagement,
    factory:$factory, riskEngine:$riskEngine, rpcUrl:$rpcUrl,
    mintTxHash:$mintTxHash, mintedStrike:$mintedStrike,
    capturedAt:$capturedAt, snapshotId:$snapshotId,
    source:"abrigo-somnia --no-mint provision-buildbear-demo.sh"}' > "$FRONTEND_ART"
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|---|---|---|---|
| `anvil_setBalance` for funded account setup | `hardhat_setBalance` (BuildBear-specific) | LIVE-VERIFIED in existing script | BuildBear rejects `anvil_setBalance`; must use Hardhat namespace |
| Single provisioning path (always mints) | `--no-mint` variant via `SKIP_MINT=true` | Phase 10 (new) | Enables executor to be deployed with `numberOfLegs == 0` for demo use |
| `mintTxHash` as required string field | `mintTxHash: string \| null` + optional `snapshotId?: string` | Phase 10 Wave 0 (new) | Unlocks `--no-mint` artifact without validator rejection |
| Artifact written to `script/out/` (manual copy step needed) | Direct write to frontend artifact path | Phase 10 (fix) | Eliminates Pitfall 6 (artifact drift) |

**Deprecated/outdated:**
- The committed artifact at `buildbear-deployments.json` (`capturedAt: "2026-06-08T00:15:09.000Z"`, `executor: "0xa95Ffdf..."`) is **poisoned** — this executor already holds minted legs, has no EXEC-01 guard, and must never be used for a live claim. It is retired by the `--no-mint` provision run.
- The old `--arg mintTxHash "$MINT_TX_HASH"` jq pattern writes a JSON string; the `--no-mint` path requires `--argjson mintTxHash null` for a JSON null.

---

## Open Questions

1. **`evm_snapshot` persistence across BuildBear sandbox restarts**
   - What we know: BuildBear sandboxes are Anvil-based forks; Anvil supports `evm_snapshot`/`evm_revert`. Not documented whether snapshot IDs survive a cold-start or rolling restart.
   - What's unclear: If the BuildBear infra restarts its Anvil node between provisions and the judge run, the stored snapshot ID may be stale.
   - Recommendation: In the `buildbear-reset` route (Phase 11), implement probe-before-use: attempt `evm_revert(snapshotId)` and check the return value; if it returns `false`, surface `{ ok: false, reason: 'snapshot-stale' }`. Confirm empirically on first `--no-mint` run.

2. **`MockPoolForGuard` interface completeness for unit tests**
   - What we know: `PanopticPoolV2` is a complex contract. The guard test only needs `numberOfLegs` to return a counter and `dispatch` to increment it. The executor constructor takes a `PanopticPoolV2` typed parameter — casting a mock address requires a conforming interface or a `vm.etch` approach.
   - What's unclear: Whether the existing `MockPlatform` pattern (simple contract with the needed methods) is sufficient, or if a fuller mock is needed for the constructor to compile.
   - Recommendation: Follow the `MacroHedgeExecutor.onResult.t.sol` pattern (line 39-43): pass `PanopticPoolV2(address(0))` as the pool ctor param in the DecodeProbe subclass. For the guard test, either subclass the executor with an overridden `pool` immutable (not possible — immutables can't be overridden in Solidity) or use a thin mock contract castable to `PanopticPoolV2` via a `MockPoolForGuard is PanopticPoolV2` subclass or an interface-based approach. The cleanest solution is a `MockPool` that inherits from `PanopticPoolV2` and overrides `numberOfLegs` + `dispatch`.

3. **`_provision()` refactor scope**
   - What we know: The `SKIP_MINT` gate can be added to `run()` (extracting mint from `_provision()`) or inline in `_provision()`. Either compiles.
   - What's unclear: Whether `_provision()` returning a `ProvisionResult` with `strike: 0` and `legs: 0` on `--no-mint` causes any downstream issue in the shell's `grab()` parse.
   - Recommendation: Extract the mint step to `run()`. Have `_provision()` return a result with no `strike`/`legs` fields set (or set to zero defaults). The shell's `grab()` for `MINTED_STRIKE` and `NUMBER_OF_LEGS` will return `0` on the `--no-mint` path, which is correct (no strike, no legs yet).

---

## Validation Architecture

> `nyquist_validation: true` in `.planning/config.json` — this section is required.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Foundry forge 1.5.x |
| Config file | `packages/backend/contracts/foundry.toml` |
| Quick run command | `forge test --no-match-path 'test/**/*[Ff]ork*' --match-path 'test/unit/MacroHedgeExecutor.guard.t.sol'` |
| Full suite command | `forge test --no-match-path 'test/**/*[Ff]ork*'` |

### Phase Requirements → Test/Signal Map

| Req ID | Behavior | Test Type | Signal | CI-Checkable? |
|--------|----------|-----------|--------|---------------|
| EXEC-01 | `_resolveAndMintAtStrike` reverts `"fork used"` on 2nd call | Foundry unit test (no fork) | `forge test --no-match-path 'test/**/*[Ff]ork*'` green; test names `test_WhenNumberOfLegsIsNonZero*` pass | YES — secret-free CI lane |
| EXEC-01 | On-fork executor redeployed with guard reverts 2nd `cast send resolveFromMandate` | Live-fork transcript | `10-SPIKE-EVIDENCE.md` section (d): `cast send` shows `"fork used"` revert | NO — operator-manual only |
| PROV-01 | `--no-mint` provision deploys executor with `pool.numberOfLegs(executor) == 0` | Live-fork transcript | `10-SPIKE-EVIDENCE.md` section (a): `cast call pool numberOfLegs(executor)` returns `0` after provision | NO — operator-manual only |
| PROV-02 | Signer funded inside snapshot; `evm_revert` restores signer gas balance | Live-fork transcript | `10-SPIKE-EVIDENCE.md` section (b): `cast balance $SIGNER_EOA` after revert equals funded amount | NO — operator-manual only |
| PROV-03 | `evm_snapshot`→`evm_revert` round-trip: `resolveFromMandate` succeeds after revert | Live-fork transcript | `10-SPIKE-EVIDENCE.md` section (b): fresh `cast send resolveFromMandate` succeeds after `evm_revert` | NO — operator-manual only |
| PROV-04 | Artifact written directly to frontend path with `mintTxHash: null` | File grep | `jq '.mintTxHash' packages/frontend/lib/apps/abrigo/cornerstone/buildbear-deployments.json` returns `null` (not `""`) | YES (file check, not forge) |
| PROV-04 | `snapshotId` field present in artifact | File grep | `jq '.snapshotId' .../buildbear-deployments.json` returns a hex string like `"0x1"` | YES (file check) |
| PROV-04 | `artifact-loader.ts` type migration accepts null `mintTxHash` | TypeScript type check | `pnpm --filter frontend tsc --noEmit` passes with `mintTxHash: null` in the JSON | YES — tsc via pre-commit hook |
| Wave-0 type migration | `BuildBearDeployment.snapshotId?: string` | TypeScript type check | `tsc --noEmit` green; `artifact-loader.ts` type diff reviewable in PR | YES |

### Sampling Rate

- **Per task commit:** `forge test --no-match-path 'test/**/*[Ff]ork*' --match-path 'test/unit/MacroHedgeExecutor.guard.t.sol'` — fast (unit test, no fork, < 5s)
- **Per wave merge:** `forge test --no-match-path 'test/**/*[Ff]ork*'` — full secret-free suite
- **Phase gate:** Full suite green + `10-SPIKE-EVIDENCE.md` exists with all 4 sections before `/gsd:verify-work`

### Wave 0 Gaps (must exist before implementation waves)

- [ ] `test/unit/MacroHedgeExecutor.guard.t.sol` — covers EXEC-01 (first call succeeds, second reverts `"fork used"` via `resolveAndMint` and `resolveFromMandate`)
- [ ] `10-SPIKE-EVIDENCE.md` — operator-recorded; sections (a) pre-guard 2nd-mint baseline, (b) `evm_snapshot`→`evm_revert` round-trip, (c) viem server-sign dry-run, (d) on-fork post-guard `"fork used"` transcript
- [ ] `artifact-loader.ts` TS type migration (`mintTxHash?: string | null`, `snapshotId?: string`) — must land BEFORE the `--no-mint` artifact is written (unblocks Phase 11 `buildbear-reset` route's `snapshotId` read)

*(If gaps are filled: "None — existing test infrastructure covers all phase requirements")*

---

## Sources

### Primary (HIGH confidence)

- `packages/backend/contracts/src/MacroHedgeExecutor.sol` — full source; `_resolveAndMintAtStrike` body (lines 357-422), all three entrypoints (lines 156-169, 209-279, 180-196), `pool` immutable (line 59)
- `packages/backend/contracts/script/ProvisionBuildBearDemo.s.sol` — `run()` structure (lines 125-138), `_provision()` body (lines 143-195), `_deployCore()` + `_deployExecutor()` helpers
- `packages/backend/contracts/script/provision-buildbear-demo.sh` — all 144 lines; `hardhat_setBalance` pattern (line 65), `buildbear_ERC20Faucet` pattern (lines 77-83), `jq` artifact emit (lines 117-131), artifact output path (lines 114-115)
- `packages/frontend/lib/apps/abrigo/cornerstone/artifact-loader.ts` — `BuildBearDeployment` type (lines 20-33), `validateDeployment` required fields list (lines 41-47)
- `packages/frontend/lib/apps/abrigo/cornerstone/buildbear-deployments.json` — committed (poisoned) artifact with `executor: "0xa95Ffdf..."`, `mintTxHash: "0xfce415a6..."`, `capturedAt: "2026-06-08T00:15:09.000Z"`
- `packages/backend/contracts/test/instrument/MacroHedgeExecutor.onResult.t.sol` — existing unit test pattern: `MacroHedgeExecutorDecodeProbe` subclass, `MockPlatform`, no fork, CI-safe
- `.github/workflows/ci.yml` lines 49-50 — `forge test --no-match-path 'test/**/*[Ff]ork*'` CI lane definition; case-insensitive `[Ff]ork` glob
- `.planning/research/STACK.md` — BuildBear RPC method reference (all LIVE-VERIFIED methods); `vm.envOr` pattern; `evm_snapshot`/`evm_revert` one-use behavior
- `.planning/research/ARCHITECTURE.md` — artifact contract table, build order, reset guard placement
- `.planning/research/PITFALLS.md` — Pitfall 1 (shared fork state), Pitfall 2 (key leak), Pitfall 6 (artifact drift)
- `.planning/phases/10-.../10-CONTEXT.md` — all locked decisions

### Secondary (MEDIUM confidence)

- BuildBear JSON-RPC API docs (referenced in STACK.md) — `evm_snapshot` / `evm_revert` support confirmed; parameter shapes LIVE-VERIFIED via existing script
- Foundry issue #6463 (referenced in STACK.md) — `evm_revert` one-use behavior (snapshot consumed after successful revert)

---

## Metadata

**Confidence breakdown:**
- EXEC-01 edit site: HIGH — exact line numbers confirmed from source read
- Foundry test pattern: HIGH — existing test in `MacroHedgeExecutor.onResult.t.sol` provides exact template
- Shell `--no-mint` pattern: HIGH — `jq --argjson`, `cast rpc`, `hardhat_setBalance` all LIVE-VERIFIED in existing script
- `evm_snapshot` from shell (not Solidity): HIGH — confirmed by analysis of VM vs hosted-node distinction; `cast rpc` is the correct invocation path
- MockPool for unit test: MEDIUM — `PanopticPoolV2` interface depth unknown; may require a fuller mock than a simple counter contract
- `evm_snapshot` persistence across sandbox restarts: LOW — not documented by BuildBear; probe-before-use mitigation recommended

**Research date:** 2026-06-08
**Valid until:** 2026-07-08 (30 days; stable domain — Foundry cheatcodes and BuildBear RPC methods are stable)
