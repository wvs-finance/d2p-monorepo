# Phase 11: Frontend Server Routes — Research

**Researched:** 2026-06-09
**Domain:** Next.js App-Router server routes, viem server-side signing, evm_snapshot/evm_revert JSON-RPC, CornerstoneMode extension, Somnia decoupling
**Confidence:** HIGH (all findings grounded in file:line source inspection of the actual codebase; viem error API verified against installed node_modules)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **`buildbear-reset` is OPEN to anyone** — no operator secret. Accepted limitation: shared sandbox is griefable on a concurrent-judge session; isolation comes from OPS-07 per-judge local `pnpm demo`. Planner MUST surface this as an explicit documented limitation, NOT hide it.
- **`'buildbear'` mode trigger requires BOTH**: (a) `?mode=buildbear` URL param (extend `parseMode`), AND (b) `DEMO_SIGNER_PK` present server-side. Without the key the route returns `not-configured` and cornerstone stays replay. No accidental live mode.
- **`buildbear-sign` discriminated reason codes** (never throws bare):
  - Success: `{ ok: true, txHash, strategistView, executorView, positionMinted, margins, blockNumber }`
  - Failure: `{ ok: false, reason: 'fork-used' | 'rpc-unreachable' | 'signer-gas' | 'reverted' | 'not-configured', detail? }`
  - `"fork used"` revert (EXEC-01) → `reason: 'fork-used'`
- **Server-only `DEMO_SIGNER_PK`**, `runtime='nodejs'`, path-scoped key-leak grep (privateKeyToAccount legitimately exists in `app/api/abrigo/agent1`).
- **Somnia decoupling FIRST**: `handleLiveConfirm` hard-branches on `resolvedMode === 'buildbear'` BEFORE any `/api/abrigo/agent1` reference; remove the silent replay flips on the buildbear path.
- **MINT-03 mandate source = recorded replay artifact** (not the live Somnia Agent-1 response); `buildLiveMandate` re-hydration stays.

### Claude's Discretion

- Exact viem signing wiring (follow Phase 10 `spike-viem-sign.ts`)
- `buildbear-reset` JSON-RPC call shapes and how the new snapshot id is returned
- Unit-test mocking strategy

### Deferred Ideas (OUT OF SCOPE)

- Operator-only reset (shared-secret header) — considered and REJECTED for v3.0
- Explicit in-UI "run live" toggle — Phase 12
- KV-backed snapshot-id persistence / auto-reset — RESET-01 (Future)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| MINT-01 | Server-only `/api/cornerstone/buildbear-sign` route signs and broadcasts `resolveFromMandate` using `DEMO_SIGNER_PK`; key never `NEXT_PUBLIC_`, never sent to client, never committed | Route skeleton in §Route Skeletons; env schema extension in §Standard Stack; key-leak grep in §Validation Architecture |
| MINT-02 | Judge live path never calls `/api/abrigo/agent1` — decoupling cut in `handleLiveConfirm` before that fetch | Exact edit site at `CornerstoneClientShell.tsx:189-239`; decoupling pattern in §Decoupling Cut |
| MINT-03 | `runWorkflowLive` sources mandate from recorded replay artifact, not live Somnia Agent-1 response | `upstream` injection point in `workflow-engine.ts:201`; mandate sourcing pattern in §MINT-03 Mandate Source |
</phase_requirements>

---

## Summary

Phase 11 has four deliverables, all unit-testable against mocked artifacts with no live BuildBear fork: (1) `app/api/cornerstone/buildbear-sign/route.ts` — a `nodejs`-runtime POST handler that reads `DEMO_SIGNER_PK` from `process.env`, calls `simulateContract` + `writeContract` against the artifact's RPC, and returns discriminated `{ok,reason}` responses; (2) `app/api/cornerstone/buildbear-reset/route.ts` — a keyless POST handler that calls `evm_revert(snapshotId)` + immediate `evm_snapshot` and returns the new snapshot id; (3) `lib/apps/abrigo/cornerstone/mode.ts` extended to accept `'buildbear'` in `parseMode`; (4) the Somnia decoupling cut in `handleLiveConfirm` that hard-branches on `resolvedMode === 'buildbear'` BEFORE any `/api/abrigo/agent1` reference.

The `buildbear-sign` route is a near-copy of `app/api/abrigo/agent1/route.ts` with three differences: it uses `deployment.rpcUrl` + `createBuildBearChain` instead of `somniaTestnet`; it reads `DEMO_SIGNER_PK` (not `SOMNIA_OPERATOR_PK`); and it calls `simulateContract` first (to pre-classify reverts into reason codes) before `writeContract`. The reason-code decision tree is mechanically derivable from viem's error class hierarchy (`ContractFunctionRevertedError.reason`, `InsufficientFundsError`, `HttpRequestError`). The `buildbear-reset` route calls the artifact `rpcUrl` directly via `fetch` — it does NOT need to go through the CORS proxy because it runs server-side.

The Somnia decoupling cut is a targeted surgical edit to `CornerstoneClientShell.tsx:handleLiveConfirm`: add an early-return branch `if (resolvedMode === 'buildbear')` that calls the new `buildbear-sign` route and returns, BEFORE the existing `fetch('/api/abrigo/agent1', ...)` line. The three `setResolvedMode('replay')` flips inside `handleLiveConfirm` are kept for the non-buildbear live path; the buildbear branch must NOT contain any `setResolvedMode('replay')` calls (Phase 12 wires the `fork-used` advisory state instead).

**Primary recommendation:** Implement in this order — (1) `mode.ts` extension (trivial, no deps), (2) `buildbear-sign` route (core deliverable), (3) `buildbear-reset` route (straightforward), (4) decoupling cut in `CornerstoneClientShell`, (5) MINT-03 `upstream` swap in `workflow-engine.ts`. Write vitest tests for each step as you go.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `viem` | 2.48.11 (already installed) | `privateKeyToAccount`, `createWalletClient`, `simulateContract`, `writeContract`, `createPublicClient` | Already used in `spike-viem-sign.ts` and `app/api/abrigo/agent1/route.ts`; no new dep |
| `viem/accounts` | same | `privateKeyToAccount(pk as \`0x${string}\`)` | Same pattern as agent1 route line 117 |
| `next/server` | Next.js 16.2.6 | `NextResponse` (or native `Response`) for JSON responses | Both patterns present in codebase; rpc route uses `NextResponse`, agent1 uses `Response` — either works |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@t3-oss/env-nextjs` (`env` from `@/lib/env`) | existing | Server env access for `DEMO_SIGNER_PK` | Add `DEMO_SIGNER_PK` to `lib/env.ts` server schema as `z.string().min(1).optional()` |
| `@/lib/apps/abrigo/cornerstone/artifact-loader` | existing | `deployment.rpcUrl`, `deployment.executor`, `deployment.snapshotId` | Import `deployment` for all address/URL reads |
| `@/lib/apps/abrigo/cornerstone/buildbear` | existing | `createBuildBearChain(rpcUrl)` | Build the viem chain definition for the wallet client |

### Env Schema Extension (REQUIRED — lib/env.ts)

Add to the `server` block in `lib/env.ts`:
```typescript
// Phase 11: Demo signer key for BuildBear live path.
// NEVER NEXT_PUBLIC_ — server only. Route returns 'not-configured' when absent.
DEMO_SIGNER_PK: z.string().min(1).optional(),
```
Add to `runtimeEnv`:
```typescript
DEMO_SIGNER_PK: process.env.DEMO_SIGNER_PK,
```

**Installation:** No new packages. All dependencies already in `package.json`.

**Version verification:** viem 2.48.11 confirmed via `packages/frontend/package.json` (from STATE.md stack listing).

---

## Architecture Patterns

### New Files

```
packages/frontend/
├── app/api/cornerstone/
│   ├── rpc/route.ts                     (EXISTING — CORS proxy, do not modify)
│   ├── buildbear-sign/route.ts          NEW — server signing route (MINT-01)
│   └── buildbear-reset/route.ts         NEW — snapshot revert+re-snapshot route
├── lib/apps/abrigo/cornerstone/
│   └── mode.ts                          MODIFY — add 'buildbear' to union + parseMode
├── lib/env.ts                           MODIFY — add DEMO_SIGNER_PK to server schema
└── components/defi/cornerstone/
    └── CornerstoneClientShell.tsx       MODIFY — decoupling cut + buildbear branch
```

### Modified Files

```
packages/frontend/
├── lib/apps/abrigo/cornerstone/
│   └── workflow-engine.ts               MODIFY — MINT-03 upstream source swap
└── tests/api/
    ├── buildbear-sign.test.ts           NEW — vitest, // @vitest-environment node
    └── buildbear-reset.test.ts         NEW — vitest, // @vitest-environment node
```

---

## Route Skeletons

### Pattern 1: `buildbear-sign/route.ts` skeleton

**Source:** Mirror of `app/api/abrigo/agent1/route.ts` with BuildBear-specific adaptations.

```typescript
// app/api/cornerstone/buildbear-sign/route.ts
export const runtime = 'nodejs'

import { deployment } from '@/lib/apps/abrigo/cornerstone/artifact-loader'
import { createBuildBearChain } from '@/lib/apps/abrigo/cornerstone/buildbear'
import { env } from '@/lib/env'
// NOTE: copy this import block VERBATIM, then run `biome check --fix` to sort.
// The 3 viem error TYPES (ContractFunctionRevertedError / HttpRequestError /
// InsufficientFundsError) are intentionally NOT imported — classifyViemError keys
// off `constructor.name` / `instanceof`, so importing the types is dead code that
// biome would flag.
import { http, createPublicClient, createWalletClient } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

// Pinned ABI (from spike-viem-sign.ts — VERIFIED against HedgeMandate.sol)
const resolveFromMandateAbi = [
  {
    type: 'function',
    name: 'resolveFromMandate',
    stateMutability: 'nonpayable',
    inputs: [
      {
        name: 'mandate',
        type: 'tuple',
        components: [
          { name: 'economicTheory', type: 'address' },
          { name: 'underlyingMarket', type: 'bytes32' },
          { name: 'targetNotional', type: 'uint256' },
          { name: 'chainId', type: 'uint32' },
          { name: 'isLong', type: 'bool' },
        ],
      },
      { name: 'legIndex', type: 'uint256' },
      { name: 'quoteMargin', type: 'uint128' },
    ],
    outputs: [{ name: 'positionId', type: 'uint256' }],
  },
] as const

export type BuildBearSignResponse =
  | {
      ok: true
      txHash: `0x${string}`
      blockNumber: number
      // Phase 12 will decode these from logs; Phase 11 returns them as null stubs
      strategistView: null
      executorView: null
      positionMinted: null
      margins: null
    }
  | {
      ok: false
      reason: 'fork-used' | 'rpc-unreachable' | 'signer-gas' | 'reverted' | 'not-configured'
      detail?: string
    }

// SECURITY: viem BaseError / HttpRequestError messages embed the full request URL,
// and a BuildBear RPC URL `https://rpc.buildbear.io/<sandbox-secret-id>` is effectively
// a bearer credential for the fork. EVERY `detail:` value MUST be passed through redact().
function redact(s: string): string {
  return s.replace(/https?:\/\/[^\s"')]+/g, '[rpc-redacted]')
}

// OPS-05 limitation: no rate limit; shared-sandbox signer is griefable/drainable
// — re-provision per OPS-03/04 (runbook, Phase 13). Unlike /api/abrigo/agent1 this
// buildbear-sign route is intentionally OPEN with NO rate limit (accepted v3.0 trade-off,
// CONTEXT.md). Do NOT add auth — documented-limitation only.
export async function POST(req: Request): Promise<Response> {
  // Guard: key absent → not-configured (zero-secret default on plain clone)
  if (!env.DEMO_SIGNER_PK) {
    return Response.json(
      { ok: false, reason: 'not-configured' } satisfies BuildBearSignResponse,
      { status: 503 },
    )
  }

  // M2: body-size cap BEFORE req.json() — reject oversized payloads (16 KiB).
  const contentLength = Number(req.headers.get('content-length') ?? '0')
  if (contentLength > 16384) {
    return Response.json(
      { ok: false, reason: 'reverted', detail: 'body too large' } satisfies BuildBearSignResponse,
      { status: 413 },
    )
  }

  // Body: mandate sourced from recorded replay artifact (MINT-03)
  // Phase 11 route accepts the serialized mandate in the POST body;
  // the client (Phase 12) sends the artifact mandate, NOT a live agent1 response.
  // M2: on parse failure / missing mandate, return a GENERIC detail — never echo the
  // raw parse error (it can carry attacker-controlled content; redact() covers URLs).
  let body: { mandate: unknown } = { mandate: null }
  try {
    body = await req.json()
  } catch {
    return Response.json(
      { ok: false, reason: 'reverted', detail: 'invalid request body' } satisfies BuildBearSignResponse,
      { status: 400 },
    )
  }

  try {
    const account = privateKeyToAccount(env.DEMO_SIGNER_PK as `0x${string}`)
    const chain = createBuildBearChain(deployment.rpcUrl)
    const walletClient = createWalletClient({
      account,
      chain,
      transport: http(deployment.rpcUrl),
    })
    const publicClient = createPublicClient({
      chain,
      transport: http(deployment.rpcUrl),
    })

    // Signer-balance pre-flight (OPS-05)
    const balance = await publicClient.getBalance({ address: account.address })
    if (balance === 0n) {
      return Response.json(
        { ok: false, reason: 'signer-gas', detail: 'signer balance is 0' } satisfies BuildBearSignResponse,
      )
    }

    // Build mandate — buildLiveMandate re-hydration stays (MINT-03)
    // mandate comes from the recorded replay artifact (body.mandate), not agent1

    // simulateContract first — pre-classifies reverts into reason codes
    // before spending gas on a write that will revert
    await publicClient.simulateContract({
      account,
      address: deployment.executor as `0x${string}`,
      abi: resolveFromMandateAbi,
      functionName: 'resolveFromMandate',
      args: [body.mandate as never, 0n, 1_000_000n],
    })

    // writeContract — only reached if simulate passes
    const txHash = await walletClient.writeContract({
      address: deployment.executor as `0x${string}`,
      abi: resolveFromMandateAbi,
      functionName: 'resolveFromMandate',
      args: [body.mandate as never, 0n, 1_000_000n],
    })

    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })
    if (receipt.status === 'reverted') {
      return Response.json({ ok: false, reason: 'reverted', detail: `receipt reverted: ${txHash}` })
    }

    return Response.json({
      ok: true,
      txHash,
      blockNumber: Number(receipt.blockNumber),
      strategistView: null,
      executorView: null,
      positionMinted: null,
      margins: null,
    } satisfies BuildBearSignResponse)
  } catch (err: unknown) {
    return Response.json(classifyViemError(err))
  }
}
```

### Pattern 2: Viem error → reason code classification

```typescript
// Source: viem/errors/contract.ts (ContractFunctionRevertedError.reason)
//         viem/errors/node.ts (InsufficientFundsError, ExecutionRevertedError)
//         viem/errors/request.ts (HttpRequestError)

// M1 (Security): viem HttpRequestError/BaseError messages embed the full request URL.
// A BuildBear RPC URL `https://rpc.buildbear.io/<secret-id>` is a bearer credential
// for the fork, so EVERY `detail:` value below is passed through redact() (defined in
// the route file) which strips any `https?://...` URL → '[rpc-redacted]'.
// The classifier keys on `constructor.name` / `instanceof` — NOT on imported viem error
// types — so no viem error TYPE imports are needed (see the import-block note above).
function classifyViemError(err: unknown): BuildBearSignResponse {
  if (err instanceof Error) {
    // Check the full cause chain for ContractFunctionRevertedError
    // viem wraps: ContractFunctionExecutionError → cause → ContractFunctionRevertedError
    const revertErr = findInCauseChain(err, (e) => e.constructor.name === 'ContractFunctionRevertedError')
    if (revertErr) {
      // revertErr.reason is the decoded revert string (e.g. "fork used")
      const reason = (revertErr as { reason?: string }).reason ?? ''
      if (reason.includes('fork used')) {
        return { ok: false, reason: 'fork-used', detail: redact(reason) }
      }
      return { ok: false, reason: 'reverted', detail: redact(reason) }
    }

    // Insufficient funds (signer has no gas)
    if (
      err.constructor.name === 'InsufficientFundsError' ||
      findInCauseChain(err, (e) => e.constructor.name === 'InsufficientFundsError')
    ) {
      return { ok: false, reason: 'signer-gas', detail: redact(err.message) }
    }

    // HttpRequestError = network/RPC unreachable
    if (
      err.constructor.name === 'HttpRequestError' ||
      findInCauseChain(err, (e) => e.constructor.name === 'HttpRequestError')
    ) {
      return { ok: false, reason: 'rpc-unreachable', detail: redact(err.message) }
    }

    // Generic revert (unknown reason)
    if (err.message.includes('revert') || err.message.includes('reverted')) {
      return { ok: false, reason: 'reverted', detail: redact(err.message) }
    }
  }
  return { ok: false, reason: 'reverted', detail: redact(String(err)) }
}

function findInCauseChain(err: unknown, pred: (e: Error) => boolean): Error | null {
  let current: unknown = err
  while (current instanceof Error) {
    if (pred(current)) return current
    current = (current as { cause?: unknown }).cause
  }
  return null
}
```

**Key insight on viem error wrapping (HIGH confidence — verified in node_modules):**
- `simulateContract` throws `ContractFunctionExecutionError` whose `.cause` is a `ContractFunctionRevertedError`
- `ContractFunctionRevertedError.reason` is the decoded `string` revert argument (e.g., `"fork used"` from EXEC-01)
- `ContractFunctionRevertedError.reason` is populated from ABI-decoded `Error(string)` selector via `decodeErrorResult`
- `InsufficientFundsError` is in `viem/errors/node.ts`; its static `nodeMessage` regex is `/insufficient funds|exceeds transaction sender account balance/`
- `HttpRequestError` is in `viem/errors/request.ts`; thrown when the HTTP call to the RPC URL fails (CORS / network / timeout)

### Pattern 3: `buildbear-reset/route.ts` skeleton

```typescript
// app/api/cornerstone/buildbear-reset/route.ts
//
// OPEN ROUTE — no auth. Documented limitation: shared-sandbox griefable.
// Any caller can reset the fork to its clean snapshot before their run.
// Isolation comes from OPS-07 per-judge local pnpm demo sandbox.
//
// One-use snapshot semantics: evm_revert CONSUMES the snapshot id.
// This route MUST call evm_snapshot immediately after evm_revert to
// produce a new snapshot id. The new id is returned in the response
// for the caller to update the artifact (Phase 12 / operator runbook).
//
// GOVERNANCE: runtime = 'nodejs' (consistent with other cornerstone routes).
// Calls deployment.rpcUrl DIRECTLY (server-side, no CORS concern).

export const runtime = 'nodejs'

import { deployment } from '@/lib/apps/abrigo/cornerstone/artifact-loader'

// M1 (Security): deployment.rpcUrl is `https://rpc.buildbear.io/<sandbox-secret-id>`,
// effectively a bearer credential for the fork. A thrown fetch/undici error embeds the
// full URL in its message — strip any URL from EVERY `detail:` value before returning.
function redact(s: string): string {
  return s.replace(/https?:\/\/[^\s"')]+/g, '[rpc-redacted]')
}

async function jsonRpc(rpcUrl: string, method: string, params: unknown[] = []): Promise<unknown> {
  const res = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  })
  if (!res.ok) throw new Error(`RPC HTTP ${res.status}`)
  const json = (await res.json()) as { result?: unknown; error?: { message: string } }
  if (json.error) throw new Error(`RPC error: ${json.error.message}`)
  return json.result
}

export async function POST(_req: Request): Promise<Response> {
  const snapshotId = deployment.snapshotId
  if (!snapshotId) {
    return Response.json(
      {
        ok: false,
        reason: 'no-snapshot',
        detail: 'artifact has no snapshotId — re-provision with --no-mint',
      },
      { status: 409 },
    )
  }

  try {
    // Step 1: evm_revert(snapshotId) — consumes the snapshot
    const reverted = await jsonRpc(deployment.rpcUrl, 'evm_revert', [snapshotId])
    // revert-failed is reserved for a genuine non-true evm_revert result (NOT a thrown
    // network error — those are rpc-unreachable, classified in the catch below).
    if (reverted !== true) {
      return Response.json({
        ok: false,
        reason: 'revert-failed',
        detail: redact(`evm_revert returned ${JSON.stringify(reverted)}`),
      })
    }

    // Step 2: evm_snapshot — produces a NEW snapshot id
    const newSnapshotId = await jsonRpc(deployment.rpcUrl, 'evm_snapshot', [])

    // m6: validate the new id is a 0x… hex string before returning.
    if (typeof newSnapshotId !== 'string' || !newSnapshotId.startsWith('0x')) {
      return Response.json({
        ok: false,
        reason: 'revert-failed',
        detail: redact(`evm_snapshot returned ${JSON.stringify(newSnapshotId)}`),
      })
    }

    return Response.json({
      ok: true,
      newSnapshotId,
      // Caller (operator runbook / Phase 12) must update the artifact snapshotId
      // to newSnapshotId. No KV persistence in v3.0 (RESET-01 Future).
    })
  } catch (err: unknown) {
    // B1: a thrown fetch error is ALWAYS rpc-unreachable, never revert-failed.
    // undici throws `TypeError: fetch failed` with `err.cause.code` set to the OS
    // socket error (ECONNREFUSED / ENOTFOUND / ECONNRESET). A naive message-substring
    // check misses `new Error('network error')`-style mocks, so inspect ALL of:
    //   (a) err instanceof TypeError (undici fetch-failed),
    //   (b) String(err?.cause?.code) ∈ {ECONNREFUSED, ENOTFOUND, ECONNRESET},
    //   (c) the legacy message substrings (HTTP / fetch / ECONNREFUSED).
    // Only a genuine non-true evm_revert result (handled above, NOT here) is revert-failed.
    const message = err instanceof Error ? err.message : String(err)
    const causeCode = String(
      (err as { cause?: { code?: unknown } } | null)?.cause?.code ?? '',
    )
    const rpcUnreachable =
      err instanceof TypeError ||
      causeCode.includes('ECONNREFUSED') ||
      causeCode.includes('ENOTFOUND') ||
      causeCode.includes('ECONNRESET') ||
      message.includes('HTTP') ||
      message.includes('fetch') ||
      message.includes('ECONNREFUSED')
    return Response.json({
      ok: false,
      // Any thrown network error → rpc-unreachable; revert-failed is reserved for
      // the explicit non-true evm_revert branch above.
      reason: rpcUnreachable ? 'rpc-unreachable' : 'revert-failed',
      detail: redact(message),
    })
  }
}
```

**JSON-RPC shapes (HIGH confidence — verified in Phase 10 research + BuildBear docs):**

| Call | Shape | Returns |
|------|-------|---------|
| `evm_snapshot` | `{"jsonrpc":"2.0","method":"evm_snapshot","params":[],"id":1}` | hex string e.g. `"0x1"` |
| `evm_revert` | `{"jsonrpc":"2.0","method":"evm_revert","params":["0x1"],"id":1}` | `true` on success |

One-use semantics: after `evm_revert("0x1")` succeeds, `"0x1"` is no longer valid. The new `evm_snapshot` call returns `"0x2"` (or whatever the next id is). The route returns `newSnapshotId` so the Phase 12 UI / operator runbook can surface it. No KV persistence in Phase 11/12 (RESET-01 Future).

---

## `mode.ts` Extension

**File:** `packages/frontend/lib/apps/abrigo/cornerstone/mode.ts`
**Current:** `CornerstoneMode = 'live' | 'replay' | 'mock'`

```typescript
// CHANGE 1: extend the union
export type CornerstoneMode = 'live' | 'replay' | 'mock' | 'buildbear'

// CHANGE 2: extend parseMode
export function parseMode(raw: string | null | undefined): CornerstoneMode {
  if (raw === 'live') return 'live'
  if (raw === 'mock') return 'mock'
  if (raw === 'buildbear') return 'buildbear'  // NEW
  return DEFAULT_MODE  // 'replay' — unchanged default
}
```

`DEFAULT_MODE` remains `'replay'` — a plain clone with no `?mode=buildbear` and no `DEMO_SIGNER_PK` gets replay. The `'buildbear'` mode only activates when the URL opts in AND the key is present (the route handles the key-absent case server-side with `not-configured`).

---

## Somnia Decoupling Cut

**File:** `packages/frontend/components/defi/cornerstone/CornerstoneClientShell.tsx`
**Edit site:** `handleLiveConfirm()` starting at line 189

### Current structure of `handleLiveConfirm` (lines 189–239)

```typescript
async function handleLiveConfirm() {
  try {
    const response = await fetch('/api/abrigo/agent1', {   // LINE 191 — agent1 call
      method: 'POST', ...
    })
    const upstream = await response.json() as { ok: true, ... } | { ok: false, reason: string }

    if (!upstream.ok) {
      setResolvedMode('replay')   // silent flip 1 — KEEP for live path, NEVER for buildbear path
      return
    }
    // ... explorer links ...

    if (!isConnected) {
      setResolvedMode('replay')   // silent flip 2 — KEEP for live path
      return
    }
    if (walletChainId !== 31337) {
      await switchChainAsync({ chainId: 31337 })
    }
    void writeContractAsync   // stub
  } catch {
    setResolvedMode('replay')   // silent flip 3 — KEEP for live path
  }
}
```

### Required edit (the decoupling cut)

```typescript
async function handleLiveConfirm() {
  // ---- BUILDBEAR BRANCH — FIRST, before any agent1 reference ----
  // Phase 12 will wire full UI state machine; Phase 11 just establishes the cut.
  if (resolvedMode === 'buildbear') {
    // Call buildbear-sign (Phase 12 adds full UI wiring on top of this)
    try {
      const response = await fetch('/api/cornerstone/buildbear-sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mandate: null }), // Phase 12 fills in the replay artifact mandate
      })
      const result = await response.json() as BuildBearSignResponse
      // Phase 12 handles result.ok / result.reason → RunState transitions
      // Phase 11: no setResolvedMode('replay') on any buildbear error path
      void result
    } catch {
      // Phase 12 wires the error state; Phase 11 does NOT degrade to replay
    }
    return  // ALWAYS return — never fall through to agent1 block
  }

  // ---- ORIGINAL LIVE PATH — unchanged below this line ----
  try {
    const response = await fetch('/api/abrigo/agent1', { ... })
    ...
    if (!upstream.ok) {
      setResolvedMode('replay')   // keep for live path only
      return
    }
    ...
  } catch {
    setResolvedMode('replay')   // keep for live path only
  }
}
```

**Critical invariants for the decoupling cut:**
1. The `if (resolvedMode === 'buildbear')` check is the FIRST thing in `handleLiveConfirm`, before the `fetch('/api/abrigo/agent1', ...)` line.
2. The buildbear branch ALWAYS returns (`return`) — never falls through.
3. No `setResolvedMode('replay')` calls inside the buildbear branch (Phase 12 introduces `fork-used` advisory state instead; Phase 11 just establishes the structural cut).
4. The three existing `setResolvedMode('replay')` flips remain intact for the `live` path. They are NOT removed in Phase 11.
5. `useEffect` mount probe condition `if (resolvedMode !== 'live') return` at line 153 must be extended to also skip for `'buildbear'` (or the probe logic is not needed for buildbear — Phase 12 owns the mount-time `numberOfLegs` check).

### Mount probe extension

The `useEffect` at line 151 currently guards with `if (resolvedMode !== 'live') return`. For Phase 11, extend to:
```typescript
if (resolvedMode !== 'live' && resolvedMode !== 'buildbear') return
```
This prevents the mount-time RPC probe from running in replay/mock mode while still running for both live paths. Phase 12 may refine the buildbear-specific probe logic.

---

## MINT-03: Mandate Source Swap

**File:** `packages/frontend/lib/apps/abrigo/cornerstone/workflow-engine.ts`
**Relevant type:** `UpstreamResult` at line 145
**Relevant function:** `runWorkflowLive` at line 201

### Current upstream sourcing (to be changed)

```typescript
// Current: upstream is the Agent-1 route response (StrategistDecidedView from Somnia)
type UpstreamResult =
  | { ok: true; strategistView: StrategistDecidedView }
  | { ok: false; reason: string; strategistView: null }
```

`runWorkflowLive` receives `upstream` as a parameter (it is injected, not fetched inside the function). The function itself does NOT call `/api/abrigo/agent1`. The caller (currently the unfinished `handleLiveConfirm` Phase 12 integration) is responsible for constructing `upstream`.

**For MINT-03: the caller changes, not `runWorkflowLive` itself.**

### What Phase 11 delivers for MINT-03

Phase 11 does NOT change `runWorkflowLive` signature. It changes how the caller (Phase 12's `handleBuildBearConfirm`) constructs the `UpstreamResult`:

```typescript
// Phase 12 will do:
// Instead of: const upstream = await fetch('/api/abrigo/agent1')
// Use:         const upstream = buildUpstreamFromReplayArtifact(presetId)

// Phase 11 creates this helper in workflow-engine.ts:
export function buildUpstreamFromReplayArtifact(presetId: string): UpstreamResult {
  const preset = getPresetById(presetId)
  if (!preset) return { ok: false, reason: `unknown preset: ${presetId}`, strategistView: null }
  // Construct a StrategistDecidedView from the preset's recorded data
  // (same data that runWorkflow/mock path uses — the recorded snapshot)
  const mockEvent: StrategistDecidedEvent = {
    kind: 'StrategistDecided',
    requestId: BigInt(preset.recordedDecisionId),
    thesis: '...', // from preset
    spec: { ... }, // from preset
  }
  const strategistView = fromMockEvent(mockEvent) as StrategistDecidedView
  return {
    ok: true,
    strategistView: { ...strategistView, recordedDecisionId: preset.recordedDecisionId },
  }
}
```

`buildLiveMandate` re-hydration stays — it still gets called inside `runWorkflowLive` with the mandate from the replay artifact, not from Somnia. The `serializedMandate` passed to `runWorkflowLive` comes from the artifact's recorded mandate data (same source as the replay path's `preset.mandate`).

**Key constraint:** `buildLiveMandate` pins `economicTheory` to `MINT_ECONOMIC_THEORY` (PKE, `0x...06`) regardless of the source mandate. This stays unchanged and protects the 360360 strike anchor.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Error message → reason code | Custom string-match on `err.message` alone | viem `ContractFunctionRevertedError` class + `.reason` field + cause-chain traversal | `err.message` contains the full formatted error message; `.reason` is the ABI-decoded string revert arg — more reliable |
| RPC JSON-RPC calls | A full RPC client | Direct `fetch` with `{jsonrpc:'2.0', ...}` for `evm_revert`/`evm_snapshot` | These are 2-line calls; viem's `walletClient.request` works but adds unnecessary ceremony for 2 methods |
| Account from PK | Manual ECDSA | `privateKeyToAccount(pk as \`0x${string}\`)` from `viem/accounts` | Already proven in `agent1/route.ts:117` and `spike-viem-sign.ts:66` |
| Chain definition | Hardcoded chainId | `createBuildBearChain(deployment.rpcUrl)` | Already in `buildbear.ts`; RPC URL from artifact, never hardcoded |

---

## Common Pitfalls

### Pitfall 1: `DEMO_SIGNER_PK` in the `NEXT_PUBLIC_` namespace
**What goes wrong:** Key leaks to the browser bundle; any visitor can extract it via DevTools.
**Why it happens:** Copying the client env pattern by mistake.
**How to avoid:** Add `DEMO_SIGNER_PK: z.string().min(1).optional()` to the `server` block in `lib/env.ts` (not `client`). Use `env.DEMO_SIGNER_PK` (not `process.env.DEMO_SIGNER_PK`) inside the route.
**Warning signs:** `tsc --noEmit` passes but `grep -r NEXT_PUBLIC_DEMO_SIGNER_PK` has any hit.

### Pitfall 2: `simulateContract` not called before `writeContract`
**What goes wrong:** `writeContract` spends gas and mines a reverted tx; the revert reason is harder to decode from a receipt than from a `simulateContract` error.
**Why it happens:** `writeContract` is the write primitive; simulate is "optional" in viem docs.
**How to avoid:** Always call `simulateContract` first in `buildbear-sign`. The simulate throw is caught by `classifyViemError` and returns the `reason` code without spending gas.
**Warning signs:** Route returning `reason:'reverted'` for all errors, including `'fork-used'`.

### Pitfall 3: `evm_revert` one-use semantics — not re-snapshotting
**What goes wrong:** Second reset attempt gets `evm_revert` returning `false`; the fork state is stuck at the post-first-revert position.
**Why it happens:** BuildBear/Hardhat `evm_snapshot` ids are one-use: once consumed by `evm_revert`, the id is invalid.
**How to avoid:** `buildbear-reset` MUST call `evm_snapshot` immediately after `evm_revert` succeeds. Return the `newSnapshotId` in the response. Operator runbook must instruct updating the artifact's `snapshotId` field.
**Warning signs:** `evm_revert` returning `false` (not `true`).

### Pitfall 4: Buildbear branch falling through to agent1 call
**What goes wrong:** `handleLiveConfirm` calls `/api/abrigo/agent1` even in `buildbear` mode, re-creating the v2.0 Somnia-outage coupling.
**Why it happens:** Forgetting the `return` at the end of the `if (resolvedMode === 'buildbear')` block.
**How to avoid:** The buildbear branch must unconditionally `return` before any `fetch('/api/abrigo/agent1', ...)` code. Test with: `grep -n "agent1" packages/frontend/components/defi/cornerstone/CornerstoneClientShell.tsx` — the agent1 reference must only appear in the `else` / non-buildbear branch.

### Pitfall 5: `setResolvedMode('replay')` inside the buildbear branch
**What goes wrong:** A `'fork-used'` revert silently degrades the demo to replay mode with no announcement — HONEST-01 violation.
**Why it happens:** Copy-pasting the live path error handling into the buildbear branch.
**How to avoid:** The buildbear branch contains ZERO `setResolvedMode('replay')` calls. Phase 12 introduces `fork-used` advisory state. Phase 11 just establishes the structural cut.

### Pitfall 6: `ContractFunctionRevertedError.reason` absent when ABI omits `Error(string)` entry
**What goes wrong:** `reason` is `undefined` even though the revert string is `"fork used"`.
**Why it happens:** viem's `decodeErrorResult` requires the ABI to contain matching error selectors. For `require(condition, "fork used")`, Solidity emits ABI selector `0x08c379a0` (the built-in `Error(string)` function). viem automatically handles this selector even with a minimal ABI — `reason` is populated for string reverts without any custom ABI entry.
**How to avoid:** No action needed for string reverts. `reason` is reliably populated for `require(condition, "string message")` reverts. Custom errors (e.g., `error ForkUsed()`) would need ABI entries — but EXEC-01 uses string reverts by design.
**Warning signs:** None expected; this is a non-issue for string reverts.

### Pitfall 7: `runtime='edge'` instead of `'nodejs'`
**What goes wrong:** `privateKeyToAccount` uses Node.js `crypto` module — crashes on edge runtime with "module not found: crypto".
**Why it happens:** Next.js App Router defaults to edge for new API routes in some configurations.
**How to avoid:** `export const runtime = 'nodejs'` MUST be the first non-comment export in the file. This is the same pattern as `agent1/route.ts:39`.

---

## Code Examples

### `privateKeyToAccount` + `createWalletClient` for BuildBear (verified pattern)

```typescript
// Source: packages/frontend/scripts/spike-viem-sign.ts:65-74
// Verified: tested against BuildBear Polygon fork chain 31337
const account = privateKeyToAccount(env.DEMO_SIGNER_PK as `0x${string}`)
const chain = createBuildBearChain(deployment.rpcUrl)
const walletClient = createWalletClient({
  account,
  chain,
  transport: http(deployment.rpcUrl),
})
const publicClient = createPublicClient({
  chain,
  transport: http(deployment.rpcUrl),
})
```

### Vitest route test pattern (`// @vitest-environment node`)

```typescript
// Source: packages/frontend/tests/api/status.test.ts:1-4 (established pattern)
// @vitest-environment node
// Required because: viem's transport uses Node.js fetch/crypto modules

import { POST } from '@/app/api/cornerstone/buildbear-sign/route'
import { describe, expect, it, vi, beforeEach } from 'vitest'

// Mock the artifact loader (no live artifact needed)
vi.mock('@/lib/apps/abrigo/cornerstone/artifact-loader', () => ({
  deployment: {
    rpcUrl: 'http://mock-rpc.test',
    executor: '0xDeAdBeEfDeAdBeEfDeAdBeEfDeAdBeEfDeAdBeEf',
    snapshotId: '0x1',
    chainId: 31337,
    pool: '0xPoolAddr',
    riskManagement: '0xRiskAddr',
    mintTxHash: null,
    mintedStrike: null,
    capturedAt: new Date().toISOString(),
    source: 'test',
  },
  validateDeployment: (raw: unknown) => raw,
  isExpired: vi.fn().mockReturnValue(false),
}))

// Mock the BuildBear chain factory
vi.mock('@/lib/apps/abrigo/cornerstone/buildbear', () => ({
  createBuildBearChain: vi.fn().mockReturnValue({ id: 31337 }),
  BuildBearChainId: 31337,
}))
```

### `global.fetch` mock for RPC call isolation

```typescript
// Source: established pattern for Node-runtime route tests
// Mock global fetch for RPC responses
const mockFetch = vi.spyOn(globalThis, 'fetch')

beforeEach(() => {
  vi.clearAllMocks()
  process.env.SKIP_ENV_VALIDATION = 'true'
  process.env.DEMO_SIGNER_PK = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80' // Hardhat default #0 — safe for tests, no real value
})
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| handleLiveConfirm calls Somnia agent1 unconditionally | `resolvedMode === 'buildbear'` branch FIRST, agent1 only for `live` mode | Phase 11 (this phase) | BuildBear path no longer hostage to Somnia outage |
| Live mandate sourced from Somnia Agent-1 response | Live mandate sourced from recorded replay artifact (`getPresetById`) | Phase 11 (MINT-03) | Demo works when Somnia is outaged |
| `CornerstoneMode = 'live' | 'replay' | 'mock'` | Adds `'buildbear'` | Phase 11 | Enables URL-opted-in BuildBear mode |
| `evm_snapshot` id not stored in artifact | `snapshotId?: string` added to `BuildBearDeployment` | Phase 10 (Wave 0) | Reset route can read snapshotId from artifact |

---

## Open Questions

1. **`simulateContract` vs `writeContract` for the signer-gas check**
   - What we know: `getBalance` check is a pre-flight guard. If balance is zero, return `signer-gas` immediately.
   - What's unclear: Whether `simulateContract` itself will throw `InsufficientFundsError` if balance is low-but-nonzero (gas estimation failure).
   - Recommendation: Both checks are complementary. Keep `getBalance === 0n` as a fast-fail guard AND let `simulateContract` catch `InsufficientFundsError` for low-but-nonzero balances.

2. **`BuildBearSignResponse` view fields (strategistView, executorView, positionMinted)**
   - What we know: Phase 12 needs these for `RunState` transitions and EVID-* surfaces (Phase 13).
   - What's unclear: Whether Phase 11 should stub them as `null` or decode them from the receipt.
   - Recommendation: Phase 11 stubs them as `null` (the receipt log decoding is Phase 13 scope per REQUIREMENTS.md traceability). Phase 11's contract with Phase 12 is the `{ok, txHash, blockNumber, reason}` envelope.

3. **`buildbear-reset` `newSnapshotId` persistence**
   - What we know: The route returns `newSnapshotId`. No KV in v3.0 (RESET-01 Future).
   - What's unclear: How Phase 12 / the operator runbook updates the artifact. Options: (a) operator re-provisions, (b) Phase 12 UI displays the new id for manual artifact update.
   - Recommendation: Return `newSnapshotId` in the response body. Document in the runbook (Phase 13) that the operator must update the artifact after each reset. Do not persist server-side in Phase 11.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest 4.1.6 (already configured) |
| Config file | `packages/frontend/vitest.config.ts` |
| Quick run command | `pnpm --filter frontend vitest run tests/api/buildbear-sign.test.ts tests/api/buildbear-reset.test.ts tests/unit/mode.test.ts` |
| Full suite command | `pnpm --filter frontend vitest run` |

All new test files use `// @vitest-environment node` (pattern from `tests/api/status.test.ts`) because viem transport requires Node.js crypto/fetch modules.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MINT-01 | `buildbear-sign` returns `{ok:false, reason:'not-configured'}` when `DEMO_SIGNER_PK` absent | unit (route) | `vitest run tests/api/buildbear-sign.test.ts -t "not-configured"` | ❌ Wave 0 |
| MINT-01 | `buildbear-sign` returns `{ok:false, reason:'fork-used'}` when simulateContract throws ContractFunctionRevertedError with reason `"fork used"` | unit (route) | `vitest run tests/api/buildbear-sign.test.ts -t "fork-used"` | ❌ Wave 0 |
| MINT-01 | `buildbear-sign` returns `{ok:false, reason:'rpc-unreachable'}` when fetch throws HttpRequestError | unit (route) | `vitest run tests/api/buildbear-sign.test.ts -t "rpc-unreachable"` | ❌ Wave 0 |
| MINT-01 | `buildbear-sign` returns `{ok:false, reason:'signer-gas'}` when getBalance returns 0n | unit (route) | `vitest run tests/api/buildbear-sign.test.ts -t "signer-gas"` | ❌ Wave 0 |
| MINT-01 | `buildbear-sign` returns `{ok:false, reason:'reverted'}` for non-'fork-used' reverts | unit (route) | `vitest run tests/api/buildbear-sign.test.ts -t "reverted"` | ❌ Wave 0 |
| MINT-01 | `DEMO_SIGNER_PK` is never in `NEXT_PUBLIC_` — path-scoped key-leak grep | arch (grep) | `grep -r NEXT_PUBLIC_DEMO_SIGNER_PK packages/frontend; test $? -ne 0` | ❌ Wave 0 (arch test) |
| MINT-02 | buildbear path never reaches agent1 — decoupling grep | arch (grep) | see below | ❌ Wave 0 (arch test) |
| MINT-03 | `buildUpstreamFromReplayArtifact` returns `{ok:true, strategistView}` from preset | unit | `vitest run tests/unit/workflow-engine-buildbear.test.ts` | ❌ Wave 0 |
| (reset) | `buildbear-reset` returns `{ok:false}` when `snapshotId` absent from artifact | unit (route) | `vitest run tests/api/buildbear-reset.test.ts -t "no-snapshot"` | ❌ Wave 0 |
| (reset) | `buildbear-reset` calls `evm_revert` then `evm_snapshot` in sequence | unit (route) | `vitest run tests/api/buildbear-reset.test.ts -t "reset sequence"` | ❌ Wave 0 |
| (reset) | `buildbear-reset` returns `newSnapshotId` on success | unit (route) | `vitest run tests/api/buildbear-reset.test.ts -t "returns newSnapshotId"` | ❌ Wave 0 |
| (mode) | `parseMode('buildbear')` returns `'buildbear'` | unit | `vitest run tests/unit/mode.test.ts` | ❌ Wave 0 |
| (mode) | `parseMode(null)` still returns `'replay'` (default unchanged) | unit | `vitest run tests/unit/mode.test.ts` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `pnpm --filter frontend vitest run tests/api/buildbear-sign.test.ts tests/api/buildbear-reset.test.ts tests/unit/mode.test.ts`
- **Per wave merge:** `pnpm --filter frontend vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Decoupling Grep (MINT-02 CI-checkable signal)

```bash
# Assert: no reachable agent1 reference from the buildbear branch
# The grep checks that the buildbear branch always returns before any agent1 string
# This is a line-order grep — not a static analysis, but it catches accidental fall-through

# Test passes if the buildbear branch early-return comes before the agent1 fetch line
# in CornerstoneClientShell.tsx:
python3 -c "
import re, sys
code = open('packages/frontend/components/defi/cornerstone/CornerstoneClientShell.tsx').read()
bb_pos = code.find(\"resolvedMode === 'buildbear'\")
agent1_pos = code.find(\"'/api/abrigo/agent1'\")
assert bb_pos != -1, 'buildbear branch missing'
assert agent1_pos != -1, 'agent1 reference missing'
assert bb_pos < agent1_pos, 'buildbear check must come BEFORE agent1 fetch'
print('PASS: buildbear branch precedes agent1 fetch')
"
```

### Key-Leak Grep (MINT-01 CI-checkable signal)

```bash
# Assert: DEMO_SIGNER_PK never in NEXT_PUBLIC_ namespace
grep -r "NEXT_PUBLIC_DEMO_SIGNER_PK" packages/frontend/
test $? -ne 0 && echo "PASS: no NEXT_PUBLIC_ key leak" || (echo "FAIL: key leak detected"; exit 1)

# Assert: privateKeyToAccount only in app/api/ paths (path-scoped whitelist)
# The only legitimate occurrences are agent1/route.ts and buildbear-sign/route.ts
grep -r "privateKeyToAccount" packages/frontend/app/ | grep -v "app/api/"
test $? -ne 0 && echo "PASS: privateKeyToAccount scoped to app/api/" || (echo "FAIL: privateKeyToAccount outside app/api/"; exit 1)
```

### Wave 0 Gaps

- [ ] `tests/api/buildbear-sign.test.ts` — covers MINT-01 (all 5 reason branches + `not-configured`)
- [ ] `tests/api/buildbear-reset.test.ts` — covers open-reset route (no-snapshot, reset sequence, newSnapshotId return)
- [ ] `tests/unit/mode.test.ts` — covers `'buildbear'` parse + default unchanged
- [ ] `tests/unit/workflow-engine-buildbear.test.ts` — covers `buildUpstreamFromReplayArtifact` (MINT-03)
- [ ] `tests/architecture/buildbear-key-leak.test.ts` — covers DEMO_SIGNER_PK grep + `privateKeyToAccount` path-scope

---

## Sources

### Primary (HIGH confidence)

- `packages/frontend/app/api/abrigo/agent1/route.ts` — exact pattern for `runtime='nodejs'`, env-read, `privateKeyToAccount`, `writeContract`, error response shapes
- `packages/frontend/app/api/cornerstone/rpc/route.ts` — CORS proxy pattern; `deployment.rpcUrl` usage; `NextResponse.json` shape
- `packages/frontend/scripts/spike-viem-sign.ts` — `privateKeyToAccount` + `createWalletClient` + `createPublicClient` + pinned 5-field HedgeMandate ABI tuple (verified against `HedgeMandate.sol`)
- `packages/frontend/lib/apps/abrigo/cornerstone/mode.ts` — current `CornerstoneMode` union + `parseMode` (add `'buildbear'`)
- `packages/frontend/lib/apps/abrigo/cornerstone/artifact-loader.ts` — `BuildBearDeployment` type with `snapshotId?: string`, `validateDeployment`, `deployment` singleton
- `packages/frontend/lib/apps/abrigo/cornerstone/buildbear.ts` — `createBuildBearChain(rpcUrl)` factory
- `packages/frontend/components/defi/cornerstone/CornerstoneClientShell.tsx` — `handleLiveConfirm` body (lines 189–239), three `setResolvedMode('replay')` flip sites
- `packages/frontend/lib/apps/abrigo/cornerstone/workflow-engine.ts` — `UpstreamResult`, `RunWorkflowLiveOptions.upstream`, `runWorkflowLive` parameter injection point
- `packages/frontend/lib/env.ts` — `@t3-oss/env-nextjs` schema shape; server vs client split
- `packages/frontend/node_modules/viem/errors/contract.ts` — `ContractFunctionRevertedError`, `.reason` field, cause-chain wrapping
- `packages/frontend/node_modules/viem/errors/node.ts` — `InsufficientFundsError` (static `nodeMessage` regex), `ExecutionRevertedError`
- `packages/frontend/node_modules/viem/errors/request.ts` — `HttpRequestError`
- `packages/frontend/tests/api/status.test.ts` — `// @vitest-environment node` pattern; `vi.mock` hoisting rules; route handler import + call pattern
- `packages/frontend/vitest.config.ts` — `include: ['tests/**/*.{test,spec}.{ts,tsx}']`, environment `jsdom` default (overridden per-file with `@vitest-environment node`)
- `.planning/phases/10-.../10-RESEARCH.md` — `evm_snapshot`/`evm_revert` JSON-RPC shapes (BuildBear LIVE-VERIFIED)

### Secondary (MEDIUM confidence)

- `.planning/STATE.md` — v3.0 architectural decisions table confirming decoupling cut order and `DEMO_SIGNER_PK` server-only constraint
- `.planning/REQUIREMENTS.md` — MINT-01/02/03 traceability; OPS-05 signer-balance pre-flight requirement

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed and used in existing routes
- Route skeletons: HIGH — derived by direct pattern-match from `agent1/route.ts` + `spike-viem-sign.ts`
- Error classification: HIGH — verified against installed `node_modules/viem/errors/*.ts`
- JSON-RPC shapes: HIGH — `evm_snapshot`/`evm_revert` live-verified in Phase 10 spike
- Decoupling cut: HIGH — exact edit site pinned to `CornerstoneClientShell.tsx:189`; current code read directly
- MINT-03: HIGH — `UpstreamResult` injection point confirmed in `workflow-engine.ts:145-174`
- Test mocking: HIGH — patterns copied from `tests/api/status.test.ts` + `tests/api/health.test.ts`

**Research date:** 2026-06-09
**Valid until:** 2026-07-09 (viem stable; Next.js App Router stable; BuildBear JSON-RPC API stable)
