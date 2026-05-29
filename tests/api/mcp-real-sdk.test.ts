// @vitest-environment node
// Wave 0 scaffold — skipped assertions are un-skipped by Plan 02 (get_iteration_state ships).
// vitest has no test.fixme; .skip is the red-pending equivalent that keeps the suite green.
//
// NEW-BLOCKER guard. Guards the union-outputSchema blocker: a ZodUnion outputSchema →
// normalizeObjectSchema undefined → TypeError in validateToolOutput on EVERY call. The
// single-object discriminated outputSchema must keep this green. This is the REAL-SDK
// round-trip the fake-server unit tests cannot catch: it exercises the actual
// McpServer.registerTool + validateToolOutput path over InMemoryTransport, so a
// non-ZodObject outputSchema fails LOUDLY in CI.

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { describe, expect, test } from 'vitest'

// Indirected so tsc does not statically resolve the not-yet-created module (Plan 02 ships it).
const TOOL_MODULE = '@/lib/mcp-tools/get-iteration-state'
type RegisterFn = { registerGetIterationState: (server: McpServer) => void }

describe('get_iteration_state — REAL McpServer + Client round-trip (output-schema guard)', () => {
  test.skip('tools/call round-trips a FOUND slug (single-object outputSchema accepted, structuredContent validates)', async () => {
    const { registerGetIterationState } = (await import(TOOL_MODULE)) as RegisterFn
    const server = new McpServer({ name: 'test', version: '0' })
    registerGetIterationState(server)

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
    const client = new Client({ name: 'test-client', version: '0' })
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)])

    const result = await client.callTool({
      name: 'get_iteration_state',
      arguments: { slug: 'pair-d-dispatch-brief' },
    })
    expect(result.isError).toBeFalsy()
    const structured = result.structuredContent as { status: string; detail: unknown } | undefined
    expect(structured?.status).toBe('found')
    expect(structured?.detail).not.toBeNull()
  })

  test.skip('tools/call round-trips a NOT-FOUND slug (status not_found, detail null)', async () => {
    const { registerGetIterationState } = (await import(TOOL_MODULE)) as RegisterFn
    const server = new McpServer({ name: 'test', version: '0' })
    registerGetIterationState(server)

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
    const client = new Client({ name: 'test-client', version: '0' })
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)])

    const result = await client.callTool({
      name: 'get_iteration_state',
      arguments: { slug: 'does-not-exist' },
    })
    expect(result.isError).toBeFalsy()
    const structured = result.structuredContent as { status: string; detail: unknown } | undefined
    expect(structured?.status).toBe('not_found')
    expect(structured?.detail).toBeNull()
  })
})
