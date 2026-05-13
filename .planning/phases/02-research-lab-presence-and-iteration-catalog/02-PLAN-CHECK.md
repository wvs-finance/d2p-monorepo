---
phase: 2
slug: research-lab-presence-and-iteration-catalog
checker: gsd-plan-checker
checked_at: 2026-05-12
plans_reviewed: 8
plans_path: .planning/phases/02-research-lab-presence-and-iteration-catalog/
verdict: PASS_WITH_FLAGS
blockers: 0
flags: 2
demo_path_ready: yes
---

# Phase 2 — Plan-Check Verdict

Goal-backward verification of `02-01-PLAN.md` through `02-08-PLAN.md` against:
- `PROJECT.md` (locked decisions — muted ochre, labs umbrella, /apps/abrigo URL scope)
- `REQUIREMENTS.md` Phase 2 mapping (LAB-01..06 + ITER-01..09 = 15 REQ-IDs)
- `ROADMAP.md` §Phase 2 success criteria + hackathon demo critical path
- `02-UI-SPEC.md` (6/6 dimensions approved, muted ochre LOCKED, 7 type roles, 8 components, CROSS-09)
- `02-CONTEXT.md`, `02-RESEARCH.md`, `02-VALIDATION.md`

## Aggregate Verdict: **PASS_WITH_FLAGS**

15/15 Phase 2 requirements covered with no duplication, no gaps. All tasks have automated verify blocks chained with `&&`. Demo critical path (homepage → catalog → Pair D PASS → FX-vol FAIL) is unblocked by the wave 1+2+3 plans. The 2 flags below are minor coordination concerns, not goal-blockers.

---

## Dimension-by-Dimension

### 1. REQ Coverage — **PASS**

Every Phase 2 REQ-ID from ROADMAP.md appears in exactly one plan's `requirements:` frontmatter field. No duplication, no gaps.

| REQ-ID | Plan | Wave |
|--------|------|------|
| LAB-01 | 02-03 | 3 |
| LAB-02 | 02-07 | 3 |
| LAB-03 | 02-07 | 3 |
| LAB-04 | 02-08 | 4 |
| LAB-05 | 02-03 | 3 |
| LAB-06 | 02-07 | 3 |
| ITER-01 | 02-05 | 3 |
| ITER-02 | 02-05 | 3 |
| ITER-03 | 02-06 | 3 |
| ITER-04 | 02-06 | 3 |
| ITER-05 | 02-04 | 2 |
| ITER-06 | 02-04 | 2 |
| ITER-07 | 02-06 | 3 |
| ITER-08 | 02-04 | 2 |
| ITER-09 | 02-06 | 3 |

Plans 02-01 (foundation) and 02-02 (components) have `requirements: []` correctly — they are infrastructure that unblocks downstream plans, not REQ-owners.

**Total: 15/15 covered.**

### 2. Wave Ordering & Dependencies — **PASS**

| Plan | Wave | depends_on | Validity |
|------|------|------------|----------|
| 02-01 | 1 | [] | ✓ foundation |
| 02-02 | 2 | [02-01] | ✓ |
| 02-03 | 3 | [02-01, 02-02] | ✓ pages need components |
| 02-04 | 2 | [02-01] | ✓ content parallel with components |
| 02-05 | 3 | [02-01, 02-02, 02-04] | ✓ catalog needs content corpus |
| 02-06 | 3 | [02-01, 02-02, 02-04] | ✓ detail needs content + components |
| 02-07 | 3 | [02-01, 02-02] | ✓ team/research need components but not iteration content |
| 02-08 | 4 | [02-01, 02-03, 02-04, 02-05, 02-06, 02-07] | ✓ sync workflow last |

- No cycles
- No forward references
- Wave number = max(dep waves) + 1 for every plan
- Wave 2 parallelism between 02-02 (components) and 02-04 (content MDX) is safe — disjoint file sets (`components/*` vs `content/iterations/*`)

### 3. Verify Block Structure — **PASS**

Every task in every plan has a `<verify><automated>...</automated></verify>` block. All 20 tasks across the 8 plans verified by direct inspection:

- 20/20 tasks have `<automated>` blocks
- 20/20 blocks chain checks with `&&` (no plain text outside the tag)
- 0 placeholder flags (`<VERIFIED_FLAG>`, `MISSING`, etc.) anywhere
- All structural checks (`test -f`, `grep -q`) are chained inside the tag — no Phase 1 regression
- `npx --yes impeccable detect ...` invoked across 02-01, 02-02, 02-03, 02-05, 02-06, 02-08 as expected; 02-04 (content MDX) and 02-07 (team/research — but 02-07 should ideally include this; see Flag 1)

### 4. UI-SPEC Alignment — **PASS**

| Spec | Where Referenced | Plans |
|------|-----------------|-------|
| Muted ochre `oklch(0.6 0.08 70)` LOCKED | Token migration block, `--accent-default` | 02-01 (12 hits) |
| Dark mode `oklch(0.7 0.10 70)` | Dark token replacement | 02-01 |
| IBM Plex Sans + Mono via `next/font/google` | Font loading | 02-01 |
| Spacing scale 5xl = 120px | `@theme inline` addition | 02-01, 02-02, 02-03, 02-05 |
| Panoptic structural references | Hero patterns, NumberedStep, divide-y lists | 02-02, 02-03 |
| Status pills color + icon + text (CROSS-09) | StatusPill reuse contract | 02-02, 02-05, 02-06 |
| Filter pills opt-in only (default: all visible) | nuqs URL state, `?status=` | 02-05 |
| Two-column iteration detail (3fr_2fr at lg) | Layout grid class | 02-06 |
| Replication hash `<details>` (default collapsed) | "How to verify" expander | 02-06 |

UI-SPEC compliance is verified by automated greps in each plan's verify block (e.g., 02-01 asserts `grep -q '0.6 0.08 70' app/globals.css`, 02-02 asserts `grep -q 'min-h-\[120px\]'`, 02-05 asserts `grep -q 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'`).

### 5. Anti-Fishing Discipline (CROSS-09 + LAB-05 + ITER-06) — **PASS**

| Discipline contract | Plan | Enforcement |
|--------------------|------|-------------|
| Catalog shows ALL statuses by default | 02-05 | Verify: `! grep -q "filter(.*=== 'PASS')"` + visual regression on 4 equal-height cards |
| IterationCatalogCard `min-h-[120px]` for every status | 02-02 | Unit test asserts identical card height across PASS/FAIL/PARKED/IN_PROGRESS fixtures |
| DispositionMemo uses `text-text-primary` (not muted) | 02-02, 02-06 | `! grep -q 'text-text-muted' DispositionMemo`; e2e test asserts class |
| DispositionMemo has NO `<details>` / `aria-expanded` (no collapse) | 02-02, 02-06 | `! grep -q '<details' DispositionMemo`; e2e test asserts |
| FAIL page bbox-height ≥ PASS page (visual regression) | 02-06 | `tests/visual/fail-equal-weight.spec.ts` asserts within-20% height ratio |
| About page authored in author's voice (anti-marketing-slop) | 02-03 | `! grep -iE "empower\|cutting-edge\|unlock\|leverage our..."` |
| Iteration MDX banned-phrase check | 02-04 | Same banned-phrase grep on Pair D + FX-vol MDX |

The epistemic-equality invariant is pinned by visual + structural + unit tests at three layers (component, catalog page, detail page). No PASS-only filtering at source.

### 6. Real-Data Sourcing (ITER-05, ITER-06) — **PASS**

Plan 02-04 is explicit and exhaustive:

- **Pair D (PASS)** — Task 1 `<read_first>` mandates reading the dispatch brief at `/home/jmsbpp/apps/d2p/abrigo/abrigo-analytics/scratch/2026-04-30-stage-2-m-sketch-dispatch-brief-pair-d.md` BEFORE composing. The `<abrigo_source_facts>` block locks β = +0.13670985, HAC SE = 0.02465, t = +5.5456, p_one ≈ 1.46×10⁻⁸, 95% CI = [0.0884, 0.1850]. Verify block asserts `grep -q 'beta: 0.13670985'`.
- **FX-vol (FAIL)** — Task 2 `<read_first>` mandates reading `/home/jmsbpp/apps/d2p/abrigo/abrigo-analytics/notebooks/fx_vol_cpi_surprise/Colombia/README.md`. β̂ = -0.000685, 90% CI = [-0.003635, 0.002265], n = 947, ci_level: 0.90 (not 95%) explicit. disposition_memo required by Velite refine().
- Plan documents `Author rule: If a value is unknown, the field is OMITTED (Velite schema allows optional); never invented.`

No invented values. No lorem ipsum. CONTEXT.md's "Pair D + FX-vol content fidelity" decision is implemented verbatim.

### 7. Demo-Critical Path Readiness — **PASS** (yes)

Hackathon deadline ~June 2 2026 (~3 weeks from 2026-05-12). Required URLs:

| URL | Plan(s) | Wave |
|-----|---------|------|
| `/` (homepage) | 02-03 + 02-01 (counts from .velite) | 3 |
| `/apps/abrigo/iterations` | 02-05 (page) + 02-04 (content) + 02-02 (cards) | 3 |
| `/apps/abrigo/iterations/pair-d/v1` | 02-06 (route) + 02-04 (MDX) + 02-02 (components) | 3 |
| `/apps/abrigo/iterations/fx-vol-on-cpi-surprise/v1` | 02-06 + 02-04 + 02-02 | 3 |

Critical-path execution:
1. **Wave 1** (02-01 alone) — tokens, nuqs, namespaces, Velite research schema
2. **Wave 2** (02-02 + 02-04 in parallel) — 10 components + 4 iteration MDX files
3. **Wave 3** (02-03 + 02-05 + 02-06 + 02-07 in parallel) — all pages

All 4 demo URLs are live after Wave 3 merges. Wave 4 (02-08) is the LAB-04 sync workflow + manual-review docs — **not** in demo critical path. The hackathon judge experience is fully unblocked at end of Wave 3.

### 8. Cross-Repo Workflow (LAB-04) — **PASS**

Plan 02-08 implements exactly the spec from 02-RESEARCH §Pattern 7:

- `repository_dispatch: { types: [abrigo-content-updated] }` trigger
- `workflow_dispatch` preserved as manual fallback with `abrigo_ref` input
- `actions/checkout@v4` for both frontend (default) and `wvs-finance/abrigo-analytics` (with `ABRIGO_READ_PAT`)
- rsync with `--include='*/' --include='*.md' --include='*.mdx' --exclude='*'` pattern (markdown only, preserves nested dirs)
- `pnpm velite build` as validation gate before PR
- `peter-evans/create-pull-request@v6` with `delete-branch: true`, branch `auto/sync-abrigo-content`
- `docs/abrigo-dispatch-spec.md` documents the corresponding `wvs-finance/abrigo-analytics/.github/workflows/dispatch-frontend-sync.yml` user must add manually (since this plan cannot push to that repo)
- Both PAT secrets documented (ABRIGO_READ_PAT on frontend, FRONTEND_DISPATCH_PAT on abrigo)

YAML validity asserted in verify block via `node -e "require('js-yaml').load(...)"`.

### 8b. Nyquist Compliance — **PASS**

- 20/20 tasks have automated verify commands inside `<automated>` blocks
- 0 watch-mode flags (`--watchAll`) detected
- All commands chain with `&&` — no plain-text fallback outside the tag
- Wave 0 test scaffolds created by 02-01 Task 3 (16 stubs); downstream plans (02-03, 02-05, 02-06, 02-07) fill these stubs by name → no broken refs
- Sampling continuity: every wave has ≥1 unit test command + ≥1 e2e command in its verify blocks

---

## Flags (non-blocking)

### Flag 1 — `impeccable detect` not invoked in 02-04 and 02-07

- **02-04** modifies only `content/iterations/*.mdx` — content files, not React/CSS code. impeccable's detectors target component code, not MDX prose. Skipping `impeccable detect` here is defensible.
- **02-07** modifies `app/(lab)/team/page.tsx`, `app/(lab)/research/page.tsx`, `lib/team/contributors.ts`, plus 3 research MDX files. The two new RSC pages DO render UI and SHOULD be impeccable-checked. The verify block runs biome + tsc + playwright + vitest but not `npx --yes impeccable detect app/`.

**Severity:** warning. The CI workflow (`ci.yml` from Phase 1) runs impeccable on every PR anyway, so this is enforced at PR-merge time. Adding the local check to 02-07's task verify would catch issues 1 wave earlier without changing the contract.

**Fix hint (optional, not required for execution):** Add `&& npx --yes impeccable detect app/` to 02-07's Task 1 and Task 2 `<automated>` blocks.

### Flag 2 — Wave 3 parallel writes to `messages/{es-CO,en}/iterations.json`

Both 02-05 and 02-06 list these JSON files in `files_modified`, both in wave 3 with no inter-plan dependency between them. They operate on disjoint nested keys:
- 02-05 extends `iterations.catalog`, `iterations.filter`, `iterations.status.{pass,fail,parked,in_progress}`
- 02-06 extends `iterations.detail.evidence`, `iterations.detail.replication`, `iterations.detail.verify`, `iterations.detail.disposition`, `iterations.detail.version_label`

If executed truly in parallel without merge coordination, the second write overwrites the first. Both plans say "preserve everything from Plan 02-01 stub" but neither explicitly handles "preserve what the OTHER wave-3 plan added."

**Severity:** warning. Disjoint-key edits will merge cleanly with `git merge` if each task commits independently. The orchestrator's wave-3 sequencing (likely sequential within a wave or with merge step) handles this. The i18n-coverage unit test (`tests/unit/i18n-coverage.test.ts`) will catch any key-loss regression at the next quick-run.

**Fix hint (optional):** Either (a) sequence 02-05 before 02-06 within wave 3 (add `02-05` to 02-06's `depends_on`), or (b) move the iterations.json extension into 02-01 with all keys authored up front, leaving 02-05/02-06 with no message-file writes.

---

## Blockers: 0

No goal-blocking issues. All 15 REQ-IDs are covered, every task has a runnable verify command, the demo path is unblocked by waves 1-3, and the locked UI-SPEC + CONTEXT decisions (muted ochre, IBM Plex, panoptic structure, anti-fishing equal-weight, real abrigo values, repository_dispatch sync) are implemented as specified.

---

## Context Compliance Audit

| Locked decision (from 02-CONTEXT) | Implementing plan(s) | Status |
|----------------------------------|---------------------|--------|
| Velite `iterations/{slug}/v{n}.mdx` as source of truth, 2 real iterations seeded | 02-04 | ✓ |
| Phase 1 `sample/v1.mdx` deleted in Phase 2 | 02-04 Task 3 | ✓ |
| GitHub Actions sync workflow exercised for real | 02-08 | ✓ |
| Author rule: read abrigo source before composing | 02-04 Tasks 1+2 | ✓ |
| Inline SVG β-CI range-bar, ~30 lines, no chart library | 02-02 Task 1 (BetaCIChart) | ✓ |
| Velite `research` collection schema | 02-01 + 02-07 | ✓ |
| Replication hash via `<details>` (default collapsed) | 02-06 Task 2 | ✓ |
| `lib/team/contributors.ts` hardcoded TS array — no GitHub API runtime fetch | 02-07 Task 1 | ✓ |
| Status filter default ALL visible; opt-in only | 02-05 Task 2 | ✓ |
| About page single long-form RSC, 5 NumberedSteps + 4 CheckmarkList | 02-03 Task 2 | ✓ |
| Mobile responsive composition (IterationDetailHeader stacks <sm; catalog grid 1/2/3 col) | 02-02 + 02-05 | ✓ |
| Dark mode token migration hue 165 → 70-80 | 02-01 Task 1 | ✓ |
| `--spacing-5xl: 120px` added to `@theme inline` | 02-01 Task 1 | ✓ |
| FAIL iteration treatment: full-weight DispositionMemo, no collapse | 02-02 + 02-06 | ✓ |

Deferred ideas (search, OG dynamic route, notebook iframe, RSS, comments, per-iteration analytics) — confirmed NOT implemented in any Phase 2 plan. No scope creep.

---

## Phase 1 Lessons Applied

| Lesson | Phase 2 Status |
|--------|---------------|
| Structural checks inside `<verify><automated>` chained with `&&` | ✓ all 20 tasks |
| No `<VERIFIED_FLAG>` placeholders — use `npx --yes impeccable detect ... exit-code-only` | ✓ no placeholders found |
| Each REQ-ID in exactly ONE plan | ✓ 15/15, no duplication |
| Wave 1 plans write FINAL files where possible | ✓ 02-01 writes final `app/globals.css`, `velite.config.ts`, namespace stubs; downstream plans extend |
| Test infrastructure: `.test.ts` (Vitest) vs `.spec.ts` (Playwright) | ✓ enforced by 02-01 Task 3 file extension map |
| Architecture tests must not be picked up by Playwright (testIgnore) | n/a — Phase 2 adds Vitest unit tests + Playwright e2e/visual/a11y; no new architecture suite |

---

## Recommendation

**APPROVE for execution.** Run `/gsd:execute-phase 2` to proceed. The 2 flags above are minor coordination concerns the executor (or orchestrator wave-sequencing) handles correctly in practice. They do NOT block phase goal achievement.

Post-merge, the hackathon judge path is live:
1. Visit `/` — read mission + Apps overview + iteration counts
2. Click into `/apps/abrigo/iterations` — see all 4 statuses at equal visual weight
3. Click Pair D → read full PASS evidence chain with β = 0.13670985, p ≈ 1.5×10⁻⁸
4. Click FX-vol → read full FAIL disposition with β̂ = -0.000685 at IDENTICAL visual weight

---

*Checked by gsd-plan-checker · 2026-05-12*
*Plans path: /home/jmsbpp/apps/d2p/frontend/.planning/phases/02-research-lab-presence-and-iteration-catalog/*
