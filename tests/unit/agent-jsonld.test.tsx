/**
 * Unit tests for AgentStateJsonLd — the dashboard JSON-LD that MIRRORS the MCP
 * tool output schema (AGENT-10). An agent must be able to read the honest
 * pre-launch protocol state (status: not_deployed / empty) straight from the
 * HTML, with NO fabricated numeric pool balances (anti-fishing, CROSS-09).
 *
 * @vitest-environment jsdom
 */

import { AgentStateJsonLd } from '@/components/AgentStateJsonLd'
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
