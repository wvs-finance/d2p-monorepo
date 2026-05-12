// Plan 02-05 — Filled by plan 02-05 (was wave-0 stub from 02-01).
// Covers requirement: ITER-02 — epistemic equality (all status cards identical height)
import { expect, test } from '@playwright/test'

test.describe('phase-2 - ITER-02 — iteration catalog equal-weight visual', () => {
  test('PASS / FAIL / PARKED / IN_PROGRESS cards share identical bounding-box height', async ({
    page,
  }) => {
    await page.goto('/apps/abrigo/iterations')
    await page.waitForSelector('[data-testid="iteration-catalog-card"]')

    const cards = await page.locator('[data-testid="iteration-catalog-card"]').all()
    expect(cards.length).toBe(4)

    const heights = await Promise.all(cards.map(async (c) => (await c.boundingBox())?.height))
    const roundedHeights = heights.map((h) => Math.round(h ?? 0))

    // ITER-02: all cards must have identical height (within 1px rounding tolerance)
    const distinctHeights = new Set(roundedHeights)
    expect(
      distinctHeights.size,
      `Expected all 4 iteration cards to have identical height. Got heights: ${roundedHeights.join(', ')}`,
    ).toBe(1)
  })

  test('all iteration catalog cards have identical class strings (no size-affecting token difference)', async ({
    page,
  }) => {
    await page.goto('/apps/abrigo/iterations')
    await page.waitForSelector('[data-testid="iteration-catalog-card"]')

    const cards = await page.locator('[data-testid="iteration-catalog-card"] a').all()
    expect(cards.length).toBe(4)

    const classStrings = await Promise.all(cards.map((c) => c.getAttribute('class')))

    // All cards should have identical class strings (same min-h, padding, etc.)
    const uniqueClasses = new Set(classStrings)
    expect(
      uniqueClasses.size,
      `Expected all 4 cards to have identical class strings. Got: ${[...uniqueClasses].join(' | ')}`,
    ).toBe(1)
  })
})
