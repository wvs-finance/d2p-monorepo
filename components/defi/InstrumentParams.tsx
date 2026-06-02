// InstrumentParams — RSC, parameter table for a single AbrigoInstrument.
// Numeric values (strike, slope) in font-mono text-sm font-normal.
// Chain address in font-mono text-sm font-normal text-text-muted.
// Labels text-sm font-normal.
// No card-inside-card.
// Built here (05-03); wired on the detail page in 05-04.
// Wave 1: narrowed on kind — simulated renders name/id/chain rows only;
//   live renders full 6 rows.
// Wave 3 (05.1-03): adds full Panoptic fork-param rows to the simulated branch
//   with per-row ProvenancePill tier="fork-fixture".

import { ProvenancePill } from '@/components/defi/ProvenanceBadge'
import type { LongGammaFixture } from '@/lib/apps/abrigo/fixture'
import type { AbrigoInstrument } from '@/lib/apps/abrigo/instruments'

export interface InstrumentParamLabels {
  id: string
  chain: string
  strike: string
  slope: string
  deployed_at: string
  name: string
  // Wave 3: fork-param labels for simulated branch
  fork_block?: string
  tick_spacing?: string
  seeded_liquidity?: string
  chunk_strike?: string
  width?: string
  fork_params_caption?: string
}

interface InstrumentParamsProps {
  instrument: AbrigoInstrument
  labels: InstrumentParamLabels
  /** 'es-CO' | 'en' — used for locale-aware display name */
  locale: string
  /** Wave 3: fork fixture, required for simulated instruments. */
  fixture?: LongGammaFixture | undefined
  /** Wave 3: provenance pill strings for the simulated branch. */
  pillStrings?:
    | {
        fork_fixture: string
        fork_fixture_aria: string
      }
    | undefined
}

export function InstrumentParams({
  instrument,
  labels,
  locale,
  fixture,
  pillStrings,
}: InstrumentParamsProps) {
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
  ]

  // Live-only rows — only read strike/slope/deployedAt inside the live guard
  const liveRows: Array<{ label: string; value: React.ReactNode }> =
    instrument.kind === 'live'
      ? [
          {
            label: labels.chain,
            value: (
              <span className="font-mono text-sm font-normal text-text-muted">
                {instrument.chainId}
              </span>
            ),
          },
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

  if (instrument.kind === 'live') {
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

  // Simulated branch: Wave 3 Panoptic fork-param rows
  // chain row co-located with fork-block qualifier: "Base (fork @ {forkBlock})"
  const forkBlock = fixture?.forkBlock.value ?? null
  const chainQualified = forkBlock ? `Base (fork @ ${forkBlock})` : String(instrument.chainId)

  const pill = (fieldName: string) =>
    pillStrings ? (
      <ProvenancePill
        tier="fork-fixture"
        fieldName={fieldName}
        label={pillStrings.fork_fixture}
        ariaLabel={pillStrings.fork_fixture_aria}
      />
    ) : null

  // Wrap in a fragment so the caption <p> can sit outside the <dl>.
  // A <dl> must only contain <dt>/<dd>/<div>/<script>/<template> direct children.
  // A <div><p>...</p></div> inside <dl> is non-conforming HTML (axe definition-list rule).
  return (
    <>
      {/* Fork-param section caption — rendered OUTSIDE the <dl> (conforming HTML) */}
      {labels.fork_params_caption && (
        <p className="text-xs text-text-muted italic mb-2">{labels.fork_params_caption}</p>
      )}
      <dl className="divide-y divide-border-default">
        {/* Shared rows (name, id) */}
        {sharedRows.map(({ label, value }) => (
          <div key={label} className="flex justify-between items-baseline py-2">
            <dt className="text-sm font-normal text-text-secondary">{label}</dt>
            <dd className="ml-4">{value}</dd>
          </div>
        ))}

        {/* Chain row — co-located with fork-block qualifier */}
        <div className="flex justify-between items-start py-2 gap-4">
          <dt className="text-sm font-normal text-text-secondary">{labels.chain}</dt>
          <dd className="ml-4 flex items-center gap-2">
            <span className="font-mono text-sm font-normal text-text-muted">{chainQualified}</span>
            {pill('chain')}
          </dd>
        </div>

        {/* fork_block row */}
        {labels.fork_block && (
          <div className="flex justify-between items-start py-2 gap-4">
            <dt className="text-sm font-normal text-text-secondary">{labels.fork_block}</dt>
            <dd className="ml-4 flex items-center gap-2">
              <span className="font-mono text-sm font-normal text-text-primary">
                {fixture?.forkBlock.value ?? '—'}
              </span>
              {pill('fork_block')}
            </dd>
          </div>
        )}

        {/* tick_spacing row */}
        {labels.tick_spacing && (
          <div className="flex justify-between items-start py-2 gap-4">
            <dt className="text-sm font-normal text-text-secondary">{labels.tick_spacing}</dt>
            <dd className="ml-4 flex items-center gap-2">
              <span className="font-mono text-sm font-normal text-text-primary">
                {fixture?.pool.tickSpacing.value ?? '—'}
              </span>
              {pill('tick_spacing')}
            </dd>
          </div>
        )}

        {/* seeded_liquidity row — bigint-as-string, never Number() */}
        {labels.seeded_liquidity && (
          <div className="flex justify-between items-start py-2 gap-4">
            <dt className="text-sm font-normal text-text-secondary">{labels.seeded_liquidity}</dt>
            <dd className="ml-4 flex items-center gap-2">
              <span className="font-mono text-sm font-normal text-text-primary break-all">
                {fixture?.pool.seededLiquidity.value ?? '—'}
              </span>
              {pill('seeded_liquidity')}
            </dd>
          </div>
        )}

        {/* chunk_strike row — OTM offset (value "2000"), labeled as offset */}
        {labels.chunk_strike && (
          <div className="flex justify-between items-start py-2 gap-4">
            <dt className="text-sm font-normal text-text-secondary">{labels.chunk_strike}</dt>
            <dd className="ml-4 flex items-center gap-2">
              <span className="font-mono text-sm font-normal text-text-primary">
                {fixture?.chunk.strike.value ?? '—'}
              </span>
              {pill('chunk_strike')}
            </dd>
          </div>
        )}

        {/* chunk width row */}
        {labels.width && (
          <div className="flex justify-between items-start py-2 gap-4">
            <dt className="text-sm font-normal text-text-secondary">{labels.width}</dt>
            <dd className="ml-4 flex items-center gap-2">
              <span className="font-mono text-sm font-normal text-text-primary">
                {fixture?.chunk.width.value ?? '—'}
              </span>
              {pill('width')}
            </dd>
          </div>
        )}
      </dl>
    </>
  )
}
