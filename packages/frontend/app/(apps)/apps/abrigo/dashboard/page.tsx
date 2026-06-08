// The page calls aggregateAllChains() directly for the no-JS first paint (DASH-07);
// /api/dashboard serves agents/CI. Phase-4 TODO: once caching is real, both must read the
// same cached aggregation so the page and the route never diverge. (BA M2)
import { AgentStateJsonLd } from '@/components/AgentStateJsonLd'
import { aggregateAllChains } from '@/lib/dashboard/aggregator'
import { loadDashboardParams } from '@/lib/dashboard/search-params'
import type { Metadata } from 'next'
import { getLocale, getTranslations } from 'next-intl/server'
import { ChainSelector } from './ChainSelector'
import { DashboardContent } from './DashboardContent'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Panel - Abrigo / DS2P Labs',
  }
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { chain } = await loadDashboardParams(searchParams)
  const data = await aggregateAllChains()

  const t = await getTranslations('dashboard')
  await getLocale()

  return (
    <main className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      {/* AGENT-10: tool-mirroring JSON-LD — reuses the SAME `data` aggregation (no 2nd RPC). */}
      <AgentStateJsonLd app="abrigo" chains={data} />

      <header className="space-y-3">
        <h1 className="text-3xl font-semibold text-text-primary">{t('page_title')}</h1>
        <p className="text-base text-text-secondary max-w-2xl">{t('page_subtitle')}</p>
      </header>

      <ChainSelector label={t('chain_selector_label')} />

      <DashboardContent
        data={data}
        selectedChain={chain}
        labels={{
          poolBalance: t('tile_pool_balance'),
          settlementEvents: t('tile_settlement_events'),
          lpPositions: t('tile_lp_positions'),
          lastBlock: t('tile_last_block'),
          liveBanner: t('live_banner'),
          emptyValue: t('empty_value'),
        }}
      />
    </main>
  )
}
