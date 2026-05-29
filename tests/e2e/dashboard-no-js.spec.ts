// Phase 3 — DASH-07 e2e: no-JS first paint shows skeleton tiles + banner (filled by Plan 03-02)
// RSC renders meaningful content on first paint with javaScriptEnabled:false
import { expect, test } from '@playwright/test'

// All tests in this file run with JavaScript disabled — testing the RSC-first paint
test.use({ javaScriptEnabled: false })

test.describe('DASH-07 — no-JS first paint (RSC)', () => {
  test('dashboard page returns 200 with JS disabled', async ({ page }) => {
    const response = await page.goto('/apps/abrigo/dashboard')
    expect(response?.status()).toBe(200)
  })

  test('live banner is present on first paint without hydration', async ({ page }) => {
    await page.goto('/apps/abrigo/dashboard')
    await expect(
      page.getByText(/En vivo una vez se desplieguen los contratos|Live once contracts deploy/),
    ).toBeVisible()
  })

  test('4 metric tile labels are visible on first paint without hydration', async ({ page }) => {
    await page.goto('/apps/abrigo/dashboard')
    await expect(page.getByText(/Saldo del fondo|Pool balance/)).toBeVisible()
    await expect(page.getByText(/Eventos de liquidación|Settlement events/)).toBeVisible()
    await expect(page.getByText(/Posiciones LP|LP positions/)).toBeVisible()
    await expect(page.getByText(/Último bloque sincronizado|Last block synced/)).toBeVisible()
  })

  test('no wallet connection prompt is visible (read-first, no wallet gate)', async ({ page }) => {
    await page.goto('/apps/abrigo/dashboard')
    // No wallet-connect button or modal must be present (DASH-07: no wallet on this route)
    const walletButton = page.getByText(/Connect Wallet|Conectar billetera|Connect wallet/i)
    await expect(walletButton).not.toBeVisible()
  })
})
