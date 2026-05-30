---
phase: 5
slug: read-first-wallet-and-defi-surface
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-30
---

# Phase 5 — Validation Strategy

> Per-phase validation contract. The planner MUST map every DEFI-01..DEFI-07 requirement to a row in the Per-Task Verification Map.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Frameworks** | Vitest 4.x (unit + RSC + route handlers), Playwright (e2e + a11y), @axe-core/playwright, Biome, tsc, impeccable@2.1.8 |
| **Config files** | Existing — `vitest.config.ts`, `playwright.config.ts`, `biome.json`, `tsconfig.json` |
| **Quick run** | `pnpm test:quick` (biome + tsc + vitest) |
| **Full suite** | `pnpm test:all` |
| **Est. quick runtime** | ~45s |

> **Ground-truth gate (CLAUDE.md):** automated green is necessary, not sufficient. The instrument page + wallet states + payoff diagram + risk disclosure are RENDERED surfaces → Evidence-Collector live-verification (Playwright) per route task. **CI e2e runs LOCAL-build** (memory `ci_e2e_architecture.md`); wallet JS isolated to `(defi)` (FOUND-11).
>
> **Charting lib: recharts 3.8.1** (research: visx 3.12 lacks React 19 support; recharts 3.8.1 supports it). UI-SPEC chart contract is library-agnostic — recharts satisfies it. Next 16's built-in `.next/diagnostics/route-bundle-stats.json` (after `pnpm build`) is the WAIVER-05-05 bundle-isolation check — NOT `--analyze`/`@next/bundle-analyzer` (neither installed nor a real flag).

---

## Sampling Rate

- **After every task commit:** `pnpm test:quick`
- **After every wave:** `pnpm test:all`
- **After each rendered route task:** Evidence Collector live-verify (`/apps/abrigo/instruments` honest-empty; an instrument page's risk-disclosure-above-fold-at-360px; the 4 wallet states; payoff diagram tokens/no-fabrication).
- **Before `/gsd:verify-work`:** full suite green on the local build + axe clean on the wallet states.
- **Max feedback latency:** 45s/task (quick).

---

## Per-Task Verification Map

> Planner fills Task IDs. Every DEFI-0X MUST appear.

| Req ID | Test Type | Automated Command (guidance) | Evidence / File | Status |
|--------|-----------|------------------------------|-----------------|--------|
| **DEFI-01** | unit + e2e | RainbowKit `getDefaultConfig` wired with WalletConnect connectors (`NEXT_PUBLIC_WALLETCONNECT_ID`); `(defi)/providers.tsx` exports the full Wagmi/RainbowKit tree; e2e: ConnectButton renders + modal opens. Mobile deeplink = WAIVER-05-02 (placeholder projectId) | `lib/wagmi/{config,Providers}.ts(x)`, `app/(defi)/providers.tsx` | ⬜ pending |
| **DEFI-02** | unit + e2e | 4-state derivation from wagmi `getAccount` (connecting/reconnecting→CONNECTING, disconnected→DISCONNECTED, connected+`chain===undefined`→WRONG_CHAIN, connected+chain→READY) — unit-tested pure deriver; e2e asserts each state's distinct affordance | `lib/wallet/state.ts` (deriver), `components/.../WalletPanel.tsx` | ⬜ pending |
| **DEFI-03** | e2e + structural | per-instrument page at `app/(defi)/apps/abrigo/instruments/[id]/[chain]/page.tsx` (URL `/apps/abrigo/instruments/{id}/{chainId}`, `[chain]`=numeric chainId) shows params/payoff/pool + an HONEST participant COUNT (`InstrumentState.lpPositionCount`, em-dash when not deployed) — read-only, no wallet gate; honest-empty index when registry empty. Per-address "recent participants" event FEED is deferred = **WAIVER-05-06**. FOUND-11: grep no wallet provider in `(lab)`/`(apps)` | the route + index | ⬜ pending |
| **DEFI-04** | unit + e2e | PayoffDiagram (recharts, `next/dynamic` client island) renders CFMM curve + strike + slope + current-price marker, locale axis labels, `fill="var(--token)"`, no gradient. Unit-test the curve math + props with EXAMPLE params (in tests; not public until an instrument deploys). `AbrigoInstrument` gains `strike`/`slope` fields | `components/.../PayoffDiagram.tsx`, `lib/apps/abrigo/instruments.ts` | ⬜ pending |
| **DEFI-05** | e2e (a11y/visual) | risk callout "hedging product, not leverage" es-CO+en, ABOVE FOLD at 360px (`scrollY===0` + screenshot), persistent (not dismissible), full-weight | `components/.../RiskCallout.tsx`, instrument page | ⬜ pending |
| **DEFI-06** | e2e (axe + keyboard) | wallet modal keyboard-navigable, no focus trap on close, focus returns, SR state announcements via `aria-live="polite"` WalletPanel wrapper; `@axe-core/playwright` clean on the open modal + each state | wallet panel + RainbowKit modal | ⬜ pending |
| **DEFI-07** | unit + e2e | WRONG_CHAIN (connected EVM ∉ our 5, e.g. Polygon → `chain===undefined`) shows switch-to-supported CTA (`useSwitchChain`). Non-EVM "unsupported" (Solana) is UNREACHABLE via EVM connectors → **WAIVER-05-03** (no unreachable state built); test the switch CTA path | `lib/wallet/state.ts`, WalletPanel | ⬜ pending |

**Anti-fishing cross-cut:** tests MUST assert the instruments index renders honest "none deployed yet" (no ghost cards), the pool panel shows `not_deployed` with no fabricated numerics, and the payoff diagram has no gradient fill / no one-sided colored border.

---

## Wave 0 Requirements

- [ ] `tests/unit/wallet-state.test.ts` — the 4-state deriver (real assertions, all branches; non-EVM unreachable noted)
- [ ] `tests/unit/payoff-curve.test.ts(x)` — CFMM curve math + PayoffDiagram props with EXAMPLE strike/slope (tests only)
- [ ] `tests/unit/instruments-index.test.ts` — honest-empty index (no fabricated instruments) + B2 chainId→pool selector fixture (data-only, `@vitest-environment node`, `.test.ts` NOT `.tsx`)
- [ ] `tests/e2e/instrument-page.spec.ts` — read-only render, risk-above-fold-at-360px, no wallet gate (test.fixme until an instrument exists OR drive an example fixture in test env)
- [ ] `tests/e2e/wallet-states.spec.ts` — the 4 states + switch CTA + axe a11y (DEFI-06); mock/inject wallet state
- [ ] `tests/architecture/defi-bundle-isolation.test.ts` — no wallet provider import in `(lab)`/`(apps)` (FOUND-11)
- [ ] install: `recharts@3.8.1` (React 19 compat — NOT visx); confirm `@rainbow-me/rainbowkit` + wagmi versions
- [ ] add `strike`/`slope` to `AbrigoInstrument` (open question: static registry vs on-chain ABI — planner decides; provisional ABI has neither getter)

---

## Manual-Only Verifications (tracked waivers)

| Behavior | Requirement | Why Manual | Instructions |
|----------|-------------|------------|--------------|
| Mobile wallet deeplink fires + approves (WAIVER-05-02) | DEFI-01, ROADMAP SC#2 | `NEXT_PUBLIC_WALLETCONNECT_ID` is a dev placeholder | Provision a real Reown projectId, then test MetaMask Mobile/Valora deeplink on a device |
| RainbowKit modal visual fidelity (WAIVER-05-01) | DEFI-01 | theming needs a real screenshot | Evidence Collector screenshot of the open themed modal post-build |
| Non-EVM "unsupported chain" message (WAIVER-05-03) | DEFI-07 | unreachable via wagmi EVM connectors | N/A — documented as unreachable; no state built |
| Instrument page live values (WAIVER-05-04) | DEFI-03, DEFI-04 | no contract deployed (empty registry) | When an Abrigo instrument deploys, verify params/payoff/pool against a block explorer |
| recharts bundle isolation (WAIVER-05-05) | DEFI-04 | needs a build analysis | After `pnpm build`, assert recharts/d3 chunks appear ONLY under the `(defi)` instrument-route chunk list in `.next/diagnostics/route-bundle-stats.json` and are absent from `(lab)`/`(apps)`/`(dashboard)` routes (NO `--analyze`/`@next/bundle-analyzer`) |
| Per-address recent-participants event feed (WAIVER-05-06) | DEFI-03 | aggregator exposes `lpPositionCount` (count), not per-address events; no event indexer this phase | The instrument page surfaces the honest count now; a per-address feed ships when an event indexer exists |

---

## Validation Sign-Off

- [ ] Every DEFI-0X has an automated verify or a recorded manual waiver
- [ ] No 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING test refs
- [ ] No watch-mode flags
- [ ] Feedback latency < 45s
- [ ] `nyquist_compliant: true` set

**Approval:** pending
