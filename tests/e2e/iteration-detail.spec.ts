// Plan 02-06 — Filled by plan 02-06.
// Covers requirement(s): ITER-03
import { expect, test } from '@playwright/test'

test.describe('phase-2 - ITER-03 — iteration detail page', () => {
  test('GET /apps/abrigo/iterations/pair-d/v1 returns 200', async ({ page }) => {
    const response = await page.goto('/apps/abrigo/iterations/pair-d/v1')
    expect(response?.status()).toBe(200)
  })

  test('detail page renders 5 narrative sections (spec / data / estimation / tests / disposition)', async ({
    page,
  }) => {
    await page.goto('/apps/abrigo/iterations/pair-d/v1')
    const bodyText = await page.locator('body').textContent()
    // Sections use bilingual headings e.g. "Especificación / Spec"
    expect(bodyText).toMatch(/Spec|Especificación/i)
    expect(bodyText).toMatch(/Data|Datos/i)
    expect(bodyText).toMatch(/Estimation|Estimación/i)
    expect(bodyText).toMatch(/Tests|Pruebas/i)
    expect(bodyText).toMatch(/Disposition|Disposición/i)
  })

  test('detail page body word count ≥ 500', async ({ page }) => {
    await page.goto('/apps/abrigo/iterations/pair-d/v1')
    const articleText = await page.locator('article').textContent()
    const wordCount = (articleText ?? '').trim().split(/\s+/).length
    expect(wordCount).toBeGreaterThanOrEqual(500)
  })

  test('detail page renders IterationDetailHeader with title + status pill', async ({ page }) => {
    await page.goto('/apps/abrigo/iterations/pair-d/v1')
    // Header title contains one of the bilingual titles
    const bodyText = await page.locator('body').textContent()
    expect(bodyText).toMatch(/Pair D|pair-d/i)
    // Status pill: PASS label visible
    expect(bodyText).toMatch(/Pass|PASS/i)
  })

  test('detail page renders notebook_url as external link', async ({ page }) => {
    await page.goto('/apps/abrigo/iterations/pair-d/v1')
    // pair-d has notebook_url pointing to abrigo-analytics GitHub
    const notebookLink = page.locator('a[href*="github.com/wvs-finance/abrigo-analytics"]')
    await expect(notebookLink.first()).toBeVisible()
    const target = await notebookLink.first().getAttribute('target')
    expect(target).toBe('_blank')
  })

  test('detail page renders analysis_date', async ({ page }) => {
    await page.goto('/apps/abrigo/iterations/pair-d/v1')
    // pair-d analysis_date: 2026-04-30
    const bodyText = await page.locator('body').textContent()
    expect(bodyText).toMatch(/2026/)
  })
})
