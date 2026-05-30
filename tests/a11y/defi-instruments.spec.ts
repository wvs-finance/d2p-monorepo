// DEFI-06: axe a11y on instruments index.
// Covers the honest-empty index page; axe must report 0 violations.
// Runs under the axe project (Desktop Chrome) against local prod build.
import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test.describe('DEFI-06 — axe a11y on instruments index', () => {
  test('axe clean on /apps/abrigo/instruments (es-CO)', async ({ page }) => {
    await page
      .context()
      .addCookies([{ name: 'NEXT_LOCALE', value: 'es-CO', domain: 'localhost', path: '/' }])
    await page.goto('/apps/abrigo/instruments')
    // Wait for the page to be fully rendered before running axe.
    await expect(page.locator('h1')).toBeVisible()

    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toHaveLength(0)
  })

  test('axe clean on /apps/abrigo/instruments (en)', async ({ page }) => {
    await page
      .context()
      .addCookies([{ name: 'NEXT_LOCALE', value: 'en', domain: 'localhost', path: '/' }])
    await page.goto('/apps/abrigo/instruments')
    await expect(page.locator('h1')).toBeVisible()

    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toHaveLength(0)
  })
})
