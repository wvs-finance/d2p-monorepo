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

// ---------------------------------------------------------------------------
// Somnia agent-surface envelopes (06-03 — Component C)
// Single wrapping ZodObject per envelope — never a bare array/union at the top level.
// The MCP SDK normalizeObjectSchema requires a ZodObject (needs .shape to be defined).
// BigInt values are STRINGS on the wire (bigint→String() at the tool boundary).
// consensusNote carries the honest "operator-supplied POC input, not market consensus" caveat.
// scale = 2 → raw int 568 means 5.68%; surpriseFormatted preserves sign ("+0.68" / "-3.32").
// M4: do NOT assert that consensus was externally validated in these schemas or tool copy.
// ---------------------------------------------------------------------------

export const HedgeDecisionItem = z.object({
  /** requestId (uint256) serialized as string. */
  decisionId: z.string(),
  /** Human-readable action label from the on-chain uint8 enum. */
  action: z.enum(['HOLD', 'ADD_LONG_GAMMA', 'REDUCE', 'EXIT']),
  /** sizeBps (uint256) as string. MAX_SIZE_BPS = 10000. */
  sizeBps: z.string(),
  /** macroValue (int256) as string. e.g. "568" = CPI 5.68% at scale=2. */
  macroValue: z.string(),
  /**
   * consensus as string. OPERATOR-SUPPLIED POC INPUT — not market consensus.
   * See consensusNote for the full caveat.
   */
  consensus: z.string(),
  /** Raw surprise int as string: macroValue − consensus (in BigInt space). */
  surprise: z.string(),
  /**
   * Decimal scale of the raw ints (always 2 for CPI in this deployment).
   * raw / 10^scale = human value. e.g. scale=2 → 568 means 5.68%.
   */
  scale: z.number(),
  /** Human-readable surprise with sign preserved. e.g. "+0.68" or "-3.32". */
  surpriseFormatted: z.string(),
  /** ISO timestamp when the decision landed on-chain, or null when pending. */
  decidedAt: z.string().nullable(),
  /** true when the decision is not yet fully settled on-chain. */
  pending: z.boolean(),
  /** Transaction hash of the HedgeDecisionMade event. */
  sourceTxHash: z.string(),
  /**
   * Honest caveat about the consensus field.
   * Always: "operator-supplied POC input, not market consensus".
   */
  consensusNote: z.string(),
})
export type HedgeDecisionItem = z.infer<typeof HedgeDecisionItem>

/**
 * Wrapping envelope for get_hedge_decisions.
 * Single ZodObject — required by MCP SDK normalizeObjectSchema.
 */
export const HedgeDecisionsEnvelope = z.object({
  /** "recorded" = snapshot source; "live" = live RPC source (SOMNIA_LIVE flagged). */
  status: z.enum(['recorded', 'live']),
  /** Somnia testnet chain ID. */
  chainId: z.literal(50312),
  /** Macro data key queried (e.g. "co/inflation-rate"). */
  dataKey: z.string(),
  /** All hedge decisions from the MacroHedgeStrategist. */
  decisions: z.array(HedgeDecisionItem),
  /**
   * Contextual note for agent consumers. Must describe POC/testnet status
   * and operator-supplied consensus — NEVER asserts external consensus validation.
   */
  note: z.string(),
})
export type HedgeDecisionsEnvelope = z.infer<typeof HedgeDecisionsEnvelope>

/**
 * Wrapping envelope for get_latest_macro_print.
 * Single ZodObject — required by MCP SDK normalizeObjectSchema.
 */
export const LatestMacroPrintEnvelope = z.object({
  /** "recorded" = snapshot source; "live" = live RPC source (SOMNIA_LIVE flagged). */
  status: z.enum(['recorded', 'live']),
  /** Somnia testnet chain ID. */
  chainId: z.literal(50312),
  /** Macro data key queried. */
  dataKey: z.string(),
  /** Always "co/inflation-rate" — capacity-utilization is NOT wired (would be fabrication). */
  dataKeyLabel: z.literal('co/inflation-rate'),
  /** scaledValue (int256) as string. e.g. "568" = 5.68% at scale=2. */
  scaledValue: z.string(),
  /**
   * Decimal scale of the raw int (always 2 for CPI in this deployment).
   * raw / 10^scale = human value. e.g. scale=2 → 568 means 5.68%.
   */
  scale: z.number(),
  /** ISO timestamp when the snapshot was captured. */
  observedAt: z.string().nullable(),
  /** ISO timestamp when the snapshot was captured (source-of-truth timestamp). */
  capturedAt: z.string(),
  /**
   * Contextual note for agent consumers. Describes POC/testnet status.
   * NEVER asserts external consensus validation.
   */
  note: z.string(),
})
export type LatestMacroPrintEnvelope = z.infer<typeof LatestMacroPrintEnvelope>
