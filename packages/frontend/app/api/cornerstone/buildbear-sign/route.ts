// app/api/cornerstone/buildbear-sign/route.ts
//
// POST /api/cornerstone/buildbear-sign
//
// Server-only BuildBear live-signing route (MINT-01). Signs and broadcasts
// `resolveFromMandate` against the BuildBear fork using DEMO_SIGNER_PK, and
// returns a discriminated `{ ok, reason }` envelope — it NEVER throws bare.
//
// GOVERNANCE:
//   - runtime = 'nodejs' (privateKeyToAccount needs Node.js crypto; never edge)
//   - DEMO_SIGNER_PK: server schema only (lib/env.ts), NEVER NEXT_PUBLIC_, never
//     sent to the client. Absent → { ok:false, reason:'not-configured' } (503),
//     BEFORE any viem client is constructed → zero-secret clone stays in replay.
//   - simulateContract runs BEFORE writeContract so reverts are pre-classified
//     into reason codes without spending gas.
//
// OPS-05 limitation: no rate limit; shared-sandbox signer is griefable/drainable
//   — re-provision per OPS-03/04 (runbook, Phase 13). Unlike /api/abrigo/agent1
//   (which token-bucket-limits operator STT spend) this buildbear-sign route is
//   intentionally OPEN with NO rate limit (accepted v3.0 trade-off, CONTEXT.md).
//   Do NOT add auth — documented-limitation only.

export const runtime = 'nodejs'

import { deployment } from '@/lib/apps/abrigo/cornerstone/artifact-loader'
import { createBuildBearChain } from '@/lib/apps/abrigo/cornerstone/buildbear'
import { env } from '@/lib/env'
// NOTE: the 3 viem error TYPES (ContractFunctionRevertedError / HttpRequestError /
// InsufficientFundsError) are intentionally NOT imported — classifyViemError keys
// off `constructor.name` / the cause chain, so importing the types is dead code.
import { http, createPublicClient, createWalletClient } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

// Pinned ABI (from spike-viem-sign.ts — VERIFIED against HedgeMandate.sol)
const resolveFromMandateAbi = [
  {
    type: 'function',
    name: 'resolveFromMandate',
    stateMutability: 'nonpayable',
    inputs: [
      {
        name: 'mandate',
        type: 'tuple',
        components: [
          { name: 'economicTheory', type: 'address' },
          { name: 'underlyingMarket', type: 'bytes32' },
          { name: 'targetNotional', type: 'uint256' },
          { name: 'chainId', type: 'uint32' },
          { name: 'isLong', type: 'bool' },
        ],
      },
      { name: 'legIndex', type: 'uint256' },
      { name: 'quoteMargin', type: 'uint128' },
    ],
    outputs: [{ name: 'positionId', type: 'uint256' }],
  },
] as const

export type BuildBearSignResponse =
  | {
      ok: true
      txHash: `0x${string}`
      blockNumber: number
      // Phase 12/13 will decode these from logs; Phase 11 returns them as null stubs.
      strategistView: null
      executorView: null
      positionMinted: null
      margins: null
    }
  | {
      ok: false
      reason: 'fork-used' | 'rpc-unreachable' | 'signer-gas' | 'reverted' | 'not-configured'
      detail?: string
    }

// SECURITY (M1): viem BaseError / HttpRequestError messages embed the full request URL,
// and a BuildBear RPC URL `https://rpc.buildbear.io/<sandbox-secret-id>` is effectively
// a bearer credential for the fork. EVERY `detail:` value MUST pass through redact().
function redact(s: string): string {
  return s.replace(/https?:\/\/[^\s"')]+/g, '[rpc-redacted]')
}

function findInCauseChain(err: unknown, pred: (e: Error) => boolean): Error | null {
  let current: unknown = err
  while (current instanceof Error) {
    if (pred(current)) return current
    current = (current as { cause?: unknown }).cause
  }
  return null
}

function classifyViemError(err: unknown): BuildBearSignResponse {
  if (err instanceof Error) {
    // viem wraps: ContractFunctionExecutionError → cause → ContractFunctionRevertedError
    const revertErr = findInCauseChain(
      err,
      (e) => e.constructor.name === 'ContractFunctionRevertedError',
    )
    if (revertErr) {
      const reason = (revertErr as { reason?: string }).reason ?? ''
      if (reason.includes('fork used')) {
        return { ok: false, reason: 'fork-used', detail: redact(reason) }
      }
      return { ok: false, reason: 'reverted', detail: redact(reason) }
    }

    // Insufficient funds (signer has low-but-nonzero gas)
    if (
      err.constructor.name === 'InsufficientFundsError' ||
      findInCauseChain(err, (e) => e.constructor.name === 'InsufficientFundsError')
    ) {
      return { ok: false, reason: 'signer-gas', detail: redact(err.message) }
    }

    // HttpRequestError = network/RPC unreachable
    if (
      err.constructor.name === 'HttpRequestError' ||
      findInCauseChain(err, (e) => e.constructor.name === 'HttpRequestError')
    ) {
      return { ok: false, reason: 'rpc-unreachable', detail: redact(err.message) }
    }

    // Generic revert (unknown reason)
    if (err.message.includes('revert') || err.message.includes('reverted')) {
      return { ok: false, reason: 'reverted', detail: redact(err.message) }
    }
  }
  return { ok: false, reason: 'reverted', detail: redact(String(err)) }
}

export async function POST(req: Request): Promise<Response> {
  // Guard: key absent → not-configured (zero-secret default on plain clone)
  // BEFORE any client construction.
  if (!env.DEMO_SIGNER_PK) {
    return Response.json({ ok: false, reason: 'not-configured' } satisfies BuildBearSignResponse, {
      status: 503,
    })
  }

  // M2: body-size cap BEFORE req.json() — reject oversized payloads (16 KiB).
  const contentLength = Number(req.headers.get('content-length') ?? '0')
  if (contentLength > 16384) {
    return Response.json(
      { ok: false, reason: 'reverted', detail: 'body too large' } satisfies BuildBearSignResponse,
      { status: 413 },
    )
  }

  // Body: mandate sourced from the recorded replay artifact (MINT-03). Phase 11
  // accepts the serialized mandate in the POST body; the client (Phase 12) sends
  // the artifact mandate, NOT a live agent1 response.
  // M2: on parse failure / missing mandate return a GENERIC detail — never echo the
  // raw parse error (it can carry attacker-controlled content).
  let body: { mandate: unknown } = { mandate: null }
  try {
    body = (await req.json()) as { mandate: unknown }
  } catch {
    return Response.json(
      {
        ok: false,
        reason: 'reverted',
        detail: 'invalid request body',
      } satisfies BuildBearSignResponse,
      { status: 400 },
    )
  }

  try {
    const account = privateKeyToAccount(env.DEMO_SIGNER_PK as `0x${string}`)
    const chain = createBuildBearChain(deployment.rpcUrl)
    const walletClient = createWalletClient({
      account,
      chain,
      transport: http(deployment.rpcUrl),
    })
    const publicClient = createPublicClient({
      chain,
      transport: http(deployment.rpcUrl),
    })

    // Signer-balance pre-flight (OPS-05) — BEFORE simulateContract.
    const balance = await publicClient.getBalance({ address: account.address })
    if (balance === 0n) {
      return Response.json({
        ok: false,
        reason: 'signer-gas',
        detail: 'signer balance is 0',
      } satisfies BuildBearSignResponse)
    }

    // simulateContract first — pre-classifies reverts into reason codes before
    // spending gas on a write that would revert.
    await publicClient.simulateContract({
      account,
      address: deployment.executor as `0x${string}`,
      abi: resolveFromMandateAbi,
      functionName: 'resolveFromMandate',
      args: [body.mandate as never, 0n, 1_000_000n],
    })

    // writeContract — only reached if simulate passes.
    const txHash = await walletClient.writeContract({
      address: deployment.executor as `0x${string}`,
      abi: resolveFromMandateAbi,
      functionName: 'resolveFromMandate',
      args: [body.mandate as never, 0n, 1_000_000n],
    })

    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })
    if (receipt.status === 'reverted') {
      return Response.json({
        ok: false,
        reason: 'reverted',
        detail: redact(`receipt reverted: ${txHash}`),
      } satisfies BuildBearSignResponse)
    }

    return Response.json({
      ok: true,
      txHash,
      blockNumber: Number(receipt.blockNumber),
      strategistView: null,
      executorView: null,
      positionMinted: null,
      margins: null,
    } satisfies BuildBearSignResponse)
  } catch (err: unknown) {
    return Response.json(classifyViemError(err))
  }
}
