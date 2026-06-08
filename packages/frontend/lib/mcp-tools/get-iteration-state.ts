// MCP tool: get_iteration_state (AGENT-05).
// Looks up a single on-site research entry by slug from the Velite `research` collection
// (via @/.velite → lib/velite-shim) — no BFF HTTP hop (AGENT-01). Per the 2026-05-13 IA
// correction, iteration-level econometric detail (β/p-value/version/replication-hash/
// notebook-url) lives off-site in wvs-finance/abrigo-analytics and is NEVER fabricated here.
// external_url is the notebook link; arxiv_id the citable id.
//
// B1: research `date` is a Date INSTANCE at runtime (shim) → routed through dateToIso.
//
// NEW-BLOCKER FIX (M1 + zod-compat normalizeObjectSchema): the outputSchema MUST be a SINGLE
// ZodObject, NEVER a discriminated/union schema. The SDK's normalizeObjectSchema only accepts a
// ZodObject (checks `.shape`); a ZodUnion → undefined → validateToolOutput does
// safeParseAsync(undefined, structuredContent) → TypeError reading '_zod' on EVERY call
// (found AND not_found). Both branches therefore return structuredContent matching the SAME
// single-object shape { status, detail, app, slug, note? }.

import { research } from '@/.velite'
import { IterationDetailOut, dateToIso } from '@/lib/mcp-tools/contract'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'

const OutputSchema = z.object({
  status: z.enum(['found', 'not_found']),
  detail: IterationDetailOut.nullable(),
  app: z.string(),
  slug: z.string(),
  note: z.string().optional(),
})

export function registerGetIterationState(server: McpServer): void {
  server.registerTool(
    'get_iteration_state',
    {
      title: 'Get iteration state',
      description:
        'Returns the on-site research entry (decision memo / write-up / paper) for a given slug, or an honest not_found envelope. Iteration-level econometric detail lives off-site in wvs-finance/abrigo-analytics.',
      // `version` is accepted for API-compat but the on-site research model has no version
      // dimension; it is intentionally ignored.
      inputSchema: z.object({
        app: z.string().default('abrigo'),
        slug: z.string(),
        version: z.number().optional(),
      }),
      outputSchema: OutputSchema,
    },
    async (input) => {
      // Prefer the es-CO row when both locales exist.
      const matches = research.filter((r) => r.slug === input.slug)
      const row = matches.find((r) => r.locale === 'es') ?? matches[0]

      if (!row) {
        const payload = {
          status: 'not_found' as const,
          detail: null,
          app: input.app,
          slug: input.slug,
          note: 'No on-site research entry with this slug. Iteration-level econometric detail lives in wvs-finance/abrigo-analytics, not on this site.',
        }
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(payload) }],
          structuredContent: payload,
        }
      }

      // Build the detail field-by-field — do NOT spread the raw row (leaks locale/toc).
      const detail = IterationDetailOut.parse({
        slug: row.slug,
        title_es: row.title_es,
        title_en: row.title_en,
        type: row.type,
        track: row.track,
        date: dateToIso(row.date),
        authors: row.authors,
        summary_es: row.summary_es,
        summary_en: row.summary_en,
        external_url: row.external_url ?? null,
        arxiv_id: row.arxiv_id ?? null,
        body: row.body ?? null,
      })
      const payload = {
        status: 'found' as const,
        detail,
        app: input.app,
        slug: input.slug,
      }
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(payload) }],
        structuredContent: payload,
      }
    },
  )
}
