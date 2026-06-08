---
phase: 17-live-deploy-pre-flight-surface-verification
verified: 2026-06-08T00:00:00Z
status: passed
score: 5/5 must-haves verified
---

# Phase 17: Live Deploy + Pre-Flight Surface Verification — Verification Report

**Phase Goal:** The two-leg MacroHedgeStrategist (StrategistDecided API) deployed live on Somnia testnet 50312 at a NEW address (≠ v1 0xfA428171…), wired to live platform 0x037Bb9…6776 / LLM agent 12847293847561029384 / MacroOracle 0xAcA751…983f, and the volatile surface re-confirmed correct BEFORE any full STT-spending prove run.
**Verified:** 2026-06-08
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Two-leg StrategistDecided strategist has live bytecode at a NEW Somnia-50312 address (≠ v1) | ✓ VERIFIED | Orchestrator-confirmed on-chain: 0xf0570CcB1271FFaFf4caCA628F3632257f177b1D bytecode len 19438, ≠ v1; deploy tx 0x6e19500c… status 1 (block 403802527) |
| 2 | Constructor-wired surface reads back live platform, LLM agent id, and MacroOracle | ✓ VERIFIED | On-chain PLATFORM()=0x037Bb9…6776, LLM_AGENT_ID()=12847293847561029384 (orchestrator-confirmed); ORACLE() read-back asserted in runner Step 3 |
| 3 | Single cheap requestSchoolDecision probe returns a real validator callback (schoolSet==true) | ✓ VERIFIED | On-chain decisionState(decisionId)=(true,false,0,"SHILLER_MACRO_RISK"); school-leg tx 0xdbc1e636… status 1 — schoolSet==true, mapped label (not DecisionFailed/no-callback) |
| 4 | FREE surface gate (platform code + v1 reachable + chain-id 50312) re-confirmed BEFORE STT spend; agent liveness proven BY the cheap probe | ✓ VERIFIED | Runner Step 0c ordered before first spend (ORDER_0c OK); explicit chain-id==50312 test+exit 1 at L111; ordering smoke checks pass; probe (truth 3) proves the volatile id |
| 5 | v1 contract 0xfA428171… still has bytecode (reachable, not decommissioned) | ✓ VERIFIED | Orchestrator-confirmed: v1 still reachable, bytecode len 15199; runner carries the v1-reachable guard |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `contracts/script/macro-hedge-strategist-e2e.sh` | Two-leg runner with FREE pre-spend surface gate + oracle-freshness gate | ✓ VERIFIED | bash -n parses; requestSchoolDecision(string,bytes32,int256) present (1); v1 sigs removed (0); decisionState poll, 4-member oracle tuple (no 5-member), 3 immutable read-backs, v1 guard, NEED_PER_RUN (no NEED_DEMO), no PK echo — all pass |

### Key Link Verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- | --- |
| Step 0c FREE surface gate | first STT spend | ordering | ✓ WIRED | grep-stripped awk ordering check passes; explicit chain-id equality + exit 1 branch present |
| deployed immutables | live platform/agent/oracle | cast-call equality read-back | ✓ WIRED | PLATFORM()/ORACLE()/LLM_AGENT_ID() read-backs present in Step 3; on-chain values match live constants |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| --- | --- | --- | --- | --- |
| LIVEDEP-01 | 17-01-PLAN | Two-leg strategist deployed to Somnia 50312 at NEW address, wired to live platform/agent/oracle | ✓ SATISFIED | NEW address with bytecode + matching immutables (on-chain confirmed); marked Complete in REQUIREMENTS.md L105/L119 |

### Anti-Patterns Found

None. No TODO/placeholder/stub patterns in the runner; the script executes real cast/forge commands with FAIL branches. SUMMARY claims cross-checked against independent on-chain facts and match (note: SUMMARY says bytecode len 19439, orchestrator measured 19438 — a 1-char trailing-newline/wc artifact, not material; both confirm non-empty NEW bytecode).

### Human Verification Required

None. All goal-critical facts are programmatically confirmed on-chain by the orchestrator.

### Gaps Summary

No gaps. All five observable truths verified against independent on-chain evidence. Phase-18 scope (full decision-moves prove run, somnia-strategist-deployment.json publish, handoff update — LIVEDEP-02..05) is correctly out of Phase-17 scope and its absence is not a gap. The deploy + single cheap school-leg liveness probe both succeeded on the first run (SUCCESS, not the allowed PARTIAL).

---

_Verified: 2026-06-08_
_Verifier: Claude (gsd-verifier)_
