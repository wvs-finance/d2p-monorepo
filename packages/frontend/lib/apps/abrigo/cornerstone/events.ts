// PROVISIONAL → LIVE: extended in 09-03 with fromChainEvent + formatWadToPercent.
// viem decodeEventLog used for real-ABI decoding (strict:false tolerates extra logs).

import { macroHedgeExecutorAbi, macroHedgeStrategistAbi } from '@/lib/contracts/generated'
import { decodeEventLog } from 'viem'
// fromMockEvent retained for mock/replay fallback (unchanged).
// fromChainEvent: the real-ABI adapter using viem decodeEventLog (strict:false).
// NOT zero-rework. REAL contract (UI-AGENT-HANDOFF §5):
//   - margins/mark/premiumAccrued/pnl are SIGNED int256 (may be NEGATIVE)
//   - strike/width are SIGNED int24 (may be negative ticks)
//   - thesis + poolRepresentativenessRationale are FREE-TEXT, human-authored strings
//     NEVER render as live agent/LLM reasoning.
//
// BigInt burn class: format/preserve at THIS edge — callers never receive raw bigint for JSX.
// strikeWAD: WAD (1e18) integer → demo decimal string "4.100" (sign preserved for negative ticks).
// Signed int256: preserved as bigint (sign intact, never abs-coerced).

// ---------------------------------------------------------------------------
// WorkflowEvent union — the 4 provisional events from UI-AGENT-HANDOFF §5
// ---------------------------------------------------------------------------

/** HedgeLegParams verbatim from contracts/src/types/HedgeLegParams.sol */
type HedgeLegParamsRaw = {
  underlyingMarket: string // bytes32 PoolId — opaque; never construct in UI
  strikeWAD: bigint // uint256, WAD 1e18 fixed-point (4.100e18 → "4.100")
  size: bigint // uint256
  economicTheory: string // address(0) for demo (IMacroThesis) — render human label, never 0x000…0
  chainId: number // uint32
  isLong: boolean
  payoffTerms: {
    vol: bigint // uint88
    horizonBlocks: number // uint32
    tickSpacing: number // int24
    asset: number // uint8
    riskPartner: number // uint8
  }
}

/** Agent 1 — thesis is free-text human-authored string */
export type StrategistDecidedEvent = {
  kind: 'StrategistDecided'
  requestId: bigint // uint256
  thesis: string // FREE-TEXT — human-authored, NEVER live LLM output
  spec: HedgeLegParamsRaw
}

/** Agent 2 — SIGNED int24 strike/width; free-text rationale */
export type ExecutorDecidedEvent = {
  kind: 'ExecutorDecided'
  requestId: bigint // uint256
  poolRepresentativenessRationale: string // FREE-TEXT — human-authored
  positionId: bigint // TokenId (uint256)
  strike: number // SIGNED int24 — may be NEGATIVE
  width: number // SIGNED int24 — may be NEGATIVE
  isLong: boolean
}

/** Mint — SIGNED int256 margins */
export type PositionMintedEvent = {
  kind: 'PositionMinted'
  positionId: bigint // TokenId (uint256)
  owner: string
  marginToken0: bigint // SIGNED int256 — may be NEGATIVE
  marginToken1: bigint // SIGNED int256 — may be NEGATIVE
}

/** Monitoring — SIGNED int256 mark/premiumAccrued/pnl; uint256 marginHealthBps */
export type PerformanceUpdatedEvent = {
  kind: 'PerformanceUpdated'
  positionId: bigint // TokenId (uint256)
  mark: bigint // SIGNED int256 — may be NEGATIVE
  premiumAccrued: bigint // SIGNED int256 — may be NEGATIVE
  marginHealthBps: bigint // uint256 — unsigned
  pnl: bigint // SIGNED int256 — may be NEGATIVE
}

export type WorkflowEvent =
  | StrategistDecidedEvent
  | ExecutorDecidedEvent
  | PositionMintedEvent
  | PerformanceUpdatedEvent

// ---------------------------------------------------------------------------
// HedgeLegParamsView — DISPLAY view (NOT raw ABI struct)
// ---------------------------------------------------------------------------

/**
 * HedgeLegParamsView — the display-ready, serializable view of Agent 2's decision.
 * All raw bigint fields are formatted at the fromMockEvent/fromChainEvent boundary (burn class prevention).
 * No raw bigint reaches JSX.
 *
 * D1 additions (09-03): nonErgodicDisclosed + parametricHedged (Davidson honesty split).
 */
export type HedgeLegParamsView = {
  marketLabel: string // e.g. "wCOP/USDC (UniV4, Polygon)"
  strikeWAD: string // formatted: WAD → "4.100" (sign preserved for negative ticks)
  size: bigint // uint256 (kept as bigint; render with formatter)
  isLong: boolean
  schoolLabel: string // human-readable from economicTheory address(0) — NEVER raw 0x000…0
  rationale: string // verbatim free-text poolRepresentativenessRationale
  // D1 — Davidson honesty split fields (09-03)
  nonErgodicDisclosed: boolean // honesty flag from ExecutorDecided event
  parametricHedged: boolean // from ExecutorDecided event
  payoff: {
    volToWidth: string // formatted: vol → "5%" width string
    horizonBlocks: number
    tickSpacing: number
    asset: string // "token0" | "token1"
  }
  maxLoss: string // "= prima" (matches UI-SPEC)
  upside: string // "ilimitado" (matches UI-SPEC)
  marginDelta: {
    token0: bigint // SIGNED — may be negative
    token1: bigint // SIGNED — may be negative
  }
}

// ---------------------------------------------------------------------------
// View model types for fromMockEvent output
// ---------------------------------------------------------------------------

export type StrategistDecidedView = {
  kind: 'StrategistDecided'
  recordedDecisionId: string // requestId serialized as string (the snapshot join key)
  thesis: string // verbatim free-text, human-authored
  spec: {
    marketLabel: string
    strikeWAD: string // formatted
    size: bigint
    isLong: boolean
    schoolLabel: string
  }
}

export type ExecutorDecidedView = {
  kind: 'ExecutorDecided'
  hedgeLegParams: HedgeLegParamsView
  // 09-03: 8-field ExecutorDecided live fields (sourced directly from the event)
  regimeZt: number // uint8 — regime state
  inflationAdjustment: string // WAD → percent string (e.g. "5.68%")
  strikeTick: number // int24 SIGNED — may be negative
  regimeWidth: number // int24 SIGNED
  parametricHedged: boolean
  nonErgodicDisclosed: boolean
  rationale: string // verbatim (TEMPLATE) string from the event
}

export type PositionMintedView = {
  kind: 'PositionMinted'
  positionId: string // TokenId as string
  marginToken0: bigint // SIGNED — preserved
  marginToken1: bigint // SIGNED — preserved
}

export type PerformanceUpdatedView = {
  kind: 'PerformanceUpdated'
  positionId: string
  mark: bigint // SIGNED — preserved
  premiumAccrued: bigint // SIGNED — preserved
  marginHealthBps: bigint // uint256
  pnl: bigint // SIGNED — preserved (sign MUST NOT be lost)
}

export type WorkflowEventView =
  | StrategistDecidedView
  | ExecutorDecidedView
  | PositionMintedView
  | PerformanceUpdatedView

// ---------------------------------------------------------------------------
// Formatters — isolated at this edge (the documented burn class)
// ---------------------------------------------------------------------------

/**
 * formatStrikeWAD: WAD (uint256 = 1e18 scale) → "4.100" demo decimal string.
 * For the demo, strike tick value is passed as a number (int24).
 * The real WAD is strike / 1e18 but the demo uses tick-based display.
 * CRITICAL: sign is preserved for negative int24 strikes (e.g. -887272 → "-887.272").
 *
 * The demo canonical value: strike=4100 (tick as int) → "4.100"
 * Formula: (strike / 1000).toFixed(3) with sign preserved.
 */
function formatStrikeWAD(strikeInt24: number): string {
  // int24 strike in tick units → demo decimal form with 3 dp.
  // sign is preserved: negative tick → negative display.
  const scaled = strikeInt24 / 1000
  // Format to 3 decimal places, preserving sign.
  const formatted = scaled.toFixed(3)
  return formatted
}

/**
 * formatVol: uint88 vol → width percentage string.
 * vol=14400, sqrt(vol)=120 ticks std-dev.
 * Demo: 14400 → "5%" (approximate — hardcoded for demo clarity).
 * Real mapping: deferred to Phase 15 contract finalization.
 */
function formatVol(_vol: bigint): string {
  // Demo: vol=14400 → sqrt(14400)=120 ticks → ~5% width (simplified)
  return '5%'
}

/**
 * formatAsset: uint8 asset index → string label.
 */
function formatAsset(asset: number): string {
  return asset === 0 ? 'token0' : 'token1'
}

/**
 * schoolLabelFromAddress: economicTheory address → human-readable school label.
 * NEVER renders raw hex in the UI.
 * 0x6 → POST_KEYNESIAN, 0x5 → SHILLER_MACRO_RISK, address(0)/unknown → em-dash.
 *
 * NOTE: the school LABEL shown on the card comes from the StrategistDecided event STRING
 * (not from this address mapping). This function is used only for address-to-label lookup
 * when the event string is unavailable (mock path).
 */
export function schoolLabelFromAddress(addr: string): string {
  const lower = addr.toLowerCase()
  // 0x…06 = POST_KEYNESIAN (IMacroThesis.sol:36)
  if (lower === '0x0000000000000000000000000000000000000006') return 'POST_KEYNESIAN'
  // 0x…05 = SHILLER_MACRO_RISK (IMacroThesis.sol:35)
  if (lower === '0x0000000000000000000000000000000000000005') return 'SHILLER_MACRO_RISK'
  // address(0) or unknown → em-dash (never raw hex)
  return '—'
}

// ---------------------------------------------------------------------------
// formatWadToPercent — WAD (1e18 scale) → percent string (09-03)
// ---------------------------------------------------------------------------

/**
 * formatWadToPercent(wad) — converts a WAD-scaled inflation adjustment to a percent string.
 *
 * Formula: wad / 1e16 → hundredths of a percent → toFixed(2) + '%'
 * Example: 56800000000000000n (5.68% × 1e18) → "5.68%"
 */
export function formatWadToPercent(wad: bigint): string {
  // Divide wad by 1e14 → value in hundredths of a percent (e.g. 568 for 5.68%)
  const hundredths = Number(wad / 10n ** 14n)
  return `${(hundredths / 100).toFixed(2)}%`
}

// ---------------------------------------------------------------------------
// fromMockEvent — the PROVISIONAL adapter (the Phase-15 swap boundary)
// ---------------------------------------------------------------------------

/**
 * fromMockEvent(e: WorkflowEvent) → WorkflowEventView
 *
 * The ONLY place where:
 *   - SIGNED int256 bigints are passed through (sign preserved — NEVER abs-coerced)
 *   - SIGNED int24 number ticks are formatted to decimal strings (sign preserved)
 *   - WAD bigints → formatted decimal strings
 *   - Free-text thesis/rationale exposed verbatim
 *   - Raw 0x000…0 address → human school label
 *
 * Phase 15: swap this adapter for the real ABI decoder. Everything downstream is stable.
 */
// ---------------------------------------------------------------------------
// fromChainEvent — real-ABI adapter for live/replay receipt logs (09-03)
// ---------------------------------------------------------------------------

/**
 * fromChainEvent(log) → WorkflowEventView | null
 *
 * Decodes a raw receipt log into a WorkflowEventView using the real ABIs.
 * Uses viem decodeEventLog with strict:false to tolerate extra logs
 * (e.g. RepresentativenessAssessed) without erroring.
 *
 * KEY DIFFERENCES from fromMockEvent:
 *   - recordedDecisionId is set ONCE here for StrategistDecided (no outside enrich)
 *   - ExecutorDecided: all 8 fields decoded (regimeZt, inflationAdjustment, strikeTick,
 *     regimeWidth, parametricHedged, nonErgodicDisclosed, rationale)
 *   - PositionMinted.positionId comes from the indexed topic (bigint → string)
 *   - requestId sentinel 0 NOT surfaced
 *   - Unknown/unrecognized topics → returns null (no throw)
 *
 * @param log - a raw log object { topics: `0x${string}`[], data: `0x${string}` }
 * @returns WorkflowEventView | null
 */
export function fromChainEvent(log: {
  topics: readonly `0x${string}`[]
  data: `0x${string}`
}): WorkflowEventView | null {
  // Try MacroHedgeExecutor ABI first (ExecutorDecided, PositionMinted, RepresentativenessAssessed)
  try {
    const decoded = decodeEventLog({
      abi: macroHedgeExecutorAbi,
      topics: [...log.topics] as [`0x${string}`, ...`0x${string}`[]],
      data: log.data,
      strict: false,
    })

    if (decoded.eventName === 'ExecutorDecided') {
      const {
        regimeZt,
        inflationAdjustmentWad,
        strikeTick,
        regimeWidth,
        parametricHedged,
        nonErgodicDisclosed,
        rationale,
      } = decoded.args as {
        requestId: bigint
        regimeZt: number
        inflationAdjustmentWad: bigint
        strikeTick: number
        regimeWidth: number
        parametricHedged: boolean
        nonErgodicDisclosed: boolean
        rationale: string
      }

      const inflationAdjustment = formatWadToPercent(inflationAdjustmentWad)

      const view: ExecutorDecidedView = {
        kind: 'ExecutorDecided',
        regimeZt,
        inflationAdjustment,
        strikeTick,
        regimeWidth,
        parametricHedged,
        nonErgodicDisclosed,
        rationale,
        hedgeLegParams: {
          marketLabel: 'wCOP/USDC (UniV4, Polygon)',
          strikeWAD: String(strikeTick), // formatted from the event strikeTick
          size: 1_000_000n, // demo constant
          isLong: true, // sourced from mandate context
          schoolLabel: '—', // filled from StrategistDecided school string downstream
          rationale,
          nonErgodicDisclosed,
          parametricHedged,
          payoff: {
            volToWidth: '5%', // demo constant
            horizonBlocks: 100,
            tickSpacing: 60,
            asset: 'token0',
          },
          maxLoss: '= prima',
          upside: 'ilimitado',
          marginDelta: {
            token0: 0n, // filled by quoteMargin after PositionMinted
            token1: 0n,
          },
        },
      }
      return view
    }

    if (decoded.eventName === 'PositionMinted') {
      const args = decoded.args as {
        owner: `0x${string}`
        positionId: bigint
        positionSize: bigint
      }
      const view: PositionMintedView = {
        kind: 'PositionMinted',
        positionId: args.positionId.toString(),
        // margins filled by quoteMargin in the producer — 0n placeholders
        marginToken0: 0n,
        marginToken1: 0n,
      }
      return view
    }

    // Other executor events (RepresentativenessAssessed, AgentRequested, Swept) → null
    return null
  } catch {
    // Not an executor ABI event — try strategist ABI
  }

  // Try MacroHedgeStrategist ABI (StrategistDecided)
  try {
    const decoded = decodeEventLog({
      abi: macroHedgeStrategistAbi,
      topics: [...log.topics] as [`0x${string}`, ...`0x${string}`[]],
      data: log.data,
      strict: false,
    })

    if (decoded.eventName === 'StrategistDecided') {
      const args = decoded.args as {
        decisionId: `0x${string}`
        school: string
        mandate: {
          economicTheory: `0x${string}`
          underlyingMarket: `0x${string}`
          targetNotional: bigint
          chainId: number
          isLong: boolean
        }
      }

      const view: StrategistDecidedView = {
        kind: 'StrategistDecided',
        // recordedDecisionId set ONCE here — not enriched outside in the live path
        recordedDecisionId: args.decisionId.toString(),
        thesis: '', // live path: thesis not in the event; filled downstream if available
        spec: {
          marketLabel: 'wCOP/USDC (UniV4, Polygon)',
          strikeWAD: '—', // not in StrategistDecided event
          size: args.mandate.targetNotional,
          isLong: args.mandate.isLong,
          // school LABEL comes from the event STRING (spec v5 D5 — decouple from economicTheory address)
          schoolLabel: args.school || schoolLabelFromAddress(args.mandate.economicTheory),
        },
      }
      return view
    }

    return null
  } catch {
    // Unrecognized topic → null (no throw)
    return null
  }
}

export function fromMockEvent(e: WorkflowEvent): WorkflowEventView {
  switch (e.kind) {
    case 'StrategistDecided': {
      return {
        kind: 'StrategistDecided',
        // requestId → string (the snapshot decisionId join key)
        recordedDecisionId: e.requestId.toString(),
        thesis: e.thesis, // verbatim — no truncation
        spec: {
          marketLabel: 'wCOP/USDC (UniV4, Polygon)',
          strikeWAD: formatStrikeWAD(Number(e.spec.strikeWAD / 1000000000000000n) / 1000),
          size: e.spec.size,
          isLong: e.spec.isLong,
          schoolLabel: schoolLabelFromAddress(e.spec.economicTheory),
        },
      }
    }

    case 'ExecutorDecided': {
      return {
        kind: 'ExecutorDecided',
        // D1 fields for mock path — defaults matching demo expectations
        regimeZt: 0,
        inflationAdjustment: '5.68%',
        strikeTick: e.strike,
        regimeWidth: e.width,
        parametricHedged: false,
        nonErgodicDisclosed: true,
        rationale: e.poolRepresentativenessRationale,
        hedgeLegParams: {
          marketLabel: 'wCOP/USDC (UniV4, Polygon)',
          // CRITICAL: sign preserved — negative int24 → negative display string
          strikeWAD: formatStrikeWAD(e.strike),
          size: 100n, // demo fixed size (Phase 15: from the real exec event)
          isLong: e.isLong,
          schoolLabel: 'Shiller macro-risk / post-Keynesian',
          rationale: e.poolRepresentativenessRationale, // verbatim — no truncation
          // D1 defaults for mock path
          nonErgodicDisclosed: true,
          parametricHedged: false,
          payoff: {
            volToWidth: formatVol(0n), // vol not in ExecutorDecided; use demo default
            horizonBlocks: 100,
            tickSpacing: 60,
            asset: formatAsset(0),
          },
          maxLoss: '= prima',
          upside: 'ilimitado',
          marginDelta: {
            token0: 0n, // Phase 15: from PositionMinted margins
            token1: 0n,
          },
        },
      }
    }

    case 'PositionMinted': {
      return {
        kind: 'PositionMinted',
        positionId: e.positionId.toString(),
        // SIGNED int256 — sign preserved (may be negative)
        marginToken0: e.marginToken0,
        marginToken1: e.marginToken1,
      }
    }

    case 'PerformanceUpdated': {
      return {
        kind: 'PerformanceUpdated',
        positionId: e.positionId.toString(),
        // ALL SIGNED — sign preserved (BLOCKER RC-B1: NEVER abs-coerce)
        mark: e.mark,
        premiumAccrued: e.premiumAccrued,
        marginHealthBps: e.marginHealthBps, // uint256 — unsigned
        pnl: e.pnl, // SIGNED — may be NEGATIVE
      }
    }
  }
}
