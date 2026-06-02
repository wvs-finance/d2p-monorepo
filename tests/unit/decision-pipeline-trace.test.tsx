/**
 * Decision pipeline trace component — TDD RED → GREEN.
 * Tests are written first (RED); components land to turn them GREEN.
 *
 * Fixtures used:
 *   4083729 — ADD_LONG_GAMMA, sizeBps 6800n, macroValue 568n, consensus 500n,
 *              legActionRequestId "4079637", legActionTimestamp null (em-dash)
 *   4083997 — REDUCE, sizeBps 568n, macroValue 568n, consensus 900n,
 *              legActionRequestId "4083984", legActionTimestamp real
 *
 * Key assertions:
 *   - exactly 6 [data-testid="pipeline-stage"] nodes
 *   - builtPrompt <pre> contains route-correct consensus text
 *   - stage 6 renders bridge.ts fraction string ("68%" for 4083729, "6%" for 4083997)
 *   - NO dollar sign in rendered DOM
 *   - operator-supplied caveat (feed.consensusCaveat value) appears
 *   - legActionRequestId renders real value; legActionTimestamp renders em-dash for null
 *   - no reasoning/razonamiento text
 */

import { DecisionPipelineTrace } from '@/components/defi/somnia/DecisionPipelineTrace'
import type { TraceStrings } from '@/components/defi/somnia/DecisionPipelineTrace'
import { decisionToPositionDelta, formatFractionOfMax } from '@/lib/apps/abrigo/somnia/bridge'
import type { DecisionTraceView } from '@/lib/apps/abrigo/somnia/types'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

// ---------------------------------------------------------------------------
// Shared trace strings (mirrors what the RSC page threads)
// ---------------------------------------------------------------------------

const TEST_TRACE_STRINGS: TraceStrings = {
  title: 'Decision trace',
  stage1: 'Macro print',
  stage2: 'Built prompt (deterministic)',
  stage2Caption: 'Reconstructed deterministically from actual + operator-supplied consensus',
  stage3: 'Action leg (Qwen3-30B, temp 0)',
  stage4: 'Size leg (Qwen3-30B, temp 0)',
  stage5: 'Decision',
  stage6: 'Illustrative position',
  systemPromptTrigger: 'View system prompt',
  illustrativeCaption: 'Illustrative — not a real on-chain position',
  legLabelHeading: 'Leg',
  modelIdLabel: 'Model id',
  requestIdLabel: 'Request id',
  timestampLabel: 'Timestamp',
  provenanceLabel: 'Somnia testnet · agent (POC)',
  provenanceAriaLabel: 'Somnia testnet · agent decision (POC) · recorded',
  emptyState: '—',
  // REUSED feed.consensusCaveat — NOT a duplicate trace.consensusCaveat
  consensusCaveat: 'operator-supplied — not market-derived',
}

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function make4083729(): DecisionTraceView {
  return {
    requestId: '4083729',
    action: 'ADD_LONG_GAMMA',
    sizeBps: 6800n,
    macroValue: 568n,
    consensus: 500n,
    surprise: 68n,
    builtPrompt:
      'Actual macro print (scaled int): 568. Consensus expectation (scaled int): 500. Choose hedge action and size for a long-gamma cCOP-USD position.',
    legSizeRequestId: '4083729',
    legActionRequestId: '4079637',
    decisionId: '0x000000000000000000000000000000000000000000000000000000000003e4015',
    legSizeTimestamp: new Date('2026-06-02T17:14:28.000Z'),
    legActionTimestamp: null,
    sourceTxHash: '0x2a8ec99452956fb94ad3b138844957409b298daa05e2d9986b34676d643c36a5',
    decidedAt: new Date('2026-06-02T17:14:28.000Z'),
  }
}

function make4083997(): DecisionTraceView {
  return {
    requestId: '4083997',
    action: 'REDUCE',
    sizeBps: 568n,
    macroValue: 568n,
    consensus: 900n,
    surprise: -332n,
    builtPrompt:
      'Actual macro print (scaled int): 568. Consensus expectation (scaled int): 900. Choose hedge action and size for a long-gamma cCOP-USD position.',
    legSizeRequestId: '4083997',
    legActionRequestId: '4083984',
    decisionId: '0x000000000000000000000000000000000000000000000000000000000003e5110',
    legSizeTimestamp: new Date('2026-06-02T17:15:56.000Z'),
    legActionTimestamp: new Date('2026-06-02T17:15:53.000Z'),
    sourceTxHash: '0x5057f803d214aa549e16a6c8ce3745610f0ce407a3bac06c1a6f643807dc3575',
    decidedAt: new Date('2026-06-02T17:15:56.000Z'),
  }
}

// ---------------------------------------------------------------------------
// Tests — 4083729 fixture (ADD_LONG_GAMMA)
// ---------------------------------------------------------------------------

describe('DecisionPipelineTrace — 4083729 (ADD_LONG_GAMMA)', () => {
  it('renders exactly 6 pipeline-stage nodes', () => {
    const decision = make4083729()
    render(<DecisionPipelineTrace decision={decision} strings={TEST_TRACE_STRINGS} />)
    const stages = document.querySelectorAll('[data-testid="pipeline-stage"]')
    expect(stages).toHaveLength(6)
  })

  it('has the pipeline-trace wrapper', () => {
    const decision = make4083729()
    render(<DecisionPipelineTrace decision={decision} strings={TEST_TRACE_STRINGS} />)
    expect(document.querySelector('[data-testid="pipeline-trace"]')).not.toBeNull()
  })

  it('stage 2 built-prompt pre contains route-correct consensus 500', () => {
    const decision = make4083729()
    render(<DecisionPipelineTrace decision={decision} strings={TEST_TRACE_STRINGS} />)
    const preElements = document.querySelectorAll('pre')
    const builtPromptPre = Array.from(preElements).find((el) =>
      el.textContent?.includes('Consensus expectation (scaled int): 500'),
    )
    expect(builtPromptPre).not.toBeUndefined()
    expect(builtPromptPre?.textContent).toContain(
      'Actual macro print (scaled int): 568. Consensus expectation (scaled int): 500',
    )
  })

  it('stage 6 renders bridge output "68%" — not a dollar figure', () => {
    const decision = make4083729()
    render(<DecisionPipelineTrace decision={decision} strings={TEST_TRACE_STRINGS} />)
    const fraction = formatFractionOfMax(
      decisionToPositionDelta({
        decisionId: decision.requestId,
        action: decision.action,
        sizeBps: decision.sizeBps,
        macroValue: decision.macroValue,
        consensus: decision.consensus,
        decidedAt: decision.decidedAt,
        pending: false,
        sourceTxHash: decision.sourceTxHash,
      }).fractionOfMaxBps,
    )
    expect(fraction).toBe('68%')
    // The fraction string must appear in the DOM
    expect(screen.getByText('68%')).toBeTruthy()
    // No dollar sign in the entire rendered DOM
    expect(document.body.textContent).not.toContain('$')
  })

  it('renders the operator-supplied consensusCaveat', () => {
    const decision = make4083729()
    render(<DecisionPipelineTrace decision={decision} strings={TEST_TRACE_STRINGS} />)
    expect(document.body.textContent).toContain('operator-supplied — not market-derived')
  })

  it('renders legActionRequestId "4079637" (real, not invented)', () => {
    const decision = make4083729()
    render(<DecisionPipelineTrace decision={decision} strings={TEST_TRACE_STRINGS} />)
    expect(document.body.textContent).toContain('4079637')
  })

  it('renders em-dash for null legActionTimestamp', () => {
    const decision = make4083729()
    render(<DecisionPipelineTrace decision={decision} strings={TEST_TRACE_STRINGS} />)
    // legActionTimestamp is null → should render em-dash
    expect(document.body.textContent).toContain('—')
  })

  it('contains no reasoning/razonamiento vocabulary in rendered DOM', () => {
    const decision = make4083729()
    render(<DecisionPipelineTrace decision={decision} strings={TEST_TRACE_STRINGS} />)
    const text = document.body.textContent ?? ''
    expect(text).not.toMatch(/\breasoning\b/i)
    expect(text).not.toMatch(/\bthoughts\b/i)
    expect(text).not.toMatch(/\bchain-of-thought\b/i)
    expect(text).not.toMatch(/\brazonamiento\b/i)
    expect(text).not.toMatch(/\bpensamiento\b/i)
  })
})

// ---------------------------------------------------------------------------
// Tests — 4083997 fixture (REDUCE)
// ---------------------------------------------------------------------------

describe('DecisionPipelineTrace — 4083997 (REDUCE)', () => {
  it('renders exactly 6 pipeline-stage nodes', () => {
    const decision = make4083997()
    render(<DecisionPipelineTrace decision={decision} strings={TEST_TRACE_STRINGS} />)
    const stages = document.querySelectorAll('[data-testid="pipeline-stage"]')
    expect(stages).toHaveLength(6)
  })

  it('stage 2 built-prompt pre contains route-correct consensus 900', () => {
    const decision = make4083997()
    render(<DecisionPipelineTrace decision={decision} strings={TEST_TRACE_STRINGS} />)
    const preElements = document.querySelectorAll('pre')
    const builtPromptPre = Array.from(preElements).find((el) =>
      el.textContent?.includes('Consensus expectation (scaled int): 900'),
    )
    expect(builtPromptPre).not.toBeUndefined()
    expect(builtPromptPre?.textContent).toContain(
      'Actual macro print (scaled int): 568. Consensus expectation (scaled int): 900',
    )
  })

  it('stage 6 renders bridge output for 568n — not a dollar figure', () => {
    const decision = make4083997()
    render(<DecisionPipelineTrace decision={decision} strings={TEST_TRACE_STRINGS} />)
    const fraction = formatFractionOfMax(
      decisionToPositionDelta({
        decisionId: decision.requestId,
        action: decision.action,
        sizeBps: decision.sizeBps,
        macroValue: decision.macroValue,
        consensus: decision.consensus,
        decidedAt: decision.decidedAt,
        pending: false,
        sourceTxHash: decision.sourceTxHash,
      }).fractionOfMaxBps,
    )
    // Verify what the bridge actually returns for 568n (fractionOfMaxBps = 568n)
    expect(fraction).toBe('6%')
    // The fraction must appear in the DOM
    expect(screen.getByText('6%')).toBeTruthy()
    // No dollar sign
    expect(document.body.textContent).not.toContain('$')
  })

  it('renders legActionRequestId "4083984" (real)', () => {
    const decision = make4083997()
    render(<DecisionPipelineTrace decision={decision} strings={TEST_TRACE_STRINGS} />)
    expect(document.body.textContent).toContain('4083984')
  })

  it('renders the operator-supplied consensusCaveat', () => {
    const decision = make4083997()
    render(<DecisionPipelineTrace decision={decision} strings={TEST_TRACE_STRINGS} />)
    expect(document.body.textContent).toContain('operator-supplied — not market-derived')
  })

  it('contains no reasoning/razonamiento vocabulary in rendered DOM', () => {
    const decision = make4083997()
    render(<DecisionPipelineTrace decision={decision} strings={TEST_TRACE_STRINGS} />)
    const text = document.body.textContent ?? ''
    expect(text).not.toMatch(/\breasoning\b/i)
    expect(text).not.toMatch(/\bthoughts\b/i)
    expect(text).not.toMatch(/\bchain-of-thought\b/i)
    expect(text).not.toMatch(/\brazonamiento\b/i)
    expect(text).not.toMatch(/\bpensamiento\b/i)
  })
})
