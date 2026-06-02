// Per-instrument detail page — RSC shell (DEFI-03/04/05/06).
// B1: imports PayoffDiagramClient (the 'use client' wrapper that owns the lazy import).
//     This RSC file must not use next/dynamic or server-side rendering disabled — Next 16 rule.
// B2: [chain] segment IS the numeric chainId. Lookup: ABRIGO_INSTRUMENTS.find(i =>
//     i.id === id && i.chainId === Number(chainParam)).
// DEFI-05: RiskCallout is the FIRST content block after h1, above the fold at 360px.
// WAIVER-05-04: registry is empty today → route notFound()s for every id pre-deploy.
// WAIVER-05-06: PoolStatePanel shows honest participant COUNT (lpPositionCount);
//     per-address feed deferred.
// FOUND-11: this route lives under (defi) — receives WagmiProvider/RainbowKit context.

import { InstrumentJsonLd } from '@/components/defi/InstrumentJsonLd'
import { InstrumentParams } from '@/components/defi/InstrumentParams'
import { PayoffDiagramClient } from '@/components/defi/PayoffDiagramClient'
import { PoolStatePanel } from '@/components/defi/PoolStatePanel'
import { RiskCallout } from '@/components/defi/RiskCallout'
import { WalletPanel } from '@/components/defi/WalletPanel'
import type { WalletPanelStrings } from '@/components/defi/WalletPanel'
import type { WalletStatus } from '@/components/defi/WalletStatusPill'
import { FIXTURES } from '@/lib/apps/abrigo/fixture'
import { ABRIGO_INSTRUMENTS } from '@/lib/apps/abrigo/instruments'
import { aggregateAllChains } from '@/lib/dashboard/aggregator'
import { getInstrumentPoolState } from '@/lib/dashboard/instrument-pool'
import type { Metadata } from 'next'
import { getLocale, getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

interface PageParams {
  id: string
  chain: string
}

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>
}): Promise<Metadata> {
  const { id, chain: chainParam } = await params
  const instrument = ABRIGO_INSTRUMENTS.find((i) => i.id === id && i.chainId === Number(chainParam))
  if (!instrument) return { title: 'Instrumento — Abrigo' }
  const t = await getTranslations('instruments')
  const locale = await getLocale()
  const displayName = locale.startsWith('es') ? instrument.name : instrument.nameEn
  return {
    title: `${displayName} — Abrigo / DS2P Labs`,
    description: t('risk.heading'),
  }
}

export default async function InstrumentDetailPage({
  params,
}: {
  params: Promise<PageParams>
}) {
  const { id, chain: chainParam } = await params

  // B2: numeric chainId lookup
  const instrument = ABRIGO_INSTRUMENTS.find((i) => i.id === id && i.chainId === Number(chainParam))

  // WAIVER-05-04: empty registry → notFound() for all ids pre-deploy
  if (!instrument) {
    notFound()
  }

  const locale = await getLocale()
  const t = await getTranslations('instruments')

  // Server-side pool state: aggregate once, filter by numeric chainId (no full-chain refetch)
  const aggregatorResults = await aggregateAllChains()
  const poolState = getInstrumentPoolState(aggregatorResults, instrument.id, instrument.chainId)

  const displayName = locale.startsWith('es') ? instrument.name : instrument.nameEn

  // Build WalletPanel strings (passing translated copy keeps WalletPanel client-simple)
  const statusLabels: Record<WalletStatus, string> = {
    DISCONNECTED: t('wallet.status_disconnected'),
    CONNECTING: t('wallet.status_connecting'),
    CONNECTED_WRONG_CHAIN: t('wallet.status_wrong_chain'),
    CONNECTED_READY: t('wallet.status_connected'),
  }

  const walletStrings: WalletPanelStrings = {
    disconnectedPrompt: t('wallet.disconnected_prompt'),
    connectLabel: t('wallet.connect_label'),
    connectingLabel: t('wallet.connecting_label'),
    wrongChainLabel: t('wallet.wrong_chain_label'),
    // Pass the RAW template (literal {chain}) — WalletPanel interpolates the chain
    // name client-side. A function here would break RSC→Client serialization.
    wrongChainExplanation: t.raw('wallet.wrong_chain_explanation'),
    switchNetworkLabel: t('wallet.switch_network_label'),
    connectedReadyLabel: t('wallet.connected_ready_label'),
    statusLabels,
  }

  const poolStrings = {
    notDeployed: t('pool.not_deployed'),
    poolBalance: t('pool.pool_balance'),
    settlementCount: t('pool.settlement_count'),
    participants: t('pool.participants'),
    lastBlock: t('pool.last_block'),
  }

  const paramLabels = {
    id: t('params.id'),
    chain: t('params.chain'),
    strike: t('params.strike'),
    slope: t('params.slope'),
    deployed_at: t('params.deployed_at'),
    name: t('params.name'),
  }

  // Use current price = strike (live) or humanRate from fixture (simulated) as a safe default.
  // The diagram is still honest: it shows the payoff curve shape with the kink at the reference price.
  const currentPrice =
    instrument.kind === 'live'
      ? instrument.strike
      : (FIXTURES[instrument.fixtureKey]?.pool.humanRate.value ?? 4000)

  return (
    <main className="max-w-[1200px] mx-auto px-4 lg:px-8 py-12">
      {/* JSON-LD structured data */}
      <InstrumentJsonLd instrument={instrument} />

      {/* Page heading */}
      <h1 className="text-[28px] font-semibold text-text-primary mb-4">{displayName}</h1>

      {/* DEFI-05: RiskCallout FIRST content block, above the fold at 360px */}
      <div className="mb-6">
        <RiskCallout heading={t('risk.heading')} body={t('risk.body')} />
      </div>

      {/*
        Layout:
        - Single-column 360–767px
        - Two-column (60/40 split) at 768px+
        RiskCallout (above) is full-width in both layouts.
      */}
      <div className="flex flex-col md:flex-row md:gap-8">
        {/* Left column — 60% at md+ */}
        <div className="w-full md:w-3/5 space-y-6">
          {/* Instrument parameters table */}
          <section aria-label={locale.startsWith('es') ? 'Parámetros' : 'Parameters'}>
            <InstrumentParams instrument={instrument} labels={paramLabels} locale={locale} />
          </section>

          {/* PayoffDiagram — B1: imported from PayoffDiagramClient (the client wrapper) */}
          {/* Server component — no lazy import here; wrapper owns the code-split boundary */}
          <section
            aria-label={locale.startsWith('es') ? 'Diagrama de rentabilidad' : 'Payoff diagram'}
          >
            <PayoffDiagramClient
              strike={instrument.kind === 'live' ? instrument.strike : currentPrice}
              slope={instrument.kind === 'live' ? instrument.slope : 0}
              currentPrice={currentPrice}
              locale={locale}
            />
          </section>

          {/* Pool state panel — M1: honest lpPositionCount participant count */}
          <section aria-label={locale.startsWith('es') ? 'Estado del pool' : 'Pool state'}>
            <PoolStatePanel state={poolState} locale={locale} strings={poolStrings} />
          </section>
        </div>

        {/* Right column — 40% at md+ */}
        <div className="w-full md:w-2/5 mt-6 md:mt-0">
          {/* WalletPanel — per-instrument; NOT global header */}
          <WalletPanel strings={walletStrings} />
        </div>
      </div>
    </main>
  )
}
