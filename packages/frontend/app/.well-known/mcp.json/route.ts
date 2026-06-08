export const dynamic = 'force-static'

export function GET() {
  const body = {
    mcp_servers: [
      {
        // Streamable-HTTP transport (mcp-handler's primary endpoint;
        // the path's "mcp" segment is the [transport] param value, not a duplicate
        // of the basePath — do not flatten to /api/mcp).
        url: '/api/mcp/mcp',
        transport: 'streamable-http',
        description:
          'd2p Finance protocol and research state (Phase 1 stub — tools added in Phase 4)',
      },
      {
        url: '/api/mcp/sse',
        transport: 'sse',
        description:
          'd2p Finance protocol and research state via SSE (deprecated in MCP spec; kept for legacy clients)',
      },
    ],
  }
  return Response.json(body)
}
