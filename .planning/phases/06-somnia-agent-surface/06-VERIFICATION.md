---
phase: 06-somnia-agent-surface
verified: 2026-06-02T21:00:09Z
status: passed
score: 4/4 success criteria verified
re_verification: false
human_verification:
  - test: "Navigate to /apps/abrigo/agent in a browser and confirm the CPI value renders as 5.68%, the MacroReceived history card appears with the testnet-agent pill (Archive icon, neutral muted token), and the HedgeDecisionFeed shows two cards (ADD_LONG_GAMMA and REDUCE) at visually identical weight."
    expected: "Two cards at equal visual weight; consensus row shows 'suministrado por el operador — no por el mercado'; surprise gated inside the operator-caveat subtree; no green token on any pill."
    why_human: "Equal visual weight and token color require browser rendering; CSS custom properties (text-text-muted etc.) cannot be verified from source alone."
  - test: "Navigate to the cCOP/USD simulated instrument page (/apps/abrigo/instruments/ccop-usd-long-gamma/<chainId>) and confirm the HedgeDecisionBridge card renders with the illustrative delta marker visible (not aria-only)."
    expected: "Bridge card shows '68%' with '(ilustrativo — posición simulada)' visible in the rendered DOM; SIMULADO badge above the fold; no fabricated dollar notional."
    why_human: "Visual presence of the illustrative marker and SIMULADO badge above-the-fold position require viewport rendering."
---

# Phase 6: Somnia Agent Surface Verification Report

**Phase Goal:** A visitor or agent can see the live Somnia-testnet macro-hedge agent in the d2p frontend — the latest CPI macro print, the stream of consensus(operator-supplied) → surprise → action hedge decisions, a bridge tying a decision to the module-1 cCOP/USD instrument, and agent-first MCP tools — all under a testnet-agent provenance tier, reading an ALREADY-DEPLOYED contract (no new deploy), with no fabricated data.

**Verified:** 2026-06-02T21:00:09Z
**Status:** PASSED (2 human verifications remain — visual rendering only)
**Re-verification:** No — initial verification

---

## Goal Achievement

### Success Criteria Verdicts

| # | Criterion | Status | Evidence |
|---|-----------|--------|---------|
| SC-1 | /apps/abrigo/agent shows CPI 5.68% + MacroReceived history, testnet-agent pill, capacity-utilization absent, null→em-dash, data via snapshot | MET | `agent/page.tsx` mounts MacroDataPanel + HedgeDecisionFeed; `MacroDataPanel.tsx` renders `print-timestamp` unconditionally as `'—'` (line 147); `snapshot.json` has `scaledValue:"568"` → `5.68%` (Intl confirmed); no capacity-utilization key anywhere in messages or components |
| SC-2 | Equal-weight cards with print→operator-supplied consensus→surprise→action+sizeBps; consensus labeled operator-supplied; surprise gated | MET | `HedgeDecisionCard.tsx`: single `CARD_CLASS` string for all actions (line 109); `consensusCaveat` visible text adjacent to consensus row (line 171); `computeSurprise` only called inside card, same subtree as caveat (line 116); all four action icon strings in equal shell |
| SC-3 | Bridge on module-1 cCOP/USD simulated page: surprise→ADD_LONG_GAMMA@sizeBps→ILLUSTRATIVE delta, kind==='simulated' branch only | MET | `page.tsx` line 82: `if (instrument.kind === 'simulated')` early-return with bridge at line 269; live path (line 317+) has no bridge import; `HedgeDecisionBridge.tsx` calls `decisionToPositionDelta` which returns `schematic: true`; `illustrativeMarker` from copy renders as visible text (line 196-198) |
| SC-4 | MCP tools return single ZodObject with BOTH content[text]+structuredContent; consensus labeled operator-supplied; bigint as string; no fabricated numerics | MET | `HedgeDecisionsEnvelope` and `LatestMacroPrintEnvelope` are `z.object(...)` (not union/array); both tools return `{ content: [{ type: 'text', text: JSON.stringify(result) }], structuredContent: result }`; `sizeBps: String(d.sizeBps)` serialization; `consensusNote` field carries caveat |

**Score: 4/4 success criteria verified**

---

### Honesty Invariants

| Invariant | Verdict | Evidence |
|-----------|---------|---------|
| No green provenance token | MET | `ProvenanceBadge.tsx` line 46: testnet-agent TIER_CONFIG uses `text-text-muted ring-border-default bg-bg-surface` — same neutral token as schematic; comment at line 43 explicitly forbids green/emerald/status-pass |
| consensus = operator-supplied (grep 0 in components + copy + MCP tools) | MET | Full grep across `components/defi/somnia/`, `messages/`, `lib/mcp-tools/` for `market consensus`, `validator consensus`, `consensus-verified` returns 0 matches outside of negated contexts (`not market`, `NOT market`, `//` comments) |
| CPI-only (capacity-utilization NOT wired) | MET | Zero hits for `capacity-utilization` or `capacity_utilization` across components, messages, and agent page |
| Snapshot from real tx hashes (captureMethod: rpc, decisionId 4083729/4083997) | MET | `snapshot.json`: `captureMethod:"rpc"`, decisionId `"4083729"` with tx `0x2a8ec994...`, decisionId `"4083997"` with tx `0x5057f803...`; macro received has real tx `0x89d7a298...`; only `macro.latest.sourceTxHash` is null (expected for a contract view-read, not an event) |
| Somnia chain 50312 is SEPARATE defineChain/client; SupportedChainId NOT widened | MET | `chain.ts`: `defineChain({id:50312,...})` + `createPublicClient({chain:somniaTestnet})`; `instruments.ts` `SupportedChainId` union contains only celo/mainnet/base/arbitrum/optimism; zero hits for 50312 in `lib/wagmi/config.ts` |
| Static `import x from './snapshot.json'` + BigInt/Date rehydration; surprise in BigInt | MET | `reader.ts` line 12: `import snapshotData from './snapshot.json'`; `rehydrateDecision` calls `BigInt(raw.sizeBps)`, `BigInt(raw.macroValue)`, `BigInt(raw.consensus)`, `new Date(decidedAtNum * 1000)`; `surprise.ts` operates purely on `bigint` operands |
| SOMNIA_LIVE: server-side (NOT NEXT_PUBLIC_), lazy inside function bodies, out of default CI | MET | `lib/env.ts` line 16: `SOMNIA_LIVE: z.coerce.boolean().optional()` in `server:` block, NOT in `client:`; `reader.ts` lines 139/159/190: all reads inside function bodies, never at module scope; no `NEXT_PUBLIC_SOMNIA` anywhere in codebase; all 7 Somnia unit tests pass with `SOMNIA_LIVE` unset |

---

### Required Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `lib/apps/abrigo/somnia/deployments.json` | VERIFIED | Contains `"macroHedgeStrategist": "0xfA428171E1F5B56f92C67C002De1d8e90B053EE1"`, `chainId: 50312`, `llmAgentId`, `keeperProxy` |
| `lib/apps/abrigo/somnia/snapshot.json` | VERIFIED | `captureMethod: "rpc"`, two real decisions with on-chain tx hashes, `scaledValue:"568"` for CPI |
| `lib/apps/abrigo/somnia/reader.ts` | VERIFIED | Exports `getHedgeDecisions`, `getLatestMacroPrint`, `getMacroHistory`, `getSnapshotProvenance`; static import; BigInt/Date rehydration; lazy SOMNIA_LIVE |
| `lib/apps/abrigo/somnia/chain.ts` | VERIFIED | `defineChain` + `createPublicClient` for Somnia 50312; no import into wagmi config |
| `lib/apps/abrigo/somnia/surprise.ts` | VERIFIED | `computeSurprise(m,c): bigint = m - c`; `formatSurprise` formats at edge; no Number coercion before subtraction |
| `components/defi/ProvenanceBadge.tsx` | VERIFIED | `testnet-agent` in `ProvenanceTier` union; `TIER_CONFIG['testnet-agent']` uses neutral `text-text-muted` token; icon swaps to `Radio`/`Archive` by subState, not color |
| `components/defi/somnia/MacroDataPanel.tsx` | VERIFIED | 209 lines; calls `getLatestMacroPrint()` + `getMacroHistory()` + `getSnapshotProvenance()`; testnet-agent ProvenancePill with `subState={provenance.subState}`; B3 unconditional em-dash at line 147 |
| `app/(defi)/apps/abrigo/agent/page.tsx` | VERIFIED | RSC; mounts `MacroDataPanel` + `HedgeDecisionFeed`; `getTranslations('somnia')` for all copy; `force-dynamic` + `nodejs` runtime |
| `messages/es-CO/somnia.json` | VERIFIED | Contains `co/inflation-rate` key label; all panel/feed/bridge namespaces; `emptyState: "—"` |
| `messages/en/somnia.json` | VERIFIED | English counterpart with all required keys |
| `components/defi/somnia/HedgeDecisionCard.tsx` | VERIFIED | 197 lines; single `CARD_CLASS` for all actions; `computeSurprise` in BigInt; operator caveat visible text adjacent to consensus; `pendingLabel` + em-dash for pending state |
| `components/defi/somnia/HedgeDecisionFeed.tsx` | VERIFIED | 65 lines; calls `getHedgeDecisions(dataKey)`, maps to `HedgeDecisionCard` with identical props shell |
| `lib/mcp-tools/get-hedge-decisions.ts` | VERIFIED | `registerGetHedgeDecisions`; `HedgeDecisionsEnvelope` ZodObject output; dual return; `consensusNote` = `CONSENSUS_NOTE` constant; bigint as string |
| `lib/mcp-tools/get-latest-macro-print.ts` | VERIFIED | `registerGetLatestMacroPrint`; `LatestMacroPrintEnvelope` ZodObject output; dual return; capacity-utilization never fabricated |
| `lib/mcp-tools/contract.ts` | VERIFIED | `HedgeDecisionsEnvelope` and `LatestMacroPrintEnvelope` declared as wrapping ZodObjects; `HedgeDecisionItem` with `consensusNote` field |
| `lib/apps/abrigo/somnia/bridge.ts` | VERIFIED | `decisionToPositionDelta` returns `PositionDeltaView` with `schematic: true`; `fractionOfMaxBps = (sizeBps * 10000n) / MAX_SIZE_BPS`; no Number coercion pre-division |
| `components/defi/somnia/HedgeDecisionBridge.tsx` | VERIFIED | 225 lines; imports `getHedgeDecisions`, `decisionToPositionDelta`, `computeSurprise`, `formatSurprise`; `ProvenancePill tier="testnet-agent" subState="recorded"`; `illustrativeMarker` as visible text; em-dash for null/empty state |
| `app/(defi)/apps/abrigo/instruments/[id]/[chain]/page.tsx` | VERIFIED | `HedgeDecisionBridge` mounted inside `if (instrument.kind === 'simulated')` at line 269; live path (after line 317) has zero bridge references |

---

### Key Link Verification

| From | To | Via | Status | Evidence |
|------|----|-----|--------|---------|
| `reader.ts` | `snapshot.json` | `import snapshotData from './snapshot.json'` | WIRED | reader.ts line 12 |
| `reader.ts` | `process.env.SOMNIA_LIVE` | lazy inside function bodies | WIRED | reader.ts lines 139, 159, 190 |
| `MacroDataPanel.tsx` | `reader.ts` | `getLatestMacroPrint` + `getMacroHistory` | WIRED | MacroDataPanel.tsx lines 19-22, 78-80 |
| `MacroDataPanel.tsx` | `ProvenanceBadge.tsx` | `ProvenancePill tier="testnet-agent" subState={provenance.subState}` | WIRED | MacroDataPanel.tsx lines 16, 96-103, 189-195 |
| `HedgeDecisionFeed.tsx` | `reader.ts` | `getHedgeDecisions` | WIRED | HedgeDecisionFeed.tsx line 14, 29 |
| `HedgeDecisionCard.tsx` | `surprise.ts` | `computeSurprise` + `formatSurprise` | WIRED | HedgeDecisionCard.tsx lines 19, 116-117 |
| `get-hedge-decisions.ts` | `reader.ts` | `getHedgeDecisions` | WIRED | get-hedge-decisions.ts line 14, 43 |
| `app/api/mcp/[transport]/route.ts` | `get-hedge-decisions.ts` | `registerGetHedgeDecisions(server)` | WIRED | route.ts lines 12-16, 31-32 |
| `app/api/mcp/[transport]/route.ts` | `get-latest-macro-print.ts` | `registerGetLatestMacroPrint(server)` | WIRED | route.ts lines 12-16, 31-32 |
| `HedgeDecisionBridge.tsx` | `reader.ts` | `getHedgeDecisions` | WIRED | HedgeDecisionBridge.tsx lines 25, 97 |
| `HedgeDecisionBridge.tsx` | `bridge.ts` | `decisionToPositionDelta` | WIRED | HedgeDecisionBridge.tsx lines 24, 204 |
| `instruments/[id]/[chain]/page.tsx` | `HedgeDecisionBridge.tsx` | inside `kind==='simulated'` branch only | WIRED | page.tsx lines 28-29, 82, 269 |

---

### Requirements Coverage

| Requirement | Source Plan(s) | Status | Evidence |
|-------------|----------------|--------|---------|
| SOMNIA-00 (Wave-0 data layer) | 06-00 | SATISFIED | deployments.json, snapshot.json, chain.ts, reader.ts, surprise.ts, types.ts, abi.ts, ProvenanceBadge testnet-agent tier — all present and substantive |
| SOMNIA-D (live CPI panel) | 06-01 | SATISFIED | MacroDataPanel.tsx mounts on /apps/abrigo/agent; CPI 5.68% via snapshot; testnet-agent pill; em-dash for print timestamp; capacity-utilization absent |
| SOMNIA-A (hedge-decision feed) | 06-02 | SATISFIED | HedgeDecisionFeed + HedgeDecisionCard with equal-weight CARD_CLASS; operator-supplied caveat; surprise gated; all 4 actions in equal shell |
| SOMNIA-C (agent-first MCP tools) | 06-03 | SATISFIED | get_hedge_decisions + get_latest_macro_print registered on MCP route; ZodObject envelopes; dual return; operator-supplied note; bigint as string |
| SOMNIA-B (bridge) | 06-04 | SATISFIED | HedgeDecisionBridge in simulated branch; decisionToPositionDelta with schematic:true; illustrativeMarker visible text; testnet-agent pill |
| CROSS-09 | 06-00/01/02/03/04 | SATISFIED | ProvenancePill always color+icon+text+aria-label; neutral testnet-agent token; equal CARD_CLASS for all actions; em-dash never 0 |
| AGENT-01 / AGENT-02 | 06-03 | SATISFIED | lib/mcp-tools barrel exports registerGetHedgeDecisions + registerGetLatestMacroPrint; both registered in /api/mcp/[transport]/route.ts |
| DEFI-08 | 06-04 | SATISFIED | Bridge mounts ONLY in kind==='simulated' branch; live path (aggregateAllChains) has no bridge; simulated entry never reaches multicall |
| CROSS-01 / CROSS-10 | 06-01/02/03/04 | SATISFIED | es-CO-first authored copy in docs/copy-review.md with native reviewer sign-off (Juan Serrano 2026-06-02); no machine translation; anti-fishing discipline maintained |

Note: SOMNIA-* IDs were introduced in this phase's planning (ROADMAP.md §Phase 6 note). They are not registered in REQUIREMENTS.md's coverage table, but each plan's `requirements:` frontmatter carries them, and they are fully delivered as verified above.

---

### Test Suite Results

**Full suite:** 49 test files, 359 tests — ALL PASSED (0 failures)

**Somnia-specific tests (7 files, 78 tests):**

| Test file | Tests | Status |
|-----------|-------|--------|
| `somnia-reader.test.ts` | 8 | ALL PASS |
| `somnia-surprise.test.ts` | 5 | ALL PASS |
| `somnia-provenance-testnet-agent.test.tsx` | varies | ALL PASS |
| `somnia-macro-panel.test.tsx` | varies | ALL PASS |
| `somnia-decision-feed.test.tsx` | varies | ALL PASS |
| `somnia-mcp-tools.test.ts` | 10 | ALL PASS |
| `somnia-bridge.test.tsx` | varies | ALL PASS |

`tests/api/somnia-mcp-conformance.test.ts` runs the REAL McpServer + InMemoryTransport round-trip — included in the 49-file pass.

**TypeScript:** `npx tsc --noEmit` exits 0 (clean).

**tsconfig.json exclude:** Only `tests/unit/structured-data.test.tsx` remains excluded; all 4 Somnia component stubs (`somnia-macro-panel`, `somnia-decision-feed`, `somnia-bridge`, `somnia-provenance-testnet-agent`) are active.

---

### Anti-Patterns Scan

Scanned: all 6 Somnia component/lib files.

| Pattern | Files Scanned | Hits | Severity |
|---------|--------------|------|----------|
| TODO/FIXME/PLACEHOLDER | All 6 | 0 | — |
| `return null` / `return {}` stub | All 6 | 0 | — |
| Empty handler `=> {}` | All 6 | 0 | — |
| Fabricated data (hardcoded non-snapshot numbers) | All 6 | 0 | — |

One informational note: `MacroDataPanel.tsx` contains a commented-out mount slot (`{/* MOUNT SLOT: <HedgeDecisionFeed ... /> */}`) that was superseded by the actual mounting in `agent/page.tsx`. The comment is a leftover planning artifact — not a stub, as the real mount exists in the page. No blocker.

---

### Human Verification Required

#### 1. CPI Panel Visual — /apps/abrigo/agent

**Test:** Navigate to https://www.d2pfinance.xyz/apps/abrigo/agent (or local `pnpm start` on port 3040).
**Expected:** CPI value renders as "5,68%" (es-CO) or "5.68%" (en); Archive icon + neutral muted color on the testnet-agent pill; print timestamp row shows "—"; MacroReceived history card appears; HedgeDecisionFeed below shows 2 cards at identical dimensions/typography; consensus row shows operator-supplied caveat.
**Why human:** CSS custom property resolution (`text-text-muted`, `ring-border-default`) and pixel-level equal-weight enforcement require browser rendering.

#### 2. Bridge Card Visual — /apps/abrigo/instruments/ccop-usd-long-gamma/\<chainId\>

**Test:** Navigate to the cCOP/USD simulated instrument detail page.
**Expected:** HedgeDecisionBridge card renders inside the page (not absent); "68%" fraction-of-max with "(ilustrativo — posición simulada)" visible as text (not aria-only); SIMULADO badge above the fold; no dollar notional; testnet-agent pill present.
**Why human:** Above-the-fold position and visibility of the `illustrativeMarker` span require viewport rendering.

---

### Gaps Summary

No gaps. All four success criteria are satisfied. All seven honesty invariants hold in code. The full test suite (359 tests) passes. TypeScript is clean. Two human browser checks remain to confirm rendering, but they are non-blocking standard visual checks, not indicators of missing or broken implementation.

---

_Verified: 2026-06-02T21:00:09Z_
_Verifier: Claude (gsd-verifier) — Sonnet 4.6_
