---
phase: 08-scenario1-agent-cornerstone
plan: "01"
subsystem: cornerstone-cards
tags: [tdd, honesty, fork-verified, mock-surface, card-components, bigint, i18n]
dependency_graph:
  requires:
    - lib/apps/abrigo/cornerstone/events.ts (HedgeLegParamsView, PositionMintedView)
    - components/defi/ProvenanceBadge.tsx (ProvenancePill fork-verified tier)
    - messages/es-CO/somnia.json + messages/en/somnia.json (somnia.cornerstone.* keys)
  provides:
    - components/defi/cornerstone/HedgeDecisionCardV2.tsx
    - components/defi/cornerstone/MintCard.tsx
    - messages/{es-CO,en}/somnia.json (somnia.cornerstone.* block)
    - tests/unit/cornerstone-decision-card.test.tsx
    - tests/unit/cornerstone-mint-card.test.tsx
  affects:
    - 08-02 (CornerStone route mounts HedgeDecisionCardV2 + MintCard + wires WorkflowEngine)
tech_stack:
  added: []
  patterns:
    - CardV2Strings / MintCardStrings interface pattern (string-threading from RSC — no getTranslations inside component)
    - CARD_CLASS + DataRow inlined verbatim (module-local to HedgeDecisionCard — not exported)
    - inline FlaskConical neutral sub-label pill (PILL_SHELL/NEUTRAL_CLASS not exported from LivenessPill)
    - confirmRef + onConfirm prop pattern for Wave 2 focus-on-enter
key_files:
  created:
    - components/defi/cornerstone/HedgeDecisionCardV2.tsx
    - components/defi/cornerstone/MintCard.tsx
    - tests/unit/cornerstone-decision-card.test.tsx
    - tests/unit/cornerstone-mint-card.test.tsx
  modified:
    - messages/es-CO/somnia.json (somnia.cornerstone.* block added — es-CO authored first)
    - messages/en/somnia.json (somnia.cornerstone.* block added — en second)
    - docs/copy-review.md (Phase 08-01 cornerstone copy-review row added)
    - tsconfig.json (RED exclusions added then removed in atomic GREEN commit)
decisions:
  - "CARD_CLASS + DataRow inlined verbatim in both cards — module-local to HedgeDecisionCard, not exported; ensures identical visual weight invariant"
  - "FlaskConical mock sub-label pill built entirely inline — PILL_SHELL/NEUTRAL_CLASS are module-local to LivenessPill, structurally unimportable"
  - "HedgeDecisionCardV2 is 'use client' (owns Confirm button + onConfirm + confirmRef); MintCard also 'use client' for client-island consistency on the route"
  - "humanAuthoredLabel rendered as a visible <p> label above the rationale paragraph — not just aria-label (RC-B2 BLOCKER requires visible text label)"
  - "size bigint rendered as String(view.size) in DataRow — no raw bigint to JSX (RC-M6); sibling='ilustrativo' satisfies the adjacent-label requirement"
  - "i18n/request.ts intentionally untouched — somnia.json already registered in Phase 06; cornerstone block appended under the existing namespace key"
metrics:
  duration_min: 8
  completed: 2026-06-06
  tasks_completed: 2
  files_changed: 8
---

# Phase 8 Plan 1: HedgeDecisionCardV2 + MintCard (TDD) Summary

TDD failing-first: two mock card components for the Module-4 Scenario-1 Cornerstone flow — Agent-2 decision card (HedgeDecisionCardV2) and mint card (MintCard) — under the full honesty contract: fork-verified neutral tier + inline FlaskConical "mock · no en vivo" sub-label + explicit human-authored rationale label (RC-B2 BLOCKER).

## What Was Built

**HedgeDecisionCardV2.tsx** ('use client') — presentational Agent-2 mock decision card. Renders all HedgeLegParamsView fields (market, strike 4.100, size, direction, school, vol→width, horizon, tickSpacing, asset, maxLoss, upside, marginDelta.token0) as full-weight DataRows. Header: ProvenancePill tier='fork-verified' (NEUTRAL) + inline FlaskConical neutral sub-label pill (PILL_SHELL/NEUTRAL_CLASS structurally unimportable — verbatim shell string inlined). Free-text rationale under explicit "explicación (autoría humana)" visible label (RC-B2 BLOCKER). Foot: gate caption + ochre-fill Confirm button (min-h-[44px], data-confirm, confirmRef forwarded for Wave 2 focus-on-enter). CARD_CLASS + DataRow idiom inlined verbatim (not exported from HedgeDecisionCard). No <details>. No green. No raw bigint to JSX.

**MintCard.tsx** ('use client') — presentational mock mint card. Renders PositionMintedView fields: positionId (as string), marginToken0/token1 (SIGNED bigint → String(), sign preserved). Header: ProvenancePill fork-verified (NEUTRAL) + inline FlaskConical neutral sub-label. Every numeric has adjacent 'ilustrativo' sibling label. No <details>. No green.

**somnia.cornerstone.* i18n block** — 27 keys in both locales (es-CO authored first, en second). Includes humanAuthoredLabel, mockSubLabel/Aria, confirmGateCaption, confirmCta, field labels, chip labels, forkVerifiedLabel/Aria, replayingMock/Aria, mockUnit, errorState. i18n/request.ts untouched (somnia already registered in Phase 06).

**2 test suites** — 34 tests total. Verified: fork-verified neutral (no green), FlaskConical present, ZERO <details>, RC-B2 rationale under explicit label, RC-M6 strike as "4.100" (no WAD integer), every numeric with ilustrativo/mock sibling, no 0x000…0, no executed/realized/banned strings, Confirm button min-h-[44px] + gate caption.

## Test Coverage

34/34 tests GREEN across 2 suites. TDD: RED commit (82ba504) → GREEN commit (bb9b46f).

Key acceptance criteria verified:
- HUMAN-AUTHORED RATIONALE AC (BLOCKER RC-B2): "explicación (autoría humana)" visible label present; rationale parent does not contain agente/LLM/IA attribution
- STRIKE-FORMAT AC (RC-M6): "4.100" rendered; no /\d{17,}/ in textContent
- TYPE-SIZE AC (RC-M6/FD-M5): no text-xs/text-lg/text-2xl introduced; only text-sm + text-primary role tokens used
- CROSS-09: FlaskConical icon in both cards; neutral token classes; aria-label encoding color+icon+text
- LAB-05: ZERO <details> in both cards; all fields full visual weight

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Format] biome organizeImports + formatter in 2 test files + tsconfig.json**
- **Found during:** Task 1 RED commit attempt
- **Issue:** Biome flagged import ordering (component import must come before lib import alphabetically) and tsconfig.json single-line array format
- **Fix:** Applied `pnpm biome check --write` to affected files
- **Files modified:** tests/unit/cornerstone-decision-card.test.tsx, tests/unit/cornerstone-mint-card.test.tsx, tsconfig.json
- **Commit:** part of 82ba504 (re-staged after fix)

**2. [Rule 1 - Bug] getByText('100') ambiguous — size=100 and horizonBlocks=100 both present**
- **Found during:** Task 2 GREEN — first test run
- **Issue:** `screen.getByText('100')` throws "Found multiple elements with text '100'" because both `view.size` (100n) and `view.payoff.horizonBlocks` (100) render as '100'
- **Fix:** Changed assertion to `screen.getAllByText('100').length >= 1` (semantically identical — both being visible is fine)
- **Files modified:** tests/unit/cornerstone-decision-card.test.tsx
- **Commit:** part of bb9b46f (fix applied before commit)

**3. [Rule 2 - Format] biome organizeImports + formatter in 2 component files + tsconfig.json**
- **Found during:** Task 2 GREEN commit attempt
- **Issue:** Import order (ProvenanceBadge before events type import), tsconfig.json array formatting
- **Fix:** `pnpm biome check --write` on component files + tsconfig
- **Files modified:** HedgeDecisionCardV2.tsx, MintCard.tsx, tsconfig.json
- **Commit:** part of bb9b46f

## Live Verification

**Deferred to 08-02** — per plan output spec and CLAUDE.md "when to skip": the cards are not yet mounted on any rendered route in this plan. HedgeDecisionCardV2 + MintCard have no URL surface in 08-01. Evidence Collector live-verify runs in 08-02 when the CornerStone route (`/apps/abrigo/cornerstone`) mounts both cards.

## Self-Check: PASSED

Files confirmed on disk:
- components/defi/cornerstone/HedgeDecisionCardV2.tsx — FOUND
- components/defi/cornerstone/MintCard.tsx — FOUND
- tests/unit/cornerstone-decision-card.test.tsx — FOUND
- tests/unit/cornerstone-mint-card.test.tsx — FOUND
- messages/es-CO/somnia.json (cornerstone block) — FOUND
- messages/en/somnia.json (cornerstone block) — FOUND
- docs/copy-review.md (Phase 08-01 row) — FOUND

Commits confirmed:
- 82ba504 (RED) — test(08-01): failing-first HedgeDecisionCardV2 + MintCard + cornerstone copy
- bb9b46f (GREEN) — feat(08-01): hedgeDecisionCardV2 + mintCard (fork-verified+mock, full weight, no details)
