import { ABRIGO_INSTRUMENTS } from '@/lib/apps/abrigo/instruments'
import type { ChainAggregationResult, InstrumentState } from '@/lib/dashboard/aggregator'
// @vitest-environment node
// DEFI-03 anti-fishing: data-only tests for the instrument registry and the
// chainId-keyed pool-state selector (B2 contract).
// NO DOM, NO jsdom, NO .tsx — data invariants only.
import { describe, expect, it } from 'vitest'

// Inline local copy of the find-by-chainId predicate.
// 05-04 replaces this with an import of getInstrumentPoolState from lib/dashboard/instrument-pool.ts.
// This pins the [chain]=chainId contract (B2) before 05-04 ships.
function getInstrumentPoolState(
  results: ChainAggregationResult[],
  instrumentId: string,
  chainId: number,
): InstrumentState | null {
  const chainResult = results.find((r) => r.chainId === chainId)
  if (!chainResult || chainResult.status === 'empty') return null
  return chainResult.instruments.find((i) => i.id === instrumentId) ?? null
}

describe('ABRIGO_INSTRUMENTS — anti-fishing (DEFI-03)', () => {
  it('registry is empty at launch (no fabricated/ghost instruments)', () => {
    expect(ABRIGO_INSTRUMENTS).toHaveLength(0)
  })

  it('registry is an array', () => {
    expect(Array.isArray(ABRIGO_INSTRUMENTS)).toBe(true)
  })
})

describe('getInstrumentPoolState — B2 chainId selector contract', () => {
  it('returns null when results array is empty', () => {
    expect(getInstrumentPoolState([], 'fx', 42220)).toBeNull()
  })

  it('returns null when no chain matches', () => {
    const results: ChainAggregationResult[] = [
      {
        chainId: 42220,
        chainName: 'Celo',
        status: 'empty',
        instruments: [],
        lastBlockSynced: null,
        fetchedAt: new Date().toISOString(),
      },
    ]
    expect(getInstrumentPoolState(results, 'fx', 42220)).toBeNull()
  })

  it('returns the matching InstrumentState when chainId matches (B2 fixture)', () => {
    const fxInstrument: InstrumentState = {
      id: 'fx',
      name: 'Instrumento FX',
      nameEn: 'FX Instrument',
      address: '0x1234',
      poolBalance: '1000',
      settlementCount: '5',
      lpPositionCount: '3',
    }
    const results: ChainAggregationResult[] = [
      {
        chainId: 42220,
        chainName: 'Celo',
        status: 'healthy',
        instruments: [fxInstrument],
        lastBlockSynced: '12345',
        fetchedAt: new Date().toISOString(),
      },
    ]
    const result = getInstrumentPoolState(results, 'fx', 42220)
    expect(result).toEqual(fxInstrument)
  })

  it('returns null for a non-matching chainId (e.g. Base=8453 when only Celo=42220 present)', () => {
    const fxInstrument: InstrumentState = {
      id: 'fx',
      name: 'Instrumento FX',
      nameEn: 'FX Instrument',
      address: '0x1234',
      poolBalance: null,
      settlementCount: null,
      lpPositionCount: null,
    }
    const results: ChainAggregationResult[] = [
      {
        chainId: 42220,
        chainName: 'Celo',
        status: 'healthy',
        instruments: [fxInstrument],
        lastBlockSynced: '12345',
        fetchedAt: new Date().toISOString(),
      },
    ]
    // B2 contract: keyed by NUMERIC chainId — Base (8453) finds no match
    expect(getInstrumentPoolState(results, 'fx', 8453)).toBeNull()
  })

  it('returns null when instrument ID does not match within the chain', () => {
    const fxInstrument: InstrumentState = {
      id: 'fx',
      name: 'Instrumento FX',
      nameEn: 'FX Instrument',
      address: '0x1234',
      poolBalance: null,
      settlementCount: null,
      lpPositionCount: null,
    }
    const results: ChainAggregationResult[] = [
      {
        chainId: 42220,
        chainName: 'Celo',
        status: 'healthy',
        instruments: [fxInstrument],
        lastBlockSynced: null,
        fetchedAt: new Date().toISOString(),
      },
    ]
    expect(getInstrumentPoolState(results, 'other-instrument', 42220)).toBeNull()
  })
})
