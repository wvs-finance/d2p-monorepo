// Phase 2 Wave 0 stub — created by plan 02-01.
// Filled by plan 02-04 in wave 2 per 02-VALIDATION.md.
// Covers requirement(s): ITER-06
import { test } from '@playwright/test'

test.describe('phase-2 - ITER-06 — iteration detail accessibility', () => {
  test.fixme(
    'axe-core WCAG 2.2 AA scan passes on /apps/abrigo/iterations/fx-vol-on-cpi-surprise/v1',
    async () => {
      // GET /apps/abrigo/iterations/fx-vol-on-cpi-surprise/v1 (FAIL iteration)
      // Run axe-core with wcag2a, wcag2aa, wcag21aa, wcag21a, wcag22aa tags
      // results.violations must be empty
    },
  )

  test.fixme('evidence chain inline SVG has aria-label and sr-only data table', async () => {
    // SVG range-bar has aria-label summarizing "β = X, 95% CI [Y, Z]"
    // sr-only table present with same data for screen reader access
  })

  test.fixme('<details> "How to verify" element is keyboard accessible', async () => {
    // details/summary pattern navigable with Tab + Enter
    // summary text "Cómo verificar este hash" (es-CO) / "How to verify this hash" (en)
    // Expanded content visible after keyboard activation
  })

  test.fixme('replication hash copy button has accessible label', async () => {
    // Copy button has aria-label "Copiar hash" (es-CO) / "Copy hash" (en)
    // Keyboard accessible (Tab + Enter)
  })
})
