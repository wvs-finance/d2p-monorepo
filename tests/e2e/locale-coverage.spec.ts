// Phase 2 Wave 3 — filled by plan 02-07.
// Covers requirement(s): LAB-06
//
// Note: /about is excluded — that page does not exist in Phase 2.
// Routes covered: 6 × 2 locales = 12 test cases.
import { expect, test } from '@playwright/test'

// Route table for Phase 2 pages.
// h1_es / h1_en: exact substring to match in the first <h1>.
// h1_match: regex fallback for dynamic content pages.
const ROUTES = [
  { path: '/', h1_es: 'DS2P Labs', h1_en: 'DS2P Labs' },
  { path: '/team', h1_es: 'Equipo', h1_en: 'Team' },
  { path: '/research', h1_es: 'Investigación', h1_en: 'Research' },
  {
    path: '/apps/abrigo/iterations',
    h1_es: 'Catálogo de iteraciones — Abrigo',
    h1_en: 'Iteration catalog — Abrigo',
  },
  {
    path: '/apps/abrigo/iterations/pair-d/v1',
    h1_match: /Pair D/i,
  },
  {
    path: '/apps/abrigo/iterations/fx-vol-on-cpi-surprise/v1',
    h1_match: /(Volatilidad FX|FX volatility|FX vol|cpi)/i,
  },
] as const

// Regex that catches translation-key literals leaking into the DOM.
// Matches flat dot-notation identifiers like "lab.hero.h1" or "iterations.catalog.h1"
// but does NOT match normal prose like "We iterate on hypotheses" or URLs.
const LEAKAGE_PATTERN = /\b(lab|iterations|research|team|about|nav|common)\.[a-z_]+(\.[a-z_]+)+\b/

test.describe('phase-2 - LAB-06 — locale coverage: all Phase 2 pages render in both locales without key leakage', () => {
  for (const route of ROUTES) {
    for (const locale of ['es-CO', 'en'] as const) {
      test(`${route.path} — ${locale}: HTTP 200, no key leakage, locale H1`, async ({
        page,
        context,
      }) => {
        await context.addCookies([
          { name: 'NEXT_LOCALE', value: locale, url: 'http://localhost:3000' },
        ])

        const resp = await page.goto(route.path)
        expect(resp?.status()).toBe(200)

        await page.waitForLoadState('domcontentloaded')

        // Translation-key leakage check — visible text in <main> must not contain
        // raw dot-notation keys like "lab.hero.h1" or "research.type_label.paper".
        const visibleText = await page
          .locator('main')
          .innerText()
          .catch(() => '')
        expect(visibleText).not.toMatch(LEAKAGE_PATTERN)

        // H1 locale token check
        const h1 = await page.locator('h1').first().innerText()
        const expectedH1En = 'h1_en' in route ? route.h1_en : undefined
        const expectedH1Es = 'h1_es' in route ? route.h1_es : undefined
        const expectedMatch = 'h1_match' in route ? route.h1_match : undefined

        if (expectedMatch) {
          expect(h1).toMatch(expectedMatch)
        } else if (locale === 'en' && expectedH1En) {
          expect(h1).toContain(expectedH1En)
        } else if (locale === 'es-CO' && expectedH1Es) {
          expect(h1).toContain(expectedH1Es)
        }
      })
    }
  }
})
