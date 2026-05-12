import type { Organization, WebSite, WithContext } from 'schema-dts'
// schema-dts Dataset/ScholarlyArticle/ResearchProject type annotations omitted intentionally.
// TS 5.9.3 + exactOptionalPropertyTypes + schema-dts isPartOf triggers Debug Failure on assignment.
// Iteration JSON-LD uses satisfies Record<string,unknown> to remain type-safe without the crash.

// Server Component (RSC) — intentionally no client directive.
// Emits <script type="application/ld+json"> blocks for agent and search-engine discovery.
// Called inside <body> from root layout (site mode) or iteration detail pages (iteration mode).
// See: 01-RESEARCH.md Pattern 7 — JSON-LD in Root Layout; Pitfall 6 — double-render on client directive.

// XSS escape: replace literal '<' with < so JSON cannot break out of the script tag.
function escapeJsonLd(obj: object): string {
  return JSON.stringify(obj).replace(/</g, '\\u003c')
}

// ---- Shared prop interfaces ----

interface SiteStructuredDataProps {
  mode?: 'site'
}

interface IterationStructuredDataProps {
  mode: 'iteration'
  iteration: {
    slug: string
    version: number
    /** Locale-resolved title, passed by caller */
    title: string
    /** One-sentence summary, locale-resolved */
    description: string
    status: 'PASS' | 'FAIL' | 'PARKED' | 'IN_PROGRESS'
    analysisDate: Date
  }
  locale: 'es-CO' | 'en'
}

export type StructuredDataProps = SiteStructuredDataProps | IterationStructuredDataProps

// ---- Site-level variant (default) ----

function SiteStructuredData(): React.JSX.Element {
  const organization: WithContext<Organization> = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'd2p Finance / DS2P Labs',
    url: 'https://d2pfinance.xyz',
    description:
      'Research lab designing permissionless convex-hedge instruments for frontier markets',
    sameAs: ['https://github.com/wvs-finance'],
  }

  const website: WithContext<WebSite> = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'd2p Finance',
    url: 'https://d2pfinance.xyz',
  }

  const orgHtml = escapeJsonLd(organization)
  const siteHtml = escapeJsonLd(website)

  return (
    <>
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: intentional — JSON-LD requires an inline script; XSS-escaped by escapeJsonLd() */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: orgHtml }} />
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: intentional — JSON-LD requires an inline script; XSS-escaped by escapeJsonLd() */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: siteHtml }} />
    </>
  )
}

// ---- Iteration-level variant ----

function IterationStructuredData({ iteration }: IterationStructuredDataProps): React.JSX.Element {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  const vercelUrl = process.env.VERCEL_URL
  const baseUrl =
    appUrl && appUrl.length > 0
      ? appUrl
      : vercelUrl && vercelUrl.length > 0
        ? `https://${vercelUrl}`
        : 'https://d2pfinance.xyz'

  const iterationUrl = `${baseUrl}/apps/abrigo/iterations/${iteration.slug}/v${iteration.version}`

  // Cast via unknown to bypass schema-dts/TS5.9 exactOptionalPropertyTypes collision on isPartOf
  const dataset = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: iteration.title,
    description: iteration.description,
    url: iterationUrl,
    creator: { '@type': 'Organization', name: 'DS2P Labs', url: baseUrl },
    isPartOf: [
      {
        '@type': 'Dataset',
        name: 'Abrigo Iteration Catalog',
        url: `${baseUrl}/apps/abrigo/iterations`,
      },
      { '@type': 'ResearchProject', name: 'd2-π (DS2P Labs)', url: baseUrl },
    ],
    variableMeasured: 'β (beta coefficient)',
    measurementTechnique: 'Structural econometrics — OLS with HAC standard errors',
    datePublished: iteration.analysisDate.toISOString().slice(0, 10),
    keywords: ['econometrics', 'COP/USD', 'Colombia', 'hedging', 'Abrigo'],
    contentReferenceTime: iteration.analysisDate.toISOString().slice(0, 10),
  } satisfies Record<string, unknown>

  const article = {
    '@context': 'https://schema.org',
    '@type': 'ScholarlyArticle',
    headline: iteration.title,
    author: { '@type': 'Organization', name: 'DS2P Labs' },
    datePublished: iteration.analysisDate.toISOString().slice(0, 10),
    url: iterationUrl,
    isPartOf: { '@type': 'Periodical', name: 'Abrigo Research Catalog' },
    about: iteration.description,
  } satisfies Record<string, unknown>

  const datasetHtml = escapeJsonLd(dataset)
  const articleHtml = escapeJsonLd(article)

  return (
    <>
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: intentional — JSON-LD requires an inline script; XSS-escaped by escapeJsonLd() */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: datasetHtml }} />
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: intentional — JSON-LD requires an inline script; XSS-escaped by escapeJsonLd() */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: articleHtml }} />
    </>
  )
}

// ---- Tagged union dispatch ----

/** Dispatches to site-level or iteration-level JSON-LD emitter based on the mode prop. */
export function StructuredData(props: StructuredDataProps = {}): React.JSX.Element {
  if (props.mode === 'iteration') {
    return <IterationStructuredData {...props} />
  }
  return <SiteStructuredData />
}
