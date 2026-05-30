import { env } from '@/lib/env'
import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { arbitrum, base, celo, mainnet, optimism } from 'viem/chains'
import { http, fallback } from 'wagmi'

// Five chains in priority order: celo (primary), mainnet, base, arbitrum, optimism.
// Each transport uses the viem fallback transport with two http endpoints per
// CONTEXT.md — never a single RPC (mitigates Pitfall 23: single RPC failure mode).
//
// getDefaultConfig (RainbowKit) replaces createConfig (wagmi) to register WalletConnect
// connectors automatically (injected, walletConnect, coinbaseWallet, safe) — DEFI-01.
// All 4 default connectors are kept; no trimming.
//
// ssr: false — wallet state is client-only (CONTEXT.md constraint, Pitfall 2 in RESEARCH).
// Do NOT add cookieToInitialState / WagmiProvider initialState — that is for ssr:true only.
export const chains = [celo, mainnet, base, arbitrum, optimism] as const

export const wagmiConfig = getDefaultConfig({
  appName: 'd2p Finance',
  projectId: env.NEXT_PUBLIC_WALLETCONNECT_ID,
  chains: [celo, mainnet, base, arbitrum, optimism],
  transports: {
    [celo.id]: fallback([http(env.NEXT_PUBLIC_RPC_CELO_PRIMARY), http('https://forno.celo.org')]),
    [mainnet.id]: fallback([
      http(env.NEXT_PUBLIC_RPC_ETH_PRIMARY),
      http('https://ethereum.publicnode.com'),
    ]),
    [base.id]: fallback([http(env.NEXT_PUBLIC_RPC_BASE_PRIMARY), http('https://mainnet.base.org')]),
    [arbitrum.id]: fallback([
      http(env.NEXT_PUBLIC_RPC_ARB_PRIMARY),
      http('https://arb1.arbitrum.io/rpc'),
    ]),
    [optimism.id]: fallback([
      http(env.NEXT_PUBLIC_RPC_OP_PRIMARY),
      http('https://mainnet.optimism.io'),
    ]),
  },
  // Wallet state is client-only — never SSR (CONTEXT.md constraint, Pitfall 31).
  ssr: false,
})

export type WagmiConfig = typeof wagmiConfig
