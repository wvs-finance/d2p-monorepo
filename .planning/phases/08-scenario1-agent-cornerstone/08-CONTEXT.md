# Phase 8: Scenario-1 Agentathon cornerstone (Module 4) — Context

**Gathered:** 2026-06-06
**Status:** Ready for designOS UI-phase (spec already 2-way-reviewed)
**Source:** Brainstormed design → `docs/superpowers/specs/2026-06-06-module4-scenario1-cornerstone-design.md` (v2; §0 = binding honesty; passed 2-way review: Reality Checker + Frontend Developer).

<domain>
## Phase Boundary

**Module 4** — the Encode × Somnia **Agentathon "Scenario 1" cornerstone** (deadline ~June 11, 2026; judged hardest on autonomous-agent performance). ONE mock-driven, chatbot-style run flow at a new route `/apps/abrigo/cornerstone`: prompt → Agent 1 (REAL recorded consensus-verified decision, revealed) → Agent 2 (MOCK decision card → confirm) → MOCK mint, with workflow steps streamed live.

**Frontend-only, mock-driven.** Nothing in the flow is live-callable (executor stub, mint fork-only, no Somnia→Polygon bridge); real wiring = backend Phase 15. NO Solidity, NO deploy, NO wallet-to-live-chain. Phase 8 ships the MOCK UI; real wiring is a separate future phase.
</domain>

<decisions>
## Implementation Decisions (LOCKED — see spec §0 for the binding honesty list)

1. **Prompt → real decision:** curated preset chips, each mapping to ONE of the two REAL recorded consensus-verified Somnia decisions (4083729 consensus 500→ADD_LONG_GAMMA/6800; 4083997 consensus 900→REDUCE/568); free-text → nearest preset; labeled "recorded run · consensus-verified". Never claims live inference of the user's text.
2. **IA:** new dedicated route `/apps/abrigo/cornerstone`; M2 (`/apps/abrigo/agent`) + M3 (`/apps/abrigo/agent/[id]`) stay as-is, cross-linked.
3. **Committed MVP scope:** prompt → Agent-1 reveal (real) → Agent-2 mock card → Confirm → mock Mint. **If-time (NOT committed):** MonitorPanel (basic read) + RunHistory (idb). Dropping these keeps idb off the critical path.
4. **Streaming model:** the WORKFLOW STEPS stream progressively (A1→A2→mint); the Agent-1 trace itself is server-rendered (`DecisionPipelineTrace`) passed as `children` and **revealed all-at-once** (NOT per-stage) — it's a pure RSC, cannot be client-stream-driven.
5. **State:** a dedicated `workflow-store.ts` — `useSyncExternalStore`-shaped, OWNS the reducer (emit→reduce→cache immutable RunState, stable ref; getServerSnapshot=idle). Do NOT reuse `LivenessSource` (single-value store, wrong shape) — reuse the PATTERN only. One source of truth (no separate useReducer).
6. **Provenance:** Agent-1 = `testnet-agent` tier (subState recorded) + "consensus-verified" — ONLY here. Agent-2/mint = the existing neutral `fork-verified` tier + a NEW sub-label "mock · no en vivo"/"mock · not live" (NOT a new `mock` tier — that doesn't exist; never green).
7. **Honesty (spec §0):** single real factor `co/inflation-rate` only (NO fabricated multi-factor reasoning — policy-rate/terms-of-trade/expectations are NOT in the data); LLM output is enum+number (no free-text thesis — any narrative is labeled human-authored explanation); no `$` presented as real PnL (mock numerics carry adjacent mock/ilustrativo labels); reasoning collapses (summary+expand, reuse SystemPromptDisclosure) but the decision card does NOT; raw `0x000…0` never shown; no RPC/wallet client against the Polygon addrs.
8. **Provisional event contract:** the 4 `WorkflowEvent`s are PROVISIONAL (already diverge from the backend's Solidity sketch — int24 ticks vs decimal, int256 vs bigint) — isolate behind a `fromMockEvent` adapter; a Phase-15 reshape is expected (NOT zero-rework).
9. **a11y:** transcript `aria-live="polite"` `aria-atomic="false"` (announce each step once); focus moves to Confirm on the confirm gate; `motion` entrance mounted-gated (no non-idle content at SSR) + `prefers-reduced-motion` → CSS fallback.

## Toolchain
Reuse (Phase-7 stepper, SystemPromptDisclosure, fork-verified tier, LivenessPill, the useSyncExternalStore pattern; shadcn; lucide) + committed dep **`motion`** (MIT, React-19-safe). **`idb`** ONLY with the if-time RunHistory (lazy openDB in function bodies, client-only import, jsdom needs fake-indexeddb). SKIP AI-chat frameworks (no client LLM; Vercel AI SDK = Phase-15 upgrade path). Native-SSE producer deferred to Phase 15 behind the same store/adapter.

## Claude's Discretion
Chatbot layout (single-column vs split), preset chip set + copy, confirm-card visual treatment, mock pacing for the demo recording — resolved in `gsd:ui-phase` → `UI-SPEC.md`.
</decisions>

<canonical_refs>
## Canonical References
- `docs/superpowers/specs/2026-06-06-module4-scenario1-cornerstone-design.md` (THE spec v2; §0 binding).
- Backend handoff (read-only): `../abrigo/abrigo-somnia/docs/UI-AGENT-HANDOFF.md` + `DRAFT.md`; verified shapes in `contracts/src/types/{HedgeLegParams,PayoffTerms}.sol`; the stub `contracts/src/MacroHedgeExecutor.sol`; the fork test `contracts/test/fork/DemoMacroHedgeExecutor.fork.t.sol`.
- Frontend reuse: `components/defi/somnia/{DecisionPipelineTrace,PipelineStage,SystemPromptDisclosure,LivenessPill,HedgeDecisionCard}.tsx`; `components/defi/ProvenanceBadge.tsx` (fork-verified tier + add the sub-label); `lib/apps/abrigo/somnia/{reader.ts,snapshot.json,liveness.ts (pattern only)}`; `i18n/request.ts` + `messages/{es-CO,en}/somnia.json` (extend under `somnia.cornerstone.*`); the M3 `/apps/abrigo/agent/[id]` RSC-shell + client-island pattern.
- `./CLAUDE.md` (anti-fishing/CROSS-09, es-CO-first, live-verification, no --no-verify, locked tokens).
</canonical_refs>

<deferred>
## Deferred
- Real SSE/push producer + real Somnia→Polygon wiring + real MacroHedgeExecutor (backend Phase 15); MonitorPanel + RunHistory + idb (if-time, not committed); full monitoring + delta-hedge; additional scenarios; wallet-connect-to-live-Polygon. All swap behind the WorkflowEvent+adapter+store contract.
</deferred>

---
*Phase: 08-scenario1-agent-cornerstone*
*Context gathered: 2026-06-06 (brainstorm → 2-way-reviewed spec; designOS track)*
