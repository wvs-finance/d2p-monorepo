// Wave 0 stubs — filled by plan 05-04 (per-instrument page) and 05-03 (risk callout).
// Using test.fixme so these appear in `pnpm playwright test --list` as planned work.
import { test } from '@playwright/test'

test.describe('DEFI-03/05 — per-instrument page (wave 0 stubs)', () => {
  test.fixme(
    'per-instrument page renders read-only (params/payoff/pool) with no wallet gate',
    async ({ page: _page }) => {
      // TODO(05-04): navigate to /apps/abrigo/instruments/{id}/{chainId} with a
      // fixture instrument, assert params table, payoff diagram, pool state panel.
      // No ConnectButton visible — read-only surface requires no wallet connection.
    },
  )

  test.fixme(
    'risk disclosure is above fold at 360px viewport (scrollY === 0)',
    async ({ page: _page }) => {
      // TODO(05-03): set viewport to 360px width, navigate to instrument page,
      // assert RiskCallout is visible without scrolling (scrollY === 0 assertion).
    },
  )
})
