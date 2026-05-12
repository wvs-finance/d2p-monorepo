// Phase 2 Wave 0 stub — created by plan 02-01.
// Filled by plan 02-07 in wave 3 per 02-VALIDATION.md.
// Covers requirement(s): LAB-03
import { test } from '@playwright/test'

test.describe('phase-2 - LAB-03 — research / publications page', () => {
  test.fixme(
    '/research renders ≥ 3 PublicationCard entries from Velite research collection',
    async () => {
      // GET /research — HTTP 200
      // Verify at least 3 PublicationCard components visible
      // Each card shows: title (locale-aware), authors, date, type badge
    },
  )

  test.fixme('/research renders external_url link when present on a publication', async () => {
    // Verify "Leer documento" / "Read document" CTA links to external_url for publications with that field
  })

  test.fixme('/research renders type badges for all four document types', async () => {
    // paper / decision-memo / write-up / talk type badges visible (at least one each from seed data)
  })

  test.fixme('/research shows empty state when Velite research collection is empty', async () => {
    // If no research MDX files exist, show "Sin publicaciones aún" / "No publications yet"
  })
})
