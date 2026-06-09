# Architecture Research

**Domain:** v3.0 BuildBear Live-Tx Integration — one-click pre-funded fork mint, Somnia decoupling, reset guard, provisioning contract
**Researched:** 2026-06-08
**Confidence:** HIGH (structure derived directly from existing code, no inference required for boundaries; MEDIUM for backend `--no-mint` variant shape, which is new work not yet in the codebase)

---

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  BROWSER (client island — 'use client')                                      │
│                                                                              │
│  CornerstoneClientShell.tsx                                                  │
│  ├── mount: probeEthChainId → checkNumberOfLegs   (MODIFIED: adds reset      │
│  │         → if legs > 0 → POST /api/cornerstone/buildbear-reset             │
│  │           (NEW: reset-guard route — snapshot/revert or fresh-executor)    │
│  │         → if legs == 0 → stay 'live'                                      │
│  ├── handleLiveConfirm() [MODIFIED: Somnia decoupling cut HERE]              │
│  │   ├── OLD: POST /api/abrigo/agent1 FIRST → degrade on 503                │
│  │   └── NEW: check resolvedMode === 'buildbear'                             │
│  │       ├── 'buildbear' branch: skip agent1 POST entirely                   │
│  │       │   → call handleBuildBearConfirm()                                 │
│  │       └── 'somnia' branch: existing agent1 POST (operator-only)           │
│  │                                                                           │
│  └── handleBuildBearConfirm() [NEW function]                                │
│      ├── POST /api/cornerstone/buildbear-sign  (NEW server route)            │
│      │   ← returns { ok: true, strategistView, serializedMandate }           │
│      │     (pre-funded signer constructs the StrategistDecided view          │
│      │      server-side from the provisioned artifact; no Somnia call)       │
│      ├── createBuildBearPublicClient(deployment.rpcUrl) → publicClient       │
│      └── runWorkflowLive({                                                   │
│              emit: store.emit,                                               │
│              writeContract: writeContractAsync,  ← wagmi hook (MODIFIED:    │
│              publicClient,                          now actually called,     │
│              upstream: { ok: true, strategistView },  not void'd)            │
│              serializedMandate,                                              │
│              deployment                                                      │
│          })                                                                  │
│          → emits: submitting → pending(hash) → ExecutorDecided              │
│                   → PositionMinted → confirmed(margins)                     │
│          → store.emit() triggers useSyncExternalStore re-render             │
└──────────────────────────────────────────────────────────────────────────────┘
         │ wagmi writeContractAsync          │ POST (server routes)
         ▼                                   ▼
┌────────────────────┐        ┌──────────────────────────────────────────────┐
│  BuildBear Fork    │        │  NEXT.JS SERVER ROUTES (Node runtime)        │
│  chainId 31337     │        │                                              │
│  rpcUrl from       │◄───────│  POST /api/cornerstone/buildbear-sign  [NEW] │
│  artifact-loader   │        │  ├── reads deployment artifact               │
│  (CORS-proxied     │        │  ├── constructs pre-funded signer view       │
│  via /api/         │        │  │   (StrategistDecided from snapshot)       │
│  cornerstone/rpc   │        │  ├── returns { ok, strategistView,           │
│  if needed)        │        │  │              serializedMandate }          │
│                    │        │  └── NEVER touches Somnia / agent1           │
│  MacroHedgeExecutor│        │                                              │
│  .resolveFromMandate        │  POST /api/cornerstone/buildbear-reset [NEW] │
│  (args: mandate,   │        │  ├── reads deployment.rpcUrl                 │
│   0n, 1_000_000n)  │        │  ├── Option A: evm_snapshot → evm_revert    │
└────────────────────┘        │  │   (if BuildBear supports evm_snapshot)   │
                              │  └── Option B: re-run provision script       │
                              │      (fresh executor — closes the            │
                              │      numberOfLegs > 0 gate)                  │
                              │                                              │
                              │  POST /api/cornerstone/rpc  [EXISTING]       │
                              │  (CORS proxy — unchanged)                    │
                              │                                              │
                              │  POST /api/abrigo/agent1    [EXISTING]       │
                              │  (Somnia operator-only — unchanged, returns  │
                              │   503 without SOMNIA_OPERATOR_PK)            │
                              └──────────────────────────────────────────────┘
                                           │
                                           │ (backend provisioning, pre-demo)
                                           ▼
                              ┌──────────────────────────────────────────────┐
                              │  BACKEND (packages/backend/contracts/)        │
                              │                                              │
                              │  provision-buildbear-demo.sh  [MODIFIED]     │
                              │  ├── existing: full deploy + mint path       │
                              │  └── NEW --no-mint flag:                     │
                              │      → deploy core + pool + executor         │
                              │      → deposit-on-behalf (executor funded)   │
                              │      → SKIP resolveFromMandate call          │
                              │      → emit artifact with mintTxHash: null   │
                              │        (executor owns 0 legs = fresh gate)   │
                              │                                              │
                              │  ProvisionBuildBearDemo.s.sol  [MODIFIED]    │
                              │  └── new noMint() entrypoint (or flag in     │
                              │      run()) that stops before step (5)       │
                              │                                              │
                              │  script/out/buildbear-deployments.json       │
                              │  └── mirrored into frontend artifact-loader  │
                              └──────────────────────────────────────────────┘
```

---

## Component Boundaries

### New Components

| Component | Location | Runtime | Responsibility |
|-----------|----------|---------|----------------|
| `POST /api/cornerstone/buildbear-sign` | `packages/frontend/app/api/cornerstone/buildbear-sign/route.ts` | Node | Constructs a synthetic StrategistDecided view from the provisioned artifact without calling Somnia. Returns `{ ok, strategistView, serializedMandate }`. Holds the pre-funded signer key if server-side signing is chosen (see signer-location decision below). |
| `POST /api/cornerstone/buildbear-reset` | `packages/frontend/app/api/cornerstone/buildbear-reset/route.ts` | Node | Resets the fork to a fresh state when `numberOfLegs > 0` is detected. Tries `evm_snapshot`/`evm_revert` first; falls back to re-provisioning. |
| `handleBuildBearConfirm()` | `CornerstoneClientShell.tsx` | Browser | Owns the BuildBear-only live path. Called instead of the Somnia path when mode is BuildBear. Calls `buildbear-sign`, wires `runWorkflowLive`. |
| `--no-mint` variant of `provision-buildbear-demo.sh` | `packages/backend/contracts/script/provision-buildbear-demo.sh` | Shell/Forge | Runs the full deploy (core + pool + executor + deposit) but stops before `resolveFromMandate`. Produces artifact with `mintTxHash: null`, `numberOfLegs: 0`. |
| `noMint()` entrypoint or flag | `packages/backend/contracts/script/ProvisionBuildBearDemo.s.sol` | Solidity | Runs `_deployCore()` + pool deploy + `_deployExecutor()` + deposit-on-behalf, then stops. Does not call `exec.resolveFromMandate(...)`. |

### Modified Components

| Component | Location | Change |
|-----------|----------|--------|
| `CornerstoneClientShell.tsx` | `packages/frontend/components/defi/cornerstone/` | Add `handleBuildBearConfirm()`. Modify `handleLiveConfirm()` to branch on `resolvedMode` before calling agent1. Add reset-guard call in `runMountProbe()` when `legs > 0`. Un-void `writeContractAsync` (call it for real via `runWorkflowLive`). |
| `mode.ts` | `packages/frontend/lib/apps/abrigo/cornerstone/` | Add `'buildbear'` as a valid `CornerstoneMode` (or keep `'live'` and sub-branch internally — see mode decision below). |
| `workflow-engine.ts` | `packages/frontend/lib/apps/abrigo/cornerstone/` | `runWorkflowLive` is already fully built. No logic change needed. The only change is it gets called for real (not void'd) with a real `writeContract`. |
| `provision-buildbear-demo.sh` | `packages/backend/contracts/script/` | Add `--no-mint` flag (or `--mode=fresh-executor`) that skips the `resolveFromMandate` broadcast step. |
| `ProvisionBuildBearDemo.s.sol` | `packages/backend/contracts/script/` | Add `noMint()` function (mirrors `run()` but stops after deposit). |
| `buildbear-deployments.json` | `packages/frontend/lib/apps/abrigo/cornerstone/` | Re-mirrored from backend `script/out/` after `--no-mint` provisioning run. `mintTxHash` field will be `null` or absent; `artifact-loader.ts` field validation must not require `mintTxHash`. |
| `artifact-loader.ts` | `packages/frontend/lib/apps/abrigo/cornerstone/` | Remove `mintTxHash` from required fields list (it is absent in the `--no-mint` artifact). |

### Existing Unchanged Components

| Component | Status | Notes |
|-----------|--------|-------|
| `runWorkflowLive` in `workflow-engine.ts` | UNCHANGED | Already implements the full a→j sequence. Just needs to be called for real. |
| `createWorkflowStore` / `workflow-store.ts` | UNCHANGED | The `emit` → `reduce` → `RunState` pipeline already handles all live events. |
| `POST /api/cornerstone/rpc` | UNCHANGED | CORS proxy. Used for RPC reads that CORS-block from the browser. |
| `POST /api/abrigo/agent1` | UNCHANGED | Somnia operator path. Still returns 503 without keys. BuildBear path never calls it. |
| `artifact-loader.ts` (`deployment`, `isExpired`) | MODIFIED MINIMALLY | Only `mintTxHash` required-field removal. |
| `buildbear.ts` (`createBuildBearPublicClient`) | UNCHANGED | Already the correct factory for read clients. |
| `checkNumberOfLegs()` in `CornerstoneClientShell.tsx` | UNCHANGED (behavior extended) | Already reads `numberOfLegs(executor)`. Behavior extended: on `legs > 0`, trigger reset route instead of silently degrading to replay. |

---

## Signer Location Decision

The central v3.0 architectural question is: where does the pre-funded signer key live?

**Verdict: Server route (`/api/cornerstone/buildbear-sign`), NOT client-side.**

Rationale:
- BuildBear auto-fund (`hardhat_setBalance` / `buildbear_ERC20Faucet`) provides token balances, but the signing key that calls `resolveFromMandate` on the fork must exist somewhere. If the judge supplies no wallet, a server-held funded key is required.
- The pattern already exists in this codebase: `/api/abrigo/agent1` holds `SOMNIA_OPERATOR_PK` server-side. The BuildBear demo key follows the same pattern with `BUILDBEAR_DEMO_PK` in server env.
- The BuildBear fork is not mainnet — it holds no real value. The risk profile of a server-held key for a sandboxed demo fork is acceptable and mirrors how the provisioning script works (`BUILDBEAR_DEPLOYER_PK`).
- Alternative (client-side): inject a funded private key into the browser via `NEXT_PUBLIC_BUILDBEAR_DEMO_PK`. Rejected: any env var with `NEXT_PUBLIC_` is exposed in the JS bundle. Even for a valueless demo fork this is the wrong pattern to teach.
- Alternative (wagmi wallet): require judges to connect a wallet and fund it. Rejected: this is the friction the milestone explicitly removes ("zero-secret judge runbook").

**Implementation:** The `/api/cornerstone/buildbear-sign` route:
1. Reads `BUILDBEAR_DEMO_PK` from server env (validated by `lib/env.ts`).
2. Returns `{ ok: true, strategistView, serializedMandate }` — a synthetic StrategistDecided view constructed from the provisioned artifact (no Somnia call, no random generation; it mirrors the v2.0 replay snapshot data structure).
3. Does NOT sign the `resolveFromMandate` tx server-side. The signing happens client-side via wagmi's `writeContractAsync` using the Wagmi chain config for chainId 31337. The server route's `BUILDBEAR_DEMO_PK` is for the synthetic StrategistDecided view construction only, NOT for the Ethereum tx signing.

Wait — there is a subtlety: if judges have no wallet, wagmi `writeContractAsync` will fail (no connected account). Two viable options:

**Option A (recommended): Server-side tx signing in `/api/cornerstone/buildbear-sign`.**
The route uses `viem` `createWalletClient` + `privateKeyToAccount(BUILDBEAR_DEMO_PK)` to call `resolveFromMandate` directly against the fork RPC. It returns the tx hash. The client receives `{ ok, strategistView, serializedMandate, txHash }` and drives the `runWorkflowLive` replacement flow (or a simplified analog that starts from Step e — pending hash already known). This requires a modified `runWorkflowLive` call on the client that accepts a pre-signed hash and skips Steps c-d.

**Option B: Client wagmi signer, pre-funded wallet injected via WalletConnect/MetaMask, or a stub signer.**
The demo instructions tell judges to add the BuildBear fork to MetaMask with the demo funded account. This preserves the wagmi flow exactly but requires a setup step.

Option A produces the true one-click experience. Option B is simpler to implement (no route modification to `runWorkflowLive`) but adds friction. **Recommend Option A for the milestone goal; the `/api/cornerstone/buildbear-sign` route performs the full tx and returns the hash.**

---

## Somnia Decoupling Cut Point

The precise decoupling cut is in `handleLiveConfirm()` in `CornerstoneClientShell.tsx`, at the mode branch before the `fetch('/api/abrigo/agent1', ...)` call.

Current code (simplified):
```
handleLiveConfirm():
  → POST /api/abrigo/agent1       ← THE BLOCKING DEPENDENCY
  → if ok: set explorer links, switch chain, void writeContractAsync
  → if !ok: degrade to replay
```

After decoupling:
```
handleLiveConfirm():
  → if resolvedMode === 'buildbear':
      → handleBuildBearConfirm()   ← NEW BRANCH (never touches agent1)
  → else:   // 'somnia' branch (operator-only, unchanged)
      → POST /api/abrigo/agent1
      → (existing degradation logic)
```

`handleBuildBearConfirm()`:
```
  → POST /api/cornerstone/buildbear-sign
  → if ok:
      → call runWorkflowLive-variant (server tx path, or client wagmi path)
  → if !ok:
      → setResolvedMode('replay')   // same degradation contract
```

The mode decision (`'buildbear'` vs `'somnia'`) is made at mount time in `runMountProbe()`:
- If `?mode=live` and `legs === 0` and BuildBear RPC reachable → `resolvedMode = 'buildbear'`
- If `?mode=somnia` (new URL param or flag) → operator-only Somnia path
- Default remains `'replay'`

Alternatively, keep `CornerstoneMode = 'live' | 'replay' | 'mock'` and add an internal flag `liveBackend: 'buildbear' | 'somnia'`. Either is valid; adding `'buildbear'` to `CornerstoneMode` is more explicit and easier to grep.

---

## Workflow-Store Event Flow (Real Tx)

The `runWorkflowLive` function in `workflow-engine.ts` is already the correct producer. It emits store events via `opts.emit`. The store's `emit` function is `store.emit` from `createWorkflowStore()`.

For **Option A** (server-side signing), the client receives the tx hash from `/api/cornerstone/buildbear-sign` and drives an abbreviated live flow starting at Step e (hash already known). The cleanest implementation is a new `runWorkflowLiveFromHash` function or a modified `runWorkflowLive` that accepts `{ preSignedHash: string }` and skips Steps c-d.

Full end-to-end event sequence for Option A:

```
[User clicks Confirm]
  │
  ▼
handleBuildBearConfirm() in CornerstoneClientShell.tsx
  │
  ├─ POST /api/cornerstone/buildbear-sign
  │   ├─ server: viem walletClient(BUILDBEAR_DEMO_PK).writeContract(resolveFromMandate)
  │   ├─ server: waitForTransactionReceipt(hash)
  │   ├─ server: decode logs → strategistView, executorView, mintedView
  │   └─ returns: { ok:true, txHash, receipt, strategistView, executorDecidedView,
  │                  positionMintedView, serializedMandate }
  │
  ├─ store.emit({ kind:'StrategistDecided', ... })
  │    → RunState: idle → a1  → UI re-renders (HedgeDecisionCardV2)
  │
  ├─ store.emit({ kind:'ExecutorDecided', ... })
  │    → RunState: a1 → a2_decision  → UI re-renders
  │
  ├─ store.emit({ kind:'confirm' })
  │    → RunState: a2_decision → minting  → spinner visible
  │
  ├─ store.emit({ status:'pending', hash: txHash })
  │    → LiveTxStateRow shows tx hash link
  │
  ├─ store.emit({ kind:'PositionMinted', positionId, marginToken0, marginToken1 })
  │    → RunState: minting → done  → MintCard renders
  │
  └─ store.emit({ status:'confirmed', positionId, margins })
       → OnChainEvidencePanel populated

[UI result: real tx hash, real positionId, real margins from fork]
```

For **Option B** (client wagmi signer), `runWorkflowLive` is called as-is with the existing `writeContractAsync` from wagmi. The store event sequence is identical — the engine drives the same emissions.

**Key constraint from workflow-engine.ts comment (CRITICAL):**
`quoteMargin` is called strictly after a confirmed `PositionMinted` log is decoded. This is already enforced in `runWorkflowLive` Step i. Do not move this call earlier.

---

## Reset Guard Placement and Behavior

**Where:** `checkNumberOfLegs()` is already called in `runMountProbe()` in `CornerstoneClientShell.tsx`. The reset guard is triggered at this same point — on mount, before the user sees the Confirm button.

**Current behavior:** `legs > 0` → `setResolvedMode('replay')` (silently degrades).

**New behavior:** `legs > 0` → POST `/api/cornerstone/buildbear-reset` → await response → if ok, re-check legs → if legs === 0, stay `'buildbear'`; if still > 0, degrade to replay.

**Reset route implementation:**

```
POST /api/cornerstone/buildbear-reset
  Runtime: nodejs
  1. Read deployment.rpcUrl from artifact-loader
  2. Try: POST rpcUrl { method: "evm_snapshot" }
          → store snapshotId (in-memory, module-level, OK for demo)
          OR: POST rpcUrl { method: "evm_revert", params: [snapshotId] }
  3. If evm_snapshot/revert not supported by BuildBear:
     Re-run provision as a Forge script via child_process OR
     POST buildbear_ERC20Faucet + fresh executor deploy (deferred complexity)
  4. Return { ok: true } or { ok: false, reason }
```

**BuildBear snapshot support:** BuildBear sandboxes are Anvil-based forks. Anvil supports `evm_snapshot` and `evm_revert` — this is the standard Hardhat/Anvil state management API. Confidence: MEDIUM (BuildBear's sandbox re-chains the fork to chainId 31337 using Anvil under the hood; the provision script already uses `hardhat_setBalance` which is an Anvil/Hardhat cheat and it works per the script comments). The safer initial implementation is: attempt `evm_revert` to the post-deploy pre-mint snapshot, if the route has stored the snapshot ID.

**Snapshot timing:** The snapshot must be taken immediately AFTER the `--no-mint` provisioning run completes (executor is deployed and funded, zero legs). This is done once, out-of-band, by the person running the provisioning script — they store the snapshot ID in the `buildbear-deployments.json` artifact as a new optional field `snapshotId`. The reset route uses this ID.

**Revised `buildbear-deployments.json` contract:**
```json
{
  "chainId": 31337,
  "executor": "0x...",
  "pool": "0x...",
  "riskManagement": "0x...",
  "rpcUrl": "https://rpc.buildbear.io/...",
  "mintTxHash": null,
  "mintedStrike": null,
  "capturedAt": "2026-06-08T...",
  "snapshotId": "0x1",
  "source": "abrigo-somnia --no-mint provision"
}
```

The `artifact-loader.ts` must NOT require `mintTxHash` or `mintedStrike` (they are null in the `--no-mint` artifact). The `snapshotId` is optional (absent on older artifacts, ignored by non-reset code paths).

---

## Frontend/Backend Provisioning Contract

This is the handoff between the backend (`packages/backend`) and frontend (`packages/frontend`) that must be explicit and versioned.

### Artifact Contract (the only interface between the two packages)

The file `packages/backend/contracts/script/out/buildbear-deployments.json` is the source of truth. It is mirrored (copied) into `packages/frontend/lib/apps/abrigo/cornerstone/buildbear-deployments.json` manually (or via a CI step in `packages/frontend/package.json` scripts).

**For v3.0, the artifact produced by `--no-mint` provisioning:**

| Field | v2.0 (with mint) | v3.0 (--no-mint) | Required by frontend |
|-------|-----------------|-----------------|----------------------|
| `chainId` | 31337 | 31337 | YES |
| `executor` | 0x... | 0x... | YES |
| `pool` | 0x... | 0x... | YES |
| `riskManagement` | 0x... | 0x... | YES |
| `rpcUrl` | https://... | https://... | YES |
| `capturedAt` | ISO string | ISO string | YES (TTL check) |
| `mintTxHash` | 0x... (real tx) | null | NO (must be optional in artifact-loader) |
| `mintedStrike` | 360360 | null | NO (must be optional) |
| `factory` | 0x... | 0x... | NO (used for transparency) |
| `riskEngine` | 0x... | 0x... | NO |
| `snapshotId` (NEW) | absent | "0x1" | NO (optional; used by reset route) |

**Migration:** `artifact-loader.ts` `validateDeployment()` currently requires `mintTxHash`. This must be changed to only require `['chainId', 'executor', 'pool', 'rpcUrl', 'capturedAt']`. The existing test that asserts the other fields are present must be updated.

### Provisioning Runbook Contract

The provisioning person (operator) runs:
```bash
# Step 1: run --no-mint provision
cd packages/backend/contracts
bash script/provision-buildbear-demo.sh --no-mint

# Step 2: take a snapshot immediately after provisioning
# (the --no-mint runner should do this automatically and write snapshotId to artifact)
cast rpc evm_snapshot --rpc-url "$BUILDBEAR_RPC_URL"
# → outputs e.g. "0x1" — add as snapshotId to script/out/buildbear-deployments.json

# Step 3: mirror artifact to frontend
cp script/out/buildbear-deployments.json \
   ../../frontend/lib/apps/abrigo/cornerstone/buildbear-deployments.json

# Step 4: deploy BUILDBEAR_DEMO_PK to Vercel env (or .env.local)
# (same account that was funded during provisioning)
```

The `--no-mint` flag in `provision-buildbear-demo.sh` should auto-take the snapshot and write `snapshotId` to the artifact to remove the manual Step 2.

---

## Recommended Project Structure (new files only)

```
packages/
├── backend/
│   └── contracts/
│       └── script/
│           ├── provision-buildbear-demo.sh      MODIFIED (--no-mint flag)
│           └── ProvisionBuildBearDemo.s.sol     MODIFIED (noMint() entrypoint)
│
└── frontend/
    ├── app/api/cornerstone/
    │   ├── rpc/route.ts                         EXISTING (unchanged)
    │   ├── buildbear-sign/route.ts              NEW
    │   └── buildbear-reset/route.ts             NEW
    │
    ├── lib/apps/abrigo/cornerstone/
    │   ├── mode.ts                              MODIFIED (add 'buildbear')
    │   ├── artifact-loader.ts                  MODIFIED (mintTxHash optional)
    │   ├── buildbear-deployments.json          RE-MIRRORED (--no-mint artifact)
    │   └── workflow-engine.ts                  MODIFIED (runWorkflowLiveFromHash
    │                                            or upstream accepts pre-signed hash)
    │
    └── components/defi/cornerstone/
        └── CornerstoneClientShell.tsx          MODIFIED (decoupling cut,
                                                handleBuildBearConfirm,
                                                reset-guard trigger,
                                                un-void writeContractAsync)
```

---

## Data Flow

### Real-Tx Flow: Confirm → Sign → Receipt → UI

```
[Judge clicks Confirm — resolvedMode === 'buildbear']
    ↓
CornerstoneClientShell.handleBuildBearConfirm()
    ↓
POST /api/cornerstone/buildbear-sign   (Node runtime, server-side)
    ├── viem createWalletClient({ account: privateKeyToAccount(BUILDBEAR_DEMO_PK) })
    ├── walletClient.writeContract({
    │     address: deployment.executor,
    │     abi: macroHedgeExecutorAbi,
    │     functionName: 'resolveFromMandate',
    │     args: [buildLiveMandate(presetMandate, 31337), 0n, 1_000_000n]
    │   })
    │   → txHash: 0x...
    ├── publicClient.waitForTransactionReceipt({ hash: txHash })
    │   → receipt: { status: 'success', logs: [...] }
    ├── decode receipt.logs via fromChainEvent()
    │   → strategistDecidedView, executorDecidedView, positionMintedView
    ├── publicClient.readContract({ functionName: 'quoteMargin', args: [positionId, strike] })
    │   → rawDelta → decodeBalanceDelta → { amount0, amount1 }
    └── return {
          ok: true,
          txHash,
          strategistView,
          executorDecidedView,
          positionMintedView,
          margins: { token0: amount0, token1: amount1 },
          serializedMandate
        }
    ↓
Client receives response
    ↓
store.emit(strategistView)           → RunState: idle → a1
    ↓ (600ms artificial delay — OPTIONAL for UX pacing, or omit)
store.emit(executorDecidedView)      → RunState: a1 → a2_decision
    ↓ (no user confirm gate in BuildBear path — already confirmed)
store.emit({ kind: 'confirm' })      → RunState: a2_decision → minting
store.emit({ status:'pending', hash: txHash })   → LiveTxStateRow renders hash
    ↓ (receipt already in hand from server response)
store.emit(positionMintedView)       → RunState: minting → done
store.emit({ status:'confirmed', positionId, margins })
    ↓
useSyncExternalStore triggers React re-render
    ↓
MintCard renders: positionId, marginToken0, marginToken1
OnChainEvidencePanel renders: txHash (real), positionId (real)
ModeBanner shows 'buildbear' explorer link
```

### Reset-Guard Flow: Mount → Check → Reset → Stay Live

```
[CornerstoneClientShell mounts — resolvedMode === 'buildbear']
    ↓
runMountProbe()
    ├── Gate 1: isExpired(Date.now()) → if expired, degrade to 'replay'
    ├── Gate 2: probeEthChainId(deployment.rpcUrl) → if null, degrade to 'replay'
    └── Gate 3: checkNumberOfLegs(deployment.pool, deployment.executor)
        ├── legs === null → degrade to 'replay'
        ├── legs === 0   → PASS — stay 'buildbear' (executor is fresh)
        └── legs > 0     → executor is used (prior run)
            ↓
            POST /api/cornerstone/buildbear-reset
                ├── evm_revert(snapshotId from deployment artifact)
                └── return { ok: true }
            ↓
            re-check numberOfLegs()
            ├── legs === 0 → PASS — stay 'buildbear'
            └── still > 0 → degrade to 'replay' (reset failed)
```

---

## Architectural Patterns

### Pattern 1: Mode-Branched Confirm Handler

**What:** `handleLiveConfirm()` branches on `resolvedMode` before touching any external service. The BuildBear branch and the Somnia branch are completely independent execution paths.

**When to use:** Whenever two live paths have different external dependencies — never let the BuildBear path call an endpoint that can 503 due to Somnia outage, not even as a fallback.

**Trade-offs:** Slight duplication of confirm-gating logic. The alternative (wrapping agent1 in a try/catch and falling through to BuildBear) would create silent coupling — a Somnia call that happens on every judge run. The branch makes the decoupling explicit and verifiable by grep.

### Pattern 2: Server-Side Pre-Funded Signing (demo fork only)

**What:** A Node runtime API route holds a funded private key for a valueless demo fork, signs the `resolveFromMandate` tx server-side, and returns the result to the client.

**When to use:** Demo environments only, where wallet friction must be zero and the signer controls no real assets.

**Trade-offs:** The `BUILDBEAR_DEMO_PK` must be in the Vercel env (the same pattern as `SOMNIA_OPERATOR_PK`). The route must have rate limiting (token-bucket, same pattern as agent1 route) to prevent fork state drain from concurrent calls. The private key controls a BuildBear sandbox only — it is worthless outside that context.

### Pattern 3: Artifact-Driven Reset (snapshotId in deployment artifact)

**What:** The provisioning script captures the post-deploy fork state with `evm_snapshot` and stores the snapshot ID in the deployment artifact. The reset route reads this ID and calls `evm_revert(snapshotId)` to restore the fork to a pristine state without re-running the full provision.

**When to use:** Any shared-fork demo where multiple concurrent runs must not observe each other's state.

**Trade-offs:** Snapshot IDs are ephemeral per sandbox session — they survive restarts only if the BuildBear sandbox persists its state (sandbox-dependent). If the sandbox is recreated, the snapshot ID in the artifact is stale and reset falls back to re-provisioning. This is acceptable for the 3-day TTL demo window.

---

## Anti-Patterns

### Anti-Pattern 1: Calling agent1 as a Fallback in the BuildBear Path

**What people do:** Add `try { POST /api/abrigo/agent1 } catch { fall through to BuildBear }`.

**Why it's wrong:** The Somnia validator-callback outage is the exact reason v2.0 deferred the live run. Making the BuildBear path depend on agent1 — even via catch — means every judge run silently waits for a 120s timeout before the BuildBear mint starts. The "one-click" UX is destroyed.

**Do this instead:** Hard branch at `resolvedMode`. The BuildBear path never imports, references, or calls anything from the agent1 route.

### Anti-Pattern 2: NEXT_PUBLIC_ for the Demo Private Key

**What people do:** Set `NEXT_PUBLIC_BUILDBEAR_DEMO_PK` to inject the funded key into the browser, avoiding the need for a server route.

**Why it's wrong:** Any `NEXT_PUBLIC_` env var is bundled into the client-side JS and readable by anyone with DevTools. Even for a valueless demo fork, shipping a private key in the public bundle is the wrong pattern to institutionalize. If this code is referenced in a future milestone for a mainnet-adjacent path, the pattern becomes dangerous.

**Do this instead:** `BUILDBEAR_DEMO_PK` in a Node runtime server route only. Never `NEXT_PUBLIC_`.

### Anti-Pattern 3: Minting in the Provisioning Script (using the standard `run()`)

**What people do:** Run the existing `provision-buildbear-demo.sh` (which calls `resolveFromMandate` in step 5) and use that as the v3.0 demo artifact.

**Why it's wrong:** The resulting artifact has `numberOfLegs > 0`. The mount-time freshness gate sees `legs > 0` and degrades to replay, blocking the live path immediately. The in-demo mint cannot happen against an executor that already holds a leg.

**Do this instead:** The `--no-mint` variant stops before `resolveFromMandate`. The executor is deployed and funded but clean. The in-demo call to `resolveFromMandate` (via `/api/cornerstone/buildbear-sign`) is the first and only mint.

### Anti-Pattern 4: quoteMargin Before PositionMinted

**What people do:** Read `quoteMargin` immediately after `writeContract` resolves, before waiting for the `PositionMinted` log.

**Why it's wrong:** `MacroHedgeExecutor.quoteMargin` reverts with `PositionNotOwned` if the position does not yet exist. `waitForTransactionReceipt` resolves when the tx is mined, but log decoding must confirm `PositionMinted` before `quoteMargin` is safe. This constraint is already documented in `workflow-engine.ts` comments and enforced in `runWorkflowLive` Step i.

**Do this instead:** Decode `receipt.logs` first; only call `quoteMargin(positionId, strike)` after `positionIdStr !== null` is confirmed.

---

## Build Order

Dependencies drive the order. The backend provisioning work must produce the artifact before the frontend live wiring can be tested end-to-end. However, the two can be developed in parallel up to integration.

```
Dependency graph:

[A] Backend: --no-mint provisioning variant (ProvisionBuildBearDemo.s.sol + shell)
    │
    └──[B] Run --no-mint against real BuildBear sandbox → artifact with snapshotId
           │
           └──[C] Mirror artifact into frontend (mintTxHash: null, snapshotId: "0x1")
                  │
                  └──[D] Frontend integration test: reset route + buildbear-sign route
                         │
                         └──[E] CornerstoneClientShell decoupling + un-void writeContractAsync

[F] mode.ts: add 'buildbear' (no dependency, can do anytime)
[G] artifact-loader.ts: make mintTxHash optional (unblock C)
[H] /api/cornerstone/buildbear-sign route (can develop with mock artifact)
[I] /api/cornerstone/buildbear-reset route (can develop with mock snapshot)
```

| Step | Component | Blocks | Parallel With |
|------|-----------|--------|---------------|
| 1 | `ProvisionBuildBearDemo.s.sol` `noMint()` | Step 2 | Step 5, 6, 7 |
| 2 | `provision-buildbear-demo.sh --no-mint` + snapshot capture | Step 3 | Steps 5-7 |
| 3 | Mirror artifact; update `artifact-loader.ts` (optional fields) | Step 4, 8 | Steps 5-7 |
| 4 | Validate artifact shape in frontend type-check | Step 8 | — |
| 5 | `mode.ts` add `'buildbear'` | Steps 7, 8 | Steps 1-4 |
| 6 | `/api/cornerstone/buildbear-reset` route | Step 8 | Steps 1-5 |
| 7 | `/api/cornerstone/buildbear-sign` route | Step 8 | Steps 1-5 |
| 8 | `CornerstoneClientShell.tsx` decoupling cut + `handleBuildBearConfirm` | — | — |

**Recommended execution order:**
- Batch 1 (parallel): Steps 1, 5
- Batch 2 (parallel): Steps 2, 6, 7
- Batch 3: Step 3
- Batch 4: Step 4 (automated by tsc + vitest)
- Batch 5: Step 8 (final integration)

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| BuildBear Sandbox RPC | `fetch(deployment.rpcUrl, { method:'POST', body: JSON-RPC })` | CORS-proxied via `/api/cornerstone/rpc` if browser blocks direct; server routes call directly |
| BuildBear `evm_snapshot` / `evm_revert` | JSON-RPC call to sandbox RPC (same endpoint) | Anvil-compatible; BuildBear uses `hardhat_setBalance` (confirmed in provision script) — same cheat namespace |
| BuildBear `buildbear_ERC20Faucet` | JSON-RPC call (provisioning only, not runtime) | Used in `provision-buildbear-demo.sh`; not called from Next.js routes |

### Internal Boundaries

| Boundary | Communication | Direction | Notes |
|----------|---------------|-----------|-------|
| `CornerstoneClientShell` ↔ `/api/cornerstone/buildbear-sign` | HTTP POST | client → server | Returns full tx result (Option A) or synthetic strategistView (Option B) |
| `CornerstoneClientShell` ↔ `/api/cornerstone/buildbear-reset` | HTTP POST | client → server | Called on mount when legs > 0; returns ok/fail |
| `workflow-store` ↔ `CornerstoneClientShell` | `store.emit()` / `useSyncExternalStore` | bidirectional | Store is producer-consumer decoupled; emit is synchronous |
| `artifact-loader` ↔ server routes | Static import | server routes → artifact | `deployment.rpcUrl`, `deployment.executor`, `deployment.snapshotId` |
| `packages/backend/script/out/` ↔ `packages/frontend/lib/.../` | File copy (manual or CI) | backend → frontend | The single cross-package interface; no runtime dependency |

---

## Scalability Considerations

This is a demo architecture, not a production scale concern. The relevant scale question is concurrent judge runs.

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 1 judge (intended) | Current architecture. One shared fork, one snapshot, serial mint. |
| 2-5 concurrent judges | `evm_revert` is destructive (resets the entire fork state). Concurrent resets collide. Rate-limit `/api/cornerstone/buildbear-sign` to 1 in-flight at a time (mutex pattern, same as agent1 rate-limit). Queue resets. |
| >5 concurrent | Per-judge provisioning (separate BuildBear sandboxes per session). Out of scope for v3.0; the milestone doc explicitly chooses shared-fork with reset guard. |

---

## Sources

All findings derived from direct code inspection of the codebase. No external research queries required — all architectural decisions are constrained by the existing code contracts.

- `packages/frontend/lib/apps/abrigo/cornerstone/workflow-engine.ts` — `runWorkflowLive` interface, `buildLiveMandate`, PKE pin
- `packages/frontend/components/defi/cornerstone/CornerstoneClientShell.tsx` — mode resolution, mount probe, `handleLiveConfirm` structure
- `packages/frontend/app/api/abrigo/agent1/route.ts` — operator-only pattern (rate limit, env guard, Node runtime)
- `packages/frontend/lib/apps/abrigo/cornerstone/artifact-loader.ts` — artifact field requirements, TTL contract
- `packages/frontend/lib/apps/abrigo/cornerstone/workflow-store.ts` — `RunState` shape, `emit` contract
- `packages/frontend/lib/apps/abrigo/cornerstone/buildbear.ts` — `createBuildBearPublicClient` factory
- `packages/frontend/lib/apps/abrigo/cornerstone/mode.ts` — `CornerstoneMode` type
- `packages/frontend/app/api/cornerstone/rpc/route.ts` — CORS proxy pattern
- `packages/backend/contracts/script/provision-buildbear-demo.sh` — B1/B2 provisioning sequence, `--no-mint` gap
- `packages/backend/contracts/script/ProvisionBuildBearDemo.s.sol` — `_provision()` body, `noMint()` gap, artifact field origins
- `.planning/PROJECT.md` — v3.0 milestone scope, key decisions

---

*Architecture research for: v3.0 BuildBear Live-Tx Integration (d2p Finance / Abrigo cornerstone)*
*Researched: 2026-06-08*
