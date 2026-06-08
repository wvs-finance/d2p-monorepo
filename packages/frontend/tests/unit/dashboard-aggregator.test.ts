// @vitest-environment node
// vitest.config.ts global environment is jsdom; viem clients must not boot under jsdom.
// This file MUST keep the @vitest-environment node directive at the top.

import { aggregateAllChains } from '@/lib/dashboard/aggregator'
// Phase 3 Wave 0 — REAL assertions for DASH-01 aggregator behavior.
// The empty registry short-circuits before any viem client, so results are deterministic.
import { describe, expect, it } from 'vitest'

function deepWalk(value: unknown): void {
  if (typeof value === 'bigint') {
    throw new Error(`bigint found in result: ${value}`)
  }
  if (Array.isArray(value)) {
    for (const item of value) deepWalk(item)
  } else if (value && typeof value === 'object') {
    for (const v of Object.values(value as Record<string, unknown>)) deepWalk(v)
  }
}

describe('aggregateAllChains — DASH-01 (empty registry path)', () => {
  it('returns one result per chain (5), all status EXACTLY empty with the empty registry', async () => {
    const result = await aggregateAllChains()

    expect(result).toHaveLength(5)

    for (const entry of result) {
      // empty path short-circuits before any viem client (lib/dashboard/aggregator.ts)
      // so this is deterministic — a 'degraded' here is a real bug, not a flaky RPC.
      expect(entry.status).toBe('empty')
      expect(entry.instruments).toEqual([])
    }
  })

  it('serializes no bigint anywhere in the result', async () => {
    const result = await aggregateAllChains()

    // JSON.stringify must not throw (bigint would cause TypeError at runtime in Response.json)
    expect(() => JSON.stringify(result)).not.toThrow()

    // Deep walk asserts no value has typeof 'bigint'
    expect(() => deepWalk(result)).not.toThrow()
  })
})
