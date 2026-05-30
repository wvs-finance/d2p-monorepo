// DEFI-03/05 — per-instrument page (filled by plan 05-04).
//
// Strategy for pre-deploy state (WAIVER-05-04):
//   The public ABRIGO_INSTRUMENTS registry is empty. The detail page notFound()s for
//   every id. Real assertions against the page require a fixture instrument.
//
// What we CAN assert from a production build today:
//   - The NOT_FOUND boundary works correctly (404 response)
//   - The 404 page does not expose a wallet gate
//   - The instruments INDEX page loads (instruments-index.spec.ts covers this fully)
//
// What requires a fixture instrument (WAIVER-05-04, driven by Evidence Collector Task 3):
//   - RiskCallout above fold at 360px (DEFI-05 scrollY===0 proof)
//   - params/payoff/pool render with no wallet gate (DEFI-03)
//   - PayoffDiagram curve tokens
//   - PoolStatePanel em-dash for null numerics
//   - WalletPanel 4 states
//
// Evidence Collector Task 3 fixture recipe (for the orchestrator):
//   1. Temporarily inject into ABRIGO_INSTRUMENTS:
//      { id: 'fixture-celo-01', name: 'Cobertura COP/USD Fijo', nameEn: 'COP/USD Fixed Hedge',
//        chainId: 42220, address: '0x0000000000000000000000000000000000000001',
//        deployedAt: '2026-01-01', strike: 1.0, slope: 0.5 }
//   2. pnpm build && pnpm start -p 3040
//   3. Navigate to /apps/abrigo/instruments/fixture-celo-01/42220
//   4. viewport 360px: scrollY===0 → RiskCallout visible
//   5. Verify: params table, payoff diagram (role=img), pool state (em-dash), WalletPanel

import { expect, test } from '@playwright/test'

test.describe('DEFI-03/05 — instrument detail page structure', () => {
  test('unknown instrument id returns 404 (notFound boundary)', async ({ page }) => {
    const response = await page.goto('/apps/abrigo/instruments/does-not-exist/42220')
    // Next.js notFound() triggers the 404 page; status should be 404
    expect(response?.status()).toBe(404)
  })

  test('unknown chain id returns 404 (notFound boundary)', async ({ page }) => {
    const response = await page.goto('/apps/abrigo/instruments/some-id/99999')
    expect(response?.status()).toBe(404)
  })
})

// WAIVER-05-04: below tests require a fixture instrument injected into the registry.
// Driven by Evidence Collector at checkpoint Task 3.

test.describe('DEFI-05 — RiskCallout above fold at 360px (WAIVER-05-04 fixture required)', () => {
  test.fixme(
    'RiskCallout visible at scrollY===0 on a 360px viewport (DEFI-05)',
    async ({ page: _page }) => {
      // Evidence Collector recipe (Task 3 checkpoint):
      // 1. Inject fixture instrument (id='fixture-celo-01', chainId=42220) into registry
      // 2. pnpm build && pnpm start -p 3040
      // 3. page.setViewportSize({ width: 360, height: 640 })
      // 4. page.goto('/apps/abrigo/instruments/fixture-celo-01/42220')
      // 5. const scrollY = await page.evaluate(() => window.scrollY)
      //    expect(scrollY).toBe(0) — page loads at top
      // 6. const riskCallout = page.locator('aside[aria-label]').first()
      //    await expect(riskCallout).toBeInViewport()
      // 7. browser_take_screenshot → /tmp/d2p-verify/05-04-risk-360px.png
    },
  )
})

test.describe('DEFI-03 — detail page read-only (no wallet gate, WAIVER-05-04 fixture required)', () => {
  test.fixme('params/payoff/pool render with no wallet gate (DEFI-03)', async ({ page: _page }) => {
    // Evidence Collector recipe (Task 3 checkpoint):
    // Navigate to fixture instrument URL.
    // Assert: InstrumentParams dl visible
    // Assert: PayoffDiagram [role="img"] visible
    // Assert: PoolStatePanel content visible (em-dash for null fields)
    // Assert: NO "connect wallet" gate blocking read-only content
    //   (ConnectButton MAY be visible as optional wallet affordance,
    //    but params/payoff/pool do NOT require wallet connection to render)
  })

  test.fixme(
    'PoolStatePanel shows em-dash for null numerics (anti-fishing CROSS-09)',
    async ({ page: _page }) => {
      // With empty registry → pool state is null → all numerics show em-dash (—)
      // Assert: no "0" in pool state cells where data is unavailable
    },
  )
})
