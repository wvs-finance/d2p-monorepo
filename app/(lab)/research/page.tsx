import { research } from '@/.velite'
import { PublicationCard } from '@/components/PublicationCard'
import { getLocale, getTranslations } from 'next-intl/server'

export default async function ResearchPage() {
  const t = await getTranslations()
  const locale = (await getLocale()) as 'es-CO' | 'en'
  const sorted = [...research].sort((a, b) => (a.order ?? 999) - (b.order ?? 999))

  return (
    <main className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <header className="mb-8">
        <h1 className="text-4xl font-semibold text-text-primary">{t('research.h1')}</h1>
        <p className="mt-4 max-w-2xl text-base text-text-secondary leading-relaxed">
          {t('research.subheading')}
        </p>
      </header>
      {sorted.length === 0 ? (
        <div className="rounded-lg border border-border-default p-8 text-center">
          <h2 className="text-xl font-semibold text-text-primary">
            {t('research.empty_state.heading')}
          </h2>
          <p className="mt-2 text-text-secondary">{t('research.empty_state.body')}</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-6 list-none p-0">
          {sorted.map((r) => (
            <li key={r.slug} data-testid="publication-card">
              <PublicationCard research={r} locale={locale} t={t} />
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
