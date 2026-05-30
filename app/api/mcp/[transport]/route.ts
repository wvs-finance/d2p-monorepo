// AGENT-02 live MCP route — streamable-http handshake at /api/mcp/mcp; SSE → 404.
// runtime='nodejs' is REQUIRED: the tools import viem clients (lib/chains/clients.ts)
// which use Node.js APIs and break on the Edge runtime (04-RESEARCH Pitfall 2).
// disableSse:true makes GET /api/mcp/sse return 404 WITHOUT calling initializeRedis()
// — avoids the Phase-3.1 `redisUrl is required` unhandledRejection (Pitfall 1).
// All tool logic is imported from the lib/mcp-tools barrel (AGENT-01 no-duplication);
// this file contains NO inline tool definitions.
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import {
  registerGetInstrumentTerms,
  registerGetIterationState,
  registerGetPoolState,
  registerListApps,
  registerListIterations,
  registerQueryEconometricPanel,
} from '@/lib/mcp-tools'
import { createMcpHandler } from 'mcp-handler'

const handler = createMcpHandler(
  (server) => {
    registerListApps(server)
    registerListIterations(server)
    registerGetIterationState(server)
    registerGetInstrumentTerms(server)
    registerGetPoolState(server)
    registerQueryEconometricPanel(server)
  },
  {
    serverInfo: { name: 'd2p Finance MCP Server', version: '1.0.0' },
  },
  {
    basePath: '/api/mcp', // MUST equal directory containing [transport]
    disableSse: true, // SSE → 404 without Redis crash
  },
)

export { handler as GET, handler as POST, handler as DELETE }
