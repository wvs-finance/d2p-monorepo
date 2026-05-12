import { iterations } from '@/.velite'
// app/(lab)/page.tsx — RSC, no 'use client'
import { IterationCountTile } from '@/components/IterationCountTile'
import { countsByStatus } from '@/lib/iterations/counts'
import { ArrowUpRight } from 'lucide-react'
import { getLocale, getTranslations } from 'next-intl/server'

const STATUS_KEYS = ['PASS', 'FAIL', 'PARKED', 'IN_PROGRESS'] as const

export default async function HomePage() {
  const t = await getTranslations()
  const locale = (await getLocale()) as 'es-CO' | 'en'
  const counts = countsByStatus(iterations)
  const isEmpty = counts.total === 0

  return (
    <article className="space-y-12">
      {/* Hero */}
      <header className="space-y-4 py-20 lg:py-[120px] text-center">
        <h1 className="text-4xl font-semibold text-text-primary leading-tight">
          {t('lab.hero.h1')}
        </h1>
        <p className="mt-4 text-base text-text-secondary">{t('lab.hero.subline')}</p>
        <p className="mt-6 max-w-2xl mx-auto text-base text-text-primary leading-relaxed">
          {t('lab.mission.body')}
        </p>
      </header>

      {/* What is d2-π */}
      <section className="py-12">
        <h2 id="what-is-d2pi" className="text-3xl font-semibold text-text-primary">
          {t('lab.what_is_d2pi.heading')}
        </h2>
        <p className="mt-4 max-w-2xl text-base text-text-secondary leading-relaxed">
          {t('lab.what_is_d2pi.body')}
        </p>
      </section>

      {/* Apps overview — single Abrigo card, not a grid */}
      <section className="py-12">
        <h2 className="text-3xl font-semibold text-text-primary mb-6">{t('lab.apps.heading')}</h2>
        <a
          href="/apps/abrigo"
          className="group block max-w-2xl rounded-lg border border-border-default bg-bg-surface p-6 motion-safe:hover:shadow-sm motion-safe:hover:border-accent-default/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-default"
        >
          <h3 className="text-xl font-semibold text-text-primary">{t('lab.apps.abrigo.name')}</h3>
          <p className="mt-2 text-base text-text-secondary">{t('lab.apps.abrigo.description')}</p>
          <span className="mt-4 inline-flex items-center gap-1 text-sm text-accent-default underline-offset-2 group-hover:underline">
            {t('lab.apps.abrigo.cta')}
            <ArrowUpRight className="h-3 w-3" />
          </span>
        </a>
      </section>

      {/* Iteration count rollup — divide-y list per epistemic equality, NOT a 4-card grid */}
      <section aria-labelledby="iter-counts-heading" className="py-12">
        <h2 id="iter-counts-heading" className="text-3xl font-semibold text-text-primary mb-6">
          {t('lab.counts.heading')}
        </h2>
        {isEmpty ? (
          <p className="text-base text-text-secondary">{t('lab.counts.empty')}</p>
        ) : (
          <ul className="divide-y divide-border-default max-w-2xl">
            {STATUS_KEYS.map((status) => {
              const statusKey = status === 'IN_PROGRESS' ? 'in_progress' : status.toLowerCase()
              return (
                <li key={status} className="py-4">
                  <IterationCountTile
                    status={status}
                    count={counts[status]}
                    label={t(`iterations.status.${statusKey}.label` as Parameters<typeof t>[0])}
                    statusLabel={t(
                      `iterations.status.${statusKey}.label` as Parameters<typeof t>[0],
                    )}
                    locale={locale}
                  />
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* GitHub link */}
      <section className="py-12">
        <a
          href="https://github.com/wvs-finance"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-accent-default underline-offset-2 hover:underline"
        >
          {t('lab.github.label')}
          <ArrowUpRight className="h-3 w-3" />
        </a>
      </section>
    </article>
  )
}
