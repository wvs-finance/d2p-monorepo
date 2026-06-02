'use client'

// DEV/E2E-ONLY DEFI-06 audit surface — guarded from production.
// Note: folder is a11y-wallet-check (no _ prefix) — Next.js treats _folders as private/non-routed.
// Provides an isolated WagmiProvider wired with the mock connector so e2e tests
// can drive a real DISCONNECTED→CONNECTING→CONNECTED transition.
//
// IMPORTANT: The wagmi mock() connector is NOT surfaced in the RainbowKit modal.
// RainbowKit builds its visible wallet list from its own wallet registry (connectorsForWallets),
// not from raw wagmi connectors passed to createConfig. The TEST-ONLY connect button below
// (calling useConnect directly) is the deterministic path for the connect-SUCCESS e2e assertion.
// The RainbowKit modal is exercised only for open/close/focus-return tests (which work fine).

import '@rainbow-me/rainbowkit/styles.css'

import { WalletPanel, type WalletPanelStrings } from '@/components/defi/WalletPanel'
import { mockConnector } from '@/lib/wallet/mock-connector'
import { RainbowKitProvider, lightTheme } from '@rainbow-me/rainbowkit'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { celo } from 'viem/chains'
import { http, WagmiProvider, createConfig, useConnect } from 'wagmi'

// Minimal audit config: Celo only, mock connector, no WalletConnect (not needed here).
// This provider tree is nested inside the layout's real DefiProviders; the inner
// WagmiProvider context takes precedence for components rendered inside it.
const auditConfig = createConfig({
  chains: [celo],
  connectors: [mockConnector],
  transports: {
    [celo.id]: http('https://forno.celo.org'),
  },
  ssr: false,
})

// es-CO strings — audit-only surface, exempt from copy-review (transient, not user-facing).
const AUDIT_STRINGS: WalletPanelStrings = {
  disconnectedPrompt: 'Conecta tu billetera para ver tu posición',
  connectLabel: 'Conectar billetera',
  connectingLabel: 'Conectando…',
  wrongChainLabel: 'Cambia a una red compatible',
  wrongChainExplanation: 'Estás en {chain}. Abrigo opera en Celo.',
  switchNetworkLabel: 'Cambiar red',
  connectedReadyLabel: 'Posición actual',
  readOnlyLabel: 'sin transacción — fork simulado',
  statusLabels: {
    DISCONNECTED: 'Desconectado',
    CONNECTING: 'Conectando',
    CONNECTED_WRONG_CHAIN: 'Red incorrecta',
    CONNECTED_READY: 'Conectado',
    READ_ONLY: 'Solo lectura',
  },
}

const rbkTheme = lightTheme({
  accentColor: '#a87c3a',
  accentColorForeground: '#f8f5f0',
  borderRadius: 'medium',
  fontStack: 'system',
  overlayBlur: 'none',
})

// TEST-ONLY connect control — sits OUTSIDE the RainbowKit modal.
// Calls wagmi useConnect directly with the mock connector so the connect-success
// focus assertion (focus → <output>) is deterministically drivable by e2e tests.
// The RainbowKit modal does NOT surface the wagmi mock() connector (it uses its
// own wallet registry) — this button is the correct connect path for tests.
// data-testid="test-connect-btn" makes it easy to target without fragile text matching.
function TestConnectButton() {
  const { connect } = useConnect()
  return (
    <button
      type="button"
      data-testid="test-connect-btn"
      onClick={() => connect({ connector: mockConnector })}
      className="rounded-[var(--radius)] border border-border-default bg-bg-surface px-3 py-1.5 text-xs text-text-secondary"
    >
      [TEST] Conectar con mock
    </button>
  )
}

export function AuditShell() {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <WagmiProvider config={auditConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={rbkTheme} locale="es">
          <main className="flex min-h-screen items-center justify-center p-8">
            <div className="w-full max-w-sm space-y-4">
              <h1 className="text-lg font-medium text-text-primary">
                DEFI-06 Audit — Wallet Connect Modal
              </h1>
              <p className="text-sm text-text-muted">
                Superficie de auditoría DEFI-06. Solo disponible en desarrollo y e2e.
              </p>
              {/* Non-readOnly WalletPanel: renders ConnectButton in DISCONNECTED state.
                  lang="es-CO" so the SR-only <output> status labels are pronounced correctly. */}
              <WalletPanel strings={AUDIT_STRINGS} lang="es-CO" />
              {/* TEST-ONLY: drives mock connect outside RainbowKit modal (see module comment above) */}
              <TestConnectButton />
            </div>
          </main>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
