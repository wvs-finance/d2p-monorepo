'use client'
import { CHAIN_SLUGS, dashboardSearchParams } from '@/lib/dashboard/search-params'
import type { ChainSlug } from '@/lib/dashboard/search-params'
import { useQueryState } from 'nuqs'

interface ChainSelectorProps {
  label: string
}

export function ChainSelector({ label }: ChainSelectorProps) {
  // REUSE the shared parser (M-nuqs). Never re-declare parseAsStringEnum inline —
  // one parser, one default, no server/client URL-contract drift.
  const [chain, setChain] = useQueryState('chain', dashboardSearchParams.chain)

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="chain-selector" className="text-sm font-medium text-text-secondary">
        {label}
      </label>
      <select
        id="chain-selector"
        value={chain}
        onChange={(e) => setChain(e.target.value as ChainSlug)}
        className="min-h-[44px] rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-default"
      >
        {CHAIN_SLUGS.map((slug) => (
          <option key={slug} value={slug}>
            {slug.charAt(0).toUpperCase() + slug.slice(1)}
          </option>
        ))}
      </select>
    </div>
  )
}
