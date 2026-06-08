# Module 4 — Scenario-1 Agentathon cornerstone (frontend Phase 8) — design (v2)

**Date:** 2026-06-06
**Status:** Revised after 2-way review (Reality Checker + Frontend Developer) — BLOCKERs/MAJORs resolved; ready for `gsd:ui-phase`.
**Track:** designOS — 2-way review (done) → register Phase 8 → `gsd:ui-phase` (→ `UI-SPEC.md`) → `gsd:plan-phase` → `gsd:execute-phase`.
**Scope:** Frontend-only, **mock-driven**. NO Solidity, NO deploy, NO wallet-to-live-chain. Deadline ≈ **June 11, 2026** (Encode × Somnia Agentathon). Phase 8 ships the **mock UI only**; real wiring is a SEPARATE future phase (backend Phase 15), never a silent continuation.

> **v2 changes (review resolutions):** dropped the non-existent `mock` tier → reuse `fork-verified` + a sub-label; removed the fabricated 4-factor reasoning → Agent-1 streams ONLY the real `co/inflation-rate` factor; Agent-1 trace is a server-rendered **all-at-once reveal** (not per-stage streaming); replaced "LivenessSource + useReducer" with a dedicated `workflow-store.ts` that owns the reducer; marked the `WorkflowEvent` contract PROVISIONAL behind an adapter; tightened the committed MVP (monitor/history/`idb` are "if time"); added a11y (aria-live + focus-to-confirm) + motion-SSR + grep specifics.

---

## §0 — Binding honesty corrections (authoritative)

1. **Nothing in this flow is live-callable.** Executor is a 34-line stub; the mint is fork-only; no Somnia→Polygon bridge. Entire UI = mock integration layer; real wiring = backend Phase 15. NO wallet-connect-to-live-Polygon (acceptance grep: no viem/wagmi client instantiated against the Polygon addrs).
2. **Agent 1 is REAL.** Replays one of the two recorded **consensus-verified** Somnia decisions (`4083729` consensus 500→ADD_LONG_GAMMA/6800; `4083997` consensus 900→REDUCE/568) from `snapshot.json`, under the **`testnet-agent`** tier with its `subState` "recorded", labeled "recorded run · consensus-verified on Somnia." NOT a live inference of the user's text.
3. **Agent-1 reasoning shows ONLY the real factor.** The snapshot holds a single macro datum: `co/inflation-rate = 568` (5.68%). The streamed/revealed reasoning shows exactly that pipeline — `co/inflation-rate → operator consensus → surprise → action enum → sizeBps` — via the existing `DecisionPipelineTrace`. **No policy-rate / terms-of-trade / inflation-expectations factors** (they are not in the data). Any broader macro narrative is a clearly-labeled human-authored **explanation**, never "the real pipeline" and never attributed to the LLM (whose output is enum+number only).
4. **Agent 2 / mint (/ monitor) are MOCK.** They render under the existing neutral **`fork-verified`** tier + a **sub-label "mock · no en vivo" / "mock · not live"** (NOT a new tier; never green). Never imply a realized/executed/placed position. Mock numerics (strike 4.100, vol→width, margin) are labeled spec/mock; **no `$` figure is presented as realized PnL** — every mock numeric renders inside the mock wrapper with a unit/`ilustrativo` label (acceptance asserts the label is a sibling of each numeric, not merely "no `$`").
5. **Reasoning collapses; the decision does not.** Progressive disclosure (summary+expand) for reasoning only (reuse `SystemPromptDisclosure`, the sole licensed `<details>`). The Agent-2 decision card, mint card (and monitor) contain **zero `<details>`** and stay full visual weight (CROSS-09/LAB-05).
6. **Prompt presets are labeled.** Curated example prompts map to the real recorded runs; free-text maps to the nearest preset. The UI never claims the user's exact text was inferred live; `economicTheory address(0)` is shown as a human school label, never the raw `0x000…0`.
7. `"consensus-verified"` appears ONLY on the Agent-1 surface; `testnet-agent` tier appears ONLY on Agent-1 (greps enforce both). Reuse prior invariants: es-CO-first (sign-off in `docs/copy-review.md`); locked tokens; `impeccable` + token tests; no `--no-verify`; static JSON import + BigInt/Date rehydration; Somnia 50312 separate client; out of default CI.

---

## 1. Goal

A visitor/judge types a macro-view prompt and watches the agent **workflow run live, chatbot-style** — the workflow STEPS appear progressively (Agent 1 → Agent 2 → mint), each as a transcript entry. Agent 1's entry reveals the real, consensus-verified decision trace; Agent 2's entry is a mock decision card the user **confirms**; then a mock mint. The autonomous-agent showcase (the real consensus-verified decision) is the judged differentiator.

## 2. Provisional event contract (mock now; reshape expected at Phase 15)

> **PROVISIONAL.** The backend's real events are finalized only in Phases 12–15 and the handoff's Solidity sketch already differs (e.g. `strike/width` `int24` ticks vs a display decimal; margins `int256`). These mock shapes live behind a single **adapter** (`fromMockEvent`/`toViewModel`); a Phase-15 reshape is expected — the seam is NOT advertised as zero-rework.

```ts
// lib/apps/abrigo/cornerstone/events.ts — PROVISIONAL
type WorkflowEvent =
  | { type:'StrategistDecided'; requestId:bigint; recordedDecisionId:string }     // → look up the REAL decision via the Phase-7 reader
  | { type:'ExecutorDecided'; requestId:bigint; rationale:string; spec:HedgeLegParamsView } // MOCK card
  | { type:'PositionMinted'; positionId:bigint; owner:`0x${string}`; marginToken0:bigint; marginToken1:bigint } // MOCK
  | { type:'PerformanceUpdated'; positionId:bigint; mark:bigint; premiumAccrued:bigint; marginHealthBps:bigint; pnl:bigint } // MOCK (if-time)
```
`HedgeLegParamsView` is a hand-authored view type (not the raw ABI struct) carrying the displayable fields: market label, `strikeWAD` (formatted, demo 4.100), size, isLong, school label (from `economicTheory`), `PayoffTerms` (vol→width, horizon, tickSpacing, asset), max-loss=premium, upside=unlimited, + the mock margin `BalanceDelta`. Verbatim source structs in `abrigo-somnia/contracts/src/types/{HedgeLegParams,PayoffTerms}.sol`.

## 3. Information architecture
New dedicated route **`/apps/abrigo/cornerstone`** (the demo screen): prompt + preset chips → live run transcript → confirm → mint. Modules 2 (`/apps/abrigo/agent`) and 3 (`/apps/abrigo/agent/[id]`) stay as-is, cross-linked. **The Agent-1 transcript entry is the Phase-7 `DecisionPipelineTrace` server-rendered and passed as `children`, revealed all-at-once by the client transcript** (the per-step streaming is across the WORKFLOW steps A1→A2→mint, not within the A1 trace).

## 4. Architecture / data flow
```
PromptBox (client) ── startRun(presetId) ──▶ WorkflowEngine (MOCK producer: timed async-gen of WorkflowEvent[])
                                                   │ emit(event)
                                                   ▼
                         workflow-store.ts  (NEW; useSyncExternalStore-shaped; OWNS the reducer)
                           emit(e) → reduce(RunState,e) → cache NEW immutable RunState (stable ref until next emit)
                           getServerSnapshot() → idle ;  subscribe(listener)
                                                   │
                  RunTranscript (client) useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot)
                  RunState: idle → a1 → a2_decision → [user Confirm] → minting → done
                                                   │
                  (real-later, Phase 15: a Next-16 route ReadableStream text/event-stream + EventSource → fromMockEvent adapter → same store)
```
- **One source of truth:** the store internally reduces; NO separate `useReducer`. New immutable `RunState` per emit keeps the `useSyncExternalStore` stable-ref invariant (the Phase-7 hydration lesson). `getServerSnapshot` returns `idle` so first paint = the idle prompt (no streamed content at SSR).
- Do **not** reuse `LivenessSource` (single-value snapshot store — wrong shape); reuse the *pattern* only.
- The Agent-1 step's event carries `recordedDecisionId`; the client reveals the server-rendered `DecisionPipelineTrace` for that decision (passed as `children`).

## 5. Components (committed MVP)
- `app/(defi)/apps/abrigo/cornerstone/page.tsx` — RSC shell; pre-renders the `DecisionPipelineTrace` for the preset decisions and passes them as `children` to the client transcript; mounts the client islands.
- `PromptBox` (client) — textarea + curated preset chips → `startRun`. es-CO-first.
- `RunTranscript` (client) — chatbot stream; `aria-live="polite"` `aria-atomic="false"` container; reuses the Phase-7 stepper for the step markers; `motion` for step entrance with a **mounted-gate** (no non-idle content at SSR) + `prefers-reduced-motion` → CSS-transition fallback.
- **Agent-1 entry** — reveals the server-rendered `DecisionPipelineTrace` (real, `testnet-agent`, "recorded run · consensus-verified"); single-factor (`co/inflation-rate`).
- `HedgeDecisionCardV2` (client) — the differentiator + biggest component: renders `HedgeLegParamsView` (≈10 fields, bigint/WAD formatting) under `fork-verified` + "mock · no en vivo", reusing `HedgeDecisionCard`'s `DataRow`/badge/`CARD_CLASS` idioms; no `<details>`; a `Confirm` button. **On entering the confirm state, focus moves to Confirm** (a11y).
- `MintCard` (client) — mock tx + position (`TokenId`, margin `BalanceDelta`, leg fields), `fork-verified`+mock label; no `<details>`.
- `lib/apps/abrigo/cornerstone/{workflow-engine.ts, workflow-store.ts, events.ts (+adapter), presets.ts (preset→recordedDecisionId)}`.
- Reuse: `LivenessPill` (a "replaying · mock" state), stepper, `SystemPromptDisclosure`, shadcn, lucide.

## 6. Honesty / provenance
| Surface | Tier | Real? |
|---|---|---|
| Agent-1 reasoning + decision | `testnet-agent` (subState recorded) | REAL · consensus-verified |
| Agent-2 card, mint (, monitor) | `fork-verified` + sub-label "mock · no en vivo" | MOCK / illustrative |

Acceptance greps: `testnet-agent` + "consensus-verified" appear ONLY on the Agent-1 surface; the `fork-verified` tier never renders a green/emerald token; no `<details>` in `HedgeDecisionCardV2`/`MintCard`; every mock numeric has an adjacent mock/`ilustrativo` label; no `executed/realized/ejecutad/realizad` in the DOM; raw `0x000…0` never shown; no RPC/wallet client constructed against the Polygon addrs.

## 7. Scope (binding)
**COMMITTED MVP:** `prompt → Agent-1 (real, revealed) → Agent-2 card → Confirm → Mint (mock)`. **IF TIME (only after the core demos + tests green):** `MonitorPanel` (basic read) and `RunHistory` (+ the `idb` dep). Dropping these keeps `idb` off the critical path (and avoids the jsdom/IndexedDB test setup). **OUT:** delta-hedge/active management; any live chain call; real SSE (Phase 15); a 2nd scenario; full monitoring. Riskiest component = `HedgeDecisionCardV2` + the confirm gate (budget most time); then the mock engine pacing for a clean recording. Reserve a hard block for the demo video.

## 8. Toolchain
Committed: reuse (stepper, `SystemPromptDisclosure`, shadcn, lucide, the `useSyncExternalStore` pattern) + **`motion`** (MIT, React-19-safe; entrance/height anim with mounted-gate + reduced-motion → CSS fallback). **`idb`** is added ONLY with the if-time `RunHistory` (lazy `openDB` inside function bodies, imported only from `"use client"` modules, `typeof indexedDB==='undefined'` guard; tests need `fake-indexeddb`). Run/workflow state = the dedicated store's internal reducer (no XState/Zustand). SKIP AI-chat frameworks (no client LLM); Vercel AI SDK = documented upgrade path at Phase 15.
**Vercel/RSC:** future SSE route `export const dynamic="force-dynamic"`, return `Response` immediately + stream in background, no server-module global state, terminal event + close (≤~60s); `motion`/`idb`/`EventSource`/the store live in `"use client"` islands, page shell RSC (mirror the Phase-7 `LivenessPill` boundary); all deps pure ESM (no Turbopack/native-addon traps); `history.ts` never imported by an RSC (grep).

## 9. Testing
- Unit (TDD, jsdom): `workflow-store` reduce/emit + stable-ref; `WorkflowEngine` mock event ordering/timing + terminal; the `fromMockEvent` adapter; `HedgeDecisionCardV2`/`MintCard` render + honesty greps; preset→recordedDecisionId mapping. (`RunHistory`/`idb` tests use `fake-indexeddb` — only if that scope is built.)
- e2e: run a preset → steps stream in order → Agent-1 shows the real recorded decision (single-factor, "consensus-verified", `testnet-agent`) → Agent-2 card (mock label) → Confirm (focus moves to it) → Mint (mock); honesty greps (no real-`$`, no executed/realized, `fork-verified` not green, decision not collapsed); `aria-live` announces each step once; es-CO/en parity.
- Gates: `impeccable detect`, token tests, tsc, biome; Evidence Collector live-verify of `/apps/abrigo/cornerstone` (mock producer must run in the `pnpm start` build); `gsd:ui-review`.

## 10. Deferred (recorded, NOT built)
Real SSE/push producer + real Somnia→Polygon wiring + real `MacroHedgeExecutor` (backend Phase 15); `MonitorPanel`/`RunHistory`/`idb` (if-time, not committed); full monitoring + delta-hedge; more scenarios; wallet-connect-to-live-Polygon. All swap behind the `WorkflowEvent`+adapter+store contract.

## 11. Open questions for ui-phase / planning
Chatbot layout (single-column transcript vs split), the preset chip set + copy, the confirm-card visual treatment, mock pacing for the recording. Resolved in `UI-SPEC`.
