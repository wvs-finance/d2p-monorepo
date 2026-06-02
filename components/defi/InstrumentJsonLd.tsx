// InstrumentJsonLd — RSC, structured data for the per-instrument detail page.
// Extends AgentStateJsonLd pattern (components/AgentStateJsonLd.tsx).
// Anti-fishing (CROSS-09): NO fabricated numerics. Pool state values are omitted.
// Simulated branch: emits simulated:true + provenance, NO strike/slope/address (AGENT-10).
// html const pre-built BEFORE the return (biome dangerouslySetInnerHTML rule — Phase 2).

import type { AbrigoInstrument } from '@/lib/apps/abrigo/instruments'

// XSS escape: replace literal '<' so JSON cannot break out of the script tag.
function escapeJsonLd(obj: object): string {
  return JSON.stringify(obj).replace(/</g, '\\u003c')
}

// Local JSON-LD shape — mirrors MCP get_instrument_terms shape for AGENT-10 parity.
interface PropertyValueLd {
  '@type': 'PropertyValue'
  name: string
  value: string
}

interface FinancialProductLd {
  '@context': 'https://schema.org'
  '@type': 'FinancialProduct'
  identifier: string
  name: string
  description: string
  additionalProperty: PropertyValueLd[]
}

interface InstrumentJsonLdProps {
  instrument: AbrigoInstrument
}

export function InstrumentJsonLd({ instrument }: InstrumentJsonLdProps): React.JSX.Element {
  let jsonLd: FinancialProductLd

  if (instrument.kind === 'live') {
    // Live branch: full on-chain fields — strike, slope, address, deployedAt all safe to read.
    jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'FinancialProduct',
      identifier: instrument.id,
      name: instrument.nameEn,
      description: `Abrigo convex hedge instrument — strike ${instrument.strike}, slope ${instrument.slope}`,
      additionalProperty: [
        { '@type': 'PropertyValue', name: 'chainId', value: String(instrument.chainId) },
        { '@type': 'PropertyValue', name: 'address', value: instrument.address },
        { '@type': 'PropertyValue', name: 'strike', value: String(instrument.strike) },
        { '@type': 'PropertyValue', name: 'slope', value: String(instrument.slope) },
        { '@type': 'PropertyValue', name: 'deployedAt', value: instrument.deployedAt },
      ],
    }
  } else {
    // Simulated branch: no strike/slope/address — anti-fishing (AGENT-10 / CROSS-09).
    // Emits simulated:true + fork-fixture provenance so agents can identify the data source.
    jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'FinancialProduct',
      identifier: instrument.id,
      name: instrument.nameEn,
      description: `Abrigo simulated convex instrument (fork-fixture, not deployed) — ${instrument.nameEn}`,
      additionalProperty: [
        { '@type': 'PropertyValue', name: 'chainId', value: String(instrument.chainId) },
        { '@type': 'PropertyValue', name: 'simulated', value: 'true' },
        {
          '@type': 'PropertyValue',
          name: 'provenance',
          value: 'fork-fixture: test-seeded mock pool, not market data',
        },
      ],
    }
  }

  // Pre-build html BEFORE the return — biome noDangerouslySetInnerHtml requires
  // single-line JSX; multi-line inline expressions cannot be suppressed by a comment.
  const html = escapeJsonLd(jsonLd)

  return (
    // biome-ignore lint/security/noDangerouslySetInnerHtml: intentional — JSON-LD requires an inline script; XSS-escaped by escapeJsonLd()
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: html }} />
  )
}
