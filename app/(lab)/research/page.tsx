import { research } from '@/.velite'
import { PublicationCard } from '@/components/PublicationCard'
import { TrackFilter } from '@/components/TrackFilter'
import type { TrackValue } from '@/components/TrackFilter'
import { getLocale, getTranslations } from 'next-intl/server'

const VALID_TRACKS = new Set<string>(['cfmm-microstructure', 'abrigo-hedge-design', 'notes'])

// Next 16: searchParams is a Promise — must await it
export default async function ResearchPage({
  searchParams,
}: {
  searchParams: Promise<{ track?: string }>
}) {
  const t = await getTranslations()
  const locale = (await getLocale()) as 'es-CO' | 'en'
  const { track } = await searchParams

  // Resolve active track: undefined for "All", valid track string otherwise
  const activeTrack: TrackValue | undefined =
    track && VALID_TRACKS.has(track) ? (track as TrackValue) : undefined

  // Dedupe per-locale: one card per slug for the active locale (fallback to 'es' if 'en' missing)
  const slugMap = new Map<string, (typeof research)[number]>()
  for (const entry of research) {
    // temporary: filter out spike fixture until Plan C retires it
    if (entry.slug === 'spike-katex') continue
    const existing = slugMap.get(entry.slug)
    if (!existing) {
      slugMap.set(entry.slug, entry)
    } else {
      // prefer the locale that matches the current user locale
      const preferredLocale = locale === 'en' ? 'en' : 'es'
      if (entry.locale === preferredLocale) {
        slugMap.set(entry.slug, entry)
      }
    }
  }

  // Filter by active track if set
  let displayEntries = [...slugMap.values()]
  if (activeTrack) {
    displayEntries = displayEntries.filter((e) => e.track === activeTrack)
  }

  // Sort by order then date desc
  displayEntries.sort((a, b) => {
    const orderDiff = (a.order ?? 999) - (b.order ?? 999)
    if (orderDiff !== 0) return orderDiff
    return new Date(b.date).getTime() - new Date(a.date).getTime()
  })

  return (
    <main className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <header className="mb-8">
        <h1 className="text-4xl font-semibold text-text-primary">{t('research.h1')}</h1>
        <p className="mt-4 max-w-2xl text-base text-text-secondary leading-relaxed">
          {t('research.subheading')}
        </p>
      </header>

      <TrackFilter track={activeTrack} t={t} />

      {displayEntries.length === 0 ? (
        <div className="rounded-lg border border-border-default p-8 text-center">
          <h2 className="text-xl font-semibold text-text-primary">
            {activeTrack ? t('research.empty_track.heading') : t('research.empty_state.heading')}
          </h2>
          <p className="mt-2 text-text-secondary">
            {activeTrack ? t('research.empty_track.body') : t('research.empty_state.body')}
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-6 list-none p-0">
          {displayEntries.map((r) => (
            <li key={r.slug} data-testid="publication-card">
              <PublicationCard research={r} locale={locale} t={t} />
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
