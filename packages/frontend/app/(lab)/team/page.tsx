import { ContributorCard } from '@/components/ContributorCard'
import { contributors } from '@/lib/team/contributors'
import { getLocale, getTranslations } from 'next-intl/server'

export default async function TeamPage() {
  const t = await getTranslations()
  const locale = (await getLocale()) as 'es-CO' | 'en'

  return (
    <main className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <header className="mb-8">
        <h1 className="text-4xl font-semibold text-text-primary">{t('team.h1')}</h1>
        <p className="mt-4 max-w-2xl text-base text-text-secondary leading-relaxed">
          {t('team.subheading')}
        </p>
      </header>
      <ul className="list-none p-0">
        {contributors.map((c) => (
          <ContributorCard
            key={c.slug}
            contributor={c}
            t={t}
            locale={locale}
            data-testid="contributor-card"
          />
        ))}
      </ul>
    </main>
  )
}
