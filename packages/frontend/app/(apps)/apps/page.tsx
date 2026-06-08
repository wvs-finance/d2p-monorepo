import { StatusPill } from '@/components/StatusPill'
import { type AppStatus, apps } from '@/lib/apps/registry'
import { ArrowUpRight } from 'lucide-react'
import { getLocale, getTranslations } from 'next-intl/server'
import Link from 'next/link'

// Canonical agent-scrapeable apps index (NAV-08).
// Each entry mirrors the dropdown content — name, description, status, links.
// This page is intentionally sparse: its job is machine and human discoverability.

const STATUS_MAP: Record<AppStatus, { pillStatus: 'PASS' | 'IN_PROGRESS' | 'PARKED' }> = {
  active: { pillStatus: 'PASS' },
  'coming-soon': { pillStatus: 'IN_PROGRESS' },
  archived: { pillStatus: 'PARKED' },
}

export default async function AppsIndexPage() {
  const locale = (await getLocale()) as 'es-CO' | 'en'
  const tApps = await getTranslations('apps')
  const tNav = await getTranslations('nav')

  return (
    <main className="max-w-4xl mx-auto px-6 py-12 space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-text-primary">{tNav('apps')}</h1>
        <p className="text-base text-text-secondary">
          {locale === 'es-CO'
            ? 'Todas las aplicaciones de instrumentos de cobertura del laboratorio d2-π.'
            : 'All hedge-instrument app families incubated by the d2-π lab.'}
        </p>
      </header>

      <ul className="space-y-4">
        {apps.map((app) => {
          const { pillStatus } = STATUS_MAP[app.status]
          const description = tApps(`${app.slug}.description` as Parameters<typeof tApps>[0])
          const statusLabel = tApps(
            (app.status === 'active'
              ? 'status_active'
              : app.status === 'coming-soon'
                ? 'status_coming_soon'
                : 'status_archived') as Parameters<typeof tApps>[0],
          )

          return (
            <li
              key={app.slug}
              className="flex items-start justify-between gap-4 p-4 bg-bg-elevated border border-border-default rounded-lg"
            >
              <div className="flex flex-col gap-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <Link
                    href={app.internal_path}
                    className="text-base font-semibold text-text-primary hover:text-accent-default focus:outline-none focus-visible:underline"
                  >
                    {app.name}
                  </Link>
                  <StatusPill status={pillStatus} label={statusLabel} />
                </div>
                <p className="text-sm text-text-secondary">{description}</p>
              </div>
              {app.external_url && (
                <a
                  href={app.external_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={tApps('external_link_label')}
                  className="flex-shrink-0 flex items-center gap-1 text-xs text-text-muted hover:text-text-secondary focus:outline-none focus-visible:underline"
                >
                  <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
                </a>
              )}
            </li>
          )
        })}
      </ul>
    </main>
  )
}
