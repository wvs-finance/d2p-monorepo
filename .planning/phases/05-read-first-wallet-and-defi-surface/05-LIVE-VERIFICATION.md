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
