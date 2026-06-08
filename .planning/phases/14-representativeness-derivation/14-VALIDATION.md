---
phase: 14
slug: representativeness-derivation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-06
---

# Phase 14 — Validation Strategy

> Per-phase validation contract. Authority: `14-RESEARCH.md` §Validation Architecture (REVISED — Fix C). **The strike is a pre-snapped `int24` from `RepresentativenessLib.structuralStrikeTick` (decimal-gap-correct, ZERO inversion) fed to a split sink — the broken `strikeWadForSink` is DELETED.** The corrected near-spot K_hi(4485)=360360 mint is FORK-PROVEN (block 86_900_000, `numberOfLegs==2`, live spot 358700). The mint core is reused via an additive `_resolveAndMintAtStrike(int24 strike)` split; the demo / direct `resolveAndMint` path is byte-unchanged (Phase-13 still 2/2 green).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Foundry `forge` 1.5.1 + `bulloak` 0.9.2 BTT (`.tree` + FAILING test committed BEFORE impl, co-located, `when/it` keyword form) |
| **Config** | `contracts/foundry.toml` (solc 0.8.24, cancun, `rpc_storage_caching` chains `[8453,137]`) |
| **Quick run** | `cd contracts && forge test --match-path "test/instrument/Representativeness.t.sol" -vv` (fork-free unit — sub-second, no RPC) |
| **Full suite** | `cd contracts && make test-demo` (the Polygon-fork mint through `resolveFromMandate`) + `forge test --no-match-path 'test/**/*{fork,invariants}*'` (the fork-free regression set) |
| **Live (manual, STRETCH)** | the `inferToolsChat` representativeness round-trip — NOT this phase (not in the vendored `ILLMAgent`); a future `workflow_dispatch` |
| **Estimated runtime** | unit <2 s; fork mint ≈ a few s on cached chain-137 state |

---

## Sampling Rate
- **After every task commit:** `forge test --match-path "test/instrument/Representativeness.t.sol" -vv` + `bulloak check` on any touched `.tree`
- **After every wave:** `make test-demo` (the fork mint) + `forge test --no-match-path 'test/**/*{fork,invariants}*'` (no sibling regressions — PolygonPools 3/3, OperationalCostManagement 10/10, MacroHedgeStrategist 19/19, MacroHedgeExecutor onResult 4/4, **the Phase-13 demo 2/2**)
- **Phase gate:** the unit suite + the fork mint both green; every new `.tree` `bulloak check` exit 0; the GBM-divergence + staleness + honesty + exact-4485-strike tests green
- **Max feedback latency:** <2 s (fork-free unit)

---

## Per-Task Verification Map

| Req | Behavior (observable signal) | Test type | Command (`--match-test`) | File |
|-----|------------------------------|-----------|--------------------------|------|
| **REPR-02** | `resolveFromMandate` mints the near-spot **K_hi(4485)=tick 360360** leg through the SHIPPED executor on the Polygon fork (FORK-PROVEN). Assert the mint SUCCEEDS (not just "doesn't revert" — the demo's flaw): `numberOfLegs(executor) > 0` AND **`positionId.strike(leg) == 360360`** (EXACT structural tick; leg-lower 359760 is 1060 ticks clear of the live spot 358700) | fork | `test_resolveFromMandate_mintsThroughExecutor` | ❌ W0 (14-03) |
| **REPR-02** | Deterministic geometry: (mandate + Z_t + β₁) → EXPECTED `HedgeLegParams` (regimeVol/feasibleOptionRatio/asset/isLong) field-by-field. **NO `strikeWadForSink` (DELETED — broken).** | unit | `test_resolveFromMandate_derivesExpectedGeometry` | ❌ W0 (14-01) |
| **REPR-02** | **The REAL strike round-trip (Fix-C canary, at the EXECUTOR's strike 4485, EXACT — not 3900, not a band):** `structuralStrikeTick(4485,60) == 360360`; ALSO `structuralStrikeTick(3900,60) == 358980` (catches a gap-factor regression). REDs on the old `strikeWadForSink` (gives 361680, off by 1320); GREENs on Fix C (exact). | unit | `test_structuralStrike_exactAt4485` | ❌ W0 (14-01) |
| **REPR-01** | **The ≥1-param-≠-GBM binding constraint — CONTINUOUS (LOAD-BEARING):** `assertGt(regimeVol(STRESS), baseVol)` — the STRESS vol strictly exceeds the GBM baseline vol (`volToWidth` ceil-snaps so a one-unit width margin can vanish under tuning; the continuous vol margin is tuning-invariant). `TRANQUIL==GBM` by construction — assert STRESS-vs-baseline, NEVER TRANQUIL. | unit | `test_regimeVol_stressExceedsBaseline` | ❌ W0 (14-01) |
| **REPR-01** | **The ≥1-param-≠-GBM binding constraint — QUANTIZED:** `assertTrue(widthStress != widthGbm)` AND `gbmBaselineWidth == volToWidth(uint88(BASE_VOL),horizon,ts)` (the GBM baseline is the raw tick-space width of BASE_VOL — proving the unit scale, not a WAD that clamps to 4095). | unit | `test_regimeWidth_differsFromGbmBaseline` | ❌ W0 (14-01) |
| **REPR-01** | β₁ asymmetry: `β₁(STRESS) > β₁(TRANQUIL)` ⇒ the STRESS inflation-adjustment/width strictly exceeds TRANQUIL (`assertGt`) | unit | `test_beta1_stressExceedsTranquil` | ❌ W0 (14-01) |
| **REPR-01** | Mutation non-vacuity (per 13-03): collapse β₁(STRESS)→β₁(TRANQUIL) ⇒ the continuous + quantized binding assertions go vacuous (a dedicated leaf, same code path) | unit | `test_mutation_collapseBeta1_breaksNonVacuity` | ❌ W0 (14-01) |
| **REPR-01** | Oracle staleness → default-to-STRESS: stale/unset `IRegimeOracle` (`observedAt==0` or beyond `MAX_STALENESS`) ⇒ STRESS multiplier; a FRESH `set(Tranquil)` ⇒ Tranquil (the non-vacuous control) | unit | `test_staleOracle_defaultsToStress` | ❌ W0 (14-01 — needs MockRegimeOracle) |
| **REPR-01** | Honesty flag + TEMPLATE caveat surface on `ExecutorDecided` (`nonErgodicDisclosed == true`; rationale carries the TEMPLATE marker); decoded from the mint path | unit/fork | `test_executorDecided_surfacesHonestyFlag` | ❌ W0 (14-03 fork home) |
| **REPR-02** | `feasibleOptionRatio(notional)` is a DEFINED monotone map (NOT "clamp to [1,127]"): `clamp(notional / NOTIONAL_PER_RATIO, 1, 127)` — assert monotone non-decreasing, hits 1 at/below the floor + 127 at/above the cap, AND `targetNotional` actually changes the ratio across the mid-band (a notional-ignored regression must RED) | unit | `test_feasibleOptionRatio_monotoneFromNotional` | ❌ W0 (14-01) |
| **REPR-02** | The `optionRatio ≤ 127` guard (the mandate path can't reach 128 since `feasibleOptionRatio` clamps, so prove on the DIRECT path): `resolveAndMint(HedgeLegParams{size:128})` reverts `optionRatio overflow` | fork | `test_resolveAndMint_sizeOver127_reverts` (`vm.expectRevert`, string error) | ❌ W0 (14-03) |
| **REPR-02** | **LLM-independence — BEHAVIORAL (not a fragile `sed` grep):** `resolveFromMandate` mints the IDENTICAL geometry (`strike == 360360`, `numberOfLegs > 0`) when the agent platform is a REVERTING mock — the deterministic geometry never calls the LLM (a geometry that touched the LLM would revert). | fork | `test_resolveFromMandate_llmIndependentGeometry` (`MockRevertingPlatform`) | ❌ W0 (14-03) |

*Status: ⬜ pending · ✅ green · ❌ red — all ⬜ at plan time.*

**Proof semantics (the honest boundaries):**
- **Fix C — the strike is a pre-snapped `int24`, the inversion is DELETED.** `structuralStrikeTick(humanRate,ts) = snap(getTickAtSqrtPrice(sqrt(humanRate·1e12·Q192)))` is EXACT (the wCOP 18dp/USDC 6dp `1e12` gap baked in). The sink splits: `resolveAndMint` keeps the `strikeWAD→tick` line (Phase-13 byte-unchanged), `_resolveAndMintAtStrike(int24 strike)` is the new shared body, `resolveFromMandate` passes the exact tick. The canary asserts **exact equality at 4485** (the rate the executor mints), NOT a band at 3900 (a tautology) — a 22-tickSpacing emitted-vs-minted lie is now impossible.
- **The near-spot mint is FORK-PROVEN, and the 15%-OTM K_hi offset is LOAD-BEARING:** the short dispatch reverts `InputListFail()` (input-validation, NOT liquidity) when leg-lower < spot+~140 ticks; the canonical-3900 K_hi (15% OTM) keeps the leg 1060 ticks clear of the live spot. The mint test asserts SUCCESS + the exact strike, not merely "no revert."
- **Binding constraint robustness:** the load-bearing assertion is the CONTINUOUS `regimeVol(STRESS) > baseVol`; the quantized `widthStress != widthGbm` is secondary (one ceil-unit at the TEMPLATE vintage; `TRANQUIL==GBM`). Mutation-proven non-vacuous.
- **Deterministic, not LLM-driven:** the geometry reads ONLY `IRegimeOracle` + the immutable β₁ pair + the canonical constant; `getCurrentTick()` is emitted-context only, NOT fed into the strike. `inferToolsChat` is stubbed (STRETCH). A behavioral test (`test_resolveFromMandate_llmIndependentGeometry` — mint with a `MockRevertingPlatform`, not a fragile `sed` grep) pins LLM-independence.
- **TEMPLATE numbers — assert STRUCTURE not magnitude:** β₁/Z_t are stubbed/illustrative (label TEMPLATE); tests assert the structural properties (exact-strike, STRESS>baseline, regime-width≠GBM, staleness→STRESS, monotone notional), NOT magnitudes.

---

## Wave 0 Requirements
- [ ] `contracts/test/instrument/Representativeness.tree` + `Representativeness.t.sol` — REPR-01 (binding constraint continuous+quantized, β₁ asymmetry, mutation, staleness→STRESS) + REPR-02 (deterministic geometry, exact-4485 strike, feasibleOptionRatio monotone). `.tree` FIRST (Iron Law), `when/it` form.
- [ ] `contracts/test/mocks/MockRegimeOracle.sol` — a settable `IRegimeOracle` double mirroring `MockMacroOracle`; declared AFTER the root test contract (bulloak anchoring).
- [ ] `contracts/src/interfaces/IRegimeOracle.sol` — `latestRegime() → (Regime, uint64 observedAt)` (mirror the `MacroOracle` staleness precedent).
- [ ] `contracts/src/libraries/Representativeness.sol` — the pure β₁(REGIME)×devaluation core + the GBM comparator + **`structuralStrikeTick(humanRate, ts)` (Fix-C, NO `strikeWadForSink`)** + the DEFINED `feasibleOptionRatio(notional)=clamp(notional/NOTIONAL_PER_RATIO,1,127)`.
- [ ] `contracts/src/MacroHedgeExecutor.sol` — add `resolveFromMandate(...)` + the `ExecutorDecided` event + **the Fix-C sink split** (`_resolveAndMintAtStrike(int24 strike)` shared body; the `strikeWAD→tick` line moved up into the public `resolveAndMint` — Phase-13 behavior preserved; `resolveFromMandate` passes `structuralStrikeTick(CANONICAL_COP_USD*115/100, ts)`).
- [ ] Extend `contracts/test/fork/DemoMacroHedgeExecutor.fork.t.sol` with `test_resolveFromMandate_mintsThroughExecutor` (assert `strike==360360` + `numberOfLegs>0`) + `test_executorDecided_surfacesHonestyFlag` + `test_resolveAndMint_sizeOver127_reverts` + `test_resolveFromMandate_llmIndependentGeometry` (`MockRevertingPlatform`) — reuse `_init_world`; the wave gate re-confirms the Phase-13 demo 2/2 green (no Fix-C-split regression).
- [ ] Framework: none to install (forge + bulloak present).

---

## Manual-Only Verifications
| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Live `inferToolsChat` representativeness round-trip → the surfaced `ExecutorDecided` rationale on Somnia testnet | REPR-01 (STRETCH) | `inferToolsChat` not in the vendored `ILLMAgent`; needs interface extension + keeper round-trip + STT | A future `workflow_dispatch`; MVP ships the deterministic geometry + the stubbed rationale. The geometry never depends on it. |

---

## Validation Sign-Off
- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 2s (fork-free unit)
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
