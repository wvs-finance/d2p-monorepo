'use client'

// Client Component: WagmiProvider + QueryClientProvider + RainbowKitProvider
// wrapper shell for the (defi) route group.
//
// Phase 5 wires this into app/(defi)/providers.tsx:
//   'use client'
//   export { WagmiProviders as DefiProviders } from '@/lib/wagmi/Providers'
//
// IMPORTANT: This file must NEVER be imported from app/(lab)/ — the architecture
// test at tests/architecture/no-wallet-in-lab.test.ts enforces this constraint.

import '@rainbow-me/rainbowkit/styles.css'

import { RainbowKitProvider } from '@rainbow-me/rainbowkit'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import type { ReactNode } from 'react'
import { WagmiProvider } from 'wagmi'
import { wagmiConfig } from './config'

export interface WagmiProvidersProps {
  children: ReactNode
}

export function WagmiProviders({ children }: WagmiProvidersProps) {
  // QueryClient created inside component via useState to prevent cross-request state
  // sharing on the server. staleTime: 30_000 matches Vercel KV TTL in ARCHITECTURE.md.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000, // 30s — aligns with Vercel KV chain-read TTL
            refetchOnWindowFocus: false,
          },
        },
      }),
  )

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
