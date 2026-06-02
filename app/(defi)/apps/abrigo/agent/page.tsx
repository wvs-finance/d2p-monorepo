// /apps/abrigo/agent — Agent surface for the Somnia MacroHedgeStrategist (Component D).
// RSC — no 'use client'. No wallet dependency.
// Read-only data surface: latest CPI macro print + MacroReceived history, testnet-agent provenance.
// Placed under (defi) route group for IA consistency with /apps/abrigo/instruments (Plan 05-03 decision).
//
// Wave 1 (06-01): MacroDataPanel mounts here.
// Wave 2 (06-02): HedgeDecisionFeed mounts here (mount slot marked in MacroDataPanel).
//
// HONESTY: "Somnia testnet · POC · consensus = operator-supplied" — this is the honest sub-heading.
// The consensus value in MacroHedgeStrategist is operator-supplied POC input, NOT market consensus.

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

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
    provenanceLabel: t('panel.provenanceLabel'),
    provenanceAriaLabel: t('panel.provenanceAriaLabel'),
    caveat: t('panel.caveat'),
    emptyState: t('panel.emptyState'),
  }

  return (
    <main className="max-w-[1200px] mx-auto px-4 lg:px-8 py-12">
      {/* Page heading */}
      <h1 className="text-[28px] font-semibold text-text-primary mb-2">{t('panel.heading')}</h1>

      {/* Honest sub-heading: testnet POC, consensus = operator-supplied (M4) */}
      <p className="text-sm text-text-muted mb-8">{t('panel.subheading')}</p>

      {/*
        MacroDataPanel: latest CPI print + MacroReceived history, testnet-agent provenance.
        Component A (HedgeDecisionFeed) will be mounted here in Plan 06-02.
      */}
      <MacroDataPanel locale={locale} strings={strings} />
    </main>
  )
}
