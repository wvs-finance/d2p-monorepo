# Requirements: d2p Finance Frontend — Milestone v3.0 (Judge-Runnable Live BuildBear Demo)

**Defined:** 2026-06-08
**Core Value:** Make the lab's research outputs and live hedging instruments accessible — to humans browsing, to participants transacting, and to AI agents consuming — through a single coherent umbrella surface that treats agent-first interaction as a primary design constraint.

**Milestone goal:** Turn Phase 9's deferred cornerstone live-tx integration into a real, judge-runnable demo — a one-click, pre-funded, genuine on-chain mint against a shared BuildBear sandbox fork that the frontend reflects live, decoupled from the outaged/operator-only Somnia Agent-1 leg, with an operator reset guard and the backend `--no-mint`/fresh-executor provisioning variant.

**Locked decisions (constrain every requirement):**
1. Judge-interactive on-chain path is **BuildBear-only** (Somnia stays operator-only).
2. Judge action is **one-click pre-funded** (no bring-your-own-funded-wallet; a server-side demo signer signs).
3. **Shared fork + operator reset guard** (no per-judge provisioning, no KV-backed auto-reset for v3.0).
4. Backend BuildBear provisioning variant is **in scope** (`packages/backend`).
5. **Single-use is enforced on-chain.** A real `require(pool.numberOfLegs(address(this)) == 0, "fork used")` is added to `MacroHedgeExecutor.resolveFromMandate` (contract change + redeploy on the fork). The frontend `numberOfLegs` read is then a true reflection of an on-chain guarantee, not a UI-only convention. *(Resolves two-reviewer BLOCKER: the freshness gate did not exist in the contract.)*
6. The demo signer is a **dedicated** server-only `DEMO_SIGNER_PK`, **distinct from the deployer key**, funded via `hardhat_setBalance` **inside** the captured snapshot. *(Resolves two-reviewer BLOCKER: PROV-02 funded the deployer, not the signer.)*

> **Review status:** v1 of this requirement set + roadmap failed the mandatory two-reviewer pass (Reality Checker + Solidity Smart Contract Engineer — both NEEDS WORK). This revision (v2) encodes the BLOCKER/MAJOR resolutions. Re-review required before commit/execution.

---

## v3.0 Requirements

### Backend Contract — Single-Use Guard (EXEC)

- [ ] **EXEC-01**: `MacroHedgeExecutor` reverts with `"fork used"` when `pool.numberOfLegs(address(this)) != 0`. The guard is placed in the **shared sink `_resolveAndMintAtStrike`** (not only `resolveFromMandate`) so all three mint entrypoints (`resolveFromMandate`, `resolveAndMint`, `_onResult`) are covered and single-use is unbypassable. The check must sit **before any `pool.dispatch`** (the `numberOfLegs` view reverts `Reentrancy()` if called while the pool guard is active). Verified by a Foundry unit/fuzz test (first call succeeds, second reverts `"fork used"`, including via `resolveAndMint`) **and** by a recorded **on-fork** `cast call`/`cast send` showing the redeployed executor reverts `"fork used"` on the 2nd attempt. *(Prerequisite spike runs against a freshly-provisioned `--no-mint` stack — see PROV — so the pre-guard 2nd-mint baseline is unambiguous, not a dirty-pool revert.)*

### Backend Provisioning (PROV)

- [ ] **PROV-01**: Operator can run a `--no-mint` / `SKIP_MINT=true` provisioning variant that deploys a fresh `MacroHedgeExecutor` on the BuildBear fork with `numberOfLegs == 0`
- [ ] **PROV-02**: The provisioning run funds the **dedicated `DEMO_SIGNER_PK` address** (distinct from the deployer) with enough native gas to sign `resolveFromMandate`, via `hardhat_setBalance`, and the funding happens **inside the captured snapshot** so a later `evm_revert` restores the funded balance (basefee zeroed before any `buildbear_ERC20Faucet`). Collateral/approvals for the executor are deposited as part of the deploy so the signer's **first** mint cannot revert for missing collateral.
- [ ] **PROV-03**: The provisioning run captures an `evm_snapshot` id **after** deploy + collateral deposit + signer funding but **before** any mint, and records it in the deployment artifact (`snapshotId` field). Verified by a round-trip: `evm_revert(snapshotId)` then a fresh `resolveFromMandate` succeeds (legs, collateral, and signer gas all restored).
- [ ] **PROV-04**: The provisioning run writes `buildbear-deployments.json` directly to the frontend artifact path (computed from a stable anchor, with `mkdir -p`) with `mintTxHash` serialized as JSON `null` (not `""`) on the `--no-mint` path, so committed addresses cannot drift from the fork

### Live Mint Path (MINT)

- [ ] **MINT-01**: A server-only API route (`/api/cornerstone/buildbear-sign`) signs and broadcasts `resolveFromMandate` using a pre-funded demo signer key (`DEMO_SIGNER_PK`) that is never `NEXT_PUBLIC_`, never sent to the client, never committed
- [ ] **MINT-02**: The judge live path is BuildBear-only — it never calls the Somnia `/api/abrigo/agent1` route (decoupling cut made in `handleLiveConfirm` before that fetch)
- [ ] **MINT-03**: `runWorkflowLive` sources its mandate from the recorded replay artifact, not a live Somnia Agent-1 response
- [ ] **MINT-04**: The `void writeContractAsync` stub is removed and the confirm action triggers a real on-chain mint via the server route
- [ ] **MINT-05**: A judge can trigger the live mint with a single click — no wallet connect, no funding, no secret required

### On-Chain Evidence (EVID)

- [ ] **EVID-01**: After a confirmed mint, the judge sees the real transaction hash with a copy button in `LiveTxStateRow` confirmed state
- [ ] **EVID-02**: After confirmation, the judge sees a working BuildBear explorer link built from the real receipt — rendered only when a real URL exists, never a placeholder/fake link
- [ ] **EVID-03**: The confirmed state displays the real block number from the receipt
- [ ] **EVID-04**: The evidence panel shows the minted position token ID and the strike/tick derived from the real `positionId`
- [ ] **EVID-05**: The evidence panel shows the margin delta (hedge cost) decoded from the real mint
- [ ] **EVID-06**: When no live receipt exists (mint not yet run, reverted, or fork unavailable), the evidence panel renders an honest "not yet minted" empty state — never fabricated/placeholder values (no `0x000…`, no fake `$` PnL)

### Anti-Fishing & Mode Integrity (HONEST)

- [ ] **HONEST-01**: When the fork is already used — detected by the frontend `numberOfLegs(executor) > 0` read AND/OR an on-chain `"fork used"` revert (EXEC-01) — the judge sees an explicit "fork used — reset needed" advisory state, never a silent fallback to replay
- [ ] **HONEST-02**: The workflow store's `RunState` is extended with the live states the engine already emits (`submitting`/`pending`/`reverted`/`confirmed`) plus terminal `failed` and `fork-used`, and the engine↔store event-shape contract is reconciled so no emitted event is dropped. *(This is a state-machine extension, not an additive field.)*
- [ ] **HONEST-03**: The three existing silent `setResolvedMode('replay')` flips in `handleLiveConfirm` are removed; every live→replay degradation is instead announced via `aria-live` with a specific reason (TTL expired / fork used / RPC-or-CORS unreachable / mint reverted)
- [ ] **HONEST-04**: Live mode discloses (a) the tx was signed by a pre-funded **dedicated** demo signer (not the judge's wallet, not the deployer), (b) the Somnia Agent-1 leg is operator-only in this build, and (c) the live mint always uses the **PKE** economic-theory path, so the displayed school/strategist label is cosmetic on the live path
- [ ] **HONEST-05**: The "BuildBear sandbox · fork-verified" provenance pill is labeled precisely and styled neutral (never pass/green)

### Judge Runbook & Reset Ops (OPS)

- [ ] **OPS-01**: A judge can go clone → build → see the live demo with zero secrets and no wallet funding (corrected `.env.example`, documented runbook)
- [ ] **OPS-02**: A fresh clone is green: keyless `forge test --no-match-path '*fork*'` and `pnpm build` both pass (carry-forward of the `.env.example`/README fixes)
- [ ] **OPS-03**: An operator can reset the shared fork between judge sessions via a documented procedure. The runbook states the one-use snapshot limitation loudly: each `evm_snapshot` id is good for exactly one `evm_revert`; the operator must re-snapshot (and refresh `snapshotId`) or re-run the provisioning variant for the next session.
- [ ] **OPS-04**: The demo survives the BuildBear 3-day TTL: the runbook makes "re-provision within T-24h of judging" a **hard precondition** (the fork must show `numberOfLegs == 0` / `mintTxHash: null` before any live claim), and an expired/used fork degrades to a labeled advisory, never a silent or broken state. **The pre-EXEC-01 committed artifact and its guard-less executor address are explicitly retired** — they are poisoned (already-minted, no on-chain guard) and must never be used for a live claim; the `--no-mint` redeploy overwrites the artifact, and `replay`-mode pinned addresses are confirmed to either be address-independent or re-reconciled against the post-redeploy executor.
- [ ] **OPS-05**: The runbook documents the **single-concurrent-judge** limitation (one shared fork + one signer + one snapshot): two judges minting in the same session is a known, stated constraint — the second sees the `"fork used"` advisory until the operator resets. The `buildbear-sign` route does a signer-balance pre-flight before submitting.
- [ ] **OPS-06** *(cross-cutting governance — user NON-NEGOTIABLE 2026-06-08)*: Every command this milestone claims as working/on-rhythm is a step in `.github/workflows/ci.yml`, and merging to `main` happens **only via PR with that CI green**. New backend tests (incl. the EXEC-01 guard test) are covered by the existing `forge test` lane; new frontend route/unit tests by the `vitest` lane. The live BuildBear-fork spike/provisioning is **excluded by design and never claimed on-rhythm** (operator-manual, transcript-recorded — see `10-SPIKE-EVIDENCE.md`). Enforcement of the PR gate (branch protection / rulesets) is tracked separately because it depends on repo plan/visibility (see Phase 13 / project decision).

---

## Future Requirements

Deferred beyond v3.0. Tracked, not in this roadmap.

### Reset Automation (RESET)

- **RESET-01**: KV-backed (Upstash) auto-reset so the mint route can `evm_revert` + re-snapshot and persist the new snapshot id across serverless invocations (robust concurrent-judge support)
- **RESET-02**: Per-judge fork provisioning (fresh sandbox per judge + artifact rotation)
- **RESET-03**: Streaming cross-judge live state sync (WebSocket)

---

## Out of Scope

Explicitly excluded for v3.0, with reasoning.

| Feature | Reason |
|---------|--------|
| Judge funds own wallet / provides a private key | Contradicts locked decision (one-click pre-funded); excludes any judge without a funded wallet; security theater |
| Mainnet / production-funds exposure | PROJECT.md security constraint — protocol funds are real; BuildBear fork is the correct boundary |
| Wallet-connect / switch-chain UX in the judge path | Pre-funded demo signer makes wallet prompts friction; gate states stay in code but unreachable in judge flow |
| Fake/placeholder explorer links | Honesty invariant — a 404 link is worse than no link; render only real receipt-derived URLs |
| Somnia live two-chain run for judges | External validator-callback outage + operator-only; judges get BuildBear-only, full two-chain stays operator mode |
| Automatic fork reset on every run | Mutates state under concurrent runs; operator reset between sessions is the v3.0 model |

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| EXEC-01 | Phase 10 | Pending |
| PROV-01 | Phase 10 | Pending |
| PROV-02 | Phase 10 | Pending |
| PROV-03 | Phase 10 | Pending |
| PROV-04 | Phase 10 | Pending |
| MINT-01 | Phase 11 | Pending |
| MINT-02 | Phase 11 | Pending |
| MINT-03 | Phase 11 | Pending |
| MINT-04 | Phase 12 | Pending |
| MINT-05 | Phase 12 | Pending |
| HONEST-01 | Phase 12 | Pending |
| HONEST-02 | Phase 12 | Pending |
| HONEST-03 | Phase 12 | Pending |
| EVID-01 | Phase 13 | Pending |
| EVID-02 | Phase 13 | Pending |
| EVID-03 | Phase 13 | Pending |
| EVID-04 | Phase 13 | Pending |
| EVID-05 | Phase 13 | Pending |
| EVID-06 | Phase 13 | Pending |
| HONEST-04 | Phase 13 | Pending |
| HONEST-05 | Phase 13 | Pending |
| OPS-01 | Phase 13 | Pending |
| OPS-02 | Phase 13 | Pending |
| OPS-03 | Phase 13 | Pending |
| OPS-04 | Phase 13 | Pending |
| OPS-05 | Phase 13 | Pending |
| OPS-06 | Cross-cutting (CI from Phase 10; PR-gate per project decision) | Pending |

**Coverage:**
- v3.0 requirements: 27 total (added EXEC-01, EVID-06, OPS-05 in the two-reviewer revision; OPS-06 CI/PR governance per user directive 2026-06-08)
- Mapped to phases: 27 (100%) — OPS-06 is cross-cutting (CI coverage grows each phase; PR-enforcement gated on repo plan/visibility)
- Unmapped: 0

---
*Requirements defined: 2026-06-08*
*Last updated: 2026-06-08 — traceability populated after v3.0 roadmap creation (phases 10–13)*
