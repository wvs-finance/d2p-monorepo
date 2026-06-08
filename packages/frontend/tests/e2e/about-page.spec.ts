// Phase 2 Wave 3 — filled by plan 02-03.
// Covers requirement(s): LAB-05
import { expect, test } from '@playwright/test'

test.describe('phase-2 - LAB-05 — about / methodology page', () => {
  test('GET /about returns 200', async ({ page }) => {
    const response = await page.goto('/about')
    expect(response?.status()).toBe(200)
  })

  test('/about H1 reads "Metodología" in default (es-CO) locale', async ({ page }) => {
    // Default locale is es-CO per i18n/request.ts cookie fallback
    await page.goto('/about')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Metodología')
  })

  test('/about renders exactly 5 NumberedStep components', async ({ page }) => {
    await page.goto('/about')
    const steps = page.locator('[data-testid="numbered-step"]')
    await expect(steps).toHaveCount(5)
  })

  test('/about each NumberedStep has number 01..05 visible', async ({ page }) => {
    await page.goto('/about')
    for (const num of ['01', '02', '03', '04', '05']) {
      await expect(page.getByText(num).first()).toBeVisible()
    }
  })

  test('/about renders exactly 4 CheckmarkList items in commitments wrapper', async ({ page }) => {
    await page.goto('/about')
    const listItems = page.locator('[data-testid="commitments-wrapper"] ul > li')
    await expect(listItems).toHaveCount(4)
  })

  test('/about commitments include CheckCircle2 SVG icons', async ({ page }) => {
    await page.goto('/about')
    // CheckmarkList renders lucide CheckCircle2 with aria-hidden="true"
    const icons = page.locator('[data-testid="commitments-wrapper"] ul > li svg')
    await expect(icons).toHaveCount(4)
  })

  test('/about H1 reads "Methodology" in en locale via cookie', async ({ page }) => {
    await page
      .context()
      .addCookies([{ name: 'NEXT_LOCALE', value: 'en', domain: 'localhost', path: '/' }])
    await page.goto('/about')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Methodology')
  })

  test('/about contains commitment text (en locale)', async ({ page }) => {
    // Set en locale to test English commitment text
    await page
      .context()
      .addCookies([{ name: 'NEXT_LOCALE', value: 'en', domain: 'localhost', path: '/' }])
    await page.goto('/about')
    await expect(page.getByText('Decision-citation block precedes every test')).toBeVisible()
  })

  test('/about contains no marketing slop phrases', async ({ page }) => {
    await page.goto('/about')
    const content = await page.content()
    const bannedPhrases = [
      /empower/i,
      /cutting-edge/i,
      /unlock your potential/i,
      /leverage our platform/i,
    ]
    for (const phrase of bannedPhrases) {
      expect(content).not.toMatch(phrase)
    }
  })
})
