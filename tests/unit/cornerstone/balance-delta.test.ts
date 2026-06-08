// tests/unit/cornerstone/balance-delta.test.ts
//
// TDD RED → GREEN tests for the BalanceDelta decoder.
//
// GOVERNANCE (spec §2 M1, 09-RESEARCH Pattern 4):
//   - The low word (amount1) MUST be sign-extended at bit 127 via BigInt.asIntN(128, ...).
//   - The naive mask `& ((1n<<128n)-1n)` returns the WRONG result for negative amount1.
//   - Test with: positive, negative amount1, -1n (degenerate negative), -(1n<<127n) (min int128).
//
// toBalanceDelta helper encodes the packed int256 the same way Solidity does:
//   (BigInt.asUintN(128, amount1)) encodes the two's complement low word.

import { decodeBalanceDelta } from '@/lib/apps/abrigo/cornerstone/balance-delta'
import { describe, expect, it } from 'vitest'

// Helper: encode two int128 values into a single int256 (mirrors BalanceDelta.sol encoding)
function toBalanceDelta(amount0: bigint, amount1: bigint): bigint {
  // amount0 goes in the upper 128 bits (left-shift 128)
  // amount1 goes in the lower 128 bits as two's complement (unsigned encoding)
  const low128 = BigInt.asUintN(128, amount1) // two's complement of amount1
  return (amount0 << 128n) | low128
}

describe('decodeBalanceDelta', () => {
  it('decodes positive amounts correctly', () => {
    const packed = toBalanceDelta(100n, 50n)
    const result = decodeBalanceDelta(packed)
    expect(result.amount0).toBe(100n)
    expect(result.amount1).toBe(50n)
  })

  it('decodes negative amount1 correctly (the sign-extension test)', () => {
    const packed = toBalanceDelta(100n, -50n)
    const result = decodeBalanceDelta(packed)
    expect(result.amount0).toBe(100n)
    // CRITICAL: amount1 must be -50n, not a large positive number
    expect(result.amount1).toBe(-50n)
  })

  it('decodes amount1 = -1n (degenerate negative — the easiest bug to miss)', () => {
    const packed = toBalanceDelta(0n, -1n)
    const result = decodeBalanceDelta(packed)
    expect(result.amount0).toBe(0n)
    expect(result.amount1).toBe(-1n)
  })

  it('decodes amount1 = -(1n<<127n) — the minimum int128 (the hardest boundary)', () => {
    const minInt128 = -(1n << 127n)
    const packed = toBalanceDelta(0n, minInt128)
    const result = decodeBalanceDelta(packed)
    expect(result.amount0).toBe(0n)
    expect(result.amount1).toBe(minInt128)
  })

  it('decodes negative amount0 correctly', () => {
    const packed = toBalanceDelta(-100n, 50n)
    const result = decodeBalanceDelta(packed)
    expect(result.amount0).toBe(-100n)
    expect(result.amount1).toBe(50n)
  })

  it('decodes both amounts negative', () => {
    const packed = toBalanceDelta(-100n, -50n)
    const result = decodeBalanceDelta(packed)
    expect(result.amount0).toBe(-100n)
    expect(result.amount1).toBe(-50n)
  })

  it('decodes zero amounts', () => {
    const packed = toBalanceDelta(0n, 0n)
    const result = decodeBalanceDelta(packed)
    expect(result.amount0).toBe(0n)
    expect(result.amount1).toBe(0n)
  })
})
