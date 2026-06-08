// MCP tool: get_latest_macro_print (06-03, AGENT-01/AGENT-02).
// Returns the latest MacroOracle CPI macro print from the Somnia testnet (chain 50312)
// via the Wave-0 reader seam. Snapshot is the default source (deterministic, no network).
//
// Contract constraints:
// — outputSchema MUST be the single wrapping LatestMacroPrintEnvelope ZodObject (never array/union).
// — Handler returns BOTH content[{type:'text', text: JSON.stringify(...)}] AND structuredContent.
// — BigInt scaledValue serialized as string at THIS boundary.
// — dataKeyLabel is the LITERAL 'co/inflation-rate' — capacity-utilization is NOT wired.
//   If a non-CPI dataKey is passed, still return the honest co/inflation-rate snapshot.
//   NEVER fabricate a capacity-utilization or other key's print.
// — M4: do NOT assert that consensus was externally validated (grep M4 in STATE.md).

import { getLatestMacroPrint } from '@/lib/apps/abrigo/somnia/reader'
import { LatestMacroPrintEnvelope, dateToIso } from '@/lib/mcp-tools/contract'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'

/** Decimal scale for CPI raw ints in this Somnia testnet deployment. */
const CPI_SCALE = 2

export function registerGetLatestMacroPrint(server: McpServer): void {
  server.registerTool(
    'get_latest_macro_print',
    {
      title: 'Get latest macro print (Somnia testnet)',
      description:
        'Returns the latest MacroOracle CPI macro print from the Somnia testnet (chain 50312). ' +
        'Only the co/inflation-rate key is wired in this deployment. ' +
        'Capacity-utilization and other keys are NOT available — requesting them returns the honest ' +
        'co/inflation-rate snapshot rather than fabricated data. ' +
        'Source is the verified RPC snapshot (captureMethod: rpc). ' +
        'Do not treat scaledValue as a live market feed — it is a recorded testnet observation.',
      inputSchema: z.object({
        dataKey: z.string().default('co/inflation-rate'),
      }),
      outputSchema: LatestMacroPrintEnvelope,
    },
    async (input) => {
      // capacity-utilization and any other non-CPI key are NOT wired — return the honest
      // co/inflation-rate snapshot regardless of what dataKey was requested. NEVER fabricate
      // a print for an unwired key.
      const print = getLatestMacroPrint('co/inflation-rate')

      const result = LatestMacroPrintEnvelope.parse({
        status: 'recorded',
        chainId: 50312,
        dataKey: input.dataKey,
        dataKeyLabel: 'co/inflation-rate',
        scaledValue: String(print.scaledValue),
        scale: CPI_SCALE,
        observedAt: null, // MacroOracle.sol hard-sets observedAt = 0 by design (B3 constraint)
        capturedAt: dateToIso(print.capturedAt),
        note:
          'Somnia testnet POC (chain 50312). CPI (co/inflation-rate) is the only wired macro key. ' +
          'capacity-utilization and other keys are not available in this deployment. ' +
          'scaledValue is a recorded testnet observation — not a live production feed.',
      })

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result) }],
        structuredContent: result,
      }
    },
  )
}
