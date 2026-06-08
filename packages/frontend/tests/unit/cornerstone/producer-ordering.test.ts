// producer-ordering.test.ts — Task 2 (09-03)
// Tests runWorkflowLive emit ordering, reverted-path safety, quoteMargin gating,
// and upstream ok:false short-circuit.
//
// All blockchain calls are mocked (no real network). Tests verify:
//   1. Emit ordering: StrategistDecided → submitting → pending → ExecutorDecided + PositionMinted → confirmed
//   2. Reverted receipt → emit 'reverted', NO quoteMargin call
//   3. quoteMargin is called only AFTER PositionMinted is decoded
//   4. ok:false upstream → NO mint attempted (idempotent)

import { runWorkflowLive } from '@/lib/apps/abrigo/cornerstone/workflow-engine'
import { macroHedgeExecutorAbi } from '@/lib/contracts/generated'
import {
  encodeAbiParameters as encodeAbi,
  encodeAbiParameters,
  encodeEventTopics,
  keccak256,
  toHex,
} from 'viem'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// ---------------------------------------------------------------------------
// Build fixture logs
// ---------------------------------------------------------------------------

function makeExecutorDecidedLog() {
  const topics = encodeEventTopics({
    abi: macroHedgeExecutorAbi,
    eventName: 'ExecutorDecided',
    args: { requestId: 0n },
  })
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
    [2, 56800000000000000n, 360360, 60, false, true, 'TEMPLATE: post-Keynesian rationale'],
  )
  return { topics: topics as `0x${string}`[], data }
}

// positionId from the anchor fixture
const POSITION_ID = BigInt('0x16057fa8064003c085e69280422')

function makePositionMintedLog() {
  const topics = encodeEventTopics({
    abi: macroHedgeExecutorAbi,
    eventName: 'PositionMinted',
    args: {
      owner: '0xdeadbeef00000000000000000000000000000001' as `0x${string}`,
      positionId: POSITION_ID,
    },
  })
  const data = encodeAbiParameters([{ name: 'positionSize', type: 'uint128' }], [1_000_000n])
  return { topics: topics as `0x${string}`[], data }
}

function makeRepresentativenessAssessedLog() {
  const topics = encodeEventTopics({
    abi: macroHedgeExecutorAbi,
    eventName: 'RepresentativenessAssessed',
    args: { requestId: 0n },
  })
  const data = encodeAbiParameters(
    [
      { name: 'rationale', type: 'string' },
      { name: 'representative', type: 'bool' },
    ],
    ['pool is liquid', true],
  )
  return { topics: topics as `0x${string}`[], data }
}

// ---------------------------------------------------------------------------
// Serialized mandate fixture (SHILLER → must be PKE-pinned)
// ---------------------------------------------------------------------------

const SERIALIZED_MANDATE = {
  economicTheory: '0x0000000000000000000000000000000000000005', // SHILLER
  underlyingMarket: '0x77636f7075736463000000000000000000000000000000000000000000000000',
  targetNotional: '10000',
  chainId: 137,
  isLong: true,
}

// ---------------------------------------------------------------------------
// Mock infrastructure
// ---------------------------------------------------------------------------

const FAKE_TX_HASH = '0xabc123def456' as `0x${string}`

function makeSuccessfulReceipt() {
  return {
    status: 'success' as const,
    transactionHash: FAKE_TX_HASH,
    logs: [
      makeRepresentativenessAssessedLog(), // tolerated (strict:false)
      makeExecutorDecidedLog(),
      makePositionMintedLog(),
    ],
  }
}

function makeRevertedReceipt() {
  return {
    status: 'reverted' as const,
    transactionHash: FAKE_TX_HASH,
    logs: [],
  }
}

// Packed BalanceDelta: amount0 = -1n, amount1 = 2n (simple test values)
const FAKE_BALANCE_DELTA = (-1n << 128n) | 2n

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('runWorkflowLive — ok:false upstream (no mint attempted)', () => {
  it('emits failure and skips the mint when upstream agent result is ok:false', async () => {
    const emittedKinds: string[] = []
    const emit = vi.fn((event: unknown) => {
      const e = event as { kind?: string; status?: string }
      emittedKinds.push(e.kind ?? e.status ?? 'unknown')
    })
    const writeContract = vi.fn()
    const publicClient = { waitForTransactionReceipt: vi.fn(), readContract: vi.fn() }

    // upstream Agent-1 result: ok:false (DecisionFailed / timeout)
    const upstreamFailure = {
      ok: false as const,
      reason: 'DecisionFailed',
      strategistView: null,
    }

    await runWorkflowLive({
      emit,
      writeContract,
      publicClient: publicClient as never,
      upstream: upstreamFailure,
      serializedMandate: SERIALIZED_MANDATE,
      deployment: {
        chainId: 31337,
        executor: '0xexecutor' as `0x${string}`,
        pool: '0xpool',
        riskManagement: '0xrisk',
        rpcUrl: 'http://localhost:8545',
        mintTxHash: '0xmint',
        mintedStrike: 360360,
        capturedAt: new Date().toISOString(),
        source: 'test',
      },
    })

    // writeContract should NOT be called — no mint attempted
    expect(writeContract).not.toHaveBeenCalled()
    expect(publicClient.readContract).not.toHaveBeenCalled()

    // A failure state should be emitted
    const hasFailure = emittedKinds.some(
      (k) => k === 'error' || k === 'DecisionFailed' || k === 'failed',
    )
    expect(hasFailure).toBe(true)
  })
})

describe('runWorkflowLive — reverted receipt (no quoteMargin call)', () => {
  it('emits reverted state and does NOT call quoteMargin on reverted receipt', async () => {
    const emittedStatuses: string[] = []
    const emit = vi.fn((event: unknown) => {
      const e = event as { kind?: string; status?: string }
      emittedStatuses.push(e.kind ?? e.status ?? 'unknown')
    })
    const writeContract = vi.fn().mockResolvedValue(FAKE_TX_HASH)
    const publicClient = {
      waitForTransactionReceipt: vi.fn().mockResolvedValue(makeRevertedReceipt()),
      readContract: vi.fn(),
    }

    const upstreamSuccess = {
      ok: true as const,
      strategistView: {
        kind: 'StrategistDecided' as const,
        recordedDecisionId: '0xdecision01',
        thesis: 'test thesis',
        spec: {
          marketLabel: 'wCOP/USDC',
          strikeWAD: '360.360',
          size: 10000n,
          isLong: true,
          schoolLabel: 'POST_KEYNESIAN',
        },
      },
    }

    await runWorkflowLive({
      emit,
      writeContract,
      publicClient: publicClient as never,
      upstream: upstreamSuccess,
      serializedMandate: SERIALIZED_MANDATE,
      deployment: {
        chainId: 31337,
        executor: '0xexecutor' as `0x${string}`,
        pool: '0xpool',
        riskManagement: '0xrisk',
        rpcUrl: 'http://localhost:8545',
        mintTxHash: '0xmint',
        mintedStrike: 360360,
        capturedAt: new Date().toISOString(),
        source: 'test',
      },
    })

    // quoteMargin must NOT have been called
    expect(publicClient.readContract).not.toHaveBeenCalled()

    // A reverted status should be emitted
    const hasReverted = emittedStatuses.some((k) => k === 'reverted')
    expect(hasReverted).toBe(true)
  })
})

describe('runWorkflowLive — successful mint (emit ordering + quoteMargin gating)', () => {
  it('emits StrategistDecided → submitting → pending → decoded logs → confirmed in order', async () => {
    const emittedEvents: { kind?: string; status?: string }[] = []
    const emit = vi.fn((event: unknown) => {
      emittedEvents.push(event as { kind?: string; status?: string })
    })
    const writeContract = vi.fn().mockResolvedValue(FAKE_TX_HASH)
    const publicClient = {
      waitForTransactionReceipt: vi.fn().mockResolvedValue(makeSuccessfulReceipt()),
      readContract: vi.fn().mockResolvedValue(FAKE_BALANCE_DELTA),
    }

    const upstreamSuccess = {
      ok: true as const,
      strategistView: {
        kind: 'StrategistDecided' as const,
        recordedDecisionId: '0xdecision01',
        thesis: 'test thesis',
        spec: {
          marketLabel: 'wCOP/USDC',
          strikeWAD: '360.360',
          size: 10000n,
          isLong: true,
          schoolLabel: 'POST_KEYNESIAN',
        },
      },
    }

    await runWorkflowLive({
      emit,
      writeContract,
      publicClient: publicClient as never,
      upstream: upstreamSuccess,
      serializedMandate: SERIALIZED_MANDATE,
      deployment: {
        chainId: 31337,
        executor: '0xexecutor' as `0x${string}`,
        pool: '0xpool',
        riskManagement: '0xrisk',
        rpcUrl: 'http://localhost:8545',
        mintTxHash: '0xmint',
        mintedStrike: 360360,
        capturedAt: new Date().toISOString(),
        source: 'test',
      },
    })

    const kinds = emittedEvents.map((e) => e.kind ?? e.status ?? 'unknown')

    // StrategistDecided must come before submitting
    const sdIdx = kinds.indexOf('StrategistDecided')
    const submittingIdx = kinds.indexOf('submitting')
    const pendingIdx = kinds.indexOf('pending')
    const confirmedIdx = kinds.indexOf('confirmed')

    expect(sdIdx).toBeGreaterThanOrEqual(0)
    expect(submittingIdx).toBeGreaterThan(sdIdx)
    expect(pendingIdx).toBeGreaterThan(submittingIdx)
    expect(confirmedIdx).toBeGreaterThan(pendingIdx)

    // quoteMargin must have been called (success path)
    expect(publicClient.readContract).toHaveBeenCalledTimes(1)
  })

  it('passes PKE-pinned mandate (0x…06) and correct legIndex/positionSize to writeContract', async () => {
    const emit = vi.fn()
    const writeContract = vi.fn().mockResolvedValue(FAKE_TX_HASH)
    const publicClient = {
      waitForTransactionReceipt: vi.fn().mockResolvedValue(makeSuccessfulReceipt()),
      readContract: vi.fn().mockResolvedValue(FAKE_BALANCE_DELTA),
    }

    const upstreamSuccess = {
      ok: true as const,
      strategistView: {
        kind: 'StrategistDecided' as const,
        recordedDecisionId: '0xdecision01',
        thesis: 'test thesis',
        spec: {
          marketLabel: 'wCOP/USDC',
          strikeWAD: '360.360',
          size: 10000n,
          isLong: true,
          schoolLabel: 'POST_KEYNESIAN',
        },
      },
    }

    await runWorkflowLive({
      emit,
      writeContract,
      publicClient: publicClient as never,
      upstream: upstreamSuccess,
      serializedMandate: SERIALIZED_MANDATE,
      deployment: {
        chainId: 31337,
        executor: '0xexecutor' as `0x${string}`,
        pool: '0xpool',
        riskManagement: '0xrisk',
        rpcUrl: 'http://localhost:8545',
        mintTxHash: '0xmint',
        mintedStrike: 360360,
        capturedAt: new Date().toISOString(),
        source: 'test',
      },
    })

    expect(writeContract).toHaveBeenCalledTimes(1)
    const callArgs = writeContract.mock.calls[0]?.[0]
    if (!callArgs) throw new Error('writeContract not called')

    // D4: chainId must be 31337
    expect(callArgs.args[0].chainId).toBe(31337)
    // v5 fix-2: economicTheory must be PKE (0x…06), NOT SHILLER (0x…05)
    expect(callArgs.args[0].economicTheory.toLowerCase()).toBe(
      '0x0000000000000000000000000000000000000006',
    )
    // legIndex = 0n
    expect(callArgs.args[1]).toBe(0n)
    // positionSize = 1_000_000n
    expect(callArgs.args[2]).toBe(1_000_000n)
  })

  it('calls quoteMargin ONLY after PositionMinted log is decoded (never before)', async () => {
    const callOrder: string[] = []
    const emit = vi.fn((event: unknown) => {
      const e = event as { kind?: string; status?: string }
      if (e.kind === 'PositionMinted') callOrder.push('PositionMinted')
    })
    const writeContract = vi.fn().mockImplementation(() => {
      callOrder.push('writeContract')
      return Promise.resolve(FAKE_TX_HASH)
    })
    const publicClient = {
      waitForTransactionReceipt: vi.fn().mockResolvedValue(makeSuccessfulReceipt()),
      readContract: vi.fn().mockImplementation(() => {
        callOrder.push('readContract:quoteMargin')
        return Promise.resolve(FAKE_BALANCE_DELTA)
      }),
    }

    const upstreamSuccess = {
      ok: true as const,
      strategistView: {
        kind: 'StrategistDecided' as const,
        recordedDecisionId: '0xdecision01',
        thesis: 'test thesis',
        spec: {
          marketLabel: 'wCOP/USDC',
          strikeWAD: '360.360',
          size: 10000n,
          isLong: true,
          schoolLabel: 'POST_KEYNESIAN',
        },
      },
    }

    await runWorkflowLive({
      emit,
      writeContract,
      publicClient: publicClient as never,
      upstream: upstreamSuccess,
      serializedMandate: SERIALIZED_MANDATE,
      deployment: {
        chainId: 31337,
        executor: '0xexecutor' as `0x${string}`,
        pool: '0xpool',
        riskManagement: '0xrisk',
        rpcUrl: 'http://localhost:8545',
        mintTxHash: '0xmint',
        mintedStrike: 360360,
        capturedAt: new Date().toISOString(),
        source: 'test',
      },
    })

    const mintIdx = callOrder.indexOf('PositionMinted')
    const quoteIdx = callOrder.indexOf('readContract:quoteMargin')
    // quoteMargin must come AFTER PositionMinted
    expect(mintIdx).toBeGreaterThanOrEqual(0)
    expect(quoteIdx).toBeGreaterThan(mintIdx)
  })
})
