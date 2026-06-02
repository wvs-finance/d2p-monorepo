// HedgeDecisionCard — RSC presentational card for a single HedgeDecisionMade event.
// RSC — no 'use client'. Pure presentational; all data passed as props.
//
// HONESTY INVARIANTS (CROSS-09 / M4):
//   - consensus is labeled "operator-supplied" — NEVER market consensus or validator consensus.
//   - surprise appears ONLY within the subtree that also carries the operator-supplied caveat.
//   - All four actions (HOLD / ADD_LONG_GAMMA / REDUCE / EXIT) render at IDENTICAL visual weight —
//     same card dimensions, same typography hierarchy, same badge shell. CROSS-09 anti-fishing.
//   - pending === true → render "pending"/"pendiente" badge + em-dash for action/size/surprise.
//   - Pills: color + icon + text + aria-label (never color alone). CROSS-09.
//   - M4: copy and aria-labels must never claim validator consensus was proven.
//
// Props:
//   decision  — HedgeDecisionView from the Wave-0 reader seam
//   strings   — pre-translated strings threaded from RSC page (DecisionCardStrings)
//   locale    — for BigInt formatting at the edge (not currently used but kept for consistency)

import { ProvenancePill } from '@/components/defi/ProvenanceBadge'
import { computeSurprise, formatSurprise } from '@/lib/apps/abrigo/somnia/surprise'
import type { HedgeActionLabel, HedgeDecisionView } from '@/lib/apps/abrigo/somnia/types'

// ---------------------------------------------------------------------------
// DecisionCardStrings — all visible copy threaded from the RSC page
// ---------------------------------------------------------------------------

export interface DecisionCardStrings {
  actionLabel: Record<HedgeActionLabel, string>
  sizeBpsLabel: string
  macroLabel: string
  consensusLabel: string
  /** The operator-supplied caveat sentence — MUST appear adjacent to the consensus row. */
  consensusCaveat: string
  surpriseLabel: string
  pendingLabel: string
  provenanceLabel: string
  provenanceAriaLabel: string
  emptyState: string
}

interface HedgeDecisionCardProps {
  decision: HedgeDecisionView
  strings: DecisionCardStrings
  locale: string
}

// ---------------------------------------------------------------------------
// Action badge — single shared shell; only icon text and neutral-equal-prominence
// color token vary. Size/weight IDENTICAL for every action (anti-fishing CROSS-09).
// ---------------------------------------------------------------------------

// Action badge icons: all text-only (monospace single char) — keeps weight equal.
// We use icon characters rather than Lucide icons to make equal-weight enforcement
// structurally trivial (the icon is inside the SAME shell as the label).
const ACTION_ICON: Record<HedgeActionLabel, string> = {
  HOLD: '≡',
  ADD_LONG_GAMMA: '↑',
  REDUCE: '↓',
  EXIT: '✕',
}

function ActionBadge({
  action,
  label,
  pending,
  pendingLabel,
  emptyState,
}: {
  action: HedgeActionLabel
  label: string
  pending: boolean
  pendingLabel: string
  emptyState: string
}) {
  if (pending) {
    return (
      <span
        data-testid="action-value"
        // NEUTRAL token — not green, not red — identical to every other pending state
        className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm font-medium ring-1 ring-inset text-text-muted ring-border-default bg-bg-surface"
        aria-label={pendingLabel}
      >
        <span aria-hidden="true">{'○'}</span>
        <span>{pendingLabel}</span>
      </span>
    )
  }

  // CROSS-09: color + icon + text + aria-label. Equal shell for every action.
  // The icon char and label text differ; the className is IDENTICAL for all actions
  // (neutral token — no ADD_LONG_GAMMA emphasis relative to REDUCE/EXIT/HOLD).
  return (
    <span
      data-testid="action-value"
      className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm font-medium ring-1 ring-inset text-text-muted ring-border-default bg-bg-surface"
      aria-label={label}
    >
      <span aria-hidden="true">{ACTION_ICON[action]}</span>
      <span>{label}</span>
    </span>
  )
}

// ---------------------------------------------------------------------------
// HedgeDecisionCard component
// ---------------------------------------------------------------------------

// CROSS-09: the card root className must be IDENTICAL for every action.
// No conditional emphasis. This is the single source of truth for equal visual weight.
const CARD_CLASS = 'rounded-lg border border-border-default bg-bg-surface p-4 space-y-4'

export function HedgeDecisionCard({ decision, strings, locale: _locale }: HedgeDecisionCardProps) {
  const isPending = decision.pending

  // Surprise — computed in BigInt space, formatted at this edge.
  // Only rendered when NOT pending (pending → em-dash).
  const surpriseValue = isPending ? null : computeSurprise(decision.macroValue, decision.consensus)
  const surpriseFormatted = surpriseValue !== null ? formatSurprise(surpriseValue) : null

  return (
    <article
      data-testid="decision-card"
      // CROSS-09: this className is intentionally the same for every action.
      // Do NOT add action-specific emphasis here.
      className={CARD_CLASS}
      aria-label={
        isPending
          ? strings.pendingLabel
          : `${strings.actionLabel[decision.action]} — ${strings.sizeBpsLabel}: ${String(decision.sizeBps)}`
      }
    >
      {/* ------------------------------------------------------------------ */}
      {/* Header row: provenance pill + action badge                          */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <ProvenancePill
          tier="testnet-agent"
          fieldName={`decision-${decision.decisionId}`}
          label={strings.provenanceLabel}
          ariaLabel={strings.provenanceAriaLabel}
          subState="recorded"
        />

        <ActionBadge
          action={decision.action}
          label={strings.actionLabel[decision.action]}
          pending={isPending}
          pendingLabel={strings.pendingLabel}
          emptyState={strings.emptyState}
        />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Data rows: macro print → consensus (+caveat) → surprise → sizeBps  */}
      {/* ------------------------------------------------------------------ */}
      <dl className="divide-y divide-border-default text-sm">
        {/* Macro print */}
        <div className="flex items-start justify-between gap-4 py-2">
          <dt className="text-text-muted">{strings.macroLabel}</dt>
          <dd className="font-mono text-text-primary">
            {isPending ? strings.emptyState : String(decision.macroValue)}
          </dd>
        </div>

        {/* Consensus + operator-supplied caveat (M4 honesty invariant).
            The caveat is ALWAYS adjacent to the consensus row — gating the surprise
            display. M4: label this as operator-supplied, not market or validator consensus. */}
        <div className="flex items-start justify-between gap-4 py-2">
          <dt className="text-text-muted space-y-0.5">
            <span>{strings.consensusLabel}</span>
            {/* Operator caveat — visible text, not just aria-label (M4) */}
            <span className="block text-xs text-text-muted">({strings.consensusCaveat})</span>
          </dt>
          <dd className="font-mono text-text-primary">
            {isPending ? strings.emptyState : String(decision.consensus)}
          </dd>
        </div>

        {/* Surprise — gated behind the operator-supplied caveat (same card subtree).
            The surprise row is data-testid="surprise-row" so tests can assert gating. */}
        <div data-testid="surprise-row" className="flex items-start justify-between gap-4 py-2">
          <dt className="text-text-muted">{strings.surpriseLabel}</dt>
          <dd className="font-mono text-text-primary">
            {isPending || surpriseFormatted === null ? strings.emptyState : surpriseFormatted}
          </dd>
        </div>

        {/* sizeBps */}
        <div className="flex items-start justify-between gap-4 py-2">
          <dt className="text-text-muted">{strings.sizeBpsLabel}</dt>
          <dd className="font-mono text-text-primary">
            {isPending ? strings.emptyState : String(decision.sizeBps)}
          </dd>
        </div>
      </dl>
    </article>
  )
}
