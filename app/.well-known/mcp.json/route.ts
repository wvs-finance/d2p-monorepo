export const dynamic = 'force-static'

export function GET() {
  const body = {
    mcp_servers: [
      {
        url: '/api/mcp',
        transport: ['streamable-http', 'sse'],
        description:
          'd2p Finance protocol and research state (Phase 1 stub — tools added in Phase 4)',
      },
    ],
  }
  return Response.json(body)
}
