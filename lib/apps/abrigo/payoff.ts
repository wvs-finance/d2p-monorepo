// Convex hedge payoff: slope * max(strike - price, 0)
// This is a put-style payoff — positive payoff when price falls below strike.
// "Convex" in the Abrigo context means positive gamma (∂²V/∂S² > 0),
// which this piecewise-linear function exhibits at the kink (strike).
// Pure module — no React import, no side effects.

export interface PayoffPoint {
  price: number
  payoff: number
}

export function generatePayoffData(strike: number, slope: number, points = 100): PayoffPoint[] {
  const lo = strike * 0.3
  const hi = strike * 1.7
  return Array.from({ length: points }, (_, i) => {
    const price = lo + (hi - lo) * (i / (points - 1))
    return { price, payoff: slope * Math.max(strike - price, 0) }
  })
}

/**
 * Schematic convex (positive-gamma) shape, net of premium — illustrative,
 * NOT a contract-derived settlement function.
 *
 * Generates a smooth parabolic payoff curve symmetric around centerPrice.
 * payoff(price) = max(curvature * (price - centerPrice)² - premium, 0)
 *
 * Use this for the simulated instrument display (Wave 2 SnapshotPoolPanel / PayoffDiagram).
 * It is INDEPENDENT of generatePayoffData — do not call that function here.
 */
export function generateSchematicConvexPayoff(
  centerPrice: number,
  premium: number,
  curvature = 0.000005,
  points = 200,
): PayoffPoint[] {
  const lo = centerPrice * 0.3
  const hi = centerPrice * 1.7
  return Array.from({ length: points }, (_, i) => {
    const price = lo + (hi - lo) * (i / (points - 1))
    const raw = curvature * (price - centerPrice) ** 2 - premium
    return { price, payoff: Math.max(raw, 0) }
  })
}
