import { StatusPill } from '@/components/StatusPill'
import { ArrowUpRight } from 'lucide-react'
import { getLocale, getTranslations } from 'next-intl/server'
import Link from 'next/link'

// Abrigo app surface: the product, a live-dashboard teaser (Phase 3), and external
// links. The econometric research is NOT published here — finished research artifacts
// live on /research and on X; the underlying exercise lives in wvs-finance/abrigo-analytics.
export default async function AbrigoOverviewPage() {
  const locale = (await getLocale()) as 'es-CO' | 'en'
  const tApps = await getTranslations('apps')
  const tDashboard = await getTranslations('dashboard')

  const dashboardComing = locale === 'es-CO' ? 'Próximamente — Fase 3' : 'Coming in Phase 3'
  const githubComing = locale === 'es-CO' ? 'Próximamente' : 'Coming soon'

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

      {/* Mission */}
      <section aria-labelledby="mission-heading" className="space-y-3">
        <h2 id="mission-heading" className="text-xl font-semibold text-text-primary">
          {locale === 'es-CO' ? 'Misión' : 'Mission'}
        </h2>
        <p className="text-base text-text-secondary leading-relaxed max-w-3xl">
          {tApps('abrigo.mission' as Parameters<typeof tApps>[0])}
        </p>
      </section>

      {/* Live dashboard teaser — Phase 3 dashboard is now live at /apps/abrigo/dashboard */}
      <section aria-labelledby="dashboard-heading" className="space-y-3">
        <div className="flex items-center gap-3">
          <h2 id="dashboard-heading" className="text-xl font-semibold text-text-primary">
            {locale === 'es-CO' ? 'Panel en vivo' : 'Live dashboard'}
          </h2>
          <StatusPill status="IN_PROGRESS" label={dashboardComing} />
        </div>
        <div className="rounded-lg border border-border-default bg-bg-elevated p-6 space-y-4">
          <p className="text-base text-text-secondary leading-relaxed max-w-3xl">
            {tApps('abrigo.dashboard_body' as Parameters<typeof tApps>[0])}
          </p>
          <Link
            href="/apps/abrigo/dashboard"
            aria-label={tDashboard('open_dashboard_aria')}
            className="inline-flex items-center gap-2 px-5 py-3 bg-bg-surface border border-border-default rounded-lg text-text-primary hover:bg-bg-elevated hover:border-accent-default focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-default transition-colors font-medium"
          >
            <ArrowUpRight aria-hidden="true" className="h-5 w-5 text-text-muted" />
            {tDashboard('open_dashboard')}
          </Link>
        </div>
      </section>

      {/* GitHub documentation — published when the app ships and contracts are live */}
      <section aria-labelledby="github-heading" className="space-y-3">
        <div className="flex items-center gap-3">
          <h2 id="github-heading" className="text-xl font-semibold text-text-primary">
            {locale === 'es-CO' ? 'Documentación' : 'Documentation'}
          </h2>
          <StatusPill status="IN_PROGRESS" label={githubComing} />
        </div>
        <p className="text-base text-text-secondary leading-relaxed max-w-3xl">
          {tApps('abrigo.github_body' as Parameters<typeof tApps>[0])}
        </p>
      </section>

      {/* External presence */}
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
    </main>
  )
}
