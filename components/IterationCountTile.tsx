import { type IterationStatus, StatusPill } from '@/components/StatusPill'
import { formatNumber } from '@/lib/format'

export interface IterationCountTileProps {
  status: IterationStatus
  count: number
  /** Translated label, e.g., t('iteration_counts.pass') */
  label: string
  /** Translated status label for the pill, e.g., t('status.pass.label') */
  statusLabel: string
  /** Locale for numeric formatting */
  locale: 'es-CO' | 'en'
}

// Horizontal divide-y row — deliberately NOT a grid of identical cards.
// Anti-pattern rationale (PITFALLS Pitfall 11): a grid of identical card tiles
// creates visual hierarchy that obscures the epistemic equality of statuses.
// A flat divide-y list treats PASS, FAIL, PARKED, IN_PROGRESS with identical weight.
export function IterationCountTile({
  status,
  count,
  label,
  statusLabel,
  locale,
}: IterationCountTileProps) {
  return (
    <div data-testid="iteration-count-tile" className="flex items-baseline gap-3 py-3">
      <span className="text-3xl font-semibold text-text-primary tabular-nums">
        {formatNumber(count, locale)}
      </span>
      <span className="text-sm text-text-secondary">{label}</span>
      <StatusPill status={status} label={statusLabel} className="ml-auto" />
    </div>
  )
}
