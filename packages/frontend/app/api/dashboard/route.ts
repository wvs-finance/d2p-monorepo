// Caching deferred to the contracts-deploy phase (03-CONTEXT deferred items) — nothing to
// cache while the registry is empty; cacheComponents stays off to keep the existing
// force-static routes working (B1).
import { aggregateAllChains } from '@/lib/dashboard/aggregator'
import type { DashboardResponse } from '@/lib/dashboard/contract'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const app = searchParams.get('app') ?? 'abrigo'

  // Today only 'abrigo' is supported (RC m4).
  if (app !== 'abrigo') {
    return Response.json({ error: 'unknown app' }, { status: 404 })
  }

  // All numeric fields are pre-stringified by the aggregator (Pitfall 2).
  const chains = await aggregateAllChains()

  const body: DashboardResponse = {
    version: 1,
    app,
    status: chains.every((c) => c.status !== 'degraded') ? 'ok' : 'degraded',
    chains,
    fetchedAt: new Date().toISOString(),
  }

  return Response.json(body)
}
