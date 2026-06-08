'use client'

// LiveTxStateRow — Surface 2.
// One row per tx state: submitting / pending / confirmed / reverted / error.
// Appended to RunTranscript — never overwrites prior rows (append-only).
//
// HONESTY INVARIANTS:
//   - NO fake explorer link. Only render if a real BuildBear explorer URL is present.
//   - No hash on revert/error (tx never confirmed).
//   - status pills: color + icon + text (CROSS-09 — never color alone).
//   - Tx hash: IBM Plex Mono, truncated first-10 + last-6 + "…", full hash in title.
//   - Copy button: 44px touch target, aria-label.

import { CheckCircle2, Clock, Copy, ExternalLink, Loader2, XCircle } from 'lucide-react'
import { useState } from 'react'

export type TxState =
  | { status: 'submitting' }
  | { status: 'pending'; hash: `0x${string}` }
  | { status: 'confirmed'; hash: `0x${string}`; blockNumber?: string; explorerUrl?: string }
  | { status: 'reverted'; hash?: `0x${string}` }
  | { status: 'error'; reason?: string }

export interface LiveTxStateRowStrings {
  submitting: string
  pending: string
  confirmed: string
  confirmBlock: string
  reverted: string
  error: string
  copyHashAriaLabel: string
}

interface LiveTxStateRowProps {
  state: TxState
  strings: LiveTxStateRowStrings
}

// ---------------------------------------------------------------------------
// Hash display helpers
// ---------------------------------------------------------------------------

function truncateHash(hash: string): string {
  if (hash.length <= 16) return hash
  return `${hash.slice(0, 10)}…${hash.slice(-6)}`
}

function CopyButton({
  value,
  ariaLabel,
}: {
  value: string
  ariaLabel: string
}) {
  const [copied, setCopied] = useState(false)
  function handleCopy() {
    void navigator.clipboard.writeText(value).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }
  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={ariaLabel}
      className="inline-flex items-center justify-center h-11 w-11 rounded text-text-secondary hover:text-text-primary hover:ring-2 hover:ring-accent-default/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-default"
    >
      <Copy
        className={['h-4 w-4', copied ? 'text-status-pass' : ''].join(' ')}
        aria-hidden="true"
      />
    </button>
  )
}

// ---------------------------------------------------------------------------
// Pill shell — color+icon+text (CROSS-09 compliant)
// ---------------------------------------------------------------------------

type PillVariant = 'in-progress' | 'pass' | 'fail' | 'muted'

function StatePill({
  variant,
  icon,
  label,
}: {
  variant: PillVariant
  icon: React.ReactNode
  label: string
}) {
  const styles: Record<PillVariant, string> = {
    'in-progress':
      'bg-status-in-progress/10 border border-status-in-progress text-status-in-progress',
    pass: 'bg-status-pass/10 border border-status-pass text-status-pass',
    fail: 'bg-status-fail/10 border border-status-fail text-status-fail',
    muted: 'bg-bg-surface border border-border-default text-text-muted',
  }
  return (
    <span
      className={[
        'inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-semibold',
        styles[variant],
      ].join(' ')}
    >
      {icon}
      <span>{label}</span>
    </span>
  )
}

// ---------------------------------------------------------------------------
// LiveTxStateRow
// ---------------------------------------------------------------------------

export function LiveTxStateRow({ state, strings }: LiveTxStateRowProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 py-2" data-tx-state={state.status}>
      {state.status === 'submitting' && (
        <StatePill
          variant="in-progress"
          icon={<Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />}
          label={strings.submitting}
        />
      )}

      {state.status === 'pending' && (
        <>
          <StatePill
            variant="in-progress"
            icon={<Clock className="h-3 w-3" aria-hidden="true" />}
            label={strings.pending}
          />
          <span className="font-mono text-sm text-text-primary" title={state.hash}>
            {truncateHash(state.hash)}
          </span>
          <CopyButton value={state.hash} ariaLabel={strings.copyHashAriaLabel} />
        </>
      )}

      {state.status === 'confirmed' && (
        <>
          <StatePill
            variant="pass"
            icon={<CheckCircle2 className="h-3 w-3" aria-hidden="true" />}
            label={`${strings.confirmed}${state.blockNumber ? ` — ${strings.confirmBlock} ${state.blockNumber}` : ''}`}
          />
          <span className="font-mono text-sm text-text-primary" title={state.hash}>
            {truncateHash(state.hash)}
          </span>
          <CopyButton value={state.hash} ariaLabel={strings.copyHashAriaLabel} />
          {/* Real explorer link only — never construct a fake link */}
          {state.explorerUrl && (
            <a
              href={state.explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-text-secondary underline underline-offset-2 hover:text-text-primary transition-colors"
              aria-label="Ver transacción en explorador del fork"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          )}
        </>
      )}

      {state.status === 'reverted' && (
        <StatePill
          variant="fail"
          icon={<XCircle className="h-3 w-3" aria-hidden="true" />}
          label={strings.reverted}
        />
      )}

      {state.status === 'error' && (
        <StatePill
          variant="fail"
          icon={<XCircle className="h-3 w-3" aria-hidden="true" />}
          label={state.reason ? `${strings.error} ${state.reason}` : strings.error}
        />
      )}
    </div>
  )
}
