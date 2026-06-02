# Module 3 — Agent reasoning + position-execution surface (Phase 7) — design

**Date:** 2026-06-02
**Status:** Draft for 2-way review (Reality Checker + Backend Architect/DevOps)
**Track:** designOS — this design feeds `gsd:ui-phase 7` (→ `UI-SPEC.md`) then `gsd:plan-phase 7`.
**Scope:** Frontend (read-first) + a **local-only** honker live-stream spike. **No Solidity, no contract deploy.**

---

## §0 — Binding honesty corrections (authoritative; overrides any looser wording below)

1. **`LongGammaWrapper` is NOT deployed** (not on Somnia, Base, or anywhere) and has **zero real position transactions**. It is **mid-development** on the backend's active branch `feat/macro-hedge-agent` (milestone v2.0, Phase 8 ≈ 5/7 plans; `deposit`/long-mint + `recordStreamia` + `close`/`claimResidual` landed; involuntary-close branches pending). Its ABI may still change.
2. Therefore the position-execution surface renders under a **new `fork-verified / not-live` provenance tier** (neutral token, NOT green, distinct from `testnet-agent`). It must **never** imply a realized/executed/placed position. No fabricated position numbers, ever.
3. The **agent decisions and macro prints ARE real** Somnia-testnet data (`testnet-agent` tier, real tx) — they keep Phase 6's tier.
4. **No fabricated chain-of-thought.** The LLM output is constrained to the enum/size labels; there is **no free-text rationale** recorded. The "agent thinking" surface presents the **real pipeline** (system prompt, deterministic built prompt, two-leg Qwen3-30B inference, decoded action/size, decision) — never invented reasoning prose.
5. **Management affordances are disabled.** Close/claim/agent-control buttons render **visible-but-disabled** with an honest "not live — fork-verified, not deployed" state. No wallet write, no transact (consistent with the whole read-first d2p surface).
6. **The honker live stream carries only real on-chain events.** There are only **2 historical decisions** on-chain today; unless the keeper runs the agent continuously, the feed is **event-driven** (streams new events when they occur + replays real history), not a constantly-moving ticker — and is labeled as such. Liveness state is honest: `● live` only when actually subscribed to a live source; otherwise `○ snapshot · —`.
7. **honker runs locally only** for this phase (single-host Docker, file-backed SQLite). It **cannot** run in Vercel serverless (ephemeral FS + multiple instances → `.db` corruption, per honker's own single-host constraint). Production hosting is **deferred**.
8. Reuse Phase 6 invariants: es-CO-first copy (native sign-off in `docs/copy-review.md`); locked design tokens (muted-ochre single accent; Plex Sans/Mono); `impeccable detect` + token tests enforced; no `--no-verify`; Somnia chain 50312 stays a SEPARATE `defineChain`/client; static JSON import + BigInt/Date rehydration; live reads server-side behind `SOMNIA_LIVE`, kept OUT of default CI.

---

## 1. Goal

A visitor (or agent) can see **how the Somnia macro-hedge agent thinks through a position** — the real decision pipeline from macro print to action/size — and **what its position would become**, with an honest separation between what is *live on testnet* (decisions) and what is *fork-verified but not deployed* (the `LongGammaWrapper` position + its management). A local honker spike demonstrates the decision pipeline **streaming live** as on-chain events arrive.

## 2. Backend ground truth (read-only; verify before build)

- **Agent:** `MacroHedgeStrategist` (Somnia 50312, `0xfA42…3EE1`). Reasons in **two LLM-inference legs across two txs**: leg 1 → action (`HOLD|ADD_LONG_GAMMA|REDUCE|EXIT`), leg 2 → size (bps). Deterministic `SYSTEM_PROMPT` (temp-0 Qwen3-30B, `LLM_AGENT_ID 12847293847561029384`); `_buildPrompt(actual, consensus)` is deterministic. Events: `HedgeDecisionRequested(requestId, decisionId, leg)`, `HedgeDecisionMade(...)`, `DecisionFailed(requestId, status)`. `consensus` is **operator-supplied** (not market).
- **Real decisions:** `4083729` ADD_LONG_GAMMA/6800 (macro 568, consensus 500); `4083997` REDUCE/568 (macro 568, consensus 900). (Verified on-chain this session; snapshot already in repo from Phase 6.)
- **Position contract:** `LongGammaWrapper` (fork-verified, NOT deployed). Read-honest getters when live: `numberOfLegs(wrapper)` (0=closed), `convertToAssets(balanceOf(wrapper))` (LIVE surviving collateral — never the `lastSurviving` baseline), `getAccumulatedFeesAndPositionsData(wrapper,true,[storedTokenId]).longPremium` (LIVE owed streamia — never the stale `recordedStreamia` getter), `storedTokenId`, `ResidualEroded` event (`cause` is a coarse `keccak256("INVOLUNTARY")` — advisory only, NOT a 3-way enum). `realizedCosts0/1` = 0 in v1 (Phase 9 placeholder) — do not surface as meaningful. ABI imported **verbatim** from `contracts/out/LongGammaWrapper.sol/LongGammaWrapper.json`.
- **Keeper cadence:** TO VERIFY during planning — is the agent run on a schedule (continuous live data) or are the 2 decisions historical? Determines whether the live stream is event-driven-only.

## 3. Provenance model

| Surface | Tier | Token | Rationale |
|---|---|---|---|
| Macro print, hedge decisions, pipeline trace (thinking) | `testnet-agent` (Phase 6) | neutral | real Somnia tx |
| Position state + management | **`fork-verified / not-live`** (NEW) | neutral, distinct | fork-proven, not deployed, no tx |

The new tier extends `ProvenanceBadge` additively (like `testnet-agent` did), neutral token, with an honest sub-label ("fork-verified · not deployed").

## 4. Information architecture (master–detail)

- **`/apps/abrigo/agent`** (Phase 6 overview): macro panel + decision feed. Each decision card links to its detail.
- **`/apps/abrigo/agent/[decisionId]`** (NEW): the per-decision detail —
  1. **Decision-pipeline trace** (centerpiece): macro print → built prompt (over actual+consensus) → Qwen3-30B temp-0 **action leg → size leg** → decision → illustrative position; the real `SYSTEM_PROMPT` is viewable (collapsible).
  2. **Position-execution panel** (`fork-verified / not-live`): the reader-seam fields shown as "—/not deployed"; ready to light up real getters when deployed.
  3. **Management controls**: close / claim / agent controls rendered **disabled** with the honest not-live state.
  4. **Liveness pill** + data-source indicator.

## 5. Frontend architecture

- **Reader seam for `LongGammaWrapper`**, gated behind `WRAPPER_DEPLOYED` (default `false`, server var). Live getters only; never stale baselines; ABI churn isolated to this module so backend mid-dev changes don't ripple. Snapshot/empty default; no fabricated position.
- **Liveness `refresh()` seam**: one interface, three realizations — (a) snapshot (default), (b) flagged server poll (`SOMNIA_LIVE`), (c) **honker SSE/WS subscription** (the spike). UI subscribes to `refresh()` and is agnostic to the source. The honker realization is swappable in/out without UI changes.
- **Decision-pipeline trace** is a presentational component fed by the reader; reconstructs the deterministic prompt from `(actual, consensus)` and shows real leg states from `HedgeDecisionRequested`/`Made`/`Failed`.

## 6. honker live spike (local/demo only)

A single-host **Docker** service (honker ships a Dockerfile; satisfies Docker-first policy), run via `docker compose` locally, NOT deployed:

```
Somnia RPC (read-only, no keys, no transact)
   │  watcher: subscribes to MacroHedgeStrategist + MacroOracle events
   ▼
file-backed SQLite + honker  ──pub/sub──▶  SSE/WS endpoint
   (single host, persistent .db; NO :memory:)        │
                                                      ▼
   Next.js (local dev) ── client subscribes via refresh() seam ──▶ live pipeline trace
```

- Streams **only real events**: macro prints + `HedgeDecisionRequested` (action-leg → size-leg) → `HedgeDecisionMade`/`DecisionFailed`. Position is NOT streamed (not deployed).
- honker is **alpha** (~2-month-old, single maintainer) — risk contained to local; behind the `refresh()` seam so it is removable.
- Documented production path (deferred): the same Docker service on a non-Vercel always-on host, gated on backend deploy + continuous keeper + UX validation.

## 7. Out of scope / deferred (recorded, not built)

- Production hosting of the honker service; an indexer/SQL data layer (only when decision/position history grows large — same `refresh()` seam swap-in).
- Real position management (wallet write/transact) — until `LongGammaWrapper` deploys and d2p introduces a write surface.
- XCHAIN-01 Somnia-decision → Base-`mintLong` wiring (backend-deferred).

## 8. Testing

- Unit: reader seam (gated `WRAPPER_DEPLOYED`), pipeline-trace reconstruction, provenance tier, liveness-pill states, disabled-button states. TDD, failing-first.
- e2e: `/apps/abrigo/agent/[decisionId]` renders the trace, the not-live position panel, disabled management; honesty greps (no "executed/realized/ejecutad/realizad", no fabricated `$`, no green token on the new tier); locale parity es-CO/en.
- honker spike: a local integration test (watcher → SQLite+honker → SSE event observed); kept OUT of default CI (`@live`/skip-unless-flagged), mirroring `SOMNIA_LIVE`.
- Gates: `impeccable detect`, token tests, tsc, biome; Evidence Collector live-verification of the detail route; `gsd:ui-review` on the built surface.

## 9. Open questions for ui-phase / planning

- Visual form of the pipeline trace (vertical stepper vs flow diagram) — for `UI-SPEC`.
- Disabled-button treatment (tooltip vs inline caption) consistent with locked tokens.
- Liveness pill design (color+icon+text, never color alone — CROSS-09).
- Keeper cadence confirmation (live-data reality).
