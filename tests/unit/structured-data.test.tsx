/**
 * Unit tests for the StructuredData component — site-level JSON-LD only.
 * The econometric exercise is not published on this site, so there is no
 * per-iteration Dataset/ScholarlyArticle variant.
 *
 * @vitest-environment jsdom
 */

import { StructuredData } from '@/components/StructuredData'
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

afterEach(() => cleanup())

function getJsonLdScripts(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll<HTMLScriptElement>('script[type="application/ld+json"]'),
  )
}

function parseScript(el: HTMLScriptElement) {
  return JSON.parse(el.innerHTML)
}

describe('StructuredData — site mode', () => {
  it('renders 2 script blocks with @type Organization and WebSite', () => {
    const { container } = render(<StructuredData />)
    const scripts = getJsonLdScripts(container)
    expect(scripts).toHaveLength(2)
    const types = scripts.map((s) => parseScript(s)['@type'])
    expect(types).toContain('Organization')
    expect(types).toContain('WebSite')
  })

  it('Organization block links to the wvs-finance GitHub org via sameAs', () => {
    const { container } = render(<StructuredData />)
    const org = getJsonLdScripts(container)
      .map(parseScript)
      .find((b: { '@type': string }) => b['@type'] === 'Organization')
    expect(org).toBeDefined()
    expect(org.sameAs).toContain('https://github.com/wvs-finance')
  })

  it('XSS escape — emitted JSON-LD never contains a literal <script open tag', () => {
    const { container } = render(<StructuredData />)
    for (const script of getJsonLdScripts(container)) {
      expect(script.innerHTML).not.toMatch(/<script/)
    }
  })
})
