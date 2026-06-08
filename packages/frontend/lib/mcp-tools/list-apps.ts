// MCP tool: list_apps (AGENT-03).
// Enumerates the lab's published app families directly from lib/apps/registry — no BFF
// HTTP hop (AGENT-01 no-duplication). The registry carries `description_key` (an i18n KEY),
// never prose: we emit it verbatim if present and NEVER fabricate a `description` field (B2).
//
// M1: when an outputSchema is registered the handler MUST return BOTH content[text] AND
// structuredContent, or the SDK's validateToolOutput throws McpError(InvalidParams).
// structuredContent must be an OBJECT (not a bare array) → the array is wrapped in { items }.

import { apps } from '@/lib/apps/registry'
import { AppEntryOut } from '@/lib/mcp-tools/contract'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'

export function registerListApps(server: McpServer): void {
  server.registerTool(
    'list_apps',
    {
      title: 'List apps',
      description:
        'Returns all published app families in the d2p Finance lab (slug, name, status, external_url).',
      inputSchema: z.object({}),
      outputSchema: z.object({ items: z.array(AppEntryOut) }),
    },
    async () => {
      const rows = apps.map((a) => {
        const row = {
          slug: a.slug,
          name: a.name,
          status: a.status,
          external_url: a.external_url ?? null,
          description_key: a.description_key,
        }
        // Fail loudly in dev if the registry shape ever drifts from the wire schema.
        return AppEntryOut.parse(row)
      })
      const payload = { items: rows }
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(payload) }],
        structuredContent: payload,
      }
    },
  )
}
