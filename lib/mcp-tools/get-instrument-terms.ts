// MCP tool: get_instrument_terms (AGENT-06).
// Looks up a single Abrigo instrument by id from the ABRIGO_INSTRUMENTS registry — a direct
// lib import, no BFF HTTP hop (AGENT-01). The registry is EMPTY at launch, so today this
// always returns an honest not_deployed envelope (terms:null, pool:null) — NEVER an MCP
// error, NEVER fabricated terms (CROSS-09 anti-fishing). When a contract deploys, adding a
// row to ABRIGO_INSTRUMENTS is the only change needed to light up real terms here.
//
// M1 + zod-compat: outputSchema is the SINGLE ZodObject NotDeployedEnvelope (never a union —
// the SDK's normalizeObjectSchema only accepts a ZodObject via `.shape`). The handler MUST
// return BOTH content[text] AND structuredContent (validateToolOutput throws otherwise).

import { ABRIGO_INSTRUMENTS } from '@/lib/apps/abrigo/instruments'
import { NotDeployedEnvelope } from '@/lib/mcp-tools/contract'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'

export function registerGetInstrumentTerms(server: McpServer): void {
  server.registerTool(
    'get_instrument_terms',
    {
      title: 'Get instrument terms',
      description:
        'Returns the on-chain parameters (terms) of an Abrigo instrument, or an honest not_deployed envelope when no contract is live under this id on the given chain. Terms are never fabricated.',
      inputSchema: z.object({
        app: z.string().default('abrigo'),
        instrument_id: z.string(),
        chain: z.enum(['celo', 'ethereum', 'base', 'arbitrum', 'optimism']),
      }),
      outputSchema: NotDeployedEnvelope,
    },
    async (input) => {
      const instrument = ABRIGO_INSTRUMENTS.find((i) => i.id === input.instrument_id)

      // Registry is empty at launch → always not_deployed today. When a future deployment
      // lands, branch here to read real terms from the instrument (and serialize bigints).
      if (!instrument) {
        const result = NotDeployedEnvelope.parse({
          status: 'not_deployed',
          instrument_id: input.instrument_id,
          chain: input.chain,
          terms: null,
          pool: null,
          note: 'No Abrigo instrument is deployed under this id on this chain. Terms become available after contract launch.',
        })
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(result) }],
          structuredContent: result,
        }
      }

      // FUTURE PATH (not exercised on the empty registry today): an instrument exists →
      // read its on-chain terms, serialize any bigints, and return a deployed envelope.
      // Until that envelope shape is designed, fall back to the honest not_deployed shape.
      const result = NotDeployedEnvelope.parse({
        status: 'not_deployed',
        instrument_id: input.instrument_id,
        chain: input.chain,
        terms: null,
        pool: null,
        note: 'Instrument registered but term-reading is not yet wired. See ABRIGO_INSTRUMENTS.',
      })
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result) }],
        structuredContent: result,
      }
    },
  )
}
