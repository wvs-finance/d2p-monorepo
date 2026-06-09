// lib/apps/abrigo/cornerstone/artifact-loader.ts
//
// Typed loader for the mirrored BuildBear fork deployment artifact.
//
// GOVERNANCE (09-RESEARCH Pattern 7 + spec §0.3):
//   - Static import (NOT require) — Turbopack-safe (the Phase-2/6 burn class lesson).
//     Static `import rawDeployment from './buildbear-deployments.json'` is bundled correctly
//     by both Turbopack dev and webpack prod. Dynamic path.resolve fails in Turbopack.
//   - Required fields validated at module load (fail fast — never silently undefined).
//   - isExpired(nowMs): 3-day TTL from capturedAt (the §0.3 sandbox TTL contract).
//   - rpcUrl MUST come from this loader — never a hardcoded endpoint anywhere else.

// Static relative import — Turbopack-safe (no dynamic require, no process.cwd())
import rawDeployment from './buildbear-deployments.json'

// ---------------------------------------------------------------------------
// BuildBearDeployment — typed shape of the mirrored artifact
// ---------------------------------------------------------------------------

export type BuildBearDeployment = {
  chainId: number
  executor: string
  pool: string
  riskManagement: string
  rpcUrl: string
  mintTxHash: string | null // null on --no-mint artifact (Phase 10)
  mintedStrike: number | null // null on --no-mint artifact (Phase 10)
  capturedAt: string
  source: string
  // Optional fields that may appear in later artifact versions
  factory?: string
  riskEngine?: string
  snapshotId?: string // NEW (Phase 10) — evm_snapshot id, hex e.g. "0x1"; absent on legacy artifacts
}

// ---------------------------------------------------------------------------
// Validate required fields at module load (fail fast)
// ---------------------------------------------------------------------------

export function validateDeployment(raw: unknown): BuildBearDeployment {
  const d = raw as Record<string, unknown>
  const required: (keyof BuildBearDeployment)[] = [
    'chainId',
    'executor',
    'pool',
    'rpcUrl',
    'capturedAt',
  ]
  for (const field of required) {
    if (d[field] === undefined || d[field] === null || d[field] === '') {
      throw new Error(
        `[artifact-loader] BuildBear deployment artifact missing required field: ${field}. Mirror the latest buildbear-deployments.json from abrigo-somnia/contracts/script/out/.`,
      )
    }
  }
  return raw as BuildBearDeployment
}

/**
 * deployment — the validated, typed BuildBear fork deployment artifact.
 *
 * Fields: chainId (31337), executor, pool, rpcUrl, capturedAt, mintTxHash, mintedStrike, source.
 * Validated at module load — a missing required field throws immediately (fail fast).
 *
 * rpcUrl: always use this for the fork RPC. NEVER hardcode rpc.buildbear.io anywhere.
 */
export const deployment: BuildBearDeployment = validateDeployment(rawDeployment)

// ---------------------------------------------------------------------------
// isExpired — 3-day TTL (the §0.3 sandbox TTL contract)
// ---------------------------------------------------------------------------

const TTL_MS = 3 * 24 * 60 * 60 * 1000 // 3 days in milliseconds

/**
 * isExpired(nowMs) — returns true if the sandbox is past its 3-day TTL.
 *
 * @param nowMs - current time in milliseconds (e.g. Date.now())
 * @returns true if nowMs > capturedAt + 3 days
 *
 * BOUNDARY: exactly at +3d is NOT expired (strict inequality `>`).
 * At +3d+1ms it IS expired.
 */
export function isExpired(nowMs: number): boolean {
  const capturedAtMs = new Date(deployment.capturedAt).getTime()
  return nowMs > capturedAtMs + TTL_MS
}
