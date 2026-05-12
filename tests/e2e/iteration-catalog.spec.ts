// Phase 2 Wave 0 stub — created by plan 02-01.
// Filled by plan 02-03 in wave 2 per 02-VALIDATION.md.
// Covers requirement(s): ITER-01, ITER-02
import { test } from '@playwright/test'

test.describe('phase-2 - ITER-01, ITER-02 — iteration catalog', () => {
  test.fixme(
    'all 4 status cards visible by default — no filter excludes FAIL or PARKED',
    async () => {
      // GET /apps/abrigo/iterations — HTTP 200
      // Verify catalog shows ALL statuses without any active filter
      // Cards with PASS, FAIL, PARKED, IN_PROGRESS all visible simultaneously
      // Epistemic-honesty invariant: no status is hidden by default
    },
  )

  test.fixme('iteration catalog cards have equal height regardless of status', async () => {
    // Verify IterationCatalogCard components share identical bounding-box height
    // PASS card height === FAIL card height === PARKED card height === IN_PROGRESS card height
    // No status gets a taller or shorter card (ITER-02 equal-weight rule)
  })

  test.fixme('iteration catalog grid shows 1 col on mobile, 2 col at sm, 3 col at lg', async () => {
    // Responsive grid layout matches Phase 2 CONTEXT.md mobile composition
    // base: 1 col, sm (640px): 2 col, lg (1024px): 3 col
  })

  test.fixme('filter pill row renders with ARIA label "Filter iterations by status"', async () => {
    // If filter UI present, nav element has aria-label matching i18n filter.aria_label
  })
})
