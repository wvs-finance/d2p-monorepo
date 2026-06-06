// format.ts — shared formatting utilities for Abrigo / Somnia surfaces.
// Pure functions: no side effects, no imports from the app layer.
//
// HONESTY INVARIANTS:
//   - formatScaledPercent: scaledValue is a bigint where 568n = 5.68%.
//     Scale: 2 implicit decimal places (divide by 10000 for percent fraction).
//     Rendering uses Intl.NumberFormat — locale-aware at the format edge ONLY.
//   - formatTokenAmount: token amounts are signed bigint WAD (18 decimals).
//     Uses BigInt math to avoid floating-point precision loss.
//     Preserves sign. Trims trailing zeros but keeps at least 1 decimal digit.
//     Never emits raw bigint to JSX.

// ---------------------------------------------------------------------------
// formatScaledPercent
// scaledValue: bigint (e.g. 568n = 5.68%)
// Scale: 2 implied decimal places → raw = Number(scaledValue) / 100 → percent = raw / 100
// ---------------------------------------------------------------------------

export function formatScaledPercent(scaledValue: bigint, locale: string): string {
  // 568n → 5.68 → 0.0568 → format as "5.68%"
  const raw = Number(scaledValue) / 100
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(raw / 100)
}

// ---------------------------------------------------------------------------
// formatTokenAmount
// v: signed bigint WAD (18 decimals), e.g. -500000000000000000n → "-0.5"
// Uses BigInt arithmetic throughout to prevent precision loss.
// Output: signed decimal string with at least 1 decimal digit.
// ---------------------------------------------------------------------------

export function formatTokenAmount(v: bigint, decimals = 18): string {
  const divisor = 10n ** BigInt(decimals)
  const negative = v < 0n
  const abs = negative ? -v : v

  const integerPart = abs / divisor
  const fractionalRaw = abs % divisor

  // Pad fractional to `decimals` digits
  let fractionalStr = fractionalRaw.toString().padStart(decimals, '0')

  // Trim trailing zeros but keep at least 1 digit
  fractionalStr = fractionalStr.replace(/0+$/, '') || '0'

  const sign = negative ? '-' : ''
  return `${sign}${integerPart}.${fractionalStr}`
}
