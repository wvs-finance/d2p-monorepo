// mandate-override.test.ts — Task 2 (09-03)
// Tests buildLiveMandate: chainId override (D4) + PKE-pinned economicTheory (v5 fix-2).
//
// Critical invariants:
//   - A live SHILLER (0x05) mandate MUST NOT pass through to the mint.
//     buildLiveMandate always pins economicTheory = 0x…06 (PKE) regardless of input.
//   - chainId is OVERRIDDEN to connectedChainId (31337) regardless of mandate input.
//   - targetNotional is carried as bigint from the serialized decimal string.
//   - underlyingMarket + isLong are carried verbatim.

import {
  MINT_ECONOMIC_THEORY,
  buildLiveMandate,
} from '@/lib/apps/abrigo/cornerstone/workflow-engine'
import { describe, expect, it } from 'vitest'

const SHILLER_MANDATE = {
  economicTheory: '0x0000000000000000000000000000000000000005' as const, // SHILLER — must be REPLACED
  underlyingMarket: '0x77636f7075736463000000000000000000000000000000000000000000000000' as const,
  targetNotional: '10000', // decimal string — must be bigint in output
  chainId: 137, // Polygon mainnet — must be OVERRIDDEN to 31337
  isLong: true,
}

const PKE_MANDATE = {
  economicTheory: '0x0000000000000000000000000000000000000006' as const, // PKE — also pinned
  underlyingMarket: '0x77636f7075736463000000000000000000000000000000000000000000000000' as const,
  targetNotional: '50000',
  chainId: 137,
  isLong: false,
}

describe('buildLiveMandate — D4 chainId override + v5 PKE pin', () => {
  it('overrides chainId to 31337 regardless of serialized mandate chainId', () => {
    const result = buildLiveMandate(SHILLER_MANDATE, 31337)
    expect(result.chainId).toBe(31337)
  })

  it('pins economicTheory to PKE (0x…06) even when mandate carries SHILLER (0x05)', () => {
    const result = buildLiveMandate(SHILLER_MANDATE, 31337)
    expect(result.economicTheory.toLowerCase()).toBe(MINT_ECONOMIC_THEORY.toLowerCase())
    // Must NOT be the SHILLER address
    expect(result.economicTheory.toLowerCase()).not.toBe(
      '0x0000000000000000000000000000000000000005',
    )
  })

  it('pins economicTheory to PKE even for a PKE mandate (idempotent)', () => {
    const result = buildLiveMandate(PKE_MANDATE, 31337)
    expect(result.economicTheory.toLowerCase()).toBe(MINT_ECONOMIC_THEORY.toLowerCase())
  })

  it('converts targetNotional decimal string to bigint', () => {
    const result = buildLiveMandate(SHILLER_MANDATE, 31337)
    expect(typeof result.targetNotional).toBe('bigint')
    expect(result.targetNotional).toBe(10000n)
  })

  it('carries underlyingMarket verbatim', () => {
    const result = buildLiveMandate(SHILLER_MANDATE, 31337)
    expect(result.underlyingMarket).toBe(SHILLER_MANDATE.underlyingMarket)
  })

  it('carries isLong verbatim', () => {
    const resultLong = buildLiveMandate(SHILLER_MANDATE, 31337)
    expect(resultLong.isLong).toBe(true)

    const resultShort = buildLiveMandate(PKE_MANDATE, 31337)
    expect(resultShort.isLong).toBe(false)
  })

  it('MINT_ECONOMIC_THEORY constant is 0x…06 (POST_KEYNESIAN sentinel)', () => {
    expect(MINT_ECONOMIC_THEORY.toLowerCase()).toBe('0x0000000000000000000000000000000000000006')
  })
})

describe('buildLiveMandate — resolveFromMandate arg guard (D4 + v5 regression)', () => {
  it('produces a mandate where chainId===31337 and economicTheory===PKE (write-spy simulation)', () => {
    // Simulate the spy that would assert on args[0] from writeContract
    const mandate = buildLiveMandate(SHILLER_MANDATE, 31337)

    // args[0] = mandate, args[1] = 0n (legIndex), args[2] = 1_000_000n (positionSize)
    const args = [mandate, 0n, 1_000_000n] as const

    expect(args[0].chainId).toBe(31337)
    expect(args[0].economicTheory.toLowerCase()).toBe('0x0000000000000000000000000000000000000006')
    expect(args[1]).toBe(0n)
    expect(args[2]).toBe(1_000_000n)
  })
})
