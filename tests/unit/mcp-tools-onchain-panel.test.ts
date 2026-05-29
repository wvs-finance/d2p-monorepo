// @vitest-environment node
// Fake-server unit tests for the on-chain / econometric MCP tools (Plan 04-03).
//
// A minimal fake McpServer captures each registerTool callback so we can invoke the
// handler directly and assert the CallToolResult shape. NOTE: this fake server does NOT
// run the SDK's validateToolOutput — the REAL-SDK guard for that lives in the
// real-SDK suite (registerTool + tools/call over InMemoryTransport).
//
// CROSS-09 anti-fishing: against the EMPTY ABRIGO_INSTRUMENTS registry and the unpublished
// HuggingFace panel, every tool returns an honest structured envelope (not_deployed /
// unavailable) — never an MCP error, never fabricated terms / reserves / rows.

import { NotDeployedEnvelope, UnavailableEnvelope } from '@/lib/mcp-tools/contract'
import { registerGetInstrumentTerms } from '@/lib/mcp-tools/get-instrument-terms'
import { registerGetPoolState } from '@/lib/mcp-tools/get-pool-state'
import { registerQueryEconometricPanel } from '@/lib/mcp-tools/query-econometric-panel'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { describe, expect, test } from 'vitest'

type ToolResult = {
  content: { type: string; text: string }[]
  structuredContent?: unknown
  isError?: boolean
}
type Handler = (input: Record<string, unknown>) => Promise<ToolResult>
type ZodLike = { parse: (v: unknown) => unknown }
type ToolConfig = { inputSchema?: ZodLike }

// The real SDK applies the inputSchema (including Zod `.default(...)`) before invoking the
// handler. This fake server mirrors that: it parses the raw input through the registered
// inputSchema so handler-side defaults (e.g. app: 'abrigo') resolve exactly as in production.
// It still does NOT run validateToolOutput — that guard lives in the real-SDK suite.
function fakeServer(): { server: McpServer; calls: Map<string, Handler> } {
  const calls = new Map<string, Handler>()
  const server = {
    registerTool: (name: string, cfg: ToolConfig, cb: Handler) => {
      const wrapped: Handler = (input) => {
        const parsed = cfg.inputSchema
          ? (cfg.inputSchema.parse(input) as Record<string, unknown>)
          : input
        return cb(parsed)
      }
      calls.set(name, wrapped)
    },
  } as unknown as McpServer
  return { server, calls }
}

// Pull content[0].text safely under noUncheckedIndexedAccess; assert the text envelope.
function readText(result: ToolResult): string {
  const first = result.content[0]
  expect(first).toBeDefined()
  expect(first?.type).toBe('text')
  return first?.text ?? ''
}

describe('get_instrument_terms (AGENT-06)', () => {
  test('empty registry → not_deployed envelope (terms:null); text deep-equals structuredContent; no MCP error', async () => {
    const { server, calls } = fakeServer()
    registerGetInstrumentTerms(server)
    const handler = calls.get('get_instrument_terms')
    expect(handler).toBeTypeOf('function')

    const result = await (handler as Handler)({ instrument_id: 'abrigo-celo-1', chain: 'celo' })
    expect(result.isError).toBeFalsy()

    const parsed = JSON.parse(readText(result))
    expect(parsed).toEqual(result.structuredContent)
    expect(() => NotDeployedEnvelope.parse(parsed)).not.toThrow()
    expect(parsed).toEqual({
      status: 'not_deployed',
      instrument_id: 'abrigo-celo-1',
      chain: 'celo',
      terms: null,
      pool: null,
      note: parsed.note,
    })
    expect(typeof parsed.note).toBe('string')
    // No fabricated terms object.
    expect(parsed.terms).toBeNull()
  })
})

describe('get_pool_state (AGENT-07-pool)', () => {
  test('pool_address present → not_deployed envelope; instrument_id is the pool_address; no fabricated reserves', async () => {
    const { server, calls } = fakeServer()
    registerGetPoolState(server)
    const handler = calls.get('get_pool_state')
    expect(handler).toBeTypeOf('function')

    const result = await (handler as Handler)({ chain: 'celo', pool_address: '0xabc' })
    expect(result.isError).toBeFalsy()

    const text = readText(result)
    const parsed = JSON.parse(text)
    expect(parsed).toEqual(result.structuredContent)
    expect(() => NotDeployedEnvelope.parse(parsed)).not.toThrow()
    expect(parsed.status).toBe('not_deployed')
    expect(parsed.instrument_id).toBe('0xabc')
    expect(parsed.chain).toBe('celo')
    expect(parsed.pool).toBeNull()
    // Anti-fishing: no fabricated numeric reserves leak into the text.
    expect(text).not.toMatch(/"poolBalance":"?\d/)
  })

  test('no pool_address → not_deployed envelope with instrument_id:"unknown" (never null)', async () => {
    const { server, calls } = fakeServer()
    registerGetPoolState(server)
    const handler = calls.get('get_pool_state') as Handler

    const result = await handler({ chain: 'celo' })
    expect(result.isError).toBeFalsy()
    const parsed = JSON.parse(readText(result))
    expect(parsed).toEqual(result.structuredContent)
    expect(parsed.instrument_id).toBe('unknown')
    expect(parsed.instrument_id).not.toBeNull()
    expect(() => NotDeployedEnvelope.parse(parsed)).not.toThrow()
  })
})

describe('query_econometric_panel (AGENT-07)', () => {
  test('panel only → unavailable envelope; text deep-equals structuredContent; org-only note', async () => {
    const { server, calls } = fakeServer()
    registerQueryEconometricPanel(server)
    const handler = calls.get('query_econometric_panel')
    expect(handler).toBeTypeOf('function')

    const result = await (handler as Handler)({ panel: 'pair-d' })
    expect(result.isError).toBeFalsy()

    const parsed = JSON.parse(readText(result))
    expect(parsed).toEqual(result.structuredContent)
    expect(() => UnavailableEnvelope.parse(parsed)).not.toThrow()
    expect(parsed).toEqual({
      status: 'unavailable',
      app: 'abrigo',
      panel: 'pair-d',
      note: parsed.note,
    })
    // Org-only note (B4): mentions the org, never asserts the specific dataset path.
    expect(parsed.note).toContain('huggingface.co/wvs-finance')
    expect(parsed.note).not.toContain('abrigo-panel')
  })

  test('string|number|boolean filters accepted (B4); still returns unavailable; never throws on network', async () => {
    const { server, calls } = fakeServer()
    registerQueryEconometricPanel(server)
    const handler = calls.get('query_econometric_panel') as Handler

    const result = await handler({
      panel: 'pair-d',
      filters: { pair: 'D', minN: 120, passed: true },
    })
    expect(result.isError).toBeFalsy()
    const parsed = JSON.parse(readText(result))
    expect(parsed).toEqual(result.structuredContent)
    expect(parsed.status).toBe('unavailable')
    expect(parsed.note).not.toContain('abrigo-panel')
  })

  test('paging args accepted; no fabricated row data in text', async () => {
    const { server, calls } = fakeServer()
    registerQueryEconometricPanel(server)
    const handler = calls.get('query_econometric_panel') as Handler

    const result = await handler({ panel: 'pair-d', offset: 0, length: 50 })
    expect(result.isError).toBeFalsy()
    const text = readText(result)
    expect(text).not.toContain('"rows"')
    const parsed = JSON.parse(text)
    expect(parsed.status).toBe('unavailable')
  })
})
