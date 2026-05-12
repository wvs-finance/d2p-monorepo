// Phase 2 Wave 0 stub — created by plan 02-01.
// Filled by plan 02-03 in wave 2 per 02-VALIDATION.md.
// Covers requirement(s): ITER-02
import { test } from '@playwright/test'

test.describe('phase-2 - ITER-02 — iteration catalog accessibility', () => {
  test.fixme('axe-core WCAG 2.2 AA scan passes on /apps/abrigo/iterations', async () => {
    // GET /apps/abrigo/iterations
    // Run axe-core with wcag2a, wcag2aa, wcag21aa, wcag22aa tags
    // results.violations must be empty
  })

  test.fixme('iteration catalog filter pills have keyboard navigation', async () => {
    // Filter pill row (if present) navigable with Tab + Enter/Space
    // Active state communicated via aria-pressed or aria-current
  })

  test.fixme('iteration catalog cards have accessible names for screen readers', async () => {
    // Each IterationCatalogCard has an accessible name describing the iteration
    // StatusPill uses color + icon + text (CROSS-09 — never color alone)
  })
})
