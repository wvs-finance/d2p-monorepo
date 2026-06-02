// HedgeDecisionBridge — RSC bridge card: surprise→action@sizeBps→schematic position delta.
// RSC — no 'use client'. Pure presentational; all translated strings threaded from RSC parent.
//
// HONESTY INVARIANTS (CROSS-09 / M4 / M6):
//   - consensus is labeled "operator-supplied" — NEVER market consensus (M4).
//   - surprise appears ONLY within the card subtree that also contains the operator caveat.
//   - The position delta is labeled "illustrative"/"ilustrativo" — it is NOT a realized or
//     executed position; the instrument is SIMULATED (no deployed contract, no real position tx).
//   - `fractionOfMaxBps` is honest-real BigInt arithmetic (sizeBps * 10000n / MAX_SIZE_BPS)
//     on the real on-chain sizeBps, but it is labeled illustrative because the instrument
//     is simulated. M6 copy must say "illustrative"/"ilustrativo". NEVER "executed"/"realized".
//   - No dollar notional. No current price. Only: macroValue (CPI), consensus, surprise,
//     sizeBps, and the schematic fraction-of-max. (M6 — never fabricate a notional)
//   - testnet-agent ProvenancePill: NEUTRAL token (never green/emerald/status-pass). CROSS-09.
//   - null / pending fields → em-dash ("—"), never 0. Anti-fishing discipline.
//   - If no ADD_LONG_GAMMA decision exists, render honest empty state (never fabricate one).
//   - M4: consensus is labeled operator-supplied (not verified by market/validators).
//
// Mount point: INSIDE the kind==='simulated' branch of the instrument detail page only.
// The bridge is NEVER mounted on the live path (no aggregateAllChains called here).

import { ProvenancePill } from '@/components/defi/ProvenanceBadge'
import type { SimulatedInstrument } from '@/lib/apps/abrigo/instruments'
import { decisionToPositionDelta, formatFractionOfMax } from '@/lib/apps/abrigo/somnia/bridge'
import { getHedgeDecisions } from '@/lib/apps/abrigo/somnia/reader'
import { computeSurprise, formatSurprise } from '@/lib/apps/abrigo/somnia/surprise'
import type { HedgeActionLabel } from '@/lib/apps/abrigo/somnia/types'

// ---------------------------------------------------------------------------
// BridgeStrings — all visible copy threaded from RSC parent (no getTranslations inside)
// ---------------------------------------------------------------------------

export interface BridgeStrings {
  /** Card section heading, e.g. "De la sorpresa macro a la posición" */
  heading: string
  macroLabel: string
  consensusLabel: string
  /** The operator-supplied caveat sentence (M4) — must appear adjacent to consensus row. */
  consensusCaveat: string
  surpriseLabel: string
  /** Human-readable action labels, one per HedgeActionLabel. */
  actionLabel: Record<HedgeActionLabel, string>
  sizeBpsLabel: string
  /** Label for the schematic position-delta row, e.g. "Delta ilustrativo de posición" */
  deltaLabel: string
  /**
   * Marker text that appears next to the fraction value, e.g. "ilustrativo".
   * M6: this marker MUST be visible in the rendered output (not aria-only).
   */
  illustrativeMarker: string
  provenanceLabel: string
  provenanceAriaLabel: string
  /** em-dash fallback for null/missing fields. */
  emptyState: string
  /** Honest empty-state message when no ADD_LONG_GAMMA decision exists. */
  emptyGamma: string
}

// ---------------------------------------------------------------------------
// HedgeDecisionBridgeProps
// ---------------------------------------------------------------------------

interface HedgeDecisionBridgeProps {
  instrument: SimulatedInstrument
  labels: BridgeStrings
  locale: string
}

// ---------------------------------------------------------------------------
// CARD_CLASS — single source of truth for equal visual weight (CROSS-09).
// Identical to HedgeDecisionCard.CARD_CLASS to ensure the bridge does not
// render louder than the surrounding sections.
// ---------------------------------------------------------------------------

const CARD_CLASS = 'rounded-lg border border-border-default bg-bg-surface p-4 space-y-4'

// ---------------------------------------------------------------------------
// Direction → short marker text (displayed alongside fraction-of-max)
// ---------------------------------------------------------------------------

const DIRECTION_SYMBOL: Record<'increase' | 'decrease' | 'flat', string> = {
  increase: '↑',
  decrease: '↓',
  flat: '=',
}

// ---------------------------------------------------------------------------
// HedgeDecisionBridge component
// ---------------------------------------------------------------------------

export function HedgeDecisionBridge({
  instrument,
  labels,
  locale: _locale,
}: HedgeDecisionBridgeProps) {
  // Read from the snapshot reader seam (deterministic, synchronous, no network).
  const decisions = getHedgeDecisions()

  // Select the ADD_LONG_GAMMA decision — the one that maps onto the long-gamma instrument.
  // If no ADD_LONG_GAMMA decision exists, render honest empty state (M6 — never fabricate).
  const addDecision = decisions.find((d) => d.action === 'ADD_LONG_GAMMA') ?? null

  // CROSS-09: equal visual weight shell — identical card for both filled + empty state.
  return (
    <section aria-label={labels.heading} data-testid="bridge-section">
      {/* Section heading + testnet-agent provenance pill */}
      <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
        <p className="text-sm font-medium text-text-secondary">{labels.heading}</p>
        {/* CROSS-09: testnet-agent ProvenancePill — NEUTRAL token (never green) + color+icon+text+aria */}
        <ProvenancePill
          tier="testnet-agent"
          fieldName="hedge-decision-bridge"
          label={labels.provenanceLabel}
          ariaLabel={labels.provenanceAriaLabel}
          subState="recorded"
        />
      </div>

      {/* Bridge card — equal visual weight shell (CARD_CLASS identical to HedgeDecisionCard) */}
      <article data-testid="bridge-card" className={CARD_CLASS}>
        {addDecision === null ? (
          // ---------------------------------------------------------------------------
          // Honest empty state — no ADD_LONG_GAMMA decision recorded
          // M6: NEVER fabricate a gamma decision; render a clear honest message.
          // ---------------------------------------------------------------------------
          <div className="text-sm text-text-muted">
            <span>{labels.emptyGamma}</span>
            {/* Delta field in empty state: em-dash, NEVER 0 */}
            <span data-testid="bridge-delta-value" className="font-mono text-text-primary ml-2">
              {labels.emptyState}
            </span>
          </div>
        ) : (
          // ---------------------------------------------------------------------------
          // Filled state — ADD_LONG_GAMMA decision found
          // Narrative: macro print → operator-consensus+caveat → surprise → action+sizeBps
          //   → ILLUSTRATIVE fraction-of-max delta (M6: labeled illustrative, not "realized")
          // ---------------------------------------------------------------------------
          <dl className="divide-y divide-border-default text-sm">
            {/* Macro print */}
            <div className="flex items-start justify-between gap-4 py-2">
              <dt className="text-text-muted">{labels.macroLabel}</dt>
              <dd className="font-mono text-text-primary">{String(addDecision.macroValue)}</dd>
            </div>

            {/* Consensus + operator-supplied caveat (M4 honesty invariant).
                The caveat MUST be adjacent to the consensus value (same dt/dd group).
                Surprise is in the SAME card subtree — "gating" the surprise display. */}
            <div className="flex items-start justify-between gap-4 py-2">
              <dt className="text-text-muted space-y-0.5">
                <span>{labels.consensusLabel}</span>
                {/* M4: operator caveat — visible text, not aria-only */}
                <span className="block text-xs text-text-muted">({labels.consensusCaveat})</span>
              </dt>
              <dd className="font-mono text-text-primary">{String(addDecision.consensus)}</dd>
            </div>

            {/* Surprise — BigInt arithmetic, formatted at this edge.
                Gated: appears ONLY within this card, which also contains the operator caveat above. */}
            <div
              data-testid="bridge-surprise-row"
              className="flex items-start justify-between gap-4 py-2"
            >
              <dt className="text-text-muted">{labels.surpriseLabel}</dt>
              <dd className="font-mono text-text-primary">
                {/* computeSurprise is called in BigInt space; formatSurprise formats at edge */}
                {formatSurprise(computeSurprise(addDecision.macroValue, addDecision.consensus))}
              </dd>
            </div>

            {/* Action badge + sizeBps — the recorded hedge action */}
            <div className="flex items-start justify-between gap-4 py-2">
              <dt className="text-text-muted">{labels.sizeBpsLabel}</dt>
              <dd className="font-mono text-text-primary flex items-center gap-2">
                {/* Action label (human-readable) */}
                <span
                  className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset text-text-muted ring-border-default bg-bg-surface"
                  aria-label={labels.actionLabel[addDecision.action]}
                >
                  {labels.actionLabel[addDecision.action]}
                </span>
                {/* sizeBps value */}
                <span>{String(addDecision.sizeBps)}</span>
              </dd>
            </div>

            {/* ILLUSTRATIVE position delta — M6 honesty invariant.
                fractionOfMaxBps is honest-real BigInt arithmetic on the real on-chain sizeBps.
                Labeled "illustrative"/"ilustrativo" because the instrument is SIMULATED.
                NEVER say "executed"/"realized"/"ejecutada"/"realizada".
                NEVER render a dollar notional or a current price.
                Null → em-dash, NEVER 0. */}
            <div className="flex items-start justify-between gap-4 py-2">
              <dt className="text-text-muted space-y-0.5">
                <span>{labels.deltaLabel}</span>
                {/* M6: illustrative marker — visible text (not aria-only) */}
                <span className="block text-xs text-text-muted">({labels.illustrativeMarker})</span>
              </dt>
              <dd
                data-testid="bridge-delta-value"
                className="font-mono text-text-primary flex items-center gap-1.5"
              >
                {(() => {
                  const delta = decisionToPositionDelta(addDecision)
                  // delta.schematic is always true — enforcing illustrative label
                  if (!delta.schematic) {
                    // Defensive: schematic must always be true for this bridge
                    return <span>{labels.emptyState}</span>
                  }
                  return (
                    <>
                      <span aria-hidden="true">{DIRECTION_SYMBOL[delta.direction]}</span>
                      {/* formatFractionOfMax: Number coercion only at this format edge */}
                      <span>{formatFractionOfMax(delta.fractionOfMaxBps)}</span>
                    </>
                  )
                })()}
              </dd>
            </div>
          </dl>
        )}
      </article>
    </section>
  )
}
