import { iterations } from '@/.velite'
import { DispositionMemo } from '@/components/DispositionMemo'
import { EvidenceChain } from '@/components/EvidenceChain'
import { IterationDetailHeader } from '@/components/IterationDetailHeader'
import { MDXRenderer } from '@/components/MDXRenderer'
import { StructuredData } from '@/components/StructuredData'
import { ArrowUpRight } from 'lucide-react'
import type { Metadata } from 'next'
import { getLocale, getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'

interface PageProps {
  params: Promise<{ slug: string; version: string }>
}

export async function generateStaticParams(): Promise<Array<{ slug: string; version: string }>> {
  return iterations.map((it) => ({ slug: it.slug, version: String(it.version) }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, version } = await params
  const it = iterations.find((i) => i.slug === slug && i.version === Number.parseInt(version, 10))
  if (!it) return {}

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://d2pfinance.xyz'
  const url = `${baseUrl}/apps/abrigo/iterations/${slug}/v${version}`
  // OG title uses English locale — most agent crawlers prefer English
  const title = `${it.title_en} — Abrigo / DS2P Labs`
  const betaStr = it.beta != null ? `β = ${it.beta}` : 'N/A'
  const pStr = it.p_value != null ? `p = ${it.p_value}` : 'N/A'
  const description = `${it.status} | ${betaStr} | ${pStr} | ${new Date(it.analysis_date).toISOString().slice(0, 10)}`

  return {
    title,
    description,
    openGraph: { title, description, url, type: 'article', siteName: 'd2p Finance' },
    twitter: { card: 'summary', title, description },
    alternates: { canonical: url },
  }
}

export default async function IterationDetailPage({ params }: PageProps) {
  const { slug, version } = await params
  const iteration = iterations.find(
    (i) => i.slug === slug && i.version === Number.parseInt(version, 10),
  )
  if (!iteration) return notFound()

  const t = await getTranslations()
  const locale = (await getLocale()) as 'es-CO' | 'en'
  const title = locale === 'es-CO' ? iteration.title_es : iteration.title_en
  const description =
    (iteration.disposition_memo ?? '').slice(0, 200) ||
    (locale === 'es-CO' ? iteration.title_es : iteration.title_en)

  return (
    <main className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <IterationDetailHeader iteration={iteration} locale={locale} t={t} />

      <div className="mt-12 grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-8 lg:gap-12">
        {/* Left column: narrative MDX content */}
        <article className="prose prose-base max-w-none text-text-primary">
          {iteration.code && <MDXRenderer code={iteration.code} />}

          {(iteration.status === 'FAIL' || iteration.status === 'PARKED') &&
            iteration.disposition_memo && (
              <DispositionMemo iteration={iteration} locale={locale} t={t} />
            )}
        </article>

        {/* Right column: evidence chain — sticky on lg screens */}
        <aside className="lg:sticky lg:top-[64px] lg:self-start space-y-6">
          <EvidenceChain iteration={iteration} t={t} />

          {/* Replication-verify <details> per CONTEXT.md — default collapsed */}
          {iteration.replication_hash && (
            <details className="rounded-lg border border-border-default p-4">
              <summary className="cursor-pointer text-sm font-medium text-text-primary select-none">
                {t('iterations.detail.verify.how_to_verify')}
              </summary>
              <div className="mt-3 space-y-2">
                <p className="text-sm text-text-secondary">
                  {t('iterations.detail.verify.instructions')}
                </p>
                <pre className="rounded bg-bg-surface p-3 font-mono text-xs overflow-x-auto">
                  <code>{`git clone https://github.com/wvs-finance/abrigo-analytics\ncd abrigo-analytics\nmake verify ITER=${iteration.slug}`}</code>
                </pre>
              </div>
            </details>
          )}

          {iteration.notebook_url && (
            <a
              href={iteration.notebook_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-accent-default underline-offset-2 hover:underline"
            >
              {t('iterations.detail.evidence.notebook_link_label')}
              <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
            </a>
          )}
        </aside>
      </div>

      <StructuredData
        mode="iteration"
        iteration={{
          slug: iteration.slug,
          version: iteration.version,
          title,
          description,
          status: iteration.status,
          analysisDate: new Date(iteration.analysis_date),
        }}
        locale={locale}
      />
    </main>
  )
}
