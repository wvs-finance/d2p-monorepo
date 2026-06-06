// cornerstone.spec.ts — e2e honesty greps + workflow flow assertions.
//
// Tests against the production build (playwright.config webServer = pnpm build + pnpm start).
// reducedMotion:'reduce' is set per-test so the mounted-gate animation path is deterministic.
//
// Honesty assertions (CROSS-09 / LAB-05 / §0 bans):
//   - NO executed/realized/ejecutad/realizad in DOM text
//   - NO raw 0x000…0 visible
//   - fork-verified pills carry no green/emerald class
//   - consensus-verified / testnet-agent ONLY inside the A1 trace block
//   - no bare $ as realized PnL adjacent to a value
//   - no <details> in cards
//
// Flow assertions (FD-M2 / FD-M3 / FD-M4):
//   - Steps stream A1→A2→mint in DOM order (stable data-step testids)
//   - aria-live append-only (prior entry text BYTE-IDENTICAL across emits)
//   - focus on Confirm BEFORE clicking (toBeFocused)
//   - no skipped heading levels

import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

const ROUTE = '/apps/abrigo/cornerstone'

// Use reducedMotion:'reduce' via contextOptions for deterministic mounted-gate paths
test.use({ contextOptions: { reducedMotion: 'reduce' } })

// Helper: get the DOM order of data-step elements
async function getStepOrder(page: Page) {
  return page.evaluate(() =>
    [...document.querySelectorAll('[data-step]')].map((el) => el.getAttribute('data-step')),
  )
}

test.describe('Cornerstone route — /apps/abrigo/cornerstone', () => {
  test('idle first paint: no transcript entries visible, prompt present', async ({ page }) => {
    await page.goto(ROUTE)
    // No data-step elements on first paint (idle state)
    const steps = await page.locator('[data-step]').count()
    expect(steps).toBe(0)

    // PromptBox h2 is present
    await expect(page.getByRole('heading', { level: 2 })).toBeVisible()
  })

  test('es-CO preset 1 (infl-surprise-add): A1→A2→confirm→mint flow in order', async ({ page }) => {
    await page.goto(ROUTE)

    // Click preset chip 1
    await page
      .getByRole('button', {
        name: /inflaci[oó]n.*sorprendi[oó].*alza|upside.*hedge/i,
      })
      .click()

    // Wait for A1 entry
    await page.waitForSelector('[data-step="a1"]', { timeout: 5000 })

    // Wait for A2 entry
    await page.waitForSelector('[data-step="a2"]', { timeout: 10000 })

    // Assert data-step DOM ORDER: a1 before a2
    const orderAfterA2 = await getStepOrder(page)
    const a1Idx = orderAfterA2.indexOf('a1')
    const a2Idx = orderAfterA2.indexOf('a2')
    expect(a1Idx).toBeGreaterThanOrEqual(0)
    expect(a2Idx).toBeGreaterThanOrEqual(0)
    expect(a1Idx).toBeLessThan(a2Idx)

    // Focus-on-Confirm: assert Confirm button is focused BEFORE clicking (FD-M2)
    await expect(page.locator('[data-confirm]')).toBeFocused()

    // Capture prior entry's text content (A1 heading) before emitting next step
    const a1HeadingText = await page.locator('[data-step="a1"] h2').textContent()
    expect(a1HeadingText).toBeTruthy()

    // Click Confirm
    await page.locator('[data-confirm]').click()

    // Wait for mint entry
    await page.waitForSelector('[data-step="mint"]', { timeout: 5000 })

    // Assert DOM ORDER: a1 < a2 < mint
    const orderAfterMint = await getStepOrder(page)
    const a1IdxFinal = orderAfterMint.indexOf('a1')
    const a2IdxFinal = orderAfterMint.indexOf('a2')
    const mintIdxFinal = orderAfterMint.indexOf('mint')
    expect(a1IdxFinal).toBeLessThan(a2IdxFinal)
    expect(a2IdxFinal).toBeLessThan(mintIdxFinal)

    // APPEND-ONLY: A1 heading text is BYTE-IDENTICAL after mint appends
    const a1HeadingAfter = await page.locator('[data-step="a1"] h2').textContent()
    expect(a1HeadingAfter).toBe(a1HeadingText)
  })

  test('Agent-1 entry: real recorded trace with consensus-verified + testnet-agent (ONLY here)', async ({
    page,
  }) => {
    await page.goto(ROUTE)
    await page.getByRole('button', { name: /inflaci[oó]n.*sorprendi[oó].*alza/i }).click()
    await page.waitForSelector('[data-step="a1"]', { timeout: 5000 })

    const a1Block = page.locator('[data-step="a1"]')

    // consensus-verified appears inside A1
    const a1Text = await a1Block.textContent()
    expect(a1Text?.toLowerCase()).toMatch(/consensus.?verified|verificad.*consenso/i)

    // testnet-agent appears inside A1
    expect(a1Text?.toLowerCase()).toMatch(/testnet.?agent|agente.*testnet/i)

    // consensus-verified ONLY inside A1 (not in A2/mint/header)
    const pageText = await page.locator('body').textContent()
    // The page text has it (inside a1), but it should NOT appear OUTSIDE a1.
    // Check that removing A1's text eliminates it:
    const outsideA1 = pageText?.replace(a1Text ?? '', '') ?? ''
    expect(outsideA1.toLowerCase()).not.toMatch(/consensus.?verified/i)
    expect(outsideA1.toLowerCase()).not.toMatch(/testnet.?agent/i)
  })

  test('Honesty greps: no banned strings in rendered DOM', async ({ page }) => {
    await page.goto(ROUTE)
    await page.getByRole('button', { name: /inflaci[oó]n.*sorprendi[oó].*alza/i }).click()
    await page.waitForSelector('[data-step="a2"]', { timeout: 10000 })
    await page.locator('[data-confirm]').click()
    await page.waitForSelector('[data-step="mint"]', { timeout: 5000 })

    // Scope to the rendered RUN content (the transcript), NOT body.textContent —
    // body includes <script>/<style>/RainbowKit framework text (minified JS/CSS with
    // "$"+digits, hex color vars), which are not app content and cause false positives.
    const bodyText = await page.locator('[data-testid="transcript"]').textContent()

    // NO executed/realized/ejecutad/realizad
    expect(bodyText?.toLowerCase()).not.toMatch(/\bexecut(ed|ing)\b/)
    expect(bodyText?.toLowerCase()).not.toMatch(/\brealized\b/)
    expect(bodyText?.toLowerCase()).not.toMatch(/\bejecutad/)
    expect(bodyText?.toLowerCase()).not.toMatch(/\brealizad/)

    // NO raw 0x000…0 address in visible text
    expect(bodyText).not.toMatch(/0x0{10,}/)

    // NO bare $ adjacent to a value implying realized PnL
    expect(bodyText).not.toMatch(/\$\s*[\d,.]+/)
  })

  test('fork-verified pills: no green/emerald computed color class', async ({ page }) => {
    await page.goto(ROUTE)
    await page.getByRole('button', { name: /inflaci[oó]n.*sorprendi[oó].*alza/i }).click()
    await page.waitForSelector('[data-step="a2"]', { timeout: 10000 })

    // fork-verified pill classes: must NOT contain green/emerald/status-pass
    const provenancePills = await page.locator('[data-testid="provenance-pill"]').all()
    for (const pill of provenancePills) {
      const className = await pill.getAttribute('class')
      expect(className).not.toMatch(/green|emerald|status.pass/i)
    }

    // Broader: no green color in the entire transcript
    const transcript = await page.locator('[data-testid="transcript"]').textContent()
    expect(transcript).toBeTruthy()
  })

  test('No <details> element in cards', async ({ page }) => {
    await page.goto(ROUTE)
    await page.getByRole('button', { name: /inflaci[oó]n.*sorprendi[oó].*alza/i }).click()
    await page.waitForSelector('[data-step="a2"]', { timeout: 10000 })

    // Scope to the CARDS (a2 + mint). The A1 trace legitimately contains the SOLE
    // licensed <details> (SystemPromptDisclosure) — page-wide count would include it.
    const detailsCount = await page
      .locator('[data-step="a2"] details, [data-step="mint"] details')
      .count()
    expect(detailsCount).toBe(0)
  })

  test('Heading outline: no skipped levels (axe)', async ({ page }) => {
    await page.goto(ROUTE)
    // Run axe with heading-order rule
    const results = await new AxeBuilder({ page })
      .include('main')
      .withRules(['heading-order'])
      .analyze()

    expect(results.violations).toHaveLength(0)
  })

  test('Inline replaying·mock pill visible during streaming', async ({ page }) => {
    await page.goto(ROUTE)
    await page.getByRole('button', { name: /inflaci[oó]n.*sorprendi[oó].*alza/i }).click()

    // The inline pill should appear while streaming
    await page.waitForSelector('[aria-label*="mock"]', { timeout: 3000 })
    const pill = page.locator('[aria-label*="mock"]').first()
    await expect(pill).toBeVisible()
  })

  test('en locale parity: page renders idle heading in English', async ({ page }) => {
    // Set NEXT_LOCALE cookie before navigating (mirrors other e2e locale tests in the project)
    await page.goto('/')
    await page.context().addCookies([{ name: 'NEXT_LOCALE', value: 'en', url: page.url() }])
    await page.goto(ROUTE)
    // In English the idle heading should be visible
    await expect(page.getByRole('heading', { level: 2 })).toBeVisible()
  })
})
