// wrapper-adapter.ts — Single typed adapter chokepoint for LongGammaWrapper position reads.
// adaptWrapper is unreachable behind WRAPPER_DEPLOYED=false in Phase 7.
// Re-derive from the final ABI before the flag flips (ABI is mid-dev/moving).
//
// §2 mapping rules encoded HERE (never in JSX):
//   Live position/collateral: composed reads through pool()/ct0()/ct1() — NOT wrapper getters.
//     - position legs/health: via PanopticPool at wrapper.pool()
//     - surviving collateral: via convertToAssets(balanceOf(wrapper)) on ct0()/ct1()
//   stale baselines NEVER surfaced as current: lastSurviving0/1, deposited0/1
//   no realized-costs field — Phase 9, does not exist yet in LongGammaWrapper
//   ResidualEroded.cause typed as bytes32 string (advisory keccak256("INVOLUNTARY")) — NOT a 3-way enum
//   positionTokenId is the correct token id getter (NOT storedTokenId)
//
// PROCESS.ENV.WRAPPER_DEPLOYED is read LAZILY inside function bodies only (mirror reader.ts:139).
// This prevents the env check from running during SSG/build and keeps the snapshot path safe.

/**
 * WrapperPositionView — the stable typed view shape for display-only position data.
 *
 * ALLOWLIST: only fields that are safe to surface. Structurally EXCLUDES:
 *   - lastSurviving0/1 (stale baselines — snapshot values, not live surviving collateral)
 *   - deposited0/1 (initial deposit amounts — stale, not current)
 *   - realizedCosts (Phase 9 — does not exist yet)
 *
 * Composed reads (not wrapper getters):
 *   - legsHealth: via PanopticPool at wrapper.pool() — placeholder in Phase 7 (not deployed)
 *   - survivingCollateral0/1: via ct0/ct1 convertToAssets — placeholder in Phase 7
 */
export type WrapperPositionView = {
  /** Token id for the Panoptic long position. Getter: positionTokenId() (NOT storedTokenId). */
  positionTokenId: bigint
  /**
   * Position legs health — composed via pool() (PanopticPool).
   * null in Phase 7 (wrapper not deployed). Will be a structured value post-deploy.
   */
  legsHealth: unknown
  /**
   * Surviving collateral for token 0 — composed via ct0().convertToAssets(ct0().balanceOf(wrapper)).
   * null in Phase 7 (wrapper not deployed).
   */
  survivingCollateral0: bigint
  /**
   * Surviving collateral for token 1 — composed via ct1().convertToAssets(ct1().balanceOf(wrapper)).
   * null in Phase 7 (wrapper not deployed).
   */
  survivingCollateral1: bigint
  /**
   * ResidualEroded.cause as bytes32 hex string. null if no residual erosion event.
   * Advisory keccak256("INVOLUNTARY") — NOT a 3-way enum.
   */
  residualCause: string | null
  /** Sentinel: wrapper is deployed and this view reflects live chain reads. */
  deployed: true
}

/**
 * The not-deployed empty state returned when WRAPPER_DEPLOYED is unset (Phase 7 default).
 * Components check deployed===false and render the honest "not deployed" empty state.
 */
export type WrapperNotDeployedState = {
  deployed: false
}

/**
 * adaptWrapper(raw) — single §2 chokepoint for mapping raw wrapper reads to WrapperPositionView.
 * All §2 honesty rules are encoded here. Components import ONLY WrapperPositionView.
 * When the mid-dev ABI churns, only this function changes — never JSX.
 *
 * stale baselines (lastSurviving0/1, deposited0/1) are NEVER read from `raw` and NEVER in the
 * returned view. The function signature intentionally takes a loose Record so callers can pass
 * the raw viem multicall result; the output type is the strict allowlist.
 */
export function adaptWrapper(raw: Record<string, unknown>): WrapperPositionView {
  // positionTokenId: must be bigint
  const positionTokenId: bigint = typeof raw.positionTokenId === 'bigint' ? raw.positionTokenId : 0n

  // survivingCollateral0/1: composed via ct0/ct1.convertToAssets — placeholders from raw or 0n
  const survivingCollateral0: bigint =
    typeof raw.survivingCollateral0 === 'bigint' ? raw.survivingCollateral0 : 0n
  const survivingCollateral1: bigint =
    typeof raw.survivingCollateral1 === 'bigint' ? raw.survivingCollateral1 : 0n

  // legsHealth: composed via pool() — null until wrapper is deployed and reads are live
  const legsHealth: unknown = raw.legsHealth ?? null

  // residualCause: bytes32 string or null — NOT a 3-way enum
  const residualCauseRaw = raw.residualCause
  const residualCause: string | null =
    typeof residualCauseRaw === 'string' ? residualCauseRaw : null

  // NOTE: lastSurviving0/1, deposited0/1, and realizedCosts are deliberately NOT read here.
  // Their omission from the return is structural (they are not in WrapperPositionView).

  return {
    positionTokenId,
    legsHealth,
    survivingCollateral0,
    survivingCollateral1,
    residualCause,
    deployed: true,
  }
}

/**
 * getWrapperPosition() — gated reader.
 * Reads process.env.WRAPPER_DEPLOYED LAZILY (function body, never module scope).
 * Returns WrapperNotDeployedState when WRAPPER_DEPLOYED is unset (Phase 7 default).
 * Returns WrapperPositionView only when WRAPPER_DEPLOYED is truthy AND wrapper is deployed.
 *
 * Phase 7: always returns { deployed: false } since WRAPPER_DEPLOYED is unset.
 * No live RPC read executes in Phase 7.
 */
export function getWrapperPosition(): WrapperNotDeployedState | WrapperPositionView {
  // Lazy env read — NEVER at module top-level (mirror reader.ts:139 SOMNIA_LIVE pattern)
  if (!process.env.WRAPPER_DEPLOYED) {
    return { deployed: false }
  }

  // Live read path: only reached when WRAPPER_DEPLOYED is explicitly set.
  // Phase 7: this branch is unreachable by design.
  // adaptWrapper is re-derived from the final ABI before this flag ever flips.
  // Implementation stub: returns not-deployed until the ABI is finalized.
  return { deployed: false }
}
