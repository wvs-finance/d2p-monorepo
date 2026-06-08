# Phase 15: Cornerstone E2E (UI → contracts) + CI — Research

**Researched:** 2026-06-07
**Domain:** Demo integration & delivery (Next.js/wagmi frontend ↔ Foundry Polygon-fork mint ↔ Somnia-testnet Agent 1) + GitHub Actions CI extension
**Confidence:** HIGH for the codebase reality (every claim cites a file/line read); MEDIUM for the recommended demo-threading path (no live cross-chain bridge exists — the recommendation is a judgement call grounded in what is already green)

> **This phase has NO new economic/contract math.** The mint, the geometry, the cost ledger, the honesty event are ALL shipped and fork-proven (Phases 13–14). Phase 15 is an **integration + packaging** phase: thread the existing pieces into one watchable run, refresh a stale handoff doc, and add a CI job. The research below is therefore about *plumbing reality*, not libraries.

## Summary

The cornerstone's contract leg is **done and green**: `MacroHedgeExecutor.resolveFromMandate(HedgeMandate)` mints a real wCOP/USDC Panoptic position at the exact structural tick `360360` on a Polygon fork (block `86_900_000`), emits the 8-param `ExecutorDecided` honesty event, and is proven by `test_resolveFromMandate_mintsThroughExecutor` (`contracts/test/fork/DemoMacroHedgeExecutor.fork.t.sol:446`). The frontend (`/home/jmsbpp/apps/d2p/frontend`, Next.js 16 + wagmi 2.19 + viem 2.48) already has a polished, accessible cornerstone screen (`/apps/abrigo/cornerstone`) that streams a four-step Scenario-1 timeline with a user-gated Agent-2 decision card and real recorded Somnia trace data.

**But the two halves are NOT connected, and one is not what the docs claim.** Three hard realities drive every recommendation here:

1. **Agent 1's HedgeMandate version is NOT deployed.** The deployed Somnia strategist (`0xfA428171…`) is still the **Phase-11 v1** emitting `HedgeDecisionMade(action, sizeBps)` — the Phase-12 `StrategistDecided(decisionId, school, HedgeMandate)` re-semantic exists in source (`src/instrument/MacroHedgeStrategist.sol:127`) and is unit-proven 19/19 offline, but the live "different prompt → different mandate" run was explicitly **DEFERRED Manual-Only** and never executed (STATE 12-02, line 90). The frontend snapshot + ABI (`lib/apps/abrigo/somnia/abi.ts:71`) carry the **old** Action/Size shape.
2. **The frontend is 100% mock-driven for the workflow.** `RunTranscript.tsx:131` calls `runWorkflow` (a hardcoded `setTimeout` producer, `lib/apps/abrigo/cornerstone/workflow-engine.ts`); `fromMockEvent` (`events.ts:217`) is the explicit "Phase-15 swap boundary." There is **no wallet/`writeContract` path and no Polygon RPC** in the frontend (env has only Celo/ETH/Base/Arb/OP — `.env.example`). `bridge.ts:9` documents the honesty constraint verbatim: the instrument "is fork-verified but NOT deployed and has NO real position tx."
3. **No cross-chain bridge exists and XCHAIN-01 is DEFERRED.** Agent 1 (Somnia chain 50312) and Agent 2 (Polygon fork) are different chains; one is a local fork. Any demo narrative that implies a live Somnia→Polygon message-pass is **fantasy** and must be called out.

**Primary recommendation:** Ship the **"video-over-a-scripted-real-run, frontend-orchestrated, mocks-clearly-labeled"** path. Concretely: (a) keep the frontend's mock timeline as the *narrative spine* (it is the judge-facing UX and it is honest about being a replay), (b) make the Agent-2 leg **genuinely real** by standing up a local anvil node seeded from the committed `fork-state/polygon-panoptic.json` allocs and having the frontend (or a thin scripted runner shown on-screen) submit the real `resolveFromMandate` mint + read the position back, (c) refresh `docs/UI-AGENT-HANDOFF.md` to the real `resolveFromMandate`/`ExecutorDecided` shapes, (d) capture the whole thing as the judges' video, (e) extend `contracts-ci.yml` with a `polygon`-fork job mirroring the existing `fork` job. Do **not** attempt to deploy the HedgeMandate strategist live or build any bridge for June 11 — both are out of the critical path and high-risk.

<user_constraints>
## User Constraints

> No `15-CONTEXT.md` exists for this phase (no `/gsd:discuss-phase` was run). Constraints below are lifted from the phase brief, `REQUIREMENTS.md`, `ROADMAP.md`, and `CLAUDE.md`. The planner MUST honor them.

### Locked scope (from REQUIREMENTS.md + the phase brief)
- **E2E-01** — ONE end-to-end run reproduces Scenario 1 from the UI prompt → minted position + a **BASIC** live-performance read (mark/margin via `PanopticQuery`/`RiskManagement`, **NOT** a monitoring agent), with **Agent 2's decision surfaced to the user mid-flow**. The artifact = **demo + public repo + video**.
- **E2E-02** — `contracts-ci.yml` gates the repo: `forge build` + per-file `bulloak check` + the fork tests (**`polygon`** fork endpoint via an Actions secret + Foundry RPC cache keyed on the pinned block, sharded to dodge 429). The **Somnia-testnet + Polygon-mint live e2e stays a manual `workflow_dispatch`.**

### DEFERRED — OUT OF SCOPE (do NOT design these)
- **MON-01** (monitoring AGENT) — the demo shows a **basic position READ**, not active management.
- **HEDGE-01** (live delta-hedge keeper) — explicitly a later iteration.
- **XCHAIN-01** (live Reactive cross-chain bridge) — do **NOT** design a production bridge. Agent-1-on-Somnia and Agent-2-on-Polygon-fork stay separate; thread them honestly without a real bridge.
- The live "different prompt → different mandate" Somnia run + a live HedgeMandate-strategist deploy — **Manual-Only `workflow_dispatch`** per STATE 12-02 M4; NOT a CI gate, NOT on the June-11 critical path.

### Process non-negotiables (CLAUDE.md)
- **Three-step planning-review gate** before commit/execute: Studio Producer selects → Reality Checker + selected domain reviewer (parallel) → verdict gate. Applies in `--auto`/YOLO too.
- **Git no-fork reality** (MEMORY): the CLAUDE.md fork/upstream model is impossible (wvs-finance is a private org, forking disabled; `JMSBPP/abrigo-somnia` is not a fork of it). Land work via **same-repo PRs pushed directly to `upstream`** (user has admin). Remotes confirm `origin=JMSBPP`, `upstream=wvs-finance`.
- **The `.hackathon/` war-room is gitignored and submission repos are PUBLIC** — keep secrets/keys out of anything committed; the Somnia PK lives in `contracts/.env` (gitignored), never on-chain or in a workflow file.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| **E2E-01** | One end-to-end run: UI prompt → minted position + BASIC live read (mark/margin), Agent-2 decision surfaced mid-flow; artifact = demo + public repo + video | The contract leg is DONE (`resolveFromMandate` fork-proven, `DemoMacroHedgeExecutor.fork.t.sol:446`); the UI spine is DONE (mock `/apps/abrigo/cornerstone`); the work is **connecting them** + a basic read via `RiskManagement.quoteCollateralRequirements` (`MacroHedgeExecutor.quoteMargin`, `MacroHedgeExecutor.sol:161`). Recommended shape: frontend-orchestrated real mint against a local anvil allocs-seeded node + video. See §"E2E-01 demo-threading" and §"E2E-01 test shape". |
| **E2E-02** | `contracts-ci.yml` polygon-fork job + cache + sharding; live e2e stays manual | The existing `fork` job (`.github/workflows/contracts-ci.yml:84`) is the template; `foundry.toml` already has `rpc_endpoints.polygon` + `rpc_storage_caching` chains `[8453,137]`. Add a `polygon` job; gate on `ALCHEMY_API_KEY` (the var the fork tests actually read — `DemoMacroHedgeExecutor.fork.t.sol:221`), NOT a new `POLYGON_RPC_URL`. See §"E2E-02 CI extension". |
</phase_requirements>

## Standard Stack

> Everything here is **already installed and version-locked in the two repos.** No new dependencies are needed for this phase. Verified against the live lockfiles, not training data.

### Contracts repo (`contracts/`)
| Tool | Version | Purpose | Evidence |
|------|---------|---------|----------|
| Foundry (forge/anvil/cast) | toolchain `@v1` in CI | build, fork-test, local node, scripted sends | `.github/workflows/contracts-ci.yml:37` |
| bulloak | `0.9.2` (pinned) | `.tree` spec → test scaffold check | `contracts-ci.yml:41` |
| Panoptic V2 core/periphery | forge-installed `panoptic-v2-core@d20b0aed` | the mint target (`PanopticPoolV2`, `PanopticQuery`, `StrategyBuilder`, `DeployProtocol`) | MEMORY `project-panoptic-substrate-d20b0aed`; `DemoMacroHedgeExecutor.fork.t.sol:19,25,31` |

### Frontend repo (`/home/jmsbpp/apps/d2p/frontend`)
| Library | Version | Purpose | Evidence |
|---------|---------|---------|----------|
| Next.js | `16.2.6` (App Router, RSC, Turbopack) | the app shell | `package.json:38` |
| React | `19.2.4` | — | `package.json:44` |
| wagmi | `^2.19.5` | React hooks for chain reads/writes (currently UNUSED in cornerstone) | `package.json:59` |
| viem | `^2.48.11` | low-level chain client; `somniaClient` is a `createPublicClient` (`somnia/chain.ts:22`) | `package.json:58` |
| @rainbow-me/rainbowkit | `^2.2.11` | wallet connect (present, not used in cornerstone) | `package.json:30` |
| @wagmi/cli | `^2.10.0` | `wagmi generate` → typed contract bindings (**config is still a Phase-1 placeholder** — `wagmi.config.ts:4`) | `package.json:77` |
| Playwright | `^1.60.0` | the e2e harness (cornerstone spec already exists) | `package.json:67`; `tests/e2e/cornerstone.spec.ts` |
| Vitest | `^4.1.6` | unit tests (7 cornerstone unit files exist) | `package.json:85` |
| MSW | `^2.14.6` | request mocking | `package.json:81` |

**Version verification (registry, 2026-06-07):** the above are read from the live `package.json`/CI; no upgrade is in scope. If the planner adds the frontend↔chain wiring, it uses the **already-pinned** wagmi/viem — do not bump.

### Alternatives Considered (demo-threading) — the central design question
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Frontend-orchestrated real mint vs local anvil | A pure scripted `forge test`/`cast` demo, no UI | Fails E2E-01's "from the UI prompt" + "decision surfaced on the UI" — the judges score Autonomous performance *shown on a screen*. UI is mandatory. |
| Frontend submits the mint | A backend/keeper submits, UI reads back | More moving parts (a new service) for June 11; the frontend already isolates a chain client (`somnia/chain.ts`) — add a polygon client the same way. Lower risk to keep it client-side OR scripted-but-shown. |
| Local anvil seeded from allocs | Live-deploy Panoptic V2 to a public testnet | Panoptic V2 is BUSL-1.1, **non-production fork use only** (`REQUIREMENTS.md:58`); a public deploy violates the license scope AND is a multi-hour risk. Fork/anvil is the only licensed path. |

## Architecture: the three things that must be TRUE for E2E-01

### Recommended demo architecture (achievable + judge-credible for June 11)
```
┌─ Browser: /apps/abrigo/cornerstone (Next.js, EXISTS) ───────────────┐
│  [1] Prompt → resolveNearestPreset (deterministic, presets.ts)      │
│  [2] Agent-1 panel: REAL recorded Somnia trace (DecisionPipeline    │
│      Trace, getDecisionTraceById → snapshot.json) — consensus-      │
│      verified, testnet-agent, real txHashes  ← already real         │
│  [3] Agent-2 decision card (user-gated Confirm)  ← surfaced mid-flow│
│  [4] MINT: submit resolveFromMandate → read position back           │
│  [5] BASIC read: mark/margin via quoteMargin (NOT a monitor agent)  │
└──────────────────────────────────────────────────────────────────────┘
        │ steps [4]/[5] are the NEW real-chain leg
        ▼
┌─ Local anvil node (allocs-seeded, NO --fork-url) ───────────────────┐
│  anvil --load-state fork-state/polygon-panoptic.json  (Panoptic     │
│  core pre-deployed) → deploy MacroHedgeExecutor + a pool → mint      │
└──────────────────────────────────────────────────────────────────────┘

  Agent-1 (Somnia 50312) and Agent-2 (Polygon fork) NEVER talk on-chain.
  The HedgeMandate is carried ACROSS by the frontend/runner as a value object.
  This is HONEST: it is an orchestration, not a bridge. Say so on screen.
```

### Pattern 1: Frontend-as-orchestrator carries the HedgeMandate across chains (the no-bridge answer)
**What:** Steps [2]→[4] do not require an on-chain message. Agent 1 produces a `HedgeMandate` (school + direction + targetNotional + the pool anchor + chainId == block.chainid, self-satisfying the guard — see Pitfall 4). The frontend already models exactly this hand-off as a value object (`events.ts` `StrategistDecidedView` → `ExecutorDecidedView`). For the real leg, the frontend (or the on-screen runner) takes that mandate and calls `resolveFromMandate(mandate, legIndex, positionSize)` on the executor on the anvil node.
**When to use:** This IS the recommendation. It satisfies "one coherent demo" without a bridge.
**Honesty label (REQUIRED on screen):** "Agent 1 runs live on Somnia testnet; Agent 2 mints on a local Polygon fork. The hedge mandate is carried between them by this app — there is no cross-chain bridge in this demo (deferred)." This mirrors the existing `bridge.ts:9` discipline and the frontend's `replaying·mock` pill convention.
**Source:** `MacroHedgeExecutor.resolveFromMandate` (`contracts/src/MacroHedgeExecutor.sol:197`); `HedgeMandate` shape (`contracts/src/types/HedgeMandate.sol`, rendered in handoff §4).

### Pattern 2: Stand up the Polygon fork as a local anvil node (must-investigate #4)
**What:** The committed `fork-state/polygon-panoptic.json` is in **allocs format** (`address → {nonce, balance, code, storage}` — verified: top-level keys are addresses, first entry shape `['nonce','balance','code','storage']`). This is the same map `vm.dumpState`/`vm.loadAllocs` use and the same shape `anvil --load-state` consumes.
**The critical gotcha (verified):** `anvil --fork-url <polygon> --load-state <file>` is a **documented incompatibility** (foundry-rs/foundry#8493). Do NOT combine them. Two viable variants:
  - **(A) Allocs-only anvil (preferred for a self-contained demo):** `anvil --load-state fork-state/polygon-panoptic.json` with NO `--fork-url`. This boots a chain containing ONLY the snapshotted Panoptic core (factory + risk engine + token code). **Caveat:** the snapshot does NOT contain the per-test pool or funded collateral — `_init_world` (`DemoMacroHedgeExecutor.fork.t.sol:271`) deploys the pool, deploys `RiskManagement`, and `deal`s tokens at test time. For a UI demo a small bootstrap script must replay `_init_world`'s deploy+fund+deposit against the live node before the mint. Plus `chainId` must be set to 137 (`anvil --chain-id 137`) so the executor's `chainId == block.chainid` guard (`MacroHedgeExecutor.sol:282`) passes.
  - **(B) Forked anvil (closest to the test):** `anvil --fork-url $POLYGON_RPC --fork-block-number 86900000 --chain-id 137`, then run the SAME `DeployProtocol` + pool-deploy + fund script the test runs. Heaviest fidelity, needs the Alchemy key + archive depth at 86.9M, slower cold start.
**Recommendation:** **(B) for the recorded demo run** (it is byte-identical to the green fork test, lowest "does it actually mint?" risk), captured to video once; optionally **(A)** as a faster reproducible local default. Either way, a **bootstrap script** (`script/serve-polygon-fork-demo.sh` — NEW) must: start anvil, deploy executor with the 9-arg ctor (`DemoMacroHedgeExecutor.fork.t.sol:379`), deploy the pool, fund+deposit collateral with `receiver = executor`, and print the executor + pool addresses + RPC for the frontend.
**Source:** anvil flags ([Foundry anvil reference](https://getfoundry.sh/anvil/reference/)); the incompatibility ([foundry-rs/foundry#8493](https://github.com/foundry-rs/foundry/issues/8493)); the allocs file format (verified locally); `_init_world` deploy/fund recipe (`DemoMacroHedgeExecutor.fork.t.sol:271-300`).

### Pattern 3: The BASIC live read (NOT a monitoring agent)
**What:** E2E-01 explicitly wants a basic read, not MON-01. The executor already exposes `quoteMargin(TokenId id, int24 strike) → BalanceDelta` (`MacroHedgeExecutor.sol:161`), which forwards to `RiskManagement.quoteCollateralRequirements`. After the mint, the frontend reads `WCOP_USDC_PANOPTIC_POOL.numberOfLegs(executor)` (proves the position exists) and `quoteMargin(positionId, strike)` (the margin `BalanceDelta`). Mark can be read via `PanopticQuery` periphery. This is a read-back of the just-minted position — exactly the "basic position read" the brief licenses.
**When to use:** Step [5] of the timeline. Render the margin delta + leg count; label it a read, never "live PnL" (the e2e honesty grep `tests/e2e/cornerstone.spec.ts:144` already bans a bare `$value`).
**Anti-pattern:** Do NOT wire a `PerformanceUpdated`-emitting loop or any "monitoring agent" — that is MON-01, deferred. The frontend's `PerformanceUpdatedEvent` type exists (`events.ts:62`) but `runWorkflow` deliberately does NOT emit it ("monitoring is if-time, deferred", `workflow-engine.ts:55`). Keep it that way.

### Anti-Patterns to Avoid
- **Implying a live cross-chain bridge.** There is none. XCHAIN-01 is deferred. Any arrow on a slide from Somnia to Polygon that isn't labeled "carried by the app, not a bridge" is a fantasy claim a Reality-Checker reviewer will (correctly) flag.
- **Claiming Agent 1 runs the HedgeMandate flow live.** It does not — the deployed strategist is the v1 Action/Size version (STATE 12-02 line 90). Either (a) show Agent 1 as the **real recorded v1 trace** the frontend already renders (honest: "consensus-verified, recorded") and carry a mandate derived from it, or (b) explicitly label the mandate as derived/illustrative. Do NOT animate a live `StrategistDecided` you cannot produce.
- **Deploying Panoptic V2 to a public chain.** BUSL-1.1, fork/non-production only (`REQUIREMENTS.md:58`).
- **Swapping `fromMockEvent` out wholesale under time pressure.** It is the documented isolation seam (`events.ts:205`). The real-chain leg can be *added alongside* the mock (a second store branch fed by a real `writeContract` + `readContract`) so the demo degrades gracefully to the mock if anvil is down during judging.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Mandate→geometry→mint | A new resolver | `MacroHedgeExecutor.resolveFromMandate` (shipped, fork-proven) | `DemoMacroHedgeExecutor.fork.t.sol:446` already mints strike 360360 through it |
| Local Polygon node | A custom RPC shim / hardhat fork | `anvil --load-state` (allocs) or `anvil --fork-url` | The allocs file already exists; anvil is in the toolchain |
| Margin/position read | A bespoke margin calc | `MacroHedgeExecutor.quoteMargin` + `pool.numberOfLegs` + `PanopticQuery` | Wired and informational already (`MacroHedgeExecutor.sol:159`) |
| The demo timeline UX | A new screen | The existing `/apps/abrigo/cornerstone` + `RunTranscript` + `HedgeDecisionCardV2` + `MintCard` | ~98% built, a11y-tested, honesty-tested |
| Typed contract bindings | Hand-typed ABIs in TS | `wagmi generate` against `contracts/out/` (fix `wagmi.config.ts` first) | The placeholder config (`wagmi.config.ts:4`) points at `../abrigo`; repoint to the real artifacts path and run `pnpm contracts:gen` |
| CI fork job | A new workflow from scratch | Copy the `fork` job in `contracts-ci.yml:84` | Already has cache+retry+secret-skip posture |

**Key insight:** This phase's risk is **integration drift and overclaiming**, not missing capability. Every capability exists. The failure modes are (1) the stale handoff doc misleading the frontend agent, (2) a demo narrative that implies a bridge/live-mandate that doesn't exist, (3) anvil state-loading footguns (the `--fork-url`+`--load-state` incompatibility). Research effort should go into making the seam honest and the node reproducible, not into building anything new.

## Common Pitfalls

### Pitfall 1: The deployed strategist is the v1, not the HedgeMandate version
**What goes wrong:** A plan assumes `StrategistDecided(decisionId, school, HedgeMandate)` is observable live on Somnia and wires the frontend to subscribe to it. It is not deployed; only `HedgeDecisionMade(action, sizeBps)` (v1) is live at `0xfA428171…`.
**Why it happens:** STATE 12-02 reads "the live … strategist was surgically re-semantic'd" — but the LIVE RUN was deferred (line 90: "the live 'different prompt → different mandate' on Somnia testnet is a DEFERRED Manual-Only `workflow_dispatch`"). The *source* changed; the *deployment* did not.
**How to avoid:** Treat Agent-1-live as the **recorded v1 trace** (already real in the frontend). Carry a `HedgeMandate` either derived from that trace or asserted for the demo, clearly labeled. Do not block the demo on a live HedgeMandate deploy.
**Warning signs:** Any task saying "subscribe to StrategistDecided on Somnia" or "deploy the Phase-12 strategist" on the June-11 path.

### Pitfall 2: `anvil --fork-url` + `--load-state` together (silent breakage)
**What goes wrong:** Standing up the demo node with `anvil --fork-url $POLYGON --load-state polygon-panoptic.json` to "get both real Polygon state and the deployed core" — documented incompatible (#8493). State load is ignored or the node misbehaves.
**How to avoid:** Pick ONE: allocs-only (`--load-state`, no fork) OR fork + redeploy (`--fork-url` + run `DeployProtocol`). See Pattern 2.
**Warning signs:** Both flags on one anvil command line.

### Pitfall 3: The allocs snapshot lacks the pool + collateral
**What goes wrong:** `anvil --load-state polygon-panoptic.json` boots, but a mint reverts because the per-test pool, `RiskManagement`, and funded collateral were never in the snapshot (they are created in `_init_world` at test time, deliberately not folded into `dumpState` — `DemoMacroHedgeExecutor.fork.t.sol:265-268`).
**How to avoid:** The demo bootstrap script must replay `_init_world`: deploy the pool via `panopticFactory.deployNewPool(wcopUsdcKey, …)`, deploy `RiskManagement`, `deal`+`approve`+`deposit` collateral with `receiver = executor`. Then deploy the executor (9-arg ctor) and call `resolveFromMandate`.
**Warning signs:** A mint reverting `NotEnoughLiquidityInChunk`/`AccountInsolvent` against the freshly-loaded node.

### Pitfall 4: `chainId` guard on the mandate path — SELF-SATISFIES (corrected post-gate)
**What it is:** `resolveFromMandate`'s sink asserts `uint256(legParams.chainId) == block.chainid` (`MacroHedgeExecutor.sol:282`). `legParams.chainId` is sourced from `mandate.chainId` (`MacroHedgeExecutor.sol:232`), and the demo mandate sets `chainId: uint32(block.chainid)` (`_demoMandate`, `DemoMacroHedgeExecutor.fork.t.sol:416`).
**CORRECTION (gate finding #5):** the guard therefore **SELF-SATISFIES on ANY chainId** — the mandate's chainId is *read from* `block.chainid`, so it can never mismatch on the demo path. The earlier claim that "the hosted fork must report chainId 137 (or the guard trips)" is **FALSE** and is removed. Do NOT reconfigure the sandbox chainId for the guard (BuildBear uses 31337). (A `--chain-id 137` anvil was only ever needed if a mandate carried a *literal* 137 against a 31337 node — not the case here.) The ONLY chainId dependency in the whole flow is cosmetic: the broadcast-receipt subdir name `broadcast/ProvisionBuildBearDemo.s.sol/<chainId>/run-latest.json`, which the runner resolves via `cast chain-id` (gate finding #4).
**Warning signs:** none for the guard on the demo mandate; only watch that the runner reads the live chainId for the run-latest.json path rather than hardcoding 137.

### Pitfall 5: The `gsd-planner` wrapper-tag leak (process)
**What goes wrong:** The planner intermittently appends stray `</content></invoke>` to PLAN.md ends (MEMORY `project-gsd-planner-wrapper-tag-leak`).
**How to avoid:** After every plan run, tail-check each `15-*-PLAN.md` ends at `</output>` and strip leaks.

### Pitfall 6: Foundry RPC 429 on the polygon-fork CI job
**What goes wrong:** A cold Alchemy cache + parallel jobs → HTTP 429, fork tests fail.
**How to avoid:** Mirror the Base job: `actions/cache` keyed `foundry-rpc-polygon-86900000-v1` on `~/.foundry/cache/rpc` + `--retries 2 --delay 3`. **Note (honest):** the existing CI comment states "Foundry has no `--shard` flag" (`contracts-ci.yml:112`) — the brief's "sharded to dodge 429" is satisfied by the **RPC cache + retries**, not a real shard flag. Document this; do not invent a `--shard`.
**Warning signs:** `429 Too Many Requests` in the CI log on a cold run.

### Pitfall 7: Frontend "green typecheck ≠ working route" (frontend CLAUDE.md)
**What goes wrong:** A frontend change passes `tsc`/`vitest` but 500s/404s the live route (Turbopack bundle/Date-coercion class of bugs — frontend `CLAUDE.md:7`).
**How to avoid:** The frontend's own rule: run the `Evidence Collector` agent live-verification against `/apps/abrigo/cornerstone` after each task. Playwright MCP is available.
**Warning signs:** Claiming a UI task done on typecheck alone.

## Code / Config Examples (verified from the repo)

### The real mint entrypoint the demo calls (Agent 2)
```solidity
// contracts/src/MacroHedgeExecutor.sol:197 — the additive mandate front-end
function resolveFromMandate(HedgeMandate calldata mandate, uint256 legIndex, uint128 positionSize)
    external returns (TokenId positionId)
// reads Z_t (staleness→STRESS), derives the regime-conditional geometry + the EXACT structural
// K_hi tick 360360, emits ExecutorDecided(8 params), mints via the shared Fix-C sink.
```

### The fork-proven E2E-01 contract leg (already green — the test to lift the demo from)
```solidity
// contracts/test/fork/DemoMacroHedgeExecutor.fork.t.sol:446
function test_resolveFromMandate_mintsThroughExecutor() external onlyForked {
    _init_world();                              // deploys pool + riskManagement + funds collateral
    (MacroHedgeExecutor exec,) = _deployExecutor();   // 9-arg ctor, receiver = exec
    HedgeMandate memory mandate = _demoMandate();     // POST_KEYNESIAN, wcopUsdcKey.toId(), 50_000, 137, isLong
    TokenId positionId = exec.resolveFromMandate(mandate, 0, 1e6);
    assertEq(int256(positionId.strike(0)), int256(360360));   // EXACT structural K_hi tick
    assertGt(WCOP_USDC_PANOPTIC_POOL.numberOfLegs(address(exec)), 0);   // executor owns the leg
}
```

### The 8-param honesty event the UI surfaces (Agent 2 decision card)
```solidity
// MacroHedgeExecutor.sol:94 — keccak256("ExecutorDecided(uint256,uint8,uint256,int24,int24,bool,bool,string)")
event ExecutorDecided(uint256 indexed requestId, uint8 regimeZt, uint256 inflationAdjustmentWad,
    int24 strikeTick, int24 regimeWidth, bool parametricHedged, bool nonErgodicDisclosed, string rationale);
// nonErgodicDisclosed == true + a "TEMPLATE: …" rationale (the Davidson honesty split) — render these.
```

### The frontend's existing swap boundary (where the real decoder lands)
```typescript
// frontend lib/apps/abrigo/cornerstone/events.ts:217 — "Phase 15: swap this adapter for the real ABI decoder."
export function fromMockEvent(e: WorkflowEvent): WorkflowEventView { /* … */ }
// The real leg ADDS a parallel path: viem readContract/writeContract → real ExecutorDecided/PositionMinted,
// keeping fromMockEvent as the graceful-degradation fallback.
```

### The frontend's isolated chain-client pattern to copy for Polygon
```typescript
// frontend lib/apps/abrigo/somnia/chain.ts:22 — the precedent: a dedicated public client, NOT in the 5-chain wagmi config
export const somniaClient = createPublicClient({ chain: somniaTestnet, transport: http() })
// Add an analogous polygonForkClient pointing at the local anvil (http://127.0.0.1:8545), kept OUT of the main wagmi config.
```

## State of the Art / What changed since the handoff doc was written

The handoff doc `docs/UI-AGENT-HANDOFF.md` is **STALE** in load-bearing ways (must-investigate #6). It must be refreshed before the frontend agent integrates:

| Stale claim (handoff) | Reality now | Fix |
|---|---|---|
| `MacroHedgeExecutor.sol` is "34 lines, `_onResult` is pseudo-code … working mint logic lives ONLY in a fork test" (§3 row, `UI-AGENT-HANDOFF.md:50`) | The executor is the **real deployable contract** (`MacroHedgeExecutor.sol`, 340 lines) with `resolveFromMandate` + `resolveAndMint` + `_onResult` all implemented and fork-proven | Flip the row to 🟡→ "fork-proven deployable; not on a public chain"; delete the "34-line STUB" line |
| `ExecutorDecided(uint256, string, TokenId, int24, int24, bool)` (6-param, §5 `UI-AGENT-HANDOFF.md:95`) | The **8-param** `ExecutorDecided(uint256,uint8,uint256,int24,int24,bool,bool,string)` is the shipped shape (`MacroHedgeExecutor.sol:94`) | Replace the event ABI; add `regimeZt`, `inflationAdjustmentWad`, `parametricHedged`, `nonErgodicDisclosed`, `rationale` |
| "Build the entire UI against MOCKS … Do NOT connect to a chain" (§6, `UI-AGENT-HANDOFF.md:104`) | Phase 15 IS the swap-to-real moment for the Agent-2 leg | Update §6: Agent-2 mints on a local anvil Polygon fork (give the RPC + executor/pool addresses from the bootstrap script); Agent-1 stays recorded |
| `PositionMinted(TokenId, address, int256, int256)` (§5) | Shipped is `PositionMinted(address indexed owner, TokenId indexed positionId, uint128 positionSize)` (`MacroHedgeExecutor.sol:111`) — margins are NOT in this event; read them via `quoteMargin` | Correct the event; point margins at `quoteMargin` |
| `StrategistDecided` is live-subscribable | Source-only; v1 (`HedgeDecisionMade`) is what's deployed | Mark Agent-1-live as the **recorded** trace; the HedgeMandate `StrategistDecided` is offline-proven only |

**Deprecated/outdated to delete:** the "monitoring agent ⛔ Phase 14" row (§3, `UI-AGENT-HANDOFF.md:51`) — Phase 14 became the representativeness brain; the monitor is MON-01 (deferred), replaced by the basic read.

## Open Questions

1. **Does the frontend submit the real mint, or does an on-screen scripted runner?**
   - What we know: the frontend has no Polygon client/wallet path today; adding one is feasible (copy the `somnia/chain.ts` pattern) but is net-new client code under deadline.
   - What's unclear: whether the team prefers (a) the frontend itself calling `writeContract` against anvil, or (b) a `cast`/`forge script` runner shown in a split-screen terminal while the UI reads the resulting events.
   - Recommendation: **(b) for the guaranteed-real video** (lowest UI-risk; the mint is the green fork test), with **(a) as the stretch** if time allows. Either way the UI must *show* Agent 2's decision + the minted position read. Decide in plan-phase.

2. **Which anvil variant for the canonical demo — allocs-only or fork+redeploy?**
   - What we know: allocs-only is self-contained but needs a pool/collateral bootstrap; fork+redeploy is byte-identical to the green test but needs the Alchemy key + archive depth at 86.9M.
   - Recommendation: **fork+redeploy for the recorded run** (it cannot diverge from the passing test), allocs-only documented as the fast local default. Validate both in a Wave-0 spike.

3. **Agent-1 representation in the demo: recorded v1 trace, or a labeled derived mandate?**
   - What we know: the live deployment is v1; the frontend already renders the real recorded v1 trace with consensus/txHashes (honest and impressive).
   - Recommendation: lead with the **real recorded trace** (it's genuine on-chain evidence), then show the `HedgeMandate` as the Agent-1→Agent-2 hand-off object with an "intent derived for this demo" label. Do not fabricate a live HedgeMandate event.

4. **Is `bulloak check` "per-file" satisfied by the existing loop?**
   - What we know: CI loops `for t in test/fork/*.tree test/instrument/*.tree; do bulloak check "$t"; done` (`contracts-ci.yml:71`). `DemoMacroHedgeExecutor.fork.t.sol` has **no `.tree`** (it's a demo/fork file, not BTT-scaffolded), while `MacroHedgeExecutor.fork.tree` exists and is checked.
   - What's unclear: whether E2E-02's "per-file `bulloak check`" means *every test file must have a checked tree* (it doesn't today) or *every existing tree is checked per-file* (it is).
   - Recommendation: interpret as "every existing `.tree` is checked per-file" (the current behavior) and keep the polygon-fork test's tree (`MacroHedgeExecutor.fork.tree`) in the loop. Do not force a tree onto the demo file. Confirm intent in plan-phase.

## Validation Architecture

> `workflow.nyquist_validation: true` in `.planning/config.json` → this section is REQUIRED. These are the testable claims a `15-VALIDATION.md` derives from.

### Test Framework
| Property | Value |
|----------|-------|
| Framework (contracts) | Foundry `forge` (toolchain `@v1`) + `bulloak 0.9.2` |
| Framework (frontend) | Vitest `4.1.6` (unit) + Playwright `1.60.0` (e2e, Chromium) |
| Config files | `contracts/foundry.toml` (`[profile.ci] fuzz=256`, `rpc_endpoints.polygon`, `rpc_storage_caching=[8453,137]`); frontend `playwright.config.ts`, `vitest.config.ts` |
| Quick run (contracts, keyless) | `forge test --no-match-path 'test/**/*fork*'` |
| Quick run (frontend) | `pnpm test:quick` (biome + tsc + vitest) |
| Polygon-fork run | `forge test --match-path 'test/fork/DemoMacroHedgeExecutor.fork.t.sol' --retries 2 --delay 3` (needs `ALCHEMY_API_KEY`) — also `make test-demo` |
| Full e2e (frontend) | `pnpm test:e2e` (Playwright) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| E2E-01 | `resolveFromMandate` mints the real wCOP/USDC position at strike 360360, executor owns the leg | fork (contract leg) | `forge test --match-test test_resolveFromMandate_mintsThroughExecutor --retries 2` | ✅ `DemoMacroHedgeExecutor.fork.t.sol:446` |
| E2E-01 | Agent-2 decision surfaced: 8-param `ExecutorDecided` fires with `nonErgodicDisclosed==true` + TEMPLATE caveat | fork | `forge test --match-test test_executorDecided_surfacesHonestyFlag` | ✅ `DemoMacroHedgeExecutor.fork.t.sol:466` |
| E2E-01 | BASIC live read: post-mint `quoteMargin` returns a `BalanceDelta` w/o reverting; `numberOfLegs>0` | fork | `forge test --match-test test__takeDemoPosition__Succeeds` (margin read at :351) | ✅ (margin read proven; ADD an explicit `quoteMargin` assertion) |
| E2E-01 | UI streams prompt→A1→A2(confirm)→mint in DOM order; honesty greps (no "executed/realized", no `$value`, no raw `0x000…0`) | e2e (UI) | `pnpm test:e2e` (`tests/e2e/cornerstone.spec.ts`) | ✅ exists for the MOCK flow; EXTEND to assert the real-mint read renders |
| E2E-01 | The integrated demo run (UI prompt → real mint → read) reproduces Scenario 1 end-to-end | manual + video | the bootstrap script + a Playwright/manual capture; **video is the judges' artifact** | ❌ Wave 0 — `script/serve-polygon-fork-demo.sh` + the capture |
| E2E-02 | `forge build` green | CI (keyless) | `forge build` (build-and-spec job) | ✅ `contracts-ci.yml:42` |
| E2E-02 | per-file `bulloak check` over every existing `.tree` | CI (keyless) | the `for t in …; do bulloak check "$t"; done` loop | ✅ `contracts-ci.yml:71` |
| E2E-02 | polygon-fork tests gated, cached, retried; live e2e manual-only | CI (secret) | NEW `polygon` job mirroring `fork` (`contracts-ci.yml:84`); `somnia-e2e` stays `workflow_dispatch` | ❌ Wave 0 — add the job |

### Sampling Rate
- **Per task commit:** `forge build` + the keyless suite (`forge test --no-match-path 'test/**/*fork*'`) for contracts; `pnpm test:quick` for frontend; the relevant single fork test when the executor/mint path is touched.
- **Per wave merge:** the full polygon-fork suite (`make test-demo`) + `pnpm test:e2e`; frontend live-verify (Evidence Collector) on `/apps/abrigo/cornerstone`.
- **Phase gate:** `forge build` + bulloak + the keyless suite green in CI; the polygon-fork job green (with `ALCHEMY_API_KEY` set); the integrated demo video captured; `docs/UI-AGENT-HANDOFF.md` refreshed; then `/gsd:verify-work`.

### Wave 0 Gaps
- [ ] `contracts/script/serve-polygon-fork-demo.sh` — boots anvil (`--chain-id 137`, fork+redeploy OR allocs-only) and replays `_init_world` (pool deploy + `RiskManagement` + fund/deposit with `receiver=executor`) + deploys the 9-arg executor; prints RPC + executor + pool addresses. (NEW — covers E2E-01 demo node; secrets stay in `contracts/.env`.)
- [ ] `.github/workflows/contracts-ci.yml` — add the `polygon` job: `env: ALCHEMY_API_KEY` (the var the test reads, NOT `POLYGON_RPC_URL`), `actions/cache` key `foundry-rpc-polygon-86900000-v1`, `--retries 2 --delay 3`, graceful skip when the key is unset, keep `somnia-e2e` on `workflow_dispatch`. (NEW — E2E-02.)
- [ ] Frontend real-mint path — a `polygonForkClient` (copy `somnia/chain.ts`) + a real `ExecutorDecided`/`PositionMinted` reader/writer added ALONGSIDE `fromMockEvent` (graceful fallback to mock). Repoint `wagmi.config.ts` (`:4` placeholder) at `contracts/out/` and run `pnpm contracts:gen`. (NEW — E2E-01 UI↔chain.)
- [ ] An explicit `quoteMargin` assertion in the fork suite for the BASIC-read claim (the margin read at `:351` exists but isn't asserted as a standalone "basic read" leaf). (Augment existing.)
- [ ] `docs/UI-AGENT-HANDOFF.md` refresh (the stale-table fixes above). (Doc — gates the frontend agent's correctness.)
- [ ] Extend `tests/e2e/cornerstone.spec.ts` to assert the real-mint read renders when the node is up (with a mock-fallback path so CI stays keyless/green). (Augment existing.)

*(Framework install: none — Foundry, bulloak, Playwright, Vitest are all already pinned in CI/lockfiles.)*

## Sources

### Primary (HIGH confidence — read directly in this session)
- `contracts/src/MacroHedgeExecutor.sol` — `resolveFromMandate` (:197), `quoteMargin` (:161), `ExecutorDecided` 8-param (:94), `PositionMinted` (:111), chainId guard (:282), 9-arg ctor (:117)
- `contracts/src/instrument/MacroHedgeStrategist.sol` — `StrategistDecided` (:127), two-leg School/Notional flow (:148, :189), `getMandate` (:288)
- `contracts/test/fork/DemoMacroHedgeExecutor.fork.t.sol` — `_init_world` (:271), `setUp` loadAllocs/dumpState (:220-250), `test_resolveFromMandate_mintsThroughExecutor` (:446), `_deployExecutorWith` 9-arg (:376)
- `contracts/test/fork/MacroHedgeExecutor.fork.tree` — the bulloak-checked tree (the per-file gate target)
- `.github/workflows/contracts-ci.yml` — build-and-spec (:29), `fork` job (:84), bulloak loop (:71), "no --shard flag" note (:112), `somnia-e2e` workflow_dispatch (:116)
- `contracts/foundry.toml` — `rpc_endpoints.polygon` (:26), `rpc_storage_caching=[8453,137]` (:15)
- `contracts/fork-state/polygon-panoptic.json` — verified allocs-shape (`address→{nonce,balance,code,storage}`)
- `contracts/script/macro-hedge-strategist-e2e.sh` — v1 `requestActionDecision`/`HedgeDecisionMade` runner (NOT the HedgeMandate API)
- `.planning/{REQUIREMENTS,ROADMAP,STATE}.md` — E2E-01/02 text, the deferred boundaries, STATE 12-02 (live HedgeMandate deferred, line 90), STATE 11-03 (v1 live addr)
- frontend `lib/apps/abrigo/cornerstone/{workflow-engine,events,presets}.ts`, `somnia/{reader,chain,bridge,deployments.json,abi}.ts`, `app/(defi)/apps/abrigo/cornerstone/page.tsx`, `components/defi/cornerstone/RunTranscript.tsx`, `tests/e2e/cornerstone.spec.ts`, `package.json`, `wagmi.config.ts`, `.env.example`, `CLAUDE.md`
- `docs/UI-AGENT-HANDOFF.md` — the stale handoff (§3/§5/§6)

### Secondary (MEDIUM confidence — official docs, verified)
- [Foundry anvil reference](https://getfoundry.sh/anvil/reference/) — `--fork-url`, `--fork-block-number`, `--load-state`, `--dump-state`, `--state`, `--chain-id`
- [foundry-rs/foundry#8493](https://github.com/foundry-rs/foundry/issues/8493) — `--fork-url` + `--load-state` incompatibility (the Pattern-2 gotcha)

### Tertiary (LOW confidence — flagged)
- The exact judge-credibility weighting of "real recorded Agent-1 trace + real fork mint, no live bridge" vs a fully-live flow is a judgement call (Encode×Somnia scores Autonomous performance; MEMORY `project-somnia-agentathon-landscape`). The recommendation optimizes for *a guaranteed-real, honest, watchable* run by June 11 over a higher-risk fully-live attempt.

## Metadata

**Confidence breakdown:**
- Codebase reality (what's built/deployed/green): **HIGH** — every claim cites a file/line read this session.
- Demo-threading recommendation: **MEDIUM** — no bridge exists; the path is the most achievable honest option, but the frontend-vs-runner split and anvil variant need a Wave-0 spike to lock.
- CI extension: **HIGH** — the `fork` job is a proven template; the only nuance (ALCHEMY_API_KEY not POLYGON_RPC_URL; no real shard flag) is documented from the repo.
- Stale-doc findings: **HIGH** — diffed the handoff against the shipped contracts line-by-line.

**Research date:** 2026-06-07
**Valid until:** 2026-06-14 (fast-moving — hackathon deadline ~June 11; re-verify the deployed strategist + any frontend changes before final wiring)

---


## Phase-15 Demo-Env DECISION (revised post-gate, 2026-06-07)

The CLAUDE.md three-step gate returned NEEDS WORK on 15-01's original LOCAL bespoke-anvil demo node (`serve-polygon-fork-demo.sh`), on two converged BLOCKERs: **(B1)** it cannot fund the executor with real wCOP/USDC on a live node (`deal()` is forge-test-only; wCOP is a thin token with no reliable 10k whale); **(B2)** it cannot stand up the Panoptic core — the core is NOT on Polygon mainnet at block 86.9M (the Foundry test deploys it + caches to allocs), `anvil --fork-url`+`--load-state` is incompatible (foundry#8493), and `_init_world` hardcodes `FACTORY_V4_ADDR`. 15-02 (CI) and 15-03 (doc) PASSED the gate.

Three research strands (see `15-RESEARCH-scaffold-fork.md` + `15-RESEARCH-fork-env-landscape.md`, incl. the AI-Agent + Somnia Compatibility Filter) converged on a **hosted forked testnet** with an ERC20-faucet RPC + deploy-and-read-back, reachable from the Vercel-deployed UI.

**ENV SWAP (2026-06-07): Tenderly → BuildBear.** The first post-gate choice was the Tenderly Virtual TestNet. On provisioning it, **Tenderly's free tier proved unusable** — no API access and no usable public RPC on the free plan, so the scripted provisioning + the browser-reachable mint endpoint could not be stood up without a paid subscription. **CHOSEN ENV: BuildBear Sandbox** (research #1 in `15-RESEARCH-fork-env-landscape.md`). BuildBear's FREE "Explorer" tier (a) forks Polygon, (b) exposes `buildbear_ERC20Faucet` (the `deal()`-replacement, B1) on a **single sandbox RPC** that ALSO carries standard JSON-RPC — so the public-vs-admin RPC split collapses to one `BUILDBEAR_RPC_URL`, (c) ships a per-sandbox **block explorer** (the judge-verifiable clickable mint-tx link). The gate-approved broadcast ARCHITECTURE is UNCHANGED — only the env-specific parameters swapped. The 3-day free-tier TTL means: **create the sandbox within 72h of June 11** (the scripted provisioning re-stands-up in minutes).

**Concrete BuildBear parameters (user-provisioned 2026-06-07):**
- Single RPC `BUILDBEAR_RPC_URL` (carries JSON-RPC + the `buildbear_*` cheats — NO separate admin RPC; sourced from gitignored `contracts/.env`, never committed; a 3-day throwaway).
- **Chain ID 31337** — BuildBear re-chains the Polygon fork (NOT 137). The executor's chainId guard self-satisfies (mandate carries `block.chainid`=31337); the only chainId use is the receipt subdir `broadcast/.../31337/run-latest.json`.
- **Forked from Polygon at LATEST** (the 86.9M pin was free-tier-invalid). The cold deploy only needs the block-invariant wCOP/USDC + v4 PoolManager addresses to have code — DECOUPLED from the in-VM test's 86.9M Alchemy pin, which is unchanged.
- **Deployer EOA** = the well-known foundry test account 0 `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` (BuildBear pre-funds its gas). The documented exception to the no-key rule, but STILL env-sourced (`BUILDBEAR_DEPLOYER_PK`), never hardcoded; the `! grep -qE '0x[a-fA-F0-9]{64}'` guard is kept.

**Approach (UI-visible fork mint, the deliverable):**
- A server-side/CI provisioning flow targets the BuildBear Sandbox (Polygon fork, latest), runs the INLINED `DeployProtocol` body against its RPC, **captures the ACTUAL deployed addresses** (read-back — NOT the hardcoded `FACTORY_V4_ADDR`), funds the deployer EOA with wCOP + USDC via `buildbear_ERC20Faucet` (the SAME single RPC), and writes the sandbox RPC + addresses to a frontend-consumable deployments artifact (`buildbear-deployments.json`).
- **B1 resolved:** `buildbear_ERC20Faucet` mints arbitrary ERC20 — no whale, no `deal()`. **B2 resolved:** deploy-to-sandbox + read-back addresses (sidesteps #8493 entirely; no `vm.dumpState` reuse).
- The Vercel-deployed Next.js UI adds the BuildBear fork chain (`defineChain({ id: 31337, rpc: BUILDBEAR_RPC_URL })`) to its wagmi config (alongside the live Somnia chain 50312) + a mint panel: Agent-1 (Somnia, recorded/live mandate) → `resolveFromMandate(...)` mint on the BuildBear fork (tx verifiable in the per-sandbox BuildBear explorer) → position read-back. **Agent-1 stays LIVE on real Somnia testnet — Somnia cannot be forked** (its `inferString`/`inferNumber` consensus-validated inference + keeper-proxy do not survive a fork; forking it is meaningless). The app carries the `HedgeMandate` between the two legs — NO bridge.

**Honest flags (carry into the plan):**
- The BuildBear sandbox RPC URL is a **bearer secret** → gitignored `contracts/.env` / Vercel env, never committed.
- **Browser→BuildBear CORS is unconfirmed** → verify with one `eth_chainId` fetch from a preview deploy; if blocked, proxy the mint RPC through a Next.js route (reuse the existing Somnia keeper-proxy pattern). Funding (`buildbear_ERC20Faucet`) stays server-side in the provisioning runner.
- **Free-tier RPC rate cap** → do NOT loop the provisioning in CI; it is a Wave-0/checkpoint step. **3-day TTL** → create the sandbox within 72h of June 11; provisioning is scripted so it re-stands-up in minutes.
- The exact `buildbear_ERC20Faucet` parameter order must be confirmed against the sandbox on first run (`(token, recipient, amount)` per docs).
- The deterministic deploy SHOULD reproduce addresses but **read them back from the broadcast receipt, don't trust constants** (verify on the live sandbox).
- Fallback retained: local anvil + cloudflared + a recorded `make test-demo` run (the in-VM mint is already green) if the hosted env fails on demo day.

### Broadcast-semantics corrections (2nd-pass gate, 2026-06-07)

The 2nd-pass CLAUDE.md gate NEEDS-WORK'd 15-01 on broadcast semantics. The plan commits to ONE source-verified sequence (no runtime "OR" menus):

- **Funding = EOA-funded-before-broadcast, deposit-on-behalf.** The runner `buildbear_ERC20Faucet`s the **deployer EOA** (the broadcast sender) with wCOP + USDC via the single sandbox RPC **BEFORE** a single `forge --broadcast` (BuildBear pre-funds native gas; `buildbear_nativeFaucet` top-up only if needed). Inside that one broadcast the EOA `approve`s ct0/ct1 and calls `ct.deposit(amount, receiver=executor)` — standard-4626 **deposit-on-behalf** (pulls from `msg.sender`=EOA, mints shares to `receiver`=executor; verified `CollateralTracker.sol:557-592`). The executor ends up the 4626 owner + dispatch caller exactly as in-VM. NO `deal()`, NO `vm.prank`, NO mid-broadcast cheat interleave, NO multi-broadcast split. (Because the cheats live on the SAME RPC as the broadcast, the public-vs-admin split that Tenderly forced is gone.)
- **DeployProtocol is INLINED, never called.** `new DeployProtocol().run()` self-broadcasts (`:37`/`:146`) → a nested-broadcast hard error, and returns nothing (`:117` discards the factory) → no address handle. The provisioning script INLINES the deploy body (SFPM + RiskEngine + PanopticFactoryV4 + the metadata-pointer loop) under its single `vm.startBroadcast()`, assigns each to a LOCAL, `console2.log`s it, and **threads those locals into `deployNewPool(...)` + the executor ctor** — the hardcoded `FACTORY_V4_ADDR`/`RISK_ENGINE_ADDR` constants are NEVER consumed. `UNIV4_POOL_MANAGER`/`UNIV3_FACTORY`/`GUARDIAN_ADMIN`/`TREASURER` are exported as REAL OS env before the forge run (NOT `vm.setEnv`).
- **Cold-deploy SPIKE gates the rest.** A Wave-0 `spike()` runs the inlined deploy against the sandbox IN ISOLATION first — confirming `./metadata/out/MetadataPackage.json` resolves under the forge CWD, `UNIV4_POOL_MANAGER` is set + the Polygon v4 PoolManager has code on the fork, and the factory/SFPM deploy lands. The in-VM cold path produced the committed snapshot (so it works in-VM) but has NEVER run against a hosted sandbox — this de-risks the single biggest unknown.
- **Mint-tx-hash read-back is chainId-aware.** The runner reads the live chainId via `cast chain-id --rpc-url $BUILDBEAR_RPC_URL` (= 31337) and parses `broadcast/ProvisionBuildBearDemo.s.sol/<chainId>/run-latest.json`; `jq` selects the tx whose function is `resolveFromMandate` (NOT `transactions[0]`) for `MINT_TX_HASH`.
- **chainId guard self-satisfies** (see corrected Pitfall 4) — the sandbox chainId (31337) is NOT reconfigured for the guard.

### E2E-01 UI-scope correction (honest reframe, 2nd-pass)

The abrigo-somnia MVP deliverable = the BuildBear provisioning + the explorer-verifiable `MINT_TX_HASH` + `buildbear-deployments.json` + the refreshed handoff doc (15-03) + the in-VM `quoteMargin` read + the CI (15-02). The actual **browser prompt→mint UI flow** (the d2p-frontend mint panel reading the position/decision off the live sandbox) is **SIBLING-REPO-gated** and NOT guaranteed by June 11. The guaranteed artifact (15-01 T5) is the script-run + explorer-tx narrated over the cornerstone UI with the no-bridge honesty label; the "narrated over the mock UI" path is an explicitly-labeled DEGRADED artifact, and the real-browser-mint flow is a labeled STRETCH — neither is a success condition the plan over-claims. The video checkpoint stays gated on the real printed `MINT_TX_HASH`.

**Cross-repo boundary unchanged:** the abrigo-somnia MVP = the BuildBear provisioning script + the deployments artifact + the refreshed `docs/UI-AGENT-HANDOFF.md` + the `quoteMargin` BASIC-read assertion + the CI (15-02). The frontend mint-panel wiring is a concrete sibling-repo deliverable in `/home/jmsbpp/apps/d2p/frontend`, driven by the refreshed handoff doc.
