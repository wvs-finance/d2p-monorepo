# Phase 5: Read-First Wallet and DeFi Surface — Research

**Researched:** 2026-05-30
**Domain:** RainbowKit v2 + wagmi v2, Next.js 16 (defi) route group, charting library selection (visx vs recharts), CFMM payoff math, WCAG a11y for wallet modals
**Confidence:** HIGH (all critical stack verified against installed node_modules; LOW items flagged)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **RainbowKit v2 default ConnectButton + modal**, themed to locked ochre/Plex tokens via RainbowKit theming API. Do NOT hand-roll the modal.
- **Provider tree** replaces `app/(defi)/providers.tsx` Phase-1 placeholder with full `WagmiProvider` + `QueryClientProvider` + `RainbowKitProvider` tree. Wallet JS must NOT leak into `(lab)` / `(apps)`.
- **Per-instrument wallet placement only** — NO global/(defi)-header connect button.
- **4-state wallet machine** (DISCONNECTED / CONNECTING / CONNECTED_WRONG_CHAIN / CONNECTED_READY) each with distinct inline affordance.
- **Wrong-chain derivation**: `connected && chain === undefined` → CONNECTED_WRONG_CHAIN (switch CTA). Non-EVM (Solana) is unreachable via EVM connectors → WAIVER-05-03.
- **Honest empty-registry surface**: instruments index renders "none deployed yet" with no fabricated instruments or illustrative curves.
- **Per-instrument pages** under `app/(defi)/apps/abrigo/instruments/[id]/[chain]/page.tsx` (FOUND-11 clean, URL-transparent route group).
- **Risk disclosure** above fold at 360px, persistent, full 4-side `border-accent-default` hairline, not dismissible, not a toast.
- **Charting library**: visx preferred; research to confirm vs recharts (Claude's Discretion).
- **PayoffDiagram** via `next/dynamic`, renders only with real instrument data, no fabricated curve on public site.
- **Pool-state** filter from `aggregateAllChains()` result by `{id}/{chain}` — no full-chain refetch.

### Claude's Discretion

- visx vs recharts final pick (research/library verification + React 19 + bundle isolation).
- Exact RSC/client split for the chart.
- Exact copy/wording of the 4 wallet-state affordances and the risk-disclosure callout (es-CO authored first).
- Whether the empty instruments index links to GitHub/contracts-pending context.

### Deferred Ideas (OUT OF SCOPE)

- Transact/approve/swap path — explicitly out of scope.
- Illustrative/example instrument or payoff curve on the public site.
- Global/(defi)-header wallet connect.
- Real WalletConnect Cloud projectId — manual provisioning follow-up (currently placeholder).
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DEFI-01 | RainbowKit v2 wallet connect; WalletConnect v2 mobile deeplinks (MetaMask Mobile, Rainbow, Coinbase Wallet, Valora/Celo) | `lib/wagmi/Providers.tsx` already has full provider tree; needs `getDefaultConfig` migration + projectId wiring; WC deeplinks require real projectId (tracked waiver) |
| DEFI-02 | 4-state machine: DISCONNECTED / CONNECTED_WRONG_CHAIN / CONNECTED_READY / CONNECTING, each with distinct UI | wagmi `useAccount` status + `chain` field derivation verified against installed types; WalletPanel client component pattern |
| DEFI-03 | Per-instrument page `/apps/abrigo/instruments/{id}/{chain}` — params, payoff, pool state, participants, no wallet gate | Route at `app/(defi)/apps/abrigo/instruments/[id]/[chain]/page.tsx`; instrument params need strike/slope added to AbrigoInstrument type |
| DEFI-04 | Payoff diagram — CFMM curve, locale axis labels, strike/slope/current-price marker | recharts 3.8.1 recommended (React 19 explicit support, no peer dep friction); visx 3.12 requires peerDependencyRules workaround |
| DEFI-05 | Risk disclosure "hedging product, not leverage" above fold at 360px, both locales | RiskCallout RSC, 4-side border, 12px vertical padding at 360px; Evidence Collector scrollY===0 assertion is the definitive proof |
| DEFI-06 | Wallet connect modal keyboard-navigable, no focus trap on close, SR state change announcements | RainbowKit 2.2.11 uses `@vanilla-extract/*` + `react-remove-scroll` natively; conformance verified live via axe+keyboard, not asserted from internals |
| DEFI-07 | Wrong-chain vs unsupported-chain distinction | `status === 'connected' && chain === undefined` → wrong chain; non-EVM unreachable via EVM connectors (WAIVER-05-03) |
</phase_requirements>

---

## Summary

Phase 5 introduces the `(defi)` route group's full wallet surface and per-instrument read-only pages. The foundation (wagmi config, provider shell, route group layout) is already built in Phase 1; the scaffolding (`lib/wagmi/Providers.tsx`) already contains the correct `WagmiProvider > QueryClientProvider > RainbowKitProvider` nesting. Phase 5 has three primary work tracks: (1) migrating the wagmiConfig to `getDefaultConfig` so WalletConnect v2 connectors are included, wiring the projectId, and activating the theme in `app/(defi)/providers.tsx`; (2) building the `app/(defi)/apps/abrigo/instruments/` route tree with its honest-empty index and per-instrument pages; (3) adding the charting library and `PayoffDiagram` client island.

The critical research decision is **charting library selection**: recharts 3.8.1 explicitly supports React 19 in its peerDependencies and installs cleanly with pnpm 10; visx 3.12 (latest stable) declares `react: '^16.3.0-0 || ^17.0.0-0 || ^18.0.0-0'` and while pnpm 10's `autoInstallPeers: true` allows it to install with a warning, it introduces unnecessary friction. visx 4.0.0-alpha.11 adds React 19 support but is an alpha release. **Recommendation: use recharts 3.8.1 as the charting library.** It explicitly supports React 19, installs cleanly, supports `next/dynamic` with `ssr: false`, and its chart primitives theme cleanly to CSS variable fills and strokes. Bundle isolation is achieved via `next/dynamic` in both cases.

The CFMM payoff math is simple enough to hand-code: `payoff(p) = slope * Math.max(strike - p, 0)` for a put-style convex hedge, generating ~100 points across the domain `[0.3*strike, 1.7*strike]`. This is a pure function — no library needed for the math itself. The AbrigoInstrument type needs `strike`, `slope`, and optionally `deployedAt` extended to include display parameters for the payoff diagram.

**Primary recommendation:** Use recharts 3.8.1 for the PayoffDiagram client island, via `next/dynamic({ ssr: false })`. Use the existing `wagmiConfig` (createConfig) as the base for `getDefaultConfig` migration — RainbowKit's `getDefaultConfig` returns a wagmi Config that replaces the existing one. The `WagmiProviders` component in `lib/wagmi/Providers.tsx` is 90% done; Phase 5 activates it in `app/(defi)/providers.tsx` with theme and projectId.

---

## Standard Stack

### Core (all already installed — verified against node_modules)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@rainbow-me/rainbowkit` | 2.2.11 | Wallet connect modal, ConnectButton, theming, WalletConnect v2 | Installed; verified against package.json; peerDeps satisfied |
| `wagmi` | 2.19.5 | React hooks for wallet state (`useAccount`, `useChainId`, `useSwitchChain`) | Installed; hooks verified in `node_modules/wagmi/dist/types/hooks/` |
| `viem` | 2.48.11 | EVM client, chain types | Installed; required peer dep of wagmi + RainbowKit |
| `@tanstack/react-query` | 5.100.10 | Server state for wallet/chain queries | Installed; required peer dep of wagmi |

### New Package for Phase 5

| Library | Version | Purpose | Install |
|---------|---------|---------|---------|
| `recharts` | 3.8.1 | PayoffDiagram CFMM curve + axes + tooltip | `pnpm add recharts` — React 19 explicit in peerDeps, clean install |

**Why recharts over visx (Claude's Discretion — decided here):**

| Criterion | recharts 3.8.1 | visx 3.12.0 (latest stable) |
|-----------|---------------|----------------------------|
| React 19 peerDep | YES — explicit `^19.0.0` | NO — `^18.0.0-0` only |
| pnpm 10 clean install | YES | With peer dep warning (pnpm.peerDependencyRules needed) |
| visx 4.0.0-alpha.11 React 19 | YES | Alpha — not production-ready |
| Bundle isolation via `next/dynamic` | YES | YES (both work) |
| CSS var theming | YES — all SVG props accept `var(--token)` | YES — same SVG prop approach |
| Complexity for single curve | Lower — LineChart + ReferenceLines | Higher — compose D3 scales manually |
| Tree shaking | Named exports, `LineChart` only | Package-per-primitive |

The deciding factor: **visx 3.12 does not declare React 19 support and pnpm 10 with `autoInstallPeers: true` installs it with a peer dep warning** (not an error), but this produces a friction-point and CI warning noise that recharts avoids entirely. recharts 3.8.1's `LineChart`, `Line`, `XAxis`, `YAxis`, `CartesianGrid`, `ReferenceLine`, and `Tooltip` cover the full PayoffDiagram contract from the UI-SPEC. SVG elements accept `stroke="var(--accent-default)"` and `fill="var(--text-muted)"` directly.

**Installation:**
```bash
pnpm add recharts
```

**Version verification (live):** `npm view recharts version` → `3.8.1` (verified 2026-05-30).

---

## Architecture Patterns

### Route Tree

```
app/
  (apps)/apps/abrigo/dashboard/    ← existing, untouched
  (defi)/
    layout.tsx                     ← existing RSC, renders <DefiProviders>
    providers.tsx                  ← Phase 5 replaces placeholder:
                                      export { WagmiProviders as DefiProviders }
    apps/abrigo/
      instruments/
        page.tsx                   ← instruments index (honest empty)
        [id]/[chain]/
          page.tsx                 ← per-instrument page (RSC shell)
          error.tsx                ← route error boundary
```

### Pattern 1: Provider Tree Activation

`lib/wagmi/Providers.tsx` already implements `WagmiProvider > QueryClientProvider > RainbowKitProvider`. Phase 5 activates it by:

1. Migrating `lib/wagmi/config.ts` from `createConfig` to `getDefaultConfig` (adds WalletConnect connectors, requires `projectId`).
2. Adding theme to `RainbowKitProvider` in `lib/wagmi/Providers.tsx`.
3. Exporting `WagmiProviders as DefiProviders` from `app/(defi)/providers.tsx`.

```typescript
// Source: node_modules/@rainbow-me/rainbowkit/dist/config/getDefaultConfig.d.ts (verified)
// REPLACES the existing wagmiConfig createConfig call in lib/wagmi/config.ts
import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { celo, mainnet, base, arbitrum, optimism } from 'viem/chains'

export const wagmiConfig = getDefaultConfig({
  appName: 'd2p Finance',
  projectId: env.NEXT_PUBLIC_WALLETCONNECT_ID,
  chains: [celo, mainnet, base, arbitrum, optimism],
  ssr: false,   // wallet state is client-only (existing constraint, confirmed in config.ts)
  transports: {
    // ... same fallback transports as existing config
  },
})
```

**Critical:** `getDefaultConfig` returns a wagmi `Config` type — it is a drop-in replacement for `createConfig`. The existing `WagmiProvider config={wagmiConfig}` call in `lib/wagmi/Providers.tsx` requires no change. The existing `wagmi-config.test.ts` continues to work (chains/ids assertions hold; add `NEXT_PUBLIC_WALLETCONNECT_ID: 'test'` stub — already present in the test setup).

### Pattern 2: RainbowKit Theme Wiring

```typescript
// Source: node_modules/@rainbow-me/rainbowkit/dist/themes/lightTheme.d.ts (verified)
// In lib/wagmi/Providers.tsx
import { lightTheme } from '@rainbow-me/rainbowkit'

const rbkTheme = lightTheme({
  accentColor: '#a87c3a',           // HEX ONLY — RainbowKit compositor requires HEX
  accentColorForeground: '#f8f5f0', // HEX approx of --bg-canvas
  borderRadius: 'medium',           // 0.5rem = --radius
  fontStack: 'system',              // overridden via CSS vars below
  overlayBlur: 'none',
})

// Then in JSX:
<RainbowKitProvider theme={rbkTheme}>
```

CSS var overrides (appended to globals.css or inline style on the RainbowKitProvider container — scope them under `[data-rk]`):
```css
[data-rk] {
  --rk-fonts-body: var(--font-plex-sans), system-ui, sans-serif;
  --rk-colors-modalBackground: var(--bg-elevated);
  --rk-colors-modalBorder: var(--border-default);
  --rk-colors-modalText: var(--text-primary);
  --rk-colors-modalTextSecondary: var(--text-secondary);
}
```

**Note on `locale` prop:** RainbowKit's `Locale` type supports `'es'` and `'es-419'` but NOT `'es-CO'`. Pass `locale="es"` for Spanish. RainbowKit's modal copy is translated by RainbowKit itself; the 4-state wallet panel copy in our `WalletPanel` component is authored in es-CO per CLAUDE.md.

### Pattern 3: 4-State Wallet Machine

```typescript
// Source: node_modules/wagmi/dist/types/hooks/useAccount.d.ts (verified)
// WalletPanel.tsx — 'use client'
import { useAccount, useSwitchChain } from 'wagmi'

export function WalletPanel() {
  const { status, chain } = useAccount()
  const { switchChain } = useSwitchChain()

  // 4-state derivation (exact, from wagmi GetAccountReturnType):
  const walletState =
    status === 'connecting' || status === 'reconnecting' ? 'CONNECTING'
    : status === 'disconnected'                          ? 'DISCONNECTED'
    : chain === undefined                                ? 'CONNECTED_WRONG_CHAIN'
    : /* status === 'connected' && chain defined */        'CONNECTED_READY'

  // ...
}
```

**`chain === undefined` mechanics:** wagmi returns `chain: undefined` when `status === 'connected'` and the active chain is NOT in the configured chains array (`celo, mainnet, base, arbitrum, optimism`). This is wagmi's standard behavior for unsupported/wrong-chain — verified against `GetAccountReturnType` in wagmi core types. An EVM wallet on Polygon triggers this path. A Solana wallet cannot connect through wagmi EVM connectors at all (WAIVER-05-03).

**`useSwitchChain` for the switch CTA:**
```typescript
// Source: node_modules/wagmi/dist/types/hooks/useSwitchChain.d.ts (verified)
const { switchChain, chains } = useSwitchChain()

// In CONNECTED_WRONG_CHAIN state — switch to celo (primary):
<button onClick={() => switchChain({ chainId: celo.id })}>
  Cambiar red / Switch network
</button>
```

### Pattern 4: Pool State Filter (no full-chain refetch) — keyed by numeric chainId

```typescript
// Source: lib/dashboard/aggregator.ts (verified — aggregateAllChains returns ChainAggregationResult[]).
// PoolStatePanel is an RSC (NOT 'use client') — it receives the pre-filtered InstrumentState | null as a prop.
// The selector below runs on the server in the page RSC.
import { aggregateAllChains } from '@/lib/dashboard/aggregator'
import type { ChainAggregationResult, InstrumentState } from '@/lib/dashboard/aggregator'

// The [chain] URL segment IS the numeric chainId (AbrigoInstrument.chainId — SupportedChainId).
// We filter by chainId (number), NOT chainName: chainName ("Celo"/"OP Mainnet"/"Arbitrum One")
// has no stable slug and would silently null every real instrument. chainId is unambiguous.
function getInstrumentPoolState(
  results: ChainAggregationResult[],
  instrumentId: string,
  chainId: number,
): InstrumentState | null {
  const chainResult = results.find((r) => r.chainId === chainId)
  if (!chainResult || chainResult.status === 'empty') return null
  return chainResult.instruments.find((i) => i.id === instrumentId) ?? null
}
```

**Data access approach:** The per-instrument page is an RSC. It calls `aggregateAllChains()` server-side (same as the dashboard BFF) and passes the filtered `InstrumentState | null` to `PoolStatePanel`. No client-side hook needed — the pool state is server-fetched, consistent with the read-first RSC-first pattern. **`PoolStatePanel` is an RSC** (no `'use client'`) and receives pre-filtered data as a prop (not a hook call).

**`[chain]` segment contract (locked):** `[chain] = instrument.chainId` (numeric — e.g. `42220` for Celo). It is already on `AbrigoInstrument` and on `ChainAggregationResult.chainId`, so card links, the page `notFound()` lookup, and the pool selector all key off the same unambiguous integer. The instrument lookup is `ABRIGO_INSTRUMENTS.find(i => i.id === id && i.chainId === Number(chainParam))`. Do NOT use `chainName` as the URL segment.

### Pattern 5: PayoffDiagram Client Island (recharts)

```typescript
// PayoffDiagram.tsx — 'use client' (dynamically imported via next/dynamic)
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, ReferenceLine, Tooltip, ResponsiveContainer
} from 'recharts'

interface PayoffDiagramProps {
  strike: number    // strike price K
  slope: number     // payoff slope m (delta at strike)
  currentPrice: number
  locale: string    // 'es-CO' | 'en'
}

// CFMM payoff: convex hedge payoff = slope * max(strike - price, 0)
// Generate 100 points across [0.3*K, 1.7*K]
function generatePayoffData(strike: number, slope: number, points = 100) {
  const lo = strike * 0.3
  const hi = strike * 1.7
  return Array.from({ length: points }, (_, i) => {
    const price = lo + (hi - lo) * (i / (points - 1))
    return { price, payoff: slope * Math.max(strike - price, 0) }
  })
}

// Axis tick formatter:
const tickFormatter = (locale: string) => (value: number) =>
  new Intl.NumberFormat(locale, { notation: 'compact' }).format(value)
```

**Import pattern for `next/dynamic` (Next 16 — client wrapper REQUIRED):**

`dynamic(..., { ssr: false })` is a **build error inside a Server Component** in Next 16 (`"ssr: false is not allowed with next/dynamic in Server Components"`). The `ssr:false` lazy import must live in a thin `'use client'` wrapper; the RSC page imports the wrapper directly (no `dynamic(`, no `ssr:false` in the server file). The client boundary still code-splits recharts into the `(defi)` instrument-route chunk, so bundle isolation is preserved.

```typescript
// components/defi/PayoffDiagramClient.tsx — 'use client' (the wrapper that owns ssr:false)
'use client'
import dynamic from 'next/dynamic'

const PayoffDiagram = dynamic(() => import('./PayoffDiagram'), {
  ssr: false,
  // The loading skeleton AND the ResponsiveContainer parent must be sized — recharts
  // ResponsiveContainer renders 0-height without a sized parent.
  loading: () => <div className="min-h-[240px] sm:min-h-[320px]" aria-hidden="true" />,
})

export { PayoffDiagram as PayoffDiagramClient }
```

```typescript
// app/(defi)/apps/abrigo/instruments/[id]/[chain]/page.tsx — RSC (NO dynamic, NO ssr:false here)
import { PayoffDiagramClient } from '@/components/defi/PayoffDiagramClient'
// ...
<PayoffDiagramClient strike={instrument.strike} slope={instrument.slope} currentPrice={...} locale={locale} />
```

**Color wiring in recharts:** recharts props accept CSS variable strings directly:
```tsx
<Line stroke="var(--accent-default)" strokeWidth={2} dot={false} />
<XAxis tick={{ fill: 'var(--text-muted)', fontSize: 14, fontFamily: 'var(--font-plex-sans)' }} />
<CartesianGrid stroke="var(--border-default)" strokeOpacity={0.4} vertical={false} />
<ReferenceLine x={strike} stroke="var(--text-secondary)" strokeDasharray="4 4" />
<ReferenceLine x={currentPrice} stroke="var(--accent-default)" strokeDasharray="3 3" />
```

**a11y pattern (CROSS-09 / DEFI-06):**
```tsx
<ResponsiveContainer role="img" aria-label={/* es-CO or en label from UI-SPEC */}>
  <LineChart ...>
    {/* ... */}
  </LineChart>
</ResponsiveContainer>
{/* sr-only data table below diagram */}
<table className="sr-only">...</table>
```

### Pattern 6: AbrigoInstrument Type Extension

The current `AbrigoInstrument` interface (verified in `lib/apps/abrigo/instruments.ts`) lacks `strike` and `slope` — these are needed for the payoff diagram. Phase 5 adds them:

```typescript
export interface AbrigoInstrument {
  id: string
  name: string      // es-CO display name
  nameEn: string    // en display name
  chainId: SupportedChainId
  address: Address
  deployedAt: string
  // Phase 5 additions:
  strike: number    // strike price in the instrument's denomination
  slope: number     // payoff slope coefficient (delta at strike)
}
```

**No duplication:** `get_instrument_terms` MCP tool (Phase 4) currently returns `NotDeployedEnvelope` with `terms: null`. When a real instrument is added to `ABRIGO_INSTRUMENTS`, both the MCP tool and the per-instrument page read from the same registry.

### Recommended Project Structure for New Files

```
app/(defi)/apps/abrigo/
  instruments/
    page.tsx                    ← instruments index (RSC)
    [id]/[chain]/
      page.tsx                  ← per-instrument page (RSC)
      error.tsx                 ← error boundary

components/defi/
  RiskCallout.tsx               ← RSC — persistent risk disclosure
  WalletPanel.tsx               ← Client — 4-state wallet machine
  WalletStatusPill.tsx          ← Client — own type union, not IterationStatus
  PayoffDiagram.tsx             ← Client — recharts CFMM curve, code-split
  InstrumentParams.tsx          ← RSC — parameter table
  PoolStatePanel.tsx            ← Client — pool state (receives pre-filtered data as prop)
  InstrumentJsonLd.tsx          ← RSC — structured data (extends AgentStateJsonLd pattern)

lib/apps/abrigo/
  instruments.ts                ← extend AbrigoInstrument with strike/slope
  payoff.ts                     ← pure function: generatePayoffData(strike, slope)

tests/unit/
  payoff-math.test.ts           ← DEFI-04: payoff function pure unit tests
  wallet-state-machine.test.ts  ← DEFI-02: 4-state derivation logic
  instruments-index.test.ts     ← DEFI-03: honest-empty index rendering

tests/e2e/
  instruments-index.spec.ts     ← honest empty state, no fabricated data
  instrument-detail.spec.ts     ← per-instrument page (Wave 0 fixme, unexercisable pre-deploy)
  wallet-panel-a11y.spec.ts     ← DEFI-06: axe + keyboard states

tests/a11y/
  defi-instruments.spec.ts      ← axe run on instruments index + risk callout
```

### Anti-Patterns to Avoid

- **Do NOT import `wagmi` or `@rainbow-me/rainbowkit` in `app/(lab)/**` or `app/(apps)/**`** — the architecture test `tests/architecture/no-wallet-in-lab.test.ts` already enforces this and will fail the build.
- **Do NOT place instrument detail pages under `app/(apps)/`** — they must be under `app/(defi)/` to receive the Wagmi/RainbowKit context; hooks throw at runtime otherwise.
- **Do NOT use `ConnectButton.Custom`** for label customization — the `label` prop exists and is sufficient (verified in `ConnectButton.d.ts`: `label?: string`).
- **Do NOT add a second focus trap on `WalletPanel`** — RainbowKit manages its own focus trap via `react-remove-scroll`. Adding a second trap breaks keyboard navigation.
- **Do NOT use `text-accent-default` for small CTA text** — use `text-accent-text` (WCAG AA). Enforce this in the `WalletPanel` "connect" prompt text.
- **Do NOT render `0` for missing pool state numerics** — render `—` (em-dash), consistent with Phase 3 dashboard (Phase 3 burn class + established pattern).
- **Do NOT re-derive the pool state via a client-side hook** — fetch server-side in the RSC and pass as props to `PoolStatePanel`, consistent with the read-first RSC-first pattern.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Wallet connect modal with keyboard nav, focus trap, WC v2 QR code, mobile deeplinks | Custom modal + WalletConnect SDK | RainbowKit `ConnectButton` + `RainbowKitProvider` | RainbowKit encapsulates focus trap (`react-remove-scroll`), WC v2 projectId wiring, mobile deeplink QR, MetaMask/Valora support, SR announcements |
| Chain switch prompt | Custom `window.ethereum.request({method:'wallet_switchEthereumChain'})` | `useSwitchChain()` from wagmi | wagmi abstracts connector-specific APIs; handles error cases |
| SVG axes + tick formatting + tooltip | D3 axes from scratch | recharts `XAxis`, `YAxis`, `Tooltip` | Axis math, domain calculation, responsive sizing — all solved; CFMM curve is custom but the scaffolding is not |
| Wallet state serialization | `localStorage` wallet state | wagmi + RainbowKit built-in storage | wagmi handles reconnection, storage, and hydration |
| CSS token extraction for charts | `getComputedStyle` + token traversal | CSS variable string interpolation in recharts props | recharts SVG props accept `var(--token)` strings directly |

**Key insight:** RainbowKit v2 handles the WalletConnect v2 protocol entirely, including the QR code display, mobile deeplink URI generation, and wallet approval handshake. The only custom work is the 4-state machine UI (which is thin) and the chart (which is a standard recharts pattern).

---

## Common Pitfalls

### Pitfall 1: `getDefaultConfig` vs `createConfig` — WalletConnect connectors missing
**What goes wrong:** Using the existing `createConfig` in `lib/wagmi/config.ts` without migrating to `getDefaultConfig` means no WalletConnect connector is registered. The `ConnectButton` renders but the WalletConnect QR flow fails at runtime.
**Why it happens:** `createConfig` with no `connectors` param registers only injected wallets (MetaMask browser extension). `getDefaultConfig` automatically adds `injected()`, `walletConnect()`, `coinbaseWallet()`, and `safe()` connectors.
**How to avoid:** Migrate `lib/wagmi/config.ts` to use `getDefaultConfig`. The API is compatible (accepts same `chains`, `transports` params plus `appName` + `projectId`). The `WagmiProvider config={wagmiConfig}` call in `lib/wagmi/Providers.tsx` requires no change.
**Warning signs:** `ConnectButton` renders with no WalletConnect option in the modal dropdown.

### Pitfall 2: `ssr: false` in wagmiConfig — already correct, don't revert
**What goes wrong:** Setting `ssr: true` in the Phase 5 `getDefaultConfig` call causes hydration mismatches because wallet state is client-only (the `lib/wagmi/config.ts` comment says "Wallet state is client-only — never SSR").
**Why it happens:** The existing wagmiConfig already has `ssr: false`. When migrating to `getDefaultConfig`, carry this setting.
**How to avoid:** Keep `ssr: false` in the getDefaultConfig call.

### Pitfall 3: oklch color strings in RainbowKit theme
**What goes wrong:** Passing `accentColor: 'oklch(0.6 0.08 70)'` to `lightTheme()` causes RainbowKit's alpha-compositor to fail — it performs string operations expecting `#rrggbb` hex format.
**Why it happens:** RainbowKit's `lightTheme` manipulates `accentColor` to derive hover/focus states via string operations. OKLCH is not a format it understands.
**How to avoid:** Always pass `accentColor: '#a87c3a'` (HEX approximation, verified in UI-SPEC). Use `var(--token)` ONLY for modal surface colors that RainbowKit renders verbatim (not compositor inputs). See UI-SPEC §RainbowKit Theme.

### Pitfall 4: Instrument routes placed under `(apps)` instead of `(defi)`
**What goes wrong:** `useAccount()`, `useChainId()`, `useSwitchChain()` throw `"useAccount must be used within WagmiProvider"` at runtime.
**Why it happens:** The `WagmiProvider` is only in `app/(defi)/layout.tsx`. Any page outside `(defi)` doesn't get the provider context.
**How to avoid:** All instrument pages MUST live at `app/(defi)/apps/abrigo/instruments/`. The public URL `/apps/abrigo/instruments/` is identical — route groups are URL-transparent. The architecture test at `tests/architecture/no-wallet-in-lab.test.ts` does NOT catch this (it only checks `(lab)` and `(apps)` — the `(defi)` placement is the intended one).

### Pitfall 5: visx 3.12 + React 19 peer dep warning in pnpm 10
**What goes wrong:** pnpm 10 with `autoInstallPeers: true` installs visx 3.12 but emits a peer dep warning. This doesn't block the build but adds noise. More importantly, if strict-peer-dependencies is enabled later or in CI with stricter settings, it breaks.
**Why it happens:** visx 3.12 peerDependencies declare `react: '^16.3.0-0 || ^17.0.0-0 || ^18.0.0-0'` — React 19 is excluded. (visx 4.0.0-alpha.11 adds React 19 support but is alpha.)
**How to avoid:** Use recharts 3.8.1 which explicitly declares `react: '^16.8.0 || ^17.0.0 || ^18.0.0 || ^19.0.0'`. No peer dep friction at all.

### Pitfall 6: `ConnectButton.Custom` overuse
**What goes wrong:** Building a fully custom `ConnectButton.Custom` renderer discards RainbowKit's built-in a11y (keyboard focus, ARIA attributes on the button), forcing manual re-implementation.
**Why it happens:** Developers assume label customization requires `ConnectButton.Custom`.
**How to avoid:** Use `<ConnectButton label="Conectar billetera" />`. The `label` prop is confirmed in `node_modules/@rainbow-me/rainbowkit/dist/components/ConnectButton/ConnectButton.d.ts` (`label?: string`). Reserve `ConnectButton.Custom` only if the button must be embedded in a layout that truly requires DOM reconstruction.

### Pitfall 7: SVG `<text>` with Tailwind `text-*` classes
**What goes wrong:** `<text className="text-muted">` has no visual effect on SVG text fill. The text renders in the default black color.
**Why it happens:** Tailwind's `text-*` utilities set CSS `color` property; SVG `<text>` uses `fill`, not `color`.
**How to avoid:** Use `fill="var(--text-muted)"` directly on SVG `<text>` nodes. For recharts tick labels, use the `tick={{ fill: 'var(--text-muted)' }}` prop on `<XAxis>` / `<YAxis>`.

### Pitfall 8: `WalletStatusPill` polluting `IterationStatus`
**What goes wrong:** Adding wallet state variants to `StatusPill` or extending `IterationStatus` breaks LAB-05's equal-visual-weight invariant. The pill CI tests fail.
**Why it happens:** StatusPill is the shared design-system component that encodes `PASS/FAIL/PARKED/IN_PROGRESS`.
**How to avoid:** Create `WalletStatusPill` as a separate component with its own `WalletStatus` type union. It shares the same visual shell classes (`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-normal ring-1 ring-inset`) but defines its own icon map and type. Never import `IterationStatus` from `WalletStatusPill`.

### Pitfall 9: PayoffDiagram rendered with fabricated/placeholder data
**What goes wrong:** The public instruments index shows a `PayoffDiagram` with hardcoded `strike=1000, slope=0.5` example params — this is the fabricated-data anti-pattern caught by anti-fishing discipline.
**Why it happens:** Desire to have a visually complete page while the registry is empty.
**How to avoid:** `PayoffDiagram` is only rendered when `instrument !== null`. The instruments index renders an honest empty state. The payoff function is unit-tested with fixture data in `tests/unit/payoff-math.test.ts`, not on the public page.

---

## Code Examples

### RainbowKit Provider Tree (final form)

```typescript
// lib/wagmi/Providers.tsx — 'use client' (already exists, add theme)
'use client'
import '@rainbow-me/rainbowkit/styles.css'
import { RainbowKitProvider, lightTheme } from '@rainbow-me/rainbowkit'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import type { ReactNode } from 'react'
import { WagmiProvider } from 'wagmi'
import { wagmiConfig } from './config'

// Source: node_modules/@rainbow-me/rainbowkit/dist/themes/lightTheme.d.ts
const rbkTheme = lightTheme({
  accentColor: '#a87c3a',
  accentColorForeground: '#f8f5f0',
  borderRadius: 'medium',
  fontStack: 'system',
  overlayBlur: 'none',
})

export function WagmiProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } },
  }))
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={rbkTheme} locale="es">
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
```

```typescript
// app/(defi)/providers.tsx — replaces placeholder
'use client'
export { WagmiProviders as DefiProviders } from '@/lib/wagmi/Providers'
```

### getDefaultConfig migration

```typescript
// lib/wagmi/config.ts — migrate from createConfig to getDefaultConfig
import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { env } from '@/lib/env'
import { arbitrum, base, celo, mainnet, optimism } from 'viem/chains'
import { http, fallback } from 'wagmi'

// Source: node_modules/@rainbow-me/rainbowkit/dist/config/getDefaultConfig.d.ts
export const wagmiConfig = getDefaultConfig({
  appName: 'd2p Finance',
  projectId: env.NEXT_PUBLIC_WALLETCONNECT_ID,
  chains: [celo, mainnet, base, arbitrum, optimism],
  ssr: false,
  transports: {
    [celo.id]: fallback([http(env.NEXT_PUBLIC_RPC_CELO_PRIMARY), http('https://forno.celo.org')]),
    [mainnet.id]: fallback([http(env.NEXT_PUBLIC_RPC_ETH_PRIMARY), http('https://ethereum.publicnode.com')]),
    [base.id]: fallback([http(env.NEXT_PUBLIC_RPC_BASE_PRIMARY), http('https://mainnet.base.org')]),
    [arbitrum.id]: fallback([http(env.NEXT_PUBLIC_RPC_ARB_PRIMARY), http('https://arb1.arbitrum.io/rpc')]),
    [optimism.id]: fallback([http(env.NEXT_PUBLIC_RPC_OP_PRIMARY), http('https://mainnet.optimism.io')]),
  },
})

export type WagmiConfig = typeof wagmiConfig
```

### CFMM Payoff Math (pure function)

```typescript
// lib/apps/abrigo/payoff.ts
// Convex hedge payoff: slope * max(strike - price, 0)
// This is a put-style payoff — positive payoff when price falls below strike.
// "Convex" in the Abrigo context means positive gamma (∂²V/∂S² > 0),
// which this piecewise-linear function exhibits at the kink (strike).
export interface PayoffPoint { price: number; payoff: number }

export function generatePayoffData(
  strike: number,
  slope: number,
  points = 100,
): PayoffPoint[] {
  const lo = strike * 0.3
  const hi = strike * 1.7
  return Array.from({ length: points }, (_, i) => {
    const price = lo + (hi - lo) * (i / (points - 1))
    return { price, payoff: slope * Math.max(strike - price, 0) }
  })
}
```

### WalletPanel 4-State Machine

```typescript
// components/defi/WalletPanel.tsx — 'use client'
// Source: node_modules/wagmi/dist/types/hooks/useAccount.d.ts (status + chain verified)
// Source: node_modules/wagmi/dist/types/hooks/useSwitchChain.d.ts (switchChain verified)
import { useAccount, useSwitchChain } from 'wagmi'
import { celo } from 'viem/chains'
import { ConnectButton } from '@rainbow-me/rainbowkit'

export function WalletPanel() {
  const { status, chain } = useAccount()
  const { switchChain } = useSwitchChain()

  const walletState =
    status === 'connecting' || status === 'reconnecting' ? 'CONNECTING'
    : status === 'disconnected'                          ? 'DISCONNECTED'
    : chain === undefined                                ? 'CONNECTED_WRONG_CHAIN'
    : 'CONNECTED_READY'

  return (
    // aria-live="polite" is the WE-OWN piece for SR state change announcements
    <div aria-live="polite" aria-atomic="true">
      {walletState === 'DISCONNECTED' && (
        <ConnectButton label="Conectar billetera" />
      )}
      {walletState === 'CONNECTING' && (
        <span>Conectando…</span>
      )}
      {walletState === 'CONNECTED_WRONG_CHAIN' && (
        <button onClick={() => switchChain({ chainId: celo.id })}>
          Cambiar red
        </button>
      )}
      {walletState === 'CONNECTED_READY' && (
        <div>Posición actual — {chain.name}</div>
      )}
    </div>
  )
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| wagmi v1 `useAccount().status` with 3 states | wagmi v2 `useAccount()` returns `{ status, chain }` — `chain: undefined` for wrong-chain | wagmi v2 (2023) | 4-state machine derivation uses `chain === undefined` not a separate "chainId not in config" check |
| RainbowKit v1 requires `chains` prop on `<RainbowKitProvider>` | RainbowKit v2 reads chains from wagmi config — no `chains` prop | RainbowKit v2 (2024) | Confirmed: `RainbowKitProviderProps` has no `chains` prop (verified in installed types) |
| `getDefaultConfig` as optional convenience | `getDefaultConfig` is the recommended path for adding WalletConnect connectors | RainbowKit v2.x | Without `getDefaultConfig`, `createConfig` needs manual WalletConnect connector wiring |
| recharts v2 (~1.7MB unpacked, no tree-shaking) | recharts v3 (tree-shakeable, explicit React 19 support, removes `recharts-scale`) | recharts 3.0 (2024) | v3 is the correct target for this project |

**Deprecated/outdated:**
- `WagmiConfig` component: replaced by `WagmiProvider` in wagmi v2 — already correct in existing `lib/wagmi/Providers.tsx`.
- `chains` prop on `RainbowKitProvider`: not in v2 types, read from wagmiConfig automatically.
- `useSwitchNetwork` (wagmi v1): replaced by `useSwitchChain` in wagmi v2 — use `useSwitchChain`.

---

## Open Questions

1. **AbrigoInstrument `strike`/`slope` source of truth post-deploy**
   - What we know: The payoff diagram needs `strike` and `slope`. The current `AbrigoInstrument` type has neither. They must be added to the type.
   - What's unclear: Will strike/slope come from on-chain reads (ABI calls) or from the registry constant (hardcoded when registering)? The provisional ABI doesn't include `getStrike()` / `getSlope()` functions.
   - Recommendation: Add `strike: number` and `slope: number` to `AbrigoInstrument` as static registry fields (set when adding the entry) and update the provisional ABI stub to include these functions as comments. The planner should document this as a deploy-time data question. **ABI note:** `ABRIGO_ABI` is intentionally left WITHOUT `getStrike()`/`getSlope()` getters — strike/slope are static registry fields (provisional), not on-chain reads, until the real Foundry artifact lands.

2. **RainbowKit `locale="es"` vs no locale for es-CO users**
   - What we know: RainbowKit's `Locale` type supports `'es'` and `'es-419'` but NOT `'es-CO'`. Passing `locale="es"` localizes RainbowKit's internal modal copy.
   - What's unclear: Whether the RainbowKit `locale` prop should be dynamic (reading from next-intl) or static.
   - Recommendation: Pass `locale="es"` statically (hardcoded — the project's Spanish locale is always es-CO, which is covered by `'es'`). The `WalletPanel` component's own copy is authored in es-CO regardless.

3. **`pnpm.peerDependencyRules` needed if visx is chosen later**
   - If a future phase needs visx (e.g., DASH-05 econometric charts), add to `package.json`:
   ```json
   "pnpm": {
     "peerDependencyRules": {
       "allowedVersions": { "@visx/shape>react": "19", "@visx/scale>react": "19" }
     }
   }
   ```
   - This is not needed for Phase 5 since recharts is the recommendation.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.6 (unit) + Playwright 1.60.0 (e2e/a11y) |
| Config file | `vitest.config.ts` + `playwright.config.ts` (both exist) |
| Quick run command | `pnpm vitest run tests/unit/payoff-math.test.ts tests/unit/wallet-state-machine.test.ts` |
| Full suite command | `pnpm vitest run && pnpm playwright test --project=chromium --project=axe` |
| e2e target | Local prod build: `pnpm build && pnpm start -p 3040` (per ci_e2e_architecture.md) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File |
|--------|----------|-----------|-------------------|------|
| DEFI-01 | RainbowKit provider tree activates + ConnectButton renders | e2e smoke | `pnpm playwright test tests/e2e/instruments-index.spec.ts` | Wave 0 gap |
| DEFI-02 | 4-state machine derivation logic (status + chain → state) | unit | `pnpm vitest run tests/unit/wallet-state-machine.test.ts` | Wave 0 gap |
| DEFI-02 | WalletPanel DISCONNECTED state renders ConnectButton | e2e | `pnpm playwright test tests/e2e/wallet-panel-a11y.spec.ts` | Wave 0 gap |
| DEFI-03 | Instruments index renders "none deployed yet" (no fabricated data) | e2e | `pnpm playwright test tests/e2e/instruments-index.spec.ts` | Wave 0 gap |
| DEFI-03 | Instrument detail page renders (test fixture, not live contract) | unit (render) | `pnpm vitest run tests/unit/instruments-index.test.ts` | Wave 0 gap |
| DEFI-04 | `generatePayoffData(strike, slope)` pure function: shape, edge cases | unit | `pnpm vitest run tests/unit/payoff-math.test.ts` | Wave 0 gap |
| DEFI-04 | PayoffDiagram renders with fixture data (no fabricated public page) | unit (render) | `pnpm vitest run tests/unit/payoff-math.test.ts` | Wave 0 gap |
| DEFI-05 | Risk disclosure above fold at 360px viewport (scrollY===0) | e2e | `pnpm playwright test tests/e2e/instruments-index.spec.ts --grep risk` | Wave 0 gap |
| DEFI-06 | axe on instruments index + risk callout | a11y | `pnpm playwright test tests/a11y/defi-instruments.spec.ts --project=axe` | Wave 0 gap |
| DEFI-06 | RainbowKit modal keyboard nav + focus-return-on-close | e2e (manual + Evidence Collector) | Live verification only (WAIVER) | — |
| DEFI-07 | `chain === undefined` → CONNECTED_WRONG_CHAIN (unit) | unit | `pnpm vitest run tests/unit/wallet-state-machine.test.ts` | Wave 0 gap |

### Tracked Waivers (Test Boundary)

| Waiver | What cannot be automated | Condition |
|--------|--------------------------|-----------|
| WAIVER-05-01 | RainbowKit modal appearance (theme) — requires Evidence Collector screenshot of open modal | Post-task-01 Evidence Collector run |
| WAIVER-05-02 | WalletConnect mobile deeplink fires (MetaMask Mobile, Valora) — requires real projectId | Real Reown projectId provisioned |
| WAIVER-05-03 | Solana "UNSUPPORTED_CHAIN" state — unreachable via EVM connectors | Deferred |
| WAIVER-05-04 | DEFI-03/04 per-instrument page with real data — unexercisable pre-deploy | Real contract deployed |
| WAIVER-05-05 | recharts bundle isolation to `(defi)` chunk — verify via Next 16's built-in `.next/diagnostics/route-bundle-stats.json` after `pnpm build` (NOT `--analyze` / `@next/bundle-analyzer` — neither is installed nor a real Next 16 flag) | Executor inspects route-bundle-stats after build |
| WAIVER-05-06 | Per-address "recent participants" event FEED (DEFI-03) — the aggregator exposes `lpPositionCount` (a COUNT, honest), not per-address events; no event indexer this phase | A participant event indexer ships |

### Sampling Rate

- **Per task commit:** `pnpm vitest run tests/unit/` (< 30s)
- **Per wave merge:** `pnpm vitest run && pnpm playwright test --project=chromium tests/e2e/instruments-index.spec.ts tests/e2e/wallet-panel-a11y.spec.ts`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/unit/payoff-math.test.ts` — covers DEFI-04: `generatePayoffData` shape (100 points), edge cases (strike=0, slope=0, price above strike → 0 payoff), Intl.NumberFormat locale formatting
- [ ] `tests/unit/wallet-state-machine.test.ts` — covers DEFI-02/07: 4-state derivation from `{status, chain}` combinations; `chain===undefined` for wrong-chain; no 5th state for non-EVM
- [ ] `tests/unit/instruments-index.test.ts` — covers DEFI-03: empty `ABRIGO_INSTRUMENTS` → no fabricated cards; instrument filter by `{id}/{chain}` returns correct `InstrumentState | null`
- [ ] `tests/e2e/instruments-index.spec.ts` — covers DEFI-03/05: honest empty page renders h1 + empty state; risk disclosure present (scrollY===0 at 360px)
- [ ] `tests/e2e/wallet-panel-a11y.spec.ts` — covers DEFI-02/06: ConnectButton present in DISCONNECTED state; `aria-live` region present; axe on wallet panel
- [ ] `tests/a11y/defi-instruments.spec.ts` — covers DEFI-06: axe on `/apps/abrigo/instruments` (instruments index + risk callout)

---

## Sources

### Primary (HIGH confidence — verified against installed node_modules)

- `node_modules/@rainbow-me/rainbowkit/dist/config/getDefaultConfig.d.ts` — `getDefaultConfig` type signature, `projectId` + `ssr` + `transports` params
- `node_modules/@rainbow-me/rainbowkit/dist/themes/lightTheme.d.ts` — `lightTheme()` parameter types, all `colors.*` properties
- `node_modules/@rainbow-me/rainbowkit/dist/components/RainbowKitProvider/RainbowKitProvider.d.ts` — `RainbowKitProviderProps` (no `chains` prop, confirms v2 behavior)
- `node_modules/@rainbow-me/rainbowkit/dist/components/ConnectButton/ConnectButton.d.ts` — `label?: string` prop confirmed
- `node_modules/@rainbow-me/rainbowkit/dist/locales/index.d.ts` — `Locale` type: `'es'` and `'es-419'` supported, `'es-CO'` is NOT
- `node_modules/@rainbow-me/rainbowkit/package.json` — version 2.2.11, deps: `@vanilla-extract/css`, `react-remove-scroll` (NOT radix-ui)
- `node_modules/wagmi/dist/types/hooks/useAccount.d.ts` — `status`, `chain` return type confirmed
- `node_modules/wagmi/dist/types/hooks/useSwitchChain.d.ts` — `switchChain`, `chains` return type confirmed
- `lib/wagmi/config.ts` — existing wagmiConfig (createConfig, 5 chains, ssr:false, fallback transports)
- `lib/wagmi/Providers.tsx` — existing WagmiProvider > QueryClientProvider > RainbowKitProvider tree (90% done)
- `lib/wagmi/Providers.tsx` — `app/(defi)/providers.tsx` — Phase-1 placeholder, single-line swap needed
- `lib/dashboard/aggregator.ts` — `aggregateAllChains()`, `ChainAggregationResult`, `InstrumentState`
- `lib/apps/abrigo/instruments.ts` — `ABRIGO_INSTRUMENTS: []`, `AbrigoInstrument` type (strike/slope MISSING)
- `tests/architecture/no-wallet-in-lab.test.ts` — enforces FOUND-11 wallet isolation
- `pnpm-lock.yaml` — `autoInstallPeers: true`, `lockfileVersion: 9.0`

### Secondary (MEDIUM confidence — npm registry + WebFetch verified)

- `npm view recharts version` → 3.8.1 (live 2026-05-30); `peerDependencies` → explicit React 19 support
- `npm view @visx/shape peerDependencies` → `react: '^16.3.0-0 || ^17.0.0-0 || ^18.0.0-0'` (React 19 excluded)
- `npm view @visx/shape@4.0.0-alpha.11 peerDependencies` → React 19 supported but ALPHA
- `rainbowkit.com/docs/installation` — provider tree order confirmed: WagmiProvider > QueryClientProvider > RainbowKitProvider

### Tertiary (LOW confidence — WebSearch, flag for validation)

- visx GitHub issue #1883 (React 19 support) — closed with PR #1968, but visx 3.12 still excludes React 19 in peerDeps; visx 4.x alpha is the resolution
- pnpm 10 peer dep behavior with `autoInstallPeers: true` — installs with warning, not hard error (inferred from pnpm docs + pnpm-lock.yaml settings; not empirically tested)

---

## Metadata

**Confidence breakdown:**
- Standard stack (RainbowKit, wagmi hooks): HIGH — verified against installed node_modules types
- Provider tree pattern: HIGH — existing `lib/wagmi/Providers.tsx` already has the correct structure
- `getDefaultConfig` migration path: HIGH — type signature verified
- Chart library recommendation (recharts): HIGH for install feasibility; MEDIUM for bundle isolation claim (verify via Next 16's built-in `.next/diagnostics/route-bundle-stats.json` after `pnpm build` as WAIVER-05-05 — `--analyze`/`@next/bundle-analyzer` are NOT available)
- CFMM payoff math: MEDIUM — `slope * max(strike - price, 0)` is a standard put payoff approximation; the actual Abrigo contract math should be confirmed when the ABI is finalized
- Architecture (route placement): HIGH — BLOCKER-2 fix from UI-SPEC review, verified against route group mechanics
- a11y (DEFI-06): MEDIUM — RainbowKit a11y claimed via library, live-verified by Evidence Collector (not statically asserted)

**Research date:** 2026-05-30
**Valid until:** 2026-06-14 (recharts/wagmi/RainbowKit are stable; visx situation may change if v4 goes stable)
