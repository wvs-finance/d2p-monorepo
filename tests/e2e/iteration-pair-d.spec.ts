// Plan 02-06 — Filled by plan 02-06.
// Covers requirement(s): ITER-05
import { expect, test } from '@playwright/test'

test.describe('phase-2 - ITER-05 — Pair D PASS iteration', () => {
  test('/apps/abrigo/iterations/pair-d/v1 returns HTTP 200', async ({ page }) => {
    const response = await page.goto('/apps/abrigo/iterations/pair-d/v1')
    expect(response?.status()).toBe(200)
  })

  test('pair-d/v1 renders β = 0.13670985 in evidence chain', async ({ page }) => {
    await page.goto('/apps/abrigo/iterations/pair-d/v1')
    const bodyText = await page.locator('body').textContent()
    // EvidenceChain renders beta.toFixed(6) = "0.136710" for the dd, plus MDX contains "0.13670985"
    expect(bodyText).toMatch(/0\.1367/)
  })

  test('pair-d/v1 renders p ≈ 1.46e-8 in evidence chain', async ({ page }) => {
    await page.goto('/apps/abrigo/iterations/pair-d/v1')
    const bodyText = await page.locator('body').textContent()
    // p_value = 1.46e-8 renders as "1.46e-8" via formatPValue (p < 1e-4 → toExponential(2))
    expect(bodyText).toMatch(/1\.46e-8|1\.46×10|1\.4648/i)
  })

  test('pair-d/v1 shows PASS status pill', async ({ page }) => {
    await page.goto('/apps/abrigo/iterations/pair-d/v1')
    const bodyText = await page.locator('body').textContent()
    expect(bodyText).toMatch(/Pass|PASS/i)
  })

  test('pair-d/v1 renders link to abrigo notebook URL', async ({ page }) => {
    await page.goto('/apps/abrigo/iterations/pair-d/v1')
    // notebook_url: https://github.com/wvs-finance/abrigo-analytics/blob/main/notebooks/pair_d_stage_2_path_a/03_tests_and_sensitivity.ipynb
    const link = page.locator('a[href*="abrigo-analytics"]').first()
    await expect(link).toBeVisible()
    const href = await link.getAttribute('href')
    expect(href).toContain('abrigo-analytics')
  })

  test('pair-d/v1 renders the full CI bounds in evidence chain', async ({ page }) => {
    await page.goto('/apps/abrigo/iterations/pair-d/v1')
    const bodyText = await page.locator('body').textContent()
    // ci_lower: 0.0884, ci_upper: 0.1850 — rendered as [0.0884, 0.1850]
    expect(bodyText).toMatch(/0\.0884/)
    expect(bodyText).toMatch(/0\.1850/)
  })
})
