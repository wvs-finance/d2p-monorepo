import type { ChainAggregationResult } from '@/lib/dashboard/aggregator'
import type { ChainHealth } from '@/lib/status/health'

export interface DashboardResponse {
  version: 1
  app: string
  status: 'ok' | 'degraded'
  chains: ChainAggregationResult[]
  fetchedAt: string
}

export interface StatusResponse {
  version: 1
  status: 'ok' | 'degraded'
  build: string
  timestamp: string
  chains: ChainHealth[]
  apps: Record<string, { status: string; instrumentsDeployed: number }>
}
