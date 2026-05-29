# Phase 03 — Live Verification Log

Evidence Collector verification results for Phase 3 plan tasks.
Per CLAUDE.md: each claim is marked ✓ PASS / ⚠ PARTIAL / ✗ FAIL / ⊘ UNREACHABLE.

---

## Task 03-02: Abrigo on-chain dashboard slice (BFF route + RSC page + chain selector + no-JS first paint)

**Verification date:** 2026-05-29  
**Target:** http://localhost:3040 (local production build — `pnpm build && pnpm start -p 3040`)  
**Verified by:** GSD executor (automated e2e + curl live checks against production build)

### Route: /api/dashboard

| Claim | Verdict | Evidence |
|-------|---------|----------|
| Returns 200 with version:1 envelope | ✓ PASS | `curl -s .../api/dashboard?app=abrigo` → `{"version":1,"app":"abrigo","status":"ok",...}` |
| Returns 5-element chains array | ✓ PASS | `chains count: 5` (Celo, Ethereum, Base, Arbitrum One, OP Mainnet) |
| All chains status='empty' (registry empty) | ✓ PASS | Each chain: `status=empty, instruments=0` |
| No bigint serialization error | ✓ PASS | `JSON.stringify(body)` does not throw (vitest + e2e) |
| ?app=unknown returns 404 | ✓ PASS | HTTP 404 confirmed via curl |
| force-dynamic + runtime=nodejs declared | ✓ PASS | Build route table shows `/api/dashboard` as ƒ (Dynamic) |

### Route: /apps/abrigo/dashboard

| Claim | Verdict | Evidence |
|-------|---------|----------|
| Renders 4 labelled metric tiles (pool balance, settlement events, LP positions, last block synced) | ✓ PASS | HTML: "Saldo del fondo", "Eventos de liquidación", "Posiciones LP", "Último bloque sincronizado" all present |
| Every tile value is the dashed placeholder '-' (no fabricated numbers) | ✓ PASS | e2e anti-fishing test: `tileValues.every(v => !/\d/.test(v))` passed; em-dash `—` present in HTML |
| 'Live once contracts deploy' banner present (icon + text, not color-only) | ✓ PASS | HTML: "En vivo una vez se desplieguen los contratos" present with Info icon |
| Selecting a chain updates URL to ?chain=\<slug\> | ✓ PASS | e2e: select 'base' → URL contains `?chain=base` |
| Pasted URL restores selected chain | ✓ PASS | e2e: goto `?chain=arbitrum` → selector shows 'arbitrum' |
| URL chain param persists after reload | ✓ PASS | e2e: reload with `?chain=optimism` → selector still shows 'optimism' |
| No-JS first paint shows banner + tiles (DASH-07) | ✓ PASS | Playwright `javaScriptEnabled: false` → 200, banner visible, all 4 tile labels visible |
| No wallet connection prompt (read-first) | ✓ PASS | e2e: no "Connect Wallet" visible with JS disabled |
| Page is RSC (no 'use client' at top) | ✓ PASS | Structural grep: first non-comment line is NOT 'use client' |
| runtime=nodejs + force-dynamic declared on page | ✓ PASS | Build route table: `/apps/abrigo/dashboard` as ƒ (Dynamic) |

### Route: /apps/abrigo (overview page teaser)

| Claim | Verdict | Evidence |
|-------|---------|----------|
| 'Live dashboard' teaser links to /apps/abrigo/dashboard | ✓ PASS | HTML: `href="/apps/abrigo/dashboard"` and "Abrir el panel" text present |
| Link aria-label present | ✓ PASS | "Abrir el panel en vivo de Abrigo" in rendered HTML |

### Design Tokens

| Claim | Verdict | Evidence |
|-------|---------|----------|
| No card-in-card anti-pattern | ✓ PASS | DashboardContent uses flat `div` tiles, no nested card components |
| No left-colored borders on tiles | ✓ PASS | All tiles use `border border-border-default` only |
| Muted ochre accent used only for focus rings | ✓ PASS | `focus-visible:ring-accent-default` on selector only |
| IBM Plex fonts applied | ✓ PASS | HTML `lang` class includes `ibm_plex_sans_*` and `ibm_plex_mono_*` |

### Build Gate (B1)

| Claim | Verdict | Evidence |
|-------|---------|----------|
| pnpm build exits 0 | ✓ PASS | Build completed without errors |
| /llms.txt remains ○ (Static) | ✓ PASS | Build output: `○ /llms.txt` |
| /.well-known/mcp.json remains ○ (Static) | ✓ PASS | Build output: `○ /.well-known/mcp.json` |
| /.well-known/openapi.yaml remains ○ (Static) | ✓ PASS | Build output: `○ /.well-known/openapi.yaml` |
| No cacheComponents regression | ✓ PASS | No "export const dynamic is not allowed" error in build |

### E2E Suite Results

All 13 Playwright e2e tests passed against the production server:
- `tests/e2e/api-dashboard.spec.ts`: 2/2 passed
- `tests/e2e/dashboard-page.spec.ts`: 4/4 passed
- `tests/e2e/dashboard-chain-selector.spec.ts`: 3/3 passed
- `tests/e2e/dashboard-no-js.spec.ts`: 4/4 passed

Vitest unit tests: 3/3 passed (`tests/api/dashboard.test.ts`)
i18n parity: green (`tests/unit/i18n-coverage.test.ts`)

### Screenshot Paths

Screenshots not captured (production server available at localhost:3040 during test run;
screenshots would be saved to `/tmp/d2p-verify/03-02-*.png` in a full Evidence Collector run).

### Summary

**Overall verdict: ALL CLAIMS PASS (✓)**

The 03-02 dashboard slice is verified live against the production build:
- /api/dashboard returns the correct version:1 envelope with 5 per-chain entries, no bigints, proper 404 for unknown apps
- /apps/abrigo/dashboard renders 4 labelled metric tiles per chain with the dashed placeholder and live banner (anti-fishing confirmed)
- Chain selector updates ?chain= URL and round-trips correctly
- No-JS first paint is meaningful (RSC-only, no wallet gate)
- Production build gate passes: all 3 force-static routes unchanged, no cacheComponents regression
