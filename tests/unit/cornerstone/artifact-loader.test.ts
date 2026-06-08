// tests/unit/cornerstone/artifact-loader.test.ts
//
// TDD RED → GREEN tests for the typed BuildBear artifact loader.
// Tests: deployment fields present + non-empty, isExpired boundary cases.
//
// GOVERNANCE: the loader validates required fields at module load.
// The 3-day TTL boundary: false at +2d, true at +3d+1ms.

import { deployment, isExpired } from '@/lib/apps/abrigo/cornerstone/artifact-loader'
import { describe, expect, it } from 'vitest'

describe('artifact-loader: deployment fields', () => {
  it('deployment.chainId is 31337 (the BuildBear Polygon fork)', () => {
    expect(deployment.chainId).toBe(31337)
  })

  it('deployment.executor is present and non-empty', () => {
    expect(deployment.executor).toBeTruthy()
    expect(typeof deployment.executor).toBe('string')
    expect(deployment.executor.length).toBeGreaterThan(0)
  })

  it('deployment.pool is present and non-empty', () => {
    expect(deployment.pool).toBeTruthy()
    expect(deployment.pool.length).toBeGreaterThan(0)
  })

  it('deployment.rpcUrl is present and non-empty', () => {
    expect(deployment.rpcUrl).toBeTruthy()
    expect(deployment.rpcUrl.length).toBeGreaterThan(0)
  })

  it('deployment.capturedAt is present and non-empty', () => {
    expect(deployment.capturedAt).toBeTruthy()
    expect(deployment.capturedAt.length).toBeGreaterThan(0)
  })
})

describe('isExpired: 3-day TTL boundary', () => {
  // capturedAt from the mirrored artifact: "2026-06-08T00:15:09.000Z"
  const capturedAtMs = new Date(deployment.capturedAt).getTime()
  const DAY_MS = 24 * 60 * 60 * 1000

  it('returns false at capturedAt + 2 days (fresh)', () => {
    expect(isExpired(capturedAtMs + 2 * DAY_MS)).toBe(false)
  })

  it('returns false at capturedAt + 3 days exactly (boundary — still valid)', () => {
    expect(isExpired(capturedAtMs + 3 * DAY_MS)).toBe(false)
  })

  it('returns true at capturedAt + 3 days + 1ms (just expired)', () => {
    expect(isExpired(capturedAtMs + 3 * DAY_MS + 1)).toBe(true)
  })

  it('returns true well after expiry', () => {
    expect(isExpired(capturedAtMs + 7 * DAY_MS)).toBe(true)
  })
})
