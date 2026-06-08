# Feature Research

**Domain:** Hackathon judge-facing one-click pre-funded live on-chain demo (BuildBear fork, v3.0)
**Researched:** 2026-06-08
**Confidence:** HIGH (derived from existing codebase, locked product decisions, and hackathon judging context)

---

## Framing: What a Judge Needs vs What an Operator Needs

A hackathon judge is NOT the operator. The judge:

- Has 5–10 minutes with the demo, typically under stress and context-switching rapidly between teams.
- Cannot and must not fund a wallet.
- Must be able to verify the claim "this is real on-chain, not faked" with one click on an external
  source (the BuildBear explorer).
- Cares about: does the thing you claimed to build actually execute? Does the result match the claim?
  Did it revert? Can I see it on an explorer?
- Does NOT care about: wallet UX, chain-switch friction, gas estimation, or anything that assumes
  prior setup.

The existing replay mode already handles "guaranteed evidence" for judges who cannot run live.
v3.0 adds one more option: a judge who CAN run live should find zero friction between landing on
the page and seeing a real on-chain confirmation. Every feature below is evaluated through that lens.

---

## Feature Landscape

### Table Stakes (A Credible Live Demo Requires These)

| Feature | Why Expected | Complexity | Dependency on Existing Components |
|---------|--------------|------------|----------------------------------|
| **Pre-funded demo signer signs the write** — no judge wallet required | Without this, zero judges can run live. The locked decision is explicit: funded demo signer / BuildBear auto-fund, zero judge secrets. | MEDIUM | `runWorkflowLive` in `workflow-engine.ts` currently expects `writeContractAsync` from `useWriteContract`. The signer source must be swapped to a server-side or injected pre-funded signer. The wagmi wiring (`useSwitchChain` + `useWriteContract`) stays but the wallet can be the demo signer, not the judge. |
| **Explicit live-mode label always visible before and after the run** | Judges must know they are seeing a real chain write, not a replay or mock. Anti-fishing discipline. | LOW | `ModeBanner` already implements `radio + "en vivo · on-chain"` label with `aria-live="polite"`. The `ExplorerLinks.buildbearAgent2Url` slot already exists in the component — it just needs a real URL wired in from the confirmed tx. |
| **Real tx hash displayed with copy button during and after mint** | "Real hash" is the single falsifiable claim. If there is no hash, a judge cannot verify anything. | LOW | `LiveTxStateRow` already handles `submitting / pending / confirmed / reverted / error` states with full hash + copy button. The component is complete; the gap is connecting `runWorkflowLive` to actually fire the write instead of `void writeContractAsync`. |
| **BuildBear explorer link in evidence panel after confirmation** | Hash alone is insufficient — a judge needs to open the transaction independently and see it on-chain. A dead or missing explorer link breaks trust. | LOW | `OnChainEvidencePanel` already accepts `explorerUrl?: string` with the honesty invariant "only render if a real URL is present, never fake". The BuildBear explorer URL pattern is `https://<node>.rpc.buildbear.io/explorer/tx/<hash>`. Needs to be constructed from `deployment.rpcUrl` + confirmed `hash` and passed through. |
| **Freshness gate reset path: handle `numberOfLegs > 0` as a resettable state, not a silent fallback** | Shared fork means a prior successful run leaves `numberOfLegs > 0`. If the next judge hits this gate, they must see an explicit advisory — not silently degrade to replay with no explanation. | MEDIUM | `CornerstoneClientShell` already checks `numberOfLegs` in `runMountProbe`. Currently: `legs > 0` → `setResolvedMode('replay')`. This is the silent substitution anti-pattern for the v3.0 shared-fork scenario. Needs an intermediate state: show an explicit "fork used — reset needed" advisory before degrading or before exposing a reset action. |
| **Backend `--no-mint` / fresh-executor provisioning variant** | If the fork has no freshly-provisioned executor (i.e., `resolveFromMandate` was already called), the write will revert. This is the v2.0 cross-repo gap. The frontend cannot self-heal a stale fork state; the backend must provision a fresh executor before judging begins. | HIGH | `packages/backend/keeper` has the proxy/route infrastructure but the fork provisioning logic (deploy fresh executor, fund it, set `numberOfLegs = 0`) does not yet exist as a runnable variant. This is a new backend artifact. |
| **Mode-flip to replay is announced and labeled, never silent** | If the live gate fails (RPC unreachable, TTL expired, legs > 0 with no reset), the judge must see an explicit banner saying "fell back to replay snapshot — live path not available" — not a blank transition. | LOW | `ModeBanner` already uses `<output aria-live="polite">` for live → replay announcement. The copy for the degradation reason needs to be more specific than the current generic label (e.g., "fork unavailable", "fork already used", "TTL expired"). |
| **Zero-secret judge runbook: `clone → build → demo`** | A judge cannot be expected to configure `.env` secrets, fund wallets, or know what a BuildBear node is. The runbook must produce a working live demo with only the checked-in artifact. | MEDIUM | `buildbear-deployments.json` is the static artifact. The runbook must document that (a) the demo signer private key is baked into the backend signer, NOT in `.env.judge`, and (b) the only `.env` change needed is the BuildBear RPC URL, which is in the artifact anyway. Corrected `.env.example` is a deliverable. |

### Differentiators (What Makes Judges Say "Nice")

| Feature | Value Proposition | Complexity | Dependency on Existing Components |
|---------|-------------------|------------|----------------------------------|
| **Explicit "fork-verified · BuildBear" provenance pill on confirmed state** | Distinguishes "real sandbox fork write" from "mainnet" without overstatement. The `GitFork` pill is already present in `OnChainEvidencePanel` but labeled generically. Renaming it to "BuildBear sandbox · fork-verified" makes the claim precise — judges know exactly what network they are looking at, which is epistemically honest and impressive. | LOW | `ForkVerifiedPill` in `OnChainEvidencePanel` + `ModeBanner` — string update only, no logic change. |
| **Block number in confirmed state row** | `LiveTxStateRow` already supports `blockNumber?` in the `confirmed` state shape. Populating it from `waitForTransactionReceipt` costs one field — and it lets a judge see the mint happened at a real block, not a synthetic confirmation. | LOW | `runWorkflowLive` step j constructs the confirmed emit; add `blockNumber: receipt.blockNumber.toString()` from the receipt already returned by `waitForTransactionReceipt`. |
| **Position token ID prominently shown in evidence panel with explanation** | The minted `tokenId` is the irreducible proof of position existence. Judges from a Uniswap v4 background will recognize it immediately. `OnChainEvidencePanel` already shows it with a copy button. The differentiator is adding a one-line annotation: "this ID encodes strike + width + leg type" — making the output self-explanatory to a DeFi-literate judge. | LOW | String copy change in `OnChainEvidencePanel` strings + a sub-label under `tokenIdLabel`. No logic. |
| **Strike + tick displayed in both human-readable and raw form** | `OnChainEvidencePanel` already formats `strikeFormatted` as `"5.68% (tick 360360)"`. This dual format (percentage + raw tick) is the differentiator — a judge can cross-check the tick value against the contract directly. Current mock value is `360360`; the live path must use `extractStrike(positionId)` result. | LOW | `extractStrike` from `token-id.ts` is already imported in `workflow-engine.ts`. Wire the live result through `strikeFormatted` in the `confirmed` emit at step j. |
| **Explicit "Somnia Agent-1 leg: operator-only, not judged" label in live mode** | Rather than hiding the fact that Somnia is not running, show a clear informational note: "Agent-1 (Somnia school selection): operator-only in this build — see replay snapshot for full two-chain run." This turns a limitation into epistemic honesty, which judges at a serious hackathon will respect more than a silent omission. | LOW | `ModeBanner` live-mode disclosure already exists (`disclosureEs` + `disclosureEn` strings). Add one sentence to the disclosure string explaining the BuildBear-only scope. No new component. |
| **Margin delta shown after confirmation** | `runWorkflowLive` step j already computes `decodeBalanceDelta` and emits `margins: { token0, amount1 }`. Displaying this in the `MintCard` or a new evidence row tells the judge what the hedge actually costs — making the economic layer visible, not just the tx layer. | MEDIUM | `MintCard` already exists. A new `MarginsRow` sub-component or an additional `DataRow` in `OnChainEvidencePanel` would surface this. Depends on the confirmed emit shape already planned in `workflow-engine.ts`. |

### Anti-Features (Deliberately Not Building)

| Anti-Feature | Why It Seems Good | Why It Is Harmful | What to Do Instead |
|--------------|-------------------|-------------------|--------------------|
| **Asking the judge to fund a wallet or provide a private key** | "Give judges full control over the transaction" | Eliminates all judges who don't have a funded wallet on the right network. Creates security theater. Directly contradicts the locked product decision: one-click pre-funded. | Pre-funded demo signer baked into the backend; judge's wallet is not required. |
| **Per-judge fork provisioning** | "Each judge gets a fresh fork, no reset problems" | The complexity is extreme (BuildBear API rate limits, provisioning latency, artifact rotation across judges, TTL management). Directly contradicts the locked product decision: shared fork + reset guard. | One fork provisioned fresh before judging begins. Reset guard handles repeated runs explicitly (advisory + operator reset action), not silently. |
| **Silent fallback: live → replay without explicit label change** | "Hides complexity from the judge" | This is fishing. A judge who thinks they saw a live run but actually saw a replay will feel deceived when they look at the tx hash and find nothing on-chain. It destroys trust when discovered. | `ModeBanner` aria-live announcement + explicit degradation copy. Never silent. |
| **Fake or placeholder explorer links** | "Better UX than a missing link" | `LiveTxStateRow` and `OnChainEvidencePanel` both have honesty invariants: "NO fake explorer link. Only render if a real BuildBear explorer URL is present." A fake link that 404s is worse than no link. | Only construct and render the explorer URL after a confirmed receipt. If no URL is available, show the hash with copy button only. |
| **Mainnet / production-funds exposure** | "More impressive than a fork" | Real funds at risk in a hackathon demo is an explicit out-of-scope item in PROJECT.md. Protocol funds are real; the security constraint is non-negotiable. | BuildBear fork is the correct boundary. Make the fork label prominent so judges understand the scope. |
| **Auto-reset the fork on every run** | "Zero friction for repeated runs" | An auto-reset between judge runs changes state underneath a concurrent run, breaking the isolation guarantee for judges running simultaneously. The shared fork + reset guard model means reset is an explicit OPERATOR action, not automatic. | Reset guard shows advisory copy when `numberOfLegs > 0`. Operator resets manually between judge sessions via the backend provisioning variant. |
| **Wallet-connect UX for the judge** | "Lets judges interact directly" | `FreshnessGate` already has `connect-wallet` and `switch-chain` states — these were designed for the Somnia operator path, not the judge path. Exposing wallet prompts to judges creates friction and confusion when the demo signer is pre-funded. | In the judge-facing `live` mode (BuildBear-only path), the pre-funded demo signer is used transparently. The `connect-wallet` and `switch-chain` gate states remain in code but are not reachable in the judge-facing flow. |
| **Streaming/live updates to fork state for other viewers** | "Show all judges watching in real-time" | WebSocket infrastructure, shared state sync, and race conditions on the shared fork are all out of scope for a hackathon deliverable. The complexity-to-judge-value ratio is extremely unfavorable. | Single confirmed tx hash + explorer link. Any judge can independently verify on the BuildBear explorer. |

---

## Feature Dependencies

```
Pre-funded demo signer
    └──requires──> Backend `--no-mint` / fresh-executor provisioning variant
                       └──required by──> numberOfLegs == 0 at demo time

Explicit live-mode label (ModeBanner)
    └──already built──> No new dependency

Real tx hash (LiveTxStateRow confirmed state)
    └──requires──> runWorkflowLive void-stub removed → real writeContractAsync call

BuildBear explorer link (OnChainEvidencePanel)
    └──requires──> Real tx hash (confirmed receipt)
    └──requires──> BuildBear explorer URL construction from deployment.rpcUrl + hash

Freshness gate reset advisory (new gate state)
    └──requires──> numberOfLegs check in runMountProbe (already built)
    └──requires──> New gate state: 'fork-used' (not yet in GateState union)
    └──enhances──> Backend provisioning variant (operator must reset before next judge run)

Block number in confirmed row
    └──requires──> Real tx hash
    └──requires──> waitForTransactionReceipt receipt.blockNumber (wagmi/viem already returns this)

Strike + tick display
    └──requires──> Real tx hash (positionId from confirmed PositionMinted log)
    └──requires──> extractStrike(positionId) (already imported in workflow-engine.ts)

Margin delta display
    └──requires──> Real tx hash
    └──requires──> quoteMargin read after PositionMinted (step i in runWorkflowLive, already planned)
    └──requires──> decodeBalanceDelta (already in balance-delta.ts)
```

### Dependency Notes

- **Pre-funded demo signer requires backend provisioning variant:** The backend must both deploy a fresh executor AND fund the demo signer address. These are a single provisioning script, not two separate operations.
- **`numberOfLegs > 0` gate state is the critical new frontend piece:** The existing `CornerstoneClientShell.runMountProbe` silently falls back to `replay` when `legs > 0`. For v3.0 shared-fork semantics, the gate must surface a new state `'fork-used'` in `FreshnessGate` so the advisory is visible rather than the silent substitution.
- **All post-confirmation evidence features depend on the single stub removal:** `void writeContractAsync` → real call in `handleLiveConfirm`. Everything downstream of that fix (hash, explorer, block, token ID, margins) becomes available automatically via the `runWorkflowLive` sequence already planned.

---

## MVP Definition

### v3.0 Launch With

- [ ] **Pre-funded demo signer signs the write** — without this, the demo is still a replay
- [ ] **`void writeContractAsync` stub removed; real `resolveFromMandate` call wired** — the core gap from v2.0
- [ ] **Real tx hash in `LiveTxStateRow` confirmed state** — the falsifiable claim
- [ ] **BuildBear explorer link in `OnChainEvidencePanel`** — independent verifiability
- [ ] **Explicit mode label and degradation copy** — honesty/anti-fishing invariant preserved
- [ ] **Backend `--no-mint` / fresh-executor provisioning variant** — closes the v2.0 cross-repo gap
- [ ] **`numberOfLegs > 0` advisory state (not silent fallback)** — shared fork integrity
- [ ] **Zero-secret judge runbook: corrected `.env.example` + README test lane** — operationalizability

### Add After Core Works

- [ ] **Block number in confirmed row** — one field from receipt, zero logic
- [ ] **Somnia operator-only advisory in ModeBanner live disclosure** — copy string only
- [ ] **"BuildBear sandbox · fork-verified" pill relabeling** — copy string only
- [ ] **Margin delta in evidence panel** — already emitted by `runWorkflowLive` step j; just surface it

### Defer to Post-Hackathon

- [ ] **Automated fork reset on detected `legs > 0`** — requires BuildBear management API integration; operator reset is sufficient for hackathon scale
- [ ] **Per-judge fork provisioning** — locked out of v3.0 by product decision
- [ ] **Streaming cross-judge state sync** — out of scope

---

## Feature Prioritization Matrix

| Feature | Judge Value | Implementation Cost | Priority |
|---------|-------------|---------------------|----------|
| Remove `void writeContractAsync` stub; wire real call | HIGH | MEDIUM | P1 |
| Pre-funded demo signer (backend) | HIGH | HIGH | P1 |
| Real tx hash in LiveTxStateRow | HIGH | LOW | P1 |
| BuildBear explorer link in OnChainEvidencePanel | HIGH | LOW | P1 |
| Backend `--no-mint` provisioning variant | HIGH | HIGH | P1 |
| `numberOfLegs > 0` advisory (not silent) | MEDIUM | LOW | P1 |
| Zero-secret runbook + `.env.example` | HIGH | LOW | P1 |
| Block number in confirmed row | MEDIUM | LOW | P2 |
| Margin delta in evidence panel | MEDIUM | LOW | P2 |
| Somnia operator-only advisory copy | LOW | LOW | P2 |
| Fork-verified pill relabeling | LOW | LOW | P2 |

---

## Honesty / Anti-Fishing Invariants Preserved

These are non-negotiable for v3.0 and must not be regressed:

1. **No silent mode substitution.** Every live → replay degradation must be announced via `ModeBanner` `aria-live="polite"` with an explicit reason. The reason must be specific: "fork TTL expired", "fork already used — awaiting reset", "RPC unreachable".

2. **No fake explorer links.** `OnChainEvidencePanel` and `LiveTxStateRow` render explorer links ONLY when a real URL is present. The URL is constructed from the confirmed receipt hash, never from a stub or placeholder.

3. **Mode is always labeled.** `ModeBanner` is always the first rendered element in `CornerstoneClientShell`, above `RunTranscript`. The mode label (`live` / `replay` / `mock`) is never hidden, never deferred, never conditional on a "clean" state.

4. **Fork-verified is neutral, not pass.** The `ForkVerifiedPill` uses `text-text-secondary / bg-bg-surface / border-border-default` — never `text-status-pass` or green. The pill signals provenance, not quality.

5. **The demo signer is disclosed.** The `disclosureEs` / `disclosureEn` strings in live mode must include a line acknowledging that the transaction was signed by a pre-funded demo signer, not the judge's own wallet. This is part of the anti-fishing discipline.

---

## Sources

- Codebase: `CornerstoneClientShell.tsx`, `workflow-engine.ts`, `ModeBanner.tsx`, `LiveTxStateRow.tsx`, `OnChainEvidencePanel.tsx`, `FreshnessGate.tsx`, `artifact-loader.ts`, `buildbear.ts` — all read 2026-06-08
- `mode.ts` governance comment: replay = guaranteed first, mock = always-works degradation, live = full path (Somnia + BuildBear)
- `PROJECT.md` v3.0 target features and locked decisions — 2026-06-08
- Hackathon judging context: derived from the stated deadline (Uniswap Hook Incubator Cohort 9 Hookathon ~June 2, already past; next judging window), judge persona described in PROJECT.md ("judges clone, run locally, and must see real on-chain interaction")

---
*Feature research for: v3.0 Judge-Runnable Live BuildBear Demo — judge-facing one-click pre-funded on-chain mint*
*Researched: 2026-06-08*
