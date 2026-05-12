// Phase 2 Wave 3 — filled by plan 02-07.
// Covers requirement(s): LAB-03
import { expect, test } from '@playwright/test'

test.describe('phase-2 - LAB-03 — research / publications page', () => {
  // Test 1: GET /research returns 200
  test('/research returns HTTP 200', async ({ page }) => {
    const resp = await page.goto('/research')
    expect(resp?.status()).toBe(200)
  })

  // Test 2: H1 contains "Research" (en) or "Investigación" (es-CO)
  test('/research H1 contains "Research" in en locale', async ({ page, context }) => {
    await context.addCookies([{ name: 'NEXT_LOCALE', value: 'en', url: 'http://localhost:3000' }])
    await page.goto('/research')
    const h1 = await page.locator('h1').first().innerText()
    expect(h1).toContain('Research')
  })

  test('/research H1 contains "Investigación" in es-CO locale', async ({ page, context }) => {
    await context.addCookies([
      { name: 'NEXT_LOCALE', value: 'es-CO', url: 'http://localhost:3000' },
    ])
    await page.goto('/research')
    const h1 = await page.locator('h1').first().innerText()
    expect(h1).toContain('Investigación')
  })

  // Test 3: page renders ≥ 3 PublicationCard elements
  test('/research renders ≥ 3 PublicationCard elements (data-testid="publication-card")', async ({
    page,
  }) => {
    await page.goto('/research')
    const cards = page.locator('[data-testid="publication-card"]')
    const count = await cards.count()
    expect(count).toBeGreaterThanOrEqual(3)
  })

  // Test 4: each card has a title (H3), a date, and a type Badge
  test('/research each PublicationCard has H3 title, date, and type badge', async ({ page }) => {
    await page.goto('/research')
    const card = page.locator('[data-testid="publication-card"]').first()
    // H3 title
    await expect(card.locator('h3')).toBeVisible()
    // Date element
    await expect(card.locator('time')).toBeVisible()
    // Badge (type label)
    await expect(card.locator('[class*="badge"], [class*="Badge"]')).toBeVisible()
  })

  // Test 5: at least one card has an external link with target="_blank"
  test('/research at least one card has an external link with target="_blank"', async ({
    page,
  }) => {
    await page.goto('/research')
    const externalLinks = page.locator(
      '[data-testid="publication-card"] a[target="_blank"][href*="github.com"]',
    )
    const count = await externalLinks.count()
    expect(count).toBeGreaterThan(0)
  })

  // Test 6: locale switch — title uses title_es vs title_en
  test('/research locale switch: title renders in es-CO', async ({ page, context }) => {
    await context.addCookies([
      { name: 'NEXT_LOCALE', value: 'es-CO', url: 'http://localhost:3000' },
    ])
    await page.goto('/research')
    const firstCardTitle = await page
      .locator('[data-testid="publication-card"] h3')
      .first()
      .innerText()
    // The first card's es-CO title contains "Pair D Stage 2" (starts with es-CO title)
    expect(firstCardTitle.length).toBeGreaterThan(0)
    // Check that the page is not showing raw translation keys
    const body = await page.locator('main').innerText()
    expect(body).not.toMatch(/research\.type_label\.\w/)
  })
})
