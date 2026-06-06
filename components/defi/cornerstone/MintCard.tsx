'use client'

// MintCard — mock mint card (Phase 8 — Module 4).
// Presentational; all copy threaded via MintCardStrings (no getTranslations inside).
// 'use client' for consistency with HedgeDecisionCardV2 (both are client islands on the route).
//
// HONESTY INVARIANTS:
//   - fork-verified tier renders NEUTRAL only (never green/emerald/status-pass). CROSS-09.
//   - FlaskConical "mock · no en vivo" sub-label built INLINE (PILL_SHELL/NEUTRAL_CLASS not exported).
//   - Every mock numeric has an adjacent sibling ilustrativo label. No bare $. CROSS-09/LAB-05.
//   - No <details> anywhere. Full visual weight. LAB-05.
//   - TokenId / marginToken0 / marginToken1 rendered as strings (no raw bigint to JSX). RC-M6.
//   - No card-nested-in-card. impeccable.

import { ProvenancePill } from '@/components/defi/ProvenanceBadge'
import type { PositionMintedView } from '@/lib/apps/abrigo/cornerstone/events'
import { FlaskConical } from 'lucide-react'

// ---------------------------------------------------------------------------
// MintCardStrings — all visible copy threaded from the route RSC page
// ---------------------------------------------------------------------------

export interface MintCardStrings {
  forkVerifiedLabel: string
  forkVerifiedAriaLabel: string
  mockSubLabel: string
  mockSubLabelAria: string
  tokenIdLabel: string
  marginToken0Label: string
  marginToken1Label: string
  mockUnit: string
  marketLabel?: string
  strikeLabel?: string
  isLongLabel?: string
  cardHeading?: string
}

interface MintCardProps {
  mint: PositionMintedView
  strings: MintCardStrings
}

// ---------------------------------------------------------------------------
// CARD_CLASS — inlined verbatim from HedgeDecisionCard.tsx (module-local there, not exported).
// ---------------------------------------------------------------------------

const CARD_CLASS = 'rounded-lg border border-border-default bg-bg-surface p-4 space-y-4'

// ---------------------------------------------------------------------------
// DataRow — DT/DD pair (inlined — not exported from HedgeDecisionCard)
// ---------------------------------------------------------------------------

function DataRow({
  label,
  value,
  sibling,
}: {
  label: string
  value: string
  sibling?: string
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <dt className="text-text-muted text-sm">{label}</dt>
      <dd className="font-mono text-text-primary text-sm flex items-center gap-1.5">
        <span>{value}</span>
        {sibling !== undefined && sibling !== '' && (
          <span className="text-text-muted text-sm font-normal">{sibling}</span>
        )}
      </dd>
    </div>
  )
}

// ---------------------------------------------------------------------------
// MintCard component
// ---------------------------------------------------------------------------

export function MintCard({ mint, strings }: MintCardProps) {
  return (
    <article
      data-testid="mint-card"
      className={CARD_CLASS}
      aria-label={strings.forkVerifiedAriaLabel}
    >
      {/* ------------------------------------------------------------------ */}
      {/* Header: fork-verified ProvenancePill + FlaskConical mock sub-label  */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex items-center gap-2 flex-wrap">
        <ProvenancePill
          tier="fork-verified"
          fieldName="mint-position"
          label={strings.forkVerifiedLabel}
          ariaLabel={strings.forkVerifiedAriaLabel}
        />

        {/* Inline neutral mock sub-label pill — verbatim shell string.
            PILL_SHELL/NEUTRAL_CLASS are module-local to LivenessPill — NOT importable.
            Color + icon + text + aria-label (CROSS-09). Never green/amber. */}
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-normal ring-1 ring-inset text-text-muted ring-border-default bg-bg-surface"
          aria-label={strings.mockSubLabelAria}
        >
          <FlaskConical className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{strings.mockSubLabel}</span>
        </span>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Data rows — TokenId, margin deltas (SIGNED, sign preserved).       */}
      {/* No <details>. LAB-05. Each numeric + adjacent ilustrativo label.    */}
      {/* ------------------------------------------------------------------ */}
      <dl className="divide-y divide-border-default text-sm">
        {/* TokenId — rendered as string (no raw bigint). RC-M6. */}
        <DataRow label={strings.tokenIdLabel} value={mint.positionId} sibling={strings.mockUnit} />

        {/* marginToken0 — SIGNED int256; sign preserved. */}
        <DataRow
          label={strings.marginToken0Label}
          value={String(mint.marginToken0)}
          sibling={strings.mockUnit}
        />

        {/* marginToken1 — SIGNED int256; sign preserved. */}
        <DataRow
          label={strings.marginToken1Label}
          value={String(mint.marginToken1)}
          sibling={strings.mockUnit}
        />
      </dl>
    </article>
  )
}
