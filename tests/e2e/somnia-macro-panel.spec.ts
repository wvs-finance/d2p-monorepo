// somnia-macro-panel.spec.ts — e2e render test for /apps/abrigo/agent (Component D).
//
// Runs against the production webpack build (playwright.config.ts webServer).
// Uses snapshot-backed deterministic data (SOMNIA_LIVE is NOT set).
//
// Assertions:
//   - CPI label "co/inflation-rate" renders
//   - scaledValue 568 renders as percent (~5.68%)
//   - testnet-agent provenance pill present (color+icon+text+aria-label — CROSS-09)
//   - NO "capacity" text (CPI-only honesty invariant)
//   - "observed" substring absent (B3 constraint)
//   - en locale copy switches correctly

import { expect, test } from '@playwright/test'

const AGENT_ROUTE = '/apps/abrigo/agent'

// ---------------------------------------------------------------------------
// es-CO (default locale)
// ---------------------------------------------------------------------------

test.describe('06-01 — /apps/abrigo/agent macro panel (es-CO, default)', () => {
  test('page loads and renders the CPI data key label', async ({ page }) => {
    await page.goto(AGENT_ROUTE)
    await page.waitForLoadState('networkidle')

    // "co/inflation-rate" must appear as a data label
    const cpiLabel = page.getByText('co/inflation-rate').first()
    await expect(cpiLabel).toBeVisible()
  })

  test('renders the CPI scaledValue as a percent (~5.68%)', async ({ page }) => {
    await page.goto(AGENT_ROUTE)
    await page.waitForLoadState('networkidle')

    // The formatted percent value from 568 (scale=2). Intl formats vary by locale,
    // but the number part 5,68 (es-CO decimal comma) or 5.68 must appear.
    const percentEl = page.locator('[data-testid="latest-scaled-value"]')
    await expect(percentEl).toBeVisible()
    const text = await percentEl.textContent()
    expect(text).toMatch(/5[.,]68/)
  })

  test('testnet-agent provenance pill is present with correct aria-label', async ({ page }) => {
    await page.goto(AGENT_ROUTE)
    await page.waitForLoadState('networkidle')

    // ProvenancePill renders a span[aria-label]. The es-CO aria-label contains
    // "Somnia testnet" and "agente" and "registrado" (subState=recorded).
    // Multiple pills may exist (one per history row).
    const pill = page
      .locator('span[aria-label]')
      .filter({ hasText: /Somnia testnet/i })
      .first()
    await expect(pill).toBeVisible()

    // Read the aria-label and assert required terms (CROSS-09)
    const ariaLabel = await pill.getAttribute('aria-label')
    expect(ariaLabel).toBeTruthy()
    expect(ariaLabel?.toLowerCase()).toMatch(/somnia testnet/)
    // M4: no "consensus-verified" in the aria-label
    expect(ariaLabel?.toLowerCase()).not.toMatch(/consensus-verified/)
  })

  test('CROSS-09 — pill has visible label text (not color alone)', async ({ page }) => {
    await page.goto(AGENT_ROUTE)
    await page.waitForLoadState('networkidle')

    // Each pill span must contain visible text (not just an icon)
    const pills = page.locator('span[aria-label]').filter({ hasText: /Somnia testnet/i })
    const count = await pills.count()
    expect(count).toBeGreaterThan(0)

    // The visible text inside the pill must not be empty
    for (let i = 0; i < count; i++) {
      const text = await pills.nth(i).textContent()
      expect(text?.trim().length).toBeGreaterThan(0)
    }
  })

  test('no "capacity" text rendered (CPI-only honesty invariant)', async ({ page }) => {
    await page.goto(AGENT_ROUTE)
    await page.waitForLoadState('networkidle')

    // Capacity-utilization is NOT wired — rendering it would be fabrication.
    const bodyText = await page.locator('body').textContent()
    expect(bodyText?.toLowerCase()).not.toMatch(/capacity/)
    expect(bodyText?.toLowerCase()).not.toMatch(/utilization/)
  })

  test('B3 — no "observed" substring in the rendered page', async ({ page }) => {
    await page.goto(AGENT_ROUTE)
    await page.waitForLoadState('networkidle')

    // The timestamp label must be "captured"/"capturado" — NEVER "observed"/"observado"
    const bodyText = await page.locator('body').textContent()
    expect(bodyText?.toLowerCase()).not.toMatch(/observ/)
  })

  test('B3 — print timestamp cell renders as em-dash "—"', async ({ page }) => {
    await page.goto(AGENT_ROUTE)
    await page.waitForLoadState('networkidle')

    // The print-timestamp cell must be "—" (em-dash), never a date or "0"
    const timestampEl = page.locator('[data-testid="print-timestamp"]')
    await expect(timestampEl).toBeVisible()
    const text = await timestampEl.textContent()
    expect(text?.trim()).toBe('—')
  })

  test('MacroReceived history rows render', async ({ page }) => {
    await page.goto(AGENT_ROUTE)
    await page.waitForLoadState('networkidle')

    // At least one history row with a scaled-value should be present
    const historyValues = page.locator('[data-testid="history-scaled-value"]')
    const count = await historyValues.count()
    expect(count).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// en locale
// ---------------------------------------------------------------------------

test.describe('06-01 — /apps/abrigo/agent macro panel (en locale)', () => {
  test('en locale: page heading renders in English', async ({ page }) => {
    await page
      .context()
      .addCookies([{ name: 'NEXT_LOCALE', value: 'en', domain: 'localhost', path: '/' }])
    await page.goto(AGENT_ROUTE)
    await page.waitForLoadState('networkidle')

    // en heading: "Somnia macro agent" (per en/somnia.json)
    const h1 = page.getByRole('heading', { level: 1 })
    await expect(h1).toBeVisible()
    const h1Text = await h1.textContent()
    expect(h1Text?.toLowerCase()).toMatch(/somnia/)
  })

  test('en locale: "co/inflation-rate" label still renders', async ({ page }) => {
    await page
      .context()
      .addCookies([{ name: 'NEXT_LOCALE', value: 'en', domain: 'localhost', path: '/' }])
    await page.goto(AGENT_ROUTE)
    await page.waitForLoadState('networkidle')

    // The CPI key label is the same in both locales (it's the on-chain key string)
    const cpiLabel = page.getByText('co/inflation-rate').first()
    await expect(cpiLabel).toBeVisible()
  })

  test('en locale: CPI percent value renders (~5.68%)', async ({ page }) => {
    await page
      .context()
      .addCookies([{ name: 'NEXT_LOCALE', value: 'en', domain: 'localhost', path: '/' }])
    await page.goto(AGENT_ROUTE)
    await page.waitForLoadState('networkidle')

    const percentEl = page.locator('[data-testid="latest-scaled-value"]')
    await expect(percentEl).toBeVisible()
    const text = await percentEl.textContent()
    expect(text).toMatch(/5[.,]68/)
  })

  test('en locale: testnet-agent pill present with aria-label', async ({ page }) => {
    await page
      .context()
      .addCookies([{ name: 'NEXT_LOCALE', value: 'en', domain: 'localhost', path: '/' }])
    await page.goto(AGENT_ROUTE)
    await page.waitForLoadState('networkidle')

    const pill = page
      .locator('span[aria-label]')
      .filter({ hasText: /Somnia testnet/i })
      .first()
    await expect(pill).toBeVisible()

    const ariaLabel = await pill.getAttribute('aria-label')
    expect(ariaLabel?.toLowerCase()).toMatch(/somnia testnet/)
    // M4: no "consensus-verified"
    expect(ariaLabel?.toLowerCase()).not.toMatch(/consensus-verified/)
  })

  test('en locale: no "capacity" text (CPI-only)', async ({ page }) => {
    await page
      .context()
      .addCookies([{ name: 'NEXT_LOCALE', value: 'en', domain: 'localhost', path: '/' }])
    await page.goto(AGENT_ROUTE)
    await page.waitForLoadState('networkidle')

    const bodyText = await page.locator('body').textContent()
    expect(bodyText?.toLowerCase()).not.toMatch(/capacity/)
  })
})
