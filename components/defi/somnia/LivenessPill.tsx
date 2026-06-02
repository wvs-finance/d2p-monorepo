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
// Props: source (LivenessSource<string>) + pre-translated strings threaded from the page.
// Default source: snapshotSource (liveness='snapshot').
// Placed in the page header by 07-03 — not inside the trace panels.

import type { LivenessSource } from '@/lib/apps/abrigo/somnia/liveness'
import { CircleDashed, RefreshCw } from 'lucide-react'
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
  /** The LivenessSource driving this pill. Default: snapshotSource (not-deployed, no polling). */
  source: LivenessSource<string>
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

export function LivenessPill({ source, strings }: LivenessPillProps) {
  // useSyncExternalStore with three arguments:
  //   1. subscribe — wires the interval (for polling) or no-op (for snapshot)
  //   2. getSnapshot — sync read (client)
  //   3. getServerSnapshot — stable seed so server + first client paint match (MAJOR-8)
  //
  // The third argument prevents React hydration mismatch #418:
  //   - snapshotSource: getServerSnapshot() === getSnapshot() === seed (same reference)
  //   - pollingSource: getServerSnapshot() returns the stable seed (not the interval value)
  useSyncExternalStore(source.subscribe, source.getSnapshot, source.getServerSnapshot)

  // Determine render state from source.liveness (snapshot or polling)
  // 'live' is structurally absent this phase — no branch for it.
  const liveness = source.liveness

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
