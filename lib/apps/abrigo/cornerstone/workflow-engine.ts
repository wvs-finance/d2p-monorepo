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
//
// 09-03 additions:
//   MINT_ECONOMIC_THEORY — PKE sentinel (0x…06); v5 fix-2: always pinned on mint.
//   buildLiveMandate     — re-hydrates serialized mandate + D4 chainId override + PKE pin.
//   runWorkflowLive      — the live fork-mint producer (mocked viem; live run ⊘ DEFERRED 09-05).

import { macroHedgeExecutorAbi } from '@/lib/contracts/generated'
import type { BuildBearDeployment } from './artifact-loader'
import { decodeBalanceDelta } from './balance-delta'
import { fromChainEvent, fromMockEvent } from './events'
import type {
  ExecutorDecidedEvent,
  PositionMintedEvent,
  StrategistDecidedEvent,
  StrategistDecidedView,
} from './events'
import { getPresetById } from './presets'
import { extractStrike } from './token-id'

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
// ---------------------------------------------------------------------------
// MINT_ECONOMIC_THEORY — PKE sentinel (v5 fix-2)
// ---------------------------------------------------------------------------

/**
 * MINT_ECONOMIC_THEORY — the POST_KEYNESIAN economicTheory address (0x…06).
 *
 * v5 fix-2: always pin this on the live mint.
 * A live SHILLER (0x5) mandate routes a different/reverting strike.
 * The human school LABEL is sourced from the StrategistDecided event STRING (decoupled).
 */
export const MINT_ECONOMIC_THEORY = '0x0000000000000000000000000000000000000006' as const

// ---------------------------------------------------------------------------
// HedgeMandate — the viem-ready tuple for resolveFromMandate
// ---------------------------------------------------------------------------

type HedgeMandate = {
  economicTheory: `0x${string}`
  underlyingMarket: `0x${string}`
  targetNotional: bigint
  chainId: number
  isLong: boolean
}

// Serialized shape from the 09-02 Agent-1 route
type SerializedMandate = {
  economicTheory: string
  underlyingMarket: string
  targetNotional: string // decimal string — converted to bigint
  chainId: number
  isLong: boolean
}

// ---------------------------------------------------------------------------
// buildLiveMandate — re-hydrates serialized mandate with D4 + PKE pin
// ---------------------------------------------------------------------------

/**
 * buildLiveMandate(serialized, connectedChainId) — re-hydrates a serialized
 * HedgeMandate for the live resolveFromMandate call.
 *
 * D4: chainId OVERRIDDEN to connectedChainId (31337) — BEFORE resolveFromMandate.
 *     MacroHedgeExecutor.sol:365 reverts "No crosschain allowed yet" otherwise.
 *
 * v5 fix-2: economicTheory PINNED to MINT_ECONOMIC_THEORY (0x…06, PKE).
 *     A live SHILLER (0x05) mandate routes a different/reverting strike and
 *     breaks the 360360 anchor. NEVER pass a live SHILLER to resolveFromMandate.
 *     The human school LABEL is sourced from the StrategistDecided event STRING — decoupled.
 *
 * @param serialized - the serialized mandate from the Agent-1 route
 * @param connectedChainId - the connected fork block.chainid (should be 31337)
 * @returns a viem-ready HedgeMandate tuple with chainId + economicTheory overridden
 */
export function buildLiveMandate(
  serialized: SerializedMandate,
  connectedChainId: number,
): HedgeMandate {
  return {
    // PIN economicTheory = PKE (0x…06) — never carry SHILLER through to the mint
    economicTheory: MINT_ECONOMIC_THEORY,
    underlyingMarket: serialized.underlyingMarket as `0x${string}`,
    // Re-hydrate decimal string to bigint
    targetNotional: BigInt(serialized.targetNotional),
    // OVERRIDE chainId to the connected fork chainId (D4 — before resolveFromMandate)
    chainId: connectedChainId,
    isLong: serialized.isLong,
  }
}

// ---------------------------------------------------------------------------
// RunWorkflowLiveOptions — the live producer interface
// ---------------------------------------------------------------------------

type UpstreamResult =
  | { ok: true; strategistView: StrategistDecidedView }
  | { ok: false; reason: string; strategistView: null }

type RunWorkflowLiveOptions = {
  emit: (event: unknown) => void
  writeContract: (params: {
    address: `0x${string}`
    abi: typeof macroHedgeExecutorAbi
    functionName: 'resolveFromMandate'
    args: [HedgeMandate, bigint, bigint]
    chainId: 31337
  }) => Promise<`0x${string}`>
  publicClient: {
    waitForTransactionReceipt: (params: { hash: `0x${string}` }) => Promise<{
      status: 'success' | 'reverted'
      transactionHash: `0x${string}`
      logs: { topics: `0x${string}`[]; data: `0x${string}` }[]
    }>
    readContract: (params: {
      address: `0x${string}`
      abi: typeof macroHedgeExecutorAbi
      functionName: 'quoteMargin'
      args: [bigint, number]
    }) => Promise<bigint>
  }
  upstream: UpstreamResult
  serializedMandate: SerializedMandate
  deployment: BuildBearDeployment
}

// ---------------------------------------------------------------------------
// runWorkflowLive — the live fork-mint producer (mocked viem; live run ⊘ DEFERRED 09-05)
// ---------------------------------------------------------------------------

/**
 * runWorkflowLive(opts) — emits WorkflowEventView objects from the live fork mint.
 *
 * Sequence (spec §4a):
 *   a. ok:false upstream → emit failed, STOP (no mint)
 *   b. emit StrategistDecided (from upstream view — recordedDecisionId already set by fromChainEvent)
 *   c. emit { status:'submitting' } — before writeContract
 *   d. writeContract resolveFromMandate(mandate, 0n, 1_000_000n) with D4+PKE mandate
 *   e. emit { status:'pending', hash } — after hash returned
 *   f. waitForTransactionReceipt
 *   g. receipt.status==='reverted' → emit { status:'reverted' }, STOP (no quoteMargin)
 *   h. decode receipt.logs via fromChainEvent → emit ExecutorDecided + PositionMinted
 *   i. extractStrike(positionId) → quoteMargin(positionId, strike) → decodeBalanceDelta
 *   j. emit { status:'confirmed', margins }
 *
 * CRITICAL: quoteMargin is read STRICTLY AFTER a confirmed PositionMinted log is decoded.
 * NEVER reads before PositionMinted — would revert with PositionNotOwned.
 *
 * The live on-chain RUN is ⊘ DEFERRED (09-05) — this function is built + unit-proved only.
 * runWorkflow (mock) is UNCHANGED alongside this.
 */
export async function runWorkflowLive({
  emit,
  writeContract,
  publicClient,
  upstream,
  serializedMandate,
  deployment,
}: RunWorkflowLiveOptions): Promise<void> {
  // Step a: ok:false upstream → surface failure, no mint
  if (!upstream.ok) {
    emit({ kind: 'failed', reason: upstream.reason })
    return
  }

  try {
    // Step b: emit StrategistDecided (recordedDecisionId already set by fromChainEvent)
    emit(upstream.strategistView)

    // Step c: build mandate with D4 + PKE pin; emit submitting
    const mandate = buildLiveMandate(serializedMandate, 31337)
    emit({ status: 'submitting' })

    // Step d: writeContract resolveFromMandate(mandate, 0n, 1_000_000n)
    const hash = await writeContract({
      address: deployment.executor as `0x${string}`,
      abi: macroHedgeExecutorAbi,
      functionName: 'resolveFromMandate',
      args: [mandate, 0n, 1_000_000n],
      chainId: 31337,
    })

    // Step e: emit pending (real hash, no fake explorer)
    emit({ status: 'pending', hash })

    // Step f: wait for receipt
    const receipt = await publicClient.waitForTransactionReceipt({ hash })

    // Step g: reverted → emit reverted, STOP (no minted claim, no quoteMargin)
    if (receipt.status === 'reverted') {
      emit({ status: 'reverted', hash })
      return
    }

    // Step h: decode receipt logs — emit ExecutorDecided + PositionMinted
    let positionIdStr: string | null = null
    for (const log of receipt.logs) {
      const view = fromChainEvent({
        topics: log.topics as readonly `0x${string}`[],
        data: log.data as `0x${string}`,
      })
      if (view !== null) {
        emit(view)
        if (view.kind === 'PositionMinted') {
          positionIdStr = view.positionId
        }
      }
    }

    // Step i: quoteMargin STRICTLY after a confirmed PositionMinted
    if (positionIdStr !== null) {
      const positionId = BigInt(positionIdStr)
      const strike = extractStrike(positionId)
      const rawDelta = await publicClient.readContract({
        address: deployment.executor as `0x${string}`,
        abi: macroHedgeExecutorAbi,
        functionName: 'quoteMargin',
        args: [positionId, strike],
      })
      const { amount0, amount1 } = decodeBalanceDelta(rawDelta)

      // Step j: emit confirmed with margins
      emit({
        status: 'confirmed',
        positionId: positionIdStr,
        margins: { token0: amount0, token1: amount1 },
      })
    } else {
      // No PositionMinted decoded — should not happen on success, but guard idempotently
      emit({ status: 'confirmed', positionId: null, margins: null })
    }
  } catch (err) {
    // Catch RPC failures, revert errors, network errors
    emit({ kind: 'error', error: err instanceof Error ? err.message : String(err) })
  }
}

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
      'Proceeding with long cCOP/USD call at strike 360360 (tick 360360).',
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
