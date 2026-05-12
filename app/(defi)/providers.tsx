'use client'

// Phase 1 placeholder — Plan 05 replaces with full WagmiProvider/RainbowKitProvider tree.
// Keeping this as a separate client component preserves the server/client boundary
// and allows Plan 05 to swap it in without touching the layout file.
export function DefiProviders({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
