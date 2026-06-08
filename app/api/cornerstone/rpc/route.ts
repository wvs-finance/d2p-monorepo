// app/api/cornerstone/rpc/route.ts
//
// JSON-RPC CORS proxy Route Handler for the BuildBear fork.
//
// GOVERNANCE (spec §3, spec v5 fix-3, plan 09-01 Task 4):
//   - Ships REGARDLESS of the CORS probe result. The `eth_chainId` browser probe on
//     mount decides direct-vs-proxy at runtime (wired in 09-04).
//   - Forward target is ALWAYS deployment.rpcUrl (from the mirrored artifact).
//     NEVER a hardcoded endpoint.
//   - On upstream failure: returns a JSON-RPC-shaped error envelope (never an
//     unhandled 500 crash).
//
// Pattern: mirrors the existing Somnia keeper-proxy pattern.
// runtime = 'nodejs' — enables full Node.js fetch (Edge runtime has restricted APIs).

import { deployment } from '@/lib/apps/abrigo/cornerstone/artifact-loader'
import { type NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

/**
 * POST /api/cornerstone/rpc
 *
 * Forwards the JSON-RPC body to the BuildBear fork RPC endpoint.
 * Returns the upstream JSON response, or a typed JSON-RPC error on failure.
 *
 * The forward target is deployment.rpcUrl (from the mirrored artifact — no hardcoded endpoint).
 *
 * Usage: the page does one `eth_chainId` browser probe on mount against the direct fork RPC;
 *   on CORS/network failure it falls back to POSTing through this proxy (wired in 09-04).
 *
 * @param req - the incoming NextRequest with a JSON-RPC body
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  let payload: { jsonrpc?: string; id?: number | string | null } = {}

  try {
    payload = await req.json()
  } catch {
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        id: null,
        error: { code: -32700, message: 'Parse error: invalid JSON body' },
      },
      { status: 400 },
    )
  }

  try {
    const upstream = await fetch(deployment.rpcUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!upstream.ok) {
      return NextResponse.json(
        {
          jsonrpc: '2.0',
          id: payload.id ?? null,
          error: {
            code: -32000,
            message: `Upstream RPC error: HTTP ${upstream.status}`,
          },
        },
        { status: 502 },
      )
    }

    const data: unknown = await upstream.json()
    return NextResponse.json(data)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown RPC proxy error'
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        id: payload.id ?? null,
        error: { code: -32000, message },
      },
      { status: 502 },
    )
  }
}
