# Phase 9: Premium split + data-cost reimbursement — Research

**Researched:** 2026-06-02
**Domain:** Premium decomposition (`π_panoptic + μ_LP + φ_data`), ERC-4626 capital-remuneration vault for a mutualized fixed $199 data cost, per-position incremental hedge-data metering, and a conservation invariant that no data cost is double-counted — all wiring into the Phase-8 `LongGammaWrapper` residual seam.
**Confidence:** HIGH on the wrapper seam + ERC-4626 stack + conservation-test mechanics (verbatim source reads of the live `contracts/` tree); MEDIUM on the exact units/FX reconciliation (USD-fixed $199 vs the wrapper's two-token native-decimal residual — the planner must pick the denomination convention, options laid out below).

## Summary

Phase 8 shipped a complete, fork-proven `LongGammaWrapper` whose residual already has the **exact hook Phase 9 plugs into**: `_costOf()` (`LongGammaWrapper.sol` L322-325) returns `(uint256 cost0, uint256 cost1)` from an external `ICostMeter`, and `claimResidual()` (L259-277) deducts those costs per-token from surviving collateral before paying the user. In v1 the meter is the zero address ⇒ `(0,0)` ⇒ residual == surviving. **Phase 9 does NOT touch the wrapper source.** It deploys a concrete `ICostMeter` (the stubbed per-position hedge meter) and wires it at construction via the already-implemented `setCostMeter(address)` (L128-133, owner-gated, frozen before `Open`). The "metered hedge-data cost wired into the wrapper from Phase 8" that ROADMAP SC-4 demands is satisfied by exactly this: a meter that returns a per-position **incremental** cost, never the $199 constant.

The phase has three disjoint pieces under one conservation law. **(1) `PremiumSplitter`** — a pure decomposition `premium = π_panoptic + μ_LP + φ_data` with a fuzz invariant `Σ slices == premium` (FEE-01). This is arithmetic with a remainder-routing convention (one slice absorbs the rounding dust so the sum is exact). **(2) `CapitalRemunerationVault`** — an OZ-5.0.2 `ERC4626` subclass (the base is already reachable at `@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol` via the v4-core-nested OZ, no new install) that receives the **mutualized fixed $199 φ_data** once per epoch and recoups it across the epoch's premiums; standard 4626 deposit/withdraw/share invariants hold under fuzz (FEE-02). **(3) The conservation invariant** `invariant_dataCostConserved`: `Σ φ_data (vault, mutualized) + Σ hedgeMeteredCost (per-position, incremental) == totalDataSpend` — the **$199 is charged once to the vault, never N times to N positions** (FEE-02/FEE-03, the phase EXIT criterion / pitfall P5).

**Primary recommendation:** Build three new contracts (`PremiumSplitter`, `CapitalRemunerationVault is ERC4626`, and a concrete `HedgeDataMeter is ICostMeter`) + an `IHedgeMeter`-shaped extension so the live HEDGE-01 keeper drops in later. Wire the `HedgeDataMeter` into a fresh `LongGammaWrapper` deployment via `setCostMeter` BEFORE deposit. Keep the $199 in a single source-of-truth constant that lives ONLY in the vault/splitter path and is grep-guarded OUT of any per-position deduction. The conservation invariant is the gate; design its handler to drive both ledgers (one vault deposit per epoch + N per-position meterings) and assert the sum against an independent `totalDataSpend` accumulator.

<user_constraints>
## User Constraints

No `*-CONTEXT.md` exists in `.planning/phases/09-premium-split-data-cost-reimbursement/` (the directory is empty). The binding constraints come from `CLAUDE.md` (domain non-negotiables), `ROADMAP.md` Phase 9 (Goal + 4 Success Criteria + Pitfall P5), `REQUIREMENTS.md` (FEE-01..03), the Phase-8 `08-CONTEXT.md` decisions, and `research/macro-markets-colombia/INSTRUMENT-v1.md` (the φ_data design authority). They are reproduced verbatim where they constrain Phase 9 scope.

### Locked Decisions (hard non-negotiables)
- **P5 — the two data costs are DISJOINT ledger line items.** Mutualized φ_data (fixed $199 → vault, *decreasing* per-position as volume grows) vs per-position *incremental* hedge metering. The `199` constant NEVER appears in a per-position deduction. The conservation test `invariant_dataCostConserved` is the phase EXIT criterion. (ROADMAP Phase 9 Notes.)
- **v1 meters a STUBBED hedge.** Live delta-hedge is HEDGE-01 (deferred). The metering interface MUST be built so the live keeper drops in later. (ROADMAP Phase 9 Notes; REQUIREMENTS HEDGE-01.)
- **`ICostMeter` is FROZEN — do not change its signature.** `cost(address position) → (uint256 cost0, uint256 cost1)` in native decimals; zero-address ⇒ (0,0); wired pre-`Open` via `setCostMeter`, frozen at first deposit (anti-griefing). Phase 9 deploys the real meter and wires it at construction — NO wrapper signature change. (`ICostMeter.sol` L11-15; `08-CONTEXT.md` §v1 cost; `LongGammaWrapper.sol` L128-133.)
- **No double-count (RESEARCH Pattern 7, Phase 8).** Streamia + commission are ALREADY netted into the wrapper's 4626 share balance by the pool's `settleBurn`; the wrapper's residual deducts ONLY `_costOf()`. The metered hedge cost is the ONLY wrapper-side deduction. (`08-CONTEXT.md`; `LongGammaWrapper.sol` L254-256.)
- **Every cost line carries a units/FX column.** Dimensional-analysis discipline — the repo bakes native decimals into prices (`PoolKeyLib` 1e12 gap, L21-22) and annotates token0/token1 native dp throughout. (`CLAUDE.md` §Domain non-negotiables; ROADMAP SC-3 "every cost line carries a units/FX column".)
- **Unit of account `X = USD`.** The $199 is USD. The wrapper residual is two-token native decimals (token0/token1 = cCOP 18dp / USDC 6dp, runtime-ordered). The reconciliation convention MUST be explicit. (`CLAUDE.md`; `08-CONTEXT.md` §v1 cost "native decimals, never mixed".)
- **Swap seam intact + evm-tdd Iron Law.** New contracts reach the pool only via `IPanopticData`, collateral only via `IERC4626`/`IERC20`; `.tree` committed BEFORE `.sol`; bulloak 0.9.2 same-dir full-stem co-location. (`08-CONTEXT.md`; STATE 08-*.)
- **Scope:** hackathon demo, testnet/fork ONLY, never production (BUSL borrow permitted). Base fork `BASE_FORK_BLOCK = 46700000`, `--fork-url "$BASE_RPC_URL"`. Branch `feat/macro-hedge-agent`. (REQUIREMENTS; STATE.)

### Claude's Discretion
- The premium denomination (single-token USD-proxy scalar vs two-token) and which slice absorbs the rounding remainder so `Σ slices == premium` is exact.
- The vault's underlying asset token (a USD-proxy: USDC, or the φ_data slice's token) and the share-accounting / recoupment mechanics for "recoups across the epoch's premiums."
- The `IHedgeMeter` extension shape (beyond the locked `ICostMeter.cost` it implements) that lets the live HEDGE-01 keeper drop in — e.g. a `recordHedgeFill(...)` / cumulative-incremental accumulator.
- The conservation-invariant handler design (how it drives the epoch's vault deposit + N per-position meterings) and the `totalDataSpend` accumulator shape.
- Whether the `$199` and `rowcost·rows` live as Solidity constants, immutables, or config — subject to P5 (never in a per-position path).

### Deferred Ideas (OUT OF SCOPE for Phase 9)
- Live delta-hedge keeper (HEDGE-01) — v1 meters a STUBBED hedge; only the drop-in interface is built.
- `MacroOracle` surprise + `PositionBuilder` sizing (Phase 10, SIZE-01/02) — the premium VALUE is an input to Phase 9, not computed here.
- x402 entry (PAY-01) + Reactive cross-chain DATA_PAYMENT→vault routing (XCHAIN-01) — the vault receives φ_data directly in v1; the cross-chain DATA_PAYMENT edge is deferred.
- Real vault yield / capital remuneration beyond fee accrual (INSTRUMENT-v1 §Open decisions "Vault underlying / yield").
- `μ_LP` no-arbitrage pricing (INSTRUMENT-v1 §Open "Premium fairness") — v1 `μ_LP` is a passed-in slice, not a priced no-arb markup.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description (REQUIREMENTS.md) | Research Support (what enables it) |
|----|------------------------------|------------------------------------|
| **FEE-01** | `PremiumSplitter` decomposes a premium into `π_panoptic + μ_LP + φ_data` | A pure splitter contract/library with a remainder-routing convention so `Σ slices == premium` is exact under fuzz. No new dependency — arithmetic + OZ `Math.mulDiv` for proportional splits (reachable at `@openzeppelin/contracts/utils/math/Math.sol`). The φ_data slice is the fixed mutualized $199/E[premiums] (INSTRUMENT-v1 L46-52); `π_panoptic`/`μ_LP` are passed-in or derived inputs. |
| **FEE-02** | `CapitalRemunerationVault` (ERC-4626) receives `φ_data` (mutualized fixed $199) with a no-double-count conservation invariant vs the per-position hedge cost | OZ-5.0.2 `ERC4626` base reachable at `@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol` (`ERC4626.sol` L48 `abstract contract ERC4626 is ERC20, IERC4626`; constructor `(IERC20 asset_)` L77). The $199 deposits ONCE per epoch; `totalAssets`/share accounting recoups it across the epoch's premiums. Conservation invariant `invariant_dataCostConserved` asserts the disjoint-ledger sum. |
| **FEE-03** | User reimbursement = surviving collateral − streamia − commission − metered hedge-data cost (data-cost-weighted residual) | The wrapper ALREADY computes this: `claimResidual()` deducts `_costOf()` (the metered hedge cost) from `convertToAssets(balanceOf(wrapper))` (surviving, already net of streamia+commission via `settleBurn`) — `LongGammaWrapper.sol` L268-272. Phase 9 deploys the concrete `ICostMeter` returning the per-position INCREMENTAL cost and wires it via `setCostMeter` (L128-133). A fork test asserts the full residual with `Σ hedge cost` wired in. |
</phase_requirements>

## The Phase-8 Wrapper Residual Seam (THE load-bearing dependency)

**This is the single most important section: the EXACT formula, function, and storage Phase 9 wires into — cited file:line against the live source.**

### The metered-cost hook is already built and frozen

```solidity
// contracts/src/instrument/LongGammaWrapper.sol L321-325
/// @notice Per-token external cost: zero-address meter ⇒ (0,0); otherwise delegate to the meter.
function _costOf() internal view returns (uint256 c0, uint256 c1) {
    if (address(costMeter) == address(0)) return (0, 0);
    return costMeter.cost(address(this));
}
```

```solidity
// contracts/src/instrument/interfaces/ICostMeter.sol L11-15  (FROZEN — do not change)
interface ICostMeter {
    function cost(address position) external view returns (uint256 cost0, uint256 cost1);
}
```

### The residual formula `_costOf` feeds into (`claimResidual`, L259-277)

```solidity
// contracts/src/instrument/LongGammaWrapper.sol L268-272 — the WIRE-IN point
(uint256 cost0, uint256 cost1) = _costOf();                 // (0,0) for zero-address meter (v1)
uint256 surv0 = ct0.convertToAssets(IERC20(address(ct0)).balanceOf(address(this)));
uint256 surv1 = ct1.convertToAssets(IERC20(address(ct1)).balanceOf(address(this)));
uint256 residual0 = surv0 > cost0 ? surv0 - cost0 : 0;     // per-token max(.,0); NATIVE decimals, never mixed
uint256 residual1 = surv1 > cost1 ? surv1 - cost1 : 0;
// then _redeemCapped(ct0, residual0) / _redeemCapped(ct1, residual1) pay `user`
```

So the FEE-03 residual is, per token:
```
residual_i = max( convertToAssets(balanceOf(wrapper))_i  −  meteredHedgeCost_i , 0 )
```
where `convertToAssets(balanceOf(wrapper))_i` is **already net of streamia + commission** (the pool's `settleBurn` burned those shares — `08-CONTEXT.md` §v1 cost / RESEARCH Pattern 7). The ONLY wrapper-side deduction is `_costOf()` = `meteredHedgeCost`. **This is exactly the ROADMAP SC-4 formula** (`surviving − streamia − commission − metered hedge-data cost`): streamia+commission are subtracted *implicitly* by the share burn; the metered hedge cost is subtracted *explicitly* by `_costOf`.

### The wiring entrypoint (already implemented, owner-gated, pre-Open frozen)

```solidity
// contracts/src/instrument/LongGammaWrapper.sol L128-133
function setCostMeter(address meter) external {
    if (msg.sender != owner) revert NotOwner();
    if (state != State.Uninitialized) revert WrongState();   // frozen at first deposit
    costMeter = ICostMeter(meter);
    emit CostMeterSet(meter);
}
```

### How to add the metered term WITHOUT breaking Phase 8 tests

- **Do NOT edit `LongGammaWrapper.sol`.** All 30/30 unit + 2/2 fuzz Phase-8 tests assume the zero-address default. The Phase-8 invariants explicitly assume `_costOf() == (0,0)` (the `max(surv-cost,0) <= surv` tautology is *deliberately avoided* in Phase 8; STATE 08-07 decision). A non-zero meter would change residual magnitude — so Phase-9 fork tests deploy a **fresh wrapper** with the meter wired, leaving the Phase-8 suite (zero-meter) untouched.
- **The metered cost is INCREMENTAL and per-position.** `costMeter.cost(wrapper)` returns the cumulative incremental hedge-data cost for THIS position only. It MUST NOT return the $199 (that is the vault line — P5). A grep-guard like the Phase-8 `panoptic-borrowed==0` / `SPREAD_MULTIPLIER==0` guards should assert `199` (and the φ_data constant name) appears in ZERO per-position meter code paths.
- **Storage to extend:** none on the wrapper. The meter is a standalone contract; the wrapper reads it through the frozen `ICostMeter` seam. The wrapper's `user`/`positionTokenId`/`deposited*`/`lastSurviving*` ledger (L57-76) is untouched.

> **Subtlety the planner MUST honor:** the invariant `invariant_residualNeverExceedsHoldings` (Phase 8) asserts `paid_i <= surviving_i + 1`. With a non-zero meter, `residual_i = max(surv_i − cost_i, 0) <= surv_i` STILL holds (the `max(.,0)` floor + subtraction can only *reduce* the payout). So a non-zero meter is invariant-safe by construction. The NEW Phase-9 fork test must additionally assert the residual *moved by exactly* `cost_i` vs the zero-meter baseline (proving the metered term actually bit, not a vacuous deduction).

## Standard Stack

No new on-chain libraries. Everything is already vendored/remapped. **Verify before writing:** the OZ ERC4626 base is reachable via the existing `@openzeppelin/` remapping (which points at `lib/v4-core/lib/openzeppelin-contracts/`, OZ **5.0.2** — verified `package.json` version + file present).

### Core
| Library | Version | Purpose | Why standard / reachable path |
|---------|---------|---------|-------------------------------|
| OZ `ERC4626` base | 5.0.2 (vendored via v4-core) | `CapitalRemunerationVault is ERC4626` | The canonical audited 4626 with virtual-shares inflation defense (`_decimalsOffset`, since v4.9). `@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol` (verified present; `ERC4626.sol` L48/L77). |
| OZ `ERC20` base | 5.0.2 | Vault share token (ERC4626 extends ERC20) | `@openzeppelin/contracts/token/ERC20/ERC20.sol` (verified present). |
| OZ `IERC4626` / `IERC20` | 5.0.2 | The wrapper's collateral seam (already used) | `@openzeppelin/contracts/interfaces/IERC4626.sol` — the proven Phase-7/8 path. |
| OZ `Math` | 5.0.2 | `mulDiv` for proportional premium splits + φ_data weighting (`$199 · w_i / Σw`) without overflow | `@openzeppelin/contracts/utils/math/Math.sol` (verified present). |
| OZ `Ownable` | 5.0.2 | Optional vault/meter admin (epoch roll, $199 deposit auth) | `@openzeppelin/contracts/access/Ownable.sol` (verified present). Or keep the inline-owner pattern the wrapper uses (`LongGammaWrapper.sol` L51/L129) for seam consistency. |
| `ICostMeter` (local, FROZEN) | — | The wrapper→meter seam | `contracts/src/instrument/interfaces/ICostMeter.sol` — implement, do not modify. |

### Supporting
| Library | Version | Purpose | When to use |
|---------|---------|---------|-------------|
| `forge-std` | pinned (Phase 7) | `StdInvariant`, fuzz handlers, `assertEq`/`bound` | The conservation + 4626 fuzz tests. |
| `bulloak` | 0.9.2 | `.tree` → test scaffold (Iron Law) | Every new contract's tree committed first. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| OZ `ERC4626` (5.0.2, vendored) | `solmate/mixins/ERC4626.sol` (present) or `solady/tokens/ERC4626.sol` (present) | Solmate's 4626 has NO inflation-attack defense (no virtual shares) — for a demo it's fine, but OZ 5.0.2's `_decimalsOffset` is the safer default and matches the OZ `IERC4626` seam the wrapper already speaks. **Recommend OZ.** Mixing solmate's `ERC20` with OZ's `IERC4626` would be a type-identity hazard (the same class that bit Phase-7 settler imports). |
| Bumping OZ to 5.6.1 (latest) | a fresh `forge install` | The reachable 5.0.2 is sufficient and avoids a dependency-tree churn (5.0.2 vs 5.6.1 ERC4626 API is identical: constructor, `_decimalsOffset`, `totalAssets`, `_deposit`/`_withdraw` hooks unchanged). **Stay on the vendored 5.0.2** to keep the seam consistent. |
| A bespoke share ledger | OZ `ERC4626` `convertToAssets`/`convertToShares` | Hand-rolled share math is exactly the "Don't Hand-Roll" trap — rounding-direction bugs + inflation attacks. |

**Installation:** none. `forge build` / `forge test --fork-url "$BASE_RPC_URL"` from `contracts/`.

**Version verification (done):** OZ reachable via `@openzeppelin/` = 5.0.2 (`lib/v4-core/lib/openzeppelin-contracts/package.json`); `ERC4626.sol`, `ERC20.sol`, `Math.sol`, `Ownable.sol` all present at the remapped paths. Latest OZ is 5.6.1 (2025-02-27) — NOT recommended for install; 4626 API is stable across 5.x.

## Architecture Patterns

### Recommended layout
```
contracts/
├── src/instrument/
│   ├── PremiumSplitter.sol               # FEE-01: premium → (π_panoptic, μ_LP, φ_data), Σ == premium
│   ├── CapitalRemunerationVault.sol      # FEE-02: is ERC4626; receives the mutualized $199 φ_data once/epoch
│   ├── HedgeDataMeter.sol                # FEE-03: is ICostMeter; per-position INCREMENTAL hedge cost (stubbed v1)
│   └── interfaces/
│       ├── IHedgeMeter.sol               # the HEDGE-01 drop-in extension (recordHedgeFill / cumulative accumulator)
│       └── ICostMeter.sol                # FROZEN — implemented by HedgeDataMeter, NOT modified
└── test/instrument/
    ├── PremiumSplitter.split.tree/.t.sol            # FEE-01 fuzz: Σ slices == premium
    ├── CapitalRemunerationVault.vault.tree/.t.sol   # FEE-02 fuzz: 4626 deposit/withdraw/share invariants
    ├── DataCostConservation.invariants.tree/.t.sol  # invariant_dataCostConserved (the EXIT criterion)
    └── LongGammaWrapper.meteredResidual.tree/.t.sol # FEE-03 fork: residual w/ ICostMeter wired in (fresh wrapper)
```
> bulloak co-location rule (STATE 08-*): each `.tree` lives same-dir as its `<stem>.t.sol`. Iron Law: tree committed BEFORE impl. The conservation test names the ROADMAP invariant `invariant_dataCostConserved` BY HAND (bulloak scaffolds `test_When…`; the Phase-8 precedent for hand-writing the `invariant_*`-named file applies — STATE 08-01/08-07).

### Pattern 1: Premium split with exact-sum remainder routing (FEE-01)
**What:** Decompose `premium` into three slices so `π_panoptic + μ_LP + φ_data == premium` with NO rounding leak. Compute two slices, route the remainder to the third (or compute φ_data as the fixed mutualized figure first, then split the rest).
**When:** the FEE-01 splitter. The fuzz invariant `Σ slices == premium` fails if any `mulDiv` rounding drops a wei without a remainder sink.
```solidity
// Source: pattern; OZ Math.mulDiv @ @openzeppelin/contracts/utils/math/Math.sol
// φ_data is the fixed mutualized slice (computed in the vault/splitter, USD-denominated convention):
uint256 phiData = phiDataForEpoch();              // = ceil($199 / E[premiums]) + marginal rows — the MUTUALIZED line
uint256 piPanoptic = Math.mulDiv(premium - phiData, piWeightBps, 10_000);
uint256 muLP = (premium - phiData) - piPanoptic;  // REMAINDER sink ⇒ Σ == premium EXACTLY
// invariant: piPanoptic + muLP + phiData == premium  (no dust leak)
```
**Anti-pattern:** computing all three via independent `mulDiv` and asserting equality — the three roundings will under-sum by up to 2 wei, false-reding the split invariant. ALWAYS have one remainder sink.

### Pattern 2: ERC-4626 vault recoups the fixed $199 across the epoch (FEE-02)
**What:** `CapitalRemunerationVault is ERC4626`. The TE capital provider deposits the $199 ONCE per epoch (mints shares against the data-capital). The φ_data slice of each premium flows INTO the vault as additional assets (raising `totalAssets`, so the depositor's shares appreciate = "capital remuneration"). "Recoups across the epoch's premiums, decreasing per-position as volume grows" is mechanical: φ_data-per-premium = `$199 / E[premiums]`, so the more premiums sold, the smaller each slice — the SUM still recoups the one $199.
**Source:** OZ `ERC4626.sol` L48 (`is ERC20, IERC4626`), L77 (`constructor(IERC20 asset_)`), `totalAssets()` returns `asset.balanceOf(vault)` by default; `deposit`/`withdraw`/`convertToAssets`/`convertToShares` inherited.
```solidity
// Source: @openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol
contract CapitalRemunerationVault is ERC4626 {
    uint256 public constant DATA_CAPITAL_USD = 199e18;   // the MUTUALIZED line — lives ONLY here (P5)
    constructor(IERC20 usdProxy) ERC20("Abrigo Data Capital", "adCAP") ERC4626(usdProxy) {}
    // capital provider: deposit(DATA_CAPITAL, provider) once/epoch → shares
    // each premium's φ_data slice: transfer φ_data of `usdProxy` into the vault ⇒ totalAssets rises ⇒ shares appreciate
    // recoupment: Σ φ_data over the epoch ≥ DATA_CAPITAL ⇒ provider can withdraw ≥ what they put in
}
```
**Recoupment mechanic, explicit:** the φ_data inflow is NOT a `deposit()` (that would mint shares to the premium-payer); it is a bare `asset.transfer(vault, phiData)` that raises `totalAssets` without minting — the classic 4626 "donation/yield" pattern. The capital provider's pre-existing shares now redeem for more assets. **Inflation-attack note:** the donation pattern is the textbook 4626 inflation vector; OZ 5.0.2's virtual-shares defense (`_decimalsOffset`, default 0) mitigates it. For the demo, document that the first depositor is the trusted TE capital provider (no adversarial first-depositor).

### Pattern 3: The disjoint two-ledger conservation law (FEE-02/FEE-03, P5 — THE exit criterion)
**What:** `Σ φ_data (vault, mutualized) + Σ hedgeMeteredCost (per-position, incremental) == totalDataSpend`. The $199 enters the LEFT term ONCE; the per-position hedge metering is the RIGHT term, N times. They are DISJOINT — no value appears in both.
```
totalDataSpend  =  $199 (mutualized, fixed, ONE epoch deposit to the vault)         ← LEFT
                +  Σ_i hedgeMeteredCost_i (per-position incremental, N positions)    ← RIGHT
```
**The trap (P5):** charging the $199 per-position (N×$199 in the RIGHT term) double-counts. The conservation invariant is precisely the assertion that catches this: if the meter ever returns the $199 (or the splitter routes φ_data into the per-position deduction), `LEFT + RIGHT > totalDataSpend` and the invariant fails.
**Units/FX column (mandatory):** every line in the conservation ledger carries `{value, unit, fx}`. The $199 is `{199, USD, —}`. The per-position hedge cost is `{cost0, token0-native-dp, fx0}` + `{cost1, token1-native-dp, fx1}`. To sum them into one `totalDataSpend` the planner MUST pick a common unit (see Units/FX section) — the recommendation is a **USD-proxy scalar** so both ledgers live in the same dimension.

### Pattern 4: The stubbed-hedge meter with a HEDGE-01 drop-in seam (FEE-03)
**What:** `HedgeDataMeter is ICostMeter`. In v1 it returns a STUBBED incremental cost (e.g. a per-position accumulator seeded by a test/keeper poke). The `IHedgeMeter` extension adds the write-side the live keeper will call.
```solidity
// Source: implements the FROZEN ICostMeter; adds the write-side seam
interface IHedgeMeter is ICostMeter {
    // the live HEDGE-01 keeper calls this as it fills delta-hedge orders; v1 a test/keeper stub calls it
    function recordHedgeFill(address position, uint256 incr0, uint256 incr1) external;
}
contract HedgeDataMeter is IHedgeMeter {
    mapping(address => uint256) private _c0;     // cumulative INCREMENTAL hedge-data cost, token0 native dp
    mapping(address => uint256) private _c1;     // token1 native dp
    function recordHedgeFill(address p, uint256 i0, uint256 i1) external /*onlyKeeper*/ { _c0[p]+=i0; _c1[p]+=i1; }
    function cost(address p) external view returns (uint256, uint256) { return (_c0[p], _c1[p]); }  // ICostMeter
}
```
**Why this shape lets the live keeper drop in:** the wrapper reads `cost(position)` (frozen). The keeper writes via `recordHedgeFill`. v1 stubs the write (a test or keeper-proxy poke); HEDGE-01 swaps the stub caller for the live delta-hedge keeper with ZERO wrapper/meter signature change — identical to how Phase 8's `ICostMeter` zero-default became Phase 9's real meter with no wrapper change.
**Anti-pattern:** putting the $199 anywhere in `HedgeDataMeter` — P5 violation. The meter is per-position incremental ONLY; grep-guard `199`/φ_data out of the meter file.

### Anti-Patterns to Avoid
- **The `199` constant in a per-position path** → P5 violation, double-count. It lives ONLY in the vault/splitter. Grep-guard it out of the meter + wrapper.
- **Editing `LongGammaWrapper.sol`** → breaks the 30/30 + 2/2 Phase-8 suite. Wire via `setCostMeter` on a fresh wrapper instance.
- **Independent `mulDiv` on all three slices** → split invariant under-sums by rounding. Use a remainder sink.
- **Minting vault shares to the premium-payer on φ_data inflow** → wrong economics; φ_data is a donation that appreciates the capital provider's shares. Use a bare `transfer`, not `deposit`.
- **Hand-rolled share accounting** → inflation/rounding bugs. Use OZ ERC4626.
- **Mixing solmate ERC20 with OZ IERC4626** → type-identity compile hazard (Phase-7 settler precedent). Keep one OZ family.

## Don't Hand-Roll

| Problem | Don't build | Use instead | Why |
|---------|-------------|-------------|-----|
| Vault share accounting | Custom shares/assets math | OZ `ERC4626` (`convertToAssets`/`convertToShares`/`deposit`/`withdraw`) | Audited; rounding-direction + inflation-attack defense built in (5.0.2 virtual shares). |
| Proportional split | Hand `a*w/total` (overflow + dust) | OZ `Math.mulDiv` + a remainder sink | `mulDiv` is overflow-safe full-precision; the sink keeps `Σ == premium` exact. |
| The metered-cost wire-in | New wrapper field / new method | The FROZEN `ICostMeter` + `setCostMeter` (already built) | Phase 8 already shipped + fork-proved the seam; zero wrapper change. |
| Conservation bookkeeping | Re-derive costs in the test | Two independent accumulators (vault-side, meter-side) vs a third `totalDataSpend` | Independent-ledger comparison is the Phase-8 invariant pattern (STATE 08-07) — non-vacuous by construction. |
| Owner/admin gating | Custom modifier zoo | OZ `Ownable` OR the wrapper's inline-owner pattern | Consistency; the wrapper already uses inline-owner. |

**Key insight:** Phase 9 is mostly WIRING + a conservation proof, not new mechanism. The hard part is the **discipline** (the $199 lives in exactly one place; the units reconcile) and the **invariant design** (disjoint ledgers, non-vacuous). The 4626 and split arithmetic are off-the-shelf.

## Units / FX — the reconciliation the planner MUST settle

This is the MEDIUM-confidence area and the most important design decision. The conflict: **$199 is USD (one scalar)**; the wrapper residual is **two-token native decimals** (token0/token1 = cCOP 18dp / USDC 6dp, runtime-ordered by `PoolKeyLib`).

**Three reconciliation options (pick one in the plan):**

| Option | φ_data unit | Hedge-meter unit | totalDataSpend unit | Tradeoff |
|--------|-------------|------------------|---------------------|----------|
| **A — USD-proxy scalar (RECOMMENDED)** | USD (vault asset = a USD-proxy like USDC, 6dp) | quote a USD-proxy figure per token, sum to USD via the cCOP/USD mark | USD-proxy 6dp | Cleanest conservation (one dimension). The `ICostMeter.cost(address)→(cost0,cost1)` still returns two-token native dp into the wrapper (that's frozen), but the CONSERVATION ledger converts both to USD-proxy via the pool mark / `PoolKeyLib` rate. Needs the cCOP/USD mark (already in the pool / `te/fx/usdcop`). |
| **B — two-token, no cross-sum** | denominate φ_data in token1 (USDC≈USD) only | per-token native dp | a 2-vector `(spend0, spend1)`, conserved per-token | Avoids any FX cross-rate; the conservation invariant is two scalar invariants (one per token). But φ_data-as-USDC-only is a modeling choice (the $199 maps to USDC since USDC≈USD). Simplest to prove, weakest economically. |
| **C — pin $199 to USDC at 1:1** | USDC 6dp (199e6) | per-token native dp | mixed — discouraged | Treats USDC as USD. Pragmatic for a demo but blurs the units column ROADMAP SC-3 demands. |

**Recommendation: Option A or B.** B is the lowest-risk for the conservation proof (no FX in the invariant); A is the most economically honest (one USD dimension) but needs the cCOP/USD mark in the test. Whichever is chosen, **every cost line in the test + NatSpec carries `{value, unit, fx}`** (ROADMAP SC-3, CLAUDE.md dimensional-analysis discipline; the repo precedent is `PoolKeyLib` L21-22 baking the 1e12 decimal gap and the wrapper's "native decimals, never mixed" annotations L271).

> **No SOMI here.** CLAUDE.md's SOMI agent-payment unit is the K_AI leg; this phase is the K_D-adjacent convex instrument on the Base fork — denominated in the pool's token0/token1 (cCOP/USDC) and USD. The $199 is the TE *data* capital (USD), not a SOMI agent fee. Do not introduce SOMI into the premium split.

## Common Pitfalls

### Pitfall 1: $199 double-counted (P5 — the phase-defining trap)
**What goes wrong:** the fixed $199 appears in BOTH the vault deposit AND a per-position deduction → `Σφ_data + Σhedge > totalDataSpend`.
**Why:** conflating the mutualized data-capital line (one $199/epoch) with the per-position incremental hedge metering.
**How to avoid:** the `199` constant lives ONLY in `CapitalRemunerationVault`/`PremiumSplitter`. `HedgeDataMeter` + `LongGammaWrapper` are grep-guarded to ZERO occurrences of `199`/the φ_data constant name. The conservation invariant is the catch-all.
**Warning signs:** `invariant_dataCostConserved` fails; or `199` greps non-zero in the meter/wrapper.

### Pitfall 2: 4626 inflation / donation share-price manipulation
**What goes wrong:** a first depositor donates assets to skew the share price, stealing later deposits.
**Why:** the φ_data inflow is a bare `transfer` (donation pattern) — the canonical 4626 inflation vector.
**How to avoid:** OZ 5.0.2's virtual-shares (`_decimalsOffset`); document the trusted-first-depositor (TE capital provider) demo assumption; the fuzz test bounds deposit amounts so the share-price invariant (`convertToAssets(convertToShares(x)) ≈ x`) holds.
**Warning signs:** 4626 round-trip fuzz `convertToShares`→`convertToAssets` loses more than the rounding tolerance.

### Pitfall 3: split rounding leak
**What goes wrong:** `Σ slices != premium` by 1-2 wei under fuzz.
**Why:** three independent `mulDiv` roundings.
**How to avoid:** remainder sink (Pattern 1).
**Warning signs:** the FEE-01 fuzz invariant reds on edge amounts.

### Pitfall 4: meter changes the Phase-8 invariants
**What goes wrong:** wiring a non-zero meter into the EXISTING Phase-8 wrapper tests reds the 30/30 suite.
**Why:** Phase-8 tests assume `_costOf()==(0,0)`.
**How to avoid:** Phase-9 fork tests deploy a FRESH wrapper with the meter; never re-run the Phase-8 suite with a non-zero meter. The invariant `residual<=surviving` still holds with the meter (subtraction can only reduce), so the meter is invariant-safe — but the *magnitudes* in the Phase-8 unit tests are pinned to zero-meter.

### Pitfall 5: vacuous conservation invariant
**What goes wrong:** the invariant passes trivially (`0 == 0`) because the handler never drives both ledgers.
**Why:** a handler that deposits to the vault but never meters a position (or vice versa).
**How to avoid:** the handler MUST drive BOTH — one epoch vault deposit + N per-position meterings — and `totalDataSpend` accumulates independently. Mutation-test it (zero one accumulator → the assertion must fail), exactly the Phase-8 08-07 non-vacuity proof.
**Warning signs:** the invariant passes when `Σφ_data` or `Σhedge` is forced to 0 (mutation survives).

## Code Examples

### Wiring the meter into a fresh wrapper (FEE-03 fork test)
```solidity
// Source: LongGammaWrapper.sol L128-133 (setCostMeter) + L322-325 (_costOf) + L268-272 (residual)
HedgeDataMeter meter = new HedgeDataMeter(/*keeper=*/address(this));
LongGammaWrapper w = new LongGammaWrapper(IPanopticData(pool), ct0, ct1);
w.setCostMeter(address(meter));                 // owner=test deployer; state Uninitialized ⇒ allowed
// ... seller seed, w.deposit(user, a0, a1, longId, size, limits) ...
meter.recordHedgeFill(address(w), incr0, incr1);// stub the v1 hedge metering (HEDGE-01 keeper later)
// ... drive close ...
w.claimResidual();                              // residual_i = max(surviving_i - cost_i, 0); paid to user
// assert: paid_i == max(survivingBaseline_i - incr_i, 0)  (the metered term BIT vs the zero-meter baseline)
```

### Conservation invariant skeleton (the EXIT criterion)
```solidity
// Source: pattern (Phase-8 08-07 independent-ledger precedent); names the ROADMAP invariant by hand
contract DataCostConservationHandler {
    uint256 public vaultPhiData;     // Σ φ_data into the vault (mutualized) — LEFT
    uint256 public meteredHedge;     // Σ per-position incremental hedge cost — RIGHT
    uint256 public totalDataSpend;   // independent accumulator (the truth)
    function act_depositEpochCapital() external { /* $199 ONCE; vaultPhiData += 199; totalDataSpend += 199; */ }
    function act_routePhiData(uint256 x) external { /* per-premium φ_data slice into vault; vaultPhiData += x; (no new spend — it's recoupment of the 199) */ }
    function act_meterHedge(uint256 i) external { /* per-position incremental; meteredHedge += i; totalDataSpend += i; */ }
}
// invariant_dataCostConserved:
//   assertEq(handler.vaultPhiData_mutualized() + handler.meteredHedge(), handler.totalDataSpend());
//   (units: all USD-proxy per Option A/B; the $199 counted ONCE, never N×)
```
> Note the subtlety: per-premium φ_data slices ROUTED to the vault are *recoupment* of the one $199 capital, not new spend — `totalDataSpend` increments by $199 ONCE (the capital), not on each routing. The planner must define `totalDataSpend` precisely: it is the protocol's actual data outlay (one $199 + Σ marginal rows + Σ hedge fills), and the invariant asserts the LEDGERS (vault recoupment target + metered hedge) reconcile to it without double-counting the $199.

## State of the Art

| Old (Phase 8) | Phase 9 | Why changed |
|---------------|---------|-------------|
| `ICostMeter` zero-address ⇒ (0,0); residual == surviving | Concrete `HedgeDataMeter` wired via `setCostMeter`; residual == surviving − metered hedge | FEE-03 turns the stubbed hook live (still stubbed *hedge*, real *meter*). |
| Single wrapper, no premium decomposition | `PremiumSplitter` decomposes the premium; φ_data → vault | FEE-01/02. |
| No capital-remuneration vault | `CapitalRemunerationVault is ERC4626` recoups the $199 | FEE-02. |
| Two Phase-8 invariants (residual/backing) | + `invariant_dataCostConserved` (disjoint-ledger, no double-count) | FEE-02/03 exit criterion. |

**Deprecated/outdated:** `getAccumulatedFeesAndPositionsData` is renamed `getFullPositionsData` in the live forge-installed panoptic-v2-core @ d20b0aed (`IPanopticData.sol` L13-16; `LongGammaWrapper.sol` L311 already uses it). Any Phase-8 RESEARCH line-cites to the audited fe55774 snapshot are STALE for the borrowed-source body (the seam absorbed the rename) — but the *wrapper* seam Phase 9 wires into is the live source above, so this does not affect Phase 9.

## Open Questions

1. **Units/FX denomination of the premium + φ_data (the central decision).**
   - What we know: $199 is USD; the wrapper residual is two-token native dp; the cCOP/USD mark exists (pool / `te/fx/usdcop` / `PoolKeyLib` HUMAN_RATE=4000).
   - What's unclear: whether the conservation invariant lives in one USD dimension (Option A, needs the mark) or per-token (Option B, no FX).
   - Recommendation: **Option B for the invariant** (two scalar conservations, no FX risk in the proof) + **Option A's USD framing in the narrative**. Lock this in the plan's first task; it cascades into every cost-line units column.

2. **What exactly is `totalDataSpend` and when does the $199 increment it.**
   - What we know: $199 is the fixed monthly TE capital; per-premium φ_data slices RECOUP it (they are not new spend); marginal rows + hedge fills are incremental.
   - What's unclear: whether the invariant counts `totalDataSpend = 199 + Σrows + Σhedge` (the actual outlay) with `Σφ_data` as the recoupment-target (≥199), or counts φ_data inflows directly.
   - Recommendation: define `totalDataSpend` = actual protocol outlay (199 ONCE + marginal); assert `Σφ_data(vault) ≥ 199` (recoupment break-even, INSTRUMENT-v1 L54) AND `199 + Σhedge == totalDataSpend` (disjointness). Two clean assertions beat one muddy one.

3. **Vault underlying asset + the φ_data inflow mechanism (deposit vs donation).**
   - What we know: φ_data appreciates the capital provider's shares (donation pattern); OZ 5.0.2 virtual-shares mitigate inflation.
   - What's unclear: the exact USD-proxy asset (USDC 6dp recommended) and whether epoch-roll is needed in v1.
   - Recommendation: USDC as the vault asset; single-epoch demo (no roll); document the trusted-first-depositor assumption.

## Validation Architecture

`workflow.nyquist_validation: true` (`.planning/config.json`) → this section is REQUIRED.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Foundry `forge` (fuzz + fork) + `bulloak` 0.9.2 (BTT scaffolding) |
| Config file | `contracts/foundry.toml` — single `cancun`/`0.8.24` profile (non-viaIR, optimizer 200); `[invariant]` runs=16, depth=16, fail_on_revert=false (verified L25-28) |
| Quick run command | `cd contracts && forge test --match-path "test/instrument/{PremiumSplitter,CapitalRemunerationVault,DataCostConservation}*.t.sol"` (FEE-01/02 + conservation are local, NO fork needed) |
| Fork run (FEE-03) | `cd contracts && forge test --match-path "test/instrument/LongGammaWrapper.meteredResidual.t.sol" --fork-url "$BASE_RPC_URL"` |
| Full suite | `cd contracts && forge test --fork-url "$BASE_RPC_URL"` (incl. Phase-7/8 unregressed) |
| BTT per-file check | `cd contracts && bulloak check test/instrument/<unit>.tree` (per file; full-glob is a non-gate per 07/08 precedent) |

### Phase Requirements → Test Map
| Req | Behavior | Test type | Automated command | Asserts (the Nyquist signal) | File exists? |
|-----|----------|-----------|-------------------|-------------------------------|--------------|
| FEE-01 | `Σ slices == premium` | fuzz (local) | `forge test --match-test invariant_premiumSplitConserved` (or `testFuzz_split_sumEqualsPremium`) | for all `premium` in `[0, type(uint128).max]`: `piPanoptic + muLP + phiData == premium` (remainder sink; no dust) | ❌ Wave 0 |
| FEE-02 | 4626 deposit/withdraw/share invariants | fuzz (local) | `forge test --match-test "testFuzz_vault_*"` | `convertToAssets(convertToShares(x)) ≈ x` within rounding; `deposit→redeem` returns ≤ deposited (no value creation); `totalAssets` rises by exactly the φ_data donation | ❌ Wave 0 |
| FEE-02/03 | **`invariant_dataCostConserved`** (the EXIT criterion) | invariant (local) | `forge test --match-test invariant_dataCostConserved` | `Σφ_data(vault, $199 ONCE) + Σhedge(per-position) == totalDataSpend`; the $199 charged once, NEVER N×; non-vacuous (mutation: zero either accumulator ⇒ fail) | ❌ Wave 0 |
| FEE-03 | residual w/ metered hedge wired in | fork unit | `forge test --match-test test_meteredResidual_* --fork-url "$BASE_RPC_URL"` | fresh wrapper + `setCostMeter(HedgeDataMeter)`; after `recordHedgeFill(incr)`, `claimResidual` pays `max(surviving_i − incr_i, 0)`; the paid figure differs from the zero-meter baseline by exactly `incr_i` (the metered term BIT); P5 grep `199`==0 in meter+wrapper | ❌ Wave 0 |
| process | $199 disjointness | grep-guard | `grep -c '199' src/instrument/HedgeDataMeter.sol` (and the wrapper) | `== 0` — the mutualized constant lives ONLY in the vault/splitter | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** the unit's `forge test --match-path` + `bulloak check` for that tree + the P5 grep-guard.
- **Per wave merge:** `forge test --match-path "test/instrument/{PremiumSplitter,CapitalRemunerationVault,DataCostConservation}*.t.sol"` (local) + the FEE-03 fork test.
- **Phase gate:** full `forge test --fork-url "$BASE_RPC_URL"` green (incl. Phase-7/8 unregressed) + all per-file `bulloak check` exit 0 + `invariant_dataCostConserved` + FEE-01/02 fuzz invariants pass at the CI fuzz floor + P5 grep-guard == 0, before `/gsd:verify-work`. **RPC caution (carried):** the fork FEE-03 test 429s on rapid Alchemy runs — run with backoff (STATE 08-07 note).

### Wave 0 Gaps
- [ ] `src/instrument/PremiumSplitter.sol` — FEE-01 decomposition with remainder sink.
- [ ] `src/instrument/CapitalRemunerationVault.sol` — `is ERC4626`, the mutualized $199 line + donation-inflow recoupment.
- [ ] `src/instrument/HedgeDataMeter.sol` — `is IHedgeMeter` (implements the FROZEN `ICostMeter`); per-position incremental ONLY.
- [ ] `src/instrument/interfaces/IHedgeMeter.sol` — the HEDGE-01 drop-in write-side (`recordHedgeFill`).
- [ ] Four `.tree` + `.t.sol` pairs (split / vault / conservation / meteredResidual), each committed BEFORE its impl (Iron Law); the conservation file names `invariant_dataCostConserved` BY HAND.
- [ ] A conservation `Handler` driving BOTH ledgers (non-vacuous, mutation-proven).
- [ ] Units/FX decision locked (Open Question 1) — Option A or B — BEFORE any cost line is written.
- [ ] Framework install: none — `forge` + `bulloak` 0.9.2 + OZ 5.0.2 (vendored) already present.

## Sources

### Primary (HIGH confidence) — live source, read verbatim
- `contracts/src/instrument/LongGammaWrapper.sol` — `_costOf` L322-325, `claimResidual` residual L259-277 (cost deduction L268-272), `setCostMeter` L128-133, `_redeemCapped` L285-295, `recordStreamia`/`getFullPositionsData` L307-315, ledger storage L57-76.
- `contracts/src/instrument/interfaces/ICostMeter.sol` — the FROZEN `cost(address)→(cost0,cost1)` seam L11-15, native-decimals + zero-address⇒(0,0) + frozen-pre-Open semantics.
- `contracts/src/instrument/interfaces/IPanopticData.sol` — `getFullPositionsData` L484 (d20b0aed rename of `getAccumulatedFeesAndPositionsData`), L13-16 ABI-delta note.
- `lib/v4-core/lib/openzeppelin-contracts/contracts/token/ERC20/extensions/ERC4626.sol` — `abstract contract ERC4626 is ERC20, IERC4626` L48, `constructor(IERC20 asset_)` L77, virtual-shares note L30; OZ `package.json` version **5.0.2** (verified reachable via `@openzeppelin/`).
- `contracts/foundry.toml` — `[invariant]` runs=16/depth=16/fail_on_revert=false L25-28.
- `contracts/remappings.txt` — `@openzeppelin/=lib/v4-core/lib/openzeppelin-contracts/`, `@types/=lib/panoptic-v2-core/contracts/types/`.
- `contracts/test/instrument/helpers/PoolKeyLib.sol` — the dimensional-analysis precedent (1e12 decimal gap L21-22, HUMAN_RATE=4000 L19, native-dp price baking).

### Secondary (HIGH confidence) — planning artifacts
- `research/macro-markets-colombia/INSTRUMENT-v1.md` — the φ_data design authority: premium decomposition L38-44, mutualization/$199 L46-54, splitter + vault routing L68, open decisions L72-79.
- `.planning/phases/08-longgammawrapper-cash-flow/08-CONTEXT.md` — the `ICostMeter` external-meter decision, double-count trap (Pattern 7), per-token native-decimals discipline, $199-never-per-position (P5 ancestor).
- `.planning/phases/08-longgammawrapper-cash-flow/08-VERIFICATION.md` — the fork-proven Phase-8 seam (30/30 + 2/2 green; `_costOf` zero-address⇒(0,0) wired).
- `.planning/ROADMAP.md` Phase 9 (Goal + SC 1-4 + P5), `.planning/REQUIREMENTS.md` FEE-01..03, `.planning/STATE.md` (08-07 invariant precedent, RPC caution).
- `CLAUDE.md` §Domain non-negotiables (X=USD, units/FX discipline), §Planning-review protocol (the three-step gate this RESEARCH feeds).

### Tertiary (verified)
- OpenZeppelin releases — latest 5.6.1 (2025-02-27); 4626 API stable across 5.x; the vendored 5.0.2 is sufficient (no install).

## Metadata

**Confidence breakdown:**
- Wrapper residual seam (the wire-in): HIGH — read the live `_costOf`/`claimResidual`/`setCostMeter` bodies + the frozen `ICostMeter`; fork-proven in 08-VERIFICATION.
- ERC-4626 stack + reachability: HIGH — verified the OZ 5.0.2 base + ERC20 + Math + Ownable all resolve via the existing `@openzeppelin/` remapping; no install.
- Conservation-invariant mechanics + non-vacuity: HIGH — the Phase-8 08-07 independent-ledger + mutation-proof precedent transfers directly.
- Premium-split arithmetic: HIGH — `mulDiv` + remainder sink is standard.
- Units/FX reconciliation ($199 USD vs two-token residual): MEDIUM — the conflict is real and the three options are laid out, but the choice is a planner decision (Open Question 1); no single source dictates it.

**Research date:** 2026-06-02
**Valid until:** stable (the wrapper seam is shipped + pinned; OZ 5.0.2 vendored; ~30 days for the planning artifacts).

## RESEARCH COMPLETE

1. **The Phase-8 wire-in is already built and frozen** — `LongGammaWrapper._costOf()` (L322-325) reads `ICostMeter.cost(address)→(cost0,cost1)` (native dp, zero-address⇒(0,0)); `claimResidual()` deducts it per-token from surviving collateral (L268-272); `setCostMeter()` (L128-133, owner-gated, frozen pre-Open) is the wire. Phase 9 deploys a concrete meter and wires it on a FRESH wrapper — NO `LongGammaWrapper.sol` edit, so the 30/30+2/2 Phase-8 suite stays green.
2. **ERC-4626 base is reachable, no install** — OZ 5.0.2 `ERC4626` at `@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol` (+ ERC20/Math/Ownable) via the existing `@openzeppelin/` remapping. `CapitalRemunerationVault is ERC4626(usdProxy)`; the $199 deposits once/epoch; per-premium φ_data flows in as a bare `transfer` (donation pattern, appreciates the capital provider's shares = recoupment), NOT a `deposit`. Recoupment "decreases per-position as volume grows" because φ_data = $199/E[premiums].
3. **The conservation law is disjoint two-ledger** — `invariant_dataCostConserved`: `Σφ_data(vault, $199 ONCE) + Σhedge(per-position incremental) == totalDataSpend`. The `199` constant lives ONLY in the vault/splitter, grep-guarded to ZERO in the meter + wrapper (P5). Handler drives BOTH ledgers; non-vacuity by mutation (Phase-8 08-07 precedent).
4. **The stubbed-hedge meter drops the live keeper in cleanly** — `HedgeDataMeter is IHedgeMeter is ICostMeter`: `cost()` (read, frozen) + `recordHedgeFill(position,incr0,incr1)` (write). v1 stubs the write (test/keeper poke); HEDGE-01 swaps the caller for the live delta-hedge keeper with ZERO signature change.
5. **Units/FX is the one real open decision** — $199 is USD; the residual is two-token native dp. Recommend Option B (per-token conservation, no FX in the invariant) for the proof + Option A (USD framing) for the narrative; every cost line carries a `{value, unit, fx}` column (ROADMAP SC-3, the `PoolKeyLib` 1e12-gap precedent). No SOMI in this phase (it's the K_D-adjacent Base-fork instrument, not the K_AI leg).
