// Server Component — no 'use client'
import { type IterationStatus, StatusPill } from '@/components/StatusPill'
import { formatDate } from '@/lib/format/date'

export interface IterationCatalogCardIteration {
  slug: string
  version: number
  status: IterationStatus
  title_es: string
  title_en: string
  beta?: number
  analysis_date: Date
  code: string
}

export interface IterationCatalogCardProps {
  iteration: IterationCatalogCardIteration
  locale: 'es-CO' | 'en'
  labels: {
    statusLabels: Record<IterationStatus, string>
  }
}

export function IterationCatalogCard({ iteration, locale, labels }: IterationCatalogCardProps) {
  const title = locale === 'es-CO' ? iteration.title_es : iteration.title_en
  const href = `/apps/abrigo/iterations/${iteration.slug}/v${iteration.version}`

  return (
    <a
      href={href}
      className="group block rounded-lg border border-border-default bg-bg-surface min-h-[120px] p-4 transition-shadow motion-safe:hover:shadow-sm motion-safe:hover:border-accent-default/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-default"
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-start gap-3">
          <StatusPill status={iteration.status} label={labels.statusLabels[iteration.status]} />
          <h3 className="text-xl font-semibold text-text-primary leading-tight flex-1">{title}</h3>
        </div>
        {iteration.beta != null && (
          <p className="text-sm font-mono text-text-secondary">
            β = {iteration.beta > 0 ? '+' : ''}
            {iteration.beta.toFixed(4)}
          </p>
        )}
        <div className="flex items-center gap-3 text-xs text-text-muted mt-auto">
          <time dateTime={iteration.analysis_date.toISOString()}>
            {formatDate(iteration.analysis_date, locale)}
          </time>
          <span>{iteration.slug}</span>
        </div>
      </div>
    </a>
  )
}
