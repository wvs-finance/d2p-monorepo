# Phase 05 — Live Verification (Evidence Collector)

Ground-truth DOM/visual verification per the project rule. Verdicts:
✓ PASS · ⚠ PARTIAL · ✗ FAIL · ⊘ UNREACHABLE

Target: `http://localhost:3040` (local prod build; `/modal-check` is a local-only scratch route).
Tooling: `mcp__plugin_playwright_playwright__*`.

## Task 05-02

RainbowKit provider tree wired into the `(defi)` route group + themed to the locked ochre token.
Route: `app/(defi)/modal-check/page.tsx` → `http://localhost:3040/modal-check` (HTTP 200).
Date verified: 2026-05-30.

| # | Claim | Verdict | Evidence |
|---|-------|---------|----------|
| 1 | h1 "05-02 Modal Check" + ConnectButton "Conectar billetera" | ✓ PASS | DOM snapshot pre-click: `heading "05-02 Modal Check" [level=1]` and `button "Conectar billetera"`. |
| 2 | Clicking ConnectButton opens modal → `role="dialog"` node appears | ✓ PASS | Post-click snapshot shows `dialog "Conectar una billetera"` with Rainbow/Base/MetaMask/WalletConnect options + "¿Qué es una billetera?" panel. |
| 3 | Modal accent = locked ochre `#a87c3a` (rgb 168,124,58), NOT default-blue | ✓ PASS | `browser_evaluate`: `--rk-colors-accentColor` = `#a87c3a` → `rgb(168, 124, 58)`. Rendered "Obtener una billetera" CTA `background-color: rgb(168, 124, 58)`. Screenshot confirms ochre button, no blue. |
| 4 | No runtime console errors of note | ✓ PASS | Only 2 errors + 1 warning, all WalletConnect/Reown placeholder-projectId (`projectId=placeholder_walletconnect_id_for_dev`): api.web3modal.org config 403, Reown "Using local/default values" warning, pulse.walletconnect.org 400. No hydration mismatch, no fatal projectId, no redisUrl, no unhandledRejection. Classified WAIVER-05-02 benign. |

**Measured accent rgb:** `rgb(168, 124, 58)` (= `#a87c3a`). Exact match to the locked ochre token. Foreground `--rk-colors-accentColorForeground` = `#f8f5f0` (paper).

**Screenshot:** `/tmp/d2p-verify/05-02-rainbowkit-modal.png` (945×921 PNG). Visually confirms open modal with ochre "Obtener una billetera" CTA and es-CO copy.

**Console classification:**
- `api.web3modal.org/appkit/v1/config?projectId=placeholder_walletconnect_id_for_dev` → 403 — WalletConnect placeholder (WAIVER-05-02, benign).
- `[Reown Config] Failed to fetch remote project configuration. Using local/default values. HTTP 403` — WalletConnect placeholder (WAIVER-05-02, benign).
- `pulse.walletconnect.org/e?projectId=placeholder_walletconnect_id_for_dev` → 400 — WalletConnect placeholder telemetry (WAIVER-05-02, benign).
- No real errors observed.

**WAIVER-05-01 (RainbowKit modal visual fidelity needs a real screenshot): CLEARED** — screenshot captured at `/tmp/d2p-verify/05-02-rainbowkit-modal.png`; modal opens, accent is the locked ochre, not default blue.

**WAIVER-05-02 (dev placeholder WalletConnect projectId): OPEN (acknowledged)** — the only console noise is placeholder-projectId 403/400; expected until a real projectId is provisioned. Not a blocker for this task.

**Overall verdict: ✓ PASS (4/4 claims).** Task 05-02 complete.

## Task 05-03

Honest-empty Abrigo instruments index (`ABRIGO_INSTRUMENTS = []` at launch) + RiskCallout component + InstrumentParams RSC + es-CO-first i18n.
Route: `app/(defi)/apps/abrigo/instruments/page.tsx` → `http://localhost:3040/apps/abrigo/instruments` (HTTP 200).
Tooling: `mcp__plugin_playwright_playwright__*`. Locale = next-intl `NEXT_LOCALE` cookie (no cookie → es-CO default).
Date verified: 2026-05-30.

| # | Claim | Verdict | Evidence |
|---|-------|---------|----------|
| 1 | h1 "Instrumentos Abrigo" (es-CO) / "Abrigo Instruments" (en) | ✓ PASS | es-CO DOM: `heading "Instrumentos Abrigo" [level=1]`, page title `Instrumentos Abrigo — Abrigo / DS2P Labs`. en DOM (cookie `NEXT_LOCALE=en`): `h1 = "Abrigo Instruments"`, title `Abrigo Instruments — …`. Both screenshots confirm. |
| 2 | Empty-state heading "Aún no hay instrumentos desplegados" (es-CO) / "No instruments deployed yet" (en) | ✓ PASS | es-CO `<p>` = "Aún no hay instrumentos desplegados" + body "…se habilitarán una vez que los contratos se desplieguen en cadena. Esta página se actualizará automáticamente." en `<p>` = "No instruments deployed yet" + "Abrigo hedging instruments will become available once contracts are deployed on-chain. This page will update automatically." |
| 3 | PackageSearch lucide icon, ~48px, muted | ✓ PASS | Exactly 1 SVG in `<main>`: class `lucide lucide-package-search h-12 w-12 text-text-muted`, getBoundingClientRect 48×48px, computed color `lab(42 …)` (muted text token), `aria-hidden="true"`, parent `<section>`. Icon visible in both screenshots (box + magnifier glyph, gray). |
| 4 | ZERO instrument cards — no `/apps/abrigo/instruments/<id>/<chain>` links (CROSS-09 anti-fishing) | ✓ PASS | Full link inventory es-CO: `["/", "/research", "/team", "/about", "https://github.com/wvs-finance"]`. Regex `/apps/abrigo/instruments/[^/]+/[^/]+` → 0 matches in BOTH locales. No ghost/example tiles in screenshots. |
| 5 | NO connect-wallet button/gate on the index (read-first; wallet UI is per-instrument, 05-04) | ✓ PASS | Button inventory: `["Aplicaciones"/"Apps", "Español (Colombia)", "English", ""]` — no connect/conectar/wallet/billetera match in either locale. No wallet UI in screenshots despite `(defi)` provider tree inheritance. |
| 6 | GitHub link present → contracts-pending context | ✓ PASS | Single github.com link: `https://github.com/wvs-finance`, anchor text "Ver contratos pendientes en GitHub" (es) / "View pending contracts on GitHub" (en). |

**Screenshots:**
- es-CO: `/tmp/d2p-verify/05-03-instruments-index.png` (full-page PNG) — h1, PackageSearch icon, honest-empty copy, GitHub CTA, zero cards, zero wallet UI.
- en: `/tmp/d2p-verify/05-03-instruments-index-en.png` (full-page PNG) — English h1 + empty-state copy, same structure.

**Console classification (benign, identical to 05-02):** 2 errors + 1 warning, all WalletConnect/Reown placeholder-projectId (`projectId=placeholder_walletconnect_id_for_dev`): `api.web3modal.org/appkit/v1/config` 403, `pulse.walletconnect.org/e` 400, `[Reown Config] Using local/default values` warning. Inherited from the `(defi)` provider tree even though the index renders no wallet UI. No hydration mismatch, no fatal error. → WAIVER-05-02 (benign, expected until a real WalletConnect projectId is provisioned).

**Forward pointer → 05-04 (NOT a failure):** The DEFI-05 "RiskCallout above the fold at 360px" claim is NOT on this index. RiskCallout renders on the per-instrument DETAIL page, which ships in task 05-04. The index correctly shows no per-instrument surface (consistent with claim 5, read-first). To be verified when 05-04 lands.

**Overall verdict: ✓ PASS (6/6 claims).** Task 05-03 complete. Honest-empty proven: zero fabricated instrument tiles, zero wallet gate, single muted PackageSearch icon, bilingual copy live, GitHub contracts-pending CTA present.

## Task 05-04

Per-instrument detail page (RSC): RiskCallout + InstrumentParams + 4-state WalletPanel + recharts PayoffDiagram island + PoolStatePanel + JSON-LD.
Route: `http://localhost:3040/apps/abrigo/instruments/fixture-celo-01/42220` (TEMPORARY local-only fixture; registry empty on deploy by design — WAIVER-05-03). HTTP 200.
Date verified: 2026-05-30. Locale: es-CO default.
Viewports: 360×780 (mobile, primary) + 1280×900 (desktop).

| # | Claim | Verdict | Evidence |
|---|-------|---------|----------|
| 1 | DEFI-05 (CRITICAL) RiskCallout "cobertura, no apalancamiento" above the fold at 360px, scrollY===0, persistent, full weight | ✓ PASS | `<aside>` role=complementary, box top=167px bottom=409px (vh=780) → fully within initial viewport at scrollY=0. `position: static` (not a dismissible toast). Bordered box, full visual weight. Text: "Instrumento de cobertura — no es apalancamiento". Screenshot 05-04-detail-360.png. |
| 2 | DEFI-03 InstrumentParams `<dl>` (strike/slope/chain) visible with NO wallet gate | ✓ PASS | `<dl>` region "Parámetros" renders Nombre, Identificador (fixture-celo-01), Red (42220), Precio de activación (1 = strike), Pendiente de cobertura (0.5 = slope), Fecha de despliegue (2026-01-01). Params/pool/chart-region all visible while DISCONNECTED — ConnectButton is an optional per-instrument affordance, not a content gate. |
| 3 | DEFI-02 DISCONNECTED affordance — "Conectar billetera" present, prompt not error | ✓ PASS | WalletPanel shows "Desconectado" status pill (icon + text), prompt "Conecta tu billetera para ver tu posición", and button "Conectar billetera" (RainbowKit). No error state. |
| 4 | DEFI-04 PayoffDiagram — role=img recharts curve, ochre stroke (~rgb 168,124,58), NO gradient, sr-only data table | ✗ FAIL | `role="img"` wrapper present with correct aria-label, and sr-only `<table>` (class `sr-only`, 20 rows of Precio/Cobertura) present (CROSS-09 satisfied). BUT the recharts curve DOES NOT RENDER: `.recharts-responsive-container` computes to **height 0px**, no `.recharts-surface`, no `.recharts-curve`, zero SVG curve nodes. Reproduced at 360px AND 1280px, and persists after a resize event. Console emits recharts' own warning: *"The width(0) and height(0) of chart should be greater than 0…check the style of container."* Line stroke + gradient-absence CANNOT be confirmed because no curve is painted. Both screenshots show an empty whitespace gap where the chart should be. |
| 5 | Anti-fishing — PoolStatePanel em-dash "—" for null numerics, honest participant count "—", no fabricated numbers | ✓ PASS | Region "Estado del pool": Balance del pool —, Liquidaciones —, Participantes — (lpPositionCount null → "—", not a fake count). No fabricated values anywhere. |
| 6 | DEFI-06 a11y — aria-live="polite" region in WalletPanel; axe serious/critical | ⚠ PARTIAL | aria-live="polite" region present in WalletPanel DOM (wraps the disconnected prompt/button) ✓. axe-core 4.10.2 found **1 serious violation: color-contrast** on the RainbowKit "Conectar billetera" CTA — fg #f8f5f0 on bg #a87c3a (ochre) = **3.44:1**, below AA 4.5:1 for 16px bold. No critical violations. |

**Measured values:**
- RiskCallout bounding box @360px, scrollY=0: `top=167, bottom=409, left=16, height=242` (viewport h=780) → above the fold ✓.
- Ochre token `oklch(0.6 0.08 70)` resolves to `#a87c3a` = rgb(168,124,58) — matches the spec's expected payoff stroke color (confirmed via the CTA background, NOT via the curve since the curve never paints).
- Payoff curve stroke / gradient: **UNMEASURABLE** — `.recharts-surface` never mounts (container height 0).

**Bug (BLOCKER for DEFI-04) — payoff curve renders 0-height:**
`components/defi/PayoffDiagram.tsx:60-61` wraps `<ResponsiveContainer width="100%" height="100%">` in `<div className="min-h-[240px] sm:min-h-[320px]" role="img">`. A `min-height` does NOT give a percentage-height child a resolvable basis: `height:100%` resolves against the parent's *computed* `height`, which is `auto` (content-driven) → the only content is the 0-height responsive div → 100%×auto collapses to 0, and `min-h` only enforces the box AFTER layout (chicken-and-egg). The inline comments at `PayoffDiagram.tsx:9` and `PayoffDiagramClient.tsx:16` show the author anticipated this pitfall but the `min-h` mitigation is insufficient. **Fix:** give the wrapper an explicit `h-[240px] sm:h-[320px]` (in addition to or instead of `min-h-`), OR pass a fixed pixel `height={240}` to `ResponsiveContainer` instead of `"100%"`. Re-verify the curve paints with ochre stroke and no gradient fill after the fix.

**Console classification:**
- WAIVER-05-02 (benign, accepted): WalletConnect/Reown placeholder-projectId noise — `api.web3modal.org/appkit/v1/config` 403, `pulse.walletconnect.org/e` 400, `[Reown Config] Using local/default values` warning.
- NOT benign (note): (a) recharts `width(0)/height(0)` warning = the chart bug above; (b) **React error #418 (hydration text-content mismatch)** fires on this route — worth a follow-up; likely SSR/CSR divergence in the wallet/locale subtree. Did not block the 200 but should be triaged.

**Waivers:**
- WAIVER-05-03 accepted — non-EVM / empty-registry on deploy unreachable; fixture is local-only scratch, route returns 200 locally.
- WAIVER-05-04 accepted — the 3 CONNECTED states (CONNECTING / WRONG_CHAIN / READY) are NOT live-drivable in headless Chromium (no wallet extension / no wired mock connector). Only DISCONNECTED verified live (✓ claim 3); the state deriver is unit-tested separately.
- WAIVER-05-05 NOT cleared — recharts lazy-chunk loaded and isolated (separate `_next/static/chunks/05fz4bf2lor9r.js`), but the chunk renders a 0-height (invisible) chart, so "lazy island works" cannot be claimed clear. Re-verify after the height fix.
- WAIVER-05-06 accepted — per-address position feed deferred; honest participant count shows "—" (claim 5 ✓).

**Screenshots (required):**
- `/tmp/d2p-verify/05-04-detail-360.png` — 360px full page: RiskCallout above fold, params dl, EMPTY chart gap, pool "—" rows, disconnected WalletPanel + CTA.
- `/tmp/d2p-verify/05-04-detail-desktop.png` — 1280px full page: same layout, payoff curve area is blank (chart not rendered).

**Overall verdict: ✗ FAIL (4 ✓ · 1 ⚠ · 1 ✗ of 6).** Task 05-04 is NOT complete. BLOCKER: DEFI-04 payoff curve renders 0-height (invisible) at all viewports — must fix the ResponsiveContainer parent height. Also fix/triage: serious color-contrast on the "Conectar billetera" CTA (3.44:1 vs 4.5:1 AA) and the React #418 hydration mismatch. Re-test required after fixes.

---

## 05.1-00 re-verification — 2026-06-02 (Evidence Collector)

**Context:** re-verify the 05-04 PayoffDiagram BLOCKER fix (Tasks 1-2 of 05.1-00). Target was the
local dev server (`pnpm dev -p 3040`) because the route depends on the uncommitted local fixture
`fixture-celo-01` (chainId 42220, strike 1.0, slope 0.5) — the deployed site does not have it.
Route: `http://localhost:3040/apps/abrigo/instruments/fixture-celo-01/42220` (HTTP 200, es-CO locale).
Verified at BOTH 360px and 1280px viewport widths. Ground truth = canvas-rasterized rendered RGB +
DOM bounding boxes, not `getComputedStyle` color-space strings.

| # | Claim | Verdict | Evidence |
|---|-------|---------|----------|
| 1 | 0-height bug cleared — `.recharts-responsive-container` height > 0 AND a visible `path.recharts-line-curve` exists | ✓ PASS | **1280px:** responsive-container box = 662×320; curve path `recharts-curve recharts-line-curve` present, box 456×266, visible. **360px:** container 313×240; curve box 184×189, visible. Curve path `d` has 100 points, y-coords span 13.4→202 SVG units (spread 188.6) — a genuine sloped CFMM curve, not a degenerate flat line. The prior ✗ FAIL (0px, no surface) is **CLEARED at both viewports**. The `h-[240px] sm:h-[320px]` fixed-height wrapper (PayoffDiagram.tsx:62) resolves the percentage-height collapse. |
| 2 | Curve stroke AND current-price reference-line stroke resolve to `--accent-text`; no color-contrast violation on the strokes (WCAG 1.4.11 non-text 3:1) | ✓ PASS | Curve stroke and current-price ReferenceLine stroke both rasterize to `rgb(122,85,38)` ≈ `#7a5526`, which is the light-theme `--accent-text: oklch(0.48 0.08 70)` (globals.css:32) — matching the spec's `#8a6a2f`-ish estimate. Manually computed WCAG contrast of the stroke vs the chart panel bg (`#f7f5f1`) = **6.11:1** at both 360px and 1280px → clears the 3:1 non-text bar with margin. 2 reference lines present (strike via `--text-secondary` dashed, current-price via `--accent-text` dashed). No contrast violation attributable to the curve/reference-line strokes. |
| 3 | No React #418 hydration mismatch and no other console errors on load | ✗ FAIL | A **hydration mismatch error fires on load** (React dev-mode "server rendered HTML didn't match the client"). It is **NOT in the PayoffDiagram** — it is in `WalletStatusPill`: server rendered `aria-label="Desconectado"` + wallet icon (`DISCONNECTED`), client briefly rendered `aria-label="Conectando"` + loader-circle icon (`CONNECTING`) during wagmi auto-reconnect, then settled back to `Desconectado`. A second console error: `Encountered a script tag while rendering React component` (the `InstrumentJsonLd` `<script>` inside the client tree). Next dev overlay shows "2 Issues". The benign WalletConnect/Reown placeholder-projectId 400/403 noise remains (WAIVER-05-02, accepted). The curve is clean, but the route still has 2 console errors on load → claim as written does not hold. |
| 4 | Screenshots saved | ✓ PASS | `/tmp/d2p-verify/05.1-00-payoff-1280.png` (1280px full page — chart paints with axes, both dashed reference lines at x≈1, sloped ochre curve), `/tmp/d2p-verify/05.1-00-payoff-360.png` (360px full page — chart paints, single-column layout). |

**Known waiver (recorded, not a new failure):** the RainbowKit "Conectar billetera" CTA contrast
(⚠ in 05-04 claim 6, fg `#f8f5f0` on ochre bg ≈ 3.44:1) is a RainbowKit-theme issue, not introduced
by the PayoffDiagram fix. Carried forward as a known waiver.

**Acceptance bar:** the curve-paints claim (claim 1) flipped ✗ FAIL → **✓ PASS** at both viewports.
The original DEFI-04 0-height BLOCKER is cleared. ⚠ The hydration mismatch the 05-04 report flagged as
"React #418, triage follow-up" is **still present** (now localized to `WalletStatusPill`, a wallet
SSR/CSR state divergence — independent of the chart). It should be triaged (e.g. gate the pill's
connection-derived state behind a mounted flag / `suppressHydrationWarning` on the pill, or render a
stable DISCONNECTED skeleton until wagmi hydrates).

**Visual caveat (⚠ note, not a blocking failure):** the ochre curve is **faint** in the full-page
raster at both viewports — thin (2px) stroke in the locked single-accent ochre on a light panel. It
measures 6.11:1 (passes 1.4.11) and the path geometry is correct, but perceptually subtle. A reviewer
glancing at the screenshot could mistake it for "no curve." Worth a follow-up on stroke weight or
sample density if perceptual prominence matters; not a spec violation.

**Verdict: 3 ✓ · 1 ✗ of 4.** The BLOCKER this task targeted (curve 0-height) is CLEARED ✓ — the
acceptance bar for 05.1-00 Tasks 1-2 is met. The remaining ✗ (hydration mismatch in WalletStatusPill)
is a pre-existing, separately-scoped issue carried over from 05-04, not a regression from the fix.
