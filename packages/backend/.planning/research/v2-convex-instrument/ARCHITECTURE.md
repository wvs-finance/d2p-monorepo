# Architecture Research — v2.0 Convex Instrument (cCOP/USD long-gamma)

**Domain:** On-chain convex macro-hedge instrument (Panoptic long-gamma) built on a TE-fed agent oracle, with data-cost-weighted reimbursement
**Researched:** 2026-06-01
**Confidence:** MEDIUM-HIGH (existing Somnia oracle layer is built + live-proven; Panoptic v1 surface verified against docs/repo; cross-chain placement and CPI→FX linkage carry explicit LOW-confidence flags)

> Scope note for the roadmapper. This file answers the integration question:
> **how do the new convex-instrument components fit the already-built MacroOracle / keeper-proxy /
> SomniaAgentConsumer, and what is the build order?** It does NOT re-derive the economics
> (see `RESEARCH.md`, `INSTRUMENT-v1.md`) or re-litigate feasibility (see `FEASIBILITY-v1.md`,
> verdict FEASIBLE-WITH-CHANGES). New-vs-modified components, the borrowed-Panoptic-data-model
> boundary (port / stub / defer), the cross-chain v1 placement decision, and a dependency-ordered
> build sequence are the deliverables.

---

## Standard Architecture

### System Overview

The instrument is **three layers stacked on the existing async-request oracle**. The bottom layer (oracle + keeper) is already built and live on Somnia testnet; the middle (sizing + position ownership) and top (settlement + reimbursement + capital remuneration) are new.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  SETTLEMENT / REIMBURSEMENT LAYER          (NEW — Celo or fork, v1)            │
│  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────────────────┐  │
│  │ LongGammaWrapper │ │ PremiumSplitter   │ │ CapitalRemunerationVault     │  │
│  │ owns the long;   │ │ π_pan + μ_LP +    │ │ (ERC-4626) — recoups $199/mo │  │
│  │ deposit→mint→    │ │ φ_data routing    │ │ TE capital via φ_data slice  │  │
│  │ accrue→burn→     │ └────────┬──────────┘ └──────────────┬───────────────┘  │
│  │ reimburse        │          │  φ_data                   │ shares           │
│  └───────┬──────────┘          └───────────────────────────┘                  │
│          │ owns positionIdList + 4626 collateral shares                        │
├──────────┼─────────────────────────────────────────────────────────────────────┤
│  POSITION / SIZING LAYER                   (NEW + BORROWED data model)         │
│  ┌──────────────────┐        ┌─────────────────────────────────────────────┐ │
│  │ PositionBuilder  │ sizes  │ BORROWED Panoptic data model (our impl):     │ │
│  │ s_t → notional,  │───────▶│ PanopticPool · CollateralTracker(4626) · SFPM │ │
│  │ strike, leg enc. │ mint   │ over the REAL cCOP UniV3 pool (Celo) / proxy │ │
│  └───────┬──────────┘        └─────────────────────────────────────────────┘ │
│          │ s_t  (CPI surprise)            ▲ delta                              │
│          │                                │ (off-Panoptic trades, metered)    │
│          │                        ┌───────┴─────────────┐                     │
│          │                        │ DeltaHedgeKeeper     │ (NEW, off-chain)    │
│          │                        │ external; meters     │                     │
│          │                        │ data+exec cost       │                     │
├──────────┼────────────────────────┴─────────────────────┴─────────────────────┤
│  ORACLE LAYER                              (BUILT + LIVE — reuse, extend)      │
│  ┌──────────────────────────────┐    ┌──────────────────────────────────────┐│
│  │ MacroOracle                  │    │ keeper-proxy (Vercel)                  ││
│  │  is SomniaAgentConsumer      │───▶│  key-hidden TE fetch → {value,unit,ts} ││
│  │  TECatalog: usdcop, inflation│    │  te/fx/usdcop · te/colombia/inflation  ││
│  │  fetchUint/fetchInt callback │◀───│  json-fetch agent (0.03 SOMI) consensus││
│  └──────────────────────────────┘    └──────────────────────────────────────┘│
│       (Somnia testnet 50312; PLATFORM 0x037Bb9…6776; AGENT 1317…7713)          │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | New / Modified / Built | Responsibility | Typical Implementation |
|-----------|------------------------|----------------|------------------------|
| `SomniaAgentConsumer` | **BUILT (reuse as-is)** | deposit+forward, auth/replay callback (CEI), `receive()` rebates, owner `sweep()` | abstract base, 18/18 tests |
| `MacroOracle` | **MODIFIED** (add CPI surprise: consensus input + σ + `s_t` emit; today emits raw scaled value only) | catalog-keyed TE fetch → `latest[dataKey]`; supplies **both** the USD/COP mark (`te/fx/usdcop`) and the CPI level (`te/colombia/inflation`) | inherits consumer; `requestMacro(dataKey)` |
| keeper-proxy | **MODIFIED** (add EME-consensus route; CPI route exists) | key-hidden TE fetch + shared cache + (new) consensus fetch; meters delta-hedge data cost | Vercel fn, 31/31 tests |
| `PositionBuilder` | **NEW** | given `s_t` + premium deposit, compute notional + strike width + Panoptic leg/tokenId encoding, call `mintOptions(isLong=1)` | pure sizing → mint adapter |
| `LongGammaWrapper` | **NEW** | owns the Panoptic long on the user's behalf; deposit collateral → mint → hold over epoch → burn → compute residual; tolerates early/involuntary debit (liquidation/forceExercise) | contract owns `positionIdList` + 4626 shares |
| Panoptic data model (`PanopticPool`/`CollateralTracker`/`SFPM` analogues) | **BORROWED** (our impl of the data model over the real cCOP UniV3 pool; swap-to-real-Panoptic seam) | option accounting, collateral (4626), streamia accrual, settle-at-burn | port subset of `panoptic-v1-core`; see boundary table below |
| `PremiumSplitter` | **NEW** | decompose premium into `π_panoptic + μ_LP + φ_data`; route φ_data to the vault | pure split + transfer |
| `CapitalRemunerationVault` | **NEW** | ERC-4626 vault that recoups the $199/mo TE capital from the φ_data slice; "capital remuneration" | OZ ERC-4626 |
| `DeltaHedgeKeeper` | **NEW (off-chain)** | external delta-hedge of the naked long-gamma (Panoptic has no hedging primitive); meters the per-rebalance data+exec cost fed into the residual | keeper script + on-chain cost sink |

---

## Recommended Project Structure

```
contracts/src/
├── SomniaAgentConsumer.sol     # BUILT — abstract base (reuse unchanged)
├── MacroOracle.sol             # MODIFIED — add surprise route (s_t)
├── SomniaProbe.sol             # BUILT — keep as regression probe
├── instrument/                 # NEW — the convex instrument
│   ├── LongGammaWrapper.sol    #   owns the long; deposit→mint→burn→reimburse
│   ├── PositionBuilder.sol     #   s_t → notional/strike → mintOptions
│   ├── PremiumSplitter.sol     #   π_panoptic + μ_LP + φ_data
│   ├── CapitalRemunerationVault.sol  # ERC-4626 capital remuneration
│   └── interfaces/
│       └── IPanopticData.sol   #   the BORROWED data-model surface (swap seam)
├── panoptic-borrowed/          # BORROWED — our impl of the Panoptic data model
│   ├── PanopticPoolLite.sol    #   mintOptions/burnOptions accounting subset
│   ├── CollateralTrackerLite.sol # ERC-4626 collateral + streamia accrual
│   └── SFPMLite.sol            #   semi-fungible position / UniV3 liquidity adapter
└── interfaces/
    └── ISomniaAgents.sol       # BUILT — agent interfaces

keeper/                         # MODIFIED — add EME-consensus route + hedge-cost meter
subgraphs/                      # (M1 track, untouched here)
```

### Structure Rationale

- **`instrument/` vs `panoptic-borrowed/` split is the swap seam.** Everything in `instrument/` is ours forever; everything in `panoptic-borrowed/` is a stand-in that gets deleted when a real Panoptic-on-Celo deployment exists. `IPanopticData.sol` is the single interface both honor — `LongGammaWrapper` and `PositionBuilder` import the *interface*, never the borrowed concrete, so swapping `panoptic-borrowed/*` for real Panoptic addresses is a deployment-config change, not a code change. **This is the borrow-now/swap-later seam (Q4).**
- **`MacroOracle` stays in `src/`, not `instrument/`** — it's shared oracle infrastructure, and the M1 econometric track may also read it. The surprise math is an *additive* route, not a rewrite.
- **The vault is its own file** because "capital remuneration" is an independent economic concern (recoup the fixed TE subscription) with its own ERC-4626 invariants, separable from option accounting.

---

## Data Flow

### The instrument lifecycle (the load-bearing flow)

```
                       MacroOracle (Somnia testnet — BUILT/MODIFIED)
                       ├─ te/fx/usdcop        → USD/COP mark      ┐
                       └─ te/colombia/inflation → CPI level       │  (+ EME consensus, σ)
                                                                  ▼
                                                     s_t = (CPI_actual − consensus)/σ
   user ─deposit(PREMIUM)──────────────────────────────────────┐
                                                                ▼
                                                       PositionBuilder  (NEW)
                                                       sizes notional + strike from s_t
                                                                │ mintOptions(isLong=1)
                                                                ▼
                                          LongGammaWrapper  ───▶ Panoptic data model (BORROWED)
                                          owns positionIdList    over real cCOP UniV3 pool
                                          + 4626 collateral      │
                                                                 │ streamia accrues each block
                                                                 │ (settled lazily at burn)
   DeltaHedgeKeeper (NEW, off-chain) ──── delta-rebalance ───────┤
   meters data+exec cost → on-chain sink                         │
                                                                 ▼  burn / force-exercise
   reimbursement ◀── residual = deposit − streamia − commission
                                       − Σ(hedge data+exec cost) + intrinsic(if ITM)
   PremiumSplitter (NEW): of the deposit, φ_data slice → CapitalRemunerationVault (ERC-4626)
```

### Two MacroOracle reads, two roles (Q2)

The same built oracle supplies **both** instrument inputs — they are different catalog keys, different roles, no new fetch mechanism:

1. **Settlement mark — `te/fx/usdcop`** (catalog key `fx/usdcop`, already seeded, decimals 2, `Uint`). This is the **continuous underlying** Panoptic settles on. In v1 it is also the off-chain cross-rate stand-in for the cCOP/USD pool price (RESEARCH §3: USD/COP is rank-1 settlement target). `fetchUint` path — proven.
2. **Sizing signal — `te/colombia/inflation`** (catalog key `co/inflation-rate`, already seeded, decimals 2, live-proven at value 568). This is the **scheduled monthly surprise** clock. The *new* piece is the **consensus input** (BanRep EME) and **σ** so the oracle can emit `s_t = (CPI_actual − consensus)/σ`, not just the raw CPI level. Today MacroOracle emits the raw scaled value only — the consensus/σ plumbing is the one real MODIFY.

> **Decision flagged for plan-phase:** does the surprise arithmetic live on `MacroOracle` (Somnia) or in `PositionBuilder` (after bridging raw values)? Recommendation: **keep the raw CPI level + a separately-fetched consensus on MacroOracle; compute `s_t` in `PositionBuilder`** so the oracle stays a thin catalog reader and the sizing math lives next to the mint. This minimizes the cross-chain payload to two scalars (level, consensus) + a σ param.

### State management

- `LongGammaWrapper` holds per-position state: `positionIdList`, deposited collateral (4626 shares), accrued-streamia checkpoint, accumulated hedge-cost sink, epoch open/close blocks. **It must tolerate involuntary state change** (liquidation / `forceExercise` debits the position before the user's epoch ends) — the residual computation reads live position health, never assumes voluntary burn.
- `CapitalRemunerationVault` holds standard 4626 share accounting; φ_data deposits + DATA_PAYMENT deposits both mint shares.

---

## The Borrowed Panoptic Data Model — port / stub / defer boundary (Q1, Q4)

Verified against `panoptic-labs/panoptic-v1-core` and Panoptic V1.1 docs: the real surface is `PanopticPool.mintOptions(positionIdList, ...)` with up-to-4-leg encoded `tokenId`s (`isLong` per leg; `isLong=1` removes UniV3 liquidity = buying optionality), `CollateralTracker` is an **ERC-4626** vault paying commission + premia + intrinsic, `SemiFungiblePositionManager` (SFPM) manages the UniV3 liquidity chunks. Premium ("streamia") accrues per block but **settles lazily at burn / `settleLongPremium` / force-exercise** — there is no per-block draw. Deployed on **Ethereum mainnet + Unichain** (Base/Celo NOT confirmed — this is why v1 borrows).

| Real Panoptic piece | v1 decision | Rationale |
|---|---|---|
| `PanopticPool.mintOptions` / `burnOptions` accounting | **PORT (minimal)** — `PanopticPoolLite` implements only the long-leg mint/burn + position registry the wrapper needs | The wrapper must own a real `positionIdList` and burn it; a full stub can't exercise the residual math |
| `CollateralTracker` (ERC-4626 collateral + streamia accrual) | **PORT (minimal)** — `CollateralTrackerLite` is a 4626 vault with block-indexed streamia accrual settled at burn | The whole reimbursement formula (`deposit − streamia − …`) depends on real accrual; faking it defeats the demo |
| `SemiFungiblePositionManager` (UniV3 liquidity) | **STUB over the real cCOP UniV3 pool** — `SFPMLite` adds/removes liquidity on the actual Celo cCOP pool (or fork proxy pool); does NOT re-implement Panoptic's full tokenId tick math | The point is to trade the *real* pool; full SFPM tick-encoding is unneeded for a single long-gamma leg |
| `VEGOID` / spread-multiplier streamia formula | **DEFER to plan-phase read** — port the exact formula from `PanopticMath`/`FeesCalc` only when accrual is wired | FEASIBILITY-v1 residual risk; not needed for the first deposit→mint→burn skeleton |
| Liquidation / `forceExercise` | **STUB the trigger, REAL the debit path** — wrapper handles an involuntary close, but v1 does not implement Panoptic's full health-factor liquidation engine | Wrapper correctness requires the involuntary-debit code path; the *adversary* triggering it can be a test harness |
| Multi-leg / short legs / spreads | **DEFER** — v1 is a single long-gamma leg | INSTRUMENT-v1 scope is one long leg |

**Swap-to-real-Panoptic seam (Q4):** `instrument/interfaces/IPanopticData.sol` declares `mintOptions` / `burnOptions` / collateral-share / streamia-read signatures **matching the real Panoptic ABI**. `panoptic-borrowed/*` implements that interface today; real Panoptic (when on Celo, or on the chosen fork) satisfies the same ABI. Swap = repoint a deployment address + delete `panoptic-borrowed/`. **Build the interface to the real ABI from day one** — do not let the borrowed impl's convenience leak into the interface, or the swap breaks.

---

## Cross-Chain Boundary — v1 placement decision (Q3)

The architecture spans up to four chains in the maximalist `MATH.md` sketch: **x402 on Base → Reactive Network → Ethereum mainnet (PositionBuilder + Panoptic)**, while the existing oracle is on **Somnia testnet** and the cCOP pool lives on **Celo**. This is too much surface for a v1 and three of the four placements are unverified-or-impossible today.

### Hard constraints (from DRAFT §6, FEASIBILITY-v1 #4)

- **Cross-chain carries messages/value/signals, NOT pool liquidity.** The cCOP UniV3 pool cannot be relocated; Panoptic's underlying must live where the pool is. So cCOP/USD enters Panoptic's chain as a *price/oracle signal*, not as the literal underlying — until a Panoptic-on-Celo deployment exists (none does).
- **No Celo/cCOP Panoptic deployment exists.** Panoptic is on Ethereum mainnet + Unichain only.
- **MacroOracle is on Somnia testnet; the cCOP pool is on Celo.** These are different chains — any single-chain v1 has to bridge at least the oracle scalar.

### Recommended v1 placement: **single-chain Celo fork, oracle scalar bridged-or-mocked**

| Option | Verdict | Why |
|---|---|---|
| Full 4-chain (Base x402 → Reactive → mainnet Panoptic + Somnia oracle + Celo price) | **DEFER** | Reactive testnet availability across all hops is unverified; this is the M3+ composite-bridge milestone per PROJECT.md "Out of Scope" |
| Single-chain **Celo fork**, real cCOP pool, oracle scalar **pushed in as a signed value or mocked** | **RECOMMENDED v1** | Puts the instrument where the real cCOP pool is; borrowed Panoptic deploys on the fork against the real pool; the `s_t` scalar arrives as a bridged/mocked input. The instrument's core cash-flow (deposit→mint→accrue→burn→residual) is provable here with zero cross-chain trust risk. |
| Single-chain **Somnia**, instrument co-located with MacroOracle | **REJECT** | No cCOP UniV3 pool on Somnia; defeats the "real pool" requirement |
| ETH/USDC mainnet-fork (FEASIBILITY-v1 step 1) | **v1 SKELETON only** | Proves the wrapper mechanics on a deep liquid pool before cCOP; but cCOP/USD is the actual target, so it's a stepping stone, not the v1 endpoint |

**Decision:** v1 = **deposit→mint→burn→residual skeleton on an ETH/USDC mainnet-fork first** (FEASIBILITY-v1 sequencing), then **re-target to the real cCOP UniV3 pool on a Celo fork**, with the `s_t` surprise scalar arriving as a **mocked/bridged input** (the MacroOracle→Celo bridge is itself deferred to the cross-chain milestone). **The cross-chain message bus (Reactive/CCIP/LZ) is explicitly DEFERRED** — the instrument must prove its on-chain cash-flow single-chain before any bridge is wired. This is consistent with PROJECT.md (Reactive bridge is M3+) and DRAFT §9 (Panoptic-on-Celo port out of scope).

> **Flagged for the roadmapper:** the `MacroOracle (Somnia) → instrument (Celo fork)` scalar bridge is the one genuinely cross-chain dependency. v1 mocks it (inject `s_t` directly in tests); a later milestone wires Reactive/CCIP. Do NOT let v1 block on bridge selection.

---

## Architectural Patterns

### Pattern 1: Interface-pinned swap seam (borrow-now / swap-later)

**What:** Consumers (`LongGammaWrapper`, `PositionBuilder`) depend only on `IPanopticData`, whose signatures match the real Panoptic ABI. The borrowed impl and real Panoptic are interchangeable behind it.
**When to use:** Whenever a v1 stands in a real dependency that doesn't exist yet on the target chain.
**Trade-offs:** Forces ABI fidelity up front (good); risks over-abstracting if the real ABI shifts between Panoptic versions (mitigate by pinning to V1.1, the deployed version).

### Pattern 2: Async request→callback consumer (reuse, do not re-pattern)

**What:** The existing `SomniaAgentConsumer` deposit-forward-callback pattern (DRAFT §3.5, NON-NEGOTIABLE). MacroOracle's surprise extension stays inside this pattern — a new catalog route + a new callback handler branch, not a new mechanism.
**When to use:** Every on-chain TE read.
**Trade-offs:** Forwarding the whole `msg.value` (over-fund = perAgentBudget) is a Somnia-specific footgun already solved in the base; new consumers must over-fund or get `TimedOut`.

### Pattern 3: Over-funded cap, lazy settlement, tolerate involuntary debit

**What:** The user's upfront deposit is an over-funded cap, not a precise quote. Streamia settles lazily at burn; the wrapper must handle early/involuntary close (liquidation, forceExercise) debiting before the user's epoch ends.
**When to use:** Any wrapper owning a Panoptic position on a user's behalf.
**Trade-offs:** Residual math reads live position health rather than assuming a clean voluntary burn — more code paths, but the only correct model for Panoptic's lazy settlement.

---

## Build Order (dependency-respecting, evm-TDD feature-by-feature)

The dependency chain the quality gate names — **oracle → sizing → mint → settlement → reimbursement → cross-chain** — drives this order. Each feature ships with its forge BTT tree + fuzz invariants before the next starts (strict evm-tdd, DRAFT §3.5 paradigm).

| # | Feature | New / Modified | Depends on | Exit criterion (TDD) |
|---|---------|----------------|------------|----------------------|
| **1** | **Borrowed Panoptic data-model skeleton** (`IPanopticData` + `PanopticPoolLite` + `CollateralTrackerLite` + `SFPMLite`) on **ETH/USDC mainnet-fork** | NEW (borrowed) | — (foundational) | fork test: mint long leg → 4626 collateral posted → burn → collateral returned. Interface matches real Panoptic V1.1 ABI. |
| **2** | **`LongGammaWrapper` core cash-flow** — deposit collateral → `mintOptions(isLong=1)` → hold → `burnOptions` → compute residual (streamia + commission only, hedge-cost = 0) | NEW | #1 | fork test: `residual == deposit − streamia − commission (+ intrinsic)`; advance blocks to accrue streamia; assert. Tolerates forceExercise (test harness triggers). |
| **3** | **`PremiumSplitter` + `CapitalRemunerationVault`** — split deposit into π_panoptic + μ_LP + φ_data; φ_data → ERC-4626 vault | NEW | #2 (needs a deposit to split) | unit + fuzz: split invariant (Σ slices == deposit); 4626 deposit/withdraw share invariants; φ_data accrual recoups a parametrized monthly cost. |
| **4** | **MacroOracle surprise route** — add EME-consensus fetch + σ param; expose CPI level + consensus so `s_t` is computable | **MODIFIED** (+ keeper-proxy consensus route) | existing oracle (built) | Somnia-testnet live: `te/colombia/inflation` level + new consensus route both land via callback; `fetchUint` path reused. Regression: SomniaProbe still green. |
| **5** | **`PositionBuilder` sizing** — `s_t = (CPI − consensus)/σ` → notional + strike width → leg/tokenId encoding → call wrapper's mint | NEW | #2 (mint target) + #4 (s_t inputs) | unit + fuzz: monotone sizing in \|s_t\|; strike-width bounds; `mintOptions` called with correct `isLong=1` leg. v1 may inject `s_t` directly (oracle bridge mocked). |
| **6** | **`DeltaHedgeKeeper` + on-chain hedge-cost sink** — external delta-rebalance; meter per-rebalance data+exec cost; feed into wrapper residual | NEW (off-chain + on-chain sink) | #2 (position to hedge) | keeper records metered cost to the sink; wrapper residual now subtracts `Σ hedge cost`; fork test asserts the full residual formula. Hedge trade itself may be mocked in v1 (FEASIBILITY-v1 step 3). |
| **7** | **Re-target to real cCOP UniV3 pool (Celo fork)** — swap the borrowed SFPM's pool target from ETH/USDC to the real cCOP pool | config/deploy change (seam pays off) | #1–#6 green on ETH/USDC | Celo-fork test: same wrapper mints/burns against the real cCOP pool; document the basis. |
| **8** | **Cross-chain scalar bridge** (MacroOracle Somnia → instrument Celo) | NEW | #5 + #7 | **DEFERRED to a later milestone** (Reactive/CCIP selection). v1 ships with `s_t` mocked/injected. |

**Critical-path note for the roadmapper:** features #1–#3 are pure mainnet-fork work with **no dependency on the Somnia oracle** — they can start immediately and in parallel with #4 (the oracle modify). The first true join is #5 (`PositionBuilder` needs both a mint target from #2 and `s_t` inputs from #4). #7 (cCOP re-target) is gated on the *whole* fork stack being green on ETH/USDC first. #8 is out of v1.

---

## Anti-Patterns

### Anti-Pattern 1: Letting the borrowed Panoptic impl's API leak into `IPanopticData`

**What people do:** Shape the interface around what `PanopticPoolLite` finds convenient.
**Why it's wrong:** The swap-to-real-Panoptic seam (#7, and a future Panoptic-on-Celo) breaks if the interface doesn't match the real V1.1 ABI.
**Do this instead:** Author `IPanopticData` against the **real `panoptic-v1-core` V1.1 ABI** first; make the borrowed impl conform to it, not the reverse.

### Anti-Pattern 2: Forwarding only the floor to the agent platform

**What people do:** Send `getRequestDeposit()` exactly when calling MacroOracle.
**Why it's wrong:** perAgentBudget = 0 → runners skip → `TimedOut` (the live-proven Somnia footgun). The base already forwards the whole `msg.value`; new consumers must **over-fund** (floor + pᵢ·subSize).
**Do this instead:** Reuse `SomniaAgentConsumer._sendRequest` unchanged; over-fund per agent class from the price table, never a hardcoded constant.

### Anti-Pattern 3: Assuming voluntary burn in the residual math

**What people do:** Compute residual only on the happy-path `burnOptions`.
**Why it's wrong:** Panoptic can liquidate / `forceExercise` the position mid-epoch, debiting collateral before the user closes. A burn-only model strands or mis-reimburses.
**Do this instead:** Residual reads live position state; the over-funded deposit is a cap, settlement is lazy, involuntary close is a first-class path.

### Anti-Pattern 4: Blocking v1 on the cross-chain bridge

**What people do:** Wire Reactive/CCIP before the instrument's on-chain cash-flow is proven.
**Why it's wrong:** Bridge selection + testnet availability is unverified and is the M3+ milestone; it would gate the entire instrument on an orthogonal infra question.
**Do this instead:** Mock/inject `s_t` single-chain; prove deposit→mint→accrue→burn→residual; defer the bridge.

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| TradingEconomics (CPI level, USD/COP, **new: EME consensus**) | via keeper-proxy (key-hidden) → json-fetch agent → MacroOracle callback | consensus route is the one new fetch; cache mutualizes the $199/mo fixed cost |
| Real cCOP UniV3 pool (Celo) | borrowed `SFPMLite` adds/removes liquidity on the live pool; via Celo fork in v1 | pool cannot be relocated cross-chain (DRAFT §6); v1 forks Celo |
| Panoptic V1.1 (future, when on Celo/target chain) | satisfies `IPanopticData`; swap deploy address, delete `panoptic-borrowed/` | mainnet + Unichain today; Celo absent — hence borrow |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `PositionBuilder` ↔ borrowed Panoptic | via `IPanopticData` only | the swap seam — never import the concrete |
| `LongGammaWrapper` ↔ `CollateralTrackerLite` | 4626 deposit/withdraw + streamia read | wrapper owns the shares on the user's behalf |
| MacroOracle (Somnia) ↔ instrument (Celo) | `s_t` scalar — **mocked in v1**, bridged later | the only real cross-chain edge; deferred |
| `DeltaHedgeKeeper` (off-chain) ↔ wrapper | metered hedge cost → on-chain sink → residual | hedging is external (not a Panoptic primitive) |

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Existing oracle layer (reuse/extend) | **HIGH** | live-proven on Somnia testnet (inflation 568, usdcop seeded, fetchUint/fetchInt); 31/31 + 18/18 tests |
| Panoptic v1 data-model surface (mintOptions, 4626 CollateralTracker, SFPM, lazy streamia) | **HIGH** | verified against `panoptic-v1-core` repo + V1.1 docs |
| Panoptic deployed chains (mainnet + Unichain; NOT Celo) | **HIGH** | confirmed — drives the borrow decision |
| Borrowed-data-model port boundary (which pieces port/stub/defer) | **MEDIUM** | exact streamia/VEGOID formula deferred to a plan-phase source read |
| Cross-chain v1 placement (single-chain Celo fork, scalar mocked) | **MEDIUM** | decided + flagged; Reactive testnet availability unverified, hence deferred |
| CPI-surprise → FX-move linkage | **LOW** | explicitly an empirical assumption to validate (FEASIBILITY-v1, INSTRUMENT-v1); not a proven transfer function |

## Gaps for plan-phase / later milestones

- Exact streamia spread-multiplier / `VEGOID` formula — read `PanopticMath`/`FeesCalc` in `panoptic-v1-core` V1.1 before wiring feature #6's accrual.
- Stand-in pair choice for the fork skeleton (ETH/USDC confirmed deep) and the documented basis vs cCOP.
- Where `s_t` arithmetic lives (recommendation: PositionBuilder) — plan-phase lock.
- σ_CPI estimation (rolling realized vs EME dispersion) + `k` convexity threshold — candidate calibration input from the parked M1 donor-transfer track.
- Cross-chain layer selection (Reactive vs CCIP/LZ/Hyperlane) + Somnia↔Celo testnet reachability — the deferred #8 milestone.

## Sources

- `panoptic-labs/panoptic-v1-core` (GitHub) — PanopticPool.mintOptions, CollateralTracker ERC-4626, SFPM; V1.1 — https://github.com/panoptic-labs/panoptic-v1-core
- Panoptic V1.1 docs — CollateralTracker (ERC-4626; commission/premia/intrinsic) — https://panoptic.xyz/docs/contracts/V1.1/contract.CollateralTracker
- Panoptic V1.1 deployment chains (Ethereum mainnet + Unichain) — https://defillama.com/protocol/panoptic-v1.1
- Internal: `FEASIBILITY-v1.md` (verdict FEASIBLE-WITH-CHANGES; cash-flow correction; 4 required changes), `INSTRUMENT-v1.md` (components, premium split, four-killers), `RESEARCH.md` (hedge-target ranking), `DRAFT.md` §5/§6/§9 (slices, cross-chain constraint, out-of-scope), `MATH.md` (maximalist chain sketch), `contracts/src/{MacroOracle,SomniaAgentConsumer,SomniaProbe}.sol` (built layer)

---
*Architecture research for: v2.0 convex instrument (cCOP/USD long-gamma on borrowed Panoptic data model)*
*Researched: 2026-06-01*
