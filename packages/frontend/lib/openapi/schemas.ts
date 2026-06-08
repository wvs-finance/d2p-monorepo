import {
  ChainAggregationResultSchema,
  ChainHealthSchema,
  DashboardResponseSchema,
  HealthResponseSchema,
  InstrumentStateSchema,
  StatusResponseSchema,
} from '@/lib/mcp-tools/contract'
import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi'
import { z } from 'zod'

// OpenAPI registry for the public REST surface (AGENT-08).
//
// B3 SINGLE SOURCE OF TRUTH: the response schemas above are IMPORTED from the canonical
// definitions (lib/dashboard/contract via the lib/mcp-tools/contract re-export). They are
// NOT re-declared here, and the Zod OpenAPI extension is NOT applied here — it is applied
// ONCE in lib/dashboard/contract.ts (M6). Importing those schemas guarantees `z` is already
// extended, so .openapi() metadata travels with them into the generated document. Because
// the spec and the live routes share ONE Zod definition (proven equal by
// tests/api/openapi-conformance.test.ts), the spec cannot drift from actual response shapes
// — the Phase-2/3 boundary-artifact burn class.

export const registry = new OpenAPIRegistry()

// Register the canonical schemas under stable component names (no re-declaration).
registry.register('ChainHealth', ChainHealthSchema)
registry.register('InstrumentState', InstrumentStateSchema)
registry.register('ChainAggregationResult', ChainAggregationResultSchema)
registry.register('DashboardResponse', DashboardResponseSchema)
registry.register('StatusResponse', StatusResponseSchema)
registry.register('HealthResponse', HealthResponseSchema)

// GET /api/health — liveness probe. M5: the example uses runtime:'node' to match the live
// route (app/api/health/route.ts), NOT 'nodejs'.
registry.registerPath({
  method: 'get',
  path: '/api/health',
  summary: 'Liveness probe',
  description: 'Returns service liveness, build hash, and runtime label.',
  responses: {
    200: {
      description: 'Service is healthy.',
      content: {
        'application/json': {
          schema: HealthResponseSchema,
          example: {
            status: 'ok',
            build: 'local',
            runtime: 'node',
            timestamp: '2026-05-29T00:00:00.000Z',
          },
        },
      },
    },
  },
})

// GET /api/dashboard — per-app on-chain dashboard envelope. Pre-launch example is honest:
// status:'empty' with an empty instruments[] — no fabricated balances (CROSS-09).
registry.registerPath({
  method: 'get',
  path: '/api/dashboard',
  summary: 'Per-app on-chain dashboard envelope',
  description:
    'Aggregated per-chain instrument state for one app. The `app` query param defaults to `abrigo`.',
  parameters: [
    {
      name: 'app',
      in: 'query',
      required: false,
      description: "App slug (default 'abrigo'). Only 'abrigo' is supported today.",
      schema: { type: 'string', default: 'abrigo' },
    },
  ],
  responses: {
    200: {
      description: 'Dashboard envelope (version:1).',
      content: {
        'application/json': {
          schema: DashboardResponseSchema,
          example: {
            version: 1,
            app: 'abrigo',
            status: 'ok',
            chains: [
              {
                chainId: 42220,
                chainName: 'Celo',
                status: 'empty',
                instruments: [],
                lastBlockSynced: null,
                fetchedAt: '2026-05-29T00:00:00.000Z',
              },
            ],
            fetchedAt: '2026-05-29T00:00:00.000Z',
          },
        },
      },
    },
  },
})

// GET /api/status — RPC health per chain + build hash. Example shows a healthy and a
// degraded chain.
registry.registerPath({
  method: 'get',
  path: '/api/status',
  summary: 'RPC health per chain + build hash',
  description: 'Per-chain RPC health, build hash, and per-app deployment counts.',
  responses: {
    200: {
      description: 'Status envelope (version:1).',
      content: {
        'application/json': {
          schema: StatusResponseSchema,
          example: {
            version: 1,
            status: 'degraded',
            build: 'local',
            timestamp: '2026-05-29T00:00:00.000Z',
            chains: [
              {
                chainId: 42220,
                name: 'Celo',
                status: 'healthy',
                blockNumber: '12345678',
                latencyMs: 42,
              },
              { chainId: 8453, name: 'Base', status: 'degraded', error: 'rpc timeout' },
            ],
            apps: { abrigo: { status: 'pre-launch', instrumentsDeployed: 0 } },
          },
        },
      },
    },
  },
})

// POST /api/mcp/mcp — MCP streamable-http transport. OpenAPI cannot usefully type a
// JSON-RPC 2.0 envelope (method-dispatched union of request/response shapes), so the
// contract is described in prose plus one example request body. The response is framed as
// either application/json or text/event-stream wrapping a JSON-RPC 2.0 result.
registry.registerPath({
  method: 'post',
  path: '/api/mcp/mcp',
  summary: 'MCP streamable-http endpoint (JSON-RPC 2.0)',
  description: [
    'Model Context Protocol streamable-http transport. The request and response bodies are',
    'JSON-RPC 2.0 envelopes whose shape is dispatched on `method` (e.g. `initialize`,',
    '`tools/list`, `tools/call`), so they are not modelled as a fixed OpenAPI schema here.',
    'Send a JSON-RPC 2.0 request body; the response is `application/json` or',
    '`text/event-stream` framing a JSON-RPC 2.0 result. The SSE transport at /api/mcp/sse is',
    'disabled (returns 404 — no Redis provisioned); use this streamable-http path.',
  ].join(' '),
  request: {
    body: {
      content: {
        'application/json': {
          // Freeform JSON-RPC 2.0 envelope — intentionally not a fixed schema; the example
          // carries the concrete request shape.
          schema: z.object({}).passthrough(),
          example: { jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} },
        },
      },
    },
  },
  responses: {
    200: {
      description: 'JSON-RPC 2.0 result, framed as application/json or text/event-stream.',
      content: {
        'application/json': {
          schema: z.object({}).passthrough(),
          example: { jsonrpc: '2.0', id: 1, result: { tools: [] } },
        },
      },
    },
  },
})
