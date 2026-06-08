import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/format/date'
import { ArrowUpRight } from 'lucide-react'
import Link from 'next/link'
// Server Component — no 'use client'

export interface PublicationCardResearch {
  slug: string
  title_es: string
  title_en: string
  authors: string[]
  date: Date
  type: 'paper' | 'decision-memo' | 'write-up' | 'talk'
  // Plan B additions
  track: 'cfmm-microstructure' | 'abrigo-hedge-design' | 'notes'
  readable_on_site: boolean
  external_url?: string | undefined
  summary_es: string
  summary_en: string
  tags: string[]
  order?: number | undefined
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
  const trackLabelKey = `research.track_label.${research.track}`

  // Link logic: in-link when readable_on_site; out-link when external_url; no link otherwise
  const internalHref = research.readable_on_site ? `/research/${research.slug}` : undefined
  const externalHref = !research.readable_on_site ? research.external_url : undefined

  const TitleWrapper = ({ children }: { children: React.ReactNode }) => {
    if (internalHref) {
      return (
        <Link href={internalHref} className="hover:underline underline-offset-2 text-text-primary">
          {children}
        </Link>
      )
    }
    return <>{children}</>
  }

  return (
    <article className="group rounded-lg border border-border-default bg-bg-surface p-6 transition-shadow motion-safe:hover:shadow-sm">
      {research.order != null && (
        <span className="font-mono text-accent-text text-xs block mb-2">
          {String(research.order).padStart(2, '0')}
        </span>
      )}
      <div className="flex items-start gap-2 flex-wrap mb-1">
        <Badge variant="outline">{t(typeLabelKey)}</Badge>
        <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-wider">
          {t(trackLabelKey)}
        </Badge>
      </div>
      <h3 className="text-xl font-semibold text-text-primary mt-2">
        <TitleWrapper>{title}</TitleWrapper>
      </h3>
      <div className="flex items-center gap-3 mt-2">
        <time className="text-xs text-text-muted" dateTime={new Date(research.date).toISOString()}>
          {formatDate(research.date, locale)}
        </time>
      </div>
      <p className="mt-2 text-sm text-text-secondary line-clamp-2">{summary}</p>
      <div className="mt-3 flex gap-3 flex-wrap">
        {internalHref && (
          <Link
            href={internalHref}
            className="inline-flex items-center gap-1 text-sm text-accent-text underline-offset-2 hover:underline"
          >
            {t('research.cta.read_on_site')}
          </Link>
        )}
        {externalHref && (
          <a
            href={externalHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-accent-text underline-offset-2 hover:underline"
          >
            {t('research.cta.read_document')}
            <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
          </a>
        )}
      </div>
    </article>
  )
}
