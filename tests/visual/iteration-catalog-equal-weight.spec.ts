// Phase 2 Wave 0 stub — created by plan 02-01.
// Filled by plan 02-03 in wave 2 per 02-VALIDATION.md.
// Covers requirement(s): ITER-02
import { test } from '@playwright/test'

test.describe('phase-2 - ITER-02 — iteration catalog equal-weight visual', () => {
  test.fixme(
    'PASS / FAIL / PARKED / IN_PROGRESS iteration cards share identical bounding-box height',
    async () => {
      // GET /apps/abrigo/iterations
      // Take screenshot of each IterationCatalogCard by status
      // Verify bounding-box heights are identical across all 4 status types
      // Epistemic-equality rule: no status card taller or shorter than others
    },
  )

  test.fixme('iteration catalog card screenshots match visual baseline snapshots', async () => {
    // Playwright visual regression: compare screenshots to stored baseline
    // Ensures styling regressions are caught before deployment
  })
})
