# Module 5 — Cornerstone live-tx integration (Scenario-1 E2E demo)

**Status:** REVISED v2 — 2-way review complete (Reality Checker + Solidity Smart Contract Engineer, both NEEDS WORK on v1); all BLOCKERs/MAJORs resolved below per user decisions (2026-06-07: re-provision-per-run live submit + static cost placeholder). Pending user approval → GSD phase registration.
**Date:** 2026-06-07

## Review-resolution log (v1 → v2)
- **B1 (both reviewers): a fresh `resolveFromMandate` reverts against an already-used sandbox** — collateral is single-shot, owned by the *executor*, consumed by the provisioned mint → 2nd mint hits `AccountInsolvent` in `pool.dispatch`. **Resolved:** re-provision-per-run model (§4a) — each live run requires a FRESHLY provisioned sandbox (executor collateral unspent, `pool.numberOfLegs(executor)==0`); a mount-time **freshness gate** enables live-submit only when the executor has no open position, else falls back to mock. Concrete re-provision + re-mirror runbook with owner/timing (§4b).
- **B2 (both): signer model was a red herring** — `resolveFromMandate` has NO access control; success depends on the *executor's* collateral, not the caller's; the signer only pays gas. **Resolved:** §4a corrected — drop the server-key-vs-wallet auth debate; the enabling action is re-provision (fresh executor collateral), and the browser wallet needs only fork gas. Server-key path retained ONLY as an optional gas-convenience, explicitly not an auth/funding requirement.
- **B3 / M4 (both): agent cost ledger is not deployed, has no address, `totalCost` uncallable.** **Resolved:** per user decision, cost ledger becomes a STATIC labelled placeholder (§5.3) — no `totalCost` call, no address, no fake numbers.
- **M3 (both): pin demo constants.** `economicTheory = address(0x6)` (POST_KEYNESIAN — the only sentinel reproducing strike 360360; `0x5`/SHILLER mints a different/possibly-reverting position), `legIndex = 0`, `positionSize = 1e6`. These are demo CONSTANTS, not a mandate-derived mapping (§2, §4a).
- **M1: `BalanceDelta` decoder rigor.** Explicit sign-extension spec + amount1-negative fixture (§2).
- **M2: `quoteMargin` ordering.** `strike` arg comes from the minted TokenId's leg-0 (`positionId.strike(0)`), read STRICTLY after a confirmed `PositionMinted` (reverts `PositionNotOwned` otherwise) (§2, §4a).
- **M5: `StrategistDecided` is never decoded from a live log** (the new shape is not deployed to Somnia) — it is synthesized in-app from the recorded v1 trace (§2, §3).
- **Minors:** `ExecutorDecided.requestId`/`RepresentativenessAssessed.requestId` are sentinel `0` on the direct path → not surfaced as meaningful; `PositionMinted` has 2 indexed topics (owner, positionId) + positionSize in data; decoder tolerates the extra `RepresentativenessAssessed` log; `address(0)` economicTheory → em-dash (never raw zero).
- **Validated unchanged by both reviewers:** the entire §0 honesty contract, the §2 ABI field order/types, and the §0.6 `_onResult`-unexecuted framing.
**Supersedes scope of:** the deferred mock-only swap implied by Module 4's `fromMockEvent` seam.
**Builds on:** Phase 8 (`/apps/abrigo/cornerstone`, `workflow-store`, `WorkflowEvent`/`fromMockEvent`, RunTranscript, HedgeDecisionCardV2, MintCard), Phase 6 (recorded Somnia decision + reader), Phase 7 (`fork-verified` tier, DecisionPipelineTrace, LivenessPill, useSyncExternalStore pattern).

---

## §0 — Binding honesty contract (NON-NEGOTIABLE, overrides all else below)

These are derived verbatim from `abrigo-somnia/docs/UI-AGENT-HANDOFF.md` (Phase-15 refresh) and CLAUDE.md (CROSS-09 / LAB-05). Any plan task that violates one is a BLOCKER.

1. **Agent-1 is NOT live.** The new `StrategistDecided(decisionId, school, HedgeMandate)` shape is **not deployed to Somnia 50312** (the live deployment is the old `HedgeDecisionMade` contract). The cornerstone MUST continue to reveal the **recorded v1 trace** (decisions 4083729 / 4083997) for Agent-1. Do NOT subscribe to a live Somnia `StrategistDecided`. Do NOT deploy the Phase-12 strategist. Agent-1 stays under `testnet-agent` / "consensus-verified", recorded-run labelled.

2. **Agent-2 mint is a Polygon FORK, not mainnet.** The live tx is submitted to a **BuildBear hosted Polygon fork (chainId 31337)** — NOT public Polygon, NOT a bridge. Provenance stays **`fork-verified`** (neutral, never green). The verbatim on-screen disclosure (es-CO first, en second) MUST be present whenever a live tx path is shown:
   > "El Agente 1 corre en vivo sobre la testnet de Somnia; el Agente 2 acuña sobre un fork de Polygon alojado (BuildBear) — el mandato lo transporta esta app entre ellos; en esta demo NO hay puente entre cadenas."
   > "Agent 1 runs live on Somnia testnet; Agent 2 mints on a hosted Polygon fork (BuildBear) — the hedge mandate is carried between them by this app; there is NO cross-chain bridge in this demo."

3. **No hardcoded fork addresses.** `executor`, `pool`, `riskManagement`, `rpcUrl`, `mintTxHash`, `mintedStrike`, `chainId` come from a mirrored `buildbear-deployments.json` artifact committed under `lib/apps/abrigo/cornerstone/`. The artifact carries `capturedAt`; the UI MUST treat the sandbox as **expirable** (3-day TTL) and degrade gracefully when the RPC is unreachable (see §4 fallback).

4. **The mandate is carried by the app, not bridged.** Agent-1's recorded decision is mapped (in-app) to a `HedgeMandate` that Agent-2 consumes on the fork. This is an honest "the app relays" affordance, never presented as on-chain interop.

5. **Never imply "executed/realized" on mainnet.** No `executed`/`realized`/`ejecutad`/`realizad` in rendered DOM. No `$`-prefixed value presented as realized PnL. Status pills always color+icon+text. The decision card never collapses under `<details>` (FAIL/PASS equal weight).

6. **`_onResult` (Somnia→Polygon live callback) is unexecuted.** We do NOT simulate or claim the live cross-chain callback. The frontend submits `resolveFromMandate` directly on the fork — that is the honest, working path.

7. **Mock fallback is honest, not a downgrade.** When the live path is unavailable (sandbox expired, no signer, RPC/CORS failure), the existing `fromMockEvent` path renders the same transcript under an explicit "modo demostración (sin cadena)" / "demo mode (no chain)" label. The fallback MUST be visually distinct from a real on-chain run (no real tx hash, no block link).

---

## §1 — Goal & scope

A judge at `/apps/abrigo/cornerstone` picks a preset (or free-text → nearest preset). The workflow streams chatbot-style:

1. **Agent-1 step** — REAL recorded Somnia decision (unchanged from Phase 8): single factor `co/inflation-rate` → consensus → mandate. Under `testnet-agent`/consensus-verified.
2. **Agent-2 decision card** — the recorded decision is mapped to a `HedgeMandate`; user **Confirms**.
3. **Live mint** — on Confirm, the browser wallet submits `resolveFromMandate(mandate, legIndex, positionSize)` to the BuildBear executor; the UI waits for `ExecutorDecided` + `PositionMinted`, then reads `quoteMargin` and the cost ledger.
4. **Evidence** — real mint **tx hash** + **strike** + **TokenId** + **ExecutorDecided rationale fields** + **agent cost ledger** rendered under `fork-verified` provenance with the §0.2 disclosure.

**In scope (per user decision 2026-06-07):** live tx submission; agent cost ledger; real mint tx hash + strike; ExecutorDecided rationale fields.
**Out of scope:** school-branch UI (SHILLER vs PKE selector); live Somnia StrategistDecided; cross-chain bridge; monitoring agent; idb run history (still deferred from 08-03).

---

## §2 — ABI reconciliation (the stale-contract fix)

The current `lib/apps/abrigo/cornerstone/events.ts` `WorkflowEvent` union predates the final ABIs. It MUST be reconciled. Confirmed real shapes (from compiled ABIs in `abrigo-somnia/contracts/out/`):

```solidity
// MacroHedgeStrategist
event StrategistDecided(bytes32 indexed decisionId, string school, HedgeMandate mandate);
struct HedgeMandate { address economicTheory; bytes32 underlyingMarket; uint256 targetNotional; uint32 chainId; bool isLong; }

// MacroHedgeExecutor
event ExecutorDecided(uint256 indexed requestId, uint8 regimeZt, uint256 inflationAdjustmentWad,
                      int24 strikeTick, int24 regimeWidth, bool parametricHedged,
                      bool nonErgodicDisclosed, string rationale);
event PositionMinted(address indexed owner, TokenId indexed positionId, uint128 positionSize);
function resolveFromMandate(HedgeMandate calldata mandate, uint256 legIndex, uint128 positionSize) external returns (TokenId);
function quoteMargin(TokenId id, int24 strike) external view returns (BalanceDelta);

// OperationalCostManagement (NOT access-controlled / NOT wired to executor — standalone read)
event AgentCostAccrued(bytes32 indexed decisionId, uint256 somi, uint256 cummSomi);
event DataCostAccrued(bytes32 indexed decisionId, uint256 dataCost, uint256 cummData);
function totalCost(bytes32 decisionId) external view returns (uint256 somi, uint256 data);
```

**Reconciliation rules:**
- `PositionMintedEvent.marginToken0/1` are NOT on the `PositionMinted` event. Margins come from `quoteMargin(TokenId, strikeTick)` (a `BalanceDelta` = packed `int128,int128`). The view model keeps `marginToken0/1: bigint` but they are sourced from `quoteMargin`, decoded at the edge (sign preserved).
- `ExecutorDecidedView` gains: `regimeZt: number`, `inflationAdjustment: string` (WAD→percent at edge), `strikeTick: number` (SIGNED int24), `regimeWidth: number` (SIGNED int24), `parametricHedged: boolean`, `nonErgodicDisclosed: boolean`, `rationale: string` (verbatim free-text).
- Cost ledger is NOT read on-chain (B3/M4: `OperationalCostManagement` is not deployed, has no address in the artifact, `totalCost` uncallable). It is a STATIC labelled placeholder only (§5.3) — no `totalCost` call, no `AgentCostView`, no fake numbers.
- `BalanceDelta` decode (M1): a single 256-bit value packing two `int128` — **upper 128 bits = amount0, lower 128 bits = amount1** (`v4-core/src/types/BalanceDelta.sol:6-8`). Decoder at the edge: `amount0 = asIntN(128, value >> 128n)` (arithmetic), `amount1 = asIntN(128, value & ((1n<<128n)-1n))` — the low word MUST be sign-extended (BalanceDelta.sol:61-71 uses `signextend(15, …)` = sign-extend from bit 127). Unit-tested with an **amount1-negative** fixture specifically (the masked low word is the easy sign-extension bug). `quoteMargin` returns this as ABI `int256`.
- `economicTheory` is a real sentinel address (`0x5`=SHILLER / `0x6`=POST_KEYNESIAN; `IMacroThesis.sol:35-36`), NOT `address(0)`. The demo mint pins `0x…06` (the only sentinel reproducing strike 360360). `schoolLabelFromAddress`: `0x6`→"POST_KEYNESIAN", `0x5`→"SHILLER_MACRO_RISK", `address(0)`→em-dash, unknown→em-dash (never raw hex).
- `StrategistDecided` is NEVER decoded from a live log (M5): the new shape is not deployed to Somnia 50312. It is synthesized in-app from the recorded v1 trace as a view model. Do NOT wire `decodeEventLog`/`getLogs` against Somnia for it.
- `ExecutorDecided.requestId` and `RepresentativenessAssessed.requestId` are sentinel `0` on the direct `resolveFromMandate` path — do not surface `requestId` as a meaningful field. `PositionMinted` has 2 indexed topics (`owner`, `positionId`) + `positionSize` in data. The decoder tolerates the extra `RepresentativenessAssessed` log (emitted on every mint) rather than erroring on an unrecognized topic.

---

## §3 — Architecture (the live producer behind the existing seam)

The `workflow-store` and `RunTranscript` are UNCHANGED. Only the **event producer** swaps: `workflow-engine.ts` gains a `runWorkflowLive()` alongside the existing timed mock `runWorkflow()`.

```
RunTranscript (useSyncExternalStore — unchanged)
  └─ workflow-store (reducer, stable ref — unchanged)
       └─ producer (selected at runtime):
            ├─ runWorkflowLive(signer, deployment)   ← NEW
            │     1. emit StrategistDecided (from RECORDED trace → mapped HedgeMandate)
            │     2. await user Confirm
            │     3. writeContract resolveFromMandate(mandate, legIndex, positionSize)
            │     4. waitForTransactionReceipt → parse logs (ExecutorDecided, PositionMinted)
            │     5. read quoteMargin + totalCost
            │     6. emit ExecutorDecided / PositionMinted / AgentCost (decoded via fromChainLog)
            └─ runWorkflow()  (mock, unchanged — fallback)
```

- **New chain config:** `lib/apps/abrigo/cornerstone/buildbear.ts` — `defineChain({ id: 31337, ... rpc from artifact })`, ISOLATED like `somnia/chain.ts` (NOT added to the 5-chain `wagmiConfig`; NOT added to `SupportedChainId`). A dedicated `buildbearClient` (viem public client) for reads. Writes go through a wallet client built from the connected signer **after an explicit `switchChain(31337)`**.
- **New decoder:** `fromChainLog(log) → WorkflowEventView` — the real-ABI sibling of `fromMockEvent`, using `decodeEventLog` from viem with the mirrored ABI. Same output view types (downstream stable). This is where BigInt/int24/BalanceDelta/WAD are formatted (the burn-class edge).
- **Artifact mirror:** `lib/apps/abrigo/cornerstone/buildbear-deployments.json` (committed) + a typed loader that validates required fields and exposes `isExpired(nowMs)` (capturedAt + 3 days).
- **Server proxy (decision pending review):** if BuildBear RPC is CORS-blocked from the browser, reads/writes route through a Next.js Route Handler (`app/api/cornerstone/rpc/route.ts`) that forwards JSON-RPC. The spec REQUIRES a reachability probe (`eth_chainId`) on mount that decides live-vs-fallback BEFORE the user clicks Confirm.

---

## §4a — Live-tx flow, the freshness gate, and failure handling

**Why a freshness gate (the B1 fix).** Collateral on the fork is deposited ONCE (by the provisioning broadcast) into the *executor*, and a single `resolveFromMandate(mandate, 0, 1e6)` consumes it to mint the position recorded in the artifact. A second mint against the same sandbox reverts `AccountInsolvent` inside `pool.dispatch` (`MacroHedgeExecutor.sol:386-417`). Therefore **live-submit is only valid against a FRESHLY provisioned sandbox whose executor has no open position yet.** The UI must detect this, never assume it.

Preconditions probed on mount (all must pass to OFFER live-submit):
1. Mirrored artifact present AND not expired (`capturedAt + 3d > now`).
2. `eth_chainId` probe to the fork RPC returns `0x7a69` (31337).
3. **Freshness:** `pool.numberOfLegs(executor) == 0` — the executor holds no position, so its collateral is unspent and the mint will succeed. (If `> 0`, the recorded mint already consumed collateral → live-submit would revert.)
4. A wallet connector is available (existing RainbowKit) AND, after an explicit `switchChain(31337)`, the connected EOA has fork gas. (Auth is NOT required — `resolveFromMandate` is permissionless; the signer only pays gas. Collateral belongs to the executor, not the signer — B2.)

Branch on the probe:
- **Fresh sandbox (3 passes + wallet):** offer live-submit. Confirm submits `resolveFromMandate(mandate, 0n, 1_000_000n)` with `mandate.economicTheory = 0x…06`. Transcript states (each an append-only `aria-live` polite announcement): `submitting` (wallet prompt) → `pending` (tx broadcast, real hash shown immediately; fork-explorer link only if BuildBear exposes one, else monospace hash, NO fake link) → `confirmed` (receipt status 1; decode `ExecutorDecided` + `PositionMinted` from the receipt logs; then read `quoteMargin(positionId, positionId.strike(0))`) → render evidence.
- **Used sandbox (freshness fails) OR expired/unreachable OR no wallet:** live-submit is NOT offered. Run the mock path under the explicit "modo demostración (sin cadena)" / "demo mode (no chain)" label — NO real tx hash, NO block link, visually distinct from a live run. The mode is ALWAYS visible; never a silent substitution.
- **`reverted` (receipt status 0):** honest error state, no partial "minted" claim; offer the mock fallback.
- **`error`** (user rejected / chain-switch refused / RPC down mid-flight): graceful message + mock fallback.

**Read-after-mint ordering (M2):** `quoteMargin` reverts `PositionNotOwned` if the position was never minted — call it STRICTLY after a confirmed `PositionMinted`, with `strike` extracted from the minted TokenId's leg 0 (`positionId.strike(0)`), NOT from the artifact's `mintedStrike` (which only happens to equal it). Margins (`BalanceDelta`) decoded at the edge with sign extension (§2).

**Signer model (B2 corrected).** The auth/funding debate from v1 was misdiagnosed: the executor's collateral is what mints, the caller only pays gas, and `resolveFromMandate` is permissionless. So the browser wallet calling directly is fine provided it has fork gas. A server-held key is retained ONLY as an optional gas convenience for the demo (so the judge needn't hold fork ETH) — it is explicitly NOT an auth or funding requirement. If used, the Route Handler MUST: server-fix the payload (`mandate`/`legIndex`/`positionSize` constants, never client-supplied), be sandbox-only/disposable key, rate-limited, and the key never reaches the browser.

## §4b — Re-provision-per-run runbook (the B1/B3-timing fix; backend-owned, in-spec contract)

Because each live run needs a fresh executor, and the sandbox TTL (~3 days) likely lapses by demo day (~Jun 11), the team commits to this runbook BEFORE each live demo run. This is a backend action (script lives in `abrigo-somnia`), but the spec pins the FE-facing contract:

1. **Provision** (backend owner): run `abrigo-somnia/contracts/script/provision-buildbear-demo.sh` → fresh sandbox, fresh executor + deposited collateral, one recorded mint. Produces a new `buildbear-deployments.json` (new addresses, RPC, mintTxHash, capturedAt).
   - NOTE: the provisioning script's own mint consumes the collateral. For a *live in-demo* mint, provision a sandbox WITHOUT the inline mint (or with a second funded executor) so `numberOfLegs(executor)==0` at demo time. **Open item for backend (§7.4): provide a `--no-mint` / fresh-executor provisioning variant so the freshness gate passes.** Until that exists, the live path degrades to read-back+mock; this is the honest default.
2. **Mirror** (FE owner): copy the new artifact to `lib/apps/abrigo/cornerstone/buildbear-deployments.json`, commit. The typed loader validates required fields + `isExpired(nowMs)`.
3. **Timing buffer:** provision morning-of with TTL covering the demo window; if the gate fails at showtime, the mock fallback carries the demo honestly.
4. **Owner + when:** named in the phase plan's checkpoint; not left implicit (resolves review M2/B3).

---

## §5 — Surfaces to add (per user selection)

1. **Real mint tx hash + strike + TokenId** — under `fork-verified`, with §0.2 disclosure. Hash monospace, copyable; strike via existing `formatScaledPercent`/tick formatter; TokenId as string.
2. **ExecutorDecided rationale fields** — expandable detail (NOT on the decision card itself — that stays full-weight; this is a post-mint evidence panel): regimeZt label, inflationAdjustment %, strikeTick, regimeWidth, parametricHedged/nonErgodicDisclosed as color+icon+text pills, rationale verbatim.
3. **Agent cost — STATIC placeholder panel** (B3/user decision): no on-chain read. Renders a clearly-labelled capability note (es-CO+en): "Contabilidad de costos del agente: implementada on-chain (`OperationalCostManagement`) — no desplegada para esta demo." / "Agent cost accounting: implemented on-chain — not deployed for this demo." No `totalCost` call, no numbers, no address. Shows the capability exists without faking data.

---

## §6 — Acceptance (what must be TRUE)

- `events.ts` reconciled to real ABIs; `fromChainLog` decoder unit-tested incl. negative `BalanceDelta` and negative int24 strike; `fromMockEvent` kept for fallback.
- Freshness gate works: when `pool.numberOfLegs(executor)==0` (freshly provisioned), clicking Confirm submits a real `resolveFromMandate(mandate, 0n, 1_000_000n)` (economicTheory=`0x…06`) on chainId 31337 and the UI renders the REAL resulting tx hash + decoded ExecutorDecided + PositionMinted + `quoteMargin(positionId, strike(0))`. When the executor already has a position (used sandbox), live-submit is NOT offered and the mock fallback runs under the demo-mode label. (Verified by Evidence Collector against a freshly provisioned sandbox via the §4b runbook.)
- Cost panel is static "not deployed for this demo"; no `totalCost` call anywhere.
- Fork addresses/RPC sourced ONLY from the mirrored artifact; `isExpired` honored; no hardcoded addresses anywhere; demo constants `legIndex=0`, `positionSize=1e6`, `economicTheory=0x…06` pinned.
- §0.2 disclosure present on every live-path view; provenance never green.
- Fallback path renders under an explicit demo-mode label with NO fake tx hash/link.
- No `executed/realized/ejecutad/realizad`, no `$` PnL, no raw `0x000…0` in rendered DOM; decision card has no `<details>`; status pills color+icon+text.
- es-CO-first copy + en; native sign-off appended to `docs/copy-review.md`.
- `pnpm run test:impeccable` + token tests green; e2e green LOCALLY before commit (the Phase-8 CI lesson); Evidence Collector live-verify gate per task.

---

## §7 — Open items carried into planning (review-resolved where possible)

1. ~~Signer model~~ — RESOLVED (§4a B2): permissionless call, executor holds collateral, signer pays gas only; server-key optional gas convenience, not auth.
2. **CORS/RPC reachability** (carry to research-phase): does BuildBear RPC allow browser-origin JSON-RPC, or is a Next.js Route-Handler proxy mandatory? Decide via an `eth_chainId` browser probe in the research/spike task.
3. ~~Re-mirror workflow~~ — RESOLVED into §4b runbook (owner + timing named at plan checkpoint).
4. **Backend dependency (the one true external blocker):** the provisioning script's inline mint consumes the executor's collateral, so the freshness gate fails immediately after provisioning. **Backend must provide a fresh-executor / `--no-mint` provisioning variant** so `numberOfLegs(executor)==0` at demo time and the live mint succeeds. Until delivered, the live path honestly degrades to mock fallback. This is tracked as a cross-repo dependency in the phase plan; the FRONTEND phase does not block on it (the gate + fallback ship regardless).
5. ~~legIndex/positionSize/economicTheory~~ — RESOLVED (M3): pinned demo constants `0`, `1e6`, `0x…06`.
