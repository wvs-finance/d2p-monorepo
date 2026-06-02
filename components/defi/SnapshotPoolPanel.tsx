// SnapshotPoolPanel — fork-fixture pool fields with provenance pills (Wave 2, DEFI-08).
// RSC — pure presentational; no 'use client'.
// Renders fork-fixture pool fields from LongGammaFixture.pool + forkBlock.
// Each row: <dt> label, <dd> value (font-mono) + ProvenancePill tier="fork-fixture".
// Null values render as em-dash — NEVER 0 (anti-fishing discipline).
// bigint-as-string values (seededLiquidity, tickSpacing) rendered as-is — NOT coerced to Number().
// Does NOT touch PoolStatePanel.tsx (live instruments keep it).

import { ProvenancePill } from '@/components/defi/ProvenanceBadge'
import type { LongGammaFixture } from '@/lib/apps/abrigo/fixture'

interface SnapshotPoolPanelProps {
  fixture: LongGammaFixture
  labels: {
    pair: string
    human_rate: string
    tick_spacing: string
    seeded_liquidity: string
    fork_block: string
  }
  pillStrings: {
    fork_fixture: string
    fork_fixture_aria: string
  }
  locale: string
}

function formatNumber(value: number, locale: string): string {
  return new Intl.NumberFormat(locale).format(value)
}

export function SnapshotPoolPanel({
  fixture,
  labels,
  pillStrings,
  locale,
}: SnapshotPoolPanelProps) {
  const pill = (fieldName: string) => (
    <ProvenancePill
      tier="fork-fixture"
      fieldName={fieldName}
      ariaLabel={pillStrings.fork_fixture_aria}
    />
  )

  return (
    <dl className="divide-y divide-border-default">
      {/* pair */}
      <div className="flex items-start justify-between gap-4 py-3">
        <dt className="text-sm text-text-muted">{labels.pair}</dt>
        <dd className="flex items-center gap-2">
          <span className="font-mono text-sm text-text-primary">
            {fixture.pair.token0}/{fixture.pair.token1}
          </span>
          {pill('pair')}
        </dd>
      </div>

      {/* humanRate */}
      <div className="flex items-start justify-between gap-4 py-3">
        <dt className="text-sm text-text-muted">{labels.human_rate}</dt>
        <dd className="flex items-center gap-2">
          <span className="font-mono text-sm text-text-primary">
            {fixture.pool.humanRate.value !== null
              ? formatNumber(fixture.pool.humanRate.value, locale)
              : '—'}
          </span>
          {pill('human_rate')}
        </dd>
      </div>

      {/* tickSpacing — bigint-as-string, render as-is */}
      <div className="flex items-start justify-between gap-4 py-3">
        <dt className="text-sm text-text-muted">{labels.tick_spacing}</dt>
        <dd className="flex items-center gap-2">
          <span className="font-mono text-sm text-text-primary">
            {fixture.pool.tickSpacing.value ?? '—'}
          </span>
          {pill('tick_spacing')}
        </dd>
      </div>

      {/* seededLiquidity — bigint-as-string, render as-is (do NOT Number() it) */}
      <div className="flex items-start justify-between gap-4 py-3">
        <dt className="text-sm text-text-muted">{labels.seeded_liquidity}</dt>
        <dd className="flex items-center gap-2">
          <span className="font-mono text-sm text-text-primary break-all">
            {fixture.pool.seededLiquidity.value ?? '—'}
          </span>
          {pill('seeded_liquidity')}
        </dd>
      </div>

      {/* forkBlock — bigint-as-string, render as-is */}
      <div className="flex items-start justify-between gap-4 py-3">
        <dt className="text-sm text-text-muted">{labels.fork_block}</dt>
        <dd className="flex items-center gap-2">
          <span className="font-mono text-sm text-text-primary">
            {fixture.forkBlock.value ?? '—'}
          </span>
          {pill('fork_block')}
        </dd>
      </div>
    </dl>
  )
}
