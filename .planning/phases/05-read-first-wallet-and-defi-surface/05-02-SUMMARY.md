---
phase: 05-read-first-wallet-and-defi-surface
plan: "02"
subsystem: defi
tags: [wagmi, rainbowkit, walletconnect, getDefaultConfig, theme, providers, wallet]

# Dependency graph
requires:
  - phase: 05-01
    provides: "(defi) route group layout, wagmi createConfig base, Wave 0 test harness"
  - phase: 01-05
    provides: "wagmi v2 config shell with 5 chains + Providers shell"
provides:
  - "getDefaultConfig-based wagmiConfig with WalletConnect/injected/coinbaseWallet/safe connectors"
  - "HEX-themed RainbowKitProvider (accentColor #a87c3a, accentColorForeground #f8f5f0, locale='es')"
  - "Live (defi) provider tree via DefiProviders re-export"
  - "Modal CSS var overrides scoped to [data-rk]"
  - "Live-verified RainbowKit modal screenshot (WAIVER-05-01 cleared)"
affects:
  - "05-03 (instruments index needs DefiProviders tree live)"
  - "05-04 (per-instrument detail, WalletPanel, useAccount/useSwitchChain all require this provider tree)"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "getDefaultConfig replaces createConfig for wagmi v2 + RainbowKit: single call registers WalletConnect+injected+coinbaseWallet+safe connectors; appName + projectId required"
    - "RainbowKit accentColor MUST be HEX, not oklch — the vanilla-extract compositor does not resolve CSS color functions at theme-injection time"
    - "ssr: false kept, no cookieToInitialState — wallet state is client-only to avoid hydration mismatch"
    - "RainbowKit locale 'es' (not 'es-CO') — RainbowKit has no es-CO locale; d2p copy remains es-CO in our own namespaces"
    - "(defi)/providers.tsx as one-line re-export: `export { WagmiProviders as DefiProviders }` keeps layout.tsx import unchanged"

key-files:
  created: []
  modified:
    - lib/wagmi/config.ts
    - lib/wagmi/Providers.tsx
    - app/(defi)/providers.tsx
    - app/globals.css

key-decisions:
  - "HEX not oklch for RainbowKit accentColor (#a87c3a): RainbowKit's vanilla-extract compositor requires a resolved color value at theme-injection time; oklch breaks it (verified in 05-RESEARCH)"
  - "ssr: false retained, no cookieToInitialState/WagmiProvider initialState: wallet state is client-only by design, avoids hydration-mismatch pitfall (Pitfall 2 in RESEARCH)"
  - "Default getDefaultConfig connector set kept (injected + walletConnect + coinbaseWallet + safe): all four connectors included; no trimming; covers MetaMask Mobile, Valora, Coinbase Wallet, safe multisig"
  - "WAIVER-05-02 accepted: dev placeholder WalletConnect projectId produces benign 403/400 console noise from api.web3modal.org and pulse.walletconnect.org; real Reown projectId is a manual user-setup follow-up (NEXT_PUBLIC_WALLETCONNECT_ID)"

patterns-established:
  - "Pattern 1: RainbowKit HEX theme — import lightTheme from @rainbow-me/rainbowkit; pass accentColor as HEX string; oklch/oklch tokens from CSS layer cannot be used here"
  - "Pattern 2: (defi) provider tree swap — replace passthrough providers.tsx with single re-export line; layout.tsx import name (DefiProviders) stays stable"
  - "Pattern 3: Scratch route lifecycle — temporary pages created for Evidence Collector verification must be committed (feat/chore) then explicitly deleted (fix) in a follow-up commit before plan close"

requirements-completed: [DEFI-01]

# Metrics
duration: ~35min
completed: "2026-05-30"
---

# Phase 05 Plan 02: Provider Activation — RainbowKit + getDefaultConfig Summary

**wagmi getDefaultConfig migration wiring WalletConnect connectors + HEX-ochre RainbowKit theme into the live (defi) provider tree, Evidence-Collector modal PASS (4/4 claims)**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-05-30
- **Completed:** 2026-05-30
- **Tasks:** 2 (1 auto, 1 checkpoint:human-verify — Evidence Collector)
- **Files modified:** 4

## Accomplishments

- Migrated `lib/wagmi/config.ts` from `createConfig` to `getDefaultConfig`, adding WalletConnect/injected/coinbaseWallet/safe connectors while preserving the 5-chain fallback transports and `ssr: false`
- Themed `lib/wagmi/Providers.tsx` with HEX lightTheme (accentColor `#a87c3a`, accentColorForeground `#f8f5f0`, locale `'es'`) and added `[data-rk]` CSS var overrides in `app/globals.css`
- Replaced the Phase-1 passthrough `app/(defi)/providers.tsx` with a one-line re-export that wires the full WagmiProvider/QueryClientProvider/RainbowKitProvider tree under `DefiProviders`, leaving `app/(defi)/layout.tsx` untouched
- Evidence-Collector live-verified all 4 plan claims (modal open, role=dialog, accent rgb(168,124,58) = #a87c3a exact, es-CO copy, no fatal errors): WAIVER-05-01 cleared
- Temporary `_modal-check` scratch route created for the Evidence Collector, then deleted — no scratch routes remain in the tree

## Task Commits

Each task was committed atomically:

1. **Task 1: Migrate wagmiConfig + theme RainbowKit + swap (defi)/providers.tsx** — `b97ae7b` (feat)
   - Intermediate: `f6a1419` (chore — temporary `_modal-check` page for Evidence Collector)
2. **Task 2: Evidence-Collector live verify (checkpoint:human-verify)** — `c82c653` (fix — scratch route deleted post-verify)

**Plan metadata:** *(this docs commit — see final commit hash below)*

## Files Created/Modified

- `lib/wagmi/config.ts` — `createConfig` replaced with `getDefaultConfig`; `appName: 'd2p Finance'`, `projectId: env.NEXT_PUBLIC_WALLETCONNECT_ID`; same 5 chains + fallback transports + `ssr: false`
- `lib/wagmi/Providers.tsx` — `lightTheme({ accentColor: '#a87c3a', accentColorForeground: '#f8f5f0', borderRadius: 'medium', fontStack: 'system', overlayBlur: 'none' })` applied; `locale="es"` on `RainbowKitProvider`; no `chains` prop (v2 reads from wagmiConfig)
- `app/(defi)/providers.tsx` — One-line re-export: `export { WagmiProviders as DefiProviders } from '@/lib/wagmi/Providers'`
- `app/globals.css` — `[data-rk]` block with `--rk-fonts-body`, `--rk-colors-modalBackground`, `--rk-colors-modalBorder`, `--rk-colors-modalText`, `--rk-colors-modalTextSecondary` mapped to project design tokens

## Live Verification

**Result: PASS (4/4 claims). Date: 2026-05-30.**

| Claim | Verdict | Evidence |
|-------|---------|----------|
| ConnectButton renders + ConnectButton text in es-CO | ✓ PASS | DOM snapshot: `button "Conectar billetera"` |
| Clicking ConnectButton opens modal → `role="dialog"` | ✓ PASS | Post-click snapshot: `dialog "Conectar una billetera"` with wallet options |
| Modal accent = locked ochre `#a87c3a` (rgb 168,124,58), NOT default-blue | ✓ PASS | `browser_evaluate`: `--rk-colors-accentColor` = `#a87c3a` → `rgb(168, 124, 58)`; "Obtener una billetera" CTA background confirmed ochre |
| No runtime console errors of note | ✓ PASS | Only WalletConnect placeholder-projectId 403/400 (WAIVER-05-02, benign); no hydration mismatch, no fatal errors |

Screenshot: `/tmp/d2p-verify/05-02-rainbowkit-modal.png`

**WAIVER-05-01 (RainbowKit modal visual fidelity / screenshot required): CLEARED** — screenshot captured, modal opens, accent is locked ochre.

**WAIVER-05-02 (dev placeholder WalletConnect projectId): OPEN / acknowledged** — `api.web3modal.org` 403 + `pulse.walletconnect.org` 400 are benign; expected until a real Reown projectId is provisioned via `NEXT_PUBLIC_WALLETCONNECT_ID`. Not a blocker.

## Decisions Made

1. **HEX not oklch for accentColor** — RainbowKit's vanilla-extract compositor requires a resolved color value at theme-injection time; CSS color functions (oklch) are not resolved and break the compositor. `#a87c3a` is the exact oklch-space equivalent of `oklch(0.6 0.08 70)` serialized to HEX.

2. **ssr: false retained, no cookieToInitialState** — Wallet state is client-only by design. Adding `cookieToInitialState`/SSR-cookie hydration would risk hydration mismatches (Pitfall 2 documented in 05-RESEARCH.md). This is an explicit architectural choice, not an omission.

3. **All four default connectors kept** — `getDefaultConfig` registers injected, walletConnect, coinbaseWallet, and safe. No connectors were trimmed. This covers MetaMask/browser-injected, WalletConnect mobile deeplinks, Coinbase Wallet, and Gnosis Safe multisig — appropriate for the Celo/EVM target audience.

4. **WAIVER-05-02 accepted as noted** — The placeholder projectId (`placeholder_walletconnect_id_for_dev`) produces only informational 403/400 noise from WalletConnect telemetry endpoints. The modal opens and functions correctly for the verification scope of this plan. Real Reown projectId is a manual user-setup item documented in the plan's `user_setup` frontmatter.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Temporary scratch route committed then explicitly deleted**
- **Found during:** Task 2 (Evidence-Collector checkpoint)
- **Issue:** The per-instrument ConnectButton host does not exist until 05-04. The plan called for a throwaway `app/(defi)/_modal-check/page.tsx` if needed. The Evidence Collector required a live ConnectButton to drive the modal.
- **Fix:** Created `app/(defi)/_modal-check/page.tsx` in commit `f6a1419` (chore), verified the modal, then deleted the file in commit `c82c653` (fix). No scratch routes remain in the production tree.
- **Files modified:** `app/(defi)/_modal-check/page.tsx` (created, then deleted)
- **Verification:** `c82c653` removes the file; `git status` on HEAD shows clean tree in that directory.
- **Committed in:** `f6a1419` (create) + `c82c653` (delete)

---

**Total deviations:** 1 auto-handled (scratch route lifecycle per plan instructions)
**Impact on plan:** Entirely expected — the plan itself described this exact pattern. No scope creep.

## Issues Encountered

None beyond the WAIVER-05-02 placeholder-projectId noise, which was anticipated and documented.

## User Setup Required

**External service requires manual configuration:**
- **Service:** WalletConnect / Reown Cloud
- **Env var:** `NEXT_PUBLIC_WALLETCONNECT_ID`
- **Source:** Reown/WalletConnect Cloud dashboard → Projects → Project ID
- **Why:** WalletConnect v2 mobile deeplinks (MetaMask Mobile, Rainbow, Valora/Celo) require a real Reown projectId; the current value is a dev placeholder.
- **Impact until resolved:** Benign 403/400 console noise only; modal opens and all read-only wallet connection flows work in desktop/injected-wallet scenarios.

## Next Phase Readiness

- `DefiProviders` is live and providing the full WagmiProvider/QueryClientProvider/RainbowKitProvider tree to all `(defi)` routes — 05-03 and 05-04 can use `useAccount`, `useSwitchChain`, and the ConnectButton without any additional provider wiring.
- Architecture isolation tests (defi-bundle-isolation + no-wallet-in-lab) remain green — wallet state cannot leak into `(lab)` or `(apps)` route groups.
- WAIVER-05-02 (real projectId) is the only open item; it is non-blocking for all remaining Phase 5 plans.

---
*Phase: 05-read-first-wallet-and-defi-surface*
*Completed: 2026-05-30*
