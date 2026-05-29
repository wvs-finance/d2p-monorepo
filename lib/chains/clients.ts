import type { SupportedChainId } from '@/lib/apps/abrigo/instruments'
import { env } from '@/lib/env'
// Pure server-only viem client factory. Imported by lib/dashboard/aggregator.ts AND
// lib/status/health.ts so neither depends on the other. Never import wagmiConfig here
// (ssr:false, no read API — RESEARCH Pitfall 3). Routes that call these MUST set
// runtime='nodejs' (Pitfall 1).
import { http, type PublicClient, createPublicClient, fallback } from 'viem'
import { arbitrum, base, celo, mainnet, optimism } from 'viem/chains'

// Build each client separately so TS can infer the chain-specific type, then cast to the
// shared map. Using `Record<SupportedChainId, PublicClient>` annotation directly causes
// TS2418 because each chain-specific PublicClient has a narrower getBlock() return type.
const clients = {
  [celo.id]: createPublicClient({
    chain: celo,
    transport: fallback([
      http(env.NEXT_PUBLIC_RPC_CELO_PRIMARY, { timeout: 5000 }),
      http('https://forno.celo.org', { timeout: 5000 }),
    ]),
    batch: { multicall: true },
  }),
  [mainnet.id]: createPublicClient({
    chain: mainnet,
    transport: fallback([
      http(env.NEXT_PUBLIC_RPC_ETH_PRIMARY, { timeout: 5000 }),
      http('https://ethereum.publicnode.com', { timeout: 5000 }),
    ]),
    batch: { multicall: true },
  }),
  [base.id]: createPublicClient({
    chain: base,
    transport: fallback([
      http(env.NEXT_PUBLIC_RPC_BASE_PRIMARY, { timeout: 5000 }),
      http('https://mainnet.base.org', { timeout: 5000 }),
    ]),
    batch: { multicall: true },
  }),
  [arbitrum.id]: createPublicClient({
    chain: arbitrum,
    transport: fallback([
      http(env.NEXT_PUBLIC_RPC_ARB_PRIMARY, { timeout: 5000 }),
      http('https://arb1.arbitrum.io/rpc', { timeout: 5000 }),
    ]),
    batch: { multicall: true },
  }),
  [optimism.id]: createPublicClient({
    chain: optimism,
    transport: fallback([
      http(env.NEXT_PUBLIC_RPC_OP_PRIMARY, { timeout: 5000 }),
      http('https://mainnet.optimism.io', { timeout: 5000 }),
    ]),
    batch: { multicall: true },
  }),
}

export const publicClients = clients as Record<SupportedChainId, PublicClient>
