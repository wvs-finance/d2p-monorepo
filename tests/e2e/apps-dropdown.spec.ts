import { expect, test } from '@playwright/test'

// Test 1: Apps dropdown opens and lists Abrigo with active status badge
test('apps dropdown opens and lists Abrigo with active status badge', async ({ page }) => {
  await page.goto('/')
  // Find the Apps dropdown trigger (text varies by locale — default is es-CO: "Aplicaciones")
  const trigger = page.getByRole('button', { name: /aplicaciones|apps/i })
  await expect(trigger).toBeVisible()
  await trigger.click()
  // Menu should appear — use waitFor to handle React state update timing
  const menu = page.getByRole('menu')
  await menu.waitFor({ state: 'visible', timeout: 5000 })
  // Two menuitems per app entry: primary link + external link (both role="menuitem")
  const items = page.getByRole('menuitem')
  await expect(items).toHaveCount(2)
  // Abrigo listed in the dropdown — scope to the menu and take the first match
  // ("Abrigo" now resolves to multiple nodes: primary link + external link).
  await expect(menu.getByText('Abrigo').first()).toBeVisible()
  // Status pill present (Active / Activa) — scope to the menu
  await expect(menu.getByText(/active|activa/i).first()).toBeVisible()
})

// Test 2: Apps dropdown primary link navigates to /apps/abrigo
test('apps dropdown primary link navigates to /apps/abrigo', async ({ page }) => {
  await page.goto('/')
  const trigger = page.getByRole('button', { name: /aplicaciones|apps/i })
  await trigger.click()
  // Wait for menu to appear (first time click)
  const menu = page.getByRole('menu')
  await menu.waitFor({ state: 'visible', timeout: 3000 })
  // Click on the Abrigo menuitem link
  await page.getByRole('menuitem').first().click()
  await expect(page).toHaveURL('/apps/abrigo')
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/abrigo/i)
})

// Test 3: Apps dropdown secondary external link points to @d2pfinabrigo
test('apps dropdown secondary external link points to d2pfinabrigo', async ({ page }) => {
  await page.goto('/')
  const trigger = page.getByRole('button', { name: /aplicaciones|apps/i })
  await trigger.click()
  await expect(page.getByRole('menu')).toBeVisible()
  // External link has role="menuitem" (required by aria-required-children), identified by aria-label
  const externalLink = page.getByRole('menuitem', { name: /nueva pestaña|new tab/i })
  await expect(externalLink).toBeVisible()
  await expect(externalLink).toHaveAttribute('href', 'https://x.com/d2pfinabrigo')
  await expect(externalLink).toHaveAttribute('target', '_blank')
})

// Test 4: Apps dropdown is keyboard navigable
test('apps dropdown is keyboard navigable', async ({ page }) => {
  await page.goto('/')
  // Tab to the Apps dropdown trigger — wait for visibility before focusing
  const trigger = page.getByRole('button', { name: /aplicaciones|apps/i })
  await trigger.waitFor({ state: 'visible', timeout: 5000 })
  await trigger.focus()
  await page.keyboard.press('Enter')
  // Menu should open
  await expect(page.getByRole('menu')).toBeVisible()
  // ArrowDown focuses first menuitem
  await page.keyboard.press('ArrowDown')
  // Escape closes the menu
  await page.keyboard.press('Escape')
  await expect(page.getByRole('menu')).not.toBeVisible()
  // Trigger should have focus after Escape
  await expect(trigger).toBeFocused()
})

// Test 5: Apps dropdown closes on outside click
test('apps dropdown closes on outside click', async ({ page }) => {
  await page.goto('/')
  const trigger = page.getByRole('button', { name: /aplicaciones|apps/i })
  await trigger.click()
  const menu = page.getByRole('menu')
  await menu.waitFor({ state: 'visible', timeout: 5000 })
  // Click outside the menu
  await page.locator('body').click({ position: { x: 5, y: 500 } })
  await expect(page.getByRole('menu')).not.toBeVisible()
})

// Test 6: Mobile drawer contains Apps section
test('mobile drawer contains Apps section', async ({ browser }) => {
  // Create a mobile context to ensure CSS breakpoints respond correctly
  const mobileContext = await browser.newContext({ viewport: { width: 360, height: 800 } })
  const page = await mobileContext.newPage()
  await page.goto('/')
  // Hamburger button should be visible on mobile (md:hidden hides it on desktop)
  const hamburger = page.getByRole('button', { name: /abrir menú|open menu/i })
  await hamburger.waitFor({ state: 'visible', timeout: 5000 })
  await hamburger.click()
  // Navigation menu dialog should appear after click
  const dialog = page.locator('dialog')
  await dialog.waitFor({ state: 'attached', timeout: 5000 })
  await expect(dialog).toBeVisible()
  // Apps section should be present inside the drawer
  const appsButton = dialog.getByRole('button', { name: /aplicaciones|apps/i })
  await expect(appsButton).toBeVisible()
  await mobileContext.close()
})
