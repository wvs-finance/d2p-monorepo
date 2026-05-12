// Plan 02-06 — Filled by plan 02-06.
// Covers requirement(s): ITER-04
import { expect, test } from '@playwright/test'

test.describe('phase-2 - ITER-04 — iteration evidence chain', () => {
  test('evidence chain renders β estimate in <dl> term/value pairs', async ({ page }) => {
    await page.goto('/apps/abrigo/iterations/pair-d/v1')

    // EvidenceChain renders a <dl> with dt/dd pairs
    const dl = page.locator('dl').first()
    await expect(dl).toBeVisible()

    const dtTexts = await page.locator('dl dt').allTextContents()
    // β label is in en "β" or es-CO "β"
    const hasBeta = dtTexts.some((t) => t.includes('β'))
    expect(hasBeta, `Expected a <dt> containing "β" but got: ${dtTexts.join(', ')}`).toBe(true)
  })

  test('evidence chain renders p-value + sample size N', async ({ page }) => {
    await page.goto('/apps/abrigo/iterations/pair-d/v1')
    const dtTexts = await page.locator('dl dt').allTextContents()
    const hasPValue = dtTexts.some(
      (t) => t.includes('p-value') || t.includes('p-valor') || t.includes('p'),
    )
    expect(hasPValue, `Expected a <dt> with p-value. Got: ${dtTexts.join(', ')}`).toBe(true)

    // Sample size visible as "N = 134"
    const bodyText = await page.locator('body').textContent()
    expect(bodyText).toContain('134')
  })

  test('evidence chain renders inline SVG range-bar with aria-label containing β', async ({
    page,
  }) => {
    await page.goto('/apps/abrigo/iterations/pair-d/v1')

    // BetaCIChart renders <svg role="img" aria-label="β = ...">
    const svg = page.locator('svg[role="img"]').first()
    await expect(svg).toBeVisible()

    const ariaLabel = await svg.getAttribute('aria-label')
    expect(ariaLabel).toMatch(/β/)
  })

  test('evidence chain SVG has sr-only data table for screen readers', async ({ page }) => {
    await page.goto('/apps/abrigo/iterations/pair-d/v1')

    // BetaCIChart renders a <table class="sr-only"> with β, CI lower, CI upper rows
    const srTable = page.locator('table.sr-only')
    await expect(srTable).toBeAttached()
  })

  test('replication verify <details> element is present on iteration with replication_hash', async ({
    page,
  }) => {
    // pair-d has a replication_hash in its MDX frontmatter
    await page.goto('/apps/abrigo/iterations/pair-d/v1')

    // The page renders a <details> with "How to verify" / "Cómo verificar" summary
    const details = page.locator('details')
    await expect(details).toBeVisible()

    const summaryText = await page.locator('details summary').first().textContent()
    expect(summaryText).toMatch(/verify|verificar/i)
  })
})
