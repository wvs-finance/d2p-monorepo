// tests/unit/cornerstone/rpc-proxy.test.ts
//
// TDD RED → GREEN tests for the JSON-RPC CORS proxy Route Handler.
//
// GOVERNANCE (spec §3, plan 09-01 Task 4):
//   - The proxy ALWAYS forwards to deployment.rpcUrl (never a hardcoded endpoint).
//   - On upstream success: returns the upstream JSON response.
//   - On upstream failure (non-200 / network error): returns a JSON-RPC-shaped error,
//     never an unhandled 500.
//
// Test strategy: use MSW server.use() to intercept fetch to deployment.rpcUrl and
// assert the proxy behavior.

import { deployment } from '@/lib/apps/abrigo/cornerstone/artifact-loader'
import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it } from 'vitest'
import { server } from '../../../msw/server'

afterEach(() => server.resetHandlers())

// Helper: create a mock Request with a JSON body
function makeRequest(body: object): Request {
  return new Request('http://localhost/api/cornerstone/rpc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('app/api/cornerstone/rpc/route POST handler', () => {
  it('forwards the JSON-RPC body to deployment.rpcUrl and returns upstream response', async () => {
    const payload = { jsonrpc: '2.0', id: 1, method: 'eth_chainId', params: [] }
    const upstreamResult = { jsonrpc: '2.0', id: 1, result: '0x7a69' }
    let capturedUrl = ''
    let capturedBody = ''

    server.use(
      http.post(deployment.rpcUrl, async ({ request }) => {
        capturedUrl = request.url
        capturedBody = await request.text()
        return HttpResponse.json(upstreamResult)
      }),
    )

    const { POST } = await import('@/app/api/cornerstone/rpc/route')
    const req = makeRequest(payload)
    const res = await POST(req as never)
    const body = await res.json()

    // Assert: the proxy forwarded to the artifact rpcUrl
    expect(capturedUrl).toBe(deployment.rpcUrl)
    expect(JSON.parse(capturedBody)).toEqual(payload)
    // Assert: the upstream JSON response is returned
    expect(body).toEqual(upstreamResult)
    expect(res.status).toBe(200)
  })

  it('returns a JSON-RPC-shaped error on upstream network error (MSW network error)', async () => {
    server.use(
      http.post(deployment.rpcUrl, () => {
        return HttpResponse.error()
      }),
    )

    const { POST } = await import('@/app/api/cornerstone/rpc/route')
    const req = makeRequest({ jsonrpc: '2.0', id: 42, method: 'eth_chainId', params: [] })
    const res = await POST(req as never)
    const body = await res.json()

    // Must NOT be an unhandled 500 — must be a JSON-RPC error envelope
    expect(body.jsonrpc).toBe('2.0')
    expect(body.id).toBe(42)
    expect(body.error).toBeDefined()
    expect(typeof body.error.code).toBe('number')
    expect(typeof body.error.message).toBe('string')
  })

  it('returns a JSON-RPC-shaped error on upstream non-200 response', async () => {
    server.use(
      http.post(deployment.rpcUrl, () => {
        return new HttpResponse('Bad Gateway', { status: 502 })
      }),
    )

    const { POST } = await import('@/app/api/cornerstone/rpc/route')
    const req = makeRequest({ jsonrpc: '2.0', id: 7, method: 'eth_blockNumber', params: [] })
    const res = await POST(req as never)
    const body = await res.json()

    expect(body.jsonrpc).toBe('2.0')
    expect(body.id).toBe(7)
    expect(body.error).toBeDefined()
    expect(body.error.code).toBe(-32000)
  })
})
