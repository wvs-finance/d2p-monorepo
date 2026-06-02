// @vitest-environment node
// Wave 0 (RED stub) — decision-trace reader: getDecisionTraceById + DecisionTraceView.
// FULL-FIDELITY leg events (verified on-chain 2026-06-02):
//   4083729: legActionRequestId='4079637' (DERIVED), legActionTimestamp=null (out-of-window → em-dash)
//   4083997: legActionRequestId='4083984' (DERIVED), both timestamps non-null Dates
// ROUTE-CORRECT consensus: 500 for 4083729, 900 for 4083997.
// HedgeDecisionView.decisionId UNCHANGED (existing consumers unaffected).
// Turned GREEN by Plan 07-00 Task 2 (reader.ts extended + snapshot.json legs block).
// Excluded from tsconfig until Task 2.

import { describe, expect, it } from 'vitest'

const MODULE = '@/lib/apps/abrigo/somnia/reader'

type DecisionTraceView = {
  requestId: string
  action: string
  sizeBps: bigint
  macroValue: bigint
  consensus: bigint
  surprise: bigint
  builtPrompt: string
  legSizeRequestId: string
  legActionRequestId: string
  decisionId: string
  legSizeTimestamp: Date
  legActionTimestamp: Date | null
  sourceTxHash: string
  decidedAt: Date | null
}

type ReaderWithTrace = {
  getDecisionTraceById: (id: string) => DecisionTraceView | null
}

describe('getDecisionTraceById("4083729") — ADD_LONG_GAMMA, consensus=500', () => {
  it('returns a non-null DecisionTraceView', async () => {
    const { getDecisionTraceById } = (await import(MODULE)) as ReaderWithTrace
    const trace = getDecisionTraceById('4083729')
    expect(trace).not.toBeNull()
  })

  it('action is ADD_LONG_GAMMA', async () => {
    const { getDecisionTraceById } = (await import(MODULE)) as ReaderWithTrace
    const trace = getDecisionTraceById('4083729')
    expect(trace?.action).toBe('ADD_LONG_GAMMA')
  })

  it('sizeBps is 6800n (bigint)', async () => {
    const { getDecisionTraceById } = (await import(MODULE)) as ReaderWithTrace
    const trace = getDecisionTraceById('4083729')
    expect(trace?.sizeBps).toBe(6800n)
  })

  it('macroValue is 568n (bigint)', async () => {
    const { getDecisionTraceById } = (await import(MODULE)) as ReaderWithTrace
    const trace = getDecisionTraceById('4083729')
    expect(trace?.macroValue).toBe(568n)
  })

  it('consensus is 500n (ROUTE-CORRECT — NOT 900)', async () => {
    const { getDecisionTraceById } = (await import(MODULE)) as ReaderWithTrace
    const trace = getDecisionTraceById('4083729')
    expect(trace?.consensus).toBe(500n)
  })

  it('legSizeRequestId is "4083729" (= the route key)', async () => {
    const { getDecisionTraceById } = (await import(MODULE)) as ReaderWithTrace
    const trace = getDecisionTraceById('4083729')
    expect(trace?.legSizeRequestId).toBe('4083729')
  })

  it('legActionRequestId is "4079637" (DERIVED from decisionId topic — REAL, never invented)', async () => {
    const { getDecisionTraceById } = (await import(MODULE)) as ReaderWithTrace
    const trace = getDecisionTraceById('4083729')
    expect(trace?.legActionRequestId).toBe('4079637')
  })

  it('legActionTimestamp is null (action log outside 1000-block window → em-dash — honest)', async () => {
    const { getDecisionTraceById } = (await import(MODULE)) as ReaderWithTrace
    const trace = getDecisionTraceById('4083729')
    expect(trace?.legActionTimestamp).toBeNull()
  })

  it('legSizeTimestamp is a Date (from the size-leg block)', async () => {
    const { getDecisionTraceById } = (await import(MODULE)) as ReaderWithTrace
    const trace = getDecisionTraceById('4083729')
    expect(trace?.legSizeTimestamp).toBeInstanceOf(Date)
  })

  it('builtPrompt contains "Consensus expectation (scaled int): 500"', async () => {
    const { getDecisionTraceById } = (await import(MODULE)) as ReaderWithTrace
    const trace = getDecisionTraceById('4083729')
    expect(trace?.builtPrompt).toContain('Consensus expectation (scaled int): 500')
  })
})

describe('getDecisionTraceById("4083997") — REDUCE, consensus=900', () => {
  it('returns a non-null DecisionTraceView', async () => {
    const { getDecisionTraceById } = (await import(MODULE)) as ReaderWithTrace
    const trace = getDecisionTraceById('4083997')
    expect(trace).not.toBeNull()
  })

  it('action is REDUCE', async () => {
    const { getDecisionTraceById } = (await import(MODULE)) as ReaderWithTrace
    const trace = getDecisionTraceById('4083997')
    expect(trace?.action).toBe('REDUCE')
  })

  it('sizeBps is 568n (bigint)', async () => {
    const { getDecisionTraceById } = (await import(MODULE)) as ReaderWithTrace
    const trace = getDecisionTraceById('4083997')
    expect(trace?.sizeBps).toBe(568n)
  })

  it('consensus is 900n (ROUTE-CORRECT — NOT 500)', async () => {
    const { getDecisionTraceById } = (await import(MODULE)) as ReaderWithTrace
    const trace = getDecisionTraceById('4083997')
    expect(trace?.consensus).toBe(900n)
  })

  it('legActionRequestId is "4083984" (DERIVED — real)', async () => {
    const { getDecisionTraceById } = (await import(MODULE)) as ReaderWithTrace
    const trace = getDecisionTraceById('4083997')
    expect(trace?.legActionRequestId).toBe('4083984')
  })

  it('legActionTimestamp is a non-null Date (both legs within window)', async () => {
    const { getDecisionTraceById } = (await import(MODULE)) as ReaderWithTrace
    const trace = getDecisionTraceById('4083997')
    expect(trace?.legActionTimestamp).toBeInstanceOf(Date)
    expect(trace?.legActionTimestamp).not.toBeNull()
  })

  it('legSizeTimestamp is a non-null Date', async () => {
    const { getDecisionTraceById } = (await import(MODULE)) as ReaderWithTrace
    const trace = getDecisionTraceById('4083997')
    expect(trace?.legSizeTimestamp).toBeInstanceOf(Date)
    expect(trace?.legSizeTimestamp).not.toBeNull()
  })

  it('builtPrompt contains "Consensus expectation (scaled int): 900"', async () => {
    const { getDecisionTraceById } = (await import(MODULE)) as ReaderWithTrace
    const trace = getDecisionTraceById('4083997')
    expect(trace?.builtPrompt).toContain('Consensus expectation (scaled int): 900')
  })
})

describe('getDecisionTraceById — unknown id returns null', () => {
  it('returns null for an unknown id', async () => {
    const { getDecisionTraceById } = (await import(MODULE)) as ReaderWithTrace
    const trace = getDecisionTraceById('9999999')
    expect(trace).toBeNull()
  })
})
