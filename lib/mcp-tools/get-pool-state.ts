// MCP tool: get_pool_state (AGENT-07-pool).
// Reads live pool reserves via aggregateAllChains() — a direct lib import, no BFF HTTP hop
// (AGENT-01). The ABRIGO_INSTRUMENTS registry is EMPTY at launch, so every chain comes back
// status:'empty' (the aggregator short-circuits before touching any RPC client). With no live
// pool, this returns an honest not_deployed envelope (pool:null) — NEVER an MCP error, NEVER
// fabricated reserves (CROSS-09 anti-fishing).
//
// M1 + zod-compat: outputSchema is the SINGLE ZodObject NotDeployedEnvelope (never a union).
// Handler returns BOTH content[text] AND structuredContent (validateToolOutput throws otherwise).
//
// M4: instrument_id is `input.pool_address ?? 'unknown'` — the simple nullish-coalescing form.
// The envelope's instrument_id is the generic identifier slot; stuffing a pool address into it
// is a mild schema smell that is acceptable for v1 (the envelope is shared). If a future
// deployment lands, revisit a dedicated subject_id field.

import { serializeBigints } from '@/lib/chains/serialize'
import { aggregateAllChains } from '@/lib/dashboard/aggregator'
import { NotDeployedEnvelope } from '@/lib/mcp-tools/contract'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'

const CHAIN_NAME_BY_INPUT: Record<string, string> = {
  celo: 'Celo',
  ethereum: 'Ethereum',
  base: 'Base',
  arbitrum: 'Arbitrum One',
  optimism: 'OP Mainnet',
}

export function registerGetPoolState(server: McpServer): void {
  server.registerTool(
    'get_pool_state',
    {
      title: 'Get pool state',
      description:
        'Returns live Abrigo pool reserves for a chain, or an honest not_deployed envelope when no pool is live yet. Reserves are never fabricated; they become readable after contract launch.',
      inputSchema: z.object({
        app: z.string().default('abrigo'),
        chain: z.enum(['celo', 'ethereum', 'base', 'arbitrum', 'optimism']),
        pool_address: z.string().optional(),
      }),
      outputSchema: NotDeployedEnvelope,
    },
    async (input) => {
      const results = await aggregateAllChains()
      const targetName = CHAIN_NAME_BY_INPUT[input.chain]
      const chainResult = results.find((r) => r.chainName === targetName)

      // Empty / no-instruments path (always true today): honest not_deployed envelope.
      if (!chainResult || chainResult.status === 'empty' || chainResult.instruments.length === 0) {
        const result = NotDeployedEnvelope.parse({
          status: 'not_deployed',
          instrument_id: input.pool_address ?? 'unknown',
          chain: input.chain,
          terms: null,
          pool: null,
          note: 'No Abrigo pool is live on this chain yet. Reserves become readable after contract launch.',
        })
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(result) }],
          structuredContent: result,
        }
      }

      // FUTURE PATH — not exercised on the empty registry today. When a deployment lands,
      // wrap the aggregation result with serializeBigints(...) before JSON.stringify so the
      // viem bigint reserves serialize as strings (Phase-2 burn class). The deployed-pool
      // envelope shape is designed when contracts ship; today we never reach here.
      const safe = serializeBigints(chainResult)
      const result = NotDeployedEnvelope.parse({
        status: 'not_deployed',
        instrument_id: input.pool_address ?? 'unknown',
        chain: input.chain,
        terms: null,
        pool: null,
        note: `Pool data present for ${safe.chainName} but the live-state envelope is not yet wired.`,
      })
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result) }],
        structuredContent: result,
      }
    },
  )
}
