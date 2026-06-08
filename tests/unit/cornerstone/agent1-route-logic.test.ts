import { macroHedgeStrategistAbi } from '@/lib/contracts/generated'
import { encodeAbiParameters, encodeEventTopics } from 'viem'
/**
 * tests/unit/cornerstone/agent1-route-logic.test.ts
 *
 * TDD RED phase: tests for agent1-route-logic.ts pure helpers.
 * Uses viem encodeEventLog to build synthetic Somnia receipt logs.
 * No network — pure function testing only.
 */
import { describe, expect, it } from 'vitest'

// ----------------------------------------------------------------------------
// Imports under test (will fail until GREEN)
// ----------------------------------------------------------------------------
import {
  LEG_TIMEOUT_MS,
  correlateDecisionFailed,
  evaluateLegOutcome,
  parseStrategistDecided,
  readDecisionRequested,
  serializeMandate,
} from '@/lib/apps/abrigo/cornerstone/agent1-route-logic'

// ----------------------------------------------------------------------------
// Shared synthetic fixtures
// ----------------------------------------------------------------------------

const SCHOOL_LEG = 0
const NOTIONAL_LEG = 1

const SYNTHETIC_DECISION_ID =
  '0xaabbccdd11223344aabbccdd11223344aabbccdd11223344aabbccdd11223344' as `0x${string}`
const SYNTHETIC_SCHOOL_REQUEST_ID = 4083729n
const SYNTHETIC_NOTIONAL_REQUEST_ID = 4083997n

// Raw mandate values matching the live on-chain datum
const RAW_MANDATE = {
  economicTheory: '0x0000000000000000000000000000000000000006' as `0x${string}`,
  underlyingMarket:
    '0x000000000000000000000000000000000000000000000000000000000000ABCD' as `0x${string}`,
  targetNotional: 1_000_000n,
  chainId: 137,
  isLong: true,
}

// Convert a bigint to a 32-byte hex topic
function bigintToTopic(n: bigint): `0x${string}` {
  return `0x${n.toString(16).padStart(64, '0')}` as `0x${string}`
}

// Build a synthetic HedgeDecisionRequested log
// Topics: [sig, requestId (indexed), decisionId (indexed)]
// Data: leg (uint8)
function makeHedgeDecisionRequestedLog(requestId: bigint, decisionId: `0x${string}`, leg: number) {
  const topics = encodeEventTopics({
    abi: macroHedgeStrategistAbi,
    eventName: 'HedgeDecisionRequested',
    args: { requestId, decisionId },
  }) as [`0x${string}`, ...`0x${string}`[]]
  const data = encodeAbiParameters([{ name: 'leg', type: 'uint8' }], [leg])
  return { topics, data: data as `0x${string}` }
}

// Build a synthetic StrategistDecided log
// Topics: [sig, decisionId (indexed)]
// Data: school (string), mandate (tuple)
function makeStrategistDecidedLog(
  decisionId: `0x${string}`,
  school: string,
  mandate: typeof RAW_MANDATE,
) {
  const topics = encodeEventTopics({
    abi: macroHedgeStrategistAbi,
    eventName: 'StrategistDecided',
    args: { decisionId },
  }) as [`0x${string}`, ...`0x${string}`[]]
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
    [
      school,
      {
        economicTheory: mandate.economicTheory,
        underlyingMarket: mandate.underlyingMarket,
        targetNotional: mandate.targetNotional,
        chainId: mandate.chainId,
        isLong: mandate.isLong,
      },
    ],
  )
  return { topics, data: data as `0x${string}` }
}

// Build a synthetic DecisionFailed log
// Topics: [sig, requestId (indexed)]
// Data: status (uint8)
function makeDecisionFailedLog(requestId: bigint, status: number) {
  const topics = encodeEventTopics({
    abi: macroHedgeStrategistAbi,
    eventName: 'DecisionFailed',
    args: { requestId },
  }) as [`0x${string}`, ...`0x${string}`[]]
  const data = encodeAbiParameters([{ name: 'status', type: 'uint8' }], [status])
  return { topics, data: data as `0x${string}` }
}

// ----------------------------------------------------------------------------
// Tests
// ----------------------------------------------------------------------------

describe('LEG_TIMEOUT_MS', () => {
  it('is pinned at 120_000 ms', () => {
    expect(LEG_TIMEOUT_MS).toBe(120_000)
  })
})

describe('serializeMandate', () => {
  it('returns targetNotional as a decimal string (no raw bigint)', () => {
    const result = serializeMandate(RAW_MANDATE)
    expect(typeof result.targetNotional).toBe('string')
    expect(result.targetNotional).toBe('1000000')
  })

  it('does not throw on JSON.stringify (no raw bigint)', () => {
    const result = serializeMandate(RAW_MANDATE)
    expect(() => JSON.stringify(result)).not.toThrow()
  })

  it('returns economicTheory as hex address string', () => {
    const result = serializeMandate(RAW_MANDATE)
    expect(result.economicTheory).toMatch(/^0x[0-9a-fA-F]{40}$/)
  })

  it('returns underlyingMarket as hex bytes32 string', () => {
    const result = serializeMandate(RAW_MANDATE)
    expect(result.underlyingMarket).toMatch(/^0x[0-9a-fA-F]{64}$/)
  })

  it('preserves chainId as 137 (NOT overridden here — override is browser-side D4/09-03)', () => {
    const result = serializeMandate(RAW_MANDATE)
    expect(result.chainId).toBe(137)
  })

  it('preserves isLong', () => {
    const result = serializeMandate(RAW_MANDATE)
    expect(result.isLong).toBe(true)
  })
})

describe('parseStrategistDecided', () => {
  it('returns {school, mandate} from a synthetic StrategistDecided log', () => {
    const encoded = makeStrategistDecidedLog(SYNTHETIC_DECISION_ID, 'Keynesian', RAW_MANDATE)
    const logs = [encoded]
    const result = parseStrategistDecided(logs)
    expect(result).not.toBeNull()
    expect(result?.school).toBe('Keynesian')
    expect(result?.mandate).toBeDefined()
    expect(result?.mandate.targetNotional).toBe(1_000_000n)
    expect(result?.mandate.chainId).toBe(137)
  })

  it('returns null when no StrategistDecided log is present', () => {
    const encoded = makeHedgeDecisionRequestedLog(
      SYNTHETIC_SCHOOL_REQUEST_ID,
      SYNTHETIC_DECISION_ID,
      SCHOOL_LEG,
    )
    const logs = [encoded]
    const result = parseStrategistDecided(logs)
    expect(result).toBeNull()
  })
})

describe('readDecisionRequested', () => {
  it('extracts decisionId + requestId from HedgeDecisionRequested school log', () => {
    const encoded = makeHedgeDecisionRequestedLog(
      SYNTHETIC_SCHOOL_REQUEST_ID,
      SYNTHETIC_DECISION_ID,
      SCHOOL_LEG,
    )
    const logs = [encoded]
    const result = readDecisionRequested(logs, 'school')
    expect(result).not.toBeNull()
    expect(result?.requestId).toBe(SYNTHETIC_SCHOOL_REQUEST_ID)
    expect(result?.decisionId).toBe(SYNTHETIC_DECISION_ID)
  })

  it('extracts decisionId + requestId from HedgeDecisionRequested notional log', () => {
    const encoded = makeHedgeDecisionRequestedLog(
      SYNTHETIC_NOTIONAL_REQUEST_ID,
      SYNTHETIC_DECISION_ID,
      NOTIONAL_LEG,
    )
    const logs = [encoded]
    const result = readDecisionRequested(logs, 'notional')
    expect(result).not.toBeNull()
    expect(result?.requestId).toBe(SYNTHETIC_NOTIONAL_REQUEST_ID)
  })

  it('returns null when no matching leg log is present', () => {
    const encoded = makeHedgeDecisionRequestedLog(
      SYNTHETIC_SCHOOL_REQUEST_ID,
      SYNTHETIC_DECISION_ID,
      SCHOOL_LEG,
    )
    const logs = [encoded]
    // looking for notional but only school is present
    const result = readDecisionRequested(logs, 'notional')
    expect(result).toBeNull()
  })
})

describe('correlateDecisionFailed', () => {
  it('returns {failed:true, leg:"school"} when DecisionFailed requestId matches school requestId', () => {
    const encoded = makeDecisionFailedLog(SYNTHETIC_SCHOOL_REQUEST_ID, 2)
    const logs = [encoded]
    const result = correlateDecisionFailed(logs, SYNTHETIC_SCHOOL_REQUEST_ID, 'school')
    expect(result.failed).toBe(true)
    expect((result as { failed: true; leg: string }).leg).toBe('school')
  })

  it('returns {failed:false} when no DecisionFailed log matches', () => {
    const encoded = makeDecisionFailedLog(9999n, 2)
    const logs = [encoded]
    const result = correlateDecisionFailed(logs, SYNTHETIC_SCHOOL_REQUEST_ID, 'school')
    expect(result.failed).toBe(false)
  })

  it('returns {failed:false} when logs are empty', () => {
    const result = correlateDecisionFailed([], SYNTHETIC_SCHOOL_REQUEST_ID, 'school')
    expect(result.failed).toBe(false)
  })
})

describe('evaluateLegOutcome', () => {
  it('returns terminal:false while still polling within timeout (school leg not yet set)', () => {
    const result = evaluateLegOutcome({
      schoolSet: false,
      notionalSet: false,
      failedLeg: null,
      elapsedMs: 5_000,
      timeoutMs: LEG_TIMEOUT_MS,
    })
    expect(result.terminal).toBe(false)
  })

  it('returns terminal {ok:false, reason:"school timeout", spentSchoolStt:true} on silent no-show past LEG_TIMEOUT_MS', () => {
    const result = evaluateLegOutcome({
      schoolSet: false,
      notionalSet: false,
      failedLeg: null,
      elapsedMs: LEG_TIMEOUT_MS + 1,
      timeoutMs: LEG_TIMEOUT_MS,
    })
    expect(result.terminal).toBe(true)
    if (!result.terminal) throw new Error('expected terminal')
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('school timeout')
    expect(result.spentSchoolStt).toBe(true)
  })

  it('returns terminal {ok:false, reason:"school decision failed"} on correlated DecisionFailed for school', () => {
    const result = evaluateLegOutcome({
      schoolSet: false,
      notionalSet: false,
      failedLeg: 'school',
      elapsedMs: 10_000,
      timeoutMs: LEG_TIMEOUT_MS,
    })
    expect(result.terminal).toBe(true)
    if (!result.terminal) throw new Error('expected terminal')
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('school decision failed')
  })

  it('returns {ok:false, reason:"partial mandate", leg:"notional"} for schoolSet && !notionalSet past timeout', () => {
    const result = evaluateLegOutcome({
      schoolSet: true,
      notionalSet: false,
      failedLeg: null,
      elapsedMs: LEG_TIMEOUT_MS + 1,
      timeoutMs: LEG_TIMEOUT_MS,
    })
    expect(result.terminal).toBe(true)
    if (!result.terminal) throw new Error('expected terminal')
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('partial mandate')
    expect(result.leg).toBe('notional')
  })
})
