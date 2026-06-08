// Phase 3 — DASH-04 e2e: chain selector writes ?chain= URL param and URL restores state (filled by Plan 03-02)
import { expect, test } from '@playwright/test'

test.describe('DASH-04 — chain selector URL state', () => {
  test('selecting a chain updates the ?chain= URL param', async ({ page }) => {
    await page.goto('/apps/abrigo/dashboard')

    // Change the chain selector to 'base'
    await page.selectOption('#chain-selector', 'base')

    // URL must now contain ?chain=base
    await expect(page).toHaveURL(/[?&]chain=base/)
  })

  test('navigating directly with ?chain= restores the selected chain in the selector', async ({
    page,
  }) => {
    // Paste URL with ?chain=arbitrum — the selector must reflect that state
    await page.goto('/apps/abrigo/dashboard?chain=arbitrum')
    const selectedValue = await page.inputValue('#chain-selector')
    expect(selectedValue).toBe('arbitrum')
  })

  test('URL chain param persists after page reload', async ({ page }) => {
    await page.goto('/apps/abrigo/dashboard')
    await page.selectOption('#chain-selector', 'optimism')
    await expect(page).toHaveURL(/[?&]chain=optimism/)

    // Reload — selector must still show 'optimism'
    await page.reload()
    const selectedValue = await page.inputValue('#chain-selector')
    expect(selectedValue).toBe('optimism')
  })
})
