# Phase 10: Backend — On-Chain Single-Use Guard + `--no-mint` Provisioning — Context

**Gathered:** 2026-06-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver the backend foundation for the judge-runnable live demo, in `packages/backend`:
1. **EXEC-01** — add an on-chain single-use guard to `MacroHedgeExecutor` so a used fork deterministically reverts.
2. **`--no-mint` provisioning variant** — redeploy a clean Panoptic stack + fresh executor (`numberOfLegs == 0`), fund a **dedicated** demo signer inside an `evm_snapshot`, and write `buildbear-deployments.json` (with `snapshotId`, `mintTxHash: null`) directly to the frontend artifact path.
3. **Empirical spike** (runs first, on a fresh stack) proving 2nd-mint behavior, snapshot round-trip, and server-side viem signing feasibility.

Out of scope: the frontend server routes (Phase 11), the live-path integration / RunState work (Phase 12), evidence surfaces + runbook (Phase 13). This phase is NOT CI-verifiable; completion ties to recorded live-fork transcripts.
</domain>

<decisions>
## Implementation Decisions

### Operator invocation (discussed)
- The shell gains a thin `--no-mint` flag that simply exports `SKIP_MINT=true`; the Solidity script reads it via `vm.envOr("SKIP_MINT", false)`. Both surfaces work (flag for runbook discoverability, env for the idiomatic forge gate). Keep bash minimal — the flag just sets the env var.

### EXEC-01 revert representation (discussed)
- Use `require(pool.numberOfLegs(address(this)) == 0, "fork used")` — a **string** revert reason (NOT a custom error). The frontend HONEST-01 path string-matches `"fork used"`; this is the simplest cross-layer contract.
- Guard placement is **locked from the two-reviewer pass**: in the shared sink `_resolveAndMintAtStrike` (covers all three mint entrypoints — `resolveFromMandate`, `resolveAndMint`, `_onResult`), and **before any `pool.dispatch`** call (the `numberOfLegs` view reverts `Reentrancy()` if the pool guard is active). Add a Foundry test asserting the guard runs from entry (first call succeeds, second reverts, including via `resolveAndMint`).

### Spike / guard evidence (discussed)
- Recorded transcripts live in a **committed markdown file in the phase dir**: `.planning/phases/10-backend-on-chain-single-use-guard-no-mint-provisioning-variant/10-SPIKE-EVIDENCE.md`.
- Must contain: (a) the pre-guard 2nd-`resolveFromMandate` outcome on a **freshly-provisioned** `--no-mint` stack (clean baseline, not the dirty committed pool), (b) the `evm_snapshot`→`evm_revert` round-trip showing `numberOfLegs == 0` + collateral + signer gas restored, (c) a viem server-side signing dry-run of `resolveFromMandate` succeeding against the fork chain config, (d) the **on-fork** `cast` transcript showing the redeployed (guarded) executor reverts `"fork used"` on the 2nd attempt.
- The phase is not "done" until this file exists with passing transcripts (ties to `/gsd:verify-work`).

### CI / PR governance (user NON-NEGOTIABLE, 2026-06-08 — OPS-06)
- The **EXEC-01 Foundry guard test** must be a CI step — it is auto-covered by the existing `forge test --no-match-path 'test/**/*[Ff]ork*'` lane in `.github/workflows/ci.yml` (no workflow edit needed for it to run; just ensure the test isn't named `*fork*`).
- Any frontend unit tests added downstream ride the existing `vitest` lane.
- The **live BuildBear-fork spike + `--no-mint` provisioning are NOT CI-runnable** (secret-gated, 3-day TTL) and must **never be claimed as on-rhythm/green**. They are operator-manual, proven only by the recorded `10-SPIKE-EVIDENCE.md` transcripts. This is the honest reconciliation of the CI rule, not an exception to it.
- All Phase 10 code lands via **PR** with CI green. Any `ci.yml` change takes the DevOps Automator as Reviewer 2.

### Claude's Discretion
- **Demo signer key lifecycle** (not discussed → my default): `DEMO_SIGNER_PK` is a **fixed** key generated once, stored in gitignored `contracts/.env` + the frontend server env (Vercel, non-`NEXT_PUBLIC_`), and reused across provisions; the provisioning script prints the funded signer **address** (never the key). The signer is distinct from `BUILDBEAR_DEPLOYER_PK`.
- Exact `--no-mint` shell arg-parsing mechanism (simple `$1`/`case`), collateral funding amounts (reuse existing `DEFAULT_FUND_USD`/`DEFAULT_FUND_COP` unless the spike shows the first mint under-margins), and the precise `jq` reshaping for `mintTxHash: null` (`--argjson`).
- Whether EXEC-01 also warrants a `pool.numberOfLegs` re-read guard on the other paths beyond the shared sink (sink placement already covers them — only add if the sink is bypassable).
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & roadmap (this phase)
- `.planning/REQUIREMENTS.md` — EXEC-01, PROV-01..04 (reworded v2), locked decisions 5 (on-chain guard) & 6 (dedicated signer funded in snapshot)
- `.planning/ROADMAP.md` — Phase 10 block (success criteria 1–5, the Wave-0 spike, NOT-CI-verifiable note) + the v3.0 dependency graph (Wave-0 artifact-loader migration shared with Phase 11)

### Research (v3.0)
- `.planning/research/STACK.md` — BuildBear RPC specifics: `hardhat_setBalance` (NOT `anvil_setBalance`), `buildbear_ERC20Faucet` (whole-token balance; zero basefee first), `evm_snapshot`/`evm_revert` (one-use; re-snapshot after revert), `SKIP_MINT` via forge `vm.envOr`, viem `privateKeyToAccount`+`createWalletClient`
- `.planning/research/ARCHITECTURE.md` — backend↔frontend artifact contract, build order (Phase 10 blocks Phase 12)
- `.planning/research/PITFALLS.md` — shared-fork state corruption, pre-funded key security, snapshot one-use, artifact drift
- `.planning/research/SUMMARY.md` — convergent synthesis

### Backend code (the integration surface)
- `packages/backend/contracts/script/provision-buildbear-demo.sh` — existing provisioning; funding via `hardhat_setBalance` + `buildbear_ERC20Faucet` (basefee-zero quirk); artifact written to `script/out/buildbear-deployments.json` (must redirect to frontend path); `MINT_TX_HASH` parse + `jq` serialize (`--argjson null` on `--no-mint`)
- `packages/backend/contracts/script/ProvisionBuildBearDemo.s.sol` — `run()` = inline core deploy → `deployNewPool` → 9-arg executor ctor → deposit-on-behalf (`ct0/ct1.deposit(.., address(exec))`) → mint via `exec.resolveFromMandate(mandate,0,1e6)` + `require(r.legs>0)`. The `--no-mint`/`SKIP_MINT` path = `run()` minus the final mint + that require; the `evm_snapshot` is captured here AFTER deposit + signer funding, BEFORE mint.
- `packages/backend/contracts/src/MacroHedgeExecutor.sol` — three mint entrypoints (`resolveFromMandate`, `resolveAndMint`, `_onResult`) converge on the shared sink `_resolveAndMintAtStrike` (the guard chokepoint); `pool` is `immutable` (a fresh guard ⇒ new executor ⇒ fresh pool ⇒ full-stack redeploy); the `chainId == block.chainid` self-check + the `"No crosschain allowed yet"` revert
- `packages/frontend/lib/apps/abrigo/cornerstone/artifact-loader.ts` — runtime validator already treats `mintTxHash` optional; needs the TS type to add `snapshotId?: string` and `mintTxHash?: string | null`
- `packages/frontend/lib/apps/abrigo/cornerstone/buildbear-deployments.json` — the committed (poisoned, already-minted) artifact this phase overwrites/retires
- `packages/frontend/lib/apps/abrigo/cornerstone/buildbear.ts` — chain/client factory (rpcUrl from artifact) for the server-sign dry-run

### Prior design history
- `packages/frontend/docs/superpowers/specs/2026-06-07-module5-cornerstone-live-tx-design.md` — v2.0 Module-5 spec; documents the collateral single-shot revert + freshness-gate history that EXEC-01 now makes a real on-chain guarantee
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `provision-buildbear-demo.sh` + `ProvisionBuildBearDemo.s.sol` `run()` — the entire deploy/pool/executor/deposit path is reused as-is; the `--no-mint` variant only gates the final mint and inserts the snapshot + dedicated-signer funding.
- BuildBear funding pattern (shell) — `hardhat_setBalance` for native gas (1e24 wei) + `buildbear_ERC20Faucet` for USDC/wCOP (whole-token balances), already with the zero-basefee precondition handled.
- `_resolveAndMintAtStrike` shared sink — single chokepoint for the EXEC-01 guard.

### Established Patterns
- forge `vm.envOr("SKIP_MINT", false)` env gating (idiomatic; the `--no-mint` flag exports this).
- `jq` artifact emission in the shell — switch `--arg mintTxHash ""` to `--argjson mintTxHash null` on the `--no-mint` path.
- BuildBear RPC quirks (locked from research): `hardhat_setBalance` works / `anvil_setBalance` rejected; `evm_snapshot` is one-use (re-snapshot after each `evm_revert`).

### Integration Points
- Artifact write: redirect from `packages/backend/contracts/script/out/buildbear-deployments.json` to `packages/frontend/lib/apps/abrigo/cornerstone/buildbear-deployments.json`, computed from a stable anchor (`mkdir -p`), so addresses can't drift.
- `DEMO_SIGNER_PK`: gitignored `contracts/.env` (provisioning) + frontend server env (Vercel, server-only). Never `NEXT_PUBLIC_`, never in the artifact.
- Wave-0 `artifact-loader.ts` type migration is shared with Phase 11 (owned here).
</code_context>

<specifics>
## Specific Ideas

- The empirical spike is the de-risking gate for the whole milestone — run it FIRST against a throwaway fresh `--no-mint` stack, before writing the EXEC-01 guard, so the pre-guard 2nd-mint baseline is unambiguous.
- "fork used" must be the exact, stable revert string — the frontend keys off it. Treat it as a cross-layer contract, not a casual message.
- The currently-committed BuildBear artifact and its guard-less executor are poisoned (already minted, no guard) — explicitly retire them; never use that executor address for a live claim.
</specifics>

<deferred>
## Deferred Ideas

- KV-backed (Upstash) automatic snapshot-id persistence / auto-reset for concurrent judges — REQUIREMENTS RESET-01 (Future), out of v3.0.
- Per-judge fork provisioning — RESET-02 (Future).
- A custom `error ForkUsed()` migration (gas/house-style) — deliberately deferred; string revert chosen for v3.0 frontend simplicity.
</deferred>

---

*Phase: 10-backend-on-chain-single-use-guard-no-mint-provisioning-variant*
*Context gathered: 2026-06-08*
