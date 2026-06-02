// PipelineStage — single stage node in the deterministic decision-pipeline trace.
// RSC — server component, no client directive. Pure presentational.
//
// HONESTY INVARIANTS (CROSS-09):
//   - Equal visual weight for ALL 6 stages: identical marker ring, identical title size,
//     identical card shell. CROSS-09 anti-fishing: no stage is visually de-emphasized.
//   - Collapse belongs in SystemPromptDisclosure only; this file has zero details/summary (MAJOR-10).
//   - testnet-agent provenance pill per stage (neutral, NEVER green).
//   - Null/missing values render em-dash. Never 0 for missing data.
//
// Props:
//   title       — localized stage heading (text-base font-medium text-text-secondary)
//   provenanceLabel / provenanceAriaLabel — threaded from the page (CROSS-09)
//   children    — stage-specific dl rows

import { ProvenancePill } from '@/components/defi/ProvenanceBadge'

interface PipelineStageProps {
  title: string
  provenanceLabel: string
  provenanceAriaLabel: string
  children: React.ReactNode
}

// CROSS-09: CARD_CLASS is intentionally IDENTICAL for all 6 stages — equal visual weight.
// Do NOT add stage-specific emphasis here.
const CARD_CLASS = 'rounded-lg border border-border-default bg-bg-surface p-4 space-y-3'

export function PipelineStage({
  title,
  provenanceLabel,
  provenanceAriaLabel,
  children,
}: PipelineStageProps) {
  return (
    <div data-testid="pipeline-stage" className="relative pl-6">
      {/* ------------------------------------------------------------------ */}
      {/* Vertical connector rail — 1px hairline (UI-SPEC Spacing connector   */}
      {/* exception: exempt from 4px content-spacing rule).                  */}
      {/* Positioned on the left; the marker ring sits on top of it.         */}
      {/* ------------------------------------------------------------------ */}
      <div
        className="absolute left-0 top-0 bottom-0 border-l border-border-default"
        aria-hidden="true"
      />

      {/* ------------------------------------------------------------------ */}
      {/* Stage marker ring — 2px ring (UI-SPEC connector exception).        */}
      {/* accent-default fill: color + position, NOT color alone (CROSS-09). */}
      {/* ------------------------------------------------------------------ */}
      <div
        className="absolute left-0 top-3 -translate-x-1/2 h-3 w-3 rounded-full ring-2 ring-accent-default bg-accent-default"
        aria-hidden="true"
      />

      {/* ------------------------------------------------------------------ */}
      {/* Stage card — IDENTICAL shell for all 6 stages (anti-fishing).      */}
      {/* ------------------------------------------------------------------ */}
      <div className={CARD_CLASS}>
        {/* Header: stage title + provenance pill */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {/* text-base font-medium text-text-secondary (UI-SPEC sub-heading) */}
          <h3 className="text-base font-medium text-text-secondary">{title}</h3>
          <ProvenancePill
            tier="testnet-agent"
            fieldName={`stage-${title}`}
            label={provenanceLabel}
            ariaLabel={provenanceAriaLabel}
            subState="recorded"
          />
        </div>

        {/* Stage-specific data rows (dl pattern from HedgeDecisionCard) */}
        <dl className="divide-y divide-border-default text-sm">{children}</dl>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// DataRow — reusable dt/dd pair (mirrors HedgeDecisionCard row idiom)
// ---------------------------------------------------------------------------

interface DataRowProps {
  label: string
  children: React.ReactNode
}

export function DataRow({ label, children }: DataRowProps) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <dt className="text-text-muted">{label}</dt>
      <dd className="font-mono text-text-primary">{children}</dd>
    </div>
  )
}
