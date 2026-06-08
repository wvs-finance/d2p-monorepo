// @vitest-environment node
// Wave 0 scaffold — B3 SINGLE-SOURCE PROOF. These run LIVE now (the routes short-circuit
// on the empty registry, no network). They prove the live /api/dashboard + /api/status
// responses conform to the SAME canonical Zod schemas re-exported from lib/mcp-tools/contract
// (which re-exports lib/dashboard/contract) — so the OpenAPI spec (Plan 04) cannot drift
// from the live route. No fixme: the schemas + routes both exist as of Plan 01 / Phase 3.

import { GET as dashboardGET } from '@/app/api/dashboard/route'
import { GET as statusGET } from '@/app/api/status/route'
import { DashboardResponseSchema, StatusResponseSchema } from '@/lib/mcp-tools/contract'
import { describe, expect, it } from 'vitest'

describe('OpenAPI conformance — live route ≡ canonical Zod schema (B3)', () => {
  it('live /api/dashboard response conforms to DashboardResponseSchema', async () => {
    const res = await dashboardGET(new Request('http://localhost/api/dashboard?app=abrigo'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(() => DashboardResponseSchema.parse(body)).not.toThrow()
  })

  it('live /api/status response conforms to StatusResponseSchema', async () => {
    const res = await statusGET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(() => StatusResponseSchema.parse(body)).not.toThrow()
  })
})
