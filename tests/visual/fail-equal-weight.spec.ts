// Phase 2 Wave 0 stub — created by plan 02-01.
// Filled by plan 02-05 in wave 2 per 02-VALIDATION.md.
// Covers requirement(s): ITER-06
import { test } from '@playwright/test'

test.describe('phase-2 - ITER-06 — FAIL iteration equal visual weight', () => {
  test.fixme(
    'FAIL detail page DispositionMemo section height ≥ PASS DispositionMemo section height',
    async () => {
      // GET /apps/abrigo/iterations/fx-vol-on-cpi-surprise/v1 (FAIL)
      // GET /apps/abrigo/iterations/pair-d/v1 (PASS)
      // Compare bounding-box height of disposition section on both pages
      // FAIL disposition must not be visually smaller/collapsed vs PASS disposition
    },
  )

  test.fixme(
    'FAIL detail page does not use muted color or reduced opacity for status pill',
    async () => {
      // StatusPill on FAIL page uses same visual weight as PASS page pill
      // No opacity reduction, no muted color override for FAIL status
    },
  )

  test.fixme(
    'FAIL detail page DispositionMemo is fully visible without user interaction',
    async () => {
      // DispositionMemo section visible without requiring click to expand
      // Not inside an accordion, collapse, or details element
    },
  )
})
