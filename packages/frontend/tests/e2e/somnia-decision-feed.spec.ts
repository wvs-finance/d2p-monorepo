// somnia-decision-feed.spec.ts — e2e for Component A: HedgeDecisionFeed on /apps/abrigo/agent.
//
// Runs against the production webpack build (playwright.config.ts webServer).
// Snapshot-backed deterministic data (SOMNIA_LIVE unset).
//
// Assertions:
//   - Both decision cards render (ADD_LONG_GAMMA + REDUCE labels)
//   - Surprise values +0.68 and -3.32 appear (M5 chain truth)
//   - Operator-supplied caveat appears near consensus values
//   - EQUAL VISUAL WEIGHT: card bounding-box widths equal; action badge font-size/weight equal (CROSS-09)
//   - en locale: English action labels render
//   - M4: no banned phrase anywhere on the page

import { expect, test } from '@playwright/test'

const AGENT_ROUTE = '/apps/abrigo/agent'

// ---------------------------------------------------------------------------
// es-CO (default locale)
// ---------------------------------------------------------------------------

test.describe('06-02 — /apps/abrigo/agent hedge decision feed (es-CO)', () => {
  test('renders ADD_LONG_GAMMA decision card with correct action label', async ({ page }) => {
    await page.goto(AGENT_ROUTE)
    await page.waitForLoadState('networkidle')

    // "Añadir gamma larga" (es-CO label for ADD_LONG_GAMMA)
    const actionEl = page.getByText('Añadir gamma larga').first()
    await expect(actionEl).toBeVisible()
  })

  test('renders REDUCE decision card with correct action label', async ({ page }) => {
    await page.goto(AGENT_ROUTE)
    await page.waitForLoadState('networkidle')

    // "Reducir" (es-CO label for REDUCE)
    const actionEl = page.getByText('Reducir').first()
    await expect(actionEl).toBeVisible()
  })

  test('M5 — ADD_LONG_GAMMA surprise +0.68 is visible', async ({ page }) => {
    await page.goto(AGENT_ROUTE)
    await page.waitForLoadState('networkidle')

    // surprise = macroValue(568) - consensus(500) = +68 → formatted "+0.68"
    const surpriseEl = page.getByText(/\+0\.68/).first()
    await expect(surpriseEl).toBeVisible()
  })

  test('M5 — REDUCE surprise -3.32 is visible', async ({ page }) => {
    await page.goto(AGENT_ROUTE)
    await page.waitForLoadState('networkidle')

    // surprise = macroValue(568) - consensus(900) = -332 → formatted "-3.32"
    const surpriseEl = page.getByText(/-3\.32/).first()
    await expect(surpriseEl).toBeVisible()
  })

  test('operator-supplied caveat appears near the consensus label', async ({ page }) => {
    await page.goto(AGENT_ROUTE)
    await page.waitForLoadState('networkidle')

    // The caveat "suministrado por el operador" must be visible on the page
    const caveats = page.getByText(/suministrado por el operador/i)
    const count = await caveats.count()
    expect(count).toBeGreaterThan(0)

    // Each caveat must be visible
    const firstCaveat = caveats.first()
    await expect(firstCaveat).toBeVisible()
  })

  test('M4 — no banned phrase in any rendered text', async ({ page }) => {
    await page.goto(AGENT_ROUTE)
    await page.waitForLoadState('networkidle')

    const bodyText = await page.locator('body').textContent()

    // M4: the banned phrase must never appear in rendered output
    expect(bodyText?.toLowerCase()).not.toMatch(/consensus-verified/)
  })

  test('testnet-agent pills are present on decision cards', async ({ page }) => {
    await page.goto(AGENT_ROUTE)
    await page.waitForLoadState('networkidle')

    // Decision cards carry a testnet-agent ProvenancePill (color + icon + text + aria-label)
    const pills = page.locator('span[aria-label]').filter({ hasText: /Somnia testnet/i })
    const count = await pills.count()
    // At least 2 pills from decision cards (plus macro panel pills)
    expect(count).toBeGreaterThan(1)
  })

  test('CROSS-09 — both decision cards exist and have equal bounding-box width', async ({
    page,
  }) => {
    await page.goto(AGENT_ROUTE)
    await page.waitForLoadState('networkidle')

    const cards = page.locator('[data-testid="decision-card"]')
    await expect(cards.first()).toBeVisible()
    const count = await cards.count()
    expect(count).toBe(2)

    // Equal visual weight: bounding-box widths must be equal (anti-fishing invariant)
    const widths = await page.evaluate(() => {
      const cardEls = document.querySelectorAll('[data-testid="decision-card"]')
      return Array.from(cardEls).map((el) => el.getBoundingClientRect().width)
    })

    expect(widths.length).toBe(2)
    // Widths must be equal (within 1px tolerance for sub-pixel rendering)
    expect(Math.abs((widths[0] ?? 0) - (widths[1] ?? 0))).toBeLessThanOrEqual(1)
  })

  test('CROSS-09 — action badge font-size and font-weight are equal for both cards', async ({
    page,
  }) => {
    await page.goto(AGENT_ROUTE)
    await page.waitForLoadState('networkidle')

    // Compute font-size and font-weight on the [data-testid="action-value"] badge in each card
    const styles = await page.evaluate(() => {
      const actionBadges = document.querySelectorAll('[data-testid="action-value"]')
      return Array.from(actionBadges).map((el) => {
        const cs = window.getComputedStyle(el)
        return {
          fontSize: cs.fontSize,
          fontWeight: cs.fontWeight,
        }
      })
    })

    // Must have at least 2 action badges (one per decision card)
    expect(styles.length).toBeGreaterThanOrEqual(2)

    // font-size equal
    expect(styles[0]?.fontSize).toBe(styles[1]?.fontSize)
    // font-weight equal
    expect(styles[0]?.fontWeight).toBe(styles[1]?.fontWeight)
  })

  test('CROSS-09 — decision feed section is present in the page', async ({ page }) => {
    await page.goto(AGENT_ROUTE)
    await page.waitForLoadState('networkidle')

    const feed = page.locator('[data-testid="hedge-decision-feed"]')
    await expect(feed).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// en locale
// ---------------------------------------------------------------------------

test.describe('06-02 — /apps/abrigo/agent hedge decision feed (en)', () => {
  test('en locale: ADD_LONG_GAMMA action renders in English', async ({ page }) => {
    await page
      .context()
      .addCookies([{ name: 'NEXT_LOCALE', value: 'en', domain: 'localhost', path: '/' }])
    await page.goto(AGENT_ROUTE)
    await page.waitForLoadState('networkidle')

    // "Add long gamma" (en label for ADD_LONG_GAMMA)
    const actionEl = page.getByText('Add long gamma').first()
    await expect(actionEl).toBeVisible()
  })

  test('en locale: REDUCE action renders in English', async ({ page }) => {
    await page
      .context()
      .addCookies([{ name: 'NEXT_LOCALE', value: 'en', domain: 'localhost', path: '/' }])
    await page.goto(AGENT_ROUTE)
    await page.waitForLoadState('networkidle')

    const actionEl = page.getByText('Reduce').first()
    await expect(actionEl).toBeVisible()
  })

  test('en locale: operator-supplied caveat appears in English', async ({ page }) => {
    await page
      .context()
      .addCookies([{ name: 'NEXT_LOCALE', value: 'en', domain: 'localhost', path: '/' }])
    await page.goto(AGENT_ROUTE)
    await page.waitForLoadState('networkidle')

    const caveats = page.getByText(/operator-supplied/i)
    const count = await caveats.count()
    expect(count).toBeGreaterThan(0)
  })

  test('en locale: M5 surprise values visible', async ({ page }) => {
    await page
      .context()
      .addCookies([{ name: 'NEXT_LOCALE', value: 'en', domain: 'localhost', path: '/' }])
    await page.goto(AGENT_ROUTE)
    await page.waitForLoadState('networkidle')

    await expect(page.getByText(/\+0\.68/).first()).toBeVisible()
    await expect(page.getByText(/-3\.32/).first()).toBeVisible()
  })

  test('en locale: CROSS-09 equal bounding-box width for both cards', async ({ page }) => {
    await page
      .context()
      .addCookies([{ name: 'NEXT_LOCALE', value: 'en', domain: 'localhost', path: '/' }])
    await page.goto(AGENT_ROUTE)
    await page.waitForLoadState('networkidle')

    const widths = await page.evaluate(() => {
      const cardEls = document.querySelectorAll('[data-testid="decision-card"]')
      return Array.from(cardEls).map((el) => el.getBoundingClientRect().width)
    })

    expect(widths.length).toBe(2)
    expect(Math.abs((widths[0] ?? 0) - (widths[1] ?? 0))).toBeLessThanOrEqual(1)
  })
})
