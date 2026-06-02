'use client'

// WalletPanel — 4-state client wallet panel (DEFI-02/06/07).
// Derives state via deriveWalletState (lib/wallet/state.ts — NOT re-implemented here).
// Wrapped in aria-live="polite" for SR announcements (DEFI-06).
// Accepts translated wallet.* strings as props (keeps it client-simple; caller is RSC page).
// CROSS-09: DISCONNECTED prompt uses text-accent-text (WCAG AA small text).
// DEFI-07: CONNECTED_WRONG_CHAIN → switch CTA via useSwitchChain (celo.id = 42220 primary).
// WAIVER-05-03: Non-EVM (Solana) unreachable via EVM connectors — no 5th state built.
//
// Wave 2: readOnly prop added.
// When readOnly=true, walletState is forced to 'READ_ONLY' WITHOUT calling deriveWalletState.
// READ_ONLY renders: WalletStatusPill + readOnlyLabel text. No ConnectButton, no switch CTA.
// CONNECTED_READY is unreachable in readOnly mode.

import { WalletStatusPill } from '@/components/defi/WalletStatusPill'
import type { WalletStatus } from '@/components/defi/WalletStatusPill'
import { deriveWalletState } from '@/lib/wallet/state'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react'
import { celo } from 'viem/chains'
import { useAccount, useSwitchChain } from 'wagmi'

export interface WalletPanelStrings {
  /** DISCONNECTED: "Conecta tu billetera para ver tu posición" */
  disconnectedPrompt: string
  /** DISCONNECTED ConnectButton label: "Conectar billetera" */
  connectLabel: string
  /** CONNECTING: "Conectando…" */
  connectingLabel: string
  /** CONNECTED_WRONG_CHAIN main text: "Cambia a una red compatible" */
  wrongChainLabel: string
  /** CONNECTED_WRONG_CHAIN explanatory text: "Estás en {chain}. Abrigo opera en…".
   *  Raw template with a literal {chain} placeholder — interpolated client-side here.
   *  MUST be a plain string, NOT a function: functions can't cross the RSC→Client boundary. */
  wrongChainExplanation: string
  /** CONNECTED_WRONG_CHAIN CTA: "Cambiar red" */
  switchNetworkLabel: string
  /** CONNECTED_READY header: "Posición actual" */
  connectedReadyLabel: string
  /** READ_ONLY copy: "sin transacción — fork simulado" */
  readOnlyLabel: string
  /** WalletStatusPill status label overrides (locale-aware) */
  statusLabels: Record<WalletStatus, string>
}

interface WalletPanelProps {
  strings: WalletPanelStrings
  /** When true, wallet state is forced to READ_ONLY (no connect/switch affordance).
   *  Used on simulated-instrument pages (fork-only, no deployed contract). */
  readOnly?: boolean
}

export function WalletPanel({ strings, readOnly }: WalletPanelProps) {
  const { status, chain } = useAccount()
  const { switchChain } = useSwitchChain()

  // readOnly short-circuits deriveWalletState — READ_ONLY is injected here, never derived.
  const walletState = readOnly ? ('READ_ONLY' as const) : deriveWalletState({ status, chain })

  return (
    // aria-live="polite" + aria-atomic="true" — the WE-OWN SR announcement boundary.
    // RainbowKit owns its own focus trap (react-remove-scroll); do NOT add a second one.
    <div aria-live="polite" aria-atomic="true" className="space-y-3">
      {/* Status pill — always shown */}
      <WalletStatusPill status={walletState} label={strings.statusLabels[walletState]} />

      {walletState === 'READ_ONLY' && (
        <p className="text-sm text-text-muted">{strings.readOnlyLabel}</p>
      )}

      {walletState === 'DISCONNECTED' && (
        <div className="space-y-3">
          <p className="text-sm text-accent-text">{strings.disconnectedPrompt}</p>
          {/* ConnectButton label prop — no ConnectButton.Custom needed (verified in RainbowKit d.ts) */}
          <ConnectButton label={strings.connectLabel} />
        </div>
      )}

      {walletState === 'CONNECTING' && (
        <div className="flex items-center gap-2 text-sm text-status-in-progress">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          <span>{strings.connectingLabel}</span>
        </div>
      )}

      {walletState === 'CONNECTED_WRONG_CHAIN' && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-text-primary">
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{strings.wrongChainLabel}</span>
          </div>
          {chain && (
            <p className="text-sm text-text-secondary">
              {strings.wrongChainExplanation.replace('{chain}', chain.name)}
            </p>
          )}
          {/* Switch CTA — bg-status-parked text-bg-canvas (~7:1 contrast) per locked tokens */}
          <button
            type="button"
            onClick={() => switchChain({ chainId: celo.id })}
            className="rounded-[var(--radius)] bg-status-parked px-3 py-1.5 text-sm font-medium text-bg-canvas transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-default"
          >
            {strings.switchNetworkLabel}
          </button>
        </div>
      )}

      {walletState === 'CONNECTED_READY' && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-text-primary">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-status-pass" aria-hidden="true" />
            <span>{strings.connectedReadyLabel}</span>
          </div>
          {chain && <p className="text-xs text-text-secondary">{chain.name}</p>}
        </div>
      )}
    </div>
  )
}
