# Phase 2: Research Lab Presence and Iteration Catalog — Context

**Gathered:** 2026-05-12
**Status:** Ready for planning
**Mode:** Auto — all gray areas resolved with recommended defaults

<domain>
## Phase Boundary

Phase 2 delivers the **hackathon demo critical path** — the live URLs a Uniswap Hook Incubator judge will visit at https://www.d2pfinance.xyz/:

1. **`/`** — Lab umbrella homepage (already scaffolded in Phase 1; Phase 2 fills with real mission/explainer content)
2. **`/apps/abrigo/iterations`** — Iteration catalog with every (Y, M, X) iteration, all statuses visible
3. **`/apps/abrigo/iterations/pair-d/v1`** — Pair D PASS detail (β = +0.137, p ≈ 1.5×10⁻⁸)
4. **`/apps/abrigo/iterations/fx-vol-on-cpi-surprise/v1`** — CLOSED FAIL detail (β̂ = −0.000685, 90% CI ⊃ 0)
5. **`/research`** — Publications + decision memos
6. **`/team`** — Contributors
7. **`/about`** — Anti-fishing discipline / methodology

**In scope:** Real content authored in es-CO + en for every page; Velite-managed MDX collection for iterations; lightweight inline SVG for β + CI visualization; GitHub Actions content-sync workflow from `../abrigo/`; iteration catalog grid + filter (status filter optional but defaults to "show all"); per-iteration JSON-LD; replication-hash UX with inline verify instructions; ContributorCard + PublicationCard + NumberedStep + CheckmarkList components from UI-SPEC.

**Out of scope (later phases):**
- Real on-chain dashboard with viem multicall (Phase 3, DASH-*)
- BFF API routes (Phase 3, DASH-01/02)
- Visx-based statistical charts (Phase 3 wires real charts; Phase 2 uses lightweight SVG)
- MCP tool implementations (Phase 4, AGENT-*)
- Wallet UI / RainbowKit / transact path (Phase 5, DEFI-*)

</domain>

<decisions>
## Implementation Decisions

### Iteration content authoring strategy
- **Velite-managed `content/iterations/{slug}/v{n}.mdx`** is the source of truth for iteration data (FOUND-04 schema already locked in Phase 1).
- **Two real iterations seeded manually in Phase 2**:
  - `content/iterations/pair-d/v1.mdx` — PASS status, content synthesized from `/home/jmsbpp/apps/d2p/abrigo/abrigo-analytics/notebooks/pair_d_stage_2_path_a/` + `scratch/2026-04-30-stage-2-m-sketch-dispatch-brief-pair-d.md` + `scratch/simple-beta-pair-d/`
  - `content/iterations/fx-vol-on-cpi-surprise/v1.mdx` — FAIL status, content synthesized from `notebooks/fx_vol_cpi_surprise/` (closed-fail disposition memo required by Velite refine() rule)
- Plan 06's sample iteration MDX (`content/iterations/sample/v1.mdx`) is **deleted** in Phase 2 — it's a Phase 1 fixture, no longer needed.
- **GitHub Actions sync workflow** (LAB-04) is exercised for real in Phase 2 — Phase 1 scaffolded the YAML with `workflow_dispatch:` only; Phase 2 expands the trigger to also run on push to `../abrigo` main when iteration MDX files change, and adds path filtering so only relevant changes trigger.
- **Authoring rule (carries the anti-fishing discipline):** The Phase 2 author MUST read the corresponding abrigo notebooks/scratch files before composing iteration MDX. Do NOT paraphrase from memory or use placeholders. Real β / CI / p-value / N / replication_hash values come from the abrigo decision memos. If a value is unknown, the field is omitted (Velite schema allows beta/ci/p_value/sample_size as optional); never invented.

### Evidence chain visualization
- **Lightweight inline SVG horizontal range bar** for β + 95% CI display on the iteration detail page. Single SVG component, ~30 lines, no chart library dependency.
- Visx is deferred to Phase 3 per STACK.md (it's overkill for a single β-CI viz; will be wired for the multi-series chain dashboard in Phase 3).
- The SVG renders: horizontal axis with min/max scaled to ±1.5 × max(|ci_lower|, |ci_upper|); β point as a filled circle in muted ochre; CI bounds as a horizontal whisker with caps; a vertical reference line at 0 (the null); WCAG AA contrast against cream background; `aria-label` summarizing "β = X, 95% CI [Y, Z]"; sr-only data table mirroring the visual.

### Publications page content source
- **Velite-managed `content/research/*.mdx`** collection (mirrors iterations pattern; new Velite schema added).
- Schema fields: `slug`, `title_es`, `title_en`, `authors[]`, `date`, `type` (paper / decision-memo / write-up / talk), `external_url` (optional, for arxiv / preprint), `summary_es`, `summary_en`, `tags[]`.
- Phase 2 seeds with 3 real entries synced from abrigo:
  - Pair D Stage 2 M-sketch dispatch brief (decision-memo) — `scratch/2026-04-30-stage-2-m-sketch-dispatch-brief-pair-d.md`
  - FX-vol-on-CPI-surprise closed-fail disposition (decision-memo)
  - Abrigo Y₃ × Carbon basket investigation (write-up)
- More entries added by the sync workflow as they appear in `../abrigo/scratch/`.

### Replication hash verification UX
- **Inline expanded `<details>` section** on each iteration detail page titled "How to verify this hash" (es-CO: "Cómo verificar este hash"). Default collapsed.
- Content: copy-to-clipboard code blocks showing the exact `git clone ... && cd abrigo-analytics && make verify ITER={slug}` commands. Multi-line code with monospace font (IBM Plex Mono from UI-SPEC).
- Avoids modal context switch and external-link bounce. Supports keyboard expand/collapse via native `<details>` element.
- The replication_hash itself is rendered by the `<ReplicationHash>` component (UI-SPEC defined) with truncated display + full hash in `aria-label` + copy button.

### Team page data source
- **Hardcoded `lib/team/contributors.ts`** with typed TS array. Each entry: `{ slug, name, role_es, role_en, github_handle, focus_iteration_slug }`.
- No GitHub API fetch (build-time or runtime). The team list rarely changes; runtime/build fetch adds complexity, caching, and possible rate-limit failures for zero benefit.
- Phase 2 seeds with the actual contributors of `wvs-finance/abrigo-analytics` (read from `git log` of that repo + GitHub API ONCE during authoring to populate the static file).

### Pair D + FX-vol content fidelity
- **Real content excerpts grounded in abrigo source files** — NEVER placeholder lorem ipsum, NEVER paraphrased-from-memory.
- The author of each iteration MDX reads `/home/jmsbpp/apps/d2p/abrigo/abrigo-analytics/notebooks/{slug}/03_tests_and_sensitivity.ipynb` (or equivalent) + the disposition memo in `scratch/` and synthesizes a 3-section narrative: **Spec → Data → Estimation → Tests → Disposition** (the 5-step "decision-citation block" pattern from the lab's anti-fishing discipline).
- Each section is 100–200 words in es-CO + parallel en. No marketing prose; the register is "Princeton Economic Journal abstract."
- Charts and tables embedded in the MDX are inline SVG (no external libs at this phase).

### Status filter behavior on `/apps/abrigo/iterations`
- **Default state: ALL statuses visible, no filter applied.** This matches the epistemic-honesty invariant from ROADMAP.md ("no filter excludes FAIL or PARKED by default").
- Filter UI is a horizontal pill row above the grid: `[All N] [PASS n] [FAIL n] [PARKED n] [IN_PROGRESS n]`. Active pill has the muted-ochre underline (UI-SPEC active-nav style); inactive pills are text-text-muted.
- URL state: `?status=fail` etc. via `nuqs` (already locked in Plan 03-04 for dashboard — same lib here).
- Filter is **explicitly opt-in**, never opt-out — the user must click PASS to hide FAILs.
- ARIA: `<nav aria-label="Filter iterations by status">` wrapping the pill row.

### About page content composition
- **Single long-form RSC page** (no client-side accordion, no FAQ collapse) at `/about`.
- Structure:
  1. Hero (sparse): one-line headline + short subheading
  2. NumberedStep × 5 — the lab's anti-fishing discipline as five sequential steps: 01 Pre-commit specs → 02 Pull data → 03 Estimate → 04 Tests + sensitivity → 05 Disposition memo (PASS or FAIL)
  3. CheckmarkList — the 4 invariants: "decision-citation block before every test", "trio checkpoint after every code cell", "HALT + disposition memo on spec/data conflict", "rejection carries equal narrative weight as approval"
  4. Methodology references — links to abrigo-analytics README anchors, "abrigo Operating Framework" memory bank in abrigo, the cfmm-lean formalization
- Authored both locales side-by-side.

### Mobile responsive composition (filling UI-SPEC gaps)
- **`IterationDetailHeader`** at `<sm`: title → status pill → version stacked vertically; spacing `gap-3` between rows; status pill remains right-aligned via flex.
- **Iteration catalog grid**: 1 col at base, 2 col at `sm` (640px+), 3 col at `lg` (1024px+).
- **EvidenceChain block**: at `<sm`, the four metrics (β, CI, p-value, N) stack vertically with explicit row labels in metadata typography (12px Plex Sans).
- **NumberedStep**: at `<sm`, the number column stacks above the title row, NOT next to it. Number stays the same size (Display weight 600), title becomes H3.

### Dark mode token migration (filling UI-SPEC gap)
- The Phase 1 `.dark` block in `app/globals.css` is updated alongside the Phase 2 `:root` migration to hue 70-80.
- Specifically:
  - `--color-bg-canvas` dark: `oklch(0.13 0.015 70)` (ink-on-charcoal, warm-tinted, NOT pure black)
  - `--color-bg-elevated` dark: `oklch(0.18 0.013 70)`
  - `--color-text-primary` dark: `oklch(0.93 0.005 80)`
  - `--color-text-muted` dark: `oklch(0.68 0.01 75)`
  - `--color-accent-default` dark: `oklch(0.7 0.10 70)` (slightly brighter/more saturated for contrast against dark canvas)
  - Status colors brightened by ~0.20 lightness for dark mode (Phase 1 already established this pattern; Phase 2 just shifts the hue)
- WCAG AA verified by `tests/unit/tokens.test.ts` contrast assertions extended to dark-mode pairs.

### Spacing scale 5xl token (filling UI-SPEC gap)
- `--spacing-5xl: 120px` added to `app/globals.css` `@theme inline` block. Maps to Tailwind utility class `py-5xl`, `mt-5xl`, etc.
- No more `py-[120px]` arbitrary-value brackets in component code.
- The 80px (`4xl`) is already a token; Phase 2 just adds `5xl` for the hero section vertical rhythm.

### Claude's Discretion
The planner has latitude on:
- Exact directory structure under `content/research/` and `lib/team/`
- Specific filenames for new components (UI-SPEC names are suggestions, not requirements — `IterationCatalogCard.tsx` is fine, so is `IterationCard.tsx` if scope-clearer)
- Whether to use Server Actions for the filter (Phase 1 already uses them for locale; consistent pattern) or a Client Component with `nuqs` directly
- Exact OpenGraph image generation strategy — could be a static asset, could be a Next.js OG image generator route (Phase 4 might need OG images anyway; Phase 2 can use static SVG-to-PNG)
- Loading skeleton designs (must satisfy LCP budget and reduced-motion preference, but composition is flexible)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents (researcher + planner) MUST read these before planning or implementing.**

### Phase-level specs
- `/home/jmsbpp/apps/d2p/frontend/.planning/PROJECT.md` — Information Architecture, locked accent (muted ochre), Key Decisions table
- `/home/jmsbpp/apps/d2p/frontend/.planning/REQUIREMENTS.md` §Research Lab Presence (LAB-01..06) and §Abrigo App Overview + Iteration Catalog (ITER-01..09, APP-01)
- `/home/jmsbpp/apps/d2p/frontend/.planning/ROADMAP.md` §Phase 2 — Goal + success criteria
- `/home/jmsbpp/apps/d2p/frontend/.planning/phases/02-research-lab-presence-and-iteration-catalog/02-UI-SPEC.md` — **PRIMARY DESIGN CONTRACT** — visuals, spacing, typography, components, copy register. Researcher and planner must read this END-TO-END before writing any task.

### Memory references (cross-session)
- `/home/jmsbpp/.claude/projects/-home-jmsbpp-apps-d2p-frontend/memory/visual_design_reference.md` — panoptic.xyz structural reference + LOCKED muted ochre
- `/home/jmsbpp/.claude/projects/-home-jmsbpp-apps-d2p-frontend/memory/labs_umbrella_architecture.md` — URL scheme `/apps/abrigo/iterations/{slug}/v{n}` + Apps registry pattern
- `/home/jmsbpp/.claude/projects/-home-jmsbpp-apps-d2p-frontend/memory/feedback_visual_first.md` — Ship-visible-now preference
- `/home/jmsbpp/.claude/projects/-home-jmsbpp-apps-d2p-frontend/memory/design_tooling.md` — Impeccable CLI in CI as design quality gate
- `/home/jmsbpp/.claude/projects/-home-jmsbpp-apps-d2p-frontend/memory/production_domain.md` — d2pfinance.xyz live (used for canonical URLs in JSON-LD)

### Phase 1 artifacts (consume, don't replace)
- `/home/jmsbpp/apps/d2p/frontend/.planning/phases/01-foundation-and-scaffold/01-CONTEXT.md` — Locked decisions (i18n strategy, design tokens, route groups, etc.)
- `/home/jmsbpp/apps/d2p/frontend/.planning/phases/01-foundation-and-scaffold/01-VALIDATION.md` — Per-requirement test commands (NAV-* tests still valid; Phase 2 reuses pattern for LAB-* and ITER-*)
- `/home/jmsbpp/apps/d2p/frontend/velite.config.ts` — Existing iteration schema (Phase 2 extends with a `research` collection)
- `/home/jmsbpp/apps/d2p/frontend/app/globals.css` — Phase 1 tokens (Phase 2 migrates hue 165 → 70-80 per UI-SPEC token migration block)

### Research artifacts (whole-project)
- `/home/jmsbpp/apps/d2p/frontend/.planning/research/STACK.md` — Locked stack (Visx deferred to Phase 3 confirmed here)
- `/home/jmsbpp/apps/d2p/frontend/.planning/research/PITFALLS.md` — 46 anti-patterns; Phase 2 must close the "selecting only PASS iterations" pitfall (#16), the "marketing-style hero" pitfall (#17), the "PDFs only" pitfall (#19 — publications must be agent-readable MDX, not PDF blobs)
- `/home/jmsbpp/apps/d2p/frontend/.planning/research/FEATURES.md` — Confirms iteration catalog + research lab features are table stakes

### Sibling repo references (read-only consumption — NOT modified by Phase 2)
- `/home/jmsbpp/apps/d2p/abrigo/abrigo-analytics/notebooks/pair_d_stage_2_path_a/` — Pair D PASS notebooks (spec → data → estimation → tests). Author reads `03_tests_and_sensitivity.ipynb` to compose Pair D MDX.
- `/home/jmsbpp/apps/d2p/abrigo/abrigo-analytics/scratch/2026-04-30-stage-2-m-sketch-dispatch-brief-pair-d.md` — Pair D dispatch brief
- `/home/jmsbpp/apps/d2p/abrigo/abrigo-analytics/scratch/simple-beta-pair-d/` — Simple β estimation results for Pair D
- `/home/jmsbpp/apps/d2p/abrigo/abrigo-analytics/notebooks/fx_vol_cpi_surprise/` — FX-vol-on-CPI-surprise FAIL notebooks
- `/home/jmsbpp/apps/d2p/abrigo/abrigo-analytics/scratch/` (whole dir) — Other decision memos for `/research` page seed entries
- `https://github.com/wvs-finance` — Org metadata for `/team` (contributors) and footer links

### Phase 1 components (REUSE, do not replace)
- `/home/jmsbpp/apps/d2p/frontend/components/StatusPill.tsx` — Color + icon + text per CROSS-09; reused on every status indicator
- `/home/jmsbpp/apps/d2p/frontend/components/IterationCountTile.tsx` — Reused on `/` homepage (Phase 2 hardcoded counts replaced by Velite-derived counts via `content/iterations` query)
- `/home/jmsbpp/apps/d2p/frontend/components/TopNav.tsx` + `AppsDropdown.tsx` + `MobileMenuToggle.tsx` — Persist across every Phase 2 page
- `/home/jmsbpp/apps/d2p/frontend/components/LanguageSwitcher.tsx` — Persist
- `/home/jmsbpp/apps/d2p/frontend/components/StructuredData.tsx` — Extended in Phase 2 to emit `Dataset` + `ScholarlyArticle` per iteration page (currently emits `WebSite` + `Organization` only)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets (built in Phase 1)
- **`<StatusPill status="PASS|FAIL|PARKED|IN_PROGRESS" label="...">`** — color + icon + text encoding; reuse on iteration catalog cards + iteration detail header + status filter pills
- **`<IterationCountTile>`** — for the homepage. Phase 2 wires it to count rows in the Velite `iterations` collection at build time instead of the Phase 1 hardcoded counts
- **`<TopNav>` + `<AppsDropdown>` + `<MobileMenuToggle>`** — already global. Phase 2 doesn't touch these unless polish is needed
- **`<LanguageSwitcher>` + `app/actions/set-locale.ts`** — cookie-based locale, both locales authored side-by-side
- **`<StructuredData>`** — extended for new schema types
- **`lib/format/{currency,date,number}.ts`** — locale-aware Intl wrappers, used for iteration `analysis_date` formatting
- **`lib/apps/registry.ts`** — read-only consumer in Phase 2; the AppsDropdown already uses it
- **`velite.config.ts` iterations schema** — extended with `research` collection; iteration schema itself is unchanged
- **`messages/{es-CO,en}/{common,lab,nav}.json`** — extended with `messages/{es-CO,en}/{iterations,research,team,about}.json` (per-route namespaces)

### Established Patterns
- **Route groups**: `(lab)` for `/`, `/research`, `/team`, `/about`. `(apps)` for `/apps/abrigo/*`. NO wallet imports in either — architecture test enforces.
- **i18n**: `getTranslations()` from `next-intl/server` in RSC; `useTranslations()` in client components. Cookie-only locale (no URL prefix). Both locales authored.
- **Content via Velite**: typed MDX with Zod-validated frontmatter. New collections follow the same pattern as `iterations`.
- **Design tokens**: `app/globals.css` with `:root` + `.dark` value sets + `@theme inline` Tailwind bridge. Phase 2 migrates hue + adds `5xl` spacing.
- **Server actions for cookie state**: `app/actions/set-locale.ts` pattern is the template for any new server-side cookie writes (e.g., a status-filter persistence — but Phase 2 keeps filter state in URL via `nuqs`, no server action needed).
- **JSON-LD via `<StructuredData>` in `<head>`**: extended with iteration-specific Dataset + ScholarlyArticle blocks; XSS escape via `JSON.stringify(...).replace(/</g, '\\u003c')`.
- **Pre-commit hooks (lefthook)**: biome + tsc + velite content validation. Any new content/* file must pass Velite schema at commit time.

### Integration Points
- **GitHub Actions content sync** — `.github/workflows/sync-abrigo-content.yml` was scaffolded with `workflow_dispatch:` only in Phase 1. Phase 2 expands the trigger to also run on push to abrigo `main` with path filter (only iteration MDX changes trigger). Output: PR opened against d2p-frontend with synced files; merge gate is the regular CI (lint/typecheck/test:unit/etc).
- **Velite build → `.velite/`** — generated TS index files (`iterations.ts`, `research.ts`) imported by RSC pages. Build step `pnpm velite build` runs in CI before `pnpm tsc --noEmit`.
- **`content/iterations/{slug}/v{n}.mdx`** — file path determines URL slug + version. The Velite schema validates the regex; the URL router uses `[slug]/v[n]` segments.
- **JSON-LD canonical URL** — uses `process.env.NEXT_PUBLIC_APP_URL` (set in Vercel for Production scope to `https://d2pfinance.xyz`); falls back to `${VERCEL_URL}` for Preview deploys.

</code_context>

<specifics>
## Specific Ideas

- **Author's voice reference:** Anti-fishing discipline tone is established in `/home/jmsbpp/apps/d2p/abrigo/abrigo-analytics/README.md` and `CLAUDE.md`. Phase 2 copy mirrors that register — "Pair D PASS: β = +0.137, p ≈ 1.5×10⁻⁸. Stage-2 M-sketch unblocked." — direct, evidence-cited, no marketing.
- **Hero composition pattern** (from panoptic + memory): centered logo lockup → headline (line-broken for emphasis) → subheading → primary CTA. Apply to `/` and `/apps/abrigo` overview (already exists from Phase 1; Phase 2 may polish).
- **Numbered-step pattern** (from panoptic + memory): apply to `/about` methodology section ONLY. The 5-step anti-fishing discipline maps naturally.
- **Iteration detail layout proposal:** Two-column at `≥lg`: left column 60% (narrative — spec, data, estimation, tests, disposition), right column 40% sticky (status pill, β/CI evidence chain, replication hash, notebook URL, dataset_ref, analysis_date). Mobile: single column, evidence chain block immediately after the header.
- **FAIL iteration treatment:** The `<DispositionMemo>` component (UI-SPEC) is the heart of the FAIL page — it renders the closed-fail reasoning at the SAME visual weight as PASS pages. No collapse, no de-emphasis, no muted color. The DispositionMemo is a section, not an accordion.

</specifics>

<deferred>
## Deferred Ideas

- **Iteration search / full-text** — Pagefind or similar. Phase 2 has 6-12 iterations max; filter pills are sufficient. Add search if iteration count grows past ~20.
- **OpenGraph image generation route** (`@vercel/og`) — Phase 2 ships static SVG OG cards. Dynamic per-iteration OG via Next.js OG route is Phase 4 (when MCP needs polished agent-visible cards).
- **Notebook iframe embed** on iteration detail — currently a link to the GitHub notebook URL. Iframe embedding nbviewer/Colab is a stretch goal; defer until user feedback says it matters.
- **Subscribe / RSS for iterations** — RSS feed for new iteration verdicts. Deferred to v2 (NOTIF-01 in REQUIREMENTS.md).
- **Comments / annotations on iterations** — Out of scope (lab is not a discussion forum).
- **Per-iteration analytics** — Vercel Web Analytics installed in Phase 4 if/when MCP needs to know agent traffic patterns.

</deferred>

---

*Phase: 02-research-lab-presence-and-iteration-catalog*
*Context gathered: 2026-05-12*
*Auto mode: 0 user questions; all decisions resolved from UI-SPEC + PROJECT.md + memory + Phase 1 patterns*
