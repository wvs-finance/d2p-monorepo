---
phase: 16-shiller-differentiated-representativeness
verified: 2026-06-07T00:00:00Z
status: passed
score: 2/2 must-haves verified
re_verification: false
gaps: []
human_verification:
  - test: "CPI-surprise -> FX-move empirical magnitude"
    expected: "TEMPLATE constants (consensus/sigma placeholders) produce geometrically coherent positions; the quantitative linkage (CPI miss -> X% COP depreciation) is calibrated to real data"
    why_human: "The phase explicitly defers empirical calibration. SHILLER_CANONICAL_COP_USD=3900, SHILLER_OTM_SIGMA_BPS=500, SHILLER_BASE_OTM_BPS=1500 are TEMPLATE placeholders. The structure is proven; the magnitudes are not validated. This is intended scope (the phase proves STRUCTURE, all constants TEMPLATE) — noted for the future calibration milestone."
---

# Phase 16: Shiller-Differentiated Representativeness — Verification Report

**Phase Goal:** Agent-2's brain (`resolveFromMandate` / `Representativeness`) branches on the mandate's economic school sentinel: the SHILLER arm (0x5) derives surprise-convex geometry distinct from the PKE (0x6) arm, while the PKE path remains byte-identical. Proven end-to-end via unit, fork, and whole-workflow suites.

**Verified:** 2026-06-07
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `resolveFromMandate` branches on `mandate.economicTheory` sentinel (0x5 -> SHILLER arm, else -> PKE) | VERIFIED | `MacroHedgeExecutor.sol:217` — `if (address(mandate.economicTheory) == address(uint160(0x5)))` routes SHILLER; else falls to verbatim PKE body |
| 2 | SHILLER arm reads `surpriseOracle`, computes convex size `max(\|s\|-k,0)^2`, sign-driven strike via `shillerStrikeTick`, `\|s\|`-width via `shillerWidth` | VERIFIED | `Representativeness.sol:159-244` — `shillerOptionRatio`, `shillerStrikeTick`, `shillerWidth`, `isShillerStale` all present and non-trivial; `MacroHedgeExecutor.sol:282-338` `_resolveShiller` function reads oracle, applies staleness guard, dispatches all three lib fns |
| 3 | SHILLER arm mints a strike DIFFERENT from PKE 360360 on upside (+2σ -> 361200) | VERIFIED | `test_branch_shillerDiffersFromPke` PASS (demo fork 13/13); `MacroWorkflow.fork.t.sol:303` asserts `sStrike2 == 361200 && pStrike2 == 360360`; fork ran 6/6 on Polygon |
| 4 | PKE arm is byte-identical to pre-phase-16 body; `test_resolveFromMandate_mintsThroughExecutor` still mints exact 360360 | VERIFIED | Comment `MacroHedgeExecutor.sol:215` "EXISTING PKE body, moved VERBATIM"; `test_resolveFromMandate_mintsThroughExecutor` PASS (demo fork 13/13); Representativeness 17/17 un-regressed |
| 5 | `ISurpriseOracle` + `MockSurpriseOracle` exist and are wired into the executor | VERIFIED | `contracts/src/interfaces/ISurpriseOracle.sol` exists; `contracts/test/mocks/MockSurpriseOracle.sol` exists; `MacroHedgeExecutor.sol:80` `ISurpriseOracle public immutable surpriseOracle`; ctor at line 147 assigns it |
| 6 | Downside (s<0) collapses to depreciation-only-v1 (360360) — not a two-sided strip | VERIFIED | `MacroHedgeExecutor.sol:304` (s<0 -> s=0 minimal stance); `MacroWorkflow.fork.t.sol:313` `assertEq(sStrikeD, SHILLER_STRIKE_DOWNSIDE=360360)`; documented as intended (open-Q3 resolved as v1 scope) |
| 7 | SHILLER-02 whole-workflow: Agent-1 in-VM -> `getMandate` -> Agent-2 fork-mint, 4 Colombian scenarios x 2 schools, 6/6 green | VERIFIED | `forge test --match-path 'test/instrument/MacroWorkflow.fork.t.sol'` -> 6 passed, 0 failed |
| 8 | Anti-tautology: intra-school SIZE monotonicity (62<90) + flip-only-the-sentinel (0x5<->0x6, identical oracles) proves SCHOOL drives geometry | VERIFIED | `MacroWorkflow.fork.t.sol:340` `assertGt(sSize35, sSize3, "INTRA-SCHOOL: 90 > 62")`; `_flipSentinelRun` at line 357 seeds identical oracles and flips only sentinel; both PASS on fork |
| 9 | Per-school TEMPLATE honesty: SHILLER surfaces "UNVALIDATED" + non-ergodic tail; PKE surfaces "post-Keynesian" label | VERIFIED | `Representativeness.sol:180-181` `SHILLER_TEMPLATE_RATIONALE` string; `MacroWorkflow.fork.t.sol:388-394` `test_workflow_perSchoolHonesty` asserts both substrings; PASS |

**Score:** 9/9 truths verified

---

### Required Artifacts

| Artifact | Phase | Status | Evidence |
|----------|-------|--------|----------|
| `contracts/src/interfaces/ISurpriseOracle.sol` | 16-01 | VERIFIED | Exists, 12+ lines, non-trivial interface |
| `contracts/test/mocks/MockSurpriseOracle.sol` | 16-01 | VERIFIED | Exists at `contracts/test/mocks/MockSurpriseOracle.sol` |
| `contracts/src/libraries/Representativeness.sol` — SHILLER fns | 16-01 | VERIFIED | `shillerOptionRatio`, `shillerStrikeTick`, `shillerWidth`, `isShillerStale`, `SHILLER_*` constants all present (lines 159-244) |
| `contracts/test/instrument/ShillerRepresentativeness.t.sol` | 16-01 | VERIFIED | 221 lines, 10/10 tests pass (keyless) |
| `contracts/src/MacroHedgeExecutor.sol` — SHILLER branch + `_resolveShiller` | 16-02 | VERIFIED | Branch at line 217; `_resolveShiller` at line 287; `surpriseOracle` immutable at line 80 |
| `contracts/test/fork/DemoMacroHedgeExecutor.fork.t.sol` — SHILLER fork tests | 16-02 | VERIFIED | 13/13 pass on Polygon fork (Alchemy key present, cache hit) |
| `contracts/test/instrument/MacroWorkflow.fork.t.sol` | 16-03 | VERIFIED | 443 lines, 6/6 pass on Polygon fork |

---

### Key Link Verification

| From | To | Via | Status | Evidence |
|------|----|-----|--------|----------|
| `MacroHedgeExecutor.resolveFromMandate` | `ISurpriseOracle.latestSurprise()` | `_resolveShiller()` on 0x5 sentinel | WIRED | `MacroHedgeExecutor.sol:296` `surpriseOracle.latestSurprise()` call inside `_resolveShiller` |
| `_resolveShiller` | `RepresentativenessLib.shillerOptionRatio/shillerStrikeTick/shillerWidth` | Direct lib calls | WIRED | `MacroHedgeExecutor.sol:282-338` dispatches all three fns |
| `MacroWorkflow.fork.t.sol` | `MacroHedgeExecutor.resolveFromMandate` | `_runWorkflow` helper via `MockPlatform` | WIRED | `MacroWorkflow.fork.t.sol:108` `vm.createSelectFork` + `_runWorkflow` pattern proven green |
| `test_workflow_sameInputDifferentGeometry` | `_flipSentinelRun` anti-tautology gate | Identical-oracle, sentinel-only flip | WIRED | Line 346-353 present and PASS |

---

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| SHILLER-01 | 16-01-PLAN.md, 16-02-PLAN.md | `resolveFromMandate`/`Representativeness` branches on economic school sentinel; SHILLER arm surprise-convex geometry distinct from PKE; ISurpriseOracle/MockSurpriseOracle; SHILLER lib fns; proven by ShillerRepresentativeness 10/10 + demo fork 13/13 | SATISFIED | Build exit 0; ShillerRepresentativeness 10/10; Representativeness 17/17; onResult 4/4; demo fork 13/13; SHILLER 361200 != PKE 360360 on fork |
| SHILLER-02 | 16-03-PLAN.md | Whole-workflow integration suite: Agent-1 in-VM + MockPlatform -> HedgeMandate -> Agent-2 fork-mint; 4 Colombian scenarios x 2 schools; same-input-different-geometry with anti-tautology assertions | SATISFIED | MacroWorkflow.fork.t.sol 6/6 on Polygon fork; SIZE monotonicity 62<90 proven; flip-only-sentinel proven |

No orphaned requirements: ROADMAP.md §Phase 16 lists only SHILLER-01 and SHILLER-02; REQUIREMENTS.md lines 42-43 cover both; both are claimed by plans. No unclaimed phase-16 requirements exist in REQUIREMENTS.md.

---

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| `Representativeness.sol` + `MacroHedgeExecutor.sol` | `TEMPLATE` constants (SHILLER_CANONICAL_COP_USD=3900, SHILLER_OTM_SIGMA_BPS=500, SHILLER_BASE_OTM_BPS=1500, SHILLER_K=0.5, SHILLER_RATIO_SCALE=10) | INFO — intended scope | Empirical magnitudes are placeholders; code explicitly labels them TEMPLATE and surfaces UNVALIDATED in rationale. Structure is proven; calibration deferred to a future milestone. NOT a gap in this phase's goal. |
| `MacroHedgeExecutor.sol:78-80` | `surpriseOracle` read ONLY in `_resolveShiller`; the Natspec says "Wave-2 SHILLER arm" | INFO | Consistent with the branching design; PKE path never touches it. Not a stub — wiring is correct and test-proven. |

No blockers or warnings found.

---

### Human Verification Required

#### 1. Empirical TEMPLATE magnitude calibration

**Test:** Run the Shiller branch with real historical CPI prints (actual vs consensus from Bloomberg/DANE) and verify that `SHILLER_CANONICAL_COP_USD=3900`, `SHILLER_OTM_SIGMA_BPS=500`, and `SHILLER_RATIO_SCALE=10` produce economically meaningful position sizes (not trivially tiny or absurdly large relative to a 50,000 USD notional).

**Expected:** Strike separation from 360360 reflects plausible COP/USD surprise scenarios; convex size ratio (1–90+) maps to a sensible fraction of notional.

**Why human:** The phase explicitly defers this to a future calibration milestone. The constants are labeled TEMPLATE. Programmatic verification requires historical CPI data and a judgment call on "economically meaningful" — not a code correctness check.

---

### Regression Summary

All pre-phase-16 regression anchors confirmed green:

| Suite | Count | Result |
|-------|-------|--------|
| `Representativeness.t.sol` (keyless) | 17/17 | PASS |
| `ShillerRepresentativeness.t.sol` (keyless) | 10/10 | PASS |
| `MacroHedgeExecutor.onResult.t.sol` (keyless) | 4/4 | PASS |
| `DemoMacroHedgeExecutor.fork.t.sol` (Polygon fork) | 13/13 | PASS |
| `MacroWorkflow.fork.t.sol` (Polygon fork) | 6/6 | PASS |

PKE byte-identical regression: `test_resolveFromMandate_mintsThroughExecutor` PASS (mints exact tick 360360); executor comment at line 215 documents "EXISTING PKE body, moved VERBATIM".

Downside depreciation-only-v1: `test_WhenASHILLERMandateWithANegativeSurpriseResolves` PASS; `MacroWorkflow` asserts `sStrikeD == 360360` and `sSizeD != pSizeD` (minimal-stance size still differs from PKE ratio). Two-sided strip deferred; documented as open-Q3 resolved.

---

_Verified: 2026-06-07_
_Verifier: Claude (gsd-verifier)_
