// SINGLE SOURCE OF TRUTH (AGENT-01 / reviewer B3). extendZodWithOpenApi(z) is called
// ONLY here. lib/mcp-tools/contract.ts re-exports these schemas; lib/openapi/schemas.ts
// (Plan 04) imports them. NO module re-declares them or re-calls extendZodWithOpenApi.
//
// The REST envelopes (Dashboard/Status) were hand-written TS interfaces; they are now
// Zod-first so the OpenAPI generator (Plan 04) consumes the SAME schemas the routes type
// their bodies against — the spec cannot drift from the live route (the Phase-2/3 burn class).
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'
import { z } from 'zod'

extendZodWithOpenApi(z)

export const ChainHealthSchema = z
  .object({
    chainId: z.number(),
    name: z.string(),
    status: z.enum(['healthy', 'degraded']),
    blockNumber: z.string().optional(),
    latencyMs: z.number().optional(),
    error: z.string().optional(),
  })
  .openapi({ description: 'RPC health for a single configured chain' })

export const InstrumentStateSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    nameEn: z.string(),
    address: z.string(),
    poolBalance: z.string().nullable(),
    settlementCount: z.string().nullable(),
    lpPositionCount: z.string().nullable(),
  })
  .openapi({ description: 'Per-instrument on-chain state (numeric fields pre-stringified)' })

export const ChainAggregationResultSchema = z
  .object({
    chainId: z.number(),
    chainName: z.string(),
    status: z.enum(['healthy', 'degraded', 'empty']),
    instruments: z.array(InstrumentStateSchema),
    lastBlockSynced: z.string().nullable(),
    error: z.string().optional(),
    fetchedAt: z.string(),
  })
  .openapi({ description: 'Aggregated state for one chain (status:empty when no instruments)' })

export const DashboardResponseSchema = z
  .object({
    version: z.literal(1),
    app: z.string(),
    status: z.enum(['ok', 'degraded']),
    chains: z.array(ChainAggregationResultSchema),
    fetchedAt: z.string(),
  })
  .openapi({ description: 'GET /api/dashboard — per-app on-chain dashboard envelope (version:1)' })

export const StatusResponseSchema = z
  .object({
    version: z.literal(1),
    status: z.enum(['ok', 'degraded']),
    build: z.string(),
    timestamp: z.string(),
    chains: z.array(ChainHealthSchema),
    apps: z.record(z.object({ status: z.string(), instrumentsDeployed: z.number() })),
  })
  .openapi({ description: 'GET /api/status — RPC health per chain + build hash (version:1)' })

export const HealthResponseSchema = z
  .object({
    status: z.string(),
    build: z.string(),
    runtime: z.string(),
    timestamp: z.string(),
  })
  .openapi({ description: "GET /api/health — liveness probe (runtime:'node')" })

// Inferred types REPLACE the deleted hand-written interfaces. Same names → REST routes
// (app/api/dashboard/route.ts + app/api/status/route.ts) keep compiling with zero body changes.
export type DashboardResponse = z.infer<typeof DashboardResponseSchema>
export type StatusResponse = z.infer<typeof StatusResponseSchema>
