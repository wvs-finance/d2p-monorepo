import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

// axe-core WCAG 2.2 AA scans for the research reading surface (Plan 03.1-04 / C2).
// Run with: pnpm playwright test tests/a11y/research.spec.ts
// In CI / Evidence Collector: triggered against the prod build (pnpm build && pnpm start -p 3040).
//
// LOCALE: the reading route /research/[slug] has NO [locale] URL segment — locale is
// resolved from the NEXT_LOCALE cookie (es-CO default, en when the cookie is set). We
// therefore exercise BOTH locales by toggling the cookie, mirroring homepage.spec.ts.
//
// MathML CAVEAT: axe-core CANNOT certify the accessibility of KaTeX's MathML output
// (no rule coverage for <math>/<annotation>). The manual NVDA/VoiceOver spot-check of a
// rendered equation is a HARD exit criterion recorded (or tracked-waived) in
// docs/a11y-audit.md — it is NOT covered by this automated spec.

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

// A migrated Mode-A reading page (full on-site body + TOC + PaperBridge). Stable slug
// from Plan B/C1 content (content/research/pair-d-dispatch-brief.{es,en}.mdx).
const READING_SLUG = 'pair-d-dispatch-brief'

const BASE = process.env.PLAYWRIGHT_TEST_BASE_URL ?? 'http://localhost:3040'

test.describe('research index (/research)', () => {
  test('es-CO index has no WCAG 2.2 AA violations', async ({ page }) => {
    await page.goto('/research')
    const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()
    expect(results.violations).toEqual([])
  })

  test('en index has no WCAG 2.2 AA violations', async ({ page, context }) => {
    await context.addCookies([{ name: 'NEXT_LOCALE', value: 'en', url: BASE }])
    await page.goto('/research')
    const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()
    expect(results.violations).toEqual([])
  })
})

test.describe(`research reading page (/research/${READING_SLUG})`, () => {
  test('es-CO reading page has no WCAG 2.2 AA violations', async ({ page }) => {
    await page.goto(`/research/${READING_SLUG}`)
    // The TOC heading proves the es-CO reading chrome is live before the scan.
    await expect(page.getByRole('main')).toBeVisible()
    const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()
    expect(results.violations).toEqual([])
  })

  test('en reading page has no WCAG 2.2 AA violations', async ({ page, context }) => {
    await context.addCookies([{ name: 'NEXT_LOCALE', value: 'en', url: BASE }])
    await page.goto(`/research/${READING_SLUG}`)
    await expect(page.getByRole('main')).toBeVisible()
    const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()
    expect(results.violations).toEqual([])
  })
})
