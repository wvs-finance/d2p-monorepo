// @vitest-environment node
// This test will import the GET route which imports viem — requires node environment.

// Phase 3 Wave 0 stubs — DASH-08 route handler assertions (filled by Plan 03-03).
//
// When filled by 03-03, these tests will assert:
//   - GET /api/status returns 200
//   - response body has fields: status, build, timestamp, chains (length 5), apps
//   - one failing RPC probe still resolves — response status is 'degraded', no throw
//   - chains[] has all 5 chain IDs, each with a status field

import { describe, it } from 'vitest'

describe('GET /api/status', () => {
  it.todo('returns 200 with status/build/timestamp/chains[5]/apps — filled by 03-03')
  it.todo(
    'isolates one failing RPC probe — response still resolves degraded, no throw — filled by 03-03',
  )
})
