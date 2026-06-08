# Phase 16: Shiller-differentiated representativeness - Context

**Gathered:** 2026-06-07
**Status:** Ready for planning
**Scope note:** POST-cornerstone-MVP — does NOT gate the June-11 submission (the Phase-15 mint is proven onchain; only the demo video remains). Full GSD loop + three-step planning-review gate before execution.

<domain>
## Phase Boundary

Make the Agent-2 representativeness brain (`Representativeness.sol` / `MacroHedgeExecutor.resolveFromMandate`) **branch on the mandate's economic school**, so `SHILLER_MACRO_RISK` derives a genuinely DIFFERENT geometry — surprise-driven + tail-convex, rooted in Shiller's *Macro Markets* framework — distinct from the existing POST_KEYNESIAN regime×β₁ passthrough. Plus a whole-workflow integration test suite (prompt → Agent-1 school → `HedgeMandate` → Agent-2 school-specific geometry → mint) across Colombian macro-risk scenarios under BOTH schools, at the agent-interaction layer just below the UI.

**Clarifies HOW, not WHETHER:** POST_KEYNESIAN behavior stays byte-unchanged (Phase 14 is fork-proven). No new agents, no bridge, no UI work (frontend is the sibling repo). The school SELECTION already works (Agent-1 picks it); this phase makes the school CHANGE the geometry.
</domain>

<decisions>
## Implementation Decisions

### Surprise signal input (the Shiller trigger)
- A **new `ISurpriseOracle`** interface — carries the CPI surprise inputs (CPI actual, BanRep-EME consensus, σ_CPI, + `observedAt`), **mirroring the `IRegimeOracle` staleness contract**. The SHILLER branch computes `s_t = (CPI_actual − consensus)/σ_CPI` **ON-CHAIN** (transparent, not a pre-baked scalar).
- **A staleness fail-safe** like PKE's (stale/unset → a conservative Shiller stance; exact stance = Claude's discretion, e.g. treat as `s=0` → minimal/no incremental position).
- **PKE's `IRegimeOracle`/Z_t is UNTOUCHED** — the two schools read two DISTINCT signals (regime vs surprise). A test `MockSurpriseOracle` mirrors `MockRegimeOracle`.

### Geometry mapping (SHILLER branch of resolveFromMandate/Representativeness)
- The brain BRANCHES on `mandate.economicTheory` (the school sentinel — `0x5` SHILLER, `0x6` POST_KEYNESIAN). PKE → the existing regime×β₁ path (unchanged); SHILLER → the surprise path:
  - **Size:** `optionRatio ∝ max(|s_t| − k, 0)²` (convex, the research's payoff form), clamped to the feasible `[1,127]` (reuse `feasibleOptionRatio`'s clamp discipline).
  - **Strike:** SIGN-driven — CPI **upside** surprise (s>0, inflation hotter than consensus) → COP-**depreciation** strike (the K_hi side); **downside** (s<0) → appreciation side. Placed **further OTM than PKE** (tail emphasis), via a σ-multiple off the canonical rate / structural tick.
  - **Width:** grows with `|s_t|` (bigger surprise → wider band), **EVEN-snapped** (the even-width invariant is non-negotiable).

### Convexity / tail character
- SHILLER = the **single-leg approximation of the Carr–Madan digital strip** (v1): one further-OTM leg whose width grows with `|s_t|`. Documented honestly as a single-leg approximation (the two-leg/full strip is deferred).
- `k` (the convexity threshold the surprise must exceed before the position grows) and the OTM σ-multiple are **TEMPLATE placeholder constants** (like Phase-14's β₁/Z_t). Bounded premium = the convex `max(|s|−k,0)²` capped at optionRatio≤127; the tail payoff is the long-gamma.

### Honesty / per-school labeling
- `ExecutorDecided` carries a **DISTINCT per-school TEMPLATE rationale**. SHILLER ≈ *"TEMPLATE: Shiller surprise-driven convex (s=(actual−consensus)/σ); consensus/σ are placeholders; the CPI-surprise→FX-move linkage is an UNVALIDATED empirical assumption, not a proven transfer function."* POST_KEYNESIAN keeps its existing rationale. Both schools set `nonErgodicDisclosed = true` (Davidson honesty split).

### Whole-workflow integration tests (SHILLER-02)
- A **dedicated agent-layer suite** (new test file/dir, e.g. `test/instrument/MacroWorkflow.*` — name = Claude's discretion) driving **prompt → Agent-1 school selection (`inferString`, mocked platform) → `HedgeMandate` → Agent-2 `resolveFromMandate` (school-branched geometry) → mint (fork)** — the layer just below the UI, NOT the frontend (sibling repo).
- Scenarios (Colombian macro-risks): **CPI upside surprise, CPI downside surprise, fiscal-slippage tail, carry-unwind** — each under BOTH SHILLER and POST_KEYNESIAN.
- **Load-bearing assertion:** for the SAME macro-risk input, SHILLER vs PKE produce **DIFFERENT** strike/width/size (proving the school branches the geometry), AND the per-school TEMPLATE honesty surfaces on `ExecutorDecided`.

### Claude's Discretion
- Exact TEMPLATE constants: `k`, the σ-multiple OTM distance, the σ default, the surprise-staleness window.
- The exact `ISurpriseOracle` signature + the stale fail-safe stance (minimal-position vs conservative-tail).
- The convex scaling constant mapping `max(|s|−k,0)²` → `optionRatio`.
- The test directory/file naming; whether the Agent-1 leg uses a mock platform in-VM joined to the Agent-2 fork mint.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Shiller / Macro-Markets economic grounding (the SHILLER model's source of truth)
- `research/macro-markets-colombia/RESEARCH.md` — §1 Shiller's *Macro Markets* + the four killers + **the standardized-surprise form `s=(actual−consensus)/σ`** + Carr–Madan/Breeden–Litzenberger spanning; §3 the Colombia hedge-target ranking (USD/COP #1 settlement, CPI #2 surprise signal); §4 the DANE/BanRep data cadence (monthly CPI surprise).
- `research/macro-markets-colombia/INSTRUMENT-v1.md` — the convex instrument design; **§"Payoff & sizing": `notional · max(|s_t| − k, 0)²`, `s_t` sets notional + strike width**; the four-killers check; §"Honest constraints" (the CPI-surprise→FX linkage is an unvalidated empirical assumption).
- `research/macro-markets-colombia/FEASIBILITY-v1.md` — feasibility + residual risks.

### PKE branch (UNCHANGED — for parity / the other school)
- `~/learning/post-keynesian/` (esp. `applications/examples/wage-earner-fx-hedge-colombia.md`, `applications/_workflow/`) — the PKE grounding; see memory [[reference-pke-framework-grounding]]. The PKE path is fork-proven (Phase 14) and must not change.

### Code to extend / mirror
- `contracts/src/libraries/Representativeness.sol` — the Phase-14 brain (regime×β₁ path) to extend with a SHILLER branch + the surprise functions.
- `contracts/src/MacroHedgeExecutor.sol` — `resolveFromMandate` (:197) is the branch point; the 8-param `ExecutorDecided` (:94) carries the per-school rationale; the 9-arg ctor wires the oracle(s).
- `contracts/src/interfaces/IMacroThesis.sol` — `MacroThesisRegistry.schoolLabels()` + the sentinels (`0x5` SHILLER, `0x6` PK) + `promptBias` = the branch key.
- `contracts/src/interfaces/IRegimeOracle.sol` + `contracts/test/mocks/MockRegimeOracle.sol` — the staleness-contract pattern to mirror for `ISurpriseOracle` / `MockSurpriseOracle`.
- `contracts/src/libraries/VolToWidth.sol` — the even-width invariant (any new width path must snap even; memory [[reference-panoptic-even-width-invariant]]).
- `contracts/src/instrument/MacroHedgeStrategist.sol` — Agent-1 school selection (`requestSchoolDecision` → `inferString` over `schoolLabels()`) = the whole-workflow entry.
- `.planning/phases/14-representativeness-derivation/14-RESEARCH.md` — the Phase-14 design (Fix-C strike, structuralStrikeTick, regime model) the SHILLER branch sits beside.
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `RepresentativenessLib` (regime×β₁, GBM comparator, `structuralStrikeTick`, `feasibleOptionRatio`, fail-safe `effectiveRegime`) — extend with a SHILLER branch + surprise functions; reuse `feasibleOptionRatio`'s [1,127] clamp + `structuralStrikeTick` for the strike base.
- `IRegimeOracle`/`MockRegimeOracle` — the exact pattern to mirror for `ISurpriseOracle`/`MockSurpriseOracle` (staleness `observedAt`, the mock's `set`/`setStaleAt`).
- `VolToWidthLib.volToWidth` — already even-snaps; the SHILLER width∝|s| feeds it.
- `resolveFromMandate` — branch on `mandate.economicTheory` here; the executor ctor already takes the regime oracle (add the surprise oracle alongside).
- The Phase-14 evm-TDD pattern (`.tree` + failing test first, ancestry-verified) + the TEMPLATE-labeling discipline + the deposit-on-behalf fork mint (Phase-15 BuildBear path) for the workflow tests.

### Established Patterns
- School handle = a non-deployable sentinel (`0x5`/`0x6`), `!= address(0)` well-formedness only — never called. The branch reads the sentinel, not code.
- Honesty: TEMPLATE rationale + `nonErgodicDisclosed` on `ExecutorDecided`, per school.

### Integration Points
- `MacroHedgeExecutor` ctor: add the `ISurpriseOracle` immutable beside `IRegimeOracle` (existing 9-arg ctor + the migrated test ctor sites — see Phase-14's onResult/fork ctor migration).
- The whole-workflow test joins Agent-1 (`MacroHedgeStrategist` + a mock platform, in-VM school selection) → the assembled `HedgeMandate` → Agent-2 `resolveFromMandate` (fork mint), across both schools.
</code_context>

<specifics>
## Specific Ideas

- The Shiller payoff intent: `notional · max(|s_t| − k, 0)²` (convex in the surprise beyond threshold k), `s_t = (CPI_actual − BanRep-EME consensus)/σ_CPI`, monthly CPI epoch.
- Strike is SIGN-driven off the surprise (upside CPI surprise → COP depreciation), placed further OTM than PKE for tail emphasis — a single-leg approximation of the Carr–Madan digital strip.
- The two schools must read two distinct signals (PKE = regime Z_t; SHILLER = CPI surprise s_t) — that distinction IS the differentiation.
- The test proof: same macro-risk input → DIFFERENT geometry by school.
</specifics>

<deferred>
## Deferred Ideas

- **Two-leg spread / full Carr–Madan digital strip** — v1 is a single leg; the multi-leg strip is a later iteration.
- **Live CPI-surprise oracle feed** — the real DANE CPI + BanRep-EME consensus + σ plumbing (and the Somnia→Reactive bridge of the surprise, XCHAIN-01) stay deferred; v1 is TEMPLATE/mock.
- **Donor-transfer calibration** of `k`/σ (from the M1 cost-function track).
- **A third+ economic school** — registry is extensible, but out of scope here.
- **Frontend rendering** of the per-school geometry/decision — sibling repo, not this phase.
</deferred>

---

*Phase: 16-shiller-differentiated-representativeness*
*Context gathered: 2026-06-07*
