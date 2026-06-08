---
phase: 08-scenario1-agent-cornerstone
plan: "02"
subsystem: ui
tags: [motion, useSyncExternalStore, aria-live, workflow-store, e2e, DecisionPipelineTrace, MintCard, mock-honesty]

requires:
  - phase: 08-scenario1-agent-cornerstone
    provides: "08-00 workflow-store/engine/presets/events; 08-01 HedgeDecisionCardV2 + MintCard"
  - phase: 07-agent-reasoning-position-surface
    provides: "DecisionPipelineTrace 6-stage stepper + getDecisionTraceById + TraceStrings"

provides:
  - "RSC shell app/(defi)/apps/abrigo/cornerstone/page.tsx: force-dynamic, pre-renders DecisionPipelineTrace for both presets (null-guarded → errorState)"
  - "PromptBox client island: 2 equal-weight preset chips + free-text nearest-preset resolver + startRun"
  - "RunTranscript client island: useSyncExternalStore, aria-live polite/atomic=false, motion mounted-gate, A1→A2→mint append-only, inline replaying·mock neutral pill"
  - "shared lib/format.ts formatFactorValue helper: scaled-int → percent (÷100, 2-decimal)"
  - "e2e spec tests/e2e/cornerstone.spec.ts: DOM-order step streaming, honesty greps, focus-on-confirm, aria-live append-only, heading outline"
  - "motion dependency (motion/react import pin)"

affects:
  - 08-scenario1-agent-cornerstone (08-03 optional polish)
  - future scenario runs that reuse workflow-store pattern

tech-stack:
  added: ["motion (MIT, React-19-safe; pinned import motion/react)"]
  patterns:
    - "useSyncExternalStore with per-mount createWorkflowStore factory (no singleton)"
    - "RSC pre-renders trace children; client island receives as prop — avoids client-side getDecisionTraceById"
    - "mounted-gate for motion entrance: no non-idle content at SSR"
    - "inline neutral pill (CircleDashed + ring-1) for replaying·mock state — LivenessPill untouched (snapshot|polling only)"
    - "formatFactorValue shared util: (n/100).toFixed(2)+'%' applied at DecisionPipelineTrace locale prop"

key-files:
  created:
    - app/(defi)/apps/abrigo/cornerstone/page.tsx
    - components/defi/cornerstone/PromptBox.tsx
    - components/defi/cornerstone/RunTranscript.tsx
    - tests/e2e/cornerstone.spec.ts
    - lib/format.ts
  modified:
    - package.json (motion added)
    - components/defi/somnia/DecisionPipelineTrace.tsx (locale prop wired; factor rendered via formatFactorValue)
    - components/defi/cornerstone/MintCard.tsx (WAD margins formatted to human-scaled token amounts)
    - messages/es-CO/somnia.json (cornerstone.* keys present)
    - messages/en/somnia.json (cornerstone.* keys present)
    - .planning/phases/08-scenario1-agent-cornerstone/08-LIVE-VERIFICATION.md

key-decisions:
  - "formatFactorValue(n) = (n/100).toFixed(2)+'%' extracted to lib/format.ts; DecisionPipelineTrace locale prop threads it so 568 → 5.68% without touching the raw stored scaled-int"
  - "Mint WAD margins formatted at MintCard render time via Number(n)/1e18 display layer — raw WAD stays in the domain model"
  - "LivenessPill NOT edited; replaying·mock rendered as inline CircleDashed neutral pill in RunTranscript per FD-B1 hard-lock"
  - "createWorkflowStore called in useMemo (stable per-mount); store is NOT a module singleton (per 08-00 contract)"

patterns-established:
  - "per-mount workflow store via useMemo(createWorkflowStore, []) — safe for React StrictMode double-invoke"
  - "motion entrance gated on useMounted() flag — SSR idle content bypasses motion entirely"
  - "e2e honesty greps on rendered DOM (no executed/realized text, no green tier, no raw 0x addr, no $-digit realized PnL)"

requirements-completed: [MOD4-FLOW, MOD4-A1, MOD4-A2, MOD4-MINT]

duration: ~60min (task execution + post-checkpoint fix)
completed: 2026-06-06
---

# Phase 08 Plan 02: Cornerstone Route — RSC Shell + PromptBox + RunTranscript + Live-Verify Summary

**Full /apps/abrigo/cornerstone mock-run surface: RSC pre-renders real DecisionPipelineTrace (5.68% formatted, null-guarded), RunTranscript streams A1→A2→mint via useSyncExternalStore + motion mounted-gate + aria-live, inline replaying·mock pill, e2e honesty greps; post-checkpoint fix resolved raw 568 and WAD mint margins.**

## Performance

- **Duration:** ~60 min
- **Started:** 2026-06-06T~19:00Z
- **Completed:** 2026-06-06T~20:20Z
- **Tasks:** 2 (Task 1 auto-execution + Task 2 Evidence Collector live-verify checkpoint)
- **Files modified:** 10

## Accomplishments

- RSC shell page.tsx: force-dynamic/runtime nodejs, pre-renders DecisionPipelineTrace for both presets (infl-surprise-add/4083729 + infl-cooling-reduce/4083997), null-guard → cornerstone.errorState copy, generateMetadata, no 500 on missing trace
- RunTranscript: useSyncExternalStore (idle first paint), aria-live polite/atomic=false, motion mounted-gate + prefers-reduced-motion fallback, A1→A2→mint append-only steps, focus-to-Confirm on a2_decision entry, inline CircleDashed neutral pill for replaying·mock
- PromptBox: 2 equal-weight preset chips, free-text → resolveNearestPreset, startRun(presetId)
- e2e cornerstone.spec.ts: DOM-order streaming via data-step testids, focus-on-confirm (toBeFocused), aria-live byte-identical prior entries, honesty greps, heading axe walk, es-CO/en parity
- Post-checkpoint fix (2a2c295): shared lib/format.ts formatFactorValue (568 → 5.68%), DecisionPipelineTrace locale prop, MintCard WAD margins human-scaled (-0.5 / 1.0)

## Task Commits

1. **Task 1: motion dep + RSC shell + PromptBox + RunTranscript + e2e** - `bfa26f9` (feat)
2. **Post-checkpoint live-verify fix: A1 factor format + mint margins** - `2a2c295` (fix)
3. **Checkpoint stub commit** - `7b49e7f` (chore)

## Live Verification — 08-LIVE-VERIFICATION.md

Full verdicts recorded in `.planning/phases/08-scenario1-agent-cornerstone/08-LIVE-VERIFICATION.md`.

### Initial run (bfa26f9) — 8✓ / 2⚠ / 1✗

| # | Claim | Verdict |
|---|-------|---------|
| 1 | Idle: prompt + 2 equal chips, no transcript | ✓ PASS |
| 2 | Steps DOM-order a1→a2→mint | ✓ PASS |
| 3 | A1 factor 5.68% (not 568); consensus-verified + testnet-agent scoped to a1 only | ✗ FAIL (factor raw 568) / ✓ (scoping) |
| 4 | A2: fork-verified NEUTRAL, FlaskConical mock sub-label, human-authored label, no details | ⚠ PARTIAL (neutral confirmed; WAD margins in mint #6) |
| 5 | Confirm gate: focused before click, ≥44px CTA | ✓ PASS |
| 6 | Confirm → MintCard with TokenId + margins, no details | ⚠ PARTIAL (margins raw WAD ints) |
| 7 | aria-live polite/atomic=false, byte-identical append-only | ✓ PASS |
| 8 | Honesty: no banned tokens, no $-PnL, no 0x addr, fork tier not green | ✓ PASS |
| 9 | replaying·mock inline pill neutral, color+icon+text | ✓ PASS |
| 10 | Heading outline: h1→h2/h3, no skip | ✓ PASS |
| 11 | en-locale parity | ✓ PASS |

Issues flagged: (1) BLOCKER — raw 568 instead of 5.68%; (2) MAJOR — WAD mint margins; (3) MINOR — details in A1 system-prompt disclosure (CROSS-09 scoped to a2 card, so not a task fail, flagged for review).

### Re-verification (post-fix 2a2c295) — all 7 claims ✓ PASS

| # | Claim | Verdict |
|---|-------|---------|
| 1 | A1 factor 5.68% (not 568) | ✓ PASS |
| 2 | Mint margins human-scaled (-0.5 / 1.0) | ✓ PASS |
| 3 | testnet-agent + consensus-verified ONLY in a1 | ✓ PASS |
| 4 | A2 fork-verified NEUTRAL + FlaskConical + human label + no details | ✓ PASS |
| 5 | Confirm gate focused before click | ✓ PASS |
| 6 | Whole-DOM honesty post-run | ✓ PASS |
| 7 | Console: only known WalletConnect placeholder noise | ✓ PASS |

**Final verdict: all claims ✓ PASS. No regression observed.**

Screenshots (initial): /tmp/d2p-verify/08-02-idle.png, /tmp/d2p-verify/08-02-a1.png, /tmp/d2p-verify/08-02-a2-confirm.png, /tmp/d2p-verify/08-02-mint.png
Screenshots (re-verify): /tmp/d2p-verify/08-02-rev-a1.png, /tmp/d2p-verify/08-02-rev-a2.png, /tmp/d2p-verify/08-02-rev-mint.png

## Files Created/Modified

- `app/(defi)/apps/abrigo/cornerstone/page.tsx` — RSC shell, force-dynamic/nodejs, pre-renders traces, null-guard, generateMetadata
- `components/defi/cornerstone/PromptBox.tsx` — preset chips + free-text + startRun
- `components/defi/cornerstone/RunTranscript.tsx` — useSyncExternalStore, motion, aria-live, A1/A2/mint steps, focus management, inline replaying pill
- `tests/e2e/cornerstone.spec.ts` — DOM-order streaming, honesty greps, focus, heading outline, locale parity
- `lib/format.ts` — formatFactorValue: scaled-int percent formatter
- `components/defi/somnia/DecisionPipelineTrace.tsx` — locale prop threaded; factor rendered via formatFactorValue
- `components/defi/cornerstone/MintCard.tsx` — WAD margins human-scaled
- `package.json` — motion added
- `messages/es-CO/somnia.json` — cornerstone.* keys
- `messages/en/somnia.json` — cornerstone.* keys

## Decisions Made

- formatFactorValue extracted to lib/format.ts (not inlined) so future traces sharing scaled-int factor types get consistent display without per-component logic
- WAD margin formatting applied at MintCard render layer; raw domain model values preserved
- LivenessPill hard-locked to snapshot|polling per FD-B1 — replaying·mock rendered as a distinct inline pill pattern in RunTranscript, ensuring the shipped Phase-7 component is never modified

## Deviations from Plan

### Auto-fixed Issues (post-checkpoint)

**1. [Rule 1 - Bug] A1 factor rendered raw scaled-int 568 instead of formatted 5.68%**
- **Found during:** Task 2 Evidence Collector live-verify (initial run)
- **Issue:** DecisionPipelineTrace rendered the raw co/inflation-rate value (568) without dividing by 100. Plan claim: "inflation form 5.68%, NOT raw 568". Reproduced in both es-CO and en locales.
- **Fix:** Added formatFactorValue(n: number): string = `${(n / 100).toFixed(2)}%` to lib/format.ts; threaded as locale prop through DecisionPipelineTrace
- **Files modified:** lib/format.ts (created), components/defi/somnia/DecisionPipelineTrace.tsx
- **Committed in:** 2a2c295

**2. [Rule 1 - Bug] Mint margins rendered raw WAD integers**
- **Found during:** Task 2 Evidence Collector live-verify (initial run)
- **Issue:** MintCard displayed delta margins as -500000000000000000 / 1000000000000000000 (raw 1e18 WAD). Live-verify flagged as MAJOR — non-technical demo viewer sees raw on-chain ints.
- **Fix:** Human-scaled at MintCard render: Number(margin)/1e18 → -0.5 / 1.0
- **Files modified:** components/defi/cornerstone/MintCard.tsx
- **Committed in:** 2a2c295

---

**Total deviations:** 2 auto-fixed (both Rule 1 — bugs caught by Evidence Collector live-verify gate)
**Impact on plan:** Both fixes essential for plan honesty claims and demo readability. No scope creep.

## Issues Encountered

- details disclosure ("Ver prompt del sistema") inside A1 block flagged as MINOR (CROSS-09 concern). The no-details constraint in the plan is scoped to the a2 card (which is clean — confirmed 0 details elements). The A1 system-prompt disclosure is a different component surface. Flagged in 08-LIVE-VERIFICATION.md for review; not a task blocker.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- 08-02 committed MVP complete: all 4 requirements (MOD4-FLOW, MOD4-A1, MOD4-A2, MOD4-MINT) satisfied per live-verify
- 08-03 (optional polish: timing/pacing, reduced-motion visual refinement) is the remaining optional plan in phase 08
- Phase 08 phase-level verification run is the next step before marking the phase complete

---

## Self-Check

**Commits verified:**
- bfa26f9: feat(08-02) — confirmed in git log
- 2a2c295: fix(08-02) — confirmed in git log

**Key files verified:**
- app/(defi)/apps/abrigo/cornerstone/page.tsx — created in bfa26f9
- components/defi/cornerstone/RunTranscript.tsx — created in bfa26f9
- lib/format.ts — created in 2a2c295
- 08-LIVE-VERIFICATION.md — re-verification section appended (post-fix all ✓)

## Self-Check: PASSED

---
*Phase: 08-scenario1-agent-cornerstone*
*Completed: 2026-06-06*
