// /research/[slug] — locale-aware hybrid reading page (Plan C1, 03.1-03).
//
// Renders one of three modes for a research entry:
//   Mode A (readable_on_site:true)  → the full on-site MDX body + TOC + PaperBridge
//   Mode B (!readable_on_site && arxiv_id) → header + abstract + PaperBridge (arXiv landing)
//   Fallback (no body AND no bridge) → notFound()
//
// LOCALE: the route is `[slug]` only (no `[locale]` segment). The active locale comes
// from the NEXT_LOCALE cookie (getLocale from next-intl/server). We select the entry
// matching {slug, locale}; if the active-locale body is missing we fall back to 'es'
// (es-CO is authored first). Each page therefore renders a SINGLE-locale body.
//
// LANDMARK: app/(lab)/layout.tsx no longer renders <header>/<main>; the root TopNav is
// the sole site header. This page renders its OWN single <main> (one main landmark/page).
//
// COMPONENT INJECTION: the compiled body resolves custom components ONLY via the
// `components` PROP passed to MDXRenderer (Velite function-body output, no
// providerImportSource). useMDXComponents is a no-op and is NOT used here.
import { research } from '@/.velite'
import { StructuredData } from '@/components/StructuredData'
import { ArticleTOC } from '@/components/research/ArticleTOC'
import { PaperBridge } from '@/components/research/PaperBridge'
import { ResearchArticle } from '@/components/research/ResearchArticle'
import { getResearchComponents } from '@/components/research/mdx-components'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/format/date'
import { deriveArxivUrls } from '@/lib/research/arxiv'
import type { Metadata } from 'next'
import { getLocale, getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'
import type { ScholarlyArticle, WithContext } from 'schema-dts'

const SITE_URL = 'https://d2pfinance.xyz'

type ResearchEntry = (typeof research)[number]

// Select the entry for {slug, activeLocale}; fall back to the es entry, then any.
function selectEntry(slug: string, locale: 'es' | 'en'): ResearchEntry | undefined {
  return (
    research.find((r) => r.slug === slug && r.locale === locale) ??
    research.find((r) => r.slug === slug && r.locale === 'es') ??
    research.find((r) => r.slug === slug)
  )
}

// generateStaticParams enumerates distinct slugs (locale is resolved at render from
// the cookie, not the URL — the route has no [locale] segment).
export function generateStaticParams(): { slug: string }[] {
  const slugs = [...new Set(research.map((r) => r.slug))]
  return slugs.map((slug) => ({ slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const localeFull = (await getLocale()) as 'es-CO' | 'en'
  const locale: 'es' | 'en' = localeFull === 'en' ? 'en' : 'es'
  const entry = selectEntry(slug, locale)
  if (!entry) return {}

  const title = locale === 'en' ? entry.title_en : entry.title_es
  const description =
    (locale === 'en'
      ? (entry.abstract_en ?? entry.summary_en)
      : (entry.abstract_es ?? entry.summary_es)) ?? ''
  const canonical = `${SITE_URL}/research/${slug}`

  return {
    title: `${title} — DS2P Labs`,
    description,
    alternates: { canonical },
    openGraph: {
      title: `${title} — DS2P Labs`,
      description,
      type: 'article',
      url: canonical,
    },
  }
}

export default async function ResearchReadingPage({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<React.JSX.Element> {
  // Next 16: params is a Promise — await it.
  const { slug } = await params
  const localeFull = (await getLocale()) as 'es-CO' | 'en'
  const locale: 'es' | 'en' = localeFull === 'en' ? 'en' : 'es'
  const t = await getTranslations('research.reading')
  const tr = await getTranslations('research')

  const entry = selectEntry(slug, locale)
  if (!entry) notFound()

  const title = locale === 'en' ? entry.title_en : entry.title_es
  const abstract = locale === 'en' ? entry.abstract_en : entry.abstract_es

  // Mode resolution.
  const hasBody = entry.readable_on_site && entry.body.trim().length > 0
  const hasBridge = Boolean(entry.arxiv_id || entry.pdf_url || entry.external_url)
  if (!hasBody && !hasBridge) notFound()

  const arxiv = entry.arxiv_id ? deriveArxivUrls(entry.arxiv_id) : undefined
  const bridgeLabels = {
    arxiv: t('arxiv'),
    pdf: t('pdf'),
    doi: t('doi'),
    copy: t('copy_bibtex'),
    copied: t('copied'),
    bibtex_heading: t('bibtex_heading'),
  }

  // ScholarlyArticle JSON-LD — build the html string BEFORE return (Plan 02-05 decision).
  const jsonLd: WithContext<ScholarlyArticle> = {
    '@context': 'https://schema.org',
    '@type': 'ScholarlyArticle',
    headline: title,
    author: entry.authors.map((name) => ({ '@type': 'Person', name })),
    datePublished: new Date(entry.date).toISOString(),
    inLanguage: locale === 'en' ? 'en' : 'es-CO',
    url: `${SITE_URL}/research/${slug}`,
    ...(abstract ? { abstract } : {}),
    ...(arxiv ? { sameAs: arxiv.abs } : {}),
  }
  const jsonLdHtml = JSON.stringify(jsonLd).replace(/</g, '\\u003c')

  const components = getResearchComponents(locale)
  const dateLabel = formatDate(new Date(entry.date), localeFull)
  const author = entry.authors.join(', ')

  // Only reserve the TOC rail/column when the body actually has H2/H3 headings.
  // Without this guard a heading-less body left an empty <aside> + a dead 16rem
  // grid column (Evidence Collector 03.1-03 finding).
  const hasToc = hasBody && Array.isArray(entry.toc) && entry.toc.length > 0

  // The FAIL memo (fx-vol-cpi-closed-fail) renders at IDENTICAL structural weight to a
  // PASS: full body, text-text-primary prose, no collapse, no muting (CROSS-09 / LAB-05).
  return (
    <main className="mx-auto max-w-[1100px] px-4 py-12 sm:px-6 lg:px-8">
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD requires inline script; XSS-escaped above */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml }} />
      <StructuredData />

      {/* Footnote sidenote float (lg+) + display-equation scroll. CSS-only, no-JS baseline. */}
      <style>{`
        .research-prose .footnotes { margin-top: 3rem; border-top: 1px solid var(--color-border-default); padding-top: 1rem; font-size: 0.875rem; color: var(--color-text-secondary); }
        @media (min-width: 1024px) {
          .research-prose .footnotes ol > li { margin-bottom: 0.5rem; }
        }
        .katex-display { overflow-x: auto; overflow-y: hidden; }
      `}</style>

      <div
        className={
          hasToc ? 'lg:grid lg:grid-cols-[minmax(0,64ch)_16rem] lg:gap-12' : 'mx-auto max-w-[64ch]'
        }
      >
        <div>
          <header className="mb-8">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge variant="outline">{tr(`type_label.${entry.type}`)}</Badge>
              <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-wider">
                {tr(`track_label.${entry.track}`)}
              </Badge>
            </div>
            <h1 className="text-3xl font-semibold leading-tight text-text-primary">{title}</h1>
            <p className="mt-3 font-mono text-sm text-text-muted">
              {dateLabel} · {author}
            </p>
            {abstract && (
              <p className="mt-4 text-base leading-relaxed text-text-secondary">{abstract}</p>
            )}
          </header>

          {hasBody ? (
            <ResearchArticle code={entry.body} components={components} />
          ) : (
            <p className="text-base leading-relaxed text-text-secondary">
              {locale === 'en' ? entry.summary_en : entry.summary_es}
            </p>
          )}

          <PaperBridge
            {...(arxiv ? { arxivAbs: arxiv.abs, arxivPdf: arxiv.pdf } : {})}
            {...(entry.pdf_url ? { pdfUrl: entry.pdf_url } : {})}
            {...(entry.doi ? { doi: entry.doi } : {})}
            {...(entry.bibtex ? { bibtex: entry.bibtex } : {})}
            labels={bridgeLabels}
          />

          <footer className="mt-16 border-t border-border-default pt-6 font-mono text-xs text-text-muted">
            DS2P Labs · ∂²Π
          </footer>
        </div>

        {hasToc && (
          <aside className="mt-12 lg:mt-0">
            <ArticleTOC toc={entry.toc} label={t('toc_heading')} />
          </aside>
        )}
      </div>
    </main>
  )
}
