// PositionPanel — RSC position-execution panel for the LongGammaWrapper instrument.
// RSC — no 'use client' needed; pure presentational.
//
// HONESTY INVARIANTS (Phase 07-02):
//   - Renders ONLY the not-deployed empty state (WRAPPER_DEPLOYED unset; adaptWrapper unreachable).
//   - Every value is an em-dash — no fabricated number, no dollar sign.
//   - stale-baseline identifiers (last-surviving-*/deposited-*) and realized-costs: NEVER surfaced.
//   - Provenance tier: fork-verified (neutral — NEVER accent/non-muted/non-default).
//   - No collapse disclosure — MAJOR-10 (no disclosure/summary pattern in this component).
//   - CROSS-09: color + icon + text + aria-label on the provenance pill.
//   - MAJOR-13: no dollar character in rendered DOM.
//   - MAJOR-10: no disclosure collapse element.
//
// Props: pre-translated strings object threaded from the RSC page (presentational pattern).

import { ProvenancePill } from '@/components/defi/ProvenanceBadge'

// ---------------------------------------------------------------------------
// PositionPanelStrings — all visible copy threaded from the RSC page
// ---------------------------------------------------------------------------

export interface PositionPanelStrings {
  heading: string
  emptyHeading: string
  emptyBody: string
  /** Caption directly under heading: "Not deployed — fork-verified, no on-chain position." */
  notLiveCaption: string
  provenanceLabel: string
  provenanceAriaLabel: string
  /** dl field labels (safe display labels only — no stale-baseline identifiers) */
  fieldLegs: string
  fieldCollateral: string
  fieldTokenId: string
  fieldResidual: string
  /** Em-dash placeholder for all values in the not-deployed empty state */
  emptyState: string
}

interface PositionPanelProps {
  strings: PositionPanelStrings
}

// ---------------------------------------------------------------------------
// PositionPanel component
// ---------------------------------------------------------------------------

// Card shell matches HedgeDecisionCard — IDENTICAL across all panels (CROSS-09 equal weight)
const CARD_CLASS = 'rounded-lg border border-border-default bg-bg-surface p-4 space-y-4'

export function PositionPanel({ strings }: PositionPanelProps) {
  // WrapperPositionView safe display fields (display labels only).
  // Phase 7: every value is em-dash (not-deployed empty state; WRAPPER_DEPLOYED unset).
  // NOTE: the §2/§5 stale-baseline chokepoint lives inside adaptWrapper (wrapper-adapter.ts).
  // The ALLOWLIST below matches WrapperPositionView safe fields ONLY:
  //   - position legs/health (via pool())
  //   - surviving collateral (via ct0()/ct1() convertToAssets)
  //   - positionTokenId
  //   - residualCause
  // The following identifiers NEVER appear as rendered text or code references here:
  //   last-surviving-0, last-surviving-1, deposited-0, deposited-1, realized-costs
  // Comments use hyphenated forms: "stale-baseline", "realized-costs" (per MINOR-14).
  const fields: Array<{ dt: string; dd: string; key: string }> = [
    { key: 'legs', dt: strings.fieldLegs, dd: strings.emptyState },
    { key: 'collateral', dt: strings.fieldCollateral, dd: strings.emptyState },
    { key: 'tokenId', dt: strings.fieldTokenId, dd: strings.emptyState },
    { key: 'residual', dt: strings.fieldResidual, dd: strings.emptyState },
  ]

  return (
    <section data-testid="position-panel" className={CARD_CLASS} aria-label={strings.heading}>
      {/* ------------------------------------------------------------------ */}
      {/* Header: fork-verified provenance pill + panel heading              */}
      {/* ------------------------------------------------------------------ */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <ProvenancePill
            tier="fork-verified"
            fieldName="position-wrapper"
            label={strings.provenanceLabel}
            ariaLabel={strings.provenanceAriaLabel}
          />
        </div>
        <h2 className="text-xl font-semibold text-text-primary">{strings.heading}</h2>
        {/* Not-live caption directly under the heading (text-sm text-text-muted) */}
        <p className="text-sm text-text-muted">{strings.notLiveCaption}</p>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Body: WrapperPositionView safe display fields as dl rows            */}
      {/* (HedgeDecisionCard idiom: divide-y, dt=muted, dd=font-mono)        */}
      {/* Phase 7: every dd is em-dash (not-deployed empty state)            */}
      {/* ------------------------------------------------------------------ */}
      <dl className="divide-y divide-border-default text-sm">
        {fields.map(({ key, dt, dd }) => (
          <div key={key} className="flex items-start justify-between gap-4 py-2">
            <dt className="text-text-muted">{dt}</dt>
            <dd className="font-mono text-text-primary">{dd}</dd>
          </div>
        ))}
      </dl>

      {/* ------------------------------------------------------------------ */}
      {/* Empty-state heading + body                                          */}
      {/* ------------------------------------------------------------------ */}
      <div className="space-y-1">
        <h3 className="text-base font-medium text-text-secondary">{strings.emptyHeading}</h3>
        <p className="text-sm text-text-muted">{strings.emptyBody}</p>
      </div>
    </section>
  )
}
