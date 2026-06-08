# Phase 8: LongGammaWrapper cash-flow - Context

**Gathered:** 2026-06-02
**Status:** Ready for planning — PASSED the three-step planning-review gate (r3: Reality Checker PASS + Blockchain Security Auditor PASS)
**Revision:** r3 — two planning-review gate passes (Reality Checker + Solidity Smart Contract Engineer). r1 BLOCKERs B1–B4 + MAJORs M1–M2 resolved in r2; r2's gate then surfaced N1 (BLOCKER, trapped-funds: no voluntary-close entrypoint) + N2/N3 (MAJOR), resolved in r3. See `<review_resolutions>`.

<domain>
## Phase Boundary

A `LongGammaWrapper` contract owns a long-gamma Panoptic-V2 position on the user's behalf, against the Phase-7 borrowed-Panoptic skeleton + cCOP/USDC UniV4 demo pool on a Base fork: deposit upfront collateral → mint `isLong=1` → **read** streamia from the borrowed contract's own accounting → settle/close (voluntary burn + the three involuntary branches) → residual computed from *surviving* collateral at actual close, tolerating every involuntary path. Fork/testnet ONLY, never production (BUSL borrow permitted).

**Close vs erosion (source-verified, load-bearing):** the three involuntary branches do NOT all close the position:
- **`settleLongPremium`** (`_settlePremium`, PanopticPool.sol L1671-1703) — burns shares for premium + refunds; **never calls `_burnOptions`** → `numberOfLegs(wrapper)` UNCHANGED → position stays **Open**. This is a *mid-life erosion*, not a close.
- **`forceExercise`** (`_forceExercise`, L1598-1664 calls `_burnOptions` L1611) — removes the exercised leg → with the demo's single long leg, `numberOfLegs → 0` → **closes**.
- **liquidation** (`_liquidate`, L1482+) — burns all positions → **closes**.

Out of scope (later phases): premium split / `CapitalRemunerationVault` / φ_data (Phase 9), the metered hedge-data cost *value* (Phase 9 — Phase 8 builds only the deduction hook + interface), `MacroOracle` surprise + `PositionBuilder` sizing (Phase 10), x402 entry (PAY-01), Reactive cross-chain (XCHAIN-01), live delta-hedge (HEDGE-01).

</domain>

<decisions>
## Implementation Decisions

### Tenancy & lifecycle
- **Single-position demo.** One wrapper instance = one open position, one beneficiary. Internal ledger is a single `(address user, deposited0, deposited1, lastSurviving0, lastSurviving1, ...)` record — NOT a per-user mapping.
- **One-shot.** The wrapper opens exactly one position over its lifetime; after `claimResidual()` the wrapper is spent (no re-open).
- **Explicit `user`.** The beneficiary is an explicit `address user` stored at deposit, distinct from the deployer/caller, so the WRAP-01 custody assertions are meaningful (`ct.balanceOf(user) == 0` while `ct.balanceOf(wrapper) > 0`).
- **State machine (corrected for settle-stays-open):**
  `Uninitialized → Open → Closed → Claimed`, where:
  - `Open → Closed` fires on ANY event that drops `numberOfLegs(wrapper)` to 0 — the wrapper's own `close()` (voluntary burn), `forceExercise` (single leg), or liquidation.
  - **`settleLongPremium` does NOT transition state** — it stays `Open` and may fire repeatedly across the position's life; each occurrence is an *erosion*, surfaced via `syncResidual()` (below), never a close.
  - `claimResidual()` requires `Closed` (`numberOfLegs(wrapper) == 0`); calling it while `Open` reverts.
- **`close()` is a MANDATORY wrapper entrypoint (its existence is LOCKED, closes review BLOCKER N1 / satisfies ROADMAP SC-5).** Because the position is `msg.sender`-keyed to the wrapper (`s_positionBalance[wrapper][tokenId]`), ONLY the wrapper can voluntarily burn it — it calls `dispatch` with `positionSizes[i] != storedSize` (size→0) (PanopticPool.sol L646-658). Without `close()`, a healthy long that no third party ever force-exercises or liquidates sits **Open forever**, `claimResidual` reverts permanently, and the user's surviving collateral is unrecoverable (trapped funds). `close()` is gated to the stored **`user`** (the economic decision to unwind the hedge is the beneficiary's); `claimResidual()` remains caller-agnostic (anyone may trigger the post-close payout, which always goes to `user`). The WRAP-04 test drives the voluntary close through `close()`, NOT a `vm.prank`'d raw `dispatch` (keeps the swap seam + gives the user a guaranteed exit). Signature is Claude's discretion; existence is not.
- The named invariant `invariant_userClaimsBackedByCollateral` reduces to the single user's claim ≤ wrapper surviving collateral (no Σ over many users in v1).

### v1 cost composition (residual formula) — two-token, external meter
- **Zero wrapper-side cost in v1.** Residual = surviving collateral exactly. Streamia + commission are ALREADY netted into the wrapper's 4626 share balance by the pool's `settleBurn` (CollateralTracker.sol L1595); the wrapper MUST NOT subtract them again (double-count trap, RESEARCH Pattern 7).
- **Per-token residual** (NOT a scalar): `residual0 = max(surviving0 − cost0, 0)`, `residual1 = max(surviving1 − cost1, 0)`, where `surviving_i = ct_i.convertToAssets(balanceOf(wrapper))`. cCOP is 18dp, USDC is 6dp; token0/token1 ordering is runtime-set by `PoolKeyLib`. Costs and survivings are in each token's native decimals — never mixed.
- **Cost enters via an external `ICostMeter` module**, with the auth/timing/shape pinned (closes review MAJOR M1/M2):
  - `ICostMeter.cost(address position) → (uint256 cost0, uint256 cost1)` returns each token's cost in native decimals; **zero-address meter ⇒ `(0, 0)`** (the v1 default).
  - **Owner = deployer** (constructor-set). `setCostMeter(address)` is owner-gated **and callable ONLY while state == `Uninitialized`** (frozen at first deposit/open) — so the meter can never be swapped mid-position to retroactively cut the user's payout (anti-griefing). Emits `CostMeterSet(address meter)`.
  - Phase 9 deploys the real metered-hedge-data meter and wires it at construction — no wrapper signature change.
- The `199` mutualized φ_data constant NEVER appears in this per-position deduction (that is the Phase-9 vault line, a disjoint ledger item).

### Residual payout surface — pull, redeem to assets, cap-aware
- **Pull, redeem to assets.** `claimResidual()` is caller-agnostic (anyone may trigger; proceeds always go to the stored `user`). It requires `numberOfLegs(wrapper) == 0`, computes the per-token residual, redeems the wrapper's 4626 shares to underlying token0/token1, and transfers the assets to `user`. The wrapper is `msg.sender == owner` of the shares, so `redeem(shares, user, address(wrapper))` is authorized.
- **Cap-aware redeem (closes review BLOCKER B4):** `maxRedeem(wrapper)` is floored by the pool-wide `s_depositedAssets − 1` (CollateralTracker.sol **L795-802**; the sibling `maxWithdraw` at L651-657 carries the identical floor in asset terms), so a naive `redeem(balanceOf(wrapper))` can revert `ExceedsMaximumRedemption` (L823). The wrapper redeems `min(residualShares, maxRedeem(wrapper))` per token, and **the test harness closes/burns the seeded seller short before the wrapper's claim** so `s_depositedAssets` is freed. Any un-redeemable remainder (cap still binding) stays as shares and is reported, never reverts the claim.
- **Idempotent.** A `claimed` flag guards against double-payout.
- Surviving collateral is ALWAYS read as `convertToAssets(balanceOf(wrapper))` through the OZ `IERC4626`/`IERC20` seam (NOT the concrete `assetsOf`), at actual close — never derived from the upfront deposit (WRAP-04 / P3).

### Events (the Phase-9 + demo integration seam) — with an erosion-observation entrypoint
- **`syncResidual()` permissionless poke (closes review BLOCKER B2 / Solidity M3):** because involuntary debits are triggered by third parties calling `dispatchFrom` *directly on the pool* (the wrapper's code does not execute during the debit), the wrapper cannot observe erosion synchronously. `syncResidual()` is a permissionless function that re-reads `surviving0/1`, and if either dropped below the stored `lastSurviving`, emits `ResidualEroded` and updates the checkpoint. `claimResidual()` also runs this reconciliation as its first step.
- **Checkpoint semantics — `lastSurviving` is last-OBSERVATION, not a high-water mark (closes review MAJOR N3):** `surviving = convertToAssets(balanceOf(wrapper))` is NOT monotone — fee accrual the wrapper later collects, share-price drift from other pool activity, or the available-premium cap releasing previously-capped premium can make it RISE between pokes. So `lastSurviving` is updated to the *current* reading on EVERY `syncResidual()`/`claimResidual()` call (last-observation), and `ResidualEroded` fires when `current < stored` — i.e. `eroded` is a **per-interval delta**, NOT a cumulative-erosion guarantee. Phase 9 must treat the `ResidualEroded` magnitude as **advisory** (an erosion *signal*), never as a ledger total; the authoritative residual is always the live `convertToAssets(balanceOf(wrapper))` recomputed at claim. Fund safety is unaffected (residual is read live at claim), only the event magnitude is approximate.
- Lifecycle events:
  - `PositionOpened(address indexed user, TokenId tokenId, uint256 deposited0, uint256 deposited1)` — `TokenId` is `type TokenId is uint256`, a valid (and indexable) event arg; the wrapper already imports `@types/TokenId.sol` for the builder.
  - `ResidualEroded(address indexed user, uint256 eroded0, uint256 eroded1, bytes32 cause)` — emitted by `syncResidual()`/`claimResidual()` when `surviving < lastSurviving`. ROADMAP-mandated.
  - `ResidualClaimed(address indexed user, uint256 paid0, uint256 paid1)` — on payout.
- **`cause` grounding — COARSE demo label, not a clean 3-way inference (closes review MAJOR N2):** the wrapper cannot read its own past pool logs on-chain. In production `cause` is a **coarse heuristic** from state deltas, and it explicitly **CANNOT distinguish a voluntary `close()` from an adversarial `forceExercise`** on state-delta alone — both produce "legs gone + surviving dropped." It can only separate *settle* (legs unchanged + surviving dropped) from *a close* (legs → 0), and guess liquidation from (legs → 0 + surviving ≈ 0). This is acceptable ONLY as a Phase-9 integration-seam label, never for fund logic. In the fork tests `cause` is asserted exactly **because the harness knows which branch it drove** — so the wei-exact test assertion proves nothing about the production heuristic; the two are decoupled, and this demo-vs-prod gap is stated, not glossed.

### Demo long-leg economics
- **Mint OTM, then swap into range** — *hypothesis to prototype, not a settled constant* (review MAJOR M2 / RESEARCH Pitfall 4 "tension to resolve in the plan"): mint the long slightly OTM + tickSpacing-aligned (dodges the ITM-at-mint SFPM ERC6909 claim-burn underflow), THEN swap the pool price INTO the chunk via a `V4SwapHelper` so `feeGrowthInside` advances and streamia becomes observable. The exact OTM offset that both mints cleanly AND lands in fee-range is unspecified; the planner budgets prototype iterations against the fork.
- **Seller short is a hard prerequisite, seeded before the long mint, size ≥ long size** (else `NotEnoughLiquidityInChunk()`, SFPM L965-988). [Planner decides] EOA-vs-helper mechanism + narrative framing — locked only that it is a test-harness seed at the wrapper's target chunk, size ≥ long, and (per B4) closeable before the wrapper's `claimResidual` to free the redeem cap.

### Security guardrails (LOCKED — from the r3 Blockchain Security Auditor PASS)
- **Reentrancy + CEI:** `claimResidual()` / `close()` / `syncResidual()` carry a `nonReentrant` guard, and `claimResidual` applies effects-before-interactions — set the `claimed` flag and run the `syncResidual` reconciliation BEFORE the `redeem` calls. The demo's two-ERC20 pool exit (`redeem` → `poolManager.take`) is callback-free, but the borrowed `unlockCallback` carries a raw `safeTransferETH` branch for native currency (CollateralTracker.sol L464) — the guard is cheap insurance if a later phase ever repoints the wrapper at a native-ETH `CollateralTracker`.
- **Callable-`user` precondition:** v1 assumes `user` is an EOA (or a contract able to originate the `close()` call). Because `close()` is the user's only *voluntary* exit and `claimResidual` requires `numberOfLegs==0`, a non-callable contract `user` whose position never involuntarily closes would re-introduce the N1 trap by a different door. Document this; out of v1 scope to mitigate further (single-EOA demo).
- **`close()` dispatch args:** the voluntary-burn `dispatch` uses the plain `bool usePremiaAsCollateral = false` + `builderCode = 0` (PanopticPool.sol L577, the Phase-7-proven values) — NOT the `LeftRightUnsigned` form used on `dispatchFrom`. Avoids an accidental premia-as-collateral solvency path and keeps the wei-exact `OptionBurnt.premiaByLeg` assertion unperturbed by a risk-parameter lookup.

### Claude's Discretion
- Exact `deposit()` / `close()` / `claimResidual()` / `syncResidual()` / `setCostMeter()` Solidity signatures and modifier set, beyond the semantics fixed above (the EXISTENCE of `close()` is LOCKED, per N1; only its signature is discretionary).
- `ICostMeter` interface details beyond the locked `cost(address) → (cost0, cost1)` + zero-address ⇒ (0,0) shape.
- Seller-short seeding mechanism (EOA vs helper) and narrative framing.
- Exact OTM offset / width / size numbers, subject to tickSpacing-alignment + solvency constraints.
- **Streamia wei-exact assertion strategy (review BLOCKER B3 — sign/type correctness required):** `OptionBurnt.premiaByLeg` is `LeftRightSigned[4]` (PanopticPool.sol L73-78; `type LeftRightSigned is int256`) and long premia are **negated** in `_getPremia` (L2061-2063), whereas the wrapper's recorded `longPremium` is `LeftRightUnsigned` (uint128 slots). The assertion MUST (a) select the correct long-leg index in the `[4]` array, and (b) normalize sign (abs of the negated signed slot) before `assertEq` against the unsigned recorded figure. **Plus a directional fallback** (`residual moved with fees` / monotonic erosion) so WRAP-03 is not gated solely on an unproven wei-exact equality (RESEARCH Open Question 1, MEDIUM confidence; the available-premium cap may make owed ≠ settled).
- Fork-state manipulation to DRIVE each involuntary branch (insolvent-at-all-ticks for liquidation; out-of-range-exercisable long for forceExercise) — RESEARCH Open Question 2; prototype against `getOracleTicks` reads. Highest-risk fork task; budget iterations and a sizeable-position-vs-collateral ratio.

</decisions>

<review_resolutions>
## Planning-Review Gate — how the r1 findings were resolved

Gate: Studio Producer selected **Solidity Smart Contract Engineer** (primary) + **Reality Checker** (fixed). Both returned NEEDS WORK on r1. Resolutions:

- **B1 (state machine vs settle-stays-open)** → §Domain "Close vs erosion" + §Lifecycle corrected state machine: settle is a mid-life erosion (position stays Open), only burn/forceExercise/liquidation are terminal.
- **B2 / Solidity-M3 (ResidualEroded has no trigger)** → §Events `syncResidual()` permissionless poke + checkpoint; emit lazily, reconcile at claim.
- **B3 (streamia sign/type error)** → §Discretion: long-leg index + signed→unsigned abs normalization required; directional fallback assertion added.
- **B4 (pool-wide maxRedeem cap)** → §Payout cap-aware redeem `min(residualShares, maxRedeem)` + close seller short first.
- **M1 (ICostMeter auth/timing)** → §v1 cost: owner=deployer, `setCostMeter` frozen before Open, `CostMeterSet` event. (User's external-module decision KEPT; auth gap closed rather than reverting to an internal hook.)
- **M2 (scalar vs two-token / decimals)** → §v1 cost: per-token residual `(cost0, cost1)` in native decimals; `ICostMeter.cost` returns a pair.
- **M2-confidence (mislabeled locked mechanics)** → §Demo + §Discretion: "mint OTM then swap", wei-exact streamia, liquidation-driving relabeled as hypotheses-to-prototype.
- **Minors** → ROADMAP SC-1 `positionIdList` superseded note (below); `getOracleTicks` promoted to RECOMMENDED (it backs the involuntary-driving strategy) with an `OraclePack` remapping-resolves check before the optional extension is committed; canonical tree count stated in `<code_context>`; `cause` heuristic documented.

### r3 — resolving r2's gate (Solidity Engineer PASS+folds; Reality Checker NEEDS WORK)
- **N1 (BLOCKER — both reviewers: no wrapper voluntary-close → trapped funds + ROADMAP SC-5 unmet)** → §Lifecycle: `close()` added as a MANDATORY, existence-LOCKED, user-gated wrapper entrypoint (voluntary burn via `dispatch` size→0); WRAP-04 test drives it (not a `vm.prank`'d raw `dispatch`); §Discretion + §IntegrationPoints surfaces updated; tree count 7→8.
- **N2 (MAJOR — `cause` heuristic over-claims)** → §Events: `cause` downgraded to a coarse demo-only label that CANNOT distinguish voluntary `close()` from `forceExercise` on state-delta; demo-vs-prod decoupling stated.
- **N3 (MAJOR — `syncResidual` checkpoint vs `convertToAssets` non-monotonicity)** → §Events: `lastSurviving` pinned as last-OBSERVATION (updated every poke); `ResidualEroded` magnitude is a per-interval delta, ADVISORY for Phase 9; authoritative residual is the live read at claim.
- **Solidity MINOR-2 (citation precision)** → `maxRedeem` ref corrected to CollateralTracker L795-802 (L651-657 is `maxWithdraw`); stale `IPanopticData` "@L221" comment flagged for the drive-by fix → L431.
- **Solidity MINOR-1** = N1 (the close-entrypoint existence lock) — same fix.
- **Verified-RESOLVED by both r2 reviewers (no further action):** B1, B2, B3 (Solidity confirmed it's *stronger* than stated — the long-leg slot isn't capped, so the read-vs-read equality is lossless), B4, M1, M2.

</review_resolutions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase-8 design authority + requirements
- `.planning/phases/08-longgammawrapper-cash-flow/08-RESEARCH.md` — the load-bearing research: streamia READ getter (`getAccumulatedFeesAndPositionsData().longPremium`), the WRAP-02 seller-seed blocker, the three `dispatchFrom` involuntary signatures + disambiguation, the surviving-collateral residual + double-count trap, all 7 patterns + 5 pitfalls + Validation Architecture (Req→Test map, Wave-0 gaps), Open Questions 1–3.
- `.planning/ROADMAP.md` §"Phase 8" — Goal, Success Criteria 1–5, Notes (P1/P2/P3/P8). **SC-1's `positionIdList(wrapper)` wording is SUPERSEDED** by RESEARCH correction #1 — no such public getter exists; prove custody via `numberOfLegs(wrapper) > 0` + a length-1 `PositionBalance[]` from `getAccumulatedFeesAndPositionsData`. The verify-work gate must use the superseding assertion, not the stale ROADMAP literal.
- `.planning/REQUIREMENTS.md` — WRAP-01..04 verbatim + traceability.
- `research/macro-markets-colombia/FEASIBILITY-v1.md` — cash-flow design authority (wrapper-owns-position; no-upfront-premium / over-funded cap).
- `research/macro-markets-colombia/INSTRUMENT-v1.md` — the φ_data hook semantics consumed in Phase 9 (the `ICostMeter` interface is built here for that).

### Domain non-negotiables
- `CLAUDE.md` §"Domain non-negotiables (from SOMNIA_DRAFT)" — streamia READ-from-contract hard constraint, BUSL non-production scoping.

### Phase-7 substrate (the build-ON layer)
- `contracts/test/instrument/helpers/PanopticV2DeployHelper.sol`, `helpers/PoolKeyLib.sol`, `helpers/V4LpHelper.sol` — deploy choreography + pool key + raw-LP seed.
- `contracts/test/instrument/PanopticDataSeamBase.sol` — M-3 deploy-isolation base (the wrapper test extends this pattern; imports NEITHER `panoptic-borrowed` NOR the helper directly).
- `contracts/test/instrument/PanopticDataSeam.fork.t.sol` — verbatim `deal`→approve→`ct.deposit`→build `TokenId`→`dispatch` flow to reuse with `isLong=1` + seller seed.
- `contracts/src/instrument/interfaces/IPanopticData.sol` — the wrapper's ONLY view of the pool. EXTEND only with `getOracleTicks` (RECOMMENDED — backs involuntary-branch state monitoring; import `@types/OraclePack.sol`, confirm remapping resolves first). No new streamia getter — `longPremium` is canonical.
- `.planning/phases/07-base-fork-borrowed-panoptic-v2-ccop-usdc-pool/07-RESEARCH-DEPLOY.md` §D/§E/§A.

### Borrowed V2 source (vendored, pinned @fe55774; cite for any read/entry)
- `contracts/panoptic-borrowed/PanopticPool.sol` — `getAccumulatedFeesAndPositionsData` L431, long branch L524-534, `dispatch` L572, `_mintOptions` L717, `_burnOptions` L876, `dispatchFrom` L1360-1476, `_liquidate` L1482, `_forceExercise` L1598-1664 (`_burnOptions` L1611), `_settlePremium` L1671-1703 (NO `_burnOptions` — settle stays open), `_getPremia` L1998-2069 (long negation L2061-2063), `getOracleTicks` L1899, `numberOfLegs` L1921, `OptionBurnt` event L73-78 (`LeftRightSigned[4] premiaByLeg`).
- `contracts/panoptic-borrowed/CollateralTracker.sol` — `convertToAssets` L527, `deposit` L557, `maxWithdraw` L651-657 (asset-denominated cap) / **`maxRedeem` L795-802 (share-denominated; same pool-wide `s_depositedAssets−1` floor — use this for the share-cap math)**, `redeem` L817-858 (`ExceedsMaximumRedemption` L823; wrapper is `msg.sender==owner` so the allowance branch L826 is skipped), `settleBurn` L1595, share-burn + `NotEnoughTokens` L1474-1488.
- `contracts/panoptic-borrowed/SemiFungiblePositionManagerV4.sol` — long branch + `NotEnoughLiquidityInChunk` L965-988, `getAccountPremium` L1216-1304.
- `contracts/panoptic-borrowed/types/LeftRight.sol` — `LeftRightSigned`/`LeftRightUnsigned`, `rightSlot`/`leftSlot` L38/L100; `TokenId.sol` (`type TokenId is uint256`).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `PanopticV2DeployHelper` + `PoolKeyLib` + `V4LpHelper` (Phase 7): deploy the borrowed V2 stack + cCOP/USDC pool + raw full-range LP.
- `PanopticDataSeamBase.sol` (Phase 7): M-3 deploy-isolation base. A `LongGammaWrapperBase.sol` extends this pattern AND seeds the seller short at the wrapper's target chunk (closeable before claim, per B4).
- `PanopticDataSeam.fork.t.sol` (Phase 7): proven mint/burn-through-`IPanopticData` flow; reused with `isLong=1`.
- `IPanopticData.sol`: already exposes `dispatch`, `dispatchFrom` (all 3 involuntary, `LeftRightUnsigned` payable), `numberOfLegs`, `getAccumulatedFeesAndPositionsData`. Only `getOracleTicks` is a candidate addition.
- OZ `IERC4626`/`IERC20` (remapped Phase 7): `deposit`, `convertToAssets`, `balanceOf`, `redeem`, `maxRedeem` — the collateral seam, no concrete import.

### Established Patterns
- **Swap seam intact** (FORK-03): wrapper + tests import NEITHER `panoptic-borrowed` NOR the deploy helper — only `IPanopticData` + `IERC4626`/`IERC20` (+ `@types/TokenId.sol`, `@types/OraclePack.sol` for the optional getOracleTicks — borrowed *types*, not concretes, consistent with the existing interface). A grep guard enforces this.
- **evm-tdd Iron Law** (P8): each `.tree` committed BEFORE its `.sol`/`.t.sol`; bulloak 0.9.2 same-dir full-stem co-location. **Canonical count = 8 trees**: `open`, `streamia`, `close` (voluntary-burn entrypoint, per N1), `forceExercise`, `settleLong`, `liquidation`, `claimResidual`, `invariants` (= the 7 behavioral test files + the invariants file; this is the denominator the `bulloak check` co-location gate uses — RESEARCH L105's "five close paths" counts only the close branches, not the full file set). The `close` tree may instead be folded into `claimResidual`/`open` if the planner prefers, but the voluntary-close *behavior* must have a committed branch.
- **TokenId** via the `@types/TokenId.sol` value-type builder (`addPoolId().addLeg(...)`) — Phase-7 arg order reused verbatim.
- Single `cancun`/`0.8.24` foundry profile (non-viaIR, optimizer 200); fork at `BASE_FORK_BLOCK = 46700000`, `--fork-url "$BASE_RPC_URL"`.

### Integration Points
- `src/instrument/LongGammaWrapper.sol` — the contract under test (new); needs an `owner` (deployer, effectively inert post-Open since `setCostMeter` is its only gated action and it freezes at first deposit — state explicitly that no other owner lever exists; ownership is not assumed transferable/renounceable in v1) for the `setCostMeter` freeze-before-Open gate. Surface: `deposit` / `close` (user-gated voluntary burn) / `claimResidual` (caller-agnostic) / `syncResidual` (permissionless) / `setCostMeter` (owner, pre-Open only).
- `src/instrument/interfaces/IPanopticData.sol` — `getOracleTicks` extension (import `OraclePack`); while the file is open, drive-by fix the stale interface comment citing `getAccumulatedFeesAndPositionsData` "@L221" → the vendored source has it at **L431** (CONTEXT/RESEARCH already use L431; only the interface comment is stale).
- `src/instrument/interfaces/ICostMeter.sol` — new minimal interface `cost(address) → (uint256 cost0, uint256 cost1)`; v1 wires zero-address ⇒ (0,0).
- `test/instrument/LongGammaWrapperBase.sol` + `helpers/V4SwapHelper.sol` (new) — seller-short seed (closeable) + deterministic fee generation.
- Residual feeds Phase 9 (`PremiumSplitter` / data-cost-weighted residual) via the `ResidualClaimed`/`ResidualEroded` events + the `ICostMeter` seam.

</code_context>

<specifics>
## Specific Ideas

- The wrapper is *purely long*; the seller short is ambient/test-harness liquidity, not part of the product surface (and is closed before the user's claim to free the redeem cap).
- "User holds nothing, wrapper holds everything" is the foundational custody story — the explicit `user` field (≠ deployer) makes the WRAP-01 proof unambiguous.
- The `ICostMeter` external-module choice mirrors the swap-seam ethos: v1 wrapper stays self-contained (zero-address ⇒ zero cost), Phase 9 plugs the meter in at construction. The meter is frozen before Open so it can never retroactively cut a live user's payout.
- Residual is ALWAYS read as `convertToAssets(balanceOf(wrapper))` at actual close; the demo perturbs fees and shows the residual move, proving it tracks surviving collateral, not `deposit − constant`.
- `settleLongPremium` is the subtle one: it erodes the wrapper while the position is still LIVE — the demo should show streamia being settled mid-life (position still Open, `ResidualEroded` fired via `syncResidual`), distinct from a terminal close.

</specifics>

<deferred>
## Deferred Ideas

- Multi-user / mutualized vault tenancy (per-user ledger, Σ-claim invariant) — NOT v1.
- Reusable (open→close→open) wrapper lifecycle — deferred; v1 is one-shot.
- A real wrapper-side commission / flat fee — out of v1; the cost path is the zero-default `ICostMeter` only.
- The metered hedge-data cost *value* + `PremiumSplitter` + `CapitalRemunerationVault` + φ_data $199 vault — Phase 9 (FEE-01..03).
- `MacroOracle` surprise + `PositionBuilder` sizing — Phase 10 (SIZE-01/02).

</deferred>

---

*Phase: 08-longgammawrapper-cash-flow*
*Context gathered: 2026-06-02 (r2 — post planning-review gate)*
