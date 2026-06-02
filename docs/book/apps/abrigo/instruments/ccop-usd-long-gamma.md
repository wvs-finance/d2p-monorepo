# cCOP/USD Long-Gamma Hedge

**Instrument:** Cobertura larga gamma cCOP/USD / cCOP/USD Long-Gamma Hedge
**Status:** Simulated (Base fork only — not deployed on mainnet)
**Live route:** `/apps/abrigo/instruments/ccop-usd-long-gamma/8453`

## What this instrument is

The cCOP/USD Long-Gamma instrument is a convex hedge on borrowed Panoptic V2 liquidity, designed to provide positive-gamma payoff exposure to Colombian peso / US dollar FX movements. The underlying pool is a MockCcop/USDC Uniswap V3 fork seeded in abrigo-somnia fork tests.

The instrument uses a long-options (long-gamma) position: the holder earns convex payoff as the FX rate moves away from the seed rate in either direction. The payoff shape is schematic — it is illustrative of positive-gamma behavior, not a contract-derived settlement function.

## Provenance tiers

This instrument carries three provenance tiers, applied per field:

**fork-fixture** — Values observed directly in abrigo-somnia fork test files (e.g., `CcopUsdcPool.t.sol`, `PanopticDataSeam.fork.t.sol`). These are deterministic test artifacts, not market data. Example fields: `forkBlock` (46700000), `tickSpacing` (10), `seededLiquidity` (1e24 wei).

**spec** — Values that are specification-level placeholders from Phase-8 abrigo-somnia plans. They will be replaced with real on-chain values once those plans ship. Example fields: `premium`, `streamia`, `commission`, `dataCost` (all currently null — rendered as em-dash in the UI, never 0).

**schematic** — The payoff curve shown in the diagram is illustrative (parabolic convex shape). It is NOT a contract-derived settlement function. The schematic tier signals that no contract has been deployed and no settlement logic has been verified on-chain.

There is no `fork-verified` tier: no instrument has been verified against a deployed contract as of this writing.

## Schematic payoff

The payoff diagram renders a smooth parabolic curve centered at the pool's seed human rate (4000 for MockCcop/USDC). The formula is:

```
payoff(price) = max(curvature × (price − centerPrice)² − premium, 0)
```

where `premium` is 0 (spec-tier placeholder). This shape illustrates positive gamma (∂²V/∂S² > 0) without asserting a specific contract strike or slope. No `strikeRef` or `currentPriceRef` is passed to the diagram — fabricating a current price is forbidden by anti-fishing discipline (CROSS-09).

## Cash-flow waterfall

The cash-flow breakdown follows the corrected residual formula from abrigo-somnia 08-RESEARCH §residual Pattern 7:

```
residual = max(survivingCollateral − wrapperMeteredDataCost, 0)
```

**Streamia** and **commission** are NOT subtracted here — they are already netted into `survivingCollateral` by the pool's share-burn mechanism. The waterfall shows them as informational rows labeled "ya neteado en el colateral sobreviviente" (already netted into surviving collateral).

`dataCost` is null (Phase 9 unbuilt) and renders as an em-dash. All null fields render as em-dash, never 0.

## Fork-only / mock caveat

- **Chain:** Base mainnet fork pinned at block 46700000
- **Tokens:** MockCcop (not real cCOP) + USDC
- **Pool:** Test-seeded mock pool — 1e6 ether seeded liquidity, not market liquidity
- **Deployment:** None — this instrument is not deployed on any mainnet or testnet
- **Wallet:** Read-only (no transactions possible — the contract does not exist)

The UI shows a SIMULADO / SIMULATED badge above the fold to make the fork-only status visible at 360px viewport width. The WalletPanel is locked in READ_ONLY state: no connect/switch affordance is shown.

## JSON-LD (agent surface)

The page emits a `FinancialProduct` JSON-LD block. The simulated branch omits `strike`, `slope`, and `address` — these fields would be fabricated numerics (anti-fishing, AGENT-10 / CROSS-09). Instead, the JSON-LD carries:

- `simulated: "true"` — signals to agents that this is not a deployed instrument
- `provenance: "fork-fixture: test-seeded mock pool, not market data"` — cites the data source
