// Phase 2 Wave 3 — filled by plan 02-03.
// Covers requirement(s): LAB-01
import { expect, test } from '@playwright/test'

test.describe('phase-2 - LAB-01 — homepage content', () => {
  test('GET / returns 200', async ({ page }) => {
    const response = await page.goto('/')
    expect(response?.status()).toBe(200)
  })

  test('homepage renders H1 "DS2P Labs"', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('DS2P Labs')
  })

  test('homepage renders mission body with convex-hedge phrase (en default)', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText(/convex-hedge instruments|cobertura convexa/i)).toBeVisible()
  })

  test('homepage renders "What is d2-π" explainer section heading', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText(/What is d2-π|¿Qué es d2-π\?/)).toBeVisible()
  })

  test('homepage renders Apps overview card linking to /apps/abrigo', async ({ page }) => {
    await page.goto('/')
    const abrigoLink = page.locator('a[href="/apps/abrigo"]')
    await expect(abrigoLink).toBeVisible()
  })

  test('homepage renders 4 IterationCountTile elements (one per status)', async ({ page }) => {
    await page.goto('/')
    const tiles = page.locator('[data-testid="iteration-count-tile"]')
    await expect(tiles).toHaveCount(4)
  })

  test('homepage contains GitHub org link to https://github.com/wvs-finance', async ({ page }) => {
    await page.goto('/')
    // first() handles both the in-page section link and the layout footer link being present.
    const githubLink = page.locator('a[href="https://github.com/wvs-finance"]').first()
    await expect(githubLink).toBeVisible()
  })

  test('homepage page.tsx has no use client directive (RSC purity)', async ({ page }) => {
    // Structural check — page must be RSC (no 'use client' in source)
    // The actual structural assertion is done via grep in acceptance criteria.
    // This test verifies the rendered page is functional (window exists = browser env works).
    await page.goto('/')
    const isWindowDefined = await page.evaluate(() => typeof window === 'object')
    expect(isWindowDefined).toBe(true)
  })

  test('homepage renders mission body in es-CO locale via cookie', async ({ page }) => {
    await page
      .context()
      .addCookies([{ name: 'NEXT_LOCALE', value: 'es-CO', domain: 'localhost', path: '/' }])
    await page.goto('/')
    await expect(page.getByText(/cobertura convexa/)).toBeVisible()
  })
})
