---
phase: 13
slug: macrohedgeexecutor-mint
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-06
---

# Phase 13 — Validation Strategy

> Per-phase validation contract. Authority: `13-RESEARCH.md` §Validation Architecture. **Promote, don't invent** — the resolver/mint/risk-quote core is committed + green (`DemoMacroHedgeExecutor.fork.t.sol`).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Foundry `forge-std` Test + `bulloak` 0.9.2 BTT (`.tree` before impl, co-located) |
| **Config** | `contracts/foundry.toml` (solc 0.8.24, cancun, `[rpc_endpoints] polygon = ".../v2/${ALCHEMY_API_KEY}"` @ line 26) |
| **Env** | `contracts/.env` has `ALCHEMY_API_KEY` (verified); fork via `vm.createSelectFork(vm.rpcUrl("polygon"), 86_900_000)` INSIDE `setUp` — **no `--fork-url` flag**; state cache `fork-state/polygon-panoptic.json` |
| **Quick run** | `cd contracts && make test-demo` (≈420ms on cached state) |
| **Fresh run** | `cd contracts && make test-demo-fresh` (re-deploys core + re-snapshots) |
| **Estimated runtime** | <5 s on cached fork-state |

> Fork is selected in `setUp` (NOT via a CLI flag). Use `make test-demo` / `forge test --match-path ... -vv`. Run from `contracts/`; `set -a; . .env; set +a` if invoking forge directly.

---

## Sampling Rate
- **After every task commit:** the relevant `--match-test` (e.g. the mint test alone) + `bulloak check` on any touched `.tree`
- **After every wave:** `make test-demo` + the `OperationalCostManagement` unit suite + per-file `bulloak check`
- **Phase gate:** `make test-demo` green (the `test__takeDemoPosition__Succeeds` lineage through the **deployable executor**) + the EXEC-02 negative-gate test + the EXEC-03 conservation invariant + every per-file `bulloak check` exit 0
- **Max feedback latency:** ~5 s (cached fork)

---

## Per-Task Verification Map

| Req | Behavior (observable signal) | Test type | Command | Asserts |
|-----|------------------------------|-----------|---------|---------|
| **EXEC-01** | Mint through the REAL deployable `MacroHedgeExecutor` (not the harness): `executor.resolveAndMint(legParams,0,1e6)` succeeds; `s_positionBalance[executor]` holds the position; `PositionMinted` + `RepresentativenessAssessed` events fire | fork | `forge test --match-path "test/fork/MacroHedgeExecutor.fork.t.sol" --match-test test__takeDemoPosition__Succeeds -vv` | PASS + `numberOfLegs(executor)>0` + positionSize>0 (the demo lineage, now contract-owned) | ❌ W0 |
| **EXEC-02** | (a) POST-mint `quoteCollateralRequirements` returns a `BalanceDelta` (no revert) for the minted position; (b) NEGATIVE gate — an **under-funded** executor → mint reverts `AccountInsolvent`, no position persists | fork | `forge test --match-path "test/fork/MacroHedgeExecutor.fork.t.sol" --match-test test_margin -vv` | (a) BalanceDelta returned; (b) `vm.expectRevert(AccountInsolvent)`, `numberOfLegs(executor)==0` after | ❌ W0 |
| **EXEC-03** | `cummCost` accrues agent + data cost across both agents; global accumulator == Σ per-decision lines; re-delivery does NOT double-accrue | unit + fuzz | `forge test --match-path "test/instrument/OperationalCostManagement.t.sol" -vv` | conservation invariant green + non-vacuous (zeroing one line fails it) | ❌ W0 |

*Status: ⬜ pending · ✅ green · ❌ red — all ⬜ at plan time.*

**Proof semantics (the honest corrections from research):**
- **EXEC-02 is NOT a pre-mint solvency gate** — `checkCollateral`/`quoteCollateralRequirements` REVERTS `PositionNotOwned` on an unminted position (`PanopticPool.sol:559`, documented in commit `67acc91`). The real gate is the protocol-native **atomic `AccountInsolvent` revert** at `_validateSolvency` (`:788-796`, fires AFTER `_mintOptions` writes state `:862`, unwinds the whole tx). So EXEC-02 = POST-mint margin read (informational) + the atomic negative gate (under-funded → no position persists). Do NOT assert a pre-mint quote.
- **EXEC-02 negative gate must be NON-VACUOUS (identical-params twin):** the under-funded test MUST use the IDENTICAL `legParams`/`legIndex`/`positionSize` as the funded `test__takeDemoPosition__Succeeds` — only the collateral differs. The funded twin (`numberOfLegs > 0`) plus the `vm.expectRevert(AccountInsolvent.selector)` (wrapping EXACTLY the under-funded `resolveAndMint(...)` call; the `numberOfLegs == 0` assert runs AFTER, outside the expectRevert) together prove the revert is the SOLVENCY gate, not a malformed-param revert. A bare `numberOfLegs == 0` on a fresh executor is trivially true and proves nothing.
- **EXEC-01 collateral-ownership shift:** the executor must be the `dispatch` caller AND own the 4626 shares — `ct.deposit(assets, address(executor))` (`CollateralTracker.sol:580` `_mint(receiver,…)`; `dispatch` keys `s_positionBalance[msg.sender]` `:862`). The test's `_init_world` funds + deposits collateral with `receiver = address(executor)`.
- **EXEC-03 budgeted, not realized:** accrue the **budgeted** SOMI per agent call (realized `executionCost` is structurally unavailable on Somnia — see memory); conservation mirrors Phase-9's `invariant_dataCostConserved`.
- **`_onResult` decode:** `abi.decode(responses[0].result, (HedgeLegParams))` (NOT `abi.decode(abi.encode(response),…)`). MVP seam: the fork test constructs `HedgeLegParams` directly + calls `resolveAndMint`; `_onResult` is wired + unit-tested for the live path.

---

## Wave 0 Requirements
- [ ] `contracts/test/fork/MacroHedgeExecutor.fork.tree` — BTT for resolveAndMint / margin-gate / events (mirror `test/instrument/MacroHedgeStrategist.tree`)
- [ ] `contracts/test/fork/MacroHedgeExecutor.fork.t.sol` — FAILING first; promotes `_init_world` to deploy + fund `MacroHedgeExecutor` (collateral `receiver = address(executor)`)
- [ ] `contracts/test/instrument/OperationalCostManagement.tree` + `.t.sol` — conservation/no-double-count BTT + FAILING test
- [ ] `contracts/test/instrument/MacroHedgeExecutor.onResult.t.sol` (unit) — `abi.decode(responses[0].result,(HedgeLegParams))` routes correctly + inherited NotPlatform/replay guards (no live Somnia)
- [ ] `src/MacroHedgeExecutor.sol` (deployable), `src/OperationalCostManagement.sol` (the ledger), `POLYGON_WCOP_USDC_POOL_ID` constant, `IMacroThesis` compile-stub
- [ ] Add `polygon` to `rpc_storage_caching` chains in `foundry.toml` (currently Base-only)
- [ ] Framework: none to install (Foundry + bulloak 0.9.2 present)

---

## Manual-Only Verifications
| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Live `llm-inference` representativeness round-trip (Agent 2 actually reasons over the pool) | EXEC-01 (STRETCH) | Spends STT on Somnia testnet; external liveness | A `workflow_dispatch` Somnia-testnet run; MVP ships the `RepresentativenessAssessed` event with a stubbed source + the direct-call mint |
| Live `_onResult`→mint JOIN (live Somnia callback → decode → real Polygon mint, end-to-end) | EXEC-01 (STRETCH) | A single Foundry test cannot stage a live Somnia callback AND a Polygon fork simultaneously | Phase-14 `workflow_dispatch`. In Phase 13 the join is NOT proven: Task 3 proves decode+route in isolation (the `MacroHedgeExecutorDecodeProbe` skips `pool.dispatch`); Task 2 proves the mint via the DIRECT `resolveAndMint` entrypoint. Do NOT claim the live path works. |

---

## Validation Sign-Off
- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s (cached fork)
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
