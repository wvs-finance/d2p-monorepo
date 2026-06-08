# Phase 3: Data Layer and On-Chain Dashboard - Context

**Gathered:** 2026-05-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the BFF API route that aggregates live on-chain Abrigo protocol state across the configured chains, the app-scoped dashboard page that renders it, the chain selector, and the umbrella `/status` page. This unblocks the Phase 4 agent (MCP) layer, which wraps these routes.

**Scope narrowed by two decisions made during this discussion (see below):** the dashboard renders **on-chain protocol state only** — the econometric chart suite (DASH-02/05/06) is **descoped**, consistent with the 2026-05-13 IA correction that removed the per-iteration econometric exercise from the public site. And because **no Abrigo contracts are deployed yet**, the dashboard ships around a labelled schema-preview/skeleton state with the BFF + multicall plumbing wired and ready to light up when addresses exist.

</domain>

<decisions>
## Implementation Decisions

### Dashboard content scope
- **On-chain protocol state ONLY.** Pool balances, settlement-event counts, LP-position counts, last-block-synced — per chain, per deployed Abrigo instrument.
- **DASH-02 (HuggingFace econometrics BFF route), DASH-05 (visx β + 95% CI charts), DASH-06 (chart a11y) are DESCOPED.** They re-introduce the econometric exercise that the IA correction removed. Econometrics reach the public only as finished papers on `/research` + X. No HuggingFace dataset read, no Parquet parsing, no visx econometric charts in this phase.
- Net Phase 3 requirement set: **DASH-01, DASH-03, DASH-04, DASH-07, DASH-08** (DASH-02/05/06 descoped).

### Contract availability (drives everything)
- **No Abrigo contracts are deployed on-chain yet** (any network). The dashboard must not invent numbers.
- Build the BFF route + viem multicall aggregation **fully**, reading from a typed registry of instrument addresses that is currently **empty** (or holds a documented placeholder). When addresses are added later, the dashboard lights up with zero further UI work.
- The instrument-address registry is the single seam: today empty → skeleton state; later populated → live reads.

### Dashboard URL location
- **`/apps/abrigo/dashboard`** — app-scoped, under the `(apps)` route group. Matches DASH-03 and the "Panel en vivo / Live dashboard — Próximamente Fase 3" teaser already shipped on `/apps/abrigo`.
- NOT a root `/dashboard` (the ROADMAP success-criteria #1 wording is superseded by the labs/apps architecture — the umbrella stays app-agnostic).
- `/status` remains **umbrella-scoped** at `/status` (DASH-08).

### Empty / pre-deployment state
- **Schema preview / skeleton.** Render the real dashboard layout with labelled metric tiles whose values are dashed/empty (e.g., "Pool balance —", "Settlement events —", "Last block synced —") plus a clear "Live once contracts deploy" banner.
- Shows visitors and judges WHAT will be shown without implying it is live. No fake/example numbers (anti-fishing posture — do not mislabel demo data as live).

### Chain coverage at launch
- **All 5 wagmi chains** in the selector: Celo (primary), Ethereum, Base, Arbitrum, Optimism — each rendering the empty/skeleton state until that chain has deployed instruments.
- Demonstrates multi-chain readiness; the chain selector (DASH-04) uses `nuqs` URL params (`?chain=celo`) so state is shareable and agent-readable.

### Read-first / no-JS (DASH-07)
- Dashboard renders meaningful content (the skeleton + any live reads) on first paint with **no wallet, no chain connection, and no client hydration required**. RSC + server-side multicall; the chain selector is the only interactive (nuqs) piece.

### `/status` page (DASH-08)
- Reports: RPC health per chain (all 5), build hash (`VERCEL_GIT_COMMIT_SHA`), indexer/data freshness timestamp, and a per-app health rollup (today just Abrigo). HuggingFace dataset version line is **dropped** (econometrics descoped).
- Must respond even when one chain's RPC is degraded — show which chains are healthy vs not (graceful per-chain degradation, no all-or-nothing failure).

### Claude's Discretion
- Exact skeleton-tile visual treatment (within locked tokens: muted ochre, IBM Plex, no anti-patterns).
- Multicall batching strategy and per-chain error isolation.
- Whether `/status` is an RSC page or a JSON route + thin page (it serves both humans and agents).
- Caching approach — see canonical refs note; likely a no-op until contracts deploy.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents (researcher, planner) MUST read these before planning or implementing.**

### Phase requirements & scope
- `.planning/ROADMAP.md` §"Phase 3: Data Layer and On-Chain Dashboard" — goal, success criteria, dependency on Phase 1
- `.planning/REQUIREMENTS.md` DASH-01..08 — note DASH-02/05/06 are DESCOPED per this CONTEXT
- `.planning/REQUIREMENTS.md` §"Abrigo App" IA-correction note (2026-05-13) — why econometrics are off the public site

### Architecture & design (locked)
- `~/.claude/projects/-home-jmsbpp-apps-d2p-frontend/memory/labs_umbrella_architecture.md` — labs/apps URL scheme + the IA correction; dashboard is app-scoped at `/apps/abrigo/dashboard`
- `~/.claude/projects/-home-jmsbpp-apps-d2p-frontend/memory/visual_design_reference.md` — muted ochre `oklch(0.6 0.08 70)`, IBM Plex, status pills color+icon+text, anti-fishing equal-weight
- `./CLAUDE.md` — Evidence Collector live-verification gate after each task; locked-token rules

### Existing code to build on (see code_context)
- `lib/wagmi/config.ts` — the 5 chains + fallback transports to reuse for server-side reads
- `lib/env.ts` — the 5 `NEXT_PUBLIC_RPC_*` vars
- `app/api/health/route.ts` — route-handler + build-hash pattern to mirror for `/status`
- `app/(apps)/layout.tsx` — NuqsAdapter already wraps `(apps)`; the dashboard inherits it

### Platform note (researcher: verify before specc'ing caching)
- DASH-01 text says "Vercel KV cache". **Vercel KV is no longer offered** (per current Vercel platform docs — replaced by Marketplace Redis e.g. Upstash, or the Vercel Runtime Cache API). With no contracts deployed there are no live reads to cache at launch, so caching is likely a **no-op / deferred** until addresses exist. If/when needed, prefer the Vercel Runtime Cache API or a Marketplace Redis integration — NOT `@vercel/kv`.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/wagmi/config.ts` — exports `chains = [celo, mainnet, base, arbitrum, optimism]` and per-chain `fallback([http(primary), http(public)])` transports. The BFF route can reuse these transports for server-side `createPublicClient` + multicall instead of re-declaring RPCs.
- `lib/env.ts` — typed `NEXT_PUBLIC_RPC_*` env (Zod-validated). No KV/HuggingFace/Upstash vars exist yet; adding any requires an `lib/env.ts` schema entry.
- `app/api/health/route.ts` — minimal `force-dynamic` route handler reading `VERCEL_GIT_COMMIT_SHA`; the `/status` build-hash + per-subsystem JSON pattern mirrors this.
- `StatusPill` (color+icon+text) — reuse for per-chain RPC health on `/status` and "coming soon" affordances.

### Established Patterns
- Route groups: `(lab)` RSC pages (no wallet), `(apps)` wraps NuqsAdapter (client island for URL state), `(dashboard)` and `(defi)` groups exist as Phase-1 scaffolds. **Open question for planner:** the dashboard now lives under `(apps)` at `/apps/abrigo/dashboard`, so the empty `(dashboard)` route group may be repurposed for `/status` or removed. Confirm during planning.
- nuqs URL state is the established pattern for shareable/agent-readable params (was used by the now-deleted IterationStatusFilter); the chain selector follows the same approach.
- Velite/`@/.velite` static-import shim pattern + `prebuild` velite build — not relevant to Phase 3 (no content), but the Turbopack bundling lessons (static imports, force-static caveats) inform any server-data wiring.

### Integration Points
- New BFF route(s): `app/api/dashboard/route.ts` (DASH-01) and likely `app/api/status/route.ts` (DASH-08).
- New pages: `app/(apps)/apps/abrigo/dashboard/page.tsx` (DASH-03) and `app/.../status` or `app/(dashboard)/status/page.tsx` (DASH-08, umbrella-scoped).
- New typed instrument-address registry (empty today) — the seam between "skeleton state" and "live reads". Likely `lib/apps/abrigo/instruments.ts` or similar.
- The `/apps/abrigo` page's "Live dashboard" teaser should link to `/apps/abrigo/dashboard` once it exists (currently a non-link teaser).

</code_context>

<specifics>
## Specific Ideas

- The dashboard must be **honest about being pre-launch** — skeleton with dashed values + "live once contracts deploy", never fabricated numbers. This is the anti-fishing discipline applied to the data layer.
- The instrument-address registry being empty should produce the skeleton state *automatically* — the same code path that will later render live data, just with zero instruments. No separate "coming soon" hardcode that diverges from the real renderer.
- `/status` should degrade per-chain: one RPC down must not blank the whole page.

</specifics>

<deferred>
## Deferred Ideas

- **Econometric charts on the dashboard (visx β + 95% CI, replication overlays)** — DASH-05/06, descoped here per the IA decision. If ever wanted, they belong on `/research` as published-finding visuals, not the dashboard. Revisit only if the user reopens the econometrics-on-site question.
- **HuggingFace econometrics BFF route** — DASH-02, descoped. Would return to scope only alongside the above.
- **Live caching layer (Vercel Runtime Cache / Marketplace Redis)** — build when contracts deploy and there are real reads to cache; no-op until then.
- **Per-instrument deep pages** (`/apps/abrigo/instruments/{id}/{chain}`) — that's DEFI-03, Phase 5.

</deferred>

---

*Phase: 03-data-layer-and-on-chain-dashboard*
*Context gathered: 2026-05-13*
