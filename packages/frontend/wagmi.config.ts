import { defineConfig } from '@wagmi/cli'
import { foundry, react } from '@wagmi/cli/plugins'

// Phase 9 configuration: point at abrigo-somnia Foundry contracts/out/.
// Include filter covers the 4 contracts used by the cornerstone live-tx integration (09-*):
//   - MacroHedgeStrategist: StrategistDecided, HedgeDecisionRequested, DecisionFailed,
//     requestSchoolDecision, requestNotionalDecision, decisionState
//   - MacroHedgeExecutor: ExecutorDecided (8 fields), PositionMinted, resolveFromMandate, quoteMargin
//   - IPanopticData: numberOfLegs (freshness gate read)
//   - MacroOracle: latest(bytes32) → (dataKey, scaledValue, observedAt, deliveredAt)
//     (oracle freshness pre-check in 09-02 agent1 route)
//
// NOTE: 'contracts:gen' is intentionally NOT in prebuild (per plan 09-01 must_haves).
// Run `pnpm contracts:gen` manually when updating ABIs.
//
// Monorepo-relative project path: the wagmi foundry plugin resolves `project`
// relative to cwd (packages/frontend). In the monorepo the Foundry project lives at
// packages/backend/contracts, i.e. ../backend/contracts from here.
// That dir contains foundry.toml; artifacts are in out/ (forge build first).
//
// MacroOracle.latest(bytes32) generated from MacroOracle.json:
//   latest(bytes32) → (dataKey: bytes32, scaledValue: int256, observedAt: uint64, deliveredAt: uint64)
// Minimal inline ABI tuple for 09-02 oracle freshness pre-check (fallback if codegen removed):
//   { type:'function', name:'latest', inputs:[{name:'',type:'bytes32'}],
//     outputs:[{name:'dataKey',type:'bytes32'},{name:'scaledValue',type:'int256'},
//              {name:'observedAt',type:'uint64'},{name:'deliveredAt',type:'uint64'}],
//     stateMutability:'view' }

export default defineConfig({
  out: 'lib/contracts/generated.ts',
  plugins: [
    foundry({
      project: '../backend/contracts',
      forge: { build: false },
      include: [
        'MacroHedgeStrategist.sol/MacroHedgeStrategist.json',
        'MacroHedgeExecutor.sol/MacroHedgeExecutor.json',
        'IPanopticData.sol/IPanopticData.json',
        'MacroOracle.sol/MacroOracle.json',
      ],
    }),
    react(),
  ],
})
