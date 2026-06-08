# Requirements: d2p Finance Frontend — Milestone v3.0 (Judge-Runnable Live BuildBear Demo)

**Defined:** 2026-06-08
**Core Value:** Make the lab's research outputs and live hedging instruments accessible — to humans browsing, to participants transacting, and to AI agents consuming — through a single coherent umbrella surface that treats agent-first interaction as a primary design constraint.

**Milestone goal:** Turn Phase 9's deferred cornerstone live-tx integration into a real, judge-runnable demo — a one-click, pre-funded, genuine on-chain mint against a shared BuildBear sandbox fork that the frontend reflects live, decoupled from the outaged/operator-only Somnia Agent-1 leg, with an operator reset guard and the backend `--no-mint`/fresh-executor provisioning variant.

**Locked decisions (constrain every requirement):**
1. Judge-interactive on-chain path is **BuildBear-only** (Somnia stays operator-only).
2. Judge action is **one-click pre-funded** (no bring-your-own-funded-wallet; a server-side demo signer signs).
3. **Shared fork + operator reset guard** (no per-judge provisioning, no KV-backed auto-reset for v3.0).
4. Backend BuildBear provisioning variant is **in scope** (`packages/backend`).

---

## v3.0 Requirements

### Backend Provisioning (PROV)

- [ ] **PROV-01**: Operator can run a `--no-mint` / `SKIP_MINT=true` provisioning variant that deploys a fresh `MacroHedgeExecutor` on the BuildBear fork with `numberOfLegs == 0`
- [ ] **PROV-02**: The provisioning run funds the demo signer address with enough native gas (and any required tokens) to sign `resolveFromMandate` (uses `hardhat_setBalance`; basefee zeroed before any `buildbear_ERC20Faucet`)
- [ ] **PROV-03**: The provisioning run captures an `evm_snapshot` id and records it in the deployment artifact (`snapshotId` field)
- [ ] **PROV-04**: The provisioning run writes `buildbear-deployments.json` directly to the frontend artifact path (no manual copy step) so committed addresses cannot drift from the fork

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

### Anti-Fishing & Mode Integrity (HONEST)

- [ ] **HONEST-01**: When `numberOfLegs > 0` (fork already used), the judge sees an explicit "fork used — reset needed" advisory state, never a silent fallback to replay
- [ ] **HONEST-02**: The workflow store exposes a `failed` terminal `RunState` so live errors surface explicitly instead of silently degrading
- [ ] **HONEST-03**: Every live→replay degradation is announced via `aria-live` with a specific reason (TTL expired / fork used / RPC unreachable)
- [ ] **HONEST-04**: Live mode discloses that the transaction was signed by a pre-funded demo signer (not the judge's wallet) and that the Somnia Agent-1 leg is operator-only in this build
- [ ] **HONEST-05**: The "BuildBear sandbox · fork-verified" provenance pill is labeled precisely and styled neutral (never pass/green)

### Judge Runbook & Reset Ops (OPS)

- [ ] **OPS-01**: A judge can go clone → build → see the live demo with zero secrets and no wallet funding (corrected `.env.example`, documented runbook)
- [ ] **OPS-02**: A fresh clone is green: keyless `forge test --no-match-path '*fork*'` and `pnpm build` both pass (carry-forward of the `.env.example`/README fixes)
- [ ] **OPS-03**: An operator can reset the shared fork between judge sessions via a documented procedure (`evm_revert` + re-snapshot, or re-run the provisioning variant)
- [ ] **OPS-04**: The demo survives the BuildBear 3-day TTL via a documented provision-morning-of procedure; an expired fork degrades to a labeled advisory, never a silent or broken state

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

Populated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| PROV-01 | — | Pending |
| PROV-02 | — | Pending |
| PROV-03 | — | Pending |
| PROV-04 | — | Pending |
| MINT-01 | — | Pending |
| MINT-02 | — | Pending |
| MINT-03 | — | Pending |
| MINT-04 | — | Pending |
| MINT-05 | — | Pending |
| EVID-01 | — | Pending |
| EVID-02 | — | Pending |
| EVID-03 | — | Pending |
| EVID-04 | — | Pending |
| EVID-05 | — | Pending |
| HONEST-01 | — | Pending |
| HONEST-02 | — | Pending |
| HONEST-03 | — | Pending |
| HONEST-04 | — | Pending |
| HONEST-05 | — | Pending |
| OPS-01 | — | Pending |
| OPS-02 | — | Pending |
| OPS-03 | — | Pending |
| OPS-04 | — | Pending |

**Coverage:**
- v3.0 requirements: 23 total
- Mapped to phases: 0 (roadmap pending)
- Unmapped: 23 ⚠️

---
*Requirements defined: 2026-06-08*
*Last updated: 2026-06-08 after milestone v3.0 definition*
