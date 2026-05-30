// InstrumentParams — RSC, parameter table for a single AbrigoInstrument.
// Numeric values (strike, slope) in font-mono text-sm font-normal.
// Chain address in font-mono text-sm font-normal text-text-muted.
// Labels text-sm font-normal.
// No card-inside-card.
// Built here (05-03); wired on the detail page in 05-04.

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

  const rows: Array<{ label: string; value: React.ReactNode }> = [
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
    {
      label: labels.strike,
      value: (
        <span className="font-mono text-sm font-normal text-text-primary">{instrument.strike}</span>
      ),
    },
    {
      label: labels.slope,
      value: (
        <span className="font-mono text-sm font-normal text-text-primary">{instrument.slope}</span>
      ),
    },
    {
      label: labels.deployed_at,
      value: (
        <span className="text-sm font-normal text-text-secondary">{instrument.deployedAt}</span>
      ),
    },
  ]

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
