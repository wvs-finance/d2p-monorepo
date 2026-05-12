// Client Component — requires 'use client' for nuqs useQueryState.
// Only (apps) pages use this; NuqsAdapter wraps (apps) layout.
// Filter is opt-in: default (null) shows ALL iterations (ITER-01 anti-fishing principle).
'use client'
import type { IterationStatus } from '@/components/StatusPill'
import { parseAsStringEnum, useQueryState } from 'nuqs'

interface FilterLabels {
  all: string
  aria_label: string
  pass: string
  fail: string
  parked: string
  in_progress: string
}

interface StatusCounts {
  PASS: number
  FAIL: number
  PARKED: number
  IN_PROGRESS: number
  total: number
}

interface Props {
  counts: StatusCounts
  labels: FilterLabels
}

const STATUS_ENUM = ['PASS', 'FAIL', 'PARKED', 'IN_PROGRESS'] as const

export function IterationStatusFilter({ counts, labels }: Props) {
  // No .withDefault() — absence of ?status param gives null (show ALL) per ITER-01 anti-fishing rule
  const [status, setStatus] = useQueryState(
    'status',
    parseAsStringEnum<IterationStatus>([...STATUS_ENUM]),
  )

  const pills: Array<{ key: IterationStatus | null; label: string; count: number }> = [
    { key: null, label: labels.all, count: counts.total },
    { key: 'PASS', label: labels.pass, count: counts.PASS },
    { key: 'FAIL', label: labels.fail, count: counts.FAIL },
    { key: 'PARKED', label: labels.parked, count: counts.PARKED },
    { key: 'IN_PROGRESS', label: labels.in_progress, count: counts.IN_PROGRESS },
  ]

  return (
    <nav aria-label={labels.aria_label} className="flex flex-wrap gap-2 mb-6">
      {pills.map((p) => {
        const isActive = status === p.key
        return (
          <button
            key={p.key ?? 'all'}
            type="button"
            onClick={() => setStatus(p.key)}
            data-testid={`filter-pill-${p.key ?? 'all'}`}
            className={[
              'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm min-h-[44px]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-default',
              isActive
                ? 'text-accent-default border-b-2 border-accent-default'
                : 'text-text-muted hover:text-text-primary',
            ].join(' ')}
            aria-pressed={isActive}
          >
            {p.label} <span className="font-mono text-xs">{p.count}</span>
          </button>
        )
      })}
    </nav>
  )
}
