'use client'

// WalletPanel — 4-state client wallet panel (DEFI-02/06/07).
// Derives state via deriveWalletState (lib/wallet/state.ts — NOT re-implemented here).
// DEFI-06 (Wave 3): scoped SR announcement via dedicated role=status node (NOT panel-wide
// aria-atomic, which caused a double-read of the entire panel on every transition).
// Accepts translated wallet.* strings as props (keeps it client-simple; caller is RSC page).
// CROSS-09: DISCONNECTED prompt uses text-accent-text (WCAG AA small text).
// DEFI-07: CONNECTED_WRONG_CHAIN → switch CTA via useSwitchChain (celo.id = 42220 primary).
// WAIVER-05-03: Non-EVM (Solana) unreachable via EVM connectors — no 5th state built.
//
// Wave 2: readOnly prop added.
// When readOnly=true, walletState is forced to 'READ_ONLY' WITHOUT calling deriveWalletState.
// READ_ONLY renders: WalletStatusPill + readOnlyLabel text. No ConnectButton, no switch CTA.
// CONNECTED_READY is unreachable in readOnly mode.
//
// Wave 3 (DEFI-06): connect-success focus handling.
// When walletState leaves DISCONNECTED/CONNECTING (ConnectButton trigger unmounts), focus is
// explicitly moved to the role=status node so keyboard users are never stranded at <body>.
// RainbowKit owns the in-modal focus trap — do NOT add a second one here.

import { WalletStatusPill } from '@/components/defi/WalletStatusPill'
import type { WalletStatus } from '@/components/defi/WalletStatusPill'
import { deriveWalletState } from '@/lib/wallet/state'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react'
import { useEffect, useRef } from 'react'
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
  /** BCP-47 language tag for the panel's copy (e.g. "es-CO" or "en").
   *  Applied to the sr-only <output> node so screen readers pronounce
   *  the es-CO status labels with the correct voice (WCAG 3.1.2).
   *  Defaults to "es-CO" because all WalletPanel copy is es-CO-first. */
  lang?: string
}

export function WalletPanel({ strings, readOnly, lang = 'es-CO' }: WalletPanelProps) {
  const { status, chain } = useAccount()
  const { switchChain } = useSwitchChain()

  // readOnly short-circuits deriveWalletState — READ_ONLY is injected here, never derived.
  const walletState = readOnly ? ('READ_ONLY' as const) : deriveWalletState({ status, chain })

  // DEFI-06: ref to the scoped status node for connect-success focus handling.
  // Uses HTMLOutputElement — <output> has implicit role="status" + aria-live="polite".
  const statusNodeRef = useRef<HTMLOutputElement>(null)

  // DEFI-06 connect-success focus: when walletState leaves DISCONNECTED/CONNECTING the
  // ConnectButton trigger unmounts and focus would fall to <body>. Move it to the status
  // node instead. The in-modal trap is RainbowKit's own — do NOT add a second one.
  useEffect(() => {
    if (walletState !== 'DISCONNECTED' && walletState !== 'CONNECTING') {
      statusNodeRef.current?.focus()
    }
  }, [walletState])

  return (
    // Outer div is plain — no aria-live/aria-atomic (panel-wide re-read was a DEFI-06 BLOCKER).
    // SR announcements are scoped to the dedicated role=status node below.
    <div className="space-y-3">
      {/* DEFI-06: scoped announcement node — announces ONLY the state label, not the whole panel.
          <output> has implicit role="status" (HTML-AAM). role= omitted because Biome
          lint/a11y/noRedundantRoles + useSemanticElements correctly flag it as redundant —
          the <output> element already carries the semantic. Defense-in-depth is provided by
          the explicit aria-live="polite" attribute (not implicit on <output> in all AT stacks).
          lang prop applies the BCP-47 tag so SRs pronounce es-CO labels correctly (WCAG 3.1.2).
          tabIndex={-1} so focus can be programmatically moved here on connect-success. */}
      {/* DEFI-06 scoped announcement node — announces ONLY the state label, not the whole panel.
          <output> has implicit role="status" (HTML-AAM) — Biome's noRedundantRoles + useSemanticElements
          correctly block an explicit role="status" attr (redundant). Defense-in-depth is provided by
          the explicit aria-live="polite" attribute (not all AT stacks apply implicit live region to <output>).
          lang prop applies the BCP-47 tag so SRs pronounce es-CO labels correctly (WCAG 3.1.2).
          tabIndex={-1} so focus can be programmatically moved here on connect-success. */}
      <output ref={statusNodeRef} aria-live="polite" tabIndex={-1} lang={lang} className="sr-only">
        {strings.statusLabels[walletState]}
      </output>

      {/* Status pill — always shown (visible UI, outside the live region) */}
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
