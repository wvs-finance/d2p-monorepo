// /apps/abrigo/cornerstone — Scenario-1 Cornerstone RSC shell.
//
// Phase 9 (09-04): live | replay | mock mode switch wired.
//   - Mode resolved via URL param ?mode= → parseMode (DEFAULT_MODE = 'replay').
//   - ModeBanner (Surface 1) rendered above PromptBox by CornerstoneClientShell.
//   - FreshnessGate (Surface 6) logic in CornerstoneClientShell (mount-time probe).
//   - runWorkflowLive wired: useSwitchChain(31337) BEFORE useWriteContract({chainId:31337}) (v5 fix-4).
//   - ok:false from /api/abrigo/agent1 → degrade to replay (aria-live, never silent).
//
// HEADING OUTLINE (FD-M4): h1 (pageTitle) → h2 per agent entry (inside RunTranscript).
// NULL-GUARD (RC-M5): null trace → cornerstone.errorState (no 500/throw).
// HONESTY: testnet-agent + consensus-verified appear ONLY inside the DecisionPipelineTrace block.

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { CornerstoneClientShell } from '@/components/defi/cornerstone/CornerstoneClientShell'
import type { CornerstoneClientShellStrings } from '@/components/defi/cornerstone/CornerstoneClientShell'
import type { CardV2Strings } from '@/components/defi/cornerstone/HedgeDecisionCardV2'
import type { MintCardStrings } from '@/components/defi/cornerstone/MintCard'
import type { PromptBoxStrings } from '@/components/defi/cornerstone/PromptBox'
import { DecisionPipelineTrace } from '@/components/defi/somnia/DecisionPipelineTrace'
import type { TraceStrings } from '@/components/defi/somnia/DecisionPipelineTrace'
import { PRESETS } from '@/lib/apps/abrigo/cornerstone/presets'
import { getDecisionTraceById } from '@/lib/apps/abrigo/somnia/reader'
import type { Metadata } from 'next'
import { getLocale, getTranslations } from 'next-intl/server'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('somnia')
  return {
    title: `${t('cornerstone.pageTitle')} — Abrigo / DS2P Labs`,
    description: t('cornerstone.idleBody'),
  }
}

export default async function CornerstonePage() {
  const locale = await getLocale()
  const t = await getTranslations('somnia')
  const tLive = await getTranslations('somnia.cornerstone.live')

  // TraceStrings — threaded from RSC exactly like the [id] route.
  // MAJOR-9: consensusCaveat reused from feed.consensusCaveat.
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
    consensusCaveat: t('feed.consensusCaveat'),
  }

  // Pre-render a trace node for each preset (null-guarded → errorState).
  // RC-M5: if the trace is null, render the errorState copy — route MUST NOT 500.
  const traceNodes: Record<string, React.ReactNode> = {}
  for (const preset of PRESETS) {
    const trace = getDecisionTraceById(preset.recordedDecisionId)
    if (trace === null) {
      traceNodes[preset.id] = (
        <p className="text-text-muted text-sm py-4">{t('cornerstone.errorState')}</p>
      )
    } else {
      traceNodes[preset.id] = (
        <DecisionPipelineTrace decision={trace} strings={traceStrings} locale={locale} />
      )
    }
  }

  // CardV2Strings for HedgeDecisionCardV2
  const cardStrings: CardV2Strings = {
    forkVerifiedLabel: t('cornerstone.forkVerifiedLabel'),
    forkVerifiedAriaLabel: t('cornerstone.forkVerifiedAriaLabel'),
    mockSubLabel: t('cornerstone.mockSubLabel'),
    mockSubLabelAria: t('cornerstone.mockSubLabelAria'),
    humanAuthoredLabel: t('cornerstone.humanAuthoredLabel'),
    marketLabel: t('cornerstone.fieldMarket'),
    strikeLabel: t('cornerstone.fieldStrike'),
    sizeLabel: t('cornerstone.fieldSize'),
    directionLabel: t('cornerstone.fieldDirection'),
    schoolLabel: t('cornerstone.fieldSchool'),
    volWidthLabel: t('cornerstone.fieldVolWidth'),
    horizonLabel: t('cornerstone.fieldHorizon'),
    tickSpacingLabel: t('cornerstone.fieldTickSpacing'),
    assetLabel: t('cornerstone.fieldAsset'),
    maxLossLabel: t('cornerstone.maxLossLabel'),
    upsideLabel: t('cornerstone.upsideLabel'),
    marginLabel: t('cornerstone.fieldMargin'),
    mockUnit: t('cornerstone.mockUnit'),
    confirmGateCaption: t('cornerstone.confirmGateCaption'),
    confirmCta: t('cornerstone.confirmCta'),
    // D1 Davidson honesty split (09-03)
    nonErgodicDisclosedLabel: t('cornerstone.nonErgodicDisclosedLabel'),
    templateMarker: t('cornerstone.templateMarker'),
    booleanYesLabel: t('cornerstone.booleanYesLabel'),
    booleanNoLabel: t('cornerstone.booleanNoLabel'),
  }

  // MintCardStrings
  const mintStrings: MintCardStrings = {
    forkVerifiedLabel: t('cornerstone.forkVerifiedLabel'),
    forkVerifiedAriaLabel: t('cornerstone.forkVerifiedAriaLabel'),
    mockSubLabel: t('cornerstone.mockSubLabel'),
    mockSubLabelAria: t('cornerstone.mockSubLabelAria'),
    tokenIdLabel: t('cornerstone.fieldTokenId'),
    marginToken0Label: 'Margen delta (token0)',
    marginToken1Label: 'Margen delta (token1)',
    mockUnit: t('cornerstone.mockUnit'),
  }

  // Prompt / transcript strings threaded to client islands
  const promptStrings: PromptBoxStrings = {
    idleHeading: t('cornerstone.idleHeading'),
    idleBody: t('cornerstone.idleBody'),
    chip1Label: t('cornerstone.chip1Label'),
    chip1Caption: t('cornerstone.chip1Caption'),
    chip2Label: t('cornerstone.chip2Label'),
    chip2Caption: t('cornerstone.chip2Caption'),
    freeTextCaption: 'Tu texto se asocia al ejemplo más cercano; no se infiere en vivo.',
    placeholder: t('cornerstone.idleHeading'),
  }

  const transcriptStrings = {
    agent1Label: t('cornerstone.agent1Label'),
    agent2Label: t('cornerstone.forkVerifiedLabel'),
    mintLabel: 'Acuñación (mock)',
    replayingMock: t('cornerstone.replayingMock'),
    replayingMockAria: t('cornerstone.replayingMockAria'),
    errorState: t('cornerstone.errorState'),
  }

  // ModeBanner strings (Surface 1)
  const modeBannerStrings = {
    liveModeLabel: tLive('modeLiveLabel'),
    replayModeLabel: tLive('modeReplayLabel'),
    mockModeLabel: tLive('modeMockLabel'),
    disclosureEs: tLive('disclosureEs'),
    disclosureEn: tLive('disclosureEn'),
    forkVerifiedLabel: tLive('forkVerifiedLabel'),
    explorerAgent1Label: tLive('explorerAgent1Label'),
    explorerAgent2Label: tLive('explorerAgent2Label'),
  }

  // AgentCostPlaceholder strings (Surface 5)
  const costPlaceholderStrings = {
    heading: tLive('costPanelHeading'),
    bodyEs: tLive('costPanelBodyEs'),
    bodyEn: tLive('costPanelBodyEn'),
    contractName: tLive('costPanelContractName'),
    ariaLabel: tLive('costPanelAriaLabel'),
  }

  // LiveTxStateRow strings (Surface 2)
  const liveTxRowStrings = {
    submitting: tLive('txStateSubmitting'),
    pending: tLive('txStatePending'),
    confirmed: tLive('txStateConfirmed'),
    confirmBlock: tLive('txStateConfirmed'),
    reverted: tLive('txStateReverted'),
    error: tLive('txStateError'),
    copyHashAriaLabel: tLive('copyHashAriaLabel'),
  }

  const shellStrings: CornerstoneClientShellStrings = {
    modeBanner: modeBannerStrings,
    costPlaceholder: costPlaceholderStrings,
    liveTxRow: liveTxRowStrings,
    transcript: transcriptStrings,
    card: cardStrings,
    mint: mintStrings,
    prompt: promptStrings,
  }

  return (
    <main className="bg-canvas min-h-screen py-12">
      <div className="max-w-[720px] mx-auto px-4">
        {/* h1 — page title (FD-M4 heading outline root) */}
        <h1 className="text-[28px] font-semibold text-text-primary mb-8">
          {t('cornerstone.pageTitle')}
        </h1>

        {/* CornerstoneClientShell — client island owning mode switch, ModeBanner,
            RunTranscript, FreshnessGate, AgentCostPlaceholder.
            Resolves mode via parseMode (URL param ?mode=), DEFAULT_MODE = 'replay'.
            Mount-time eth_chainId probe decides direct-vs-/api/cornerstone/rpc proxy.
            Live path: useSwitchChain(31337) BEFORE useWriteContract({chainId:31337}). */}
        <CornerstoneClientShell traceNodes={traceNodes} strings={shellStrings} />
      </div>
    </main>
  )
}
