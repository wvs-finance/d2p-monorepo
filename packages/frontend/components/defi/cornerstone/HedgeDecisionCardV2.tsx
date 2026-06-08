'use client'

// HedgeDecisionCardV2 — Agent-2 mock decision card (Phase 8 — Module 4).
// Presentational; all copy threaded via CardV2Strings (no getTranslations inside).
// 'use client' — owns the Confirm button + onConfirm callback + confirmRef for Wave 2 focus.
//
// HONESTY INVARIANTS:
//   - fork-verified tier renders NEUTRAL only (never green/emerald/status-pass). CROSS-09.
//   - FlaskConical "mock · no en vivo" sub-label built INLINE (PILL_SHELL/NEUTRAL_CLASS not exported).
//   - Free-text rationale renders under an EXPLICIT "explicación (autoría humana)" label. BLOCKER RC-B2.
//   - Every mock numeric has an adjacent sibling ilustrativo label. No bare $. CROSS-09/LAB-05.
//   - No <details> anywhere. Full visual weight. LAB-05.
//   - strikeWAD rendered as formatted string from view model (no raw bigint to JSX). RC-M6.
//   - No card-nested-in-card. impeccable.

import { ProvenancePill } from '@/components/defi/ProvenanceBadge'
import type { HedgeLegParamsView } from '@/lib/apps/abrigo/cornerstone/events'
import { CheckCircle2, Circle, FlaskConical } from 'lucide-react'
import { type Ref, useRef } from 'react'

// ---------------------------------------------------------------------------
// CardV2Strings — all visible copy threaded from the route RSC page
// ---------------------------------------------------------------------------

export interface CardV2Strings {
  forkVerifiedLabel: string
  forkVerifiedAriaLabel: string
  mockSubLabel: string
  mockSubLabelAria: string
  humanAuthoredLabel: string
  marketLabel: string
  strikeLabel: string
  sizeLabel: string
  directionLabel: string
  schoolLabel: string
  volWidthLabel: string
  horizonLabel: string
  tickSpacingLabel: string
  assetLabel: string
  maxLossLabel: string
  upsideLabel: string
  marginLabel: string
  mockUnit: string
  confirmGateCaption: string
  confirmCta: string
  // D1 Davidson honesty split (09-03) — nonErgodicDisclosed pill + TEMPLATE rationale
  nonErgodicDisclosedLabel: string
  templateMarker: string // "(TEMPLATE)" marker prefix for the rationale
  booleanYesLabel: string // "sí" / "yes"
  booleanNoLabel: string // "no"
}

interface HedgeDecisionCardV2Props {
  view: HedgeLegParamsView
  strings: CardV2Strings
  onConfirm: () => void
  confirmRef?: Ref<HTMLButtonElement>
}

// ---------------------------------------------------------------------------
// BooleanPill — D1 Davidson honesty flag pill (CROSS-09 color+icon+text, never color-only).
// true → status-pass background + CheckCircle2 icon; false → surface + Circle icon.
// Used for nonErgodicDisclosed.
// NO <details>. Full visual weight. LAB-05. CROSS-09.
// ---------------------------------------------------------------------------

function BooleanPill({
  value,
  trueLabel,
  falseLabel,
}: {
  value: boolean
  trueLabel: string
  falseLabel: string
}) {
  if (value) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-normal ring-1 ring-inset text-status-pass ring-status-pass bg-status-pass/10">
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>{trueLabel}</span>
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-normal ring-1 ring-inset text-text-muted ring-border-default bg-bg-surface">
      <Circle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{falseLabel}</span>
    </span>
  )
}

// ---------------------------------------------------------------------------
// CARD_CLASS — inlined verbatim from HedgeDecisionCard.tsx (module-local there, not exported).
// Identical CROSS-09 equal-weight invariant.
// ---------------------------------------------------------------------------

const CARD_CLASS = 'rounded-lg border border-border-default bg-bg-surface p-4 space-y-4'

// ---------------------------------------------------------------------------
// DataRow — DT/DD pair reusing the HedgeDecisionCard idiom (inlined, not exported upstream).
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
// HedgeDecisionCardV2 component
// ---------------------------------------------------------------------------

export function HedgeDecisionCardV2({
  view,
  strings,
  onConfirm,
  confirmRef,
}: HedgeDecisionCardV2Props) {
  return (
    <article
      data-testid="hedge-decision-card-v2"
      className={CARD_CLASS}
      aria-label={strings.forkVerifiedAriaLabel}
    >
      {/* ------------------------------------------------------------------ */}
      {/* Header: fork-verified ProvenancePill + FlaskConical mock sub-label  */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex items-center gap-2 flex-wrap">
        <ProvenancePill
          tier="fork-verified"
          fieldName="agent2-decision"
          label={strings.forkVerifiedLabel}
          ariaLabel={strings.forkVerifiedAriaLabel}
        />

        {/* Inline neutral mock sub-label pill — verbatim shell string.
            PILL_SHELL/NEUTRAL_CLASS are module-local to the liveness pill — NOT importable.
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
      {/* Data rows — all HedgeLegParamsView fields at full visual weight     */}
      {/* No <details>. LAB-05. Each numeric + adjacent ilustrativo label.    */}
      {/* ------------------------------------------------------------------ */}
      <dl className="divide-y divide-border-default text-sm">
        <DataRow label={strings.marketLabel} value={view.marketLabel} />

        {/* strike: formatted "4.100" — never raw WAD integer. RC-M6. */}
        <DataRow label={strings.strikeLabel} value={view.strikeWAD} sibling={strings.mockUnit} />

        <DataRow label={strings.sizeLabel} value={String(view.size)} sibling={strings.mockUnit} />

        <DataRow label={strings.directionLabel} value={view.isLong ? 'Long' : 'Short'} />

        <DataRow label={strings.schoolLabel} value={view.schoolLabel} />

        <DataRow
          label={strings.volWidthLabel}
          value={view.payoff.volToWidth}
          sibling={strings.mockUnit}
        />

        <DataRow
          label={strings.horizonLabel}
          value={String(view.payoff.horizonBlocks)}
          sibling={strings.mockUnit}
        />

        <DataRow label={strings.tickSpacingLabel} value={String(view.payoff.tickSpacing)} />

        <DataRow label={strings.assetLabel} value={view.payoff.asset} />

        <DataRow label={strings.maxLossLabel} value={view.maxLoss} sibling={strings.mockUnit} />

        <DataRow label={strings.upsideLabel} value={view.upside} />

        {/* Margin delta — SIGNED int256 rendered as string (sign preserved). */}
        <DataRow
          label={strings.marginLabel}
          value={String(view.marginDelta.token0)}
          sibling={strings.mockUnit}
        />

        {/* ---------------------------------------------------------------- */}
        {/* D1 Davidson honesty split — nonErgodicDisclosed pill              */}
        {/* FULL WEIGHT — color+icon+text (CROSS-09). NO <details>. LAB-05. */}
        {/* ---------------------------------------------------------------- */}
        <div className="flex items-center justify-between gap-4 py-2">
          <dt className="text-text-muted text-sm">{strings.nonErgodicDisclosedLabel}</dt>
          <dd>
            <BooleanPill
              value={view.nonErgodicDisclosed}
              trueLabel={strings.booleanYesLabel}
              falseLabel={strings.booleanNoLabel}
            />
          </dd>
        </div>
      </dl>

      {/* ------------------------------------------------------------------ */}
      {/* Free-text rationale with (TEMPLATE) marker — D1 Davidson split.    */}
      {/* BLOCKER RC-B2: NEVER presented as live agent/LLM reasoning.        */}
      {/* The "(TEMPLATE)" marker is MANDATORY — sourced from the event str. */}
      {/* No <details>. Full visual weight. LAB-05.                           */}
      {/* ------------------------------------------------------------------ */}
      <section aria-labelledby="human-authored-label">
        <p id="human-authored-label" className="text-text-muted text-sm font-normal mb-1">
          {strings.humanAuthoredLabel}
        </p>
        <p className="text-text-muted text-xs font-mono mb-1">{strings.templateMarker}</p>
        <p className="text-text-primary text-sm">{view.rationale}</p>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Confirm foot: gate caption + primary CTA (ONLY accent fill).       */}
      {/* ≥44px hit target. confirmRef forwarded for Wave 2 focus-on-enter.  */}
      {/* ------------------------------------------------------------------ */}
      <footer className="space-y-2 pt-2">
        <p className="text-text-muted text-sm">{strings.confirmGateCaption}</p>
        <button
          ref={confirmRef}
          type="button"
          data-confirm="true"
          className="w-full min-h-[44px] bg-accent-default text-bg-canvas rounded-md px-4 py-2 text-sm font-medium hover:opacity-90 focus-visible:ring-2 focus-visible:ring-accent-default focus-visible:ring-offset-2"
          onClick={onConfirm}
        >
          {strings.confirmCta}
        </button>
      </footer>
    </article>
  )
}
