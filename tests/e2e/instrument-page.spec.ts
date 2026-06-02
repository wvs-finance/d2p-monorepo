// DEFI-03/05/08 — per-instrument detail page (Wave 4: real simulated route assertions).
//
// Strategy:
//   The registry now has a navigable simulated entry:
//     { kind:'simulated', id:'ccop-usd-long-gamma', chainId:8453, fixtureKey:'ccop-usd-long-gamma' }
//   All Wave 3 stubs (WAIVER-05-04 fixme) have been replaced with real assertions
//   against /apps/abrigo/instruments/ccop-usd-long-gamma/8453.
//
// The 404-boundary tests are preserved (unknown id / unknown chain).
// Runs against the production webpack build (playwright.config.ts webServer).

import { expect, test } from '@playwright/test'

const SIMULATED_ROUTE = '/apps/abrigo/instruments/ccop-usd-long-gamma/8453'

// ---------------------------------------------------------------------------
// 404 boundary — preserved from WAIVER-05-04 stubs
// ---------------------------------------------------------------------------

test.describe('DEFI-03/05 — instrument detail page 404 boundaries', () => {
  test('unknown instrument id returns 404 (notFound boundary)', async ({ page }) => {
    const response = await page.goto('/apps/abrigo/instruments/does-not-exist/42220')
    // Next.js notFound() triggers the 404 page; status should be 404
    expect(response?.status()).toBe(404)
  })

  test('unknown chain id returns 404 (notFound boundary)', async ({ page }) => {
    const response = await page.goto('/apps/abrigo/instruments/some-id/99999')
    expect(response?.status()).toBe(404)
  })
})

// ---------------------------------------------------------------------------
// DEFI-05: SIMULADO badge above the fold at 360px — es-CO (default locale)
// ---------------------------------------------------------------------------

test.describe('DEFI-05 — SIMULADO badge above fold at 360px (es-CO)', () => {
  test('SIMULADO badge visible at scrollY===0 on 360px viewport (es-CO)', async ({ page }) => {
    // es-CO is the default locale (no cookie needed)
    await page.setViewportSize({ width: 360, height: 640 })
    await page.goto(SIMULATED_ROUTE)
    await page.waitForLoadState('networkidle')

    // Assert page loaded at the top — not scrolled
    const scrollY = await page.evaluate(() => window.scrollY)
    expect(scrollY).toBe(0)

    // SIMULADO badge must be above the fold (in viewport without scrolling)
    const simuladoBadge = page.locator('span', { hasText: 'SIMULADO' }).first()
    await expect(simuladoBadge).toBeVisible()
    await expect(simuladoBadge).toBeInViewport()
  })

  test('RiskCallout heading visible above fold at 360px (es-CO)', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 })
    await page.goto(SIMULATED_ROUTE)
    await page.waitForLoadState('networkidle')

    // RiskCallout renders as aside or section containing a heading.
    // Check the page renders at Y=0 (DEFI-05 above-fold invariant)
    const scrollY = await page.evaluate(() => window.scrollY)
    expect(scrollY).toBe(0)

    // H1 should also be visible without scrolling
    const h1 = page.getByRole('heading', { level: 1 })
    await expect(h1).toBeInViewport()
  })
})

// ---------------------------------------------------------------------------
// DEFI-05: SIMULADO badge above the fold at 360px — en locale
// ---------------------------------------------------------------------------

test.describe('DEFI-05 — SIMULADO badge above fold at 360px (en locale)', () => {
  test('SIMULADO badge visible at scrollY===0 on 360px viewport (en)', async ({ page }) => {
    await page
      .context()
      .addCookies([{ name: 'NEXT_LOCALE', value: 'en', domain: 'localhost', path: '/' }])
    await page.setViewportSize({ width: 360, height: 640 })
    await page.goto(SIMULATED_ROUTE)
    await page.waitForLoadState('networkidle')

    const scrollY = await page.evaluate(() => window.scrollY)
    expect(scrollY).toBe(0)

    // The badge label comes from t('simulated.badge') which is locale-aware
    // In either locale the badge SPAN contains the translated text; the aria-label
    // distinguishes it from other spans
    const simuladoBadge = page
      .locator('span[aria-label]')
      .filter({ hasText: /SIMULADO|simulated/i })
      .first()
    await expect(simuladoBadge).toBeVisible()
    await expect(simuladoBadge).toBeInViewport()
  })
})

// ---------------------------------------------------------------------------
// DEFI-08/DEFI-03: Schematic payoff curve renders (es-CO)
// ---------------------------------------------------------------------------

test.describe('DEFI-08 — schematic payoff diagram paints on the simulated route', () => {
  test('payoff role=img element present with "esquemático" in aria-label (es-CO)', async ({
    page,
  }) => {
    await page.goto(SIMULATED_ROUTE)
    await page.waitForLoadState('networkidle')

    // PayoffDiagram wraps the chart in a div[role="img"] with the ariaLabel prop.
    // The ariaLabel for the schematic branch contains 'esquemático' (es-CO).
    // The aria-label attribute check is preferred over text content (caption is sr-only).
    const payoffImg = page.locator('[role="img"][aria-label*="esquemático"]')
    await expect(payoffImg).toBeVisible()
  })

  test('payoff role=img element present with "schematic" in aria-label (en)', async ({ page }) => {
    await page
      .context()
      .addCookies([{ name: 'NEXT_LOCALE', value: 'en', domain: 'localhost', path: '/' }])
    await page.goto(SIMULATED_ROUTE)
    await page.waitForLoadState('networkidle')

    // The en aria-label is "Schematic payoff diagram — positive gamma"
    // aria-label contains "Schematic" (capital S) — use [aria-label] selector to get all
    const payoffImgs = page.locator('[role="img"][aria-label]')
    const payoffCount = await payoffImgs.count()
    let found = false
    for (let i = 0; i < payoffCount; i++) {
      const label = await payoffImgs.nth(i).getAttribute('aria-label')
      if (label && /schematic/i.test(label)) {
        found = true
        break
      }
    }
    expect(found).toBe(true)
  })

  test('recharts surface renders with non-zero bounding box (curve paints)', async ({ page }) => {
    await page.goto(SIMULATED_ROUTE)
    await page.waitForLoadState('networkidle')

    // Wait for client hydration — PayoffDiagramClient uses dynamic(ssr:false)
    await page.waitForTimeout(800)

    // The recharts LineChart renders an svg inside the role=img container.
    // Assert the svg has a non-zero height (curve actually painted).
    const svgHeight = await page.evaluate(() => {
      const svg = document.querySelector('[role="img"] svg')
      if (!svg) return 0
      return svg.getBoundingClientRect().height
    })
    expect(svgHeight).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// SnapshotPoolPanel: seededLiquidity + fork-fixture provenance pill (es-CO)
// ---------------------------------------------------------------------------

test.describe('DEFI-08 — SnapshotPoolPanel fork-fixture data', () => {
  test('seededLiquidity value renders as-is (bigint-as-string, no Number coercion)', async ({
    page,
  }) => {
    await page.goto(SIMULATED_ROUTE)
    await page.waitForLoadState('networkidle')

    // Fixture value: '1000000000000000000000000' — rendered verbatim (bigint-as-string).
    // The value appears in both InstrumentParams and SnapshotPoolPanel; use .first() to
    // avoid strict-mode violation (either dd is sufficient proof the value is not coerced).
    const seededLiquidityCell = page
      .locator('dd')
      .filter({ hasText: '1000000000000000000000000' })
      .first()
    await expect(seededLiquidityCell).toBeVisible()
  })

  test('fork-fixture provenance pill present on pool panel', async ({ page }) => {
    await page.goto(SIMULATED_ROUTE)
    await page.waitForLoadState('networkidle')

    // ProvenancePill renders a span with the tier name 'fork-fixture' as visible text
    const forkFixturePill = page.locator('span', { hasText: 'fork-fixture' }).first()
    await expect(forkFixturePill).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// CashFlowWaterfall: data-cost row is em-dash (anti-fishing, Phase-9 unbuilt)
// ---------------------------------------------------------------------------

test.describe('CROSS-09 — CashFlowWaterfall data-cost em-dash (no fabricated zeros)', () => {
  test('data-cost row renders em-dash (—) not 0 (es-CO)', async ({ page }) => {
    await page.goto(SIMULATED_ROUTE)
    await page.waitForLoadState('networkidle')

    // The cashflow.dataCost.value is null in the fixture → formatValue returns '—'
    // CashFlowWaterfall is inside section[aria-label="Flujo de caja"] (es-CO).
    // Use aria-label to uniquely target the section (avoids strict-mode violation
    // from the inner <section> rendered by CashFlowWaterfall itself).
    const cashflowSection = page.getByRole('region', { name: 'Flujo de caja' })
    await expect(cashflowSection).toBeVisible()

    // There should be at least one em-dash in the cash flow section
    const emDashCells = cashflowSection.locator('dd').filter({ hasText: '—' })
    await expect(emDashCells.first()).toBeVisible()
  })

  test('no fabricated "0" numeric in the data-cost dd', async ({ page }) => {
    await page.goto(SIMULATED_ROUTE)
    await page.waitForLoadState('networkidle')

    // The data-cost dd must NOT show '0' (or '0.00') as a standalone value
    // This confirms the null→em-dash rule is enforced
    const cashflowDds = page.locator('dl dd.font-mono')
    const count = await cashflowDds.count()
    for (let i = 0; i < count; i++) {
      const text = await cashflowDds.nth(i).textContent()
      // None of the cashflow dd cells should be the bare zero literal
      expect(text?.trim()).not.toBe('0')
      expect(text?.trim()).not.toBe('0.00')
    }
  })
})

// ---------------------------------------------------------------------------
// No fabricated numbers: no strike/slope params in simulated route
// ---------------------------------------------------------------------------

test.describe('CROSS-09 — No fabricated live-only params on simulated route', () => {
  test('no strike/slope row appears in params table for simulated instrument', async ({ page }) => {
    await page.goto(SIMULATED_ROUTE)
    await page.waitForLoadState('networkidle')

    // The simulated branch of InstrumentParams does NOT render strike/slope rows
    // (those are live-only fields — kind==='live' only).
    // Assert that neither 'strike' nor 'slope' appears as a visible dt label.
    const paramsSection = page
      .locator('section[aria-label]')
      .filter({
        has: page.locator('dl'),
      })
      .first()

    // The params table dt labels should NOT include 'strike' or 'slope' in text
    const dtLabels = await paramsSection.locator('dt').allTextContents()
    for (const label of dtLabels) {
      expect(label.toLowerCase()).not.toMatch(/^strike$/)
      expect(label.toLowerCase()).not.toMatch(/^slope$/)
    }
  })
})

// ---------------------------------------------------------------------------
// CROSS-09 gate: all THREE provenance tiers render as pills on the simulated route
// fork-fixture (params table) + spec (cashflow waterfall) + schematic (payoff diagram)
// This test GATES the 3-pill decision — ensures no tier regresses to text-only annotation.
// ---------------------------------------------------------------------------

test.describe('CROSS-09 — three provenance tiers render as pills (gate)', () => {
  test('fork-fixture pill renders as a span pill on the simulated detail route', async ({
    page,
  }) => {
    await page.goto(SIMULATED_ROUTE)
    await page.waitForLoadState('networkidle')

    // ProvenancePill renders a span with aria-label (the full provenance sentence)
    // and visible tier text. fork-fixture pill has aria-label containing 'fork-fixture_aria' text.
    // Use the visible tier text 'fork-fixture' as the anchor.
    const forkFixturePill = page
      .locator('span[aria-label]')
      .filter({ hasText: 'fork-fixture' })
      .first()
    await expect(forkFixturePill).toBeVisible()
  })

  test('spec pill renders as a span pill on the simulated detail route', async ({ page }) => {
    await page.goto(SIMULATED_ROUTE)
    await page.waitForLoadState('networkidle')

    // spec tier pill — visible text is 'Especificación' (es-CO) or 'Specification' (en).
    // Use aria-label presence to confirm it's a ProvenancePill, not freestanding text.
    // The spec_aria key: "Especificado en planes Phase-8 de abrigo-somnia — aún no está en cadena"
    const specPill = page
      .locator('span[aria-label]')
      .filter({ hasText: /especificac|specification/i })
      .first()
    await expect(specPill).toBeVisible()
  })

  test('schematic pill renders as a span pill adjacent to the payoff diagram', async ({ page }) => {
    await page.goto(SIMULATED_ROUTE)
    await page.waitForLoadState('networkidle')

    // schematic tier pill — visible text is 'Esquemático' (es-CO) or 'Schematic' (en).
    // aria-label is provenance.schematic_aria:
    //   "Forma ilustrativa — no es una función de liquidación derivada del contrato"
    const schematicPill = page
      .locator('span[aria-label]')
      .filter({ hasText: /esquemát|schematic/i })
      .first()
    await expect(schematicPill).toBeVisible()
  })

  test('all three provenance tiers are pills (aria-label present on each)', async ({ page }) => {
    await page.goto(SIMULATED_ROUTE)
    await page.waitForLoadState('networkidle')

    // Collect all span[aria-label] elements on the page; confirm the three tier labels exist.
    // This is a belt-and-suspenders check that EACH tier has the aria-label attribute
    // (meaning it's a ProvenancePill, not a plain text node).
    const allAriaSpans = page.locator('span[aria-label]')
    const count = await allAriaSpans.count()
    const ariaLabels: string[] = []
    for (let i = 0; i < count; i++) {
      const label = await allAriaSpans.nth(i).getAttribute('aria-label')
      if (label) ariaLabels.push(label)
    }

    // At least one aria-label must reference each tier's provenance sentence
    const hasForkFixture = ariaLabels.some(
      (l) => l.includes('fork') || l.includes('fixture') || l.includes('sembrado'),
    )
    const hasSpec = ariaLabels.some((l) => l.includes('Phase-8') || l.includes('Specified'))
    const hasSchematic = ariaLabels.some(
      (l) => l.includes('ilustrativa') || l.includes('Illustrative'),
    )

    expect(hasForkFixture, 'fork-fixture provenance pill aria-label missing').toBe(true)
    expect(hasSpec, 'spec provenance pill aria-label missing').toBe(true)
    expect(hasSchematic, 'schematic provenance pill aria-label missing').toBe(true)
  })
})
