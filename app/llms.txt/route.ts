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
    '- https://d2pfinance.xyz/                                  (lab homepage)',
    '- https://d2pfinance.xyz/about                             (methodology)',
    '- https://d2pfinance.xyz/team                              (contributors)',
    '- https://d2pfinance.xyz/research                          (publications)',
    '- https://d2pfinance.xyz/apps/abrigo                       (Abrigo app overview)',
    '- https://d2pfinance.xyz/apps/abrigo/iterations            (iteration catalog)',
    '- https://d2pfinance.xyz/dashboard                         (live protocol state — coming Phase 3)',
    '',
    '## Agent endpoints',
    '- MCP server (Streamable HTTP):        /api/mcp/mcp',
    '- MCP server (SSE):                    /api/mcp/sse',
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
