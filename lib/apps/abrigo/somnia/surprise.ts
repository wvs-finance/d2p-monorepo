// Somnia surprise math — BigInt space only.
// NEVER coerce to Number before subtraction (would lose precision above Number.MAX_SAFE_INTEGER).
// All inputs and outputs stay as bigint throughout; edge formatting happens at the call site.

/**
 * Compute the macro surprise: macroValue minus operator-supplied consensus.
 * Both operands and the result are bigint — no Number coercion anywhere.
 *
 * @example
 *   computeSurprise(568n, 500n) === 68n   // positive: print above consensus
 *   computeSurprise(568n, 900n) === -332n  // negative: print below consensus
 */
export function computeSurprise(macroValue: bigint, consensus: bigint): bigint {
  return macroValue - consensus
}

/**
 * Format a surprise value for display at the edge (after all BigInt math is done).
 * Applies a decimal shift of `scale` places and returns a locale-agnostic string.
 * e.g. formatSurprise(68n, 2) => "+0.68"   (68 / 100)
 *      formatSurprise(-332n, 2) => "-3.32"  (-332 / 100)
 *
 * NEVER called with Number-coerced input — only use on the already-computed bigint surprise.
 */
export function formatSurprise(surprise: bigint, scale = 2): string {
  const divisor = BigInt(10 ** scale)
  const sign = surprise < 0n ? '-' : '+'
  const abs = surprise < 0n ? -surprise : surprise
  const integer = abs / divisor
  const fraction = abs % divisor
  const fractionStr = fraction.toString().padStart(scale, '0')
  return `${sign}${integer}.${fractionStr}`
}
