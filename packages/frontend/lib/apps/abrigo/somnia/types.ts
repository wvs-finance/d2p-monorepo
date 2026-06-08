// Somnia reader types — rehydrated view shapes (all on-chain ints as bigint).
// B3 constraint: MacroPrintView has NO observedAt field.
// observedAt is STRUCTURALLY ALWAYS 0 by MacroOracle.sol contract design (hard-set in callback).
// The only timestamp is capturedAt (snapshot capture time), labeled "captured" — NEVER "observed".
// Setting observedAt on MacroPrintView would be fabrication / CROSS-09 violation.

/** HedgeAction labels — mapped from the on-chain uint8 enum. */
export type HedgeActionLabel = 'HOLD' | 'ADD_LONG_GAMMA' | 'REDUCE' | 'EXIT'

/** uint8 → HedgeActionLabel. Index matches the on-chain HedgeAction enum values. */
export const HEDGE_ACTION: Record<number, HedgeActionLabel> = {
  0: 'HOLD',
  1: 'ADD_LONG_GAMMA',
  2: 'REDUCE',
  3: 'EXIT',
}

/** ResponseStatus labels for DecisionFailed.status (uint8 enum from ISomniaAgents.sol). */
export type ResponseStatusLabel = 'None' | 'Pending' | 'Success' | 'Failed' | 'TimedOut'

/** uint8 → ResponseStatusLabel. Index matches ISomniaAgents.sol ResponseStatus enum. */
export const RESPONSE_STATUS: Record<number, ResponseStatusLabel> = {
  0: 'None',
  1: 'Pending',
  2: 'Success',
  3: 'Failed',
  4: 'TimedOut',
}

/**
 * Rehydrated hedge decision view.
 * All on-chain integers are bigint (rehydrated from bigint-as-string JSON at reader boundary).
 * pending === true when decidedAt === null (struct fields not yet set on-chain).
 */
export type HedgeDecisionView = {
  /** On-chain requestId (uint256 → bigint). */
  decisionId: string
  /** Human-readable action label mapped from the uint8 enum. */
  action: HedgeActionLabel
  /** sizeBps as bigint (uint256). MAX_SIZE_BPS = 10000. */
  sizeBps: bigint
  /** macroValue as bigint (int256). e.g. 568 = CPI 5.68%. */
  macroValue: bigint
  /** consensus as bigint (int256). Operator-supplied POC input — NOT market consensus. */
  consensus: bigint
  /** Block timestamp when the decision landed. null when decidedAt string was "0" (pending). */
  decidedAt: Date | null
  /** true when the decision is not yet fully settled on-chain (decidedAt was "0"). */
  pending: boolean
  /** Transaction hash of the HedgeDecisionMade event. */
  sourceTxHash: string
}

/**
 * Rehydrated macro print view.
 * NO observedAt field — the MacroOracle contract hard-sets observedAt = 0 in every callback.
 * The only timestamp is capturedAt (when the snapshot was taken), labeled "captured".
 * Rendering "observed at" from deliveredAt or any other field would be fabrication (CROSS-09).
 */
export type MacroPrintView = {
  /** keccak256 of the macro key string, as hex. */
  dataKey: string
  /** Human-readable macro key label. */
  dataKeyLabel: 'co/inflation-rate'
  /** Scaled macro value as bigint (int256). e.g. 568 = 5.68% when scale = 2. */
  scaledValue: bigint
  /** When this snapshot entry was captured (NOT the observation time — B3). */
  capturedAt: Date
  /** Transaction hash of the MacroReceived event, or null for the latest() read path. */
  sourceTxHash: string | null
}

/**
 * Provenance metadata returned by the snapshot reader seam.
 * subState 'recorded' = snapshot; 'live' = live RPC read (SOMNIA_LIVE flagged).
 */
export type SnapshotProvenance = {
  tier: 'testnet-agent'
  subState: 'recorded' | 'live'
  capturedAt: Date
  chainId: 50312
}

/**
 * FULL-FIDELITY decision trace view — ADDITIVE shape for the per-decision detail route.
 * Does NOT change HedgeDecisionView (existing consumers are unaffected).
 *
 * legSizeRequestId = the route key / snapshot decisionId (= the SIZE-leg requestId).
 * legActionRequestId = DERIVED as uint256(decisionId topic) — always real, never invented.
 * legActionTimestamp = null when the action-leg log falls outside the 1000-block getLogs window
 *   (renders as em-dash — honest fallback). NEVER fabricated.
 */
export type DecisionTraceView = {
  /** The route key — same as the snapshot decisionId (= SIZE-leg requestId). */
  requestId: string
  /** Human-readable action label. */
  action: HedgeActionLabel
  /** sizeBps as bigint. */
  sizeBps: bigint
  /** macroValue as bigint. */
  macroValue: bigint
  /** consensus as bigint (operator-supplied). */
  consensus: bigint
  /** Macro surprise: macroValue - consensus (BigInt). */
  surprise: bigint
  /** Deterministic built prompt reconstructed from actual+consensus (_buildPrompt). */
  builtPrompt: string
  /** SIZE-leg requestId string (= requestId / route key). */
  legSizeRequestId: string
  /**
   * ACTION-leg requestId — DERIVED as uint256(decisionId topic). Always real; never invented.
   * Available even when the action-leg log is outside the getLogs window.
   */
  legActionRequestId: string
  /** bytes32 decisionId topic string (padding preserved). */
  decisionId: string
  /** Block timestamp of the SIZE-leg HedgeDecisionRequested event. */
  legSizeTimestamp: Date
  /**
   * Block timestamp of the ACTION-leg HedgeDecisionRequested event.
   * null when the action-leg log falls outside the bounded 1000-block getLogs window.
   * Render as em-dash — NEVER fabricate a timestamp.
   */
  legActionTimestamp: Date | null
  /** Transaction hash of the HedgeDecisionMade event. */
  sourceTxHash: string
  /** When the decision settled. null when pending. */
  decidedAt: Date | null
}
