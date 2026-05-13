---
phase: 02-research-lab-presence-and-iteration-catalog
verified: 2026-05-13T00:00:00Z
status: resolved
score: 15/15 requirements verified (after gap closure)
re_verification: false
gap_closure_commit: ca7b397
gap_closure_note: |
  Both automated gaps closed inline on 2026-05-13. Verifier's "63-char hash" diagnosis
  was incorrect — abrigo source hashes are 64-char SHA-256. The actual gap was that
  replication_hash had simply never been populated in the frontmatter. Fix:
    - Pair D: replication_hash = d4790e743cdec62f1368cab1833e1266cb2da763d7c0931dd732bdf3d17938cf
              (primary OLS results hash from abrigo dispatch brief)
    - FX-vol: replication_hash = 769ec955e72ddfcb6ff5b16e9c949fd8f53d9e8c349fc56ce96090fce81d791f
              (panel fingerprint from nb1_panel_fingerprint.json)
    - LAB-06: /about added to tests/e2e/locale-coverage.spec.ts routes array
              (7 routes × 2 locales = 14 cases)
    - Bonus: dropped misleading "(63 hex chars)" prose annotation in Pair D MDX
  Manual-only human verifications (6 items) remain pending as designed in 02-VALIDATION.md.
gaps:
  - truth: "Each iteration detail displays replication hash with a working link to make verify instructions"
    status: resolved
    reason: "replication_hash field is absent from both pair-d/v1.mdx and fx-vol-on-cpi-surprise/v1.mdx because the abrigo source hashes are 63-char hex (Velite schema requires exactly 64 chars). The EvidenceChain and detail page <details> block both gate on replication_hash being non-null, so the replication row and 'How to verify' section never render for either demo-critical iteration. [RESOLVED in ca7b397 — abrigo hashes are 64-char; populated frontmatter in both MDX files.]"
    artifacts:
      - path: "content/iterations/pair-d/v1.mdx"
        issue: "replication_hash field absent — no 64-char SHA-256 available from abrigo source"
      - path: "content/iterations/fx-vol-on-cpi-surprise/v1.mdx"
        issue: "replication_hash field absent — same reason"
      - path: "tests/e2e/iteration-evidence.spec.ts"
        issue: "Line 56 comment says 'pair-d has a replication_hash in its MDX frontmatter' — false; test would fail in a real e2e run"
    missing:
      - "Either: resolve the 63-char hash discrepancy and populate replication_hash in both MDX files, OR: document the abrigo hash as a known 63-char artifact and expand the Velite schema regex to allow both 63 and 64 chars, then populate the field"
      - "Fix the false comment on iteration-evidence.spec.ts:56 and make the test conditional or use a known-hash iteration"

  - truth: "All lab pages render in es-CO and en (LAB-06 — locale-coverage spec covers all Phase 2 routes)"
    status: resolved
    reason: "locale-coverage.spec.ts covers 6 of 7 Phase 2 routes (/, /team, /research, /apps/abrigo/iterations, pair-d/v1, fx-vol/v1). The /about page is excluded with the comment 'that page does not exist in Phase 2' — but app/(lab)/about/page.tsx was created in commit bc97b39 (plan 02-03). The about-page.spec.ts does test both locales for /about (LAB-05), partially mitigating this gap, but the centralised no-key-leakage assertion in locale-coverage.spec.ts is missing for that route."
    artifacts:
      - path: "tests/e2e/locale-coverage.spec.ts"
        issue: "Line 4: '/about is excluded — that page does not exist in Phase 2' — incorrect; page exists at app/(lab)/about/page.tsx since commit bc97b39"
    missing:
      - "Add { path: '/about', h1_es: 'Metodología', h1_en: 'Methodology' } to the routes array in locale-coverage.spec.ts"
      - "Update line 4 comment to remove the incorrect statement"

human_verification:
  - test: "Scientific accuracy of Pair D PASS narrative"
    expected: "MDX prose in pair-d/v1.mdx accurately reflects β = +0.13670985, p_one = 1.46×10⁻⁸, 95% CI [0.0884, 0.1850], N = 134 from the abrigo dispatch brief and primary_ols.json"
    why_human: "LLM cannot verify scientific synthesis accuracy; requires author or domain reviewer to cross-check MDX prose against abrigo-analytics/scratch/2026-04-30-stage-2-m-sketch-dispatch-brief-pair-d.md and primary_ols.json"

  - test: "Scientific accuracy of FX-vol FAIL narrative"
    expected: "MDX prose in fx-vol-on-cpi-surprise/v1.mdx accurately reflects β̂ = −0.000685, 90% CI [−0.003635, 0.002265], n = 947 from abrigo Colombia README; disposition_memo content faithfully documents the T3b gate failure"
    why_human: "Requires domain reviewer to confirm the FAIL narrative prose matches the abrigo Colombia README and notebook outputs — automated greps confirm numeric values in frontmatter but not the narrative accuracy"

  - test: "N value range disambiguation for Pair D"
    expected: "MDX reports sample_size = 134 (monthly obs, 2015–2026). Clarify whether N = 231 (weekly or daily obs) appears anywhere in the source and whether a different sample size should be surfaced"
    why_human: "The verification prompt referenced 'N = 134–231' suggesting possible range; abrigo dispatch brief confirms N = 134 monthly, but a secondary spec (weekly panel?) may report 231. Author should confirm the correct denominator for the demo page."

  - test: "es-CO translation quality review for all Phase 2 namespace files"
    expected: "All messages/es-CO/*.json Phase 2 files (iterations, research, team, about, lab) and iteration MDX title_es fields read as author-quality Colombian Spanish, not machine-translated"
    why_human: "Requires native es-CO speaker; machine-translation tells are subtle and beyond grep detection"

  - test: "Anti-fishing tone review for /about copy and FX-vol FAIL disposition memo"
    expected: "/about prose and the FX-vol disposition_memo use the lab's direct evidence-cited register with no marketing phrases, no tone asymmetry between PASS and FAIL treatments"
    why_human: "Tonal judgment; impeccable copy detector catches surface patterns only; requires author review and logging in docs/copy-review.md per 02-VALIDATION.md"

  - test: "Cross-browser visual fidelity — equal card height and FAIL/PASS visual parity"
    expected: "PASS and FAIL IterationCatalogCards render at identical height on Chrome (Linux), Safari (macOS), Firefox; DispositionMemo section on the FX-vol FAIL page renders at equal visual depth as the Pair D PASS page"
    why_human: "Playwright visual snapshots may not catch font-rendering differences across OS/browser combinations; requires manual smoke test per 02-VALIDATION.md"
---

# Phase 2: Research Lab Presence and Iteration Catalog — Verification Report

**Phase Goal:** Delivers the hackathon demo critical path: lab homepage, full iteration catalog, Pair D detail (PASS), and FX-vol-fail detail (FAIL)
**Verified:** 2026-05-13T00:00:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (from ROADMAP.md Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | First-time visitor on `/` reads lab mission, "What is Abrigo" explainer, iteration headline counts (PASS/FAIL/PARKED/IN_PROGRESS), and finds wvs-finance GitHub link — no wallet required | VERIFIED | `app/(lab)/page.tsx` imports `countsByStatus` from Velite collection, renders `IterationCountTile` for all 4 statuses, GitHub link at `https://github.com/wvs-finance`; 9/9 `homepage-content.spec.ts` assertions |
| 2 | Visitor on `/apps/abrigo/iterations` sees all iterations at equal card dimensions; status communicated by StatusPill (color + icon + text) | VERIFIED | `IterationCatalogCard` enforces `min-h-[120px]` unconditionally; Velite build produces 4 entries (PASS, FAIL, PARKED, IN_PROGRESS); `IterationStatusFilter` opt-in only; `iteration-catalog.spec.ts` 14 assertions; `StatusPill` uses `<output>` with icon + color class + visible text |
| 3 | Visitor on `/apps/abrigo/iterations/pair-d/v1` reads full spec → data → estimation → tests → disposition narrative with β = +0.137, 95% CI, p ≈ 1.5×10⁻⁸, N, and working replication hash link — in both locales | PARTIAL | β = 0.13670985, p_one = 1.46×10⁻⁸, 95% CI [0.0884, 0.1850], N = 134 all present in frontmatter and rendered by `EvidenceChain`; MDX narrative is 5-section, both locales authored. **GAP: replication_hash absent from MDX** — EvidenceChain hash row and `<details>` verify block never render |
| 4 | Visitor on FX-vol-on-CPI-surprise detail page reads failure disposition memo at same visual weight as PASS page — no truncation, no de-emphasis | VERIFIED | `DispositionMemo` uses `text-text-primary`, no `<details>` wrapper, no collapse; detail page renders `DispositionMemo` unconditionally for FAIL/PARKED; `fail-equal-weight.spec.ts` and `iteration-fx-vol-fail.spec.ts` have 14 assertions including bbox-height parity |
| 5 | AI agent/crawler fetching iteration detail receives JSON-LD `Dataset` + `ScholarlyArticle` with `isPartOf` chains and OpenGraph card | VERIFIED | `StructuredData` with `mode="iteration"` emits both blocks; `isPartOf` chain to `Abrigo Iteration Catalog` dataset and `d2-π (DS2P Labs)` ResearchProject; `generateMetadata` outputs OG title/description/type/siteName; `iteration-jsonld.spec.ts` 22 assertions |

**Score:** 4.5/5 truths verified (truth #3 is partial due to replication hash gap)

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `app/(lab)/page.tsx` | LAB-01 homepage | VERIFIED | Velite-derived counts, Abrigo card, GitHub link, authored copy |
| `app/(lab)/about/page.tsx` | LAB-05 methodology page | VERIFIED | 5 NumberedSteps, 4 CheckmarkList, both locales |
| `app/(lab)/team/page.tsx` | LAB-02 team page | VERIFIED | Renders `ContributorCard` list from `lib/team/contributors.ts` |
| `app/(lab)/research/page.tsx` | LAB-03 publications page | VERIFIED | Velite `research` collection, 3 seed entries, `PublicationCard` |
| `app/(apps)/apps/abrigo/iterations/page.tsx` | ITER-01, ITER-02 catalog | VERIFIED | All 4 statuses shown by default; `min-h-[120px]` enforced |
| `app/(apps)/apps/abrigo/iterations/[slug]/v[version]/page.tsx` | ITER-03..09 detail | VERIFIED | Dynamic route with generateStaticParams, EvidenceChain, DispositionMemo, JSON-LD |
| `.github/workflows/sync-abrigo-content.yml` | LAB-04 content sync | VERIFIED | `repository_dispatch: abrigo-content-updated`, `peter-evans/create-pull-request@v6`, Velite build gate |
| `components/IterationCatalogCard.tsx` | UI-SPEC component | VERIFIED | `min-h-[120px]`, StatusPill, full-card anchor, epistemic equality |
| `components/IterationDetailHeader.tsx` | UI-SPEC component | VERIFIED | StatusPill + version + H1 + date |
| `components/EvidenceChain.tsx` | UI-SPEC component | VERIFIED | `<dl>/<dt>/<dd>`, omit-on-undefined pattern |
| `components/BetaCIChart.tsx` | UI-SPEC component | VERIFIED | Inline SVG, `role=img`, `aria-label`, `sr-only` data table |
| `components/ReplicationHash.tsx` | UI-SPEC component | VERIFIED | Client component, clipboard API, `<output>` element |
| `components/DispositionMemo.tsx` | UI-SPEC component | VERIFIED | `text-text-primary`, no `<details>` collapse, StatusPill for context |
| `components/PublicationCard.tsx` | UI-SPEC component | VERIFIED | H3, Badge type label, `line-clamp-2`, ArrowUpRight CTA |
| `components/ContributorCard.tsx` | UI-SPEC component | VERIFIED | Divide-y row layout, avatar, GitHub link |
| `components/NumberedStep.tsx` | UI-SPEC component | VERIFIED | `font-mono accent` number, `flex-col md:flex-row`, `max-w-2xl` |
| `components/CheckmarkList.tsx` | UI-SPEC component | VERIFIED | `<ul>`, CheckCircle2 `text-status-pass`, `items-start gap-2` |
| `content/iterations/pair-d/v1.mdx` | PASS iteration, real data | VERIFIED | β = 0.13670985, p = 1.46e-8, CI [0.0884, 0.1850], N = 134, 5-section narrative |
| `content/iterations/fx-vol-on-cpi-surprise/v1.mdx` | FAIL iteration, real data | VERIFIED | β = -0.000685, 90% CI [-0.003635, 0.002265], n = 947, `disposition_memo` present |
| `content/iterations/dev-ai-stage-1-section-j/v1.mdx` | IN_PROGRESS placeholder | VERIFIED | Authentic reason for in-progress status, no invented values |
| `content/iterations/pair-b-bittensor/v1.mdx` | PARKED placeholder | VERIFIED | Authentic parked reason, no invented values |
| `lib/team/contributors.ts` | LAB-02 data source | VERIFIED | Single contributor (JMSBPP), all required fields, sourced from git shortlog |
| `messages/es-CO/{iterations,research,team,about,lab,common,nav}.json` | LAB-06 i18n | VERIFIED | All 7 Phase 2 namespaces present for es-CO |
| `messages/en/{iterations,research,team,about,lab,common,nav}.json` | LAB-06 i18n | VERIFIED | All 7 Phase 2 namespaces present for en |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `app/(lab)/page.tsx` | Velite iterations | `countsByStatus()` from `lib/iterations/counts.ts` | WIRED | Counts imported, `IterationCountTile` rendered for all 4 statuses |
| `app/(apps)/apps/abrigo/iterations/page.tsx` | Velite iterations | `@/.velite` + `lib/velite-shim.ts` | WIRED | All 4 iterations rendered; filter is opt-in via `IterationStatusFilter` nuqs |
| `app/(apps)/apps/abrigo/iterations/[slug]/v[version]/page.tsx` | Velite iteration MDX | `generateStaticParams` + `iterations.find()` | WIRED | Dynamic route resolves slug+version, passes to EvidenceChain/DispositionMemo/MDXRenderer |
| Iteration detail page | JSON-LD structured data | `StructuredData mode="iteration"` | WIRED | Dataset + ScholarlyArticle emitted; isPartOf chains correct |
| Iteration detail page | OpenGraph metadata | `generateMetadata` | WIRED | og:title, og:description, og:type=article, og:site_name present |
| `EvidenceChain` | `replication_hash` display | `replication_hash != null` gate | NOT_WIRED | hash absent from pair-d and fx-vol MDX — hash row never renders for demo-critical pages |
| `.github/workflows/sync-abrigo-content.yml` | abrigo repo | `repository_dispatch: abrigo-content-updated` | WIRED (infrastructure only) | Workflow triggers, runs rsync, Velite gate, creates PR. Counterpart dispatcher in abrigo repo is documented but not yet provisioned (user action required per docs/abrigo-dispatch-spec.md) |
| `locale-coverage.spec.ts` | `/about` route | Routes array | NOT_WIRED | `/about` absent from locale-coverage routes array; exists in codebase since commit bc97b39 |

---

## Per-Requirement Verification Table

| Req ID | Description (abbreviated) | Status | Evidence |
|--------|---------------------------|--------|----------|
| **LAB-01** | Lab homepage `/` with mission, Abrigo card, iteration headline counts, GitHub link | PASS | `app/(lab)/page.tsx` wired; 9/9 `homepage-content.spec.ts` assertions; Velite counts confirmed (PASS:1 FAIL:1 PARKED:1 IN_PROGRESS:1) |
| **LAB-02** | `/team` page with contributor cards, GitHub links, iteration ownership | PASS | `app/(lab)/team/page.tsx` + `lib/team/contributors.ts` with single contributor (JMSBPP); `contributors.test.ts` passes |
| **LAB-03** | `/research` publications page with ≥3 seed entries from abrigo | PASS | Velite `research` collection has 3 entries (pair-d dispatch brief, fx-vol closed-fail, y3 carbon basket); `PublicationCard` wired |
| **LAB-04** | Content sync CI step with cross-repo trigger and PR creation | PASS | `sync-abrigo-content.yml` has `repository_dispatch`, `rsync`, `pnpm velite build` gate, `peter-evans/create-pull-request@v6`; counterpart dispatcher spec in `docs/abrigo-dispatch-spec.md` (pending manual user provisioning in abrigo repo) |
| **LAB-05** | `/about` page with anti-fishing discipline (5 NumberedSteps + 4 CheckmarkList), author's voice, both locales | PASS | `app/(lab)/about/page.tsx` renders 5 steps + 4 commitments; `about-page.spec.ts` 9/9 assertions including both locale and anti-marketing-phrase tests |
| **LAB-06** | All lab pages render in es-CO and en; translations author-quality | PARTIAL | 7 namespace files present for both locales; `locale-coverage.spec.ts` covers 6/7 Phase 2 routes (missing `/about`); `about-page.spec.ts` provides partial coverage for `/about` locale — see gap |
| **ITER-01** | `/apps/abrigo/iterations` shows all iterations regardless of status | PASS | Catalog page reads all 4 from Velite; `activeStatus === undefined` condition shows ALL; filter is opt-in via URL param; `iteration-catalog.spec.ts` confirms default-all behavior |
| **ITER-02** | Catalog cards have equal visual weight regardless of status | PASS | `IterationCatalogCard` enforces `min-h-[120px]` unconditionally; all statuses same border/typography/padding; `iteration-catalog-equal-weight.spec.ts` pins bounding-box height equality |
| **ITER-03** | Iteration detail at `/apps/abrigo/iterations/{slug}/v{n}` shows spec → data → estimation → tests → disposition | PASS | Dynamic route renders MDX via `MDXRenderer` with 5-section narrative; `IterationDetailHeader`, `EvidenceChain`, `DispositionMemo` composed; `iteration-detail.spec.ts` filled |
| **ITER-04** | Detail page shows β, 95% CI, p-value, N, and replication hash with `make verify` link | FAIL | β, CI, p-value, N all present and rendered. **replication_hash absent from both demo-critical MDX files** (63-char source hash vs 64-char schema requirement); EvidenceChain hash row and `<details>` verify block never render; `iteration-evidence.spec.ts:56` has false comment claiming hash exists |
| **ITER-05** | `/apps/abrigo/iterations/pair-d/v1` PASS page renders fully | PASS | β = 0.13670985 (rendered as "+0.136710" via `.toFixed(6)`), p = 1.46e-8, CI [0.0884, 0.1850] present; `iteration-pair-d.spec.ts` 9 assertions; notebook link present |
| **ITER-06** | FX-vol FAIL page renders with same visual weight as PASS, includes failure disposition memo | PASS | `DispositionMemo` is a `<section>`, not collapsed, `text-text-primary`; β̂ = -0.000685, 90% CI [-0.003635, 0.002265], n = 947; `iteration-fx-vol-fail.spec.ts` 14 assertions; `fail-equal-weight.spec.ts` pins visual parity |
| **ITER-07** | `<StatusPill>` encodes state with color + icon + text | PASS | `StatusPill.tsx` uses `<output>` element with icon from lucide-react + color class + `<span>{label}</span>`; `status-pill.test.tsx` covers all 4 statuses (color+icon+text combination); CROSS-09 satisfied |
| **ITER-08** | Iteration URLs are content-addressable human-readable slugs | PASS | Route `[slug]/v[version]` at `/apps/abrigo/iterations/`; slugs are kebab-case from MDX file paths; no UUIDs |
| **ITER-09** | Each iteration page emits JSON-LD `Dataset` + `ScholarlyArticle` with `isPartOf` chains and OG card | PASS | `StructuredData mode="iteration"` emits both blocks with correct `isPartOf` chain; `generateMetadata` outputs OG; `iteration-jsonld.spec.ts` 22 assertions |

**Score: 13/15 requirements verified (LAB-06 partial, ITER-04 failed)**

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `tests/e2e/iteration-evidence.spec.ts` | 56 | False comment: "pair-d has a replication_hash in its MDX frontmatter" | Blocker | Test would fail in a real e2e run; documents a false assumption about content state |
| `tests/e2e/locale-coverage.spec.ts` | 4 | Incorrect comment: "/about is excluded — that page does not exist in Phase 2" | Warning | Page exists since commit bc97b39; comment will mislead future authors |
| `next.config.ts` | 31–32 | `typescript: { ignoreBuildErrors: true }` | Warning | Allows production builds with TS errors; typecheck must always be run separately; documented as workaround for TS 5.9.3 + Node 25 memory crash |

---

## Human Verification Required

### 1. Scientific accuracy of Pair D PASS narrative

**Test:** Read `/apps/abrigo/iterations/pair-d/v1` and cross-check the Spec/Data/Estimation/Tests/Disposition prose against `abrigo-analytics/scratch/2026-04-30-stage-2-m-sketch-dispatch-brief-pair-d.md` and `primary_ols.json`.
**Expected:** Every numeric claim in the MDX prose matches the source. The "Stage-2 M-sketch unblocked" disposition accurately reflects the verdict in the dispatch brief.
**Why human:** LLM cannot verify that a synthesis accurately represents the source; requires author or domain reviewer. Log review in `docs/iteration-content-review.md`.

### 2. Scientific accuracy of FX-vol FAIL narrative

**Test:** Read `/apps/abrigo/iterations/fx-vol-on-cpi-surprise/v1` and cross-check the FAIL disposition memo prose against the Colombia README primary results table and T3b gate analysis in `abrigo-analytics/notebooks/fx_vol_cpi_surprise/Colombia/`.
**Expected:** β̂ = −0.000685, 90% CI [−0.003635, 0.002265], n = 947 are correctly cited; the T3b gate failure reasoning is accurate.
**Why human:** Same as above; disposition memo is a synthesis, not a direct quote. Requires author confirmation.

### 3. Pair D N value disambiguation

**Test:** Confirm whether "N = 134–231" in any specification context refers to different sampling frequencies (monthly = 134, weekly ≈ 231?) and whether both should be disclosed on the detail page.
**Expected:** Either N = 134 is the sole correct sample size, or the MDX should surface both with methodology context.
**Why human:** The verification prompt referenced "N = 134-231"; the abrigo source confirms N = 134 monthly observations; a reviewer must check whether a secondary panel exists at weekly granularity.

### 4. es-CO translation quality review

**Test:** Native Colombian Spanish speaker reviews `messages/es-CO/{iterations,research,team,about,lab}.json` and all iteration/research MDX `title_es` fields.
**Expected:** No machine-translation tells; register matches the lab's direct, evidence-cited tone; no SaaS phrases.
**Why human:** Machine-translation tells are subtle and beyond grep. Log review in `docs/copy-review.md`.

### 5. Anti-fishing tone review for /about and FX-vol disposition

**Test:** Read `/about` page copy and FX-vol `disposition_memo` prose. Check for banned register: "Empower your X with Y", marketing superlatives, generic SaaS phrasing. Confirm FAIL disposition has equal narrative weight to PASS narrative.
**Expected:** Zero banned phrases; FAIL disposition is direct, evidence-cited, not de-emphasized.
**Why human:** Tonal judgment; impeccable copy detector catches only surface-level patterns. Log in `docs/copy-review.md`.

### 6. Cross-browser visual fidelity

**Test:** Manual smoke test on Chrome (Linux), Safari (macOS), Firefox: (1) iteration catalog card heights are equal across PASS/FAIL/PARKED/IN_PROGRESS at all three grid breakpoints; (2) FX-vol FAIL detail page has the same visual depth/weight as Pair D PASS detail page; (3) IBM Plex Sans and IBM Plex Mono render correctly.
**Expected:** No height jank, no font-rendering artifacts, no layout collapse at 360px viewport.
**Why human:** Playwright visual snapshots use a single OS/browser and do not catch cross-platform font-rendering differences. Record screenshots in `docs/cross-browser-audit.md`.

---

## Gaps Summary

**Two automated gaps block full PASS status:**

**Gap 1 (ITER-04 — FAIL):** The replication hash is absent from both demo-critical MDX files. The Velite schema enforces a 64-char SHA-256 regex, but the only available hash from abrigo analytics is 63 chars (a truncated artifact). Because `EvidenceChain` and the detail page `<details>` block both gate on `replication_hash != null`, no replication-hash row and no "How to verify" section ever appear for Pair D or FX-vol. ITER-04 explicitly requires "replication hash with a working link to `make verify` instructions." The resolution options are: (a) correct the 63-char hash in the abrigo source and update the MDX, or (b) relax the Velite schema regex to accept 63-char hashes and populate the field. A side effect of this gap: `iteration-evidence.spec.ts` line 56 has a comment claiming pair-d has a hash (it doesn't), meaning this Playwright test would fail in a real browser run.

**Gap 2 (LAB-06 — PARTIAL):** The `/about` route is missing from `locale-coverage.spec.ts`. The page was built in plan 02-03 (commit bc97b39) and uses `getTranslations()` from next-intl, but plan 02-07 (which authored locale-coverage.spec.ts) incorrectly noted "that page does not exist." The `about-page.spec.ts` partially covers locale switching for `/about` under LAB-05, but the centralised no-key-leakage test in `locale-coverage.spec.ts` does not include the route. The fix is a two-line addition to that spec's routes array.

**Both gaps have low remediation cost** — the replication hash issue requires either a content update or schema adjustment plus content update; the locale coverage gap is a single routes-array entry. Neither gap blocks the Hookathon demo visually (the pages render and all numeric content is present), but ITER-04 is a named requirement claiming the hash "displays with a working link" and is currently not deliverable.

---

_Verified: 2026-05-13_
_Verifier: Claude (gsd-verifier)_
