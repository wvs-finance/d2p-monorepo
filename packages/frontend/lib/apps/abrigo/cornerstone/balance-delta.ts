// lib/apps/abrigo/cornerstone/balance-delta.ts
//
// BalanceDelta decoder: unpacks a packed int256 into two signed int128 values.
//
// Source: v4-core/src/types/BalanceDelta.sol lines 56-71
//   - amount0 = sar(128, v)          — arithmetic right shift 128 preserves the sign
//   - amount1 = signextend(15, v)    — sign-extend at byte 15 = bit 127
//
// CRITICAL (09-RESEARCH Pitfall 1 / spec §2 M1):
//   The low word (amount1) MUST be sign-extended at bit 127.
//   The naive mask `rawInt256 & ((1n<<128n)-1n)` extracts the lower 128 bits as an
//   UNSIGNED value. For negative amount1, the high bit (bit 127) of the lower word is
//   set but BigInt does NOT automatically sign-extend — the result is a large positive.
//   BigInt.asIntN(128, maskedLow) is the ONLY correct sign gate.
//
//   Unit-tested with:
//     - amount1 = -50n (standard negative)
//     - amount1 = -1n  (degenerate negative — bit 127 and all lower bits set)
//     - amount1 = -(1n<<127n) (minimum int128 — only bit 127 set in lower word)

/**
 * decodeBalanceDelta(rawInt256) — decodes a packed BalanceDelta int256 into two signed int128s.
 *
 * @param rawInt256 - the packed BalanceDelta value (e.g. from quoteMargin return value)
 * @returns { amount0: bigint, amount1: bigint } — both signed (may be negative)
 */
export function decodeBalanceDelta(rawInt256: bigint): { amount0: bigint; amount1: bigint } {
  // amount0: upper 128 bits — arithmetic right shift 128 positions.
  // BigInt >> is arithmetic (sign-extending for signed values), matching Solidity's sar(128, v).
  const amount0 = BigInt.asIntN(128, rawInt256 >> 128n)

  // amount1: lower 128 bits — mask then sign-extend from bit 127.
  // Step 1: extract the lower 128 bits (unsigned)
  const mask128 = (1n << 128n) - 1n
  const low128 = rawInt256 & mask128
  // Step 2: sign-extend from bit 127 → bit 127 becomes the sign bit of a signed int128.
  // BigInt.asIntN(128, low128) is the ONLY safe sign gate here.
  const amount1 = BigInt.asIntN(128, low128)

  return { amount0, amount1 }
}
