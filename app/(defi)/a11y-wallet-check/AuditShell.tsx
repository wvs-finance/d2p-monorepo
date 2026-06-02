'use client'

// DEV/E2E-ONLY DEFI-06 audit surface — guarded from production.
// Note: folder is a11y-wallet-check (no _ prefix) — Next.js treats _folders as private/non-routed.
// Provides an isolated WagmiProvider wired with the mock connector so e2e tests
// can drive a real DISCONNECTED→CONNECTING→CONNECTED transition.

import '@rainbow-me/rainbowkit/styles.css'

import { WalletPanel, type WalletPanelStrings } from '@/components/defi/WalletPanel'
import { mockConnector } from '@/lib/wallet/mock-connector'
import { RainbowKitProvider, lightTheme } from '@rainbow-me/rainbowkit'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { celo } from 'viem/chains'
import { http, WagmiProvider, createConfig } from 'wagmi'

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
              {/* Non-readOnly WalletPanel: renders ConnectButton in DISCONNECTED state */}
              <WalletPanel strings={AUDIT_STRINGS} />
            </div>
          </main>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
