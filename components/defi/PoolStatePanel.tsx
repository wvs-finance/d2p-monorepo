// PoolStatePanel — RSC (no 'use client').
// Receives pre-filtered InstrumentState | null from the detail page RSC.
// Anti-fishing (CROSS-09): null fields render as em-dash (—), NEVER 0.
// M1: surfaces an HONEST participant count from lpPositionCount (em-dash when not deployed).
// WAIVER-05-06: per-address recent-participants event FEED is deferred.
//   The aggregator exposes a COUNT (lpPositionCount) — honest; no event indexer this phase.
// No card-inside-card.

import type { InstrumentState } from '@/lib/dashboard/aggregator'

const EM_DASH = '—'

function formatNumeric(value: string | null, locale: string): string {
  if (value === null) return EM_DASH
  const n = Number(value)
  if (Number.isNaN(n)) return EM_DASH
  return new Intl.NumberFormat(locale).format(n)
}

export interface PoolStatePanelStrings {
  /** not-deployed message: "No hay datos de pool disponibles — el contrato aún no está desplegado." */
  notDeployed: string
  /** Pool balance label */
  poolBalance: string
  /** Settlement count label */
  settlementCount: string
  /** Participant count label (from lpPositionCount — honest count; per-address feed = WAIVER-05-06) */
  participants: string
  /** Last block synced label */
  lastBlock: string
}

interface PoolStatePanelProps {
  /** Pre-filtered InstrumentState from getInstrumentPoolState; null = not deployed */
  state: InstrumentState | null
  /** Locale for Intl.NumberFormat */
  locale: string
  /** Translated strings */
  strings: PoolStatePanelStrings
}

export function PoolStatePanel({ state, locale, strings }: PoolStatePanelProps) {
  if (state === null) {
    return <p className="text-sm font-normal text-text-secondary">{strings.notDeployed}</p>
  }

  const rows: Array<{ label: string; value: string; mono: boolean }> = [
    {
      label: strings.poolBalance,
      value: formatNumeric(state.poolBalance, locale),
      mono: true,
    },
    {
      label: strings.settlementCount,
      value: formatNumeric(state.settlementCount, locale),
      mono: true,
    },
    {
      // M1: honest participant count from lpPositionCount; em-dash when null
      label: strings.participants,
      value: formatNumeric(state.lpPositionCount, locale),
      mono: true,
    },
  ]

  return (
    <dl className="divide-y divide-border-default">
      {rows.map(({ label, value, mono }) => (
        <div key={label} className="flex justify-between items-baseline py-2">
          <dt className="text-sm font-normal text-text-secondary">{label}</dt>
          <dd className={`ml-4 text-sm font-normal${mono ? ' font-mono' : ''} text-text-primary`}>
            {value}
          </dd>
        </div>
      ))}
    </dl>
  )
}
