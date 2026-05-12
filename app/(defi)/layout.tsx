import { DefiProviders } from './providers'

// DeFi route group layout — wraps a client Providers shell.
// The Providers shell is a passthrough in Phase 1.
// Plan 05 (Wave 3) replaces it with WagmiProvider + RainbowKitProvider tree.
export default function DefiLayout({ children }: { children: React.ReactNode }) {
  return <DefiProviders>{children}</DefiProviders>
}
