# Design Spec — `/research` Flagship Math-Capable Reading Surface

**Date:** 2026-05-29
**Author:** Juan Serrano (DS2P Labs / ∂²Π) + Claude
**Status:** Verified — revised after two-reviewer gate (Reality Checker ∥ Frontend Developer); all 4 BLOCKERs + 9 MAJORs resolved inline. Pending user sign-off → `writing-plans`.
**Topic:** Elevate the existing `/research` index into a paper-grade public research surface with build-time LaTeX math, for two active research tracks (CFMM microstructure; Abrigo hedge-instrument design results).

> **Review provenance:** This spec was reviewed (uncommitted) by the Reality Checker and a Frontend Developer in parallel per `CLAUDE.md`. Their findings (verified against the repo) reshaped §3.1, §3.2, §4, §5, §7, §8, §10. Key reversals from the first draft: (a) render path is now `s.mdx()` + a resurrected RSC renderer (build-time), NOT `next-mdx-remote/rsc`; (b) bilingual MDX bodies are split per-locale; (c) the index track filter is a server `<Link>`, NOT nuqs (FOUND-11); (d) math deps are an explicit install; (e) clickable equation cross-refs are dropped from v1.

---

## 1. Context & Goal

`/research` is the surface DS2P Labs will touch most often — where finished research is published for the public. Per the 2026-05-13 IA correction, the econometric *exercise* stays off-site (`wvs-finance/abrigo-analytics`); only *finished research* is published here and on X. This spec builds the reading experience that makes that venue first-class.

**Goal:** A visitor (human or agent) lands on `/research`, scans two labelled tracks, opens a piece, and reads paper-grade content — prose with inline math, numbered display equations, figures, theorem/definition blocks, footnotes/sidenotes, and a citation/paper-bridge block — rendered fast, accessibly, in the locked DS2P design system.

**Current state (verified against repo, the baseline being extended):**
- `app/(lab)/research/page.tsx` — flat reverse-chron list of `PublicationCard`s sorted by `order`.
- `components/PublicationCard.tsx` — frontmatter only; one seed (`abrigo-y3-carbon-basket-writeup`) has no `external_url` → currently a dead end.
- `velite.config.ts` `researchSchema` — **no body/mdx/raw field**; the `research` collection compiles frontmatter only. MDX bodies in `content/research/*.mdx` are **never compiled or shipped**. (This is the real starting point — the body pipeline does not exist yet.)
- The 3 seed MDX bodies are **bilingual in a single file** (`## Español` then `## English`), all Abrigo-track, and use **Unicode glyphs** (`β̂`, `×10⁻⁸`), not LaTeX.
- Installed: `next-mdx-remote@6.0.0` ✓. **NOT installed:** `katex`, `remark-math`, `rehype-katex`. No CSP anywhere in the repo.
- `(lab)` route group is RSC-pure with a bundle-isolation barrier (FOUND-11); `NuqsAdapter` is scoped to `(apps)` only.
- `lib/velite-shim.ts` revives `date` via `new Date(...)`; string fields round-trip fine.

**Non-negotiable constraints (inherited):** muted ochre `oklch(0.6 0.08 70)` single accent; IBM Plex Sans + Mono only (KaTeX math glyphs are additive, not a UI font); cream/ink palette; panoptic structural register; minimal borders, 0–8px radius; anti-marketing tone. Anti-fishing (CROSS-09 + LAB-05): no `<details>` collapse on content; signal = color + icon + text; FAIL/negative-result research renders at **identical visual weight** to PASS. WCAG 2.2 AA; LCP < 2.5s on Moto G Power 3G. es-CO authored first, en second; no machine translation (`docs/copy-review.md` sign-off). Evidence Collector live-verify after each route task.

---

## 2. Scope & Decomposition

This is **three sequenced plans**, not one (reviewer M3). The spec defines all three; `/gsd:plan-phase` produces them.

- **Plan A — Math pipeline + render-path spike (GATING).** Install deps; add a compiled body to the `research` collection; wire build-time KaTeX; resurrect the RSC `MDXRenderer`; prove one display equation renders under **both** `next dev --turbopack` AND `next build && next start`, live-verified by Evidence Collector (`.katex` node present, not `.katex-error`). Settles the locale-split mechanism (§3.2) too. **Nothing downstream builds until Plan A returns ✓.**
- **Plan B — Index + content migration + index i18n.** Server `<Link>` track filter; migrate the 3 existing files (split per-locale, add `track`); index-chrome i18n; empty-per-track states.
- **Plan C — Reading page + paper-bridge + reading i18n + gates.** `[slug]` reading page anatomy (measure, TOC, sidenotes, theorem blocks, figures), `PaperBridge`, reading-page i18n superset, a11y manual MathML entry, Lighthouse perf gate, Evidence Collector.

**Out of scope:** interactive explorables/WebGL/sliders; client-side research search; clickable equation cross-reference anchors (KaTeX `\tag{}` emits no linkable id — deferred, see §5); author-affiliation objects; comments/social chrome; re-introducing the per-iteration econometric *exercise UI*; arXiv fetch at build time. **Explicit non-goal: do NOT add `NuqsAdapter` to `(lab)`** (FOUND-11 bundle-isolation barrier).

---

## 3. Information Architecture

### 3.1 Index — `/research`
- Single-column reverse-chronological **list** (no grid/thumbnails). H1 + one-line subheading.
- **Track filter — server-rendered, NOT nuqs (reviewer MAJOR-3 / FOUND-11):** a flat segmented control of `<Link href="/research?track=…">` (`All`, `CFMM Microstructure`, `Abrigo Hedge-Design`, `Notes`). The page reads `searchParams.track` and filters server-side. Zero filter JS (best for LCP), shareable + agent-readable by construction, and it keeps `(lab)` RSC-pure — no `NuqsAdapter`, no client island. Default `All`. Each option encoded as text, not color.
- **Row (extended `PublicationCard`):** Plex-Mono micro-caps type badge (Paper / Decision Memo / Write-up / Talk), title (links *in* to `/research/{slug}` when on-site, else to the landing/bridge), `YYYY.MM.DD · Author` (Plex Mono), 1–2 line teaser (line-clamp-2), track tag.
- **Empty per-track state:** honest "No publications in this track yet" panel (CFMM Microstructure starts empty). Never fabricated placeholders.
- Lineage: Paradigm `/writing`, Panoptic.

### 3.2 Reading page — `/research/{slug}` (hybrid, locale-aware)
**Locale-split content (reviewer BLOCKER-2):** the current single-file bilingual bodies are split into **`{slug}.es.mdx` + `{slug}.en.mdx`** (separate files, one locale each), honoring the es-CO-first / no-machine-translation rule. The collection keys by `{slug, locale}`; `generateStaticParams` enumerates slug × locale; the route renders the body matching the active `NEXT_LOCALE`. (Plan A settles the exact Velite collection shape — globbing `*.{es,en}.mdx` with a derived `locale` field — and migration splits the 3 files on their `## Español`/`## English` boundary.)

Two render modes by `readable_on_site`:
- **Mode A — on-site article (`true`):** full localized MDX body rendered on-site (Abrigo write-ups).
- **Mode B — arXiv/formal landing (`false` + `arxiv_id`):** abstract (may contain math) + key figures + paper-bridge; "Read the full paper on arXiv".
- **Fallback:** neither on-site body nor any bridge (`arxiv_id`/`pdf_url`/`external_url`) → `notFound()` (closes the dead-card gap).

**Shared anatomy:** ~64ch prose measure; figures/equations/tables opt into wider bleed (`.fullwidth`); **TOC/outline from H2/H3**, sticky rail on `lg+`, inline-expanded on narrow (never `<details>`); header = title + `YYYY.MM.DD · Author` (Plex Mono) + type/track badges + abstract block; **Tufte sidenotes → footnotes** (CSS-only, no-JS baseline, ARIA added); **theorem/definition/lemma callouts** (ochre left-rule + text label — color+text, not color-alone); semantic numbered `<figure>/<figcaption>`; **DS2P Labs / ∂²Π** affiliation footer; **paper-bridge block** (arXiv from `arxiv_id` + PDF + copy-able BibTeX + DOI). The on-page BibTeX/DOI block is a deliberate academic differentiator (not observed in the surveyed quant-crypto sample — see Appendix).

**Anti-fishing bright line (reviewer M1):** prose *mention* of a closed result (β, p, CI in running text within a finished memo) is **allowed** — these are finished artifacts. **Forbidden:** reconstructing the per-iteration *exercise UI* (interactive forest plots, gate pass/fail toggles, per-spec sensitivity tables as first-class interactive components). **`fx-vol-cpi-closed-fail` is a FAIL disposition → its reading page renders at IDENTICAL visual weight to a PASS** (no muting, no collapse, no de-emphasis) per LAB-05. The reviewer gate on the plan checks this.
- Lineage: ar5iv, Tufte CSS, gwern (no-JS core), Paradigm.

---

## 4. Content Model — `researchSchema` extensions

Additions to `researchSchema` + the `research` collection in `velite.config.ts`:

```ts
// NEW frontmatter fields:
track: s.enum(['cfmm-microstructure', 'abrigo-hedge-design', 'notes']),  // REQUIRED — see migration note
readable_on_site: s.boolean().default(false),
abstract_es: s.string().optional(),
abstract_en: s.string().optional(),
arxiv_id: s.string().regex(/^\d{4}\.\d{4,5}(v\d+)?$/).optional(),  // post-2007 ids only (deliberate); abs/PDF URLs DERIVED
pdf_url: s.string().url().optional(),
doi: s.string().optional(),
bibtex: s.string().optional(),
// locale derived from filename (*.es.mdx / *.en.mdx); body compiled via s.mdx() — see §5
```

- **`track` is required and has NO default → adding it breaks `velite build` (which runs in `prebuild` + `beforeCompile`, gating every `next build`) for the 3 un-migrated files (reviewer MAJOR-2).** Therefore the schema addition and the frontmatter migration of all 3 files (+ their locale split) land in a **single atomic commit** within Plan B. (Optionally a temporary `.default('notes')` during the edit, removed before commit.)
- arXiv published date, if ever added, stays a **plain string** — never `s.coerce.date()` (avoids the Phase-2/3 JSON↔Date trap). No new shim Date logic is needed; the body is a string and round-trips fine. `arxiv_id`/`pdf_url`/`doi`/`bibtex` stay strings.
- arXiv abstracts may be seeded via `mcp__arxiv__get_abstract` **at authoring time only**, then hand-authored es-CO-first. **Never fetched at build** (hermetic builds).
- The exported test `researchSchema` (used by unit tests without the build pipeline) gets the same field additions; the body/mdx field lives on the collection only.

---

## 5. Math Rendering Pipeline

**Decision: build-time KaTeX via `s.mdx()` + a resurrected RSC `MDXRenderer` (reviewer MAJOR-1 reversal).**

- **Dependency add (Plan A, reviewer BLOCKER-1):** `pnpm add katex remark-math rehype-katex` with pinned versions; verify `rehype-katex`/`remark-math` resolve against the unified/`mdast`/`hast` majors Velite bundles. `@mdx-js/mdx` does NOT need a top-level add (resolves as a nested dep). Record the exact resolved versions in Plan A.
- **Render path:** add a compiled body to the `research` collection via `s.mdx({ remarkPlugins: [remarkMath], rehypePlugins: [rehypeKatex] })` (or the global `mdx:` option in `defineConfig`). KaTeX is rendered **at Velite build time** (in `prebuild`/`beforeCompile`, a Node process — NOT the webpack resolver hook, so Turbopack-safe by construction). Render the compiled body in an RSC via the **resurrected 6-line `MDXRenderer`** (recoverable from git `5056bb7^:components/MDXRenderer.tsx`): `new Function(code)(runtime).default`. This is the **build-time, proven (Phase 2) path** — math compiles once at build, zero per-request cost, best for the 3G LCP budget.
  - The first draft's claim that this path's downside is a CSP `unsafe-eval` coupling is **dropped — there is no CSP in the repo** (reviewer B3). The only real consideration is the `new Function` eval; acceptable absent a CSP, and revisited only if a CSP is later added.
  - **Documented fallback (also exercised in the Plan A spike, not assumed):** `next-mdx-remote/rsc` + `s.raw()` (compiles MDX at render time; pulls `@mdx-js/mdx` into the render path). Use only if `s.mdx()` + RSC renderer fails the spike.
- **KaTeX options:** `output: 'htmlAndMathml'` (MathML for screen readers; visual HTML `aria-hidden`), `throwOnError: false` (bad macro renders as visible source, never a build break).
- **CSS/fonts:** self-host `katex/dist/katex.min.css` (~10KB gzip) + WOFF2 via a **route-scoped import in `app/(lab)/research/layout.tsx`** (new file; Next includes a layout's CSS only for routes under it → scoped to `/research/*`; Turbopack-safe; KaTeX styles only `.katex*` and inherits `currentColor` → no clash with `@theme`/IBM Plex). Fonts: only the ~2–4 faces (~20–40KB) actually referenced by rendered glyphs load; set **`font-display`** (block/short-swap) and preload the 2–3 most-used faces to avoid math FOUC (reviewer M4/MINOR-2). No CDN/external font origin.
- **Display equations:** centered; numbered `(n)` flush-right via manual `\tag{}`; numbers themed ochre, math stays ink. **Clickable cross-references are deferred from v1** (reviewer MAJOR-4: KaTeX `\tag{}` emits no linkable id and `\label/\ref` are unsupported). Tags render as plain text. A rehype `id="eq-N"` plugin + manual `[Eq. (3)](#eq-3)` links is a documented v2 option.
- **Mobile:** `.katex-display { overflow-x: auto; overflow-y: hidden }` + visible scroll affordance (WCAG 1.4.10 at 360px).
- **a11y:** MathML tree for SR. **axe cannot certify MathML → a manual screen-reader spot-check (NVDA/VoiceOver) of one equation is a hard exit criterion of Plan C, recorded with date+reviewer+result in `docs/a11y-audit.md`** (which is currently an empty checklist — reviewer m3).

---

## 6. Components & Routes

**Routes:**
- `app/(lab)/research/page.tsx` — extend: server `<Link>` track filter + `searchParams`-driven server filter. No client island.
- `app/(lab)/research/[slug]/page.tsx` — NEW: locale-aware hybrid reading page; `generateStaticParams` over slug×locale; `generateMetadata` (OG + canonical).
- `app/(lab)/research/layout.tsx` — NEW: route-scoped `katex.min.css` import.

**Components:** `PublicationCard` (extend: track tag, in/out link); `TrackFilter` (server `<Link>` segmented control); `ResearchArticle` (RSC, renders compiled MDX via the resurrected `MDXRenderer` + a custom component map); `ArticleTOC`; `Sidenote`/`Footnote` (CSS-only); `TheoremBlock` (ochre left-rule + label); `PaperBridge` (the **sole `'use client'` island** — BibTeX copy-to-clipboard, reusing the deleted `ReplicationHash` pattern from git `5056bb7^`); `Figure` (numbered/captioned).

**MDX component-map note (reviewer MINOR-3):** all component-map entries (`h2/h3`, `Figure`, `TheoremBlock`, `Sidenote`) are **server components**; only `PaperBridge` is `'use client'`. Keep the map in one module so a stray `'use client'` can't pull the whole map client. Reading page stays RSC with one small island.

---

## 7. Content Migration (Plan B)

For each of the 3 existing `content/research/*.mdx`:
1. **Split bilingual body** into `{slug}.es.mdx` + `{slug}.en.mdx` on the `## Español`/`## English` boundary (reviewer BLOCKER-2).
2. Add `track` (all three → `abrigo-hedge-design`) — **atomic with the schema change** (reviewer MAJOR-2).
3. Set `readable_on_site`: `abrigo-y3-carbon-basket-writeup` → `true` (it has no external artifact; renders on-site, closing the dead-card gap). The two decision-memos keep their GitHub `external_url` bridge; `readable_on_site` decided per file (their bodies are substantive enough to render on-site — likely `true`, with the FAIL memo at equal weight).
4. Add abstracts where useful.
5. CFMM Microstructure track starts **empty** with an honest empty-state.

These bodies use Unicode glyphs, not LaTeX. To exercise the math pipeline, **author at least one body with real `$…$`/`\tag` math** (e.g. convert the Pair-D `Π(σ_T) ≈ K̂·σ_T` to LaTeX, or seed a short CFMM-microstructure note) and **one Mode-B fixture** (a seed paper with `arxiv_id`) so §8 tests can actually pass (reviewer M5).

---

## 8. Testing & Verification

- **Unit (vitest):** `researchSchema` additions (track enum, arxiv_id regex incl. the pre-2007 non-match as a documented case, `readable_on_site` default); BibTeX-copy island; `TheoremBlock` renders label+text (not color-alone).
- **i18n parity:** extend `tests/unit/i18n-coverage.test.ts` with the `research` namespace recursive `assertKeyParity` (it will fail on asymmetric keys — that's the gate). Treat the reading-page i18n superset as **its own task with es-CO-first authoring + `docs/copy-review.md` sign-off as an exit criterion** (reviewer M2) — it's a ~3–5× rewrite, not an "extend".
- **e2e (Playwright, production build via existing `webServer`):** `/research` 200 + server track filter updates `?track=` + shareable; on-site article 200 renders a `.katex`/`math` node **AND asserts it is NOT `.katex-error`** (catches silent macro failures under `throwOnError:false` — reviewer MINOR-5); TOC present (not collapsed); paper-bridge present where applicable; Mode-B arXiv-landing fixture renders abstract + bridge; invalid slug → 404; both locales render the correct single-locale body; no-JS first paint renders body + footnotes. Tests for math/Mode-B are `fixme` until the §7 fixtures exist, then filled.
- **a11y (axe):** index + reading page; **plus the manual MathML screen-reader entry recorded in `docs/a11y-audit.md`** (hard exit criterion, reviewer m3).
- **perf:** Lighthouse LCP < 2.5s on the reading page; **quantify the KaTeX font subset and `font-display`**; documented fallback (unicode-range subsetting) if the gate fails (reviewer M4).
- **impeccable:** `npx impeccable detect app/` exit 0.
- **Evidence Collector live-verify** after the index task and the reading-page task: equations render visually + not error-spans, TOC visible, BibTeX copies, mobile equation scroll, locale toggle, anti-fishing parity (FAIL memo == PASS weight).

---

## 9. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| `s.mdx()` + `new Function` RSC renderer fails under Next 16.2/Turbopack | **Gating Plan A spike** proves it live (both `dev --turbopack` and `build && start`) before anything downstream; `next-mdx-remote/rsc` + `s.raw()` exercised in the same spike as a proven (not assumed) fallback. |
| Math deps incompatible with Velite's bundled unified/mdx majors | Plan A pins + verifies resolved versions before proceeding. |
| Bilingual-body split loses content / mis-keys locale | Split is mechanical (H2 boundary); e2e asserts each locale renders its single-locale body; native-reviewer copy sign-off. |
| `track` required field breaks build | Schema + migration atomic (§4, §7). |
| KaTeX fonts hurt 3G LCP | Build-time render (no math JS), route-scoped CSS, font subset + `font-display` + preload; hard Lighthouse gate with subsetting fallback. |
| MathML a11y unverifiable by axe | Manual SR spot-check recorded in `docs/a11y-audit.md` as a hard exit criterion. |
| Anti-fishing line crossed by rendering result-laden memos | Operational bright line (§3.2): prose results OK, exercise UI forbidden; FAIL memo at equal weight; reviewer gate on the plan checks it. |
| Scope creep into explorables | Out of scope (§2). |

---

## 10. Process

- Tracked as decimal phase **3.1** (research reading surface), three sequenced plans (§2: A gating spike+pipeline → B index+migration+i18n → C reading page+bridge+gates).
- Per `CLAUDE.md`: **this spec passed the two-reviewer gate** (Reality Checker ∥ Frontend Developer) — all 4 BLOCKERs + 9 MAJORs resolved inline above; cheap MINORs folded in. The implementation **plan** will pass the same gate before execution.
- Implementation honors: atomic commits, Evidence Collector per route task, biome+tsc pre-commit, es-CO-first copy with `docs/copy-review.md` sign-off.

---

## Appendix — Exemplar Lineage

| Pattern | Source |
|---------|--------|
| List index + flat (server) track filter, sober register | Paradigm `/writing`, Panoptic |
| Build-time KaTeX, `htmlAndMathml`, no client math JS | ar5iv, Gundersen blog-theme, KaTeX docs |
| Numbered display eqs (plain `\tag`; clickable cross-refs deferred) | ar5iv |
| ~64ch measure, wider-bleed figures, sidenotes→footnotes | Tufte CSS, Ciechanowski |
| No-JS core reading (progressive enhancement) | gwern.net |
| Theorem/definition callout blocks | ar5iv, academic-blog convention |
| On-page BibTeX + DOI (differentiator — not seen in the surveyed quant-crypto sample) | survey gap analysis |
| Per-equation horizontal overflow at 360px | KaTeX docs |

*Full survey reports were generated to `/tmp/research-ui-survey/{01,02,03}-*.md` (transient); load-bearing findings folded into §3–§5. Per reviewer m1, the "nobody ships BibTeX/DOI" claim is scoped to the surveyed sample, not asserted as a universal absolute.*
