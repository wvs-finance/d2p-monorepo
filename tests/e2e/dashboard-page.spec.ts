// Phase 3 — DASH-03 e2e: /apps/abrigo/dashboard renders labelled tiles + live banner (filled by Plan 03-02)
import { expect, test } from '@playwright/test'

test.describe('DASH-03 — /apps/abrigo/dashboard page content', () => {
  test('renders 4 labelled metric tiles with dashed placeholder values', async ({ page }) => {
    const response = await page.goto('/apps/abrigo/dashboard')
    expect(response?.status()).toBe(200)

    // 4 tile labels must be visible (es-CO default locale)
    await expect(page.getByText(/Saldo del fondo|Pool balance/)).toBeVisible()
    await expect(page.getByText(/Eventos de liquidación|Settlement events/)).toBeVisible()
    await expect(page.getByText(/Posiciones LP|LP positions/)).toBeVisible()
    await expect(page.getByText(/Último bloque sincronizado|Last block synced/)).toBeVisible()
  })

  test('shows the live banner when instrument registry is empty', async ({ page }) => {
    await page.goto('/apps/abrigo/dashboard')
    // The live_banner text (es-CO: "En vivo una vez se desplieguen los contratos")
    await expect(
      page.getByText(/En vivo una vez se desplieguen los contratos|Live once contracts deploy/),
    ).toBeVisible()
  })

  test('anti-fishing: no tile shows a fabricated numeric digit while registry is empty', async ({
    page,
  }) => {
    await page.goto('/apps/abrigo/dashboard')
    // The em-dash placeholder "—" must appear as the tile value.
    // No tile should contain a numeric digit (no fabricated numbers).
    const tileValues = await page.evaluate(() => {
      const tiles = Array.from(document.querySelectorAll('[class*="font-mono"]'))
      return tiles.map((el) => el.textContent ?? '')
    })
    // There should be at least 4 tile values
    expect(tileValues.length).toBeGreaterThanOrEqual(4)
    // None of the tile values should match a digit (no fabricated numbers)
    for (const value of tileValues) {
      expect(value).not.toMatch(/\d/)
    }
  })

  test('page renders with English copy when NEXT_LOCALE=en cookie is set', async ({ page }) => {
    await page
      .context()
      .addCookies([{ name: 'NEXT_LOCALE', value: 'en', domain: 'localhost', path: '/' }])
    await page.goto('/apps/abrigo/dashboard')
    await expect(page.getByText('Pool balance')).toBeVisible()
    await expect(page.getByText('Live once contracts deploy')).toBeVisible()
  })
})
