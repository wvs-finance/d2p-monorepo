// lib/apps/abrigo/cornerstone/token-id.ts
//
// Panoptic TokenId strike extractor — leg 0 strike (int24) at bit offset 76.
//
// OFFSET DERIVATION (cross-checked against panoptic-sdk, NOT reverse-fit from fixture):
//   Source: panoptic-sdk/src/panoptic/v2/utils/option-encoding-v2.ts
//   Constants (from source):
//     POOL_ID_SIZE = 64n                      (line 37)
//     getLegOffsetByIndex(0n) = 0n * 48n = 0n (line 75: index * LEG_SIZE)
//     STRIKE_STARTING_BIT = 12n               (line 51: RISK_PARTNER_STARTING_BIT(10) + RISK_PARTNER_SIZE(2))
//   Total offset from tokenId LSB:
//     POOL_ID_SIZE + getLegOffset(0) + STRIKE_STARTING_BIT = 64 + 0 + 12 = 76
//   Verified: extractStrike(0x16057fa8064003c085e69280422n) === 360360
//             (recorded positionId from mint tx 0xfce415...42bbd, log 10)
//
// CRITICAL: the strike is a SIGNED int24 — sign-extend from bit 23 is required.
// Use BigInt.asIntN(24, ...) for correct negative tick handling.

/**
 * STRIKE_OFFSET — bit offset of the leg-0 strike field in a Panoptic TokenId.
 *
 * Derived from panoptic-sdk/src/panoptic/v2/utils/option-encoding-v2.ts:
 *   POOL_ID_SIZE(64) + getLegOffsetByIndex(0)(0) + STRIKE_STARTING_BIT(12) = 76
 *
 * NOT a reverse-fit from the 360360 fixture — derived from sdk source constants.
 */
const STRIKE_OFFSET = 76n

/**
 * STRIKE_SIZE — size of the strike field in bits (int24 = 24 bits).
 *
 * From panoptic-sdk option-encoding-v2.ts:
 *   STRIKE_SIZE = 24n (implied by line 53: STRIKE_STARTING_BIT + STRIKE_SIZE = WIDTH_STARTING_BIT)
 */
const STRIKE_SIZE = 24n

/**
 * extractStrike(positionId) — extracts the leg-0 strike (int24) from a Panoptic TokenId.
 *
 * @param positionId - the uint256 TokenId from PositionMinted.positionId
 * @returns the leg-0 strike as a signed JavaScript number (int24, may be negative)
 *
 * SIGN: BigInt.asIntN(24, ...) sign-extends from bit 23 for correct negative tick handling.
 * ANCHOR: extractStrike(0x16057fa8064003c085e69280422n) === 360360
 *         (recorded mint, mint tx 0xfce415...42bbd)
 */
export function extractStrike(positionId: bigint): number {
  // Extract the 24-bit strike field at offset 76
  const mask24 = (1n << STRIKE_SIZE) - 1n
  const raw24 = (positionId >> STRIKE_OFFSET) & mask24
  // Sign-extend from bit 23 (int24 → signed number)
  return Number(BigInt.asIntN(24, raw24))
}
