// /apps/abrigo/agent — Agent surface for the Somnia MacroHedgeStrategist (Components D + A).
// RSC — no 'use client'. No wallet dependency.
// Read-only data surface: latest CPI macro print + MacroReceived history + hedge decisions.
// Placed under (defi) route group for IA consistency with /apps/abrigo/instruments (Plan 05-03).
//
// Wave 1 (06-01): MacroDataPanel (Component D) — CPI print + history.
// Wave 2 (06-02): HedgeDecisionFeed (Component A) — hedge decisions below the macro panel.
//
// HONESTY: "Somnia testnet · POC · consensus = operator-supplied" — this is the honest sub-heading.
// The consensus value in MacroHedgeStrategist is operator-supplied POC input, NOT market consensus.
// M4: no "consensus-verified" in any copy, aria-label, or key.

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import type { DecisionCardStrings } from '@/components/defi/somnia/HedgeDecisionCard'
import { HedgeDecisionFeed } from '@/components/defi/somnia/HedgeDecisionFeed'
import { MacroDataPanel } from '@/components/defi/somnia/MacroDataPanel'
import type { MacroPanelStrings } from '@/components/defi/somnia/MacroDataPanel'
import type { Metadata } from 'next'
import { getLocale, getTranslations } from 'next-intl/server'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  const t = await getTranslations('somnia')
  return {
    title: `${t('panel.heading')} — Abrigo / DS2P Labs`,
    description: locale.startsWith('es')
      ? 'Somnia testnet · POC · datos de agente macro (IPC Colombia)'
      : 'Somnia testnet · POC · macro agent data (CPI Colombia)',
  }
}

export default async function AgentPage() {
  const locale = await getLocale()
  const t = await getTranslations('somnia')

  const strings: MacroPanelStrings = {
    heading: t('panel.heading'),
    dataKeyLabel: t('panel.dataKeyLabel'),
    latestValue: t('panel.latestValue'),
    history: t('panel.history'),
    capturedLabel: t('panel.capturedLabel'),
    printTimestampLabel: t('panel.printTimestampLabel'),
    printTimestampUnavailable: t('panel.printTimestampUnavailable'),
    provenanceLabel: t('panel.provenanceLabel'),
    provenanceAriaLabel: t('panel.provenanceAriaLabel'),
    caveat: t('panel.caveat'),
    emptyState: t('panel.emptyState'),
  }

  // Component A — HedgeDecisionFeed strings (06-02).
  // actionLabel maps all 4 HedgeActionLabel values (CROSS-09: equal weight, all keyed).
  // linkLabel: master→detail link affordance (07-03); threaded from trace.linkLabel.
  const feedStrings: DecisionCardStrings & {
    feedHeading: string
    feedEmptyState: string
    linkLabel?: string | undefined
  } = {
    actionLabel: {
      HOLD: t('feed.action.HOLD'),
      ADD_LONG_GAMMA: t('feed.action.ADD_LONG_GAMMA'),
      REDUCE: t('feed.action.REDUCE'),
      EXIT: t('feed.action.EXIT'),
    },
    sizeBpsLabel: t('feed.sizeBpsLabel'),
    macroLabel: t('feed.macroLabel'),
    consensusLabel: t('feed.consensusLabel'),
    consensusCaveat: t('feed.consensusCaveat'),
    surpriseLabel: t('feed.surpriseLabel'),
    pendingLabel: t('feed.pendingLabel'),
    provenanceLabel: t('feed.provenanceLabel'),
    provenanceAriaLabel: t('feed.provenanceAriaLabel'),
    emptyState: t('panel.emptyState'),
    feedHeading: t('feed.heading'),
    feedEmptyState: t('feed.emptyState'),
    // 07-03: supply the master→detail link label so each card carries an identical
    // accent+chevron+underline affordance (CROSS-09 equal-weight invariant).
    linkLabel: t('trace.linkLabel'),
  }

  return (
    <main className="max-w-[1200px] mx-auto px-4 lg:px-8 py-12">
      {/* Page heading */}
      <h1 className="text-[28px] font-semibold text-text-primary mb-2">{t('panel.heading')}</h1>

      {/* Honest sub-heading: testnet POC, consensus = operator-supplied (M4) */}
      <p className="text-sm text-text-muted mb-8">{t('panel.subheading')}</p>

      {/* Component D: latest CPI print + MacroReceived history, testnet-agent provenance */}
      <MacroDataPanel locale={locale} strings={strings} />

      {/*
        Component A: HedgeDecisionFeed — all recorded HedgeDecisionMade decisions.
        Rendered BELOW MacroDataPanel per Wave 2 mount-slot commitment (06-01).
        CROSS-09: equal visual weight for all 4 actions; consensus labeled operator-supplied.
      */}
      <div className="mt-10">
        <HedgeDecisionFeed strings={feedStrings} locale={locale} />
      </div>
    </main>
  )
}
