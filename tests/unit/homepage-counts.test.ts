// @vitest-environment node
// Phase 2 Wave 3 — filled by plan 02-03
// Covers requirement: LAB-01
import { describe, expect, it } from 'vitest'

// Import the pure helper from the page file once it exists.
// Until it does, tests will fail with a module-not-found error (RED phase).
import { countsByStatus } from '@/lib/iterations/counts'

describe('countsByStatus', () => {
  it('returns correct counts for a mixed-status array', () => {
    const result = countsByStatus([{ status: 'PASS' }, { status: 'FAIL' }, { status: 'PASS' }] as {
      status: 'PASS' | 'FAIL' | 'PARKED' | 'IN_PROGRESS'
    }[])

    expect(result).toEqual({
      PASS: 2,
      FAIL: 1,
      PARKED: 0,
      IN_PROGRESS: 0,
      total: 3,
    })
  })

  it('returns all-zero counts for an empty array', () => {
    const result = countsByStatus([] as { status: 'PASS' | 'FAIL' | 'PARKED' | 'IN_PROGRESS' }[])

    expect(result).toEqual({
      PASS: 0,
      FAIL: 0,
      PARKED: 0,
      IN_PROGRESS: 0,
      total: 0,
    })
  })
})
