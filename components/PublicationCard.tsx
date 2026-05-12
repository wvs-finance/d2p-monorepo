// Server Component — no 'use client'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/format/date'
import { ArrowUpRight } from 'lucide-react'

export interface PublicationCardResearch {
  slug: string
  title_es: string
  title_en: string
  authors: string[]
  date: Date
  type: 'paper' | 'decision-memo' | 'write-up' | 'talk'
  external_url?: string
  summary_es: string
  summary_en: string
  tags: string[]
  order?: number
}

export interface PublicationCardProps {
  research: PublicationCardResearch
  locale: 'es-CO' | 'en'
  /** next-intl translator passed from RSC caller */
  t: (key: string) => string
}

export function PublicationCard({ research, locale, t }: PublicationCardProps) {
  const title = locale === 'es-CO' ? research.title_es : research.title_en
  const summary = locale === 'es-CO' ? research.summary_es : research.summary_en
  const typeLabelKey = `research.type_label.${research.type}`

  return (
    <article className="group rounded-lg border border-border-default bg-bg-surface p-6 transition-shadow motion-safe:hover:shadow-sm">
      {research.order != null && (
        <span className="font-mono text-accent-default text-xs block mb-2">
          {String(research.order).padStart(2, '0')}
        </span>
      )}
      <h3 className="text-xl font-semibold text-text-primary">{title}</h3>
      <div className="flex items-center gap-3 mt-2">
        <time className="text-xs text-text-muted" dateTime={research.date.toISOString()}>
          {formatDate(research.date, locale)}
        </time>
        <Badge variant="outline">{t(typeLabelKey)}</Badge>
      </div>
      <p className="mt-2 text-sm text-text-secondary line-clamp-2">{summary}</p>
      {research.external_url && (
        <a
          href={research.external_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-accent-default underline-offset-2 hover:underline mt-3"
        >
          {t('research.cta.read_document')}
          <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
        </a>
      )}
    </article>
  )
}
