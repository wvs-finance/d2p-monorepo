import { iterations } from '@/.velite'
import { IterationCatalogCard } from '@/components/IterationCatalogCard'
import { IterationStatusFilter } from '@/components/IterationStatusFilter'
// RSC — no 'use client'. NuqsAdapter in (apps)/layout.tsx enables client filter component.
// ITER-01: ALL iterations shown by default — no PASS-only filtering at source.
// ITER-02: IterationCatalogCard enforces min-h-[120px] equally for all statuses.
import { getLocale, getTranslations } from 'next-intl/server'

// force-dynamic: page reads searchParams (status filter) at request time
export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ status?: string }>
}

export default async function IterationsCatalogPage({ searchParams }: PageProps) {
  const t = await getTranslations()
  const locale = (await getLocale()) as 'es-CO' | 'en'
  const sp = await searchParams
  const activeStatus = sp.status?.toUpperCase() as
    | 'PASS'
    | 'FAIL'
    | 'PARKED'
    | 'IN_PROGRESS'
    | undefined

  // Count ALL statuses BEFORE filtering — required by ITER-01 (anti-fishing principle)
  const counts = iterations.reduce(
    (acc, it) => {
      acc[it.status]++
      acc.total++
      return acc
    },
    { PASS: 0, FAIL: 0, PARKED: 0, IN_PROGRESS: 0, total: 0 } as {
      PASS: number
      FAIL: number
      PARKED: number
      IN_PROGRESS: number
      total: number
    },
  )

  // Filter ONLY if explicit status param is present — default shows ALL (ITER-01)
  const visible =
    activeStatus !== undefined ? iterations.filter((i) => i.status === activeStatus) : iterations
  const sorted = [...visible].sort(
    (a, b) => +new Date(b.analysis_date) - +new Date(a.analysis_date),
  )

  const statusLabels = {
    PASS: t('iterations.status.pass.label'),
    FAIL: t('iterations.status.fail.label'),
    PARKED: t('iterations.status.parked.label'),
    IN_PROGRESS: t('iterations.status.in_progress.label'),
  }

  const filterLabels = {
    all: t('iterations.filter.all'),
    aria_label: t('iterations.filter.aria_label'),
    pass: statusLabels.PASS,
    fail: statusLabels.FAIL,
    parked: statusLabels.PARKED,
    in_progress: statusLabels.IN_PROGRESS,
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://d2pfinance.xyz'
  // Pre-build JSON-LD HTML string for XSS-safe script injection (see StructuredData.tsx pattern)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: t('iterations.catalog.h1'),
    url: `${baseUrl}/apps/abrigo/iterations`,
    isPartOf: { '@type': 'WebSite', name: 'd2p Finance', url: baseUrl },
    hasPart: sorted.map((it) => ({
      '@type': 'Dataset',
      name: locale === 'es-CO' ? it.title_es : it.title_en,
      url: `${baseUrl}/apps/abrigo/iterations/${it.slug}/v${it.version}`,
    })),
  }
  const jsonLdHtml = JSON.stringify(jsonLd).replace(/</g, '\\u003c')

  return (
    <main className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <header className="mb-8">
        <h1 className="text-4xl font-semibold text-text-primary">{t('iterations.catalog.h1')}</h1>
        <p className="mt-4 max-w-2xl text-base text-text-secondary leading-relaxed">
          {t('iterations.catalog.subheading')}
        </p>
      </header>

      <IterationStatusFilter counts={counts} labels={filterLabels} />

      {sorted.length === 0 ? (
        <div className="rounded-lg border border-border-default p-8 text-center">
          <h2 className="text-xl font-semibold text-text-primary">
            {t('iterations.catalog.empty_state.heading')}
          </h2>
          <p className="mt-2 text-text-secondary">{t('iterations.catalog.empty_state.body')}</p>
        </div>
      ) : (
        // auto-rows-fr + h-full on the anchor (set in IterationCatalogCard) makes every
        // card stretch to match the tallest in its row. CROSS-09 / ITER-02: cards must
        // have identical dimensions regardless of status — the β row only renders for
        // PASS/FAIL cards, so without this PASS/FAIL would be visually taller than
        // IN_PROGRESS/PARKED, which is exactly the anti-fishing breach the invariant
        // forbids.
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 list-none auto-rows-fr">
          {sorted.map((it) => (
            <li key={`${it.slug}-${it.version}`} data-testid="iteration-catalog-card">
              <IterationCatalogCard iteration={it} locale={locale} labels={{ statusLabels }} />
            </li>
          ))}
        </ul>
      )}

      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: intentional — JSON-LD requires an inline script; XSS-escaped by .replace(<, <) */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml }} />
    </main>
  )
}
