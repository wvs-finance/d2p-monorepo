/**
 * lib/apps/abrigo/fixture.ts
 *
 * Fork-fixture constants for the cCOP/USD Long-Gamma instrument.
 * All on-chain integers are encoded as bigint-as-string to survive JSON round-trips
 * without precision loss (JS numbers max out at Number.MAX_SAFE_INTEGER ≈ 9e15;
 * Solidity uint256 values routinely exceed that).
 *
 * Provenance tiers:
 *   'fork-fixture' — value observed directly in an abrigo-somnia fork test file
 *   'spec'         — value is a spec-level placeholder; the Phase-N plan that owns it
 *                    will replace it with a real on-chain value.
 *
 * capturedFrom: "abrigo-somnia Phase-7 fork tests @ HEAD (hand-authored, not exported)"
 */

// ---------------------------------------------------------------------------
// Generic wrapper
// ---------------------------------------------------------------------------

export interface FixtureValue<T> {
  value: T
  tier: 'fork-fixture' | 'spec'
  source: string
  note?: string
}

// ---------------------------------------------------------------------------
// LongGammaFixture shape — spec §4.1
// ---------------------------------------------------------------------------

export interface LongGammaFixture {
  capturedFrom: string
  forkBlock: FixtureValue<string>
  pair: {
    token0: string
    token1: string
  }
  pool: {
    humanRate: FixtureValue<number>
    tickSpacing: FixtureValue<string>
    seededLiquidity: FixtureValue<string>
  }
  chunk: {
    strike: FixtureValue<string>
    width: FixtureValue<string>
  }
  cashflow: {
    premium: FixtureValue<number | null>
    streamia: FixtureValue<number | null>
    commission: FixtureValue<number | null>
    dataCost: FixtureValue<number | null>
  }
}

// ---------------------------------------------------------------------------
// Concrete fixture — cCOP/USD Long-Gamma
// ---------------------------------------------------------------------------

export const CCOP_USD_LONG_GAMMA_FIXTURE: LongGammaFixture = {
  capturedFrom: 'abrigo-somnia Phase-7 fork tests @ HEAD (hand-authored, not exported)',

  forkBlock: {
    value: '46700000',
    tier: 'fork-fixture',
    source: 'contracts/test/instrument/CcopUsdcPool.t.sol L27 BASE_FORK_BLOCK',
    note: 'Base mainnet fork block pinned for deterministic fork tests',
  },

  pair: {
    token0: 'MockCcop',
    token1: 'USDC',
  },

  pool: {
    humanRate: {
      value: 4000,
      tier: 'fork-fixture',
      source: 'contracts/test/instrument/helpers/PoolKeyLib.sol L19 HUMAN_RATE',
      note: 'Author-chosen sqrtPriceX96 seed; ordering sanity check in [3000,5000]; NOT a market rate',
    },
    tickSpacing: {
      value: '10',
      tier: 'fork-fixture',
      source: 'contracts/test/instrument/helpers/PoolKeyLib.sol L25 TICK_SPACING',
      note: 'tick spacing for the cCOP/USDC pool in fork tests; bigint-as-string',
    },
    seededLiquidity: {
      value: '1000000000000000000000000',
      tier: 'fork-fixture',
      source: 'contracts/test/instrument/CcopUsdcPool.t.sol L33 (1e6 ether)',
      note: 'Test-seeded mock pool liquidity, not market liquidity; bigint-as-string (1e6 ether = 1e24 wei)',
    },
  },

  chunk: {
    strike: {
      value: '2000',
      tier: 'fork-fixture',
      source:
        'contracts/test/instrument/PanopticDataSeam.fork.t.sol L41 STRIKE_OFFSET, L73 strike computation',
      note:
        '+2000-tick OTM offset from the live fork tick, tickSpacing(10)-aligned: ' +
        '((currentTick+2000)/10)*10. No static absolute — depends on fork tick. ' +
        'Fork-test artifact to clear InvalidTickBound.',
    },
    width: {
      value: '2',
      tier: 'fork-fixture',
      source: 'contracts/test/instrument/PanopticDataSeam.fork.t.sol; 08-RESEARCH Pattern 2',
      note: 'width=2 (2×tickSpacing=20 ticks) to clear InvalidTickBound; fork alignment artifact',
    },
  },

  cashflow: {
    // Spec-tier placeholders — no on-chain literal exists until Phase 8 plans ship.
    // value: null means "unknown; render as em-dash". NEVER fabricate a number.
    premium: {
      value: null,
      tier: 'spec',
      source: 'spec §4.4; Phase-8 plans (not yet on-chain)',
      note: 'Deposit amount per position open; specified in Phase-8 plans; not yet on-chain',
    },
    streamia: {
      value: null,
      tier: 'spec',
      source: 'spec §4.4; Phase-8 plans (not yet on-chain)',
      note: 'Streaming premium accrued per block; already netted into survivingCollateral by share-burn (08-RESEARCH §residual)',
    },
    commission: {
      value: null,
      tier: 'spec',
      source: 'spec §4.4; Phase-8 plans (not yet on-chain)',
      note: 'Protocol commission; already netted into survivingCollateral by share-burn (08-RESEARCH §residual)',
    },
    dataCost: {
      value: null,
      tier: 'spec',
      source: 'spec §4.4; Phase 9 (unbuilt)',
      note: 'Metered data-cost; Phase 9 unbuilt → em-dash',
    },
  },
}

// ---------------------------------------------------------------------------
// Lookup map — keyed by fixtureKey on SimulatedInstrument
// ---------------------------------------------------------------------------

export const FIXTURES: Record<string, LongGammaFixture> = {
  'ccop-usd-long-gamma': CCOP_USD_LONG_GAMMA_FIXTURE,
}
