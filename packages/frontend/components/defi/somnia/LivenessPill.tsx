'use client'

// LivenessPill — client island rendering the liveness state of the Somnia data surface.
// MUST be 'use client' — consumes useSyncExternalStore (a client-only React hook).
//
// HONESTY INVARIANTS (Phase 07-02):
//   - Renders ONLY snapshot and polling states this phase.
//   - 'live' state (honker-SSE) is DEFERRED — no branch for it exists in Phase 7.
//   - MAJOR-8: getServerSnapshot is the stable seed — first client paint matches server text.
//     No interval fires before subscribe() is called (no reads at factory time).
//   - CROSS-09: color + icon + text + aria-label. Neutral className for both states.
//   - No non-muted color token (neutral only — NEVER accent/non-default ring).
//   - No collapse disclosure (MAJOR-10).
//
// Props: liveness ('snapshot' | 'polling') + pre-translated strings threaded from the page.
//   liveness is a plain serializable string — safe to cross the RSC→client boundary.
//   The LivenessSource is created INSIDE this client component (functions cannot cross
//   the RSC serialization boundary as props — React RSC-to-client constraint).
// Default liveness: 'snapshot' (not-deployed, no polling).
// Placed in the page header by 07-03 — not inside the trace panels.

import { snapshotSource } from '@/lib/apps/abrigo/somnia/liveness'
import { CircleDashed, RefreshCw } from 'lucide-react'
import { useMemo } from 'react'
import { useSyncExternalStore } from 'react'

// ---------------------------------------------------------------------------
// LivenessPillStrings — all visible copy threaded from the RSC page
// ---------------------------------------------------------------------------

export interface LivenessPillStrings {
  /** Visible text for snapshot state: "snapshot · —" / "instantánea · —" */
  snapshot: string
  /** Visible text for polling state: "polling" / "sondeo" */
  polling: string
  /** aria-label for snapshot state */
  ariaSnapshot: string
  /** aria-label for polling state */
  ariaPolling: string
}

interface LivenessPillProps {
  /**
   * The liveness tier. Phase 7: 'snapshot' (default) or 'polling' (SOMNIA_LIVE).
   * A plain serializable string — safe to cross the RSC→client serialization boundary.
   * The LivenessSource is constructed inside this client component (not passed as a prop).
   */
  liveness?: 'snapshot' | 'polling'
  strings: LivenessPillStrings
}

// ---------------------------------------------------------------------------
// CROSS-09 pill shell — verbatim from WalletStatusPill (invariant)
// ---------------------------------------------------------------------------

const PILL_SHELL =
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-normal ring-1 ring-inset'

// Neutral className for both snapshot and polling states (NEVER non-muted/accent/non-default ring)
const NEUTRAL_CLASS = 'text-text-muted ring-border-default bg-bg-surface'

// ---------------------------------------------------------------------------
// LivenessPill component
// ---------------------------------------------------------------------------

export function LivenessPill({ liveness = 'snapshot', strings }: LivenessPillProps) {
  // Create the LivenessSource inside the client component.
  // Functions cannot cross the RSC serialization boundary as props — this is the fix.
  // useMemo ensures the source is stable across re-renders (seed is the snapshot text).
  const source = useMemo(() => snapshotSource(strings.snapshot), [strings.snapshot])

  // useSyncExternalStore with three arguments:
  //   1. subscribe — wires the interval (for polling) or no-op (for snapshot)
  //   2. getSnapshot — sync read (client)
  //   3. getServerSnapshot — stable seed so server + first client paint match (MAJOR-8)
  //
  // The third argument prevents React hydration mismatch #418:
  //   snapshotSource: getServerSnapshot() === getSnapshot() === seed (same reference)
  useSyncExternalStore(source.subscribe, source.getSnapshot, source.getServerSnapshot)

  // Determine render state from liveness prop (snapshot or polling)
  // 'live' is structurally absent this phase — no branch for it.

  if (liveness === 'polling') {
    return (
      <span className={`${PILL_SHELL} ${NEUTRAL_CLASS}`} aria-label={strings.ariaPolling}>
        <RefreshCw className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>{strings.polling}</span>
      </span>
    )
  }

  // Default: snapshot state (liveness === 'snapshot')
  return (
    <span className={`${PILL_SHELL} ${NEUTRAL_CLASS}`} aria-label={strings.ariaSnapshot}>
      <CircleDashed className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{strings.snapshot}</span>
    </span>
  )
}
