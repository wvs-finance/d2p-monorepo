// liveness.ts — LivenessSource<T> useSyncExternalStore-shaped contract.
// Phase 7 ships snapshot + polling ONLY; live (honker-SSE) is DEFERRED.
// The native honker-node addon must NEVER enter package.json (it would break Turbopack/Vercel —
// the documented burn class). When honker ships (Phase 7.x), the frontend speaks plain EventSource.
//
// getServerSnapshot returns the stable seed so first paint == server text (no hydration mismatch).
// The pollingSource interval NEVER fires before mount (subscribe wires the interval, not the factory).

/**
 * LivenessSource<T> — useSyncExternalStore-shaped contract for swappable data sources.
 * Components call useSyncExternalStore(source.subscribe, source.getSnapshot, source.getServerSnapshot).
 *
 * Phase 7 liveness values: 'snapshot' (default) or 'polling' (SOMNIA_LIVE).
 * 'live' (honker-SSE) is DEFERRED — it must never appear in this file.
 */
export type LivenessSource<T> = {
  /** Sync seed for SSR + first paint. Must be a stable reference (no new object each call). */
  getSnapshot: () => T
  /**
   * Server-side snapshot — returns the same stable seed so the server-rendered text matches
   * the client's initial hydration output (prevents React hydration mismatch #418).
   */
  getServerSnapshot: () => T
  /**
   * useSyncExternalStore subscription callback.
   * - snapshot: immediate no-op unsubscribe (no interval, no event listener)
   * - polling: starts an interval; returns cleanup that clears it
   * - live (honker-SSE): DEFERRED — not implemented in Phase 7
   */
  subscribe: (onStoreChange: () => void) => () => void
  /** Liveness tier. Phase 7: 'snapshot' or 'polling' only. */
  readonly liveness: 'snapshot' | 'polling'
}

/**
 * snapshotSource(seed) — liveness='snapshot' realization.
 * Returns a LivenessSource that always serves the stable seed with no network or interval.
 * getServerSnapshot() === getSnapshot() === seed (same reference — no hydration mismatch).
 * subscribe() returns an immediate no-op cleanup.
 */
export function snapshotSource<T>(seed: T): LivenessSource<T> {
  return {
    getSnapshot: () => seed,
    getServerSnapshot: () => seed,
    subscribe: (_onStoreChange: () => void) => {
      // Snapshot: no interval, no event listener — immediate no-op cleanup.
      return () => {}
    },
    liveness: 'snapshot',
  }
}

/**
 * pollingSource(seed, intervalMs, fetcher) — liveness='polling' realization.
 * getSnapshot/getServerSnapshot return the stable seed until the first interval tick after mount.
 * subscribe() starts the polling interval and returns the cleanup.
 * The interval NEVER fires before subscribe() is called (no reads at factory time).
 */
export function pollingSource<T>(
  seed: T,
  intervalMs: number,
  fetcher: () => Promise<T>,
): LivenessSource<T> {
  // The current snapshot value. Starts as the stable seed.
  let current: T = seed

  return {
    getSnapshot: () => current,
    // Server and initial client paint both return the stable seed to avoid hydration mismatch.
    getServerSnapshot: () => seed,
    subscribe: (onStoreChange: () => void) => {
      const id = setInterval(async () => {
        try {
          const next = await fetcher()
          current = next
          onStoreChange()
        } catch {
          // Polling errors are silent — stale snapshot serves until next tick.
        }
      }, intervalMs)
      return () => clearInterval(id)
    },
    liveness: 'polling',
  }
}
