# Phase 16: Shiller-differentiated representativeness — Research

**Researched:** 2026-06-07
**Domain:** Solidity / Panoptic TokenId geometry; evm-TDD (bulloak BTT); on-chain standardized-surprise math; agent-workflow integration testing
**Confidence:** HIGH (the substrate is fully read; every claim cites a file:line or a research-doc section). The single genuinely-unknown is empirical, not technical — flagged in Open Questions.

<user_constraints>
## User Constraints (from 16-CONTEXT.md)

### Locked Decisions
- **New `ISurpriseOracle`** carrying CPI surprise inputs (CPI actual, BanRep-EME consensus, σ_CPI, `observedAt`), **mirroring `IRegimeOracle`'s staleness contract**. The SHILLER branch computes `s_t = (CPI_actual − consensus)/σ_CPI` **ON-CHAIN** (not a pre-baked scalar).
- **Staleness fail-safe** like PKE's (stale/unset → conservative Shiller stance; exact stance = Claude's discretion, e.g. treat `s=0` → minimal/no incremental position).
- **PKE's `IRegimeOracle`/Z_t is UNTOUCHED.** Two schools read two DISTINCT signals (regime vs surprise). A `MockSurpriseOracle` mirrors `MockRegimeOracle`.
- The brain **BRANCHES on `mandate.economicTheory`** (`0x5` SHILLER, `0x6` POST_KEYNESIAN). PKE → existing regime×β₁ path UNCHANGED; SHILLER → surprise path:
  - **Size:** `optionRatio ∝ max(|s_t| − k, 0)²`, clamped `[1,127]` (reuse `feasibleOptionRatio` clamp discipline).
  - **Strike:** SIGN-driven — CPI upside (s>0) → COP-**depreciation** strike (K_hi side); downside (s<0) → appreciation side. Placed **further OTM than PKE** via a σ-multiple off the canonical rate / structural tick.
  - **Width:** grows with `|s_t|`, **EVEN-snapped** (non-negotiable).
- SHILLER = **single-leg approximation of the Carr–Madan digital strip** (v1); documented honestly. `k` and the OTM σ-multiple are **TEMPLATE placeholder constants** (like Phase-14 β₁/Z_t).
- `ExecutorDecided` carries a **DISTINCT per-school TEMPLATE rationale**. Both schools set `nonErgodicDisclosed = true`.
- **SHILLER-02:** dedicated agent-layer suite driving prompt → Agent-1 (`inferString`, mocked platform) → `HedgeMandate` → Agent-2 `resolveFromMandate` → mint (fork). Scenarios: CPI upside, CPI downside, fiscal-slippage tail, carry-unwind — each under BOTH schools. **Load-bearing assertion:** same input → DIFFERENT strike/width/size by school + per-school TEMPLATE honesty on `ExecutorDecided`.

### Claude's Discretion
- Exact TEMPLATE constants: `k`, σ-multiple OTM distance, σ default, surprise-staleness window.
- Exact `ISurpriseOracle` signature + stale fail-safe stance.
- Convex scaling constant mapping `max(|s|−k,0)²` → `optionRatio`.
- Test directory/file naming; whether the Agent-1 leg is mock-platform in-VM joined to the Agent-2 fork mint.

### Deferred Ideas (OUT OF SCOPE)
- Two-leg spread / full Carr–Madan strip (v1 is single leg).
- Live CPI-surprise oracle feed (real DANE/BanRep-EME/σ plumbing + the Somnia→Reactive bridge XCHAIN-01). v1 is TEMPLATE/mock.
- Donor-transfer calibration of `k`/σ.
- A third+ economic school.
- Frontend rendering (sibling repo).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SHILLER-01 | `resolveFromMandate`/`Representativeness` BRANCH on the mandate's school; `SHILLER_MACRO_RISK` derives a narrative-driven/tail-macro geometry distinct from PKE regime/β₁ | §"Shiller→tick translation" (concrete TEMPLATE constants + arithmetic), §"Branch architecture" (the `economicTheory` dispatch + new `shillerGeometry` lib fns + `ISurpriseOracle`), §"Keeping PKE green" |
| SHILLER-02 | Whole-workflow integration test suite (prompt → Agent-1 school → mandate → Agent-2 geometry → mint) across Colombian macro-risk scenarios under BOTH schools, proving school drives differentiated geometry e2e | §"Whole-workflow test architecture" (the Agent-1-in-VM → mandate → Agent-2-fork join; the 4 scenarios × 2 schools matrix; the load-bearing same-input-different-geometry assertion) |
</phase_requirements>

## Summary

Phase 16 adds a SECOND geometry branch beside the fork-proven PKE path. The substrate already supports this almost perfectly: `MacroHedgeExecutor.resolveFromMandate` (`MacroHedgeExecutor.sol:197`) already receives `mandate.economicTheory` (the `0x5`/`0x6` sentinel, `IMacroThesis.sol:35-36`) but currently ignores it — it ALWAYS runs the regime×β₁ path. The branch is a single `if` on that sentinel. PKE stays byte-identical by leaving its branch arm verbatim; SHILLER gets a new arm that reads a new `ISurpriseOracle`, computes `s_t = (actual−consensus)/σ` in WAD, and derives a convex size, a sign-driven further-OTM strike, and a `|s|`-scaled even-snapped width — all reusing the proven primitives (`structuralStrikeTick`, `VolToWidthLib.volToWidth`, the `[1,127]` clamp).

The one structural change with blast radius is the constructor: adding `ISurpriseOracle` as a 10th ctor arg re-breaks the SAME 5 ctor sites the Phase-14 regime-oracle migration touched (enumerated below). This is mechanical but must be planned as a Wave-0 task. The convex-sizing and sign-strike arithmetic is verified concrete (TEMPLATE `scale=10`, `k=0.5 WAD` spans `[1,127]` cleanly for realistic ±4σ surprises; sign-driven strike lands at tick ~360780 for s=+1 vs ~356760 for s=−1, both clear of the PKE 360360 and tick-aligned).

**Primary recommendation:** Branch `resolveFromMandate` on `mandate.economicTheory == 0x5`; add `shillerSurprise()`, `shillerOptionRatio()`, `shillerStrikeTick()`, `shillerWidth()` to `RepresentativenessLib` (pure, mirroring the PKE fns); add `ISurpriseOracle`/`MockSurpriseOracle` mirroring `IRegimeOracle`/`MockRegimeOracle`; extend the ctor to a 10-arg signature and migrate the 5 enumerated ctor sites; write the `MacroWorkflow.*` agent-layer suite that joins an in-VM Agent-1 (mock platform) to the Agent-2 fork mint and asserts SHILLER≠PKE geometry per scenario.

## The Shiller → tick translation (the crux)

### On-chain surprise `s_t`
`s_t = (CPI_actual − consensus) / σ_CPI`, all WAD. Computed in a pure lib fn (transparent, per the locked decision — NOT pre-baked):

```solidity
// abs numerator, WAD-scaled; sign preserved separately for the strike direction
function shillerSurprise(int256 actualWad, int256 consensusWad, uint256 sigmaWad)
    internal pure returns (int256 sWad)
{
    require(sigmaWad > 0, "sigma>0"); // div-by-zero guard; the mock seeds a non-zero σ
    sWad = ((actualWad - consensusWad) * int256(WAD)) / int256(sigmaWad);
}
```
`sWad` is a signed WAD: `+1e18` = +1σ surprise (hotter CPI), `−1e18` = −1σ. The SIGN drives the strike side; `|sWad|` drives size + width.

### Size — the convex `max(|s|−k,0)²` map (verified arithmetic)
Reuse the `feasibleOptionRatio` `[1,127]` clamp discipline (`Representativeness.sol:145-150`). TEMPLATE constants `SHILLER_K = 0.5e18` (the surprise must exceed 0.5σ before the position grows) and `SHILLER_RATIO_SCALE = 10`:

```solidity
function shillerOptionRatio(int256 sWad) internal pure returns (uint256 ratio) {
    uint256 absS = sWad < 0 ? uint256(-sWad) : uint256(sWad);
    if (absS <= SHILLER_K) return 1;                 // below threshold -> floor leg (a leg must carry >=1)
    uint256 excessWad = absS - SHILLER_K;            // WAD
    // raw = scale * excess^2 ; excess^2 is WAD^2 -> divide by WAD once to land in WAD, then /WAD to plain int
    uint256 raw = (SHILLER_RATIO_SCALE * excessWad * excessWad) / (WAD * WAD);
    if (raw < 1) return 1;
    if (raw > 127) return 127;
    return raw;
}
```
**Verified span (scale=10, k=0.5):** s=1σ→ratio 2, s=1.5σ→10, s=2σ→22, s=2.5σ→40, s=3σ→62, s=3.5σ→90, s=4σ→122. Monotone non-decreasing, saturates below 127 at realistic tails (good headroom; never hits the `%128` wrap). This is the SHILLER size; it is convex in `|s|` (quadratic) — the load-bearing differentiator from PKE (whose size is a LINEAR `notional/NOTIONAL_PER_RATIO`). NOTE the unit care: `excessWad²` is WAD², so divide by `WAD*WAD` to reach a plain ratio. Plan the test to assert the exact integer outputs above (mutation-resistant).

### Strike — SIGN-driven, further-OTM than PKE (verified tick alignment)
PKE pins K_hi at `CANONICAL_COP_USD * 115/100 = 4485` → tick **360360** (`MacroHedgeExecutor.sol:218-219`, proven `Representativeness.t.sol:101`). SHILLER places the strike FURTHER OTM by a σ-multiple, and on the SIGN-correct side:

```solidity
// base 15% OTM (== PKE) + SHILLER_OTM_SIGMA_PCT (=5%) per |sigma| of surprise
function shillerStrikeTick(int256 sWad, int24 tickSpacing) internal pure returns (int24) {
    uint256 absSigmas = (sWad < 0 ? uint256(-sWad) : uint256(sWad)) / WAD;        // floored whole sigmas
    uint256 pctBps = 1500 + SHILLER_OTM_SIGMA_BPS * absSigmas;                    // 1500 = 15%, +500 bps/sigma
    uint256 rate = sWad >= 0
        ? (CANONICAL_COP_USD * (10000 + pctBps)) / 10000   // upside CPI -> COP depreciation -> HIGHER COP/USD (K_hi)
        : (CANONICAL_COP_USD * (10000 - pctBps)) / 10000;  // downside -> appreciation -> LOWER COP/USD
    return structuralStrikeTick(rate, tickSpacing);        // REUSE the Fix-C exact decimal-gap snap
}
```
**Verified (CANONICAL=3900, tickSpacing 60, via `structuralStrikeTick`'s exact `sqrt(rate·1e12·Q192)` snap):**
- s=+1σ → 20% OTM → rate 4680 → tick **360780**
- s=+2σ → 25% → 4875 → **361200**
- s=+3σ → 30% → 5070 → **361620**
- s=−1σ → 20% appreciation → 3120 → **356760**
- s=−2σ → 25% → 2925 → **356100**

All are multiples of 60 BY CONSTRUCTION (`structuralStrikeTick` floor-snaps: `(raw/tickSpacing)*tickSpacing`, `Representativeness.sol:138`). The upside ticks (≥360780) sit ABOVE the PKE 360360, the downside ticks BELOW — so for the SAME mandate, SHILLER's strike provably differs from PKE's 360360 (the load-bearing assertion). **InvalidTickBound safety:** strike alignment is guaranteed by reusing the EXACT-fixed-point `structuralStrikeTick` (the deleted WAD-inversion path is NOT reintroduced — `Representativeness.sol:122-139`). **InputListFail safety (Pitfall 1b):** because SHILLER is at LEAST 15% OTM (s never makes it less OTM than PKE), the leg-lower stays ≥ the PKE leg-lower's ~1060-tick clearance from spot (`MacroHedgeExecutor.sol:213-217`, `DemoMacroHedgeExecutor.fork.t.sol:443-445`); the DOWNSIDE (appreciation) strikes need a fork-mint sanity check that leg-UPPER stays clear of spot on the other side — flag as a Validation claim.

### Width — `|s|`-scaled, even-snapped
Feed a `|s|`-scaled tick-space vol into the PROVEN `VolToWidthLib.volToWidth` (which already even-snaps, `VolToWidth.sol:32`):
```solidity
function shillerWidth(int256 sWad, uint256 baseVol, uint32 horizonBlocks, int24 tickSpacing)
    internal pure returns (int24)
{
    uint256 absSigmas = (sWad < 0 ? uint256(-sWad) : uint256(sWad)) / WAD;
    uint256 vol = baseVol * (1 + absSigmas);  // bigger surprise -> wider band; >=baseVol always
    return VolToWidthLib.volToWidth(uint88(vol), horizonBlocks, tickSpacing);
}
```
The even-width invariant is handled INSIDE `volToWidth` — do NOT hand-roll a width snap. `baseVol` is TICK-SPACE (14_400, NOT a WAD — a WAD sqrt-clamps to 4095; `Representativeness.sol:71-73`).

## The branch architecture

### Dispatch in `resolveFromMandate`
`resolveFromMandate` (`MacroHedgeExecutor.sol:197`) currently ALWAYS runs the PKE path. Insert a single branch on the sentinel address held in `mandate.economicTheory`:
```solidity
if (IMacroThesis.unwrap-equivalent(mandate.economicTheory) == address(uint160(0x5))) {
    // SHILLER arm
} else {
    // PKE arm — the EXISTING body, moved verbatim, byte-unchanged
}
```
`IMacroThesis` is an empty marker interface (`IMacroThesis.sol:10-12`); compare via `address(mandate.economicTheory) == address(uint160(0x5))` (the SHILLER sentinel, `IMacroThesis.sol:35`). The sentinel is NEVER called — only address-compared (`IMacroThesis.sol:18-21`, the established pattern). Default/else = PKE (so a malformed sentinel fails toward the proven path).

### The SHILLER arm body
1. `(int256 actual, int256 consensus, uint256 sigma, uint64 observedAt) = surpriseOracle.latestSurprise();`
2. staleness fail-safe → if stale/unset, set `s = 0` (minimal stance: ratio floors to 1, strike = base 15% OTM K_hi, width = baseVol). Recommended stance = **minimal-position** (s=0) over conservative-tail — it is the most honest "we have no signal → don't size up" reading and keeps the geometry deterministic.
3. `s = RepresentativenessLib.shillerSurprise(actual, consensus, sigma);`
4. `size = shillerOptionRatio(s)`; `strikeTick = shillerStrikeTick(s, TICK_SPACING)`; `width via shillerWidth → PayoffTerms.vol`.
5. build `HedgeLegParams` (strikeWAD=0, the int24 strike param path — same as PKE, `MacroHedgeExecutor.sol:226-243`).
6. emit `ExecutorDecided` with the SHILLER-specific TEMPLATE rationale (see Honesty) + `nonErgodicDisclosed()==true`.
7. mint through the SHARED `_resolveAndMintAtStrike` sink (`MacroHedgeExecutor.sol:258`) — UNCHANGED, takes the pre-snapped int24.

### New `ISurpriseOracle` (mirror `IRegimeOracle`)
```solidity
interface ISurpriseOracle {
    // signed WAD actual & consensus, WAD sigma; observedAt == 0 => never set
    function latestSurprise() external view
        returns (int256 actualWad, int256 consensusWad, uint256 sigmaWad, uint64 observedAt);
}
```
Mirror `IRegimeOracle.sol:13-26` exactly: `observedAt==0` = unset, staleness handled by a `MAX_STALENESS` window in the lib (reuse the same 1-hour TEMPLATE `MAX_STALENESS`, or a SHILLER-specific monthly window — note CPI is MONTHLY, RESEARCH.md §4, so a monthly staleness window is more honest; but a TEMPLATE 1h is fine for the demo, document the mismatch). `MockSurpriseOracle` mirrors `MockRegimeOracle.sol` with `set(actual,consensus,sigma)` (fresh `observedAt`) + `setStaleAt(...,ts)`.

### Constructor extension + the ctor sites it re-breaks
Add `ISurpriseOracle _surpriseOracle` as the 10th ctor arg beside `IRegimeOracle _regimeOracle` (`MacroHedgeExecutor.sol:117-136`). This re-breaks the SAME sites the Phase-14 regime-oracle add touched. **Enumerated (grep-verified):**
1. `contracts/test/fork/DemoMacroHedgeExecutor.fork.t.sol:379` (`_deployExecutorWith`)
2. `contracts/test/fork/MacroHedgeExecutor.fork.t.sol:143` (`setUp`)
3. `contracts/test/fork/MacroHedgeExecutor.fork.t.sol:242` (`underfundedExecutor`)
4. `contracts/test/fork/MacroHedgeExecutor.fork.t.sol:297` (`underfundedExecutor`)
5. `contracts/test/instrument/MacroHedgeExecutor.onResult.t.sol:155-159` (the `MacroHedgeExecutorDecodeProbe` ctor — passes args up to `MacroHedgeExecutor(...)`)

Each is a mechanical add-one-arg (pass a `new MockSurpriseOracle()` or `ISurpriseOracle(address(0))` where the surprise path is never exercised — but BEWARE: a SHILLER mandate against an `address(0)` surprise oracle reverts on `latestSurprise()`. The onResult DecodeProbe never runs the mandate path, so `address(0)` is safe there; the fork sites that DO run SHILLER mandates need a real mock).

## Keeping PKE green

The PKE path must stay BYTE-IDENTICAL (Phase 14 fork-proven). Mechanism:
- The PKE arm of the branch is the EXISTING `resolveFromMandate` body moved verbatim into the `else`. No edits inside it.
- The new ctor arg is APPENDED (10th position) — PKE reads `regimeOracle` at the same field; `surpriseOracle` is only touched in the SHILLER arm.
- `RepresentativenessLib` PKE fns (`inflationAdjustment`, `effectiveRegime`, `regimeVol`, `regimeWidth`, `gbmBaselineWidth`, `structuralStrikeTick`, `feasibleOptionRatio`, `nonErgodicDisclosed`) are UNTOUCHED; SHILLER fns are ADDED beside them.

**Must stay un-regressed (existing suites, grep- and read-verified):**
- `contracts/test/instrument/Representativeness.t.sol` — the 9 BTT leaves + their assertion fns (the "17/17"; `Representativeness.t.sol:45-296`). All PURE-lib; unaffected if SHILLER fns are additive.
- `contracts/test/fork/DemoMacroHedgeExecutor.fork.t.sol` — the fork mint at EXACT 360360 (`:446-462`), the 8-param `ExecutorDecided` honesty (`:466-492`), the size-127 guard (`:500-515`), LLM-independence (`:522-536`), quoteMargin basic read (`:544-562`). These run a POST_KEYNESIAN sentinel mandate (`_demoMandate`, `:413` uses `0x6`) → they exercise the PKE arm → must produce IDENTICAL 360360.
- `contracts/test/instrument/MacroHedgeExecutor.onResult.t.sol` — the decode-isolation probe (the "onResult 4/4"); the `_resolveAndMintAtStrike` override (`:173-180`) is unchanged by the branch (the branch lives in `resolveFromMandate`, not the sink).
- `contracts/test/fork/MacroHedgeExecutor.fork.t.sol` — the EXEC fork suite (deposit/solvency).

**Regression gate:** after adding the SHILLER arm + ctor migration, re-run the full suite and assert the PKE mandate STILL mints 360360 with the unchanged PKE rationale. The "same input, different geometry" test (SHILLER-02) IS the differentiation proof; the PKE-unchanged tests are the no-regression proof.

## The whole-workflow test architecture (SHILLER-02)

### Join shape (Agent-1 in-VM → mandate → Agent-2 fork)
- **Agent-1 (`MacroHedgeStrategist`)** runs IN-VM against a `MockPlatform` (no fork needed for the LLM legs): `requestSchoolDecision` → `inferString` → the mock platform's callback delivers a school string → `requestNotionalDecision` → `inferNumber` → callback delivers notional → `StrategistDecided` emits the assembled `HedgeMandate` (`MacroHedgeStrategist.sol:127,148-271`). The test drives the two callbacks via the mock platform (mirror `MacroHedgeStrategist.t.sol` patterns + the `MockPlatform` in `test/mocks/`).
- **Bridge:** read the assembled mandate via `getMandate(decisionId)` (`MacroHedgeStrategist.sol:288`).
- **Agent-2 (`MacroHedgeExecutor`)** runs on the POLYGON FORK (the proven `DemoMacroHedgeExecutor.fork.t.sol` harness: `_init_world` THEN `_deployExecutor` order, `:447-448`) — `resolveFromMandate(mandate, ...)` mints.
- Recommended: ONE fork test contract that ALSO instantiates the in-VM strategist + mock platform (Foundry runs both in the same VM; the fork only affects the Panoptic-touching calls). Name: `contracts/test/instrument/MacroWorkflow.fork.t.sol` (or `test/workflow/`). Mirror the bulloak `.tree` discipline (a `MacroWorkflow.tree` BTT spec — evm-TDD Iron Law per CLAUDE.md; bulloak 0.9.2).

### Scenario matrix (4 Colombian macro-risks × 2 schools)
For SHILLER, the input is a `(s_t, school)`; for PKE the same scenario maps to a regime Z_t. Concrete TEMPLATE inputs:

| Scenario | SHILLER surprise input | PKE regime input | Expected SHILLER strike side |
|----------|------------------------|------------------|------------------------------|
| CPI upside surprise | actual>consensus, s≈+2σ | Stress | K_hi, ~361200 (further OTM) |
| CPI downside surprise | actual<consensus, s≈−2σ | Tranquil | K_lo side, ~356100 |
| Fiscal-slippage tail | large hot surprise, s≈+3.5σ | Stress | K_hi, ~361620, ratio≈90 |
| Carry-unwind | depreciation shock, s≈+3σ | Stress | K_hi, ~361620, ratio≈62 |

(Fiscal-slippage & carry-unwind are framed as large UPSIDE inflation/depreciation surprises per RESEARCH.md §3 — COP is a high-beta carry currency, carry-unwind ≈ depreciation; the surprise magnitude is the TEMPLATE knob.)

### Load-bearing assertions
For each scenario, run the SAME mandate twice (school = `0x5` vs `0x6`, all other fields equal) and assert:
1. **Different STRIKE:** SHILLER strike ≠ 360360 (PKE), on the sign-correct side.
2. **Different SIZE:** SHILLER `optionRatio` (convex `max(|s|−k,0)²`) ≠ PKE `feasibleOptionRatio(notional)` for the matched scenario.
3. **Different WIDTH:** SHILLER `|s|`-scaled width ≠ PKE regime width (for at least one scenario; both even).
4. **Per-school TEMPLATE honesty:** decode `ExecutorDecided` (topic0 `keccak256("ExecutorDecided(uint256,uint8,uint256,int24,int24,bool,bool,string)")`, `DemoMacroHedgeExecutor.fork.t.sol:368-369`); assert SHILLER rationale `_contains("Shiller")` AND `_contains("UNVALIDATED")`, PKE rationale `_contains("post-Keynesian")`-equivalent (its existing TEMPLATE string), BOTH `nonErgodicDisclosed==true`.
5. **Both MINT successfully** (the fork mint succeeds; executor owns the leg, `numberOfLegs(exec)>0`).

NOTE the `ExecutorDecided` shape is unchanged (the per-school difference is in the `rationale` string + the derived tick fields), so the existing 8-param decode (`:483-484`) is reused.

## Honesty / per-school labeling

SHILLER `ExecutorDecided` rationale (TEMPLATE constant on the executor):
> `"TEMPLATE: Shiller surprise-driven convex (s=(actual-consensus)/sigma); consensus/sigma are placeholders; the CPI-surprise->FX-move linkage is an UNVALIDATED empirical assumption, NOT a proven transfer function. Single-leg approximation of the Carr-Madan digital strip; non-ergodic tail disclosed, NOT covered."`

PKE keeps its existing `TEMPLATE_RATIONALE` (`MacroHedgeExecutor.sol:85-86`). Both arms emit `nonErgodicDisclosed()==true` (`Representativeness.sol:154-156`). The "UNVALIDATED empirical assumption" wording is REQUIRED (CONTEXT lock + FEASIBILITY-v1.md "Honest constraints").

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Even-width snapping | A custom odd→even snap | `VolToWidthLib.volToWidth` (`VolToWidth.sol:32`) | The asymmetric `getRangesFromStrike` → `InvalidTickBound` trap is ALREADY solved there; re-deriving it reintroduces the Phase-14 bug |
| Strike tick from a human rate | A WAD-inversion converter | `RepresentativenessLib.structuralStrikeTick` (`:131-139`) | The deleted WAD path mis-snaps up to 1380 ticks; the decimal-gap fixed point is exact |
| `[1,127]` clamp | A raw `% 128` | `feasibleOptionRatio` clamp discipline (`:145-150`) | `addOptionRatio` masks `%128` silently (size 128→ratio 0, malformed leg, NO revert; `MacroHedgeExecutor.sol:269-273`) |
| Oracle staleness | A new staleness scheme | Mirror `IRegimeOracle`/`effectiveRegime` (`:58-65`) | Proven `observedAt==0`/`>MAX_STALENESS` fail-safe |
| The mint | Anything | The SHARED `_resolveAndMintAtStrike` sink (`:274`) | Fork-proven two-dispatch long+short mint |

## Common Pitfalls (Phase-14 lineage)

1. **Even-width invariant** — odd width → `InvalidTickBound()` at mint (fork-only trap, Phase-14 STRESS width 21→22). Mitigation: width ONLY through `volToWidth` (auto-even). NEVER pass a hand-computed width to `addLeg`.
2. **Decimal-gap / InvalidTickBound** — wCOP 18dp / USDC 6dp → `DECIMAL_GAP=1e12`. Strike ONLY through `structuralStrikeTick`. Verified the SHILLER candidate rates all snap to ×60 ticks.
3. **optionRatio ≤ 127** — the `%128` mask. The convex map clamps to 127; the shared sink also `require(size<=127)`. Verified the convex map never exceeds 127 even at 4σ.
4. **Sign convention in tick space** — wCOP is currency1; price = rate·1e12, higher COP/USD rate = HIGHER tick (`structuralStrikeTick` verified: 4485→360360 > 3900→358980). So upside CPI surprise (depreciation, higher COP/USD) = HIGHER tick (K_hi), consistent with PKE's K_hi. Downside = LOWER tick. Assert the direction explicitly in a unit test.
5. **TEMPLATE labeling** — every new constant (`SHILLER_K`, `SHILLER_RATIO_SCALE`, `SHILLER_OTM_SIGMA_BPS`, σ default) is a TEMPLATE placeholder; the rationale MUST carry "TEMPLATE" + "UNVALIDATED" (the `_contains` assert).
6. **Mocks become real on a fork** — `ISurpriseOracle(address(0))` reverts when the SHILLER arm calls `latestSurprise()`; fork sites running SHILLER mandates need a live `MockSurpriseOracle`. The onResult DecodeProbe (`address(0)` safe — never runs the mandate path).
7. **Ctor-migration breakage** — the 10th arg re-breaks the 5 enumerated sites. Plan as a Wave-0 mechanical migration BEFORE the SHILLER logic (so the suite compiles).
8. **InputListFail (Pitfall 1b)** — the DOWNSIDE (appreciation) strike is on the opposite side of spot from the proven K_hi; verify on the fork that leg-UPPER stays clear of spot (the existing proof only covers the K_hi/leg-lower side). Flag as a Validation claim.
9. **Unit care in the convex map** — `excessWad²` is WAD²; divide by `WAD*WAD` to reach a plain ratio. A missing `/WAD` overflows or saturates everything to 127 (a silent regression). Assert exact integer outputs.

## Code Examples

The SHILLER lib fns above (`shillerSurprise`/`shillerOptionRatio`/`shillerStrikeTick`/`shillerWidth`) and the branch skeleton are the concrete patterns. They mirror the PKE fns in `Representativeness.sol` and reuse `structuralStrikeTick` + `volToWidth` verbatim.

## Validation Architecture

> nyquist_validation is enabled (config.json `workflow.nyquist_validation: true`).

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Foundry `forge-std` Test + bulloak 0.9.2 BTT (`.tree` specs) |
| Config file | `contracts/foundry.toml` |
| Quick run command | `cd contracts && forge test --match-path 'test/instrument/Representativeness*' -vvv` |
| Full suite command | `cd contracts && forge test` (fork tests need `ALCHEMY_API_KEY` in `contracts/.env`; gated by `onlyForked`) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SHILLER-01 | `shillerSurprise` computes `(actual−consensus)/σ` in WAD | unit | `forge test --match-test test_shillerSurprise_wadMath -vvv` | ❌ Wave 0 |
| SHILLER-01 | convex size monotone in `\|s\|`, exact integer outputs, clamped `[1,127]` | unit | `forge test --match-test test_shillerOptionRatio_convexMonotone -vvv` | ❌ Wave 0 |
| SHILLER-01 | sign-driven strike: s>0 → higher tick than 360360; s<0 → lower; all ×60 | unit | `forge test --match-test test_shillerStrike_signDrivenAligned -vvv` | ❌ Wave 0 |
| SHILLER-01 | width grows with `\|s\|`, even-snapped | unit | `forge test --match-test test_shillerWidth_evenMonotone -vvv` | ❌ Wave 0 |
| SHILLER-01 | surprise oracle stale/unset → s=0 minimal stance | unit | `forge test --match-test test_shillerStaleness_minimalStance -vvv` | ❌ Wave 0 |
| SHILLER-01 | branch: SHILLER mandate mints DIFFERENT strike than PKE for same input | fork | `forge test --match-test test_branch_shillerDiffersFromPke -vvv` | ❌ Wave 0 |
| SHILLER-01 | per-school TEMPLATE honesty on `ExecutorDecided` (Shiller/UNVALIDATED vs PKE; both nonErgodic) | fork | `forge test --match-test test_executorDecided_perSchoolHonesty -vvv` | ❌ Wave 0 |
| SHILLER-01 (regression) | PKE mandate STILL mints exact 360360, rationale unchanged | fork | `forge test --match-test test_resolveFromMandate_mintsThroughExecutor -vvv` | ✅ (`DemoMacroHedgeExecutor.fork.t.sol:446`) |
| SHILLER-02 | whole-workflow: Agent-1 school → mandate → Agent-2 mint, 4 scenarios × 2 schools | fork+VM | `forge test --match-path 'test/instrument/MacroWorkflow*' -vvv` | ❌ Wave 0 |
| SHILLER-02 | same scenario → DIFFERENT strike/width/size by school | fork | `forge test --match-test test_workflow_sameInputDifferentGeometry -vvv` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** the relevant `--match-test` quick run (pure-lib SHILLER fns, sub-second, no fork).
- **Per wave merge:** `forge test` full suite (with `ALCHEMY_API_KEY` for the fork leaves).
- **Phase gate:** full suite green (PKE 360360 unchanged + SHILLER differentiation proven) before `/gsd:verify-work`.

### Wave 0 Gaps
- [ ] `contracts/src/interfaces/ISurpriseOracle.sol` — new (mirror `IRegimeOracle`)
- [ ] `contracts/test/mocks/MockSurpriseOracle.sol` — new (mirror `MockRegimeOracle`)
- [ ] `RepresentativenessLib` SHILLER fns + TEMPLATE constants — added to `Representativeness.sol`
- [ ] `MacroHedgeExecutor` ctor 10-arg migration — 5 enumerated ctor sites
- [ ] `contracts/test/instrument/ShillerRepresentativeness.tree` + `.t.sol` — new BTT spec + unit suite
- [ ] `contracts/test/instrument/MacroWorkflow.tree` + `.fork.t.sol` — new whole-workflow suite
- [ ] Framework install: none — Foundry + bulloak already in use

## State of the Art

No external-library currency change; this is internal protocol geometry. The Shiller "standardized surprise" framing (`s=(actual−consensus)/σ`, zero basis-risk by construction) is from the economic-derivatives design (RESEARCH.md §1, BIS QR Mar-2007); the Carr–Madan/Breeden–Litzenberger spanning (digital strip → convex payoff) is the v2 target, single-leg in v1.

## Open Questions

1. **The CPI-surprise → FX-move linkage is an UNVALIDATED empirical assumption (NOT technical).**
   - What we know: RESEARCH.md §3/§4 ranks CPI as the #1 scheduled monthly surprise signal and USD/COP as the #1 settlement underlying; FEASIBILITY-v1.md states plainly "the CPI-surprise→FX-move linkage is an empirical assumption to validate, not a proven transfer function."
   - What's unclear: whether a +Nσ CPI surprise reliably maps to COP depreciation of the assumed magnitude. The σ-multiple OTM and `k`/scale constants are NOT calibrated.
   - Recommendation: keep ALL constants TEMPLATE-labeled; the rationale MUST say "UNVALIDATED empirical assumption." The phase proves STRUCTURE (school branches geometry), not magnitude. Calibration is the deferred donor-transfer track.

2. **Staleness window for a MONTHLY signal.** CPI is monthly (RESEARCH.md §4); a 1-hour `MAX_STALENESS` (the PKE TEMPLATE) is wrong for CPI. Recommendation: a SHILLER-specific TEMPLATE window (e.g. 35 days) OR reuse 1h and document the mismatch as TEMPLATE. Claude's discretion per CONTEXT.

3. **Downside (appreciation) strike fork safety.** The existing InputListFail proof covers only the K_hi/leg-lower side. The s<0 appreciation strikes (e.g. tick 356760) are on the other side of spot — needs a fork-mint check that leg-upper clears spot. Flag as a Validation claim; if it reverts, restrict v1 to the depreciation (K_hi) side and document downside as deferred.

## Sources

### Primary (HIGH confidence)
- `contracts/src/MacroHedgeExecutor.sol` (:94 event, :117-136 ctor, :197-259 resolveFromMandate, :274 sink) — the branch point + ctor + sink
- `contracts/src/libraries/Representativeness.sol` (:131-139 structuralStrikeTick, :145-150 feasibleOptionRatio, :58-65 effectiveRegime, :78-109 regime fns) — the PKE primitives to mirror
- `contracts/src/libraries/VolToWidth.sol` (:12-34 volToWidth even-snap)
- `contracts/src/interfaces/IRegimeOracle.sol` + `contracts/test/mocks/MockRegimeOracle.sol` — the staleness pattern to mirror
- `contracts/src/interfaces/IMacroThesis.sol` (:35-36 sentinels, :24-28 schoolLabels) — the branch key
- `contracts/src/types/HedgeMandate.sol` (:17-23) — the mandate fields
- `contracts/src/instrument/MacroHedgeStrategist.sol` (:148-271) — Agent-1 workflow entry
- `contracts/test/instrument/Representativeness.t.sol` (:45-296) — PKE unit suite (no-regression)
- `contracts/test/fork/DemoMacroHedgeExecutor.fork.t.sol` (:368-369 topic0, :411-419 mandate, :446-562 mandate-mint suite) — fork mint + honesty + ctor site
- `contracts/test/fork/MacroHedgeExecutor.fork.t.sol` (:143,242,297) + `contracts/test/instrument/MacroHedgeExecutor.onResult.t.sol` (:38,155-159) — the re-broken ctor sites
- `research/macro-markets-colombia/RESEARCH.md` §1 (surprise form, four killers, Carr–Madan), §3 (Colombia ranking), §4 (monthly CPI cadence)
- `research/macro-markets-colombia/INSTRUMENT-v1.md` §"Payoff & sizing" (`notional·max(|s|−k,0)²`)
- `research/macro-markets-colombia/FEASIBILITY-v1.md` "Honest constraints" (CPI→FX unvalidated)
- Arithmetic verified locally (python): convex span scale=10/k=0.5 → ratio∈[1,122] across ±4σ; sign-driven strikes snap to ×60 ticks (360780/361200/361620 upside, 356760/356100 downside)

### Secondary (MEDIUM confidence)
- Memory: even-width invariant; Fix-C decimal-gap strike; ctor-migration lesson

## Metadata
**Confidence breakdown:**
- Branch architecture: HIGH — substrate fully read, branch point + sink confirmed
- Shiller→tick arithmetic: HIGH (mechanically), but the constants are TEMPLATE (uncalibrated by design)
- CPI→FX linkage: LOW (empirical, explicitly unvalidated — honesty-flagged, not a blocker for structural proof)
- Test architecture: HIGH — mirrors proven Phase-14 fork + strategist patterns

**Research date:** 2026-06-07
**Valid until:** 30 days (internal protocol; no fast-moving external dep)
