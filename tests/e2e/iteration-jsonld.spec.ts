// Plan 02-06 — Filled by plan 02-06.
// Covers requirement(s): ITER-09
import { expect, test } from '@playwright/test'

async function getJsonLdBlocks(page: import('@playwright/test').Page): Promise<unknown[]> {
  const scripts = await page.locator('script[type="application/ld+json"]').all()
  const parsed: unknown[] = []
  for (const script of scripts) {
    const content = await script.textContent()
    if (content) {
      parsed.push(JSON.parse(content))
    }
  }
  return parsed
}

test.describe('phase-2 - ITER-09 — iteration JSON-LD structured data', () => {
  test('pair-d/v1 emits ≥ 2 JSON-LD blocks: Dataset + ScholarlyArticle', async ({ page }) => {
    await page.goto('/apps/abrigo/iterations/pair-d/v1')
    const scripts = await page.locator('script[type="application/ld+json"]').all()
    expect(scripts.length).toBeGreaterThanOrEqual(2)
  })

  test('pair-d/v1 JSON-LD Dataset block has valid JSON and required fields', async ({ page }) => {
    await page.goto('/apps/abrigo/iterations/pair-d/v1')
    const blocks = await getJsonLdBlocks(page)

    const dataset = blocks.find(
      (b) =>
        typeof b === 'object' &&
        b !== null &&
        (b as Record<string, unknown>)['@type'] === 'Dataset',
    ) as Record<string, unknown> | undefined

    expect(dataset, 'Expected a Dataset JSON-LD block').toBeDefined()
    expect(dataset?.['@context']).toBe('https://schema.org')
    expect(typeof dataset?.name).toBe('string')
    expect(typeof dataset?.description).toBe('string')
    expect(typeof dataset?.url).toBe('string')
    expect(Array.isArray(dataset?.isPartOf), 'Dataset isPartOf should be an array').toBe(true)
    expect((dataset?.isPartOf as unknown[]).length).toBe(2)
  })

  test('pair-d/v1 JSON-LD ScholarlyArticle block has valid JSON and required fields', async ({
    page,
  }) => {
    await page.goto('/apps/abrigo/iterations/pair-d/v1')
    const blocks = await getJsonLdBlocks(page)

    const article = blocks.find(
      (b) =>
        typeof b === 'object' &&
        b !== null &&
        (b as Record<string, unknown>)['@type'] === 'ScholarlyArticle',
    ) as Record<string, unknown> | undefined

    expect(article, 'Expected a ScholarlyArticle JSON-LD block').toBeDefined()
    expect(article?.['@context']).toBe('https://schema.org')
    expect(typeof article?.headline).toBe('string')
    expect(typeof article?.datePublished).toBe('string')

    const isPartOf = article?.isPartOf as Record<string, unknown> | undefined
    expect(isPartOf?.['@type']).toBe('Periodical')
    expect(typeof isPartOf?.name).toBe('string')
  })

  test('fx-vol-on-cpi-surprise/v1 emits ≥ 2 JSON-LD blocks', async ({ page }) => {
    await page.goto('/apps/abrigo/iterations/fx-vol-on-cpi-surprise/v1')
    const scripts = await page.locator('script[type="application/ld+json"]').all()
    expect(scripts.length).toBeGreaterThanOrEqual(2)
  })

  test('fx-vol-on-cpi-surprise/v1 JSON-LD Dataset has isPartOf array with 2 entries', async ({
    page,
  }) => {
    await page.goto('/apps/abrigo/iterations/fx-vol-on-cpi-surprise/v1')
    const blocks = await getJsonLdBlocks(page)

    const dataset = blocks.find(
      (b) =>
        typeof b === 'object' &&
        b !== null &&
        (b as Record<string, unknown>)['@type'] === 'Dataset',
    ) as Record<string, unknown> | undefined

    expect(dataset).toBeDefined()
    expect(Array.isArray(dataset?.isPartOf)).toBe(true)
    expect((dataset?.isPartOf as unknown[]).length).toBe(2)
  })

  test('all emitted JSON-LD blocks on pair-d/v1 parse without syntax errors', async ({ page }) => {
    await page.goto('/apps/abrigo/iterations/pair-d/v1')
    // getJsonLdBlocks already throws on JSON.parse failure — this test confirms that
    const blocks = await getJsonLdBlocks(page)
    expect(blocks.length).toBeGreaterThanOrEqual(2)
  })

  test('JSON-LD canonical URL uses iteration slug and version', async ({ page }) => {
    await page.goto('/apps/abrigo/iterations/pair-d/v1')
    const blocks = await getJsonLdBlocks(page)

    const dataset = blocks.find(
      (b) =>
        typeof b === 'object' &&
        b !== null &&
        (b as Record<string, unknown>)['@type'] === 'Dataset',
    ) as Record<string, unknown> | undefined

    expect(dataset?.url).toMatch(/pair-d/)
    expect(dataset?.url).toMatch(/v1/)
  })
})
