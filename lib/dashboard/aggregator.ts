import {
  ABRIGO_ABI,
  ABRIGO_INSTRUMENTS,
  type SupportedChainId,
} from '@/lib/apps/abrigo/instruments'
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

export interface InstrumentState {
  id: string
  name: string
  nameEn: string
  address: string
  poolBalance: string | null
  settlementCount: string | null
  lpPositionCount: string | null
}

export interface ChainAggregationResult {
  chainId: number
  chainName: string
  status: 'healthy' | 'degraded' | 'empty'
  instruments: InstrumentState[]
  lastBlockSynced: string | null
  error?: string
  fetchedAt: string
}

type MulticallResult = { status: 'success'; result: unknown } | { status: 'failure'; error: Error }

async function aggregateChain(chainId: SupportedChainId): Promise<ChainAggregationResult> {
  const chainName = CHAIN_NAMES[chainId]
  const instruments = ABRIGO_INSTRUMENTS.filter((i) => i.chainId === chainId)

  // SHORT-CIRCUIT FIRST (BA M-agg): return BEFORE touching publicClients.
  // No client is constructed/called on the empty path; the empty-registry result is
  // fully deterministic.
  if (instruments.length === 0) {
    return {
      chainId,
      chainName,
      status: 'empty',
      instruments: [],
      lastBlockSynced: null,
      fetchedAt: new Date().toISOString(),
    }
  }

  // Non-empty path (activated when Abrigo contracts deploy):
  // multicall over poolBalance/settlementCount/lpPositionCount per instrument.
  const client = publicClients[chainId]

  const multicallContracts = instruments.flatMap((inst) => [
    { address: inst.address, abi: ABRIGO_ABI, functionName: 'poolBalance' as const },
    { address: inst.address, abi: ABRIGO_ABI, functionName: 'settlementCount' as const },
    { address: inst.address, abi: ABRIGO_ABI, functionName: 'lpPositionCount' as const },
  ])

  const [blockNumber, reads] = await Promise.all([
    client.getBlockNumber(),
    client.multicall({ contracts: multicallContracts, allowFailure: true }),
  ])

  const typedReads = reads as MulticallResult[]

  const instrumentStates: InstrumentState[] = instruments.map((inst, i) => {
    const poolBalanceResult = typedReads[i * 3]
    const settlementCountResult = typedReads[i * 3 + 1]
    const lpPositionCountResult = typedReads[i * 3 + 2]

    return {
      id: inst.id,
      name: inst.name,
      nameEn: inst.nameEn,
      address: inst.address,
      poolBalance:
        poolBalanceResult?.status === 'success' && poolBalanceResult.result != null
          ? String(poolBalanceResult.result)
          : null,
      settlementCount:
        settlementCountResult?.status === 'success' && settlementCountResult.result != null
          ? String(settlementCountResult.result)
          : null,
      lpPositionCount:
        lpPositionCountResult?.status === 'success' && lpPositionCountResult.result != null
          ? String(lpPositionCountResult.result)
          : null,
    }
  })

  return serializeBigints({
    chainId,
    chainName,
    status: 'healthy' as const,
    instruments: instrumentStates,
    lastBlockSynced: blockNumber.toString(),
    fetchedAt: new Date().toISOString(),
  })
}

export async function aggregateAllChains(): Promise<ChainAggregationResult[]> {
  const chains = [celo, mainnet, base, arbitrum, optimism] as const

  const results = await Promise.allSettled(chains.map((chain) => aggregateChain(chain.id)))

  const aggregated = results.map((result, i) => {
    if (result.status === 'fulfilled') return result.value
    // i is always 0-4 because chains has exactly 5 elements — fallback to celo (index 0) is unreachable
    const chainId = chains[i]?.id ?? celo.id
    const chainName = chains[i]?.name ?? celo.name
    return {
      chainId,
      chainName,
      status: 'degraded' as const,
      instruments: [],
      lastBlockSynced: null,
      error: (result.reason as Error)?.message ?? 'RPC unavailable',
      fetchedAt: new Date().toISOString(),
    }
  })

  // Belt-and-braces bigint boundary — serializeBigints the entire output array
  return serializeBigints(aggregated)
}
