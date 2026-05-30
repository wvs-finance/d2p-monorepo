// DEFI-03: instruments index honest-empty state assertions.
// Asserts: h1 present, empty heading present, zero instrument cards, no wallet gate.
// Runs against local prod build (chromium project, port 3040).
import { expect, test } from '@playwright/test'

test.describe('DEFI-03 — instruments index honest-empty state', () => {
  test.beforeEach(async ({ page }) => {
    // Default locale is es-CO; set explicitly for clarity.
    await page
      .context()
      .addCookies([{ name: 'NEXT_LOCALE', value: 'es-CO', domain: 'localhost', path: '/' }])
  })

  test('h1 renders "Instrumentos Abrigo" in es-CO', async ({ page }) => {
    await page.goto('/apps/abrigo/instruments')
    const h1 = page.locator('h1')
    await expect(h1).toBeVisible()
    await expect(h1).toHaveText('Instrumentos Abrigo')
  })

  test('honest empty-state heading renders in es-CO', async ({ page }) => {
    await page.goto('/apps/abrigo/instruments')
    await expect(page.getByText('Aún no hay instrumentos desplegados')).toBeVisible()
  })

  test('zero instrument cards — no ghost or fabricated data (CROSS-09)', async ({ page }) => {
    await page.goto('/apps/abrigo/instruments')
    // Instrument cards render as <article> elements inside a <ul>; none should exist.
    const cards = page.locator('ul article')
    await expect(cards).toHaveCount(0)
  })

  test('NO "connect wallet" gate on the index — read-only, wallet-free', async ({ page }) => {
    await page.goto('/apps/abrigo/instruments')
    // The index must NOT require wallet connection to view.
    await expect(page.getByText(/conectar billetera/i)).not.toBeVisible()
    await expect(page.getByText(/connect wallet/i)).not.toBeVisible()
    await expect(page.getByRole('button', { name: /connect/i })).not.toBeVisible()
  })

  test('GitHub link to pending contracts is present', async ({ page }) => {
    await page.goto('/apps/abrigo/instruments')
    const link = page.getByRole('link', { name: /ver contratos pendientes en github/i })
    await expect(link).toBeVisible()
    const href = await link.getAttribute('href')
    expect(href).toContain('github.com')
  })

  test('h1 renders "Abrigo Instruments" in en', async ({ page }) => {
    await page
      .context()
      .addCookies([{ name: 'NEXT_LOCALE', value: 'en', domain: 'localhost', path: '/' }])
    await page.goto('/apps/abrigo/instruments')
    const h1 = page.locator('h1')
    await expect(h1).toBeVisible()
    await expect(h1).toHaveText('Abrigo Instruments')
  })

  test('honest empty-state heading renders in en', async ({ page }) => {
    await page
      .context()
      .addCookies([{ name: 'NEXT_LOCALE', value: 'en', domain: 'localhost', path: '/' }])
    await page.goto('/apps/abrigo/instruments')
    await expect(page.getByText('No instruments deployed yet')).toBeVisible()
  })
})
