---
phase: 15-cornerstone-e2e-ci
plan: 03
subsystem: docs / frontend-to-contracts handoff
tags: [E2E-01, handoff, buildbear, agent-2, representativeness]
requires:
  - "MacroHedgeExecutor (shipped Phase 13/14): resolveFromMandate / resolveAndMint / quoteMargin / 8-param ExecutorDecided / 3-field PositionMinted"
  - "contracts/script/out/buildbear-deployments.json (Plan 01 output contract: executor/pool/rpcUrl/mintTxHash)"
provides:
  - "docs/UI-AGENT-HANDOFF.md refreshed to the SHIPPED executor + the Phase-15 hosted-fork swap-to-real seam"
affects:
  - "the sibling frontend repo (/home/jmsbpp/apps/d2p/frontend) real-mint wiring — scoped, NOT committed here"
tech-stack:
  added: []
  patterns: ["single-RPC BuildBear sandbox", "CORS keeper-proxy fallback", "deployments-artifact address source (not constants)"]
key-files:
  created: []
  modified: ["docs/UI-AGENT-HANDOFF.md"]
decisions:
  - "Agent-2 demo env = hosted BuildBear Polygon-fork sandbox (chainId 31337); addresses/RPC from buildbear-deployments.json, never hardcoded"
  - "Agent-1 = recorded v1 trace LIVE on real Somnia testnet 50312 (never forked); HedgeMandate carried as the hand-off value object"
  - "Frontend real-mint wiring is a sibling-repo deliverable; abrigo-somnia MVP stands on the provisioning script + artifact + verifiable mintTxHash"
metrics:
  duration: "~5 min"
  tasks: 2
  files: 1
  completed: "2026-06-07"
---

# Phase 15 Plan 03: UI-AGENT-HANDOFF refresh Summary

Refreshed the stale `docs/UI-AGENT-HANDOFF.md` so the frontend agent integrates against the SHIPPED Phase-13/14 `MacroHedgeExecutor` (deployable + fork-proven) and the Phase-15 hosted-fork real-leg seam, not the pre-Phase-13 "34-line STUB" description.

## What shipped

**Task 1 (commit 4f0dbb3)** — Section-3 status table + section-5 event shapes:
- MacroHedgeExecutor row flipped to 🟡 SHIPPED deployable (resolveFromMandate / resolveAndMint / _onResult / quoteMargin all implemented + fork-proven, mints at strike 360360; fork-only, BUSL-1.1). The "34-line STUB"/"pseudo-code"/"mint logic only in a fork test" wording deleted.
- Monitoring row → DEFERRED (MON-01): basic position read (quoteMargin + numberOfLegs), not a monitoring agent.
- ExecutorDecided replaced with the shipped 8-param shape `(uint256 requestId, uint8 regimeZt, uint256 inflationAdjustmentWad, int24 strikeTick, int24 regimeWidth, bool parametricHedged, bool nonErgodicDisclosed, string rationale)` + render note (nonErgodicDisclosed + TEMPLATE rationale = Davidson honesty split).
- PositionMinted replaced with the shipped 3-field shape `(address owner, TokenId positionId, uint128 positionSize)`; margins pointed at `quoteMargin(positionId, strike) -> BalanceDelta`.
- PerformanceUpdated marked DEFERRED (MON-01).

**Task 2 (commit b4e1efa)** — Section 6 swap-to-real + honesty + cross-repo boundary:
- Section 6 rewritten: the Agent-2 leg mints `resolveFromMandate(mandate, legIndex, positionSize)` on a HOSTED BuildBear Sandbox (Polygon fork, chainId 31337), addresses/RPC/mintTxHash read from `contracts/script/out/buildbear-deployments.json` (written by `provision-buildbear-demo.sh`); basic read-back via numberOfLegs + quoteMargin; mock kept alongside (fromMockEvent seam) for graceful degradation; single-RPC model + CORS keeper-proxy fallback documented.
- Verbatim on-screen no-cross-chain-bridge honesty label added.
- Agent-1 reality corrected: deployed strategist is still v1 (HedgeDecisionMade); Phase-12 StrategistDecided is source-only/unit-proven and NOT deployed; Agent-1-live = the recorded v1 trace live on Somnia 50312 (never forked). Frontend told NOT to subscribe to a live StrategistDecided or deploy the Phase-12 strategist.
- Cross-repo boundary stated: real-mint wiring (defineChain id 31337, mint panel, real reader/writer, wagmi repoint) is committed in /home/jmsbpp/apps/d2p/frontend, not here.
- Section 7 guardrails: MON-01 / HEDGE-01 / XCHAIN-01 / no public-mainnet deploy. Dated refresh note appended.

## Verification (all acceptance gates pass)

- `grep regimeZt` = 1, `nonErgodicDisclosed` = 2, `uint128 positionSize` = 1, `quoteMargin` = 4
- `34 lines` = 0, `34-line` = 0 (stub claim gone)
- `buildbear` = 8, `buildbear-deployments.json` = 4, `no cross-chain bridge` = 2, `recorded` = 1, frontend path = 2, `swap` = 5
- `! grep serve-polygon-fork-demo.sh` PASS, `! grep -i tenderly` PASS
- `resolveFromMandate` present (artifact `contains` requirement)

## Deviations from Plan

None — plan executed exactly as written.

## Deferred / out of scope

Frontend real-mint wiring (sibling repo). No abrigo-somnia code or contract changes — docs-only plan.

## Self-Check: PASSED

- FOUND: docs/UI-AGENT-HANDOFF.md
- FOUND: .planning/phases/15-cornerstone-e2e-ci/15-03-SUMMARY.md
- FOUND: commit 4f0dbb3 (Task 1)
- FOUND: commit b4e1efa (Task 2)
