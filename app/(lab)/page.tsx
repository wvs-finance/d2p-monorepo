import { IterationCountTile } from '@/components/IterationCountTile'
import { getLocale, getTranslations } from 'next-intl/server'

// Hardcoded Phase 1 iteration counts sourced from PROJECT.md empirical-state snapshot.
// Phase 2 replaces these with Velite-driven counts from content/iterations/.
const COUNTS = [
  { status: 'PASS' as const, count: 3 },
  { status: 'FAIL' as const, count: 2 },
  { status: 'PARKED' as const, count: 1 },
  { status: 'IN_PROGRESS' as const, count: 1 },
]

export default async function HomePage() {
  const locale = (await getLocale()) as 'es-CO' | 'en'
  const tHero = await getTranslations('hero')
  const tCounts = await getTranslations('iteration_counts')
  const tStatus = await getTranslations('status')

  return (
    <article className="space-y-12">
      {/* Hero — wordmark + tagline. No eyebrow chip, no italic serif, no icon tile. */}
      <header className="space-y-4">
        <h1 className="text-4xl font-semibold text-text-primary">{tHero('wordmark')}</h1>
        <p className="text-lg text-text-secondary max-w-2xl">{tHero('tagline')}</p>
      </header>

      {/* Iteration counts — divide-y list, not identical card grid (anti-pattern avoidance). */}
      <section aria-labelledby="iter-counts-heading" className="space-y-2">
        <h2
          id="iter-counts-heading"
          className="text-base font-semibold text-text-primary uppercase tracking-wide"
        >
          {tCounts('heading')}
        </h2>
        <div className="divide-y divide-border-default">
          {COUNTS.map(({ status, count }) => {
            const statusKey = status === 'IN_PROGRESS' ? 'in_progress' : status.toLowerCase()
            return (
              <IterationCountTile
                key={status}
                status={status}
                count={count}
                label={tCounts(statusKey as Parameters<typeof tCounts>[0])}
                statusLabel={tStatus(`${statusKey}.label` as Parameters<typeof tStatus>[0])}
                locale={locale}
              />
            )
          })}
        </div>
      </section>
    </article>
  )
}
