// DASH-08 — human-readable RSC status page.
// No 'use client', no nuqs, no wallet. Umbrella-scoped under (dashboard).
// Caching deferred (B1): force-dynamic + runtime=nodejs — live RPC probes on every request.
import { StatusPill } from '@/components/StatusPill'
import { checkAllChains } from '@/lib/status/health'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export const metadata: Metadata = {
  title: 'Estado / Status — DS2P Labs',
}

export default async function StatusPage() {
  const chains = await checkAllChains()
  const t = await getTranslations('dashboard')

  const buildHash = process.env.VERCEL_GIT_COMMIT_SHA ?? 'local'
  const freshness = new Date().toISOString()

  return (
    <main className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      {/* Page header */}
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-text-primary">{t('status.page_title')}</h1>
        <p className="text-base text-text-secondary">{t('status.page_subtitle')}</p>
      </header>

      {/* RPC health by chain */}
      <section aria-labelledby="rpc-heading" className="space-y-4">
        <h2 id="rpc-heading" className="text-xl font-semibold text-text-primary">
          {t('status.rpc_health_heading')}
        </h2>
        <ul className="divide-y divide-border-default" data-testid="chain-health-list">
          {chains.map((c) => (
            <li
              key={c.chainId}
              className="flex items-center justify-between py-3"
              data-testid={`chain-row-${c.name.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <span className="text-sm font-medium text-text-primary">{c.name}</span>
              <div className="flex items-center gap-4">
                {c.blockNumber !== undefined && (
                  <span className="text-xs font-mono text-text-muted hidden sm:inline">
                    #{c.blockNumber}
                  </span>
                )}
                {c.latencyMs !== undefined && (
                  <span className="text-xs font-mono text-text-muted hidden sm:inline">
                    {c.latencyMs}ms
                  </span>
                )}
                {/* CROSS-09: pill encodes color + icon + text — never color alone */}
                <StatusPill
                  status={c.status === 'healthy' ? 'PASS' : 'FAIL'}
                  label={
                    c.status === 'healthy'
                      ? t('status.health_healthy')
                      : t('status.health_degraded')
                  }
                />
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Build hash + freshness */}
      <section aria-labelledby="build-heading" className="space-y-2">
        <h2 id="build-heading" className="text-xl font-semibold text-text-primary sr-only">
          Build info
        </h2>
        <dl className="space-y-1">
          <div className="flex items-center gap-3">
            <dt className="text-sm text-text-secondary">{t('status.build_hash_label')}</dt>
            <dd className="text-sm font-mono text-text-primary" data-testid="build-hash">
              {buildHash}
            </dd>
          </div>
          <div className="flex items-center gap-3">
            <dt className="text-sm text-text-secondary">{t('status.freshness_label')}</dt>
            <dd className="text-sm font-mono text-text-primary" data-testid="freshness-timestamp">
              {freshness}
            </dd>
          </div>
        </dl>
      </section>

      {/* Per-app rollup */}
      <section aria-labelledby="apps-heading" className="space-y-4">
        <h2 id="apps-heading" className="text-xl font-semibold text-text-primary">
          {t('status.app_rollup_heading')}
        </h2>
        <ul className="divide-y divide-border-default">
          <li className="flex items-center justify-between py-3" data-testid="app-row-abrigo">
            <div className="space-y-0.5">
              <span className="text-sm font-medium text-text-primary">Abrigo</span>
              <p className="text-xs text-text-muted">0 instruments deployed</p>
            </div>
            {/* IN_PROGRESS pill: pre-launch state */}
            <StatusPill status="IN_PROGRESS" label={t('status.app_prelaunch_label')} />
          </li>
        </ul>
      </section>
    </main>
  )
}
