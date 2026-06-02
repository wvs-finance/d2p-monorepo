// @vitest-environment node
// Wave 0 (RED stub) — liveness: LivenessSource<T> snapshot + polling contract.
// Phase 7 ships snapshot + polling ONLY. No live realization. honker-node never in package.json.
// getServerSnapshot returns the stable seed so first paint == server text (no hydration mismatch).
// Turned GREEN by Plan 07-00 Task 2 (liveness.ts lands).
// Excluded from tsconfig until Task 2 (imports not-yet-created module).

import { describe, expect, it } from 'vitest'

const MODULE = '@/lib/apps/abrigo/somnia/liveness'

type LivenessSource<T> = {
  getSnapshot: () => T
  getServerSnapshot: () => T
  subscribe: (cb: (next: T) => void) => () => void
  readonly liveness: 'snapshot' | 'polling'
}

type LivenessModule = {
  snapshotSource: <T>(seed: T) => LivenessSource<T>
  pollingSource: <T>(seed: T, intervalMs: number, fetcher: () => Promise<T>) => LivenessSource<T>
}

const SEED = { value: 42, name: 'test-seed' }

describe('snapshotSource — liveness="snapshot" realization', () => {
  it('getSnapshot() returns the stable seed', async () => {
    const { snapshotSource } = (await import(MODULE)) as LivenessModule
    const source = snapshotSource(SEED)
    expect(source.getSnapshot()).toBe(SEED)
  })

  it('getServerSnapshot() returns the stable seed (first paint == server text)', async () => {
    const { snapshotSource } = (await import(MODULE)) as LivenessModule
    const source = snapshotSource(SEED)
    expect(source.getServerSnapshot()).toBe(SEED)
  })

  it('subscribe() returns an immediate no-op unsubscribe function', async () => {
    const { snapshotSource } = (await import(MODULE)) as LivenessModule
    const source = snapshotSource(SEED)
    const unsub = source.subscribe(() => {})
    // Must return a function (the cleanup)
    expect(typeof unsub).toBe('function')
    // Calling it must not throw
    expect(() => unsub()).not.toThrow()
  })

  it('liveness is "snapshot"', async () => {
    const { snapshotSource } = (await import(MODULE)) as LivenessModule
    const source = snapshotSource(SEED)
    expect(source.liveness).toBe('snapshot')
  })

  it('liveness is NOT "live" (honker deferred)', async () => {
    const { snapshotSource } = (await import(MODULE)) as LivenessModule
    const source = snapshotSource(SEED)
    expect(source.liveness).not.toBe('live')
  })
})

describe('pollingSource — liveness="polling" realization', () => {
  it('liveness is "polling"', async () => {
    const { pollingSource } = (await import(MODULE)) as LivenessModule
    const source = pollingSource(SEED, 5000, async () => SEED)
    expect(source.liveness).toBe('polling')
  })

  it('getSnapshot() returns the stable seed before first tick', async () => {
    const { pollingSource } = (await import(MODULE)) as LivenessModule
    const source = pollingSource(SEED, 5000, async () => SEED)
    expect(source.getSnapshot()).toBe(SEED)
  })

  it('getServerSnapshot() returns the stable seed (no interval read before mount)', async () => {
    const { pollingSource } = (await import(MODULE)) as LivenessModule
    const source = pollingSource(SEED, 5000, async () => SEED)
    expect(source.getServerSnapshot()).toBe(SEED)
  })

  it('subscribe() returns a cleanup function', async () => {
    const { pollingSource } = (await import(MODULE)) as LivenessModule
    const source = pollingSource(SEED, 60000, async () => SEED)
    const unsub = source.subscribe(() => {})
    expect(typeof unsub).toBe('function')
    // Clean up the interval
    unsub()
  })
})

describe('liveness module — "live" realization MUST NOT exist', () => {
  it('module exports have no liveness="live" source', async () => {
    const mod = await import(MODULE)
    // Check all exports: none should have liveness === 'live' as a property
    for (const [key, val] of Object.entries(mod)) {
      if (typeof val === 'function') {
        // If it's a factory, calling it with a seed should not produce liveness="live"
        try {
          const result = (val as (s: unknown) => unknown)(SEED) as { liveness?: string }
          if (result && typeof result === 'object' && 'liveness' in result) {
            expect(result.liveness, `Export "${key}" must not have liveness="live"`).not.toBe(
              'live',
            )
          }
        } catch {
          // Factory requires more args — skip
        }
      }
    }
  })
})
