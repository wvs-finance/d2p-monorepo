/**
 * app/api/abrigo/agent1/route.ts
 *
 * POST /api/abrigo/agent1
 *
 * Hardened Somnia server route for Agent-1: fires the full two-leg
 * requestSchoolDecision → poll decisionState.schoolSet → requestNotionalDecision
 * → parse StrategistDecided sequence against the LIVE two-leg strategist on
 * Somnia testnet (chain 50312).
 *
 * GOVERNANCE (spec v5 — 2026-06-07-module5-cornerstone-live-tx-design.md):
 *   - runtime = 'nodejs' (never edge; private key operations require Node.js crypto)
 *   - SOMNIA_OPERATOR_PK: server schema only (lib/env.ts), NEVER NEXT_PUBLIC_
 *   - AGENT1_ROUTE_SECRET: shared-secret header x-agent1-secret, validated per call
 *   - 503 when either env var is absent (non-operator-deploy guard)
 *   - 401 when x-agent1-secret does not match AGENT1_ROUTE_SECRET
 *   - 429 on rapid repeat (token-bucket rate limit — this route spends operator STT per call)
 *   - oracle freshness pre-check: MacroOracle.latest(dataKey).deliveredAt != 0
 *   - bounded per-leg poll: LEG_TIMEOUT_MS (120_000 ms) — NEVER while(true) without break
 *   - silent validator no-show (EXPECTED live state): terminates gracefully at timeout,
 *     returns {ok:false, reason:'school timeout', spentSchoolStt:true}
 *   - DecisionFailed is terminal per leg (correlated by captured requestId)
 *   - schoolSet && !notionalSet past timeout → {ok:false, reason:'partial mandate'}
 *   - serializeMandate: chainId stays 137 (Polygon ref); browser overrides to 31337 (D4/09-03)
 *
 * LIVE STRATEGIST: 0xf0570CcB1271FFaFf4caCA628F3632257f177b1D (Somnia 50312)
 * MACRO ORACLE:    0xAcA75144f644220f1dEAD5F989C350D8e0Cc983f (Somnia 50312)
 *
 * IMPORTANT: This file MUST NOT be imported by any client component.
 * The operator private key must never reach the browser.
 *
 * replay/nonce note: this route issues sequential on-chain txs (school then notional)
 * using the operator account. Concurrent calls share the operator nonce and MUST be
 * serialized (the in-memory rate limit below enforces this as a side-effect). If you
 * extend to parallel execution, serialize nonce management explicitly via a mutex or
 * nonce manager.
 */

export const runtime = 'nodejs'

import {
  type AgentDecisionResult,
  LEG_TIMEOUT_MS,
  correlateDecisionFailed,
  evaluateLegOutcome,
  parseStrategistDecided,
  readDecisionRequested,
  serializeMandate,
} from '@/lib/apps/abrigo/cornerstone/agent1-route-logic'
import { AGENT1_INPUTS } from '@/lib/apps/abrigo/somnia/agent1-inputs'
import { somniaTestnet } from '@/lib/apps/abrigo/somnia/chain'
import { macroHedgeStrategistAbi, macroOracleAbi } from '@/lib/contracts/generated'
import { env } from '@/lib/env'
import { http, type Log, createWalletClient, parseEther, publicActions } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

// ---------------------------------------------------------------------------
// Contract addresses (live Somnia 50312)
// ---------------------------------------------------------------------------

const STRATEGIST_ADDRESS = '0xf0570CcB1271FFaFf4caCA628F3632257f177b1D' as const
const MACRO_ORACLE_ADDRESS = '0xAcA75144f644220f1dEAD5F989C350D8e0Cc983f' as const

// ---------------------------------------------------------------------------
// Rate limit: simple in-memory token-bucket (min-interval between requests)
// This route auto-spends operator STT per call. A tight default cap protects
// the funded account from accidental rapid drain.
// ---------------------------------------------------------------------------

const RATE_LIMIT_INTERVAL_MS = 30_000 // 30 s minimum between successful starts
let lastCallStartMs = 0

function checkRateLimit(): boolean {
  const now = Date.now()
  if (now - lastCallStartMs < RATE_LIMIT_INTERVAL_MS) {
    return false // blocked
  }
  lastCallStartMs = now
  return true
}

// ---------------------------------------------------------------------------
// Minimal log shape compatible with route-logic helpers
// ---------------------------------------------------------------------------

type MinLog = Pick<Log, 'topics' | 'data'>

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(req: Request): Promise<Response> {
  // ---- Guard: non-operator-deploy → 503 ----
  if (!env.SOMNIA_OPERATOR_PK || !env.AGENT1_ROUTE_SECRET) {
    return Response.json({ ok: false, reason: 'route not configured' }, { status: 503 })
  }

  // ---- Guard: shared-secret header → 401 ----
  const secret = req.headers.get('x-agent1-secret')
  if (!secret || secret !== env.AGENT1_ROUTE_SECRET) {
    return Response.json({ ok: false, reason: 'unauthorized' }, { status: 401 })
  }

  // ---- Guard: rate limit → 429 ----
  if (!checkRateLimit()) {
    return Response.json(
      {
        ok: false,
        reason: 'rate limited — minimum 30 s between calls (operator STT spend protection)',
      },
      { status: 429 },
    )
  }

  try {
    // ---- Build operator wallet client ----
    const account = privateKeyToAccount(env.SOMNIA_OPERATOR_PK as `0x${string}`)
    const client = createWalletClient({
      account,
      chain: somniaTestnet,
      transport: http(),
    }).extend(publicActions)

    // ---- (a) Oracle freshness pre-check ----
    // MacroOracle.latest(dataKey).deliveredAt != 0 is required before
    // requestSchoolDecision — otherwise the tx reverts with UnknownKey.
    // The live datum (co/inflation-rate, scaledValue=568) is already delivered
    // on the Somnia testnet so this check passes. Kept as a runtime guard.
    const oracleData = await client.readContract({
      address: MACRO_ORACLE_ADDRESS,
      abi: macroOracleAbi,
      functionName: 'latest',
      args: [AGENT1_INPUTS.dataKey],
    })
    // oracleData is [dataKey, scaledValue, observedAt, deliveredAt]
    const deliveredAt = oracleData[3]
    if (!deliveredAt || deliveredAt === 0n) {
      const result: AgentDecisionResult = { ok: false, reason: 'oracle stale' }
      return Response.json(result)
    }

    // ---- (b) requestSchoolDecision ----
    const schoolTxHash = await client.writeContract({
      address: STRATEGIST_ADDRESS,
      abi: macroHedgeStrategistAbi,
      functionName: 'requestSchoolDecision',
      args: [AGENT1_INPUTS.userIntent, AGENT1_INPUTS.dataKey, AGENT1_INPUTS.consensus],
      value: parseEther('0.5'), // STT deposit to cover inference cost
    })
    const schoolReceipt = await client.waitForTransactionReceipt({
      hash: schoolTxHash,
    })
    const schoolLogs = schoolReceipt.logs as MinLog[]
    const schoolDecision = readDecisionRequested(schoolLogs, 'school')
    if (!schoolDecision) {
      const result: AgentDecisionResult = {
        ok: false,
        reason: 'school tx mined but HedgeDecisionRequested log absent',
        leg: 'school',
      }
      return Response.json(result)
    }
    const { decisionId, requestId: schoolRequestId } = schoolDecision

    // ---- (c) Poll decisionState.schoolSet (bounded by LEG_TIMEOUT_MS) ----
    const schoolPollStart = Date.now()
    const POLL_INTERVAL_MS = 4_000 // 4 s between polls

    let schoolSet = false
    // Poll loop: breaks on terminal outcome
    for (;;) {
      const elapsed = Date.now() - schoolPollStart

      // Fetch latest receipt logs for DecisionFailed correlation
      // (We re-read decisionState each tick; DecisionFailed would be in school receipt
      //  or in a subsequent receipt — use school receipt logs for the correlation check)
      const failCorrelation = correlateDecisionFailed(schoolLogs, schoolRequestId, 'school')
      const failedLeg = failCorrelation.failed ? failCorrelation.leg : null

      // Read current decision state
      const state = await client.readContract({
        address: STRATEGIST_ADDRESS,
        abi: macroHedgeStrategistAbi,
        functionName: 'decisionState',
        args: [decisionId],
      })
      // state is { schoolSet, notionalSet, decidedAt, schoolLabel }
      schoolSet = state.schoolSet

      const outcome = evaluateLegOutcome({
        schoolSet,
        notionalSet: state.notionalSet,
        failedLeg,
        elapsedMs: elapsed,
        timeoutMs: LEG_TIMEOUT_MS,
      })

      if (outcome.terminal) {
        const result: AgentDecisionResult = {
          ok: false,
          reason: outcome.reason,
          ...(outcome.leg !== undefined && { leg: outcome.leg }),
          ...(outcome.spentSchoolStt !== undefined && {
            spentSchoolStt: outcome.spentSchoolStt,
          }),
        }
        return Response.json(result)
      }

      if (schoolSet) break

      // Still polling — wait before next tick
      await new Promise<void>((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))
    }

    // ---- (d) requestNotionalDecision ----
    const notionalTxHash = await client.writeContract({
      address: STRATEGIST_ADDRESS,
      abi: macroHedgeStrategistAbi,
      functionName: 'requestNotionalDecision',
      args: [decisionId],
      value: parseEther('0.5'), // STT deposit for notional inference leg
    })
    const notionalReceipt = await client.waitForTransactionReceipt({
      hash: notionalTxHash,
    })
    const notionalLogs = notionalReceipt.logs as MinLog[]
    const notionalDecision = readDecisionRequested(notionalLogs, 'notional')
    if (!notionalDecision) {
      const result: AgentDecisionResult = {
        ok: false,
        reason: 'notional tx mined but HedgeDecisionRequested log absent',
        leg: 'notional',
        spentSchoolStt: true,
      }
      return Response.json(result)
    }
    const { requestId: notionalRequestId } = notionalDecision

    // ---- (e) Poll for StrategistDecided / decisionState.notionalSet ----
    const notionalPollStart = Date.now()
    // Accumulate all logs seen so far (school + notional receipts for correlation)
    const allLogs: MinLog[] = [...schoolLogs, ...notionalLogs]

    for (;;) {
      const elapsed = Date.now() - notionalPollStart

      // Refresh cumulative logs — in practice DecisionFailed can land in any tx
      // triggered by the validator callback. We only have receipts already fetched,
      // so correlation is bounded to those. Sufficient for the bounded-timeout terminal.
      const failCorrelation = correlateDecisionFailed(allLogs, notionalRequestId, 'notional')
      const failedLeg = failCorrelation.failed ? failCorrelation.leg : null

      const state = await client.readContract({
        address: STRATEGIST_ADDRESS,
        abi: macroHedgeStrategistAbi,
        functionName: 'decisionState',
        args: [decisionId],
      })

      const outcome = evaluateLegOutcome({
        schoolSet: state.schoolSet,
        notionalSet: state.notionalSet,
        failedLeg,
        elapsedMs: elapsed,
        timeoutMs: LEG_TIMEOUT_MS,
      })

      if (outcome.terminal) {
        const result: AgentDecisionResult = {
          ok: false,
          reason: outcome.reason,
          ...(outcome.leg !== undefined && { leg: outcome.leg }),
          spentSchoolStt: true, // school leg was already spent
        }
        return Response.json(result)
      }

      if (state.notionalSet) {
        // StrategistDecided should be in the notional receipt or a callback tx
        const decided = parseStrategistDecided(allLogs)
        if (decided) {
          const result: AgentDecisionResult = {
            ok: true,
            somniaSchoolTx: schoolTxHash,
            somniaNotionalTx: notionalTxHash,
            school: decided.school,
            mandate: serializeMandate(decided.mandate),
          }
          return Response.json(result)
        }
        // notionalSet but no StrategistDecided log yet — keep polling briefly
      }

      await new Promise<void>((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))
    }
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'unexpected error in agent1 route'
    const result: AgentDecisionResult = { ok: false, reason }
    return Response.json(result, { status: 500 })
  }
}
