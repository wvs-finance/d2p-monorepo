// @vitest-environment node
// Plan 05 wires the route (barrel + disableSse) and un-skips these assertions.

import { GET, POST } from '@/app/api/mcp/[transport]/route'
import { describe, expect, test } from 'vitest'

describe('MCP route /api/mcp/[transport]', () => {
  test('POST /api/mcp/mcp initialize returns 200 JSON-RPC result', async () => {
    const req = new Request('http://localhost/api/mcp/mcp', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-03-26',
          capabilities: {},
          clientInfo: { name: 'test', version: '0' },
        },
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
  })

  test('tools/list returns all six tool names', async () => {
    const req = new Request('http://localhost/api/mcp/mcp', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} }),
    })
    const res = await POST(req)
    const text = await res.text()
    for (const name of [
      'list_apps',
      'list_iterations',
      'get_iteration_state',
      'get_instrument_terms',
      'get_pool_state',
      'query_econometric_panel',
    ]) {
      expect(text).toContain(name)
    }
  })

  test('GET /api/mcp/sse returns 404 (disableSse)', async () => {
    const res = await GET(new Request('http://localhost/api/mcp/sse'))
    expect(res.status).toBe(404)
  })
})
