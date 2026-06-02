# Somnia Agent Surface (MacroHedgeStrategist) — Module 2 / Phase 6 (Design)

**Date:** 2026-06-02
**Status:** Design — passed 2-way review (Reality Checker + Frontend Developer); revised; pending user sign-off
**Module:** 2 of the abrigo-somnia frontend build (module 1 = the convex instrument, GSD phase 05.1)

---

## 0. Review resolution (2026-06-02)

Both reviewers returned NEEDS WORK. Key reconciliation: the **Reality Checker's BLOCKER-class alarm
("no data / e2e never ran green / phase blocked") was a FALSE ALARM** — it inferred from the missing
`11-03` summary file, but `abrigo-somnia/.planning/STATE.md` (Decisions Log, 11-03) records the **live
e2e ran green twice** with a **persistent recorded deployment** and **two real `HedgeDecisionMade`
txs**. So module 2 is GO, reads an EXISTING deployment, and needs NO new deploy and NO fabrication.

**Canonical deployment (Somnia testnet, chain 50312 — already live, recorded in STATE.md):**
- `MacroOracle` = `0xAcA75144f644220f1dEAD5F989C350D8e0Cc983f` (keeper-proxy `https://keeper-eta-pied.vercel.app/`)
- `MacroHedgeStrategist` = `0xfA428171E1F5B56f92C67C002De1d8e90B053EE1`
- platform `0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776`; `LLM_AGENT_ID 12847293847561029384` (confirmed on-chain)
- Real decisions (live TE CPI macroValue=568): run#1 consensus=500 → ADD_LONG_GAMMA/sizeBps=6800
  (tx `0x2a8ec99452956fb94ad3b138844957409b298daa05e2d9986b34676d643c36a5`); run#2 consensus=900 →
  REDUCE/sizeBps=568 (tx `0x5057f803d214aa549e16a6c8ce3745610f0ce407a3bac06c1a6f643807dc3575`).

**Binding corrections folded into this spec + the Wave-0 plan:**
- HONESTY (Reality Checker, valid): scope component D to **CPI (`co/inflation-rate`) ONLY** — capacity-
  utilization is NOT wired and would be fabricated; label `consensus` as **operator-supplied POC input,
  NOT a market consensus**, and gate the word "surprise" behind that caveat; soften "consensus-verified"
  → "Somnia-testnet agent decision (POC)" (validator byte-consensus is assumed, not separately proven);
  **snapshot.json MUST be captured from the real tx hashes above — hand-authored decision data is a
  CROSS-09 violation and forbidden**; restate D as "the latest macro value per `dataKey` (single
  `latest` getter — no on-chain history) + `MacroReceived` logs replayed into the snapshot."
- BUILDABILITY (Frontend Developer, valid → Wave-0 line items): add a SEPARATE `SomniaChainId = 50312`
  + `somniaClient` (do NOT widen `SupportedChainId`/`publicClients`); `defineChain` the Somnia chain
  (`viem/chains` has none); **Turbopack-safe static `import x from './x.json'`** for snapshot/deployments
  + explicit `BigInt(...)`/`new Date(...)` re-hydration at the reader boundary (the Phase-2 burn class —
  Turbopack ignores the webpack alias; live-DOM verify); live read is **server-side** gated on a server
  `SOMNIA_LIVE` var (NOT a `NEXT_PUBLIC_` client flag); each MCP tool returns a **single wrapping
  `ZodObject`** (e.g. `{ decisions: [...] }`, never an array/union) + BOTH `content[text]` and
  `structuredContent`, a NEW envelope in `contract.ts`, edits in `index.ts` + `route.ts`, and its own
  conformance test (the existing test asserts the `not_deployed` shape); the `testnet-agent` pill uses a
  **neutral token (text-text-muted / ring-border-default), NEVER green** (green reads "production-good"),
  with `live`/`recorded` shown via an icon/sub-label, not color; compute surprise in **`BigInt` space**,
  format at the edge; decode `DecisionFailed.status` as `uint8 ResponseStatus`; render half-complete
  decisions (`decidedAt==0`, one leg unset) as **pending** with em-dash.
- SCOPE wording: **3 reader-parallel components (D/A/C) + 1 dependent (B)**, all gated on Wave 0 — not
  "four independent." Snapshot is the PRIMARY (deterministic) path; the live read is optional/flagged
  and kept OUT of default CI via a `@live`/`test.skip(!process.env.SOMNIA_LIVE)` guard.

## 1. Context

The abrigo-somnia backend advanced into **Phase 11 — `MacroHedgeStrategist`**: an on-chain,
autonomous, **consensus-verified macro-hedge *decision* agent** on Somnia testnet (chain 50312).
It reads a `MacroOracle` datum (live Trading-Economics macro data via the Somnia json-fetch agent —
e.g. Colombian CPI), reasons over the **surprise** (actual vs. consensus) through the Somnia
**LLM-inference agent** (Qwen3-30B, `temperature=0` → byte-identical validator output → consensus on
the AI result), and emits a structured hedge **decision**. The contracts are **written,
unit-tested, and proven live-deployable** (a Somnia-testnet e2e broadcasts real txs + receives real
platform callbacks). **No Solidity/contract work is in scope — module 2 is frontend-only.**

This module surfaces that capability in the d2p frontend as **four TDD'd components — three
reader-parallel (D/A/C) + one dependent (B) — all gated on Wave 0** (failing tests first, with
integration tests).

## 2. Goal & success criteria

A visitor or agent can, on the d2p site:
1. See the **latest MacroOracle CPI print** (`co/inflation-rate`, Colombia — the ONLY wired key; NOT
   capacity-utilization) + recorded `MacroReceived` history, honestly labeled Somnia-testnet (component D).
2. See the **recorded hedge decisions** — print → (operator-supplied consensus) → surprise → action +
   sizeBps — each with a `testnet-agent` provenance pill (component A).
3. See a **bridge** that joins a decision to module-1's cCOP/USD long-gamma instrument: "this
   operator-input surprise → ADD_LONG_GAMMA @ sizeBps → this convex position" (component B).
4. Have an **AI agent** consume the decisions/prints via new MCP tools (component C).
Every number carries honest provenance (Somnia testnet, POC, agent decision — NOT mainnet, NOT real
capital, consensus = operator-supplied input); nothing is fabricated (snapshot is real captured tx data).

## 3. Honesty model — new `testnet-agent` provenance tier

Module 1's tiers: `fork-fixture / spec / schematic`. Module 2 adds **`testnet-agent`**:
> "Somnia testnet · consensus-verified AI decision (Qwen3-30B, temp=0) · POC — not mainnet, no real capital."

Sub-states: **`live`** (read from the chain via viem/RPC now) vs **`recorded`** (from the committed
snapshot). Pills encode color + icon + text + aria (CROSS-09); em-dash never 0.

## 4. Data path (hybrid — deployment ALREADY EXISTS; NO pin, NO contract work)

The canonical deployment already exists on Somnia testnet (recorded in `abrigo-somnia/.planning/STATE.md`,
11-03; see §0). No re-deploy and no e2e re-run are needed. `somnia-mcp` was 503 at design time, but the
frontend reads via plain viem/RPC, not `somnia-mcp`.

- **Wave 0 record (no deploy):** write `lib/apps/abrigo/somnia/deployments.json` from the §0 addresses
  (MacroOracle `0xAcA751…`, MacroHedgeStrategist `0xfA4281…`, platform `0x037Bb9…`, chain 50312,
  `LLM_AGENT_ID`, keeper-proxy URL, `capturedAt`).
- **Snapshot (REAL data only):** populate `lib/apps/abrigo/somnia/snapshot.json` by reading the two
  recorded `HedgeDecisionMade` tx receipts/logs (§0 hashes) + the `MacroReceived` log(s) — via viem/RPC
  against the deployment, captured once into a committed, dated fixture (record the tx hashes in it).
  **MUST be real captured output — hand-authored decision data is a CROSS-09 violation (forbidden).**
  This is the deterministic source for component/integration tests + CI (no network in tests).
- **Live read (optional, server-side, flagged):** `defineChain` a `somniaTestnet` (chain 50312, RPC
  `https://api.infra.testnet.somnia.network`) + a dedicated `somniaClient` (NOT in the `SupportedChainId`
  union / `publicClients` record) + the compiled ABIs (`contracts/out/.../{MacroHedgeStrategist,MacroOracle}.json`).
  Read **server-side** (nodejs runtime), gated on a SERVER `SOMNIA_LIVE` var — NOT `NEXT_PUBLIC_*`. Plain
  viem/RPC; no `somnia-mcp`.
- **Reader seam:** `lib/apps/abrigo/somnia/reader.ts` — one typed API backed by `snapshot` (DEFAULT,
  deterministic) or `live` (flagged). Static `import snapshot from './snapshot.json'` (Turbopack-safe) +
  explicit `BigInt(...)`/`new Date(...)` re-hydration at this boundary (the Phase-2 burn class). All
  on-chain ints (`macroValue`, `consensus`, `sizeBps`) are bigint-as-string in the snapshot; surprise =
  `BigInt(macroValue) − BigInt(consensus)`, formatted at the edge.

## 5. Data contract (from the verified contract)

- `MacroDatum.scaledValue` (int, scaled), `dataKey` (bytes32), unit/ts.
- `HedgeDecision { action: enum HedgeAction { HOLD, ADD_LONG_GAMMA, REDUCE, EXIT }, sizeBps (0..MAX_SIZE_BPS=10000), macroValue (int256 actual), consensus (int256), decidedAt }`.
- Events: `HedgeDecisionRequested(requestId, decisionId, leg)`, `HedgeDecisionMade(requestId, action, sizeBps, macroValue, consensus)`, `DecisionFailed(requestId, status)`.
- Surprise = `macroValue − consensus` (same scale). Reader exposes a typed, provenance-tagged shape.

## 6. The four components (each = one GSD plan; TDD + integration tests)

### Wave 0 — `06-00` data layer (foundation; all four depend on it)
deployments.json (one-time pin) + snapshot.json + somniaTestnet viem chain + ABIs + `reader.ts`
(live|snapshot seam) + the `testnet-agent` provenance tier added to `ProvenanceBadge`. Unit tests:
reader decodes the snapshot to the typed shape; surprise calc; bigint-as-string discipline.

### `06-01` — D: Live macro-data panel
`MacroDataPanel` (RSC) rendering the MacroOracle prints with `testnet-agent` pills, em-dash for null.
TDD: unit (format, provenance, null→em-dash) + integration (panel renders from reader/snapshot;
live behind flag). Smallest; no dependency on A/B.

### `06-02` — A: Hedge-decision feed
`HedgeDecisionFeed` + `HedgeDecisionCard`: per decision, macro print → surprise → action badge +
sizeBps + consensus-verified `testnet-agent` pill; equal visual weight across actions (anti-fishing).
TDD: unit (event decode, surprise, action→label map, sizeBps clamp display, em-dash) + integration
(snapshot events → feed rows, both locales). Independent of B/C/D.

### `06-03` — C: agent-first MCP tools
Add `get_hedge_decisions(dataKey)` + `get_latest_macro_print(dataKey)` to the Phase-4 MCP server
(`lib/mcp-tools/*`, registered in `app/api/mcp/[transport]/route.ts`), Zod contracts mirroring the
existing tool pattern, reading via the same reader. TDD: unit (tool Zod contract + handler over
snapshot) + integration (MCP route conformance, like the existing `get_instrument_terms` test).
Independent of A/B/D (shares the reader).

### `06-04` — B: surprise → decision → instrument bridge (depends on A)
`HedgeDecisionBridge` mounted on module-1's cCOP/USD long-gamma instrument page: takes a decision +
the instrument, renders "surprise → action @ sizeBps → position delta on this convex payoff."
TDD: unit (decision→position-delta mapping; sizeBps→notional scaling) + integration (bridge renders
on the instrument detail page with the snapshot decision). Last, because it joins A's surface to
module 1.

## 7. Routing / placement

A new `(somnia)` or reuse `(defi)` route group? — proposal: a route under the Abrigo app, e.g.
`/apps/abrigo/agent` (feed + macro panel), and B embeds on the existing instrument detail page.
Final IA placement is a plan-time detail; the components are placement-agnostic (data-driven).

## 8. Testing strategy (the directive: TDD + integration per component)

- **Unit (vitest, deterministic, snapshot-backed):** each component + the reader + the MCP tools have
  failing-first unit tests (Wave-0 stubs flipped green per component).
- **Integration (vitest render / Playwright):** each component renders correctly from the reader over
  the snapshot; the MCP tools pass route conformance; the live path is exercised behind the flag only
  in a tagged/optional run (never in default CI — testnet is non-deterministic).
- **a11y (axe + manual):** CROSS-01 WCAG 2.2 AA on any new route/surface; pills color+icon+text.
- **Evidence Collector** live-DOM verification after commits (CLAUDE.md), against the snapshot-backed
  surface (deterministic).

## 9. Out of scope
- Any contract/Solidity work (backend is done). Executing decisions on-chain (wrapper/XCHAIN — deferred).
- Mainnet / real capital. A permanent always-live read in default CI (testnet is non-deterministic).
- The DEFI-06 wallet-a11y work (separate, in-flight phase 05.2).

## 10. GSD structure
New **Phase 6 — Somnia agent surface**, 5 plans: `06-00` (Wave 0 data layer) → `06-01`/`06-02`/`06-03`
(D/A/C — parallelizable, independent) → `06-04` (B — depends on A). Build **after DEFI-06 merges**
(PR #4) per the user's sequencing.

## 11. Open items for planning
1. The one-time pin requires a funded testnet wallet (STT) + the e2e to run green — confirm at Wave 0;
   if the pin can't run, fall back to snapshot-only (recorded from a prior run) + defer the live flag.
2. Confirm `LLM_AGENT_ID` + the exact `ILLMAgent` response decode (already in the contract) for the
   reader's event ABI.
3. Whether `somnia-mcp` (currently 503) is ever used, or the frontend stays pure viem/RPC (recommended).
4. Final route-group/IA placement for the agent surface.

## 12. Process
Per `~/.claude/CLAUDE.md`, this spec passes the **2-way review** (Reality Checker + Frontend Developer)
before planning; BLOCKERs/MAJORs resolved; then GSD Phase 6.
