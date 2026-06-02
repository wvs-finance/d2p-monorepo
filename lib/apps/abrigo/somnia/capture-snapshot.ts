// capture-snapshot.ts — SERVER/CLI script. NOT imported by any route.
// Run manually via: pnpm somnia:capture
// Reads the two HedgeDecisionMade tx receipts + MacroOracle.latest and writes snapshot.json.
// All ints are written as STRINGS (bigint-as-string) for JSON safety.
// CROSS-09: captureMethod field documents whether data came from live RPC or recorded fallback.
// Hand-invented values (not traceable to a §0 tx hash) are forbidden.

import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { decodeEventLog, keccak256, parseAbiItem, toBytes } from 'viem'
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

  return {
    decisionId: requestId.toString(),
    action,
    sizeBps: decoded.args.sizeBps.toString(),
    macroValue: decoded.args.macroValue.toString(),
    consensus: decoded.args.consensus.toString(),
    decidedAt: block.timestamp.toString(),
    pending: false,
    sourceTxHash: txHash,
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
