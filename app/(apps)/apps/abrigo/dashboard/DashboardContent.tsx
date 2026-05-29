import type { ChainAggregationResult } from '@/lib/dashboard/aggregator'
import type { ChainSlug } from '@/lib/dashboard/search-params'
import { CHAIN_SLUG_TO_ID } from '@/lib/dashboard/search-params'
import { Info } from 'lucide-react'

interface DashboardLabels {
  poolBalance: string
  settlementEvents: string
  lpPositions: string
  lastBlock: string
  liveBanner: string
  emptyValue: string
}

interface DashboardContentProps {
  data: ChainAggregationResult[]
  selectedChain: ChainSlug
  labels: DashboardLabels
}

interface TileProps {
  label: string
  value: string
  emptyValue: string
}

function MetricTile({ label, value, emptyValue }: TileProps) {
  // Anti-fishing (CRITICAL): render a dash placeholder for null/empty values.
  // A real "0" balance is distinct from "—" no-data — never fabricate numbers.
  const displayValue = value !== null && value !== undefined && value !== '' ? value : emptyValue

  return (
    <div className="border border-border-default rounded-lg p-4">
      <p className="text-sm text-text-muted">{label}</p>
      <p className="mt-2 text-2xl font-mono text-text-primary">{displayValue}</p>
    </div>
  )
}

function ChainTiles({
  chain,
  labels,
  selectedChainId,
}: {
  chain: ChainAggregationResult
  labels: DashboardLabels
  selectedChainId: number
}) {
  const isSelected = chain.chainId === selectedChainId

  // All instrument fields are string|null — null maps to the empty placeholder.
  // With an empty registry every instrument array is [], so we always show the placeholder.
  const firstInstrument = chain.instruments[0]

  const poolBalance = firstInstrument?.poolBalance ?? null
  const settlementCount = firstInstrument?.settlementCount ?? null
  const lpPositionCount = firstInstrument?.lpPositionCount ?? null
  const lastBlock = chain.lastBlockSynced ?? null

  return (
    <div
      className={`space-y-3 ${isSelected ? '' : 'opacity-60'}`}
      aria-label={`${chain.chainName} metrics`}
    >
      <h3 className="text-base font-medium text-text-primary">{chain.chainName}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricTile
          label={labels.poolBalance}
          value={poolBalance ?? ''}
          emptyValue={labels.emptyValue}
        />
        <MetricTile
          label={labels.settlementEvents}
          value={settlementCount ?? ''}
          emptyValue={labels.emptyValue}
        />
        <MetricTile
          label={labels.lpPositions}
          value={lpPositionCount ?? ''}
          emptyValue={labels.emptyValue}
        />
        <MetricTile
          label={labels.lastBlock}
          value={lastBlock ?? ''}
          emptyValue={labels.emptyValue}
        />
      </div>
    </div>
  )
}

export function DashboardContent({ data, selectedChain, labels }: DashboardContentProps) {
  const selectedChainId = CHAIN_SLUG_TO_ID[selectedChain]

  // Show the "live once contracts deploy" banner when ANY chain has 'empty' status
  // (the instrument registry is empty). Anti-fishing: this banner is the honest pre-launch state.
  const showBanner =
    data.some((c) => c.status === 'empty') || data.every((c) => c.instruments.length === 0)

  // Order: selected chain first, others below at equal visual weight (anti-fishing).
  const selectedChainData = data.find((c) => c.chainId === selectedChainId)
  const otherChains = data.filter((c) => c.chainId !== selectedChainId)

  return (
    <div className="space-y-8">
      {/* Live banner — shown while registry is empty (pre-launch honest state) */}
      {showBanner && (
        <output className="border border-border-default rounded-lg bg-bg-surface p-4 flex items-start gap-3 text-text-secondary">
          <Info aria-hidden="true" className="h-5 w-5 mt-0.5 shrink-0 text-text-muted" />
          <span className="text-sm">{labels.liveBanner}</span>
        </output>
      )}

      {/* Selected chain — primary display */}
      {selectedChainData && (
        <section aria-label={`${selectedChainData.chainName} metrics`}>
          <ChainTiles chain={selectedChainData} labels={labels} selectedChainId={selectedChainId} />
        </section>
      )}

      {/* Other chains — equal visual weight, no chain is visually privileged (anti-fishing) */}
      {otherChains.length > 0 && (
        <section className="space-y-6 divide-y divide-border-default">
          {otherChains.map((chain) => (
            <div key={chain.chainId} className="pt-6 first:pt-0">
              <ChainTiles chain={chain} labels={labels} selectedChainId={selectedChainId} />
            </div>
          ))}
        </section>
      )}
    </div>
  )
}
