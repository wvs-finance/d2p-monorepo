// ManagementControls — RSC disabled management control group for LongGammaWrapper.
// RSC — no 'use client' needed; pure presentational.
//
// HONESTY INVARIANTS (Phase 07-02):
//   - EXACTLY 3 native <button disabled> elements: close / claim / agent.
//   - Each button: native disabled + aria-disabled="true" + its OWN aria-describedby
//     pointing at the single shared caption id (MAJOR-12 — 3 disabled, 3 aria-disabled, 3 aria-describedby).
//   - Perceivably disabled beyond color: Lock icon (lucide-react) inside each button.
//   - Neutral shell: text-text-muted border-border-default bg-bg-surface cursor-not-allowed opacity-60.
//   - NOT accent fill — not a primary CTA this phase.
//   - Persistent inline caption (one per group, always rendered, referenced by all 3 buttons).
//   - Rendered DOM MUST NOT contain: executed, realized, placed, ejecutad, realizad.
//   - No collapse disclosure (MAJOR-10: no details/summary allowed in this component).
//
// Props: pre-translated strings threaded from the RSC page.

import { Lock } from 'lucide-react'

// ---------------------------------------------------------------------------
// ManagementControlsStrings — all visible copy threaded from the RSC page
// ---------------------------------------------------------------------------

export interface ManagementControlsStrings {
  close: string
  claim: string
  agent: string
  /** Persistent inline caption. Referenced by all 3 buttons via aria-describedby. */
  caption: string
}

interface ManagementControlsProps {
  strings: ManagementControlsStrings
}

// ---------------------------------------------------------------------------
// Stable caption id — referenced by all three aria-describedby attributes
// ---------------------------------------------------------------------------

const CAPTION_ID = 'management-not-live-caption'

// Neutral disabled button shell (color + icon + text — CROSS-09; reduced opacity NOT sole cue)
const BUTTON_CLASS =
  'inline-flex items-center gap-2 rounded-md border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-muted cursor-not-allowed opacity-60'

// ---------------------------------------------------------------------------
// ManagementControls component
// ---------------------------------------------------------------------------

export function ManagementControls({ strings }: ManagementControlsProps) {
  // The three management actions: close / claim / agent.
  // All three are disabled this phase (wrapper not deployed; no transact path exists).
  // Rendered text MUST NOT contain: executed, realized, placed, ejecutad, realizad.
  // Button labels use the safe copy from the UI-SPEC: Cerrar/Close, Reclamar/Claim, Agent control.
  const buttons: Array<{ key: string; label: string }> = [
    { key: 'close', label: strings.close },
    { key: 'claim', label: strings.claim },
    { key: 'agent', label: strings.agent },
  ]

  return (
    <div data-testid="management-controls" className="space-y-3">
      {/* ------------------------------------------------------------------ */}
      {/* Three disabled buttons — EXACTLY 3 (MAJOR-12)                      */}
      {/* Each has: native disabled + aria-disabled="true" + aria-describedby*/}
      {/* + Lock icon (color + icon + text — CROSS-09 a11y)                  */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-wrap gap-2">
        {buttons.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            disabled
            aria-disabled="true"
            aria-describedby={CAPTION_ID}
            className={BUTTON_CLASS}
          >
            <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Persistent inline caption — always rendered (not tooltip-only).     */}
      {/* Referenced by all three buttons via aria-describedby={CAPTION_ID}. */}
      {/* Explains WHY the controls are unavailable (fork-verified, not live) */}
      {/* ------------------------------------------------------------------ */}
      <p id={CAPTION_ID} className="text-sm text-text-muted">
        {strings.caption}
      </p>
    </div>
  )
}
