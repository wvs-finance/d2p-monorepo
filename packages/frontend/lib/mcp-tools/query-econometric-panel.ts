// MCP tool: query_econometric_panel (AGENT-07).
// Intended to page the Abrigo econometric panel from the HuggingFace datasets-server. The
// panel dataset is NOT yet published / confirmed (research Q2), so today this returns an
// honest unavailable envelope — never fabricated rows (CROSS-09 anti-fishing). The handler
// guards the network probe so a rejected / 4xx /is-valid fetch resolves to the envelope and
// NEVER throws.
//
// M1 + zod-compat: outputSchema is the SINGLE ZodObject UnavailableEnvelope (never a union).
// Handler returns BOTH content[text] AND structuredContent (validateToolOutput throws otherwise).
//
// B4: `filters` is z.record(z.union([z.string(), z.number(), z.boolean()])) — numeric/range
// and boolean filters must be accepted, not just strings.

import { UnavailableEnvelope } from '@/lib/mcp-tools/contract'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'

// B4: dataset name is UNKNOWN (research Q2). Declare exactly ONE named constant. Do NOT inline
// an invented path anywhere else, and do NOT assert it as a fact in any shipped probe URL/note.
// UNVERIFIED — confirm against huggingface.co/wvs-finance before enabling /rows.
const HF_PANEL_DATASET = 'wvs-finance/abrigo-panel' // UNVERIFIED

export function registerQueryEconometricPanel(server: McpServer): void {
  server.registerTool(
    'query_econometric_panel',
    {
      title: 'Query econometric panel',
      description:
        'Pages the Abrigo econometric panel from HuggingFace, or returns an honest unavailable envelope when the dataset is not yet published. Rows are never fabricated.',
      inputSchema: z.object({
        app: z.string().default('abrigo'),
        panel: z.string(),
        // B4: string|number|boolean filter values (numeric/range/boolean filters accepted).
        filters: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
        offset: z.number().int().min(0).default(0),
        length: z.number().int().min(1).max(100).default(100),
      }),
      outputSchema: UnavailableEnvelope,
    },
    async (input) => {
      // Guarded probe: a rejected / 4xx /is-valid resolves to the unavailable envelope; the
      // handler NEVER throws on network failure. The dataset name is UNVERIFIED, so today the
      // probe outcome does not change the result — we always return unavailable.
      const probe = await fetch(
        `https://datasets-server.huggingface.co/is-valid?dataset=${HF_PANEL_DATASET}`,
      ).catch(() => null)
      void probe // outcome intentionally unused while the dataset is unverified

      // TODO (manual follow-up — see 04-VALIDATION § Manual-Only Verifications):
      //   1. Confirm HF_PANEL_DATASET against huggingface.co/wvs-finance (it is UNVERIFIED).
      //   2. When published and `probe.ok`, fetch /rows with:
      //        GET https://datasets-server.huggingface.co/rows
      //            ?dataset=<HF_PANEL_DATASET>&config=default&split=train
      //            &offset=<input.offset>&length=<input.length>   // max 100 rows/page
      //      Authorization: Bearer <HF_API_TOKEN> (optional for public datasets).
      //   3. Apply `input.filters` (string|number|boolean) and return a deployed/rows envelope.
      //   Until then, return the honest unavailable envelope below — never fabricate rows.

      const result = UnavailableEnvelope.parse({
        status: 'unavailable',
        app: input.app,
        panel: input.panel,
        // Org-only note (B4): points at the org, NEVER asserts the specific dataset path.
        note: 'Panel dataset is not yet published / confirmed. Check https://huggingface.co/wvs-finance for future availability.',
      })
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result) }],
        structuredContent: result,
      }
    },
  )
}
