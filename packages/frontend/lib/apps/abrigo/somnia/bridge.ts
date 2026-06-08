// bridge.ts — Pure mapping: HedgeDecisionView → PositionDeltaView.
// NO React. NO I/O. BigInt math only; Number coercion happens ONLY at the format edge.
//
// M6 HONESTY NOTE (CRITICAL):
//   `fractionOfMaxBps` is honest-real arithmetic on the real on-chain `sizeBps`:
//     sizeBps * 10000n / MAX_SIZE_BPS
//   However this MUST be labeled "illustrative"/"ilustrativo" in any UI that renders it,
//   because the module-1 cCOP/USD instrument is SIMULATED — it has not been deployed on-chain
//   and there is NO real position transaction. The LongGammaWrapper contract is fork-verified
//   but NOT deployed and has NO real position tx; it is NOT wired to the Somnia decision on-chain.
//   Therefore:
//     - `fractionOfMaxBps` is NOT a realized position delta.
//     - `fractionOfMaxBps` is NOT an executed position size.
//     - `fractionOfMaxBps` is NOT a dollar notional.
//   It is an ILLUSTRATIVE mapping of the real on-chain `sizeBps` to a fraction-of-MAX_SIZE_BPS
//   on a SIMULATED convex position. The copy consuming this MUST say "illustrative"/"ilustrativo"
//   and MUST NOT imply a realized or executed position.
//
// MAX_SIZE_BPS source: MacroHedgeStrategist.sol constant MAX_SIZE_BPS = 10_000 (10 000 basis points).
// Do NOT import the ABI here — just the constant with a source comment.

import type { HedgeActionLabel, HedgeDecisionView } from './types'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum position size in basis points (on-chain constant from MacroHedgeStrategist.sol). */
export const MAX_SIZE_BPS = 10000n

// ---------------------------------------------------------------------------
// PositionDeltaView — the illustrative schematic position delta shape
// ---------------------------------------------------------------------------

export type PositionDeltaView = {
  /** Direction mapped from HedgeAction: ADD_LONG_GAMMA→increase, REDUCE/EXIT→decrease, HOLD→flat. */
  direction: 'increase' | 'decrease' | 'flat'
  /** The raw sizeBps as bigint (direct from the on-chain HedgeDecisionMade event). */
  sizeBps: bigint
  /**
   * sizeBps * 10000n / MAX_SIZE_BPS — integer basis-points-of-max.
   * e.g. sizeBps=6800 → fractionOfMaxBps=6800n (i.e. 68.00% of MAX_SIZE_BPS).
   * This is honest-real arithmetic on the real on-chain sizeBps.
   * It is labeled "illustrative" because the instrument is SIMULATED (see M6 note above).
   * ALWAYS bigint — no Number coercion before or during the division.
   */
  fractionOfMaxBps: bigint
  /**
   * Literal flag — always true for this bridge.
   * Components MUST use this flag to enforce the "illustrative" label (M6).
   */
  schematic: true
}

// ---------------------------------------------------------------------------
// Action → direction mapping
// ---------------------------------------------------------------------------

const ACTION_DIRECTION: Record<HedgeActionLabel, PositionDeltaView['direction']> = {
  ADD_LONG_GAMMA: 'increase',
  REDUCE: 'decrease',
  EXIT: 'decrease',
  HOLD: 'flat',
}

// ---------------------------------------------------------------------------
// decisionToPositionDelta — pure BigInt mapping
// ---------------------------------------------------------------------------

/**
 * Map a HedgeDecisionView to an illustrative PositionDeltaView.
 *
 * M6: fractionOfMaxBps is honest-real arithmetic (sizeBps * 10000n / MAX_SIZE_BPS) on
 * the real on-chain sizeBps. It is NOT a realized or executed position size — it is an
 * ILLUSTRATIVE mapping because the instrument is SIMULATED. The `schematic: true` flag
 * signals to consumers that this is an illustrative value (not a realized position delta).
 *
 * BigInt invariant: NEVER coerce sizeBps or MAX_SIZE_BPS to Number before the division.
 * Number.MAX_SAFE_INTEGER is 2^53-1 ≈ 9e15; on-chain uint256 values can exceed this.
 * All arithmetic stays in BigInt space; Number coercion happens only in formatFractionOfMax.
 */
export function decisionToPositionDelta(decision: HedgeDecisionView): PositionDeltaView {
  const direction = ACTION_DIRECTION[decision.action]
  // BigInt-space fraction: sizeBps * 10000n / MAX_SIZE_BPS
  // e.g. 6800n * 10000n / 10000n = 6800n (which represents 68.00%)
  const fractionOfMaxBps = (decision.sizeBps * 10000n) / MAX_SIZE_BPS
  return {
    direction,
    sizeBps: decision.sizeBps,
    fractionOfMaxBps,
    schematic: true,
  }
}

// ---------------------------------------------------------------------------
// formatFractionOfMax — edge formatter (Number coercion happens ONLY here)
// ---------------------------------------------------------------------------

/**
 * Format fractionOfMaxBps as a percentage string at the render edge.
 * e.g. 6800n → "68%" (6800 / 100 = 68%)
 *
 * fractionOfMaxBps is integer basis-points-of-max (fractionOfMaxBps * 100 / 10000 = percentage).
 * Simplified: fractionOfMaxBps / 100 = percentage integer.
 * Number coercion is acceptable here because fractionOfMaxBps ≤ MAX_SIZE_BPS = 10000n,
 * which is far below Number.MAX_SAFE_INTEGER.
 */
export function formatFractionOfMax(fractionBps: bigint): string {
  // fractionBps is in "bps-of-max": 6800n means 6800 / 10000 = 68%.
  // To get the percentage: fractionBps / 100 (since 10000 bps-of-max = 100%).
  const percent = Number(fractionBps) / 100
  // Render as integer percentage (no decimal places for schematic values)
  return `${Math.round(percent)}%`
}
