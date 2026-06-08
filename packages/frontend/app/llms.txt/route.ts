export const dynamic = 'force-static'

export function GET() {
  const body = [
    '# d2p Finance / DS2P Labs',
    '',
    'Research lab designing permissionless convex-hedge instruments for frontier markets.',
    '',
    '## License',
    'Content: MIT. Code: see repository LICENSE files.',
    '',
    '## Primary URLs',
    '- https://www.d2pfinance.xyz/                              (lab homepage)',
    '- https://www.d2pfinance.xyz/about                         (methodology)',
    '- https://www.d2pfinance.xyz/team                          (contributors)',
    '- https://www.d2pfinance.xyz/research                      (publications)',
    '- https://www.d2pfinance.xyz/apps/abrigo                   (Abrigo app overview)',
    '- https://www.d2pfinance.xyz/apps/abrigo/dashboard         (Abrigo live protocol state)',
    '',
    '## Agent endpoints',
    '- MCP server (Streamable HTTP, canonical):  /api/mcp/mcp',
    '- MCP server (SSE):                         /api/mcp/sse   (disabled — returns 404, no Redis)',
    '- OpenAPI 3.1 spec:                         /.well-known/openapi.yaml',
    '- MCP discovery:                            /.well-known/mcp.json',
    '',
    '## Machine/API endpoints',
    '- Dashboard JSON:                           /api/dashboard',
    '- RPC + build status JSON:                  /api/status',
    '- Liveness probe:                           /api/health',
    '',
    '## Org',
    'GitHub: https://github.com/wvs-finance',
    '',
  ].join('\n')
  return new Response(body, {
    status: 200,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
