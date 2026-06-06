// @vitest-environment node
// RED stub — cornerstone events + fromMockEvent adapter.
// Imports from lib/apps/abrigo/cornerstone/events (does NOT exist yet — intentional RED).
// Excluded from tsconfig until Task 2 GREEN commit.
//
// SIGNED-EDGE AC (BLOCKER RC-B1):
//   - PerformanceUpdated.pnl may be NEGATIVE int256 (bigint)
//   - ExecutorDecided.strike may be NEGATIVE int24 (number)
//   - fromMockEvent round-trips BOTH with sign + decimal preserved — never abs/coerced/stripped

import { describe, expect, it } from 'vitest'

// Dynamic import to let vitest (esbuild) load without tsc type-checking the missing module.
const MODULE = '@/lib/apps/abrigo/cornerstone/events'

// Minimal local type mirrors for test readability (NOT imported from the module)
type StrategistDecidedEvent = {
  kind: 'StrategistDecided'
  requestId: bigint
  thesis: string
  spec: {
    underlyingMarket: string
    strikeWAD: bigint
    size: bigint
    economicTheory: string
    chainId: number
    isLong: boolean
    payoffTerms: {
      vol: bigint
      horizonBlocks: number
      tickSpacing: number
      asset: number
      riskPartner: number
    }
  }
}

type ExecutorDecidedEvent = {
  kind: 'ExecutorDecided'
  requestId: bigint
  poolRepresentativenessRationale: string
  positionId: bigint
  strike: number // SIGNED int24
  width: number // SIGNED int24
  isLong: boolean
}

type PositionMintedEvent = {
  kind: 'PositionMinted'
  positionId: bigint
  owner: string
  marginToken0: bigint // SIGNED int256
  marginToken1: bigint // SIGNED int256
}

type PerformanceUpdatedEvent = {
  kind: 'PerformanceUpdated'
  positionId: bigint
  mark: bigint // SIGNED int256
  premiumAccrued: bigint // SIGNED int256
  marginHealthBps: bigint // uint256 (unsigned)
  pnl: bigint // SIGNED int256
}

type WorkflowEvent =
  | StrategistDecidedEvent
  | ExecutorDecidedEvent
  | PositionMintedEvent
  | PerformanceUpdatedEvent

type HedgeLegParamsView = {
  marketLabel: string
  strikeWAD: string
  size: bigint
  isLong: boolean
  schoolLabel: string
  rationale: string
  payoff: {
    volToWidth: string
    horizonBlocks: number
    tickSpacing: number
    asset: string
  }
  maxLoss: string
  upside: string
  marginDelta: {
    token0: bigint
    token1: bigint
  }
}

type EventsModule = {
  fromMockEvent: (e: WorkflowEvent) => unknown
}

describe('WorkflowEvent union — 4 required variants', () => {
  it('StrategistDecided can be constructed with thesis (free-text) and spec', () => {
    const ev: StrategistDecidedEvent = {
      kind: 'StrategistDecided',
      requestId: 4083729n,
      thesis: 'Hawkish monetary-policy surprise → COP appreciation',
      spec: {
        underlyingMarket: '0xabc',
        strikeWAD: 4100000000000000000n,
        size: 100n,
        economicTheory: '0x0000000000000000000000000000000000000000',
        chainId: 137,
        isLong: true,
        payoffTerms: { vol: 14400n, horizonBlocks: 100, tickSpacing: 60, asset: 0, riskPartner: 0 },
      },
    }
    expect(ev.kind).toBe('StrategistDecided')
    expect(ev.thesis).toBe('Hawkish monetary-policy surprise → COP appreciation')
  })

  it('ExecutorDecided carries SIGNED int24 strike and width', () => {
    const ev: ExecutorDecidedEvent = {
      kind: 'ExecutorDecided',
      requestId: 4083729n,
      poolRepresentativenessRationale: 'Pool liquidity depth representative of FX shock.',
      positionId: 999n,
      strike: -887272, // NEGATIVE int24 — must not be abs-coerced
      width: 60,
      isLong: true,
    }
    expect(ev.strike).toBe(-887272)
    expect(ev.strike).toBeLessThan(0)
  })

  it('PositionMinted carries SIGNED int256 marginToken0 and marginToken1', () => {
    const ev: PositionMintedEvent = {
      kind: 'PositionMinted',
      positionId: 999n,
      owner: '0xOwner',
      marginToken0: -500000000000000000n, // NEGATIVE
      marginToken1: 1000000000000000000n,
    }
    expect(ev.marginToken0).toBeLessThan(0n)
  })

  it('PerformanceUpdated carries SIGNED int256 pnl (may be NEGATIVE)', () => {
    const ev: PerformanceUpdatedEvent = {
      kind: 'PerformanceUpdated',
      positionId: 999n,
      mark: -100000n,
      premiumAccrued: -5000n,
      marginHealthBps: 9500n, // uint256 — unsigned
      pnl: -1234567890123456789n, // NEGATIVE int256
    }
    expect(ev.pnl).toBe(-1234567890123456789n)
    expect(ev.pnl).toBeLessThan(0n)
    expect(ev.marginHealthBps).toBeGreaterThan(0n) // uint256 stays positive
  })
})

describe('fromMockEvent — StrategistDecided → view with recordedDecisionId + verbatim thesis', () => {
  it('maps requestId to recordedDecisionId string', async () => {
    const { fromMockEvent } = (await import(MODULE)) as EventsModule
    const ev: StrategistDecidedEvent = {
      kind: 'StrategistDecided',
      requestId: 4083729n,
      thesis: 'Rate-hike surprise: COP/USD vol rises.',
      spec: {
        underlyingMarket: '0xabc',
        strikeWAD: 4100000000000000000n,
        size: 100n,
        economicTheory: '0x0000000000000000000000000000000000000000',
        chainId: 137,
        isLong: true,
        payoffTerms: { vol: 14400n, horizonBlocks: 100, tickSpacing: 60, asset: 0, riskPartner: 0 },
      },
    }
    const view = fromMockEvent(ev) as { recordedDecisionId: string; thesis: string }
    expect(typeof view.recordedDecisionId).toBe('string')
    expect(view.recordedDecisionId).toBe('4083729')
  })

  it('exposes thesis verbatim (no truncation)', async () => {
    const { fromMockEvent } = (await import(MODULE)) as EventsModule
    const longThesis = `${'A very long free-text thesis: '.repeat(10)}end.`
    const ev: StrategistDecidedEvent = {
      kind: 'StrategistDecided',
      requestId: 4083729n,
      thesis: longThesis,
      spec: {
        underlyingMarket: '0xabc',
        strikeWAD: 4100000000000000000n,
        size: 100n,
        economicTheory: '0x0000000000000000000000000000000000000000',
        chainId: 137,
        isLong: true,
        payoffTerms: { vol: 14400n, horizonBlocks: 100, tickSpacing: 60, asset: 0, riskPartner: 0 },
      },
    }
    const view = fromMockEvent(ev) as { thesis: string }
    expect(view.thesis).toBe(longThesis)
  })
})

describe('fromMockEvent — ExecutorDecided → HedgeLegParamsView with formatted strikeWAD + verbatim rationale', () => {
  it('strikeWAD renders as "4.100" (demo form) — NOT raw WAD integer string', async () => {
    const { fromMockEvent } = (await import(MODULE)) as EventsModule
    const ev: ExecutorDecidedEvent = {
      kind: 'ExecutorDecided',
      requestId: 4083729n,
      poolRepresentativenessRationale: 'wCOP/USDC pool is deeply liquid at this strike.',
      positionId: 999n,
      strike: 4100, // positive tick → "4.100" demo display form
      width: 60,
      isLong: true,
    }
    const view = fromMockEvent(ev) as { hedgeLegParams: HedgeLegParamsView }
    expect(view.hedgeLegParams.strikeWAD).toBe('4.100')
    // Must NOT be the raw WAD integer
    expect(view.hedgeLegParams.strikeWAD).not.toBe('4100000000000000000')
  })

  it('poolRepresentativenessRationale exposed verbatim (free-text, no truncation)', async () => {
    const { fromMockEvent } = (await import(MODULE)) as EventsModule
    const rationale =
      'Pool representativeness: deeply liquid. Adjusted for FX shock. Detailed analysis follows...'
    const ev: ExecutorDecidedEvent = {
      kind: 'ExecutorDecided',
      requestId: 4083729n,
      poolRepresentativenessRationale: rationale,
      positionId: 999n,
      strike: 4100,
      width: 60,
      isLong: true,
    }
    const view = fromMockEvent(ev) as { hedgeLegParams: HedgeLegParamsView }
    expect(view.hedgeLegParams.rationale).toBe(rationale)
  })

  it('schoolLabel is human-readable (NOT raw 0x000…0 address)', async () => {
    const { fromMockEvent } = (await import(MODULE)) as EventsModule
    const ev: ExecutorDecidedEvent = {
      kind: 'ExecutorDecided',
      requestId: 4083729n,
      poolRepresentativenessRationale: 'Some rationale.',
      positionId: 999n,
      strike: 4100,
      width: 60,
      isLong: true,
    }
    const view = fromMockEvent(ev) as { hedgeLegParams: HedgeLegParamsView }
    // Must be human label, never raw zero address
    expect(view.hedgeLegParams.schoolLabel).not.toMatch(/^0x0{20,}/)
    expect(view.hedgeLegParams.schoolLabel.length).toBeGreaterThan(0)
  })
})

describe('fromMockEvent — SIGNED-EDGE AC (BLOCKER RC-B1): negative int256 pnl + negative int24 strike round-trip', () => {
  it('NEGATIVE int256 pnl preserved with sign (not abs-coerced)', async () => {
    const { fromMockEvent } = (await import(MODULE)) as EventsModule
    const ev: PerformanceUpdatedEvent = {
      kind: 'PerformanceUpdated',
      positionId: 999n,
      mark: -100000n,
      premiumAccrued: -5000n,
      marginHealthBps: 9500n,
      pnl: -1234567890123456789n,
    }
    const view = fromMockEvent(ev) as { pnl: bigint | string }
    // The sign must be preserved — negative pnl stays negative (bigint or negative-string)
    const pnlVal = typeof view.pnl === 'bigint' ? view.pnl : BigInt(view.pnl as string)
    expect(pnlVal).toBeLessThan(0n)
    expect(pnlVal).toBe(-1234567890123456789n)
  })

  it('NEGATIVE int24 strike sign preserved — not abs, not NaN, not string-stripped of "-"', async () => {
    const { fromMockEvent } = (await import(MODULE)) as EventsModule
    const ev: ExecutorDecidedEvent = {
      kind: 'ExecutorDecided',
      requestId: 4083729n,
      poolRepresentativenessRationale: 'Some rationale.',
      positionId: 999n,
      strike: -887272, // NEGATIVE int24
      width: 60,
      isLong: false,
    }
    const view = fromMockEvent(ev) as { hedgeLegParams: HedgeLegParamsView }
    // strikeWAD is formatted, but the sign must not be stripped
    // The formatted string must contain '-' for negative strike
    expect(view.hedgeLegParams.strikeWAD).toContain('-')
    expect(view.hedgeLegParams.strikeWAD).not.toBe('NaN')
    // Must not be absolute value representation
    expect(view.hedgeLegParams.strikeWAD).not.toBe('887.272')
    expect(view.hedgeLegParams.strikeWAD).not.toBe('887272')
  })
})
