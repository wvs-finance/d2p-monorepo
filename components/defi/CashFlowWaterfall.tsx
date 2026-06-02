// CashFlowWaterfall — backend-correct cash-flow <dl> (Wave 2, DEFI-08).
// RSC — pure presentational; no 'use client'.
// Reading order (WCAG 1.3.2): premium → streamia (informational) → commission (informational)
//   → data-cost (em-dash, Phase-9 unbuilt) → residual.
// streamia + commission are SHOWN but NOT subtracted — already netted into survivingCollateral
//   by the pool's share-burn (08-RESEARCH §residual Pattern 7). Marked "(ya neteado)".
// null values render as em-dash — NEVER 0 (anti-fishing discipline).
// NO card-in-card (divide-y on section bg, like InstrumentParams).
// One spec-tier ProvenancePill on the section header.

import { ProvenancePill } from '@/components/defi/ProvenanceBadge'
import type { CashFlowBreakdown } from '@/lib/apps/abrigo/cashflow'

interface CashFlowWaterfallProps {
  breakdown: CashFlowBreakdown
  labels: {
    premium: string
    streamia: string
    commission: string
    data_cost: string
    residual: string
    already_netted: string
  }
  specPillStrings: {
    label: string
    aria: string
  }
  locale: string
}

function formatValue(value: number | null, locale: string): string {
  if (value === null) return '—'
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(value)
}

export function CashFlowWaterfall({
  breakdown,
  labels,
  specPillStrings,
  locale,
}: CashFlowWaterfallProps) {
  return (
    <section>
      {/* Section header with single spec-tier ProvenancePill */}
      <div className="flex items-center gap-2 mb-3">
        <ProvenancePill tier="spec" fieldName="cashflow" ariaLabel={specPillStrings.aria} />
      </div>

      <dl className="divide-y divide-border-default">
        {/* premium — primary row */}
        <div className="flex items-start justify-between gap-4 py-3">
          <dt className="text-sm text-text-secondary">{labels.premium}</dt>
          <dd className="font-mono text-sm text-text-primary">
            {formatValue(breakdown.premium.value, locale)}
          </dd>
        </div>

        {/* streamia — informational, already netted */}
        <div className="flex items-start justify-between gap-4 py-3">
          <dt className="text-sm text-text-muted">
            {labels.streamia}{' '}
            <span className="text-xs text-text-muted">({labels.already_netted})</span>
          </dt>
          <dd className="font-mono text-sm text-text-muted">
            {formatValue(breakdown.streamia.value, locale)}
          </dd>
        </div>

        {/* commission — informational, already netted */}
        <div className="flex items-start justify-between gap-4 py-3">
          <dt className="text-sm text-text-muted">
            {labels.commission}{' '}
            <span className="text-xs text-text-muted">({labels.already_netted})</span>
          </dt>
          <dd className="font-mono text-sm text-text-muted">
            {formatValue(breakdown.commission.value, locale)}
          </dd>
        </div>

        {/* data-cost — Phase 9 unbuilt → always em-dash */}
        <div className="flex items-start justify-between gap-4 py-3">
          <dt className="text-sm text-text-muted">{labels.data_cost}</dt>
          <dd className="font-mono text-sm text-text-muted">
            {formatValue(breakdown.dataCost.value, locale)}
          </dd>
        </div>

        {/* residual — the bottom-line output */}
        <div className="flex items-start justify-between gap-4 py-3">
          <dt className="text-sm font-medium text-text-primary">{labels.residual}</dt>
          <dd className="font-mono text-sm font-medium text-text-primary">
            {/* residualNote explains the formula (anti-fishing traceability) */}
            <span title={breakdown.residualNote}>{labels.residual} *</span>
          </dd>
        </div>
      </dl>

      {/* Residual footnote with formula citation */}
      <p className="mt-2 text-xs text-text-muted">{breakdown.residualNote}</p>
    </section>
  )
}
