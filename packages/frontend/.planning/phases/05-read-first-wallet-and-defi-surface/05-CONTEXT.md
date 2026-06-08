# Phase 5: Read-First Wallet and DeFi Surface - Context

**Gathered:** 2026-05-30
**Status:** Ready for planning

<domain>
## Phase Boundary

A protocol participant can browse every **deployed** Abrigo instrument — parameters, payoff diagram, current pool state, recent participant count, risk disclosure — and **optionally** connect a mobile/desktop wallet to see their own on-chain state. **No transact path is exposed** (read-first only). Wallet JS stays isolated to the `(defi)` route group (FOUND-11).

In scope: DEFI-01..07 — RainbowKit wallet connect, the 4-state wallet machine, per-instrument page `/apps/abrigo/instruments/{id}/{chain}`, CFMM payoff diagram, risk disclosures, a11y, wrong-vs-unsupported chain distinction.

Out of scope: any transact/approve/swap path; an illustrative/example "live" instrument (rejected — see Deferred); a global wallet header outside `(defi)`.
</domain>

<decisions>
## Implementation Decisions

### Wallet connect UX (DEFI-01, DEFI-06)
- **RainbowKit v2 default ConnectButton + modal, themed to the locked ochre/Plex tokens** via RainbowKit's theming API. Rely on RainbowKit for WalletConnect v2, mobile deeplinks (MetaMask Mobile, Rainbow, Coinbase Wallet, Valora/Celo), keyboard nav, focus management, and SR announcements (DEFI-06) — do NOT hand-roll the modal. We add only the chain-distinction logic on top.
- Replace the `(defi)/providers.tsx` Phase-1 placeholder with the full `WagmiProvider` + `QueryClientProvider` + `RainbowKitProvider` tree. Wallet JS must NOT leak into `(lab)`/`(apps)` (FOUND-11 bundle isolation).

### Wallet placement + 4-state machine (DEFI-02, DEFI-07)
- **Per-instrument only** — NO persistent global/(defi)-header connect button. The connect entry + all wallet state render inside each instrument page's wallet panel.
- The 4 explicit states each get a distinct inline affordance: `DISCONNECTED` → "connect to see your position" prompt; `CONNECTING` → spinner/pending; `CONNECTED_WRONG_CHAIN` → switch-to-supported-chain CTA; `CONNECTED_READY` → the user's on-chain state panel.
- **Wrong-chain ≠ unsupported-chain (DEFI-07):** a connected EVM wallet on a chain not in our 5 supported (e.g. Polygon) → a switch CTA; a wallet on a chain we don't/can't deploy on (e.g. Solana / non-EVM) → a distinct explanatory message. The two states are never conflated.

### Payoff diagram (DEFI-04)
- **Render with a charting library** (NOT hand-rolled SVG) for axis/tooltip scaffolding + interactive readouts. **visx is preferred** (D3 primitives — composable, themes cleanly to the ochre tokens, smaller styling surface than recharts → easier to pass impeccable); research to confirm visx vs recharts and the RSC/client boundary. Must be themed to the locked tokens and pass the impeccable gate; bundle stays within `(defi)`.
- Curve shows the CFMM payoff with locale axis labels (es-CO/en), strike line, slope, and current-price marker.
- **No illustrative/example curve while the registry is empty** — see "Empty-registry surface". The component is built + unit-tested with EXAMPLE parameters **in tests only**, not rendered with fabricated data on any public page.

### Empty-registry surface (requirements-driven — `ABRIGO_INSTRUMENTS` is `[]` at launch)
- The instruments index (`/apps/abrigo/instruments`) renders an **honest "no instruments deployed yet" state** — no fabricated/example instruments (consistent with the project's no-fabricated-data IA stance + CROSS-09 anti-fishing + the Phase-3/4 `not_deployed`/`empty` pattern).
- Per-instrument detail pages (`/apps/abrigo/instruments/{id}/{chain}`) are only reachable once a real instrument exists in the registry; the payoff diagram + pool-state panel render only for a real deployed instrument. Pool state reuses the Phase-3 `aggregateAllChains`/instrument lib (no duplication), surfacing `not_deployed` honestly where applicable.
- **Consequence (tracked waiver, like the phase-3.1 research components):** DEFI-03/DEFI-04 ship **built + unit-tested but unexercised on the public surface** until a contract deploys. The planner must record this waiver and the reviewers will scrutinize it; success criteria #1 (an instrument page with payoff/pool/params) is demonstrable via a test fixture, not the live site, pre-deploy.

### Risk disclosure (requirements-driven, DEFI-05)
- Every instrument page labels the instrument "hedging product, not leverage" in **es-CO + en**, present **above the fold without scrolling at 360px wide** and upward — a persistent risk callout/banner, not a dismissible toast or a below-fold footnote.

### Claude's Discretion
- visx vs recharts final pick (research/library verification); the exact RSC/client split for the chart.
- Exact copy/wording of the 4 wallet-state affordances and the risk-disclosure callout (es-CO authored first).
- Whether the empty instruments index links to the GitHub/contracts-pending context.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope + requirements
- `.planning/ROADMAP.md` § "Phase 5: Read-First Wallet and DeFi Surface" — goal + success criteria 1–4.
- `.planning/REQUIREMENTS.md` — **DEFI-01 … DEFI-07** (wallet connect, 4-state machine, instrument page, payoff diagram, risk disclosure, a11y, wrong-vs-unsupported chain). Also FOUND-05/06 (wagmi 5-chain config) and FOUND-11 (bundle isolation).

### Existing scaffolding (Phase 1) the phase builds on
- `lib/wagmi/config.ts` — `wagmiConfig` (5 chains celo/mainnet/base/arbitrum/optimism, `fallback` RPC with public fallbacks). Add RainbowKit on top.
- `lib/wagmi/Providers.tsx` + `app/(defi)/providers.tsx` (Phase-1 placeholder) + `app/(defi)/layout.tsx` — where the full Wagmi/RainbowKit/QueryClient tree goes.
- `lib/apps/abrigo/instruments.ts` — `AbrigoInstrument { id, chainId, address, … }` type + **empty** `ABRIGO_INSTRUMENTS` registry + `ABRIGO_ABI`.
- `lib/dashboard/aggregator.ts` / `lib/apps/abrigo/instruments.ts` — pool-state source (reuse, no duplication — same boundary the Phase-4 `get_pool_state` tool used).

### Project rules
- `./CLAUDE.md` — anti-fishing (honest empties, no fabricated numbers), locked design tokens (muted ochre `oklch(0.6 0.08 70)`, `--accent-text` for small ochre text, IBM Plex Sans/Mono), Evidence-Collector live-verification gate per route, es-CO-first copy + native sign-off in `docs/copy-review.md`, biome+tsc pre-commit, impeccable anti-AI-tell gate.
- Memory `visual_design_reference.md` (locked tokens), `ci_e2e_architecture.md` (e2e local-build on PR; Vercel preview env scoped per-branch).

### Library docs (fetch during research)
- RainbowKit v2 — `ConnectButton`, custom theming, `RainbowKitProvider`, WalletConnect v2 projectId (`NEXT_PUBLIC_WALLETCONNECT_ID`), Valora/Celo wallet support, a11y.
- wagmi v2 — `useAccount`/`useChainId`/`useSwitchChain` for the 4-state machine + wrong/unsupported logic.
- visx (and recharts as the alternative) — curve rendering, axis theming, RSC/client boundary.
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/wagmi/config.ts` — the 5-chain wagmi config is done; Phase 5 wraps it with RainbowKit's `getDefaultConfig`/provider (or composes RainbowKit over the existing `createConfig`).
- `@rainbow-me/rainbowkit@2.2.11`, `wagmi@2.19.5`, `viem@2.48.11`, `@tanstack/react-query@5.x` — all installed. **No charting lib installed** → Phase 5 adds visx (or recharts).
- `lib/apps/abrigo/instruments.ts` + `lib/dashboard/aggregator.ts` — pool/instrument state source (reuse directly, the Phase-4 no-duplication boundary).
- StatusPill + the locked-token component layer + `--accent-text` for AA-safe small ochre text.

### Established Patterns
- `(defi)` route group exists with its own `layout.tsx` + `providers.tsx` placeholder — the designated wallet-bundle-isolation boundary (FOUND-11). The `(lab)` layout provably has no wallet provider.
- Honest-empty envelopes (`status:'empty'`/`not_deployed`) from Phases 3–4 — extend to the instruments index + pool-state panel.
- Evidence-Collector live-verification after each route task (instrument page, instruments index, wallet panel states).

### Integration Points
- `app/(defi)/providers.tsx` → full Wagmi/RainbowKit/QueryClient tree.
- New routes under `(defi)` (or `(apps)`?) for `/apps/abrigo/instruments/{id}/{chain}` — note: the route lives under `apps/abrigo` per DEFI-03, but wallet providers must wrap it; the planner resolves whether that path sits in `(defi)` or `(apps)` with a `(defi)` provider boundary (FOUND-11 must hold either way).
- WalletConnect projectId via `NEXT_PUBLIC_WALLETCONNECT_ID` (currently a dev placeholder — a real Reown/WalletConnect Cloud id is needed for mobile deeplinks to actually function; a manual follow-up like the other env items).
</code_context>

<specifics>
## Specific Ideas

- Strictest no-fabrication stance: **no example/illustrative instrument or curve on the public site** — honest "none deployed yet" until a real contract lands. (Diverges from the Hookathon-demo convenience; the user chose integrity over a demoable diagram.)
- Wallet UI is **per-instrument**, not a global header — the site stays read-first/wallet-optional, and wallet weight only loads where a position can be shown.
- RainbowKit's robust modal over a hand-rolled one — lean on its a11y/mobile machinery, theme it to our tokens.
</specifics>

<deferred>
## Deferred Ideas

- **Transact/approve/swap path** — explicitly OUT of scope (read-first only); a future milestone.
- **Illustrative/example instrument + payoff curve** — considered and REJECTED (no fabricated data on the public site); revisit only if a testnet instrument is deployed to demo against real chain state.
- **Global/(defi)-header wallet connect** — rejected for this phase (per-instrument only).
- **Real WalletConnect Cloud projectId** — needed for live mobile deeplinks; manual provisioning follow-up (currently a dev placeholder).
</deferred>

---

*Phase: 05-read-first-wallet-and-defi-surface*
*Context gathered: 2026-05-30*
