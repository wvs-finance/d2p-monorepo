// @vitest-environment node
// 06-03 MCP tool unit tests — flips the Wave-0 RED stub GREEN.
//
// Fake-server tests (same pattern as mcp-tools-onchain-panel.test.ts).
// The fake server applies inputSchema.parse before calling the handler so
// Zod .default() values resolve exactly as in production. It does NOT run
// validateToolOutput — that guard lives in the real-SDK conformance suite
// (tests/api/somnia-mcp-conformance.test.ts).
//
// Assertions:
// — outputSchema.shape is defined (ZodObject guard; normalizeObjectSchema blocker)
// — get_hedge_decisions returns decisions wrapper with 2 items, correct fields,
//   bigints as strings, consensusNote present, surpriseFormatted sign-preserved,
//   scale === 2; content[0].text parses to same object as structuredContent
// — get_latest_macro_print returns scaledValue "568", dataKeyLabel "co/inflation-rate"
// — M4: no "consensus-verified" in any output

import { HedgeDecisionsEnvelope, LatestMacroPrintEnvelope } from '@/lib/mcp-tools/contract'
import { registerGetHedgeDecisions } from '@/lib/mcp-tools/get-hedge-decisions'
import { registerGetLatestMacroPrint } from '@/lib/mcp-tools/get-latest-macro-print'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { describe, expect, test } from 'vitest'

type ToolResult = {
  content: { type: string; text: string }[]
  structuredContent?: unknown
  isError?: boolean
}
type Handler = (input: Record<string, unknown>) => Promise<ToolResult>
type ZodLike = { parse: (v: unknown) => unknown; shape?: Record<string, unknown> }
type ToolConfig = { inputSchema?: ZodLike; outputSchema?: ZodLike }

// Fake server: captures outputSchema for ZodObject guard assertions,
// applies inputSchema.parse before invoking the handler.
function fakeServer(): {
  server: McpServer
  calls: Map<string, Handler>
  schemas: Map<string, { outputSchema: ZodLike | undefined }>
} {
  const calls = new Map<string, Handler>()
  const schemas = new Map<string, { outputSchema: ZodLike | undefined }>()
  const server = {
    registerTool: (name: string, cfg: ToolConfig, cb: Handler) => {
      schemas.set(name, { outputSchema: cfg.outputSchema ?? undefined })
      const wrapped: Handler = (input) => {
        const parsed = cfg.inputSchema
          ? (cfg.inputSchema.parse(input) as Record<string, unknown>)
          : input
        return cb(parsed)
      }
      calls.set(name, wrapped)
    },
  } as unknown as McpServer
  return { server, calls, schemas }
}

function readText(result: ToolResult): string {
  const first = result.content[0]
  expect(first).toBeDefined()
  expect(first?.type).toBe('text')
  return first?.text ?? ''
}

// ─── get_hedge_decisions ────────────────────────────────────────────────────

describe('get_hedge_decisions (06-03 AGENT-01/02)', () => {
  test('outputSchema.shape is defined — ZodObject guard (normalizeObjectSchema blocker)', () => {
    const { server, schemas } = fakeServer()
    registerGetHedgeDecisions(server)
    const schema = schemas.get('get_hedge_decisions')
    expect(schema).toBeDefined()
    // If outputSchema is NOT a ZodObject, .shape will be undefined → normalizeObjectSchema
    // returns undefined → TypeError in validateToolOutput on every call.
    expect(schema?.outputSchema?.shape).toBeDefined()
  })

  test('returns 2 decisions from snapshot (ADD_LONG_GAMMA + REDUCE)', async () => {
    const { server, calls } = fakeServer()
    registerGetHedgeDecisions(server)
    const handler = calls.get('get_hedge_decisions') as Handler

    const result = await handler({ dataKey: 'co/inflation-rate' })
    expect(result.isError).toBeFalsy()

    const structured = result.structuredContent as {
      decisions: unknown[]
      status: string
      chainId: number
    }
    expect(structured.decisions).toHaveLength(2)
    expect(structured.status).toBe('recorded')
    expect(structured.chainId).toBe(50312)
  })

  test('decision[0]: action ADD_LONG_GAMMA, sizeBps "6800", surprise "+0.68", scale 2', async () => {
    const { server, calls } = fakeServer()
    registerGetHedgeDecisions(server)
    const handler = calls.get('get_hedge_decisions') as Handler

    const result = await handler({})
    const structured = result.structuredContent as {
      decisions: {
        action: string
        sizeBps: string
        macroValue: string
        consensus: string
        surprise: string
        surpriseFormatted: string
        scale: number
        consensusNote: string
        pending: boolean
      }[]
    }
    const d0 = structured.decisions[0]
    expect(d0).toBeDefined()
    expect(d0?.action).toBe('ADD_LONG_GAMMA')
    expect(d0?.sizeBps).toBe('6800')
    expect(d0?.macroValue).toBe('568')
    expect(d0?.consensus).toBe('500')
    expect(d0?.surprise).toBe('68') // raw int string: 568 - 500 = 68
    expect(d0?.surpriseFormatted).toBe('+0.68')
    expect(d0?.scale).toBe(2)
    expect(d0?.pending).toBe(false)
    expect(typeof d0?.consensusNote).toBe('string')
    expect(d0?.consensusNote.length).toBeGreaterThan(0)
  })

  test('decision[1]: action REDUCE, sizeBps "568", surprise "-3.32" (below-consensus)', async () => {
    const { server, calls } = fakeServer()
    registerGetHedgeDecisions(server)
    const handler = calls.get('get_hedge_decisions') as Handler

    const result = await handler({})
    const structured = result.structuredContent as {
      decisions: {
        action: string
        sizeBps: string
        macroValue: string
        consensus: string
        surprise: string
        surpriseFormatted: string
        scale: number
        consensusNote: string
      }[]
    }
    const d1 = structured.decisions[1]
    expect(d1).toBeDefined()
    expect(d1?.action).toBe('REDUCE')
    expect(d1?.sizeBps).toBe('568')
    expect(d1?.macroValue).toBe('568')
    expect(d1?.consensus).toBe('900')
    expect(d1?.surprise).toBe('-332') // raw int string: 568 - 900 = -332
    expect(d1?.surpriseFormatted).toBe('-3.32')
    expect(d1?.scale).toBe(2)
  })

  test('consensusNote is present and contains operator-supplied caveat', async () => {
    const { server, calls } = fakeServer()
    registerGetHedgeDecisions(server)
    const handler = calls.get('get_hedge_decisions') as Handler

    const result = await handler({})
    const structured = result.structuredContent as {
      decisions: { consensusNote: string }[]
    }
    const note = structured.decisions[0]?.consensusNote ?? ''
    // Must contain the operator-supplied caveat (case-insensitive match)
    expect(note.toLowerCase()).toMatch(/operator/)
  })

  test('content[0].text parses to same object as structuredContent (dual return)', async () => {
    const { server, calls } = fakeServer()
    registerGetHedgeDecisions(server)
    const handler = calls.get('get_hedge_decisions') as Handler

    const result = await handler({ dataKey: 'co/inflation-rate' })
    const text = readText(result)
    const parsed = JSON.parse(text)
    expect(parsed).toEqual(result.structuredContent)
    expect(() => HedgeDecisionsEnvelope.parse(parsed)).not.toThrow()
  })

  test('M4 — no "consensus-verified" in structured output', async () => {
    const { server, calls } = fakeServer()
    registerGetHedgeDecisions(server)
    const handler = calls.get('get_hedge_decisions') as Handler

    const result = await handler({})
    const text = readText(result)
    expect(text.toLowerCase()).not.toContain('consensus-verified')
  })
})

// ─── get_latest_macro_print ─────────────────────────────────────────────────

describe('get_latest_macro_print (06-03 AGENT-01/02)', () => {
  test('outputSchema.shape is defined — ZodObject guard (normalizeObjectSchema blocker)', () => {
    const { server, schemas } = fakeServer()
    registerGetLatestMacroPrint(server)
    const schema = schemas.get('get_latest_macro_print')
    expect(schema).toBeDefined()
    expect(schema?.outputSchema?.shape).toBeDefined()
  })

  test('returns scaledValue "568" and dataKeyLabel "co/inflation-rate"', async () => {
    const { server, calls } = fakeServer()
    registerGetLatestMacroPrint(server)
    const handler = calls.get('get_latest_macro_print') as Handler

    const result = await handler({ dataKey: 'co/inflation-rate' })
    expect(result.isError).toBeFalsy()

    const structured = result.structuredContent as {
      scaledValue: string
      dataKeyLabel: string
      status: string
      chainId: number
      scale: number
    }
    expect(structured.scaledValue).toBe('568')
    expect(structured.dataKeyLabel).toBe('co/inflation-rate')
    expect(structured.status).toBe('recorded')
    expect(structured.chainId).toBe(50312)
    expect(structured.scale).toBe(2)
  })

  test('content[0].text parses to same object as structuredContent (dual return)', async () => {
    const { server, calls } = fakeServer()
    registerGetLatestMacroPrint(server)
    const handler = calls.get('get_latest_macro_print') as Handler

    const result = await handler({})
    const text = readText(result)
    const parsed = JSON.parse(text)
    expect(parsed).toEqual(result.structuredContent)
    expect(() => LatestMacroPrintEnvelope.parse(parsed)).not.toThrow()
  })

  test('default dataKey (no arg) still returns co/inflation-rate snapshot', async () => {
    const { server, calls } = fakeServer()
    registerGetLatestMacroPrint(server)
    const handler = calls.get('get_latest_macro_print') as Handler

    const result = await handler({})
    const structured = result.structuredContent as { dataKeyLabel: string; scaledValue: string }
    expect(structured.dataKeyLabel).toBe('co/inflation-rate')
    expect(structured.scaledValue).toBe('568')
  })

  test('non-CPI dataKey still returns honest co/inflation-rate (never fabricates capacity-utilization)', async () => {
    const { server, calls } = fakeServer()
    registerGetLatestMacroPrint(server)
    const handler = calls.get('get_latest_macro_print') as Handler

    const result = await handler({ dataKey: 'co/capacity-utilization' })
    expect(result.isError).toBeFalsy()
    const structured = result.structuredContent as { dataKeyLabel: string }
    // Must return co/inflation-rate — capacity-utilization is NOT wired (would be fabrication)
    expect(structured.dataKeyLabel).toBe('co/inflation-rate')
  })

  test('M4 — no "consensus-verified" in output', async () => {
    const { server, calls } = fakeServer()
    registerGetLatestMacroPrint(server)
    const handler = calls.get('get_latest_macro_print') as Handler

    const result = await handler({})
    const text = readText(result)
    expect(text.toLowerCase()).not.toContain('consensus-verified')
  })
})
