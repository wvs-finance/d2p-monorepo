'use client'

// ExecutorRationalePanel — Surface 4.
// Expandable panel (aria-expanded/aria-controls) showing GEOMETRY fields ONLY.
// Per D1 / UI-SPEC §5.2 + backend_handoff_v3:
//   - nonErgodicDisclosed + rationale are on the HedgeDecisionCardV2 at full weight.
//   - THIS panel contains: regimeZt, inflationAdjustment, strikeTick, regimeWidth, parametricHedged.
//   - requestId is NOT surfaced (sentinel 0 on direct path).
//
// HONESTY INVARIANTS:
//   - fork-verified pill: neutral (never green).
//   - Boolean pills: color+icon+text (CROSS-09).
//   - Panel may use expand/collapse (non-dispositional evidence appendix).
//   - 44px trigger minimum height.

import { CheckCircle2, ChevronDown, ChevronUp, Circle, GitFork } from 'lucide-react'
import { useId, useState } from 'react'

export interface ExecutorRationalePanelStrings {
  heading: string
  forkVerifiedLabel: string
  // Field labels
  regimeZtLabel: string
  inflationAdjustmentLabel: string
  strikeTickLabel: string
  regimeWidthLabel: string
  parametricHedgedLabel: string
  // regimeZt label map
  regimeLabels: Record<number, string>
  regimeLabelUnknown: string
  // Boolean pill labels
  booleanYes: string
  booleanNo: string
}

export interface ExecutorRationalePanelData {
  regimeZt: number
  inflationAdjustment: string // already formatted: "5.68%"
  strikeTick: number // SIGNED int24
  regimeWidth: number // SIGNED int24
  parametricHedged: boolean
}

interface ExecutorRationalePanelProps {
  data: ExecutorRationalePanelData
  strings: ExecutorRationalePanelStrings
  defaultExpanded?: boolean
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
// Boolean pill — color+icon+text (CROSS-09)
// ---------------------------------------------------------------------------

function BooleanPill({ value, yes, no }: { value: boolean; yes: string; no: string }) {
  if (value) {
    return (
      <span className="inline-flex items-center gap-1 rounded border border-status-pass bg-status-pass/10 px-2 py-0.5 text-xs font-semibold text-status-pass">
        <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
        <span>{yes}</span>
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded border border-border-default bg-bg-surface px-2 py-0.5 text-xs font-semibold text-text-muted">
      <Circle className="h-3 w-3" aria-hidden="true" />
      <span>{no}</span>
    </span>
  )
}

// ---------------------------------------------------------------------------
// DataRow
// ---------------------------------------------------------------------------

function DataRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 border-b border-border-default last:border-b-0">
      <dt className="text-xs font-semibold text-text-muted leading-[1.4] shrink-0">{label}</dt>
      <dd className="flex items-center gap-1">{children}</dd>
    </div>
  )
}

// ---------------------------------------------------------------------------
// ExecutorRationalePanel
// ---------------------------------------------------------------------------

export function ExecutorRationalePanel({
  data,
  strings,
  defaultExpanded = false,
}: ExecutorRationalePanelProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const panelId = useId()

  const regimeLabel = strings.regimeLabels[data.regimeZt] ?? strings.regimeLabelUnknown

  return (
    <section className="rounded border border-border-default bg-bg-surface overflow-hidden">
      {/* Trigger — 44px min height */}
      <button
        type="button"
        className="w-full flex items-center justify-between gap-3 px-4 bg-bg-surface text-left min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-default rounded-t"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={() => setExpanded((v) => !v)}
        style={{ minHeight: '44px' }}
      >
        <div className="flex items-center gap-3">
          <span className="text-base font-semibold text-text-primary">{strings.heading}</span>
          <ForkVerifiedPill label={strings.forkVerifiedLabel} />
        </div>
        {expanded ? (
          <ChevronUp
            className="h-4 w-4 text-accent-default shrink-0 transition-transform duration-200"
            aria-hidden="true"
          />
        ) : (
          <ChevronDown
            className="h-4 w-4 text-accent-default shrink-0 transition-transform duration-200"
            aria-hidden="true"
          />
        )}
      </button>

      {/* Expandable body */}
      {expanded && (
        <div id={panelId} className="border-t border-border-default px-4 pb-4">
          <dl className="divide-y divide-border-default">
            <DataRow label={strings.regimeZtLabel}>
              <span className="text-sm text-text-primary">{regimeLabel}</span>
            </DataRow>
            <DataRow label={strings.inflationAdjustmentLabel}>
              <span className="text-sm text-text-primary">{data.inflationAdjustment}</span>
            </DataRow>
            <DataRow label={strings.strikeTickLabel}>
              <span className="font-mono text-[13px] text-text-primary">{data.strikeTick}</span>
            </DataRow>
            <DataRow label={strings.regimeWidthLabel}>
              <span className="font-mono text-[13px] text-text-primary">{data.regimeWidth}</span>
            </DataRow>
            <DataRow label={strings.parametricHedgedLabel}>
              <BooleanPill
                value={data.parametricHedged}
                yes={strings.booleanYes}
                no={strings.booleanNo}
              />
            </DataRow>
          </dl>
        </div>
      )}
    </section>
  )
}
