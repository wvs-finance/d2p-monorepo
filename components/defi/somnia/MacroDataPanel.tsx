// MacroDataPanel — RSC rendering latest Somnia-testnet CPI + MacroReceived history.
// RSC — no 'use client'. No wallet dependency. Reads through Wave-0 reader seam.
//
// HONESTY INVARIANTS (CROSS-09 / B3):
//   - ONLY co/inflation-rate (CPI) is rendered. Capacity-utilization is NOT wired — rendering
//     it would be fabrication. No capacity row or label anywhere.
//   - Print timestamp is ALWAYS "—" (em-dash). MacroOracle.observedAt is structurally 0 by
//     contract design (B3). There is NO observedAt field on MacroPrintView. The only date
//     shown is capturedAt, labeled "captured"/"capturado" — NEVER "observed"/"observado".
//   - Null / missing fields render as "—", NEVER as "0".
//   - testnet-agent pill uses NEUTRAL token (not green). Color + icon + text + aria-label.
//
// Props: locale + pre-translated strings passed from the RSC page (presentational component
//        pattern — keeps MacroDataPanel free of getTranslations calls, mirrors InstrumentDetail).

import { ProvenancePill } from '@/components/defi/ProvenanceBadge'
import { formatScaledPercent } from '@/lib/apps/abrigo/somnia/format'
import {
  getLatestMacroPrint,
  getMacroHistory,
  getSnapshotProvenance,
} from '@/lib/apps/abrigo/somnia/reader'

// ---------------------------------------------------------------------------
// MacroPanelStrings — all visible copy threaded from the RSC page
// ---------------------------------------------------------------------------

export interface MacroPanelStrings {
  heading: string
  dataKeyLabel: string
  latestValue: string
  history: string
  capturedLabel: string
  printTimestampLabel: string
  printTimestampUnavailable: string
  provenanceLabel: string
  provenanceAriaLabel: string
  caveat: string
  emptyState: string
}

interface MacroDataPanelProps {
  locale: string
  strings: MacroPanelStrings
}

// ---------------------------------------------------------------------------
// Date formatter for capturedAt — locale-aware
// ---------------------------------------------------------------------------

function formatCapturedAt(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date)
}

// ---------------------------------------------------------------------------
// MacroDataPanel component
// ---------------------------------------------------------------------------

export function MacroDataPanel({ locale, strings }: MacroDataPanelProps) {
  const latest = getLatestMacroPrint()
  const history = getMacroHistory()
  const provenance = getSnapshotProvenance()

  return (
    <section data-testid="macro-data-panel" aria-label={strings.heading} className="space-y-6">
      {/* Panel heading */}
      <h2 className="text-xl font-semibold text-text-primary">{strings.heading}</h2>

      {/* Caveat — operator-honest disclaimer (CROSS-09) */}
      <p className="text-sm text-text-muted">{strings.caveat}</p>

      {/* ------------------------------------------------------------------ */}
      {/* Latest CPI print                                                    */}
      {/* ------------------------------------------------------------------ */}
      <div className="rounded-lg border border-border-default bg-bg-surface p-4 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-text-secondary">{strings.latestValue}</p>
          <ProvenancePill
            tier="testnet-agent"
            fieldName="latestMacroValue"
            label={strings.provenanceLabel}
            ariaLabel={strings.provenanceAriaLabel}
            subState={provenance.subState}
          />
        </div>

        {/* Key label row */}
        <dl className="divide-y divide-border-default">
          <div className="flex items-start justify-between gap-4 py-3">
            <dt className="text-sm text-text-muted">{strings.dataKeyLabel}</dt>
            <dd className="font-mono text-sm text-text-primary">
              {latest.dataKeyLabel ?? strings.emptyState}
            </dd>
          </div>

          {/* scaledValue formatted as percent */}
          <div className="flex items-start justify-between gap-4 py-3">
            <dt className="text-sm text-text-muted">{strings.latestValue}</dt>
            <dd
              className="font-mono text-sm font-semibold text-text-primary"
              data-testid="latest-scaled-value"
            >
              {latest.scaledValue != null
                ? formatScaledPercent(latest.scaledValue, locale)
                : strings.emptyState}
            </dd>
          </div>

          {/* capturedAt — the ONLY timestamp; labeled "captured"/"capturado" (never "observed") */}
          <div className="flex items-start justify-between gap-4 py-3">
            <dt className="text-sm text-text-muted">{strings.capturedLabel}</dt>
            <dd className="font-mono text-sm text-text-primary">
              {latest.capturedAt ? formatCapturedAt(latest.capturedAt, locale) : strings.emptyState}
            </dd>
          </div>

          {/* B3 — print timestamp (observedAt) ALWAYS renders as em-dash.
              MacroOracle.observedAt is structurally 0 by contract design.
              MacroPrintView has NO observedAt field — there is no real observation time.
              This cell MUST be "—"; never substitute any other date. */}
          <div className="flex items-start justify-between gap-4 py-3">
            <dt className="sr-only">{strings.printTimestampLabel}</dt>
            <dd
              className="font-mono text-sm text-text-muted"
              data-testid="print-timestamp"
              aria-label={strings.printTimestampUnavailable}
            >
              {/* B3: unconditional em-dash */}
              {'—'}
            </dd>
          </div>
        </dl>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* MacroReceived history                                               */}
      {/* ------------------------------------------------------------------ */}
      <div className="space-y-2">
        <h3 className="text-base font-medium text-text-secondary">{strings.history}</h3>

        {history.length === 0 ? (
          <p className="text-sm text-text-muted">{strings.emptyState}</p>
        ) : (
          <div className="divide-y divide-border-default rounded-lg border border-border-default">
            {history.map((entry, idx) => (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: stable order from snapshot
                key={idx}
                className="flex items-start justify-between gap-4 px-4 py-3"
              >
                <div className="space-y-0.5">
                  <p className="text-sm text-text-muted">
                    {entry.dataKeyLabel ?? strings.emptyState}
                  </p>
                  {entry.capturedAt ? (
                    <p className="text-xs text-text-muted">
                      {strings.capturedLabel}: {formatCapturedAt(entry.capturedAt, locale)}
                    </p>
                  ) : null}
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className="font-mono text-sm text-text-primary"
                    data-testid="history-scaled-value"
                  >
                    {entry.scaledValue != null
                      ? formatScaledPercent(entry.scaledValue, locale)
                      : strings.emptyState}
                  </span>
                  <ProvenancePill
                    tier="testnet-agent"
                    fieldName={`history-${idx}`}
                    label={strings.provenanceLabel}
                    ariaLabel={strings.provenanceAriaLabel}
                    subState="recorded"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Component A mount slot — 06-02 will add the HedgeDecisionFeed here */}
      {/* ------------------------------------------------------------------ */}
      {/* MOUNT SLOT: <HedgeDecisionFeed locale={locale} strings={decisionStrings} /> */}
    </section>
  )
}
