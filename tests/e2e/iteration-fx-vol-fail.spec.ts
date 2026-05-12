// Phase 2 Wave 0 stub — created by plan 02-01.
// Filled by plan 02-05 in wave 2 per 02-VALIDATION.md.
// Covers requirement(s): ITER-06
import { test } from '@playwright/test'

test.describe('phase-2 - ITER-06 — FX-vol-on-CPI-surprise FAIL iteration', () => {
  test.fixme('/apps/abrigo/iterations/fx-vol-on-cpi-surprise/v1 returns HTTP 200', async () => {
    // GET /apps/abrigo/iterations/fx-vol-on-cpi-surprise/v1 — must not 404
  })

  test.fixme('fx-vol-on-cpi-surprise/v1 renders β̂ = -0.000685', async () => {
    // Verify β value -0.000685 visible in evidence chain
  })

  test.fixme('fx-vol-on-cpi-surprise/v1 renders 90% CI = [-0.003635, 0.002265]', async () => {
    // Verify CI bounds [-0.003635, 0.002265] visible
    // NOTE: This iteration uses 90% CI (not 95%); verify label shows IC 90% / 90% CI
  })

  test.fixme('fx-vol-on-cpi-surprise/v1 renders n = 947', async () => {
    // Verify "N = 947" visible in evidence section
  })

  test.fixme('fx-vol-on-cpi-surprise/v1 shows FAIL status pill', async () => {
    // StatusPill with FAIL status visible — not hidden, not muted
  })

  test.fixme(
    'fx-vol-on-cpi-surprise/v1 renders DispositionMemo at full visual weight (no collapse)',
    async () => {
      // <DispositionMemo> section present and fully visible (not inside accordion/collapse)
      // "Esta iteración fue rechazada" / "This iteration was rejected" notice visible
      // Full disposition text accessible without user interaction
    },
  )
})
