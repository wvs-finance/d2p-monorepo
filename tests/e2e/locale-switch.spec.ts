import { expect, test } from '@playwright/test'

test('language switcher persists locale across reload via cookie', async ({ page, context }) => {
  await page.goto('/')
  // Default locale per Accept-Language fallback should be es-CO (primary).
  await expect(page.locator('html')).toHaveAttribute('lang', 'es-CO')

  // Switch to English by clicking the button whose accessible name is "English".
  await page.getByRole('button', { name: 'English' }).click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')

  // Verify cookie set.
  const cookies = await context.cookies()
  expect(cookies.find((c) => c.name === 'NEXT_LOCALE')?.value).toBe('en')

  // Reload — locale persists.
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')

  // Switch back to es-CO via the "Español" button (accessible name now includes "Español (Colombia)").
  await page.getByRole('button', { name: /Español/ }).click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'es-CO')
})

test('language switcher is keyboard-navigable', async ({ page }) => {
  await page.goto('/')
  // Default locale es-CO disables the Español button; the first focusable switcher
  // control is therefore the "English" button.
  const englishButton = page.getByRole('button', { name: 'English' })
  await englishButton.focus()
  await expect(englishButton).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
})
