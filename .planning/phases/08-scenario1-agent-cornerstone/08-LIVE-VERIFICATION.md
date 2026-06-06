# Phase 08 — Live Verification Log

Route: `/apps/abrigo/cornerstone`
Build commit: bfa26f9 (feat(08-02): cornerstone route + PromptBox + RunTranscript + e2e)

---

## Task 2 Evidence Collector Results

_Awaiting Evidence Collector run. Verdicts will be appended here._

| Claim | Verdict | Notes | Screenshot |
|-------|---------|-------|------------|
| Idle first paint shows prompt (no transcript entries) | — | | |
| Preset 1 (infl-surprise-add): A1 entry streams Agent-1 trace all-at-once | — | | |
| Agent-1 trace shows "consensus-verified" + testnet-agent pill | — | | |
| Agent-1 trace shows inflation factor as "5.68%" (not raw 568) | — | | |
| Agent-2 mock card appears after A1 (fork-verified + FlaskConical mock sub-label) | — | | |
| Free-text rationale under "explicación (autoría humana)" label | — | | |
| Focus moves to Confirm button on a2_decision state | — | | |
| fork-verified pill is neutral (NOT green/emerald) | — | | |
| Confirm button click → MintCard appends below | — | | |
| No console runtime errors / no hydration #418 | — | | |
| No executed/realized/ejecutad/realizad in DOM | — | | |
| No raw 0x000…0 visible | — | | |
| No bare $ as realized PnL | — | | |
| consensus-verified / testnet-agent ONLY inside A1 block | — | | |
| Preset 2 (infl-cooling-reduce): same honesty invariants hold | — | | |
| ~10–12s pacing reads cleanly for demo recording | — | | |
| replaying·mock inline pill visible during streaming (neutral, not green) | — | | |

---

_Verdicts: ✓ PASS | ⚠ PARTIAL | ✗ FAIL | ⊘ UNREACHABLE_

---

## 2026-06-06 — Task 08-02 interactive live verification (EvidenceQA)

Target: `http://localhost:3040/apps/abrigo/cornerstone` (local `pnpm start`, prod 404 by design).
Driven flow: idle → click inflation-surprise preset (→ decision 4083729) → a1 stream → a2 card → focus-on-Confirm → click Confirm → mint. Re-run in en.
Console: only WalletConnect 403/404 placeholder artifacts (known, NOT failures). No React/Next/hydration errors.

| # | Claim | Verdict | Measured evidence |
|---|-------|---------|-------------------|
| 1 | Idle: prompt box + 2 equal-weight preset chips; no streamed content | ✓ PASS | Both chips 688×40px, font-weight 600, identical bg lab(93…). a1/a2/mint absent. `08-02-idle.png` |
| 2 | Steps stream in DOM order a1→a2→(confirm)→mint | ✓ PASS | After run: `[data-step]` = ["a1","a2"]; after Confirm mint appears. |
| 3 | A1 factor co/inflation-rate rendered as **5.68%** (not raw 568); testnet-agent + consensus-verified ONLY in a1 | ✗ FAIL (rendering) / ✓ PASS (scoping) | Factor renders raw **"568"** in both es+en; `5.68%` regex = false. Scoping correct: "verificada por consenso" & "Somnia testnet · agente (POC)" present in a1 only, absent in a2/mint. `08-02-a1.png` |
| 4 | A2 card: fork-verified pill NEUTRAL (not green), FlaskConical "mock · no en vivo" sub-label, strike 4.100, human-authored label, no `<details>`, every mock numeric labeled | ⚠ PARTIAL | Pill color rgb(24,22,17) / mid-gray rgb(102,98,94), bg rgb(238,234,229) — confirmed NEUTRAL via canvas sRGB conversion, NOT green. FlaskConical svg present, label "mock · no en vivo". Strike "4.100" ✓. Human label present (quoted below). `querySelector('details')` in a2 = 0 ✓. Caveat: Tamaño="100", Horizonte="100" appear illustrative-OK but Margen delta in mint is raw WAD (see #6). |
| 5 | Confirm gate: `[data-confirm]` is activeElement before click, hit ≥44px, CTA "Confirmar (simulado)" | ✓ PASS | activeElement === confirm button (text "Confirmar (simulado)"). Size 638×44px (≥44). en CTA "Confirm (simulated)". |
| 6 | Confirm → MintCard (mint) with TokenId + margin under mock label, no `<details>` | ⚠ PARTIAL | mint present, TokenId="999"+ilustrativo, Margen delta token0/token1 present + ilustrativo, no `<details>`. Caveat: margins render raw WAD ints `-500000000000000000` / `1000000000000000000` (not human-scaled). `08-02-mint.png` |
| 7 | aria-live=polite, aria-atomic=false, append-only (prior a1 byte-identical after next step) | ✓ PASS | transcript aria-live="polite" aria-atomic="false". a1 innerText (1152 chars) byte-identical before vs after mint appended. |
| 8 | Honesty: no executed/realized/ejecutad/realizad; no $-digit PnL; no 0x000…000; fork tier never green | ✓ PASS | All banned tokens false; dollarPnl false; zeroAddr false; all 20 fork pills neutral gray. |
| 9 | Liveness pill "reproduciendo · mock"/"replaying · mock" neutral, color+icon+text | ✓ PASS | Present during run, has svg icon, neutral color, text present (es + en). |
| 10 | Heading outline: single h1 then h2/h3, no skipped levels | ✓ PASS | h1(×1) → h2(prompt) → h2(Agent1) → h3×6 → h2(Agent2). No skip. |
| 11 | en-locale parity (preset, CTA, human-authored, mock sub-label) | ✓ PASS | "Colombian inflation surprised…", "Confirm (simulated)", "human-authored explanation", "mock · not live", "replaying · mock". |

Human-authored label (quoted, es): "explicación (autoría humana)" — body: "wCOP/USDC pool (UniV4, Polygon) is deeply liquid at this strike. Representativeness score: 0.91 (above threshold). Inflation adjustment confirmed: co/inflation-rate=568 ∈ [CPI band]. Proceeding with long cCOP/USD call at strike 4.100."

### Issues (≥3)
1. **✗ BLOCKER — A1 factor not formatted (claim 3).** `co/inflation-rate` renders raw scaled int **568** instead of **5.68%**. Reproduces es + en. The human-authored explanation also leaks the raw `co/inflation-rate=568`. Directly contradicts the plan claim.
2. **⚠ MAJOR — Mint margins are raw WAD integers (claim 6).** `-500000000000000000` / `1000000000000000000` shown verbatim; should be human-scaled (e.g. -0.5 / 1.0). Mitigated by adjacent "ilustrativo" labels but still raw on-chain ints surfaced to a non-technical hedger.
3. **⚠ MINOR — `<details>` present inside A1 (CROSS-09 concern).** A1 contains 1 `<details>` ("Ver prompt del sistema" disclosure). Claim 4's no-`<details>` constraint is scoped to the a2 card (which is clean), so not a strict task fail, but project anti-fishing rule bans `<details>` collapse on disposition surfaces — flag for review.

Screenshots: /tmp/d2p-verify/08-02-idle.png, /tmp/d2p-verify/08-02-a1.png, /tmp/d2p-verify/08-02-a2-confirm.png, /tmp/d2p-verify/08-02-mint.png

---

## RE-VERIFICATION (post-fix 2a2c295) — 2026-06-06

**Agent:** EvidenceQA (Evidence Collector mode)
**Target:** http://localhost:3040/apps/abrigo/cornerstone (LOCAL prod build, port 3040)
**Flow driven:** preset "Colombian inflation surprised to the upside" (decision 4083729 / Size-leg request id 4083729) → run → A1+A2 rendered → Confirm (simulated) → mint.
**Screenshots:** /tmp/d2p-verify/08-02-rev-a1.png · /tmp/d2p-verify/08-02-rev-a2.png · /tmp/d2p-verify/08-02-rev-mint.png

### PRIMARY — the two fixes

| # | Claim | Verdict | Measured |
|---|-------|---------|----------|
| 1 | A1 factor renders percent, NOT raw 568 | ✓ PASS | Macro-print factor row `co/inflation-rate → 5.68%`. Built-prompt block still legitimately contains `Actual macro print (scaled int): 568` (correct/expected). BOTH confirmed via browser_evaluate. |
| 2 | Mint margins human-scaled, NOT raw WAD | ✓ PASS | MintCard renders `Margen delta (token0): -0.5`, `Margen delta (token1): 1.0`. Regex for ≥15-digit WAD on mint block = false. |

### REGRESSION SWEEP

| # | Claim | Verdict | Measured |
|---|-------|---------|----------|
| 3 | testnet-agent + consensus-verified ONLY in a1 | ✓ PASS | a1: consensus-verified=true, testnet=true. a2: both false. mint: both false. |
| 4 | A2 fork-verified pill NEUTRAL + FlaskConical sub-label + strike 4.100 + human-authored label + no `<details>` | ✓ PASS | Pill computed color `lab(7.25 0.65 3.28)` / bg `lab(93.05 0.69 2.96)` (a*/b* ≈ 0 → neutral grayscale, NOT green). FlaskConical "mock · not live" present. Strike `4.100` present. "human-authored explanation" label present above rationale. `details` count = 0. |
| 5 | Confirm gate: [data-confirm] focused when a2 appears; CTA "Confirmar (simulado)"/"Confirm (simulated)" | ✓ PASS | `document.activeElement === [data-confirm]` = true (focused before click). CTA text = "Confirm (simulated)". |
| 6 | Whole-DOM honesty post-run | ✓ PASS | body.innerText: executed/realized/ejecutad/realizad=false; bare $-digit PnL=false; raw 0x000…=false; green/verde tier words=false. |
| 7 | Console: only known WalletConnect placeholder | ✓ PASS | 2 errors (web3modal 403, walletconnect pulse 400) + 1 Reown config warning — all the known placeholder-projectId noise. No React/Next/hydration errors. |

**Verdict: all 7 claims ✓ PASS. No regression observed.** Locale rendered en (English) — both fixes verified in en; es-CO percent rendering ("5,68 %") not separately exercised this run but factor regex accepted comma form.
