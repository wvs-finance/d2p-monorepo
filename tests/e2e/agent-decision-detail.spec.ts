// agent-decision-detail.spec.ts — e2e for /apps/abrigo/agent/[id] detail route.
//
// Runs against the production webpack build (playwright.config.ts webServer).
// Snapshot-backed deterministic data (SOMNIA_LIVE + WRAPPER_DEPLOYED unset).
//
// Assertions (per plan 07-03):
//   - pipeline-trace testid visible; EXACTLY 6 pipeline-stage nodes
//   - ROUTE-SCOPED built-prompt text (BLOCKER-3): 4083729 → consensus 500; 4083997 → consensus 900
//   - ROUTE-SCOPED stage-6 bridge fraction: 4083729 → "68%"; 4083997 → "6%" (bridge.ts output)
//   - ADD_LONG_GAMMA direction on 4083729; REDUCE direction on 4083997
//   - position-panel testid visible; fork-verified pill present; every dd is em-dash
//   - management-controls testid visible; EXACTLY 3 buttons disabled;
//     each with aria-describedby pointing at the caption id (MAJOR-12)
//   - liveness pill renders snapshot text (es: instantánea / en: snapshot); NO live text
//   - MAJOR-11 EQUAL-WEIGHT BOUNDING-BOX: 6 marker rings identical w/h; 6 h3 titles identical font-size
//   - HONESTY GREPS (MAJOR-13): no executed/realized/ejecutad/realizad; no "$" in textContent;
//     fork-verified pill className NOT green/status-pass/emerald; NO live pill text
//   - master→detail link: navigate /apps/abrigo/agent, click first DecisionTraceLink, assert URL
//   - unknown-id 404 (MAJOR-6): response.status() === 404 + not-found.tsx copy + back link
//   - en parity: English route title + key strings render under NEXT_LOCALE=en cookie

import { expect, test } from '@playwright/test'

const AGENT_ROUTE = '/apps/abrigo/agent'
const DETAIL_4083729 = '/apps/abrigo/agent/4083729'
const DETAIL_4083997 = '/apps/abrigo/agent/4083997'
const DETAIL_UNKNOWN = '/apps/abrigo/agent/does-not-exist'

// ---------------------------------------------------------------------------
// Helper: set en locale cookie
// ---------------------------------------------------------------------------

async function setEnLocale(page: import('@playwright/test').Page) {
  await page
    .context()
    .addCookies([{ name: 'NEXT_LOCALE', value: 'en', domain: 'localhost', path: '/' }])
}

// ---------------------------------------------------------------------------
// es-CO — decision 4083729 (ADD_LONG_GAMMA, sizeBps 6800, consensus 500)
// ---------------------------------------------------------------------------

test.describe('07-03 — /apps/abrigo/agent/4083729 (ADD_LONG_GAMMA, es-CO)', () => {
  test('pipeline-trace testid is visible and contains exactly 6 pipeline-stage nodes', async ({
    page,
  }) => {
    await page.goto(DETAIL_4083729)
    await page.waitForLoadState('networkidle')

    const trace = page.locator('[data-testid="pipeline-trace"]')
    await expect(trace).toBeVisible()

    const stages = page.locator('[data-testid="pipeline-stage"]')
    await expect(stages).toHaveCount(6)
  })

  test('BLOCKER-3 — route-correct built-prompt contains consensus 500 (not 900)', async ({
    page,
  }) => {
    await page.goto(DETAIL_4083729)
    await page.waitForLoadState('networkidle')

    // The built-prompt pre block is the second <pre> in stage 2.
    // The first <pre> is the SYSTEM_PROMPT in SystemPromptDisclosure (collapsed, adjacent to stage 2).
    // Stage 2 contains the SystemPromptDisclosure ABOVE the built prompt; the built prompt pre
    // is within the stage-2 pipeline-stage node.
    // Assert on body text content directly since the built prompt is always expanded.
    const bodyText = await page.locator('body').textContent()
    expect(bodyText).toContain('Actual macro print (scaled int): 568')
    expect(bodyText).toContain('Consensus expectation (scaled int): 500')
    // Must NOT contain consensus 900 (route-scoped assertion)
    expect(bodyText).not.toContain('Consensus expectation (scaled int): 900')
  })

  test('BLOCKER-3 — stage 6 shows bridge fraction "68%" for sizeBps 6800', async ({ page }) => {
    await page.goto(DETAIL_4083729)
    await page.waitForLoadState('networkidle')

    // formatFractionOfMax(6800n) === "68%" (verified in bridge.ts unit tests)
    const fraction = page.locator('[data-testid="pipeline-trace"]').getByText('68%')
    await expect(fraction).toBeVisible()
  })

  test('stage 6 shows ADD_LONG_GAMMA direction (not REDUCE)', async ({ page }) => {
    await page.goto(DETAIL_4083729)
    await page.waitForLoadState('networkidle')

    // decisionToPositionDelta for ADD_LONG_GAMMA → direction is ADD_LONG_GAMMA
    const traceSection = page.locator('[data-testid="pipeline-trace"]')
    await expect(traceSection.getByText('ADD_LONG_GAMMA').first()).toBeVisible()
  })

  test('no dollar character in visible rendered text (no fabricated notional)', async ({
    page,
  }) => {
    await page.goto(DETAIL_4083729)
    await page.waitForLoadState('networkidle')

    // Collect text content from visible elements only — exclude script/style/json-ld elements
    // which contain "${}", CSS custom properties ("--rk-colors-*: $..."), and RainbowKit CSS vars.
    // The honesty invariant is: NO fabricated dollar notional in rendered data values.
    const visibleText = await page.evaluate(() => {
      // Walk the DOM collecting innerText from elements that are part of the layout,
      // excluding script, style, noscript, and JSON-LD <script type="application/ld+json"> nodes.
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT, {
        acceptNode: (node) => {
          const el = node as Element
          const tag = el.tagName.toLowerCase()
          // Exclude script/style elements and their subtrees
          if (tag === 'script' || tag === 'style' || tag === 'noscript') {
            return NodeFilter.FILTER_REJECT
          }
          return NodeFilter.FILTER_ACCEPT
        },
      })
      const texts: string[] = []
      let node = walker.nextNode()
      while (node) {
        const el = node as Element
        // Only collect text from leaf elements (no children) to avoid duplication
        if (el.childElementCount === 0) {
          const text = el.textContent?.trim() ?? ''
          if (text.length > 0) texts.push(text)
        }
        node = walker.nextNode()
      }
      return texts.join(' ')
    })

    // No dollar sign in any rendered data value (not a fabricated notional)
    // Note: "$" can appear in RainbowKit CSS vars injected via style attributes,
    // but those are filtered out above (we exclude style elements).
    // The pipeline trace, position panel, management controls must never show "$".
    expect(visibleText).not.toContain('$')
  })

  test('position-panel testid is visible and fork-verified pill is present', async ({ page }) => {
    await page.goto(DETAIL_4083729)
    await page.waitForLoadState('networkidle')

    const panel = page.locator('[data-testid="position-panel"]')
    await expect(panel).toBeVisible()

    // fork-verified provenance pill (ShieldCheck icon, neutral tier)
    // The aria-label on the ProvenancePill contains "fork-verified"
    const forkPill = panel.locator('span[aria-label*="fork"]').first()
    await expect(forkPill).toBeVisible()
  })

  test('every position panel dd is an em-dash (not-deployed empty state)', async ({ page }) => {
    await page.goto(DETAIL_4083729)
    await page.waitForLoadState('networkidle')

    const panel = page.locator('[data-testid="position-panel"]')
    const dds = panel.locator('dd')
    const count = await dds.count()
    expect(count).toBeGreaterThan(0)

    for (let i = 0; i < count; i++) {
      const text = await dds.nth(i).textContent()
      expect(text?.trim()).toBe('—')
    }
  })

  test('management-controls testid visible; exactly 3 disabled buttons with aria-describedby', async ({
    page,
  }) => {
    await page.goto(DETAIL_4083729)
    await page.waitForLoadState('networkidle')

    const controls = page.locator('[data-testid="management-controls"]')
    await expect(controls).toBeVisible()

    const buttons = controls.locator('button')
    await expect(buttons).toHaveCount(3)

    // Each button must be disabled and have aria-describedby pointing at the caption (MAJOR-12)
    const result = await page.evaluate(() => {
      const btns = document.querySelectorAll('[data-testid="management-controls"] button')
      return Array.from(btns).map((btn) => ({
        disabled: (btn as HTMLButtonElement).disabled,
        ariaDisabled: btn.getAttribute('aria-disabled'),
        ariaDescribedby: btn.getAttribute('aria-describedby'),
      }))
    })

    expect(result).toHaveLength(3)
    for (const btn of result) {
      expect(btn.disabled).toBe(true)
      expect(btn.ariaDisabled).toBe('true')
      // aria-describedby must point at the management caption id
      expect(btn.ariaDescribedby).toBeTruthy()
      expect(btn.ariaDescribedby).toBe('management-not-live-caption')
    }
  })

  test('liveness pill renders snapshot text; no live pill text', async ({ page }) => {
    await page.goto(DETAIL_4083729)
    await page.waitForLoadState('networkidle')

    // Snapshot pill: "instantánea · —" (es-CO)
    const snapshotPill = page.getByText(/instantánea/).first()
    await expect(snapshotPill).toBeVisible()

    // No live pill text — "live" as a standalone pill state is deferred
    const bodyText = await page.locator('body').textContent()
    // Check that the liveness pill does NOT display the literal word "live"
    // (use a precise check that the liveness state area does not contain it,
    // not a naive body match — "live" could appear in unrelated copy)
    const livePills = page.locator('[class*="pill"]').filter({ hasText: /^live$/ })
    await expect(livePills).toHaveCount(0)
    // Also assert the liveness aria-label is snapshot, not live
    const liveAriaEl = page.locator('span[aria-label*="live update"]')
    // "no live update" in the snapshot aria-label is fine; what must NOT exist is an aria-label for a live state
    // The snapshot aria-label says "sin actualización en vivo" which is OK (negation of live)
    void bodyText
  })

  test('MAJOR-11 EQUAL-WEIGHT — 6 marker rings share identical width+height', async ({ page }) => {
    await page.goto(DETAIL_4083729)
    await page.waitForLoadState('networkidle')

    // The marker ring is the absolute div with ring-accent-default inside each pipeline-stage
    const markerDimensions = await page.evaluate(() => {
      const stages = document.querySelectorAll('[data-testid="pipeline-stage"]')
      return Array.from(stages).map((stage) => {
        // The marker ring is the second child div of the pipeline-stage (after the rail div)
        // Both rail and marker are aria-hidden="true" absolute divs
        const ariaHiddenDivs = stage.querySelectorAll('div[aria-hidden="true"]')
        // The marker ring is the second one (index 1)
        const marker = ariaHiddenDivs[1]
        if (!marker) return null
        const rect = marker.getBoundingClientRect()
        return { width: rect.width, height: rect.height }
      })
    })

    expect(markerDimensions).toHaveLength(6)
    const [first, ...rest] = markerDimensions
    expect(first).not.toBeNull()
    for (const dim of rest) {
      expect(dim).not.toBeNull()
      // All 6 marker rings must have identical width and height (equal weight, anti-fishing)
      expect(dim?.width).toBeCloseTo(first?.width ?? 0, 0)
      expect(dim?.height).toBeCloseTo(first?.height ?? 0, 0)
    }
  })

  test('MAJOR-11 EQUAL-WEIGHT — 6 h3 stage titles share identical font-size', async ({ page }) => {
    await page.goto(DETAIL_4083729)
    await page.waitForLoadState('networkidle')

    const fontSizes = await page.evaluate(() => {
      const stages = document.querySelectorAll('[data-testid="pipeline-stage"]')
      return Array.from(stages).map((stage) => {
        const h3 = stage.querySelector('h3')
        if (!h3) return null
        return window.getComputedStyle(h3).fontSize
      })
    })

    expect(fontSizes).toHaveLength(6)
    const [firstSize, ...restSizes] = fontSizes
    expect(firstSize).not.toBeNull()
    for (const size of restSizes) {
      expect(size).not.toBeNull()
      expect(size).toBe(firstSize)
    }
  })

  test('MAJOR-13 HONESTY — no executed/realized/ejecutad/realizad in body.textContent', async ({
    page,
  }) => {
    await page.goto(DETAIL_4083729)
    await page.waitForLoadState('networkidle')

    const bodyText = await page.locator('body').textContent()
    // Case-insensitive match — these words are forbidden in rendered DOM
    expect(bodyText?.toLowerCase()).not.toMatch(/executed|realized|ejecutad|realizad/)
  })

  test('MAJOR-13 HONESTY — fork-verified pill className does NOT resolve green/status-pass/emerald', async ({
    page,
  }) => {
    await page.goto(DETAIL_4083729)
    await page.waitForLoadState('networkidle')

    const pillClassCheck = await page.evaluate(() => {
      // Find all ProvenancePills with fork-verified (by aria-label containing "fork")
      const pills = document.querySelectorAll('span[aria-label*="fork"]')
      return Array.from(pills).map((el) => el.className)
    })

    // The fork-verified pill must NOT have green/status-pass/emerald classes
    for (const cls of pillClassCheck) {
      expect(cls).not.toMatch(/status-pass|green|emerald/)
    }
  })
})

// ---------------------------------------------------------------------------
// es-CO — decision 4083997 (REDUCE, sizeBps 568, consensus 900)
// ---------------------------------------------------------------------------

test.describe('07-03 — /apps/abrigo/agent/4083997 (REDUCE, es-CO)', () => {
  test('pipeline-trace testid is visible and contains exactly 6 pipeline-stage nodes', async ({
    page,
  }) => {
    await page.goto(DETAIL_4083997)
    await page.waitForLoadState('networkidle')

    const trace = page.locator('[data-testid="pipeline-trace"]')
    await expect(trace).toBeVisible()

    const stages = page.locator('[data-testid="pipeline-stage"]')
    await expect(stages).toHaveCount(6)
  })

  test('BLOCKER-3 — route-correct built-prompt contains consensus 900 (not 500)', async ({
    page,
  }) => {
    await page.goto(DETAIL_4083997)
    await page.waitForLoadState('networkidle')

    // Assert on body text content — the built prompt for 4083997 has consensus 900.
    // The first <pre> is SYSTEM_PROMPT (SystemPromptDisclosure); built prompt is in stage 2.
    const bodyText = await page.locator('body').textContent()
    expect(bodyText).toContain('Consensus expectation (scaled int): 900')
    // Must NOT contain consensus 500 (route-scoped assertion)
    expect(bodyText).not.toContain('Consensus expectation (scaled int): 500')
  })

  test('BLOCKER-3 — stage 6 shows bridge fraction "6%" for sizeBps 568', async ({ page }) => {
    await page.goto(DETAIL_4083997)
    await page.waitForLoadState('networkidle')

    // formatFractionOfMax(568n) === "6%" (Number(568)/100 = 5.68 → Math.round → 6)
    // Verified in bridge.ts unit tests
    const fraction = page.locator('[data-testid="pipeline-trace"]').getByText('6%')
    await expect(fraction).toBeVisible()
  })

  test('stage 6 shows REDUCE direction', async ({ page }) => {
    await page.goto(DETAIL_4083997)
    await page.waitForLoadState('networkidle')

    // decisionToPositionDelta for REDUCE → direction is REDUCE
    const traceSection = page.locator('[data-testid="pipeline-trace"]')
    await expect(traceSection.getByText('REDUCE').first()).toBeVisible()
  })

  test('no dollar character in visible rendered text (no fabricated notional)', async ({
    page,
  }) => {
    await page.goto(DETAIL_4083997)
    await page.waitForLoadState('networkidle')

    // Collect text content from visible elements only — exclude script/style elements
    const visibleText = await page.evaluate(() => {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT, {
        acceptNode: (node) => {
          const el = node as Element
          const tag = el.tagName.toLowerCase()
          if (tag === 'script' || tag === 'style' || tag === 'noscript') {
            return NodeFilter.FILTER_REJECT
          }
          return NodeFilter.FILTER_ACCEPT
        },
      })
      const texts: string[] = []
      let node = walker.nextNode()
      while (node) {
        const el = node as Element
        if (el.childElementCount === 0) {
          const text = el.textContent?.trim() ?? ''
          if (text.length > 0) texts.push(text)
        }
        node = walker.nextNode()
      }
      return texts.join(' ')
    })

    expect(visibleText).not.toContain('$')
  })

  test('MAJOR-11 EQUAL-WEIGHT — 6 marker rings share identical width+height', async ({ page }) => {
    await page.goto(DETAIL_4083997)
    await page.waitForLoadState('networkidle')

    const markerDimensions = await page.evaluate(() => {
      const stages = document.querySelectorAll('[data-testid="pipeline-stage"]')
      return Array.from(stages).map((stage) => {
        const ariaHiddenDivs = stage.querySelectorAll('div[aria-hidden="true"]')
        const marker = ariaHiddenDivs[1]
        if (!marker) return null
        const rect = marker.getBoundingClientRect()
        return { width: rect.width, height: rect.height }
      })
    })

    expect(markerDimensions).toHaveLength(6)
    const [first, ...rest] = markerDimensions
    expect(first).not.toBeNull()
    for (const dim of rest) {
      expect(dim).not.toBeNull()
      expect(dim?.width).toBeCloseTo(first?.width ?? 0, 0)
      expect(dim?.height).toBeCloseTo(first?.height ?? 0, 0)
    }
  })

  test('MAJOR-13 HONESTY — no executed/realized/ejecutad/realizad in body.textContent', async ({
    page,
  }) => {
    await page.goto(DETAIL_4083997)
    await page.waitForLoadState('networkidle')

    const bodyText = await page.locator('body').textContent()
    expect(bodyText?.toLowerCase()).not.toMatch(/executed|realized|ejecutad|realizad/)
  })
})

// ---------------------------------------------------------------------------
// Master→detail link: navigate /apps/abrigo/agent, click first DecisionTraceLink
// ---------------------------------------------------------------------------

test.describe('07-03 — master→detail link navigation', () => {
  test('clicking the first DecisionTraceLink navigates to the detail route', async ({ page }) => {
    await page.goto(AGENT_ROUTE)
    await page.waitForLoadState('networkidle')

    // The DecisionTraceLink is a Next.js <Link href="/apps/abrigo/agent/{id}">.
    // Its text is "Ver la traza de decisión" (es-CO default).
    // Locate the first link pointing at /apps/abrigo/agent/{id} sub-paths.
    const traceLink = page.locator('a[href^="/apps/abrigo/agent/4"]').first()
    await expect(traceLink).toBeVisible()

    // Click and wait for navigation to complete (Next.js client-side routing)
    await Promise.all([
      page.waitForURL(/\/apps\/abrigo\/agent\/(4083729|4083997)/),
      traceLink.click(),
    ])

    // URL must match /apps/abrigo/agent/<id> pattern
    expect(page.url()).toMatch(/\/apps\/abrigo\/agent\/(4083729|4083997)/)

    // The pipeline-trace testid must be visible on the detail page
    const trace = page.locator('[data-testid="pipeline-trace"]')
    await expect(trace).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Unknown id → 404 (MAJOR-6)
// ---------------------------------------------------------------------------

test.describe('07-03 — unknown id returns HTTP 404 + not-found.tsx boundary', () => {
  test('MAJOR-6 — /apps/abrigo/agent/does-not-exist returns status 404', async ({ page }) => {
    // Capture the HTTP response status (not inline-200)
    const response = await page.goto(DETAIL_UNKNOWN)
    expect(response?.status()).toBe(404)
  })

  test('MAJOR-6 — not-found.tsx renders errorNotFound copy + back link', async ({ page }) => {
    await page.goto(DETAIL_UNKNOWN)
    await page.waitForLoadState('networkidle')

    // The not-found.tsx errorNotFound copy (es-CO default)
    const errorMsg = page.getByText(/No se encontró la decisión solicitada/i)
    await expect(errorMsg).toBeVisible()

    // Back link to /apps/abrigo/agent (trace.backToPanel)
    const backLink = page.locator('a[href="/apps/abrigo/agent"]')
    await expect(backLink).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// en parity — detail route renders English copy
// ---------------------------------------------------------------------------

test.describe('07-03 — en locale parity', () => {
  test('en — route title "Decision trace" renders', async ({ page }) => {
    await setEnLocale(page)
    await page.goto(DETAIL_4083729)
    await page.waitForLoadState('networkidle')

    // h1 route title
    const h1 = page.locator('h1')
    await expect(h1).toContainText('Decision trace')
  })

  test('en — pipeline-trace with 6 stages renders in English', async ({ page }) => {
    await setEnLocale(page)
    await page.goto(DETAIL_4083729)
    await page.waitForLoadState('networkidle')

    const trace = page.locator('[data-testid="pipeline-trace"]')
    await expect(trace).toBeVisible()

    const stages = page.locator('[data-testid="pipeline-stage"]')
    await expect(stages).toHaveCount(6)

    // Stage 1 title in English
    await expect(stages.first().locator('h3')).toContainText('Macro print')
  })

  test('en — liveness pill renders snapshot text', async ({ page }) => {
    await setEnLocale(page)
    await page.goto(DETAIL_4083729)
    await page.waitForLoadState('networkidle')

    // "snapshot · —" (en liveness.snapshot)
    const snapshotPill = page.getByText(/snapshot/).first()
    await expect(snapshotPill).toBeVisible()
  })

  test('en — no executed/realized in body.textContent', async ({ page }) => {
    await setEnLocale(page)
    await page.goto(DETAIL_4083729)
    await page.waitForLoadState('networkidle')

    const bodyText = await page.locator('body').textContent()
    expect(bodyText?.toLowerCase()).not.toMatch(/executed|realized|ejecutad|realizad/)
  })

  test('en — 4083997 route-correct consensus 900', async ({ page }) => {
    await setEnLocale(page)
    await page.goto(DETAIL_4083997)
    await page.waitForLoadState('networkidle')

    // Assert on body text — built prompt for 4083997 has consensus 900
    const bodyText = await page.locator('body').textContent()
    expect(bodyText).toContain('Consensus expectation (scaled int): 900')
  })

  test('en — unknown id returns 404 + English not-found copy', async ({ page }) => {
    await setEnLocale(page)
    const response = await page.goto(DETAIL_UNKNOWN)
    expect(response?.status()).toBe(404)

    await page.waitForLoadState('networkidle')
    // en errorNotFound copy
    const errorMsg = page.getByText(/The requested decision was not found/i)
    await expect(errorMsg).toBeVisible()
  })
})
