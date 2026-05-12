// Plan 02-06 — Filled by plan 02-06.
// Covers requirement(s): ITER-06
import { expect, test } from '@playwright/test'

const FX_URL = '/apps/abrigo/iterations/fx-vol-on-cpi-surprise/v1'

test.describe('phase-2 - ITER-06 — FX-vol-on-CPI-surprise FAIL iteration', () => {
  test('/apps/abrigo/iterations/fx-vol-on-cpi-surprise/v1 returns HTTP 200', async ({ page }) => {
    const response = await page.goto(FX_URL)
    expect(response?.status()).toBe(200)
  })

  test('fx-vol-on-cpi-surprise/v1 renders β̂ = -0.000685', async ({ page }) => {
    await page.goto(FX_URL)
    const bodyText = await page.locator('body').textContent()
    // EvidenceChain dd: "-0.000685" from (-0.000685).toFixed(6) = "-0.000685"
    expect(bodyText).toContain('-0.000685')
  })

  test('fx-vol-on-cpi-surprise/v1 renders CI bounds [-0.003635, 0.002265]', async ({ page }) => {
    await page.goto(FX_URL)
    const bodyText = await page.locator('body').textContent()
    // EvidenceChain: [-0.003635, 0.002265]
    expect(bodyText).toContain('-0.003635')
    expect(bodyText).toContain('0.002265')
  })

  test('fx-vol-on-cpi-surprise/v1 renders N = 947', async ({ page }) => {
    await page.goto(FX_URL)
    const bodyText = await page.locator('body').textContent()
    expect(bodyText).toMatch(/N\s*=\s*947|947/)
  })

  test('fx-vol-on-cpi-surprise/v1 shows FAIL status pill', async ({ page }) => {
    await page.goto(FX_URL)
    const bodyText = await page.locator('body').textContent()
    expect(bodyText).toMatch(/Fail|FAIL/i)
  })

  test('fx-vol-on-cpi-surprise/v1 renders DispositionMemo section at full visual weight', async ({
    page,
  }) => {
    await page.goto(FX_URL)

    // DispositionMemo uses <section aria-labelledby="disposition-heading">
    const dispositionSection = page.locator('section[aria-labelledby="disposition-heading"]')
    await expect(dispositionSection).toBeVisible()

    // Heading must be visible (not collapsed)
    const heading = page.locator('#disposition-heading')
    await expect(heading).toBeVisible()

    // DispositionMemo must NOT be inside a <details> element (epistemic equality invariant)
    const detailsInDisposition = page.locator(
      'details section[aria-labelledby="disposition-heading"]',
    )
    await expect(detailsInDisposition).toHaveCount(0)
  })

  test('DispositionMemo prose uses text-text-primary (not muted) class', async ({ page }) => {
    await page.goto(FX_URL)
    // The prose wrapper inside DispositionMemo has class "text-text-primary"
    const dispositionProse = page.locator('section[aria-labelledby="disposition-heading"] .prose')
    await expect(dispositionProse).toBeVisible()
    const className = await dispositionProse.getAttribute('class')
    expect(className).toContain('text-text-primary')
    expect(className).not.toContain('text-text-muted')
  })

  test('DispositionMemo contains the rejection notice text', async ({ page }) => {
    await page.goto(FX_URL)
    const bodyText = await page.locator('body').textContent()
    // Rejection text from messages: "This iteration was rejected" / "Esta iteración fue rechazada"
    expect(bodyText).toMatch(/rejected|rechazada/i)
  })
})
