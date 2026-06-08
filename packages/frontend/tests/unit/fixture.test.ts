// @vitest-environment node
// Wave 0 RED stub — DEFI-08: LongGammaFixture bigint-as-string type guards.
// Imports from @/lib/apps/abrigo/fixture which does NOT exist yet (Wave 1 creates it).
// chunk.strike is resolved to the OTM offset string "2000":
//   strike = ((currentTick + STRIKE_OFFSET) / tickSpacing) * tickSpacing
//   STRIKE_OFFSET = 2000, tickSpacing = 10 (from PanopticDataSeam.fork.t.sol L41, L73)
//   No static absolute tick — depends on fork tick. Offset "2000" is the honest fixture value.
//   note: "+2000-tick OTM offset from the live fork tick, tickSpacing(10)-aligned:
//          ((currentTick+2000)/10)*10. No static absolute — depends on fork tick.
//          fork-test artifact to clear InvalidTickBound."
import { CCOP_USD_LONG_GAMMA_FIXTURE } from '@/lib/apps/abrigo/fixture'
import { describe, expect, it } from 'vitest'

describe('CCOP_USD_LONG_GAMMA_FIXTURE — bigint-as-string type guards', () => {
  it('forkBlock.value is a string (bigint serialized as string)', () => {
    expect(typeof CCOP_USD_LONG_GAMMA_FIXTURE.forkBlock.value).toBe('string')
  })

  it('pool.seededLiquidity.value is a string', () => {
    expect(typeof CCOP_USD_LONG_GAMMA_FIXTURE.pool.seededLiquidity.value).toBe('string')
  })

  it('chunk.strike.value is a string', () => {
    expect(typeof CCOP_USD_LONG_GAMMA_FIXTURE.chunk.strike.value).toBe('string')
  })

  it('chunk.width.value is a string', () => {
    expect(typeof CCOP_USD_LONG_GAMMA_FIXTURE.chunk.width.value).toBe('string')
  })

  it('pool.humanRate.value is a number', () => {
    expect(typeof CCOP_USD_LONG_GAMMA_FIXTURE.pool.humanRate.value).toBe('number')
  })
})

describe('CCOP_USD_LONG_GAMMA_FIXTURE — resolved values', () => {
  it('forkBlock.value === "46700000"', () => {
    expect(CCOP_USD_LONG_GAMMA_FIXTURE.forkBlock.value).toBe('46700000')
  })

  it('pool.humanRate.value === 4000 (bps)', () => {
    expect(CCOP_USD_LONG_GAMMA_FIXTURE.pool.humanRate.value).toBe(4000)
  })

  it('pool.tickSpacing.value === "10"', () => {
    expect(CCOP_USD_LONG_GAMMA_FIXTURE.pool.tickSpacing.value).toBe('10')
  })

  it('pool.seededLiquidity.value === "1000000000000000000000000"', () => {
    expect(CCOP_USD_LONG_GAMMA_FIXTURE.pool.seededLiquidity.value).toBe('1000000000000000000000000')
  })

  it('chunk.strike.value === "2000" (+2000-tick OTM offset, not a static absolute)', () => {
    // RESOLVED: chunk.strike is the OFFSET string "2000" — the honest fixture value.
    // Rationale: strike = ((currentTick+2000)/tickSpacing)*tickSpacing; no static absolute.
    // Wave 1 fixture.ts must carry value: "2000" with the note above.
    expect(CCOP_USD_LONG_GAMMA_FIXTURE.chunk.strike.value).toBe('2000')
  })

  it('chunk.width.value === "2" (width=2 → r=10 ticks, tickSpacing-aligned)', () => {
    expect(CCOP_USD_LONG_GAMMA_FIXTURE.chunk.width.value).toBe('2')
  })
})

describe('CCOP_USD_LONG_GAMMA_FIXTURE — FixtureValue shape', () => {
  const validTiers = ['fork-fixture', 'spec'] as const

  it('every FixtureValue has a tier in ["fork-fixture", "spec"]', () => {
    const allValues = [
      CCOP_USD_LONG_GAMMA_FIXTURE.forkBlock,
      CCOP_USD_LONG_GAMMA_FIXTURE.pool.seededLiquidity,
      CCOP_USD_LONG_GAMMA_FIXTURE.pool.humanRate,
      CCOP_USD_LONG_GAMMA_FIXTURE.pool.tickSpacing,
      CCOP_USD_LONG_GAMMA_FIXTURE.chunk.strike,
      CCOP_USD_LONG_GAMMA_FIXTURE.chunk.width,
    ]
    for (const fv of allValues) {
      expect(validTiers).toContain(fv.tier)
    }
  })

  it('every FixtureValue has a non-empty source string', () => {
    const allValues = [
      CCOP_USD_LONG_GAMMA_FIXTURE.forkBlock,
      CCOP_USD_LONG_GAMMA_FIXTURE.pool.seededLiquidity,
      CCOP_USD_LONG_GAMMA_FIXTURE.pool.humanRate,
      CCOP_USD_LONG_GAMMA_FIXTURE.pool.tickSpacing,
      CCOP_USD_LONG_GAMMA_FIXTURE.chunk.strike,
      CCOP_USD_LONG_GAMMA_FIXTURE.chunk.width,
    ]
    for (const fv of allValues) {
      expect(typeof fv.source).toBe('string')
      expect(fv.source.length).toBeGreaterThan(0)
    }
  })
})
