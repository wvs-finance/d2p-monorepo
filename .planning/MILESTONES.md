# Milestones

## v2.0 — abrigo-somnia frontend modules (Shipped: 2026-06-08)

**Phases completed:** 12 phases, 57 plans, 45 tasks (Phases 1–9 incl. decimals 03.1/05.1/05.2)

**Key accomplishments:**
- **Foundation + lab + dashboard + MCP** (Phases 1–4): compliant Next.js 16 skeleton (CI gates, locked tokens, next-intl es-CO-first, route groups), research lab + iteration catalog, BFF/data layer + on-chain dashboard, agent surface (MCP/OpenAPI/JSON-LD).
- **Module 1 (05.1):** read-first SIMULATED cCOP/USD long-gamma instrument surface (three-tier provenance, SIMULADO badge, read-only wallet).
- **Module 2 (Phase 6):** live Somnia-testnet hedge-decision agent surface — CPI panel + decision feed + surprise→decision→instrument bridge; `testnet-agent` provenance.
- **Module 3 (Phase 7):** per-decision deterministic decision-pipeline trace + fork-verified/not-live LongGammaWrapper position panel.
- **Module 4 (Phase 8):** mock-driven chatbot-style Scenario-1 cornerstone at `/apps/abrigo/cornerstone` (live-streamed steps, real recorded Agent-1, honest mock Agent-2/mint).
- **Module 5 (Phase 9):** cornerstone live-tx integration — `replay` guaranteed demo artifact + the live two-chain path BUILT & wired (Agent-1 server route vs the live two-leg strategist `0xf0570C…7b1D`; Agent-2 fork mint with D4 chainId override + PKE pin) behind the same `workflow-store` seam; gsd-verifier 7/7, Evidence Collector replay ✓/mock ✓/live ⊘.

**Known Gaps (accepted as tech debt / externally blocked):**
- **Live on-chain RUN ⊘ DEFERRED** — external Somnia validator-callback outage (backend "18-02"); the live path auto-works on recovery with no code change (re-run the Evidence Collector to flip ✓).
- **Backend cross-repo dep:** `--no-mint`/fresh-executor BuildBear provisioning variant needed for a live in-demo Agent-2 mint (filed: `abrigo-somnia/docs/FRONTEND-REQUEST-2026-06-07-strategist-live-deploy.md`, superseded by backend milestone v2.1 deploy).
- **08-03 (if-time, deferred):** MonitorPanel + idb run-history — off the critical path.
- **Vercel deploy:** blocked on missing `NEXT_PUBLIC_*` env vars (pre-existing infra gap); preview/prod deploys fail until set.
- Real-SR (NVDA/VoiceOver) accessibility pass (DEFI-06) — deferred to a manual pass.

**PR:** #8 (`feat/phase-09-cornerstone-live-tx`).

---
