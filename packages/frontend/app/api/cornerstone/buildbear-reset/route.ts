// app/api/cornerstone/buildbear-reset/route.ts
//
// POST /api/cornerstone/buildbear-reset
//
// OPEN ROUTE — no auth. Documented limitation: on the SHARED hosted sandbox this
// is griefable (one judge resetting mid-another's run); this is the user's ACCEPTED
// trade-off (CONTEXT.md). Isolation comes from the OPS-07 per-judge local `pnpm demo`
// sandbox; the hosted sandbox is cheap to re-provision (OPS-03/04). Do NOT add an
// auth/shared-secret gate — that was considered and REJECTED for v3.0.
//
// One-use snapshot semantics: evm_revert CONSUMES the snapshot id, so this route MUST
// call evm_snapshot immediately after a successful evm_revert to produce a NEW id. The
// new id is returned in the response for the caller to update the artifact (Phase 12 /
// operator runbook) — there is NO KV persistence in v3.0 (RESET-01 Future).
//
// GOVERNANCE: runtime = 'nodejs' (consistent with the other cornerstone routes).
// Calls deployment.rpcUrl DIRECTLY (server-side, no CORS concern).
// OPS-05: this route is intentionally OPEN with NO rate limit (accepted v3.0 trade-off).

export const runtime = 'nodejs'

import { deployment } from '@/lib/apps/abrigo/cornerstone/artifact-loader'

// SECURITY (M1): deployment.rpcUrl is `https://rpc.buildbear.io/<sandbox-secret-id>`,
// effectively a bearer credential for the fork. A thrown fetch/undici error embeds the
// full URL in its message — strip any URL from EVERY `detail:` value before returning.
function redact(s: string): string {
  return s.replace(/https?:\/\/[^\s"')]+/g, '[rpc-redacted]')
}

async function jsonRpc(rpcUrl: string, method: string, params: unknown[] = []): Promise<unknown> {
  const res = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  })
  if (!res.ok) throw new Error(`RPC HTTP ${res.status}`)
  const json = (await res.json()) as { result?: unknown; error?: { message: string } }
  if (json.error) throw new Error(`RPC error: ${json.error.message}`)
  return json.result
}

export async function POST(_req: Request): Promise<Response> {
  const snapshotId = deployment.snapshotId
  if (!snapshotId) {
    return Response.json(
      {
        ok: false,
        reason: 'no-snapshot',
        detail: 'artifact has no snapshotId — re-provision with --no-mint',
      },
      { status: 409 },
    )
  }

  try {
    // Step 1: evm_revert(snapshotId) — consumes the snapshot.
    const reverted = await jsonRpc(deployment.rpcUrl, 'evm_revert', [snapshotId])
    // revert-failed is reserved for a genuine non-true evm_revert result (NOT a thrown
    // network error — those are rpc-unreachable, classified in the catch below).
    if (reverted !== true) {
      return Response.json({
        ok: false,
        reason: 'revert-failed',
        detail: redact(`evm_revert returned ${JSON.stringify(reverted)}`),
      })
    }

    // Step 2: evm_snapshot — produces a NEW snapshot id.
    const newSnapshotId = await jsonRpc(deployment.rpcUrl, 'evm_snapshot', [])

    // m6: validate the new id is a 0x… hex string before returning.
    if (typeof newSnapshotId !== 'string' || !newSnapshotId.startsWith('0x')) {
      return Response.json({
        ok: false,
        reason: 'revert-failed',
        detail: redact(`evm_snapshot returned ${JSON.stringify(newSnapshotId)}`),
      })
    }

    return Response.json({
      ok: true,
      newSnapshotId,
      // Caller (operator runbook / Phase 12) must update the artifact snapshotId
      // to newSnapshotId. No KV persistence in v3.0 (RESET-01 Future).
    })
  } catch (err: unknown) {
    // B1: a thrown fetch error is ALWAYS rpc-unreachable, never revert-failed.
    // undici throws `TypeError: fetch failed` with `err.cause.code` set to the OS
    // socket error (ECONNREFUSED / ENOTFOUND / ECONNRESET). A naive message-substring
    // check misses such mocks, so inspect ALL of:
    //   (a) err instanceof TypeError (undici fetch-failed),
    //   (b) String(err?.cause?.code) ∈ {ECONNREFUSED, ENOTFOUND, ECONNRESET},
    //   (c) the legacy message substrings (HTTP / fetch / ECONNREFUSED).
    // Only the explicit non-true evm_revert branch above is revert-failed.
    const message = err instanceof Error ? err.message : String(err)
    const causeCode = String((err as { cause?: { code?: unknown } } | null)?.cause?.code ?? '')
    const rpcUnreachable =
      err instanceof TypeError ||
      causeCode.includes('ECONNREFUSED') ||
      causeCode.includes('ENOTFOUND') ||
      causeCode.includes('ECONNRESET') ||
      message.includes('HTTP') ||
      message.includes('fetch') ||
      message.includes('ECONNREFUSED')
    return Response.json({
      ok: false,
      // Any thrown network error → rpc-unreachable; revert-failed is reserved for
      // the explicit non-true evm_revert branch above.
      reason: rpcUnreachable ? 'rpc-unreachable' : 'revert-failed',
      detail: redact(message),
    })
  }
}
