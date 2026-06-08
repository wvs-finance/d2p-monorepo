---
phase: 11
slug: macrohedgestrategist-hedge-decision-agent
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-02
---

# Phase 11 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Derived from `11-RESEARCH.md` § Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Foundry `forge` 1.5.1-stable (BTT via `bulloak`) + Somnia-testnet shell e2e (`cast`) |
| **Config file** | `contracts/foundry.toml` (add `rpc_storage_caching`) |
| **Quick run command** | `forge test --no-match-path 'test/**/*fork*'` (Somnia-native + spec; no RPC) |
| **Full suite command** | `forge build && forge test` (unit/spec + Base-fork) + per-file `bulloak check` |
| **Live integration (manual)** | `bash contracts/script/macro-hedge-strategist-e2e.sh` (spends STT — `workflow_dispatch` only) |
| **Estimated runtime** | ~30 s quick / ~3–6 min full (fork, cached) |

---

## Sampling Rate

- **After every task commit:** Run `forge build && forge test --no-match-path 'test/**/*fork*'` + `bulloak check test/instrument/MacroHedgeStrategist.tree`
- **After every plan wave:** Run full `forge test` (incl. fork) + all-tree `bulloak check`
- **Before `/gsd:verify-work`:** Full suite green + one manual `workflow_dispatch` Somnia e2e showing `HedgeDecisionMade` on-chain (the demo-video evidence)
- **Max feedback latency:** ~30 s (quick) / ~360 s (full)

---

## Per-Task Verification Map

| Req ID | Behavior (observable signal) | Test Type | Automated Command | File Exists |
|--------|------------------------------|-----------|-------------------|-------------|
| AGENT-01 | `ILLMAgent` compiles; strategist encodes `inferString`/`inferNumber` payloads to `LLM_AGENT_ID`; `MockPlatform.lastAgentId()==12847293847561029384`, `lastSelector()==handleResponse.selector` | unit (build + spec) | `forge build && forge test --mp test/instrument/MacroHedgeStrategist.t.sol` | ❌ W0 |
| AGENT-01 | `.tree`↔test correspondence for every behavioral unit | bulloak | `bulloak check test/instrument/MacroHedgeStrategist.tree` | ❌ W0 |
| AGENT-02 | `requestHedgeDecision` reads `latest(dataKey).scaledValue`, sends action(allowedValues) + size(0,MAX) payloads; callback decodes string→enum + int256→clamp; stores `HedgeDecision`; emits `HedgeDecisionMade(requestId, action∈enum, sizeBps∈[0,MAX], macroValue, consensus)` | unit (MockPlatform.fulfill + vm.expectEmit) | `forge test --mp test/instrument/MacroHedgeStrategist.t.sol` | ❌ W0 |
| AGENT-02 | unmapped action string → `DecisionFailed` (no brick); out-of-range size re-clamped | unit | same | ❌ W0 |
| AGENT-03 | non-PLATFORM caller → `NotPlatform` revert, state unchanged | unit (`vm.prank` + `vm.expectRevert`) | same (mirror `SomniaAgentConsumer.t.sol:91`,`:158`) | ❌ W0 |
| AGENT-03 | unknown/replayed `requestId` → `UnknownRequest` revert | unit | same (mirror `:98`,`:135`) | ❌ W0 |
| AGENT-03 | LIVE: in-enum action + in-range size stored; two runs with different `consensus` → different decisions | Somnia-testnet integration | `bash script/macro-hedge-strategist-e2e.sh` (manual) | ❌ W0 |
| AGENT-04 | `forge build` green; per-file `bulloak check` passes; Base-fork tests green under cache+shard; Somnia e2e NOT triggered on push/PR | CI workflow run | `.github/workflows/contracts-ci.yml` (push/PR) | ❌ W0 |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `contracts/test/instrument/MacroHedgeStrategist.tree` — single co-located BTT tree (bulloak 0.9.2 only parses `test/instrument/*` + `test/fork/*`; `test/spec/*` fails on `/`/`.`/prose). Covers AGENT-02 (oracle read + dual payload), AGENT-02/03 (decode→enum, DecisionFailed, decode→clamp, auth/replay)
- [ ] `contracts/test/instrument/MacroHedgeStrategist.t.sol` — forge harness reusing `MockPlatform` (no new mock needed)
- [ ] `contracts/script/macro-hedge-strategist-e2e.sh` — Somnia-testnet runner (model on `somnia-probe-e2e.sh`; PRICE_TERM_WEI for the 0.07 class)
- [ ] `.github/workflows/contracts-ci.yml` — build + per-file bulloak + sharded/cached fork + workflow_dispatch e2e
- [ ] `contracts/foundry.toml` edit — add `rpc_storage_caching = { chains = [8453], endpoints = "all" }`
- [ ] `bulloak` install step in CI (no local install needed for runners)

*MockPlatform already covers the agent-callback harness — no new mock required.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Live in-enum action + in-range size on Somnia testnet; decision-moves-with-consensus | AGENT-03 | Spends real STT against the live LLM-Inference agent; non-deterministic timing (`createRequest`→callback async) | `bash contracts/script/macro-hedge-strategist-e2e.sh` via `workflow_dispatch`; capture `HedgeDecisionMade` tx for the demo video; run twice with differing `consensus` |
| Live `LLM_AGENT_ID 12847293847561029384` resolves | AGENT-01 | Agent Explorer has no public REST API; only resolvable by an actual on-chain `createRequest` | First e2e run — a `TimedOut` (no callback) is the benign signal the ID is wrong; flip to fallback if so |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 360 s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
