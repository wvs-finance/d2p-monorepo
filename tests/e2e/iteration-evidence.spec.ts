// Phase 2 Wave 0 stub — created by plan 02-01.
// Filled by plan 02-04 in wave 2 per 02-VALIDATION.md.
// Covers requirement(s): ITER-04
import { test } from '@playwright/test'

test.describe('phase-2 - ITER-04 — iteration evidence chain', () => {
  test.fixme(
    'evidence chain renders β estimate + 95% CI inline SVG range-bar with aria-label',
    async () => {
      // GET /apps/abrigo/iterations/pair-d/v1
      // Verify inline SVG component rendered with β point + CI whisker + null reference line
      // SVG has aria-label summarizing "β = X, 95% CI [Y, Z]"
      // Screen-reader data table present (sr-only)
    },
  )

  test.fixme('evidence chain renders p-value + sample size N', async () => {
    // "valor p" / "p-value" label + value visible
    // "N = " + sample_size value visible in evidence section
  })

  test.fixme(
    'replication_hash renders with <details> "How to verify" containing make verify instructions',
    async () => {
      // ReplicationHash component: shows truncated hash + full hash in aria-label
      // <details> element present, summary is "Cómo verificar este hash" (es-CO)
      // When expanded: shows git clone + make verify ITER={slug} commands
      // Copy-to-clipboard button present
    },
  )

  test.fixme('replication_hash copy button copies full hash to clipboard', async () => {
    // Click copy button → clipboard contains the 64-char sha256 hex hash
    // Toast message "¡Copiado!" (es-CO) or "Copied!" (en) appears
  })
})
