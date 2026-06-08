// lib/apps/abrigo/cornerstone/buildbear.ts
//
// BuildBear Polygon fork chain definition + public client factory.
// Mirrors lib/apps/abrigo/somnia/chain.ts exactly (the same defineChain + createPublicClient pattern).
//
// GOVERNANCE (spec v5 D2, 09-RESEARCH Pattern 1):
//   - The BuildBear fork (31337) is registered as the 6th wagmi chain in lib/wagmi/config.ts.
//   - rpcUrl ALWAYS comes from the mirrored artifact (deployment.rpcUrl) — NEVER hardcoded.
//   - createBuildBearChain(rpcUrl) and createBuildBearPublicClient(rpcUrl) receive the URL
//     at call-time from the artifact loader.
//   - No literal BuildBear RPC endpoint hardcoded anywhere in this file.
//
// ANTI-PATTERN (see 09-RESEARCH anti-patterns):
//   - Do NOT add buildbear chain to wagmiConfig in isolation (it IS added as the 6th chain per D2).
//   - Do NOT use a hardcoded RPC string — always `deployment.rpcUrl`.

import { http, createPublicClient, defineChain } from 'viem'

// ---------------------------------------------------------------------------
// BuildBearChainId — the BuildBear Polygon fork chain ID
// ---------------------------------------------------------------------------

export const BuildBearChainId = 31337 as const

// ---------------------------------------------------------------------------
// createBuildBearChain — defineChain factory (rpcUrl from artifact)
// ---------------------------------------------------------------------------

/**
 * createBuildBearChain(rpcUrl) — creates a viem Chain definition for the BuildBear Polygon fork.
 *
 * rpcUrl is ALWAYS sourced from deployment.rpcUrl (the mirrored artifact).
 * Never pass a hardcoded BuildBear RPC URL string here.
 *
 * @param rpcUrl - the fork RPC URL from the mirrored buildbear-deployments.json artifact
 */
export function createBuildBearChain(rpcUrl: string) {
  return defineChain({
    id: BuildBearChainId,
    name: 'BuildBear Polygon Fork',
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
    rpcUrls: {
      default: { http: [rpcUrl] },
    },
  })
}

// ---------------------------------------------------------------------------
// createBuildBearPublicClient — createPublicClient factory for reads
// ---------------------------------------------------------------------------

/**
 * createBuildBearPublicClient(rpcUrl) — creates a viem PublicClient for the BuildBear fork.
 *
 * Use for: freshness gate reads (pool.numberOfLegs), quoteMargin reads.
 * rpcUrl from deployment.rpcUrl.
 *
 * For writes (resolveFromMandate), use wagmi useSwitchChain + useWriteContract({chainId:31337})
 * (the fork is registered as the 6th wagmi chain via lib/wagmi/config.ts D2).
 *
 * @param rpcUrl - the fork RPC URL from the mirrored buildbear-deployments.json artifact
 */
export function createBuildBearPublicClient(rpcUrl: string) {
  return createPublicClient({
    chain: createBuildBearChain(rpcUrl),
    transport: http(rpcUrl),
  })
}
