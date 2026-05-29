// Phase 03.1 Plan B — research index + track filter e2e
// Covers requirement: LAB-03 (index + track filter §3.1)
// Production webServer: pnpm build && pnpm start -p 3040
import { expect, test } from '@playwright/test'

const BASE = 'http://localhost:3040'

test.describe('research index — server track filter (§3.1)', () => {
  // Test 1: /research returns 200
  test('/research returns HTTP 200', async ({ page }) => {
    const resp = await page.goto('/research')
    expect(resp?.status()).toBe(200)
  })

  // Test 2: track filter renders 4 <Link> options
  test('/research renders the 4-option segmented track filter', async ({ page }) => {
    await page.goto('/research')
    const nav = page.locator('nav[aria-label]').first()
    await expect(nav).toBeVisible()
    // 4 links: All, CFMM Microstructure, Abrigo Hedge-Design, Notes (en locale)
    await page.context().addCookies([{ name: 'NEXT_LOCALE', value: 'en', url: BASE }])
    await page.goto('/research')
    const allLink = page.locator('nav a', { hasText: 'All' })
    await expect(allLink).toBeVisible()
    const cfmmLink = page.locator('nav a', { hasText: 'CFMM Microstructure' })
    await expect(cfmmLink).toBeVisible()
    const abrigoLink = page.locator('nav a', { hasText: 'Abrigo Hedge-Design' })
    await expect(abrigoLink).toBeVisible()
    const notesLink = page.locator('nav a', { hasText: 'Notes' })
    await expect(notesLink).toBeVisible()
  })

  // Test 3: clicking Abrigo Hedge-Design sets ?track=abrigo-hedge-design in URL
  // and only abrigo-track cards remain
  test('clicking Abrigo Hedge-Design filter sets URL and shows abrigo-track cards', async ({
    page,
  }) => {
    await page.context().addCookies([{ name: 'NEXT_LOCALE', value: 'en', url: BASE }])
    await page.goto('/research')
    const abrigoLink = page.locator('nav a', { hasText: 'Abrigo Hedge-Design' })
    // Wait for navigation to complete after clicking the server <Link>
    await Promise.all([
      page.waitForURL('**/research?track=abrigo-hedge-design'),
      abrigoLink.click(),
    ])
    // URL must contain the track param — server <Link> navigates
    expect(page.url()).toContain('?track=abrigo-hedge-design')
    // At least 1 card rendered (abrigo track has ≥1 entries)
    const cards = page.locator('[data-testid="publication-card"]')
    const count = await cards.count()
    expect(count).toBeGreaterThanOrEqual(1)
  })

  // Test 4: navigating to /research?track=cfmm-microstructure returns honest empty panel
  // (CFMM track starts empty — never a fabricated card)
  test('pasted /research?track=cfmm-microstructure shows honest empty-track panel', async ({
    page,
  }) => {
    await page.context().addCookies([{ name: 'NEXT_LOCALE', value: 'en', url: BASE }])
    const resp = await page.goto('/research?track=cfmm-microstructure')
    expect(resp?.status()).toBe(200)
    // No fabricated cards
    const cards = page.locator('[data-testid="publication-card"]')
    expect(await cards.count()).toBe(0)
    // Honest empty-track panel present
    const emptyPanel = page.locator('h2', { hasText: 'No publications in this track yet' })
    await expect(emptyPanel).toBeVisible()
  })

  // Test 5: y3 write-up card links IN to /research/abrigo-y3-carbon-basket-writeup (dead card closed)
  test('y3 write-up card has in-link to reading page (readable_on_site closed)', async ({
    page,
  }) => {
    await page.context().addCookies([{ name: 'NEXT_LOCALE', value: 'en', url: BASE }])
    await page.goto('/research')
    // Find the y3 write-up card
    const y3Card = page.locator('[data-testid="publication-card"]', {
      has: page.locator('h3', { hasText: /carbon basket/i }),
    })
    await expect(y3Card).toBeVisible()
    // The in-link should point to the reading page (not external)
    const inLink = y3Card.locator('a[href="/research/abrigo-y3-carbon-basket-writeup"]').first()
    await expect(inLink).toBeVisible()
  })

  // Test 6: server <Link> filter navigates without JS (server-rendered, shareable URL)
  test('track filter works with JavaScript disabled (server-rendered <Link>)', async ({
    browser,
  }) => {
    const context = await browser.newContext({ javaScriptEnabled: false })
    const page = await context.newPage()
    await page.context().addCookies([{ name: 'NEXT_LOCALE', value: 'en', url: BASE }])
    const resp = await page.goto('/research?track=abrigo-hedge-design')
    expect(resp?.status()).toBe(200)
    // Cards should render even without JS
    const cards = page.locator('[data-testid="publication-card"]')
    const count = await cards.count()
    expect(count).toBeGreaterThanOrEqual(1)
    await context.close()
  })

  // Test 7: es-CO locale renders track filter labels in Spanish
  test('es-CO locale shows Spanish track filter labels', async ({ page }) => {
    await page.context().addCookies([{ name: 'NEXT_LOCALE', value: 'es-CO', url: BASE }])
    await page.goto('/research')
    const allLink = page.locator('nav a', { hasText: 'Todas' })
    await expect(allLink).toBeVisible()
    const abrigoLink = page.locator('nav a', { hasText: 'Diseño de cobertura Abrigo' })
    await expect(abrigoLink).toBeVisible()
  })

  // Test 8: empty-track message in es-CO locale is in Spanish
  test('es-CO empty-track panel renders Spanish copy', async ({ page }) => {
    await page.context().addCookies([{ name: 'NEXT_LOCALE', value: 'es-CO', url: BASE }])
    await page.goto('/research?track=cfmm-microstructure')
    const emptyPanel = page.locator('h2', {
      hasText: 'Sin publicaciones en esta línea todavía',
    })
    await expect(emptyPanel).toBeVisible()
  })
})
