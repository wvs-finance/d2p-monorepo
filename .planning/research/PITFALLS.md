# Pitfalls Research

**Domain:** One-click pre-funded live on-chain demo on a shared, TTL-limited BuildBear fork
**Milestone:** v3.0 — Judge-Runnable Live BuildBear Demo
**Researched:** 2026-06-08
**Confidence:** HIGH (stack-specific; grounded in the actual codebase, not generic advice)

---

## Critical Pitfalls

### Pitfall 1: Shared Fork State Corruption — `numberOfLegs == 0` Freshness Gate Fails on Repeated/Concurrent Runs

**What goes wrong:**
`resolveFromMandate` on `MacroHedgeExecutor` gates execution on the pool having `numberOfLegs == 0` (the freshness invariant — the executor only enters a fresh pool slot). On the shared BuildBear fork, the FIRST judge run mints a position and advances `numberOfLegs` to 1. Every subsequent judge run — whether from a second judge tab, a second machine, or a retry — calls `resolveFromMandate` against a pool that no longer satisfies the gate. The tx reverts on-chain. The UI receives `receipt.status === 'reverted'` and either surfaces a cryptic error or, worse, silently falls back to mock mode (see Pitfall 4). The demo is effectively bricked for all judges after the first.

**Why it happens:**
The shared-fork model trades per-judge provisioning complexity for a single authoritative fork, but that fork is mutable. The executor's freshness gate is deterministic — it was designed for a fresh fork per run. With a shared fork, state from run N becomes the starting condition for run N+1. Teams often discover this only when a second person runs the demo live during judging.

**How to avoid:**
Implement the reset guard as a backend provisioning step, NOT a frontend check. The reset guard must re-provision a fresh executor state before each judge session: either (a) deploy a fresh `MacroHedgeExecutor` pointing at the same pool, storing its address in a refreshed `buildbear-deployments.json` artifact, or (b) call an admin reset function on the existing executor if one exists, or (c) provision a fresh BuildBear fork entirely (re-running `provision-buildbear-demo.sh`) and re-mirror the artifact. Option (c) is the only one that cannot be silently stale. The frontend's `isExpired` check in `artifact-loader.ts` is a readiness signal, not a reset mechanism — do not conflate the two. The reset guard belongs in `packages/backend` as part of the `--no-mint`/fresh-executor provisioning variant.

**Warning signs:**
- Second test run produces `receipt.status === 'reverted'` after the first succeeds.
- The `publicClient.readContract({ functionName: 'numberOfLegs', ... })` returns `1n` (or higher) at the start of a new judge session.
- The backend provisioning script has no idempotent reset step — a `provision.sh` that only deploys on a fresh fork but does not handle re-runs.

**Phase to address:**
Backend provisioning phase (the `--no-mint`/fresh-executor variant in `packages/backend`). Must be designed and tested before the frontend live-run phase. The frontend should read pool freshness BEFORE emitting `confirm` and gate the one-click button behind a live `numberOfLegs === 0n` check, surfacing a clear "Demo is being reset — please wait" message rather than a revert.

---

### Pitfall 2: Pre-Funded Private Key Leaking into the Client Bundle or the Git Repository

**What goes wrong:**
The demo signer key (the pre-funded wallet that pays for `resolveFromMandate` on the fork) ends up in one of three places it must never be: (a) a `NEXT_PUBLIC_` env var — which Vercel/Next.js inlines into the client-side JavaScript bundle, making it trivially extractable from the browser devtools network tab; (b) a `.env.local` or `.env` file that gets committed to the monorepo (`.planning/PROJECT.md` already flags missing `NEXT_PUBLIC_*` env vars as a Vercel blocker — the team is actively touching env config); or (c) hardcoded in `buildbear-deployments.json` or any other mirrored artifact that is committed to the repo.

**Why it happens:**
Under deadline pressure, the fastest path to "pre-funded one-click" is to put the demo private key in an env var and call `privateKeyToAccount` in the browser. Teams reason that it is "just a testnet key with no real funds." On a BuildBear fork, the fork's funded accounts are MATIC-clones — no real value — but the pattern itself is toxic: (1) it normalizes client-side key handling in a codebase the lab uses as a reference for real protocol interaction, (2) the key appears in browser memory and is extractable by any browser extension, and (3) if the pattern is copy-pasted to a real-funds context it causes an immediate critical vulnerability.

**How to avoid:**
The demo signer MUST live exclusively in `packages/backend` (the server-side provisioning/execution layer). The frontend calls a backend API endpoint (e.g., `POST /api/cornerstone/run-live`) that constructs the `writeContract` call server-side using a `privateKeyToAccount` wallet created from a `process.env.DEMO_SIGNER_KEY` (non-public env var, never prefixed `NEXT_PUBLIC_`). The backend returns the tx hash and receipt data; the frontend only displays results. The private key never touches the browser. Verify in `packages/frontend`: grep for `privateKeyToAccount`, `NEXT_PUBLIC_.*KEY`, and any import of `viem/accounts` in files under `app/` or `lib/apps/`.

**Warning signs:**
- Any env var containing `KEY`, `PRIVATE`, `SIGNER`, or `MNEMONIC` that is also prefixed `NEXT_PUBLIC_`.
- `privateKeyToAccount` imported anywhere in the frontend package.
- `buildbear-deployments.json` gains a `signerKey` or `funderKey` field.
- The `.env.example` in the frontend package references a signer key (even with a placeholder value).

**Phase to address:**
Backend provisioning phase — the API endpoint design must specify exactly which env vars are server-only. The frontend `RunWorkflowLiveOptions.writeContract` seam (already typed in `workflow-engine.ts`) is the correct injection point: the frontend passes a `writeContract` closure that calls the backend API, never holding the key itself.

---

### Pitfall 3: BuildBear 3-Day TTL Expiring Mid-Judging

**What goes wrong:**
The `capturedAt` field in `buildbear-deployments.json` is currently `"2026-06-08T00:15:09.000Z"`. The `isExpired` function in `artifact-loader.ts` computes `capturedAt + 3 days`. If the fork expires during the judging window (e.g., judging starts June 10 and runs through June 11), any RPC call to `rpc.buildbear.io/colossal-groot-e8ea55ce` returns 404 or connection-refused. The frontend's `createBuildBearPublicClient(rpcUrl)` throws; `runWorkflowLive` catches the error and emits `{ kind: 'error' }`. Judges see a broken demo with no explanation.

**Why it happens:**
Teams provision the fork during development (days before the event) and forget to re-provision within the judging window. BuildBear's 3-day TTL is short. The `isExpired` check exists in `artifact-loader.ts` but is a pure function — it is only useful if something actually calls it and acts on the result before attempting any RPC. If the UI skips the expiry check and goes straight to `runWorkflowLive`, the error surfaces mid-run, not pre-flight.

**How to avoid:**
(a) Re-provision the BuildBear fork within 24 hours of the judging window opening and update `buildbear-deployments.json`. Add this as an explicit step in the judge runbook. (b) Wire `isExpired(Date.now())` as a pre-flight check in the cornerstone page's `useEffect` or server component: if expired, render a `ForkExpiredBanner` with a clear explanation BEFORE the one-click button is enabled. Do not silently disable the button — label it "Fork expired — contact operator." (c) Set a calendar alert for `capturedAt + 2d 18h` to re-provision with a 6-hour buffer.

**Warning signs:**
- `capturedAt` in `buildbear-deployments.json` is more than 2 days before the scheduled judging date.
- The `isExpired` function is imported nowhere outside its own module (meaning nothing calls it).
- The judge runbook has no "re-provision fork" step.

**Phase to address:**
Frontend live-run phase — add the pre-flight expiry check as part of the `live` mode boot sequence. Backend provisioning phase — add re-provisioning as a named step in the runbook with a deadline relative to the judging window.

---

### Pitfall 4: Silent Fallback to Replay Masking a Broken Live Path (Anti-Fishing Violation)

**What goes wrong:**
`parseMode` in `mode.ts` returns `DEFAULT_MODE` (`'replay'`) for any input that is not exactly `'live'` or `'mock'`. If a RPC failure, revert, or missing env var causes the live path to throw before emitting any store event, and the error boundary or catch block responds by restarting in `replay` mode without surfacing the failure, the judge sees a smooth animation and concludes the demo worked — but they witnessed a replay, not a real on-chain interaction. This is the anti-fishing violation described in `PROJECT.md`: the lab's epistemic discipline requires that failures render at equal weight to successes. A silent substitution is worse than a visible failure.

**Why it happens:**
React error boundaries catch thrown errors and render fallback UI. If the fallback UI is the `replay`-mode cornerstone (chosen because "at least the demo doesn't break"), the failure is completely invisible. Teams justify it as "graceful degradation" without realizing it constitutes presenting a mocked demo as a live one. The existing `mode.ts` governance comment says "never a silent substitution" — but that governs the `mock` label, not the error path.

**How to avoid:**
Any failure in `runWorkflowLive` must terminate the run in an explicit failed terminal state visible to the judge. The `workflow-store.ts` state machine should gain a `{ status: 'failed', reason: string }` terminal state (distinct from `idle`). The UI must render this state with a prominent, honest error message: "Live on-chain run failed: [reason]." The error message must NOT include a "Retry in demo mode" affordance that silently switches to replay. A separate, clearly labeled "Run in replay mode" button is acceptable — but switching modes must require an explicit judge action AND must change the UI's mode indicator. Verify: the `RunState` type in `workflow-store.ts` currently has no `failed` variant — this is a gap that must be filled before the live path is un-deferred.

**Warning signs:**
- `RunState` in `workflow-store.ts` has no `failed` status variant.
- The error boundary wrapping the cornerstone page renders `<CornerstoneWorkflow mode="replay" />` as its fallback.
- `runWorkflowLive` emits `{ kind: 'error' }` but no UI component handles that event shape and renders it visibly.
- The mode indicator in the UI disappears or changes silently when an error occurs.

**Phase to address:**
Frontend live-run phase — must be addressed in the same task that un-defers `runWorkflowLive`. The `failed` terminal state is load-bearing for honest demo behavior. It is not optional polish.

---

### Pitfall 5: Demo Signer Running Out of Gas/Funds Mid-Judging

**What goes wrong:**
The pre-funded demo signer account on the BuildBear fork has a finite MATIC balance. Each `resolveFromMandate` call consumes gas. If the executor is reset (re-provisioned) between judge runs and the same signer account is re-used across multiple sessions without re-funding, by judge N the signer balance may be insufficient and the `writeContract` call fails with `insufficient funds for gas * price + value`. The failure looks identical to a smart contract revert from the UI's perspective.

**Why it happens:**
BuildBear forks allow arbitrary account funding via the fork's `hardhat_setBalance` (or equivalent) RPC method, but this must be called explicitly. Teams provision once, fund once, and assume the balance lasts. On a shared fork with concurrent/repeated runs, gas consumption is additive across all runs.

**How to avoid:**
(a) The backend provisioning script must include a step that checks the demo signer's balance AFTER deployment and top it up to a known-safe level (e.g., 10 MATIC). (b) The backend API endpoint that executes the live run should pre-flight check the signer balance before submitting the transaction: if `balance < estimated_gas_cost * 2`, call `hardhat_setBalance` on the fork RPC to re-fund before proceeding. BuildBear exposes this via its faucet API or standard Hardhat JSON-RPC methods on the fork. (c) The pre-flight check in the frontend (the `numberOfLegs` check described in Pitfall 1) should be extended to also verify signer balance via the backend health endpoint, not by exposing the signer to the frontend.

**Warning signs:**
- The provisioning script has no `hardhat_setBalance` or faucet step for the demo signer.
- The backend API has no pre-flight balance check.
- After 3+ test runs, the demo starts failing with `writeContract` errors that are not revert-related.

**Phase to address:**
Backend provisioning phase — the signer funding step must be part of the `--no-mint`/fresh-executor provisioning variant. Also address in the backend API endpoint that executes the run.

---

### Pitfall 6: Backend Provisioning Artifact Drift — Committed Addresses Stale vs. Fork

**What goes wrong:**
`buildbear-deployments.json` is committed to the frontend package at `packages/frontend/lib/apps/abrigo/cornerstone/buildbear-deployments.json`. This is the artifact-loader's static import (Turbopack-safe by design — `artifact-loader.ts` uses a static relative import to avoid the Phase-2/6 dynamic-require burn). When the backend re-provisions a fresh fork (as required by the reset guard in Pitfall 1), it deploys contracts at NEW addresses. If the backend re-provision script does not also update and commit `buildbear-deployments.json`, the frontend is pointing at addresses from the OLD fork — which may be expired or may be on a different fork entirely. Every `readContract` and `writeContract` call silently targets wrong addresses.

**Why it happens:**
The backend provisioning script lives in `packages/backend` (or `abrigo-somnia/contracts/script/`); the artifact lives in `packages/frontend`. The sync step is a cross-package operation that is easy to forget under deadline pressure. The v2.0 known gap explicitly calls out this cross-repo dependency: "Backend cross-repo dep: `--no-mint`/fresh-executor BuildBear provisioning variant needed." The word "dep" implies the artifact sync is a manual step, which is exactly the failure mode.

**How to avoid:**
The backend provisioning script must output `buildbear-deployments.json` directly into `packages/frontend/lib/apps/abrigo/cornerstone/buildbear-deployments.json` as its final step — not into a separate `out/` directory that someone must manually copy. Make the artifact path a required parameter of the provision script so the frontend path is the default output location. Add a CI check: `artifact-loader.ts` validates required fields at module load (fail fast is already implemented), but also add a build-time check that `capturedAt` is within the last 72 hours — if stale, the build fails with a clear message. This prevents silently deploying with a stale artifact to Vercel.

**Warning signs:**
- The provision script writes to `contracts/script/out/buildbear-deployments.json` but a separate manual copy step is required to sync to `packages/frontend`.
- `capturedAt` in the committed `buildbear-deployments.json` is from a different day than the last provision run.
- The `executor` address in the artifact does not match the address emitted in the last provision script log.
- `git diff` after a fresh provision run shows no changes to `packages/frontend/lib/apps/abrigo/cornerstone/buildbear-deployments.json`.

**Phase to address:**
Backend provisioning phase — the `--no-mint`/fresh-executor variant must specify the frontend artifact output path as a required output, not an optional copy. Also add the build-time staleness check in the frontend build pipeline phase.

---

### Pitfall 7: Somnia Decoupling Accidentally Re-Coupling

**What goes wrong:**
The v3.0 design decision is explicit: the judge-interactive path is BuildBear-only; Somnia Agent-1 stays operator-only (`PROJECT.md` key decision table). But the existing `runWorkflowLive` in `workflow-engine.ts` calls the Agent-1 Somnia route as its upstream step (the `upstream: UpstreamResult` parameter comes from the `/api/cornerstone/agent1` server route, which calls `MacroHedgeStrategist` at `0xf0570C…7b1D` on Somnia chain 50312). If the frontend un-defers the live run without also creating a BuildBear-only code path that bypasses the Somnia Agent-1 call, the demo is still hostage to the external Somnia validator-callback outage. The deferred live run returns exactly because this call fails; un-deferring without decoupling just reproduces the same failure.

**Why it happens:**
The live path was built as a two-chain path (Somnia Agent-1 + BuildBear Agent-2 mint) because that is the full production architecture. The decoupling is a scoping decision that must be reflected in code, not just in planning documents. Under deadline pressure, a developer might attempt to "just un-stub the writeContractAsync call" without reading the upstream dependency, hitting the Somnia outage again, and concluding "still broken" without diagnosing that the Somnia call is the actual blocker.

**How to avoid:**
The v3.0 live path must use a RECORDED Agent-1 decision (the same source as the `replay` mode's frozen artifact) as the `upstream` input to `runWorkflowLive`, bypassing the live Somnia call entirely. `buildLiveMandate` already accepts a `SerializedMandate` — the serialized mandate from the recorded/replay artifact is a valid input. The `agent1-route-logic.ts` file and the `/api/cornerstone/agent1` route must remain untouched by v3.0; the new live path creates a separate code branch that loads the recorded mandate from the same artifact source as `replay` mode (or from a new server route that reads the mirrored artifact rather than calling Somnia live). Add an explicit assertion in the v3.0 live path: if the upstream source is the Somnia live route, throw a build-time or runtime error with message "v3.0 live path must not call Somnia Agent-1 directly — use recorded mandate."

**Warning signs:**
- The `POST /api/cornerstone/agent1` route is called anywhere in the `live` mode code path in v3.0.
- `workflow-engine.ts` `runWorkflowLive` is called with an `upstream` value that was obtained from a live Somnia RPC call.
- The v3.0 plan has no explicit task titled "decouple live path from Somnia Agent-1 upstream."
- Testing the live path in an environment where Somnia is also outaged produces the same failure as v2.0.

**Phase to address:**
Frontend live-run phase — the first task in the live-run phase must be "decouple upstream: use recorded mandate as `runWorkflowLive` upstream input." This must be verified before any `writeContract` work begins.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hardcode `capturedAt`-based TTL check as a static build-time value | No runtime check needed | Stale artifact ships to Vercel with no warning | Never — the build-time staleness check is cheap to add |
| Put demo signer key in `NEXT_PUBLIC_DEMO_SIGNER_KEY` | Fastest path to pre-funded one-click | Key in client bundle; normalizes insecure pattern in a finance codebase | Never |
| Reuse existing mock `runWorkflow` with a flag to make it "live" | Less code to write | Masks the actual live/mock distinction; anti-fishing violation | Never |
| Per-judge fork provisioning instead of shared fork with reset guard | Eliminates shared-state corruption | Provisioning latency per judge (2-3 min); BuildBear rate limits; much more complex to orchestrate | Only if shared-fork reset guard proves technically infeasible |
| Skip `failed` terminal state in `RunState`; rely on error boundaries only | Avoids store-layer changes | Error path falls back to replay silently; anti-fishing violation | Never |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| BuildBear fork RPC | Call `hardhat_setBalance` with a value in ETH units (18 decimals), get wrong balance | Pass value as hex wei string, not a decimal ETH float. Verify with `eth_getBalance` after calling. |
| BuildBear fork RPC | Assume the fork RPC is reachable from the browser for writes | The fork RPC accepts writes from any caller — but the SIGNER (private key) must be server-side. The public client for reads can call the RPC from the browser; `writeContract` must route through the backend. |
| `waitForTransactionReceipt` on BuildBear | Default polling interval (4s) causes the UI to appear frozen for judge UX | Set `pollingInterval: 500` on the `publicClient` for BuildBear — fork blocks are instant, not waiting for real block times. |
| `resolveFromMandate` ABI arg order | `args: [mandate, marginA, marginB]` — teams swap `0n` and `1_000_000n` order, causing wrong slippage or revert | The existing `runWorkflowLive` has `args: [mandate, 0n, 1_000_000n]` — the second arg is `minMarginA` (0 = no min), third is `maxMarginB` (1M = generous cap). Do not change this without reading `MacroHedgeExecutor.sol:resolveFromMandate` param docs. |
| `artifact-loader.ts` static import | Attempt to load a different artifact path at runtime (e.g., per-environment) | The static import is intentionally inflexible — it was chosen to avoid the Turbopack dynamic-require failure mode from Phase 2. If environment-specific artifacts are needed, use build-time env substitution at the JSON level, not runtime switching. |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| No `pollingInterval` override on BuildBear `publicClient` | `waitForTransactionReceipt` takes 4s+ per poll; judges see a stuck "pending" spinner | Set `pollingInterval: 500` (ms) on the BuildBear public client factory in `buildbear.ts` | Immediately on first live run |
| Reading `quoteMargin` before `PositionMinted` log is decoded | `readContract` reverts with `PositionNotOwned` | `runWorkflowLive` already has the correct guard (step i is strictly after step h) — do not refactor this ordering | Every run if ordering is changed |
| Concurrent judge runs both calling `resolveFromMandate` simultaneously | Race condition — second tx reverts because first advanced `numberOfLegs`; harder to diagnose than sequential runs | Reset guard + a server-side mutex or a last-writer-wins re-provision step | Two judges opening the demo tab within seconds of each other |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Demo private key in `NEXT_PUBLIC_` env var | Key extractable from browser bundle; pattern normalizes client-side key handling in a real-funds codebase | Backend-only signer: key in `process.env.DEMO_SIGNER_KEY` (server env only), used in backend API route exclusively |
| Demo private key committed to `buildbear-deployments.json` or any tracked file | Key in git history permanently; exfiltration via repo access | Never put key material in any committed file; use `.env.local` (gitignored) for local dev, Vercel env for deploy |
| RPC URL from `buildbear-deployments.json` exposed to unauthenticated clients | BuildBear fork RPC accepts writes from any caller — exposes the fork to griefing (arbitrary state mutations) | The RPC URL for WRITE operations should be proxied through the backend API; the frontend public client for reads can use the URL directly (reads are harmless on an expiring fork) |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Silent mode switch from `live` to `replay` on error | Judge believes live run succeeded; anti-fishing violation; invalidates the demo's scientific honesty | Render explicit `{ status: 'failed', reason }` terminal state; never auto-switch modes |
| No visible TTL countdown or expiry warning | Judge opens demo on day 3, gets cryptic RPC errors with no explanation | Pre-flight `isExpired` check renders a `ForkExpiredBanner` before enabling the one-click button |
| "Reset in progress" has no UI feedback | Judge clicks one-click button during reset; second `resolveFromMandate` races the re-provision | Disable one-click button while reset is in progress; show "Preparing demo fork..." state |
| Pending hash shown as clickable explorer link on BuildBear | Judge clicks tx hash, gets 404 (BuildBear has no public explorer for private forks) | Show hash as monospace text, not a hyperlink, on BuildBear chain. Add a copy-to-clipboard affordance. |

---

## "Looks Done But Isn't" Checklist

- [ ] **Live run un-deferred:** The `void writeContractAsync` stub is replaced with a real call — but verify `upstream` is NOT sourced from the live Somnia Agent-1 route (Pitfall 7).
- [ ] **Pre-funded signer:** A funded account exists — but verify the key is NOT in `NEXT_PUBLIC_*` or any committed file (Pitfall 2).
- [ ] **Reset guard implemented:** A `numberOfLegs == 0` pre-flight check exists in the UI — but verify the backend ALSO has a re-provision path, not just a frontend gate (Pitfall 1).
- [ ] **Artifact synced:** `buildbear-deployments.json` has a recent `capturedAt` — but verify the `executor` address matches the LAST provision run's deploy log (Pitfall 6).
- [ ] **`failed` state renders:** An error in `runWorkflowLive` produces visible UI — but verify it does NOT auto-switch to `replay` mode silently (Pitfall 4).
- [ ] **Fork not expired:** `isExpired(Date.now())` returns `false` at judging time — but verify the pre-flight check is actually CALLED in the UI boot sequence (Pitfall 3).

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Fork expired mid-judging | MEDIUM | Re-run `provision-buildbear-demo.sh`, update `buildbear-deployments.json`, redeploy frontend to Vercel (or hot-swap artifact via env if build allows) |
| Shared fork state corrupted (numberOfLegs > 0) | MEDIUM | Re-provision fresh executor via backend `--no-mint` variant; update artifact; judges can retry immediately |
| Demo signer out of gas | LOW | Call `hardhat_setBalance` on the fork RPC directly (curl command in runbook) to top up; no redeploy needed |
| Private key found in committed file | HIGH | Rotate key immediately (provision new funder wallet); git-filter-branch to remove key from history; audit all downstream forks |
| Somnia re-coupled by mistake | LOW (if caught in dev) / HIGH (if caught live) | Identify the Somnia call site; replace with recorded-mandate path; re-test live run against fork only |
| Artifact addresses stale (executor mismatch) | LOW | Re-run provision script with frontend output path; commit updated artifact; verify via `artifact-loader.ts` required-field check |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| 1. Shared fork state corruption / numberOfLegs gate | Backend provisioning phase (reset guard + fresh-executor variant) | Run live path twice in sequence; confirm second run does not revert |
| 2. Pre-funded key in client bundle or repo | Backend provisioning phase (signer API design) | `grep -r "NEXT_PUBLIC_.*KEY\|privateKeyToAccount" packages/frontend/` returns zero results |
| 3. BuildBear TTL expiry mid-judging | Frontend live-run phase (pre-flight expiry check) + runbook | `isExpired` called in UI boot; `ForkExpiredBanner` visible when TTL passed in test |
| 4. Silent fallback to replay (anti-fishing) | Frontend live-run phase (failed terminal state in RunState) | Force a RPC error in dev; confirm UI renders failed state, NOT replay mode |
| 5. Demo signer out of funds | Backend provisioning phase (balance top-up in provision script) | After 5 consecutive test runs, demo signer balance is still above gas threshold |
| 6. Artifact drift (stale addresses) | Backend provisioning phase (script outputs directly to frontend path) | `git diff packages/frontend/lib/apps/abrigo/cornerstone/buildbear-deployments.json` shows change after every provision run |
| 7. Somnia re-coupling | Frontend live-run phase (decoupled upstream task, first in phase) | `grep -r "agent1\|somnia\|50312" packages/frontend/lib/apps/abrigo/cornerstone/workflow-engine.ts` returns zero live-path call sites |

---

## Sources

- Codebase: `packages/frontend/lib/apps/abrigo/cornerstone/` — `artifact-loader.ts`, `buildbear.ts`, `workflow-engine.ts`, `workflow-store.ts`, `mode.ts`
- `.planning/PROJECT.md` — v3.0 milestone definition and key decisions (especially shared-fork reset guard, BuildBear-only decoupling, pre-funded one-click)
- `.planning/MILESTONES.md` — v2.0 known gaps (live on-chain RUN deferred; backend cross-repo dep)
- `packages/backend/docs/UI-AGENT-HANDOFF.md` — system integration context, chain addresses, Somnia/BuildBear split
- Anti-fishing discipline: `PROJECT.md` context section; `mode.ts` governance comment ("never a silent substitution")
- Phase-2/6 Turbopack burn (static import requirement): `packages/frontend/CLAUDE.md`

---
*Pitfalls research for: shared-fork pre-funded live on-chain demo (v3.0 BuildBear Judge Demo)*
*Researched: 2026-06-08*
