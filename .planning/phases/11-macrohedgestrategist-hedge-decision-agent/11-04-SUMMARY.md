---
phase: 11-macrohedgestrategist-hedge-decision-agent
plan: 04
subsystem: ci-foundry-gate
tags: [ci, github-actions, foundry, bulloak, base-fork, rpc-cache, agentathon]
requires:
  - "11-02 (CcopUsdcPool fork pair + Phase-11 trees on disk)"
  - "keeper-ci.yml (CI model: push/PR path filters, contents:read, fork-secret posture)"
provides:
  - ".github/workflows/contracts-ci.yml (secret-free build+spec, cached/sharded/retried fork job, workflow_dispatch-only Somnia e2e)"
  - "foundry.toml rpc_storage_caching for chain 8453 (Base) — pinned-block fork-state cache"
  - "honest *fork* exclusion (CcopUsdcPool renamed .fork.*) so the no-secret CI job is green"
affects:
  - "all future contracts/ PRs and push:master — now gated by contracts-ci.yml"
tech-stack:
  added:
    - "GitHub Actions: contracts-ci.yml (foundry-rs/foundry-toolchain@v1, actions/cache@v4)"
    - "bulloak 0.9.2 pinned install in CI (cargo install --version 0.9.2 --locked)"
  patterns:
    - "fork-secret posture mirrored from keeper-ci.yml: secret on fork job only, safe pull_request event, no target variant, contents:read"
    - "RPC cache keyed on pinned block (foundry-rpc-base-46700000-v1) + best-effort warm step + sharded retried gate (cold-cache 429 defense)"
    - "STT-spending e2e gated behind workflow_dispatch if-guard — never push/PR"
key-files:
  created:
    - ".github/workflows/contracts-ci.yml"
  modified:
    - "contracts/test/instrument/CcopUsdcPool.fork.tree (git mv from CcopUsdcPool.tree)"
    - "contracts/test/instrument/CcopUsdcPool.fork.t.sol (git mv from CcopUsdcPool.t.sol; @dev BTT spec ref updated)"
    - "contracts/foundry.toml (rpc_storage_caching added to [profile.default])"
decisions:
  - "Comment rephrase: avoided the literal token 'pull_request_target' in a reassuring comment so the acceptance grep (absence check) stays honest; intent (only the safe pull_request event) unchanged."
metrics:
  duration: "~3 min"
  tasks: 2
  files: 4
  completed: "2026-06-02"
---

# Phase 11 Plan 04: contracts-ci.yml Foundry Gate Summary

Stood up `.github/workflows/contracts-ci.yml` — a three-job Foundry gate (secret-free build+spec, cached/sharded/retried Base-fork job, workflow_dispatch-only Somnia e2e) — and made the `*fork*` exclusion honest by renaming the `vm.createSelectFork` CcopUsdcPool pair to `.fork.*`, so the no-secret CI job is green without BASE_RPC_URL.

## What Was Built

### Task 1 — CcopUsdcPool → `.fork.*` rename + Base fork-state cache (commit `0dc1587`)
- `git mv` of `CcopUsdcPool.tree → CcopUsdcPool.fork.tree` and `CcopUsdcPool.t.sol → CcopUsdcPool.fork.t.sol` (history-preserving, coupled stems for bulloak's same-dir/same-stem inference).
- Updated the in-file `@dev BTT spec:` reference to `test/instrument/CcopUsdcPool.fork.tree`. The Solidity contract name (`CcopUsdcPoolinitializeAndReadState`, derived by bulloak from the tree ROOT, not the filename) was left unchanged — `bulloak check` exits 0.
- `foundry.toml [profile.default]`: added `rpc_storage_caching = { chains = [8453], endpoints = "all" }` (after `viaIR = false`, before `[profile.ci]`). solc/evm_version/optimizer/rpc_endpoints/fuzz untouched.

### Task 2 — `.github/workflows/contracts-ci.yml` (commit `c291305`)
- **build-and-spec** (NO secret, NO RPC): `forge build` + a `bulloak check` loop over `test/fork/*.tree` and `test/instrument/*.tree`, plus a NON-blocking check of the parseable-but-orphaned `SomniaAgentConsumer.handleResponse.tree` (emits a `::warning::`, tracked not buried), then `forge test --no-match-path 'test/**/*fork*'` which now exits 0 keylessly. A comment names exactly the three un-parseable spec trees skipped (`MacroOracle.tree`, `SomniaAgentConsumer.sendRequest.tree`, `SomniaAgentConsumer.sweep.tree`) — no `test/spec/*.tree` glob, no false "all spec un-parseable" claim.
- **fork** (secret-bearing): `env.BASE_RPC_URL = secrets.BASE_RPC_URL` on that job only; `actions/cache@v4` on `~/.foundry/cache/rpc` keyed `foundry-rpc-base-46700000-v1`; shard `1/2` matrix; `--retries 2 --delay 3`; a best-effort `|| true` warm step before the gating sharded run (cold-cache 429 defense).
- **somnia-e2e**: `if: github.event_name == 'workflow_dispatch'` only — documented placeholder, never spends STT automatically.
- `permissions: contents: read`; only the safe `pull_request` event (no secret-leaking target variant).

## Verification Evidence

- `bulloak check test/instrument/CcopUsdcPool.fork.tree` → "All checks completed successfully".
- `forge build` exit 0 (only the pre-existing, unrelated `named-struct-fields` lint note from `MacroOracle.sol`, per STATE.md — out of scope).
- **BLOCKER-2 proof (`.env`-independent):** `forge test --list --no-match-path 'test/**/*fork*' | grep -q CcopUsdcPool` returns non-zero — the renamed fork test is excluded from the no-fork set. `env -u BASE_RPC_URL forge test ...` was deliberately NOT used (forge auto-loads `contracts/.env` → false PASS).
- `python3 -c "import yaml; yaml.safe_load(...)"` exit 0.
- All 19 grep/YAML acceptance checks PASS; `pull_request_target` token absent; `test/spec/*.tree` glob absent.

## Deviations from Plan

### Auto-fixed Issues

None affecting behavior. One cosmetic adjustment within Task 2 scope:

**1. [Rule 3 - Blocking] Comment rephrase to keep the acceptance grep honest**
- **Found during:** Task 2 verification.
- **Issue:** A reassuring header comment originally contained the literal string `pull_request_target`, which tripped the "must be absent" acceptance grep even though no such trigger exists.
- **Fix:** Rephrased the comment to "only trigger on the safe `pull_request` event (never the secret-leaking target variant)" — no literal token, intent preserved.
- **Files modified:** `.github/workflows/contracts-ci.yml`
- **Commit:** `c291305`

## Authentication Gates

None.

## Self-Check: PASSED
- FOUND: `.github/workflows/contracts-ci.yml`
- FOUND: `contracts/test/instrument/CcopUsdcPool.fork.tree`
- FOUND: `contracts/test/instrument/CcopUsdcPool.fork.t.sol`
- GONE (expected): `contracts/test/instrument/CcopUsdcPool.tree`, `CcopUsdcPool.t.sol`
- FOUND commit: `0dc1587` (Task 1)
- FOUND commit: `c291305` (Task 2)
