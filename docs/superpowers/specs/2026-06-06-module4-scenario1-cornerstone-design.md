# Module 4 — Scenario-1 Agentathon cornerstone (frontend Phase 8) — design

**Date:** 2026-06-06
**Status:** Draft for 2-way review (Reality Checker + Frontend Developer)
**Track:** designOS — feeds the 2-way review → register Phase 8 → `gsd:ui-phase` (→ `UI-SPEC.md`) → `gsd:plan-phase` → `gsd:execute-phase`.
**Scope:** Frontend-only, **mock-driven**. NO Solidity, NO deploy, NO wallet-to-live-chain. Deadline ≈ **June 11, 2026** (Encode × Somnia Agentathon). Overscoping is the #1 risk — the MVP cut (§7) is binding.
**Source:** `abrigo-somnia/docs/UI-AGENT-HANDOFF.md` + `DRAFT.md` + verified contract shapes (this session's exploration). Builds on Modules 2 (Phase 6, merged) and 3 (Phase 7, merged).

---

## §0 — Binding honesty corrections (authoritative; override any looser wording below)

1. **Nothing in this flow is callable on a live chain.** The executor (`MacroHedgeExecutor`) is a 34-line stub, the mint exists only in a Polygon fork test, and there is no Somnia→Polygon bridge. The entire UI is built against a **mock integration layer**; real wiring is backend Phase 15. NO wallet-connect-to-live-Polygon.
2. **Agent 1 is anchored on REAL data.** The two recorded, **consensus-verified** Somnia decisions (requestId `4083729` consensus 500 → ADD_LONG_GAMMA/sizeBps 6800; `4083997` consensus 900 → REDUCE/568) are real on-chain artifacts (already captured in `lib/apps/abrigo/somnia/snapshot.json`). The Agent-1 step replays one of these, labeled **"recorded run · consensus-verified on Somnia."** It is NOT a live inference of the user's specific text.
3. **Agent 2 / mint / monitor are MOCK.** They render under the neutral **`mock` / `fork-verified·not-live`** provenance tiers (reuse the Phase-7 `fork-verified` tier; add a `mock` sub-label where data is illustrative). Never imply a realized/executed/placed position. Mock numerics (strike 4.100, vol→width, margin) are labeled spec/mock; **no fabricated `$` PnL is presented as real.**
4. **No fabricated chain-of-thought.** The agent's LLM calls are `inferString(allowedValues=[HOLD,ADD_LONG_GAMMA,REDUCE,EXIT])` + `inferNumber(0..MAX_SIZE_BPS)` — an enum + a number, NOT free-text reasoning. The streamed "reasoning" shows the **real deterministic pipeline** (reading CPI `COCPIYOY` / policy-rate `CORRRMIN` / inflation-expectations / terms-of-trade `COTRBALM` → consensus → surprise → action → sizeBps). Any thesis narrative shown is a human-authored/templated **explanation**, labeled as such — never "the LLM wrote this."
5. **Reasoning collapses; the decision does not.** Each step shows a reasoning summary with an expand (progressive disclosure, like Phase-7 `SystemPromptDisclosure`). The **final decision (the disposition card) stays at full visual weight**, never hidden behind an expand (CROSS-09 / LAB-05).
6. **Prompt presets are labeled.** Curated example prompts map to the real recorded runs; free-text maps to the nearest preset. The UI never claims the user's exact text was inferred live.
7. Reuse Phase-1..7 invariants: es-CO-first copy (native sign-off in `docs/copy-review.md`); locked tokens (muted-ochre single accent, Plex Sans/Mono); `impeccable detect` + token tests; no `--no-verify`; static JSON import + BigInt/Date rehydration; Somnia 50312 a SEPARATE chain/client; live reads behind server flags, out of default CI.

---

## 1. Goal

A visitor (or judge) types a macro-view prompt and watches the **agent workflow run live, chatbot-style** — Agent 1's reasoning + decision (real, consensus-verified), Agent 2's pool-representativeness decision card (mock) which they **confirm**, then a **mint** (mock) and a **monitor** read — with each step streamed progressively (idle → reasoning → result), a reasoning summary that expands, the final decision printed, and the whole run **saved to a checkable history**. The cornerstone is the recordable demo screen for the Agentathon (judged hardest on autonomous-agent performance — which the real consensus-verified decision showcases).

## 2. Verified contract shapes (the mock emits these; the UI renders them)

**The 4 mock `WorkflowEvent`s** (intended contract; real ABI swaps in at Phase 15):
```ts
type WorkflowEvent =
  | { type:'StrategistDecided'; requestId:bigint; thesis:string; spec:HedgeLegParams }      // Agent 1
  | { type:'ExecutorDecided'; requestId:bigint; poolRepresentativenessRationale:string;
      positionId:bigint; strike:number; width:number; isLong:boolean }                       // Agent 2 (the card)
  | { type:'PositionMinted'; positionId:bigint; owner:`0x${string}`; marginToken0:bigint; marginToken1:bigint }
  | { type:'PerformanceUpdated'; positionId:bigint; mark:bigint; premiumAccrued:bigint; marginHealthBps:bigint; pnl:bigint }
```
**`HedgeLegParams`** (verbatim, `abrigo-somnia/contracts/src/types/HedgeLegParams.sol`): `{ PoolId underlyingMarket (opaque bytes32 passthrough); uint256 strikeWAD (1e18=1.0, demo 4.1e18); uint256 size; IMacroThesis economicTheory (addr(0); UI shows a human school label e.g. "Shiller macro-risk / post-Keynesian", NOT the address); uint32 chainId (137 Polygon); bool isLong; PayoffTerms payoffTerms }`. **`PayoffTerms`**: `{ uint88 vol (variance, demo 14400→120-tick σ); uint32 horizonBlocks (100); int24 tickSpacing (60); uint8 asset (0=token0 USDC); uint8 riskPartner }`. Mint card also shows the margin `BalanceDelta` (from `RiskManagement.quoteCollateralRequirements`). Reference Polygon addrs (display/context only, never called): wCOP/USDC pool fee 3000 / tickSpacing 60. The UI treats `underlyingMarket`/`economicTheory` as opaque pass-throughs and renders the human fields + the thesis text + the school label.

## 3. Information architecture

New dedicated route **`/apps/abrigo/cornerstone`** (the demo screen): prompt + preset chips → live run transcript → confirm → mint → monitor → run history. Modules 2 (`/apps/abrigo/agent`) and 3 (`/apps/abrigo/agent/[id]`) stay as-is and are cross-linked (the Agent-1 step links to the M3 detail for depth). The Agent-1 reasoning step **reuses the Phase-7 `DecisionPipelineTrace` component** rather than re-rendering.

## 4. Architecture / data flow

```
PromptBox (preset → recorded decision id)
   │  startRun(presetId)
   ▼
WorkflowEngine (MOCK producer)  ── emits WorkflowEvent[] progressively (timed/async-gen) ──▶
   │                                                                                          │
   │  (real-later: a Next-16 route handler ReadableStream text/event-stream + EventSource     │
   │   parses the SAME WorkflowEvent shape — swap the producer ONLY)                          │
   ▼                                                                                          ▼
LivenessSource/refresh() seam  ◀── client subscribes via useSyncExternalStore ──▶  RunState (useReducer)
                                                                                       │
   idle → a1_reasoning → a1_result → a2_reasoning → a2_decision → [confirm] → minting → monitoring → done
                                                                                       │
                                                                  idb: persist completed run → RunHistory
```
- **Producer is swappable** (mock now; native SSE at Phase 15) behind the existing seam — UI + reducer + history never change.
- **`RunState`** is a discriminated union driven by `useReducer`; events advance it. The `[confirm]` transition is user-gated (Agent-2 decision card → Confirm button).
- **History** = append completed runs `{prompt, presetId, streamed steps, finalDecision, ts}` to IndexedDB via `idb`; `RunHistory` lists + reopens them. Client-only (sidesteps Vercel ephemeral FS).

## 5. Components (reuse-heavy)
- `app/(defi)/apps/abrigo/cornerstone/page.tsx` — RSC shell; client islands for the interactive parts.
- `PromptBox` (client) — textarea + curated preset chips; `startRun`. es-CO-first copy.
- `RunTranscript` (client) — chatbot stream; reuses the Phase-7 stepper + `SystemPromptDisclosure` (summary/expand). `motion` for staggered entrance + height anim (CSS fallback).
- **Agent 1 step** — reuse `DecisionPipelineTrace` (real decision, `testnet-agent` tier, "recorded run · consensus-verified" label).
- `HedgeDecisionCardV2` (Agent 2) — renders `HedgeLegParams` (market label, strike, size, isLong, school label, vol→width, max-loss=premium, upside=unlimited) under the `mock`/`fork-verified·not-live` tier + a `Confirm` button (the differentiator: an agent decision, shown, then executed).
- `MintCard` — mock tx hash + position (`TokenId`, margin `BalanceDelta`, leg fields), labeled mock.
- `MonitorPanel` — basic read (mark/premium/marginHealthBps/pnl) from `PerformanceUpdated`; labeled mock; terminal event closes the stream.
- `LivenessPill` (reuse, Phase 7) — snapshot/replaying state; `RunHistory` (client, idb).
- `lib/apps/abrigo/cornerstone/{workflow-engine.ts (mock producer), run-state.ts (reducer + types), history.ts (idb), presets.ts (preset→recorded-decision map)}`.

## 6. Honesty / provenance model
| Surface | Tier | Real? |
|---|---|---|
| Agent-1 reasoning + decision | `testnet-agent` | REAL (recorded, consensus-verified) |
| Agent-2 decision card, mint, monitor | `mock` / `fork-verified · not-live` (neutral, Phase-7 tier) | MOCK / illustrative |

Greps (acceptance): no `$`-digit presented as real PnL; no "executed/realized/ejecutad/realizad" implying a real position; the new tier never green; reasoning collapses but the decision card does not; presets carry the "recorded run" label; "consensus-verified" used ONLY for the real Agent-1 decision (never for the mock executor).

## 7. MVP cut (binding — anti-overscope)
**Must:** `prompt → Agent 1 (real) → Agent 2 card → confirm → mint (mock)`. **Should:** `MonitorPanel` basic read; `RunHistory`. **Out:** delta-hedge/active management; any live chain call; real SSE (Phase 15); a 2nd scenario. The recordable demo flow is the deliverable; reserve time for the video.

## 8. Toolchain (researched + repo-verified 2026-06-06)
Reuse (stepper, disclosure, `LivenessSource` seam, shadcn, lucide) + **2 new deps only**: `motion` (MIT, React-19-safe; progressive reveal) and `idb` (MIT, ~1KB; IndexedDB history). Run/workflow state = plain `useReducer` (no XState/Zustand). SKIP AI-chat frameworks (no client LLM) — Vercel AI SDK is the documented upgrade path when a real model backend lands. Streaming: mock client producer now; native SSE later behind the seam.

**Vercel/RSC constraints:** future SSE route needs `export const dynamic="force-dynamic"`, return `Response` immediately + stream in background, no server-module global state, terminal event + close (≤~60s); `motion`/`idb`/`EventSource`/`useSyncExternalStore` live in `"use client"` islands, page shell stays RSC (mirror the Phase-7 `LivenessPill` RSC-boundary fix); all deps pure ESM (no Turbopack/native-addon traps).

## 9. Testing
- Unit (TDD failing-first): `WorkflowEngine` mock event sequencing + timing; `RunState` reducer transitions incl. the confirm gate; `history.ts` idb append/list; each card render + honesty greps; preset→recorded-decision mapping.
- e2e: run a preset → the 4 steps stream in order → confirm → mint → monitor → run saved + reopenable from history; honesty greps (no real-`$`, no executed/realized, neutral tiers, reasoning-collapses-decision-doesn't); es-CO/en parity; the recorded-run label present on Agent 1.
- Gates: `impeccable detect`, token tests, tsc, biome; Evidence Collector live-verify of `/apps/abrigo/cornerstone`; `gsd:ui-review`.

## 10. Deferred (recorded, NOT built)
- Real SSE/push producer + real Somnia→Polygon wiring (backend Phase 15); the real `MacroHedgeExecutor` (stub); full monitoring + delta-hedge; additional scenarios; wallet-connect-to-live-Polygon. All swap in behind the `WorkflowEvent`/seam contract without UI rework.

## 11. Open questions for ui-phase / planning
- Exact chatbot layout (single column transcript vs split prompt/stream), the preset chip set + their copy, the confirm-card visual treatment, the mock timing/pacing for the demo, the run-history surface. Resolved in `UI-SPEC`.
