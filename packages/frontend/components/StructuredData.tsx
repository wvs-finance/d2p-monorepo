import type { Organization, WebSite, WithContext } from 'schema-dts'

// Server Component (RSC) — intentionally no client directive.
// Emits <script type="application/ld+json"> blocks for agent and search-engine discovery.
// Called inside <body> from the root layout. Only site-level structured data is emitted;
// the econometric exercise is not published on this site, so there are no per-iteration
// Dataset/ScholarlyArticle blocks.
// See: 01-RESEARCH.md Pattern 7 — JSON-LD in Root Layout.

// XSS escape: replace literal '<' with < so JSON cannot break out of the script tag.
function escapeJsonLd(obj: object): string {
  return JSON.stringify(obj).replace(/</g, '\\u003c')
}

export function StructuredData(): React.JSX.Element {
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
