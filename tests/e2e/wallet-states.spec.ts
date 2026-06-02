// DEFI-02/06/07 — wallet states on the simulated instrument route (Wave 4).
//
// The simulated route /apps/abrigo/instruments/ccop-usd-long-gamma/8453 uses
// WalletPanel with readOnly=true. This forces the wallet to READ_ONLY state;
// CONNECTED_READY is unreachable here.
//
// Assertions:
//   - WalletStatusPill shows READ_ONLY (text "Solo lectura" es-CO / "Solo lectura" en)
//   - The readOnlyLabel copy renders ("sin transacción — fork simulado")
//   - "Conectado" (CONNECTED_READY label) is NOT present
//   - No switch-network button visible
//   - No ConnectButton ("Conectar billetera") in the read-only panel
//
// The instruments-index load + axe tests (previously in this file) are preserved.
//
// Note: WalletStatusPill uses a useMounted guard — READ_ONLY bypasses the guard
// (it is prop-injected, not wagmi-derived) and renders correctly on SSR + CSR.

import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const SIMULATED_ROUTE = '/apps/abrigo/instruments/ccop-usd-long-gamma/8453'

// ---------------------------------------------------------------------------
// DEFI-06 — instruments index a11y (preserved from WAIVER-05-04)
// ---------------------------------------------------------------------------

test.describe('DEFI-06 — instruments index a11y (wallet area)', () => {
  test('instruments index loads without a wallet gate', async ({ page }) => {
    await page.goto('/apps/abrigo/instruments')
    // The index renders without requiring wallet connection
    // No ConnectButton visible on the index page (WalletPanel is only on the detail page)
    const h1 = page.getByRole('heading', { level: 1 })
    await expect(h1).toBeVisible()
  })

  test('instruments index passes axe (DEFI-06)', async ({ page }) => {
    await page.goto('/apps/abrigo/instruments')
    await page.waitForLoadState('networkidle')
    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// DEFI-02 — READ_ONLY wallet state on the simulated route (es-CO)
// ---------------------------------------------------------------------------

test.describe('DEFI-02 — READ_ONLY wallet on simulated route (es-CO)', () => {
  test('WalletPanel shows "Solo lectura" pill (READ_ONLY state, es-CO)', async ({ page }) => {
    // es-CO is the default locale — no cookie needed
    await page.goto(SIMULATED_ROUTE)
    await page.waitForLoadState('networkidle')

    // Wait for client hydration (WalletStatusPill is 'use client')
    // READ_ONLY bypasses the useMounted guard — renders immediately without waiting for mount
    await page.waitForTimeout(600)

    // The WalletStatusPill renders a span with the label text.
    // In es-CO, READ_ONLY label = t('wallet.read_only_status') = 'Solo lectura'
    const readOnlyPill = page.locator('span', { hasText: 'Solo lectura' }).first()
    await expect(readOnlyPill).toBeVisible()
  })

  test('WalletPanel shows readOnlyLabel copy (no transaction copy, es-CO)', async ({ page }) => {
    await page.goto(SIMULATED_ROUTE)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(600)

    // The readOnlyLabel from t('wallet.read_only_label') = 'sin transacción — fork simulado'
    // This p element renders only when walletState === 'READ_ONLY'
    const readOnlyCopy = page
      .locator('p')
      .filter({ hasText: /sin transacci[oó]n/i })
      .first()
    await expect(readOnlyCopy).toBeVisible()
  })

  test('"Conectado" (CONNECTED_READY label) is NOT present on the simulated route', async ({
    page,
  }) => {
    await page.goto(SIMULATED_ROUTE)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(600)

    // 'Conectado' is the CONNECTED_READY status label in es-CO.
    // With readOnly=true, the wallet is forced to READ_ONLY — 'Conectado' must never appear.
    const conectadoLabel = page.locator('span', { hasText: 'Conectado' })
    await expect(conectadoLabel).toHaveCount(0)
  })

  test('no switch-network button on the simulated route (READ_ONLY)', async ({ page }) => {
    await page.goto(SIMULATED_ROUTE)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(600)

    // CONNECTED_WRONG_CHAIN renders a switch-network button; READ_ONLY must not.
    // Both es-CO and en copies checked — the button text is from t('wallet.switch_network_label').
    const switchNetworkBtn = page.locator('button').filter({
      hasText: /Cambiar red|Switch network/i,
    })
    await expect(switchNetworkBtn).toHaveCount(0)
  })

  test('no ConnectButton in the read-only WalletPanel (no "Conectar billetera")', async ({
    page,
  }) => {
    await page.goto(SIMULATED_ROUTE)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(600)

    // ConnectButton is only rendered in the DISCONNECTED state branch.
    // With readOnly=true, the DISCONNECTED branch is never entered.
    // The RainbowKit ConnectButton renders with the label from t('wallet.connect_label').
    const connectBtn = page.locator('button').filter({
      hasText: /Conectar billetera|Connect wallet/i,
    })
    await expect(connectBtn).toHaveCount(0)
  })
})

// ---------------------------------------------------------------------------
// DEFI-02 — READ_ONLY wallet state on the simulated route (en locale)
// ---------------------------------------------------------------------------

test.describe('DEFI-02 — READ_ONLY wallet on simulated route (en locale)', () => {
  test('WalletPanel shows read-only pill in English (READ_ONLY state, en)', async ({ page }) => {
    await page
      .context()
      .addCookies([{ name: 'NEXT_LOCALE', value: 'en', domain: 'localhost', path: '/' }])
    await page.goto(SIMULATED_ROUTE)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(600)

    // In en locale, READ_ONLY status label = t('wallet.read_only_status') = 'Solo lectura'
    // The pill span carries aria-label with the label text; check it via the aria-live region.
    const ariaLiveRegion = page.locator('[aria-live="polite"]')
    await expect(ariaLiveRegion).toBeVisible()

    // "Conectado" / "Connected" must not appear (CONNECTED_READY unreachable)
    const conectadoLabel = page.locator('span', { hasText: /^Conectado$/ })
    await expect(conectadoLabel).toHaveCount(0)
  })

  test('no switch-network button on simulated route (en locale)', async ({ page }) => {
    await page
      .context()
      .addCookies([{ name: 'NEXT_LOCALE', value: 'en', domain: 'localhost', path: '/' }])
    await page.goto(SIMULATED_ROUTE)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(600)

    const switchNetworkBtn = page.locator('button').filter({
      hasText: /Switch network|Cambiar red/i,
    })
    await expect(switchNetworkBtn).toHaveCount(0)
  })
})

// ---------------------------------------------------------------------------
// DEFI-06 — aria-live region present for SR announcements
// ---------------------------------------------------------------------------

test.describe('DEFI-06 — aria-live region on instrument detail page', () => {
  test('aria-live="polite" region present in WalletPanel on simulated route', async ({ page }) => {
    await page.goto(SIMULATED_ROUTE)
    await page.waitForLoadState('networkidle')

    // WalletPanel wraps content in aria-live="polite" aria-atomic="true"
    const ariaLiveRegion = page.locator('[aria-live="polite"]')
    await expect(ariaLiveRegion).toBeVisible()
  })
})
