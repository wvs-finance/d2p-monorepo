# Pitfalls Research — v2.0 Convex Instrument (cCOP/USD long-gamma)

**Domain:** Borrowed-Panoptic-data-model long-gamma escrow wrapper (streamed premium + external delta-hedge) on a Celo / mainnet-fork, wired to MacroOracle/TE and a Reactive Network cross-chain payment layer
**Researched:** 2026-06-01
**Confidence:** HIGH on Panoptic mechanics + license (primary source verified); MEDIUM on Reactive callback semantics; MEDIUM on cCOP pool realities; LOW on the CPI→FX transfer function (an empirical assumption by the project's own admission)

> Scope: this file extends the nine pitfalls the feasibility/instrument briefs already flagged and makes each actionable for the roadmapper. Phases referenced are the *anticipated* phase decomposition for this milestone (P0 fork-harness → P1 wrapper-owns-position → P2 streamia/residual accounting → P3 hedge-data-cost metering → P4 MacroOracle/CPI sizing → P5 cross-chain payment layer → P6 cCOP/real-pool swap). The roadmapper may re-letter; the *ordering dependencies* are the load-bearing part.

---

## Critical Pitfalls

### Pitfall 1: Re-deriving streamia / VEGOID instead of reading the borrowed code's own settled value

**What goes wrong:**
The wrapper re-implements its own premium accrual using a hand-rolled "fees × demand multiplier" formula, or hard-codes a spread multiplier, and the residual returned to the user (`deposit − streamia − …`) silently diverges from what Panoptic actually debits at burn. The user is over- or under-reimbursed; the LP short side (Book A) is mispriced; the no-arbitrage premium proof in MATH.md §7 is invalidated.

**Why it happens:**
Streamia is NOT a closed-form premium. Verified mechanics (panoptic.xyz/docs/product/streamia + SFPM source): streamia at each block = the Uniswap-v3 fees the option's corresponding LP token would have earned, **multiplied by a spread factor driven by the proportion of available options liquidity utilized** (e.g. a crowded long with few sellers → up to a 3x multiplier). `VEGOID` is a **fixed constant = 2** baked into `SemiFungiblePositionManager.sol`, used in the liquidity-utilization premium term — it is NOT a free parameter and NOT implied volatility despite the "vega-like" framing (Code4rena 2023-11 issue #29 explicitly flagged the fixed-vega assumption). The streamia is settled **lazily at burn**, not drawn per block (FEASIBILITY-v1 change #2). A developer who treats the multiplier as a tunable or recomputes fees independently will drift from the contract's own `FeesCalc`/`PanopticMath` accounting.

**How to avoid:**
Do NOT compute premium independently. The wrapper must read the realized premium **from the borrowed contract's own accounting at burn** (the `settleLongPremium` / `burnOptions` return path), not from a parallel formula. If you port `FeesCalc.sol` / `PanopticMath.sol` verbatim (subject to Pitfall 9 licensing), keep `VEGOID = 2` and the spread-multiplier curve byte-identical to the source tag you pinned; add a fork test that mints a long, advances N blocks generating known Uniswap fees, burns, and asserts the wrapper's recorded streamia equals the pool's `collectedByLP × multiplier` to the wei. Treat any independent premium estimate as a *display-only upper bound*, never the settlement figure.

**Warning signs:**
A constant named `SPREAD_MULTIPLIER` or `streamiaPerBlock` in the wrapper; a residual test that passes with `advanceBlocks=0` but drifts as blocks advance; the wrapper computing premium from notional/IV rather than reading pool fees.

**Phase to address:** P2 (streamia / residual accounting). Verification belongs in the P2 fork test.

---

### Pitfall 2: Wrapper-owns-position vs EOA — positionIdList and ERC-4626 shares held by the wrapper, not the user

**What goes wrong:**
The wrapper calls `mintOptions` but the `CollateralTracker` ERC-4626 shares and the `positionIdList` end up keyed to the wrong owner (the deployer EOA, or `tx.origin`, or an un-tracked address), so the wrapper cannot later burn the position, cannot read the collateral balance to compute the residual, and cannot return funds. Or: the wrapper deposits collateral but the 4626 shares are minted to the wrapper while the position is opened under a different account — the position and its collateral are split across owners and the health check sees zero collateral.

**Why it happens:**
Panoptic's `PanopticPool` tracks positions per-account via a `positionIdList`, and `CollateralTracker` is an ERC-4626 vault whose shares represent the depositor's collateral claim. FEASIBILITY-v1 change #1 explicitly flags this as *unverified*: "Verify `positionIdList` + 4626-share ownership against `PanopticPool.mintOptions` source before building." The intent is that the **wrapper contract** (not the EOA) is the account: it deposits to `CollateralTracker`, holds the 4626 shares, and appears in `positionIdList` as the position owner. Developers coming from a "user mints their own option" mental model wire ownership to `msg.sender`/EOA and break the wrapper's custody.

**How to avoid:**
Before writing the wrapper, read `PanopticPool.mintOptions` and `CollateralTracker.deposit`/`mint` at the pinned source tag and write a `.tree` (BTT) spec that asserts: (a) after `wrapper.openPosition()`, `panopticPool.positionIdList(address(wrapper))` contains the new tokenId; (b) `collateralTracker.balanceOf(address(wrapper)) > 0` (the wrapper holds the 4626 shares); (c) `collateralTracker.balanceOf(user) == 0`. The wrapper must approve and `deposit` to the tracker *as itself*, then `mintOptions` *as itself*. The user's claim is an internal accounting entry in the wrapper, NOT a 4626 share or a Panoptic position. Add an invariant: `Σ(internal user claims) ≤ collateralTracker.convertToAssets(wrapper 4626 balance)`.

**Warning signs:**
`mintOptions` called with `msg.sender` forwarded as owner; user address appearing in any Panoptic call; a test that opens a position from the test EOA rather than from the wrapper contract; the wrapper unable to burn in a test ("not position owner" revert).

**Phase to address:** P1 (wrapper-owns-position). This is the foundational custody phase — every later phase depends on the wrapper being the unambiguous owner.

---

### Pitfall 3: The no-upfront-premium reframe — liquidation / forceExercise / settleLongPremium eroding the user's residual

**What goes wrong:**
The wrapper treats `deposit_upfront` as a precise premium quote and returns `deposit − streamia − commission − hedgeCost` assuming a clean voluntary burn at epoch end. But Panoptic longs post **collateral, not premium** (FEASIBILITY-v1: "longs pay no upfront premium"), and the position can be closed **involuntarily and early** by (a) a seller calling `settleLongPremium`, (b) `forceExercise` by a counterparty, or (c) liquidation when collateral health fails. Each of these debits the collateral before epoch end. If the wrapper has already promised the user a residual computed on the full upfront amount, it becomes insolvent — it owes more than the collateral that survived the involuntary close.

**Why it happens:**
FEASIBILITY-v1 change #2 states it plainly: "The upfront amount is an over-funded cap, not a precise quote; the wrapper must tolerate early/involuntary debits." Developers model the happy path (mint → hold to epoch end → burn → refund) and skip the involuntary-close branches because they don't fire in a quiet fork test. The mental model "user paid premium" hides that the user actually posted collateral that a third party can consume.

**How to avoid:**
Model the residual as a **post-settlement computed quantity, never a pre-committed promise**. The wrapper exposes `claimResidual()` that reads the *actual surviving collateral* at the time of close and subtracts realized costs — it never pays a figure derived from `deposit_upfront`. Add explicit `.tree` branches and fork tests for: (i) `forceExercise` mid-epoch, (ii) `settleLongPremium` called by a seller, (iii) liquidation (drop the pool price / starve collateral until health fails). Assert in each that `residual = max(survivingCollateral − realizedCosts, 0)` and that the wrapper never reverts-to-trap or pays more than it holds. The deposit must be sized as an over-funded cap with a documented buffer; emit a `ResidualEroded` event when an involuntary close reduces the residual below the naive `deposit − streamia − commission` figure so the user sees why.

**Warning signs:**
A `refund = deposit - costs` line anywhere; no test that exercises liquidation or `forceExercise`; the wrapper assuming it controls when the position closes; absence of a health-monitor keeper hook.

**Phase to address:** P3 (hedge-data-cost + residual accounting) for the accounting, but the involuntary-close *branches* must be specified in P1's wrapper `.tree` and tested by P2. Flag for the roadmapper: this pitfall straddles P1–P3 and is the single most likely source of an insolvent wrapper.

---

### Pitfall 4: cCOP pool realities — thin liquidity, mark manipulation, cCOP depeg

**What goes wrong:**
Building or testing against a real cCOP/USD (or cCOP/cUSD) Uniswap pool on Celo where the pool is thin: a single swap moves the mark, so streamia (driven by realized fees and the spread multiplier) becomes erratic, the long-gamma payoff settles on a manipulated price, and an attacker can move the tick to trigger `forceExercise`/liquidation of the wrapper's position or to mint optionality cheaply. cCOP can also **depeg** from COP (it is a Mento-issued stablecoin tracking the peso), which corrupts the cCOP/USD ≈ COP/USD identity the whole instrument rests on.

**Why it happens:**
DRAFT §6/§9 and FEASIBILITY-v1 change #4 are explicit: **no Panoptic-on-Celo deployment exists**, and cCOP/USD has no Panoptic pool. The project's own evidence base (DRAFT §12) reconstructs cCOP liquidity from GeckoTerminal/Dune and finds it thin. Panoptic settlement reads the UniV3 pool price; a thin pool means the mark is cheap to push. Developers validate on a deep stand-in (ETH/USDC) and then assume the same dynamics hold on the thin cCOP pool.

**How to avoid:**
Keep cCOP/USD strictly as a **documented target**, not the v1/v2 underlying — build and prove the entire cash-flow on a **deep fork pair (ETH/USDC)** first (FEASIBILITY-v1 change #4; DRAFT §5). When the real cCOP pool is eventually wired (P6), require: (a) a TWAP-based mark for any health/settlement decision (not spot), with a documented observation window long enough that the cost-to-manipulate exceeds the position notional; (b) a hard pre-flight liquidity gate — refuse to open a position if pool reserves / liquidity-at-tick are below a configured floor relative to notional; (c) a cCOP depeg circuit-breaker that pauses minting and flags settlement when an off-chain cCOP/COP or cCOP/USD reference (MacroOracle/TE TRM) diverges beyond a threshold from the pool mark. Document the basis risk between the stand-in pair and cCOP explicitly in the INSTRUMENT doc.

**Warning signs:**
Settlement or health logic reading `slot0`/spot instead of a TWAP; no liquidity floor check before mint; treating cCOP/USD and COP/USD as identical with no depeg monitor; demoing only on ETH/USDC and claiming cCOP-readiness.

**Phase to address:** P6 (cCOP / real-pool swap) for the live gates; but the TWAP-vs-spot and liquidity-floor *design* must be settled in P1 so the wrapper isn't retrofitted. Flag: P6 likely needs its own deeper research pass before execution.

---

### Pitfall 5: Data-cost-weighted reimbursement — off-by accounting and double-counting the metered hedge data cost

**What goes wrong:**
The residual formula `deposit − streamia − commission − Σ(hedge data + execution costs)` double-counts or mis-attributes the metered hedge data cost: (a) the φ_data protocol fee (INSTRUMENT-v1 §"Premium = hedge cost + data-cost protocol fee") and the per-rebalance `Σ(delta-hedge data cost)` (FEASIBILITY-v1 cash-flow) are *two different deductions* that get conflated, so the user is charged the data cost twice; (b) the shared-cache mutualization (one TE fetch serves many premiums) means a per-position deduction of the full $199-derived fetch cost over-charges every position; (c) the metered hedge cost is denominated in the hedge chain's gas/USD while the residual is in the collateral token, and a missing/incorrect FX conversion silently corrupts the figure.

**Why it happens:**
The project has TWO data-cost concepts that look alike: `φ_data` (a *premium component* routed to the ERC-4626 capital-remuneration vault, mutualized and decreasing in cooperative volume — INSTRUMENT-v1) and the `Σ(delta-hedge data + execution cost)` (a *residual deduction* for the keeper's per-rebalance priced fetches — FEASIBILITY-v1). MATH.md's quota lines (70/500 calls, 6916/1e6 rows, marginal row ≈ $0.0002) make the marginal data cost ~0 and the fixed $199 dominant — so any per-position deduction of a fixed-cost share is an allocation choice that is easy to get wrong (charge the fixed cost N times to N positions).

**How to avoid:**
Write an explicit cost-ledger model BEFORE coding the residual: define `φ_data` (premium-side, vault-bound, mutualized → marginal-row cost as volume grows) and `hedgeMeteredCost` (residual-side, per-position, = the *incremental* priced fetches + swap gas + slippage that THIS position's rebalances caused) as disjoint line items with a one-line proof they don't overlap. The fixed $199 belongs to φ_data (amortized across the epoch's premiums per INSTRUMENT-v1's `φ_data ≈ ($199 + rowcost·rows)/E[premiums]`), NOT to the per-position residual deduction. Meter the hedge cost as **incremental** (rows/calls attributable to this position's hedge, not a share of the monthly fixed cost). Carry an FX/units column on every cost line and a single conversion point into the collateral token. Add a fork/unit test asserting `Σ over all positions of (φ_data) + Σ(hedgeMeteredCost) == totalDataSpend` (conservation: no double count, no leak).

**Warning signs:**
The string `199` appearing in a per-position deduction; φ_data and hedgeCost summed into one variable; no units/FX column on cost lines; a residual test with a single position that can't detect the N-position double-charge.

**Phase to address:** P3 (hedge-data-cost metering). The conservation test is the P3 exit criterion. The φ_data/vault path is P4-adjacent (premium splitter) — keep the two phases' cost definitions reconciled in a shared ledger spec.

---

### Pitfall 6: Cross-chain trust — Reactive callback auth, x402 chain mismatch (Base vs Celo), replay

**What goes wrong:**
(a) The destination contract on the Panoptic chain accepts a Reactive callback without verifying it came from the Callback Proxy and from the correct Reactive contract — any address can forge a "CPI surprise" or "fund the position" message and mint/adjust an unauthorized position or drain the escrow. (b) The x402 payment leg is specified inconsistently: MATH.md and INSTRUMENT-v1 say **x402 on Base**, while the sibling repo and CLAUDE.md K_D leg are **Celo** — a payment accepted on one chain but expected on the other strands funds or double-spends. (c) A cross-chain message (surprise value, settlement, fund instruction) is replayed, opening duplicate positions or paying out twice.

**Why it happens:**
Reactive's security model (verified, dev.reactive.network/reactive-contracts + reactive-library) requires the destination to check `msg.sender == CALLBACK_SENDER` (the Callback Proxy) AND that the embedded RVM/RC id matches the intended Reactive contract — both checks, not just one. Developers wire the happy path and skip the second check or skip auth entirely on testnets. The Base-vs-Celo mismatch is a live unreconciled open decision (INSTRUMENT-v1 "Open decisions: x402 entry chain — MATH.md says Base; sibling abrigo-x402 is Celo — reconcile"; DRAFT §10C). Replay protection is not addressed in Reactive's default callback docs, so it's the integrator's responsibility and easy to omit.

**How to avoid:**
On every destination callback: (1) `require(msg.sender == callbackSender)` where `callbackSender` is the immutable Callback Proxy set at construction; (2) `require(rvmId == expectedReactiveContract)`; (3) a per-message nonce / dedupe set so a replayed message reverts (CEI: mark consumed before acting — the same pattern the built `SomniaAgentConsumer` already uses for `pendingRequests`). **Reconcile the payment chain as a P5 entry gate**: pick Base XOR Celo for x402 explicitly, document why, and make the wrapper reject deposits not originating from the canonical chain id. Treat any cross-chain value/signal as untrusted until both auth checks + the nonce check pass. Add fork/integration tests: forged-sender reverts; wrong-RVM-id reverts; replayed-nonce reverts; cross-chain-id-mismatch deposit reverts.

**Warning signs:**
A callback handler with no `msg.sender` check or only one of the two checks; `chainId` not asserted on the payment path; no nonce/dedupe map; the Base/Celo decision still "open" when P5 starts coding; reliance on "it only works on testnet so it's safe."

**Phase to address:** P5 (cross-chain payment layer). The Base-vs-Celo reconciliation is a P5 *pre-decision* (must land before P5 code). This phase needs a dedicated security review (CLAUDE.md three-step gate) given it's the trust boundary.

---

### Pitfall 7: Treating the CPI-surprise → FX-move linkage as validated when it is an assumption

**What goes wrong:**
The instrument sizes notional and strike from `s = (CPI_actual − consensus)/σ` (INSTRUMENT-v1) on the premise that a CPI surprise reliably drives a proportional cCOP/USD move. If that transfer function is weak, lagged, sign-unstable, or regime-dependent (BanRep reaction, capital controls, oil/terms-of-trade shocks dominating CPI), the position is sized on noise: long-gamma is opened/sized at the wrong times, the convex payoff `notional·max(|s|−k,0)²` fires on surprises that don't move FX, and the hedge loses streamia with no offsetting gamma capture. The whole "convex-dominates-linear" thesis (MATH.md §7) rests on this linkage holding.

**Why it happens:**
Both FEASIBILITY-v1 and INSTRUMENT-v1 and PROJECT.md "Honest constraints" state it outright: "the CPI-surprise→FX-move linkage is an empirical assumption to validate, not a proven transfer function." It's tempting to bake the linkage into the sizing code as a fixed coefficient because the data to validate it (the donor-transfer / M1 econometric track) is parked. The risk is shipping a sizing rule that *looks* principled but has never been regressed.

**How to avoid:**
Keep the CPI→FX coefficient a **configurable, externally-supplied parameter**, never a hard-coded constant — the sizing hook (FEASIBILITY-v1 build outline step 4: "can be a fixed param in the very first cut, then wired") must read `β_{s→FX}` and `σ_CPI` from config/MacroOracle so they can be recalibrated when the econometric track (M1 donor-transfer, which "later calibrates this instrument's params" per PROJECT.md) produces evidence. Add a `linkage_validated: false` flag in the instrument metadata and refuse to claim production-readiness while it's false. In v2 (fork demo), explicitly scope the sizing as *illustrative* and document the unvalidated linkage in the success criteria. Plan a validation deliverable (event-study / local-projection of cCOP/USD on CPI surprises) as a gating item before any real-money sizing — this is M1/M2 work, not v2.

**Warning signs:**
A hard-coded coefficient mapping `s` to notional; success criteria that claim the instrument "hedges CPI risk" rather than "demonstrates the mechanism assuming the linkage"; no `linkage_validated` flag; the donor-transfer calibration track treated as optional.

**Phase to address:** P4 (MacroOracle/CPI sizing) for the configurable-parameter design; validation itself is cross-milestone (M1/M2). Flag for roadmapper: P4 must NOT bake the coefficient, and the milestone's success criteria must state the linkage is assumed.

---

### Pitfall 8: evm-tdd discipline lapses — impl before .tree, weakening fuzz tests to pass

**What goes wrong:**
Under schedule pressure the wrapper's Solidity is written before the Branching-Tree-Technique `.tree` spec, so the involuntary-close branches (Pitfall 3), the ownership invariants (Pitfall 2), and the cost-conservation property (Pitfall 5) are never enumerated as test branches — they're the exact paths a quiet fork test skips. Or fuzz invariants are loosened (narrowed bounds, `vm.assume` that excludes the failing region, reduced runs) to make a flaky test pass, hiding a real residual-insolvency or double-count bug.

**Why it happens:**
PROJECT.md mandates "feature-by-feature, strict evm-tdd"; the built `SomniaAgentConsumer` already ships "BTT trees + fuzz invariants" (DRAFT §4). The discipline lapse happens because the borrowed Panoptic surface is large and complex, so writing the `.tree` first feels slow, and because fork tests against a mainnet-fork are slow to iterate — the temptation is to write impl, eyeball it, and backfill thin tests. A weakened fuzz bound looks green but no longer exercises the adversarial region (price crash → liquidation; many positions → double-count).

**How to avoid:**
Enforce `.tree`-before-impl as a phase entry gate in every wrapper phase (P1–P3): the `.tree` for the wrapper's open/close/claim/health-handler must be committed and reviewed before the corresponding `.sol`. Make the invariants from Pitfalls 2/3/5 *named, committed* fuzz/invariant tests (`invariant_userClaimsBackedByCollateral`, `invariant_residualNeverExceedsHoldings`, `invariant_dataCostConserved`) and treat any narrowing of their bounds as a reviewable change, not a quiet edit. Keep a fixed fuzz-run floor in CI. The CLAUDE.md three-step review gate on each phase plan should explicitly check that the `.tree` enumerates the involuntary-close and multi-position branches.

**Warning signs:**
A `.sol` file with a newer git timestamp than its `.tree`; `vm.assume` clauses that exclude price-crash or multi-position cases; fuzz `runs` reduced in a commit message about "flaky test"; invariants that only assert happy-path equalities.

**Phase to address:** Every wrapper phase (P1, P2, P3). It's a process gate, not a feature — the roadmapper should encode "`.tree` committed + reviewed before impl" as a per-phase exit criterion.

---

### Pitfall 9: Borrowing Panoptic code under BUSL-1.1 — the licensing pitfall (concrete)

**What goes wrong:**
The plan is to "borrow the Panoptic data model" and run "our own implementation deployed on Celo against the real cCOP pool" (PROJECT.md v2.0 Goal). Panoptic v1-core's core contracts — `PanopticPool.sol`, `CollateralTracker.sol`, `FeesCalc.sol`, `PanopticMath.sol`, `SemiFungiblePositionManager.sol` — are licensed **BUSL-1.1** (verified: SPDX `BUSL-1.1` in the v1.0.x source; LICENSE file confirms). BUSL-1.1 permits copy/modify/derivative/**non-production** use but **forbids production use** unless it falls under the Additional Use Grant (published on-chain at `v1-license-grants.panoptic.eth`) — otherwise "you must purchase a commercial license from the Licensor." The Change Date (BUSL → GPL conversion) is **the earlier of 2027-09-07 or a date at `v1-license-date.panoptic.eth`**. Deploying a derivative of the core contracts to a live Celo mainnet against a real cCOP pool, taking real user deposits, is **production use** and a likely license violation. Only the interfaces / tokens / `Multicall.sol` are GPL; the math and pool logic — exactly what this milestone borrows — are not.

**Why it happens:**
"Source-available on GitHub" reads as "open source" to engineers; the SPDX tag is in each file header but is easy to skip. The feasibility brief flagged licensing as a boundary condition (MATH.md §7 "licensing … as boundary conditions") but did not name BUSL or the production-use restriction. The v2 plan explicitly aims at a real Celo deployment against the real pool — the one mode BUSL prohibits without a grant.

**How to avoid (concrete):**
1. **Keep v2 strictly non-production.** A Foundry **mainnet-fork demo** (FEASIBILITY-v1's recommended path) is non-production use and is permitted under BUSL-1.1 — scope v2 there and document it. This aligns with PROJECT.md's own "Out of scope: Panoptic-on-Celo port" and DRAFT §9.
2. **Read `v1-license-grants.panoptic.eth` before any non-fork deployment.** Resolve the ENS text record (it defines exactly which production uses are granted, e.g. specific chains/integrations). Record the resolved grant text + fetch timestamp in the repo (same provenance discipline as the rest of the project).
3. **Prefer composition over derivation for any live path.** Calling a *canonical, already-deployed* Panoptic instance (the "clean future swap to real Panoptic for pool creation" in PROJECT.md's Goal) is integration, not redistribution of BUSL code — that is the licensing-clean route to production. The license risk attaches to *copying/modifying and deploying the core contracts*, not to calling Panoptic's own deployment.
4. **License-tag the wrapper.** The wrapper (our code) gets its own license; any ported BUSL files retain their BUSL header and a NOTICE file documenting provenance, source tag, and the Change Date. Do not relicense Panoptic code.
5. **If real-cCOP production is ever in scope:** purchase a commercial license OR wait for the Change Date (≤ 2027-09-07) OR deploy only against a canonical Panoptic instance. Surface this as an explicit go/no-go to the user before any mainnet step.

**Warning signs:**
A ported `PanopticPool.sol`/`CollateralTracker.sol` with the BUSL header stripped or relicensed; a plan step that deploys borrowed core contracts to Celo mainnet with real deposits; no record of resolving `v1-license-grants.panoptic.eth`; "it's on GitHub so it's open source" in any planning doc.

**Phase to address:** P0 (fork-harness / project setup) — the non-production scoping and the BUSL NOTICE must be established before any Panoptic code is ported. The ENS-grant resolution gates P6 (any real-pool/Celo step). This is a BLOCKER-class gate for the milestone's deployment ambitions and should be surfaced to the user explicitly.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Re-implement streamia with a constant spread multiplier | Skip reading SFPM/FeesCalc source | Residual diverges from actual burn debit; LP mispriced; insolvency | Never — read from the contract's own accounting |
| Demo only on ETH/USDC, claim cCOP-ready | Fast green demo | Thin-pool manipulation/depeg never tested; false readiness | OK for v2 fork demo IF documented as not-cCOP-validated |
| Hard-code the CPI→FX coefficient | Sizing "works" in demo | Sizing on noise; thesis unvalidated; rework when M1 calibrates | OK only as a config-backed *default*, flagged `linkage_validated: false` |
| Deploy borrowed BUSL core to a live chain for a "quick test" | Real-pool data fast | License violation; production-use breach | Never — use a fork (non-production) or call canonical Panoptic |
| Skip the second Reactive auth check (RVM-id) on testnet | Faster cross-chain bring-up | Forgeable callbacks; carries into mainnet | Never — both checks from day one |
| One φ_data/hedgeCost variable | Simpler residual code | Double-charges users; conservation breaks at N positions | Never — disjoint line items with a conservation test |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Panoptic `mintOptions` / `CollateralTracker` | Owning the position/shares as EOA or `tx.origin` | Wrapper is the account; assert `positionIdList(wrapper)` + 4626 `balanceOf(wrapper)`; user claim is internal |
| Panoptic burn / settlement | Computing residual from `deposit`, assuming voluntary burn | Read surviving collateral at actual close; handle `forceExercise`/`settleLongPremium`/liquidation branches |
| Uniswap-v3 cCOP pool (Celo) | Reading `slot0` spot for mark/health | TWAP over a manipulation-cost-bounded window; liquidity-floor pre-flight; depeg circuit-breaker |
| Reactive Network callback | Single auth check (or none) on the destination | `msg.sender == CallbackProxy` AND RVM-id match AND per-message nonce (CEI consume-before-act) |
| x402 payment leg | Base in MATH.md, Celo in sibling repo — left unreconciled | Pick one chain id explicitly in P5 pre-decision; reject deposits from non-canonical chain |
| TE / MacroOracle data cost | Charging the fixed $199 per position | $199 → mutualized φ_data (premium/vault); per-position residual deducts only *incremental* metered cost |
| Panoptic v1-core source | Treating "GitHub" as open-source | BUSL-1.1: fork-demo OK (non-production); production needs ENS grant / commercial license / Change Date |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Streamia spread multiplier spikes in a thin pool | Premium debit far exceeds the over-funded cap mid-epoch; wrapper underwater | Size the over-funded cap against the worst-case multiplier (crowded long); cap exposure per pool-liquidity | Few sellers / crowded long on a thin pool |
| Per-position keeper rebalance fetches not mutualized | Data cost scales linearly with positions; φ_data doesn't decrease | Shared cache (one TE fetch → many positions); meter only incremental rows per position | Cooperative volume grows but cache hit-rate is low |
| Fork tests too slow → fuzz runs cut | CI green but adversarial region untested | Fixed fuzz-run floor; separate fast unit invariants from slow fork integration | As wrapper surface grows in P2/P3 |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Unauthenticated / single-check cross-chain callback | Forged surprise/fund message → unauthorized mint or escrow drain | Both Reactive auth checks + nonce dedupe (Pitfall 6) |
| Spot-price mark on a thin cCOP pool | Mark manipulation triggers liquidation/forceExercise of wrapper, or cheap optionality mint | TWAP + liquidity floor + depeg breaker (Pitfall 4) |
| Residual promised on `deposit`, not surviving collateral | Wrapper insolvency on involuntary close; user shortfall | Compute residual from actual holdings post-close (Pitfall 3) |
| Wrapper holds position but `sweep`/egress missing or open | Trapped funds OR anyone drains residual | Owner-gated egress + per-user claim accounting (reuse `SomniaAgentConsumer` CEI/sweep pattern) |
| Replayed cross-chain message | Duplicate position / double payout | Per-message nonce consumed before action (CEI) |
| Deploying BUSL core to production | Legal exposure / forced takedown | Fork-only v2; ENS-grant resolution before any live path (Pitfall 9) |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| "Premium" framing when the user posts collateral | User expects fixed cost; gets a variable residual + possible early erosion | Label deposit as *collateral / over-funded cap*; show residual as computed-at-close; emit `ResidualEroded` on involuntary debit |
| Silent residual erosion from forceExercise/liquidation | User can't tell why they got back less | Event + reason code on every involuntary close; off-chain readout of surviving collateral |
| Cross-chain payment on the wrong chain | Funds appear stuck | Reject + clear revert reason on non-canonical chain id; document the canonical chain |

## "Looks Done But Isn't" Checklist

- [ ] **Streamia accounting:** Often missing the lazy-at-burn settlement match — verify wrapper residual == pool's own debit to the wei after advancing blocks
- [ ] **Wrapper ownership:** Often missing the 4626/positionIdList custody assertion — verify `positionIdList(wrapper)` and `collateralTracker.balanceOf(wrapper)`, and `balanceOf(user)==0`
- [ ] **Involuntary close:** Often missing forceExercise/settleLongPremium/liquidation branches — verify a `.tree` branch + fork test for each, residual = surviving collateral − costs
- [ ] **Data-cost conservation:** Often missing the N-position double-count check — verify `Σφ_data + ΣhedgeCost == totalDataSpend`
- [ ] **Cross-chain auth:** Often missing the second (RVM-id) check and replay nonce — verify forged-sender, wrong-RVM-id, and replayed-nonce all revert
- [ ] **Chain reconciliation:** Often missing the Base-vs-Celo decision — verify the canonical x402 chain id is fixed and enforced
- [ ] **CPI→FX linkage:** Often missing the `linkage_validated:false` flag — verify the coefficient is config-backed, not hard-coded
- [ ] **License:** Often missing the BUSL NOTICE + ENS-grant record — verify ported files retain BUSL headers and v2 is scoped as fork/non-production
- [ ] **cCOP mark:** Often missing TWAP/liquidity-floor/depeg breaker — verify no `slot0`-spot in health/settlement paths

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Streamia re-derived wrong | MEDIUM | Replace independent formula with read-from-contract-at-burn; re-run residual fork tests to wei |
| Wrapper-owns-position wired to EOA | HIGH | Often a redesign of the custody layer; rewrite open/close/claim against wrapper-as-account; redo P1 `.tree` |
| Residual promised on deposit (insolvency) | HIGH | Re-architect `claimResidual` to read surviving collateral; add involuntary-close branches; possibly socialize the loss for already-promised positions |
| Data-cost double-count | LOW | Split φ_data/hedgeCost into disjoint ledger lines; add conservation invariant |
| Cross-chain auth missing | MEDIUM | Add both checks + nonce; security re-review; redeploy destination contract |
| BUSL production deployment shipped | HIGH | Take down; resolve ENS grant or buy commercial license or revert to fork/canonical-Panoptic integration |
| CPI→FX hard-coded | LOW | Externalize coefficient to config/MacroOracle; add validation flag |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| 1 — streamia/VEGOID re-derived | P2 (streamia/residual) | Fork test: residual == pool debit to the wei after N blocks |
| 2 — wrapper-owns-position | P1 (custody) | `positionIdList(wrapper)` + 4626 `balanceOf(wrapper)`>0, `balanceOf(user)==0` |
| 3 — involuntary-close erosion | P1 (`.tree`) → P2 (test) | Fork tests for forceExercise / settleLongPremium / liquidation; residual = surviving − costs |
| 4 — cCOP pool realities | P6 (real pool); design in P1 | TWAP mark, liquidity-floor gate, depeg breaker present; no spot in health path |
| 5 — data-cost double-count | P3 (hedge metering) | Conservation test `Σφ_data + ΣhedgeCost == totalDataSpend` |
| 6 — cross-chain trust | P5 (cross-chain); pre-decision before P5 | Forged-sender / wrong-RVM-id / replay / wrong-chain-id all revert |
| 7 — CPI→FX assumed | P4 (sizing); validation in M1/M2 | Coefficient config-backed; `linkage_validated:false`; success criteria say "assumed" |
| 8 — evm-tdd lapse | P1, P2, P3 (process gate) | `.tree` committed + reviewed before each `.sol`; named invariants; fuzz-run floor in CI |
| 9 — BUSL license | P0 (scoping/NOTICE); gates P6 | BUSL headers retained; NOTICE file; v2 = fork/non-production; ENS grant resolved before any live path |

## Sources

- [Streamia | Panoptic](https://panoptic.xyz/docs/product/streamia) — streamia = Uniswap fees × spread multiplier driven by liquidity utilization; settled lazily (HIGH)
- [Impact of Fixed Vega Parameter · code-423n4/2023-11-panoptic #29](https://github.com/code-423n4/2023-11-panoptic-findings/issues/29) — VEGOID is a fixed constant = 2 in SFPM (HIGH)
- [panoptic-v1-core/contracts/CollateralTracker.sol @ v1.0.x](https://github.com/panoptic-labs/panoptic-v1-core/blob/v1.0.x/contracts/CollateralTracker.sol) — ERC-4626 collateral vault, BUSL-1.1 SPDX (HIGH)
- [panoptic-v1-core/contracts/libraries/FeesCalc.sol @ v1.0.x](https://github.com/panoptic-labs/panoptic-v1-core/blob/v1.0.x/contracts/libraries/FeesCalc.sol) — fees/premium calc, BUSL-1.1 (HIGH)
- [panoptic-v1-core LICENSE (BUSL-1.1)](https://github.com/panoptic-labs/panoptic-v1-core/blob/v1.0.x/LICENSE) — production use restricted; Change Date ≤ 2027-09-07; Additional Use Grant at `v1-license-grants.panoptic.eth` (HIGH)
- [Business Source License 1.1 | SPDX](https://spdx.org/licenses/BUSL-1.1.html) — BUSL terms (HIGH)
- [GitHub - panoptic-labs/panoptic-v1-core](https://github.com/panoptic-labs/panoptic-v1-core) — repo, mixed BUSL (core) + GPL (interfaces/tokens/Multicall) (HIGH)
- [Reactive Contracts | Reactive Network](https://dev.reactive.network/reactive-contracts) — callback auth via Callback Proxy + RVM-id check (MEDIUM)
- [Reactive Library | Reactive Network](https://dev.reactive.network/reactive-library) — `_callback_sender` / vendor auth pattern (MEDIUM)
- Project docs: `.planning/PROJECT.md` (v2.0 Goal + honest constraints), `DRAFT.md` (§5/§6/§9/§10), `MATH.md` (chains, premium split), `research/macro-markets-colombia/FEASIBILITY-v1.md` (four required changes, residual risks), `research/macro-markets-colombia/INSTRUMENT-v1.md` (φ_data, Base-vs-Celo open decision, CPI-surprise assumption)

---
*Pitfalls research for: borrowed-Panoptic long-gamma escrow wrapper + cross-chain payment layer (v2.0 convex instrument)*
*Researched: 2026-06-01*
