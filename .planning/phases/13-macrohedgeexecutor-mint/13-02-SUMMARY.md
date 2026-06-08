---
phase: 13-macrohedgeexecutor-mint
plan: 02
subsystem: instrument
tags: [solidity, foundry, panoptic-v2, uniswap-v4, somnia-agent, polygon, wcop-usdc, bulloak, evm-tdd, fork-test]

# Dependency graph
requires:
  - phase: 13-macrohedgeexecutor-mint (01)
    provides: PolygonPools.POLYGON_WCOP_USDC_POOL_ID() anchor + IMacroThesis compile-stub + the polygon (137) fork-state cache
  - phase: 13-macrohedgeexecutor-mint (demo)
    provides: DemoMacroHedgeExecutor.fork.t.sol — the proven vol→width→strike→TokenId resolver + short-then-long mint recipe
  - phase: 11-macrohedgestrategist
    provides: SomniaAgentConsumer base (handleResponse auth/replay) + MockPlatform unit-driver pattern
provides:
  - "Deployable MacroHedgeExecutor is SomniaAgentConsumer: resolveAndMint(HedgeLegParams, legIndex, positionSize) mints the demo position THROUGH the contract — the executor is the dispatch caller AND owns the CollateralTracker shares (numberOfLegs(executor) > 0)"
  - "The corrected _onResult: abi.decode(responses[0].result, (HedgeLegParams)) routing to the same internal mint sink (the LIVE Somnia edge — compiled but UNEXECUTED in Phase 13)"
  - "PositionMinted + RepresentativenessAssessed(requestId, rationale, representative) events — the stable UI contract across both entrypoints (requestId == 0 sentinel on the direct path)"
  - "EXEC-02 honest semantics: post-mint quoteCollateralRequirements BalanceDelta read (informational) + the protocol-native atomic AccountInsolvent gate on an under-funded executor (no pre-mint quote)"
  - "MacroHedgeExecutorDecodeProbe — the test-only seedPending→_sendRequest→MockPlatform decode/auth harness (production executor gets NO public request entrypoint)"
affects: [13-macrohedgeexecutor-mint, 14-live-join-stretch, 12-strategist-strat-02, macrohedgeexecutor-mint]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Single internal mint sink, two entrypoints: resolveAndMint (direct, requestId=0 sentinel) and _onResult (live decode, real requestId) both route to _resolveAndMint"
    - "Collateral-ownership shift: the contract is BOTH the dispatch caller AND the ERC4626 share owner (ct.deposit(assets, address(executor)))"
    - "Honest atomic-gate negative test: identical-params funded twin (numberOfLegs>0) vs nonzero-but-insufficient under-funded twin (AccountInsolvent, numberOfLegs==0) proves the gate is collateral-driven, not param/liquidity"
    - "Test-only probe subclass overrides the virtual mint sink to record+skip dispatch, plus a seedPending wrapper around the inherited internal _sendRequest"

key-files:
  created:
    - contracts/src/MacroHedgeExecutor.sol
    - contracts/test/fork/MacroHedgeExecutor.fork.tree
    - contracts/test/fork/MacroHedgeExecutor.fork.t.sol
    - contracts/test/instrument/MacroHedgeExecutor.onResult.tree
    - contracts/test/instrument/MacroHedgeExecutor.onResult.t.sol
  modified:
    - contracts/src/libraries/FundingDelta.sol

key-decisions:
  - "vm.expectPartialRevert(Errors.AccountInsolvent.selector) instead of vm.expectRevert — forge 1.5.1 makes expectRevert(bytes4) require an EXACT data match; expectPartialRevert matches the selector and tolerates the overload args, which is the plan's stated intent"
  - "Helper interface/probe declared AFTER the test contract so bulloak anchors the tree root on the test contract (the 08-06/08-07 precedent)"
  - "_resolveAndMint marked virtual to enable the test-only probe override (no production runtime change — the fork test already proved the real dispatch path)"
  - "Orphan demo-session types (CalldataReader/OptionType/Underlying) NOT committed — no importers, not in the executor compile closure (logged to deferred-items.md)"

patterns-established:
  - "Promote-don't-invent: the demo harness resolver body migrated VERBATIM into the deployable contract's shared internal sink"
  - "Two-entrypoint / one-sink agent executor: direct resolveAndMint (MVP fork-proven) + _onResult decode (unit-proven in isolation); the live join is a later-phase stretch"

requirements-completed: [EXEC-01, EXEC-02]

# Metrics
duration: 12min
completed: 2026-06-06
---

# Phase 13 Plan 02: MacroHedgeExecutor deployable mint Summary

**The Agent-2 execution core is now a deployable `MacroHedgeExecutor is SomniaAgentConsumer`: `resolveAndMint` mints the demo wCOP/USDC long-call through the CONTRACT (executor owns the position + the collateral shares), `_onResult` decodes `responses[0].result` correctly, and EXEC-02 is proven honestly — a post-mint `BalanceDelta` read plus the protocol-native atomic `AccountInsolvent` gate on an under-funded twin.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-06-06T19:35:31Z
- **Completed:** 2026-06-06T19:47:05Z
- **Tasks:** 3
- **Files modified:** 12 (across 3 commits; 11 created, 1 modified)

## Accomplishments
- **EXEC-01 (deployable mint):** `MacroHedgeExecutor.resolveAndMint(demoLegParams, 0, 1e6)` mints the demo position through the contract on the Polygon wCOP/USDC fork — `numberOfLegs(executor) > 0`, `PositionMinted` + `RepresentativenessAssessed(0,...)` emitted (the demo `test__takeDemoPosition__Succeeds` lineage, now contract-owned, GREEN). The harness resolver body (vol→width→strike→TokenId + the short-then-long two-dispatch) migrated VERBATIM into the shared internal `_resolveAndMint` sink.
- **EXEC-01 (decode):** `_onResult` fixed to `abi.decode(responses[0].result, (HedgeLegParams))` (was the `abi.decode(abi.encode(response),…)` type error), routing to the same sink with the live `requestId`. Unit-proven in isolation (the probe records the decoded params, skips dispatch) — the production `_onResult`→real-mint edge is COMPILED but UNEXECUTED this phase.
- **EXEC-02 (honest gate):** post-mint `quoteCollateralRequirements` returns a `BalanceDelta` without reverting (informational); the real "insufficient collateral → no mint" gate is the protocol-native atomic `AccountInsolvent` — proven NON-VACUOUS and collateral-driven by an identical-params funded twin (`numberOfLegs>0`) vs a nonzero-but-far-below-requirement under-funded twin (`AccountInsolvent`, `numberOfLegs==0` after).
- **Size guard:** `resolveAndMint` with `legParams.size == 128` reverts on the shared-sink `require(size <= 127)` first statement (the `% 128`-mask corruption protection, Pitfall 4).
- **7/7 fork leaves + 4/4 unit leaves green; both `bulloak check` exit 0; no sibling regressions** (PolygonPools 3/3, OperationalCostManagement 10/10, MacroHedgeStrategist 17/17).

## Task Commits

Each task was committed atomically (evm-TDD Iron-Law ancestry: trees + failing fork test BEFORE the impl):

1. **Task 1: BTT trees (fork + onResult) + the FAILING fork test (RED)** - `322cab4` (test)
2. **Task 2: Promote MacroHedgeExecutor — resolveAndMint + _onResult decode + EXEC-02 gate** - `e85c2fc` (feat)
3. **Task 3: _onResult decode + auth/replay unit suite** - `de22865` (test)

**Plan metadata:** _final docs commit below_

_Iron-Law ancestry verified: `322cab4` (trees+RED) is an ancestor of `e85c2fc` (impl) — `git merge-base --is-ancestor` confirms._

## Files Created/Modified
- `contracts/src/MacroHedgeExecutor.sol` - the deployable executor: ctor `(platform, PanopticPoolV2, RiskManagement, vegoid)`, immutables, shared internal `_resolveAndMint` sink (size guard + migrated resolver + short-then-long dispatch + events), external `resolveAndMint`, fixed `_onResult`, `quoteMargin` view
- `contracts/test/fork/MacroHedgeExecutor.fork.tree` - BTT (mint/ownership/events/post-mint read/AccountInsolvent gate/size guard)
- `contracts/test/fork/MacroHedgeExecutor.fork.t.sol` - the demo lineage GREEN through the executor + EXEC-02 (both legs) + the size guard; collateral receiver = `address(executor)`, MockPlatform for the base ctor, vestigial `address(this)` deposit dropped
- `contracts/test/instrument/MacroHedgeExecutor.onResult.tree` - BTT (decode-route / NotPlatform / UnknownRequest replay)
- `contracts/test/instrument/MacroHedgeExecutor.onResult.t.sol` - the decode unit proof + auth/replay via the `MacroHedgeExecutorDecodeProbe`
- `contracts/src/libraries/FundingDelta.sol` - demo-session cleanup (dropped an unused `CollateralUnderflow` error + whitespace); part of the EXEC-02 margin-read closure
- _(committed in the impl commit: the demo-session src closure the executor compiles against — `HedgeLegParams.sol`, `PositionInfo.sol`, `types/PayoffTerms.sol`, `libraries/PayoffTerms.sol`, `PriceGrids.sol`, `VolToWidth.sol`)_

## Decisions Made
- **`vm.expectPartialRevert` for the `AccountInsolvent` gate.** forge 1.5.1's `vm.expectRevert(bytes4)` requires an EXACT revert-data match, so it rejects an error carrying args (`AccountInsolvent(0,1)`). `vm.expectPartialRevert(Errors.AccountInsolvent.selector)` matches the 4-byte selector and tolerates the args — which is EXACTLY the plan's stated intent ("the bare selector, matches all 3 overloads, do NOT tighten to specific args"). Proven against a minimal forge-1.5.1 probe before applying.
- **Helper interface (`ICollateralDeposit`) + the decode probe declared AFTER the test contract** so bulloak anchors the tree root on the test contract (08-06/08-07 precedent — declaring them first made bulloak look for the leaf functions inside the wrong contract).
- **`_resolveAndMint` marked `virtual`** to enable the test-only probe override (records `legParams`, skips `pool.dispatch`). No production runtime change — the fork test already proves the real dispatch path; folded into the Task-3 commit since it is a test-enablement integral to that task.
- **The plan-named tests (`test__takeDemoPosition__Succeeds`, `test_margin`, `test_resolveAndMint_sizeGuard`) coexist with the bulloak-derived leaf names** — verified bulloak `check` matches by file-stem and tolerates extra functions, so both the demo-lineage `--match-test` commands AND the `bulloak check` exit-0 gate are satisfied.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `vm.expectRevert(bytes4)` does not match an error with args in forge 1.5.1**
- **Found during:** Task 2 (the EXEC-02 negative-gate tests `test_margin` + the BTT twin)
- **Issue:** The plan prescribes `vm.expectRevert(Errors.AccountInsolvent.selector)`. Under forge 1.5.1, `expectRevert(bytes4)` does a length-aware EXACT comparison, so the real revert `AccountInsolvent(0, 1)` (which carries args) FAILS the match (`AccountInsolvent(0, 1) != custom error 0xcdef092d`). Both negative-gate tests failed despite the CORRECT error firing.
- **Fix:** Switched to `vm.expectPartialRevert(Errors.AccountInsolvent.selector)` at both sites — it matches the selector and tolerates ANY overload args, which is precisely the plan's intent (`0xcdef092d` confirmed == the `AccountInsolvent(uint256,uint256)` selector; the gate fires `AccountInsolvent(0,1)`, the `:1142` `_validateSolvency` overload). Verified the distinction with a throwaway forge-1.5.1 probe (bare `expectRevert` FAILS, `expectPartialRevert` PASSES) before applying.
- **Files modified:** contracts/test/fork/MacroHedgeExecutor.fork.t.sol
- **Verification:** both `test_margin` and the BTT twin PASS; the gate is provably collateral-driven (identical-params funded twin mints `numberOfLegs>0`).
- **Committed in:** `e85c2fc` (Task 2 commit)

**2. [Rule 3 - Blocking] bulloak anchored the tree root on a helper interface declared before the test contract**
- **Found during:** Task 2 (first `bulloak check` on the fork tree after the `.t.sol` existed)
- **Issue:** `ICollateralDeposit` was declared BEFORE `MacroHedgeExecutorForkTestdeployableMint`, so bulloak anchored the tree on `ICollateralDeposit` and reported all five leaf functions "missing" (it searched the wrong contract).
- **Fix:** Moved `ICollateralDeposit` to AFTER the test contract (the documented 08-06 `IPokeOracle` / 08-07 handler-after precedent). The same pattern was pre-applied to the Task-3 decode probe.
- **Files modified:** contracts/test/fork/MacroHedgeExecutor.fork.t.sol
- **Verification:** `bulloak check test/fork/MacroHedgeExecutor.fork.tree` exits 0.
- **Committed in:** `e85c2fc` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 3 — blocking-to-pass-the-plan's-own-gates, both on the test files). Each preserves the plan's stated INTENT exactly (the selector-only `AccountInsolvent` match; the co-located-tree bulloak gate). No scope creep, no architectural change, no production-contract behavior change.
**Impact on plan:** None to the deliverable — both are foundry/bulloak tooling-version accommodations that the plan's older-version assumptions didn't anticipate.

## Issues Encountered
- **The executor's `src/` dependency closure was uncommitted from the prior demo session.** `HedgeLegParams.sol`, `PositionInfo.sol`, the `PayoffTerms` type+lib, `PriceGrids.sol`, and `VolToWidth.sol` existed on disk (the demo test compiled against them) but were never `git add`-ed. The executor cannot compile without them, so they were committed alongside the impl in `e85c2fc` (Iron-Law-safe: still AFTER the Task-1 tree commit). The three genuinely-orphan types (`CalldataReader`/`OptionType`/`Underlying` — no importers, not in the closure) were deliberately NOT committed and are logged in `deferred-items.md`.
- **No RPC 429s observed** — the Plan-01 polygon (137) fork-state cache kept the fork warm; the fork suite ran in ~430ms on cached state across all reruns.

## LIMITATION (honest — do NOT claim otherwise)
The `_onResult`→mint LIVE join is NOT proven in this phase. The production `_onResult`→`_resolveAndMint` edge COMPILES, but no Phase-13 test executes it end-to-end: Task 3 proves the decode+route in ISOLATION (the `MacroHedgeExecutorDecodeProbe` overrides the mint sink to record `legParams` and SKIP `pool.dispatch`); Task 2 proves the mint via the DIRECT `resolveAndMint` entrypoint on a Polygon fork. A single Foundry test cannot stage a live Somnia callback AND a Polygon fork simultaneously. Joining them ("live Somnia callback → decode → real Polygon mint") is the Phase-14 manual `workflow_dispatch` STRETCH (`13-VALIDATION` Manual-Only). Likewise, the representativeness SOURCE is a deterministic stub in this MVP — the live `llm-inference` round-trip is STRETCH; only the `RepresentativenessAssessed` EVENT (the UI contract) ships here.

## User Setup Required
None - no external service configuration required. (The fork tests read `ALCHEMY_API_KEY` from the gitignored `contracts/.env`; no new setup beyond what Plan 01 already required.)

## Next Phase Readiness
- **EXEC-01 + EXEC-02 satisfied.** The deployable mint core is committed and green; Agent 2's execution core is contract-owned.
- **Phase 14 (live join) unblocked:** the `_onResult` decode edge is wired + unit-proven; the Phase-14 stretch is the live Somnia→Polygon `workflow_dispatch` join + the live representativeness inference.
- **Phase 12 (STRAT-01/02) hand-off:** confirm the emitted instrument-spec format is an abi-encoded `HedgeLegParams` (so `abi.decode(result, (HedgeLegParams))` is exact) — flagged Open Q1 in 13-RESEARCH.
- **No blockers.**

## Self-Check: PASSED

All claimed artifacts verified on disk + in git history:
- Files FOUND: `MacroHedgeExecutor.sol`, `MacroHedgeExecutor.fork.tree`, `MacroHedgeExecutor.fork.t.sol`, `MacroHedgeExecutor.onResult.tree`, `MacroHedgeExecutor.onResult.t.sol`, `13-02-SUMMARY.md`.
- Commits FOUND: `322cab4` (trees+RED), `e85c2fc` (impl), `de22865` (unit suite).
- Gates re-run green: `forge build` exit 0; 7/7 fork leaves PASS; 4/4 onResult unit leaves PASS; both `bulloak check` exit 0; `grep abi.decode(responses[0].result` matches; Iron-Law `merge-base --is-ancestor 322cab4 e85c2fc` holds.

---
*Phase: 13-macrohedgeexecutor-mint*
*Completed: 2026-06-06*
