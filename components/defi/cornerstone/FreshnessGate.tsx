'use client'

// FreshnessGate — Surface 6.
// Gate states for the confirm area (spec §4a).
// States: checking / live-CTA / mock-CTA / connect-wallet / switch-chain / rpc-unreachable
//
// ARIA: advisory copy in aria-live="polite" region so gate changes are announced.
// Disabled buttons: aria-disabled="true" + visible reason label.
// Switch-chain: calls onSwitchChain (wired to useSwitchChain in page).
//
// CROSS-09: every status pill has color+icon+text.

import { Loader2 } from 'lucide-react'

export type GateState =
  | 'checking'
  | 'live'
  | 'mock'
  | 'connect-wallet'
  | 'switch-chain'
  | 'rpc-unreachable'

export interface FreshnessGateStrings {
  checking: string
  liveCta: string
  mockCta: string
  connectWallet: string
  switchChain: string
  noWalletAdvisory: string
  switchChainAdvisory: string
}

interface FreshnessGateProps {
  gateState: GateState
  strings: FreshnessGateStrings
  onConfirmLive?: () => void
  onConfirmMock?: () => void
  onConnectWallet?: () => void
  onSwitchChain?: () => void
}

// ---------------------------------------------------------------------------
// Button styles
// ---------------------------------------------------------------------------

const BTN_LIVE =
  'inline-flex items-center justify-center gap-2 rounded px-6 py-3 text-base font-semibold text-bg-elevated bg-accent-default hover:bg-accent-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-default min-h-[44px]'

const BTN_SECONDARY =
  'inline-flex items-center justify-center gap-2 rounded border border-border-default px-6 py-3 text-base font-semibold text-text-primary bg-bg-surface hover:bg-bg-canvas transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-default min-h-[44px]'

const BTN_DISABLED =
  'inline-flex items-center justify-center gap-2 rounded border border-border-default px-6 py-3 text-base font-semibold text-text-muted bg-bg-surface cursor-not-allowed min-h-[44px]'

// ---------------------------------------------------------------------------
// FreshnessGate
// ---------------------------------------------------------------------------

export function FreshnessGate({
  gateState,
  strings,
  onConfirmLive,
  onConfirmMock,
  onConnectWallet,
  onSwitchChain,
}: FreshnessGateProps) {
  return (
    <fieldset className="space-y-3 border-0 p-0 m-0">
      {/* Advisory region — announced on gate state changes */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="text-sm text-text-muted min-h-[1.25rem]"
      >
        {gateState === 'connect-wallet' && <p>{strings.noWalletAdvisory}</p>}
        {gateState === 'switch-chain' && <p>{strings.switchChainAdvisory}</p>}
      </div>

      {/* Gate action button */}
      {gateState === 'checking' && (
        <button type="button" className={BTN_DISABLED} aria-disabled="true" disabled>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          <span>{strings.checking}</span>
        </button>
      )}

      {gateState === 'live' && (
        <button type="button" className={BTN_LIVE} onClick={onConfirmLive}>
          {strings.liveCta}
        </button>
      )}

      {(gateState === 'mock' || gateState === 'rpc-unreachable') && (
        <button type="button" className={BTN_SECONDARY} onClick={onConfirmMock}>
          {strings.mockCta}
        </button>
      )}

      {gateState === 'connect-wallet' && (
        <button type="button" className={BTN_SECONDARY} onClick={onConnectWallet}>
          {strings.connectWallet}
        </button>
      )}

      {gateState === 'switch-chain' && (
        <button type="button" className={BTN_SECONDARY} onClick={onSwitchChain}>
          {strings.switchChain}
        </button>
      )}
    </fieldset>
  )
}
