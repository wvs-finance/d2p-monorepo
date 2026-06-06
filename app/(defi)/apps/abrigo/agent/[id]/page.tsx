// /apps/abrigo/agent/[id] — Per-decision detail route for Somnia MacroHedgeStrategist.
// RSC — server component, no 'use client'. Read-first; no wallet gate.
//
// Next-16: params is a Promise<{ id: string }>; must await before reading.
// BLOCKER-4: generateMetadata title uses the STATIC route-level trace.title — NO null branch.
// MAJOR-6: unknown id → notFound() (HTTP 404) → not-found.tsx boundary; NOT inline-200.
// MINOR-16: h1 route title → h2 section heading → h3 stage titles (heading outline for SR).
// MAJOR-9: consensusCaveat threaded from feed.consensusCaveat (REUSE — no trace.consensusCaveat).
// CROSS-09: color is NOT the sole signal anywhere on this route.
// CROSS-01: read-first; CROSS-10: es-CO first.

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { DecisionPipelineTrace } from '@/components/defi/somnia/DecisionPipelineTrace'
import type { TraceStrings } from '@/components/defi/somnia/DecisionPipelineTrace'
import { LivenessPill } from '@/components/defi/somnia/LivenessPill'
import type { LivenessPillStrings } from '@/components/defi/somnia/LivenessPill'
import { ManagementControls } from '@/components/defi/somnia/ManagementControls'
import type { ManagementControlsStrings } from '@/components/defi/somnia/ManagementControls'
import { PositionPanel } from '@/components/defi/somnia/PositionPanel'
import type { PositionPanelStrings } from '@/components/defi/somnia/PositionPanel'
import { getDecisionTraceById } from '@/lib/apps/abrigo/somnia/reader'
import type { Metadata } from 'next'
import { getLocale, getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'

interface PageParams {
  id: string
}

// BLOCKER-4: generateMetadata must use Promise<params> + await (Next 16 async params).
// Title is the STATIC route-level trace.title — NO null branch because the title
// does not depend on a found decision (unlike the instruments route).
export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>
}): Promise<Metadata> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _id } = await params
  const t = await getTranslations('somnia')
  return {
    title: `${t('trace.title')} — Abrigo / DS2P Labs`,
    description: t('trace.stage2Caption'),
  }
}

export default async function AgentDecisionDetailPage({
  params,
}: {
  params: Promise<PageParams>
}) {
  const { id } = await params

  // MAJOR-6: unknown id → notFound() → not-found.tsx boundary (HTTP 404).
  // Do NOT render an inline-200 error state.
  const trace = getDecisionTraceById(id)
  if (!trace) {
    notFound()
  }

  const locale = await getLocale()
  const t = await getTranslations('somnia')

  // TraceStrings — all visible copy threaded from this RSC page.
  // NO getTranslations inside DecisionPipelineTrace (Phase-6 string-threading pattern).
  // MAJOR-9: consensusCaveat REUSED from feed.consensusCaveat (no trace.consensusCaveat key).
  const traceStrings: TraceStrings = {
    title: t('trace.title'),
    stage1: t('trace.stage1'),
    stage2: t('trace.stage2'),
    stage2Caption: t('trace.stage2Caption'),
    stage3: t('trace.stage3'),
    stage4: t('trace.stage4'),
    stage5: t('trace.stage5'),
    stage6: t('trace.stage6'),
    systemPromptTrigger: t('trace.systemPromptTrigger'),
    illustrativeCaption: t('trace.illustrativeCaption'),
    legLabelHeading: t('trace.legLabelHeading'),
    modelIdLabel: t('trace.modelIdLabel'),
    requestIdLabel: t('trace.requestIdLabel'),
    timestampLabel: t('trace.timestampLabel'),
    provenanceLabel: t('trace.provenanceLabel'),
    provenanceAriaLabel: t('trace.provenanceAriaLabel'),
    emptyState: t('panel.emptyState'),
    // MAJOR-9: feed.consensusCaveat threaded here — NOT a new trace.consensusCaveat
    consensusCaveat: t('feed.consensusCaveat'),
  }

  // PositionPanel strings
  const positionStrings: PositionPanelStrings = {
    heading: t('position.heading'),
    emptyHeading: t('position.emptyHeading'),
    emptyBody: t('position.emptyBody'),
    notLiveCaption: t('position.notLiveCaption'),
    provenanceLabel: t('position.provenanceLabel'),
    provenanceAriaLabel: t('position.provenanceAriaLabel'),
    fieldLegs: t('position.fieldLegs'),
    fieldCollateral: t('position.fieldCollateral'),
    fieldTokenId: t('position.fieldTokenId'),
    fieldResidual: t('position.fieldResidual'),
    emptyState: t('panel.emptyState'),
  }

  // ManagementControls strings
  const manageStrings: ManagementControlsStrings = {
    close: t('manage.close'),
    claim: t('manage.claim'),
    agent: t('manage.agent'),
    caption: t('manage.caption'),
  }

  // LivenessPill strings
  const livenessStrings: LivenessPillStrings = {
    snapshot: t('liveness.snapshot'),
    polling: t('liveness.polling'),
    ariaSnapshot: t('liveness.ariaSnapshot'),
    ariaPolling: t('liveness.ariaPolling'),
  }

  // Page title for heading (locale-correct)
  const pageTitle = t('trace.title')
  // Section heading for the trace block (h2, introduces DecisionPipelineTrace for SR — MINOR-16)
  const traceSection = locale.startsWith('es') ? 'Traza de la decisión' : 'Decision trace'

  return (
    <main className="max-w-[1200px] mx-auto px-4 lg:px-8 py-12">
      {/* Page header: h1 route title + liveness pill */}
      <div className="flex items-center gap-3 flex-wrap mb-8">
        <h1 className="text-[28px] font-semibold text-text-primary">{pageTitle}</h1>
        {/* LivenessPill is a client island — placed near the title, describing whole surface freshness.
            liveness='snapshot' is a plain serializable string (safe RSC→client prop). The source
            is constructed inside LivenessPill to avoid passing functions across the RSC boundary. */}
        <LivenessPill liveness="snapshot" strings={livenessStrings} />
      </div>

      {/* Centerpiece: Decision pipeline trace */}
      {/* h2 section heading introduces the trace block (MINOR-16 SR heading outline) */}
      <section aria-label={traceSection} className="mb-8">
        <h2 className="text-xl font-semibold text-text-primary mb-4">{traceSection}</h2>
        {/* DecisionPipelineTrace renders 6 PipelineStage children, each with an h3 stage title */}
        <DecisionPipelineTrace decision={trace} strings={traceStrings} locale={locale} />
      </section>

      {/* Position panel: not-deployed empty state under neutral fork-verified tier */}
      <section
        aria-label={locale.startsWith('es') ? 'Panel de posición' : 'Position panel'}
        className="mb-8"
      >
        <PositionPanel strings={positionStrings} />
      </section>

      {/* Management controls: exactly 3 disabled buttons with persistent caption */}
      <section
        aria-label={locale.startsWith('es') ? 'Controles de gestión' : 'Management controls'}
      >
        <ManagementControls strings={manageStrings} />
      </section>
    </main>
  )
}
