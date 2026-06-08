# Stack Research — v2.0 Convex Instrument (long-gamma cCOP/USD)

**Domain:** EVM options / convex-payoff instrument on borrowed Panoptic data model, deployed on Celo against the real cCOP UniV3 pool, tested on a Foundry Celo mainnet-fork.
**Researched:** 2026-06-01
**Confidence:** HIGH on addresses/versions verified below (Uniswap-Celo deploy docs, GeckoTerminal pool API, Panoptic GitHub `v1.0.x`, Reactive docs, npm). MEDIUM on Panoptic V1 lifecycle (newsletters, app banner). All addresses re-verifiable from the cited primary sources before the build gate.

> **Scope contract for this file.** This is a SUBSEQUENT-milestone STACK. It does **not** re-research the already-built+proven foundation (`SomniaAgentConsumer` + `SomniaProbe` + `MacroOracle`, Solidity/Foundry, live on Somnia testnet; keeper-proxy TS on Vercel). It covers **only** the engineering additions to ship the first tradable instrument. Economics + Panoptic feasibility are already settled in `research/macro-markets-colombia/FEASIBILITY-v1.md` (verdict FEASIBLE-WITH-CHANGES) and `INSTRUMENT-v1.md` — not re-litigated here.

---

## Executive finding (read this first — it reshapes the build)

Three verified facts change the build target versus the literal DRAFT/INSTRUMENT framing:

1. **Panoptic V1 is end-of-life.** A vulnerability was found via bug bounty; **deposits & trading are DISABLED**, funds rescued, and the protocol is transitioning to **V2 (a from-scratch redesign, UniV4-era, relaunch ~Dec 2025 / Jan 2026)**. The live V1 pools are NOT usable. (Panoptic Nov/Dec-2025 + Jan-2026 newsletters; `app.panoptic.xyz` banner; Code4rena `2025-12-panoptic-next-core` audit.) → **You cannot "swap in real Panoptic V1" later.** The milestone's chosen path — *borrow the V1 data model into our own contracts* — is therefore the only viable path, and is **correct**. The "clean future swap to real Panoptic" should be reframed as "clean future swap to **Panoptic V2** (UniV4)", a deliberately deferred non-goal.

2. **Panoptic is on Ethereum mainnet + Unichain only — never Celo, never Base.** So there is no Panoptic-on-Celo to fork. This is exactly why we **own the contracts** and deploy them **on Celo against the real cCOP UniV3 pool** ourselves. The fork target is **Celo mainnet** (where cCOP + UniV3 + the pool actually live), **not** an ETH/USDC Panoptic-chain fork. INSTRUMENT-v1's "ETH/USDC stand-in fork" was a hedge written before the cCOP pool was confirmed; the cCOP/USDT pool **exists and is the real target** (see §2), so build the fork against Celo + the real pool from the start.

3. **Reactive Network does NOT support Celo** as an origin/destination chain (supported mainnet set: Ethereum 1, Base 8453, + others; Celo absent). This **resolves the MATH.md open decision**: the x402 payment entry + the Reactive leg must terminate on a **Reactive-supported chain — Base** (x402 is most-active on Base; `@coinbase/x402` facilitator is free on Base). The cCOP pool lives on Celo and is reached as a **cross-chain price/signal**, never relocated — exactly the DRAFT §6 hard constraint. **Celo is the instrument/settlement chain; Base is the x402+Reactive entry chain; they are bridged by signal, not liquidity.**

**Net build shape:** Port the minimal Panoptic-V1 data model into our own Solidity, target Solidity `0.8.18` for the ported pieces (Panoptic's pragma — see §1 compat note), deploy our `LongGammaWrapper` + ported accounting on **Celo** against the real **USDT/cCOP 0.01% UniV3 pool**, test on a **Celo mainnet-fork** in Foundry. x402+Reactive payment topology terminates on **Base**. Delta-hedge data cost is metered via the existing `MacroOracle`/keeper.

---

## Recommended Stack

### Core Technologies

| Technology | Version / Ref | Purpose | Why Recommended |
|------------|---------------|---------|-----------------|
| **Foundry (forge)** | `1.5.1-stable` (already installed; commit `b0a9dd9`) | Build + Celo mainnet-fork tests | Already the project toolchain; fork-test is the milestone's stated test method. No upgrade needed. |
| **Solidity** | `0.8.18` for ported Panoptic pieces; `^0.8.24` for our own new code | Contract language | **Panoptic V1 pins `=0.8.18`** (FeesCalc/SFPM/PanopticMath). Existing repo code is `^0.8.24`/`0.8.28`. Resolve via a **multi-version compile** in `foundry.toml` (see §Version Compatibility) — do NOT blindly bump Panoptic libs to 0.8.24. |
| **panoptic-v1-core** | branch **`v1.0.x`** (no tagged release; 59 commits) — `github.com/panoptic-labs/panoptic-v1-core` | **Source to PORT/BORROW** the data model (not a dependency to deploy) | Canonical V1 source. Pin to a specific commit SHA on `v1.0.x` at build time (record it in the port header). Borrow files, do not `forge install` and deploy V1 (V1 is disabled). |
| **Uniswap v3-core / v3-periphery (Celo)** | live Celo mainnet deploy (addresses §2) | The real underlying pool + NFPM/router/quoter our contracts read/trade against | The cCOP pool is a UniV3 pool on Celo. We read `slot0`/ticks/fees from it and (for the keeper delta-hedge) route swaps via SwapRouter02 / QuoterV2. |
| **reactive-lib** | `forge install Reactive-Network/reactive-lib` — latest tag **`v0.2.0`** (2025-02-20) | Reactive Smart Contract base (AbstractReactive / AbstractCallback / ISystemContract) for the cross-chain leg | Official Solidity lib. Cross-chain leg is **Slice C / deferred** in DRAFT §6 — pull this in only when the x402→Reactive→instrument round-trip is actually built; do not block the core cash-flow on it. |
| **@coinbase/x402** | npm **`2.1.0`** | Payment entry (HTTP-402, USDC) on **Base** | Official Coinbase facilitator; free hosted facilitator on Base. Off-chain/TS, lives next to the existing keeper-proxy. |

### Supporting Libraries

| Library | Version / Ref | Purpose | When to Use |
|---------|---------------|---------|-------------|
| **x402 framework middleware** | `x402-express` or `x402-hono` (track `@coinbase/x402 2.1.0`) | Paywall the deposit/quote endpoint in the keeper service | Only the payment-entry slice. Pick the one matching the keeper-proxy's existing TS framework. |
| **forge-std** | already vendored in `lib/forge-std` | Test stdlib, `vm.createSelectFork`, cheatcodes | Already present; used for the Celo fork harness. |
| **solmate / OZ ERC-4626** | match what Panoptic V1's `CollateralTracker` imports | ERC-4626 collateral vault for the wrapper | The ported `CollateralTracker` is itself the 4626 vault; only add a fresh 4626 base if you write the φ_data capital-remuneration vault separately (INSTRUMENT-v1 §Premium). |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| **forge fmt / forge lint** | formatting + lint (existing `forge-lint: disable` directives already in `MacroOracle.sol`) | Already in use; keep. |
| **bulloak** | `.tree` → Solidity test scaffolding | **NOT currently installed** but the repo already authors `.tree` spec files (`test/spec/*.tree`). The team's evm-TDD workflow is Branching-Tree-Technique. **Recommend installing bulloak** (`cargo install bulloak` or the release binary) to mechanically scaffold tests from the existing `.tree` files — this matches the milestone's "strict evm-tdd" mandate. Pin a version in a tooling note when added. |
| **Celo archive RPC** | fork source | `https://forno.celo.org` (public) or a Celo archive endpoint with a pinned block (see §3). Public Forno may rate-limit deep history — have an Alchemy/Ankr Celo archive key as fallback. |

## Installation

```bash
# --- Port the Panoptic V1 data model (DO NOT deploy V1; copy files into our tree) ---
# Pin a commit on v1.0.x; record the SHA in each ported file's header.
git clone --branch v1.0.x https://github.com/panoptic-labs/panoptic-v1-core.git /tmp/panoptic-v1-core
# minimal data-model set to copy (see §1):
#   contracts/libraries/{PanopticMath,FeesCalc,Math,Constants,Errors,CallbackLib}.sol
#   contracts/types/{LeftRight,LiquidityChunk,TokenId,PositionBalance,Pointer}.sol
#   (study, partial-port) contracts/{SemiFungiblePositionManager,CollateralTracker,PanopticPool}.sol

# --- Cross-chain leg (Slice C; pull in only when building the bridge) ---
cd contracts && forge install Reactive-Network/reactive-lib@v0.2.0

# --- Payment entry (off-chain, in the keeper service, Base) ---
npm install @coinbase/x402@2.1.0 x402-express   # or x402-hono

# --- evm-TDD scaffolding (recommended) ---
cargo install bulloak    # scaffold tests from existing test/spec/*.tree
```

---

## (1) Panoptic V1 — minimal data model to PORT (verified `v1.0.x` file tree)

GitHub: `panoptic-labs/panoptic-v1-core`, branch **`v1.0.x`**. Solidity **`=0.8.18`**. Verified file inventory:

**`contracts/` (root):** `PanopticPool.sol`, `SemiFungiblePositionManager.sol`, `CollateralTracker.sol`, `PanopticFactory.sol`
**`contracts/libraries/`:** `PanopticMath.sol`, `FeesCalc.sol`, `Math.sol`, `Constants.sol`, `Errors.sol`, `CallbackLib.sol`, `InteractionHelper.sol`, `SafeTransferLib.sol`
**`contracts/types/`:** `TokenId.sol`, `LeftRight.sol`, `LiquidityChunk.sol`, `PositionBalance.sol`, `Pointer.sol`
**`contracts/base/`, `contracts/tokens/`:** present (ERC1155 minimal + multicall bases) — not exhaustively enumerated; pull only what the ported set imports.

### The MINIMAL data model (what to actually borrow)

The milestone needs the **accounting/math primitives**, not the full live protocol. Minimal port, in dependency order:

| Piece | File(s) | Why it is in the minimal set | Notes |
|-------|---------|------------------------------|-------|
| **streamia + VEGOID fee math** | `libraries/FeesCalc.sol`, `libraries/PanopticMath.sol` | This IS the "premium accrues by the stream" mechanic the instrument is built on. `FeesCalc` computes up-to-date swap fees per liquidity chunk (= streaming premium); `PanopticMath` carries the VEGOID utilization→streamia-multiplier, TWAP, and position-size math (FEASIBILITY-v1 "residual risk #1" resolves here). | **Primary borrow.** `VEGOID` is a `Constants.sol` parameter feeding `PanopticMath`/`FeesCalc`. |
| **fixed-point + bit math** | `libraries/Math.sol`, `libraries/Constants.sol`, `libraries/Errors.sol` | Hard dependencies of FeesCalc/PanopticMath (mulDiv, sqrt-price, tick math, constants incl. VEGOID). | Copy wholesale; cheap, no live-protocol coupling. |
| **position encoding** | `types/TokenId.sol`, `types/LiquidityChunk.sol`, `types/LeftRight.sol`, `types/PositionBalance.sol` | The packed representation of a long-gamma position (legs, isLong bit, tick range, liquidity, accumulated premium). `isLong=1` long-gamma leg is the instrument's core. | Borrow as the position-accounting schema for the wrapper. |
| **ERC-4626 collateral accounting** | `CollateralTracker.sol` (study + partial-port) | The "deposit upfront as collateral" + commission accounting (FEASIBILITY-v1 change #1). | **Partial-port, not wholesale** — strip the live-protocol coupling; keep the 4626 share/commission/collateral-requirement logic. |
| **position lifecycle (reference, not full port)** | `PanopticPool.sol`, `SemiFungiblePositionManager.sol` | `mintOptions(isLong=1)` / `burnOptions` / `settleLongPremium` semantics define the cash-flow our `LongGammaWrapper` reproduces. | **Read as the spec**; the wrapper reimplements the slice we need against the cCOP UniV3 pool. Full SFPM is heavy (manages all UniV3 positions, multicall, ERC1155) — port only the mint/burn-against-one-pool path. |
| **UniV3 callback plumbing** | `libraries/CallbackLib.sol` | Validates UniV3 mint/swap callbacks when the wrapper LPs into the real pool. | Needed once the wrapper actually touches the live cCOP pool. |

**NOT in the minimal set (do not port):** `PanopticFactory.sol` (we deploy one wrapper per pool, not a factory), `InteractionHelper.sol` (UI/metadata convenience), the full liquidation/forceExercise engine (FEASIBILITY-v1 change #2 — the wrapper must *tolerate* involuntary debits, but v1 need not reimplement Panoptic's liquidator).

**Provenance discipline:** record the exact `v1.0.x` commit SHA + per-file source path in each ported file's header (mirror the `MacroOracle.sol` blob-SHA convention already used in this repo). License: Panoptic V1 is source-available — **check `panoptic-v1-core/LICENSE` before porting** (it is not plain MIT; confirm redistribution terms at the pinned commit). Flagged as a build-gate checklist item.

---

## (2) Uniswap v3 on Celo + the REAL cCOP pool (verified)

**Uniswap v3 — Celo mainnet (chainId 42220)** — from `developers.uniswap.org/.../celo-deployments`:

| Contract | Address |
|----------|---------|
| UniswapV3Factory | `0xAfE208a311B21f13EF87E33A90049fC17A7acDEc` |
| NonfungiblePositionManager | `0x3d79EdAaBC0EaB6F08ED885C05Fc0B014290D95A` |
| SwapRouter02 | `0x5615CDAb10dc425a742d643d949a7F474C01abc4` |
| QuoterV2 | `0x82825d0554fA07f7FC52Ab63c961F330fdEFa8E8` |
| Multicall2 | `0x633987602DE5C4F337e3DbF265303A1080324204` |
| TickLens | `0x5f115D9113F88e0a0Db1b5033D90D4a9690AcD3D` |

**The real cCOP pool — VERIFIED via GeckoTerminal pools API (Celo):**

cCOP token (Mento "Colombian Peso", symbol shown as `cCOP`/`COPm`, EIP-1967 proxy by Mento Labs): **`0x8a567e2ae79ca692bd748ab832081c45de4041ea`**

| Pool | Address | DEX | Fee | Liquidity (reserve USD) | Verdict |
|------|---------|-----|-----|--------------------------|---------|
| **USDT / cCOP** | **`0x2ac5baa668a8a58fd0e302b9896717484fd217b0`** | **Uniswap v3 (Celo)** | **0.01%** | **~$93,679** | **← BUILD TARGET (deepest cCOP pool)** |
| cCOP / USDT | `0x40b3737b8984d14a2e8f96d8c680b2d475719fdf` | Uniswap v3 (Celo) | 0.30% | ~$360 | too thin |
| USDGLO / cCOP | (UniV4 pool id `0x813e…29b7d`) | Uniswap **v4** (Celo) | 0.01% | ~$3,381 | wrong protocol (v4) + thin |

Paired-token addresses: **USD₮ (USDT) `0x48065fbbe25f71c9282ddf5e1cd6d6a887483d5e`**; USDC `0xcebA9300f2b948710d2653dD7B07f33A8B32118C`; USDm/cUSD `0x765DE816845861e75A25fCA122bb6898B8B1282a`.

**Decisive answers to the question:**
- **cCOP/cUSD vs cCOP/USDC: NEITHER exists as a UniV3 pool.** The only real cCOP/USD-stable UniV3 pool is **cCOP/USDT 0.01% at `0x2ac5baa6…17b0`**. Pin **USDT** as the quote stable, not cUSD/USDC. (This corrects the question's cCOP/cUSD-vs-cCOP/USDC framing and INSTRUMENT-v1's "cCOP/USDT" placeholder note — USDT is confirmed.)
- Liquidity is **shallow (~$94k)** — fine for a TE-sized demo position and fork tests; flag as a real-money blocker (already in DRAFT §9 out-of-scope). Re-check `reserve_in_usd` at build time via the GeckoTerminal pool endpoint.

---

## (3) Foundry Celo mainnet-fork config (concrete)

Fork **Celo mainnet** (not an ETH/USDC Panoptic-chain fork — Panoptic isn't on Celo and the cCOP pool is on Celo).

```toml
# foundry.toml — add a celo-fork profile
[profile.default]
src = "src"; out = "out"; libs = ["lib"]

[rpc_endpoints]
celo = "${CELO_RPC_URL}"        # https://forno.celo.org (public) or Alchemy/Ankr Celo archive

# multi-version: ported Panoptic pieces compile at 0.8.18, our code at 0.8.24+
# (see Version Compatibility)
```

```solidity
// test harness — pin the fork block for determinism
uint256 fork = vm.createSelectFork(vm.rpcUrl("celo"), CELO_FORK_BLOCK);
```

**Addresses to pin in the fork harness (Celo, chainId 42220):**

| Constant | Value |
|----------|-------|
| `UNIV3_FACTORY` | `0xAfE208a311B21f13EF87E33A90049fC17A7acDEc` |
| `NFPM` | `0x3d79EdAaBC0EaB6F08ED885C05Fc0B014290D95A` |
| `SWAP_ROUTER02` | `0x5615CDAb10dc425a742d643d949a7F474C01abc4` |
| `QUOTER_V2` | `0x82825d0554fA07f7FC52Ab63c961F330fdEFa8E8` |
| `CCOP` | `0x8a567e2ae79ca692bd748ab832081c45de4041ea` |
| `USDT_CELO` | `0x48065fbbe25f71c9282ddf5e1cd6d6a887483d5e` |
| `CCOP_USDT_POOL` (UniV3, 0.01%) | `0x2ac5baa668a8a58fd0e302b9896717484fd217b0` |

**Fork block:** pin a **recent finalized Celo block** at plan-phase (e.g. resolve `cast block-number --rpc-url $CELO_RPC_URL` and lock a value a few hundred blocks back). Record it as `CELO_FORK_BLOCK` so streamia-accrual tests (advance blocks, then assert residual) are reproducible. **Caveat:** Celo migrated to an Ethereum L2 (Optimism-stack) — confirm the chosen archive RPC serves the pinned historical block; public Forno may prune deep history, so a dedicated archive key is the safe default. (Verify at build; flagged MEDIUM.)

---

## (4) Reactive Network + x402 — payment topology for MATH.md

**Resolved open decision (MATH.md / INSTRUMENT-v1 "x402 entry chain"): entry = BASE, not Celo.** Reason: Reactive supports Base (8453) but **not Celo**; x402's free Coinbase facilitator is on Base. The MATH.md diagram (`x402 (Base) → Reactive → mainnet`) is therefore correct as-drawn; the sibling `abrigo-x402` being "Celo" is a *different leg* (K_D) and does not force this instrument's entry onto Celo.

**Reactive Network (verified `dev.reactive.network`):**

| Chain | Chain ID | Callback Proxy address |
|-------|----------|------------------------|
| Base | 8453 | `0x0D3E76De6bC44309083cAAFdB49A088B8a250947` |
| Ethereum | 1 | `0x1D5267C1bb7D8bA68964dDF3990601BDB7902D76` |
| Reactive (own L1) | 1597 | `0x8888888888888888888888888888888888888888` |
| **Celo** | 42220 | **NOT SUPPORTED** — no Reactive callback proxy |

- **Solidity lib:** `forge install Reactive-Network/reactive-lib@v0.2.0` (latest tag, 2025-02-20; 100% Solidity). Provides the reactive-contract bases (AbstractReactive / AbstractCallback / system-contract interfaces).
- **Reactive mainnet RPC:** `https://mainnet-rpc.rnk.dev/`.
- **Topology consequence:** the cross-chain leg connects **Base ↔ Reactive ↔ (Ethereum or our instrument chain)**. The **cCOP pool stays on Celo** and enters as a *price/signal* (read off the Celo pool / `MacroOracle`), bridged in — never relocated (DRAFT §6 hard constraint). If the instrument contracts deploy on Celo (where the pool is), Reactive cannot deliver callbacks there directly; the bridge terminates on a Reactive-supported chain and the Celo price is carried as data. **This is a real architectural constraint to surface to the roadmapper.**

**x402 (verified npm + Celo/Base docs):**
- `@coinbase/x402` **2.1.0** (official facilitator). Framework middleware: `x402-express` / `x402-hono` / `x402-next`.
- x402 V2 (launched ~Jan 2026) is chain-agnostic (170+ EVM chains incl. Celo *for payments*), but **Base is the most-active network with a free Coinbase facilitator** — use Base for the entry to align with Reactive support.
- All x402 wiring is **off-chain/TS**, co-located with the existing keeper-proxy — no new on-chain surface for the payment entry itself.

**Slice C is DEFERRED (DRAFT §6 / PROJECT out-of-scope):** the cross-chain round-trip is the last slice. Do **not** block the core cash-flow (deposit → mint long-gamma on cCOP/USDT fork → streamia accrual → data-weighted residual) on Reactive. Pull `reactive-lib` in only when building the bridge.

---

## (5) evm-TDD tooling already present

| Tool | Status | Action |
|------|--------|--------|
| **forge** | `1.5.1-stable` installed (commit `b0a9dd9`) | None — current; far past forge 1.0. Question's "forge 1.5" confirmed. |
| **forge-std** | vendored in `contracts/lib/forge-std` | None. |
| **`.tree` BTT specs** | present (`test/spec/{SomniaAgentConsumer.*,MacroOracle}.tree`) | The team already writes Branching-Tree-Technique specs by hand. |
| **bulloak** | **NOT installed** (`which bulloak` → not found) | **Recommend adding** `cargo install bulloak` to mechanically scaffold tests from the `.tree` files. The repo's evm-TDD workflow *implies* bulloak; installing it closes the loop with "strict evm-tdd". |
| **MockPlatform** | present (`test/mocks/MockPlatform.sol`) | Reuse the mock pattern for a `MockUniV3Pool` / fork-vs-mock split in the new tests. |

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Port Panoptic **V1** data model | Use Panoptic **V2** (UniV4) | V2 is the live future, but it's a from-scratch UniV4 redesign just relaunching; its public source/audit is fresh (`2025-12-panoptic-next-core`). Borrow V1's *settled* math now; treat "swap to V2" as the deferred clean-swap goal. |
| Target **cCOP/USDT 0.01%** UniV3 pool | ETH/USDC mainnet-fork stand-in (INSTRUMENT-v1) | Only if the cCOP/USDT pool proves unusable on fork (e.g. RPC can't serve it). It can — the pool is real and indexed — so build against it directly. |
| **Base** for x402+Reactive entry | Celo entry | Never for *this* instrument's Reactive leg — Celo has no Reactive callback proxy. Celo is the pool/settlement chain only. |
| **reactive-lib** for cross-chain | CCIP / LayerZero / Hyperlane | If Reactive's chain support or testnet availability blocks the round-trip (DRAFT §10 open decision). Reactive is the DRAFT-stated default; reassess only if it can't reach the needed chains. |
| **bulloak** scaffolding | hand-written tests | Hand-written is fine for one-off tests; bulloak pays off given the repo's existing `.tree` discipline. |

## What NOT to Use / NOT to Add (anti-scope-creep)

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **Deploying / `forge install`-ing live Panoptic V1** | V1 deposits & trading are DISABLED (security incident); it's being sunset for V2. | Port the V1 *source files* into our own tree; deploy our own contracts. |
| **PanopticFactory + full liquidation/forceExercise engine** | Out of the minimal data model; heavy; v1 wrapper only needs to *tolerate* involuntary debits, not run a liquidator. | Single-wrapper deploy; monitor health, handle involuntary close defensively. |
| **Full SemiFungiblePositionManager port** | Manages *all* UniV3 positions (multicall, ERC1155, every pool) — far more than one long-gamma leg on one pool needs. | Reimplement only the mint/burn-against-the-cCOP-pool path; read SFPM as the spec. |
| **cCOP/cUSD or cCOP/USDC pool** | Neither exists as a UniV3 pool on Celo. | The real **cCOP/USDT 0.01%** pool `0x2ac5baa6…17b0`. |
| **An on-chain SOMI/USD or cCOP/USD oracle adapter** | Out of scope (PROJECT/DRAFT §9); price + CPI come from existing `MacroOracle`/TE/keeper. | Reuse `MacroOracle.fetchUint/fetchInt` (proven) + keeper. |
| **Reactive bridge in the first slice** | Slice C is the *last* slice; blocking core cash-flow on cross-chain is the classic scope trap. | Build deposit→mint→accrue→residual on the Celo fork first; add Reactive last. |
| **Bumping Panoptic libs to 0.8.24** to "match the repo" | Risks silently changing math (checked-arithmetic / opcode differences); Panoptic audited at `=0.8.18`. | Multi-version compile (§Version Compatibility); keep ported pieces at 0.8.18. |
| **Fhenix/FHE for any key/secret** | Already settled in `MacroOracle.sol` header — FHE does no network I/O; wrong tool. | Existing keeper-proxy pattern. |
| **Mainnet IAgentRequester / Somnia-leg econometrics** | Parallel PARKED track; explicitly out of this milestone. | Leave `STATE-M1-donor-transfer-2026-06-01.md` untouched. |

---

## Version Compatibility

| Component | Pin | Notes |
|-----------|-----|-------|
| Ported Panoptic libs | `solc 0.8.18` | Panoptic V1 pragma `=0.8.18`. Use Foundry per-contract version or a separate compile profile so these don't get force-bumped. |
| Our new instrument code | `^0.8.24` (repo norm; `MacroOracle` uses 0.8.28) | New `LongGammaWrapper`, premium splitter, vault. |
| Multi-version compile | `foundry.toml` `[profile.default] auto_detect_solc = false` + explicit version OR split the ported libs into a sub-project compiled at 0.8.18 and consumed as artifacts/interfaces | **Plan-phase decision.** Cleanest: keep ported Panoptic `libraries/`+`types/` in their own directory pinned to 0.8.18; expose pure-function libs (no storage) so version mixing is safe at the bytecode/interface boundary. |
| forge | `1.5.1` | Compatible with multi-version compiles and `vm.createSelectFork`. |
| reactive-lib | `v0.2.0` | Confirm its own pragma against our compile matrix when Slice C lands. |
| Uniswap v3 Celo | live deploy | Standard UniV3 `=0.7.6` core; we only call it via interfaces from our 0.8.x code (ABI boundary, no shared compile). |

---

## Open items to verify at build-gate (flagged, not blocking research)

1. **Panoptic V1 LICENSE** at the pinned `v1.0.x` commit — confirm redistribution terms before porting (source-available ≠ MIT). HIGH priority gate item.
2. **Celo fork RPC archive depth** — confirm the chosen endpoint serves the pinned `CELO_FORK_BLOCK` (Celo's L2 migration may have pruned legacy history on public Forno). MEDIUM.
3. **cCOP/USDT pool live liquidity** — re-pull `reserve_in_usd` at build (was ~$94k 2026-06-01); shallow but adequate for fork + TE-sized demo. LOW.
4. **Reactive-supported terminus for the Celo-priced signal** — since Celo has no callback proxy, confirm the exact chain where the instrument contracts deploy vs. where Reactive delivers, and how the Celo pool price is carried across. MEDIUM (architectural, for the roadmapper).
5. **bulloak version pin** when installed. LOW.

---

## Sources

- `github.com/panoptic-labs/panoptic-v1-core` (branch `v1.0.x`) — contracts/libraries/types file tree, `=0.8.18` pragma, CREATE3 factory `0x000000000000b361194cfe6312EE3210d53C15AA` — HIGH
- Panoptic Nov/Dec-2025 + Jan-2026 newsletters; `app.panoptic.xyz` banner; Code4rena `2025-12-panoptic-next-core` — V1 disabled / V2 (UniV4) transition — MEDIUM
- `developers.uniswap.org/contracts/v3/reference/deployments/celo-deployments` — Uniswap v3 Celo addresses (Factory/NFPM/SwapRouter02/QuoterV2/Multicall2/TickLens) — HIGH
- GeckoTerminal pools API (`api.geckoterminal.com/api/v2/search/pools?query=cCOP&network=celo`) — cCOP `0x8a56…41ea`, USDT/cCOP 0.01% pool `0x2ac5baa6…17b0` ($93.7k), USDT `0x4806…3D5e` — HIGH
- CeloScan `0x8A567e2aE79CA692Bd748aB832081C45de4041eA` — Mento "Colombian Peso" (cCOP) token, EIP-1967 proxy — HIGH
- `dev.reactive.network` (origins-and-destinations, reactive-library) — callback proxies (Base `0x0D3E…0947`, Ethereum `0x1D52…2D76`, Reactive 1597 `0x8888…8888`), `forge install Reactive-Network/reactive-lib@v0.2.0`, Celo NOT supported — HIGH
- npm `@coinbase/x402` 2.1.0; `docs.celo.org/build-on-celo/build-with-ai/x402`; x402.org V2 launch — payment entry, Base most-active — HIGH
- Local: `forge --version` → 1.5.1-stable; `which bulloak` → absent; `contracts/test/spec/*.tree` present; `contracts/foundry.toml`, `MacroOracle.sol`, `SomniaAgentConsumer.sol` — HIGH (direct inspection)

---
*Stack research for: convex long-gamma cCOP/USD instrument (borrowed Panoptic data model, Celo fork)*
*Researched: 2026-06-01*
