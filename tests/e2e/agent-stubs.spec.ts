import { expect, test } from '@playwright/test'

test('/llms.txt returns 200 plaintext with expected content', async ({ request }) => {
  const r = await request.get('/llms.txt')
  expect(r.status()).toBe(200)
  expect(r.headers()['content-type']).toContain('text/plain')
  const body = await r.text()
  expect(body).toContain('d2p Finance')
  expect(body).toContain('/api/mcp')
})

test('/.well-known/mcp.json returns 200 JSON with mcp_servers descriptor', async ({ request }) => {
  const r = await request.get('/.well-known/mcp.json')
  expect(r.status()).toBe(200)
  expect(r.headers()['content-type']).toContain('application/json')
  const body = await r.json()
  expect(body).toHaveProperty('mcp_servers')
  expect(Array.isArray(body.mcp_servers)).toBe(true)
  // Descriptor advertises both transports: streamable-http (/api/mcp/mcp) + sse (/api/mcp/sse).
  expect(body.mcp_servers.length).toBeGreaterThanOrEqual(1)
})

test('/.well-known/openapi.yaml returns 200 YAML with OpenAPI 3.1 header', async ({ request }) => {
  const r = await request.get('/.well-known/openapi.yaml')
  expect(r.status()).toBe(200)
  // Accept either 'application/yaml' or 'text/yaml'
  const ct = r.headers()['content-type'] ?? ''
  expect(ct.includes('application/yaml') || ct.includes('text/yaml')).toBe(true)
  const body = await r.text()
  expect(body).toContain('openapi: 3.1.0')
})

// MCP route: streamable-http (/api/mcp/mcp) is the canonical transport; the SSE path
// (/api/mcp/sse) returns 404 cleanly via mcp-handler's `disableSse: true` (no Redis).
// Plan 05 wired the tools + disableSse, so these two handshake assertions are live.
// No Redis is provisioned; the SSE path must 404, NOT crash with `redisUrl is required`.
test('/api/mcp/mcp streamable-http handshake — POST initialize is not 404', async ({ request }) => {
  const r = await request.post('/api/mcp/mcp', {
    headers: {
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
    },
    data: {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2025-03-26',
        capabilities: {},
        clientInfo: { name: 'e2e', version: '0' },
      },
    },
  })
  expect(r.status()).not.toBe(404)
})

test('/api/mcp/sse returns 404 (disableSse, no Redis)', async ({ request }) => {
  const r = await request.get('/api/mcp/sse')
  expect(r.status()).toBe(404)
})

test.fixme('root HTML contains JSON-LD WebSite + Organization', async ({ page }) => {
  await page.goto('/')
  const scripts = await page.locator('script[type="application/ld+json"]').count()
  expect(scripts).toBeGreaterThanOrEqual(2)
})
