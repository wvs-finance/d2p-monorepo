// DecisionPipelineTrace — 6-stage vertical stepper for the deterministic decision pipeline.
// RSC — server component, no client directive. No recharts, no SVG layout lib.
// Reflows natively at 360px (UI-SPEC §1 rationale).
//
// HONESTY INVARIANTS (CROSS-09 / M4 / M6 / MAJOR-10):
//   - EXACTLY 6 equal-weight PipelineStage children (same marker, same title size, same shell).
//   - Illustrative position (stage 6) uses bridge.ts: decisionToPositionDelta + formatFractionOfMax.
//     NEVER a recomputed fraction. NEVER a dollar figure.
//   - consensus labeled operator-supplied via the REUSED feed.consensusCaveat threaded from page.
//     Do NOT mint a duplicate trace.consensusCaveat (MAJOR-9).
//   - Collapse is reserved for SystemPromptDisclosure ONLY (MAJOR-10 anti-fishing).
//     This file and PipelineStage.tsx must contain ZERO details/summary elements.
//   - Copy says "deterministic decision pipeline" — no fabricated CoT narrative.
//     Source identifiers for banned vocab are absent from this file (MINOR-14).
//   - Leg labels "Action" / "Size" are on-chain enum literals in mono — NOT localized (MINOR-17).
//   - legActionRequestId is always a real derived string; legActionTimestamp is Date|null (em-dash).
//
// Props:
//   decision — DecisionTraceView from getDecisionTraceById (Wave-0 reader seam)
//   strings  — pre-translated TraceStrings object threaded from the RSC page
//              (NO getTranslations inside this component — mirror Phase-6 string-threading pattern)
//              TraceStrings INCLUDES consensusCaveat threaded from feed.consensusCaveat (MAJOR-9).

import { decisionToPositionDelta, formatFractionOfMax } from '@/lib/apps/abrigo/somnia/bridge'
import { formatScaledPercent } from '@/lib/apps/abrigo/somnia/format'
import { formatSurprise } from '@/lib/apps/abrigo/somnia/surprise'
import type { DecisionTraceView, HedgeActionLabel } from '@/lib/apps/abrigo/somnia/types'
import { DataRow, PipelineStage } from './PipelineStage'
import { SystemPromptDisclosure } from './SystemPromptDisclosure'

// ---------------------------------------------------------------------------
// TraceStrings — all visible copy threaded from the RSC page
// ---------------------------------------------------------------------------

export interface TraceStrings {
  title: string
  stage1: string
  stage2: string
  stage2Caption: string
  stage3: string
  stage4: string
  stage5: string
  stage6: string
  systemPromptTrigger: string
  illustrativeCaption: string
  legLabelHeading: string
  modelIdLabel: string
  requestIdLabel: string
  timestampLabel: string
  provenanceLabel: string
  provenanceAriaLabel: string
  emptyState: string
  /**
   * REUSED from feed.consensusCaveat — NOT a new trace.consensusCaveat (MAJOR-9).
   * Threaded from the page to avoid es-CO/en drift between the two namespaces.
   */
  consensusCaveat: string
}

interface DecisionPipelineTraceProps {
  decision: DecisionTraceView
  strings: TraceStrings
  /**
   * BCP-47 locale string (e.g. "es-CO", "en") — threaded from the RSC page.
   * Used to format macroValue as a human-readable percent (5.68% / 5,68 %).
   * Defaults to "en" when not provided (backward-compat for call sites that
   * have not yet been updated, but BOTH call sites should pass locale).
   */
  locale?: string
}

// ---------------------------------------------------------------------------
// Action icon map (reuse HedgeDecisionCard approach — text-only, equal weight)
// ---------------------------------------------------------------------------

const ACTION_ICON: Record<HedgeActionLabel, string> = {
  HOLD: '≡',
  ADD_LONG_GAMMA: '↑',
  REDUCE: '↓',
  EXIT: '✕',
}

// ---------------------------------------------------------------------------
// ActionBadge — neutral shell (CROSS-09: identical for every action; no emphasis)
// ---------------------------------------------------------------------------

function ActionBadge({ action }: { action: HedgeActionLabel }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm font-medium ring-1 ring-inset text-text-muted ring-border-default bg-bg-surface">
      <span aria-hidden="true">{ACTION_ICON[action]}</span>
      <span className="font-mono">{action}</span>
    </span>
  )
}

// ---------------------------------------------------------------------------
// Timestamp formatter — em-dash for null (honest fallback)
// ---------------------------------------------------------------------------

function formatTimestamp(ts: Date | null, emptyState: string): string {
  if (ts === null) return emptyState
  return ts.toISOString()
}

// ---------------------------------------------------------------------------
// DecisionPipelineTrace component
// ---------------------------------------------------------------------------

export function DecisionPipelineTrace({
  decision,
  strings,
  locale = 'en',
}: DecisionPipelineTraceProps) {
  // Stage 6: illustrative position — REUSE bridge.ts (NEVER recompute)
  // decisionToPositionDelta expects HedgeDecisionView; pass the minimal shape it actually reads
  // (action + sizeBps) via a structurally compatible subset. DecisionTraceView carries both.
  const positionDelta = decisionToPositionDelta({
    decisionId: decision.requestId,
    action: decision.action,
    sizeBps: decision.sizeBps,
    macroValue: decision.macroValue,
    consensus: decision.consensus,
    decidedAt: decision.decidedAt,
    pending: false,
    sourceTxHash: decision.sourceTxHash,
  })
  const fractionString = formatFractionOfMax(positionDelta.fractionOfMaxBps)

  // Stage 5: surprise formatted
  const surpriseFormatted = formatSurprise(decision.surprise)

  const provProps = {
    provenanceLabel: strings.provenanceLabel,
    provenanceAriaLabel: strings.provenanceAriaLabel,
  }

  return (
    <section data-testid="pipeline-trace" className="space-y-6">
      {/* -------------------------------------------------------------------- */}
      {/* Stage 1: Macro print                                                 */}
      {/* -------------------------------------------------------------------- */}
      <PipelineStage title={strings.stage1} {...provProps}>
        <DataRow label="co/inflation-rate">
          {/* formatScaledPercent: 568n → "5.68%" (en) / "5,68 %" (es-CO). builtPrompt stays verbatim. */}
          <span>{formatScaledPercent(decision.macroValue, locale)}</span>
        </DataRow>
        <DataRow label={strings.timestampLabel}>
          <span>{formatTimestamp(decision.decidedAt, strings.emptyState)}</span>
        </DataRow>
      </PipelineStage>

      {/* -------------------------------------------------------------------- */}
      {/* Stage 2: Built prompt (deterministic)                                */}
      {/* SystemPromptDisclosure is ABOVE the built prompt (UI-SPEC §1).       */}
      {/* The built prompt stays EXPANDED always (not collapsible).            */}
      {/* -------------------------------------------------------------------- */}
      <PipelineStage title={strings.stage2} {...provProps}>
        <div className="py-2 space-y-2">
          <SystemPromptDisclosure triggerLabel={strings.systemPromptTrigger} />
          {/* Built prompt — deterministic reconstruction, always expanded */}
          <pre className="font-mono text-sm bg-bg-canvas border border-border-default rounded-md p-4 whitespace-pre-wrap break-words">
            {decision.builtPrompt}
          </pre>
          <p className="text-sm text-text-muted">{strings.stage2Caption}</p>
        </div>
      </PipelineStage>

      {/* -------------------------------------------------------------------- */}
      {/* Stage 3: Action leg (Qwen3-30B, temp 0)                              */}
      {/* "Action" is an on-chain enum literal in mono — NOT localized.        */}
      {/* model id 12847293847561029384 is real (Somnia LLM_AGENT_ID).         */}
      {/* -------------------------------------------------------------------- */}
      <PipelineStage title={strings.stage3} {...provProps}>
        {/* Action enum badge (neutral shell, reuse pattern from HedgeDecisionCard) */}
        <div className="flex items-center gap-2 py-2">
          <ActionBadge action={decision.action} />
        </div>
        <DataRow label={strings.modelIdLabel}>
          {/* Real model id from MacroHedgeStrategist.sol LLM_AGENT_ID */}
          <span>12847293847561029384</span>
        </DataRow>
        <DataRow label={strings.legLabelHeading}>
          {/* "Action" is an on-chain enum literal — NOT localized (MINOR-17) */}
          <span>Action</span>
        </DataRow>
        <DataRow label={strings.requestIdLabel}>
          <span>{decision.legActionRequestId}</span>
        </DataRow>
        <DataRow label={strings.timestampLabel}>
          {/* em-dash when null (e.g. 4083729 action-leg outside 1000-block window) */}
          <span>{formatTimestamp(decision.legActionTimestamp, strings.emptyState)}</span>
        </DataRow>
      </PipelineStage>

      {/* -------------------------------------------------------------------- */}
      {/* Stage 4: Size leg (Qwen3-30B, temp 0)                                */}
      {/* "Size" is an on-chain enum literal in mono — NOT localized.          */}
      {/* -------------------------------------------------------------------- */}
      <PipelineStage title={strings.stage4} {...provProps}>
        <DataRow label={strings.modelIdLabel}>
          <span>12847293847561029384</span>
        </DataRow>
        <DataRow label={strings.legLabelHeading}>
          {/* "Size" is an on-chain enum literal — NOT localized (MINOR-17) */}
          <span>Size</span>
        </DataRow>
        <DataRow label={strings.requestIdLabel}>
          <span>{decision.legSizeRequestId}</span>
        </DataRow>
        <DataRow label={strings.timestampLabel}>
          <span>{formatTimestamp(decision.legSizeTimestamp, strings.emptyState)}</span>
        </DataRow>
        <DataRow label="sizeBps">
          <span>{String(decision.sizeBps)}</span>
        </DataRow>
      </PipelineStage>

      {/* -------------------------------------------------------------------- */}
      {/* Stage 5: Decision                                                     */}
      {/* surprise gated behind the operator-supplied caveat (Phase-6 rule).   */}
      {/* REUSE feed.consensusCaveat (threaded) — NOT a new trace.consensusCaveat. */}
      {/* -------------------------------------------------------------------- */}
      <PipelineStage title={strings.stage5} {...provProps}>
        <div className="flex items-center gap-2 py-2">
          <ActionBadge action={decision.action} />
        </div>
        <DataRow label="sizeBps">
          <span>{String(decision.sizeBps)}</span>
        </DataRow>
        {/* consensus row with operator-supplied caveat (M4 honesty invariant) */}
        <div className="flex items-start justify-between gap-4 py-2">
          <dt className="text-text-muted text-sm space-y-0.5">
            <span>Consensus</span>
            {/* Operator caveat — visible text, not just aria-label (MAJOR-9: REUSED key) */}
            <span className="block text-xs text-text-muted">({strings.consensusCaveat})</span>
          </dt>
          <dd className="font-mono text-text-primary text-sm">{String(decision.consensus)}</dd>
        </div>
        {/* Surprise — within the same subtree as the operator-supplied caveat (Phase-6 gating rule) */}
        <DataRow label="Surprise">
          <span>{surpriseFormatted}</span>
        </DataRow>
      </PipelineStage>

      {/* -------------------------------------------------------------------- */}
      {/* Stage 6: Illustrative position                                        */}
      {/* REUSE bridge.ts: decisionToPositionDelta + formatFractionOfMax.      */}
      {/* NEVER a dollar figure. Bridge.ts owns the math — not recomputed here. (M6)  */}
      {/* fractionString is e.g. "68%" for ADD_LONG_GAMMA/6800n.               */}
      {/* -------------------------------------------------------------------- */}
      <PipelineStage title={strings.stage6} {...provProps}>
        <DataRow label="fraction-of-max">
          {/* bridge.ts fraction string (e.g. "68%" or "6%") — NEVER "$" */}
          <span>{fractionString}</span>
        </DataRow>
        <DataRow label="direction">
          <span>{positionDelta.direction}</span>
        </DataRow>
        {/* Illustrative caption — MUST say "not a real on-chain position" (BLOCKER-2 reword) */}
        <div className="py-2">
          <p className="text-sm text-text-muted">{strings.illustrativeCaption}</p>
        </div>
      </PipelineStage>
    </section>
  )
}
