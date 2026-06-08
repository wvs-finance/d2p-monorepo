# 09 — Live Verification (Evidence Collector)

Route: `/apps/abrigo/cornerstone`
Server: local production build (`pnpm build` → `PORT=3040 pnpm start`) — Next.js 16.2.6, Ready.
Deployed `www.d2pfinance.xyz` does NOT yet carry Phase-9 code, so verification ran against the local prod build (CLAUDE.md fallback).
Tooling: Playwright MCP (live, confirmed connected). Screenshots: `/tmp/d2p-verify/`.
Date: 2026-06-08.

## Verdict legend
✓ PASS · ⚠ PARTIAL · ✗ FAIL · ⊘ UNREACHABLE/DEFERRED

---

## REPLAY mode (`/apps/abrigo/cornerstone`, default — DEFAULT_MODE='replay')

Screenshot: `/tmp/d2p-verify/09-05-replay.png`

| # | Claim | Verdict | Evidence |
|---|-------|---------|----------|
| 1 | Mode banner always visible; replay label; no accent border / no Radio "live" icon | ✓ PASS | Banner `<output>` reads "modo repetición · recibos reales"; icon is `lucide-circle-dashed` (not Radio); left border `lab(83.78…)` neutral (not accent ochre). |
| 2 | Recorded run renders end-to-end in RunTranscript: Agent-1 decision (co/inflation-rate 5.68%) → decision card → mint with strike 360360 | ✓ PASS | After clicking example: Agent-1 `co/inflation-rate = 5,68%`; ADD_LONG_GAMMA decision card (sizeBps 6800, surprise +0.68); mint rationale "long cCOP/USD call at strike 360360 (tick 360360)". |
| 3 | NO live tx-hash element and NO block-explorer link in replay | ✓ PASS | DOM scan: zero `0x…40+`-hex matches; zero explorer/etherscan/blockscout/shannon/somnia anchor hrefs. |
| 4 | §0.2 verbatim no-bridge disclosure visible (es-CO + en), NOT in `<details>` | ⚠ PARTIAL | §0.2 disclosure NOT rendered in replay. By design (`ModeBanner.tsx` L13/112–118) the verbatim §0.2 block is `isLive`-gated — it renders ONLY in live mode, never in replay/mock. So the disclosure is correctly absent here; the claim as written targets live-mode chrome. No honesty violation — replay simply doesn't carry the bridge disclosure because there is no live bridge action to disclose. Recommend re-pointing this claim to live mode. |
| 5 | HedgeDecisionCardV2: nonErgodicDisclosed pill (color+icon+text); "(TEMPLATE)" rationale at FULL weight, NOT in `<details>` | ✓ PASS | "Divulgación no ergódica" → icon + text "sí" (color `lab(29.97 -48.56 47.22)`, affirmative green for the disclosed-affirmation pill, distinct from the neutral provenance pill). "(TEMPLATE)" is a plain `<p>` at full weight, sibling of the rationale — not inside any disclosure/`<details>` group. |
| 6 | Static cost panel: "no desplegada para esta demo" / "not deployed for this demo", NO numbers | ✓ PASS | Cost panel reads "Implementada on-chain (OperationalCostManagement) — no desplegada para esta demo." + "Implemented on-chain — not deployed for this demo." No numeric figures. |
| 7 | fork-verified pill is NEUTRAL (never green/emerald) — computed color | ✓ PASS | Two distinct neutral pills: ModeBanner `ForkVerifiedPill` is live-only (absent in replay). The in-transcript "verificado en fork · Agente 2" pill computes `lab(7.25 0.65 3.28)` / `lab(42.0 0.93 2.89)` — a/b ≈ 0 → neutral gray, not green. |
| 8 | Honesty greps on rendered DOM: NO ejecutado/realizado/executed/realized; NO bare "$"+digits as PnL; NO raw 0x000…0 | ✓ PASS | bannedHits=[]; dollarPnl=[]; zeroAddr=false; txHash=[]. |

REPLAY verdict: **✓ PASS** (one ⚠ PARTIAL on claim 4 that is a spec-pointer artifact, not a defect — §0.2 is intentionally live-only).

---

## MOCK mode (`?mode=mock`)

Screenshot: `/tmp/d2p-verify/09-05-mock.png`

| # | Claim | Verdict | Evidence |
|---|-------|---------|----------|
| 9 | Banner "modo demostración (sin cadena)" with FlaskConical icon; NO tx hash / block link; same honesty greps hold | ✓ PASS | Banner text "modo demostración (sin cadena)"; icon `lucide-flask-conical`. txHash=[]; explorerLinks=[]; banned=[]; dollarPnl=[]; zeroAddr=false. |

MOCK verdict: **✓ PASS**.

---

## Live → replay degradation (mount-probe path)

Screenshot: `/tmp/d2p-verify/09-05-live-degraded.png`

| Claim | Verdict | Evidence |
|-------|---------|----------|
| aria-live `<output>` announces mode flip; no tx-hash after degradation | ✓ PASS | Navigated `?mode=live`; mount probe (`probeEthChainId` → fork RPC + `/api/cornerstone/rpc` proxy) unreachable locally → `setResolvedMode('replay')`. Banner flipped to "modo repetición · recibos reales", `CircleDashed` icon, neutral border. The mode label lives in `<output aria-live="polite">` so the flip is announced (never silent). No tx-hash present post-degradation. Reproduced locally (e2e also covers it). |

---

## LIVE two-leg on-chain RUN

| Item | Verdict | Reason |
|------|---------|--------|
| Full Somnia Agent-1 + BuildBear Agent-2 mint live RUN | ⊘ DEFERRED | Somnia validator LLM-inference callbacks silently not landing (external infra outage, no ETA; backend ref "18-02"). NOT a gate per v5 reframe. No live Somnia/STT call attempted. |

---

## Summary

- REPLAY (guaranteed artifact): **✓ PASS** — recorded run renders end-to-end, strike 360360, neutral fork pill, honesty greps clean, no tx-hash/explorer links.
- MOCK: **✓ PASS** — "modo demostración (sin cadena)" + FlaskConical, honesty greps clean.
- Live→replay degradation: **✓ PASS** — reproduced locally; aria-live announce, no post-flip tx-hash.
- LIVE on-chain RUN: **⊘ DEFERRED** recorded (Somnia validator-callback outage).
- One ⚠ PARTIAL (claim 4, §0.2 disclosure): not a defect — §0.2 is intentionally `isLive`-gated in `ModeBanner.tsx`; recommend the plan re-point this claim to live mode rather than replay.

Console noise (all modes): only WalletConnect dev-placeholder `projectId` 403/400 from `api.web3modal.org` / `pulse.walletconnect.org` — unrelated to cornerstone runtime; no cornerstone errors.

---

## Waiver Record

**Claim 4 — §0.2 no-bridge disclosure (re-point accepted, 2026-06-08)**

The plan's Task-2 checkpoint stated the verbatim §0.2 no-bridge disclosure should appear in replay and mock modes. The EC run found it absent from those modes (verdict ⚠ PARTIAL). This is correct behavior by design: `ModeBanner.tsx` gates the §0.2 block on `isLive` (lines 112–118) — the disclosure renders ONLY when a live bridge action is actually being taken. Replay and mock perform no bridge transaction, so there is nothing to disclose.

**Decision (user-approved 2026-06-08):** Plan claim re-pointed to live mode only. The spec §0.2 wording "whenever a live tx path is shown" is honored. No code change to `ModeBanner.tsx`. Accepted waiver — not a defect. This waiver is recorded here; the ⚠ PARTIAL is superseded by this acceptance.
