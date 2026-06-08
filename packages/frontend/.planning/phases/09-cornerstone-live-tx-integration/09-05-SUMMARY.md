---
phase: 09-cornerstone-live-tx-integration
plan: 05
subsystem: ui
tags: [somnia, buildbear, operator-runbook, live-tx, evidence-collector, env]

# Dependency graph
requires:
  - phase: 09-cornerstone-live-tx-integration
    provides: "09-04 wired live|replay|mock cornerstone page + Agent-1 route + Agent-2 fork mint"
provides:
  - "docs/cornerstone-operator-runbook.md — full provision+env+run+honesty-degrade runbook for live two-chain Somnia+BuildBear showcase"
  - ".env.example finalized with SOMNIA_OPERATOR_PK, AGENT1_ROUTE_SECRET, BuildBear RPC/addr, dataKey/consensus placeholders"
  - "09-LIVE-VERIFICATION.md — EC verdicts: replay ✓ / mock ✓ / live-to-replay degradation ✓ / live two-leg RUN ⊘ DEFERRED; §0.2 waiver recorded"
affects: [post-phase live EC run when Somnia validator callbacks recover]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Operator runbook names backend owner (provision/deploy) and FE owner (mirror/run) explicitly per spec §4b"
    - "Live EC gate: replay is the in-phase guaranteed artifact; live on-chain RUN is ⊘ DEFERRED on external infra — not a phase gate"
    - "§0.2 no-bridge disclosure is isLive-gated in ModeBanner.tsx; claim re-pointed to live mode as accepted waiver"

key-files:
  created:
    - docs/cornerstone-operator-runbook.md
    - .planning/phases/09-cornerstone-live-tx-integration/09-05-SUMMARY.md
  modified:
    - .env.example
    - .planning/phases/09-cornerstone-live-tx-integration/09-LIVE-VERIFICATION.md

key-decisions:
  - "§0.2 verbatim no-bridge disclosure is live-mode-only (isLive-gated in ModeBanner.tsx); plan claim re-pointed to live mode; accepted waiver 2026-06-08; no code change"
  - "Phase-9 completes on replay+mock ✓ + built-and-wired live path; live two-leg on-chain RUN is ⊘ DEFERRED on Somnia validator-callback recovery — not a phase-9 completion gate"

patterns-established:
  - "Evidence Collector §0.2 waiver pattern: when a claim is intentionally mode-gated, record acceptance in NN-LIVE-VERIFICATION.md with date + rationale; no code change needed"

requirements-completed: [MOD5-AGENT1LIVE, MOD5-LIVE]

# Metrics
duration: 20min
completed: 2026-06-08
---

# Phase 09 Plan 05: Operator Runbook + Evidence Collector Gate Summary

**Operator runbook (provision→env→run→two-explorer expectation + STT/503 warning) written and .env.example finalized; EC live-DOM gate passed for replay+mock with live two-leg RUN explicitly ⊘ DEFERRED on Somnia validator-callback outage**

## Performance

- **Duration:** ~20 min total (Task 1 initial + continuation finalization)
- **Started:** 2026-06-08T16:00:00Z
- **Completed:** 2026-06-08T18:00:00Z
- **Tasks:** 2/2
- **Files modified:** 4

## Accomplishments

- `docs/cornerstone-operator-runbook.md` written: full provision → env → run sequence, REFRAMED precondition (strategist live at `0xf0570CcB1271FFaFf4caCA628F3632257f177b1D`; live RUN ⊘ DEFERRED on validator recovery), STT-spend/rate-limit/503-on-non-operator-deploy warning, backend+FE owner assignments, timing buffer, two-explorer expectations, and honest replay-degradation fallback.
- `.env.example` finalized with `SOMNIA_OPERATOR_PK`, `AGENT1_ROUTE_SECRET`, BuildBear RPC/address placeholders, and `dataKey/consensus` pointer to `AGENT1_INPUTS`; no real secrets committed.
- Evidence Collector live-DOM gate ran against local prod build (`:3040`): replay ✓ PASS (recorded run CPI 5.68% → ADD_LONG_GAMMA/6800 → strike 360360; no tx-hash; honesty greps clean; fork pill neutral; nonErgodicDisclosed + "(TEMPLATE)" full-weight); mock ✓ PASS; live-to-replay degradation ✓ PASS (aria-live announce); live two-leg on-chain RUN ⊘ DEFERRED (Somnia validator-callback outage, external infra, no ETA; backend ref "18-02").
- §0.2 no-bridge disclosure waiver recorded in 09-LIVE-VERIFICATION.md: claim re-pointed to live mode (by design: `ModeBanner.tsx` `isLive`-gated); accepted by user 2026-06-08.

## Task Commits

1. **Task 1: Operator runbook + .env.example** — `d77f1e8` (chore)
2. **Task 2: Evidence Collector live-DOM gate (checkpoint resolved)** — this docs commit

## Files Created/Modified

- `docs/cornerstone-operator-runbook.md` — provision→env→run runbook; STT/503 warning; two-explorer expectation; ⊘-deferred reframe
- `.env.example` — SOMNIA_OPERATOR_PK + AGENT1_ROUTE_SECRET + BuildBear placeholders; server-only / 503 note
- `.planning/phases/09-cornerstone-live-tx-integration/09-LIVE-VERIFICATION.md` — EC verdicts; §0.2 waiver record appended

## Decisions Made

- **§0.2 disclosure is live-mode-only by design.** `ModeBanner.tsx` gates it on `isLive`; replay/mock carry no bridge action to disclose. Plan claim re-pointed to live mode. Accepted waiver 2026-06-08. No code change.
- **Phase-9 completion gate = replay+mock ✓ + wired live path + ⊘-deferred row.** No landed live StrategistDecided/mint required in-phase.

## Deviations from Plan

None — plan executed exactly as written. The ⚠ PARTIAL on claim 4 (§0.2) was recognized as a spec-pointer artifact during the EC run; resolved as an accepted waiver per user decision, not a code defect.

## Issues Encountered

None in Task 1. Task 2 (checkpoint) was the EC gate: ran as expected. One ⚠ PARTIAL (§0.2 disclosure) resolved by re-pointing the plan claim to live mode rather than any code change.

## User Setup Required

See `docs/cornerstone-operator-runbook.md` for:
- `SOMNIA_OPERATOR_PK` (funded Somnia testnet account >50 STT; server-only; never `NEXT_PUBLIC_`)
- `AGENT1_ROUTE_SECRET` (self-generated shared secret)
- BuildBear RPC + deployed addresses (from `lib/apps/abrigo/cornerstone/buildbear-deployments.json` after backend provision)
- Backend provision step: run `provision-buildbear-demo.sh` (fresh-executor/--no-mint variant) + FE mirrors `buildbear-deployments.json`
- Live RUN gated on Somnia validator-callback recovery (external infra; no ETA)

## Next Phase Readiness

Phase 9 is complete. All 5 plans shipped:
- 09-01: T0 replay freeze + Wave-0 ABIs + fork chain + BalanceDelta decoder
- 09-02: Agent-1 Somnia server route (rate-limited, operator-key)
- 09-03: Agent-2 fork mint (resolveFromMandate, chainId 31337) + fromChainEvent + Davidson split
- 09-04: Live|replay|mock page wire + 6 UI-SPEC surfaces + e2e
- 09-05: Operator runbook + .env.example + EC live-DOM gate (this plan)

Post-phase action (non-blocking): when Somnia validator callbacks recover, re-provision BuildBear (fresh-executor/--no-mint), re-mirror `buildbear-deployments.json`, run the live EC pass per runbook "Expected on Somnia recovery" section.

## Self-Check: PASSED

- `/home/jmsbpp/apps/d2p/frontend/docs/cornerstone-operator-runbook.md` — FOUND (created in Task 1)
- Commit d77f1e8 — FOUND (Task 1)
- `/home/jmsbpp/apps/d2p/frontend/.planning/phases/09-cornerstone-live-tx-integration/09-LIVE-VERIFICATION.md` — FOUND (EC verdicts + §0.2 waiver appended)

---
*Phase: 09-cornerstone-live-tx-integration*
*Completed: 2026-06-08*
