import {
  createUseReadContract,
  createUseWriteContract,
  createUseSimulateContract,
  createUseWatchContractEvent,
} from 'wagmi/codegen'

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// IPanopticData
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const iPanopticDataAbi = [
  {
    type: 'function',
    inputs: [
      { name: 'positionIdList', internalType: 'TokenId[]', type: 'uint256[]' },
      {
        name: 'finalPositionIdList',
        internalType: 'TokenId[]',
        type: 'uint256[]',
      },
      { name: 'positionSizes', internalType: 'uint128[]', type: 'uint128[]' },
      {
        name: 'tickAndSpreadLimits',
        internalType: 'int24[3][]',
        type: 'int24[3][]',
      },
      { name: 'usePremiaAsCollateral', internalType: 'bool', type: 'bool' },
      { name: 'builderCode', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'dispatch',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'positionIdListFrom',
        internalType: 'TokenId[]',
        type: 'uint256[]',
      },
      { name: 'account', internalType: 'address', type: 'address' },
      {
        name: 'positionIdListTo',
        internalType: 'TokenId[]',
        type: 'uint256[]',
      },
      {
        name: 'positionIdListToFinal',
        internalType: 'TokenId[]',
        type: 'uint256[]',
      },
      {
        name: 'usePremiaAsCollateral',
        internalType: 'LeftRightUnsigned',
        type: 'uint256',
      },
    ],
    name: 'dispatchFrom',
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'getCurrentTick',
    outputs: [{ name: '', internalType: 'int24', type: 'int24' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'user', internalType: 'address', type: 'address' },
      { name: 'includePendingPremium', internalType: 'bool', type: 'bool' },
      { name: 'positionIdList', internalType: 'TokenId[]', type: 'uint256[]' },
    ],
    name: 'getFullPositionsData',
    outputs: [
      {
        name: 'shortPremium',
        internalType: 'LeftRightUnsigned',
        type: 'uint256',
      },
      {
        name: 'longPremium',
        internalType: 'LeftRightUnsigned',
        type: 'uint256',
      },
      {
        name: 'positionBalances',
        internalType: 'PositionBalance[]',
        type: 'uint256[]',
      },
      {
        name: 'collateralRequirements',
        internalType: 'LeftRightUnsigned[]',
        type: 'uint256[]',
      },
      {
        name: 'netPremiaPerPosition',
        internalType: 'LeftRightSigned[]',
        type: 'int256[]',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'getOracleTicks',
    outputs: [
      { name: 'currentTick', internalType: 'int24', type: 'int24' },
      { name: 'spotTick', internalType: 'int24', type: 'int24' },
      { name: 'medianTick', internalType: 'int24', type: 'int24' },
      { name: 'latestTick', internalType: 'int24', type: 'int24' },
      { name: 'oraclePack', internalType: 'OraclePack', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'getTWAP',
    outputs: [{ name: '', internalType: 'int24', type: 'int24' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'user', internalType: 'address', type: 'address' }],
    name: 'numberOfLegs',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// MacroHedgeExecutor
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const macroHedgeExecutorAbi = [
  {
    type: 'constructor',
    inputs: [
      { name: 'platform', internalType: 'address', type: 'address' },
      {
        name: '_pool',
        internalType: 'contract PanopticPoolV2',
        type: 'address',
      },
      {
        name: '_riskManager',
        internalType: 'contract RiskManagement',
        type: 'address',
      },
      { name: '_vegoid', internalType: 'uint8', type: 'uint8' },
      { name: '_beta1Tranquil', internalType: 'uint256', type: 'uint256' },
      { name: '_beta1Stress', internalType: 'uint256', type: 'uint256' },
      { name: '_targetDev', internalType: 'uint256', type: 'uint256' },
      { name: '_baseVol', internalType: 'uint256', type: 'uint256' },
      {
        name: '_regimeOracle',
        internalType: 'contract IRegimeOracle',
        type: 'address',
      },
      {
        name: '_surpriseOracle',
        internalType: 'contract ISurpriseOracle',
        type: 'address',
      },
    ],
    stateMutability: 'payable',
  },
  { type: 'receive', stateMutability: 'payable' },
  {
    type: 'function',
    inputs: [],
    name: 'LLM_AGENT_ID',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'PLATFORM',
    outputs: [
      { name: '', internalType: 'contract IAgentRequester', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'baseVol',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'beta1StressWad',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'beta1TranquilWad',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'requestId', internalType: 'uint256', type: 'uint256' },
      {
        name: 'responses',
        internalType: 'struct Response[]',
        type: 'tuple[]',
        components: [
          { name: 'validator', internalType: 'address', type: 'address' },
          { name: 'result', internalType: 'bytes', type: 'bytes' },
          {
            name: 'status',
            internalType: 'enum ResponseStatus',
            type: 'uint8',
          },
          { name: 'receipt', internalType: 'uint256', type: 'uint256' },
          { name: 'timestamp', internalType: 'uint256', type: 'uint256' },
          { name: 'executionCost', internalType: 'uint256', type: 'uint256' },
        ],
      },
      { name: 'status', internalType: 'enum ResponseStatus', type: 'uint8' },
      {
        name: '',
        internalType: 'struct Request',
        type: 'tuple',
        components: [
          { name: 'id', internalType: 'uint256', type: 'uint256' },
          { name: 'requester', internalType: 'address', type: 'address' },
          { name: 'callbackAddress', internalType: 'address', type: 'address' },
          { name: 'callbackSelector', internalType: 'bytes4', type: 'bytes4' },
          {
            name: 'subcommittee',
            internalType: 'address[]',
            type: 'address[]',
          },
          {
            name: 'responses',
            internalType: 'struct Response[]',
            type: 'tuple[]',
            components: [
              { name: 'validator', internalType: 'address', type: 'address' },
              { name: 'result', internalType: 'bytes', type: 'bytes' },
              {
                name: 'status',
                internalType: 'enum ResponseStatus',
                type: 'uint8',
              },
              { name: 'receipt', internalType: 'uint256', type: 'uint256' },
              { name: 'timestamp', internalType: 'uint256', type: 'uint256' },
              {
                name: 'executionCost',
                internalType: 'uint256',
                type: 'uint256',
              },
            ],
          },
          { name: 'responseCount', internalType: 'uint256', type: 'uint256' },
          { name: 'failureCount', internalType: 'uint256', type: 'uint256' },
          { name: 'threshold', internalType: 'uint256', type: 'uint256' },
          { name: 'createdAt', internalType: 'uint256', type: 'uint256' },
          { name: 'deadline', internalType: 'uint256', type: 'uint256' },
          {
            name: 'status',
            internalType: 'enum ResponseStatus',
            type: 'uint8',
          },
          {
            name: 'consensusType',
            internalType: 'enum ConsensusType',
            type: 'uint8',
          },
          { name: 'remainingBudget', internalType: 'uint256', type: 'uint256' },
        ],
      },
    ],
    name: 'handleResponse',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'owner',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    name: 'pendingRequests',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'pool',
    outputs: [
      { name: '', internalType: 'contract PanopticPoolV2', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'id', internalType: 'TokenId', type: 'uint256' },
      { name: 'strike', internalType: 'int24', type: 'int24' },
    ],
    name: 'quoteMargin',
    outputs: [{ name: '', internalType: 'BalanceDelta', type: 'int256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'regimeOracle',
    outputs: [
      { name: '', internalType: 'contract IRegimeOracle', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'legParams',
        internalType: 'struct HedgeLegParams',
        type: 'tuple',
        components: [
          { name: 'underlyingMarket', internalType: 'PoolId', type: 'bytes32' },
          { name: 'strikeWAD', internalType: 'uint256', type: 'uint256' },
          { name: 'size', internalType: 'uint256', type: 'uint256' },
          {
            name: 'economicTheory',
            internalType: 'contract IMacroThesis',
            type: 'address',
          },
          { name: 'chainId', internalType: 'uint32', type: 'uint32' },
          { name: 'isLong', internalType: 'bool', type: 'bool' },
          {
            name: 'payoffTerms',
            internalType: 'struct PayoffTerms',
            type: 'tuple',
            components: [
              { name: 'vol', internalType: 'uint88', type: 'uint88' },
              { name: 'horizonBlocks', internalType: 'uint32', type: 'uint32' },
              { name: 'tickSpacing', internalType: 'int24', type: 'int24' },
              { name: 'asset', internalType: 'uint8', type: 'uint8' },
              { name: 'riskPartner', internalType: 'uint8', type: 'uint8' },
            ],
          },
        ],
      },
      { name: 'legIndex', internalType: 'uint256', type: 'uint256' },
      { name: 'positionSize', internalType: 'uint128', type: 'uint128' },
    ],
    name: 'resolveAndMint',
    outputs: [{ name: 'positionId', internalType: 'TokenId', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'mandate',
        internalType: 'struct HedgeMandate',
        type: 'tuple',
        components: [
          {
            name: 'economicTheory',
            internalType: 'contract IMacroThesis',
            type: 'address',
          },
          { name: 'underlyingMarket', internalType: 'PoolId', type: 'bytes32' },
          { name: 'targetNotional', internalType: 'uint256', type: 'uint256' },
          { name: 'chainId', internalType: 'uint32', type: 'uint32' },
          { name: 'isLong', internalType: 'bool', type: 'bool' },
        ],
      },
      { name: 'legIndex', internalType: 'uint256', type: 'uint256' },
      { name: 'positionSize', internalType: 'uint128', type: 'uint128' },
    ],
    name: 'resolveFromMandate',
    outputs: [{ name: 'positionId', internalType: 'TokenId', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'riskManager',
    outputs: [
      { name: '', internalType: 'contract RiskManagement', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'surpriseOracle',
    outputs: [
      { name: '', internalType: 'contract ISurpriseOracle', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'to', internalType: 'address payable', type: 'address' }],
    name: 'sweep',
    outputs: [{ name: 'amount', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'targetDevaluationWad',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'vegoid',
    outputs: [{ name: '', internalType: 'uint8', type: 'uint8' }],
    stateMutability: 'view',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'requestId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'agentId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
    ],
    name: 'AgentRequested',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'requestId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'regimeZt',
        internalType: 'uint8',
        type: 'uint8',
        indexed: false,
      },
      {
        name: 'inflationAdjustmentWad',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'strikeTick',
        internalType: 'int24',
        type: 'int24',
        indexed: false,
      },
      {
        name: 'regimeWidth',
        internalType: 'int24',
        type: 'int24',
        indexed: false,
      },
      {
        name: 'parametricHedged',
        internalType: 'bool',
        type: 'bool',
        indexed: false,
      },
      {
        name: 'nonErgodicDisclosed',
        internalType: 'bool',
        type: 'bool',
        indexed: false,
      },
      {
        name: 'rationale',
        internalType: 'string',
        type: 'string',
        indexed: false,
      },
    ],
    name: 'ExecutorDecided',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'owner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'positionId',
        internalType: 'TokenId',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'positionSize',
        internalType: 'uint128',
        type: 'uint128',
        indexed: false,
      },
    ],
    name: 'PositionMinted',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'requestId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'rationale',
        internalType: 'string',
        type: 'string',
        indexed: false,
      },
      {
        name: 'representative',
        internalType: 'bool',
        type: 'bool',
        indexed: false,
      },
    ],
    name: 'RepresentativenessAssessed',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'to', internalType: 'address', type: 'address', indexed: true },
      {
        name: 'amount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'Swept',
  },
  {
    type: 'error',
    inputs: [
      { name: 'sent', internalType: 'uint256', type: 'uint256' },
      { name: 'floor', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'InsufficientDeposit',
  },
  {
    type: 'error',
    inputs: [{ name: 'caller', internalType: 'address', type: 'address' }],
    name: 'NotOwner',
  },
  {
    type: 'error',
    inputs: [{ name: 'caller', internalType: 'address', type: 'address' }],
    name: 'NotPlatform',
  },
  { type: 'error', inputs: [], name: 'SweepFailed' },
  {
    type: 'error',
    inputs: [{ name: 'requestId', internalType: 'uint256', type: 'uint256' }],
    name: 'UnknownRequest',
  },
  { type: 'error', inputs: [], name: 'ZeroRecipient' },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// MacroHedgeStrategist
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const macroHedgeStrategistAbi = [
  {
    type: 'constructor',
    inputs: [
      { name: 'platform', internalType: 'address', type: 'address' },
      { name: 'oracle', internalType: 'address', type: 'address' },
    ],
    stateMutability: 'nonpayable',
  },
  { type: 'receive', stateMutability: 'payable' },
  {
    type: 'function',
    inputs: [],
    name: 'LLM_AGENT_ID',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'MAX_NOTIONAL',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'MIN_NOTIONAL',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'ORACLE',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'PLATFORM',
    outputs: [
      { name: '', internalType: 'contract IAgentRequester', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'POLYGON_CHAIN_ID',
    outputs: [{ name: '', internalType: 'uint32', type: 'uint32' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'decisionId', internalType: 'bytes32', type: 'bytes32' }],
    name: 'decisionState',
    outputs: [
      {
        name: '',
        internalType: 'struct MacroHedgeStrategist.DecisionState',
        type: 'tuple',
        components: [
          { name: 'schoolSet', internalType: 'bool', type: 'bool' },
          { name: 'notionalSet', internalType: 'bool', type: 'bool' },
          { name: 'decidedAt', internalType: 'uint64', type: 'uint64' },
          { name: 'schoolLabel', internalType: 'string', type: 'string' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'b', internalType: 'bytes', type: 'bytes' }],
    name: 'decodeString',
    outputs: [{ name: '', internalType: 'string', type: 'string' }],
    stateMutability: 'pure',
  },
  {
    type: 'function',
    inputs: [{ name: 'decisionId', internalType: 'bytes32', type: 'bytes32' }],
    name: 'getMandate',
    outputs: [
      {
        name: '',
        internalType: 'struct HedgeMandate',
        type: 'tuple',
        components: [
          {
            name: 'economicTheory',
            internalType: 'contract IMacroThesis',
            type: 'address',
          },
          { name: 'underlyingMarket', internalType: 'PoolId', type: 'bytes32' },
          { name: 'targetNotional', internalType: 'uint256', type: 'uint256' },
          { name: 'chainId', internalType: 'uint32', type: 'uint32' },
          { name: 'isLong', internalType: 'bool', type: 'bool' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'requestId', internalType: 'uint256', type: 'uint256' },
      {
        name: 'responses',
        internalType: 'struct Response[]',
        type: 'tuple[]',
        components: [
          { name: 'validator', internalType: 'address', type: 'address' },
          { name: 'result', internalType: 'bytes', type: 'bytes' },
          {
            name: 'status',
            internalType: 'enum ResponseStatus',
            type: 'uint8',
          },
          { name: 'receipt', internalType: 'uint256', type: 'uint256' },
          { name: 'timestamp', internalType: 'uint256', type: 'uint256' },
          { name: 'executionCost', internalType: 'uint256', type: 'uint256' },
        ],
      },
      { name: 'status', internalType: 'enum ResponseStatus', type: 'uint8' },
      {
        name: '',
        internalType: 'struct Request',
        type: 'tuple',
        components: [
          { name: 'id', internalType: 'uint256', type: 'uint256' },
          { name: 'requester', internalType: 'address', type: 'address' },
          { name: 'callbackAddress', internalType: 'address', type: 'address' },
          { name: 'callbackSelector', internalType: 'bytes4', type: 'bytes4' },
          {
            name: 'subcommittee',
            internalType: 'address[]',
            type: 'address[]',
          },
          {
            name: 'responses',
            internalType: 'struct Response[]',
            type: 'tuple[]',
            components: [
              { name: 'validator', internalType: 'address', type: 'address' },
              { name: 'result', internalType: 'bytes', type: 'bytes' },
              {
                name: 'status',
                internalType: 'enum ResponseStatus',
                type: 'uint8',
              },
              { name: 'receipt', internalType: 'uint256', type: 'uint256' },
              { name: 'timestamp', internalType: 'uint256', type: 'uint256' },
              {
                name: 'executionCost',
                internalType: 'uint256',
                type: 'uint256',
              },
            ],
          },
          { name: 'responseCount', internalType: 'uint256', type: 'uint256' },
          { name: 'failureCount', internalType: 'uint256', type: 'uint256' },
          { name: 'threshold', internalType: 'uint256', type: 'uint256' },
          { name: 'createdAt', internalType: 'uint256', type: 'uint256' },
          { name: 'deadline', internalType: 'uint256', type: 'uint256' },
          {
            name: 'status',
            internalType: 'enum ResponseStatus',
            type: 'uint8',
          },
          {
            name: 'consensusType',
            internalType: 'enum ConsensusType',
            type: 'uint8',
          },
          { name: 'remainingBudget', internalType: 'uint256', type: 'uint256' },
        ],
      },
    ],
    name: 'handleResponse',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'owner',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    name: 'pendingRequests',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'decisionId', internalType: 'bytes32', type: 'bytes32' }],
    name: 'requestNotionalDecision',
    outputs: [{ name: 'requestId', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'userIntent', internalType: 'string', type: 'string' },
      { name: 'dataKey', internalType: 'bytes32', type: 'bytes32' },
      { name: 'consensus', internalType: 'int256', type: 'int256' },
    ],
    name: 'requestSchoolDecision',
    outputs: [{ name: 'decisionId', internalType: 'bytes32', type: 'bytes32' }],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    inputs: [{ name: 'to', internalType: 'address payable', type: 'address' }],
    name: 'sweep',
    outputs: [{ name: 'amount', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'requestId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'agentId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
    ],
    name: 'AgentRequested',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'requestId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'status',
        internalType: 'enum ResponseStatus',
        type: 'uint8',
        indexed: false,
      },
    ],
    name: 'DecisionFailed',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'requestId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'decisionId',
        internalType: 'bytes32',
        type: 'bytes32',
        indexed: true,
      },
      { name: 'leg', internalType: 'uint8', type: 'uint8', indexed: false },
    ],
    name: 'HedgeDecisionRequested',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'decisionId',
        internalType: 'bytes32',
        type: 'bytes32',
        indexed: true,
      },
      {
        name: 'school',
        internalType: 'string',
        type: 'string',
        indexed: false,
      },
      {
        name: 'mandate',
        internalType: 'struct HedgeMandate',
        type: 'tuple',
        components: [
          {
            name: 'economicTheory',
            internalType: 'contract IMacroThesis',
            type: 'address',
          },
          { name: 'underlyingMarket', internalType: 'PoolId', type: 'bytes32' },
          { name: 'targetNotional', internalType: 'uint256', type: 'uint256' },
          { name: 'chainId', internalType: 'uint32', type: 'uint32' },
          { name: 'isLong', internalType: 'bool', type: 'bool' },
        ],
        indexed: false,
      },
    ],
    name: 'StrategistDecided',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'to', internalType: 'address', type: 'address', indexed: true },
      {
        name: 'amount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'Swept',
  },
  {
    type: 'error',
    inputs: [
      { name: 'sent', internalType: 'uint256', type: 'uint256' },
      { name: 'floor', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'InsufficientDeposit',
  },
  {
    type: 'error',
    inputs: [{ name: 'caller', internalType: 'address', type: 'address' }],
    name: 'NotOwner',
  },
  {
    type: 'error',
    inputs: [{ name: 'caller', internalType: 'address', type: 'address' }],
    name: 'NotPlatform',
  },
  { type: 'error', inputs: [], name: 'SweepFailed' },
  {
    type: 'error',
    inputs: [{ name: 'decisionId', internalType: 'bytes32', type: 'bytes32' }],
    name: 'UnknownDecision',
  },
  {
    type: 'error',
    inputs: [{ name: 'dataKey', internalType: 'bytes32', type: 'bytes32' }],
    name: 'UnknownKey',
  },
  {
    type: 'error',
    inputs: [{ name: 'requestId', internalType: 'uint256', type: 'uint256' }],
    name: 'UnknownRequest',
  },
  { type: 'error', inputs: [], name: 'ZeroRecipient' },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// MacroOracle
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const macroOracleAbi = [
  {
    type: 'constructor',
    inputs: [
      { name: 'platform', internalType: 'address', type: 'address' },
      { name: 'proxyBase', internalType: 'string', type: 'string' },
    ],
    stateMutability: 'nonpayable',
  },
  { type: 'receive', stateMutability: 'payable' },
  {
    type: 'function',
    inputs: [],
    name: 'JSON_API_AGENT_ID',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'PLATFORM',
    outputs: [
      { name: '', internalType: 'contract IAgentRequester', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'PROXY_BASE',
    outputs: [{ name: '', internalType: 'string', type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'dataKey', internalType: 'bytes32', type: 'bytes32' }],
    name: 'endpointOf',
    outputs: [
      {
        name: '',
        internalType: 'struct Endpoint',
        type: 'tuple',
        components: [
          { name: 'proxyPath', internalType: 'string', type: 'string' },
          { name: 'selector', internalType: 'string', type: 'string' },
          { name: 'decimals', internalType: 'uint8', type: 'uint8' },
          { name: 'kind', internalType: 'enum ValueKind', type: 'uint8' },
          { name: 'class', internalType: 'enum MacroClass', type: 'uint8' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'requestId', internalType: 'uint256', type: 'uint256' },
      {
        name: 'responses',
        internalType: 'struct Response[]',
        type: 'tuple[]',
        components: [
          { name: 'validator', internalType: 'address', type: 'address' },
          { name: 'result', internalType: 'bytes', type: 'bytes' },
          {
            name: 'status',
            internalType: 'enum ResponseStatus',
            type: 'uint8',
          },
          { name: 'receipt', internalType: 'uint256', type: 'uint256' },
          { name: 'timestamp', internalType: 'uint256', type: 'uint256' },
          { name: 'executionCost', internalType: 'uint256', type: 'uint256' },
        ],
      },
      { name: 'status', internalType: 'enum ResponseStatus', type: 'uint8' },
      {
        name: '',
        internalType: 'struct Request',
        type: 'tuple',
        components: [
          { name: 'id', internalType: 'uint256', type: 'uint256' },
          { name: 'requester', internalType: 'address', type: 'address' },
          { name: 'callbackAddress', internalType: 'address', type: 'address' },
          { name: 'callbackSelector', internalType: 'bytes4', type: 'bytes4' },
          {
            name: 'subcommittee',
            internalType: 'address[]',
            type: 'address[]',
          },
          {
            name: 'responses',
            internalType: 'struct Response[]',
            type: 'tuple[]',
            components: [
              { name: 'validator', internalType: 'address', type: 'address' },
              { name: 'result', internalType: 'bytes', type: 'bytes' },
              {
                name: 'status',
                internalType: 'enum ResponseStatus',
                type: 'uint8',
              },
              { name: 'receipt', internalType: 'uint256', type: 'uint256' },
              { name: 'timestamp', internalType: 'uint256', type: 'uint256' },
              {
                name: 'executionCost',
                internalType: 'uint256',
                type: 'uint256',
              },
            ],
          },
          { name: 'responseCount', internalType: 'uint256', type: 'uint256' },
          { name: 'failureCount', internalType: 'uint256', type: 'uint256' },
          { name: 'threshold', internalType: 'uint256', type: 'uint256' },
          { name: 'createdAt', internalType: 'uint256', type: 'uint256' },
          { name: 'deadline', internalType: 'uint256', type: 'uint256' },
          {
            name: 'status',
            internalType: 'enum ResponseStatus',
            type: 'uint8',
          },
          {
            name: 'consensusType',
            internalType: 'enum ConsensusType',
            type: 'uint8',
          },
          { name: 'remainingBudget', internalType: 'uint256', type: 'uint256' },
        ],
      },
    ],
    name: 'handleResponse',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'bytes32', type: 'bytes32' }],
    name: 'latest',
    outputs: [
      { name: 'dataKey', internalType: 'bytes32', type: 'bytes32' },
      { name: 'scaledValue', internalType: 'int256', type: 'int256' },
      { name: 'observedAt', internalType: 'uint64', type: 'uint64' },
      { name: 'deliveredAt', internalType: 'uint64', type: 'uint64' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'owner',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    name: 'pendingRequests',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'dataKey', internalType: 'bytes32', type: 'bytes32' }],
    name: 'requestMacro',
    outputs: [{ name: 'requestId', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    inputs: [{ name: 'to', internalType: 'address payable', type: 'address' }],
    name: 'sweep',
    outputs: [{ name: 'amount', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'requestId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'agentId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
    ],
    name: 'AgentRequested',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'requestId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'dataKey',
        internalType: 'bytes32',
        type: 'bytes32',
        indexed: true,
      },
      {
        name: 'status',
        internalType: 'enum ResponseStatus',
        type: 'uint8',
        indexed: false,
      },
    ],
    name: 'MacroFailed',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'dataKey',
        internalType: 'bytes32',
        type: 'bytes32',
        indexed: true,
      },
      {
        name: 'scaledValue',
        internalType: 'int256',
        type: 'int256',
        indexed: false,
      },
    ],
    name: 'MacroReceived',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'requestId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'dataKey',
        internalType: 'bytes32',
        type: 'bytes32',
        indexed: true,
      },
    ],
    name: 'MacroRequested',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'to', internalType: 'address', type: 'address', indexed: true },
      {
        name: 'amount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'Swept',
  },
  { type: 'error', inputs: [], name: 'BadProxyBase' },
  {
    type: 'error',
    inputs: [
      { name: 'sent', internalType: 'uint256', type: 'uint256' },
      { name: 'floor', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'InsufficientDeposit',
  },
  {
    type: 'error',
    inputs: [{ name: 'caller', internalType: 'address', type: 'address' }],
    name: 'NotOwner',
  },
  {
    type: 'error',
    inputs: [{ name: 'caller', internalType: 'address', type: 'address' }],
    name: 'NotPlatform',
  },
  { type: 'error', inputs: [], name: 'SweepFailed' },
  {
    type: 'error',
    inputs: [{ name: 'dataKey', internalType: 'bytes32', type: 'bytes32' }],
    name: 'UnknownKey',
  },
  {
    type: 'error',
    inputs: [{ name: 'requestId', internalType: 'uint256', type: 'uint256' }],
    name: 'UnknownRequest',
  },
  {
    type: 'error',
    inputs: [{ name: 'dataKey', internalType: 'bytes32', type: 'bytes32' }],
    name: 'UnsupportedKind',
  },
  { type: 'error', inputs: [], name: 'ZeroRecipient' },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// React
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link iPanopticDataAbi}__
 */
export const useReadIPanopticData = /*#__PURE__*/ createUseReadContract({
  abi: iPanopticDataAbi,
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link iPanopticDataAbi}__ and `functionName` set to `"getCurrentTick"`
 */
export const useReadIPanopticDataGetCurrentTick =
  /*#__PURE__*/ createUseReadContract({
    abi: iPanopticDataAbi,
    functionName: 'getCurrentTick',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link iPanopticDataAbi}__ and `functionName` set to `"getFullPositionsData"`
 */
export const useReadIPanopticDataGetFullPositionsData =
  /*#__PURE__*/ createUseReadContract({
    abi: iPanopticDataAbi,
    functionName: 'getFullPositionsData',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link iPanopticDataAbi}__ and `functionName` set to `"getOracleTicks"`
 */
export const useReadIPanopticDataGetOracleTicks =
  /*#__PURE__*/ createUseReadContract({
    abi: iPanopticDataAbi,
    functionName: 'getOracleTicks',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link iPanopticDataAbi}__ and `functionName` set to `"getTWAP"`
 */
export const useReadIPanopticDataGetTwap = /*#__PURE__*/ createUseReadContract({
  abi: iPanopticDataAbi,
  functionName: 'getTWAP',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link iPanopticDataAbi}__ and `functionName` set to `"numberOfLegs"`
 */
export const useReadIPanopticDataNumberOfLegs =
  /*#__PURE__*/ createUseReadContract({
    abi: iPanopticDataAbi,
    functionName: 'numberOfLegs',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link iPanopticDataAbi}__
 */
export const useWriteIPanopticData = /*#__PURE__*/ createUseWriteContract({
  abi: iPanopticDataAbi,
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link iPanopticDataAbi}__ and `functionName` set to `"dispatch"`
 */
export const useWriteIPanopticDataDispatch =
  /*#__PURE__*/ createUseWriteContract({
    abi: iPanopticDataAbi,
    functionName: 'dispatch',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link iPanopticDataAbi}__ and `functionName` set to `"dispatchFrom"`
 */
export const useWriteIPanopticDataDispatchFrom =
  /*#__PURE__*/ createUseWriteContract({
    abi: iPanopticDataAbi,
    functionName: 'dispatchFrom',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link iPanopticDataAbi}__
 */
export const useSimulateIPanopticData = /*#__PURE__*/ createUseSimulateContract(
  { abi: iPanopticDataAbi },
)

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link iPanopticDataAbi}__ and `functionName` set to `"dispatch"`
 */
export const useSimulateIPanopticDataDispatch =
  /*#__PURE__*/ createUseSimulateContract({
    abi: iPanopticDataAbi,
    functionName: 'dispatch',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link iPanopticDataAbi}__ and `functionName` set to `"dispatchFrom"`
 */
export const useSimulateIPanopticDataDispatchFrom =
  /*#__PURE__*/ createUseSimulateContract({
    abi: iPanopticDataAbi,
    functionName: 'dispatchFrom',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link macroHedgeExecutorAbi}__
 */
export const useReadMacroHedgeExecutor = /*#__PURE__*/ createUseReadContract({
  abi: macroHedgeExecutorAbi,
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link macroHedgeExecutorAbi}__ and `functionName` set to `"LLM_AGENT_ID"`
 */
export const useReadMacroHedgeExecutorLlmAgentId =
  /*#__PURE__*/ createUseReadContract({
    abi: macroHedgeExecutorAbi,
    functionName: 'LLM_AGENT_ID',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link macroHedgeExecutorAbi}__ and `functionName` set to `"PLATFORM"`
 */
export const useReadMacroHedgeExecutorPlatform =
  /*#__PURE__*/ createUseReadContract({
    abi: macroHedgeExecutorAbi,
    functionName: 'PLATFORM',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link macroHedgeExecutorAbi}__ and `functionName` set to `"baseVol"`
 */
export const useReadMacroHedgeExecutorBaseVol =
  /*#__PURE__*/ createUseReadContract({
    abi: macroHedgeExecutorAbi,
    functionName: 'baseVol',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link macroHedgeExecutorAbi}__ and `functionName` set to `"beta1StressWad"`
 */
export const useReadMacroHedgeExecutorBeta1StressWad =
  /*#__PURE__*/ createUseReadContract({
    abi: macroHedgeExecutorAbi,
    functionName: 'beta1StressWad',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link macroHedgeExecutorAbi}__ and `functionName` set to `"beta1TranquilWad"`
 */
export const useReadMacroHedgeExecutorBeta1TranquilWad =
  /*#__PURE__*/ createUseReadContract({
    abi: macroHedgeExecutorAbi,
    functionName: 'beta1TranquilWad',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link macroHedgeExecutorAbi}__ and `functionName` set to `"owner"`
 */
export const useReadMacroHedgeExecutorOwner =
  /*#__PURE__*/ createUseReadContract({
    abi: macroHedgeExecutorAbi,
    functionName: 'owner',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link macroHedgeExecutorAbi}__ and `functionName` set to `"pendingRequests"`
 */
export const useReadMacroHedgeExecutorPendingRequests =
  /*#__PURE__*/ createUseReadContract({
    abi: macroHedgeExecutorAbi,
    functionName: 'pendingRequests',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link macroHedgeExecutorAbi}__ and `functionName` set to `"pool"`
 */
export const useReadMacroHedgeExecutorPool =
  /*#__PURE__*/ createUseReadContract({
    abi: macroHedgeExecutorAbi,
    functionName: 'pool',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link macroHedgeExecutorAbi}__ and `functionName` set to `"quoteMargin"`
 */
export const useReadMacroHedgeExecutorQuoteMargin =
  /*#__PURE__*/ createUseReadContract({
    abi: macroHedgeExecutorAbi,
    functionName: 'quoteMargin',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link macroHedgeExecutorAbi}__ and `functionName` set to `"regimeOracle"`
 */
export const useReadMacroHedgeExecutorRegimeOracle =
  /*#__PURE__*/ createUseReadContract({
    abi: macroHedgeExecutorAbi,
    functionName: 'regimeOracle',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link macroHedgeExecutorAbi}__ and `functionName` set to `"riskManager"`
 */
export const useReadMacroHedgeExecutorRiskManager =
  /*#__PURE__*/ createUseReadContract({
    abi: macroHedgeExecutorAbi,
    functionName: 'riskManager',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link macroHedgeExecutorAbi}__ and `functionName` set to `"surpriseOracle"`
 */
export const useReadMacroHedgeExecutorSurpriseOracle =
  /*#__PURE__*/ createUseReadContract({
    abi: macroHedgeExecutorAbi,
    functionName: 'surpriseOracle',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link macroHedgeExecutorAbi}__ and `functionName` set to `"targetDevaluationWad"`
 */
export const useReadMacroHedgeExecutorTargetDevaluationWad =
  /*#__PURE__*/ createUseReadContract({
    abi: macroHedgeExecutorAbi,
    functionName: 'targetDevaluationWad',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link macroHedgeExecutorAbi}__ and `functionName` set to `"vegoid"`
 */
export const useReadMacroHedgeExecutorVegoid =
  /*#__PURE__*/ createUseReadContract({
    abi: macroHedgeExecutorAbi,
    functionName: 'vegoid',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link macroHedgeExecutorAbi}__
 */
export const useWriteMacroHedgeExecutor = /*#__PURE__*/ createUseWriteContract({
  abi: macroHedgeExecutorAbi,
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link macroHedgeExecutorAbi}__ and `functionName` set to `"handleResponse"`
 */
export const useWriteMacroHedgeExecutorHandleResponse =
  /*#__PURE__*/ createUseWriteContract({
    abi: macroHedgeExecutorAbi,
    functionName: 'handleResponse',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link macroHedgeExecutorAbi}__ and `functionName` set to `"resolveAndMint"`
 */
export const useWriteMacroHedgeExecutorResolveAndMint =
  /*#__PURE__*/ createUseWriteContract({
    abi: macroHedgeExecutorAbi,
    functionName: 'resolveAndMint',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link macroHedgeExecutorAbi}__ and `functionName` set to `"resolveFromMandate"`
 */
export const useWriteMacroHedgeExecutorResolveFromMandate =
  /*#__PURE__*/ createUseWriteContract({
    abi: macroHedgeExecutorAbi,
    functionName: 'resolveFromMandate',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link macroHedgeExecutorAbi}__ and `functionName` set to `"sweep"`
 */
export const useWriteMacroHedgeExecutorSweep =
  /*#__PURE__*/ createUseWriteContract({
    abi: macroHedgeExecutorAbi,
    functionName: 'sweep',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link macroHedgeExecutorAbi}__
 */
export const useSimulateMacroHedgeExecutor =
  /*#__PURE__*/ createUseSimulateContract({ abi: macroHedgeExecutorAbi })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link macroHedgeExecutorAbi}__ and `functionName` set to `"handleResponse"`
 */
export const useSimulateMacroHedgeExecutorHandleResponse =
  /*#__PURE__*/ createUseSimulateContract({
    abi: macroHedgeExecutorAbi,
    functionName: 'handleResponse',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link macroHedgeExecutorAbi}__ and `functionName` set to `"resolveAndMint"`
 */
export const useSimulateMacroHedgeExecutorResolveAndMint =
  /*#__PURE__*/ createUseSimulateContract({
    abi: macroHedgeExecutorAbi,
    functionName: 'resolveAndMint',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link macroHedgeExecutorAbi}__ and `functionName` set to `"resolveFromMandate"`
 */
export const useSimulateMacroHedgeExecutorResolveFromMandate =
  /*#__PURE__*/ createUseSimulateContract({
    abi: macroHedgeExecutorAbi,
    functionName: 'resolveFromMandate',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link macroHedgeExecutorAbi}__ and `functionName` set to `"sweep"`
 */
export const useSimulateMacroHedgeExecutorSweep =
  /*#__PURE__*/ createUseSimulateContract({
    abi: macroHedgeExecutorAbi,
    functionName: 'sweep',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link macroHedgeExecutorAbi}__
 */
export const useWatchMacroHedgeExecutorEvent =
  /*#__PURE__*/ createUseWatchContractEvent({ abi: macroHedgeExecutorAbi })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link macroHedgeExecutorAbi}__ and `eventName` set to `"AgentRequested"`
 */
export const useWatchMacroHedgeExecutorAgentRequestedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: macroHedgeExecutorAbi,
    eventName: 'AgentRequested',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link macroHedgeExecutorAbi}__ and `eventName` set to `"ExecutorDecided"`
 */
export const useWatchMacroHedgeExecutorExecutorDecidedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: macroHedgeExecutorAbi,
    eventName: 'ExecutorDecided',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link macroHedgeExecutorAbi}__ and `eventName` set to `"PositionMinted"`
 */
export const useWatchMacroHedgeExecutorPositionMintedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: macroHedgeExecutorAbi,
    eventName: 'PositionMinted',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link macroHedgeExecutorAbi}__ and `eventName` set to `"RepresentativenessAssessed"`
 */
export const useWatchMacroHedgeExecutorRepresentativenessAssessedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: macroHedgeExecutorAbi,
    eventName: 'RepresentativenessAssessed',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link macroHedgeExecutorAbi}__ and `eventName` set to `"Swept"`
 */
export const useWatchMacroHedgeExecutorSweptEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: macroHedgeExecutorAbi,
    eventName: 'Swept',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link macroHedgeStrategistAbi}__
 */
export const useReadMacroHedgeStrategist = /*#__PURE__*/ createUseReadContract({
  abi: macroHedgeStrategistAbi,
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link macroHedgeStrategistAbi}__ and `functionName` set to `"LLM_AGENT_ID"`
 */
export const useReadMacroHedgeStrategistLlmAgentId =
  /*#__PURE__*/ createUseReadContract({
    abi: macroHedgeStrategistAbi,
    functionName: 'LLM_AGENT_ID',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link macroHedgeStrategistAbi}__ and `functionName` set to `"MAX_NOTIONAL"`
 */
export const useReadMacroHedgeStrategistMaxNotional =
  /*#__PURE__*/ createUseReadContract({
    abi: macroHedgeStrategistAbi,
    functionName: 'MAX_NOTIONAL',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link macroHedgeStrategistAbi}__ and `functionName` set to `"MIN_NOTIONAL"`
 */
export const useReadMacroHedgeStrategistMinNotional =
  /*#__PURE__*/ createUseReadContract({
    abi: macroHedgeStrategistAbi,
    functionName: 'MIN_NOTIONAL',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link macroHedgeStrategistAbi}__ and `functionName` set to `"ORACLE"`
 */
export const useReadMacroHedgeStrategistOracle =
  /*#__PURE__*/ createUseReadContract({
    abi: macroHedgeStrategistAbi,
    functionName: 'ORACLE',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link macroHedgeStrategistAbi}__ and `functionName` set to `"PLATFORM"`
 */
export const useReadMacroHedgeStrategistPlatform =
  /*#__PURE__*/ createUseReadContract({
    abi: macroHedgeStrategistAbi,
    functionName: 'PLATFORM',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link macroHedgeStrategistAbi}__ and `functionName` set to `"POLYGON_CHAIN_ID"`
 */
export const useReadMacroHedgeStrategistPolygonChainId =
  /*#__PURE__*/ createUseReadContract({
    abi: macroHedgeStrategistAbi,
    functionName: 'POLYGON_CHAIN_ID',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link macroHedgeStrategistAbi}__ and `functionName` set to `"decisionState"`
 */
export const useReadMacroHedgeStrategistDecisionState =
  /*#__PURE__*/ createUseReadContract({
    abi: macroHedgeStrategistAbi,
    functionName: 'decisionState',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link macroHedgeStrategistAbi}__ and `functionName` set to `"decodeString"`
 */
export const useReadMacroHedgeStrategistDecodeString =
  /*#__PURE__*/ createUseReadContract({
    abi: macroHedgeStrategistAbi,
    functionName: 'decodeString',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link macroHedgeStrategistAbi}__ and `functionName` set to `"getMandate"`
 */
export const useReadMacroHedgeStrategistGetMandate =
  /*#__PURE__*/ createUseReadContract({
    abi: macroHedgeStrategistAbi,
    functionName: 'getMandate',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link macroHedgeStrategistAbi}__ and `functionName` set to `"owner"`
 */
export const useReadMacroHedgeStrategistOwner =
  /*#__PURE__*/ createUseReadContract({
    abi: macroHedgeStrategistAbi,
    functionName: 'owner',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link macroHedgeStrategistAbi}__ and `functionName` set to `"pendingRequests"`
 */
export const useReadMacroHedgeStrategistPendingRequests =
  /*#__PURE__*/ createUseReadContract({
    abi: macroHedgeStrategistAbi,
    functionName: 'pendingRequests',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link macroHedgeStrategistAbi}__
 */
export const useWriteMacroHedgeStrategist =
  /*#__PURE__*/ createUseWriteContract({ abi: macroHedgeStrategistAbi })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link macroHedgeStrategistAbi}__ and `functionName` set to `"handleResponse"`
 */
export const useWriteMacroHedgeStrategistHandleResponse =
  /*#__PURE__*/ createUseWriteContract({
    abi: macroHedgeStrategistAbi,
    functionName: 'handleResponse',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link macroHedgeStrategistAbi}__ and `functionName` set to `"requestNotionalDecision"`
 */
export const useWriteMacroHedgeStrategistRequestNotionalDecision =
  /*#__PURE__*/ createUseWriteContract({
    abi: macroHedgeStrategistAbi,
    functionName: 'requestNotionalDecision',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link macroHedgeStrategistAbi}__ and `functionName` set to `"requestSchoolDecision"`
 */
export const useWriteMacroHedgeStrategistRequestSchoolDecision =
  /*#__PURE__*/ createUseWriteContract({
    abi: macroHedgeStrategistAbi,
    functionName: 'requestSchoolDecision',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link macroHedgeStrategistAbi}__ and `functionName` set to `"sweep"`
 */
export const useWriteMacroHedgeStrategistSweep =
  /*#__PURE__*/ createUseWriteContract({
    abi: macroHedgeStrategistAbi,
    functionName: 'sweep',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link macroHedgeStrategistAbi}__
 */
export const useSimulateMacroHedgeStrategist =
  /*#__PURE__*/ createUseSimulateContract({ abi: macroHedgeStrategistAbi })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link macroHedgeStrategistAbi}__ and `functionName` set to `"handleResponse"`
 */
export const useSimulateMacroHedgeStrategistHandleResponse =
  /*#__PURE__*/ createUseSimulateContract({
    abi: macroHedgeStrategistAbi,
    functionName: 'handleResponse',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link macroHedgeStrategistAbi}__ and `functionName` set to `"requestNotionalDecision"`
 */
export const useSimulateMacroHedgeStrategistRequestNotionalDecision =
  /*#__PURE__*/ createUseSimulateContract({
    abi: macroHedgeStrategistAbi,
    functionName: 'requestNotionalDecision',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link macroHedgeStrategistAbi}__ and `functionName` set to `"requestSchoolDecision"`
 */
export const useSimulateMacroHedgeStrategistRequestSchoolDecision =
  /*#__PURE__*/ createUseSimulateContract({
    abi: macroHedgeStrategistAbi,
    functionName: 'requestSchoolDecision',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link macroHedgeStrategistAbi}__ and `functionName` set to `"sweep"`
 */
export const useSimulateMacroHedgeStrategistSweep =
  /*#__PURE__*/ createUseSimulateContract({
    abi: macroHedgeStrategistAbi,
    functionName: 'sweep',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link macroHedgeStrategistAbi}__
 */
export const useWatchMacroHedgeStrategistEvent =
  /*#__PURE__*/ createUseWatchContractEvent({ abi: macroHedgeStrategistAbi })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link macroHedgeStrategistAbi}__ and `eventName` set to `"AgentRequested"`
 */
export const useWatchMacroHedgeStrategistAgentRequestedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: macroHedgeStrategistAbi,
    eventName: 'AgentRequested',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link macroHedgeStrategistAbi}__ and `eventName` set to `"DecisionFailed"`
 */
export const useWatchMacroHedgeStrategistDecisionFailedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: macroHedgeStrategistAbi,
    eventName: 'DecisionFailed',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link macroHedgeStrategistAbi}__ and `eventName` set to `"HedgeDecisionRequested"`
 */
export const useWatchMacroHedgeStrategistHedgeDecisionRequestedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: macroHedgeStrategistAbi,
    eventName: 'HedgeDecisionRequested',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link macroHedgeStrategistAbi}__ and `eventName` set to `"StrategistDecided"`
 */
export const useWatchMacroHedgeStrategistStrategistDecidedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: macroHedgeStrategistAbi,
    eventName: 'StrategistDecided',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link macroHedgeStrategistAbi}__ and `eventName` set to `"Swept"`
 */
export const useWatchMacroHedgeStrategistSweptEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: macroHedgeStrategistAbi,
    eventName: 'Swept',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link macroOracleAbi}__
 */
export const useReadMacroOracle = /*#__PURE__*/ createUseReadContract({
  abi: macroOracleAbi,
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link macroOracleAbi}__ and `functionName` set to `"JSON_API_AGENT_ID"`
 */
export const useReadMacroOracleJsonApiAgentId =
  /*#__PURE__*/ createUseReadContract({
    abi: macroOracleAbi,
    functionName: 'JSON_API_AGENT_ID',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link macroOracleAbi}__ and `functionName` set to `"PLATFORM"`
 */
export const useReadMacroOraclePlatform = /*#__PURE__*/ createUseReadContract({
  abi: macroOracleAbi,
  functionName: 'PLATFORM',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link macroOracleAbi}__ and `functionName` set to `"PROXY_BASE"`
 */
export const useReadMacroOracleProxyBase = /*#__PURE__*/ createUseReadContract({
  abi: macroOracleAbi,
  functionName: 'PROXY_BASE',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link macroOracleAbi}__ and `functionName` set to `"endpointOf"`
 */
export const useReadMacroOracleEndpointOf = /*#__PURE__*/ createUseReadContract(
  { abi: macroOracleAbi, functionName: 'endpointOf' },
)

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link macroOracleAbi}__ and `functionName` set to `"latest"`
 */
export const useReadMacroOracleLatest = /*#__PURE__*/ createUseReadContract({
  abi: macroOracleAbi,
  functionName: 'latest',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link macroOracleAbi}__ and `functionName` set to `"owner"`
 */
export const useReadMacroOracleOwner = /*#__PURE__*/ createUseReadContract({
  abi: macroOracleAbi,
  functionName: 'owner',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link macroOracleAbi}__ and `functionName` set to `"pendingRequests"`
 */
export const useReadMacroOraclePendingRequests =
  /*#__PURE__*/ createUseReadContract({
    abi: macroOracleAbi,
    functionName: 'pendingRequests',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link macroOracleAbi}__
 */
export const useWriteMacroOracle = /*#__PURE__*/ createUseWriteContract({
  abi: macroOracleAbi,
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link macroOracleAbi}__ and `functionName` set to `"handleResponse"`
 */
export const useWriteMacroOracleHandleResponse =
  /*#__PURE__*/ createUseWriteContract({
    abi: macroOracleAbi,
    functionName: 'handleResponse',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link macroOracleAbi}__ and `functionName` set to `"requestMacro"`
 */
export const useWriteMacroOracleRequestMacro =
  /*#__PURE__*/ createUseWriteContract({
    abi: macroOracleAbi,
    functionName: 'requestMacro',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link macroOracleAbi}__ and `functionName` set to `"sweep"`
 */
export const useWriteMacroOracleSweep = /*#__PURE__*/ createUseWriteContract({
  abi: macroOracleAbi,
  functionName: 'sweep',
})

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link macroOracleAbi}__
 */
export const useSimulateMacroOracle = /*#__PURE__*/ createUseSimulateContract({
  abi: macroOracleAbi,
})

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link macroOracleAbi}__ and `functionName` set to `"handleResponse"`
 */
export const useSimulateMacroOracleHandleResponse =
  /*#__PURE__*/ createUseSimulateContract({
    abi: macroOracleAbi,
    functionName: 'handleResponse',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link macroOracleAbi}__ and `functionName` set to `"requestMacro"`
 */
export const useSimulateMacroOracleRequestMacro =
  /*#__PURE__*/ createUseSimulateContract({
    abi: macroOracleAbi,
    functionName: 'requestMacro',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link macroOracleAbi}__ and `functionName` set to `"sweep"`
 */
export const useSimulateMacroOracleSweep =
  /*#__PURE__*/ createUseSimulateContract({
    abi: macroOracleAbi,
    functionName: 'sweep',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link macroOracleAbi}__
 */
export const useWatchMacroOracleEvent =
  /*#__PURE__*/ createUseWatchContractEvent({ abi: macroOracleAbi })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link macroOracleAbi}__ and `eventName` set to `"AgentRequested"`
 */
export const useWatchMacroOracleAgentRequestedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: macroOracleAbi,
    eventName: 'AgentRequested',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link macroOracleAbi}__ and `eventName` set to `"MacroFailed"`
 */
export const useWatchMacroOracleMacroFailedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: macroOracleAbi,
    eventName: 'MacroFailed',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link macroOracleAbi}__ and `eventName` set to `"MacroReceived"`
 */
export const useWatchMacroOracleMacroReceivedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: macroOracleAbi,
    eventName: 'MacroReceived',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link macroOracleAbi}__ and `eventName` set to `"MacroRequested"`
 */
export const useWatchMacroOracleMacroRequestedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: macroOracleAbi,
    eventName: 'MacroRequested',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link macroOracleAbi}__ and `eventName` set to `"Swept"`
 */
export const useWatchMacroOracleSweptEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: macroOracleAbi,
    eventName: 'Swept',
  })
