// @vitest-environment node
// RED stub — cornerstone workflow-store (useSyncExternalStore-shaped, owns the reducer).
// Imports from lib/apps/abrigo/cornerstone/workflow-store (does NOT exist yet — intentional RED).
// Excluded from tsconfig until Task 2 GREEN commit.
//
// Key invariants asserted:
//   - createWorkflowStore() returns a FRESH instance per call (no singleton)
//   - PER-REQUEST AC (FD-M1): two instances are INDEPENDENT
//   - getServerSnapshot() returns IDLE (same stable ref as the module-level IDLE constant)
//   - getSnapshot() returns the SAME ref across reads with no intervening emit (Object.is = true)
//   - getSnapshot() returns a NEW ref after emit (Object.is = false)
//   - emit(event) transitions RunState correctly
//   - subscribe(listener): listener fires once per emit; cleanup stops further notifications

import { describe, expect, it, vi } from 'vitest'

const MODULE = '@/lib/apps/abrigo/cornerstone/workflow-store'

type RunState = {
  status: 'idle' | 'a1' | 'a2_decision' | 'minting' | 'done'
  a1?: { recordedDecisionId: string }
  a2?: {
    marketLabel: string
    strikeWAD: string
    size: bigint
    isLong: boolean
    schoolLabel: string
    rationale: string
    payoff: { volToWidth: string; horizonBlocks: number; tickSpacing: number; asset: string }
    maxLoss: string
    upside: string
    marginDelta: { token0: bigint; token1: bigint }
  }
  mint?: { positionId: string; marginToken0: bigint; marginToken1: bigint }
}

type WorkflowStore = {
  subscribe: (onStoreChange: () => void) => () => void
  getSnapshot: () => RunState
  getServerSnapshot: () => RunState
  emit: (event: unknown) => void
}

type WorkflowStoreModule = {
  createWorkflowStore: () => WorkflowStore
  IDLE: RunState
}

// ---- getServerSnapshot returns idle ----

describe('getServerSnapshot() returns idle RunState', () => {
  it('status is "idle"', async () => {
    const { createWorkflowStore } = (await import(MODULE)) as WorkflowStoreModule
    const store = createWorkflowStore()
    expect(store.getServerSnapshot().status).toBe('idle')
  })

  it('getServerSnapshot() returns the module-level IDLE constant (stable ref)', async () => {
    const { createWorkflowStore, IDLE } = (await import(MODULE)) as WorkflowStoreModule
    const store = createWorkflowStore()
    expect(store.getServerSnapshot()).toBe(IDLE)
  })
})

// ---- PER-REQUEST AC (FD-M1): two instances are INDEPENDENT ----

describe('PER-REQUEST AC (FD-M1): two createWorkflowStore() calls return INDEPENDENT instances', () => {
  it('emitting on store A does NOT change store B snapshot', async () => {
    const { createWorkflowStore } = (await import(MODULE)) as WorkflowStoreModule
    const storeA = createWorkflowStore()
    const storeB = createWorkflowStore()

    // Emit a StrategistDecided-shaped view to advance store A to a1
    storeA.emit({
      kind: 'StrategistDecided',
      recordedDecisionId: '4083729',
      thesis: 'Test thesis',
    })

    expect(storeA.getSnapshot().status).toBe('a1')
    // Store B must remain idle — independent state
    expect(storeB.getSnapshot().status).toBe('idle')
  })
})

// ---- Stable-ref invariant ----

describe('Stable-ref invariant: getSnapshot() returns same ref between emits, new ref after emit', () => {
  it('same ref across repeated getSnapshot() with no emit (Object.is = true)', async () => {
    const { createWorkflowStore } = (await import(MODULE)) as WorkflowStoreModule
    const store = createWorkflowStore()
    const ref1 = store.getSnapshot()
    const ref2 = store.getSnapshot()
    expect(Object.is(ref1, ref2)).toBe(true)
  })

  it('NEW ref after emit (Object.is = false)', async () => {
    const { createWorkflowStore } = (await import(MODULE)) as WorkflowStoreModule
    const store = createWorkflowStore()
    const refBefore = store.getSnapshot()
    store.emit({
      kind: 'StrategistDecided',
      recordedDecisionId: '4083729',
      thesis: 'Test',
    })
    const refAfter = store.getSnapshot()
    expect(Object.is(refBefore, refAfter)).toBe(false)
  })
})

// ---- State machine transitions ----

describe('RunState transitions via emit()', () => {
  it('idle → a1 on StrategistDecided-view emit', async () => {
    const { createWorkflowStore } = (await import(MODULE)) as WorkflowStoreModule
    const store = createWorkflowStore()
    expect(store.getSnapshot().status).toBe('idle')

    store.emit({
      kind: 'StrategistDecided',
      recordedDecisionId: '4083729',
      thesis: 'Test thesis.',
    })

    expect(store.getSnapshot().status).toBe('a1')
    expect(store.getSnapshot().a1?.recordedDecisionId).toBe('4083729')
  })

  it('a1 → a2_decision on ExecutorDecided-view emit', async () => {
    const { createWorkflowStore } = (await import(MODULE)) as WorkflowStoreModule
    const store = createWorkflowStore()

    store.emit({ kind: 'StrategistDecided', recordedDecisionId: '4083729', thesis: 'T' })
    store.emit({
      kind: 'ExecutorDecided',
      hedgeLegParams: {
        marketLabel: 'wCOP/USDC',
        strikeWAD: '4.100',
        size: 100n,
        isLong: true,
        schoolLabel: 'Shiller macro-risk',
        rationale: 'Pool is representative.',
        payoff: { volToWidth: '5%', horizonBlocks: 100, tickSpacing: 60, asset: 'token0' },
        maxLoss: '= prima',
        upside: 'ilimitado',
        marginDelta: { token0: 0n, token1: 0n },
      },
    })

    expect(store.getSnapshot().status).toBe('a2_decision')
  })

  it('a2_decision → minting on confirm action', async () => {
    const { createWorkflowStore } = (await import(MODULE)) as WorkflowStoreModule
    const store = createWorkflowStore()

    store.emit({ kind: 'StrategistDecided', recordedDecisionId: '4083729', thesis: 'T' })
    store.emit({
      kind: 'ExecutorDecided',
      hedgeLegParams: {
        marketLabel: 'wCOP/USDC',
        strikeWAD: '4.100',
        size: 100n,
        isLong: true,
        schoolLabel: 'Shiller macro-risk',
        rationale: 'Pool is representative.',
        payoff: { volToWidth: '5%', horizonBlocks: 100, tickSpacing: 60, asset: 'token0' },
        maxLoss: '= prima',
        upside: 'ilimitado',
        marginDelta: { token0: 0n, token1: 0n },
      },
    })
    store.emit({ kind: 'confirm' })

    expect(store.getSnapshot().status).toBe('minting')
  })

  it('minting → done on PositionMinted-view emit', async () => {
    const { createWorkflowStore } = (await import(MODULE)) as WorkflowStoreModule
    const store = createWorkflowStore()

    store.emit({ kind: 'StrategistDecided', recordedDecisionId: '4083729', thesis: 'T' })
    store.emit({
      kind: 'ExecutorDecided',
      hedgeLegParams: {
        marketLabel: 'wCOP/USDC',
        strikeWAD: '4.100',
        size: 100n,
        isLong: true,
        schoolLabel: 'Shiller macro-risk',
        rationale: 'Pool is representative.',
        payoff: { volToWidth: '5%', horizonBlocks: 100, tickSpacing: 60, asset: 'token0' },
        maxLoss: '= prima',
        upside: 'ilimitado',
        marginDelta: { token0: 0n, token1: 0n },
      },
    })
    store.emit({ kind: 'confirm' })
    store.emit({
      kind: 'PositionMinted',
      positionId: '999',
      marginToken0: -500000000000000000n,
      marginToken1: 1000000000000000000n,
    })

    expect(store.getSnapshot().status).toBe('done')
  })
})

// ---- subscribe / cleanup ----

describe('subscribe(listener): fires once per emit; cleanup stops notifications', () => {
  it('listener fires once per emit', async () => {
    const { createWorkflowStore } = (await import(MODULE)) as WorkflowStoreModule
    const store = createWorkflowStore()
    const listener = vi.fn()
    store.subscribe(listener)

    store.emit({ kind: 'StrategistDecided', recordedDecisionId: '4083729', thesis: 'T' })
    expect(listener).toHaveBeenCalledTimes(1)

    store.emit({
      kind: 'ExecutorDecided',
      hedgeLegParams: {
        marketLabel: 'wCOP/USDC',
        strikeWAD: '4.100',
        size: 100n,
        isLong: true,
        schoolLabel: 'Shiller macro-risk',
        rationale: 'Pool is representative.',
        payoff: { volToWidth: '5%', horizonBlocks: 100, tickSpacing: 60, asset: 'token0' },
        maxLoss: '= prima',
        upside: 'ilimitado',
        marginDelta: { token0: 0n, token1: 0n },
      },
    })
    expect(listener).toHaveBeenCalledTimes(2)
  })

  it('cleanup (returned unsubscribe) stops further notifications', async () => {
    const { createWorkflowStore } = (await import(MODULE)) as WorkflowStoreModule
    const store = createWorkflowStore()
    const listener = vi.fn()
    const cleanup = store.subscribe(listener)

    store.emit({ kind: 'StrategistDecided', recordedDecisionId: '4083729', thesis: 'T' })
    expect(listener).toHaveBeenCalledTimes(1)

    cleanup()

    store.emit({
      kind: 'ExecutorDecided',
      hedgeLegParams: {
        marketLabel: 'wCOP/USDC',
        strikeWAD: '4.100',
        size: 100n,
        isLong: true,
        schoolLabel: 'Shiller macro-risk',
        rationale: 'Pool is representative.',
        payoff: { volToWidth: '5%', horizonBlocks: 100, tickSpacing: 60, asset: 'token0' },
        maxLoss: '= prima',
        upside: 'ilimitado',
        marginDelta: { token0: 0n, token1: 0n },
      },
    })
    // Still 1 — cleanup worked
    expect(listener).toHaveBeenCalledTimes(1)
  })
})
