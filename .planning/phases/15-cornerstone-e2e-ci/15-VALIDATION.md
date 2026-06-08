---
phase: 15
slug: cornerstone-e2e-ci
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-07
updated: 2026-06-07
---

# Phase 15 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Derived from `15-RESEARCH.md` § Validation Architecture + the post-gate `## Phase-15 Demo-Env DECISION (revised post-gate)`. The contract leg (the Polygon-fork mint) is ALREADY green IN-VM — Phase 15 is integration + packaging, so most rows assert EXISTING tests stay green while Wave-0 adds the **hosted BuildBear-sandbox provisioning** (a cold-deploy SPIKE de-risks the inlined core deploy, then the EOA-funded single-broadcast provisioning resolves the funding + core-deploy blockers the gate flagged), the CI job, and the handoff refresh.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework (contracts)** | Foundry `forge` (toolchain `@v1`) + `bulloak 0.9.2` |
| **Framework (frontend)** | Vitest `4.1.6` (unit) + Playwright `1.60.0` (e2e, Chromium) — separate repo `/home/jmsbpp/apps/d2p/frontend` |
| **Config file** | `contracts/foundry.toml` (`rpc_endpoints.polygon`, `rpc_storage_caching=[8453,137]`); frontend `playwright.config.ts` / `vitest.config.ts` |
| **Quick run command** | `cd contracts && forge test --no-match-path 'test/**/*fork*'` (keyless) ; frontend `pnpm test:quick` |
| **Polygon-fork command (in-VM)** | `cd contracts && forge test --match-path 'test/fork/DemoMacroHedgeExecutor.fork.t.sol' --retries 2 --delay 3` (needs `ALCHEMY_API_KEY`; pinned block 86_900_000 — this is the in-VM/Alchemy path, DECOUPLED from the BuildBear demo block) — also `make test-demo` |
| **Hosted-demo cold-deploy spike** | `cd contracts && forge script script/ProvisionBuildBearDemo.s.sol --sig 'spike()' --rpc-url "$BUILDBEAR_RPC_URL" --broadcast --slow --private-key "$BUILDBEAR_DEPLOYER_PK"` (de-risks the inlined core deploy against the BuildBear sandbox) |
| **Hosted-demo provisioning** | `cd contracts && bash script/provision-buildbear-demo.sh` (needs `BUILDBEAR_RPC_URL` + `BUILDBEAR_DEPLOYER_PK` in gitignored `.env`; funds the EOA via `buildbear_ERC20Faucet` on the single sandbox RPC then a SINGLE `forge --broadcast` of `run()`) |
| **Full e2e command** | frontend `pnpm test:e2e` (Playwright Chromium) — SIBLING-REPO; the real-mint wiring is NOT an abrigo-somnia task |
| **Estimated runtime** | keyless contracts ~30s · in-VM polygon fork ~60–120s (RPC-cached) · BuildBear provisioning ~1–3 min (network) · frontend e2e ~30s |

---

## Sampling Rate

- **After every task commit:** `forge build` + the keyless suite (`forge test --no-match-path 'test/**/*fork*'`) for contracts; the single relevant in-VM fork test when the executor/mint path is touched; `bash -n` for any new shell script.
- **After every plan wave:** the full in-VM polygon-fork suite (`make test-demo`).
- **Before `/gsd:verify-work`:** `forge build` + bulloak + keyless green in CI; the polygon-fork CI job green (with `ALCHEMY_API_KEY`); the cold-deploy spike PASSED on the sandbox; the BuildBear sandbox provisioned (mint tx hash printed + explorer-verifiable, `buildbear-deployments.json` written); the demo video captured; `docs/UI-AGENT-HANDOFF.md` refreshed.
- **Max feedback latency:** ~120 seconds (the in-VM polygon-fork run); the hosted spike + provisioning are Wave-0/checkpoint steps, not per-commit gates (the BuildBear free RPC has a rate cap — do NOT loop it in CI).

---

## Per-Task Verification Map

> Task IDs assigned by the planner; every plan task MUST map to a row here (zero orphans), and every row below MUST be covered by a plan task. "✅ exists" = an already-green test the wave must not regress; "❌ W0" = a Wave-0 gap to build.

| Req | Behavior (testable claim) | Test Type | Automated Command | Plan Task | Status |
|-----|---------------------------|-----------|-------------------|-----------|--------|
| E2E-01 | `resolveFromMandate` mints the real wCOP/USDC position at strike **360360**, executor owns the leg (in-VM regression anchor) | fork (contract) | `forge test --match-test test_resolveFromMandate_mintsThroughExecutor --retries 2` | 15-01 T1 (regression anchor) | ⬜ pending |
| E2E-01 | Agent-2 decision surfaced: 8-param `ExecutorDecided` fires `nonErgodicDisclosed==true` + TEMPLATE caveat (in-VM) | fork | `forge test --match-test test_executorDecided_surfacesHonestyFlag` | 15-01 T1 (regression anchor) | ⬜ pending |
| E2E-01 | BASIC live read: post-mint `quoteMargin` returns a `BalanceDelta` w/o reverting (arg = `positionId.strike(0)`, not a literal tick); `numberOfLegs>0` (in-VM) | fork | `forge test --match-test test_quoteMargin_basicReadAfterMint --retries 2` | 15-01 T1 (creates it) | ⬜ pending |
| E2E-01 | Cold-deploy SPIKE: the INLINED Panoptic-core deploy (no `new DeployProtocol().run()` nested broadcast) lands on the hosted BuildBear sandbox in isolation — metadata resolves, PoolManager has code on the Polygon fork, factory/RiskEngine deploy with non-zero code, `cast chain-id`=31337 | provisioning (forge spike) | `forge build` (compiles); `forge script … --sig 'spike()' --broadcast` (human-run with keys) + grep (`spike`, no `new DeployProtocol`, `FACTORY_ADDRESS`/`RISK_ENGINE_ADDRESS`) | 15-01 T2 (spike checkpoint) | ⬜ pending |
| E2E-01 | The hosted Agent-2 mint: INLINED core deploy + read-back addresses threaded into `deployNewPool` + the 9-arg ctor (never `FACTORY_V4_ADDR`), deposit-on-behalf (`receiver=executor`, no `deal()`/prank), mint via `resolveFromMandate` under ONE broadcast | provisioning (forge script) | `forge build` (compiles `ProvisionBuildBearDemo.s.sol`); grep (`! new DeployProtocol`, `! FACTORY_V4_ADDR`, `deployNewPool`, `vegoid`, `! deal(`, `! startPrank`) | 15-01 T3 (the `run()` + `.env.example`) | ⬜ pending |
| E2E-01 | The runner funds the deployer EOA via `buildbear_ERC20Faucet` on the single sandbox RPC BEFORE a SINGLE `--broadcast`, parses the chainId-aware (31337) `run-latest.json` selecting the `resolveFromMandate` tx, writes `buildbear-deployments.json`, prints the verifiable mint tx hash | provisioning (bash) | `bash -n script/provision-buildbear-demo.sh` (syntax); grep (buildbear_ERC20Faucet, `cast wallet address`, single `--broadcast`, `cast chain-id`, resolveFromMandate, no load-state, no tenderly, no key literal, deployments artifact, mint tx) | 15-01 T4 (the runner) | ⬜ pending |
| E2E-01 | The real-browser UI flow (prompt→A1→A2-confirm→mint reading off the live sandbox) streams in DOM order; honesty greps (no "executed/realized", no `$value`, no raw `0x000…0`) | e2e (UI) | `pnpm test:e2e` (`tests/e2e/cornerstone.spec.ts`) | **SIBLING-REPO-GATED, NOT an abrigo-somnia task** — the d2p-frontend mint panel reading the position/decision off the live sandbox is wired in `/home/jmsbpp/apps/d2p/frontend` (Plan 03 handoff drives it); NOT guaranteed by June 11. The MVP deliverable does NOT require it. | ⬜ sibling-repo (stretch) |
| E2E-01 | MVP-deliverable demo artifact: the script run + BuildBear-explorer `MINT_TX_HASH` succeeded, narrated over the cornerstone UI (Scenario-1 story, no-bridge honesty label) — DEGRADED fallback to the mock UI is labeled, NOT a success condition | manual + video | `script/provision-buildbear-demo.sh` run + the explorer-verifiable mint tx + screen capture (**video = judges' artifact**) | 15-01 T5 (checkpoint) | ⬜ pending |
| E2E-01 | The handoff doc carries the shipped shapes + the BuildBear swap-to-real + no-bridge / Agent-1-live-on-Somnia / sibling-repo boundary | doc | `grep` checks (regimeZt, uint128 positionSize, buildbear, buildbear-deployments.json, no cross-chain bridge, no serve-polygon-fork-demo.sh, no tenderly) | 15-03 T1 + T2 | ⬜ pending |
| E2E-02 | `forge build` green | CI (keyless) | build-and-spec job | 15-02 T2 (proven un-regressed) | ⬜ pending |
| E2E-02 | per-file `bulloak check` over every EXISTING `.tree` | CI (keyless) | the `for t in …; do bulloak check "$t"; done` loop | 15-02 T2 (proven un-regressed) | ⬜ pending |
| E2E-02 | polygon-fork (in-VM) tests gated/cached/retried; live e2e manual-only | CI (secret) | NEW `polygon` job mirroring `fork`; `somnia-e2e` stays `workflow_dispatch` | 15-02 T1 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

> **BuildBear pivot note (CI unaffected):** the `polygon` CI job (15-02 T1) gates the IN-VM Foundry fork tests via `ALCHEMY_API_KEY` (the `rpc_endpoints.polygon` archive source, pinned block 86_900_000) — it does NOT run the hosted BuildBear provisioning. The hosted sandbox is the demo-env (15-01 T2/T3/T4/T5), not a CI gate, and its block (Polygon at LATEST) is DECOUPLED from the in-VM test's 86.9M pin. So the Tenderly→BuildBear env swap leaves 15-02 byte-unchanged.

> **E2E-01 scope (honest):** the abrigo-somnia MVP deliverable = the BuildBear provisioning + the explorer-verifiable `MINT_TX_HASH` + `buildbear-deployments.json` + the refreshed handoff doc (15-03) + the in-VM `quoteMargin` read + the CI (15-02). The real-browser prompt→mint UI flow (the d2p-frontend mint panel reading off the live sandbox) is SIBLING-REPO-gated and NOT guaranteed by June 11 — it is a labeled STRETCH, not an abrigo-somnia success condition. The guaranteed artifact is the script-run + explorer-tx narrated over the cornerstone UI (15-01 T5).

---

## Wave 0 Requirements

- [ ] `contracts/script/ProvisionBuildBearDemo.s.sol` `spike()` — the FIRST, ISOLATED cut: INLINES ONLY the DeployProtocol core deploy body (SFPM + RiskEngine + PanopticFactoryV4 + the metadata-pointer loop) under a single `vm.startBroadcast()`, `console2.log`s + `require`s non-zero code on the read-back factory/riskEngine. De-risks the single biggest unknown (the inlined cold deploy has never run against a HOSTED sandbox). Tasks T3–T5 gated on it. *(E2E-01 — cold-deploy feasibility spike, B2 de-risk)*
- [ ] `contracts/script/ProvisionBuildBearDemo.s.sol` `run()` — extends the spike: threads the READ-BACK factory/riskEngine LOCALS into `deployNewPool` + the 9-arg executor ctor (never `FACTORY_V4_ADDR`/`RISK_ENGINE_ADDR`), deposit-on-behalf (`receiver=executor`, NO `deal()`/`prank`), mints via `resolveFromMandate`, all under ONE broadcast; `console2.log`s the read-back addresses + result. *(E2E-01 hosted mint — B2 resolved via inlined deploy + read-back, no nested broadcast, sidesteps foundry#8493)*
- [ ] `contracts/script/provision-buildbear-demo.sh` — funds the deployer EOA (wCOP + USDC via `buildbear_ERC20Faucet` on the single sandbox RPC, EOA addr derived via `cast wallet address`; native gas pre-funded by BuildBear, `buildbear_nativeFaucet` top-up only if needed) BEFORE a SINGLE `forge script --broadcast` of `run()` (B1 resolved — no whale, no `deal()`), reads the live chainId via `cast chain-id` (31337) and parses `broadcast/.../$CHAIN_ID/run-latest.json` selecting the `resolveFromMandate` tx for `MINT_TX_HASH`, writes `contracts/script/out/buildbear-deployments.json` (read-back addresses + sandbox RPC + verifiable `mintTxHash`, mirroring the Somnia shape), prints the mint tx hash. Secrets stay in gitignored `contracts/.env`; no key literal; the sandbox RPC is a bearer secret server-side only. *(E2E-01 hosted demo node)*
- [ ] `contracts/.env.example` — document `BUILDBEAR_RPC_URL` + `BUILDBEAR_DEPLOYER_PK` (and `UNIV4_POOL_MANAGER`/`UNIV3_FACTORY` for the inlined deploy) with empty values. *(E2E-01 — secret hygiene)*
- [ ] `.github/workflows/contracts-ci.yml` — add the `polygon` job: `env: ALCHEMY_API_KEY` (the var the IN-VM fork tests actually read — NOT a new `POLYGON_RPC_URL`), `actions/cache` key `foundry-rpc-polygon-86900000-v1`, `--retries 2 --delay 3`, graceful skip when the key is unset, keep `somnia-e2e` on `workflow_dispatch`. NO invented `--shard` flag. (The BuildBear hosted env is NOT a CI gate.) *(E2E-02)*
- [ ] An explicit `quoteMargin` assertion in the IN-VM fork suite for the BASIC-read claim (`test_quoteMargin_basicReadAfterMint`, arg = `positionId.strike(0)`). *(E2E-01 — augment existing)*
- [ ] `docs/UI-AGENT-HANDOFF.md` refresh — fix the stale "34-line STUB" line, the 6-param→8-param `ExecutorDecided`, and flip "build against mocks only" to the BuildBear hosted-fork swap-to-real (chainId 31337, addresses from `buildbear-deployments.json`), keeping the no-bridge / Agent-1-live-on-Somnia / sibling-repo framing. *(E2E-01 doc — gates the frontend agent's correctness)*
- [ ] **SIBLING-REPO (`/home/jmsbpp/apps/d2p/frontend`), NOT an abrigo-somnia task:** Frontend real-mint path — a `defineChain({ id: 31337, rpc: BUILDBEAR_RPC_URL })` for the BuildBear Polygon-fork chain added to `lib/wagmi/config.ts` (alongside the live Somnia chain) + a mint panel calling `resolveFromMandate` + reading the position, addresses/RPC sourced from `buildbear-deployments.json`, real `ExecutorDecided`/`PositionMinted` reader/writer ALONGSIDE `fromMockEvent` (graceful mock fallback); repoint `wagmi.config.ts` at `contracts/out/` + run `pnpm contracts:gen`. Plus extend `tests/e2e/cornerstone.spec.ts` for the real-mint read with a mock-fallback. *(E2E-01 UI↔chain; the MVP deliverable does NOT require this — the provisioning + mint tx hash + the demo video cover it; NOT guaranteed by June 11)*

*Framework install: none — Foundry, bulloak, Playwright, Vitest all already pinned in CI/lockfiles. BuildBear is a hosted service (no local install); the sandbox RPC + deployer key go in gitignored `.env`.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| The cold-deploy spike landing on the live sandbox | E2E-01 | The sandbox is created with the user's BuildBear account (Claude cannot obtain the RPC URL); the spike broadcasts a real deploy | Create the BuildBear Sandbox (Polygon fork, latest), put the sandbox RPC + the well-known account-0 key in `.env`, export `UNIV4_POOL_MANAGER`/`UNIV3_FACTORY`/`GUARDIAN_ADMIN`/`TREASURER`, run `forge script … --sig 'spike()' --broadcast`, confirm non-zero `FACTORY_ADDRESS`/`RISK_ENGINE_ADDRESS` + PoolManager code + `cast chain-id`=31337 |
| The MVP-deliverable demo video (script run + explorer mint tx narrated over the cornerstone UI) | E2E-01 | The judges' artifact is a watchable run; the guaranteed deliverable is the script-run + explorer-tx capture (the real-browser-mint flow is sibling-repo-gated) | Provision the sandbox via `provision-buildbear-demo.sh`, confirm the BuildBear explorer `MINT_TX_HASH` succeeded, screen-record the run narrated over the cornerstone UI with the no-bridge honesty label |
| The real-browser prompt→mint UI flow (STRETCH) | E2E-01 | Depends on sibling-repo wiring (`/home/jmsbpp/apps/d2p/frontend` mint panel reading off the live sandbox); NOT guaranteed by June 11 | If the frontend mint panel is wired by demo day, record the real browser flow; otherwise the MVP video above is the deliverable |
| The BuildBear Sandbox creation + the mint tx | E2E-01 | The sandbox is created in the BuildBear dashboard with the user's account (Claude cannot obtain the RPC); the mint tx is verified in the per-sandbox explorer; free sandboxes live 3 days (create within 72h of demo) | Create the Sandbox (Polygon fork, latest), set the RPC + deployer key in `.env`, run the runner, confirm `MINT_TX_HASH` exists + succeeded in the BuildBear explorer |
| The live Somnia-testnet Agent-1 leg (STT spend) | E2E-01 (Agent-1 provenance) | Costs real STT; testnet faucet is browser-gated; deployed strategist is still v1; Somnia is never forked (live validators + keeper-proxy required) | `workflow_dispatch` only; lead the demo with the real RECORDED v1 trace per research recommendation |
| The polygon-fork CI job actually running green on a real Actions runner | E2E-02 | Needs the `ALCHEMY_API_KEY` Actions secret set on the repo | Trigger the workflow after the secret is configured; confirm the `polygon` job is green |

---

## Validation Sign-Off

- [ ] Every plan task maps to a row in the Per-Task Verification Map (zero orphans, both directions)
- [ ] Sampling continuity: no 3 consecutive tasks without an automated verify (the keyless suite + `forge build` + `bash -n` cover this)
- [ ] Wave 0 covers all MISSING references (the cold-deploy spike, the BuildBear provisioning forge script + runner, the `.env.example` keys, the CI job, the in-VM quoteMargin assertion, the handoff refresh)
- [ ] No watch-mode flags in any command
- [ ] Feedback latency < 120s (in-VM gate; hosted spike + provisioning are Wave-0/checkpoint steps)
- [ ] `nyquist_compliant: true` set in frontmatter (after planner alignment)

**Approval:** pending
