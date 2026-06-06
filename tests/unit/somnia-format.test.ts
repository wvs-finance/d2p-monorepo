// Unit tests for lib/apps/abrigo/somnia/format.ts
// Covers formatScaledPercent and formatTokenAmount (including negative values).

import { formatScaledPercent, formatTokenAmount } from '@/lib/apps/abrigo/somnia/format'
import { describe, expect, it } from 'vitest'

describe('formatScaledPercent', () => {
  it('568n in "en" locale → "5.68%"', () => {
    expect(formatScaledPercent(568n, 'en')).toBe('5.68%')
  })

  it('568n in "es-CO" locale → Spanish percent form containing "5", "68", "%"', () => {
    const result = formatScaledPercent(568n, 'es-CO')
    expect(result).toMatch(/5/)
    expect(result).toMatch(/68/)
    expect(result).toMatch(/%/)
  })

  it('0n → "0.00%"', () => {
    expect(formatScaledPercent(0n, 'en')).toBe('0.00%')
  })

  it('1000n → "10.00%"', () => {
    expect(formatScaledPercent(1000n, 'en')).toBe('10.00%')
  })
})

describe('formatTokenAmount', () => {
  it('-500000000000000000n (WAD 1e18) → "-0.5"', () => {
    expect(formatTokenAmount(-500000000000000000n)).toBe('-0.5')
  })

  it('1000000000000000000n (WAD 1e18) → "1.0"', () => {
    expect(formatTokenAmount(1000000000000000000n)).toBe('1.0')
  })

  it('500000000000000000n → "0.5"', () => {
    expect(formatTokenAmount(500000000000000000n)).toBe('0.5')
  })

  it('0n → "0.0"', () => {
    expect(formatTokenAmount(0n)).toBe('0.0')
  })

  it('-1n (smallest WAD unit) → preserves negative sign', () => {
    const result = formatTokenAmount(-1n)
    expect(result.startsWith('-')).toBe(true)
    expect(result).toContain('0.')
  })

  it('custom decimals: formatTokenAmount(500n, 2) → "5.0"', () => {
    expect(formatTokenAmount(500n, 2)).toBe('5.0')
  })

  it('custom decimals negative: formatTokenAmount(-200n, 2) → "-2.0"', () => {
    expect(formatTokenAmount(-200n, 2)).toBe('-2.0')
  })
})
