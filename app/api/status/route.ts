// Caching deferred (B1); per-chain isolation is owned by checkAllChains — do not re-implement it inline (BA M1).
import type { StatusResponse } from '@/lib/dashboard/contract'
import { checkAllChains } from '@/lib/status/health'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const chains = await checkAllChains()

  const body: StatusResponse = {
    version: 1,
    status: chains.every((c) => c.status === 'healthy') ? 'ok' : 'degraded',
    build: process.env.VERCEL_GIT_COMMIT_SHA ?? 'local',
    timestamp: new Date().toISOString(),
    chains,
    apps: { abrigo: { status: 'pre-launch', instrumentsDeployed: 0 } },
  }

  return Response.json(body)
}
