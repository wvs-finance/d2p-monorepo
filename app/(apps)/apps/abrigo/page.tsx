import { IterationCountTile } from '@/components/IterationCountTile'
import { StatusPill } from '@/components/StatusPill'
import { ArrowUpRight } from 'lucide-react'
import { getLocale, getTranslations } from 'next-intl/server'

// Hardcoded Phase 1 counts — same snapshot as homepage.
// Phase 2 replaces with Velite-driven counts scoped to Abrigo iterations.
const COUNTS = [
  { status: 'PASS' as const, count: 3 },
  { status: 'FAIL' as const, count: 2 },
  { status: 'PARKED' as const, count: 1 },
  { status: 'IN_PROGRESS' as const, count: 1 },
]

// Phase-2 sub-routes — not yet built. Rendered as placeholder cards, not links.
const PHASE2_ROUTES = [
  { key: 'iterations', label: { en: 'Iterations', 'es-CO': 'Iteraciones' } },
  { key: 'instruments', label: { en: 'Instruments', 'es-CO': 'Instrumentos' } },
  { key: 'dashboard', label: { en: 'Dashboard', 'es-CO': 'Panel' } },
]

export default async function AbrigoOverviewPage() {
  const locale = (await getLocale()) as 'es-CO' | 'en'
  const tApps = await getTranslations('apps')
  const tCounts = await getTranslations('iteration_counts')
  const tStatus = await getTranslations('status')

  const comingLabel = locale === 'es-CO' ? 'Fase 2' : 'Phase 2'
  const comingText = locale === 'es-CO' ? 'Próximamente en Fase 2' : 'Coming in Phase 2'

  return (
    <main className="max-w-4xl mx-auto px-6 py-12 space-y-12">
      {/* Page header */}
      <header className="space-y-3">
        <h1 className="text-4xl font-semibold text-text-primary">
          {tApps('abrigo.headline' as Parameters<typeof tApps>[0])}
        </h1>
        <p className="text-base text-text-secondary max-w-2xl">
          {tApps('abrigo.description' as Parameters<typeof tApps>[0])}
        </p>
      </header>

      {/* Mission section */}
      <section aria-labelledby="mission-heading" className="space-y-3">
        <h2 id="mission-heading" className="text-xl font-semibold text-text-primary">
          {locale === 'es-CO' ? 'Misión' : 'Mission'}
        </h2>
        <p className="text-base text-text-secondary leading-relaxed max-w-3xl">
          {tApps('abrigo.mission' as Parameters<typeof tApps>[0])}
        </p>
      </section>

      {/* Headline iteration counts */}
      <section aria-labelledby="counts-heading" className="space-y-3">
        <h2 id="counts-heading" className="text-xl font-semibold text-text-primary">
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

      {/* External presence — prominent external link */}
      <section aria-labelledby="external-heading" className="space-y-3">
        <h2 id="external-heading" className="text-xl font-semibold text-text-primary">
          {locale === 'es-CO' ? 'Presencia externa' : 'External presence'}
        </h2>
        <a
          href="https://x.com/d2pfinabrigo"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 py-3 bg-bg-elevated border border-border-default rounded-lg text-text-primary hover:bg-bg-surface hover:border-accent-default focus:outline-none focus-visible:ring-2 focus-visible:ring-color-ring transition-colors font-medium"
        >
          <ArrowUpRight aria-hidden="true" className="h-5 w-5 text-text-muted" />
          {locale === 'es-CO'
            ? 'Abrir en X (Twitter): @d2pfinabrigo'
            : 'Open on X (Twitter): @d2pfinabrigo'}
        </a>
      </section>

      {/* Phase 2 placeholder cards — NOT links (do not ship broken links) */}
      <section aria-labelledby="phase2-heading" className="space-y-3">
        <h2 id="phase2-heading" className="text-xl font-semibold text-text-primary">
          {locale === 'es-CO' ? `Próximamente en ${comingLabel}` : `Coming in ${comingLabel}`}
        </h2>
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {PHASE2_ROUTES.map(({ key, label }) => (
            <li
              key={key}
              aria-label={`${label[locale]} — ${comingText}`}
              className="flex flex-col gap-2 p-4 bg-bg-elevated border border-border-default rounded-lg"
            >
              <span className="text-base font-semibold text-text-primary">{label[locale]}</span>
              <StatusPill status="IN_PROGRESS" label={comingText} />
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
