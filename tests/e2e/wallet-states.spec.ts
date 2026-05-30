// Wave 0 stubs — filled by plan 05-04 (WalletPanel 4-state implementation).
// Using test.fixme so these appear in `pnpm playwright test --list` as planned work.
import { test } from '@playwright/test'

test.describe('DEFI-02/06/07 — wallet states (wave 0 stubs)', () => {
  test.fixme('DISCONNECTED state renders ConnectButton', async ({ page: _page }) => {
    // TODO(05-04): navigate to an instrument page (or a wallet panel fixture),
    // assert ConnectButton is present and visible in the DISCONNECTED state.
    // The aria-live region must be present on the WalletPanel wrapper.
  })

  test.fixme(
    'CONNECTED_WRONG_CHAIN state shows switch-to-supported CTA',
    async ({ page: _page }) => {
      // TODO(05-04): mock wagmi useAccount to return
      // { status: 'connected', chain: undefined } (CONNECTED_WRONG_CHAIN),
      // then assert the "Cambiar red / Switch network" CTA is rendered.
    },
  )

  test.fixme(
    'aria-live region is present on WalletPanel for SR state change announcements',
    async ({ page: _page }) => {
      // TODO(05-04): navigate to the instrument page, assert
      // [aria-live="polite"] wrapper is present in the DOM (DEFI-06).
    },
  )
})
