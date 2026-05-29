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

// MCP route: must exist (never 404). Returns 200 or 405 depending on transport negotiation.
// FIXME(Phase 4 — MCP Agent Surface): the SSE transport (mcp-handler) requires Redis
// (`redisUrl is required`); with no REDIS_URL the GET throws an unhandledRejection that
// destabilises the server and cascades into unrelated timeouts. Phase 4 builds the real
// MCP surface and will provision/mock Redis; re-enable this assertion there.
test.fixme('/api/mcp/sse route exists (no 404)', async ({ request }) => {
  const r = await request.get('/api/mcp/sse')
  expect(r.status()).not.toBe(404)
})

test.fixme('root HTML contains JSON-LD WebSite + Organization', async ({ page }) => {
  await page.goto('/')
  const scripts = await page.locator('script[type="application/ld+json"]').count()
  expect(scripts).toBeGreaterThanOrEqual(2)
})
