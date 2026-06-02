// reader.ts — Single typed API seam for Somnia agent data.
// DEFAULT: synchronous snapshot path (static JSON import, Turbopack-safe).
// LIVE: async live-read path, gated behind server-only SOMNIA_LIVE env var.
//
// Static import discipline (Turbopack-safe, matching lib/velite-shim.ts):
//   import snapshotData from './snapshot.json' (NOT require — must be static for bundler inlining)
// BigInt/Date rehydration at THIS boundary — callers receive native bigint/Date, never strings.
// NEVER read process.env.SOMNIA_LIVE at module scope — lazy (function-body only) to avoid
// evaluating env at import time and to keep the snapshot path server-bundle-safe.

import deployments from './deployments.json'
import snapshotData from './snapshot.json'
import { HEDGE_ACTION } from './types'
import type {
  HedgeActionLabel,
  HedgeDecisionView,
  MacroPrintView,
  SnapshotProvenance,
} from './types'

const VALID_ACTIONS = new Set<string>(['HOLD', 'ADD_LONG_GAMMA', 'REDUCE', 'EXIT'])

// ---------------------------------------------------------------------------
// Snapshot rehydration helpers
// ---------------------------------------------------------------------------

type RawDecision = (typeof snapshotData.decisions)[number]
type RawReceived = (typeof snapshotData.macro.received)[number]
type RawLatest = typeof snapshotData.macro.latest

function rehydrateDecision(raw: RawDecision): HedgeDecisionView {
  const decidedAtNum = Number(raw.decidedAt)
  // Snapshot stores action as the string label (e.g. "ADD_LONG_GAMMA").
  // Live path decodes from uint8 via HEDGE_ACTION[N]. Support both.
  let action: HedgeActionLabel
  if (VALID_ACTIONS.has(raw.action)) {
    action = raw.action as HedgeActionLabel
  } else {
    const mapped = HEDGE_ACTION[Number(raw.action)]
    if (!mapped) throw new Error(`Unknown action label for: ${raw.action}`)
    action = mapped
  }
  return {
    decisionId: raw.decisionId,
    action,
    sizeBps: BigInt(raw.sizeBps),
    macroValue: BigInt(raw.macroValue),
    consensus: BigInt(raw.consensus),
    decidedAt: decidedAtNum === 0 ? null : new Date(decidedAtNum * 1000),
    pending: decidedAtNum === 0,
    sourceTxHash: raw.sourceTxHash,
  }
}

function rehydrateReceived(raw: RawReceived): MacroPrintView {
  return {
    dataKey: raw.dataKey,
    // Cast: snapshot JSON has string; type requires the literal 'co/inflation-rate'
    dataKeyLabel: raw.dataKeyLabel as 'co/inflation-rate',
    scaledValue: BigInt(raw.scaledValue),
    capturedAt: new Date(raw.capturedAt),
    sourceTxHash: raw.sourceTxHash,
  }
}

function rehydrateLatest(raw: RawLatest): MacroPrintView {
  return {
    dataKey: raw.dataKey,
    // Cast: snapshot JSON has string; type requires the literal 'co/inflation-rate'
    dataKeyLabel: raw.dataKeyLabel as 'co/inflation-rate',
    scaledValue: BigInt(raw.scaledValue),
    capturedAt: new Date(snapshotData.capturedAt),
    sourceTxHash: raw.sourceTxHash,
  }
}

// Pre-rehydrate once at module load (synchronous; no network).
const SNAPSHOT_DECISIONS: HedgeDecisionView[] = snapshotData.decisions.map(rehydrateDecision)
const SNAPSHOT_LATEST: MacroPrintView = rehydrateLatest(snapshotData.macro.latest)
const SNAPSHOT_HISTORY: MacroPrintView[] = snapshotData.macro.received.map(rehydrateReceived)

// ---------------------------------------------------------------------------
// Snapshot path (default — synchronous, no network, deterministic for CI)
// ---------------------------------------------------------------------------

/**
 * Returns all hedge decisions from the snapshot.
 * BigInt rehydration is done at module load — this function is synchronous.
 * SOMNIA_LIVE must be UNSET for this path to be active (reader.ts default).
 */
export function getHedgeDecisions(_dataKey?: string): HedgeDecisionView[] {
  return SNAPSHOT_DECISIONS
}

/**
 * Returns the latest macro print from the snapshot.
 * scaledValue is bigint (e.g. 568n = CPI 5.68% with scale=2).
 * capturedAt is the snapshot capture time — NOT an "observed" timestamp (B3 constraint).
 */
export function getLatestMacroPrint(_dataKey?: string): MacroPrintView {
  return SNAPSHOT_LATEST
}

/**
 * Returns the MacroReceived history from the snapshot.
 */
export function getMacroHistory(_dataKey?: string): MacroPrintView[] {
  return SNAPSHOT_HISTORY
}

/**
 * Returns snapshot provenance metadata.
 * subState is always 'recorded' for the snapshot path.
 */
export function getSnapshotProvenance(): SnapshotProvenance {
  return {
    tier: 'testnet-agent',
    subState: 'recorded',
    capturedAt: new Date(snapshotData.capturedAt),
    chainId: 50312,
  }
}

// ---------------------------------------------------------------------------
// Live path (optional — async, server-only, gated on SOMNIA_LIVE env var)
// ---------------------------------------------------------------------------
// The SOMNIA_LIVE env var is read LAZILY inside function bodies only — never at module
// top level. This prevents the env check from running during SSG/build when SOMNIA_LIVE
// is not set, and keeps the snapshot path fully synchronous.
// ---------------------------------------------------------------------------

/**
 * Returns hedge decisions from the live Somnia RPC.
 * Only call this when process.env.SOMNIA_LIVE is truthy (server-only context).
 * Returns the same HedgeDecisionView shape as the snapshot path.
 */
export async function getHedgeDecisionsLive(_dataKey?: string): Promise<HedgeDecisionView[]> {
  // Lazy env read — NEVER at module top-level
  if (!process.env.SOMNIA_LIVE) {
    return getHedgeDecisions(_dataKey)
  }
  // Live read path: import dynamically to avoid bundling somniaClient in every route.
  const { somniaClient } = await import('./chain')
  const { HedgeStrategistAbi } = await import('./abi')
  // On-chain reads require block scanning or contract calls. The snapshot is the source of
  // truth for the 2 known decisions; live path defers to snapshot for POC.
  // This stub is the extension point for 06-03 (MCP tools) which may add live log scanning.
  void somniaClient
  void HedgeStrategistAbi
  return getHedgeDecisions(_dataKey)
}

/**
 * Returns the latest macro print from the live Somnia RPC.
 * Only call this when process.env.SOMNIA_LIVE is truthy (server-only context).
 */
export async function getLatestMacroPrintLive(_dataKey?: string): Promise<MacroPrintView> {
  // Lazy env read — NEVER at module top-level
  if (!process.env.SOMNIA_LIVE) {
    return getLatestMacroPrint(_dataKey)
  }
  const { somniaClient } = await import('./chain')
  const { MacroOracleAbi } = await import('./abi')
  const { keccak256, toBytes } = await import('viem')

  const dataKey = keccak256(toBytes(_dataKey ?? 'co/inflation-rate'))
  const result = await somniaClient.readContract({
    address: '0xAcA75144f644220f1dEAD5F989C350D8e0Cc983f',
    abi: MacroOracleAbi,
    functionName: 'latest',
    args: [dataKey],
  })

  // result is [dataKey, scaledValue, observedAt, deliveredAt]
  // B3: observedAt is ALWAYS 0 — do NOT use it as a timestamp
  const [, scaledValue] = result
  return {
    dataKey,
    dataKeyLabel: 'co/inflation-rate',
    scaledValue: BigInt(scaledValue),
    capturedAt: new Date(), // live read = now
    sourceTxHash: null,
  }
}

/**
 * Returns macro history from the live Somnia RPC.
 */
export async function getMacroHistoryLive(_dataKey?: string): Promise<MacroPrintView[]> {
  if (!process.env.SOMNIA_LIVE) {
    return getMacroHistory(_dataKey)
  }
  // Live history requires log scanning — deferred to 06-01/06-03.
  return getMacroHistory(_dataKey)
}

// ---------------------------------------------------------------------------
// Deployment metadata
// ---------------------------------------------------------------------------

export { deployments }
