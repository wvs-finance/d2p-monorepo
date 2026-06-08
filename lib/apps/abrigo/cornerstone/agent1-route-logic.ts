/**
 * lib/apps/abrigo/cornerstone/agent1-route-logic.ts
 *
 * Pure two-leg orchestration helpers for the /api/abrigo/agent1 server route.
 * No network — only log parsing, mandate serialization, timeout/failure logic.
 * Pure functions only. The route wires them in app/api/abrigo/agent1/route.ts.
 *
 * Leg numbers (from MacroHedgeStrategist.sol Leg enum):
 *   School   = 0
 *   Notional = 1
 *
 * REFRAME (v5): the live validator callbacks are currently silently absent.
 * The bounded per-leg timeout (LEG_TIMEOUT_MS) is the terminal path. The route
 * MUST never hang.
 */

import { macroHedgeStrategistAbi } from '@/lib/contracts/generated'
import { type Log, decodeEventLog } from 'viem'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Per-leg timeout (ms). Silent validator no-show terminates here. Pinned. */
export const LEG_TIMEOUT_MS = 120_000

// Leg enum values from MacroHedgeStrategist.sol
const LEG_SCHOOL = 0
const LEG_NOTIONAL = 1

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RawMandate = {
  economicTheory: `0x${string}`
  underlyingMarket: `0x${string}`
  targetNotional: bigint
  chainId: number
  isLong: boolean
}

/** Wire-safe mandate: no raw bigint / bytes32 across JSON boundary. */
export type SerializedMandate = {
  economicTheory: string
  underlyingMarket: string
  /** bigint → decimal string */
  targetNotional: string
  chainId: number
  isLong: boolean
}

export type AgentDecisionResult =
  | {
      ok: true
      somniaSchoolTx: string
      somniaNotionalTx: string
      school: string
      mandate: SerializedMandate
    }
  | {
      ok: false
      reason: string
      leg?: 'school' | 'notional'
      spentSchoolStt?: boolean
    }

type LegOutcomeState = {
  schoolSet: boolean
  notionalSet: boolean
  failedLeg: 'school' | 'notional' | null
  elapsedMs: number
  timeoutMs: number
}

type LegOutcomeResult =
  | { terminal: false }
  | {
      terminal: true
      ok: false
      reason: string
      leg?: 'school' | 'notional'
      spentSchoolStt?: boolean
    }

// ---------------------------------------------------------------------------
// serializeMandate
// ---------------------------------------------------------------------------

/**
 * Convert raw viem mandate (with bigint) to a wire-safe JSON shape.
 * chainId stays 137 (the Somnia Polygon ref) — the browser overrides it to
 * 31337 for the BuildBear fork per 09-03/D4. Do NOT override here.
 */
export function serializeMandate(m: RawMandate): SerializedMandate {
  return {
    economicTheory: m.economicTheory,
    underlyingMarket: m.underlyingMarket,
    targetNotional: m.targetNotional.toString(10),
    chainId: m.chainId,
    isLong: m.isLong,
  }
}

// ---------------------------------------------------------------------------
// Minimal log shape for decodeEventLog
// ---------------------------------------------------------------------------

type MinimalLog = Pick<Log, 'topics' | 'data'>

// ---------------------------------------------------------------------------
// parseStrategistDecided
// ---------------------------------------------------------------------------

/**
 * Parse the StrategistDecided log from a set of receipt logs.
 * Uses decodeEventLog with strict:false (tolerates unknown events per 09-RESEARCH Pattern 3).
 * Returns {school, mandate} or null if the log is absent.
 */
export function parseStrategistDecided(
  logs: MinimalLog[],
): { school: string; mandate: RawMandate } | null {
  for (const log of logs) {
    try {
      const decoded = decodeEventLog({
        abi: macroHedgeStrategistAbi,
        data: log.data as `0x${string}`,
        topics: log.topics as [`0x${string}`, ...`0x${string}`[]],
        strict: false,
      })
      if (decoded.eventName === 'StrategistDecided') {
        const args = decoded.args as {
          school: string
          mandate: {
            economicTheory: `0x${string}`
            underlyingMarket: `0x${string}`
            targetNotional: bigint
            chainId: number
            isLong: boolean
          }
        }
        return {
          school: args.school,
          mandate: {
            economicTheory: args.mandate.economicTheory,
            underlyingMarket: args.mandate.underlyingMarket,
            targetNotional: args.mandate.targetNotional,
            chainId: args.mandate.chainId,
            isLong: args.mandate.isLong,
          },
        }
      }
    } catch {
      // unrecognized event — skip
    }
  }
  return null
}

// ---------------------------------------------------------------------------
// readDecisionRequested
// ---------------------------------------------------------------------------

/**
 * Extract decisionId + requestId from the HedgeDecisionRequested log for the
 * specified leg. Returns null if the matching log is absent.
 * Uses strict:false per 09-RESEARCH Pattern 3.
 */
export function readDecisionRequested(
  logs: MinimalLog[],
  leg: 'school' | 'notional',
): { requestId: bigint; decisionId: `0x${string}` } | null {
  const targetLeg = leg === 'school' ? LEG_SCHOOL : LEG_NOTIONAL
  for (const log of logs) {
    try {
      const decoded = decodeEventLog({
        abi: macroHedgeStrategistAbi,
        data: log.data as `0x${string}`,
        topics: log.topics as [`0x${string}`, ...`0x${string}`[]],
        strict: false,
      })
      if (decoded.eventName === 'HedgeDecisionRequested') {
        const args = decoded.args as {
          requestId: bigint
          decisionId: `0x${string}`
          leg: number
        }
        if (args.leg === targetLeg) {
          return { requestId: args.requestId, decisionId: args.decisionId }
        }
      }
    } catch {
      // unrecognized event — skip
    }
  }
  return null
}

// ---------------------------------------------------------------------------
// correlateDecisionFailed
// ---------------------------------------------------------------------------

/**
 * Detect a terminal DecisionFailed event correlated to the captured per-leg requestId.
 * Returns {failed:true, leg} if matched, {failed:false} otherwise.
 */
export function correlateDecisionFailed(
  logs: MinimalLog[],
  requestId: bigint,
  leg: 'school' | 'notional',
): { failed: true; leg: 'school' | 'notional' } | { failed: false } {
  for (const log of logs) {
    try {
      const decoded = decodeEventLog({
        abi: macroHedgeStrategistAbi,
        data: log.data as `0x${string}`,
        topics: log.topics as [`0x${string}`, ...`0x${string}`[]],
        strict: false,
      })
      if (decoded.eventName === 'DecisionFailed') {
        const args = decoded.args as { requestId: bigint; status: number }
        if (args.requestId === requestId) {
          return { failed: true, leg }
        }
      }
    } catch {
      // unrecognized event — skip
    }
  }
  return { failed: false }
}

// ---------------------------------------------------------------------------
// evaluateLegOutcome
// ---------------------------------------------------------------------------

/**
 * Pure poll-loop decision function. Called each tick to determine whether to
 * continue polling or terminate.
 *
 * Terminal conditions:
 *   1. Correlated DecisionFailed for either leg → terminal failure
 *   2. Silent no-show past timeout (schoolSet=false, elapsedMs >= timeoutMs) → timeout terminal
 *   3. Partial mandate: schoolSet=true, notionalSet=false, elapsedMs >= timeoutMs → partial-mandate terminal
 *
 * While still within the timeout and no failure: {terminal:false}
 *
 * NEVER while(true) without calling this — the route calls it each tick and
 * breaks on terminal.
 */
export function evaluateLegOutcome(state: LegOutcomeState): LegOutcomeResult {
  const { schoolSet, notionalSet, failedLeg, elapsedMs, timeoutMs } = state

  // Correlated DecisionFailed → terminal
  if (failedLeg !== null) {
    return {
      terminal: true,
      ok: false,
      reason: `${failedLeg} decision failed`,
      leg: failedLeg,
    }
  }

  // Past timeout checks
  if (elapsedMs >= timeoutMs) {
    // Partial mandate: school arrived, notional did not
    if (schoolSet && !notionalSet) {
      return {
        terminal: true,
        ok: false,
        reason: 'partial mandate',
        leg: 'notional',
      }
    }
    // Silent no-show: school never arrived
    if (!schoolSet) {
      return {
        terminal: true,
        ok: false,
        reason: 'school timeout',
        spentSchoolStt: true,
      }
    }
  }

  // Still polling within timeout
  return { terminal: false }
}
