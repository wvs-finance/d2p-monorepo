import { createEnv } from '@t3-oss/env-nextjs'
import { z } from 'zod'

// Phase 1 env schema — full server + client split (Plans 05 and 07 contribute).
// Build fails on any missing required var — satisfies FOUND-10.
// NODE_ENV is server-only; all NEXT_PUBLIC_* are client-safe.
export const env = createEnv({
  server: {
    // server-only: never exposed to the browser bundle
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    // injected by Vercel at deploy time; undefined in local dev (RESEARCH Pitfall 7)
    VERCEL_GIT_COMMIT_SHA: z.string().optional(),
    // Set to any truthy value to enable live Somnia RPC reads in reader.ts.
    // NEVER NEXT_PUBLIC_: this must stay server-only (RPC is not a public endpoint).
    // Default: undefined (snapshot mode).
    SOMNIA_LIVE: z.coerce.boolean().optional(),
    // Server-only (NEVER NEXT_PUBLIC_). Default undefined/false → position panel renders
    // not-deployed empty state. Re-derive adaptWrapper from the final ABI before flipping
    // (ABI is mid-dev/moving). Phase 7 default: false.
    WRAPPER_DEPLOYED: z.coerce.boolean().optional(),
    // Phase 9 Agent-1 Somnia operator key.
    // NEVER NEXT_PUBLIC_ — this is a funded testnet key that auto-spends STT per call.
    // The route 503s at runtime when absent (non-operator-deploy guard).
    // Required: funded Somnia testnet account with >50 STT.
    SOMNIA_OPERATOR_PK: z.string().min(1).optional(),
    // Shared-secret header for POST /api/abrigo/agent1.
    // The route returns 401 when x-agent1-secret does not match this value.
    // The route 503s when this env var is absent (non-operator-deploy guard).
    AGENT1_ROUTE_SECRET: z.string().min(1).optional(),
  },
  client: {
    // client-safe (NEXT_PUBLIC_*): public RPCs, WalletConnect ID, app URL
    NEXT_PUBLIC_RPC_CELO_PRIMARY: z.string().url(),
    NEXT_PUBLIC_RPC_ETH_PRIMARY: z.string().url(),
    NEXT_PUBLIC_RPC_BASE_PRIMARY: z.string().url(),
    NEXT_PUBLIC_RPC_ARB_PRIMARY: z.string().url(),
    NEXT_PUBLIC_RPC_OP_PRIMARY: z.string().url(),
    NEXT_PUBLIC_WALLETCONNECT_ID: z.string().min(1),
    NEXT_PUBLIC_APP_URL: z.string().url(),
  },
  // runtimeEnv: every key listed explicitly — @t3-oss strips unreferenced vars at build time
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    VERCEL_GIT_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA,
    SOMNIA_LIVE: process.env.SOMNIA_LIVE,
    WRAPPER_DEPLOYED: process.env.WRAPPER_DEPLOYED,
    SOMNIA_OPERATOR_PK: process.env.SOMNIA_OPERATOR_PK,
    AGENT1_ROUTE_SECRET: process.env.AGENT1_ROUTE_SECRET,
    NEXT_PUBLIC_RPC_CELO_PRIMARY: process.env.NEXT_PUBLIC_RPC_CELO_PRIMARY,
    NEXT_PUBLIC_RPC_ETH_PRIMARY: process.env.NEXT_PUBLIC_RPC_ETH_PRIMARY,
    NEXT_PUBLIC_RPC_BASE_PRIMARY: process.env.NEXT_PUBLIC_RPC_BASE_PRIMARY,
    NEXT_PUBLIC_RPC_ARB_PRIMARY: process.env.NEXT_PUBLIC_RPC_ARB_PRIMARY,
    NEXT_PUBLIC_RPC_OP_PRIMARY: process.env.NEXT_PUBLIC_RPC_OP_PRIMARY,
    NEXT_PUBLIC_WALLETCONNECT_ID: process.env.NEXT_PUBLIC_WALLETCONNECT_ID,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
})
