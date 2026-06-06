// @vitest-environment node
// Wave 0 (RED stub) — wrapper-adapter: WrapperPositionView + adaptWrapper + getWrapperPosition.
// Encodes §2 honesty rules: no stale baselines (lastSurviving*/deposited*) as current;
// no realized-costs field; cause typed bytes32; WRAPPER_DEPLOYED gate.
// Turned GREEN by Plan 07-00 Task 2 (wrapper-adapter.ts lands).
// Excluded from tsconfig until Task 2 (imports not-yet-created module).

import { describe, expect, it } from 'vitest'

const MODULE = '@/lib/apps/abrigo/somnia/wrapper-adapter'

type WrapperPositionView = {
  positionTokenId: bigint
  legsHealth: unknown
  survivingCollateral0: bigint
  survivingCollateral1: bigint
  residualCause: string | null
  deployed: true
}

type WrapperAdapterModule = {
  adaptWrapper: (raw: Record<string, unknown>) => WrapperPositionView
  getWrapperPosition: () => { deployed: false } | WrapperPositionView
}

// Minimal raw input that adaptWrapper can process
const MOCK_RAW: Record<string, unknown> = {
  positionTokenId: 12345n,
  legsHealth: null,
  survivingCollateral0: 1000n,
  survivingCollateral1: 2000n,
  residualCause: null,
}

describe('adaptWrapper — §2 mapping rules chokepoint', () => {
  it('returns a WrapperPositionView with positionTokenId', async () => {
    const { adaptWrapper } = (await import(MODULE)) as WrapperAdapterModule
    const view = adaptWrapper(MOCK_RAW)
    expect(typeof view.positionTokenId).toBe('bigint')
  })

  it('returned object has NO "realizedCosts" key (non-existent field)', async () => {
    const { adaptWrapper } = (await import(MODULE)) as WrapperAdapterModule
    const view = adaptWrapper(MOCK_RAW)
    expect('realizedCosts' in view).toBe(false)
  })

  it('returned object has NO "lastSurviving0" key as current (stale baseline excluded)', async () => {
    const { adaptWrapper } = (await import(MODULE)) as WrapperAdapterModule
    const view = adaptWrapper(MOCK_RAW)
    expect('lastSurviving0' in view).toBe(false)
  })

  it('returned object has NO "lastSurviving1" key as current (stale baseline excluded)', async () => {
    const { adaptWrapper } = (await import(MODULE)) as WrapperAdapterModule
    const view = adaptWrapper(MOCK_RAW)
    expect('lastSurviving1' in view).toBe(false)
  })

  it('returned object has NO "deposited0" key (stale baseline excluded)', async () => {
    const { adaptWrapper } = (await import(MODULE)) as WrapperAdapterModule
    const view = adaptWrapper(MOCK_RAW)
    expect('deposited0' in view).toBe(false)
  })

  it('returned object has NO "deposited1" key (stale baseline excluded)', async () => {
    const { adaptWrapper } = (await import(MODULE)) as WrapperAdapterModule
    const view = adaptWrapper(MOCK_RAW)
    expect('deposited1' in view).toBe(false)
  })

  it('residualCause is bytes32 string or null — NOT a 3-way enum', async () => {
    const { adaptWrapper } = (await import(MODULE)) as WrapperAdapterModule
    const view = adaptWrapper(MOCK_RAW)
    // null is valid (no cause); if set, must be a string (bytes32 hex)
    expect(view.residualCause === null || typeof view.residualCause === 'string').toBe(true)
  })
})

describe('getWrapperPosition — WRAPPER_DEPLOYED gate (default: false)', () => {
  it('returns { deployed: false } when WRAPPER_DEPLOYED is unset', async () => {
    // WRAPPER_DEPLOYED is unset in test env → not-live empty state
    const { getWrapperPosition } = (await import(MODULE)) as WrapperAdapterModule
    const result = getWrapperPosition()
    expect(result).toEqual({ deployed: false })
  })
})
