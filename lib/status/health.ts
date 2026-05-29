import type { SupportedChainId } from '@/lib/apps/abrigo/instruments'
import { publicClients } from '@/lib/chains/clients'
import { serializeBigints } from '@/lib/chains/serialize'
import { arbitrum, base, celo, mainnet, optimism } from 'viem/chains'

const CHAIN_NAMES: Record<SupportedChainId, string> = {
  [celo.id]: celo.name,
  [mainnet.id]: mainnet.name,
  [base.id]: base.name,
  [arbitrum.id]: arbitrum.name,
  [optimism.id]: optimism.name,
}

export interface ChainHealth {
  chainId: number
  name: string
  status: 'healthy' | 'degraded'
  blockNumber?: string
  latencyMs?: number
  error?: string
}

function timeout(ms: number): Promise<never> {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`RPC timeout after ${ms}ms`)), ms),
  )
}

export async function checkChainHealth(chainId: SupportedChainId): Promise<ChainHealth> {
  const name = CHAIN_NAMES[chainId]
  const t0 = Date.now()

  try {
    const bn = await Promise.race([publicClients[chainId].getBlockNumber(), timeout(5000)])
    return {
      chainId,
      name,
      status: 'healthy',
      blockNumber: bn.toString(),
      latencyMs: Date.now() - t0,
    }
  } catch (err) {
    return {
      chainId,
      name,
      status: 'degraded',
      error: String(err),
    }
  }
}

export async function checkAllChains(): Promise<ChainHealth[]> {
  const chains = [celo, mainnet, base, arbitrum, optimism] as const

  const results = await Promise.allSettled(chains.map((chain) => checkChainHealth(chain.id)))

  const health = results.map((result, i) => {
    if (result.status === 'fulfilled') return result.value
    // i is always 0-4 because chains has exactly 5 elements — fallback to celo is unreachable
    const chainId = chains[i]?.id ?? celo.id
    const name = chains[i]?.name ?? celo.name
    return {
      chainId,
      name,
      status: 'degraded' as const,
      error: 'check failed',
    }
  })

  return serializeBigints(health)
}
