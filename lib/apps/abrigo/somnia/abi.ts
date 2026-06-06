// Somnia contract ABI fragments — copied VERBATIM from compiled Foundry artifacts.
// Source: ../abrigo/abrigo-somnia/contracts/out/MacroOracle.sol/MacroOracle.json
//         ../abrigo/abrigo-somnia/contracts/out/MacroHedgeStrategist.sol/MacroHedgeStrategist.json
//
// DO NOT hand-type or paraphrase. These must be byte-identical to the compiled JSON.
// indexed: true on dataKey in MacroReceived is load-bearing — wrong indexed-ness shifts log-decode positions.
// observedAt is STRUCTURALLY ALWAYS 0 by contract design (MacroOracle.sol hard-sets it in callback).
// B3 constraint: never use observedAt as a real timestamp.

import type { Abi } from 'viem'

// MacroOracle: latest(bytes32) public mapping getter + MacroReceived event.
// latest returns a FLAT 4-tuple (Solidity flattens the public mapping-of-struct getter).
// Copied verbatim from out/MacroOracle.sol/MacroOracle.json abi[].
export const MacroOracleAbi = [
  {
    type: 'function',
    name: 'latest',
    inputs: [
      {
        name: '',
        type: 'bytes32',
        internalType: 'bytes32',
      },
    ],
    outputs: [
      {
        name: 'dataKey',
        type: 'bytes32',
        internalType: 'bytes32',
      },
      {
        name: 'scaledValue',
        type: 'int256',
        internalType: 'int256',
      },
      {
        name: 'observedAt',
        type: 'uint64',
        internalType: 'uint64',
      },
      {
        name: 'deliveredAt',
        type: 'uint64',
        internalType: 'uint64',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'event',
    name: 'MacroReceived',
    inputs: [
      {
        name: 'dataKey',
        type: 'bytes32',
        indexed: true,
        internalType: 'bytes32',
      },
      {
        name: 'scaledValue',
        type: 'int256',
        indexed: false,
        internalType: 'int256',
      },
    ],
    anonymous: false,
  },
] as const satisfies Abi

// MacroHedgeStrategist: HedgeDecisionRequested + HedgeDecisionMade + DecisionFailed events.
// Copied verbatim from out/MacroHedgeStrategist.sol/MacroHedgeStrategist.json abi[].
//
// HedgeDecisionRequested two-leg semantics (MacroHedgeStrategist.sol L64-68, L144, L236):
//   Leg enum: None=0, Action=1, Size=2.
//   decisionId (bytes32 topic) = bytes32(actionLegRequestId) — STABLE join key across txs.
//   The SIZE-leg requestId is the id in HedgeDecisionMade (snapshot decisionId field).
//   The ACTION-leg requestId is DERIVED: uint256(decisionId topic) — always real, never looked up.
//   stale baselines to NEVER surface as current: lastSurviving0/1, deposited0/1.
//   no realized-costs field in LongGammaWrapper — Phase 9 pending, does not exist.
export const HedgeStrategistAbi = [
  {
    type: 'event',
    name: 'HedgeDecisionRequested',
    inputs: [
      { name: 'requestId', type: 'uint256', indexed: true, internalType: 'uint256' },
      { name: 'decisionId', type: 'bytes32', indexed: true, internalType: 'bytes32' },
      { name: 'leg', type: 'uint8', indexed: false, internalType: 'uint8' },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'HedgeDecisionMade',
    inputs: [
      {
        name: 'requestId',
        type: 'uint256',
        indexed: true,
        internalType: 'uint256',
      },
      {
        name: 'action',
        type: 'uint8',
        indexed: false,
        internalType: 'enum MacroHedgeStrategist.HedgeAction',
      },
      {
        name: 'sizeBps',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
      {
        name: 'macroValue',
        type: 'int256',
        indexed: false,
        internalType: 'int256',
      },
      {
        name: 'consensus',
        type: 'int256',
        indexed: false,
        internalType: 'int256',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'DecisionFailed',
    inputs: [
      {
        name: 'requestId',
        type: 'uint256',
        indexed: true,
        internalType: 'uint256',
      },
      {
        name: 'status',
        type: 'uint8',
        indexed: false,
        internalType: 'enum ResponseStatus',
      },
    ],
    anonymous: false,
  },
] as const satisfies Abi

// LongGammaWrapper: read-only ABI fragment (fork-verified, NOT deployed — Phase 7 gate).
// Source: out/LongGammaWrapper.sol/LongGammaWrapper.json (verbatim from compiled artifact).
//
// §2 mapping rules (encoded in adaptWrapper — never violated at JSX level):
//   Composed reads go through pool()/ct0()/ct1() — position legs/health via PanopticPool,
//   surviving collateral via convertToAssets(balanceOf(wrapper)) on ct0()/ct1().
//   stale baselines NEVER current: lastSurviving0/1, deposited0/1.
//   no realized-costs field — Phase 9, does not exist yet.
//   ResidualEroded.cause is bytes32 (advisory keccak256("INVOLUNTARY")), NOT a 3-way enum.
//   positionTokenId is the token id getter (NOT storedTokenId).
// Phase 7 does NOT execute any of these reads (WRAPPER_DEPLOYED=false by default).
export const LongGammaWrapperAbi = [
  {
    type: 'function',
    name: 'claimResidual',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'claimed',
    inputs: [],
    outputs: [{ name: '', type: 'bool', internalType: 'bool' }],
    stateMutability: 'view',
  },
  { type: 'function', name: 'close', inputs: [], outputs: [], stateMutability: 'nonpayable' },
  {
    type: 'function',
    name: 'costMeter',
    inputs: [],
    outputs: [{ name: '', type: 'address', internalType: 'contract ICostMeter' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'ct0',
    inputs: [],
    outputs: [{ name: '', type: 'address', internalType: 'contract IERC4626' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'ct1',
    inputs: [],
    outputs: [{ name: '', type: 'address', internalType: 'contract IERC4626' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'deposit',
    inputs: [
      { name: '_user', type: 'address', internalType: 'address' },
      { name: 'assets0', type: 'uint256', internalType: 'uint256' },
      { name: 'assets1', type: 'uint256', internalType: 'uint256' },
      { name: 'longId', type: 'uint256', internalType: 'TokenId' },
      { name: 'longSize', type: 'uint128', internalType: 'uint128' },
      { name: 'limits', type: 'int24[3]', internalType: 'int24[3]' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'deposited0',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'deposited1',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'lastSurviving0',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'lastSurviving1',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'owner',
    inputs: [],
    outputs: [{ name: '', type: 'address', internalType: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'pool',
    inputs: [],
    outputs: [{ name: '', type: 'address', internalType: 'contract IPanopticData' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'positionTokenId',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'TokenId' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'recordStreamia',
    inputs: [],
    outputs: [
      { name: 'streamia0', type: 'uint128', internalType: 'uint128' },
      { name: 'streamia1', type: 'uint128', internalType: 'uint128' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'setCostMeter',
    inputs: [{ name: 'meter', type: 'address', internalType: 'address' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'state',
    inputs: [],
    outputs: [{ name: '', type: 'uint8', internalType: 'enum LongGammaWrapper.State' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'syncResidual',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'user',
    inputs: [],
    outputs: [{ name: '', type: 'address', internalType: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'event',
    name: 'CostMeterSet',
    inputs: [{ name: 'meter', type: 'address', indexed: false, internalType: 'address' }],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'PositionOpened',
    inputs: [
      { name: 'user', type: 'address', indexed: true, internalType: 'address' },
      { name: 'tokenId', type: 'uint256', indexed: false, internalType: 'TokenId' },
      { name: 'deposited0', type: 'uint256', indexed: false, internalType: 'uint256' },
      { name: 'deposited1', type: 'uint256', indexed: false, internalType: 'uint256' },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'ResidualClaimed',
    inputs: [
      { name: 'user', type: 'address', indexed: true, internalType: 'address' },
      { name: 'paid0', type: 'uint256', indexed: false, internalType: 'uint256' },
      { name: 'paid1', type: 'uint256', indexed: false, internalType: 'uint256' },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'ResidualEroded',
    inputs: [
      { name: 'user', type: 'address', indexed: true, internalType: 'address' },
      { name: 'eroded0', type: 'uint256', indexed: false, internalType: 'uint256' },
      { name: 'eroded1', type: 'uint256', indexed: false, internalType: 'uint256' },
      // cause is bytes32: advisory keccak256("INVOLUNTARY") — NOT a 3-way enum
      { name: 'cause', type: 'bytes32', indexed: false, internalType: 'bytes32' },
    ],
    anonymous: false,
  },
] as const
