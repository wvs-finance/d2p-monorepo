import type { ChainAggregationResult } from '@/lib/dashboard/aggregator'

// Server Component (RSC) — intentionally no client directive.
// Emits a single <script type="application/ld+json"> whose fields MIRROR the MCP
// tool output schema (AGENT-10): a crawler/agent can read the honest protocol
// state straight from the dashboard HTML, without an MCP tool call.
//
// Anti-fishing (CROSS-09): only `status`/`empty` states are echoed. NO fabricated
// numeric pool balance ever appears in the structured data — when no contract is
// deployed the overall status is `not_deployed`, mirroring the tool's
// NotDeployedEnvelope / the aggregator's `status:'empty'` pattern.
//
// See: lib/mcp-tools/contract.ts (NotDeployedEnvelope), 04-RESEARCH Pattern 5.

// XSS escape: replace literal '<' with < so JSON cannot break out of the
// script tag (same helper as components/StructuredData.tsx).
function escapeJsonLd(obj: object): string {
  return JSON.stringify(obj).replace(/</g, '\\u003c')
}

interface AgentStateJsonLdProps {
  app: string
  chains: ChainAggregationResult[]
}

// Local JSON-LD shape. schema-dts' SoftwareApplicationLeaf rejects an inline
// additionalProperty array literal, so we type the emitted object directly —
// the field names still conform to schema.org SoftwareApplication / PropertyValue.
interface PropertyValueLd {
  '@type': 'PropertyValue'
  name: string
  value: string
}
interface SoftwareApplicationLd {
  '@context': 'https://schema.org'
  '@type': 'SoftwareApplication'
  name: string
  applicationCategory: string
  description: string
  additionalProperty: PropertyValueLd[]
}

export function AgentStateJsonLd({ app: _app, chains }: AgentStateJsonLdProps): React.JSX.Element {
  // Honest overall status: `live` only once a chain actually carries instruments;
  // otherwise `not_deployed` — never zero-filled to look live.
  const anyDeployed = chains.some((c) => c.instruments.length > 0)
  const overallStatus = anyDeployed ? 'live' : 'not_deployed'

  const jsonLd: SoftwareApplicationLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Abrigo',
    applicationCategory: 'FinanceApplication',
    description: 'Convex hedges for Colombian wage-earners — ∂²Π gamma',
    additionalProperty: [
      { '@type': 'PropertyValue', name: 'status', value: overallStatus },
      { '@type': 'PropertyValue', name: 'chainsConfigured', value: String(chains.length) },
      ...chains.map((c) => ({
        '@type': 'PropertyValue' as const,
        name: `chain:${c.chainName}`,
        value: c.status,
      })),
    ],
  }

  const html = escapeJsonLd(jsonLd)

  return (
    // biome-ignore lint/security/noDangerouslySetInnerHtml: intentional — JSON-LD requires an inline script; XSS-escaped by escapeJsonLd()
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: html }} />
  )
}
