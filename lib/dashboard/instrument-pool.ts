// getInstrumentPoolState — pure filter, NO new RPC.
// B2: filters by numeric chainId (NOT chainName — chainName has no stable slug).
// ChainAggregationResult carries both chainId and chainName; always key on chainId.
// The [chain] URL segment IS the numeric chainId (e.g. 42220 for Celo).
// Called server-side in the per-instrument page RSC; never on the client.

import type { ChainAggregationResult, InstrumentState } from '@/lib/dashboard/aggregator'

/**
 * Filter the aggregator result to a single InstrumentState for the given
 * instrument id and numeric chainId.
 *
 * Returns null if:
 * - No chain result matches chainId
 * - The chain result has status 'empty' (no instruments deployed on that chain)
 * - The instrument id is not found in that chain's instruments array
 *
 * Anti-fishing (CROSS-09): never returns fabricated data — callers render em-dash for null.
 */
export function getInstrumentPoolState(
  results: ChainAggregationResult[],
  instrumentId: string,
  chainId: number,
): InstrumentState | null {
  const chainResult = results.find((r) => r.chainId === chainId)
  if (!chainResult || chainResult.status === 'empty') return null
  return chainResult.instruments.find((i) => i.id === instrumentId) ?? null
}
