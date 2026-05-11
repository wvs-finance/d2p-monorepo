---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: planning
stopped_at: Completed 01-08-PLAN.md (CI quality matrix)
last_updated: "2026-05-11T22:49:15.826Z"
progress:
  total_phases: 5
  completed_phases: 1
  total_plans: 8
  completed_plans: 8
  percent: 100
---

# Project State: WVS Finance Frontend (d2p/frontend)

**Last updated:** 2026-05-11
**Session type:** Plan execution (01-01 complete)
**Stopped at:** Completed 01-08-PLAN.md (CI quality matrix)

---

## Project Reference

**Core value:** Make the lab's research outputs and live hedging instruments accessible — to humans browsing, to participants transacting, and to AI agents consuming — through a single coherent surface that treats agent-first interaction as a primary design constraint.

**Milestone:** v1 — Uniswap Hook Incubator Cohort 9 Hookathon demo (~June 2, 2026)

**Hard deadline:** ~June 2, 2026 (~3 weeks from initialization). Hackathon demo critical path must ship by end of Phase 2.

---

## Current Position

**Active phase:** 02 — Research Lab Presence and Iteration Catalog
**Active plan:** 01 (Phase 1 complete — 8/8 plans)
**Status:** Ready to plan

**Progress:**
[██████████] 100%
[██████████] 100% (8/8 plans complete for Phase 1)
[██████████] Phase 1: Foundation and Scaffold — COMPLETE
[          ] Phase 2: Research Lab Presence and Iteration Catalog
[          ] Phase 3: Data Layer and On-Chain Dashboard
[          ] Phase 4: Agent Surface (MCP)
[          ] Phase 5: Read-First Wallet and DeFi Surface

Overall: 1/5 phases complete

---

## Performance Metrics

| Phase | Plan | Duration (min) | Tasks | Files |
|-------|------|---------------|-------|-------|
| 01 | 01 | 9 | 3 | 30 |

---
| Phase 01 P05 | 5 | 3 tasks | 4 files |
| Phase 01 P07 | 8 | 2 tasks | 9 files |
| Phase 01 P06 | 9 | 3 tasks | 8 files |
| Phase 01 P02 | 9 | 3 tasks | 8 files |
| Phase 01 P03 | 10 | 3 tasks | 15 files |
| Phase 01 P08 | 15 | 3 tasks | 9 files |

## Accumulated Context

### Key Decisions Made

| Decision | Rationale | Phase Impact |
|----------|-----------|--------------|
| CROSS-01 through CROSS-10 assigned to Phase 1, not a separate phase | They are CI enforcement infrastructure, not feature polish. Retrofitting accessibility, i18n, performance budgets, or design-token rules after the fact is 10x more expensive than wiring them in at scaffold time. | Phase 1 scope expanded; all downstream phases are smaller and safer |
| Phase 4 and Phase 5 are parallelizable after Phase 3 | Agent surface (AGENT-*) and DeFi surface (DEFI-*) have no inter-dependencies; both require only Phase 3 BFF routes and Phase 1 wagmi config | Enables time-boxing of final 2 phases together to meet hackathon deadline |
| Demo critical path gates Phase 2 completion | The Hookathon demo requires `/` + `/iterations` + Pair D detail + FX-vol-fail detail — all of which are Phase 2 deliverables. Phase 2 is non-negotiable before the June 2 deadline. | Phase 2 is the milestone gate |
| DEFI-* scope is read-first only in v1 | Transact path requires explicit threat-model review (v2). Wallet connection and per-instrument views are safe to ship without that review. | Phase 5 delivers DEFI-01 through DEFI-07 as read-only |
| Single Next.js app, no monorepo | Per architecture research: monorepo adds cross-package overhead with no isolation benefit at this team size. MCP server is an API route, not a separate service. | Phase 1 scaffolds one app; no workspace bootstrap needed |
| @biomejs/biome@1.9.4 installed (Plan 01-01) | The standalone 'biome' npm package is v0.3.x and unrelated. @biomejs/biome is the correct Biome linter at v1.9.4. | All subsequent plans use pnpm biome check |
| next.config.ts is FINAL after Plan 01-01 | Plans 03/06/07 only create the files it references (i18n/request.ts, velite.config.ts, lib/env.ts); no parallel-write conflict | Eliminates wave-2 edit conflict risk |
| Architecture test uses .test.ts not .spec.ts | Vitest collects .test.ts; Playwright testIgnore covers architecture/ dir — both tools correctly handle it | Clean separation of Vitest vs Playwright test collection |
| iterationSchema exported from velite.config.ts for test isolation | Unit tests import schema directly without triggering Velite build pipeline; @vitest-environment node required due to esbuild TextEncoder invariant in jsdom | Pattern established for all future content schema tests |
| sync-abrigo-content.yml is manual dispatch only in Phase 1 | workflow_dispatch gating prevents accidental runs; Phase 2 adds repository_dispatch trigger from wvs-finance/abrigo and fills rsync copy step | Phase 2 LAB-04 must fill in copy step before workflow is useful |
| JSX test files require .tsx extension | TypeScript cannot parse JSX syntax in .ts files; renamed status-pill.test.ts to .tsx | All future component tests must use .tsx extension |
| Message files use nested JSON objects not flat dot keys (Plan 01-03) | next-intl v4 getTranslations('namespace') expects { namespace: { key: value } } — not flat "namespace.key" strings | All message files in messages/{locale}/ use nested object format |
| LanguageSwitcher uses two adjacent form/button elements (Plan 01-03) | Simpler a11y than dropdown menu: no JS needed, native form submission, keyboard-accessible by default | All locale-switching UI follows this pattern |
| setLocale server action uses revalidatePath not router.refresh (Plan 01-03) | router.refresh causes stale CDN responses on Vercel preview; revalidatePath flushes cache correctly | All server actions that trigger re-render use revalidatePath |
| impeccable v2.1.8 has no --fail-on-error flag; CI relies on exit code (Plan 01-08) | Live --help inspection confirmed only --fast and --json flags exist; binary exits non-zero (code 2) on violations in non-JSON mode | impeccable CI job uses `npx --yes impeccable detect app/` without any flag; exit-code-only enforcement |
| deployment_status event gates test-e2e, a11y, lighthouse (Plan 01-08) | These jobs need the Vercel preview URL; push/PR don't have it. The deployment_status event fires when Vercel preview is ready, providing target_url | Three deployment-dependent jobs only run after successful Vercel preview deploy |

### Critical Path Summary

```
Phase 1 (Foundation) → Phase 2 (Demo path) → [HACKATHON DEMO CUT]
                                            → Phase 3 (Data Layer)
                                                → Phase 4 (Agent MCP)  [parallel]
                                                → Phase 5 (DeFi)       [parallel]
```

### Technical Context

- **Primary chain:** Celo mainnet (deployed instruments); Base, Arbitrum, Optimism as secondary
- **Stack installed (Plan 01-01):** Next.js 16.2.6, React 19.2.4, TypeScript 5.9.3, Tailwind v4.3.0, wagmi v2.19.5 + viem v2.48.11 + RainbowKit v2.2.11, next-intl v4.11.2, Velite v0.3.1, mcp-handler v1.1.0, @biomejs/biome v1.9.4, vitest v4.1.6, @playwright/test v1.60.0, msw v2.14.6, lefthook v2.1.6
- **Deployment target:** Vercel (preview-per-PR, Vercel KV for caching)
- **i18n languages:** `es-CO` (primary, Colombian Spanish) and `en` (secondary)
- **Content source:** Iteration MDX from `../abrigo/scratch/` and `../abrigo/docs/` synced to `frontend/content/iterations/` by CI
- **BFF caching:** Vercel KV (chain reads 30s TTL, HuggingFace 1h TTL, GitHub meta 6h TTL)

### Known Constraints to Track

- `impeccable detect --fail-on-error` must run in CI on every PR (FOUND-07)
- Lighthouse CI LCP < 2.5s on Moto G Power 3G profile (FOUND-08)
- axe-core WCAG 2.2 AA CI enforcement (FOUND-09)
- No Inter / Geist / Mona Sans / Plus Jakarta as typefaces — `impeccable` anti-pattern blocklist
- No purple-to-blue gradients — `impeccable` anti-pattern
- No card-nested-in-card — `impeccable` anti-pattern
- `(lab)` route group must never hydrate wallet state
- Wallet state is client-only — never SSR
- Chat shell (CHAT-*) is v2 scope — not in this milestone
- Transact path (TXN-*) is v2 scope — not in this milestone

### User Setup Items (Non-blocking Deferred)

- **Vercel project:** Create Vercel project, link to GitHub repo, run `vercel link` to create `.vercel/project.json`
- **GitHub repo:** Push scaffold commits to `wvs-finance/frontend` (or chosen repo name)

### Blockers

None currently.

### Open Questions

- What ABI JSON files are currently available in `../abrigo/` Foundry artifacts? (Needed for FOUND-06 in Phase 1 / wagmi CLI codegen)
- Are `../abrigo/scratch/*.md` and `../abrigo/docs/*.md` files ready to sync? (Needed for LAB-03, LAB-04, ITER-05, ITER-06 in Phase 2)
- What is the deployed Celo mainnet contract address for the Abrigo instrument? (Needed for DASH-* in Phase 3 and DEFI-* in Phase 5)

---

## Session Continuity

### How to Resume

1. Read `/home/jmsbpp/apps/d2p/frontend/.planning/ROADMAP.md` — current phase structure and success criteria
2. Read this file — current position and accumulated context
3. Read `/home/jmsbpp/apps/d2p/frontend/.planning/REQUIREMENTS.md` — traceability table shows which requirements belong to the active phase
4. Run Plan 01-02 next

### Phase Planning Order

```
Plan 01-02: Tailwind v4 design tokens (globals.css @theme inline)
Plan 01-03: next-intl i18n infrastructure
Plan 01-04: Route group layout + stub homepage
Plan 01-05: wagmi v2 config + @wagmi/cli scaffold
Plan 01-06: Velite content pipeline schema
Plan 01-07: @t3-oss/env-nextjs full schema
Plan 01-08: CI pipeline (.github/workflows/ci.yml)
```

---
*State initialized: 2026-05-11 after roadmap creation*
*Plan 01-01 completed: 2026-05-11*
