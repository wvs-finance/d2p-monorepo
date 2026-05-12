// Phase 2 Wave 0 stub — created by plan 02-01.
// Filled by plan 02-04 in wave 2 per 02-VALIDATION.md.
// Covers requirement(s): ITER-03
import { test } from '@playwright/test'

test.describe('phase-2 - ITER-03 — iteration detail page', () => {
  test.fixme(
    'detail page renders spec / data / estimation / tests / disposition narrative sections',
    async () => {
      // GET /apps/abrigo/iterations/{slug}/v{n} — HTTP 200
      // Verify all 5 narrative sections present (spec, data, estimation, tests, disposition)
      // Using pair-d/v1 as test fixture
    },
  )

  test.fixme(
    'detail page renders IterationDetailHeader with title + status pill + version',
    async () => {
      // Header shows: iteration title (locale-aware), StatusPill, version label
      // On mobile (<sm): stacked vertically; on desktop: inline
    },
  )

  test.fixme('detail page renders notebook_url as external link', async () => {
    // "Ver cuaderno de análisis" / "View analysis notebook" link present
    // href is the notebook_url from MDX frontmatter
    // Opens in new tab (target="_blank" + rel="noopener noreferrer")
  })

  test.fixme('detail page renders dataset_ref metadata', async () => {
    // Dataset reference visible in evidence chain section
  })

  test.fixme('detail page renders analysis_date formatted for the active locale', async () => {
    // analysis_date displayed using locale-aware date formatting
  })
})
