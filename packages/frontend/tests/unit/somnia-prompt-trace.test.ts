// @vitest-environment node
// Wave 0 (RED stub) — prompt-trace: deterministic _buildPrompt reconstruction + SYSTEM_PROMPT.
// Tests the exact on-chain string.concat template from MacroHedgeStrategist.sol L266-273.
// CRITICAL: consensus DIFFERS per decision — 500 for 4083729, 900 for 4083997.
// Turned GREEN by Plan 07-00 Task 2 (prompt-trace.ts lands).
// Excluded from tsconfig until Task 2 (imports not-yet-created module).

import { describe, expect, it } from 'vitest'

const MODULE = '@/lib/apps/abrigo/somnia/prompt-trace'

type PromptTraceModule = {
  SYSTEM_PROMPT: string
  buildPromptTrace: (actual: bigint, consensus: bigint) => string
}

describe('SYSTEM_PROMPT — verbatim on-chain constant (MacroHedgeStrategist.sol L53-54)', () => {
  it('equals the exact on-chain SYSTEM_PROMPT string', async () => {
    const { SYSTEM_PROMPT } = (await import(MODULE)) as PromptTraceModule
    expect(SYSTEM_PROMPT).toBe(
      'You are a macro hedging strategist. Given the actual macro print and the consensus expectation, choose a hedge action and size for a long-gamma cCOP-USD position. Be deterministic.',
    )
  })
})

describe('buildPromptTrace — deterministic reconstruction of _buildPrompt (L266-273)', () => {
  it('decision 4083729 (macro 568, consensus 500): exact string', async () => {
    const { buildPromptTrace } = (await import(MODULE)) as PromptTraceModule
    expect(buildPromptTrace(568n, 500n)).toBe(
      'Actual macro print (scaled int): 568. Consensus expectation (scaled int): 500. Choose hedge action and size for a long-gamma cCOP-USD position.',
    )
  })

  it('decision 4083997 (macro 568, consensus 900): exact string (ROUTE-CORRECT consensus)', async () => {
    const { buildPromptTrace } = (await import(MODULE)) as PromptTraceModule
    expect(buildPromptTrace(568n, 900n)).toBe(
      'Actual macro print (scaled int): 568. Consensus expectation (scaled int): 900. Choose hedge action and size for a long-gamma cCOP-USD position.',
    )
  })

  it('consensus 500 and consensus 900 produce DIFFERENT prompts (route-correct — NOT same for both)', async () => {
    const { buildPromptTrace } = (await import(MODULE)) as PromptTraceModule
    const prompt500 = buildPromptTrace(568n, 500n)
    const prompt900 = buildPromptTrace(568n, 900n)
    expect(prompt500).not.toBe(prompt900)
  })

  it('contains the exact tail phrase from _buildPrompt', async () => {
    const { buildPromptTrace } = (await import(MODULE)) as PromptTraceModule
    const prompt = buildPromptTrace(568n, 500n)
    expect(prompt).toContain('Choose hedge action and size for a long-gamma cCOP-USD position.')
  })

  it('takes bigint args and produces a string', async () => {
    const { buildPromptTrace } = (await import(MODULE)) as PromptTraceModule
    const result = buildPromptTrace(568n, 500n)
    expect(typeof result).toBe('string')
  })
})
