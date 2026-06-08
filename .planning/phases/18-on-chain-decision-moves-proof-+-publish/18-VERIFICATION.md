---
phase: 18-on-chain-decision-moves-proof-+-publish
verified: 2026-06-08T00:00:00Z
status: passed
score: 6/6 must-haves verified
---

# Phase 18: On-chain decision-moves proof + publish — Verification Report

**Phase Goal:** The live deploy is PROVEN on-chain — a real prompt yields a well-formed HedgeMandate (schoolSet && notionalSet), a different consensus yields a DIFFERENT mandate (decision-moves), all captured as real tx hashes — and the address + ABI + call inputs PUBLISHED so the frontend can mirror them.
**Verified:** 2026-06-08
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| - | ----- | ------ | -------- |
| 1 | StrategistDecided tx from 0xf0570C…7b1D carries non-empty school + HedgeMandate (econ != 0x0, notional ∈ [1000,1e8]) | ✓ VERIFIED | Orchestrator-confirmed: getMandate run-1 econ 0x5 SHILLER, targetNotional 58400000 ∈ range; strategistDecidedTx 0x0a00e0ab… mined block 403979970 |
| 2 | decisionState(run-1 id) == (schoolSet, notionalSet) == (true, true) | ✓ VERIFIED | Orchestrator-confirmed: decisionState(0x…56745e) = (true, true, 1780942137, "SHILLER_MACRO_RISK") |
| 3 | Run-2 uses genuinely divergent input; every capture decisionId-bound (no run-1 vs itself) | ✓ VERIFIED | RUN-2 id 0x…56747b distinct from RUN-1 0x…56745e; runner filters logs by HedgeDecisionRequested sig + decisionId topic (sig-filter fix 5a192c8); USER_INTENT2 + CONSENSUS2=900 present in runner |
| 4 | LIVEDEP-03 decision-moves: PASS (different school/notional) or documented no-move | ✓ VERIFIED | Orchestrator-confirmed: RUN-2 POST_KEYNESIAN econ 0x6 vs RUN-1 SHILLER econ 0x5 — decision MOVED on the school/economicTheory dimension |
| 5 | somnia-strategist-deployment.json parses w/ live address + 3 real run-1 tx hashes | ✓ VERIFIED | jq: strategist==0xf0570C…7b1D, chainId 50312, schoolTx/notionalTx/strategistDecidedTx all 0x…; hashes match orchestrator facts; git-tracked |
| 6 | UI-AGENT-HANDOFF.md marks LIVE w/ new address, BOTH §6 prohibition sentences replaced | ✓ VERIFIED | Address present; grep -i 'subscribe to a live' = 0; grep 'Do NOT instruct the frontend to subscribe' = 0 |

**Score:** 6/6 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `contracts/script/macro-hedge-strategist-e2e.sh` | Two-leg runner, decisionId-bound, reuses CONSUMER | ✓ VERIFIED | bash -n clean; requestNotionalDecision(bytes32) ×1, StrategistDecided(bytes32,string ×1, DOCUMENTED NO-MOVE ×2, RUN1_STATE ×6 (idempotency) |
| `contracts/script/out/somnia-strategist-deployment.json` | §2.4 schema, addresses + 3 tx hashes | ✓ VERIFIED | jq-valid, git-tracked, no key leak |
| `contracts/script/out/MacroHedgeStrategist.abi.json` | ABI w/ StrategistDecided | ✓ VERIFIED | jq finds StrategistDecided event; git-tracked |
| `docs/UI-AGENT-HANDOFF.md` | Reversed §6, LIVE row | ✓ VERIFIED | Address present, both prohibitions removed |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | -- | --- | ------ | ------- |
| runner | CONSUMER 0xf0570C…7b1D | `if [ -z "${CONSUMER:-}" ]` short-circuit | ✓ WIRED | strategist forge create (L225) inside reuse guard — no redeploy on CONSUMER env |
| runner capture | per-run decisionId | sig-filtered cast logs (topics[0]==HedgeDecisionRequested sig then topics[2]) | ✓ WIRED | bug-fix 5a192c8 binds capture to correct log |
| notional leg | StrategistDecided + decisionState notionalSet | requestNotionalDecision(bytes32) + member-2 poll | ✓ WIRED | present in runner |
| JSON | 3 on-chain txs | jq schoolTx/notionalTx/strategistDecidedTx | ✓ WIRED | hashes match orchestrator on-chain confirmation |

### Requirements Coverage

| Requirement | Source Plan | Status | Evidence |
| ----------- | ----------- | ------ | -------- |
| LIVEDEP-02 | 18-01 | ✓ SATISFIED | decisionState(true,true), full mandate, strategistDecidedTx mined |
| LIVEDEP-03 | 18-01 | ✓ SATISFIED | SHILLER 0x5 → POST_KEYNESIAN 0x6 on divergent input, distinct decisionIds |
| LIVEDEP-04 | 18-01 | ✓ SATISFIED | JSON + ABI git-tracked, tx hashes resolve on-chain |
| LIVEDEP-05 | 18-01 | ✓ SATISFIED | handoff reversed, address present, both prohibitions gone |

No orphaned requirements.

### Anti-Patterns Found

None. No fabricated passes; the prior 3 "BLOCKs" were correctly root-caused to a decisionId-parse bug (polled LLM_AGENT_ID instead of HedgeDecisionRequested.topics[2]) and fixed (5a192c8/fa8828a). targetNotional held constant (oracle-clamped) between runs — movement proven on the school/economicTheory dimension, which satisfies LIVEDEP-03's "school label and/or targetNotional differ".

### Guardrails

- No unguarded `forge create` of the strategist — CONSUMER reuse guard intact (L224).
- `POLYGON_CHAIN_ID = 137` untouched in MacroHedgeStrategist.sol (L67, L266).
- No private key / secret in the published JSON (leak grep clean).

### Human Verification Required

None — all truths independently confirmed via on-chain reads by the orchestrator and static artifact checks.

### Gaps Summary

No gaps. All six observable truths verified, all four artifacts present/substantive/wired, all four LIVEDEP requirements satisfied, all guardrails honored. The phase goal — a proven on-chain two-leg HedgeMandate, a decision that moves on divergent input, and published address/ABI/inputs for the frontend — is achieved.

---

_Verified: 2026-06-08_
_Verifier: Claude (gsd-verifier)_
