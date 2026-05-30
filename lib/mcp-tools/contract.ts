// Tool output envelopes. Canonical REST schemas (Dashboard/Status/Chain*/Instrument*/Health)
// live in @/lib/dashboard/contract and are RE-EXPORTED here — never re-declared.
// The OpenAPI extension is NOT applied here (it is owned by dashboard/contract.ts, M6);
// importing that module guarantees z is already extended before any tool annotates a schema.
//
// list_iterations/get_iteration_state map to the Velite `research` collection per the
// 2026-05-13 IA correction; the econometric exercise fields do not exist and are
// intentionally absent — never fabricate them. external_url is the notebook link,
// arxiv_id the citable id.
import { z } from 'zod'

// RE-EXPORT the canonical REST schemas (B3 single source of truth — no re-declaration).
// Every existing `from '@/lib/mcp-tools/contract'` import site keeps working through here.
export {
  ChainAggregationResultSchema,
  ChainHealthSchema,
  type DashboardResponse,
  DashboardResponseSchema,
  HealthResponseSchema,
  InstrumentStateSchema,
  type StatusResponse,
  StatusResponseSchema,
} from '@/lib/dashboard/contract'

// Date boundary helper (B1): research rows carry a Date INSTANCE at runtime (velite shim);
// every tool emitting a date routes it through here so the wire shape is an ISO string.
export const dateToIso = (d: Date | string): string =>
  d instanceof Date ? d.toISOString() : String(d)

// Anti-fishing (CROSS-09): terms/pool are the null LITERAL — never a fabricated object.
export const NotDeployedEnvelope = z.object({
  status: z.literal('not_deployed'),
  instrument_id: z.string(),
  chain: z.string(),
  terms: z.null(),
  pool: z.null(),
  note: z.string(),
})
export type NotDeployedEnvelope = z.infer<typeof NotDeployedEnvelope>

export const UnavailableEnvelope = z.object({
  status: z.literal('unavailable'),
  app: z.string(),
  panel: z.string(),
  note: z.string(),
})
export type UnavailableEnvelope = z.infer<typeof UnavailableEnvelope>

// B2: mirrors registry AppEntry. NO `description` field — the registry carries
// `description_key` (an i18n KEY), never prose. description_key is OPTIONAL on the wire.
export const AppEntryOut = z.object({
  slug: z.string(),
  name: z.string(),
  status: z.enum(['active', 'coming-soon', 'archived']),
  external_url: z.string().nullable(),
  description_key: z.string().optional(),
})
export type AppEntryOut = z.infer<typeof AppEntryOut>

// `date` is z.string() (ISO; tools normalize via dateToIso). No econometric exercise keys
// (descoped ITER-* exercise, 2026-05-13 IA correction). `notes` track is a v1 superset
// (currently zero rows; harmless).
export const ResearchEntryOut = z.object({
  slug: z.string(),
  title_es: z.string(),
  title_en: z.string(),
  type: z.enum(['paper', 'decision-memo', 'write-up', 'talk']),
  track: z.enum(['cfmm-microstructure', 'abrigo-hedge-design', 'notes']),
  date: z.string(),
  authors: z.array(z.string()),
  summary_es: z.string(),
  summary_en: z.string(),
  external_url: z.string().nullable(),
  arxiv_id: z.string().nullable(),
})
export type ResearchEntryOut = z.infer<typeof ResearchEntryOut>

// M2: NO replication-hash / notebook-url fields — they do NOT exist in the on-site data
// model (IA correction); external_url is the notebook link, arxiv_id the citable id.
export const IterationDetailOut = ResearchEntryOut.extend({ body: z.string().nullable() })
export type IterationDetailOut = z.infer<typeof IterationDetailOut>
