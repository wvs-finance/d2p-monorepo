import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

// A11y scan 1: homepage with dropdown CLOSED
test('homepage has no WCAG violations with apps dropdown closed', async ({ page }) => {
  await page.goto('/')
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze()
  expect(results.violations).toEqual([])
})

// A11y scan 2: homepage with dropdown OPEN
test('homepage has no WCAG violations with apps dropdown open', async ({ page }) => {
  await page.goto('/')
  const trigger = page.getByRole('button', { name: /aplicaciones|apps/i })
  await trigger.click()
  await expect(page.getByRole('menu')).toBeVisible()
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze()
  expect(results.violations).toEqual([])
})

// A11y scan 3: /apps index page
test('/apps page has no WCAG violations', async ({ page }) => {
  await page.goto('/apps')
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze()
  expect(results.violations).toEqual([])
})

// A11y scan 4: /apps/abrigo overview page
test('/apps/abrigo page has no WCAG violations', async ({ page }) => {
  await page.goto('/apps/abrigo')
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze()
  expect(results.violations).toEqual([])
})
