// tests/unit/cornerstone/token-id.test.ts
//
// TDD RED → GREEN tests for the Panoptic TokenId strike extractor.
//
// GOVERNANCE (spec v5, 09-RESEARCH Open Question 1, plan 09-01):
//   - The leg-0 strike bit offset is 76.
//   - CROSS-CHECKED against panoptic-sdk/src/panoptic/v2/utils/option-encoding-v2.ts:
//       POOL_ID_SIZE = 64n
//       getLegOffsetByIndex(0n) = 0n * 48n = 0n
//       STRIKE_STARTING_BIT = 12n (= RISK_PARTNER_STARTING_BIT(10) + RISK_PARTNER_SIZE(2))
//       total offset = POOL_ID_SIZE + getLegOffset(0) + STRIKE_STARTING_BIT = 64 + 0 + 12 = 76
//   - This is NOT a reverse-fit from the fixture — it is derived from the sdk source.
//
// RECORDED positionId ANCHOR:
//   From the mint tx receipt (log 10, pool address 0x0cc08e..., topics[2]):
//   positionId = 0x000000000000000000000000000000000000016057fa8064003c085e69280422
//   extractStrike(positionId) MUST return 360360.
//   Source: BuildBear mint tx 0xfce415...42bbd, receipt log 10 (PositionMinted event).

import { extractStrike } from '@/lib/apps/abrigo/cornerstone/token-id'
import { describe, expect, it } from 'vitest'

// The recorded positionId from the mint tx receipt (log 10, topics[2] stripped of padding).
// Source: BuildBear mint tx 0xfce415a600488617180eea9379bc3b117b0967faa1bcfcbd3dff94a61de42bbd
// Log 10: pool (0x0cc08e6ea0C37368Ab38e571BdE90C31Cc7Aab4A), topics[2] =
//   0x000000000000000000000000000000000000016057fa8064003c085e69280422
const RECORDED_POSITION_ID = 0x000000000000000000000000000000000000016057fa8064003c085e69280422n

describe('extractStrike', () => {
  it('extracts the recorded strike 360360 from the mint positionId (the anchor)', () => {
    const strike = extractStrike(RECORDED_POSITION_ID)
    expect(strike).toBe(360360)
  })

  it('returns 0 for a zero positionId', () => {
    expect(extractStrike(0n)).toBe(0)
  })

  it('handles a positive strike correctly', () => {
    // Encode a known strike value at the leg-0 offset and verify round-trip.
    // Offset: 76 bits from LSB (POOL_ID_SIZE=64 + getLegOffset(0)=0 + STRIKE_STARTING_BIT=12)
    // STRIKE_SIZE: 24 bits (int24)
    const knownStrike = 100n // positive int24
    const encoded = knownStrike << 76n
    expect(extractStrike(encoded)).toBe(100)
  })

  it('handles a negative strike (sign extension at bit 23)', () => {
    // int24: negative values have bit 23 set
    // -1 in int24 = 0xFFFFFF → encode as unsigned, decode should give -1
    const negativeStrike = -1
    // encode as 24-bit two's complement
    const encoded24bit = BigInt.asUintN(24, BigInt(negativeStrike))
    const encoded = encoded24bit << 76n
    expect(extractStrike(encoded)).toBe(-1)
  })
})
