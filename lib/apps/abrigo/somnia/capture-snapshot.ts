// capture-snapshot.ts — SERVER/CLI script. NOT imported by any route.
// Run manually via: pnpm somnia:capture
// Reads the two HedgeDecisionMade tx receipts + MacroOracle.latest and writes snapshot.json.
// Extends the snapshot with FULL-FIDELITY leg data via the verified getLogs recipe (Phase 7).
// All ints are written as STRINGS (bigint-as-string) for JSON safety.
// CROSS-09: captureMethod field documents whether data came from live RPC or recorded fallback.
// Hand-invented values (not traceable to a §0 tx hash) are forbidden.
//
// LEG CAPTURE RECIPE (verified on-chain 2026-06-02 — BLOCKER-1 from spec):
//   The decision receipt (HedgeDecisionMade callback tx) contains ZERO HedgeDecisionRequested logs.
//   The two legs are emitted in SEPARATE, EARLIER txs. DO NOT scan the made-tx receipt for legs.
//   Contract semantics: decisionId = bytes32(actionLegRequestId) (L144).
//   SIZE-leg requestId = the snapshot decisionId field (= HedgeDecisionMade.requestId).
//   ACTION-leg requestId = DERIVED: uint256(decisionId topic) — always real, never looked up by id.
//   Use getLogs (NOT receipt scanning). RPC caps eth_getLogs at 1000 blocks per call.
//   Action-leg timestamp: if NOT found in the 1000-block bounded back-scan → null → em-dash.
//   NEVER fabricate a requestId or timestamp.

import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { decodeEventLog, keccak256, toBytes } from 'viem'
import { HedgeStrategistAbi, MacroOracleAbi } from './abi'
import { somniaClient } from './chain'
import { HEDGE_ACTION } from './types'
import type { HedgeDecisionView, MacroPrintView } from './types'

// Canonical deployment addresses (from spec §0)
const MACRO_ORACLE = '0xAcA75144f644220f1dEAD5F989C350D8e0Cc983f' as const
const MACRO_HEDGE_STRATEGIST = '0xfA428171E1F5B56f92C67C002De1d8e90B053EE1' as const

// Canonical tx hashes (from spec §0 + abrigo-somnia STATE.md 11-03)
const TX_DECISION_1 = '0x2a8ec99452956fb94ad3b138844957409b298daa05e2d9986b34676d643c36a5' as const
const TX_DECISION_2 = '0x5057f803d214aa549e16a6c8ce3745610f0ce407a3bac06c1a6f643807dc3575' as const
const TX_MACRO_RECEIVED =
  '0x89d7a29805d8493ee328b834378be430e4b42dba09c175a0982abce626286373' as const

const CPI_DATA_KEY = keccak256(toBytes('co/inflation-rate'))

/**
 * captureDecisionLegs — FULL-FIDELITY leg capture via the verified getLogs recipe.
 *
 * Step 1: getLogs for SIZE-leg by requestId in [madeBlock-1000n, madeBlock].
 *         Reads decisionId topic (bytes32) + sizeTimestamp.
 * Step 2: ACTION-leg requestId DERIVED as uint256(decisionId topic) — ALWAYS available.
 * Step 3: ACTION-leg timestamp via bounded back-scan getLogs by actionReqId.
 *         If NOT found in the 1000-block window → actionTimestamp = null → em-dash.
 *         NEVER fabricate a timestamp.
 *
 * Verified expected values:
 *   sizeReqId=4083729, madeBlock=~4083729: decisionIdTopic=0x00…3e4015, actionReqId=4079637,
 *     sizeTimestamp=1780420468, actionTimestamp=null (action log ~4000 blocks earlier).
 *   sizeReqId=4083997, madeBlock=~4083997: decisionIdTopic=0x00…3e5110, actionReqId=4083984,
 *     sizeTimestamp=1780420556, actionTimestamp=1780420553 (both within window).
 */
// Cache the HedgeDecisionRequested ABI entry to avoid repeated .find() with non-null assertion
const HEDGE_DECISION_REQUESTED_ABI = HedgeStrategistAbi.find(
  (e) => e.type === 'event' && e.name === 'HedgeDecisionRequested',
)
if (!HEDGE_DECISION_REQUESTED_ABI) {
  throw new Error('HedgeDecisionRequested not found in HedgeStrategistAbi')
}

async function captureDecisionLegs(sizeReqId: bigint, madeBlock: bigint) {
  // Step 1: SIZE-leg event via getLogs (NOT receipt scan — made-tx has zero HedgeDecisionRequested)
  const sizeLogs = await somniaClient.getLogs({
    address: MACRO_HEDGE_STRATEGIST,
    event: HEDGE_DECISION_REQUESTED_ABI,
    args: { requestId: sizeReqId },
    fromBlock: madeBlock - 1000n,
    toBlock: madeBlock,
  })

  if (!sizeLogs[0]) {
    throw new Error(`SIZE-leg HedgeDecisionRequested log not found for requestId ${sizeReqId}`)
  }

  const sizeLog = sizeLogs[0]
  // sizeLog.args: cast to the HedgeDecisionRequested arg shape to read decisionId topic
  type HedgeDecisionRequestedArgs = { requestId?: bigint; decisionId?: `0x${string}`; leg?: number }
  const sizeLogArgs = (sizeLog as { args: HedgeDecisionRequestedArgs }).args
  if (!sizeLogArgs.decisionId) {
    throw new Error(`SIZE-leg log missing decisionId topic for requestId ${sizeReqId}`)
  }
  const decisionIdTopic = sizeLogArgs.decisionId
  const sizeBlock = await somniaClient.getBlock({ blockNumber: sizeLog.blockNumber })
  const sizeTimestamp = sizeBlock.timestamp

  // Step 2: ACTION-leg requestId DERIVED from decisionId topic (uint256 of the bytes32 value).
  // This is always real and always available — no additional getLogs needed for the id.
  const actionReqId = BigInt(decisionIdTopic)

  // Step 3: ACTION-leg timestamp — bounded back-scan (1000 blocks before size-leg block).
  // If not found → null → em-dash. NEVER fabricate.
  let actionTimestamp: bigint | null = null
  const actionLogs = await somniaClient.getLogs({
    address: MACRO_HEDGE_STRATEGIST,
    event: HEDGE_DECISION_REQUESTED_ABI,
    args: { requestId: actionReqId },
    fromBlock: sizeLog.blockNumber - 1000n,
    toBlock: sizeLog.blockNumber,
  })

  if (actionLogs[0]) {
    const actionBlock = await somniaClient.getBlock({ blockNumber: actionLogs[0].blockNumber })
    actionTimestamp = actionBlock.timestamp
  }
  // If actionLogs is empty → actionTimestamp stays null → honest em-dash
  // (action-leg log is outside the 1000-block window — verified for decision 4083729)

  return {
    decisionIdTopic,
    sizeRequestId: sizeReqId.toString(),
    actionRequestId: actionReqId.toString(),
    sizeTimestamp: sizeTimestamp.toString(),
    // null = action-leg log outside the 1000-block window → em-dash; NEVER fabricate
    actionTimestamp: actionTimestamp !== null ? actionTimestamp.toString() : null,
  }
}

async function captureDecision(txHash: `0x${string}`) {
  const receipt = await somniaClient.getTransactionReceipt({ hash: txHash })
  const block = await somniaClient.getBlock({ blockNumber: receipt.blockNumber })

  // Find HedgeDecisionMade log
  const hedgeLog = receipt.logs.find(
    (log) => log.address.toLowerCase() === MACRO_HEDGE_STRATEGIST.toLowerCase(),
  )
  if (!hedgeLog?.topics[0]) {
    throw new Error(`No HedgeDecisionMade log found in ${txHash}`)
  }

  const decoded = decodeEventLog({
    abi: HedgeStrategistAbi,
    data: hedgeLog.data,
    topics: hedgeLog.topics,
    eventName: 'HedgeDecisionMade',
  })

  const requestId = decoded.args.requestId
  const action = HEDGE_ACTION[decoded.args.action]
  if (!action) throw new Error(`Unknown action: ${decoded.args.action}`)

  // Capture FULL-FIDELITY leg data via the verified getLogs recipe
  const legs = await captureDecisionLegs(requestId, receipt.blockNumber)

  return {
    decisionId: requestId.toString(),
    action,
    sizeBps: decoded.args.sizeBps.toString(),
    macroValue: decoded.args.macroValue.toString(),
    consensus: decoded.args.consensus.toString(),
    decidedAt: block.timestamp.toString(),
    pending: false,
    sourceTxHash: txHash,
    legs,
  }
}

async function captureMacroReceived(txHash: `0x${string}`) {
  const receipt = await somniaClient.getTransactionReceipt({ hash: txHash })
  const block = await somniaClient.getBlock({ blockNumber: receipt.blockNumber })

  const oracleLog = receipt.logs.find(
    (log) => log.address.toLowerCase() === MACRO_ORACLE.toLowerCase(),
  )
  if (!oracleLog?.topics[0]) {
    throw new Error(`No MacroReceived log found in ${txHash}`)
  }

  const decoded = decodeEventLog({
    abi: MacroOracleAbi,
    data: oracleLog.data,
    topics: oracleLog.topics,
    eventName: 'MacroReceived',
  })

  return {
    dataKey: decoded.args.dataKey,
    dataKeyLabel: 'co/inflation-rate' as const,
    scaledValue: decoded.args.scaledValue.toString(),
    capturedAt: new Date(Number(block.timestamp) * 1000).toISOString(),
    sourceTxHash: txHash,
  }
}

async function captureLatest() {
  const result = await somniaClient.readContract({
    address: MACRO_ORACLE,
    abi: MacroOracleAbi,
    functionName: 'latest',
    args: [CPI_DATA_KEY],
  })

  // result is a tuple: [dataKey, scaledValue, observedAt, deliveredAt]
  // B3: observedAt is ALWAYS 0 by contract design — do NOT write it to snapshot
  const [dataKey, scaledValue] = result

  return {
    dataKey,
    dataKeyLabel: 'co/inflation-rate' as const,
    scaledValue: scaledValue.toString(),
    sourceTxHash: null,
  }
}

async function main() {
  process.stdout.write('Capturing Somnia snapshot from live RPC...\n')

  const [decision1, decision2, macroReceived, macroLatest] = await Promise.all([
    captureDecision(TX_DECISION_1),
    captureDecision(TX_DECISION_2),
    captureMacroReceived(TX_MACRO_RECEIVED),
    captureLatest(),
  ])

  const snapshot = {
    capturedAt: new Date().toISOString(),
    captureMethod: 'rpc' as const,
    decisions: [decision1, decision2],
    macro: {
      latest: macroLatest,
      received: [macroReceived],
    },
  }

  const outPath = join(import.meta.dirname, 'snapshot.json')
  writeFileSync(outPath, `${JSON.stringify(snapshot, null, 2)}\n`)
  process.stdout.write(`Snapshot written to ${outPath}\n`)
  process.stdout.write(`decision[0]: ${JSON.stringify(decision1)}\n`)
  process.stdout.write(`decision[1]: ${JSON.stringify(decision2)}\n`)
  process.stdout.write(`macro.latest: ${JSON.stringify(macroLatest)}\n`)
}

main().catch((err) => {
  console.error('Capture failed:', err)
  process.exit(1)
})
