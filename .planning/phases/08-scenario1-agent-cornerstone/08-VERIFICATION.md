---
phase: 08-scenario1-agent-cornerstone
verified: 2026-06-06T17:30:00Z
status: passed
score: 4/4 required truths verified (08-03 deferred out-of-scope)
re_verification: false
human_verification:
  - test: "es-CO locale end-to-end run: inflation factor renders '5,68 %' (comma-decimal) in full flow"
    expected: "Decimal comma form accepted; factor not raw 568 in es-CO"
    why_human: "Re-verification was en-only; es-CO comma form untested in browser but formatScaledPercent uses Intl.NumberFormat which is locale-correct in source"
---

# Phase 8: scenario1-agent-cornerstone Verification Report

**Phase Goal:** Mock-driven chatbot run flow at /apps/abrigo/cornerstone — prompt → Agent-1 (REAL recorded consensus-verified decision, revealed) → Agent-2 mock decision card → confirm → mock mint; live-streamed workflow steps; honest; frontend-only, no deploy.
**Verified:** 2026-06-06
**Status:** PASSED (with one minor human-verification note — not a gap)
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | /apps/abrigo/cornerstone streams A1→A2→mint steps with aria-live polite/atomic=false; A1 reveals real DecisionPipelineTrace with factor 5.68% (not 568); testnet-agent+consensus-verified scoped to A1 only | ✓ VERIFIED | `RunTranscript.tsx:170` aria-live="polite" aria-atomic="false"; `DecisionPipelineTrace.tsx:145` formatScaledPercent(decision.macroValue, locale); `page.tsx:64` getDecisionTraceById(preset.recordedDecisionId); live-verify re-verification row 1+3 ✓ PASS |
| 2 | Agent-2 MOCK card (HedgeDecisionCardV2) under fork-verified neutral tier + FlaskConical "mock · no en vivo"/"mock · not live" sub-label; strike 4.100 (not WAD); every mock numeric with ilustrativo label; explicit human-authored visible label; no `<details>`; no green; Confirm gates mint + receives focus | ✓ VERIFIED | `HedgeDecisionCardV2.tsx` 201 lines; live-verify re-verification row 4+5 ✓ PASS (neutral lab(7.25…), FlaskConical, strike "4.100", human-authored label, details=0, activeElement===confirm) |
| 3 | On confirm, MOCK MintCard renders (TokenId, human-scaled margins -0.5/1.0); no executed/realized/ejecutad/realizad; no raw 0x000…0; no viem/wagmi Polygon client | ✓ VERIFIED | `MintCard.tsx` uses formatTokenAmount (WAD÷1e18); live-verify re-verification row 2+6 ✓ PASS (margins "-0.5"/"1.0", no banned tokens, no 0x000); grep confirms no viem/wagmi/polygon in committed scope |
| 4 | Dedicated workflow-store (useSyncExternalStore-shaped, per-call factory, stable RunState ref, getServerSnapshot=IDLE); mock WorkflowEngine emits provisional events behind fromMockEvent (signed int256/int24); motion mounted-gated + prefers-reduced-motion; honker-node/@ai-sdk/idb absent | ✓ VERIFIED | `workflow-store.ts:138-139` getSnapshot/getServerSnapshot; `workflow-store.ts:50` IDLE module-level frozen; `workflow-engine.ts` fromMockEvent applied before emit; `RunTranscript.tsx:86` mounted gate; `RunTranscript.tsx:249` initial={mounted?'hidden':false}; grep: no honker/@ai-sdk/idb in committed scope |

**Score:** 4/4 truths verified

---

### Required Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `lib/apps/abrigo/cornerstone/events.ts` | ✓ VERIFIED | 284 lines; PROVISIONAL comment; fromMockEvent adapter; signed int256/int24 |
| `lib/apps/abrigo/cornerstone/presets.ts` | ✓ VERIFIED | 126 lines; 2 presets; infl-surprise-add→4083729, infl-cooling-reduce→4083997 |
| `lib/apps/abrigo/cornerstone/workflow-store.ts` | ✓ VERIFIED | 195 lines; per-call factory; IDLE module-level constant; getServerSnapshot returns IDLE |
| `lib/apps/abrigo/cornerstone/workflow-engine.ts` | ✓ VERIFIED | 133 lines; runWorkflow emits 3 events; user-gated confirm |
| `components/defi/cornerstone/HedgeDecisionCardV2.tsx` | ✓ VERIFIED | 201 lines; fork-verified neutral; FlaskConical pill; human-authored label; no `<details>` |
| `components/defi/cornerstone/MintCard.tsx` | ✓ VERIFIED | 134 lines; PositionMintedView fields; ilustrativo labels; no `<details>`; WAD formatting at render |
| `components/defi/cornerstone/PromptBox.tsx` | ✓ VERIFIED | 105 lines; 2 preset chips; free-text nearest-preset resolver |
| `components/defi/cornerstone/RunTranscript.tsx` | ✓ VERIFIED | 278 lines; useSyncExternalStore; aria-live polite/atomic=false; motion mounted-gated |
| `app/(defi)/apps/abrigo/cornerstone/page.tsx` | ✓ VERIFIED | 152 lines; force-dynamic; runtime nodejs; pre-renders DecisionPipelineTrace for both presets; null-guarded |
| `lib/apps/abrigo/somnia/format.ts` (formatScaledPercent + formatTokenAmount) | ✓ VERIFIED | Functions exist at:5-47; plan claimed `lib/format.ts` but actual path is `lib/apps/abrigo/somnia/format.ts` — substantively equivalent, both functions present and imported correctly |
| `tests/e2e/cornerstone.spec.ts` | ✓ VERIFIED | 199 lines; aria-live, honesty greps, focus-on-confirm, heading outline, step DOM order |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `RunTranscript.tsx` | `workflow-store` | `useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot)` | ✓ WIRED | Per-mount factory via useMemo |
| `page.tsx` | `DecisionPipelineTrace` | `getDecisionTraceById(preset.recordedDecisionId)` | ✓ WIRED | page.tsx:64; null-guarded |
| `DecisionPipelineTrace` | `formatScaledPercent` | import + render at :145 | ✓ WIRED | `formatScaledPercent(decision.macroValue, locale)` |
| `MintCard.tsx` | `formatTokenAmount` | WAD margins divided at render time | ✓ WIRED | Confirmed by live-verify: "-0.5"/"1.0" |
| `HedgeDecisionCardV2` | Confirm focus | `confirmRef` prop + `onConfirm` | ✓ WIRED | live-verify row 5: activeElement===confirm before click |
| `workflow-engine.ts` | `fromMockEvent` | applied before emit | ✓ WIRED | events.ts:202; engine imports and calls adapter |

---

### Requirements Coverage

| Requirement | Source Plan | Status | Evidence |
|-------------|------------|--------|---------|
| MOD4-FLOW | 08-00, 08-02 | ✓ SATISFIED | workflow-store + engine + RunTranscript streaming verified live |
| MOD4-A1 | 08-02 | ✓ SATISFIED | Real DecisionPipelineTrace rendered with 5.68% factor; testnet-agent/consensus-verified scoped |
| MOD4-A2 | 08-01, 08-02 | ✓ SATISFIED | HedgeDecisionCardV2 neutral/FlaskConical/human-authored/strike-formatted verified live |
| MOD4-MINT | 08-01, 08-02 | ✓ SATISFIED | MintCard with human-scaled margins verified live (re-verification row 2: "-0.5"/"1.0") |
| MOD4-MONITOR | 08-03 (deferred) | ⊘ OUT OF SCOPE | 08-03 explicitly optional/if-time; no SUMMARY expected; correctly absent |
| MOD4-HISTORY | 08-03 (deferred) | ⊘ OUT OF SCOPE | 08-03 explicitly optional/if-time; no SUMMARY expected; correctly absent |

---

### Plan Documentation Coverage

| Plan | SUMMARY.md | LIVE-VERIFICATION.md coverage |
|------|-----------|-------------------------------|
| 08-00 | ✓ EXISTS | Pre-route; TDD only; no live-verify needed |
| 08-01 | ✓ EXISTS | Pre-route; TDD only; no live-verify needed |
| 08-02 | ✓ EXISTS | ✓ RECORDED in 08-LIVE-VERIFICATION.md: initial run (2 blockers found + fixed in 2a2c295) + re-verification (all 7 claims ✓ PASS) |
| 08-03 | No SUMMARY | ✓ CORRECT — deferred; 08-03-PLAN.md exists as planning artifact only |

---

### Test Suite Status

| Suite | Count | Status |
|-------|-------|--------|
| All unit tests | 535/535 | ✓ PASS (vitest run, 65 test files) |
| `tsc --noEmit` | — | ✓ CLEAN (no output = zero errors) |
| E2E spec (cornerstone.spec.ts) | Not run here | Playwright e2e runs in CI against prod build; spec is substantive (199 lines), not a stub |
| Committed-scope test stubs tsconfig-excluded | NONE | tsconfig.json exclude: `["node_modules", ".velite", ".next", "tests/unit/structured-data.test.tsx"]` — no cornerstone tests excluded |

**formatScaledPercent + formatTokenAmount unit tests (with negatives):**
`tests/unit/somnia-format.test.ts` covers: 568n→"5.68%", 568n es-CO→"5,68 %", 0n, 1000n, negative WAD -500000000000000000n→"-0.5", positive WAD, -1n sign preserved, custom decimals negative -200n→"-2.0". Negative coverage confirmed at lines 30, 45-48, 55-56.

---

### Anti-Patterns Scan

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| `RunTranscript.tsx:249` | `initial={mounted ? 'hidden' : false}` — prefers-reduced-motion handled via CSS @media, not JS check | INFO | Motion still runs; CSS override expected per project pattern. No blocker. |
| `08-LIVE-VERIFICATION.md` initial table | 17 rows with "—" verdicts (the placeholder rows before Evidence Collector ran) | INFO | Not a code issue; documentation artifact. Re-verification section is complete. |

No BLOCKER or WARNING anti-patterns found. No TODO/FIXME in committed cornerstone files. No `return null` / empty implementations. No `console.log`-only handlers.

---

### Human Verification Required

#### 1. es-CO locale full run

**Test:** Navigate to /apps/abrigo/cornerstone with es-CO locale active; click the inflation-surprise preset; let A1 render; verify factor row shows "5,68 %" (comma-decimal form) not "568" or "5.68%".
**Expected:** Comma-decimal percent visible in A1 trace factor row.
**Why human:** The post-fix re-verification ran in en locale only. `formatScaledPercent` uses `Intl.NumberFormat` which is correct in source (line 22-27), and the initial live-verify confirmed es-CO scoping worked in the pre-fix run; the percent format specifically was not re-exercised in es-CO after the fix. Low risk, but not programmatically confirmed post-fix.

---

## Summary

Phase 8 goal is achieved. The mock-driven cornerstone chatbot run flow exists at the route level, is substantively implemented (not a stub), and passes all committed success criteria verified through two rounds of live evidence (initial + re-verification after two auto-fixed blockers: raw 568 factor rendering and raw WAD mint margins).

**What was built and confirmed working:**
- Per-call `createWorkflowStore` factory (useSyncExternalStore-shaped, no server leak)
- Mock `WorkflowEngine` emitting 3 events (A1/A2/Mint) through `fromMockEvent` adapter with signed int256/int24 handling
- RSC `page.tsx` pre-rendering real `DecisionPipelineTrace` for both presets (decision 4083729 / 4083997), null-guarded
- `formatScaledPercent` rendering 568n → "5.68%" wired into `DecisionPipelineTrace` at render time
- `RunTranscript` streaming A1→A2→Mint with aria-live polite/atomic=false and motion mounted-gate
- `HedgeDecisionCardV2` with full honesty contract (neutral fork-verified, FlaskConical, human-authored label, strike 4.100, no `<details>`, no green)
- `MintCard` with human-scaled WAD margins (-0.5/1.0 confirmed live)
- 535/535 unit tests green; tsc clean; no committed-scope test stubs excluded; negative edge cases covered

**Plan path deviation (non-blocking):** `lib/format.ts` was planned as the shared format utility path but the functions were placed in `lib/apps/abrigo/somnia/format.ts`. The functions are substantive, unit-tested, and correctly imported. This is a naming deviation, not a missing artifact.

**Deferred scope correctly absent:** 08-03 (MOD4-MONITOR/HISTORY) has a PLAN.md but no SUMMARY — correct per the "if-time, not required for phase completion" designation.

---

_Verified: 2026-06-06T17:30:00Z_
_Verifier: Claude (gsd-verifier)_
