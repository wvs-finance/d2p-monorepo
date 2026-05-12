// Phase 2 Wave 0 stub — created by plan 02-01.
// Filled by plan 02-07 in wave 3 per 02-VALIDATION.md.
// Covers requirement(s): LAB-05
import { test } from '@playwright/test'

test.describe('phase-2 - LAB-05 — about / methodology page', () => {
  test.fixme(
    '/about renders 5 NumberedStep components (anti-fishing discipline pipeline)',
    async () => {
      // GET /about — HTTP 200
      // Verify 5 step components visible: 01 Spec, 02 Data, 03 Estimation, 04 Tests, 05 Disposition
      // Each step shows: number label + title + body prose
    },
  )

  test.fixme('/about renders 4 CheckmarkList items (lab invariants)', async () => {
    // Verify 4 checklist items visible
    // Item 1: "El bloque de cita de decisión precede cada prueba" (es-CO)
    // Item 2: "Trío de verificación después de cada celda de código" (es-CO)
    // Item 3: "DETENER si hay conflicto especificación–datos" (es-CO)
    // Item 4: "El rechazo tiene el mismo peso narrativo que la aprobación" (es-CO)
  })

  test.fixme('/about renders step labels in en locale', async () => {
    // Set locale to en, visit /about
    // Step labels: "01 Spec", "02 Data", "03 Estimation", "04 Tests", "05 Disposition"
  })

  test.fixme('/about contains no marketing register phrases', async () => {
    // Page text must not contain "Empower", "cutting-edge", "unlock", "leverage platform"
    // Anti-fishing discipline copy register enforced
  })
})
