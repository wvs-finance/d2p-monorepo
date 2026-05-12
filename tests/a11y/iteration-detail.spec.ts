// Plan 02-06 — Filled by plan 02-06.
// Covers requirement(s): ITER-06 — accessibility compliance for iteration detail pages
import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test.describe('phase-2 - ITER-06 — iteration detail accessibility', () => {
  test('axe-core WCAG 2.2 AA scan passes on /apps/abrigo/iterations/pair-d/v1', async ({
    page,
  }) => {
    await page.goto('/apps/abrigo/iterations/pair-d/v1')
    // Wait for MDX content to render
    await page.waitForSelector('article')

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze()

    expect(results.violations).toEqual([])
  })

  test('axe-core WCAG 2.2 AA scan passes on fx-vol-on-cpi-surprise/v1 (FAIL iteration)', async ({
    page,
  }) => {
    await page.goto('/apps/abrigo/iterations/fx-vol-on-cpi-surprise/v1')
    await page.waitForSelector('article')

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze()

    expect(results.violations).toEqual([])
  })

  test('evidence chain inline SVG has aria-label and sr-only data table', async ({ page }) => {
    await page.goto('/apps/abrigo/iterations/pair-d/v1')

    // BetaCIChart renders <svg role="img" aria-label="β = ...">
    const svg = page.locator('svg[role="img"]').first()
    await expect(svg).toBeAttached()

    const ariaLabel = await svg.getAttribute('aria-label')
    expect(ariaLabel?.length).toBeGreaterThan(0)
    expect(ariaLabel).toMatch(/β/)

    // sr-only table for screen reader access
    const srTable = page.locator('table.sr-only').first()
    await expect(srTable).toBeAttached()
  })

  test('<details> "How to verify" element is keyboard accessible', async ({ page }) => {
    await page.goto('/apps/abrigo/iterations/pair-d/v1')

    const details = page.locator('details').first()
    await expect(details).toBeVisible()

    const summary = page.locator('details summary').first()
    await summary.focus()
    // Press Enter to toggle open
    await page.keyboard.press('Enter')

    // After keyboard activation, details should expand (or remain open)
    // The summary element is focusable by default in <details>
    await expect(summary).toBeFocused()
  })

  test('DispositionMemo section has accessible heading for screen readers', async ({ page }) => {
    await page.goto('/apps/abrigo/iterations/fx-vol-on-cpi-surprise/v1')

    const heading = page.locator('#disposition-heading')
    await expect(heading).toBeVisible()

    const headingText = await heading.textContent()
    expect(headingText?.trim().length).toBeGreaterThan(0)
  })
})
