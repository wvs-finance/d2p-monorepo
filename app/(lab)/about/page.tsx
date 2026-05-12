// app/(lab)/about/page.tsx — RSC, no 'use client'
import { CheckmarkList } from '@/components/CheckmarkList'
import { NumberedStep } from '@/components/NumberedStep'
import { ArrowUpRight } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

const STEP_KEYS = ['01', '02', '03', '04', '05'] as const

export default async function AboutPage() {
  const t = await getTranslations()

  return (
    <article className="space-y-12">
      {/* Page header */}
      <header className="space-y-4 py-12">
        <h1 className="text-4xl font-semibold text-text-primary">{t('about.h1')}</h1>
        <p className="mt-4 max-w-2xl text-base text-text-secondary leading-relaxed">
          {t('about.subheading')}
        </p>
      </header>

      {/* Intro prose */}
      <section className="py-4 max-w-3xl">
        <p className="text-base text-text-primary leading-relaxed">{t('about.intro.p1')}</p>
        <p className="mt-4 text-base text-text-primary leading-relaxed">{t('about.intro.p2')}</p>
      </section>

      {/* 5 NumberedStep pipeline */}
      <section className="py-8">
        <h2 className="sr-only">Pipeline</h2>
        <div className="flex flex-col gap-16">
          {STEP_KEYS.map((k) => (
            <div key={k} data-testid="numbered-step">
              <NumberedStep
                number={t(`about.steps.${k}.number` as Parameters<typeof t>[0])}
                title={t(`about.steps.${k}.title` as Parameters<typeof t>[0])}
                body={t(`about.steps.${k}.body` as Parameters<typeof t>[0])}
              />
            </div>
          ))}
        </div>
      </section>

      {/* 4 CheckmarkList commitments */}
      <section className="py-8 max-w-3xl">
        <p className="text-base text-text-primary">{t('about.commitments.intro')}</p>
        <div className="mt-4" data-testid="commitments-wrapper">
          <CheckmarkList
            items={[
              t('about.commitments.item_1'),
              t('about.commitments.item_2'),
              t('about.commitments.item_3'),
              t('about.commitments.item_4'),
            ]}
          />
        </div>
      </section>

      {/* Reference link */}
      <section className="py-8">
        <h2 className="text-xl font-semibold text-text-primary">{t('about.reference.heading')}</h2>
        <a
          href="https://github.com/wvs-finance/abrigo-analytics#readme"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1 text-sm text-accent-default underline-offset-2 hover:underline"
        >
          {t('about.reference.link_label')}
          <ArrowUpRight className="h-3 w-3" />
        </a>
      </section>
    </article>
  )
}
