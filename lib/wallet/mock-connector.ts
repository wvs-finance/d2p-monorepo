// DEV/E2E-ONLY — wagmi mock connector for DEFI-06 audit + e2e tests.
// Drives a real DISCONNECTED→CONNECTING→CONNECTED transition so the
// SR announcement and focus-return assertions test a real state change,
// not just mount state.
//
// Import: import { mockConnector } from '@/lib/wallet/mock-connector'
// Usage: pass to createConfig({ connectors: [mockConnector] }) in the audit route's
//        isolated WagmiProvider.
//
// Do NOT import this from production provider trees (wagmiConfig in lib/wagmi/config.ts).

import { mock } from 'wagmi'

// Deterministic test address — no real funds, public test account.
const TEST_ACCOUNT = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266' as const

export const mockConnector = mock({
  accounts: [TEST_ACCOUNT],
  features: {
    defaultConnected: false,
  },
})
