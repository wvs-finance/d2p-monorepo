// Phase 3 — DASH-01 e2e: BFF aggregation route /api/dashboard assertions (filled by Plan 03-02)
import { expect, test } from '@playwright/test'

test.describe('DASH-01 — GET /api/dashboard', () => {
  test('returns 200 with version:1, chains[5], and no bigint serialization error', async ({
    request,
  }) => {
    const res = await request.get('/api/dashboard?app=abrigo')
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.version).toBe(1)
    expect(Array.isArray(body.chains)).toBe(true)
    expect(body.chains).toHaveLength(5)
    // JSON serialization must not throw — bigint in the response would cause TypeError here
    expect(() => JSON.stringify(body)).not.toThrow()
    // Each chain entry must have a valid status field
    const validStatuses = new Set(['healthy', 'degraded', 'empty'])
    for (const chain of body.chains) {
      expect(validStatuses.has(chain.status)).toBe(true)
    }
  })

  test('returns 404 for an unknown app (?app=unknown)', async ({ request }) => {
    const res = await request.get('/api/dashboard?app=unknown')
    expect(res.status()).toBe(404)
  })
})
