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
    '- https://d2pfinance.xyz/                   (lab homepage)',
    '- https://d2pfinance.xyz/iterations         (iteration catalog — coming Phase 2)',
    '- https://d2pfinance.xyz/dashboard          (live protocol state — coming Phase 3)',
    '- https://d2pfinance.xyz/research           (publications — coming Phase 2)',
    '',
    '## Agent endpoints',
    '- MCP server (Streamable HTTP + SSE):  /api/mcp/sse',
    '- OpenAPI 3.1 spec:                    /.well-known/openapi.yaml',
    '- MCP discovery:                       /.well-known/mcp.json',
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
