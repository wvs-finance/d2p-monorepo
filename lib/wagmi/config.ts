import { env } from '@/lib/env'
import { arbitrum, base, celo, mainnet, optimism } from 'viem/chains'
import { http, createConfig, fallback } from 'wagmi'

// Five chains in priority order: celo (primary), mainnet, base, arbitrum, optimism.
// Each transport uses the viem fallback transport with two http endpoints per
// CONTEXT.md — never a single RPC (mitigates Pitfall 23: single RPC failure mode).
export const chains = [celo, mainnet, base, arbitrum, optimism] as const

export const wagmiConfig = createConfig({
  chains,
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
