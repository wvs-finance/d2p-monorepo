// from-chain-event.test.ts — Task 1 (09-03)
// Tests fromChainEvent + formatWadToPercent using manually constructed log fixtures.
// viem does not export encodeEventLog; we build the log data directly with encodeAbiParameters.

import { macroHedgeExecutorAbi, macroHedgeStrategistAbi } from '@/lib/contracts/generated'
import { encodeAbiParameters, encodeEventTopics, keccak256, toHex } from 'viem'
import { describe, expect, it } from 'vitest'

// ---------------------------------------------------------------------------
// Under test
// ---------------------------------------------------------------------------
import { formatWadToPercent, fromChainEvent } from '@/lib/apps/abrigo/cornerstone/events'

// ---------------------------------------------------------------------------
// Helpers to build raw log objects from real ABI shapes
// ---------------------------------------------------------------------------

/** Build a raw {topics, data} log for ExecutorDecided */
function makeExecutorDecidedLog() {
  const requestId = 0n // sentinel — not surfaced
  const regimeZt = 2
  const inflationAdjustmentWad = 56800000000000000n // 5.68% × 1e18
  const strikeTick = -120 // SIGNED int24 — negative case
  const regimeWidth = 60
  const parametricHedged = false
  const nonErgodicDisclosed = true
  const rationale = 'TEMPLATE: demonstrating the non-ergodic disclosure'

  // Topics: [eventSelector, indexed requestId]
  const topics = encodeEventTopics({
    abi: macroHedgeExecutorAbi,
    eventName: 'ExecutorDecided',
    args: {
      requestId,
    },
  })

  // Non-indexed data: regimeZt, inflationAdjustmentWad, strikeTick, regimeWidth,
  //                   parametricHedged, nonErgodicDisclosed, rationale
  const data = encodeAbiParameters(
    [
      { name: 'regimeZt', type: 'uint8' },
      { name: 'inflationAdjustmentWad', type: 'uint256' },
      { name: 'strikeTick', type: 'int24' },
      { name: 'regimeWidth', type: 'int24' },
      { name: 'parametricHedged', type: 'bool' },
      { name: 'nonErgodicDisclosed', type: 'bool' },
      { name: 'rationale', type: 'string' },
    ],
    [
      regimeZt,
      inflationAdjustmentWad,
      strikeTick,
      regimeWidth,
      parametricHedged,
      nonErgodicDisclosed,
      rationale,
    ],
  )

  return { topics: topics as readonly `0x${string}`[], data }
}

/** Build a raw {topics, data} log for PositionMinted */
function makePositionMintedLog() {
  const owner = '0xdeadbeef00000000000000000000000000000001' as `0x${string}`
  const positionId = BigInt('0x16057fa8064003c085e69280422') // the anchor fixture
  const positionSize = 1_000_000n

  // Topics: [eventSelector, indexed owner, indexed positionId]
  const topics = encodeEventTopics({
    abi: macroHedgeExecutorAbi,
    eventName: 'PositionMinted',
    args: { owner, positionId },
  })

  // Non-indexed data: positionSize (uint128)
  const data = encodeAbiParameters([{ name: 'positionSize', type: 'uint128' }], [positionSize])

  return { topics: topics as readonly `0x${string}`[], data }
}

/** Build a raw {topics, data} log for StrategistDecided */
function makeStrategistDecidedLog() {
  const decisionId =
    '0xb24ac1afbcefc708000000000000000000000000000000000000000000000001' as `0x${string}`
  const school = 'POST_KEYNESIAN'
  const mandate = {
    economicTheory: '0x0000000000000000000000000000000000000006' as `0x${string}`,
    underlyingMarket:
      '0x77636f7075736463000000000000000000000000000000000000000000000000' as `0x${string}`,
    targetNotional: 10_000n,
    chainId: 137,
    isLong: true,
  }

  // Topics: [eventSelector, indexed decisionId]
  const topics = encodeEventTopics({
    abi: macroHedgeStrategistAbi,
    eventName: 'StrategistDecided',
    args: { decisionId },
  })

  // Non-indexed data: school (string), mandate (tuple)
  const data = encodeAbiParameters(
    [
      { name: 'school', type: 'string' },
      {
        name: 'mandate',
        type: 'tuple',
        components: [
          { name: 'economicTheory', type: 'address' },
          { name: 'underlyingMarket', type: 'bytes32' },
          { name: 'targetNotional', type: 'uint256' },
          { name: 'chainId', type: 'uint32' },
          { name: 'isLong', type: 'bool' },
        ],
      },
    ],
    [school, mandate],
  )

  return { topics: topics as readonly `0x${string}`[], data }
}

/** Build a log with an unrecognized topic (completely foreign) */
function makeUnrecognizedLog() {
  return {
    topics: [keccak256(toHex('SomeForeignEvent(uint256)')) as `0x${string}`],
    data: '0x' as `0x${string}`,
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('formatWadToPercent', () => {
  it('converts 56800000000000000n to "5.68%"', () => {
    expect(formatWadToPercent(56800000000000000n)).toBe('5.68%')
  })

  it('converts 100000000000000000n (10%) correctly', () => {
    expect(formatWadToPercent(100000000000000000n)).toBe('10.00%')
  })

  it('converts 0n to "0.00%"', () => {
    expect(formatWadToPercent(0n)).toBe('0.00%')
  })
})

describe('fromChainEvent — ExecutorDecided', () => {
  it('decodes all 8 fields from a real ExecutorDecided log', () => {
    const log = makeExecutorDecidedLog()
    const view = fromChainEvent(log)

    expect(view).not.toBeNull()
    expect(view?.kind).toBe('ExecutorDecided')

    if (view?.kind !== 'ExecutorDecided') return

    // regimeZt: number
    expect(typeof view.regimeZt).toBe('number')
    expect(view.regimeZt).toBe(2)

    // inflationAdjustment: WAD → percent string
    expect(view.inflationAdjustment).toBe('5.68%')

    // strikeTick: SIGNED int24 (negative case)
    expect(view.strikeTick).toBe(-120)

    // regimeWidth
    expect(view.regimeWidth).toBe(60)

    // parametricHedged
    expect(view.parametricHedged).toBe(false)

    // nonErgodicDisclosed
    expect(view.nonErgodicDisclosed).toBe(true)

    // rationale — verbatim from the event string
    expect(view.rationale).toContain('TEMPLATE')

    // hedgeLegParams carries the new D1 fields
    expect(view.hedgeLegParams.nonErgodicDisclosed).toBe(true)
    expect(view.hedgeLegParams.parametricHedged).toBe(false)
  })
})

describe('fromChainEvent — PositionMinted', () => {
  it('decodes positionId from the indexed topic as a string', () => {
    const log = makePositionMintedLog()
    const view = fromChainEvent(log)

    expect(view).not.toBeNull()
    expect(view?.kind).toBe('PositionMinted')

    if (view?.kind !== 'PositionMinted') return

    // positionId from indexed topic → string
    expect(typeof view.positionId).toBe('string')
    // The anchor fixture: BigInt('0x16057fa8064003c085e69280422')
    expect(view.positionId).toBe(BigInt('0x16057fa8064003c085e69280422').toString())
  })
})

describe('fromChainEvent — StrategistDecided', () => {
  it('sets recordedDecisionId ONCE inside the adapter from decisionId.toString()', () => {
    const log = makeStrategistDecidedLog()
    const view = fromChainEvent(log)

    expect(view).not.toBeNull()
    expect(view?.kind).toBe('StrategistDecided')

    if (view?.kind !== 'StrategistDecided') return

    // recordedDecisionId set once in fromChainEvent — NOT enriched outside
    expect(typeof view.recordedDecisionId).toBe('string')
    expect(view.recordedDecisionId.length).toBeGreaterThan(0)
    // Should be the bytes32 toString()
    expect(view.recordedDecisionId).toMatch(/^0x/)
  })
})

describe('fromChainEvent — unrecognized log', () => {
  it('returns null for an unrecognized topic (no throw)', () => {
    const log = makeUnrecognizedLog()
    expect(() => fromChainEvent(log)).not.toThrow()
    const result = fromChainEvent(log)
    expect(result).toBeNull()
  })
})
