import { deployment } from '@/lib/apps/abrigo/cornerstone/artifact-loader'
import { BuildBearChainId, createBuildBearChain } from '@/lib/apps/abrigo/cornerstone/buildbear'
import { env } from '@/lib/env'
import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { arbitrum, base, celo, mainnet, optimism } from 'viem/chains'
import { http, fallback } from 'wagmi'

// Six chains: celo (primary), mainnet, base, arbitrum, optimism, + BuildBear Polygon fork (31337).
//
// Phase 9 D2 (user decision 2026-06-07): the BuildBear fork (31337) IS registered as the 6th
// wagmi chain — write path uses wagmi useSwitchChain + useWriteContract({chainId:31337}).
// rpcUrl sourced from the mirrored artifact (deployment.rpcUrl) — NEVER a hardcoded endpoint.
// SupportedChainId widened to include 31337 (accepted for the demo per spec §3).
//
// Somnia (50312) is NOT added here — it is server-side only (never a browser chain).
//
// getDefaultConfig (RainbowKit) replaces createConfig (wagmi) to register WalletConnect
// connectors automatically (injected, walletConnect, coinbaseWallet, safe) — DEFI-01.
// All 4 default connectors are kept; no trimming.
//
// ssr: false — wallet state is client-only (CONTEXT.md constraint, Pitfall 2 in RESEARCH).
// Do NOT add cookieToInitialState / WagmiProvider initialState — that is for ssr:true only.

// BuildBear fork: rpcUrl from mirrored artifact (deployment.rpcUrl — no hardcoded endpoint)
const buildBearFork = createBuildBearChain(deployment.rpcUrl)

export const chains = [celo, mainnet, base, arbitrum, optimism, buildBearFork] as const

export const wagmiConfig = getDefaultConfig({
  appName: 'd2p Finance',
  projectId: env.NEXT_PUBLIC_WALLETCONNECT_ID,
  chains: [celo, mainnet, base, arbitrum, optimism, buildBearFork],
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
    // BuildBear fork transport: sourced from deployment.rpcUrl (never a hardcoded endpoint)
    [BuildBearChainId]: http(deployment.rpcUrl),
  },
  // Wallet state is client-only — never SSR (CONTEXT.md constraint, Pitfall 31).
  ssr: false,
})

export type WagmiConfig = typeof wagmiConfig

// SupportedChainId — widened to include 31337 for Phase 9 demo (per spec §3 D2).
export type SupportedChainId =
  | typeof celo.id
  | typeof mainnet.id
  | typeof base.id
  | typeof arbitrum.id
  | typeof optimism.id
  | typeof BuildBearChainId
