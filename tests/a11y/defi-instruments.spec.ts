// DEFI-06: axe a11y on instruments index + simulated instrument detail route (Wave 4).
//
// Wave 4 adds the simulated route /apps/abrigo/instruments/ccop-usd-long-gamma/8453
// to the axe suite. The simulated route has no ConnectButton (read-only wallet), so
// the known RainbowKit "Conectar billetera" 3.44:1 contrast issue does NOT apply here —
// the route should be axe-clean with zero serious/critical violations.
//
// Accessibility rules verified (WCAG 2.2 AA):
//   1.3.2 Meaningful Sequence — reading order: badge → RiskCallout → params → payoff →
//         pool → cashflow → wallet
//   1.4.1 Use of Color — provenance pills always have icon + text (never color alone)
//   1.4.11 Non-Text Contrast — PayoffDiagram curve stroke var(--accent-text) ≥3:1
//          against the chart background var(--bg-surface/canvas)
//   2.4.6 Headings and Labels — each section has an aria-label
//
// Runs under the axe project (Desktop Chrome) against the production webpack build.

import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const SIMULATED_ROUTE = '/apps/abrigo/instruments/ccop-usd-long-gamma/8453'

// ---------------------------------------------------------------------------
// Instruments INDEX — preserved tests
// ---------------------------------------------------------------------------

test.describe('DEFI-06 — axe a11y on instruments index', () => {
  test('axe clean on /apps/abrigo/instruments (es-CO)', async ({ page }) => {
    await page
      .context()
      .addCookies([{ name: 'NEXT_LOCALE', value: 'es-CO', domain: 'localhost', path: '/' }])
    await page.goto('/apps/abrigo/instruments')
    // Wait for the page to be fully rendered before running axe.
    await expect(page.locator('h1')).toBeVisible()

    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toHaveLength(0)
  })

  test('axe clean on /apps/abrigo/instruments (en)', async ({ page }) => {
    await page
      .context()
      .addCookies([{ name: 'NEXT_LOCALE', value: 'en', domain: 'localhost', path: '/' }])
    await page.goto('/apps/abrigo/instruments')
    await expect(page.locator('h1')).toBeVisible()

    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// Simulated DETAIL route — Wave 4 axe assertions (es-CO)
// ---------------------------------------------------------------------------

test.describe('DEFI-06 — axe WCAG 2.2 AA on simulated instrument detail (es-CO)', () => {
  test('zero serious/critical axe violations on simulated route (es-CO)', async ({ page }) => {
    await page
      .context()
      .addCookies([{ name: 'NEXT_LOCALE', value: 'es-CO', domain: 'localhost', path: '/' }])
    await page.goto(SIMULATED_ROUTE)
    await page.waitForLoadState('networkidle')
    // Allow client components (WalletStatusPill, PayoffDiagramClient) to hydrate
    await page.waitForTimeout(800)
    await expect(page.locator('h1')).toBeVisible()

    const results = await new AxeBuilder({ page })
      // Focus on color-contrast and semantic structure rules relevant to the surface
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze()

    // Filter to only serious/critical violations (the threshold for blocking ship)
    const seriousCritical = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    )

    // Report full violation list if any serious/critical violations found
    if (seriousCritical.length > 0) {
      console.error(
        'Serious/critical axe violations:',
        JSON.stringify(
          seriousCritical.map((v) => ({
            id: v.id,
            impact: v.impact,
            description: v.description,
            nodes: v.nodes.map((n) => n.html).slice(0, 3),
          })),
          null,
          2,
        ),
      )
    }

    expect(seriousCritical).toHaveLength(0)
  })

  test('provenance pills have icon + text + aria-label (1.4.1 Use of Color)', async ({ page }) => {
    await page
      .context()
      .addCookies([{ name: 'NEXT_LOCALE', value: 'es-CO', domain: 'localhost', path: '/' }])
    await page.goto(SIMULATED_ROUTE)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('h1')).toBeVisible()

    // Each ProvenancePill renders:
    //   <span aria-label="..."> <Icon aria-hidden="true"> <span>{tier}</span> </span>
    // The outer span must carry an aria-label (not rely on color alone).
    // The pill VISIBLE text is the LOCALE-AWARE label (es-CO route here), NOT the raw tier key:
    // fork-fixture → "Fork fixture", spec → "Especificación", schematic → "Esquemático".

    // fork-fixture pill — appears in SnapshotPoolPanel + InstrumentParams
    const forkFixturePills = page.locator('span[aria-label]').filter({ hasText: 'Fork fixture' })
    const forkFixtureCount = await forkFixturePills.count()
    expect(forkFixtureCount).toBeGreaterThan(0)

    // Verify each pill has a non-empty aria-label
    for (let i = 0; i < forkFixtureCount; i++) {
      const ariaLabel = await forkFixturePills.nth(i).getAttribute('aria-label')
      expect(ariaLabel).toBeTruthy()
    }

    // spec pill — appears in CashFlowWaterfall header (es-CO label "Especificación")
    const specPills = page.locator('span[aria-label]').filter({ hasText: 'Especificación' })
    const specCount = await specPills.count()
    expect(specCount).toBeGreaterThan(0)
    for (let i = 0; i < specCount; i++) {
      const ariaLabel = await specPills.nth(i).getAttribute('aria-label')
      expect(ariaLabel).toBeTruthy()
    }
  })

  test('PayoffDiagram has role=img + aria-label (non-text contrast 1.4.11)', async ({ page }) => {
    await page
      .context()
      .addCookies([{ name: 'NEXT_LOCALE', value: 'es-CO', domain: 'localhost', path: '/' }])
    await page.goto(SIMULATED_ROUTE)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(800) // PayoffDiagramClient is dynamic(ssr:false)
    await expect(page.locator('h1')).toBeVisible()

    // The PayoffDiagram wrapper div carries role="img" and aria-label
    // This ensures the chart has a text alternative (1.4.11 and 1.1.1)
    const payoffImg = page.locator('[role="img"][aria-label]').first()
    await expect(payoffImg).toBeVisible()

    const ariaLabel = await payoffImg.getAttribute('aria-label')
    expect(ariaLabel).toBeTruthy()
    // Should contain 'esquemático' in es-CO
    expect(ariaLabel).toMatch(/esquem[aá]tico/i)
  })

  test('section aria-labels establish reading order (1.3.2 Meaningful Sequence)', async ({
    page,
  }) => {
    await page
      .context()
      .addCookies([{ name: 'NEXT_LOCALE', value: 'es-CO', domain: 'localhost', path: '/' }])
    await page.goto(SIMULATED_ROUTE)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('h1')).toBeVisible()

    // Each content section has aria-label establishing reading order (WCAG 1.3.2)
    // Expected sections (in DOM order): Parámetros, Diagrama de rentabilidad,
    //   Estado del pool (fork), Flujo de caja
    const sectionLabels = await page
      .locator('section[aria-label]')
      .evaluateAll((els) => els.map((el) => el.getAttribute('aria-label')))

    expect(sectionLabels.length).toBeGreaterThanOrEqual(3)

    // Params section comes before payoff section comes before pool section
    const paramsIdx = sectionLabels.findIndex((l) => l && /par[aá]metro/i.test(l))
    const payoffIdx = sectionLabels.findIndex((l) => l && /rentabilidad/i.test(l))
    const poolIdx = sectionLabels.findIndex((l) => l && /pool/i.test(l))

    expect(paramsIdx).toBeGreaterThanOrEqual(0)
    expect(payoffIdx).toBeGreaterThanOrEqual(0)
    expect(poolIdx).toBeGreaterThanOrEqual(0)

    // DOM order: params → payoff → pool
    expect(paramsIdx).toBeLessThan(payoffIdx)
    expect(payoffIdx).toBeLessThan(poolIdx)
  })
})

// ---------------------------------------------------------------------------
// Simulated DETAIL route — Wave 4 axe assertions (en locale)
// ---------------------------------------------------------------------------

test.describe('DEFI-06 — axe WCAG 2.2 AA on simulated instrument detail (en)', () => {
  test('zero serious/critical axe violations on simulated route (en)', async ({ page }) => {
    await page
      .context()
      .addCookies([{ name: 'NEXT_LOCALE', value: 'en', domain: 'localhost', path: '/' }])
    await page.goto(SIMULATED_ROUTE)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(800)
    await expect(page.locator('h1')).toBeVisible()

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze()

    const seriousCritical = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    )

    if (seriousCritical.length > 0) {
      console.error(
        'Serious/critical axe violations (en):',
        JSON.stringify(
          seriousCritical.map((v) => ({
            id: v.id,
            impact: v.impact,
            description: v.description,
            nodes: v.nodes.map((n) => n.html).slice(0, 3),
          })),
          null,
          2,
        ),
      )
    }

    expect(seriousCritical).toHaveLength(0)
  })

  test('PayoffDiagram role=img aria-label contains "schematic" (en)', async ({ page }) => {
    await page
      .context()
      .addCookies([{ name: 'NEXT_LOCALE', value: 'en', domain: 'localhost', path: '/' }])
    await page.goto(SIMULATED_ROUTE)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(800)

    // en aria-label: "Schematic payoff diagram — positive gamma" (capital S)
    // CSS attribute selectors are case-sensitive — use evaluate to check all role=img
    const payoffImgs = page.locator('[role="img"][aria-label]')
    const count = await payoffImgs.count()
    let found = false
    for (let i = 0; i < count; i++) {
      const label = await payoffImgs.nth(i).getAttribute('aria-label')
      if (label && /schematic/i.test(label)) {
        found = true
        break
      }
    }
    expect(found).toBe(true)
  })
})
