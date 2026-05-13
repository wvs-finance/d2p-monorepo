// Server Component — no 'use client'
import { type IterationStatus, StatusPill } from '@/components/StatusPill'
import { formatDate } from '@/lib/format/date'

export interface IterationDetailHeaderIteration {
  slug: string
  version: number
  status: IterationStatus
  title_es: string
  title_en: string
  analysis_date: Date
  /** Compiled MDX code — optional, passed through but not rendered here. */
  code?: string
}

export interface IterationDetailHeaderProps {
  iteration: IterationDetailHeaderIteration
  locale: 'es-CO' | 'en'
  /** next-intl translator passed from RSC caller */
  t: (key: string) => string
}

export function IterationDetailHeader({ iteration, locale, t }: IterationDetailHeaderProps) {
  const statusLabelKey = `iterations.status.${iteration.status.toLowerCase()}.label`
  const statusLabel = t(statusLabelKey)
  const title = locale === 'es-CO' ? iteration.title_es : iteration.title_en

  return (
    <header className="flex flex-col gap-3 pb-6 border-b border-border-default">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
        <StatusPill status={iteration.status} label={statusLabel} />
        <span className="text-sm text-text-muted font-mono">
          {t('iterations.detail.version_label')} v{iteration.version}
        </span>
      </div>
      <h1 className="text-3xl sm:text-4xl font-semibold text-text-primary leading-tight">
        {title}
      </h1>
      <time
        className="text-xs text-text-muted"
        dateTime={new Date(iteration.analysis_date).toISOString()}
      >
        {formatDate(iteration.analysis_date, locale)}
      </time>
    </header>
  )
}
