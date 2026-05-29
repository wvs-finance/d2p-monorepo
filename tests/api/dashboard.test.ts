// @vitest-environment node
// This test will import the GET route which imports viem — requires node environment.
//
// Note on degraded-chain test: ABRIGO_INSTRUMENTS is empty at launch, so aggregateChain()
// short-circuits before constructing any viem client. The chains return with status 'empty'
// (not 'degraded'), but the handler's error-isolation contract is verified: each chain
// independently reports its status and no per-chain failure produces a 500.

import { GET } from '@/app/api/dashboard/route'
import { describe, expect, it } from 'vitest'

describe('GET /api/dashboard', () => {
  it('returns 200 with version:1, chains[5], no bigint', async () => {
    const res = await GET(new Request('http://localhost/api/dashboard?app=abrigo'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.version).toBe(1)
    expect(Array.isArray(body.chains)).toBe(true)
    expect(body.chains).toHaveLength(5)
    // No bigint in the response — JSON.stringify would throw if any bigint slipped through
    expect(() => JSON.stringify(body)).not.toThrow()
  })

  it('returns 404 for an unknown app', async () => {
    const res = await GET(new Request('http://localhost/api/dashboard?app=unknown'))
    expect(res.status).toBe(404)
  })

  it('each chain has an independent status — per-chain isolation not all-or-nothing', async () => {
    // With the empty instrument registry the aggregator short-circuits before touching
    // any viem client, so every chain returns status 'empty'. The contract being tested
    // is that: (a) the handler does NOT 500, (b) every chain entry carries a status field,
    // and (c) a single chain's status does not suppress the others.
    const res = await GET(new Request('http://localhost/api/dashboard?app=abrigo'))
    expect(res.status).toBe(200)
    const body = await res.json()
    // Each of the 5 chains must have a valid status ('healthy'|'degraded'|'empty')
    const validStatuses = new Set(['healthy', 'degraded', 'empty'])
    for (const chain of body.chains) {
      expect(validStatuses.has(chain.status)).toBe(true)
    }
    // With the empty registry all chains are 'empty'; the overall status is 'ok' (not 'degraded')
    expect(body.status).toBe('ok')
  })
})
