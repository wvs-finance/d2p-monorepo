// @vitest-environment node
// This test will import the GET route which imports viem — requires node environment.

// Phase 3 Wave 0 stubs — DASH-01 route handler assertions (filled by Plan 03-02).
//
// When filled by 03-02, these tests will assert:
//   - GET /api/dashboard?app=abrigo returns 200
//   - response body has a `chains` array of length 5
//   - JSON.stringify(body) does not throw (no bigint in response)
//   - a degraded chain does NOT cause a 500 — it appears with status 'degraded' in chains[]
//   - GET /api/dashboard?app=unknown returns 404

import { describe, it } from 'vitest'

describe('GET /api/dashboard', () => {
  it.todo(
    'returns 200 with chains[5], no bigint, and a degraded chain does not 500 — filled by 03-02',
  )
  it.todo('returns 404 for an unknown app (?app=unknown) — filled by 03-02')
})
