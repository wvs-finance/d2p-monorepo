// Phase 2 Wave 3 — filled by plan 02-07.
// Covers requirement(s): LAB-02
import { expect, test } from '@playwright/test'

test.describe('phase-2 - LAB-02 — team page', () => {
  // Test 5: GET /team returns 200
  test('/team returns HTTP 200', async ({ page }) => {
    const resp = await page.goto('/team')
    expect(resp?.status()).toBe(200)
  })

  // Test 6: H1 contains "Team" (en) or "Equipo" (es-CO)
  test('/team H1 contains locale-appropriate heading (en)', async ({ page, context }) => {
    await context.addCookies([{ name: 'NEXT_LOCALE', value: 'en', url: 'http://localhost:3000' }])
    await page.goto('/team')
    const h1 = await page.locator('h1').first().innerText()
    expect(h1).toContain('Team')
  })

  test('/team H1 contains locale-appropriate heading (es-CO)', async ({ page, context }) => {
    await context.addCookies([
      { name: 'NEXT_LOCALE', value: 'es-CO', url: 'http://localhost:3000' },
    ])
    await page.goto('/team')
    const h1 = await page.locator('h1').first().innerText()
    expect(h1).toContain('Equipo')
  })

  // Test 7: page renders ≥ 1 ContributorCard
  test('/team renders ≥ 1 ContributorCard (data-testid="contributor-card")', async ({ page }) => {
    await page.goto('/team')
    const cards = page.locator('[data-testid="contributor-card"]')
    const count = await cards.count()
    expect(count).toBeGreaterThan(0)
  })

  // Test 8: each card contains a name and a GitHub link with target="_blank"
  test('/team each ContributorCard has a visible name and GitHub link with target="_blank"', async ({
    page,
  }) => {
    await page.goto('/team')
    const card = page.locator('[data-testid="contributor-card"]').first()
    // Name is visible
    const nameEl = card.locator('p.font-semibold')
    await expect(nameEl).toBeVisible()
    const nameText = await nameEl.innerText()
    expect(nameText.trim().length).toBeGreaterThan(0)
    // GitHub link exists with target="_blank"
    const ghLink = card.locator('a[href*="github.com"][target="_blank"]')
    await expect(ghLink).toBeVisible()
  })

  // Test 9: GitHub link href matches https://github.com/{handle}
  test('/team GitHub link href matches https://github.com/{handle}', async ({ page }) => {
    await page.goto('/team')
    const card = page.locator('[data-testid="contributor-card"]').first()
    const ghLink = card.locator('a[href*="github.com"]')
    const href = await ghLink.getAttribute('href')
    expect(href).toMatch(/^https:\/\/github\.com\/[a-zA-Z0-9-]+$/)
  })

  // Test 10: locale switching — role text is locale-specific
  test('/team locale switch: role text reflects es-CO locale', async ({ page, context }) => {
    await context.addCookies([
      { name: 'NEXT_LOCALE', value: 'es-CO', url: 'http://localhost:3000' },
    ])
    await page.goto('/team')
    // The first contributor card should show the es-CO role text
    const card = page.locator('[data-testid="contributor-card"]').first()
    const roleEl = card.locator('p.text-text-secondary')
    await expect(roleEl).toBeVisible()
    const roleText = await roleEl.innerText()
    // Juan Serrano's es-CO role contains "econometría"
    expect(roleText).toMatch(/econometr/i)
  })
})
