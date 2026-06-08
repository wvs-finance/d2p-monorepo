// workflow-store.ts — useSyncExternalStore-shaped store for the cornerstone workflow run.
//
// OWNS the reducer (emit → reduce → cache immutable RunState). One source of truth.
// FACTORY only — createWorkflowStore() returns a FRESH per-call instance.
// NO module-level mutable store instance exported (server-leak guard).
//
// Pattern mirrors liveness.ts LivenessSource<T> contract — NOT a reuse of LivenessSource
// (single-value store, wrong shape) — only the pattern.
//
// Stable-ref invariant (the Phase-7 hydration lesson):
//   - getSnapshot() returns the SAME ref between emits (Object.is true)
//   - getSnapshot() returns a NEW ref after each emit (Object.is false)
//   - getServerSnapshot() always returns the module-stable IDLE constant

import type { HedgeLegParamsView } from './events'

// ---------------------------------------------------------------------------
// RunState — immutable per emit
// ---------------------------------------------------------------------------

export type RunState =
  | { status: 'idle' }
  | {
      status: 'a1'
      a1: { recordedDecisionId: string; thesis: string }
    }
  | {
      status: 'a2_decision'
      a1: { recordedDecisionId: string; thesis: string }
      a2: HedgeLegParamsView
    }
  | {
      status: 'minting'
      a1: { recordedDecisionId: string; thesis: string }
      a2: HedgeLegParamsView
    }
  | {
      status: 'done'
      a1: { recordedDecisionId: string; thesis: string }
      a2: HedgeLegParamsView
      mint: {
        positionId: string
        marginToken0: bigint // SIGNED — may be negative
        marginToken1: bigint // SIGNED — may be negative
      }
    }

// ---------------------------------------------------------------------------
// IDLE — the module-level constant (the ONLY module-level state)
// This is returned by getServerSnapshot() to ensure SSR == first client paint.
// ---------------------------------------------------------------------------

/** Module-level IDLE constant — the ONLY exported module-level state. */
export const IDLE: RunState = Object.freeze({ status: 'idle' as const })

// ---------------------------------------------------------------------------
// Internal event shapes (from the view layer — what store.emit receives)
// ---------------------------------------------------------------------------

type StoreEvent =
  | { kind: 'StrategistDecided'; recordedDecisionId: string; thesis: string }
  | { kind: 'ExecutorDecided'; hedgeLegParams: HedgeLegParamsView }
  | { kind: 'confirm' }
  | {
      kind: 'PositionMinted'
      positionId: string
      marginToken0: bigint
      marginToken1: bigint
    }
  | { kind: 'reset' }

// ---------------------------------------------------------------------------
// reduce — the pure reducer (owned entirely by this store)
// ---------------------------------------------------------------------------

function reduce(state: RunState, event: StoreEvent): RunState {
  switch (event.kind) {
    case 'StrategistDecided': {
      // idle → a1
      if (state.status !== 'idle') return state
      return Object.freeze({
        status: 'a1' as const,
        a1: { recordedDecisionId: event.recordedDecisionId, thesis: event.thesis },
      })
    }

    case 'ExecutorDecided': {
      // a1 → a2_decision
      if (state.status !== 'a1') return state
      return Object.freeze({
        status: 'a2_decision' as const,
        a1: state.a1,
        a2: event.hedgeLegParams,
      })
    }

    case 'confirm': {
      // a2_decision → minting (user-gated)
      if (state.status !== 'a2_decision') return state
      return Object.freeze({
        status: 'minting' as const,
        a1: state.a1,
        a2: state.a2,
      })
    }

    case 'PositionMinted': {
      // minting → done
      if (state.status !== 'minting') return state
      return Object.freeze({
        status: 'done' as const,
        a1: state.a1,
        a2: state.a2,
        mint: {
          positionId: event.positionId,
          marginToken0: event.marginToken0, // SIGNED — preserved
          marginToken1: event.marginToken1, // SIGNED — preserved
        },
      })
    }

    case 'reset': {
      return IDLE
    }

    default: {
      return state
    }
  }
}

// ---------------------------------------------------------------------------
// WorkflowStore — the per-call instance shape
// ---------------------------------------------------------------------------

export type WorkflowStore = {
  subscribe: (onStoreChange: () => void) => () => void
  getSnapshot: () => RunState
  getServerSnapshot: () => RunState
  emit: (event: StoreEvent) => void
}

// ---------------------------------------------------------------------------
// createWorkflowStore — FACTORY (one fresh instance per call, no shared state)
// ---------------------------------------------------------------------------

/**
 * createWorkflowStore() — returns a FRESH workflow store instance.
 *
 * Two calls are INDEPENDENT — no shared module-level mutable state.
 * Server-leak guard: the only module-level state is the IDLE constant (frozen, never mutated).
 *
 * useSyncExternalStore contract:
 *   subscribe(listener) — registers a listener; returns cleanup
 *   getSnapshot() — returns cached RunState (stable ref between emits)
 *   getServerSnapshot() — returns IDLE (stable module-level constant, same ref always)
 *   emit(event) — reduces state, caches new RunState, notifies all listeners
 */
export function createWorkflowStore(): WorkflowStore {
  // Closure-local state — NEVER shared across instances
  let currentState: RunState = IDLE
  const listeners = new Set<() => void>()

  function subscribe(onStoreChange: () => void): () => void {
    listeners.add(onStoreChange)
    return () => {
      listeners.delete(onStoreChange)
    }
  }

  function getSnapshot(): RunState {
    // Returns the cached ref — stable between emits (Object.is true across calls)
    return currentState
  }

  function getServerSnapshot(): RunState {
    // Always returns the module-stable IDLE constant (same ref every call)
    // Ensures SSR == first client paint (React hydration #418 prevention)
    return IDLE
  }

  function emit(event: StoreEvent): void {
    const nextState = reduce(currentState, event)
    if (!Object.is(nextState, currentState)) {
      // New immutable RunState cached — getSnapshot() now returns a new ref
      currentState = nextState
      // Notify all subscribers exactly once per emit
      for (const listener of listeners) {
        listener()
      }
    }
  }

  return { subscribe, getSnapshot, getServerSnapshot, emit }
}
