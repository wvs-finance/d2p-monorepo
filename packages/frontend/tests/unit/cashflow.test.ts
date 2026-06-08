// @vitest-environment node
// Wave 0 RED stub — DEFI-08: residual arithmetic for CashFlowWaterfall.
// Imports from @/lib/apps/abrigo/cashflow which does NOT exist yet (Wave 1 creates it).
// residual = max(survivingCollateral - wrapperMeteredDataCost, 0)
// streamia and commission are NOT parameters — only survivingCollateral + wrapperMeteredDataCost.
import { computeResidual } from '@/lib/apps/abrigo/cashflow'
import { describe, expect, it } from 'vitest'

describe('computeResidual — residual arithmetic', () => {
  it('wrapperMeteredDataCost null → residual equals survivingCollateral', () => {
    expect(computeResidual(1000n, null)).toBe(1000n)
  })

  it('residual = survivingCollateral - wrapperMeteredDataCost when cost < surviving', () => {
    expect(computeResidual(1000n, 200n)).toBe(800n)
  })

  it('residual is floored at 0n when cost exceeds survivingCollateral', () => {
    expect(computeResidual(100n, 500n)).toBe(0n)
  })

  it('zero surviving + zero cost → 0n', () => {
    expect(computeResidual(0n, 0n)).toBe(0n)
  })

  it('exact equality: survivingCollateral === wrapperMeteredDataCost → 0n', () => {
    expect(computeResidual(500n, 500n)).toBe(0n)
  })
})

describe('computeResidual — parameter contract', () => {
  it('takes exactly 2 parameters (survivingCollateral + wrapperMeteredDataCost)', () => {
    // streamia and commission are NOT subtracted inside computeResidual.
    // The function signature must be (survivingCollateral: bigint, wrapperMeteredDataCost: bigint | null).
    // Verify by asserting the function length (JS Function.length = number of declared params).
    expect(computeResidual.length).toBe(2)
  })
})
