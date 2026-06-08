# Phase 14 — Deferred / Out-of-Scope Discoveries

## 14-03 (Wave 3) — STRESS-regime width is tickSpacing-MISALIGNED → InvalidTickBound() on the fork mint (BLOCKER)

**Discovered:** 2026-06-07, during 14-03 Task 1 (running the fork suite the prior socket-death session
wrote but never executed).

**Symptom:** The three `resolveFromMandate`-path fork tests revert `InvalidTickBound()`:
- `test_resolveFromMandate_mintsThroughExecutor`
- `test_executorDecided_surfacesHonestyFlag`
- `test_resolveFromMandate_llmIndependentGeometry`

(The two pre-existing Phase-13 demo tests + `test_resolveAndMint_sizeOver127_reverts` all PASS — the
size-guard test reverts before reaching the tick math.)

**Root cause (fork-proven + source-confirmed, NOT a flake — all 3 fail identically with ~12M gas):**
`SemiFungiblePositionManagerV4.sol:832-837` reverts `InvalidTickBound()` when
`tickLower % tickSpacing != 0 || tickUpper % tickSpacing != 0` (also checks min/maxEnforcedTick, which
are FAR away — probed live: minEnf=-287958, maxEnf=470509, so the bound is NOT the issue).

The geometry:
- `_deployExecutorWith` sets the regime oracle to STRESS.
- `RepresentativenessLib.regimeVol(STRESS, 0.10e18, 0.35e18, 0.15e18, 14_400)` = 14_940 (excess = β₁ stress−tranquil = (0.35−0.10)*0.15 = 0.0375 ⇒ 14_400*1.0375 = 14_940).
- `VolToWidthLib.volToWidth(14_940, 100, 60)` = **21 (ODD)**.
- `PanopticMath.getRangesFromStrike(21, 60)` → `rangeDown = (21*60)/2 = 630`.
- strike 360_360 (aligned) − 630 = **359_730**, and `359_730 % 60 = 30 ≠ 0` → MISALIGNED → revert.

An **ODD width** makes `width*tickSpacing/2 = odd*30`, which is a multiple of 30 but NOT 60, so
`strike ± rangeDown` lands off the tickSpacing grid regardless of strike. The Phase-13 demo only ever
used vol 14_400 → width **20 (EVEN)** → aligned (359_760 % 60 = 0) → mints. The RESEARCH near-spot
spike (`test_fixC_shape_mints_Khi`) likewise used the even demo width, so it never hit this.

**Why this is a Rule-4 (architectural) escalation, NOT an in-scope auto-fix:**
- The defect is in **shipped Wave-1 src** (`VolToWidthLib.volToWidth` / `RepresentativenessLib.regimeWidth`),
  NOT in this plan's test file — it was latent because the prior session never ran the tests.
- This plan is **explicitly TEST-ONLY** (frontmatter `files_modified: [DemoMacroHedgeExecutor.fork.t.sol]`;
  acceptance gate `! git diff --name-only HEAD~1 | grep "^src/"`). The correct fix edits src.
- The fix touches a **shared library every Panoptic leg flows through**, so it warrants the
  CLAUDE.md two-reviewer gate, not a unilateral executor edit.

**Verified-safe candidate fix (does NOT break committed Wave-1 unit assertions):**
Snap `volToWidth` to round odd widths UP to the next even value (`if (raw & 1 == 1) raw += 1;` before the
4095 clamp). Checked against `test/instrument/Representativeness.t.sol`:
- `wGbm = volToWidth(14_400) = 20` (already even — unchanged).
- `assertTrue(wStress != wGbm)` → 22 ≠ 20 still holds.
- `wGbm == volToWidth(BASE_VOL)` → both through the same fn, still equal.
- `regimeWidth(STRESS) == volToWidth(regimeVol(STRESS))` → tautological, holds.
- mutation `collapse β₁ ⇒ stress width == gbm` → both 20, holds.
With width 22 (even): tickLower 359_700 (%60=0), tickUpper 361_020 (%60=0) — aligned, < maxEnf → mints.

**Alternatives:** (a) snap width to even in `volToWidth` [recommended — one line, structurally correct for
all callers]; (b) snap in `RepresentativenessLib.regimeWidth` only [narrower blast radius, leaves the raw
`volToWidth` able to emit odd widths for other callers]; (c) pick TEMPLATE β₁ values whose STRESS vol
yields an even width [fragile — couples the econometric template to a tick-grid accident]; (d) demo the
mandate path under TRANQUIL (width 20) [HIDES the bug — rejected, dishonest].

---

### ✅ RESOLVED 2026-06-07 (14-03) — alternative (a), gate-passed + RED→GREEN fork-proven

**Decision:** User chose fix "A + two-reviewer gate" (the `volToWidth` even-snap — the structurally-correct
single-chokepoint fix). The patch PASSED the CLAUDE.md two-reviewer gate this session: **Reality Checker
PASS + Solidity Smart Contract Engineer PASS** (precedence parens verified, cast-safe `[2,4094]`, even-width
sufficient on every tickSpacing, `volToWidth` is the correct single chokepoint, the Phase-13 width-20 path
byte-unchanged, zero Wave-1 unit regression).

**The fix** (`contracts/src/libraries/VolToWidth.sol`, after the `[1,4095]` clamp):
```solidity
if ((raw & 1) == 1) raw = raw < 4095 ? raw + 1 : raw - 1;
```
Odd widths snap UP to the next even (DOWN only at the 4095 ceiling so `raw` stays in `[1,4095]`). An even
width collapses Panoptic's asymmetric `getRangesFromStrike` to `(width/2)*tickSpacing` — an exact multiple
of tickSpacing — so both leg bounds stay grid-aligned. STRESS width `21 → 22`: bounds `359700 / 361020`
(both `%60=0`) → mints at the EXACT structural K_hi tick `360360`.

**evm-TDD honored (RED→GREEN split, per-file ancestry verified):**
- RED test commit `f92b0f7` (`test(14-03)`): the 4 Wave-3 mandate-path tests. With the fix UNstaged, the 3
  mandate-path tests fail `InvalidTickBound()` at ~12M gas (NOT a compile error, NOT a different revert) —
  the exact symptom catalogued above; `test_resolveAndMint_sizeOver127_reverts` + the 2 Phase-13 demo tests
  pass (the size guard reverts before the tick math, the demo uses the even width 20).
- GREEN fix commit `e686d4d` (`fix(14-03)`): the `volToWidth` even-snap. `git merge-base --is-ancestor
  f92b0f7 e686d4d` → true (the failing test landed BEFORE the fix).

**GREEN proof (live Polygon fork, block 86_900_000):** `make test-demo` → **6/6, 0 failed** —
`test_resolveFromMandate_mintsThroughExecutor` mints a real wCOP/USDC position with `strike == 360360`
EXACT + `numberOfLegs(exec) > 0`; `test_executorDecided_surfacesHonestyFlag` decodes the 8-param
`ExecutorDecided` (`nonErgodicDisclosed == true` + TEMPLATE rationale); `test_resolveFromMandate_
llmIndependentGeometry` mints identically through a `MockRevertingPlatform`.

**Regression (no collateral damage from the Wave-1 src edit):** Representativeness unit **17/17** (the
`wStress != wGbm` divergence holds — the snap makes STRESS `22` vs GBM `20`, MORE divergent, never
collapsing them), onResult **4/4**, fork EXEC **7/7**, fork-free tree **114/114**, `forge build` exit 0.

**Status: CLOSED.** No remaining deferred work for 14-03. The even-width invariant is now a documented
property of `volToWidthLib` (the comment block at `VolToWidth.sol:26-31`).
