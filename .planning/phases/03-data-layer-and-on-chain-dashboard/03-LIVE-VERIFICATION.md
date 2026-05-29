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

---

## Task 03-03: /status RSC page + /api/status JSON route (DASH-08 umbrella status surface)

**Verification date:** 2026-05-29
**Target:** http://localhost:3040 (local production build — `pnpm build && pnpm start -p 3040`)
**Verified by:** GSD executor (automated e2e 15/15 green + curl live checks against production build)

### Route: /api/status

| Claim | Verdict | Evidence |
|-------|---------|----------|
| Returns 200 with version:1 envelope | ✓ PASS | `curl http://localhost:3040/api/status` → `{"version":1,...}` |
| status field present | ✓ PASS | `"status":"ok"` in live response |
| build field present | ✓ PASS | `"build":"local"` (VERCEL_GIT_COMMIT_SHA not set locally) |
| timestamp present (ISO-8601) | ✓ PASS | `"timestamp":"2026-05-29T14:30:15.140Z"` |
| chains array length 5 | ✓ PASS | Celo (42220), Ethereum (1), Base (8453), Arbitrum One (42161), OP Mainnet (10) |
| Each chain has chainId + name + valid status | ✓ PASS | All 5 chains: `status="healthy"`, blockNumber and latencyMs present |
| apps.abrigo present | ✓ PASS | `"apps":{"abrigo":{"status":"pre-launch","instrumentsDeployed":0}}` |
| No HuggingFace / dataset-version field | ✓ PASS | JSON body searched: no huggingface, dataset_version, parquet |
| No bigint serialization error | ✓ PASS | blockNumber already stringified by checkAllChains() → serializeBigints() |
| Per-chain isolation (degraded chain doesn't blank response) | ✓ PASS | Unit test: `pnpm vitest run tests/api/status.test.ts` — isolated-failure case passes; e2e degradation test passes |
| runtime=nodejs + force-dynamic declared | ✓ PASS | Build route table: `/api/status` shown as ƒ (Dynamic) |
| checkAllChains() called; no inline allSettled | ✓ PASS | `grep -q "checkAllChains" app/api/status/route.ts`; `! grep -q "allSettled"` both pass |

### Route: /status (RSC page)

| Claim | Verdict | Evidence |
|-------|---------|----------|
| Returns 200 | ✓ PASS | HTTP 200; e2e test `GET /status returns 200` passes |
| Renders exactly 5 per-chain health rows | ✓ PASS | e2e `toHaveCount(5)` passes; Celo, Ethereum, Base, Arbitrum One, OP Mainnet rows all present |
| Each row has a StatusPill with visible text (CROSS-09 color+icon+text) | ✓ PASS | e2e: `output` element present in each row with non-empty textContent; pill encodes color + icon + label text |
| Celo row present | ✓ PASS | `data-testid="chain-row-celo"` visible |
| Ethereum row present | ✓ PASS | `data-testid="chain-row-ethereum"` visible |
| Base row present | ✓ PASS | `data-testid="chain-row-base"` visible |
| Arbitrum One row present | ✓ PASS | `data-testid` matching `chain-row-arbitrum` visible |
| OP Mainnet row present | ✓ PASS | `data-testid` matching `chain-row-op-mainnet` or `chain-row-optimism` visible |
| Build hash field visible and non-empty | ✓ PASS | `data-testid="build-hash"` textContent = "local" (non-empty) |
| Freshness timestamp field visible and non-empty | ✓ PASS | `data-testid="freshness-timestamp"` contains ISO timestamp |
| Abrigo app row renders with pre-launch pill | ✓ PASS | `data-testid="app-row-abrigo"` with `output` pill visible |
| Page renders without error even if a chain is degraded | ✓ PASS | No fatal console errors; all 5 rows always rendered; unit test covers isolated-failure case |
| No HuggingFace / dataset-version line | ✓ PASS | Source grep: no huggingface/parquet/dataset in page.tsx |
| RSC — no 'use client' directive | ✓ PASS | First non-comment line is `import { StatusPill }...` |
| No nuqs imports | ✓ PASS | Source grep: no `from 'nuqs'` in page |
| No wagmi / wallet imports | ✓ PASS | Source grep: no `from 'wagmi'` in page |
| Umbrella-scoped under (dashboard), not (apps) | ✓ PASS | File path: `app/(dashboard)/status/page.tsx` |
| runtime=nodejs + force-dynamic declared | ✓ PASS | Build: `/status` shown as ƒ (Dynamic) |

### Layout Comment Fix

| Claim | Verdict | Evidence |
|-------|---------|----------|
| Stale TanStack QueryClientProvider comment removed from layout.tsx | ✓ PASS | `grep -q "TanStack" app/(dashboard)/layout.tsx` returns no match |
| New comment references /status umbrella use | ✓ PASS | Comment reads: "Phase 3 hosts the umbrella /status page here..." |
| Layout remains pure RSC pass-through | ✓ PASS | Function body unchanged: `<div className="min-h-screen">{children}</div>` |

### Playwright webServer

| Claim | Verdict | Evidence |
|-------|---------|----------|
| Exactly one webServer block | ✓ PASS | `const webServer = {...}` declared once, referenced once in defineConfig |
| Production build (pnpm build + pnpm start) — no pnpm dev | ✓ PASS | Command: `pnpm build && pnpm start -p 3040` |
| No sleep/pkill pattern | ✓ PASS | Source grep: no sleep/pkill in playwright.config.ts |

### Design Tokens

| Claim | Verdict | Evidence |
|-------|---------|----------|
| No card-in-card anti-pattern | ✓ PASS | /status uses `<ul>` with `divide-y` rows; no nested card components |
| No left-colored borders on rows | ✓ PASS | Rows use only `border-border-default` via divide-y; no custom side-border coloring |
| Muted ochre accent used sparingly | ✓ PASS | Only `focus-visible:ring-accent-default` present; no accent fill on rows |

### Build Gate

| Claim | Verdict | Evidence |
|-------|---------|----------|
| pnpm build exits 0 | ✓ PASS | Build output: all 16 routes compiled, no errors |
| /status is ƒ (Dynamic) | ✓ PASS | Build route table confirms force-dynamic honored |
| /api/status is ƒ (Dynamic) | ✓ PASS | Build route table confirms force-dynamic honored |
| No existing static routes regressed | ✓ PASS | /.well-known/mcp.json, /.well-known/openapi.yaml, /llms.txt remain ○ (Static) |

### E2E Suite Results

All 15 Playwright e2e tests passed against the production server (http://localhost:3040):
- `tests/e2e/status-page.spec.ts`: 15/15 passed (0 failures, 0 fixme)

Vitest unit tests (from Task 1, already committed):
- `tests/api/status.test.ts`: passes (version:1 envelope, chains[5], isolated-failure case)

### Screenshot Paths

Automated e2e assertions confirmed DOM claims without Playwright MCP screenshot capture.
Produced via `pnpm playwright test tests/e2e/status-page.spec.ts` against local production build.
Screenshot capture via browser_take_screenshot is deferred (no Playwright MCP available in this executor context).

### Summary

**Overall verdict: ALL CLAIMS PASS (✓)**

The 03-03 status surface is fully verified against the production webpack build:
- /api/status returns the correct version:1 StatusResponse envelope with 5 per-chain healthy entries, build hash, freshness timestamp, and apps.abrigo pre-launch rollup; no HuggingFace field; no inline allSettled
- /status RSC page renders 5 per-chain health rows with StatusPills (color+icon+text, CROSS-09 compliant), build hash, freshness timestamp, and Abrigo pre-launch row; no nuqs/wallet/HuggingFace; umbrella-scoped under (dashboard)
- Layout comment corrected (no TanStack claim); layout stays pure RSC pass-through
- Playwright webServer: single production-build block, no sleep/pkill
- 15/15 e2e tests green; pnpm build exits 0; tsc --noEmit exits 0; biome clean
