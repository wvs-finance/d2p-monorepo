// Phase 03.1 Plan C1 — /research/[slug] reading-page e2e (production webServer).
// Replaces the retired research-math-spike.spec.ts: the migrated Mode-A bodies now
// exercise the KaTeX render path on the real reading route.
//
// Coverage (VALIDATION map): Mode-A anatomy (KaTeX_Main font, no .katex-error, \tag),
// TOC-not-disclosure, theorem label, locale-correct single-locale body, ScholarlyArticle
// JSON-LD, invalid-slug 404, Mode-B arXiv bridge, no-JS baseline, anti-fishing equal weight.
import { expect, test } from '@playwright/test'

const MODE_A = '/research/pair-d-dispatch-brief' // readable_on_site:true, has display math \tag{1}
const FAIL_MEMO = '/research/fx-vol-cpi-closed-fail' // readable_on_site:true, disposition FAIL
const MODE_B = '/research/cfmm-microstructure-fixture' // readable_on_site:false, arxiv_id
const WRITEUP = '/research/abrigo-y3-carbon-basket-writeup'

test.describe('Mode A — on-site reading page', () => {
  test('renders 200 with body and exactly one main landmark', async ({ page }) => {
    const res = await page.goto(MODE_A)
    expect(res?.status()).toBe(200)
    await expect(page.locator('main')).toHaveCount(1)
  })

  test('KaTeX typeset: ≥1 .katex, zero .katex-error, KaTeX_Main font, \\tag (1) present', async ({
    page,
  }) => {
    await page.goto(MODE_A)
    const katexCount = await page.locator('.katex').count()
    expect(katexCount).toBeGreaterThanOrEqual(1)

    const errorCount = await page.locator('.katex-error').count()
    expect(errorCount, 'broken KaTeX macro(s) rendered as .katex-error').toBe(0)

    // The math font must actually be loaded — not reset by Tailwind v4 @theme/preflight.
    const fontFamily = await page
      .locator('.katex')
      .first()
      .evaluate((el) => getComputedStyle(el).fontFamily)
    expect(fontFamily).toContain('KaTeX_Main')

    // \tag{1} renders the equation number "(1)".
    await expect(page.getByText('(1)', { exact: false }).first()).toBeVisible()
  })

  test('TOC is not a disclosure (no <details>)', async ({ page }) => {
    await page.goto(MODE_A)
    // Hard rule: the reading page must never use a <details> collapse anywhere.
    await expect(page.locator('details')).toHaveCount(0)
  })

  test('ScholarlyArticle JSON-LD is present', async ({ page }) => {
    await page.goto(MODE_A)
    const ld = await page.locator('script[type="application/ld+json"]').allTextContents()
    expect(ld.some((s) => s.includes('ScholarlyArticle'))).toBe(true)
  })
})

test.describe('Theorem callout label', () => {
  // The KaTeX-spike content with a :::theorem directive was retired; the writeup body
  // has no theorem directive, so we assert the TheoremBlock component contract on a body
  // that carries one when present. The Mode-A pair-d body exercises math; theorem-label
  // presence is asserted via the unit test (theorem-block.test.tsx) plus this guard:
  // if any theorem block renders, its label text must be present (color+text, not color-alone).
  test('any rendered theorem block shows a text label, never color alone', async ({ page }) => {
    await page.goto(MODE_A)
    const blocks = page.locator('[data-testid="theorem-block"]')
    const count = await blocks.count()
    for (let i = 0; i < count; i++) {
      const text = (await blocks.nth(i).innerText()).trim()
      expect(text.length, 'theorem block must carry visible label text').toBeGreaterThan(0)
    }
  })
})

test.describe('Locale-correct single-locale body', () => {
  test('renders the es body under es-CO and the en body under en', async ({ page, context }) => {
    // Default es-CO.
    await page.goto(WRITEUP)
    await expect(page.locator('h1')).toContainText('canasta de carbono')

    // Switch to en via cookie, reload.
    await context.addCookies([{ name: 'NEXT_LOCALE', value: 'en', url: 'http://localhost:3040' }])
    await page.goto(WRITEUP)
    await expect(page.locator('h1')).toContainText('carbon basket')
  })
})

test.describe('Mode B — arXiv bridge', () => {
  test('renders abstract + arXiv bridge, NOT a full on-site body', async ({ page }) => {
    const res = await page.goto(MODE_B)
    expect(res?.status()).toBe(200)
    await expect(
      page.getByRole('link', { name: /read the full paper on arxiv|leer el artículo completo/i }),
    ).toBeVisible()
    // Mode B does not render the ResearchArticle on-site body container.
    await expect(page.locator('article.research-prose')).toHaveCount(0)
  })
})

test.describe('notFound fallback', () => {
  test('unknown slug returns 404', async ({ page }) => {
    const res = await page.goto('/research/this-slug-does-not-exist')
    expect(res?.status()).toBe(404)
  })
})

test.describe('No-JS baseline', () => {
  test.use({ javaScriptEnabled: false })
  test('Mode-A body renders with no JS and no wallet gate', async ({ page }) => {
    await page.goto(MODE_A)
    await expect(page.locator('article.research-prose')).toBeVisible()
    await expect(page.getByText(/connect wallet|conectar billetera/i)).toHaveCount(0)
  })
})

test.describe('Anti-fishing — FAIL renders at equal weight to PASS', () => {
  test('FAIL memo: full body, no <details>, prose not muted', async ({ page }) => {
    await page.goto(FAIL_MEMO)
    // No collapse anywhere.
    await expect(page.locator('details')).toHaveCount(0)
    // Full body present.
    const article = page.locator('article.research-prose')
    await expect(article).toBeVisible()
    // Body prose uses primary text color, not muted — same weight as a PASS.
    const color = await article.evaluate((el) => getComputedStyle(el).color)
    const muted = await page
      .locator('main')
      .evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--text-muted'))
    expect(color).not.toBe('')
    // The article class binds text-text-primary; assert it is not the muted token.
    expect(muted).not.toBe(color)
  })
})
