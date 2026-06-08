---
phase: 09-cornerstone-live-tx-integration
plan: "03"
subsystem: cornerstone-live-tx
tags: [live-producer, mandate-override, pke-pin, chain-event-decoder, davidson-split, tdd]
dependency_graph:
  requires: ["09-01"]
  provides: ["fromChainEvent", "runWorkflowLive", "buildLiveMandate", "HedgeDecisionCardV2-D1"]
  affects: ["09-04", "09-05"]
tech_stack:
  added: []
  patterns:
    - "PKE-pinned economicTheory sentinel (MINT_ECONOMIC_THEORY = 0x…06) on live mint"
    - "D4 chainId override to 31337 before resolveFromMandate"
    - "BooleanPill: color+icon+text pill (CROSS-09) for honesty flags"
    - "runWorkflowLive with idempotent reverted/error/ok:false short-circuit"
key_files:
  created:
    - tests/unit/cornerstone/mandate-override.test.ts
    - tests/unit/cornerstone/producer-ordering.test.ts
  modified:
    - lib/apps/abrigo/cornerstone/workflow-engine.ts
    - components/defi/cornerstone/HedgeDecisionCardV2.tsx
    - app/(defi)/apps/abrigo/cornerstone/page.tsx
    - tests/unit/cornerstone-decision-card.test.tsx
    - messages/es-CO/somnia.json
    - messages/en/somnia.json
decisions:
  - "MINT_ECONOMIC_THEORY = 0x…06 (PKE) pinned on live mint; SHILLER mandate (0x05) never passed to resolveFromMandate — would route different/reverting strike and break 360360 anchor (v5 fix-2)"
  - "chainId overridden to 31337 (BuildBear fork) before resolveFromMandate; MacroHedgeExecutor.sol:365 reverts 'No crosschain allowed yet' otherwise (D4)"
  - "school LABEL rendered from StrategistDecided event STRING — decoupled from the PKE mint sentinel; fromChainEvent uses args.school || schoolLabelFromAddress fallback"
  - "quoteMargin called strictly after confirmed PositionMinted; reverted path emits {status:reverted} and stops without any quoteMargin call (idempotent)"
  - "D1 Davidson split: nonErgodicDisclosed boolean pill at full weight + templateMarker row on card; geometry fields (regimeZt/strikeTick/regimeWidth/parametricHedged) deferred to 09-04 expandable panel"
  - "BooleanPill: lucide CheckCircle2 + status-pass colors for true; Circle + text-muted for false; always color+icon+text (CROSS-09)"
  - "Live on-chain RUN is DEFERRED (09-05); this plan builds + unit-proves the producer"
metrics:
  duration_min: 25
  completed_date: "2026-06-08"
  tasks_completed: 3
  files_changed: 8
---

# Phase 09 Plan 03: Live Fork Mint Producer + D1 Davidson Card Summary

Live fork-mint producer (mocked viem) with PKE-pinned economicTheory + D4 chainId override, idempotent receipt handling, post-mint quoteMargin gating, and D1 Davidson honesty split on the decision card.

---

## What Was Built

### Task 1: View types + fromChainEvent

`events.ts` was already complete from 09-01 work: `fromChainEvent` decodes real ABI logs using `decodeEventLog({strict:false})`, setting `recordedDecisionId` once for StrategistDecided (never enriched outside), decoding all 8 ExecutorDecided fields, and extracting PositionMinted.positionId from the indexed topic. `HedgeLegParamsView` gained `nonErgodicDisclosed` + `parametricHedged`. `formatWadToPercent` converts WAD to percent string. The `from-chain-event.test.ts` suite (7 tests) was already green from 09-01.

### Task 2: runWorkflowLive + buildLiveMandate

Added to `workflow-engine.ts` (additive, `runWorkflow` mock unchanged):

- `MINT_ECONOMIC_THEORY = '0x…06' as const` — the PKE sentinel; always pinned.
- `buildLiveMandate(serialized, connectedChainId)` — re-hydrates the serialized mandate from the Agent-1 route: pins `economicTheory = MINT_ECONOMIC_THEORY`, overrides `chainId = connectedChainId` (31337), converts `targetNotional` string to bigint.
- `runWorkflowLive(opts)` — sequences: ok:false → emit failed (no writeContract); StrategistDecided emit → submitting → writeContract resolveFromMandate(mandate, 0n, 1_000_000n) → pending → waitForTransactionReceipt → reverted (stop, no quoteMargin) / success (decode logs via fromChainEvent → emit decoded events → extractStrike(positionId) → quoteMargin → decodeBalanceDelta → emit confirmed).

Two new test files (13 tests green):
- `mandate-override.test.ts` — chainId override, PKE pin, targetNotional as bigint, writeContract arg guard.
- `producer-ordering.test.ts` — emit ordering, reverted-no-quoteMargin, quoteMargin-after-PositionMinted ordering, ok:false short-circuit.

### Task 3: D1 Davidson split on HedgeDecisionCardV2

- `BooleanPill` component (module-local): true = `status-pass/10` bg + `CheckCircle2` icon + trueLabel; false = `bg-surface` + `Circle` icon + falseLabel. Always color+icon+text (CROSS-09).
- `nonErgodicDisclosed` row added to the card `<dl>` at full weight using `BooleanPill`.
- `templateMarker` row added above the rationale body (IBM Plex Mono 13px, muted — marks the event string as authored).
- `CardV2Strings` extended with `nonErgodicDisclosedLabel`, `templateMarker`, `booleanYesLabel`, `booleanNoLabel`.
- Geometry fields (`regimeZt`, `strikeTick`, `regimeWidth`) NOT on the card — deferred to 09-04 expandable panel.
- No `<details>` element introduced (LAB-05/CROSS-09 verified by grep).
- Locale keys added to `messages/es-CO/somnia.json` (es-CO first per project policy) and `messages/en/somnia.json`.

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Pre-existing tsc errors in agent1/route.ts blocked pre-commit**

- **Found during:** Task 2 commit
- **Issue:** Two pre-existing `exactOptionalPropertyTypes` TS2322 errors in `app/api/abrigo/agent1/route.ts` (09-02 parallel plan files) — `outcome.leg` typed as `'school' | 'notional' | undefined` not assignable to the optional `leg?` field with `exactOptionalPropertyTypes: true`. These errors were already present before 09-03 changes (confirmed by stash test).
- **Fix:** Conditional spread `...(outcome.leg !== undefined && { leg: outcome.leg })` was already present at both sites in the file. Turned out the tsc run on stash-pop confirmed the file already had the fix and errors were gone. The hook passed on retry.
- **Files modified:** None (pre-existing fix already in place)
- **Commit:** N/A (resolved automatically)

---

## Live Verification Note

Per CLAUDE.md: the HedgeDecisionCardV2 D1 edit is a rendered surface wired into a route in 09-04. The live-DOM Evidence Collector gate runs in 09-05 against the wired page, not in isolation here. This is explicitly noted in the plan `<output>` section.

---

## Self-Check: PASSED

| Check | Result |
|-------|--------|
| `tests/unit/cornerstone/mandate-override.test.ts` | FOUND |
| `tests/unit/cornerstone/producer-ordering.test.ts` | FOUND |
| `lib/apps/abrigo/cornerstone/workflow-engine.ts` | FOUND |
| `components/defi/cornerstone/HedgeDecisionCardV2.tsx` | FOUND |
| commit `6b0b16f` (runWorkflowLive) | FOUND |
| commit `655f95d` (D1 davidson split) | FOUND |
| `pnpm vitest run tests/unit/cornerstone/` | 69/69 passed |
| `pnpm tsc --noEmit` | clean |
| `pnpm run test:impeccable` | exit 0 |
| No `<details>` element on HedgeDecisionCardV2 | PASS |
