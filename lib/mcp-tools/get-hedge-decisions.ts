// MCP tool: get_hedge_decisions (06-03, AGENT-01/AGENT-02).
// Returns all recorded MacroHedgeStrategist decisions from the Somnia testnet (chain 50312)
// via the Wave-0 reader seam. Snapshot is the default source (deterministic, no network).
//
// Contract constraints:
// — outputSchema MUST be the single wrapping HedgeDecisionsEnvelope ZodObject (NEVER a bare
//   z.array or z.union — normalizeObjectSchema only accepts a ZodObject with `.shape`).
// — Handler returns BOTH content[{type:'text', text: JSON.stringify(...)}] AND structuredContent.
// — BigInt values are serialized as strings at THIS boundary (the reader returns bigint).
// — consensus is labeled "operator-supplied POC input, not market consensus" in consensusNote.
// — M4: do NOT assert that consensus was externally validated (grep M4 in STATE.md).
// — scale = 2 (CPI raw int 568 means 5.68%); surpriseFormatted preserves sign ("+0.68"/"-3.32").

import { getHedgeDecisions } from '@/lib/apps/abrigo/somnia/reader'
import { computeSurprise, formatSurprise } from '@/lib/apps/abrigo/somnia/surprise'
import { HedgeDecisionsEnvelope, dateToIso } from '@/lib/mcp-tools/contract'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'

/** Decimal scale for CPI raw ints in this Somnia testnet deployment. */
const CPI_SCALE = 2

/** Operator-supplied consensus caveat — ALWAYS this exact wording; M4: never claim external validation. */
const CONSENSUS_NOTE =
  'operator-supplied POC input, not market consensus — do not treat as a validated benchmark'

export function registerGetHedgeDecisions(server: McpServer): void {
  server.registerTool(
    'get_hedge_decisions',
    {
      title: 'Get hedge decisions (Somnia testnet)',
      description:
        'Returns all MacroHedgeStrategist hedge decisions from the Somnia testnet (chain 50312, chainId 50312). ' +
        'Source is the verified RPC snapshot (captureMethod: rpc). ' +
        'consensus is an operator-supplied POC input — NOT market or validator consensus. ' +
        'Do not act on these decisions as if they were consensus-validated outputs.',
      inputSchema: z.object({
        dataKey: z.string().default('co/inflation-rate'),
      }),
      outputSchema: HedgeDecisionsEnvelope,
    },
    async (input) => {
      const decisions = getHedgeDecisions(input.dataKey)

      const items = decisions.map((d) => {
        const surprise = computeSurprise(d.macroValue, d.consensus)
        return HedgeDecisionsEnvelope.shape.decisions.element.parse({
          decisionId: d.decisionId,
          action: d.action,
          sizeBps: String(d.sizeBps),
          macroValue: String(d.macroValue),
          consensus: String(d.consensus),
          surprise: String(surprise),
          scale: CPI_SCALE,
          surpriseFormatted: formatSurprise(surprise, CPI_SCALE),
          decidedAt: d.decidedAt !== null ? dateToIso(d.decidedAt) : null,
          pending: d.pending,
          sourceTxHash: d.sourceTxHash,
          consensusNote: CONSENSUS_NOTE,
        })
      })

      const result = HedgeDecisionsEnvelope.parse({
        status: 'recorded',
        chainId: 50312,
        dataKey: input.dataKey,
        decisions: items,
        note:
          'Somnia testnet POC (chain 50312). Two real decisions captured from tx hashes via live RPC. ' +
          'consensus field is an operator-supplied input for the POC demonstration — NOT market consensus. ' +
          'Do not use for production hedging decisions.',
      })

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result) }],
        structuredContent: result,
      }
    },
  )
}
