/**
 * Unit tests for the StructuredData component — Dataset + ScholarlyArticle variants.
 * Tests JSON-LD emission, isPartOf chains, XSS escaping, and baseUrl fallback.
 *
 * @vitest-environment jsdom
 */

import { StructuredData } from '@/components/StructuredData'
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => cleanup())

const ITER_PROPS = {
  mode: 'iteration' as const,
  iteration: {
    slug: 'pair-d',
    version: 1,
    title: 'Pair D — Colombian young-worker services × COP/USD lagged 6–12mo',
    description: 'PASS | β = 0.13670985',
    status: 'PASS' as const,
    analysisDate: new Date('2026-04-30T00:00:00.000Z'),
  },
  locale: 'en' as const,
}

function getJsonLdScripts(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll<HTMLScriptElement>('script[type="application/ld+json"]'),
  )
}

function parseScript(el: HTMLScriptElement) {
  return JSON.parse(el.innerHTML)
}

describe('StructuredData — iteration mode', () => {
  it('Test 1: renders exactly 2 script[type="application/ld+json"] blocks', () => {
    const { container } = render(<StructuredData {...ITER_PROPS} />)
    const scripts = getJsonLdScripts(container)
    expect(scripts).toHaveLength(2)
  })

  it('Test 2: one block has @type Dataset with isPartOf array of 2 entries (Abrigo Catalog + d2-π Labs)', () => {
    const { container } = render(<StructuredData {...ITER_PROPS} />)
    const scripts = getJsonLdScripts(container)
    const dataset = scripts
      .map(parseScript)
      .find((b: { '@type': string }) => b['@type'] === 'Dataset')
    expect(dataset).toBeDefined()
    expect(Array.isArray(dataset.isPartOf)).toBe(true)
    expect(dataset.isPartOf).toHaveLength(2)
    const names = dataset.isPartOf.map((entry: { name: string }) => entry.name)
    expect(names).toContain('Abrigo Iteration Catalog')
    expect(names).toContain('d2-π (DS2P Labs)')
  })

  it('Test 3: one block has @type ScholarlyArticle with isPartOf as a Periodical', () => {
    const { container } = render(<StructuredData {...ITER_PROPS} />)
    const scripts = getJsonLdScripts(container)
    const article = scripts
      .map(parseScript)
      .find((b: { '@type': string }) => b['@type'] === 'ScholarlyArticle')
    expect(article).toBeDefined()
    expect(article.isPartOf).toBeDefined()
    expect(article.isPartOf['@type']).toBe('Periodical')
    expect(article.isPartOf.name).toBe('Abrigo Research Catalog')
  })

  it('Test 4: XSS escape — a < in the title becomes \\u003c in emitted JSON', () => {
    const xssProps = {
      ...ITER_PROPS,
      iteration: {
        ...ITER_PROPS.iteration,
        title: '<script>alert(1)</script>',
        description: 'safe',
      },
    }
    const { container } = render(<StructuredData {...xssProps} />)
    const scripts = getJsonLdScripts(container)
    // Raw innerHTML should NOT contain a literal < except inside the JSON string as <
    for (const script of scripts) {
      expect(script.innerHTML).not.toMatch(/<script/)
      expect(script.innerHTML).toContain('\\u003c')
    }
  })

  it('Test 5: baseUrl falls back to https://d2pfinance.xyz when env vars are absent', () => {
    // Use vi.stubEnv to properly unset env vars (process.env assignment coerces to string "undefined")
    vi.stubEnv('NEXT_PUBLIC_APP_URL', '')
    vi.stubEnv('VERCEL_URL', '')

    const { container } = render(<StructuredData {...ITER_PROPS} />)
    const scripts = getJsonLdScripts(container)
    const dataset = scripts
      .map(parseScript)
      .find((b: { '@type': string }) => b['@type'] === 'Dataset')

    expect(dataset.url).toContain('https://d2pfinance.xyz')
    expect(dataset.url).toContain('/apps/abrigo/iterations/pair-d/v1')

    vi.unstubAllEnvs()
  })
})

describe('StructuredData — site mode (regression)', () => {
  it('renders 2 script blocks with @type Organization and WebSite', () => {
    const { container } = render(<StructuredData />)
    const scripts = getJsonLdScripts(container)
    expect(scripts).toHaveLength(2)
    const types = scripts.map((s) => parseScript(s)['@type'])
    expect(types).toContain('Organization')
    expect(types).toContain('WebSite')
  })
})
