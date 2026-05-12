// Plan 02-05 — Filled by plan 02-05 (was wave-0 stub from 02-01).
// Covers requirements: ITER-01, ITER-02
import { expect, test } from '@playwright/test'

test.describe('phase-2 - ITER-01, ITER-02 — iteration catalog', () => {
  test('GET /apps/abrigo/iterations returns 200', async ({ page }) => {
    const response = await page.goto('/apps/abrigo/iterations')
    expect(response?.status()).toBe(200)
  })

  test('page H1 contains catalog heading', async ({ page }) => {
    await page.goto('/apps/abrigo/iterations')
    const h1 = page.locator('h1')
    const text = await h1.textContent()
    // Check either English or Spanish heading
    expect(text).toMatch(/Iteration catalog|Catálogo de iteraciones/)
  })

  test('page contains anti-fishing subheading with equal weight / mismo peso', async ({ page }) => {
    await page.goto('/apps/abrigo/iterations')
    const body = await page.locator('body').textContent()
    expect(body).toMatch(/equal weight|mismo peso/i)
  })

  test('with no query param, page renders 4 iteration cards (one per status)', async ({ page }) => {
    await page.goto('/apps/abrigo/iterations')
    await page.waitForSelector('[data-testid="iteration-catalog-card"]')
    const cards = page.locator('[data-testid="iteration-catalog-card"]')
    await expect(cards).toHaveCount(4)
  })

  test('with ?status=FAIL query param, only FAIL cards rendered', async ({ page }) => {
    await page.goto('/apps/abrigo/iterations?status=FAIL')
    await page.waitForSelector('[data-testid="iteration-catalog-card"]')
    const cards = page.locator('[data-testid="iteration-catalog-card"]')
    // There is exactly 1 FAIL iteration (fx-vol-on-cpi-surprise)
    await expect(cards).toHaveCount(1)
  })

  test('filter pills are present — 5 pills total (All + 4 statuses)', async ({ page }) => {
    await page.goto('/apps/abrigo/iterations')
    const allPill = page.locator('[data-testid="filter-pill-all"]')
    const passPill = page.locator('[data-testid="filter-pill-PASS"]')
    const failPill = page.locator('[data-testid="filter-pill-FAIL"]')
    const parkedPill = page.locator('[data-testid="filter-pill-PARKED"]')
    const inProgressPill = page.locator('[data-testid="filter-pill-IN_PROGRESS"]')
    await expect(allPill).toBeVisible()
    await expect(passPill).toBeVisible()
    await expect(failPill).toBeVisible()
    await expect(parkedPill).toBeVisible()
    await expect(inProgressPill).toBeVisible()
  })

  test('clicking Fail pill updates URL to ?status=FAIL', async ({ page }) => {
    await page.goto('/apps/abrigo/iterations')
    await page.waitForSelector('[data-testid="filter-pill-FAIL"]')
    await page.locator('[data-testid="filter-pill-FAIL"]').click()
    await expect(page).toHaveURL(/status=FAIL/)
  })

  test('clicking All pill removes ?status param from URL', async ({ page }) => {
    await page.goto('/apps/abrigo/iterations?status=FAIL')
    await page.waitForSelector('[data-testid="filter-pill-all"]')
    await page.locator('[data-testid="filter-pill-all"]').click()
    await expect(page).not.toHaveURL(/status=/)
  })

  test('page emits CollectionPage JSON-LD script tag', async ({ page }) => {
    await page.goto('/apps/abrigo/iterations')
    const jsonLdScripts = page.locator('script[type="application/ld+json"]')
    const count = await jsonLdScripts.count()
    let foundCollectionPage = false
    for (let i = 0; i < count; i++) {
      const content = await jsonLdScripts.nth(i).textContent()
      if (content?.includes('"CollectionPage"')) {
        foundCollectionPage = true
        break
      }
    }
    expect(foundCollectionPage).toBe(true)
  })
})
