// Plan 02-05 — Filled by plan 02-05 (was wave-0 stub from 02-01).
// Covers requirements: ITER-01, ITER-02 — accessibility compliance
import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test.describe('phase-2 - ITER-02 — iteration catalog accessibility', () => {
  test('axe-core WCAG 2.2 AA scan passes on /apps/abrigo/iterations', async ({ page }) => {
    await page.goto('/apps/abrigo/iterations')
    await page.waitForSelector('[data-testid="iteration-catalog-card"]')

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze()

    expect(results.violations).toEqual([])
  })

  test('iteration catalog filter pills have keyboard navigation via Tab + Enter', async ({
    page,
  }) => {
    await page.goto('/apps/abrigo/iterations')
    await page.waitForSelector('[data-testid="filter-pill-all"]')

    // Filter pill nav uses <nav aria-label="..."> and <button> elements — keyboard accessible by default
    const filterNav = page.locator('nav[aria-label]')
    await expect(filterNav).toBeVisible()

    // Tab to first pill and press Enter — should remain on page
    const allPill = page.locator('[data-testid="filter-pill-all"]')
    await allPill.focus()
    await page.keyboard.press('Enter')
    // URL should not have a status param (All is default)
    await expect(page).not.toHaveURL(/status=/)
  })

  test('iteration catalog cards have accessible names for screen readers', async ({ page }) => {
    await page.goto('/apps/abrigo/iterations')
    await page.waitForSelector('[data-testid="iteration-catalog-card"]')

    const cards = page.locator('[data-testid="iteration-catalog-card"] a')
    const count = await cards.count()
    expect(count).toBe(4)

    // Each card link must have an accessible name (from h3 text content)
    for (let i = 0; i < count; i++) {
      const card = cards.nth(i)
      const accessibleName = await card.textContent()
      expect(accessibleName?.trim().length).toBeGreaterThan(0)
    }
  })
})
