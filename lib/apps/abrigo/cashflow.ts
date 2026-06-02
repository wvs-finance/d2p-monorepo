/**
 * lib/apps/abrigo/cashflow.ts
 *
 * Cash-flow arithmetic for the cCOP/USD Long-Gamma instrument.
 *
 * Residual formula (08-RESEARCH §residual):
 *   residual = max(survivingCollateral − wrapperMeteredDataCost, 0)
 *
 * IMPORTANT: streamia and commission are NOT parameters here. They are already
 * netted into survivingCollateral by the pool's share-burn mechanism.
 * See: abrigo-somnia/.planning/phases/08-longgammawrapper-cash-flow/08-RESEARCH.md §residual Pattern 7.
 *
 * wrapperMeteredDataCost may be null (Phase 9 unbuilt) → residual equals survivingCollateral.
 */

import type { FixtureValue } from '@/lib/apps/abrigo/fixture'

// ---------------------------------------------------------------------------
// computeResidual — 2-parameter contract (surviving, dataCost)
// ---------------------------------------------------------------------------

/**
 * Computes the residual collateral after the metered data cost.
 *
 * @param survivingCollateral - The collateral remaining after the position's lifecycle
 *   (streamia and commission are already netted by the pool's share-burn).
 *   Source: 08-RESEARCH §residual Pattern 7.
 * @param wrapperMeteredDataCost - The metered data cost charged by the wrapper.
 *   Pass null when Phase 9 (metered data) is not yet built — residual equals surviving.
 * @returns max(survivingCollateral − wrapperMeteredDataCost, 0n)
 */
export function computeResidual(
  survivingCollateral: bigint,
  wrapperMeteredDataCost: bigint | null,
): bigint {
  if (wrapperMeteredDataCost === null) {
    return survivingCollateral
  }
  return survivingCollateral > wrapperMeteredDataCost
    ? survivingCollateral - wrapperMeteredDataCost
    : 0n
}

// ---------------------------------------------------------------------------
// CashFlowBreakdown — informational shape for CashFlowWaterfall (Wave 2)
// ---------------------------------------------------------------------------

/**
 * Informational breakdown of cash flows for display in CashFlowWaterfall (Wave 2).
 * All numeric values use FixtureValue<number | null> — null renders as em-dash (anti-fishing).
 */
export interface CashFlowBreakdown {
  premium: FixtureValue<number | null>
  streamia: FixtureValue<number | null>
  commission: FixtureValue<number | null>
  dataCost: FixtureValue<number | null>
  /**
   * Human-readable note explaining the residual computation rule.
   * Cited in the waterfall UI so agents and humans can verify the arithmetic.
   */
  residualNote: string
}
