# Phase 9: cornerstone-live-tx-integration — Research

**Researched:** 2026-06-07
**Domain:** viem v2 isolated chain, wagmi v2 switchChain, BuildBear JSON-RPC, BalanceDelta decoder, Next.js 16 Route-Handler proxy, workflow-store live producer
**Confidence:** HIGH (architecture patterns verified from existing project code + compiled ABIs; CORS decision flagged MEDIUM pending probe)

---

<user_constraints>
## User Constraints (from Canonical Spec v2 — 2026-06-07-module5-cornerstone-live-tx-design.md)

### Locked Decisions
> **⚑ SUPERSEDED by spec v4/v5 (2026-06-08).** This research was written against spec v2 (recorded Agent-1 + isolated chain). Two decisions below are REVERSED — read the spec's v4→v5 reframe block as authoritative. Updated bullets are marked ⟳.
- Integration depth: BOTH agents LIVE (Option B); but the live RUN is gated ⊘ on the Somnia validator-callback outage. In-phase: `replay` (captured receipts) is the GUARANTEED artifact; the live path is BUILT+wired against the live address and auto-works on Somnia recovery. ⟳
- Demo constants pinned: `legIndex=0`, `positionSize=1_000_000n`; **`economicTheory=0x…06` (PKE) is pinned on the MINT side** (a live SHILLER 0x5 mandate breaks the 360360 anchor / can revert) — the live `school` LABEL still renders from the event string. ⟳
- Cost ledger: STATIC placeholder ONLY — no `totalCost` call, no `OperationalCostManagement` address, no fabricated numbers
- ⟳ **REVERSED:** `StrategistDecided` IS decoded from a live Somnia log — server-side in the `/api/abrigo/agent1` route, against the LIVE two-leg strategist `0xf0570CcB1271FFaFf4caCA628F3632257f177b1D` (Somnia 50312). In `replay` it is sourced from captured receipts; in `mock` from `fromMockEvent`. (Live decode currently no-ops only due to the external validator-callback outage, not deployment.)
- Provenance: `fork-verified` is NEUTRAL — never green
- Fallback path must ALWAYS be labelled "modo demostración (sin cadena)" / "demo mode (no chain)" — never a silent substitution; the live→replay degradation must be announced (aria-live), never silent
- ⟳ **REVERSED (D2, user 2026-06-07):** the BuildBear fork (31337) IS registered in `lib/wagmi/config.ts` as a 6th chain; the write path uses wagmi `useSwitchChain` + `useWriteContract({chainId:31337})`. `SupportedChainId` widened (accepted for the demo). Reads may use a dedicated viem public client built from the artifact RPC. (The "isolated / raw EIP-1193" patterns elsewhere in this doc are the SUPERSEDED alternative.)
- Fork addresses/RPC ONLY from the mirrored `buildbear-deployments.json` artifact (no hardcoding)
- `isExpired(nowMs)` honored (capturedAt + 3 days TTL)
- No `executed/realized/ejecutad/realizad` in rendered DOM; no `$` PnL; decision card never `<details>`
- Status pills always color + icon + text (CROSS-09)
- es-CO-first copy + native sign-off in `docs/copy-review.md`
- `pnpm run test:impeccable` + token tests + e2e green locally before commit; Evidence Collector live-verify gate per task; no `--no-verify`

### Claude's Discretion
- Whether to implement a Next.js Route-Handler JSON-RPC proxy vs direct browser fetch to BuildBear RPC (spec §7.2 — decision via `eth_chainId` browser probe)
- Wave breakdown of plans (spec suggests Wave 0 ABI/chain data layer → Wave 1 live producer + freshness gate → Wave 2 surfaces + route wire + e2e + live-verify)
- Whether wagmi `switchChain` or raw `wallet_addEthereumChain` / `wallet_switchEthereumChain` is the implementation path

### Deferred Ideas (OUT OF SCOPE)
- MOD4-MONITOR (MonitorPanel) and MOD4-HISTORY (idb run history) — deferred from Phase 8
- School-branch UI (SHILLER vs PKE selector)
- ⟳ Live Somnia `StrategistDecided` decode is NO LONGER deferred — it is in scope (server-side), gated only by the external validator-callback outage (the live on-chain RUN verdict is ⊘ DEFERRED, the build is not)
- Live Somnia `StrategistDecided` decode
- Cross-chain bridge
- Monitoring agent
- `_onResult` live cross-chain callback simulation
- `OperationalCostManagement` on-chain read (not deployed, no address)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| MOD5-ABI | Reconcile `events.ts` to final ABIs: `StrategistDecided`/`HedgeMandate`, 8-field `ExecutorDecided`, `PositionMinted`; `BalanceDelta` sign-extending decoder; `fromChainLog` real-ABI sibling of `fromMockEvent` | ABI shapes confirmed from compiled artifacts; BalanceDelta decoder algorithm verified from v4-core source; int24/WAD edge cases documented |
| MOD5-CHAIN | Isolated `buildbear.ts` chain @ 31337 (NOT in wagmiConfig/SupportedChainId); typed artifact loader + `isExpired`; dedicated viem public client for reads; wallet client for writes via existing wallet connector | Pattern directly mirrors existing `somnia/chain.ts`; buildbear-deployments.json already present in abrigo-somnia/contracts/script/out/ |
| MOD5-LIVE | Freshness gate (`pool.numberOfLegs(executor)==0`) + `runWorkflowLive` producer + Confirm→submit→receipt→decode→`quoteMargin`; honest tx/revert/error states; wallet switchChain to 31337 | viem writeContract + waitForTransactionReceipt + decodeEventLog patterns documented; `numberOfLegs` confirmed on IPanopticData interface |
| MOD5-FALLBACK | Honest mock degradation via existing `fromMockEvent` path; mode always visible; no fake tx hash/link when fallback | Existing `runWorkflow` + `workflow-store` seam requires NO changes; only producer selection logic is new |
| MOD5-SURFACE | Real mint tx hash + strike + TokenId under `fork-verified`; `ExecutorDecided` rationale fields (expandable); STATIC cost placeholder panel | UI-SPEC approved; 6 new surfaces documented; all reuse existing shadcn primitives |
</phase_requirements>

---

## Summary

Phase 9 swaps the Phase-8 mock producer in `workflow-engine.ts` for a real on-chain producer (`runWorkflowLive`) that submits `resolveFromMandate` to a BuildBear Polygon fork (chainId 31337) and decodes the resulting `ExecutorDecided` + `PositionMinted` logs from the receipt. The `workflow-store` seam, `RunTranscript`, and all downstream components are UNCHANGED — only the event producer and its view-model output changes.

The critical implementation unknowns are: (1) CORS reachability of the BuildBear RPC from the browser — requiring an `eth_chainId` probe before deciding whether to ship a Next.js Route-Handler JSON-RPC proxy or a direct browser client; (2) the exact viem pattern for building a standalone wallet client from `window.ethereum` after `wallet_addEthereumChain` / `wallet_switchEthereumChain` for a chain not in wagmiConfig; (3) the BalanceDelta sign-extension decoder (upper 128 bits = amount0 via `sar(128,v)`, lower 128 bits = amount1 via sign-extend at bit 127) — which has a known easy-to-miss bug on the low word. All three are addressed with concrete patterns below.

The existing `somnia/chain.ts` is the direct template for the new `buildbear.ts`. The `IPanopticData.numberOfLegs(address user)` function confirms the freshness gate read target. The compiled `MacroHedgeExecutor` ABI confirms the 8-field `ExecutorDecided` event, `PositionMinted` with 2 indexed topics, and `quoteMargin` returning `int256` (the BalanceDelta packed value).

**Primary recommendation:** Ship the Next.js Route-Handler JSON-RPC proxy from the start (do not wait for the probe result to block plan execution). The proxy adds one Wave-0 task and eliminates the only blocking CORS unknown. Direct browser fetch can always be added later as a fallback transport.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| viem | 2.48.11 (installed) | `defineChain`, `createPublicClient`, `createWalletClient`, `writeContract`, `waitForTransactionReceipt`, `decodeEventLog` | Project-standard; no new install |
| wagmi | 2.19.5 (installed) | `useWalletClient`, `useSwitchChain` / raw window.ethereum fallback | Project-standard; no new install |
| Next.js | 16.2.6 (installed) | Route Handler for JSON-RPC proxy (if CORS blocked) | Project-standard; no new install |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | installed | 12 new icons (Loader2, Clock, CheckCircle2, XCircle, ChevronDown, ChevronUp, Copy, ExternalLink, Radio, FlaskConical, CircleDashed, GitFork) | All new surfaces |
| shadcn/ui | new-york preset | Button, Badge, Separator (reuse existing Phase 8 baseline) | Compose new panels |

**No new npm installs required.** All dependencies are already present.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Next.js Route Handler proxy | Direct browser fetch to BuildBear RPC | Proxy is CORS-safe, adds one task; direct is simpler but may be blocked (see CORS section) |
| Raw `window.ethereum` wallet client | wagmi `useSwitchChain` | wagmi `useSwitchChain` requires the chain to be in wagmiConfig; raw EIP-1193 is needed for isolated buildbear chain |

---

## Architecture Patterns

### Recommended Project Structure (Phase 9 additions only)

```
lib/apps/abrigo/cornerstone/
├── buildbear.ts              # NEW: defineChain(31337) + publicClient (mirrors somnia/chain.ts)
├── buildbear-deployments.json # NEW: mirrored artifact (copy from abrigo-somnia/contracts/script/out/)
├── artifact-loader.ts        # NEW: typed loader + isExpired(nowMs)
├── events.ts                 # MODIFIED: reconcile types to real ABIs + add fromChainLog + ExecutorDecidedView fields
├── workflow-engine.ts        # MODIFIED: add runWorkflowLive() alongside existing runWorkflow()
├── workflow-store.ts         # UNCHANGED
└── presets.ts                # UNCHANGED

app/api/cornerstone/
└── rpc/
    └── route.ts              # NEW: JSON-RPC proxy Route Handler (if CORS probe fails)

components/defi/cornerstone/
├── ModeBanner.tsx            # NEW: Surface 1
├── LiveTxStateRow.tsx        # NEW: Surface 2 (transcript row for each tx state)
├── OnChainEvidencePanel.tsx  # NEW: Surface 3
├── ExecutorRationalePanel.tsx # NEW: Surface 4 (expandable)
├── AgentCostPlaceholder.tsx  # NEW: Surface 5
└── FreshnessGate.tsx         # NEW: Surface 6 (confirm button area)
```

### Pattern 1: Isolated Chain + Public Client (mirrors somnia/chain.ts exactly)

**What:** `defineChain` with the BuildBear fork, a dedicated `createPublicClient` for reads. NO addition to wagmiConfig or SupportedChainId.

**When to use:** Any read against the BuildBear fork (freshness gate, `quoteMargin`).

```typescript
// lib/apps/abrigo/cornerstone/buildbear.ts
// Source: mirrors lib/apps/abrigo/somnia/chain.ts verbatim
import { http, createPublicClient, defineChain } from 'viem'
import type { BuildBearDeployment } from './artifact-loader'

export const BuildBearChainId = 31337 as const

// Chain definition uses RPC from the artifact — not hardcoded.
// Call createBuildBearChain(artifact.rpcUrl) at runtime.
export function createBuildBearChain(rpcUrl: string) {
  return defineChain({
    id: 31337,
    name: 'BuildBear Polygon Fork',
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
    rpcUrls: { default: { http: [rpcUrl] } },
  })
}

export function createBuildBearPublicClient(rpcUrl: string) {
  return createPublicClient({
    chain: createBuildBearChain(rpcUrl),
    transport: http(rpcUrl),
  })
}
```

### Pattern 2: Wallet Client for Write (isolated chain NOT in wagmiConfig)

**What:** wagmi's `useSwitchChain` only works for chains registered in wagmiConfig. For BuildBear (isolated), use raw EIP-1193 `wallet_addEthereumChain` + `wallet_switchEthereumChain`, then build a viem `createWalletClient` from `window.ethereum`.

**When to use:** The `resolveFromMandate` write call in `runWorkflowLive`.

```typescript
// Pattern for switching to an isolated chain + getting a walletClient
// Source: viem docs + wagmi isolated chain pattern (somnia precedent)

async function getWalletClientForFork(rpcUrl: string): Promise<WalletClient> {
  if (!window.ethereum) throw new Error('No wallet')

  const chainParam = {
    chainId: '0x7a69',  // 31337 hex
    chainName: 'BuildBear Polygon Fork',
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
    rpcUrls: [rpcUrl],
  }

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0x7a69' }],
    })
  } catch (e: unknown) {
    // 4902 = chain not added yet
    if ((e as { code?: number }).code === 4902) {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [chainParam],
      })
    } else throw e
  }

  return createWalletClient({
    chain: createBuildBearChain(rpcUrl),
    transport: custom(window.ethereum),
  })
}
```

### Pattern 3: writeContract + waitForTransactionReceipt + decodeEventLog

**What:** Submit `resolveFromMandate`, wait for receipt, decode `ExecutorDecided` and `PositionMinted` from logs.

```typescript
// Source: viem v2 docs — waitForTransactionReceipt + decodeEventLog
import { decodeEventLog, parseAbi } from 'viem'

const hash = await walletClient.writeContract({
  address: deployment.executor as `0x${string}`,
  abi: MacroHedgeExecutorAbi,
  functionName: 'resolveFromMandate',
  args: [mandate, 0n, 1_000_000n],
  chain: buildBearChain,
  account: walletClient.account,
})

const receipt = await publicClient.waitForTransactionReceipt({ hash })

for (const log of receipt.logs) {
  try {
    const decoded = decodeEventLog({
      abi: MacroHedgeExecutorAbi,
      data: log.data,
      topics: log.topics,
      strict: false,  // tolerates RepresentativenessAssessed extra logs
    })
    if (decoded.eventName === 'ExecutorDecided') { /* ... */ }
    if (decoded.eventName === 'PositionMinted') { /* ... */ }
  } catch {
    // unrecognized event (e.g. RepresentativenessAssessed) — skip, do not error
  }
}
```

### Pattern 4: BalanceDelta Decoder (HIGH criticality — known easy-to-miss bug)

**What:** `quoteMargin` returns `int256` which is a packed `BalanceDelta` (upper 128 bits = amount0, lower 128 bits = amount1). The low word MUST be sign-extended from bit 127.

**Verified from:** `v4-core/src/types/BalanceDelta.sol` lines 61-71 — `sar(128, v)` for amount0 (arithmetic shift right preserves sign), `signextend(15, v)` for amount1 (sign-extend at byte 15 = bit 127).

```typescript
// lib/apps/abrigo/cornerstone/events.ts — decodeBalanceDelta
// Source: BalanceDelta.sol BalanceDeltaLibrary.amount0/amount1 (lines 56-71)
//
// CRITICAL: the low-word (amount1) MUST be sign-extended at bit 127.
// The naive mask `value & ((1n << 128n) - 1n)` produces the WRONG result for
// negative amount1 because the high bit of the low word is NOT sign-extended.
// Use BigInt.asIntN(128, maskedLow) to apply sign extension.

export function decodeBalanceDelta(rawInt256: bigint): { amount0: bigint; amount1: bigint } {
  // amount0: upper 128 bits — arithmetic right shift 128 positions
  const amount0 = rawInt256 >> 128n  // BigInt >> is arithmetic (sign-extending)

  // amount1: lower 128 bits — mask then sign-extend from bit 127
  const mask128 = (1n << 128n) - 1n
  const low128 = rawInt256 & mask128              // unsigned 128-bit extraction
  const amount1 = BigInt.asIntN(128, low128)       // sign-extend: bit 127 → sign bit

  return { amount0, amount1 }
}

// Unit test anchor (REQUIRED per spec §6):
// amount1-negative fixture:
//   rawInt256 with amount0 = 100n, amount1 = -50n
//   toBalanceDelta(100n, -50n):
//     balanceDelta = (100n << 128n) | (BigInt.asUintN(128, -50n))
//   decodeBalanceDelta(balanceDelta) must return { amount0: 100n, amount1: -50n }
```

### Pattern 5: Freshness Gate Read (numberOfLegs)

**What:** `pool.numberOfLegs(executor)` — read against `IPanopticData` ABI. The pool address comes from the mirrored artifact.

```typescript
// Minimal ABI for the freshness gate read
const numberOfLegsAbi = [{
  type: 'function',
  name: 'numberOfLegs',
  inputs: [{ name: 'user', type: 'address' }],
  outputs: [{ name: '', type: 'uint256' }],
  stateMutability: 'view',
}] as const

const legs = await publicClient.readContract({
  address: deployment.pool as `0x${string}`,
  abi: numberOfLegsAbi,
  functionName: 'numberOfLegs',
  args: [deployment.executor as `0x${string}`],
})
// legs === 0n → fresh; legs > 0n → used sandbox → fallback
```

### Pattern 6: fromChainEvent — Real-ABI Sibling of fromMockEvent

> ⟳ **UPDATED for v4/v5.** Renamed `fromChainLog` → **`fromChainEvent`** (the name the plans use). The "StrategistDecided is NEVER decoded from chain" bullet is **STRUCK** — see below.

**What:** `fromChainEvent(log) → WorkflowEventView` decodes a real receipt log and produces the same view model types as `fromMockEvent`. Downstream components are unchanged.

**Key differences from fromMockEvent:**
- `ExecutorDecidedView` gains: `regimeZt`, `inflationAdjustment`, `strikeTick`, `regimeWidth`, `parametricHedged`, `nonErgodicDisclosed`, `rationale`
- `PositionMintedView` gains: margins come from a SEPARATE `quoteMargin` call (NOT from the PositionMinted event itself)
- ⟳ **REVERSED (v4/v5):** `StrategistDecided` **IS** decoded from chain — server-side in the `/api/abrigo/agent1` route against the LIVE two-leg strategist `0xf0570CcB1271FFaFf4caCA628F3632257f177b1D` (Somnia 50312). `fromChainEvent` sets `StrategistDecidedView.recordedDecisionId = decisionId.toString()` ONCE inside the adapter. In `replay` it comes from captured receipts; in `mock` from `fromMockEvent`. (Live decode currently no-ops only due to the external Somnia validator-callback outage, not deployment.)
- WAD → percent at the edge: `inflationAdjustmentWad` (uint256, 1e18 scale) → `(Number(wad) / 1e16).toFixed(2) + '%'`
- int24 fields (`strikeTick`, `regimeWidth`) from ABI are decoded as `number` by viem (already sign-correct); use as-is

### Pattern 7: Artifact Loader + isExpired

```typescript
// lib/apps/abrigo/cornerstone/artifact-loader.ts
import rawDeployment from './buildbear-deployments.json'

export type BuildBearDeployment = {
  chainId: number
  executor: string
  pool: string
  riskManagement: string
  rpcUrl: string
  mintTxHash: string
  mintedStrike: number
  capturedAt: string
  source: string
}

// Validated at module load — fields missing → throw (fail fast)
export const deployment: BuildBearDeployment = rawDeployment as BuildBearDeployment

export function isExpired(nowMs: number): boolean {
  const capturedAt = new Date(deployment.capturedAt).getTime()
  const TTL_MS = 3 * 24 * 60 * 60 * 1000  // 3 days
  return nowMs > capturedAt + TTL_MS
}
```

**Turbopack-safe JSON import:** Static `import rawDeployment from './buildbear-deployments.json'` is the safe pattern confirmed by the Phase 2/6 Velite/Turbopack lesson. Do NOT use `require` with a dynamic path — static JSON imports are bundled correctly by both Turbopack dev and webpack prod. No BigInt fields in this JSON, so no rehydration needed.

### Anti-Patterns to Avoid
- **Adding buildbear chain to wagmiConfig:** Violates the isolation invariant; pollutes the 5-chain config; wagmi would attempt to connect wallets to the fork automatically.
- **Calling `quoteMargin` before `PositionMinted` is confirmed:** Reverts with `PositionNotOwned`. The read MUST happen after a confirmed receipt with a `PositionMinted` log.
- **Using `mintedStrike` from the artifact for `quoteMargin`:** Spec §4a (M2) requires the strike from the MINTED `positionId.strike(0)` — not the artifact constant.
- **Masking amount1 without sign-extension:** `rawInt256 & ((1n<<128n)-1n)` produces the WRONG (always-positive) result for negative amount1.
- **`decodeEventLog` with `strict: true` on the receipt:** The executor emits `RepresentativenessAssessed` which is not in the FE ABI. `strict: false` tolerates unknown events without throwing.
- **Showing a fake explorer link:** If BuildBear does not expose an explorer URL in the artifact, show only the monospace hash with a copy button. Never link to Polygonscan.

---

## CORS / BuildBear RPC Reachability (the key open question — §7.2)

**Context:** The BuildBear RPC (`https://rpc.buildbear.io/...`) is a hosted JSON-RPC endpoint. Browser-origin fetch may succeed (BuildBear is a developer tool designed for browser access) or may be CORS-blocked by a restrictive CORS policy.

**Probe approach (MUST be done as Wave 0 task):**
```javascript
// Run this in browser devtools against the actual artifact RPC URL
fetch('https://rpc.buildbear.io/colossal-groot-e8ea55ce', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_chainId', params: [] }),
}).then(r => r.json()).then(console.log).catch(console.error)
```

**Decision matrix:**

| Probe result | Decision |
|---|---|
| 200 with `{"result":"0x7a69"}` | Direct browser fetch is fine. Use viem `http(rpcUrl)` transport directly. No proxy needed. |
| CORS error (blocked by CORS policy) | Mandatory Next.js Route-Handler proxy at `app/api/cornerstone/rpc/route.ts` |
| 4xx / unreachable | Sandbox has expired or URL is wrong. Re-provision per §4b runbook. |

**Recommendation:** The research recommendation is to **ship the Route-Handler proxy regardless of the probe result** for two reasons:
1. The sandbox URL rotates on every re-provision. The proxy decouples the rotation from any browser-cached CORS policy.
2. The proxy allows server-side rate limiting and request validation (the server-key optional path from §4a).

**Route-Handler proxy pattern:**
```typescript
// app/api/cornerstone/rpc/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { deployment } from '@/lib/apps/abrigo/cornerstone/artifact-loader'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const response = await fetch(deployment.rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await response.json()
  return NextResponse.json(data)
}
```

The viem public client then uses `http('/api/cornerstone/rpc')` instead of the BuildBear URL directly. The wallet client (for writes) MUST still use the real BuildBear URL directly (MetaMask's EIP-1193 provider calls the RPC directly, not through the proxy).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| ABI event decoding | Manual topic/data parsing | `decodeEventLog` from viem | Handles indexed topics, ABI types, strict/non-strict mode |
| Transaction receipt wait | Polling loop | `waitForTransactionReceipt` from viem | Handles confirmations, timeout, status check |
| BalanceDelta low-word sign | Naive mask | `BigInt.asIntN(128, maskedLow)` | The only safe sign-extension for BigInt in JS |
| JSON-RPC proxy | Custom fetch wrapper | Next.js Route Handler | Middleware layer, CORS headers, rate limiting built-in |
| Chain switching | Manual EIP-1193 sequence | Documented EIP-1193 sequence (see Pattern 2) | wagmi `useSwitchChain` doesn't support chains outside config |

**Key insight:** The BigInt sign-extension class of bugs (BalanceDelta, int24) is the highest-risk implementation area. Unit-test with an amount1-negative fixture BEFORE integrating into the live producer.

---

## Common Pitfalls

### Pitfall 1: BalanceDelta amount1 sign-extension
**What goes wrong:** `rawInt256 & ((1n << 128n) - 1n)` extracts the lower 128 bits as an UNSIGNED value. For negative `amount1`, the high bit of the lower word is set but BigInt does not automatically sign-extend — the result is a large positive number.
**Why it happens:** BigInt arithmetic is arbitrary-precision unsigned by default. `asIntN` is the explicit sign gate.
**How to avoid:** Always use `BigInt.asIntN(128, rawInt256 & ((1n<<128n)-1n))`. Unit-test with `amount1 = -1n` (the degenerate negative case) and `amount1 = -(1n << 127n)` (the minimum int128).
**Warning signs:** `quoteMargin` returns a value that is always positive; margins display as huge positive numbers instead of near-zero negative values.

### Pitfall 2: quoteMargin called before PositionMinted
**What goes wrong:** `quoteMargin(tokenId, strike)` reverts with `PositionNotOwned` if the tokenId was not yet minted.
**Why it happens:** The contract checks ownership. If called on the same block as the mint (before confirmation), or with a wrong tokenId, it reverts.
**How to avoid:** Call `quoteMargin` strictly after a confirmed `PositionMinted` log decoded from the receipt. Extract the tokenId from the decoded log (NOT from the `resolveFromMandate` return value — it may not be available from the walletClient's response).
**Warning signs:** `quoteMargin` always reverts even though the tx confirmed.

### Pitfall 3: wagmi switchChain + isolated chain
**What goes wrong:** wagmi `useSwitchChain` or `switchChain` will fail or no-op if the target chain is not in `wagmiConfig.chains`. This is by design — wagmi validates the chain registry.
**Why it happens:** The buildbear chain is explicitly kept out of wagmiConfig (isolation invariant).
**How to avoid:** Use raw `window.ethereum.request({ method: 'wallet_addEthereumChain' / 'wallet_switchEthereumChain' })`. Then build a standalone viem wallet client from `window.ethereum`. Do NOT use wagmi's `useWriteContract` hook for this tx.
**Warning signs:** `switchChain` silently fails or throws "chain not configured".

### Pitfall 4: Static JSON import BigInt rehydration
**What goes wrong:** `buildbear-deployments.json` has no BigInt fields (all values are strings/numbers) but ABI JSON files do contain type strings that need to be used as typed const. Dynamic `require` with runtime path resolution fails under Turbopack.
**Why it happens:** Turbopack ignores `webpack.config.resolve.alias` — the Phase-2/6 burn class.
**How to avoid:** Use static `import rawDeployment from './buildbear-deployments.json'` with a relative path (not `process.cwd()`). The tsconfig `@/lib/apps/abrigo/cornerstone/artifact-loader` alias handles the rest.
**Warning signs:** Missing JSON at runtime; `Cannot find module` errors in production build.

### Pitfall 5: RepresentativenessAssessed log in receipt
**What goes wrong:** The executor emits a `RepresentativenessAssessed` event on every mint. If `decodeEventLog` is called with `strict: true`, it throws on this unrecognized event.
**Why it happens:** The FE ABI only includes `ExecutorDecided` and `PositionMinted`; the contract emits more.
**How to avoid:** Use `strict: false` in `decodeEventLog`, or catch and ignore errors per log (try/catch pattern).
**Warning signs:** Live tx confirms but the FE throws "No matching event" error during log parsing.

### Pitfall 6: Freshness gate race condition at confirmation time
**What goes wrong:** The freshness gate passes at mount-time (`numberOfLegs == 0`), but by the time Confirm is clicked, someone else has minted on the same sandbox (unlikely but possible). The tx reverts with `AccountInsolvent`.
**Why it happens:** The gate is a point-in-time check, not a lock.
**How to avoid:** The receipt status === 0 (reverted) path is already specified in §4a — render the honest revert state and offer the mock fallback. No additional mitigation needed; the error path handles it.

---

## Code Examples

### ExecutorDecidedView — reconciled fields (spec §2)

```typescript
// Source: confirmed from MacroHedgeExecutor.sol compiled ABI
// and spec §2 reconciliation rules

export type ExecutorDecidedView = {
  kind: 'ExecutorDecided'
  // New fields from real ABI (replacing provisional fields):
  regimeZt: number               // uint8 → number (0=Contraction, 1=Expansion, 2=Neutral)
  inflationAdjustment: string    // uint256 WAD → percent string e.g. "1.20%"
  strikeTick: number             // int24 SIGNED (may be negative)
  regimeWidth: number            // int24 SIGNED (may be negative)
  parametricHedged: boolean
  nonErgodicDisclosed: boolean
  rationale: string              // verbatim free-text
  // Retained for HedgeDecisionCardV2 compatibility:
  hedgeLegParams: HedgeLegParamsView  // populated from ExecutorDecided + quoteMargin
}
```

### WAD → percent formatter

```typescript
// inflationAdjustmentWad: uint256 (1e18 scale) → percent string
// e.g. 56800000000000000n (5.68% * 1e18 / 100) → "5.68%"
// WAD convention: 1e18 = 100% → divide by 1e16 for percent
function formatWadToPercent(wad: bigint): string {
  const bps = Number(wad / 10n**14n)  // → basis points × 100 (avoid float loss)
  return (bps / 100).toFixed(2) + '%'
}
```

### TokenId.strike(0) extraction

The `positionId` returned from `PositionMinted` is a `uint256` TokenId (Panoptic format). The strike for leg 0 is packed inside this uint256. The Panoptic SDK provides a `strike(tokenId, legIndex)` utility. In this project, the `mintedStrike` from the artifact is 360360 and HAPPENS to equal the encoded strike, but per spec §4a (M2) the strike MUST be read from the minted TokenId leg 0 — not from the artifact.

```typescript
// Panoptic TokenId: strike for leg 0 is encoded at bits [80..103] (int24)
// Source: panoptic-v2-core TokenId encoding
// The panoptic-sdk in abrigo-somnia provides this utility:
// import { getStrike } from '@/lib/apps/abrigo/somnia/abi' (if available)
// Otherwise: extract with BigInt shifts (see Panoptic docs)
// NOTE: For Phase 9, confirm the exact bit offset from the panoptic-sdk generated.ts
// before implementing — this is the one field requiring ABI-level verification.

// Temporary safe approach: use mintedStrike from artifact as a FALLBACK
// but verify it equals the decoded value in the unit test.
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Phase 8: mock producer only | Phase 9: live producer behind same seam + mock fallback | Phase 9 (now) | No downstream component changes |
| Phase 8: no chain switching | Phase 9: raw EIP-1193 wallet_addEthereumChain for isolated chain | Phase 9 | wagmi hooks not usable for write |
| Phase 6/7: isolated chain via defineChain | Phase 9: same pattern for buildbear.ts | Pattern established | Direct copy, no new learning |

**Deprecated/outdated:**
- The provisional `ExecutorDecidedEvent` shape in `events.ts` (missing 6 new fields): replace entirely with the real-ABI shape
- `fromMockEvent` for the `ExecutorDecided` case: retain for mock fallback but the real shape differs significantly

---

## Open Questions

1. **TokenId.strike(0) bit extraction**
   - What we know: Panoptic TokenId encodes strike, width, isLong, tokenType, riskPartner per leg; the panoptic-sdk in abrigo-somnia has `getStrike` / generated utilities
   - What's unclear: The exact bit offset for leg 0 strike in the Panoptic v2 TokenId encoding — need to confirm from `panoptic-sdk/src/generated.ts` or the `TokenId.sol` in v4-core
   - Recommendation: Wave 0 task reads `contracts/lib/panoptic-sdk/src/generated.ts` and pins the extraction formula; add a unit test asserting `extractStrike(PositionMinted.positionId) === 360360` against the recorded mintTxHash

2. **BuildBear RPC CORS policy**
   - What we know: BuildBear is a developer tooling platform; their RPC is designed for browser access; the probe is `fetch(rpcUrl, {method:'POST', body: eth_chainId})`
   - What's unclear: Whether their CORS headers allow arbitrary browser origins (the actual header is unknown without probing)
   - Recommendation: Ship the Route-Handler proxy (Wave 0) regardless; do the probe in the Wave 0 task to inform the Wave 1 transport choice

3. **`window.ethereum` availability when no wallet extension**
   - What we know: RainbowKit is already installed; the gate checks wallet availability before offering live-submit
   - What's unclear: Whether `window.ethereum` is defined when WalletConnect is used (as opposed to MetaMask injection)
   - Recommendation: Gate on `typeof window !== 'undefined' && window.ethereum != null`; WalletConnect injects a proxy `window.ethereum` after connection via the wagmi connector — test both paths in the Wave 1 freshness gate

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest v4.1.6 (unit) + Playwright v1.60.0 (e2e) |
| Config file | `vitest.config.ts` + `playwright.config.ts` |
| Quick run command | `pnpm vitest run tests/unit/cornerstone/` |
| Full suite command | `pnpm run test:impeccable && pnpm vitest run && pnpm playwright test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MOD5-ABI | `decodeBalanceDelta` returns correct signed amount0/amount1 incl. amount1-negative fixture | unit | `pnpm vitest run tests/unit/cornerstone/balance-delta.test.ts` | ❌ Wave 0 |
| MOD5-ABI | `fromChainLog` produces correct `WorkflowEventView` for a synthetic `ExecutorDecided` log | unit | `pnpm vitest run tests/unit/cornerstone/from-chain-log.test.ts` | ❌ Wave 0 |
| MOD5-ABI | int24 sign preservation: negative strikeTick decoded correctly | unit | included in from-chain-log.test.ts | ❌ Wave 0 |
| MOD5-ABI | WAD formatter: `formatWadToPercent(56800000000000000n) === '5.68%'` | unit | included in from-chain-log.test.ts | ❌ Wave 0 |
| MOD5-CHAIN | `isExpired` returns false for fresh capturedAt, true after 3 days | unit | `pnpm vitest run tests/unit/cornerstone/artifact-loader.test.ts` | ❌ Wave 0 |
| MOD5-CHAIN | `buildbear.ts` exports NOT re-exported from wagmi/config or instruments.ts (isolation) | architecture grep | `grep -r "BuildBearChainId\|buildbear" lib/wagmi/ lib/apps/abrigo/instruments.ts` (must be empty) | ❌ Wave 0 |
| MOD5-LIVE | Freshness gate: `numberOfLegs == 0` → offers live-submit; `> 0` → demo mode | integration/e2e | `pnpm playwright test tests/e2e/cornerstone-live-gate.spec.ts` | ❌ Wave 1 |
| MOD5-LIVE | Live tx sequence: submitting→pending→confirmed state rows append-only | e2e (msw mock of RPC) | included in cornerstone-live-gate.spec.ts | ❌ Wave 1 |
| MOD5-LIVE | Revert state: receipt status 0 → honest revert message, no "minted" claim | e2e | included in cornerstone-live-gate.spec.ts | ❌ Wave 1 |
| MOD5-FALLBACK | Demo mode: ModeBanner shows demo label, no tx hash, no block link | e2e grep | `pnpm playwright test tests/e2e/cornerstone-fallback.spec.ts` | ❌ Wave 1 |
| MOD5-FALLBACK | Honesty greps: no "executed"/"realized"/"ejecutad"/"realizad" in DOM | e2e | included in honesty-invariants grep test | ❌ Wave 2 |
| MOD5-SURFACE | On-chain evidence panel shows real tx hash + strike + TokenId after confirmed | e2e | `pnpm playwright test tests/e2e/cornerstone-surfaces.spec.ts` | ❌ Wave 2 |
| MOD5-SURFACE | ExecutorDecided rationale panel: collapsed by default, expands on trigger | e2e | included in cornerstone-surfaces.spec.ts | ❌ Wave 2 |
| MOD5-SURFACE | Cost panel: static text "not deployed for this demo", no numbers | e2e grep | included in cornerstone-surfaces.spec.ts | ❌ Wave 2 |
| MOD5-SURFACE | fork-verified pill: never `--status-pass` color, always NEUTRAL | e2e visual | Evidence Collector live-verify | Manual |
| CROSS-09 | Every status pill has color + icon + text (no color-alone) | e2e | included in honesty-invariants | ❌ Wave 2 |
| CROSS-09 | address(0) / unknown school address → em-dash, never raw hex | unit | included in from-chain-log.test.ts (`schoolLabelFromAddress`) | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm vitest run tests/unit/cornerstone/` (< 10s)
- **Per wave merge:** `pnpm run test:impeccable && pnpm vitest run && pnpm playwright test` against production build
- **Phase gate:** Full suite green before `/gsd:verify-work`; Evidence Collector live-verify against freshly provisioned BuildBear sandbox

### Wave 0 Gaps (must exist before Wave 1 implementation)
- [ ] `tests/unit/cornerstone/balance-delta.test.ts` — `decodeBalanceDelta` with amount1-negative fixture
- [ ] `tests/unit/cornerstone/from-chain-log.test.ts` — `fromChainLog` ExecutorDecided + PositionMinted + signed int24 + WAD formatter
- [ ] `tests/unit/cornerstone/artifact-loader.test.ts` — `isExpired` boundary cases
- [ ] `lib/apps/abrigo/cornerstone/buildbear.ts` — isolated chain (mirrors chain.ts)
- [ ] `lib/apps/abrigo/cornerstone/artifact-loader.ts` — typed loader + isExpired
- [ ] `lib/apps/abrigo/cornerstone/buildbear-deployments.json` — copy from abrigo-somnia/contracts/script/out/

---

## Sources

### Primary (HIGH confidence)
- `/home/jmsbpp/apps/d2p/abrigo/abrigo-somnia/contracts/out/MacroHedgeExecutor.sol/MacroHedgeExecutor.json` — confirmed `ExecutorDecided` 8-field ABI, `PositionMinted` 2-indexed-topics + positionSize in data, `quoteMargin` returns `int256` (BalanceDelta), `resolveFromMandate` full ABI
- `/home/jmsbpp/apps/d2p/abrigo/abrigo-somnia/contracts/lib/v4-core/src/types/BalanceDelta.sol` — confirmed upper128 = sar(128,v), lower128 = signextend(15,v); algorithm for decoder
- `/home/jmsbpp/apps/d2p/abrigo/abrigo-somnia/contracts/out/IPanopticData.sol/IPanopticData.json` — confirmed `numberOfLegs(address) returns (uint256)` signature
- `/home/jmsbpp/apps/d2p/abrigo/abrigo-somnia/contracts/script/out/buildbear-deployments.json` — confirmed artifact shape (chainId, executor, pool, rpcUrl, mintTxHash, mintedStrike, capturedAt)
- `/home/jmsbpp/apps/d2p/frontend/lib/apps/abrigo/somnia/chain.ts` — confirmed isolated chain pattern (defineChain + createPublicClient, NOT in wagmiConfig)
- `/home/jmsbpp/apps/d2p/frontend/lib/apps/abrigo/cornerstone/events.ts` — existing WorkflowEvent union + fromMockEvent + view types (the Phase-9 seam)
- `/home/jmsbpp/apps/d2p/frontend/lib/apps/abrigo/cornerstone/workflow-store.ts` — UNCHANGED seam confirmed; RunState and StoreEvent types
- `/home/jmsbpp/apps/d2p/frontend/lib/wagmi/config.ts` — confirmed 5-chain wagmiConfig; buildbear must NOT be added
- `docs/superpowers/specs/2026-06-07-module5-cornerstone-live-tx-design.md` — canonical spec v2 (2-way-review-clean)
- `.planning/phases/09-cornerstone-live-tx-integration/09-UI-SPEC.md` — approved UI design contract

### Secondary (MEDIUM confidence)
- viem v2 `writeContract` + `waitForTransactionReceipt` + `decodeEventLog` — patterns consistent with viem@2.48.11 installed version; verified against project's existing usage in somnia/reader.ts
- EIP-1193 `wallet_addEthereumChain` + `wallet_switchEthereumChain` — standard MetaMask/EIP-1193 RPC methods; well-documented; used by wagmi internally for registered chains

### Tertiary (LOW confidence — flag for validation)
- BuildBear RPC CORS policy — unknown without live probe; assumed browser-accessible based on BuildBear's positioning as a browser-first fork tool, but requires the Wave 0 `eth_chainId` probe to confirm
- TokenId.strike(0) bit offset — not directly confirmed from compiled ABI; requires reading `panoptic-sdk/src/generated.ts` or `TokenId.sol` in Wave 0

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed; no new installs
- Architecture: HIGH — isolated chain pattern confirmed from existing somnia/chain.ts; ABI shapes confirmed from compiled artifacts
- BalanceDelta decoder: HIGH — algorithm directly verified from BalanceDelta.sol source
- freshness gate: HIGH — `numberOfLegs` ABI confirmed from IPanopticData.json
- CORS decision: MEDIUM — BuildBear RPC policy not confirmed; proxy recommendation is conservative
- TokenId.strike(0): LOW — bit offset not confirmed; requires Wave 0 investigation
- Pitfalls: HIGH — each pitfall is mechanically derivable from the ABI + BigInt semantics

**Research date:** 2026-06-07
**Valid until:** 2026-06-14 (7 days — sandbox TTL is 3 days; re-provision expected before demo)
