import { createMcpHandler } from 'mcp-handler'

// Phase 1: MCP route handler stub with zero tools registered.
// basePath MUST equal the directory that contains [transport] — i.e. the
// parent of this file's dynamic segment. DO NOT change to '/api/mcp/[transport]'.
// Phase 4 will call server.tool(...) here to register the actual tools.
const handler = createMcpHandler(
  (_server) => {
    // Phase 4 adds tools, e.g.:
    // server.tool('list_iterations', schema, impl)
  },
  {},
  {
    basePath: '/api/mcp', // MUST equal directory containing [transport]
  },
)

export { handler as GET, handler as POST, handler as DELETE }
