// DEFI-03: instruments index — one simulated instrument card (Wave 4 update).
// Wave 3 added the first registry entry (ccop-usd-long-gamma, chainId:8453, kind:'simulated').
// The index is no longer empty; it renders exactly one card for the simulated instrument.
// Assertions updated from honest-empty-state to honest-one-card-state (CROSS-09 anti-fishing).
// The "wallet gate" and GitHub-link assertions are preserved.
// Runs against local prod build (chromium project, port 3040).
import { expect, test } from '@playwright/test'

const INDEX_ROUTE = '/apps/abrigo/instruments'
const SIMULATED_ID = 'ccop-usd-long-gamma'
const SIMULATED_CHAIN_ID = 8453
const SIMULATED_DETAIL_ROUTE = `/apps/abrigo/instruments/${SIMULATED_ID}/${SIMULATED_CHAIN_ID}`

test.describe('DEFI-03 — instruments index: one simulated instrument card (es-CO)', () => {
  test.beforeEach(async ({ page }) => {
    // Default locale is es-CO; set explicitly for clarity.
    await page
      .context()
      .addCookies([{ name: 'NEXT_LOCALE', value: 'es-CO', domain: 'localhost', path: '/' }])
  })

  test('h1 renders "Instrumentos Abrigo" in es-CO', async ({ page }) => {
    await page.goto(INDEX_ROUTE)
    const h1 = page.locator('h1')
    await expect(h1).toBeVisible()
    await expect(h1).toHaveText('Instrumentos Abrigo')
  })

  test('exactly one instrument card renders — the simulated ccop-usd-long-gamma entry', async ({
    page,
  }) => {
    await page.goto(INDEX_ROUTE)
    await page.waitForLoadState('networkidle')
    // Post-deploy branch renders cards as <article> inside a <ul>.
    const cards = page.locator('ul article')
    await expect(cards).toHaveCount(1)
  })

  test('simulated card carries SIMULADO pill or em-dash (no fabricated deployedAt)', async ({
    page,
  }) => {
    await page.goto(INDEX_ROUTE)
    await page.waitForLoadState('networkidle')
    // The card deployedAtDisplay for kind==='simulated' is 'SIMULADO — —' (CROSS-09 anti-fishing).
    const card = page.locator('ul article').first()
    await expect(card).toBeVisible()
    // The deployedAt text must contain 'SIMULADO' (not a real date / not '0')
    await expect(card).toContainText('SIMULADO')
  })

  test('simulated card links to /apps/abrigo/instruments/ccop-usd-long-gamma/8453', async ({
    page,
  }) => {
    await page.goto(INDEX_ROUTE)
    await page.waitForLoadState('networkidle')
    // The card's "Ver instrumento" link uses numeric chainId (locked [chain] segment contract).
    const link = page.locator('ul article').first().getByRole('link')
    await expect(link).toBeVisible()
    const href = await link.getAttribute('href')
    expect(href).toBe(SIMULATED_DETAIL_ROUTE)
  })

  test('NO "connect wallet" gate on the index — read-only, wallet-free', async ({ page }) => {
    await page.goto(INDEX_ROUTE)
    // The index must NOT require wallet connection to view.
    await expect(page.getByText(/conectar billetera/i)).not.toBeVisible()
    await expect(page.getByText(/connect wallet/i)).not.toBeVisible()
    await expect(page.getByRole('button', { name: /connect/i })).not.toBeVisible()
  })

  test('h1 renders "Abrigo Instruments" in en', async ({ page }) => {
    await page
      .context()
      .addCookies([{ name: 'NEXT_LOCALE', value: 'en', domain: 'localhost', path: '/' }])
    await page.goto(INDEX_ROUTE)
    const h1 = page.locator('h1')
    await expect(h1).toBeVisible()
    await expect(h1).toHaveText('Abrigo Instruments')
  })
})
