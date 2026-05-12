// Phase 2 Wave 0 stub — created by plan 02-01.
// Filled by plan 02-06 in wave 3 per 02-VALIDATION.md.
// Covers requirement(s): LAB-02
import { test } from '@playwright/test'

test.describe('phase-2 - LAB-02 — team page', () => {
  test.fixme('/team renders ≥ 1 ContributorCard with name + role + GitHub link', async () => {
    // GET /team — HTTP 200
    // Verify at least one ContributorCard component visible
    // Each card shows: contributor name, role (es-CO or en depending on locale)
    // GitHub link present with href https://github.com/{handle}
  })

  test.fixme('/team page renders in en locale with translated headings', async () => {
    // Set locale to en, visit /team
    // H1 "Team" visible, subheading about contributors visible
    // ContributorCard labels use "Current iteration" (en) not "Iteración actual" (es-CO)
  })

  test.fixme('/team page shows focus_iteration_slug as a link to that iteration', async () => {
    // When contributor has focus_iteration_slug set,
    // card shows link to /apps/abrigo/iterations/{slug}
  })
})
