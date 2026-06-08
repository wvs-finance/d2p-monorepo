import Link from 'next/link'
// Server Component — no 'use client'
// Pure RSC segmented control for the /research track filter.
// Uses next/link <Link> href="/research?track=…" — NO nuqs, NO client island.
// FOUND-11: must not import anything that hydrates wallet state or adds NuqsAdapter.

export type TrackValue = 'cfmm-microstructure' | 'abrigo-hedge-design' | 'notes'

export interface TrackFilterProps {
  /** Current active track, or undefined for "All" */
  track?: string | undefined
  /** next-intl translator passed from RSC caller */
  t: (key: string) => string
}

const TRACK_OPTIONS: Array<{ value: TrackValue | 'all'; href: string }> = [
  { value: 'all', href: '/research' },
  { value: 'cfmm-microstructure', href: '/research?track=cfmm-microstructure' },
  { value: 'abrigo-hedge-design', href: '/research?track=abrigo-hedge-design' },
  { value: 'notes', href: '/research?track=notes' },
]

export function TrackFilter({ track, t }: TrackFilterProps) {
  const active = track ?? 'all'

  return (
    <nav aria-label={t('research.track_filter.label')} className="mb-8">
      <ul className="flex flex-wrap gap-2 list-none p-0 m-0">
        {TRACK_OPTIONS.map(({ value, href }) => {
          const isActive = value === active
          const labelKey =
            value === 'all' ? 'research.track_filter.all' : `research.track_filter.${value}`

          return (
            <li key={value}>
              <Link
                href={href}
                aria-current={isActive ? 'page' : undefined}
                className={[
                  'inline-flex items-center min-h-[44px] px-4 py-2',
                  'font-mono text-sm rounded-sm',
                  'border border-border-default transition-colors',
                  isActive
                    ? // Active: ochre bottom-border + accent text — color+border+text, never color alone (CROSS-09)
                      'border-b-[color:var(--color-accent-default)] border-b-2 text-accent-text bg-bg-surface font-semibold'
                    : 'text-text-secondary bg-bg-surface hover:text-text-primary hover:border-border-strong',
                ].join(' ')}
              >
                {t(labelKey)}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
