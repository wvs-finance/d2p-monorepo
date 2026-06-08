---
phase: 11-macrohedgestrategist-hedge-decision-agent
plan: 03
subsystem: testing
tags: [somnia, testnet, e2e, llm-inference, json-fetch, cast, foundry, agentathon, agent-03]
requires:
  - "11-02 (MacroHedgeStrategist is SomniaAgentConsumer — requestActionDecision returns decisionId; requestSizeDecision(decisionId); HedgeDecisionMade event)"
  - "11-01 (ILLMAgent inferString/inferNumber in ISomniaAgents.sol)"
  - "MacroOracle (json-fetch oracle, PROXY_BASE keeper-proxy, MacroReceived event)"
provides:
  - "contracts/script/macro-hedge-strategist-e2e.sh — cast-driven Somnia-testnet integration runner (class-correct deposits, MacroOracle deploy/seed precondition, explicit decisionId hand-off, in-enum/in-range asserts)"
  - "AGENT-03 LIVE proof on Somnia testnet (chain 50312): two distinct HedgeDecisionMade events, decision-moves-with-consensus, json-fetch sourcing live Trading Economics CPI"
  - "Agentathon demo-video evidence: deployed addresses + two HedgeDecisionMade tx hashes"
affects:
  - "Agentathon submission (demo video + on-chain evidence)"
  - "any future live Somnia-testnet integration runner (this is the reference template for the 3-leg json-fetch->action->size sequence)"
tech-stack:
  added:
    - "cast-driven live Somnia-testnet e2e harness (foundry cast send/logs/call against api.infra.testnet.somnia.network)"
  patterns:
    - "class-correct per-leg deposits: JSON_DEPOSIT = FLOOR + 0.09 STT (json-fetch) vs LLM_DEPOSIT = FLOOR + 0.21 STT (each llm-inference leg) — NEVER floor-only (the TimedOut regression)"
    - "decisionId read EXCLUSIVELY from the action leg's HedgeDecisionRequested log topic (topics[2]) — the single source of truth, NOT reconstructed as bytes32(actionRequestId)"
    - "one infer per cast send (msg.value-forwarding footgun); MacroReceived awaited before the strategist reads latest(dataKey)"
    - "async-callback polling: cast logs poll loop with hard TIMEOUT_S + explicit FAIL branch"
key-files:
  created:
    - "contracts/script/macro-hedge-strategist-e2e.sh"
  modified: []
key-decisions:
  - "decisionId extracted as topics[2] AFTER the 'topics:' marker (the live-run fix in f008a99); topics[0] is the event signature, parsing it caused a permanent false-negative 'callback did not land'"
  - "balance gate compares 20-digit wei values by digit-count then lexically (bash signed-64-bit [ -lt ] overflows on a 20-digit value)"
  - "LLM_AGENT_ID 12847293847561029384 confirmed correct on-chain (the AgentRequested log target 0xb24ac1afbcefc708 = that id; the action callback landed) — the standalone ID-probe disambiguation never had to escalate"
patterns-established:
  - "Pattern: live Somnia-testnet integration runner = ensure MacroOracle (PROXY_BASE ending in /) -> json-fetch refresh awaiting MacroReceived -> deploy strategist -> requestActionDecision (capture decisionId from log) -> await action callback -> requestSizeDecision(decisionId) -> poll HedgeDecisionMade; assert in-enum action + in-range size"
  - "Pattern: prove agentic reasoning (not a constant) by holding the macro datum fixed and varying only consensus across two runs — both action AND size must differ"
requirements-completed: [AGENT-03]
duration: ~90min (incl. human-gated live run + orchestrator-driven live debug)
completed: 2026-06-02
---

# Phase 11 Plan 03: MacroHedgeStrategist Live Somnia-Testnet e2e Summary

**Live AGENT-03 proof on Somnia testnet (chain 50312): a cast-driven runner sequenced json-fetch oracle refresh -> requestActionDecision (decisionId captured from log) -> requestSizeDecision, yielding two distinct on-chain `HedgeDecisionMade` events whose (action, sizeBps) move with `consensus` while the live-sourced CPI datum (568, Trading Economics via keeper-proxy) is held fixed.**

## Performance

- **Duration:** ~90 min (script authoring + human-gated live run across two runs + orchestrator-driven live debug of two e2e-script bugs)
- **Completed:** 2026-06-02
- **Tasks:** 2 (1 auto + 1 checkpoint:human-verify, approved)
- **Files modified:** 1 (`contracts/script/macro-hedge-strategist-e2e.sh`)

## Accomplishments

- **Authored `contracts/script/macro-hedge-strategist-e2e.sh`** (commit `f150f96`): a `cast`-driven Somnia-testnet runner modeled on `somnia-probe-e2e.sh` — class-correct per-leg deposits (`JSON_DEPOSIT` = FLOOR + 0.09 STT json-fetch; `LLM_DEPOSIT` = FLOOR + 0.21 STT each llm-inference leg, never floor-only), a MacroOracle deploy-or-reuse precondition with a slash-terminated `PROXY_BASE` guard, an awaited `MacroReceived` before the strategist reads the datum, the explicit decisionId hand-off (action leg -> size leg), an ID-disambiguation probe, async-callback polling with a hard timeout + FAIL branch, and in-enum/in-range asserts on `HedgeDecisionMade`.
- **Proved AGENT-03 LIVE on Somnia testnet** across two end-to-end runs — in-enum action, in-range size, authenticated callback (inherited from 11-02 + the `AgentRequested`-target binding confirmed), and **decision-moves-with-consensus** (genuine reasoning, not a constant).
- **Captured the Agentathon demo-video evidence**: deployed addresses + two `HedgeDecisionMade` tx hashes (below).
- **json-fetch sourced LIVE data**: `MacroReceived` carried `macroValue=568` (Colombia inflation 5.68%) fetched live from Trading Economics (`api.tradingeconomics.com`) through the no-cache keeper-proxy — not a mock.

## Task Commits

1. **Task 1: Author `macro-hedge-strategist-e2e.sh`** — `f150f96` (feat)
2. **Task 1 (live-run fix): correct decisionId topic + big-int balance gate** — `f008a99` (fix) — see Deviations
3. **Task 2: Live Somnia-testnet run + demo evidence** — checkpoint:human-verify, **APPROVED** (on-chain evidence below; no new code commit — the run consumes the script)

**Plan metadata:** `docs(11-03): complete live e2e plan (AGENT-03 proven on Somnia testnet)` (this SUMMARY + STATE + REQUIREMENTS + ROADMAP).

## Live On-Chain Evidence (Somnia testnet, chain 50312)

**Deployed addresses:**
- **PLATFORM** (testnet `IAgentRequester`): `0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776`
- **MACRO_ORACLE** (deployed, `PROXY_BASE = https://keeper-eta-pied.vercel.app/`): `0xAcA75144f644220f1dEAD5F989C350D8e0Cc983f`
- **CONSUMER** (`MacroHedgeStrategist`): `0xfA428171E1F5B56f92C67C002De1d8e90B053EE1`

**Agent + datum:**
- **LLM_AGENT_ID** `12847293847561029384` — CONFIRMED correct on-chain (the `AgentRequested` log target `0xb24ac1afbcefc708` = that id; the action callback landed).
- **DATA_KEY** `0xb73053d3303a516ffee4ecf3fdcd9195da7e3192557a59fdecb0d83545c44841` (colombia/inflation); **macroValue = 568** (5.68%), sourced LIVE via the no-cache keeper-proxy → Trading Economics; `MacroReceived` emitted on-chain.

**Run #1 — consensus = 500:**
- consensus=500 → action = **ADD_LONG_GAMMA (1)**, sizeBps = **6800**
- decisionId `0x..3e4015`
- `HedgeDecisionMade` tx: `0x2a8ec99452956fb94ad3b138844957409b298daa05e2d9986b34676d643c36a5`
- size-leg tx: `0x887f16705aec6df12cb6c643edb70a32264f7212ad6380be6f3e2d59c7677ecd`

**Run #2 — consensus = 900:**
- consensus=900 → action = **REDUCE (2)**, sizeBps = **568**
- decisionId `0x..3e5110`
- `HedgeDecisionMade` tx: `0x5057f803d214aa549e16a6c8ce3745610f0ce407a3bac06c1a6f643807dc3575`

**Decision-moves-with-consensus PROVEN:** same macro datum (568), different `consensus` (500 vs 900) → **(ADD_LONG_GAMMA, 6800)** vs **(REDUCE, 568)** — both the action AND the size differ ⇒ genuine consensus-sensitive reasoning, not a constant.

**Invariants (live + inherited):** in-enum action `∈ {0,1,2,3}` ✓; in-range size `≤ 10000` ✓; authenticated callback (`msg.sender == PLATFORM` + request-binding + replay nonce) ✓ (inherited and unit-proven in 11-02; the live `AgentRequested`-target binding confirmed the request actually reached the right agent).

## Requirement Satisfied

**AGENT-03 — COMPLETE.** The Somnia-testnet run proves an in-enum action + in-range size from a real `requestActionDecision`/`requestSizeDecision` sequence joined on the explicit decisionId; the authenticated callback path (msg.sender==PLATFORM + request-binding + replay nonce) is enforced (unit-proven in 11-02, live request-binding confirmed); and the decision moves with `consensus`. With AGENT-01/02 (11-02) and AGENT-04 (11-04) already complete, **all four AGENT-01..04 are now complete.**

## Decisions Made

- decisionId is read EXCLUSIVELY from the action leg's `HedgeDecisionRequested` log topic (topics[2], read AFTER the `topics:` marker) — the single source of truth, authoritative regardless of how the contract derives the id; never reconstructed as `bytes32(actionRequestId)`.
- Balance gate compares 20-digit wei values by digit-count then lexically (bash signed-64-bit `[ -lt ]` overflows on a 20-digit value).
- LLM_AGENT_ID `12847293847561029384` confirmed live; the ID-disambiguation probe never had to escalate to a redeploy.

## Deviations from Plan

### Auto-fixed Issues

Two e2e-script bugs were discovered DURING the live run (orchestrator-driven debug between run #1 and run #2) and fixed together in **`f008a99`**. Both were defects in the integration runner's parsing/gating logic, not in the contract under test.

**1. [Rule 1 - Bug] decisionId parsed as topics[0] (event signature) instead of topics[2]**
- **Found during:** Task 2 (live run #1).
- **Issue:** The script extracted the 3rd 64-hex token in the whole `cast logs` text, which is `topics[0]` (the `HedgeDecisionRequested` event signature hash), not `topics[2]` (the real decisionId). The poll then watched an empty `getDecision(eventSigHash)` slot forever → a permanent false-negative "action callback did not land".
- **Fix:** Extract the 3rd 64-hex value AFTER the `topics:` marker (= `topics[2]` = the real decisionId). The corrected script then printed "ACTION callback landed" and completed run #2 cleanly end-to-end.
- **Files modified:** `contracts/script/macro-hedge-strategist-e2e.sh`
- **Verification:** Run #2 completed end-to-end (decisionId `0x..3e5110`, `HedgeDecisionMade` emitted).
- **Committed in:** `f008a99`

**2. [Rule 1 - Bug] Balance gate overflowed bash's signed 64-bit int on a 20-digit wei value**
- **Found during:** Task 2 (live run).
- **Issue:** The balance-vs-deposit gate used `[ -lt ]` on a 20-digit wei value, overflowing bash's signed 64-bit integer (`integer expected` error).
- **Fix:** Compare by digit-count first, then lexically — correct for non-negative big integers without bignum tooling.
- **Files modified:** `contracts/script/macro-hedge-strategist-e2e.sh`
- **Verification:** Gate passed cleanly on the live wallet balance in run #2.
- **Committed in:** `f008a99`

---

**Total deviations:** 2 auto-fixed (both Rule 1 - Bug, in the integration runner). **Live-run debugging was orchestrator-driven** (the human ran the script; the orchestrator diagnosed the false-negative and the overflow between runs and applied the fixes). No contract changes; no scope creep.

## Issues Encountered

- The first live run surfaced a false-negative "action callback did not land" — diagnosed as the topics[0]/topics[2] parsing bug above (the callback HAD landed on-chain; the script was reading the wrong topic). Resolved in `f008a99`; run #2 ran cleanly end-to-end and confirmed the decision-moves proof.

## User Setup Required

None — the deployed addresses, keeper-proxy, and funded wallet are already live (see contracts/.env for wallet creds; never committed). No further configuration to reproduce; re-running spends STT.

## Next Phase Readiness

- Phase 11 (Agentathon POC) is COMPLETE: AGENT-01..04 all done. Demo-video evidence (addresses + two `HedgeDecisionMade` tx hashes) is captured above.
- The v2.0 convex-instrument arc (phases 7–10) is unaffected by this side-track; the next v2.0 action remains Phase 8 (LongGammaWrapper).
- No blockers.

## Self-Check: PASSED

- FOUND: `.planning/phases/11-macrohedgestrategist-hedge-decision-agent/11-03-SUMMARY.md`
- FOUND (committed): `contracts/script/macro-hedge-strategist-e2e.sh`
- FOUND commit: `f150f96` (Task 1 — script)
- FOUND commit: `f008a99` (Task 1 live-run fix — decisionId topic + balance gate)
- FOUND commit: `6c7c6e6` (plan-metadata docs commit)
- AGENT-03 marked Complete in REQUIREMENTS.md (checkbox + traceability)

---
*Phase: 11-macrohedgestrategist-hedge-decision-agent*
*Completed: 2026-06-02*
