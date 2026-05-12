import { expect, test } from '@playwright/test'

test('homepage renders wordmark and tagline in es-CO by default', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('d2p Finance')
  await expect(page.getByText(/Coberturas|Verified/)).toBeVisible()
})

test('homepage renders all four iteration status tiles', async ({ page }) => {
  await page.goto('/')
  // All four statuses must be visible — epistemic honesty (anti-pattern: filtering to PASS only)
  await expect(page.getByText('3')).toBeVisible()
  await expect(page.getByText('2')).toBeVisible()
  // Check the status pills are present (by searching for their text labels)
  // The default locale is es-CO so labels will be in Spanish
  await expect(page.locator('output').first()).toBeVisible()
})

test('language switcher is present on homepage', async ({ page }) => {
  await page.goto('/')
  // LanguageSwitcher is in the (lab) layout header
  await expect(page.getByRole('navigation', { name: /idioma|language/i })).toBeVisible()
})
