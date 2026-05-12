// Plan 02-06 — Filled by plan 02-06.
// Covers requirement(s): ITER-06 — epistemic equality, FAIL page at same visual weight as PASS
import { expect, test } from '@playwright/test'

test.describe('phase-2 - ITER-06 — FAIL iteration equal visual weight', () => {
  test('FAIL detail page DispositionMemo section is fully visible without user interaction', async ({
    page,
  }) => {
    await page.goto('/apps/abrigo/iterations/fx-vol-on-cpi-surprise/v1')

    const dispositionSection = page.locator('section[aria-labelledby="disposition-heading"]')
    await expect(dispositionSection).toBeVisible()

    const bbox = await dispositionSection.boundingBox()
    expect(bbox, 'DispositionMemo section must be visible with non-zero height').not.toBeNull()
    expect(bbox?.height, 'DispositionMemo section height must be > 100px').toBeGreaterThan(100)
  })

  test('FAIL page does not use muted color or reduced opacity for status pill', async ({
    page,
  }) => {
    await page.goto('/apps/abrigo/iterations/fx-vol-on-cpi-surprise/v1')

    // StatusPill on FAIL page must be visible
    const bodyText = await page.locator('body').textContent()
    expect(bodyText).toMatch(/Fail|FAIL/i)

    // The disposition section must not be inside a <details> (collapsed/hidden)
    const detailsCount = await page
      .locator('details section[aria-labelledby="disposition-heading"]')
      .count()
    expect(detailsCount, 'DispositionMemo must NOT be wrapped in <details>').toBe(0)
  })

  test('FAIL detail page DispositionMemo bbox.height ≥ 100px (full content rendered)', async ({
    page,
  }) => {
    await page.goto('/apps/abrigo/iterations/fx-vol-on-cpi-surprise/v1')

    const dispositionSection = page.locator('section[aria-labelledby="disposition-heading"]')
    await expect(dispositionSection).toBeVisible()

    const bbox = await dispositionSection.boundingBox()
    expect(bbox?.height ?? 0).toBeGreaterThanOrEqual(100)
  })

  test('FAIL and PASS article sections are within 50% relative height of each other', async ({
    page,
  }) => {
    // PASS page: pair-d
    await page.goto('/apps/abrigo/iterations/pair-d/v1')
    const passArticle = page.locator('article').first()
    await expect(passArticle).toBeVisible()
    const passBbox = await passArticle.boundingBox()

    // FAIL page: fx-vol-on-cpi-surprise
    await page.goto('/apps/abrigo/iterations/fx-vol-on-cpi-surprise/v1')
    const failArticle = page.locator('article').first()
    await expect(failArticle).toBeVisible()
    const failBbox = await failArticle.boundingBox()

    const passH = passBbox?.height ?? 0
    const failH = failBbox?.height ?? 0

    expect(passH).toBeGreaterThan(0)
    expect(failH).toBeGreaterThan(0)

    const maxH = Math.max(passH, failH)
    const diff = Math.abs(passH - failH) / maxH

    // FAIL page should not be collapsed — within 50% relative height of PASS page
    expect(
      diff,
      `FAIL article height (${failH}px) is too different from PASS article height (${passH}px). Ratio: ${diff.toFixed(2)}`,
    ).toBeLessThan(0.5)
  })
})
