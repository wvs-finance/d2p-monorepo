// Server Component — no 'use client'
import { type IterationStatus, StatusPill } from '@/components/StatusPill'

export interface DispositionMemoIteration {
  slug: string
  version: number
  status: IterationStatus
  title_es: string
  title_en: string
  analysis_date: Date
  disposition_memo?: string | undefined
  /** Compiled MDX code — optional, passed through but not rendered here. */
  code?: string
}

export interface DispositionMemoProps {
  iteration: DispositionMemoIteration
  locale: 'es-CO' | 'en'
  /** next-intl translator passed from RSC caller */
  t: (key: string) => string
}

export function DispositionMemo({ iteration, locale, t }: DispositionMemoProps) {
  const statusLabelKey = `iterations.status.${iteration.status.toLowerCase()}.label`
  const statusLabel = t(statusLabelKey)

  return (
    <section aria-labelledby="disposition-heading">
      <h2 id="disposition-heading" className="text-xl font-semibold text-text-primary mb-4">
        {t('iterations.detail.disposition.heading')}
      </h2>
      <div className="flex items-center gap-3 mb-4">
        <StatusPill status={iteration.status} label={statusLabel} />
        {iteration.status === 'FAIL' && (
          <p className="text-sm text-text-secondary">
            {t('iterations.detail.disposition.fail_notice')}
          </p>
        )}
      </div>
      {iteration.disposition_memo && (
        <div className="prose prose-sm max-w-3xl text-text-primary">
          <p>{iteration.disposition_memo}</p>
        </div>
      )}
    </section>
  )
}
