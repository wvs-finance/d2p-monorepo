# Project Research Summary

**Project:** d2p Finance Frontend — Milestone v3.0 Judge-Runnable Live BuildBear Demo
**Domain:** EVM fork-based one-click pre-funded live on-chain demo with shared-fork reset guard
**Researched:** 2026-06-08
**Confidence:** HIGH (stack and architecture derived directly from existing codebase; BuildBear RPC methods live-verified in provision script; pitfalls codebase-grounded)

## Executive Summary

v3.0 is a targeted integration milestone, not a greenfield build. The cornerstone live-tx path (`runWorkflowLive`) is already fully implemented in `workflow-engine.ts` — the only reason it has not fired in production is (a) the `void writeContractAsync` stub that prevents the actual write, and (b) the upstream dependency on the live Somnia Agent-1 call which has been outaged. Both blockers are resolved by a single architectural cut: a new `handleBuildBearConfirm()` branch in `CornerstoneClientShell` that bypasses the Somnia call entirely, uses a server-side route (`/api/cornerstone/buildbear-sign`) with a viem local account to sign and broadcast `resolveFromMandate` against the BuildBear fork, and returns the full receipt and decoded log views to the client. The Somnia decoupling must be the first task in the frontend phase — everything downstream depends on the upstream being the recorded mandate, not a live Somnia RPC.

The backend provisioning work is the critical-path blocker for frontend end-to-end testing. `ProvisionBuildBearDemo.s.sol` and its shell wrapper must gain a `--no-mint` / `SKIP_MINT=true` variant that deploys and funds the executor without calling `resolveFromMandate`. This leaves `numberOfLegs == 0` (the freshness gate), takes an `evm_snapshot` checkpoint, and writes the snapshot ID into `buildbear-deployments.json` alongside existing fields. The frontend artifact-loader must treat `mintTxHash` as optional. Only after a valid `--no-mint` artifact is committed and mirrored to the frontend can the live path be tested end-to-end. The two tracks (backend provisioning and frontend server-route development) can proceed in parallel up to integration.

The dominant risks are the BuildBear 3-day TTL expiring before judging, snapshot IDs becoming stale across sandbox restarts, and the shared-fork state being left dirty (`numberOfLegs > 0`) after any test run. All three are mitigated by the reset guard: `evm_revert` to the stored snapshot ID on mount when legs > 0, followed immediately by a new `evm_snapshot` call (the snapshot is consumed on use — this re-snapshot step is mandatory). A hard additional requirement is that any failure in the live path must emit a `{ status: 'failed', reason }` terminal `RunState` — the anti-fishing discipline prohibits silent fallback to replay mode. The `RunState` union currently has no `failed` variant; this must be added in the same task that un-voids the write.

## Key Findings

### Recommended Stack

No new dependencies are required for v3.0. Every RPC method and signing primitive needed is already in the locked dependency tree. `viem`'s `privateKeyToAccount` and `createWalletClient` ship inside the `viem` version already in the repo. The only new environment variables are `DEMO_SIGNER_PK` (server-only, never `NEXT_PUBLIC_`) and `BUILDBEAR_SNAPSHOT_ID` (stored in the artifact JSON and a KV store, not a separate standalone env var).

**Core net-new technologies (all zero new installs):**

- `viem` `privateKeyToAccount` + `createWalletClient`: Server-side local account signing in `/api/cornerstone/buildbear-sign` — already ships in the locked viem version; the demo key never reaches the browser.
- `hardhat_setBalance` (BuildBear JSON-RPC): Fund the demo signer's native MATIC for gas — live-verified in `provision-buildbear-demo.sh`. `anvil_setBalance` is rejected by BuildBear and must not be used.
- `buildbear_ERC20Faucet` (BuildBear JSON-RPC): Fund wCOP + USDC balances; balance is whole-token count not wei — live-verified in provision script. Requires `hardhat_setNextBlockBaseFeePerGas` + `evm_mine` basefee-drop workaround before calling on a Polygon fork.
- `evm_snapshot` / `evm_revert` (BuildBear JSON-RPC): Checkpoint and restore fork state. A snapshot is one-use — `evm_revert` consumes it; the reset guard must immediately call `evm_snapshot` again after every revert to persist a new valid ID.
- `vm.envOr("SKIP_MINT", false)` (Foundry cheatcode): Gate the `resolveFromMandate` step in `ProvisionBuildBearDemo.s.sol`. The clean Foundry-idiomatic pattern for conditional script steps; no separate script file needed.

**Snapshot persistence for hackathon scale:** Store the current snapshot ID in Upstash Redis (one key, free tier). Module-level in-memory storage is insufficient — it does not survive serverless cold starts.

### Expected Features

All four researchers converge on a tight, well-scoped MVP. Every item maps to an existing component that needs to be either un-stubbed or wired up.

**Must have (table stakes — v3.0 blocks on these):**

- Pre-funded demo signer signs the write: no judge wallet required.
- `void writeContractAsync` stub removed; real `resolveFromMandate` wired via server route.
- Somnia decoupling FIRST: `handleLiveConfirm()` branches on `resolvedMode` before touching `agent1`; the BuildBear path never calls the Somnia endpoint.
- Real tx hash in `LiveTxStateRow` confirmed state.
- BuildBear explorer link in `OnChainEvidencePanel`: only rendered after confirmed receipt, never faked.
- `numberOfLegs > 0` advisory gate (`RunState: 'fork-used'`): explicit user-visible state, not silent fallback to replay.
- `RunState: 'failed'` terminal state: mandatory for anti-fishing discipline.
- Backend `--no-mint` / fresh-executor provisioning variant: closes the v2.0 cross-repo gap.
- Zero-secret judge runbook: corrected `.env.example`, README test lane.

**Should have (differentiators — add after core works):**

- Block number in confirmed row: one field from `receipt.blockNumber`, zero logic.
- Somnia operator-only advisory in `ModeBanner` live disclosure: string update only.
- "BuildBear sandbox · fork-verified" pill relabeling: string update only.
- Margin delta in evidence panel: already emitted by `runWorkflowLive` step j; surface in `OnChainEvidencePanel`.

**Defer to post-hackathon:**

- Automated fork reset on detected legs > 0 (operator reset is sufficient at hackathon scale).
- Per-judge fork provisioning (locked out by product decision).
- Streaming cross-judge state sync.

**Honesty invariants that must not regress:**

1. No silent mode substitution — every live-to-replay degradation announced via `aria-live` with specific reason.
2. No fake explorer links — only render when a confirmed receipt URL is present.
3. Mode label always visible — `ModeBanner` is always the first rendered element.
4. `ForkVerifiedPill` uses neutral styling — never green / `status-pass` colors.
5. Demo signer disclosed — `disclosureEs`/`disclosureEn` strings must acknowledge the pre-funded signer.

### Architecture Approach

The architecture is a mode-branched extension of the existing `CornerstoneClientShell`. The Somnia decoupling cut is a hard branch at the top of `handleLiveConfirm()` before any external service is touched. The BuildBear branch calls a new `handleBuildBearConfirm()` function that posts to a new server route, receives the full tx result (server-side signing recommended), and drives the workflow store via `store.emit()` calls that feed the existing `RunState` machine. The store pipeline, the `useSyncExternalStore` subscription, and all downstream UI components (`LiveTxStateRow`, `OnChainEvidencePanel`, `MintCard`, `ModeBanner`) are unchanged — they already handle all the event shapes `runWorkflowLive` would have emitted.

**Major components:**

1. `POST /api/cornerstone/buildbear-sign` (new, Node runtime): Server-side tx signing with `BUILDBEAR_DEMO_PK`. Calls `resolveFromMandate` via viem `WalletClient`, waits for receipt, decodes logs, reads `quoteMargin` strictly after `PositionMinted` log is confirmed, returns full view objects plus tx hash.
2. `POST /api/cornerstone/buildbear-reset` (new, Node runtime): Calls `evm_revert(snapshotId)` followed immediately by `evm_snapshot` to produce the next valid ID; writes new ID to KV store; returns `{ ok, reason }`.
3. `handleBuildBearConfirm()` in `CornerstoneClientShell.tsx` (new function): Orchestrates the client side of the BuildBear path; calls `buildbear-sign`; drives `store.emit()` sequence; never touches `agent1`.
4. `ProvisionBuildBearDemo.s.sol` `noMint()` entrypoint (modified): Deploys core + pool + executor + deposit-on-behalf, stops before `resolveFromMandate`. Produces artifact with `mintTxHash: null`, `snapshotId: "0x1"`.
5. `provision-buildbear-demo.sh --no-mint` variant (modified): Calls `noMint()` forge entrypoint, runs `evm_snapshot` after provision, writes `snapshotId` into `buildbear-deployments.json`, outputs artifact directly to the frontend artifact path.

**Unchanged components (no logic change required):** `runWorkflowLive`, `createWorkflowStore`, `/api/cornerstone/rpc`, `/api/abrigo/agent1`, `createBuildBearPublicClient`.

**Artifact contract for v3.0:** `buildbear-deployments.json` gains `snapshotId: "0x1"` and has `mintTxHash: null`. Required fields in `artifact-loader.ts` are reduced to `['chainId', 'executor', 'pool', 'rpcUrl', 'capturedAt']` only.

### Critical Pitfalls

1. **Somnia re-coupling** — Hard-branch `handleLiveConfirm()` before any external service call. BuildBear branch must never reference `agent1`. Verify: `grep -r "agent1\|somnia\|50312" packages/frontend/lib/apps/abrigo/cornerstone/workflow-engine.ts` returns zero live-path call sites. This is the first task in Phase 3.

2. **Shared fork state corruption (`numberOfLegs > 0`)** — Reset guard must be operational before any judge run. `evm_revert` followed immediately by `evm_snapshot` (snapshot is one-use). Surface a `'fork-used'` gate state in `FreshnessGate` — never silently degrade to replay.

3. **Silent fallback to replay (anti-fishing violation)** — Add `{ status: 'failed', reason: string }` terminal variant to `RunState` in `workflow-store.ts`. Error boundaries must not render `<CornerstoneWorkflow mode="replay" />` as their fallback. This is load-bearing, not polish.

4. **BuildBear 3-day TTL expiring mid-judging** — Re-provision fork within 24 hours of the judging window. Wire `isExpired(Date.now())` as a pre-flight check in the mount probe — render `ForkExpiredBanner` before enabling the one-click button if expired.

5. **Pre-funded key in client bundle or git** — `DEMO_SIGNER_PK` must be server-only (no `NEXT_PUBLIC_` prefix). Verify: `grep -r "NEXT_PUBLIC_.*KEY\|privateKeyToAccount" packages/frontend/` returns zero results.

6. **Artifact drift (stale executor addresses)** — The `--no-mint` provision script must output directly to `packages/frontend/lib/apps/abrigo/cornerstone/buildbear-deployments.json`. `git diff` after any provision run must show a change to the frontend artifact.

7. **`evm_snapshot` persistence across sandbox restarts** — Treat as unreliable until empirically confirmed. Store snapshot ID in Upstash Redis with probe-before-use validation in the reset route.

## Implications for Roadmap

All four research files converge on a two-track build order. Backend provisioning is the critical-path blocker; frontend server route development can proceed in parallel but cannot be integration-tested until the `--no-mint` artifact is available.

### Phase 1: Backend Provisioning Variant

**Rationale:** Backend produces the only cross-package artifact (`buildbear-deployments.json`). Frontend end-to-end integration is impossible without an artifact where `numberOfLegs == 0` and `snapshotId` is present.

**Delivers:** `ProvisionBuildBearDemo.s.sol` `noMint()` entrypoint; `provision-buildbear-demo.sh --no-mint` with automatic `evm_snapshot`; `buildbear-deployments.json` with `snapshotId` and `mintTxHash: null` output directly to the frontend artifact path; `artifact-loader.ts` with `mintTxHash` made optional.

**Addresses:** Backend `--no-mint` provisioning variant (P1); `numberOfLegs == 0` freshness gate enabler; demo signer funding (Pitfall 5) — `hardhat_setBalance` + `buildbear_ERC20Faucet` with basefee-drop workaround.

**Avoids:** Artifact drift (Pitfall 6) — direct output path; shared fork state corruption (Pitfall 1) — executor provisioned with zero legs.

**Research flags:** None. RPC method shapes are live-verified. `vm.envOr` is a standard cheatcode.

### Phase 2: Frontend Server Routes (parallel with Phase 1)

**Rationale:** Both new server routes and the `mode.ts` extension can be developed and unit-tested with a pinned mock artifact. No live BuildBear fork is required during development. Integration testing requires Phase 1 output.

**Delivers:** `POST /api/cornerstone/buildbear-sign` (server-side viem signing, full receipt decoding, `quoteMargin` read strictly after `PositionMinted`); `POST /api/cornerstone/buildbear-reset` (`evm_revert` + re-snapshot + KV persistence); `mode.ts` `'buildbear'` variant; Upstash Redis integration for snapshot ID persistence.

**Uses:** `viem` `privateKeyToAccount` + `createWalletClient` (zero new installs); `evm_revert` / `evm_snapshot` JSON-RPC; Upstash Redis (one key, free tier).

**Implements:** Server-side pre-funded signing pattern; artifact-driven reset pattern.

**Avoids:** Private key in client bundle (Pitfall 2); `quoteMargin` before `PositionMinted` (integration gotcha); `anvil_setBalance` (rejected by BuildBear — use `hardhat_setBalance` exclusively).

**Research flags:** Snapshot ID persistence mechanism (Edge Config vs. Upstash) — confirm exact write API during implementation; BuildBear snapshot persistence across server restarts — implement probe-before-use defensively.

### Phase 3: Frontend Integration — Somnia Decoupling + Live Path Un-Defer

**Rationale:** Somnia decoupling is the first task within this phase and a prerequisite for all others. Once the decoupling cut is made and `handleBuildBearConfirm()` exists, the `void writeContractAsync` stub can be removed and the full store emit sequence wired. Requires Phase 1 artifact and Phase 2 routes deployed.

**Delivers:** `CornerstoneClientShell.tsx` with `handleBuildBearConfirm()` and mode-branched `handleLiveConfirm()`; `RunState: 'failed'` terminal variant in `workflow-store.ts`; `RunState: 'fork-used'` advisory in `FreshnessGate`; reset-guard call in `runMountProbe()` when legs > 0; `buildbear-deployments.json` re-mirrored from Phase 1.

**Implements:** Mode-branched confirm handler; workflow-store event flow for real tx; reset-guard mount flow.

**Avoids:** Somnia re-coupling (Pitfall 7) — verified by grep after implementation; silent fallback to replay (Pitfall 4) — `failed` terminal state is load-bearing; BuildBear TTL expiry (Pitfall 3) — `isExpired` pre-flight in mount probe.

**Research flags:** None. `runWorkflowLive` is already complete. All component event shapes are already correct.

### Phase 4: Evidence Panel + Anti-Fishing Polish

**Rationale:** All P2 differentiators are copy or single-field wires that depend on the confirmed receipt being available from Phase 3.

**Delivers:** Block number in confirmed row; margin delta in evidence panel; Somnia operator-only advisory in `ModeBanner` live disclosure; "BuildBear sandbox · fork-verified" pill relabeling; corrected `.env.example`; zero-secret judge runbook in README.

**Avoids:** Fake explorer links (only render after confirmed receipt); `ForkVerifiedPill` neutral styling invariant.

**Research flags:** None.

### Phase Ordering Rationale

- Phase 1 before Phase 3 because the `--no-mint` artifact is the single cross-package interface; Phase 3 cannot be end-to-end tested without it.
- Phase 2 is parallel to Phase 1 because server routes can be developed and unit-tested against a mock artifact.
- Somnia decoupling is the first task of Phase 3, not a separate phase, because it is a prerequisite for every other Phase 3 task but has no external dependencies of its own.
- Phase 4 is last because it has zero blocking dependencies; adding it before Phase 3 works adds noise to integration testing.

### Research Flags

Phases needing deeper investigation during planning:

- **Phase 2 (KV store for snapshot ID):** Confirm exact Vercel Edge Config write API vs. Upstash Redis SDK. Pick Upstash Redis for simpler local dev parity. Low-stakes decision.
- **Phase 2 (snapshot persistence):** BuildBear does not document whether `evm_snapshot` IDs survive sandbox node restarts. Implement probe-before-use in the reset route; return `{ ok: false, reason: 'snapshot-stale' }` if probe fails, which causes mount probe to degrade with an explicit "fork reset required" advisory.

Phases with well-documented patterns (skip research-phase):

- **Phase 1 (Forge scripting):** `vm.envOr` is standard; `provision-buildbear-demo.sh` already demonstrates correct RPC method shapes.
- **Phase 3 (Store wiring):** `runWorkflowLive` is already implemented; only removing the void and adding the `failed` terminal state.
- **Phase 4 (Evidence polish):** All string/field updates with zero external dependencies.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Zero new deps; BuildBear RPC methods live-verified in provision script; viem signing patterns verified from official docs |
| Features | HIGH | Every feature maps to a named existing component; scope is tightly bounded to un-stubbing + wiring |
| Architecture | HIGH | Structure derived directly from existing code contracts; all component boundaries and event shapes are known; MEDIUM for `--no-mint` Solidity entrypoint shape (new work) |
| Pitfalls | HIGH | Codebase-grounded; all pitfalls reference specific file locations and function names |

**Overall confidence:** HIGH

### Gaps to Address

- **BuildBear snapshot persistence across sandbox restarts:** Not documented. Mitigation is defensive KV storage with probe-before-use validation. Confirm empirically on first `--no-mint` provision run.

- **Exact demo-signer mechanism (Option A vs. Option B):** Roadmap commits to Option A (full server-side signing in `buildbear-sign` route). If Option A proves infeasible due to viem WalletClient compatibility with the BuildBear fork's chain config, fall back to Option B (client wagmi signer with pre-funded key) and document the friction trade-off explicitly.

- **3-day TTL mitigation:** Re-provisioning within 24 hours of judging is the mitigation, but the exact judging window date is not confirmed. The runbook must include "provision fork no earlier than T-24h before judging." Upgrading to the BuildBear Developer plan ($49/month) eliminates this gap entirely.

- **`resolveFromMandate` ABI arg order:** `args: [mandate, 0n, 1_000_000n]` — second arg is `minMarginA` (0 = no min), third is `maxMarginB` (1M = generous cap). Verify against `MacroHedgeExecutor.sol` param docs before Phase 3. Do not change without reading the contract.

## Sources

### Primary (HIGH confidence)

- `packages/backend/contracts/script/provision-buildbear-demo.sh` (this repo) — live-verified: `hardhat_setBalance` accepted, `anvil_setBalance` rejected, `buildbear_ERC20Faucet` param shape, basefee-drop workaround.
- `packages/frontend/lib/apps/abrigo/cornerstone/workflow-engine.ts` — `runWorkflowLive` interface complete; event emit sequence already correct.
- `packages/frontend/components/defi/cornerstone/CornerstoneClientShell.tsx` — mode resolution, mount probe, `handleLiveConfirm` structure, existing Somnia coupling point.
- `packages/frontend/lib/apps/abrigo/cornerstone/workflow-store.ts` — `RunState` shape; missing `failed` variant confirmed.
- `packages/frontend/lib/apps/abrigo/cornerstone/artifact-loader.ts` — `mintTxHash` required-field constraint confirmed; `isExpired` function confirmed.
- [viem `privateKeyToAccount` docs](https://viem.sh/docs/accounts/local/privateKeyToAccount) — v2 API confirmed.
- [viem WalletClient docs](https://viem.sh/docs/clients/wallet) — `writeContract` pattern confirmed.
- [Foundry `forge script` CLI reference](https://getfoundry.sh/reference/cli/forge/script) — `vm.envOr` cheatcode confirmed.
- [BuildBear Pricing](https://www.buildbear.io/pricing) — free-tier 3-day TTL confirmed; Developer plan persistent sandboxes confirmed.

### Secondary (MEDIUM confidence)

- [BuildBear JSON-RPC API Playground](https://www.buildbear.io/docs/json-rpc) — `buildbear_nativeFaucet`, `buildbear_ERC20Faucet`, `evm_snapshot`, `evm_revert`, `evm_mine`, `hardhat_setNextBlockBaseFeePerGas` confirmed via playground; parameter shapes confirmed from live script.
- [BuildBear Sandbox API reference](https://www.buildbear.io/docs/api-reference/sandbox-api) — REST endpoints (create, get, delete) confirmed; no reset/TTL-extend endpoint documented.
- [Foundry issue #6463](https://github.com/foundry-rs/foundry/issues/6463) — `evm_revert` snapshot-consumed behavior (one-use; re-snapshot immediately after revert).

### Tertiary (LOW confidence)

- BuildBear snapshot persistence across server restarts: not found in docs; treat as unreliable until empirically confirmed on first `--no-mint` provision run.

---
*Research completed: 2026-06-08*
*Ready for roadmap: yes*
