'use client'

// OnChainEvidencePanel — Surface 3.
// Rendered after confirmed state, below MintCard.
// Shows real on-chain mint evidence under fork-verified provenance (neutral, never green).
//
// HONESTY INVARIANTS:
//   - fork-verified pill: NEUTRAL — bg-surface / border-default / text-secondary. Never green.
//   - tx hash in IBM Plex Mono, truncated + copy button (44px touch target).
//   - Strike: formatScaledPercent output + raw tick "5.68% (tick 360360)".
//   - TokenId: mono + copy button.
//   - Back-ref disclosure (12px, muted) — NOT the full §0.2 (that's on the banner).
//   - No fake explorer link; only render if a real BuildBear URL is present.

import { GitFork } from 'lucide-react'
import { Copy } from 'lucide-react'
import { useState } from 'react'

export interface OnChainEvidencePanelStrings {
  heading: string
  forkVerifiedLabel: string
  txHashLabel: string
  strikeLabel: string
  tokenIdLabel: string
  copyHashAriaLabel: string
  copyTokenIdAriaLabel: string
  backRefDisclosure: string
}

interface OnChainEvidencePanelProps {
  txHash: `0x${string}`
  strikeFormatted: string // e.g. "5.68% (tick 360360)"
  tokenId: string // position ID as string
  explorerUrl?: string // real BuildBear URL, if available — never fake
  strings: OnChainEvidencePanelStrings
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function truncateHash(hash: string): string {
  if (hash.length <= 16) return hash
  return `${hash.slice(0, 10)}…${hash.slice(-6)}`
}

function CopyButton({ value, ariaLabel }: { value: string; ariaLabel: string }) {
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
// DataRow — dt/dd pair matching MintCard pattern
// ---------------------------------------------------------------------------

function DataRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-border-default last:border-b-0">
      <dt className="text-xs font-semibold text-text-muted leading-[1.4]">{label}</dt>
      <dd className="text-right flex items-center gap-1">{children}</dd>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Fork-verified provenance pill (neutral — never green)
// ---------------------------------------------------------------------------

function ForkVerifiedPill({ label }: { label: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded border border-border-default bg-bg-surface px-2 py-0.5 text-xs font-semibold text-text-secondary"
      aria-label={label}
    >
      <GitFork className="h-3 w-3 text-text-secondary" aria-hidden="true" />
      <span>{label}</span>
    </span>
  )
}

// ---------------------------------------------------------------------------
// OnChainEvidencePanel
// ---------------------------------------------------------------------------

export function OnChainEvidencePanel({
  txHash,
  strikeFormatted,
  tokenId,
  strings,
}: OnChainEvidencePanelProps) {
  return (
    <section
      className="rounded border border-border-default bg-bg-surface p-4 space-y-2"
      aria-label={strings.heading}
    >
      {/* Header row */}
      <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
        <h3 className="text-base font-semibold text-text-primary">{strings.heading}</h3>
        <ForkVerifiedPill label={strings.forkVerifiedLabel} />
      </div>

      {/* Data fields */}
      <dl className="divide-y divide-border-default">
        {/* Tx hash */}
        <DataRow label={strings.txHashLabel}>
          <span className="font-mono text-[13px] text-text-primary" title={txHash}>
            {truncateHash(txHash)}
          </span>
          <CopyButton value={txHash} ariaLabel={strings.copyHashAriaLabel} />
        </DataRow>

        {/* Strike */}
        <DataRow label={strings.strikeLabel}>
          <span className="text-sm text-text-primary font-semibold">{strikeFormatted}</span>
        </DataRow>

        {/* TokenId */}
        <DataRow label={strings.tokenIdLabel}>
          <span className="font-mono text-[13px] text-text-primary">{tokenId}</span>
          <CopyButton value={tokenId} ariaLabel={strings.copyTokenIdAriaLabel} />
        </DataRow>
      </dl>

      {/* Back-ref disclosure (12px, muted — NOT the full §0.2) */}
      <p className="text-[12px] font-semibold text-text-muted mt-2">{strings.backRefDisclosure}</p>
    </section>
  )
}
