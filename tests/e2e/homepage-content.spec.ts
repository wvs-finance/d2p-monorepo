// Phase 2 Wave 0 stub — created by plan 02-01.
// Filled by plan 02-02 in wave 2 per 02-VALIDATION.md.
// Covers requirement(s): LAB-01
import { test } from '@playwright/test'

test.describe('phase-2 - LAB-01 — homepage content', () => {
  test.fixme('homepage renders mission text (DS2P Labs headline + subheading)', async () => {
    // Verify H1 "DS2P Labs" and subheading about hedging instruments visible
  })

  test.fixme('homepage renders "What is d2-π" explainer section', async () => {
    // Verify the explainer section is present and contains description of d2-π
  })

  test.fixme(
    'homepage renders Apps overview with Abrigo card linking to /apps/abrigo',
    async () => {
      // Verify "Instrumentos activos" / "Active instruments" section shows Abrigo card
      // Card links to /apps/abrigo
    },
  )

  test.fixme('homepage renders GitHub org link to https://github.com/wvs-finance', async () => {
    // Verify link with label "wvs-finance en GitHub" / "wvs-finance on GitHub" is visible
    // href is https://github.com/wvs-finance
  })

  test.fixme('homepage renders iteration count tiles derived from Velite data', async () => {
    // Verify "Estado del catálogo" / "Catalog status" section with count tiles visible
  })
})
