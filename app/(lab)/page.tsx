// app/(lab)/page.tsx — RSC, no 'use client'
import { ArrowUpRight } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

export default async function HomePage() {
  const t = await getTranslations()

  return (
    // Own <main> landmark + container: the (lab) layout no longer wraps pages in <main>
    // (each page owns its width). max-w-4xl mirrors the container the layout used to provide.
    <main className="max-w-4xl mx-auto w-full px-6 py-12 space-y-12">
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
          <span className="mt-4 inline-flex items-center gap-1 text-sm text-accent-text underline-offset-2 group-hover:underline">
            {t('lab.apps.abrigo.cta')}
            <ArrowUpRight className="h-3 w-3" />
          </span>
        </a>
      </section>

      {/* Research — the lab's public-facing record of finished work lives at /research.
          The underlying econometric exercise is intentionally not published on this site. */}
      <section className="py-12">
        <h2 className="text-3xl font-semibold text-text-primary mb-4">
          {t('lab.research.heading')}
        </h2>
        <p className="max-w-2xl text-base text-text-secondary leading-relaxed">
          {t('lab.research.body')}
        </p>
        <a
          href="/research"
          className="mt-4 inline-flex items-center gap-1 text-sm text-accent-text underline-offset-2 hover:underline"
        >
          {t('lab.research.cta')}
          <ArrowUpRight className="h-3 w-3" />
        </a>
      </section>

      {/* GitHub link */}
      <section className="py-12">
        <a
          href="https://github.com/wvs-finance"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-accent-text underline-offset-2 hover:underline"
        >
          {t('lab.github.label')}
          <ArrowUpRight className="h-3 w-3" />
        </a>
      </section>
    </main>
  )
}
