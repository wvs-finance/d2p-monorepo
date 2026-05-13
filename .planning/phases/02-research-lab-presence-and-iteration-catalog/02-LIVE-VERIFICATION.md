---
status: pass
runtime: production
target_url: https://www.d2pfinance.xyz
head_commit: 1d867d6
prior_head_commit: f0b5311
screenshots_dir: /home/jmsbpp/apps/d2p/frontend/.playwright-mcp/d2p-verify-2
verified_at: 2026-05-13T08:13:00-04:00
verifier: EvidenceQA (Playwright MCP, live browser)
summary:
  pass: 10
  partial: 2
  fail: 0
deferred:
  - mcp_discovery_endpoint_path_mismatch  # known, deferred per Phase 2 fix scope
  - catalog_card_height_title_length_drift  # known, title-length driven not status-driven
residual_partials:
  - locale_switcher_no_op_on_static_iteration_detail_pages  # force-static + dynamicParams=false locks served HTML to default locale; MDX still bilingual inline
  - h1_strip_height_delta_pair_d_vs_fx_vol  # title-length driven, same as catalog finding; first-paragraph + scrollHeight prove equal weight
---

# Phase 2 — Live In-Browser Verification

## Re-verification pass — 1d867d6 (2026-05-13T08:13:00-04:00)

**Scope:** verify that the Phase 2 fix in commit `1d867d6` (rename `[slug]/v[version]` → `[slug]/[version]`, embed `v` prefix in param value, force-static + dynamicParams=false) actually resolves the two priority-1 blockers (Pair D and FX-vol detail pages returning 404).
**Method:** Playwright MCP, real Chromium @ 1280×900, against production `https://www.d2pfinance.xyz`.
**Screenshots:** `/home/jmsbpp/apps/d2p/frontend/.playwright-mcp/d2p-verify-2/` (8 captures; also reachable at `/tmp/d2p-verify-2/` via symlink).

### Headline finding

**The blocker is closed.** All four iteration detail pages — Pair D (PASS), FX-vol (FAIL), dev-AI Stage-1 (IN_PROGRESS), Pair B Bittensor (PARKED) — now return HTTP 200 with full content, zero console errors, and the expected EvidenceChain / DispositionMemo / JSON-LD structures. The 6 routes that passed in the first pass still pass. Two residual partials remain (locale switcher being a no-op on the now-static detail pages, and a title-length-driven H1 strip height delta) — neither affects the demo-critical path.

### Priority 1 — the fix (per detail page)

#### 1. `/apps/abrigo/iterations/pair-d/v1` — PASS demo — ✓ PASS

| Claim | Evidence | Verdict |
|---|---|---|
| HTTP 200 | Page title `Pair D — Colombian young-worker services × COP/USD lagged 6–12mo — Abrigo / DS2P Labs` rendered; no 404 fallback | ✓ |
| H1 contains "Pair D" | `<h1>Pair D — servicios jóvenes Colombia × COP/USD (6–12 meses rezagado)</h1>` | ✓ |
| PASS status pill (color + check icon + visible "PASS" text) | `<status>` with `<img>` (lucide check) + `<generic>Aprobado</generic>` (es-CO label; "Pass" in en locale per regression smoke) | ✓ |
| β = +0.13670985 (or formatted) | Body text matches `+0.13670984` (8-decimal form in MDX); evidence chain definition list shows `+0.136710`; figure aria-label `β = 0.1367, 95% CI [0.0884, 0.1850]` | ✓ |
| CI bounds ~0.0884 / ~0.1850 | DOM regex match `[0.0884, 0.1850]`; figure caption matches | ✓ |
| p ≈ 1.46×10⁻⁸ | Body regex match `1.46e-8`; evidence chain definition shows `1.46e-8` | ✓ |
| N = 134 | Body regex match `N = 134`; evidence chain definition shows `N = 134` | ✓ |
| replication_hash (`d4790e74…` truncated) | `aria-label="Replication hash: d4790e743cdec62f1368cab1833e1266cb2da763d7c0931dd732bdf3d17938cf"` with displayed text `d4790e74…38cf` and Copy button | ✓ |
| `<details>` "Cómo verificar / How to verify" expandable | Exactly 1 `<details>` element in main; summary text `"Cómo verificar este hash"` | ✓ |
| 5-section MDX narrative (Spec / Data / Estimation / Tests / Disposition) | Six `<h2>` inside article: `Especificación / Spec`, `Datos / Data`, `Estimación / Estimation`, `Pruebas / Tests`, `Disposición / Disposition`, `Cadena de evidencia` | ✓ |
| Two JSON-LD blocks (`Dataset` + `ScholarlyArticle`) | `document.querySelectorAll('script[type="application/ld+json"]').length === 4`; parsed @type list: `[Organization, WebSite, Dataset, ScholarlyArticle]` (Dataset + ScholarlyArticle present in addition to root-layout Organization+WebSite) | ✓ |
| Console errors | 0 | ✓ |

**Screenshot:** `/home/jmsbpp/apps/d2p/frontend/.playwright-mcp/d2p-verify-2/1-pair-d.png` (full page, 3303-px tall main)

#### 2. `/apps/abrigo/iterations/fx-vol-on-cpi-surprise/v1` — FAIL demo — ✓ PASS

| Claim | Evidence | Verdict |
|---|---|---|
| HTTP 200 | Page title `FX volatility response to CPI surprise — Colombia — Abrigo / DS2P Labs` | ✓ |
| H1 contains "FX" / "Volatilidad FX" | `<h1>Volatilidad FX ante sorpresa CPI — Colombia</h1>` | ✓ |
| FAIL status pill (color + X-circle icon + visible "FAIL" text) | `<status>` with `<img>` + `<generic>Rechazado</generic>` (Spanish FAIL label) at the page header strip, AND a second `<status>` with the same `Rechazado` label inside the DispositionMemo region | ✓ |
| β̂ = -0.000685 | Body regex match `-0.000685`; evidence chain definition shows `-0.000685`; figure caption `β = -0.0007, 95% CI [-0.0036, 0.0023]` | ✓ |
| 90% CI [-0.003635, 0.002265] | Body regex match `[-0.003635, 0.002265]`; aside shows rounded `[-0.0036, 0.0023]` | ✓ |
| n = 947 | Body regex match `n = 947`; evidence chain definition `N = 947` | ✓ |
| replication_hash `769ec955…` visible | `aria-label="Replication hash: 769ec955e72ddfcb6ff5b16e9c949fd8f53d9e8c349fc56ce96090fce81d791f"` with displayed text `769ec955…791f` | ✓ |
| **DispositionMemo at same visual depth as Pair D PASS page — NOT collapsed, NOT muted, NOT in `<details>`** | DOM contains a top-level `<region aria-label="Disposición">` inside the main article column. `detailsTags === 1` (the same "How to verify" pattern used by Pair D). The region is NOT a descendant of any `<details>` element (`closest('details')` returns null). Status pill inside has full opacity, default text color, normal font size — no muting | ✓ |
| Two JSON-LD blocks (`Dataset` + `ScholarlyArticle`) | `script[type="application/ld+json"].length === 4`; @type list includes Dataset + ScholarlyArticle | ✓ |
| Console errors | 0 | ✓ |

**Screenshot:** `/home/jmsbpp/apps/d2p/frontend/.playwright-mcp/d2p-verify-2/2-fx-vol.png` (full page, 3730-px tall main — **427 px LONGER than Pair D, not shorter**)

#### 3. `/apps/abrigo/iterations/dev-ai-stage-1-section-j/v1` — IN_PROGRESS — ✓ PASS

| Claim | Evidence | Verdict |
|---|---|---|
| HTTP 200 | Page title `dev-AI Stage-1 — Colombian Section J (ICT) × COP/USD (in progress) — Abrigo / DS2P Labs` | ✓ |
| IN_PROGRESS pill | `<status>` present in header strip | ✓ |
| Placeholder narrative, no invented numeric values | `inventedBeta === false`, `inventedN === false` (regex `/β\s*=\s*[+-]?\d+\.\d+/` and `/N\s*=\s*\d+/` both return no match); body length 2857 chars (substantive but no numeric claims) | ✓ |
| Console errors | 0 | ✓ |

**Screenshot:** `/home/jmsbpp/apps/d2p/frontend/.playwright-mcp/d2p-verify-2/3-dev-ai-in-progress.png`

#### 4. `/apps/abrigo/iterations/pair-b-bittensor/v1` — PARKED — ✓ PASS

| Claim | Evidence | Verdict |
|---|---|---|
| HTTP 200 | Page title `P1 Bittensor SN18 — AI subnet exposure (parked) — Abrigo / DS2P Labs` | ✓ |
| PARKED pill | `<status>` present in header strip; H1 contains `(pausada)` qualifier | ✓ |
| Authentic parked-reason narrative | Body length 2945 chars; mentions "pausado/parked"; no invented β | ✓ |
| Console errors | 0 | ✓ |

**Screenshot:** `/home/jmsbpp/apps/d2p/frontend/.playwright-mcp/d2p-verify-2/4-pair-b-parked.png`

### Priority 2 — equal-weight invariant (CROSS-09 + ITER-06) — ⚠ PARTIAL (anti-fishing satisfied)

Measured at 1280×900 viewport, main element top boundaries:

| Metric | Pair D (PASS) | FX-vol (FAIL) | Delta | Interpretation |
|---|---|---|---|---|
| `<header>` strip height | 183 px | 138 px | -45 px | Title-length driven (Pair D H1 wraps to 2 lines, FX-vol H1 fits on 1 line) |
| `<h1>` box height | 90 px | 45 px | -45 px | Same — single source of the strip delta |
| First `<p>` height | 264 px | 264 px | **0 px (identical)** | Equal-weight body text |
| `<main>` total scrollHeight | 3303 px | **3730 px** | **+427 px (FAIL is LONGER)** | FX-vol carries a full DispositionMemo region in addition to the same 5-section MDX |
| H2 count | 6 (Spec / Data / Est / Tests / Disp / Cadena) | 7 (same 5 MDX + Disposición memo + Cadena) | FAIL has +1 section | FAIL page exceeds PASS page depth |
| `<details>` count | 1 (How to verify) | 1 (How to verify) | identical | Disposition is NOT collapsed |

**Anti-fishing verdict:** ✓ The FAIL page is *not* collapsed, muted, demoted, or shortened. It is in fact longer and more structurally complete than the PASS page (DispositionMemo region is rendered at the same visual hierarchy as the MDX article). The header-strip delta is the same title-length-driven artifact already documented for catalog cards (Finding 1 in original section below) and does not represent a status-driven asymmetry. PARTIAL only because the literal "identical bounding box" reading fails for the header strip; the substantive equal-weight invariant is satisfied.

### Priority 3 — locale parity (Pair D) — ⚠ PARTIAL (regression introduced by fix)

| Step | Evidence | Verdict |
|---|---|---|
| Set `NEXT_LOCALE=en` cookie via document.cookie | Cookie applied (`document.cookie === "NEXT_LOCALE=en"`) | – |
| Click "English" button in nav (server action POST) | 3 server-action POST requests to `/apps/abrigo/iterations/pair-d/v1` returned 200; English button transitioned to `[active]` state | – |
| Page lang attribute after toggle | `<html lang="es-CO">` — **unchanged** | ✗ |
| "Cómo verificar" → "How to verify" | Stays "Cómo verificar este hash" | ✗ |
| "Hash de replicación" → "Replication hash" | Stays "Hash de replicación" | ✗ |
| "versión" → "version" | Stays "versión" | ✗ |
| Translation keys leaking (e.g. `iterations.detail.spec`) | None — `/iterations\.detail\./` returns no match | ✓ |
| Control: homepage with same cookie | `https://www.d2pfinance.xyz/` returns `<html lang="en">`, H1 still `DS2P Labs`, "English" nav button now `[disabled]` (active) | ✓ |

**Diagnosis:** the Phase 2 fix added `dynamic = 'force-static'` + `dynamicParams = false` to pre-render the 4 iteration detail routes at build time. Vercel now serves a single pre-built HTML response per route (the default es-CO locale build) and ignores `NEXT_LOCALE` at request time — the cookie has no effect on the served HTML for these routes specifically. Other pages (homepage, about, team, research, catalog, /apps/abrigo) still honor the cookie and switch locale correctly.

**Mitigating factor:** the iteration MDX content itself is authored bilingually — every `<p>` contains both `(es-CO) ...` and `(en) ...` text inline. So an English-only reader still gets the full empirical content on the detail page; only the UI chrome labels (nav, "How to verify" summary, "Replication hash" term, "versión" caption, status pill text) remain in Spanish. No translation keys leak; nothing is broken — just statically frozen in the default locale.

**Verdict:** ⚠ PARTIAL. Acceptable for the demo (bilingual MDX covers the narrative), but a real regression from the previous deploy where chrome could switch. Flagged as `residual_partials.locale_switcher_no_op_on_static_iteration_detail_pages` for a follow-up phase.

**Screenshot:** `/home/jmsbpp/apps/d2p/frontend/.playwright-mcp/d2p-verify-2/5-pair-d-en.png` (taken after cookie-set attempt; visually still es-CO chrome, proving the freeze)

### Priority 4 — regression smoke (6 known-good routes) — ✓ ALL PASS

| Route | H1 | Key check | Lang | Console errors | Verdict |
|---|---|---|---|---|---|
| `/` | `DS2P Labs` | 4 tile labels `Pass / Fail / In Progress / Parked` present; `wvs-finance` link present | en (cookie active) | 0 | ✓ |
| `/about` | `Methodology` | 5 NumberedSteps (`01–05`) | en | 0 | ✓ |
| `/team` | `Team` | `Juan Serrano` rendered; JMSBPP GitHub link in HTML | en | 0 | ✓ |
| `/research` | `Research` | 3 `<article>` PublicationCards | en | 0 | ✓ |
| `/apps/abrigo` | `Abrigo — ∂²Π gamma` | external link `x.com/d2pfinabrigo` present | en | 0 | ✓ |
| `/apps/abrigo/iterations` (default) | `Iteration catalog — Abrigo` | 4 cards in `<ul>`/`<ol>` list | en | 0 | ✓ |
| `/apps/abrigo/iterations?status=FAIL` | `Iteration catalog — Abrigo` | exactly 1 card; title `FX volatility response to CPI surprise — Colombia` | en | 0 | ✓ |

**Screenshots:** `6-home-en.png`, `7-catalog-fail-filter.png`, `8-catalog-all.png` (representative captures; about/team/research H1 + count assertions captured via `browser_evaluate` rather than screenshots since the prior pass already had them).

### Deferred (not re-verified, per prompt)

| Item | Status | Reason |
|---|---|---|
| `/llms.txt` advertising `/api/mcp/sse` instead of `/api/mcp/mcp` | Still broken (per prior section, Finding 2) | Explicitly out of scope for the Phase 2 fix; deferred to a follow-up MCP-discovery phase |
| Catalog card-height parity (Pair D 161 vs FX-vol 136 @ 1280w) | Still title-length driven (per prior section, Finding 1) | Defensible per UI-SPEC "equal weight" reading; only the literal "identical bounding box" reading fails |

### Scoreboard (post-fix)

- ✓ PASS (10): `/`, `/about`, `/team`, `/research`, `/apps/abrigo`, `/apps/abrigo/iterations`, plus all 4 iteration detail pages
- ⚠ PARTIAL (2): locale switcher inert on static iteration detail pages (chrome-only; MDX still bilingual); H1-strip height delta on Pair D vs FX-vol (title-length driven, equal-weight invariant satisfied via first-paragraph + scrollHeight)
- ✗ FAIL (0)
- ⊘ DEFERRED (2): MCP discovery endpoint mismatch; catalog card-height drift — both known and explicitly out of this fix's scope

### Bottom line

The fix in `1d867d6` closes both priority-1 blockers (404s on Pair D and FX-vol). The four iteration detail pages now render with full EvidenceChain + DispositionMemo + JSON-LD + bilingual MDX content. Anti-fishing equal-weight invariant is satisfied (FAIL page is longer and structurally richer than PASS page, not collapsed or muted). One regression was introduced as a side effect of forcing the detail pages static: the locale switcher is a no-op on those four URLs, but the MDX content remains bilingual inline so no reader is locked out of the English content. Frontmatter `status:` updated from `fail` to `pass`.

---

# Phase 2 — Live In-Browser Verification

**Target:** https://www.d2pfinance.xyz (production, Vercel deployment `dpl_Aet13twnn8xWiabJpnqXkbmLmSFH`)
**Method:** Playwright MCP — real Chromium navigation, DOM snapshots, computed-style introspection, network-level curl for agent endpoints.
**Stance:** Default skepticism. Every claim demanded a screenshot or DOM evidence.

---

## Headline finding

The two iteration-detail pages that the phase exists to demonstrate — `/apps/abrigo/iterations/pair-d/v1` (PASS demo) and `/apps/abrigo/iterations/fx-vol-on-cpi-surprise/v1` (FAIL demo) — **return HTTP 404 in production**. Vercel routes the request to the correct dynamic segment (`x-matched-path: /apps/abrigo/iterations/[slug]/v[version]`), so it is not a routing-config problem; the server function executes, fails to find the iteration in the Velite collection (`iterations.find(...) === undefined`), and falls through to `notFound()`. The recent fix commits — `2306e5c` (prebuild velite step), `2a0e387` (trace .velite JSON), `f0b5311` (runtime Date coercion) — have not resolved this on the deployed bundle.

This breaks every requirement that depends on the detail page (ITER-03, 04, 05, 06, 09 — five of nine ITER requirements), invalidates `02-VERIFICATION.md`'s claim that those routes are `VERIFIED`, and means the hackathon demo critical path is currently non-functional even though every supporting page renders correctly. The static, listing-side surface — homepage, about, team, research, catalog, agent endpoints, locale switching — is solid.

---

## Per-route verification

### 1. `/` — Lab homepage (LAB-01) — PASS

| Claim (UI-SPEC / VERIFICATION) | Evidence | Verdict |
|---|---|---|
| DS2P Labs wordmark in hero | `<h1>DS2P Labs</h1>` rendered (es-CO); "Hedging instruments for macro-risk exposure" (en) | PASS |
| 4 iteration count tiles (PASS:1 / FAIL:1 / IN_PROGRESS:1 / PARKED:1) | `[role=status]` list inside `region "Estado del catálogo"`: Aprobado=1, Rechazado=1, Pausado=1, En progreso=1 (matches counts in `.velite/iterations.json` — 4 entries) | PASS |
| "What is d2-π" explainer | `<h2>¿Qué es d2-π?</h2>` + body paragraph rendered | PASS |
| Apps overview card linking to `/apps/abrigo` | `<a href="/apps/abrigo">Abrigo … Ver Abrigo</a>` | PASS |
| GitHub link to `wvs-finance` | `<a href="https://github.com/wvs-finance">wvs-finance en GitHub</a>` plus footer link | PASS |
| Muted-ochre accent | CSS variable `--color-accent-default` resolves to `lab(53.504% 11.7174 31.6657)` — equivalent to `oklch(0.6 0.08 70)` | PASS |
| IBM Plex Sans loaded | `font-family: "IBM Plex Sans", "IBM Plex Sans Fallback", system-ui, ...` on body and `<h1>` | PASS |
| Console errors | 0 | PASS |

**Screenshot:** `.playwright-mcp/d2p-verify/verify-1-home.png`

---

### 2. `/about` — Methodology (LAB-05) — PASS

| Claim | Evidence | Verdict |
|---|---|---|
| H1 "Metodología" (es-CO) / "Methodology" (en) | DOM shows both via locale toggle (`htmlLang=es-CO` → "Metodología", `htmlLang=en` → "Methodology") | PASS |
| 5 NumberedSteps | Five blocks with `01 / 02 / 03 / 04 / 05` headings: Especificación / Datos / Estimación / Pruebas / Disposición | PASS |
| 4 CheckmarkList items | `<ul>` with 4 `<li>` each containing icon + text: decision-quote precedes test, trio of verification, STOP on spec-data conflict, rejection-equal-weight | PASS |
| No marketing phrases | grep over rendered body text for `empower / revolutionize / unlock / supercharge / leverage` → zero hits (both locales) | PASS |
| Console errors | 0 | PASS |

**Screenshot:** `.playwright-mcp/d2p-verify/verify-2-about.png`

---

### 3. `/team` — Contributors (LAB-02) — PASS

| Claim | Evidence | Verdict |
|---|---|---|
| ContributorCard with JMSBPP | `<li>` containing "Juan Serrano" + role "Investigador principal — econometría estructural" + GitHub link `https://github.com/JMSBPP` + focus iteration `pair-d` | PASS |
| Both locales render with no key leakage | en-locale H1="Team", Juan Serrano text present; es-locale H1="Equipo" | PASS |

**Screenshot:** `.playwright-mcp/d2p-verify/verify-3-team.png`

---

### 4. `/research` — Publications (LAB-03) — PASS

| Claim | Evidence | Verdict |
|---|---|---|
| ≥3 PublicationCards from Velite research collection | Three `<article>` cards rendered: "Pair D Stage 2 — informe de despacho (M-sketch)", "FX-vol vs sorpresa CPI — cierre por fracaso", "Abrigo Y₃ × canasta de carbono — borrador" | PASS |
| Order prefix (font-mono accent) | Each article has a leading `01` / `02` / `03` glyph rendered in its own generic before the heading | PASS |
| Badge type label | Badges visible: "Memo de decisión" (×2), "Borrador de trabajo" (×1) | PASS |
| line-clamp-2 preview | Each card has a single preview paragraph | PASS |
| ArrowUpRight CTA | "Leer documento" link with chevron icon to abrigo-analytics repo paths | PASS |

**Screenshot:** `.playwright-mcp/d2p-verify/verify-4-research.png`

---

### 5. `/apps/abrigo` — Abrigo overview (APP-01) — PASS

| Claim | Evidence | Verdict |
|---|---|---|
| H1 + Abrigo mission copy | `<h1>Abrigo — gamma ∂²Π</h1>` followed by full mission paragraph | PASS |
| External link to `https://x.com/d2pfinabrigo` | `<a href="https://x.com/d2pfinabrigo">` present in DOM | PASS |

**Screenshot:** `.playwright-mcp/d2p-verify/verify-5-apps-abrigo.png`

---

### 6. `/apps/abrigo/iterations` — Catalog (ITER-01 + ITER-02) — PARTIAL

| Claim | Evidence | Verdict |
|---|---|---|
| All 4 iteration cards visible by default | Default URL: 4 `<li>` in main list (`dev-ai-stage-1-section-j`, `pair-d`, `pair-b-bittensor`, `fx-vol-on-cpi-surprise`) | PASS |
| Status pills render color + icon + visible text | Each card contains `[role=status]` with `<img>` (lucide icon) + `<span>` with label text (Aprobado / Rechazado / Pausado / En progreso) | PASS |
| `?status=FAIL` filter — only fx-vol | Navigated to `?status=FAIL`: visibleCards=1, heading="Volatilidad FX ante sorpresa CPI — Colombia" | PASS |
| `?status=PASS` filter — only Pair D | Navigated to `?status=PASS`: visibleCards=1, heading starts "Pair D — servicios jóvenes Colombia" | PASS |
| Empty filter — all 4 | Confirmed in default load | PASS |
| Cards have IDENTICAL bounding-box height | `min-h-[120px]` is enforced on every card, BUT actual heights diverge: IN_PROGRESS=133, PASS=161, PARKED=133 (wait, 120 on first render — second eval gave 120), FAIL=136. Width identical at 429. **The 25-px height delta between PASS (161) and FAIL (136) is driven by the Pair D card's heading wrapping to one extra line — both PASS and FAIL render the `β = …` row, so the asymmetry is title-length-driven, not status-driven.** | PARTIAL — see Findings #1 |

**At 360px mobile breakpoint** (single-column stack): heights are IN_PROGRESS=183, PASS=186, PARKED=158, FAIL=161; same pattern (PASS card title wraps to more lines). No layout collapse, all cards readable.

**Screenshots:** `.playwright-mcp/d2p-verify/verify-6-iterations-all.png`, `verify-6b-iterations-fail.png`, `verify-mobile-360-iterations.png`, `verify-11-iterations-en.png`

---

### 7. `/apps/abrigo/iterations/pair-d/v1` — PASS detail (ITER-03/04/05/07/09) — **FAIL (unreachable)**

| Claim | Evidence | Verdict |
|---|---|---|
| PASS pill at top + H1 "Pair D" | Page renders Next.js default 404 fallback. `document.title === "404: This page could not be found."`, `<h1>404</h1>` | FAIL |
| EvidenceChain shows β = +0.13670985 / 95% CI / p ≈ 1.46×10⁻⁸ / N = 134 | Not rendered — page is 404 | FAIL |
| replication_hash visible (d4790e74…) | Not rendered — page is 404 | FAIL |
| `<details>` "How to verify" / "Cómo verificar" | Not rendered — page is 404 | FAIL |
| 5-section MDX narrative | Not rendered — page is 404 | FAIL |
| 2 JSON-LD script tags (`Dataset` + `ScholarlyArticle`) | Not present in HTML response (only organisation + WebSite blocks from root layout) | FAIL |
| Renders in both locales | 404 in both `es-CO` and `en` (confirmed by locale switch + re-navigation) | FAIL |

**Network evidence:**
```
HTTP/2 404
x-matched-path: /apps/abrigo/iterations/[slug]/v[version]
x-vercel-id: iad1::iad1::dp45t-…
```
The dynamic route IS matched by Vercel; the server function emits `NEXT_HTTP_ERROR_FALLBACK;404` (visible in the RSC payload). Root cause: `iterations.find(...)` returns `undefined` inside the serverless function — the Velite collection is not present at runtime despite `generateStaticParams` enumerating it at build. Local `.velite/iterations.json` contains the correct entries with populated `replication_hash` (`d4790e74…` for Pair D, `769ec955…` for fx-vol), so the source content is fine; the bundling fix is incomplete.

**Screenshot:** `.playwright-mcp/d2p-verify/verify-7-pair-d-404.png`

---

### 8. `/apps/abrigo/iterations/fx-vol-on-cpi-surprise/v1` — FAIL detail (ITER-06) — **FAIL (unreachable)**

Same diagnosis as route 7. HTTP 404, default Next.js error page, no DispositionMemo, no β̂ = -0.000685, no replication_hash 769ec955… visible.

**Screenshot:** `.playwright-mcp/d2p-verify/verify-8-fx-vol-404.png`

---

### 9. Agent surfaces (AGENT-*) — PARTIAL

| Endpoint | Method | Expected | Observed | Verdict |
|---|---|---|---|---|
| `/llms.txt` | GET | 200, text/plain | 200, `text/plain; charset=utf-8`, 741 bytes | PASS |
| `/.well-known/mcp.json` | GET | 200, JSON | 200, `application/json`, body declares server at `/api/mcp` with transports `[streamable-http, sse]` | PASS |
| `/.well-known/openapi.yaml` | GET | 200 | 200, `application/yaml; charset=utf-8`, valid OpenAPI 3.1 header | PASS |
| `POST /api/mcp/streamable-http` with `tools/list` | JSON-RPC over Streamable HTTP | 200 + valid JSON-RPC | **404** ("Not found"). Route file is `app/api/mcp/[transport]/route.ts` — only `POST /api/mcp/mcp` returns a valid SSE JSON-RPC response (`{"code":-32601,"message":"Method not found"}` for `tools/list`, which is expected behaviour for a zero-tool Phase 1 stub) | FAIL — path mismatch |

**Sub-finding:** `llms.txt` advertises `/api/mcp/sse` but neither that path nor `/api/mcp/streamable-http` exists. The actual working endpoint is `/api/mcp/mcp` (because the `[transport]` segment defaults to literal "mcp" in the mcp-handler library) and the unparameterised root `/api/mcp` (returns HTML — that's wrong; it should also be a transport endpoint or return 405). Documentation and route handler are out of sync.

---

### 10. i18n parity (LAB-06)

| Route | es-CO H1 | en H1 (after `English` toggle) | Key leakage | Verdict |
|---|---|---|---|---|
| `/` | "DS2P Labs" | "DS2P Labs" (sub-line + body switch to English; html lang = `en`) | none | PASS |
| `/about` | "Metodología" | "Methodology" | none | PASS |
| `/team` | "Equipo" | "Team" | none | PASS |
| `/research` | "Investigación" | "Research" | none | PASS |
| `/apps/abrigo` | "Abrigo — gamma ∂²Π" | (not re-tested but locale toggle visible in nav) | n/a | PASS |
| `/apps/abrigo/iterations` | "Catálogo de iteraciones — Abrigo" | "Iteration catalog — Abrigo"; status pills become "In Progress / Pass / Parked / Fail" | none | PASS |
| pair-d/v1 detail | 404 | 404 | n/a | FAIL (locale-independent 404) |
| fx-vol/v1 detail | 404 | 404 | n/a | FAIL (locale-independent 404) |

No translation keys leaked through to the rendered UI on any of the 6 list/landing surfaces.

---

## Diagnostic deep-dive — iteration detail 404

**Reproduction (curl, no JS):**
```
$ curl -sI https://www.d2pfinance.xyz/apps/abrigo/iterations/pair-d/v1
HTTP/2 404
x-matched-path: /apps/abrigo/iterations/[slug]/v[version]
x-powered-by: Next.js
```

**Variants tested (all return 404):**
- `/pair-d/v1`
- `/pair-d/v01`
- `/pair-d/version-1`
- `/pair-d/1`
- `/fx-vol-on-cpi-surprise/v1`

**Source-of-truth check:**
- `app/(apps)/apps/abrigo/iterations/[slug]/v[version]/page.tsx` exists and calls `iterations.find(i => i.slug === slug && i.version === Number.parseInt(version, 10))`.
- `.velite/iterations.json` (committed to repo, head `f0b5311`) contains the entries with `replication_hash` already populated (matches the `ca7b397` gap closure described in `02-VERIFICATION.md`).
- `generateStaticParams` enumerates `iterations.map(it => ({ slug, version: String(it.version) }))`.

**Why it 404s:** The Vercel serverless function bundle does not contain `.velite/iterations.json` at runtime, so `iterations` is `[]` and `find` returns `undefined`, triggering `notFound()`. The route shell ships (Vercel matches the dynamic segment), but the data does not. Recent commits explicitly target this:
- `2306e5c` — added `prebuild` running `pnpm velite build` before `next build`
- `2a0e387` — "trace .velite JSON into serverless function bundles"
- `f0b5311` — "runtime Date coercion + remove unused tracing config"

None of these have produced a passing detail page in the deployed bundle. Likely remediation paths:
1. Replace runtime `iterations.find(...)` with a build-time pre-computed map written into the route source (avoids needing the Velite JSON inside the serverless lambda).
2. Use the App Router `force-static` + full SSG mode for the dynamic segment so the responses are served from the static output and never invoke the serverless function.
3. Verify the Vercel `outputFileTracingIncludes` / `outputFileTracingRoot` config actually picks up `.velite/**/*.json` — and inspect a real Vercel build log to confirm `.velite` files are present in the function bundle.

---

## Cross-cutting findings

### Finding 1 — Iteration card heights are NOT identical (PARTIAL on ITER-02)
The UI-SPEC reads "equal-weight FAIL/PASS, `min-h-[120px]` catalog cards" and `02-VERIFICATION.md` claims `iteration-catalog-equal-weight.spec.ts` "pins bounding-box height equality." Live measurement at 1280-wide viewport:

| Card | Status | Height (px) |
|---|---|---|
| dev-ai-stage-1-section-j | IN_PROGRESS | 133 |
| pair-d | PASS | **161** |
| pair-b-bittensor | PARKED | 120 (initial) / 133 (after warm) |
| fx-vol-on-cpi-surprise | FAIL | 136 |

The **25-px gap between PASS (Pair D, 161) and FAIL (fx-vol, 136)** at 1280px width is driven by the Pair D heading wrapping to one additional line; both cards render an identical `β = …` paragraph, so this is title-length-driven and not a deliberate status asymmetry. At 360px (single column) the gap shrinks to 25 px (186 vs 161), same pattern. The spec phrasing "equal weight" is debatably satisfied (no color/typography asymmetry, no truncation, no de-emphasis) but the literal "IDENTICAL bounding-box height" claim in the verification prompt is not satisfied — `min-h` floors the cards, content drives ceilings.

### Finding 2 — `/llms.txt` advertises broken endpoints
The deployed `/llms.txt` (741 bytes) lists:
- `/iterations` as the iteration catalog (real path is `/apps/abrigo/iterations`)
- `/api/mcp/sse` as the MCP server (no such route exists; only `/api/mcp/mcp` works)

Both will mislead agent crawlers. The mcp-handler library default is `POST /api/mcp/mcp` (transport literal `mcp`), so either `llms.txt` should advertise `/api/mcp/mcp` or `.well-known/mcp.json` should be normative (it points to `/api/mcp` which itself only returns HTML on GET).

### Finding 3 — Locale switching is solid, no key leakage anywhere
Every list/landing route renders authored copy in both `es-CO` and `en`. Status labels translate cleanly (PASA/Aprobado, FALLA/Rechazado, etc.). No `iterations.detail.evidence.beta_label`-style template strings leaked.

### Finding 4 — Mobile breakpoint behaves
At 360 px the catalog grid collapses to a single column, cards stay readable (158–186 px height), no horizontal scroll, no overlap with the sticky nav.

### Finding 5 — Zero JavaScript console errors on any working page
Pages 1–6 and 10 produced zero `console.error` entries during navigation. Both 404 pages emit a single `Failed to load resource: 404` entry (the page itself).

---

## Bug list (reproducible)

| # | Severity | URL | Observed | Expected |
|---|---|---|---|---|
| 1 | **Blocker** | `https://www.d2pfinance.xyz/apps/abrigo/iterations/pair-d/v1` | HTTP 404, Next.js default error page | Pair D PASS detail with EvidenceChain (β=0.137, p=1.46e-8, CI [0.0884, 0.1850], N=134), replication_hash `d4790e74…`, 5-section MDX, two JSON-LD blocks |
| 2 | **Blocker** | `https://www.d2pfinance.xyz/apps/abrigo/iterations/fx-vol-on-cpi-surprise/v1` | HTTP 404 | FX-vol FAIL detail with DispositionMemo, β̂=-0.000685, 90% CI [-0.003635, 0.002265], n=947, replication_hash `769ec955…` |
| 3 | High | `POST https://www.d2pfinance.xyz/api/mcp/streamable-http` | HTTP 404 ("Not found") | JSON-RPC response (per `.well-known/mcp.json` declaration of transport `streamable-http`); actual working path is `/api/mcp/mcp` |
| 4 | Medium | `https://www.d2pfinance.xyz/llms.txt` | Points to `/iterations` and `/api/mcp/sse` | Should point to `/apps/abrigo/iterations` and `/api/mcp/mcp` (or `/api/mcp` if SSE is wired) |
| 5 | Low | `/apps/abrigo/iterations` | PASS card 161 px, FAIL card 136 px (title-length-driven) | Verification prompt asserts "IDENTICAL bounding-box height regardless of status" — true if you exclude title-length effects, false if you take the words at face value |

---

## Console error log (full session)

Only three error entries across the entire session, all from the two 404 detail pages loading the document URL:
```
[ERROR] Failed to load resource: the server responded with a status of 404 () @ https://www.d2pfinance.xyz/apps/abrigo/iterations/pair-d/v1:0
[ERROR] Failed to load resource: the server responded with a status of 404 () @ https://www.d2pfinance.xyz/apps/abrigo/iterations/fx-vol-on-cpi-surprise/v1:0
[ERROR] Failed to load resource: the server responded with a status of 404 () @ https://www.d2pfinance.xyz/apps/abrigo/iterations/pair-d/v1:0
```

Zero runtime exceptions, hydration errors, React warnings, or i18n missing-key warnings on any working page.

---

## Scoreboard

- **PASS (6):** `/`, `/about`, `/team`, `/research`, `/apps/abrigo`, agent files (`llms.txt`, `mcp.json`, `openapi.yaml`)
- **PARTIAL (1):** `/apps/abrigo/iterations` — all 4 cards render, filter works in both directions, `min-h` enforced; but PASS and FAIL cards differ by 25 px in height (title-length-driven, defensible)
- **FAIL (2):** `/apps/abrigo/iterations/pair-d/v1`, `/apps/abrigo/iterations/fx-vol-on-cpi-surprise/v1` — both 404 in production
- **FAIL/Path-mismatch (1):** MCP Streamable HTTP — wrong path documented in `llms.txt` and verification prompt; actual endpoint is `/api/mcp/mcp`
- **UNREACHABLE (2):** the two 404 detail pages (effectively the same as FAIL)

**Honest assessment:** the work shipped for the listing surfaces is high quality, but the demo critical path (the two detail pages the prompt explicitly says are demo-critical) is not deliverable from the deployed bundle. `02-VERIFICATION.md` reports `ITER-03 / ITER-05 / ITER-06 = PASS` based on source-tree inspection; live-browser inspection contradicts that for those three requirements.

---

_Verifier: EvidenceQA (Claude Opus 4.7 1M via Playwright MCP)_
_Verified: 2026-05-13T11:51-04:00_
_Screenshots: `/home/jmsbpp/apps/d2p/frontend/.playwright-mcp/d2p-verify/` (12 captures)_
