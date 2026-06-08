import { GET } from '@/app/api/health/route'
import { describe, expect, it } from 'vitest'

describe('GET /api/health', () => {
  it('returns 200 with status ok and expected fields', async () => {
    const response = await GET()
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.status).toBe('ok')
    expect(body.runtime).toBe('node')
    expect(typeof body.build).toBe('string')
    expect(typeof body.timestamp).toBe('string')
  })
})
