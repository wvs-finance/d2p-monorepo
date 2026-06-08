// @vitest-environment node
// Wave 0 — somnia-reader: getHedgeDecisions / getLatestMacroPrint / getMacroHistory.
// Tests SNAPSHOT PATH only — no SOMNIA_LIVE env set → synchronous / no network.
// Turned GREEN by Plan 06-00 Task 2 (reader.ts seam lands).
// Import is indirected so tsc --noEmit passes while the module is absent (Task 0 pre-Task1).
// Removed from tsconfig exclude in Task 2 commit (when reader.ts lands).

import { describe, expect, it } from 'vitest'

const READER_MODULE = '@/lib/apps/abrigo/somnia/reader'

type DecisionView = {
  action: string
  sizeBps: bigint
  macroValue: bigint
  consensus: bigint
  sourceTxHash: string
  pending: boolean
  decidedAt: Date | null
}

type PrintView = {
  scaledValue: bigint
  dataKey: string
  dataKeyLabel: string
  capturedAt: Date
  sourceTxHash: string | null
}

type ReaderModule = {
  getHedgeDecisions: () => DecisionView[]
  getLatestMacroPrint: () => PrintView
  getMacroHistory: () => PrintView[]
}

describe('getHedgeDecisions — snapshot path (no network)', () => {
  it('returns exactly 2 decisions', async () => {
    const { getHedgeDecisions } = (await import(READER_MODULE)) as ReaderModule
    const decisions = getHedgeDecisions()
    expect(decisions).toHaveLength(2)
  })

  it('decision[0] action is ADD_LONG_GAMMA', async () => {
    const { getHedgeDecisions } = (await import(READER_MODULE)) as ReaderModule
    const decisions = getHedgeDecisions()
    expect(decisions[0]?.action).toBe('ADD_LONG_GAMMA')
  })

  it('decision[0] sizeBps is 6800n (bigint)', async () => {
    const { getHedgeDecisions } = (await import(READER_MODULE)) as ReaderModule
    const decisions = getHedgeDecisions()
    expect(typeof decisions[0]?.sizeBps).toBe('bigint')
    expect(decisions[0]?.sizeBps).toBe(6800n)
  })

  it('decision[0] macroValue is 568n (bigint)', async () => {
    const { getHedgeDecisions } = (await import(READER_MODULE)) as ReaderModule
    const decisions = getHedgeDecisions()
    expect(decisions[0]?.macroValue).toBe(568n)
  })

  it('decision[0] consensus is 500n (bigint)', async () => {
    const { getHedgeDecisions } = (await import(READER_MODULE)) as ReaderModule
    const decisions = getHedgeDecisions()
    expect(decisions[0]?.consensus).toBe(500n)
  })

  it('decision[0] sourceTxHash matches the canonical ADD_LONG_GAMMA tx', async () => {
    const { getHedgeDecisions } = (await import(READER_MODULE)) as ReaderModule
    const decisions = getHedgeDecisions()
    expect(decisions[0]?.sourceTxHash).toBe(
      '0x2a8ec99452956fb94ad3b138844957409b298daa05e2d9986b34676d643c36a5',
    )
  })

  it('decision[1] action is REDUCE', async () => {
    const { getHedgeDecisions } = (await import(READER_MODULE)) as ReaderModule
    const decisions = getHedgeDecisions()
    expect(decisions[1]?.action).toBe('REDUCE')
  })

  it('decision[1] sizeBps is 568n (bigint)', async () => {
    const { getHedgeDecisions } = (await import(READER_MODULE)) as ReaderModule
    const decisions = getHedgeDecisions()
    expect(decisions[1]?.sizeBps).toBe(568n)
  })

  it('decision[1] consensus is 900n (bigint)', async () => {
    const { getHedgeDecisions } = (await import(READER_MODULE)) as ReaderModule
    const decisions = getHedgeDecisions()
    expect(decisions[1]?.consensus).toBe(900n)
  })
})

describe('getLatestMacroPrint — snapshot path (no network)', () => {
  it('returns scaledValue 568n (bigint)', async () => {
    const { getLatestMacroPrint } = (await import(READER_MODULE)) as ReaderModule
    const print = getLatestMacroPrint()
    expect(typeof print.scaledValue).toBe('bigint')
    expect(print.scaledValue).toBe(568n)
  })

  it('returns a dataKey field', async () => {
    const { getLatestMacroPrint } = (await import(READER_MODULE)) as ReaderModule
    const print = getLatestMacroPrint()
    expect(typeof print.dataKey).toBe('string')
    expect(print.dataKey.length).toBeGreaterThan(0)
  })

  it('dataKeyLabel is co/inflation-rate', async () => {
    const { getLatestMacroPrint } = (await import(READER_MODULE)) as ReaderModule
    const print = getLatestMacroPrint()
    expect(print.dataKeyLabel).toBe('co/inflation-rate')
  })

  it('capturedAt is a Date instance', async () => {
    const { getLatestMacroPrint } = (await import(READER_MODULE)) as ReaderModule
    const print = getLatestMacroPrint()
    expect(print.capturedAt).toBeInstanceOf(Date)
  })
})
