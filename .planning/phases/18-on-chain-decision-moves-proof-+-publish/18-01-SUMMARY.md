---
phase: 18-on-chain-decision-moves-proof-+-publish
plan: 01
subsystem: infra
tags: [somnia, testnet, llm-inference, strategist, decision-moves, complete, validator-callback, bugfix]

# Dependency graph
requires:
  - phase: 17-live-deploy-pre-flight-surface-verification
    provides: the live two-leg MacroHedgeStrategist deploy (0xf0570CcB…7b1D) + the adapted runner
provides:
  - "An extended, fully-committed two-leg decision-moves runner (run_two_leg + divergent run-2 + idempotent persist + conditional oracle refresh) with the decisionId-parse bug FIXED"
  - "A committed somnia-strategist-deployment.json (§2.4 schema) carrying the live strategist + 3 real run-1 tx hashes + the decision-moves proof"
  - "A committed MacroHedgeStrategist ABI (script/out/MacroHedgeStrategist.abi.json) carrying StrategistDecided"
  - "PROVEN on-chain: two full two-leg HedgeMandates on Somnia 50312 (decisionState==(true,true)) AND the decision MOVES (SHILLER 0x5 -> POST_KEYNESIAN 0x6 on divergent input)"
  - "docs/UI-AGENT-HANDOFF.md reversed to ✅ LIVE — both §6 prohibition sentences replaced by a LIVE-subscribe instruction"
affects: [frontend-live-agent-1]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Conditional oracle refresh: skip the flaky json-fetch requestMacro when latest(DATA_KEY).deliveredAt != 0"
    - "decisionId-bound per-run log/state capture so run-2 can never re-read run-1's log on a reused CONSUMER"
    - "Signature-filtered log extraction: filter topics[0]==HedgeDecisionRequested-sig BEFORE topics[2] — the strategist tx emits a second >=3-topic log carrying the LLM_AGENT_ID, which an address-only filter mis-grabs"

key-files:
  created:
    - .planning/phases/18-on-chain-decision-moves-proof-+-publish/18-01-SUMMARY.md
    - contracts/script/out/somnia-strategist-deployment.json  # §2.4 artifact, force-staged (gitignored out/)
    - contracts/script/out/MacroHedgeStrategist.abi.json       # extracted ABI w/ StrategistDecided, force-staged
  modified:
    - contracts/script/macro-hedge-strategist-e2e.sh  # decisionId-parse bug fix + annotation-strip fix
    - docs/UI-AGENT-HANDOFF.md                         # §6 reversed to LIVE-subscribe; row 🟡→✅

key-decisions:
  - "ROOT CAUSE of the 3 prior 'BLOCKs' was a decisionId-PARSE bug, NOT Somnia infra: the school tx emits TWO >=3-topic logs on the consumer — log#1 (sig 0x9bb846…) carries the LLM_AGENT_ID (0x…b24ac1afbcefc708), log#2 is HedgeDecisionRequested (sig 0x4a4643…) carrying the real decisionId. The old jq (address + topics>=3 + head -n1) grabbed log#1, so the poller read decisionState(agentId)=(false,false) forever. The validators were responsive the whole time."
  - "Added a signature filter (topics[0]==0x4a4643…) before topics[2] + an acceptance assertion that the parsed id != the agent-id constant (regression guard)."
  - "Second Rule-1 fix: cast annotates large ints ('58400000 [5.84e7]') — strip the bracketed suffix before the numeric assertion."
  - "chainId=137 untouched; no secret echoed or committed; CONSUMER reused (no forge create)."

patterns-established:
  - "Signature-filtered topic extraction for multi-log txs"
  - "Conditional-refresh guard pattern for intermittent off-chain data legs"

requirements-completed: [LIVEDEP-02, LIVEDEP-03, LIVEDEP-04, LIVEDEP-05]

# Metrics
duration: ~25min
completed: 2026-06-08
attempts: 1  # the bug-fixed runner succeeded on the corrected run (after the false BLOCKs of v2.0)
---

# Phase 18 Plan 01: On-chain decision-moves proof + publish — COMPLETE

**The decisionId-parse BUG is fixed and the live two-leg proof PASSED on Somnia 50312. Two full `HedgeMandate`s landed (`decisionState == (true, true)`), the decision MOVES (run-1 `SHILLER_MACRO_RISK` `0x5` vs run-2 `POST_KEYNESIAN` `0x6` on a divergent intent+consensus), the §2.4 deployment JSON + ABI are published & committed, and `docs/UI-AGENT-HANDOFF.md` is reversed to ✅ LIVE-subscribe. The 3 prior "BLOCKs" were FALSE — caused by polling the wrong decisionId; the validators were responsive all along.**

## Performance
- **Duration:** ~25 min
- **Completed:** 2026-06-08
- **Tasks:** Task 1 + Task 2 (runner + live runs) + Task 3 (publish) — ALL complete
- **Files modified:** runner + handoff; 2 artifacts created (JSON + ABI)

## The Bug & The Fix (root cause of the 3 prior false BLOCKs)
The strategist's `requestSchoolDecision` tx emits TWO logs on the consumer with ≥3 topics:
- **log#1** sig `0x9bb846491a984154…` → `topics[2]` = the LLM_AGENT_ID (`0x…b24ac1afbcefc708` = 12847293847561029384)
- **log#2** `HedgeDecisionRequested` sig `0x4a46430989d2486872dcb9df82504d48879adc86f33d1cd7c58c214b4526e96d` → `topics[2]` = the REAL decisionId

The v2.0 jq (`select(address==CONSUMER) | select(topics|length>=3) | .topics[2]` then `head -n1`) grabbed **log#1**, i.e. the agent-id, then polled `decisionState(agentId)` → always `(false,false)` → a FALSE BLOCK. (Proof: `decisionState(0x566afb)` from a prior attempt read `(true,false,0,"SHILLER_MACRO_RISK")` — the school leg HAD landed.)

**Fix (`5a192c8`):** add `select((.topics[0]|ascii_downcase)==$HDR_SIG)` before `.topics[2]` (applied to both the school decisionId and the notional requestId extraction) + an acceptance assertion that the parsed decisionId is NOT the agent-id constant (regression guard). `bash -n` clean.

**Second fix (`fa8828a`, Rule 1):** `getMandate` reads `cast`-annotated ints like `58400000 [5.84e7]`; the awk split kept the bracketed suffix → a false "targetNotional non-numeric" BLOCK. Strip everything from the first `[` after the space-strip.

## Task Commits
1. **decisionId-parse bug fix** — `5a192c8` (fix).
2. **annotation-strip fix** — `fa8828a` (fix).
3. **publish artifact + reverse handoff** — `5e90e51` (feat).

## On-chain Evidence (Somnia 50312, CONSUMER 0xf0570CcB…7b1D)

### RUN 1 (SHILLER-leaning, consensus 500) — full mandate, LIVEDEP-02
- decisionId `0x…0056745e` — `decisionState == (true, true, 1780942137, "SHILLER_MACRO_RISK")`
- mandate: economicTheory `0x…0005` (SHILLER), targetNotional 58400000, chainId 137, isLong true
- schoolTx `0x9872783590b7ccfbce5aa56d6cfde8418badc1dd204649e51348c949d8cc1518`
- notionalTx `0x96beca0dfe6a5f01fd4774ce7a0973f72beeb03cc9f0a2ff4005cfb1c1a57339`
- strategistDecidedTx `0x0a00e0ab63a415af8e3164f5029daae3439001adef4df59760c83085712dd9b8` (mined block 403979970, to platform)

### RUN 2 (post-Keynesian regime risk, consensus 900) — full mandate, LIVEDEP-03 PASS
- decisionId `0x…0056747b` — school `POST_KEYNESIAN`, economicTheory `0x…0006`, targetNotional 58400000
- schoolTx `0x965b28b578f8f0aeb5ebec2ed59712f4366b0547033121a2f694a84ef341cee5`
- notionalTx `0xf805dbbceb4eb676a10bb3f66dc3e540ce0950025c977b76d021443141b28018`
- strategistDecidedTx `0xcad34b2c51c6f70d6ed9d43ed3bb6ecc5666d1358c91a841b6f2d8bf2d27dc78`

### Decision-moves verdict
**DECISION-MOVES PROVEN** — the school label moved `SHILLER_MACRO_RISK` (`0x5`) → `POST_KEYNESIAN` (`0x6`) on the divergent intent+consensus. `targetNotional` held (oracle-clamped); movement is proven on the school/economicTheory dimension. Every per-run capture is decisionId-bound (run-1 is never compared to itself).

## STT spend
Across the run-1-only first pass (annotation BLOCK after both legs landed) + the full second pass: wallet ~95.63 → ~95.13 STT ≈ ~0.5 STT per full pass (4 LLM legs in the successful pass), well within the ~1.8 STT reserve. No runaway. Note the first pass's mandate (`0x56745e` is the second-pass id; the first pass landed `0x56739b`) is also a valid full mandate on-chain — the annotation bug only blocked the *assertion*, not the on-chain landing.

## Deviations from Plan
### Auto-fixed Issues
**1. [Rule 1 - Bug] decisionId-parse selected the wrong log** — found in Task 2; root cause of all 3 prior "BLOCKs". Fix: signature filter + regression assertion. Commit `5a192c8`.
**2. [Rule 1 - Bug] cast int annotation broke the targetNotional assertion** — found in Task 2 (after the parse fix let the proof reach the mandate assertion). Fix: strip `[…]` suffix. Commit `fa8828a`.

**Total:** 2 auto-fixed bugs. The conditional-oracle-refresh Rule-3 fix from the prior session is retained.

## Self-Check: PASSED
- Commits exist: `5a192c8`, `fa8828a`, `5e90e51` — all in git log.
- `contracts/script/out/somnia-strategist-deployment.json` parses; strategist + 3 run-1 `0x…` tx hashes; chainId 50312.
- `strategistDecidedTx` resolves on-chain (block 403979970).
- `contracts/script/out/MacroHedgeStrategist.abi.json` contains `StrategistDecided`.
- `docs/UI-AGENT-HANDOFF.md` contains `0xf0570CcB…7b1D`; BOTH prohibition sentences gone (grep -i 'subscribe to a live' = 0, grep 'Do NOT instruct the frontend to subscribe' = 0).
- LIVEDEP-02/03/04/05 all complete and on-chain-verifiable.

---
*Phase: 18-on-chain-decision-moves-proof-+-publish*
*Completed: 2026-06-08 — decisionId-parse bug fixed, full two-leg proof PASSED, decision MOVES proven*
