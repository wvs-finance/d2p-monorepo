// scripts/spike-viem-sign.ts
//
// Reproducible spike for 10-SPIKE-EVIDENCE.md §(c). Operator runs this live in Plan 10-03;
// here it is committed type-checked only. Reads DEMO_SIGNER_PK from env; never logs the key;
// never broadcasts (simulate/prepare only).
//
// Frontend-resident (FIX D) so `viem` + the `@/lib/...artifact-loader` import resolve and the
// frontend tsconfig `**/*.ts` glob type-checks it — a sibling-package file under
// packages/backend would NOT be globbed (viem is not installed there).
//
// The §(c) dry-run: build a viem WalletClient from the dedicated DEMO_SIGNER_PK against the
// artifact's chain config (chainId + rpcUrl), then SIMULATE resolveFromMandate against the
// deployed executor. simulateContract PREPARES/validates the call WITHOUT broadcasting — the
// operator confirms it does not revert. Only the signer ADDRESS + a DRY_RUN_OK line are printed.

import { type BuildBearDeployment, deployment } from '@/lib/apps/abrigo/cornerstone/artifact-loader'
import { createBuildBearChain } from '@/lib/apps/abrigo/cornerstone/buildbear'
import { http, createPublicClient, createWalletClient, zeroAddress, zeroHash } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

// ---------------------------------------------------------------------------
// resolveFromMandate(HedgeMandate, uint256, uint128) — ABI fragment.
//
// (FIX F) The HedgeMandate tuple is PINNED to the source struct
// packages/backend/contracts/src/types/HedgeMandate.sol — field order + types VERIFIED:
//   (address economicTheory, bytes32 underlyingMarket, uint256 targetNotional,
//    uint32 chainId, bool isLong)
// then a uint256 (legIndex / 0) and a uint128 (quoteMargin / 1e6). Do NOT guess the tuple.
// ---------------------------------------------------------------------------

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

async function main(): Promise<void> {
  const pk = process.env.DEMO_SIGNER_PK
  if (!pk) {
    console.error(
      'FAIL: DEMO_SIGNER_PK is not set (gitignored contracts/.env / server env). ' +
        'This spike never broadcasts and never logs the key — it only needs it to derive the signer.',
    )
    process.exit(1)
  }

  const artifact: BuildBearDeployment = deployment
  const account = privateKeyToAccount(pk as `0x${string}`)
  const chain = createBuildBearChain(artifact.rpcUrl)

  // walletClient: derived from DEMO_SIGNER_PK; used only to bind the account for simulation.
  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(artifact.rpcUrl),
  })
  // publicClient: performs the read-only simulation (no broadcast).
  const publicClient = createPublicClient({
    chain,
    transport: http(artifact.rpcUrl),
  })

  // Mandate mirrors the on-chain demo: POST_KEYNESIAN sentinel economicTheory (0x..06),
  // the cornerstone WCOP/USDC pool id as underlyingMarket (read from the artifact pool when a
  // PoolId is available; here a zeroHash placeholder keeps the spike self-contained for tsc —
  // the operator substitutes the live pool id in Plan 10-03), 50_000 USD targetNotional,
  // chainId from the artifact, isLong=true.
  const mandate = {
    economicTheory: '0x0000000000000000000000000000000000000006' as `0x${string}`,
    underlyingMarket: zeroHash,
    targetNotional: 50_000n,
    chainId: artifact.chainId,
    isLong: true,
  } as const

  // SIMULATE — prepares + validates the resolveFromMandate call WITHOUT broadcasting.
  // (prepareTransactionRequest is the alternate dry-run primitive; simulateContract is used
  // here because it also decodes the would-be return value.)
  const { request } = await publicClient.simulateContract({
    account: walletClient.account,
    address: artifact.executor as `0x${string}`,
    abi: resolveFromMandateAbi,
    functionName: 'resolveFromMandate',
    args: [mandate, 0n, 1_000_000n],
  })

  // Print ONLY the signer address + a dry-run marker — never the key, never broadcast.
  console.info(`DEMO_SIGNER_EOA=${account.address}`)
  console.info(`DRY_RUN_OK executor=${request.address ?? artifact.executor}`)
  // Silence unused-var lint for the placeholder import path while keeping the type bound.
  void zeroAddress
}

main().catch((err: unknown) => {
  console.error('spike-viem-sign failed:', err)
  process.exit(1)
})
