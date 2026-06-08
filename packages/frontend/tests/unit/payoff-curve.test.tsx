// @vitest-environment jsdom
// DEFI-04: Pure unit tests for the CFMM convex-hedge payoff function
// PLUS a render assertion for PayoffDiagram (fixture params — test-only).
import '@testing-library/jest-dom/vitest'
import { generatePayoffData, generateSchematicConvexPayoff } from '@/lib/apps/abrigo/payoff'
import { render, screen } from '@testing-library/react'
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

// Wave-1: schematic convex generator assertions
describe('generateSchematicConvexPayoff — shape', () => {
  it('returns exactly 200 points by default', () => {
    const data = generateSchematicConvexPayoff(4000, 0)
    expect(data).toHaveLength(200)
  })

  it('all payoff values are >= 0 (floored at 0)', () => {
    const data = generateSchematicConvexPayoff(4000, 10)
    for (const point of data) {
      expect(point.payoff).toBeGreaterThanOrEqual(0)
    }
  })

  it('at least one payoff > 0 (curve is non-trivial with premium=0)', () => {
    const data = generateSchematicConvexPayoff(4000, 0)
    const positive = data.filter((p) => p.payoff > 0)
    expect(positive.length).toBeGreaterThan(0)
  })

  it('is convex: payoff increases as price moves away from center (prices far left of center)', () => {
    const center = 4000
    const data = generateSchematicConvexPayoff(center, 0)
    // At prices far below center the parabola has positive payoff
    // and each step away from center increases payoff (convexity)
    const belowCenter = data.filter((p) => p.price < center * 0.7)
    // Sort by ascending price so index 0 is furthest left
    belowCenter.sort((a, b) => a.price - b.price)
    for (let i = 0; i + 1 < belowCenter.length; i++) {
      // Moving from lower price to higher price: payoff DECREASES (toward minimum at center)
      const curr = belowCenter[i]
      const next = belowCenter[i + 1]
      expect(curr?.payoff).toBeGreaterThanOrEqual(next?.payoff ?? 0)
    }
  })

  it('custom points count is respected', () => {
    const data = generateSchematicConvexPayoff(4000, 0, 0.000005, 50)
    expect(data).toHaveLength(50)
  })

  it('is independent of generatePayoffData (does not call it internally)', () => {
    // Structural: generateSchematicConvexPayoff uses a parabola, not a kink.
    // At centerPrice the generatePayoffData kink would produce payoff=slope*(strike-strike)=0,
    // but the parabola also returns 0 at the center. Distinguish by checking the
    // curve shape is symmetric: payoff at center+1000 equals payoff at center-1000.
    const center = 4000
    const data = generateSchematicConvexPayoff(center, 0)
    const above = data.find((p) => Math.abs(p.price - (center + 1000)) < 50)
    const below = data.find((p) => Math.abs(p.price - (center - 1000)) < 50)
    // Both are symmetric distances from center — payoffs should be approximately equal
    expect(Math.abs((above?.payoff ?? 0) - (below?.payoff ?? 0))).toBeLessThan(5)
  })
})

// DEFI-04 render assertion — FIXTURE PARAMS (test-only; never on a public page).
// Lazily imported so the test file itself carries no direct recharts import at parse time.
describe('PayoffDiagram — render (DEFI-04)', () => {
  it('renders a container with role="img" and an aria-label', async () => {
    // Dynamic import keeps recharts out of the top-level parse graph in node env.
    const { PayoffDiagram } = await import('@/components/defi/PayoffDiagram')
    render(
      <PayoffDiagram
        data={generateSchematicConvexPayoff(4000, 0)}
        ariaLabel="Diagrama de rentabilidad esquemático"
        locale="es-CO"
        isSchematic
      />,
    )
    // The ResponsiveContainer is wrapped in a div with role="img"; aria-label must be set.
    const chart = screen.getByRole('img')
    expect(chart).toBeInTheDocument()
    expect(chart).toHaveAttribute('aria-label')
  })

  it('generatePayoffData drives the curve — kink at strike', () => {
    const data = generatePayoffData(1000, 0.5)
    // All points at/above strike have payoff 0 — this verifies the kink
    const aboveStrike = data.filter((p) => p.price >= 1000)
    expect(aboveStrike.length).toBeGreaterThan(0)
    for (const p of aboveStrike) {
      expect(p.payoff).toBe(0)
    }
    // Points below strike have positive payoff — curve is non-trivial
    const belowStrike = data.filter((p) => p.price < 1000)
    expect(belowStrike.length).toBeGreaterThan(0)
    for (const p of belowStrike) {
      expect(p.payoff).toBeGreaterThan(0)
    }
  })
})
