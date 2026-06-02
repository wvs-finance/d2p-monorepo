# Phase 7: Agent reasoning + position-execution surface (Module 3) — Context

**Gathered:** 2026-06-02
**Status:** Ready for designOS UI-phase (then 2-way review → planning)
**Source:** Reviewed design dialogue (this session) → `docs/superpowers/specs/2026-06-02-module3-agent-reasoning-position-surface-design.md` (§0 = binding honesty corrections; pending 2-way review with Reality Checker + Backend Architect/DevOps).

<domain>
## Phase Boundary

**Module 3** of the abrigo-somnia frontend. Surface HOW the `MacroHedgeStrategist` agent thinks through a position (the real two-leg reasoning pipeline) and WHAT its position would become, honestly separating live-on-testnet decisions from the fork-verified-but-not-deployed `LongGammaWrapper` position. Plus a LOCAL honker live-stream spike.

**Frontend-only — NO Solidity, NO deploy.** Read-first; no transact. The backend `LongGammaWrapper` is mid-development (milestone v2.0 Phase 8 ≈ 5/7) and NOT deployed.
</domain>

<decisions>
## Implementation Decisions (LOCKED this session — see spec §0 for the full binding list)

1. **Management posture → designed-but-disabled.** Close/claim/agent-control buttons render visible-but-disabled with an honest "not live — fork-verified, not deployed" state. No fabricated transactions. UX shape fully designed; enable-flip happens when the backend deploys.
2. **Agent thinking → decision-pipeline trace.** macro print → built prompt (deterministic from actual+consensus) → Qwen3-30B temp-0 action leg → size leg → decision → illustrative position; real `SYSTEM_PROMPT` viewable. No fabricated chain-of-thought (LLM output is enum/size-constrained — no free-text rationale exists).
3. **Liveness → snapshot default + flagged poll (`SOMNIA_LIVE`) + WS-ready `refresh()` seam** with an honest pill (`● live` only when subscribed to a live source; else `○ snapshot · —`).
4. **IA → master–detail.** `/apps/abrigo/agent` overview (Phase 6) + new per-decision detail route `/apps/abrigo/agent/[decisionId]` holding the trace + position panel + disabled management.
5. **honker → deliberate now-bet, LOCAL/demo spike only.** Single-host Docker service (Somnia read-only watcher → file-backed SQLite + honker pub/sub → SSE/WS) streaming real decision-pipeline events into the trace via the `refresh()` seam. honker CANNOT run on Vercel serverless (single-host SQLite); production hosting deferred. Alpha dependency — risk contained to local, removable behind the seam.

## Provenance model
- Macro print + decisions + pipeline trace → `testnet-agent` tier (real Somnia tx; Phase 6).
- Position execution (`LongGammaWrapper`) → NEW `fork-verified / not-live` tier (neutral token, NOT green, distinct from testnet-agent).

## Honesty / process
- No fabricated CoT, no fabricated position numbers; live stream carries only real events; only 2 historical decisions exist → feed is event-driven (replays real history + streams new events when the keeper runs), labeled as such.
- ABI imported verbatim from `LongGammaWrapper.json`; reader seam gated behind `WRAPPER_DEPLOYED=false`; live getters only (never stale `recordedStreamia`/`lastSurviving`); `ResidualEroded.cause` advisory only (not a 3-way enum); `realizedCosts`=0 placeholder not surfaced.
- es-CO-first copy (native sign-off in `docs/copy-review.md`); locked tokens; `impeccable detect` + token tests enforced; no `--no-verify`; Somnia 50312 stays a SEPARATE chain/client; static JSON import + BigInt/Date rehydration; live reads behind `SOMNIA_LIVE`, OUT of default CI.
- **2-way review** must include Reality Checker + Backend Architect/DevOps (always-on SQLite/Docker service + alpha dep) before planning; add Frontend Developer for the UI-SPEC.

## Claude's Discretion
- Pipeline-trace visual form (stepper vs flow), disabled-button treatment, liveness-pill design — resolved in `gsd:ui-phase` → `UI-SPEC.md`.
</decisions>

<canonical_refs>
## Canonical References
- `docs/superpowers/specs/2026-06-02-module3-agent-reasoning-position-surface-design.md` (THE spec; §0 binding).
- Backend (read-only): `../abrigo/abrigo-somnia/contracts/src/instrument/MacroHedgeStrategist.sol` (two-leg reasoning, SYSTEM_PROMPT, events); `contracts/out/LongGammaWrapper.sol/LongGammaWrapper.json` (ABI — verbatim); `contracts/out/MacroHedgeStrategist.sol/*.json`. Backend active branch `feat/macro-hedge-agent`, milestone v2.0 Phase 8 ≈ 5/7 (wrapper NOT deployed).
- Frontend reuse: `components/defi/ProvenanceBadge.tsx` (tier union — add `fork-verified/not-live`); `lib/apps/abrigo/somnia/reader.ts` + `chain.ts` + `abi.ts` (Phase-6 seam to extend); `app/(defi)/apps/abrigo/agent/page.tsx` (overview to link from); `messages/{es-CO,en}/somnia.json` (namespace to extend).
- honker: `https://github.com/russellromney/honker` (alpha; Node bindings; Dockerfile; single-host file-backed SQLite, no `:memory:`).
- `./CLAUDE.md` (anti-fishing, es-CO-first, live-verification, 2-way review, no --no-verify).
</canonical_refs>

<deferred>
## Deferred
- Production hosting of the honker service (gated on backend deploy + continuous keeper + UX validation); indexer/SQL data layer (only at scale, same `refresh()` seam swap-in); real position management (wallet write/transact, until wrapper deploys); XCHAIN-01 Somnia→Base wiring (backend-deferred).
</deferred>

---
*Phase: 07-agent-reasoning-position-surface*
*Context gathered: 2026-06-02 (design dialogue → spec; designOS track)*
