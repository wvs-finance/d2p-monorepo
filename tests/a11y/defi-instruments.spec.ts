// Wave 0 stub — filled by plan 05-03 (instruments index + risk callout).
// Using test.fixme so this appears in `pnpm playwright test --list` as planned work.
import { test } from '@playwright/test'

test.describe('DEFI-06 — axe a11y on instruments index + risk callout (wave 0 stub)', () => {
  test.fixme(
    'axe clean on /apps/abrigo/instruments index and risk callout',
    async ({ page: _page }) => {
      // TODO(05-03): navigate to /apps/abrigo/instruments,
      // run @axe-core/playwright injectAxe() + checkA11y() on the instruments index.
      // Assert axe clean (0 violations) including the RiskCallout component.
    },
  )
})
