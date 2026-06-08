---
phase: "09"
plan: "05"
subsystem: "cornerstone-live-tx"
tags: [runbook, ops, env, live-tx, honesty, deferred]
dependency_graph:
  requires: ["09-01", "09-02", "09-03", "09-04"]
  provides: ["MOD5-AGENT1LIVE", "MOD5-LIVE"]
  affects:
    - docs/cornerstone-operator-runbook.md
    - .env.example
    - .planning/phases/09-cornerstone-live-tx-integration/09-LIVE-VERIFICATION.md
tech_stack:
  added: []
  patterns:
    - "Operator runbook: provision → env → run → two-explorer-links + replay-degradation fallback"
    - "503-on-non-operator-deploy as documented deployment invariant"
    - "⊘ DEFERRED live-RUN with gating reason recorded in LIVE-VERIFICATION.md"
key_files:
  created:
    - docs/cornerstone-operator-runbook.md
  modified:
    - .env.example
decisions:
  - "Phase-9 completes on replay+mock DOM verdicts ✓ + built-and-wired live path (09-01..04) + live two-leg on-chain RUN explicitly ⊘ DEFERRED (external Somnia validator-callback outage, no code change needed on recovery)"
  - "Runbook operates with zero code changes once Somnia validator callbacks recover"
metrics:
  duration_min: 15
  completed_date: "2026-06-08"
  tasks: 1
  files: 2
---

# Phase 09 Plan 05: Operator Runbook + Live-DOM Gate Summary

**One-liner:** Operator runbook with STT-spend/503 warnings, replay-degradation fallback, and ⊘ DEFERRED live-RUN reframe; .env.example finalized with BuildBear + Agent-1 placeholders; live-DOM gate awaiting Evidence Collector (checkpoint).

## What Was Built

### Task 1 — Operator runbook + .env.example (commit d77f1e8)

**docs/cornerstone-operator-runbook.md** (187 lines, es-CO headers + en-compatible ops):

- REFRAMED precondition table: strategist deployed at `0xf0570CcB1271FFaFf4caCA628F3632257f177b1D`, oracle datum delivered, BuildBear executor deployed — all resolved. Live two-leg on-chain RUN ⊘ DEFERRED on external Somnia validator-callback outage (silent no-show; no code change needed).
- Provision sequence (7 steps): BuildBear re-provision (backend) → mirror buildbear-deployments.json (frontend) → env setup → pnpm dev → live run (on Somnia recovery) → replay-degradation fallback → post-demo EC verification.
- STT / security WARNING: `/api/abrigo/agent1` auto-spends ~1 STT per two-leg call; rate-limited 30s minimum; calls MUST be serialized; route MUST return 503 on any non-operator deploy (leave `SOMNIA_OPERATOR_PK` + `AGENT1_ROUTE_SECRET` unset).
- Expected result on Somnia recovery: TWO explorer links (Somnia tx for Agent-1 school+notional; BuildBear tx for Agent-2 mint) + TokenId + `nonErgodicDisclosed` pill + `(TEMPLATE)` rationale; all §0 honesty invariants holding.
- Owners named: backend = provision/deploy; frontend = mirror/run.
- Timing buffer: provision morning-of within 3-day BuildBear TTL; replay carries the demo honestly if live gate unavailable at showtime.

**.env.example** additions:
- `BUILDBEAR_RPC_URL`, `BUILDBEAR_EXECUTOR_ADDRESS`, `BUILDBEAR_POOL_ADDRESS` placeholders (source of truth = `lib/apps/abrigo/cornerstone/buildbear-deployments.json`)
- dataKey/consensus/userIntent reference block (pinned in `agent1-inputs.ts`, no separate env var needed; documented for operator awareness)

### Task 2 — Evidence Collector live-DOM gate (CHECKPOINT — awaiting human-verify)

The Evidence Collector live-DOM gate has not yet been run. The checkpoint is blocking for:
- REPLAY mode DOM verdicts ✓ (banner "modo repetición · recibos reales"; T0 snapshot decision + mint; NO fake live tx hash)
- MOCK mode DOM verdicts ✓ (banner "modo demostración (sin cadena)"; NO tx hash / block link)
- Honesty greps (no banned terms, no fake hash, no green fork-verified pill, no `<details>` wrapping card)
- Live two-leg on-chain RUN verdict ⊘ DEFERRED (external Somnia validator-callback outage) recorded in 09-LIVE-VERIFICATION.md

## Verification

- Runbook grep checks: SOMNIA_OPERATOR_PK ✓, AGENT1_ROUTE_SECRET ✓, BuildBear ✓, Somnia ✓, 503 ✓
- .env.example: SOMNIA_OPERATOR_PK ✓, AGENT1_ROUTE_SECRET ✓, BUILDBEAR_RPC_URL ✓, dataKey reference ✓
- Runbook line count: 187 (minimum 40)
- Commit d77f1e8: pre-commit hooks pass (typecheck ✓, commitlint ✓)

## Deviations from Plan

None — plan executed as written. Task 2 is a checkpoint (human-verify); paused correctly per plan `autonomous: false`.

## Self-Check: PASSED

- `/home/jmsbpp/apps/d2p/frontend/docs/cornerstone-operator-runbook.md` — FOUND (created)
- Commit d77f1e8 — FOUND in git history
- Task 2 checkpoint returned to orchestrator (not self-approved)
