# Phase 11: Frontend Server Routes - Context

**Gathered:** 2026-06-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Two new Node-runtime API routes + a mode variant + the Somnia decoupling cut, all **unit-testable against a mock artifact** (no live BuildBear fork needed — that's Phase 12's convergence):
1. **`POST /api/cornerstone/buildbear-sign`** — server-signs `resolveFromMandate` with the dedicated `DEMO_SIGNER_PK` (signer-balance pre-flight), returns the view objects/tx data.
2. **`POST /api/cornerstone/buildbear-reset`** — `evm_revert(snapshotId)` + immediate re-`evm_snapshot`.
3. **`'buildbear'` `CornerstoneMode`** in `mode.ts`.
4. **Somnia decoupling** — `handleLiveConfirm` hard-branches on `resolvedMode === 'buildbear'` BEFORE any `/api/abrigo/agent1` reference (BuildBear path never calls Somnia on any error path).

Requirements: MINT-01, MINT-02, MINT-03. Out of scope: wiring the UI one-click + RunState (Phase 12), evidence surfaces + `pnpm demo` (Phase 13).
</domain>

<decisions>
## Implementation Decisions

### Reset auth (discussed)
- **`buildbear-reset` is OPEN to anyone** — no operator secret. Any judge can reset the fork to its clean snapshot before their run.
- **Accepted trade-off / documented limitation:** on the SHARED hosted sandbox this is griefable (one judge resetting mid-another's run); isolation comes from the OPS-07 per-judge local `pnpm demo` sandbox, and the hosted sandbox is cheap to re-provision (OPS-03/04). The planner must surface this as an explicit documented limitation, NOT hide it. *(The Phase 11 backend 3-step review pipeline may flag the public-reset surface — that is the user's accepted call; keep it open.)*

### `'buildbear'` mode trigger (discussed)
- The live path activates ONLY when **both**: (a) the URL opts in — `?mode=buildbear` (extend `parseMode` to accept `'buildbear'`), AND (b) `DEMO_SIGNER_PK` is present server-side (deployed Vercel env, or local `pnpm demo`).
- Without the key → the route reports `not-configured` and the cornerstone stays **replay** (zero-secret default on a plain clone). No accidental live mode.

### `buildbear-sign` response shape (discussed)
- **Discriminated reason codes** (never throws bare):
  - Success: `{ ok: true, txHash, ...view objects (strategist/executor/positionMinted), margins, blockNumber }`
  - Failure: `{ ok: false, reason: 'fork-used' | 'rpc-unreachable' | 'signer-gas' | 'reverted' | 'not-configured', detail? }`
- These `reason` codes map 1:1 to the Phase 12 `RunState` (`fork-used` / `failed`) + the specific `aria-live` degradation reasons (HONEST-01/02/03). `"fork used"` revert (EXEC-01) → `reason: 'fork-used'`.

### Claude's Discretion
- Exact viem signing wiring (follow Phase 10 `spike-viem-sign.ts`: `privateKeyToAccount` + `createWalletClient` + the pinned HedgeMandate ABI tuple), receipt-wait + log decode, `quoteMargin` read strictly after `PositionMinted`.
- `buildbear-reset` JSON-RPC call shapes (`evm_revert`/`evm_snapshot` via the artifact `rpcUrl` or the `/api/cornerstone/rpc` proxy) and how the new snapshot id is returned/surfaced (no KV persistence — OPS deferred RESET-01).
- The MINT-03 mandate source: `runWorkflowLive`'s `upstream` swaps from the live Somnia Agent-1 response to the **recorded replay artifact** mandate (`buildLiveMandate` re-hydration stays; the source becomes the committed replay snapshot, not `/api/abrigo/agent1`).
- Unit-test mocking strategy (mock the artifact + the fork RPC fetch; routes are `nodejs` runtime).

### CI / governance (carry-forward)
- Routes ride the `vitest` lane (OPS-06); `DEMO_SIGNER_PK` server-only, `runtime='nodejs'`, path-scoped key-leak grep (zero hits outside `app/api/`; note `privateKeyToAccount` legitimately lives in `app/api/abrigo/agent1`). All code via PR; this phase's plan takes the backend 3-step review pipeline before execution.
</decisions>

<canonical_refs>
## Canonical References

### Requirements & roadmap
- `.planning/REQUIREMENTS.md` — MINT-01/02/03; locked decisions 5 (EXEC-01 `"fork used"`) & 6 (dedicated `DEMO_SIGNER_PK`); OPS-05 (single-concurrent-judge), OPS-07 (`pnpm demo` local mode)
- `.planning/ROADMAP.md` — Phase 11 block (success criteria, security invariant, the CORS-proxy + decoupling notes)

### Phase 10 (just-merged foundation)
- `.planning/phases/10-backend-on-chain-single-use-guard-no-mint-provisioning-variant/10-RESEARCH.md` — exact viem signing pattern, BuildBear RPC method shapes, the `"fork used"` revert contract
- `packages/frontend/scripts/spike-viem-sign.ts` — the reference dry-run: `privateKeyToAccount(DEMO_SIGNER_PK)` + `createWalletClient` + the pinned 5-field HedgeMandate ABI tuple, simulate-only
- `packages/frontend/lib/apps/abrigo/cornerstone/artifact-loader.ts` — exported `validateDeployment`; `BuildBearDeployment` with `snapshotId?`, `mintTxHash: string | null`
- `packages/frontend/lib/apps/abrigo/cornerstone/buildbear.ts` — `createBuildBearChain` / public client factory (rpcUrl from artifact)

### Code to modify / pattern off
- `packages/frontend/app/api/abrigo/agent1/route.ts` — the server-signing route pattern (nodejs runtime, env key, shared-secret header, `privateKeyToAccount`, `writeContract`) to mirror for `buildbear-sign`
- `packages/frontend/app/api/cornerstone/rpc/route.ts` — the existing CORS proxy to reuse for freshness/`evm_*` reads
- `packages/frontend/lib/apps/abrigo/cornerstone/mode.ts` — `CornerstoneMode = 'live'|'replay'|'mock'` + `parseMode` (add `'buildbear'`)
- `packages/frontend/components/defi/cornerstone/CornerstoneClientShell.tsx` — `handleLiveConfirm` (the Somnia POST at the agent1 fetch + the 3 silent `setResolvedMode('replay')` flips — the decoupling cut)
- `packages/frontend/lib/apps/abrigo/cornerstone/workflow-engine.ts` — `buildLiveMandate` + `UpstreamResult` (MINT-03: swap upstream from Somnia Agent-1 to the recorded replay mandate)
- `packages/backend/contracts/src/types/HedgeMandate.sol` — the 5-field tuple `(address, bytes32, uint256, uint32, bool)` the sign route's ABI must match
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `app/api/abrigo/agent1/route.ts` — proven server-signing route: nodejs runtime, `privateKeyToAccount(env key)`, shared-secret header, `client.writeContract`. `buildbear-sign` mirrors it (BuildBear chain instead of Somnia, dedicated key, discriminated-reason responses).
- `app/api/cornerstone/rpc/route.ts` — keyless CORS proxy; reuse for the `evm_revert`/`evm_snapshot`/freshness reads so browser-origin CORS can't force a silent replay.
- `scripts/spike-viem-sign.ts` (Phase 10) — the exact viem signing + pinned mandate ABI to lift into `buildbear-sign`.
- `lib/apps/abrigo/cornerstone/{mode.ts,buildbear.ts,artifact-loader.ts,workflow-engine.ts}` — the seam this phase extends.

### Established Patterns
- viem `createWalletClient` + `privateKeyToAccount` from a server-only env key; `nodejs` route runtime.
- The cornerstone `workflow-store`/`WorkflowEvent` seam (producers feed the UI); `buildLiveMandate` re-hydrates the serialized mandate (D4 chainId override + PKE pin).
- Anti-fishing: no silent `setResolvedMode('replay')` — every degradation announced with a specific reason (the discriminated `reason` codes feed this).

### Integration Points
- New routes under `app/api/cornerstone/{buildbear-sign,buildbear-reset}/route.ts`.
- `mode.ts` `parseMode` accepts `'buildbear'`; `handleLiveConfirm` branches on it BEFORE the agent1 fetch.
- `DEMO_SIGNER_PK` server env (gitignored `.env` locally / Vercel env / `.env.demo` via `pnpm demo` in Phase 13).
</code_context>

<specifics>
## Specific Ideas

- Decouple Somnia FIRST (the hard-branch), THEN build the routes — reversing risks re-introducing the v2.0 outage coupling.
- The discriminated `reason` codes are a cross-layer contract with Phase 12's `RunState` — keep the exact string set stable (`fork-used` matches the EXEC-01 `"fork used"` revert).
- Open reset is a deliberate, documented limitation — the runbook (Phase 13) must state it; do not silently "secure" it against the user's decision.
</specifics>

<deferred>
## Deferred Ideas

- Operator-only reset (shared-secret header) — considered and REJECTED for v3.0 (user chose open reset); revisit if shared-sandbox griefing becomes a real problem.
- Explicit in-UI "run live" toggle — Phase 12 (UI wiring), not here.
- KV-backed snapshot-id persistence / auto-reset — RESET-01 (Future, out of v3.0).
</deferred>

---

*Phase: 11-frontend-server-routes*
*Context gathered: 2026-06-09*
