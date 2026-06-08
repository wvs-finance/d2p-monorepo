---
phase: 12
slug: macrohedgestrategist-agent-1-prompt-instrument-specification
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-06
---

# Phase 12 — Validation Strategy

> Per-phase validation contract. Authority: `12-RESEARCH.md` §Validation Architecture. **Re-semantic, don't rebuild** — the v1 `MacroHedgeStrategist` two-entrypoint/`decisionId`/decode-safety spine is live + proven (17/17 unit + Somnia-testnet). Phase 12 changes WHAT is decided (school + notional) and WHAT is assembled (a `HedgeMandate`); Somnia-native, NO fork.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Foundry `forge` 1.5.1 + `bulloak` 0.9.2 BTT (`.tree` before impl, co-located, `when/it` keyword form) |
| **Config** | `contracts/foundry.toml` (solc 0.8.24, cancun). NO fork — the strategist is Somnia-native; its unit tests are `MockPlatform`/`MockMacroOracle`-driven |
| **Quick run** | `cd contracts && forge test --match-path 'test/instrument/MacroHedgeStrategist.t.sol' -vv` (fork-free, sub-second) |
| **Full suite** | `cd contracts && forge build && forge test --no-match-path 'test/**/*{fork,invariants}*'` (Somnia-native + spec; the fork suite is the separate Phase-7/8/13 lineage) |
| **Live gate (manual)** | `bash script/macro-hedge-strategist-e2e.sh` via the `somnia-e2e` `workflow_dispatch` job (spends STT; NEVER on push/PR) — the Phase-11 e2e adapted to assert a well-formed mandate |
| **Estimated runtime** | <2 s (unit, fork-free) |

---

## Sampling Rate
- **After every task commit:** `forge build && forge test --match-path 'test/instrument/MacroHedgeStrategist.t.sol' -vv` + `bulloak check` on the touched `.tree`
- **After every wave:** `forge build && forge test --no-match-path 'test/**/*{fork,invariants}*'` (no sibling regressions — PolygonPools 3/3, OperationalCostManagement 10/10, MacroHedgeExecutor units, the rest of the strategist suite)
- **Phase gate:** the full fork-free suite green + per-file `bulloak check` exit 0; the live `workflow_dispatch` decision-moves run is the manual cornerstone proof (NOT a CI gate)
- **Max feedback latency:** <2 s (fork-free unit)

---

## Per-Task Verification Map

| Req | Behavior (observable signal) | Test type | Command | File |
|-----|------------------------------|-----------|---------|------|
| **STRAT-01** | School-leg entrypoint fires ONE `inferString` to `LLM_AGENT_ID` with `allowedValues == registry.schoolLabels()`, marks pending, allocates `decisionId = bytes32(requestId)` | unit | `forge test --match-test test_WhenSchoolDecisionRequested -vv` | ❌ W0 (mirror v1 action-request leaf) |
| **STRAT-01** | Notional-leg entrypoint requires `schoolSet && !notionalSet`, fires ONE `inferNumber` with the notional bounds | unit | `forge test --match-test test_WhenNotionalDecisionRequested -vv` | ❌ W0 (mirror `requestSizeDecision`) |
| **STRAT-01** | School callback: registry label → school handle + `schoolSet=true`; UNMAPPED string → `DecisionFailed`, `schoolSet` stays false (NO default write); int-blob-as-string → `DecisionFailed` | unit | `forge test --match-test 'test_GivenTheSchool*' -vv` | ❌ W0 (mirror the 3 v1 action-callback leaves) |
| **STRAT-01** | Notional callback: in-range stored; over-max clamped; negative→floor; non-32-byte→`DecisionFailed`, `notionalSet` false | unit | `forge test --match-test 'test_GivenTheNotional*' -vv` | ❌ W0 (mirror the 4 v1 size-callback leaves) |
| **STRAT-01** | Both legs land → `StrategistDecided(decisionId, school, HedgeMandate)` emitted once, `decidedAt > 0`; **survives `vm.roll`+`vm.warp` between callbacks** (cross-block join) | unit | `forge test --match-test 'test_WhenBoth*\|test_GivenTheTwoCallbacksLandInDifferentBlocks' -vv` | ❌ W0 (mirror the 2 v1 join leaves) |
| **STRAT-01** | Inherited auth/replay: non-`PLATFORM` → `NotPlatform`; unknown/replayed `requestId` → `UnknownRequest` | unit | `forge test --match-test 'test_WhenACallbackCaller*\|test_GivenAnUnknownOrReplayed*' -vv` | ❌ W0 (mirror the 2 v1 auth leaves; no new code) |
| **STRAT-01** | LIVE: real prompt → well-formed mandate on Somnia testnet; **different prompt → different mandate** (school and/or notional differ) | manual e2e | `bash script/macro-hedge-strategist-e2e.sh` (`workflow_dispatch`) | 🟡 adapt the Phase-11 script (decision-moves precedent proven) |
| **STRAT-02** | `getMandate(decisionId)` returns a well-formed `HedgeMandate`: `underlyingMarket == PolygonPools.POLYGON_WCOP_USDC_POOL_ID()`, school handle resolvable, `targetNotional ∈ [MIN,MAX]`, `chainId == 137`, `isLong` set | unit | `forge test --match-test 'test_GivenAMandateIsAssembled_*' -vv` | ❌ W0 (assert each field vs anchor + bounds) |
| **STRAT-02** | Mandate field TYPES line up with the `HedgeLegParams` hand-off (`economicTheory` an `IMacroThesis`, `underlyingMarket` a `PoolId`, `chainId` a `uint32`, `isLong` a `bool`) | unit + compile | `forge build` + a leaf copying mandate fields into a `HedgeLegParams` scratch struct | ❌ W0 (compile-time + assertion hand-off-readiness proof; NO Phase-14 logic) |

*Status: ⬜ pending · ✅ green · ❌ red — all ⬜ at plan time.*

**Proof semantics (the honest boundaries):**
- **STRAT-02 is unit-testable mandate WELL-FORMEDNESS only** — the field round-trip *into* a `HedgeLegParams` is a type/anchor/bounds check, NOT geometry derivation. The representativeness derivation + the real geometry are **Phase 14 (out of scope)**.
- **Two-leg / one-infer-per-tx is LOAD-BEARING** — `_sendRequest` forwards the WHOLE `msg.value`; both legs in one tx starves the second (`TimedOut`). The `decisionId` MUST be block-independent (from the school `requestId`), proven by the cross-block `vm.roll`+`vm.warp` leaf.
- **Decode-safety** — a malformed/wrong-type payload routes to `DecisionFailed` (school stays unset / notional stays unset), never bricks the pending request (the v1 try/catch + 32-byte-guard pattern).
- **No new agent integration** — `LLM_AGENT_ID`, `inferString`/`inferNumber`, `Response.result` decode, and the inherited `handleResponse` auth/CEI/replay are reused verbatim from the proven v1.

---

## Wave 0 Requirements
- [ ] `contracts/src/types/HedgeMandate.sol` — the new Agent-1 output type (STRAT-01/02); MUST exist before the contract refactor
- [ ] `contracts/src/interfaces/IMacroThesis.sol` — promote the empty marker to the concrete named-thesis registry (STRAT-01); MUST exist before the school leg
- [ ] `contracts/test/instrument/MacroHedgeStrategist.tree` — re-labeled BTT (`when/it`, ASCII, no `/`·`.`), committed FIRST (Iron Law): school request, notional request, school callback (mapped/unmapped/int-blob), notional callback (in-range/over-max/negative/non-32-byte), both-legs join (+ cross-block), auth/replay, mandate well-formedness (STRAT-02 field asserts)
- [ ] `contracts/test/instrument/MacroHedgeStrategist.t.sol` — the FAILING test before impl; mirror the v1 harness (`MockPlatform`/`MockMacroOracle`, `_fireSchool`/`_completeSchool`/`_fireNotional`, the event-emit asserts)
- [ ] No framework install; no new mocks (reuse `MockPlatform`/`MockMacroOracle`)
- [ ] (Coordination, not a test) `docs/UI-AGENT-HANDOFF.md` §4/§5 reconciliation to the `HedgeMandate`-shaped `StrategistDecided` (research-flagged drift at `:102`)

---

## Manual-Only Verifications
| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Live decision-moves-with-prompt (real `llm-inference` round-trip → well-formed mandate; different prompt → different mandate) | STRAT-01 (live) | Spends STT on Somnia testnet; external liveness | A `workflow_dispatch` `somnia-e2e` run of the adapted `script/macro-hedge-strategist-e2e.sh`; the unit suite proves the mechanics offline |

---

## Validation Sign-Off
- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 2s (fork-free unit)
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
