---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
stopped_at: Completed 02-06-PLAN.md
last_updated: "2026-05-12T23:30:00Z"
progress:
  total_phases: 5
  completed_phases: 1
  total_plans: 16
  completed_plans: 14
  percent: 87
---

# Project State: d2p Finance Frontend (d2p/frontend)

**Last updated:** 2026-05-12
**Session type:** Plan execution (02-06 complete)
**Stopped at:** Completed 02-06-PLAN.md

---

## Project Reference

**Core value:** Make the lab's research outputs and live hedging instruments accessible — to humans browsing, to participants transacting, and to AI agents consuming — through a single coherent surface that treats agent-first interaction as a primary design constraint.

**Milestone:** v1 — Uniswap Hook Incubator Cohort 9 Hookathon demo (~June 2, 2026)

**Hard deadline:** ~June 2, 2026 (~3 weeks from initialization). Hackathon demo critical path must ship by end of Phase 2.

---

## Current Position

**Active phase:** 02 — Research Lab Presence and Iteration Catalog
**Active plan:** 08 (Plan 02-06 complete — 7/8 plans complete: 02-01, 02-02, 02-04, 02-05, 02-06, 02-07, 02-06)
**Status:** Executing

**Progress:**
[████████░░] 75%
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
| Phase 02 P01 | 9 | 3 tasks | 30 files |
| Phase 02 P04 | 7 | 3 tasks | 6 files |
| Phase 02 P02 | 9 | 2 tasks | 22 files |
| Phase 02 P05 | 19 | 2 tasks | 14 files |
| Phase 02 P07 | 90 | 3 tasks | 20 files |
| Phase 02 P06 | 90 | 3 tasks | 15 files |

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
| Biome normalizes trailing zeros in OKLCH values (Plan 02-01) | Biome formats 0.10 as 0.1 and 0.40 as 0.4; test regexes must use 0\\.1[0]? pattern to accept both forms | All future CSS token tests must handle biome normalization |
| tsconfig baseUrl required for @/.velite alias (Plan 02-01) | Non-relative path aliases require baseUrl set; added "baseUrl": "." to tsconfig.json | @/.velite alias works without build warnings |
| Wave 0 stubs use test.fixme not test.skip (Plan 02-01) | test.fixme appears in Playwright --list output as planned work; test.skip silences them entirely | All Wave 0 stubs use test.fixme pattern for visibility |
| dev-ai-stage-1-section-j chosen as IN_PROGRESS slug over abrigo-y3-carbon-basket (Plan 02-04) | abrigo README explicitly identifies Section J (ICT) as active Phase 1 analysis; Y3 carbon basket is a separate notebook in a separate directory | Iteration catalog renders correct slug → URL mapping for Section J iteration |
| velite.config.ts notebook_url/dataset_ref/replication_hash made optional (Plan 02-04) | Plan design intent: omit fields when unknown; schema incorrectly had them required. All abrigo SHA-256 values in source files are 63-char hex (not 64 as required by `/^[a-f0-9]{64}$/`), so replication_hash omitted from all 4 iterations | Future iterations: omit replication_hash if no conforming 64-char sha256 available; never invent |
| useQueryState without withDefault for nullable URL filter (Plan 02-05) | withDefault(null) causes TS exactOptionalPropertyTypes collision with nuqs parseAsStringEnum; absence of ?status param natively returns null (show ALL). This is the correct ITER-01 anti-fishing implementation | IterationStatusFilter always uses parseAsStringEnum without withDefault; null = all statuses visible |
| JSON-LD html extracted to variable before JSX return (Plan 02-05) | Biome noDangerouslySetInnerHtml suppression comment only works on single-line JSX elements; multi-line JSX (from long inline expressions) cannot be suppressed by preceding JSX comment | All future JSON-LD in RSC pages must pre-build html string as const before return |
| code field is optional in all iteration component interfaces (Plan 02-05) | velite schema never emits a `code` field; it was mistakenly added as required in Plans 02-02/02-04 components; passing velite Iteration objects caused TS2375 errors | component interfaces must match velite output shape; optional fields not in schema must use `?` |
| contributors.ts is hardcoded TS array seeded from abrigo-analytics git log (Plan 02-07) | No runtime GitHub API fetch per CONTEXT.md; single contributor (Juan Serrano / JMSBPP) confirmed from git shortlog | Team page always renders from static TS array; future contributors added by editing contributors.ts |
| research type_label keys use hyphens not underscores (Plan 02-07) | Velite enum values are 'decision-memo' and 'write-up'; messages file had 'decision_memo' and 'write_up' causing PublicationCard key construction to miss translations | All message keys for Velite-enum-based type labels must match enum values exactly including hyphens |
| PublicationCard optional props typed as T or undefined (Plan 02-07) | exactOptionalPropertyTypes: true rejects `prop?: string` when the value can be `string | undefined`; must use `prop?: string | undefined` | Pattern applies to all components accepting Velite-generated optional fields |
| @/.velite tsconfig path changed from index.ts to index.d.ts (Plan 02-07) | index.ts doesn't exist; incremental tsc crashes at resolveExternalModule when pointing to non-existent file; Next.js TS plugin auto-fixed path to index.d.ts | @/.velite alias always points to .velite/index.d.ts; never to .ts |
| /about excluded from locale-coverage spec (Plan 02-07) | /about route does not exist in Phase 2 app directory; plan listed it but no page was created | locale-coverage.spec.ts covers 6 routes x 2 locales = 12 tests; /about added when that route is built |
| MDX rendering: Velite s.mdx() compile-time over next-mdx-remote runtime (Plan 02-06) | s.mdx() compiles at build time to code string; evaluation is one line `new Function(code)(runtime).default`; zero runtime mdx compiler dependency | All iteration detail MDX rendered via MDXRenderer RSC component |
| velite-shim.ts static require('../.velite/X.json') not dynamic path.resolve (Plan 02-06) | Dynamic path.resolve(process.cwd()) resolved to .next/server/app/(lab)/.velite/ at runtime — wrong. Static relative path lets webpack bundle JSON correctly | All future Velite shims must use static relative require |
| schema-dts + exactOptionalPropertyTypes: use satisfies Record not WithContext type annotation (Plan 02-06) | TS 5.9.3 + exactOptionalPropertyTypes + schema-dts isPartOf union triggers Debug Failure crash; satisfies pattern preserves structural checking without crash | StructuredData.tsx iteration mode drops WithContext annotation |
| DispositionMemo never wrapped in details/accordion — epistemic equality invariant (Plan 02-06) | FAIL status must not de-emphasize the rejection narrative; any collapse or muting is a design violation | Three Playwright tests in iteration-fx-vol-fail + fail-equal-weight enforce this in CI |

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
- **Added (Plan 02-01):** nuqs@2.8.9, IBM Plex Sans + IBM Plex Mono (next/font/google)
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
4. Run Plan 02-06 next

### Phase 2 Planning Order

```
Plan 02-01: Phase 2 foundation (tokens, fonts, Velite research, nuqs, i18n, Wave 0 stubs) — COMPLETE
Plan 02-02: Homepage content (real mission/explainer copy, Velite-derived counts) — COMPLETE
Plan 02-03: Iteration catalog page (/apps/abrigo/iterations, nuqs filter) — COMPLETE (via 02-05)
Plan 02-04: Iteration detail page (evidence chain, JSON-LD) — COMPLETE
Plan 02-05: Iteration MDX seed files + catalog page (pair-d/v1 PASS, fx-vol/v1 FAIL) — COMPLETE
Plan 02-06: Team page (/team, lib/team/contributors.ts) — COMPLETE
Plan 02-07: Publications + Team pages (/research, /team, locale coverage) — COMPLETE
Plan 02-08: Content sync workflow (LAB-04, repository_dispatch trigger)
```

---
*State initialized: 2026-05-11 after roadmap creation*
*Plan 01-01 completed: 2026-05-11*
