# Phase 6: Somnia agent surface (MacroHedgeStrategist) — Context

**Gathered:** 2026-06-02
**Status:** Ready for planning
**Source:** Reviewed design spec (PRD express path) — `docs/superpowers/specs/2026-06-02-somnia-agent-surface-phase6-design.md` (passed 2-way review: Reality Checker + Frontend Developer; §0 of the spec is the authoritative binding-corrections list).

<domain>
## Phase Boundary

**Module 2** of the abrigo-somnia frontend build. Surface the LIVE, already-deployed Somnia-testnet
`MacroHedgeStrategist` agent (an on-chain consensus-ish macro-hedge *decision* agent) in the d2p
frontend as **four independently-buildable, TDD'd, integration-tested components**.

**Frontend-only — NO Solidity / NO deploy.** The contracts are already deployed + the live e2e ran
green twice (verified in `abrigo-somnia/.planning/STATE.md` 11-03). We read an EXISTING deployment.
</domain>

<decisions>
## Implementation Decisions (LOCKED — see spec §0 for the full binding list)

### Canonical deployment (Somnia testnet, chain 50312 — already live, do NOT deploy)
- `MacroOracle` = `0xAcA75144f644220f1dEAD5F989C350D8e0Cc983f` (keeper-proxy `https://keeper-eta-pied.vercel.app/`)
- `MacroHedgeStrategist` = `0xfA428171E1F5B56f92C67C002De1d8e90B053EE1`
- platform `0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776`; `LLM_AGENT_ID 12847293847561029384`
- Real decisions (CPI=568): consensus=500→ADD_LONG_GAMMA/6800 (tx `0x2a8ec9…36a5`); consensus=900→REDUCE/568 (tx `0x5057f8…3575`).

### Four components (3 reader-parallel + 1 dependent; all gated on Wave 0)
- **Wave 0 (06-00) data layer:** `deployments.json` (from the addresses above — NO deploy); `snapshot.json`
  captured from the REAL tx hashes via viem/RPC (hand-authored decision data is a CROSS-09 violation —
  forbidden); a SEPARATE `SomniaChainId=50312` + `somniaClient` via `defineChain` (do NOT widen the
  5-chain `SupportedChainId`/`publicClients`); the `testnet-agent` provenance tier (NEUTRAL token, NOT
  green) added to `ProvenanceBadge` with `live`/`recorded` sub-state; `reader.ts` seam (snapshot DEFAULT
  / live flagged via SERVER `SOMNIA_LIVE` var, NOT `NEXT_PUBLIC_`); static `import x from './x.json'`
  (Turbopack-safe) + explicit `BigInt`/`Date` rehydration; surprise computed in `BigInt` space.
- **06-01 (D) Live macro-data panel:** latest MacroOracle **CPI** (`co/inflation-rate`) ONLY — capacity-
  utilization is NOT wired (would be fabricated) — + recorded `MacroReceived` history.
- **06-02 (A) Hedge-decision feed:** `HedgeDecisionMade` decisions; `consensus` labeled **operator-
  supplied POC input (not market consensus)**; "surprise" gated behind that caveat; equal visual weight.
- **06-03 (C) agent-first MCP tools:** `get_hedge_decisions(dataKey)` + `get_latest_macro_print(dataKey)`
  on the Phase-4 MCP server — single wrapping `ZodObject` output (never array/union) + dual return
  (content+structuredContent) + NEW envelope in `contract.ts` + edits in `index.ts`/`route.ts` + own
  conformance test.
- **06-04 (B) surprise→decision→instrument bridge** (DEPENDS ON A + module-1): mounts on the simulated
  cCOP/USD instrument page; pin the exact mount branch (it's the `kind==='simulated'` branch).

### Honesty / process
- Provenance copy: "Somnia testnet · agent decision (POC) · consensus = operator-supplied". Soften any
  "consensus-verified" claim. No fabrication; snapshot from real tx only. es-CO-first; locked tokens; no `--no-verify`.
- Snapshot is the PRIMARY (deterministic) test source; live read is optional/flagged and kept OUT of
  default CI (a `@live`/`test.skip(!process.env.SOMNIA_LIVE)` guard).

### Claude's Discretion
- Final route/IA placement for the agent surface; exact reader/fixture field names; component internals.
</decisions>

<canonical_refs>
## Canonical References
- `docs/superpowers/specs/2026-06-02-somnia-agent-surface-phase6-design.md` (THE contract; §0 binding corrections).
- Backend (read-only): `../abrigo/abrigo-somnia/contracts/src/instrument/MacroHedgeStrategist.sol` (HedgeDecision struct/enum/events), `contracts/out/MacroHedgeStrategist.sol/MacroHedgeStrategist.json` + `MacroOracle.sol/MacroOracle.json` (ABIs), `.planning/STATE.md` 11-03 (addresses + tx hashes).
- Frontend reuse: `components/defi/ProvenanceBadge.tsx` (tier union to extend), `lib/mcp-tools/*` + `app/api/mcp/[transport]/route.ts` (MCP pattern for C), `lib/apps/abrigo/instruments.ts` + the instrument detail page (B mounts on the simulated branch), `lib/wagmi/config.ts` (chain setup — keep Somnia SEPARATE), `velite.config.ts`/`next.config.ts` (Turbopack JSON-import + non-collision).
- `./CLAUDE.md` (anti-fishing, es-CO-first, live-verification, 2-way review, no --no-verify).

## Deploy note
Vercel preview env for branch `phase-06-somnia-agent-surface` is set (7 NEXT_PUBLIC_* vars); production env already present. Live Somnia read is server-side behind `SOMNIA_LIVE` (not in default CI/preview).
</canonical_refs>

<deferred>
## Deferred
- Executing decisions on-chain (wrapper/XCHAIN). Mainnet. The faithful Panoptic payoff closed-form (module-1 follow-up). Capacity-utilization macro key (not wired).
</deferred>

---
*Phase: 06-somnia-agent-surface*
*Context gathered: 2026-06-02 (PRD express path from the reviewed spec)*
