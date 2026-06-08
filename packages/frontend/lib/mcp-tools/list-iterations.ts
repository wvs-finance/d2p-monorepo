// MCP tool: list_iterations (AGENT-04).
// Maps to the on-site Velite `research` collection (imported via @/.velite → lib/velite-shim)
// per the 2026-05-13 IA correction. NO BFF HTTP hop (AGENT-01). The shim emits per-locale
// rows (es + en); we DEDUPE by slug keeping the es-CO row (locale === 'es') so the wire is
// locale-neutral and never leaks locale/body/toc.
//
// β/p-value/version/replication-hash/notebook-url are intentionally absent — IA correction
// 2026-05-13; never fabricate them. external_url is the notebook/analytics link; arxiv_id the
// citable id (cfmm rows only). Both are read defensively with `?? null`.
//
// B1: research `date` is a Date INSTANCE at runtime (velite shim) — every emitted date routes
// through dateToIso so the wire shape is an ISO string (z.string() would otherwise throw).
//
// M1: outputSchema registered → handler returns BOTH content[text] AND structuredContent,
// wrapped in { items } (structuredContent must be an object, not a bare array).

import { research } from '@/.velite'
import { ResearchEntryOut, dateToIso } from '@/lib/mcp-tools/contract'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'

// Dedupe per-locale rows by slug, preferring the es-CO row when both locales exist.
function dedupeByLocale(rows: typeof research): typeof research {
  const bySlug = new Map<string, (typeof research)[number]>()
  for (const row of rows) {
    const existing = bySlug.get(row.slug)
    if (!existing || row.locale === 'es') bySlug.set(row.slug, row)
  }
  return [...bySlug.values()]
}

export function registerListIterations(server: McpServer): void {
  server.registerTool(
    'list_iterations',
    {
      title: 'List iterations',
      description:
        "Lists Abrigo's on-site research outputs (decision memos, write-ups, papers). Defaults to the abrigo-hedge-design track; pass filter:'all' for every track or a specific track.",
      inputSchema: z.object({
        app: z.string().default('abrigo'),
        track: z.enum(['cfmm-microstructure', 'abrigo-hedge-design', 'notes']).optional(),
        filter: z.enum(['all']).optional(),
      }),
      outputSchema: z.object({ items: z.array(ResearchEntryOut) }),
    },
    async (input) => {
      const deduped = dedupeByLocale(research)
      const kept = deduped.filter((row) => {
        if (input.filter === 'all') return true
        if (input.track) return row.track === input.track
        return row.track === 'abrigo-hedge-design'
      })
      // Build each output object field-by-field — do NOT spread the raw row (leaks locale/body/toc).
      const rows = kept.map((row) =>
        ResearchEntryOut.parse({
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
        }),
      )
      const payload = { items: rows }
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(payload) }],
        structuredContent: payload,
      }
    },
  )
}
