// @vitest-environment node
// Fake-server unit tests for the registry/research MCP tools (Plan 04-02).
//
// A minimal fake McpServer captures each registerTool callback so we can invoke the
// handler directly and assert the CallToolResult shape. NOTE: this fake server does NOT
// run the SDK's validateToolOutput — the REAL-SDK guard for that lives in
// tests/api/mcp-real-sdk.test.ts (registerTool + tools/call over InMemoryTransport).

import { AppEntryOut, IterationDetailOut, ResearchEntryOut } from '@/lib/mcp-tools/contract'
import { registerGetIterationState } from '@/lib/mcp-tools/get-iteration-state'
import { registerListApps } from '@/lib/mcp-tools/list-apps'
import { registerListIterations } from '@/lib/mcp-tools/list-iterations'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { describe, expect, test } from 'vitest'

type ToolResult = {
  content: { type: string; text: string }[]
  structuredContent?: unknown
  isError?: boolean
}
type Handler = (input: Record<string, unknown>) => Promise<ToolResult>

function fakeServer(): { server: McpServer; calls: Map<string, Handler> } {
  const calls = new Map<string, Handler>()
  const server = {
    registerTool: (name: string, _cfg: unknown, cb: Handler) => calls.set(name, cb),
  } as unknown as McpServer
  return { server, calls }
}

const ISO_RE = /^\d{4}-\d{2}-\d{2}T/

// Pull content[0].text safely under noUncheckedIndexedAccess; assert the text envelope.
function readText(result: ToolResult): string {
  const first = result.content[0]
  expect(first).toBeDefined()
  expect(first?.type).toBe('text')
  return first?.text ?? ''
}

describe('list_apps (AGENT-03)', () => {
  test('returns { slug, name, status, external_url } rows; structuredContent deep-equals text; no description', async () => {
    const { server, calls } = fakeServer()
    registerListApps(server)
    const handler = calls.get('list_apps')
    expect(handler).toBeTypeOf('function')

    const result = await (handler as Handler)({})
    const parsed = JSON.parse(readText(result))
    expect(parsed).toEqual(result.structuredContent)

    const items = parsed.items as Record<string, unknown>[]
    expect(Array.isArray(items)).toBe(true)
    const abrigo = items.find((a) => a.slug === 'abrigo')
    expect(abrigo).toMatchObject({
      slug: 'abrigo',
      name: 'Abrigo',
      status: 'active',
      external_url: 'https://x.com/d2pfinabrigo',
    })
    // No fabricated `description` field (only the optional `description_key` i18n key).
    for (const row of items) {
      expect('description' in row).toBe(false)
      expect(() => AppEntryOut.parse(row)).not.toThrow()
    }
  })
})

describe('list_iterations (AGENT-04)', () => {
  test('default {} → exactly 3 deduped abrigo-hedge-design rows, ISO dates, no leaks', async () => {
    const { server, calls } = fakeServer()
    registerListIterations(server)
    const handler = calls.get('list_iterations')
    expect(handler).toBeTypeOf('function')

    const result = await (handler as Handler)({ app: 'abrigo' })
    const parsed = JSON.parse(readText(result))
    expect(parsed).toEqual(result.structuredContent)

    const items = parsed.items as Record<string, unknown>[]
    expect(items).toHaveLength(3)
    expect(new Set(items.map((r) => r.slug))).toEqual(
      new Set([
        'pair-d-dispatch-brief',
        'fx-vol-cpi-closed-fail',
        'abrigo-y3-carbon-basket-writeup',
      ]),
    )
    for (const row of items) {
      expect(row.track).toBe('abrigo-hedge-design')
      expect(typeof row.date).toBe('string')
      expect(row.date as string).toMatch(ISO_RE)
      // No econometric / locale / body / toc leaks.
      for (const banned of [
        'beta',
        'pValue',
        'p_value',
        'version',
        'locale',
        'body',
        'toc',
        'replication_hash',
        'notebook_url',
      ]) {
        expect(banned in row).toBe(false)
      }
      // external_url / arxiv_id are string-or-null, never undefined.
      expect(row.external_url === null || typeof row.external_url === 'string').toBe(true)
      expect(row.arxiv_id === null || typeof row.arxiv_id === 'string').toBe(true)
      expect(() => ResearchEntryOut.parse(row)).not.toThrow()
    }
  })

  test('{ filter: "all" } → all 4 distinct slugs regardless of track', async () => {
    const { server, calls } = fakeServer()
    registerListIterations(server)
    const handler = calls.get('list_iterations') as Handler

    const result = await handler({ app: 'abrigo', filter: 'all' })
    const items = JSON.parse(readText(result)).items as Record<string, unknown>[]
    expect(items).toHaveLength(4)
    expect(new Set(items.map((r) => r.slug))).toEqual(
      new Set([
        'pair-d-dispatch-brief',
        'fx-vol-cpi-closed-fail',
        'abrigo-y3-carbon-basket-writeup',
        'cfmm-microstructure-fixture',
      ]),
    )
  })

  test('{ track: "cfmm-microstructure" } → only the 1 cfmm slug', async () => {
    const { server, calls } = fakeServer()
    registerListIterations(server)
    const handler = calls.get('list_iterations') as Handler

    const result = await handler({ app: 'abrigo', track: 'cfmm-microstructure' })
    const items = JSON.parse(readText(result)).items as Record<string, unknown>[]
    expect(items).toHaveLength(1)
    const only = items[0]
    expect(only?.slug).toBe('cfmm-microstructure-fixture')
    expect(only?.arxiv_id).toBe('2401.12345')
  })
})

describe('get_iteration_state (AGENT-05)', () => {
  test('found slug → { status:"found", detail } single-object; text deep-equals structuredContent', async () => {
    const { server, calls } = fakeServer()
    registerGetIterationState(server)
    const handler = calls.get('get_iteration_state') as Handler

    const result = await handler({ app: 'abrigo', slug: 'pair-d-dispatch-brief' })
    const parsed = JSON.parse(readText(result))
    expect(parsed).toEqual(result.structuredContent)
    expect(parsed.status).toBe('found')

    const detail = parsed.detail as Record<string, unknown>
    expect(detail).not.toBeNull()
    expect(detail.slug).toBe('pair-d-dispatch-brief')
    expect(typeof detail.body).toBe('string')
    expect((detail.body as string).length).toBeGreaterThan(0)
    expect(detail.date as string).toMatch(ISO_RE)
    expect(typeof detail.external_url).toBe('string')
    expect(detail.arxiv_id).toBeNull()
    for (const banned of [
      'replication_hash',
      'notebook_url',
      'beta',
      'pValue',
      'version',
      'locale',
      'toc',
    ]) {
      expect(banned in detail).toBe(false)
    }
    expect(() => IterationDetailOut.parse(detail)).not.toThrow()
  })

  test('unknown slug → { status:"not_found", detail:null }; isError falsy', async () => {
    const { server, calls } = fakeServer()
    registerGetIterationState(server)
    const handler = calls.get('get_iteration_state') as Handler

    const result = await handler({ app: 'abrigo', slug: 'does-not-exist' })
    expect(result.isError).toBeFalsy()
    const parsed = JSON.parse(readText(result))
    expect(parsed).toEqual(result.structuredContent)
    expect(parsed.status).toBe('not_found')
    expect(parsed.detail).toBeNull()
    expect(parsed.app).toBe('abrigo')
    expect(parsed.slug).toBe('does-not-exist')
    expect(typeof parsed.note).toBe('string')
  })
})
