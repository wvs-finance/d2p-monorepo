// Phase 03.1 Plan A — KaTeX render-path e2e spike
// GATING: this spec must PASS (production build) before Plans B and C begin.
//
// What is proved:
//   1. The /research/spike route returns HTTP 200 (routing and SSR work)
//   2. A .katex node is present in the DOM (KaTeX rendered at build time via s.mdx())
//   3. NO .katex-error nodes (burn-class guard: throwOnError:false + ignoreBuildErrors
//      can silently hide bad macros — this assertion is the safety net)
//   4. The \tag{1} equation number "(1)" appears in the rendered DOM
//   5. The TheoremBlock stub renders (data-testid="theorem-block") — proves the
//      components-prop injection path works under the production build
//
// Run: pnpm exec playwright test tests/e2e/research-math-spike.spec.ts
import { expect, test } from '@playwright/test'

test.describe('KaTeX render-path spike (/research/spike)', () => {
  test('route returns 200', async ({ page }) => {
    const response = await page.goto('/research/spike')
    expect(response?.status()).toBe(200)
  })

  test('at least one .katex node is present (KaTeX rendered)', async ({ page }) => {
    await page.goto('/research/spike')
    const katexNodes = page.locator('.katex')
    await expect(katexNodes.first()).toBeVisible()
    const count = await katexNodes.count()
    expect(count).toBeGreaterThanOrEqual(1)
  })

  test('BURN-CLASS GUARD: zero .katex-error nodes', async ({ page }) => {
    // This is the most important assertion in this file.
    // throwOnError:false causes bad KaTeX macros to silently render as visible
    // source text wrapped in .katex-error. If this count is > 0, a macro in the
    // fixture is broken and must be fixed before downstream plans proceed.
    await page.goto('/research/spike')
    const katexErrors = page.locator('.katex-error')
    const count = await katexErrors.count()
    expect(count, 'Expected zero .katex-error nodes — found broken KaTeX macro(s)').toBe(0)
  })

  test('\\tag{1} equation number "(1)" is present in the rendered DOM', async ({ page }) => {
    await page.goto('/research/spike')
    // KaTeX renders \tag{1} as visible text "(1)" in the equation.
    // We look for it anywhere in the page body — it may be in a .katex-tag span.
    const tagText = page.getByText('(1)', { exact: false })
    await expect(tagText.first()).toBeVisible()
  })

  test('TheoremBlock stub renders (custom-component injection path)', async ({ page }) => {
    // The ::theorem directive in the spike fixture is mapped to TheoremBlock
    // via the remarkTheoremDirective plugin + the components prop passed to MDXRenderer.
    // The stub emits data-testid="theorem-block". If this fails, the components-prop
    // injection path is broken and Plan C's component map will not work.
    await page.goto('/research/spike')
    const theoremBlock = page.locator('[data-testid="theorem-block"]')
    await expect(theoremBlock.first()).toBeVisible()
  })
})
