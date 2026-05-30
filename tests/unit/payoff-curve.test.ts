import { generatePayoffData } from '@/lib/apps/abrigo/payoff'
// @vitest-environment node
// DEFI-04: Pure unit tests for the CFMM convex-hedge payoff function.
import { describe, expect, it } from 'vitest'

describe('generatePayoffData — shape', () => {
  it('returns exactly 100 points by default', () => {
    const data = generatePayoffData(1000, 0.5)
    expect(data).toHaveLength(100)
  })

  it('first point price is 0.3 * strike', () => {
    const data = generatePayoffData(1000, 0.5)
    expect(data[0]?.price).toBeCloseTo(300, 5)
  })

  it('last point price is 1.7 * strike', () => {
    const data = generatePayoffData(1000, 0.5)
    expect(data[99]?.price).toBeCloseTo(1700, 5)
  })
})

describe('generatePayoffData — payoff values', () => {
  it('every point with price >= strike has payoff === 0', () => {
    const strike = 1000
    const data = generatePayoffData(strike, 0.5)
    for (const point of data) {
      if (point.price >= strike) {
        expect(point.payoff).toBe(0)
      }
    }
  })

  it('a point with price < strike has payoff > 0 (slope * (strike - price))', () => {
    const strike = 1000
    const slope = 0.5
    const data = generatePayoffData(strike, slope)
    // First point is at 0.3 * strike = 300 — well below strike
    const first = data[0]
    expect(first?.price).toBeLessThan(strike)
    expect(first?.payoff).toBeCloseTo(slope * (strike - (first?.price ?? 0)), 5)
    expect(first?.payoff).toBeGreaterThan(0)
  })

  it('payoff formula: slope * Math.max(strike - price, 0)', () => {
    const strike = 500
    const slope = 2
    const data = generatePayoffData(strike, slope)
    for (const { price, payoff } of data) {
      expect(payoff).toBeCloseTo(slope * Math.max(strike - price, 0), 8)
    }
  })
})

describe('generatePayoffData — edge cases', () => {
  it('strike === 0 produces all payoffs === 0', () => {
    const data = generatePayoffData(0, 0.5)
    for (const { payoff } of data) {
      expect(payoff).toBe(0)
    }
  })

  it('slope === 0 produces all payoffs === 0 regardless of price', () => {
    const data = generatePayoffData(1000, 0)
    for (const { payoff } of data) {
      expect(payoff).toBe(0)
    }
  })

  it('custom points count is respected', () => {
    const data = generatePayoffData(1000, 0.5, 50)
    expect(data).toHaveLength(50)
  })
})
