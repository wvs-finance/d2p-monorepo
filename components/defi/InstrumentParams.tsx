// InstrumentParams — RSC, parameter table for a single AbrigoInstrument.
// Numeric values (strike, slope) in font-mono text-sm font-normal.
// Chain address in font-mono text-sm font-normal text-text-muted.
// Labels text-sm font-normal.
// No card-inside-card.
// Built here (05-03); wired on the detail page in 05-04.
// Wave 1: narrowed on kind — simulated renders name/id/chain rows only;
//   live renders full 6 rows. Full Panoptic fork-param rows are Wave 3 / Plan 05.1-03.

import type { AbrigoInstrument } from '@/lib/apps/abrigo/instruments'

export interface InstrumentParamLabels {
  id: string
  chain: string
  strike: string
  slope: string
  deployed_at: string
  name: string
}

interface InstrumentParamsProps {
  instrument: AbrigoInstrument
  labels: InstrumentParamLabels
  /** 'es-CO' | 'en' — used for locale-aware display name */
  locale: string
}

export function InstrumentParams({ instrument, labels, locale }: InstrumentParamsProps) {
  const displayName = locale.startsWith('es') ? instrument.name : instrument.nameEn

  // Shared rows (present for both live and simulated)
  const sharedRows: Array<{ label: string; value: React.ReactNode }> = [
    {
      label: labels.name,
      value: <span className="text-sm font-normal text-text-primary">{displayName}</span>,
    },
    {
      label: labels.id,
      value: <span className="font-mono text-sm font-normal text-text-muted">{instrument.id}</span>,
    },
    {
      label: labels.chain,
      value: (
        <span className="font-mono text-sm font-normal text-text-muted">{instrument.chainId}</span>
      ),
    },
  ]

  // Live-only rows — only read strike/slope/deployedAt inside the live guard
  const liveRows: Array<{ label: string; value: React.ReactNode }> =
    instrument.kind === 'live'
      ? [
          {
            label: labels.strike,
            value: (
              <span className="font-mono text-sm font-normal text-text-primary">
                {instrument.strike}
              </span>
            ),
          },
          {
            label: labels.slope,
            value: (
              <span className="font-mono text-sm font-normal text-text-primary">
                {instrument.slope}
              </span>
            ),
          },
          {
            label: labels.deployed_at,
            value: (
              <span className="text-sm font-normal text-text-secondary">
                {instrument.deployedAt}
              </span>
            ),
          },
        ]
      : []
  // Simulated: strike/slope/deployedAt rows omitted. Full Panoptic fork-param rows are Wave 3.

  const rows = [...sharedRows, ...liveRows]

  return (
    <dl className="divide-y divide-border-default">
      {rows.map(({ label, value }) => (
        <div key={label} className="flex justify-between items-baseline py-2">
          <dt className="text-sm font-normal text-text-secondary">{label}</dt>
          <dd className="ml-4">{value}</dd>
        </div>
      ))}
    </dl>
  )
}
