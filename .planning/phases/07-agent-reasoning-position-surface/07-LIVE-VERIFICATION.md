# 07 — Live Verification

## 2026-06-06 — Task 07-03: /apps/abrigo/agent/[id] decision-detail route

**Target:** local production build, `pnpm start` on port 3040 (route unmerged; production 404s).
**Tooling:** Playwright MCP. Locale: es-CO default; en checked via `NEXT_LOCALE=en` cookie.
**Routes:** `/apps/abrigo/agent/4083729`, `/apps/abrigo/agent/4083997`, `/apps/abrigo/agent/does-not-exist`, `/apps/abrigo/agent` (feed).

| # | Claim | Verdict | Evidence |
|---|-------|---------|----------|
| 1 | `[data-testid="pipeline-trace"]` present with 6 stages at equal visual weight | ✓ PASS | `traceExists=true`; 6 stage h3 titles; all 6 rings 12×12px, border-radius pill; all 6 titles fontSize 16px / weight 500 / height 24px (width differs only by label text length). |
| 2 | Built-prompt route-correct (568 + consensus 500 / 900) | ✓ PASS | /4083729 prompt: "Actual macro print (scaled int): 568. Consensus expectation (scaled int): 500. Choose hedge action and size for a long-gamma cCOP-USD position." /4083997: "...568. Consensus expectation (scaled int): 900...". |
| 3 | Stage 6 bridge fraction 68% / 6%; no `$digit` in body | ✓ PASS | /4083729 fraction-of-max=68%; /4083997=6%. `body.innerText.match(/\$\d/)` → `[]` on both routes (es + en). |
| 4 | Both legs real requestIds; /4083729 action ts = em-dash, /4083997 both ts present | ✓ PASS | /4083729: action requestId 4079637 (ts "—"), size requestId 4083729 (ts 2026-06-02T17:14:28Z). /4083997: action requestId 4083984 (ts 2026-06-02T17:15:53Z), size requestId 4083997 (ts 2026-06-02T17:15:56Z). |
| 5 | `fork-verified` pill w/ ShieldCheck icon, NEUTRAL color (CIELAB a ≥ 0) | ✓ PASS | aria-label: "Fuente: verificado en fork — el contrato LongGammaWrapper no ha sido desplegado en cadena; no existe posición real." Text "verificado en fork · no desplegado". SVG icon present. Computed color `lab(42.0035 0.933051 2.89261)` → native a* = **+0.93 ≥ 0** (NOT green). |
| 6 | Position panel empty state — every value em-dash | ✓ PASS | Piernas/posición=—, Colateral sobreviviente=—, ID del token de posición=—, Residual=—. Heading "Sin posición en cadena"; "No desplegado — verificado en fork". No fabricated numbers. |
| 7 | Exactly 3 management buttons, each disabled+aria-disabled+describedby+Lock icon; visible caption | ✓ PASS | 3 buttons (Cerrar, Reclamar residual, Control del agente); all `disabled=true`, `aria-disabled="true"`, `aria-describedby="management-not-live-caption"`, each has SVG icon. Caption `#management-not-live-caption` visible: "No disponible — fork-verificado, no desplegado. Sin transacción." |
| 8 | Liveness pill reads snapshot, not live | ✓ PASS | es-CO visible text "instantánea · —"; en "snapshot · —". No "live" state token (the word "live" appears only inside the descriptive aria-label "no live update", never as a state token). |
| 9 | body.innerText contains none of executed\|realized\|ejecutad\|realizad | ✓ PASS | Forbidden-word scan → `[]` on /4083729, /4083997 (es), /4083997 (en). |
| 10 | Feed-card decision-trace link navigates to detail route | ✓ PASS | On /apps/abrigo/agent, links "Ver la traza de decisión" → /4083729 and /4083997. Clicking first link navigated URL to /apps/abrigo/agent/4083729. |
| 11 | does-not-exist → HTTP 404 + not-found copy + back link | ✓ PASS | `curl` → 404; navigate → 404. Copy: "No se encontró la decisión solicitada. Vuelve al panel del agente para ver las decisiones registradas." Back link "Volver al panel del agente" → /apps/abrigo/agent. |

**Cross-cutting console:** Only known artifacts — WalletConnect 403/400 (`placeholder_walletconnect_id_for_dev`), and on the 404 page a benign COOP-check 404 plus the legitimate document 404 (the route is supposed to 404). **No React/Next/hydration errors on any route.**

**Screenshots:**
- `/tmp/d2p-verify/07-03-4083729.png`
- `/tmp/d2p-verify/07-03-4083997.png`
- `/tmp/d2p-verify/07-03-404.png`

**Verdict:** 11/11 ✓ PASS. No ✗ / ⚠.
