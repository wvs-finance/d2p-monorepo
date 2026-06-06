# Module 3 — Agent reasoning + position-execution surface (Phase 7) — design (v2)

**Date:** 2026-06-02
**Status:** Revised after 2-way review (Reality Checker + Backend Architect) — BLOCKERs/MAJORs resolved; ready for `gsd:ui-phase 7`.
**Track:** designOS — feeds `gsd:ui-phase 7` (→ `UI-SPEC.md`) then `gsd:plan-phase 7`.
**Scope (v2):** **Frontend-only, read-first. The honker live-stream is DEFERRED out of Phase 7** (see §7) — so this phase adds NO backend service, NO Solidity, NO deploy.

> **v2 revision note.** v1 was reviewed NEEDS WORK. Resolutions: **B1** §2 rewritten against the *actual* `LongGammaWrapper` ABI (verified by enumerating the compiled artifact); **BA-B1/RC-B2** honker de-scoped to a deferred, accurately-described bespoke sidecar (honker is an embedded in-process lib with no Dockerfile/SSE, and there is no continuous keeper, so a live stream would replay 2 static rows); **M1** scope decomposed to the read surface; **M2** "frontend-only" now true again; **M3/M4** typed `adaptWrapper` adapter replaces "verbatim import," `refresh()` defined as a `useSyncExternalStore` contract; event signatures corrected.

---

## §0 — Binding honesty corrections (authoritative)

1. **`LongGammaWrapper` is NOT deployed** (no real position tx) and is **mid-development** (backend active branch `feat/macro-hedge-agent`, milestone v2.0 Phase 8 = 5/7; `08-06` involuntary-close branches + Phase 9 `realizedCosts` pending; the contract was last edited **today**). Its ABI is a **moving target**.
2. Position execution renders under a NEW neutral **`fork-verified / not-live`** provenance tier (NOT green; distinct from `testnet-agent`). In Phase 7 the position panel renders **only the "not deployed" empty state** — no live reads execute, no fabricated numbers. It must never imply a realized/executed/placed position.
3. Agent decisions + macro prints ARE real Somnia-testnet data → keep the `testnet-agent` tier (real tx).
4. **No fabricated chain-of-thought.** `_buildPrompt` is deterministic `pure`; LLM output is enum/clamped-int (no free-text rationale stored). The trace shows the **real deterministic decision pipeline** (system prompt, built prompt, two-leg inference mechanism, decoded action/size), never invented prose. Copy says "the deterministic decision pipeline," not "the agent's reasoning."
5. **Management affordances are disabled** (close/claim/agent) with an honest "not live — fork-verified, not deployed" state. No wallet write, no transact.
6. `consensus` is **operator-supplied** (not market/validator) — labeled as such wherever shown.
7. **honker live stream is DEFERRED** (§7), not built in Phase 7. Rationale (verified): honker is an **embedded in-process N-API library** — it has **no Dockerfile and no SSE/WS endpoint**; a browser-facing stream requires a **bespoke Node sidecar** (Somnia watcher + SQLite schema + SSE handler) we would author. AND there is **no continuous keeper** (every backend workflow is `workflow_dispatch`; only 2 historical decisions exist), so a stream would replay static rows. honker is unblocked only when a continuous keeper cadence exists.
8. Reuse Phase-6 invariants: es-CO-first (native sign-off in `docs/copy-review.md`); locked tokens; `impeccable detect` + token tests enforced; no `--no-verify`; Somnia 50312 stays a SEPARATE `defineChain`/client; static JSON import + BigInt/Date rehydration via the existing `reader.ts` boundary; live RPC reads server-side behind `SOMNIA_LIVE`, lazy (function-body only), OUT of default CI.

---

## 1. Goal

A visitor or agent can see the **deterministic decision pipeline** of the Somnia macro-hedge agent — from macro print to action/size — and an honest **fork-verified / not-live** view of the `LongGammaWrapper` position it would open, with management affordances visibly disabled. All backed by real on-chain decision data; no fabrication; no live-stream infra.

## 2. Backend ground truth (VERIFIED against compiled artifacts — 2026-06-02)

**Agent `MacroHedgeStrategist`** (Somnia 50312, `0xfA42…3EE1`). Two LLM-inference legs across two txs; deterministic `SYSTEM_PROMPT` (temp-0 Qwen3-30B, `LLM_AGENT_ID 12847293847561029384`); `_buildPrompt(int256 actual, int256 consensus)` deterministic `pure`. **Real event signatures (verbatim):**
- `HedgeDecisionRequested(uint256 indexed requestId, bytes32 indexed decisionId, uint8 leg)` — `leg` = `Leg` enum (`Action`=… / `Size`=…). **Not currently in the frontend `abi.ts` — Phase 7 must add it verbatim.**
- `HedgeDecisionMade(uint256 indexed requestId, uint8 action, uint256 sizeBps, int256 macroValue, int256 consensus)` — **keys on `requestId`, has NO `decisionId`.**
- `DecisionFailed(uint256 indexed requestId, uint8 status)` — `status` = `ResponseStatus` enum.

**`decisionId → requestId[]` join (load model for `/[decisionId]`):** a decision (`bytes32 decisionId`) fans out to two `HedgeDecisionRequested` events (one per leg, each its own `requestId`); the completing `HedgeDecisionMade`/`DecisionFailed` key on a `requestId`. To render a decision's pipeline: resolve `decisionId` → its leg `requestId`s (from `HedgeDecisionRequested`) → the `Made`/`Failed` for the completing leg.
> **Snapshot caveat:** the current `snapshot.json` stores the `HedgeDecisionMade.requestId` (uint256) in a field mislabeled `decisionId`; the 2 values `4083729`/`4083997` are **requestIds, not the bytes32 decisionId**. Phase 7 must either (a) key the route on `requestId` and rename the field honestly, or (b) extend the capture to record the real `bytes32 decisionId` + both leg `requestId`s + the `HedgeDecisionRequested` events (preferred — lets the trace show the real two-leg progression rather than a structural description). Decided at planning.

**Real decisions:** `requestId 4083729` ADD_LONG_GAMMA/6800 (macro 568, consensus 500); `requestId 4083997` REDUCE/568 (macro 568, consensus 900).

**Position contract `LongGammaWrapper`** (fork-verified, NOT deployed). **Actual ABI (enumerated from `contracts/out/LongGammaWrapper.sol/LongGammaWrapper.json`):**
- Functions: `claimResidual, claimed, close, costMeter, ct0, ct1, deposit, deposited0, deposited1, lastSurviving0, lastSurviving1, owner, pool, positionTokenId, recordStreamia, setCostMeter, state, syncResidual, user`.
- Events: `PositionOpened(address indexed user, uint256 tokenId, uint256 deposited0, uint256 deposited1)`, `ResidualClaimed(address indexed user, uint256 paid0, uint256 paid1)`, `ResidualEroded(address indexed user, uint256 eroded0, uint256 eroded1, bytes32 cause)` (`cause` is a coarse `keccak256("INVOLUNTARY")` — advisory only, type as `bytes32`, NOT a 3-way enum), `CostMeterSet(address meter)`.
- **Live position/collateral are COMPOSED reads through the wrapper's references, NOT wrapper getters:** position legs/health via `PanopticPool` (`wrapper.pool()`), surviving collateral via ERC4626 `convertToAssets(balanceOf(wrapper))` on `wrapper.ct0()/ct1()`. The token id getter is **`positionTokenId`** (not `storedTokenId`). The stale baselines to NEVER surface as "current" are **`lastSurviving0/1`** and **`deposited0/1`**. There is **no `recordedStreamia` getter** (there is a `recordStreamia()` function) and **no `realizedCosts*`** (Phase 9 — does not exist yet; do not reference).
- **Phase 7 does not execute any of these reads** (wrapper not deployed) — they are encoded as mapping rules inside `adaptWrapper` (§5) and exercised only when `WRAPPER_DEPLOYED` flips post-deploy.

**Keeper cadence:** no `schedule:`/`cron:` in any backend workflow (all `workflow_dispatch`); the agent runs only via a manual script. Decisions are the 2 historical ones. (This is why honker is deferred — §7.)

## 3. Provenance model
| Surface | Tier | Token |
|---|---|---|
| Macro print, decisions, pipeline trace | `testnet-agent` (Phase 6) | neutral |
| `LongGammaWrapper` position + management | **`fork-verified / not-live`** (NEW) | neutral, distinct |

Additive extension of `ProvenanceBadge` (same pattern as `testnet-agent`), neutral token, honest sub-label ("fork-verified · not deployed").

## 4. Information architecture (master–detail)
- `/apps/abrigo/agent` (Phase 6 overview): macro panel + decision feed; each card links to detail.
- **`/apps/abrigo/agent/[id]`** (NEW; `id` = requestId or real decisionId per the §2 planning decision):
  1. **Decision-pipeline trace** (centerpiece, `testnet-agent`): macro print → built prompt (deterministic from actual+consensus) → Qwen3-30B temp-0 action leg → size leg → decision → illustrative position; real `SYSTEM_PROMPT` viewable (collapsible). "Illustrative position" is the `sizeBps`→fraction-of-max mapping (real arithmetic) — never a `$` figure.
  2. **Position-execution panel** (`fork-verified / not-live`): renders the **not-deployed empty state** in Phase 7 (`—`); the typed view + adapter are ready for the post-deploy flip.
  3. **Management controls**: close / claim / agent — visible-but-disabled, honest not-live state.
  4. **Liveness pill** (CROSS-09: color+icon+text): Phase 7 states are `snapshot` and `polling` only (`live` ships with the deferred honker phase). Honest `○ snapshot · —` by default.

## 5. Frontend architecture
- **Typed position adapter (resolves M4).** Define a stable hand-authored `WrapperPositionView` (analogous to `HedgeDecisionView`) and a single `adaptWrapper(raw): WrapperPositionView` chokepoint. Components import ONLY `WrapperPositionView`. The §2 getter rules (composed reads through `pool()/ct0()/ct1()`; never `lastSurviving*`/`deposited*` as "current"; `cause` as `bytes32`; no `realizedCosts`) live INSIDE `adaptWrapper` so a future contributor physically cannot surface a stale baseline. When the mid-dev ABI churns, only `adaptWrapper` changes — never JSX. In Phase 7 `adaptWrapper` is unreachable behind `WRAPPER_DEPLOYED=false`; the panel renders the empty state.
- **`WRAPPER_DEPLOYED` gate.** Server var (NOT `NEXT_PUBLIC_`), read lazily inside function bodies (mirror `SOMNIA_LIVE` at `reader.ts:139`), default `false`. This is a **placeholder against a moving ABI**: the seam will be re-derived from the final ABI before the flag ever flips (not "churn-isolated magic").
- **Liveness `refresh()` seam (resolves M1)** — a `useSyncExternalStore`-shaped contract so snapshot/poll (and later honker-SSE) are swappable without UI change:
  ```ts
  type LivenessSource<T> = {
    getSnapshot(): T                              // sync seed for SSR + first paint
    subscribe(cb: (next: T) => void): () => void  // snapshot: immediate no-op unsub; poll: interval; (honker-SSE: deferred)
    readonly liveness: 'snapshot' | 'polling' | 'live'
  }
  ```
  Phase 7 ships the `snapshot` (default) and `polling` (`SOMNIA_LIVE`) realizations only. **Invariant:** the native `honker-node` addon must NEVER enter the frontend `package.json` (it would break Turbopack/Vercel — the documented burn class); honker, when built, lives only in the deferred sidecar and the frontend speaks plain `EventSource`.
- **Trace data:** reconstruct the deterministic prompt from `(actual, consensus)`; render real leg states. Requires adding `HedgeDecisionRequested` to `abi.ts` and (preferred) capturing the leg events into the snapshot (§2 caveat).

## 6. (removed) — the honker live stream moved to §7 Deferred.

## 7. Deferred (recorded, NOT built in Phase 7)
- **honker live-stream sidecar.** Accurate architecture for when it's unblocked: a **bespoke Node sidecar** = Somnia watcher (`eth_getLogs` cursor-polling — the codebase has only an `http()` client, no WS transport for `eth_subscribe`, and Somnia WS is unverified) → file-backed SQLite (uint256 columns as **TEXT**, never INTEGER) with a `UNIQUE(transactionHash, logIndex)` dedup key and a `watcher_cursor(last_block,last_log_index)` row committed in the **same tx** as each insert (honker's atomic-write property) → honker in-process durable stream → **our** SSE handler (CORS for the cross-origin local app, `id:` lines for `Last-Event-ID` resume, periodic `: heartbeat` comments so "quiet feed" ≠ "dead connection"). Degraded pill states: `live`/`stale`/`reconnecting`/`snapshot`. WAL + `busy_timeout`; health endpoint gates the SSE handler. Pin honker commit + a glibc base image (`node:20-bookworm`) for native-addon/libc portability. A single shared BigInt/Date rehydration fn applied client-side after `JSON.parse` of each SSE frame (the Phase-2 burn class at the new seam).
- **Unblock conditions:** (a) a continuous keeper cadence exists (real live data), (b) accepted as frontend+sidecar (not frontend-only), (c) read-surface (Phase 7) validated.
- **Indexer/SQL data layer:** only when one of — need >1 writer, HA/failover, or analytical queries over 100k+ events. Not row-count.
- Real position management (wallet write/transact) until the wrapper deploys; XCHAIN-01 Somnia→Base wiring (backend-deferred).

## 8. Testing
- Unit (TDD, failing-first): `adaptWrapper` mapping rules (incl. negative tests that stale baselines/`realizedCosts` cannot be surfaced; `cause` typed `bytes32`); `WRAPPER_DEPLOYED`-gated reader returns the not-live state by default; `LivenessSource` snapshot+poll contract; pipeline-trace reconstruction (prompt from actual+consensus; leg states); provenance tier; disabled-button states; liveness pill (snapshot/polling).
- e2e: `/apps/abrigo/agent/[id]` renders the trace + not-live position panel + disabled management; honesty greps (no "executed/realized/ejecutad/realizad"; no fabricated `$`; no green token on the new tier; no `● live` regression flag since live is deferred); es-CO/en parity.
- Gates: `impeccable detect`, token tests, tsc, biome; Evidence Collector live-verification of the detail route; `gsd:ui-review` on the built surface.

## 9. Open questions for ui-phase / planning
- Route key: `requestId` vs real `bytes32 decisionId` (+ whether to extend snapshot capture with leg events). Pipeline-trace visual form (stepper vs flow). Disabled-button treatment. Liveness-pill design (snapshot/polling). All resolved in `UI-SPEC`.
