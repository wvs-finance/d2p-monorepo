import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

// axe-core WCAG 2.2 AA scans against live preview URL (or local dev server).
// Run with: pnpm playwright test tests/a11y/ --project=axe
// In CI: triggered on deployment_status event against the Vercel preview URL
// (set via PLAYWRIGHT_TEST_BASE_URL env var).

test('homepage has no WCAG 2.2 AA violations', async ({ page }) => {
  await page.goto('/')
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze()
  expect(results.violations).toEqual([])
})

test('homepage in en locale has no WCAG 2.2 AA violations', async ({ page, context }) => {
  await context.addCookies([{ name: 'NEXT_LOCALE', value: 'en', url: 'http://localhost:3000' }])
  await page.goto('/')
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze()
  expect(results.violations).toEqual([])
})

test('/apps index has no WCAG 2.2 AA violations', async ({ page }) => {
  await page.goto('/apps')
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze()
  expect(results.violations).toEqual([])
})

test('/apps/abrigo has no WCAG 2.2 AA violations', async ({ page }) => {
  await page.goto('/apps/abrigo')
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze()
  expect(results.violations).toEqual([])
})
