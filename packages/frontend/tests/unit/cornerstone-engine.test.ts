// @vitest-environment node
// RED stub — cornerstone workflow-engine (deterministic timed mock producer).
// Imports from lib/apps/abrigo/cornerstone/workflow-engine (does NOT exist yet — intentional RED).
// Excluded from tsconfig until Task 2 GREEN commit.
//
// Uses vi.useFakeTimers() for deterministic time control.
// Key assertions:
//   - runWorkflow emits StrategistDecided FIRST, then ExecutorDecided, in order
//   - PositionMinted is NOT auto-emitted before a user confirm signal (user-gated)
//   - After confirm, PositionMinted is emitted
//   - StrategistDecided recordedDecisionId matches the preset's mapped real id

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const MODULE = '@/lib/apps/abrigo/cornerstone/workflow-engine'

type RunWorkflowOptions = {
  confirm: Promise<void>
  clock?: unknown
}

type WorkflowEngineModule = {
  runWorkflow: (
    presetId: string,
    emit: (event: unknown) => void,
    options: RunWorkflowOptions,
  ) => Promise<void>
}

// The delays from Q4:
//   idle → a1: 600ms
//   a1 → a2: 1800ms
//   confirm gate: user-gated (no auto-delay)
//   minting → done: 1200ms

describe('runWorkflow — emission order and user-gated mint', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('emits StrategistDecided FIRST (within 600ms)', async () => {
    const { runWorkflow } = (await import(MODULE)) as WorkflowEngineModule

    const emitted: string[] = []
    let resolveConfirm!: () => void
    const confirmPromise = new Promise<void>((res) => {
      resolveConfirm = res
    })

    const enginePromise = runWorkflow(
      'infl-surprise-add',
      (ev) => {
        emitted.push((ev as { kind: string }).kind)
      },
      { confirm: confirmPromise },
    )

    // Advance to just past 600ms — StrategistDecided should fire
    await vi.advanceTimersByTimeAsync(650)

    expect(emitted[0]).toBe('StrategistDecided')

    // Resolve confirm so runWorkflow can finish (advances past sleep(1800) + sleep(1200))
    resolveConfirm()
    await vi.advanceTimersByTimeAsync(1900) // past sleep(1800)
    await vi.advanceTimersByTimeAsync(1300) // past sleep(1200) after mint
    await enginePromise.catch(() => {})
  })

  it('emits ExecutorDecided AFTER StrategistDecided (a1 → a2 delay ~1800ms)', async () => {
    const { runWorkflow } = (await import(MODULE)) as WorkflowEngineModule

    const emitted: string[] = []
    let resolveConfirm!: () => void
    const confirmPromise = new Promise<void>((res) => {
      resolveConfirm = res
    })

    const enginePromise = runWorkflow(
      'infl-surprise-add',
      (ev) => {
        emitted.push((ev as { kind: string }).kind)
      },
      { confirm: confirmPromise },
    )

    // Advance past both delays (600 + 1800 = 2400ms)
    await vi.advanceTimersByTimeAsync(2500)

    expect(emitted[0]).toBe('StrategistDecided')
    expect(emitted[1]).toBe('ExecutorDecided')

    resolveConfirm()
    await vi.advanceTimersByTimeAsync(1300) // past sleep(1200) after mint
    await enginePromise.catch(() => {})
  })

  it('PositionMinted is NOT emitted before user confirm (user-gated)', async () => {
    const { runWorkflow } = (await import(MODULE)) as WorkflowEngineModule

    const emitted: string[] = []
    let resolveConfirm!: () => void
    const confirmPromise = new Promise<void>((res) => {
      resolveConfirm = res
    })

    const enginePromise = runWorkflow(
      'infl-surprise-add',
      (ev) => {
        emitted.push((ev as { kind: string }).kind)
      },
      { confirm: confirmPromise },
    )

    // Advance well past both A1 and A2 delays
    await vi.advanceTimersByTimeAsync(5000)

    // PositionMinted must NOT have been emitted yet (confirm not called)
    expect(emitted).not.toContain('PositionMinted')

    // Now confirm
    resolveConfirm()
    await vi.advanceTimersByTimeAsync(1300) // past sleep(1200) after mint
    await enginePromise.catch(() => {})
  })

  it('PositionMinted is emitted after user confirms', async () => {
    const { runWorkflow } = (await import(MODULE)) as WorkflowEngineModule

    const emitted: string[] = []
    let resolveConfirm!: () => void
    const confirmPromise = new Promise<void>((res) => {
      resolveConfirm = res
    })

    const enginePromise = runWorkflow(
      'infl-surprise-add',
      (ev) => {
        emitted.push((ev as { kind: string }).kind)
      },
      { confirm: confirmPromise },
    )

    // Advance past A1 + A2 delays
    await vi.advanceTimersByTimeAsync(2500)

    // Confirm — triggering mint
    resolveConfirm()

    // Advance past minting delay (1200ms)
    await vi.advanceTimersByTimeAsync(1500)
    await enginePromise

    expect(emitted).toContain('PositionMinted')
    // Order: StrategistDecided → ExecutorDecided → PositionMinted
    const stratIdx = emitted.indexOf('StrategistDecided')
    const execIdx = emitted.indexOf('ExecutorDecided')
    const mintIdx = emitted.indexOf('PositionMinted')
    expect(stratIdx).toBeLessThan(execIdx)
    expect(execIdx).toBeLessThan(mintIdx)
  })

  it("StrategistDecided event's recordedDecisionId equals the preset's mapped real id (4083729 for infl-surprise-add)", async () => {
    const { runWorkflow } = (await import(MODULE)) as WorkflowEngineModule

    let stratDecidedEvent: unknown = null
    let resolveConfirm!: () => void
    const confirmPromise = new Promise<void>((res) => {
      resolveConfirm = res
    })

    const enginePromise = runWorkflow(
      'infl-surprise-add',
      (ev) => {
        if ((ev as { kind: string }).kind === 'StrategistDecided') {
          stratDecidedEvent = ev
        }
      },
      { confirm: confirmPromise },
    )

    await vi.advanceTimersByTimeAsync(700)

    expect(stratDecidedEvent).not.toBeNull()
    expect((stratDecidedEvent as { recordedDecisionId: string }).recordedDecisionId).toBe('4083729')

    resolveConfirm()
    await vi.advanceTimersByTimeAsync(1900) // past sleep(1800) for ExecutorDecided
    await vi.advanceTimersByTimeAsync(1300) // past sleep(1200) after mint
    await enginePromise.catch(() => {})
  })
})
