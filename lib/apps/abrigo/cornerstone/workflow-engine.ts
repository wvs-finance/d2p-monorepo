// workflow-engine.ts — deterministic timed mock WorkflowEngine producer.
//
// Emits WorkflowEvents in A1→A2→(user-gated)→mint order.
// Delays from 08-UI-SPEC Q4:
//   idle → a1:          600ms  (StrategistDecided)
//   a1 → a2_decision:  1800ms  (ExecutorDecided)
//   confirm gate:       user-gated (awaits confirm Promise — no auto-delay)
//   minting → done:    1200ms  (PositionMinted)
//
// The engine produces internal StoreEvent shapes (view models) matching
// what createWorkflowStore().emit() expects. The fromMockEvent adapter
// is applied BEFORE calling emit — the store sees display-ready views.

import { fromMockEvent } from './events'
import type { ExecutorDecidedEvent, PositionMintedEvent, StrategistDecidedEvent } from './events'
import { getPresetById } from './presets'

// ---------------------------------------------------------------------------
// Delay constants (from Q4 pacing table)
// ---------------------------------------------------------------------------

const DELAY_A1_MS = 600 // idle → a1 (StrategistDecided)
const DELAY_A2_MS = 1800 // a1 → a2_decision (ExecutorDecided)
const DELAY_MINT_MS = 1200 // minting → done (PositionMinted)

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ---------------------------------------------------------------------------
// runWorkflow — the deterministic mock producer
// ---------------------------------------------------------------------------

export type RunWorkflowOptions = {
  /** A Promise that resolves when the user clicks Confirm. User-gated — no auto-delay. */
  confirm: Promise<void>
}

/**
 * runWorkflow(presetId, emit, { confirm }) — emits WorkflowEvents in order.
 *
 * The `emit` callback receives view-ready objects (fromMockEvent already applied).
 * Use this directly with createWorkflowStore().emit.
 *
 * Emission order (Q4 pacing):
 *   1. StrategistDecided — after 600ms
 *   2. ExecutorDecided   — after 1800ms more
 *   3. (awaits confirm)  — user-gated, no auto-delay
 *   4. PositionMinted    — after 1200ms from confirm
 *
 * PerformanceUpdated is not emitted by runWorkflow (monitoring is if-time, deferred).
 */
export async function runWorkflow(
  presetId: string,
  emit: (event: unknown) => void,
  { confirm }: RunWorkflowOptions,
): Promise<void> {
  const preset = getPresetById(presetId)
  if (!preset) {
    throw new Error(`Unknown presetId: ${presetId}`)
  }

  // Step 1: idle → a1 after 600ms
  await sleep(DELAY_A1_MS)

  const strategistRaw: StrategistDecidedEvent = {
    kind: 'StrategistDecided',
    // recordedDecisionId = the real snapshot decisionId join key
    requestId: BigInt(preset.recordedDecisionId),
    thesis:
      'Hawkish monetary-policy surprise → COP appreciation. ' +
      'Inflation print exceeded consensus by 68bps; central bank bias shifts hawkish. ' +
      'Long cCOP/USD call provides convex protection if vol transmits.',
    spec: {
      underlyingMarket: '0xwcopusdc', // opaque bytes32 — pass-through
      strikeWAD: 4100n, // 4.100 (demo tick value passed to fromMockEvent formatter)
      size: 100n,
      economicTheory: 'address(0)', // IMacroThesis placeholder → fromMockEvent → human label
      chainId: 137,
      isLong: true,
      payoffTerms: { vol: 14400n, horizonBlocks: 100, tickSpacing: 60, asset: 0, riskPartner: 0 },
    },
  }

  const strategistView = fromMockEvent(strategistRaw)
  // Enrich with recordedDecisionId for the store's StrategistDecided branch
  const enriched = {
    ...strategistView,
    recordedDecisionId: preset.recordedDecisionId,
  }
  emit(enriched)

  // Step 2: a1 → a2_decision after 1800ms
  await sleep(DELAY_A2_MS)

  const executorRaw: ExecutorDecidedEvent = {
    kind: 'ExecutorDecided',
    requestId: BigInt(preset.recordedDecisionId),
    poolRepresentativenessRationale:
      'wCOP/USDC pool (UniV4, Polygon) is deeply liquid at this strike. ' +
      'Representativeness score: 0.91 (above threshold). ' +
      'Inflation adjustment confirmed: co/inflation-rate=5.68% ∈ [CPI band]. ' +
      'Proceeding with long cCOP/USD call at strike 4.100.',
    positionId: 999n,
    strike: 4100, // SIGNED int24 — positive for the ADD_LONG_GAMMA case
    width: 60,
    isLong: true,
  }

  const executorView = fromMockEvent(executorRaw)
  emit(executorView)

  // Step 3: await user confirm (no auto-delay — user-gated)
  await confirm

  // Step 4: minting → done after 1200ms
  await sleep(DELAY_MINT_MS)

  const mintRaw: PositionMintedEvent = {
    kind: 'PositionMinted',
    positionId: 999n,
    owner: '0xDemoOwner',
    marginToken0: -500000000000000000n, // SIGNED int256 — demo mock value (negative)
    marginToken1: 1000000000000000000n, // SIGNED int256 — demo mock value (positive)
  }

  const mintView = fromMockEvent(mintRaw)
  emit(mintView)
}
