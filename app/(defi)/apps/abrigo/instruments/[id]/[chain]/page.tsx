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
//
// Wave 3 (05.1-03): adds kind==='simulated' branch BEFORE aggregateAllChains.
// A simulated entry is NEVER passed to the multicall — pool state is built from fixture only.

import { CashFlowWaterfall } from '@/components/defi/CashFlowWaterfall'
import { InstrumentJsonLd } from '@/components/defi/InstrumentJsonLd'
import { InstrumentParams } from '@/components/defi/InstrumentParams'
import { PayoffDiagramClient } from '@/components/defi/PayoffDiagramClient'
import { PoolStatePanel } from '@/components/defi/PoolStatePanel'
import { ProvenancePill, SimuladoBadge } from '@/components/defi/ProvenanceBadge'
import { RiskCallout } from '@/components/defi/RiskCallout'
import { SnapshotPoolPanel } from '@/components/defi/SnapshotPoolPanel'
import { WalletPanel } from '@/components/defi/WalletPanel'
import type { WalletPanelStrings } from '@/components/defi/WalletPanel'
import type { WalletStatus } from '@/components/defi/WalletStatusPill'
import type { CashFlowBreakdown } from '@/lib/apps/abrigo/cashflow'
import { FIXTURES } from '@/lib/apps/abrigo/fixture'
import { ABRIGO_INSTRUMENTS } from '@/lib/apps/abrigo/instruments'
import { generatePayoffData, generateSchematicConvexPayoff } from '@/lib/apps/abrigo/payoff'
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

  // Wave 3: kind==='simulated' branch MUST come BEFORE aggregateAllChains.
  // A simulated entry is NEVER passed to the multicall — all pool state from fixture.
  if (instrument.kind === 'simulated') {
    const locale = await getLocale()
    const t = await getTranslations('instruments')
    const fixture = FIXTURES[instrument.fixtureKey]
    if (!fixture) {
      // Missing fixture entry is a data-integrity error; treat as not-found.
      notFound()
    }
    const displayName = locale.startsWith('es') ? instrument.name : instrument.nameEn

    // Schematic payoff — NO strikeRef/currentPriceRef (no fabricated current price)
    const payoffData = generateSchematicConvexPayoff(fixture.pool.humanRate.value, 0)
    const payoffAriaLabel = locale.startsWith('es')
      ? 'Diagrama de rentabilidad esquemático — gamma positiva'
      : 'Schematic payoff diagram — positive gamma'

    // Cash-flow breakdown from fixture (all spec-tier, null renders as em-dash)
    const breakdown: CashFlowBreakdown = {
      premium: fixture.cashflow.premium,
      streamia: fixture.cashflow.streamia,
      commission: fixture.cashflow.commission,
      dataCost: fixture.cashflow.dataCost,
      residualNote: locale.startsWith('es')
        ? 'Residual = max(colateral sobreviviente − costo de datos, 0). Streamia y comisión ya neteados en el quemado de shares.'
        : 'Residual = max(surviving collateral − data cost, 0). Streamia and commission already netted in share-burn.',
    }

    // Wallet strings — Wave 3 uses authored i18n keys for READ_ONLY entries
    const statusLabels: Record<WalletStatus, string> = {
      DISCONNECTED: t('wallet.status_disconnected'),
      CONNECTING: t('wallet.status_connecting'),
      CONNECTED_WRONG_CHAIN: t('wallet.status_wrong_chain'),
      CONNECTED_READY: t('wallet.status_connected'),
      READ_ONLY: t('wallet.read_only_status'),
    }
    const walletStrings: WalletPanelStrings = {
      disconnectedPrompt: t('wallet.disconnected_prompt'),
      connectLabel: t('wallet.connect_label'),
      connectingLabel: t('wallet.connecting_label'),
      wrongChainLabel: t('wallet.wrong_chain_label'),
      wrongChainExplanation: t.raw('wallet.wrong_chain_explanation'),
      switchNetworkLabel: t('wallet.switch_network_label'),
      connectedReadyLabel: t('wallet.connected_ready_label'),
      readOnlyLabel: t('wallet.read_only_label'),
      statusLabels,
    }

    // InstrumentParams labels — simulated branch includes all fork-param labels
    const paramLabels = {
      id: t('params.id'),
      chain: t('params.chain'),
      strike: t('params.strike'),
      slope: t('params.slope'),
      deployed_at: t('params.deployed_at'),
      name: t('params.name'),
      fork_block: t('params.fork_block'),
      tick_spacing: t('params.tick_spacing'),
      seeded_liquidity: t('params.seeded_liquidity'),
      chunk_strike: t('params.chunk_strike'),
      width: t('params.width'),
      fork_params_caption: t('params.fork_params_caption'),
    }

    const pillStrings = {
      fork_fixture: t('provenance.fork_fixture'),
      fork_fixture_aria: t('provenance.fork_fixture_aria'),
    }

    const snapshotLabels = {
      pair: t('params.pair'),
      human_rate: t('params.human_rate'),
      tick_spacing: t('params.tick_spacing'),
      seeded_liquidity: t('params.seeded_liquidity'),
      fork_block: t('params.fork_block'),
    }

    const cashflowLabels = {
      premium: t('cashflow.premium'),
      streamia: t('cashflow.streamia'),
      commission: t('cashflow.commission'),
      data_cost: t('cashflow.data_cost'),
      residual: t('cashflow.residual'),
      already_netted: t('cashflow.already_netted'),
    }

    const specPillStrings = {
      label: t('provenance.spec'),
      aria: t('provenance.spec_aria'),
    }

    const schematicPillStrings = {
      label: t('provenance.schematic'),
      aria: t('provenance.schematic_aria'),
    }

    return (
      <main className="max-w-[1200px] mx-auto px-4 lg:px-8 py-12">
        {/* JSON-LD structured data — simulated branch: no strike/slope/address */}
        <InstrumentJsonLd instrument={instrument} />

        {/* Page heading */}
        <h1 className="text-[28px] font-semibold text-text-primary mb-4">{displayName}</h1>

        {/* SIMULADO badge + RiskCallout — both above the fold at 360px (DEFI-05 + DEFI-08) */}
        <div className="mb-6 space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            {/* key_link: t('simulated.badge') — messages instruments.json */}
            <SimuladoBadge label={t('simulated.badge')} ariaLabel={t('simulated.badge_aria')} />
            <p className="text-sm text-text-muted">{t('simulated.caption')}</p>
          </div>
          <RiskCallout heading={t('risk.heading')} body={t('risk.body')} />
        </div>

        {/*
          Layout:
          - Single-column 360–767px
          - Two-column (60/40 split) at 768px+
        */}
        <div className="flex flex-col md:flex-row md:gap-8">
          {/* Left column — 60% at md+ */}
          <div className="w-full md:w-3/5 space-y-6">
            {/* Instrument parameters table — fork-param rows (Wave 3) */}
            <section aria-label={locale.startsWith('es') ? 'Parámetros' : 'Parameters'}>
              <InstrumentParams
                instrument={instrument}
                labels={paramLabels}
                locale={locale}
                fixture={fixture}
                pillStrings={pillStrings}
              />
            </section>

            {/* Schematic PayoffDiagram — NO strikeRef/currentPriceRef (isSchematic) */}
            <section
              aria-label={locale.startsWith('es') ? 'Diagrama de rentabilidad' : 'Payoff diagram'}
            >
              {/* CROSS-09: schematic provenance pill — color+icon+text+aria-label (never color alone) */}
              <div className="flex items-center gap-3 mb-3">
                <p className="text-sm font-medium text-text-secondary">
                  {locale.startsWith('es') ? 'Diagrama de rentabilidad' : 'Payoff diagram'}
                </p>
                <ProvenancePill
                  tier="schematic"
                  fieldName="payoffDiagram"
                  label={schematicPillStrings.label}
                  ariaLabel={schematicPillStrings.aria}
                />
              </div>
              <PayoffDiagramClient
                data={payoffData}
                ariaLabel={payoffAriaLabel}
                locale={locale}
                isSchematic
              />
            </section>

            {/* SnapshotPoolPanel — fork-fixture pool state from fixture */}
            <section
              aria-label={locale.startsWith('es') ? 'Estado del pool (fork)' : 'Pool state (fork)'}
            >
              <SnapshotPoolPanel
                fixture={fixture}
                labels={snapshotLabels}
                pillStrings={pillStrings}
                locale={locale}
              />
            </section>

            {/* CashFlowWaterfall — spec-tier breakdown */}
            <section aria-label={locale.startsWith('es') ? 'Flujo de caja' : 'Cash flow'}>
              <CashFlowWaterfall
                breakdown={breakdown}
                labels={cashflowLabels}
                specPillStrings={specPillStrings}
                locale={locale}
              />
            </section>
          </div>

          {/* Right column — 40% at md+ */}
          <div className="w-full md:w-2/5 mt-6 md:mt-0">
            {/* WalletPanel readOnly — no connect/switch affordance for simulated.
                lang threaded from RSC locale so SR pronounces es-CO labels correctly (WCAG 3.1.2). */}
            <WalletPanel
              strings={walletStrings}
              readOnly
              lang={locale.startsWith('es') ? 'es-CO' : 'en'}
            />
          </div>
        </div>
      </main>
    )
  }

  // LIVE PATH — unchanged below (aggregateAllChains + getInstrumentPoolState + existing layout)
  // The simulated branch above returns early — a simulated entry never reaches here.

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
    READ_ONLY: t('wallet.read_only_status'),
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
    readOnlyLabel: t('wallet.read_only_label'),
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

  // Live path: piecewise-linear kink at strike.
  const currentPrice = instrument.strike
  const payoffData = generatePayoffData(instrument.strike, instrument.slope)

  const payoffAriaLabel = locale.startsWith('es')
    ? `Diagrama de rentabilidad — ${displayName}`
    : `Payoff diagram — ${displayName}`

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
              data={payoffData}
              ariaLabel={payoffAriaLabel}
              locale={locale}
              strikeRef={instrument.strike}
              currentPriceRef={currentPrice}
            />
          </section>

          {/* Pool state panel — M1: honest lpPositionCount participant count */}
          <section aria-label={locale.startsWith('es') ? 'Estado del pool' : 'Pool state'}>
            <PoolStatePanel state={poolState} locale={locale} strings={poolStrings} />
          </section>
        </div>

        {/* Right column — 40% at md+ */}
        <div className="w-full md:w-2/5 mt-6 md:mt-0">
          {/* WalletPanel — per-instrument; NOT global header.
              lang threaded from RSC locale so SR pronounces es-CO labels correctly (WCAG 3.1.2). */}
          <WalletPanel strings={walletStrings} lang={locale.startsWith('es') ? 'es-CO' : 'en'} />
        </div>
      </div>
    </main>
  )
}
