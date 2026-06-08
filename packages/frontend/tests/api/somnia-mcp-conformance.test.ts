// @vitest-environment node
// Real-SDK conformance test for the 06-03 Somnia MCP tools.
//
// Exercises the REAL McpServer.registerTool + validateToolOutput path over InMemoryTransport.
// This is the NEW-BLOCKER guard: a non-object outputSchema → normalizeObjectSchema undefined
// → TypeError in validateToolOutput. This test catches that failure LOUDLY in CI while the
// fake-server unit tests (somnia-mcp-tools.test.ts) cannot.
//
// Pattern: mirrors tests/api/mcp-real-sdk.test.ts exactly.

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { describe, expect, test } from 'vitest'

const HEDGE_MODULE = '@/lib/mcp-tools/get-hedge-decisions'
const MACRO_MODULE = '@/lib/mcp-tools/get-latest-macro-print'

type RegisterGetHedgeDecisions = { registerGetHedgeDecisions: (server: McpServer) => void }
type RegisterGetLatestMacroPrint = { registerGetLatestMacroPrint: (server: McpServer) => void }

describe('get_hedge_decisions — REAL McpServer + Client round-trip (outputSchema guard)', () => {
  test('tools/call returns 2 decisions; ADD_LONG_GAMMA first; sizeBps string; consensusNote present; content parity', async () => {
    const { registerGetHedgeDecisions } = (await import(HEDGE_MODULE)) as RegisterGetHedgeDecisions
    const server = new McpServer({ name: 'test', version: '0' })
    registerGetHedgeDecisions(server)

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
    const client = new Client({ name: 'test-client', version: '0' })
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)])

    const result = await client.callTool({
      name: 'get_hedge_decisions',
      arguments: { dataKey: 'co/inflation-rate' },
    })

    expect(result.isError).toBeFalsy()

    const structured = result.structuredContent as {
      decisions: {
        action: string
        sizeBps: string
        consensusNote: string
      }[]
      status: string
    }

    expect(structured?.decisions).toHaveLength(2)
    expect(structured?.decisions[0]?.action).toBe('ADD_LONG_GAMMA')
    // sizeBps must be a string (bigint→string serialization at the tool boundary)
    expect(typeof structured?.decisions[0]?.sizeBps).toBe('string')
    expect(structured?.decisions[0]?.sizeBps).toBe('6800')
    // consensusNote must be present (operator-supplied caveat, M4)
    expect(typeof structured?.decisions[0]?.consensusNote).toBe('string')
    expect(structured?.decisions[0]?.consensusNote?.length).toBeGreaterThan(0)

    // content[0].text must parse to the same object as structuredContent
    const content = result.content as { type: string; text: string }[]
    const parsed = JSON.parse(content[0]?.text ?? '{}')
    expect(parsed).toEqual(structured)
  })

  test('tools/call with default dataKey (no args) still returns decisions', async () => {
    const { registerGetHedgeDecisions } = (await import(HEDGE_MODULE)) as RegisterGetHedgeDecisions
    const server = new McpServer({ name: 'test', version: '0' })
    registerGetHedgeDecisions(server)

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
    const client = new Client({ name: 'test-client', version: '0' })
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)])

    const result = await client.callTool({
      name: 'get_hedge_decisions',
      arguments: {},
    })

    expect(result.isError).toBeFalsy()
    const structured = result.structuredContent as { decisions: unknown[]; status: string }
    expect(structured?.decisions).toHaveLength(2)
    expect(structured?.status).toBe('recorded')
  })
})

describe('get_latest_macro_print — REAL McpServer + Client round-trip (outputSchema guard)', () => {
  test('tools/call returns scaledValue "568" and dataKeyLabel "co/inflation-rate"; content parity', async () => {
    const { registerGetLatestMacroPrint } = (await import(
      MACRO_MODULE
    )) as RegisterGetLatestMacroPrint
    const server = new McpServer({ name: 'test', version: '0' })
    registerGetLatestMacroPrint(server)

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
    const client = new Client({ name: 'test-client', version: '0' })
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)])

    const result = await client.callTool({
      name: 'get_latest_macro_print',
      arguments: {},
    })

    expect(result.isError).toBeFalsy()

    const structured = result.structuredContent as {
      scaledValue: string
      dataKeyLabel: string
      status: string
      chainId: number
    }

    expect(structured?.scaledValue).toBe('568')
    expect(structured?.dataKeyLabel).toBe('co/inflation-rate')
    expect(structured?.status).toBe('recorded')
    expect(structured?.chainId).toBe(50312)

    // content[0].text must parse to the same object as structuredContent
    const content = result.content as { type: string; text: string }[]
    const parsed = JSON.parse(content[0]?.text ?? '{}')
    expect(parsed).toEqual(structured)
  })

  test('non-CPI dataKey: still returns honest co/inflation-rate (no fabrication)', async () => {
    const { registerGetLatestMacroPrint } = (await import(
      MACRO_MODULE
    )) as RegisterGetLatestMacroPrint
    const server = new McpServer({ name: 'test', version: '0' })
    registerGetLatestMacroPrint(server)

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
    const client = new Client({ name: 'test-client', version: '0' })
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)])

    const result = await client.callTool({
      name: 'get_latest_macro_print',
      arguments: { dataKey: 'co/capacity-utilization' },
    })

    expect(result.isError).toBeFalsy()
    const structured = result.structuredContent as { dataKeyLabel: string }
    // Must NOT fabricate a capacity-utilization print — returns honest CPI snapshot
    expect(structured?.dataKeyLabel).toBe('co/inflation-rate')
  })
})
