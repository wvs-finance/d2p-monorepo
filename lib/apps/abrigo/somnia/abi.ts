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

// MacroHedgeStrategist: HedgeDecisionMade + DecisionFailed events.
// Copied verbatim from out/MacroHedgeStrategist.sol/MacroHedgeStrategist.json abi[].
export const HedgeStrategistAbi = [
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
