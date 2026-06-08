/**
 * Unit tests for:
 * 1. AgentStateJsonLd — the dashboard JSON-LD that MIRRORS the MCP
 *    tool output schema (AGENT-10). An agent must be able to read the honest
 *    pre-launch protocol state (status: not_deployed / empty) straight from the
 *    HTML, with NO fabricated numeric pool balances (anti-fishing, CROSS-09).
 * 2. InstrumentJsonLd — the per-instrument JSON-LD (AGENT-10 / DEFI-08).
 *    Simulated branch: asserts NO strike/slope/address, simulated:true + provenance present.
 *
 * @vitest-environment jsdom
 */

import { AgentStateJsonLd } from '@/components/AgentStateJsonLd'
import { InstrumentJsonLd } from '@/components/defi/InstrumentJsonLd'
import type { SimulatedInstrument } from '@/lib/apps/abrigo/instruments'
import type { ChainAggregationResult } from '@/lib/dashboard/aggregator'
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

afterEach(() => cleanup())

// Empty-registry fixture — exactly what aggregateAllChains() returns pre-launch.
const emptyChains: ChainAggregationResult[] = [
  {
    chainId: 42220,
    chainName: 'Celo',
    status: 'empty',
    instruments: [],
    lastBlockSynced: null,
    fetchedAt: '2026-05-29T00:00:00.000Z',
  },
  {
    chainId: 8453,
    chainName: 'Base',
    status: 'empty',
    instruments: [],
    lastBlockSynced: null,
    fetchedAt: '2026-05-29T00:00:00.000Z',
  },
]

function getScript(container: HTMLElement): HTMLScriptElement {
  const el = container.querySelector<HTMLScriptElement>('script[type="application/ld+json"]')
  if (!el) throw new Error('no application/ld+json script rendered')
  return el
}

describe('AgentStateJsonLd — dashboard tool-mirroring JSON-LD', () => {
  it('renders a single application/ld+json SoftwareApplication block named Abrigo', () => {
    const { container } = render(<AgentStateJsonLd app="abrigo" chains={emptyChains} />)
    const scripts = container.querySelectorAll('script[type="application/ld+json"]')
    expect(scripts).toHaveLength(1)

    const obj = JSON.parse(getScript(container).innerHTML)
    expect(obj['@context']).toBe('https://schema.org')
    expect(obj['@type']).toBe('SoftwareApplication')
    expect(obj.name).toBe('Abrigo')
    expect(obj.applicationCategory).toBe('FinanceApplication')
  })

  it('mirrors tool output: an additionalProperty status === not_deployed while every chain is empty', () => {
    const { container } = render(<AgentStateJsonLd app="abrigo" chains={emptyChains} />)
    const obj = JSON.parse(getScript(container).innerHTML)

    expect(Array.isArray(obj.additionalProperty)).toBe(true)
    const status = obj.additionalProperty.find((p: { name: string }) => p.name === 'status')
    expect(status).toBeDefined()
    expect(status['@type']).toBe('PropertyValue')
    expect(status.value).toBe('not_deployed')
  })

  it('echoes per-chain status (empty) as additionalProperty entries', () => {
    const { container } = render(<AgentStateJsonLd app="abrigo" chains={emptyChains} />)
    const obj = JSON.parse(getScript(container).innerHTML)
    const celo = obj.additionalProperty.find((p: { name: string }) => p.name === 'chain:Celo')
    expect(celo).toBeDefined()
    expect(celo.value).toBe('empty')
  })

  it('contains NO fabricated numeric pool balance (anti-fishing)', () => {
    const { container } = render(<AgentStateJsonLd app="abrigo" chains={emptyChains} />)
    const html = getScript(container).innerHTML
    expect(html).not.toContain('poolBalance')
    // status strings only — no bare digit run masquerading as a balance
    const obj = JSON.parse(html)
    for (const p of obj.additionalProperty as Array<{ value: unknown }>) {
      // chainsConfigured is a count, allowed; balances are not present at all
      expect(typeof p.value).toBe('string')
    }
    expect(html).not.toMatch(/balance/i)
  })

  it('XSS-escapes — a literal < in a chain name becomes \\u003c, never breaks the script tag', () => {
    const hostile: ChainAggregationResult[] = [
      {
        chainId: 1,
        chainName: '</script><script>alert(1)</script>',
        status: 'empty',
        instruments: [],
        lastBlockSynced: null,
        fetchedAt: '2026-05-29T00:00:00.000Z',
      },
    ]
    const { container } = render(<AgentStateJsonLd app="abrigo" chains={hostile} />)
    const html = getScript(container).innerHTML
    expect(html).not.toMatch(/<script/)
    expect(html).toContain('\\u003c')
  })

  it('flips to live when any chain has instruments (sanity — honest non-empty path)', () => {
    const liveChains: ChainAggregationResult[] = [
      {
        chainId: 42220,
        chainName: 'Celo',
        status: 'healthy',
        instruments: [
          {
            id: 'abrigo-cop-1',
            name: 'Abrigo COP',
            nameEn: 'Abrigo COP',
            address: '0xabc',
            poolBalance: '1000',
            settlementCount: '0',
            lpPositionCount: '0',
          },
        ],
        lastBlockSynced: '123',
        fetchedAt: '2026-05-29T00:00:00.000Z',
      },
    ]
    const { container } = render(<AgentStateJsonLd app="abrigo" chains={liveChains} />)
    const obj = JSON.parse(getScript(container).innerHTML)
    const status = obj.additionalProperty.find((p: { name: string }) => p.name === 'status')
    expect(status.value).toBe('live')
  })
})

// ---------------------------------------------------------------------------
// InstrumentJsonLd — simulated branch honesty tests (AGENT-10 / DEFI-08 / CROSS-09)
// ---------------------------------------------------------------------------

const simulatedInstrument: SimulatedInstrument = {
  kind: 'simulated',
  id: 'ccop-usd-long-gamma',
  name: 'Cobertura larga gamma cCOP/USD',
  nameEn: 'cCOP/USD Long-Gamma Hedge',
  chainId: 8453,
  fixtureKey: 'ccop-usd-long-gamma',
}

describe('InstrumentJsonLd — simulated branch (anti-fishing honesty)', () => {
  it('emits a single application/ld+json FinancialProduct block', () => {
    const { container } = render(<InstrumentJsonLd instrument={simulatedInstrument} />)
    const scripts = container.querySelectorAll('script[type="application/ld+json"]')
    expect(scripts).toHaveLength(1)
    const obj = JSON.parse(getScript(container).innerHTML)
    expect(obj['@context']).toBe('https://schema.org')
    expect(obj['@type']).toBe('FinancialProduct')
  })

  it('does NOT emit strike, slope, or address PropertyValue (anti-fishing — CROSS-09)', () => {
    const { container } = render(<InstrumentJsonLd instrument={simulatedInstrument} />)
    const html = getScript(container).innerHTML
    // None of these fabricated fields may appear in the simulated JSON-LD
    expect(html).not.toMatch(/\bstrike\b/i)
    expect(html).not.toMatch(/\bslope\b/i)
    expect(html).not.toMatch(/\baddress\b/i)
    // Confirm no PropertyValue named strike/slope/address
    const obj = JSON.parse(html)
    const names = (obj.additionalProperty as Array<{ name: string }>).map((p) => p.name)
    expect(names).not.toContain('strike')
    expect(names).not.toContain('slope')
    expect(names).not.toContain('address')
  })

  it('carries simulated:true PropertyValue (honest agent signal)', () => {
    const { container } = render(<InstrumentJsonLd instrument={simulatedInstrument} />)
    const obj = JSON.parse(getScript(container).innerHTML)
    const simProp = (obj.additionalProperty as Array<{ name: string; value: string }>).find(
      (p) => p.name === 'simulated',
    )
    expect(simProp).toBeDefined()
    expect(simProp?.value).toBe('true')
  })

  it('carries provenance PropertyValue citing fork-fixture data source', () => {
    const { container } = render(<InstrumentJsonLd instrument={simulatedInstrument} />)
    const obj = JSON.parse(getScript(container).innerHTML)
    const provProp = (obj.additionalProperty as Array<{ name: string; value: string }>).find(
      (p) => p.name === 'provenance',
    )
    expect(provProp).toBeDefined()
    expect(provProp?.value).toMatch(/fork-fixture/i)
  })
})
